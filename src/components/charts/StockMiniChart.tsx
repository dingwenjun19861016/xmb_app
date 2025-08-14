import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Polyline, Path } from 'react-native-svg';

interface PricePoint {
  price: number;
  createdAt: string;
}

interface StockMiniChartProps {
  data: PricePoint[];
  isPositive: boolean;
  width?: number;
  height?: number;
  strokeWidth?: number;
  showFill?: boolean;
}

const StockMiniChart: React.FC<StockMiniChartProps> = ({
  data,
  isPositive,
  width = 80,
  height = 30,
  strokeWidth = 1.5,
  showFill = false
}) => {
  const chartData = useMemo(() => {
    // 如果没有数据或数据不足，返回空状态
    if (!data || data.length === 0) {
      return { hasData: false, points: '', fillPath: '', isFlat: false, filteredCount: 0 };
    }

    // 过滤无效数据
    const validData = data.filter(point => 
      point && 
      typeof point.price === 'number' && 
      !isNaN(point.price) && 
      point.price > 0 &&
      point.createdAt
    );

    if (validData.length === 0) {
      return { hasData: false, points: '', fillPath: '', isFlat: false, filteredCount: 0 };
    }

    // 按时间排序
    const sortedData = [...validData].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // 🎯 核心优化：过滤连续相同价格的数据点（美股非交易时段优化）
    const deduplicatedData = [];
    let lastPrice = null;
    let consecutiveSameCount = 0;
    
    for (let i = 0; i < sortedData.length; i++) {
      const currentPrice = Math.round(sortedData[i].price * 100) / 100; // 保留2位小数进行比较
      
      if (lastPrice === null || Math.abs(currentPrice - lastPrice) > 0.005) {
        // 价格有变化，或者是第一个数据点
        deduplicatedData.push(sortedData[i]);
        consecutiveSameCount = 0;
      } else {
        // 价格相同
        consecutiveSameCount++;
        // 如果连续相同价格超过3个，只保留每10个数据点
        if (consecutiveSameCount % 10 === 0 || i === sortedData.length - 1) {
          deduplicatedData.push(sortedData[i]);
        }
      }
      lastPrice = currentPrice;
    }

    // console.log(`📊 Chart data: ${sortedData.length} → ${deduplicatedData.length} points (filtered ${sortedData.length - deduplicatedData.length} duplicate prices)`);

    // 如果过滤后只有一个数据点，显示平线
    if (deduplicatedData.length <= 1) {
      const y = height / 2;
      const points = `2,${y} ${width-2},${y}`;
      return { hasData: true, points, fillPath: '', isFlat: true, filteredCount: deduplicatedData.length };
    }

    // 检查是否所有价格都相同（美股非交易时段常见）
    const prices = deduplicatedData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    // 如果价格变化极小（小于0.05%），认为是平线
    const isFlat = priceRange / minPrice < 0.0005;

    if (isFlat) {
      const y = height / 2;
      const points = deduplicatedData.map((_, index) => {
        const x = (index / (deduplicatedData.length - 1)) * (width - 4) + 2;
        return `${x},${y}`;
      }).join(' ');
      return { hasData: true, points, fillPath: '', isFlat: true, filteredCount: deduplicatedData.length };
    }

    // 计算正常的价格图表
    const points = deduplicatedData.map((point, index) => {
      const x = (index / (deduplicatedData.length - 1)) * (width - 4) + 2;
      const y = height - 2 - ((point.price - minPrice) / priceRange) * (height - 4);
      return `${x},${y}`;
    }).join(' ');

    // 创建填充路径
    let fillPath = '';
    if (showFill && deduplicatedData.length > 1) {
      const firstPoint = deduplicatedData[0];
      const lastPoint = deduplicatedData[deduplicatedData.length - 1];
      
      const firstX = 2;
      const lastX = width - 2;
      const bottomY = height - 2;
      
      const firstY = height - 2 - ((firstPoint.price - minPrice) / priceRange) * (height - 4);
      const lastY = height - 2 - ((lastPoint.price - minPrice) / priceRange) * (height - 4);
      
      fillPath = `M ${firstX},${bottomY} L ${firstX},${firstY} `;
      
      deduplicatedData.forEach((point, index) => {
        const x = (index / (deduplicatedData.length - 1)) * (width - 4) + 2;
        const y = height - 2 - ((point.price - minPrice) / priceRange) * (height - 4);
        fillPath += `L ${x},${y} `;
      });
      
      fillPath += `L ${lastX},${bottomY} Z`;
    }

    return { hasData: true, points, fillPath, isFlat: false, filteredCount: deduplicatedData.length };
  }, [data, width, height, showFill]);

  // 没有数据时显示占位符
  if (!chartData.hasData) {
    return (
      <View style={[styles.container, { width, height }]}>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>--</Text>
        </View>
      </View>
    );
  }

  // 平线数据时使用灰色
  const chartColor = chartData.isFlat 
    ? '#8e8e93' 
    : (isPositive ? '#34C759' : '#FF3B30');
  
  const fillColor = chartData.isFlat 
    ? 'rgba(142, 142, 147, 0.1)' 
    : (isPositive ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)');

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} style={styles.svg}>
        {showFill && chartData.fillPath && (
          <Path
            d={chartData.fillPath}
            fill={fillColor}
            stroke="none"
          />
        )}
        <Polyline
          points={chartData.points}
          fill="none"
          stroke={chartColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={chartData.isFlat ? 0.6 : 1}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  svg: {
    backgroundColor: 'transparent',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
    borderRadius: 4,
  },
  noDataText: {
    fontSize: 10,
    color: '#8e8e93',
    fontWeight: '500',
  },
});

export default StockMiniChart;
