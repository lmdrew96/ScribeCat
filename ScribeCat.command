#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

CANDIDATE_APPS=(
  "src-tauri/target/universal-apple-darwin/release/bundle/macos/ScribeCat.app"
  "src-tauri/target/release/bundle/macos/ScribeCat.app"
  "src-tauri/target/debug/bundle/macos/ScribeCat.app"
)

for app_path in "${CANDIDATE_APPS[@]}"; do
  if [[ -d "$app_path" ]]; then
    echo "Launching ScribeCat desktop from $app_path"
    open "$app_path"
    exit 0
  fi
fi

if command -v npm >/dev/null 2>&1; then
  echo "ScribeCat.app not found. Falling back to 'npm run tauri:dev'."
  npm run tauri:dev
else
  echo "ScribeCat.app not found and npm is unavailable."
  echo "Please build the desktop app with 'npm run tauri:build' first."
  exit 1
fi
