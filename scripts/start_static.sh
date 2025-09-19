set -euo pipefail
pgrep -f "scripts/static_web.mjs" >/dev/null 2>&1 && exit 0
nohup node scripts/static_web.mjs >/dev/null 2>&1 &
sleep 1
curl -sfI http://localhost:1420/ >/dev/null
