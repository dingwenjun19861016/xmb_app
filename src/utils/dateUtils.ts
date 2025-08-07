import { Platform, NativeModules } from 'react-native';

/**
 * 日期格式化工具类
 * 提供全局统一的日期格式化方法，支持设备时区自动转换
 */
export class DateUtils {
  /**
   * 获取设备时区
   */
  private static getDeviceTimeZone(): string {
    try {
      if (Platform.OS === 'ios') {
        // iOS 设备时区获取
        const { timezone } = NativeModules.SettingsManager?.settings || {};
        return timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      } else if (Platform.OS === 'android') {
        // Android 设备时区获取
        const { TimeZone } = NativeModules.I18nManager || {};
        return TimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      } else {
        // 其他平台（web等）
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      }
    } catch (error) {
      console.error('获取设备时区失败:', error);
      return 'Asia/Shanghai'; // 默认返回北京时间
    }
  }

  /**
   * 格式化日期为 YYYY-MM-DD 格式，根据设备时区自动调整
   * @param dateInput 日期输入，可以是 Date 对象或日期字符串
   * @returns 格式化后的日期字符串
   */
  static formatDate(dateInput: Date | string): string {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      
      if (isNaN(date.getTime())) {
        return typeof dateInput === 'string' ? dateInput : '';
      }

      const deviceTimeZone = this.getDeviceTimeZone();
      
      const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
        timeZone: deviceTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      return dateFormatter.format(date).replace(/\//g, '-');
    } catch (error) {
      console.error('日期格式化失败:', error);
      return typeof dateInput === 'string' ? dateInput : '';
    }
  }

  /**
   * 格式化日期和时间，根据设备时区自动调整
   * @param dateInput 日期输入，可以是 Date 对象或日期字符串
   * @returns 包含日期和时间的对象
   */
  static formatDateTime(dateInput: Date | string): { dateString: string; timeString: string } {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      
      if (isNaN(date.getTime())) {
        return { dateString: '', timeString: '' };
      }

      const deviceTimeZone = this.getDeviceTimeZone();
      
      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: deviceTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      };
      
      const timeOptions: Intl.DateTimeFormatOptions = {
        timeZone: deviceTimeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      
      const dateFormatter = new Intl.DateTimeFormat('zh-CN', dateOptions);
      const timeFormatter = new Intl.DateTimeFormat('zh-CN', timeOptions);
      
      const dateString = dateFormatter.format(date).replace(/\//g, '-');
      const timeString = timeFormatter.format(date);
      
      return { dateString, timeString };
    } catch (error) {
      console.error('日期时间格式化失败:', error);
      return { dateString: '', timeString: '' };
    }
  }

  /**
   * 格式化相对时间（如：刚刚、1小时前、2天前等）
   * @param dateInput 日期输入，可以是 Date 对象或日期字符串
   * @returns 相对时间字符串
   */
  static formatRelativeTime(dateInput: Date | string): string {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      
      if (isNaN(date.getTime())) {
        return typeof dateInput === 'string' ? dateInput : '';
      }

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) {
        return '刚刚';
      } else if (diffMinutes < 60) {
        return `${diffMinutes}分钟前`;
      } else if (diffHours < 24) {
        return `${diffHours}小时前`;
      } else if (diffDays < 7) {
        return `${diffDays}天前`;
      } else {
        return this.formatDate(date);
      }
    } catch (error) {
      console.error('相对时间格式化失败:', error);
      return typeof dateInput === 'string' ? dateInput : '';
    }
  }

  /**
   * 格式化截止日期（如：已结束、今天截止、明天截止等）
   * @param dateInput 截止日期输入，可以是 Date 对象或日期字符串
   * @returns 截止日期描述字符串
   */
  static formatDeadline(dateInput: Date | string): string {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      
      if (isNaN(date.getTime())) {
        return typeof dateInput === 'string' ? dateInput : '';
      }

      const now = new Date();
      
      // 如果已过期
      if (date < now) {
        return '已结束';
      }
      
      // 计算剩余天数
      const diffMs = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return '今天截止';
      } else if (diffDays === 1) {
        return '明天截止';
      } else if (diffDays <= 7) {
        return `${diffDays}天后截止`;
      } else {
        return this.formatDate(date) + '截止';
      }
    } catch (error) {
      console.error('截止日期格式化失败:', error);
      return typeof dateInput === 'string' ? dateInput : '';
    }
  }

  /**
   * 获取本地化的日期字符串
   * @param dateInput 日期输入，可以是 Date 对象或日期字符串
   * @param locale 语言环境，默认为 'zh-CN'
   * @returns 本地化日期字符串
   */
  static toLocaleDateString(dateInput: Date | string, locale: string = 'zh-CN'): string {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      
      if (isNaN(date.getTime())) {
        return typeof dateInput === 'string' ? dateInput : '';
      }

      const deviceTimeZone = this.getDeviceTimeZone();
      
      return date.toLocaleDateString(locale, {
        timeZone: deviceTimeZone,
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('本地化日期格式化失败:', error);
      return typeof dateInput === 'string' ? dateInput : '';
    }
  }

  /**
   * 简化的日期格式化（如：05/23）
   * @param dateInput 日期输入，可以是 Date 对象或日期字符串
   * @returns 简化的日期字符串
   */
  static formatSimpleDate(dateInput: Date | string): string {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      
      if (isNaN(date.getTime())) {
        return typeof dateInput === 'string' ? dateInput.substring(0, 5) : '';
      }

      const deviceTimeZone = this.getDeviceTimeZone();
      
      const formatter = new Intl.DateTimeFormat('zh-CN', {
        timeZone: deviceTimeZone,
        month: '2-digit',
        day: '2-digit',
      });

      return formatter.format(date).replace('/', '/');
    } catch (error) {
      console.error('简化日期格式化失败:', error);
      return typeof dateInput === 'string' ? dateInput.substring(0, 5) : '';
    }
  }

  /**
   * 格式化24小时时间（如：14:20）
   * 专门用于24小时图表显示
   * @param dateInput 日期输入，可以是 Date 对象或日期字符串
   * @returns 时间字符串（HH:MM格式）
   */
  static format24hTime(dateInput: Date | string): string {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      
      if (isNaN(date.getTime())) {
        return typeof dateInput === 'string' ? dateInput.substring(11, 16) : '';
      }

      const deviceTimeZone = this.getDeviceTimeZone();
      
      const formatter = new Intl.DateTimeFormat('zh-CN', {
        timeZone: deviceTimeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false, // 使用24小时制
      });

      return formatter.format(date);
    } catch (error) {
      console.error('24小时时间格式化失败:', error);
      return typeof dateInput === 'string' ? dateInput.substring(11, 16) : '';
    }
  }
}
