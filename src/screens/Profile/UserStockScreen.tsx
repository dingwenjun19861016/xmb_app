import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  ActivityIndicator, 
  TouchableOpacity,
  ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import userStockService from '../../services/UserStockService';
import { useUser } from '../../contexts/UserContext';
import StockCard, { StockCardData } from '../../components/ui/StockCard';
import stockService from '../../services/StockService';
import stockLogoService from '../../services/StockLogoService';
import TodayHeader from '../../components/common/TodayHeader';
import LoginModal from '../../components/auth/LoginModal';
import MessageModal from '../../components/common/MessageModal';

// UI 颜色常量 - 与 MarketScreen 保持一致
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

interface FavoriteStockItem {
  stock: string;
  created_at: string;
  updated_at: string;
}

const UserStockScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteStocks, setFavoriteStocks] = useState<FavoriteStockItem[]>([]);
  const [stockData, setStockData] = useState<StockCardData[]>([]);
  const [sortedStockData, setSortedStockData] = useState<StockCardData[]>([]); // 排序后的数据
  const [error, setError] = useState<string | null>(null);
  
  // 排序相关状态
  const [selectedSortField, setSelectedSortField] = useState<'default' | 'price' | 'change'>('default');
  const [selectedSortOrder, setSelectedSortOrder] = useState<'asc' | 'desc'>('desc');
  const [availableFilters] = useState([
    { key: 'default', label: '默认排序', icon: 'list-outline' },
    { key: 'price', label: '价格', icon: 'trending-up-outline' },
    { key: 'change', label: '涨跌幅', icon: 'analytics-outline' }
  ]);
  
  // Modal states
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalButtons, setModalButtons] = useState<Array<{
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress: () => void;
  }>>([]);

  // 排序函数
  const sortStockData = useCallback((data: StockCardData[], field: string, order: 'asc' | 'desc') => {
    if (field === 'default') {
      // 默认排序：保持原始顺序
      return [...data];
    }
    
    const sortedData = [...data].sort((a, b) => {
      let aValue: number, bValue: number;
      
      if (field === 'price') {
        // 价格排序：提取数字部分
        aValue = parseFloat(a.price.replace(/[$,]/g, '')) || 0;
        bValue = parseFloat(b.price.replace(/[$,]/g, '')) || 0;
      } else if (field === 'change') {
        // 涨跌幅排序：提取百分比数字
        aValue = parseFloat(a.change.replace(/[%]/g, '')) || 0;
        bValue = parseFloat(b.change.replace(/[%]/g, '')) || 0;
      } else {
        return 0;
      }
      
      if (order === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
    
    console.log('🔄 UserStockScreen: 排序完成', { field, order, count: sortedData.length });
    return sortedData;
  }, []);
  
  // 处理排序选择
  const handleSortPress = useCallback((field: string) => {
    console.log('🔄 UserStockScreen: 排序按钮点击', { field, currentField: selectedSortField, currentOrder: selectedSortOrder });
    
    let newOrder: 'asc' | 'desc' = 'desc';
    
    if (field === selectedSortField) {
      // 如果点击相同的排序字段，切换排序方向
      newOrder = selectedSortOrder === 'desc' ? 'asc' : 'desc';
    } else {
      // 如果点击不同的排序字段，默认降序
      newOrder = field === 'default' ? 'desc' : 'desc';
    }
    
    setSelectedSortField(field as 'default' | 'price' | 'change');
    setSelectedSortOrder(newOrder);
    
    // 立即应用排序
    const sorted = sortStockData(stockData, field, newOrder);
    setSortedStockData(sorted);
  }, [selectedSortField, selectedSortOrder, stockData, sortStockData]);

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

  const loadFavorites = useCallback(async () => {
    if (!currentUser) {
      setFavoriteStocks([]);
      setStockData([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await userStockService.getUserStocks(currentUser.email);
      
      if (result.success && result.data && (result.data as any).stocks) {
        const data = (result.data as any).stocks as FavoriteStockItem[];
        setFavoriteStocks(data);
        
        // 获取每个股票的基础信息
        if (data.length > 0) {
          const symbols = data.map(i => i.stock.toUpperCase());
          const promises = symbols.map(sym => 
            stockService.getUsstockInfo(sym, 1).catch(err => {
              console.warn(`Failed to load stock ${sym}:`, err);
              return null;
            })
          );
          
          const results = await Promise.all(promises);
          const flattened = results
            .map(r => Array.isArray(r) ? r[0] : r)
            .filter(Boolean);
          
          // 转换数据格式并添加logo
          const transformedData: StockCardData[] = flattened.map(item => {
            const change = item.priceChange24h || item.change24h || '0';
            const changeNum = parseFloat(change.toString());
            const price = item.currentPrice || item.price || 0;
            
            // Debug: 检查股票数据结构
            console.log('🔍 UserStockScreen: 股票数据:', {
              symbol: item.symbol,
              name: item.name,
              code: item.code,
              fullName: item.fullName
            });
            
            // 优先使用英文股票代码（code），避免使用中文名称
            const stockCode = item.code || item.symbol || item.name || '';
            const stockSymbol = item.code || item.symbol || '';
            
            console.log('🎯 UserStockScreen: 选择的股票代码:', stockCode);
            
            return {
              id: stockCode,
              symbol: stockSymbol,
              name: stockCode, // 显示英文股票代码
              fullName: item.fullName || item.name || stockCode,
              price: `$${parseFloat(price.toString()).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6
              })}`, // 格式化价格显示
              change: change.toString(),
              isPositive: changeNum >= 0,
              volume: item.volume24h || item.volume,
              marketCap: item.marketCap,
              logo: stockLogoService.getLogoUrlSync(stockCode), // 使用英文股票代码
              stock24h: item.stock24h || [], // 添加24小时价格数据
              priceChangeDirection: changeNum > 0 ? 'up' : (changeNum < 0 ? 'down' : null), // 添加价格变动方向
              rank: item.rank || 0 // 添加排名字段
            };
          });
          
          setStockData(transformedData);
          // 应用当前排序设置
          const sorted = sortStockData(transformedData, selectedSortField, selectedSortOrder);
          setSortedStockData(sorted);
        } else {
          setStockData([]);
          setSortedStockData([]);
        }
      } else {
        setStockData([]);
        setSortedStockData([]);
      }
    } catch (e: any) {
      console.error('Failed to load favorites:', e);
      setError(e.message || '加载自选失败');
      
      if (e.message && e.message.includes('登录已过期')) {
        showMessageModal(
          'warning',
          '登录已过期',
          '请重新登录后查看自选股票',
          [
            { text: '取消', style: 'cancel', onPress: () => setModalVisible(false) },
            { text: '登录', onPress: () => {
              setModalVisible(false);
              setLoginModalVisible(true);
            }}
          ]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser, sortStockData, selectedSortField, selectedSortOrder]);

  // 当排序设置改变时，重新排序现有数据
  useEffect(() => {
    if (stockData.length > 0) {
      const sorted = sortStockData(stockData, selectedSortField, selectedSortOrder);
      setSortedStockData(sorted);
    }
  }, [stockData, selectedSortField, selectedSortOrder, sortStockData]);

  // 监听用户状态变化
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // 页面获得焦点时刷新数据
  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        loadFavorites();
      }
    }, [currentUser, loadFavorites])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadFavorites();
  };

  const handleStockPress = (item: StockCardData) => {
    console.log('🔄 UserStockScreen: 股票卡片点击', { symbol: item.symbol, name: item.name });
    const params: any = {
      name: item.symbol,
      stockCode: item.symbol,
      fromFavorites: true,
      returnTo: 'UserStock',
      isStock: true
    };
    // 统一使用已存在的路由名称，避免别名不一致造成的首击无效
    // @ts-ignore
    navigation.navigate('CoinDetail', params);
  };

  const handleRemoveFavorite = async (stockSymbol: string) => {
    if (!currentUser) return;
    
    try {
      const result = await userStockService.removeUserStock(currentUser.email, stockSymbol);
      if (result.success) {
        showMessageModal('success', '移除成功', `${stockSymbol} 已从自选列表中移除`);
        // 延迟刷新列表
        setTimeout(() => {
          loadFavorites();
        }, 1000);
      } else {
        showMessageModal('error', '移除失败', result.error || '移除失败，请重试');
      }
    } catch (error: any) {
      showMessageModal('error', '移除失败', error.message || '移除失败，请重试');
    }
  };

  // 渲染排序选项
  const renderSortOptions = () => (
    <View style={styles.filtersContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortOptionsList}
      >
        {availableFilters.map((filter) => {
          const isSelected = selectedSortField === filter.key;
          const showArrow = isSelected && filter.key !== 'default';
          
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.sortOption,
                isSelected && styles.selectedSortOption,
              ]}
              onPress={() => handleSortPress(filter.key)}
            >
              <View style={styles.sortOptionContent}>
                <Ionicons
                  name={filter.icon as any}
                  size={16}
                  color={isSelected ? 'white' : UI_COLORS.text}
                  style={styles.sortOptionIcon}
                />
                <Text style={[
                  styles.sortOptionText,
                  isSelected && styles.selectedSortOptionText,
                ]}>
                  {filter.label}
                </Text>
                {showArrow && (
                  <Ionicons
                    name={selectedSortOrder === 'desc' ? 'chevron-down' : 'chevron-up'}
                    size={14}
                    color="white"
                    style={styles.sortArrow}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderItem = ({ item }: { item: StockCardData }) => (
    <StockCard
      data={item}
      context="market"
      showFavoriteButton={true}
      isFavorited={true}
      onPress={() => handleStockPress(item)}
      onFavoritePress={(symbol, isAdding) => {
        if (!isAdding) {
          handleRemoveFavorite(symbol);
        }
      }}
      onLoginRequired={() => setLoginModalVisible(true)}
    />
  );

  const renderHeader = () => (
    <TodayHeader 
      title="我的自选"
      showUser={true}
      showLoginButton={!currentUser}
      onLoginPress={() => setLoginModalVisible(true)}
      onUserPress={() => navigation.navigate('UserStatus')}
    />
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      );
    }

    if (!currentUser) {
      return (
        <View style={styles.center}>
          <Ionicons name="person-circle-outline" size={64} color="#999" />
          <Text style={styles.tip}>请先登录以查看自选股票</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => setLoginModalVisible(true)}
          >
            <Text style={styles.loginButtonText}>立即登录</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadFavorites}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.center}>
        <Ionicons name="star-outline" size={64} color="#999" />
        <Text style={styles.tip}>暂无自选股票</Text>
        <Text style={styles.subTip}>在行情或详情页点击 ⭐ 按钮添加</Text>
        <TouchableOpacity 
          style={styles.exploreButton}
          onPress={() => navigation.navigate('Market')}
        >
          <Text style={styles.exploreButtonText}>去添加股票</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (stockData.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        {renderEmpty()}
        
        <LoginModal
          visible={loginModalVisible}
          onClose={() => setLoginModalVisible(false)}
          onLoginSuccess={(user) => {
            setLoginModalVisible(false);
            showMessageModal('success', '登录成功', `欢迎回来，${user.email}！`);
            setTimeout(() => loadFavorites(), 500);
          }}
        />
        
        <MessageModal
          visible={modalVisible}
          type={modalType}
          title={modalTitle}
          message={modalMessage}
          buttons={modalButtons}
          onClose={() => setModalVisible(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderSortOptions()}
      
      <FlatList
        data={sortedStockData}
        keyExtractor={(item) => item.id || item.symbol}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingVertical: 8 }}
        showsVerticalScrollIndicator={false}
      />
      
      <LoginModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
        onLoginSuccess={(user) => {
          setLoginModalVisible(false);
          showMessageModal('success', '登录成功', `欢迎回来，${user.email}！`);
          setTimeout(() => loadFavorites(), 500);
        }}
      />
      
      <MessageModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        buttons={modalButtons}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 32 
  },
  loadingText: { 
    marginTop: 12, 
    fontSize: 16, 
    color: '#555' 
  },
  tip: { 
    marginTop: 12, 
    fontSize: 18, 
    color: '#333',
    fontWeight: '600',
    textAlign: 'center'
  },
  subTip: { 
    marginTop: 8, 
    fontSize: 14, 
    color: '#888',
    textAlign: 'center',
    lineHeight: 20
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center'
  },
  loginButton: {
    marginTop: 24,
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  exploreButton: {
    marginTop: 20,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  exploreButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500'
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500'
  },
  // 排序选项样式
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
  },
  sortOptionsList: {
    paddingHorizontal: 16,
  },
  sortOption: {
    backgroundColor: UI_COLORS.background,
    paddingHorizontal: 16,
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
  sortOptionIcon: {
    marginRight: 6,
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
});

export default UserStockScreen;
