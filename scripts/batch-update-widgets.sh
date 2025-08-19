#!/bin/bash

# 一次性更新所有剩余Widget的脚本

cd "$(dirname "$0")/../src/components/common"

# 定义需要更新的Widget列表
widgets=("DJIWidget" "XAUUSDWidget" "USCLWidget" "USDCNHWidget")

for widget in "${widgets[@]}"; do
    file="${widget}.tsx"
    echo "正在更新 $file..."
    
    if [ ! -f "$file" ]; then
        echo "文件 $file 不存在，跳过"
        continue
    fi
    
    # 1. 添加MarketWidgetStyles导入（如果还没有的话）
    if ! grep -q "MarketWidgetStyles" "$file"; then
        # 在imports后添加新的导入
        sed -i '' '/^import.*from.*services\/data/a\
import { marketWidgetStyles, MarketWidgetColors, getValueFontSize } from "./MarketWidgetStyles";' "$file"
    fi
    
    # 2. 替换渲染函数中的样式引用
    sed -i '' 's/styles\.loadingContainer/marketWidgetStyles.loadingContainer/g' "$file"
    sed -i '' 's/styles\.loadingText/marketWidgetStyles.loadingText/g' "$file"
    sed -i '' 's/styles\.errorContainer/marketWidgetStyles.errorContainer/g' "$file"
    sed -i '' 's/styles\.errorText/marketWidgetStyles.errorText/g' "$file"
    sed -i '' 's/styles\.contentContainer/marketWidgetStyles.contentContainer/g' "$file"
    sed -i '' 's/styles\.dataDisplay/marketWidgetStyles.dataDisplay/g' "$file"
    sed -i '' 's/styles\.mainValue/marketWidgetStyles.mainValue/g' "$file"
    sed -i '' 's/styles\.valueLabel/marketWidgetStyles.valueLabel/g' "$file"
    sed -i '' 's/styles\.container/marketWidgetStyles.container/g' "$file"
    sed -i '' 's/styles\.title/marketWidgetStyles.title/g' "$file"
    
    # 3. 替换颜色引用
    sed -i '' 's/#007AFF/MarketWidgetColors.loadingColor/g' "$file"
    sed -i '' 's/#FF3B30/MarketWidgetColors.errorColor/g' "$file"
    
    # 4. 删除旧的StyleSheet导入
    sed -i '' 's/, StyleSheet//g' "$file"
    
    echo "已更新 $file"
done

echo "批量更新完成！"
