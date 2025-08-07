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
  Animated
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import coinInfoService, { CoinInfo } from '../../services/CoinInfoService';
import coinLogoService from '../../services/CoinLogoService';
import { useRealTimePrice } from '../../contexts/RealTimePriceContext';
import { newsService, NewsArticle } from '../../services/NewsService';
import userCoinService from '../../services/UserCoinService';
import { useUser } from '../../contexts/UserContext';
import { resolveCoinSymbol, resolveCoinSymbolSync } from '../Market/CoinAlias';
import { getWebAppURL } from '../../config/apiConfig';
import { DateUtils } from '../../utils/dateUtils';
// Import components
import CoinInfoComponent from '../../components/common/CoinInfo';
import InfoCard from '../../components/ui/InfoCard';
import PriceCard from '../../components/ui/PriceCard';
import ExchangeCard from '../../components/ui/ExchangeCard';
import CoinPriceChart from '../../components/charts/CoinPriceChart';
import MessageModal from '../../components/common/MessageModal';
import LoginModal from '../../components/auth/LoginModal';
import TodayHeader from '../../components/common/TodayHeader';
import CoinPosterModal from '../../components/common/CoinPosterModal';

// 币种详情页面组件

const CoinDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // 使用实时价格Context
  const { getPrice, getPriceChange, startPolling, stopPolling } = useRealTimePrice();
  
  // 使用用户Context
  const { currentUser } = useUser();
  
  // URL编码/解码辅助函数，用于处理包含空格的fullName
  const encodeFullName = (fullName: string): string => {
    return encodeURIComponent(fullName);
  };
  
  const decodeFullName = (encodedFullName: string): string => {
    try {
      return decodeURIComponent(encodedFullName);
    } catch (error) {
      console.warn('Failed to decode fullName:', error);
      return encodedFullName;
    }
  };
  
  // 从路由参数中获取name和fullName
  let rawCoinName = 'BTC'; // 默认币种符号
  let routeFullName: string | null = null; // 路由中的fullName
  
  if (route.params && route.params.name) {
    // 使用路由传递的币种符号/名称（支持Web URL路由）
    rawCoinName = route.params.name;
  } else if (route.params && route.params.coinId) {
    // 兼容旧版本传递方式
    rawCoinName = route.params.coinId;
  }
  
  // 获取fullName参数（如果存在）
  if (route.params && route.params.fullName) {
    routeFullName = decodeFullName(route.params.fullName);
  }
  
  // 获取returnTo参数，用于控制返回导航
  const returnTo = route.params && route.params.returnTo ? route.params.returnTo : null;
  
  // 获取fromMarketScreen参数，用于判断是否从MarketScreen进入
  const fromMarketScreen = route.params && route.params.fromMarketScreen === true;
  
  // 标准化币种符号（同步版本，用于初始显示）
  const coinName = resolveCoinSymbolSync(rawCoinName);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('24h');
  const [isFavorite, setIsFavorite] = useState(false);
  // 分层加载状态
  const [loading, setLoading] = useState(true);
  const [coinDataLoading, setCoinDataLoading] = useState(true);
  const [chartDataLoading, setChartDataLoading] = useState(true);
  const [logoLoading, setLogoLoading] = useState(true);
  
  const [coinData, setCoinData] = useState<CoinInfo | null>(null);
  const [historicalData, setHistoricalData] = useState<CoinInfo[]>([]);
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
  const realTimePrice = getPrice(coinName);
  const realTimePriceChange = getPriceChange(coinName);
  
  // 相关资讯状态
  const [relatedNews, setRelatedNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsPage, setNewsPage] = useState(0);
  const [hasMoreNews, setHasMoreNews] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // 获取相关资讯
  const fetchRelatedNews = async (searchTerm: string, isLoadMore: boolean = false) => {
    if (!searchTerm.trim()) {
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
      
      // 使用异步版本标准化搜索词，确保远程配置也能被应用
      const standardizedSearchTerm = await resolveCoinSymbol(searchTerm);
      
      const results = await newsService.smartSearchNews(standardizedSearchTerm, pageSize, skip);
      
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
      fetchRelatedNews(coinName, true);
    }
  };

  // 检查是否已自选
  const checkIfFavorite = async () => {
    if (!currentUser || !coinName) {
      setIsFavorite(false);
      return;
    }

    try {
      const result = await userCoinService.getUserCoins(currentUser.email);
      if (result.success && result.data) {
        const favoriteCoinsData = result.data as any;
        const coinSymbols = favoriteCoinsData.coins.map((item: any) => item.coin.toUpperCase());
        const isCoinFavorite = coinSymbols.includes(coinName.toUpperCase());
        setIsFavorite(isCoinFavorite);
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
  }, [currentUser, coinName]);

  useEffect(() => {
    // 并行加载核心数据
    const loadCoreData = async () => {
      try {
        // 验证币种名称有效性
        if (!coinName) {
          setError('无效的币种标识符');
          setLoading(false);
          setCoinDataLoading(false);
          setChartDataLoading(false);
          return;
        }
        
        setLoading(true);
        setCoinDataLoading(true);
        setChartDataLoading(true);
        
        // 确保API参数格式正确
        const validCoinName = typeof coinName === 'string' ? coinName.toUpperCase() : 'BTC';
        
        // 并行获取基础数据和图表数据
        const loadBasicDataPromise = coinInfoService.getCoinInfo(validCoinName, 1, routeFullName || undefined);
        
        try {
          // 首先快速获取基础币种信息
          const basicData = await loadBasicDataPromise;
          
          if (basicData && Array.isArray(basicData) && basicData.length > 0) {
            setCoinData(basicData[0]); // 立即设置基本币种信息
            setCoinDataLoading(false); // 基础数据加载完成
            
            // 异步加载图表数据
            loadChartData(validCoinName, basicData[0]);
            
            // 异步加载相关资讯（不阻塞主界面）
            setTimeout(() => {
              fetchRelatedNews(coinName);
            }, 100);
            
          } else {
            setError('未找到该币种的数据');
            setCoinDataLoading(false);
            setChartDataLoading(false);
          }
        } catch (err) {
          console.error('Failed to fetch basic coin data:', err);
          setError('Failed to load basic coin data');
          setCoinDataLoading(false);
          setChartDataLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize coin data loading:', err);
        setError('Failed to initialize data loading');
        setLoading(false);
        setCoinDataLoading(false);
        setChartDataLoading(false);
      } finally {
        setLoading(false);
      }
    };

    // 异步加载图表数据的函数
    const loadChartData = async (validCoinName: string, basicCoinData: CoinInfo) => {
      try {
        setChartDataLoading(true);
        
        // 如果选择24h，特殊处理
        if (selectedTimePeriod === '24h') {
          // 使用新的getCoin24hByName API，传递name, fullName和count参数
          const coinFullName = route.params?.fullName || basicCoinData.fullName;
          const data24h = await coinInfoService.getCoin24hData(
            validCoinName,
            coinFullName,
            "1000"
          );
          
          if (data24h && data24h.length > 0) {
            // 转换24h数据为历史数据格式用于图表显示
            const convertedData = data24h.map((item, index) => {
              return {
                ...basicCoinData,
                currentPrice: item.price.toString(),
                date: item.createdAt,
                created_at: item.createdAt,
                updated_at: item.updatedAt || item.createdAt,
                price: item.price.toString(),
                timestamp: new Date(item.createdAt).getTime(),
                originalIndex: index
              };
            }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            if (convertedData && convertedData.length > 0) {
              setHistoricalData(convertedData);
            } else {
              setHistoricalData([basicCoinData]);
            }
          } else {
            setHistoricalData([basicCoinData]);
          }
        } else {
          // 其他时间周期使用原有逻辑
          const days = getTimeFrameDays(selectedTimePeriod);
          const data = await coinInfoService.getCoinInfo(validCoinName, days, basicCoinData?.fullName);
          
          if (data && Array.isArray(data) && data.length > 0) {
            setHistoricalData(data.reverse());
          } else {
            setHistoricalData([basicCoinData]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch chart data:', err);
        // 图表数据加载失败时，使用基础数据作为回退
        setHistoricalData([basicCoinData]);
      } finally {
        setChartDataLoading(false);
      }
    };

    loadCoreData();
  }, [coinName, selectedTimePeriod]);

  // 管理实时价格轮询
  useEffect(() => {
    // 当组件挂载时启动轮询
    startPolling();
    
    // 组件卸载时停止轮询
    return () => {
      stopPolling();
    };
  }, []);

  // 并行加载币种图标（独立状态管理）
  useEffect(() => {
    const loadLogo = async () => {
      if (coinName) {
        try {
          setLogoLoading(true);
          const url = await coinLogoService.getLogoUrl(coinName);
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
  }, [coinName]);

  // 检查价格变化是否为正值
  const isPriceChangePositive = () => {
    if (!coinData || !coinData.priceChange24h) return true;
    // 处理不同格式的价格变化数据
    const cleanedChange = coinData.priceChange24h.replace ? 
                        coinData.priceChange24h.replace('%', '') : 
                        coinData.priceChange24h;
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
        '请先登录账户才能管理自选币种',
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
        ? await userCoinService.removeUserCoin(currentUser.email, coinName)
        : await userCoinService.addUserCoin(currentUser.email, coinName);
        
      if (response.success && response.data) {
        // 更新本地状态
        setIsFavorite(!isRemoving);
        setFavoriteAdded(true);
        
        // 显示成功消息
        showMessageModal(
          'success',
          `${actionText}成功`,
          isRemoving 
            ? `${coinName} 已从自选列表中移除`
            : `${coinName} 已添加到自选列表`,
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
      `欢迎回来，${user.email}！现在可以管理自选币种了。`,
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

  // 处理返回按钮点击 - 支持returnTo参数
  const handleBackPress = () => {
    // Web环境下的修复方案
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const currentUrl = window.location.href;
      console.log('📍 当前URL:', currentUrl);
      
      // 如果是从MarketScreen进入的，使用与"行情"tab相同的逻辑返回到MarketScreen
      if (fromMarketScreen) {
        try {
          navigation.goBack();
          return;
        } catch (error) {
          console.error('❌ CoinDetailScreen: 返回到MarketScreen失败:', error);
        }
      }
      
      // 如果returnTo参数是home，则返回到首页
      if (returnTo === 'home') {
        try {
          navigation.goBack();
          return;
        } catch (urlError) {
          console.error('❌ CoinDetailScreen: 返回到首页失败:', urlError);
        }
      }
      
      // 没有returnTo参数，默认回到行情列表
      if (currentUrl.includes('/market/')) {
        try {
          const url = new URL(currentUrl);
          const targetUrl = `${url.origin}/market`;          
          // 直接导航到目标页面
          window.location.href = targetUrl;
          return;
        } catch (urlError) {
          console.error('❌ CoinDetailScreen: URL解析失败:', urlError);
        }
      }
      
      // 如果URL解析失败，尝试使用相对路径
      console.log('🔧 使用相对路径导航');
      window.location.href = '/market';
      return;
    }
    
    navigation.goBack();
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
  
  // Helper function to check if coinData is valid
  const isValidCoinData = (data: CoinInfo | null): boolean => {
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
    const fullName = coinData?.fullName || routeFullName;
    if (fullName) {
      const encodedFullName = encodeFullName(fullName);
      return getWebAppURL(`market/${coinName}?fullName=${encodedFullName}`);
    }
    return getWebAppURL(`market/${coinName}`);
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

  const CoinInfoSkeleton = () => (
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
      {/* 币种价格信息骨架屏 */}
      <CoinInfoSkeleton />
      
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
      
      {/* 交易所信息区域骨架屏 */}
      <View style={styles.exchangeSection}>
        <View style={styles.exchangeSectionHeader}>
          <SkeletonBox width={80} height={18} />
          <SkeletonBox width={70} height={14} />
        </View>
      </View>
    </ScrollView>
  );

  // 处理分享按钮点击
  const handleSharePress = () => {
    console.log('🔄 CoinDetailScreen: 分享按钮被点击');
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
          {/* 币种图标 */}
          <View style={styles.headerLogoContainer}>
            {logoLoading ? (
              <View style={styles.headerLogoPlaceholder} />
            ) : logoUrl ? (
              <Image 
                source={{ uri: logoUrl }} 
                style={styles.headerLogo}
                onError={() => console.warn('Failed to load coin logo')}
              />
            ) : (
              <View style={styles.headerLogoPlaceholder}>
                <Text style={styles.headerLogoPlaceholderText}>
                  {(coinData?.name || coinName).slice(0, 2)}
                </Text>
              </View>
            )}
          </View>
          
          {/* 币种名称信息 */}
          <View style={styles.headerTitleInfo}>
            <Text style={styles.headerTitle} numberOfLines={2} ellipsizeMode="tail">
              {coinData?.fullName || coinData?.name || coinName}
            </Text>
            <Text style={styles.headerSymbol}>{coinData?.name || coinName}</Text>
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

      {loading && !coinData ? (
        // 首次加载使用完整骨架屏替代简单loading
        <FullPageSkeleton />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              setCoinDataLoading(true);
              setChartDataLoading(true);
              setError(null);
              // 触发重新加载
              const fetchData = async () => {
                try {
                  const validCoinName = typeof coinName === 'string' ? coinName.toUpperCase() : 'BTC';
                  const basicData = await coinInfoService.getCoinInfo(validCoinName, 1, routeFullName || coinData?.fullName || undefined);
                  if (basicData && Array.isArray(basicData) && basicData.length > 0) {
                    setCoinData(basicData[0]);
                    setCoinDataLoading(false);
                  }
                } catch (err) {
                  setError('Failed to load coin data');
                } finally {
                  setLoading(false);
                  setCoinDataLoading(false);
                  setChartDataLoading(false);
                }
              };
              fetchData();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Price and Action Buttons Section - 价格和操作按钮整合区域 */}
          {coinDataLoading ? (
            <CoinInfoSkeleton />
          ) : coinData && isValidCoinData(coinData) ? (
            <CoinInfoComponent
              coinName={coinData.name || coinName}
              coinSymbol={coinName}
              currentPrice={(() => {
                // 优先使用实时价格，如果没有则使用API返回的价格
                const realTimePrice = getPrice(coinName);
                if (realTimePrice) {
                  return `$${realTimePrice.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6
                  })}`;
                }
                return formatPrice(coinData.currentPrice);
              })()}
              priceChange24h={formatPriceChange(coinData.priceChange24h)}
              isPositive={isPricePositive(coinData.priceChange24h)}
              logoUrl={logoLoading ? '' : logoUrl}
              priceChangeDirection={getPriceChange(coinName)}
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
            <CoinInfoSkeleton />
          )}


        {/* Chart */}
        {chartDataLoading ? (
          <ChartSkeleton />
        ) : (
          <View style={styles.chartSection}>
            <CoinPriceChart 
              historicalData={historicalData}
              selectedTimePeriod={selectedTimePeriod}
              onTimePeriodChange={setSelectedTimePeriod}
              isPositive={isPriceChangePositive()}
              showRankChart={true}
            />
          </View>
        )}

        {/* Info Cards */}
        <View style={styles.infoCardsContainer}>
          {coinData && (
            <>
              <InfoCard 
                label="市值" 
                value={coinData.marketcap || 'N/A'} 
              />
              <InfoCard 
                label="24h成交量" 
                value={coinData.volume || 'N/A'} 
              />
              <InfoCard 
                label="总市值" 
                value={coinData.fdv || 'N/A'} 
              />
              <InfoCard 
                label="总供应量" 
                value={coinData.totalSupply || 'N/A'} 
              />
              <InfoCard 
                label="流通供应量" 
                value={coinData.circulatingSupply || 'N/A'} 
              />
            </>
          )}
        </View>

        {/* Exchange Info */}
        {coinData && coinData.cexInfos && coinData.cexInfos.length > 0 && (
          <View style={styles.exchangeSection}>
            <View style={styles.exchangeSectionHeader}>
              <Text style={styles.sectionTitle}>交易所信息</Text>
              <Text style={styles.exchangeTip}>点击前往交易</Text>
            </View>
            {coinData.cexInfos.map((exchange, index) => (
              <ExchangeCard key={index} exchangeInfo={exchange} />
            ))}
          </View>
        )}
        
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
                onPress={() => fetchRelatedNews(coinName)}
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
                  onPress={() => navigation.navigate('ArticleDetail', { 
                    articleId: article.id,
                    returnTo: 'coinDetail',
                    coinName: coinName
                  })}
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
      
      {/* CoinPosterModal */}
      <CoinPosterModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        coinSymbol={coinName}
        coinName={coinData?.fullName || coinData?.name || coinName}
        currentPrice={realTimePrice || coinData?.current_price}
        priceChange24h={coinData?.price_change_percentage_24h}
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
  exchangeSection: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  exchangeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  exchangeTip: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '400',
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

export default CoinDetailScreen;