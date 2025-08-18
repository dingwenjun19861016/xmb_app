/**
 * Web路由配置
 * 支持URL路由到对应的页面
 */

import { LinkingOptions } from '@react-navigation/native';

// 定义路由参数类型
export type RootStackParamList = {
  Home: {
    screen?: string;
    params?: any;
  };
  Market: {
    screen?: string;
    params?: any;
  };
  Data: {
    screen?: string;
    params?: any;
  };
  Articles: {
    screen?: string;
    params?: any;
  };
};

// 从API配置获取前端URL
import { getWebAppURL } from '../config/apiConfig';

// Web路由配置
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    // Web端前缀
    'http://localhost:3006', // 本地开发环境
    'http://localhost:8081', // Expo Web开发环境
    'http://localhost:8082', // Expo Web备用端口
    'http://localhost:8083', // Expo Web备用端口2
    'http://localhost:8084', // Expo Web备用端口3
    'http://localhost:8085', // Expo Web备用端口4
    'http://localhost:8086', // Expo Web备用端口5
    'http://localhost:8087', // Expo Web备用端口6
    getWebAppURL(), // 生产/测试环境URL
  ],
  config: {
    screens: {
      // 首页路由
      Home: {
        path: '/',
        screens: {
          HomeMain: '',
          CoinDetail: {
            path: 'coin/:name',
            parse: {
              name: (name: string) => name,
              fullName: (fullName: string) => fullName ? decodeURIComponent(fullName) : undefined,
            },
          },
          UserStatus: 'user',
          UserProfile: 'profile',
          TermsOfService: 'terms',
          AboutUs: 'about',
        },
      },
      
      // 行情页面路由
      Market: {
        path: '/market',
        parse: {
          label: (label: string) => label, // 解析label参数
        },
        screens: {
          MarketMain: '',
          CoinDetail: {
            path: '/:name',  // /market/btc 会导航到BTC详情页
            parse: {
              name: (name: string) => name,
              fullName: (fullName: string) => fullName ? decodeURIComponent(fullName) : undefined,
            },
          },
          UserStatus: '/user',
          UserProfile: '/profile',
          TermsOfService: '/terms',
          AboutUs: '/about',
        },
      },
      
      // 数据页面路由
      Data: {
        path: '/data',
        screens: {
          DataMain: '',
          DataDetail: '/:dataType',
          DXYDetail: '/dxy',
          USBond10YRDetail: '/usbond',
          USDJPYDetail: '/usdjpy',
          SP500Detail: '/sp500',
          NasdaqDetail: '/nasdaq',
          DJIDetail: '/dji',
          XAUUSDDetail: '/xauusd', // added
          USCLDetail: '/uscl', // added
          USDCNHDetail: '/usdcnh', // added
          UserStatus: '/user',
          UserProfile: '/profile',
          TermsOfService: '/terms',
          AboutUs: '/about',
        },
      },
      
      // 快讯页面路由
      Articles: {
        path: '/articles',
        screens: {
          ArticlesMain: '',
          ArticleDetail: '/:articleId',
          UserStatus: '/user',
          UserProfile: '/profile',
          TermsOfService: '/terms',
          AboutUs: '/about',
        },
      },
    },
  },
};

export default linking;
