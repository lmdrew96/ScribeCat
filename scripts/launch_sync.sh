#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$here"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.cargo/bin:$HOME/.volta/bin:$HOME/.nvm/versions/node/current/bin:$PATH"

LOG_DIR="web/.runtime"
LOG_FILE="$LOG_DIR/dev.log"
mkdir -p "$LOG_DIR"

exec > >(while IFS= read -r line; do printf '[%s] %s\n' "$(date +%H:%M:%S)" "$line"; done | tee -a "$LOG_FILE") 2>&1

echo "launch_sync start"

timestamp="$(date +%Y%m%dT%H%M%S)"
current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo detached)"
if git status --porcelain | grep -q "."; then
  echo "Stashing working tree changes"
  git stash push --include-untracked -m "launch_sync ${timestamp}" || true
fi

echo "Fetching origin"
git fetch origin --prune --tags || true

if git rev-parse --verify origin/main >/dev/null 2>&1; then
  salvage_branch="salvage/${current_branch//\//-}-${timestamp}"
  echo "Creating salvage branch $salvage_branch"
  git branch "$salvage_branch" >/dev/null 2>&1 || true
  echo "Checking out main"
  git switch --discard-changes main >/dev/null 2>&1 || git checkout -B main
  echo "Resetting to origin/main"
  git reset --hard origin/main
else
  echo "origin/main missing; keeping current branch"
fi

echo "Exporting secrets"
bash scripts/secrets_export.sh >/dev/null 2>&1 || true

echo "Fetching static assets"
node scripts/fetch_assets.mjs >/dev/null 2>&1 || true

echo "Ensuring static server"
if ! bash scripts/start_static.sh >/dev/null 2>&1; then
  echo "Static server failed to start; attempting port reset"
  bash scripts/port1420_reset.sh >/dev/null 2>&1 || true
fi
if pgrep -f "scripts/static_web.mjs" >/dev/null 2>&1; then
  pgrep -f "scripts/static_web.mjs" | head -n1 > "$LOG_DIR/static.pid" || true
fi

echo "Ensuring dev API"
bash scripts/start_dev_api.sh >/dev/null 2>&1 || true

echo "Launching Tauri dev"
if command -v npx >/dev/null 2>&1; then
  npx tauri dev &
  tauri_pid=$!
  echo "$tauri_pid" > "$LOG_DIR/tauri.pid"
  trap 'echo "Stopping tauri dev"; kill "$tauri_pid" >/dev/null 2>&1 || true' INT TERM
  wait "$tauri_pid"
else
  echo "npx not available"
fi

echo "launch_sync done"
