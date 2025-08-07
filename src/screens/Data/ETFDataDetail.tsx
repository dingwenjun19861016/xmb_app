import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { etfService, ETFService, ETFData, ETFFlowData } from '../../services/data';
import { DateUtils } from '../../utils/dateUtils';
import ETFFlowChart from '../../components/charts/ETFFlowChart';

const ETFDataDetail = () => {
  const navigation = useNavigation();
  const [etfData, setEtfData] = useState<ETFData | null>(null);
  const [flowData, setFlowData] = useState<ETFFlowData[] | null>(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('30天');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedTimePeriod]); // 当时间周期改变时重新获取数据

  const fetchData = async () => {
    try {
      setError(null);
      
      console.log('📊 ETFDataDetail: Starting to fetch all data...');
      
      // 根据选择的时间周期获取对应天数的数据
      const days = selectedTimePeriod === '30天' ? 30 : selectedTimePeriod === '60天' ? 60 : 90;
      
      // 并行获取所有需要的数据
      const [etfDataResult, flowDataResult] = await Promise.all([
        etfService.getLatestETFData(),
        etfService.getETFFlowData(days), // 根据选择的时间周期获取数据
      ]);
      
      console.log('📊 ETFDataDetail: Data fetching completed');
      console.log('📊 ETFDataDetail: ETF data:', etfDataResult);
      console.log('📊 ETFDataDetail: Flow data:', flowDataResult);
      
      setEtfData(etfDataResult);
      setFlowData(flowDataResult);
      
      if (!etfDataResult) {
        setError('无法获取ETF数据');
      }
    } catch (err) {
      console.error('❌ ETFDataDetail: Error fetching data:', err);
      setError('数据加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const renderETFOverview = () => {
    if (!etfData) return null;

    const marketCap = parseFloat(etfData.etf_mcap);
    const dayChange = parseFloat(etfData.etf_mcap_day);
    const changeColor = ETFService.getChangeColorString(etfData.etf_mcap_day);
    const marketStatus = ETFService.getMarketStatus(etfData.etf_mcap_day);
    const formattedMarketCap = ETFService.formatMarketCap(etfData.etf_mcap);
    const formattedChange = ETFService.formatChangeString(etfData.etf_mcap_day);
    
    // 使用全局日期格式化工具，支持设备时区自动转换
    const dateString = DateUtils.formatDate(etfData.etf_mcap_day);

    return (
      <View style={styles.overviewContainer}>
        <View style={styles.overviewWrapper}>
          <View style={styles.marketCapSection}>
            <Text style={styles.marketCapLabel}>ETF总市值</Text>
            <Text style={styles.marketCapValue}>{formattedMarketCap}</Text>
          </View>
          
          <View style={styles.changeSection}>
            <Text style={styles.changeLabel}>日期</Text>
            <Text style={[styles.changeValue, { color: '#007AFF' }]}>
              {dateString}
            </Text>
            <Text style={[styles.marketStatus, { color: '#007AFF' }]}>
              最近更新
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderETFExplanation = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>ETF简介</Text>
      <Text style={styles.descriptionText}>
        比特币ETF（Exchange-Traded Fund）是追踪比特币价格表现的投资基金，
        允许投资者通过传统股票市场投资比特币，无需直接购买和持有加密货币：
      </Text>
      
      <View style={styles.factorList}>
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>1</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>便捷投资</Text>
            <Text style={styles.factorDescription}>通过传统经纪账户即可投资比特币，无需加密钱包</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>2</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>监管保护</Text>
            <Text style={styles.factorDescription}>受传统金融监管机构监督，提供额外的投资者保护</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>3</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>机构准入</Text>
            <Text style={styles.factorDescription}>为机构投资者提供合规的比特币投资渠道</Text>
          </View>
        </View>
        
        <View style={styles.factorItem}>
          <View style={styles.factorNumber}>
            <Text style={styles.factorNumberText}>4</Text>
          </View>
          <View style={styles.factorContent}>
            <Text style={styles.factorTitle}>流动性</Text>
            <Text style={styles.factorDescription}>在股票交易所交易，提供良好的流动性</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderMarketImpact = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>市场影响</Text>
      <Text style={styles.descriptionText}>
        比特币ETF的推出对加密货币市场产生了深远影响：
      </Text>
      
      <View style={styles.levelList}>
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#34C759' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>主流化进程</Text>
            <Text style={styles.levelDescription}>推动比特币进入传统金融体系，提升市场认知度</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#007AFF' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>资金流入</Text>
            <Text style={styles.levelDescription}>为比特币市场带来大量机构和零售投资者资金</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FF9500' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>价格影响</Text>
            <Text style={styles.levelDescription}>ETF资金流动直接影响比特币供需关系和价格走势</Text>
          </View>
        </View>
        
        <View style={styles.levelItem}>
          <View style={[styles.levelDot, { backgroundColor: '#FFCC00' }]} />
          <View style={styles.levelContent}>
            <Text style={styles.levelRange}>市场稳定</Text>
            <Text style={styles.levelDescription}>机构参与有助于降低市场波动性，提高价格稳定性</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderInvestmentConsiderations = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>投资考虑因素</Text>
      
      <View style={styles.usageList}>
        <View style={styles.usageItem}>
          <Ionicons name="checkmark-circle" size={24} color="#34C759" style={styles.usageIcon} />
          <View style={styles.usageContent}>
            <Text style={styles.usageTitle}>优势</Text>
            <Text style={styles.usageDescription}>监管合规、操作便捷、机构级别的安全保障</Text>
          </View>
        </View>
        
        <View style={styles.usageItem}>
          <Ionicons name="alert-circle" size={24} color="#FF9500" style={styles.usageIcon} />
          <View style={styles.usageContent}>
            <Text style={styles.usageTitle}>成本</Text>
            <Text style={styles.usageDescription}>需要支付管理费用，通常为年化0.2%-1%</Text>
          </View>
        </View>
        
        <View style={styles.usageItem}>
          <Ionicons name="time" size={24} color="#007AFF" style={styles.usageIcon} />
          <View style={styles.usageContent}>
            <Text style={styles.usageTitle}>交易时间</Text>
            <Text style={styles.usageDescription}>仅在股市开盘时间交易，而比特币24/7交易</Text>
          </View>
        </View>
        
        <View style={styles.usageItem}>
          <Ionicons name="swap-horizontal" size={24} color="#6C757D" style={styles.usageIcon} />
          <View style={styles.usageContent}>
            <Text style={styles.usageTitle}>追踪误差</Text>
            <Text style={styles.usageDescription}>ETF价格可能与比特币实际价格存在小幅偏差</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.warningContainer}>
        <Ionicons name="warning" size={20} color="#FF9500" style={styles.warningIcon} />
        <Text style={styles.warningText}>
          ETF投资仍存在市场风险，比特币价格波动较大。投资前请充分了解产品特性，根据自身风险承受能力做出决策。
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
          <Text style={styles.headerTitle}>ETF数据</Text>
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
          <Text style={styles.headerTitle}>ETF数据</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 渲染ETF资金流入/流出图表
  const renderETFFlowChart = () => {
    console.log('📊 ETFDataDetail: Rendering ETF flow chart, flowData:', flowData);
    console.log('📊 ETFDataDetail: flowData length:', flowData?.length || 0);
    
    return (
      <ETFFlowChart 
        flowData={flowData || []} 
        title="ETF资金流入/流出"
        selectedTimePeriod={selectedTimePeriod}
        onTimePeriodChange={setSelectedTimePeriod}
      />
    );
  };

  // 渲染ETF市场份额图表
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
        <Text style={styles.headerTitle}>ETF数据</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ETF概览 */}
        {renderETFOverview()}
        
        {/* 图表区 */}
        <View style={styles.chartsContainer}>
          {/* ETF资金流入/流出图表 */}
          {renderETFFlowChart()}
        </View>
        
        {/* ETF简介 */}
        {renderETFExplanation()}
        
        {/* 市场影响 */}
        {renderMarketImpact()}
        
        {/* 投资考虑 */}
        {renderInvestmentConsiderations()}
        
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
    fontSize: 20,
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
  
  // ETF概览样式
  overviewContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 28,
    paddingVertical: 32,
    paddingHorizontal: 28,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  
  overviewWrapper: {
    alignItems: 'center',
  },
  
  marketCapSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  
  marketCapLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C757D',
    marginBottom: 8,
  },
  
  marketCapValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: -2,
  },
  
  changeSection: {
    alignItems: 'center',
  },
  
  changeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C757D',
    marginBottom: 8,
  },
  
  changeValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  
  marketStatus: {
    fontSize: 14,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  
  descriptionText: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  
  levelDescription: {
    fontSize: 13,
    color: '#6C757D',
    lineHeight: 18,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  
  factorDescription: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  
  usageDescription: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
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
    fontSize: 14,
    color: '#F57C00',
    lineHeight: 20,
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
  
  // 图表容器样式
  chartsContainer: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
});

export default ETFDataDetail;
