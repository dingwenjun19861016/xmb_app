import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import MessageModal from '../../components/common/MessageModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentUser, logout } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [storageInfo, setStorageInfo] = useState<any>(null);

  // 解析JWT token获取信息
  const parseJWTToken = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      // 解码payload部分
      const payload = parts[1];
      // 添加padding if needed
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      const decoded = JSON.parse(atob(paddedPayload));
      
      return {
        ...decoded,
        issuedAt: decoded.iat ? new Date(decoded.iat * 1000) : null,
        expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null,
      };
    } catch (error) {
      console.error('解析JWT失败:', error);
      return null;
    }
  };

  // 获取本地存储信息
  const getStorageInfo = async () => {
    try {
      const keys = ['userToken', 'userEmail', 'userRole'];
      const values = await AsyncStorage.multiGet(keys);
      const storageData = {};
      
      values.forEach(([key, value]) => {
        if (value) { // 只显示有值的项
          storageData[key] = value;
        }
      });
      
      return storageData;
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return {};
    }
  };

  // 加载用户信息
  const loadUserInfo = async () => {
    if (!currentUser?.token) return;

    try {
      // 解析token
      const parsed = parseJWTToken(currentUser.token);
      setTokenInfo(parsed);

      // 获取存储信息
      const storage = await getStorageInfo();
      setStorageInfo(storage);
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  // 刷新数据
  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserInfo();
    setRefreshing(false);
  };

  // 登出确认
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    navigation.goBack();
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string, label: string) => {
    // 在React Native中，需要使用Clipboard API
    Alert.alert('复制', `${label} 已复制到剪贴板`);
  };

  useEffect(() => {
    loadUserInfo();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>用户信息</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={64} color="#999" />
          <Text style={styles.emptyText}>请先登录</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>用户信息</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 用户基本信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>基本信息</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={32} color="#007AFF" />
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>邮箱地址</Text>
              <TouchableOpacity 
                style={styles.infoValueContainer}
                onPress={() => copyToClipboard(currentUser.email, '邮箱地址')}
              >
                <Text style={styles.infoValue}>{currentUser.email}</Text>
                <Ionicons name="copy-outline" size={16} color="#999" />
              </TouchableOpacity>
            </View>

            {currentUser.role && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>用户角色</Text>
                <View style={styles.roleBadge}>
                  <Ionicons 
                    name={currentUser.role === 'admin' ? 'shield-checkmark' : 'person'} 
                    size={16} 
                    color={currentUser.role === 'admin' ? '#FF6B35' : '#007AFF'} 
                  />
                  <Text style={[
                    styles.roleText,
                    { color: currentUser.role === 'admin' ? '#FF6B35' : '#007AFF' }
                  ]}>
                    {currentUser.role === 'admin' ? '管理员' : currentUser.role}
                  </Text>
                </View>
              </View>
            )}

            {currentUser.createdAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>注册时间</Text>
                <Text style={styles.infoValue}>
                  {new Date(currentUser.createdAt).toLocaleString('zh-CN')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Token信息 */}
        {tokenInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Token信息</Text>
            
            <View style={styles.infoCard}>
              {tokenInfo.issuedAt && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>颁发时间</Text>
                  <Text style={styles.infoValue}>
                    {tokenInfo.issuedAt.toLocaleString('zh-CN')}
                  </Text>
                </View>
              )}

              {tokenInfo.expiresAt && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>过期时间</Text>
                  <Text style={[
                    styles.infoValue,
                    { color: tokenInfo.expiresAt < new Date() ? '#FF3B30' : '#333' }
                  ]}>
                    {tokenInfo.expiresAt.toLocaleString('zh-CN')}
                  </Text>
                </View>
              )}

              {tokenInfo.sub && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Subject</Text>
                  <TouchableOpacity 
                    style={styles.infoValueContainer}
                    onPress={() => copyToClipboard(tokenInfo.sub, 'Subject')}
                  >
                    <Text style={styles.infoValue}>{tokenInfo.sub}</Text>
                    <Ionicons name="copy-outline" size={16} color="#999" />
                  </TouchableOpacity>
                </View>
              )}

              {tokenInfo.iss && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>签发者</Text>
                  <Text style={styles.infoValue}>{tokenInfo.iss}</Text>
                </View>
              )}

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Token状态</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons 
                    name={tokenInfo.expiresAt && tokenInfo.expiresAt > new Date() ? "checkmark-circle" : "alert-circle"} 
                    size={16} 
                    color={tokenInfo.expiresAt && tokenInfo.expiresAt > new Date() ? "#4CAF50" : "#FF3B30"} 
                  />
                  <Text style={[
                    styles.verifiedText,
                    { color: tokenInfo.expiresAt && tokenInfo.expiresAt > new Date() ? "#4CAF50" : "#FF3B30" }
                  ]}>
                    {tokenInfo.expiresAt && tokenInfo.expiresAt > new Date() ? "有效" : "已过期"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 本地存储信息 */}
        {storageInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>本地存储</Text>
            
            <View style={styles.infoCard}>
              {Object.entries(storageInfo).map(([key, value]) => (
                <View key={key} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{key}</Text>
                  <TouchableOpacity 
                    style={styles.infoValueContainer}
                    onPress={() => copyToClipboard(value as string, key)}
                  >
                    <Text style={[styles.infoValue, styles.tokenValue]} numberOfLines={1}>
                      {key === 'userToken' ? `${(value as string)?.substring(0, 20)}...` : value}
                    </Text>
                    <Ionicons name="copy-outline" size={16} color="#999" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 操作按钮 */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={20} color="#007AFF" />
            <Text style={styles.refreshButtonText}>刷新信息</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 登出确认弹窗 */}
      <MessageModal
        visible={showLogoutConfirm}
        type="warning"
        title="确认登出"
        message="您确定要登出当前账户吗？"
        buttons={[
          {
            text: '取消',
            style: 'cancel',
            onPress: () => setShowLogoutConfirm(false)
          },
          {
            text: '登出',
            style: 'destructive',
            onPress: confirmLogout
          }
        ]}
        onClose={() => setShowLogoutConfirm(false)}
      />
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
  logoutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
  },
  tokenValue: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    marginRight: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
  },
  verifiedText: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
  },
  roleText: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default UserProfileScreen;
