#!/bin/bash

# Android APK 生产构建脚本
# 使用方法: ./scripts/build-android.sh [版本号]
# 如果不提供版本号，将从package.json自动获取
# 
# 功能特性：
# 1. 自动更新版本号
# 2. 环境检查和依赖验证
# 3. 清理和重新构建
# 4. 确保APK正确签名
# 5. 生成生产就绪的APK

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
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

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    print_error "请在项目根目录执行此脚本"
    exit 1
fi

# 获取版本号
if [ -n "$1" ]; then
    VERSION="$1"
    print_info "使用提供的版本号: $VERSION"
    # 更新package.json中的版本号
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.version = '$VERSION';
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
    print_success "已更新package.json版本号为: $VERSION"
else
    VERSION=$(node -p "require('./package.json').version")
    print_info "从package.json获取版本号: $VERSION"
fi

# 检查环境
print_info "检查构建环境..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js未安装或不在PATH中"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//')
print_info "Node.js版本: $NODE_VERSION"

# 检查npm/yarn
if ! command -v npm &> /dev/null; then
    print_error "npm未安装或不在PATH中"
    exit 1
fi

# 检查Java
if ! command -v java &> /dev/null; then
    print_error "Java未安装或不在PATH中"
    print_error "请安装Java 17或更高版本"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    print_error "Java版本过低，当前版本: $JAVA_VERSION，要求: 17+"
    print_error "请升级Java版本后重试"
    exit 1
fi

print_success "Java版本: $JAVA_VERSION ✓"

# 检查Android SDK
if [ -z "$ANDROID_HOME" ]; then
    print_error "ANDROID_HOME环境变量未设置"
    print_error "请设置Android SDK路径，例如: export ANDROID_HOME=/Users/username/Library/Android/sdk"
    exit 1
fi

print_success "Android SDK: $ANDROID_HOME ✓"

# 检查keystore文件
KEYSTORE_FILE="android/app/xmb-release.keystore"
if [ ! -f "$KEYSTORE_FILE" ]; then
    print_error "Release keystore文件不存在: $KEYSTORE_FILE"
    print_error "请确保release keystore已正确生成"
    exit 1
fi

# 验证keystore
print_info "验证keystore文件..."
if keytool -list -keystore "$KEYSTORE_FILE" -storepass xmbstock -alias xmb &> /dev/null; then
    print_success "Keystore验证通过 ✓"
else
    print_error "Keystore验证失败，请检查keystore文件或密码"
    exit 1
fi

print_success "环境检查通过"

# 确保依赖是最新的
print_info "检查项目依赖..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    print_info "安装项目依赖..."
    npm install
fi

# 清理旧的APK文件
print_info "清理旧的APK文件..."
rm -f *.apk

# 确保codegen artifacts是最新的
print_info "生成最新的codegen artifacts..."
cd android
./gradlew generateCodegenArtifactsFromSchema

# 清理之前的构建
print_info "清理之前的构建缓存..."
./gradlew clean

# 设置生产环境变量
export NODE_ENV=production

# 构建Release APK
print_info "开始构建Release APK (生产模式)..."
print_info "这可能需要几分钟时间..."

# 使用--no-daemon避免Gradle守护进程问题，--stacktrace获取详细错误信息
./gradlew assembleRelease --no-daemon --stacktrace

# 检查APK是否生成成功
APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK_PATH" ]; then
    print_error "APK构建失败，文件不存在: $APK_PATH"
    print_error "请检查构建日志中的错误信息"
    exit 1
fi

print_success "APK构建成功: $APK_PATH"

cd ..

# 验证APK签名
print_info "验证APK签名..."
if jarsigner -verify "android/$APK_PATH" &> /dev/null; then
    print_success "APK签名验证通过 ✓"
else
    print_warning "APK签名验证失败，执行强制签名..."
    
    # 强制签名
    jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA256 \
        -keystore "$KEYSTORE_FILE" \
        -storepass xmbstock \
        -keypass xmbstock \
        "android/$APK_PATH" \
        xmb
    
    # 再次验证签名
    if jarsigner -verify "android/$APK_PATH" &> /dev/null; then
        print_success "强制签名成功 ✓"
    else
        print_error "APK签名失败，无法生成有效的生产APK"
        exit 1
    fi
fi

# 最终签名验证（生产环境必须）
print_info "执行最终签名验证..."
if ! jarsigner -verify "android/$APK_PATH" &> /dev/null; then
    print_error "最终签名验证失败，APK不适用于生产环境"
    exit 1
fi

# 验证APK完整性
print_info "验证APK完整性..."
if aapt dump badging "android/$APK_PATH" &> /dev/null; then
    print_success "APK完整性验证通过 ✓"
else
    print_warning "APK完整性验证失败，但APK可能仍然可用"
fi

# 生成最终APK文件名（生产命名规范）
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
APK_NAME="xmb_signed_${VERSION}.apk"
APK_NAME_WITH_TIME="xmb_signed_${VERSION}_${TIMESTAMP}.apk"

# 复制并重命名APK
print_info "生成生产APK文件..."
cp "android/$APK_PATH" "$APK_NAME"

# 创建带时间戳的备份（用于版本追踪）
cp "android/$APK_PATH" "$APK_NAME_WITH_TIME"

# 获取APK详细信息
APK_SIZE=$(ls -lh "$APK_NAME" | awk '{print $5}')
APK_SIZE_BYTES=$(stat -f%z "$APK_NAME" 2>/dev/null || stat -c%s "$APK_NAME" 2>/dev/null || echo "Unknown")

# 获取keystore SHA1指纹（用于Google Services配置验证）
KEYSTORE_SHA1=$(keytool -list -v -keystore "$KEYSTORE_FILE" -storepass xmbstock -alias xmb 2>/dev/null | grep "SHA1:" | cut -d' ' -f3)

print_success "生产APK构建完成!"

echo ""
echo "==================== 生产构建结果 ===================="
echo "📱 应用版本: $VERSION"
echo "📦 APK文件: $APK_NAME"
echo "🔄 备份文件: $APK_NAME_WITH_TIME"
echo "📏 文件大小: $APK_SIZE ($APK_SIZE_BYTES bytes)"
echo "✅ 签名状态: 已签名 (生产就绪)"
echo "🔑 SHA1指纹: $KEYSTORE_SHA1"
echo "📅 构建时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================================="
echo ""

# 生产部署指导
print_info "📋 生产部署步骤:"
echo "1. 🔍 验证APK: ./scripts/verify-apk.sh $APK_NAME"
echo "2. 📤 上传到P1服务器: scp $APK_NAME user@p1:/path/to/public/app/"
echo "3. 🔧 更新环境变量:"
echo "   - APP_ANDROID_UPDATE_ENABLE=false (暂时禁用)"
echo "   - APP_ANDROID_UPDATE_URL=https://xmb.me/app/$APK_NAME"
echo "   - APP_ANDROID_UPDATE_VER=$VERSION"
echo "4. 🧪 测试APK安装和功能"
echo "5. ✅ 启用更新: APP_ANDROID_UPDATE_ENABLE=true"
echo ""

# APK管理命令
print_info "🛠️  APK管理命令:"
echo "• 验证签名: jarsigner -verify $APK_NAME"
echo "• 查看详情: jarsigner -verify -verbose -certs $APK_NAME"
echo "• 安装测试: adb install -r $APK_NAME"
echo "• 传输设备: adb push $APK_NAME /sdcard/"
echo ""

# Google Services配置提醒
if [ -n "$KEYSTORE_SHA1" ]; then
    print_info "🔐 Google Services SHA1指纹:"
    echo "如果Google登录有问题，请确保Google Console中配置了以下SHA1指纹:"
    echo "SHA1: $KEYSTORE_SHA1"
    echo ""
fi

# 成功提示
print_success "🎉 生产APK构建成功!"
print_success "📱 APK已准备好部署到生产环境"
