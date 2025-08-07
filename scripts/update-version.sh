#!/bin/bash

# 版本更新脚本 - 自动更新Service Worker和VersionService中的版本号
# 使用方法: ./scripts/update-version.sh [version]
# 如果不提供版本号，会自动生成时间戳版本

set -e

# 获取版本号参数，如果没有提供则自动生成
if [ -z "$1" ]; then
    TIMESTAMP=$(date +"%Y-%m-%d-%H%M")
    VERSION="$TIMESTAMP-v1"
    echo "🏷️  自动生成版本号: $VERSION"
else
    VERSION="$1"
    echo "🏷️  使用指定版本号: $VERSION"
fi

echo "🔄 开始更新版本号..."

# 检查文件是否存在
if [ ! -f "public/sw.js" ]; then
    echo "❌ 错误: public/sw.js 文件不存在"
    exit 1
fi

if [ ! -f "src/services/VersionService.ts" ]; then
    echo "❌ 错误: src/services/VersionService.ts 文件不存在"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ 错误: package.json 文件不存在"
    exit 1
fi

if [ ! -f "app.json" ]; then
    echo "❌ 错误: app.json 文件不存在"
    exit 1
fi

# 1. 更新package.json中的版本号
echo "🔄 更新package.json版本号..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json
else
    # Linux
    sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json
fi

# 2. 更新app.json中的版本号
echo "🔄 更新app.json版本号..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" app.json
else
    # Linux
    sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" app.json
fi

# 3. 更新Service Worker中的版本号
echo "🔄 更新Service Worker版本号..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/const APP_VERSION = '[^']*'/const APP_VERSION = '$VERSION'/" public/sw.js
else
    # Linux
    sed -i "s/const APP_VERSION = '[^']*'/const APP_VERSION = '$VERSION'/" public/sw.js
fi

# 4. 更新VersionService中的版本号
echo "🔄 更新VersionService版本号..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/private readonly CURRENT_VERSION = '[^']*'/private readonly CURRENT_VERSION = '$VERSION'/" src/services/VersionService.ts
else
    # Linux
    sed -i "s/private readonly CURRENT_VERSION = '[^']*'/private readonly CURRENT_VERSION = '$VERSION'/" src/services/VersionService.ts
fi

# 5. 验证更新是否成功
PKG_VERSION=$(grep '"version":' package.json | cut -d'"' -f4)
APP_VERSION=$(grep '"version":' app.json | grep -v '"versionCode"' | cut -d'"' -f4)
SW_VERSION=$(grep "const APP_VERSION = " public/sw.js | cut -d"'" -f2)
VS_VERSION=$(grep "private readonly CURRENT_VERSION = " src/services/VersionService.ts | cut -d"'" -f2)

if [ "$PKG_VERSION" = "$VERSION" ] && [ "$APP_VERSION" = "$VERSION" ] && [ "$SW_VERSION" = "$VERSION" ] && [ "$VS_VERSION" = "$VERSION" ]; then
    echo "✅ 版本号更新成功!"
    echo "   package.json: $PKG_VERSION"
    echo "   app.json: $APP_VERSION"
    echo "   Service Worker: $SW_VERSION"
    echo "   VersionService: $VS_VERSION"
else
    echo "❌ 版本号更新失败!"
    echo "   目标版本: $VERSION"
    echo "   package.json: $PKG_VERSION"
    echo "   app.json: $APP_VERSION"
    echo "   Service Worker: $SW_VERSION"
    echo "   VersionService: $VS_VERSION"
    exit 1
fi

echo ""
echo "📋 接下来您可以:"
echo "  □ 运行 'yarn prod' 构建和部署"
echo "  □ 或运行 'yarn deploy:quick' 自动构建部署"