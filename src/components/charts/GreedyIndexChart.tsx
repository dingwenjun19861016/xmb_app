import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { LineChart as RNLineChart } from 'react-native-chart-kit';
import { GreedyIndexData, GreedyIndexService } from '../../services/data';

// 仅在Web环境中导入Chart.js相关库
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

// 为Web环境注册Chart.js组件
if (Platform.OS === 'web') {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  );
}

// 时间周期选项
const TIME_PERIODS = ['30天', '60天', '90天'];

interface GreedyIndexChartProps {
  historicalData: GreedyIndexData[];
  selectedTimePeriod: string;
  onTimePeriodChange: (period: string) => void;
}

const GreedyIndexChart: React.FC<GreedyIndexChartProps> = ({
  historicalData,
  selectedTimePeriod,
  onTimePeriodChange
}) => {
  console.log('📊 GreedyIndexChart: Received historical data:', historicalData);
  console.log('📊 GreedyIndexChart: Data length:', historicalData?.length);
  console.log('📊 GreedyIndexChart: Selected period:', selectedTimePeriod);
  
  // 获取屏幕宽度
  const screenWidth = Dimensions.get('window').width - 48; // 减去容器的左右margin

  // 如果没有数据，显示空视图
  if (!historicalData || historicalData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>贪婪恐慌指数</Text>
          <View style={styles.timePeriodContainer}>
            {TIME_PERIODS.map(period => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.timePeriodButton,
                  selectedTimePeriod === period && styles.selectedTimePeriodButton
                ]}
                onPress={() => onTimePeriodChange(period)}
              >
                <Text style={[
                  styles.timePeriodText,
                  selectedTimePeriod === period && styles.selectedTimePeriodText
                ]}>
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>暂无图表数据</Text>
        </View>
      </View>
    );
  }

  // 提取贪婪指数数据
  const greedyValues = historicalData.map(item => {
    console.log('📊 GreedyIndexChart: Processing item:', item);
    const value = parseInt(item.greedy, 10);
    console.log('📊 GreedyIndexChart: Parsed value:', value);
    return isNaN(value) ? 0 : value;
  }).filter(value => value >= 0 && value <= 100); // 确保数值在有效范围内
  
  console.log('📊 GreedyIndexChart: Extracted greedy values:', greedyValues);
  
  // 使用真实数据 - 确保时间顺序正确（从最早到最新）
  // API通常返回的是最新到最早的顺序，我们需要反转
  let finalGreedyValues = [...greedyValues].reverse(); // 反转数组，使最早的数据在前
  let finalHistoricalData = [...historicalData].reverse(); // 反转历史数据数组
  
  console.log('📊 GreedyIndexChart: Final greedy values (reversed):', finalGreedyValues);
  
  // 如果没有有效数据，显示错误信息
  if (finalGreedyValues.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>贪婪恐慌指数</Text>
          <View style={styles.timePeriodContainer}>
            {TIME_PERIODS.map(period => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.timePeriodButton,
                  selectedTimePeriod === period && styles.selectedTimePeriodButton
                ]}
                onPress={() => onTimePeriodChange(period)}
              >
                <Text style={[
                  styles.timePeriodText,
                  selectedTimePeriod === period && styles.selectedTimePeriodText
                ]}>
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>数据无效</Text>
        </View>
      </View>
    );
  }

  // 生成标签 - 显示起始日期和今天
  const displayLabels = finalGreedyValues.map((_, index) => {
    if (index === 0) {
      // 第一个数据点显示起始日期
      const daysAgo = parseInt(selectedTimePeriod);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      return `${startDate.getMonth() + 1}/${startDate.getDate()}`;
    } else if (index === finalGreedyValues.length - 1) {
      // 最后一个数据点显示今天
      const today = new Date();
      return `${today.getMonth() + 1}/${today.getDate()}`;
    }
    return ''; // 中间位置不显示标签
  });

  // 根据数值获取颜色
  const getColorForValue = (value: number): string => {
    if (value <= 25) return '#FF3B30'; // 极度恐慌
    if (value <= 45) return '#FF9500'; // 恐慌
    if (value <= 55) return '#FFCC00'; // 中性
    if (value <= 75) return '#34C759'; // 贪婪
    return '#007AFF'; // 极度贪婪
  };

  // 使用当前值的颜色作为图表主色调
  const currentValue = finalGreedyValues[finalGreedyValues.length - 1] || 50;
  const chartColor = getColorForValue(currentValue);
  
  // 图表数据配置
  const data = {
    labels: displayLabels,
    datasets: [
      {
        data: finalGreedyValues,
        color: () => chartColor,
        strokeWidth: 3
      }
    ],
    legend: ['贪婪指数']
  };

  // 图表配置
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0, // 贪婪指数为整数
    color: () => chartColor,
    labelColor: () => '#8E8E93',
    style: {
      borderRadius: 0,
      paddingRight: 0,
      marginRight: 0,
    },
    formatYLabel: (value) => Math.round(parseFloat(value)).toString(),
    formatXLabel: (value: string, index: number) => {
      // 自定义X轴标签格式化
      const totalPoints = displayLabels.length;
      const daysAgo = parseInt(selectedTimePeriod);
      
      if (index === 0) {
        // 第一个数据点显示起始日期
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);
        return `${startDate.getMonth() + 1}/${startDate.getDate()}`;
      } else if (index === Math.floor(totalPoints * 0.25)) {
        // 25%位置显示日期
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(daysAgo * 0.75));
        return `${date.getMonth() + 1}/${date.getDate()}`;
      } else if (index === Math.floor(totalPoints * 0.5)) {
        // 50%位置显示日期
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(daysAgo * 0.5));
        return `${date.getMonth() + 1}/${date.getDate()}`;
      } else if (index === Math.floor(totalPoints * 0.75)) {
        // 75%位置显示日期
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(daysAgo * 0.25));
        return `${date.getMonth() + 1}/${date.getDate()}`;
      } else if (index === totalPoints - 1) {
        // 最后一个数据点显示今天
        const today = new Date();
        return `${today.getMonth() + 1}/${today.getDate()}`;
      }
      return ''; // 其他位置不显示
    },
    propsForBackgroundLines: {
      strokeDasharray: '', // 实线网格
      stroke: '#F5F5F7',
      strokeWidth: 1
    },
    fillShadowGradientFrom: chartColor,
    fillShadowGradientTo: '#ffffff',
    fillShadowGradientOpacity: 0.15
  };

  // 自动计算Y轴范围
  const minValue = Math.min(...finalGreedyValues);
  const maxValue = Math.max(...finalGreedyValues);
  const range = maxValue - minValue;
  const padding = range * 0.1; // 10%的边距
  const yMin = Math.max(0, minValue - padding);
  const yMax = Math.min(100, maxValue + padding);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>贪婪恐慌指数</Text>
        <View style={styles.timePeriodContainer}>
          {TIME_PERIODS.map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.timePeriodButton,
                selectedTimePeriod === period && styles.selectedTimePeriodButton
              ]}
              onPress={() => onTimePeriodChange(period)}
            >
              <Text style={[
                styles.timePeriodText,
                selectedTimePeriod === period && styles.selectedTimePeriodText
              ]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {Platform.OS === 'web' ? (
        // Web环境使用react-chartjs-2
        <View style={{height: 280, width: screenWidth}}>
          <Line
            data={{
              labels: displayLabels,
              datasets: [
                {
                  label: '贪婪指数',
                  data: finalGreedyValues,
                  borderColor: chartColor,
                  backgroundColor: `${chartColor}33`, // 添加透明度
                  borderWidth: 3,
                  pointRadius: 0,
                  pointBackgroundColor: chartColor,
                  pointBorderColor: '#ffffff',
                  pointBorderWidth: 0,
                  fill: true,
                  tension: 0.4 // 控制曲线平滑程度
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  min: yMin,
                  max: yMax,
                  ticks: {
                    callback: (value) => value.toString()
                  },
                  grid: {
                    display: true,
                    color: '#F0F0F0'
                  }
                },
                x: {
                  grid: {
                    display: false
                  },
                  ticks: {
                    maxTicksLimit: 5,
                    autoSkip: false,
                    callback: function(value: any, index: any, ticks: any) {
                      const totalPoints = displayLabels.length;
                      
                      // 只在关键位置显示标签
                      if (index === 0 || 
                          index === Math.floor(totalPoints * 0.25) || 
                          index === Math.floor(totalPoints * 0.5) || 
                          index === Math.floor(totalPoints * 0.75) || 
                          index === totalPoints - 1) {
                        
                        // 直接返回对应的标签
                        return displayLabels[index] || '';
                      }
                      return '';
                    },
                  }
                }
              },
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  callbacks: {
                    label: (context) => `贪婪指数: ${context.parsed.y}`
                  }
                }
              }
            }}
          />
        </View>
      ) : (
        // 移动环境使用react-native-chart-kit
        <View style={styles.chartWrapper}>
          <RNLineChart
            data={data}
            width={screenWidth}
            height={280}
            chartConfig={chartConfig}
            bezier // 使用贝塞尔曲线，使图表更平滑
            style={styles.chart}
            withHorizontalLines={true}
            withVerticalLines={false}
            withDots={false}
            withShadow={true}
            withInnerLines={true}
            withOuterLines={true}
            fromZero={false}
            yAxisInterval={1}
            segments={4} // 分成4段：0-25, 25-50, 50-75, 75-100
          />
        </View>
      )}
      
      {/* 图表说明 */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF3B30' }]} />
          <Text style={styles.legendText}>极度恐慌(0-24)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
          <Text style={styles.legendText}>恐慌(25-49)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FFCC00' }]} />
          <Text style={styles.legendText}>中性(50)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
          <Text style={styles.legendText}>贪婪(51-74)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
          <Text style={styles.legendText}>极度贪婪(75-100)</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 24,
    padding: 28,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  timePeriodContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  timePeriodButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedTimePeriodButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  timePeriodText: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '600',
  },
  selectedTimePeriodText: {
    color: 'white',
    fontWeight: '700',
  },
  chart: {
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  chartWrapper: {
    overflow: 'hidden',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataContainer: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  noDataText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
    paddingHorizontal: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F5',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  legendText: {
    fontSize: 11,
    color: '#6C757D',
    fontWeight: '600',
  },
});

export default GreedyIndexChart;
