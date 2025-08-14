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
  ScrollView,
  Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Import services
import newsService from '../../services/NewsService';
import configService from '../../services/ConfigService';

// Import contexts  
import { useUser } from '../../contexts/UserContext';

// Import components
import TodayHeader from '../../components/common/TodayHeader';
import MessageModal from '../../components/common/MessageModal';
import LoginModal from '../../components/auth/LoginModal';
import SkeletonBox from '../../components/common/SkeletonBox';
import TimelineNewsCard from '../../components/common/TimelineNewsCard';

// Import types
interface NewsArticle {
  _id: string;
  title: string;
  summary?: string;
  content?: string;
  date: string;
  originalDate?: string; // 保存原始日期用于分组
  groupDate?: string; // 保存分组使用的日期
  author?: string;
  category?: string;
  tags?: string[];
  image?: string;
  link?: string;
  source?: string;
}

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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // 初始加载
  useEffect(() => {
    const initialize = async () => {
      await loadConfigs();
      loadArticles(true);
    };
    initialize();

    // 清理函数
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 页面聚焦时重新加载数据
  useFocusEffect(
    React.useCallback(() => {
      if (activeCategory) {
        loadArticles(true);
      }
    }, [activeCategory])
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

      // 格式化新闻日期 - 确保日期格式统一
      const formatNewsDate = (article: NewsArticle) => {
        try {
          let formattedDate: string;
          
          // 如果已经有相对时间格式（如 "8分钟前"），保持原样
          if (typeof article.date === 'string' && 
              (article.date.includes('分钟前') || 
               article.date.includes('小时前') || 
               article.date.includes('天前') || 
               article.date === '刚刚')) {
            formattedDate = article.date;
          } else {
            // 使用 newsService 的格式化方法
            formattedDate = newsService.formatDate(article.date);
          }
          
          return {
            ...article,
            date: formattedDate,
            originalDate: article.date // 保存原始日期用于分组
          };
        } catch (error) {
          console.warn('Date formatting error:', error, article.date);
          return {
            ...article,
            date: article.date || new Date().toISOString(),
            originalDate: article.date || new Date().toISOString()
          };
        }
      };

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
    // 防抖处理，延迟搜索
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      loadArticles(true);
    }, 300);
  };

  // 分类切换处理函数
  const handleCategoryPress = (category: string) => {
    setActiveCategory(category);
    setCurrentPage(1);
    loadArticles(true);
  };

  // 下拉刷新
  const handleRefresh = () => {
    setRefreshing(true);
    loadArticles(true);
  };

  // 加载更多数据
  const loadMoreData = React.useCallback(() => {
    if (!loadingMore && hasMoreData) {
      loadArticles(false);
    }
  }, [loadingMore, hasMoreData]);

  // FlatList 的 onEndReached 处理函数
  const handleLoadMore = () => {
    if (!loadingMore && hasMoreData && articles.length > 0) {
      loadMoreData();
    }
  };

  // 过滤文章
  const filteredArticles = React.useMemo(() => {
    return articles.filter(article => {
      const matchesSearch = searchText.trim() === '' || 
        article.title.toLowerCase().includes(searchText.toLowerCase()) ||
        (article.summary && article.summary.toLowerCase().includes(searchText.toLowerCase()));
      
      return matchesSearch;
    });
  }, [articles, searchText]);

  // 按日期分组文章
  const groupedArticles = React.useMemo(() => {
    const groups: { [key: string]: NewsArticle[] } = {};
    
    filteredArticles.forEach(article => {
      // 解析日期 - 支持多种日期格式，优先使用 originalDate
      let date: Date;
      const dateSource = article.originalDate || article.date;
      
      try {
        // 如果已经是 Date 对象
        if (dateSource instanceof Date) {
          date = dateSource;
        } 
        // 如果是时间戳（数字）
        else if (typeof dateSource === 'number') {
          date = new Date(dateSource);
        }
        // 如果是字符串
        else if (typeof dateSource === 'string') {
          // 跳过相对时间格式，使用当前时间
          if (dateSource.includes('分钟前') || 
              dateSource.includes('小时前') || 
              dateSource.includes('天前') || 
              dateSource === '刚刚') {
            date = new Date(); // 使用当前时间进行分组
          } else {
            // 处理各种字符串格式
            const dateStr = dateSource.trim();
            if (dateStr.includes('T') || dateStr.includes(':')) {
              // ISO 格式或带时间的格式
              date = new Date(dateStr);
            } else if (dateStr.includes('-') || dateStr.includes('/')) {
              // 日期格式 2024-01-01 或 2024/01/01
              date = new Date(dateStr);
            } else {
              // 其他格式
              date = new Date(dateStr);
            }
          }
        } else {
          date = new Date();
        }
        
        // 验证日期是否有效
        if (isNaN(date.getTime())) {
          console.warn('Invalid date:', dateSource);
          date = new Date(); // 使用当前时间作为默认值
        }
      } catch (error) {
        console.warn('Date parsing error:', error, dateSource);
        date = new Date(); // 使用当前时间作为默认值
      }
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateKey: string;
      const dateString = date.toDateString();
      const todayString = today.toDateString();
      const yesterdayString = yesterday.toDateString();
      
      if (dateString === todayString) {
        dateKey = '今天';
      } else if (dateString === yesterdayString) {
        dateKey = '昨天';
      } else {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        dateKey = `${month}月${day}日`;
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push({
        ...article,
        groupDate: date.toISOString() // 添加分组日期字段
      });
    });
    
    // 转换为数组格式并排序
    return Object.entries(groups)
      .map(([date, articles]) => ({ date, articles }))
      .sort((a, b) => {
        // 今天排在最前面，然后是昨天，然后按日期倒序
        if (a.date === '今天') return -1;
        if (b.date === '今天') return 1;
        if (a.date === '昨天') return -1;
        if (b.date === '昨天') return 1;
        return b.date.localeCompare(a.date);
      });
  }, [filteredArticles]);

  const handleArticlePress = (article: NewsArticle) => {
    navigation.navigate('ArticleDetail', { 
      articleId: article._id,
      article: article
    });
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

  // 日期分组头部组件
  const DateHeader = ({ date, displayText }: { date: string; displayText?: string }) => {
    const parseDate = (dateStr: string): Date => {
      try {
        // 尝试多种日期解析方式
        let parsedDate: Date;
        
        if (dateStr instanceof Date) {
          parsedDate = dateStr;
        } else if (typeof dateStr === 'string') {
          // 如果是 "今天"、"昨天" 这样的标识
          if (dateStr === '今天') {
            parsedDate = new Date();
          } else if (dateStr === '昨天') {
            parsedDate = new Date();
            parsedDate.setDate(parsedDate.getDate() - 1);
          } else if (dateStr.includes('月') && dateStr.includes('日')) {
            // 处理 "8月15日" 这样的格式
            const match = dateStr.match(/(\d+)月(\d+)日/);
            if (match) {
              const month = parseInt(match[1], 10) - 1; // 月份需要减1
              const day = parseInt(match[2], 10);
              parsedDate = new Date();
              parsedDate.setMonth(month);
              parsedDate.setDate(day);
            } else {
              parsedDate = new Date(dateStr);
            }
          } else {
            parsedDate = new Date(dateStr);
          }
        } else {
          parsedDate = new Date();
        }
        
        // 验证日期有效性
        if (isNaN(parsedDate.getTime())) {
          console.warn('Invalid date in DateHeader:', dateStr);
          parsedDate = new Date();
        }
        
        return parsedDate;
      } catch (error) {
        console.warn('Date parsing error in DateHeader:', error, dateStr);
        return new Date();
      }
    };

    const formatDateHeader = (dateStr: string) => {
      try {
        // 如果提供了 displayText，优先使用
        if (displayText) {
          return displayText;
        }
        
        // 如果已经是显示格式（今天、昨天），直接返回
        if (dateStr === '今天' || dateStr === '昨天') {
          return dateStr;
        }
        
        const date = parseDate(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const dateString = date.toDateString();
        const todayString = today.toDateString();
        const yesterdayString = yesterday.toDateString();
        
        if (dateString === todayString) {
          return '今天';
        } else if (dateString === yesterdayString) {
          return '昨天';
        } else {
          const month = date.getMonth() + 1;
          const day = date.getDate();
          return `${month}月${day}日`;
        }
      } catch (e) {
        console.warn('Error in formatDateHeader:', e, dateStr);
        return displayText || dateStr || '今天';
      }
    };

    const formatWeekday = (dateStr: string) => {
      try {
        const date = parseDate(dateStr);
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const dayIndex = date.getDay();
        return weekdays[dayIndex] || '星期一';
      } catch (e) {
        console.warn('Error in formatWeekday:', e, dateStr);
        return '星期一';
      }
    };

    const getDateNumber = (dateStr: string) => {
      try {
        const date = parseDate(dateStr);
        const day = date.getDate();
        return day.toString();
      } catch (e) {
        console.warn('Error in getDateNumber:', e, dateStr);
        return new Date().getDate().toString();
      }
    };

    const getMonthName = (dateStr: string) => {
      try {
        const date = parseDate(dateStr);
        const month = date.getMonth() + 1;
        return `${month}月`;
      } catch (e) {
        console.warn('Error in getMonthName:', e, dateStr);
        return `${new Date().getMonth() + 1}月`;
      }
    };

    return (
      <View style={styles.dateHeaderContainer}>
        <View style={styles.dateHeaderLeft}>
          <Text style={styles.dateHeaderMonth}>{getMonthName(date)}</Text>
          <Text style={styles.dateHeaderDay}>{getDateNumber(date)}</Text>
        </View>
        <View style={styles.dateHeaderRight}>
          <Text style={styles.dateHeaderTitle}>{formatDateHeader(date)}</Text>
          <Text style={styles.dateHeaderWeekday}>{formatWeekday(date)}</Text>
        </View>
      </View>
    );
  };

  const renderArticleItem = ({ item }: { item: { date: string; articles: NewsArticle[] } }) => {
    // 使用分组的第一篇文章的 groupDate 作为日期头部的数据源
    const firstArticle = item.articles[0];
    const headerDateSource = firstArticle?.groupDate || firstArticle?.originalDate || firstArticle?.date || new Date().toISOString();
    
    return (
      <View key={item.date}>
        {/* 日期头部 */}
        <DateHeader date={headerDateSource} displayText={item.date} />
        
        {/* 该日期下的文章列表 */}
        {item.articles.map((article, index) => (
          <TimelineNewsCard
            key={article._id || index}
            article={article}
            onPress={() => handleArticlePress(article)}
            isLast={index === item.articles.length - 1}
          />
        ))}
      </View>
    );
  };

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
          data={groupedArticles}
          renderItem={renderArticleItem}
          keyExtractor={(item) => item.date}
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
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.emptyContainer}>
                <Ionicons name="newspaper-outline" size={50} color="#CCC" />
                <Text style={styles.emptyText}>
                  {searchText ? '未找到相关快讯' : '暂无快讯'}
                </Text>
              </View>
            )
          }
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
    backgroundColor: '#F8F9FA',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  content: {
    flex: 1,
  },

  listContainer: {
    paddingBottom: 20,
  },

  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
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
    marginBottom: 0,
  },

  categoriesContent: {
    paddingHorizontal: 16,
    paddingRight: 32,
  },

  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 60,
    alignItems: 'center',
  },

  activeCategoryButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },

  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },

  activeCategoryText: {
    color: 'white',
    fontWeight: '600',
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

  // 日期头部样式 - 参考PANews截图
  dateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },

  dateHeaderLeft: {
    width: 70,
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    marginRight: 0,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  dateHeaderMonth: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 1,
  },

  dateHeaderDay: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  dateHeaderRight: {
    flex: 1,
    paddingLeft: 16,
  },

  dateHeaderTitle: {
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '600',
    marginBottom: 2,
  },

  dateHeaderWeekday: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '400',
  },

  // 空状态样式
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },

  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default ArticleScreen;
