import apiService from './APIService';
import { DateUtils } from '../utils/dateUtils';
import { CRYPTO_SYMBOLS, getCoinAliases } from '../screens/Market/CoinAlias';
import { domains, resourceURLs, getMainURL } from '../config/apiConfig';

// 定义新闻文章接口
export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  date: string;
  author: string;
  image: string;
  category: string;
  tags: string[];
  articleUrl: string;
  searchTerm?: string;
  isSearchResult?: boolean;
}

// 定义文章内容项接口
interface ContentItem {
  content: string;
  url: string;
  embed: string;
  _id: string;
}

// 定义API返回的原始数据格式
interface RawNewsData {
  path: string;
  pathname: string;
  title: string;
  contents: ContentItem[];
  createdAt: string;
  updatedAt: string;
  imageUrl: string;
  logourl?: string;
  menu: string;
  type: string;
  nav: string;
  articleUrl: string;
  chainalertcontent_id: string;
  [key: string]: any;
}

// API参数类型
interface APIParams {
  categories?: string;
  skip?: number;
  limit?: number;
  searchTerm?: string;
}

// 分类映射
const CATEGORY_MAP: { [key: string]: string } = {
  'stockquicknews': '快讯',
  'headline': '头条',
  'market': '研报',
  'eth': '以太坊',
  'ethl2': '以太坊L2',
  'ethlrt': '以太坊LRT',
  'btclrt': '比特币LRT',
  'btcl2': '比特币L2',
  'defi': 'DeFi',
};

// 反向分类映射：从显示名称到API参数
const REVERSE_CATEGORY_MAP: { [key: string]: string } = {
  '快讯': 'stockquicknews',
  '头条': 'headline', 
  '研报': 'market',
  '以太坊': 'eth',
  '以太坊L2': 'ethl2',
  '以太坊LRT': 'ethlrt',
  '比特币LRT': 'btclrt',
  '比特币L2': 'btcl2',
  'DeFi': 'defi',
};

// 缓存项接口
interface CacheItem {
  article: NewsArticle;
  timestamp: number;
  expiresAt: number;
}

// 新闻服务类
class NewsService {
  private readonly DEFAULT_CATEGORIES = "headline,market,eth,ethl2,ethlrt,btclrt,btcl2,defi";
  private readonly NEWS_CATEGORY = "stockquicknews";
  private readonly DEBUG = false; // 控制调试输出
  
  // 缓存配置
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
  private readonly articleCache: Map<string, CacheItem> = new Map();

  /**
   * 统一的API调用方法
   * @param params API参数
   * @returns Promise<RawNewsData[]>
   */
  private async callAPI(params: APIParams): Promise<RawNewsData[]> {
    const { categories = "", skip = 0, limit = 10, searchTerm = "" } = params;

    try {
      const response = await apiService.call('listChainalertContent', [
        "",
        "",
        categories,
        skip.toString(),
        limit.toString(),
        searchTerm
      ]);

      return this.parseAPIResponse(response);
    } catch (error) {
      console.error('❌ NewsService: API call failed:', error);
      throw new Error(`API call failed: ${error.message}`);
    }
  }

  /**
   * 解析API响应
   * @param response API响应
   * @returns RawNewsData[]
   */
  private parseAPIResponse(response: any): RawNewsData[] {
    if (Array.isArray(response)) {
      return response;
    }
    
    if (response && Array.isArray(response.result)) {
      return response.result;
    }
    
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    console.warn('⚠️ NewsService: Unexpected API response format:', response);
    return [];
  }

  /**
   * 转换原始数据为标准格式（支持新API格式）
   * @param rawData 原始数据
   * @returns NewsArticle
   */
  private transformNewsData(rawData: RawNewsData): NewsArticle {
    // 处理内容
    const fullContent = rawData.contents
      ? rawData.contents.map(item => item.content).join('\n\n')
      : '';
    
    // 处理摘要
    const summary = rawData.contents && rawData.contents.length > 0
      ? this.extractSummaryFromMarkdown(rawData.contents[0].content)
      : rawData.pathname || rawData.title || '暂无摘要';
    
    // 优先使用pathname作为标题，因为新API中pathname是正确的标题
    const title = rawData.pathname || rawData.title || '未知标题';
    
    // 处理图片URL - 新API使用imageUrl字段
    const imageUrl = this.getFullImageUrl(rawData.imageUrl || rawData.logourl);
    
    // 处理日期 - 新API使用createdAt
    const formattedDate = this.formatDate(rawData.createdAt || rawData.updatedAt);
    
    // 使用path作为ID
    const articleId = rawData.path || 'unknown';
    
    // 处理分类
    const category = this.getCategoryName(rawData.menu || rawData.nav);
    
    const transformedArticle = {
      id: articleId,
      title,
      summary,
      content: fullContent,
      date: formattedDate,
      author: '小目标',
      image: imageUrl,
      category: category,
      tags: [rawData.type || '', rawData.menu || '', rawData.nav || ''].filter(Boolean),
      articleUrl: `articles/${articleId}`
    };

    return transformedArticle;
  }

  /**
   * 批量转换并去重
   * @param rawDataArray 原始数据数组
   * @param addSearchContext 是否添加搜索上下文
   * @param searchTerm 搜索关键词
   * @returns NewsArticle[]
   */
  private transformAndDeduplicate(
    rawDataArray: RawNewsData[], 
    addSearchContext = false, 
    searchTerm = ''
  ): NewsArticle[] {
    const articles = rawDataArray.map(rawData => this.transformNewsData(rawData));
    const uniqueArticles = this.removeDuplicatesByTitle(articles);
    
    // 批量缓存转换后的文章
    this.batchSetToCache(uniqueArticles);
    
    if (addSearchContext) {
      return uniqueArticles.map(article => ({
        ...article,
        searchTerm,
        isSearchResult: true
      }));
    }
    
    return uniqueArticles;
  }

  /**
   * 获取新闻列表
   * @param skip 跳过的数量
   * @param limit 获取的数量  
   * @param categories 新闻分类
   * @returns Promise<NewsArticle[]>
   */
  async getNewsList(
    skip: number = 0, 
    limit: number = 10, 
    categories: string = this.DEFAULT_CATEGORIES
  ): Promise<NewsArticle[]> {
    try {
      const rawData = await this.callAPI({ categories, skip, limit });
      return this.transformAndDeduplicate(rawData);
    } catch (error) {
      console.error('❌ NewsService: Failed to fetch news list:', error);
      throw error;
    }
  }

  /**
   * 获取最新资讯列表
   * @param skip 跳过的数量
   * @param limit 获取的数量
   * @returns Promise<NewsArticle[]>
   */
  async getLatestNews(skip: number = 0, limit: number = 10): Promise<NewsArticle[]> {
    try {
      const rawData = await this.callAPI({ 
        categories: this.NEWS_CATEGORY, 
        skip, 
        limit 
      });
      return this.transformAndDeduplicate(rawData);
    } catch (error) {
      console.error('❌ NewsService: Failed to fetch latest news:', error);
      throw error;
    }
  }

  /**
   * 搜索新闻
   * @param searchTerm 搜索关键词
   * @param limit 获取数量
   * @returns Promise<NewsArticle[]>
   */
  async searchNews(searchTerm: string, limit: number = 100, skip: number = 0): Promise<NewsArticle[]> {
    try {
      const rawData = await this.callAPI({ 
        categories: "", 
        skip, 
        limit, 
        searchTerm 
      });
      return this.transformAndDeduplicate(rawData, true, searchTerm);
    } catch (error) {
      console.error('❌ NewsService: Failed to search news:', error);
      throw error;
    }
  }

  /**
   * 智能搜索新闻 - 利用币种别名扩展搜索
   * @param searchTerm 搜索关键词
   * @param limit 获取数量
   * @param skip 跳过数量
   * @returns Promise<NewsArticle[]>
   */
  async smartSearchNews(searchTerm: string, limit: number = 100, skip: number = 0): Promise<NewsArticle[]> {
    try {
      console.log('🧠 NewsService: 开始智能搜索:', searchTerm, `limit: ${limit}, skip: ${skip}`);
      
      // 检查是否为识别度不高的币名（1-2个字母）
      const isLowRecognitionSymbol = searchTerm.length <= 2 && /^[A-Z]+$/i.test(searchTerm.trim());
      
      // 构建搜索词列表
      const searchTerms: string[] = [];
      
      // 对于非低识别度币名，添加原始搜索词
      if (!isLowRecognitionSymbol) {
        searchTerms.push(searchTerm);
      } else {
        console.log('� NewsService: 跳过低识别度币名的原始词搜索:', searchTerm);
      }
      
      // 添加扩展搜索词
      const expandedTerms = await this.expandSearchTerms(searchTerm);
      console.log('📝 NewsService: 扩展搜索词:', expandedTerms);
      searchTerms.push(...expandedTerms.slice(0, 3)); // 限制最多3个扩展词
      
      if (searchTerms.length === 0) {
        console.log('⚠️ NewsService: 没有可用的搜索词');
        return [];
      }
      
      console.log('🔍 NewsService: 将使用的搜索词:', searchTerms);
      
      // 汇总所有搜索结果
      const allResults: NewsArticle[] = [];
      const usedIds = new Set<string>();
      
      // 对每个搜索词进行搜索，并汇总结果
      for (const term of searchTerms) {
        console.log(`🔎 NewsService: 搜索词: ${term}`);
        try {
          // 获取足够多的结果用于汇总和排序
          const results = await this.searchNews(term, 1000, 0);
          
          // 添加不重复的结果
          for (const article of results) {
            if (!usedIds.has(article.id)) {
              allResults.push(article);
              usedIds.add(article.id);
            }
          }
        } catch (error) {
          console.error(`❌ NewsService: 搜索词 "${term}" 搜索失败:`, error);
        }
      }
      
      // 应用过滤词过滤
      const filteredResults = await this.applyNewsFilter(allResults, searchTerm);
      
      // 按时间排序（最新的在前）
      filteredResults.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // 降序排列，最新的在前
      });
      
      // 应用分页
      const startIndex = skip;
      const endIndex = skip + limit;
      const paginatedResults = filteredResults.slice(startIndex, endIndex);
      
      console.log(`✅ NewsService: 智能搜索完成，原始结果: ${allResults.length}，过滤后: ${filteredResults.length}，返回: ${paginatedResults.length} (跳过: ${skip})`);
      return paginatedResults;
      
    } catch (error) {
      console.error('❌ NewsService: 智能搜索失败:', error);
      // 如果智能搜索失败，回退到普通搜索
      return this.searchNews(searchTerm, limit, skip);
    }
  }

  /**
   * 扩展搜索词 - 根据币种别名（异步版本）
   * @param searchTerm 原始搜索词
   * @returns Promise<string[]> 扩展的搜索词数组
   */
  private async expandSearchTerms(searchTerm: string): Promise<string[]> {
    const expandedTerms: string[] = [];
    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    
    try {
      // 获取合并后的币种别名配置
      const cryptoSymbols = await getCoinAliases();
      
      // 遍历所有币种符号及其别名
      Object.entries(cryptoSymbols).forEach(([symbol, aliases]) => {
        const symbolLower = symbol.toLowerCase();
        
        // 检查搜索词是否匹配币种代码
        if (normalizedSearchTerm === symbolLower || normalizedSearchTerm === symbol) {
          // 添加所有别名
          aliases.forEach(alias => {
            if (alias.toLowerCase() !== normalizedSearchTerm) {
              expandedTerms.push(alias);
            }
          });
          return;
        }
        
        // 检查搜索词是否匹配任何别名
        const matchingAlias = aliases.find(alias => 
          alias.toLowerCase() === normalizedSearchTerm
        );
        
        if (matchingAlias) {
          // 添加币种代码
          if (symbolLower !== normalizedSearchTerm) {
            expandedTerms.push(symbol);
          }
          // 添加其他别名
          aliases.forEach(alias => {
            if (alias.toLowerCase() !== normalizedSearchTerm) {
              expandedTerms.push(alias);
            }
          });
        }
      });
    } catch (error) {
      console.warn('⚠️ NewsService: Failed to get coin aliases, using local fallback:', error);
      
      // 回退到本地配置
      Object.entries(CRYPTO_SYMBOLS).forEach(([symbol, aliases]) => {
        const symbolLower = symbol.toLowerCase();
        
        if (normalizedSearchTerm === symbolLower || normalizedSearchTerm === symbol) {
          aliases.forEach(alias => {
            if (alias.toLowerCase() !== normalizedSearchTerm) {
              expandedTerms.push(alias);
            }
          });
          return;
        }
        
        const matchingAlias = aliases.find(alias => 
          alias.toLowerCase() === normalizedSearchTerm
        );
        
        if (matchingAlias) {
          if (symbolLower !== normalizedSearchTerm) {
            expandedTerms.push(symbol);
          }
          aliases.forEach(alias => {
            if (alias.toLowerCase() !== normalizedSearchTerm) {
              expandedTerms.push(alias);
            }
          });
        }
      });
    }
    
    // 去重并限制数量
    return [...new Set(expandedTerms)].slice(0, 5);
  }

  /**
   * 根据ID获取单篇新闻详情（带缓存）
   * @param articleId 文章ID
   * @returns Promise<NewsArticle | null>
   */
  async getArticleById(articlePath: string): Promise<NewsArticle | null> {
    try {
      // 直接使用新API获取文章数据
      const directResult = await this.getArticleByPath(articlePath);
      
      if (directResult) {
        return directResult;
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ NewsService: Failed to get article by ID:', error);
      return null;
    }
  }

  /**
   * 根据path字段搜索文章
   * @param path 文章path
   * @returns Promise<NewsArticle[]>
   */
  async searchNewsByPath(path: string): Promise<NewsArticle[]> {
    try {
      const rawData = await this.callAPI({ 
        categories: "", 
        skip: 0, 
        limit: 200, 
        searchTerm: "" 
      });
      
      const matchingData = rawData.filter(item => item.path === path);
      return this.transformAndDeduplicate(matchingData);
    } catch (error) {
      console.error('❌ NewsService: Failed to search by path:', error);
      throw error;
    }
  }

  /**
   * 直接通过path获取文章内容（新API）
   * @param path 文章path
   * @returns Promise<NewsArticle | null>
   */
  async getArticleByPath(path: string): Promise<NewsArticle | null> {
    try {
      // 直接调用新的API获取最新数据
      const response = await apiService.call('getChainalertContent', [path]);
      
      // 检查API响应是否为空 - 支持直接响应和result包装的响应
      if (!response) {
        return null;
      }

      // 判断是直接响应还是包装在result中的响应
      let rawData = null;
      if (response.result) {
        // 如果有result字段，使用result中的数据
        rawData = response.result;
      } else if (response.title || response.pathname || response.contents || response.path) {
        // 如果直接包含文章字段，直接使用响应数据
        rawData = response;
      } else {
        return null;
      }
      
      // 转换数据格式
      const article = this.transformNewsData(rawData);
      
      // 缓存文章
      this.setToCache(article);
      
      return article;
      
    } catch (error) {
      console.error('❌ NewsService: 直接获取文章失败:', error);
      return null;
    }
  }

  // 便捷方法
  async getFeaturedNews(limit: number = 3): Promise<NewsArticle[]> {
    // 先清理过期缓存
    this.cleanupExpiredCache();
    return this.getNewsList(0, limit);
  }

  async getFeaturedLatestNews(limit: number = 3): Promise<NewsArticle[]> {
    this.cleanupExpiredCache();
    return this.getLatestNews(0, limit);
  }

  async getNewsByCategory(category: string, skip: number = 0, limit: number = 10): Promise<NewsArticle[]> {
    this.cleanupExpiredCache();
    
    // 将显示分类转换为API参数
    const apiCategory = REVERSE_CATEGORY_MAP[category] || category;
    
    return this.getNewsList(skip, limit, apiCategory);
  }

  async getLatestNewsById(articlePath: string): Promise<NewsArticle | null> {
    // 优先使用缓存
    const cached = this.getFromCache(articlePath);
    if (cached) return cached;
    
    const articles = await this.getLatestNews(0, 100);
    return articles.find(item => item.id === articlePath) || null;
  }

  async searchLatestNews(searchTerm: string, limit: number = 20): Promise<NewsArticle[]> {
    // 先尝试从缓存中过滤
    const cachedArticles: NewsArticle[] = [];
    for (const [_, cacheItem] of this.articleCache) {
      if (cacheItem.article.category === '快讯') {
        cachedArticles.push(cacheItem.article);
      }
    }
    
    if (cachedArticles.length >= limit) {
      const filtered = cachedArticles.filter(article => 
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        return filtered.slice(0, limit);
      }
    }
    
    // 缓存不足，从API获取
    const allArticles = await this.getLatestNews(0, 100);
    const filtered = allArticles.filter(article => 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.slice(0, limit);
  }

  // 工具方法
  // Path 格式通常为 6 位十六进制数字
  private isPathFormat(id: string): boolean {
    return id && id.length === 6 && /^[a-f0-9]{6}$/i.test(id);
  }

  private extractSummaryFromMarkdown(content: string): string {
    if (!content) return '暂无摘要';
    
    const cleanText = content
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/>\s*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n\s*\n/g, ' ')
      .trim();
    
    return cleanText.length > 120 ? cleanText.substring(0, 120) + '...' : cleanText || '暂无摘要';
  }

  private getFullImageUrl(imageUrl?: string): string {
    if (!imageUrl) return 'https://via.placeholder.com/800x400?text=小目标+News';
    if (imageUrl.startsWith('http')) return imageUrl;
    if (imageUrl.startsWith('/')) return getMainURL(imageUrl.slice(1));
    return 'https://via.placeholder.com/800x400?text=小目标+News';
  }

  private getCategoryName(menu: string): string {
    return CATEGORY_MAP[menu] || '其他';
  }

  formatDate(dateString: string): string {
    return DateUtils.formatRelativeTime(dateString);
  }

  isValidImageUrl(imageUrl: string): boolean {
    if (!imageUrl || imageUrl.includes('placeholder')) return false;
    const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return extensions.some(ext => imageUrl.toLowerCase().includes(ext)) || 
           imageUrl.startsWith('http');
  }

  private removeDuplicatesByTitle(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    return articles.filter(article => {
      const normalized = article.title
        .replace(/\s+/g, '')
        .replace(/[^\w\u4e00-\u9fff]/g, '')
        .toLowerCase();
      
      if (seen.has(normalized)) {
        if (this.DEBUG) {
          console.log(`🔄 NewsService: Duplicate removed: ${article.title}`);
        }
        return false;
      }
      
      seen.add(normalized);
      return true;
    });
  }

  private generateHashFromTitle(title: string): string {
    if (!title) return '0';
    
    let hash = 0;
    const normalized = title.trim().toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^\w\u4e00-\u9fff]/g, '');
    
    for (let i = 0; i < normalized.length; i++) {
      hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * 缓存管理方法
   */
  
  /**
   * 从缓存获取文章
   * @param key 缓存键（可以是 id 或 path）
   * @returns NewsArticle | null
   */
  private getFromCache(key: string): NewsArticle | null {
    const cacheItem = this.articleCache.get(key);
    if (!cacheItem) return null;
    
    const now = Date.now();
    if (now > cacheItem.expiresAt) {
      this.articleCache.delete(key);
      return null;
    }
    
    if (this.DEBUG) {
      console.log(`🗄️ NewsService: Cache hit for key: ${key}`);
    }
    return cacheItem.article;
  }
  
  /**
   * 将文章存入缓存
   * @param article 文章对象
   */
  private setToCache(article: NewsArticle): void {
    const now = Date.now();
    const cacheItem: CacheItem = {
      article,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    };
    
    // 使用 id (即path) 作为缓存键
    this.articleCache.set(article.id, cacheItem);
    
    if (this.DEBUG) {
      console.log(`💾 NewsService: Cached article: ${article.id} - ${article.title.substring(0, 30)}`);
    }
  }
  
  /**
   * 批量缓存文章
   * @param articles 文章数组
   */
  private batchSetToCache(articles: NewsArticle[]): void {
    articles.forEach(article => this.setToCache(article));
  }
  
  // 由于现在我们统一使用path作为id，不再需要这些方法
  
  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, cacheItem] of this.articleCache) {
      if (now > cacheItem.expiresAt) {
        this.articleCache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0 && this.DEBUG) {
      console.log(`🧹 NewsService: Cleaned up ${cleanedCount} expired cache items`);
    }
  }
  
  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { totalArticles: number; cacheHitRate?: number } {
    this.cleanupExpiredCache();
    return {
      totalArticles: this.articleCache.size
    };
  }
  
  /**
   * 清空所有缓存
   */
  clearCache(): void {
    this.articleCache.clear();
    if (this.DEBUG) {
      console.log('🧹 NewsService: All cache cleared');
    }
  }

  /**
   * 应用新闻过滤词过滤
   * @param articles 原始文章列表
   * @param coinSymbol 币种符号，如 "BTC", "ENA"
   * @returns Promise<NewsArticle[]> 过滤后的文章列表
   */
  private async applyNewsFilter(articles: NewsArticle[], coinSymbol: string): Promise<NewsArticle[]> {
    try {
      // 获取过滤词配置
      const filterConfig = await this.getNewsFilterConfig();
      
      if (!filterConfig || Object.keys(filterConfig).length === 0) {
        console.log('📝 NewsService: 未找到过滤词配置，返回原始结果');
        return articles;
      }
      
      // 标准化币种符号
      const normalizedCoinSymbol = coinSymbol.toUpperCase().trim();
      
      // 获取该币种的过滤词列表
      const filterWords = filterConfig[normalizedCoinSymbol] || [];
      
      if (filterWords.length === 0) {
        console.log(`📝 NewsService: 币种 ${normalizedCoinSymbol} 无过滤词配置，返回原始结果`);
        return articles;
      }
      
      console.log(`🚫 NewsService: 应用过滤词for ${normalizedCoinSymbol}:`, filterWords);
      
      // 过滤文章
      const filteredArticles = articles.filter(article => {
        // 检查文章标题（pathname）是否包含过滤词
        const title = article.title.toLowerCase();
        
        // 检查是否包含任何过滤词
        const containsFilterWord = filterWords.some(filterWord => {
          const normalizedFilterWord = filterWord.toLowerCase();
          const isFiltered = title.includes(normalizedFilterWord);
          
          if (isFiltered) {
            console.log(`🚫 NewsService: 过滤掉文章 "${article.title}" (包含过滤词: ${filterWord})`);
          }
          
          return isFiltered;
        });
        
        return !containsFilterWord; // 不包含过滤词的文章保留
      });
      
      console.log(`✅ NewsService: 过滤完成，原始: ${articles.length}，过滤后: ${filteredArticles.length}`);
      return filteredArticles;
      
    } catch (error) {
      console.error('❌ NewsService: 应用过滤词失败:', error);
      // 出错时返回原始文章列表
      return articles;
    }
  }

  /**
   * 获取新闻过滤词配置
   * @returns Promise<Record<string, string[]> | null> 过滤词配置
   */
  private async getNewsFilterConfig(): Promise<Record<string, string[]> | null> {
    try {
      // 导入ConfigService（延迟导入避免循环依赖）
      const { default: configService } = await import('./ConfigService');
      
      // 获取配置
      const configStr = await configService.getConfig('MARKET_COIN_NG_NEWS', '{}');
      
      if (!configStr || configStr === '{}') {
        return null;
      }
      
      // 解析JSON配置
      const config = JSON.parse(configStr) as Record<string, string[]>;
      
      // 验证配置格式
      if (typeof config !== 'object' || config === null) {
        console.warn('⚠️ NewsService: 过滤词配置格式无效:', config);
        return null;
      }
      
      console.log('📋 NewsService: 成功加载过滤词配置:', config);
      return config;
      
    } catch (error) {
      console.error('❌ NewsService: 获取过滤词配置失败:', error);
      return null;
    }
  }
}

// 创建服务实例
export const newsService = new NewsService();
export default newsService;
