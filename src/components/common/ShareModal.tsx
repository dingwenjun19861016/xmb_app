/**
 * ShareModal - 分享模态框
 * 
 * 功能特性:
 * 1. 展示二维码供扫描分享
 * 2. 复制链接功能
 * 3. 原生分享功能
 * 4. 美观的UI设计，参考二维码设计图
 * 
 * @version 1.0.0
 * @author 小目标 Team
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
  Share,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Clipboard from '@react-native-clipboard/clipboard';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  url: string;
  onShowMessage?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

const { width, height } = Dimensions.get('window');

const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  onClose,
  title,
  description,
  url,
  onShowMessage,
}) => {
  const [copying, setCopying] = useState(false);

  // 复制链接
  const handleCopyLink = async () => {
    try {
      setCopying(true);
      
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(url);
      } else {
        // React Native环境下的复制功能
        Clipboard.setString(url);
      }
      
      onShowMessage?.('success', '复制成功', '链接已复制到剪贴板');
      onClose();
    } catch (error) {
      console.error('复制失败:', error);
      onShowMessage?.('error', '复制失败', '无法复制链接，请手动复制');
    } finally {
      setCopying(false);
    }
  };

  // 原生分享
  const handleNativeShare = async () => {
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: title,
            text: description,
            url: url,
          });
          onClose();
        } else {
          // Web端降级到复制
          handleCopyLink();
        }
      } else {
        await Share.share({
          message: `${description}：${url}`,
          url: url,
          title: title,
        });
        onClose();
      }
    } catch (error) {
      console.error('分享失败:', error);
      if (error.message !== 'User did not share') {
        onShowMessage?.('error', '分享失败', '无法分享链接，请稍后再试');
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modal}>
                {/* 关闭按钮 */}
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={onClose}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>

                {/* Logo和标题区域 */}
                <View style={styles.header}>
                  <View style={styles.logoContainer}>
                    <View style={styles.logo}>
                      <Ionicons name="trending-up" size={32} color="#007AFF" />
                    </View>
                  </View>
                  <Text style={styles.appName}>小目标</Text>
                </View>

                {/* 内容描述 */}
                <View style={styles.content}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.description}>{description}</Text>
                </View>

                {/* 二维码区域 */}
                <View style={styles.qrContainer}>
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      value={url}
                      size={160}
                      color="#000"
                      backgroundColor="#fff"
                      logo={null}
                    />
                  </View>
                  <Text style={styles.qrHint}>扫描二维码查看</Text>
                </View>

                {/* 按钮区域 */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={[styles.button, styles.copyButton]}
                    onPress={handleCopyLink}
                    disabled={copying}
                  >
                    <Ionicons name="copy-outline" size={20} color="#007AFF" />
                    <Text style={styles.copyButtonText}>
                      {copying ? '复制中...' : '复制链接'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.button, styles.shareButton]}
                    onPress={handleNativeShare}
                  >
                    <Ionicons name="share-outline" size={20} color="#fff" />
                    <Text style={styles.shareButtonText}>分享</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: Math.min(width * 0.9, 360),
    maxHeight: height * 0.8,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  logoContainer: {
    marginBottom: 12,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrCodeWrapper: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  qrHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  copyButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  copyButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: '#007AFF',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ShareModal;
