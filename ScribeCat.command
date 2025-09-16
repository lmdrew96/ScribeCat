#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "$0")"

DEFAULT_LIVE_URL="https://app.scribecat.com/"
LOCAL_APP_URL="http://127.0.0.1:8787/"
MODE="${SCRIBECAT_MODE:-live}"
LIVE_APP_URL="${SCRIBECAT_APP_URL:-$DEFAULT_LIVE_URL}"

show_help() {
  cat <<'USAGE'
Usage: ./ScribeCat.command [--live] [--local] [--app-url=<url>]

Options:
  --live            Open the hosted ScribeCat app (default).
  --local           Open the bundled local web UI instead of the hosted app.
  --app-url=<url>   Override the hosted app URL (implies --live).
  -h, --help        Show this help message.
USAGE
}

while (($#)); do
  case "$1" in
    --live)
      MODE="live"
      ;;
    --local)
      MODE="local"
      ;;
    --app-url=*)
      LIVE_APP_URL="${1#*=}"
      MODE="live"
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      show_help >&2 || true
      exit 1
      ;;
  esac
  shift
done

case "$MODE" in
  live|local) ;;
  *)
    echo "Invalid mode: $MODE (expected 'live' or 'local')." >&2
    exit 1
    ;;
esac

if [[ "$MODE" == "live" ]]; then
  APP_URL="${LIVE_APP_URL:-$DEFAULT_LIVE_URL}"
else
  APP_URL="$LOCAL_APP_URL"
fi

if [[ -z "$APP_URL" ]]; then
  echo "Error: target app URL is empty." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed or not on PATH." >&2
  echo "Install Node 20 and try again." >&2
  exit 1
fi

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && ps -p "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting ScribeCat local API server..."
node server.mjs &
SERVER_PID=$!

wait_for_server() {
  local url="http://127.0.0.1:8787/"
  local attempts=0
  local max_attempts=60

  until curl -sf "$url" >/dev/null; do
    if ! ps -p "$SERVER_PID" >/dev/null 2>&1; then
      echo "ScribeCat server exited unexpectedly." >&2
      exit 1
    fi

    attempts=$((attempts + 1))
    if (( attempts >= max_attempts )); then
      echo "Timed out waiting for ScribeCat server to start." >&2
      exit 1
    fi

    sleep 0.5
  done
}

if command -v curl >/dev/null 2>&1; then
  echo "Waiting for local API to be ready..."
  wait_for_server
else
  echo "curl is not available; waiting a moment before opening the app."
  sleep 2
fi

if [[ "$MODE" == "live" ]]; then
  echo "Launching hosted ScribeCat at $APP_URL"
else
  echo "Launching local ScribeCat UI at $APP_URL"
fi

if command -v open >/dev/null 2>&1; then
  echo "Opening ScribeCat in your default browser..."
  if ! open "$APP_URL"; then
    echo "open command failed. Please open $APP_URL manually." >&2
  fi
elif command -v xdg-open >/dev/null 2>&1; then
  echo "Opening ScribeCat in your default browser..."
  if ! xdg-open "$APP_URL" >/dev/null 2>&1; then
    echo "xdg-open failed. Please open $APP_URL manually." >&2
  fi
else
  echo "ScribeCat server is ready at $APP_URL"
fi

wait "$SERVER_PID"
