import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DJIService, { DJIData } from '../../services/data/DJIService';

interface DJIWidgetProps {
  style?: any;
  onPress?: () => void;
  title?: string;
}

const DJIWidget: React.FC<DJIWidgetProps> = ({ style, onPress, title = '道琼斯' }) => {
  const navigation = useNavigation();
  const [data, setData] = useState<DJIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const current = await DJIService.getCurrentDJI();
      setData(current); if (!current) setError('暂无数据');
    } catch (e) {
      console.error('📈 DJIWidget: fetch error', e);
      setError('加载失败');
    } finally { setLoading(false); }
  };

  const handlePress = () => {
    if (onPress) return onPress();
    // @ts-ignore
    navigation.navigate('DJIDetail');
  };

  const renderContent = () => {
    if (loading) return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
    if (error || !data) return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={20} color="#FF3B30" />
        <Text style={styles.errorText}>{error || '数据异常'}</Text>
      </View>
    );
    const valueNum = DJIService.parseValue(data.dji);
    const formatted = DJIService.formatValue(valueNum);
    return (
      <View style={styles.contentContainer}>
        <View style={styles.dataDisplay}>
          <Text style={styles.mainValue}>{formatted}</Text>
          <Text style={styles.valueLabel}>指数</Text>
        </View>
      </View>
    );
  };

  return (
    <TouchableOpacity style={[styles.container, style]} onPress={handlePress} activeOpacity={0.7}>
      <Text style={styles.title}>{title}</Text>
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 12, minHeight: 120, backgroundColor: '#FFFFFF', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  title: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', textAlign: 'center', marginBottom: 12 },
  contentContainer: { flex: 1, justifyContent: 'center' },
  dataDisplay: { alignItems: 'center' },
  mainValue: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  valueLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '500' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: '#6C757D', marginTop: 8 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 12, color: '#FF3B30', textAlign: 'center', marginTop: 4 },
});

export default DJIWidget;
