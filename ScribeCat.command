#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

APP_BUNDLE="./src-tauri/target/release/bundle/macos/ScribeCat.app"
APP_BIN="./src-tauri/target/release/scribecat-app"

if [ -d "$APP_BUNDLE" ]; then
  open "$APP_BUNDLE"
  exit 0
fi

if [ -x "$APP_BIN" ]; then
  "$APP_BIN" "$@"
  exit 0
fi

echo "Desktop build not found; starting tauri dev server..."
npm run tauri:dev "$@"
