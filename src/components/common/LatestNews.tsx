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
      <ActivityIndicator size="large" color="#007AFF" />
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
        <TouchableOpacity onPress={onViewAllPress}>
          <Text style={styles.seeAllButton}>{viewMoreText}</Text>
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
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAllButton: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  newsItem: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  newsImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
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
    color: '#007AFF',
    fontWeight: '500',
  },
  newsDate: {
    fontSize: 12,
    color: '#999',
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  newsSummary: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  errorSubText: {
    marginTop: 5,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
});

export default LatestNews;
