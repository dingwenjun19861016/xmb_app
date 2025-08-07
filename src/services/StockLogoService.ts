import configService from './ConfigService';
import { getMainURL } from '../config/apiConfig';

class StockLogoService {
  // 内存缓存
  private logoCache: Record<string, string> = {};

  // 默认配置值 - 使用股票logo路径
  private static readonly DEFAULT_BASE_URL = 'https://chainalert.me/images/usstock/';
  private static readonly DEFAULT_FALLBACK_URL = 'https://via.placeholder.com/64x64/E5E5EA/8E8E93?text=?';

  // 配置缓存
  private static configCache: {
    baseUrl: string;
    fallbackUrl: string;
    lastConfigFetch: number;
  } = {
    baseUrl: StockLogoService.DEFAULT_BASE_URL,
    fallbackUrl: StockLogoService.DEFAULT_FALLBACK_URL,
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
      // 获取股票logo基础URL配置
      const baseUrlStr = await configService.getConfig('STOCK_LOGO_BASE_URL', this.DEFAULT_BASE_URL);
      this.configCache.baseUrl = baseUrlStr || this.DEFAULT_BASE_URL;

      // 获取回退URL配置
      const fallbackUrlStr = await configService.getConfig('STOCK_LOGO_FALLBACK_URL', this.DEFAULT_FALLBACK_URL);
      this.configCache.fallbackUrl = fallbackUrlStr || this.DEFAULT_FALLBACK_URL;

      this.configCache.lastConfigFetch = now;
      
      console.log('📋 StockLogoService: Config loaded:', {
        baseUrl: this.configCache.baseUrl,
        fallbackUrl: this.configCache.fallbackUrl
      });
    } catch (error) {
      console.warn('⚠️ StockLogoService: Failed to load config, using defaults:', error);
      // 保持默认配置
    }
  }

  /**
   * 确保配置已加载（异步，不阻塞）
   */
  private ensureConfigLoadedAsync(): void {
    // 如果配置从未加载过，或者超过刷新间隔，则异步加载
    const now = Date.now();
    const CONFIG_REFRESH_INTERVAL = 5 * 60 * 1000; // 5分钟
    
    if (StockLogoService.configCache.lastConfigFetch === 0 || 
        (now - StockLogoService.configCache.lastConfigFetch > CONFIG_REFRESH_INTERVAL)) {
      // 异步加载配置，不阻塞当前调用
      StockLogoService.getConfigs().catch(error => {
        console.warn('⚠️ StockLogoService: Async config load failed:', error);
      });
    }
  }

  /**
   * 获取单个股票的logo URL (同步版本，用于快速显示)
   * 直接返回远程URL，不等待缓存
   */
  public getLogoUrlSync(stockCode: string): string {
    if (!stockCode) return this.generateFallbackLogoSync(stockCode);
    
    const upperCode = stockCode.toUpperCase();
    
    // 如果已经缓存，直接返回
    if (this.logoCache[upperCode]) {
      return this.logoCache[upperCode];
    }

    // 尝试异步加载配置（不阻塞）
    this.ensureConfigLoadedAsync();

    // 使用配置的基础URL生成股票logo URL
    const logoUrl = `${StockLogoService.configCache.baseUrl}${upperCode}.png`;
    this.logoCache[upperCode] = logoUrl;
    return logoUrl;
  }

  /**
   * 获取单个股票的logo URL
   * 使用远程图标服务（带缓存）
   */
  public async getLogoUrl(stockCode: string): Promise<string> {
    if (!stockCode) return await this.generateFallbackLogo(stockCode);
    
    const upperCode = stockCode.toUpperCase();
    
    // 先获取最新配置
    await StockLogoService.getConfigs();
    
    // 如果已经缓存，直接返回
    if (this.logoCache[upperCode]) {
      return this.logoCache[upperCode];
    }

    try {
      // 使用配置的基础URL生成股票logo URL
      const logoUrl = `${StockLogoService.configCache.baseUrl}${upperCode}.png`;
      this.logoCache[upperCode] = logoUrl;
      
      console.log(`📸 StockLogoService: Generated logo URL for ${upperCode}: ${logoUrl}`);
      
      return logoUrl;
    } catch (error) {
      console.warn(`⚠️ StockLogoService: Failed to get logo for ${stockCode}:`, error);
      const fallbackUrl = await this.generateFallbackLogo(stockCode);
      this.logoCache[upperCode] = fallbackUrl;
      return fallbackUrl;
    }
  }

  /**
   * 处理logo加载失败，尝试回退
   */
  public handleLogoError(stockCode: string, failedUrl: string): string {
    if (!stockCode) return this.generateFallbackLogoSync('');
    
    const upperCode = stockCode.toUpperCase();
    console.log(`🔍 StockLogoService: Handling logo error for ${upperCode}, failed URL: ${failedUrl}`);
    
    // 生成回退logo
    const fallbackUrl = this.generateFallbackLogoSync(stockCode);
    this.logoCache[upperCode] = fallbackUrl;
    return fallbackUrl;
  }

  /**
   * 批量获取多个股票的logo (异步版本)
   * 返回stockCode到logo URL的映射
   */
  public async getLogos(stockCodes: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    
    const promises = stockCodes.map(async (code) => {
      if (code) {
        try {
          result[code] = await this.getLogoUrl(code);
        } catch (error) {
          console.warn(`⚠️ StockLogoService: Failed to get logo for ${code}:`, error);
          result[code] = await this.generateFallbackLogo(code);
        }
      }
    });
    
    await Promise.allSettled(promises);
    return result;
  }

  /**
   * 批量获取多个股票的logo (同步版本)
   * 返回stockCode到logo URL的映射
   */
  public getLogosSync(stockCodes: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    
    stockCodes.forEach(code => {
      if (code) {
        result[code] = this.getLogoUrlSync(code);
      }
    });

    return result;
  }

  /**
   * 预加载热门股票的logo
   * 用于应用启动时预加载常见股票图标
   */
  public async preloadPopularStocks(): Promise<void> {
    const popularStocks = ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NFLX', 'AMD', 'COIN'];
    
    const promises = popularStocks.map(code => this.getLogoUrl(code));
    await Promise.allSettled(promises);
    
    console.log(`✅ StockLogoService: Preloaded ${popularStocks.length} popular stock logos`);
  }

  /**
   * 生成备用logo (使用配置的回退URL)
   */
  private async generateFallbackLogo(stockCode: string): Promise<string> {
    // 确保配置已加载
    await StockLogoService.getConfigs();
    return StockLogoService.configCache.fallbackUrl;
  }

  /**
   * 生成备用logo (同步版本)
   */
  private generateFallbackLogoSync(stockCode: string): string {
    // 使用缓存的配置或默认值
    return StockLogoService.configCache.fallbackUrl;
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.logoCache = {};
    console.log('✅ StockLogoService: Cache cleared');
  }

  /**
   * 获取缓存统计信息
   */
  public getCacheStats(): { totalCached: number; cacheKeys: string[] } {
    const cacheKeys = Object.keys(this.logoCache);
    return {
      totalCached: cacheKeys.length,
      cacheKeys
    };
  }

  /**
   * 获取当前配置信息（用于调试和监控）
   * @returns Promise<object> 当前的配置信息
   */
  public async getConfigInfo(): Promise<{
    baseUrl: string;
    fallbackUrl: string;
    lastConfigFetch: number;
    totalCached: number;
    cacheKeys: string[];
  }> {
    await StockLogoService.getConfigs();
    
    const cacheKeys = Object.keys(this.logoCache);
    
    return {
      baseUrl: StockLogoService.configCache.baseUrl,
      fallbackUrl: StockLogoService.configCache.fallbackUrl,
      lastConfigFetch: StockLogoService.configCache.lastConfigFetch,
      totalCached: cacheKeys.length,
      cacheKeys
    };
  }
}

// 导出单例实例
export default new StockLogoService();
