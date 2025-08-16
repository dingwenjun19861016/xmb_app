import apiService from '../APIService';

export interface USDCNHData {
  date: string;
  usdcnh: string; // 离岸人民币汇率（美元/离岸人民币）
  timestamp?: string;
}

class USDCNHService {
  /** 获取当前离岸人民币汇率 */
  static async getCurrentUSDCNH(): Promise<USDCNHData | null> {
    try {
      console.log('💱 USDCNHService: Fetching current USDCNH data...');
      const response = await apiService.call<any>(
        'listData',
        ['', 'USDCNH', '1', '0', '1', '']
      );
      let dataArray: any[] = [];
      if (Array.isArray(response)) dataArray = response; else if (response?.result && Array.isArray(response.result)) dataArray = response.result;
      if (dataArray.length > 0) return this.parseItem(dataArray[0]);
      console.warn('💱 USDCNHService: No USDCNH data found');
      return null;
    } catch (e) {
      console.error('💱 USDCNHService: Error fetching current USDCNH:', e);
      return null;
    }
  }

  /** 获取历史离岸人民币汇率 */
  static async getHistoricalUSDCNH(days: number = 30): Promise<USDCNHData[]> {
    try {
      console.log(`💱 USDCNHService: Fetching historical USDCNH for ${days} days...`);
      const response = await apiService.call<any>(
        'listData',
        ['', 'USDCNH', '1', '0', '1000', '']
      );
      let dataArray: any[] = [];
      if (Array.isArray(response)) dataArray = response; else if (response?.result && Array.isArray(response.result)) dataArray = response.result;
      if (!dataArray.length) return [];
      const parsed = dataArray.map(it => this.parseItem(it)).filter(Boolean) as USDCNHData[];
      return parsed.sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, days);
    } catch (e) {
      console.error('💱 USDCNHService: Error fetching historical USDCNH:', e);
      return [];
    }
  }

  /** 解析单条数据 */
  private static parseItem(item: any): USDCNHData | null {
    try {
      if (!item || !item.data) return null;
      const parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        const obj = parsedData[0];
        if (obj && (obj.usdcnh !== undefined && obj.usdcnh !== null)) {
          return {
            date: item.date || item.createdAt || new Date().toISOString().split('T')[0],
            usdcnh: String(obj.usdcnh),
            timestamp: item.updatedAt || item.createdAt,
          };
        }
      }
      console.warn('💱 USDCNHService: Invalid USDCNH data format:', item);
      return null;
    } catch (e) {
      console.error('💱 USDCNHService: Error parsing USDCNH item:', e);
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
      console.error('💱 USDCNHService: parseValue error:', e);
      return 0;
    }
  }

  /** 格式化 */
  static formatValue(value: number): string {
    return value === 0 ? '0.0000' : value.toFixed(4); // 汇率保留4位
  }
}

export const usdcnhService = new USDCNHService();
export default USDCNHService;
