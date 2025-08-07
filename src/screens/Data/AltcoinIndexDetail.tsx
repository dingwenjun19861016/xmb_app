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
import { altcoinIndexService, AltcoinIndexService, AltcoinIndexData } from '../../services/data';
import AltcoinIndexChart from '../../components/charts/AltcoinIndexChart';

const { width } = Dimensions.get('window');

const AltcoinIndexDetail = () => {
  const navigation = useNavigation();
  const [altcoinData, setAltcoinData] = useState<AltcoinIndexData | null>(null);
  const [historicalData, setHistoricalData] = useState<AltcoinIndexData[]>([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('30天');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAltcoinData();
  }, [selectedTimePeriod]); // 当时间周期改变时重新获取数据

  const fetchAltcoinData = async () => {
    try {
      setError(null);
      
      // 并行获取当前数据和历史数据
      const limit = selectedTimePeriod === '30天' ? 30 : selectedTimePeriod === '60天' ? 60 : 90;
      
      const [currentData, historyData] = await Promise.all([
        altcoinIndexService.getAltcoinIndex(),
        altcoinIndexService.getAltcoinIndexHistory(limit)
      ]);
      
      console.log('📊 AltcoinIndexDetail: Current data:', currentData);
      console.log('📊 AltcoinIndexDetail: History data:', historyData);
      console.log('📊 AltcoinIndexDetail: History data length:', historyData?.length);
      
      setAltcoinData(currentData);
      setHistoricalData(historyData || []);
      
      if (!currentData) {
        setError('无法获取山寨币指数数据');
      }
    } catch (err) {
      console.error('❌ AltcoinIndexDetail: Error fetching data:', err);
      setError('数据加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchAltcoinData();
  }, [selectedTimePeriod]);

  const renderAltcoinGauge = () => {
    if (!altcoinData) return null;

    const value = parseFloat(altcoinData.altcoinindex);
    const color = AltcoinIndexService.getAltcoinIndexColor(value);
    const description = AltcoinIndexService.getAltcoinIndexDescription(value);
    const sentiment = AltcoinIndexService.getMarketSentiment(value);

    return (
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeWrapper}>
          <View style={[styles.gaugeCircle, { borderColor: color }]}>
            <Text style={[styles.gaugeValue, { color }]}>{value.toFixed(0)}</Text>
          </View>
          <View style={styles.gaugeInfo}>
            <Text style={[styles.gaugeLevel, { color }]}>{description}</Text>
            <Text style={[styles.gaugeSentiment, { color }]}>市场情绪：{sentiment}</Text>
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
                <Text style={styles.progressLabel}>弱势</Text>
                <Text style={styles.progressLabel}>平衡</Text>
                <Text style={styles.progressLabel}>强势</Text>
                <Text style={styles.progressLabel}>100</Text>
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
        山寨币指数反映了除比特币以外的加密货币市场的整体表现和投资者情绪。
        该指数综合考虑市值、交易量、价格表现等多个维度，数值范围在0到100之间：
      </Text>
      
      <View style={styles.levelList}>
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#34C759' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>60以上：山寨币强势表现</Text>
            <Text style={styles.levelDescription}>山寨币市场活跃，资金大量流入，可能是"山寨币季节"</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FFCC00' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>40-60：市场相对平衡</Text>
            <Text style={styles.levelDescription}>山寨币与比特币表现相当，市场处于平衡状态</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF9500' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>20-40：山寨币相对弱势</Text>
            <Text style={styles.levelDescription}>山寨币表现不佳，投资者偏向保守策略</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF3B30' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>20以下：山寨币极度弱势</Text>
            <Text style={styles.levelDescription}>山寨币大幅下跌，市场恐慌情绪浓厚</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderMarketCycles = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>市场周期分析</Text>
      <Text style={styles.descriptionText}>
        山寨币指数的变化往往与加密货币市场周期密切相关：
      </Text>
      
      <View style={styles.factorList}>
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>1</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>熊市底部</Text>
            <Text style={styles.factorDescription}>山寨币指数通常在低位（20以下），投资者信心不足，资金外流</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>2</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>复苏阶段</Text>
            <Text style={styles.factorDescription}>指数开始回升（20-40），比特币先行，部分优质山寨币跟随</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>3</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>牛市中期</Text>
            <Text style={styles.factorDescription}>指数持续上升（40-60），资金开始从比特币流向山寨币</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>4</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>山寨币季节</Text>
            <Text style={styles.factorDescription}>指数达到高位（60+），山寨币大幅上涨，市场情绪高涨</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>5</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>泡沫破裂</Text>
            <Text style={styles.factorDescription}>指数急剧下降，山寨币价格崩盘，进入新的熊市周期</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderTradingStrategy = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>投资策略参考</Text>
      
      <View style={styles.usageList}>
        <View style={styles.usageItem}>
          <Ionicons name="trending-up" size={24} color="#34C759" style={styles.usageIcon} />
          <View style={styles.usageContent}>
            <Text style={styles.usageTitle}>指数上升趋势（40+）</Text>
            <Text style={styles.usageDescription}>可考虑适当配置优质山寨币，但需做好风险管理</Text>
          </View>
        </View>
        
        <View style={styles.usageItem}>
          <Ionicons name="trending-down" size={24} color="#FF3B30" style={styles.usageIcon} />
          <View style={styles.usageContent}>
            <Text style={styles.usageTitle}>指数下降趋势（40以下）</Text>
            <Text style={styles.usageDescription}>建议降低山寨币仓位，专注于比特币或稳定币</Text>
          </View>
        </View>
        
        <View style={styles.usageItem}>
          <Ionicons name="alert-circle" size={24} color="#FF9500" style={styles.usageIcon} />
          <View style={styles.usageContent}>
            <Text style={styles.usageTitle}>高位警惕（70+）</Text>
            <Text style={styles.usageDescription}>市场可能过热，注意获利了结和风险控制</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.warningContainer}>
        <Ionicons name="warning" size={20} color="#FF9500" style={styles.warningIcon} />
        <Text style={styles.warningText}>
          山寨币市场波动性极大，投资风险较高。本指数仅供参考，请根据自身风险承受能力做出投资决策。
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
          <Text style={styles.headerTitle}>山寨币指数</Text>
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
          <Text style={styles.headerTitle}>山寨币指数</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAltcoinData}>
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
        <Text style={styles.headerTitle}>山寨币指数</Text>
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
        {renderAltcoinGauge()}
        
        {/* 历史走势图 */}
        <AltcoinIndexChart 
          historicalData={historicalData}
          selectedTimePeriod={selectedTimePeriod}
          onTimePeriodChange={setSelectedTimePeriod}
        />
        
        {/* 指数说明 */}
        {renderIndexExplanation()}
        
        {/* 市场周期 */}
        {renderMarketCycles()}
        
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
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  
  gaugeSentiment: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
    opacity: 0.8,
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

export default AltcoinIndexDetail;
