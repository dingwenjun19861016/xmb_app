import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import apiService from './APIService';
import configService from './ConfigService';
import GoogleOAuthDiagnostics from '../utils/GoogleOAuthDiagnostics';

/**
 * Web平台Google登录实现
 */
class WebGoogleService {
  private clientId: string | null = null;
  private googleAPI: any = null;
  private isGoogleAPILoaded = false;

  /**
   * 动态加载Google Identity Services API
   */
  private async loadGoogleAPI(): Promise<boolean> {
    // 检查是否在Web环境且document对象存在
    if (Platform.OS !== 'web' || typeof document === 'undefined' || typeof window === 'undefined') {
      console.warn('⚠️ Google API只能在Web环境中加载');
      return false;
    }

    if (this.isGoogleAPILoaded && window.google) {
      return true;
    }

    return new Promise((resolve) => {
      // 检查是否已经加载过Google API
      if (window.google) {
        this.isGoogleAPILoaded = true;
        resolve(true);
        return;
      }

      // 动态创建script标签加载Google Identity Services
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('✅ Google Identity Services API加载成功');
        this.isGoogleAPILoaded = true;
        resolve(true);
      };
      
      script.onerror = () => {
        console.error('❌ Google Identity Services API加载失败');
        resolve(false);
      };

      document.head.appendChild(script);
    });
  }

  async configureGoogleSignIn(): Promise<{ success: boolean; clientId?: string; error?: string }> {
    try {
      let clientId = await configService.getConfig('GOOGLE_CLIENT_ID');
      
      // 如果配置值为mock或无效值，使用默认客户端ID
      if (!clientId || clientId === 'mock-google-client-id' || clientId.startsWith('mock-')) {
        clientId = '516014443439-fcrkkf7b3b2q3b3umatovipb4dg7fitn.apps.googleusercontent.com';
      }
      
      if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
        console.error('❌ Google客户端ID格式无效，运行诊断...');
        await GoogleOAuthDiagnostics.displayDiagnostics();
        return {
          success: false,
          error: 'Google客户端ID格式无效，请联系管理员检查配置'
        };
      }

      // 加载Google API
      const apiLoaded = await this.loadGoogleAPI();
      if (!apiLoaded) {
        return {
          success: false,
          error: 'Google API加载失败，请检查网络连接'
        };
      }

      this.clientId = clientId;
      console.log('✅ Web Google登录配置成功，客户端ID:', `${clientId.substring(0, 20)}...`);
      
      return {
        success: true,
        clientId: clientId
      };
    } catch (error: any) {
      console.error('❌ Web Google登录配置失败:', error);
      await GoogleOAuthDiagnostics.displayDiagnostics();
      return {
        success: false,
        error: error.message || 'Google登录配置失败'
      };
    }
  }

  async signInWithGoogle(): Promise<{
    success: boolean;
    data?: {
      email: string;
      name: string;
      photo?: string;
      idToken: string;
      accessToken?: string;
    };
    error?: string;
  }> {
    try {
      if (!this.clientId) {
        const configResult = await this.configureGoogleSignIn();
        if (!configResult.success) {
          return {
            success: false,
            error: configResult.error
          };
        }
      }

      if (!window.google || !this.isGoogleAPILoaded) {
        return {
          success: false,
          error: 'Google API未加载，请刷新页面重试'
        };
      }

      return new Promise((resolve) => {
        try {
          // 使用简化的Google登录流程
          this.performSimpleGoogleLogin(resolve);
        } catch (error: any) {
          console.error('❌ Web Google登录初始化失败:', error);
          resolve({
            success: false,
            error: error.message || 'Google登录初始化失败'
          });
        }
      });

    } catch (error: any) {
      console.error('❌ Web Google登录失败:', error);
      return {
        success: false,
        error: error.message || 'Google登录失败'
      };
    }
  }

  /**
   * 执行简化的Google登录
   */
  private performSimpleGoogleLogin(resolve: (value: any) => void) {
    try {
      // 检查Web环境和document对象
      if (Platform.OS !== 'web' || typeof document === 'undefined' || typeof window === 'undefined') {
        console.error('❌ Google登录只能在Web环境中使用');
        resolve({
          success: false,
          error: 'Google登录只能在Web环境中使用'
        });
        return;
      }

      // 使用Google Identity Services的renderButton作为主要方法
      const buttonContainer = document.createElement('div');
      buttonContainer.style.position = 'absolute';
      buttonContainer.style.top = '-9999px';
      buttonContainer.style.left = '-9999px';
      document.body.appendChild(buttonContainer);

      // 初始化Google Identity Services（禁用FedCM）
      window.google.accounts.id.initialize({
        client_id: this.clientId!,
        callback: (response: any) => {
          // 清理元素
          document.body.removeChild(buttonContainer);
          
          this.handleGoogleResponse(response, resolve);
        },
        // 明确禁用FedCM
        use_fedcm_for_prompt: false,
      });

      // 渲染按钮
      window.google.accounts.id.renderButton(buttonContainer, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 250
      });

      // 自动点击按钮
      setTimeout(() => {
        const button = buttonContainer.querySelector('[role="button"]') as HTMLElement;
        if (button) {
          button.click();
        } else {
          // 如果按钮渲染失败，使用prompt方法
          window.google.accounts.id.prompt();
        }
      }, 100);

    } catch (error: any) {
      console.error('❌ performSimpleGoogleLogin失败:', error);
      resolve({
        success: false,
        error: error.message || '简化Google登录失败'
      });
    }
  }

  /**
   * 处理Google登录响应
   */
  private handleGoogleResponse(response: any, resolve: (value: any) => void) {
    try {
      if (!response.credential) {
        resolve({
          success: false,
          error: 'Google登录失败，未获取到凭证'
        });
        return;
      }

      const payload = this.parseJWT(response.credential);
      
      if (!payload) {
        resolve({
          success: false,
          error: '无法解析Google登录信息'
        });
        return;
      }

      console.log('✅ Web Google登录成功:', payload);

      resolve({
        success: true,
        data: {
          email: payload.email,
          name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
          photo: payload.picture,
          idToken: response.credential,
          accessToken: undefined,
        }
      });

    } catch (error: any) {
      console.error('❌ handleGoogleResponse失败:', error);
      resolve({
        success: false,
        error: error.message || 'Google登录响应处理失败'
      });
    }
  }

  /**
   * 解析JWT token获取用户信息
   */
  private parseJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('❌ JWT解析失败:', error);
      return null;
    }
  }
}

/**
 * 移动端Google登录实现
 */
class NativeGoogleService {
  private isConfigured = false;
  private currentClientId: string | null = null;

  async configureGoogleSignIn(): Promise<{ success: boolean; clientId?: string; error?: string }> {
    try {
      let clientId = await configService.getConfig('GOOGLE_CLIENT_ID');
      
      // 如果配置值为mock或无效值，使用默认客户端ID
      if (!clientId || clientId === 'mock-google-client-id' || clientId.startsWith('mock-')) {
        clientId = '516014443439-fcrkkf7b3b2q3b3umatovipb4dg7fitn.apps.googleusercontent.com';
      }
      
      if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
        console.error('❌ Google客户端ID格式无效，运行诊断...');
        await GoogleOAuthDiagnostics.displayDiagnostics();
        return {
          success: false,
          error: 'Google客户端ID格式无效，请联系管理员检查配置'
        };
      }

      GoogleSignin.configure({
        webClientId: clientId,
        offlineAccess: true,
        hostedDomain: '',
        forceCodeForRefreshToken: true,
        scopes: ['email', 'profile', 'openid'],
      });

      this.isConfigured = true;
      this.currentClientId = clientId;
      
      return {
        success: true,
        clientId: clientId
      };
    } catch (error: any) {
      console.error('❌ Native Google登录配置失败:', error);
      await GoogleOAuthDiagnostics.displayDiagnostics();
      return {
        success: false,
        error: error.message || 'Google登录配置失败'
      };
    }
  }

  async signInWithGoogle(): Promise<{
    success: boolean;
    data?: {
      email: string;
      name: string;
      photo?: string;
      idToken: string;
      accessToken?: string;
    };
    error?: string;
  }> {
    try {
      if (!this.isConfigured) {
        const configResult = await this.configureGoogleSignIn();
        if (!configResult.success) {
          return {
            success: false,
            error: configResult.error
          };
        }
      }

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const userInfo = await GoogleSignin.signIn();
      
      console.log('✅ Native Google登录成功');

      // 修正的验证逻辑：根据实际返回的数据结构进行验证
      if (!userInfo) {
        console.error('❌ Google登录返回的数据为空:', userInfo);
        return {
          success: false,
          error: 'Google登录返回的数据为空'
        };
      }

      // 根据实际日志，数据结构是 { type: "success", data: { user: {...}, idToken: "...", ... } }
      let actualData = userInfo;
      let user, email, name, photo, idToken;

      // 如果返回的是 { type: "success", data: {...} } 格式
      if (userInfo.type === 'success' && userInfo.data) {
        actualData = userInfo.data;
        user = actualData.user;
        idToken = actualData.idToken;
      } else {
        // 原始格式
        user = userInfo.user || userInfo;
        idToken = userInfo.idToken;
      }

      // 解析用户信息
      if (user) {
        email = user.email;
        name = user.name || user.givenName || user.displayName || `${user.givenName || ''} ${user.familyName || ''}`.trim();
        photo = user.photo || user.photoURL;
      }

      console.log('🔍 解析用户信息:', {
        email,
        name,
        hasIdToken: !!idToken
      });

      if (!email) {
        console.error('❌ 无法获取用户邮箱信息');
        return {
          success: false,
          error: '无法获取用户邮箱信息，请确保授权了邮箱权限'
        };
      }

      return {
        success: true,
        data: {
          email: email,
          name: name || '未知用户',
          photo: photo,
          idToken: idToken || '',
          accessToken: actualData.accessToken || actualData.serverAuthCode,
        }
      };
    } catch (error: any) {
      console.error('❌ Native Google登录失败:', error);

      let errorMessage = 'Google登录失败';

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = '用户取消了登录';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errorMessage = '登录正在进行中';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play服务不可用';
      } else {
        errorMessage = error.message || 'Google登录失败';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

/**
 * Google登录服务 - 根据平台选择实现
 */
class GoogleService {
  private webService = new WebGoogleService();
  private nativeService = new NativeGoogleService();

  /**
   * 配置Google登录
   */
  async configureGoogleSignIn(): Promise<{ success: boolean; clientId?: string; error?: string }> {
    if (Platform.OS === 'web') {
      return this.webService.configureGoogleSignIn();
    } else {
      return this.nativeService.configureGoogleSignIn();
    }
  }

  /**
   * 执行Google登录
   */
  async signInWithGoogle(): Promise<{
    success: boolean;
    data?: {
      email: string;
      name: string;
      photo?: string;
      idToken: string;
      accessToken?: string;
    };
    error?: string;
  }> {
    if (Platform.OS === 'web') {
      return this.webService.signInWithGoogle();
    } else {
      return this.nativeService.signInWithGoogle();
    }
  }

  /**
   * 调用后端Google登录API
   */
  async authenticateWithBackend(googleToken: string, role: string = 'chainalert'): Promise<{
    success: boolean;
    data?: {
      email: string;
      role: string;
      token: string;
      isNewUser: boolean;
    };
    error?: string;
  }> {
    try {
      console.log('🔐 发送Google登录验证到后端...');
      
      const result = await apiService.call('googleLogin', [googleToken, role]);
      
      console.log('✅ 后端Google验证成功:', result);
      
      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('❌ 后端Google验证失败:', error);
      
      let errorMessage = '登录验证失败';
      
      if (error.message) {
        if (error.message.includes('33070')) {
          errorMessage = 'Google配置错误，请联系管理员';
        } else if (error.message.includes('33071')) {
          errorMessage = 'Google邮箱未验证，请先验证邮箱';
        } else if (error.message.includes('33072')) {
          errorMessage = 'Google认证失败，请重试';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 完整的Google登录流程
   */
  async performGoogleLogin(): Promise<{
    success: boolean;
    data?: {
      email: string;
      role: string;
      token: string;
      isNewUser: boolean;
    };
    error?: string;
  }> {
    try {
      const signInResult = await this.signInWithGoogle();
      
      if (!signInResult.success || !signInResult.data) {
        return {
          success: false,
          error: signInResult.error || 'Google登录失败'
        };
      }

      const backendResult = await this.authenticateWithBackend(
        signInResult.data.idToken,
        'chainalert'
      );

      if (!backendResult.success) {
        return {
          success: false,
          error: backendResult.error || '后端验证失败'
        };
      }

      console.log('🎉 Google登录完整流程成功');
      
      return {
        success: true,
        data: backendResult.data
      };
    } catch (error: any) {
      console.error('❌ Google登录完整流程失败:', error);
      return {
        success: false,
        error: error.message || 'Google登录失败，请稍后重试'
      };
    }
  }

  /**
   * Google登出
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      if (Platform.OS === 'web') {
        // Web端Google登出 - 使用Google Identity Services
        if (window.google && window.google.accounts && window.google.accounts.id) {
          window.google.accounts.id.cancel();
        }
        console.log('✅ Web Google登出成功');
        return { success: true };
      } else {
        await GoogleSignin.signOut();
        console.log('✅ Native Google登出成功');
        return { success: true };
      }
    } catch (error: any) {
      console.error('❌ Google登出失败:', error);
      return {
        success: false,
        error: error.message || 'Google登出失败'
      };
    }
  }

  /**
   * 检查是否已登录Google
   */
  async isSignedIn(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // Web端暂时无法检查登录状态，Google Identity Services不提供此功能
        return false;
      } else {
        return await GoogleSignin.isSignedIn();
      }
    } catch (error) {
      console.error('❌ 检查Google登录状态失败:', error);
      return false;
    }
  }

  /**
   * 运行Google OAuth配置诊断
   */
  async runDiagnostics(): Promise<void> {
    await GoogleOAuthDiagnostics.displayDiagnostics();
  }
}

// 创建单例实例
export const googleService = new GoogleService();
export default googleService;
