#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_NAME="ScribeCat.app"
STAGED_APP="$HOME/Applications/$APP_NAME"
BUILT_APP="$ROOT_DIR/target/release/bundle/macos/$APP_NAME"
DRY_RUN=0

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
  shift
fi

preferred_path="$STAGED_APP"
fallback_path="$BUILT_APP"

if [[ -d "$preferred_path" ]]; then
  APP_PATH="$preferred_path"
elif [[ -d "$fallback_path" ]]; then
  APP_PATH="$fallback_path"
else
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "release_open: (dry-run) would prefer $preferred_path (not found)" >&2
    echo "release_open: (dry-run) fallback path $fallback_path (not found)" >&2
    exit 0
  fi
  echo "release_open: no app bundle found (checked $preferred_path and $fallback_path)" >&2
  exit 1
fi

echo "release_open: using $APP_PATH"

if [[ $DRY_RUN -eq 1 ]]; then
  exit 0
fi

if ! command -v open >/dev/null 2>&1; then
  echo "release_open: 'open' command not available; this script requires macOS" >&2
  exit 1
fi

open "$APP_PATH"
