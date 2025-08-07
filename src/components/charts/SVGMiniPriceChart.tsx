import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Svg, Polyline, Path } from 'react-native-svg';

interface PricePoint {
  price: number;
  createdAt: string;
}

interface SVGMiniPriceChartProps {
  data: PricePoint[];
  isPositive: boolean;
  width?: number;
  height?: number;
  strokeWidth?: number;
  showFill?: boolean;
}

const SVGMiniPriceChart: React.FC<SVGMiniPriceChartProps> = ({
  data,
  isPositive,
  width = 80,
  height = 30,
  strokeWidth = 1.5,
  showFill = false
}) => {
  const pathData = useMemo(() => {
    if (!data || data.length < 2) {
      return { points: '', fillPath: '' };
    }

    // 按时间排序
    const sortedData = [...data].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // 找到价格的最小值和最大值
    const prices = sortedData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1; // 防止除零

    // 计算点的坐标
    const points = sortedData.map((point, index) => {
      const x = (index / (sortedData.length - 1)) * (width - 4) + 2; // 留出边距
      const y = height - 2 - ((point.price - minPrice) / priceRange) * (height - 4); // 翻转Y轴
      return `${x},${y}`;
    }).join(' ');

    // 创建填充路径
    let fillPath = '';
    if (showFill && sortedData.length > 1) {
      const firstPoint = sortedData[0];
      const lastPoint = sortedData[sortedData.length - 1];
      
      const firstX = 2;
      const lastX = width - 2;
      const bottomY = height - 2;
      
      const firstY = height - 2 - ((firstPoint.price - minPrice) / priceRange) * (height - 4);
      const lastY = height - 2 - ((lastPoint.price - minPrice) / priceRange) * (height - 4);
      
      fillPath = `M ${firstX},${bottomY} L ${firstX},${firstY} `;
      
      sortedData.forEach((point, index) => {
        const x = (index / (sortedData.length - 1)) * (width - 4) + 2;
        const y = height - 2 - ((point.price - minPrice) / priceRange) * (height - 4);
        fillPath += `L ${x},${y} `;
      });
      
      fillPath += `L ${lastX},${bottomY} Z`;
    }

    return { points, fillPath };
  }, [data, width, height, showFill]);

  // 如果没有足够的数据，返回空视图
  if (!data || data.length < 2) {
    return <View style={[styles.container, { width, height }]} />;
  }

  const chartColor = isPositive ? '#00C851' : '#FF4444';
  const fillColor = isPositive ? 'rgba(0, 200, 81, 0.1)' : 'rgba(255, 68, 68, 0.1)';

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} style={styles.svg}>
        {showFill && pathData.fillPath && (
          <Path
            d={pathData.fillPath}
            fill={fillColor}
            stroke="none"
          />
        )}
        <Polyline
          points={pathData.points}
          fill="none"
          stroke={chartColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
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
});

export default SVGMiniPriceChart;
