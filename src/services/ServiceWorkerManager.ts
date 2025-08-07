// Service Worker 注册和管理
class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  
  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  /**
   * 注册Service Worker
   */
  async register(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('🔍 ServiceWorker: 当前环境不支持Service Worker');
      return;
    }

    try {
      console.log('🔄 ServiceWorker: 开始注册...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // 禁用缓存，确保每次都检查更新
      });

      console.log('✅ ServiceWorker: 注册成功', registration);

      // 监听更新
      registration.addEventListener('updatefound', () => {
        console.log('🔄 ServiceWorker: 发现更新');
        this.handleUpdateFound(registration);
      });

      // 检查是否已经有等待的SW
      if (registration.waiting) {
        console.log('🔄 ServiceWorker: 发现等待中的Service Worker');
        this.showUpdatePrompt();
      }

      // 定期检查更新
      this.startUpdateCheck(registration);

    } catch (error) {
      console.error('❌ ServiceWorker: 注册失败', error);
    }
  }

  /**
   * 处理发现更新
   */
  private handleUpdateFound(registration: ServiceWorkerRegistration): void {
    const newWorker = registration.installing;
    
    if (newWorker) {
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // 有新版本可用
            console.log('🆕 ServiceWorker: 新版本已安装，等待激活');
            this.showUpdatePrompt();
          } else {
            // 首次安装
            console.log('✅ ServiceWorker: 首次安装完成');
          }
        }
      });
    }
  }

  /**
   * 显示更新提示
   */
  private showUpdatePrompt(): void {
    // 触发全局事件，让应用显示更新提示
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  }

  /**
   * 开始定期检查更新
   */
  private startUpdateCheck(registration: ServiceWorkerRegistration): void {
    // 每30分钟检查一次更新
    setInterval(() => {
      console.log('🔄 ServiceWorker: 定期检查更新...');
      registration.update();
    }, 30 * 60 * 1000);

    // 页面可见时也检查更新
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          console.log('🔄 ServiceWorker: 页面重新可见，检查更新...');
          registration.update();
        }
      });
    }
  }

  /**
   * 激活等待的Service Worker
   */
  async activateUpdate(): Promise<void> {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  /**
   * 完全重置Service Worker
   */
  async reset(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      // 注销所有Service Worker
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('🗑️ ServiceWorker: 已注销', registration);
      }

      // 清除所有缓存
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log('🗑️ Cache: 清除缓存', cacheName);
            return caches.delete(cacheName);
          })
        );
      }

      console.log('✅ ServiceWorker: 重置完成');
    } catch (error) {
      console.error('❌ ServiceWorker: 重置失败', error);
    }
  }
}

// 自动初始化
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const swManager = ServiceWorkerManager.getInstance();
  
  // 页面加载完成后注册
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      swManager.register();
    });
  } else {
    swManager.register();
  }

  // 监听更新事件
  window.addEventListener('sw-update-available', () => {
    console.log('🔔 ServiceWorker: 收到更新通知');
    // 这里可以触发应用内的更新提示
  });
}

export default ServiceWorkerManager.getInstance();
