import configService from '../services/ConfigService';

/**
 * 配置服务测试示例
 */
const testConfigService = async () => {
  console.log('--------- 开始测试 ConfigService ---------');
  
  try {
    // 1. 初始化配置服务
    await configService.init();
    console.log('✅ 初始化成功');
    
    // 2. 获取美股列表
    const usStockList = await configService.getConfigAsArray('MARKET_LIST');
    console.log('美股列表:', usStockList);
    
    // 3. 获取首页显示的美股
    const homeDisplayStocks = await configService.getConfigAsArray('HOME_MARKET_DISPLAY');
    console.log('首页显示的美股:', homeDisplayStocks);
    
    // 4. 测试获取不存在的配置，使用默认值
    const nonExistentConfig = await configService.getConfig('NON_EXISTENT_KEY', '默认值');
    console.log('不存在的配置 (默认值):', nonExistentConfig);
    
    // 5. 获取所有配置
    const allConfigs = await configService.getAllConfigs();
    console.log('所有配置:', allConfigs);
    
    // 6. 强制刷新配置
    await configService.refreshConfigs();
    console.log('✅ 强制刷新成功');
    
    console.log('--------- ConfigService 测试完成 ---------');
  } catch (error) {
    console.error('❌ ConfigService 测试失败:', error);
  }
};

export default testConfigService;
