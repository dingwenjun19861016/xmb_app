import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import usStockRealTimePriceService from '../services/USStockRealTimePriceService';

// 价格变动方向类型
type PriceDirection = 'up' | 'down' | null;

// Context的值类型
interface USStockRealTimePriceContextType {
  // 实时价格数据 { nvda: 178.08, aapl: 212.39, ... }
  realTimePrices: { [key: string]: number };
  
  // 价格变动方向 { nvda: 'up', aapl: 'down', ... }
  priceChanges: { [key: string]: PriceDirection };
  
  // 是否正在轮询
  isPolling: boolean;
  
  // 启动轮询（当组件需要实时价格时调用）
  startPolling: () => void;
  
  // 停止轮询（当组件不再需要实时价格时调用）
  stopPolling: () => void;
  
  // 获取特定股票的实时价格
  getPrice: (stockSymbol: string) => number | null;
  
  // 获取特定股票的价格变动方向
  getPriceChange: (stockSymbol: string) => PriceDirection;
}

// 创建Context
const USStockRealTimePriceContext = createContext<USStockRealTimePriceContextType | undefined>(undefined);

// Provider组件的Props
interface USStockRealTimePriceProviderProps {
  children: ReactNode;
  // 轮询间隔（毫秒），默认10秒
  pollingInterval?: number;
}

// Provider组件
export const USStockRealTimePriceProvider: React.FC<USStockRealTimePriceProviderProps> = ({
  children,
  pollingInterval = 10000 // 默认10秒间隔
}) => {
  const [realTimePrices, setRealTimePrices] = useState<{ [key: string]: number }>({});
  const [priceChanges, setPriceChanges] = useState<{ [key: string]: PriceDirection }>({});
  const [isPolling, setIsPolling] = useState(false);
  
  // 使用ref来跟踪轮询状态和订阅者数量
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscribersRef = useRef(0);
  const previousPricesRef = useRef<{ [key: string]: number }>({});

  // 获取实时价格数据
  const fetchRealTimePrices = async () => {
    try {
      // console.log('🔄 USStockRealTimePriceContext: Fetching US stock prices...');
      
      // 调用美股实时价格服务
      const priceMap = await usStockRealTimePriceService.getAllRealTimePricesAsMap();
      
      // console.log(`✅ USStockRealTimePriceContext: Received ${Object.keys(priceMap).length} stock prices`);
      
      // 检测价格变动
      const newPriceChanges: { [key: string]: PriceDirection } = {};
      const previousPrices = previousPricesRef.current;
      
      // 只有当有历史价格时才检测变动
      if (Object.keys(previousPrices).length > 0) {
        Object.keys(priceMap).forEach(stock => {
          const currentPrice = priceMap[stock];
          const previousPrice = previousPrices[stock];
          
          if (previousPrice && currentPrice !== previousPrice) {
            newPriceChanges[stock] = currentPrice > previousPrice ? 'up' : 'down';
            // console.log(`💰 ${stock}: ${previousPrice} → ${currentPrice} (${newPriceChanges[stock]})`);
          }
        });
      }
      
      // 更新价格数据
      setRealTimePrices(priceMap);
      previousPricesRef.current = { ...priceMap };
      
      // 如果有价格变动，设置变动状态并在3秒后清除
      if (Object.keys(newPriceChanges).length > 0) {
        setPriceChanges(newPriceChanges);
        setTimeout(() => {
          setPriceChanges({});
        }, 3000);
      }
      
    } catch (error) {
      console.error('❌ USStockRealTimePriceContext: Failed to fetch stock prices:', error);
      // 不打断用户体验，继续使用之前的价格数据
    }
  };

  // 启动轮询
  const startPolling = () => {
    subscribersRef.current += 1;
    
    // console.log(`📈 USStockRealTimePriceContext: Start polling requested (${subscribersRef.current} subscribers)`);
    
    if (pollingIntervalRef.current) {
      // 已经在轮询，无需重复启动
      return;
    }
    
    setIsPolling(true);
    
    // 立即获取一次数据
    fetchRealTimePrices();
    
    // 开始定期轮询
    pollingIntervalRef.current = setInterval(fetchRealTimePrices, pollingInterval);
    
    console.log(`🚀 USStockRealTimePriceContext: US stock price polling started (interval: ${pollingInterval}ms)`);
  };

  // 停止轮询
  const stopPolling = () => {
    subscribersRef.current = Math.max(0, subscribersRef.current - 1);
    
    // console.log(`📉 USStockRealTimePriceContext: Stop polling requested (${subscribersRef.current} subscribers)`);
    
    // 只有当没有订阅者时才停止轮询
    if (subscribersRef.current === 0 && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIsPolling(false);
      console.log('⏹️ USStockRealTimePriceContext: US stock price polling stopped');
    }
  };

  // 获取特定股票的实时价格
  const getPrice = (stockSymbol: string): number | null => {
    const price = realTimePrices[stockSymbol.toLowerCase()];
    return price !== undefined ? price : null;
  };

  // 获取特定股票的价格变动方向
  const getPriceChange = (stockSymbol: string): PriceDirection => {
    return priceChanges[stockSymbol.toLowerCase()] || null;
  };

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        console.log('🧹 USStockRealTimePriceContext: Cleanup - polling stopped');
      }
    };
  }, []);

  const value: USStockRealTimePriceContextType = {
    realTimePrices,
    priceChanges,
    isPolling,
    startPolling,
    stopPolling,
    getPrice,
    getPriceChange,
  };

  return (
    <USStockRealTimePriceContext.Provider value={value}>
      {children}
    </USStockRealTimePriceContext.Provider>
  );
};

// Hook for using the context
export const useUSStockRealTimePrice = (): USStockRealTimePriceContextType => {
  const context = useContext(USStockRealTimePriceContext);
  if (context === undefined) {
    throw new Error('useUSStockRealTimePrice must be used within a USStockRealTimePriceProvider');
  }
  return context;
};

// 默认导出Provider
export default USStockRealTimePriceProvider;

// 也导出命名的Provider，以便同时支持两种导入方式
export { USStockRealTimePriceProvider };
