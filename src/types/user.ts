/**
 * 用户相关类型定义
 */

export interface User {
  id: string;
  email: string;
  token: string;
  username?: string;
  role?: string;
  verified?: boolean;
  provider?: string; // 登录提供商：'local' | 'google' 等
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  repeatPassword: string;
  captcha: string;
}

export interface AuthResponse {
  success: boolean;
  data?: User;
  message?: string;
  error?: string;
}

export interface CaptchaResponse {
  success: boolean;
  captchaImage?: string;
  error?: string;
}

export interface VerifyTokenResponse {
  success: boolean;
  data?: User;
  error?: string;
}

// 注册状态检查响应
export interface RegisterStatusResponse {
  success: boolean;
  status?: number; // 1=已激活, 2=未激活, 3=未注册
  error?: string;
}

// 重发状态响应
export interface ResendStatusResponse {
  success: boolean;
  email?: string;
  registrationStatus?: number;
  remainingTime?: number; // 剩余秒数
  canResend?: boolean;
  error?: string;
}

// 重发邮件响应
export interface ResendEmailResponse {
  success: boolean;
  status?: string;
  message?: string;
  email?: string;
  remainingTime?: number; // 重发后的新倒计时秒数
  error?: string;
}
