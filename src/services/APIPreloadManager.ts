import marketService from './MarketService';
import stockService from './StockService';
import apiService from './APIService';
import configService from './ConfigService';

/**
 * API预加载管理器 - XMB版本
 * 专门用于在应用启动时预加载关键API数据到APIService缓存中
 * 重点优化美股APP的用户体验
 */
class APIPreloadManager {
  private isPreloading = false;
  private preloadStats = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    startTime: 0,
    endTime: 0
  };

  /**
   * 开始预加载市场数据 - 美股APP优化版本
   */
  async startMarketDataPreload(): Promise<void> {
    if (this.isPreloading) {
      console.log('🚀 APIPreloadManager: 预加载已在进行中，跳过');
      return;
    }

    try {
      this.isPreloading = true;
      this.preloadStats.startTime = Date.now();
      
      console.log('🚀 APIPreloadManager: 开始预加载XMB市场数据到APIService缓存...');
      
      // 定义预加载任务 - 基于MarketScreen的真实API调用
      const preloadTasks = [
        // 第一优先级：MarketScreen启动时的默认API（最关键）
        {
          name: 'MarketScreen默认首批数据(0-30条,rank,asc)',
          priority: 1,
          task: () => stockService.getUSStocksList(0, 30, 'rank', 'asc') // MarketScreen默认启动调用
        },
        
        // 第二优先级：MarketScreen渐进式加载的第二批
        {
          name: 'MarketScreen默认第二批数据(30-55条,rank,asc)',
          priority: 2,
          task: () => stockService.getUSStocksList(30, 25, 'rank', 'asc') // 紧接着的第二批
        },
        
        // 第三优先级：用户最常用的排序方式
        {
          name: 'MarketScreen涨跌幅排序首批(0-30条,priceChangePercent,desc)',
          priority: 3,
          task: () => stockService.getUSStocksList(0, 30, 'priceChangePercent', 'desc') // 用户最爱看涨跌幅
        },
        {
          name: 'MarketScreen成交量排序首批(0-30条,volume,desc)',
          priority: 3,
          task: () => stockService.getUSStocksList(0, 30, 'volume', 'desc') // 用户常看成交量
        },
        
        // 第四优先级：默认排序的更多批次
        {
          name: 'MarketScreen默认第三批数据(55-80条,rank,asc)',
          priority: 4,
          task: () => stockService.getUSStocksList(55, 25, 'rank', 'asc') // 第三批progressiveBatchSize
        },
        {
          name: 'MarketScreen默认第四批数据(80-105条,rank,asc)',
          priority: 4,
          task: () => stockService.getUSStocksList(80, 25, 'rank', 'asc') // 第四批完成105条
        },
        
        // 第五优先级：其他排序方式的首批
        {
          name: 'MarketScreen最新价排序首批(0-30条,currentPrice,desc)',
          priority: 5,
          task: () => stockService.getUSStocksList(0, 30, 'currentPrice', 'desc') // 按价格从高到低
        },
        {
          name: 'MarketScreen市盈率排序首批(0-30条,peRatio,desc)',
          priority: 5,
          task: () => stockService.getUSStocksList(0, 30, 'peRatio', 'desc') // 按市盈率从高到低
        },
        
        // 第六优先级：排序的反向（用户第二次点击同一排序）
        {
          name: 'MarketScreen涨跌幅排序反向(0-30条,priceChangePercent,asc)',
          priority: 6,
          task: () => stockService.getUSStocksList(0, 30, 'priceChangePercent', 'asc') // 涨跌幅从小到大
        },
        {
          name: 'MarketScreen成交量排序反向(0-30条,volume,asc)',
          priority: 6,
          task: () => stockService.getUSStocksList(0, 30, 'volume', 'asc') // 成交量从小到大
        },
        {
          name: 'MarketScreen最新价排序反向(0-30条,currentPrice,asc)',
          priority: 6,
          task: () => stockService.getUSStocksList(0, 30, 'currentPrice', 'asc') // 价格从低到高
        },
        {
          name: 'MarketScreen市盈率排序反向(0-30条,peRatio,asc)',
          priority: 6,
          task: () => stockService.getUSStocksList(0, 30, 'peRatio', 'asc') // 市盈率从低到高
        }
      ];

      this.preloadStats.totalTasks = preloadTasks.length;
      
      // 按优先级分组执行
      const tasksByPriority = this.groupTasksByPriority(preloadTasks);
      const priorityKeys = Array.from(tasksByPriority.keys()).sort((a, b) => a - b);
      
      for (const priority of priorityKeys) {
        const tasks = tasksByPriority.get(priority)!;
        console.log(`🚀 APIPreloadManager: 执行优先级 ${priority} 的任务 (${tasks.length} 个)`);
        await this.executePriorityTasks(tasks, priority);
        
        // 优先级组之间的延迟 - 第一优先级后立即执行第二优先级
        if (priority < Math.max(...priorityKeys)) {
          const delay = priority === 1 ? 100 : 200 * priority; // 第一优先级后快速执行下一级
          await this.delay(delay);
        }
      }
      
      this.preloadStats.endTime = Date.now();
      const duration = this.preloadStats.endTime - this.preloadStats.startTime;
      
      console.log(`✅ APIPreloadManager: 预加载完成`, {
        总任务数: this.preloadStats.totalTasks,
        成功任务: this.preloadStats.completedTasks,
        失败任务: this.preloadStats.failedTasks,
        耗时: `${Math.round(duration / 1000)}秒`,
        成功率: `${Math.round(this.preloadStats.completedTasks / this.preloadStats.totalTasks * 100)}%`
      });

      // 输出缓存统计
      this.logCacheStats();
      
    } catch (error) {
      console.error('❌ APIPreloadManager: 预加载过程出现异常:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * 按优先级分组任务
   */
  private groupTasksByPriority(tasks: Array<{name: string, priority: number, task: () => Promise<any>}>): Map<number, Array<{name: string, task: () => Promise<any>}>> {
    const grouped = new Map();
    
    tasks.forEach(({name, priority, task}) => {
      if (!grouped.has(priority)) {
        grouped.set(priority, []);
      }
      grouped.get(priority).push({name, task});
    });
    
    // 按优先级排序（数字越小优先级越高）
    const sortedEntries = Array.from(grouped.entries()).sort(([a], [b]) => a - b);
    return new Map(sortedEntries);
  }

  /**
   * 执行指定优先级的任务
   */
  private async executePriorityTasks(tasks: Array<{name: string, task: () => Promise<any>}>, priority: number): Promise<void> {
    // 根据优先级决定并发数
    const concurrency = this.getConcurrencyByPriority(priority);
    
    // 分批执行
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async ({name, task}) => {
        try {
          console.log(`🔄 APIPreloadManager: 预加载 ${name}...`);
          
          const startTime = Date.now();
          await task();
          const duration = Date.now() - startTime;
          
          this.preloadStats.completedTasks++;
          console.log(`✅ APIPreloadManager: ${name} 完成 (${duration}ms)`);
          
        } catch (error) {
          this.preloadStats.failedTasks++;
          console.warn(`⚠️ APIPreloadManager: ${name} 失败:`, error.message);
        }
      });

      await Promise.allSettled(batchPromises);
      
      // 批次内延迟 - 第一优先级无延迟，快速获得首屏数据
      if (i + concurrency < tasks.length) {
        const batchDelay = priority === 1 ? 50 : 150; // 第一优先级快速执行
        await this.delay(batchDelay);
      }
    }
  }

  /**
   * 根据优先级获取并发数
   */
  private getConcurrencyByPriority(priority: number): number {
    switch (priority) {
      case 1: return 1; // 最高优先级，串行加载确保最快获得首屏数据
      case 2: return 2; // 高优先级，适中并发
      case 3: return 2; // 中优先级，适中并发
      case 4: return 3; // 低优先级，稍高并发
      case 5: return 3; // 更低优先级，稍高并发
      case 6: return 2; // 最低优先级，保守并发
      default: return 1;
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 输出缓存统计信息
   */
  private logCacheStats(): void {
    try {
      const stats = apiService.getCacheStats();
      console.log('📊 APIPreloadManager: APIService缓存统计:', {
        总缓存项: stats.total,
        有效缓存: stats.valid,
        过期缓存: stats.expired,
        缓存命中率预估: stats.total > 0 ? `${Math.round(stats.valid / stats.total * 100)}%` : '0%'
      });
    } catch (error) {
      console.warn('⚠️ APIPreloadManager: 获取缓存统计失败:', error);
    }
  }

  /**
   * 获取预加载统计信息
   */
  getPreloadStats() {
    return { ...this.preloadStats };
  }

  /**
   * 检查是否正在预加载
   */
  isPreloadingInProgress(): boolean {
    return this.isPreloading;
  }

  /**
   * 手动触发缓存清理
   */
  cleanupCache(): void {
    try {
      apiService.clearExpiredCache();
      console.log('🧹 APIPreloadManager: 缓存清理完成');
    } catch (error) {
      console.warn('⚠️ APIPreloadManager: 缓存清理失败:', error);
    }
  }

  /**
   * 获取推荐的预加载延迟时间（毫秒）
   * 根据应用启动状态和设备性能动态调整
   */
  getRecommendedDelay(): number {
    // 为了最快提升MarketScreen加载体验，缩短延迟时间
    let delay = 1000; // 基础延迟缩短到1秒
    
    // Web环境通常性能更好，可以更早开始
    if (typeof window !== 'undefined') {
      delay = 800; // Web环境0.8秒
    }
    
    // 如果是开发环境，几乎立即开始
    if (__DEV__) {
      delay = 500; // 开发环境0.5秒
    }
    
    return delay;
  }

  /**
   * 开发环境调试：验证MarketScreen常用API的缓存命中情况
   */
  debugCacheHitRate(): void {
    if (!__DEV__) return;
    
    console.log('🐛 APIPreloadManager: 检查XMB MarketScreen常用API缓存命中情况...');
    
    // 模拟MarketScreen的真实API调用参数，检查缓存是否存在
    const testCalls = [
      { method: 'listUsstocks', params: ['0', '30', 'rank', 'asc'], description: 'MarketScreen默认首批(最关键)' },
      { method: 'listUsstocks', params: ['30', '25', 'rank', 'asc'], description: 'MarketScreen默认第二批' },
      { method: 'listUsstocks', params: ['0', '30', 'priceChangePercent', 'desc'], description: 'MarketScreen涨跌幅排序' },
      { method: 'listUsstocks', params: ['0', '30', 'volume', 'desc'], description: 'MarketScreen成交量排序' },
      { method: 'listUsstocks', params: ['0', '30', 'currentPrice', 'desc'], description: 'MarketScreen最新价排序' },
      { method: 'listUsstocks', params: ['0', '30', 'peRatio', 'desc'], description: 'MarketScreen市盈率排序' },
    ];
    
    const cacheStats = apiService.getCacheStats();
    console.log('📊 当前缓存统计:', cacheStats);
    
    // 检查每个关键API调用的缓存键是否存在
    testCalls.forEach(({ method, params, description }) => {
      const cacheKey = `${method}:${JSON.stringify(params)}`;
      console.log(`🔍 ${description}: 缓存键 ${cacheKey}`);
    });
    
    console.log('💡 提示：观察MarketScreen加载时的"🗄️ Cache hit"日志来验证缓存命中');
  }

  /**
   * 开发环境调试：手动触发MarketScreen关键API预加载
   */
  async debugPreloadMarketScreenAPIs(): Promise<void> {
    if (!__DEV__) {
      console.warn('⚠️ 此功能仅在开发环境下可用');
      return;
    }
    
    console.log('🐛 APIPreloadManager: 手动预加载XMB MarketScreen关键API...');
    
    try {
      // 只预加载最关键的几个API - 与MarketScreen真实调用完全匹配
      const criticalTasks = [
        {
          name: 'MarketScreen默认首批数据(最关键)',
          task: () => stockService.getUSStocksList(0, 30, 'rank', 'asc') // 完全匹配MarketScreen默认启动
        },
        {
          name: 'MarketScreen默认第二批数据', 
          task: () => stockService.getUSStocksList(30, 25, 'rank', 'asc') // 完全匹配MarketScreen渐进加载
        },
        {
          name: 'MarketScreen涨跌幅排序',
          task: () => stockService.getUSStocksList(0, 30, 'priceChangePercent', 'desc') // 用户最常用的排序
        }
      ];
      
      for (const { name, task } of criticalTasks) {
        try {
          console.log(`🔄 预加载: ${name}...`);
          await task();
          console.log(`✅ 完成: ${name}`);
        } catch (error) {
          console.error(`❌ 失败: ${name}`, error);
        }
      }
      
      console.log('✅ XMB MarketScreen关键API预加载完成');
      this.debugCacheHitRate();
      
    } catch (error) {
      console.error('❌ XMB MarketScreen API预加载失败:', error);
    }
  }

  /**
   * 预加载用户自选股票数据
   * @param favoriteStockSymbols 用户自选股票代码数组
   */
  async preloadUserFavoriteStocks(favoriteStockSymbols: string[]): Promise<void> {
    if (!favoriteStockSymbols || favoriteStockSymbols.length === 0) {
      console.log('📊 APIPreloadManager: 没有用户自选股票，跳过预加载');
      return;
    }

    console.log(`📊 APIPreloadManager: 开始预加载 ${favoriteStockSymbols.length} 个用户自选股票...`);

    try {
      // 分批预加载自选股票，避免过多并发请求
      const batchSize = 5;
      for (let i = 0; i < favoriteStockSymbols.length; i += batchSize) {
        const batch = favoriteStockSymbols.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (symbol) => {
          try {
            // 预加载个股详情（MarketScreen点击进入详情页时会用到）
            await marketService.getCoinDetail(symbol);
            console.log(`✅ APIPreloadManager: 预加载自选股票 ${symbol} 完成`);
          } catch (error) {
            console.warn(`⚠️ APIPreloadManager: 预加载自选股票 ${symbol} 失败:`, error.message);
          }
        });

        await Promise.allSettled(batchPromises);
        
        // 批次间延迟
        if (i + batchSize < favoriteStockSymbols.length) {
          await this.delay(300);
        }
      }

      console.log(`✅ APIPreloadManager: 用户自选股票预加载完成`);
      
    } catch (error) {
      console.error('❌ APIPreloadManager: 用户自选股票预加载失败:', error);
    }
  }
}

// 创建单例实例
const apiPreloadManager = new APIPreloadManager();

export default apiPreloadManager;
