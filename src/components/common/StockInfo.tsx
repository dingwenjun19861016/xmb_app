import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StockInfoProps {
  stockName: string;
  stockSymbol?: string;
  currentPrice: string;
  priceChange24h: string;
  logoUrl?: string;
  isPositive: boolean;
  priceChangeDirection?: 'up' | 'down' | null;
  renderActionButtons?: () => React.ReactNode;
}

const StockInfo = ({ 
  stockName, 
  stockSymbol, 
  currentPrice, 
  priceChange24h, 
  logoUrl,
  isPositive,
  priceChangeDirection,
  renderActionButtons
}: StockInfoProps) => {

  return (
    <View style={styles.priceSection}>
      <View style={styles.priceContainer}>
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>{currentPrice}</Text>
          {priceChangeDirection && (
            <Ionicons 
              name={priceChangeDirection === 'up' ? 'trending-up' : 'trending-down'} 
              size={20} 
              color={priceChangeDirection === 'up' ? '#34C759' : '#FF3B30'}
              style={styles.priceArrow}
            />
          )}
        </View>
        <Text style={[
          styles.changeText, 
          { color: isPositive ? '#34C759' : '#FF3B30' }
        ]}>
          {priceChange24h}
        </Text>
      </View>
      {/* 操作按钮区域 - 替代原来的logo位置 */}
      {renderActionButtons && (
        <View style={styles.actionButtonsContainer}>
          {renderActionButtons()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 10,
  },
  priceContainer: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  priceArrow: {
    marginLeft: 8,
  },
  changeText: {
    fontSize: 16,
    marginTop: 5,
  },
  actionButtonsContainer: {
    marginLeft: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default StockInfo;
