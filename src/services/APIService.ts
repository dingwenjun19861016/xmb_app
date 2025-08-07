import { Platform } from 'react-native';
import apiConfig, { getGeneralURL, getCurrentTimeout } from '../config/apiConfig';

// 定义基础请求接口
interface RPCRequest {
  method: string;
  params: any[];
  // 添加标准JSON-RPC字段
  jsonrpc?: string;
  id?: number | string;
}

interface RPCResponse<T = any> {
  result?: T;
  error?: {
    code: string | number;
    message?: string;
    error?: string;
  };
  // 添加标准JSON-RPC字段
  jsonrpc?: string;
  id?: number | string;
}

// API错误类
export class APIError extends Error {
  constructor(
    public code: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// 缓存项接口
interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// 缓存存储类型
interface CacheStorage {
  [key: string]: CacheItem;
}

// API服务配置
interface APIConfig {
  baseURL: string;
  timeout: number;
  headers?: Record<string, string>;
}

class APIService {
  private config: APIConfig;
  private cache: CacheStorage = {};
  
  // 缓存配置
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2分钟
  private readonly EXCLUDED_METHODS = [
    // 'listCoins',      // MarketService - 市场数据需要实时更新
    // 'getCoinInfo',    // CoinInfoService - 币价数据需要实时更新
    'getMultipleCoinsInfo'
  ];
  
  // listData方法允许缓存的参数类型
  private readonly CACHEABLE_LIST_DATA_TYPES = [
    'ETF_MARKET_CAP_AND_VOLUME',
    'ALTCOIN_INDEX',
    'BTCD',
    'GREEDY_INDEX',
    'DXY',
    'US_BOND_10YR',
    'USDJPY',
    'ETHD',
    'USDJPY',
    'STABLERANK_DAILY',
    'COIN_MARKET_CAP_AND_VOLUME',
  ];

  constructor(config: APIConfig) {
    this.config = {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...config.headers,
      },
      ...config,
    };
  }

  /**
   * 生成缓存键
   * @param method RPC方法名
   * @param params 参数数组
   * @returns string 缓存键
   */
  private generateCacheKey(method: string, params: any[]): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  /**
   * 检查方法是否需要缓存
   * @param method RPC方法名
   * @param params 参数数组
   * @returns boolean 是否需要缓存
   */
  private shouldCache(method: string, params: any[] = []): boolean {
    // 排除的方法不缓存
    if (this.EXCLUDED_METHODS.includes(method)) {
      return false;
    }
    
    // 对于listData方法，只有特定参数类型才缓存
    if (method === 'listData' && params.length > 1) {
      const dataType = params[1];
      // 检查第二个参数是否为允许缓存的数据类型
      return typeof dataType === 'string' && this.CACHEABLE_LIST_DATA_TYPES.includes(dataType);
    }
    
    // 其他方法默认缓存
    return true;
  }

  /**
   * 从缓存获取数据
   * @param cacheKey 缓存键
   * @returns T | null 缓存数据或null
   */
  private getFromCache<T>(cacheKey: string): T | null {
    const item = this.cache[cacheKey];
    if (!item) {
      return null;
    }

    const now = Date.now();
    if (now > item.expiresAt) {
      // 缓存过期，删除缓存项
      delete this.cache[cacheKey];
      return null;
    }

    console.log(`🗄️ Cache hit for key: ${cacheKey}`);
    return item.data;
  }

  /**
   * 存储数据到缓存
   * @param cacheKey 缓存键
   * @param data 数据
   */
  private setToCache<T>(cacheKey: string, data: T): void {
    const now = Date.now();
    this.cache[cacheKey] = {
      data,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    };
    console.log(`💾 Cached data for key: ${cacheKey}`);
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of Object.entries(this.cache)) {
      if (now > item.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      delete this.cache[key];
    });

    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache items`);
    }
  }

  /**
   * 执行RPC调用
   * @param method RPC方法名
   * @param params 参数数组
   * @returns Promise<T> 返回结果
   */
  async call<T = any>(method: string, params: any[] = []): Promise<T> {
    // 检查是否需要缓存
    const shouldUseCache = this.shouldCache(method, params);
    let cacheKey: string | null = null;
    
    if (shouldUseCache) {
      cacheKey = this.generateCacheKey(method, params);
      
      // 尝试从缓存获取数据
      const cachedData = this.getFromCache<T>(cacheKey);
      if (cachedData !== null) {
        return cachedData;
      }
    }

    // 构建标准的JSON-RPC请求格式
    const request: RPCRequest = {
      method,
      params,
    };

    let lastError: any;
    const maxRetries = 3; // 最多重试3次（即最多尝试4次，涵盖所有接入点）
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = getCurrentTimeout();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const requestBody = JSON.stringify(request);
        const currentURL = getGeneralURL();

        const response = await fetch(currentURL, {
          method: 'POST',
          headers: this.config.headers,
          body: requestBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ HTTP Error response:`, errorText);
          throw new APIError(
            response.status,
            `HTTP Error: ${response.status} ${response.statusText}`,
            { status: response.status, statusText: response.statusText, body: errorText }
          );
        }

        const responseText = await response.text();
        
        let data: RPCResponse<T>;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`❌ JSON Parse Error:`, parseError);
          throw new APIError(-998, `Invalid JSON response: ${parseError.message}`, { responseText });
        }

        // 检查是否有错误 - 根据您提供的错误格式调整
        if (data.error) {
          const errorCode = typeof data.error.code === 'string' ? parseInt(data.error.code) : data.error.code;
          const errorMessage = data.error.message || data.error.error || 'Unknown API error';
          
          throw new APIError(
            errorCode,
            errorMessage,
            data.error
          );
        }

        // 根据API响应格式，result可能直接就是数据
        let result: T;
        if (data.result !== undefined) {
          result = data.result;
        } else {
          // 如果没有result字段，可能整个响应就是结果
          result = data as T;
        }

        // 如果需要缓存且请求成功，则存储到缓存
        if (shouldUseCache && cacheKey && result) {
          this.setToCache(cacheKey, result);
          
          // 定期清理过期缓存
          this.cleanupExpiredCache();
        }

        return result;
        
      } catch (error) {
        lastError = error;
        console.error(`❌ API Error: ${method} (尝试 ${attempt + 1})`, error);
        
        if (error instanceof APIError) {
          // 如果是服务器错误且还有重试机会，尝试切换接入点
          if (attempt < maxRetries && (error.code >= 500 || error.code === -3)) {
            console.log(`🔄 尝试切换到备用接入点...`);
            const switched = await apiConfig.handleRequestFailure();
            if (switched) {
              continue; // 继续下一次尝试
            }
          }
          // 如果是客户端错误或没有重试机会，直接抛出
          throw error;
        }

        if (error.name === 'AbortError') {
          if (attempt < maxRetries) {
            console.log(`🔄 请求超时，尝试切换到备用接入点...`);
            await apiConfig.handleRequestFailure();
            continue;
          }
          throw new APIError(-2, `Request timeout after ${getCurrentTimeout()}ms`);
        }

        if (error instanceof TypeError && error.message.includes('Network request failed')) {
          if (attempt < maxRetries) {
            console.log(`🔄 网络连接失败，尝试切换到备用接入点...`);
            await apiConfig.handleRequestFailure();
            continue;
          }
          throw new APIError(-3, 'Network connection failed. Please check your internet connection.');
        }

        // 其他错误，如果还有重试机会，尝试切换接入点
        if (attempt < maxRetries) {
          console.log(`🔄 未知错误，尝试切换到备用接入点...`);
          await apiConfig.handleRequestFailure();
          continue;
        }
      }
    }

    // 所有重试都失败了，抛出最后一个错误
    if (lastError instanceof APIError) {
      throw lastError;
    }

    throw new APIError(
      -999,
      `All API endpoints failed. Last error: ${lastError?.message}`,
      lastError
    );
  }

  /**
   * 批量调用多个RPC方法
   * @param calls 调用列表
   * @returns Promise<T[]> 返回结果数组
   */
  async batchCall<T = any>(calls: Array<{ method: string; params: any[] }>): Promise<T[]> {
    try {
      const promises = calls.map(call => this.call<T>(call.method, call.params));
      return await Promise.all(promises);
    } catch (error) {
      console.error('❌ Batch API Error:', error);
      throw error;
    }
  }

  /**
   * 更新配置
   * @param newConfig 新配置
   */
  updateConfig(newConfig: Partial<APIConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): APIConfig {
    return { ...this.config };
  }

  /**
   * 清空所有缓存
   */
  clearCache(): void {
    const cacheCount = Object.keys(this.cache).length;
    this.cache = {};
    console.log(`🧹 Cleared all cache (${cacheCount} items)`);
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { total: number; expired: number; valid: number } {
    const now = Date.now();
    let total = 0;
    let expired = 0;
    let valid = 0;

    for (const item of Object.values(this.cache)) {
      total++;
      if (now > item.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }

    return { total, expired, valid };
  }

  /**
   * 手动清理过期缓存
   */
  clearExpiredCache(): void {
    this.cleanupExpiredCache();
  }
}

// 创建默认的API服务实例
export const apiService = new APIService({
  baseURL: getGeneralURL(), // 使用动态URL
  timeout: getCurrentTimeout(), // 使用动态超时时间
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // 尝试添加更多标准headers
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
  },
});

// 导出API服务类供其他地方使用
export { APIService };
export default apiService;
