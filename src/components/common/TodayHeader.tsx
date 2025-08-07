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
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        )}
        
        {/* 分享按钮 */}
        {showShareButton && onSharePress && (
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={onSharePress}
          >
            <Ionicons name="share-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        )}
        
        {/* 登录/用户按钮 */}
        {currentUser ? (
          <TouchableOpacity 
            style={styles.userButton} 
            onPress={onUserPress}
          >
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={16} color="#007AFF" />
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
            <Ionicons name="person-outline" size={18} color="#007AFF" />
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
    paddingTop: Platform.OS === 'ios' ? 44 : 24, // 减少头部高度，iOS状态栏高度适配
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  time: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  loginButtonText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  userButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: 120,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  userEmailText: {
    color: '#333',
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
});

export default TodayHeader;
