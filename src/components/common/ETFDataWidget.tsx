import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { etfService, ETFService, ETFData } from '../../services/data';
import { DateUtils } from '../../utils/dateUtils';

interface ETFDataWidgetProps {
  style?: any;
  onPress?: () => void;
  title?: string;
}

const ETFDataWidget: React.FC<ETFDataWidgetProps> = ({ style, onPress, title = 'ETF数据' }) => {
  const navigation = useNavigation();
  const [etfData, setEtfData] = useState<ETFData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchETFData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await etfService.getLatestETFData();
        setEtfData(data);
        
        if (!data) {
          setError('无法获取ETF数据');
        }
      } catch (err) {
        console.error('ETFDataWidget: Error fetching ETF data:', err);
        setError('获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchETFData();
    
    // 设置定时刷新，每5分钟刷新一次
    const interval = setInterval(fetchETFData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      );
    }

    if (error || !etfData) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error || '无法获取ETF数据'}</Text>
        </View>
      );
    }

    const formattedFlow = etfData.etf_mcap;
    const flowColor = ETFService.getChangeColorString(etfData.etf_mcap);
    
    // 使用全局日期格式化工具，支持设备时区自动转换
    const dateString = DateUtils.formatDate(etfData.etf_mcap_day);

    return (
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.chartIcon}>
            <Text style={styles.chartEmoji}>📊</Text>
          </View>
        </View>
        
        <View style={styles.dataContainer}>
          <Text style={styles.dataLabel}>日期</Text>
          <Text style={[styles.dataValue, { color: flowColor }]}>{formattedFlow}</Text>
          <Text style={styles.dateText}>{dateString}</Text>
        </View>
      </View>
    );
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('ETFDataDetail');
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  chartIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartEmoji: {
    fontSize: 18,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataItem: {
    flex: 1,
  },
  dataLabel: {
    fontSize: 11,
    color: '#6C757D',
    marginBottom: 2,
  },
  dataValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  dateText: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
  },
  status: {
    fontSize: 11,
    color: '#6C757D',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 8,
  },
  errorIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#DC3545',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default ETFDataWidget;
