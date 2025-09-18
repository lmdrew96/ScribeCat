#!/usr/bin/env bash
set -euo pipefail
lsof -ti :1420 | xargs -r kill -9 || true
node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync("src-tauri/tauri.conf.json","utf8"));fs.mkdirSync("web",{recursive:true});fs.writeFileSync("web/version.json",JSON.stringify({productName:j.productName,version:j.version}))'
node scripts/static_web.mjs >/dev/null 2>&1 &
PID=$!
for i in {1..40}; do
  curl -sfI http://localhost:1420/ >/dev/null && { echo "static web at http://localhost:1420"; echo $PID > backups/static_server.pid; exit 0; }
  sleep 0.25
done
echo "static server failed to start on :1420" >&2
exit 1
