import apiService from './APIService';

/**
 * 配置项接口
 */
export interface ConfigItem {
  group: string;
  key: string;
  value: string;
}

/**
 * 配置服务类
 * 用于获取和管理应用配置
 */
class ConfigService {
  private configCache: Map<string, ConfigItem> = new Map();
  private lastFetchTime: number | null = null;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时
  private isLoading: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // 初始化空配置
  }

  /**
   * 初始化配置服务
   * 加载并缓存配置数据
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      // 如果已经有初始化过程在进行中，直接返回该Promise
      return this.initPromise;
    }

    this.initPromise = this.fetchAndCacheConfigs();
    return this.initPromise;
  }

  /**
   * 获取指定key的配置值
   * @param key 配置键
   * @param defaultValue 默认值（如果配置不存在）
   * @returns 配置值或默认值
   */
  async getConfig(key: string, defaultValue: string = ''): Promise<string> {
    // 确保配置已加载
    await this.ensureConfigLoaded();

    // 获取缓存中的配置
    const config = this.configCache.get(key);
    let value = config ? config.value : defaultValue;

    // 特殊处理：如果是GOOGLE_CLIENT_ID且值为mock或无效值，使用前端默认值
    if (key === 'GOOGLE_CLIENT_ID') {
      if (!value || value === 'mock-google-client-id' || value.startsWith('mock-')) {
        const frontendDefault = '516014443439-fcrkkf7b3b2q3b3umatovipb4dg7fitn.apps.googleusercontent.com';
        return frontendDefault;
      }
    }

    return value;
  }


  /**
   * 确保配置已加载
   */
  private async ensureConfigLoaded(): Promise<void> {
    const now = Date.now();
    const shouldRefresh = 
      this.configCache.size === 0 || 
      !this.lastFetchTime || 
      (now - this.lastFetchTime > this.CACHE_DURATION);

    if (shouldRefresh) {
      await this.fetchAndCacheConfigs();
    }
  }

  /**
   * 获取并缓存所有配置
   */
  private async fetchAndCacheConfigs(): Promise<void> {
    if (this.isLoading) {
      // 防止重复加载
      return;
    }

    this.isLoading = true;
    try {
      console.log('🔄 ConfigService: Fetching app configs...');
      
      // 调用API获取配置
      const configs = await this.fetchConfigs();
      
      // 清空当前缓存
      this.configCache.clear();
      
      // 将配置保存到缓存
      configs.forEach(config => {
        this.configCache.set(config.key, config);
      });
      
      this.lastFetchTime = Date.now();
      console.log(`✅ ConfigService: Loaded ${configs.length} configs`);
      
      // 显示所有MARKET_LIST相关的配置
      const marketListConfigs: ConfigItem[] = [];
      this.configCache.forEach((config, key) => {
        if (key.startsWith('MARKET_LIST')) {
          marketListConfigs.push(config);
        }
      });
      
      if (marketListConfigs.length > 0) {
        console.log('🎯 ConfigService: MARKET_LIST configs found:', marketListConfigs.length);
        marketListConfigs
          .sort((a, b) => a.key.localeCompare(b.key))
          .forEach(config => {
            console.log(`   ${config.key}: "${config.value}"`);
          });
      } else {
        console.warn('⚠️ ConfigService: No MARKET_LIST configs found!');
      }
    } catch (error) {
      console.error('❌ ConfigService: Failed to fetch configs:', error);
      // 出错时不更新lastFetchTime，允许下次再次尝试
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 从API获取配置数据
   * @returns 配置项数组
   */
  private async fetchConfigs(): Promise<ConfigItem[]> {
    try {
      console.log('🔄 ConfigService: Fetching app configs...');
      const response = await apiService.call('listConfig', ['xmb_config']);
      
      if (Array.isArray(response)) {
        console.log(`✅ ConfigService: Loaded ${response.length} configs`);
        return response;
      } else if (response && Array.isArray(response.result)) {
        console.log(`✅ ConfigService: Loaded ${response.result.length} configs`);
        return response.result;
      } else {
        console.warn('⚠️ ConfigService: Unexpected response format:', response);
        return [];
      }
    } catch (error) {
      console.error('❌ ConfigService: API call failed:', error);
      throw error;
    }
  }

  /**
   * 强制刷新配置缓存
   */
  async refreshConfigs(): Promise<void> {
    this.lastFetchTime = null;
    await this.fetchAndCacheConfigs();
  }

  /**
   * 获取所有已缓存的配置
   * @returns 所有配置的键值对象
   */
  async getAllConfigs(): Promise<Record<string, string>> {
    await this.ensureConfigLoaded();
    
    const result: Record<string, string> = {};
    this.configCache.forEach((config, key) => {
      result[key] = config.value;
    });
    
    return result;
  }
}

// 创建单例实例
export const configService = new ConfigService();
export default configService;
