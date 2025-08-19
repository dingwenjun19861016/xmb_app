import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SP500Service, SP500Data } from '../../services/data';
import { marketWidgetStyles, MarketWidgetColors, getValueFontSize } from './MarketWidgetStyles';

interface SP500WidgetProps {
  style?: any;
  onPress?: () => void;
  title?: string;
}

const SP500Widget: React.FC<SP500WidgetProps> = ({ style, onPress, title = '标普500' }) => {
  const navigation = useNavigation();
  const [data, setData] = useState<SP500Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const current = await SP500Service.getCurrentSP500();
      setData(current);
      if (!current) setError('暂无数据');
    } catch (e) {
      console.error('📈 SP500Widget: fetch error', e);
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    if (onPress) return onPress();
    // @ts-ignore
    navigation.navigate('SP500Detail');
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

    if (error || !data) {
      return (
        <View style={marketWidgetStyles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={16} color={MarketWidgetColors.errorColor} />
          <Text style={marketWidgetStyles.errorText}>{error || '数据异常'}</Text>
        </View>
      );
    }

    const valueNum = SP500Service.parseValue(data.inx);
    const formattedValue = SP500Service.formatValue(valueNum);
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
    <TouchableOpacity style={[marketWidgetStyles.container, style]} onPress={handlePress} activeOpacity={0.7}>
      <Text style={marketWidgetStyles.title}>{title}</Text>
      {renderContent()}
    </TouchableOpacity>
  );
};

export default SP500Widget;
