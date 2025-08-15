import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Platform,
  Keyboard
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Import services
import newsService from '../../services/NewsService';
import configService from '../../services/ConfigService';
// Use the shared NewsArticle type which has `id` (path) instead of local `_id`
import type { NewsArticle as ServiceNewsArticle } from '../../services/NewsService';

// Import contexts  
import { useUser } from '../../contexts/UserContext';

// Import components
import TodayHeader from '../../components/common/TodayHeader';
import MessageModal from '../../components/common/MessageModal';
import LoginModal from '../../components/auth/LoginModal';
import SkeletonBox from '../../components/common/SkeletonBox';
import TimelineNewsCard from '../../components/common/TimelineNewsCard';
import CommonSearchBar from '../../components/common/CommonSearchBar';
import { useDebounce } from '../../hooks/useDebounce';

// Import types - extend the service type with local UI-only fields
type NewsArticle = ServiceNewsArticle & {
  originalDate?: string | number | Date; // 保存原始日期用于分组
  groupDate?: string; // 保存分组使用的日期
  source?: string;
  readCount?: number;
};

// 分类配置将从配置系统动态获取

const ArticleScreen = () => {
  // 渲染次数计数器
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  console.log('🔥🔥🔥 ArticleScreen: Component render started - Render count:', renderCountRef.current);
  const navigation = useNavigation();
  const { currentUser } = useUser();
  const searchInputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  console.log('🔥 ArticleScreen: Component refs and navigation initialized');

  // 数据状态
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  console.log('🔥 ArticleScreen: Data states initialized', {
    articlesLength: articles.length,
    loading,
    refreshing,
    loadingMore,
    hasMoreData,
    currentPage,
    error
  });

  // 搜索和过滤状态
  const [searchText, setSearchText] = useState('');
  const [submittedSearchText, setSubmittedSearchText] = useState(''); // 用户提交的搜索文本
  const debouncedSearchText = useDebounce(submittedSearchText, 500); // 只对提交的搜索文本防抖
  const [activeCategory, setActiveCategory] = useState(''); // 默认为空，从配置加载后设置
  
  // 分类配置状态
  const [articleCategories, setArticleCategories] = useState<string[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [reverseCategoryMap, setReverseCategoryMap] = useState<Record<string, string>>({});
  
  console.log('🔥 ArticleScreen: Search states initialized', {
    searchText,
    submittedSearchText,
    debouncedSearchText,
    activeCategory,
    searchTextLength: searchText.length,
    submittedSearchTextLength: submittedSearchText.length,
    debouncedSearchTextLength: debouncedSearchText.length,
    articleCategoriesLength: articleCategories.length,
    categoryMapKeys: Object.keys(categoryMap),
    reverseCategoryMapKeys: Object.keys(reverseCategoryMap)
  });

  // UI配置状态
  const [screenTitle, setScreenTitle] = useState('资讯');
  const [searchPlaceholder, setSearchPlaceholder] = useState('搜索资讯...');
  const [pageSize, setPageSize] = useState(20);
  
  console.log('🔥 ArticleScreen: UI config states initialized', {
    screenTitle,
    searchPlaceholder,
    pageSize
  });

  // 批量加载相关状态 - 类似于MarketScreen的实现
  const [initialBatchSize] = useState(15); // 首次快速加载的数量
  const [progressiveBatchSize] = useState(10); // 渐进式每批加载的数量
  const [totalInitialBatches] = useState(4); // 初始总批次数 (15+10+10+10=45条)
  const [isProgressiveLoading, setIsProgressiveLoading] = useState(false); // 渐进式加载状态
  const [currentLoadingBatch, setCurrentLoadingBatch] = useState(0); // 当前加载到第几批
  const [progressiveLoadCompleted, setProgressiveLoadCompleted] = useState(false); // 渐进式加载完成标志
  const [activeBatchLoaders, setActiveBatchLoaders] = useState(new Set<number>()); // 活跃的批次加载器
  const [displayedItemCount, setDisplayedItemCount] = useState(15); // 当前显示的文章数量
  
  console.log('🔥 ArticleScreen: Batch loading states initialized', {
    initialBatchSize,
    progressiveBatchSize,
    totalInitialBatches,
    isProgressiveLoading,
    currentLoadingBatch,
    progressiveLoadCompleted,
    activeBatchLoadersSize: activeBatchLoaders.size,
    displayedItemCount
  });

  // Modal状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalButtons, setModalButtons] = useState<Array<{
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress: () => void;
  }>>([]);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  
  console.log('🔥 ArticleScreen: Modal states initialized', {
    modalVisible,
    modalType,
    modalTitle,
    modalMessage,
    modalButtonsLength: modalButtons.length,
    loginModalVisible
  });

  // 初始加载
  useEffect(() => {
    console.log('🔥 ArticleScreen: Initial useEffect triggered');
    const initialize = async () => {
      console.log('🔥 ArticleScreen: Starting initialization');
      await loadConfigs();
      console.log('🔥 ArticleScreen: Config loaded, starting loadArticles');
      loadArticles(true);
      console.log('🔥 ArticleScreen: Initialization completed');
    };
    initialize();

    // 清理函数
    return () => {
      console.log('🔥 ArticleScreen: Initial useEffect cleanup');
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // 初始加载 - 移除useFocusEffect以避免从详情页返回时重新加载
  useEffect(() => {
    console.log('🔥 ArticleScreen: Category useEffect triggered', { activeCategory });
    if (activeCategory) {
      console.log('🔥 ArticleScreen: Category changed, loading articles for:', activeCategory);
      loadArticles(true);
    }
    return () => {
      console.log('🔥 ArticleScreen: Category useEffect cleanup');
    };
  }, [activeCategory]);

  // 搜索提交效果 - 只在用户按回车或明确提交搜索时触发
  useEffect(() => {
    console.log('🔍 ArticleScreen: Search submit effect triggered:', {
      debouncedSearchText,
      submittedSearchText,
      trimmed: debouncedSearchText.trim(),
      activeCategory
    });
    
    if (debouncedSearchText.trim()) {
      console.log('🔍 ArticleScreen: Executing search for:', debouncedSearchText);
      // 搜索模式：使用单次API调用，不使用progressive loading
      loadSearchResults();
    } else {
      console.log('🔍 ArticleScreen: Clearing search, loading default articles');
      setDisplayedItemCount(initialBatchSize);
      loadArticles(true);
    }
    
    return () => {
      console.log('🔍 ArticleScreen: Search useEffect cleanup');
    };
  }, [debouncedSearchText, activeCategory]);

  const loadConfigs = async () => {
    console.log('🔥⚙️ ArticleScreen: loadConfigs started');
    try {
      await configService.init();
      
      const [
        screenTitleConfig,
        searchPlaceholderConfig,
        pageSizeConfig,
        articleMenuConfig
      ] = await Promise.all([
        configService.getConfig('ARTICLES_SCREEN_TITLE', '资讯'),
        configService.getConfig('ARTICLES_SEARCH_PLACEHOLDER', '搜索资讯...'),
        configService.getConfig('ARTICLES_PAGE_SIZE', 20 as any),
        configService.getConfig('ARTICLE_MENU', { stockquicknews: "快讯", stocknews: "最新消息" } as any)
      ]);

      console.log('🔥⚙️ ArticleScreen: Setting config states', {
        screenTitleConfig,
        searchPlaceholderConfig,
        pageSizeConfig,
        articleMenuConfig
      });

      setScreenTitle(screenTitleConfig as any);
      setSearchPlaceholder(searchPlaceholderConfig as any);

      // 确保 pageSize 为数字
      const pageSizeNumber = typeof pageSizeConfig === 'number' ? pageSizeConfig : Number(pageSizeConfig);
      setPageSize(Number.isFinite(pageSizeNumber) && pageSizeNumber > 0 ? pageSizeNumber : 20);

      // 解析文章菜单配置（后端以字符串形式返回，且可能不是严格JSON）
      const parseArticleMenu = (raw: any): Record<string, string> | null => {
        if (!raw) return null;
        if (typeof raw === 'object') return raw as Record<string, string>;
        if (typeof raw === 'string') {
          let s = raw.trim();
          // 去掉可能多余的首尾引号
          if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
            s = s.slice(1, -1);
          }
          // 先尝试严格 JSON
          try {
            return JSON.parse(s);
          } catch {
            // 宽松处理：给未加引号的key补全双引号，并将单引号替换为双引号
            try {
              const sanitized = s
                .replace(/(['"])\s*:\s*/g, '$1:') // 规范冒号附近空格
                .replace(/([{,\s])([A-Za-z0-9_]+)\s*:/g, '$1"$2":') // key 加引号
                .replace(/'/g, '"'); // 单引号转双引号
              return JSON.parse(sanitized);
            } catch (e) {
              console.warn('⚠️ ArticleScreen: Failed to parse ARTICLE_MENU:', e, s);
              return null;
            }
          }
        }
        return null;
      };

      // 处理文章菜单配置
      const parsedMenu = parseArticleMenu(articleMenuConfig);
      if (parsedMenu && typeof parsedMenu === 'object') {
        console.log('🔥⚙️ ArticleScreen: Processing article menu config:', parsedMenu);
        
        const categoryLabels = Object.values(parsedMenu) as string[];
        const categoryToApiMap = Object.fromEntries(
          Object.entries(parsedMenu).map(([api, label]) => [label, api])
        );
        const apiToCategoryMap = parsedMenu as Record<string, string>;

        console.log('🔥⚙️ ArticleScreen: About to set article categories:', {
          categoryLabels,
          categoryToApiMap,
          apiToCategoryMap
        });

        setArticleCategories(categoryLabels);
        setCategoryMap(categoryToApiMap);
        setReverseCategoryMap(apiToCategoryMap);

        // 设置默认激活分类为第一个分类
        if (categoryLabels.length > 0) {
          setActiveCategory(categoryLabels[0]);
          console.log('🔥⚙️ ArticleScreen: Set default active category:', categoryLabels[0]);
        }

        console.log('🔥⚙️ ArticleScreen: Article menu config processed', {
          categoryLabels,
          categoryToApiMap,
          apiToCategoryMap,
          defaultCategory: categoryLabels[0]
        });
      } else {
        console.warn('🔥⚙️ ArticleScreen: Invalid articleMenuConfig, using default');
        const defaultMenuConfig = { stockquicknews: "快讯", stocknews: "最新消息" };
        const categoryLabels = Object.values(defaultMenuConfig);
        const categoryToApiMap = Object.fromEntries(
          Object.entries(defaultMenuConfig).map(([api, label]) => [label, api])
        );

        setArticleCategories(categoryLabels);
        setCategoryMap(categoryToApiMap);
        setReverseCategoryMap(defaultMenuConfig);
        setActiveCategory(categoryLabels[0]);
      }

      console.log('✅ ArticleScreen: Config loaded successfully');
    } catch (error) {
      console.error('❌ ArticleScreen: Failed to load configs:', error);
      
      // 如果配置加载失败，使用默认配置
      const defaultMenuConfig = { stockquicknews: "快讯", stocknews: "最新消息" };
      const categoryLabels = Object.values(defaultMenuConfig);
      const categoryToApiMap = Object.fromEntries(
        Object.entries(defaultMenuConfig).map(([api, label]) => [label, api])
      );
      
      setArticleCategories(categoryLabels);
      setCategoryMap(categoryToApiMap);
      setReverseCategoryMap(defaultMenuConfig);
      setActiveCategory(categoryLabels[0]);
      
      console.log('🔥⚙️ ArticleScreen: Using default menu config due to error');
    }
  };

  const loadArticles = async (reset: boolean = false) => {
    console.log('🔥📚 ArticleScreen: loadArticles called', { reset, loading });
    if (loading && !reset) {
      console.log('🔥📚 ArticleScreen: loadArticles skipped - already loading');
      return;
    }

    try {
      if (reset) {
        console.log('🔥📚 ArticleScreen: Reset mode - setting loading states');
        setLoading(true);
        setCurrentPage(1);
        setHasMoreData(true);
        setArticles([]);
        setDisplayedItemCount(initialBatchSize);
        // 重置渐进式加载状态
        setProgressiveLoadCompleted(false);
        setIsProgressiveLoading(false);
        setCurrentLoadingBatch(0);
        setActiveBatchLoaders(new Set());
        
        console.log('🔥📚 ArticleScreen: Starting progressive loading');
        // 开始渐进式加载
        await startArticleProgressiveLoading();
      } else {
        console.log('🔥📚 ArticleScreen: Load more mode');
        setLoadingMore(true);
      }

    } catch (error) {
      console.error('❌ ArticleScreen: Failed to load articles:', error);
      showMessageModal(
        'error',
        '加载失败',
        '无法加载文章列表，请检查网络连接后重试',
        [{ text: '确定', onPress: () => setModalVisible(false) }]
      );
    } finally {
      console.log('🔥📚 ArticleScreen: loadArticles finished, resetting loading states');
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // 文章渐进式加载主函数
  const startArticleProgressiveLoading = async (startBatch: number = 0) => {
    setIsProgressiveLoading(true);
    setProgressiveLoadCompleted(false);
    
    if (startBatch === 0) {
      setHasMoreData(true);
    }
    
    const maxBatches = startBatch + totalInitialBatches;
    
    try {
      // 第一步：立即加载第一批数据
      if (startBatch === 0) {
        const firstResult = await loadArticleBatchData(0, true);
        if (!firstResult.success) {
          throw new Error('Failed to load first batch');
        }
      }
      
      // 第二步：并行加载剩余批次
      const batchPromises: Promise<any>[] = [];
      const startIndex = startBatch === 0 ? 1 : startBatch;
      
      for (let batchIndex = startIndex; batchIndex < maxBatches; batchIndex++) {
        batchPromises.push(loadArticleBatchData(batchIndex, false));
      }
      
      console.log(`📦 ArticleScreen: Starting parallel loading of ${batchPromises.length} article batches`);
      
      const results = await Promise.all(batchPromises);
      
      const successfulResults = results.filter((result: any) => result.success);
      const lastResult = successfulResults[successfulResults.length - 1] as any;
      
      const expectedLimit = progressiveBatchSize;
      const actualLastBatchSize = lastResult ? (lastResult.total - (maxBatches - 1) * progressiveBatchSize) : 0;
      const hasMoreData = lastResult?.hasMore && actualLastBatchSize >= expectedLimit;
      
      setHasMoreData(hasMoreData);
      setProgressiveLoadCompleted(true);
      
      console.log(`✅ ArticleScreen: Article progressive loading completed`, {
        totalBatches: results.length,
        successfulBatches: successfulResults.length,
        hasMore: hasMoreData
      });
      
    } catch (error) {
      console.error('❌ Article progressive loading failed:', error);
      setHasMoreData(false);
    } finally {
      setIsProgressiveLoading(false);
    }
  };

  // 文章渐进式加载单个批次的数据
  const loadArticleBatchData = async (batchIndex: number, isNewSession: boolean = false) => {
    try {
      const isFirstBatch = batchIndex === 0;
      const currentBatchSize = isFirstBatch ? initialBatchSize : progressiveBatchSize;
      const skip = isFirstBatch ? 0 : initialBatchSize + (batchIndex - 1) * progressiveBatchSize;
      
      console.log(`🔄 ArticleScreen: Loading article batch ${batchIndex}, skip: ${skip}, limit: ${currentBatchSize}`);
      
      let categoryFilter = '';
      
      // 设置分类过滤
      if (activeCategory && categoryMap[activeCategory]) {
        categoryFilter = categoryMap[activeCategory];
      }

      // 使用 listChainalertContent API 调用格式
      let newArticles;
      if (debouncedSearchText.trim()) {
        console.log('🔍 ArticleScreen: Searching with keyword:', debouncedSearchText.trim());
        // 搜索模式：使用第6个参数传递搜索关键词，前3个参数都为空字符串
        newArticles = await newsService.callAPIDirectly([
          "",
          "",
          "", // 搜索时分类参数为空，搜索所有分类
          skip.toString(),
          currentBatchSize.toString(),
          debouncedSearchText.trim()
        ]);
      } else if (categoryFilter) {
        // 分类模式：使用分类过滤
        newArticles = await newsService.callAPIDirectly([
          "",
          "",
          categoryFilter,
          skip.toString(),
          currentBatchSize.toString(),
          ""
        ]);
      } else {
        // 默认模式：使用第一个配置的分类
        const firstCategoryApi = articleCategories.length > 0 ? categoryMap[articleCategories[0]] : 'stockquicknews';
        newArticles = await newsService.callAPIDirectly([
          "",
          "",
          firstCategoryApi,
          skip.toString(),
          currentBatchSize.toString(),
          ""
        ]);
      }
      
      // 格式化新闻日期 - 确保日期格式统一
      const formatNewsDate = (article: NewsArticle) => {
        try {
          let formattedDate: string;
          
          // 如果已经有相对时间格式（如 "8分钟前"），保持原样
          if (typeof article.date === 'string' && 
              (article.date.includes('分钟前') || 
               article.date.includes('小时前') || 
               article.date.includes('天前') || 
               article.date === '刚刚')) {
            formattedDate = article.date;
          } else {
            // 使用 newsService 的格式化方法
            formattedDate = newsService.formatDate(article.date);
          }
          
          return {
            ...article,
            date: formattedDate,
            originalDate: article.date // 保存原始日期用于分组
          };
        } catch (error) {
          console.warn('Date formatting error:', error, article.date);
          return {
            ...article,
            date: article.date || new Date().toISOString(),
            originalDate: article.date || new Date().toISOString()
          };
        }
      };

      const formattedArticles = (Array.isArray(newArticles) ? newArticles : []).map(formatNewsDate);
      
      if (formattedArticles.length > 0) {
        // 更新文章列表
        if (isNewSession && batchIndex === 0) {
          setArticles(formattedArticles);
        } else {
          setArticles(prev => [...prev, ...formattedArticles]);
        }
        
        console.log(`✅ ArticleScreen: Article batch ${batchIndex} loaded successfully, ${formattedArticles.length} articles`);
      }
      
      return { 
        success: true, 
        hasMore: formattedArticles.length === currentBatchSize,
        total: skip + formattedArticles.length,
        batchSize: currentBatchSize
      };
      
    } catch (error) {
      console.error(`❌ Failed to load article batch ${batchIndex}:`, error);
      return { success: false, hasMore: false, total: 0 };
    }
  };

  // 单独的搜索函数，不使用progressive loading，避免focus loss
  const loadSearchResults = async () => {
    console.log('🔍 ArticleScreen: loadSearchResults called for:', debouncedSearchText);
    
    if (!debouncedSearchText.trim()) {
      console.log('🔍 ArticleScreen: Empty search text, skipping');
      return;
    }

    try {
      // 不设置loading状态，避免重新渲染导致焦点丢失
      setError(null);

      console.log('🔍 ArticleScreen: Making single search API call');
      
      // 使用单次API调用获取所有搜索结果，不使用progressive loading
      const searchResults = await newsService.callAPIDirectly([
        "",
        "",
        "", // 搜索时分类参数为空，搜索所有分类
        "0", // skip从0开始
        "1000", // 获取更多结果，但不是progressive loading
        debouncedSearchText.trim()
      ]);

      console.log('🔍 ArticleScreen: Search API response:', {
        resultsCount: searchResults?.length || 0,
        keyword: debouncedSearchText.trim()
      });

      if (searchResults && Array.isArray(searchResults)) {
        // 格式化搜索结果
        const formattedResults = searchResults.map((article: any) => ({
          ...article,
          formattedDate: formatNewsDate(article)
        }));

        console.log('🔍 ArticleScreen: Setting search results:', formattedResults.length);
        
        // 直接设置搜索结果，不使用progressive loading逻辑
        setArticles(formattedResults);
        setHasMoreData(false); // 搜索结果不需要加载更多
        
        console.log('✅ ArticleScreen: Search completed successfully');
      } else {
        console.log('🔍 ArticleScreen: No search results found');
        setArticles([]);
        setHasMoreData(false);
      }

    } catch (error) {
      console.error('❌ ArticleScreen: Search failed:', error);
      setError(error instanceof Error ? error.message : 'Search failed');
      setArticles([]);
    } finally {
      // 不重置loading状态，因为搜索时没有设置loading
      console.log('🔍 ArticleScreen: Search loading completed');
    }
  };

  // 格式化新闻日期的辅助函数
  const formatNewsDate = (article: any) => {
    try {
      let formattedDate: string;
      
      // 如果已经有相对时间格式（如 "8分钟前"），保持原样
      if (article.date && (article.date.includes('分钟前') || article.date.includes('小时前') || article.date.includes('天前'))) {
        formattedDate = article.date;
      } else {
        // 尝试解析和格式化日期
        const dateStr = article.publishedAt || article.createdAt || article.date;
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffMins < 60) {
              formattedDate = `${diffMins}分钟前`;
            } else if (diffHours < 24) {
              formattedDate = `${diffHours}小时前`;
            } else if (diffDays < 7) {
              formattedDate = `${diffDays}天前`;
            } else {
              formattedDate = date.toLocaleDateString('zh-CN', { 
                month: 'numeric', 
                day: 'numeric' 
              });
            }
          } else {
            formattedDate = '刚刚';
          }
        } else {
          formattedDate = '刚刚';
        }
      }
      
      return formattedDate;
    } catch (error) {
      console.error('Date formatting error:', error);
      return '刚刚';
    }
  };

  // 分类切换处理函数 - 使用useCallback避免重新渲染
  const handleCategoryPress = React.useCallback((category: string) => {
    console.log('🔥🏷️ ArticleScreen: handleCategoryPress called', { 
      currentCategory: activeCategory, 
      newCategory: category,
      isSame: category === activeCategory,
      categoryApi: categoryMap[category]
    });
    
    if (category !== activeCategory) {
      console.log('🔥🏷️ ArticleScreen: Category changed, updating states');
      setActiveCategory(category);
      setCurrentPage(1);
      setDisplayedItemCount(initialBatchSize); // 重置显示数量
      loadArticles(true);
      console.log('🔥🏷️ ArticleScreen: Category change completed');
    } else {
      console.log('🔥🏷️ ArticleScreen: Same category clicked, no change needed');
    }
  }, [activeCategory, initialBatchSize, categoryMap]);

  // 下拉刷新
  const handleRefresh = () => {
    setRefreshing(true);
    setDisplayedItemCount(initialBatchSize); // 重置显示数量
    loadArticles(true);
  };

  // 加载更多数据 - 支持渐进式加载
  const loadMoreData = React.useCallback(() => {
    console.log('📊 ArticleScreen: loadMoreData called', { 
      loadingMore, 
      hasMoreData, 
      searchText: debouncedSearchText.trim(),
      displayedItemCount,
      articlesLength: articles.length 
    });
    
    // 如果正在加载或没有更多数据，则不执行加载
    if (loadingMore || !hasMoreData) {
      console.log('📊 ArticleScreen: loadMoreData skipped', { 
        loadingMore, 
        hasMoreData
      });
      return;
    }
    
    // 搜索状态下的加载更多处理
    if (debouncedSearchText.trim()) {
      console.log('📊 ArticleScreen: Loading more search results');
      setLoadingMore(true);
      
      // 计算搜索结果的下一个批次
      let nextBatchIndex = Math.floor(articles.length / progressiveBatchSize);
      
      startArticleProgressiveLoading(nextBatchIndex)
        .catch(error => {
          console.error('❌ ArticleScreen: Failed to load more search results:', error);
          showMessageModal(
            'error',
            '加载失败',
            '加载更多搜索结果失败',
            [{ text: '确定', onPress: () => setModalVisible(false) }]
          );
        })
        .finally(() => {
          setLoadingMore(false);
        });
      return;
    }
    
    // 普通状态下的加载更多处理
    // 如果还有未显示的数据，先显示已加载的数据
    if (displayedItemCount < articles.length) {
      const nextCount = Math.min(displayedItemCount + 10, articles.length); // 每次显示更多10条
      console.log('📊 ArticleScreen: Showing more loaded data', { from: displayedItemCount, to: nextCount });
      setDisplayedItemCount(nextCount);
      return;
    }
    
    // 如果所有已加载数据都显示了，继续加载更多数据
    console.log('📊 ArticleScreen: Loading next batch of data');
    setLoadingMore(true);
    
    // 继续渐进式加载更多文章数据
    // 计算下一个批次索引：第一批initialBatchSize条，后续每批progressiveBatchSize条
    let nextBatchIndex;
    if (articles.length <= initialBatchSize) {
      nextBatchIndex = 1; // 下一批是第二批
    } else {
      nextBatchIndex = Math.floor((articles.length - initialBatchSize) / progressiveBatchSize) + 1;
    }
    
    startArticleProgressiveLoading(nextBatchIndex)
      .catch(error => {
        console.error('❌ ArticleScreen: Failed to load more articles:', error);
        showMessageModal(
          'error',
          '加载失败',
          '加载更多数据失败',
          [{ text: '确定', onPress: () => setModalVisible(false) }]
        );
      })
      .finally(() => {
        setLoadingMore(false);
      });
  }, [loadingMore, hasMoreData, debouncedSearchText, articles.length, displayedItemCount, articleCategories, categoryMap]);

  // FlatList 的 onEndReached 处理函数
  const handleLoadMore = () => {
    if (!loadingMore && hasMoreData && articles.length > 0) {
      loadMoreData();
    }
  };

  // 过滤文章 - 支持显示数量限制  
  const filteredArticles = React.useMemo(() => {
    console.log('🔥🔍 ArticleScreen: filteredArticles useMemo triggered', {
      articlesLength: articles.length,
      debouncedSearchText,
      displayedItemCount,
      searchTrimmed: debouncedSearchText.trim()
    });
    
    const filtered = articles.filter(article => {
      const matchesSearch = debouncedSearchText.trim() === '' || 
        article.title.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
        (article.summary && article.summary.toLowerCase().includes(debouncedSearchText.toLowerCase()));
      
      return matchesSearch;
    });
    
    console.log('🔥🔍 ArticleScreen: Articles filtered', {
      originalCount: articles.length,
      filteredCount: filtered.length,
      isSearching: debouncedSearchText.trim() !== ''
    });
    
    // 如果是搜索状态，显示所有搜索结果
    if (debouncedSearchText.trim()) {
      console.log('🔥🔍 ArticleScreen: Search mode - returning all filtered results');
      return filtered;
    }
    
    // 如果不是搜索状态，限制显示数量
    const result = filtered.slice(0, displayedItemCount);
    console.log('🔥🔍 ArticleScreen: Normal mode - limiting to displayedItemCount', {
      slicedCount: result.length,
      displayedItemCount
    });
    
    return result;
  }, [articles, debouncedSearchText, displayedItemCount]);

  // 按日期分组文章
  const groupedArticles = React.useMemo(() => {
    console.log('🔥📅 ArticleScreen: groupedArticles useMemo triggered', {
      filteredArticlesLength: filteredArticles.length
    });
    
    const groups: { [key: string]: NewsArticle[] } = {};
    
    filteredArticles.forEach(article => {
      // 解析日期 - 支持多种日期格式，优先使用 originalDate
      let date: Date;
      const dateSource = article.originalDate || article.date;
      
      try {
        // 如果已经是 Date 对象
        if (dateSource instanceof Date) {
          date = dateSource;
        } 
        // 如果是时间戳（数字）
        else if (typeof dateSource === 'number') {
          date = new Date(dateSource);
        }
        // 如果是字符串
        else if (typeof dateSource === 'string') {
          // 跳过相对时间格式，使用当前时间
          if (dateSource.includes('分钟前') || 
              dateSource.includes('小时前') || 
              dateSource.includes('天前') || 
              dateSource === '刚刚') {
            date = new Date(); // 使用当前时间进行分组
          } else {
            // 处理各种字符串格式
            const dateStr = dateSource.trim();
            if (dateStr.includes('T') || dateStr.includes(':')) {
              // ISO 格式或带时间的格式
              date = new Date(dateStr);
            } else if (dateStr.includes('-') || dateStr.includes('/')) {
              // 日期格式 2024-01-01 或 2024/01/01
              date = new Date(dateStr);
            } else {
              // 其他格式
              date = new Date(dateStr);
            }
          }
        } else {
          date = new Date();
        }
        
        // 验证日期是否有效
        if (isNaN(date.getTime())) {
          console.warn('Invalid date:', dateSource);
          date = new Date(); // 使用当前时间作为默认值
        }
      } catch (error) {
        console.warn('Date parsing error:', error, dateSource);
        date = new Date(); // 使用当前时间作为默认值
      }
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateKey: string;
      const dateString = date.toDateString();
      const todayString = today.toDateString();
      const yesterdayString = yesterday.toDateString();
      
      if (dateString === todayString) {
        dateKey = '今天';
      } else if (dateString === yesterdayString) {
        dateKey = '昨天';
      } else {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        dateKey = `${month}月${day}日`;
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push({
        ...article,
        groupDate: date.toISOString() // 添加分组日期字段
      });
    });
    
    // 转换为数组格式并排序
    return Object.entries(groups)
      .map(([date, articles]) => ({ date, articles }))
      .sort((a, b) => {
        // 今天排在最前面，然后是昨天，然后按日期倒序
        if (a.date === '今天') return -1;
        if (b.date === '今天') return 1;
        if (a.date === '昨天') return -1;
        if (b.date === '昨天') return 1;
        return b.date.localeCompare(a.date);
      });
  }, [filteredArticles]);

  const handleArticlePress = (article: NewsArticle) => {
    console.log('🔗 ArticleScreen: 导航到文章详情:', article.title);
    console.log('🌐 平台环境:', Platform.OS);
    console.log('📱 当前导航状态:', navigation.getState());
    
    // 使用navigate而不是push，与MarketScreen保持一致
    navigation.navigate('ArticleDetail', { 
      articleId: article.id,
      article: article,
      fromArticleScreen: true,
      returnTo: 'ArticlesMain'
    });
  };

  // Modal辅助函数
  const showMessageModal = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    buttons: Array<{
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress: () => void;
    }> = [{ text: '确定', onPress: () => setModalVisible(false) }]
  ) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
    setModalButtons(buttons);
    setModalVisible(true);
  };

  const handleLoginPress = () => {
    setLoginModalVisible(true);
  };

  const handleUserPress = () => {
    if (currentUser) {
      navigation.navigate('UserStatus');
    } else {
      setLoginModalVisible(true);
    }
  };

  const handleLoginSuccess = (user: any) => {
    console.log('✅ ArticleScreen: 登录成功', user);
    showMessageModal(
      'success',
      '登录成功',
      `欢迎回来，${user.email}！`,
      [{ text: '确定', onPress: () => setModalVisible(false) }]
    );
  };

  const renderHeader = React.useCallback(() => {
    console.log('🔥🎨 ArticleScreen: renderHeader called', {
      searchText,
      searchPlaceholder,
      activeCategory,
      searchTextLength: searchText.length,
      articleCategoriesLength: articleCategories.length,
      articleCategories: articleCategories
    });
    
    return (
      <View style={styles.headerContainer}>
        {/* 搜索框 */}
        <CommonSearchBar
          placeholder={searchPlaceholder}
          value={searchText}
          onValueChange={(text) => {
            console.log('🔥🔍 ArticleScreen: CommonSearchBar onValueChange', { 
              oldValue: searchText, 
              newValue: text,
              oldLength: searchText.length,
              newLength: text.length
            });
            setSearchText(text);
            // 如果用户清空了搜索框，立即重置提交的搜索文本
            if (text.trim() === '') {
              console.log('🔥🔍 ArticleScreen: Search cleared, resetting submitted search');
              setSubmittedSearchText('');
            }
          }}
          onSubmitEditing={() => {
            console.log('🔥🔍 ArticleScreen: Search submitted via Enter key:', searchText);
            setSubmittedSearchText(searchText);
          }}
          showClearButton={true}
          style={{ marginHorizontal: 0, marginTop: 0, marginBottom: 12 }}
        />

        {/* 分类标签 */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {console.log('🔥🏷️ ArticleScreen: Rendering categories:', { 
            articleCategories, 
            length: articleCategories.length 
          })}
          {articleCategories.map((category) => {
            console.log('🔥🏷️ ArticleScreen: Rendering category:', category);
            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  activeCategory === category && styles.activeCategoryButton
                ]}
                onPress={() => {
                  console.log('🔥🏷️ ArticleScreen: Category pressed', { 
                    oldCategory: activeCategory, 
                    newCategory: category 
                  });
                  handleCategoryPress(category);
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.categoryText,
                  activeCategory === category && styles.activeCategoryText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [searchText, searchPlaceholder, activeCategory, articleCategories, handleCategoryPress]);

  // 日期分组头部组件
  const DateHeader = ({ date, displayText }: { date: string; displayText?: string }) => {
    const parseDate = (dateStr: string): Date => {
      try {
        // 尝试多种日期解析方式
        let parsedDate: Date;
        
        if (dateStr instanceof Date) {
          parsedDate = dateStr;
        } else if (typeof dateStr === 'string') {
          // 如果是 "今天"、"昨天" 这样的标识
          if (dateStr === '今天') {
            parsedDate = new Date();
          } else if (dateStr === '昨天') {
            parsedDate = new Date();
            parsedDate.setDate(parsedDate.getDate() - 1);
          } else if (dateStr.includes('月') && dateStr.includes('日')) {
            // 处理 "8月15日" 这样的格式
            const match = dateStr.match(/(\d+)月(\d+)日/);
            if (match) {
              const month = parseInt(match[1], 10) - 1; // 月份需要减1
              const day = parseInt(match[2], 10);
              parsedDate = new Date();
              parsedDate.setMonth(month);
              parsedDate.setDate(day);
            } else {
              parsedDate = new Date(dateStr);
            }
          } else {
            parsedDate = new Date(dateStr);
          }
        } else {
          parsedDate = new Date();
        }
        
        // 验证日期有效性
        if (isNaN(parsedDate.getTime())) {
          console.warn('Invalid date in DateHeader:', dateStr);
          parsedDate = new Date();
        }
        
        return parsedDate;
      } catch (error) {
        console.warn('Date parsing error in DateHeader:', error, dateStr);
        return new Date();
      }
    };

    const formatDateHeader = (dateStr: string) => {
      try {
        // 如果提供了 displayText，优先使用
        if (displayText) {
          return displayText;
        }
        
        // 如果已经是显示格式（今天、昨天），直接返回
        if (dateStr === '今天' || dateStr === '昨天') {
          return dateStr;
        }
        
        const date = parseDate(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const dateString = date.toDateString();
        const todayString = today.toDateString();
        const yesterdayString = yesterday.toDateString();
        
        if (dateString === todayString) {
          return '今天';
        } else if (dateString === yesterdayString) {
          return '昨天';
        } else {
          const month = date.getMonth() + 1;
          const day = date.getDate();
          return `${month}月${day}日`;
        }
      } catch (e) {
        console.warn('Error in formatDateHeader:', e, dateStr);
        return displayText || dateStr || '今天';
      }
    };

    const formatWeekday = (dateStr: string) => {
      try {
        const date = parseDate(dateStr);
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const dayIndex = date.getDay();
        return weekdays[dayIndex] || '星期一';
      } catch (e) {
        console.warn('Error in formatWeekday:', e, dateStr);
        return '星期一';
      }
    };

    const getDateNumber = (dateStr: string) => {
      try {
        const date = parseDate(dateStr);
        const day = date.getDate();
        return day.toString();
      } catch (e) {
        console.warn('Error in getDateNumber:', e, dateStr);
        return new Date().getDate().toString();
      }
    };

    const getMonthName = (dateStr: string) => {
      try {
        const date = parseDate(dateStr);
        const month = date.getMonth() + 1;
        return `${month}月`;
      } catch (e) {
        console.warn('Error in getMonthName:', e, dateStr);
        return `${new Date().getMonth() + 1}月`;
      }
    };

    return (
      <View style={styles.dateHeaderContainer}>
        <View style={styles.dateHeaderLeft}>
          <Text style={styles.dateHeaderMonth}>{getMonthName(date)}</Text>
          <Text style={styles.dateHeaderDay}>{getDateNumber(date)}</Text>
        </View>
        <View style={styles.dateHeaderRight}>
          <Text style={styles.dateHeaderTitle}>{formatDateHeader(date)}</Text>
          <Text style={styles.dateHeaderWeekday}>{formatWeekday(date)}</Text>
        </View>
      </View>
    );
  };

  const renderArticleItem = ({ item }: { item: { date: string; articles: NewsArticle[] } }) => {
    // 使用分组的第一篇文章的 groupDate 作为日期头部的数据源
    const firstArticle = item.articles[0];
    const headerDateSource = firstArticle?.groupDate || firstArticle?.originalDate || firstArticle?.date || new Date().toISOString();
    
    return (
      <View key={item.date}>
        {/* 日期头部 */}
        <DateHeader date={headerDateSource} displayText={item.date} />
        
        {/* 该日期下的文章列表 */}
        {item.articles.map((article, index) => (
          <TimelineNewsCard
            key={article.id || index}
            article={article}
            onPress={() => handleArticlePress(article)}
            isLast={index === item.articles.length - 1}
            // 根据文章类别与配置映射，传入显示标签
            categoryLabel={((): string => {
              try {
                // article.category 可能是 API 的 menu 值（如 stockquicknews），也可能是中文显示名
                const raw = (article as any).category as string | undefined;
                if (!raw) return '';
                // 优先使用 reverseCategoryMap[api] -> 显示名
                if (reverseCategoryMap && reverseCategoryMap[raw]) return reverseCategoryMap[raw];
                // 如果 raw 已经是显示名，但也存在映射表，尝试通过 categoryMap 反推出 api，并再映射一次
                if (categoryMap && categoryMap[raw]) {
                  const apiKey = categoryMap[raw];
                  return reverseCategoryMap[apiKey] || raw;
                }
                return raw;
              } catch (e) {
                return (article as any).category || '';
              }
            })()}
          />
        ))}
      </View>
    );
  };

  const renderLoadingItem = () => (
    <View style={styles.skeletonContainer}>
      <View style={styles.articleSkeleton}>
        {/* Timeline dot */}
        <View style={styles.timelineSkeletonDot} />
        
        {/* Content */}
        <View style={styles.articleContentSkeleton}>
          <SkeletonBox width="30%" height={12} style={{ marginBottom: 4 }} />
          <SkeletonBox width="40%" height={10} style={{ marginBottom: 12 }} />
          <SkeletonBox width="90%" height={16} style={{ marginBottom: 6 }} />
          <SkeletonBox width="75%" height={14} style={{ marginBottom: 12 }} />
          <View style={styles.articleMetaSkeleton}>
            <SkeletonBox width="25%" height={12} />
            <SkeletonBox width="20%" height={12} />
          </View>
        </View>
      </View>
    </View>
  );

  const renderFooter = () => {
    // 显示滚动加载更多的状态
    if (loadingMore) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>加载更多...</Text>
        </View>
      );
    }
    
    // 显示渐进式加载状态
    if (isProgressiveLoading && !loading && articles.length > 0) {
      const activeBatchCount = activeBatchLoaders.size;
      const totalBatches = totalInitialBatches;
      const loadedBatches = currentLoadingBatch;
      
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#007AFF" style={{ opacity: 0.8 }} />
          <Text style={[styles.loadingText, { opacity: 0.8 }]}>
            智能加载中... {loadedBatches}/{totalBatches} ({activeBatchCount} 个并行)
          </Text>
        </View>
      );
    }

    if (!hasMoreData && articles.length > 0) {
      return (
        <View style={styles.loadingFooter}>
          <Text style={styles.noMoreDataText}>没有更多数据了</Text>
        </View>
      );
    }

    return null;
  };

  const renderLoadingScreen = () => (
    <View style={styles.container}>
      <TodayHeader 
        activeTab="articles"
        onBackPress={() => navigation.goBack()}
        onLoginPress={handleLoginPress}
        onUserPress={handleUserPress}
        title={screenTitle}
      />
      <View style={styles.loadingContainer}>
        {renderHeader()}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {[1, 2, 3, 4, 5].map((index) => (
            <View key={index} style={styles.skeletonContainer}>
              <View style={styles.newsCardSkeleton}>
                <SkeletonBox width={80} height={80} style={styles.newsCardImageSkeleton} />
                <View style={styles.newsCardContent}>
                  <SkeletonBox width="90%" height={16} style={{ marginBottom: 6 }} />
                  <SkeletonBox width="70%" height={14} style={{ marginBottom: 8 }} />
                  <SkeletonBox width="40%" height={12} />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  if (loading) {
    console.log('🔥🎨 ArticleScreen: Rendering loading screen');
    return renderLoadingScreen();
  }

  console.log('🔥🎨 ArticleScreen: Rendering main component', {
    articlesLength: articles.length,
    filteredArticlesLength: filteredArticles.length,
    groupedArticlesLength: groupedArticles.length,
    searchText,
    debouncedSearchText,
    activeCategory,
    loading,
    refreshing,
    loadingMore
  });

  return (
    <View style={styles.container}>
      <TodayHeader 
        activeTab="articles"
        onBackPress={() => navigation.goBack()}
        onLoginPress={handleLoginPress}
        onUserPress={handleUserPress}
        title={screenTitle}
      />

      <View style={styles.content}>
        {renderHeader()}
        <FlatList
          data={groupedArticles}
          renderItem={renderArticleItem}
          keyExtractor={(item) => item.date}
          // ListHeaderComponent removed to avoid remounting TextInput
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.emptyContainer}>
                <Ionicons name="newspaper-outline" size={50} color="#CCC" />
                <Text style={styles.emptyText}>
                  {debouncedSearchText.trim() ? '未找到相关快讯' : '暂无快讯'}
                </Text>
              </View>
            )
          }
          keyboardShouldPersistTaps="handled"
        />
      </View>

      {/* MessageModal */}
      <MessageModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        buttons={modalButtons}
        onClose={() => setModalVisible(false)}
      />

      {/* LoginModal */}
      <LoginModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  content: {
    flex: 1,
  },

  listContainer: {
    paddingBottom: 20,
  },

  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 24,
    textAlignVertical: 'center',
  },

  clearButton: {
    padding: 4,
  },

  categoriesContainer: {
    marginBottom: 0,
  },

  categoriesContent: {
    paddingHorizontal: 16,
    paddingRight: 32,
  },

  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 60,
    alignItems: 'center',
  },

  activeCategoryButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },

  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },

  activeCategoryText: {
    color: 'white',
    fontWeight: '600',
  },

  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'transparent',
  },

  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },

  noMoreDataText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Timeline skeleton styles
  skeletonContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },

  articleSkeleton: {
    flexDirection: 'row',
  },

  timelineSkeletonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E5E5',
    marginTop: 8,
    marginRight: 12,
  },

  articleContentSkeleton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },

  articleMetaSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  // 日期头部样式 - 参考PANews截图
  dateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },

  dateHeaderLeft: {
    width: 70,
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    marginRight: 0,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  dateHeaderMonth: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 1,
  },

  dateHeaderDay: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  dateHeaderRight: {
    flex: 1,
    paddingLeft: 16,
  },

  dateHeaderTitle: {
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '600',
    marginBottom: 2,
  },

  dateHeaderWeekday: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '400',
  },

  // 空状态样式
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },

  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default ArticleScreen;
