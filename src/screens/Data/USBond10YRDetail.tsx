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
import { USBond10YRData, USBond10YRService } from '../../services/data';
import USBond10YRChart from '../../components/charts/USBond10YRChart';

const { width } = Dimensions.get('window');

const USBond10YRDetail = () => {
  const navigation = useNavigation();
  const [bondData, setBondData] = useState<USBond10YRData | null>(null);
  const [historicalData, setHistoricalData] = useState<USBond10YRData[]>([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('30天');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBondData();
  }, [selectedTimePeriod]);

  const fetchBondData = async () => {
    try {
      setError(null);
      
      const limit = selectedTimePeriod === '30天' ? 30 : selectedTimePeriod === '60天' ? 60 : 90;
      
      const [currentData, historyData] = await Promise.all([
        USBond10YRService.getCurrentUSBond10YR(),
        USBond10YRService.getHistoricalUSBond10YR(limit)
      ]);
      
      console.log('🏦 USBond10YRDetail: Current data:', currentData);
      console.log('🏦 USBond10YRDetail: History data:', historyData);
      
      setBondData(currentData);
      setHistoricalData(historyData || []);
      
      if (!currentData) {
        setError('无法获取美债10年期数据');
      }
    } catch (err) {
      console.error('❌ USBond10YRDetail: Error fetching data:', err);
      setError('数据加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchBondData();
  }, []);

  const renderBondGauge = () => {
    if (!bondData) return null;

    const value = USBond10YRService.parseUSBond10YRValue(bondData.us10yrbond);
    const color = USBond10YRService.getUSBond10YRColor(value);
    const description = USBond10YRService.getUSBond10YRDescription(value);

    // 计算进度条百分比 (假设收益率范围 0-6%)
    const progressPercentage = Math.min((value / 6) * 100, 100);

    return (
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeWrapper}>
          <View style={[styles.gaugeCircle, { borderColor: color }]}>
            <Text style={[styles.gaugeValue, { color }]}>{value.toFixed(3)}%</Text>
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
                <Text style={styles.progressLabel}>0%</Text>
                <Text style={styles.progressLabel}>低</Text>
                <Text style={styles.progressLabel}>中</Text>
                <Text style={styles.progressLabel}>高</Text>
                <Text style={styles.progressLabel}>6%</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderLevelExplanation = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>收益率说明</Text>
      <Text style={styles.descriptionText}>
        美国十年期国债收益率是衡量长期利率水平的重要指标，反映了市场对未来经济增长和通胀预期。该收益率对全球金融市场，包括股票、债券和股票市场都有重要影响。
      </Text>
      
      <View style={styles.levelList}>
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF3B30' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>5.0%+：极高</Text>
            <Text style={styles.levelDescription}>收益率极高，通常伴随高通胀或紧缩货币政策</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF9500' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>4.5-5.0%：高位</Text>
            <Text style={styles.levelDescription}>收益率处于高位，可能对利率敏感资产构成压力</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FFCC00' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>3.5-4.5%：偏高</Text>
            <Text style={styles.levelDescription}>收益率偏高，需关注对股市和风险资产的影响</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#007AFF' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>2.5-3.5%：中性</Text>
            <Text style={styles.levelDescription}>收益率处于中性区间，市场影响相对平衡</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#34C759' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>1.5-2.5%：偏低</Text>
            <Text style={styles.levelDescription}>收益率偏低，通常有利于风险资产表现</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#8E8E93' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>1.5%以下：极低</Text>
            <Text style={styles.levelDescription}>收益率极低，可能推动资金流向风险资产</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderInfluenceFactors = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>影响因素</Text>
      <Text style={styles.descriptionText}>
        美国十年期国债收益率受到多种宏观经济因素的影响，主要包括：
      </Text>
      
      <View style={styles.factorList}>
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>1</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>联邦基金利率</Text>
            <Text style={styles.factorDescription}>美联储的货币政策直接影响短期利率，进而影响长期债券收益率</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>2</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>通胀预期</Text>
            <Text style={styles.factorDescription}>通胀预期上升会推高债券收益率，以补偿投资者的购买力损失</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>3</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>经济增长预期</Text>
            <Text style={styles.factorDescription}>强劲的经济增长预期通常会推高债券收益率</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>4</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>市场风险偏好</Text>
            <Text style={styles.factorDescription}>避险情绪会推动资金流入债券，压低收益率</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>5</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>财政政策</Text>
            <Text style={styles.factorDescription}>政府债务发行量和财政赤字规模影响债券供需关系</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderInvestmentStrategy = () => {
    if (!bondData) return null;

    const value = USBond10YRService.parseUSBond10YRValue(bondData.us10yrbond);
    const advice = USBond10YRService.getInvestmentAdvice(value);
    const color = USBond10YRService.getUSBond10YRColor(value);

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>投资策略</Text>
        <View style={[styles.strategyCard, { borderLeftColor: color }]}>
          <Text style={styles.strategyText}>{advice}</Text>
        </View>
        
        <View style={styles.strategiesList}>
          <Text style={styles.strategiesTitle}>一般性建议：</Text>
          <Text style={styles.strategyItem}>• 收益率上升时，关注利率敏感行业的影响</Text>
          <Text style={styles.strategyItem}>• 收益率下降时，风险资产通常表现更好</Text>
          <Text style={styles.strategyItem}>• 密切关注美联储政策会议和经济数据</Text>
          <Text style={styles.strategyItem}>• 考虑债券收益率对股票的溢出效应</Text>
          <Text style={styles.strategyItem}>• 结合通胀数据进行综合分析判断</Text>
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
          <Text style={styles.loadingText}>加载美债10年期数据...</Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchBondData()}>
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
        <Text style={styles.headerTitle}>美债10年期</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => fetchBondData()}
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
        {/* 债券收益率展示 */}
        {renderBondGauge()}

        {/* 历史数据图表 */}
        <USBond10YRChart
          historicalData={historicalData}
          selectedTimePeriod={selectedTimePeriod}
          onTimePeriodChange={setSelectedTimePeriod}
        />

        {/* 收益率说明 */}
        {renderLevelExplanation()}

        {/* 影响因素 */}
        {renderInfluenceFactors()}

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
    fontSize: 16,
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
    minWidth: 32,
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

export default USBond10YRDetail;
