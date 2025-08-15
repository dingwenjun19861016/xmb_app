import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

// Import all screens
import HomeScreen from '../screens/Home/HomeScreen';
import MarketScreen from '../screens/Market/MarketScreen';
import USStockDetailScreen from '../screens/Market/USStockDetailScreen';
import ArticleDetailScreen from '../screens/Articles/ArticleDetailScreen';
import ArticleScreen from '../screens/Articles/ArticleScreen';
import DataScreen from '../screens/Data/DataScreen';
import DataDetailScreen from '../screens/Data/DataDetailScreen';
import GreedyIndexDetail from '../screens/Data/GreedyIndexDetail';
import BTCDIndexDetail from '../screens/Data/BTCDIndexDetail';
import ETHDIndexDetail from '../screens/Data/ETHDIndexDetail';
import AltcoinIndexDetail from '../screens/Data/AltcoinIndexDetail';
import ETFDataDetail from '../screens/Data/ETFDataDetail';
import MarketCapDetail from '../screens/Data/MarketCapDetail';
import StablecoinDetail from '../screens/Data/StablecoinDetail';
import DXYDetail from '../screens/Data/DXYDetail';
import USBond10YRDetail from '../screens/Data/USBond10YRDetail';
import USDJPYDetail from '../screens/Data/USDJPYDetail';
import UserStatusScreen from '../screens/Profile/UserStatusScreen';
import UserProfileScreen from '../screens/Profile/UserProfileScreen';
import TermsOfServiceScreen from '../screens/Profile/TermsOfServiceScreen';
import AboutUsScreen from '../screens/Profile/AboutUsScreen';

// Create navigators
const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const MarketStack = createStackNavigator();
const ArticlesStack = createStackNavigator();
const DataStack = createStackNavigator();

// Home stack navigator
const HomeStackNavigator = React.forwardRef((props, ref) => {
  return (
    <HomeStack.Navigator 
      ref={ref}
      screenOptions={{ headerShown: false }}
      initialRouteName="HomeMain"
    >
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="CoinDetail" component={USStockDetailScreen} />
      {/* 允许从首页内栈直接打开文章详情，返回可回到股票详情 */}
      <HomeStack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
      <HomeStack.Screen name="Data" component={DataScreen} />
      <HomeStack.Screen name="DataDetail" component={DataDetailScreen} />
      <HomeStack.Screen name="GreedyIndexDetail" component={GreedyIndexDetail} />
      <HomeStack.Screen name="BTCDIndexDetail" component={BTCDIndexDetail} />
      <HomeStack.Screen name="ETHDIndexDetail" component={ETHDIndexDetail} />
      <HomeStack.Screen name="AltcoinIndexDetail" component={AltcoinIndexDetail} />
      <HomeStack.Screen name="ETFDataDetail" component={ETFDataDetail} />
      <HomeStack.Screen name="MarketCapDetail" component={MarketCapDetail} />
      <HomeStack.Screen name="StablecoinDetail" component={StablecoinDetail} />
      <HomeStack.Screen name="DXYDetail" component={DXYDetail} />
      <HomeStack.Screen name="USBond10YRDetail" component={USBond10YRDetail} />
      <HomeStack.Screen name="USDJPYDetail" component={USDJPYDetail} />
      <HomeStack.Screen name="UserStatus" component={UserStatusScreen} />
      <HomeStack.Screen name="UserProfile" component={UserProfileScreen} />
      <HomeStack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <HomeStack.Screen name="AboutUs" component={AboutUsScreen} />
    </HomeStack.Navigator>
  );
});

// Market stack navigator
const MarketStackNavigator = () => {
  return (
    <MarketStack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName="MarketMain"
    >
      <MarketStack.Screen 
        name="MarketMain" 
        component={MarketScreen}
        options={{
          // Web端路由配置
          ...(Platform.OS === 'web' && {
            title: '行情'
          })
        }}
      />
      <MarketStack.Screen 
        name="CoinDetail" 
        component={USStockDetailScreen}
        options={{
          // Web端路由配置
          ...(Platform.OS === 'web' && {
            title: '币种详情'
          })
        }}
      />
      {/* 允许在行情内栈直接打开文章详情，返回可回到股票详情 */}
      <MarketStack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
      <MarketStack.Screen name="UserStatus" component={UserStatusScreen} />
      <MarketStack.Screen name="UserProfile" component={UserProfileScreen} />
      <MarketStack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <MarketStack.Screen name="AboutUs" component={AboutUsScreen} />
    </MarketStack.Navigator>
  );
};

// Articles stack navigator
const ArticlesStackNavigator = () => {
  return (
    <ArticlesStack.Navigator screenOptions={{ headerShown: false }}>
      <ArticlesStack.Screen name="ArticlesMain" component={ArticleScreen} />
      <ArticlesStack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
      <ArticlesStack.Screen name="UserStatus" component={UserStatusScreen} />
      <ArticlesStack.Screen name="UserProfile" component={UserProfileScreen} />
      <ArticlesStack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <ArticlesStack.Screen name="AboutUs" component={AboutUsScreen} />
    </ArticlesStack.Navigator>
  );
};

// Data stack navigator
const DataStackNavigator = () => {
  return (
    <DataStack.Navigator screenOptions={{ headerShown: false }}>
      <DataStack.Screen name="DataMain" component={DataScreen} />
      <DataStack.Screen name="DataDetail" component={DataDetailScreen} />
      <DataStack.Screen name="GreedyIndexDetail" component={GreedyIndexDetail} />
      <DataStack.Screen name="BTCDIndexDetail" component={BTCDIndexDetail} />
      <DataStack.Screen name="ETHDIndexDetail" component={ETHDIndexDetail} />
      <DataStack.Screen name="AltcoinIndexDetail" component={AltcoinIndexDetail} />
      <DataStack.Screen name="ETFDataDetail" component={ETFDataDetail} />
      <DataStack.Screen name="MarketCapDetail" component={MarketCapDetail} />
      <DataStack.Screen name="StablecoinDetail" component={StablecoinDetail} />
      <DataStack.Screen name="DXYDetail" component={DXYDetail} />
      <DataStack.Screen name="USBond10YRDetail" component={USBond10YRDetail} />
      <DataStack.Screen name="USDJPYDetail" component={USDJPYDetail} />
      <DataStack.Screen name="UserStatus" component={UserStatusScreen} />
      <DataStack.Screen name="UserProfile" component={UserProfileScreen} />
      <DataStack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <DataStack.Screen name="AboutUs" component={AboutUsScreen} />
    </DataStack.Navigator>
  );
};

// Main tab navigator
const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Market') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Articles') {
            iconName = focused ? 'newspaper' : 'newspaper-outline';
          } else if (route.name === 'Data') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: 5,
          height: 60
        },
        tabBarLabelStyle: {
          fontSize: 12,
          paddingBottom: 5
        }
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStackNavigator}
        options={{ tabBarLabel: '首页' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            console.log('🏠 AppNavigator: Home tab pressed, attempting to reset');
            // 不阻止默认行为，让系统正常处理
            // e.preventDefault();
            
            // 等待一帧后再处理
            requestAnimationFrame(() => {
              try {
                // 尝试跳转到HomeMain
                navigation.navigate('Home', { 
                  screen: 'HomeMain',
                  params: { forceReset: true }
                });
                console.log('🏠 AppNavigator: Navigation to HomeMain completed');
              } catch (error) {
                console.error('🏠 AppNavigator: Navigation failed:', error);
              }
            });
          },
        })}
      />
      <Tab.Screen 
        name="Market" 
        component={MarketStackNavigator}
        options={{ tabBarLabel: '行情' }}
      />
      <Tab.Screen 
        name="Articles" 
        component={ArticlesStackNavigator}
        options={{ tabBarLabel: '快讯' }}
      />
      <Tab.Screen 
        name="Data" 
        component={DataStackNavigator}
        options={{ tabBarLabel: '数据' }}
      />
    </Tab.Navigator>
  );
};

export default AppNavigator;