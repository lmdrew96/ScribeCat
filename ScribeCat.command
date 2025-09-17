#!/bin/zsh
set -euo pipefail
cd "$(cd "$(dirname "$0")" && pwd)"
export PORT="${PORT:-1420}"
export API_PORT="${API_PORT:-8787}"
mkdir -p logs

# start API server only if not already running
if ! lsof -ti :$API_PORT >/dev/null 2>&1; then
  if [ -f server/package.json ]; then
    (corepack enable || true) >/dev/null 2>&1
    (npm --prefix server ci || npm --prefix server i) >/dev/null 2>&1
    nohup npm --prefix server run start > logs/api.log 2>&1 & echo $! > .pid_api
  elif [ -f server/server.mjs ]; then
    nohup node server/server.mjs > logs/api.log 2>&1 & echo $! > .pid_api
  elif [ -f server/index.mjs ]; then
    nohup node server/index.mjs > logs/api.log 2>&1 & echo $! > .pid_api
  fi
fi

# run app (Tauri dev); static UI server should be started by beforeDevCommand
(corepack enable || true) >/dev/null 2>&1
if [ -f pnpm-lock.yaml ]; then pnpm i --frozen-lockfile || pnpm i; elif [ -f yarn.lock ]; then yarn install --frozen-lockfile || yarn install; elif [ -f package.json ]; then npm ci || npm i; fi
exec npx tauri dev
