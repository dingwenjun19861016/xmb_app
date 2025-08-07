import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Platform
} from 'react-native';
import { getWebAppURL } from '../../config/apiConfig';
import { Ionicons } from '@expo/vector-icons';

interface UpdateAvailableModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: () => void;
  newVersion?: string;
  currentVersion?: string;
}

const UpdateAvailableModal: React.FC<UpdateAvailableModalProps> = ({
  visible,
  onClose,
  onUpdate,
  newVersion,
  currentVersion
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      if (Platform.OS === 'web') {
        // Web平台：清除缓存并刷新页面
        
        // 1. 通知Service Worker清除所有缓存
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
        }
        
        // 2. 清除localStorage和sessionStorage
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.clear();
            window.sessionStorage.clear();
          } catch (e) {
            console.warn('无法清除本地存储:', e);
          }
        }
        
        // 3. 等待一下让缓存清除完成
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 4. 强制刷新页面（绕过缓存）
        const timestamp = Date.now();
        window.location.href = `${window.location.origin}${window.location.pathname}?v=${timestamp}`;
      } else {
        // 移动端：调用更新回调
        onUpdate();
      }
    } catch (error) {
      console.error('更新失败:', error);
      setIsUpdating(false);
    }
  };

  const handleLearnMore = () => {
    const url = getWebAppURL('help/update');
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="refresh-circle" size={64} color="#007AFF" />
          </View>
          
          <Text style={styles.title}>发现新版本</Text>
          
          <Text style={styles.description}>
            为了获得最佳体验和最新功能，建议您更新到最新版本。
          </Text>
          
          {newVersion && currentVersion && (
            <View style={styles.versionInfo}>
              <Text style={styles.versionText}>
                当前版本: {currentVersion}
              </Text>
              <Text style={styles.versionText}>
                最新版本: {newVersion}
              </Text>
            </View>
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.updateButton]}
              onPress={handleUpdate}
              disabled={isUpdating}
            >
              <Text style={styles.updateButtonText}>
                {isUpdating ? '更新中...' : '立即更新'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.laterButton]}
              onPress={onClose}
              disabled={isUpdating}
            >
              <Text style={styles.laterButtonText}>稍后提醒</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.learnMoreButton}
            onPress={handleLearnMore}
          >
            <Text style={styles.learnMoreText}>了解更多</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  
  iconContainer: {
    marginBottom: 16,
  },
  
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  
  versionInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 20,
  },
  
  versionText: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    marginVertical: 2,
  },
  
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  updateButton: {
    backgroundColor: '#007AFF',
  },
  
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  laterButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  
  laterButtonText: {
    color: '#6C757D',
    fontSize: 16,
    fontWeight: '500',
  },
  
  learnMoreButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  
  learnMoreText: {
    color: '#007AFF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default UpdateAvailableModal;
