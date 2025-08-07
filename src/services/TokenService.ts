import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface TokenData {
  token: string;
  expiresAt: number; // Unix timestamp
  refreshToken?: string; // 可选的刷新token
}

/**
 * 跨平台存储适配器
 * Web环境使用localStorage（与UserManager.js保持一致）
 * 移动端使用AsyncStorage，带超时保护
 */
class StorageAdapter {
  static async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    
    // 移动端：添加超时保护
    return Promise.race([
      AsyncStorage.getItem(key),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error(`AsyncStorage.getItem timeout for ${key}`)), 3000)
      )
    ]).catch(error => {
      console.error(`❌ StorageAdapter: getItem失败 (${key}):`, error);
      return null;
    });
  }

  static async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
    
    // 移动端：添加超时保护
    return Promise.race([
      AsyncStorage.setItem(key, value),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`AsyncStorage.setItem timeout for ${key}`)), 3000)
      )
    ]).catch(error => {
      console.error(`❌ StorageAdapter: setItem失败 (${key}):`, error);
      throw error;
    });
  }

  static async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
    
    // 移动端：添加超时保护
    return Promise.race([
      AsyncStorage.removeItem(key),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`AsyncStorage.removeItem timeout for ${key}`)), 3000)
      )
    ]).catch(error => {
      console.error(`❌ StorageAdapter: removeItem失败 (${key}):`, error);
      // 删除操作失败不抛出错误，继续执行
    });
  }

  static async multiRemove(keys: string[]): Promise<void> {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      keys.forEach(key => localStorage.removeItem(key));
      return;
    }
    
    // 移动端：添加超时保护
    return Promise.race([
      AsyncStorage.multiRemove(keys),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`AsyncStorage.multiRemove timeout`)), 3000)
      )
    ]).catch(error => {
      console.error('❌ StorageAdapter: multiRemove失败:', error);
      // 删除操作失败不抛出错误，继续执行
    });
  }
}

/**
 * Token管理服务 - 跨平台持久化存储
 * 支持Web、iOS、Android
 * Web环境使用localStorage（与UserManager.js兼容）
 */
class TokenService {
  private static instance: TokenService;
  private readonly TOKEN_KEY = 'userToken'; // 使用与UserManager.js相同的key
  private tokenData: TokenData | null = null;

  private constructor() {}

  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * 保存token到持久化存储
   * Web环境：直接保存token字符串到localStorage（与UserManager.js兼容）
   * 移动端：保存TokenData对象到AsyncStorage
   * @param token JWT token
   * @param expiresIn 过期时间（秒）
   * @param refreshToken 可选的刷新token
   */
  async saveToken(token: string, expiresIn: number, refreshToken?: string): Promise<void> {
    try {
      const expiresAt = Date.now() + (expiresIn * 1000); // 转换为毫秒时间戳
      
      const tokenData: TokenData = {
        token,
        expiresAt,
        refreshToken
      };

      // 保存到内存
      this.tokenData = tokenData;

      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        // Web环境：与UserManager.js保持一致，直接保存token字符串
        localStorage.setItem('userToken', token);
        console.log('✅ TokenService: Token已保存到localStorage (Web)');
      } else {
        // 移动端：保存TokenData对象
        await StorageAdapter.setItem(this.TOKEN_KEY, JSON.stringify(tokenData));
        console.log('✅ TokenService: Token已保存到AsyncStorage (移动端)');
      }
      
    } catch (error) {
      console.error('❌ TokenService: 保存token失败:', error);
      throw error;
    }
  }

  /**
   * 从持久化存储获取token
   * Web环境：从localStorage直接获取token字符串（与UserManager.js兼容）
   * 移动端：从AsyncStorage获取TokenData对象并验证过期时间
   * @returns Promise<string | null>
   */
  async getToken(): Promise<string | null> {
    try {
      // 先检查内存中的token
      if (this.tokenData) {
        if (this.isTokenValid(this.tokenData)) {
          return this.tokenData.token;
        } else {
          console.log('⚠️ TokenService: 内存中的token已过期，清除');
          this.tokenData = null;
        }
      }

      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        // Web环境：与UserManager.js保持一致，直接从localStorage获取token字符串
        const token = localStorage.getItem('userToken');
        if (token) {
          console.log('✅ TokenService: 从localStorage获取token (Web)');
          // 在Web环境下，我们假设token有效（与UserManager.js行为一致）
          // 创建一个临时的TokenData用于内存缓存
          this.tokenData = {
            token,
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 假设24小时有效期
          };
          return token;
        } else {
          console.log('ℹ️ TokenService: localStorage中没有token (Web)');
          return null;
        }
      } else {
        // 移动端：从AsyncStorage获取TokenData对象
        const storedData = await StorageAdapter.getItem(this.TOKEN_KEY);
        if (!storedData) {
          console.log('ℹ️ TokenService: AsyncStorage中没有token (移动端)');
          return null;
        }

        const tokenData: TokenData = JSON.parse(storedData);
        
        // 检查token是否有效
        if (this.isTokenValid(tokenData)) {
          this.tokenData = tokenData; // 缓存到内存
          console.log('✅ TokenService: 从AsyncStorage加载有效token (移动端)');
          return tokenData.token;
        } else {
          console.log('⚠️ TokenService: AsyncStorage中的token已过期，清除 (移动端)');
          await this.clearToken();
          return null;
        }
      }
    } catch (error) {
      console.error('❌ TokenService: 获取token失败:', error);
      return null;
    }
  }

  /**
   * 检查token是否有效（未过期）
   * @param tokenData Token数据
   * @returns boolean
   */
  private isTokenValid(tokenData: TokenData): boolean {
    const now = Date.now();
    const buffer = 60 * 1000; // 60秒缓冲时间，提前1分钟认为过期
    return tokenData.expiresAt > (now + buffer);
  }

  /**
   * 获取token过期时间
   * @returns Promise<Date | null>
   */
  async getTokenExpiration(): Promise<Date | null> {
    try {
      const token = await this.getToken();
      if (!token || !this.tokenData) {
        return null;
      }
      return new Date(this.tokenData.expiresAt);
    } catch (error) {
      console.error('❌ TokenService: 获取token过期时间失败:', error);
      return null;
    }
  }

  /**
   * 检查token是否即将过期
   * @param bufferMinutes 缓冲时间（分钟），默认5分钟
   * @returns Promise<boolean>
   */
  async isTokenExpiringSoon(bufferMinutes: number = 5): Promise<boolean> {
    try {
      const expiration = await this.getTokenExpiration();
      if (!expiration) {
        return true; // 没有token认为已过期
      }

      const now = Date.now();
      const buffer = bufferMinutes * 60 * 1000; // 转换为毫秒
      return expiration.getTime() <= (now + buffer);
    } catch (error) {
      console.error('❌ TokenService: 检查token过期状态失败:', error);
      return true;
    }
  }

  /**
   * 获取刷新token
   * @returns Promise<string | null>
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      if (this.tokenData?.refreshToken) {
        return this.tokenData.refreshToken;
      }

      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        // Web环境：UserManager.js没有实现refreshToken，返回null
        return null;
      } else {
        // 移动端：从AsyncStorage获取
        const storedData = await StorageAdapter.getItem(this.TOKEN_KEY);
        if (!storedData) {
          return null;
        }

        const tokenData: TokenData = JSON.parse(storedData);
        return tokenData.refreshToken || null;
      }
    } catch (error) {
      console.error('❌ TokenService: 获取刷新token失败:', error);
      return null;
    }
  }

  /**
   * 清除token
   */
  async clearToken(): Promise<void> {
    try {
      this.tokenData = null;
      
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        // Web环境：清除localStorage中的token（与UserManager.js保持一致）
        localStorage.removeItem('userToken');
        console.log('✅ TokenService: Token已从localStorage清除 (Web)');
      } else {
        // 移动端：清除AsyncStorage中的token
        await StorageAdapter.removeItem(this.TOKEN_KEY);
        console.log('✅ TokenService: Token已从AsyncStorage清除 (移动端)');
      }
    } catch (error) {
      console.error('❌ TokenService: 清除token失败:', error);
      throw error;
    }
  }

  /**
   * 刷新token（如果有刷新token的话）
   * 这个方法需要与后端API配合实现
   */
  async refreshTokenIfNeeded(): Promise<string | null> {
    try {
      const isExpiring = await this.isTokenExpiringSoon();
      if (!isExpiring) {
        return await this.getToken(); // token还有效，直接返回
      }

      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        console.log('⚠️ TokenService: 没有刷新token，需要重新登录');
        await this.clearToken();
        return null;
      }

      // 这里需要调用后端API刷新token
      // 暂时返回null，表示需要重新登录
      console.log('⚠️ TokenService: Token即将过期，需要刷新或重新登录');
      return null;
    } catch (error) {
      console.error('❌ TokenService: 刷新token失败:', error);
      return null;
    }
  }

  /**
   * 获取token信息（用于调试）
   */
  async getTokenInfo(): Promise<{
    hasToken: boolean;
    isValid: boolean;
    expiresAt: string | null;
    expiresIn: string | null;
    platform: string;
  }> {
    try {
      const platform = Platform.OS === 'web' ? 'Web (localStorage)' : '移动端 (AsyncStorage)';
      
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        // Web环境：检查localStorage中的token
        const token = localStorage.getItem('userToken');
        return {
          hasToken: !!token,
          isValid: !!token, // 在Web环境下假设token有效（与UserManager.js行为一致）
          expiresAt: token ? '未知 (Web兼容模式)' : null,
          expiresIn: token ? '未知 (Web兼容模式)' : null,
          platform
        };
      } else {
        // 移动端：检查AsyncStorage中的TokenData
        const storedData = await StorageAdapter.getItem(this.TOKEN_KEY);
        if (!storedData) {
          return {
            hasToken: false,
            isValid: false,
            expiresAt: null,
            expiresIn: null,
            platform
          };
        }

        const tokenData: TokenData = JSON.parse(storedData);
        const isValid = this.isTokenValid(tokenData);
        const expiresAt = new Date(tokenData.expiresAt).toISOString();
        const expiresIn = Math.max(0, Math.floor((tokenData.expiresAt - Date.now()) / 1000));

        return {
          hasToken: true,
          isValid,
          expiresAt,
          expiresIn: isValid ? `${expiresIn}秒` : '已过期',
          platform
        };
      }
    } catch (error) {
      console.error('❌ TokenService: 获取token信息失败:', error);
      return {
        hasToken: false,
        isValid: false,
        expiresAt: null,
        expiresIn: null,
        platform: '错误'
      };
    }
  }
}

const tokenService = TokenService.getInstance();
export default tokenService;
