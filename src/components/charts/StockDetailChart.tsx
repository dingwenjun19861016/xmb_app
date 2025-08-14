import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Svg, Polyline, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PricePoint {
  price: number;
  createdAt: string;
}

interface StockDetailChartProps {
  data: PricePoint[];
  isPositive: boolean;
  width?: number;
  height?: number;
  strokeWidth?: number;
  showFill?: boolean;
  period?: string;
}

const StockDetailChart: React.FC<StockDetailChartProps> = ({
  data,
  isPositive,
  width = SCREEN_WIDTH - 32,
  height = 200,
  strokeWidth = 2,
  showFill = true,
  period = '1D'
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return { 
        hasData: false, 
        points: '', 
        fillPath: '', 
        isFlat: false, 
        minPrice: 0, 
        maxPrice: 0,
        priceRange: 0,
        filteredCount: 0 
      };
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
      return { 
        hasData: false, 
        points: '', 
        fillPath: '', 
        isFlat: false, 
        minPrice: 0, 
        maxPrice: 0,
        priceRange: 0,
        filteredCount: 0 
      };
    }

    // 按时间排序
    const sortedData = [...validData].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // 🎯 智能数据过滤：根据期间和价格变化过滤数据点
    const deduplicatedData = [];
    let lastPrice = null;
    const priceThreshold = period === '1D' ? 0.001 : 0.005; // 1天图更敏感
    
    for (let i = 0; i < sortedData.length; i++) {
      const currentPrice = sortedData[i].price;
      
      if (lastPrice === null || Math.abs(currentPrice - lastPrice) / lastPrice > priceThreshold) {
        // 价格变化超过阈值，保留数据点
        deduplicatedData.push(sortedData[i]);
      } else if (i === sortedData.length - 1) {
        // 始终保留最后一个数据点
        deduplicatedData.push(sortedData[i]);
      } else if (deduplicatedData.length > 0 && i - deduplicatedData.length >= 10) {
        // 如果连续相同价格过多，每10个点保留一个
        deduplicatedData.push(sortedData[i]);
      }
      lastPrice = currentPrice;
    }

    // 限制最大数据点数量以保证性能
    let finalData = deduplicatedData;
    const maxPoints = period === '1D' ? 100 : 200;
    if (deduplicatedData.length > maxPoints) {
      const step = Math.ceil(deduplicatedData.length / maxPoints);
      finalData = deduplicatedData.filter((_, index) => index % step === 0);
      // 确保包含最后一个点
      if (finalData[finalData.length - 1] !== deduplicatedData[deduplicatedData.length - 1]) {
        finalData.push(deduplicatedData[deduplicatedData.length - 1]);
      }
    }

    console.log(`📈 Chart data for ${period}: ${sortedData.length} → ${deduplicatedData.length} → ${finalData.length} points`);

    const prices = finalData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    // 检查是否是平线
    const isFlat = priceRange / minPrice < 0.0001;

    if (isFlat || finalData.length === 1) {
      const y = height / 2;
      const points = finalData.length === 1 
        ? `16,${y} ${width-16},${y}` 
        : finalData.map((_, index) => {
            const x = (index / (finalData.length - 1)) * (width - 32) + 16;
            return `${x},${y}`;
          }).join(' ');
      
      return { 
        hasData: true, 
        points, 
        fillPath: '', 
        isFlat: true, 
        minPrice, 
        maxPrice, 
        priceRange: 0,
        filteredCount: finalData.length 
      };
    }

    // 添加一些padding到价格范围，使图表更好看
    const paddedRange = priceRange * 1.1;
    const paddedMin = minPrice - (paddedRange - priceRange) / 2;
    
    // 计算路径点
    const points = finalData.map((point, index) => {
      const x = (index / (finalData.length - 1)) * (width - 32) + 16;
      const normalizedPrice = (point.price - paddedMin) / paddedRange;
      const y = height - 16 - (normalizedPrice * (height - 32));
      return `${x},${y}`;
    }).join(' ');

    // 创建填充路径
    let fillPath = '';
    if (showFill && finalData.length > 1) {
      const firstPoint = finalData[0];
      const lastPoint = finalData[finalData.length - 1];
      
      const firstX = 16;
      const lastX = width - 16;
      const bottomY = height - 16;
      
      const firstNormalized = (firstPoint.price - paddedMin) / paddedRange;
      const lastNormalized = (lastPoint.price - paddedMin) / paddedRange;
      
      const firstY = height - 16 - (firstNormalized * (height - 32));
      const lastY = height - 16 - (lastNormalized * (height - 32));
      
      fillPath = `M ${firstX},${bottomY} L ${firstX},${firstY} `;
      
      finalData.forEach((point, index) => {
        const x = (index / (finalData.length - 1)) * (width - 32) + 16;
        const normalizedPrice = (point.price - paddedMin) / paddedRange;
        const y = height - 16 - (normalizedPrice * (height - 32));
        fillPath += `L ${x},${y} `;
      });
      
      fillPath += `L ${lastX},${bottomY} Z`;
    }

    return { 
      hasData: true, 
      points, 
      fillPath, 
      isFlat: false, 
      minPrice: paddedMin, 
      maxPrice: paddedMin + paddedRange, 
      priceRange: paddedRange,
      filteredCount: finalData.length 
    };
  }, [data, width, height, showFill, period]);

  // 没有数据时的占位符
  if (!chartData.hasData) {
    return (
      <View style={[styles.container, { width, height }]}>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>暂无图表数据</Text>
          <Text style={styles.noDataSubText}>
            {period === '1D' ? '非交易时段' : '数据加载中...'}
          </Text>
        </View>
      </View>
    );
  }

  const chartColor = chartData.isFlat 
    ? '#8e8e93' 
    : (isPositive ? '#34C759' : '#FF3B30');
  
  const gradientId = chartData.isFlat 
    ? 'flatGradient' 
    : (isPositive ? 'positiveGradient' : 'negativeGradient');

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} style={styles.svg}>
        <Defs>
          <LinearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#34C759" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#34C759" stopOpacity="0.05" />
          </LinearGradient>
          <LinearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FF3B30" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#FF3B30" stopOpacity="0.05" />
          </LinearGradient>
          <LinearGradient id="flatGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8e8e93" stopOpacity="0.2" />
            <Stop offset="1" stopColor="#8e8e93" stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        
        {showFill && chartData.fillPath && (
          <Path
            d={chartData.fillPath}
            fill={`url(#${gradientId})`}
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
      
      {/* 底部信息显示 */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          数据点: {chartData.filteredCount} | 
          {chartData.isFlat ? ' 非交易时段' : ` 波动: ${((chartData.priceRange / ((chartData.minPrice + chartData.maxPrice) / 2)) * 100).toFixed(2)}%`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  svg: {
    backgroundColor: 'transparent',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  noDataText: {
    fontSize: 16,
    color: '#8e8e93',
    fontWeight: '600',
  },
  noDataSubText: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 4,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 4,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 11,
    color: '#8e8e93',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

export default StockDetailChart;
