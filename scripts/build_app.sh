#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STATIC_PID_FILE="$ROOT_DIR/backups/static_server.pid"

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
  bash "$SCRIPT_DIR/status_meta.sh" --restore >/dev/null 2>&1 || true
  trap - EXIT
  exit $status
}
trap cleanup EXIT

cd "$ROOT_DIR"

echo "build_app: ensuring application icon"
bash "$SCRIPT_DIR/ensure_icon.sh"

echo "build_app: preparing static assets"
SHOW_STATUS_OVERLAY=${SHOW_STATUS_OVERLAY:-0} bash "$SCRIPT_DIR/start_static.sh"

echo "build_app: injecting git metadata"
bash "$SCRIPT_DIR/status_meta.sh"

echo "build_app: running tauri build"
npx tauri build

echo "build_app: build complete"
