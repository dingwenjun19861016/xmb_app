import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import USDCNHService, { USDCNHData } from '../../services/data/USDCNHService';
import { marketWidgetStyles, MarketWidgetColors, getValueFontSize } from "./MarketWidgetStyles";

interface USDCNHWidgetProps { 
  style?: any; 
  onPress?: () => void; 
  title?: string; 
}

const USDCNHWidget: React.FC<USDCNHWidgetProps> = ({ style, onPress, title = '离岸人民币' }) => {
  const navigation = useNavigation();
  const [data, setData] = useState<USDCNHData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => { 
    fetchData(); 
  }, []);
  
  const fetchData = async () => {
    try { 
      setLoading(true); 
      setError(null); 
      const current = await USDCNHService.getCurrentUSDCNH(); 
      setData(current); 
      if(!current) setError('暂无数据'); 
    }
    catch(e){ 
      console.error('💱 USDCNHWidget: fetch error', e); 
      setError('加载失败'); 
    } finally { 
      setLoading(false); 
    }
  };
  
  const handlePress = () => { 
    if (onPress) return onPress(); 
    // @ts-ignore
    navigation.navigate('USDCNHDetail'); 
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
    
    const value = USDCNHService.parseValue(data.usdcnh); 
    const formatted = USDCNHService.formatValue(value);
    
    return (
      <View style={marketWidgetStyles.contentContainer}>
        <View style={marketWidgetStyles.dataDisplay}>
          <Text style={marketWidgetStyles.mainValue}>{formatted}</Text>
          <Text style={marketWidgetStyles.valueLabel}>USD/CNH</Text>
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

export default USDCNHWidget;
