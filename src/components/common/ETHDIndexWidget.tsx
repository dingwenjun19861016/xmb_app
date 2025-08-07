import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ethdService, ETHDService, ETHDIndexData } from '../../services/data';

interface ETHDIndexWidgetProps {
  style?: any;
  onPress?: () => void;
  title?: string;
}

const ETHDIndexWidget: React.FC<ETHDIndexWidgetProps> = ({ style, onPress, title = 'ETH.D指数' }) => {
  const navigation = useNavigation();
  const [ethdData, setEthdData] = useState<ETHDIndexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchETHDData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await ethdService.getETHDIndex();
        setEthdData(data);
        
        if (!data) {
          setError('无法获取ETHD指数数据');
        }
      } catch (err) {
        console.error('ETHDIndexWidget: Error fetching ETHD data:', err);
        setError('获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchETHDData();
    
    // 设置定时刷新，每5分钟刷新一次
    const interval = setInterval(fetchETHDData, 5 * 60 * 1000);
    
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

    if (error || !ethdData) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error || '无法获取ETHD指数数据'}</Text>
        </View>
      );
    }

    const ethdValue = parseFloat(ethdData.ethd);
    const color = ETHDService.getETHDIndexColor(ethdValue);

    return (
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        
        <View style={styles.valueContainer}>
          <Text style={[styles.value, { color }]}>
            {ethdValue.toFixed(2)}%
          </Text>
          {ethdData.date && (
            <Text style={styles.dateText}>{ethdData.date}</Text>
          )}
        </View>
      </View>
    );
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('ETHDIndexDetail');
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
    minHeight: 120,
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
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  valueContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  dateText: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  description: {
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

export default ETHDIndexWidget;
