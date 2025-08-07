import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateService, UpdateInfo } from '../../services/UpdateService';

const { width } = Dimensions.get('window');

interface UpdateModalProps {
  visible: boolean;
  onClose: () => void;
}

const UpdateModal: React.FC<UpdateModalProps> = ({ visible, onClose }) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    hasUpdate: false,
    version: '',
    url: '',
    currentVersion: '',
  });

  // 检查是否需要更新
  const checkForUpdate = async () => {
    try {
      const info = await updateService.checkForUpdate();
      setUpdateInfo(info);
      
    } catch (error) {
      console.error('UpdateModal: 检查更新失败', error);
    }
  };

  // 处理立即更新
  const handleUpdate = async () => {
    try {
      const supported = await Linking.canOpenURL(updateInfo.url);
      if (supported) {
        await Linking.openURL(updateInfo.url);
        onClose();
      } else {
        Alert.alert('错误', '无法打开更新链接');
      }
    } catch (error) {
      console.error('UpdateModal: 打开更新链接失败', error);
      Alert.alert('错误', '打开更新链接失败');
    }
  };

  // 处理跳过更新
  const handleSkip = async () => {
    try {
      await updateService.skipVersion(updateInfo.version);
      onClose();
    } catch (error) {
      console.error('UpdateModal: 保存跳过版本失败', error);
      onClose();
    }
  };

  // 在Modal显示时检查更新
  useEffect(() => {
    if (visible) {
      checkForUpdate();
    }
  }, [visible]);

  // 如果没有更新，不显示Modal
  if (!updateInfo.hasUpdate) {
    return null;
  }

  

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 图标 */}
          <View style={styles.iconContainer}>
            <Ionicons name="download-outline" size={48} color="#007AFF" />
          </View>

          {/* 标题 */}
          <Text style={styles.title}>发现新版本</Text>

          {/* 版本信息 */}
          <Text style={styles.versionText}>
            {updateInfo.currentVersion} → {updateInfo.version}
          </Text>

          {/* 描述 */}
          <Text style={styles.description}>
            为了获得更好的体验和最新功能，建议您立即更新到最新版本。
          </Text>

          {/* 按钮区域 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.skipButton]}
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>跳过这个版本</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.updateButton]}
              onPress={handleUpdate}
            >
              <Text style={styles.updateButtonText}>立即更新</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: width - 80,
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  versionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  laterButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  laterButtonText: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
  },
  skipButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
  },
  updateButton: {
    backgroundColor: '#007AFF',
  },
  updateButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default UpdateModal;
