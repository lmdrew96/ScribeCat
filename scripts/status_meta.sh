#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INDEX_FILE="$ROOT_DIR/web/index.html"
BACKUP_DIR="$ROOT_DIR/backups"
BACKUP_FILE="$BACKUP_DIR/index.html.orig"

if [[ "${1:-}" == "--restore" ]]; then
  if [[ -f "$BACKUP_FILE" ]]; then
    cp "$BACKUP_FILE" "$INDEX_FILE"
    echo "status_meta: restored $INDEX_FILE from backup"
  else
    echo "status_meta: no backup to restore" >&2
  fi
  exit 0
fi

if [[ ! -f "$INDEX_FILE" ]]; then
  echo "status_meta: missing $INDEX_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
if [[ ! -f "$BACKUP_FILE" ]]; then
  cp "$INDEX_FILE" "$BACKUP_FILE"
fi

branch=$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
sha=$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")

INDEX_FILE="$INDEX_FILE" GIT_BRANCH="$branch" GIT_SHA="$sha" node <<'NODE'
const fs = require("fs");
const path = process.env.INDEX_FILE;
const branch = process.env.GIT_BRANCH || "unknown";
const sha = process.env.GIT_SHA || "unknown";
const metaTag = `<meta name="git" content="branch=${branch};sha=${sha}" />`;

let contents = fs.readFileSync(path, "utf8");
if (contents.includes('<meta name="git"')) {
  contents = contents.replace(/<meta name="git"[^>]*>/i, metaTag);
} else {
  contents = contents.replace(/(<head[^>]*>)/i, `$1\n  ${metaTag}`);
}
fs.writeFileSync(path, contents);
NODE

echo "status_meta: set branch=$branch sha=$sha"
