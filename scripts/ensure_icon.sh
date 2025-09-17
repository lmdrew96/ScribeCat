#!/usr/bin/env bash
set -euo pipefail
SRC="web/assets/nugget.png"
DST="src-tauri/icons/icon.png"
mkdir -p "$(dirname "$DST")"
if [ ! -f "$SRC" ]; then
  echo "missing web/assets/nugget.png; run: node scripts/fetch_assets.mjs" >&2
  exit 1
fi
sips -s format png -Z 512 "$SRC" --out "$DST" >/dev/null
echo "icon ready at $DST"
