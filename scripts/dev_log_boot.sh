#!/usr/bin/env bash
set -euo pipefail
LOG_DIR="web/.runtime"
LOG_FILE="$LOG_DIR/dev.log"
mkdir -p "$LOG_DIR"
touch "$LOG_FILE"
export SC_LOG_FILE="$LOG_FILE"
exec > >(while IFS= read -r line; do printf '[%s] %s\n' "$(date +%H:%M:%S)" "$line"; done | tee -a "$SC_LOG_FILE") 2>&1
