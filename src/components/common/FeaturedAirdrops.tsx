import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Import the AirdropItem interface from AirdropService
import { AirdropItem } from '../../services/AirdropService';

interface FeaturedAirdropsProps {
  airdrops: AirdropItem[];
  loading?: boolean;
  error?: string | null;
  title?: string; // 添加标题配置
  viewMoreText?: string; // 添加查看更多按钮文本配置
}

const FeaturedAirdrops: React.FC<FeaturedAirdropsProps> = ({ 
  airdrops, 
  loading = false, 
  error = null,
  title = '热门空投', // 添加默认标题
  viewMoreText = '查看全部 >' // 添加默认查看更多文本
}) => {
  const navigation = useNavigation();

  const renderAirdropItem = ({ item }: { item: AirdropItem }) => (
    <TouchableOpacity 
      style={styles.airdropItem}
      onPress={() => navigation.navigate('AirdropDetail', { path: item.id, returnTo: 'home' })}
    >
      <Image source={{ uri: item.background }} style={styles.airdropImage} />
      <View style={styles.airdropContent}>
        <Text style={styles.airdropTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.airdropDescription} numberOfLines={2}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  // 渲染加载状态
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>加载空投中...</Text>
    </View>
  );
  
  // 渲染错误状态
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={40} color="#FF3B30" />
      <Text style={styles.errorText}>加载失败</Text>
      <Text style={styles.errorSubText}>{error}</Text>
    </View>
  );
  
  // 渲染空状态
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="gift-outline" size={40} color="#CCC" />
      <Text style={styles.emptyText}>暂无空投活动</Text>
    </View>
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Airdrops')}>
          <Text style={styles.seeAllButton}>{viewMoreText}</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        renderLoadingState()
      ) : error ? (
        renderErrorState()
      ) : airdrops.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={airdrops}
          renderItem={renderAirdropItem}
          keyExtractor={item => item.id}
          scrollEnabled={false}
        />
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
    color: '#1A1A1A',
  },
  seeAllButton: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },

  airdropItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  airdropImage: {
    width: 100,
    height: 70,
    borderRadius: 6,
    marginRight: 12,
  },
  airdropContent: {
    flex: 1,
    justifyContent: 'space-between',
  },

  airdropLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#F0F0F0',
  },
  airdropTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 0,
    marginBottom: 4,
    color: '#1A1A1A',
    lineHeight: 22,
  },
  airdropDescription: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 6,
    lineHeight: 20,
  },

  loadingContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6C757D',
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF3B30',
    marginTop: 8,
    marginBottom: 4,
  },
  errorSubText: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  retryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyText: {
    color: '#6C757D',
    fontSize: 14,
  },
});

export default FeaturedAirdrops;
