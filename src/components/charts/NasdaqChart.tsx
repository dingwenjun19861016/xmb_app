import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { LineChart as RNLineChart } from 'react-native-chart-kit';
import NasdaqService, { NasdaqData } from '../../services/data/NasdaqService';

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

interface NasdaqChartProps {
  historicalData: NasdaqData[];
  selectedTimePeriod: string;
  onTimePeriodChange: (period: string) => void;
}

const NasdaqChart: React.FC<NasdaqChartProps> = ({
  historicalData,
  selectedTimePeriod,
  onTimePeriodChange
}) => {
  console.log('📊 NasdaqChart: Received historical data:', historicalData);
  console.log('📊 NasdaqChart: Data length:', historicalData?.length);
  console.log('📊 NasdaqChart: Selected period:', selectedTimePeriod);
  
  // 获取屏幕宽度
  const screenWidth = Dimensions.get('window').width - 48; // 减去容器的左右margin

  // 如果没有数据，显示空视图
  if (!historicalData || historicalData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>纳斯达克指数</Text>
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

  // 提取Nasdaq指数数据
  const nasdaqValues = historicalData.map(item => {
    console.log('📊 NasdaqChart: Processing item:', item);
    const value = NasdaqService.parseNasdaqValue(item.ixic);
    console.log('📊 NasdaqChart: Parsed value:', value);
    return value > 0 ? value : 0;
  });
  
  console.log('📊 NasdaqChart: Extracted Nasdaq values:', nasdaqValues);
  
  // 使用真实数据 - 确保时间顺序正确（从最早到最新）
  // API通常返回的是最新到最早的顺序，我们需要反转
  let finalNasdaqValues = [...nasdaqValues].reverse(); // 反转数组，使最早的数据在前
  let finalHistoricalData = [...historicalData].reverse(); // 反转历史数据数组
  
  console.log('📊 NasdaqChart: Final Nasdaq values (reversed):', finalNasdaqValues);
  
  // 如果没有有效数据，显示错误信息
  if (finalNasdaqValues.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>纳斯达克指数</Text>
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

  // 自动计算Y轴范围
  const minValue = Math.min(...finalNasdaqValues);
  const maxValue = Math.max(...finalNasdaqValues);
  const range = maxValue - minValue;
  const padding = range * 0.1; // 10%的边距
  const yMin = Math.max(0, minValue - padding);
  const yMax = maxValue + padding;

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
          label: '纳斯达克指数',
          data: finalNasdaqValues,
          borderColor: '#34C759',
          backgroundColor: 'rgba(52, 199, 89, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#34C759',
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
          borderColor: '#34C759',
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
              const description = NasdaqService.getNasdaqDescription(value);
              return `纳斯达克: ${NasdaqService.formatNasdaqValue(value)} (${description})`;
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
          min: yMin,
          max: yMax,
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
              return NasdaqService.formatNasdaqValue(value);
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
          <Text style={styles.title}>纳斯达克指数</Text>
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
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(142, 142, 147, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '0', // 隐藏数据点
      strokeWidth: '0',
    },
    propsForBackgroundLines: {
      strokeDasharray: "5,5",
      stroke: "rgba(142, 142, 147, 0.2)",
      strokeWidth: 1
    },
    formatYLabel: (value: string) => {
      const num = parseFloat(value);
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    },
    formatXLabel: (value: string) => {
      return value;
    }
  };

  const data = {
    labels: labels.length > 8 ? labels.filter((_, index) => index % Math.ceil(labels.length / 8) === 0) : labels,
    datasets: [
      {
        data: finalNasdaqValues.length > 8 ? 
          finalNasdaqValues.filter((_, index) => index % Math.ceil(finalNasdaqValues.length / 8) === 0) : 
          finalNasdaqValues,
        color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>纳斯达克指数</Text>
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
          withDots={false}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          segments={4}
          fromZero={false}
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

export default NasdaqChart;
