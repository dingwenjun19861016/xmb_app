import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import userService from '../../services/UserService';
import googleService from '../../services/GoogleService';
import { User } from '../../types/user';
import { useUser } from '../../contexts/UserContext';
import SvgCaptcha from './SvgCaptcha';
import MessageModal from '../common/MessageModal';
import TermsOfServiceModal from '../modals/TermsOfServiceModal';
import RegisterStatusHandler from './RegisterStatusHandler';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ 
  visible, 
  onClose, 
  onLoginSuccess
}) => {
  const { login } = useUser(); // 获取UserContext的login方法
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true); // 默认已选中
  const [showTermsModal, setShowTermsModal] = useState(false); // 服务条款弹窗状态
  
  // 重发邮件状态管理
  const [showResendView, setShowResendView] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  
  // MessageModal 状态
  const [showMessage, setShowMessage] = useState(false);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [messageButtons, setMessageButtons] = useState<Array<{
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress: () => void;
  }>>([]);

  // 显示消息提示
  const showMessageModal = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    content: string,
    buttons?: Array<{
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress: () => void;
    }>
  ) => {
    setMessageType(type);
    setMessageTitle(title);
    setMessageContent(content);
    setMessageButtons(buttons || [{ text: '确定', onPress: () => setShowMessage(false) }]);
    setShowMessage(true);
  };

  // 处理服务条款链接点击
  const handleTermsPress = () => {
    // console.log('🔍 LoginModal: 服务条款链接被点击');
    // console.log('🔍 LoginModal: 当前 showTermsModal:', showTermsModal);
    // console.log('🔍 LoginModal: 当前 showMessage:', showMessage);
    setShowTermsModal(true); // 显示服务条款弹窗
    // console.log('📋 LoginModal: showTermsModal 设置为 true');
  };

  // 生成验证码
  const generateCaptcha = async () => {
    try {
      // console.log('🔒 正在生成验证码...');
      const result = await userService.generateCaptcha();
      if (result.success && result.captchaImage) {
        setCaptchaImage(result.captchaImage);
        setCaptcha(''); // 清空之前输入的验证码
        // console.log('✅ 验证码生成成功');
      } else {
        console.error('❌ 验证码生成失败:', result.error);
        showMessageModal('error', '错误', result.error || '获取验证码失败');
      }
    } catch (error) {
      console.error('❌ 验证码生成异常:', error);
      showMessageModal('error', '错误', '获取验证码失败');
    }
  };

  // 初始化验证码（仅在注册模式）
  useEffect(() => {
    if (!isLoginMode && visible) {
      generateCaptcha();
    }
  }, [isLoginMode, visible]);

  // 初始化Google登录配置
  useEffect(() => {
    if (visible) {
      googleService.configureGoogleSignIn().then(result => {
        if (!result.success) {
          console.warn('⚠️ Google登录配置失败:', result.error);
        }
      });
    }
  }, [visible]);

  // 组件卸载时清理状态
  useEffect(() => {
    return () => {
      // console.log('🧹 LoginModal: 组件卸载，清理状态');
      resetAllStates();
    };
  }, []);

  // 监听visible变化，关闭时清理状态
  useEffect(() => {
    if (!visible) {
      // console.log('🔄 LoginModal: Modal关闭，清理状态');
      resetAllStates();
    }
  }, [visible]);

  // 清空表单
  const clearForm = () => {
    setEmail('');
    setPassword('');
    setRepeatPassword('');
    setCaptcha('');
    setCaptchaImage('');
  };

  // 重置所有状态
  const resetAllStates = () => {
    // console.log('🔄 LoginModal: 重置所有状态');
    clearForm(); 
    setShowMessage(false);
    setShowTermsModal(false);
    setShowResendView(false);
    setResendEmail('');
    setLoading(false);
    setMessageType('success');
    setMessageTitle('');
    setMessageContent('');
    setMessageButtons([]);
  };

  // 处理Modal关闭
  const handleModalClose = () => {
    // console.log('🚪 LoginModal: 处理Modal关闭');
    resetAllStates();
    onClose();
  };

  // 切换登录/注册模式
  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    clearForm();
  };

  // 处理登录
  const handleLogin = async () => {
    if (!email || !password) {
      showMessageModal('warning', '提示', '请填写邮箱和密码');
      return;
    }

    if (!agreeTerms) {
      showMessageModal('warning', '提示', '请先同意服务条款');
      return;
    }

    setLoading(true);
    try {
      // console.log('🔐 LoginModal: 开始登录流程');
      const result = await userService.login({ email, password });
      
      if (result.success && result.data) {
        // console.log('✅ LoginModal: 登录成功，立即处理成功流程');
        
        // 立即更新UserContext状态
        login(result.data);
        
        // 立即调用成功回调
        onLoginSuccess(result.data);
        
        // 延迟关闭模态框，确保状态清理
        setTimeout(() => {
          // console.log('✅ LoginModal: 关闭登录模态框');
          handleModalClose();
        }, 300);
        
      } else {
        // 根据错误信息提供更友好的提示
        const errorMessage = result.error || '登录失败，请检查邮箱和密码';
        let alertTitle = '登录失败';
        let alertMessage = errorMessage;
        
        if (errorMessage.includes('未激活') || errorMessage.includes('activate') || errorMessage.includes('验证')) {
          alertTitle = '账户未激活';
          alertMessage = '您的账户还未激活，请查看邮箱并点击激活链接。';
        } else if (errorMessage.includes('密码') || errorMessage.includes('password')) {
          alertMessage = '密码错误，请重新输入。';
        } else if (errorMessage.includes('邮箱') || errorMessage.includes('email')) {
          alertMessage = '邮箱不存在，请检查邮箱地址或先注册账户。';
        }
        
        showMessageModal('error', alertTitle, alertMessage);
      }
    } catch (error) {
      console.error('❌ LoginModal: 登录异常:', error);
      showMessageModal('error', '错误', '登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理注册
  const handleRegister = async () => {
    if (!email || !password || !repeatPassword || !captcha) {
      showMessageModal('warning', '提示', '请填写所有字段');
      return;
    }

    if (!agreeTerms) {
      showMessageModal('warning', '提示', '请先同意服务条款');
      return;
    }

    if (password !== repeatPassword) {
      showMessageModal('warning', '提示', '两次密码输入不一致');
      return;
    }

    setLoading(true);
    try {
      // 第一步：检查注册状态
      console.log('� 检查注册状态:', email);
      const checkResult = await userService.checkRegisterStatus(email);
      
      if (checkResult.success) {
        const status = checkResult.status;
        
        switch (status) {
          case 1: // 已激活
            showMessageModal(
              'info',
              '提示',
              '用户已注册并激活，请直接登录',
              [
                {
                  text: '取消',
                  style: 'cancel',
                  onPress: () => setShowMessage(false)
                },
                {
                  text: '去登录',
                  onPress: () => {
                    setShowMessage(false);
                    setIsLoginMode(true);
                    clearForm();
                    setEmail(email); // 保留邮箱方便登录
                  }
                }
              ]
            );
            break;
            
          case 2: // 未激活
            console.log('📧 用户已注册但未激活，进入重发邮件页面');
            setResendEmail(email);
            setShowResendView(true);
            break;
            
          case 3: // 未注册
          default:
            console.log('🚀 执行正常注册流程');
            await performRegister();
            break;
        }
      } else {
        // 检查状态失败，执行正常注册流程
        console.log('⚠️ 检查状态失败，执行正常注册流程');
        await performRegister();
      }
    } catch (error) {
      console.error('Register error:', error);
      showMessageModal('error', '错误', '注册过程中发生错误，请稍后重试');
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  // 执行实际的注册操作
  const performRegister = async () => {
    const result = await userService.register({
      email,
      password,
      repeatPassword,
      captcha
    });
    
    if (result.success) {
      console.log('✅ 注册成功，进入重发邮件页面');
      setResendEmail(email);
      setShowResendView(true);
    } else {
      showMessageModal(
        'error',
        '注册失败',
        result.error || '注册失败，请稍后重试'
      );
      generateCaptcha();
    }
  };

  const handleSubmit = () => {
    if (isLoginMode) {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  // Google登录处理函数
  const handleGoogleLogin = async () => {
    if (!agreeTerms) {
      showMessageModal('warning', '提示', '请先同意服务条款');
      return;
    }

    setLoading(true);
    try {
      // console.log('🔐 开始Google登录...');
      const result = await googleService.performGoogleLogin();
      
      if (result.success && result.data) {
        // console.log('✅ Google登录成功，处理登录流程...');
        
        // 构造用户对象，包含token
        const user: User = {
          id: result.data.email, // 使用email作为ID，因为后端没有返回user_id
          email: result.data.email,
          username: result.data.email,
          token: result.data.token, // 🔑 重要：包含token
          role: result.data.role,
          verified: true, // Google用户默认已验证
          provider: 'google',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        // 🔑 关键：使用UserService保存用户信息和token到本地存储
        const saveResult = await userService.loginWithGoogleUser(user);
        if (!saveResult.success) {
          console.error('⚠️ 保存Google用户信息失败:', saveResult.error);
          showMessageModal('warning', '警告', '登录成功但保存用户信息失败，可能影响后续使用');
        } else {
          // console.log('✅ Google登录用户信息已保存到本地存储，token:', user.token ? 'exists' : 'missing');
        }
        
        // 更新UserContext状态
        login(user);
        
        // 调用成功回调
        onLoginSuccess(user);
        
        // 显示成功消息
        const message = result.data.isNewUser 
          ? '🎉 免注册成功！Google账户已自动创建，欢迎使用ChainAlert！'
          : '✅ Google免密登录成功！欢迎回来！';
          
        showMessageModal(
          'success',
          '登录成功',
          message,
          [
            {
              text: '确定',
              onPress: () => {
                setShowMessage(false);
                setTimeout(() => handleModalClose(), 300);
              }
            }
          ]
        );
        
      } else {
        // 只在非用户主动取消时显示错误
        if (result.error !== '用户取消了登录') {
          showMessageModal('error', '登录失败', result.error || 'Google登录失败');
        }
      }
    } catch (error: any) {
      console.error('❌ Google登录异常:', error);
      showMessageModal('error', '错误', 'Google登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleModalClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {isLoginMode ? '用户登录' : '用户注册'}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleModalClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {showResendView ? (
            /* 重发邮件界面 */
            <RegisterStatusHandler
              email={resendEmail}
              onNavigateToLogin={() => {
                setShowResendView(false);
                setIsLoginMode(true);
                clearForm();
                setEmail(resendEmail); // 保留邮箱方便登录
              }}
              onClose={() => {
                setShowResendView(false);
                handleModalClose();
              }}
            />
          ) : (
            /* 原有的登录/注册表单 */
            <>
              {/* 切换标签 */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, isLoginMode && styles.activeTab]}
                  onPress={() => setIsLoginMode(true)}
                >
                  <Text style={[styles.tabText, isLoginMode && styles.activeTabText]}>
                    用户登录
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, !isLoginMode && styles.activeTab]}
                  onPress={() => setIsLoginMode(false)}
                >
                  <Text style={[styles.tabText, !isLoginMode && styles.activeTabText]}>
                    注册
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 邮箱输入 */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>邮箱：</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="请输入邮箱地址"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                  {email.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => setEmail('')}
                    >
                      <Ionicons name="close-circle" size={20} color="#ccc" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* 密码输入 */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>密码：</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="请输入密码"
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#ccc" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 注册模式下的重复密码 */}
              {!isLoginMode && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>重复密码：</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={repeatPassword}
                      onChangeText={setRepeatPassword}
                      placeholder="请再次输入密码"
                      secureTextEntry={!showRepeatPassword}
                      autoComplete="password"
                    />
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => setShowRepeatPassword(!showRepeatPassword)}
                    >
                      <Ionicons 
                        name={showRepeatPassword ? "eye-off" : "eye"} 
                        size={20} 
                        color="#ccc" 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* 注册模式下的验证码 */}
              {!isLoginMode && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>验证码：</Text>
                  <View style={styles.captchaContainer}>
                    <SvgCaptcha
                      svgString={captchaImage}
                      onRefresh={generateCaptcha}
                      width={120}
                      height={40}
                    />
                    <View style={styles.captchaInputContainer}>
                      <TextInput
                        style={styles.captchaInput}
                        value={captcha}
                        onChangeText={setCaptcha}
                        placeholder="输入验证码"
                        autoCapitalize="none"
                        maxLength={6}
                      />
                      {captcha.length > 0 && (
                        <TouchableOpacity
                          style={styles.clearButton}
                          onPress={() => setCaptcha('')}
                        >
                          <Ionicons name="close-circle" size={20} color="#ccc" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {captchaImage && (
                    <Text style={styles.captchaHint}>
                      提示：请输入图片中显示的字符，点击图片可刷新验证码
                    </Text>
                  )}
                </View>
              )}

              {/* 服务条款同意复选框 */}
              <View style={styles.termsContainer}>
                <View style={styles.checkboxRow}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setAgreeTerms(!agreeTerms)}
                  >
                    <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                      {agreeTerms && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                  <View style={styles.termsTextContainer}>
                    <Text style={styles.termsText}>我已阅读并同意 </Text>
                    <TouchableOpacity 
                      onPress={handleTermsPress}
                      style={styles.termsLinkContainer}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.termsLink}>《服务条款》</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* 提交按钮 */}
              <TouchableOpacity
                style={[
                  styles.submitButton, 
                  (loading || !agreeTerms) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={loading || !agreeTerms}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {isLoginMode ? '登录' : '注册'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Google登录部分 - 仅在登录模式显示 */}
              {isLoginMode && (
                <View style={styles.socialLoginSection}>
                  <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>或</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.googleButton, loading && styles.buttonDisabled]}
                    onPress={handleGoogleLogin}
                    disabled={loading}
                  >
                    <Ionicons name="logo-google" size={20} color="#fff" />
                    <Text style={styles.googleButtonText}>免注册，使用Google登录</Text>
                    {loading && (
                      <ActivityIndicator 
                        size="small" 
                        color="#fff" 
                        style={styles.googleLoader} 
                      />
                    )}
                  </TouchableOpacity>

                  <Text style={styles.googleHint}>
                    💡 免注册快速登录，使用Google账户一键登录
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
        
        {/* 服务条款弹窗 - 在LoginModal内部，确保在最上层 */}
        <TermsOfServiceModal
          visible={showTermsModal}
          onClose={() => {
            // console.log('📋 LoginModal: 关闭服务条款弹窗');
            setShowTermsModal(false);
          }}
        />
      </KeyboardAvoidingView>
    </Modal>

    {/* 自定义消息提示 */}
    <MessageModal
      visible={showMessage}
      type={messageType}
      title={messageTitle}
      message={messageContent}
      buttons={messageButtons}
      onClose={() => setShowMessage(false)}
    />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 30,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#333',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 10,
  },
  captchaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  captchaInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  captchaInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  captchaHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  termsContainer: {
    marginTop: 20,
    paddingHorizontal: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    paddingTop: 2, // 稍微调整位置对齐文本
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  termsLinkContainer: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  termsLink: {
    color: '#007AFF',
    textDecorationLine: 'underline',
    fontSize: 14,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Google登录相关样式
  socialLoginSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#eee',
  },
  dividerText: {
    color: '#666',
    fontSize: 14,
    marginHorizontal: 15,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 10,
    position: 'relative',
    minHeight: 50,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  googleLoader: {
    position: 'absolute',
    right: 15,
  },
  googleHint: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 10,
    fontStyle: 'italic',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default LoginModal;
