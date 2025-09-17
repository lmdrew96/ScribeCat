#!/usr/bin/env bash
set -euo pipefail
lsof -ti :1420 | xargs -r kill -9 || true
node scripts/static_web.mjs &
echo $! > backups/static_server.pid
