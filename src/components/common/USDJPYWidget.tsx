import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { USDJPYData, USDJPYService } from '../../services/data';
import { marketWidgetStyles, MarketWidgetColors, getValueFontSize } from './MarketWidgetStyles';

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
        <View style={marketWidgetStyles.loadingContainer}>
          <ActivityIndicator size="small" color={MarketWidgetColors.loadingColor} />
          <Text style={marketWidgetStyles.loadingText}>加载中...</Text>
        </View>
      );
    }

    if (error || !usdJpyData) {
      return (
        <View style={marketWidgetStyles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color={MarketWidgetColors.errorColor} />
          <Text style={marketWidgetStyles.errorText}>{error || '数据异常'}</Text>
        </View>
      );
    }

    const usdJpyValue = USDJPYService.parseUSDJPYValue(usdJpyData.usdjpy);
    const formattedValue = USDJPYService.formatUSDJPYValue(usdJpyValue);

    return (
      <View style={marketWidgetStyles.contentContainer}>
        <View style={marketWidgetStyles.dataDisplay}>
          <Text style={marketWidgetStyles.mainValue}>{formattedValue}</Text>
          <Text style={marketWidgetStyles.valueLabel}>汇率</Text>
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

export default USDJPYWidget;
