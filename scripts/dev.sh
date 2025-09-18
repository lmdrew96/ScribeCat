#!/usr/bin/env bash
set -euo pipefail
node scripts/fetch_assets.mjs || true
bash scripts/ensure_icon.sh
bash scripts/start_static.sh
npx tauri dev
