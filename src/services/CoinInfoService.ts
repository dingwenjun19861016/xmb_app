/**
 * CoinInfoService - 币种信息服务
 * 支持通过 RPC 1.0 协议获取币种历史信息
 */

import apiService, { APIError } from './APIService';

// 交易所信息接口
export interface CexInfo {
  cexRank: string;
  cexPair: string;
  cexName: string;
  cexPrice: string;
  cexVolume: string;
  cexVolumePercent: string;
  cexUrl?: string; // 添加可选的交易所URL字段
}

// 币种信息接口
export interface CoinInfo {
  rank: number;
  name: string;
  fullName?: string; // 添加fullName字段，币种的完整名称
  currentPrice: string;
  priceChange24h: string;
  marketcap: string;
  volume: string;
  fdv: string;
  totalSupply: string;
  circulatingSupply: string;
  description: string;
  cexInfos: CexInfo[];
  valid: boolean;
  created_at: string;
  date: string;
  updated_at: string;
  coin_id: string;
}

/**
 * 币种信息服务类
 */
class CoinInfoService {
  /**
   * 获取指定币种的历史信息
   * @param coinName 币种名称，例如 "KSM", "BTC", "ETH"
   * @param dayCount 获取的天数，例如 7 表示获取最近7天的数据
   * @param fullName 币种的完整名称，例如 "Dogecoin", "Bitcoin", "Ethereum"，用于区分同名币种
   * @returns Promise<CoinInfo[]> 返回币种信息数组
   */
  async getCoinInfo(coinName: string, dayCount: number, fullName?: string): Promise<CoinInfo[]> {
    try {
      console.log(`🔄 Getting coin info for ${coinName}, ${dayCount} days${fullName ? `, fullName: ${fullName}` : ''}`);
      
      // 验证参数
      if (!coinName || typeof coinName !== 'string') {
        throw new APIError(-1, 'Invalid coin name');
      }
      
      if (!dayCount || dayCount <= 0 || !Number.isInteger(dayCount)) {
        throw new APIError(-2, 'Invalid day count');
      }
      
      // 调用 RPC 接口 - 使用共享的 apiService
      // 构建参数数组，如果提供了 fullName，则添加为第三个参数
      const params = [
        coinName.toUpperCase(),
        dayCount.toString()
      ];
      
      // 如果提供了 fullName，添加到参数中（第三个参数）
      if (fullName && fullName.trim()) {
        params.push(fullName.trim());
        console.log(`📝 Using fullName parameter to distinguish coin: ${fullName.trim()}`);
      } else {
        console.log(`⚠️ No fullName provided - may return incorrect data for coins with duplicate symbols`);
      }
      
      const response = await apiService.call<CoinInfo[]>('getCoinInfo', params);
      
      console.log(`✅ Got ${response.length} records for ${coinName}`);
      
      // 验证响应
      if (!Array.isArray(response)) {
        throw new APIError(-3, 'Invalid response format');
      }
      
      // 处理数据
      const validatedData = response.map((coinInfo, index) => {
        if (!coinInfo.name || !coinInfo.currentPrice || !coinInfo.date) {
          console.warn(`⚠️ Invalid coin info at index ${index}`);
          throw new APIError(-4, `Invalid coin info data at index ${index}`);
        }
        
        return {
          ...coinInfo,
          rank: Number(coinInfo.rank) || 0,
          cexInfos: Array.isArray(coinInfo.cexInfos) ? coinInfo.cexInfos : [],
          valid: Boolean(coinInfo.valid)
        };
      });
      
      return validatedData;
      
    } catch (error) {
      console.error(`❌ Failed to get coin info for ${coinName}:`, error);
      
      if (error instanceof APIError) {
        throw error;
      }
      
      throw new APIError(
        -999,
        `Failed to get coin info: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  /**
   * 获取币种的最新信息（最近1天）
   * @param coinName 币种名称
   * @param fullName 币种的完整名称，可选
   * @returns Promise<CoinInfo | null> 返回最新的币种信息
   */
  async getLatestCoinInfo(coinName: string, fullName?: string): Promise<CoinInfo | null> {
    try {
      const coinInfos = await this.getCoinInfo(coinName, 1, fullName);
      return coinInfos.length > 0 ? coinInfos[0] : null;
    } catch (error) {
      console.error(`❌ Failed to get latest coin info for ${coinName}:`, error);
      throw error;
    }
  }

  /**
   * 获取币种的价格历史（简化版本）
   * @param coinName 币种名称
   * @param dayCount 获取的天数
   * @param fullName 币种的完整名称，可选
   * @returns Promise<Array<{date: string, price: number}>> 返回价格历史数组
   */
  async getCoinPriceHistory(coinName: string, dayCount: number, fullName?: string): Promise<Array<{date: string, price: number}>> {
    try {
      const coinInfos = await this.getCoinInfo(coinName, dayCount, fullName);
      
      return coinInfos.map(info => ({
        date: info.date,
        price: parseFloat(info.currentPrice) || 0
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
    } catch (error) {
      console.error(`❌ Failed to get price history for ${coinName}:`, error);
      throw error;
    }
  }

  /**
   * 批量获取多个币种的信息
   * @param coinNames 币种名称数组
   * @param dayCount 获取的天数
   * @param fullNamesMap 币种名称到完整名称的映射，可选
   * @returns Promise<Map<string, CoinInfo[]>> 返回以币种名称为键的信息映射
   */
  async getBatchCoinInfo(
    coinNames: string[], 
    dayCount: number, 
    fullNamesMap?: Map<string, string>
  ): Promise<Map<string, CoinInfo[]>> {
    try {
      console.log(`🔄 Getting batch coin info for ${coinNames.length} coins`);
      
      const results = new Map<string, CoinInfo[]>();
      
      // 并发请求
      const promises = coinNames.map(async (coinName) => {
        try {
          const fullName = fullNamesMap?.get(coinName.toUpperCase());
          const coinInfos = await this.getCoinInfo(coinName, dayCount, fullName);
          return { coinName, coinInfos };
        } catch (error) {
          console.warn(`⚠️ Failed to get info for ${coinName}:`, error);
          return { coinName, coinInfos: [] };
        }
      });
      
      const responses = await Promise.all(promises);
      
      responses.forEach(({ coinName, coinInfos }) => {
        results.set(coinName.toUpperCase(), coinInfos);
      });
      
      console.log(`✅ Got batch coin info for ${results.size} coins`);
      return results;
      
    } catch (error) {
      console.error(`❌ Failed to get batch coin info:`, error);
      throw error;
    }
  }

  /**
   * 获取币种24小时价格走势数据
   * @param name 币种名称（如 "BTC", "ETH"）
   * @param fullName 币种的完整名称（如 "Bitcoin", "Ethereum"）
   * @param count 数据点数量，通常为 "1000"
   * @returns Promise<Array<{_id: string, rank: number, name: string, price: string, createdAt: string, updatedAt: string}>>
   */
  async getCoin24hData(name: string, fullName?: string, count: string = "1000"): Promise<Array<{
    _id: string;
    rank: number;
    name: string;
    price: string;
    createdAt: string;
    updatedAt: string;
  }>> {
    try {
      console.log('🔄 CoinInfoService: Fetching 24h data for coin...', { name, fullName, count });
      
      // 构建参数数组
      const params = [name.toUpperCase()];
      if (fullName) {
        params.push(fullName);
        console.log(`📋 Using fullName in getCoin24hByName: ${fullName}`);
      }
      params.push(count);
      
      // 调用getCoin24hByName API
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

      console.log('✅ CoinInfoService: getCoin24hByName API result:', result);
      console.log('🔍 CoinInfoService: API result type and structure:', {
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
        const coinData = dataArray.map(item => ({
          _id: item._id,
          rank: item.rank,
          name: item.name,
          price: item.price,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }));
        
        console.log(`✅ CoinInfoService: Successfully fetched ${coinData.length} 24h data points for ${name}`);
        return coinData;
      } else {
        console.warn('⚠️ CoinInfoService: Invalid response format for getCoin24hByName - no valid data array found');
        console.warn('🔍 Debug - result structure:', JSON.stringify(result, null, 2));
        return [];
      }
    } catch (error) {
      console.error(`❌ CoinInfoService: Failed to fetch 24h data for ${name}:`, error);
      // 返回空数组而不是抛出错误，避免影响主要功能
      return [];
    }
  }

}

// 创建并导出服务实例
const coinInfoService = new CoinInfoService();

export default coinInfoService;
export { CoinInfoService };
