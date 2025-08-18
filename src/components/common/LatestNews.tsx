import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  image: string;
}

interface LatestNewsProps {
  news: NewsItem[];
  onViewAllPress?: () => void;
  loading?: boolean;
  error?: string | null;
  onArticlePress?: (article: NewsItem) => void; // 添加文章点击回调
  title?: string; // 添加标题配置
  viewMoreText?: string; // 添加查看更多按钮文本配置
}

const LatestNews: React.FC<LatestNewsProps> = ({ 
  news, 
  onViewAllPress, 
  loading = false, 
  error = null,
  onArticlePress,
  title = '最新资讯', // 添加默认标题
  viewMoreText = '查看全部 >' // 添加默认查看更多文本
}) => {
  const navigation = useNavigation();

  const renderNewsItem = ({ item }: { item: NewsItem }) => (
    <TouchableOpacity 
      style={styles.newsItem}
      onPress={() => {
        if (onArticlePress) {
          onArticlePress(item);
        } else {
          navigation.navigate('ArticleDetail', { articleId: item.id });
        }
      }}
    >
      <Image source={{ uri: item.image }} style={styles.newsImage} />
      <View style={styles.newsContent}>
        <View style={styles.newsCategoryContainer}>
          <Text style={styles.newsCategory}>{item.category}</Text>
          <Text style={styles.newsDate}>{item.date}</Text>
        </View>
        <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.newsSummary} numberOfLines={2}>{item.summary}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#1976D2" />
      <Text style={styles.loadingText}>加载新闻中...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={40} color="#FF3B30" />
      <Text style={styles.errorText}>加载失败</Text>
      <Text style={styles.errorSubText}>{error}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="newspaper-outline" size={40} color="#CCC" />
      <Text style={styles.emptyText}>暂无新闻</Text>
    </View>
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={onViewAllPress} style={styles.viewMoreButton}>
          <Text style={styles.viewMoreButtonText}>{viewMoreText}</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        renderLoadingState()
      ) : error ? (
        renderErrorState()
      ) : news.length === 0 ? (
        renderEmptyState()
      ) : (
        <View>
          {news.map((item, index) => (
            <View 
              key={item.id}
              style={{ marginBottom: 0.5 }}
            >
              {renderNewsItem({ item })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FFFFFF', // 纯白背景
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    shadowColor: '#1565C0', // 深蓝色阴影
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E3F2FD', // 浅蓝色内部分隔线
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0D47A1', // 深蓝色标题
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1976D2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1565C0',
  },
  viewMoreButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  newsItem: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E3F2FD', // 浅蓝色分隔线
  },
  newsImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#F8FAFE', // 轻微蓝色调背景
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  newsContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  newsCategoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  newsCategory: {
    fontSize: 12,
    color: '#1976D2', // 金融蓝色
    fontWeight: '600',
  },
  newsDate: {
    fontSize: 12,
    color: '#546E7A', // 蓝灰色
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#0D47A1', // 深蓝色
  },
  newsSummary: {
    fontSize: 14,
    color: '#546E7A', // 蓝灰色
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#546E7A', // 蓝灰色
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFCDD2', // 浅红色边框
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#D32F2F', // 红色
    fontWeight: '600',
  },
  errorSubText: {
    marginTop: 5,
    fontSize: 12,
    color: '#B71C1C', // 深红色
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#546E7A', // 蓝灰色
  },
});

export default LatestNews;
