import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { getMainURL } from '../config/apiConfig';

// 远程图标缓存服务类
class RemoteIconService {
  private readonly BASE_URL = getMainURL('images/coin/');
  private readonly CACHE_DIR = FileSystem.cacheDirectory + 'coin-icons/';
  private readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天过期
  
  // 内存中的缓存映射
  private memoryCache = new Map<string, string>();
  
  // 正在下载的图标，避免重复下载
  private downloadingIcons = new Set<string>();

  constructor() {
    this.initCacheDirectory();
  }

  /**
   * 初始化缓存目录
   */
  private async initCacheDirectory() {
    try {
      if (Platform.OS !== 'web') {
        const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
        }
      }
    } catch (error) {
      console.warn('⚠️ RemoteIconService: Failed to init cache directory:', error);
    }
  }

  /**
   * 获取远程图标URL (不缓存，直接使用)
   * @param symbol 币种符号
   * @returns string 远程图标URL
   */
  getRemoteIconUrl(symbol: string): string {
    if (!symbol) {
      return this.getPlaceholderUrl();
    }
    
    const upperSymbol = symbol.toUpperCase();
    return `${this.BASE_URL}${upperSymbol}.png`;
  }

  /**
   * 获取币种图标URL，优先从缓存获取
   * @param symbol 币种符号
   * @returns Promise<string> 图标URL
   */
  async getIconUrl(symbol: string): Promise<string> {
    if (!symbol) {
      return this.getPlaceholderUrl();
    }

    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `icon_${upperSymbol}`;
    
    // 1. 检查内存缓存
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }

    // 2. Web环境直接返回远程URL
    if (Platform.OS === 'web') {
      const remoteUrl = `${this.BASE_URL}${upperSymbol}.png`;
      this.memoryCache.set(cacheKey, remoteUrl);
      return remoteUrl;
    }

    // 3. 移动端检查本地缓存
    const localPath = await this.getLocalCachedPath(upperSymbol);
    if (localPath) {
      this.memoryCache.set(cacheKey, localPath);
      return localPath;
    }

    // 4. 尝试下载并缓存图标
    const downloadedPath = await this.downloadAndCacheIcon(upperSymbol);
    if (downloadedPath) {
      this.memoryCache.set(cacheKey, downloadedPath);
      return downloadedPath;
    }

    // 5. 如果缓存失败，直接返回远程URL（iOS备用方案）
    console.log(`⚠️ RemoteIconService: Using remote URL as fallback for ${upperSymbol}`);
    const remoteUrl = `${this.BASE_URL}${upperSymbol}.png`;
    this.memoryCache.set(cacheKey, remoteUrl);
    return remoteUrl;
  }

  /**
   * 检查本地缓存是否存在且未过期
   * @param symbol 币种符号
   * @returns Promise<string | null> 本地缓存路径
   */
  private async getLocalCachedPath(symbol: string): Promise<string | null> {
    try {
      const fileName = `${symbol.toLowerCase()}.png`;
      const filePath = this.CACHE_DIR + fileName;
      
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        // 检查文件是否过期
        const modTime = fileInfo.modificationTime;
        if (modTime && (Date.now() - modTime * 1000) < this.CACHE_EXPIRY) {
          return filePath;
        } else {
          // 文件过期，删除
          await FileSystem.deleteAsync(filePath);
        }
      }
    } catch (error) {
      console.warn('⚠️ RemoteIconService: Failed to check local cache:', error);
    }
    return null;
  }

  /**
   * 下载并缓存图标
   * @param symbol 币种符号
   * @returns Promise<string | null> 下载后的本地路径
   */
  private async downloadAndCacheIcon(symbol: string): Promise<string | null> {
    const upperSymbol = symbol.toUpperCase();
    
    // 避免重复下载
    if (this.downloadingIcons.has(upperSymbol)) {
      return null;
    }

    this.downloadingIcons.add(upperSymbol);
    
    try {
      // 尝试多个可能的图标URL
      const possibleUrls = [
        `${this.BASE_URL}${upperSymbol}.png`,
        `${this.BASE_URL}${upperSymbol.toLowerCase()}.png`,
        `${this.BASE_URL}${symbol.toLowerCase()}.png`
      ];
      
      const fileName = `${symbol.toLowerCase()}.png`;
      const localPath = this.CACHE_DIR + fileName;
      
      for (const remoteUrl of possibleUrls) {
        try {
          console.log(`🔄 RemoteIconService: Trying to download ${remoteUrl}`);
          
          // 下载图标
          const downloadResult = await FileSystem.downloadAsync(remoteUrl, localPath);
          
          if (downloadResult.status === 200) {
            console.log(`✅ RemoteIconService: Downloaded icon for ${upperSymbol} from ${remoteUrl}`);
            return localPath;
          } else {
            console.warn(`⚠️ RemoteIconService: Failed to download from ${remoteUrl}, status: ${downloadResult.status}`);
          }
        } catch (urlError) {
          console.warn(`⚠️ RemoteIconService: Error downloading from ${remoteUrl}:`, urlError);
          continue;
        }
      }
      
      console.warn(`⚠️ RemoteIconService: All download attempts failed for ${upperSymbol}`);
      return null;
    } catch (error) {
      console.warn(`⚠️ RemoteIconService: Error downloading icon for ${upperSymbol}:`, error);
      return null;
    } finally {
      this.downloadingIcons.delete(upperSymbol);
    }
  }

  /**
   * 获取占位符图标URL
   * @returns string 占位符URL
   */
  private getPlaceholderUrl(): string {
    return 'https://via.placeholder.com/64x64/E5E5EA/8E8E93?text=?';
  }

  /**
   * 清理过期缓存
   */
  async clearExpiredCache(): Promise<void> {
    try {
      if (Platform.OS === 'web') return;
      
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (!dirInfo.exists) return;

      const files = await FileSystem.readDirectoryAsync(this.CACHE_DIR);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = this.CACHE_DIR + file;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists && fileInfo.modificationTime) {
          const age = now - fileInfo.modificationTime * 1000;
          if (age > this.CACHE_EXPIRY) {
            await FileSystem.deleteAsync(filePath);
            console.log(`🗑️ RemoteIconService: Deleted expired cache: ${file}`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ RemoteIconService: Failed to clear expired cache:', error);
    }
  }

  /**
   * 获取缓存信息
   * @returns Promise<{size: number, count: number}>
   */
  async getCacheInfo(): Promise<{size: number, count: number}> {
    try {
      if (Platform.OS === 'web') {
        return { size: 0, count: this.memoryCache.size };
      }
      
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (!dirInfo.exists) {
        return { size: 0, count: 0 };
      }

      const files = await FileSystem.readDirectoryAsync(this.CACHE_DIR);
      let totalSize = 0;
      
      for (const file of files) {
        const filePath = this.CACHE_DIR + file;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists && fileInfo.size) {
          totalSize += fileInfo.size;
        }
      }
      
      return { size: totalSize, count: files.length };
    } catch (error) {
      console.warn('⚠️ RemoteIconService: Failed to get cache info:', error);
      return { size: 0, count: 0 };
    }
  }

  /**
   * 清空所有缓存
   */
  async clearAllCache(): Promise<void> {
    try {
      // 清空内存缓存
      this.memoryCache.clear();
      
      if (Platform.OS === 'web') return;
      
      // 清空磁盘缓存
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.CACHE_DIR);
        await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
      }
      
      console.log('🗑️ RemoteIconService: Cleared all cache');
    } catch (error) {
      console.warn('⚠️ RemoteIconService: Failed to clear all cache:', error);
    }
  }

  /**
   * 预加载指定币种的图标
   * @param symbols 币种符号数组
   */
  async preloadIcons(symbols: string[]): Promise<void> {
    const promises = symbols.map(symbol => this.getIconUrl(symbol));
    await Promise.allSettled(promises);
  }
}

// 创建服务实例
const remoteIconService = new RemoteIconService();

// 兼容性函数，保持与原有API的兼容
export async function getIconUrl(symbol: string): Promise<string> {
  return remoteIconService.getIconUrl(symbol);
}

export function hasLocalIcon(symbol: string): boolean {
  // 现在所有图标都是远程获取，所以总是返回true
  return true;
}

export function getLocalIconPath(symbol: string): string | null {
  // 兼容性函数，建议使用getIconUrl
  console.warn('getLocalIconPath is deprecated, use getIconUrl instead');
  return null;
}

export default remoteIconService;
