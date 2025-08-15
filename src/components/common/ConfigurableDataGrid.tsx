import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import configService from '../../services/ConfigService';

// Import US stock relevant widgets only (removed GreedyIndex)
import DXYWidget from './DXYWidget';
import USBond10YRWidget from './USBond10YRWidget';
import SP500Widget from './SP500Widget';
import NasdaqWidget from './NasdaqWidget';

// 布局配置接口
interface LayoutConfig {
  columnsPerRow: number;
  spacing: number;
  cardHeight: number;
}

interface ConfigurableDataGridProps {
  onCardPress?: (widgetName: string) => void;
}

// 可用的组件映射 (removed GreedyIndex)
const WIDGET_COMPONENTS = {
  DXY: DXYWidget,
  USBond10YR: USBond10YRWidget,
  SP500: SP500Widget,
  Nasdaq: NasdaqWidget,
};

// 组件详情页面映射 (removed GreedyIndexDetail)
const DETAIL_SCREENS = {
  DXY: 'DXYDetail',
  USBond10YR: 'USBond10YRDetail',
  SP500: 'SP500Detail',
  Nasdaq: 'NasdaqDetail',
};

// 组件标题映射 - 默认值 (removed GreedyIndex)
const DEFAULT_WIDGET_TITLES = {
  DXY: '美元指数',
  USBond10YR: '美债10年期',
  SP500: '标普500',
  Nasdaq: '纳斯达克',
};

// 默认配置字符串 (removed GreedyIndex)
const DEFAULT_CARDS_CONFIG_STRING = 'DXY,USBond10YR,SP500,Nasdaq';

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
      await configService.init();
      const cardsConfigString = await configService.getConfig('DATA_CARDS_CONFIG', DEFAULT_CARDS_CONFIG_STRING);
      const layoutConfigData = await configService.getConfig('DATA_LAYOUT_CONFIG', JSON.stringify(DEFAULT_LAYOUT_CONFIG));
      const titleConfigs = {
        DXY: await configService.getConfig('DATA_TITLE_DXY', DEFAULT_WIDGET_TITLES.DXY),
        USBond10YR: await configService.getConfig('DATA_TITLE_US_BOND_10YR', DEFAULT_WIDGET_TITLES.USBond10YR),
        SP500: await configService.getConfig('DATA_TITLE_SP500', DEFAULT_WIDGET_TITLES.SP500),
        Nasdaq: await configService.getConfig('DATA_TITLE_NASDAQ', DEFAULT_WIDGET_TITLES.Nasdaq),
      };
      console.log('🔍 ConfigurableDataGrid: Raw config values:', { DATA_CARDS_CONFIG: cardsConfigString, DATA_LAYOUT_CONFIG: layoutConfigData, titleConfigs });
      let widgetNames: string[] = [];
      if (typeof cardsConfigString === 'string' && cardsConfigString.trim()) {
        widgetNames = cardsConfigString.split(',').map(name => name.trim()).filter(name => name && WIDGET_COMPONENTS[name]);
      }
      if (widgetNames.length === 0) {
        widgetNames = DEFAULT_CARDS_CONFIG_STRING.split(',').map(name => name.trim());
      }
      let validLayoutConfig = DEFAULT_LAYOUT_CONFIG;
      if (typeof layoutConfigData === 'string') {
        try { validLayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...JSON.parse(layoutConfigData) }; } catch (e) { console.warn('Failed to parse layout config:', e); }
      } else if (typeof layoutConfigData === 'object') {
        validLayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...layoutConfigData };
      }
      setEnabledWidgets(widgetNames);
      setLayoutConfig(validLayoutConfig);
      setWidgetTitles(titleConfigs);
      console.log('✅ ConfigurableDataGrid: Config loaded successfully:', { enabledWidgets: widgetNames, widgetCount: widgetNames.length, layoutConfig: validLayoutConfig, widgetTitles: titleConfigs });
    } catch (error) {
      console.error('❌ ConfigurableDataGrid: Failed to load config:', error);
      const defaultWidgets = DEFAULT_CARDS_CONFIG_STRING.split(',').map(name => name.trim());
      setEnabledWidgets(defaultWidgets);
      setLayoutConfig(DEFAULT_LAYOUT_CONFIG);
      setWidgetTitles(DEFAULT_WIDGET_TITLES);
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = (widgetName: string) => {
    const detailScreen = DETAIL_SCREENS[widgetName];
    if (detailScreen) {
      navigation.navigate(detailScreen);
    }
  };

  const renderDataCard = (widgetName: string, index: number) => {
    const WidgetComponent = WIDGET_COMPONENTS[widgetName];
    if (!WidgetComponent) return null;
    const cardStyle = getCardStyle();
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

  const getCardStyle = () => ({ height: layoutConfig.cardHeight });

  const groupCardsIntoRows = () => {
    const { columnsPerRow } = layoutConfig;
    const rows = [];
    for (let i = 0; i < enabledWidgets.length; i += columnsPerRow) {
      rows.push(enabledWidgets.slice(i, i + columnsPerRow));
    }
    return rows;
  };

  if (loading) return <View style={styles.loadingContainer} />;

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
  loadingContainer: { height: 200, justifyContent: 'center', alignItems: 'center' },
  marketIndicatorsGrid: { gap: 12 },
  indicatorRow: { flexDirection: 'row', gap: 12 },
  indicatorCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, height: 120, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#F0F0F0', overflow: 'hidden' },
});

export default ConfigurableDataGrid;
