import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { USBond10YRData, USBond10YRService } from '../../services/data';

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

const { width } = Dimensions.get('window');

interface USBond10YRChartProps {
  historicalData: USBond10YRData[];
  selectedTimePeriod: string;
  onTimePeriodChange: (period: string) => void;
}

const USBond10YRChart: React.FC<USBond10YRChartProps> = ({
  historicalData,
  selectedTimePeriod,
  onTimePeriodChange,
}) => {
  const timePeriods = ['30天', '60天', '90天'];

  const renderTimePeriodSelector = () => (
    <View style={styles.selectorContainer}>
      {timePeriods.map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.selectorButton,
            selectedTimePeriod === period && styles.selectorButtonActive,
          ]}
          onPress={() => onTimePeriodChange(period)}
        >
          <Text
            style={[
              styles.selectorText,
              selectedTimePeriod === period && styles.selectorTextActive,
            ]}
          >
            {period}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderChart = () => {
    if (!historicalData || historicalData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>暂无历史数据</Text>
        </View>
      );
    }

    // 准备图表数据
    const sortedData = [...historicalData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const labels = sortedData.map(item => {
      const date = new Date(item.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const values = sortedData.map(item => 
      USBond10YRService.parseUSBond10YRValue(item.us10yrbond)
    );

    // 计算Y轴范围
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const padding = (maxValue - minValue) * 0.1;
    const yMin = Math.max(0, minValue - padding);
    const yMax = maxValue + padding;

    if (Platform.OS === 'web') {
      // Web平台使用Chart.js      
      const chartData = {
        labels,
        datasets: [
          {
            label: '美债10年期收益率',
            data: values,
            borderColor: '#007AFF',
            backgroundColor: 'rgba(0, 122, 255, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
          },
        ],
      };

      const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            display: true,
            grid: {
              display: false,
            },
            ticks: {
              maxTicksLimit: 6,
              color: '#6C757D',
              font: {
                size: 11,
              },
            },
          },
          y: {
            display: true,
            min: yMin,
            max: yMax,
            grid: {
              color: 'rgba(108, 117, 125, 0.1)',
            },
            ticks: {
              callback: function(value: any) {
                return value.toFixed(2) + '%';
              },
              color: '#6C757D',
              font: {
                size: 11,
              },
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: '#007AFF',
            borderWidth: 1,
            callbacks: {
              label: function(context: any) {
                return `收益率: ${context.parsed.y.toFixed(3)}%`;
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
        <View style={styles.chartContainer}>
          <Line data={chartData} options={options} height={200} />
        </View>
      );
    } else {
      // 移动端显示简化版本
      const currentValue = values[values.length - 1] || 0;
      const previousValue = values[values.length - 2] || currentValue;
      const change = currentValue - previousValue;
      const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;

      return (
        <View style={styles.mobileChartContainer}>
          <View style={styles.valueRow}>
            <Text style={styles.currentValueLabel}>当前收益率</Text>
            <Text style={[styles.currentValue, { color: USBond10YRService.getUSBond10YRColor(currentValue) }]}>
              {currentValue.toFixed(3)}%
            </Text>
          </View>
          
          <View style={styles.valueRow}>
            <Text style={styles.changeLabel}>较上期变化</Text>
            <Text style={[
              styles.changeValue,
              { color: change >= 0 ? '#FF3B30' : '#34C759' }
            ]}>
              {change >= 0 ? '+' : ''}{change.toFixed(3)}% 
              ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              {historicalData.length} 条记录 | 最近更新: {
                new Date(historicalData[0]?.date || '').toLocaleDateString('zh-CN')
              }
            </Text>
          </View>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>历史走势</Text>
        {renderTimePeriodSelector()}
      </View>
      {renderChart()}
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

  selectorContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 2,
  },

  selectorButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  selectorButtonActive: {
    backgroundColor: '#007AFF',
  },

  selectorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6C757D',
  },

  selectorTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  chartContainer: {
    height: 200,
    width: '100%',
  },

  mobileChartContainer: {
    paddingVertical: 16,
  },

  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  currentValueLabel: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
  },

  currentValue: {
    fontSize: 18,
    fontWeight: '700',
  },

  changeLabel: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
  },

  changeValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  summaryRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  summaryText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },

  noDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },

  noDataText: {
    fontSize: 16,
    color: '#8E8E93',
  },
});

export default USBond10YRChart;
