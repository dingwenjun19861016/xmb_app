import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  Share,
  Linking,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';

// Import services
import { airdropService, AirdropItem } from '../../services/AirdropService';
import { configService } from '../../services/ConfigService';
import { getWebAppURL } from '../../config/apiConfig';

// Import contexts
import { useUser } from '../../contexts/UserContext';

// Import components
import MessageModal from '../../components/common/MessageModal';
import LoginModal from '../../components/auth/LoginModal';
import PosterModal from '../../components/common/PosterModal';
import WebPosterModal from '../../components/common/WebPosterModal';
import SkeletonBox from '../../components/common/SkeletonBox';

// AirdropDetail Screen
const AirdropDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // 使用用户Context
  const { currentUser } = useUser();
  
  // Handle both path and legacy airdropId parameter
  const params = route.params || {};
  const airdropPath = params.path || params.airdropId || (params.airdrop && params.airdrop.id) || '1';
  // Extract returnTo parameter for context-aware navigation
  const returnTo = params.returnTo || null;
  
  // State management
  const [airdrop, setAirdrop] = useState<AirdropItem | null>(null);
  const [similarAirdrops, setSimilarAirdrops] = useState<AirdropItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Removed reminder state
  const [activeSteps, setActiveSteps] = useState<boolean[]>([]);

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

  // 配置状态
  const [pageTitle, setPageTitle] = useState('空投详情');
  const [loadingText, setLoadingText] = useState('加载空投中...');
  const [participateButtonText, setParticipateButtonText] = useState('参与空投');
  const [notFoundText, setNotFoundText] = useState('空投信息不存在');
  const [networkErrorText, setNetworkErrorText] = useState('网络连接失败，请重试');
  const [linkUnavailableTitle, setLinkUnavailableTitle] = useState('链接不可用');
  const [linkUnavailableMessage, setLinkUnavailableMessage] = useState('此空投的参与链接暂不可用，请稍后再试。');
  const [linkUnavailableButton, setLinkUnavailableButton] = useState('确定');
  const [publishDateLabel, setPublishDateLabel] = useState('发布时间');
  const [enableShare, setEnableShare] = useState(true);
  const [enableParticipateButton, setEnableParticipateButton] = useState(true);
  const [fallbackScreenName, setFallbackScreenName] = useState('AirdropsMain'); // 当无法返回时的目标页面
  
  // 加载配置
  const loadConfigs = async () => {
    try {
      const [
        titleConfig,
        loadingConfig,
        participateConfig,
        notFoundConfig,
        networkErrorConfig,
        linkTitleConfig,
        linkMessageConfig,
        linkButtonConfig,
        dateLabel,
        shareConfig,
        participateButtonConfig,
        fallbackScreenConfig
      ] = await Promise.all([
        configService.getConfig('AIRDROP_DETAIL_TITLE', '空投详情'),
        configService.getConfig('AIRDROP_DETAIL_LOADING_TEXT', '加载空投中...'),
        configService.getConfig('AIRDROP_PARTICIPATE_BUTTON_TEXT', '参与空投'),
        configService.getConfig('AIRDROP_NOT_FOUND_TEXT', '空投信息不存在'),
        configService.getConfig('AIRDROP_NETWORK_ERROR_TEXT', '网络连接失败，请重试'),
        configService.getConfig('AIRDROP_LINK_UNAVAILABLE_TITLE', '链接不可用'),
        configService.getConfig('AIRDROP_LINK_UNAVAILABLE_MESSAGE', '此空投的参与链接暂不可用，请稍后再试。'),
        configService.getConfig('AIRDROP_LINK_UNAVAILABLE_BUTTON', '确定'),
        configService.getConfig('AIRDROP_PUBLISH_DATE_LABEL', '发布时间'),
        configService.getConfig('AIRDROP_ENABLE_SHARE', 'true'),
        configService.getConfig('AIRDROP_ENABLE_PARTICIPATE_BUTTON', 'true'),
        configService.getConfig('AIRDROP_FALLBACK_SCREEN', 'AirdropsMain')
      ]);

      setPageTitle(titleConfig);
      setLoadingText(loadingConfig);
      setParticipateButtonText(participateConfig);
      setNotFoundText(notFoundConfig);
      setNetworkErrorText(networkErrorConfig);
      setLinkUnavailableTitle(linkTitleConfig);
      setLinkUnavailableMessage(linkMessageConfig);
      setLinkUnavailableButton(linkButtonConfig);
      setPublishDateLabel(dateLabel);
      setEnableShare(shareConfig === 'true');
      setEnableParticipateButton(participateButtonConfig === 'true');
      setFallbackScreenName(fallbackScreenConfig);

      console.log('✅ AirdropDetailScreen: 配置加载成功', {
        pageTitle: titleConfig,
        enableShare: shareConfig === 'true',
        enableParticipateButton: participateButtonConfig === 'true',
        fallbackScreen: fallbackScreenConfig
      });
    } catch (error) {
      console.warn('⚠️ AirdropDetailScreen: 配置加载失败，使用默认值', error);
    }
  };

  // Fetch airdrop data
  useEffect(() => {
    const initialize = async () => {
      await loadConfigs();
      fetchAirdropData();
    };

    const fetchAirdropData = async () => {
      try {
        setLoading(true);
        setError(null);


        // Fetch the specific airdrop by path
        const airdropData = await airdropService.getAirdropByPath(airdropPath);
        
        if (airdropData) {
          setAirdrop(airdropData);
          console.log('✅ AirdropDetailScreen: Airdrop loaded:', airdropData.title);
          
          // Initialize step completion status
          setActiveSteps(new Array(airdropData.requirements.length).fill(false));
          
          // Fetch similar airdrops (same category or recent airdrops)
          try {
            // Get the number of related airdrops to display from config (default: 8)
            const relatedSizeStr = await configService.getConfig('AIRDROP_RELATED_SIZE', '8');
            const relatedSize = parseInt(relatedSizeStr) || 8;
            
            // Fetch more airdrops than needed to ensure we have enough after filtering
            const fetchSize = Math.max(relatedSize + 5, 10);
            const similar = await airdropService.getAirdropsByCategory(airdropData.category, 0, fetchSize);
            
            // Filter out the current airdrop
            const filteredSimilar = similar.filter(item => item.id !== airdropPath);
            const finalSimilar = filteredSimilar.slice(0, relatedSize);
            
            setSimilarAirdrops(finalSimilar);
          } catch (similarError) {
            console.warn('⚠️ AirdropDetailScreen: Failed to load similar airdrops:', similarError);
            setSimilarAirdrops([]);
          }
        } else {
          console.warn('⚠️ AirdropDetailScreen: Airdrop not found, path:', airdropPath);
          setError(notFoundText);
          // 不使用fallback数据，而是显示错误状态
          setAirdrop(null);
          setSimilarAirdrops([]);
        }

      } catch (fetchError) {
        console.error('❌ AirdropDetailScreen: Failed to fetch airdrop:', fetchError);
        // 根据错误类型设置不同的错误信息
        if (fetchError.message.includes('network') || fetchError.message.includes('fetch')) {
          setError(networkErrorText);
        } else {
          setError(fetchError.message);
        }
        // 不使用fallback数据，而是显示错误状态
        setAirdrop(null);
        setSimilarAirdrops([]);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [airdropPath]);

  // Removed reminder functionality

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
    console.log('✅ AirdropDetailScreen: 登录成功', user);
    // 不需要手动关闭modal，LoginModal会自己关闭
    
    // 显示登录成功消息
    showMessageModal(
      'success',
      '登录成功',
      `欢迎回来，${user.email}！`,
      [{ text: '确定', onPress: () => setModalVisible(false) }]
    );
  };

  // Share airdrop function
  const handleShare = async () => {
    console.log('🔄 分享按钮被点击');
    if (!airdrop) {
      console.warn('⚠️ 没有空投数据，无法分享');
      return;
    }
    
    // 获取对应的Web URL
    const shareUrl = getShareUrl();
    if (!shareUrl) {
      console.warn('⚠️ 没有有效的分享链接');
      showMessageModal('warning', '无法分享', '无法生成分享链接');
      return;
    }
    
    console.log('📱 平台:', Platform.OS);
    console.log('🔗 分享链接:', shareUrl);
    
    try {
      // 统一显示海报模态框，不区分平台
      console.log('🖼️ 显示海报模态框');
      setShowPosterModal(true);
    } catch (error) {
      console.error('❌ 分享失败:', error);
      showMessageModal('error', '分享失败', '分享失败，请重试');
    }
  };

  // Generate share URL - 根据当前画面构造对应的网页URL
  const getShareUrl = () => {
    if (!airdrop) return '';
    
    // 使用统一的Web应用URL配置
    // 对应页面的web URL格式为：{domain}/airdrops/{id}
    return getWebAppURL(`airdrops/${airdrop.id}`);
  };

  // Open external links
  const openUrl = (url: string) => {
    if (url) {
      console.log('🔗 AirdropDetailScreen: Opening URL:', url);
      Linking.openURL(url)
        .then(() => console.log('✅ Successfully opened URL'))
        .catch(err => console.error('❌ Failed to open URL:', err));
    } else {
      console.warn('⚠️ AirdropDetailScreen: Attempted to open empty URL');
    }
  };

  // 智能返回功能 - 修复Web导航问题并支持returnTo参数
  const handleBackPress = () => {
 1   
    // Web环境下的修复方案
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      
      const currentUrl = window.location.href;      
      // 如果returnTo参数是home，则返回到首页
      if (!returnTo) {
         try {
          const url = new URL(currentUrl);
          const targetUrl = `${url.origin}/airdrops`;
          
          // 直接导航到目标页面
          window.location.href = targetUrl;
          return;
        } catch (urlError) {
          console.error('❌ AirdropDetailScreen: URL解析失败:', urlError);
        }
      } 
      
      navigation.goBack();
      return;
    }
    
    navigation.goBack();
    return;
  };

  // Toggle step completion status
  const toggleStepCompletion = (index: number) => {
    const updatedSteps = [...activeSteps];
    updatedSteps[index] = !updatedSteps[index];
    setActiveSteps(updatedSteps);
  };

  // 骨架加载组件
  const renderSkeleton = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Cover Image Skeleton */}
      <SkeletonBox width="100%" height={220} borderRadius={0} />
      
      {/* Airdrop Header Card Skeleton */}
      <View style={styles.airdropHeaderCard}>
        <View style={styles.airdropHeaderTop}>
          <SkeletonBox width={60} height={60} borderRadius={30} style={styles.logo} />
          <View style={styles.titleContainer}>
            <SkeletonBox width="100%" height={20} style={{ marginBottom: 8 }} />
            <SkeletonBox width="80%" height={16} style={{ marginBottom: 8 }} />
            <SkeletonBox width="60%" height={14} />
          </View>
        </View>
        <SkeletonBox width="100%" height={18} style={{ marginTop: 12, marginBottom: 8 }} />
        <View style={styles.infoRow}>
          <SkeletonBox width={80} height={24} borderRadius={12} style={{ marginRight: 12 }} />
          <SkeletonBox width={60} height={24} borderRadius={12} style={{ marginRight: 12 }} />
          <SkeletonBox width={70} height={24} borderRadius={12} />
        </View>
      </View>

      {/* Buttons Card Skeleton */}
      <View style={styles.buttonsCard}>
        <SkeletonBox width="70%" height={40} borderRadius={20} style={{ marginRight: 12 }} />
        <SkeletonBox width={40} height={40} borderRadius={20} />
      </View>

      {/* Details Card Skeleton */}
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <SkeletonBox width={60} height={14} style={{ marginBottom: 8 }} />
            <SkeletonBox width={80} height={16} />
          </View>
          <View style={styles.detailItem}>
            <SkeletonBox width={50} height={14} style={{ marginBottom: 8 }} />
            <SkeletonBox width={70} height={16} />
          </View>
          <View style={styles.detailItem}>
            <SkeletonBox width={55} height={14} style={{ marginBottom: 8 }} />
            <SkeletonBox width={65} height={16} />
          </View>
        </View>
      </View>

      {/* Section Card Skeleton - Requirements */}
      <View style={styles.sectionCard}>
        <SkeletonBox width={100} height={20} style={{ marginBottom: 16 }} />
        {[1, 2, 3].map((index) => (
          <View key={index} style={styles.requirementItem}>
            <SkeletonBox width={20} height={20} borderRadius={10} style={{ marginRight: 12, marginTop: 2 }} />
            <SkeletonBox width="90%" height={16} />
          </View>
        ))}
      </View>

      {/* Section Card Skeleton - Steps */}
      <View style={styles.sectionCard}>
        <SkeletonBox width={120} height={20} style={{ marginBottom: 16 }} />
        {[1, 2, 3, 4].map((index) => (
          <View key={index} style={styles.stepItem}>
            <View style={styles.stepHeader}>
              <SkeletonBox width={30} height={30} borderRadius={15} style={{ marginRight: 12 }} />
              <View style={styles.stepContent}>
                <SkeletonBox width="100%" height={16} style={{ marginBottom: 6 }} />
                <SkeletonBox width="80%" height={14} />
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Section Card Skeleton - Tokenomics */}
      <View style={styles.sectionCard}>
        <SkeletonBox width={100} height={20} style={{ marginBottom: 16 }} />
        {[1, 2, 3, 4].map((index) => (
          <View key={index} style={styles.tokenomicsItem}>
            <SkeletonBox width={80} height={16} />
            <SkeletonBox width={100} height={16} />
          </View>
        ))}
      </View>

      {/* Related Airdrops Skeleton */}
      <View style={styles.relatedContainer}>
        <SkeletonBox width={100} height={20} style={{ marginBottom: 16 }} />
        {[1, 2].map((index) => (
          <View key={index} style={styles.relatedSkeletonCard}>
            <SkeletonBox width={60} height={50} borderRadius={8} style={{ marginRight: 12 }} />
            <View style={styles.relatedContentSkeleton}>
              <SkeletonBox width="100%" height={16} style={{ marginBottom: 8 }} />
              <SkeletonBox width="80%" height={14} style={{ marginBottom: 6 }} />
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
            onPress={handleBackPress}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{pageTitle}</Text>
          <View style={styles.headerRightContainer}>
            {enableShare && (
              <TouchableOpacity 
                style={styles.shareButton}
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={22} color="white" />
              </TouchableOpacity>
            )}
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
  if (error && !airdrop) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{pageTitle}</Text>
          <View style={styles.headerRightContainer}>
            {enableShare && (
              <TouchableOpacity 
                style={styles.shareButton}
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={22} color="white" />
              </TouchableOpacity>
            )}
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
            onPress={handleBackPress}
          >
            <Text style={styles.retryButtonText}>返回</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!airdrop) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pageTitle}</Text>
        <View style={styles.headerRightContainer}>
          {enableShare && (
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={22} color="white" />
            </TouchableOpacity>
          )}
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
        {/* Cover Image */}
        <Image source={{ uri: airdrop.background }} style={styles.coverImage} />
        
        {/* Airdrop Header Card - 简化版 */}
        <View style={styles.airdropHeaderCard}>
          <View style={styles.airdropHeaderTop}>
            <Image source={{ uri: airdrop.logo }} style={styles.logo} />
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{airdrop.title}</Text>
              <Text style={styles.dateText}>{publishDateLabel}: {airdrop.date}</Text>
            </View>
          </View>
        </View>

        {/* 只保留参与按钮 - 支持动态控制显示 */}
        {enableParticipateButton && (
          <View style={styles.buttonsCard}>
              <TouchableOpacity 
                style={styles.participateButton}
                onPress={() => {
                  if (airdrop.link) {
                    openUrl(airdrop.link);
                  } else {
                    // 如果链接为空，显示提示
                    Alert.alert(
                      linkUnavailableTitle,
                      linkUnavailableMessage,
                      [{ text: linkUnavailableButton }]
                    );
                  }
                }}
              >
                <Text style={styles.participateButtonText}>{participateButtonText}</Text>
              </TouchableOpacity>
          </View>
        )}
        
        {/* Airdrop Content */}
        <View style={styles.contentContainer}>
          <Markdown style={markdownStyles}>
            {airdrop.content}
          </Markdown>
        </View>

        {/* Related Airdrops */}
        {similarAirdrops.length > 0 && (
          <View style={styles.relatedContainer}>
            <Text style={styles.relatedTitle}>相关空投</Text>
            {similarAirdrops.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.relatedCard}
                onPress={() => {
                  navigation.navigate('AirdropDetail', {
                    path: item.id,
                    returnTo: returnTo
                  });
                }}
              >
                <Image source={{ uri: item.logo }} style={styles.relatedImage} />
                <View style={styles.relatedContent}>
                  <Text style={styles.relatedCardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.relatedDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <Text style={styles.relatedDate}>{item.date}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Poster Modal - 分享画面选择合适的模态框，都使用同一个URL */}
      {airdrop && Platform.OS === 'web' ? (
        <WebPosterModal
          visible={showPosterModal}
          onClose={() => setShowPosterModal(false)}
          title={airdrop.title}
          category={airdrop.category}
          summary={airdrop.description || '查看空投详情'}
          articleUrl={getShareUrl()} // 使用标准化的URL
          onShowMessage={showMessageModal}
        />
      ) : airdrop ? (
        <PosterModal
          visible={showPosterModal}
          onClose={() => setShowPosterModal(false)}
          title={airdrop.title}
          category={airdrop.category}
          summary={airdrop.description || '查看空投详情'}
          articleUrl={getShareUrl()} // 使用标准化的URL
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
    paddingTop: 60,
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
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  coverImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#F0F0F0',
  },
  // Loading and error states
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
  airdropHeaderCard: {
    backgroundColor: 'white',
    margin: 15,
    marginBottom: 10,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  airdropHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    backgroundColor: '#F0F0F0',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
    marginBottom: 3,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  buttonsCard: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    marginBottom: 10,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  longDescription: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 10,
  },
  chainLogo: {
    width: 16,
    height: 16,
    marginRight: 5,
  },
  chainName: {
    fontSize: 12,
    color: '#666',
  },
  categoryBadge: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 10,
  },
  categoryText: {
    fontSize: 12,
    color: '#007AFF',
  },
  difficultyBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  difficultyText: {
    fontSize: 12,
    color: '#666',
  },
  detailsCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participateButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginRight: 10,
  },
  participateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Removed reminder button styles
  sectionCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  checkIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  requirementText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  stepItem: {
    marginBottom: 15,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumberContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepNumber: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  stepDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 3,
  },
  tokenomicsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tokenomicsLabel: {
    fontSize: 14,
    color: '#666',
  },
  dateValue: {
    fontSize: 14,
    color: '#666',
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  linkButton: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  linkText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 5,
  },
  // Content area
  contentContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  // Tags
  tagsContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  tagText: {
    fontSize: 14,
    color: '#666',
  },
  // Related airdrops
  relatedContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  relatedCard: {
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  relatedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  relatedCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  relatedDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  tagsBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 10,
  },
  tagsText: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // 骨架加载样式
  relatedSkeletonCard: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  relatedContentSkeleton: {
    flex: 1,
    justifyContent: 'space-between',
  },
});

// Markdown styles for rich text content
const markdownStyles = {
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#000',
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#000',
  },
  heading3: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    color: '#000',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
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
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    paddingLeft: 15,
    paddingVertical: 10,
    marginVertical: 10,
    fontStyle: 'italic',
  },
  code_inline: {
    backgroundColor: '#F1F3F4',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  code_block: {
    backgroundColor: '#F1F3F4',
    padding: 12,
    borderRadius: 6,
    marginVertical: 8,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  link: {
    color: '#007AFF',
  },
  list_item: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 5,
  },
};

export default AirdropDetailScreen;