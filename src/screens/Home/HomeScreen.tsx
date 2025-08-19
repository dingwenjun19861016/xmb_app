import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Import custom components
import TodayHeader from '../../components/common/TodayHeader';
import StockOverview from '../../components/common/StockOverview';
import LatestNews from '../../components/common/LatestNews';
import NewsCard from '../../components/common/NewsCard';
import DXYWidget from '../../components/common/DXYWidget';
import USBond10YRWidget from '../../components/common/USBond10YRWidget';
import SP500Widget from '../../components/common/SP500Widget';
import NasdaqWidget from '../../components/common/NasdaqWidget';
import DJIWidget from '../../components/common/DJIWidget'; // imported
import XAUUSDWidget from '../../components/common/XAUUSDWidget'; // added
import USCLWidget from '../../components/common/USCLWidget'; // added
import USDCNHWidget from '../../components/common/USDCNHWidget'; // added
import SkeletonBox from '../../components/common/SkeletonBox';
// Import services
import { newsService, NewsArticle } from '../../services/NewsService';
import userCoinService from '../../services/UserCoinService';
import configService from '../../services/ConfigService';

// Import auth components and context
import LoginModal from '../../components/auth/LoginModal';
import LoginButton from '../../components/auth/LoginButton';
import UserProfile from '../../components/auth/UserProfile';
import StartupAdModal from '../../components/ui/StartupAdModal';
import UpdateModal from '../../components/common/UpdateModal';
import UpdateAvailableModal from '../../components/common/UpdateAvailableModal';
import { User } from '../../types/user';
import versionService from '../../services/VersionService';
import { useUser } from '../../contexts/UserContext';
import { useUSStockRealTimePrice } from '../../contexts/USStockRealTimePriceContext';

// 首页数据卡片组件映射 - 去除GreedyIndex
const DATA_WIDGET_COMPONENTS = {
  DXY: DXYWidget,
  USBond10YR: USBond10YRWidget,
  SP500: SP500Widget,
  Nasdaq: NasdaqWidget,
  DJI: DJIWidget, // added
  XAUUSD: XAUUSDWidget, // added
  USCL: USCLWidget, // added
  USDCNH: USDCNHWidget, // added
};

// 简化的备用数据
const FALLBACK_ARTICLES = [
  {
    id: '1',
    title: '美股ETF持续录得资金流入，分析师看多科技股上涨',
    summary: '多家美股ETF报告显示资金流入持续走强，市场分析师看好科技股突破新高',
    content: '自从美联储政策调整以来，资金持续流入美股市场...',
    date: '1小时前',
    author: '小目标',
    image: 'https://via.placeholder.com/800x400',
    category: '市场动态',
    tags: ['美股', 'ETF', '投资']
  },
  {
    id: '2',
    title: '苹果公司发布最新财报，营收超市场预期',
    summary: '苹果公司Q4财报显示营收强劲增长，iPhone销量再创新高',
    content: '苹果公司今日发布最新季度财报，显示营收超出市场预期...',
    date: '3小时前',
    author: '小目标',
    image: 'https://via.placeholder.com/800x400',
    category: '公司财报',
    tags: ['苹果', '财报', '科技股']
  },
];

const HomeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { currentUser, login, logout } = useUser();

  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  // 状态管理
  const [featuredNews, setFeaturedNews] = useState<NewsArticle[]>([]);
  const [latestNews, setLatestNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestNewsLoading, setLatestNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [latestNewsError, setLatestNewsError] = useState<string | null>(null);
  
  // 登录模态框状态
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // 更新模态框状态
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  
  // 版本更新状态
  const [showVersionUpdateModal, setShowVersionUpdateModal] = useState(false);
  const [versionInfo, setVersionInfo] = useState({ current: '', latest: '' });
  
  // 启动广告Modal状态
  const [showStartupAd, setShowStartupAd] = useState(false);
  const [adImageUrl, setAdImageUrl] = useState<string | undefined>();
  const [adText, setAdText] = useState<string | undefined>();
  const [adUrl, setAdUrl] = useState<string | undefined>();
  const [adDuration, setAdDuration] = useState(5);
  
  // 自动刷新定时器
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 时间更新定时器
  const timeUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 当前时间状态（强制重新渲染TodayHeader）
  const [currentTime, setCurrentTime] = useState(new Date());

  // UI文本配置状态
  const [homeTitle, setHomeTitle] = useState('今日行情');
  const [marketIndicatorsTitle, setMarketIndicatorsTitle] = useState('市场指标');
  const [marketOverviewTitle, setMarketOverviewTitle] = useState('股市行情');
  const [latestNewsTitle, setLatestNewsTitle] = useState('今日要闻');
  const [featuredNewsTitle, setFeaturedNewsTitle] = useState('精选新闻');
  const [viewMoreText, setViewMoreText] = useState('查看全部 >');
  const [searchPlaceholder, setSearchPlaceholder] = useState('搜索资讯...');

  // 数量配置状态
  const [featuredNewsCount, setFeaturedNewsCount] = useState(3);
  const [latestNewsCount, setLatestNewsCount] = useState(5);

  // 数据卡片配置状态 - 仅显示美股相关指标
  const [dataCardsConfig, setDataCardsConfig] = useState('DXY,USBond10YR,SP500,Nasdaq,DJI,XAUUSD,USCL,USDCNH');

  // 加载配置
  const loadConfigs = async () => {
    try {
      // 等待configService完全初始化
      await configService.init();
      
      // 获取UI文本配置
      const homeTitleConfig = await configService.getConfig('HOME_TITLE', '今日行情');
      const marketIndicatorsTitleConfig = await configService.getConfig('HOME_MARKET_INDICATORS_TITLE', '市场指标');
      const marketOverviewTitleConfig = await configService.getConfig('HOME_MARKET_OVERVIEW_TITLE', '股市行情');
      const latestNewsTitleConfig = await configService.getConfig('HOME_LATEST_NEWS_TITLE', '今日要闻');
      const featuredNewsTitleConfig = await configService.getConfig('HOME_FEATURED_NEWS_TITLE', '精选新闻');
      const viewMoreTextConfig = await configService.getConfig('HOME_VIEW_MORE_TEXT', '查看全部 >');
      const searchPlaceholderConfig = await configService.getConfig('HOME_SEARCH_PLACEHOLDER', '搜索资讯...');
      
      // 获取数量配置
      const featuredNewsCountConfig = await configService.getConfig('HOME_FEATURED_NEWS_COUNT', 3);
      const latestNewsCountConfig = await configService.getConfig('HOME_LATEST_NEWS_COUNT', 5);
      
      // 获取数据卡片配置 - 默认为美股相关指标
      const dataCardsConfig = await configService.getConfig('HOME_DATA_CARDS_CONFIG', 'DXY,USBond10YR,SP500,Nasdaq,DJI,XAUUSD,USCL,USDCNH');
      
      // 获取启动广告配置
      const adEnableRaw = await configService.getConfig('HOME_MODAL_AD_ENABLE', false);
      // 确保字符串 "false" 被正确转换为布尔值 false
      // 处理远程配置可能返回字符串 "true"/"false" 的情况
      let adEnable = false;
      if (typeof adEnableRaw === 'string') {
        adEnable = adEnableRaw.toLowerCase() === 'true';
      } else {
        adEnable = Boolean(adEnableRaw);
      }
      const adImg = await configService.getConfig('HOME_MODAL_AD_IMG', '');
      const adTextConfig = await configService.getConfig('HOME_MODAL_AD_TEXT', '');
      const adUrlConfig = await configService.getConfig('HOME_MODAL_AD_URL', '');
      const adDurationConfig = await configService.getConfig('HOME_MODAL_AD_DURATION', 5);
      
      // 批量设置UI文本，确保状态更新
      setHomeTitle(homeTitleConfig);
      setMarketIndicatorsTitle(marketIndicatorsTitleConfig);
      setMarketOverviewTitle(marketOverviewTitleConfig);
      setLatestNewsTitle(latestNewsTitleConfig);
      setFeaturedNewsTitle(featuredNewsTitleConfig);
      setViewMoreText(viewMoreTextConfig);
      setSearchPlaceholder(searchPlaceholderConfig);
      
      // 设置数量配置
      setFeaturedNewsCount(featuredNewsCountConfig);
      setLatestNewsCount(latestNewsCountConfig);
      
      // 设置数据卡片配置
      setDataCardsConfig(dataCardsConfig);
      
      // 设置启动广告配置
      console.log('🔍 HomeScreen: Processing startup ad config:', {
        adEnableRaw,
        adEnableProcessed: adEnable,
        adImg,
        hasImage: !!adImg,
        finalCondition: adEnable && adImg
      });
      
      if (adEnable && adImg) {
        setAdImageUrl(adImg);
        setAdText(adTextConfig);
        setAdUrl(adUrlConfig);
        setAdDuration(adDurationConfig);
        setShowStartupAd(true);
      } else {
        // 启动广告未启用或未配置图片
      }
      
      // 强制触发重新渲染
      setTimeout(() => {
        // 配置已应用并渲染
      }, 100);
      
    } catch (error) {
      console.error('❌ HomeScreen: Failed to load configs:', error);
      // 如果加载配置失败，使用默认值
      setHomeTitle('今日行情');
      setMarketIndicatorsTitle('市场指标');
      setMarketOverviewTitle('股市行情');
      setLatestNewsTitle('今日要闻');
      setFeaturedNewsTitle('精选新闻');
      setViewMoreText('查看全部 >');
      setSearchPlaceholder('搜索资讯...');
      
      // 设置数量默认值
      setFeaturedNewsCount(3);
      setLatestNewsCount(5);
      setDataCardsConfig('DXY,USBond10YR,SP500,Nasdaq,DJI,XAUUSD,USCL,USDCNH');
      setViewMoreText('查看全部 >');
      setSearchPlaceholder('搜索资讯...');
    }
  };

  // 根据配置动态渲染数据卡片
  const renderDataCards = () => {
    try {
      // 解析配置字符串为数组
      let widgetNames: string[] = [];
      if (typeof dataCardsConfig === 'string' && dataCardsConfig.trim()) {
        widgetNames = dataCardsConfig.split(',')
          .map(name => name.trim())
          .filter(name => name && DATA_WIDGET_COMPONENTS.hasOwnProperty(name));
      }
      
      // 如果解析失败，使用默认配置
      if (widgetNames.length === 0) {
        widgetNames = ['DXY', 'USBond10YR', 'SP500', 'Nasdaq', 'DJI', 'XAUUSD', 'USCL', 'USDCNH'];
        console.warn('⚠️ HomeScreen: Failed to parse data cards config, using default');
      }
      
      // 将卡片分组为行（每行2个）
      const rows = [];
      for (let i = 0; i < widgetNames.length; i += 2) {
        const row = widgetNames.slice(i, i + 2);
        rows.push(row);
      }
      
      return rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.indicatorRow}>
          {row.map((widgetName, cardIndex) => {
            const WidgetComponent = DATA_WIDGET_COMPONENTS[widgetName];
            
            if (!WidgetComponent) {
              console.warn(`⚠️ HomeScreen: Widget component ${widgetName} not found`);
              return (
                <View key={`empty-${rowIndex}-${cardIndex}`} style={styles.indicatorCard}>
                  <View style={styles.widgetEmbedded} />
                </View>
              );
            }
            
            return (
              <View key={`${widgetName}-${rowIndex}-${cardIndex}`} style={styles.indicatorCard}>
                <WidgetComponent 
                  style={styles.widgetEmbedded}
                  themeColors={{
                    background: '#F8FAFE',
                    titleColor: '#1565C0',
                    valueColor: '#0D47A1',
                    labelColor: '#42A5F5',
                  }}
                  fontSizes={{
                    title: 11,
                    value: 18,
                    label: 10,
                  }}
                />
              </View>
            );
          })}
        </View>
      ));
      
    } catch (error) {
      console.error('❌ HomeScreen: Error rendering data cards:', error);
      // 如果渲染失败，使用美股相关的默认布局
      return (
        <>
          <View style={styles.indicatorRow}>
            <View style={styles.indicatorCard}>
              <DXYWidget style={styles.widgetEmbedded} />
            </View>
            <View style={styles.indicatorCard}>
              <USBond10YRWidget style={styles.widgetEmbedded} />
            </View>
          </View>
          <View style={styles.indicatorRow}>
            <View style={styles.indicatorCard}>
              <SP500Widget style={styles.widgetEmbedded} />
            </View>
            <View style={styles.indicatorCard}>
              <NasdaqWidget style={styles.widgetEmbedded} />
            </View>
          </View>
          <View style={styles.indicatorRow}>
            <View style={styles.indicatorCard}>
              <DJIWidget style={styles.widgetEmbedded} />
            </View>
            <View style={styles.indicatorCard}>
              <XAUUSDWidget style={styles.widgetEmbedded} />
            </View>
          </View>
          <View style={styles.indicatorRow}>
            <View style={styles.indicatorCard}>
              <USCLWidget style={styles.widgetEmbedded} />
            </View>
            <View style={styles.indicatorCard}>
              <USDCNHWidget style={styles.widgetEmbedded} />
            </View>
          </View>
        </>
      );
    }
  };

  // 获取新闻数据
  const fetchNewsData = async () => {
    try {
      setNewsError(null);
      
      // 重新获取最新的配置值
      const currentFeaturedNewsCount = await configService.getConfig('HOME_FEATURED_NEWS_COUNT', 3);
      
      const featured = await newsService.getFeaturedNews(currentFeaturedNewsCount);
      
      const formatNewsDate = (article: NewsArticle) => ({
        ...article,
        date: newsService.formatDate(article.date)
      });
      
      setFeaturedNews(featured.map(formatNewsDate));
      
    } catch (error) {
      console.error('Failed to load news:', error);
      setNewsError(error.message);
      const fallbackCount = await configService.getConfig('HOME_FEATURED_NEWS_COUNT', 3);
      setFeaturedNews(FALLBACK_ARTICLES.slice(0, fallbackCount));
    } finally {
      setLoading(false);
    }
  };

  // 获取最新资讯
  const fetchLatestNewsData = async () => {
    try {
      setLatestNewsError(null);
      setLatestNewsLoading(true);
      
      // 重新获取最新的配置值
      const currentLatestNewsCount = await configService.getConfig('HOME_LATEST_NEWS_COUNT', 5);
      
      const latest = await newsService.getFeaturedLatestNews(currentLatestNewsCount);
      const formatNewsDate = (article: NewsArticle) => ({
        ...article,
        date: newsService.formatDate(article.date)
      });
      
      setLatestNews(latest.map(formatNewsDate));
      
      console.log(`✅ HomeScreen: 今日要闻数据加载完成，数量: ${latest.length}, 配置值: ${currentLatestNewsCount}`);
    } catch (error) {
      console.error('Failed to load latest news:', error);
      setLatestNewsError(error.message);
      const fallbackCount = await configService.getConfig('HOME_LATEST_NEWS_COUNT', 5);
      setLatestNews(FALLBACK_ARTICLES.slice(0, fallbackCount));
    } finally {
      setLatestNewsLoading(false);
    }
  };  // 自动刷新首页数据
  const autoRefreshHomeData = async () => {
    try {
      console.log('🔄 HomeScreen: 开始静默刷新首页数据...');
      
      // 获取最新的配置值
      const [currentFeaturedNewsCount, currentLatestNewsCount] = await Promise.all([
        configService.getConfig('HOME_FEATURED_NEWS_COUNT', 3),
        configService.getConfig('HOME_LATEST_NEWS_COUNT', 5)
      ]);
      
      // 静默获取新数据，不显示加载状态
      const [newFeaturedNews, newLatestNews] = await Promise.all([
        newsService.getFeaturedNews(currentFeaturedNewsCount).catch((err) => {
          console.error('获取精选新闻失败:', err);
          return [];
        }),
        newsService.getFeaturedLatestNews(currentLatestNewsCount).catch((err) => {
          console.error('获取今日要闻失败:', err);
          return [];
        })
      ]);

      const formatNewsDate = (article: NewsArticle) => ({
        ...article,
        date: newsService.formatDate(article.date)
      });

      console.log('🔄 HomeScreen: 获取到的新数据:', {
        精选新闻: newFeaturedNews.length,
        今日要闻: newLatestNews.length
      });

      // 总是更新数据，即使ID相同也要更新时间显示
      
      // 更新精选新闻
      if (newFeaturedNews.length > 0) {
        const currentIds = featuredNews.map(item => item.id).join(',');
        const newIds = newFeaturedNews.map(item => item.id).join(',');
        
        if (currentIds !== newIds) {
          console.log('🔄 HomeScreen: 精选新闻有新内容，更新数据');
        } else {
          console.log('🔄 HomeScreen: 精选新闻内容相同，更新时间显示');
        }
        setFeaturedNews(newFeaturedNews.map(formatNewsDate));
      }
      
      // 更新今日要闻
      if (newLatestNews.length > 0) {
        const currentIds = latestNews.map(item => item.id).join(',');
        const newIds = newLatestNews.map(item => item.id).join(',');
        
        if (currentIds !== newIds) {
          console.log('🔄 HomeScreen: 今日要闻有新内容，更新数据');
        } else {
          console.log('🔄 HomeScreen: 今日要闻内容相同，更新时间显示');
        }
        setLatestNews(newLatestNews.map(formatNewsDate));
      }
      
      console.log('✅ HomeScreen: 静默刷新完成，所有数据已更新');
    } catch (error) {
      console.error('❌ HomeScreen: 自动刷新失败:', error);
      // 自动刷新失败时不显示错误给用户，只记录日志
    }
  };

  // 启动自动刷新定时器
  const startAutoRefresh = () => {
    // 清除现有定时器
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
    }

    // 启动新的定时器，每2分钟刷新一次（便于测试）
    autoRefreshTimerRef.current = setInterval(() => {
      autoRefreshHomeData();
    }, 2 * 60 * 1000); // 2分钟 = 120000毫秒

    console.log('🔄 HomeScreen: 自动刷新定时器已启动 (2分钟间隔)');
  };

  // 停止自动刷新定时器
  const stopAutoRefresh = () => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
      console.log('🔄 HomeScreen: 自动刷新定时器已停止');
    }
  };

  // 实时更新时间显示
  const updateTimeDisplay = () => {
    // 只更新时间显示，不触发布局变化
    const formatNewsDate = (article: NewsArticle) => ({
      ...article,
      date: newsService.formatDate(article.date)
    });

    // 批量更新时间显示，避免多次重新渲染
    setFeaturedNews(prev => prev.map(formatNewsDate));
    setLatestNews(prev => prev.map(formatNewsDate));
  };

  // 启动时间更新定时器
  const startTimeUpdate = () => {
    // 清除现有定时器
    if (timeUpdateTimerRef.current) {
      clearInterval(timeUpdateTimerRef.current);
    }

    // 立即更新一次时间
    setCurrentTime(new Date());
    updateTimeDisplay();

    // 启动新的定时器，每分钟更新一次
    timeUpdateTimerRef.current = setInterval(() => {
      setCurrentTime(new Date());
      updateTimeDisplay();
    }, 60 * 1000); // 1分钟 = 60000毫秒

    console.log('🕐 HomeScreen: 时间更新定时器已启动 (1分钟间隔)');
  };

  // 停止时间更新定时器
  const stopTimeUpdate = () => {
    if (timeUpdateTimerRef.current) {
      clearInterval(timeUpdateTimerRef.current);
      timeUpdateTimerRef.current = null;
      console.log('🕐 HomeScreen: 时间更新定时器已停止');
    }
  };

  // 用户登录处理
  const handleLoginPress = () => {
    setShowLoginModal(true);
  };

  const handleUserPress = () => {
    if (currentUser) {
      navigation.navigate('UserStatus');
    }
  };

  const handleLoginSuccess = (user: User) => {
    console.log('✅ HomeScreen: 用户登录成功，用户已由LoginModal处理');
    // 注意：不需要再次调用login(user)，因为LoginModal已经处理了
    // 不需要手动关闭modal，LoginModal会自己关闭
    // 只需要记录日志，UserContext的状态已经更新
  };

  const handleLogout = async () => {
    console.log('🔓 HomeScreen: 收到登出请求');
    await logout();
    console.log('✅ HomeScreen: 用户已登出');
  };

  // 处理启动广告关闭
  const handleStartupAdClose = () => {
    setShowStartupAd(false);
    console.log('✅ HomeScreen: Startup ad closed');
  };

  // 检查版本更新
  const checkVersionUpdate = async () => {
    try {
      console.log('🔍 HomeScreen: 检查应用版本更新...');
      const versionInfo = await versionService.checkForUpdates();
      
      if (versionInfo.updateAvailable) {
        console.log('🆕 HomeScreen: 发现新版本可用', versionInfo);
        setVersionInfo({
          current: versionInfo.current,
          latest: versionInfo.latest
        });
        setShowVersionUpdateModal(true);
      } else {
        console.log('✅ HomeScreen: 应用已是最新版本');
      }
    } catch (error) {
      console.error('❌ HomeScreen: 版本检查失败', error);
    }
  };

  // 处理版本更新
  const handleVersionUpdate = async () => {
    try {
      console.log('🔄 HomeScreen: 开始版本更新...');
      await versionService.forceUpdate();
    } catch (error) {
      console.error('❌ HomeScreen: 版本更新失败', error);
      // 关闭模态框，让用户手动刷新
      setShowVersionUpdateModal(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        console.log('🔄 HomeScreen: Starting initialization...');
        
        // 首先加载配置
        await loadConfigs();
        console.log('✅ HomeScreen: Configs loaded, starting data fetch...');
        
        // 然后并行加载数据
        await Promise.all([
          fetchNewsData(),
          fetchLatestNewsData()
        ]);
        
        console.log('✅ HomeScreen: All data loaded successfully');
        
        // 数据加载完成后，延迟检查版本更新
        setTimeout(() => {
          checkVersionUpdate();
        }, 2000);
        
        // 然后显示更新Modal
        setTimeout(() => {
          setShowUpdateModal(true);
        }, 3000);
        
      } catch (error) {
        console.error('❌ HomeScreen: Initialization failed:', error);
        // 即使出错也要尝试加载数据
        fetchNewsData();
        fetchLatestNewsData();
        
        // 即使出错也要显示更新检查
        setTimeout(() => {
          checkVersionUpdate();
        }, 2000);
        
        setTimeout(() => {
          setShowUpdateModal(true);
        }, 3000);
      }
    };
    
    initializeComponent();
    // 启动时间更新定时器
    startTimeUpdate();
  }, []);

  // 处理路由参数
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 HomeScreen: useFocusEffect triggered with params:', route.params);
      
      // 启动自动刷新
      startAutoRefresh();
      
      // 清理任何旧的参数
      if (route.params) {
        setTimeout(() => {
          navigation.setParams({ 
            activeTab: undefined, 
            selectedCategory: undefined,
            searchText: undefined,
            timestamp: undefined,
            forceRefresh: undefined,
            preserveState: undefined,
            forceShowArticles: undefined,
            forceReset: undefined
          });
        }, 200);
      }
      
      return () => {
        // 离开页面时停止自动刷新
        stopAutoRefresh();
      };
    }, [route.params, navigation])
  );

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      stopAutoRefresh();
      stopTimeUpdate();
    };
  }, []);
  // 刷新数据
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchNewsData(),
        fetchLatestNewsData()
      ]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // 骨架加载组件
  const renderMarketIndicatorsSkeleton = () => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <SkeletonBox width={100} height={22} />
        <SkeletonBox width={80} height={18} />
      </View>
      
      <View style={styles.marketIndicatorsGrid}>
        <View style={styles.indicatorRow}>
          <View style={styles.indicatorCard}>
            <SkeletonBox width="100%" height="100%" borderRadius={12} />
          </View>
          <View style={styles.indicatorCard}>
            <SkeletonBox width="100%" height="100%" borderRadius={12} />
          </View>
        </View>
        <View style={styles.indicatorRow}>
          <View style={styles.indicatorCard}>
            <SkeletonBox width="100%" height="100%" borderRadius={12} />
          </View>
          <View style={styles.indicatorCard}>
            <SkeletonBox width="100%" height="100%" borderRadius={12} />
          </View>
        </View>
      </View>
    </View>
  );

  const renderNewsCardsSkeleton = () => (
    <View style={styles.newsCardsContainer}>
      {[1, 2, 3].map((index) => (
        <View key={index} style={styles.newsCardSkeleton}>
          <SkeletonBox width={80} height={60} borderRadius={8} style={styles.newsCardImageSkeleton} />
          <View style={styles.newsCardContentSkeleton}>
            <SkeletonBox width="100%" height={16} style={{ marginBottom: 8 }} />
            <SkeletonBox width="80%" height={14} style={{ marginBottom: 4 }} />
            <SkeletonBox width="60%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );

  // 主页标签内容
  const renderHomeTab = () => (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={false}
      keyboardShouldPersistTaps="handled"
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }}
    >
      {/* 市场指标 */}
      {loading ? (
        renderMarketIndicatorsSkeleton()
      ) : (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{marketIndicatorsTitle}</Text>
            <TouchableOpacity style={styles.viewMoreButton} onPress={() => navigation.navigate('Data')}>
              <Text style={styles.viewMoreText}>{viewMoreText}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.marketIndicatorsGrid}>
            {renderDataCards()}
          </View>
        </View>
      )}

      {/* 股市行情 */}
      <StockOverview 
        /* limit prop removed; number of stocks solely from HOME_MARKET_DISPLAY */
        showRank={true} 
        title={marketOverviewTitle}
        viewMoreText={viewMoreText}
      />
      
      {/* 今日要闻 */}
      <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{latestNewsTitle}</Text>
            <TouchableOpacity style={styles.viewMoreButton} onPress={() => navigation.navigate('Articles', { screen: 'ArticlesMain', params: { from: 'home' } })}>
              <Text style={styles.viewMoreText}>{viewMoreText}</Text>
            </TouchableOpacity>
          </View>
        
        {latestNewsLoading ? (
          renderNewsCardsSkeleton()
        ) : latestNewsError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={24} color="#FF6B6B" />
            <Text style={styles.errorText}>加载失败，请稍后重试</Text>
          </View>
        ) : (
          <View style={styles.newsCardsContainer}>
            {latestNews.slice(0, latestNewsCount).map((article) => (
              <NewsCard 
                key={article.id}
                article={article}
                onPress={(article) => {
                  // 点击今日要闻新闻卡片时直接跳转到文章详情
                  navigation.navigate('ArticleDetail' as never, { 
                    articleId: article.id, 
                    article, 
                    from: 'home' 
                  } as never);
                }}
                cardStyle="compact"
              />
            ))}
          </View>
        )}
      </View>

      {/* 精选新闻 */}
      <LatestNews 
        news={featuredNews} 
        title={featuredNewsTitle}
        viewMoreText={viewMoreText}
        onViewAllPress={() => navigation.navigate('Articles', { screen: 'ArticlesMain', params: { from: 'home' } })}
        loading={loading}
        error={newsError}
      />
    </ScrollView>
  );

  // 文章标签内容
  return (
    <View style={styles.container}>
      <TodayHeader 
        activeTab="home" 
        onBackPress={() => {}}
        onLoginPress={handleLoginPress}
        onUserPress={handleUserPress}
        title={homeTitle}
      />
      {renderHomeTab()}
      
      {/* 登录模态框 */}
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      
      {/* 启动广告Modal */}
      <StartupAdModal
        visible={showStartupAd}
        onClose={handleStartupAdClose}
        imageUrl={adImageUrl}
        text={adText}
        url={adUrl}
        duration={adDuration}
      />
      
      {/* 更新提示Modal */}
      <UpdateModal
        visible={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
      />
      
      {/* 版本更新Modal */}
      <UpdateAvailableModal
        visible={showVersionUpdateModal}
        onClose={() => setShowVersionUpdateModal(false)}
        onUpdate={handleVersionUpdate}
        currentVersion={versionInfo.current}
        newVersion={versionInfo.latest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFE', // 轻微的蓝色调背景
  },
  
  // 分区样式 - 明快金融主题
  sectionContainer: {
    backgroundColor: '#FFFFFF', // 纯白背景
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    shadowColor: '#1565C0', // 蓝色阴影
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#E3F2FD', // 浅蓝色边框
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E3F2FD',
  },
  
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0D47A1', // 深蓝色标题
    letterSpacing: 0.3,
  },
  
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1976D2', // 金融蓝色
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1565C0',
  },
  
  viewMoreText: {
    fontSize: 13,
    color: '#FFFFFF',
    marginRight: 4,
    fontWeight: '600',
  },
  
  // 市场指标
  marketIndicatorsGrid: {
    gap: 16,
  },
  
  indicatorRow: {
    flexDirection: 'row',
    gap: 16,
  },
  
  indicatorCard: {
    flex: 1,
    backgroundColor: '#F8FAFE', // 浅蓝色背景
    borderRadius: 16,
    height: 120,
    shadowColor: '#1565C0', // 蓝色阴影
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#E3F2FD', // 浅蓝色边框
    overflow: 'hidden',
  },
  // 嵌入式小部件样式
  widgetEmbedded: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    minHeight: 0,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  
  // Widget样式覆盖容器
  widgetOverrides: {
    flex: 1,
  },
  // 状态样式
  newsCardsContainer: {
    gap: 12,
    minHeight: 300,
  },
  
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  
  loadingText: {
    fontSize: 15,
    color: '#546E7A', // 蓝灰色
    fontWeight: '500',
  },
  
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFCDD2', // 浅红色边框
  },
  
  errorText: {
    fontSize: 15,
    color: '#D32F2F', // 红色
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  
  // 骨架加载样式
  newsCardSkeleton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E3F2FD',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  newsCardImageSkeleton: {
    marginRight: 16,
  },

  newsCardContentSkeleton: {
    flex: 1,
    justifyContent: 'space-between',
  },
});

export default HomeScreen;