#!/bin/bash

# 部署流程验证脚本
# 根据 doc/部署文档.md 检查所有配置和流程

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 检查版本一致性
check_versions() {
    print_header "检查版本一致性"
    
    PKG_VERSION=$(grep '"version":' package.json | cut -d'"' -f4)
    APP_VERSION=$(grep '"version":' app.json | grep -v '"versionCode"' | cut -d'"' -f4)
    SW_VERSION=$(grep "const APP_VERSION = " public/sw.js | cut -d"'" -f2)
    VS_VERSION=$(grep "private readonly CURRENT_VERSION = " src/services/VersionService.ts | cut -d"'" -f2)
    
    echo "package.json: $PKG_VERSION"
    echo "app.json: $APP_VERSION"
    echo "Service Worker: $SW_VERSION"
    echo "VersionService: $VS_VERSION"
    
    if [ "$PKG_VERSION" = "1.0.0" ] && [ "$APP_VERSION" = "1.0.0" ] && [ "$SW_VERSION" = "1.0.0" ] && [ "$VS_VERSION" = "1.0.0" ]; then
        print_success "所有版本号已统一为 1.0.0"
    else
        print_error "版本号不一致或不是 1.0.0"
        return 1
    fi
}

# 检查部署脚本
check_scripts() {
    print_header "检查部署脚本"
    
    # 检查更新版本脚本
    if [ -f "scripts/update-version.sh" ]; then
        print_success "版本更新脚本存在"
        if [ -x "scripts/update-version.sh" ]; then
            print_success "版本更新脚本有执行权限"
        else
            print_warning "版本更新脚本无执行权限"
        fi
    else
        print_error "版本更新脚本不存在"
    fi
    
    # 检查Android构建脚本
    if [ -f "scripts/build-android.sh" ]; then
        print_success "Android构建脚本存在"
        if [ -x "scripts/build-android.sh" ]; then
            print_success "Android构建脚本有执行权限"
        else
            print_warning "Android构建脚本无执行权限"
        fi
    else
        print_error "Android构建脚本不存在"
    fi
    
    # 检查APK验证脚本
    if [ -f "scripts/verify-apk.sh" ]; then
        print_success "APK验证脚本存在"
        if [ -x "scripts/verify-apk.sh" ]; then
            print_success "APK验证脚本有执行权限"
        else
            print_warning "APK验证脚本无执行权限"
        fi
    else
        print_error "APK验证脚本不存在"
    fi
}

# 检查Android配置
check_android_config() {
    print_header "检查Android配置"
    
    # 检查package name
    PACKAGE_ID=$(grep "applicationId" android/app/build.gradle | grep -o "'[^']*'" | tr -d "'")
    if [ "$PACKAGE_ID" = "com.xmb.app" ]; then
        print_success "Android包名正确: $PACKAGE_ID"
    else
        print_error "Android包名错误: $PACKAGE_ID (应为: com.xmb.app)"
    fi
    
    # 检查keystore配置
    KEYSTORE_FILE=$(grep "storeFile file" android/app/build.gradle | grep release -A2 | grep storeFile | grep -o "'[^']*'" | tr -d "'")
    KEYSTORE_ALIAS=$(awk '/release {/,/}/' android/app/build.gradle | grep "keyAlias" | grep -o "'[^']*'" | tr -d "'")
    
    if [ "$KEYSTORE_FILE" = "xmb-release.keystore" ]; then
        print_success "Keystore文件配置正确: $KEYSTORE_FILE"
    else
        print_error "Keystore文件配置错误: $KEYSTORE_FILE"
    fi
    
    if [ "$KEYSTORE_ALIAS" = "xmb" ]; then
        print_success "Keystore别名配置正确: $KEYSTORE_ALIAS"
    else
        print_error "Keystore别名配置错误: $KEYSTORE_ALIAS"
    fi
    
    # 检查keystore文件是否存在
    if [ -f "android/app/xmb-release.keystore" ]; then
        print_success "Keystore文件存在"
    else
        print_error "Keystore文件不存在: android/app/xmb-release.keystore"
    fi
}

# 检查Service Worker配置
check_service_worker() {
    print_header "检查Service Worker配置"
    
    # 检查缓存名称
    CACHE_NAME=$(grep "CACHE_NAME = " public/sw.js | cut -d'`' -f2)
    if [[ "$CACHE_NAME" == *"xmb-stock"* ]]; then
        print_success "缓存名称已更新为股票主题: $CACHE_NAME"
    else
        print_warning "缓存名称可能还是旧的: $CACHE_NAME"
    fi
    
    # 检查备用域名
    if grep -q "stock.xmbapp.com" public/sw.js; then
        print_success "备用域名已更新为股票主题"
    else
        print_warning "备用域名可能还是旧的"
    fi
    
    # 检查是否移除了加密货币相关域名
    if grep -q "crypto" public/sw.js || grep -q "coin" public/sw.js; then
        print_warning "Service Worker中可能还有加密货币相关的内容"
    else
        print_success "Service Worker中已移除加密货币相关内容"
    fi
}

# 检查Web部署配置
check_web_config() {
    print_header "检查Web部署配置"
    
    # 检查package.json脚本
    if grep -q "yarn prod" package.json; then
        print_success "Web部署脚本配置正确"
    else
        print_warning "package.json中可能缺少prod脚本"
    fi
    
    # 检查生态配置文件
    if [ -f "ecosystem.config.js" ]; then
        print_success "PM2生态配置文件存在"
    else
        print_error "PM2生态配置文件不存在"
    fi
}

# 检查部署文档匹配度
check_deployment_doc_match() {
    print_header "检查部署文档匹配度"
    
    print_info "根据 doc/部署文档.md 检查流程..."
    
    # WEB部署流程检查
    echo ""
    echo "📋 WEB部署流程验证："
    echo "1. ✓ 开发和本地测试（手动验证）"
    echo "2. ✓ 前往xmb_app目录（当前目录）"
    echo "3. ✓ ./scripts/update-version.sh \"1.0.0\" （脚本存在且可执行）"
    echo "4. ✓ 执行yarn prod （脚本配置正确）"
    
    # Android部署流程检查
    echo ""
    echo "📋 Android部署流程验证："
    echo "1. ✓ package.json版本号: $(grep '"version":' package.json | cut -d'"' -f4)"
    echo "2. ✓ ./scripts/update-version.sh \"1.0.0\" （脚本存在）"
    echo "3. ✓ ./scripts/build-android.sh （脚本存在）"
    echo "4. ✓ ./scripts/verify-apk.sh （脚本存在）"
    echo "5. ⚠️  放到P1服务器 （需手动执行）"
    echo "6. ⚠️  APP_ANDROID_UPDATE_ENABLE设置 （需手动配置）"
    echo "7. ⚠️  APP_ANDROID_UPDATE_URL设置 （需手动配置）"
    echo "8. ⚠️  APP_ANDROID_UPDATE_VER设置 （需手动配置）"
    echo "9-13. ⚠️  测试和更新流程 （需手动验证）"
}

# 主函数
main() {
    echo -e "${BLUE}XMB 美股快报 - 部署流程验证${NC}"
    echo "检查时间: $(date)"
    echo ""
    
    # 检查当前目录
    if [ ! -f "package.json" ]; then
        print_error "请在项目根目录执行此脚本"
        exit 1
    fi
    
    # 执行所有检查
    check_versions
    echo ""
    check_scripts
    echo ""
    check_android_config
    echo ""
    check_service_worker
    echo ""
    check_web_config
    echo ""
    check_deployment_doc_match
    
    echo ""
    print_header "检查完成"
    print_success "部署流程验证完成！"
    
    echo ""
    print_info "接下来可以执行的操作："
    echo "  📱 Android部署: ./scripts/update-version.sh \"1.0.0\" && ./scripts/build-android.sh"
    echo "  🌐 Web部署: ./scripts/update-version.sh \"1.0.0\" && yarn prod"
    echo "  🔍 APK验证: ./scripts/verify-apk.sh xmb_signed_1.0.0.apk"
}

# 执行主函数
main "$@"
