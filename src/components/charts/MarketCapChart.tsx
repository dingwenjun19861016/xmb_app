import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { LineChart as RNLineChart } from 'react-native-chart-kit';
import { MarketCapData, MarketCapService } from '../../services/data';

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

interface MarketCapChartProps {
  historicalData: MarketCapData[];
  selectedTimePeriod: string;
  onTimePeriodChange: (period: string) => void;
}

const MarketCapChart: React.FC<MarketCapChartProps> = ({
  historicalData,
  selectedTimePeriod,
  onTimePeriodChange
}) => {
  console.log('📊 MarketCapChart: Received historical data:', historicalData);
  console.log('📊 MarketCapChart: Data length:', historicalData?.length);
  console.log('📊 MarketCapChart: Selected period:', selectedTimePeriod);
  
  // 获取屏幕宽度
  const screenWidth = Dimensions.get('window').width - 48; // 减去容器的左右margin

  // 如果没有数据，显示空视图
  if (!historicalData || historicalData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>总市值</Text>
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

  // 提取市值数据
  const marketCapValues = historicalData.map(item => {
    console.log('📊 MarketCapChart: Processing item:', item);
    const value = MarketCapService.parseMarketCapValue(item.mcap);
    console.log('📊 MarketCapChart: Parsed value:', value);
    return value > 0 ? value : 0;
  });
  
  console.log('📊 MarketCapChart: Extracted market cap values:', marketCapValues);
  
  // 使用真实数据 - 确保时间顺序正确（从最早到最新）
  // API通常返回的是最新到最早的顺序，我们需要反转
  let finalMarketCapValues = [...marketCapValues].reverse(); // 反转数组，使最早的数据在前
  let finalHistoricalData = [...historicalData].reverse(); // 反转历史数据数组
  
  console.log('📊 MarketCapChart: Final market cap values (reversed):', finalMarketCapValues);
  
  // 如果没有有效数据，显示错误信息
  if (finalMarketCapValues.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>总市值</Text>
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

  // 生成标签数组
  const labels = finalMarketCapValues.map((_, index) => {
    const totalPoints = finalMarketCapValues.length;
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
    return ''; // 中间位置不显示标签
  });

  // 移动端图表配置
  const mobileChartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`, // 绿色主题
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
      return labels[index] || '';
    },
  };

  // Web端图表配置
  const webChartData = {
    labels: labels,
    datasets: [
      {
        label: '总市值',
        data: finalMarketCapValues,
        borderColor: '#34C759',
        backgroundColor: 'rgba(52, 199, 89, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0, // 隐藏圆点
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#34C759',
        pointHoverBorderColor: '#FFFFFF',
        pointHoverBorderWidth: 2,
      },
    ],
  };

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
        borderColor: '#34C759',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            const dataIndex = context[0].dataIndex;
            const reversedIndex = finalHistoricalData.length - finalMarketCapValues.length + dataIndex;
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
            return `总市值: $${value.toFixed(2)}T`;
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
            return '$' + value.toFixed(1) + 'T';
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
        <Text style={styles.title}>总市值</Text>
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
                    data: finalMarketCapValues,
                    color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
                    strokeWidth: 3,
                  },
                ],
              }}
              width={screenWidth}
              height={280}
              yAxisSuffix="T"
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
          <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
          <Text style={styles.legendText}>总市值</Text>
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
    flex: 1,
    alignItems: 'center',
  },

  selectedTimePeriodButton: {
    backgroundColor: '#007AFF',
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
    paddingHorizontal: 8,
    paddingBottom: 16,
  },

  mobileChartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  chart: {
    borderRadius: 16,
  },

  noDataContainer: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },

  noDataText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
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
    color: '#6C757D',
    fontWeight: '500',
  },
});

export default MarketCapChart;
