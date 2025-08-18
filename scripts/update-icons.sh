#!/bin/bash

# Script to update all app icons with the new logo
# This script replaces all icon files with the new stock market logo

set -e

echo "🔄 Starting icon replacement process..."

# Source icon
SOURCE_ICON="assets/icon.png"

if [ ! -f "$SOURCE_ICON" ]; then
    echo "❌ Error: Source icon $SOURCE_ICON not found!"
    exit 1
fi

echo "✅ Using source icon: $SOURCE_ICON"

# Convert WebP to PNG if needed
if file "$SOURCE_ICON" | grep -q "Web/P"; then
    echo "🔄 Converting WebP to PNG..."
    sips -s format png "$SOURCE_ICON" --out "assets/icon_converted.png"
    SOURCE_ICON="assets/icon_converted.png"
    echo "✅ Converted to PNG format"
fi

# Function to resize and copy icon
resize_and_copy() {
    local size=$1
    local output=$2
    local source=${3:-$SOURCE_ICON}
    
    echo "📱 Creating ${size}x${size} icon: $output"
    
    # Create directory if it doesn't exist
    mkdir -p "$(dirname "$output")"
    
    # Resize using sips
    sips -z $size $size "$source" --out "$output" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully created: $output"
    else
        echo "❌ Failed to create: $output"
    fi
}

# Main app icons
echo "🏠 Updating main app icons..."
# Copy the source icon as adaptive icon
cp "$SOURCE_ICON" "assets/adaptive-icon.png"
echo "✅ Successfully created: assets/adaptive-icon.png"

# Create favicon
resize_and_copy 32 "assets/favicon.png"

# Public web icons
echo "🌐 Updating web icons..."
resize_and_copy 16 "public/icons/favicon-16x16.png"
resize_and_copy 32 "public/icons/favicon-32x32.png"
resize_and_copy 72 "public/icons/icon-72x72.png"
resize_and_copy 96 "public/icons/icon-96x96.png"
resize_and_copy 128 "public/icons/icon-128x128.png"
resize_and_copy 144 "public/icons/icon-144x144.png"
resize_and_copy 152 "public/icons/icon-152x152.png"
resize_and_copy 192 "public/icons/icon-192x192.png"
resize_and_copy 384 "public/icons/icon-384x384.png"
resize_and_copy 512 "public/icons/icon-512x512.png"

# Apple touch icons
echo "🍎 Updating Apple touch icons..."
resize_and_copy 57 "public/icons/apple-touch-icon-57x57.png"
resize_and_copy 60 "public/icons/apple-touch-icon-60x60.png"
resize_and_copy 72 "public/icons/apple-touch-icon-72x72.png"
resize_and_copy 76 "public/icons/apple-touch-icon-76x76.png"
resize_and_copy 114 "public/icons/apple-touch-icon-114x114.png"
resize_and_copy 120 "public/icons/apple-touch-icon-120x120.png"
resize_and_copy 144 "public/icons/apple-touch-icon-144x144.png"
resize_and_copy 152 "public/icons/apple-touch-icon-152x152.png"
resize_and_copy 180 "public/icons/apple-touch-icon-180x180.png"

# Create favicon.ico
echo "🔗 Creating favicon.ico..."
sips -s format png "$SOURCE_ICON" -z 32 32 --out "temp_favicon.png" > /dev/null 2>&1
if command -v iconutil > /dev/null; then
    # If iconutil is available, create proper ICO
    mkdir -p temp_iconset.iconset
    sips -z 16 16 "$SOURCE_ICON" --out "temp_iconset.iconset/icon_16x16.png" > /dev/null 2>&1
    sips -z 32 32 "$SOURCE_ICON" --out "temp_iconset.iconset/icon_16x16@2x.png" > /dev/null 2>&1
    sips -z 32 32 "$SOURCE_ICON" --out "temp_iconset.iconset/icon_32x32.png" > /dev/null 2>&1
    iconutil -c icns -o temp_favicon.icns temp_iconset.iconset > /dev/null 2>&1
    mv temp_favicon.icns public/icons/favicon.ico
    rm -rf temp_iconset.iconset
else
    # Fallback: just copy the PNG as .ico
    cp temp_favicon.png public/icons/favicon.ico
fi
rm -f temp_favicon.png

# Update splash screens (keep them simple - just the icon centered)
echo "🎨 Updating splash screens..."
# For splash screens, we'll create larger versions with the icon centered
# These sizes match common device screen sizes

# iPhone splash screens
resize_and_copy 640 "temp_splash_icon.png"
sips -c 1136 640 -p 248 0 "temp_splash_icon.png" --out "public/icons/splash-640x1136.png" > /dev/null 2>&1

resize_and_copy 750 "temp_splash_icon.png"
sips -c 1334 750 -p 292 0 "temp_splash_icon.png" --out "public/icons/splash-750x1334.png" > /dev/null 2>&1

resize_and_copy 1125 "temp_splash_icon.png"
sips -c 2436 1125 -p 655 0 "temp_splash_icon.png" --out "public/icons/splash-1125x2436.png" > /dev/null 2>&1

resize_and_copy 1242 "temp_splash_icon.png"
sips -c 2208 1242 -p 483 0 "temp_splash_icon.png" --out "public/icons/splash-1242x2208.png" > /dev/null 2>&1

resize_and_copy 1536 "temp_splash_icon.png"
sips -c 2048 1536 -p 256 0 "temp_splash_icon.png" --out "public/icons/splash-1536x2048.png" > /dev/null 2>&1

rm -f temp_splash_icon.png

# Update dist icons if they exist
if [ -d "dist/icons" ]; then
    echo "📦 Updating dist icons..."
    cp -r public/icons/* dist/icons/ 2>/dev/null || true
fi

# Update Android icons if they exist
if [ -d "android/app/src/main/res" ]; then
    echo "🤖 Updating Android icons..."
    # Android icon directories
    android_dirs=(
        "mipmap-hdpi"
        "mipmap-mdpi" 
        "mipmap-xhdpi"
        "mipmap-xxhdpi"
        "mipmap-xxxhdpi"
    )
    
    android_sizes=(72 48 96 144 192)
    
    for i in "${!android_dirs[@]}"; do
        dir="android/app/src/main/res/${android_dirs[$i]}"
        size="${android_sizes[$i]}"
        
        if [ -d "$dir" ]; then
            resize_and_copy $size "$dir/ic_launcher.png"
            resize_and_copy $size "$dir/ic_launcher_round.png"
        fi
    done
fi

# Update iOS icons if they exist
if [ -d "ios/app/Images.xcassets/AppIcon.appiconset" ]; then
    echo "🍎 Updating iOS app icons..."
    ios_icon_dir="ios/app/Images.xcassets/AppIcon.appiconset"
    
    # Common iOS icon sizes
    resize_and_copy 20 "$ios_icon_dir/Icon-20.png"
    resize_and_copy 40 "$ios_icon_dir/Icon-20@2x.png"
    resize_and_copy 60 "$ios_icon_dir/Icon-20@3x.png"
    resize_and_copy 29 "$ios_icon_dir/Icon-29.png"
    resize_and_copy 58 "$ios_icon_dir/Icon-29@2x.png"
    resize_and_copy 87 "$ios_icon_dir/Icon-29@3x.png"
    resize_and_copy 40 "$ios_icon_dir/Icon-40.png"
    resize_and_copy 80 "$ios_icon_dir/Icon-40@2x.png"
    resize_and_copy 120 "$ios_icon_dir/Icon-40@3x.png"
    resize_and_copy 60 "$ios_icon_dir/Icon-60@2x.png"
    resize_and_copy 180 "$ios_icon_dir/Icon-60@3x.png"
    resize_and_copy 76 "$ios_icon_dir/Icon-76.png"
    resize_and_copy 152 "$ios_icon_dir/Icon-76@2x.png"
    resize_and_copy 167 "$ios_icon_dir/Icon-83.5@2x.png"
    resize_and_copy 1024 "$ios_icon_dir/Icon-1024.png"
fi

echo "🎉 Icon replacement completed successfully!"
echo "📱 All app icons have been updated with the new stock market logo"
echo "🔄 You may need to clean and rebuild your app to see the changes"
