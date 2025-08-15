import apiService from '../APIService';

export interface XAUUSDData {
  date: string;
  xauusd: string; // 黄金现货价格（美元）
  timestamp?: string;
}

class XAUUSDService {
  /** 获取当前黄金价格 */
  static async getCurrentXAUUSD(): Promise<XAUUSDData | null> {
    try {
      console.log('🥇 XAUUSDService: Fetching current XAUUSD data...');
      const response = await apiService.call<any>(
        'listData',
        ['', 'XAUUSD', '1', '0', '1', '']
      );
      let dataArray: any[] = [];
      if (Array.isArray(response)) dataArray = response; else if (response?.result && Array.isArray(response.result)) dataArray = response.result;
      if (dataArray.length > 0) return this.parseItem(dataArray[0]);
      console.warn('🥇 XAUUSDService: No XAUUSD data found');
      return null;
    } catch (e) {
      console.error('🥇 XAUUSDService: Error fetching current XAUUSD:', e);
      return null;
    }
  }

  /** 获取黄金历史价格 */
  static async getHistoricalXAUUSD(days: number = 30): Promise<XAUUSDData[]> {
    try {
      console.log(`🥇 XAUUSDService: Fetching historical XAUUSD for ${days} days...`);
      const response = await apiService.call<any>(
        'listData',
        ['', 'XAUUSD', '1', '0', '1000', '']
      );
      let dataArray: any[] = [];
      if (Array.isArray(response)) dataArray = response; else if (response?.result && Array.isArray(response.result)) dataArray = response.result;
      if (!dataArray.length) return [];
      const parsed = dataArray.map(it => this.parseItem(it)).filter(Boolean) as XAUUSDData[];
      return parsed.sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, days);
    } catch (e) {
      console.error('🥇 XAUUSDService: Error fetching historical XAUUSD:', e);
      return [];
    }
  }

  /** 解析单条数据 */
  private static parseItem(item: any): XAUUSDData | null {
    try {
      if (!item || !item.data) return null;
      const parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        const obj = parsedData[0];
        if (obj && (obj.xauusd !== undefined && obj.xauusd !== null)) {
          return {
            date: item.date || item.createdAt || new Date().toISOString().split('T')[0],
            xauusd: String(obj.xauusd),
            timestamp: item.updatedAt || item.createdAt,
          };
        }
      }
      console.warn('🥇 XAUUSDService: Invalid XAUUSD data format:', item);
      return null;
    } catch (e) {
      console.error('🥇 XAUUSDService: Error parsing XAUUSD item:', e);
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
      console.error('🥇 XAUUSDService: parseValue error:', e);
      return 0;
    }
  }

  /** 格式化 */
  static formatValue(value: number): string {
    return value === 0 ? '0.00' : value.toFixed(2);
  }
}

export const xauusdService = new XAUUSDService();
export default XAUUSDService;
