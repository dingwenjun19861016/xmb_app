import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  FlatList,
  TextInput
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Import custom components
import TodayHeader from '../../components/common/TodayHeader';
import StockOverview from '../../components/common/StockOverview';
import FeaturedAirdrops from '../../components/common/FeaturedAirdrops';
import LatestNews from '../../components/common/LatestNews';
import NewsCard from '../../components/common/NewsCard';
import NewsFlashCard from '../../components/common/NewsFlashCard';
import GreedyIndexWidget from '../../components/common/GreedyIndexWidget';
import BTCDIndexWidget from '../../components/common/BTCDIndexWidget';
import AltcoinIndexWidget from '../../components/common/AltcoinIndexWidget';
import ETFDataWidget from '../../components/common/ETFDataWidget';
import MarketCapWidget from '../../components/common/MarketCapWidget';
import ETHDIndexWidget from '../../components/common/ETHDIndexWidget';
import StablecoinWidget from '../../components/common/StablecoinWidget';
import DXYWidget from '../../components/common/DXYWidget';
import USBond10YRWidget from '../../components/common/USBond10YRWidget';
import USDJPYWidget from '../../components/common/USDJPYWidget';
import SkeletonBox from '../../components/common/SkeletonBox';
// Import services
import { newsService, NewsArticle } from '../../services/NewsService';
import { airdropService, AirdropItem } from '../../services/AirdropService';
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

// 分类配置
const ARTICLE_CATEGORIES = ['全部', '快讯', '头条', '研报'];
const CATEGORY_MAP = {
  '头条': 'headline',
  '研报': 'market',
  '快讯': 'stockquicknews',
};
const API_TO_UI_CATEGORY = {
  'headline': '头条',
  'market': '研报',
  'stockquicknews': '快讯',
  'defi': 'DeFi',
  'eth': '以太坊',
  'btc': '比特币',
};

// 首页数据卡片组件映射
const DATA_WIDGET_COMPONENTS = {
  GreedyIndex: GreedyIndexWidget,
  MarketCap: MarketCapWidget,
  AltcoinIndex: AltcoinIndexWidget,
  ETFData: ETFDataWidget,
  BTCDIndex: BTCDIndexWidget,
  ETHDIndex: ETHDIndexWidget,
  Stablecoin: StablecoinWidget,
  DXY: DXYWidget,
  USBond10YR: USBond10YRWidget,
  USDJPY: USDJPYWidget,
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

const FALLBACK_AIRDROPS = [
  {
    id: '1',
    title: 'Jupiter Protocol',
    description: 'Solana生态最大DEX聚合器空投',
    deadline: '2025年5月15日截止',
    value: '预估 $500-1000',
    logo: 'https://via.placeholder.com/60',
    background: 'https://via.placeholder.com/300x150',
    requirements: ['连接钱包', '在Jupiter上进行交易', '持有JUP代币'],
    tags: ['Solana', 'DEX'],
    status: 'active' as const,
    link: 'https://jup.io',
    date: '2小时前',
    category: '代币空投',
    content: ''
  },
];

const HomeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { currentUser, login, logout } = useUser();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    // 根据路由参数或屏幕名称设置初始activeTab
    return route.params?.activeTab || (route.name === 'ArticlesList' ? 'articles' : 'home');
  });
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  
  // 状态管理
  const [featuredNews, setFeaturedNews] = useState<NewsArticle[]>([]);
  const [latestNews, setLatestNews] = useState<NewsArticle[]>([]);
  const [allArticles, setAllArticles] = useState<NewsArticle[]>([]);
  const [searchResults, setSearchResults] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestNewsLoading, setLatestNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [latestNewsError, setLatestNewsError] = useState<string | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [featuredAirdrops, setFeaturedAirdrops] = useState<AirdropItem[]>([]);
  const [airdropLoading, setAirdropLoading] = useState(true);
  const [airdropError, setAirdropError] = useState<string | null>(null);
  
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
  
  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [searchCurrentPage, setSearchCurrentPage] = useState(0);
  const [searchHasMoreData, setSearchHasMoreData] = useState(true);
  const PAGE_SIZE = 100;

  // 连续空结果计数器
  const [consecutiveEmptyResults, setConsecutiveEmptyResults] = useState(0);
  const [searchConsecutiveEmptyResults, setSearchConsecutiveEmptyResults] = useState(0);

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
  const [featuredAirdropsTitle, setFeaturedAirdropsTitle] = useState('热门空投');
  const [viewMoreText, setViewMoreText] = useState('查看全部 >');
  const [searchPlaceholder, setSearchPlaceholder] = useState('搜索资讯...');

  // 数量配置状态
  const [featuredNewsCount, setFeaturedNewsCount] = useState(3);
  const [latestNewsCount, setLatestNewsCount] = useState(5);
  const [featuredAirdropsCount, setFeaturedAirdropsCount] = useState(3);
  const [marketOverviewCount, setMarketOverviewCount] = useState(2);

  // 数据卡片配置状态
  const [dataCardsConfig, setDataCardsConfig] = useState('GreedyIndex,BTCDIndex,AltcoinIndex,ETFData');

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
      const featuredAirdropsTitleConfig = await configService.getConfig('HOME_FEATURED_AIRDROPS_TITLE', '热门空投');
      const viewMoreTextConfig = await configService.getConfig('HOME_VIEW_MORE_TEXT', '查看全部 >');
      const searchPlaceholderConfig = await configService.getConfig('HOME_SEARCH_PLACEHOLDER', '搜索资讯...');
      
      // 获取数量配置
      const featuredNewsCountConfig = await configService.getConfig('HOME_FEATURED_NEWS_COUNT', 3);
      const latestNewsCountConfig = await configService.getConfig('HOME_LATEST_NEWS_COUNT', 5);
      const featuredAirdropsCountConfig = await configService.getConfig('HOME_FEATURED_AIRDROPS_COUNT', 3);
      const marketOverviewCountConfig = await configService.getConfig('HOME_MARKET_OVERVIEW_COUNT', 2);
      
      // 获取数据卡片配置
      const dataCardsConfig = await configService.getConfig('HOME_DATA_CARDS_CONFIG', 'GreedyIndex,BTCDIndex,AltcoinIndex,ETFData');
      
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
      setFeaturedAirdropsTitle(featuredAirdropsTitleConfig);
      setViewMoreText(viewMoreTextConfig);
      setSearchPlaceholder(searchPlaceholderConfig);
      
      // 设置数量配置
      setFeaturedNewsCount(featuredNewsCountConfig);
      setLatestNewsCount(latestNewsCountConfig);
      setFeaturedAirdropsCount(featuredAirdropsCountConfig);
      setMarketOverviewCount(marketOverviewCountConfig);
      
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
      setFeaturedAirdropsTitle('热门空投');
      setViewMoreText('查看全部 >');
      setSearchPlaceholder('搜索资讯...');
      
      // 设置数量默认值
      setFeaturedNewsCount(3);
      setLatestNewsCount(5);
      setFeaturedAirdropsCount(3);
      setMarketOverviewCount(2);
      setDataCardsConfig('GreedyIndex,BTCDIndex,AltcoinIndex,ETFData');
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
        widgetNames = dataCardsConfig.split(',').map(name => name.trim()).filter(name => name && DATA_WIDGET_COMPONENTS[name]);
      }
      
      // 如果解析失败，使用默认配置
      if (widgetNames.length === 0) {
        widgetNames = ['GreedyIndex', 'BTCDIndex', 'AltcoinIndex', 'ETFData'];
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
              return null;
            }
            
            return (
              <View key={`${widgetName}-${rowIndex}-${cardIndex}`} style={styles.indicatorCard}>
                <WidgetComponent />
              </View>
            );
          })}
        </View>
      ));
      
    } catch (error) {
      console.error('❌ HomeScreen: Error rendering data cards:', error);
      // 如果渲染失败，使用默认布局
      return (
        <>
          <View style={styles.indicatorRow}>
            <View style={styles.indicatorCard}>
              <GreedyIndexWidget />
            </View>
            <View style={styles.indicatorCard}>
              <BTCDIndexWidget />
            </View>
          </View>
          <View style={styles.indicatorRow}>
            <View style={styles.indicatorCard}>
              <AltcoinIndexWidget />
            </View>
            <View style={styles.indicatorCard}>
              <ETFDataWidget />
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
      
      const [featured, articles] = await Promise.all([
        newsService.getFeaturedNews(currentFeaturedNewsCount),
        newsService.getNewsList(0, PAGE_SIZE)
      ]);
      
      const formatNewsDate = (article: NewsArticle) => ({
        ...article,
        date: newsService.formatDate(article.date)
      });
      
      setFeaturedNews(featured.map(formatNewsDate));
      setAllArticles(articles.map(formatNewsDate));
      
      // 设置初始的分页状态
      setHasMoreData(articles.length >= PAGE_SIZE);
      setCurrentPage(0);
      
    } catch (error) {
      console.error('Failed to load news:', error);
      setNewsError(error.message);
      const fallbackCount = await configService.getConfig('HOME_FEATURED_NEWS_COUNT', 3);
      setFeaturedNews(FALLBACK_ARTICLES.slice(0, fallbackCount));
      setAllArticles(FALLBACK_ARTICLES);
    } finally {
      setLoading(false);
    }
  };

  // 搜索防抖
  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // 执行搜索
  const performSearch = async (searchTerm: string, page: number = 0, append: boolean = false) => {
    if (!searchTerm.trim()) {
      setIsSearchMode(false);
      setSearchResults([]);
      setSearchError(null);
      setSearchCurrentPage(0);
      setSearchHasMoreData(true);
      return;
    }

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setSearchLoading(true);
        setSearchCurrentPage(0);
        setSearchHasMoreData(true);
        setSearchConsecutiveEmptyResults(0); // 重置连续空结果计数器
      }
      
      setSearchError(null);
      setIsSearchMode(true);
      
      const skip = page * PAGE_SIZE;
      const results = await newsService.smartSearchNews(searchTerm, PAGE_SIZE, skip);
      
      // 检查是否还有更多数据
      // 使用连续空结果计数来判断
      let hasMore;
      if (results.length === 0) {
        // 如果这次没有返回任何数据，增加计数
        setSearchConsecutiveEmptyResults(prev => prev + 1);
        // 连续2次没有数据就停止
        hasMore = searchConsecutiveEmptyResults < 1;
        setSearchHasMoreData(hasMore);
      } else {
        // 如果有数据，重置计数器
        setSearchConsecutiveEmptyResults(0);
        // 如果返回的数据很少（小于3篇），可能接近尾部
        hasMore = results.length >= 3;
        setSearchHasMoreData(hasMore);
      }
      
      if (append) {
        // 追加搜索结果，去重
        setSearchResults(prev => {
          const existingIds = new Set(prev.map(article => article.id));
          const newResults = results.filter(article => !existingIds.has(article.id));
          return [...prev, ...newResults];
        });
        setSearchCurrentPage(page);
      } else {
        // 重新搜索
        setSearchResults(results);
        setSearchCurrentPage(page);
      }
      
    } catch (error) {
      console.error('❌ HomeScreen: 搜索失败:', error);
      setSearchError(error.message);
      if (!append) {
        setSearchResults([]);
      }
    } finally {
      setSearchLoading(false);
      setLoadingMore(false);
    }
  };

  // 搜索输入处理（带防抖）
  const handleSearchInput = (text: string) => {
    setSearchText(text);
    
    // 清除之前的定时器
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // 设置新的定时器
    searchTimeout.current = setTimeout(() => {
      performSearch(text);
    }, 500); // 500ms 防抖
  };

  // 清除搜索
  const clearSearch = () => {
    setSearchText('');
    setIsSearchMode(false);
    setSearchResults([]);
    setSearchError(null);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
  };

  // 根据分类获取文章
  const fetchArticlesByCategory = async (category: string, page: number = 0, append: boolean = false) => {
    // 防止重复请求
    if (categoryLoading || (append && loadingMore)) {
      console.log('🔄 HomeScreen: 跳过重复请求，当前正在加载:', category);
      return;
    }
    
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setCategoryLoading(true);
        setCurrentPage(0);
        setHasMoreData(true);
        setConsecutiveEmptyResults(0); // 重置连续空结果计数器
      }
      
      setNewsError(null);
      
      console.log('🔄 HomeScreen: 开始获取文章，分类:', category, 'page:', page);
      
      const apiCategory = category === '全部' ? '' : CATEGORY_MAP[category] || '';
      console.log('🔄 HomeScreen: 映射后的API分类:', apiCategory);
      
      let articlesData;
      const skip = page * PAGE_SIZE;
      
      if (apiCategory === 'stockquicknews') {
        console.log('🔄 HomeScreen: 使用 getLatestNews 获取快讯, skip:', skip, 'limit:', PAGE_SIZE);
        articlesData = await newsService.getLatestNews(skip, PAGE_SIZE);
      } else if (apiCategory === 'headline') {
        console.log('🔄 HomeScreen: 使用 getNewsList 获取头条, skip:', skip, 'limit:', PAGE_SIZE);
        articlesData = await newsService.getNewsList(skip, PAGE_SIZE, 'headline');
      } else if (apiCategory === 'market') {
        console.log('🔄 HomeScreen: 使用 getNewsList 获取研报, skip:', skip, 'limit:', PAGE_SIZE);
        articlesData = await newsService.getNewsList(skip, PAGE_SIZE, 'market');
      } else {
        console.log('🔄 HomeScreen: 使用 getNewsList 获取全部文章, skip:', skip, 'limit:', PAGE_SIZE);
        articlesData = await newsService.getNewsList(skip, PAGE_SIZE);
      }
      
      console.log(`✅ HomeScreen: 成功获取 ${articlesData.length} 篇文章`);
      
      const formatNewsDate = (article: NewsArticle) => ({
        ...article,
        date: newsService.formatDate(article.date)
      });
      
      const formattedArticles = articlesData.map(formatNewsDate);
      
      // 检查是否还有更多数据
      // 使用连续空结果计数来判断
      let hasMore;
      if (articlesData.length === 0) {
        // 如果这次没有返回任何数据，增加计数
        setConsecutiveEmptyResults(prev => prev + 1);
        // 连续2次没有数据就停止
        hasMore = consecutiveEmptyResults < 1;
        setHasMoreData(hasMore);
        console.log(`📊 HomeScreen: 空结果判断 - 连续空结果: ${consecutiveEmptyResults + 1}, hasMore: ${hasMore}`);
      } else {
        // 如果有数据，重置计数器
        setConsecutiveEmptyResults(0);
        // 如果返回的数据很少（小于3篇），可能接近尾部
        hasMore = articlesData.length >= 3;
        setHasMoreData(hasMore);
        console.log(`📊 HomeScreen: 正常结果判断 - 返回${articlesData.length}篇, hasMore: ${hasMore}`);
      }
      
      if (append) {
        // 追加数据，去重
        setAllArticles(prev => {
          const existingIds = new Set(prev.map(article => article.id));
          const newArticles = formattedArticles.filter(article => !existingIds.has(article.id));
          return [...prev, ...newArticles];
        });
        setCurrentPage(page);
      } else {
        // 重新加载数据
        setAllArticles(formattedArticles);
        setCurrentPage(page);
      }
      
      console.log('✅ HomeScreen: 文章数据设置完成，共', formattedArticles.length, '篇, hasMore:', hasMore);
      
    } catch (error) {
      console.error('❌ HomeScreen: 获取文章失败:', error);
      setNewsError(error.message);
      // 只有在没有现有数据时才使用fallback
      if (!append) {
        setAllArticles(prev => prev.length > 0 ? prev : FALLBACK_ARTICLES);
      }
    } finally {
      setCategoryLoading(false);
      setLoadingMore(false);
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
  };
  
  // 获取空投数据
  const fetchAirdropData = async () => {
    try {
      setAirdropError(null);
      setAirdropLoading(true);
      
      // 重新获取最新的配置值
      const currentFeaturedAirdropsCount = await configService.getConfig('HOME_FEATURED_AIRDROPS_COUNT', 3);
      
      const airdrops = await airdropService.getFeaturedAirdrops(currentFeaturedAirdropsCount);
      const formattedAirdrops = airdrops.map(airdrop => ({
        ...airdrop,
        date: airdropService.formatDate(airdrop.date),
        deadline: airdropService.formatDeadline(airdrop.deadline)
      }));
      
      setFeaturedAirdrops(formattedAirdrops);
      
      console.log(`✅ HomeScreen: 精选空投数据加载完成，数量: ${airdrops.length}, 配置值: ${currentFeaturedAirdropsCount}`);
    } catch (error) {
      console.error('Failed to load airdrops:', error);
      setAirdropError(error.message);
      
      // 只有在网络错误或者没有缓存数据时才使用fallback
      if (featuredAirdrops.length === 0) {
        console.log('🔄 HomeScreen: 使用fallback空投数据');
        const fallbackCount = await configService.getConfig('HOME_FEATURED_AIRDROPS_COUNT', 3);
        setFeaturedAirdrops(FALLBACK_AIRDROPS.slice(0, fallbackCount));
      } else {
        console.log('🔄 HomeScreen: 保留现有空投数据');
        // 保留现有数据，不使用fallback
      }
    } finally {
      setAirdropLoading(false);
    }
  };

  // 自动刷新首页数据（仅在主页标签时执行）
  const autoRefreshHomeData = async () => {
    // 只有在主页标签时才自动刷新
    if (activeTab !== 'home') {
      console.log('🔄 HomeScreen: 跳过自动刷新，当前不在主页标签');
      return;
    }

    try {
      console.log('🔄 HomeScreen: 开始静默刷新首页数据...');
      
      // 获取最新的配置值
      const [currentFeaturedNewsCount, currentLatestNewsCount, currentFeaturedAirdropsCount] = await Promise.all([
        configService.getConfig('HOME_FEATURED_NEWS_COUNT', 3),
        configService.getConfig('HOME_LATEST_NEWS_COUNT', 5),
        configService.getConfig('HOME_FEATURED_AIRDROPS_COUNT', 3)
      ]);
      
      // 静默获取新数据，不显示加载状态
      const [newFeaturedNews, newLatestNews, newAirdrops] = await Promise.all([
        newsService.getFeaturedNews(currentFeaturedNewsCount).catch((err) => {
          console.error('获取精选新闻失败:', err);
          return [];
        }),
        newsService.getFeaturedLatestNews(currentLatestNewsCount).catch((err) => {
          console.error('获取今日要闻失败:', err);
          return [];
        }),
        airdropService.getFeaturedAirdrops(currentFeaturedAirdropsCount).catch((err) => {
          console.error('获取空投数据失败:', err);
          return [];
        })
      ]);

      const formatNewsDate = (article: NewsArticle) => ({
        ...article,
        date: newsService.formatDate(article.date)
      });

      console.log('🔄 HomeScreen: 获取到的新数据:', {
        精选新闻: newFeaturedNews.length,
        今日要闻: newLatestNews.length,
        空投数据: newAirdrops.length
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

      // 更新空投数据
      if (newAirdrops.length > 0) {
        const currentIds = featuredAirdrops.map(item => item.id).join(',');
        const newIds = newAirdrops.map(item => item.id).join(',');
        
        if (currentIds !== newIds) {
          console.log('🔄 HomeScreen: 空投数据有新内容，更新数据');
        } else {
          console.log('🔄 HomeScreen: 空投数据内容相同，更新时间显示');
        }
        
        const formattedAirdrops = newAirdrops.map(airdrop => ({
          ...airdrop,
          date: airdropService.formatDate(airdrop.date),
          deadline: airdropService.formatDeadline(airdrop.deadline)
        }));
        setFeaturedAirdrops(formattedAirdrops);
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
    setFeaturedAirdrops(prev => prev.map(airdrop => ({
      ...airdrop,
      date: airdropService.formatDate(airdrop.date)
    })));
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
          fetchLatestNewsData(),
          fetchAirdropData()
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
        fetchAirdropData();
        
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

  // 监听分类变化
  useEffect(() => {
    console.log('🔄 HomeScreen: useEffect triggered - activeTab:', activeTab, 'selectedCategory:', selectedCategory);
    if (activeTab === 'articles' && selectedCategory) {
      console.log('🔄 HomeScreen: Fetching articles due to category change:', selectedCategory);
      fetchArticlesByCategory(selectedCategory);
    }
  }, [selectedCategory, activeTab]);

  // 监听 activeTab 变化，管理自动刷新
  useEffect(() => {
    if (activeTab === 'home') {
      // 切换到主页时启动自动刷新
      startAutoRefresh();
    } else {
      // 切换到其他标签时停止自动刷新
      stopAutoRefresh();
    }

    // 清理函数
    return () => {
      stopAutoRefresh();
    };
  }, [activeTab]);

  // 处理路由参数
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 HomeScreen: useFocusEffect triggered with params:', route.params);
      
      if (route.params?.activeTab === 'articles') {
        console.log('🔄 HomeScreen: Setting active tab to articles');
        setActiveTab('articles');
        
        // 如果有搜索文本，恢复搜索状态
        if (route.params?.searchText) {
          console.log('🔄 HomeScreen: Restoring search state:', route.params.searchText);
          setSearchText(route.params.searchText);
          setIsSearchMode(true);
          // 只有在不保持状态时才重新执行搜索
          if (!route.params?.preserveState) {
            setTimeout(() => {
              performSearch(route.params.searchText);
            }, 100);
          }
        } else if (route.params?.selectedCategory) {
          console.log('🔄 HomeScreen: Setting selected category to:', route.params.selectedCategory);
          setSelectedCategory(route.params.selectedCategory);
          
          // 确保不在搜索模式下
          setIsSearchMode(false);
          
          // 只有在不保持状态时才重新获取数据
          if (!route.params?.preserveState) {
            setTimeout(() => {
              console.log('🔄 HomeScreen: Fetching articles for category:', route.params.selectedCategory);
              fetchArticlesByCategory(route.params.selectedCategory);
            }, 100);
          }
        }
        
        // 清理参数
        setTimeout(() => {
          navigation.setParams({ 
            activeTab: undefined, 
            selectedCategory: undefined,
            searchText: undefined,
            timestamp: undefined,
            forceRefresh: undefined,
            preserveState: undefined
          });
        }, 200);
      }
      
      if (route.params?.forceShowArticles) {
        setActiveTab('articles');
        setTimeout(() => {
          navigation.setParams({ forceShowArticles: undefined });
        }, 100);
      }
      
      if (route.params?.forceReset) {
        setActiveTab('home');
        clearSearch();
        setSelectedCategory('全部');
        navigation.setParams({ forceReset: undefined });
      }
      
      // 处理强制刷新
      if (route.params?.forceRefresh && route.params?.selectedCategory) {
        console.log('🔄 HomeScreen: Force refresh requested for category:', route.params.selectedCategory);
        setTimeout(() => {
          fetchArticlesByCategory(route.params.selectedCategory);
        }, 150);
      }
    }, [route.params, navigation])
  );

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      stopAutoRefresh();
      stopTimeUpdate();
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);
  // 刷新数据
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchNewsData(),
        fetchLatestNewsData(),
        fetchAirdropData()
      ]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // 获取要显示的文章列表
  const getDisplayArticles = () => {
    // 如果在搜索模式，返回搜索结果
    if (isSearchMode) {
      return searchResults;
    }
    
    // 否则返回按分类过滤的文章
    return allArticles.filter(article => {
      let matchesCategory = selectedCategory === '全部' || 
        (API_TO_UI_CATEGORY[article.category] || article.category) === selectedCategory;
      
      return matchesCategory;
    });
  };

  const displayArticles = getDisplayArticles();

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

  const renderArticleListSkeleton = () => (
    <View style={styles.articlesList}>
      {[1, 2, 3, 4, 5].map((index) => (
        <View key={index} style={styles.articleSkeletonCard}>
          <SkeletonBox width={100} height={80} borderRadius={8} style={styles.articleImageSkeleton} />
          <View style={styles.articleContentSkeleton}>
            <SkeletonBox width="100%" height={18} style={{ marginBottom: 8 }} />
            <SkeletonBox width="90%" height={14} style={{ marginBottom: 8 }} />
            <SkeletonBox width="70%" height={14} style={{ marginBottom: 12 }} />
            <View style={styles.articleMetaSkeleton}>
              <SkeletonBox width={60} height={12} />
              <SkeletonBox width={40} height={12} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  // 添加调试日志
  console.log('🔍 HomeScreen: 显示状态 - 搜索模式:', isSearchMode, '搜索结果:', searchResults.length, '分类文章:', allArticles.length, '当前分类:', selectedCategory);

  // 渲染文章项
  const renderArticleItem = ({ item }) => {
    // 如果是搜索模式，或者是快讯分类，使用NewsFlashCard
    const useFlashCard = isSearchMode || selectedCategory === '快讯';
    const CardComponent = useFlashCard ? NewsFlashCard : NewsCard;
    
    return (
      <CardComponent 
        article={item}
        onPress={(article) => {
          console.log('🔄 HomeScreen: Article clicked:', {
            id: article.id,
            title: article.title,
            category: article.category,
            isSearchMode: isSearchMode,
            selectedCategory: selectedCategory,
            searchText: searchText
          });
          
          navigation.navigate('ArticleDetail', { 
            articleId: article.id,
            returnTo: 'articles',
            selectedCategory: selectedCategory,
            searchText: searchText,
            isSearchMode: isSearchMode
          });
        }}
        variant={isSearchMode ? 'search' : 'flash'}
        cardStyle={useFlashCard ? undefined : "default"}
      />
    );
  };

  // 渲染分类项
  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.categoryItem, 
        selectedCategory === item && styles.selectedCategory
      ]}
      onPress={() => {
        if (selectedCategory !== item) {
          setSelectedCategory(item);
          setTimeout(() => fetchArticlesByCategory(item), 50);
        }
      }}
    >
      <Text style={[
        styles.categoryText,
        selectedCategory === item && styles.selectedCategoryText
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
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
        limit={marketOverviewCount} 
        showRank={true} 
        title={marketOverviewTitle}
        viewMoreText={viewMoreText}
      />

      {/* 今日要闻 */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{latestNewsTitle}</Text>
          <TouchableOpacity style={styles.viewMoreButton} onPress={() => setActiveTab('articles')}>
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
                  navigation.navigate('ArticleDetail', { 
                    articleId: article.id,
                    returnTo: 'home'
                  });
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
        onViewAllPress={() => setActiveTab('articles')}
        onArticlePress={(article) => {
          navigation.navigate('ArticleDetail', { 
            articleId: article.id,
            returnTo: 'home'
          });
        }}
        loading={loading}
        error={newsError}
      />

      {/* 热门空投 */}
      <FeaturedAirdrops 
        airdrops={featuredAirdrops} 
        title={featuredAirdropsTitle}
        viewMoreText={viewMoreText}
        loading={airdropLoading}
        error={airdropError}
      />
    </ScrollView>
  );

  // 文章标签内容
  const renderArticlesTab = () => (
    <View style={styles.articlesTabContainer}>
      {/* 搜索框 */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          value={searchText}
          onChangeText={handleSearchInput}
          placeholderTextColor="#999"
          returnKeyType="search"
        />
        {searchText !== '' && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* 分类选择 - 搜索模式下隐藏 */}
      {!isSearchMode && (
        <View style={styles.categoriesContainer}>
          <FlatList
            data={ARTICLE_CATEGORIES}
            renderItem={renderCategoryItem}
            keyExtractor={item => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>
      )}

      {/* 搜索结果提示 */}
      {isSearchMode && (
        <View style={styles.searchResultsHeader}>
          <Text style={styles.searchResultsText}>
            {searchLoading ? '搜索中...' : `搜索"${searchText}"的结果 (${displayArticles.length})`}
          </Text>
        </View>
      )}

      {/* 文章列表 */}
      {(loading || categoryLoading || searchLoading) ? (
        renderArticleListSkeleton()
      ) : (
        <FlatList
          data={displayArticles}
          renderItem={renderArticleItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.articlesList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMoreArticles}
          onEndReachedThreshold={0.1}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper-outline" size={50} color="#CCC" />
              <Text style={styles.emptyText}>
                {isSearchMode ? `搜索失败: ${searchError}` : 
                searchLoading ? '搜索中...' : '未找到相关文章'}
              </Text>
              <TouchableOpacity style={styles.refreshButton} onPress={isSearchMode ? () => performSearch(searchText) : forceRefreshArticles}>
                <Text style={styles.refreshButtonText}>
                  {isSearchMode ? (searchError ? '重试搜索' : '刷新搜索') : (newsError ? '重试' : '刷新数据')}
                </Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={renderLoadMoreFooter}
        />
      )}
    </View>
  );

  // 加载更多文章
  const loadMoreArticles = () => {
    console.log('🔄 HomeScreen: loadMoreArticles called', {
      isSearchMode,
      searchHasMoreData,
      hasMoreData,
      loadingMore,
      currentPage,
      searchCurrentPage,
      displayArticlesCount: displayArticles.length
    });
    
    if (isSearchMode) {
      // 搜索模式下加载更多搜索结果
      if (searchHasMoreData && !loadingMore) {
        const nextPage = searchCurrentPage + 1;
        console.log('🔄 HomeScreen: 加载更多搜索结果, page:', nextPage);
        performSearch(searchText, nextPage, true);
      } else {
        console.log('🔄 HomeScreen: 搜索模式不能加载更多:', { searchHasMoreData, loadingMore });
      }
    } else {
      // 正常模式下加载更多文章
      if (hasMoreData && !loadingMore) {
        const nextPage = currentPage + 1;
        console.log('🔄 HomeScreen: 加载更多文章, category:', selectedCategory, 'page:', nextPage);
        fetchArticlesByCategory(selectedCategory, nextPage, true);
      } else {
        console.log('🔄 HomeScreen: 正常模式不能加载更多:', { hasMoreData, loadingMore });
      }
    }
  };

  // 渲染加载更多的底部组件
  const renderLoadMoreFooter = () => {
    const hasMore = isSearchMode ? searchHasMoreData : hasMoreData;
    
    console.log('🔄 HomeScreen: renderLoadMoreFooter', {
      loadingMore,
      hasMore,
      isSearchMode,
      searchHasMoreData,
      hasMoreData,
      displayArticlesCount: displayArticles.length
    });
    
    if (loadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <Text style={styles.loadingMoreText}>正在加载更多...</Text>
        </View>
      );
    }
    
    if (!hasMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <Text style={styles.noMoreDataText}>没有更多数据了</Text>
        </View>
      );
    }
    
    return null;
  };

  // 强制刷新文章
  const forceRefreshArticles = () => {
    console.log('🔄 HomeScreen: 强制刷新文章，当前分类:', selectedCategory);
    setNewsError(null);
    setCategoryLoading(true);
    fetchArticlesByCategory(selectedCategory);
  };

  return (
    <View style={styles.container}>
      <TodayHeader 
        activeTab={activeTab} 
        onBackPress={() => setActiveTab('home')}
        onLoginPress={handleLoginPress}
        onUserPress={handleUserPress}
        title={homeTitle}
      />
      {activeTab === 'home' ? renderHomeTab() : renderArticlesTab()}
      
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
    backgroundColor: '#FAFAFA',
  },
  
  // 分区样式
  sectionContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 4, // 减少顶部边距，使内容更贴近头部
    marginBottom: 12,
    paddingTop: 10, // 减少内边距使布局更紧凑
    paddingBottom: 10, // 减少内边距使布局更紧凑
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10, // 减少标题与内容之间的间距
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  
  viewMoreText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
  },
  
  // 市场指标
  marketIndicatorsGrid: {
    gap: 12,
  },
  
  indicatorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  
  indicatorCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },

  // 文章标签页
  articlesTabContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 4, // 减少顶部边距
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  
  searchIcon: {
    marginRight: 12,
  },
  
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#1A1A1A',
  },
  
  clearButton: {
    padding: 8,
  },
  
  searchButton: {
    padding: 8,
    marginLeft: 4,
  },
  
  searchResultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  
  searchResultsText: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
  },
  
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  
  categoriesList: {
    paddingBottom: 12,
  },
  
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  
  selectedCategory: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  
  categoryText: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
  },
  
  selectedCategoryText: {
    color: 'white',
  },
  
  articlesList: {
    padding: 16,
    paddingTop: 8,
  },
  
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  
  emptyText: {
    fontSize: 16,
    color: '#6C757D',
    marginTop: 12,
  },
  
  refreshButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // 状态样式
  newsCardsContainer: {
    gap: 6, // 减少卡片之间的间距
    minHeight: 300, // 设置最小高度，避免内容变化时的抖动
  },
  
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginTop: 8,
    textAlign: 'center',
  },
  
  // 加载更多
  loadingMoreContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  loadingMoreText: {
    fontSize: 14,
    color: '#007AFF',
  },
  
  noMoreDataText: {
    fontSize: 14,
    color: '#999',
  },
  
  // 骨架加载样式
  newsCardSkeleton: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  newsCardImageSkeleton: {
    marginRight: 12,
  },

  newsCardContentSkeleton: {
    flex: 1,
    justifyContent: 'space-between',
  },

  articleSkeletonCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  articleImageSkeleton: {
    marginRight: 12,
  },

  articleContentSkeleton: {
    flex: 1,
    justifyContent: 'space-between',
  },

  articleMetaSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default HomeScreen;