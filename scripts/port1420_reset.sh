set -euo pipefail
for pid in $(lsof -ti tcp:1420 2>/dev/null || true); do kill "$pid" || true; done
sleep 1
bash scripts/start_static.sh
