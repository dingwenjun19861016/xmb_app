import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PriceCardProps {
  price: string;
  change: string;
  isPositive: boolean;
}

const PriceCard = ({ price, change, isPositive }: PriceCardProps) => {
  return (
    <View style={styles.priceCard}>
      <Text style={styles.priceText}>{price}</Text>
      <Text style={[
        styles.changeText, 
        { color: isPositive ? '#34C759' : '#FF3B30' }
      ]}>
        {change}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  priceCard: {
    backgroundColor: '#F8FAFE', // 浅蓝色背景，与主题一致
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#1565C0', // 蓝色阴影
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#E3F2FD', // 浅蓝色边框
  },
  priceText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0D47A1', // 深蓝色文字
    letterSpacing: 0.3,
  },
  changeText: {
    fontSize: 15,
    marginTop: 6,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default PriceCard;
