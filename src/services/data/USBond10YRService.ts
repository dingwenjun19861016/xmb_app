import apiService from '../APIService';

export interface USBond10YRData {
  date: string;
  us10yrbond: string;
  timestamp?: string;
}

class USBond10YRService {
  
  /**
   * 获取当前美国十年期国债收益率数据
   */
  static async getCurrentUSBond10YR(): Promise<USBond10YRData | null> {
    try {
      console.log('🏦 USBond10YRService: Fetching current US 10YR Bond data...');
      
      const response = await apiService.call<any>(
        'listData', 
        ['', 'US_BOND_10YR', '1', '0', '1000', '']
      );
      
      console.log('🏦 USBond10YRService: API response:', response);
      console.log('🏦 USBond10YRService: Response type:', typeof response);
      
      // 处理响应可能是数组或对象的情况
      let dataArray = [];
      if (Array.isArray(response)) {
        dataArray = response;
        console.log('🏦 USBond10YRService: Response is array');
      } else if (response?.result && Array.isArray(response.result)) {
        dataArray = response.result;
        console.log('🏦 USBond10YRService: Using response.result array');
      }
      
 
      if (dataArray && dataArray.length > 0) {
        console.log('🏦 USBond10YRService: Processing', dataArray.length, 'items');
        const latestData = dataArray[0];
        console.log('🏦 USBond10YRService: Latest data item:', latestData);
        
        const parsed = this.parseUSBond10YRData(latestData);
        console.log('🏦 USBond10YRService: Parsed result:', parsed);
        return parsed;
      }
      
      console.warn('🏦 USBond10YRService: No US 10YR Bond data found in response');
      return null;
    } catch (error) {
      console.error('🏦 USBond10YRService: Error fetching current US 10YR Bond:', error);
      return null;
    }
  }

  /**
   * 获取历史美国十年期国债收益率数据
   */
  static async getHistoricalUSBond10YR(days: number = 30): Promise<USBond10YRData[]> {
    try {
      console.log(`🏦 USBond10YRService: Fetching historical US 10YR Bond data for ${days} days...`);
      
      const response = await apiService.call<any>(
        'listData', 
        ['', 'US_BOND_10YR', '1', '0', '1000', '']
      );
      
      console.log('🏦 USBond10YRService: Historical API response:', response);
      
      // 处理响应可能是数组或对象的情况
      let dataArray = [];
      if (Array.isArray(response)) {
        dataArray = response;
      } else if (response?.result && Array.isArray(response.result)) {
        dataArray = response.result;
      }
      

      if (dataArray && dataArray.length > 0) {
        const historicalData = dataArray
          .map(item => this.parseUSBond10YRData(item))
          .filter(item => item !== null) as USBond10YRData[];
        
        // 根据日期排序并限制数量
        const sortedData = historicalData
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, days);
        
        console.log(`🏦 USBond10YRService: Processed ${sortedData.length} historical US 10YR Bond records`);
        return sortedData;
      }
      
      console.warn('🏦 USBond10YRService: No historical US 10YR Bond data found');
      return [];
    } catch (error) {
      console.error('🏦 USBond10YRService: Error fetching historical US 10YR Bond:', error);
      return [];
    }
  }

  /**
   * 解析美国十年期国债收益率数据
   */
  private static parseUSBond10YRData(item: any): USBond10YRData | null {
    try {
      console.log('🔍 USBond10YRService: Parsing US 10YR Bond data item:', item);
      
      if (!item || !item.data) {
        console.warn('🏦 USBond10YRService: Invalid data item:', item);
        return null;
      }

      let parsedData;
      if (typeof item.data === 'string') {
        console.log('🔍 USBond10YRService: Parsing string data:', item.data);
        parsedData = JSON.parse(item.data);
      } else {
        console.log('🔍 USBond10YRService: Using object data:', item.data);
        parsedData = item.data;
      }

      console.log('🔍 USBond10YRService: Parsed data:', parsedData);

      if (Array.isArray(parsedData) && parsedData.length > 0) {
        const bondData = parsedData[0];
        console.log('🔍 USBond10YRService: Bond data from array:', bondData);
        
        if (bondData && bondData.us10yrbond) {
          const result = {
            date: item.date || item.createdAt || new Date().toISOString().split('T')[0],
            us10yrbond: bondData.us10yrbond,
            timestamp: item.createdAt || item.updatedAt
          };
          console.log('🔍 USBond10YRService: Returning result:', result);
          return result;
        }
      }

      console.warn('🏦 USBond10YRService: Invalid US 10YR Bond data format:', parsedData);
      return null;
    } catch (error) {
      console.error('🏦 USBond10YRService: Error parsing US 10YR Bond data:', error);
      return null;
    }
  }

  /**
   * 解析美国十年期国债收益率数值
   */
  static parseUSBond10YRValue(bondString: string | number): number {
    try {
      if (typeof bondString === 'number') {
        return bondString;
      }
      
      if (typeof bondString === 'string') {
        // 移除可能的非数字字符，保留小数点
        const cleanString = bondString.replace(/[^0-9.-]/g, '');
        const value = parseFloat(cleanString);
        return isNaN(value) ? 0 : value;
      }
      
      return 0;
    } catch (error) {
      console.error('🏦 USBond10YRService: Error parsing US 10YR Bond value:', error);
      return 0;
    }
  }

  /**
   * 格式化美国十年期国债收益率值显示
   */
  static formatUSBond10YRValue(value: number): string {
    if (value === 0) return '0.00%';
    
    return value.toFixed(3) + '%';
  }

  /**
   * 获取美国十年期国债收益率描述
   */
  static getUSBond10YRDescription(value: number): string {
    if (value >= 5.0) return '极高';
    if (value >= 4.5) return '高位';
    if (value >= 3.5) return '偏高';
    if (value >= 2.5) return '中性';
    if (value >= 1.5) return '偏低';
    return '极低';
  }

  /**
   * 获取美国十年期国债收益率颜色
   */
  static getUSBond10YRColor(value: number): string {
    if (value >= 5.0) return '#FF3B30'; // 红色 - 极高
    if (value >= 4.5) return '#FF9500'; // 橙色 - 高位
    if (value >= 3.5) return '#FFCC00'; // 黄色 - 偏高
    if (value >= 2.5) return '#007AFF'; // 蓝色 - 中性
    if (value >= 1.5) return '#34C759'; // 绿色 - 偏低
    return '#8E8E93'; // 灰色 - 极低
  }

  /**
   * 获取投资建议
   */
  static getInvestmentAdvice(value: number): string {
    if (value >= 5.0) return '收益率极高，债券价格承压，可能对股市和股票构成挑战';
    if (value >= 4.5) return '收益率处于高位，建议关注利率敏感性资产的风险';
    if (value >= 3.5) return '收益率偏高，可能影响风险资产表现，需密切观察';
    if (value >= 2.5) return '收益率处于中性区间，对市场影响相对平衡';
    if (value >= 1.5) return '收益率偏低，通常有利于风险资产和成长性投资';
    return '收益率极低，可能推动资金流向风险资产寻求更高收益';
  }
}

// 创建单例实例
export const usBond10YRService = new USBond10YRService();
export default USBond10YRService;
