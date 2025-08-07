import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { DXYData, DXYService } from '../../services/data';

interface DXYWidgetProps {
  style?: any;
  onPress?: () => void;
  title?: string;
}

const DXYWidget: React.FC<DXYWidgetProps> = ({ style, onPress, title = '美元指数' }) => {
  const [dxyData, setDXYData] = useState<DXYData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    fetchDXYData();
  }, []);

  const fetchDXYData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await DXYService.getCurrentDXY();
      console.log('🏛️ DXYWidget: Fetched DXY data:', data);
      setDXYData(data);
      
      if (!data) {
        setError('暂无数据');
      }
    } catch (err) {
      console.error('🏛️ DXYWidget: Error fetching DXY data:', err);
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
      navigation.navigate('DXYDetail');
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

    if (error || !dxyData) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color="#FF3B30" />
          <Text style={styles.errorText}>{error || '数据异常'}</Text>
        </View>
      );
    }

    const dxyValue = DXYService.parseDXYValue(dxyData.dxy);
    const dxyColor = DXYService.getDXYColor(dxyValue);
    const description = DXYService.getDXYDescription(dxyValue);

    return (
      <View style={styles.contentContainer}>
        <View style={styles.indexContainer}>
          <View style={[styles.indexCircle, { borderColor: dxyColor }]}>
            <Text style={[styles.indexValue, { color: dxyColor }]}>
              {DXYService.formatDXYValue(dxyValue)}
            </Text>
          </View>
          <View style={styles.indexInfo}>
            <Text style={[styles.indexLevel, { color: dxyColor }]}>{description}</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${Math.min((dxyValue - 80) / 40 * 100, 100)}%`, 
                    backgroundColor: dxyColor 
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
    fontSize: 14,
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

export default DXYWidget;
