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
   * 搜索美股数据 - 使用优化后的搜索API，避免批量拉取
   * @param query 搜索关键词
   * @param limit 返回数量限制
   * @returns Promise<CoinData[]>
   */
  private async searchStocks(query: string, limit: number = 20): Promise<CoinData[]> {
    try {
      console.log('🔄 MarketService: Searching US stocks with optimized API...', { query, limit });
      
      // 使用StockService的优化搜索方法，直接返回匹配的股票
      const stocksData = await stockService.searchUSStocks(query, limit);
      
      // 转换为CoinData格式
      const stockResults: CoinData[] = stocksData.map(stock => ({
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
      
      // 使用StockService获取股票数据
      const stocksData = await stockService.getHomeDisplayStocks();
      
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
   * 获取美股列表数据（使用优化后的分页加载，避免一次性获取大量数据）
   * @param skip 跳过数量，默认0
   * @param limit 限制数量，默认50
   * @returns Promise<CoinData[]>
   */
  async getUSStockList(skip: number = 0, limit: number = 50): Promise<CoinData[]> {
    try {
      console.log('🔄 MarketService: Getting US stock list with pagination...', { skip, limit });
      
      // 使用分页方式获取股票列表，避免一次性获取过多数据
      const stocksData = await stockService.getUSStocksList(skip, limit, 'rank', 'asc');
      
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

  // REMOVED: All MARKET_LIST_* related methods have been deleted
  // This includes: getPublicChainList, getL2CoinsList, getMemeCoinsList, getDefiCoinsList, 
  // getPlatformCoinsList, getLRTCoinsList, getStorageCoinsList, getCosmosCoinsList, 
  // getNFTCoinsList, getGameCoinsList, getAICoinsList, getRWACoinsList
  
  /**
   * 根据标签类型获取对应的币种列表
   * @param labelType 标签类型："市值" | "美股" | "涨跌幅" | "24h成交量" | "价格"
   * @returns Promise<CoinData[]>
   */
  async getCoinsByLabel(labelType: string): Promise<CoinData[]> {
    try {
      console.log('🔄 MarketService: Getting coins by label:', labelType);
      
      switch (labelType) {
        case '美股':
          return await this.getUSStockList(0, 50); // 使用分页方式获取美股数据
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

}

// 创建并导出服务实例
export const marketService = new MarketService();
export default marketService;
