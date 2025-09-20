#!/usr/bin/env zsh
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$here"
mkdir -p web/.runtime
: > web/.runtime/env.js
pids="$(lsof -ti tcp:1420 2>/dev/null | tr '\n' ' ')"
[ -n "$pids" ] && echo "$pids" | xargs -I {} kill {} 2>/dev/null || true
pkill -f "scripts/static_web.mjs" >/dev/null 2>&1 || true
node scripts/static_web.mjs > web/.runtime/static.log 2>&1 &
echo $! > web/.runtime/static.pid
