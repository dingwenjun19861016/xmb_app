import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { configService } from './ConfigService';

/**
 * 更新信息接口
 */
export interface UpdateInfo {
  hasUpdate: boolean;
  version: string;
  url: string;
  currentVersion: string;
}

/**
 * 更新服务类
 * 用于检查应用更新
 */
class UpdateService {
  private readonly STORAGE_KEY = 'APP_UPDATE_SKIPPED_VERSION';

  /**
   * 获取当前应用版本
   */
  getCurrentVersion(): string {
    try {
      // 优先使用expo-constants获取版本号
      return Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';
    } catch (error) {
      console.warn('UpdateService: 获取版本号失败，使用默认版本', error);
      return '1.0.0';
    }
  }

  /**
   * 比较版本号
   * @param newVersion 新版本号
   * @param currentVersion 当前版本号
   * @returns 新版本是否更新
   */
  isVersionNewer(newVersion: string, currentVersion: string): boolean {
    const parseVersion = (version: string) => 
      version.split('.').map(num => parseInt(num, 10));
    
    const newParts = parseVersion(newVersion);
    const currentParts = parseVersion(currentVersion);
    
    // 确保两个版本号长度一致
    const maxLength = Math.max(newParts.length, currentParts.length);
    while (newParts.length < maxLength) newParts.push(0);
    while (currentParts.length < maxLength) currentParts.push(0);
    
    for (let i = 0; i < maxLength; i++) {
      if (newParts[i] > currentParts[i]) return true;
      if (newParts[i] < currentParts[i]) return false;
    }
    
    return false;
  }

  /**
   * 检查是否需要更新
   * @returns 更新信息
   */
  async checkForUpdate(): Promise<UpdateInfo> {
    const currentVersion = this.getCurrentVersion();
    const isAndroid = Platform.OS === 'android';
    const isIOS = Platform.OS === 'ios';

    const defaultResult: UpdateInfo = {
      hasUpdate: false,
      version: currentVersion,
      url: '',
      currentVersion,
    };

    try {
      // 只在移动端检查更新
      if (!isAndroid && !isIOS) {
        console.log('UpdateService: 不是移动端平台，跳过更新检查');
        return defaultResult;
      }

      // 获取配置
      const enableKey = isAndroid ? 'APP_ANDROID_UPDATE_ENABLE' : 'APP_IOS_UPDATE_ENABLE';
      const versionKey = isAndroid ? 'APP_ANDROID_UPDATE_VER' : 'APP_IOS_UPDATE_VER';
      const urlKey = isAndroid ? 'APP_ANDROID_UPDATE_URL' : 'APP_IOS_UPDATE_URL';

      const [updateEnable, updateVersion, updateUrl] = await Promise.all([
        configService.getConfig(enableKey, 'false'),
        configService.getConfig(versionKey, ''),
        configService.getConfig(urlKey, ''),
      ]);

      console.log('UpdateService: 更新配置', {
        platform: Platform.OS,
        currentVersion,
        updateEnable,
        updateVersion,
        updateUrl,
        enableKey,
        versionKey,
        urlKey,
        updateEnableType: typeof updateEnable,
        updateEnableValue: `"${updateEnable}"`,
        isUpdateEnabled: updateEnable === 'true',
      });

      // 检查是否启用更新
      if (updateEnable !== 'true') {
        console.log('UpdateService: 更新未启用，updateEnable:', updateEnable, typeof updateEnable, '=== "true":', updateEnable === 'true');
        return defaultResult;
      }
      
      if (!updateVersion) {
        console.log('UpdateService: 更新版本号为空');
        return defaultResult;
      }
      
      if (!updateUrl) {
        console.log('UpdateService: 更新URL为空');
        return defaultResult;
      }

      // 检查版本是否需要更新
      if (!this.isVersionNewer(updateVersion, currentVersion)) {
        console.log('UpdateService: 当前版本已是最新');
        return defaultResult;
      }

      // 检查用户是否已跳过此版本
      const skippedVersion = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (skippedVersion === updateVersion) {
        console.log('UpdateService: 用户已跳过此版本更新');
        return defaultResult;
      }

      console.log('UpdateService: 发现新版本');
      return {
        hasUpdate: true,
        version: updateVersion,
        url: updateUrl,
        currentVersion,
      };
    } catch (error) {
      console.error('UpdateService: 检查更新失败', error);
      return defaultResult;
    }
  }

  /**
   * 跳过版本更新
   * @param version 要跳过的版本号
   */
  async skipVersion(version: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, version);
      console.log('UpdateService: 已记录跳过版本:', version);
    } catch (error) {
      console.error('UpdateService: 保存跳过版本失败', error);
      throw error;
    }
  }

  /**
   * 清除跳过的版本记录
   */
  async clearSkippedVersion(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('UpdateService: 已清除跳过版本记录');
    } catch (error) {
      console.error('UpdateService: 清除跳过版本记录失败', error);
      throw error;
    }
  }

  /**
   * 获取已跳过的版本
   */
  async getSkippedVersion(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('UpdateService: 获取跳过版本失败', error);
      return null;
    }
  }

  /**
   * 检查是否需要更新（强制刷新配置）
   * @returns 更新信息
   */
  async checkForUpdateWithRefresh(): Promise<UpdateInfo> {
    try {
      // 强制刷新配置
      console.log('UpdateService: 强制刷新配置缓存');
      await configService.refreshConfigs();
    } catch (error) {
      console.warn('UpdateService: 刷新配置失败:', error);
    }
    
    return this.checkForUpdate();
  }
}

// 创建单例实例
export const updateService = new UpdateService();
export default updateService;
