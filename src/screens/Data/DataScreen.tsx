import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Import contexts
import { useUser } from '../../contexts/UserContext';

// Import components
import ConfigurableDataGrid from '../../components/common/ConfigurableDataGrid';
import { getMainURL } from '../../config/apiConfig';
import TodayHeader from '../../components/common/TodayHeader';
import LoginModal from '../../components/auth/LoginModal';
import MessageModal from '../../components/common/MessageModal';

// Import services
import configService from '../../services/ConfigService';

const DataScreen = () => {
  const navigation = useNavigation();
  
  // 使用用户Context
  const { currentUser } = useUser();
  
  const [refreshing, setRefreshing] = useState(false);

  // 配置状态
  const [screenTitle, setScreenTitle] = useState('数据');
  const [sectionTitle, setSectionTitle] = useState('金融数据');
  const [moreButtonText, setMoreButtonText] = useState('查看更多数据');
  const [moreDataUrl, setMoreDataUrl] = useState(getMainURL('data/'));

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
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      console.log('🔄 DataScreen: Loading configs...');
      
      // 等待configService完全初始化
      await configService.init();
      
      // 获取配置
      const screenTitleConfig = await configService.getConfig('DATA_SCREEN_TITLE', '数据');
      const sectionTitleConfig = await configService.getConfig('DATA_SECTION_TITLE', '金融数据');
      const moreButtonTextConfig = await configService.getConfig('DATA_MORE_BUTTON_TEXT', '查看更多数据');
      const moreDataUrlConfig = await configService.getConfig('DATA_MORE_URL', getMainURL('data/'));
      
      console.log('🔍 DataScreen: Raw config values:', {
        DATA_SCREEN_TITLE: screenTitleConfig,
        DATA_SECTION_TITLE: sectionTitleConfig,
        DATA_MORE_BUTTON_TEXT: moreButtonTextConfig,
        DATA_MORE_URL: moreDataUrlConfig
      });
      
      // 设置配置
      setScreenTitle(screenTitleConfig);
      setSectionTitle(sectionTitleConfig);
      setMoreButtonText(moreButtonTextConfig);
      setMoreDataUrl(moreDataUrlConfig);
      
      console.log('✅ DataScreen: Config loaded successfully');
      
    } catch (error) {
      console.error('❌ DataScreen: Failed to load configs:', error);
      // 如果加载配置失败，使用默认值
      setScreenTitle('数据');
      setSectionTitle('金融数据');
      setMoreButtonText('查看更多数据');
      setMoreDataUrl(getMainURL('data/'));
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // 这里可以触发各个组件的数据刷新
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleMoreDataPress = async () => {
    try {
      const supported = await Linking.canOpenURL(moreDataUrl);
      
      if (supported) {
        await Linking.openURL(moreDataUrl);
      } else {
        console.log("无法打开URL: " + moreDataUrl);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
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
    console.log('✅ DataScreen: 登录成功', user);
    // 不需要手动关闭modal，LoginModal会自己关闭
    
    // 显示登录成功消息
    showMessageModal(
      'success',
      '登录成功',
      `欢迎回来，${user.email}！`,
      [{ text: '确定', onPress: () => setModalVisible(false) }]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      
      {/* Header */}
      <TodayHeader 
        activeTab="data"
        onBackPress={() => navigation.goBack()}
        onLoginPress={handleLoginPress}
        onUserPress={handleUserPress}
        title={screenTitle}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 金融数据 Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{sectionTitle}</Text>
            <TouchableOpacity 
              style={styles.moreDataButton}
              onPress={handleMoreDataPress}
              activeOpacity={0.7}
            >
              <Text style={styles.moreDataText}>{moreButtonText}</Text>
              <Ionicons name="arrow-forward" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>
          
          {/* Market Indicators Grid - Configurable Layout */}
          <ConfigurableDataGrid />
        </View>
      </ScrollView>
      
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
    backgroundColor: '#FAFAFA', // 与MarketScreen保持一致
  },
  
  scrollView: {
    flex: 1,
  },
  
  // 分区容器
  sectionContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
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
    color: '#1A1A1A',
  },

  moreDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  moreDataText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginRight: 4,
  },
});

export default DataScreen;