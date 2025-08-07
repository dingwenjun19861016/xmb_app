import remoteIconService from './LocalIconService';
import configService from './ConfigService';
import { getMainURL } from '../config/apiConfig';

class CoinLogoService {
  // 内存缓存
  private logoCache: Record<string, string> = {};

  // 默认配置值
  private static readonly DEFAULT_BASE_URL = getMainURL('images/coin/');
  private static readonly DEFAULT_FALLBACK_URL = 'https://via.placeholder.com/64x64/E5E5EA/8E8E93?text=?';

  // 配置缓存
  private static configCache: {
    baseUrl: string;
    fallbackUrl: string;
    lastConfigFetch: number;
  } = {
    baseUrl: CoinLogoService.DEFAULT_BASE_URL,
    fallbackUrl: CoinLogoService.DEFAULT_FALLBACK_URL,
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
      // 获取基础URL配置
      const baseUrlStr = await configService.getConfig('COIN_LOGO_BASE_URL', this.DEFAULT_BASE_URL);
      this.configCache.baseUrl = baseUrlStr || this.DEFAULT_BASE_URL;

      // 获取回退URL配置
      const fallbackUrlStr = await configService.getConfig('COIN_LOGO_FALLBACK_URL', this.DEFAULT_FALLBACK_URL);
      this.configCache.fallbackUrl = fallbackUrlStr || this.DEFAULT_FALLBACK_URL;

      this.configCache.lastConfigFetch = now;
      
      console.log('📋 CoinLogoService: Config loaded:', {
        baseUrl: this.configCache.baseUrl,
        fallbackUrl: this.configCache.fallbackUrl
      });
    } catch (error) {
      console.warn('⚠️ CoinLogoService: Failed to load config, using defaults:', error);
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
    
    if (CoinLogoService.configCache.lastConfigFetch === 0 || 
        (now - CoinLogoService.configCache.lastConfigFetch > CONFIG_REFRESH_INTERVAL)) {
      // 异步加载配置，不阻塞当前调用
      CoinLogoService.getConfigs().catch(error => {
        console.warn('⚠️ CoinLogoService: Async config load failed:', error);
      });
    }
  }

  /**
   * 获取单个币种的logo URL (同步版本，用于快速显示)
   * 直接返回远程URL，不等待缓存
   */
  public getLogoUrlSync(symbol: string): string {
    if (!symbol) return this.generateFallbackLogoSync(symbol);
    
    const upperSymbol = symbol.toUpperCase();
    
    // 如果已经缓存，直接返回
    if (this.logoCache[upperSymbol]) {
      return this.logoCache[upperSymbol];
    }

    // 尝试异步加载配置（不阻塞）
    this.ensureConfigLoadedAsync();

    // 使用配置的基础URL生成图标URL
    const remoteUrl = `${CoinLogoService.configCache.baseUrl}${upperSymbol}.png`;
    this.logoCache[upperSymbol] = remoteUrl;
    return remoteUrl;
  }

  /**
   * 获取单个币种的logo URL
   * 使用远程图标服务（带缓存）
   */
  public async getLogoUrl(symbol: string): Promise<string> {
    if (!symbol) return await this.generateFallbackLogo(symbol);
    
    const upperSymbol = symbol.toUpperCase();
    
    // 先获取最新配置
    await CoinLogoService.getConfigs();
    
    // 如果已经缓存，直接返回
    if (this.logoCache[upperSymbol]) {
      return this.logoCache[upperSymbol];
    }

    try {
      // 使用配置的基础URL生成图标URL
      const logoUrl = `${CoinLogoService.configCache.baseUrl}${upperSymbol}.png`;
      this.logoCache[upperSymbol] = logoUrl;
      return logoUrl;
    } catch (error) {
      console.warn(`⚠️ CoinLogoService: Failed to get icon for ${symbol}:`, error);
      const fallbackUrl = await this.generateFallbackLogo(symbol);
      this.logoCache[upperSymbol] = fallbackUrl;
      return fallbackUrl;
    }
  }

  /**
   * 处理图标加载失败，尝试回退
   */
  public handleIconError(symbol: string, failedUrl: string): string {
    if (!symbol) return this.generateFallbackLogoSync('');
    
    const upperSymbol = symbol.toUpperCase();
    console.log(`🔍 Handling icon error for ${upperSymbol}, failed URL: ${failedUrl}`);
    
    // 生成回退图标
    const fallbackUrl = this.generateFallbackLogoSync(symbol);
    this.logoCache[upperSymbol] = fallbackUrl;
    return fallbackUrl;
  }

  /**
   * 批量获取多个币种的logo (异步版本)
   * 返回symbol到logo URL的映射
   */
  public async getLogos(symbols: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    
    const promises = symbols.map(async (symbol) => {
      if (symbol) {
        try {
          result[symbol] = await this.getLogoUrl(symbol);
        } catch (error) {
          console.warn(`⚠️ CoinLogoService: Failed to get logo for ${symbol}:`, error);
          result[symbol] = await this.generateFallbackLogo(symbol);
        }
      }
    });
    
    await Promise.allSettled(promises);
    return result;
  }

  /**
   * 批量获取多个币种的logo (同步版本)
   * 返回symbol到logo URL的映射
   */
  public getLogosSync(symbols: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    
    symbols.forEach(symbol => {
      if (symbol) {
        result[symbol] = this.getLogoUrlSync(symbol);
      }
    });

    return result;
  }

  /**
   * 批量预加载logos (兼容旧接口)
   */
  public async batchPreloadLogos(
    symbols: string[], 
    forceRefresh: boolean = false, 
    priority: 'high' | 'normal' | 'background' = 'normal'
  ): Promise<void> {
    try {
      // 使用远程图标服务预加载
      await remoteIconService.preloadIcons(symbols);
      console.log(`✅ CoinLogoService: Preloaded ${symbols.length} icons`);
    } catch (error) {
      console.warn('⚠️ CoinLogoService: Failed to preload icons:', error);
    }
  }

  /**
   * 强制刷新可见币种的logos (兼容旧接口)
   */
  public async forceRefreshVisibleLogos(symbols: string[]): Promise<void> {
    // 清除这些符号的缓存
    symbols.forEach(symbol => {
      const upperSymbol = symbol.toUpperCase();
      delete this.logoCache[upperSymbol];
    });
    
    // 重新获取
    const promises = symbols.map(symbol => this.getLogoUrl(symbol));
    await Promise.allSettled(promises);
  }

  /**
   * 预加载热门币种的logo
   * 用于应用启动时预加载常见币种图标
   */
  public async preloadPopularCoins(): Promise<void> {
    const popularCoins = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'ADA', 'AVAX', 'DOT', 'MATIC'];
    await this.batchPreloadLogos(popularCoins);
  }

  /**
   * 生成备用logo (使用配置的回退URL)
   */
  private async generateFallbackLogo(symbol: string): Promise<string> {
    // 确保配置已加载
    await CoinLogoService.getConfigs();
    return CoinLogoService.configCache.fallbackUrl;
  }

  /**
   * 生成备用logo (同步版本)
   */
  private generateFallbackLogoSync(symbol: string): string {
    // 使用缓存的配置或默认值
    return CoinLogoService.configCache.fallbackUrl;
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.logoCache = {};
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
    await CoinLogoService.getConfigs();
    
    const cacheKeys = Object.keys(this.logoCache);
    
    return {
      baseUrl: CoinLogoService.configCache.baseUrl,
      fallbackUrl: CoinLogoService.configCache.fallbackUrl,
      lastConfigFetch: CoinLogoService.configCache.lastConfigFetch,
      totalCached: cacheKeys.length,
      cacheKeys
    };
  }
}

// 导出单例实例
export default new CoinLogoService();
