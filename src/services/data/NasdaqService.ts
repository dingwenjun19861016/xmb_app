import apiService from '../APIService';

export interface NasdaqData {
  date: string;
  ixic: string;
  timestamp?: string;
}

class NasdaqService {
  
  /**
   * 获取当前纳斯达克指数数据
   */
  static async getCurrentNasdaq(): Promise<NasdaqData | null> {
    try {
      console.log('📈 NasdaqService: Fetching current Nasdaq data...');
      
      const response = await apiService.call<any>(
        'listData', 
        ['', 'IXIC', '1', '0', '1', '']
      );
      
      console.log('📈 NasdaqService: API response:', response);
      console.log('📈 NasdaqService: Response type:', typeof response);
      
      // 处理响应可能是数组或对象的情况
      let dataArray = [];
      if (Array.isArray(response)) {
        dataArray = response;
        console.log('📈 NasdaqService: Response is array');
      } else if (response?.result && Array.isArray(response.result)) {
        dataArray = response.result;
        console.log('📈 NasdaqService: Using response.result array');
      }
    
      
      if (dataArray && dataArray.length > 0) {
        console.log('📈 NasdaqService: Processing', dataArray.length, 'items');
        const latestData = dataArray[0];
        console.log('📈 NasdaqService: Latest data item:', latestData);
        
        const parsed = this.parseNasdaqData(latestData);
        console.log('📈 NasdaqService: Parsed result:', parsed);
        return parsed;
      }
      
      console.warn('📈 NasdaqService: No Nasdaq data found in response');
      return null;
    } catch (error) {
      console.error('📈 NasdaqService: Error fetching current Nasdaq:', error);
      return null;
    }
  }

  /**
   * 获取历史纳斯达克指数数据
   */
  static async getHistoricalNasdaq(days: number = 30): Promise<NasdaqData[]> {
    try {
      console.log(`📈 NasdaqService: Fetching historical Nasdaq data for ${days} days...`);
      
      const response = await apiService.call<any>(
        'listData', 
        ['', 'IXIC', '1', '0', '1000', '']
      );
      
      console.log('📈 NasdaqService: Historical API response:', response);
      
      // 处理响应可能是数组或对象的情况
      let dataArray = [];
      if (Array.isArray(response)) {
        dataArray = response;
      } else if (response?.result && Array.isArray(response.result)) {
        dataArray = response.result;
      }

      if (dataArray && dataArray.length > 0) {
        const historicalData = dataArray
          .map(item => this.parseNasdaqData(item))
          .filter(item => item !== null) as NasdaqData[];
        
        // 根据日期排序并限制数量
        const sortedData = historicalData
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, days);
        
        console.log(`📈 NasdaqService: Processed ${sortedData.length} historical Nasdaq records`);
        return sortedData;
      }
      
      console.warn('📈 NasdaqService: No historical Nasdaq data found');
      return [];
    } catch (error) {
      console.error('📈 NasdaqService: Error fetching historical Nasdaq:', error);
      return [];
    }
  }

  /**
   * 解析Nasdaq数据
   */
  private static parseNasdaqData(item: any): NasdaqData | null {
    try {
      console.log('🔍 NasdaqService: Parsing Nasdaq data item:', item);
      
      if (!item || !item.data) {
        console.warn('📈 NasdaqService: Invalid data item:', item);
        return null;
      }

      let parsedData;
      if (typeof item.data === 'string') {
        console.log('🔍 NasdaqService: Parsing string data:', item.data);
        parsedData = JSON.parse(item.data);
      } else {
        console.log('🔍 NasdaqService: Using object data:', item.data);
        parsedData = item.data;
      }

      console.log('🔍 NasdaqService: Parsed data:', parsedData);

      if (Array.isArray(parsedData) && parsedData.length > 0) {
        const nasdaqData = parsedData[0];
        console.log('🔍 NasdaqService: Nasdaq data from array:', nasdaqData);
        
        if (nasdaqData && nasdaqData.ixic) {
          const result = {
            date: item.date || item.createdAt || new Date().toISOString().split('T')[0],
            ixic: nasdaqData.ixic,
            timestamp: item.createdAt || item.updatedAt
          };
          console.log('🔍 NasdaqService: Returning result:', result);
          return result;
        }
      }

      console.warn('📈 NasdaqService: Invalid Nasdaq data format:', parsedData);
      return null;
    } catch (error) {
      console.error('📈 NasdaqService: Error parsing Nasdaq data:', error);
      return null;
    }
  }

  /**
   * 解析Nasdaq数值
   */
  static parseNasdaqValue(nasdaqString: string | number): number {
    try {
      if (typeof nasdaqString === 'number') {
        return nasdaqString;
      }
      
      if (typeof nasdaqString === 'string') {
        // 移除可能的非数字字符，保留小数点
        const cleanString = nasdaqString.replace(/[^0-9.-]/g, '');
        const value = parseFloat(cleanString);
        return isNaN(value) ? 0 : value;
      }
      
      return 0;
    } catch (error) {
      console.error('📈 NasdaqService: Error parsing Nasdaq value:', error);
      return 0;
    }
  }

  /**
   * 格式化Nasdaq值显示
   */
  static formatNasdaqValue(value: number): string {
    if (value === 0) return '0.00';
    
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * 获取Nasdaq指数描述
   */
  static getNasdaqDescription(value: number): string {
    if (value >= 20000) return '历史高位';
    if (value >= 15000) return '高位';
    if (value >= 12000) return '正常';
    if (value >= 8000) return '偏低';
    return '低位';
  }

  /**
   * 获取Nasdaq指数颜色
   */
  static getNasdaqColor(value: number): string {
    if (value >= 20000) return '#FF3B30'; // 红色 - 历史高位
    if (value >= 15000) return '#FF9500'; // 橙色 - 高位
    if (value >= 12000) return '#007AFF';  // 蓝色 - 正常
    if (value >= 8000) return '#34C759';  // 绿色 - 偏低
    return '#8E8E93'; // 灰色 - 低位
  }
}

// 创建单例实例
export const nasdaqService = new NasdaqService();
export default NasdaqService;
