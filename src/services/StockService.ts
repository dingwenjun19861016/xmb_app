import apiService from './APIService';
import configService from './ConfigService';

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
   * @param limit 返回的记录数，默认从配置获取
   * @returns Promise<TransformedStockData[]>
   */
  async getHomeDisplayStocks(limit?: number): Promise<TransformedStockData[]> {
    try {
      console.log('🔄 StockService: Fetching home display stocks...');

      // 从配置获取首页显示的股票数量
      const configLimit = limit || await configService.getConfig('HOME_MARKET_OVERVIEW_COUNT', 2);
      
      // 获取股票列表，按排名排序取前N个
      const stocksData = await this.getUSStocksList(0, configLimit, "rank", "asc");

      if (stocksData.length === 0) {
        console.warn('⚠️ StockService: No stocks data received');
        return [];
      }

      // 转换数据格式以兼容现有的UI组件
      const transformedStocks = stocksData.map((stock): TransformedStockData => ({
        _id: stock._id,
        rank: stock.rank,
        name: stock.code, // 使用code作为name显示
        code: stock.code,
        fullName: stock.name, // 使用name作为fullName显示
        currentPrice: stock.currentPrice,
        priceChange24h: stock.priceChangePercent,
        priceChangePercent: stock.priceChangePercent,
        marketcap: stock.baseinfo.marketCap || stock.marketCap || '',
        volume: stock.baseinfo.volume || stock.volume || '',
        exchange: stock.exchange,
        sector: stock.sector,
        logoUrl: stock.logoUrl,
        // 兼容字段
        fdv: stock.baseinfo.marketCap || stock.marketCap || '',
        totalSupply: stock.baseinfo.sharesOutstanding || '',
        circulatingSupply: stock.baseinfo.sharesOutstanding || '',
        description: `${stock.name} (${stock.code}) - ${stock.sector}`,
        cexInfos: [],
        valid: true,
        created_at: stock.created_at,
        date: stock.date,
        updated_at: stock.updated_at,
        coin_id: stock._id,
        usstock24h: stock.usstock24h
      }));

      console.log(`✅ StockService: Successfully transformed ${transformedStocks.length} stocks for home display`);
      console.log('📊 StockService: Sample transformed stock:', transformedStocks[0]);

      return transformedStocks;

    } catch (error) {
      console.error('❌ StockService: Failed to fetch home display stocks:', error);
      return []; // 返回空数组而不是抛出错误，以避免UI崩溃
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

      // 获取所有股票数据并查找指定的股票
      const stocksData = await this.getUSStocksList(0, 1000);
      const stock = stocksData.find(s => s.code.toLowerCase() === stockCode.toLowerCase());

      if (!stock) {
        console.warn('⚠️ StockService: Stock not found:', stockCode);
        return null;
      }

      // 转换数据格式
      const transformedStock: TransformedStockData = {
        _id: stock._id,
        rank: stock.rank,
        name: stock.code,
        code: stock.code,
        fullName: stock.name,
        currentPrice: stock.currentPrice,
        priceChange24h: stock.priceChangePercent,
        priceChangePercent: stock.priceChangePercent,
        marketcap: stock.baseinfo.marketCap || stock.marketCap || '',
        volume: stock.baseinfo.volume || stock.volume || '',
        exchange: stock.exchange,
        sector: stock.sector,
        logoUrl: stock.logoUrl,
        // 兼容字段
        fdv: stock.baseinfo.marketCap || stock.marketCap || '',
        totalSupply: stock.baseinfo.sharesOutstanding || '',
        circulatingSupply: stock.baseinfo.sharesOutstanding || '',
        description: `${stock.name} (${stock.code}) - ${stock.sector}`,
        cexInfos: [],
        valid: true,
        created_at: stock.created_at,
        date: stock.date,
        updated_at: stock.updated_at,
        coin_id: stock._id,
        usstock24h: stock.usstock24h
      };

      console.log(`✅ StockService: Successfully fetched stock detail for ${stockCode}`);
      return transformedStock;

    } catch (error) {
      console.error(`❌ StockService: Failed to fetch stock detail for ${stockCode}:`, error);
      return null;
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    console.log('✅ StockService: Cache cleared');
  }
}

// 导出单例实例
const stockService = new StockService();
export default stockService;
