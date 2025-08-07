import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import coinLogoService from '../../services/CoinLogoService';
import userCoinService from '../../services/UserCoinService';
import { useUser } from '../../contexts/UserContext';
// 导入图表组件
import SVGMiniPriceChart from '../charts/SVGMiniPriceChart';

// UI 颜色常量 - 与 MarketScreen 保持一致
const UI_COLORS = {
  primary: '#007AFF',
  background: '#f2f2f7',
  cardBackground: '#ffffff',
  text: '#1c1c1e',
  secondaryText: '#8e8e93',
  border: '#e5e5ea',
  shadow: 'rgba(0, 0, 0, 0.1)',
  success: '#34C759',
  danger: '#FF3B30',
};

// 定义币种卡片数据接口
export interface CoinCardData {
  id: string;
  name: string;
  fullName?: string; // 添加完整名称字段
  symbol?: string;
  price: string;
  change: string;
  isPositive: boolean;
  logo?: string;
  rank?: number;
  marketCap?: string;
  volume?: string;
  priceChangeDirection?: 'up' | 'down' | null;
  coin24h?: Array<{    // 24小时价格变化数据
    price: number;
    createdAt: string;
  }>;
}

// 定义卡片样式类型
export type CoinCardVariant = 'default' | 'compact' | 'detailed' | 'large';

// 定义使用场景类型
export type CoinCardContext = 'home' | 'market' | 'search';

interface CoinCardProps {
  data: CoinCardData;
  variant?: CoinCardVariant;
  context?: CoinCardContext; // 新增：使用场景
  onPress?: (name: string, fullName?: string) => void; // 更新参数以支持fullName
  showRank?: boolean;
  showMarketCap?: boolean;
  showVolume?: boolean;
  customStyle?: any;
  showFavoriteButton?: boolean; // 新增：是否显示自选按钮
  isFavorited?: boolean; // 新增：是否已自选
  onFavoritePress?: (coinSymbol: string, isAdding: boolean) => void; // 新增：自选按钮回调
  onLoginRequired?: () => void; // 新增：需要登录时的回调
  showChart?: boolean; // 新增：是否显示24小时价格图表
}

const CoinCard: React.FC<CoinCardProps> = ({
  data,
  variant = 'default',
  context = 'home', // 默认为首页场景
  onPress,
  showRank = false,
  showMarketCap = false,
  showVolume = false,
  customStyle,
  showFavoriteButton = false,
  isFavorited = false, // 默认未自选
  onFavoritePress,
  onLoginRequired,
  showChart = true, // 默认显示图表，包括首页
}) => {
  const [imageError, setImageError] = useState(false);
  const [currentLogoUrl, setCurrentLogoUrl] = useState(data.logo || '');
  const [isLoadingIcon, setIsLoadingIcon] = useState(false);
  const [isAddingToFavorites, setIsAddingToFavorites] = useState(false);
  const [favoriteAdded, setFavoriteAdded] = useState(false);
  
  const { currentUser } = useUser();

  // 图标加载逻辑
  React.useEffect(() => {
    const loadIcon = async () => {
      // 如果已经有logo且没有错误，就不需要重新加载
      if (data.logo && !imageError) {
        setCurrentLogoUrl(data.logo);
        return;
      }
      
      // 如果没有logo或者有错误，才重新加载
      if (data.symbol || data.name) {
        try {
          // 使用symbol或name来获取图标
          const symbol = data.symbol || data.name;
          
          // 先快速获取同步URL用于立即显示
          const syncUrl = coinLogoService.getLogoUrlSync(symbol);
          setCurrentLogoUrl(syncUrl);
          
          // 然后异步获取更好的缓存版本
          setIsLoadingIcon(true);
          const asyncUrl = await coinLogoService.getLogoUrl(symbol);
          if (asyncUrl !== syncUrl) {
            setCurrentLogoUrl(asyncUrl);
          }
        } catch (error) {
          console.warn('Failed to load icon:', error);
          // 如果异步加载失败，保持同步URL
        } finally {
          setIsLoadingIcon(false);
        }
      }
    };

    loadIcon();
  }, [data.symbol, data.name, data.logo, imageError]);

  const handlePress = () => {
    if (onPress) {
      // 传递coin.symbol而不是id，以及fullName用于区分同名币种
      onPress(data.name, data.fullName);
    }
  };

  // 处理自选按钮点击
  const handleFavoritePress = async () => {
    const isRemoving = isFavorited; // 如果当前是已自选状态，则执行移除操作
    const actionText = isRemoving ? '移除自选' : '添加自选';
    
    console.log('🔥 CoinCard: 自选按钮被点击!', { 
      coinName: data.name, 
      currentUser: !!currentUser,
      userEmail: currentUser?.email || 'null',
      action: actionText,
      isFavorited: isFavorited
    });
    
    // 检查用户是否登录
    if (!currentUser) {
      console.log('❌ CoinCard: 用户未登录，触发登录回调');
      if (onLoginRequired) {
        onLoginRequired();
      } else {
        // 如果没有登录回调，显示简单提示（但在MarketScreen中应该有回调）
        console.warn('⚠️ CoinCard: 没有提供onLoginRequired回调');
      }
      return;
    }

    try {
      console.log(`⏳ CoinCard: 开始${actionText}...`);
      setIsAddingToFavorites(true);
      
      const coinSymbol = data.symbol || data.name;
      console.log('🪙 CoinCard: 币种符号:', coinSymbol);
      console.log('👤 CoinCard: 当前用户邮箱:', currentUser.email);
      
      // 根据当前状态选择API
      const response = isRemoving 
        ? await userCoinService.removeUserCoin(currentUser.email, coinSymbol)
        : await userCoinService.addUserCoin(currentUser.email, coinSymbol);
        
      console.log(`✅ CoinCard: ${actionText} API响应:`, response);
      
      if (response.success && response.data) {
        // 设置成功状态
        setFavoriteAdded(true);
        console.log(`🎉 CoinCard: ${actionText}成功，显示提示消息`);
        
        if (onFavoritePress) {
          // 传递操作类型：添加(true)或移除(false)
          onFavoritePress(coinSymbol, !isRemoving);
        }
        
        // 3秒后恢复原始状态
        setTimeout(() => {
          setFavoriteAdded(false);
        }, 3000);
      } else {
        throw new Error(response.error || `${actionText}失败`);
      }
    } catch (error: any) {
      console.error(`❌ CoinCard: ${actionText}失败:`, error);
      
      // 检查是否为登录过期错误
      if (error.message && error.message.includes('登录已过期')) {
        console.log('🚫 CoinCard: 检测到登录过期，提示用户重新登录');
        if (onLoginRequired) {
          onLoginRequired();
        }
        return;
      }
      
      // 这里不显示Alert，让父组件处理错误提示
      if (onFavoritePress) {
        // 可以通过回调通知父组件发生了错误
        console.log(`📢 CoinCard: 通知父组件${actionText}失败`);
      }
    } finally {
      setIsAddingToFavorites(false);
      console.log(`🏁 CoinCard: ${actionText}操作完成`);
    }
  };

  // 处理图标加载失败，尝试回退
  const handleImageError = () => {
    console.warn('Image load failed for:', data.name, 'URL:', currentLogoUrl);
    setImageError(true);
    
    // 尝试使用CoinLogoService的回退机制
    try {
      const fallbackUrl = coinLogoService.handleIconError(data.symbol || data.name, currentLogoUrl);
      if (fallbackUrl && fallbackUrl !== currentLogoUrl) {
        setCurrentLogoUrl(fallbackUrl);
        setImageError(false); // 重置错误状态，给回退URL一个机会
      }
    } catch (error) {
      console.warn('Fallback also failed:', error);
    }
  };

  const getCardStyle = () => {
    const baseStyles = [styles.coinCard];
    
    // 根据variant添加样式
    switch (variant) {
      case 'compact':
        baseStyles.push(styles.compactCard);
        break;
      case 'detailed':
        baseStyles.push(styles.detailedCard);
        break;
      case 'large':
        baseStyles.push(styles.largeCard);
        break;
      default:
        break;
    }
    
    // 根据context添加样式
    switch (context) {
      case 'market':
        baseStyles.push(styles.marketContextCard);
        break;
      case 'search':
        baseStyles.push(styles.searchContextCard);
        break;
      case 'home':
      default:
        baseStyles.push(styles.homeContextCard);
        break;
    }
    
    if (customStyle) {
      baseStyles.push(customStyle);
    }
    
    return baseStyles;
  };

  const getLogoSize = () => {
    switch (variant) {
      case 'compact': return { width: 28, height: 28, borderRadius: 14 };
      case 'large': return { width: 44, height: 44, borderRadius: 22 };
      default: return { width: 32, height: 32, borderRadius: 16 };
    }
  };

  const renderLogo = () => {
    const logoSize = getLogoSize();
    const logoStyles = [
      styles.coinLogo, 
      context === 'home' && styles.homeContextLogo, // 首页特定的logo样式
      logoSize
    ];
    
    // 如果正在加载图标，显示加载占位符
    if (isLoadingIcon) {
      return (
        <View style={[...logoStyles, styles.loadingLogo]}>
          <Text style={styles.loadingText}>⏳</Text>
        </View>
      );
    }
    
    if (currentLogoUrl && !imageError) {
      return (
        <Image 
          source={{ uri: currentLogoUrl }} 
          style={logoStyles}
          onError={handleImageError}
        />
      );
    }

    // 如果没有logo或加载失败，显示首字母
    return (
      <View style={[...logoStyles, styles.placeholderLogo]}>
        <Text style={[styles.placeholderText, variant === 'large' ? styles.largePlaceholderText : {}]}>
          {data.name.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  };

  const formatRank = (rank: number): string => {
    return rank.toString(); // 去掉#号，直接返回数字
  };

  const renderMainInfo = () => (
    <View style={[
      styles.coinInfo,
      // 根据是否有收藏按钮动态调整右边距
      showFavoriteButton ? styles.coinInfoWithFavorite : styles.coinInfoDefault
    ]}>
      <View style={styles.topRow}>
        {/* 左侧：币名（不包含排名） */}
        <View style={styles.nameContainer}>
          <Text style={[
            styles.coinName, 
            variant === 'compact' ? styles.compactCoinName : {},
            variant === 'large' ? styles.largeCoinName : {}
          ]}>
            {data.name}
          </Text>
          {/* 实时价格变动箭头 */}
          {data.priceChangeDirection && (
            <Ionicons
              name={data.priceChangeDirection === 'up' ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={data.priceChangeDirection === 'up' ? UI_COLORS.success : UI_COLORS.danger}
              style={styles.realTimeArrow}
            />
          )}
        </View>
        
        {/* 右侧：价格 */}
        <Text style={[
          styles.coinPrice,
          variant === 'compact' ? styles.compactPrice : {},
          variant === 'large' ? styles.largePrice : {}
        ]}>
          {data.price}
        </Text>
      </View>
      
      {/* 第二行：交易量和图表+涨跌幅 */}
      <View style={styles.bottomRow}>
        {/* 左侧：交易量（与币名左对齐） */}
        <View style={styles.volumeContainer}>
          {data.volume && (
            <Text style={[
              styles.volumeInfo,
              variant === 'compact' ? styles.compactVolume : {}
            ]}>
              Vol: {data.volume}
            </Text>
          )}
        </View>
        
        {/* 右侧：图表和涨跌幅 */}
        <View style={styles.chartAndChangeContainer}>
          {/* 24小时价格图表 */}
          {data.coin24h && data.coin24h.length > 1 && (
            <View style={styles.chartContainer}>
              <SVGMiniPriceChart
                data={data.coin24h}
                isPositive={data.isPositive}
                width={context === 'home' ? 50 : 55}
                height={context === 'home' ? 24 : 26}
                strokeWidth={1.5}
                showFill={false}
              />
            </View>
          )}
          
          {/* 涨跌幅 */}
          <Text style={[
            styles.coinChange,
            { color: data.isPositive ? UI_COLORS.success : UI_COLORS.danger },
            variant === 'compact' ? styles.compactChange : {}
          ]}>
            {data.change}
          </Text>
        </View>
      </View>
      
      {/* 详细信息（仅在特定变体中显示） */}
      {(variant === 'detailed' || variant === 'large') && (
        <View style={styles.detailsContainer}>
          {showMarketCap && data.marketCap && (
            <Text style={styles.marketCapText}>市值: {data.marketCap}</Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={getCardStyle()}>
      <TouchableOpacity 
        style={[
          styles.coinCardContent,
          context === 'home' && styles.homeContextContent // 首页特定的内容样式
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {/* 排名（绝对定位在卡片中心） */}
        {showRank && data.rank && (
          <View style={styles.rankContainer}>
            <Text style={styles.rankText}>{formatRank(data.rank)}</Text>
          </View>
        )}
        
        {renderLogo()}
        {renderMainInfo()}
      </TouchableOpacity>
      
      {/* 自选按钮作为绝对定位的覆盖层，不影响布局对齐 */}
      {showFavoriteButton && (
        <TouchableOpacity 
          style={[
            styles.favoriteButton,
            context === 'market' ? styles.favoriteButtonMarket : styles.favoriteButtonHome,
            favoriteAdded && styles.favoriteButtonSuccess
          ]}
          onPress={() => {
            console.log('🔥 CoinCard: 自选按钮TouchableOpacity被点击!', { 
              coinName: data.name, 
              isFavorited: isFavorited,
              favoriteAdded: favoriteAdded 
            });
            
            handleFavoritePress(); // 统一处理添加/移除自选逻辑
          }}
          disabled={isAddingToFavorites || favoriteAdded}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={
              favoriteAdded 
                ? "checkmark-circle" // 操作成功：勾选图标
                : isAddingToFavorites 
                  ? "hourglass-outline" // 操作中：沙漏图标
                  : isFavorited 
                    ? "star" // 已自选：填充星星（点击可移除）
                    : "star-outline" // 未自选：空心星星（点击可添加）
            } 
            size={18} 
            color={
              favoriteAdded 
                ? "#34C759" // 操作成功：绿色
                : isAddingToFavorites 
                  ? UI_COLORS.secondaryText // 操作中：灰色
                  : isFavorited 
                    ? "#FFD700" // 已自选：金黄色
                    : UI_COLORS.primary // 未自选：主色调
            }
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  coinCard: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14, // 稍微增加垂直间距
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: UI_COLORS.border,
    backgroundColor: '#ffffff', // 强制设置为白色，确保在所有平台上一致
    minHeight: 70, // 稍微增加最小高度，给两行布局更多空间
  },
  compactCard: {
    paddingVertical: 8,
  },
  detailedCard: {
    paddingVertical: 16,
    borderBottomWidth: 0,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  largeCard: {
    paddingVertical: 20,
    borderBottomWidth: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    marginVertical: 6,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coinLogo: {
    marginRight: 12, // 增加与右侧内容的间距
    backgroundColor: '#F0F0F0',
  },
  placeholderLogo: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
  },
  loadingLogo: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.6,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  largePlaceholderText: {
    fontSize: 18,
  },
  coinInfo: {
    flex: 1,
  },
  coinInfoDefault: {
    paddingRight: 8, // 无收藏按钮时的右边距
  },
  coinInfoWithFavorite: {
    paddingRight: 50, // 有收藏按钮时增加右侧空间
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // 改为flex-start，让元素顶部对齐
    marginTop: 2, // 添加上边距
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  volumeContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  chartAndChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // 图表和涨跌幅之间的间距
    justifyContent: 'flex-end', // 右对齐，与价格对齐
  },
  detailsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: UI_COLORS.border,
  },
  rankText: {
    fontSize: 12, // 更小的字体
    color: UI_COLORS.secondaryText, // 使用次要文字颜色，更低调
    fontWeight: '600', // 中等粗细
    textAlign: 'center',
    opacity: 0.8,
  },
  coinName: {
    fontSize: 16, // 稍微增大字体
    fontWeight: '600',
    color: UI_COLORS.text,
    lineHeight: 20,
    letterSpacing: -0.2,
    maxWidth: '65%', // 限制最大宽度，避免挤压价格
  },
  compactCoinName: {
    fontSize: 14,
  },
  largeCoinName: {
    fontSize: 18,
  },
  coinSymbol: {
    fontSize: 13,
    color: UI_COLORS.secondaryText,
    marginTop: 2,
    lineHeight: 16,
  },
  compactCoinSymbol: {
    fontSize: 12,
  },
  marketCapText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  volumeText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  coinCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 44, // 为排名留出左侧空间（12px left + 28px width + 4px margin）
  },
  realTimeArrow: {
    marginLeft: 6,
    opacity: 0.8,
  },
  favoriteButton: {
    position: 'absolute',
    right: 8, // 稍微减少右边距
    top: '50%',
    marginTop: -16, // 一半的按钮高度，确保垂直居中
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    zIndex: 10, // 确保在其他元素之上
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  favoriteButtonSuccess: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
  },
  // Context相关样式
  homeContextCard: {
    // 首页特定样式 - 减少左侧间距让内容更靠左
    backgroundColor: '#ffffff',
  },
  homeContextContent: {
    // 首页内容容器特定样式 - 减少左边距
    paddingLeft: 8, // 大幅减少左边距，让内容更靠左
  },
  homeContextLogo: {
    // 首页logo特定样式 - 减少右边距
    marginRight: 8, // 减少logo右边距，让名称和VOL更靠左
  },
  marketContextCard: {
    // Market页面特定样式
    paddingVertical: 14, // 稍微增加垂直间距
    paddingHorizontal: 18, // 增加水平间距，使内容更宽松
    backgroundColor: '#ffffff', // 强制设置白色背景，确保Android一致性
  },
  searchContextCard: {
    // 搜索页面特定样式
    backgroundColor: '#ffffff', // 确保搜索页面也是白色背景
  },
  // 自选按钮在不同context下的位置
  favoriteButtonHome: {
    right: 8, // 首页位置，稍微调整
  },
  favoriteButtonMarket: {
    right: 12, // Market页面保持稍大间距
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  volumeInfo: {
    fontSize: 12,
    color: UI_COLORS.secondaryText,
    fontWeight: '400',
    lineHeight: 16,
    opacity: 0.8,
  },
  compactVolume: {
    fontSize: 11,
  },
  coinPrice: {
    fontSize: 16, // 稍微增大价格字体
    fontWeight: '700', // 加粗价格
    color: UI_COLORS.text,
    lineHeight: 20,
    letterSpacing: -0.2,
    textAlign: 'right',
  },
  compactPrice: {
    fontSize: 14,
  },
  largePrice: {
    fontSize: 18,
  },
  coinChange: {
    fontSize: 13, // 稍微增大涨跌幅字体
    fontWeight: '600',
    lineHeight: 16,
    opacity: 0.95,
    textAlign: 'right',
  },
  compactChange: {
    fontSize: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6, // 两行之间的间距
  },
  rankContainer: {
    position: 'absolute',
    left: 12, // 放在最左侧
    top: '50%',
    marginTop: -10, // 垂直居中
    width: 28,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5, // 确保在其他元素之上但低于收藏按钮
  },
});

export default CoinCard;
