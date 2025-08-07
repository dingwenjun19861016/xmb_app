import configService from '../services/ConfigService';
import { getMainURL } from './apiConfig';

// 社区平台常量
export const COMMUNITY_PLATFORMS = {
  SITE: 'site',
  TELEGRAM: 'telegram',
  TWITTER: 'twitter',
  YOUTUBE: 'youtube'
} as const;

export type CommunityPlatform = typeof COMMUNITY_PLATFORMS[keyof typeof COMMUNITY_PLATFORMS];

// 动态配置键名
export const COMMUNITY_CONFIG_KEYS = {
  COMMUNITY_SITE: 'COMMUNITY_SITE',
  COMMUNITY_TG: 'COMMUNITY_TG',
  COMMUNITY_X: 'COMMUNITY_X',
  COMMUNITY_YTB: 'COMMUNITY_YTB'
} as const;

// 默认社区链接配置（作为fallback）
export const DEFAULT_COMMUNITY_LINKS = {
  [COMMUNITY_PLATFORMS.SITE]: getMainURL(),
  [COMMUNITY_PLATFORMS.TELEGRAM]: 'https://bly.one/tg',
  [COMMUNITY_PLATFORMS.TWITTER]: 'https://x.com/dwj_eric',
  [COMMUNITY_PLATFORMS.YOUTUBE]: 'https://www.youtube.com/@chainalertme'
} as const;

// 获取动态社区链接
export const getCommunityLinks = async (): Promise<Record<CommunityPlatform, string>> => {
  try {
    const [siteUrl, tgUrl, xUrl, ytbUrl] = await Promise.all([
      configService.getConfig(COMMUNITY_CONFIG_KEYS.COMMUNITY_SITE, DEFAULT_COMMUNITY_LINKS[COMMUNITY_PLATFORMS.SITE]),
      configService.getConfig(COMMUNITY_CONFIG_KEYS.COMMUNITY_TG, DEFAULT_COMMUNITY_LINKS[COMMUNITY_PLATFORMS.TELEGRAM]),
      configService.getConfig(COMMUNITY_CONFIG_KEYS.COMMUNITY_X, DEFAULT_COMMUNITY_LINKS[COMMUNITY_PLATFORMS.TWITTER]),
      configService.getConfig(COMMUNITY_CONFIG_KEYS.COMMUNITY_YTB, DEFAULT_COMMUNITY_LINKS[COMMUNITY_PLATFORMS.YOUTUBE])
    ]);

    return {
      [COMMUNITY_PLATFORMS.SITE]: siteUrl,
      [COMMUNITY_PLATFORMS.TELEGRAM]: tgUrl,
      [COMMUNITY_PLATFORMS.TWITTER]: xUrl,
      [COMMUNITY_PLATFORMS.YOUTUBE]: ytbUrl
    };
  } catch (error) {
    console.error('获取社区链接配置失败，使用默认配置:', error);
    return DEFAULT_COMMUNITY_LINKS;
  }
};

// 社区平台配置接口
export interface CommunityPlatformConfig {
  id: CommunityPlatform;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  url: string;
  enabled: boolean;
  order: number;
}

// 获取动态社区平台配置
export const getCommunityPlatformConfigs = async (): Promise<Record<CommunityPlatform, CommunityPlatformConfig>> => {
  const communityLinks = await getCommunityLinks();
  
  return {
    [COMMUNITY_PLATFORMS.SITE]: {
      id: COMMUNITY_PLATFORMS.SITE,
      name: 'Website',
      displayName: '官方网站',
      icon: 'globe-outline',
      color: '#4CAF50',
      url: communityLinks[COMMUNITY_PLATFORMS.SITE],
      enabled: true,
      order: 1
    },
    [COMMUNITY_PLATFORMS.TELEGRAM]: {
      id: COMMUNITY_PLATFORMS.TELEGRAM,
      name: 'Telegram',
      displayName: 'Telegram群组',
      icon: 'paper-plane-outline',
      color: '#0088CC',
      url: communityLinks[COMMUNITY_PLATFORMS.TELEGRAM],
      enabled: true,
      order: 2
    },
    [COMMUNITY_PLATFORMS.TWITTER]: {
      id: COMMUNITY_PLATFORMS.TWITTER,
      name: 'Twitter',
      displayName: 'Twitter账号',
      icon: 'logo-twitter',
      color: '#1DA1F2',
      url: communityLinks[COMMUNITY_PLATFORMS.TWITTER],
      enabled: true,
      order: 3
    },
    [COMMUNITY_PLATFORMS.YOUTUBE]: {
      id: COMMUNITY_PLATFORMS.YOUTUBE,
      name: 'YouTube',
      displayName: 'YouTube频道',
      icon: 'logo-youtube',
      color: '#FF0000',
      url: communityLinks[COMMUNITY_PLATFORMS.YOUTUBE],
      enabled: true,
      order: 4
    }
  };
};

// 获取启用的动态平台配置
export const getEnabledCommunityPlatforms = async (): Promise<CommunityPlatformConfig[]> => {
  const configs = await getCommunityPlatformConfigs();
  return Object.values(configs)
    .filter(platform => platform.enabled)
    .sort((a, b) => a.order - b.order);
};

// 获取特定平台的动态配置
export const getCommunityPlatformConfig = async (platform: CommunityPlatform): Promise<CommunityPlatformConfig> => {
  const configs = await getCommunityPlatformConfigs();
  return configs[platform];
};
