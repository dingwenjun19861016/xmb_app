import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { LineChart as RNLineChart } from 'react-native-chart-kit';
import { CoinInfo } from '../../services/CoinInfoService';
import { DateUtils } from '../../utils/dateUtils';
// 仅在Web环境中导入Chart.js相关库
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useChartType } from '../../contexts/ChartTypeContext';


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

// 图表类型管理已移至全局Context

// 时间周期选项
const TIME_PERIODS = ['24h', '7d', '30d', '90d', '1y', 'ALL'];

interface CoinPriceChartProps {
  historicalData: CoinInfo[];
  selectedTimePeriod: string;
  onTimePeriodChange: (period: string) => void;
  isPositive: boolean;
  showRankChart?: boolean; // 新增：是否显示排名曲线
}

const CoinPriceChart: React.FC<CoinPriceChartProps> = ({
  historicalData,
  selectedTimePeriod,
  onTimePeriodChange,
  isPositive,
  showRankChart = false
}) => {
  // 获取当前币种名称
  const currentCoinName = React.useMemo(() => {
    return historicalData.length > 0 ? (historicalData[0].name || 'unknown') : 'unknown';
  }, [historicalData]);
  
  // 使用全局Context管理图表类型
  const { getChartType, setChartType } = useChartType();
  
  // 获取当前图表类型
  const getChartTypeForCoin = () => getChartType(currentCoinName);
  
  // 设置图表类型
  const setChartTypeForCoin = (newType: 'price' | 'rank') => {
    setChartType(currentCoinName, newType);
  };
  
  // 获取屏幕宽度
  const screenWidth = Dimensions.get('window').width - 30;
  
  // 当币种变化时，记录一下当前选择的图表类型
  React.useEffect(() => {
    console.log('🔄 CoinPriceChart: 币种切换，当前图表类型', {
      coinName: currentCoinName,
      chartType: getChartTypeForCoin()
    });
  }, [currentCoinName]);

  // 处理时间周期变化
  const handleTimePeriodChange = (period: string) => {
    console.log('📅 CoinPriceChart: 时间周期变化', {
      from: selectedTimePeriod,
      to: period,
      currentChartType: getChartTypeForCoin()
    });
    
    // 调用父组件的时间周期变化处理函数
    onTimePeriodChange(period);
  };
  
  // 根据图表类型过滤时间周期选项
  const getAvailableTimePeriods = () => {
    // 排名图表不显示24h选项，因为排名的24h变化意义不大
    // 排名更关注中长期趋势（7d, 30d, 90d, 1y, ALL）
    if (getChartTypeForCoin() === 'rank') {
      return TIME_PERIODS.filter(period => period !== '24h');
    }
    // 价格图表显示所有时间周期选项
    return TIME_PERIODS;
  };

  // 处理图表类型切换 - 简化版本
  // 价格图表：默认24h，用户可自由调整
  // 排名图表：默认7d，用户可自由调整
  const handleChartTypeChange = (type: 'price' | 'rank') => {
    console.log('📊 CoinPriceChart: 用户切换图表类型', {
      from: getChartTypeForCoin(),
      to: type,
      coinName: currentCoinName
    });
    
    // 切换图表类型
    setChartTypeForCoin(type);
    
    // 根据图表类型设置默认时间周期
    if (type === 'price') {
      // 价格图表默认24h
      onTimePeriodChange('24h');
    } else if (type === 'rank') {
      // 排名图表默认7d
      onTimePeriodChange('7d');
    }
  };
  const formatPrice = (value: number): string => {
    if (value < 0.000001) return `$${value.toExponential(4)}`; // 极小值用科学计数法
    if (value < 0.01) return `$${value.toFixed(8)}`;
    if (value < 1) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(2)}`;
  };

  // 如果没有数据，显示空视图
  if (!historicalData || historicalData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.timePeriodContainer}>
          {getAvailableTimePeriods().map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.timePeriodButton,
                selectedTimePeriod === period && styles.selectedTimePeriodButton
              ]}
              onPress={() => handleTimePeriodChange(period)}
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
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No chart data available</Text>
        </View>
      </View>
    );
  }

  // 提取价格和日期数据
  const priceData = historicalData.map(item => {
    // 确保价格数据有效，使用字符串处理来保留精度
    const priceStr = item.currentPrice || '0';
    // 使用Number而不是parseFloat，以便更好地处理小数精度
    // 同时使用toFixed(8)限制小数位数，避免显示过长的小数
    const price = Number(priceStr);
    return isNaN(price) ? 0 : price;
  }); // Don't filter out 0 prices yet - keep all data points for proper chart rendering
  
  console.log('🔍 CoinPriceChart: Processing price data:', {
    historicalDataLength: historicalData.length,
    historicalDataSample: historicalData.slice(0, 3).map(item => ({
      currentPrice: item.currentPrice,
      date: item.date,
      name: item.name,
      timestamp: item.timestamp
    })),
    rawPriceData: priceData.slice(0, 10),
    priceDataLength: priceData.length,
    selectedTimePeriod,
    validPriceCount: priceData.filter(price => price > 0).length,
    timeRange: historicalData.length > 1 ? {
      start: historicalData[0]?.date,
      end: historicalData[historicalData.length - 1]?.date,
      startTime: DateUtils.format24hTime(historicalData[0]?.date),
      endTime: DateUtils.format24hTime(historicalData[historicalData.length - 1]?.date)
    } : null
  });
  
  // 提取排名数据，确保数据有效性
  const rankData = historicalData.map(item => {
    if (!item.rank) return 0;
    const rank = typeof item.rank === 'number' ? item.rank : parseInt(item.rank.toString(), 10);
    return isNaN(rank) || rank <= 0 ? 0 : rank;
  }); // Don't filter out invalid ranks yet - keep all data points for proper chart rendering
  
  // 检查数据有效性
  const hasValidPriceData = priceData.filter(price => price > 0).length > 0;
  const hasValidRankData = rankData.filter(rank => rank > 0).length > 0;
  
  // 添加详细的数据日志
  console.log('📊 CoinPriceChart: 数据处理结果', {
    totalDataLength: historicalData.length,
    priceDataLength: priceData.length,
    rankDataLength: rankData.length,
    hasValidPriceData,
    hasValidRankData,
    chartType: getChartTypeForCoin(),
    selectedTimePeriod
  });
  
  // 当历史数据更新时，记录数据状态
  React.useEffect(() => {
    console.log('📊 CoinPriceChart: 数据更新', {
      dataLength: historicalData.length,
      chartType: getChartTypeForCoin(),
      hasValidPriceData,
      hasValidRankData,
      selectedTimePeriod
    });
  }, [historicalData, hasValidPriceData, hasValidRankData, selectedTimePeriod]);
  
  // 移除自动切换的useEffect，避免在数据加载过程中意外切换图表类型
  
  // 获取日期标签，根据时间周期选择不同的格式化方式
  const dateLabels = historicalData.map(item => {
    if (!item.date) return '';
    // 如果是24h视图，显示时间；其他视图显示日期
    if (selectedTimePeriod === '24h') {
      return DateUtils.format24hTime(item.date);
    } else {
      return DateUtils.formatSimpleDate(item.date);
    }
  });
  
  // 根据当前图表类型决定显示的数据
  let displayData = getChartTypeForCoin() === 'price' ? priceData : rankData;
  
  // For price data, if we have mostly 0 values, replace them with the nearest valid value
  if (getChartTypeForCoin() === 'price' && displayData.some(val => val === 0)) {
    let lastValidPrice = displayData.find(val => val > 0) || 1; // Use first valid price as fallback
    displayData = displayData.map(price => price > 0 ? price : lastValidPrice);
  }
  
  console.log('🔍 CoinPriceChart: Final display data:', {
    chartType: getChartTypeForCoin(),
    displayDataLength: displayData.length,
    displayDataSample: displayData.slice(0, 10),
    dateLabelsLength: dateLabels.length,
    dateLabelsample: dateLabels.slice(0, 10)
  });
  
  const dataColor = getChartTypeForCoin() === 'price' ? 
    (isPositive ? '#00C853' : '#FF5252') : 
    '#FF9800'; // 排名使用橙色
  
  // 如果没有有效数据，显示错误信息
  if (!hasValidPriceData && !hasValidRankData) {
    return (
      <View style={styles.container}>
        <View style={styles.timePeriodContainer}>
          {getAvailableTimePeriods().map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.timePeriodButton,
                selectedTimePeriod === period && styles.selectedTimePeriodButton
              ]}
              onPress={() => handleTimePeriodChange(period)}
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
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No valid data available</Text>
        </View>
      </View>
    );
  }
  
  // 如果当前图表类型没有有效数据，显示切换提示
  if ((getChartTypeForCoin() === 'price' && !hasValidPriceData) || (getChartTypeForCoin() === 'rank' && !hasValidRankData)) {
    return (
      <View style={styles.container}>
        {/* 图表类型切换按钮 */}
        {showRankChart && (hasValidPriceData || hasValidRankData) && (
          <View style={styles.chartTypeContainer}>
            <TouchableOpacity
              style={[
                styles.chartTypeButton,
                getChartTypeForCoin() === 'price' && styles.selectedChartTypeButton
              ]}
              onPress={() => hasValidPriceData && handleChartTypeChange('price')}
              disabled={!hasValidPriceData}
            >
              <Text style={[
                styles.chartTypeText,
                getChartTypeForCoin() === 'price' && styles.selectedChartTypeText,
                !hasValidPriceData && styles.disabledChartTypeText
              ]}>
                价格
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.chartTypeButton,
                getChartTypeForCoin() === 'rank' && styles.selectedChartTypeButton
              ]}
              onPress={() => hasValidRankData && handleChartTypeChange('rank')}
              disabled={!hasValidRankData}
            >
              <Text style={[
                styles.chartTypeText,
                getChartTypeForCoin() === 'rank' && styles.selectedChartTypeText,
                !hasValidRankData && styles.disabledChartTypeText
              ]}>
                排名
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.timePeriodContainer}>
          {getAvailableTimePeriods().map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.timePeriodButton,
                selectedTimePeriod === period && styles.selectedTimePeriodButton
              ]}
              onPress={() => handleTimePeriodChange(period)}
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
        
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            {getChartTypeForCoin() === 'price' ? '价格数据不可用' : '排名数据不可用'}
          </Text>
        </View>
      </View>
    );
  }

  // 为了避免标签过于拥挤，我们只显示几个关键标签
  // 24h模式下显示更多标签（每隔2-3小时），其他模式保持原样
  const maxLabels = selectedTimePeriod === '24h' ? 8 : 5;
  const step = Math.max(1, Math.floor(dateLabels.length / maxLabels));
  
  const displayLabels = dateLabels.map((label, index) => 
    index % step === 0 ? label : ''
  );

  // 图表颜色设置
  const chartColor = dataColor;
  
  // 图表数据配置
  const data = {
    labels: displayLabels,
    datasets: [
      {
        data: displayData,
        color: () => chartColor,
        strokeWidth: selectedTimePeriod === '24h' ? 1.5 : 2, // 24h图表使用更细的线条
      }
    ],
    legend: [getChartTypeForCoin() === 'price' ? 'Price' : 'Rank']
  };
  
  // 添加详细的图表数据调试信息
  console.log('📊 CoinPriceChart: Final chart data:', {
    selectedTimePeriod,
    chartType: getChartTypeForCoin(),
    labelsLength: displayLabels.length,
    dataLength: displayData.length,
    labels: displayLabels,
    data: displayData,
    dataIsValid: displayData.every(d => !isNaN(d) && d > 0),
    minValue: Math.min(...displayData),
    maxValue: Math.max(...displayData),
    dataRange: Math.max(...displayData) - Math.min(...displayData)
  });

  // 格式化排名显示
  const formatRank = (value: number): string => {
    return `#${Math.round(value)}`;
  };

  // 格式化函数选择
  const formatValue = getChartTypeForCoin() === 'price' ? formatPrice : formatRank;

  // 图表配置
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    // 根据图表类型和时间周期调整小数位数
    decimalPlaces: getChartTypeForCoin() === 'price' ? 
      (selectedTimePeriod === '24h' ? 2 : // 24小时模式简化为2位小数
        (priceData.some(price => price < 0.0001) ? 8 : 
         priceData.some(price => price < 0.01) ? 6 : 
         priceData.some(price => price < 1) ? 4 : 2)) : 0,
    color: () => chartColor,
    labelColor: () => '#666666',
    style: {
      borderRadius: 16
    },
    // 自定义格式化
    formatYLabel: (value) => formatValue(parseFloat(value)),
    propsForDots: {
      r: selectedTimePeriod === '24h' ? '3' : '4', // 24h模式使用更小的点
      strokeWidth: selectedTimePeriod === '24h' ? '1' : '2',
      stroke: chartColor
    },
    propsForBackgroundLines: {
      strokeDasharray: '' // 实线网格
    },
    fillShadowGradientFrom: chartColor,
    fillShadowGradientFromOpacity: 0.4, // 起始透明度
    fillShadowGradientTo: chartColor,
    fillShadowGradientToOpacity: 0.1, // 结束透明度
    fillShadowGradientOpacity: 0.2, // 整体透明度
    // 确保显示所有数据点
    withDots: true,
    withShadow: true,
    withScrollableDot: false,
    withInnerLines: true,
    withOuterLines: true,
    withVerticalLabels: true,
    withHorizontalLabels: true
  };

  return (
    <View style={styles.container}>
      {/* 图表类型切换按钮 */}
      {showRankChart && (hasValidPriceData || hasValidRankData) && (
        <View style={styles.chartTypeContainer}>
          <TouchableOpacity
            style={[
              styles.chartTypeButton,
              getChartTypeForCoin() === 'price' && styles.selectedChartTypeButton
            ]}
            onPress={() => hasValidPriceData && handleChartTypeChange('price')}
            disabled={!hasValidPriceData}
          >
            <Text style={[
              styles.chartTypeText,
              getChartTypeForCoin() === 'price' && styles.selectedChartTypeText,
              !hasValidPriceData && styles.disabledChartTypeText
            ]}>
              价格
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chartTypeButton,
              getChartTypeForCoin() === 'rank' && styles.selectedChartTypeButton
            ]}
            onPress={() => hasValidRankData && handleChartTypeChange('rank')}
            disabled={!hasValidRankData}
          >
            <Text style={[
              styles.chartTypeText,
              getChartTypeForCoin() === 'rank' && styles.selectedChartTypeText,
              !hasValidRankData && styles.disabledChartTypeText
            ]}>
              排名
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.timePeriodContainer}>
        {getAvailableTimePeriods().map(period => (
          <TouchableOpacity
            key={period}
            style={[
              styles.timePeriodButton,
              selectedTimePeriod === period && styles.selectedTimePeriodButton
            ]}
            onPress={() => handleTimePeriodChange(period)}
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
      
{Platform.OS === 'web' ? (
        // Web环境使用react-chartjs-2
        <View style={{height: 220, width: screenWidth}}>
          {/* Add debugging info for web charts */}
          {console.log('🌐 CoinPriceChart Web: Chart.js data', {
            selectedTimePeriod,
            chartType: getChartTypeForCoin(),
            labelsCount: displayLabels.length,
            dataCount: displayData.length,
            labelsPreview: displayLabels.slice(0, 5),
            dataPreview: displayData.slice(0, 5),
            allLabels: displayLabels,
            allData: displayData
          })}
          <Line
            data={{
              labels: displayLabels,
              datasets: [
                {
                  label: getChartTypeForCoin() === 'price' ? 'Price' : 'Rank',
                  data: displayData,
                  borderColor: chartColor,
                  backgroundColor: `${chartColor}33`, // 添加透明度
                  borderWidth: selectedTimePeriod === '24h' ? 1.5 : 2, // 24h使用更细的线
                  pointRadius: 0, // 隐藏所有数据点，让图表更平滑
                  pointBackgroundColor: chartColor,
                  fill: getChartTypeForCoin() === 'rank' ? 'start' : 'origin', // 排名图表填充到顶部，价格图表填充到底部
                  tension: 0.4 // 控制曲线平滑程度
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: {
                intersect: false,
                mode: 'index',
              },
              scales: {
                y: {
                  // 排名图表需要反转Y轴（排名越小越好，显示在上方）
                  reverse: getChartTypeForCoin() === 'rank',
                  ticks: {
                    // 使用格式化函数
                    callback: (value) => formatValue(Number(value)),
                    maxTicksLimit: selectedTimePeriod === '24h' ? 8 : 6 // 24h模式显示更多刻度
                  },
                  grid: {
                    display: true
                  }
                },
                x: {
                  grid: {
                    display: false
                  },
                  ticks: {
                    maxTicksLimit: selectedTimePeriod === '24h' ? 8 : 5 // 24h模式显示更多时间标签
                  }
                }
              },
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  callbacks: {
                    label: (context) => `${formatValue(context.parsed.y)}`,
                    title: (context) => {
                      const index = context[0]?.dataIndex;
                      if (index !== undefined && historicalData[index]) {
                        return selectedTimePeriod === '24h' ? 
                          DateUtils.format24hTime(historicalData[index].date) :
                          DateUtils.formatSimpleDate(historicalData[index].date);
                      }
                      return context[0]?.label || '';
                    }
                  }
                },
                filler: {
                  propagate: false
                }
              },
              elements: {
                line: {
                  fill: getChartTypeForCoin() === 'rank' ? 'start' : 'origin'
                }
              }
            }}
          />
        </View>
      ) : (
        // 移动环境使用react-native-chart-kit
        <RNLineChart
          data={data}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          bezier // 使用贝塞尔曲线，使图表更平滑
          style={styles.chart}
          withHorizontalLines={true}
          withVerticalLines={false}
          withDots={false} // 隐藏所有数据点，让图表更平滑
          withShadow={true} // 启用阴影填充效果
          withInnerLines={false}
          withOuterLines={true}
          fromZero={false} // 不从0开始，而是根据数据的最小值自动设置
          yAxisLabel={getChartTypeForCoin() === 'price' ? "$" : "#"}
          yAxisInterval={1}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 15
  },
  chartTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 4,
  },
  chartTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  selectedChartTypeButton: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedChartTypeText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledChartTypeText: {
    color: '#CCC',
  },
  timePeriodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15
  },
  timePeriodButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15
  },
  selectedTimePeriodButton: {
    backgroundColor: '#E8F0FE'
  },
  timePeriodText: {
    fontSize: 14,
    color: '#666'
  },
  selectedTimePeriodText: {
    color: '#007AFF',
    fontWeight: '500'
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  noDataContainer: {
    height: 220,
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

export default CoinPriceChart;
