import apiService from './APIService';
import configService from './ConfigService';

// 定义实时价格数据接口
interface RealTimeStockData {
  page: string;
  data: string;
}

// 定义返回的价格对象接口
interface StockPriceMap {
  [stockSymbol: string]: number;
}

// API响应接口
interface RealTimePriceResponse {
  result: RealTimeStockData[];
}

class USStockRealTimePriceService {
  // 全局缓存
  private static cache: {
    data: StockPriceMap[] | null;
    timestamp: number;
  } = {
    data: null,
    timestamp: 0
  };

  // 默认配置值
  private static readonly DEFAULT_CACHE_DURATION = 5000;
  private static readonly DEFAULT_ENABLE_CACHE = true;
  private static readonly DEFAULT_MAX_CACHE_SIZE = 10000;

  // 配置缓存
  private static configCache: {
    cacheDuration: number;
    enableCache: boolean;
    maxCacheSize: number;
    lastConfigFetch: number;
  } = {
    cacheDuration: USStockRealTimePriceService.DEFAULT_CACHE_DURATION,
    enableCache: USStockRealTimePriceService.DEFAULT_ENABLE_CACHE,
    maxCacheSize: USStockRealTimePriceService.DEFAULT_MAX_CACHE_SIZE,
    lastConfigFetch: 0
  };

  /**
   * 获取远程配置
   * 每5分钟刷新一次配置，避免过于频繁的配置请求
   */
  private static async getConfigs(): Promise<void> {
    const now = Date.now();
    const CONFIG_REFRESH_INTERVAL = 5 * 60 * 1000; // 5分钟
    
    if (now - this.configCache.lastConfigFetch < CONFIG_REFRESH_INTERVAL) {
      return; // 配置仍然有效，无需重新获取
    }

    try {
      // 获取缓存有效期配置
      const cacheDurationStr = await configService.getConfig('USSTOCK_REALTIME_PRICE_CACHE_DURATION', this.DEFAULT_CACHE_DURATION.toString());
      const cacheDuration = parseInt(cacheDurationStr, 10);
      this.configCache.cacheDuration = isNaN(cacheDuration) || cacheDuration < 0 ? this.DEFAULT_CACHE_DURATION : cacheDuration;

      // 获取是否启用缓存配置
      const enableCacheStr = await configService.getConfig('USSTOCK_REALTIME_PRICE_ENABLE_CACHE', this.DEFAULT_ENABLE_CACHE.toString());
      this.configCache.enableCache = enableCacheStr.toLowerCase() === 'true';

      // 获取最大缓存条目数配置
      const maxCacheSizeStr = await configService.getConfig('USSTOCK_REALTIME_PRICE_MAX_CACHE_SIZE', this.DEFAULT_MAX_CACHE_SIZE.toString());
      const maxCacheSize = parseInt(maxCacheSizeStr, 10);
      this.configCache.maxCacheSize = isNaN(maxCacheSize) || maxCacheSize <= 0 ? this.DEFAULT_MAX_CACHE_SIZE : maxCacheSize;

      this.configCache.lastConfigFetch = now;
      
      console.log('📋 USStockRealTimePriceService: Config loaded:', {
        cacheDuration: this.configCache.cacheDuration,
        enableCache: this.configCache.enableCache,
        maxCacheSize: this.configCache.maxCacheSize
      });
    } catch (error) {
      console.warn('⚠️ USStockRealTimePriceService: Failed to load config, using defaults:', error);
      // 保持默认配置
    }
  }

  /**
   * 获取所有美股的实时价格
   * @returns Promise<StockPriceMap[]> 返回格式为 [{ nvda: 178.08}, { aapl: 212.39}, ...]
   */
  async getAllRealTimePrices(): Promise<StockPriceMap[]> {
    try {
      // 先获取最新配置
      await USStockRealTimePriceService.getConfigs();

      // 检查是否启用缓存
      if (!USStockRealTimePriceService.configCache.enableCache) {
        // console.log('🚫 USStockRealTimePriceService: Cache disabled, fetching fresh data');
        return await this.fetchFreshData();
      }

      // 检查缓存是否有效
      const now = Date.now();
      const timeDiff = now - USStockRealTimePriceService.cache.timestamp;
      
      if (USStockRealTimePriceService.cache.data && timeDiff < USStockRealTimePriceService.configCache.cacheDuration) {
        // console.log(`🗄️ USStockRealTimePriceService: Using cached data (${Math.round(timeDiff/1000)}s old)`);
        return USStockRealTimePriceService.cache.data;
      }

      // 缓存无效或不存在，从API获取新数据
      return await this.fetchFreshData();
      
    } catch (error) {
      console.error('❌ USStockRealTimePriceService: Failed to fetch real-time prices:', error);
      throw new Error(`Failed to fetch real-time stock prices: ${error.message}`);
    }
  }

  /**
   * 获取新鲜数据（从API）
   * @returns Promise<StockPriceMap[]>
   */
  private async fetchFreshData(): Promise<StockPriceMap[]> {
    // console.log('🔄 USStockRealTimePriceService: Fetching all real-time US stock prices...');
    
    // 调用API获取美股实时数据
    const response = await apiService.call('listData', [
      '',
      'REAL-TIME-DATA-USSTOCK',
      '',
      '0',
      '1'
    ]);

    // 处理两种可能的响应格式：
    // 1. 如果APIService已经提取了result字段，response就是数组
    // 2. 如果APIService返回完整响应，response.result才是数组
    let resultArray: RealTimeStockData[];

    if (Array.isArray(response)) {
      // APIService已经提取了result字段
      resultArray = response;
    } else if (response && response.result && Array.isArray(response.result)) {
      // 完整的响应格式
      resultArray = response.result;
    } else {
      console.error('❌ USStockRealTimePriceService: Invalid response format:', response);
      throw new Error('Invalid API response format');
    }

    // console.log(`✅ USStockRealTimePriceService: Received ${resultArray.length} stock prices`);
    
    // 应用最大缓存条目数限制
    const maxSize = USStockRealTimePriceService.configCache.maxCacheSize;
    if (resultArray.length > maxSize) {
      console.warn(`⚠️ USStockRealTimePriceService: Received ${resultArray.length} items, limiting to ${maxSize}`);
      resultArray = resultArray.slice(0, maxSize);
    }
    
    // 转换数据格式：将每个股票转换为独立的对象
    const priceArray: StockPriceMap[] = resultArray
      .filter(item => item.page && item.data) // 过滤无效数据
      .map(item => {
        const stockSymbol = item.page.toLowerCase(); // 转换为小写作为key
        const price = parseFloat(item.data);
        
        // 如果价格无效，跳过该股票
        if (isNaN(price)) {
          console.warn(`⚠️ Invalid price for ${item.page}: ${item.data}`);
          return null;
        }
        
        return { [stockSymbol]: price };
      })
      .filter(item => item !== null) as StockPriceMap[]; // 过滤掉null值

    // console.log(`🔄 USStockRealTimePriceService: Processed ${priceArray.length} valid stock prices`);
    
    // 打印前几个股票的价格用于调试
    // console.log('💰 Sample US stock prices:', priceArray.slice(0, 5));
    
    // 只有在启用缓存时才更新缓存
    if (USStockRealTimePriceService.configCache.enableCache) {
      USStockRealTimePriceService.cache = {
        data: priceArray,
        timestamp: Date.now()
      };
      // console.log(`💾 USStockRealTimePriceService: Data cached for ${USStockRealTimePriceService.configCache.cacheDuration}ms`);
    }
    
    return priceArray;
  }

  /**
   * 获取所有美股的实时价格（以对象格式返回，便于查找）
   * @returns Promise<StockPriceMap> 返回格式为 { nvda: 178.08, aapl: 212.39, ... }
   */
  async getAllRealTimePricesAsMap(): Promise<StockPriceMap> {
    try {
      const priceArray = await this.getAllRealTimePrices();
      
      // 将数组格式转换为单个对象格式
      const priceMap: StockPriceMap = {};
      priceArray.forEach(stockPrice => {
        Object.assign(priceMap, stockPrice);
      });
      
      // console.log(`📊 USStockRealTimePriceService: Created price map with ${Object.keys(priceMap).length} stocks`);
      
      return priceMap;
      
    } catch (error) {
      console.error('❌ USStockRealTimePriceService: Failed to create price map:', error);
      throw error;
    }
  }

  /**
   * 获取特定美股的实时价格
   * @param stockSymbol 股票代码（不区分大小写）
   * @returns Promise<number | null> 返回价格，如果找不到返回null
   */
  async getStockPrice(stockSymbol: string): Promise<number | null> {
    try {
      const priceMap = await this.getAllRealTimePricesAsMap();
      const price = priceMap[stockSymbol.toLowerCase()];
      
      if (price !== undefined) {
        // console.log(`💰 USStockRealTimePriceService: Found price for ${stockSymbol}: ${price}`);
        return price;
      } else {
        // console.warn(`⚠️ USStockRealTimePriceService: Price not found for ${stockSymbol}`);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ USStockRealTimePriceService: Failed to get price for ${stockSymbol}:`, error);
      throw error;
    }
  }

  /**
   * 批量获取指定美股的实时价格
   * @param stockSymbols 股票代码数组
   * @returns Promise<StockPriceMap> 返回包含找到的股票价格的对象
   */
  async getBatchStockPrices(stockSymbols: string[]): Promise<StockPriceMap> {
    try {
      const priceMap = await this.getAllRealTimePricesAsMap();
      const result: StockPriceMap = {};
      
      stockSymbols.forEach(stockSymbol => {
        const price = priceMap[stockSymbol.toLowerCase()];
        if (price !== undefined) {
          result[stockSymbol.toLowerCase()] = price;
        }
      });
      
      // console.log(`📊 USStockRealTimePriceService: Found prices for ${Object.keys(result).length}/${stockSymbols.length} requested stocks`);
      
      return result;
      
    } catch (error) {
      console.error('❌ USStockRealTimePriceService: Failed to get batch prices:', error);
      throw error;
    }
  }

  /**
   * 获取当前配置信息（用于调试和监控）
   * @returns Promise<object> 当前的配置信息
   */
  async getConfigInfo(): Promise<{
    cacheDuration: number;
    enableCache: boolean;
    maxCacheSize: number;
    cacheAge: number;
    hasCachedData: boolean;
    lastConfigFetch: number;
  }> {
    await USStockRealTimePriceService.getConfigs();
    
    const now = Date.now();
    const cacheAge = USStockRealTimePriceService.cache.timestamp > 0 
      ? now - USStockRealTimePriceService.cache.timestamp 
      : -1;
    
    return {
      cacheDuration: USStockRealTimePriceService.configCache.cacheDuration,
      enableCache: USStockRealTimePriceService.configCache.enableCache,
      maxCacheSize: USStockRealTimePriceService.configCache.maxCacheSize,
      cacheAge,
      hasCachedData: USStockRealTimePriceService.cache.data !== null,
      lastConfigFetch: USStockRealTimePriceService.configCache.lastConfigFetch
    };
  }

  /**
   * 清除缓存（用于强制刷新）
   */
  clearCache(): void {
    USStockRealTimePriceService.cache = {
      data: null,
      timestamp: 0
    };
    console.log('🗑️ USStockRealTimePriceService: Cache cleared');
  }
}

// 创建并导出服务实例
const usStockRealTimePriceService = new USStockRealTimePriceService();
export default usStockRealTimePriceService;

// 导出类型
export type { StockPriceMap, RealTimeStockData };
