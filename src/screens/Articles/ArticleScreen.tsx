import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Import services
import newsService, { NewsArticle } from '../../services/NewsService';
import configService from '../../services/ConfigService';

// Import contexts
import { useUser } from '../../contexts/UserContext';

// Import components
import TodayHeader from '../../components/common/TodayHeader';
import MessageModal from '../../components/common/MessageModal';
import LoginModal from '../../components/auth/LoginModal';
import TimelineNewsCard from '../../components/common/TimelineNewsCard';
import SkeletonBox from '../../components/common/SkeletonBox';

// 分类配置 - 移除"全部"分类，只保留具体分类
const ARTICLE_CATEGORIES = ['快讯', '头条', '研报'];
const CATEGORY_MAP: Record<string, string> = {
  '头条': 'headline',
  '研报': 'market',
  '快讯': 'stockquicknews',
};

const ArticleScreen = () => {
  const navigation = useNavigation();
  const { currentUser } = useUser();
  const searchInputRef = useRef<TextInput>(null);

  // 数据状态
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // 搜索和过滤状态
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('快讯'); // 默认显示快讯

  // UI配置状态
  const [screenTitle, setScreenTitle] = useState('快讯');
  const [searchPlaceholder, setSearchPlaceholder] = useState('搜索资讯...');
  const [pageSize, setPageSize] = useState(20);

  // Modal状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalButtons, setModalButtons] = useState<Array<{
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress: () => void;
  }>>([]);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  // 加载配置
  useEffect(() => {
    loadConfigs();
  }, []);

  // 页面聚焦时加载数据
  useFocusEffect(
    React.useCallback(() => {
      loadArticles(true);
    }, [activeCategory, searchText])
  );

  const loadConfigs = async () => {
    try {
      await configService.init();
      
      const [
        screenTitleConfig,
        searchPlaceholderConfig,
        pageSizeConfig
      ] = await Promise.all([
        configService.getConfig('ARTICLES_SCREEN_TITLE', '快讯'),
        configService.getConfig('ARTICLES_SEARCH_PLACEHOLDER', '搜索资讯...'),
        configService.getConfig('ARTICLES_PAGE_SIZE', 20)
      ]);

      setScreenTitle(screenTitleConfig);
      setSearchPlaceholder(searchPlaceholderConfig);
      setPageSize(pageSizeConfig);

      console.log('✅ ArticleScreen: Config loaded successfully');
    } catch (error) {
      console.error('❌ ArticleScreen: Failed to load configs:', error);
    }
  };

  const loadArticles = async (reset: boolean = false) => {
    if (loading && !reset) return;

    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(1);
        setHasMoreData(true);
      } else {
        setLoadingMore(true);
      }

      const skip = reset ? 0 : (currentPage - 1) * pageSize;
      let categoryFilter = '';

      // 设置分类过滤
      if (activeCategory && activeCategory !== '全部') {
        categoryFilter = CATEGORY_MAP[activeCategory] || '';
      }

      console.log('🔍 ArticleScreen: Loading articles with:', {
        skip,
        pageSize,
        category: categoryFilter,
        search: searchText.trim()
      });

      // 获取文章数据 - 使用与HomeScreen相同的API
      let newArticles;
      if (searchText.trim()) {
        newArticles = await newsService.searchNews(
          searchText.trim(),
          pageSize,
          skip
        );
      } else if (categoryFilter) {
        newArticles = await newsService.getNewsByCategory(
          categoryFilter,
          skip,
          pageSize
        );
      } else {
        // 使用与HomeScreen 今日要闻相同的API
        newArticles = await newsService.getFeaturedLatestNews(pageSize);
      }

      // 格式化新闻日期
      const formatNewsDate = (article: NewsArticle) => ({
        ...article,
        date: newsService.formatDate(article.date)
      });

      const formattedArticles = (Array.isArray(newArticles) ? newArticles : []).map(formatNewsDate);
      
      if (reset) {
        setArticles(formattedArticles);
      } else {
        setArticles(prev => [...prev, ...formattedArticles]);
      }

      // 检查是否还有更多数据
      setHasMoreData(formattedArticles.length === pageSize);
      if (!reset) {
        setCurrentPage(prev => prev + 1);
      }

      console.log('✅ ArticleScreen: Articles loaded successfully:', {
        count: formattedArticles.length,
        total: reset ? formattedArticles.length : articles.length + formattedArticles.length
      });

    } catch (error) {
      console.error('❌ ArticleScreen: Failed to load articles:', error);
      showMessageModal(
        'error',
        '加载失败',
        '无法加载文章列表，请检查网络连接后重试',
        [{ text: '确定', onPress: () => setModalVisible(false) }]
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    // 重新加载文章
    setTimeout(() => {
      loadArticles(true);
    }, 300);
  };

  const handleCategoryPress = (category: string) => {
    if (category !== activeCategory) {
      setActiveCategory(category);
      setSearchText('');
      if (searchInputRef.current) {
        searchInputRef.current.clear();
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadArticles(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMoreData) {
      loadArticles(false);
    }
  };

  const handleArticlePress = (article: NewsArticle) => {
    navigation.navigate('ArticleDetail', { article });
  };

  // Modal辅助函数
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

  const handleLoginPress = () => {
    setLoginModalVisible(true);
  };

  const handleUserPress = () => {
    if (currentUser) {
      navigation.navigate('UserStatus');
    } else {
      setLoginModalVisible(true);
    }
  };

  const handleLoginSuccess = (user: any) => {
    console.log('✅ ArticleScreen: 登录成功', user);
    showMessageModal(
      'success',
      '登录成功',
      `欢迎回来，${user.email}！`,
      [{ text: '确定', onPress: () => setModalVisible(false) }]
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* 搜索框 */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={handleSearch}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchText ? (
          <TouchableOpacity
            onPress={() => {
              setSearchText('');
              if (searchInputRef.current) {
                searchInputRef.current.clear();
              }
              loadArticles(true);
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 分类标签 */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {ARTICLE_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              activeCategory === category && styles.activeCategoryButton
            ]}
            onPress={() => handleCategoryPress(category)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.categoryText,
              activeCategory === category && styles.activeCategoryText
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderArticleItem = ({ item, index }: { item: NewsArticle; index: number }) => (
    <TimelineNewsCard
      key={item._id || index}
      article={item}
      onPress={() => handleArticlePress(item)}
      style={styles.articleItem}
      isLast={index === articles.length - 1}
    />
  );

  const renderLoadingItem = () => (
    <View style={styles.skeletonContainer}>
      <View style={styles.articleSkeleton}>
        {/* Timeline dot */}
        <View style={styles.timelineSkeletonDot} />
        
        {/* Content */}
        <View style={styles.articleContentSkeleton}>
          <SkeletonBox width="30%" height={12} style={{ marginBottom: 4 }} />
          <SkeletonBox width="40%" height={10} style={{ marginBottom: 12 }} />
          <SkeletonBox width="90%" height={16} style={{ marginBottom: 6 }} />
          <SkeletonBox width="75%" height={14} style={{ marginBottom: 12 }} />
          <View style={styles.articleMetaSkeleton}>
            <SkeletonBox width="25%" height={12} />
            <SkeletonBox width="20%" height={12} />
          </View>
        </View>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>加载更多...</Text>
        </View>
      );
    }

    if (!hasMoreData && articles.length > 0) {
      return (
        <View style={styles.loadingFooter}>
          <Text style={styles.noMoreDataText}>没有更多数据了</Text>
        </View>
      );
    }

    return null;
  };

  const renderLoadingScreen = () => (
    <View style={styles.container}>
      <TodayHeader 
        activeTab="articles"
        onBackPress={() => navigation.goBack()}
        onLoginPress={handleLoginPress}
        onUserPress={handleUserPress}
        title={screenTitle}
      />
      <View style={styles.loadingContainer}>
        {renderHeader()}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {[1, 2, 3, 4, 5].map((index) => (
            <View key={index} style={styles.skeletonContainer}>
              <View style={styles.newsCardSkeleton}>
                <SkeletonBox width={80} height={80} style={styles.newsCardImageSkeleton} />
                <View style={styles.newsCardContent}>
                  <SkeletonBox width="90%" height={16} style={{ marginBottom: 6 }} />
                  <SkeletonBox width="70%" height={14} style={{ marginBottom: 8 }} />
                  <SkeletonBox width="40%" height={12} />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  if (loading) {
    return renderLoadingScreen();
  }

  return (
    <View style={styles.container}>
      <TodayHeader 
        activeTab="articles"
        onBackPress={() => navigation.goBack()}
        onLoginPress={handleLoginPress}
        onUserPress={handleUserPress}
        title={screenTitle}
      />

      <View style={styles.content}>
        <FlatList
          data={articles}
          renderItem={renderArticleItem}
          keyExtractor={(item, index) => item._id || index.toString()}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },

  loadingContainer: {
    flex: 1,
  },

  content: {
    flex: 1,
  },

  listContainer: {
    paddingBottom: 20,
    paddingTop: 8,
  },

  headerContainer: {
    backgroundColor: 'white',
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 0,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 0,
  },

  clearButton: {
    padding: 4,
  },

  categoriesContainer: {
    marginBottom: 8,
  },

  categoriesContent: {
    paddingHorizontal: 16,
    paddingRight: 32,
  },

  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  activeCategoryButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },

  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },

  activeCategoryText: {
    color: 'white',
  },

  articleItem: {
    marginBottom: 16,
  },

  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'transparent',
  },

  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },

  noMoreDataText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Timeline skeleton styles
  skeletonContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },

  articleSkeleton: {
    flexDirection: 'row',
  },

  timelineSkeletonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E5E5',
    marginTop: 8,
    marginRight: 12,
  },

  articleImageSkeleton: {
    borderRadius: 6,
    marginBottom: 8,
  },

  articleContentSkeleton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },

  articleMetaSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
});

export default ArticleScreen;
