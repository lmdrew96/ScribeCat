#!/bin/zsh
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${(%):-%N}")" && pwd)"
. "$SCRIPT_DIR/dev_common.sh"
REPO_DIR="$(ensure_repo "${1:-}")"
cd "$REPO_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
git add -A
git commit -m "chore: end session $TS" || true
git push -u origin HEAD || true
DB="$(default_branch)"
gh pr create --fill --base "$DB" || true
