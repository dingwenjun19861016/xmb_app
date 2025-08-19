import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { USBond10YRData, USBond10YRService } from '../../services/data';
import { marketWidgetStyles, MarketWidgetColors, getValueFontSize } from './MarketWidgetStyles';

interface USBond10YRWidgetProps {
  style?: any;
  onPress?: () => void;
  title?: string;
}

const USBond10YRWidget: React.FC<USBond10YRWidgetProps> = ({ style, onPress, title = '美债10年期' }) => {
  const [bondData, setBondData] = useState<USBond10YRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    fetchBondData();
  }, []);

  const fetchBondData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await USBond10YRService.getCurrentUSBond10YR();
      console.log('🏦 USBond10YRWidget: Fetched bond data:', data);
      setBondData(data);
      
      if (!data) {
        setError('暂无数据');
      }
    } catch (err) {
      console.error('🏦 USBond10YRWidget: Error fetching bond data:', err);
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
      navigation.navigate('USBond10YRDetail');
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

    if (error || !bondData) {
      return (
        <View style={marketWidgetStyles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={16} color={MarketWidgetColors.errorColor} />
          <Text style={marketWidgetStyles.errorText}>{error || '数据异常'}</Text>
        </View>
      );
    }

    const bondValue = USBond10YRService.parseUSBond10YRValue(bondData.us10yrbond);
    const formattedValue = `${bondValue.toFixed(2)}%`;
    const valueFontStyle = getValueFontSize(formattedValue);

    return (
      <View style={marketWidgetStyles.contentContainer}>
        <View style={marketWidgetStyles.dataDisplay}>
          <Text style={marketWidgetStyles[valueFontStyle]}>{formattedValue}</Text>
          <Text style={marketWidgetStyles.valueLabel}>收益率</Text>
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

export default USBond10YRWidget;
