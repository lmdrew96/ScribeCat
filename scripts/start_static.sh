#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PORT="${DEV_PORT:-1420}"
SHOW_STATUS_OVERLAY="${SHOW_STATUS_OVERLAY:-1}"

cd "$ROOT_DIR"

if command -v lsof >/dev/null 2>&1; then
  pids=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [[ -n "${pids:-}" ]]; then
    kill -9 $pids >/dev/null 2>&1 || true
  fi
fi

SHOW_STATUS_OVERLAY="$SHOW_STATUS_OVERLAY" node <<'NODE'
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join("src-tauri", "tauri.conf.json");
let productName = "ScribeCat";
let version = "0.2.0";

try {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  const json = JSON.parse(raw);
  if (json && typeof json === "object") {
    if (json.productName) productName = json.productName;
    if (json.version) version = json.version;
  }
} catch (error) {}

const rawFlag = process.env.SHOW_STATUS_OVERLAY || "1";
const normalized = rawFlag.trim().toLowerCase();
const show = !["0", "false", "off"].includes(normalized);

const output = {
  productName,
  version,
  showStatusOverlay: show,
};

const targetDir = path.resolve("web");
fs.mkdirSync(targetDir, { recursive: true });
fs.writeFileSync(path.join(targetDir, "version.json"), JSON.stringify(output, null, 2));
NODE

bash "$SCRIPT_DIR/status_meta.sh"

node scripts/static_web.mjs >/dev/null 2>&1 &
PID=$!

for i in {1..40}; do
  if curl -sfI "http://localhost:$PORT/" >/dev/null; then
    echo "static web at http://localhost:$PORT"
    echo $PID > backups/static_server.pid
    exit 0
  fi
  sleep 0.25
done

echo "static server failed to start on :$PORT" >&2
exit 1
