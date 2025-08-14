import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import configService from '../../services/ConfigService';

// Import US stock relevant widgets only
import GreedyIndexWidget from './GreedyIndexWidget';
import ETFDataWidget from './ETFDataWidget';
import DXYWidget from './DXYWidget';
import USBond10YRWidget from './USBond10YRWidget';
import USDJPYWidget from './USDJPYWidget';

// 布局配置接口
interface LayoutConfig {
  columnsPerRow: number;
  spacing: number;
  cardHeight: number;
}

interface ConfigurableDataGridProps {
  onCardPress?: (widgetName: string) => void;
}

// 可用的组件映射
// US stock relevant widget components mapping
const WIDGET_COMPONENTS = {
  GreedyIndex: GreedyIndexWidget,
  ETFData: ETFDataWidget,
  DXY: DXYWidget,
  USBond10YR: USBond10YRWidget,
  USDJPY: USDJPYWidget,
};

// 组件详情页面映射 - 仅US股票相关
const DETAIL_SCREENS = {
  GreedyIndex: 'GreedyIndexDetail',
  ETFData: 'ETFDataDetail',
  DXY: 'DXYDetail',
  USBond10YR: 'USBond10YRDetail',
  USDJPY: 'USDJPYDetail',
};

// 组件标题映射 - 默认值（仅US股票相关）
const DEFAULT_WIDGET_TITLES = {
  GreedyIndex: '恐惧与贪婪指数',
  ETFData: 'ETF数据',
  DXY: '美元指数',
  USBond10YR: '美债10年期',
  USDJPY: '美元日元',
};

// 默认配置字符串 - 仅US股票相关指标
const DEFAULT_CARDS_CONFIG_STRING = 'GreedyIndex,ETFData,DXY,USBond10YR';

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  columnsPerRow: 2,
  spacing: 12,
  cardHeight: 120,
};

const ConfigurableDataGrid: React.FC<ConfigurableDataGridProps> = ({ onCardPress }) => {
  const navigation = useNavigation();
  const [enabledWidgets, setEnabledWidgets] = useState<string[]>([]);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(DEFAULT_LAYOUT_CONFIG);
  const [widgetTitles, setWidgetTitles] = useState<{[key: string]: string}>(DEFAULT_WIDGET_TITLES);
  const [loading, setLoading] = useState(true);

  // 加载配置
  useEffect(() => {
    loadDataGridConfig();
  }, []);

  const loadDataGridConfig = async () => {
    try {
      console.log('🔄 ConfigurableDataGrid: Loading data grid config...');
      
      // 等待configService完全初始化
      await configService.init();
      
      // 获取卡片配置字符串
      const cardsConfigString = await configService.getConfig('DATA_CARDS_CONFIG', DEFAULT_CARDS_CONFIG_STRING);
      
      // 获取布局配置
      const layoutConfigData = await configService.getConfig('DATA_LAYOUT_CONFIG', JSON.stringify(DEFAULT_LAYOUT_CONFIG));
      
      // 获取标题配置
      const titleConfigs = {
        GreedyIndex: await configService.getConfig('DATA_TITLE_GREEDY_INDEX', DEFAULT_WIDGET_TITLES.GreedyIndex),
        MarketCap: await configService.getConfig('DATA_TITLE_MARKET_CAP', DEFAULT_WIDGET_TITLES.MarketCap),
        AltcoinIndex: await configService.getConfig('DATA_TITLE_ALTCOIN_INDEX', DEFAULT_WIDGET_TITLES.AltcoinIndex),
        ETFData: await configService.getConfig('DATA_TITLE_ETF_DATA', DEFAULT_WIDGET_TITLES.ETFData),
        BTCDIndex: await configService.getConfig('DATA_TITLE_BTCD_INDEX', DEFAULT_WIDGET_TITLES.BTCDIndex),
        ETHDIndex: await configService.getConfig('DATA_TITLE_ETHD_INDEX', DEFAULT_WIDGET_TITLES.ETHDIndex),
        Stablecoin: await configService.getConfig('DATA_TITLE_STABLECOIN', DEFAULT_WIDGET_TITLES.Stablecoin),
        DXY: await configService.getConfig('DATA_TITLE_DXY', DEFAULT_WIDGET_TITLES.DXY),
        USBond10YR: await configService.getConfig('DATA_TITLE_US_BOND_10YR', DEFAULT_WIDGET_TITLES.USBond10YR),
        USDJPY: await configService.getConfig('DATA_TITLE_USDJPY', DEFAULT_WIDGET_TITLES.USDJPY),
      };
      
      console.log('🔍 ConfigurableDataGrid: Raw config values:', {
        DATA_CARDS_CONFIG: cardsConfigString,
        DATA_LAYOUT_CONFIG: layoutConfigData,
        titleConfigs: titleConfigs,
      });
      
      // 解析配置字符串为数组
      let widgetNames: string[] = [];
      if (typeof cardsConfigString === 'string' && cardsConfigString.trim()) {
        widgetNames = cardsConfigString.split(',').map(name => name.trim()).filter(name => name && WIDGET_COMPONENTS[name]);
      }
      
      // 如果解析失败，使用默认配置
      if (widgetNames.length === 0) {
        widgetNames = DEFAULT_CARDS_CONFIG_STRING.split(',').map(name => name.trim());
      }
      
      // 确保布局配置是有效的对象
      let validLayoutConfig = DEFAULT_LAYOUT_CONFIG;
      if (typeof layoutConfigData === 'string') {
        try {
          const parsedConfig = JSON.parse(layoutConfigData);
          validLayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...parsedConfig };
        } catch (e) {
          console.warn('Failed to parse layout config:', e);
        }
      } else if (typeof layoutConfigData === 'object') {
        validLayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...layoutConfigData };
      }
      
      setEnabledWidgets(widgetNames);
      setLayoutConfig(validLayoutConfig);
      setWidgetTitles(titleConfigs);
      
      console.log('✅ ConfigurableDataGrid: Config loaded successfully:', {
        enabledWidgets: widgetNames,
        widgetCount: widgetNames.length,
        layoutConfig: validLayoutConfig,
        widgetTitles: titleConfigs,
      });
      
    } catch (error) {
      console.error('❌ ConfigurableDataGrid: Failed to load config:', error);
      // 如果加载配置失败，使用默认值
      const defaultWidgets = DEFAULT_CARDS_CONFIG_STRING.split(',').map(name => name.trim());
      setEnabledWidgets(defaultWidgets);
      setLayoutConfig(DEFAULT_LAYOUT_CONFIG);
      setWidgetTitles(DEFAULT_WIDGET_TITLES);
    } finally {
      setLoading(false);
    }
  };

  // 处理卡片点击
  const handleCardPress = (widgetName: string) => {
    const detailScreen = DETAIL_SCREENS[widgetName];
    if (detailScreen) {
      navigation.navigate(detailScreen);
    }
  };

  // 渲染单个数据卡片
  const renderDataCard = (widgetName: string, index: number) => {
    const WidgetComponent = WIDGET_COMPONENTS[widgetName];
    
    if (!WidgetComponent) {
      console.warn(`Widget component ${widgetName} not found`);
      return null;
    }

    // 计算卡片样式
    const cardStyle = getCardStyle();
    
    // 获取配置的标题
    const customTitle = widgetTitles[widgetName];

    return (
      <TouchableOpacity
        key={`${widgetName}-${index}`}
        style={[styles.indicatorCard, cardStyle]}
        onPress={() => handleCardPress(widgetName)}
        activeOpacity={0.7}
      >
        <WidgetComponent title={customTitle} />
      </TouchableOpacity>
    );
  };

  // 根据配置计算卡片样式
  const getCardStyle = () => {
    const { cardHeight } = layoutConfig;
    
    return {
      height: cardHeight,
    };
  };

  // 将卡片分组为行
  const groupCardsIntoRows = () => {
    const { columnsPerRow } = layoutConfig;
    const rows = [];
    
    for (let i = 0; i < enabledWidgets.length; i += columnsPerRow) {
      const row = enabledWidgets.slice(i, i + columnsPerRow);
      rows.push(row);
    }
    
    return rows;
  };

  if (loading) {
    return <View style={styles.loadingContainer} />;
  }

  const cardRows = groupCardsIntoRows();

  return (
    <View style={styles.marketIndicatorsGrid}>
      {cardRows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.indicatorRow}>
          {row.map((widgetName, cardIndex) => renderDataCard(widgetName, rowIndex * layoutConfig.columnsPerRow + cardIndex))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  marketIndicatorsGrid: {
    gap: 12,
  },
  indicatorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  indicatorCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
});

export default ConfigurableDataGrid;
