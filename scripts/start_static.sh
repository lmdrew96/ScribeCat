#!/usr/bin/env bash
set -euo pipefail
PORT="${DEV_PORT:-1420}"
pids=$(lsof -ti :$PORT 2>/dev/null || true); [ -n "${pids:-}" ] && kill -9 $pids || true
node -e 'const fs=require("fs");try{const j=JSON.parse(fs.readFileSync("src-tauri/tauri.conf.json","utf8"));fs.mkdirSync("web",{recursive:true});fs.writeFileSync("web/version.json",JSON.stringify({productName:j.productName,version:j.version}))}catch(e){fs.mkdirSync("web",{recursive:true});fs.writeFileSync("web/version.json",JSON.stringify({productName:"ScribeCat",version:"0.1.0"}))}'
node scripts/static_web.mjs >/dev/null 2>&1 &
PID=$!
for i in {1..40}; do
  curl -sfI "http://localhost:$PORT/" >/dev/null && { echo "static web at http://localhost:$PORT"; echo $PID > backups/static_server.pid; exit 0; }
  sleep 0.25
done
echo "static server failed to start on :$PORT" >&2; exit 1
