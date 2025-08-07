import { DataService } from './DataService';

// 贪婪指数数据接口
export interface GreedyIndexData {
  greedy: string;
  level: string;
}

class GreedyIndexService extends DataService<GreedyIndexData> {
  protected dataType = 'GREEDY_INDEX';
  protected serviceName = 'GreedyIndexService';

  /**
   * 获取贪婪指数数据
   * @returns Promise<GreedyIndexData | null>
   */
  async getGreedyIndex(): Promise<GreedyIndexData | null> {
    return this.getLatestData();
  }

  /**
   * 获取贪婪指数历史数据
   * @param limit 获取数据条数，默认为7天
   * @returns Promise<GreedyIndexData[] | null>
   */
  async getGreedyIndexHistory(limit: number = 7): Promise<GreedyIndexData[] | null> {
    return this.getData(limit);
  }

  /**
   * 获取贪婪指数的数字值
   * @returns Promise<number | null>
   */
  async getGreedyIndexValue(): Promise<number | null> {
    try {
      const greedyData = await this.getGreedyIndex();
      return greedyData ? this.parseNumericField(greedyData, 'greedy', 'int') : null;
    } catch (error) {
      console.error('❌ GreedyIndexService: Failed to get greedy index value:', error);
      return null;
    }
  }

  /**
   * 获取贪婪指数的级别描述
   * @returns Promise<string | null>
   */
  async getGreedyIndexLevel(): Promise<string | null> {
    try {
      const greedyData = await this.getGreedyIndex();
      return greedyData?.level || null;
    } catch (error) {
      console.error('❌ GreedyIndexService: Failed to get greedy index level:', error);
      return null;
    }
  }

  /**
   * 根据贪婪指数数值获取对应的颜色
   * @param value 贪婪指数数值 (0-100)
   * @returns 对应的颜色值
   */
  static getGreedyIndexColor(value: number): string {
    const colorRanges = [
      { min: 0, max: 25, color: '#FF3B30' },   // 极度恐惧 - 红色
      { min: 25, max: 45, color: '#FF9500' },  // 恐惧 - 橙色
      { min: 45, max: 55, color: '#FFCC00' },  // 中性 - 黄色
      { min: 55, max: 75, color: '#34C759' },  // 贪婪 - 绿色
      { min: 75, color: '#007AFF' }            // 极度贪婪 - 蓝色
    ];
    
    return DataService.getColorByRanges(value, colorRanges);
  }

  /**
   * 根据贪婪指数数值获取对应的级别描述
   * @param value 贪婪指数数值 (0-100)
   * @returns 级别描述
   */
  static getGreedyIndexLevelByValue(value: number): string {
    if (value <= 25) {
      return '极度恐惧';
    } else if (value <= 45) {
      return '恐惧';
    } else if (value <= 55) {
      return '中性';
    } else if (value <= 75) {
      return '贪婪';
    } else {
      return '极度贪婪';
    }
  }
}

// 导出单例
export const greedyIndexService = new GreedyIndexService();
export default GreedyIndexService;
