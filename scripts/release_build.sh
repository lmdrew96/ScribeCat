#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STATIC_PID_FILE="$ROOT_DIR/backups/static_server.pid"
index_modified=0

cleanup() {
  local status=$?

  if [[ -f "$STATIC_PID_FILE" ]]; then
    local pid
    pid=$(cat "$STATIC_PID_FILE" 2>/dev/null || echo "")
    if [[ -n "$pid" ]]; then
      if ps -p "$pid" >/dev/null 2>&1; then
        kill "$pid" >/dev/null 2>&1 || true
        wait "$pid" 2>/dev/null || true
      fi
    fi
    rm -f "$STATIC_PID_FILE"
  fi

  if [[ $index_modified -eq 1 ]]; then
    bash "$SCRIPT_DIR/status_meta.sh" --restore >/dev/null 2>&1 || true
  fi

  trap - EXIT
  exit $status
}
trap cleanup EXIT

cd "$ROOT_DIR"

echo "release_build: fetching external assets (best effort)"
node "$SCRIPT_DIR/fetch_assets.mjs" || true

echo "release_build: ensuring application icon"
bash "$SCRIPT_DIR/ensure_icon.sh"

echo "release_build: preparing static bundle"
SHOW_STATUS_OVERLAY="${SHOW_STATUS_OVERLAY:-0}" bash "$SCRIPT_DIR/start_static.sh"

echo "release_build: embedding git metadata"
bash "$SCRIPT_DIR/status_meta.sh"
index_modified=1

echo "release_build: collecting tauri info"
npx tauri info

echo "release_build: building packaged application"
npx tauri build

APP_BUNDLE="$ROOT_DIR/target/release/bundle/macos/ScribeCat.app"
if [[ -d "$APP_BUNDLE" ]]; then
  echo "release_build: bundle available at $APP_BUNDLE"
else
  echo "release_build: warning - bundle not found at $APP_BUNDLE" >&2
fi
