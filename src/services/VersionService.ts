import { Platform } from 'react-native';
import { getWebAppURL } from '../config/apiConfig';

interface VersionInfo {
  current: string;
  latest: string;
  updateAvailable: boolean;
  lastCheck: number;
}

class VersionService {
  private static instance: VersionService;
  private readonly STORAGE_KEY = 'app_version_info';
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // 5分钟检查一次
  private readonly CURRENT_VERSION = '1.0.8'; // 与SW中的版本保持一致
  
  static getInstance(): VersionService {
    if (!VersionService.instance) {
      VersionService.instance = new VersionService();
    }
    return VersionService.instance;
  }

  /**
   * 获取当前应用版本
   */
  getCurrentVersion(): string {
    return this.CURRENT_VERSION;
  }

  /**
   * 检查是否有新版本可用
   */
  async checkForUpdates(force: boolean = false): Promise<VersionInfo> {
    try {
      const stored = this.getStoredVersionInfo();
      const now = Date.now();
      
      // 如果不是强制检查且距离上次检查时间太短，返回缓存结果
      if (!force && stored && (now - stored.lastCheck) < this.CHECK_INTERVAL) {
        console.log('🔍 VersionService: 使用缓存的版本信息');
        return stored;
      }

      console.log('🔍 VersionService: 检查服务器版本...');
      
      let latestVersion = this.CURRENT_VERSION;
      let updateAvailable = false;

      if (Platform.OS === 'web') {
        // Web平台：检查Service Worker版本
        latestVersion = await this.checkServiceWorkerVersion();
        updateAvailable = latestVersion !== this.CURRENT_VERSION;
      } else {
        // 移动端：可以调用API检查版本
        // const serverVersion = await this.fetchServerVersion();
        // latestVersion = serverVersion;
        // updateAvailable = this.compareVersions(serverVersion, this.CURRENT_VERSION) > 0;
      }

      const versionInfo: VersionInfo = {
        current: this.CURRENT_VERSION,
        latest: latestVersion,
        updateAvailable,
        lastCheck: now
      };

      // 保存到本地存储
      this.saveVersionInfo(versionInfo);

      console.log('🔍 VersionService: 版本检查完成', versionInfo);
      return versionInfo;

    } catch (error) {
      console.error('❌ VersionService: 版本检查失败', error);
      
      // 返回默认版本信息
      return {
        current: this.CURRENT_VERSION,
        latest: this.CURRENT_VERSION,
        updateAvailable: false,
        lastCheck: Date.now()
      };
    }
  }

  /**
   * 检查Service Worker版本
   */
  private async checkServiceWorkerVersion(): Promise<string> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return this.CURRENT_VERSION;
    }

    try {
      // 检查是否有等待的Service Worker
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration && registration.waiting) {
        console.log('🔍 VersionService: 发现待更新的Service Worker');
        return 'pending-update'; // 表示有更新等待
      }

      // 尝试获取Service Worker的版本信息
      if (registration && registration.active) {
        return new Promise((resolve) => {
          const messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = (event) => {
            resolve(event.data.version || this.CURRENT_VERSION);
          };
          
          registration.active?.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
          
          // 超时处理
          setTimeout(() => resolve(this.CURRENT_VERSION), 2000);
        });
      }

      return this.CURRENT_VERSION;
    } catch (error) {
      console.error('❌ VersionService: 检查SW版本失败', error);
      return this.CURRENT_VERSION;
    }
  }

  /**
   * 从服务器获取最新版本（可选实现）
   */
  private async fetchServerVersion(): Promise<string> {
    try {
      const response = await fetch(getWebAppURL('api/version'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache'
      });

      if (response.ok) {
        const data = await response.json();
        return data.version || this.CURRENT_VERSION;
      }

      return this.CURRENT_VERSION;
    } catch (error) {
      console.warn('⚠️ VersionService: 无法获取服务器版本', error);
      return this.CURRENT_VERSION;
    }
  }

  /**
   * 比较版本号
   */
  private compareVersions(a: string, b: string): number {
    if (a === 'pending-update') return 1;
    if (b === 'pending-update') return -1;
    
    const aDate = this.extractDateFromVersion(a);
    const bDate = this.extractDateFromVersion(b);
    
    return aDate - bDate;
  }

  /**
   * 从版本字符串中提取日期
   */
  private extractDateFromVersion(version: string): number {
    const match = version.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return new Date(match[1]).getTime();
    }
    return 0;
  }

  /**
   * 获取存储的版本信息
   */
  private getStoredVersionInfo(): VersionInfo | null {
    try {
      if (typeof window === 'undefined') return null;
      
      const stored = window.localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('⚠️ VersionService: 读取存储版本信息失败', error);
      return null;
    }
  }

  /**
   * 保存版本信息到本地存储
   */
  private saveVersionInfo(versionInfo: VersionInfo): void {
    try {
      if (typeof window === 'undefined') return;
      
      window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(versionInfo));
    } catch (error) {
      console.warn('⚠️ VersionService: 保存版本信息失败', error);
    }
  }

  /**
   * 强制更新应用
   */
  async forceUpdate(): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        // 1. 注销Service Worker
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        }

        // 2. 清除所有缓存
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        }

        // 3. 清除本地存储
        window.localStorage.clear();
        window.sessionStorage.clear();

        // 4. 强制刷新页面
        const timestamp = Date.now();
        window.location.replace(`${window.location.origin}${window.location.pathname}?v=${timestamp}`);
        
      } catch (error) {
        console.error('❌ VersionService: 强制更新失败', error);
        // fallback: 简单刷新
        window.location.reload();
      }
    }
  }

  /**
   * 激活等待中的Service Worker
   */
  async activateWaitingServiceWorker(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration && registration.waiting) {
        // 告知等待的SW跳过等待
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // 监听controllerchange事件，刷新页面
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      }
    } catch (error) {
      console.error('❌ VersionService: 激活SW失败', error);
    }
  }

  /**
   * 监听Service Worker更新
   */
  onServiceWorkerUpdate(callback: () => void): () => void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return () => {};
    }

    const handleUpdate = () => {
      console.log('🔄 VersionService: Service Worker更新检测到');
      callback();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleUpdate);

    // 返回清理函数
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleUpdate);
    };
  }
}

export default VersionService.getInstance();
