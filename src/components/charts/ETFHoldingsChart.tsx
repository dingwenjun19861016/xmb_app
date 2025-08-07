import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { LineChart as RNLineChart } from 'react-native-chart-kit';
import { ETFHoldingsData } from '../../services/data/ETFService';

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

interface ETFHoldingsChartProps {
  holdingsData: ETFHoldingsData[];
  title?: string;
}

const ETFHoldingsChart: React.FC<ETFHoldingsChartProps> = ({
  holdingsData,
  title = 'ETF持仓量'
}) => {
  // 获取屏幕宽度
  const screenWidth = Dimensions.get('window').width - 40;
  
  // 如果没有数据，显示空视图
  if (!holdingsData || holdingsData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No chart data available</Text>
        </View>
      </View>
    );
  }

  // 格式化持仓量显示
  const formatHoldings = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    } else {
      return value.toString();
    }
  };
  
  // 提取标签和数据
  const labels = holdingsData.map(item => {
    // 格式化日期为月/日
    const date = new Date(item.date);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  });
  
  const btcData = holdingsData.map(item => item.btcHoldings);
  const ethData = holdingsData.map(item => item.ethHoldings || 0);
  const hasEthData = ethData.some(value => value > 0);

  // 图表颜色
  const btcColor = '#F7931A'; // Bitcoin orange
  const ethColor = '#627EEA'; // Ethereum blue

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      {Platform.OS === 'web' ? (
        // Web环境使用react-chartjs-2
        <View style={{ height: 300, width: screenWidth }}>
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: 'BTC Holdings',
                  data: btcData,
                  borderColor: btcColor,
                  backgroundColor: `${btcColor}20`,
                  borderWidth: 2,
                  fill: true,
                  pointRadius: holdingsData.length < 10 ? 4 : 0,
                  tension: 0.4
                },
                ...(hasEthData ? [{
                  label: 'ETH Holdings',
                  data: ethData,
                  borderColor: ethColor,
                  backgroundColor: `${ethColor}20`,
                  borderWidth: 2,
                  fill: true,
                  pointRadius: holdingsData.length < 10 ? 4 : 0,
                  tension: 0.4
                }] : [])
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: false,
                  ticks: {
                    callback: (value) => formatHoldings(Number(value))
                  }
                },
                x: {
                  grid: {
                    display: false
                  }
                }
              },
              plugins: {
                legend: {
                  position: 'top' as const,
                  labels: {
                    usePointStyle: true,
                    boxWidth: 6
                  }
                },
                tooltip: {
                  callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatHoldings(context.parsed.y)}`
                  }
                }
              }
            }}
          />
        </View>
      ) : (
        // 移动环境使用react-native-chart-kit
        <RNLineChart
          data={{
            labels,
            datasets: [
              {
                data: btcData,
                color: () => btcColor,
                strokeWidth: 2
              },
              ...(hasEthData ? [{
                data: ethData,
                color: () => ethColor,
                strokeWidth: 2
              }] : [])
            ],
            legend: ['BTC', ...(hasEthData ? ['ETH'] : [])]
          }}
          width={screenWidth}
          height={300}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            },
            formatYLabel: (value) => formatHoldings(parseFloat(value)),
            propsForDots: {
              r: holdingsData.length < 10 ? '4' : '0',
              strokeWidth: '2'
            },
            propsForBackgroundLines: {
              strokeDasharray: '' // 实线网格
            }
          }}
          bezier // 使用贝塞尔曲线，使图表更平滑
          style={styles.chart}
          withHorizontalLines={true}
          withVerticalLines={false}
          withDots={holdingsData.length < 10}
          withShadow={false}
          withInnerLines={false}
          withOuterLines={true}
          fromZero={false}
          yAxisInterval={1}
          formatYLabel={(value) => formatHoldings(parseFloat(value))}
        />
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1A1A1A'
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

export default ETFHoldingsChart;
