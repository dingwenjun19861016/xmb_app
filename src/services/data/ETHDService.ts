import { DataService } from './DataService';

// ETHD指数数据接口
export interface ETHDIndexData {
  ethd: string;
  timestamp?: string;
  date?: string;
}

class ETHDService extends DataService<ETHDIndexData> {
  protected dataType = 'ETHD';
  protected serviceName = 'ETHDService';

  /**
   * 获取ETHD指数数据
   * @returns Promise<ETHDIndexData | null>
   */
  async getETHDIndex(): Promise<ETHDIndexData | null> {
    return this.getLatestData();
  }

  /**
   * 获取ETHD指数历史数据
   * @param limit 获取数据的数量限制，默认30条
   * @returns Promise<ETHDIndexData[] | null>
   */
  async getETHDIndexHistory(limit: number = 30): Promise<ETHDIndexData[] | null> {
    return this.getData(limit);
  }

  /**
   * 获取ETHD指数的数字值
   * @returns Promise<number | null>
   */
  async getETHDIndexValue(): Promise<number | null> {
    try {
      const ethdData = await this.getETHDIndex();
      return ethdData ? this.parseNumericField(ethdData, 'ethd', 'float') : null;
    } catch (error) {
      console.error('❌ ETHDService: Failed to get ETHD index value:', error);
      return null;
    }
  }

  /**
   * 根据ETHD指数数值获取对应的颜色
   * @param value ETHD指数数值
   * @returns 对应的颜色值
   */
  static getETHDIndexColor(value: number): string {
    const colorRanges = [
      { min: 0, max: 8, color: '#34C759' },    // 低支配度 - 绿色
      { min: 8, max: 15, color: '#FFCC00' },   // 平衡状态 - 黄色
      { min: 15, max: 25, color: '#FF9500' },  // 中等支配度 - 橙色
      { min: 25, color: '#FF3B30' }            // 高支配度 - 红色
    ];
    
    return DataService.getColorByRanges(value, colorRanges);
  }

  /**
   * 根据ETHD指数数值获取对应的描述
   * @param value ETHD指数数值
   * @returns 描述文本
   */
  static getETHDIndexDescription(value: number): string {
    if (value >= 25) {
      return '以太坊高度支配';
    } else if (value >= 15) {
      return '以太坊中等支配';
    } else if (value >= 8) {
      return '市场相对平衡';
    } else {
      return '其他代币相对强势';
    }
  }
}

// 导出单例
export const ethdService = new ETHDService();
export default ETHDService;
