import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NewsArticle } from '../../services/NewsService';

interface NewsCardProps {
  article: NewsArticle;
  onPress: (article: NewsArticle) => void;
  variant?: 'default' | 'featured' | 'compact' | 'search' | 'flash';
  cardStyle?: string;
}

const { width: screenWidth } = Dimensions.get('window');

// API category to UI category mapping
const API_TO_UI_CATEGORY: { [key: string]: string } = {
  'headline': '头条',
  'market': '研报',
  'stockquicknews': '快讯',
  'defi': 'DeFi',
  'eth': '以太坊',
  'btc': '比特币',
};

const NewsCard: React.FC<NewsCardProps> = ({ 
  article, 
  onPress,
  variant = 'default',
  cardStyle
}) => {
  const handlePress = () => {
    onPress(article);
  };

  // 检查是否是快讯类型
  const isNews = article.category === 'stockquicknews' || 
                 API_TO_UI_CATEGORY[article.category] === '快讯';
  
  // 判断是否应该显示图片
  const shouldShowImage = !isNews && 
                         article.image && 
                         !article.image.includes('placeholder');

  const renderDefaultCard = () => (
    <TouchableOpacity style={styles.defaultCard} onPress={handlePress}>
      <View style={styles.defaultContent}>
        <View style={styles.defaultTextContainer}>
          {variant !== 'search' && (
            <View style={styles.categoryContainer}>
              <Text style={styles.categoryText}>
                {API_TO_UI_CATEGORY[article.category] || article.category}
              </Text>
              <View style={styles.dot} />
              <Text style={styles.dateText}>{article.date}</Text>
            </View>
          )}
          <Text style={styles.defaultTitle} numberOfLines={2}>
            {article.title}
          </Text>
          <Text style={styles.defaultSummary} numberOfLines={3}>
            {article.summary}
          </Text>
          <View style={styles.footerContainer}>
            <Text style={styles.dateText}>{article.date}</Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </View>
        </View>
        {shouldShowImage && (
          <Image 
            source={{ uri: article.image }} 
            style={styles.defaultImage}
            resizeMode="cover"
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderCompactCard = () => (
    <TouchableOpacity style={styles.compactCard} onPress={handlePress}>
      <View style={styles.compactContent}>
        <Text style={styles.compactTitle} numberOfLines={2}>
          {article.title}
        </Text>
        <View style={styles.compactFooter}>
          <Text style={styles.compactDate}>{article.date}</Text>
          <Ionicons name="time-outline" size={12} color="#999" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFeaturedCard = () => (
    <TouchableOpacity style={styles.featuredCard} onPress={handlePress}>
      {shouldShowImage && (
        <Image 
          source={{ uri: article.image }} 
          style={styles.featuredImage}
          resizeMode="cover"
        />
      )}
      <View style={[
        styles.featuredOverlay,
        !shouldShowImage && styles.featuredOverlayNoImage
      ]}>
        <View style={styles.featuredContent}>
          {variant !== 'search' && (
            <View style={styles.featuredCategoryContainer}>
              <Text style={styles.featuredCategoryText}>
                {API_TO_UI_CATEGORY[article.category] || article.category}
              </Text>
            </View>
          )}
          <Text style={[
            styles.featuredTitle,
            !shouldShowImage && styles.featuredTitleNoImage
          ]} numberOfLines={2}>
            {article.title}
          </Text>
          <Text style={[
            styles.featuredSummary,
            !shouldShowImage && styles.featuredSummaryNoImage
          ]} numberOfLines={2}>
            {article.summary}
          </Text>
          <View style={styles.featuredFooter}>
            <Text style={[
              styles.featuredDate,
              !shouldShowImage && styles.featuredDateNoImage
            ]}>{article.date}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  switch (cardStyle) {
    case 'compact':
      return renderCompactCard();
    case 'featured':
      return renderFeaturedCard();
    default:
      return renderDefaultCard();
  }
};

const styles = StyleSheet.create({
  // Default card styles
  defaultCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  defaultContent: {
    flexDirection: 'row',
    padding: 16,
  },
  defaultTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#999',
    marginHorizontal: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  defaultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 22,
    marginBottom: 8,
  },
  defaultSummary: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  defaultImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },

  // Compact card styles
  compactCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 5, // 减少底部边距
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  compactContent: {
    padding: 8, // 减少内边距
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 20,
    marginBottom: 5, // 减少标题与底部的间距
  },
  compactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactDate: {
    fontSize: 12,
    color: '#999',
    marginRight: 4,
  },

  // Featured card styles
  featuredCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
    height: 200,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(0,0,0,0.5)', // Web平台兼容性：简化为纯色背景
    justifyContent: 'flex-end',
  },
  featuredOverlayNoImage: {
    position: 'relative',
    height: 'auto',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    padding: 20,
  },
  featuredContent: {
    padding: 16,
  },
  featuredCategoryContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  featuredCategoryText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    lineHeight: 22,
    marginBottom: 6,
  },
  featuredSummary: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
    marginBottom: 8,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredAuthor: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  featuredDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  featuredTitleNoImage: {
    color: '#1A1A1A',
  },
  featuredSummaryNoImage: {
    color: '#666',
  },
  featuredAuthorNoImage: {
    color: '#999',
  },
  featuredDateNoImage: {
    color: '#999',
  },
});

export default NewsCard;
