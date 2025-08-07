import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import userService from '../../services/UserService';

interface RegisterStatusHandlerProps {
  email: string;
  onNavigateToLogin: () => void;
  onClose: () => void;
}

const RegisterStatusHandler: React.FC<RegisterStatusHandlerProps> = ({
  email,
  onNavigateToLogin,
  onClose
}) => {
  const [remainingTime, setRemainingTime] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('用户已注册但未激活，请检查邮箱或重新发送激活邮件');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 组件加载时获取重发状态
    fetchResendStatus();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const fetchResendStatus = async () => {
    try {
      const result = await userService.getResendStatus(email);
      
      if (result.success) {
        const remTime = result.remainingTime || 0;
        setRemainingTime(remTime);
        setCanResend(result.canResend || remTime <= 0);
        
        // 如果有剩余时间，启动倒计时
        if (remTime > 0) {
          startCountdown(remTime);
        }
      } else {
        console.warn('获取重发状态失败:', result.error);
        setCanResend(true); // 如果获取失败，允许重发
      }
    } catch (error) {
      console.error('获取重发状态异常:', error);
      setCanResend(true); // 如果出错，允许重发
    }
  };

  const startCountdown = (initialTime: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    let currentTime = initialTime;
    setRemainingTime(currentTime);
    setCanResend(false);

    timerRef.current = setInterval(() => {
      currentTime -= 1;
      setRemainingTime(currentTime);
      
      if (currentTime <= 0) {
        setCanResend(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }, 1000);
  };

  const handleResendEmail = async () => {
    if (!canResend || isResending) {
      return;
    }

    setIsResending(true);
    try {
      const result = await userService.resendEmail(email);
      
      if (result.success) {
        setMessage(result.message || '激活邮件已重新发送');
        const newRemainingTime = result.remainingTime || 120;
        
        // 重新开始倒计时
        startCountdown(newRemainingTime);
      } else {
        setMessage(result.error || '重发激活邮件失败');
      }
    } catch (error) {
      console.error('重发邮件失败:', error);
      setMessage('重发激活邮件失败，请稍后重试');
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '可以重新发送邮件';
    return `还需等待 ${seconds} 秒后可重新发送`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={60} color="#FF9800" />
        </View>
        
        <Text style={styles.title}>激活提醒</Text>
        <Text style={styles.message}>{message}</Text>
        
        {/* 倒计时UI */}
        <View style={styles.countdownContainer}>
          <View style={styles.countdownBox}>
            <Ionicons 
              name="time-outline" 
              size={20} 
              color={remainingTime > 0 ? "#FF9800" : "#4CAF50"} 
            />
            <Text style={[
              styles.countdownText,
              remainingTime > 0 ? styles.waitingText : styles.readyText
            ]}>
              {formatTime(remainingTime)}
            </Text>
          </View>
          
          {remainingTime > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(0, (120 - remainingTime) / 120 * 100)}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {remainingTime}s
              </Text>
            </View>
          )}
        </View>

        {/* 重发邮件按钮 */}
        <TouchableOpacity
          style={[
            styles.resendButton,
            (!canResend || isResending) && styles.resendButtonDisabled
          ]}
          onPress={handleResendEmail}
          disabled={!canResend || isResending}
        >
          {isResending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons 
                name="mail" 
                size={16} 
                color="#fff" 
                style={styles.buttonIcon}
              />
              <Text style={styles.resendButtonText}>
                {canResend ? '重新发送激活邮件' : '请等待倒计时结束'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* 按钮组 */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onClose}
          >
            <Text style={styles.secondaryButtonText}>稍后验证</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onNavigateToLogin}
          >
            <Text style={styles.primaryButtonText}>去登录</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  countdownContainer: {
    width: '100%',
    marginBottom: 24,
  },
  countdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 12,
  },
  countdownText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  waitingText: {
    color: '#FF9800',
  },
  readyText: {
    color: '#4CAF50',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF9800',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    minHeight: 50,
  },
  resendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonIcon: {
    marginRight: 8,
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default RegisterStatusHandler;