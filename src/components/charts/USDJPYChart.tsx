import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { USDJPYData } from '../../services/data';

// 根据平台导入不同的图表库
let Chart: any, Line: any;
if (Platform.OS === 'web') {
  const ChartJS = require('chart.js');
  const {
    Chart: ChartClass,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  } = ChartJS;
  
  // 注册 Chart.js 组件
  ChartClass.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  );
  
  const { Line: LineChart } = require('react-chartjs-2');
  Chart = ChartClass;
  Line = LineChart;
}

const { width } = Dimensions.get('window');

interface USDJPYChartProps {
  historicalData: USDJPYData[];
  selectedTimePeriod: string;
  onTimePeriodChange: (period: string) => void;
}

const USDJPYChart: React.FC<USDJPYChartProps> = ({
  historicalData,
  selectedTimePeriod,
  onTimePeriodChange
}) => {
  const [chartData, setChartData] = useState<any>(null);
  const timePeriods = ['30天', '60天', '90天'];

  useEffect(() => {
    if (historicalData && historicalData.length > 0) {
      prepareChartData();
    }
  }, [historicalData]);

  const prepareChartData = () => {
    try {
      // 按日期排序（从旧到新）
      const sortedData = [...historicalData].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const labels = sortedData.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      });

      const values = sortedData.map(item => {
        const value = typeof item.usdjpy === 'string' 
          ? parseFloat(item.usdjpy) 
          : item.usdjpy;
        return isNaN(value) ? 0 : value;
      });

      // 计算数据范围
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const padding = (maxValue - minValue) * 0.1;

      if (Platform.OS === 'web' && Line) {
        const data = {
          labels,
          datasets: [
            {
              label: 'USD/JPY',
              data: values,
              borderColor: '#007AFF',
              backgroundColor: 'rgba(0, 122, 255, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointHoverBackgroundColor: '#007AFF',
              pointHoverBorderColor: '#FFFFFF',
              pointHoverBorderWidth: 2,
            }
          ]
        };

        const options = {
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
              borderColor: '#007AFF',
              borderWidth: 1,
              cornerRadius: 8,
              displayColors: false,
              callbacks: {
                title: function(context: any) {
                  return `日期: ${context[0].label}`;
                },
                label: function(context: any) {
                  return `汇率: ¥${context.parsed.y.toFixed(2)}`;
                }
              }
            },
          },
          interaction: {
            mode: 'nearest' as const,
            axis: 'x' as const,
            intersect: false,
          },
          scales: {
            x: {
              display: true,
              grid: {
                display: false,
              },
              ticks: {
                color: '#6C757D',
                font: {
                  size: 12,
                },
                maxTicksLimit: 6,
              },
            },
            y: {
              display: true,
              min: Math.max(0, minValue - padding),
              max: maxValue + padding,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)',
              },
              ticks: {
                color: '#6C757D',
                font: {
                  size: 12,
                },
                callback: function(value: any) {
                  return `¥${value.toFixed(1)}`;
                },
              },
            },
          },
        };

        setChartData({ data, options });
      }
    } catch (error) {
      console.error('💴 USDJPYChart: Error preparing chart data:', error);
    }
  };

  const renderChart = () => {
    if (!historicalData || historicalData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>暂无历史数据</Text>
        </View>
      );
    }

    if (Platform.OS === 'web' && Line && chartData) {
      return (
        <div style={{ height: '200px', width: '100%' }}>
          <Line data={chartData.data} options={chartData.options} />
        </div>
      );
    }

    // 移动端简化显示
    return (
      <View style={styles.mobileChartContainer}>
        <Text style={styles.mobileChartText}>
          {historicalData.length > 0 && `当前汇率: ¥${historicalData[0]?.usdjpy || '0.00'}`}
        </Text>
        <Text style={styles.mobileChartSubtext}>
          {historicalData.length} 条历史记录
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>历史走势</Text>
        <View style={styles.periodSelector}>
          {timePeriods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedTimePeriod === period && styles.periodButtonActive
              ]}
              onPress={() => onTimePeriodChange(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedTimePeriod === period && styles.periodButtonTextActive
                ]}
              >
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.chartContainer}>
        {renderChart()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 2,
  },

  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  periodButtonActive: {
    backgroundColor: '#007AFF',
  },

  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C757D',
  },

  periodButtonTextActive: {
    color: '#FFFFFF',
  },

  chartContainer: {
    height: 200,
    width: '100%',
  },

  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  noDataText: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
  },

  mobileChartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  mobileChartText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },

  mobileChartSubtext: {
    fontSize: 14,
    color: '#6C757D',
  },
});

export default USDJPYChart;
