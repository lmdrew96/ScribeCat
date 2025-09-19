#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$here"

LOG_DIR="web/.runtime"
PID_FILES=(static.pid tauri.pid dev_api.pid)

kill_pid_file() {
  local file="$1"
  if [ -f "$file" ]; then
    local pid
    pid="$(cat "$file" 2>/dev/null || true)"
    if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      sleep 1
      if kill -0 "$pid" >/dev/null 2>&1; then
        kill -9 "$pid" >/dev/null 2>&1 || true
      fi
    fi
    rm -f "$file"
  fi
}

for name in "${PID_FILES[@]}"; do
  kill_pid_file "$LOG_DIR/$name"
done

pkill -f "scripts/static_web.mjs" >/dev/null 2>&1 || true
pkill -f "scripts/dev_api.mjs" >/dev/null 2>&1 || true
pkill -f "tauri dev" >/dev/null 2>&1 || true
pkill -f "cargo-tauri" >/dev/null 2>&1 || true
pkill -f "ScribeCat" >/dev/null 2>&1 || true

for port in 1420 8787; do
  pids="$(lsof -ti tcp:"$port" 2>/dev/null | tr '\n' ' ')"
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill >/dev/null 2>&1 || true
  fi
done

echo "Stopped dev services"
