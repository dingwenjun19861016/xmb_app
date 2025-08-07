/**
 * API配置文件
 * 统一管理所有API接入点和相关配置
 */

import Constants from 'expo-constants';

// API接入点配置
export interface APIEndpoint {
  url: string;
  name: string;
  priority: number; // 优先级，数字越小优先级越高
  timeout?: number;
}

// 读取环境变量，判断是否为测试环境
// 支持多种环境变量检测方式
const IS_TEST = 
  process.env.NODE_ENV === 'test' || 
  process.env.API_ENV === 'test' ||
  process.env.EXPO_PUBLIC_API_ENV === 'test' ||
  Constants.expoConfig?.extra?.API_ENV === 'test' ||
  (typeof window !== 'undefined' && window.location?.hostname?.includes('test'));

// 域名配置
export const domains = {
  main: 'chainalert.me',
  webapp: 'app.chainalert.me',
  api: 'api.chainalert.me',
  test: 'localhost:8081'
};

// Web应用URL配置
const webAppURLs = {
  production: `https://${domains.webapp}`,
  test: `http://${domains.test}` // 测试环境使用本地开发服务器
};

// 资源URL配置
export const resourceURLs = {
  logo: `https://${domains.main}/images/logo.png`,
  favicon: `https://${domains.main}/favicon.ico`,
  appleIcon: `https://${domains.main}/apple-touch-icon-152x152.png`,
  placeholder: `https://${domains.main}/images/placeholder.jpg`
};

// API配置类
class APIConfigManager {
  private static instance: APIConfigManager;
  private currentEndpointIndex = 0;
  
  // 主要API接入点列表（按优先级排序）
  private readonly endpoints: APIEndpoint[] = IS_TEST
    ? [
        // 测试环境：只使用测试服务器
        {
          url: 'https://api3.chainalert.me',
          name: '测试服务器',
          priority: 1,
          timeout: 30000
        }
      ]
    : [
        // 生产环境：使用生产服务器和备用服务器
        {
          url: 'https://api.chainalert.me',
          name: '主服务器',
          priority: 1,
          timeout: 30000
        },
        {
          url: 'https://apiv2.furi.info',
          name: '备用服务器1',
          priority: 2,
          timeout: 30000
        },
        {
          url: 'https://apiv2.gostake.io',
          name: '备用服务器2',
          priority: 3,
          timeout: 30000
        }
      ];

  private constructor() {
    // 按优先级排序
    this.endpoints.sort((a, b) => a.priority - b.priority);
    console.log(`🔧 API: 当前环境: ${IS_TEST ? '测试' : '生产'}，使用接入点: ${this.getCurrentEndpoint().name}`);
  }

  static getInstance(): APIConfigManager {
    if (!APIConfigManager.instance) {
      APIConfigManager.instance = new APIConfigManager();
    }
    return APIConfigManager.instance;
  }

  /**
   * 获取当前活动的API接入点
   */
  getCurrentEndpoint(): APIEndpoint {
    return this.endpoints[this.currentEndpointIndex];
  }

  /**
   * 获取当前API基础URL
   */
  getBaseURL(): string {
    return this.getCurrentEndpoint().url;
  }

  /**
   * 获取公共API URL
   */
  getPublicURL(): string {
    return `${this.getBaseURL()}/public`;
  }

  /**
   * 获取Web应用URL（用于分享和深度链接）
   * @param path 可选路径（不包括开头的斜杠）
   * @returns 完整的Web应用URL
   */
  getWebAppURL(path?: string): string {
    const baseURL = IS_TEST ? webAppURLs.test : webAppURLs.production;
    if (!path) return baseURL;
    return `${baseURL}/${path}`;
  }

  /**
   * 获取主域名URL
   * @param path 可选路径（不包括开头的斜杠）
   * @returns 完整的主域名URL
   */
  getMainURL(path?: string): string {
    const baseURL = `https://${domains.main}`;
    if (!path) return baseURL;
    return `${baseURL}/${path}`;
  }

  /**
   * 获取资源URL
   * @param resourceKey 资源键名
   * @returns 资源URL
   */
  getResourceURL(resourceKey: keyof typeof resourceURLs): string {
    return resourceURLs[resourceKey];
  }

  /**
   * 获取用户API URL
   */
  getUserURL(): string {
    return `${this.getBaseURL()}/user`;
  }

  /**
   * 获取安全API URL（需要令牌的操作）
   */
  getSecureURL(): string {
    return `${this.getBaseURL()}/secure`;
  }

  /**
   * 获取通用API URL（用于APIService）
   */
  getGeneralURL(): string {
    return `${this.getBaseURL()}/`;
  }

  /**
   * 获取当前环境信息
   */
  getEnvironmentInfo(): { isTest: boolean; environment: string; endpoint: string } {
    return {
      isTest: IS_TEST,
      environment: IS_TEST ? '测试环境' : '生产环境',
      endpoint: this.getCurrentEndpoint().name
    };
  }

  /**
   * 切换到下一个接入点
   */
  switchToNextEndpoint(): boolean {
    if (this.currentEndpointIndex < this.endpoints.length - 1) {
      this.currentEndpointIndex++;
      console.log(`🔄 API: 切换到接入点: ${this.getCurrentEndpoint().name} (${this.getCurrentEndpoint().url})`);
      return true;
    }
    console.log('⚠️ API: 已经是最后一个接入点');
    return false;
  }

  /**
   * 重置到第一个接入点
   */
  resetToFirstEndpoint(): void {
    this.currentEndpointIndex = 0;
    console.log(`🔄 API: 重置到第一个接入点: ${this.getCurrentEndpoint().name} (${this.getCurrentEndpoint().url})`);
  }

  /**
   * 获取所有可用的接入点
   */
  getAllEndpoints(): APIEndpoint[] {
    return [...this.endpoints];
  }

  /**
   * 获取当前接入点的超时时间
   */
  getCurrentTimeout(): number {
    return this.getCurrentEndpoint().timeout || 30000;
  }

  /**
   * 测试接入点连通性
   */
  async testEndpoint(endpoint: APIEndpoint): Promise<boolean> {
    try {
      console.log(`🔍 API: 测试接入点连通性: ${endpoint.name} (${endpoint.url})`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
      
      const response = await fetch(`${endpoint.url}/`, {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const isHealthy = response.ok || response.status === 404; // 404也算正常，说明服务器在响应
      console.log(`${isHealthy ? '✅' : '❌'} API: 接入点 ${endpoint.name} ${isHealthy ? '正常' : '异常'}`);
      
      return isHealthy;
    } catch (error) {
      console.log(`❌ API: 接入点 ${endpoint.name} 连接失败:`, error.message);
      return false;
    }
  }

  /**
   * 自动选择最佳接入点
   */
  async selectBestEndpoint(): Promise<void> {
    console.log('🔍 API: 开始自动选择最佳接入点...');
    
    for (let i = 0; i < this.endpoints.length; i++) {
      const endpoint = this.endpoints[i];
      const isHealthy = await this.testEndpoint(endpoint);
      
      if (isHealthy) {
        this.currentEndpointIndex = i;
        console.log(`✅ API: 选择接入点: ${endpoint.name} (${endpoint.url})`);
        return;
      }
    }
    
    // 如果所有接入点都不可用，使用第一个
    this.currentEndpointIndex = 0;
    console.log(`⚠️ API: 所有接入点都不可用，使用默认接入点: ${this.getCurrentEndpoint().name}`);
  }

  /**
   * 处理请求失败时的自动切换逻辑
   */
  async handleRequestFailure(): Promise<boolean> {
    console.log('❌ API: 检测到请求失败，尝试切换接入点...');
    
    const switched = this.switchToNextEndpoint();
    if (switched) {
      // 测试新接入点
      const isHealthy = await this.testEndpoint(this.getCurrentEndpoint());
      if (isHealthy) {
        console.log('✅ API: 成功切换到可用接入点');
        return true;
      } else {
        // 继续尝试下一个
        return await this.handleRequestFailure();
      }
    }
    
    // 所有接入点都尝试过了，重置到第一个
    this.resetToFirstEndpoint();
    console.log('⚠️ API: 所有接入点都不可用，已重置到第一个接入点');
    return false;
  }
}

// 创建单例实例
export const apiConfig = APIConfigManager.getInstance();

// 导出常用的getter函数
export const getBaseURL = () => apiConfig.getBaseURL();
export const getPublicURL = () => apiConfig.getPublicURL();
export const getSecureURL = () => apiConfig.getSecureURL();
export const getUserURL = () => apiConfig.getUserURL();
export const getGeneralURL = () => apiConfig.getGeneralURL();
export const getCurrentTimeout = () => apiConfig.getCurrentTimeout();
export const getWebAppURL = (path?: string) => apiConfig.getWebAppURL(path); // 获取Web应用URL前缀
export const getMainURL = (path?: string) => apiConfig.getMainURL(path); // 获取主域名URL
export const getResourceURL = (resourceKey: keyof typeof resourceURLs) => apiConfig.getResourceURL(resourceKey); // 获取资源URL

// 导出类型
export default apiConfig;
