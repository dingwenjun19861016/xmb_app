import apiService from '../APIService';

export interface DXYData {
  date: string;
  dxy: string;
  timestamp?: string;
}

class DXYService {
  
  /**
   * 获取当前美元指数数据
   */
  static async getCurrentDXY(): Promise<DXYData | null> {
    try {
      console.log('🏛️ DXYService: Fetching current DXY data...');
      
      const response = await apiService.call<any>(
        'listData', 
        ['', 'DXY', '1', '0', '1000', '']
      );
      
      console.log('🏛️ DXYService: API response:', response);
      console.log('🏛️ DXYService: Response type:', typeof response);
      
      // 处理响应可能是数组或对象的情况
      let dataArray = [];
      if (Array.isArray(response)) {
        dataArray = response;
        console.log('🏛️ DXYService: Response is array');
      } else if (response?.result && Array.isArray(response.result)) {
        dataArray = response.result;
        console.log('🏛️ DXYService: Using response.result array');
      }
    
      
      if (dataArray && dataArray.length > 0) {
        console.log('🏛️ DXYService: Processing', dataArray.length, 'items');
        const latestData = dataArray[0];
        console.log('🏛️ DXYService: Latest data item:', latestData);
        
        const parsed = this.parseDXYData(latestData);
        console.log('🏛️ DXYService: Parsed result:', parsed);
        return parsed;
      }
      
      console.warn('🏛️ DXYService: No DXY data found in response');
      return null;
    } catch (error) {
      console.error('🏛️ DXYService: Error fetching current DXY:', error);
      return null;
    }
  }

  /**
   * 获取历史美元指数数据
   */
  static async getHistoricalDXY(days: number = 30): Promise<DXYData[]> {
    try {
      console.log(`🏛️ DXYService: Fetching historical DXY data for ${days} days...`);
      
      const response = await apiService.call<any>(
        'listData', 
        ['', 'DXY', '1', '0', '1000', '']
      );
      
      console.log('🏛️ DXYService: Historical API response:', response);
      
      // 处理响应可能是数组或对象的情况
      let dataArray = [];
      if (Array.isArray(response)) {
        dataArray = response;
      } else if (response?.result && Array.isArray(response.result)) {
        dataArray = response.result;
      }

      if (dataArray && dataArray.length > 0) {
        const historicalData = dataArray
          .map(item => this.parseDXYData(item))
          .filter(item => item !== null) as DXYData[];
        
        // 根据日期排序并限制数量
        const sortedData = historicalData
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, days);
        
        console.log(`🏛️ DXYService: Processed ${sortedData.length} historical DXY records`);
        return sortedData;
      }
      
      console.warn('🏛️ DXYService: No historical DXY data found');
      return [];
    } catch (error) {
      console.error('🏛️ DXYService: Error fetching historical DXY:', error);
      return [];
    }
  }

  /**
   * 解析DXY数据
   */
  private static parseDXYData(item: any): DXYData | null {
    try {
      console.log('🔍 DXYService: Parsing DXY data item:', item);
      
      if (!item || !item.data) {
        console.warn('🏛️ DXYService: Invalid data item:', item);
        return null;
      }

      let parsedData;
      if (typeof item.data === 'string') {
        console.log('🔍 DXYService: Parsing string data:', item.data);
        parsedData = JSON.parse(item.data);
      } else {
        console.log('🔍 DXYService: Using object data:', item.data);
        parsedData = item.data;
      }

      console.log('🔍 DXYService: Parsed data:', parsedData);

      if (Array.isArray(parsedData) && parsedData.length > 0) {
        const dxyData = parsedData[0];
        console.log('🔍 DXYService: DXY data from array:', dxyData);
        
        if (dxyData && dxyData.dxy) {
          const result = {
            date: item.date || item.createdAt || new Date().toISOString().split('T')[0],
            dxy: dxyData.dxy,
            timestamp: item.createdAt || item.updatedAt
          };
          console.log('🔍 DXYService: Returning result:', result);
          return result;
        }
      }

      console.warn('🏛️ DXYService: Invalid DXY data format:', parsedData);
      return null;
    } catch (error) {
      console.error('🏛️ DXYService: Error parsing DXY data:', error);
      return null;
    }
  }

  /**
   * 解析DXY数值
   */
  static parseDXYValue(dxyString: string | number): number {
    try {
      if (typeof dxyString === 'number') {
        return dxyString;
      }
      
      if (typeof dxyString === 'string') {
        // 移除可能的非数字字符，保留小数点
        const cleanString = dxyString.replace(/[^0-9.-]/g, '');
        const value = parseFloat(cleanString);
        return isNaN(value) ? 0 : value;
      }
      
      return 0;
    } catch (error) {
      console.error('🏛️ DXYService: Error parsing DXY value:', error);
      return 0;
    }
  }

  /**
   * 格式化DXY值显示
   */
  static formatDXYValue(value: number): string {
    if (value === 0) return '0.00';
    
    return value.toFixed(2);
  }

  /**
   * 获取DXY指数描述
   */
  static getDXYDescription(value: number): string {
    if (value >= 105) return '强势';
    if (value >= 100) return '偏强';
    if (value >= 95) return '中性';
    if (value >= 90) return '偏弱';
    return '弱势';
  }

  /**
   * 获取DXY指数颜色
   */
  static getDXYColor(value: number): string {
    if (value >= 105) return '#FF3B30'; // 红色 - 强势
    if (value >= 100) return '#FF9500'; // 橙色 - 偏强
    if (value >= 95) return '#007AFF';  // 蓝色 - 中性
    if (value >= 90) return '#34C759';  // 绿色 - 偏弱
    return '#8E8E93'; // 灰色 - 弱势
  }
}

// 创建单例实例
export const dxyService = new DXYService();
export default DXYService;
