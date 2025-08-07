import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CoinCard, { CoinCardData } from '../ui/CoinCard';
import stockService, { TransformedStockData } from '../../services/StockService';
import stockLogoService from '../../services/StockLogoService';
import { useRealTimePrice } from '../../contexts/RealTimePriceContext';

// UI 颜色常量 - 与其他组件保持一致
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

interface StockOverviewProps {
  limit?: number; // 可配置显示数量
  onStockPress?: (stockCode: string) => void; // 自定义点击处理
  showRank?: boolean; // 是否显示排名
  variant?: 'default' | 'compact' | 'detailed' | 'large'; // 卡片样式
  title?: string; // 添加标题配置
  viewMoreText?: string; // 添加查看更多按钮文本配置
}

const StockOverview: React.FC<StockOverviewProps> = ({ 
  limit = 4,
  onStockPress,
  showRank = true,
  variant = 'default',
  title = '股市行情', // 修改默认标题
  viewMoreText = '查看全部 >' // 添加默认查看更多文本
}) => {
  const navigation = useNavigation();
  const [stocks, setStocks] = useState<CoinCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realTimePrices, setRealTimePrices] = useState<{[key: string]: number}>({});
  const [priceChanges, setPriceChanges] = useState<{[key: string]: 'up' | 'down' | null}>({});
  const realTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 使用实时价格Context（虽然当前可能不支持股票，但保留接口）
  const { realTimePrices: contextPrices, priceChanges: contextPriceChanges, getPrice, getPriceChange, startPolling } = useRealTimePrice();

  // 将股票数据转换为CoinCard组件需要的格式
  const transformStockData = (stocksData: TransformedStockData[]): CoinCardData[] => {
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
        coin24h: stock.usstock24h?.map(item => ({
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
      
      console.log('🔄 StockOverview: Fetching stock data with limit:', limit);
      const stocksData = await stockService.getHomeDisplayStocks(limit);
      
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
  }, [limit]);

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
  const renderStockItem = ({ item }: { item: CoinCardData }) => (
    <CoinCard
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
        </View>
        {renderLoading()}
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
      
      <FlatList
        data={stocks}
        renderItem={renderStockItem}
        keyExtractor={(item) => item.id}
        horizontal={false}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: UI_COLORS.cardBackground,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: UI_COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_COLORS.text,
  },
  viewMoreButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewMoreText: {
    fontSize: 14,
    color: UI_COLORS.primary,
    fontWeight: '500',
  },
  listContainer: {
    flexGrow: 1,
  },
  separator: {
    height: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: UI_COLORS.secondaryText,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: UI_COLORS.danger,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: UI_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: UI_COLORS.secondaryText,
    textAlign: 'center',
  },
});

export default StockOverview;
