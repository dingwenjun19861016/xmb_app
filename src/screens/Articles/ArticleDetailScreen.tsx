import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Animated
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
// 新增手势缩放
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import Markdown from 'react-native-markdown-display';

// Import services
import { newsService, NewsArticle } from '../../services/NewsService';
import { configService } from '../../services/ConfigService';
import { getWebAppURL } from '../../config/apiConfig';
import userArticleService from '../../services/UserArticleService';

// Import contexts
import { useUser } from '../../contexts/UserContext';

// Import components
import MessageModal from '../../components/common/MessageModal';
import LoginModal from '../../components/auth/LoginModal';
import PosterModal from '../../components/common/PosterModal';
import WebPosterModal from '../../components/common/WebPosterModal';
import SkeletonBox from '../../components/common/SkeletonBox';
import TimelineNewsCard from '../../components/news/TimelineNewsCard';

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
    isSearchMode,
    fromArticleScreen // 添加来源标记
  } = route.params || { 
    articleId: '1', 
    article: null,
    returnTo: undefined,
    selectedCategory: '全部',
    searchText: '',
    isSearchMode: false,
    fromArticleScreen: false
  };

  // State management
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{[key: string]: {width: number, height: number}}>({});
  // 新增: 记录内容容器宽度用于按真实宽高比计算图片高度，避免宽屏裁剪
  const [contentWidth, setContentWidth] = useState(0);
  
  // 收藏相关状态
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAddingToFavorites, setIsAddingToFavorites] = useState(false);
  const [favoriteAdded, setFavoriteAdded] = useState(false);
  
  // ====== 图片全屏查看/缩放 ======
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const scale = useRef(new Animated.Value(1)).current; // 当前缩放
  const baseScaleRef = useRef(1); // 累积缩放
  const lastTapRef = useRef(0);
  
  const imageUrls = useMemo(() => (article?.contents || []).filter(c => !!c.url).map(c => c.url), [article]);
  
  // ====== 图片宽高比计算参数 ======
  const MIN_ASPECT = 0.40; // 最小显示高宽比，避免超宽图过扁 (h/w)
  const MAX_HEIGHT_RATIO = 1.8; // 最大高度相对宽度比例，防止竖图过高
  const getImageCalculatedStyle = (url: string) => {
    const dims = imageDimensions[url];
    if (!dims || !contentWidth) {
      // 还未获取真实尺寸时给一个占位（16:9）高度，加载后会自动调整
      return { aspectRatio: 16 / 9 } as any;
    }
    let aspect = dims.height / dims.width; // 实际高宽比
    if (aspect < MIN_ASPECT) aspect = MIN_ASPECT; // 保障最小高度
    const calcHeight = contentWidth * aspect;
    const maxHeight = contentWidth * MAX_HEIGHT_RATIO;
    const finalHeight = Math.min(calcHeight, maxHeight);
    return { height: finalHeight } as any;
  };
  
  const openViewer = (url: string) => {
    const idx = imageUrls.indexOf(url);
    if (idx >= 0) {
      setViewerIndex(idx);
    } else {
      setViewerIndex(0);
    }
    baseScaleRef.current = 1;
    scale.setValue(1);
    setViewerVisible(true);
  };
  
  const closeViewer = () => {
    setViewerVisible(false);
    baseScaleRef.current = 1;
    scale.setValue(1);
  };
  
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // 双击切换 1 与 2.5 倍
      const next = baseScaleRef.current > 1 ? 1 : 2.5;
      baseScaleRef.current = next;
      Animated.timing(scale, { toValue: next, duration: 160, useNativeDriver: true }).start();
    }
    lastTapRef.current = now;
  };
  
  const onPinchEvent = Animated.event([{ nativeEvent: { scale: scale } }], { useNativeDriver: true });
  
  const onPinchStateChange = (e: any) => {
    if (e.nativeEvent.state === State.END || e.nativeEvent.state === State.CANCELLED) {
      // 累积缩放并夹在区间
      baseScaleRef.current = baseScaleRef.current * e.nativeEvent.scale;
      if (baseScaleRef.current < 1) baseScaleRef.current = 1;
      if (baseScaleRef.current > 4) baseScaleRef.current = 4;
      Animated.timing(scale, { toValue: baseScaleRef.current, duration: 120, useNativeDriver: true }).start();
    } else if (e.nativeEvent.state === State.BEGAN) {
      // 开始手势时重置临时显示值到 1 (依附 baseScale)
      scale.setValue(baseScaleRef.current);
    }
  };

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

  // Handle back button press with web support - 参考AirdropDetailScreen的实现
  const handleBack = () => {
    console.log('🔙 ArticleDetailScreen: 处理返回操作...');
    
    // Web环境下的修复方案
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // 如果是通过 window.open 打开的新标签页，直接关闭以回到原页面的原位置
      if (window.opener) {
        try {
          window.close();
          return;
        } catch (e) {
          console.warn('⚠️ 无法直接关闭窗口，尝试历史返回', e);
        }
      }

      // 其余情况：按导航栈/浏览器历史返回
      if ((navigation as any).canGoBack && navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      if (window.history.length > 1) {
        window.history.back();
        return;
      }

      // 最后回退：如果带有股票代码参数，则回到对应股票详情；否则回到文章列表
      const stockCodeFromParams = (route as any)?.params?.stockCode || (route as any)?.params?.symbol || null;
      const fallbackUrl = stockCodeFromParams
        ? getWebAppURL(`market/${stockCodeFromParams}`)
        : getWebAppURL('articles');
      window.location.href = fallbackUrl;
      return;
    }
    
    // 原生环境
    if ((navigation as any).canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      const stockCodeFromParams = (route as any)?.params?.stockCode || (route as any)?.params?.symbol || null;
      if (stockCodeFromParams) {
        navigation.navigate('USStockDetail' as never, { name: stockCodeFromParams } as never);
      } else {
        navigation.navigate('Home' as never);
      }
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
      `欢迎回来，${user.email}！现在可以收藏文章了。`,
      [{ text: '确定', onPress: () => setModalVisible(false) }]
    );
    
    // 登录成功后检查收藏状态
    checkIfFavorite();
  };

  // 检查文章是否已收藏
  const checkIfFavorite = async () => {
    if (!currentUser || !article) {
      setIsFavorite(false);
      return;
    }

    try {
      const result = await userArticleService.getUserArticles(currentUser.email);
      if (result.success && result.data) {
        const favoriteArticles = result.data;
        const isArticleFavorite = favoriteArticles.some(
          (favoriteArticle) => favoriteArticle.path === article.id
        );
        setIsFavorite(isArticleFavorite);
      }
    } catch (error: any) {
      // 检查是否为登录过期错误
      if (error.message && error.message.includes('登录已过期')) {
        // 这里不自动打开登录modal，只是记录日志，让用户在主动操作时再提示
      }
      
      setIsFavorite(false);
    }
  };

  // 处理收藏按钮点击
  const handleFavoritePress = async () => {
    if (!article) return;
    
    const isRemoving = isFavorite;
    const actionText = isRemoving ? '取消收藏' : '收藏文章';
    
    // 检查用户是否登录
    if (!currentUser) {
      showMessageModal(
        'warning',
        '需要登录',
        '请先登录账户才能收藏文章',
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
              setLoginModalVisible(true);
            }
          }
        ]
      );
      return;
    }

    try {
      setIsAddingToFavorites(true);
      
      // 根据当前状态选择API
      const response = isRemoving 
        ? await userArticleService.removeUserArticle(currentUser.email, article.id)
        : await userArticleService.addUserArticle(currentUser.email, article.id);
        
      if (response.success && response.data) {
        // 更新本地状态
        setIsFavorite(!isRemoving);
        setFavoriteAdded(true);
        
        // 显示成功消息
        showMessageModal(
          'success',
          `${actionText}成功`,
          isRemoving 
            ? `文章已取消收藏`
            : `文章已添加到收藏列表`,
          [{ text: '确定', onPress: () => setModalVisible(false) }]
        );
        
        // 3秒后恢复原始状态
        setTimeout(() => {
          setFavoriteAdded(false);
        }, 3000);
      } else {
        throw new Error(response.error || `${actionText}失败`);
      }
    } catch (error: any) {
      
      // 检查是否为登录过期错误
      if (error.message && error.message.includes('登录已过期')) {
        setLoginModalVisible(true);
        return;
      }
      
      showMessageModal(
        'error',
        `${actionText}失败`,
        error.message || `${actionText}失败，请稍后重试`,
        [{ text: '确定', onPress: () => setModalVisible(false) }]
      );
    } finally {
      setIsAddingToFavorites(false);
    }
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
            notFoundConfig
          ] = await Promise.all([
            configService.getConfig('ARTICLE_DETAIL_TITLE', '文章详情'),
            configService.getConfig('ARTICLE_LOADING_TEXT', '加载文章中...'),
            configService.getConfig('ARTICLE_NOT_FOUND_TEXT', '文章未找到，可能已被删除或不存在')
          ]);

          setPageTitle(titleConfig);
          setLoadingText(loadingConfig);
          setNotFoundText(notFoundConfig);
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

  // 监听用户状态和文章状态变化，检查收藏状态
  useEffect(() => {
    if (currentUser && article) {
      checkIfFavorite();
    } else {
      setIsFavorite(false);
    }
  }, [currentUser, article]);

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

  // 检查是否需要显示APP下载按钮
  const shouldShowAppDownload = () => {
    // Android原生APP环境 - 不显示
    if (Platform.OS === 'android') {
      return false;
    }
    
    // iOS原生APP环境 - 不显示
    if (Platform.OS === 'ios') {
      return false;
    }
    
    // Web环境下进一步检查
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // 检查是否为PWA模式（添加到主屏幕的网页应用）
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true ||
                          document.referrer.includes('android-app://');
      
      // 如果是PWA模式，不显示下载按钮
      if (isStandalone) {
        return false;
      }
      
      // 检查User Agent来判断是否在原生APP的WebView中
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.includes('xmb') || userAgent.includes('wv')) {
        return false;
      }
    }
    
    // 其他情况显示下载按钮（主要是普通web浏览器）
    return Platform.OS === 'web';
  };

  // 处理APP下载按钮点击
  const handleAppDownloadPress = async () => {
    const downloadUrl = 'https://chainalert.me/view/research/4ebcb1';
    
    try {
      if (Platform.OS === 'web') {
        window.open(downloadUrl, '_blank');
      } else {
        const supported = await Linking.canOpenURL(downloadUrl);
        if (supported) {
          await Linking.openURL(downloadUrl);
        } else {
          showMessageModal(
            'error',
            '无法打开链接',
            '无法打开下载页面，请手动复制链接：\n' + downloadUrl,
            [{ text: '确定', onPress: () => setModalVisible(false) }]
          );
        }
      }
    } catch (error) {
      console.error('Failed to open download URL:', error);
      showMessageModal(
        'error',
        '打开失败',
        '无法打开下载页面，请稍后重试',
        [{ text: '确定', onPress: () => setModalVisible(false) }]
      );
    }
  };

  // 骨架加载组件
  const renderSkeleton = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Article Skeleton */}
      <View style={styles.articleContainer}>
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
            {/* 收藏按钮 */}
            <TouchableOpacity 
              style={[styles.favoriteButton, isAddingToFavorites && styles.favoriteButtonDisabled]}
              onPress={handleFavoritePress}
              disabled={isAddingToFavorites}
            >
              {isAddingToFavorites ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons 
                  name={isFavorite ? "heart" : "heart-outline"} 
                  size={22} 
                  color={isFavorite ? "#FF6B6B" : "white"} 
                />
              )}
            </TouchableOpacity>
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
            {/* 收藏按钮 */}
            <TouchableOpacity 
              style={[styles.favoriteButton, isAddingToFavorites && styles.favoriteButtonDisabled]}
              onPress={handleFavoritePress}
              disabled={isAddingToFavorites}
            >
              {isAddingToFavorites ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons 
                  name={isFavorite ? "heart" : "heart-outline"} 
                  size={22} 
                  color={isFavorite ? "#FF6B6B" : "white"} 
                />
              )}
            </TouchableOpacity>
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
          {/* 收藏按钮 */}
          <TouchableOpacity 
            style={[styles.favoriteButton, isAddingToFavorites && styles.favoriteButtonDisabled]}
            onPress={handleFavoritePress}
            disabled={isAddingToFavorites}
          >
            {isAddingToFavorites ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={22} 
                color={isFavorite ? "#FF6B6B" : "white"} 
              />
            )}
          </TouchableOpacity>
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
        {/* Article Layout */}
        <View style={styles.articleContainer}>
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
            
            {/* 循环渲染contents数组中的每个内容项 */}
            {article.contents && article.contents.length > 0 ? (
              article.contents.map((contentItem, index) => (
                <View key={contentItem._id || index} style={styles.contentItem}>
                  {/* 渲染文本内容 */}
                  {contentItem.content && (
                    <Markdown style={markdownStyles}>
                      {contentItem.content}
                    </Markdown>
                  )}
                  
                  {/* 渲染图片 */}
                  {contentItem.url && !imageLoadFailed && (
                    <View style={styles.imageContainer} onLayout={e => {
                      const w = e.nativeEvent.layout.width;
                      if (Math.abs(w - contentWidth) > 2) setContentWidth(w);
                    }}>
                      <TouchableOpacity activeOpacity={0.85} onPress={() => openViewer(contentItem.url)}>
                        <Image
                          source={{ uri: contentItem.url }}
                          style={[
                            styles.contentImage,
                            getImageCalculatedStyle(contentItem.url)
                          ]}
                          onError={() => { console.warn(`图片加载失败: ${contentItem.url}`); }}
                          onLoad={(event) => {
                            const { width, height } = event.nativeEvent.source;
                            setImageDimensions(prev => ({
                              ...prev,
                              [contentItem.url]: { width, height }
                            }));
                          }}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {/* 渲染嵌入内容 */}
                  {contentItem.embed && (
                    <View style={styles.embedContainer}>
                      <Markdown style={markdownStyles}>
                        {contentItem.embed}
                      </Markdown>
                    </View>
                  )}
                </View>
              ))
            ) : (
              // 如果没有contents数组，使用原来的content字段
              <Markdown style={markdownStyles}>
                {article.content}
              </Markdown>
            )}
          </View>
        </View>





        {/* APP下载推荐区域 - 仅在符合条件时显示 */}
        {shouldShowAppDownload() && (
          <View style={styles.appDownloadSection}>
            <TouchableOpacity 
              style={styles.appDownloadButton}
              onPress={handleAppDownloadPress}
            >
              <View style={styles.appDownloadContent}>
                <View style={styles.appDownloadIcon}>
                  <Ionicons name="phone-portrait-outline" size={20} color="#1976D2" />
                </View>
                <View style={styles.appDownloadText}>
                  <Text style={styles.appDownloadTitle}>下载小目标APP</Text>
                  <Text style={styles.appDownloadSubtitle}>获得更好的阅读体验</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </View>
            </TouchableOpacity>
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
                  article: item, // 传递完整的文章数据
                  returnTo: returnTo || 'articles' // 修正返回目标
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

      {/* 图片查看器 Modal */}
      <Modal visible={viewerVisible} transparent animationType="fade" onRequestClose={closeViewer}>
        <View style={styles.viewerBackdrop}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity onPress={closeViewer} style={styles.viewerCloseBtn}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.viewerCounter}>{viewerIndex + 1}/{imageUrls.length}</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.viewerBody}>
            <PinchGestureHandler onGestureEvent={onPinchEvent} onHandlerStateChange={onPinchStateChange}>
              <Animated.View style={styles.viewerImageWrapper}>
                <TouchableWithoutFeedback onPress={handleDoubleTap}>
                  <Animated.Image
                    source={{ uri: imageUrls[viewerIndex] }}
                    style={[styles.viewerImage, { transform: [{ scale }] }]}
                    resizeMode="contain"
                  />
                </TouchableWithoutFeedback>
              </Animated.View>
            </PinchGestureHandler>
            {imageUrls.length > 1 && (
              <>
                <TouchableOpacity style={[styles.navBtn, styles.navLeft]} onPress={() => {
                  const next = (viewerIndex - 1 + imageUrls.length) % imageUrls.length;
                  setViewerIndex(next);
                  baseScaleRef.current = 1; scale.setValue(1);
                }}>
                  <Ionicons name="chevron-back" size={30} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.navBtn, styles.navRight]} onPress={() => {
                  const next = (viewerIndex + 1) % imageUrls.length;
                  setViewerIndex(next);
                  baseScaleRef.current = 1; scale.setValue(1);
                }}>
                  <Ionicons name="chevron-forward" size={30} color="#fff" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFE', // 浅蓝色背景，与主题一致
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 44 : 24, // 减少头部高度，与其他屏幕保持一致
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#1976D2', // 金融蓝色，与主题一致
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
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  favoriteButtonDisabled: {
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  
  // Article container styles
  articleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  timeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF20',
  },
  categoryText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  articleCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    borderWidth: 0,
    shadowColor: 'transparent',
    elevation: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D1D1F',
    lineHeight: 28,
    marginBottom: 16,
  },
  
  // 新增样式用于contents数组的富媒体内容
  contentItem: {
    marginBottom: 16,
  },
  imageContainer: {
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  contentImage: {
    width: '100%',
    resizeMode: 'contain',
  },
  // ====== Viewer Styles ======
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  viewerHeader: {
    paddingTop: Platform.OS === 'ios' ? 44 : 28,
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  viewerCloseBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerCounter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  viewerBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  viewerImageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  viewerImage: {
    width: '100%',
    height: '100%'
  },
  navBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -30,
    width: 54,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)'
  },
  navLeft: { left: 0 },
  navRight: { right: 0 },

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
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  relatedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  relatedContent: {
    flex: 1,
    marginRight: 12,
  },
  relatedItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    lineHeight: 22,
    marginBottom: 8,
  },
  relatedMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  relatedCategory: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  relatedDate: {
    fontSize: 13,
    color: '#8E8E93',
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
  
  // APP下载按钮样式
  appDownloadSection: {
    paddingHorizontal: 12,
    paddingVertical: 15,
    backgroundColor: '#F8FAFE',
  },
  appDownloadButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E3F2FD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appDownloadContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appDownloadIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appDownloadText: {
    flex: 1,
  },
  appDownloadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 2,
  },
  appDownloadSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
});

// Markdown styles for rich text content
const markdownStyles = {
  body: {
    fontSize: 16,
    lineHeight: 26,
    color: '#1D1D1F',
  },
  heading1: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
    color: '#1D1D1F',
  },
  heading2: {
    fontSize: 21,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 10,
    color: '#1D1D1F',
  },
  heading3: {
    fontSize: 19,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#1D1D1F',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 14,
    color: '#1D1D1F',
  },
  strong: {
    fontWeight: '700',
    color: '#1D1D1F',
  },
  em: {
    fontStyle: 'italic',
    color: '#1D1D1F',
  },
  blockquote: {
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    paddingLeft: 16,
    paddingVertical: 12,
    marginVertical: 12,
    fontStyle: 'italic',
    borderRadius: 6,
  },
  code_inline: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
  },
  code_block: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
  },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  list_item: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 6,
    color: '#1D1D1F',
  },
};

export default ArticleDetailScreen;