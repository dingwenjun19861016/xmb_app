import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import USDCNHService, { USDCNHData } from '../../services/data/USDCNHService';

interface USDCNHWidgetProps { style?: any; onPress?: () => void; title?: string; }

const USDCNHWidget: React.FC<USDCNHWidgetProps> = ({ style, onPress, title = '离岸人民币' }) => {
  const navigation = useNavigation();
  const [data, setData] = useState<USDCNHData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(()=>{ fetchData(); }, []);
  const fetchData = async () => {
    try { setLoading(true); setError(null); const current = await USDCNHService.getCurrentUSDCNH(); setData(current); if(!current) setError('暂无数据'); }
    catch(e){ console.error('💱 USDCNHWidget: fetch error', e); setError('加载失败'); } finally { setLoading(false); }
  };
  const handlePress = () => { if (onPress) return onPress(); // @ts-ignore
    navigation.navigate('USDCNHDetail'); };
  const renderContent = () => {
    if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="small" color="#007AFF" /><Text style={styles.loadingText}>加载中...</Text></View>;
    if (error || !data) return <View style={styles.errorContainer}><Ionicons name="alert-circle-outline" size={20} color="#FF3B30" /><Text style={styles.errorText}>{error || '数据异常'}</Text></View>;
    const value = USDCNHService.parseValue(data.usdcnh); const formatted = USDCNHService.formatValue(value);
    return <View style={styles.contentContainer}><View style={styles.dataDisplay}><Text style={styles.mainValue}>{formatted}</Text><Text style={styles.valueLabel}>USD/CNH</Text></View></View>;
  };
  return <TouchableOpacity style={[styles.container, style]} onPress={handlePress} activeOpacity={0.7}><Text style={styles.title}>{title}</Text>{renderContent()}</TouchableOpacity>;
};

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', padding:12, minHeight:120, backgroundColor:'#FFFFFF', borderRadius:12, shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.05, shadowRadius:3, elevation:2 },
  title: { fontSize:14, fontWeight:'600', color:'#1A1A1A', textAlign:'center', marginBottom:12 },
  contentContainer:{ flex:1, justifyContent:'center' },
  dataDisplay:{ alignItems:'center' },
  mainValue:{ fontSize:24, fontWeight:'700', color:'#1A1A1A', marginBottom:4 },
  valueLabel:{ fontSize:12, color:'#8E8E93', fontWeight:'500' },
  loadingContainer:{ flex:1, justifyContent:'center', alignItems:'center' },
  loadingText:{ fontSize:14, color:'#6C757D', marginTop:8 },
  errorContainer:{ flex:1, justifyContent:'center', alignItems:'center' },
  errorText:{ fontSize:12, color:'#FF3B30', textAlign:'center', marginTop:4 },
});

export default USDCNHWidget;
