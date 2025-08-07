import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { altcoinIndexService, AltcoinIndexService, AltcoinIndexData } from '../../services/data';

interface AltcoinIndexWidgetProps {
  style?: any;
  onPress?: () => void;
  title?: string;
}

const AltcoinIndexWidget: React.FC<AltcoinIndexWidgetProps> = ({ style, onPress, title = '山寨币指数' }) => {
  const navigation = useNavigation();
  const [altcoinData, setAltcoinData] = useState<AltcoinIndexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAltcoinIndex();
  }, []);

  const fetchAltcoinIndex = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await altcoinIndexService.getAltcoinIndex();
      setAltcoinData(data);
      
      if (!data) {
        setError('暂无数据');
      }
    } catch (err) {
      console.error('❌ AltcoinIndexWidget: Failed to fetch data:', err);
      setError('加载失败');
    } finally {
      setLoading(false);
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

    if (error || !altcoinData) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color="#FF3B30" />
          <Text style={styles.errorText}>{error || '数据异常'}</Text>
        </View>
      );
    }

    const value = parseFloat(altcoinData.altcoinindex);
    const color = AltcoinIndexService.getAltcoinIndexColor(value);

    return (
      <View style={styles.contentContainer}>
        <Text style={[styles.valueText, { color }]}>
          {value.toFixed(0)}
        </Text>
      </View>
    );
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('AltcoinIndexDetail');
    }
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
    alignItems: 'center',
  },
  valueText: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
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

export default AltcoinIndexWidget;
