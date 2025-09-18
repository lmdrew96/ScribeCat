#!/usr/bin/env bash
set -euo pipefail
mkdir -p src-tauri/icons
if [ -f web/assets/nugget.png ]; then
  if command -v sips >/dev/null 2>&1; then sips -s format png -Z 512 web/assets/nugget.png --out src-tauri/icons/icon.png >/dev/null
  else cp -f web/assets/nugget.png src-tauri/icons/icon.png
  fi
else
  python3 - "$@" <<'PY'
import base64,os
b="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
os.makedirs("src-tauri/icons",exist_ok=True)
open("src-tauri/icons/icon.png","wb").write(base64.b64decode(b))
print("wrote placeholder icon")
PY
fi
[ -f src-tauri/icons/icon.png ] || { echo "icon missing"; exit 1; }
echo "icon ready at src-tauri/icons/icon.png"
