#!/bin/bash
set -e

# Source icon should be 1024x1024 PNG
SOURCE="${1:-icon-source.png}"
ICONS_DIR="src-tauri/icons"

if [ ! -f "$SOURCE" ]; then
    echo "❌ Source icon not found: $SOURCE"
    echo "Usage: ./scripts/generate-icons.sh [source-icon.png]"
    exit 1
fi

mkdir -p $ICONS_DIR

echo "📐 Generating icons from $SOURCE..."

# Generate PNG sizes
sips -z 32 32 $SOURCE --out $ICONS_DIR/32x32.png
sips -z 128 128 $SOURCE --out $ICONS_DIR/128x128.png
sips -z 256 256 $SOURCE --out $ICONS_DIR/128x128@2x.png
sips -z 512 512 $SOURCE --out $ICONS_DIR/icon.png

# Generate icns (macOS)
mkdir -p $ICONS_DIR/icon.iconset
sips -z 16 16 $SOURCE --out $ICONS_DIR/icon.iconset/icon_16x16.png
sips -z 32 32 $SOURCE --out $ICONS_DIR/icon.iconset/icon_16x16@2x.png
sips -z 32 32 $SOURCE --out $ICONS_DIR/icon.iconset/icon_32x32.png
sips -z 64 64 $SOURCE --out $ICONS_DIR/icon.iconset/icon_32x32@2x.png
sips -z 128 128 $SOURCE --out $ICONS_DIR/icon.iconset/icon_128x128.png
sips -z 256 256 $SOURCE --out $ICONS_DIR/icon.iconset/icon_128x128@2x.png
sips -z 256 256 $SOURCE --out $ICONS_DIR/icon.iconset/icon_256x256.png
sips -z 512 512 $SOURCE --out $ICONS_DIR/icon.iconset/icon_256x256@2x.png
sips -z 512 512 $SOURCE --out $ICONS_DIR/icon.iconset/icon_512x512.png
sips -z 1024 1024 $SOURCE --out $ICONS_DIR/icon.iconset/icon_512x512@2x.png
iconutil -c icns $ICONS_DIR/icon.iconset -o $ICONS_DIR/icon.icns
rm -rf $ICONS_DIR/icon.iconset

echo "✨ Icons generated successfully!"
