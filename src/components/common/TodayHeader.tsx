import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, NativeModules } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DateUtils } from '../../utils/dateUtils';
import { useUser } from '../../contexts/UserContext';

interface TodayHeaderProps {
  activeTab: string;
  onBackPress: () => void;
  onLoginPress?: () => void;
  onUserPress?: () => void;
  title?: string;
  showShareButton?: boolean;
  onSharePress?: () => void;
}

const TodayHeader: React.FC<TodayHeaderProps> = ({ 
  activeTab, 
  onBackPress,
  onLoginPress,
  onUserPress,
  title = "今日行情",
  showShareButton = false,
  onSharePress
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { currentUser } = useUser();
  
  // 使用全局日期格式化工具获取当前时间
  const { dateString, timeString } = DateUtils.formatDateTime(currentTime);
  
  // 每分钟更新一次时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 60秒更新一次
    
    return () => clearInterval(timer);
  }, []);

  const formatEmail = (email?: string) => {
    if (!email) {
      return '未知用户';
    }
    if (email.length > 15) {
      return email.substring(0, 12) + '...';
    }
    return email;
  };

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>{title}</Text>
        <View style={styles.dateTimeContainer}>
          <Text style={styles.date}>{dateString}</Text>
          <Text style={styles.time}>{timeString}</Text>
        </View>
      </View>
      <View style={styles.headerButtons}>
        {activeTab === 'articles' && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onBackPress}
          >
            <Ionicons name="arrow-back" size={24} color="#1976D2" />
          </TouchableOpacity>
        )}
        
        {/* 分享按钮 */}
        {showShareButton && onSharePress && (
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={onSharePress}
          >
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        
        {/* 登录/用户按钮 */}
        {currentUser ? (
          <TouchableOpacity 
            style={styles.userButton} 
            onPress={onUserPress}
          >
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.userEmailText} numberOfLines={1}>
              {formatEmail(currentUser?.email)}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={onLoginPress}
          >
            <Ionicons name="person-outline" size={18} color="#FFFFFF" />
            <Text style={styles.loginButtonText}>登录/注册</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF', // 纯白背景
    borderBottomWidth: 2,
    borderBottomColor: '#E3F2FD', // 浅蓝色边框
    shadowColor: '#1565C0', // 蓝色阴影
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0D47A1', // 深蓝色
    letterSpacing: 0.5,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E3F2FD',
  },
  date: {
    fontSize: 15,
    color: '#546E7A', // 蓝灰色
    fontWeight: '500',
  },
  time: {
    fontSize: 15,
    color: '#1976D2', // 金融蓝色强调
    marginLeft: 12,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E3F2FD',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1976D2', // 金融蓝色
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#1565C0',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2', // 金融蓝色
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1565C0',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  userButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFE', // 轻微蓝色调背景
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    maxWidth: 140,
    borderWidth: 2,
    borderColor: '#E3F2FD',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1976D2', // 金融蓝色
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userEmailText: {
    color: '#0D47A1', // 深蓝色
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});

export default TodayHeader;
