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
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  changeText: {
    fontSize: 16,
    marginTop: 5,
  },
});

export default PriceCard;
