import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ethdService, ETHDService, ETHDIndexData } from '../../services/data';
import ETHDIndexChart from '../../components/charts/ETHDIndexChart';

const { width } = Dimensions.get('window');

const ETHDIndexDetail = () => {
  const navigation = useNavigation();
  const [ethdData, setEthdData] = useState<ETHDIndexData | null>(null);
  const [historicalData, setHistoricalData] = useState<ETHDIndexData[]>([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('7天');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchETHDData();
  }, [selectedTimePeriod]); // 当时间周期改变时重新获取数据

  const fetchETHDData = async () => {
    try {
      setError(null);
      
      // 并行获取当前数据和历史数据
      const limit = selectedTimePeriod === '7天' ? 7 : selectedTimePeriod === '30天' ? 30 : 90;
      
      const [currentData, historyData] = await Promise.all([
        ethdService.getETHDIndex(),
        ethdService.getETHDIndexHistory(limit)
      ]);
      
      console.log('📊 ETHDIndexDetail: Current data:', currentData);
      console.log('📊 ETHDIndexDetail: History data:', historyData);
      console.log('📊 ETHDIndexDetail: History data length:', historyData?.length);
      
      setEthdData(currentData);
      setHistoricalData(historyData || []);
      
      if (!currentData) {
        setError('无法获取ETH.D指数数据');
      }
    } catch (err) {
      console.error('❌ ETHDIndexDetail: Error fetching data:', err);
      setError('数据加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchETHDData();
  }, [selectedTimePeriod]);

  const renderETHDGauge = () => {
    if (!ethdData) return null;

    const value = parseFloat(ethdData.ethd);
    const color = ETHDService.getETHDIndexColor(value);
    const description = ETHDService.getETHDIndexDescription(value);

    return (
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeWrapper}>
          <View style={[styles.gaugeCircle, { borderColor: color }]}>
            <Text style={[styles.gaugeValue, { color }]}>{value.toFixed(1)}%</Text>
          </View>
          <View style={styles.gaugeInfo}>
            <Text style={[styles.gaugeLevel, { color }]}>{description}</Text>
            {ethdData.date && (
              <Text style={styles.dateText}>数据日期：{ethdData.date}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderIndexExplanation = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>指数说明</Text>
      <Text style={styles.descriptionText}>
        ETH.D（Ethereum Dominance）指数表示以太坊市值在整个加密货币市场中的占比。
        这是一个重要的市场情绪指标，用来衡量以太坊相对于其他代币的强弱表现：
      </Text>
      
      <View style={styles.levelList}>
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF3B30' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>25%以上：以太坊高度支配</Text>
            <Text style={styles.levelDescription}>市场资金主要集中在以太坊，其他代币表现疲弱</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF9500' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>15%-25%：以太坊中等支配</Text>
            <Text style={styles.levelDescription}>以太坊占主导地位，但其他代币仍有一定表现空间</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FFCC00' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>8%-15%：市场相对平衡</Text>
            <Text style={styles.levelDescription}>以太坊与其他代币之间相对平衡，市场分化不明显</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#34C759' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>8%以下：其他代币相对强势</Text>
            <Text style={styles.levelDescription}>其他代币表现强劲，资金开始从以太坊流向其他项目</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderMarketAnalysis = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>市场分析</Text>
      <Text style={styles.descriptionText}>
        ETH.D指数的变化通常反映了以太坊生态和其他区块链项目的相对强弱：
      </Text>
      
      <View style={styles.factorList}>
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>1</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>生态发展</Text>
            <Text style={styles.factorDescription}>ETH.D较高通常表明以太坊生态活跃，DeFi、NFT等应用蓬勃发展</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>2</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>技术升级</Text>
            <Text style={styles.factorDescription}>以太坊2.0、Layer2扩容等技术升级会影响市场对ETH的信心</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>3</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>竞争格局</Text>
            <Text style={styles.factorDescription}>其他公链（Solana、Avalanche等）的崛起会分流以太坊的市场份额</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>4</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>市场周期</Text>
            <Text style={styles.factorDescription}>在不同市场周期中，投资者对ETH和其他代币的偏好会发生变化</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderTradingStrategy = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>交易策略参考</Text>
      
      <View style={styles.usageList}>
        <View style={styles.usageItem}>
          <Ionicons name="trending-up" size={24} color="#34C759" style={styles.usageIcon} />
          <View style={styles.usageContent}>
            <Text style={styles.usageTitle}>ETH.D上升趋势</Text>
            <Text style={styles.usageDescription}>以太坊生态强势，可关注ETH及其生态代币的投资机会</Text>
          </View>
        </View>
        
        <View style={styles.usageItem}>
          <Ionicons name="trending-down" size={24} color="#FF3B30" style={styles.usageIcon} />
          <View style={styles.usageContent}>
            <Text style={styles.usageTitle}>ETH.D下降趋势</Text>
            <Text style={styles.usageDescription}>其他公链或代币表现强劲，可考虑多样化配置</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.warningContainer}>
        <Ionicons name="warning" size={20} color="#FF9500" style={styles.warningIcon} />
        <Text style={styles.warningText}>
          ETH.D指数仅供参考，不应单独作为投资决策依据。市场变化复杂，建议结合多种指标进行综合分析。
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ETH.D指数</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ETH.D指数</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchETHDData}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ETH.D指数</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 指数显示 */}
        {renderETHDGauge()}
        
        {/* 历史走势图 */}
        <ETHDIndexChart 
          historicalData={historicalData}
          selectedTimePeriod={selectedTimePeriod}
          onTimePeriodChange={setSelectedTimePeriod}
        />
        
        {/* 指数说明 */}
        {renderIndexExplanation()}
        
        {/* 市场分析 */}
        {renderMarketAnalysis()}
        
        {/* 交易策略 */}
        {renderTradingStrategy()}
        
        {/* 底部间距 */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  
  // Header 样式
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  
  backButton: {
    padding: 12,
    marginLeft: -12,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.8,
  },
  
  placeholder: {
    width: 48,
  },
  
  scrollView: {
    flex: 1,
  },
  
  // 指数显示样式
  gaugeContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 28,
    paddingVertical: 40,
    paddingHorizontal: 32,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  
  gaugeWrapper: {
    alignItems: 'center',
  },
  
  gaugeCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#FCFCFD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  
  gaugeValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  
  gaugeInfo: {
    alignItems: 'center',
    width: '100%',
  },
  
  gaugeLevel: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
  },

  dateText: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
    marginTop: 8,
  },
  
  // 分区样式
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 24,
    padding: 28,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  
  descriptionText: {
    fontSize: 16,
    color: '#4A4A4A',
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: '400',
  },
  
  // 级别列表样式
  levelList: {
    gap: 20,
  },
  
  levelItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  
  levelDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 6,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  
  levelContent: {
    flex: 1,
  },
  
  levelRange: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  
  levelDescription: {
    fontSize: 15,
    color: '#6C757D',
    lineHeight: 22,
    fontWeight: '400',
  },
  
  // 因素列表样式
  factorList: {
    gap: 24,
  },
  
  factorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  
  factorNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5856D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  
  factorNumberText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
  
  factorContent: {
    flex: 1,
  },
  
  factorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  
  factorDescription: {
    fontSize: 15,
    color: '#6C757D',
    lineHeight: 22,
    fontWeight: '400',
  },
  
  // 使用指南样式
  usageList: {
    gap: 20,
    marginBottom: 24,
  },
  
  usageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  
  usageIcon: {
    marginRight: 16,
    marginTop: 4,
  },
  
  usageContent: {
    flex: 1,
  },
  
  usageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  
  usageDescription: {
    fontSize: 15,
    color: '#6C757D',
    lineHeight: 22,
    fontWeight: '400',
  },
  
  // 警告容器样式
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  warningIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  
  warningText: {
    flex: 1,
    fontSize: 15,
    color: '#F57C00',
    lineHeight: 22,
    fontWeight: '500',
  },
  
  // 加载和错误状态样式
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  
  loadingText: {
    fontSize: 16,
    color: '#6C757D',
    marginTop: 16,
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginVertical: 16,
  },
  
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  bottomPadding: {
    height: 32,
  },
});

export default ETHDIndexDetail;
