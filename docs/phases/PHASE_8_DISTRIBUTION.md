# Phase 8: Distribution & Deployment (Week 8)

> **Duration:** Days 50-56
> **Goal:** Build, sign, notarize, and release the macOS application

---

## Day 50-52: Build Configuration & Signing

### Step 1: Configure Tauri for Production

**`src-tauri/tauri.conf.json`:**
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "VoiceFlow",
  "version": "1.0.0",
  "identifier": "com.yourcompany.voiceflow",
  "build": {
    "beforeBuildCommand": "pnpm build",
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "macOSPrivateApi": true,
    "windows": [
      {
        "title": "VoiceFlow",
        "width": 400,
        "height": 600,
        "resizable": true,
        "fullscreen": false,
        "center": true,
        "visible": true,
        "decorations": true,
        "transparent": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' https://api.openai.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'"
    },
    "trayIcon": {
      "iconPath": "icons/tray-icon.png",
      "iconAsTemplate": true
    }
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "app"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": [],
    "externalBin": [],
    "copyright": "Copyright © 2024 Your Company",
    "category": "Productivity",
    "shortDescription": "Voice-to-text dictation with AI polishing",
    "longDescription": "VoiceFlow is a powerful voice-to-text dictation app that uses OpenAI's Whisper for transcription and GPT for intelligent text polishing. Simply press a hotkey to start recording, speak naturally, and watch as your words are transcribed and automatically refined.",
    "macOS": {
      "entitlements": "entitlements.plist",
      "exceptionDomain": null,
      "frameworks": [],
      "infoPlist": {
        "NSMicrophoneUsageDescription": "VoiceFlow needs microphone access to transcribe your voice.",
        "NSAppleEventsUsageDescription": "VoiceFlow needs accessibility access to paste text into other applications.",
        "LSUIElement": false
      },
      "license": null,
      "minimumSystemVersion": "10.15",
      "providerShortName": null,
      "signingIdentity": "-",
      "hardenedRuntime": true
    }
  },
  "plugins": {
    "global-shortcut": {
      "all": true
    }
  }
}
```

### Step 2: Create Entitlements File

**`src-tauri/entitlements.plist`:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Disable sandbox for full functionality -->
    <key>com.apple.security.app-sandbox</key>
    <false/>
    
    <!-- Microphone access -->
    <key>com.apple.security.device.audio-input</key>
    <true/>
    
    <!-- Accessibility for paste simulation -->
    <key>com.apple.security.automation.apple-events</key>
    <true/>
    
    <!-- Allow unsigned code execution (for development) -->
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    
    <!-- Allow JIT for better performance -->
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    
    <!-- Hardened runtime exceptions -->
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
</dict>
</plist>
```

### Step 3: Create App Icons

Create icons in these sizes in `src-tauri/icons/`:

```
icons/
├── 32x32.png
├── 128x128.png
├── 128x128@2x.png
├── icon.icns        (macOS app icon)
├── icon.ico         (Windows, if needed)
├── icon.png         (512x512, source)
├── tray-icon.png    (22x22 or 44x44@2x)
└── tray-icon@2x.png (44x44)
```

**Icon Generation Script (`scripts/generate-icons.sh`):**
```bash
#!/bin/bash

# Source icon should be 1024x1024 PNG
SOURCE="icon-source.png"
ICONS_DIR="src-tauri/icons"

mkdir -p $ICONS_DIR

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

# Generate tray icons (template style - white with transparency)
sips -z 22 22 $SOURCE --out $ICONS_DIR/tray-icon.png
sips -z 44 44 $SOURCE --out $ICONS_DIR/tray-icon@2x.png

echo "Icons generated successfully!"
```

### Step 4: Set Up Code Signing

**Get Apple Developer Certificate:**

1. Join Apple Developer Program ($99/year): https://developer.apple.com/programs/
2. Create a "Developer ID Application" certificate in Xcode:
   - Open Xcode > Preferences > Accounts
   - Select your team > Manage Certificates
   - Click + and create "Developer ID Application"
3. Export the certificate as .p12 file

**Configure signing in environment:**
```bash
# Set your signing identity
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"

# Verify certificate
security find-identity -v -p codesigning
```

**Update `tauri.conf.json` for production:**
```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAMID)"
    }
  }
}
```

---

## Day 53-54: Notarization

### Step 1: Set Up Notarization Credentials

**Create App Store Connect API Key:**

1. Go to https://appstoreconnect.apple.com/access/api
2. Create a new API key with "Developer" role
3. Download the .p8 file
4. Note the Key ID and Issuer ID

**Store credentials securely:**
```bash
# Store API key for notarytool
xcrun notarytool store-credentials "AC_PASSWORD" \
  --apple-id "your@email.com" \
  --team-id "TEAMID" \
  --password "app-specific-password"
```

### Step 2: Create Build Script

**`scripts/build-release.sh`:**
```bash
#!/bin/bash
set -e

echo "🔨 Building VoiceFlow for release..."

# Configuration
APP_NAME="VoiceFlow"
BUNDLE_ID="com.yourcompany.voiceflow"
TEAM_ID="YOUR_TEAM_ID"
APPLE_ID="your@email.com"
NOTARIZE_PROFILE="AC_PASSWORD"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf src-tauri/target/release/bundle

# Build the app
echo "📦 Building application..."
pnpm tauri build

# Find the app bundle
APP_PATH="src-tauri/target/release/bundle/macos/${APP_NAME}.app"
DMG_PATH="src-tauri/target/release/bundle/dmg/${APP_NAME}_$(grep '"version"' src-tauri/tauri.conf.json | cut -d'"' -f4)_$(uname -m).dmg"

if [ ! -d "$APP_PATH" ]; then
    echo "❌ App bundle not found at $APP_PATH"
    exit 1
fi

# Sign the app (if not already signed by Tauri)
echo "🔏 Signing application..."
codesign --force --deep --sign "Developer ID Application: Your Name ($TEAM_ID)" \
  --options runtime \
  --entitlements src-tauri/entitlements.plist \
  "$APP_PATH"

# Verify signature
echo "✅ Verifying signature..."
codesign --verify --verbose=4 "$APP_PATH"
spctl --assess --verbose=4 "$APP_PATH"

# Create DMG if not already created
if [ ! -f "$DMG_PATH" ]; then
    echo "📀 Creating DMG..."
    # Use create-dmg or hdiutil
    hdiutil create -volname "$APP_NAME" \
      -srcfolder "$APP_PATH" \
      -ov -format UDZO \
      "$DMG_PATH"
fi

# Sign the DMG
echo "🔏 Signing DMG..."
codesign --force --sign "Developer ID Application: Your Name ($TEAM_ID)" "$DMG_PATH"

echo "✨ Build complete!"
echo "📍 App: $APP_PATH"
echo "📍 DMG: $DMG_PATH"
```

**`scripts/notarize.sh`:**
```bash
#!/bin/bash
set -e

echo "📤 Notarizing VoiceFlow..."

# Configuration
NOTARIZE_PROFILE="AC_PASSWORD"
DMG_PATH=$(find src-tauri/target/release/bundle/dmg -name "*.dmg" | head -1)

if [ ! -f "$DMG_PATH" ]; then
    echo "❌ DMG not found"
    exit 1
fi

echo "📦 Submitting for notarization: $DMG_PATH"

# Submit for notarization
xcrun notarytool submit "$DMG_PATH" \
  --keychain-profile "$NOTARIZE_PROFILE" \
  --wait

# Staple the ticket
echo "📎 Stapling notarization ticket..."
xcrun stapler staple "$DMG_PATH"

# Verify
echo "✅ Verifying notarization..."
xcrun stapler validate "$DMG_PATH"
spctl --assess --verbose=4 --type install "$DMG_PATH"

echo "✨ Notarization complete!"
```

---

## Day 55-56: Release & Updates

### Step 1: Set Up GitHub Actions

**`.github/workflows/build.yml`:**
```yaml
name: Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Build
        run: pnpm tauri build
        env:
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: macos-build
          path: |
            src-tauri/target/release/bundle/dmg/*.dmg
            src-tauri/target/release/bundle/macos/*.app
```

**`.github/workflows/release.yml`:**
```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-release:
    runs-on: macos-latest
    permissions:
      contents: write
    
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Import Apple Certificate
        env:
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          KEYCHAIN_PASSWORD: ${{ secrets.KEYCHAIN_PASSWORD }}
        run: |
          echo $APPLE_CERTIFICATE | base64 --decode > certificate.p12
          security create-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
          security import certificate.p12 -k build.keychain -P "$APPLE_CERTIFICATE_PASSWORD" -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" build.keychain

      - name: Build
        run: pnpm tauri build
        env:
          APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}

      - name: Notarize
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: |
          DMG_PATH=$(find src-tauri/target/release/bundle/dmg -name "*.dmg" | head -1)
          xcrun notarytool submit "$DMG_PATH" \
            --apple-id "$APPLE_ID" \
            --password "$APPLE_PASSWORD" \
            --team-id "$APPLE_TEAM_ID" \
            --wait
          xcrun stapler staple "$DMG_PATH"

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            src-tauri/target/release/bundle/dmg/*.dmg
          generate_release_notes: true
          draft: false
          prerelease: ${{ contains(github.ref, 'beta') || contains(github.ref, 'alpha') }}
```

### Step 2: Configure Auto-Updates

**Add to `src-tauri/Cargo.toml`:**
```toml
[dependencies]
tauri-plugin-updater = "2"
```

**Update `src-tauri/tauri.conf.json`:**
```json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY",
      "endpoints": [
        "https://github.com/yourusername/voiceflow/releases/latest/download/latest.json"
      ]
    }
  }
}
```

**Generate update keys:**
```bash
# Generate a new key pair
pnpm tauri signer generate -w ~/.tauri/voiceflow.key

# The public key goes in tauri.conf.json
# The private key goes in GitHub secrets as TAURI_SIGNING_PRIVATE_KEY
```

**Create update manifest (`scripts/create-update-manifest.js`):**
```javascript
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const version = process.argv[2];
const dmgPath = process.argv[3];
const signature = process.argv[4];

const manifest = {
  version,
  notes: `Release ${version}`,
  pub_date: new Date().toISOString(),
  platforms: {
    'darwin-x86_64': {
      signature,
      url: `https://github.com/yourusername/voiceflow/releases/download/v${version}/VoiceFlow_${version}_x64.dmg`,
    },
    'darwin-aarch64': {
      signature,
      url: `https://github.com/yourusername/voiceflow/releases/download/v${version}/VoiceFlow_${version}_aarch64.dmg`,
    },
  },
};

fs.writeFileSync('latest.json', JSON.stringify(manifest, null, 2));
console.log('Update manifest created');
```

### Step 3: Add Update Check in App

**`src/hooks/useUpdater.ts`:**
```typescript
import { useEffect, useState } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdateInfo {
  available: boolean;
  version?: string;
  body?: string;
}

export function useUpdater() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ available: false });
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      const update = await check();
      if (update) {
        setUpdateInfo({
          available: true,
          version: update.version,
          body: update.body,
        });
      } else {
        setUpdateInfo({ available: false });
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setChecking(false);
    }
  };

  const downloadAndInstall = async () => {
    setDownloading(true);
    try {
      const update = await check();
      if (update) {
        await update.downloadAndInstall((event) => {
          if (event.event === 'Progress') {
            const { contentLength, downloaded } = event.data;
            if (contentLength) {
              setProgress((downloaded / contentLength) * 100);
            }
          }
        });
        await relaunch();
      }
    } catch (error) {
      console.error('Failed to download update:', error);
    } finally {
      setDownloading(false);
    }
  };

  // Check on mount
  useEffect(() => {
    checkForUpdates();
  }, []);

  return {
    updateInfo,
    checking,
    downloading,
    progress,
    checkForUpdates,
    downloadAndInstall,
  };
}
```

**`src/components/UpdateNotification.tsx`:**
```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useUpdater } from '../hooks/useUpdater';

export const UpdateNotification = () => {
  const { updateInfo, downloading, progress, downloadAndInstall } = useUpdater();

  if (!updateInfo.available) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 bg-white rounded-xl shadow-lg p-4 max-w-sm z-50 border border-gray-200"
      >
        <h3 className="font-semibold text-gray-900">Update Available</h3>
        <p className="text-sm text-gray-600 mt-1">
          Version {updateInfo.version} is available
        </p>
        
        {updateInfo.body && (
          <p className="text-xs text-gray-500 mt-2">{updateInfo.body}</p>
        )}

        {downloading ? (
          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Downloading... {Math.round(progress)}%
            </p>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              onClick={downloadAndInstall}
              className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
            >
              Update Now
            </button>
            <button className="px-3 py-1.5 text-gray-600 text-sm hover:bg-gray-100 rounded-lg">
              Later
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
```

---

## Pre-Release Checklist

### Code Quality
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No Rust compiler warnings
- [ ] Linting passes
- [ ] Code reviewed

### Functionality
- [ ] Recording works reliably
- [ ] Transcription is accurate
- [ ] Polishing improves text
- [ ] Auto-paste works in major apps
- [ ] Settings persist correctly
- [ ] History is saved
- [ ] Hotkey works globally

### Security
- [ ] API key is stored securely
- [ ] No secrets in code
- [ ] HTTPS only for API calls
- [ ] Entitlements are minimal

### Distribution
- [ ] Icons are correct size/format
- [ ] App is signed
- [ ] App is notarized
- [ ] DMG installs correctly
- [ ] Gatekeeper accepts app
- [ ] Auto-update works

### Documentation
- [ ] README is complete
- [ ] CHANGELOG is updated
- [ ] License is included
- [ ] Privacy policy exists

---

## Post-Release

### Monitor
- [ ] Check for crash reports
- [ ] Monitor GitHub issues
- [ ] Track API usage costs
- [ ] Gather user feedback

### Iterate
- [ ] Plan next version features
- [ ] Fix reported bugs
- [ ] Improve based on feedback
- [ ] Update dependencies regularly

---

## Quick Reference

### Build Commands

```bash
# Development
pnpm tauri dev

# Production build
pnpm tauri build

# Build with verbose logging
RUST_LOG=debug pnpm tauri build

# Build for specific target
pnpm tauri build --target aarch64-apple-darwin
pnpm tauri build --target x86_64-apple-darwin
```

### Release Commands

```bash
# Create a new release tag
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0

# Manual notarization
xcrun notarytool submit app.dmg --keychain-profile "AC_PASSWORD" --wait
xcrun stapler staple app.dmg
```

### Verification Commands

```bash
# Verify signature
codesign --verify --verbose=4 VoiceFlow.app
spctl --assess --verbose=4 VoiceFlow.app

# Verify notarization
xcrun stapler validate VoiceFlow.dmg

# Check entitlements
codesign -d --entitlements - VoiceFlow.app
```

---

## Congratulations!

You've completed the 8-week MVP development plan for VoiceFlow. Your app should now:

- Record voice input via global hotkey
- Transcribe speech using OpenAI Whisper
- Polish text using GPT
- Auto-paste into active applications
- Run as a menu bar app
- Save history and settings
- Support custom dictionary and snippets
- Handle errors gracefully
- Update automatically

**Next steps:**
1. Gather user feedback
2. Monitor for bugs
3. Plan v1.1 features
4. Consider pricing/monetization
5. Build a landing page

Good luck with your launch! 🚀
