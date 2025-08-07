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
import { greedyIndexService, GreedyIndexService, GreedyIndexData } from '../../services/data';
import GreedyIndexChart from '../../components/charts/GreedyIndexChart';

const { width } = Dimensions.get('window');

const GreedyIndexDetail = () => {
  const navigation = useNavigation();
  const [greedyData, setGreedyData] = useState<GreedyIndexData | null>(null);
  const [historicalData, setHistoricalData] = useState<GreedyIndexData[]>([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('30天');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchGreedyIndexData();
  }, [selectedTimePeriod]); // 当时间周期改变时重新获取数据

  const fetchGreedyIndexData = async () => {
    try {
      setError(null);
      
      // 并行获取当前数据和历史数据
      const limit = selectedTimePeriod === '30天' ? 30 : selectedTimePeriod === '60天' ? 60 : 90;
      
      const [currentData, historyData] = await Promise.all([
        greedyIndexService.getGreedyIndex(),
        greedyIndexService.getGreedyIndexHistory(limit)
      ]);
      
      console.log('📊 GreedyIndexDetail: Current data:', currentData);
      console.log('📊 GreedyIndexDetail: History data:', historyData);
      console.log('📊 GreedyIndexDetail: History data length:', historyData?.length);
      
      setGreedyData(currentData);
      setHistoricalData(historyData || []);
      
      if (!currentData) {
        setError('无法获取贪婪指数数据');
      }
    } catch (err) {
      console.error('❌ GreedyIndexDetail: Error fetching data:', err);
      setError('数据加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchGreedyIndexData();
  }, []);

  const renderGreedyIndexGauge = () => {
    if (!greedyData) return null;

    const value = parseInt(greedyData.greedy, 10);
    const color = GreedyIndexService.getGreedyIndexColor(value);
    const level = greedyData.level;

    return (
      <View style={styles.gaugeContainer}>
        {/* 圆环指示器 */}
        <View style={styles.gaugeWrapper}>
          <View style={[styles.gaugeCircle, { borderColor: color }]}>
            <Text style={[styles.gaugeValue, { color }]}>{value}</Text>
          </View>
          <View style={styles.gaugeInfo}>
            <Text style={[styles.gaugeLevel, { color }]}>{level}</Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${value}%`, 
                      backgroundColor: color 
                    }
                  ]} 
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>0</Text>
                <Text style={styles.progressLabel}>恐慌</Text>
                <Text style={styles.progressLabel}>中性</Text>
                <Text style={styles.progressLabel}>贪婪</Text>
                <Text style={styles.progressLabel}>100</Text>
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
        贪婪与恐慌指数（Fear and Greed Index）是用来衡量市场情绪的一个指标，广泛用于股票市场和加密货币市场。
        这个指数通过分析市场中不同因素的变化，来评估市场当前是处于"贪婪"还是"恐慌"状态，数值范围在0到100之间：
      </Text>
      
      <View style={styles.levelList}>
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF3B30' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>0-24：极度恐慌</Text>
            <Text style={styles.levelDescription}>表明投资者普遍悲观，市场抛售严重</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF9500' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>25-49：恐慌</Text>
            <Text style={styles.levelDescription}>说明投资者情绪偏向谨慎，买入意愿较弱</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FFCC00' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>50：中性</Text>
            <Text style={styles.levelDescription}>表示市场情绪比较平衡，没有明显的贪婪或恐慌情绪</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#34C759' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>51-74：贪婪</Text>
            <Text style={styles.levelDescription}>表明市场情绪偏向积极，投资者风险偏好较高</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#007AFF' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>75-100：极度贪婪</Text>
            <Text style={styles.levelDescription}>说明市场情绪高涨，可能存在过度投资的风险</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderCompositionFactors = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>组成因素</Text>
      <Text style={styles.descriptionText}>
        在加密货币市场中，贪婪与恐慌指数通常由以下几个因素共同决定：
      </Text>
      
      <View style={styles.factorList}>
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>1</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>波动性</Text>
            <Text style={styles.factorDescription}>价格的涨跌幅度较大时，指数会偏向恐慌；较小则偏向贪婪</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>2</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>市场交易量和动能</Text>
            <Text style={styles.factorDescription}>较高的交易量或动能通常表明市场贪婪</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>3</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>社交媒体和舆论</Text>
            <Text style={styles.factorDescription}>活跃的社交讨论和正面新闻会推高贪婪指数，而负面新闻则提升恐慌指数</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>4</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>比特币的市场占比</Text>
            <Text style={styles.factorDescription}>比特币占比越高，说明市场趋于保守，反之则表明投资者更愿意进入山寨币市场</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>5</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>Google搜索趋势</Text>
            <Text style={styles.factorDescription}>更高的搜索量往往代表投资者兴趣上升，可能与贪婪指数相关</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderUsageGuide = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>如何使用贪婪与恐慌指数</Text>
      
      <View style={styles.usageList}>
        <View style={styles.usageItem}>
          <Ionicons name="trending-down" size={24} color="#FF3B30" style={styles.usageIcon} />
          <View style={styles.usageContent}>
            <Text style={styles.usageTitle}>市场低迷时（恐慌指数高）</Text>
            <Text style={styles.usageDescription}>一些投资者可能认为这是"抄底"的机会</Text>
          </View>
        </View>
        
        <View style={styles.usageItem}>
          <Ionicons name="trending-up" size={24} color="#FF9500" style={styles.usageIcon} />
          <View style={styles.usageContent}>
            <Text style={styles.usageTitle}>市场情绪过热时（贪婪指数高）</Text>
            <Text style={styles.usageDescription}>这可能是风险较高的信号，表明市场存在过度投机或泡沫</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.warningContainer}>
        <Ionicons name="warning" size={20} color="#FF9500" style={styles.warningIcon} />
        <Text style={styles.warningText}>
          贪婪恐慌指数不应单独作为投资决策依据，而应结合其他市场分析工具，以更全面地理解市场趋势和风险。
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>贪婪恐慌指数</Text>
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
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>贪婪恐慌指数</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchGreedyIndexData}>
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
        <Text style={styles.headerTitle}>贪婪恐慌指数</Text>
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
        {renderGreedyIndexGauge()}
        
        {/* 历史走势图 */}
        <GreedyIndexChart 
          historicalData={historicalData}
          selectedTimePeriod={selectedTimePeriod}
          onTimePeriodChange={setSelectedTimePeriod}
        />
        
        {/* 指数说明 */}
        {renderLevelExplanation()}
        
        {/* 组成因素 */}
        {renderCompositionFactors()}
        
        {/* 使用指南 */}
        {renderUsageGuide()}
        
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
    fontSize: 36,
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

export default GreedyIndexDetail;
