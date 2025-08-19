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
import NasdaqService, { NasdaqData } from '../../services/data/NasdaqService';
import NasdaqChart from '../../components/charts/NasdaqChart';

const { width } = Dimensions.get('window');

const NasdaqDetail = () => {
  const navigation = useNavigation();
  const [nasdaqData, setNasdaqData] = useState<NasdaqData | null>(null);
  const [historicalData, setHistoricalData] = useState<NasdaqData[]>([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('30天');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNasdaqData();
  }, [selectedTimePeriod]);

  const fetchNasdaqData = async () => {
    try {
      setError(null);
      
      const limit = selectedTimePeriod === '30天' ? 30 : selectedTimePeriod === '60天' ? 60 : 90;
      
      const [currentData, historyData] = await Promise.all([
        NasdaqService.getCurrentNasdaq(),
        NasdaqService.getHistoricalNasdaq(limit)
      ]);
      
      console.log('📈 NasdaqDetail: Current data:', currentData);
      console.log('📈 NasdaqDetail: History data:', historyData);
      
      setNasdaqData(currentData);
      setHistoricalData(historyData || []);
      
      if (!currentData) {
        setError('无法获取纳斯达克指数数据');
      }
    } catch (err) {
      console.error('❌ NasdaqDetail: Error fetching data:', err);
      setError('数据加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchNasdaqData();
  }, []);

  const renderDataCard = () => {
    if (!nasdaqData) return null;

    const value = NasdaqService.parseNasdaqValue(nasdaqData.ixic);
    const description = NasdaqService.getNasdaqDescription(value);

    return (
      <View style={styles.dataCard}>
        <Text style={styles.dataTitle}>纳斯达克指数</Text>
        <Text style={styles.dataValue}>{NasdaqService.formatNasdaqValue(value)}</Text>
        <Text style={styles.dataLabel}>{description}</Text>
      </View>
    );
  };

  const renderLevelExplanation = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>指数说明</Text>
      <Text style={styles.descriptionText}>
        纳斯达克综合指数（IXIC）是以在纳斯达克证券市场上市的所有股票为基础计算的综合指数，反映纳斯达克市场整体表现。该指数以技术股为主，包含苹果、微软、谷歌等全球知名科技公司，是衡量科技股和成长股表现的重要指标。
      </Text>
      
      <View style={styles.levelList}>
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF3B30' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>20,000点以上</Text>
            <Text style={styles.levelDescription}>历史高位，市场情绪极度乐观</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF9500' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>15,000-20,000点</Text>
            <Text style={styles.levelDescription}>高位区间，市场相对活跃</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#007AFF' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>12,000-15,000点</Text>
            <Text style={styles.levelDescription}>正常区间，市场相对稳定</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#34C759' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>8,000-12,000点</Text>
            <Text style={styles.levelDescription}>偏低区间，可能存在投资机会</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#8E8E93' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>8,000点以下</Text>
            <Text style={styles.levelDescription}>低位区间，市场情绪偏悲观</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderCompositionFactors = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>主要成分</Text>
      <Text style={styles.descriptionText}>
        纳斯达克综合指数包含在纳斯达克交易所上市的所有股票，以下是主要的权重股票：
      </Text>
      
      <View style={styles.factorList}>
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>AAPL</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>苹果公司 (Apple Inc.)</Text>
            <Text style={styles.factorDescription}>全球最大的科技公司之一，权重最高</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>MSFT</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>微软公司 (Microsoft Corp.)</Text>
            <Text style={styles.factorDescription}>全球领先的软件和云服务提供商</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>GOOGL</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>字母表公司 (Alphabet Inc.)</Text>
            <Text style={styles.factorDescription}>谷歌母公司，搜索和广告业务巨头</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>AMZN</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>亚马逊公司 (Amazon.com Inc.)</Text>
            <Text style={styles.factorDescription}>全球最大的电子商务和云服务公司</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>TSLA</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>特斯拉公司 (Tesla Inc.)</Text>
            <Text style={styles.factorDescription}>电动汽车和清洁能源领域的领导者</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>META</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>Meta平台公司 (Meta Platforms Inc.)</Text>
            <Text style={styles.factorDescription}>社交媒体和元宇宙技术公司</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderInvestmentStrategy = () => {
    if (!nasdaqData) return null;

    const value = NasdaqService.parseNasdaqValue(nasdaqData.ixic);
    
    let strategyContent = '';
    let strategyColor = '#007AFF';
    
    if (value >= 20000) {
      strategyContent = '纳斯达克指数处于历史高位，建议谨慎操作，关注高估值风险和潜在的市场调整。';
      strategyColor = '#FF3B30';
    } else if (value >= 15000) {
      strategyContent = '纳斯达克指数处于高位区间，科技股表现强劲，但需警惕估值过高风险。';
      strategyColor = '#FF9500';
    } else if (value >= 12000) {
      strategyContent = '纳斯达克指数处于正常区间，市场相对稳定，可关注优质成长股的投资机会。';
      strategyColor = '#007AFF';
    } else if (value >= 8000) {
      strategyContent = '纳斯达克指数偏低，科技股可能出现较好的投资机会，建议分批布局优质标的。';
      strategyColor = '#34C759';
    } else {
      strategyContent = '纳斯达克指数处于低位，历史上往往是投资科技股的好时机，建议积极关注。';
      strategyColor = '#34C759';
    }

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>投资策略</Text>
        <View style={[styles.strategyCard, { borderLeftColor: strategyColor }]}>
          <Text style={styles.strategyText}>{strategyContent}</Text>
        </View>
        
        <View style={styles.strategiesList}>
          <Text style={styles.strategiesTitle}>投资建议：</Text>
          <Text style={styles.strategyItem}>• 关注纳斯达克100 ETF或相关指数基金</Text>
          <Text style={styles.strategyItem}>• 重点关注大型科技股的财报和业绩表现</Text>
          <Text style={styles.strategyItem}>• 密切跟踪美联储货币政策对科技股的影响</Text>
          <Text style={styles.strategyItem}>• 结合技术分析判断趋势和支撑阻力位</Text>
          <Text style={styles.strategyItem}>• 注意分散投资，不要过度集中于科技股</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>加载纳斯达克指数数据...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchNasdaqData()}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>纳斯达克指数</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => fetchNasdaqData()}
        >
          <Ionicons name="refresh" size={22} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Nasdaq 指标展示 */}
        {renderDataCard()}

        {/* 历史数据图表 */}
        <NasdaqChart
          historicalData={historicalData}
          selectedTimePeriod={selectedTimePeriod}
          onTimePeriodChange={setSelectedTimePeriod}
        />

        {/* 指数说明 */}
        {renderLevelExplanation()}

        {/* 主要成分 */}
        {renderCompositionFactors()}

        {/* 投资策略 */}
        {renderInvestmentStrategy()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  backButton: {
    padding: 8,
    marginLeft: -8,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },

  refreshButton: {
    padding: 8,
    marginRight: -8,
  },

  scrollView: {
    flex: 1,
  },

  // Data card styles
  dataCard: { 
    backgroundColor: '#FFFFFF', 
    marginHorizontal: 16, 
    marginTop: 16, 
    borderRadius: 16, 
    padding: 24, 
    alignItems: 'center',
    shadowColor: '#1976D2', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 4, 
    borderWidth: 1, 
    borderColor: '#E3F2FD' 
  },
  dataTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1976D2', 
    marginBottom: 12 
  },
  dataValue: { 
    fontSize: 36, 
    fontWeight: '800', 
    color: '#1A1A1A', 
    marginBottom: 4 
  },
  dataLabel: { 
    fontSize: 14, 
    color: '#8E8E93', 
    fontWeight: '500' 
  },

  // Sections
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },

  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4A4A4A',
    marginBottom: 16,
  },

  // Level items
  levelList: {
    gap: 12,
  },

  levelItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  levelDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },

  levelContent: {
    flex: 1,
  },

  levelRange: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },

  levelDescription: {
    fontSize: 13,
    color: '#6C757D',
    lineHeight: 18,
  },

  // Factor items
  factorList: {
    gap: 16,
  },

  factorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  factorNumber: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
    minWidth: 50,
    alignItems: 'center',
  },

  factorNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },

  factorContent: {
    flex: 1,
  },

  factorTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },

  factorDescription: {
    fontSize: 13,
    color: '#6C757D',
    lineHeight: 18,
  },

  // Strategy section
  strategyCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 16,
  },

  strategyText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1A1A1A',
    fontWeight: '500',
  },

  strategiesList: {
    gap: 8,
  },

  strategiesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },

  strategyItem: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4A4A4A',
  },

  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C757D',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 32,
  },

  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },

  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NasdaqDetail;
