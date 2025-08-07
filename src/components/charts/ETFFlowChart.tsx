import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { LineChart as RNLineChart } from 'react-native-chart-kit';
import { ETFFlowData } from '../../services/data/ETFService';

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

interface ETFFlowChartProps {
  flowData: ETFFlowData[];
  title?: string;
  selectedTimePeriod?: string;
  onTimePeriodChange?: (period: string) => void;
}

const ETFFlowChart: React.FC<ETFFlowChartProps> = ({
  flowData,
  title = 'ETF资金流入/流出',
  selectedTimePeriod = '30天',
  onTimePeriodChange
}) => {
  // 获取屏幕宽度
  const screenWidth = Dimensions.get('window').width - 48; // 减去容器的左右margin
  
  // 添加调试日志
  console.log('📊 ETFFlowChart: Received flowData:', flowData);
  console.log('📊 ETFFlowChart: Data length:', flowData?.length || 0);
  
  // 如果没有数据，显示空视图
  if (!flowData || flowData.length === 0) {
    console.log('⚠️ ETFFlowChart: No data available');
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.timePeriodContainer}>
            {TIME_PERIODS.map(period => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.timePeriodButton,
                  selectedTimePeriod === period && styles.selectedTimePeriodButton
                ]}
                onPress={() => onTimePeriodChange?.(period)}
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
          <Text style={styles.noDataText}>暂无数据</Text>
        </View>
      </View>
    );
  }

  // 格式化金额显示
  const formatAmount = (value: number): string => {
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(2)}B`;
    } else if (Math.abs(value) >= 1) {
      return `${value.toFixed(2)}M`;
    } else {
      return `${(value * 1000).toFixed(0)}K`;
    }
  };
  
  // 提取标签和数据 - 显示多个关键时间点
  const labels = flowData.map((item, index) => {
    const totalPoints = flowData.length;
    const daysAgo = parseInt(selectedTimePeriod || '30');
    
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
    return ''; // 其他位置不显示标签
  });
  const data = flowData.map(item => item.value);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.timePeriodContainer}>
          {TIME_PERIODS.map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.timePeriodButton,
                selectedTimePeriod === period && styles.selectedTimePeriodButton
              ]}
              onPress={() => onTimePeriodChange?.(period)}
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
        <View style={{ height: 300, width: screenWidth }}>
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: 'ETF资金流向',
                  data,
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
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
                },
                tooltip: {
                  mode: 'index',
                  intersect: false,
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  titleColor: '#FFFFFF',
                  bodyColor: '#FFFFFF',
                  callbacks: {
                    label: (context) => `${context.parsed.y > 0 ? '+' : ''}${formatAmount(context.parsed.y)}`
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: false,
                  grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                    drawBorder: false,
                  },
                  ticks: {
                    color: '#8E8E93',
                    font: {
                      size: 12,
                    },
                    callback: function(value: any) {
                      return formatAmount(Number(value));
                    },
                  },
                },
                x: {
                  grid: {
                    display: false,
                  },
                  ticks: {
                    color: '#8E8E93',
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
              },
              interaction: {
                mode: 'index',
                intersect: false,
              },
              elements: {
                point: {
                  hoverRadius: 8,
                },
              },
            }}
          />
        </View>
      ) : (
        // 移动环境使用react-native-chart-kit
        <View style={styles.mobileChartWrapper}>
          <RNLineChart
            data={{
              labels,
              datasets: [
                {
                  data,
                  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                  strokeWidth: 3,
                }
              ]
            }}
            width={screenWidth}
            height={300}
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(142, 142, 147, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '0',
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
              formatYLabel: (value) => formatAmount(parseFloat(value)),
              formatXLabel: (value: string, index: number) => {
                // 自定义X轴标签格式化
                const totalPoints = labels.length;
                const daysAgo = parseInt(selectedTimePeriod || '30');
                
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
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  timePeriodContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
  },
  timePeriodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginHorizontal: 1,
  },
  selectedTimePeriodButton: {
    backgroundColor: '#007AFF',
  },
  timePeriodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  selectedTimePeriodText: {
    color: '#FFFFFF',
  },
  mobileChartWrapper: {
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  noDataContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 16
  },
  noDataText: {
    fontSize: 16,
    color: '#999'
  }
});

export default ETFFlowChart;
