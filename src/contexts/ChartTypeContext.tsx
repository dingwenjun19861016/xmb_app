import React, { createContext, useState, useContext, ReactNode } from 'react';

// 图表类型的类型定义
type ChartType = 'price' | 'rank';

// 图表类型上下文接口定义
interface ChartTypeContextProps {
  getChartType: (coinName: string) => ChartType;
  setChartType: (coinName: string, type: ChartType) => void;
}

// 创建上下文
const ChartTypeContext = createContext<ChartTypeContextProps | undefined>(undefined);

// 提供一个hooks函数来使用上下文
export const useChartType = () => {
  const context = useContext(ChartTypeContext);
  if (!context) {
    throw new Error('useChartType must be used within a ChartTypeProvider');
  }
  return context;
};

interface ChartTypeProviderProps {
  children: ReactNode;
}

// 上下文提供者组件
export const ChartTypeProvider: React.FC<ChartTypeProviderProps> = ({ children }) => {
  // 使用状态来存储各币种的图表类型选择
  const [chartTypeMap, setChartTypeMap] = useState<Record<string, ChartType>>({});

  // 获取币种的图表类型
  const getChartType = (coinName: string): ChartType => {
    return chartTypeMap[coinName] || 'price'; // 默认值为'price'
  };

  // 设置币种的图表类型
  const setChartType = (coinName: string, type: ChartType) => {
    setChartTypeMap(prev => ({
      ...prev,
      [coinName]: type
    }));
  };

  const value = {
    getChartType,
    setChartType
  };

  return (
    <ChartTypeContext.Provider value={value}>
      {children}
    </ChartTypeContext.Provider>
  );
};
