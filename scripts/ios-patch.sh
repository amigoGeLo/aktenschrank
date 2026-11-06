#!/usr/bin/env bash
# Passt das von "cap add ios" erzeugte Xcode-Projekt an (Info.plist, App-Icon).
set -euo pipefail
PLIST="ios/App/App/Info.plist"
pb() { /usr/libexec/PlistBuddy -c "$1" "$PLIST" 2>/dev/null || true; }
set_str() { pb "Delete :$1"; /usr/libexec/PlistBuddy -c "Add :$1 string $2" "$PLIST"; }
set_bool() { pb "Delete :$1"; /usr/libexec/PlistBuddy -c "Add :$1 bool $2" "$PLIST"; }

set_str CFBundleDisplayName "Aktenschrank"
set_str NSFaceIDUsageDescription "Aktenschrank nutzt Face ID, um die App zu entsperren. / Face ID is used to unlock the app."
set_str NSCameraUsageDescription "Mit der Kamera fotografierst du Briefe und Dokumente. / The camera is used to photograph letters and documents."
set_str NSPhotoLibraryUsageDescription "Du kannst Fotos von Dokumenten aus deiner Mediathek hinzufügen. / You can add photos of documents from your library."
set_bool ITSAppUsesNonExemptEncryption false
set_bool UIFileSharingEnabled false

# App-Icon (1024x1024, ohne Transparenz)
ICONSET="ios/App/App/Assets.xcassets/AppIcon.appiconset"
if [ -d "$ICONSET" ]; then
  FILE=$(node -e "const c=require('./$ICONSET/Contents.json');console.log((c.images.find(i=>i.filename)||{}).filename||'AppIcon-512@2x.png')")
  cp icons/icon-1024.png "$ICONSET/$FILE"
  echo "Icon -> $ICONSET/$FILE"
fi
echo "Info.plist angepasst"
