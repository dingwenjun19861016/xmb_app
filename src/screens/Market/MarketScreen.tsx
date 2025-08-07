import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
  Animated
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import CoinCard, { CoinCardData } from '../../components/ui/CoinCard';

// 骨架屏组件 - 带动画效果
const SkeletonCard = () => {
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
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonRow}>
        <Animated.View style={[styles.skeletonRank, { opacity }]} />
        <Animated.View style={[styles.skeletonIcon, { opacity }]} />
        <View style={styles.skeletonInfo}>
          <Animated.View style={[styles.skeletonName, { opacity }]} />
          <Animated.View style={[styles.skeletonSymbol, { opacity }]} />
        </View>
        <View style={styles.skeletonPrice}>
          <Animated.View style={[styles.skeletonPriceValue, { opacity }]} />
          <Animated.View style={[styles.skeletonChange, { opacity }]} />
        </View>
      </View>
    </View>
  );
};

// 骨架屏列表组件
const SkeletonList = ({ count = 10 }: { count?: number }) => (
  <View style={styles.skeletonContainer}>
    {Array.from({ length: count }, (_, index) => (
      <SkeletonCard key={index} />
    ))}
  </View>
);

import marketService, { CoinData } from '../../services/MarketService';
import stockService from '../../services/StockService';
import coinLogoService from '../../services/CoinLogoService';
import stockLogoService from '../../services/StockLogoService';
import userCoinService from '../../services/UserCoinService';
import configService from '../../services/ConfigService';
import { useRealTimePrice } from '../../contexts/RealTimePriceContext';
import { useUser } from '../../contexts/UserContext';
import MessageModal from '../../components/common/MessageModal';
import LoginModal from '../../components/auth/LoginModal';
import TodayHeader from '../../components/common/TodayHeader';
import ShareModal from '../../components/common/ShareModal';
import { getWebAppURL } from '../../config/apiConfig';

// UI 颜色常量
const UI_COLORS = {
  primary: '#007AFF',
  background: '#f2f2f7',
  cardBackground: '#ffffff',
  text: '#1c1c1e',
  secondaryText: '#8e8e93',
  border: '#e5e5ea',
  shadow: 'rgba(0, 0, 0, 0.1)',
  success: '#34C759',
  danger: '#FF3B30',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white', // 改为白色，消除间隙
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 4, // 减少顶部边距，与HomeScreen保持一致
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
  filtersContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  filtersWrapper: {
    position: 'relative',
  },
  sortOptionsList: {
    paddingHorizontal: 16,
    paddingRight: 40, // 为右侧指示器留出空间
  },
  scrollIndicator: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -12 }],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scrollIndicatorText: {
    fontSize: 12,
    color: UI_COLORS.primary,
    fontWeight: '600',
  },
  gradientMask: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
  sortOption: {
    backgroundColor: UI_COLORS.background,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  selectedSortOption: {
    backgroundColor: UI_COLORS.primary,
    borderColor: UI_COLORS.primary,
  },
  sortOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortOptionText: {
    fontSize: 14,
    color: UI_COLORS.text,
    fontWeight: '600',
  },
  selectedSortOptionText: {
    color: 'white',
  },
  sortArrow: {
    marginLeft: 4,
  },
  listHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: UI_COLORS.cardBackground,
    borderBottomWidth: 2,
    borderBottomColor: UI_COLORS.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rankHeader: {
    width: 55,
    fontSize: 14,
    color: UI_COLORS.secondaryText,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nameHeader: {
    flex: 1,
    fontSize: 13,
    color: UI_COLORS.secondaryText,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceHeader: {
    width: 120,
    fontSize: 13,
    color: UI_COLORS.secondaryText,
    fontWeight: '700',
    textAlign: 'right',
    letterSpacing: 0.5,
  },
  coinsList: {
    paddingBottom: 20,
    backgroundColor: 'white', // 改为白色，与容器背景一致
  },
  coinsListEmpty: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    backgroundColor: UI_COLORS.cardBackground,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: UI_COLORS.secondaryText,
  },
  footerLoading: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: UI_COLORS.secondaryText,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    backgroundColor: UI_COLORS.cardBackground,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: UI_COLORS.secondaryText,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: UI_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: UI_COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // 分组标题样式 - 统一设计
  sectionHeader: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    marginTop: 8,
  },
  // 自选标题样式
  favoritesHeader: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
    borderLeftWidth: 3,
    borderLeftColor: UI_COLORS.primary,
  },
  // 普通分组标题
  normalHeader: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  favoritesCount: {
    fontSize: 13,
    color: UI_COLORS.primary,
    fontWeight: '500',
    marginLeft: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: UI_COLORS.primary,
    marginLeft: 4,
  },
  sectionCount: {
    fontSize: 14,
    color: UI_COLORS.secondaryText,
    fontWeight: '500',
    marginRight: 8,
  },
  expandIcon: {
    marginLeft: 8,
  },
  // 骨架屏样式
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  skeletonCard: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  skeletonRank: {
    width: 50,
    height: 20,
    backgroundColor: '#D0D0D0',
    borderRadius: 10,
    marginRight: 12,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#D0D0D0',
    borderRadius: 20,
    marginRight: 12,
  },
  skeletonInfo: {
    flex: 1,
  },
  skeletonName: {
    width: '60%',
    height: 14,
    backgroundColor: '#D0D0D0',
    borderRadius: 7,
    marginBottom: 6,
  },
  skeletonSymbol: {
    width: '40%',
    height: 12,
    backgroundColor: '#D0D0D0',
    borderRadius: 6,
  },
  skeletonPrice: {
    width: 100,
    alignItems: 'flex-end',
  },
  skeletonPriceValue: {
    width: '80%',
    height: 16,
    backgroundColor: '#D0D0D0',
    borderRadius: 8,
    marginBottom: 4,
  },
  skeletonChange: {
    width: '60%',
    height: 14,
    backgroundColor: '#D0D0D0',
    borderRadius: 7,
  },
});

// 防抖Hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    console.log('🔍 useDebounce: Effect triggered:', { value, delay, currentDebouncedValue: debouncedValue });
    
    const handler = setTimeout(() => {
      console.log('🔍 useDebounce: Timeout fired, setting debouncedValue to:', value);
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      console.log('🔍 useDebounce: Cleanup timeout');
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  console.log('🔍 useDebounce: Returning debouncedValue:', debouncedValue);
  return debouncedValue;
};

const MarketScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // 使用实时价格Context
  const { realTimePrices, priceChanges, startPolling, stopPolling } = useRealTimePrice();
  
  // 使用用户Context
  const { currentUser, logout } = useUser();
  
  const [searchText, setSearchText] = useState('');
  const [selectedSort, setSelectedSort] = useState('市值');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [coins, setCoins] = useState<CoinCardData[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 美股相关状态
  const [usStocks, setUsStocks] = useState<CoinCardData[]>([]);
  const [usStocksLoading, setUsStocksLoading] = useState(false);
  const [usStocksError, setUsStocksError] = useState<string | null>(null);

  // 防抖搜索文本
  const debouncedSearchText = useDebounce(searchText, 500);
  const [searchResults, setSearchResults] = useState<CoinCardData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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

  // 用户自选币种状态
  const [userFavoriteCoins, setUserFavoriteCoins] = useState<Set<string>>(new Set());
  const [loadingUserCoins, setLoadingUserCoins] = useState(false);
  const [isFavoritesExpanded, setIsFavoritesExpanded] = useState(false); // 自选分组展开状态，默认收起
  const [favoriteCoinsData, setFavoriteCoinsData] = useState<CoinCardData[]>([]); // 自选币种的完整数据
  const [favoritesSortOrder, setFavoritesSortOrder] = useState<'asc' | 'desc' | 'none'>('none'); // 自选分组排序状态（初始化后会被配置覆盖）

  // 配置相关状态 - 美股APP专用，去掉独立的"美股"按钮
  const [sortOptionsLabels, setSortOptionsLabels] = useState(['市值', '涨跌幅', '24h成交量', '价格']); // 美股APP简化标签
  const [configsLoaded, setConfigsLoaded] = useState(false); // 配置是否已加载
  
  // 分享相关状态
  const [shareModalVisible, setShareModalVisible] = useState(false);
  
  // UI文本配置状态
  const [headerTitle, setHeaderTitle] = useState('行情');
  const [searchPlaceholder, setSearchPlaceholder] = useState('搜索加密货币...');
  const [favoritesTitle, setFavoritesTitle] = useState('我的自选');
  const [allCoinsTitle, setAllCoinsTitle] = useState('全部币种');
  const [listHeaders, setListHeaders] = useState(['#', '名称', '价格/24h']);
  const [listHeadersEnabled, setListHeadersEnabled] = useState(true); // 表头显示开关

  // 性能配置状态
  const [pageSize, setPageSize] = useState(100);
  
  // 优化加载状态 - 渐进式分批加载
  const [initialBatchSize] = useState(10); // 首次快速加载的数量
  const [progressiveBatchSize] = useState(10); // 渐进式每批加载的数量
  const [totalInitialBatches] = useState(10); // 初始总批次数 (0-100条数据)
  const [isProgressiveLoading, setIsProgressiveLoading] = useState(false); // 渐进式加载状态
  const [currentLoadingBatch, setCurrentLoadingBatch] = useState(0); // 当前加载到第几批
  const [progressiveLoadCompleted, setProgressiveLoadCompleted] = useState(false); // 渐进式加载完成标志
  const [activeBatchLoaders, setActiveBatchLoaders] = useState(new Set<number>()); // 活跃的批次加载器

  // 滚动指示器状态
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [scrollIndicatorText, setScrollIndicatorText] = useState('');
  const sortListRef = useRef<FlatList>(null);

  // 动态排序选项，使用配置中的标签
  const SORT_OPTIONS = useMemo(() => sortOptionsLabels, [sortOptionsLabels]);

  // 检查初始URL参数
  const getInitialLabelFromURL = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLabel = urlParams.get('label');
      if (urlLabel) {
        console.log('🔗 MarketScreen: 从URL获取初始标签:', urlLabel);
        return urlLabel;
      }
    }
    
    const params = route?.params as any;
    if (params?.label) {
      console.log('🔗 MarketScreen: 从route参数获取初始标签:', params.label);
      return params.label;
    }
    
    return null;
  };

  // 检查是否需要显示滚动指示器
  useEffect(() => {
    console.log('🔄 MarketScreen: Checking scroll indicator:', {
      labelsCount: sortOptionsLabels.length,
      labels: sortOptionsLabels,
      selectedSort: selectedSort
    });
    
    if (sortOptionsLabels.length > 5) { // 改为超过5个标签时显示指示器
      setShowScrollIndicator(true);
      const currentIndex = sortOptionsLabels.indexOf(selectedSort);
      const remainingCount = sortOptionsLabels.length - currentIndex - 1;
      if (remainingCount > 0) {
        setScrollIndicatorText(`+${remainingCount}`);
      } else {
        setScrollIndicatorText('');
      }
      console.log('✅ MarketScreen: Scroll indicator enabled, remaining:', remainingCount);
    } else {
      setShowScrollIndicator(false);
      console.log('❌ MarketScreen: Scroll indicator disabled, not enough labels');
    }
  }, [sortOptionsLabels, selectedSort]);

  // 处理滚动指示器点击
  const handleScrollIndicatorPress = () => {
    const currentIndex = sortOptionsLabels.indexOf(selectedSort);
    const nextIndex = Math.min(currentIndex + 1, sortOptionsLabels.length - 1);
    if (nextIndex > currentIndex) {
      // 滚动到下一个标签并选中
      sortListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      // 可选：自动选择下一个标签
      // setSelectedSort(sortOptionsLabels[nextIndex]);
    }
  };

  // 处理标签滚动事件
  const handleSortScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isNearEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 50;
    
    if (isNearEnd) {
      setScrollIndicatorText('');
    } else {
      const visibleWidth = layoutMeasurement.width;
      const scrollPosition = contentOffset.x;
      // 估算当前可见的最后一个标签
      const estimatedItemWidth = 100; // 大概的标签宽度
      const visibleItems = Math.floor(visibleWidth / estimatedItemWidth);
      const currentStartIndex = Math.floor(scrollPosition / estimatedItemWidth);
      const remainingItems = Math.max(0, sortOptionsLabels.length - currentStartIndex - visibleItems);
      setScrollIndicatorText(remainingItems > 0 ? `+${remainingItems}` : '');
    }
  };

  // 将API数据转换为CoinCard组件需要的格式 - 美股专用版本
  const transformCoinData = async (apiCoins: CoinData[], useRealTimePrices = false): Promise<CoinCardData[]> => {
    // 简化处理：美股APP只处理股票数据，统一使用股票logo服务
    const symbols = apiCoins.map(coin => coin.name);
    
    // 优先级设置
    const priority = refreshing ? 'high' : (currentPage === 0 ? 'normal' : 'background');
    
    // 统一使用股票logo服务
    const logos = stockLogoService.getLogosSync(symbols);
    
    // 异步预加载股票logos（不阻塞）
    stockLogoService.preloadPopularStocks().catch(console.warn);

    // 批量转换数据 - 美股格式
    const transformedCoins = apiCoins.map(coin => {
      // 优先使用实时价格，如果没有则使用API返回的价格
      const currentPrice = useRealTimePrices && realTimePrices[coin.name.toLowerCase()] 
        ? realTimePrices[coin.name.toLowerCase()]
        : parseFloat(coin.currentPrice);

      return {
        id: `${coin.name}_${coin.rank}`, // 使用股票代码和rank的组合
        name: coin.name, // 股票代码如NVDA, AAPL
        fullName: coin.fullName, // 公司全名如NVIDIA Corporation
        symbol: coin.name, // 股票代码
        price: `$${currentPrice.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6
        })}`,
        change: coin.priceChange24h,
        isPositive: !coin.priceChange24h.startsWith('-'),
        rank: coin.rank,
        marketCap: coin.marketcap,
        volume: coin.volume,
        // 使用股票logo服务获取的logo
        logo: logos[coin.name],
        // 添加价格变动标志
        priceChangeDirection: priceChanges[coin.name.toLowerCase()] || null,
        // 添加24小时价格数据
        coin24h: coin.coin24h || [],
      };
    });

    return transformedCoins;
  };

  // 获取排序参数 - 美股APP专用
  const getSortParams = (sortOption: string, currentSortOrder: 'asc' | 'desc' = sortOrder) => {
    // 简化的排序逻辑，只支持美股数据的几种排序
    const sortIndex = sortOptionsLabels.indexOf(sortOption);
    
    switch (sortIndex) {
      case 0: // 第一个位置：市值 (显示美股按market cap排序)
        return { sortBy: 'rank' as const, sortOrder: currentSortOrder };
      case 1: // 第二个位置：涨跌幅
        return { sortBy: 'priceChange24h' as const, sortOrder: currentSortOrder };
      case 2: // 第三个位置：24h成交量
        return { sortBy: 'volume' as const, sortOrder: currentSortOrder };
      case 3: // 第四个位置：价格
        return { sortBy: 'currentPrice' as const, sortOrder: currentSortOrder };
      default:
        return { sortBy: 'rank' as const, sortOrder: 'asc' as const };
    }
  };

  // 加载配置
  const loadConfigs = async () => {
    try {
      console.log('🔄 MarketScreen: Loading configs...');
      
      // 并行初始化配置服务和获取配置
      const [_, labelsString, headerTitleConfig, searchPlaceholderConfig, favoritesTitleConfig, allCoinsTitleConfig, listHeadersConfig, listHeadersEnabledConfig, pageSizeConfig, favoritesExpandedConfig, favoritesSortConfig] = await Promise.all([
        // 确保ConfigService完全初始化
        configService.init(),
        // 并行获取所有配置
        configService.getConfig('MARKET_LIST_LABEL', '市值,涨跌幅,24h成交量,价格'), // 美股APP简化配置
        configService.getConfig('MARKET_HEADER_TITLE', '行情'),
        configService.getConfig('MARKET_SEARCH_PLACEHOLDER', '搜索美股...'), // 美股APP搜索提示
        configService.getConfig('MARKET_FAVORITES_TITLE', '我的自选'),
        configService.getConfig('MARKET_ALL_COINS_TITLE', '全部币种'),
        configService.getConfig('MARKET_LIST_HEADERS', '#,名称,价格/24h'),
        configService.getConfig('MARKET_LIST_HEADERS_ENABLE', 'false'),
        configService.getConfig('MARKET_PAGE_SIZE', '100'),
        configService.getConfig('MARKET_FAVORITES_DEFAULT_EXPANDED', 'false'),
        configService.getConfig('MARKET_FAVORITES_DEFAULT_SORT', 'none')
      ]);
      
      console.log('✅ MarketScreen: ConfigService initialized');
      console.log('🔄 MarketScreen: Raw labels config:', labelsString);
      
      // 解析配置字符串为数组
      const labels = labelsString.split(',').map(label => label.trim()).filter(label => label.length > 0);
      console.log('🔄 MarketScreen: Parsed labels:', labels);
      
      // 使用配置中的所有标签，如果没有配置或配置不完整则使用默认值
      const defaultLabels = ['市值', '涨跌幅', '24h成交量', '价格']; // 美股APP简化标签
      const finalLabels = labels.length >= 3 ? labels : defaultLabels; // 至少3个标签
      
      setSortOptionsLabels(finalLabels);
      console.log(`✅ MarketScreen: Sort options labels loaded:`, finalLabels);
      
      // 检查是否有URL参数需要应用
      const initialLabel = getInitialLabelFromURL();
      if (initialLabel && finalLabels.includes(initialLabel)) {
        console.log('🔗 MarketScreen: 应用URL标签:', initialLabel);
        setSelectedSort(initialLabel);
      } else if (!selectedSort || selectedSort === '市值') {
        console.log('🔗 MarketScreen: 使用默认第一个标签:', finalLabels[0]);
        setSelectedSort(finalLabels[0]);
      }
      
      // 设置UI文本
      setHeaderTitle(headerTitleConfig);
      setSearchPlaceholder(searchPlaceholderConfig);
      setFavoritesTitle(favoritesTitleConfig);
      setAllCoinsTitle(allCoinsTitleConfig);
      
      // 解析列表头部配置
      const headers = listHeadersConfig.split(',').map(header => header.trim()).filter(header => header.length > 0);
      const finalHeaders = headers.length >= 3 ? headers.slice(0, 3) : ['#', '名称', '价格/24h'];
      setListHeaders(finalHeaders);
      
      // 设置列表头部显示开关
      const headersEnabled = listHeadersEnabledConfig.toLowerCase() === 'true';
      setListHeadersEnabled(headersEnabled);
      
      // 获取性能配置
      const parsedPageSize = parseInt(pageSizeConfig, 10);
      const finalPageSize = isNaN(parsedPageSize) || parsedPageSize <= 0 ? 100 : parsedPageSize;
      setPageSize(finalPageSize);
      
      // 获取自选分组默认展开状态配置
      const defaultExpanded = favoritesExpandedConfig.toLowerCase() === 'true';
      setIsFavoritesExpanded(defaultExpanded);
      
      // 获取自选分组默认排序方式配置
      const defaultSortOrder = ['asc', 'desc', 'none'].includes(favoritesSortConfig) ? favoritesSortConfig as 'asc' | 'desc' | 'none' : 'none';
      setFavoritesSortOrder(defaultSortOrder);
      
      setConfigsLoaded(true); // 标记配置已加载
      
      // 重置渐进式加载状态
      setProgressiveLoadCompleted(false);
      setIsProgressiveLoading(false);
      setCurrentLoadingBatch(0);
      setActiveBatchLoaders(new Set());
      
      console.log(`✅ MarketScreen: UI text configs loaded:`, {
        headerTitle: headerTitleConfig,
        searchPlaceholder: searchPlaceholderConfig,
        favoritesTitle: favoritesTitleConfig,
        allCoinsTitle: allCoinsTitleConfig,
        listHeaders: finalHeaders,
        listHeadersEnabled: headersEnabled
      });
      
      console.log(`✅ MarketScreen: Performance configs loaded:`, {
        pageSize: finalPageSize,
        favoritesDefaultExpanded: defaultExpanded,
        favoritesDefaultSort: defaultSortOrder
      });
      
    } catch (error) {
      console.error('❌ MarketScreen: Failed to load configs:', error);
      // 如果加载配置失败，使用默认值
      const defaultLabels = ['市值', '涨跌幅', '24h成交量', '价格']; // 美股APP简化标签
      setSortOptionsLabels(defaultLabels);
      
      // 检查URL参数
      const initialLabel = getInitialLabelFromURL();
      if (initialLabel && defaultLabels.includes(initialLabel)) {
        setSelectedSort(initialLabel);
      } else {
        setSelectedSort(defaultLabels[0]);
      }
      
      setHeaderTitle('行情');
      setSearchPlaceholder('搜索美股...');  // 美股APP默认搜索提示
      setFavoritesTitle('我的自选');
      setAllCoinsTitle('全部币种');
      setListHeaders(['#', '名称', '价格/24h']);
      setListHeadersEnabled(true); // 默认显示表头
      setPageSize(100);
      setIsFavoritesExpanded(false);
      setFavoritesSortOrder('none');
      setConfigsLoaded(true);
      
      // 重置优化加载状态
      setBackgroundLoadCompleted(false);
      setIsBackgroundLoading(false);
    }
  };

  // 获取美股数据 - 渐进式加载版本
  const fetchUSStockData = async (page: number = 0, isRefresh: boolean = false) => {
    try {
      if (isRefresh || page === 0) {
        setUsStocksLoading(true);
        setUsStocksError(null);
        // 清空现有数据，开始新的加载
        setUsStocks([]);
      }
      
      console.log('🔄 MarketScreen: Fetching US stocks list with progressive loading...', { page, isRefresh });
      
      // 使用渐进式加载：首次加载20条，然后逐步加载更多
      await startStockProgressiveLoading(page === 0 ? 0 : page);
      
    } catch (err) {
      console.error('❌ MarketScreen: Failed to fetch US stocks:', err);
      setUsStocksError('加载美股数据失败，请稍后再试');
      setUsStocks([]);
    } finally {
      setUsStocksLoading(false);
    }
  };

  // 股票渐进式加载单个批次的数据
  const loadStockBatchData = async (batchIndex: number, isNewSession: boolean = false) => {
    try {
      const skip = batchIndex * progressiveBatchSize;
      const limit = progressiveBatchSize;
      
      console.log(`🔄 MarketScreen: Loading stock batch ${batchIndex}, skip: ${skip}, limit: ${limit}`);
      
      // 直接调用StockService获取分页数据
      const stocksData = await stockService.getUSStocksList(skip, limit, "rank", "asc");
      
      if (stocksData.length > 0) {
        // 将StockData转换为CoinData格式，然后再转换为CoinCardData
        const coinDataFormat = stocksData.map(stock => ({
          _id: stock._id,
          coin_id: stock._id,
          rank: stock.rank,
          name: stock.code, // 使用股票代码
          fullName: stock.name, // 使用公司全名
          symbol: stock.code,
          currentPrice: stock.currentPrice,
          priceChange24h: stock.priceChangePercent,
          priceChangePercent: stock.priceChangePercent,
          marketCap: stock.baseinfo?.marketCap || stock.marketCap || '',
          volume: stock.baseinfo?.volume || stock.volume || '',
          fdv: stock.baseinfo?.marketCap || stock.marketCap || '',
          totalSupply: stock.baseinfo?.sharesOutstanding || '',
          circulatingSupply: stock.baseinfo?.sharesOutstanding || '',
          description: `${stock.name} (${stock.code}) - ${stock.sector}`,
          logo: stockLogoService.getLogoUrlSync(stock.code),
          cexInfos: [],
          valid: true,
          created_at: stock.created_at,
          date: stock.date || '',
          updated_at: stock.updated_at,
          coin24h: stock.usstock24h?.map(item => ({
            price: parseFloat(item.price),
            createdAt: item.createdAt
          })) || []
        }));
        
        const transformedStocks = await transformCoinData(coinDataFormat, false); // 移除第三个参数，因为美股APP默认处理股票数据
        
        // 更新股票列表 - 追加方式
        if (isNewSession && batchIndex === 0) {
          setUsStocks(transformedStocks);
        } else {
          setUsStocks(prev => [...prev, ...transformedStocks]);
        }
        
        console.log(`✅ MarketScreen: Stock batch ${batchIndex} loaded successfully, ${transformedStocks.length} stocks`);
      }
      
      return { 
        success: true, 
        hasMore: stocksData.length === limit, // 如果返回的数据等于limit，可能还有更多
        total: skip + stocksData.length 
      };
      
    } catch (error) {
      console.error(`❌ Failed to load stock batch ${batchIndex}:`, error);
      return { success: false, hasMore: false, total: 0 };
    }
  };

  // 股票渐进式加载主函数
  const startStockProgressiveLoading = async (startBatch: number = 0) => {
    setIsProgressiveLoading(true);
    setProgressiveLoadCompleted(false);
    
    const maxBatches = startBatch + totalInitialBatches;
    
    try {
      // 第一步：立即加载第一批数据（0-20条股票）
      if (startBatch === 0) {
        await loadStockBatchData(0, true);
      }
      
      // 第二步：并行加载剩余批次（20-40, 40-60, 60-80, 80-100）
      const batchPromises: Promise<any>[] = [];
      const startIndex = startBatch === 0 ? 1 : startBatch;
      
      for (let batchIndex = startIndex; batchIndex < maxBatches; batchIndex++) {
        batchPromises.push(loadStockBatchData(batchIndex, false));
      }
      
      console.log(`📦 MarketScreen: Starting parallel loading of ${batchPromises.length} stock batches`);
      
      // 等待所有批次完成
      const results = await Promise.all(batchPromises);
      
      // 检查是否还有更多数据
      const lastResult = results[results.length - 1] as any;
      const totalLoaded = maxBatches * progressiveBatchSize;
      setHasMore(lastResult?.hasMore && totalLoaded < (lastResult?.total || 0));
      
      setProgressiveLoadCompleted(true);
      console.log(`✅ MarketScreen: Stock progressive loading completed, ${totalLoaded} stocks loaded`);
      
    } catch (error) {
      console.error('❌ Stock progressive loading failed:', error);
      setUsStocksError(error instanceof Error ? error.message : 'Failed to load stock data');
    } finally {
      setIsProgressiveLoading(false);
    }
  };

  // 获取分类币种数据（公链、L2、MEME、DEFI、平台币、LRT、存储、Cosmos、NFT、链游、AI、RWA）
  const fetchCategoryData = async (category: string) => {
    try {
      console.log('🔄 MarketScreen: Fetching category data for:', category);
      console.log('📊 MarketScreen: Starting category data fetch process...');
      
      // 确保配置完全加载
      console.log('📊 MarketScreen: Ensuring configs are loaded before fetching data...');
      await configService.init();
      console.log('✅ MarketScreen: Configs confirmed loaded, proceeding with data fetch');
      
      // 使用与美股相同的状态管理逻辑
      setUsStocksLoading(true);
      setUsStocksError(null);
      
      let categoryData: CoinData[] = [];
      console.log('📊 MarketScreen: Initialized empty categoryData array');
      
      switch (category) {
        case '公链':
          console.log('🔄 MarketScreen: Calling getPublicChainList()...');
          categoryData = await marketService.getPublicChainList();
          break;
        case 'L2':
          console.log('🔄 MarketScreen: Calling getL2CoinsList()...');
          categoryData = await marketService.getL2CoinsList();
          break;
        case 'MEME':
          console.log('🔄 MarketScreen: Calling getMemeCoinsList()...');
          try {
            categoryData = await marketService.getMemeCoinsList();
            console.log('📊 MarketService: getMemeCoinsList returned:', categoryData.length, 'items');
            console.log('📊 MarketService: First few items:', categoryData.slice(0, 3));
          } catch (error) {
            console.error('❌ MarketService: getMemeCoinsList failed:', error);
            throw error;
          }
          break;
        case 'DEFI':
          console.log('🔄 MarketScreen: Calling getDefiCoinsList()...');
          try {
            categoryData = await marketService.getDefiCoinsList();
            console.log('📊 MarketService: getDefiCoinsList returned:', categoryData.length, 'items');
            console.log('📊 MarketService: First few items:', categoryData.slice(0, 3));
          } catch (error) {
            console.error('❌ MarketService: getDefiCoinsList failed:', error);
            throw error;
          }
          break;
        case '平台币':
          console.log('🔄 MarketScreen: Calling getPlatformCoinsList()...');
          categoryData = await marketService.getPlatformCoinsList();
          break;
        case '质押':
          console.log('🔄 MarketScreen: Calling getLRTCoinsList()...');
          try {
            console.log('📊 MarketScreen: About to call marketService.getLRTCoinsList()...');
            categoryData = await marketService.getLRTCoinsList();
            console.log('📊 MarketService: getLRTCoinsList returned:', categoryData.length, 'items');
            console.log('📊 MarketService: First few items:', categoryData.slice(0, 3));
            console.log('📊 MarketService: Raw response data:', JSON.stringify(categoryData, null, 2));
          } catch (error) {
            console.error('❌ MarketService: getLRTCoinsList failed:', error);
            throw error;
          }
          break;
        case '存储':
          console.log('🔄 MarketScreen: Calling getStorageCoinsList()...');
          categoryData = await marketService.getStorageCoinsList();
          break;
        case 'Cosmos':
          console.log('🔄 MarketScreen: Calling getCosmosCoinsList()...');
          categoryData = await marketService.getCosmosCoinsList();
          break;
        case 'NFT':
          console.log('🔄 MarketScreen: Calling getNFTCoinsList()...');
          categoryData = await marketService.getNFTCoinsList();
          break;
        case '链游':
          console.log('🔄 MarketScreen: Calling getGameCoinsList()...');
          categoryData = await marketService.getGameCoinsList();
          break;
        case 'AI':
          console.log('🔄 MarketScreen: Calling getAICoinsList()...');
          categoryData = await marketService.getAICoinsList();
          break;
        case 'RWA':
          console.log('🔄 MarketScreen: Calling getRWACoinsList()...');
          categoryData = await marketService.getRWACoinsList();
          break;
        case '美股':
          console.log('🔄 MarketScreen: Calling getUSStockList()...');
          try {
            categoryData = await marketService.getUSStockList();
            console.log('📊 MarketService: getUSStockList returned:', categoryData.length, 'items');
            console.log('📊 MarketService: First few items:', categoryData.slice(0, 3));
          } catch (error) {
            console.error('❌ MarketService: getUSStockList failed:', error);
            throw error;
          }
          break;
      }
      
      console.log(`🔄 MarketScreen: Got ${categoryData.length} items for category ${category}`);
      
      if (categoryData.length === 0) {
        console.warn(`⚠️ MarketScreen: No data found for category ${category}`);
        // 不设置错误，而是设置空数组，这样UI会显示友好的"暂无数据"信息
        setUsStocks([]);
        setUsStocksError(null);
      } else {
        // 对分类数据按rank排序（升序，rank越小排在前面）
        const sortedCategoryData = [...categoryData].sort((a, b) => {
          const rankA = parseInt(a.rank) || 999999;
          const rankB = parseInt(b.rank) || 999999;
          return rankA - rankB;
        });
        
        const transformedCoins = await transformCoinData(sortedCategoryData);
        setUsStocks(transformedCoins);
        setUsStocksError(null);
        console.log(`✅ MarketScreen: Successfully fetched ${transformedCoins.length} ${category} coins, sorted by rank`);
      }
      
      // 重置分页状态
      setCurrentPage(0);
      setHasMore(false); // 分类数据不支持分页
      
    } catch (err) {
      console.error(`❌ MarketScreen: Failed to fetch ${category} data:`, err);
      setUsStocksError(`加载${category}数据失败，请稍后再试`);
      setUsStocks([]);
    } finally {
      setUsStocksLoading(false);
    }
  };

  // 搜索币种（调用后端API）
  const searchCoins = async (query: string) => {
    console.log('🔍 MarketScreen: searchCoins called with:', { query, queryTrim: query.trim() });
    
    if (!query.trim()) {
      console.log('🔍 MarketScreen: Query is empty, clearing results');
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    
    try {
      console.log('🔍 MarketScreen: Starting search process...');
      setIsSearching(true);
      setSearchError(null);
      console.log('🔄 MarketScreen: Searching coins with query:', query);
      
      const searchedCoins = await marketService.searchCoins(query, 50);
      console.log('🔍 MarketScreen: Raw search results:', searchedCoins.length, searchedCoins);
      
      const transformedResults = await transformCoinData(searchedCoins);
      console.log('🔄 MarketScreen: Transformed results:', transformedResults.length, transformedResults);
      
      console.log('🔍 MarketScreen: About to setSearchResults with:', transformedResults);
      setSearchResults(transformedResults);
      
      console.log(`✅ MarketScreen: Search completed, found ${transformedResults.length} results`);
      console.log('🔍 MarketScreen: Search results state should be updated');
      
      // 添加延迟检查状态是否正确更新
      setTimeout(() => {
        console.log('🔍 MarketScreen: Delayed check - searchResults length:', searchResults.length);
      }, 100);
      
    } catch (err) {
      console.error('❌ MarketScreen: Search failed:', err);
      setSearchError('搜索失败，请稍后再试');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 防抖搜索效果
  useEffect(() => {
    console.log('🔍 MarketScreen: Debounced search effect triggered:', {
      debouncedSearchText,
      searchText,
      trimmed: debouncedSearchText.trim(),
      searchResultsLength: searchResults.length
    });
    
    if (debouncedSearchText.trim()) {
      console.log('🔍 MarketScreen: Calling searchCoins with:', debouncedSearchText);
      searchCoins(debouncedSearchText);
    } else {
      console.log('🔍 MarketScreen: Clearing search results (empty search)');
      setSearchResults([]);
      setSearchError(null);
    }
  }, [debouncedSearchText]);

  // 渐进式加载单个批次的数据
  const loadBatchData = async (batchIndex: number, sortBy: string, apiSortOrder: string, isNewSession: boolean = false) => {
    try {
      const skip = batchIndex * progressiveBatchSize;
      const limit = progressiveBatchSize;
      
      console.log(`🔄 MarketScreen: Loading batch ${batchIndex}, skip: ${skip}, limit: ${limit}`);
      
      // 标记这个批次正在加载
      setActiveBatchLoaders(prev => new Set([...prev, batchIndex]));
      
      const result = await marketService.listCoins(skip, limit, sortBy, apiSortOrder);
      const transformedCoins = await transformCoinData(result.coins, Object.keys(realTimePrices).length > 0);
      
      // 预加载logo（根据批次调整优先级）
      const symbols = result.coins.map(coin => coin.name);
      const priority = batchIndex === 0 ? 'high' : batchIndex < 3 ? 'medium' : 'low';
      coinLogoService.batchPreloadLogos(symbols, false, priority).catch(error => {
        console.warn(`⚠️ Batch ${batchIndex} logo loading failed:`, error);
      });
      
      // 更新币种列表 - 修改为简单追加，避免排序混乱
      if (isNewSession && batchIndex === 0) {
        // 新会话的第一批数据，直接设置
        setCoins(transformedCoins);
        console.log(`✅ MarketScreen: Set initial batch ${batchIndex}, ${transformedCoins.length} coins`);
      } else {
        // 简单追加数据，稍后会进行排序
        setCoins(prevCoins => {
          const updatedCoins = [...prevCoins, ...transformedCoins];
          
          // 根据当前排序字段进行排序，确保顺序正确
          updatedCoins.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
              case 'rank':
                comparison = a.rank - b.rank;
                break;
              case 'priceChange24h':
                const aChange = parseFloat(a.change.replace('%', ''));
                const bChange = parseFloat(b.change.replace('%', ''));
                comparison = aChange - bChange;
                break;
              case 'volume':
                // 解析volume字符串，去掉单位并转换为数字
                const parseVolume = (vol: string) => {
                  const cleanVol = vol.replace(/[$,]/g, '');
                  if (cleanVol.includes('B')) return parseFloat(cleanVol) * 1e9;
                  if (cleanVol.includes('M')) return parseFloat(cleanVol) * 1e6;
                  if (cleanVol.includes('K')) return parseFloat(cleanVol) * 1e3;
                  return parseFloat(cleanVol) || 0;
                };
                comparison = parseVolume(a.volume) - parseVolume(b.volume);
                break;
              case 'currentPrice':
                // 解析价格字符串
                const aPrice = parseFloat(a.price.replace(/[$,]/g, ''));
                const bPrice = parseFloat(b.price.replace(/[$,]/g, ''));
                comparison = aPrice - bPrice;
                break;
              case 'marketcap':
                // 解析市值字符串
                const parseMarketCap = (cap: string) => {
                  const cleanCap = cap.replace(/[$,]/g, '');
                  if (cleanCap.includes('B')) return parseFloat(cleanCap) * 1e9;
                  if (cleanCap.includes('M')) return parseFloat(cleanCap) * 1e6;
                  if (cleanCap.includes('K')) return parseFloat(cleanCap) * 1e3;
                  return parseFloat(cleanCap) || 0;
                };
                comparison = parseMarketCap(a.marketCap) - parseMarketCap(b.marketCap);
                break;
              default:
                // 默认按rank排序
                comparison = a.rank - b.rank;
            }
            
            // 根据排序方向调整结果
            return apiSortOrder === 'desc' ? -comparison : comparison;
          });
          
          console.log(`✅ MarketScreen: Updated batch ${batchIndex}, total coins: ${updatedCoins.length}, sorted by ${sortBy} ${apiSortOrder}, first coin rank: ${updatedCoins[0]?.rank}, last coin rank: ${updatedCoins[updatedCoins.length - 1]?.rank}`);
          return updatedCoins;
        });
      }
      
      // 更新当前已加载的批次
      setCurrentLoadingBatch(prev => Math.max(prev, batchIndex + 1));
      
      return { success: true, hasMore: result.coins.length === limit, total: result.total };
      
    } catch (error) {
      console.error(`❌ Failed to load batch ${batchIndex}:`, error);
      return { success: false, hasMore: false, total: 0 };
    } finally {
      // 移除加载标记
      setActiveBatchLoaders(prev => {
        const newSet = new Set([...prev]);
        newSet.delete(batchIndex);
        return newSet;
      });
    }
  };

  // 渐进式加载主函数
  const startProgressiveLoading = async (sortBy: string, apiSortOrder: string, startBatch: number = 0, isNewSession: boolean = false) => {
    setIsProgressiveLoading(true);
    setProgressiveLoadCompleted(false);
    
    const maxBatches = startBatch + totalInitialBatches;
    
    try {
      // 第一步：立即加载第一批数据（0-10条）
      if (startBatch === 0) {
        console.log('🚀 MarketScreen: Starting progressive loading - loading first batch immediately');
        const firstBatchResult = await loadBatchData(0, sortBy, apiSortOrder, true);
        
        if (!firstBatchResult.success) {
          throw new Error('Failed to load first batch');
        }
        
        // 立即显示第一批数据，用户可以开始浏览
        setLoading(false);
      }
      
      // 第二步：并行加载剩余批次（10-20, 20-30, ..., 90-100）
      const batchPromises: Promise<any>[] = [];
      const startIndex = startBatch === 0 ? 1 : startBatch; // 如果是新会话，从第二批开始
      
      for (let batchIndex = startIndex; batchIndex < maxBatches; batchIndex++) {
        // 添加小延迟，避免同时发起太多请求
        const delay = (batchIndex - startIndex) * 50; // 每批延迟50ms
        
        const batchPromise = new Promise(resolve => {
          setTimeout(async () => {
            const result = await loadBatchData(batchIndex, sortBy, apiSortOrder, false);
            resolve(result);
          }, delay);
        });
        
        batchPromises.push(batchPromise);
      }
      
      console.log(`📦 MarketScreen: Starting parallel loading of ${batchPromises.length} batches`);
      
      // 等待所有批次完成
      const results = await Promise.all(batchPromises);
      
      // 检查是否还有更多数据
      const lastResult = results[results.length - 1] as any;
      const totalLoaded = maxBatches * progressiveBatchSize;
      setHasMore(lastResult?.hasMore && totalLoaded < (lastResult?.total || 0));
      
      setProgressiveLoadCompleted(true);
      console.log(`✅ MarketScreen: Progressive loading completed, ${totalLoaded} coins loaded`);
      
    } catch (error) {
      console.error('❌ Progressive loading failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to load market data');
    } finally {
      setIsProgressiveLoading(false);
    }
  };
  // 获取市场数据 - 渐进式加载版本
  const fetchMarketData = async (page: number = 0, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setError(null);
        setProgressiveLoadCompleted(false);
        setCurrentLoadingBatch(0);
      } else if (page === 0) {
        setLoading(true);
        setError(null);
        setProgressiveLoadCompleted(false);
        setCurrentLoadingBatch(0);
      } else {
        setLoadingMore(true);
      }
      
      console.log('🔄 MarketScreen: fetchMarketData called with:', { selectedSort, page, isRefresh });
      
      // 美股APP简化逻辑：所有排序都使用股票数据，只是排序方式不同
      console.log('🔄 MarketScreen: US Stocks App - all data comes from stocks API, calling fetchUSStockData...');
      await fetchUSStockData();
      return;
      
    } catch (err) {
      console.error('❌ Failed to fetch market data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load market data');
      
      Alert.alert(
        '数据加载失败',
        '无法获取市场数据，请检查网络连接后重试',
        [
          { text: '重试', onPress: () => fetchMarketData(page, isRefresh) },
          { text: '取消', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // 下拉刷新
  const onRefresh = React.useCallback(() => {
    // 下拉刷新时，同时强制刷新logo缓存
    fetchMarketData(0, true);
  }, [selectedSort, sortOrder]);



  // 加载更多
  const loadMore = React.useCallback(() => {
    // 美股APP简化：所有排序都不支持分页加载，数据量不大，一次性加载完成
    console.log('📊 MarketScreen: US Stocks App - no pagination needed, all data loaded at once');
    return;
  }, []);

  // 组件挂载时先加载配置
  useEffect(() => {
    console.log('🔄 MarketScreen: Component mounted, loading configs...');
    loadConfigs();
  }, []);

  // 处理URL参数定位功能
  useEffect(() => {
    // 只有在配置已加载但URL参数还没有应用时才处理
    if (configsLoaded) {
      const initialLabel = getInitialLabelFromURL();
      if (initialLabel && sortOptionsLabels.includes(initialLabel) && selectedSort !== initialLabel) {
        console.log('🔗 MarketScreen: 应用URL参数标签:', initialLabel);
        setSelectedSort(initialLabel);
        setSortOrder('asc');
      }
    }
  }, [configsLoaded, route?.params]);

  // 数据加载：配置加载完成且有选中的排序选项时
  useEffect(() => {
    if (configsLoaded && selectedSort) {
      console.log('🔄 MarketScreen: 数据加载useEffect触发:', { 
        selectedSort, 
        sortOptionsLabels,
        configsLoaded,
        triggerReason: '配置加载完成且有选中标签'
      });
      fetchMarketData(0);
    } else {
      console.log('🔄 MarketScreen: 数据加载跳过:', { 
        configsLoaded, 
        selectedSort,
        reason: '配置未加载或未选中标签'
      });
    }
  }, [configsLoaded, selectedSort, sortOrder]);

  // 管理实时价格轮询
  useEffect(() => {
    if (coins.length > 0 || usStocks.length > 0) {
      startPolling();
    } else {
      stopPolling();
    }

    // 清理函数
    return () => {
      stopPolling();
    };
  }, [coins.length, usStocks.length]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // 监听实时价格变化，更新币种列表的价格显示
  useEffect(() => {
    if (Object.keys(realTimePrices).length > 0 && (coins.length > 0 || usStocks.length > 0 || favoriteCoinsData.length > 0)) {
      // 使用防抖机制来减少频繁的状态更新
      const timeoutId = setTimeout(() => {
        // 更新加密货币价格
        if (coins.length > 0) {
          setCoins(prevCoins => prevCoins.map(coin => {
            const coinKey = coin.name.toLowerCase();
            const realTimePrice = realTimePrices[coinKey];
            const priceDirection = priceChanges[coinKey];
            
            if (realTimePrice) {
              return {
                ...coin,
                price: `$${realTimePrice.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6
                })}`,
                priceChangeDirection: priceDirection || coin.priceChangeDirection
              };
            }
            
            return {
              ...coin,
              priceChangeDirection: priceDirection || coin.priceChangeDirection
            };
          }));
        }

        // 更新美股价格
        if (usStocks.length > 0) {
          setUsStocks(prevStocks => prevStocks.map(stock => {
            const stockKey = stock.name.toLowerCase();
            const realTimePrice = realTimePrices[stockKey];
            const priceDirection = priceChanges[stockKey];
            
            if (realTimePrice) {
              return {
                ...stock,
                price: `$${realTimePrice.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6
                })}`,
                priceChangeDirection: priceDirection || stock.priceChangeDirection
              };
            }
            
            return {
              ...stock,
              priceChangeDirection: priceDirection || stock.priceChangeDirection
            };
          }));
        }

        // 更新自选币种价格
        if (favoriteCoinsData.length > 0) {
          setFavoriteCoinsData(prevFavorites => prevFavorites.map(coin => {
            const coinKey = coin.name.toLowerCase();
            const realTimePrice = realTimePrices[coinKey];
            const priceDirection = priceChanges[coinKey];
            
            if (realTimePrice) {
              return {
                ...coin,
                price: `$${realTimePrice.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6
                })}`,
                priceChangeDirection: priceDirection || coin.priceChangeDirection
              };
            }
            
            return {
              ...coin,
              priceChangeDirection: priceDirection || coin.priceChangeDirection
            };
          }));
        }

        // 同时更新搜索结果的价格
        if (searchResults.length > 0) {
          setSearchResults(prevResults => prevResults.map(coin => {
            const coinKey = coin.name.toLowerCase();
            const realTimePrice = realTimePrices[coinKey];
            const priceDirection = priceChanges[coinKey];
            
            if (realTimePrice) {
              return {
                ...coin,
                price: `$${realTimePrice.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6
                })}`,
                priceChangeDirection: priceDirection || coin.priceChangeDirection
              };
            }
            
            return {
              ...coin,
              priceChangeDirection: priceDirection || coin.priceChangeDirection
            };
          }));
        }
      }, 100); // 100ms防抖，避免过于频繁的价格更新
      
      return () => clearTimeout(timeoutId);
    }
  }, [realTimePrices, priceChanges, searchResults.length, coins.length, usStocks.length, favoriteCoinsData.length]);

  // 根据搜索状态决定显示的币种列表
  const displayCoins = useMemo(() => {
    // 美股APP简化：如果有搜索文本，显示搜索结果，否则显示股票数据
    if (searchText.trim()) {
      return searchResults;
    }
    
    // 美股APP只有股票数据，直接返回usStocks
    return usStocks;
  }, [searchText, searchResults, usStocks]);

  // 分组显示币种：自选在前，全部币种包含所有（包括已自选的）
  const groupedCoins = useMemo(() => {
    if (!currentUser || userFavoriteCoins.size === 0 || searchText.trim()) {
      // 如果未登录、没有自选、在搜索，则不分组
      return {
        favorites: [],
        others: displayCoins
      };
    }

    // 对自选币种进行排序处理
    let sortedFavorites = [...favoriteCoinsData];
    if (favoritesSortOrder !== 'none') {
      sortedFavorites.sort((a, b) => {
        // 解析涨跌幅百分比
        const parseChangePercentage = (change: string): number => {
          // 移除百分号和正负号，转换为数字
          const numStr = change.replace(/[%+\-]/g, '');
          const num = parseFloat(numStr) || 0;
          // 如果原字符串包含负号，返回负数
          return change.includes('-') ? -num : num;
        };
        
        const aChange = parseChangePercentage(a.change);
        const bChange = parseChangePercentage(b.change);
        
        if (favoritesSortOrder === 'desc') {
          return bChange - aChange; // 降序：涨幅大的在前
        } else {
          return aChange - bChange; // 升序：跌幅大的在前
        }
      });
    }

    // 美股APP简化：股票数据模式下，favorites使用独立的favoriteCoinsData，others使用股票数据
    return {
      favorites: sortedFavorites, // 使用排序后的自选币种数据
      others: displayCoins // 美股数据
    };
  }, [displayCoins, userFavoriteCoins, currentUser, searchText, selectedSort, isFavoritesExpanded, favoriteCoinsData, favoritesSortOrder]);

  // 获取用户自选币种列表
  const fetchUserFavoriteCoins = async () => {
    if (!currentUser) {
      console.log('🔄 MarketScreen: 用户未登录，清空自选数据');
      setUserFavoriteCoins(new Set());
      setFavoriteCoinsData([]);
      setIsFavoritesExpanded(false); // 用户登出时收起自选分组
      return;
    }

    try {
      setLoadingUserCoins(true);
      console.log('🔄 MarketScreen: 获取用户自选币种...', currentUser.email);
      
      const result = await userCoinService.getUserCoins(currentUser.email);
      
      if (result.success && result.data) {
        const favoriteCoinsData = result.data as any; // getUserCoinsResponse
        const coinSymbols = favoriteCoinsData.coins.map((item: any) => item.coin.toUpperCase());
        const coinSet = new Set(coinSymbols);
        setUserFavoriteCoins(coinSet);
        console.log('✅ MarketScreen: 获取用户自选币种成功:', coinSymbols);          // 获取自选币种的完整数据
        if (coinSymbols.length > 0) {
          console.log('🔄 MarketScreen: 获取自选币种的完整数据...');
          const favoriteData = await marketService.getFavoriteCoinsData(coinSymbols);
          const transformedFavoriteData = await transformCoinData(favoriteData, Object.keys(realTimePrices).length > 0);
          setFavoriteCoinsData(transformedFavoriteData);
          console.log('✅ MarketScreen: 获取自选币种数据成功:', transformedFavoriteData.length, '个币种');
          
          // 保持自选分组默认收起状态，不自动展开
          // 用户可以手动点击展开按钮查看自选币种
        } else {
          setFavoriteCoinsData([]);
          setIsFavoritesExpanded(false); // 没有自选币种时收起分组
        }
      } else {
        console.error('❌ MarketScreen: 获取用户自选币种失败:', result.error);
        setUserFavoriteCoins(new Set());
        setFavoriteCoinsData([]);
        setIsFavoritesExpanded(false);
      }
    } catch (error: any) {
      console.error('❌ MarketScreen: 获取用户自选币种异常:', error);
      
      // 检查是否为登录过期错误
      if (error.message && error.message.includes('登录已过期')) {
        console.log('🚫 MarketScreen: 检测到登录过期（获取自选币种时）');
        // 这里不自动打开登录modal，让用户在主动操作时再提示
      }
      
      setUserFavoriteCoins(new Set());
      setFavoriteCoinsData([]);
      setIsFavoritesExpanded(false);
    } finally {
      setLoadingUserCoins(false);
    }
  };

  // 监听用户登录状态变化，获取自选币种
  useEffect(() => {
    console.log('🔄 MarketScreen: 用户状态变化，currentUser:', currentUser?.email || 'null');
    fetchUserFavoriteCoins();
  }, [currentUser]);

  // 监听页面焦点变化，当从其他页面返回时刷新自选数据
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 MarketScreen: 页面获得焦点，刷新自选数据');
      // 当页面获得焦点时，如果用户已登录，则刷新自选数据
      if (currentUser) {
        fetchUserFavoriteCoins();
      }
    }, [currentUser])
  );

  // 切换自选分组排序
  const toggleFavoritesSort = () => {
    console.log('🔄 MarketScreen: 切换自选分组排序，当前状态:', favoritesSortOrder);
    
    if (favoritesSortOrder === 'none') {
      setFavoritesSortOrder('desc'); // 无排序 → 降序（涨幅大的在前）
    } else if (favoritesSortOrder === 'desc') {
      setFavoritesSortOrder('asc');  // 降序 → 升序（跌幅大的在前）
    } else {
      setFavoritesSortOrder('none'); // 升序 → 无排序（恢复原始顺序）
    }
  };

  // 更新URL参数
  const updateURL = (label: string) => {
    if (Platform.OS === 'web') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('label', label);
        window.history.pushState({}, '', url.toString());
        console.log('🔗 MarketScreen: URL已更新为:', url.toString());
      } catch (error) {
        console.error('❌ MarketScreen: 更新URL失败:', error);
      }
    }
  };

  // 分享功能
  const handleShare = async () => {
    setShareModalVisible(true);
  };
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
  const handleFavoritePress = (coinSymbol: string, isAdding: boolean) => {
    console.log('✅ MarketScreen: 自选操作完成', { coinSymbol, isAdding });
    
    if (isAdding) {
      // 添加成功后，更新本地自选币种状态
      setUserFavoriteCoins(prev => new Set([...prev, coinSymbol.toUpperCase()]));
      
      // 不自动展开自选分组，让用户手动控制显示
      // 用户可以点击自选分组标题来查看新添加的币种
      
      // 显示成功消息
      showMessageModal(
        'success',
        '添加成功',
        `${coinSymbol} 已添加到自选列表，点击"${favoritesTitle}"可查看`,
        [{ text: '确定', onPress: () => setModalVisible(false) }]
      );
    } else {
      // 移除成功后，更新本地自选币种状态
      setUserFavoriteCoins(prev => {
        const newSet = new Set(prev);
        newSet.delete(coinSymbol.toUpperCase());
        return newSet;
      });
      
      // 显示移除成功消息
      showMessageModal(
        'success',
        '移除成功',
        `${coinSymbol} 已从自选列表中移除`,
        [{ text: '确定', onPress: () => setModalVisible(false) }]
      );
    }
    
    // 刷新自选分组数据
    fetchUserFavoriteCoins();
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
    }
  };

  // 处理需要登录的情况
  const handleLoginRequired = () => {
    console.log('🔐 MarketScreen: 触发登录需求弹窗');
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
            console.log('🔐 MarketScreen: 打开登录模态框');
            setLoginModalVisible(true);
          }
        }
      ]
    );
  };

  // 处理登录成功
  const handleLoginSuccess = (user) => {
    console.log('✅ MarketScreen: 登录成功', user);
    // 不需要手动关闭modal，LoginModal会自己关闭
    
    // 显示登录成功消息
    showMessageModal(
      'success',
      '登录成功',
      `欢迎回来，${user.email}！现在可以添加自选币种了。`,
      [{ text: '确定', onPress: () => setModalVisible(false) }]
    );
    
    // 强制刷新自选数据 - 登录成功后立即获取用户自选币种
    // 使用多个延迟机制确保状态更新完成
    const refreshUserData = async () => {
      try {
        console.log('🔄 MarketScreen: 强制刷新用户自选数据...');
        
        // 直接使用传入的user参数，避免依赖Context状态更新
        const result = await userCoinService.getUserCoins(user.email);
        
        if (result.success && result.data) {
          const favoriteCoinsData = result.data as any;
          const coinSymbols = favoriteCoinsData.coins.map((item: any) => item.coin.toUpperCase());
          const coinSet = new Set(coinSymbols);
          
          console.log('✅ MarketScreen: 强制刷新用户自选币种成功:', coinSymbols);
          setUserFavoriteCoins(coinSet);
          
          // 获取自选币种的完整数据
          if (coinSymbols.length > 0) {
            console.log('🔄 MarketScreen: 强制刷新自选币种的完整数据...');
            const favoriteData = await marketService.getFavoriteCoinsData(coinSymbols);
            const transformedFavoriteData = await transformCoinData(favoriteData, Object.keys(realTimePrices).length > 0);
            setFavoriteCoinsData(transformedFavoriteData);
            console.log('✅ MarketScreen: 强制刷新自选币种数据成功:', transformedFavoriteData.length, '个币种');
            
            // 保持自选分组默认收起状态，即使登录成功也不自动展开
            // 用户可以手动点击展开按钮查看自选币种
          } else {
            setFavoriteCoinsData([]);
          }
        } else {
          console.warn('⚠️ MarketScreen: 强制刷新用户自选币种无数据');
          setUserFavoriteCoins(new Set());
          setFavoriteCoinsData([]);
        }
      } catch (error) {
        console.error('❌ MarketScreen: 强制刷新用户数据失败:', error);
        // 即使刷新失败，也保证基础状态正确
        setUserFavoriteCoins(new Set());
        setFavoriteCoinsData([]);
      }
    };
    
    // 立即执行第一次刷新
    refreshUserData();
    
    // 再设置一个后备刷新，确保UI状态正确
    setTimeout(() => {
      console.log('🔄 MarketScreen: 后备刷新检查...');
      if (userFavoriteCoins.size === 0) {
        console.log('🔄 MarketScreen: 检测到自选数据为空，执行后备刷新');
        refreshUserData();
      }
    }, 500);
  };

  const renderCoinItem = ({ item, section }: { item: CoinCardData; section?: string }) => {
    const coinSymbol = (item.symbol || item.name).toUpperCase();
    const isUserFavorite = userFavoriteCoins.has(coinSymbol);
    
    // 检测是否为股票数据：通过当前选择的分类或数据来源判断
    const isStock = selectedSort === '美股' || (section === 'stocks') || 
                   (typeof item.symbol === 'string' && item.symbol.length <= 5 && /^[A-Z]+$/.test(item.symbol));
    
    return (
      <CoinCard
        data={item}
        variant="default"
        context="market" // 指定为market场景
        onPress={(name, fullName) => {
          const params: any = { name, fromMarketScreen: true };
          if (fullName) {
            params.fullName = fullName;
          }
          if (isStock) {
            params.isStock = true; // 标记为股票详情
          }
          navigation.navigate('CoinDetail', params);
        }}
        showRank={true}
        showFavoriteButton={true} // 总是显示自选按钮
        isFavorited={isUserFavorite} // 新增：标识是否已自选
        showChart={true} // 启用24小时价格图表
        isStock={isStock} // 传递股票标记
        onFavoritePress={(coinSymbol, isAdding) => {
          console.log('🔥 MarketScreen: 收到CoinCard的自选点击回调', { coinSymbol, isAdding });
          handleFavoritePress(coinSymbol, isAdding);
        }}
        onLoginRequired={() => {
          console.log('🔐 MarketScreen: 收到CoinCard的登录需求回调');
          handleLoginRequired();
        }}
      />
    );
  };

  // 渲染分组标题
  // 渲染分组标题 - 标准设计方案
  const renderSectionHeader = (title: string, count: number, icon: string = 'star', isExpandable: boolean = false, showSortButton: boolean = false, isFavorites: boolean = false) => {
    // 选择合适的样式
    const headerStyle = isFavorites ? styles.favoritesHeader : styles.normalHeader;
    
    return (
      <TouchableOpacity 
        style={headerStyle}
        onPress={isExpandable ? () => setIsFavoritesExpanded(!isFavoritesExpanded) : undefined}
        activeOpacity={isExpandable ? 0.7 : 1}
      >
        <View style={styles.sectionTitleContainer}>
          <Ionicons 
            name={icon} 
            size={20} 
            color={isFavorites ? '#F59E0B' : UI_COLORS.primary} 
            style={styles.sectionIcon} 
          />
          <Text style={styles.sectionTitle}>{title}</Text>
          
          {/* 自选数量显示 */}
          {isFavorites && count > 0 && (
            <Text style={styles.favoritesCount}>{count}</Text>
          )}
          
          {/* 排序按钮 - 更优雅的设计 */}
          {showSortButton && (
            <TouchableOpacity 
              style={styles.sortChip}
              onPress={(e) => {
                e.stopPropagation();
                toggleFavoritesSort();
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={
                  favoritesSortOrder === 'desc' ? "trending-up" : 
                  favoritesSortOrder === 'asc' ? "trending-down" : 
                  "swap-vertical"
                } 
                size={14} 
                color={UI_COLORS.primary}
              />
              <Text style={styles.sortChipText}>
                {favoritesSortOrder === 'desc' ? '涨幅' : 
                 favoritesSortOrder === 'asc' ? '跌幅' : '排序'}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* 展开/收起箭头 */}
          {isExpandable && (
            <Ionicons 
              name={isFavoritesExpanded ? "chevron-up" : "chevron-down"} 
              size={18} 
              color="#6B7280"
              style={styles.expandIcon}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // 创建用于FlatList的数据源
  const flatListData = useMemo(() => {
    const { favorites, others } = groupedCoins;
    const data: Array<CoinCardData & { isHeader?: boolean; headerTitle?: string; headerIcon?: string; section?: string; isExpandable?: boolean }> = [];
    
    // 添加自选币种
    if (favorites.length > 0) {
      // 添加自选标题（可展开/收起）
      data.push({
        id: 'favorites-header',
        name: '',
        symbol: '',
        price: '',
        change: '',
        isPositive: true,
        isHeader: true,
        headerTitle: favoritesTitle,
        headerIcon: 'star',
        isExpandable: true,
      } as any);
      
      // 只有在展开状态时才添加自选币种
      if (isFavoritesExpanded) {
        favorites.forEach(coin => {
          data.push({ 
            ...coin, 
            id: `favorites-${coin.id}`, // 给自选分组的币种添加前缀，确保key唯一
            section: 'favorites' 
          });
        });
      }
    }
    
    // 添加其他币种（始终显示，不管自选是否展开）
    if (others.length > 0) {
      if (favorites.length > 0) {
        // 美股APP简化：根据当前排序显示相应的标题
        let headerTitle, headerIcon;
        if (selectedSort === '市值') {
          headerTitle = '按市值排序'; // 市值排序
          headerIcon = 'trending-up';
        } else if (selectedSort === '涨跌幅') {
          headerTitle = '按涨跌幅排序';
          headerIcon = 'trending-up';
        } else if (selectedSort === '24h成交量') {
          headerTitle = '按成交量排序';
          headerIcon = 'bar-chart';
        } else if (selectedSort === '价格') {
          headerTitle = '按价格排序';
          headerIcon = 'cash';
        } else {
          headerTitle = allCoinsTitle;
          headerIcon = 'list';
        }
        
        data.push({
          id: 'others-header',
          name: '',
          symbol: '',
          price: '',
          change: '',
          isPositive: true,
          isHeader: true,
          headerTitle: headerTitle,
          headerIcon: headerIcon,
          isExpandable: false,
        } as any);
      }
      
      others.forEach(coin => {
        data.push({ 
          ...coin, 
          id: `others-${coin.id}`, // 给全部币种分组的币种添加前缀，确保key唯一
          section: 'others' 
        });
      });
    }
    
    return data;
  }, [groupedCoins, isFavoritesExpanded, selectedSort]);

  // 统一的renderItem函数，处理标题和数据项
  const renderFlatListItem = ({ item }: { item: any }) => {
    if (item.isHeader) {
      const { favorites, others } = groupedCoins;
      const count = item.headerTitle === favoritesTitle ? favorites.length : 0;
      const showSortButton = item.headerTitle === favoritesTitle; // 只在自选分组显示排序按钮
      const isFavorites = item.headerTitle === favoritesTitle; // 是否为自选分组
      
      return renderSectionHeader(
        item.headerTitle, 
        count, 
        item.headerIcon, 
        item.isExpandable, 
        showSortButton, 
        isFavorites
      );
    }
    
    return renderCoinItem({ item, section: item.section });
  };

  const renderSortOption = ({ item }) => {
    const isSelected = selectedSort === item;
    
    // 定义分类标签，这些标签不支持排序切换
    const categoryLabels = ['美股', '公链', 'L2', 'MEME', 'DEFI', '平台币', '质押', '存储', 'Cosmos', 'NFT', '链游', 'AI', 'RWA'];
    const isCategoryTag = categoryLabels.some(label => sortOptionsLabels.includes(label) && item === label);
    
    const handleSortPress = () => {
      // 专门的类别标签（美股、公链、L2、MEME、DEFI、平台币、质押、存储、Cosmos、NFT、链游、AI、RWA）不支持排序切换，只是选择
      const categoryLabels = ['美股', '公链', 'L2', 'MEME', 'DEFI', '平台币', '质押', '存储', 'Cosmos', 'NFT', '链游', 'AI', 'RWA'];
      const isCategoryLabel = categoryLabels.some(label => sortOptionsLabels.includes(label) && item === label);
      
      // 市值按钮（第一个位置）不支持排序切换，始终为升序（从排名1开始）
      const sortIndex = sortOptionsLabels.indexOf(item);
      const isMarketCapSort = sortIndex === 0; // 第一个位置是市值
      
      if (item === sortOptionsLabels[1] || isCategoryLabel || isMarketCapSort) {
        setSelectedSort(item);
        setSortOrder('asc'); // 市值、美股和分类标签都固定为升序
        // 重置渐进式加载状态
        setProgressiveLoadCompleted(false);
        setIsProgressiveLoading(false);
        setCurrentLoadingBatch(0);
        setActiveBatchLoaders(new Set());
        // 更新URL
        updateURL(item);
        return;
      }
      
      if (isSelected) {
        // 如果点击的是已选中的按钮，切换排序顺序（市值除外）
        setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
        // 重置渐进式加载状态
        setProgressiveLoadCompleted(false);
        setIsProgressiveLoading(false);
        setCurrentLoadingBatch(0);
        setActiveBatchLoaders(new Set());
      } else {
        // 选择新的排序选项
        setSelectedSort(item);
        // 重置渐进式加载状态
        setProgressiveLoadCompleted(false);
        setIsProgressiveLoading(false);
        setCurrentLoadingBatch(0);
        setActiveBatchLoaders(new Set());
        // 更新URL
        updateURL(item);
        // 根据不同的排序选项设置默认排序顺序
        switch (sortIndex) {
          case 0: // 第一个位置：市值
            setSortOrder('asc'); // 市值排序固定为升序（rank从小到大，即排名从1开始）
            break;
          case 2: // 第三个位置：涨跌幅
            setSortOrder('desc'); // 涨跌幅排序默认为降序（从高到低）
            break;
          case 3: // 第四个位置：24h成交量
            setSortOrder('desc'); // 成交量排序默认为降序（从高到低）
            break;
          case 4: // 第五个位置：价格
            setSortOrder('desc'); // 价格排序默认为降序（从高到低）
            break;
          default:
            setSortOrder('asc');
        }
      }
    };

    return (
      <TouchableOpacity 
        style={[
          styles.sortOption, 
          isSelected && styles.selectedSortOption
        ]}
        onPress={handleSortPress}
      >
        <View style={styles.sortOptionContent}>
          <Text style={[
            styles.sortOptionText,
            isSelected && styles.selectedSortOptionText
          ]}>
            {item}
          </Text>
          {isSelected && !isCategoryTag && ( // 分类标签不显示箭头
            <Ionicons 
              name={
                sortOptionsLabels.indexOf(item) === 0  // 第一个位置：市值
                  ? (sortOrder === 'asc' ? 'arrow-down' : 'arrow-up')  // 市值：asc=rank从小到大=市值从高到低，所以显示向下箭头
                  : (sortOrder === 'asc' ? 'arrow-up' : 'arrow-down')   // 其他：正常显示
              }
              size={12} 
              color={isSelected ? 'white' : '#666'} 
              style={styles.sortArrow}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // 渲染加载状态
  const renderLoading = () => {
    // 使用骨架屏替代简单的loading指示器，提供更好的用户体验
    return (
      <View style={styles.container}>
        {listHeadersEnabled && (
          <View style={styles.listHeader}>
            <Text style={styles.rankHeader}>{listHeaders[0] || '#'}</Text>
            <Text style={styles.nameHeader}>{listHeaders[1] || '名称'}</Text>
            <Text style={styles.priceHeader}>{listHeaders[2] || '价格/24h'}</Text>
          </View>
        )}
        <SkeletonList count={15} />
      </View>
    );
  };

  // 渲染加载更多的底部组件
  const renderFooter = () => {
    // 显示滚动加载更多的状态
    if (loadingMore) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.footerLoadingText}>加载更多...</Text>
        </View>
      );
    }
    
    // 显示渐进式加载状态
    if (isProgressiveLoading && !loading && coins.length > 0) {
      const activeBatchCount = activeBatchLoaders.size;
      const totalBatches = totalInitialBatches;
      const loadedBatches = currentLoadingBatch;
      
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color="#007AFF" style={{ opacity: 0.8 }} />
          <Text style={[styles.footerLoadingText, { opacity: 0.8 }]}>
            智能加载中... {loadedBatches}/{totalBatches} ({activeBatchCount} 个并行)
          </Text>
        </View>
      );
    }
    
    return null;
  };

  // 渲染空状态
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={50} color={UI_COLORS.secondaryText} />
      <Text style={styles.emptyText}>
        {searchText ? (
          isSearching ? '搜索中...' : (
            searchError ? searchError : '未找到相关币种'
          )
        ) : selectedSort === sortOptionsLabels[1] ? ( // 第二个位置的标签（美股/其他市场）
          usStocksError ? usStocksError : `暂无${sortOptionsLabels[1]}数据`
        ) : '暂无数据'}
      </Text>
      {(error || searchError || usStocksError) && (
        <TouchableOpacity 
          onPress={() => {
            if (searchText) {
              searchCoins(searchText);
            } else if (selectedSort === sortOptionsLabels[1]) { // 第二个位置的标签（美股/其他市场）
              fetchUSStockData();
            } else {
              fetchMarketData(0);
            }
          }} 
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>重试</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <TodayHeader 
        activeTab="market"
        onBackPress={() => {}} // 不需要返回功能
        onLoginPress={handleLoginPress}
        onUserPress={handleUserPress}
        title={headerTitle}
        showShareButton={true}
        onSharePress={handleShare}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#999"
        />
        {searchText !== '' && (
          <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Sort Options */}
      <View style={styles.filtersContainer}>
        <View style={styles.filtersWrapper}>
          <FlatList
            ref={sortListRef}
            data={SORT_OPTIONS}
            renderItem={renderSortOption}
            keyExtractor={item => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortOptionsList}
            onScroll={handleSortScroll}
            scrollEventThrottle={16}
          />
          
          {/* 滚动指示器 */}
          {showScrollIndicator && scrollIndicatorText && (
            <TouchableOpacity 
              style={styles.scrollIndicator}
              onPress={handleScrollIndicatorPress}
              activeOpacity={0.7}
            >
              <Text style={styles.scrollIndicatorText}>{scrollIndicatorText}</Text>
            </TouchableOpacity>
          )}
          
          {/* 右侧渐变遮罩效果 */}
          {showScrollIndicator && (
            <View style={styles.gradientMask} />
          )}
        </View>
      </View>

      {/* Coins List */}
      {(loading || usStocksLoading) ? (
        renderLoading()
      ) : (
        <FlatList
          data={flatListData}
          renderItem={renderFlatListItem}
          keyExtractor={item => item.id || `${item.name}_${item.rank}`} // 使用id或组合rank和name作为唯一标识符
          contentContainerStyle={[
            styles.coinsList,
            flatListData.length === 0 && styles.coinsListEmpty
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={searchText ? undefined : loadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            listHeadersEnabled ? (
              <View style={styles.listHeader}>
                <Text style={styles.rankHeader}>{listHeaders[0] || '#'}</Text>
                <Text style={styles.nameHeader}>{listHeaders[1] || '名称'}</Text>
                <Text style={styles.priceHeader}>{listHeaders[2] || '价格/24h'}</Text>
              </View>
            ) : null
          }
          ListFooterComponent={searchText ? null : renderFooter}
          ListEmptyComponent={renderEmpty}
          // 性能优化配置
          maxToRenderPerBatch={20}
          windowSize={21}
          initialNumToRender={20}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
          getItemLayout={undefined} // 使用自动布局，因为项目高度可能不一致
          // 优化滚动性能
          scrollEventThrottle={16}
          legacyImplementation={false}
          disableVirtualization={false}
        />
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
      
      {/* ShareModal */}
      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        title={`${selectedSort}行情`}
        description={`查看${selectedSort}相关的加密货币行情数据`}
        url={getWebAppURL(`market?label=${encodeURIComponent(selectedSort)}`)}
        onShowMessage={showMessageModal}
      />
    </View>
  );
};

export default MarketScreen;