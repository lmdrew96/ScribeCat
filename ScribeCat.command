#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

APP_NAME="ScribeCat"
CANDIDATE_PATHS=(
  "./src-tauri/target/release/bundle/macos/${APP_NAME}.app"
  "./${APP_NAME}.app"
)

for app_path in "${CANDIDATE_PATHS[@]}"; do
  if [ -d "$app_path" ]; then
    echo "Launching ${APP_NAME} from ${app_path}"
    open "$app_path"
    exit 0
  fi
done

echo "Attempting to launch ${APP_NAME} via system application registry"
if open -a "$APP_NAME" >/dev/null 2>&1; then
  exit 0
fi

echo "Could not locate ${APP_NAME} desktop app." >&2
exit 1
