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
            <Ionicons name="chevron-forward" size={16} color="#1976D2" />
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
          <Ionicons name="time-outline" size={12} color="#1976D2" />
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
  // Default card styles - 明快金融主题
  defaultCard: {
    backgroundColor: '#FFFFFF', // 保持白色背景
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#1565C0', // 蓝色阴影
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#E3F2FD', // 浅蓝色边框
  },
  defaultContent: {
    flexDirection: 'row',
    padding: 18,
  },
  defaultTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E3F2FD',
  },
  categoryText: {
    fontSize: 12,
    color: '#1565C0', // 深蓝色
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#42A5F5', // 中蓝色
    marginHorizontal: 10,
  },
  dateText: {
    fontSize: 12,
    color: '#546E7A', // 蓝灰色
    fontWeight: '500',
  },
  defaultTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0D47A1', // 深蓝色标题
    lineHeight: 24,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  defaultSummary: {
    fontSize: 14,
    color: '#37474F', // 深灰色
    lineHeight: 21,
    marginBottom: 14,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E3F2FD',
  },
  defaultImage: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E3F2FD',
  },

  // Compact card styles - 明快金融主题
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 8,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#E3F2FD',
    overflow: 'hidden',
  },
  compactContent: {
    padding: 14,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D47A1',
    lineHeight: 21,
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  compactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E3F2FD',
  },
  compactDate: {
    fontSize: 12,
    color: '#546E7A',
    marginRight: 6,
    fontWeight: '500',
  },

  // Featured card styles - 明快金融主题
  featuredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
    height: 220,
    borderWidth: 2,
    borderColor: '#E3F2FD',
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
    height: '65%',
    backgroundColor: 'rgba(13, 71, 161, 0.85)', // 深蓝色半透明
    justifyContent: 'flex-end',
  },
  featuredOverlayNoImage: {
    position: 'relative',
    height: 'auto',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    padding: 24,
  },
  featuredContent: {
    padding: 20,
  },
  featuredCategoryContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#1976D2', // 金融蓝色
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  featuredCategoryText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 25,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  featuredSummary: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    marginBottom: 10,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  featuredAuthor: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  featuredDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  featuredTitleNoImage: {
    color: '#0D47A1',
  },
  featuredSummaryNoImage: {
    color: '#37474F',
  },
  featuredAuthorNoImage: {
    color: '#546E7A',
  },
  featuredDateNoImage: {
    color: '#546E7A',
  },
});

export default NewsCard;
