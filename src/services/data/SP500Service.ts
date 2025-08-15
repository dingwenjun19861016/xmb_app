import apiService from '../APIService';

export interface SP500Data {
  date: string;
  inx: string; // 标普500指数数值字符串
  timestamp?: string;
}

class SP500Service {
  /** 获取当前标普500指数数据 */
  static async getCurrentSP500(): Promise<SP500Data | null> {
    try {
      console.log('📈 SP500Service: Fetching current INX data...');
      const response = await apiService.call<any>(
        'listData',
        ['', 'INX', '1', '0', '1', ''] // 当前值仅取1条
      );

      let dataArray: any[] = [];
      if (Array.isArray(response)) {
        dataArray = response;
      } else if (response?.result && Array.isArray(response.result)) {
        dataArray = response.result;
      }

      if (dataArray.length > 0) {
        const latest = dataArray[0];
        return this.parseItem(latest);
      }

      console.warn('📈 SP500Service: No INX data found');
      return null;
    } catch (e) {
      console.error('📈 SP500Service: Error fetching current INX:', e);
      return null;
    }
  }

  /** 获取历史标普500指数数据 */
  static async getHistoricalSP500(days: number = 30): Promise<SP500Data[]> {
    try {
      console.log(`📈 SP500Service: Fetching historical INX for ${days} days...`);
      const response = await apiService.call<any>(
        'listData',
        ['', 'INX', '1', '0', '1000', ''] // 拉取较多再本地裁剪
      );

      let dataArray: any[] = [];
      if (Array.isArray(response)) {
        dataArray = response;
      } else if (response?.result && Array.isArray(response.result)) {
        dataArray = response.result;
      }

      if (!dataArray.length) return [];

      const parsed = dataArray
        .map((it) => this.parseItem(it))
        .filter(Boolean) as SP500Data[];

      // 按日期降序，截取天数
      const sorted = parsed
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, days);

      return sorted;
    } catch (e) {
      console.error('📈 SP500Service: Error fetching historical INX:', e);
      return [];
    }
  }

  /** 解析单条数据项 */
  private static parseItem(item: any): SP500Data | null {
    try {
      if (!item || !item.data) return null;

      const parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        const inxData = parsedData[0];
        if (inxData && (inxData.inx !== undefined && inxData.inx !== null)) {
          return {
            date: item.date || item.createdAt || new Date().toISOString().split('T')[0],
            inx: String(inxData.inx),
            timestamp: item.updatedAt || item.createdAt,
          };
        }
      }
      console.warn('📈 SP500Service: Invalid INX data format:', item);
      return null;
    } catch (e) {
      console.error('📈 SP500Service: Error parsing INX item:', e);
      return null;
    }
  }

  /** 解析指数数值 */
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
      console.error('📈 SP500Service: parseValue error:', e);
      return 0;
    }
  }

  /** 数值格式化 */
  static formatValue(value: number): string {
    return value === 0 ? '0.00' : value.toFixed(2);
  }
}

export const sp500Service = new SP500Service();
export default SP500Service;
