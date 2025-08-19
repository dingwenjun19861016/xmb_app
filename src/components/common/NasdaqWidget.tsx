import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import NasdaqService, { NasdaqData } from '../../services/data/NasdaqService';
import { marketWidgetStyles, MarketWidgetColors, getValueFontSize } from './MarketWidgetStyles';

interface NasdaqWidgetProps {
  style?: any;
  onPress?: () => void;
  title?: string;
}

const NasdaqWidget: React.FC<NasdaqWidgetProps> = ({ style, onPress, title = '纳斯达克' }) => {
  const [nasdaqData, setNasdaqData] = useState<NasdaqData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    fetchNasdaqData();
  }, []);

  const fetchNasdaqData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await NasdaqService.getCurrentNasdaq();
      console.log('📈 NasdaqWidget: Fetched Nasdaq data:', data);
      setNasdaqData(data);
      
      if (!data) {
        setError('暂无数据');
      }
    } catch (err) {
      console.error('📈 NasdaqWidget: Error fetching Nasdaq data:', err);
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
      navigation.navigate('NasdaqDetail');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={marketWidgetStyles.loadingContainer}>
          <ActivityIndicator size="small" color={MarketWidgetColors.loadingColor} />
          <Text style={marketWidgetStyles.loadingText}>加载中...</Text>
        </View>
      );
    }

    if (error || !nasdaqData) {
      return (
        <View style={marketWidgetStyles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={16} color={MarketWidgetColors.errorColor} />
          <Text style={marketWidgetStyles.errorText}>{error || '数据异常'}</Text>
        </View>
      );
    }

    const nasdaqValue = NasdaqService.parseNasdaqValue(nasdaqData.ixic);
    const formattedValue = NasdaqService.formatNasdaqValue(nasdaqValue);
    const valueFontStyle = getValueFontSize(formattedValue);

    return (
      <View style={marketWidgetStyles.contentContainer}>
        <View style={marketWidgetStyles.dataDisplay}>
          <Text style={marketWidgetStyles[valueFontStyle]}>{formattedValue}</Text>
          <Text style={marketWidgetStyles.valueLabel}>指数</Text>
        </View>
      </View>
    );
  };

  return (
    <TouchableOpacity 
      style={[marketWidgetStyles.container, style]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={marketWidgetStyles.title}>{title}</Text>
      {renderContent()}
    </TouchableOpacity>
  );
};

export default NasdaqWidget;
