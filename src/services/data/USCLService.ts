import apiService from '../APIService';

export interface USCLData {
  date: string;
  uscl: string; // 原油价格（WTI / Brent 取其中一个，接口提供的 uscl 字段）
  timestamp?: string;
}

class USCLService {
  /** 获取当前原油价格 */
  static async getCurrentUSCL(): Promise<USCLData | null> {
    try {
      console.log('🛢️ USCLService: Fetching current USCL data...');
      const response = await apiService.call<any>(
        'listData',
        ['', 'USCL', '1', '0', '1', '']
      );
      let dataArray: any[] = [];
      if (Array.isArray(response)) dataArray = response; else if (response?.result && Array.isArray(response.result)) dataArray = response.result;
      if (dataArray.length > 0) return this.parseItem(dataArray[0]);
      console.warn('🛢️ USCLService: No USCL data found');
      return null;
    } catch (e) {
      console.error('🛢️ USCLService: Error fetching current USCL:', e);
      return null;
    }
  }

  /** 获取原油历史价格 */
  static async getHistoricalUSCL(days: number = 30): Promise<USCLData[]> {
    try {
      console.log(`🛢️ USCLService: Fetching historical USCL for ${days} days...`);
      const response = await apiService.call<any>(
        'listData',
        ['', 'USCL', '1', '0', '1000', '']
      );
      let dataArray: any[] = [];
      if (Array.isArray(response)) dataArray = response; else if (response?.result && Array.isArray(response.result)) dataArray = response.result;
      if (!dataArray.length) return [];
      const parsed = dataArray.map(it => this.parseItem(it)).filter(Boolean) as USCLData[];
      return parsed.sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, days);
    } catch (e) {
      console.error('🛢️ USCLService: Error fetching historical USCL:', e);
      return [];
    }
  }

  /** 解析单条数据 */
  private static parseItem(item: any): USCLData | null {
    try {
      if (!item || !item.data) return null;
      const parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        const obj = parsedData[0];
        if (obj && (obj.uscl !== undefined && obj.uscl !== null)) {
          return {
            date: item.date || item.createdAt || new Date().toISOString().split('T')[0],
            uscl: String(obj.uscl),
            timestamp: item.updatedAt || item.createdAt,
          };
        }
      }
      console.warn('🛢️ USCLService: Invalid USCL data format:', item);
      return null;
    } catch (e) {
      console.error('🛢️ USCLService: Error parsing USCL item:', e);
      return null;
    }
  }

  /** 数值解析 */
  static parseValue(val: string | number): number {
    try {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const clean = val.replace(/[^0-9.-]/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
      }
      return 0;
    } catch (e) {
      console.error('🛢️ USCLService: parseValue error:', e);
      return 0;
    }
  }

  /** 格式化 */
  static formatValue(value: number): string {
    return value === 0 ? '0.00' : value.toFixed(2);
  }
}

export const usclService = new USCLService();
export default USCLService;
