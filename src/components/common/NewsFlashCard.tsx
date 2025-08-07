import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NewsArticle } from '../../services/NewsService';

interface NewsFlashCardProps {
  article: NewsArticle;
  onPress: (article: NewsArticle) => void;
  variant?: 'flash' | 'search'; // 添加变体支持
}

const NewsFlashCard: React.FC<NewsFlashCardProps> = ({ article, onPress, variant = 'flash' }) => {
  const handlePress = () => {
    onPress(article);
  };

  // 添加数据防护
  const safeArticle = {
    title: article.title || '暂无标题',
    summary: article.summary || '暂无摘要',
    date: article.date || '未知时间',
    author: article.author || '未知作者',
    category: article.category || '未知分类'
  };

  // 根据变体决定标签内容
  const labelConfig = variant === 'search' ? {
    icon: 'search',
    text: '搜索',
    color: '#007AFF'
  } : {
    icon: 'flash',
    text: '快讯',
    color: '#FF6B35'
  };

  return (
    <TouchableOpacity style={styles.flashCard} onPress={handlePress}>
      {/* 左侧标签 */}
      <View style={[styles.flashLabel, { backgroundColor: labelConfig.color }]}>
        <Ionicons name={labelConfig.icon} size={14} color="white" />
        <Text style={styles.flashLabelText}>{labelConfig.text}</Text>
      </View>
      
      {/* 右侧内容区域 */}
      <View style={styles.flashContent}>
        <View style={styles.flashHeader}>
          <Text style={styles.flashDate}>{safeArticle.date}</Text>
          <Text style={styles.flashCategory}>{safeArticle.category}</Text>
          <Ionicons name="chevron-forward" size={16} color="#999" />
        </View>
        
        <Text style={styles.flashTitle} numberOfLines={2}>
          {safeArticle.title}
        </Text>
        
        <Text style={styles.flashSummary} numberOfLines={3}>
          {safeArticle.summary}
        </Text>
        
        <View style={styles.flashFooter}>
          <Text style={styles.flashDate}>{safeArticle.date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  flashCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    // Web端优化 - 确保占满整个宽度
    ...(Platform.OS === 'web' && {
      width: '100%',
      maxWidth: 'none',
      alignSelf: 'stretch',
      flex: 1,
    }),
  },
  flashLabel: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 50,
  },
  flashLabelText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  flashContent: {
    flex: 1,
    // Web端优化 - 确保内容区域占满剩余空间
    ...(Platform.OS === 'web' && {
      width: '100%',
      minWidth: 0, // 允许内容收缩
    }),
  },
  flashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  flashDate: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  flashCategory: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  flashTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 22,
    marginBottom: 8,
  },
  flashSummary: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  flashFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flashDate: {
    fontSize: 12,
    color: '#999',
  },
});

export default NewsFlashCard;
