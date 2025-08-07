import { marketService } from '../services/MarketService';
import { configService } from '../services/ConfigService';

/**
 * 测试获取美股数据
 */
async function testGetUSStockHomeDisplay() {
  try {
    console.log('🧪 开始测试 getUSStockHomeDisplay...');
    
    // 先初始化配置服务
    await configService.init();
    
    // 获取配置中的美股代码
    const stockCodes = await configService.getConfig('HOME_MARKET_DISPLAY', '');
    console.log('📊 从配置中获取的美股代码:', stockCodes);
    
    // 获取美股数据
    const usStocks = await marketService.getUSStockHomeDisplay();
    console.log(`✅ 成功获取 ${usStocks.length} 只美股数据:`);
    
    // 打印每只股票的基本信息
    usStocks.forEach(stock => {
      console.log(`- ${stock.name}: $${stock.currentPrice} (${stock.priceChange24h})`);
    });
    
    return usStocks;
  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

/**
 * 测试直接调用 getMultipleCoinsInfo
 */
async function testGetMultipleCoinsInfo() {
  try {
    console.log('🧪 开始测试 getMultipleCoinsInfo...');
    
    // 直接使用固定的代码测试
    const coinCodes = 'BTC,ETH,USDT';
    console.log('📊 测试代码:', coinCodes);
    
    // 获取币种数据
    const coins = await marketService.getMultipleCoinsInfo(coinCodes);
    console.log(`✅ 成功获取 ${coins.length} 个币种数据:`);
    
    // 打印每个币种的基本信息
    coins.forEach(coin => {
      console.log(`- ${coin.name}: $${coin.currentPrice} (${coin.priceChange24h})`);
    });
    
    return coins;
  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

// 执行测试
async function runTests() {
  console.log('🚀 开始执行 MarketService 测试...');
  
  try {
    // 测试 API 连接
    const connectionResult = await marketService.testConnection();
    console.log('📡 API 连接测试:', connectionResult ? '成功' : '失败');
    
    if (!connectionResult) {
      console.error('❌ API 连接失败，中止测试');
      return;
    }
    
    // 执行各个测试用例
    await testGetMultipleCoinsInfo();
    console.log('\n');
    await testGetUSStockHomeDisplay();
    
    console.log('\n✅ 所有测试完成');
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 自动执行测试
// 仅在直接运行此文件时执行，作为模块导入时不执行
if (require.main === module) {
  runTests();
}

export { testGetUSStockHomeDisplay, testGetMultipleCoinsInfo };
