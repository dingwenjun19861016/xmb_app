import apiService from '../APIService';

export interface DJIData {
  date: string;
  dji: string; // 道琼斯指数数值
  timestamp?: string;
}

class DJIService {
  /** 获取当前道琼斯指数 */
  static async getCurrentDJI(): Promise<DJIData | null> {
    try {
      console.log('📈 DJIService: Fetching current DJI data...');
      const response = await apiService.call<any>(
        'listData',
        ['', 'DJI', '1', '0', '1', ''] // 取最新1条
      );

      let dataArray: any[] = [];
      if (Array.isArray(response)) {
        dataArray = response;
      } else if (response?.result && Array.isArray(response.result)) {
        dataArray = response.result;
      }

      if (dataArray.length > 0) {
        return this.parseItem(dataArray[0]);
      }
      console.warn('📈 DJIService: No DJI data found');
      return null;
    } catch (e) {
      console.error('📈 DJIService: Error fetching current DJI:', e);
      return null;
    }
  }

  /** 获取道琼斯历史指数数据 */
  static async getHistoricalDJI(days: number = 30): Promise<DJIData[]> {
    try {
      console.log(`📈 DJIService: Fetching historical DJI for ${days} days...`);
      const response = await apiService.call<any>(
        'listData',
        ['', 'DJI', '1', '0', '1000', ''] // 拉取较多再裁剪
      );

      let dataArray: any[] = [];
      if (Array.isArray(response)) {
        dataArray = response;
      } else if (response?.result && Array.isArray(response.result)) {
        dataArray = response.result;
      }
      if (!dataArray.length) return [];

      const parsed = dataArray.map(it => this.parseItem(it)).filter(Boolean) as DJIData[];
      const sorted = parsed
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, days);
      return sorted;
    } catch (e) {
      console.error('📈 DJIService: Error fetching historical DJI:', e);
      return [];
    }
  }

  /** 解析单条数据 */
  private static parseItem(item: any): DJIData | null {
    try {
      if (!item || !item.data) return null;
      const parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        const obj = parsedData[0];
        if (obj && (obj.dji !== undefined && obj.dji !== null)) {
          return {
            date: item.date || item.createdAt || new Date().toISOString().split('T')[0],
            dji: String(obj.dji),
            timestamp: item.updatedAt || item.createdAt,
          };
        }
      }
      console.warn('📈 DJIService: Invalid DJI data format:', item);
      return null;
    } catch (e) {
      console.error('📈 DJIService: Error parsing DJI item:', e);
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
      console.error('📈 DJIService: parseValue error:', e);
      return 0;
    }
  }

  /** 格式化 */
  static formatValue(value: number): string {
    return value === 0 ? '0.00' : value.toFixed(2);
  }
}

export const djiService = new DJIService();
export default DJIService;
