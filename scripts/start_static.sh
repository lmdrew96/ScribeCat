#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$here"
mkdir -p web/.runtime
pidfile="web/.runtime/static.pid"

if [ -f "$pidfile" ]; then
  pid="$(cat "$pidfile" 2>/dev/null || true)"
  if [ -n "${pid:-}" ] && kill -0 "$pid" 2>/dev/null; then exit 0; fi
  rm -f "$pidfile"
fi

pids="$(lsof -ti tcp:1420 2>/dev/null | tr '\n' ' ')"
[ -n "$pids" ] && echo "$pids" | xargs -I {} kill {} 2>/dev/null || true
sleep 0.5

nohup node scripts/static_web.mjs > web/.runtime/static.log 2>&1 &
echo $! > "$pidfile"
sleep 1
