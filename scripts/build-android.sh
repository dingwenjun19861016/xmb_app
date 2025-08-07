#!/bin/bash

# Android APK 构建脚本
# 使用方法: ./scripts/build-android.sh [版本号]
# 如果不提供版本号，将从package.json自动获取

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

# 检查Java
if ! command -v java &> /dev/null; then
    print_error "Java未安装或不在PATH中"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    print_warning "建议使用Java 17或更高版本，当前版本: $JAVA_VERSION"
fi

# 检查Android SDK
if [ -z "$ANDROID_HOME" ]; then
    print_error "ANDROID_HOME环境变量未设置"
    exit 1
fi

# 检查keystore文件
KEYSTORE_FILE="android/app/chainalert-release-new.keystore"
if [ ! -f "$KEYSTORE_FILE" ]; then
    print_error "Keystore文件不存在: $KEYSTORE_FILE"
    exit 1
fi

print_success "环境检查通过"

# 清理之前的构建
print_info "清理之前的构建..."
cd android
./gradlew clean

# 构建Release APK
print_info "开始构建Release APK..."
./gradlew assembleRelease

# 检查APK是否生成成功
APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK_PATH" ]; then
    print_error "APK构建失败，文件不存在: $APK_PATH"
    exit 1
fi

cd ..

# 验证APK签名
print_info "验证APK签名..."
if jarsigner -verify "android/$APK_PATH" &> /dev/null; then
    print_success "APK签名验证通过"
else
    print_warning "APK签名验证失败，尝试手动签名..."
    
    # 手动签名
    jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA256 \
        -keystore "$KEYSTORE_FILE" \
        -storepass chainalert \
        -keypass chainalert \
        "android/$APK_PATH" \
        chainalert
    
    # 再次验证签名
    if jarsigner -verify "android/$APK_PATH" &> /dev/null; then
        print_success "手动签名成功"
    else
        print_error "APK签名失败"
        exit 1
    fi
fi

# 强制确保最终APK已签名（双重验证）
print_info "最终签名状态检查..."
if ! jarsigner -verify "android/$APK_PATH" &> /dev/null; then
    print_warning "执行最终签名保障..."
    jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA256 \
        -keystore "$KEYSTORE_FILE" \
        -storepass chainalert \
        -keypass chainalert \
        "android/$APK_PATH" \
        chainalert
fi

# 生成最终APK文件名
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
APK_NAME="chainalert_signed_${VERSION}.apk"
APK_NAME_WITH_TIME="chainalert_signed_${VERSION}_${TIMESTAMP}.apk"

# 复制并重命名APK
print_info "复制APK文件..."
cp "android/$APK_PATH" "$APK_NAME"

# 创建带时间戳的备份
cp "android/$APK_PATH" "$APK_NAME_WITH_TIME"

# 获取APK信息
APK_SIZE=$(ls -lh "$APK_NAME" | awk '{print $5}')
print_success "APK构建完成!"

echo ""
echo "==================== 构建结果 ===================="
echo "版本号: $VERSION"
echo "APK文件: $APK_NAME"
echo "备份文件: $APK_NAME_WITH_TIME"
echo "文件大小: $APK_SIZE"
echo "签名状态: ✅ 已签名"
echo "=================================================="
echo ""

# 提供安装建议
print_info "安装建议:"
echo "1. 通过ADB安装: adb install $APK_NAME"
echo "2. 传输到手机: adb push $APK_NAME /sdcard/"
echo "3. 上传到服务器: scp $APK_NAME user@server:/path/"
echo ""

# 提供APK信息查看命令
print_info "APK信息查看:"
echo "1. 验证签名: jarsigner -verify $APK_NAME"
echo "2. 查看详细信息: jarsigner -verify -verbose -certs $APK_NAME"
echo ""

print_success "构建脚本执行完成!"
