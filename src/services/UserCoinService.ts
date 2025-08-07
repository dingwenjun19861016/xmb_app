import userService from './UserService';
import apiConfig, { getUserURL } from '../config/apiConfig';

export interface AddUserCoinRequest {
  email: string;
  coin: string;
}

export interface AddUserCoinResponse {
  email: string;
  coin: string;
  valid: boolean;
  currentCount: number;
  maxLimit: number;
}

export interface UserCoinItem {
  coin: string;
  created_at: string;
  updated_at: string;
}

export interface GetUserCoinsResponse {
  email: string;
  coins: UserCoinItem[];
  total: number;
  maxLimit: number;
}

export interface UserCoinServiceResponse {
  success: boolean;
  data?: AddUserCoinResponse | GetUserCoinsResponse;
  error?: string;
}

/**
 * 用户自选币种服务
 */
class UserCoinService {
  private static instance: UserCoinService;

  private constructor() {}

  static getInstance(): UserCoinService {
    if (!UserCoinService.instance) {
      UserCoinService.instance = new UserCoinService();
    }
    return UserCoinService.instance;
  }

  /**
   * 发送需要认证的API请求
   */
  private async postSecure({ method, params }: { 
    method: string; 
    params: any[]; 
  }): Promise<any> {
    let lastError: any;
    const maxRetries = 3; // 最多重试3次

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const token = await userService.getToken();
        if (!token) {
          throw new Error('用户未登录');
        }

        const currentURL = getUserURL();
        console.log(`📤 UserCoinService: 发送请求 (尝试 ${attempt + 1}):`, {
          url: currentURL,
          method: method
        });

        const response = await fetch(currentURL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            method,
            params,
            token
          })
        });

        const data = await response.json();
        
        // 简单检查常见的token过期错误码
        if (data.code === '-32604' || data.code === '-33058') {
          console.log('🚫 UserCoinService: 检测到token过期，用户需要重新登录:', data.code);
          throw new Error('登录已过期，请重新登录');
        }
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;
      } catch (error) {
        lastError = error;
        console.error(`UserCoinService: Secure API request failed (尝试 ${attempt + 1}):`, error);
        
        // 如果是token相关错误或用户未登录，不重试
        if (error.message.includes('登录已过期') || error.message.includes('用户未登录')) {
          throw error;
        }
        
        // 如果还有重试机会且是网络/服务器错误，尝试切换接入点
        if (attempt < maxRetries && (
          error.message.includes('Network request failed') || 
          error.message.includes('HTTP error') ||
          error.message.includes('fetch')
        )) {
          console.log(`🔄 UserCoinService: 尝试切换到备用接入点...`);
          await apiConfig.handleRequestFailure();
          continue;
        }
      }
    }

    throw lastError;
  }

  /**
   * 添加用户自选币种
   * @param email 用户邮箱
   * @param coin 币种符号（如：BTC, ETH）
   * @returns Promise<UserCoinServiceResponse>
   */
  async addUserCoin(email: string, coin: string): Promise<UserCoinServiceResponse> {
    try {
      console.log('🪙 UserCoinService: 添加自选币种', { email, coin });
      
      const result = await this.postSecure({ 
        method: 'addUserCoin', 
        params: [email, coin.toUpperCase()]
      });

      console.log('🪙 UserCoinService: API返回结果:', result);

      if (result.result) {
        return {
          success: true,
          data: result.result
        };
      } else {
        throw new Error(result.error || '添加自选币种失败');
      }
    } catch (error) {
      console.error('❌ UserCoinService: 添加自选币种失败:', error);
      return {
        success: false,
        error: error.message || '添加自选币种失败，请稍后重试'
      };
    }
  }

  /**
   * 移除用户自选币种
   * @param email 用户邮箱
   * @param coin 币种符号（如：BTC, ETH）
   * @returns Promise<UserCoinServiceResponse>
   */
  async removeUserCoin(email: string, coin: string): Promise<UserCoinServiceResponse> {
    try {
      console.log('🪙 UserCoinService: 移除自选币种', { email, coin });
      
      const result = await this.postSecure({ 
        method: 'removeUserCoin', 
        params: [email, coin.toUpperCase()]
      });

      console.log('🪙 UserCoinService: API返回结果:', result);

      if (result.result) {
        return {
          success: true,
          data: result.result
        };
      } else {
        throw new Error(result.error || '移除自选币种失败');
      }
    } catch (error) {
      console.error('❌ UserCoinService: 移除自选币种失败:', error);
      return {
        success: false,
        error: error.message || '移除自选币种失败，请稍后重试'
      };
    }
  }

  /**
   * 获取用户自选币种列表
   * @param email 用户邮箱
   * @returns Promise<UserCoinServiceResponse>
   */
  async getUserCoins(email: string): Promise<UserCoinServiceResponse> {
    try {
      console.log('🪙 UserCoinService: 获取用户自选币种', { email });
      
      const result = await this.postSecure({ 
        method: 'getUserCoins', 
        params: [email]
      });

      console.log('🪙 UserCoinService: API返回结果:', result);

      if (result.result) {
        return {
          success: true,
          data: result.result
        };
      } else {
        throw new Error(result.error || '获取自选币种失败');
      }
    } catch (error) {
      console.error('❌ UserCoinService: 获取自选币种失败:', error);
      return {
        success: false,
        error: error.message || '获取自选币种失败，请稍后重试'
      };
    }
  }
}

const userCoinService = UserCoinService.getInstance();
export default userCoinService;
