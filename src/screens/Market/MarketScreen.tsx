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
import StockCard, { StockCardData } from '../../components/ui/StockCard';

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

import stockService, { StockData, TransformedStockData } from '../../services/StockService';
import stockLogoService from '../../services/StockLogoService';
import userStockService from '../../services/UserStockService';
import configService from '../../services/ConfigService';
import { useUSStockRealTimePrice } from '../../contexts/USStockRealTimePriceContext';
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
  // 实时价格Hook - 美股
  const { realTimePrices: stockRealTimePrices, priceChanges: stockPriceChanges, startPolling: startStockPolling, stopPolling: stopStockPolling } = useUSStockRealTimePrice();
  
  // 使用用户Context
  const { currentUser, logout } = useUser();
  
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 美股相关状态
  const [usStocks, setUsStocks] = useState<StockCardData[]>([]);
  const [usStocksLoading, setUsStocksLoading] = useState(false);
  const [usStocksError, setUsStocksError] = useState<string | null>(null);

  // 防抖搜索文本
  const debouncedSearchText = useDebounce(searchText, 500);
  const [searchResults, setSearchResults] = useState<StockCardData[]>([]);
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

  // 用户自选股票状态
  const [userFavoriteStocks, setUserFavoriteStocks] = useState<Set<string>>(new Set());
  const [loadingUserStocks, setLoadingUserStocks] = useState(false);
  const [isFavoritesExpanded, setIsFavoritesExpanded] = useState(false); // 自选分组展开状态，默认收起
  const [favoriteStocksData, setFavoriteStocksData] = useState<StockCardData[]>([]); // 自选股票的完整数据
  const [favoritesSortOrder, setFavoritesSortOrder] = useState<'asc' | 'desc' | 'none'>('none'); // 自选分组排序状态（初始化后会被配置覆盖）

  // 配置相关状态 - 美股APP专用
  const [configsLoaded, setConfigsLoaded] = useState(false); // 配置是否已加载
  
  // 分享相关状态
  const [shareModalVisible, setShareModalVisible] = useState(false);
  
  // UI文本配置状态
  const [headerTitle, setHeaderTitle] = useState('行情');
  const [searchPlaceholder, setSearchPlaceholder] = useState('搜索股票...');
  const [favoritesTitle, setFavoritesTitle] = useState('我的自选');
  const [allStocksTitle, setAllStocksTitle] = useState('全部股票');
  const [listHeaders, setListHeaders] = useState(['#', '名称', '价格/24h']);
  const [listHeadersEnabled, setListHeadersEnabled] = useState(true); // 表头显示开关
  
  // 市场列表标签配置状态 - 从后端MARKET_LIST_LABEL获取，包含各字段的显示名称
  // 后端配置格式: { rank: "市值", currentPrice: "最新价", volume: "成交量", peRatio: "市盈率", priceChangePercent: "涨跌幅" }
  // 默认值保证没有后端配置也能正常显示
  const [marketListLabels, setMarketListLabels] = useState({
    rank: "排名",
    currentPrice: "最新价",
    volume: "成交量", 
    peRatio: "市盈率",
    priceChangePercent: "涨跌幅",
    marketcap: "市值",
    name: "名称"
  });

  // 性能配置状态
  const [pageSize, setPageSize] = useState(100);
  
  // 过滤和排序状态
  const [selectedSortField, setSelectedSortField] = useState('rank'); // 当前选中的排序字段
  const [selectedSortOrder, setSelectedSortOrder] = useState<'asc' | 'desc'>('asc'); // 当前排序方向
  const [availableFilters, setAvailableFilters] = useState<Array<{
    key: string;
    label: string;
    isSelected: boolean;
    sortOrder: 'asc' | 'desc' | 'none';
  }>>([
    { key: 'rank', label: '排名', isSelected: true, sortOrder: 'asc' },
    { key: 'currentPrice', label: '最新价', isSelected: false, sortOrder: 'none' },
    { key: 'volume', label: '成交量', isSelected: false, sortOrder: 'none' },
    { key: 'peRatio', label: '市盈率', isSelected: false, sortOrder: 'none' },
    { key: 'priceChangePercent', label: '涨跌幅', isSelected: false, sortOrder: 'none' }
  ]);
  
  // 优化加载状态 - 渐进式分批加载
  const [initialBatchSize] = useState(30); // 首次快速加载的数量（提升到30条）
  const [progressiveBatchSize] = useState(25); // 渐进式每批加载的数量（提升到25条）
  const [totalInitialBatches] = useState(4); // 初始总批次数 (0-100条数据：30+25+25+25=105条)
  const [isProgressiveLoading, setIsProgressiveLoading] = useState(false); // 渐进式加载状态
  const [currentLoadingBatch, setCurrentLoadingBatch] = useState(0); // 当前加载到第几批
  const [progressiveLoadCompleted, setProgressiveLoadCompleted] = useState(false); // 渐进式加载完成标志
  const [activeBatchLoaders, setActiveBatchLoaders] = useState(new Set<number>()); // 活跃的批次加载器

  // 滚动指示器状态
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [scrollIndicatorText, setScrollIndicatorText] = useState('');
  const sortListRef = useRef<FlatList>(null);

  // 获取市场列表标签的辅助函数
  const getMarketLabel = (key: keyof typeof marketListLabels): string => {
    return marketListLabels[key] || key;
  };

  // 示例：如何使用市场列表标签
  // getMarketLabel('rank') -> "市值" (如果后端配置了) 或 "排名" (默认值)
  // getMarketLabel('currentPrice') -> "最新价" (如果后端配置了) 或 "最新价" (默认值)
  // getMarketLabel('priceChangePercent') -> "涨跌幅" (如果后端配置了) 或 "涨跌幅" (默认值)

  // 检查初始URL参数
  const getInitialLabelFromURL = () => {
    return null; // 移除排序标签后，不再需要URL参数处理
  };

  // 检查是否需要显示滚动指示器
  useEffect(() => {
    // 检查过滤选项是否需要滚动指示器
    if (availableFilters.length > 3) { // 当过滤选项超过3个时显示指示器
      setShowScrollIndicator(true);
      setScrollIndicatorText('更多');
    } else {
      setShowScrollIndicator(false);
    }
  }, [availableFilters]);

  // 处理滚动指示器点击
  const handleScrollIndicatorPress = () => {
    // 滚动到过滤选项列表的末尾
    if (sortListRef.current) {
      sortListRef.current.scrollToEnd({ animated: true });
    }
  };

  // 处理过滤选项滚动事件
  const handleSortScroll = (event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const contentWidth = event.nativeEvent.contentSize.width;
    const containerWidth = event.nativeEvent.layoutMeasurement.width;
    
    // 当滚动接近末尾时隐藏指示器
    if (scrollX + containerWidth >= contentWidth - 20) {
      setShowScrollIndicator(false);
    } else if (availableFilters.length > 3) {
      setShowScrollIndicator(true);
      setScrollIndicatorText('更多');
    }
  };

  // 将股票数据转换为StockCard组件需要的格式 - 美股专用版本
  const transformStockData = async (stockData: any[], useRealTimePrices = false): Promise<StockCardData[]> => {
    // 简化处理：美股APP只处理股票数据，统一使用股票logo服务
    const symbols = stockData.map(stock => stock.name || stock.code);
    
    // 优先级设置
    const priority = refreshing ? 'high' : (currentPage === 0 ? 'normal' : 'background');
    
    // 统一使用股票logo服务
    const logos = stockLogoService.getLogosSync(symbols);
    
    // 异步预加载股票logos（不阻塞）
    stockLogoService.preloadPopularStocks().catch(console.warn);

    // 批量转换数据 - 美股格式
    const transformedStocks = stockData.map(stock => {
      // 调试：检查价格转换过程（仅在开发模式下）
      const rawPrice = stock.currentPrice;
      const parsedPrice = parseFloat(stock.currentPrice);
      
      // 美股价格处理：不使用实时价格API，因为该API只支持加密货币
      // 始终使用API返回的股票价格，避免与同名加密货币代币混淆
      const currentPrice = parsedPrice;
      
      // 格式化价格
      const formattedPrice = `$${currentPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      })}`;

      // 获取价格变动方向 - 使用美股价格变动
      const stockKey = (stock.name || stock.code).toLowerCase();
      const priceChangeDirection = stockPriceChanges[stockKey] || null;

      return {
        id: `${stock.name || stock.code}_${stock.rank}`, // 使用股票代码和rank的组合
        name: stock.name || stock.code, // 股票代码如NVDA, AAPL
        fullName: stock.fullName || (stock.name && stock.code ? `${stock.name} Corporation` : ''), // 公司全名
        symbol: stock.name || stock.code, // 股票代码
        price: formattedPrice,
        change: stock.priceChange24h || stock.priceChangePercent || '0%',
        isPositive: !(stock.priceChange24h || stock.priceChangePercent || '').startsWith('-'),
        rank: stock.rank,
        marketCap: stock.marketcap || stock.baseinfo?.marketCap || '',
        volume: stock.volume || stock.baseinfo?.volume || '',
        // 使用股票logo服务获取的logo
        logo: logos[stock.name || stock.code],
        // 添加价格变动标志
        priceChangeDirection,
        // 添加24小时价格数据
        stock24h: stock.usstock24h || [],
      };
    });

    return transformedStocks;
  };

  // 获取排序参数 - 美股APP专用
  const getSortParams = () => {
    // 使用当前选中的过滤字段和排序方向
    return { 
      sortBy: selectedSortField as const, 
      sortOrder: selectedSortOrder as const 
    };
  };

  // 处理过滤选项点击
  const handleFilterPress = (filterKey: string) => {
    console.log('🔄 MarketScreen: Filter pressed:', filterKey);
    
    setAvailableFilters(prevFilters => {
      const updatedFilters = prevFilters.map(filter => {
        if (filter.key === filterKey) {
          let newSortOrder: 'asc' | 'desc' | 'none';
          
          if (filter.sortOrder === 'none') {
            newSortOrder = 'desc'; // 首次点击：降序
          } else if (filter.sortOrder === 'desc') {
            newSortOrder = 'asc';  // 第二次点击：升序
          } else {
            newSortOrder = 'desc'; // 第三次点击：回到降序
          }
          
          // 更新全局选中状态
          setSelectedSortField(filterKey);
          setSelectedSortOrder(newSortOrder);
          
          return {
            ...filter,
            isSelected: true,
            sortOrder: newSortOrder
          };
        } else {
          // 其他选项设为未选中
          return {
            ...filter,
            isSelected: false,
            sortOrder: 'none'
          };
        }
      });
      
      console.log('✅ MarketScreen: Updated filters:', updatedFilters);
      return updatedFilters;
    });
    
    // 重置数据并重新加载
    setUsStocks([]);
    setDisplayedItemCount(30); // 重置为30条
    setCurrentPage(0);
    setHasMore(true);
    fetchMarketData(0, true);
  };

  // 加载配置
  const loadConfigs = async () => {
    try {
      console.log('🔄 MarketScreen: Loading configs...');
      
      // 并行初始化配置服务和获取配置
      const [_, headerTitleConfig, searchPlaceholderConfig, favoritesTitleConfig, allCoinsTitleConfig, listHeadersConfig, listHeadersEnabledConfig, pageSizeConfig, favoritesExpandedConfig, favoritesSortConfig, marketListLabelsConfig] = await Promise.all([
        // 确保ConfigService完全初始化
        configService.init(),
        // 并行获取所有配置
        configService.getConfig('MARKET_HEADER_TITLE', '行情'),
        configService.getConfig('MARKET_SEARCH_PLACEHOLDER', '搜索美股...'), // 美股APP搜索提示
        configService.getConfig('MARKET_FAVORITES_TITLE', '我的自选'),
        configService.getConfig('MARKET_ALL_COINS_TITLE', '全部股票'),
        configService.getConfig('MARKET_LIST_HEADERS', '#,名称,价格/24h'),
        configService.getConfig('MARKET_LIST_HEADERS_ENABLE', 'false'),
        configService.getConfig('MARKET_PAGE_SIZE', '100'),
        configService.getConfig('MARKET_FAVORITES_DEFAULT_EXPANDED', 'false'),
        configService.getConfig('MARKET_FAVORITES_DEFAULT_SORT', 'none'),
        configService.getConfig('MARKET_LIST_LABEL', null) // 获取市场列表标签配置
      ]);
      
      console.log('✅ MarketScreen: ConfigService initialized');
      
      setConfigsLoaded(true); // 标记配置已加载
      
      // 重置渐进式加载状态
      setProgressiveLoadCompleted(false);
      setIsProgressiveLoading(false);
      setCurrentLoadingBatch(0);
      setActiveBatchLoaders(new Set());
      
      // 设置UI文本
      setHeaderTitle(headerTitleConfig);
      setSearchPlaceholder(searchPlaceholderConfig);
      setFavoritesTitle(favoritesTitleConfig);
      setAllStocksTitle(allCoinsTitleConfig);
      
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
      
      // 解析市场列表标签配置
      if (marketListLabelsConfig) {
        try {
          // 如果后端返回的是字符串，尝试解析为JSON对象
          const parsedLabels = typeof marketListLabelsConfig === 'string' 
            ? JSON.parse(marketListLabelsConfig) 
            : marketListLabelsConfig;
            
          // 合并后端配置和默认值，确保所有必需的标签都存在
          const updatedLabels = {
            rank: parsedLabels.rank || "排名",
            currentPrice: parsedLabels.currentPrice || "最新价", 
            volume: parsedLabels.volume || "成交量",
            peRatio: parsedLabels.peRatio || "市盈率",
            priceChangePercent: parsedLabels.priceChangePercent || "涨跌幅",
            marketcap: parsedLabels.marketcap || parsedLabels.rank || "市值", // rank可能对应市值
            name: parsedLabels.name || "名称"
          };
          
          setMarketListLabels(updatedLabels);
          
          // 根据后端配置更新过滤选项
          const updatedFilters = [
            { key: 'rank', label: updatedLabels.rank, isSelected: true, sortOrder: 'asc' as const },
            { key: 'currentPrice', label: updatedLabels.currentPrice, isSelected: false, sortOrder: 'none' as const },
            { key: 'volume', label: updatedLabels.volume, isSelected: false, sortOrder: 'none' as const },
            { key: 'peRatio', label: updatedLabels.peRatio, isSelected: false, sortOrder: 'none' as const },
            { key: 'priceChangePercent', label: updatedLabels.priceChangePercent, isSelected: false, sortOrder: 'none' as const }
          ];
          setAvailableFilters(updatedFilters);
          
          console.log('✅ MarketScreen: Market list labels updated from backend:', updatedLabels);
          console.log('✅ MarketScreen: Filter options updated:', updatedFilters);
        } catch (error) {
          console.warn('⚠️ MarketScreen: Failed to parse MARKET_LIST_LABEL config, using defaults:', error);
          // 解析失败时保持默认值
        }
      } else {
        console.log('📝 MarketScreen: No MARKET_LIST_LABEL config found, using default labels');
        // 没有后端配置时保持默认值
      }
      
      console.log(`✅ MarketScreen: UI text configs loaded:`, {
        headerTitle: headerTitleConfig,
        searchPlaceholder: searchPlaceholderConfig,
        favoritesTitle: favoritesTitleConfig,
        allStocksTitle: allCoinsTitleConfig,
        listHeaders: finalHeaders,
        listHeadersEnabled: headersEnabled,
        marketListLabels: marketListLabels
      });
      
      console.log(`✅ MarketScreen: Performance configs loaded:`, {
        pageSize: finalPageSize,
        favoritesDefaultExpanded: defaultExpanded,
        favoritesDefaultSort: defaultSortOrder
      });
      
    } catch (error) {
      console.error('❌ MarketScreen: Failed to load configs:', error);
      // 如果加载配置失败，使用默认值
      setHeaderTitle('行情');
      setSearchPlaceholder('搜索美股...');  // 美股APP默认搜索提示
      setFavoritesTitle('我的自选');
      setAllStocksTitle('全部股票');
      setListHeaders(['#', '名称', '价格/24h']);
      setListHeadersEnabled(true); // 默认显示表头
      setPageSize(100);
      setIsFavoritesExpanded(false);
      setFavoritesSortOrder('none');
      
      // 设置默认的市场列表标签
      setMarketListLabels({
        rank: "排名",
        currentPrice: "最新价",
        volume: "成交量", 
        peRatio: "市盈率",
        priceChangePercent: "涨跌幅",
        marketcap: "市值",
        name: "名称"
      });
      
      // 设置默认的过滤选项
      setAvailableFilters([
        { key: 'rank', label: '排名', isSelected: true, sortOrder: 'asc' },
        { key: 'currentPrice', label: '最新价', isSelected: false, sortOrder: 'none' },
        { key: 'volume', label: '成交量', isSelected: false, sortOrder: 'none' },
        { key: 'peRatio', label: '市盈率', isSelected: false, sortOrder: 'none' },
        { key: 'priceChangePercent', label: '涨跌幅', isSelected: false, sortOrder: 'none' }
      ]);
      
      setConfigsLoaded(true);
      
      // 重置渐进式加载状态
      setProgressiveLoadCompleted(false);
      setIsProgressiveLoading(false);
      setCurrentLoadingBatch(0);
      setActiveBatchLoaders(new Set());
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
        // 重置显示数量
        setDisplayedItemCount(30); // 更新为30条
      }
      
      console.log('🔄 MarketScreen: Fetching US stocks list with progressive loading...', { page, isRefresh });
      
      // 使用渐进式加载：首次加载30条，然后逐步加载更多
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
      // 第一批使用 initialBatchSize，后续批次使用 progressiveBatchSize
      const isFirstBatch = batchIndex === 0;
      const currentBatchSize = isFirstBatch ? initialBatchSize : progressiveBatchSize;
      const skip = isFirstBatch ? 0 : initialBatchSize + (batchIndex - 1) * progressiveBatchSize;
      
      console.log(`🔄 MarketScreen: Loading stock batch ${batchIndex}, skip: ${skip}, limit: ${currentBatchSize}`);
      
      // 获取排序参数
      const { sortBy, sortOrder: apiSortOrder } = getSortParams();
      
      // 直接调用StockService获取分页数据，使用正确的排序参数
      const stocksData = await stockService.getUSStocksList(skip, currentBatchSize, sortBy, apiSortOrder);
      
      if (stocksData.length > 0) {
        // 将StockData转换为StockCardData格式，然后再转换为StockCardData
        const stockDataFormat = stocksData.map(stock => {
          // 确保currentPrice是正确的当前股价，不是历史数据
          const currentStockPrice = stock.currentPrice;
          
          return {
            _id: stock._id,
            coin_id: stock._id,
            rank: stock.rank,
            name: stock.code, // 使用股票代码
            fullName: stock.name, // 使用公司全名
            symbol: stock.code,
            currentPrice: currentStockPrice, // 明确使用股票当前价格
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
            stock24h: stock.usstock24h?.map(item => ({
              price: parseFloat(item.price),
              createdAt: item.createdAt
            })) || []
          };
        });
        
        const transformedStocks = await transformStockData(stockDataFormat, false); // 改为使用transformStockData处理股票数据
        
        // 更新股票列表 - 简单追加方式，保持后端API的排序
        if (isNewSession && batchIndex === 0) {
          setUsStocks(transformedStocks);
        } else {
          setUsStocks(prev => [...prev, ...transformedStocks]);
        }
        
        console.log(`✅ MarketScreen: Stock batch ${batchIndex} loaded successfully, ${transformedStocks.length} stocks`);
      }
      
      return { 
        success: true, 
        hasMore: stocksData.length === currentBatchSize, // 如果返回的数据等于当前批次大小，可能还有更多
        total: skip + stocksData.length,
        batchSize: currentBatchSize
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
    
    // 如果是新的加载会话，重置hasMore状态
    if (startBatch === 0) {
      setHasMore(true);
    }
    
    const maxBatches = startBatch + totalInitialBatches;
    
    try {
      // 第一步：立即加载第一批数据（0-10条股票）
      if (startBatch === 0) {
        const firstResult = await loadStockBatchData(0, true);
        if (!firstResult.success) {
          throw new Error('Failed to load first batch');
        }
      }
      
      // 第二步：并行加载剩余批次
      const batchPromises: Promise<any>[] = [];
      const startIndex = startBatch === 0 ? 1 : startBatch;
      
      for (let batchIndex = startIndex; batchIndex < maxBatches; batchIndex++) {
        batchPromises.push(loadStockBatchData(batchIndex, false));
      }
      
      console.log(`📦 MarketScreen: Starting parallel loading of ${batchPromises.length} stock batches`);
      
      // 等待所有批次完成
      const results = await Promise.all(batchPromises);
      
      // 检查是否还有更多数据 - 修复逻辑
      const successfulResults = results.filter((result: any) => result.success);
      const lastResult = successfulResults[successfulResults.length - 1] as any;
      
      // 如果最后一批数据量少于期望的limit，说明没有更多数据了
      const expectedLimit = progressiveBatchSize;
      const actualLastBatchSize = lastResult ? (lastResult.total - (maxBatches - 1) * progressiveBatchSize) : 0;
      const hasMoreData = lastResult?.hasMore && actualLastBatchSize >= expectedLimit;
      
      setHasMore(hasMoreData);
      setProgressiveLoadCompleted(true);
      
      console.log(`✅ MarketScreen: Stock progressive loading completed`, {
        totalBatches: results.length,
        successfulBatches: successfulResults.length,
        hasMore: hasMoreData,
        lastBatchSize: actualLastBatchSize,
        expectedLimit
      });
      
    } catch (error) {
      console.error('❌ Stock progressive loading failed:', error);
      setUsStocksError(error instanceof Error ? error.message : 'Failed to load stock data');
      setHasMore(false); // 出错时设置为没有更多数据
    } finally {
      setIsProgressiveLoading(false);
    }
  };

  // 搜索美股（使用本地数据进行过滤搜索）
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
      console.log('🔄 MarketScreen: Searching stocks with query:', query);
      
      // 改为搜索美股数据而不是加密货币
      const allStocks = await stockService.getUSStocksList(0, 1000); // 获取大量股票数据用于搜索
      const searchedStocks = allStocks.filter(stock => 
        stock.code.toLowerCase().includes(query.toLowerCase()) ||
        stock.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 50); // 限制搜索结果数量
      
      console.log('🔍 MarketScreen: Raw search results:', searchedStocks.length, searchedStocks);
      
      const transformedResults = await transformStockData(searchedStocks);
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

  // 获取美股市场数据 - 美股APP专用版本
  const fetchMarketData = async (page: number = 0, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setError(null);
      } else if (page === 0) {
        setLoading(true);
        setError(null);
      }
      
      console.log('🔄 MarketScreen: Fetching US stock market data...', { page, isRefresh });
      
      // 美股APP直接调用美股数据加载
      await fetchUSStockData(page, isRefresh);
      
    } catch (err) {
      console.error('❌ MarketScreen: Failed to fetch market data:', err);
      setError('加载市场数据失败，请稍后再试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 下拉刷新
  const onRefresh = React.useCallback(() => {
    // 下拉刷新时，同时强制刷新logo缓存
    fetchMarketData(0, true);
  }, []);



  // 添加显示页面状态，用于控制渐进显示已加载的数据
  const [displayedItemCount, setDisplayedItemCount] = useState(30); // 初始显示30条，与initialBatchSize一致

  // 加载更多 - 恢复正常的分页加载逻辑
  const loadMore = React.useCallback(() => {
    console.log('📊 MarketScreen: loadMore called', { 
      loadingMore, 
      hasMore, 
      searchText: searchText.trim(),
      currentPage,
      usStocksLength: usStocks.length,
      displayedItemCount 
    });
    
    // 如果正在加载或没有更多数据或在搜索状态，则不执行加载
    if (loadingMore || !hasMore || searchText.trim()) {
      console.log('📊 MarketScreen: loadMore skipped', { 
        loadingMore, 
        hasMore, 
        isSearching: !!searchText.trim() 
      });
      return;
    }
    
    // 如果还有未显示的数据，先显示已加载的数据
    if (displayedItemCount < usStocks.length) {
      const nextCount = Math.min(displayedItemCount + 25, usStocks.length); // 每次显示更多25条
      console.log('📊 MarketScreen: Showing more loaded data', { from: displayedItemCount, to: nextCount });
      setDisplayedItemCount(nextCount);
      return;
    }
    
    // 如果所有已加载数据都显示了，继续加载更多数据
    console.log('📊 MarketScreen: Loading next page of data');
    setLoadingMore(true);
    setCurrentPage(prev => prev + 1);
    
    // 继续渐进式加载更多股票数据
    // 计算下一个批次索引：第一批30条，后续每批25条
    let nextBatchIndex;
    if (usStocks.length <= initialBatchSize) {
      nextBatchIndex = 1; // 下一批是第二批
    } else {
      nextBatchIndex = Math.floor((usStocks.length - initialBatchSize) / progressiveBatchSize) + 1;
    }
    
    startStockProgressiveLoading(nextBatchIndex)
      .catch(error => {
        console.error('❌ MarketScreen: Failed to load more stocks:', error);
        setUsStocksError('加载更多数据失败');
      })
      .finally(() => {
        setLoadingMore(false);
      });
      
  }, [loadingMore, hasMore, searchText, currentPage, usStocks.length, displayedItemCount]);

  // 组件挂载时先加载配置
  useEffect(() => {
    console.log('🔄 MarketScreen: Component mounted, loading configs...');
    loadConfigs();
  }, []);

  // 调试：监听市场列表标签变化
  useEffect(() => {
    console.log('🏷️ MarketScreen: Market list labels updated:', marketListLabels);
  }, [marketListLabels]);

  // 调试：监听过滤选项变化
  useEffect(() => {
    console.log('🔄 MarketScreen: Available filters updated:', availableFilters);
    console.log('🔄 MarketScreen: Selected sort field:', selectedSortField, 'order:', selectedSortOrder);
  }, [availableFilters, selectedSortField, selectedSortOrder]);

  // 数据加载：配置加载完成时
  useEffect(() => {
    if (configsLoaded) {
      console.log('🔄 MarketScreen: 数据加载useEffect触发:', { 
        configsLoaded,
        triggerReason: '配置加载完成'
      });
      // 重置显示数量到初始状态
      setDisplayedItemCount(20);
      fetchMarketData(0);
    } else {
      console.log('🔄 MarketScreen: 数据加载跳过:', { 
        configsLoaded, 
        reason: '配置未加载'
      });
    }
  }, [configsLoaded]);

  // 管理实时价格轮询
  useEffect(() => {
    if (usStocks.length > 0) {
      // 美股APP：启动美股价格轮询
      startStockPolling();
    } else {
      stopStockPolling();
    }

    // 清理函数
    return () => {
      stopStockPolling();
    };
  }, [usStocks.length]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopStockPolling();
    };
  }, []);

  // 监听实时价格变化，更新币种列表的价格显示
  useEffect(() => {
    // 美股APP：使用美股实时价格
    const hasStockPrices = Object.keys(stockRealTimePrices).length > 0;
    
    if (hasStockPrices && (usStocks.length > 0 || favoriteStocksData.length > 0)) {
      // 使用防抖机制来减少频繁的状态更新
      const timeoutId = setTimeout(() => {
        // 更新美股价格
        if (usStocks.length > 0 && hasStockPrices) {
          setUsStocks(prevStocks => prevStocks.map(stock => {
            const stockKey = stock.name.toLowerCase();
            const realTimePrice = stockRealTimePrices[stockKey];
            const priceDirection = stockPriceChanges[stockKey];
            
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

        // 更新自选币种价格（美股）
        if (favoriteStocksData.length > 0) {
          setFavoriteStocksData(prevFavorites => prevFavorites.map(item => {
            const itemKey = item.name.toLowerCase();
            
            // 使用美股实时价格
            const stockRealTimePrice = stockRealTimePrices[itemKey];
            const stockPriceDirection = stockPriceChanges[itemKey];
            
            if (stockRealTimePrice) {
              return {
                ...item,
                price: `$${stockRealTimePrice.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6
                })}`,
                priceChangeDirection: stockPriceDirection || item.priceChangeDirection
              };
            }
            
            // 只更新价格变动方向
            return {
              ...item,
              priceChangeDirection: stockPriceDirection || item.priceChangeDirection
            };
          }));
        }

        // 同时更新搜索结果的价格
        if (searchResults.length > 0) {
          setSearchResults(prevResults => prevResults.map(item => {
            const itemKey = item.name.toLowerCase();
            
            // 使用美股实时价格
            const stockRealTimePrice = stockRealTimePrices[itemKey];
            const stockPriceDirection = stockPriceChanges[itemKey];
            
            if (stockRealTimePrice) {
              return {
                ...item,
                price: `$${stockRealTimePrice.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6
                })}`,
                priceChangeDirection: stockPriceDirection || item.priceChangeDirection
              };
            }
            
            // 只更新价格变动方向
            return {
              ...item,
              priceChangeDirection: stockPriceDirection || item.priceChangeDirection
            };
          }));
        }
      }, 100); // 100ms防抖，避免过于频繁的价格更新
      
      return () => clearTimeout(timeoutId);
    }
  }, [stockRealTimePrices, stockPriceChanges, searchResults.length, usStocks.length, favoriteStocksData.length]);

  // 根据搜索状态决定显示的币种列表
  const displayStocks = useMemo(() => {
    // 美股APP简化：如果有搜索文本，显示搜索结果，否则显示股票数据
    if (searchText.trim()) {
      console.log('🔍 MarketScreen: Displaying search results:', searchResults.length);
      return searchResults;
    }
    
    // 美股APP只有股票数据，根据displayedItemCount限制显示数量
    const limitedStocks = usStocks.slice(0, displayedItemCount);
    console.log('📊 MarketScreen: Displaying US stocks:', limitedStocks.length, 'out of', usStocks.length, 'total');
    return limitedStocks;
  }, [searchText, searchResults, usStocks, displayedItemCount]);

  // 分组显示股票：自选在前，全部股票包含所有（包括已自选的）
  const groupedStocks = useMemo(() => {
    if (!currentUser || userFavoriteStocks.size === 0 || searchText.trim()) {
      // 如果未登录、没有自选、在搜索，则不分组
      return {
        favorites: [],
        others: displayStocks
      };
    }

    // 对自选股票进行排序处理
    let sortedFavorites = [...favoriteStocksData];
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

    // 美股APP简化：股票数据模式下，favorites使用独立的favoriteStocksData，others使用股票数据
    return {
      favorites: sortedFavorites, // 使用排序后的自选股票数据
      others: displayStocks // 美股数据
    };
  }, [displayStocks, userFavoriteStocks, currentUser, searchText, isFavoritesExpanded, favoriteStocksData, favoritesSortOrder]);

  // 获取用户自选股票列表
  const fetchUserFavoriteStocks = async () => {
    if (!currentUser) {
      console.log('🔄 MarketScreen: 用户未登录，清空自选数据');
      setUserFavoriteStocks(new Set());
      setFavoriteStocksData([]);
      setIsFavoritesExpanded(false); // 用户登出时收起自选分组
      return;
    }

    try {
      setLoadingUserStocks(true);
      console.log('🔄 MarketScreen: 获取用户自选股票...', currentUser.email);
      
      const result = await userStockService.getUserCoins(currentUser.email);
      
      if (result.success && result.data) {
        const favoriteStocksData = result.data as any; // getUserCoinsResponse
        const stockSymbols = favoriteStocksData.coins.map((item: any) => item.coin.toUpperCase());
        const stockSet = new Set(stockSymbols);
        setUserFavoriteStocks(stockSet);
        console.log('✅ MarketScreen: 获取用户自选股票成功:', stockSymbols);

        // 获取自选股票的完整数据
        if (stockSymbols.length > 0) {
          console.log('🔄 MarketScreen: 获取自选股票的完整数据...');
          // 从所有股票数据中过滤出自选的股票
          const allStocks = await stockService.getUSStocksList(0, 1000);
          const favoriteStocks = allStocks.filter(stock => 
            stockSymbols.includes(stock.code.toUpperCase())
          );
          const transformedFavoriteData = await transformStockData(favoriteStocks, false);
          setFavoriteStocksData(transformedFavoriteData);
          console.log('✅ MarketScreen: 获取自选股票数据成功:', transformedFavoriteData.length, '个股票');
          
          // 保持自选分组默认收起状态，不自动展开
          // 用户可以手动点击展开按钮查看自选股票
        } else {
          setFavoriteStocksData([]);
          setIsFavoritesExpanded(false); // 没有自选股票时收起分组
        }
      } else {
        console.error('❌ MarketScreen: 获取用户自选股票失败:', result.error);
        setUserFavoriteStocks(new Set());
        setFavoriteStocksData([]);
        setIsFavoritesExpanded(false);
      }
    } catch (error: any) {
      console.error('❌ MarketScreen: 获取用户自选股票异常:', error);
      
      // 检查是否为登录过期错误
      if (error.message && error.message.includes('登录已过期')) {
        console.log('🚫 MarketScreen: 检测到登录过期（获取自选股票时）');
        // 这里不自动打开登录modal，让用户在主动操作时再提示
      }
      
      setUserFavoriteStocks(new Set());
      setFavoriteStocksData([]);
      setIsFavoritesExpanded(false);
    } finally {
      setLoadingUserStocks(false);
    }
  };

  // 监听用户登录状态变化，获取自选股票
  useEffect(() => {
    console.log('🔄 MarketScreen: 用户状态变化，currentUser:', currentUser?.email || 'null');
    fetchUserFavoriteStocks();
  }, [currentUser]);

  // 监听页面焦点变化，当从其他页面返回时刷新自选数据
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 MarketScreen: 页面获得焦点，刷新自选数据');
      // 当页面获得焦点时，如果用户已登录，则刷新自选数据
      if (currentUser) {
        fetchUserFavoriteStocks();
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
  const handleFavoritePress = (stockSymbol: string, isAdding: boolean) => {
    console.log('✅ MarketScreen: 自选操作完成', { stockSymbol, isAdding });
    
    if (isAdding) {
      // 添加成功后，更新本地自选股票状态
      setUserFavoriteStocks(prev => new Set([...prev, stockSymbol.toUpperCase()]));
      
      // 不自动展开自选分组，让用户手动控制显示
      // 用户可以点击自选分组标题来查看新添加的股票
      
      // 显示成功消息
      showMessageModal(
        'success',
        '添加成功',
        `${stockSymbol} 已添加到自选列表，点击"${favoritesTitle}"可查看`,
        [{ text: '确定', onPress: () => setModalVisible(false) }]
      );
    } else {
      // 移除成功后，更新本地自选股票状态
      setUserFavoriteStocks(prev => {
        const newSet = new Set(prev);
        newSet.delete(stockSymbol.toUpperCase());
        return newSet;
      });
      
      // 显示移除成功消息
      showMessageModal(
        'success',
        '移除成功',
        `${stockSymbol} 已从自选列表中移除`,
        [{ text: '确定', onPress: () => setModalVisible(false) }]
      );
    }
    
    // 刷新自选分组数据
    fetchUserFavoriteStocks();
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
        const result = await userStockService.getUserCoins(user.email);
        
        if (result.success && result.data) {
          const favoriteStocksData = result.data as any;
          const stockSymbols = favoriteStocksData.coins.map((item: any) => item.coin.toUpperCase());
          const stockSet = new Set(stockSymbols);
          
          console.log('✅ MarketScreen: 强制刷新用户自选股票成功:', stockSymbols);
          setUserFavoriteStocks(stockSet);
          
          // 获取自选股票的完整数据
          if (stockSymbols.length > 0) {
            console.log('🔄 MarketScreen: 强制刷新自选股票的完整数据...');
            // 从所有股票数据中过滤出自选的股票
            const allStocks = await stockService.getUSStocksList(0, 1000);
            const favoriteStocks = allStocks.filter(stock => 
              coinSymbols.includes(stock.code.toUpperCase())
            );
            const transformedFavoriteData = await transformStockData(favoriteStocks, false);
            setFavoriteStocksData(transformedFavoriteData);
            console.log('✅ MarketScreen: 强制刷新自选股票数据成功:', transformedFavoriteData.length, '个股票');
            
            // 保持自选分组默认收起状态，即使登录成功也不自动展开
            // 用户可以手动点击展开按钮查看自选币种
          } else {
            setFavoriteStocksData([]);
          }
        } else {
          console.warn('⚠️ MarketScreen: 强制刷新用户自选币种无数据');
          setUserFavoriteStocks(new Set());
          setFavoriteStocksData([]);
        }
      } catch (error) {
        console.error('❌ MarketScreen: 强制刷新用户数据失败:', error);
        // 即使刷新失败，也保证基础状态正确
        setUserFavoriteStocks(new Set());
        setFavoriteStocksData([]);
      }
    };
    
    // 立即执行第一次刷新
    refreshUserData();
    
    // 再设置一个后备刷新，确保UI状态正确
    setTimeout(() => {
      console.log('🔄 MarketScreen: 后备刷新检查...');
      if (userFavoriteStocks.size === 0) {
        console.log('🔄 MarketScreen: 检测到自选数据为空，执行后备刷新');
        refreshUserData();
      }
    }, 500);
  };

  const renderStockItem = ({ item, section }: { item: StockCardData; section?: string }) => {
    const stockSymbol = (item.symbol || item.name).toUpperCase();
    const isUserFavorite = userFavoriteStocks.has(stockSymbol);
    
    // 美股APP统一处理股票数据
    const isStock = true;
    
    return (
      <StockCard
        data={item}
        variant="default"
        context="market" // 指定为market场景
        onPress={(name, fullName) => {
          const params: any = { name, fromMarketScreen: true };
          if (fullName) {
            params.fullName = fullName;
          }
          params.isStock = true; // 标记为股票详情
          navigation.navigate('CoinDetail', params);
        }}
        showRank={true}
        showFavoriteButton={true} // 总是显示自选按钮
        isFavorited={isUserFavorite} // 新增：标识是否已自选
        showChart={true} // 启用24小时价格图表
        isStock={isStock} // 传递股票标记
        onFavoritePress={(stockSymbol, isAdding) => {
          console.log('🔥 MarketScreen: 收到StockCard的自选点击回调', { stockSymbol, isAdding });
          handleFavoritePress(stockSymbol, isAdding);
        }}
        onLoginRequired={() => {
          console.log('🔐 MarketScreen: 收到StockCard的登录需求回调');
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
    const { favorites, others } = groupedStocks;
    const data: Array<StockCardData & { isHeader?: boolean; headerTitle?: string; headerIcon?: string; section?: string; isExpandable?: boolean }> = [];
    
    console.log('📊 MarketScreen: Creating FlatList data, favorites:', favorites.length, 'others:', others.length);
    
    // 添加自选股票
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
      
      // 只有在展开状态时才添加自选股票
      if (isFavoritesExpanded) {
        favorites.forEach(stock => {
          data.push({ 
            ...stock, 
            id: `favorites-${stock.id}`, // 给自选分组的股票添加前缀，确保key唯一
            section: 'favorites' 
          });
        });
      }
    }
    
    // 添加其他股票（始终显示，不管自选是否展开）
    if (others.length > 0) {
      if (favorites.length > 0) {
        // 美股APP简化：统一显示标题
        const headerTitle = allStocksTitle;
        const headerIcon = 'list';
        
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
      
      others.forEach(stock => {
        data.push({ 
          ...stock, 
          id: `others-${stock.id}`, // 给全部股票分组的股票添加前缀，确保key唯一
          section: 'others' 
        });
      });
    }
    
    console.log('📊 MarketScreen: FlatList data created with', data.length, 'total items');
    
    return data;
  }, [groupedStocks, isFavoritesExpanded]);

  // 统一的renderItem函数，处理标题和数据项
  const renderFlatListItem = ({ item }: { item: any }) => {
    if (item.isHeader) {
      const { favorites, others } = groupedStocks;
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
    
    return renderStockItem({ item, section: item.section });
  };

  // 渲染加载状态
  const renderLoading = () => {
    // 使用骨架屏替代简单的loading指示器，提供更好的用户体验
    return (
      <View style={styles.container}>
        {listHeadersEnabled && (
          <View style={styles.listHeader}>
            <Text style={styles.rankHeader}>{getMarketLabel('rank')}</Text>
            <Text style={styles.nameHeader}>{getMarketLabel('name')}</Text>
            <Text style={styles.priceHeader}>{getMarketLabel('currentPrice')}/{getMarketLabel('priceChangePercent')}</Text>
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
            searchError ? searchError : '未找到相关股票'
          )
        ) : usStocksError ? usStocksError : '暂无美股数据'}
      </Text>
      {(error || searchError || usStocksError) && (
        <TouchableOpacity 
          onPress={() => {
            if (searchText) {
              searchCoins(searchText);
            } else {
              fetchUSStockData();
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

      {/* Filter Options - 只在非搜索状态显示 */}
      {!searchText && (
        <View style={styles.filtersContainer}>
          <View style={styles.filtersWrapper}>
            <FlatList
              ref={sortListRef}
              data={availableFilters}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.sortOption,
                    item.isSelected && styles.selectedSortOption
                  ]}
                  onPress={() => handleFilterPress(item.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sortOptionContent}>
                    <Text
                      style={[
                        styles.sortOptionText,
                        item.isSelected && styles.selectedSortOptionText
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.isSelected && item.sortOrder !== 'none' && (
                      <Ionicons
                        name={item.sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color="white"
                        style={styles.sortArrow}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={item => item.key}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.sortOptionsList}
              onScroll={handleSortScroll}
              scrollEventThrottle={16}
            />
            
            {/* 滚动指示器 */}
            {showScrollIndicator && (
              <TouchableOpacity 
                style={styles.scrollIndicator}
                onPress={handleScrollIndicatorPress}
                activeOpacity={0.8}
              >
                <Text style={styles.scrollIndicatorText}>{scrollIndicatorText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

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
                <Text style={styles.rankHeader}>{getMarketLabel('rank')}</Text>
                <Text style={styles.nameHeader}>{getMarketLabel('name')}</Text>
                <Text style={styles.priceHeader}>{getMarketLabel('currentPrice')}/{getMarketLabel('priceChangePercent')}</Text>
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
        title="美股行情"
        description="查看美股相关的行情数据"
        url={getWebAppURL('market')}
        onShowMessage={showMessageModal}
      />
    </View>
  );
};

export default MarketScreen;