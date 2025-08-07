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
import { DXYData, DXYService } from '../../services/data';
import DXYChart from '../../components/charts/DXYChart';

const { width } = Dimensions.get('window');

const DXYDetail = () => {
  const navigation = useNavigation();
  const [dxyData, setDXYData] = useState<DXYData | null>(null);
  const [historicalData, setHistoricalData] = useState<DXYData[]>([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('30天');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDXYData();
  }, [selectedTimePeriod]);

  const fetchDXYData = async () => {
    try {
      setError(null);
      
      const limit = selectedTimePeriod === '30天' ? 30 : selectedTimePeriod === '60天' ? 60 : 90;
      
      const [currentData, historyData] = await Promise.all([
        DXYService.getCurrentDXY(),
        DXYService.getHistoricalDXY(limit)
      ]);
      
      console.log('🏛️ DXYDetail: Current data:', currentData);
      console.log('🏛️ DXYDetail: History data:', historyData);
      
      setDXYData(currentData);
      setHistoricalData(historyData || []);
      
      if (!currentData) {
        setError('无法获取美元指数数据');
      }
    } catch (err) {
      console.error('❌ DXYDetail: Error fetching data:', err);
      setError('数据加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchDXYData();
  }, []);

  const renderDXYGauge = () => {
    if (!dxyData) return null;

    const value = DXYService.parseDXYValue(dxyData.dxy);
    const color = DXYService.getDXYColor(value);
    const description = DXYService.getDXYDescription(value);

    // 计算进度条百分比 (假设 DXY 范围 80-120)
    const progressPercentage = Math.min(Math.max((value - 80) / 40 * 100, 0), 100);

    return (
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeWrapper}>
          <View style={[styles.gaugeCircle, { borderColor: color }]}>
            <Text style={[styles.gaugeValue, { color }]}>{DXYService.formatDXYValue(value)}</Text>
          </View>
          <View style={styles.gaugeInfo}>
            <Text style={[styles.gaugeLevel, { color }]}>{description}</Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${progressPercentage}%`, 
                      backgroundColor: color 
                    }
                  ]} 
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>80</Text>
                <Text style={styles.progressLabel}>弱</Text>
                <Text style={styles.progressLabel}>中性</Text>
                <Text style={styles.progressLabel}>强</Text>
                <Text style={styles.progressLabel}>120</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderLevelExplanation = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>指数说明</Text>
      <Text style={styles.descriptionText}>
        美元指数（DXY）衡量美元相对于一篮子主要货币的强弱程度。该指数由美元对欧元、日元、英镑、加拿大元、瑞典克朗和瑞士法郎的汇率加权计算得出，是衡量美元整体强弱的重要指标。
      </Text>
      
      <View style={styles.levelList}>
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF3B30' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>105+：强势</Text>
            <Text style={styles.levelDescription}>美元处于强势地位，通常对风险资产构成压力</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF9500' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>100-105：偏强</Text>
            <Text style={styles.levelDescription}>美元相对强势，可能对加密货币市场形成阻力</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#007AFF' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>95-100：中性</Text>
            <Text style={styles.levelDescription}>美元强弱适中，对市场影响相对中性</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#34C759' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>90-95：偏弱</Text>
            <Text style={styles.levelDescription}>美元相对偏弱，通常有利于风险资产表现</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#8E8E93' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>90以下：弱势</Text>
            <Text style={styles.levelDescription}>美元处于弱势，历史上往往有利于加密货币上涨</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderCompositionFactors = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>组成因素</Text>
      <Text style={styles.descriptionText}>
        美元指数的计算基于美元对以下主要货币的汇率，各货币按其在国际贸易中的重要性分配权重：
      </Text>
      
      <View style={styles.factorList}>
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>57.6%</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>欧元 (EUR)</Text>
            <Text style={styles.factorDescription}>占据最大权重，是影响美元指数的主要因素</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>13.6%</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>日元 (JPY)</Text>
            <Text style={styles.factorDescription}>第二大权重，日本经济政策对指数影响显著</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>11.9%</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>英镑 (GBP)</Text>
            <Text style={styles.factorDescription}>英国经济状况和货币政策是重要影响因素</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>9.1%</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>加拿大元 (CAD)</Text>
            <Text style={styles.factorDescription}>商品价格和加拿大央行政策影响其走势</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>4.2%</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>瑞典克朗 (SEK)</Text>
            <Text style={styles.factorDescription}>北欧经济状况的代表性货币</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>3.6%</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>瑞士法郎 (CHF)</Text>
            <Text style={styles.factorDescription}>避险货币，在市场动荡时影响力增强</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderInvestmentStrategy = () => {
    if (!dxyData) return null;

    const value = DXYService.parseDXYValue(dxyData.dxy);
    
    let strategyContent = '';
    let strategyColor = '#007AFF';
    
    if (value >= 105) {
      strategyContent = '美元指数处于强势区间，建议降低风险资产配置，关注美联储政策变化对市场的影响。';
      strategyColor = '#FF3B30';
    } else if (value >= 100) {
      strategyContent = '美元指数偏强，可能对加密货币市场形成阻力，建议保持谨慎态度并关注技术面支撑。';
      strategyColor = '#FF9500';
    } else if (value >= 95) {
      strategyContent = '美元指数处于中性区间，建议关注其他基本面因素，如市场情绪和技术指标。';
      strategyColor = '#007AFF';
    } else if (value >= 90) {
      strategyContent = '美元指数偏弱，通常有利于风险资产表现，可适当关注加密货币投资机会。';
      strategyColor = '#34C759';
    } else {
      strategyContent = '美元指数处于弱势，历史上往往有利于加密货币等风险资产上涨，建议积极关注投资机会。';
      strategyColor = '#34C759';
    }

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>投资策略</Text>
        <View style={[styles.strategyCard, { borderLeftColor: strategyColor }]}>
          <Text style={styles.strategyText}>{strategyContent}</Text>
        </View>
        
        <View style={styles.strategiesList}>
          <Text style={styles.strategiesTitle}>一般性建议：</Text>
          <Text style={styles.strategyItem}>• 美元指数强势时，关注黄金、比特币等避险资产</Text>
          <Text style={styles.strategyItem}>• 美元指数弱势时，可增加对风险资产的配置</Text>
          <Text style={styles.strategyItem}>• 密切关注美联储货币政策会议和经济数据</Text>
          <Text style={styles.strategyItem}>• 结合技术分析和其他基本面指标进行决策</Text>
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
          <Text style={styles.loadingText}>加载美元指数数据...</Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchDXYData()}>
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
        <Text style={styles.headerTitle}>美元指数</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => fetchDXYData()}
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
        {/* DXY 指标展示 */}
        {renderDXYGauge()}

        {/* 历史数据图表 */}
        <DXYChart
          historicalData={historicalData}
          selectedTimePeriod={selectedTimePeriod}
          onTimePeriodChange={setSelectedTimePeriod}
        />

        {/* 指数说明 */}
        {renderLevelExplanation()}

        {/* 组成因素 */}
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

  // Gauge/Circle Display
  gaugeContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  gaugeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  gaugeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },

  gaugeValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  gaugeInfo: {
    flex: 1,
  },

  gaugeLevel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },

  progressBarContainer: {
    marginTop: 4,
  },

  progressBar: {
    height: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },

  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  progressLabel: {
    fontSize: 10,
    color: '#6C757D',
    fontWeight: '500',
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

export default DXYDetail;
