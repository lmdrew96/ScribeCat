#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <project_root> <plan_patch> [preview_timestamp]" >&2
  exit 1
fi

ROOT_INPUT="$1"
PLAN_PATCH="$2"
REQUESTED_TIMESTAMP="${3:-}"

if [[ ! -d "$ROOT_INPUT" ]]; then
  echo "Project root not found: $ROOT_INPUT" >&2
  exit 1
fi

if [[ ! -f "$PLAN_PATCH" ]]; then
  echo "Plan patch not found: $PLAN_PATCH" >&2
  exit 1
fi

if ! command -v wkhtmltoimage >/dev/null 2>&1; then
  echo "wkhtmltoimage is required but not installed. Install wkhtmltopdf package." >&2
  exit 1
fi

ROOT_DIR="$(cd "$ROOT_INPUT" && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${DEV_PORT:-1420}"
TIMESTAMP="$REQUESTED_TIMESTAMP"
if [[ -z "$TIMESTAMP" ]]; then
  TIMESTAMP="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
fi

PREVIEW_DIR="$ROOT_DIR/backups/previews/$TIMESTAMP"
OUTPUT_PATH="$PREVIEW_DIR/dryrun.png"
PID_FILE="$ROOT_DIR/backups/static_server.pid"
SNIPPET_FILE="$PREVIEW_DIR/collapse-snippet.js"

mkdir -p "$PREVIEW_DIR"
cp "$PLAN_PATCH" "$PREVIEW_DIR/plan.patch"

cat >"$SNIPPET_FILE" <<'JS'
(function () {
  try {
    window.localStorage.setItem('scribecat:statusVisible', 'true');
    window.localStorage.setItem('scribecat:statusCollapsed', '1');
  } catch (error) {}
  function collapseOverlay() {
    try {
      var root = document.getElementById('status-root');
      if (root) {
        root.dataset.visible = 'true';
      }
      var overlay = root ? root.querySelector('.status-overlay') : document.querySelector('.status-overlay');
      if (overlay && overlay.getAttribute('data-collapsed') !== 'true') {
        var toggle = overlay.querySelector('.status-overlay__toggle');
        if (toggle) {
          toggle.click();
          return;
        }
        overlay.setAttribute('data-collapsed', 'true');
      }
    } catch (error) {}
  }
  if (document.readyState === 'complete') {
    setTimeout(collapseOverlay, 200);
  } else {
    window.addEventListener('load', function () {
      setTimeout(collapseOverlay, 200);
    });
  }
})();
JS

SERVER_PID=""
cleanup() {
  if [[ -n "$SERVER_PID" && "$SERVER_PID" =~ ^[0-9]+$ ]]; then
    if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
      kill "$SERVER_PID" >/dev/null 2>&1 || true
      wait "$SERVER_PID" >/dev/null 2>&1 || true
    fi
  fi
  rm -f "$PID_FILE"
}
trap cleanup EXIT

SHOW_STATUS_OVERLAY=1 DEV_PORT="$PORT" bash "$SCRIPT_DIR/start_static.sh" >/dev/null

if [[ -f "$PID_FILE" ]]; then
  SERVER_PID="$(tr -d '\r\n' < "$PID_FILE" || true)"
fi

RUN_SCRIPT="$(tr '\n' ' ' < "$SNIPPET_FILE")"

wkhtmltoimage \
  --format png \
  --quality 90 \
  --width 1280 \
  --height 720 \
  --enable-javascript \
  --javascript-delay 2500 \
  --run-script "$RUN_SCRIPT" \
  "http://localhost:$PORT/?status=1" \
  "$OUTPUT_PATH"

if [[ ! -f "$OUTPUT_PATH" ]]; then
  echo "Preview capture failed" >&2
  exit 1
fi

echo "$OUTPUT_PATH"
