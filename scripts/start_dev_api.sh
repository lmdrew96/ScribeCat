#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$here"

LOG_DIR="web/.runtime"
PID_FILE="$LOG_DIR/dev_api.pid"
LOG_FILE="$LOG_DIR/dev_api.log"

mkdir -p "$LOG_DIR"

if [ -f "$PID_FILE" ]; then
  existing_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$existing_pid" ] && kill -0 "$existing_pid" >/dev/null 2>&1; then
    exit 0
  fi
  rm -f "$PID_FILE"
fi

if pgrep -f "scripts/dev_api.mjs" >/dev/null 2>&1; then
  exit 0
fi

bash scripts/secrets_export.sh >/dev/null 2>&1 || true

nohup node scripts/dev_api.mjs >>"$LOG_FILE" 2>&1 &
api_pid=$!
echo "$api_pid" > "$PID_FILE"
sleep 1

exit 0
