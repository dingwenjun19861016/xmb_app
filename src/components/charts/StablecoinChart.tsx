import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { LineChart as RNLineChart } from 'react-native-chart-kit';
import { StablecoinData, StablecoinService } from '../../services/data';

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

interface StablecoinChartProps {
  historicalData: StablecoinData[];
  selectedTimePeriod: string;
  onTimePeriodChange: (period: string) => void;
}

const StablecoinChart: React.FC<StablecoinChartProps> = ({
  historicalData,
  selectedTimePeriod,
  onTimePeriodChange
}) => {
  console.log('📊 StablecoinChart: Received historical data:', historicalData);
  console.log('📊 StablecoinChart: Data length:', historicalData?.length);
  console.log('📊 StablecoinChart: Selected period:', selectedTimePeriod);
  
  // 获取屏幕宽度
  const screenWidth = Dimensions.get('window').width - 48; // 减去容器的左右margin

  // 如果没有数据，显示空视图
  if (!historicalData || historicalData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>稳定币市值</Text>
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

  // 提取稳定币市值数据
  const stablecoinValues = historicalData.map(item => {
    console.log('📊 StablecoinChart: Processing item:', item);
    const value = StablecoinService.parseStablecoinValue(item.mcap);
    console.log('📊 StablecoinChart: Parsed value:', value);
    return value > 0 ? value : 0;
  });
  
  console.log('📊 StablecoinChart: Extracted stablecoin values:', stablecoinValues);
  
  // 使用真实数据 - 确保时间顺序正确（从最早到最新）
  // API通常返回的是最新到最早的顺序，我们需要反转
  let finalStablecoinValues = [...stablecoinValues].reverse(); // 反转数组，使最早的数据在前
  let finalHistoricalData = [...historicalData].reverse(); // 反转历史数据数组
  
  console.log('📊 StablecoinChart: Final stablecoin values (reversed):', finalStablecoinValues);
  
  // 如果没有有效数据，显示错误信息
  if (finalStablecoinValues.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>稳定币市值</Text>
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
          <Text style={styles.noDataText}>无效的数据格式</Text>
        </View>
      </View>
    );
  }

  // 格式化数据，确保有效的数值范围
  const minValue = Math.min(...finalStablecoinValues);
  const maxValue = Math.max(...finalStablecoinValues);
  
  // 处理边界情况
  if (minValue === maxValue) {
    finalStablecoinValues = finalStablecoinValues.map((_, index) => minValue + (index * 0.001));
  }
  
  console.log('📊 StablecoinChart: Min value:', minValue, 'Max value:', maxValue);

  // 创建标签（日期）
  const labels = finalHistoricalData.map(item => {
    const date = new Date(item.date || item.timestamp || '');
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  });

  // Web端图表配置
  if (Platform.OS === 'web') {
    const chartData = {
      labels,
      datasets: [
        {
          label: '稳定币市值 (万亿美元)',
          data: finalStablecoinValues,
          borderColor: '#007AFF',
          backgroundColor: 'rgba(0, 122, 255, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#007AFF',
          pointHoverBorderColor: '#FFFFFF',
          pointHoverBorderWidth: 2,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#FFFFFF',
          bodyColor: '#FFFFFF',
          borderColor: '#007AFF',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: function(context: any) {
              const dataIndex = context[0].dataIndex;
              return finalHistoricalData[dataIndex]?.date || '';
            },
            label: function(context: any) {
              const value = context.parsed.y;
              return `稳定币市值: $${value.toFixed(3)}T`;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false,
          },
          ticks: {
            color: '#8E8E93',
            font: {
              size: 12,
            },
            maxTicksLimit: 6,
          },
        },
        y: {
          display: true,
          grid: {
            color: 'rgba(142, 142, 147, 0.2)',
            borderDash: [2, 2],
          },
          ticks: {
            color: '#8E8E93',
            font: {
              size: 12,
            },
            callback: function(value: any) {
              return `$${value.toFixed(2)}T`;
            },
          },
        },
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
    };

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>稳定币市值</Text>
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
          <Line data={chartData} options={chartOptions} />
        </View>
      </View>
    );
  }

  // 移动端图表配置
  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 3,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(142, 142, 147, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#007AFF',
      fill: '#007AFF'
    },
    propsForBackgroundLines: {
      strokeDasharray: "5,5",
      stroke: "rgba(142, 142, 147, 0.2)",
      strokeWidth: 1
    },
    formatYLabel: (value: string) => {
      const num = parseFloat(value);
      return `$${num.toFixed(2)}T`;
    },
    formatXLabel: (value: string) => {
      return value;
    }
  };

  const data = {
    labels: labels.length > 8 ? labels.filter((_, index) => index % Math.ceil(labels.length / 8) === 0) : labels,
    datasets: [
      {
        data: finalStablecoinValues.length > 8 ? 
          finalStablecoinValues.filter((_, index) => index % Math.ceil(finalStablecoinValues.length / 8) === 0) : 
          finalStablecoinValues,
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>稳定币市值</Text>
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
        <RNLineChart
          data={data}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          segments={4}
        />
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
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },

  timePeriodContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F1F6',
    borderRadius: 12,
    padding: 4,
  },

  timePeriodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  selectedTimePeriodButton: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },

  timePeriodText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },

  selectedTimePeriodText: {
    color: '#FFFFFF',
  },

  chartContainer: {
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 24 : 0,
    height: Platform.OS === 'web' ? 280 : 220,
  },

  chart: {
    borderRadius: 16,
  },

  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  noDataText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

export default StablecoinChart;
