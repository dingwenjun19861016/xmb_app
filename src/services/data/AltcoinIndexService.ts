import { DataService } from './DataService';

// 山寨币指数数据接口
export interface AltcoinIndexData {
  altcoinindex: string;
  timestamp?: string;
}

class AltcoinIndexService extends DataService<AltcoinIndexData> {
  protected dataType = 'ALTCOIN_INDEX';
  protected serviceName = 'AltcoinIndexService';

  /**
   * 获取山寨币指数数据
   * @returns Promise<AltcoinIndexData | null>
   */
  async getAltcoinIndex(): Promise<AltcoinIndexData | null> {
    return this.getLatestData();
  }

  /**
   * 获取山寨币指数历史数据
   * @param limit 获取数据的数量限制，默认30条
   * @returns Promise<AltcoinIndexData[] | null>
   */
  async getAltcoinIndexHistory(limit: number = 30): Promise<AltcoinIndexData[] | null> {
    return this.getData(limit);
  }

  /**
   * 获取山寨币指数的数字值
   * @returns Promise<number | null>
   */
  async getAltcoinIndexValue(): Promise<number | null> {
    try {
      const altcoinData = await this.getAltcoinIndex();
      return altcoinData ? this.parseNumericField(altcoinData, 'altcoinindex', 'float') : null;
    } catch (error) {
      console.error('❌ AltcoinIndexService: Failed to get altcoin index value:', error);
      return null;
    }
  }

  /**
   * 根据山寨币指数数值获取对应的颜色
   * @param value 山寨币指数数值
   * @returns 对应的颜色值
   */
  static getAltcoinIndexColor(value: number): string {
    const colorRanges = [
      { min: 0, max: 20, color: '#FF3B30' },   // 山寨币极弱 - 红色
      { min: 20, max: 40, color: '#FF9500' },  // 山寨币弱势 - 橙色
      { min: 40, max: 60, color: '#FFCC00' },  // 平衡状态 - 黄色
      { min: 60, color: '#34C759' }            // 山寨币强势 - 绿色
    ];
    
    return DataService.getColorByRanges(value, colorRanges);
  }

  /**
   * 根据山寨币指数数值获取对应的描述
   * @param value 山寨币指数数值
   * @returns 描述文本
   */
  static getAltcoinIndexDescription(value: number): string {
    if (value >= 60) {
      return '山寨币强势表现';
    } else if (value >= 40) {
      return '市场相对平衡';
    } else if (value >= 20) {
      return '山寨币相对弱势';
    } else {
      return '山寨币极度弱势';
    }
  }

  /**
   * 根据山寨币指数数值获取对应的市场情绪
   * @param value 山寨币指数数值
   * @returns 市场情绪文本
   */
  static getMarketSentiment(value: number): string {
    if (value >= 70) {
      return '极度乐观';
    } else if (value >= 60) {
      return '乐观';
    } else if (value >= 40) {
      return '中性';
    } else if (value >= 20) {
      return '谨慎';
    } else {
      return '悲观';
    }
  }
}

// 导出单例
export const altcoinIndexService = new AltcoinIndexService();
export default AltcoinIndexService;
