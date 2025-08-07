import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Import contexts
import { useUser } from '../../contexts/UserContext';

// Import components
import TodayHeader from '../../components/common/TodayHeader';
import LoginModal from '../../components/auth/LoginModal';
import MessageModal from '../../components/common/MessageModal';
import SkeletonBox from '../../components/common/SkeletonBox';

// Import services
import { airdropService, AirdropItem } from '../../services/AirdropService';
import { configService } from '../../services/ConfigService';

const AirdropsScreen = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  
  // 使用用户Context
  const { currentUser } = useUser();
  
  const [searchText, setSearchText] = useState('');
  const [airdrops, setAirdrops] = useState<AirdropItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pageSize, setPageSize] = useState(20); // 可配置的页面大小

  // 配置状态
  const [screenTitle, setScreenTitle] = useState('空投');
  const [searchPlaceholder, setSearchPlaceholder] = useState('搜索空投...');
  const [loadingText, setLoadingText] = useState('正在加载空投数据...');
  const [loadMoreText, setLoadMoreText] = useState('加载更多...');
  const [errorText, setErrorText] = useState('加载空投数据失败，请稍后再试');
  const [emptyText, setEmptyText] = useState('当前没有空投活动');
  const [noSearchResultText, setNoSearchResultText] = useState('未找到相关空投');
  const [retryButtonText, setRetryButtonText] = useState('重试');
  const [enableSearch, setEnableSearch] = useState(true);

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

  // 加载配置
  const loadConfigs = async () => {
    try {
      const [
        titleConfig,
        placeholderConfig,
        loadingConfig,
        loadMoreConfig,
        pageSizeConfig,
        errorConfig,
        emptyConfig,
        noSearchConfig,
        retryConfig,
        enableSearchConfig
      ] = await Promise.all([
        configService.getConfig('AIRDROP_SCREEN_TITLE', '空投'),
        configService.getConfig('AIRDROP_SEARCH_PLACEHOLDER', '搜索空投...'),
        configService.getConfig('AIRDROP_LOADING_TEXT', '正在加载空投数据...'),
        configService.getConfig('AIRDROP_LOAD_MORE_TEXT', '加载更多...'),
        configService.getConfig('AIRDROP_PAGE_SIZE', '20'),
        configService.getConfig('AIRDROP_ERROR_TEXT', '加载空投数据失败，请稍后再试'),
        configService.getConfig('AIRDROP_EMPTY_TEXT', '当前没有空投活动'),
        configService.getConfig('AIRDROP_NO_SEARCH_RESULT_TEXT', '未找到相关空投'),
        configService.getConfig('AIRDROP_RETRY_BUTTON_TEXT', '重试'),
        configService.getConfig('AIRDROP_ENABLE_SEARCH', 'true')
      ]);

      setScreenTitle(titleConfig);
      setSearchPlaceholder(placeholderConfig);
      setLoadingText(loadingConfig);
      setLoadMoreText(loadMoreConfig);
      setPageSize(parseInt(pageSizeConfig) || 20);
      setErrorText(errorConfig);
      setEmptyText(emptyConfig);
      setNoSearchResultText(noSearchConfig);
      setRetryButtonText(retryConfig);
      setEnableSearch(enableSearchConfig === 'true');

      console.log('✅ AirdropsScreen: 配置加载成功', {
        screenTitle: titleConfig,
        searchPlaceholder: placeholderConfig,
        pageSize: parseInt(pageSizeConfig) || 20,
        enableSearch: enableSearchConfig === 'true'
      });
    } catch (error) {
      console.warn('⚠️ AirdropsScreen: 配置加载失败，使用默认值', error);
    }
  };

  // 加载空投数据
  const loadAirdrops = async (page: number = 0, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setError(null);
        setCurrentPage(0);
        setHasMore(true);
      } else if (page === 0) {
        setLoading(true);
        setError(null);
        setCurrentPage(0);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      
      const skip = page * pageSize;
      console.log(`🔄 AirdropsScreen: 开始加载空投数据, page: ${page}, skip: ${skip}, limit: ${pageSize}`);
      
      const airdropData = await airdropService.getAirdropList(skip, pageSize);
      console.log(`📊 AirdropsScreen: 获取到原始数据:`, airdropData);
      
      // 确保数据唯一性
      const uniqueAirdropData = airdropData.filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id)
      );
      
      if (isRefresh || page === 0) {
        // 刷新或初次加载，替换数据
        setAirdrops(uniqueAirdropData);
        setCurrentPage(0);
        console.log(`🔄 AirdropsScreen: 替换数据，共 ${uniqueAirdropData.length} 个空投`);
      } else {
        // 加载更多，追加数据
        setAirdrops(prev => {
          // 过滤掉重复的ID，避免key冲突
          const existingIds = new Set(prev.map(item => item.id));
          const newItems = uniqueAirdropData.filter(item => !existingIds.has(item.id));
          const newAirdrops = [...prev, ...newItems];
          console.log(`🔄 AirdropsScreen: 追加数据，过滤重复后新增 ${newItems.length} 个，总共 ${newAirdrops.length} 个空投`);
          return newAirdrops;
        });
      }
      
      // 检查是否还有更多数据
      setHasMore(uniqueAirdropData.length === pageSize);
      setCurrentPage(page);
      
      console.log(`✅ AirdropsScreen: 成功加载 ${uniqueAirdropData.length} 个空投, 页码: ${page}, 还有更多: ${uniqueAirdropData.length === pageSize}`);
    } catch (err) {
      console.error('❌ AirdropsScreen: 加载空投失败:', err);
      setError(errorText);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
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

  // 处理登录按钮点击
  const handleLoginPress = () => {
    console.log('🔄 AirdropsScreen: 点击登录按钮');
    setLoginModalVisible(true);
  };

  // 处理用户按钮点击
  const handleUserButtonPress = () => {
    console.log('🔄 AirdropsScreen: 点击用户按钮, currentUser:', currentUser);
    console.log('🔄 AirdropsScreen: navigation对象:', navigation);
    console.log('🔄 AirdropsScreen: navigation.navigate方法:', typeof navigation.navigate);
    
    if (currentUser) {
      console.log('✅ AirdropsScreen: 尝试导航到UserStatus页面');
      try {
        navigation.navigate('UserStatus' as never);
        console.log('✅ AirdropsScreen: 导航命令已执行');
      } catch (error) {
        console.error('❌ AirdropsScreen: 导航失败:', error);
      }
    } else {
      console.log('⚠️ AirdropsScreen: 未登录，显示登录模态框');
      setLoginModalVisible(true);
    }
  };

  // 处理登录成功
  const handleLoginSuccess = (user) => {
    console.log('✅ AirdropsScreen: 登录成功', user);
    // LoginModal内部已经处理了成功消息显示和模态框关闭
    // 这里只需要记录日志即可
  };

  // 初始加载
  useEffect(() => {
    const initialize = async () => {
      await loadConfigs();
      loadAirdrops(0);
    };
    initialize();
  }, []);

  // 下拉刷新
  const onRefresh = React.useCallback(() => {
    loadAirdrops(0, true);
  }, []);

  // 加载更多数据
  const loadMoreData = React.useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1;
      console.log('🔄 AirdropsScreen: 加载更多数据，页码:', nextPage);
      loadAirdrops(nextPage);
    }
  }, [loadingMore, hasMore, currentPage]);

  // 过滤空投
  const filteredAirdrops = airdrops.filter(airdrop => {
    const matchesSearch = 
      airdrop.title.toLowerCase().includes(searchText.toLowerCase()) ||
      airdrop.description.toLowerCase().includes(searchText.toLowerCase());
    
    return matchesSearch;
  });

  // 骨架加载组件
  const renderAirdropSkeleton = () => (
    <View style={styles.airdropsList}>
      {[1, 2, 3, 4, 5].map((index) => (
        <View key={index} style={styles.airdropSkeletonCard}>
          <View style={styles.airdropContent}>
            <View style={styles.airdropHeader}>
              <SkeletonBox width={50} height={50} borderRadius={8} style={styles.airdropIcon} />
              <View style={styles.airdropInfo}>
                <SkeletonBox width="100%" height={16} style={{ marginBottom: 8 }} />
                <SkeletonBox width="80%" height={14} />
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  // 渲染加载更多的底部组件
  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.footerLoadingText}>{loadMoreText}</Text>
      </View>
    );
  };

  // 渲染空投卡片
  const renderAirdropItem = ({ item }: { item: AirdropItem }) => (
    <TouchableOpacity 
      style={styles.airdropCard}
      onPress={() => navigation.navigate('AirdropDetail', { path: item.id, returnTo: 'Airdrops' })} // 跳转到空投详情页
    >
      <View style={styles.airdropContent}>
        <View style={styles.airdropHeader}>
          <Image source={{ uri: item.logo }} style={styles.airdropIcon} />
          <View style={styles.airdropInfo}>
            <Text style={styles.airdropTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.airdropDescription} numberOfLines={2}>{item.description}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // 加载状态
  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <TodayHeader
          activeTab="airdrops"
          onBackPress={() => {}} // 不需要返回功能
          onLoginPress={handleLoginPress}
          onUserPress={handleUserButtonPress}
          title={screenTitle}
        />

        {/* Search Bar Skeleton */}
        {enableSearch && (
          <View style={styles.searchContainer}>
            <SkeletonBox width={20} height={20} borderRadius={10} style={styles.searchIcon} />
            <SkeletonBox width="100%" height={20} style={{ flex: 1 }} />
          </View>
        )}

        {renderAirdropSkeleton()}

        {/* Login Modal */}
        <LoginModal
          visible={loginModalVisible}
          onClose={() => setLoginModalVisible(false)}
          onLoginSuccess={handleLoginSuccess}
        />

        {/* Message Modal */}
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
      {/* Header */}
      <TodayHeader
        activeTab="airdrops"
        onBackPress={() => {}} // 不需要返回功能
        onLoginPress={handleLoginPress}
        onUserPress={handleUserButtonPress}
        title={screenTitle}
      />

      {/* Search Bar */}
      {enableSearch && (
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
      )}

      {/* Airdrops List */}
      <FlatList
        data={filteredAirdrops}
        renderItem={renderAirdropItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={styles.airdropsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        onEndReached={loadMoreData}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="rocket-outline" size={50} color="#CCC" />
            <Text style={styles.emptyText}>
              {error ? error : searchText ? noSearchResultText : emptyText}
            </Text>
            {error && (
              <TouchableOpacity style={styles.retryButton} onPress={() => loadAirdrops(0)}>
                <Text style={styles.retryButtonText}>{retryButtonText}</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Login Modal */}
      <LoginModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Message Modal */}
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
    backgroundColor: '#FAFAFA',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
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
  airdropsList: {
    padding: 16,
    paddingTop: 8,
  },
  airdropCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  airdropContent: {
    padding: 12,
  },
  airdropHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  airdropIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    marginRight: 10,
  },
  airdropInfo: {
    flex: 1,
  },
  airdropTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    lineHeight: 22,
    color: '#1A1A1A',
  },
  airdropDescription: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 18,
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
  retryButton: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
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
    color: '#007AFF',
  },

  // 骨架加载样式
  airdropSkeletonCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
});

export default AirdropsScreen;