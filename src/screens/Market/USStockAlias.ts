/**
 * USStockAlias - 美股别称和关键词库
 * 用于丰富股票相关信息的查询和识别
 */

import configService from '../../services/ConfigService';

// 美股符号别名配置
const US_STOCK_SYMBOLS = {
  // 科技股 - FAANG+
  'AAPL': ['apple', 'aapl', '苹果', '苹果公司', 'iPhone', 'iPad', 'Mac', '库克', 'Tim Cook'],
  'GOOGL': ['google', 'googl', 'alphabet', '谷歌', '字母表', 'Gmail', 'YouTube', 'Chrome', 'Android', '皮查伊'],
  'GOOG': ['google', 'goog', 'alphabet', '谷歌'],
  'AMZN': ['amazon', 'amzn', '亚马逊', 'AWS', '贝索斯', 'Bezos'],
  'MSFT': ['microsoft', 'msft', '微软', 'Windows', 'Office', 'Azure', 'Xbox'],
  'TSLA': ['tesla', 'tsla', '特斯拉', 'Model S', 'Model 3', 'Model X', 'Model Y', '马斯克'],
  'META': ['meta', 'facebook', 'fb', 'meta platforms', '脸书', '元宇宙', 'Instagram', 'WhatsApp', '扎克伯格', 'Zuckerberg'],
  'NFLX': ['netflix', 'nflx', '奈飞', '网飞'],
  
  // 芯片半导体
  'NVDA': ['nvidia', 'nvda', '英伟达', '黄仁勋', 'Jensen Huang'],
  'AMD': ['amd', 'advanced micro devices', 'AMD公司', 'Ryzen', 'EPYC'],
  'INTC': ['intel', 'intc', '英特尔', 'Core'],
  'QCOM': ['qualcomm', 'qcom', '高通', '骁龙', 'Snapdragon', '5G'],
  'AVGO': ['broadcom', 'avgo', '博通'],
  'TSM': ['taiwan semiconductor', 'tsm', '台积电', '芯片代工'],
  'ASML': ['asml', 'asml holding', 'ASML公司', '光刻机'],
  'MU': ['micron', 'mu', '美光', '内存', 'DRAM', 'NAND'],
  
  // 金融股
  'JPM': ['jpmorgan', 'jpm', 'jpmorgan chase', '摩根大通'],
  'BAC': ['bank of america', 'bac', '美国银行'],
  'WFC': ['wells fargo', 'wfc', '富国银行'],
  'GS': ['goldman sachs', 'gs', '高盛'],
  'MS': ['morgan stanley', 'ms', '摩根士丹利'],
  'C': ['citigroup', 'c', '花旗集团'],
  'V': ['visa', 'v', '维萨'],
  'MA': ['mastercard', 'ma', '万事达'],
  'PYPL': ['paypal', 'pypl', 'PayPal'],
  'SQ': ['square', 'sq', 'Block', 'Square公司'],
  
  // 股票相关
  'COIN': ['coinbase', 'coin', 'Coinbase'],
  'MSTR': ['microstrategy', 'mstr', '微策略', 'Bitcoin'],
  'HOOD': ['robinhood', 'hood', 'Robinhood'],
  'RIOT': ['riot platforms', 'riot', '比特币挖矿', '股票'],
  'MARA': ['marathon digital', 'mara', '比特币挖矿', '股票'],
  
  // 医疗健康
  'JNJ': ['johnson & johnson', 'jnj', '强生'],
  'PFE': ['pfizer', 'pfe', '辉瑞', 'COVID'],
  'ABBV': ['abbvie', 'abbv', 'AbbVie'],
  'MRK': ['merck', 'mrk', '默克'],
  'TMO': ['thermo fisher', 'tmo', '赛默飞世尔'],
  'ABT': ['abbott', 'abt', '雅培'],
  'DHR': ['danaher', 'dhr', '丹纳赫'],
  
  // 消费品
  'KO': ['coca cola', 'ko', '可口可乐'],
  'PEP': ['pepsico', 'pep', '百事可乐'],
  'WMT': ['walmart', 'wmt', '沃尔玛'],
  'COST': ['costco', 'cost', '好市多'],
  'HD': ['home depot', 'hd', '家得宝'],
  'MCD': ['mcdonalds', 'mcd', '麦当劳'],
  'SBUX': ['starbucks', 'sbux', '星巴克'],
  'NKE': ['nike', 'nke', '耐克'],
  'ADDYY': ['adidas', 'addyy', '阿迪达斯'],
  
  // 能源股
  'XOM': ['exxon mobil', 'xom', '埃克森美孚'],
  'CVX': ['chevron', 'cvx', '雪佛龙'],
  'COP': ['conocophillips', 'cop', '康菲石油'],
  'BP': ['bp', 'british petroleum', 'BP公司'],
  'SLB': ['schlumberger', 'slb', '斯伦贝谢'],
  
  // 工业股
  'BA': ['boeing', 'ba', '波音'],
  'CAT': ['caterpillar', 'cat', '卡特彼勒'],
  'GE': ['general electric', 'ge', '通用电气'],
  'MMM': ['3m', 'mmm', '3M公司'],
  'HON': ['honeywell', 'hon', '霍尼韦尔'],
  
  // 房地产
  'AMT': ['american tower', 'amt', '美国电塔'],
  'PLD': ['prologis', 'pld', '普洛斯'],
  'CCI': ['crown castle', 'cci', '皇冠城堡'],
  'EQIX': ['equinix', 'eqix', 'Equinix'],
  
  // 电商零售
  'SHOP': ['shopify', 'shop', 'Shopify'],
  'EBAY': ['ebay', 'ebay', 'eBay'],
  'ETSY': ['etsy', 'etsy', 'Etsy'],
  
  // 云服务与企业软件
  'CRM': ['salesforce', 'crm', 'Salesforce'],
  'ORCL': ['oracle', 'orcl', '甲骨文'],
  'NOW': ['servicenow', 'now', 'ServiceNow'],
  'ADBE': ['adobe', 'adbe', '奥多比', 'Creative Cloud', 'Photoshop'],
  'INTU': ['intuit', 'intu', 'Intuit', 'QuickBooks'],
  'ZM': ['zoom', 'zm', 'Zoom'],
  'TEAM': ['atlassian', 'team', 'Atlassian', 'Jira'],
  'WDAY': ['workday', 'wday', 'Workday'],
  
  // 社交媒体与通讯
  'SNAP': ['snapchat', 'snap', 'Snap Inc', 'Snapchat'],
  'PINS': ['pinterest', 'pins', 'Pinterest'],
  'TWTR': ['twitter', 'twtr', 'Twitter', '推特'],
  'MTCH': ['match group', 'mtch', 'Match Group', 'Tinder'],
  
  // 游戏娱乐
  'RBLX': ['roblox', 'rblx', 'Roblox'],
  'EA': ['electronic arts', 'ea', 'EA', 'FIFA', 'Madden'],
  'ATVI': ['activision blizzard', 'atvi', '暴雪', 'Call of Duty', 'World of Warcraft'],
  'TTWO': ['take-two', 'ttwo', 'Take-Two', 'GTA', 'Red Dead'],
  'DIS': ['disney', 'dis', '迪士尼', 'Disney+'],
  'NFLX': ['netflix', 'nflx', '奈飞', 'Netflix'],
  
  // 电动车与新能源
  'NIO': ['nio', 'nio', '蔚来'],
  'XPEV': ['xpeng', 'xpev', '小鹏汽车'],
  'LI': ['li auto', 'li', '理想汽车'],
  'LCID': ['lucid motors', 'lcid', 'Lucid'],
  'RIVN': ['rivian', 'rivn', 'Rivian'],
  'F': ['ford', 'f', '福特'],
  'GM': ['general motors', 'gm', '通用汽车'],
  
  // 新兴科技
  'PLTR': ['palantir', 'pltr', 'Palantir'],
  'SNOW': ['snowflake', 'snow', 'Snowflake'],
  'DDOG': ['datadog', 'ddog', 'Datadog'],
  'CRWD': ['crowdstrike', 'crwd', 'CrowdStrike'],
  'ZS': ['zscaler', 'zs', 'Zscaler'],
  'OKTA': ['okta', 'okta', 'Okta'],
  'NET': ['cloudflare', 'net', 'Cloudflare'],
  'TWLO': ['twilio', 'twlo', 'Twilio'],
  
  // 生物技术
  'GILD': ['gilead', 'gild', '吉利德'],
  'BIIB': ['biogen', 'biib', '百健'],
  'AMGN': ['amgen', 'amgn', '安进'],
  'REGN': ['regeneron', 'regn', 'Regeneron'],
  'VRTX': ['vertex', 'vrtx', 'Vertex'],
  'MRNA': ['moderna', 'mrna', 'Moderna', 'mRNA', 'COVID'],
  'BNTX': ['biontech', 'bntx', 'BioNTech', 'mRNA'],
  
  // ETF和指数
  'SPY': ['spy', 'spdr s&p 500', '标普500', 'S&P 500'],
  'QQQ': ['qqq', 'nasdaq 100', '纳斯达克100', 'NASDAQ'],
  'IWM': ['iwm', 'russell 2000', '罗素2000'],
  'VTI': ['vti', 'total stock market', '全市场', 'Vanguard'],
  'VOO': ['voo', 's&p 500', '标普500', 'Vanguard'],
  'ARKK': ['arkk', 'ark innovation', 'ARK'],
  'ARKG': ['arkg', 'ark genomics', 'ARK'],
  
  // 中概股
  'BABA': ['alibaba', 'baba', '阿里巴巴', '淘宝', '天猫', '马云'],
  'JD': ['jd.com', 'jd', '京东', '刘强东'],
  'PDD': ['pinduoduo', 'pdd', '拼多多'],
  'BIDU': ['baidu', 'bidu', '百度'],
  'NTES': ['netease', 'ntes', '网易'],
  'TME': ['tencent music', 'tme', '腾讯音乐'],
  'BILI': ['bilibili', 'bili', 'B站', '哔哩哔哩'],
  'TAL': ['tal education', 'tal', '好未来'],
  'EDU': ['new oriental', 'edu', '新东方'],
  
  // 其他重要股票
  'BRK.A': ['berkshire hathaway', 'brk.a', '伯克希尔', '巴菲特'],
  'BRK.B': ['berkshire hathaway', 'brk.b', '伯克希尔', '巴菲特'],
  'UNH': ['unitedhealth', 'unh', '联合健康'],
  'LLY': ['eli lilly', 'lly', '礼来'],
  'NVAX': ['novavax', 'nvax', 'Novavax', 'COVID'],
  'ZOM': ['zomedica', 'zom', 'Zomedica'],
};

// 本地美股别名配置
const LOCAL_US_STOCK_SYMBOLS = US_STOCK_SYMBOLS;

// 合并后的美股别名配置（会在初始化后更新）
let MERGED_US_STOCK_SYMBOLS = { ...LOCAL_US_STOCK_SYMBOLS };

// 初始化标志
let isInitialized = false;

// 初始化合并配置的异步函数
async function initializeUSStockAliases(): Promise<void> {
  try {
    // 确保 ConfigService 已初始化
    await configService.init();
    
    const remoteConfigStr = await configService.getConfig('US_STOCK_ALIAS', '{}');
    
    // 只有当远程配置不为空时才解析
    if (remoteConfigStr && remoteConfigStr !== '{}') {
      const remoteConfig = JSON.parse(remoteConfigStr);
      
      if (remoteConfig && typeof remoteConfig === 'object' && Object.keys(remoteConfig).length > 0) {
        // 远程配置覆盖本地配置：{...本地, ...远程}
        MERGED_US_STOCK_SYMBOLS = { ...LOCAL_US_STOCK_SYMBOLS, ...remoteConfig };
        console.log('✅ USStockAlias: Successfully merged remote config with', Object.keys(remoteConfig).length, 'symbols');
      } else {
        console.log('ℹ️ USStockAlias: Remote config is empty, using local only');
        MERGED_US_STOCK_SYMBOLS = { ...LOCAL_US_STOCK_SYMBOLS };
      }
    } else {
      console.log('ℹ️ USStockAlias: No remote config found, using local only');
      MERGED_US_STOCK_SYMBOLS = { ...LOCAL_US_STOCK_SYMBOLS };
    }
  } catch (error) {
    console.warn('⚠️ USStockAlias: Failed to initialize remote config, using local only:', error);
    MERGED_US_STOCK_SYMBOLS = { ...LOCAL_US_STOCK_SYMBOLS };
  }
  
  isInitialized = true;
}

// 获取合并后的美股别名配置（异步）
export async function getUSStockAliases(): Promise<Record<string, string[]>> {
  if (!isInitialized) {
    await initializeUSStockAliases();
  }
  return MERGED_US_STOCK_SYMBOLS;
}

// 美股符号标准化函数（异步）
export async function resolveUSStockSymbol(input: string): Promise<string> {
  if (!input) return '';
  
  const aliases = await getUSStockAliases();
  const normalizedInput = input.trim().toUpperCase();
  
  // 如果直接是符号，返回
  if (aliases[normalizedInput]) {
    return normalizedInput;
  }
  
  // 遍历所有别名，查找匹配
  for (const [symbol, aliasArray] of Object.entries(aliases)) {
    if (aliasArray.some(alias => 
      alias.toLowerCase() === input.toLowerCase().trim()
    )) {
      return symbol;
    }
  }
  
  // 如果没有找到匹配的别名，返回原始输入的大写形式
  return normalizedInput;
}

// 美股符号标准化函数（同步版本，仅使用本地配置）
export function resolveUSStockSymbolSync(input: string): string {
  if (!input) return '';
  
  const normalizedInput = input.trim().toUpperCase();
  
  // 如果直接是符号，返回
  if (LOCAL_US_STOCK_SYMBOLS[normalizedInput]) {
    return normalizedInput;
  }
  
  // 遍历所有别名，查找匹配
  for (const [symbol, aliases] of Object.entries(LOCAL_US_STOCK_SYMBOLS)) {
    if (aliases.some(alias => 
      alias.toLowerCase() === input.toLowerCase().trim()
    )) {
      return symbol;
    }
  }
  
  // 如果没有找到匹配的别名，返回原始输入的大写形式
  return normalizedInput;
}

// 根据股票代码获取所有别名和关键词
export async function getUSStockKeywords(stockCode: string): Promise<string[]> {
  if (!stockCode) return [];
  
  const aliases = await getUSStockAliases();
  const normalizedCode = stockCode.trim().toUpperCase();
  
  // 返回该股票代码的所有别名和关键词
  return aliases[normalizedCode] || [];
}

// 同步版本：根据股票代码获取所有别名和关键词
export function getUSStockKeywordsSync(stockCode: string): string[] {
  if (!stockCode) return [];
  
  const normalizedCode = stockCode.trim().toUpperCase();
  
  // 返回该股票代码的所有别名和关键词
  return LOCAL_US_STOCK_SYMBOLS[normalizedCode] || [];
}

// 生成股票的搜索关键词组合
export async function generateStockSearchTerms(stockCode: string, stockName?: string): Promise<string[]> {
  const searchTerms: string[] = [];
  
  // 添加股票代码
  if (stockCode) {
    searchTerms.push(stockCode.toUpperCase());
  }
  
  // 添加股票名称
  if (stockName) {
    searchTerms.push(stockName);
  }
  
  // 添加别名和关键词
  const keywords = await getUSStockKeywords(stockCode);
  searchTerms.push(...keywords);
  
  // 去重并返回
  return [...new Set(searchTerms)];
}

// 同步版本：生成股票的搜索关键词组合
export function generateStockSearchTermsSync(stockCode: string, stockName?: string): string[] {
  const searchTerms: string[] = [];
  
  // 添加股票代码
  if (stockCode) {
    searchTerms.push(stockCode.toUpperCase());
  }
  
  // 添加股票名称
  if (stockName) {
    searchTerms.push(stockName);
  }
  
  // 添加别名和关键词
  const keywords = getUSStockKeywordsSync(stockCode);
  searchTerms.push(...keywords);
  
  // 去重并返回
  return [...new Set(searchTerms)];
}

// 导出配置（同步，仅本地配置用于向后兼容）
export { LOCAL_US_STOCK_SYMBOLS as US_STOCK_SYMBOLS };
