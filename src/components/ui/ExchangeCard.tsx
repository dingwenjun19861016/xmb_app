import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { CexInfo } from '../../services/CoinInfoService';
import { Ionicons } from '@expo/vector-icons';

interface ExchangeCardProps {
  exchangeInfo: CexInfo;
}

const ExchangeCard = ({ exchangeInfo }: ExchangeCardProps) => {
  // 处理交易所注册链接点击
  const handleRegisterPress = () => {
    if (exchangeInfo.cexUrl) {
      Linking.openURL(exchangeInfo.cexUrl).catch(err => 
        console.error('无法打开链接:', exchangeInfo.cexUrl, err)
      );
    }
  };
  
  return (
    <View style={styles.exchangeCard}>
      <View style={styles.exchangeHeader}>
        <Text style={styles.exchangeName}>{exchangeInfo.cexName}</Text>
        <Text style={styles.exchangeRank}>#{exchangeInfo.cexRank}</Text>
      </View>
      <View style={styles.exchangeDetails}>
        <Text style={styles.pairName}>{exchangeInfo.cexPair}</Text>
        <Text style={styles.price}>{exchangeInfo.cexPrice}</Text>
      </View>
      <View style={styles.volumeInfo}>
        <Text style={styles.volume}>成交量: {exchangeInfo.cexVolume}</Text>
        <Text style={styles.volumePercent}>{exchangeInfo.cexVolumePercent}</Text>
      </View>
      
      {/* 交易注册按钮 */}
      {exchangeInfo.cexUrl && (
        <TouchableOpacity 
          style={styles.registerButton}
          onPress={handleRegisterPress}
          activeOpacity={0.7}
        >
          <Ionicons name="open-outline" size={16} color="#007AFF" />
          <Text style={styles.registerText}>前往交易</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  exchangeCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  exchangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  exchangeName: {
    fontSize: 16,
    fontWeight: '500',
  },
  exchangeRank: {
    fontSize: 12,
    color: '#666',
  },
  exchangeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  pairName: {
    fontSize: 14,
    color: '#333',
  },
  price: {
    fontSize: 14,
    fontWeight: '500',
  },
  volumeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12, // 增加底部间距给按钮留出空间
  },
  volume: {
    fontSize: 12,
    color: '#666',
  },
  volumePercent: {
    fontSize: 12,
    color: '#666',
  },
  // 注册按钮样式
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF', // 浅蓝色背景，不太突兀
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-end', // 靠右对齐
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#E1EBFA',
  },
  registerText: {
    fontSize: 14,
    color: '#007AFF', // 蓝色文字
    marginLeft: 5,
    fontWeight: '500',
  },
});

export default ExchangeCard;
