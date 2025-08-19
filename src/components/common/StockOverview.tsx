import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import StockCard, { StockCardData } from '../ui/StockCard';
import stockService, { TransformedStockData } from '../../services/StockService';
import stockLogoService from '../../services/StockLogoService';
import { useUSStockRealTimePrice } from '../../contexts/USStockRealTimePriceContext';

// UI 颜色常量 - 明快金融主题
const UI_COLORS = {
  primary: '#1976D2', // 金融蓝色
  background: '#F8FAFE', // 轻微蓝色调背景
  cardBackground: '#FFFFFF', // 纯白卡片背景
  text: '#0D47A1', // 深蓝色文字
  secondaryText: '#546E7A', // 蓝灰色
  border: '#E3F2FD', // 浅蓝色边框
  shadow: '#1565C0', // 蓝色阴影
  success: '#2E7D32', // 深绿色
  danger: '#D32F2F', // 深红色
};

interface StockOverviewProps {
  // limit?: number; // REMOVED: number controlled by HOME_MARKET_DISPLAY config
  onStockPress?: (stockCode: string) => void; // 自定义点击处理
  showRank?: boolean; // 是否显示排名
  variant?: 'default' | 'compact' | 'detailed' | 'large'; // 卡片样式
  title?: string; // 添加标题配置
  viewMoreText?: string; // 添加查看更多按钮文本配置
}

const StockOverview: React.FC<StockOverviewProps> = ({ 
  // limit = 4, // REMOVED
  onStockPress,
  showRank = true,
  variant = 'default',
  title = '股市行情', // 修改默认标题
  viewMoreText = '查看全部 >' // 添加默认查看更多文本
}) => {
  const navigation = useNavigation();
  const [stocks, setStocks] = useState<StockCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realTimePrices, setRealTimePrices] = useState<{[key: string]: number}>({});
  const [priceChanges, setPriceChanges] = useState<{[key: string]: 'up' | 'down' | null}>({});
  const realTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 使用实时价格Context（虽然当前可能不支持股票，但保留接口）
  const { realTimePrices: contextPrices, priceChanges: contextPriceChanges, getPrice, getPriceChange, startPolling } = useUSStockRealTimePrice();

  // 将股票数据转换为StockCard组件需要的格式
  const transformStockData = (stocksData: TransformedStockData[]): StockCardData[] => {
    return stocksData.map(stock => {
      // 解析价格变动是否为正值
      const priceChangeNum = parseFloat(stock.priceChangePercent.replace('%', ''));
      const isPositive = priceChangeNum >= 0;

      // 格式化价格显示
      const currentPrice = parseFloat(stock.currentPrice);
      const formattedPrice = `$${currentPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;

      // 获取实时价格变动方向（如果有的话）
      const contextPriceChange = getPriceChange(stock.code.toLowerCase());
      const localPriceChange = priceChanges[stock.code.toLowerCase()];
      const priceChangeDirection = contextPriceChange || localPriceChange || null;

      return {
        id: stock._id,
        name: stock.code, // 使用股票代码作为名称显示
        fullName: stock.fullName, // 使用公司全名作为完整名称
        symbol: stock.code, // 股票代码
        price: formattedPrice,
        change: stock.priceChangePercent,
        isPositive: isPositive,
        rank: stock.rank,
        marketCap: stock.marketcap,
        volume: stock.volume,
        // 使用StockLogoService生成正确的股票logo URL
        logo: stockLogoService.getLogoUrlSync(stock.code),
        // 添加价格变动标志
        priceChangeDirection: priceChangeDirection,
        // 添加额外的股票信息
        exchange: stock.exchange,
        sector: stock.sector,
        // 24小时价格数据（如果有）
        stock24h: stock.usstock24h?.map(item => ({
          price: parseFloat(item.price),
          createdAt: item.createdAt
        })) || [],
      };
    });
  };

  // 获取股票数据
  const fetchStockData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 StockOverview: Fetching stock data (no limit prop, uses HOME_MARKET_DISPLAY config)');
      const stocksData = await stockService.getHomeDisplayStocks();
      
      if (stocksData && stocksData.length > 0) {
        const transformedStocks = transformStockData(stocksData);
        setStocks(transformedStocks);
        console.log('✅ Stock data loaded successfully:', transformedStocks.length, 'stocks');
        console.log('📊 Sample stock data:', transformedStocks[0]);
      } else {
        console.warn('⚠️ StockOverview: No stock data received');
        setStocks([]);
      }
      
    } catch (err) {
      console.error('❌ Failed to fetch stock data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stock data');
      
      // 显示用户友好的错误信息
      Alert.alert(
        '数据加载失败',
        '无法获取股票数据，请检查网络连接后重试',
        [
          { text: '重试', onPress: fetchStockData },
          { text: '取消', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchStockData();
  }, []); // removed dependency on limit

  // 监听Context价格变化，更新股票数据（如果Context开始支持股票价格）
  useEffect(() => {
    if (Object.keys(contextPrices).length > 0 && stocks.length > 0) {
      setStocks(prevStocks => prevStocks.map(stock => {
        const contextPrice = getPrice(stock.name.toLowerCase());
        const contextPriceChange = getPriceChange(stock.name.toLowerCase());
        
        if (contextPrice) {
          return {
            ...stock,
            price: `$${contextPrice.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`,
            priceChangeDirection: contextPriceChange
          };
        }
        return {
          ...stock,
          priceChangeDirection: contextPriceChange || stock.priceChangeDirection
        };
      }));
    }
  }, [contextPrices, contextPriceChanges]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (realTimeIntervalRef.current) {
        clearInterval(realTimeIntervalRef.current);
      }
    };
  }, []);

  // 处理股票点击事件
  const handleStockPress = (code: string, fullName?: string) => {
    if (onStockPress) {
      onStockPress(code);
    } else {
      // 默认导航行为 - 这里可以导航到股票详情页
      // 注意：需要创建一个股票详情页面或者复用币种详情页面
      console.log('🎯 StockOverview: Stock pressed:', code, fullName);
      
      // 暂时使用币种详情页面，传入股票信息
      const params: any = { 
        name: code, 
        fullName: fullName,
        isStock: true, // 添加标记表示这是股票
        returnTo: 'home' 
      };
      navigation.navigate('CoinDetail', params);
    }
  };

  // 渲染股票卡片
  const renderStockItem = ({ item }: { item: StockCardData }) => (
    <StockCard
      data={item}
      variant={variant}
      context="home" // 指定为首页场景
      onPress={handleStockPress}
      showRank={showRank}
      showFavoriteButton={false} // 首页不显示自选按钮
      isStock={true} // 标记为股票数据
    />
  );

  // 渲染加载状态
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={UI_COLORS.primary} />
      <Text style={styles.loadingText}>正在加载股票数据...</Text>
    </View>
  );

  // 骨架加载组件
  const SkeletonBox = ({ width, height, borderRadius = 6, style = {} }: { 
    width: number | string; 
    height: number; 
    borderRadius?: number;
    style?: any;
  }) => {
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
          {
            backgroundColor: '#E3F2FD', // 浅蓝色骨架，与主题一致
            width,
            height,
            borderRadius,
            opacity
          },
          style
        ]} 
      />
    );
  };

  // 渲染骨架加载状态
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: Math.max(stocks.length || 0, 4) }).map((_, index) => (
        <View key={index} style={styles.skeletonItem}>
          {/* 股票Logo骨架 */}
          <SkeletonBox width={40} height={40} borderRadius={20} style={styles.skeletonLogo} />
          
          <View style={styles.skeletonContent}>
            {/* 股票代码骨架 */}
            <SkeletonBox width={60} height={16} style={{ marginBottom: 4 }} />
            
            {/* 公司名称骨架 */}
            <SkeletonBox width={100} height={14} style={{ marginBottom: 8 }} />
            
            {/* 价格信息骨架 */}
            <View style={styles.skeletonPriceRow}>
              <SkeletonBox width={80} height={18} style={{ marginRight: 12 }} />
              <SkeletonBox width={50} height={16} />
            </View>
          </View>
          
          {showRank && (
            <SkeletonBox width={24} height={16} style={styles.skeletonRank} />
          )}
        </View>
      ))}
    </View>
  );

  // 渲染错误状态
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>加载失败</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchStockData}>
        <Text style={styles.retryButtonText}>重试</Text>
      </TouchableOpacity>
    </View>
  );

  // 渲染空状态
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>暂无股票数据</Text>
    </View>
  );

  // 处理查看全部按钮点击
  const handleViewMore = () => {
    // 导航到股票列表页面
    navigation.navigate('Market', { activeTab: 'stocks' });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity style={styles.viewMoreButton} onPress={handleViewMore}>
            <Text style={styles.viewMoreText}>{viewMoreText}</Text>
          </TouchableOpacity>
        </View>
        {renderSkeleton()}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        {renderError()}
      </View>
    );
  }

  if (stocks.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
        </View>
        {renderEmpty()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity style={styles.viewMoreButton} onPress={handleViewMore}>
          <Text style={styles.viewMoreText}>{viewMoreText}</Text>
        </TouchableOpacity>
      </View>
      {/* NOTE: 为解决首页在该区域无法滑动的问题，去掉内部 FlatList，改为直接渲染静态列表，让外层 ScrollView 处理滚动（参考 chainalert_rn 的 MarketOverview 实现） */}
      <View style={styles.listContainer /* 保留间距样式 */}>
        {stocks.map((item) => (
          <View key={item.id} style={styles.stockItemWrapper}>
            {renderStockItem({ item })}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: UI_COLORS.cardBackground,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 18,
    shadowColor: UI_COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: UI_COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: UI_COLORS.text,
    letterSpacing: 0.3,
  },
  viewMoreButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: UI_COLORS.primary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1565C0',
  },
  viewMoreText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContainer: {
    flexGrow: 1,
  },
  stockItemWrapper: {
    marginBottom: 16,
  },
  separator: {
    height: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    backgroundColor: UI_COLORS.cardBackground,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: UI_COLORS.secondaryText,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    backgroundColor: UI_COLORS.cardBackground,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  emptyText: {
    fontSize: 16,
    color: UI_COLORS.secondaryText,
    textAlign: 'center',
    fontWeight: '500',
  },
  // 骨架加载样式
  skeletonContainer: {
    paddingHorizontal: 16,
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI_COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    shadowColor: UI_COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skeletonLogo: {
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonRank: {
    marginLeft: 12,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    backgroundColor: UI_COLORS.cardBackground,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: '#FFCDD2', // 浅红色边框
  },
  errorText: {
    fontSize: 16,
    color: UI_COLORS.danger,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: UI_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: UI_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default StockOverview;
