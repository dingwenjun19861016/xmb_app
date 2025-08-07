import { DataService } from './DataService';
import apiService from '../APIService';

// 稳定币数据接口
export interface StablecoinData {
  mcap: string;
  timestamp?: string;
  date?: string;
}

class StablecoinService extends DataService<StablecoinData> {
  protected dataType = 'STABLERANK_DAILY';
  protected serviceName = 'StablecoinService';

  /**
   * 重写获取数据的方法，使用特殊的API参数
   * @param limit 获取数据条数，默认为1
   * @returns Promise<StablecoinData[] | null>
   */
  protected async fetchData(limit: number = 1): Promise<StablecoinData[] | null> {
    try {
      console.log(`🔄 ${this.serviceName}: Fetching stablecoin data...`);

      // 使用特殊的API参数：method=listData&params[]=&params[]=STABLERANK_DAILY&params[]=1&params[]=0&params[]=1000&params[]=
      const response = await apiService.call<any>(
        'listData', 
        ['', 'STABLERANK_DAILY', '1', '0', '1000', '']
      );

      // 处理响应可能是数组或对象的情况
      let dataArray = [];
      if (Array.isArray(response)) {
        dataArray = response;
      } else if (response?.result && Array.isArray(response.result)) {
        dataArray = response.result;
      }

      if (dataArray && dataArray.length > 0) {
        // 处理多条历史数据，但只取需要的数量
        const allData: StablecoinData[] = [];
        
        for (let i = 0; i < Math.min(dataArray.length, limit); i++) {
          const dataItem = dataArray[i];
          console.log(`📊 ${this.serviceName}: Processing data item:`, dataItem);
          
          if (dataItem.data) {
            console.log(`📊 ${this.serviceName}: Raw data field:`, dataItem.data);
            try {
              // 解析JSON字符串
              const parsedData = JSON.parse(dataItem.data);
              console.log(`📊 ${this.serviceName}: Parsed data:`, parsedData);
              
              if (Array.isArray(parsedData) && parsedData.length > 0) {
                const stablecoinData = parsedData[0];
                allData.push({
                  mcap: stablecoinData.mcap || '0',
                  timestamp: dataItem.createdAt,
                  date: dataItem.date
                });
              }
            } catch (parseError) {
              console.error(`❌ ${this.serviceName}: Failed to parse stablecoin data:`, parseError);
              console.error('Raw data:', dataItem.data);
            }
          }
        }
        
        if (allData.length > 0) {
          console.log(`✅ ${this.serviceName}: Successfully parsed stablecoin data:`, allData);
          return allData;
        } else {
          console.warn(`⚠️ ${this.serviceName}: No valid parsed data found`);
          return null;
        }
      } else {
        console.warn(`⚠️ ${this.serviceName}: No stablecoin data found`);
        return null;
      }
    } catch (error) {
      console.error(`❌ ${this.serviceName}: Failed to fetch stablecoin data:`, error);
      return null;
    }
  }

  /**
   * 获取当前稳定币市值数据
   * @returns Promise<StablecoinData | null>
   */
  async getStablecoinData(): Promise<StablecoinData | null> {
    return this.getLatestData();
  }

  /**
   * 获取稳定币市值历史数据
   * @param limit 获取数据的数量限制，默认30条
   * @returns Promise<StablecoinData[] | null>
   */
  async getStablecoinHistory(limit: number = 30): Promise<StablecoinData[] | null> {
    return this.getData(limit);
  }

  /**
   * 解析稳定币市值数值（将字符串转换为万亿美元）
   * @param mcapString 市值字符串（如"261885864329"）
   * @returns 市值数值（万亿美元）
   */
  static parseStablecoinValue(mcapString: string): number {
    if (!mcapString) return 0;
    
    const numValue = parseFloat(mcapString);
    if (isNaN(numValue)) return 0;
    
    // 将原始数值（美元）转换为万亿美元
    return numValue / 1000000000000;
  }

  /**
   * 格式化稳定币市值显示
   * @param mcapString 市值字符串
   * @returns 格式化后的显示文本
   */
  static formatStablecoin(mcapString: string): string {
    if (!mcapString) return '$0';
    
    const value = StablecoinService.parseStablecoinValue(mcapString);
    
    if (value >= 1) {
      return `$${value.toFixed(2)}T`;
    } else if (value >= 0.001) {
      return `$${(value * 1000).toFixed(0)}B`;
    } else {
      return `$${(value * 1000000).toFixed(0)}M`;
    }
  }

  /**
   * 计算稳定币市值变化百分比
   * @param current 当前市值
   * @param previous 前一个市值
   * @returns 变化百分比
   */
  static calculateChangePercent(current: string, previous: string): number {
    const currentValue = StablecoinService.parseStablecoinValue(current);
    const previousValue = StablecoinService.parseStablecoinValue(previous);
    
    if (previousValue === 0) return 0;
    
    return ((currentValue - previousValue) / previousValue) * 100;
  }

  /**
   * 根据市值变化获取颜色
   * @param changePercent 变化百分比
   * @returns 颜色值
   */
  static getChangeColor(changePercent: number): string {
    if (changePercent > 0) {
      return '#34C759'; // 绿色 - 上涨
    } else if (changePercent < 0) {
      return '#FF3B30'; // 红色 - 下跌
    } else {
      return '#8E8E93'; // 灰色 - 无变化
    }
  }

  /**
   * 获取稳定币市值水平描述
   * @param mcapString 市值字符串
   * @returns 市值水平描述
   */
  static getStablecoinLevel(mcapString: string): string {
    const value = StablecoinService.parseStablecoinValue(mcapString);
    
    if (value >= 0.3) {
      return '极高流动性';
    } else if (value >= 0.25) {
      return '高流动性';
    } else if (value >= 0.2) {
      return '中等流动性';
    } else if (value >= 0.15) {
      return '较低流动性';
    } else {
      return '低流动性';
    }
  }

  /**
   * 获取稳定币市值水平颜色
   * @param mcapString 市值字符串
   * @returns 颜色值
   */
  static getStablecoinLevelColor(mcapString: string): string {
    const value = StablecoinService.parseStablecoinValue(mcapString);
    
    if (value >= 0.3) {
      return '#34C759'; // 绿色
    } else if (value >= 0.25) {
      return '#30D158'; // 浅绿色
    } else if (value >= 0.2) {
      return '#FFCC00'; // 黄色
    } else if (value >= 0.15) {
      return '#FF9500'; // 橙色
    } else {
      return '#FF3B30'; // 红色
    }
  }
}

// 导出单例
export const stablecoinService = new StablecoinService();
export default StablecoinService;
