import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { DXYData, DXYService } from '../../services/data';
import { marketWidgetStyles, MarketWidgetColors, getValueFontSize } from './MarketWidgetStyles';

interface DXYWidgetProps {
  style?: any;
  onPress?: () => void;
  title?: string;
  themeColors?: {
    background?: string;
    titleColor?: string;
    valueColor?: string;
    labelColor?: string;
  };
  fontSizes?: {
    title?: number;
    value?: number;
    label?: number;
  };
}

const DXYWidget: React.FC<DXYWidgetProps> = ({ 
  style, 
  onPress, 
  title = '美元指数',
  themeColors,
  fontSizes 
}) => {
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
        <View style={marketWidgetStyles.loadingContainer}>
          <ActivityIndicator size="small" color={MarketWidgetColors.loadingColor} />
          <Text style={marketWidgetStyles.loadingText}>加载中...</Text>
        </View>
      );
    }

    if (error || !dxyData) {
      return (
        <View style={marketWidgetStyles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={16} color={MarketWidgetColors.errorColor} />
          <Text style={marketWidgetStyles.errorText}>{error || '数据异常'}</Text>
        </View>
      );
    }

    const dxyValue = DXYService.parseDXYValue(dxyData.dxy);
    const formattedValue = DXYService.formatDXYValue(dxyValue);
    const valueFontStyle = getValueFontSize(formattedValue);

    // 创建动态样式
    const dynamicStyles = {
      title: {
        ...marketWidgetStyles.title,
        color: themeColors?.titleColor || marketWidgetStyles.title.color,
        fontSize: fontSizes?.title || marketWidgetStyles.title.fontSize,
      },
      value: {
        ...marketWidgetStyles[valueFontStyle],
        color: themeColors?.valueColor || marketWidgetStyles[valueFontStyle].color,
        fontSize: fontSizes?.value || marketWidgetStyles[valueFontStyle].fontSize,
      },
      label: {
        ...marketWidgetStyles.valueLabel,
        color: themeColors?.labelColor || marketWidgetStyles.valueLabel.color,
        fontSize: fontSizes?.label || marketWidgetStyles.valueLabel.fontSize,
      },
    };

    return (
      <View style={marketWidgetStyles.contentContainer}>
        <View style={marketWidgetStyles.dataDisplay}>
          <Text style={dynamicStyles.value}>{formattedValue}</Text>
          <Text style={dynamicStyles.label}>指数</Text>
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
      <Text style={{
        ...marketWidgetStyles.title,
        color: themeColors?.titleColor || marketWidgetStyles.title.color,
        fontSize: fontSizes?.title || marketWidgetStyles.title.fontSize,
      }}>{title}</Text>
      {renderContent()}
    </TouchableOpacity>
  );
};

export default DXYWidget;
