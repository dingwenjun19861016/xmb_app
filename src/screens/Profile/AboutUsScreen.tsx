import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getEnabledCommunityPlatforms, CommunityPlatformConfig } from '../../config/communityConfig';

const AboutUsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [communityPlatforms, setCommunityPlatforms] = useState<CommunityPlatformConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommunityPlatforms();
  }, []);

  const loadCommunityPlatforms = async () => {
    try {
      setLoading(true);
      const platforms = await getEnabledCommunityPlatforms();
      setCommunityPlatforms(platforms);
    } catch (error) {
      console.error('加载社区平台配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = async (url: string, name: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('错误', `无法打开 ${name} 链接`);
      }
    } catch (error) {
      console.error('打开链接失败:', error);
      Alert.alert('错误', `打开 ${name} 链接失败`);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>关于我们</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* 应用介绍 */}
          <View style={styles.section}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Ionicons name="analytics" size={48} color="#007AFF" />
              </View>
              <Text style={styles.appName}>小目标</Text>
              <Text style={styles.appVersion}>ChainAlert</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>产品介绍</Text>
            <Text style={styles.paragraph}>
              小目标是一款专业的美股数据分析应用，为用户提供实时的美股市场数据、深度分析和行业资讯。
            </Text>
            <Text style={styles.paragraph}>
              我们致力于为美股投资者和爱好者提供准确、及时的市场信息，帮助用户更好地了解美国股市动态。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>核心功能</Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="trending-up" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>实时价格监控</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="bar-chart" size={20} color="#2196F3" />
                <Text style={styles.featureText}>市场数据分析</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="newspaper" size={20} color="#FF9800" />
                <Text style={styles.featureText}>行业资讯推送</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="trending-up" size={20} color="#9C27B0" />
                <Text style={styles.featureText}>美股实时追踪</Text>
              </View>
            </View>
          </View>

          {/* 社群链接 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>加入我们的社群</Text>
            <Text style={styles.paragraph}>
              关注我们的官方渠道，获取最新资讯和互动交流：
            </Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>加载中...</Text>
              </View>
            ) : (
              <View style={styles.communityContainer}>
                {communityPlatforms.map((platform) => (
                  <TouchableOpacity
                    key={platform.id}
                    style={styles.communityItem}
                    onPress={() => handleOpenLink(platform.url, platform.displayName)}
                  >
                    <View style={[styles.communityIcon, { backgroundColor: `${platform.color}15` }]}>
                      <Ionicons name={platform.icon as any} size={24} color={platform.color} />
                    </View>
                    <View style={styles.communityInfo}>
                      <Text style={styles.communityName}>{platform.displayName}</Text>
                    </View>
                    <Ionicons name="open-outline" size={20} color="#999" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>联系我们</Text>
            <Text style={styles.paragraph}>
              如果您有任何问题或建议，欢迎通过以上社群渠道与我们联系。我们重视每一位用户的反馈，并持续改进产品体验。
            </Text>
          </View>

          <View style={styles.disclaimer}>
            <Ionicons name="information-circle" size={20} color="#666" />
            <Text style={styles.disclaimerText}>
              本应用内容不构成投资建议，数据来源于互联网，请自行甄别内容。
            </Text>
          </View>

          {/* 版权信息 */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2024 ChainAlert. All rights reserved.</Text>
            <Text style={styles.footerText}>专业的美股数据分析平台</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
    marginBottom: 12,
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  communityContainer: {
    marginTop: 16,
  },
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  communityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    marginBottom: 24,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#F57F17',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 4,
  },
});

export default AboutUsScreen;
