import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { LineChart as RNLineChart } from 'react-native-chart-kit';
import { ETHDIndexData, ETHDService } from '../../services/data';

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
const TIME_PERIODS = ['7天', '30天', '90天'];

interface ETHDIndexChartProps {
  historicalData: ETHDIndexData[];
  selectedTimePeriod: string;
  onTimePeriodChange: (period: string) => void;
}

const ETHDIndexChart: React.FC<ETHDIndexChartProps> = ({
  historicalData,
  selectedTimePeriod,
  onTimePeriodChange
}) => {
  console.log('📊 ETHDIndexChart: Received historical data:', historicalData);
  console.log('📊 ETHDIndexChart: Data length:', historicalData?.length);
  console.log('📊 ETHDIndexChart: Selected period:', selectedTimePeriod);
  
  // 获取屏幕宽度
  const screenWidth = Dimensions.get('window').width - 48; // 减去容器的左右margin

  // 如果没有数据，显示空视图
  if (!historicalData || historicalData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>ETH.D</Text>
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

  // 提取ETHD指数数据
  const ethdValues = historicalData.map(item => {
    console.log('📊 ETHDIndexChart: Processing item:', item);
    const value = parseFloat(item.ethd);
    console.log('📊 ETHDIndexChart: Parsed value:', value);
    return isNaN(value) ? 0 : value;
  }).filter(value => value >= 0 && value <= 100); // 确保数值在有效范围内
  
  console.log('📊 ETHDIndexChart: Extracted ETHD values:', ethdValues);
  
  // 使用真实数据 - 确保时间顺序正确（从最早到最新）
  // API通常返回的是最新到最早的顺序，我们需要反转
  let finalETHDValues = [...ethdValues].reverse(); // 反转数组，使最早的数据在前
  let finalHistoricalData = [...historicalData].reverse(); // 反转历史数据数组
  
  console.log('📊 ETHDIndexChart: Final ETHD values (reversed):', finalETHDValues);
  
  // 如果没有有效数据，显示错误信息
  if (finalETHDValues.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>ETH.D</Text>
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
          <Text style={styles.noDataText}>数据解析失败</Text>
        </View>
      </View>
    );
  }

  // 生成标签 - 显示4-5个关键时间点  
  const labels = finalETHDValues.map((_, index) => {
    const totalPoints = finalETHDValues.length;
    
    // 计算显示标签的位置：起始、25%、50%、75%、结束
    if (index === 0 || 
        index === Math.floor(totalPoints * 0.25) || 
        index === Math.floor(totalPoints * 0.5) || 
        index === Math.floor(totalPoints * 0.75) || 
        index === totalPoints - 1) {
      
      // 尝试使用实际的历史数据日期
      if (finalHistoricalData[index] && finalHistoricalData[index].timestamp) {
        const date = new Date(finalHistoricalData[index].timestamp);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      } else {
        // 回退到计算日期
        const daysAgo = parseInt(selectedTimePeriod);
        const daysFromEnd = totalPoints - 1 - index;
        const date = new Date();
        date.setDate(date.getDate() - daysFromEnd);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
    }
    return ''; // 其他位置不显示标签
  });

  console.log('📊 ETHDIndexChart: Generated labels:', labels);
  console.log('📊 ETHDIndexChart: Labels length:', labels.length);
  console.log('📊 ETHDIndexChart: Data length:', finalETHDValues.length);

  // 移动端图表配置
  const mobileChartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(88, 86, 214, ${opacity})`, // 紫色主题
    labelColor: (opacity = 1) => `rgba(108, 117, 125, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '0', // 隐藏圆点
      strokeWidth: '0',
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      strokeOpacity: 0.1,
    },
    withInnerLines: true,
    withOuterLines: false,
    withVerticalLines: false,
    withHorizontalLines: true,
    segments: 4,
    formatXLabel: (value: string, index: number) => {
      // 自定义X轴标签格式化
      const totalPoints = labels.length;
      
      // 计算显示标签的位置：起始、25%、50%、75%、结束
      if (index === 0 || 
          index === Math.floor(totalPoints * 0.25) || 
          index === Math.floor(totalPoints * 0.5) || 
          index === Math.floor(totalPoints * 0.75) || 
          index === totalPoints - 1) {
        
        // 尝试使用实际的历史数据日期
        if (finalHistoricalData[index] && finalHistoricalData[index].timestamp) {
          const date = new Date(finalHistoricalData[index].timestamp);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        } else {
          // 回退到计算日期
          const daysAgo = parseInt(selectedTimePeriod);
          const daysFromEnd = totalPoints - 1 - index;
          const date = new Date();
          date.setDate(date.getDate() - daysFromEnd);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }
      }
      return ''; // 其他位置不显示
    },
  };

  // Web端图表配置
  const webChartData = {
    labels: labels,
    datasets: [
      {
        label: 'ETH.D指数',
        data: finalETHDValues,
        borderColor: '#5856D6',
        backgroundColor: 'rgba(88, 86, 214, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0, // 隐藏圆点
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#5856D6',
        pointHoverBorderColor: '#FFFFFF',
        pointHoverBorderWidth: 2,
      },
    ],
  };

  // 自动计算Y轴范围
  const minValue = Math.min(...finalETHDValues);
  const maxValue = Math.max(...finalETHDValues);
  const range = maxValue - minValue;
  const padding = range * 0.1; // 10%的边距
  const yMin = Math.max(0, minValue - padding);
  const yMax = Math.min(100, maxValue + padding);

  const webChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: '#5856D6',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            const dataIndex = context[0].dataIndex;
            const reversedIndex = finalHistoricalData.length - finalETHDValues.length + dataIndex;
            if (reversedIndex >= 0 && reversedIndex < finalHistoricalData.length) {
              const item = finalHistoricalData[reversedIndex];
              if (item.timestamp) {
                const date = new Date(item.timestamp);
                return date.toLocaleDateString('zh-CN');
              }
            }
            return labels[dataIndex];
          },
          label: (context: any) => {
            const value = context.parsed.y;
            const description = ETHDService.getETHDIndexDescription(value);
            return `ETH.D指数: ${value}% (${description})`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6C757D',
          font: {
            size: 12,
          },
          maxTicksLimit: 5,
          autoSkip: false,
          callback: function(value: any, index: any, ticks: any) {
            const totalPoints = labels.length;
            
            // 只在关键位置显示标签
            if (index === 0 || 
                index === Math.floor(totalPoints * 0.25) || 
                index === Math.floor(totalPoints * 0.5) || 
                index === Math.floor(totalPoints * 0.75) || 
                index === totalPoints - 1) {
              
              // 直接返回对应的标签
              return labels[index] || '';
            }
            return '';
          },
        },
      },
      y: {
        min: yMin,
        max: yMax,
        grid: {
          color: 'rgba(108, 117, 125, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#6C757D',
          font: {
            size: 12,
          },
          callback: function(value: any) {
            return value.toFixed(1) + '%';
          },
        },
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    elements: {
      point: {
        hoverRadius: 8,
      },
    },
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ETH.D</Text>
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

      <View style={styles.chartContainer}>
        {Platform.OS === 'web' ? (
          <div style={{ width: '100%', height: 280, overflow: 'hidden' }}>
            <Line data={webChartData} options={webChartOptions} />
          </div>
        ) : (
          <View style={styles.mobileChartWrapper}>
            <RNLineChart
              data={{
                labels: labels,
                datasets: [
                  {
                    data: finalETHDValues,
                    color: (opacity = 1) => `rgba(88, 86, 214, ${opacity})`,
                    strokeWidth: 3,
                  },
                ],
              }}
              width={screenWidth}
              height={280}
              yAxisSuffix="%"
              yAxisInterval={1}
              chartConfig={mobileChartConfig}
              bezier
              style={styles.chart}
              withDots={false}
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLines={false}
              withHorizontalLines={true}
              segments={4}
              fromZero={false}
              yLabelsOffset={10}
              xLabelsOffset={-10}
            />
          </View>
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#5856D6' }]} />
          <Text style={styles.legendText}>ETH.D指数</Text>
        </View>
        <Text style={styles.rangeText}>范围: 3% - 25%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 24,
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
    marginBottom: 12,
  },

  timePeriodContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 4,
    gap: 2,
  },

  timePeriodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },

  selectedTimePeriodButton: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  timePeriodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C757D',
  },

  selectedTimePeriodText: {
    color: '#FFFFFF',
  },

  chartContainer: {
    paddingHorizontal: 0,
    paddingBottom: 16,
    alignItems: 'center',
  },

  mobileChartWrapper: {
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
  },

  chart: {
    borderRadius: 16,
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },

  legendText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },

  rangeText: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '500',
  },

  noDataContainer: {
    paddingVertical: 80,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  noDataText: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
  },
});

export default ETHDIndexChart;
