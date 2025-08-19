import apiService from './APIService';
import configService from './ConfigService';
import stockLogoService from './StockLogoService';

// API 调用监控 - 防止灾难级批量调用
const apiCallMonitor = {
  checkForDangerousCall(method: string, params: any[]) {
    if (method === 'listUsstocks' && params.length >= 2) {
      const limit = parseInt(params[1] || '0');
      if (limit > 300) {
        console.error('🚨 DANGEROUS API CALL DETECTED:', { method, params, limit });
        console.error('🚨 This may cause performance issues! Consider using getMultipleUsstocksInfo instead.');
      }
    }
    if (method === 'getMultipleUsstocksInfo' && params.length > 0) {
      const codes = (params[0] || '').split(',').filter(Boolean);
      if (codes.length > 100) {
        console.error('🚨 TOO MANY CODES IN BATCH:', { method, codesCount: codes.length });
        console.error('🚨 Consider splitting into smaller chunks!');
      }
    }
  }
};

// 重写 apiService.call 以添加监控
const originalCall = apiService.call.bind(apiService);
(apiService as any).call = function<T>(method: string, params: any[] = []): Promise<T> {
  apiCallMonitor.checkForDangerousCall(method, params);
  return originalCall(method, params);
};

// 股票数据接口 - 基于API返回的数据结构
export interface StockData {
  _id: string;
  code: string;
  date: string;
  amplitude: string;
  baseinfo: {
    openPrice: string;
    previousClose: string;
    peRatio: string;
    marketCap: string;
    volume: string;
    tradingRange: string;
    eps: string;
    sharesOutstanding: string;
    avgVolume10d: string;
    week52Range: string;
    beta: string;
    dividend: string;
    dividendYield: string;
  };
  created_at: string;
  currentPrice: string;
  dayHigh: string;
  dayLow: string;
  exchange: string;
  logoUrl: string;
  marketCap: string; // 重复字段，baseinfo中也有
  name: string;
  openPrice: string;
  peRatio: string; // 重复字段，baseinfo中也有
  previousClose: string;
  priceChange: string;
  priceChangePercent: string;
  rank: number;
  sector: string;
  updated_at: string;
  volume: string;
  usstock24h: Array<{
    _id: string;
    rank: number;
    code: string;
    name: string;
    price: string;
    createdAt: string;
    __v: number;
  }>;
}

// API响应接口 - 支持两种格式
export interface StockListResponse {
  // 标准格式
  result?: {
    stocks: StockData[];
    total: number;
    skip: number;
    limit: number;
    stats: {
      stocks_count: number;
      usstock24h_records: number;
      usstock24h_stocks: number;
    };
  };
  // 直接格式
  stocks?: StockData[];
  total?: number;
  skip?: number;
  limit?: number;
  stats?: {
    stocks_count: number;
    usstock24h_records: number;
    usstock24h_stocks: number;
  };
}

// 转换后的股票数据接口，用于UI显示
export interface TransformedStockData {
  _id: string;
  rank: number;
  name: string;
  code: string;
  fullName: string;
  currentPrice: string;
  priceChange24h: string;
  priceChangePercent: string;
  marketcap: string;
  volume: string;
  exchange: string;
  sector: string;
  logoUrl: string;
  // 为了兼容现有的CoinData接口，添加这些字段
  fdv: string;
  totalSupply: string;
  circulatingSupply: string;
  description: string;
  cexInfos: any[];
  valid: boolean;
  created_at: string;
  date: string;
  updated_at: string;
  coin_id?: string;
  // 新增: 市盈率 (用于排序显示)
  peRatio?: string;
  // 24小时价格数据
  usstock24h?: Array<{
    _id: string;
    rank: number;
    code: string;
    name: string;
    price: string;
    createdAt: string;
    __v: number;
  }>;
}

/**
 * 美股数据服务类
 */
class StockService {
  private static instance: StockService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 1000; // 30秒缓存

  constructor() {
    if (StockService.instance) {
      return StockService.instance;
    }
    StockService.instance = this;
  }

  /**
   * 获取美股列表数据
   * @param skip 跳过的记录数
   * @param limit 返回的记录数
   * @param sortBy 排序字段，默认为 "rank"
   * @param sortOrder 排序顺序，默认为 "asc"
   * @returns Promise<StockData[]>
   */
  async getUSStocksList(
    skip: number = 0,
    limit: number = 100,
    sortBy: string = "rank",
    sortOrder: string = "asc"
  ): Promise<StockData[]> {
    try {
      console.log('🔄 StockService: Fetching US stocks list...', { skip, limit, sortBy, sortOrder });

      const cacheKey = `stocks_${skip}_${limit}_${sortBy}_${sortOrder}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
        console.log('📊 StockService: Using cached stocks data');
        return cached.data;
      }

      // 调用listUsstocks API
      const response = await apiService.call<StockListResponse>(
        'listUsstocks',
        [skip.toString(), limit.toString(), sortBy, sortOrder]
      );

      console.log('🎉 StockService: API call completed successfully!');
      console.log('📊 StockService: Raw API response type:', typeof response);

      // 处理两种可能的响应格式：
      // 1. 标准格式：{ result: { stocks: [...] } }
      // 2. 直接格式：{ stocks: [...] }
      let stocksData = [];
      
      if (response && response.result && response.result.stocks) {
        // 标准格式
        stocksData = response.result.stocks;
        console.log('📊 StockService: Using standard format with result.stocks');
      } else if (response && response.stocks) {
        // 直接格式
        stocksData = response.stocks;
        console.log('📊 StockService: Using direct format with stocks');
      } else {
        console.warn('⚠️ StockService: Invalid response format:', response);
        return [];
      }
      console.log(`✅ StockService: Successfully fetched ${stocksData.length} stocks`);

      // 缓存数据
      this.cache.set(cacheKey, {
        data: stocksData,
        timestamp: Date.now()
      });

      return stocksData;

    } catch (error) {
      console.error('❌ StockService: Failed to fetch US stocks list:', error);
      throw error;
    }
  }

  /**
   * 获取首页展示的美股数据（从配置获取显示的股票代码）
   * @returns Promise<TransformedStockData[]>
   */
  async getHomeDisplayStocks(): Promise<TransformedStockData[]> {
    try {
      console.log('🔄 StockService: Fetching home display stocks...');
      const displayStockCodes = await configService.getConfig('HOME_MARKET_DISPLAY', 'NVDA,AAPL,TSLA,COIN');
      
      if (!displayStockCodes || !displayStockCodes.trim()) {
        console.warn('⚠️ StockService: HOME_MARKET_DISPLAY config is empty');
        return [];
      }

      const stockCodes = displayStockCodes.split(',').map(c => c.trim()).filter(Boolean);
      if (stockCodes.length === 0) {
        console.warn('⚠️ StockService: No valid stock codes found in config');
        return [];
      }

      console.log('📈 StockService: Parsed stock codes:', stockCodes);
      
      // 使用统一的批量获取方法
      const orderedStocks = await this.fetchMultipleStocks(stockCodes, { chunkSize: 30, warnThreshold: 60 });
      
      console.log('✅ StockService: getHomeDisplayStocks completed with', orderedStocks.length, 'stocks');
      return orderedStocks;
      
    } catch (error) {
      console.error('❌ StockService: Failed to fetch home display stocks:', error);
      return [];
    }
  }

  /**
   * 获取指定股票代码的详细信息
   * @param stockCode 股票代码，如 "NVDA", "AAPL"
   * @returns Promise<TransformedStockData | null>
   */
  async getStockDetail(stockCode: string): Promise<TransformedStockData | null> {
    try {
      console.log('🔄 StockService: Fetching stock detail for:', stockCode);

      // ✅ 修复灾难级API调用：改为使用getUsstockInfo API按需查询单个股票
      const stocksData = await this.getUsstockInfo(stockCode, 1);
      
      if (!Array.isArray(stocksData) || stocksData.length === 0) {
        console.warn('⚠️ StockService: Stock not found:', stockCode);
        return null;
      }

      // 返回第一个结果（最新数据）
      console.log(`✅ StockService: Successfully fetched stock detail for ${stockCode}`);
      return stocksData[0];

    } catch (error) {
      console.error(`❌ StockService: Failed to fetch stock detail for ${stockCode}:`, error);
      return null;
    }
  }

  /**
   * 获取指定股票的详细信息 - 使用新的getUsstockInfo API
   * @param stockCode 股票代码，如 "NVDA", "AAPL"
   * @param days 天数，默认7天
   * @returns Promise<TransformedStockData[]>
   */
  async getUsstockInfo(stockCode: string, days: number = 7): Promise<TransformedStockData[]> {
    try {
      console.log('🔄 StockService: Fetching stock info using getUsstockInfo API:', { stockCode, days });

      const response = await apiService.call<any[]>('getUsstockInfo', [stockCode.toUpperCase(), days.toString()]);
      
      if (!Array.isArray(response)) {
        console.warn('⚠️ StockService: Invalid response format from getUsstockInfo');
        return [];
      }

      // 转换数据格式
      const transformedStocks: TransformedStockData[] = response.map(stock => ({
        _id: stock._id || stock.id || '',
        rank: Number(stock.rank) || 0,
        name: stock.code || stock.name || '',
        code: stock.code || '',
        fullName: stock.name || stock.fullName || '',
        currentPrice: stock.currentPrice || stock.price || '0',
        priceChange24h: stock.priceChangePercent || stock.priceChange24h || '0',
        priceChangePercent: stock.priceChangePercent || stock.priceChange24h || '0',
        marketcap: stock.baseinfo?.marketCap || stock.marketCap || '',
        volume: stock.baseinfo?.volume || stock.volume || '',
        exchange: stock.exchange || '',
        sector: stock.sector || '',
        logoUrl: stockLogoService.getLogoUrlSync(stock.code || ''),
        // 兼容字段
        fdv: stock.baseinfo?.marketCap || stock.marketCap || '',
        totalSupply: stock.baseinfo?.sharesOutstanding || '',
        circulatingSupply: stock.baseinfo?.sharesOutstanding || '',
        description: `${stock.name || ''} (${stock.code || ''}) - ${stock.sector || ''}`,
        cexInfos: [],
        valid: true,
        created_at: stock.created_at || new Date().toISOString(),
        date: stock.date || new Date().toISOString(),
        updated_at: stock.updated_at || new Date().toISOString(),
        coin_id: stock._id || stock.id || '',
        peRatio: stock.baseinfo?.peRatio || stock.peRatio || '',
        usstock24h: stock.usstock24h || []
      }));

      console.log(`✅ StockService: Successfully fetched ${transformedStocks.length} stock records for ${stockCode}`);
      return transformedStocks;

    } catch (error) {
      console.error(`❌ StockService: Failed to fetch stock info for ${stockCode}:`, error);
      return [];
    }
  }  /**
   * 基于API的美股搜索（getUsstockInfo），并兼容回退到本地过滤
   * @param query 股票代码或名称关键词
   * @param limit 返回的最大条数
   */
  async searchUSStocks(query: string, limit: number = 20): Promise<TransformedStockData[]> {
    const q = (query || '').trim();
    if (!q) return [];
    
    try {
      console.log('🔎 StockService: searchUSStocks via getUsstockInfo', { query: q, limit });

      // 首选调用后端搜索API
      const apiList = await this.getUsstockInfo(q, 1);
      if (Array.isArray(apiList) && apiList.length > 0) {
        return apiList.slice(0, limit);
      }
      console.warn('⚠️ StockService: API search returned empty, fallback to local batch search');
    } catch (e) {
      console.error('❌ StockService: searchUSStocks API call failed, fallback to local batch search:', e);
    }

    // 回退方案：使用更保守的搜索策略，只查询前100只股票进行本地过滤
    try {
      console.log('🔄 StockService: Using fallback search on top 100 stocks...');
      const topStocks = await this.getUSStocksList(0, 100, 'rank', 'asc');
      
      // 在前100只股票中过滤匹配的
      const filtered = topStocks.filter(s =>
        s.code?.toLowerCase().includes(q.toLowerCase()) ||
        s.name?.toLowerCase().includes(q.toLowerCase())
      );
      
      // 使用统一的转换方法
      const transformedFiltered = this.transformRawStocks(filtered);
      
      console.log(`✅ StockService: Fallback search found ${transformedFiltered.length} results for "${q}"`);
      return transformedFiltered.slice(0, limit);
      
    } catch (fallbackError) {
      console.error('❌ StockService: Fallback search failed:', fallbackError);
      return [];
    }
  }

  /**
   * 获取股票24小时价格走势数据 - 使用新的getUsstock24hByCode API
   * @param stockCode 股票代码，如 "NVDA", "AAPL"
   * @param count 数据点数量，通常为 "1000"
   * @returns Promise<Array<{_id: string, rank: number, code: string, name: string, price: string, createdAt: string}>>
   */
  async getUsstock24hByCode(stockCode: string, count: string = "1000"): Promise<Array<{
    _id: string;
    rank: number;
    code: string;
    name: string;
    price: string;
    createdAt: string;
  }>> {
    try {
      console.log('🔄 StockService: Fetching 24h data using getUsstock24hByCode API:', { stockCode, count });

      const response = await apiService.call<Array<{
        _id: string;
        rank: number;
        code: string;
        name: string;
        price: string;
        createdAt: string;
      }>>('getUsstock24hByCode', [stockCode.toUpperCase(), count]);

      if (!Array.isArray(response)) {
        console.warn('⚠️ StockService: Invalid response format from getUsstock24hByCode');
        return [];
      }

      console.log(`✅ StockService: Successfully fetched ${response.length} 24h records for ${stockCode}`);
      return response;

    } catch (error) {
      console.error(`❌ StockService: Failed to fetch 24h data for ${stockCode}:`, error);
      return [];
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    console.log('✅ StockService: Cache cleared');
  }

  /**
   * 统一批量获取多个股票（带去重、分块、防御、顺序保持）
   * @param codes 原始股票代码数组
   * @param options 配置：chunkSize(默认30) warnThreshold(默认80)
   */
  async fetchMultipleStocks(
    codes: string[],
    options: { chunkSize?: number; warnThreshold?: number } = {}
  ): Promise<TransformedStockData[]> {
    const chunkSize = options.chunkSize ?? 30;
    const warnThreshold = options.warnThreshold ?? 80;

    // 预处理 & 去重
    const originalOrder: string[] = [];
    const normalized = codes
      .map(c => (c || '').trim().toUpperCase())
      .filter(c => !!c);
    const seen = new Set<string>();
    for (const c of normalized) {
      if (!seen.has(c)) {
        seen.add(c);
        originalOrder.push(c);
      }
    }

    if (originalOrder.length === 0) {
      console.warn('⚠️ StockService: fetchMultipleStocks received empty codes');
      return [];
    }

    if (originalOrder.length > warnThreshold) {
      console.warn(`⚠️ StockService: codes length ${originalOrder.length} exceeds warnThreshold ${warnThreshold}, truncating`);
    }
    const effectiveCodes = originalOrder.slice(0, warnThreshold);

    // 分块
    const chunks: string[][] = [];
    for (let i = 0; i < effectiveCodes.length; i += chunkSize) {
      chunks.push(effectiveCodes.slice(i, i + chunkSize));
    }

    let aggregatedRaw: any[] = [];
    for (const ch of chunks) {
      const codesStr = ch.join(',');
      try {
        const resp = await apiService.call<any>('getMultipleUsstocksInfo', [codesStr]);
        const parsed = this.parseMultipleStocksResponse(resp);
        if (parsed.length > 0) aggregatedRaw = aggregatedRaw.concat(parsed);
      } catch (e) {
        console.error('❌ StockService: fetchMultipleStocks chunk failed', { chunk: codesStr, error: e });
      }
    }

    if (aggregatedRaw.length === 0) {
      console.warn('⚠️ StockService: fetchMultipleStocks aggregated empty result');
      return [];
    }

    // 转换 & 按原始顺序排序
    const transformed = this.transformRawStocks(aggregatedRaw);
    const transformedMap = new Map(transformed.map(s => [s.code.toUpperCase(), s] as const));
    const ordered: TransformedStockData[] = [];
    for (const c of effectiveCodes) {
      const m = transformedMap.get(c);
      if (m) ordered.push(m);
    }
    
    console.log(`✅ StockService: fetchMultipleStocks completed, requested: ${effectiveCodes.length}, returned: ${ordered.length}`);
    return ordered;
  }

  /** 解析 getMultipleUsstocksInfo 多种返回结构，返回原始数组 */
  private parseMultipleStocksResponse(resp: any): any[] {
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp.result)) return resp.result;
    if (resp.result && Array.isArray(resp.result.stocks)) return resp.result.stocks;
    if (Array.isArray(resp.stocks)) return resp.stocks;
    if (resp.data && Array.isArray(resp.data)) return resp.data;
    console.warn('⚠️ StockService: parseMultipleStocksResponse unrecognized structure');
    return [];
  }

  /** 将原始股票数组转换为 TransformedStockData 数组 */
  private transformRawStocks(raw: any[]): TransformedStockData[] {
    return raw.map(stock => ({
      _id: stock._id || stock.id || `stock_${stock.code}`,
      rank: Number(stock.rank) || 0,
      name: stock.code || stock.symbol || '',
      code: stock.code || stock.symbol || '',
      fullName: stock.name || stock.fullName || stock.code || '',
      currentPrice: stock.currentPrice || stock.price || '0',
      priceChange24h: stock.priceChangePercent || stock.priceChange24h || '0',
      priceChangePercent: stock.priceChangePercent || stock.priceChange24h || '0',
      marketcap: stock.baseinfo?.marketCap || stock.marketCap || '',
      volume: stock.baseinfo?.volume || stock.volume || '',
      exchange: stock.exchange || 'NASDAQ',
      sector: stock.sector || '',
      logoUrl: stockLogoService.getLogoUrlSync(stock.code || stock.symbol || ''),
      fdv: stock.baseinfo?.marketCap || stock.marketCap || '',
      totalSupply: stock.baseinfo?.sharesOutstanding || '',
      circulatingSupply: stock.baseinfo?.sharesOutstanding || '',
      description: `${stock.name || ''} (${stock.code || ''}) - ${stock.sector || ''}`,
      cexInfos: [],
      valid: true,
      created_at: stock.created_at || new Date().toISOString(),
      date: stock.date || new Date().toISOString(),
      updated_at: stock.updated_at || new Date().toISOString(),
      coin_id: stock._id || stock.id || '',
      peRatio: stock.baseinfo?.peRatio || stock.peRatio || '',
      usstock24h: stock.usstock24h || []
    }));
  }
}

// 导出单例实例
const stockService = new StockService();
export default stockService;
