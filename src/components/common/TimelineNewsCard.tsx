import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NewsArticle } from '../../services/NewsService';

interface TimelineNewsCardProps {
  article: NewsArticle;
  onPress: (article: NewsArticle) => void;
  style?: ViewStyle;
  isLast?: boolean;
}

const TimelineNewsCard: React.FC<TimelineNewsCardProps> = ({ 
  article, 
  onPress, 
  style,
  isLast = false 
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress(article)}
      activeOpacity={0.7}
    >
      {/* Timeline线条 */}
      <View style={styles.timelineContainer}>
        <View style={styles.timelineDot} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* 内容区域 */}
      <View style={styles.contentContainer}>
        {/* 时间标签 */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{article.date}</Text>
          {article.source && (
            <Text style={styles.sourceText}>来源: {article.source}</Text>
          )}
        </View>

        {/* 文章内容 */}
        <View style={styles.articleContent}>
          <Text style={styles.title} numberOfLines={3}>
            {article.title}
          </Text>
          
          {article.summary && (
            <Text style={styles.summary} numberOfLines={2}>
              {article.summary}
            </Text>
          )}

          {/* 文章图片 */}
          {article.image && (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: article.image }} 
                style={styles.articleImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* 底部信息 */}
          <View style={styles.metaInfo}>
            <View style={styles.tagContainer}>
              <Ionicons name="pricetag-outline" size={12} color="#666" />
              <Text style={styles.category}>
                {article.category || '快讯'}
              </Text>
            </View>
            
            {article.readCount && (
              <View style={styles.readContainer}>
                <Ionicons name="eye-outline" size={12} color="#666" />
                <Text style={styles.readCount}>{article.readCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  timelineContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 4,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E8F4FD',
    marginTop: 8,
    minHeight: 60,
  },
  contentContainer: {
    flex: 1,
  },
  timeContainer: {
    marginBottom: 8,
  },
  timeText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  sourceText: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  articleContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F2F2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    lineHeight: 22,
    marginBottom: 8,
  },
  summary: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 12,
  },
  imageContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  articleImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F2F2F7',
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  category: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
    fontWeight: '500',
  },
  readContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readCount: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
});

export default TimelineNewsCard;
