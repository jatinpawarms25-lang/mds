#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

APP_NAME="MDS_Desktop_OS.app"
CONTENTS="$DIR/$APP_NAME/Contents"
MACOS="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"

echo " Recompiling Swift native application wrapper..."
swiftc -O "$DIR/app_native/main.swift" -o "$DIR/app_native/MDS_Desktop_OS" -framework AppKit -framework WebKit

echo " Assembling macOS native application bundle..."
rm -rf "$DIR/$APP_NAME"
mkdir -p "$MACOS"
mkdir -p "$RESOURCES"
mkdir -p "$RESOURCES/vendor"
mkdir -p "$RESOURCES/js"
mkdir -p "$RESOURCES/supabase"

# Copy binary
cp "$DIR/app_native/MDS_Desktop_OS" "$MACOS/MDS_Desktop_OS"
chmod +x "$MACOS/MDS_Desktop_OS"

# Copy resources
cp "$DIR/index.html" "$RESOURCES/index.html"
cp "$DIR/app.js" "$RESOURCES/app.js"
cp "$DIR/app.jsx" "$RESOURCES/app.jsx"
cp "$DIR/manifest.json" "$RESOURCES/manifest.json"
cp "$DIR/sw.js" "$RESOURCES/sw.js"
cp "$DIR/content_pack.json" "$RESOURCES/content_pack.json"
cp "$DIR/images.json" "$RESOURCES/images.json"
cp "$DIR/IMAGE-CREDITS.md" "$RESOURCES/IMAGE-CREDITS.md" 2>/dev/null || true
cp "$DIR/.env.example" "$RESOURCES/.env.example" 2>/dev/null || true
cp -r "$DIR/supabase/"* "$RESOURCES/supabase/" 2>/dev/null || true
cp -r "$DIR/js/"* "$RESOURCES/js/"
cp "$DIR/icon-192.png" "$RESOURCES/icon-192.png" 2>/dev/null || true
cp "$DIR/icon-512.png" "$RESOURCES/icon-512.png" 2>/dev/null || true
cp "$DIR/apple-touch-icon.png" "$RESOURCES/apple-touch-icon.png" 2>/dev/null || true
cp -r "$DIR/vendor/"* "$RESOURCES/vendor/"

# Copy AppIcon if available
if [ -f "/Users/jatinpawar/.gemini/antigravity/scratch/netnotify/AppIcon.icns" ]; then
    cp "/Users/jatinpawar/.gemini/antigravity/scratch/netnotify/AppIcon.icns" "$RESOURCES/AppIcon.icns"
fi

# Info.plist
cat << 'PLIST' > "$CONTENTS/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>MDS_Desktop_OS</string>
    <key>CFBundleIdentifier</key>
    <string>com.jatinpawar.mdsdesktopos</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>NEET-MDS Top-10 Planner</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>3.0.0</string>
    <key>CFBundleVersion</key>
    <string>4</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>LSMinimumSystemVersion</key>
    <string>12.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
        <key>NSAllowsLocalNetworking</key>
        <true/>
    </dict>
</dict>
</plist>
PLIST

echo " Ad-hoc codesigning with deep signature..."
codesign --force --deep --sign - "$DIR/$APP_NAME"

echo " MDS_Desktop_OS.app successfully packaged and signed!"
