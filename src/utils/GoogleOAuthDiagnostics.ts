/**
 * Google OAuth 配置诊断工具
 * 用于检查和修复Google OAuth配置问题
 */

import { Platform } from 'react-native';
import configService from '../services/ConfigService';
import { domains } from '../config/apiConfig';

class GoogleOAuthDiagnostics {
  
  /**
   * 诊断Google OAuth配置问题
   */
  static async diagnoseConfig(): Promise<{
    status: 'success' | 'warning' | 'error';
    issues: string[];
    suggestions: string[];
    currentConfig: {
      clientId: string | null;
      platform: string;
      currentDomain: string;
      environment: string;
    };
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let status: 'success' | 'warning' | 'error' = 'success';

    // 获取当前配置
    const clientId = await configService.getConfig('GOOGLE_CLIENT_ID');
    const platform = Platform.OS;
    const currentDomain = Platform.OS === 'web' 
      ? (typeof window !== 'undefined' ? window.location.origin : 'unknown')
      : 'mobile';
    
    const environment = currentDomain.includes('localhost') ? 'development' : 'production';

    console.log('🔍 Google OAuth 配置诊断:', {
      clientId: clientId ? `${clientId.substring(0, 20)}...` : 'null',
      platform,
      currentDomain,
      environment
    });

    // 检查客户端ID是否存在
    if (!clientId) {
      issues.push('❌ Google客户端ID未配置');
      suggestions.push('请在数据库config集合中添加GOOGLE_CLIENT_ID配置');
      status = 'error';
    } else {
      // 检查客户端ID格式
      if (!clientId.endsWith('.googleusercontent.com')) {
        issues.push('⚠️ Google客户端ID格式可能有误');
        suggestions.push('确保使用正确的Google Web客户端ID（应以.googleusercontent.com结尾）');
        status = 'warning';
      }

      // 检查客户端ID长度
      if (clientId.length < 50) {
        issues.push('⚠️ Google客户端ID长度异常');
        suggestions.push('Google客户端ID通常较长，请检查是否完整');
        status = 'warning';
      }
    }

    // 检查平台特定配置
    if (Platform.OS === 'web') {
      // Web平台检查
      if (currentDomain.includes('localhost')) {
        issues.push('ℹ️ 使用开发环境域名 (localhost)');
        suggestions.push('确保在Google OAuth配置中添加了 http://localhost:8081 作为授权域名');
        if (status === 'success') status = 'warning';
      }

      // 检查HTTPS要求（生产环境）
      if (!currentDomain.includes('localhost') && !currentDomain.startsWith('https://')) {
        issues.push('❌ 生产环境必须使用HTTPS');
        suggestions.push('Google OAuth在生产环境中要求使用HTTPS');
        status = 'error';
      }
    }

    // 检查常见配置问题
    if (clientId && clientId.includes('YOUR_') || clientId.includes('REPLACE_')) {
      issues.push('❌ 客户端ID似乎是占位符');
      suggestions.push('请替换为真实的Google客户端ID');
      status = 'error';
    }

    return {
      status,
      issues,
      suggestions,
      currentConfig: {
        clientId,
        platform,
        currentDomain,
        environment
      }
    };
  }

  /**
   * 获取Google OAuth设置指南
   */
  static getSetupGuide(): {
    title: string;
    steps: string[];
    authorizedDomains: string[];
  } {
    return {
      title: 'Google OAuth 设置指南',
      steps: [
        '1. 访问 Google Cloud Console (https://console.cloud.google.com/)',
        '2. 选择或创建项目',
        '3. 启用 Google+ API 或 Google Identity',
        '4. 创建 OAuth 2.0 客户端ID（Web应用类型）',
        '5. 在授权的JavaScript源中添加允许的域名',
        '6. 在授权的重定向URI中添加允许的回调URL',
        '7. 复制客户端ID到应用配置中'
      ],
      authorizedDomains: [
        'http://localhost:8081 (开发环境)',
        'https://xmb.chainalert.me (生产环境)',
        'https://chainalert.me (主域名)'
      ]
    };
  }

  /**
   * 生成Google OAuth配置建议
   */
  static generateConfigSuggestions(currentDomain: string): {
    webClientId: string;
    authorizedJavaScriptOrigins: string[];
    authorizedRedirectURIs: string[];
  } {
    const isLocalhost = currentDomain.includes('localhost');
    
    return {
      webClientId: '你的Google客户端ID.apps.googleusercontent.com',
      authorizedJavaScriptOrigins: isLocalhost 
        ? ['http://localhost:8081', 'http://localhost:3000']
        : ['https://xmb.chainalert.me', 'https://chainalert.me'],
      authorizedRedirectURIs: isLocalhost
        ? ['http://localhost:8081/auth/callback', 'http://localhost:8081']
        : ['https://xmb.chainalert.me/auth/callback', 'https://xmb.chainalert.me']
    };
  }

  /**
   * 显示诊断结果
   */
  static async displayDiagnostics(): Promise<void> {
    console.log('\n=== Google OAuth 配置诊断 ===');
    
    const diagnosis = await this.diagnoseConfig();
    const guide = this.getSetupGuide();
    const suggestions = this.generateConfigSuggestions(diagnosis.currentConfig.currentDomain);

    console.log('\n📊 当前配置状态:', diagnosis.status.toUpperCase());
    console.log('🔧 当前配置:');
    console.log('  - 平台:', diagnosis.currentConfig.platform);
    console.log('  - 域名:', diagnosis.currentConfig.currentDomain);
    console.log('  - 环境:', diagnosis.currentConfig.environment);
    console.log('  - 客户端ID:', diagnosis.currentConfig.clientId ? '已配置' : '未配置');

    if (diagnosis.issues.length > 0) {
      console.log('\n⚠️ 发现的问题:');
      diagnosis.issues.forEach(issue => console.log(`  ${issue}`));
    }

    if (diagnosis.suggestions.length > 0) {
      console.log('\n💡 建议修复:');
      diagnosis.suggestions.forEach(suggestion => console.log(`  ${suggestion}`));
    }

    console.log('\n📋 设置指南:');
    guide.steps.forEach(step => console.log(`  ${step}`));

    console.log('\n🌍 推荐的授权域名:');
    guide.authorizedDomains.forEach(domain => console.log(`  ${domain}`));

    console.log('\n🔧 Google Console 配置建议:');
    console.log('  Web客户端ID格式:', suggestions.webClientId);
    console.log('  授权的JavaScript源:');
    suggestions.authorizedJavaScriptOrigins.forEach(origin => console.log(`    ${origin}`));
    console.log('  授权的重定向URI:');
    suggestions.authorizedRedirectURIs.forEach(uri => console.log(`    ${uri}`));

    console.log('\n=== 诊断完成 ===\n');
  }
}

export default GoogleOAuthDiagnostics;
