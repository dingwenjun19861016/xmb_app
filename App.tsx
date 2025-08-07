import React, { useEffect, useState } from 'react';
import { StatusBar, Platform, View, StyleSheet, Dimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RealTimePriceProvider } from './src/contexts/RealTimePriceContext';
import { USStockRealTimePriceProvider } from './src/contexts/USStockRealTimePriceContext';
import { ChartTypeProvider } from './src/contexts/ChartTypeContext';
import { UserProvider } from './src/contexts/UserContext';
import AppNavigator from './src/navigation/AppNavigator';
import linking from './src/navigation/LinkingConfiguration';
import configService from './src/services/ConfigService';
import serviceWorkerManager from './src/services/ServiceWorkerManager';

const App = () => {
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  useEffect(() => {
    const onChange = (result) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  // 判断是否为宽屏
  const isWideScreen = Platform.OS === 'web' && screenData.width > 1000;

  useEffect(() => {
    // 初始化配置服务
    const initializeApp = async () => {
      try {
        // console.log('🔄 App: Initializing ConfigService...');
        await configService.init();
        // console.log('✅ App: ConfigService initialized successfully');
      } catch (error) {
        console.error('❌ App: Failed to initialize ConfigService:', error);
      }
    };
    
    initializeApp();
    
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // 使用专业的Service Worker管理器
      // console.log('🔄 App: Initializing Service Worker...');
      serviceWorkerManager.register();
      
      // 添加 PWA meta 标签
      const addMetaTag = (name, content) => {
        if (!document.querySelector(`meta[name="${name}"]`)) {
          const meta = document.createElement('meta');
          meta.name = name;
          meta.content = content;
          document.head.appendChild(meta);
        }
      };
      
      addMetaTag('apple-mobile-web-app-capable', 'yes');
      addMetaTag('apple-mobile-web-app-status-bar-style', 'default');
      addMetaTag('apple-mobile-web-app-title', '小目标');
      addMetaTag('theme-color', '#007AFF');
      
      // 添加 manifest 链接
      if (!document.querySelector('link[rel="manifest"]')) {
        const manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = '/manifest.json';
        document.head.appendChild(manifestLink);
      }
      
      // 设置标题
      document.title = '小目标 - 加密货币市场数据';
      
      // 设置body背景色，让边框效果更明显
      document.body.style.backgroundColor = '#F8F9FA';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
    }
  }, []);

  return (
    <SafeAreaProvider>
      <UserProvider>
        <RealTimePriceProvider>
          <USStockRealTimePriceProvider>
            <ChartTypeProvider>
              <View style={[styles.appContainer, isWideScreen && styles.wideScreenContainer]}>
                <NavigationContainer 
                  linking={Platform.OS === 'web' ? linking : undefined}
                  onStateChange={(state) => {
                    if (Platform.OS === 'web' && state) {
                      console.log('🔄 Navigation state changed:', state);
                    }
                  }}
                  onReady={() => {
                    if (Platform.OS === 'web') {
                      console.log('✅ Navigation ready for web routing');
                    }
                  }}
                >
                  <StatusBar barStyle="light-content" />
                  <AppNavigator />
                </NavigationContainer>
              </View>
            </ChartTypeProvider>
          </USStockRealTimePriceProvider>
        </RealTimePriceProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      maxWidth: 1200, // 设置最大宽度为1200px，这是一个适合桌面端的合理宽度
      width: '100%',
      alignSelf: 'center', // 水平居中
      marginHorizontal: 'auto', // Web端水平居中
      backgroundColor: '#FFFFFF', // 确保背景是白色
    }),
  },
  wideScreenContainer: {
    // 只在宽屏时应用的样式
    borderWidth: 2,
    borderColor: '#E5E7EB', // 浅灰色边框
    borderRadius: 16, // 圆角
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    marginTop: 24, // 顶部留出一些空间
    marginBottom: 24, // 底部留出一些空间
    marginHorizontal: 20, // 左右留出空间
    overflow: 'hidden', // 确保内容不会超出圆角
    // 添加渐变边框效果（通过多重阴影模拟）
    ...(Platform.OS === 'web' && {
      boxShadow: `
        0 0 0 1px rgba(59, 130, 246, 0.1),
        0 8px 32px rgba(0, 0, 0, 0.12),
        0 2px 8px rgba(0, 0, 0, 0.08)
      `,
    }),
  },
});

export default App;