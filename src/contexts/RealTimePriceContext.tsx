import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import coinRealTimePriceService from '../services/CoinRealTimePriceService';

// 价格变动方向类型
type PriceDirection = 'up' | 'down' | null;

// Context的值类型
interface RealTimePriceContextType {
  // 实时价格数据 { btc: 45000, eth: 2800, ... }
  realTimePrices: { [key: string]: number };
  
  // 价格变动方向 { btc: 'up', eth: 'down', ... }
  priceChanges: { [key: string]: PriceDirection };
  
  // 是否正在轮询
  isPolling: boolean;
  
  // 启动轮询（当组件需要实时价格时调用）
  startPolling: () => void;
  
  // 停止轮询（当组件不再需要实时价格时调用）
  stopPolling: () => void;
  
  // 获取特定币种的实时价格
  getPrice: (coinSymbol: string) => number | null;
  
  // 获取特定币种的价格变动方向
  getPriceChange: (coinSymbol: string) => PriceDirection;
}

// 创建Context
const RealTimePriceContext = createContext<RealTimePriceContextType | undefined>(undefined);

// Provider组件的Props
interface RealTimePriceProviderProps {
  children: ReactNode;
  // 轮询间隔（毫秒），默认10秒
  pollingInterval?: number;
}

// Provider组件
export const RealTimePriceProvider: React.FC<RealTimePriceProviderProps> = ({
  children,
  pollingInterval = 10000 // 默认10秒间隔，比原来的6秒稍长一些，减少API压力
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
      // console.log('🔄 RealTimePriceContext: Fetching prices...');
      
      // 调用现有的实时价格服务
      const priceMap = await coinRealTimePriceService.getAllRealTimePricesAsMap();
      
      // console.log(`✅ RealTimePriceContext: Received ${Object.keys(priceMap).length} prices`);
      
      // 检测价格变动
      const newPriceChanges: { [key: string]: PriceDirection } = {};
      const previousPrices = previousPricesRef.current;
      
      // 只有当有历史价格时才检测变动
      if (Object.keys(previousPrices).length > 0) {
        Object.keys(priceMap).forEach(coin => {
          const currentPrice = priceMap[coin];
          const previousPrice = previousPrices[coin];
          
          if (previousPrice && currentPrice !== previousPrice) {
            newPriceChanges[coin] = currentPrice > previousPrice ? 'up' : 'down';
            // console.log(`💰 ${coin}: ${previousPrice} → ${currentPrice} (${newPriceChanges[coin]})`);
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
      console.error('❌ RealTimePriceContext: Failed to fetch prices:', error);
      // 不打断用户体验，继续使用之前的价格数据
    }
  };

  // 启动轮询
  const startPolling = () => {
    subscribersRef.current += 1;
    // console.log(`📈 RealTimePriceContext: Start polling requested, subscribers: ${subscribersRef.current}`);
    
    // 如果已经在轮询，不重复启动
    if (pollingIntervalRef.current) {
      return;
    }
    
    setIsPolling(true);
    
    // 立即获取一次价格
    fetchRealTimePrices();
    
    // 开始定时轮询
    pollingIntervalRef.current = setInterval(fetchRealTimePrices, pollingInterval);
    // console.log(`✅ RealTimePriceContext: Polling started (${pollingInterval/1000}s interval)`);
  };

  // 停止轮询
  const stopPolling = () => {
    subscribersRef.current = Math.max(0, subscribersRef.current - 1);
    // console.log(`📉 RealTimePriceContext: Stop polling requested, subscribers: ${subscribersRef.current}`);
    
    // 只有当没有订阅者时才真正停止轮询
    if (subscribersRef.current === 0 && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIsPolling(false);
      // console.log('⏹️ RealTimePriceContext: Polling stopped');
    }
  };

  // 获取特定币种价格
  const getPrice = (coinSymbol: string): number | null => {
    const normalizedSymbol = coinSymbol.toLowerCase();
    return realTimePrices[normalizedSymbol] || null;
  };

  // 获取特定币种价格变动方向
  const getPriceChange = (coinSymbol: string): PriceDirection => {
    const normalizedSymbol = coinSymbol.toLowerCase();
    return priceChanges[normalizedSymbol] || null;
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const contextValue: RealTimePriceContextType = {
    realTimePrices,
    priceChanges,
    isPolling,
    startPolling,
    stopPolling,
    getPrice,
    getPriceChange
  };

  return (
    <RealTimePriceContext.Provider value={contextValue}>
      {children}
    </RealTimePriceContext.Provider>
  );
};

// Hook for using the context
export const useRealTimePrice = (): RealTimePriceContextType => {
  const context = useContext(RealTimePriceContext);
  if (context === undefined) {
    throw new Error('useRealTimePrice must be used within a RealTimePriceProvider');
  }
  return context;
};

export default RealTimePriceContext;
