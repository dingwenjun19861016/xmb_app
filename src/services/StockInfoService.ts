/**
 * StockInfoService - 股票信息服务
 * 支持通过 RPC 1.0 协议获取股票历史信息
 */

import apiService, { APIError } from './APIService';

// 交易所信息接口 (保留原有接口名称，但用于股票交易所)
export interface CexInfo {
  cexRank: string;
  cexPair: string;
  cexName: string;
  cexPrice: string;
  cexVolume: string;
  cexVolumePercent: string;
  cexUrl?: string; // 添加可选的交易所URL字段
}

// 股票信息接口
export interface StockInfo {
  rank: number;
  name: string;
  fullName?: string; // 添加fullName字段，股票的完整名称
  currentPrice: string;
  priceChange24h: string;
  marketcap: string;
  volume: string;
  fdv: string;
  totalSupply: string;
  circulatingSupply: string;
  description: string;
  cexInfos: CexInfo[]; // 交易所信息 (如 NASDAQ, NYSE 等)
  valid: boolean;
  created_at: string;
  date: string;
  updated_at: string;
  stock_id: string; // 改名为 stock_id
}

// 为了兼容性，保留 CoinInfo 别名
export interface CoinInfo extends StockInfo {
  coin_id: string; // 兼容旧字段名
}

/**
 * 股票信息服务类
 */
class StockInfoService {
  /**
   * 获取指定股票的历史信息
   * @param stockName 股票代码，例如 "AAPL", "TSLA", "MSFT"
   * @param dayCount 获取的天数，例如 7 表示获取最近7天的数据
   * @param fullName 股票的完整名称，例如 "Apple Inc.", "Tesla Inc.", "Microsoft Corporation"，用于区分同名股票
   * @returns Promise<StockInfo[]> 返回股票信息数组
   */
  async getStockInfo(stockName: string, dayCount: number, fullName?: string): Promise<StockInfo[]> {
    try {
      console.log(`🔄 Getting stock info for ${stockName}, ${dayCount} days${fullName ? `, fullName: ${fullName}` : ''}`);
      
      // 验证参数
      if (!stockName || typeof stockName !== 'string') {
        throw new APIError(-1, 'Invalid stock name');
      }
      
      if (!dayCount || dayCount <= 0 || !Number.isInteger(dayCount)) {
        throw new APIError(-2, 'Invalid day count');
      }
      
      // 调用 RPC 接口 - 使用共享的 apiService
      // 构建参数数组，如果提供了 fullName，则添加为第三个参数
      const params = [
        stockName.toUpperCase(),
        dayCount.toString()
      ];
      
      // 如果提供了 fullName，添加到参数中（第三个参数）
      if (fullName && fullName.trim()) {
        params.push(fullName.trim());
        console.log(`📝 Using fullName parameter to distinguish stock: ${fullName.trim()}`);
      } else {
        console.log(`⚠️ No fullName provided - may return incorrect data for stocks with duplicate symbols`);
      }
      
      // 注意：这里仍然调用 getCoinInfo 因为后端 API 方法名没有改变
      const response = await apiService.call<StockInfo[]>('getCoinInfo', params);
      
      console.log(`✅ Got ${response.length} records for ${stockName}`);
      
      // 验证响应
      if (!Array.isArray(response)) {
        throw new APIError(-3, 'Invalid response format');
      }
      
      // 处理数据
      const validatedData = response.map((stockInfo, index) => {
        if (!stockInfo.name || !stockInfo.currentPrice || !stockInfo.date) {
          console.warn(`⚠️ Invalid stock info at index ${index}`);
          throw new APIError(-4, `Invalid stock info data at index ${index}`);
        }
        
        return {
          ...stockInfo,
          rank: Number(stockInfo.rank) || 0,
          cexInfos: Array.isArray(stockInfo.cexInfos) ? stockInfo.cexInfos : [],
          valid: Boolean(stockInfo.valid),
          stock_id: (stockInfo as any).coin_id || (stockInfo as any).stock_id || ''
        };
      });
      
      return validatedData;
      
    } catch (error) {
      console.error(`❌ Failed to get stock info for ${stockName}:`, error);
      
      if (error instanceof APIError) {
        throw error;
      }
      
      throw new APIError(
        -999,
        `Failed to get stock info: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * 获取股票的最新信息（最近1天）
   * @param stockName 股票代码
   * @param fullName 股票的完整名称，可选
   * @returns Promise<StockInfo | null> 返回最新的股票信息
   */
  async getLatestStockInfo(stockName: string, fullName?: string): Promise<StockInfo | null> {
    try {
      const stockInfos = await this.getStockInfo(stockName, 1, fullName);
      return stockInfos.length > 0 ? stockInfos[0] : null;
    } catch (error) {
      console.error(`❌ Failed to get latest stock info for ${stockName}:`, error);
      throw error;
    }
  }

  /**
   * 获取股票的价格历史（简化版本）
   * @param stockName 股票代码
   * @param dayCount 获取的天数
   * @param fullName 股票的完整名称，可选
   * @returns Promise<Array<{date: string, price: number}>> 返回价格历史数组
   */
  async getStockPriceHistory(stockName: string, dayCount: number, fullName?: string): Promise<Array<{date: string, price: number}>> {
    try {
      const stockInfos = await this.getStockInfo(stockName, dayCount, fullName);
      
      return stockInfos.map(info => ({
        date: info.date,
        price: parseFloat(info.currentPrice) || 0
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
    } catch (error) {
      console.error(`❌ Failed to get price history for ${stockName}:`, error);
      throw error;
    }
  }

  /**
   * 批量获取多个股票的信息
   * @param stockNames 股票代码数组
   * @param dayCount 获取的天数
   * @param fullNamesMap 股票代码到完整名称的映射，可选
   * @returns Promise<Map<string, StockInfo[]>> 返回以股票代码为键的信息映射
   */
  async getBatchStockInfo(
    stockNames: string[], 
    dayCount: number, 
    fullNamesMap?: Map<string, string>
  ): Promise<Map<string, StockInfo[]>> {
    try {
      console.log(`🔄 Getting batch stock info for ${stockNames.length} stocks`);
      
      const results = new Map<string, StockInfo[]>();
      
      // 并发请求
      const promises = stockNames.map(async (stockName) => {
        try {
          const fullName = fullNamesMap?.get(stockName.toUpperCase());
          const stockInfos = await this.getStockInfo(stockName, dayCount, fullName);
          return { stockName, stockInfos };
        } catch (error) {
          console.warn(`⚠️ Failed to get info for ${stockName}:`, error);
          return { stockName, stockInfos: [] };
        }
      });
      
      const responses = await Promise.all(promises);
      
      responses.forEach(({ stockName, stockInfos }) => {
        results.set(stockName.toUpperCase(), stockInfos);
      });
      
      console.log(`✅ Got batch stock info for ${results.size} stocks`);
      return results;
      
    } catch (error) {
      console.error(`❌ Failed to get batch stock info:`, error);
      throw error;
    }
  }

  /**
   * 获取股票24小时价格走势数据
   * @param name 股票代码（如 "AAPL", "TSLA"）
   * @param fullName 股票的完整名称（如 "Apple Inc.", "Tesla Inc."）
   * @param count 数据点数量，通常为 "1000"
   * @returns Promise<Array<{_id: string, rank: number, name: string, price: string, createdAt: string, updatedAt: string}>>
   */
  async getStock24hData(name: string, fullName?: string, count: string = "1000"): Promise<Array<{
    _id: string;
    rank: number;
    name: string;
    price: string;
    createdAt: string;
    updatedAt: string;
  }>> {
    try {
      console.log('🔄 StockInfoService: Fetching 24h data for stock...', { name, fullName, count });
      
      // 构建参数数组
      const params = [name.toUpperCase()];
      if (fullName) {
        params.push(fullName);
        console.log(`📋 Using fullName in getCoin24hByName: ${fullName}`);
      }
      params.push(count);
      
      // 注意：这里仍然调用 getCoin24hByName API 因为后端方法名没有改变
      const result = await apiService.call<{
        result: Array<{
          _id: string;
          rank: number;
          name: string;
          price: string;
          __v: number;
          createdAt: string;
          updatedAt: string;
        }>;
      }>(
        'getCoin24hByName',
        params
      );

      console.log('✅ StockInfoService: getCoin24hByName API result:', result);
      console.log('🔍 StockInfoService: API result type and structure:', {
        type: typeof result,
        isArray: Array.isArray(result),
        hasResult: result && 'result' in result,
        length: Array.isArray(result) ? result.length : 'N/A',
        firstItem: Array.isArray(result) && result.length > 0 ? result[0] : 'N/A'
      });

      // 处理响应格式 - 检查是否是直接的数组或包含result字段的对象
      let dataArray: any[] = [];
      if (Array.isArray(result)) {
        // API 直接返回数组
        dataArray = result;
      } else if (result && result.result && Array.isArray(result.result)) {
        // API 返回包含result字段的对象
        dataArray = result.result;
      }

      if (dataArray.length > 0) {
        const stockData = dataArray.map(item => ({
          _id: item._id,
          rank: item.rank,
          name: item.name,
          price: item.price,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }));
        
        console.log(`✅ StockInfoService: Successfully fetched ${stockData.length} 24h data points for ${name}`);
        return stockData;
      } else {
        console.warn('⚠️ StockInfoService: Invalid response format for getCoin24hByName - no valid data array found');
        console.warn('🔍 Debug - result structure:', JSON.stringify(result, null, 2));
        return [];
      }
    } catch (error) {
      console.error(`❌ StockInfoService: Failed to fetch 24h data for ${name}:`, error);
      // 返回空数组而不是抛出错误，避免影响主要功能
      return [];
    }
  }

  // 为了兼容性，保留旧的方法名
  async getCoinInfo(coinName: string, dayCount: number, fullName?: string): Promise<StockInfo[]> {
    return this.getStockInfo(coinName, dayCount, fullName);
  }

  async getLatestCoinInfo(coinName: string, fullName?: string): Promise<StockInfo | null> {
    return this.getLatestStockInfo(coinName, fullName);
  }

  async getCoinPriceHistory(coinName: string, dayCount: number, fullName?: string): Promise<Array<{date: string, price: number}>> {
    return this.getStockPriceHistory(coinName, dayCount, fullName);
  }

  async getBatchCoinInfo(
    coinNames: string[], 
    dayCount: number, 
    fullNamesMap?: Map<string, string>
  ): Promise<Map<string, StockInfo[]>> {
    return this.getBatchStockInfo(coinNames, dayCount, fullNamesMap);
  }

  async getCoin24hData(name: string, fullName?: string, count: string = "1000"): Promise<Array<{
    _id: string;
    rank: number;
    name: string;
    price: string;
    createdAt: string;
    updatedAt: string;
  }>> {
    return this.getStock24hData(name, fullName, count);
  }
}

// 创建并导出服务实例
const stockInfoService = new StockInfoService();

// 为了兼容性，同时导出为 coinInfoService
const coinInfoService = stockInfoService;

export default stockInfoService;
export { stockInfoService, coinInfoService, StockInfoService };
