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
import { btcdService, BTCDService, BTCDIndexData } from '../../services/data';
import BTCDIndexChart from '../../components/charts/BTCDIndexChart';

const { width } = Dimensions.get('window');

const BTCDIndexDetail = () => {
  const navigation = useNavigation();
  const [btcdData, setBtcdData] = useState<BTCDIndexData | null>(null);
  const [historicalData, setHistoricalData] = useState<BTCDIndexData[]>([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('7天');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBTCDData();
  }, [selectedTimePeriod]); // 当时间周期改变时重新获取数据

  const fetchBTCDData = async () => {
    try {
      setError(null);
      
      // 并行获取当前数据和历史数据
      const limit = selectedTimePeriod === '7天' ? 7 : selectedTimePeriod === '30天' ? 30 : 90;
      
      const [currentData, historyData] = await Promise.all([
        btcdService.getBTCDIndex(),
        btcdService.getBTCDIndexHistory(limit)
      ]);
      
      console.log('📊 BTCDIndexDetail: Current data:', currentData);
      console.log('📊 BTCDIndexDetail: History data:', historyData);
      console.log('📊 BTCDIndexDetail: History data length:', historyData?.length);
      
      setBtcdData(currentData);
      setHistoricalData(historyData || []);
      
      if (!currentData) {
        setError('无法获取BTC.D指数数据');
      }
    } catch (err) {
      console.error('❌ BTCDIndexDetail: Error fetching data:', err);
      setError('数据加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchBTCDData();
  }, [selectedTimePeriod]);

  const renderBTCDGauge = () => {
    if (!btcdData) return null;

    const value = parseFloat(btcdData.btcd);
    const color = BTCDService.getBTCDIndexColor(value);

    // 将30%-80%的范围映射到0%-100%的进度条
    const normalizedValue = Math.max(0, Math.min(100, ((value - 30) / (80 - 30)) * 100));

    return (
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeWrapper}>
          <View style={[styles.gaugeCircle, { borderColor: color }]}>
            <Text style={[styles.gaugeValue, { color }]}>{value.toFixed(1)}%</Text>
          </View>
          <View style={styles.gaugeInfo}>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${normalizedValue}%`, 
                      backgroundColor: color 
                    }
                  ]} 
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>30%</Text>
                <Text style={styles.progressLabel}>42.5%</Text>
                <Text style={styles.progressLabel}>55%</Text>
                <Text style={styles.progressLabel}>67.5%</Text>
                <Text style={styles.progressLabel}>80%</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderIndexExplanation = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>指数说明</Text>
      <Text style={styles.descriptionText}>
        BTC.D（Bitcoin Dominance）指数表示比特币市值在整个加密货币市场中的占比。
        这是一个重要的市场情绪指标，用来衡量比特币相对于山寨币的强弱表现：
      </Text>
      
      <View style={styles.levelList}>
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF3B30' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>70%以上：比特币高度支配</Text>
            <Text style={styles.levelDescription}>市场资金主要集中在比特币，山寨币表现疲弱</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF9500' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>50%-70%：比特币中等支配</Text>
            <Text style={styles.levelDescription}>比特币占主导地位，但山寨币仍有一定表现空间</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FFCC00' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>40%-50%：市场相对平衡</Text>
            <Text style={styles.levelDescription}>比特币与山寨币之间相对平衡，市场分化不明显</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#34C759' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>40%以下：山寨币相对强势</Text>
            <Text style={styles.levelDescription}>山寨币表现强劲，资金开始从比特币流向山寨币</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderMarketAnalysis = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>市场分析</Text>
      <Text style={styles.descriptionText}>
        BTC.D指数的变化通常反映了市场周期和投资者情绪的变化：
      </Text>
      
      <View style={styles.factorList}>
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>1</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>熊市特征</Text>
            <Text style={styles.factorDescription}>BTC.D通常较高（60%+），投资者倾向于持有更"安全"的比特币</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>2</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>牛市早期</Text>
            <Text style={styles.factorDescription}>BTC.D开始下降，资金从比特币流向优质山寨币</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>3</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>牛市中后期</Text>
            <Text style={styles.factorDescription}>BTC.D显著下降（40%以下），山寨币季节（Alt Season）到来</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>4</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>市场转折</Text>
            <Text style={styles.factorDescription}>BTC.D快速反弹通常预示着山寨币泡沫破裂，资金回流比特币</Text>
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
            <Text style={styles.usageTitle}>BTC.D下降趋势</Text>
            <Text style={styles.usageDescription}>可能是配置优质山寨币的良好时机，但需要严格控制风险</Text>
          </View>
        </View>
        
        <View style={styles.usageItem}>
          <Ionicons name="trending-down" size={24} color="#FF3B30" style={styles.usageIcon} />
          <View style={styles.usageContent}>
            <Text style={styles.usageTitle}>BTC.D上升趋势</Text>
            <Text style={styles.usageDescription}>建议减少山寨币仓位，增加比特币配置或现金观望</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.warningContainer}>
        <Ionicons name="warning" size={20} color="#FF9500" style={styles.warningIcon} />
        <Text style={styles.warningText}>
          BTC.D指数仅供参考，不应单独作为投资决策依据。市场变化复杂，建议结合多种指标进行综合分析。
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
          <Text style={styles.headerTitle}>BTC.D指数</Text>
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
          <Text style={styles.headerTitle}>BTC.D指数</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBTCDData}>
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
        <Text style={styles.headerTitle}>BTC.D指数</Text>
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
        {renderBTCDGauge()}
        
        {/* 历史走势图 */}
        <BTCDIndexChart 
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
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  
  progressBarContainer: {
    width: '100%',
  },
  
  progressBar: {
    height: 14,
    backgroundColor: '#F1F1F6',
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  
  progressFill: {
    height: '100%',
    borderRadius: 7,
  },
  
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  
  progressLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
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
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
    shadowColor: '#007AFF',
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

export default BTCDIndexDetail;
