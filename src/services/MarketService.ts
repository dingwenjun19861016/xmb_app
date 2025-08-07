import apiService, { APIError } from './APIService';
import configService from './ConfigService';
import stockService from './StockService';
import stockLogoService from './StockLogoService';

// 定义币种数据接口
export interface CoinData {
  _id?: string;        // 保留_id字段以兼容listCoins API
  coin_id?: string;    // 添加coin_id字段以兼容getCoinInfo API
  rank: number;
  name: string;
  fullName?: string;   // 添加完整名称字段，例如 "Dogecoin", "Bitcoin"
  currentPrice: string;
  priceChange24h: string;
  marketcap: string;
  volume: string;
  fdv: string;
  totalSupply: string;
  circulatingSupply: string;
  description: string;
  cexInfos: Array<{
    cexRank: string;
    cexPair: string;
    cexName: string;
    cexPrice: string;
    cexVolume: string;
    cexVolumePercent: string;
  }>;
  coin24h?: Array<{    // 24小时价格变化数据
    price: number;
    createdAt: string;
  }>;
  valid: boolean;
  created_at: string;
  date: string;
  updated_at: string;
}

// 定义API返回结果接口
export interface ListCoinsResult {
  coins: CoinData[];
  total: number;
  skip: number;
  limit: number;
}

// 定义排序选项
export type SortField = 'rank' | 'marketcap' | 'volume' | 'priceChange24h' | 'currentPrice';
export type SortOrder = 'asc' | 'desc';

// 市场数据服务类
class MarketService {
  /**
   * 获取币种列表
   * @param skip 跳过的数量，用于分页
   * @param limit 限制返回的数量
   * @param sortBy 排序字段
   * @param sortOrder 排序顺序
   * @returns Promise<ListCoinsResult>
   */
  async listCoins(
    skip: number = 0,
    limit: number = 10,
    sortBy: SortField = 'rank',
    sortOrder: SortOrder = 'asc'
  ): Promise<ListCoinsResult> {
    try {
      const result = await apiService.call<ListCoinsResult>(
        'listCoins',
        [skip.toString(), limit.toString(), sortBy, sortOrder]
      );

      // 验证返回数据格式
      if (!result || !Array.isArray(result.coins)) {
        throw new APIError(-1, 'Invalid response format: missing coins array');
      }

      return result;
    } catch (error) {
      console.error('Failed to fetch coins list:', error);
      throw error;
    }
  }

  /**
   * 获取顶级币种数据（用于首页展示）
   * @param limit 返回数量，默认4个
   * @returns Promise<CoinData[]>
   */
  async getTopCoins(limit: number = 4): Promise<CoinData[]> {
    try {
      const result = await this.listCoins(0, limit, 'rank', 'asc');
      return result.coins;
    } catch (error) {
      console.error('Failed to fetch top coins:', error);
      throw error;
    }
  }

  /**
   * 获取单个币种详细信息
   * @param coinName 币种名称（如 "BTC", "ETH"）
   * @returns Promise<CoinData>
   */
  async getCoinDetail(coinName: string): Promise<CoinData> {
    try {
      // 优先使用getCoinInfo API获取精确信息
      const searchResult = await this.searchCoins(coinName, 1);
      
      if (searchResult.length > 0) {
        return searchResult[0];
      }

      // 如果搜索API没有结果，回退到列表查找
      const result = await this.listCoins(0, 100);
      const coin = result.coins.find(c => c.name === coinName);
      
      if (!coin) {
        throw new APIError(-1, `Coin not found: ${coinName}`);
      }

      return coin;
    } catch (error) {
      console.error(`Failed to fetch coin detail for ${coinName}:`, error);
      throw error;
    }
  }

  /**
   * 搜索币种和美股（美股APP专用：优先搜索美股，兼容加密货币）
   * @param query 搜索关键词
   * @param limit 返回数量限制
   * @returns Promise<CoinData[]>
   */
  async searchCoins(query: string, limit: number = 20): Promise<CoinData[]> {
    try {
      console.log('🔄 MarketService: Searching stocks and coins (US stock app mode)...', { query, limit });
      
      // 美股APP模式：优先搜索美股数据
      const stockResults = await this.searchStocks(query, Math.min(limit, 20));
      console.log(`🔄 MarketService: Found ${stockResults.length} stock results`);
      
      // 如果股票搜索结果足够，直接返回
      if (stockResults.length >= limit) {
        return stockResults.slice(0, limit);
      }
      
      // 如果股票搜索结果不足，补充加密货币搜索结果
      const remainingLimit = limit - stockResults.length;
      let cryptoResults: CoinData[] = [];
      
      try {
        cryptoResults = await this.searchCryptoCurrency(query, remainingLimit);
        console.log(`🔄 MarketService: Found ${cryptoResults.length} crypto results`);
      } catch (error) {
        console.warn('⚠️ MarketService: Crypto search failed, using stock results only:', error);
      }
      
      // 合并结果：股票优先，然后是加密货币
      const allResults = [...stockResults, ...cryptoResults];
      console.log(`✅ MarketService: Total search results: ${allResults.length} (${stockResults.length} stocks + ${cryptoResults.length} crypto)`);
      
      return allResults.slice(0, limit);
    } catch (error) {
      console.error(`❌ MarketService: Search failed for query "${query}":`, error);
      // 完全失败时回退到本地搜索
      return this.searchCoinsLocal(query, limit);
    }
  }

  /**
   * 搜索美股数据
   * @param query 搜索关键词
   * @param limit 返回数量限制
   * @returns Promise<CoinData[]>
   */
  private async searchStocks(query: string, limit: number = 20): Promise<CoinData[]> {
    try {
      console.log('🔄 MarketService: Searching US stocks...', { query, limit });
      
      // 获取所有股票数据进行本地搜索
      const stocksData = await stockService.getUSStocksList(0, 200); // 获取更多数据用于搜索
      
      // 过滤股票：匹配代码或公司名称
      const filteredStocks = stocksData.filter(stock => {
        const queryLower = query.toLowerCase();
        const codeLower = stock.code.toLowerCase();
        const nameLower = stock.name.toLowerCase();
        
        return codeLower.includes(queryLower) || 
               nameLower.includes(queryLower) ||
               codeLower === queryLower;
      });
      
      // 转换为CoinData格式
      const stockResults: CoinData[] = filteredStocks.slice(0, limit).map(stock => ({
        _id: stock._id,
        coin_id: stock._id,
        rank: stock.rank,
        name: stock.code,
        fullName: stock.name,
        symbol: stock.code,
        currentPrice: stock.currentPrice,
        priceChange24h: stock.priceChangePercent,
        priceChangePercent: stock.priceChangePercent,
        marketcap: stock.baseinfo?.marketCap || stock.marketCap || '',
        volume: stock.baseinfo?.volume || stock.volume || '',
        fdv: stock.baseinfo?.marketCap || stock.marketCap || '',
        totalSupply: stock.baseinfo?.sharesOutstanding || '',
        circulatingSupply: stock.baseinfo?.sharesOutstanding || '',
        description: `${stock.name} (${stock.code}) - ${stock.sector}`,
        logo: stockLogoService.getLogoUrlSync(stock.code),
        cexInfos: [],
        valid: true,
        created_at: stock.created_at,
        date: stock.date,
        updated_at: stock.updated_at,
        coin24h: stock.usstock24h?.map(item => ({
          price: parseFloat(item.price),
          createdAt: item.createdAt
        })) || []
      }));
      
      console.log(`✅ MarketService: Found ${stockResults.length} matching stocks`);
      return stockResults;
      
    } catch (error) {
      console.error('❌ MarketService: Stock search failed:', error);
      return [];
    }
  }

  /**
   * 搜索加密货币（原始逻辑保留作为备用）
   * @param query 搜索关键词
   * @param limit 返回数量限制
   * @returns Promise<CoinData[]>
   */
  private async searchCryptoCurrency(query: string, limit: number = 20): Promise<CoinData[]> {
    try {
      console.log('🔄 MarketService: Searching crypto with getCoinInfo API...', { query, limit });
      
      // 调用getCoinInfo API - 精确搜索单个币种
      const result = await apiService.call<CoinData[] | { result: CoinData[] }>(
        'getCoinInfo',
        [
          query.toUpperCase(),  // 币种符号，转为大写
          '1'                   // 固定参数
        ]
      );

      console.log('✅ MarketService: getCoinInfo API result:', result);

      // 处理两种可能的响应格式：直接数组或包含result属性的对象
      let coinData: CoinData[] = [];
      
      if (Array.isArray(result)) {
        // 直接返回数组格式
        coinData = result;
        console.log('🔄 MarketService: Using direct array format');
      } else if (result && result.result && Array.isArray(result.result)) {
        // 包含result属性的对象格式
        coinData = result.result;
        console.log('🔄 MarketService: Using result property format');
      } else {
        console.warn('⚠️ Invalid getCoinInfo response format, fallback to local crypto search');
        return this.searchCoinsLocal(query, limit);
      }

      console.log('🔄 MarketService: getCoinInfo returning:', coinData.length, 'coins');
      return coinData.slice(0, limit);
    } catch (error) {
      console.error(`❌ Failed to search crypto with getCoinInfo API for query "${query}":`, error);
      // API失败时回退到本地搜索
      return this.searchCoinsLocal(query, limit);
    }
  }

  /**
   * 本地搜索币种（备用方法）
   * @param query 搜索关键词
   * @param limit 返回数量限制
   * @returns Promise<CoinData[]>
   */
  private async searchCoinsLocal(query: string, limit: number = 20): Promise<CoinData[]> {
    try {
      console.log('🔄 MarketService: Using local search fallback...');
      // 获取更多数据用于搜索
      const result = await this.listCoins(0, 100);
      
      const filteredCoins = result.coins.filter(coin =>
        coin.name.toLowerCase().includes(query.toLowerCase()) ||
        coin.name.toLowerCase() === query.toLowerCase()
      );

      return filteredCoins.slice(0, limit);
    } catch (error) {
      console.error(`❌ Failed local search for query "${query}":`, error);
      throw error;
    }
  }

  /**
   * 获取市场统计数据
   * @returns Promise<{totalMarketCap: string, totalVolume: string, btcDominance: string}>
   */
  async getMarketStats(): Promise<{
    totalMarketCap: string;
    totalVolume: string;
    btcDominance: string;
  }> {
    try {
      const topCoins = await this.listCoins(0, 10);
      
      // 简单计算（实际应该有专门的API）
      let totalMarketCap = 0;
      let totalVolume = 0;
      
      topCoins.coins.forEach(coin => {
        // 解析数字（去除B, M等单位）
        const mcap = this.parseMarketValue(coin.marketcap);
        const vol = this.parseMarketValue(coin.volume);
        totalMarketCap += mcap;
        totalVolume += vol;
      });

      const btcMarketCap = this.parseMarketValue(topCoins.coins[0]?.marketcap || '0');
      const btcDominance = totalMarketCap > 0 ? (btcMarketCap / totalMarketCap * 100).toFixed(2) : '0';

      return {
        totalMarketCap: this.formatMarketValue(totalMarketCap),
        totalVolume: this.formatMarketValue(totalVolume),
        btcDominance: `${btcDominance}%`,
      };
    } catch (error) {
      console.error('Failed to fetch market stats:', error);
      throw error;
    }
  }

  /**
   * 解析市场价值字符串为数字（单位：十亿）
   * @param value 如 "2130.00B", "295.14B"
   * @returns number
   */
  private parseMarketValue(value: string): number {
    const numStr = value.replace(/[^0-9.]/g, '');
    const num = parseFloat(numStr) || 0;
    
    if (value.includes('T')) return num * 1000; // 万亿转换为十亿
    if (value.includes('B')) return num; // 十亿
    if (value.includes('M')) return num / 1000; // 百万转换为十亿
    
    return num / 1000000000; // 假设是美元，转换为十亿
  }

  /**
   * 格式化市场价值
   * @param value 数值（单位：十亿）
   * @returns string
   */
  private formatMarketValue(value: number): string {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}T`;
    }
    return `${value.toFixed(2)}B`;
  }


  /**
   * 获取多个币种的详细信息
   * @param coinNames 币种名称列表（如 "BTC,ETH,XRP"）
   * @param dataCount 返回的数据集数量，"1"表示只返回最新一套数据，"2"表示返回更多数据
   * @returns Promise<CoinData[]>
   */
  async getMultipleCoinsInfo(coinNames: string, dataCount: string = "1"): Promise<CoinData[]> {
    try {
      console.log('🔄 MarketService: Fetching multiple coins/stocks info...', { coinNames, dataCount });
      
      // 使用原始代码，不添加前缀
      const formattedCodes = coinNames;
      
      console.log('📝 MarketService: Formatted codes for API call:', formattedCodes);
      console.log('📝 MarketService: API call params:', ['getMultipleCoinsInfo', [formattedCodes, dataCount]]);
      
      console.log('🌐 MarketService: Making API call to getMultipleCoinsInfo...');
      
      // 调用getMultipleCoinsInfo API
      const result = await apiService.call<CoinData[] | { result: CoinData[] } | { coins: CoinData[], total: number, skip: number, limit: number }>(
        'getMultipleCoinsInfo',
        [formattedCodes, dataCount]
      );

      console.log('🎉 MarketService: API call completed successfully!');
      console.log('📊 MarketService: API response received:', typeof result, Array.isArray(result));
      console.log('📊 MarketService: Raw API response:', JSON.stringify(result, null, 2));

      // 处理三种可能的响应格式：
      // 1. 直接数组格式 CoinData[]
      // 2. 包含result属性的对象 { result: CoinData[] }
      // 3. 包含coins属性的对象（标准ListCoinsResult格式）{ coins: CoinData[], total: number, skip: number, limit: number }
      let coinData: CoinData[] = [];
      
      if (Array.isArray(result)) {
        // 直接返回数组格式
        coinData = result;
        console.log('📊 MarketService: Using direct array format, found', coinData.length, 'items');
      } else if (result && 'result' in result && Array.isArray(result.result)) {
        // 包含result属性的对象格式
        coinData = result.result;
        console.log('📊 MarketService: Using result property format, found', coinData.length, 'items');
      } else if (result && 'coins' in result && Array.isArray(result.coins)) {
        // 包含coins属性的对象格式（与ListCoinsResult相同）
        coinData = result.coins;
        console.log('📊 MarketService: Using standard coins array format, found', coinData.length, 'items');
      } else {
        console.warn('⚠️ MarketService: Invalid getMultipleCoinsInfo response format:', result);
        console.warn('⚠️ MarketService: Response structure analysis:', {
          hasResult: result && 'result' in result,
          hasCoins: result && 'coins' in result,
          isArray: Array.isArray(result),
          resultType: typeof result,
          keys: result ? Object.keys(result) : 'null'
        });
        return [];
      }

      console.log(`✅ MarketService: Successfully fetched ${coinData.length} items info`);
      if (coinData.length > 0) {
        console.log('📊 MarketService: Sample data (first item):', coinData[0]);
      }
      return coinData;
    } catch (error) {
      console.error('❌ MarketService: Failed to fetch multiple coins/stocks info:', error);
      console.error('❌ MarketService: Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        coinNames,
        dataCount
      });
      // 重新抛出错误，让调用方处理
      throw error;
    }
  }

  /**
   * 获取美股数据（从配置服务获取展示的股票列表）
   * @returns Promise<CoinData[]>
   */
  async getUSStockHomeDisplay(): Promise<CoinData[]> {
    try {
      console.log('🔄 MarketService: Delegating to StockService for home display stocks...');
      
      // 从配置获取需要显示的股票数量
      const displayCount = await configService.getConfig('HOME_MARKET_OVERVIEW_COUNT', 2);
      
      // 使用StockService获取股票数据
      const stocksData = await stockService.getHomeDisplayStocks(displayCount);
      
      if (!stocksData || stocksData.length === 0) {
        console.warn('⚠️ MarketService: No stock data received from StockService');
        return [];
      }
      
      // 将StockService的TransformedStockData转换为MarketService需要的CoinData格式
      const coinDataResult: CoinData[] = stocksData.map(stock => ({
        _id: stock._id,
        coin_id: stock._id,
        rank: stock.rank,
        name: stock.code, // 使用股票代码
        fullName: stock.fullName, // 使用公司全名
        symbol: stock.code,
        currentPrice: stock.currentPrice,
        priceChange24h: stock.priceChange24h,
        priceChangePercent: stock.priceChangePercent,
        marketCap: stock.marketcap,
        volume: stock.volume,
        fdv: stock.fdv,
        totalSupply: stock.totalSupply,
        circulatingSupply: stock.circulatingSupply,
        description: stock.description,
        logo: stockLogoService.getLogoUrlSync(stock.code), // 使用StockLogoService生成正确的logo URL
        cexInfos: stock.cexInfos || [],
        valid: stock.valid,
        created_at: stock.created_at,
        date: stock.date,
        updated_at: stock.updated_at,
        coin24h: stock.usstock24h?.map(item => ({
          price: item.price,
          createdAt: item.createdAt
        })) || []
      }));
      
      console.log(`✅ MarketService: Successfully converted ${coinDataResult.length} stock items to CoinData format`);
      console.log('📊 MarketService: Sample converted stock data:', coinDataResult[0]);
      
      return coinDataResult;
    } catch (error) {
      console.error('❌ MarketService: Failed to fetch US stocks via StockService:', error);
      return []; // 返回空数组而不是抛出错误，以避免UI崩溃
    }
  }

  /**
   * 获取美股列表数据（使用StockService获取完整的股票列表）
   * @returns Promise<CoinData[]>
   */
  async getUSStockList(): Promise<CoinData[]> {
    try {
      console.log('🔄 MarketService: Delegating to StockService for full stock list...');
      
      // 使用StockService获取股票列表，获取更多数据用于市场页面
      const stocksData = await stockService.getUSStocksList(0, 100); // 获取前100只股票
      
      if (!stocksData || stocksData.length === 0) {
        console.warn('⚠️ MarketService: No stock list data received from StockService');
        return [];
      }
      
      // 将StockService的StockData转换为MarketService需要的CoinData格式
      const coinDataResult: CoinData[] = stocksData.map(stock => ({
        _id: stock._id,
        coin_id: stock._id,
        rank: stock.rank,
        name: stock.code, // 使用股票代码
        fullName: stock.name, // 使用公司全名
        symbol: stock.code,
        currentPrice: stock.currentPrice,
        priceChange24h: stock.priceChangePercent,
        priceChangePercent: stock.priceChangePercent,
        marketCap: stock.baseinfo?.marketCap || stock.marketCap || '',
        volume: stock.baseinfo?.volume || stock.volume || '',
        fdv: stock.baseinfo?.marketCap || stock.marketCap || '',
        totalSupply: stock.baseinfo?.sharesOutstanding || '',
        circulatingSupply: stock.baseinfo?.sharesOutstanding || '',
        description: `${stock.name} (${stock.code}) - ${stock.sector}`,
        logo: stockLogoService.getLogoUrlSync(stock.code), // 使用StockLogoService生成正确的logo URL
        cexInfos: [],
        valid: true,
        created_at: stock.created_at,
        date: stock.date,
        updated_at: stock.updated_at,
        coin24h: stock.usstock24h?.map(item => ({
          price: item.price,
          createdAt: item.createdAt
        })) || []
      }));
      
      console.log(`✅ MarketService: Successfully converted ${coinDataResult.length} stock list items to CoinData format`);
      return coinDataResult;
    } catch (error) {
      console.error('❌ MarketService: Failed to fetch US stocks list via StockService:', error);
      return []; // 返回空数组而不是抛出错误，以避免UI崩溃
    }
  }

  /**
   * 获取自选币种的数据
   * @param favoriteSymbols 自选币种符号数组，例如 ['BTC', 'ETH', 'XRP']
   * @returns Promise<CoinData[]>
   */
  async getFavoriteCoinsData(favoriteSymbols: string[]): Promise<CoinData[]> {
    try {
      if (!favoriteSymbols || favoriteSymbols.length === 0) {
        console.log('📊 MarketService: No favorite symbols provided');
        return [];
      }
      
      // 将币种符号数组转换为逗号分隔的字符串
      const symbolsString = favoriteSymbols.join(',');
      
      console.log('🔄 MarketService: Fetching favorite coins data for:', symbolsString);
      console.log('🔄 MarketService: Total favorite symbols count:', favoriteSymbols.length);
      
      // 使用getMultipleCoinsInfo获取自选币种数据，使用参数"1"表示获取最新数据
      let favoriteCoinsData = await this.getMultipleCoinsInfo(symbolsString, "1");
      
      console.log(`✅ MarketService: Successfully fetched ${favoriteCoinsData.length} favorite coins`);
      console.log('📊 MarketService: Expected:', favoriteSymbols.length, 'Got:', favoriteCoinsData.length);
      
      // 如果返回的数据数量不匹配，尝试分批请求
      if (favoriteCoinsData.length !== favoriteSymbols.length && favoriteSymbols.length > 10) {
        console.warn('⚠️ MarketService: Trying batch requests due to count mismatch');
        favoriteCoinsData = await this.getFavoriteCoinsDataInBatches(favoriteSymbols);
      }
      
      // 如果返回的数据数量不匹配，记录详细信息
      if (favoriteCoinsData.length !== favoriteSymbols.length) {
        console.warn('⚠️ MarketService: Favorite coins data count mismatch!');
        console.log('📝 MarketService: Requested symbols:', favoriteSymbols);
        console.log('📝 MarketService: Returned coins:', favoriteCoinsData.map(coin => coin.name));
      }
      
      return favoriteCoinsData;
    } catch (error) {
      console.error('❌ MarketService: Failed to fetch favorite coins data:', error);
      return []; // 返回空数组而不是抛出错误，以避免UI崩溃
    }
  }

  /**
   * 分批获取自选币种数据（备用方案）
   * @param favoriteSymbols 自选币种符号数组
   * @returns Promise<CoinData[]>
   */
  private async getFavoriteCoinsDataInBatches(favoriteSymbols: string[]): Promise<CoinData[]> {
    try {
      console.log('🔄 MarketService: Using batch requests for favorite coins');
      
      const batchSize = 10; // 每批10个币种
      const allResults: CoinData[] = [];
      
      for (let i = 0; i < favoriteSymbols.length; i += batchSize) {
        const batch = favoriteSymbols.slice(i, i + batchSize);
        const batchString = batch.join(',');
        
        console.log(`🔄 MarketService: Fetching batch ${Math.floor(i/batchSize) + 1}:`, batchString);
        
        try {
          const batchResults = await this.getMultipleCoinsInfo(batchString, "1");
          allResults.push(...batchResults);
          console.log(`✅ MarketService: Batch ${Math.floor(i/batchSize) + 1} returned ${batchResults.length} coins`);
        } catch (batchError) {
          console.error(`❌ MarketService: Batch ${Math.floor(i/batchSize) + 1} failed:`, batchError);
          // 继续处理其他批次
        }
        
        // 避免请求过于频繁，添加小延迟
        if (i + batchSize < favoriteSymbols.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`✅ MarketService: Batch requests completed, total: ${allResults.length} coins`);
      return allResults;
    } catch (error) {
      console.error('❌ MarketService: Batch requests failed:', error);
      return [];
    }
  }

  /**
   * 获取公链类型的加密货币列表（MARKET_LIST_1）
   * @returns Promise<CoinData[]>
   */
  async getPublicChainList(): Promise<CoinData[]> {
    try {
      // 从配置获取公链类型的加密货币代码
      const coinCodes = await configService.getConfig('MARKET_LIST_1', '');
      
      if (!coinCodes) {
        console.warn('⚠️ MarketService: MARKET_LIST_1 config not found or empty');
        return [];
      }
      
      console.log('🔄 MarketService: Fetching public chain coins with codes:', coinCodes);
      
      // 使用getMultipleCoinsInfo获取公链币种数据，使用参数"1"
      return await this.getMultipleCoinsInfo(coinCodes, "1");
    } catch (error) {
      console.error('❌ MarketService: Failed to fetch public chain coins list:', error);
      return []; // 返回空数组而不是抛出错误，以避免UI崩溃
    }
  }

  /**
   * 获取L2类型的加密货币列表（MARKET_LIST_2）
   * @returns Promise<CoinData[]>
   */
  async getL2CoinsList(): Promise<CoinData[]> {
    try {
      // 从配置获取L2类型的加密货币代码
      const coinCodes = await configService.getConfig('MARKET_LIST_2', '');
      
      if (!coinCodes) {
        console.warn('⚠️ MarketService: MARKET_LIST_2 config not found or empty');
        return [];
      }
      
      console.log('🔄 MarketService: Fetching L2 coins with codes:', coinCodes);
      
      // 使用getMultipleCoinsInfo获取L2币种数据，使用参数"1"
      return await this.getMultipleCoinsInfo(coinCodes, "1");
    } catch (error) {
      console.error('❌ MarketService: Failed to fetch L2 coins list:', error);
      return []; // 返回空数组而不是抛出错误，以避免UI崩溃
    }
  }

  /**
   * 获取MEME类型的加密货币列表（MARKET_LIST_3）
   * @returns Promise<CoinData[]>
   */
  async getMemeCoinsList(): Promise<CoinData[]> {
    try {
      // 从配置获取MEME类型的加密货币代码
      const coinCodes = await configService.getConfig('MARKET_LIST_3', '');
      
      if (!coinCodes) {
        console.warn('⚠️ MarketService: MARKET_LIST_3 config not found or empty');
        return [];
      }
      
      console.log('🔄 MarketService: Fetching MEME coins with codes:', coinCodes);
      
      // 使用getMultipleCoinsInfo获取MEME币种数据，使用参数"1"
      return await this.getMultipleCoinsInfo(coinCodes, "1");
    } catch (error) {
      console.error('❌ MarketService: Failed to fetch MEME coins list:', error);
      return []; // 返回空数组而不是抛出错误，以避免UI崩溃
    }
  }

  /**
   * 获取DEFI类型的加密货币列表（MARKET_LIST_4）
   * @returns Promise<CoinData[]>
   */
  async getDefiCoinsList(): Promise<CoinData[]> {
    try {
      console.log('🔄 MarketService: Starting getDefiCoinsList...');
      // 从配置获取DEFI类型的加密货币代码
      const coinCodes = await configService.getConfig('MARKET_LIST_4', '');
      console.log('📊 MarketService: MARKET_LIST_4 config value:', coinCodes);
      
      if (!coinCodes) {
        console.warn('⚠️ MarketService: MARKET_LIST_4 config not found or empty');
        return [];
      }
      
      console.log('🔄 MarketService: Fetching DEFI coins with codes:', coinCodes);
      
      // 使用getMultipleCoinsInfo获取DEFI币种数据，使用参数"1"
      const result = await this.getMultipleCoinsInfo(coinCodes, "1");
      console.log('📊 MarketService: getDefiCoinsList final result:', result.length, 'items');
      return result;
    } catch (error) {
      console.error('❌ MarketService: Failed to fetch DEFI coins list:', error);
      return []; // 返回空数组而不是抛出错误，以避免UI崩溃
    }
  }

  /**
   * 获取平台币类型的加密货币列表（MARKET_LIST_5）
   * @returns Promise<CoinData[]>
   */
  async getPlatformCoinsList(): Promise<CoinData[]> {
    try {
      console.log('🔄 MarketService: Fetching platform coins...');
      
      // 确保配置已加载
      console.log('📊 MarketService: Ensuring config is loaded...');
      await configService.init();
      
      // 从配置获取平台币类型的加密货币代码
      console.log('🔄 MarketService: Requesting MARKET_LIST_5 config...');
      const coinCodes = await configService.getConfig('MARKET_LIST_5', '');
      
      console.log('📊 MarketService: MARKET_LIST_5 config result:', { 
        coinCodes, 
        length: coinCodes?.length, 
        type: typeof coinCodes,
        isEmpty: coinCodes === '',
        isUndefined: coinCodes === undefined,
        isNull: coinCodes === null
      });
      
      if (!coinCodes) {
        console.warn('⚠️ MarketService: MARKET_LIST_5 config not found or empty');
        return [];
      }
      
      if (coinCodes.trim() === '') {
        console.warn('⚠️ MarketService: MARKET_LIST_5 config is empty string');
        return [];
      }
      
      console.log('🔄 MarketService: Fetching platform coins with codes:', coinCodes);
      
      // 使用getMultipleCoinsInfo获取平台币数据，使用参数"1"
      const result = await this.getMultipleCoinsInfo(coinCodes, "1");
      console.log('✅ MarketService: Platform coins fetched successfully, count:', result.length);
      console.log('📊 MarketService: Platform coins data sample:', result.slice(0, 3));
      return result;
    } catch (error) {
      console.error('❌ MarketService: Failed to fetch platform coins list:', error);
      console.error('❌ MarketService: Error stack:', error.stack);
      return []; // 返回空数组而不是抛出错误，以避免UI崩溃
    }
  }

  /**
   * 获取LRT类型的加密货币列表（MARKET_LIST_6）
   * @returns Promise<CoinData[]>
   */
  async getLRTCoinsList(): Promise<CoinData[]> {
    try {
      console.log('🔄 MarketService: Fetching LRT/Staking coins...');
      
      // 首先确认配置服务状态
      console.log('📊 MarketService: Checking ConfigService state...');
      await configService.init(); // 确保配置已加载
      
      // 从配置获取LRT类型的加密货币代码
      console.log('📊 MarketService: Getting MARKET_LIST_6 config...');
      const coinCodes = await configService.getConfig('MARKET_LIST_6', '');
      
      console.log('📊 MarketService: MARKET_LIST_6 config result:', { 
        coinCodes, 
        length: coinCodes?.length, 
        type: typeof coinCodes,
        isEmpty: coinCodes === '',
        isUndefined: coinCodes === undefined,
        isNull: coinCodes === null
      });
      
      if (!coinCodes) {
        console.warn('⚠️ MarketService: MARKET_LIST_6 config not found or empty');
        return [];
      }
      
      if (coinCodes.trim() === '') {
        console.warn('⚠️ MarketService: MARKET_LIST_6 config is empty string');
        return [];
      }

      // 临时测试：先尝试调用listCoins确认API基本功能
      console.log('🧪 MarketService: Testing basic API functionality with listCoins...');
      try {
        const testResult = await this.listCoins(0, 5);
        console.log('✅ MarketService: Basic API test successful, got', testResult.coins.length, 'coins');
      } catch (testError) {
        console.error('❌ MarketService: Basic API test failed:', testError);
        return [];
      }
      
      console.log('📊 MarketService: Valid coin codes found, calling getMultipleCoinsInfo...');
      console.log('📊 MarketService: Calling getMultipleCoinsInfo with coinCodes:', coinCodes);
      
      // 临时测试：尝试单个币种API调用
      console.log('🧪 MarketService: Testing individual coin API calls...');
      const coins = coinCodes.split(',').map(c => c.trim());
      console.log('📊 MarketService: Individual coins to test:', coins);
      
      if (coins.length > 0) {
        try {
          console.log('🧪 MarketService: Testing getCoinInfo with first coin:', coins[0]);
          const singleCoinResult = await apiService.call('getCoinInfo', [coins[0], '1']);
          console.log('✅ MarketService: Single coin test successful:', singleCoinResult);
        } catch (singleError) {
          console.error('❌ MarketService: Single coin test failed:', singleError);
        }
      }
      
      // 使用getMultipleCoinsInfo获取LRT币种数据，使用参数"1"
      console.log('🌐 MarketService: About to make API call to getMultipleCoinsInfo...');
      const result = await this.getMultipleCoinsInfo(coinCodes, "1");
      console.log(`✅ MarketService: Fetched ${result.length} LRT/Staking coins`);
      console.log('📊 MarketService: LRT coins data sample:', result.slice(0, 3));
      
      return result;
    } catch (error) {
      console.error('❌ MarketService: Failed to fetch LRT coins list:', error);
      console.error('❌ MarketService: Error stack:', error.stack);
      return []; // 返回空数组而不是抛出错误，以避免UI崩溃
    }
  }

  /**
   * 获取存储类型的加密货币列表（MARKET_LIST_7）
   * @returns Promise<CoinData[]>
   */
  async getStorageCoinsList(): Promise<CoinData[]> {
    try {
      // 从配置获取存储类型的加密货币代码
      const coinCodes = await configService.getConfig('MARKET_LIST_7', '');
      
      if (!coinCodes) {
        console.warn('⚠️ MarketService: MARKET_LIST_7 config not found or empty');
        return [];
      }
      
      console.log('🔄 MarketService: Fetching storage coins with codes:', coinCodes);
      
      // 使用getMultipleCoinsInfo获取存储币种数据，使用参数"1"
      return await this.getMultipleCoinsInfo(coinCodes, "1");
    } catch (error) {
      console.error('❌ MarketService: Failed to fetch storage coins list:', error);
      return []; // 返回空数组而不是抛出错误，以避免UI崩溃
    }
  }

  /**
   * 获取Cosmos类型的加密货币列表（MARKET_LIST_8）
   * @returns Promise<CoinData[]>
   */
  async getCosmosCoinsList(): Promise<CoinData[]> {
    try {
      // 从配置获取Cosmos类型的加密货币代码
      const coinCodes = await configService.getConfig('MARKET_LIST_8', '');
      
      if (!coinCodes) {
        console.warn('⚠️ MarketService: MARKET_LIST_8 config not found or empty');
        return [];
      }
      
      console.log('🔄 MarketService: Fetching Cosmos coins with codes:', coinCodes);
      
      // 使用getMultipleCoinsInfo获取Cosmos币种数据，使用参数"1"
      return await this.getMultipleCoinsInfo(coinCodes, "1");
    } catch (error) {
      console.error('❌ MarketService: Failed to fetch Cosmos coins list:', error);
      return []; // 返回空数组而不是抛出错误，以避免UI崩溃
    }
  }

  /**
   * 获取NFT类型的加密货币列表（MARKET_LIST_9）
   * @returns Promise<CoinData[]>
   */
  async getNFTCoinsList(): Promise<CoinData[]> {
    try {
      // 从配置获取NFT类型的加密货币代码
      const coinCodes = await configService.getConfig('MARKET_LIST_9', '');
      
      if (!coinCodes) {
        console.warn('⚠️ MarketService: MARKET_LIST_9 config not found or empty');
        return [];
      }
      
      console.log('🔄 MarketService: Fetching NFT coins with codes:', coinCodes);
      
      // 使用getMultipleCoinsInfo获取NFT币种数据，使用参数"1"
      return await this.getMultipleCoinsInfo(coinCodes, "1");
    } catch (error) {
      console.error('❌ MarketService: Failed to fetch NFT coins list:', error);
      return []; // 返回空数组而不是抛出错误，以避免UI崩溃
    }
  }

  /**
   * 获取链游类型的加密货币列表（MARKET_LIST_10）
   * @returns Promise<CoinData[]>
   */
  async getGameCoinsList(): Promise<CoinData[]> {
    try {
      // 从配置获取链游类型的加密货币代码
      const coinCodes = await configService.getConfig('MARKET_LIST_10', '');
      
      if (!coinCodes) {
        console.warn('⚠️ MarketService: MARKET_LIST_10 config not found or empty');
        return [];
      }
      
      console.log('🔄 MarketService: Fetching game coins with codes:', coinCodes);
      
      // 使用getMultipleCoinsInfo获取链游币种数据，使用参数"1"
      return await this.getMultipleCoinsInfo(coinCodes, "1");
    } catch (error) {
      console.error('❌ MarketService: Failed to fetch game coins list:', error);
      return []; // 返回空数组而不是抛出错误，以避免UI崩溃
    }
  }

  /**
   * 根据标签类型获取对应的币种列表
   * @param labelType 标签类型："市值" | "美股" | "涨跌幅" | "24h成交量" | "价格" | "公链" | "L2" | "MEME" | "DEFI" | "平台币" | "质押" | "存储" | "Cosmos" | "NFT" | "链游"
   * @returns Promise<CoinData[]>
   */
  async getCoinsByLabel(labelType: string): Promise<CoinData[]> {
    try {
      console.log('🔄 MarketService: Getting coins by label:', labelType);
      
      switch (labelType) {
        case '美股':
          return await this.getUSStockList();
        case '公链':
          return await this.getPublicChainList();
        case 'L2':
          return await this.getL2CoinsList();
        case 'MEME':
          return await this.getMemeCoinsList();
        case 'DEFI':
          return await this.getDefiCoinsList();
        case '平台币':
          return await this.getPlatformCoinsList();
        case '质押':
          return await this.getLRTCoinsList();
        case '存储':
          return await this.getStorageCoinsList();
        case 'Cosmos':
          return await this.getCosmosCoinsList();
        case 'NFT':
          return await this.getNFTCoinsList();
        case '链游':
          return await this.getGameCoinsList();
        case 'AI':
          return await this.getAICoinsList();
        case 'RWA':
          return await this.getRWACoinsList();
        case '市值':
        case '涨跌幅':
        case '24h成交量':
        case '价格':
          // 这些标签使用默认的排序方式获取币种列表
          const sortField = this.getLabelSortField(labelType);
          const sortOrder = this.getLabelSortOrder(labelType);
          const result = await this.listCoins(0, 50, sortField, sortOrder);
          return result.coins;
        default:
          console.warn('⚠️ MarketService: Unknown label type:', labelType);
          return [];
      }
    } catch (error) {
      console.error('❌ MarketService: Failed to get coins by label:', error);
      return [];
    }
  }

  /**
   * 根据标签获取对应的排序字段
   * @param labelType 标签类型
   * @returns SortField
   */
  private getLabelSortField(labelType: string): SortField {
    switch (labelType) {
      case '市值':
        return 'marketcap';
      case '涨跌幅':
        return 'priceChange24h';
      case '24h成交量':
        return 'volume';
      case '价格':
        return 'currentPrice'; // 默认按排名排序
      default:
        return 'rank';
    }
  }

  /**
   * 根据标签获取对应的排序顺序
   * @param labelType 标签类型
   * @returns SortOrder
   */
  private getLabelSortOrder(labelType: string): SortOrder {
    switch (labelType) {
      case '市值':
        return 'desc'; // 市值从大到小
      case '涨跌幅':
        return 'desc'; // 涨跌幅从大到小
      case '24h成交量':
        return 'desc'; // 成交量从大到小
      case '价格':
        return 'asc'; // 价格按排名从小到大
      default:
        return 'asc';
    }
  }

  /**
   * 获取AI类型的加密货币列表（MARKET_LIST_11）
   * @returns Promise<CoinData[]>
   */
  async getAICoinsList(): Promise<CoinData[]> {
    try {
      // 从配置获取AI类型的加密货币代码
      const coinCodes = await configService.getConfig('MARKET_LIST_11', '');
      
      if (!coinCodes) {
        console.warn('⚠️ MarketService: MARKET_LIST_11 config not found or empty');
        return [];
      }
      
      console.log('🔄 MarketService: Fetching AI coins with codes:', coinCodes);
      
      // 使用getMultipleCoinsInfo获取AI币种数据，使用参数"1"
      return await this.getMultipleCoinsInfo(coinCodes, "1");
    } catch (error) {
      console.error('❌ MarketService: Failed to fetch AI coins list:', error);
      return []; // 返回空数组而不是抛出错误，以避免UI崩溃
    }
  }

  /**
   * 获取RWA类型的加密货币列表（MARKET_LIST_12）
   * @returns Promise<CoinData[]>
   */
  async getRWACoinsList(): Promise<CoinData[]> {
    try {
      // 从配置获取RWA类型的加密货币代码
      const coinCodes = await configService.getConfig('MARKET_LIST_12', '');
      
      if (!coinCodes) {
        console.warn('⚠️ MarketService: MARKET_LIST_12 config not found or empty');
        return [];
      }
      
      console.log('🔄 MarketService: Fetching RWA coins with codes:', coinCodes);
      
      // 使用getMultipleCoinsInfo获取RWA币种数据，使用参数"1"
      return await this.getMultipleCoinsInfo(coinCodes, "1");
    } catch (error) {
      console.error('❌ MarketService: Failed to fetch RWA coins list:', error);
      return []; // 返回空数组而不是抛出错误，以避免UI崩溃
    }
  }

}

// 创建并导出服务实例
export const marketService = new MarketService();
export default marketService;
