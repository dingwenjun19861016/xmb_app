import { DataService } from './DataService';
import apiService from '../APIService';

// 市值数据接口
export interface MarketCapData {
  mcap: string;
  volume: string;
  timestamp?: string;
  date?: string;
}

class MarketCapService extends DataService<MarketCapData> {
  protected dataType = 'COIN_MARKET_CAP_AND_VOLUME';
  protected serviceName = 'MarketCapService';

  /**
   * 重写获取数据的方法，使用特殊的API参数
   * @param limit 获取数据条数，默认为1
   * @returns Promise<MarketCapData[] | null>
   */
  protected async fetchData(limit: number = 1): Promise<MarketCapData[] | null> {
    try {
      console.log(`🔄 ${this.serviceName}: Fetching market cap data...`);

      // 使用特殊的API参数：method=listData&params[]=&params[]=COIN_MARKET_CAP_AND_VOLUME&params[]=1&params[]=0&params[]=1000&params[]=
      const response = await apiService.call<any>(
        'listData', 
        ['', 'COIN_MARKET_CAP_AND_VOLUME', '1', '0', '1000', '']
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
        const allData: MarketCapData[] = [];
        
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
                const marketData = parsedData[0];
                allData.push({
                  mcap: marketData.mcap || '0',
                  volume: marketData.volume || '0',
                  timestamp: dataItem.createdAt,
                  date: dataItem.date
                });
              }
            } catch (parseError) {
              console.error(`❌ ${this.serviceName}: Failed to parse market cap data:`, parseError);
              console.error('Raw data:', dataItem.data);
            }
          }
        }
        
        if (allData.length > 0) {
          console.log(`✅ ${this.serviceName}: Successfully parsed market cap data:`, allData);
          return allData;
        } else {
          console.warn(`⚠️ ${this.serviceName}: No valid parsed data found`);
          return null;
        }
      } else {
        console.warn(`⚠️ ${this.serviceName}: No market cap data found`);
        return null;
      }
    } catch (error) {
      console.error(`❌ ${this.serviceName}: Failed to fetch market cap data:`, error);
      return null;
    }
  }

  /**
   * 获取当前市值数据
   * @returns Promise<MarketCapData | null>
   */
  async getMarketCapData(): Promise<MarketCapData | null> {
    return this.getLatestData();
  }

  /**
   * 获取市值历史数据
   * @param limit 获取数据的数量限制，默认30条
   * @returns Promise<MarketCapData[] | null>
   */
  async getMarketCapHistory(limit: number = 30): Promise<MarketCapData[] | null> {
    return this.getData(limit);
  }

  /**
   * 解析市值数值（移除T、B等单位，转换为数字）
   * @param mcapString 市值字符串（如"3.27T"）
   * @returns 市值数值（万亿美元）
   */
  static parseMarketCapValue(mcapString: string): number {
    if (!mcapString) return 0;
    
    const cleanValue = mcapString.replace(/[^0-9.]/g, '');
    const numValue = parseFloat(cleanValue);
    
    if (mcapString.includes('T')) {
      return numValue; // 万亿
    } else if (mcapString.includes('B')) {
      return numValue / 1000; // 十亿转万亿
    } else if (mcapString.includes('M')) {
      return numValue / 1000000; // 百万转万亿
    }
    
    return numValue;
  }

  /**
   * 格式化市值显示
   * @param mcapString 市值字符串
   * @returns 格式化后的显示文本
   */
  static formatMarketCap(mcapString: string): string {
    if (!mcapString) return '$0';
    
    // 如果已经有单位，直接返回
    if (mcapString.includes('T') || mcapString.includes('B') || mcapString.includes('M')) {
      return `$${mcapString}`;
    }
    
    const value = parseFloat(mcapString);
    if (isNaN(value)) return '$0';
    
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}T`;
    } else if (value >= 1) {
      return `$${value.toFixed(2)}T`;
    } else {
      return `$${(value * 1000).toFixed(0)}B`;
    }
  }

  /**
   * 格式化交易量显示
   * @param volumeString 交易量字符串
   * @returns 格式化后的显示文本
   */
  static formatVolume(volumeString: string): string {
    if (!volumeString) return '$0';
    
    // 如果已经有单位，直接返回
    if (volumeString.includes('T') || volumeString.includes('B') || volumeString.includes('M')) {
      return `$${volumeString}`;
    }
    
    const value = parseFloat(volumeString);
    if (isNaN(value)) return '$0';
    
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}T`;
    } else if (value >= 1) {
      return `$${value.toFixed(1)}B`;
    } else {
      return `$${(value * 1000).toFixed(0)}M`;
    }
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
}

// 导出单例
export const marketCapService = new MarketCapService();
export default MarketCapService;
