import apiService from './APIService';
import { DateUtils } from '../utils/dateUtils';

// 定义空投活动接口
export interface AirdropItem {
  id: string;
  title: string;
  description: string;
  content: string;
  deadline: string;
  value: string;
  logo: string;
  background: string;
  requirements: string[];
  tags: string[];
  status: 'active' | 'upcoming' | 'ended';
  link: string;
  date: string;
  category: string;
}

// 定义内容项接口
interface ContentItem {
  content: string;
  url: string;
  embed: string;
  _id: string;
}

// 定义API返回的原始数据格式
interface RawAirdropData {
  path: string;
  pathname: string; // 真正的标题
  title: string;
  contents: ContentItem[]; // 内容数组
  createdAt: string;
  updatedAt: string;
  imageUrl: string; // 相对路径，如 "/images/airdrop/24af36.png"
  logourl?: string; // 外部图片URL
  menu: string; // 分类
  type: string;
  nav: string;
  articleUrl: string;
  airdrophuntcontent_id: string; // 注意这里的字段名与NewsService不同
  deadline?: string; // 截止日期
  value?: string; // 预估价值
  status?: string; // 状态
  link?: string; // 外部链接
  [key: string]: any; // 允许其他未知字段
}

// 空投服务类
class AirdropService {
  private readonly DEFAULT_CATEGORIES = "";
  private allAirdropsCache: AirdropItem[] = [];
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 清除缓存
   */
  clearCache() {
    this.allAirdropsCache = [];
    this.cacheTimestamp = 0;
  }

  /**
   * 获取所有空投（带缓存）
   */
  private async getAllAirdrops(): Promise<AirdropItem[]> {
    const now = Date.now();
    
    // 如果缓存有效，直接返回
    if (this.allAirdropsCache.length > 0 && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      console.log('🗄️ AirdropService: 使用缓存的空投数据，共', this.allAirdropsCache.length, '个');
      return this.allAirdropsCache;
    }

    console.log('🔄 AirdropService: 刷新空投缓存...');
    
    // 获取大量数据并缓存
    const allAirdrops = await this.getAirdropList(0, 500);
    this.allAirdropsCache = allAirdrops;
    this.cacheTimestamp = now;
    
    console.log('✅ AirdropService: 已缓存', allAirdrops.length, '个空投');
    return allAirdrops;
  }

  /**
   * 获取空投列表
   * @param skip 跳过的数量
   * @param limit 获取的数量  
   * @param categories 空投分类，默认为所有分类
   * @returns Promise<AirdropItem[]>
   */
  async getAirdropList(
    skip: number = 0, 
    limit: number = 10, 
    categories: string = this.DEFAULT_CATEGORIES
  ): Promise<AirdropItem[]> {
    try {
      console.log('🔄 AirdropService: Fetching airdrops list...', { skip, limit, categories });
      
      // Use the correct API parameters - no categories filter, just pagination
      const response = await apiService.call('listAirdrophuntContent', [
        "", // 第一个参数为空字符串
        "", // 第二个参数为空字符串  
        "", // 第三个参数为空字符串 (不使用分类过滤)
        skip.toString(), // 跳过数量，转为字符串
        limit.toString(), // 限制数量，转为字符串
        "" // 最后一个参数为空字符串
      ]);

     
      // 处理返回的数据
      let airdropsData: RawAirdropData[] = [];
      
      if (Array.isArray(response)) {
        airdropsData = response;
      } else if (response && Array.isArray(response.result)) {
        airdropsData = response.result;
      } else if (response && response.data && Array.isArray(response.data)) {
        airdropsData = response.data;
      } else {
        console.warn('⚠️ AirdropService: Unexpected response format:', response);
        console.warn('⚠️ AirdropService: Response type:', typeof response);
        console.warn('⚠️ AirdropService: Response keys:', response ? Object.keys(response) : 'null');
        
        // 如果API返回数据格式不正确，返回空数组，不要使用任何假数据
        console.warn('⚠️ AirdropService: Returning empty array due to unexpected format');
        return [];
      }

      console.log(`📊 AirdropService: Found ${airdropsData.length} raw airdrops`);
      
      // 转换数据格式
      const airdrops = airdropsData.map((rawData, index) => {
        try {
          return this.transformAirdropData(rawData);
        } catch (transformError) {
          console.error(`❌ AirdropService: Failed to transform airdrop at index ${index}:`, transformError);
          console.error('Raw data:', rawData);
          // 跳过有问题的数据项
          return null;
        }
      }).filter(Boolean); // 过滤掉null值
      
      console.log(`✅ AirdropService: Successfully transformed ${airdrops.length} airdrops`);
      return airdrops;
      
    } catch (error) {
      console.error('❌ AirdropService: Failed to fetch airdrops list:', error);
      throw new Error(`Failed to fetch airdrops: ${error.message}`);
    }
  }

  /**
   * 根据ID获取单个空投详情
   * @param airdropId 空投ID
   * @returns Promise<AirdropItem | null>
   */
  async getAirdropById(airdropId: string): Promise<AirdropItem | null> {
    try {
      console.log('🔄 AirdropService: Fetching airdrop by ID:', airdropId);
      
      // 从缓存中查找
      const allAirdrops = await this.getAllAirdrops();
      const airdrop = allAirdrops.find(item => item.id === airdropId);
      
      if (airdrop) {
        console.log('✅ AirdropService: Found airdrop in cache:', airdrop.title);
        return airdrop;
      }
      
      // 如果缓存中没有，尝试实时搜索更多数据
      console.log('🔄 AirdropService: Not found in cache, searching more data...');
      
      // 清除缓存并重新获取更多数据
      this.clearCache();
      
      // 分页搜索
      for (let page = 0; page < 10; page++) {
        const skip = page * 100;
        const pageAirdrops = await this.getAirdropList(skip, 100);
        
        if (pageAirdrops.length === 0) {
          break; // 没有更多数据
        }
        
        const foundAirdrop = pageAirdrops.find(item => item.id === airdropId);
        if (foundAirdrop) {
          console.log(`✅ AirdropService: Found airdrop on page ${page}:`, foundAirdrop.title);
          return foundAirdrop;
        }
      }
      
      console.warn('⚠️ AirdropService: Airdrop not found after extensive search:', airdropId);
      return null;
      
    } catch (error) {
      console.error('❌ AirdropService: Failed to fetch airdrop:', error);
      throw new Error(`Failed to fetch airdrop: ${error.message}`);
    }
  }

  /**
   * 根据path获取单个空投详情
   * @param path 空投路径
   * @returns Promise<AirdropItem | null>
   */
  async getAirdropByPath(path: string): Promise<AirdropItem | null> {
    try {
      console.log('🔄 AirdropService: Fetching airdrop by path:', path);
      
      // First try to get the airdrop directly by path using the correct API
      try {
        const response = await apiService.call('getAirdrophuntContent', [path]);
        
        // Handle both direct and result-wrapped API responses
        let airdropData: RawAirdropData | null = null;
        
        if (response && typeof response === 'object') {
          // Check if response has result property (wrapped response)
          if (response.result && typeof response.result === 'object') {
            airdropData = response.result;
          } else if (response.path || response.airdrophuntcontent_id || response.title) {
            // Direct response object
            airdropData = response;
          }
        }
        
        if (airdropData) {
          console.log('✅ AirdropService: Found airdrop via direct API call:', airdropData.title || airdropData.pathname);
          return this.transformAirdropData(airdropData);
        }
      } catch (directError) {
        console.warn('⚠️ AirdropService: Direct API call failed, falling back to cache search:', directError);
      }
      
      // Fallback: search in cached data
      const allAirdrops = await this.getAllAirdrops();
      const airdrop = allAirdrops.find(item => item.id === path);
      
      if (airdrop) {
        console.log('✅ AirdropService: Found airdrop in cache:', airdrop.title);
        return airdrop;
      }
      
      // Final fallback: clear cache and search more data
      console.log('🔄 AirdropService: Not found in cache, searching more data...');
      this.clearCache();
      
      // Search through multiple pages
      for (let page = 0; page < 10; page++) {
        const skip = page * 100;
        const pageAirdrops = await this.getAirdropList(skip, 100);
        
        if (pageAirdrops.length === 0) {
          break; // No more data
        }
        
        const foundAirdrop = pageAirdrops.find(item => item.id === path);
        if (foundAirdrop) {
          console.log(`✅ AirdropService: Found airdrop on page ${page}:`, foundAirdrop.title);
          return foundAirdrop;
        }
      }

      console.warn('⚠️ AirdropService: Airdrop not found after extensive search:', path);
      return null;
      
    } catch (error) {
      console.error('❌ AirdropService: Failed to fetch airdrop by path:', error);
      throw new Error(`Failed to fetch airdrop by path: ${error.message}`);
    }
  }

  /**
   * 获取热门空投（首页用）
   * @param limit 获取数量，默认3个
   * @returns Promise<AirdropItem[]>
   */
  async getFeaturedAirdrops(limit: number = 3): Promise<AirdropItem[]> {
    try {
      // console.log('🔄 AirdropService: Fetching featured airdrops...');
      const allAirdrops = await this.getAirdropList(0, 20);
      
      // 按状态和创建时间筛选活跃的空投
      const activeAirdrops = allAirdrops
        .filter(airdrop => airdrop.status === 'active')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
        
      return activeAirdrops;
    } catch (error) {
      console.error('❌ AirdropService: Failed to fetch featured airdrops:', error);
      // 返回空数组而不是抛出错误，避免影响首页显示
      return [];
    }
  }

  /**
   * 根据分类获取空投
   * @param category 分类名称
   * @param skip 跳过数量
   * @param limit 获取数量
   * @returns Promise<AirdropItem[]>
   */
  async getAirdropsByCategory(
    category: string, 
    skip: number = 0, 
    limit: number = 10
  ): Promise<AirdropItem[]> {
    try {
      console.log('🔄 AirdropService: Fetching airdrops by category:', category);
      
      // Since API doesn't support category filtering, fetch all airdrops and filter client-side
      const fetchSize = Math.max(limit * 3, 20); // Fetch more to ensure we have enough after filtering
      const allAirdrops = await this.getAirdropList(0, fetchSize);
      
      // Filter by category if specified
      let filteredAirdrops = allAirdrops;
      if (category && category !== '' && category !== '全部' && category !== 'all') {
        filteredAirdrops = allAirdrops.filter(airdrop => 
          airdrop.category.includes(category) || 
          airdrop.tags.some(tag => tag.includes(category))
        );
      }
      
      // Apply pagination to filtered results
      const startIndex = skip;
      const endIndex = startIndex + limit;
      const result = filteredAirdrops.slice(startIndex, endIndex);
      
      console.log(`✅ AirdropService: Found ${result.length} airdrops for category "${category}"`);
      return result;
    } catch (error) {
      console.error('❌ AirdropService: Failed to fetch airdrops by category:', error);
      throw new Error(`Failed to fetch airdrops by category: ${error.message}`);
    }
  }

  /**
   * 搜索空投
   * @param searchTerm 搜索关键词
   * @param limit 获取数量
   * @returns Promise<AirdropItem[]>
   */
  async searchAirdrops(searchTerm: string, limit: number = 20): Promise<AirdropItem[]> {
    try {
      console.log('🔄 AirdropService: Searching airdrops with term:', searchTerm);
      
      // 获取更多空投然后在客户端过滤
      const allAirdrops = await this.getAirdropList(0, 100);
      
      const filteredAirdrops = allAirdrops.filter(airdrop => 
        airdrop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        airdrop.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        airdrop.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      // console.log(`✅ AirdropService: Found ${filteredAirdrops.length} airdrops matching "${searchTerm}"`);
      return filteredAirdrops.slice(0, limit);
      
    } catch (error) {
      console.error('❌ AirdropService: Failed to search airdrops:', error);
      throw new Error(`Failed to search airdrops: ${error.message}`);
    }
  }

  /**
   * 获取活跃的空投
   * @param limit 获取数量
   * @returns Promise<AirdropItem[]>
   */
  async getActiveAirdrops(limit: number = 10): Promise<AirdropItem[]> {
    try {
      // console.log('🔄 AirdropService: Fetching active airdrops...');
      
      const allAirdrops = await this.getAirdropList(0, 50);
      
      // 筛选状态为active的空投
      const activeAirdrops = allAirdrops
        .filter(airdrop => airdrop.status === 'active')
        .slice(0, limit);
        
      // console.log(`✅ AirdropService: Found ${activeAirdrops.length} active airdrops`);
      return activeAirdrops;
      
    } catch (error) {
      console.error('❌ AirdropService: Failed to fetch active airdrops:', error);
      throw new Error(`Failed to fetch active airdrops: ${error.message}`);
    }
  }

  /**
   * 获取即将到期的空投
   * @param daysThreshold 即将到期的天数阈值，默认7天
   * @param limit 获取数量
   * @returns Promise<AirdropItem[]>
   */
  async getEndingSoonAirdrops(daysThreshold: number = 7, limit: number = 10): Promise<AirdropItem[]> {
    try {
      console.log('🔄 AirdropService: Fetching ending soon airdrops...');
      
      const allAirdrops = await this.getAirdropList(0, 50);
      const now = new Date();
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
      
      // 筛选即将到期的空投（状态为active且截止日期在阈值范围内）
      const endingSoonAirdrops = allAirdrops
        .filter(airdrop => {
          if (airdrop.status !== 'active') return false;
          
          const deadlineDate = new Date(airdrop.deadline);
          return deadlineDate > now && deadlineDate <= thresholdDate;
        })
        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        .slice(0, limit);
        
      console.log(`✅ AirdropService: Found ${endingSoonAirdrops.length} ending soon airdrops`);
      return endingSoonAirdrops;
      
    } catch (error) {
      console.error('❌ AirdropService: Failed to fetch ending soon airdrops:', error);
      throw new Error(`Failed to fetch ending soon airdrops: ${error.message}`);
    }
  }

  /**
   * 转换原始数据为标准格式
   * @param rawData 原始数据
   * @returns AirdropItem
   */
  private transformAirdropData(rawData: RawAirdropData): AirdropItem {
    // 处理内容：将contents数组中的内容合并
    const fullContent = rawData.contents
      ? rawData.contents.map(item => item.content).join('\n\n')
      : '';
    
    // 生成描述：取第一段内容的前100个字符
    const description = rawData.contents && rawData.contents.length > 0
      ? this.extractSummaryFromMarkdown(rawData.contents[0].content)
      : rawData.title || '暂无描述';
    
    // 处理图片URL
    const logoUrl = this.getFullImageUrl(rawData.imageUrl || '');
    // console.log('🔄 AirdropService: Logo URL:', logoUrl);
    const backgroundUrl = this.getFullImageUrl(rawData.imageUrl || rawData.logourl || '');
    
    // 格式化日期
    const formattedDate = this.formatDate(rawData.updatedAt || rawData.createdAt);
    
    // 获取空投状态
    const status = this.getAirdropStatus(rawData.status, rawData.deadline);
    
    // 从内容中提取要求
    const requirements = this.extractRequirementsFromContent(fullContent);

    // 生成参与链接
    const participationLink = this.generateAirdropParticipationUrl(rawData);
    
    return {
      id: rawData.path || rawData.airdrophuntcontent_id || '', // 优先使用path作为id
      title: rawData.pathname || rawData.title || '未知空投',
      description: description,
      content: fullContent,
      deadline: rawData.deadline || '未知截止日期',
      value: rawData.value || '未知价值',
      logo: logoUrl,
      background: backgroundUrl,
      requirements: requirements,
      status: status,
      link: participationLink,
      date: formattedDate,
      category: this.getCategoryName(rawData.menu),
      tags: [rawData.type || '', rawData.menu || ''].filter(Boolean)
    };
  }

  /**
   * 从Markdown内容中提取摘要
   * @param markdownContent Markdown格式的内容
   * @returns string 摘要
   */
  private extractSummaryFromMarkdown(markdownContent: string): string {
    if (!markdownContent) return '暂无描述';
    
    // 移除Markdown标记（#, *, >, 等）
    let cleanText = markdownContent
      .replace(/#{1,6}\s+/g, '') // 移除标题标记
      .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体标记
      .replace(/\*(.*?)\*/g, '$1') // 移除斜体标记
      .replace(/>\s*/g, '') // 移除引用标记
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接，保留文本
      .replace(/\n\s*\n/g, ' ') // 移除多余换行
      .trim();
    
    // 取前120个字符作为摘要
    if (cleanText.length > 120) {
      cleanText = cleanText.substring(0, 120) + '...';
    }
    
    return cleanText || '暂无描述';
  }

  /**
   * 从内容中提取空投参与要求
   * @param content 空投内容
   * @returns string[] 要求列表
   */
  private extractRequirementsFromContent(content: string): string[] {
    if (!content) return [];
    
    // 尝试从内容中找出要求部分
    const requirements: string[] = [];
    
    // 寻找类似"Requirements:"或"参与要求："等部分
    const requirementSections = [
      /Requirements?:(.*?)(?=##|$)/is,
      /参与要求[:：](.*?)(?=##|$)/is,
      /How to participate:(.*?)(?=##|$)/is,
      /Steps:(.*?)(?=##|$)/is
    ];
    
    for (const regex of requirementSections) {
      const match = content.match(regex);
      if (match && match[1]) {
        // 提取要求项，通常是列表形式
        const reqText = match[1].trim();
        const listItems = reqText.split(/[\n\r]+/).filter(line => 
          line.trim().startsWith('-') || 
          line.trim().startsWith('*') || 
          /^\d+\.\s/.test(line.trim())
        );
        
        if (listItems.length > 0) {
          requirements.push(
            ...listItems.map(item => 
              item.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim()
            )
          );
          break; // 找到一组要求后就退出
        }
      }
    }
    
    // 如果没有找到明确的要求，返回空数组
    return requirements;
  }

  /**
   * 获取完整的图片URL
   * @param imageUrl 图片URL（可能是相对路径）
   * @returns string 完整的图片URL
   */
  private getFullImageUrl(imageUrl?: string): string {
    if (!imageUrl) return 'https://via.placeholder.com/400';
    
    // 如果是完整的URL，直接返回
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // 如果是相对路径，添加基础域名
    if (imageUrl.startsWith('/')) {
      return `https://airdrophunt.xyz${imageUrl}`;
    }
    
    // 其他情况，返回默认图片
    return 'https://via.placeholder.com/400';
  }

  /**
   * 根据menu字段获取中文分类名称
   * @param menu 英文分类
   * @returns string 中文分类名称
   */
  private getCategoryName(menu: string): string {
    const categoryMap: { [key: string]: string } = {
      'airdrop': '空投活动',
      'hunting': '空投猎场',
      'token': '代币空投',
      'nft': 'NFT空投',
      'points': '积分空投'
    };
    
    return categoryMap[menu] || '其他空投';
  }

  /**
   * 获取空投状态
   * @param statusStr 状态字符串
   * @param deadlineStr 截止日期字符串
   * @returns 'active' | 'upcoming' | 'ended' 空投状态
   */
  private getAirdropStatus(statusStr?: string, deadlineStr?: string): 'active' | 'upcoming' | 'ended' {
    // 如果有明确的状态，优先使用
    if (statusStr) {
      const status = statusStr.toLowerCase();
      if (status.includes('active')) return 'active';
      if (status.includes('upcoming')) return 'upcoming';
      if (status.includes('ended') || status.includes('closed')) return 'ended';
    }
    
    // 通过截止日期判断状态
    if (deadlineStr) {
      try {
        const deadline = new Date(deadlineStr);
        const now = new Date();
        
        if (deadline < now) {
          return 'ended';
        } else {
          return 'active';
        }
      } catch (error) {
        console.warn('⚠️ AirdropService: Failed to parse deadline:', error);
      }
    }
    
    // 默认返回活跃状态
    return 'active';
  }  /**
   * 格式化日期显示
   * @param dateString 日期字符串
   * @returns string 格式化的日期
   */
  formatDate(dateString: string): string {
    return DateUtils.formatRelativeTime(dateString);
  }

  /**
   * 格式化截止日期显示
   * @param deadlineStr 截止日期字符串
   * @returns string 格式化后的截止日期
   */
  formatDeadline(deadlineStr: string): string {
    return DateUtils.formatDeadline(deadlineStr);
  }

  /**
   * 生成空投参与链接
   * @param menu 分类字段
   * @param path 路径字段
   * @returns string 完整的参与链接
   */
  generateAirdropParticipationUrl(rawData: RawAirdropData): string {
    if (!rawData) return '';
    
    
    // 如果有menu和path字段，生成官方链接
    if (rawData.menu && rawData.path) {
      return `https://airdrophunt.xyz/airdrops/${rawData.menu}/${rawData.path}`;
    }
    
    // 如果只有project
    if (rawData.project) {
      return `https://bly.one/${rawData.project}`;
    }
    
    // 最后的备用选项，返回官网
    return 'https://airdrophunt.xyz';
  }
}

// 创建服务实例
export const airdropService = new AirdropService();
export default airdropService;
