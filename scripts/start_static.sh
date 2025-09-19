#!/usr/bin/env bash
set -euo pipefail
port="${PORT:-1420}"
node scripts/static_web.mjs >/dev/null 2>&1 &
echo $! > web/.runtime/static.pid
sleep 1
