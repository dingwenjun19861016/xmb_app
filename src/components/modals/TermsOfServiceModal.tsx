import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TermsOfServiceModalProps {
  visible: boolean;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({
  visible,
  onClose,
}) => {
  console.log('📋 TermsOfServiceModal: Modal visible state:', visible);
  
  const handleClose = () => {
    console.log('📋 TermsOfServiceModal: 关闭按钮被点击');
    onClose();
  };
  
  if (!visible) {
    return null;
  }
  
  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>服务条款</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>重要声明</Text>
            <Text style={styles.sectionText}>
              欢迎使用小目标（小目标）应用程序。在使用本应用前，请仔细阅读并理解以下服务条款。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>投资风险提示</Text>
            <Text style={styles.importantText}>
              本应用内容不构成投资建议。
            </Text>
            <Text style={styles.sectionText}>
              加密货币投资具有极高的风险性和波动性，您应当根据自己的财务状况、投资经验和风险承受能力做出独立的投资决策。
            </Text>
            <Text style={styles.sectionText}>
              任何投资决策均应基于您自己的研究和判断，本应用不对您的投资损失承担任何责任。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>数据来源声明</Text>
            <Text style={styles.sectionText}>
              本应用所提供的数据和信息来源于互联网公开资源，包括但不限于各大交易所、区块链浏览器、官方网站等。
            </Text>
            <Text style={styles.warningText}>
              请用户自行甄别内容的准确性和时效性。
            </Text>
            <Text style={styles.sectionText}>
              我们尽力确保数据的准确性，但不保证信息的完整性、准确性或及时性。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>免责声明</Text>
            <Text style={styles.bulletPoint}>
              • 本应用仅作为信息展示和数据查询工具使用
            </Text>
            <Text style={styles.bulletPoint}>
              • 我们不提供投资咨询、财务建议或交易建议
            </Text>
            <Text style={styles.bulletPoint}>
              • 用户因使用本应用信息而产生的任何损失，我们不承担责任
            </Text>
            <Text style={styles.bulletPoint}>
              • 本应用可能包含第三方网站或服务的链接，我们不对这些外部内容负责
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>用户责任</Text>
            <Text style={styles.bulletPoint}>
              • 用户应确保提供的注册信息真实、准确、完整
            </Text>
            <Text style={styles.bulletPoint}>
              • 妥善保管账户信息，不得与他人共享账户
            </Text>
            <Text style={styles.bulletPoint}>
              • 不得利用本应用进行任何违法违规活动
            </Text>
            <Text style={styles.bulletPoint}>
              • 理性投资，自行承担投资风险
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>隐私保护</Text>
            <Text style={styles.sectionText}>
              我们重视用户隐私保护，仅收集必要的用户信息用于提供服务。用户信息将按照相关法律法规进行保护，不会未经授权向第三方披露。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>服务变更</Text>
            <Text style={styles.sectionText}>
              我们保留随时修改、暂停或终止服务的权利。重要变更将通过应用内通知或其他适当方式告知用户。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>法律适用</Text>
            <Text style={styles.sectionText}>
              本服务条款的解释和争议解决适用中华人民共和国法律。如发生争议，应通过友好协商解决；协商不成的，可向有管辖权的人民法院提起诉讼。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>联系我们</Text>
            <Text style={styles.sectionText}>
              如果您对本服务条款有任何疑问或建议，请通过应用内的联系方式与我们联系。
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              本服务条款最后更新时间：2024年1月
            </Text>
            <Text style={styles.footerText}>
              继续使用本应用即表示您同意本服务条款的所有内容。
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>我已阅读并理解</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1000, // Android elevation
  },
  container: {
    width: width * 0.9,
    height: height * 0.8,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // 为底部按钮留出空间
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#3C3C43',
    marginBottom: 8,
  },
  importantText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FF3B30',
    fontWeight: '600',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FF9500',
    fontWeight: '500',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    color: '#3C3C43',
    marginBottom: 8,
    paddingLeft: 8,
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 8,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34, // 为安全区域留出空间
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default TermsOfServiceModal;
