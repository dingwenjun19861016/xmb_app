/**
 * CoinPosterModal - 币种分享模态框 (简化版)
 * 
 * 功能特性:
 * 1. 一键分享链接，Web端优先使用原生分享API
 * 2. 简洁的二维码预览
 * 3. 完善的错误处理和加载状态
 * 4. 跨平台兼容性保证
 * 
 * @version 4.0.0 - 简化版本，移除海报生成功能
 * @author ChainAlert Team
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
  Alert,
  ScrollView,
  Image,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWebAppURL } from '../../config/apiConfig';
import QRCode from 'react-native-qrcode-svg';

interface CoinPosterModalProps {
  visible: boolean;
  onClose: () => void;
  coinSymbol: string;
  coinName: string;
  currentPrice?: number;
  priceChange24h?: number;
  logoUrl?: string;
  coinUrl: string;
  onShowMessage?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

const { width } = Dimensions.get('window');

const CoinPosterModal: React.FC<CoinPosterModalProps> = ({
  visible,
  onClose,
  coinSymbol,
  coinName,
  currentPrice,
  priceChange24h,
  logoUrl,
  coinUrl,
  onShowMessage,
}) => {
  // 安全的文本处理函数
  const sanitizeText = (text: string) => {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  };

  // 安全处理后的参数
  const safeCoinSymbol = sanitizeText(coinSymbol);
  const safeCoinName = sanitizeText(coinName);
  const shareUrl = coinUrl || getWebAppURL(`market/${safeCoinSymbol}`);

  // 格式化价格 - 添加类型安全检查
  const formatPrice = (price: number | undefined) => {
    if (typeof price !== 'number' || isNaN(price)) {
      return 'N/A';
    }
    if (price >= 1) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (price >= 0.01) {
      return `$${price.toFixed(4)}`;
    } else {
      return `$${price.toExponential(2)}`;
    }
  };

  // 格式化涨跌幅 - 添加类型安全检查
  const formatPriceChange = (change: number | undefined) => {
    if (typeof change !== 'number' || isNaN(change)) {
      return 'N/A';
    }
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  // 原生分享的降级处理
  const fallbackNativeShare = async () => {
    try {
      await Share.share({
        message: `查看 ${safeCoinSymbol} (${safeCoinName}) 的最新价格和动态：${shareUrl}`,
        url: shareUrl,
        title: `${safeCoinSymbol} - 币链快报`,
      });
      onClose();
    } catch (error) {
      console.error('原生分享失败:', error);
      if (onShowMessage) {
        onShowMessage('error', '分享失败', '无法分享链接，请稍后重试');
      } else {
        Alert.alert('分享失败', '无法分享链接，请稍后重试');
      }
    }
  };

  // 直接分享URL - 优先复制链接
  const handleDirectShare = async () => {
    try {
      if (Platform.OS === 'web') {
        try {
          // Web端优先使用clipboard API
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareUrl);
            if (onShowMessage) {
              onShowMessage('success', '成功', '链接已复制到剪贴板');
            } else {
              Alert.alert('成功', '链接已复制到剪贴板');
            }
            onClose();
          } else {
            // 降级处理：使用document.execCommand
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
              if (onShowMessage) {
                onShowMessage('success', '成功', '链接已复制到剪贴板');
              } else {
                Alert.alert('成功', '链接已复制到剪贴板');
              }
              onClose();
            } else {
              throw new Error('复制失败');
            }
          }
        } catch (webError) {
          console.error('Web端分享失败:', webError);
          // 如果复制失败，尝试原生分享
          await fallbackNativeShare();
        }
      } else {
        // 移动端使用原生分享
        await fallbackNativeShare();
      }
    } catch (error) {
      console.error('分享过程出错:', error);
      if (onShowMessage) {
        onShowMessage('error', '分享失败', '请稍后重试');
      } else {
        Alert.alert('分享失败', '请稍后重试');
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* 头部 */}
          <View style={styles.header}>
            <Text style={styles.title}>分享{safeCoinSymbol}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {/* 币种信息预览 */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.coinInfoContainer}>
              <View style={styles.coinHeader}>
                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={styles.coinLogo} />
                ) : (
                  <View style={styles.defaultLogo}>
                    <Text style={styles.defaultLogoText}>{safeCoinSymbol.charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.coinTextInfo}>
                  <Text style={styles.coinSymbol}>{safeCoinSymbol}</Text>
                  <Text style={styles.coinName}>{safeCoinName}</Text>
                </View>
              </View>

              {/* 价格信息 */}
              {typeof currentPrice === 'number' && !isNaN(currentPrice) && (
                <View style={styles.priceContainer}>
                  <Text style={styles.currentPrice}>{formatPrice(currentPrice)}</Text>
                  {typeof priceChange24h === 'number' && !isNaN(priceChange24h) && (
                    <View style={[
                      styles.priceChangeContainer,
                      { backgroundColor: priceChange24h >= 0 ? '#e8f5e8' : '#fdeaea' }
                    ]}>
                      <Text style={[
                        styles.priceChange,
                        { color: priceChange24h >= 0 ? '#22c55e' : '#ef4444' }
                      ]}>
                        {formatPriceChange(priceChange24h)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* 二维码预览 */}
              <View style={styles.qrPreviewContainer}>
                <Text style={styles.qrTitle}>扫码查看详情</Text>
                <View style={styles.qrCodeContainer}>
                  <QRCode
                    value={shareUrl}
                    size={120}
                    color="#000"
                    backgroundColor="#fff"
                  />
                </View>
                <Text style={styles.qrDescription}>使用任意扫码工具扫描</Text>
              </View>
            </View>
          </ScrollView>

          {/* 操作按钮 - 只保留分享链接 */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton, { flex: 1 }]}
              onPress={handleDirectShare}
            >
              <Ionicons name="share-outline" size={24} color="#fff" />
              <Text style={styles.shareButtonText}>分享链接</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  coinInfoContainer: {
    padding: 20,
  },
  coinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  coinLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  defaultLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  defaultLogoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  coinTextInfo: {
    flex: 1,
  },
  coinSymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  coinName: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  priceChangeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceChange: {
    fontSize: 16,
    fontWeight: '600',
  },
  qrPreviewContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  qrCodeContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  qrDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  shareButton: {
    backgroundColor: '#007AFF',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CoinPosterModal;
