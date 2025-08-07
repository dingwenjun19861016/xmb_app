import { DataService } from './DataService';

// BTCD指数数据接口
export interface BTCDIndexData {
  btcd: string;
  timestamp?: string;
}

class BTCDService extends DataService<BTCDIndexData> {
  protected dataType = 'BTCD';
  protected serviceName = 'BTCDService';

  /**
   * 获取BTCD指数数据
   * @returns Promise<BTCDIndexData | null>
   */
  async getBTCDIndex(): Promise<BTCDIndexData | null> {
    return this.getLatestData();
  }

  /**
   * 获取BTCD指数历史数据
   * @param limit 获取数据的数量限制，默认30条
   * @returns Promise<BTCDIndexData[] | null>
   */
  async getBTCDIndexHistory(limit: number = 30): Promise<BTCDIndexData[] | null> {
    return this.getData(limit);
  }

  /**
   * 获取BTCD指数的数字值
   * @returns Promise<number | null>
   */
  async getBTCDIndexValue(): Promise<number | null> {
    try {
      const btcdData = await this.getBTCDIndex();
      return btcdData ? this.parseNumericField(btcdData, 'btcd', 'float') : null;
    } catch (error) {
      console.error('❌ BTCDService: Failed to get BTCD index value:', error);
      return null;
    }
  }

  /**
   * 根据BTCD指数数值获取对应的颜色
   * @param value BTCD指数数值
   * @returns 对应的颜色值
   */
  static getBTCDIndexColor(value: number): string {
    const colorRanges = [
      { min: 0, max: 40, color: '#34C759' },   // 低支配度 - 绿色
      { min: 40, max: 50, color: '#FFCC00' },  // 平衡状态 - 黄色
      { min: 50, max: 70, color: '#FF9500' },  // 中等支配度 - 橙色
      { min: 70, color: '#FF3B30' }            // 高支配度 - 红色
    ];
    
    return DataService.getColorByRanges(value, colorRanges);
  }

  /**
   * 根据BTCD指数数值获取对应的描述
   * @param value BTCD指数数值
   * @returns 描述文本
   */
  static getBTCDIndexDescription(value: number): string {
    if (value >= 70) {
      return '比特币高度支配';
    } else if (value >= 50) {
      return '比特币中等支配';
    } else if (value >= 40) {
      return '市场相对平衡';
    } else {
      return '山寨币相对强势';
    }
  }
}

// 导出单例
export const btcdService = new BTCDService();
export default BTCDService;
