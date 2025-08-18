#!/bin/bash

# XMB美股应用部署检查脚本
# 确保所有配置正确，特别是Android签名和包名

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🔍 XMB美股应用部署配置检查"
echo "================================"

# 1. 检查基本项目信息
print_info "检查项目基本信息..."
PROJECT_NAME=$(grep '"name":' package.json | cut -d'"' -f4)
PROJECT_VERSION=$(grep '"version":' package.json | cut -d'"' -f4)
echo "  项目名称: $PROJECT_NAME"
echo "  当前版本: $PROJECT_VERSION"

# 2. 检查app.json配置
print_info "检查app.json配置..."
APP_NAME=$(grep '"name":' app.json | head -1 | cut -d'"' -f4)
APP_SLUG=$(grep '"slug":' app.json | cut -d'"' -f4)
APP_VERSION=$(grep '"version":' app.json | grep -v '"versionCode"' | cut -d'"' -f4)
IOS_BUNDLE=$(grep '"bundleIdentifier":' app.json | cut -d'"' -f4)
ANDROID_PACKAGE=$(grep '"package":' app.json | cut -d'"' -f4)

echo "  应用名称: $APP_NAME"
echo "  应用标识: $APP_SLUG"
echo "  应用版本: $APP_VERSION"
echo "  iOS Bundle ID: $IOS_BUNDLE"
echo "  Android Package: $ANDROID_PACKAGE"

# 检查是否还有加密货币相关的配置
if echo "$APP_SLUG" | grep -q "chainalert\|crypto\|coin"; then
    print_warning "app.json中仍有加密货币相关配置: $APP_SLUG"
fi

if echo "$IOS_BUNDLE" | grep -q "chainalert\|crypto\|coin"; then
    print_warning "iOS Bundle ID中仍有加密货币相关配置: $IOS_BUNDLE"
fi

if echo "$ANDROID_PACKAGE" | grep -q "chainalert\|crypto\|coin"; then
    print_warning "Android Package中仍有加密货币相关配置: $ANDROID_PACKAGE"
fi

# 3. 检查Android签名配置
print_info "检查Android签名配置..."

# 检查build.gradle配置
if [ -f "android/app/build.gradle" ]; then
    GRADLE_NAMESPACE=$(grep 'namespace' android/app/build.gradle | cut -d"'" -f2)
    GRADLE_APP_ID=$(grep 'applicationId' android/app/build.gradle | cut -d"'" -f2)
    GRADLE_KEYSTORE=$(grep -A10 'release {' android/app/build.gradle | grep 'storeFile' | cut -d"'" -f2)
    GRADLE_STORE_PASS=$(grep -A10 'release {' android/app/build.gradle | grep 'storePassword' | cut -d"'" -f2)
    GRADLE_KEY_ALIAS=$(grep -A10 'release {' android/app/build.gradle | grep 'keyAlias' | cut -d"'" -f2)
    
    echo "  Namespace: $GRADLE_NAMESPACE"
    echo "  Application ID: $GRADLE_APP_ID"
    echo "  Keystore文件: $GRADLE_KEYSTORE"
    echo "  Store密码: $GRADLE_STORE_PASS"
    echo "  Key别名: $GRADLE_KEY_ALIAS"
    
    # 检查keystore文件是否存在
    if [ -f "android/app/$GRADLE_KEYSTORE" ]; then
        print_success "Keystore文件存在: android/app/$GRADLE_KEYSTORE"
    else
        print_error "Keystore文件不存在: android/app/$GRADLE_KEYSTORE"
    fi
    
    # 检查是否还在使用加密货币相关的配置
    if echo "$GRADLE_NAMESPACE $GRADLE_APP_ID" | grep -q "chainalert\|crypto\|coin"; then
        print_warning "Android配置中仍有加密货币相关内容"
    fi
else
    print_error "android/app/build.gradle文件不存在"
fi

# 4. 检查构建脚本配置
print_info "检查构建脚本配置..."

if [ -f "scripts/build-android.sh" ]; then
    SCRIPT_KEYSTORE=$(grep 'KEYSTORE_FILE=' scripts/build-android.sh | cut -d'"' -f2)
    SCRIPT_STORE_PASS="xmbstock"  # 从脚本中直接提取
    SCRIPT_KEY_ALIAS="xmb"         # 从脚本中直接提取
    
    echo "  脚本Keystore: $SCRIPT_KEYSTORE"
    echo "  脚本Store密码: $SCRIPT_STORE_PASS"
    echo "  脚本Key别名: $SCRIPT_KEY_ALIAS"
    
    # 检查脚本配置是否与build.gradle一致
    if [ "$SCRIPT_STORE_PASS" = "$GRADLE_STORE_PASS" ] && [ "$SCRIPT_KEY_ALIAS" = "$GRADLE_KEY_ALIAS" ]; then
        print_success "构建脚本与build.gradle配置一致"
    else
        print_error "构建脚本与build.gradle配置不一致"
        echo "    build.gradle: 密码=$GRADLE_STORE_PASS, 别名=$GRADLE_KEY_ALIAS"
        echo "    脚本配置: 密码=$SCRIPT_STORE_PASS, 别名=$SCRIPT_KEY_ALIAS"
    fi
    
    # 检查APK文件名是否已更新
    if grep -q "xmb_signed" scripts/build-android.sh; then
        print_success "APK文件名已更新为股票主题"
    else
        print_warning "APK文件名可能仍使用加密货币命名"
    fi
else
    print_error "scripts/build-android.sh文件不存在"
fi

# 5. 检查版本一致性
print_info "检查版本一致性..."

SW_VERSION=$(grep "const APP_VERSION = " public/sw.js | cut -d"'" -f2)
VS_VERSION=$(grep "private readonly CURRENT_VERSION = " src/services/VersionService.ts | cut -d"'" -f2)

echo "  package.json: $PROJECT_VERSION"
echo "  app.json: $APP_VERSION"
echo "  Service Worker: $SW_VERSION"
echo "  VersionService: $VS_VERSION"

if [ "$PROJECT_VERSION" = "$APP_VERSION" ] && [ "$APP_VERSION" = "$SW_VERSION" ] && [ "$SW_VERSION" = "$VS_VERSION" ]; then
    print_success "所有版本号一致"
else
    print_warning "版本号不一致，建议运行 ./scripts/update-version.sh 统一版本"
fi

# 6. 检查现有keystore文件
print_info "检查现有keystore文件..."
echo "  现有keystore文件:"
find android/app -name "*.keystore" -type f | while read -r file; do
    echo "    - $file"
    if echo "$file" | grep -q "chainalert"; then
        print_warning "    ↳ 这是加密货币应用的keystore文件"
    elif echo "$file" | grep -q "xmb"; then
        print_success "    ↳ 这是股票应用的keystore文件"
    fi
done

# 7. 环境变量检查
print_info "检查环境变量..."
if [ -n "$ANDROID_HOME" ]; then
    print_success "ANDROID_HOME已设置: $ANDROID_HOME"
else
    print_error "ANDROID_HOME环境变量未设置"
fi

if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2)
    print_success "Java已安装: $JAVA_VERSION"
else
    print_error "Java未安装或不在PATH中"
fi

# 8. 生成总结报告
echo ""
echo "📋 配置检查总结"
echo "================================"

# 检查关键配置是否正确
ISSUES=0

if echo "$ANDROID_PACKAGE" | grep -q "chainalert\|crypto\|coin"; then
    print_error "❌ Android包名仍包含加密货币相关内容"
    ISSUES=$((ISSUES + 1))
else
    print_success "✅ Android包名已更新为股票主题"
fi

if [ ! -f "android/app/$GRADLE_KEYSTORE" ]; then
    print_error "❌ Keystore文件不存在"
    ISSUES=$((ISSUES + 1))
else
    print_success "✅ Keystore文件存在"
fi

if [ "$SCRIPT_STORE_PASS" != "$GRADLE_STORE_PASS" ] || [ "$SCRIPT_KEY_ALIAS" != "$GRADLE_KEY_ALIAS" ]; then
    print_error "❌ 构建脚本与build.gradle配置不一致"
    ISSUES=$((ISSUES + 1))
else
    print_success "✅ 构建脚本配置正确"
fi

if [ "$PROJECT_VERSION" != "$APP_VERSION" ] || [ "$APP_VERSION" != "$SW_VERSION" ] || [ "$SW_VERSION" != "$VS_VERSION" ]; then
    print_warning "⚠️  版本号不一致"
    ISSUES=$((ISSUES + 1))
else
    print_success "✅ 版本号一致"
fi

echo ""
if [ $ISSUES -eq 0 ]; then
    print_success "🎉 所有检查通过，项目配置正确！"
    echo ""
    echo "🚀 可以执行部署:"
    echo "   Web部署: yarn prod"
    echo "   Android构建: ./scripts/build-android.sh"
else
    print_error "❌ 发现 $ISSUES 个问题，请修复后再部署"
    echo ""
    echo "🔧 修复建议:"
    echo "   1. 运行 ./scripts/update-version.sh 统一版本"
    echo "   2. 检查并修复Android配置"
    echo "   3. 确保keystore文件存在且配置正确"
fi
