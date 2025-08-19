import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  Image,
  TouchableOpacity,
  Linking,
  Animated,
  StatusBar,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface StartupAdModalProps {
  visible: boolean;
  onClose: () => void;
  imageUrl?: string;
  text?: string;
  url?: string;
  duration?: number; // 自动关闭时间，单位秒
}

const StartupAdModal: React.FC<StartupAdModalProps> = ({
  visible,
  onClose,
  imageUrl,
  text,
  url,
  duration = 5
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [countdown, setCountdown] = useState(duration);
  
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 启动动画
  const startShowAnimation = () => {
    // 重置动画值
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
    slideAnim.setValue(50);
    progressAnim.setValue(0);
    
    // 并行执行入场动画
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();

    // 启动进度条动画
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: duration * 1000,
      useNativeDriver: false,
    }).start();
  };

  // 启动关闭动画
  const startCloseAnimation = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      callback && callback();
    });
  };

  // 处理Modal显示
  useEffect(() => {
    if (visible) {
      console.log('🎯 StartupAdModal: 启动广告开始显示');
      setCountdown(duration);
      setImageLoading(true);
      setImageError(false);
      
      // 延迟启动动画，确保Modal完全渲染
      setTimeout(() => {
        startShowAnimation();
      }, 100);

      // 启动倒计时
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // 设置自动关闭定时器
      autoCloseTimerRef.current = setTimeout(() => {
        handleClose();
      }, duration * 1000);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [visible, duration]);

  // 处理关闭
  const handleClose = () => {
    console.log('🎯 StartupAdModal: 开始关闭广告');
    
    // 清除定时器
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }

    // 执行关闭动画
    startCloseAnimation(() => {
      onClose();
    });
  };

  // 处理广告点击
  const handleAdClick = async () => {
    if (url) {
      try {
        console.log('🎯 StartupAdModal: 点击广告，跳转到:', url);
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          handleClose(); // 跳转后关闭广告
        } else {
          console.warn('🎯 StartupAdModal: 无法打开链接:', url);
        }
      } catch (error) {
        console.error('🎯 StartupAdModal: 打开链接失败:', error);
      }
    }
  };

  // 处理图片加载完成
  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  // 处理图片加载失败
  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.8)" />
      
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <SafeAreaView style={styles.container}>
          {/* 关闭按钮 */}
          <Animated.View 
            style={[
              styles.closeButtonContainer,
              {
                opacity: fadeAnim,
                transform: [{
                  translateY: slideAnim
                }]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
              <Text style={styles.countdownText}>{countdown}s</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* 广告内容 */}
          <Animated.View 
            style={[
              styles.adContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { translateY: slideAnim }
                ]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.adContent}
              onPress={handleAdClick}
              activeOpacity={0.95}
              disabled={!url}
            >
              {/* 广告图片 */}
              <View style={styles.imageContainer}>
                {imageUrl && !imageError ? (
                  <>
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.adImage}
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                      resizeMode="contain"
                    />
                    {imageLoading && (
                      <View style={styles.imageLoadingOverlay}>
                        <ActivityIndicator size="large" color="#007AFF" />
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={50} color="#CCCCCC" />
                    <Text style={styles.placeholderText}>广告图片</Text>
                  </View>
                )}
              </View>

              {/* 广告文字 */}
              {text && (
                <View style={styles.textContainer}>
                  <Text style={styles.adText}>{text}</Text>
                  {url && (
                    <Text style={styles.clickHint}>点击了解更多</Text>
                  )}
                </View>
              )}

              {/* 点击指示器 */}
              {url && (
                <View style={styles.clickIndicator}>
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* 进度条 */}
            <View style={styles.progressContainer}>
              <Animated.View 
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  }
                ]}
              />
            </View>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  
  closeButtonContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  
  countdownText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  adContainer: {
    width: screenWidth * 0.8,
    maxWidth: 320,
    height: screenHeight * 0.7,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  
  adContent: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  
  imageContainer: {
    width: '100%',
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  adImage: {
    width: '100%',
    height: '100%',
  },
  
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F8FAFE', // 浅蓝色背景，与主题一致
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  placeholderText: {
    fontSize: 16,
    color: '#CCCCCC',
    marginTop: 10,
  },
  
  textContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    minHeight: 80,
  },
  
  adText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    lineHeight: 24,
  },
  
  clickHint: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
    textAlign: 'center',
  },
  
  clickIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  progressContainer: {
    height: 4,
    backgroundColor: '#E9ECEF',
    width: '100%',
  },
  
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
});

export default StartupAdModal;
