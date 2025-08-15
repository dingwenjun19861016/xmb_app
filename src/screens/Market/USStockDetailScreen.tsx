import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  Linking
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import stockService, { TransformedStockData } from '../../services/StockService';
import stockLogoService from '../../services/StockLogoService';
import { useUSStockRealTimePrice } from '../../contexts/USStockRealTimePriceContext';
import { newsService, NewsArticle } from '../../services/NewsService';
import userCoinService from '../../services/UserCoinService';
import { useUser } from '../../contexts/UserContext';
import { generateStockSearchTerms, generateStockSearchTermsSync } from '../Market/USStockAlias';
import { getWebAppURL } from '../../config/apiConfig';
import { DateUtils } from '../../utils/dateUtils';
// Import components
import StockInfo from '../../components/common/StockInfo';
import InfoCard from '../../components/ui/InfoCard';
import PriceCard from '../../components/ui/PriceCard';
import ExchangeCard from '../../components/ui/ExchangeCard';
import StockPriceChart from '../../components/charts/StockPriceChart';
import SmartStockChart from '../../components/charts/SmartStockChart';
import MessageModal from '../../components/common/MessageModal';
import LoginModal from '../../components/auth/LoginModal';
import TodayHeader from '../../components/common/TodayHeader';
import CoinPosterModal from '../../components/common/CoinPosterModal';

// 美股详情页面组件

const USStockDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // 使用实时价格Context
  const { getPrice, getPriceChange, startPolling, stopPolling } = useUSStockRealTimePrice();
  
  // 使用用户Context
  const { currentUser } = useUser();
  
  // 从路由参数中获取股票代码
  let rawStockCode = 'AAPL'; // 默认股票代码
  
  if (route.params && route.params.name) {
    // 使用路由传递的股票代码（支持Web URL路由）
    rawStockCode = route.params.name;
  } else if (route.params && route.params.stockCode) {
    // 兼容旧版本传递方式
    rawStockCode = route.params.stockCode;
  }
  
  // 获取returnTo参数，用于控制返回导航
  const returnTo = route.params && route.params.returnTo ? route.params.returnTo : null;
  
  // 获取fromMarketScreen参数，用于判断是否从MarketScreen进入
  const fromMarketScreen = route.params && route.params.fromMarketScreen === true;
  
  // 标准化股票代码
  const stockCode = rawStockCode.toUpperCase();
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('24h');
  const [isFavorite, setIsFavorite] = useState(false);
  // 分层加载状态
  const [loading, setLoading] = useState(true);
  const [stockDataLoading, setStockDataLoading] = useState(true);
  const [chartDataLoading, setChartDataLoading] = useState(true);
  const [logoLoading, setLogoLoading] = useState(true);
  
  const [stockData, setStockData] = useState<TransformedStockData | null>(null);
  const [historicalData, setHistoricalData] = useState<TransformedStockData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  
  // 自选相关状态
  const [isAddingToFavorites, setIsAddingToFavorites] = useState(false);
  const [favoriteAdded, setFavoriteAdded] = useState(false);
  
  // MessageModal 状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalButtons, setModalButtons] = useState<Array<{
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress: () => void;
  }>>([]);

  // LoginModal 状态
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  
  // 分享相关状态
  const [showShareModal, setShowShareModal] = useState(false);
  
  // 获取实时价格数据
  const realTimePrice = getPrice(stockCode);
  const realTimePriceChange = getPriceChange(stockCode);
  
  // 相关资讯状态
  const [relatedNews, setRelatedNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsPage, setNewsPage] = useState(0);
  const [hasMoreNews, setHasMoreNews] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // 获取相关资讯 - 使用股票代码、名称和别名关键词
  const fetchRelatedNews = async (stockCode: string, stockName?: string, isLoadMore: boolean = false) => {
    if (!stockCode.trim()) {
      setRelatedNews([]);
      setNewsPage(0);
      setHasMoreNews(true);
      return;
    }
    
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setNewsLoading(true);
      setNewsError(null);
      setNewsPage(0);
      setHasMoreNews(true);
    }
    
    try {
      const currentPage = isLoadMore ? newsPage : 0;
      const pageSize = 20; // 每页加载20条
      const skip = currentPage * pageSize;
      
      // 生成丰富的搜索关键词，包括：
      // 1. 股票代码
      // 2. 股票名称
      // 3. USStockAlias中的别名和关键词
      const searchTerms = await generateStockSearchTerms(stockCode, stockName);
      console.log(`🔍 USStockDetailScreen: Generated search terms for ${stockCode}:`, searchTerms);
      
      // 使用主要搜索词（优先使用股票代码）进行搜索
      const primarySearchTerm = searchTerms[0] || stockCode;
      
      const results = await newsService.smartSearchNews(primarySearchTerm, pageSize, skip);
      
      if (isLoadMore) {
        // 加载更多：追加到现有列表
        setRelatedNews(prev => [...prev, ...results]);
      } else {
        // 首次加载：替换列表
        setRelatedNews(results);
      }
      
      // 更新分页状态
      setNewsPage(currentPage + 1);
      setHasMoreNews(results.length === pageSize); // 如果返回的数量少于每页大小，说明没有更多数据
      
    } catch (error) {
      console.error('❌ USStockDetailScreen: Failed to fetch related news:', error);
      if (!isLoadMore) {
        setNewsError('获取相关资讯失败，请稍后重试');
        setRelatedNews([]);
      }
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setNewsLoading(false);
      }
    }
  };

  // 加载更多资讯
  const loadMoreNews = () => {
    if (!loadingMore && hasMoreNews && !newsLoading) {
      fetchRelatedNews(stockCode, stockData?.fullName || stockData?.name, true);
    }
  };

  // 检查是否已自选
  const checkIfFavorite = async () => {
    if (!currentUser || !stockCode) {
      setIsFavorite(false);
      return;
    }

    try {
      const result = await userCoinService.getUserCoins(currentUser.email);
      if (result.success && result.data) {
        const favoriteCoinsData = result.data as any;
        const coinSymbols = favoriteCoinsData.coins.map((item: any) => item.coin.toUpperCase());
        const isStockFavorite = coinSymbols.includes(stockCode.toUpperCase());
        setIsFavorite(isStockFavorite);
      }
    } catch (error: any) {
      
      // 检查是否为登录过期错误
      if (error.message && error.message.includes('登录已过期')) {
        // 这里不自动打开登录modal，只是记录日志，让用户在主动操作时再提示
      }
      
      setIsFavorite(false);
    }
  };

  // 根据选择的时间周期获取对应的天数
  const getTimeFrameDays = (period: string): number => {
    switch (period) {
      case '24h':
        return 1; // 24小时数据
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      case '1y':
        return 365;
      case 'ALL':
        return 1000; // 使用一个大数值来表示"所有"
      default:
        return 7;
    }
  };

  // 监听用户登录状态变化
  useEffect(() => {
    checkIfFavorite();
  }, [currentUser, stockCode]);

  useEffect(() => {
    // 并行加载核心数据
    const loadCoreData = async () => {
      try {
        // 验证股票代码有效性
        if (!stockCode) {
          setError('无效的股票代码');
          setLoading(false);
          setStockDataLoading(false);
          setChartDataLoading(false);
          return;
        }
        
        setLoading(true);
        setStockDataLoading(true);
        setChartDataLoading(true);
        
        // 确保API参数格式正确
        const validStockCode = typeof stockCode === 'string' ? stockCode.toUpperCase() : 'AAPL';
        
        // 并行获取基础数据和图表数据
        const loadBasicDataPromise = stockService.getUsstockInfo(validStockCode, 1);
        
        try {
          // 首先快速获取基础股票信息
          const basicData = await loadBasicDataPromise;
          
          if (basicData && Array.isArray(basicData) && basicData.length > 0) {
            setStockData(basicData[0]); // 立即设置基本股票信息
            setStockDataLoading(false); // 基础数据加载完成
            
            // 异步加载图表数据
            loadChartData(validStockCode, basicData[0]);
            
            // 异步加载相关资讯（不阻塞主界面）
            setTimeout(() => {
              fetchRelatedNews(stockCode, basicData[0]?.fullName || basicData[0]?.name);
            }, 100);
            
          } else {
            setError('未找到该股票的数据');
            setStockDataLoading(false);
            setChartDataLoading(false);
          }
        } catch (err) {
          console.error('Failed to fetch basic stock data:', err);
          setError('Failed to load basic stock data');
          setStockDataLoading(false);
          setChartDataLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize stock data loading:', err);
        setError('Failed to initialize data loading');
        setLoading(false);
        setStockDataLoading(false);
        setChartDataLoading(false);
      } finally {
        setLoading(false);
      }
    };

    // 异步加载图表数据的函数
    const loadChartData = async (validStockCode: string, basicStockData: TransformedStockData) => {
      try {
        setChartDataLoading(true);
        
        // 如果选择24h，特殊处理
        if (selectedTimePeriod === '24h') {
          // 使用新的getUsstock24hByCode API
          const data24h = await stockService.getUsstock24hByCode(
            validStockCode,
            "1000"
          );
          
          if (data24h && data24h.length > 0) {
            // 转换24h数据为历史数据格式用于图表显示
            const convertedData = data24h.map((item, index) => {
              return {
                ...basicStockData,
                currentPrice: item.price,
                date: item.createdAt,
                created_at: item.createdAt,
                updated_at: item.createdAt,
                price: item.price,
                timestamp: new Date(item.createdAt).getTime(),
                originalIndex: index
              } as TransformedStockData;
            }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            if (convertedData && convertedData.length > 0) {
              setHistoricalData(convertedData);
            } else {
              setHistoricalData([basicStockData]);
            }
          } else {
            setHistoricalData([basicStockData]);
          }
        } else {
          // 其他时间周期使用原有逻辑
          const days = getTimeFrameDays(selectedTimePeriod);
          const data = await stockService.getUsstockInfo(validStockCode, days);
          
          if (data && Array.isArray(data) && data.length > 0) {
            setHistoricalData(data.reverse());
          } else {
            setHistoricalData([basicStockData]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch chart data:', err);
        // 图表数据加载失败时，使用基础数据作为回退
        setHistoricalData([basicStockData]);
      } finally {
        setChartDataLoading(false);
      }
    };

    loadCoreData();
  }, [stockCode, selectedTimePeriod]);

  // 管理实时价格轮询
  useEffect(() => {
    // 当组件挂载时启动轮询
    startPolling();
    
    // 组件卸载时停止轮询
    return () => {
      stopPolling();
    };
  }, []);

  // 并行加载股票图标（独立状态管理）
  useEffect(() => {
    const loadLogo = async () => {
      if (stockCode) {
        try {
          setLogoLoading(true);
          const url = stockLogoService.getLogoUrlSync(stockCode);
          setLogoUrl(url);
        } catch (error) {
          console.warn('Failed to load logo:', error);
          // 图标加载失败不影响主要功能，可以使用默认图标
        } finally {
          setLogoLoading(false);
        }
      }
    };
    
    loadLogo();
  }, [stockCode]);

  // 检查价格变化是否为正值
  const isPriceChangePositive = () => {
    if (!stockData || !stockData.priceChange24h) return true;
    // 处理不同格式的价格变化数据
    const cleanedChange = stockData.priceChange24h.replace ? 
                        stockData.priceChange24h.replace('%', '') : 
                        stockData.priceChange24h;
    return parseFloat(cleanedChange) >= 0;
  };

  // 显示MessageModal的辅助函数
  const showMessageModal = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    buttons: Array<{
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress: () => void;
    }> = [{ text: '确定', onPress: () => setModalVisible(false) }]
  ) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
    setModalButtons(buttons);
    setModalVisible(true);
  };

  // 处理自选按钮点击
  const handleFavoritePress = async () => {
    const isRemoving = isFavorite;
    const actionText = isRemoving ? '移除自选' : '添加自选';
    
    // 检查用户是否登录
    if (!currentUser) {
      showMessageModal(
        'warning',
        '需要登录',
        '请先登录账户才能管理自选股票',
        [
          { 
            text: '取消', 
            style: 'cancel',
            onPress: () => setModalVisible(false)
          },
          { 
            text: '登录',
            onPress: () => {
              setModalVisible(false);
              setLoginModalVisible(true);
            }
          }
        ]
      );
      return;
    }

    try {
      setIsAddingToFavorites(true);
      
      // 根据当前状态选择API
      const response = isRemoving 
        ? await userCoinService.removeUserCoin(currentUser.email, stockCode)
        : await userCoinService.addUserCoin(currentUser.email, stockCode);
        
      if (response.success && response.data) {
        // 更新本地状态
        setIsFavorite(!isRemoving);
        setFavoriteAdded(true);
        
        // 显示成功消息
        showMessageModal(
          'success',
          `${actionText}成功`,
          isRemoving 
            ? `${stockCode} 已从自选列表中移除`
            : `${stockCode} 已添加到自选列表`,
          [{ text: '确定', onPress: () => setModalVisible(false) }]
        );
        
        // 3秒后恢复原始状态
        setTimeout(() => {
          setFavoriteAdded(false);
        }, 3000);
      } else {
        throw new Error(response.error || `${actionText}失败`);
      }
    } catch (error: any) {
      
      // 检查是否为登录过期错误
      if (error.message && error.message.includes('登录已过期')) {
        setLoginModalVisible(true);
        return;
      }
      
      showMessageModal(
        'error',
        `${actionText}失败`,
        error.message || `${actionText}失败，请稍后重试`,
        [{ text: '确定', onPress: () => setModalVisible(false) }]
      );
    } finally {
      setIsAddingToFavorites(false);
    }
  };

  // 处理登录成功
  const handleLoginSuccess = (user) => {
    // 不需要手动关闭modal，LoginModal会自己关闭
    
    // 显示登录成功消息
    showMessageModal(
      'success',
      '登录成功',
      `欢迎回来，${user.email}！现在可以管理自选股票了。`,
      [{ text: '确定', onPress: () => setModalVisible(false) }]
    );
    
    // 登录成功后检查自选状态
    setTimeout(() => {
      checkIfFavorite();
    }, 100);
  };

  // 处理登录按钮点击
  const handleLoginPress = () => {
    setLoginModalVisible(true);
  };

  // 处理用户头像/登录按钮点击
  const handleUserPress = () => {
    if (currentUser) {
      // 用户已登录，导航到用户状态页面
      navigation.navigate('UserStatus');
    } else {
      // 未登录，显示登录模态框
      setLoginModalVisible(true);
    }
  };

  // 处理返回按钮点击 - 修复版本
  const handleBackPress = () => {
    console.log('🔙 USStockDetailScreen: 处理返回按钮点击', { fromMarketScreen, returnTo });
    
    try {
      // 首先尝试正常的导航返回
      if (navigation.canGoBack()) {
        console.log('✅ 使用 navigation.goBack()');
        navigation.goBack();
        return;
      }
      
      // 如果无法正常返回，根据来源进行处理
      if (fromMarketScreen) {
        console.log('🏠 返回到 MarketScreen');
        navigation.navigate('Market' as never);
        return;
      }
      
      if (returnTo === 'home') {
        console.log('🏠 返回到首页');
        navigation.navigate('Home' as never);
        return;
      }
      
      // Web 环境特殊处理
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const currentUrl = window.location.href;
        console.log('🌐 Web环境返回处理，当前URL:', currentUrl);
        
        if (currentUrl.includes('/market/')) {
          window.history.back();
          return;
        }
      }
      
      // 最后的保底方案
      console.log('🔙 使用保底方案：导航到Market');
      navigation.navigate('Market' as never);
      
    } catch (error) {
      console.error('❌ USStockDetailScreen: 返回处理失败:', error);
      
      // 错误情况下的最终保底
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.history.back();
      } else {
        navigation.navigate('Market' as never);
      }
    }
  };

  // Format price with dollar sign
  const formatPrice = (price: string) => {
    if (!price) return '$0';
    try {
      const numPrice = parseFloat(price);
      if (isNaN(numPrice)) return '$0';
      return `$${numPrice.toLocaleString()}`;
    } catch (e) {
      console.error('Error formatting price:', e);
      return '$0';
    }
  };

  // Format price change as percentage
  const formatPriceChange = (change: string) => {
    if (!change) return '0%';
    try {
      // Remove any existing % signs before parsing
      const cleanChange = change.replace(/%/g, '');
      const numChange = parseFloat(cleanChange);
      if (isNaN(numChange)) return '0%';
      const prefix = numChange >= 0 ? '+' : '';
      return `${prefix}${numChange.toFixed(2)}%`;
    } catch (e) {
      console.error('Error formatting price change:', e);
      return '0%';
    }
  };

  // Check if price change is positive
  const isPricePositive = (change: string) => {
    if (!change) return true;
    // Handle percentage format (e.g., "+2.34%") by removing '%' and parsing
    const cleanedChange = change.replace('%', '');
    return parseFloat(cleanedChange) >= 0;
  };
  
  // Helper function to check if stockData is valid
  const isValidStockData = (data: TransformedStockData | null): boolean => {
    if (!data) return false;
    return Boolean(
      data.name && 
      data.currentPrice && 
      data.priceChange24h &&
      !isNaN(parseFloat(data.currentPrice))
    );
  };

  // 生成分享URL的辅助函数
  const generateShareUrl = (): string => {
    return getWebAppURL(`market/${stockCode}`);
  };

  // 打开文章详情或外部网页（在当前栈内导航，保证返回到USStockDetail）
  const openArticleOrExternal = (articleId: string, article?: NewsArticle) => {
    try {
      const cleanId = articleId ? articleId.replace(/^articles\//, '') : articleId;

      // 直接在当前栈内跳转，保证 goBack() 回到股票详情
      navigation.navigate('ArticleDetail' as never, {
        articleId: cleanId,
        article,
        returnTo: 'stockDetail',
        stockCode,
      } as never);
    } catch (e) {
      // 兜底：尝试外链打开（极端情况下使用）
      const fallbackUrl = getWebAppURL(`articles/${articleId}`);
      Linking.openURL(fallbackUrl).catch(err => {
        console.error('无法打开链接', err);
        Alert.alert('无法打开文章', '请检查网络或链接是否有效');
      });
    }
  };

  // 骨架屏组件
  const SkeletonBox = ({ width, height, marginBottom = 0, borderRadius = 4 }) => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }, []);

    return (
      <Animated.View 
        style={[
          styles.skeletonBox, 
          { 
            width, 
            height, 
            marginBottom, 
            borderRadius, 
            opacity 
          }
        ]} 
      />
    );
  };

  const StockInfoSkeleton = () => (
    <View style={styles.priceSection}>
      <View style={styles.priceContainer}>
        {/* 价格信息（垂直布局） */}
        <SkeletonBox width={140} height={28} marginBottom={6} />
        <SkeletonBox width={70} height={18} />
      </View>
      {/* 右侧操作按钮骨架屏 */}
      <View style={{ marginLeft: 15, justifyContent: 'center', alignItems: 'center' }}>
        <View style={styles.actionButtonsHorizontal}>
          <View style={styles.actionButtonCompact}>
            <SkeletonBox width={20} height={20} borderRadius={10} />
          </View>
          <View style={styles.actionButtonCompact}>
            <SkeletonBox width={20} height={20} borderRadius={10} />
          </View>
        </View>
      </View>
    </View>
  );

  const ChartSkeleton = () => (
    <View style={styles.chartSection}>
      {/* 价格/排名切换标签 - 两个并排 */}
      <View style={styles.chartTabsContainer}>
        <View style={styles.chartTabsRow}>
          <View style={styles.chartTab}>
            <SkeletonBox width={60} height={32} borderRadius={6} />
          </View>
          <View style={styles.chartTab}>
            <SkeletonBox width={60} height={32} borderRadius={6} />
          </View>
        </View>
      </View>
      
      {/* 时间周期按钮 - 水平排列 */}
      <View style={styles.periodButtonsContainer}>
        {['24h', '7d', '30d', '90d', '1y', 'ALL'].map((period) => (
          <SkeletonBox 
            key={period} 
            width={42} 
            height={28} 
            borderRadius={14}
          />
        ))}
      </View>
      
      {/* 图表区域 */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <SkeletonBox width="100%" height={280} borderRadius={8} />
      </View>
    </View>
  );

  // 完整页面骨架屏 - 精确匹配真实布局
  const FullPageSkeleton = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* 股票价格信息骨架屏 */}
      <StockInfoSkeleton />
      
      {/* 图表区域骨架屏 */}
      <ChartSkeleton />
      
      {/* 信息卡片骨架屏 - 精确的2x3网格布局 */}
      <View style={styles.infoCardsContainer}>
        {/* 第一行：市值 + 24h成交量 */}
        <View style={styles.infoCardRow}>
          <View style={styles.infoCard}>
            <SkeletonBox width={30} height={12} marginBottom={6} />
            <SkeletonBox width={70} height={18} />
          </View>
          <View style={styles.infoCard}>
            <SkeletonBox width={60} height={12} marginBottom={6} />
            <SkeletonBox width={55} height={18} />
          </View>
        </View>
        
        {/* 第二行：总市值 + 总供应量 */}
        <View style={styles.infoCardRow}>
          <View style={styles.infoCard}>
            <SkeletonBox width={35} height={12} marginBottom={6} />
            <SkeletonBox width={80} height={18} />
          </View>
          <View style={styles.infoCard}>
            <SkeletonBox width={50} height={12} marginBottom={6} />
            <SkeletonBox width={65} height={18} />
          </View>
        </View>
        
        {/* 第三行：流通供应量 + 空位 */}
        <View style={styles.infoCardRow}>
          <View style={styles.infoCard}>
            <SkeletonBox width={55} height={12} marginBottom={6} />
            <SkeletonBox width={65} height={18} />
          </View>
          <View style={styles.infoCard}>
            {/* 空卡片保持布局平衡 */}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  // 处理分享按钮点击
  const handleSharePress = () => {
    console.log('🔄 USStockDetailScreen: 分享按钮被点击');
    setShowShareModal(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          {/* 股票图标 */}
          <View style={styles.headerLogoContainer}>
            {logoLoading ? (
              <View style={styles.headerLogoPlaceholder} />
            ) : logoUrl ? (
              <Image 
                source={{ uri: logoUrl }} 
                style={styles.headerLogo}
                onError={() => console.warn('Failed to load stock logo')}
              />
            ) : (
              <View style={styles.headerLogoPlaceholder}>
                <Text style={styles.headerLogoPlaceholderText}>
                  {(stockData?.name || stockCode).slice(0, 2)}
                </Text>
              </View>
            )}
          </View>
          
          {/* 股票名称信息 */}
          <View style={styles.headerTitleInfo}>
            <Text style={styles.headerTitle} numberOfLines={2} ellipsizeMode="tail">
              {stockData?.fullName || stockData?.name || stockCode}
            </Text>
            <Text style={styles.headerSymbol}>{stockData?.name || stockCode}</Text>
          </View>
        </View>
        <View style={styles.headerRightContainer}>
          {currentUser ? (
            <TouchableOpacity 
              style={styles.userButton}
              onPress={handleUserPress}
            >
              <Ionicons name="person-circle" size={26} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={handleLoginPress}
            >
              <Text style={styles.loginButtonText}>登录</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && !stockData ? (
        // 首次加载使用完整骨架屏替代简单loading
        <FullPageSkeleton />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              setStockDataLoading(true);
              setChartDataLoading(true);
              setError(null);
              // 触发重新加载
              const fetchData = async () => {
                try {
                  const validStockCode = typeof stockCode === 'string' ? stockCode.toUpperCase() : 'AAPL';
                  const basicData = await stockService.getUsstockInfo(validStockCode, 1);
                  if (basicData && Array.isArray(basicData) && basicData.length > 0) {
                    setStockData(basicData[0]);
                    setStockDataLoading(false);
                  }
                } catch (err) {
                  setError('Failed to load stock data');
                } finally {
                  setLoading(false);
                  setStockDataLoading(false);
                  setChartDataLoading(false);
                }
              };
              fetchData();
            }}
          >
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Price and Action Buttons Section - 价格和操作按钮整合区域 */}
          {stockDataLoading ? (
            <StockInfoSkeleton />
          ) : stockData && isValidStockData(stockData) ? (
            <StockInfo
              stockName={stockData.name || stockCode}
              stockSymbol={stockCode}
              currentPrice={(() => {
                // 优先使用实时价格，如果没有则使用API返回的价格
                const realTimePrice = getPrice(stockCode);
                if (realTimePrice) {
                  return `$${realTimePrice.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6
                  })}`;
                }
                return formatPrice(stockData.currentPrice);
              })()}
              priceChange24h={formatPriceChange(stockData.priceChange24h)}
              isPositive={isPricePositive(stockData.priceChange24h)}
              logoUrl={logoLoading ? '' : logoUrl}
              priceChangeDirection={getPriceChange(stockCode)}
              renderActionButtons={() => (
                <View style={styles.actionButtonsHorizontal}>
                  <TouchableOpacity 
                    style={styles.actionButtonCompact}
                    onPress={handleFavoritePress}
                    disabled={isAddingToFavorites || favoriteAdded}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={
                        favoriteAdded 
                          ? "checkmark-circle"
                          : isAddingToFavorites 
                            ? "hourglass-outline"
                            : isFavorite 
                              ? "star"
                              : "star-outline"
                      } 
                      size={22} 
                      color={
                        favoriteAdded 
                          ? "#34C759"
                          : isAddingToFavorites 
                            ? "#999"
                            : isFavorite 
                              ? "#FFD700"
                              : "#007AFF"
                      }
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButtonCompact}
                    onPress={handleSharePress}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="share-outline" size={22} color="#007AFF" />
                  </TouchableOpacity>
                </View>
              )}
            />
          ) : (
            <StockInfoSkeleton />
          )}


        {/* Chart */}
        {chartDataLoading ? (
          <ChartSkeleton />
        ) : (
          <View style={styles.chartSection}>
            <SmartStockChart 
              historicalData={historicalData}
              selectedTimePeriod={selectedTimePeriod}
              onTimePeriodChange={setSelectedTimePeriod}
              isPositive={isPriceChangePositive()}
              showRankChart={true}
              stockCode={stockCode}
            />
          </View>
        )}

        {/* Info Cards */}
        <View style={styles.infoCardsContainer}>
          {stockData && (
            <>
              <InfoCard 
                label="市值" 
                value={stockData.marketcap || 'N/A'} 
              />
              <InfoCard 
                label="24h成交量" 
                value={stockData.volume || 'N/A'} 
              />
              <InfoCard 
                label="总市值" 
                value={stockData.fdv || 'N/A'} 
              />
              <InfoCard 
                label="总供应量" 
                value={stockData.totalSupply || 'N/A'} 
              />
              <InfoCard 
                label="流通供应量" 
                value={stockData.circulatingSupply || 'N/A'} 
              />
            </>
          )}
        </View>
        
        {/* 相关资讯 */}
        <View style={styles.newsSection}>
          <Text style={styles.sectionTitle}>相关资讯</Text>
          
          {newsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>搜索相关资讯...</Text>
            </View>
          ) : newsError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={24} color="#FF6B6B" />
              <Text style={styles.errorText}>{newsError}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => fetchRelatedNews(stockCode, stockData?.fullName || stockData?.name)}
              >
                <Text style={styles.retryButtonText}>重试</Text>
              </TouchableOpacity>
            </View>
          ) : relatedNews.length > 0 ? (
            <>
              {relatedNews.map((article, index) => (
                <TouchableOpacity 
                  key={article.id} 
                  style={styles.newsItem}
                  onPress={() => openArticleOrExternal(article.id)}
                >
                  <View style={styles.newsContent}>
                    <Text style={styles.newsTitle} numberOfLines={2}>
                      {article.title}
                    </Text>
                    <View style={styles.newsFooter}>
                      <Text style={styles.newsDate}>
                        {article.date || '刚刚'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
              
              {/* 加载更多按钮 */}
              {hasMoreNews ? (
                <TouchableOpacity 
                  style={styles.loadMoreButton}
                  onPress={loadMoreNews}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <View style={styles.loadingMoreContainer}>
                      <ActivityIndicator size="small" color="#007AFF" />
                      <Text style={styles.loadingMoreText}>正在加载更多...</Text>
                    </View>
                  ) : (
                    <Text style={styles.loadMoreButtonText}>加载更多资讯</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.noMoreDataContainer}>
                  <Text style={styles.noMoreDataText}>— 没有更多数据了 —</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyNewsContainer}>
              <Ionicons name="newspaper-outline" size={30} color="#CCC" />
              <Text style={styles.emptyNewsText}>暂无相关资讯</Text>
            </View>
          )}
        </View>
      </ScrollView>
      )}
      
      {/* MessageModal */}
      <MessageModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        buttons={modalButtons}
        onClose={() => setModalVisible(false)}
      />
      
      {/* LoginModal */}
      <LoginModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      
      {/* CoinPosterModal - 复用现有组件，但传入股票数据 */}
      <CoinPosterModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        coinSymbol={stockCode}
        coinName={stockData?.fullName || stockData?.name || stockCode}
        currentPrice={realTimePrice || stockData?.currentPrice}
        priceChange24h={stockData?.priceChangePercent}
        logoUrl={logoUrl}
        coinUrl={generateShareUrl()}
        onShowMessage={showMessageModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // 与HomeScreen和MarketScreen保持一致
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 44 : 24, // 减少头部高度，与TodayHeader保持一致
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    minHeight: 50, // 确保有足够高度容纳长名称
  },
  headerLogoContainer: {
    marginRight: 12,
    flexShrink: 0, // 防止logo被压缩
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogoPlaceholderText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerTitleInfo: {
    alignItems: 'center',
    flex: 1,
    maxWidth: '100%', // 确保不超出容器
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    flexShrink: 1, // 允许文本收缩
    numberOfLines: 2, // 允许最多两行
  },
  headerSymbol: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textAlign: 'center',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 10,
  },
  priceContainer: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  priceArrow: {
    marginLeft: 8,
  },
  actionButtonsHorizontal: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },

  changeText: {
    fontSize: 16,
    marginTop: 5,
  },
  chartSection: {
    backgroundColor: 'white',
    marginBottom: 10,
  },
  infoCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
    marginBottom: 10,
  },
  infoCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  infoCardLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoCardSubvalue: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  linksContainer: {
    flexDirection: 'row',
    marginTop: 15,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  linkText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 5,
  },
  newsSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 20,
  },
  newsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  newsContent: {
    flex: 1,
    marginRight: 10,
  },
  newsTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 5,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  newsDate: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyNewsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyNewsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  noMoreDataContainer: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  noMoreDataText: {
    fontSize: 14,
    color: '#999',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  loadMoreButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  loadMoreButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  // 骨架屏样式
  skeletonContainer: {
    padding: 20,
    alignItems: 'center',
  },
  skeletonBox: {
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  // 价格区域布局样式
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  // 图表标签样式
  chartTabsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  chartTabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  chartTab: {
    alignItems: 'center',
  },
  infoCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
});

export default USStockDetailScreen;
