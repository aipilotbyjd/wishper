#!/bin/bash
set -e

echo "🔨 Building Wishper for release..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf src-tauri/target/release/bundle

# Build the app
echo "📦 Building application..."
npm run tauri build

# Find the outputs
APP_PATH="src-tauri/target/release/bundle/macos/Wishper.app"
DMG_PATH=$(find src-tauri/target/release/bundle/dmg -name "*.dmg" 2>/dev/null | head -1)

if [ -d "$APP_PATH" ]; then
    echo "✅ App bundle created: $APP_PATH"
fi

if [ -f "$DMG_PATH" ]; then
    echo "✅ DMG created: $DMG_PATH"
fi

echo "✨ Build complete!"
