import { StyleSheet } from 'react-native';

// 市场数据卡片的统一样式主题
export const MarketWidgetColors = {
  // 背景颜色
  background: '#F8FAFE',
  cardBackground: '#FFFFFF',
  
  // 主色调 - 浅蓝色主题
  primary: '#1565C0',      // 深蓝色
  primaryLight: '#42A5F5', // 中蓝色
  primaryDark: '#0D47A1',  // 深蓝色
  
  // 文本颜色
  titleColor: '#1565C0',
  valueColor: '#0D47A1',
  labelColor: '#42A5F5',
  
  // 状态颜色
  loadingColor: '#42A5F5',
  errorColor: '#E57373',
  successColor: '#66BB6A',
  
  // 边框和阴影
  borderColor: '#E3F2FD',
  shadowColor: '#1565C0',
};

// 市场数据卡片的统一样式
export const marketWidgetStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 10,
    minHeight: 120,
    backgroundColor: MarketWidgetColors.background,
    borderRadius: 12,
    shadowColor: MarketWidgetColors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: MarketWidgetColors.borderColor,
  },
  
  // 标题样式
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: MarketWidgetColors.titleColor,
    textAlign: 'center',
    marginBottom: 8,
  },
  
  // 内容容器
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  
  // 数据显示
  dataDisplay: {
    alignItems: 'center',
  },
  
  // 主要数值
  mainValue: {
    fontSize: 18,
    fontWeight: '700',
    color: MarketWidgetColors.valueColor,
    marginBottom: 2,
    textAlign: 'center',
  },
  
  // 较小的主要数值（用于长数字）
  mainValueSmall: {
    fontSize: 16,
    fontWeight: '700',
    color: MarketWidgetColors.valueColor,
    marginBottom: 2,
    textAlign: 'center',
  },
  
  // 数值标签
  valueLabel: {
    fontSize: 10,
    color: MarketWidgetColors.labelColor,
    fontWeight: '500',
  },
  
  // 变化显示
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  
  changeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  
  changePositive: {
    color: MarketWidgetColors.successColor,
  },
  
  changeNegative: {
    color: MarketWidgetColors.errorColor,
  },
  
  // 加载状态
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    fontSize: 11,
    color: MarketWidgetColors.loadingColor,
    marginTop: 6,
  },
  
  // 错误状态
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  errorText: {
    fontSize: 10,
    color: MarketWidgetColors.errorColor,
    textAlign: 'center',
    marginTop: 3,
  },
});

// 工具函数：根据数值长度选择合适的字体大小
export const getValueFontSize = (value: string): 'mainValue' | 'mainValueSmall' => {
  // 如果数值超过8位，使用较小字体
  return value.length > 8 ? 'mainValueSmall' : 'mainValue';
};
