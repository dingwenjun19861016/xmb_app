import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

// 假设的数据详情类型
interface DataDetail {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  date: string;
  source: string;
  stats: {
    current: string;
    previous: string;
    change: string;
    isPositive: boolean;
  };
  historicalData: {
    date: string;
    value: number;
  }[];
  relatedMetrics: {
    id: string;
    title: string;
    value: string;
    change: string;
    isPositive: boolean;
  }[];
  analysis: string;
}

const DataDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params as { id: string };
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DataDetail | null>(null);

  useEffect(() => {
    fetchDataDetail();
  }, [id]);

  const fetchDataDetail = async () => {
    try {
      setLoading(true);
      // 这里是模拟数据，实际应用中应该调用API
      const mockData: DataDetail = {
        id,
        title: 'DeFi总锁仓量(TVL)',
        description: '去中心化金融(DeFi)生态系统中锁定的总价值达到45.78亿美元，较上周增长4.2%。这一增长主要由以太坊和Solana网络的DeFi项目推动。',
        imageUrl: 'https://example.com/defi-tvl.png',
        category: 'TVL',
        date: '2025-04-21',
        source: 'DeFi Llama',
        stats: {
          current: '$45.78B',
          previous: '$43.94B',
          change: '+4.2%',
          isPositive: true
        },
        historicalData: [
          { date: '2025-04-14', value: 43.94 },
          { date: '2025-04-15', value: 44.12 },
          { date: '2025-04-16', value: 44.56 },
          { date: '2025-04-17', value: 44.87 },
          { date: '2025-04-18', value: 45.21 },
          { date: '2025-04-19', value: 45.43 },
          { date: '2025-04-20', value: 45.62 },
          { date: '2025-04-21', value: 45.78 }
        ],
        relatedMetrics: [
          {
            id: '101',
            title: '以太坊DeFi TVL',
            value: '$28.34B',
            change: '+3.8%',
            isPositive: true
          },
          {
            id: '102',
            title: 'Solana DeFi TVL',
            value: '$5.12B',
            change: '+7.2%',
            isPositive: true
          },
          {
            id: '103',
            title: '借贷协议TVL',
            value: '$14.25B',
            change: '+2.5%',
            isPositive: true
          }
        ],
        analysis: '近期DeFi总锁仓量持续上升，主要得益于市场情绪改善和新产品的推出。以太坊上的DeFi项目仍占据主导地位，但Solana网络的增长速度更为迅猛。随着Layer 2解决方案的采用增加，DeFi生态系统预计将继续扩张。值得注意的是，借贷协议的TVL增长相对较慢，表明用户正在探索更多收益机会，如流动性挖矿和收益聚合器。'
      };

      // 模拟网络延迟
      setTimeout(() => {
        setData(mockData);
        setLoading(false);
      }, 800);
    } catch (error) {
      console.error('Error fetching data detail:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>无法加载数据</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDataDetail}>
          <Text style={styles.retryButtonText}>重试</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>数据详情</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{data.title}</Text>
          <View style={styles.categoryTag}>
            <Text style={styles.categoryTagText}>{data.category}</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>当前数值</Text>
            <Text style={styles.statsDate}>更新于 {data.date}</Text>
          </View>
          <View style={styles.statsContent}>
            <Text style={styles.currentValue}>{data.stats.current}</Text>
            <View style={styles.changeContainer}>
              <Text style={styles.previousValue}>上期: {data.stats.previous}</Text>
              <Text
                style={[
                  styles.changeValue,
                  data.stats.isPositive ? styles.positiveChange : styles.negativeChange
                ]}
              >
                {data.stats.change} {data.stats.isPositive ? '↑' : '↓'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>简介</Text>
          <Text style={styles.description}>{data.description}</Text>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>详细分析</Text>
          <Text style={styles.analysisText}>{data.analysis}</Text>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>相关指标</Text>
          {data.relatedMetrics.map(metric => (
            <TouchableOpacity 
              key={metric.id}
              style={styles.relatedMetricItem}
              onPress={() => navigation.navigate('DataDetail', { id: metric.id })}
            >
              <Text style={styles.relatedMetricTitle}>{metric.title}</Text>
              <View style={styles.relatedMetricStats}>
                <Text style={styles.relatedMetricValue}>{metric.value}</Text>
                <Text
                  style={[
                    styles.relatedMetricChange,
                    metric.isPositive ? styles.positiveChange : styles.negativeChange
                  ]}
                >
                  {metric.change}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sourceContainer}>
          <Text style={styles.sourceText}>数据来源: {data.source}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#2A2D3E',
    borderBottomWidth: 1,
    borderBottomColor: '#3D4258',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C1C1E',
    flex: 1,
  },
  categoryTag: {
    backgroundColor: '#E6F3FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  categoryTagText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.84,
    elevation: 2,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statsDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  statsContent: {
    alignItems: 'flex-start',
  },
  currentValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previousValue: {
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 8,
  },
  changeValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  positiveChange: {
    color: '#34C759',
  },
  negativeChange: {
    color: '#FF3B30',
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.84,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 22,
  },
  analysisText: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 24,
  },
  relatedMetricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEF',
  },
  relatedMetricTitle: {
    fontSize: 15,
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
  },
  relatedMetricStats: {
    alignItems: 'flex-end',
  },
  relatedMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  relatedMetricChange: {
    fontSize: 14,
    marginTop: 2,
  },
  sourceContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  sourceText: {
    fontSize: 12,
    color: '#8E8E93',
  },
});

export default DataDetailScreen;