import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import StockPriceChart from './StockPriceChart';
import StockDetailChart from './StockDetailChart';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SmartStockChartProps {
  historicalData: any[];
  selectedTimePeriod: string;
  onTimePeriodChange: (period: string) => void;
  isPositive: boolean;
  showRankChart?: boolean;
  stockCode?: string;
}

const SmartStockChart: React.FC<SmartStockChartProps> = ({
  historicalData,
  selectedTimePeriod,
  onTimePeriodChange,
  isPositive,
  showRankChart = true,
  stockCode = ''
}) => {
  // 分析24小时数据，判断是否在交易时段
  const marketStatus = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return { isTrading: false, reason: '无数据' };
    }

    // 获取最近24小时的数据
    const recentData = historicalData.slice(-24);
    
    if (recentData.length < 2) {
      return { isTrading: false, reason: '数据不足' };
    }

    // 检查价格波动性
    const prices = recentData.map(item => {
      if (item.stock24h && item.stock24h.length > 0) {
        return parseFloat(item.stock24h[0].price) || 0;
      }
      return parseFloat(item.currentPrice) || 0;
    }).filter(price => price > 0);

    if (prices.length === 0) {
      return { isTrading: false, reason: '无有效价格数据' };
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const volatility = priceRange / minPrice;

    // 检查当前时间（美东时间）
    const now = new Date();
    const etTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hours = etTime.getHours();
    const minutes = etTime.getMinutes();
    const dayOfWeek = etTime.getDay(); // 0 = Sunday, 6 = Saturday
    
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isMarketHours = hours >= 9 && (hours < 16 || (hours === 16 && minutes === 0)) && !isWeekend;
    
    // 如果波动性极小且不在交易时间
    if (volatility < 0.001) {
      if (!isMarketHours) {
        return { isTrading: false, reason: '非交易时段' };
      } else {
        return { isTrading: false, reason: '价格无波动' };
      }
    }

    // 如果在交易时间且有波动
    if (isMarketHours && volatility > 0.005) {
      return { isTrading: true, reason: '交易时段' };
    }

    // 其他情况
    return { 
      isTrading: volatility > 0.002, 
      reason: volatility > 0.002 ? '有价格变动' : '价格稳定' 
    };
  }, [historicalData]);

  // 准备24小时图表数据
  const chart24hData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) return [];

    // 提取24小时数据
    const latest = historicalData[historicalData.length - 1];
    if (latest && latest.stock24h && latest.stock24h.length > 0) {
      return latest.stock24h.map(item => ({
        price: parseFloat(item.price) || 0,
        createdAt: item.createdAt || item.updatedAt || new Date().toISOString()
      }));
    }

    return [];
  }, [historicalData]);

  // 如果是24小时图表且有24h数据，使用专门的Stock图表
  if (selectedTimePeriod === '24h' && chart24hData.length > 0) {
    return (
      <View style={styles.container}>
        <View style={styles.statusContainer}>
          <Text style={[
            styles.statusText,
            { color: marketStatus.isTrading ? '#34C759' : '#8E8E93' }
          ]}>
            {marketStatus.isTrading ? '● 交易中' : '○ ' + marketStatus.reason}
          </Text>
          <Text style={styles.timeText}>
            24小时价格走势
          </Text>
        </View>
        
        <StockDetailChart
          data={chart24hData}
          isPositive={isPositive}
          width={SCREEN_WIDTH - 32}
          height={200}
          strokeWidth={2}
          showFill={true}
          period="1D"
        />
        
        {!marketStatus.isTrading && (
          <View style={styles.nonTradingNotice}>
            <Text style={styles.noticeText}>
              📈 美股交易时间：周一至周五 9:30-16:00 (美东时间)
            </Text>
          </View>
        )}
      </View>
    );
  }

  // 其他时间周期使用原有的图表组件
  return (
    <View style={styles.container}>
      <StockPriceChart 
        historicalData={historicalData}
        selectedTimePeriod={selectedTimePeriod}
        onTimePeriodChange={onTimePeriodChange}
        isPositive={isPositive}
        showRankChart={showRankChart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  nonTradingNotice: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FED7AA',
  },
  noticeText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
  },
});

export default SmartStockChart;
