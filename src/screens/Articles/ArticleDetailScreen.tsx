import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Share,
  ActivityIndicator,
  Linking,
  Platform,
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';

// Import services
import { newsService, NewsArticle } from '../../services/NewsService';
import { configService } from '../../services/ConfigService';
import { getWebAppURL } from '../../config/apiConfig';

// Import contexts
import { useUser } from '../../contexts/UserContext';

// Import components
import PosterModal from '../../components/common/PosterModal';
import WebPosterModal from '../../components/common/WebPosterModal';
import LoginModal from '../../components/auth/LoginModal';
import MessageModal from '../../components/common/MessageModal';
import SkeletonBox from '../../components/common/SkeletonBox';

// Fallback data for when API fails
const FALLBACK_ARTICLE = {
  id: '1',
  title: '美股ETF持续录得资金流入，分析师看多科技股上涨',
  summary: '多家美股ETF报告显示资金流入持续走强，市场分析师看好科技股突破新高',
  content: '自从美联储政策调整以来，资金持续流入美股市场。根据最新数据，上周共有超过10亿美元的新资金流入各大科技股ETF，其中纳斯达克100ETF吸引了约4.8亿美元。\n\n多位华尔街分析师认为，这种持续流入将推动科技股价格在未来几个月内突破历史新高。摩根士丹利的美股专家表示："机构资金正在逐步布局科技股市场，ETF为传统金融机构提供了一个优质的投资渠道。"\n\n有分析师预测纳斯达克指数今年可能达到新的历史高点。',
  date: '1小时前',
  author: '小目标',
  image: '', // 移除占位图片
  category: '市场动态',
  tags: ['美股', 'ETF', '投资']
};

const ArticleDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // 使用用户Context
  const { currentUser } = useUser();
  
  const { 
    articleId, 
    article: passedArticle,  // 接收传递过来的文章数据
    returnTo, 
    selectedCategory, 
    searchText, 
    isSearchMode 
  } = route.params || { 
    articleId: '1', 
    article: null,
    returnTo: undefined,
    selectedCategory: '全部',
    searchText: '',
    isSearchMode: false
  };

  // State management
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  
  // Exchange ad states
  const [exchangeAd, setExchangeAd] = useState<string>('');
  const [exchangeUrls, setExchangeUrls] = useState<Record<string, string>>({});

  // Poster modal state
  const [showPosterModal, setShowPosterModal] = useState(false);

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

  // Configuration states
  const [pageTitle, setPageTitle] = useState<string>('文章详情');
  const [loadingText, setLoadingText] = useState<string>('加载文章中...');
  const [notFoundText, setNotFoundText] = useState<string>('文章未找到，可能已被删除或不存在');
  const [showExchangeAd, setShowExchangeAd] = useState<boolean>(true);

  // Handle back button press with web support
  const handleBack = () => {
    console.log('🔙 处理返回操作...');
    
    // Web环境下检查是否为直接URL访问
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const currentUrl = window.location.href;
      console.log('📍 当前URL:', currentUrl);
      
      // 检查是否是通过URL直接访问的（没有导航历史记录）
      const isDirectAccess = window.history.length <= 1;
      
      if (isDirectAccess) {
        // 只有直接URL访问才重定向到文章列表页
        console.log('🌐 直接URL访问，重定向到文章列表页');
        try {
          const url = new URL(currentUrl);
          const articlesUrl = `${url.origin}/articles`;
          window.location.href = articlesUrl;
          return;
        } catch (urlError) {
          console.error('❌ ArticleDetailScreen: URL解析失败:', urlError);
          window.location.href = '/articles';
          return;
        }
      }
    }
     
    // 所有其他情况都使用导航返回
    console.log('📱 使用导航返回');
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // 如果没有可返回的页面，导航到文章列表
      navigation.navigate('Articles');
    }
  };

  // Handle exchange button press
  const handleExchangePress = async (exchangeName: string, url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Failed to open exchange URL:', error);
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

  // 处理登录成功
  const handleLoginSuccess = (user) => {
    console.log('✅ ArticleDetailScreen: 登录成功', user);
    // 不需要手动关闭modal，LoginModal会自己关闭
    
    // 显示登录成功消息
    showMessageModal(
      'success',
      '登录成功',
      `欢迎回来，${user.email}！`,
      [{ text: '确定', onPress: () => setModalVisible(false) }]
    );
  };

  // Fetch article data
  useEffect(() => {
    const fetchArticleData = async () => {
      try {
        setLoading(true);
        setError(null);
        setImageLoadFailed(false);

        // Load page configurations
        try {
          const [
            titleConfig,
            loadingConfig,
            notFoundConfig,
            showExchangeConfig,
            adContent,
            urlsContent
          ] = await Promise.all([
            configService.getConfig('ARTICLE_DETAIL_TITLE', '文章详情'),
            configService.getConfig('ARTICLE_LOADING_TEXT', '加载文章中...'),
            configService.getConfig('ARTICLE_NOT_FOUND_TEXT', '文章未找到，可能已被删除或不存在'),
            configService.getConfig('ARTICLE_SHOW_EXCHANGE_AD', 'true'),
            configService.getConfig('ARTICLE_EXCHANGE_AD', ''),
            configService.getConfig('ARTICLE_EXCHANGE_URL', '{}')
          ]);

          setPageTitle(titleConfig);
          setLoadingText(loadingConfig);
          setNotFoundText(notFoundConfig);
          setShowExchangeAd(showExchangeConfig === 'true');
          setExchangeAd(adContent);
          
          try {
            const parsedUrls = JSON.parse(urlsContent);
            setExchangeUrls(parsedUrls);
          } catch (parseError) {
            console.warn('❌ ArticleDetailScreen: 交易所URL解析失败:', parseError);
            setExchangeUrls({});
          }
        } catch (configError) {
          console.warn('❌ ArticleDetailScreen: 配置加载失败:', configError);
        }

        // 优先使用传递过来的文章数据
        if (passedArticle) {
          console.log('✅ ArticleDetailScreen: 使用传递的文章数据:', passedArticle.title);
          setArticle(passedArticle);
        } else if (articleId) {
          // 如果没有传递文章数据，则通过 API 获取
          console.log('🔍 ArticleDetailScreen: 通过API获取文章数据, ID:', articleId);
          try {
            const articleData = await newsService.getArticleById(articleId);
            if (articleData) {
              setArticle(articleData);
            } else {
              throw new Error('文章不存在');
            }
          } catch (fetchError) {
            console.warn('❌ ArticleDetailScreen: API获取文章失败:', fetchError);
            // 使用 fallback 数据
            setArticle(FALLBACK_ARTICLE);
          }
        } else {
          // 既没有传递数据也没有 ID，使用 fallback
          console.log('📰 ArticleDetailScreen: 使用fallback文章数据');
          setArticle(FALLBACK_ARTICLE);
        }

        // 获取相关文章
        try {
          const relatedSizeStr = await configService.getConfig('ARTICLE_RELATED_SIZE', '8');
          const relatedSize = parseInt(relatedSizeStr) || 8;
          const currentArticle = passedArticle || article;
          
          if (currentArticle && currentArticle.category) {
            const fetchSize = Math.max(relatedSize + 5, 10);
            const related = await newsService.getNewsByCategory(currentArticle.category, 0, fetchSize);
            const filteredRelated = related.filter(item => item.id !== (currentArticle.id || currentArticle._id));
            setRelatedArticles(filteredRelated.slice(0, relatedSize));
          } else {
            // 如果没有分类信息，获取最新文章作为相关文章
            const related = await newsService.getFeaturedLatestNews(relatedSize);
            setRelatedArticles(related);
          }
        } catch (relatedError) {
          console.warn('❌ ArticleDetailScreen: 相关文章获取失败:', relatedError);
          setRelatedArticles([]);
        }

      } catch (fetchError) {
        console.error('💥 ArticleDetailScreen: 获取文章失败:', fetchError);
        setError(fetchError.message);
        setArticle(FALLBACK_ARTICLE);
        setRelatedArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArticleData();
  }, [articleId, passedArticle]);

  // Share article function
  const handleShare = async () => {
    console.log('🔄 分享按钮被点击');
    if (!article) {
      console.warn('⚠️ 没有文章数据，无法分享');
      return;
    }
    
    console.log('📱 平台:', Platform.OS);
    
    try {
      // 统一显示海报模态框，不区分平台
      console.log('🖼️ 显示海报模态框');
      setShowPosterModal(true);
    } catch (error) {
      console.error('❌ 分享失败:', error);
      showMessageModal('error', '分享失败', '分享失败，请重试');
    }
  };

  // Generate share URL
  const getShareUrl = () => {
    if (!article) return '';
    return getWebAppURL(`articles/${article.id}`);
  };

  // 骨架加载组件
  const renderSkeleton = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Timeline Skeleton */}
      <View style={styles.timelineContainer}>
        {/* Timeline Left Skeleton */}
        <View style={styles.timelineLeft}>
          <SkeletonBox width={12} height={12} borderRadius={6} />
          <View style={styles.timelineLine} />
        </View>
        
        {/* Timeline Content Skeleton */}
        <View style={styles.timelineContent}>
          {/* Time Header Skeleton */}
          <View style={styles.timeHeader}>
            <SkeletonBox width={80} height={16} />
            <SkeletonBox width={60} height={24} borderRadius={16} />
          </View>
          
          {/* Article Card Skeleton */}
          <View style={styles.articleCard}>
            <SkeletonBox width="100%" height={24} style={{ marginBottom: 16 }} />
            <SkeletonBox width="90%" height={18} style={{ marginBottom: 12 }} />
            <SkeletonBox width="95%" height={18} style={{ marginBottom: 12 }} />
            <SkeletonBox width="85%" height={18} style={{ marginBottom: 16 }} />
            
            <SkeletonBox width="100%" height={18} style={{ marginBottom: 12 }} />
            <SkeletonBox width="88%" height={18} style={{ marginBottom: 12 }} />
            <SkeletonBox width="92%" height={18} style={{ marginBottom: 16 }} />
            
            <SkeletonBox width="94%" height={18} style={{ marginBottom: 12 }} />
            <SkeletonBox width="87%" height={18} />
          </View>
        </View>
      </View>

      {/* Exchange Ad Skeleton */}
      <View style={styles.exchangeAdContainer}>
        <SkeletonBox width="100%" height={50} borderRadius={8} style={{ marginBottom: 12 }} />
        <View style={styles.exchangeButtonsContainer}>
          <SkeletonBox width={100} height={36} borderRadius={18} style={{ marginRight: 12 }} />
          <SkeletonBox width={100} height={36} borderRadius={18} />
        </View>
      </View>

      {/* Related Articles Skeleton */}
      <View style={styles.relatedContainer}>
        <SkeletonBox width={100} height={22} style={{ marginBottom: 16 }} />
        {[1, 2, 3].map((index) => (
          <View key={index} style={styles.relatedSkeletonCard}>
            <View style={styles.relatedContentSkeleton}>
              <SkeletonBox width="100%" height={16} style={{ marginBottom: 8 }} />
              <SkeletonBox width="80%" height={14} style={{ marginBottom: 4 }} />
              <SkeletonBox width="60%" height={12} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{pageTitle}</Text>
          <View style={styles.headerRightContainer}>
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={22} color="white" />
            </TouchableOpacity>
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
        
        {renderSkeleton()}
      </View>
    );
  }

  // Error state
  if (error && !article) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{pageTitle}</Text>
          <View style={styles.headerRightContainer}>
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={22} color="white" />
            </TouchableOpacity>
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
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={50} color="#FF3B30" />
          <Text style={styles.errorText}>加载失败</Text>
          <Text style={styles.errorSubText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleBack}
          >
            <Text style={styles.retryButtonText}>返回</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!article) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pageTitle}</Text>
        <View style={styles.headerRightContainer}>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={22} color="white" />
          </TouchableOpacity>
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Timeline Article Layout */}
        <View style={styles.timelineContainer}>
          {/* Timeline Line and Dot */}
          <View style={styles.timelineLeft}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineLine} />
          </View>
          
          {/* Article Content */}
          <View style={styles.timelineContent}>
            {/* Time and Category */}
            <View style={styles.timeHeader}>
              <Text style={styles.timeText}>{article.date}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{article.category}</Text>
              </View>
            </View>
            
            {/* Article Card */}
            <View style={styles.articleCard}>
              <Text style={styles.title}>{article.title}</Text>
              <Markdown style={markdownStyles}>
                {article.content}
              </Markdown>
            </View>
          </View>
        </View>

        {/* Exchange Advertisement */}
        {showExchangeAd && exchangeAd && exchangeAd.trim() !== '' && (
          <View style={styles.exchangeAdContainer}>
            <Text style={styles.exchangeAdText}>{exchangeAd}</Text>
            {Object.keys(exchangeUrls).length > 0 && (
              <View style={styles.exchangeButtonsContainer}>
                {Object.entries(exchangeUrls).map(([exchangeName, url]) => (
                  <TouchableOpacity
                    key={exchangeName}
                    style={styles.exchangeButton}
                    onPress={() => handleExchangePress(exchangeName, url)}
                  >
                    <Text style={styles.exchangeButtonText}>{exchangeName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}



        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <View style={styles.relatedContainer}>
            <Text style={styles.relatedTitle}>相关文章</Text>
            {relatedArticles.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.relatedItem}
                onPress={() => navigation.push('ArticleDetail', { 
                  articleId: item.id,
                  returnTo: returnTo || 'home' // 继承当前页面的returnTo参数，或默认返回首页
                })}
              >
                <View style={styles.relatedContent}>
                  <Text style={styles.relatedItemTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.relatedMeta}>
                    <Text style={styles.relatedCategory}>{item.category}</Text>
                    <Text style={styles.relatedDate}>{item.date}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Poster Modal */}
      {article && Platform.OS === 'web' ? (
        <WebPosterModal
          visible={showPosterModal}
          onClose={() => setShowPosterModal(false)}
          title={article.title}
          category={article.category}
          summary={article.summary}
          articleUrl={getShareUrl()}
          onShowMessage={showMessageModal}
        />
      ) : article ? (
        <PosterModal
          visible={showPosterModal}
          onClose={() => setShowPosterModal(false)}
          title={article.title}
          category={article.category}
          summary={article.summary}
          articleUrl={getShareUrl()}
        />
      ) : null}
      
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 44 : 24, // 减少头部高度，与其他屏幕保持一致
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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
  scrollView: {
    flex: 1,
  },
  
  // Timeline styles
  timelineContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#F8F9FA', // 更浅的背景色
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
    marginRight: 12, // 减少间距
    paddingTop: 6, // 减少顶部间距
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineLine: {
    flex: 1,
    width: 2, // 更细的线条
    backgroundColor: '#E8F4FD',
    marginTop: 8,
    minHeight: 150, // 减少最小高度
  },
  timelineContent: {
    flex: 1,
  },
  timeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // 减少底部间距
  },
  timeText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF20',
  },
  categoryText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  articleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16, // 减少内边距
    borderWidth: 1,
    borderColor: '#F2F2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 18, // 稍微减少字体大小
    fontWeight: '700',
    color: '#1D1D1F',
    lineHeight: 25,
    marginBottom: 12, // 减少底部间距
  },

  coverImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
    // 移除背景色，让图片区域在无图片时完全透明
  },
  articleHeader: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  date: {
    fontSize: 14,
    color: '#999',
  },
  
  // Exchange advertisement styles
  exchangeAdContainer: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    marginBottom: 8,
    borderRadius: 8,
    marginHorizontal: 15,
  },
  exchangeAdText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  exchangeButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  exchangeButton: {
    width: '31%',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#E8F0FE',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  exchangeButtonText: {
    color: '#1976D2',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  summary: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 15,
  },

  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  // Error states
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  errorSubText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Related articles
  relatedContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 20,
  },
  relatedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  relatedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  relatedContent: {
    flex: 1,
    marginRight: 10,
  },
  relatedItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 5,
  },
  relatedMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  relatedCategory: {
    fontSize: 12,
    color: '#007AFF',
  },
  relatedDate: {
    fontSize: 12,
    color: '#999',
  },

  // 骨架加载样式
  relatedSkeletonCard: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  relatedImageSkeleton: {
    marginRight: 12,
  },

  relatedContentSkeleton: {
    flex: 1,
    justifyContent: 'space-between',
  },
});

// Markdown styles for rich text content
const markdownStyles = {
  body: {
    fontSize: 15, // 稍微减少字体大小
    lineHeight: 22, // 减少行高
    color: '#333',
  },
  heading1: {
    fontSize: 22, // 减少标题字体大小
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#000',
  },
  heading2: {
    fontSize: 19,
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 7,
    color: '#000',
  },
  heading3: {
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    color: '#000',
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10, // 减少段落间距
    color: '#333',
  },
  strong: {
    fontWeight: 'bold',
  },
  em: {
    fontStyle: 'italic',
  },
  blockquote: {
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 8,
    fontStyle: 'italic',
  },
  code_inline: {
    backgroundColor: '#F1F3F4',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  code_block: {
    backgroundColor: '#F1F3F4',
    padding: 10,
    borderRadius: 6,
    marginVertical: 6,
    fontFamily: 'monospace',
    fontSize: 13,
  },
  link: {
    color: '#007AFF',
  },
  list_item: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
};

export default ArticleDetailScreen;