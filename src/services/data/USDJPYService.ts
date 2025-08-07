import apiService from '../APIService';

export interface USDJPYData {
  date: string;
  usdjpy: string;
  timestamp?: string;
}

class USDJPYService {
  
  /**
   * 获取当前美元日元汇率数据
   */
  static async getCurrentUSDJPY(): Promise<USDJPYData | null> {
    try {
      console.log('💴 USDJPYService: Fetching current USDJPY data...');
      
      const response = await apiService.call<any>(
        'listData', 
        ['', 'USDJPY', '1', '0', '1000', '']
      );
      
      console.log('💴 USDJPYService: API response:', response);
      console.log('💴 USDJPYService: Response type:', typeof response);
      
      // 处理响应可能是数组或对象的情况
      let dataArray = [];
      if (Array.isArray(response)) {
        dataArray = response;
        console.log('💴 USDJPYService: Response is array');
      } else if (response?.result && Array.isArray(response.result)) {
        dataArray = response.result;
        console.log('💴 USDJPYService: Using response.result array');
      }
      
  
      if (dataArray && dataArray.length > 0) {
        console.log('💴 USDJPYService: Processing', dataArray.length, 'items');
        const latestData = dataArray[0];
        console.log('💴 USDJPYService: Latest data item:', latestData);
        
        const parsed = this.parseUSDJPYData(latestData);
        console.log('💴 USDJPYService: Parsed result:', parsed);
        return parsed;
      }
      
      console.warn('💴 USDJPYService: No USDJPY data found in response');
      return null;
    } catch (error) {
      console.error('💴 USDJPYService: Error fetching current USDJPY:', error);
      return null;
    }
  }

  /**
   * 获取历史美元日元汇率数据
   */
  static async getHistoricalUSDJPY(days: number = 30): Promise<USDJPYData[]> {
    try {
      console.log(`💴 USDJPYService: Fetching historical USDJPY data for ${days} days...`);
      
      const response = await apiService.call<any>(
        'listData', 
        ['', 'USDJPY', '1', '0', '1000', '']
      );
      
      console.log('💴 USDJPYService: Historical API response:', response);
      
      // 处理响应可能是数组或对象的情况
      let dataArray = [];
      if (Array.isArray(response)) {
        dataArray = response;
      } else if (response?.result && Array.isArray(response.result)) {
        dataArray = response.result;
      }
      

      if (dataArray && dataArray.length > 0) {
        const historicalData = dataArray
          .map(item => this.parseUSDJPYData(item))
          .filter(item => item !== null) as USDJPYData[];
        
        // 根据日期排序并限制数量
        const sortedData = historicalData
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, days);
        
        console.log(`💴 USDJPYService: Processed ${sortedData.length} historical USDJPY records`);
        return sortedData;
      }
      
      console.warn('💴 USDJPYService: No historical USDJPY data found');
      return [];
    } catch (error) {
      console.error('💴 USDJPYService: Error fetching historical USDJPY:', error);
      return [];
    }
  }

  /**
   * 解析USDJPY数据
   */
  private static parseUSDJPYData(item: any): USDJPYData | null {
    try {
      console.log('🔍 USDJPYService: Parsing USDJPY data item:', item);
      
      if (!item || !item.data) {
        console.warn('💴 USDJPYService: Invalid data item:', item);
        return null;
      }

      let parsedData;
      if (typeof item.data === 'string') {
        console.log('🔍 USDJPYService: Parsing string data:', item.data);
        parsedData = JSON.parse(item.data);
      } else {
        console.log('🔍 USDJPYService: Using object data:', item.data);
        parsedData = item.data;
      }

      console.log('🔍 USDJPYService: Parsed data:', parsedData);

      if (Array.isArray(parsedData) && parsedData.length > 0) {
        const usdJpyData = parsedData[0];
        console.log('🔍 USDJPYService: USDJPY data from array:', usdJpyData);
        
        if (usdJpyData && usdJpyData.usdjpy) {
          const result = {
            date: item.date || item.createdAt || new Date().toISOString().split('T')[0],
            usdjpy: usdJpyData.usdjpy,
            timestamp: item.createdAt || item.updatedAt
          };
          console.log('🔍 USDJPYService: Returning result:', result);
          return result;
        }
      }

      console.warn('💴 USDJPYService: Invalid USDJPY data format:', parsedData);
      return null;
    } catch (error) {
      console.error('💴 USDJPYService: Error parsing USDJPY data:', error);
      return null;
    }
  }

  /**
   * 解析USDJPY数值
   */
  static parseUSDJPYValue(usdJpyString: string | number): number {
    try {
      if (typeof usdJpyString === 'number') {
        return usdJpyString;
      }
      
      if (typeof usdJpyString === 'string') {
        // 移除可能的非数字字符，保留小数点
        const cleanString = usdJpyString.replace(/[^0-9.-]/g, '');
        const value = parseFloat(cleanString);
        return isNaN(value) ? 0 : value;
      }
      
      return 0;
    } catch (error) {
      console.error('💴 USDJPYService: Error parsing USDJPY value:', error);
      return 0;
    }
  }

  /**
   * 格式化USDJPY值显示
   */
  static formatUSDJPYValue(value: number): string {
    if (value === 0) return '0.00';
    
    return value.toFixed(2);
  }

  /**
   * 获取USDJPY汇率描述
   */
  static getUSDJPYDescription(value: number): string {
    if (value >= 155) return '极高';
    if (value >= 150) return '偏高';
    if (value >= 140) return '正常';
    if (value >= 130) return '偏低';
    return '极低';
  }

  /**
   * 获取USDJPY汇率颜色
   */
  static getUSDJPYColor(value: number): string {
    if (value >= 155) return '#FF3B30'; // 红色 - 极高
    if (value >= 150) return '#FF9500'; // 橙色 - 偏高
    if (value >= 140) return '#007AFF'; // 蓝色 - 正常
    if (value >= 130) return '#34C759'; // 绿色 - 偏低
    return '#8E8E93'; // 灰色 - 极低
  }

  /**
   * 获取汇率趋势分析
   */
  static getTrendAnalysis(value: number): string {
    if (value >= 155) {
      return '日元大幅贬值，美元强势明显，通常伴随着日本央行干预风险。';
    }
    if (value >= 150) {
      return '日元显著贬值，美元相对强势，需关注央行政策动向。';
    }
    if (value >= 140) {
      return '汇率处于正常波动区间，反映两国经济基本面相对平衡。';
    }
    if (value >= 130) {
      return '日元相对强势，美元偏弱，可能受避险情绪或日本经济改善影响。';
    }
    return '日元大幅升值，通常在全球市场动荡时出现，日元作为避险货币受到青睐。';
  }
}

// 创建单例实例
export const usdJpyService = new USDJPYService();
export default USDJPYService;
