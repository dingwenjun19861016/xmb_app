import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SP500Service, SP500Data } from '../../services/data';
import DXYChart from '../../components/charts/DXYChart';

const { width } = Dimensions.get('window');

const SP500Detail: React.FC = () => {
  const navigation = useNavigation();
  const [current, setCurrent] = useState<SP500Data | null>(null);
  const [history, setHistory] = useState<SP500Data[]>([]);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('30天');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedTimePeriod]);

  const fetchData = async () => {
    try {
      setError(null);
      const limit = selectedTimePeriod === '30天' ? 30 : selectedTimePeriod === '60天' ? 60 : 90;
      const [c, h] = await Promise.all([
        SP500Service.getCurrentSP500(),
        SP500Service.getHistoricalSP500(limit),
      ]);
      setCurrent(c);
      setHistory(h || []);
      if (!c) setError('无法获取标普500指数数据');
    } catch (e) {
      console.error('❌ SP500Detail: fetch error', e);
      setError('数据加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const renderDataCard = () => {
    if (!current) return null;
    const value = SP500Service.parseValue(current.inx);
    return (
      <View style={styles.dataCard}>
        <Text style={styles.dataTitle}>标普500指数</Text>
        <Text style={styles.dataValue}>{SP500Service.formatValue(value)}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>加载标普500指数...</Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>标普500指数</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchData}>
          <Ionicons name="refresh" size={22} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {renderDataCard()}

        {/* 使用同一图表组件，输入映射为 DXYData 结构 */}
        <DXYChart
          historicalData={history.map((h) => ({ date: h.date, dxy: h.inx, timestamp: h.timestamp }))}
          selectedTimePeriod={selectedTimePeriod}
          onTimePeriodChange={setSelectedTimePeriod}
        />

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>指数说明</Text>
          <Text style={styles.descriptionText}>
            标普500指数（S&P 500）追踪美国证券市场中规模最大、流动性最高的500家上市公司的表现，是衡量美国股市及宏观经济健康度的重要指标。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  refreshButton: { padding: 8, marginRight: -8 },
  scrollView: { flex: 1 },
  
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

  sectionContainer: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F0F0F5' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  descriptionText: { fontSize: 14, color: '#3A3A3C', lineHeight: 20 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8, color: '#6C757D' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  errorText: { marginTop: 8, color: '#FF3B30', textAlign: 'center' },
  retryButton: { marginTop: 12, backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  retryButtonText: { color: '#FFFFFF', fontWeight: '600' },
});

export default SP500Detail;
