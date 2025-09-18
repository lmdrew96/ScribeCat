#!/usr/bin/env bash
set -euo pipefail
mkdir -p src-tauri/icons
if [ -f web/assets/nugget.png ]; then
  sips -s format png -Z 512 web/assets/nugget.png --out src-tauri/icons/icon.png >/dev/null
else
  sips -s format png -Z 512 /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns --out src-tauri/icons/icon.png >/dev/null
fi
[ -f src-tauri/icons/icon.png ] || { echo "icon missing"; exit 1; }
echo "icon ready at src-tauri/icons/icon.png"
