#!/bin/bash

# 简化部署脚本 - 只更新版本号
# 使用方法: ./scripts/deploy.sh [version]
# 例如: ./scripts/deploy.sh "2025-07-24-1500-v1"
# 不提供版本号时自动生成

set -e

echo "🚀 开始部署流程..."

# 1. 更新版本号
if [ -z "$1" ]; then
    echo "🔄 自动生成版本号..."
    ./scripts/update-version.sh
else
    echo "� 使用指定版本号: $1"
    ./scripts/update-version.sh "$1"
fi

# 2. 提示用户运行构建命令
echo ""
echo "✅ 版本号更新完成!"
echo ""
echo "� 现在请运行以下命令完成部署:"
echo "   yarn prod"
echo ""
echo "💡 或者您可以使用快捷命令:"
echo "   yarn deploy:quick"
