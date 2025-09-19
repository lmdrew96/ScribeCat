#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$here"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.cargo/bin:$HOME/.volta/bin:$HOME/.nvm/versions/node/current/bin:$PATH"
LOG_DIR="web/.runtime"; LOG_FILE="$LOG_DIR/dev.log"; mkdir -p "$LOG_DIR"; touch "$LOG_FILE"
exec > >(while IFS= read -r line; do printf '[%s] %s\n' "$(date +%H:%M:%S)" "$line"; done | tee -a "$LOG_FILE") 2>&1
echo "launch_refresh start"
bash scripts/secrets_export.sh || true
if [ -x scripts/dev_refresh.sh ]; then
  bash scripts/dev_refresh.sh &
else
  node scripts/fetch_assets.mjs || true
  if ! nc -z localhost 1420 >/dev/null 2>&1; then node scripts/static_web.mjs >/dev/null 2>&1 & echo $! > web/.runtime/static.pid; sleep 1; fi
  npx tauri dev &
  echo $! > web/.runtime/tauri.pid
fi
bash scripts/bring_front.sh &
echo "launch_refresh done"
exit 0
