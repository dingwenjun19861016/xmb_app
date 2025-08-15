import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NewsArticle } from '../../services/NewsService';

interface TimelineNewsCardProps {
  article: NewsArticle;
  onPress: (article: NewsArticle) => void;
  style?: ViewStyle;
  isLast?: boolean;
  // 新增：从外部传入的配置化分类显示标签
  categoryLabel?: string;
}

const TimelineNewsCard: React.FC<TimelineNewsCardProps> = ({ 
  article, 
  onPress, 
  style,
  isLast = false,
  categoryLabel,
}) => {
  const formatTime = () => {
    if (!article.date) return '';
    
    // 如果已经是相对时间格式（如 "8分钟前"），直接显示
    if (typeof article.date === 'string' && 
        (article.date.includes('分钟前') || 
         article.date.includes('小时前') || 
         article.date.includes('天前') || 
         article.date === '刚刚')) {
      return article.date;
    }
    
    // 尝试解析为日期并格式化为时间
    try {
      const date = new Date(article.date);
      if (isNaN(date.getTime())) {
        return article.date; // 如果解析失败，返回原字符串
      }
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (e) {
      return article.date; // 出错时返回原字符串
    }
  };

  // 统一的分类显示标签，优先使用外部传入的配置化标签
  const displayCategoryLabel = categoryLabel ?? article.category ?? '';

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
          <Text style={styles.timeText}>
            {formatTime()}
          </Text>
          {article.source && (
            <Text style={styles.sourceText}>{article.source}</Text>
          )}
        </View>

        {/* 文章内容 */}
        <View style={styles.articleContent}>
          <Text style={styles.title} numberOfLines={4}>
            {article.title}
          </Text>
          
          {/* 快讯通常不显示摘要，但如果有可以显示 */}
          {article.summary && displayCategoryLabel !== '快讯' && (
            <Text style={styles.summary} numberOfLines={2}>
              {article.summary}
            </Text>
          )}

          {/* 底部信息 */}
          <View style={styles.metaInfo}>
            {/* 移除分类标签以让样式更紧凑 */}
            <View style={styles.rightMeta}>
              {article.readCount && (
                <View style={styles.readContainer}>
                  <Ionicons name="eye-outline" size={12} color="#666" />
                  <Text style={styles.readCount}>{article.readCount}</Text>
                </View>
              )}
              {article.source && (
                <Text style={styles.metaSource}>{article.source}</Text>
              )}
            </View>
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

  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 6,
    // 移除顶部边框以去掉文字下方的水平线
    // borderTopWidth: 1,
    // borderTopColor: '#F2F2F7',
  },
  rightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  readCount: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  metaSource: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
});

export default TimelineNewsCard;
