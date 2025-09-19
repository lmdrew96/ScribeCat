#!/usr/bin/env bash
set -euo pipefail
cmd="${1:-prelaunch}"
rdir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$rdir"
mkdir -p web/.runtime
static_pid="web/.runtime/static.pid"
tauri_pid="web/.runtime/tauri.pid"
if [ "$cmd" = "prelaunch" ]; then
  if [ -f "$static_pid" ] && kill -0 "$(cat "$static_pid")" 2>/dev/null; then
    :
  else
    rm -f "$static_pid"
  fi
  if [ -f "$tauri_pid" ] && kill -0 "$(cat "$tauri_pid")" 2>/dev/null; then
    :
  else
    rm -f "$tauri_pid"
  fi
  if lsof -i :1420 -sTCP:LISTEN -Pn 2>/dev/null | grep -q .; then
    if [ -f "$static_pid" ] && kill -0 "$(cat "$static_pid")" 2>/dev/null; then
      kill -9 "$(cat "$static_pid")" 2>/dev/null || true
      rm -f "$static_pid"
    fi
  fi
elif [ "$cmd" = "end" ]; then
  if [ -f "$tauri_pid" ]; then kill -9 "$(cat "$tauri_pid")" 2>/dev/null || true; rm -f "$tauri_pid"; fi
  if [ -f "$static_pid" ]; then kill -9 "$(cat "$static_pid")" 2>/dev/null || true; rm -f "$static_pid"; fi
  pkill -f "static_web.mjs" 2>/dev/null || true
  pkill -f "tauri dev" 2>/dev/null || true
fi
