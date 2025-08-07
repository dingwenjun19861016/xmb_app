import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { greedyIndexService, GreedyIndexService, GreedyIndexData } from '../../services/data';

interface GreedyIndexWidgetProps {
  onPress?: () => void;
  title?: string;
}

const GreedyIndexWidget: React.FC<GreedyIndexWidgetProps> = ({ onPress, title = '恐惧与贪婪指数' }) => {
  const navigation = useNavigation();
  const [greedyData, setGreedyData] = useState<GreedyIndexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGreedyIndex = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await greedyIndexService.getGreedyIndex();
        if (data) {
          setGreedyData(data);
          console.log('✅ GreedyIndexWidget: Data loaded:', data);
        } else {
          setError('无法获取贪婪指数数据');
        }
      } catch (err) {
        console.error('❌ GreedyIndexWidget: Error:', err);
        setError('加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchGreedyIndex();
    
    // 可选：设置定时刷新
    const interval = setInterval(fetchGreedyIndex, 5 * 60 * 1000); // 5分钟刷新一次
    
    return () => clearInterval(interval);
  }, []);

  // 获取颜色
  const getColor = () => {
    if (!greedyData?.greedy) return '#666';
    const value = parseInt(greedyData.greedy, 10);
    return GreedyIndexService.getGreedyIndexColor(value);
  };

  // 加载状态
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  // 错误状态
  if (error || !greedyData) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>加载失败</Text>
          <Text style={styles.errorSubText}>{error}</Text>
        </View>
      </View>
    );
  }

  const value = parseInt(greedyData.greedy, 10);
  const color = getColor();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('GreedyIndexDetail');
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.indexContainer}>
        <View style={[styles.indexCircle, { borderColor: color }]}>
          <Text style={[styles.indexValue, { color }]}>{greedyData.greedy}</Text>
        </View>
        <View style={styles.indexInfo}>
          <Text style={[styles.indexLevel, { color }]}>{greedyData.level}</Text>
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
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  indexContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indexCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  indexValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  indexInfo: {
    flex: 1,
  },
  indexLevel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F8F9FA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  description: {
    fontSize: 11,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 15,
  },
  // Loading states
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6C757D',
  },
  // Error states
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#DC3545',
    fontWeight: '600',
  },
  errorSubText: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default GreedyIndexWidget;
