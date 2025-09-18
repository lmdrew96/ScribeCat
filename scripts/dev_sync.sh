#!/bin/zsh
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${(%):-%N}")" && pwd)"
. "$SCRIPT_DIR/dev_common.sh"
REPO_DIR="$(ensure_repo "${1:-}")"
cd "$REPO_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
git ls-files -u | grep -q . && { git rebase --abort || true; git merge --abort || true; git rm -rf --cached src-tauri/target target node_modules web/assets web/fonts src-tauri/icons 2>/dev/null || true; printf "%s\n" "/src-tauri/target/" "/target/" "/node_modules/" "/web/assets/" "/web/fonts/" "/src-tauri/icons/" ".DS_Store" "logs/" >> .gitignore; git add .gitignore || true; git commit -m "chore: auto-resolve build artifacts" || true; }
git status --porcelain | grep -q . && git stash push -u -m "sync-autostash-$TS" >/dev/null 2>&1 || true
git fetch origin --prune || true
DB="$(default_branch)"
CUR="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "$DB")"
[ "$CUR" = "$DB" ] && { CUR="nae/dev-$TS"; git switch -c "$CUR" "origin/$DB"; } || git switch "$CUR" 2>/dev/null || git checkout -b "$CUR" "origin/$DB"
if ! git rebase "origin/$DB"; then git rebase --abort || true; if ! git merge --no-edit "origin/$DB"; then git merge --abort || true; git stash push -u -m "sync-rescue-$TS" >/dev/null 2>&1 || true; git reset --hard "origin/$DB"; CUR="nae/dev-$TS"; git switch -c "$CUR" "origin/$DB"; git stash pop || true; fi; fi
prep
npx tauri dev
