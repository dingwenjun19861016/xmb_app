import apiService from '../APIService';

// 通用数据响应接口
export interface DataResponse<T = any> {
  result: Array<{
    date: string;
    page: string;
    type: string;
    createdAt: string;
    data: string; // JSON字符串
    updatedAt: string;
    data_id: string;
  }>;
}

// 基础数据服务类
export abstract class DataService<T> {
  protected abstract dataType: string;
  protected abstract serviceName: string;

  /**
   * 获取数据的通用方法
   * @param limit 获取数据条数，默认为1
   * @returns Promise<T[] | null>
   */
  protected async fetchData(limit: number = 1): Promise<T[] | null> {
    try {
      console.log(`🔄 ${this.serviceName}: Fetching ${this.dataType} data...`);

      const response = await apiService.call<DataResponse<T> | T[]>(
        'listData', 
        ['', this.dataType, '', '0', limit.toString()]
      );

      // 处理响应可能是数组或对象的情况
      let dataArray = [];
      if (Array.isArray(response)) {
        dataArray = response;
      } else if (response?.result && Array.isArray(response.result)) {
        dataArray = response.result;
      }

      if (dataArray && dataArray.length > 0) {
        // 处理多条历史数据
        const allData: T[] = [];
        
        for (const dataItem of dataArray) {
          console.log(`📊 ${this.serviceName}: Processing data item:`, dataItem);
          
          if (dataItem.data) {
            console.log(`📊 ${this.serviceName}: Raw data field:`, dataItem.data);
            try {
              // 解析JSON字符串
              const parsedData: T[] = JSON.parse(dataItem.data);
              console.log(`📊 ${this.serviceName}: Parsed data:`, parsedData);
              
              if (parsedData && parsedData.length > 0) {
                // 将解析出的数据添加到结果数组中
                allData.push(...parsedData);
              }
            } catch (parseError) {
              console.error(`❌ ${this.serviceName}: Failed to parse ${this.dataType} data:`, parseError);
              console.error('Raw data:', dataItem.data);
            }
          }
        }
        
        if (allData.length > 0) {
          console.log(`✅ ${this.serviceName}: Successfully parsed ${this.dataType} data:`, allData);
          return allData;
        } else {
          console.warn(`⚠️ ${this.serviceName}: No valid parsed data found`);
          return null;
        }
      } else {
        console.warn(`⚠️ ${this.serviceName}: No ${this.dataType} data found`);
        return null;
      }
    } catch (error) {
      console.error(`❌ ${this.serviceName}: Failed to fetch ${this.dataType}:`, error);
      return null;
    }
  }

  /**
   * 获取最新的单条数据
   * @returns Promise<T | null>
   */
  async getLatestData(): Promise<T | null> {
    try {
      const dataArray = await this.fetchData(1);
      // 由于fetchData现在返回的是所有解析出的数据，我们取最后一个（最新的）
      return dataArray && dataArray.length > 0 ? dataArray[dataArray.length - 1] : null;
    } catch (error) {
      console.error(`❌ ${this.serviceName}: Failed to get latest ${this.dataType} data:`, error);
      return null;
    }
  }

  /**
   * 获取多条数据
   * @param limit 获取数据条数
   * @returns Promise<T[] | null>
   */
  async getData(limit: number = 10): Promise<T[] | null> {
    return this.fetchData(limit);
  }

  /**
   * 解析数值字段的通用方法
   * @param dataObject 数据对象
   * @param field 字段名
   * @param parseType 解析类型：'int' | 'float'
   * @returns number | null
   */
  protected parseNumericField(dataObject: any, field: string, parseType: 'int' | 'float' = 'float'): number | null {
    try {
      if (!dataObject || !dataObject[field]) return null;
      
      const value = parseType === 'int' 
        ? parseInt(dataObject[field], 10)
        : parseFloat(dataObject[field]);
        
      return isNaN(value) ? null : value;
    } catch (error) {
      console.error(`❌ ${this.serviceName}: Failed to parse ${field}:`, error);
      return null;
    }
  }

  /**
   * 通用颜色获取方法
   * @param value 数值
   * @param colorRanges 颜色范围配置
   * @returns 颜色值
   */
  public static getColorByRanges(value: number, colorRanges: Array<{ min: number; max?: number; color: string }>): string {
    for (const range of colorRanges) {
      if (range.max !== undefined) {
        if (value >= range.min && value < range.max) {
          return range.color;
        }
      } else {
        if (value >= range.min) {
          return range.color;
        }
      }
    }
    return '#8E8E93'; // 默认灰色
  }

  /**
   * 格式化数值显示
   * @param value 数值
   * @param options 格式化选项
   * @returns 格式化后的字符串
   */
  protected static formatNumber(
    value: number, 
    options: {
      currency?: boolean;
      decimals?: number;
      suffix?: string;
      prefix?: string;
    } = {}
  ): string {
    const { currency = false, decimals = 2, suffix = '', prefix = '' } = options;
    
    let formattedValue: string;
    
    if (currency) {
      if (value >= 1e9) {
        formattedValue = `$${(value / 1e9).toFixed(decimals)}B`;
      } else if (value >= 1e6) {
        formattedValue = `$${(value / 1e6).toFixed(decimals)}M`;
      } else if (value >= 1e3) {
        formattedValue = `$${(value / 1e3).toFixed(decimals)}K`;
      } else {
        formattedValue = `$${value.toFixed(decimals)}`;
      }
    } else {
      formattedValue = value.toFixed(decimals);
    }
    
    return `${prefix}${formattedValue}${suffix}`;
  }

  /**
   * 格式化变化百分比
   * @param changeValue 变化值
   * @returns 格式化后的变化字符串
   */
  protected static formatChange(changeValue: number): string {
    const sign = changeValue >= 0 ? '+' : '';
    return `${sign}${changeValue.toFixed(2)}%`;
  }

  /**
   * 根据变化值获取颜色
   * @param changeValue 变化值
   * @returns 颜色值
   */
  protected static getChangeColor(changeValue: number): string {
    if (changeValue > 0) {
      return '#34C759'; // 绿色
    } else if (changeValue < 0) {
      return '#FF3B30'; // 红色
    } else {
      return '#8E8E93'; // 灰色
    }
  }
}

export default DataService;
