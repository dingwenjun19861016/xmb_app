import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { stablecoinService, StablecoinService, StablecoinData } from '../../services/data';

interface StablecoinWidgetProps {
  style?: any;
  onPress?: () => void;
  title?: string;
}

const StablecoinWidget: React.FC<StablecoinWidgetProps> = ({ style, onPress, title = '稳定币市值' }) => {
  const navigation = useNavigation();
  const [stablecoinData, setStablecoinData] = useState<StablecoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStablecoinData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await stablecoinService.getStablecoinData();
        setStablecoinData(data);
        
        if (!data) {
          setError('无法获取稳定币数据');
        }
      } catch (err) {
        console.error('StablecoinWidget: Error fetching stablecoin data:', err);
        setError('获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchStablecoinData();
    
    // 设置定时刷新，每5分钟刷新一次
    const interval = setInterval(fetchStablecoinData, 5 * 60 * 1000);
    
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

    if (error || !stablecoinData) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error || '无法获取稳定币数据'}</Text>
        </View>
      );
    }

    const formattedMCap = StablecoinService.formatStablecoin(stablecoinData.mcap);
    const level = StablecoinService.getStablecoinLevel(stablecoinData.mcap);
    const levelColor = StablecoinService.getStablecoinLevelColor(stablecoinData.mcap);

    return (
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        
        <View style={styles.valueContainer}>
          <Text style={[styles.value, { color: levelColor }]}>{formattedMCap}</Text>
          <Text style={[styles.levelText, { color: levelColor }]}>{level}</Text>
          {stablecoinData.date && (
            <Text style={styles.dateText}>{stablecoinData.date}</Text>
          )}
        </View>
      </View>
    );
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('StablecoinDetail');
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  
  valueContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  value: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  
  levelText: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 2,
    fontWeight: '600',
  },
  
  dateText: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '500',
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

export default StablecoinWidget;
