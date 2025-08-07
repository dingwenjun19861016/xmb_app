import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { USDJPYData, USDJPYService } from '../../services/data';

interface USDJPYWidgetProps {
  style?: any;
  onPress?: () => void;
  title?: string;
}

const USDJPYWidget: React.FC<USDJPYWidgetProps> = ({ style, onPress, title = '美元日元' }) => {
  const [usdJpyData, setUsdJpyData] = useState<USDJPYData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    fetchUSDJPYData();
  }, []);

  const fetchUSDJPYData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await USDJPYService.getCurrentUSDJPY();
      console.log('💴 USDJPYWidget: Fetched USDJPY data:', data);
      setUsdJpyData(data);
      
      if (!data) {
        setError('暂无数据');
      }
    } catch (err) {
      console.error('💴 USDJPYWidget: Error fetching USDJPY data:', err);
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // @ts-ignore
      navigation.navigate('USDJPYDetail');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      );
    }

    if (error || !usdJpyData) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color="#FF3B30" />
          <Text style={styles.errorText}>{error || '数据异常'}</Text>
        </View>
      );
    }

    const usdJpyValue = USDJPYService.parseUSDJPYValue(usdJpyData.usdjpy);
    const usdJpyColor = USDJPYService.getUSDJPYColor(usdJpyValue);
    const description = USDJPYService.getUSDJPYDescription(usdJpyValue);

    // 计算进度条百分比 (假设 USDJPY 范围 100-180)
    const progressPercentage = Math.min(Math.max((usdJpyValue - 100) / 80 * 100, 0), 100);

    return (
      <View style={styles.contentContainer}>
        <View style={styles.indexContainer}>
          <View style={[styles.indexCircle, { borderColor: usdJpyColor }]}>
            <Text style={[styles.indexValue, { color: usdJpyColor }]}>
              {USDJPYService.formatUSDJPYValue(usdJpyValue)}
            </Text>
          </View>
          <View style={styles.indexInfo}>
            <Text style={[styles.indexLevel, { color: usdJpyColor }]}>{description}</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${progressPercentage}%`, 
                    backgroundColor: usdJpyColor 
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>{title}</Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
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
    fontSize: 12,
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
  // Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 8,
  },
  // Error states
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default USDJPYWidget;
