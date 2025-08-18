import userService from './UserService';
import apiConfig, { getUserURL } from '../config/apiConfig';

export interface AddUserStockRequest {
  email: string;
  stock: string;
}

export interface AddUserStockResponse {
  email: string;
  stock: string;
  valid: boolean;
  currentCount: number;
  maxLimit: number;
}

export interface UserStockItem {
  stock: string;
  created_at: string;
  updated_at: string;
}

export interface GetUserStocksResponse {
  email: string;
  stocks: UserStockItem[];
  total: number;
  maxLimit: number;
}

export interface RemoveUserStockResponse {
  email: string;
  stock: string;
  valid: boolean;
}

export interface UserStockServiceResponse {
  success: boolean;
  data?: AddUserStockResponse | GetUserStocksResponse | RemoveUserStockResponse;
  error?: string;
}

/**
 * 用户自选股票服务
 */
class UserStockService {
  private static instance: UserStockService;

  private constructor() {}

  static getInstance(): UserStockService {
    if (!UserStockService.instance) {
      UserStockService.instance = new UserStockService();
    }
    return UserStockService.instance;
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
        console.log(`📤 UserStockService: 发送请求 (尝试 ${attempt + 1}):`, {
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
          console.log('🚫 UserStockService: 检测到token过期，用户需要重新登录:', data.code);
          throw new Error('登录已过期，请重新登录');
        }
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;
      } catch (error) {
        lastError = error;
        console.error(`UserStockService: Secure API request failed (尝试 ${attempt + 1}):`, error);
        
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
          console.log(`🔄 UserStockService: 尝试切换到备用接入点...`);
          await apiConfig.handleRequestFailure();
          continue;
        }
      }
    }

    throw lastError;
  }

  /**
   * 添加用户自选股票
   * @param email 用户邮箱
   * @param stock 股票代码（如：AAPL, MSFT）
   * @returns Promise<UserStockServiceResponse>
   */
  async addUserStock(email: string, stock: string): Promise<UserStockServiceResponse> {
    try {
      console.log('📈 UserStockService: 添加自选股票', { email, stock });
      
      const result = await this.postSecure({ 
        method: 'addUserStock', 
        params: [email, stock.toUpperCase()]
      });

      console.log('📈 UserStockService: API返回结果:', result);

      if (result.result) {
        return {
          success: true,
          data: result.result
        };
      } else {
        throw new Error(result.error || '添加自选股票失败');
      }
    } catch (error) {
      console.error('❌ UserStockService: 添加自选股票失败:', error);
      return {
        success: false,
        error: error.message || '添加自选股票失败，请稍后重试'
      };
    }
  }

  /**
   * 移除用户自选股票
   * @param email 用户邮箱
   * @param stock 股票代码（如：AAPL, MSFT）
   * @returns Promise<UserStockServiceResponse>
   */
  async removeUserStock(email: string, stock: string): Promise<UserStockServiceResponse> {
    try {
      console.log('📈 UserStockService: 移除自选股票', { email, stock });
      
      const result = await this.postSecure({ 
        method: 'removeUserStock', 
        params: [email, stock.toUpperCase()]
      });

      console.log('📈 UserStockService: API返回结果:', result);

      if (result.result) {
        return {
          success: true,
          data: result.result
        };
      } else {
        throw new Error(result.error || '移除自选股票失败');
      }
    } catch (error) {
      console.error('❌ UserStockService: 移除自选股票失败:', error);
      
      // 特殊处理：如果股票已经不在自选列表中，视为成功
      if (error.message && error.message.includes('user is not following this stock')) {
        console.log('✅ UserStockService: 股票已经不在自选列表中，视为移除成功');
        return {
          success: true,
          data: { message: '股票已从自选列表中移除' }
        };
      }
      
      return {
        success: false,
        error: error.message || '移除自选股票失败，请稍后重试'
      };
    }
  }

  /**
   * 获取用户自选股票列表
   * @param email 用户邮箱
   * @returns Promise<UserStockServiceResponse>
   */
  async getUserStocks(email: string): Promise<UserStockServiceResponse> {
    try {
      console.log('📈 UserStockService: 获取用户自选股票', { email });
      
      const result = await this.postSecure({ 
        method: 'getUserStocks', 
        params: [email]
      });

      console.log('📈 UserStockService: API返回结果:', result);

      if (result.result) {
        return {
          success: true,
          data: result.result
        };
      } else {
        throw new Error(result.error || '获取自选股票失败');
      }
    } catch (error) {
      console.error('❌ UserStockService: 获取自选股票失败:', error);
      return {
        success: false,
        error: error.message || '获取自选股票失败，请稍后重试'
      };
    }
  }
}

const userStockService = UserStockService.getInstance();
export default userStockService;
