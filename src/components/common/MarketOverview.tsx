import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CoinCard, { CoinCardData } from '../ui/CoinCard';
import marketService, { CoinData } from '../../services/MarketService';
import coinLogoService from '../../services/CoinLogoService';
import coinRealTimePriceService from '../../services/CoinRealTimePriceService';

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

interface MarketOverviewProps {
  limit?: number; // 可配置显示数量
  onCoinPress?: (coinId: string) => void; // 自定义点击处理
  showRank?: boolean; // 是否显示排名
  variant?: 'default' | 'compact' | 'detailed' | 'large'; // 卡片样式
  title?: string; // 添加标题配置
  viewMoreText?: string; // 添加查看更多按钮文本配置
}

const MarketOverview: React.FC<MarketOverviewProps> = ({ 
  limit = 4,
  onCoinPress,
  showRank = true,
  variant = 'default',
  title = '市场概览', // 添加默认标题
  viewMoreText = '查看全部 >' // 添加默认查看更多文本
}) => {
  const navigation = useNavigation();
  const [coins, setCoins] = useState<CoinCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realTimePrices, setRealTimePrices] = useState<{[key: string]: number}>({});
  const [priceChanges, setPriceChanges] = useState<{[key: string]: 'up' | 'down' | null}>({});
  const realTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 添加美股数据相关状态
  const [usStocks, setUsStocks] = useState<CoinCardData[]>([]);
  const [stocksLoading, setStocksLoading] = useState(true);
  const [stocksError, setStocksError] = useState<string | null>(null);

  // 将API数据转换为CoinCard组件需要的格式
  const transformCoinData = async (apiCoins: CoinData[], useRealTimePrices = false): Promise<CoinCardData[]> => {
    // 批量获取所有币种的logo
    const symbols = apiCoins.map(coin => coin.name);
    
    // 使用优化后的同步logo获取方式
    const logos = coinLogoService.getLogosSync(symbols);

    return apiCoins.map(coin => {
      // 使用本地实时价格，如果有的话，否则使用API价格
      const localPrice = useRealTimePrices && realTimePrices[coin.name.toLowerCase()];
      const currentPrice = localPrice || parseFloat(coin.currentPrice);

      // 获取价格变动方向
      const localPriceChange = priceChanges[coin.name.toLowerCase()];
      const priceChangeDirection = localPriceChange || null;

      return {
        id: coin._id,
        name: coin.name,
        fullName: coin.fullName, // 添加完整名称
        symbol: coin.name, // API中name就是symbol，但在UI中不重复显示
        price: `$${currentPrice.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6
        })}`,
        change: coin.priceChange24h,
        isPositive: !coin.priceChange24h.startsWith('-'),
        rank: coin.rank,
        marketCap: coin.marketcap,
        volume: coin.volume,
        // 使用同步获取的logo
        logo: logos[coin.name],
        // 添加价格变动标志
        priceChangeDirection: priceChangeDirection,
        // 添加24小时价格数据
        coin24h: coin.coin24h || [],
      };
    });
  };

  // 获取市场数据
  const fetchMarketData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      
      const topCoins = await marketService.getTopCoins(limit);
       
      const transformedCoins = await transformCoinData(topCoins, Object.keys(realTimePrices).length > 0);
      
      setCoins(transformedCoins);
      
      console.log('✅ Market data loaded successfully:', transformedCoins.length, 'coins');
    } catch (err) {
      console.error('❌ Failed to fetch market data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load market data');
      
      // 显示用户友好的错误信息
      Alert.alert(
        '数据加载失败',
        '无法获取市场数据，请检查网络连接后重试',
        [
          { text: '重试', onPress: fetchMarketData },
          { text: '取消', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // 获取美股数据
  const fetchUSStockData = async () => {
    try {
      setStocksLoading(true);
      setStocksError(null);
      
      
      const stockData = await marketService.getUSStockHomeDisplay();
     
      // 确保有数据返回
      if (stockData && stockData.length > 0) {
        const transformedStocks = await transformCoinData(stockData, false);
       
        setUsStocks(transformedStocks);
        console.log('✅ US Stock data loaded successfully:', transformedStocks.length, 'stocks');
      } else {
        console.warn('⚠️ MarketOverview: No US stock data received');
        setUsStocks([]);
      }
    } catch (err) {
      console.error('❌ Failed to fetch US stock data:', err);
      setStocksError(err instanceof Error ? err.message : 'Failed to load US stock data');
    } finally {
      setStocksLoading(false);
    }
  };

  // 组件挂载时获取数据并合并显示
  useEffect(() => {
    const loadAllData = async () => {
      try {
        await fetchMarketData();
        await fetchUSStockData();
        // 启动实时价格轮询
        startPolling();
      } catch (err) {
        console.error('加载数据失败:', err);
      }
    };
    
    loadAllData();
  }, [limit]);

  // 管理实时价格轮询
  useEffect(() => {
    if (coins.length > 0) {
      startRealTimePricePolling();
    } else {
      stopRealTimePricePolling();
    }

    // 清理函数
    return () => {
      stopRealTimePricePolling();
    };
  }, [coins.length]);

  // 监听Context价格变化，更新币种和美股数据
  useEffect(() => {
    if (Object.keys(contextPrices).length > 0) {
      // 更新加密货币数据
      setCoins(prevCoins => prevCoins.map(coin => {
        const contextPrice = getPrice(coin.name.toLowerCase());
        const contextPriceChange = getPriceChange(coin.name.toLowerCase());
        
        if (contextPrice) {
          return {
            ...coin,
            price: `$${contextPrice.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6
            })}`,
            priceChangeDirection: contextPriceChange
          };
        }
        return coin;
      }));

      // 更新美股数据
      setUsStocks(prevStocks => prevStocks.map(stock => {
        const contextPrice = getPrice(stock.name.toLowerCase());
        const contextPriceChange = getPriceChange(stock.name.toLowerCase());
        
        if (contextPrice) {
          return {
            ...stock,
            price: `$${contextPrice.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6
            })}`,
            priceChangeDirection: contextPriceChange
          };
        }
        return stock;
      }));
    }
  }, [contextPrices, contextPriceChanges]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopRealTimePricePolling();
    };
  }, []);

  // 应用价格变动箭头到币种数据
  useEffect(() => {
    if (Object.keys(priceChanges).length > 0) {
      setCoins(prevCoins => prevCoins.map(coin => {
        const coinKey = coin.name.toLowerCase();
        const direction = priceChanges[coinKey];
        if (direction) {
          // console.log(`🎯 MarketOverview: Setting ${coin.name} direction to: ${direction}`);
          return {
            ...coin,
            priceChangeDirection: direction
          };
        }
        return coin;
      }));
    }
  }, [priceChanges]);

  // 获取实时价格数据
  const fetchRealTimePrices = async () => {
    try {

      const priceMap = await coinRealTimePriceService.getAllRealTimePricesAsMap();
      
      // 获取当前的实时价格状态（使用 ref 或 callback 来获取最新状态）
      setRealTimePrices(currentRealTimePrices => {
        // 检测价格变动 - 使用最新的 currentRealTimePrices
        const newPriceChanges: {[key: string]: 'up' | 'down' | null} = {};
        
        // console.log('🔍 MarketOverview: Current realTimePrices keys:', Object.keys(currentRealTimePrices).length);
        // console.log('🔍 MarketOverview: New priceMap keys:', Object.keys(priceMap).length);
        
        // 只有当 currentRealTimePrices 有数据时才检测变动（避免首次加载时的误判）
        if (Object.keys(currentRealTimePrices).length > 0) {
          Object.keys(priceMap).forEach(coinKey => {
            const oldPrice = currentRealTimePrices[coinKey];
            const newPrice = priceMap[coinKey];
            
            if (oldPrice && newPrice && oldPrice !== newPrice) {
              // 正确的价格变动逻辑：
              // 新价格 > 旧价格 = 价格上涨 = 向上箭头
              // 新价格 < 旧价格 = 价格下跌 = 向下箭头
              newPriceChanges[coinKey] = newPrice > oldPrice ? 'up' : 'down';
              // console.log(`💰 MarketOverview: Price change detected for ${coinKey}: ${oldPrice} -> ${newPrice} (${newPriceChanges[coinKey]})`);
            }
          });
          
          
          // 更新价格变动标志
          if (Object.keys(newPriceChanges).length > 0) {
            setPriceChanges(newPriceChanges);
            // 3秒后清除标志
            setTimeout(() => {
              setPriceChanges({});
            }, 3000);
          }
        } else {
          // console.log('🎯 MarketOverview: First time fetching prices, skipping change detection');
        }
        
        // console.log(`💰 MarketOverview: Updated ${Object.keys(priceMap).length} real-time prices`);
        
        // 返回新的价格数据（这会在下次轮询时用于比较）
        return priceMap;
      });
      
      // 如果有币种数据，用实时价格更新UI（这需要在状态更新后执行）
      if (coins.length > 0) {
        setCoins(prevCoins => prevCoins.map(coin => {
          const coinKey = coin.name.toLowerCase();
          const realTimePrice = priceMap[coinKey];
          
          if (realTimePrice) {
            // priceChangeDirection 会通过上面的 setPriceChanges 来设置
            return {
              ...coin,
              price: `$${realTimePrice.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6
              })}`
            };
          }
          
          return coin;
        }));
      }
        
    } catch (error) {
      console.warn('⚠️ MarketOverview: Failed to fetch real-time prices:', error);
      // 不显示错误提示，实时价格更新失败不应该打断用户体验
    }
  };

  // 启动实时价格轮询
  const startRealTimePricePolling = () => {
    if (realTimeIntervalRef.current) {
      clearInterval(realTimeIntervalRef.current);
    }
    
    // 立即获取一次
    fetchRealTimePrices();
    
    // 每6秒更新一次实时价格
    realTimeIntervalRef.current = setInterval(fetchRealTimePrices, 6000);
  };

  // 停止实时价格轮询
  const stopRealTimePricePolling = () => {
    if (realTimeIntervalRef.current) {
      clearInterval(realTimeIntervalRef.current);
      realTimeIntervalRef.current = null;
    }
  };

  // 处理币种点击事件
  const handleCoinPress = (name: string, fullName?: string) => {
    if (onCoinPress) {
      onCoinPress(name);
    } else {
      // 默认导航行为
      // 从首页进入币种详情时，设置returnTo=home，确保可以返回首页
      const params: any = { name, returnTo: 'home' };
      if (fullName) {
        params.fullName = fullName;
      }
      navigation.navigate('CoinDetail', params);
    }
  };

  // 渲染币种卡片
  const renderCoinItem = ({ item }: { item: CoinCardData }) => (
    <CoinCard
      data={item}
      variant={variant}
      context="home" // 指定为首页场景
      onPress={handleCoinPress}
      showRank={false} // 始终不显示排名
      showFavoriteButton={false} // 首页不显示自选按钮
    />
  );

  // 渲染加载状态
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={UI_COLORS.primary} />
      <Text style={styles.loadingText}>加载中...</Text>
    </View>
  );

  // 渲染错误状态
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>加载失败</Text>
      <TouchableOpacity onPress={fetchMarketData} style={styles.retryButton}>
        <Text style={styles.retryText}>重试</Text>
      </TouchableOpacity>
    </View>
  );

  // 合并币种和美股数据
  const allItems = [...coins, ...usStocks];
  const isLoading = loading || stocksLoading;
  const hasError = error || stocksError;
  
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Market')}>
          <Text style={styles.seeAllButton}>{viewMoreText}</Text>
        </TouchableOpacity>
      </View>
      
      {/* 合并的市场数据 */}
      {isLoading ? (
        renderLoading()
      ) : hasError ? (
        renderError()
      ) : allItems.length > 0 ? (
        <View>
          {allItems.map((item, index) => (
            <View 
              key={`market-item-${item.id || item.name}-${index}`}
              style={{ marginBottom: 1 }}
            >
              {renderCoinItem({ item })}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>暂无市场数据</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: UI_COLORS.cardBackground,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: UI_COLORS.text,
  },
  seeAllButton: {
    fontSize: 14,
    color: UI_COLORS.primary,
    fontWeight: '500',
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
    color: UI_COLORS.secondaryText,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 14,
    color: UI_COLORS.danger,
    marginBottom: 10,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: UI_COLORS.primary,
    borderRadius: 6,
  },
  retryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
    marginHorizontal: -16,
    width: '120%',
  },
  smallErrorContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  smallErrorText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginBottom: 5,
  },
  smallRetryButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
  },
  smallRetryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default MarketOverview;
