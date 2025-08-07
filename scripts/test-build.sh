#!/bin/bash

# 测试构建脚本 - 验证Android配置
# 使用方法: ./scripts/test-build.sh

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

echo "🔍 XMB项目构建前检查"
echo "===================="

# 1. 检查签名文件
print_info "检查签名文件..."
if [ -f "android/app/xmb-release.keystore" ]; then
    print_success "签名文件存在: android/app/xmb-release.keystore"
else
    print_error "签名文件不存在: android/app/xmb-release.keystore"
    exit 1
fi

# 2. 检查package.json配置
print_info "检查package.json配置..."
PROJECT_NAME=$(node -p "require('./package.json').name")
if [ "$PROJECT_NAME" = "xmb_app" ]; then
    print_success "项目名称正确: $PROJECT_NAME"
else
    print_warning "项目名称: $PROJECT_NAME (建议: xmb_app)"
fi

# 3. 检查app.json配置
print_info "检查app.json配置..."
APP_NAME=$(node -p "require('./app.json').expo.name")
APP_SLUG=$(node -p "require('./app.json').expo.slug")
IOS_BUNDLE=$(node -p "require('./app.json').expo.ios.bundleIdentifier")
ANDROID_PACKAGE=$(node -p "require('./app.json').expo.android.package")

echo "  应用名称: $APP_NAME"
echo "  Slug: $APP_SLUG"
echo "  iOS Bundle ID: $IOS_BUNDLE"
echo "  Android Package: $ANDROID_PACKAGE"

if [ "$IOS_BUNDLE" = "com.xmb.app" ] && [ "$ANDROID_PACKAGE" = "com.xmb.app" ]; then
    print_success "包名配置正确"
else
    print_error "包名配置有误"
    exit 1
fi

# 4. 检查Android配置
print_info "检查Android build.gradle配置..."
if grep -q "com.xmb.app" android/app/build.gradle; then
    print_success "Android包名配置正确"
else
    print_error "Android包名配置有误"
    exit 1
fi

# 5. 检查Kotlin文件
print_info "检查Kotlin文件包名..."
if grep -q "package com.xmb.app" android/app/src/main/java/com/xmb/app/*.kt; then
    print_success "Kotlin文件包名正确"
else
    print_error "Kotlin文件包名有误"
    exit 1
fi

# 6. 检查Google Services配置
print_info "检查Google Services配置..."
if grep -q "com.xmb.app" android/app/google-services.json; then
    print_success "Google Services包名配置正确"
else
    print_error "Google Services包名配置有误"
    exit 1
fi

print_success "所有配置检查通过！"
print_info "现在可以安全地运行构建命令："
echo "  ./scripts/update-version.sh \"1.0.1\""
echo "  ./scripts/build-android.sh"
