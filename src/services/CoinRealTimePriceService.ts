import apiService from './APIService';
import configService from './ConfigService';

// 定义实时价格数据接口
interface RealTimeCoinData {
  page: string;
  data: string;
}

// 定义返回的价格对象接口
interface CoinPriceMap {
  [coinName: string]: number;
}

// API响应接口
interface RealTimePriceResponse {
  result: RealTimeCoinData[];
}

class CoinRealTimePriceService {
  // 全局缓存
  private static cache: {
    data: CoinPriceMap[] | null;
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
    cacheDuration: CoinRealTimePriceService.DEFAULT_CACHE_DURATION,
    enableCache: CoinRealTimePriceService.DEFAULT_ENABLE_CACHE,
    maxCacheSize: CoinRealTimePriceService.DEFAULT_MAX_CACHE_SIZE,
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
      const cacheDurationStr = await configService.getConfig('REALTIME_PRICE_CACHE_DURATION', this.DEFAULT_CACHE_DURATION.toString());
      const cacheDuration = parseInt(cacheDurationStr, 10);
      this.configCache.cacheDuration = isNaN(cacheDuration) || cacheDuration < 0 ? this.DEFAULT_CACHE_DURATION : cacheDuration;

      // 获取是否启用缓存配置
      const enableCacheStr = await configService.getConfig('REALTIME_PRICE_ENABLE_CACHE', this.DEFAULT_ENABLE_CACHE.toString());
      this.configCache.enableCache = enableCacheStr.toLowerCase() === 'true';

      // 获取最大缓存条目数配置
      const maxCacheSizeStr = await configService.getConfig('REALTIME_PRICE_MAX_CACHE_SIZE', this.DEFAULT_MAX_CACHE_SIZE.toString());
      const maxCacheSize = parseInt(maxCacheSizeStr, 10);
      this.configCache.maxCacheSize = isNaN(maxCacheSize) || maxCacheSize <= 0 ? this.DEFAULT_MAX_CACHE_SIZE : maxCacheSize;

      this.configCache.lastConfigFetch = now;
      
      console.log('📋 CoinRealTimePriceService: Config loaded:', {
        cacheDuration: this.configCache.cacheDuration,
        enableCache: this.configCache.enableCache,
        maxCacheSize: this.configCache.maxCacheSize
      });
    } catch (error) {
      console.warn('⚠️ CoinRealTimePriceService: Failed to load config, using defaults:', error);
      // 保持默认配置
    }
  }

  /**
   * 获取所有币种的实时价格
   * @returns Promise<CoinPriceMap[]> 返回格式为 [{ btc: 99000}, { eth: 2500}, ...]
   */
  async getAllRealTimePrices(): Promise<CoinPriceMap[]> {
    try {
      // 先获取最新配置
      await CoinRealTimePriceService.getConfigs();

      // 检查是否启用缓存
      if (!CoinRealTimePriceService.configCache.enableCache) {
        // console.log('🚫 CoinRealTimePriceService: Cache disabled, fetching fresh data');
        return await this.fetchFreshData();
      }

      // 检查缓存是否有效
      const now = Date.now();
      const timeDiff = now - CoinRealTimePriceService.cache.timestamp;
      
      if (CoinRealTimePriceService.cache.data && timeDiff < CoinRealTimePriceService.configCache.cacheDuration) {
        // console.log(`🗄️ CoinRealTimePriceService: Using cached data (${Math.round(timeDiff/1000)}s old)`);
        return CoinRealTimePriceService.cache.data;
      }

      // 缓存无效或不存在，从API获取新数据
      return await this.fetchFreshData();
      
    } catch (error) {
      console.error('❌ CoinRealTimePriceService: Failed to fetch real-time prices:', error);
      throw new Error(`Failed to fetch real-time prices: ${error.message}`);
    }
  }

  /**
   * 获取新鲜数据（从API）
   * @returns Promise<CoinPriceMap[]>
   */
  private async fetchFreshData(): Promise<CoinPriceMap[]> {
    // console.log('🔄 CoinRealTimePriceService: Fetching all real-time prices...');
    
    // 调用API获取实时数据
    const response = await apiService.call('listData', [
      '',
      'REAL-TIME-DATA-COIN',
      '',
      '0',
      '1'
    ]);

    // 处理两种可能的响应格式：
    // 1. 如果APIService已经提取了result字段，response就是数组
    // 2. 如果APIService返回完整响应，response.result才是数组
    let resultArray: RealTimeCoinData[];

    if (Array.isArray(response)) {
      // APIService已经提取了result字段
      resultArray = response;
    } else if (response && response.result && Array.isArray(response.result)) {
      // 完整的响应格式
      resultArray = response.result;
    } else {
      console.error('❌ CoinRealTimePriceService: Invalid response format:', response);
      throw new Error('Invalid API response format');
    }

    // console.log(`✅ CoinRealTimePriceService: Received ${resultArray.length} coin prices`);
    
    // 应用最大缓存条目数限制
    const maxSize = CoinRealTimePriceService.configCache.maxCacheSize;
    if (resultArray.length > maxSize) {
      console.warn(`⚠️ CoinRealTimePriceService: Received ${resultArray.length} items, limiting to ${maxSize}`);
      resultArray = resultArray.slice(0, maxSize);
    }
    
    // 转换数据格式：将每个币种转换为独立的对象
    const priceArray: CoinPriceMap[] = resultArray
      .filter(item => item.page && item.data) // 过滤无效数据
      .map(item => {
        const coinName = item.page.toLowerCase(); // 转换为小写作为key
        const price = parseFloat(item.data);
        
        // 如果价格无效，跳过该币种
        if (isNaN(price)) {
          console.warn(`⚠️ Invalid price for ${item.page}: ${item.data}`);
          return null;
        }
        
        return { [coinName]: price };
      })
      .filter(item => item !== null) as CoinPriceMap[]; // 过滤掉null值

    // console.log(`🔄 CoinRealTimePriceService: Processed ${priceArray.length} valid coin prices`);
    
    // 打印前几个币种的价格用于调试
    // console.log('💰 Sample prices:', priceArray.slice(0, 5));
    
    // 只有在启用缓存时才更新缓存
    if (CoinRealTimePriceService.configCache.enableCache) {
      CoinRealTimePriceService.cache = {
        data: priceArray,
        timestamp: Date.now()
      };
      // console.log(`💾 CoinRealTimePriceService: Data cached for ${CoinRealTimePriceService.configCache.cacheDuration}ms`);
    }
    
    return priceArray;
  }

  /**
   * 获取所有币种的实时价格（以对象格式返回，便于查找）
   * @returns Promise<CoinPriceMap> 返回格式为 { btc: 99000, eth: 2500, ... }
   */
  async getAllRealTimePricesAsMap(): Promise<CoinPriceMap> {
    try {
      const priceArray = await this.getAllRealTimePrices();
      
      // 将数组格式转换为单个对象格式
      const priceMap: CoinPriceMap = {};
      priceArray.forEach(coinPrice => {
        Object.assign(priceMap, coinPrice);
      });
      
      // console.log(`📊 CoinRealTimePriceService: Created price map with ${Object.keys(priceMap).length} coins`);
      
      return priceMap;
      
    } catch (error) {
      console.error('❌ CoinRealTimePriceService: Failed to create price map:', error);
      throw error;
    }
  }

  /**
   * 获取特定币种的实时价格
   * @param coinName 币种名称（不区分大小写）
   * @returns Promise<number | null> 返回价格，如果找不到返回null
   */
  async getCoinPrice(coinName: string): Promise<number | null> {
    try {
      const priceMap = await this.getAllRealTimePricesAsMap();
      const price = priceMap[coinName.toLowerCase()];
      
      if (price !== undefined) {
        // console.log(`💰 CoinRealTimePriceService: Found price for ${coinName}: ${price}`);
        return price;
      } else {
        // console.warn(`⚠️ CoinRealTimePriceService: Price not found for ${coinName}`);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ CoinRealTimePriceService: Failed to get price for ${coinName}:`, error);
      throw error;
    }
  }

  /**
   * 批量获取指定币种的实时价格
   * @param coinNames 币种名称数组
   * @returns Promise<CoinPriceMap> 返回包含找到的币种价格的对象
   */
  async getBatchCoinPrices(coinNames: string[]): Promise<CoinPriceMap> {
    try {
      const priceMap = await this.getAllRealTimePricesAsMap();
      const result: CoinPriceMap = {};
      
      coinNames.forEach(coinName => {
        const price = priceMap[coinName.toLowerCase()];
        if (price !== undefined) {
          result[coinName.toLowerCase()] = price;
        }
      });
      
      // console.log(`📊 CoinRealTimePriceService: Found prices for ${Object.keys(result).length}/${coinNames.length} requested coins`);
      
      return result;
      
    } catch (error) {
      console.error('❌ CoinRealTimePriceService: Failed to get batch prices:', error);
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
    await CoinRealTimePriceService.getConfigs();
    
    const now = Date.now();
    const cacheAge = CoinRealTimePriceService.cache.timestamp > 0 
      ? now - CoinRealTimePriceService.cache.timestamp 
      : -1;
    
    return {
      cacheDuration: CoinRealTimePriceService.configCache.cacheDuration,
      enableCache: CoinRealTimePriceService.configCache.enableCache,
      maxCacheSize: CoinRealTimePriceService.configCache.maxCacheSize,
      cacheAge,
      hasCachedData: CoinRealTimePriceService.cache.data !== null,
      lastConfigFetch: CoinRealTimePriceService.configCache.lastConfigFetch
    };
  }

  /**
   * 清除缓存（用于强制刷新）
   */
  clearCache(): void {
    CoinRealTimePriceService.cache = {
      data: null,
      timestamp: 0
    };
    console.log('🗑️ CoinRealTimePriceService: Cache cleared');
  }
}

// 创建并导出服务实例
const coinRealTimePriceService = new CoinRealTimePriceService();
export default coinRealTimePriceService;

// 导出类型
export type { CoinPriceMap, RealTimeCoinData };
