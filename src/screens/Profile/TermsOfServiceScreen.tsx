import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const TermsOfServiceScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>服务条款</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>重要声明</Text>
            <Text style={styles.paragraph}>
              欢迎使用币链快报（ChainAlert）应用程序。在使用本应用前，请仔细阅读并理解以下服务条款。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>投资风险提示</Text>
            <Text style={styles.paragraph}>
              <Text style={styles.highlight}>本应用内容不构成投资建议。</Text>
              加密货币投资具有极高的风险性和波动性，您应当根据自己的财务状况、投资经验和风险承受能力做出独立的投资决策。
            </Text>
            <Text style={styles.paragraph}>
              任何投资决策均应基于您自己的研究和判断，本应用不对您的投资损失承担任何责任。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>数据来源声明</Text>
            <Text style={styles.paragraph}>
              本应用所提供的数据和信息来源于互联网公开资源，包括但不限于各大交易所、区块链浏览器、官方网站等。
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.highlight}>请用户自行甄别内容的准确性和时效性。</Text>
              我们尽力确保数据的准确性，但不保证信息的完整性、准确性或及时性。
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>免责声明</Text>
            <Text style={styles.paragraph}>
              • 本应用仅作为信息展示和数据查询工具使用
            </Text>
            <Text style={styles.paragraph}>
              • 我们不提供投资咨询、财务建议或交易建议
            </Text>
            <Text style={styles.paragraph}>
              • 用户因使用本应用信息而产生的任何损失，我们不承担责任
            </Text>
            <Text style={styles.paragraph}>
              • 加密货币市场存在极大风险，价格波动剧烈，请谨慎投资
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>用户责任</Text>
            <Text style={styles.paragraph}>
              使用本应用即表示您同意：
            </Text>
            <Text style={styles.paragraph}>
              • 遵守当地法律法规，合规使用本应用
            </Text>
            <Text style={styles.paragraph}>
              • 自行承担投资风险，理性对待市场波动
            </Text>
            <Text style={styles.paragraph}>
              • 不将本应用信息作为唯一投资依据
            </Text>
            <Text style={styles.paragraph}>
              • 建议多方求证，综合分析后做出投资决策
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>服务变更</Text>
            <Text style={styles.paragraph}>
              我们保留随时修改或更新本服务条款的权利。条款变更后，继续使用本应用即视为接受新的服务条款。
            </Text>
          </View>

          <View style={styles.warningBox}>
            <Ionicons name="warning" size={24} color="#FF9500" />
            <Text style={styles.warningText}>
              投资有风险，入市需谨慎。请在充分了解相关风险的基础上做出投资决策。
            </Text>
          </View>
        </View>
      </ScrollView>
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
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
    marginBottom: 12,
  },
  highlight: {
    fontWeight: '600',
    color: '#FF6B35',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    marginTop: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#E65100',
    marginLeft: 12,
    fontWeight: '500',
  },
});

export default TermsOfServiceScreen;
