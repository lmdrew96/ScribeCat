#!/usr/bin/env bash
set -euo pipefail

# Resolve repository root relative to this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

# Helper to print highlighted status messages
info() {
  printf '\n\033[1;36m[ScribeCat]\033[0m %s\n' "$1"
}

info "Preparing to launch the ScribeCat desktop app..."

if [ ! -d "node_modules" ]; then
  info "Installing dependencies (npm install)..."
  npm install
fi

info "Starting Tauri dev server (this window will stay open)..."
# Use npm to invoke the local Tauri CLI pinned in package.json
npm run tauri:dev
