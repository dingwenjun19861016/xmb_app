import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { 
  User, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  CaptchaResponse, 
  VerifyTokenResponse,
  RegisterStatusResponse,
  ResendStatusResponse,
  ResendEmailResponse
} from '../types/user';
import apiConfig, { getPublicURL, getSecureURL } from '../config/apiConfig';

/**
 * 用户服务
 * 参考网页版本的userManager.js实现
 */
class UserService {
  private static instance: UserService;
  private currentUser: User | null = null;
  private tokenRefreshInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * 发送公共API请求
   */
  private async postPublic({ method, params, captcha }: { 
    method: string; 
    params: any[]; 
    captcha?: string 
  }): Promise<any> {
    let lastError: any;
    const maxRetries = 3; // 最多重试3次

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const requestBody = {
          method,
          params
        };

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // 将验证码放在header中
        if (captcha) {
          headers['captcha'] = captcha;
          console.log('🔒 验证码已添加到请求头中:', captcha);
        }

        const currentURL = getPublicURL();
        console.log('📤 发送API请求:', {
          url: currentURL,
          method: method,
          hasHeaders: Object.keys(headers),
          hasCaptcha: !!captcha,
          attempt: attempt + 1
        });

        const response = await fetch(currentURL, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        console.log('📨 API响应状态:', response.status);
        console.log('📨 API响应数据:', JSON.stringify(data, null, 2));
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;
      } catch (error) {
        lastError = error;
        console.error(`Public API request failed (尝试 ${attempt + 1}):`, error);
        
        // 如果还有重试机会且是网络/服务器错误，尝试切换接入点
        if (attempt < maxRetries && (
          error.message.includes('Network request failed') || 
          error.message.includes('HTTP error') ||
          error.message.includes('fetch')
        )) {
          console.log(`🔄 UserService: 尝试切换到备用接入点...`);
          await apiConfig.handleRequestFailure();
          continue;
        }
        
        // 如果是业务逻辑错误（如密码错误），不重试
        if (error.message.includes('密码') || error.message.includes('邮箱') || error.message.includes('验证码')) {
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * 发送安全API请求（需要令牌）
   */
  private async postSecure({ method, params, token }: { 
    method: string; 
    params: any[]; 
    token: string 
  }): Promise<any> {
    let lastError: any;
    const maxRetries = 3; // 最多重试3次

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const currentURL = getSecureURL();
        console.log(`📤 发送安全API请求 (尝试 ${attempt + 1}):`, {
          url: currentURL,
          method: method
        });

        const response = await fetch(currentURL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
          console.log('🚫 检测到token过期，自动登出:', data.code);
          await this.logout();
          throw new Error('登录已过期，请重新登录');
        }
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;
      } catch (error) {
        lastError = error;
        console.error(`Secure API request failed (尝试 ${attempt + 1}):`, error);
        
        // 如果是token过期错误，不重试
        if (error.message.includes('登录已过期')) {
          throw error;
        }
        
        // 如果还有重试机会且是网络/服务器错误，尝试切换接入点
        if (attempt < maxRetries && (
          error.message.includes('Network request failed') || 
          error.message.includes('HTTP error') ||
          error.message.includes('fetch')
        )) {
          console.log(`🔄 UserService: 尝试切换到备用接入点...`);
          await apiConfig.handleRequestFailure();
          continue;
        }
      }
    }

    throw lastError;
  }

  /**
   * 生成验证码
   */
  async generateCaptcha(): Promise<CaptchaResponse> {
    try {
      const result = await this.postPublic({ 
        method: 'createCaptcha', 
        params: [] 
      });
      
      if (result.result) {
        return {
          success: true,
          captchaImage: result.result
        };
      } else {
        throw new Error(result.error || '验证码生成失败');
      }
    } catch (error) {
      console.error('Generate captcha failed:', error);
      return {
        success: false,
        error: error.message || '生成验证码失败'
      };
    }
  }

  /**
   * 用户登录
   */
  async login({ email, password }: LoginRequest): Promise<AuthResponse> {
    try {
      console.log('🔐 UserService: 开始登录API请求');
      const result = await this.postPublic({ 
        method: 'login', 
        params: [email, password] 
      });

      if (result.result) {
        const user: User = {
          id: result.result.id || result.result._id,
          email: result.result.email,
          token: result.result.token,
          role: result.result.role, // 支持role字段
          createdAt: result.result.createdAt,
          verified: result.result.verified
        };

        console.log('✅ UserService: 登录API成功，开始保存用户信息');
        
        // 先设置当前用户（避免竞争条件）
        this.currentUser = user;
        
        // 顺序执行异步操作，避免并发问题
        try {
          await this.saveUserToStorage(user);
          console.log('✅ UserService: 用户信息保存完成');
        } catch (storageError) {
          console.error('⚠️ UserService: 保存用户信息失败，但继续登录流程:', storageError);
        }

        // 最后启动token刷新定时器
        try {
          this.startTokenRefreshInterval();
          console.log('✅ UserService: Token刷新定时器已启动');
        } catch (timerError) {
          console.error('⚠️ UserService: 启动定时器失败:', timerError);
        }

        console.log('✅ UserService: 登录流程完全完成');
        return {
          success: true,
          data: user,
          message: '登录成功'
        };
      } else {
        throw new Error(result.error || '登录失败');
      }
    } catch (error) {
      console.error('❌ UserService: 登录失败:', error);
      return {
        success: false,
        error: error.message || '登录失败，请检查邮箱和密码'
      };
    }
  }

  /**
   * 用户注册
   */
  async register({ email, password, repeatPassword, captcha }: RegisterRequest): Promise<AuthResponse> {
    try {
      if (password !== repeatPassword) {
        return {
          success: false,
          error: '两次密码输入不一致'
        };
      }

      console.log('🚀 开始注册流程...');
      const result = await this.postPublic({ 
        method: 'register', 
        params: [email, password, repeatPassword, "chainalert"],
        captcha 
      });

      console.log('📋 注册API返回结果:', JSON.stringify(result, null, 2));

      if (result.result) {
        console.log('✅ 注册成功，用户需要邮箱验证');
        console.log('🔔 即将显示注册成功提示...');
        // 注册成功后，不管后端返回什么，都要求用户先激活账户
        // 不保存用户信息，不启动登录状态
        return {
          success: true,
          message: '注册成功！请检查您的邮箱，点击验证链接完成账户激活。'
        };
      } else {
        console.log('❌ 注册失败:', result.error);
        throw new Error(result.error || '注册失败');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: error.message || '注册失败，请稍后重试'
      };
    }
  }

  /**
   * 激活账户
   */
  async activate(userId: string): Promise<AuthResponse> {
    try {
      const result = await this.postPublic({ 
        method: 'activate', 
        params: [userId] 
      });

      if (result.result) {
        return {
          success: true,
          message: '账户激活成功'
        };
      } else {
        throw new Error(result.error || '激活失败');
      }
    } catch (error) {
      console.error('Activation failed:', error);
      return {
        success: false,
        error: error.message || '激活失败，请检查激活链接'
      };
    }
  }

  /**
   * 验证并更新令牌
   */
  async verifyAndRenewToken(token: string): Promise<VerifyTokenResponse> {
    try {
      console.log('🔍 UserService: === verifyAndRenewToken 开始 ===');
      console.log('🔍 UserService: 验证token:', token ? 'exists' : 'null');
      
      const result = await this.postSecure({ 
        method: 'verifyAndRenew', 
        params: [token], // ✅ 正确：将token作为参数传递
        token 
      });

      console.log('🔍 UserService: API返回结果:', result ? 'has result' : 'no result');
      console.log('🔍 UserService: API result.result exists:', !!result?.result);

      if (result.result) {
        console.log('🔍 UserService: 构建用户对象...');
        const user: User = {
          id: result.result.user_id || result.result.id || result.result._id,
          email: result.result.email,
          token: result.result.token || token, // 使用新token或原token
          role: result.result.role, // 支持role字段
          createdAt: result.result.createdAt,
          verified: result.result.verified || true // API返回的用户应该是已验证的
        };

        console.log('🔍 UserService: 用户对象构建完成:', user.email);
        console.log('🔍 UserService: 保存用户信息到本地存储...');
        // 更新本地存储的用户信息
        await this.saveUserToStorage(user);
        this.currentUser = user;

        console.log('✅ UserService: Token验证成功');
        return {
          success: true,
          data: user
        };
      } else {
        const errorMsg = result.error || 'Token验证失败';
        console.log('❌ UserService: Token验证失败，错误:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('❌ UserService: Token verification failed:', error);
      return {
        success: false,
        error: error.message || 'Token验证失败'
      };
    } finally {
      console.log('🔍 UserService: === verifyAndRenewToken 结束 ===');
    }
  }

  /**
   * 登出 - 直接复制UserManager.js的方式
   */
  async logout(): Promise<void> {
    try {
      console.log('🔓 UserService: === logout 开始 ===');
      console.log('🔓 UserService: 调用栈信息:');
      console.trace('Logout called from:');
      
      console.log('🔓 UserService: 开始登出，清除本地存储');
      
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        // Web环境：直接使用localStorage，与UserManager.js一致
        localStorage.removeItem("userToken");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userRole");
        console.log('🔓 UserService: Web环境本地存储已清除');
      } else {
        // 移动端：使用AsyncStorage
        await AsyncStorage.removeItem("userToken");
        await AsyncStorage.removeItem("userEmail");
        await AsyncStorage.removeItem("userRole");
        console.log('🔓 UserService: 移动端AsyncStorage已清除');
      }
      
      console.log('🔓 UserService: 清除内存中的用户信息');
      // 清除内存中的用户信息
      this.currentUser = null;
      
      console.log('🔓 UserService: 停止token刷新定时器');
      // 停止token刷新定时器
      this.stopTokenRefreshInterval();
      
      console.log('✅ UserService: 用户登出成功');
    } catch (error) {
      console.error('❌ UserService: 登出失败:', error);
    } finally {
      console.log('🔓 UserService: === logout 结束 ===');
    }
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * 获取当前用户的角色
   */
  getCurrentUserRole(): string | null {
    return this.currentUser?.role || null;
  }

  /**
   * 检查当前用户是否是管理员
   */
  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  /**
   * 检查登录状态 - 直接复制UserManager.js的方式
   */
  async checkLoginStatus(): Promise<User | null> {
    try {
      console.log('🔍 UserService: === checkLoginStatus 开始 ===');
      let token: string | null = null;
      let email: string | null = null;

      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        // Web环境：直接使用localStorage，与UserManager.js一致
        token = localStorage.getItem("userToken");
        email = localStorage.getItem("userEmail");
        console.log('🔍 UserService: Web环境读取存储 - token exists:', !!token, 'email exists:', !!email);
      } else {
        // 移动端：使用AsyncStorage
        token = await AsyncStorage.getItem("userToken");
        email = await AsyncStorage.getItem("userEmail");
        console.log('🔍 UserService: 移动端读取存储 - token exists:', !!token, 'email exists:', !!email);
      }

      console.log('🔍 UserService: 检查登录状态 - token:', token ? 'exists' : 'null', 'email:', email ? 'exists' : 'null');

      if (token && email) {
        try {
          console.log('🔍 UserService: 有token和email，开始验证token...');
          // 验证token是否仍然有效
          const verifyResult = await this.verifyAndRenewToken(token);
          
          console.log('🔍 UserService: Token验证结果:', verifyResult.success);
          
          if (verifyResult.success && verifyResult.data) {
            this.currentUser = verifyResult.data;
            this.startTokenRefreshInterval();
            console.log('✅ UserService: 登录状态检查成功，用户:', verifyResult.data.email);
            return verifyResult.data;
          } else {
            // Token无效，但先尝试使用缓存的用户信息，而不是立即登出
            console.log('⚠️ UserService: Token验证失败，错误:', verifyResult.error);
            
            // 如果有缓存的用户信息，暂时使用它，给用户一个宽限期
            if (this.currentUser && this.currentUser.email === email) {
              console.log('🔄 UserService: 使用缓存的用户信息，避免立即登出');
              return this.currentUser;
            }
            
            // 如果没有缓存或缓存不匹配，才清除登录状态
            console.log('⚠️ UserService: 清除登录状态');
            await this.logout();
            return null;
          }
        } catch (verifyError: any) {
          console.log('❌ UserService: Token验证异常:', verifyError.message);
          // 如果是token过期错误，静默处理（不要向上抛出错误）
          if (verifyError.message && verifyError.message.includes('登录已过期')) {
            console.log('⚠️ UserService: Token已过期，自动清除登录状态');
            await this.logout();
            return null;
          } else {
            // 其他验证错误，重新抛出
            console.log('❌ UserService: 其他验证错误，重新抛出');
            throw verifyError;
          }
        }
      } else {
        console.log('ℹ️ UserService: 缺少必要的登录信息 (首次访问或未登录)');
        return null;
      }
    } catch (error) {
      console.error('❌ UserService: 检查登录状态失败:', error);
      return null;
    } finally {
      console.log('🔍 UserService: === checkLoginStatus 结束 ===');
    }
  }

  /**
   * 保存用户信息到本地存储 - 直接复制UserManager.js的方式
   */
  private async saveUserToStorage(user: User): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        // Web环境：直接使用localStorage，与UserManager.js一致
        localStorage.setItem("userToken", user.token);
        localStorage.setItem("userEmail", user.email);
        if (user.role) {
          localStorage.setItem("userRole", user.role);
        }
        console.log('✅ UserService: 用户信息已保存到localStorage (Web)');
      } else {
        // 移动端：使用AsyncStorage，但添加超时保护
        console.log('💾 UserService: 开始保存到AsyncStorage (移动端)');
        
        // 使用Promise.race添加超时保护，防止AsyncStorage操作卡死
        const saveWithTimeout = (key: string, value: string) => {
          return Promise.race([
            AsyncStorage.setItem(key, value),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`AsyncStorage.setItem timeout for ${key}`)), 5000)
            )
          ]);
        };
        
        const savePromises = [
          saveWithTimeout("userToken", user.token),
          saveWithTimeout("userEmail", user.email)
        ];
        
        if (user.role) {
          savePromises.push(saveWithTimeout("userRole", user.role));
        }
        
        await Promise.all(savePromises);
        
        console.log('✅ UserService: 用户信息已保存到AsyncStorage (移动端)');
      }
    } catch (error) {
      console.error('❌ UserService: 保存用户到存储失败:', error);
      // 不要抛出错误，允许登录流程继续
    }
  }

  /**
   * 启动token刷新定时器
   */
  private startTokenRefreshInterval(): void {
    // 清除现有定时器
    this.stopTokenRefreshInterval();

    // 每5分钟刷新一次token
    this.tokenRefreshInterval = setInterval(async () => {
      try {
        if (this.currentUser?.token) {
          console.log('🔄 UserService: 开始定时刷新token...');
          const result = await this.verifyAndRenewToken(this.currentUser.token);
          
          if (!result.success) {
            console.log('❌ UserService: Token刷新失败，自动登出');
            await this.logout();
          } else {
            console.log('✅ UserService: Token刷新成功');
          }
        } else {
          console.log('⚠️ UserService: 没有当前用户或token，停止定时器');
          this.stopTokenRefreshInterval();
        }
      } catch (error) {
        console.error('❌ UserService: Token刷新定时器异常:', error);
        // 定时器出错时，停止定时器并登出
        this.stopTokenRefreshInterval();
        await this.logout();
      }
    }, 5 * 60 * 1000); // 5分钟

    console.log('🔄 UserService: Token刷新定时器已启动 (5分钟间隔)');
  }

  /**
   * 停止token刷新定时器
   */
  private stopTokenRefreshInterval(): void {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
      console.log('🔄 Token refresh interval stopped');
    }
  }

  /**
   * 是否已登录
   */
  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  /**
   * 获取当前用户的token - 直接复制UserManager.js的方式
   */
  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        // Web环境：直接使用localStorage，与UserManager.js一致
        return localStorage.getItem("userToken");
      } else {
        // 移动端：使用AsyncStorage
        return await AsyncStorage.getItem("userToken");
      }
    } catch (error) {
      console.error('❌ UserService: 获取token失败:', error);
      return null;
    }
  }

  /**
   * Google登录成功后保存用户信息
   * 这是一个公共方法，供Google登录流程使用
   */
  async loginWithGoogleUser(user: User): Promise<AuthResponse> {
    try {
      console.log('✅ UserService: 开始处理Google登录用户保存');
      
      // 设置当前用户
      this.currentUser = user;
      
      // 保存用户信息到本地存储
      await this.saveUserToStorage(user);
      console.log('✅ UserService: Google用户信息保存完成');
      
      // 启动token刷新定时器
      this.startTokenRefreshInterval();
      console.log('✅ UserService: Token刷新定时器已启动');
      
      return {
        success: true,
        data: user,
        message: 'Google登录成功'
      };
    } catch (error: any) {
      console.error('❌ UserService: Google登录用户保存失败:', error);
      return {
        success: false,
        error: error.message || 'Google登录保存失败'
      };
    }
  }

  /**
   * 检查注册状态
   */
  async checkRegisterStatus(email: string): Promise<RegisterStatusResponse> {
    try {
      console.log('🔍 检查注册状态:', email);
      const result = await this.postPublic({
        method: 'checkRegister',
        params: [email]
      });

      if (result.result) {
        return {
          success: true,
          status: result.result.status
        };
      } else {
        throw new Error(result.error || '检查注册状态失败');
      }
    } catch (error) {
      console.error('Check register status failed:', error);
      return {
        success: false,
        error: error.message || '检查注册状态失败'
      };
    }
  }

  /**
   * 获取重发状态
   */
  async getResendStatus(email: string): Promise<ResendStatusResponse> {
    try {
      console.log('📧 获取重发状态:', email);
      const result = await this.postPublic({
        method: 'getResendStatus',
        params: [email]
      });

      if (result.result) {
        return {
          success: true,
          email: result.result.email,
          registrationStatus: result.result.registrationStatus,
          remainingTime: result.result.remainingTime || 0,
          canResend: result.result.canResend || false
        };
      } else {
        throw new Error(result.error || '获取重发状态失败');
      }
    } catch (error) {
      console.error('Get resend status failed:', error);
      return {
        success: false,
        error: error.message || '获取重发状态失败'
      };
    }
  }

  /**
   * 重发激活邮件
   */
  async resendEmail(email: string): Promise<ResendEmailResponse> {
    try {
      console.log('📬 重发激活邮件:', email);
      const result = await this.postPublic({
        method: 'resendEmail',
        params: [email]
      });

      if (result.result) {
        return {
          success: true,
          status: result.result.status,
          message: result.result.message || '激活邮件已重新发送',
          email: result.result.email,
          remainingTime: result.result.remainingTime || 120
        };
      } else {
        throw new Error(result.error || '重发激活邮件失败');
      }
    } catch (error) {
      console.error('Resend email failed:', error);
      return {
        success: false,
        error: error.message || '重发激活邮件失败'
      };
    }
  }
}

export const userService = UserService.getInstance();
export default userService;