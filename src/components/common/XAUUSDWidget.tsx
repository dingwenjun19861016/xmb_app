import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import XAUUSDService, { XAUUSDData } from '../../services/data/XAUUSDService';
import { marketWidgetStyles, MarketWidgetColors, getValueFontSize } from "./MarketWidgetStyles";

interface XAUUSDWidgetProps { 
  style?: any; 
  onPress?: () => void; 
  title?: string; 
}

const XAUUSDWidget: React.FC<XAUUSDWidgetProps> = ({ style, onPress, title = '黄金' }) => {
  const navigation = useNavigation();
  const [data, setData] = useState<XAUUSDData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => { 
    fetchData(); 
  }, []);
  
  const fetchData = async () => {
    try { 
      setLoading(true); 
      setError(null); 
      const current = await XAUUSDService.getCurrentXAUUSD(); 
      setData(current); 
      if(!current) setError('暂无数据'); 
    }
    catch(e){ 
      console.error('🥇 XAUUSDWidget: fetch error', e); 
      setError('加载失败'); 
    } finally { 
      setLoading(false); 
    }
  };
  
  const handlePress = () => { 
    if (onPress) return onPress(); 
    // @ts-ignore
    navigation.navigate('XAUUSDDetail'); 
  };
  
  const renderContent = () => {
    if (loading) return (
      <View style={marketWidgetStyles.loadingContainer}>
        <ActivityIndicator size="small" color={MarketWidgetColors.loadingColor} />
        <Text style={marketWidgetStyles.loadingText}>加载中...</Text>
      </View>
    );
    
    if (error || !data) return (
      <View style={marketWidgetStyles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={20} color={MarketWidgetColors.errorColor} />
        <Text style={marketWidgetStyles.errorText}>{error || '数据异常'}</Text>
      </View>
    );
    
    const value = XAUUSDService.parseValue(data.xauusd); 
    const formatted = XAUUSDService.formatValue(value);
    
    return (
      <View style={marketWidgetStyles.contentContainer}>
        <View style={marketWidgetStyles.dataDisplay}>
          <Text style={marketWidgetStyles.mainValue}>{formatted}</Text>
          <Text style={marketWidgetStyles.valueLabel}>美元/盎司</Text>
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

export default XAUUSDWidget;
