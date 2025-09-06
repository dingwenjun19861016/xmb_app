import UserService from './UserService';
import apiConfig, { getUserURL } from '../config/apiConfig';

// 收藏文章数据接口
export interface FavoriteArticle {
  path: string;
  title: string;
  date: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

// 添加文章响应接口
export interface AddUserArticleResponse {
  email: string;
  path: string;
  title: string;
  date: string;
  valid: boolean;
  currentCount: number;
  maxLimit: number;
}

// 移除文章响应接口
export interface RemoveUserArticleResponse {
  email: string;
  path: string;
  valid: boolean;
}

// API响应接口
interface GetUserArticlesResponse {
  email: string;
  role: string;
  articles: FavoriteArticle[];
  total: number;
  maxLimit: number;
}

// 服务响应接口
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class UserArticleService {
  private static instance: UserArticleService;

  private constructor() {}

  static getInstance(): UserArticleService {
    if (!UserArticleService.instance) {
      UserArticleService.instance = new UserArticleService();
    }
    return UserArticleService.instance;
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
        const token = await UserService.getToken();
        if (!token) {
          throw new Error('用户未登录');
        }

        const currentURL = getUserURL();
        console.log(`📰 UserArticleService: 发送请求 (尝试 ${attempt + 1}):`, {
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
          console.log('🚫 UserArticleService: 检测到token过期，用户需要重新登录:', data.code);
          throw new Error('登录已过期，请重新登录');
        }
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;
      } catch (error) {
        lastError = error;
        console.error(`UserArticleService: Secure API request failed (尝试 ${attempt + 1}):`, error);
        
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
          console.log(`🔄 UserArticleService: 尝试切换到备用接入点...`);
          await apiConfig.handleRequestFailure();
          continue;
        }
      }
    }

    throw lastError;
  }

  /**
   * 添加用户收藏文章
   * @param userEmail 用户邮箱
   * @param articlePath 文章路径
   * @returns Promise<ServiceResponse<AddUserArticleResponse>>
   */
  async addUserArticle(userEmail: string, articlePath: string): Promise<ServiceResponse<AddUserArticleResponse>> {
    try {
      console.log('📰 UserArticleService: 添加收藏文章', { userEmail, articlePath });

      const result = await this.postSecure({ 
        method: 'addUserArticle', 
        params: [userEmail, articlePath, "XMB"]
      });

      console.log('📰 UserArticleService: API返回结果:', result);

      if (result.result) {
        return {
          success: true,
          data: result.result
        };
      } else {
        throw new Error(result.error || '添加收藏文章失败');
      }
    } catch (error: any) {
      console.error('❌ UserArticleService: 添加收藏文章失败:', error);
      
      // 处理网络错误
      if (error.message?.includes('Network request failed') || error.message?.includes('timeout')) {
        return {
          success: false,
          error: '网络连接失败，请检查网络后重试'
        };
      }
      
      // 处理401未授权错误
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        return {
          success: false,
          error: '登录已过期，请重新登录'
        };
      }
      
      return {
        success: false,
        error: error.message || '添加收藏文章失败'
      };
    }
  }

  /**
   * 移除用户收藏文章
   * @param userEmail 用户邮箱
   * @param articlePath 文章路径
   * @returns Promise<ServiceResponse<RemoveUserArticleResponse>>
   */
  async removeUserArticle(userEmail: string, articlePath: string): Promise<ServiceResponse<RemoveUserArticleResponse>> {
    try {
      console.log('📰 UserArticleService: 移除收藏文章', { userEmail, articlePath });

      const result = await this.postSecure({ 
        method: 'removeUserArticle', 
        params: [userEmail, articlePath]
      });

      console.log('📰 UserArticleService: API返回结果:', result);

      if (result.result) {
        return {
          success: true,
          data: result.result
        };
      } else {
        throw new Error(result.error || '移除收藏文章失败');
      }
    } catch (error: any) {
      console.error('❌ UserArticleService: 移除收藏文章失败:', error);
      
      // 处理网络错误
      if (error.message?.includes('Network request failed') || error.message?.includes('timeout')) {
        return {
          success: false,
          error: '网络连接失败，请检查网络后重试'
        };
      }
      
      // 处理401未授权错误
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        return {
          success: false,
          error: '登录已过期，请重新登录'
        };
      }
      
      return {
        success: false,
        error: error.message || '移除收藏文章失败'
      };
    }
  }

  /**
   * 获取用户收藏的文章
   * @param userEmail 用户邮箱
   * @returns Promise<ServiceResponse<FavoriteArticle[]>>
   */
  async getUserArticles(userEmail: string): Promise<ServiceResponse<FavoriteArticle[]>> {
    try {
      console.log('📰 UserArticleService: 获取用户收藏文章, email:', userEmail);

      const result = await this.postSecure({ 
        method: 'getUserArticles', 
        params: [userEmail, "true", "XMB"]
      });

      console.log('📰 UserArticleService: API返回结果:', result);

      if (result.result) {
        const articlesData = result.result as GetUserArticlesResponse;
        console.log('✅ UserArticleService: 获取到收藏文章:', articlesData.articles?.length || 0, '篇');
        
        return {
          success: true,
          data: articlesData.articles || []
        };
      } else {
        throw new Error(result.error || '获取收藏文章失败');
      }
    } catch (error: any) {
      console.error('❌ UserArticleService: 获取用户收藏文章失败:', error);
      
      // 处理网络错误
      if (error.message?.includes('Network request failed') || error.message?.includes('timeout')) {
        return {
          success: false,
          error: '网络连接失败，请检查网络后重试'
        };
      }
      
      // 处理401未授权错误
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        return {
          success: false,
          error: '登录已过期，请重新登录'
        };
      }
      
      return {
        success: false,
        error: error.message || '获取收藏文章失败'
      };
    }
  }
}

// 导出单例
const userArticleService = UserArticleService.getInstance();
export default userArticleService;
