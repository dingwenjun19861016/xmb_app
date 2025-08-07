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
import { marketCapService, MarketCapService, MarketCapData } from '../../services/data';
import MarketCapChart from '../../components/charts/MarketCapChart';

const { width } = Dimensions.get('window');

const MarketCapDetail = () => {
  const navigation = useNavigation();
  const [marketCapData, setMarketCapData] = useState<MarketCapData | null>(null);
  const [historicalData, setHistoricalData] = useState<MarketCapData[]>([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('7天');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMarketCapData();
  }, [selectedTimePeriod]); // 当时间周期改变时重新获取数据

  const fetchMarketCapData = async () => {
    try {
      setError(null);
      
      // 并行获取当前数据和历史数据
      const limit = selectedTimePeriod === '7天' ? 7 : selectedTimePeriod === '30天' ? 30 : 90;
      
      const [currentData, historyData] = await Promise.all([
        marketCapService.getMarketCapData(),
        marketCapService.getMarketCapHistory(limit)
      ]);
      
      console.log('📊 MarketCapDetail: Current data:', currentData);
      console.log('📊 MarketCapDetail: History data:', historyData);
      console.log('📊 MarketCapDetail: History data length:', historyData?.length);
      
      setMarketCapData(currentData);
      setHistoricalData(historyData || []);
      
      if (!currentData) {
        setError('无法获取总市值数据');
      }
    } catch (err) {
      console.error('❌ MarketCapDetail: Error fetching data:', err);
      setError('数据加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchMarketCapData();
  }, [selectedTimePeriod]);

  const renderMarketCapDisplay = () => {
    if (!marketCapData) return null;

    const formattedMCap = MarketCapService.formatMarketCap(marketCapData.mcap);
    const formattedVolume = MarketCapService.formatVolume(marketCapData.volume);

    return (
      <View style={styles.displayContainer}>
        <View style={styles.displayWrapper}>
          <View style={styles.displayCircle}>
            <Text style={styles.displayValue}>{formattedMCap}</Text>
          </View>
          <View style={styles.displayInfo}>
            <Text style={styles.displayLabel}>加密货币总市值</Text>
            <Text style={styles.volumeInfo}>24h交易量: {formattedVolume}</Text>
            {marketCapData.date && (
              <Text style={styles.dateText}>数据日期：{marketCapData.date}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderMarketAnalysis = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>市场分析</Text>
      <Text style={styles.descriptionText}>
        加密货币总市值是衡量整个加密货币市场规模的重要指标，反映了市场的整体健康状况和投资者信心：
      </Text>
      
      <View style={styles.factorList}>
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>1</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>市场周期判断</Text>
            <Text style={styles.factorDescription}>总市值的变化趋势可以帮助判断当前所处的市场周期阶段</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>2</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>资金流入流出</Text>
            <Text style={styles.factorDescription}>市值增长表明资金流入，市值下降可能意味着资金撤离</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>3</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>宏观经济影响</Text>
            <Text style={styles.factorDescription}>总市值受宏观经济环境、监管政策、机构采用等因素影响</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>4</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>技术创新驱动</Text>
            <Text style={styles.factorDescription}>区块链技术进步、新项目发布等技术因素推动市场发展</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderTradingStrategy = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>投资参考</Text>
      
      <View style={styles.usageList}>
        <View style={styles.usageItem}>
          <Ionicons name="trending-up" size={24} color="#34C759" style={styles.usageIcon} />
          <View style={styles.usageContent}>
            <Text style={styles.usageTitle}>市值上升趋势</Text>
            <Text style={styles.usageDescription}>通常表明市场处于上升通道，可考虑适当增加配置</Text>
          </View>
        </View>
        
        <View style={styles.usageItem}>
          <Ionicons name="trending-down" size={24} color="#FF3B30" style={styles.usageIcon} />
          <View style={styles.usageContent}>
            <Text style={styles.usageTitle}>市值下降趋势</Text>
            <Text style={styles.usageDescription}>可能表明市场调整，建议谨慎投资或等待更好时机</Text>
          </View>
        </View>
        
        <View style={styles.usageItem}>
          <Ionicons name="analytics" size={24} color="#007AFF" style={styles.usageIcon} />
          <View style={styles.usageContent}>
            <Text style={styles.usageTitle}>交易量分析</Text>
            <Text style={styles.usageDescription}>结合交易量数据，判断市值变化的可持续性</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.warningContainer}>
        <Ionicons name="warning" size={20} color="#FF9500" style={styles.warningIcon} />
        <Text style={styles.warningText}>
          总市值数据仅供参考，投资决策应综合考虑多种因素。加密货币市场波动较大，投资需谨慎。
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
          <Text style={styles.headerTitle}>总市值</Text>
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
          <Text style={styles.headerTitle}>总市值</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMarketCapData}>
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
        <Text style={styles.headerTitle}>总市值</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 市值显示 */}
        {renderMarketCapDisplay()}
        
        {/* 历史走势图 */}
        <MarketCapChart 
          historicalData={historicalData}
          selectedTimePeriod={selectedTimePeriod}
          onTimePeriodChange={setSelectedTimePeriod}
        />
        
        {/* 市场分析 */}
        {renderMarketAnalysis()}
        
        {/* 投资策略 */}
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
  
  // 显示容器样式
  displayContainer: {
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
  
  displayWrapper: {
    alignItems: 'center',
  },
  
  displayCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    borderColor: '#34C759',
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
  
  displayValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#34C759',
    letterSpacing: -1,
    textAlign: 'center',
  },
  
  displayInfo: {
    alignItems: 'center',
    width: '100%',
  },
  
  displayLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  
  volumeInfo: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
    marginBottom: 8,
  },
  
  dateText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
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
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
    shadowColor: '#34C759',
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

export default MarketCapDetail;
