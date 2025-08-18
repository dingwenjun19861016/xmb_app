#!/bin/bash

# APK 验证和安装辅助脚本
# 使用方法: ./scripts/verify-apk.sh [APK文件路径]

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

show_usage() {
    echo "APK验证和安装辅助脚本"
    echo ""
    echo "使用方法:"
    echo "  ./scripts/verify-apk.sh [APK文件路径]"
    echo "  ./scripts/verify-apk.sh  # 自动查找最新APK"
    echo ""
    echo "功能:"
    echo "  1. 验证APK文件完整性"
    echo "  2. 检查APK签名状态"
    echo "  3. 显示APK详细信息"
    echo "  4. 提供安装建议和故障排除"
}

if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

# 确定APK文件路径
if [ -n "$1" ]; then
    APK_FILE="$1"
else
    # 自动查找最新的签名APK
    APK_FILE=$(find . -name "xmb_*signed*.apk" -type f -exec ls -t {} + | head -n 1)
    if [ -z "$APK_FILE" ]; then
        # 查找任何APK文件
        APK_FILE=$(find . -name "*.apk" -type f -exec ls -t {} + | head -n 1)
    fi
    
    if [ -z "$APK_FILE" ]; then
        print_error "未找到APK文件"
        exit 1
    fi
fi

# 检查文件是否存在
if [ ! -f "$APK_FILE" ]; then
    print_error "APK文件不存在: $APK_FILE"
    exit 1
fi

print_info "验证APK文件: $APK_FILE"
echo ""

# 1. 基本文件信息
print_info "📁 文件信息:"
FILE_SIZE=$(ls -lh "$APK_FILE" | awk '{print $5}')
FILE_DATE=$(ls -l "$APK_FILE" | awk '{print $6, $7, $8}')
echo "  文件大小: $FILE_SIZE"
echo "  修改时间: $FILE_DATE"
echo "  文件类型: $(file "$APK_FILE" | cut -d: -f2)"
echo ""

# 2. 签名状态检查
print_info "🔐 签名状态检查:"
if command -v jarsigner &> /dev/null; then
    if jarsigner -verify "$APK_FILE" &> /dev/null; then
        print_success "✅ APK已正确签名"
        
        # 显示签名详情
        SIGNER_INFO=$(jarsigner -verify -verbose "$APK_FILE" 2>/dev/null | grep ">>> Signer" -A 2 | tail -n 2)
        if [ -n "$SIGNER_INFO" ]; then
            echo "  签名信息: $SIGNER_INFO"
        fi
    else
        print_error "❌ APK未签名或签名无效"
        echo "  解决方案: 使用 ./scripts/build-android.sh 重新构建"
    fi
else
    print_warning "⚠️  jarsigner工具不可用，无法验证签名"
fi
echo ""

# 3. APK包信息 (如果有aapt工具)
print_info "📦 APK包信息:"
if command -v aapt &> /dev/null; then
    PACKAGE_INFO=$(aapt dump badging "$APK_FILE" 2>/dev/null | head -n 5)
    if [ -n "$PACKAGE_INFO" ]; then
        echo "$PACKAGE_INFO"
    else
        echo "  无法获取包信息"
    fi
else
    # 尝试用unzip获取AndroidManifest.xml基本信息
    if command -v unzip &> /dev/null; then
        MANIFEST_EXISTS=$(unzip -l "$APK_FILE" | grep AndroidManifest.xml || echo "")
        if [ -n "$MANIFEST_EXISTS" ]; then
            echo "  ✅ AndroidManifest.xml存在"
        else
            echo "  ❌ AndroidManifest.xml缺失"
        fi
    fi
fi
echo ""

# 4. 设备连接检查
print_info "📱 设备连接状态:"
if command -v adb &> /dev/null; then
    DEVICES=$(adb devices 2>/dev/null | grep -v "List of devices" | grep "device$" | wc -l)
    if [ "$DEVICES" -gt 0 ]; then
        print_success "✅ 检测到 $DEVICES 个已连接设备"
        adb devices | grep "device$"
    else
        print_warning "⚠️  未检测到已连接的Android设备"
        echo "  请确保设备已连接并启用USB调试"
    fi
else
    print_warning "⚠️  ADB工具不可用"
fi
echo ""

# 5. 安装建议
print_info "🚀 安装建议:"
echo "方法1 - ADB安装(推荐):"
echo "  adb install -r \"$APK_FILE\""
echo ""
echo "方法2 - 传输到设备:"
echo "  adb push \"$APK_FILE\" /sdcard/"
echo "  然后在设备上使用文件管理器安装"
echo ""
echo "方法3 - 网络传输:"
echo "  上传到服务器或云存储，设备浏览器下载"
echo ""

# 6. 故障排除指南
print_info "🔧 常见问题解决:"
echo "如果安装失败，请检查:"
echo ""
echo "1. 设备设置:"
echo "   - 启用 '允许安装未知来源应用'"
echo "   - 关闭 Google Play Protect (临时)"
echo "   - 关闭手机安全软件 (临时)"
echo ""
echo "2. 应用冲突:"
echo "   - 卸载同包名的旧版本应用"
echo "   - 清理应用数据和缓存"
echo ""
echo "3. 系统兼容性:"
echo "   - 确保Android版本 >= 7.0 (API 24)"
echo "   - 检查设备架构支持"
echo ""
echo "4. 获取详细错误信息:"
echo "   adb logcat -c  # 清理日志"
echo "   adb install \"$APK_FILE\"  # 尝试安装"
echo "   adb logcat | grep -i 'install\\|package\\|error'  # 查看错误"
echo ""

# 7. 签名修复
if ! jarsigner -verify "$APK_FILE" &> /dev/null 2>&1; then
    print_info "🔧 签名修复:"
    echo "APK未签名，执行以下命令修复:"
    echo "  jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA256 \\"
    echo "    -keystore android/app/xmb-release.keystore \\"
    echo "    -storepass xmbstock -keypass xmbstock \\"
    echo "    \"$APK_FILE\" xmb"
    echo ""
fi

print_success "APK验证完成! 🎉"
