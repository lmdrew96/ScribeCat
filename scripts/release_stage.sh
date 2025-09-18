#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_NAME="ScribeCat.app"
SOURCE_BUNDLE="$ROOT_DIR/target/release/bundle/macos/$APP_NAME"
DEST_DIR="$HOME/Applications"
DEST_BUNDLE="$DEST_DIR/$APP_NAME"
DRY_RUN=0

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
  shift
fi

if [[ -d "$SOURCE_BUNDLE" ]]; then
  echo "release_stage: staging $SOURCE_BUNDLE -> $DEST_BUNDLE"
else
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "release_stage: (dry-run) expected bundle at $SOURCE_BUNDLE" >&2
    echo "release_stage: (dry-run) would copy to $DEST_BUNDLE"
    exit 0
  fi
  echo "release_stage: missing bundle at $SOURCE_BUNDLE" >&2
  exit 1
fi

if [[ $DRY_RUN -eq 1 ]]; then
  echo "release_stage: (dry-run) would copy to $DEST_BUNDLE"
  exit 0
fi

OS_NAME="$(uname -s 2>/dev/null || echo unknown)"
if [[ "$OS_NAME" != "Darwin" ]]; then
  echo "release_stage: staging requires macOS (detected $OS_NAME)" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"

if command -v rsync >/dev/null 2>&1; then
  rm -rf "$DEST_BUNDLE"
  rsync -a "$SOURCE_BUNDLE" "$DEST_DIR/"
else
  rm -rf "$DEST_BUNDLE"
  cp -R "$SOURCE_BUNDLE" "$DEST_BUNDLE"
fi

echo "release_stage: staged app to $DEST_BUNDLE"
