#!/usr/bin/env bash
set -euo pipefail
LOG_DIR="web/.runtime"
LOG_FILE="$LOG_DIR/dev.log"
mkdir -p "$LOG_DIR"
touch "$LOG_FILE"
export SC_LOG_FILE="$LOG_FILE"
if [ -s "$SC_LOG_FILE" ]; then
  tail -n 2000 "$SC_LOG_FILE" > "$SC_LOG_FILE.tmp" && mv "$SC_LOG_FILE.tmp" "$SC_LOG_FILE"
fi
