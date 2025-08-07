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
import { USDJPYData, USDJPYService } from '../../services/data';
import USDJPYChart from '../../components/charts/USDJPYChart';

const { width } = Dimensions.get('window');

const USDJPYDetail = () => {
  const navigation = useNavigation();
  const [usdJpyData, setUsdJpyData] = useState<USDJPYData | null>(null);
  const [historicalData, setHistoricalData] = useState<USDJPYData[]>([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('30天');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUSDJPYData();
  }, [selectedTimePeriod]);

  const fetchUSDJPYData = async () => {
    try {
      setError(null);
      
      const limit = selectedTimePeriod === '30天' ? 30 : selectedTimePeriod === '60天' ? 60 : 90;
      
      const [currentData, historyData] = await Promise.all([
        USDJPYService.getCurrentUSDJPY(),
        USDJPYService.getHistoricalUSDJPY(limit)
      ]);
      
      console.log('💴 USDJPYDetail: Current data:', currentData);
      console.log('💴 USDJPYDetail: History data:', historyData);
      
      setUsdJpyData(currentData);
      setHistoricalData(historyData || []);
      
      if (!currentData) {
        setError('无法获取美元日元汇率数据');
      }
    } catch (err) {
      console.error('❌ USDJPYDetail: Error fetching data:', err);
      setError('数据加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchUSDJPYData();
  }, []);

  const renderUSDJPYGauge = () => {
    if (!usdJpyData) return null;

    const value = USDJPYService.parseUSDJPYValue(usdJpyData.usdjpy);
    const color = USDJPYService.getUSDJPYColor(value);
    const description = USDJPYService.getUSDJPYDescription(value);

    // 计算进度条百分比 (假设 USDJPY 范围 100-180)
    const progressPercentage = Math.min(Math.max((value - 100) / 80 * 100, 0), 100);

    return (
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeWrapper}>
          <View style={[styles.gaugeCircle, { borderColor: color }]}>
            <Text style={[styles.gaugeValue, { color }]}>{USDJPYService.formatUSDJPYValue(value)}</Text>
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
                <Text style={styles.progressLabel}>100</Text>
                <Text style={styles.progressLabel}>弱</Text>
                <Text style={styles.progressLabel}>正常</Text>
                <Text style={styles.progressLabel}>强</Text>
                <Text style={styles.progressLabel}>180</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderLevelExplanation = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>汇率说明</Text>
      <Text style={styles.descriptionText}>
        美元日元汇率（USD/JPY）表示1美元可以兑换多少日元。这是全球交易量最大的货币对之一，
        反映了美国和日本两大经济体的相对实力，对全球金融市场具有重要影响。
      </Text>
      
      <View style={styles.levelList}>
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF3B30' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>155+：极高</Text>
            <Text style={styles.levelDescription}>日元大幅贬值，美元极度强势，通常伴随央行干预风险</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF9500' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>150-155：偏高</Text>
            <Text style={styles.levelDescription}>日元显著贬值，美元相对强势，需关注政策动向</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#007AFF' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>140-150：正常</Text>
            <Text style={styles.levelDescription}>汇率处于正常波动区间，反映两国经济基本面平衡</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#34C759' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>130-140：偏低</Text>
            <Text style={styles.levelDescription}>日元相对强势，美元偏弱，可能受避险情绪影响</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#8E8E93' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>130以下：极低</Text>
            <Text style={styles.levelDescription}>日元大幅升值，通常在全球市场动荡时出现</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderInfluencingFactors = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>影响因素</Text>
      <Text style={styles.descriptionText}>
        美元日元汇率受多种因素影响，了解这些因素有助于更好地理解汇率走势：
      </Text>
      
      <View style={styles.factorList}>
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>1</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>货币政策</Text>
            <Text style={styles.factorDescription}>美联储和日本央行的利率政策是影响汇率的主要因素</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>2</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>经济数据</Text>
            <Text style={styles.factorDescription}>GDP、通胀、就业等数据反映两国经济健康状况</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>3</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>避险情绪</Text>
            <Text style={styles.factorDescription}>市场动荡时，日元作为避险货币通常会升值</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>4</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>贸易关系</Text>
            <Text style={styles.factorDescription}>美日贸易往来和双边关系影响汇率预期</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>5</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>央行干预</Text>
            <Text style={styles.factorDescription}>日本央行可能在汇率过度波动时进行市场干预</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderInvestmentStrategy = () => {
    if (!usdJpyData) return null;

    const value = USDJPYService.parseUSDJPYValue(usdJpyData.usdjpy);
    const trendAnalysis = USDJPYService.getTrendAnalysis(value);
    
    let strategyColor = '#007AFF';
    if (value >= 155) {
      strategyColor = '#FF3B30';
    } else if (value >= 150) {
      strategyColor = '#FF9500';
    } else if (value >= 140) {
      strategyColor = '#007AFF';
    } else {
      strategyColor = '#34C759';
    }

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>市场分析</Text>
        <View style={[styles.strategyCard, { borderLeftColor: strategyColor }]}>
          <Text style={styles.strategyText}>{trendAnalysis}</Text>
        </View>
        
        <View style={styles.strategiesList}>
          <Text style={styles.strategiesTitle}>交易策略建议：</Text>
          <Text style={styles.strategyItem}>• 关注美联储和日本央行政策会议</Text>
          <Text style={styles.strategyItem}>• 注意避险情绪对日元的影响</Text>
          <Text style={styles.strategyItem}>• 密切关注经济数据发布</Text>
          <Text style={styles.strategyItem}>• 警惕极端汇率水平的央行干预</Text>
          <Text style={styles.strategyItem}>• 结合技术分析确定入场时机</Text>
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
          <Text style={styles.loadingText}>加载美元日元汇率数据...</Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchUSDJPYData()}>
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
        <Text style={styles.headerTitle}>美元日元汇率</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => fetchUSDJPYData()}
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
        {/* USDJPY 汇率展示 */}
        {renderUSDJPYGauge()}

        {/* 历史数据图表 */}
        <USDJPYChart
          historicalData={historicalData}
          selectedTimePeriod={selectedTimePeriod}
          onTimePeriodChange={setSelectedTimePeriod}
        />

        {/* 汇率说明 */}
        {renderLevelExplanation()}

        {/* 影响因素 */}
        {renderInfluencingFactors()}

        {/* 市场分析 */}
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

export default USDJPYDetail;
