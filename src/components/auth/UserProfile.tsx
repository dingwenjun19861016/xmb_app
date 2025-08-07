import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { User } from '../../types/user';
import MessageModal from '../common/MessageModal';
import userService from '../../services/UserService';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout }) => {
  const navigation = useNavigation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showTokenInfo, setShowTokenInfo] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    // console.log('🔓 UserProfile: 开始登出流程');
    setShowLogoutConfirm(false);
    onLogout();
  };

  const handleUserInfoPress = () => {
    navigation.navigate('UserStatus');
  };

  const formatEmail = (email: string) => {
    if (!email) {
      return '未知用户';
    }
    if (email.length > 20) {
      return email.substring(0, 17) + '...';
    }
    return email;
  };

  const handleTokenInfoPress = async () => {
    try {
      const token = await userService.getToken();
      const info = {
        hasToken: !!token,
        token: token ? `${token.substring(0, 10)}...` : null,
        isValid: !!token,
        expiresAt: '未知' // 简化版本，不显示过期时间
      };
      setTokenInfo(info);
      setShowTokenInfo(true);
    } catch (error) {
      console.error('获取token信息失败:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.userInfo} onPress={handleUserInfoPress}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={24} color="#007AFF" />
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.email}>{formatEmail(user.email)}</Text>
          {user.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.verifiedText}>已验证</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.debugButton} onPress={handleTokenInfoPress}>
        <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
        <Text style={styles.debugText}>Token信息</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
        <Text style={styles.logoutText}>登出</Text>
      </TouchableOpacity>

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

      <MessageModal
        visible={showTokenInfo}
        type="info"
        title="Token信息"
        message={tokenInfo ? `
状态: ${tokenInfo.hasToken ? '存在' : '不存在'}
有效性: ${tokenInfo.isValid ? '有效' : '无效'}
过期时间: ${tokenInfo.expiresAt || '未知'}
剩余时间: ${tokenInfo.expiresIn || '未知'}
        `.trim() : '获取中...'}
        buttons={[
          {
            text: '确定',
            onPress: () => setShowTokenInfo(false)
          }
        ]}
        onClose={() => setShowTokenInfo(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    marginRight: 8,
  },
  debugText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  logoutText: {
    fontSize: 14,
    color: '#FF3B30',
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default UserProfile;
