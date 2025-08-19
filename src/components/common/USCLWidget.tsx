import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import USCLService, { USCLData } from '../../services/data/USCLService';
import { marketWidgetStyles, MarketWidgetColors, getValueFontSize } from "./MarketWidgetStyles";

interface USCLWidgetProps { 
  style?: any; 
  onPress?: () => void; 
  title?: string; 
}

const USCLWidget: React.FC<USCLWidgetProps> = ({ style, onPress, title = '原油' }) => {
  const navigation = useNavigation();
  const [data, setData] = useState<USCLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => { 
    fetchData(); 
  }, []);
  
  const fetchData = async () => {
    try { 
      setLoading(true); 
      setError(null); 
      const current = await USCLService.getCurrentUSCL(); 
      setData(current); 
      if(!current) setError('暂无数据'); 
    }
    catch(e){ 
      console.error('🛢️ USCLWidget: fetch error', e); 
      setError('加载失败'); 
    } finally { 
      setLoading(false); 
    }
  };
  
  const handlePress = () => { 
    if (onPress) return onPress(); 
    // @ts-ignore
    navigation.navigate('USCLDetail'); 
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
    
    const value = USCLService.parseValue(data.uscl); 
    const formatted = USCLService.formatValue(value);
    
    return (
      <View style={marketWidgetStyles.contentContainer}>
        <View style={marketWidgetStyles.dataDisplay}>
          <Text style={marketWidgetStyles.mainValue}>{formatted}</Text>
          <Text style={marketWidgetStyles.valueLabel}>美元/桶</Text>
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

export default USCLWidget;
