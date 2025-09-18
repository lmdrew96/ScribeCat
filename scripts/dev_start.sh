#!/bin/zsh
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${(%):-%N}")" && pwd)"
. "$SCRIPT_DIR/dev_common.sh"
REPO_DIR="$(ensure_repo "${1:-}")"
cd "$REPO_DIR"
git fetch origin --prune || true
DB="$(default_branch)"
TS="$(date +%Y%m%d-%H%M%S)"
git status --porcelain --ignored | grep -q . && git stash push -a -m "session-autostash-$TS" >/dev/null 2>&1 || true
git switch -c "nae/dev-$TS" "origin/$DB" 2>/dev/null || git switch "nae/dev-$TS" 2>/dev/null || git checkout -b "nae/dev-$TS" "origin/$DB"
printf "%s\n" "/src-tauri/target/" "/target/" "/node_modules/" "/web/assets/" "/web/fonts/" "/src-tauri/icons/" ".DS_Store" "logs/" >> .gitignore
git rm -rf --cached src-tauri/target target node_modules web/assets web/fonts src-tauri/icons 2>/dev/null || true
git add .gitignore 2>/dev/null || true
git commit -m "chore: ensure ignores for session $TS" || true
prep
npx tauri dev
