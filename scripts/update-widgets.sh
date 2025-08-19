#!/bin/bash

# 批量更新Widget组件的脚本
# 为所有Widget添加统一的浅蓝色主题

WIDGETS=("DJIWidget" "USBond10YRWidget" "USCLWidget" "USDCNHWidget" "XAUUSDWidget")

for widget in "${WIDGETS[@]}"; do
    echo "正在更新 ${widget}..."
    
    # 检查文件是否存在
    if [ ! -f "${widget}.tsx" ]; then
        echo "警告: ${widget}.tsx 不存在，跳过"
        continue
    fi
    
    # 备份原文件
    cp "${widget}.tsx" "${widget}.tsx.backup"
    
    # 添加样式导入
    sed -i '' '1s/^/import { marketWidgetStyles, MarketWidgetColors, getValueFontSize } from ".\/MarketWidgetStyles";\n/' "${widget}.tsx"
    
    echo "已更新 ${widget}"
done

echo "批量更新完成"
