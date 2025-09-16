#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "$0")"

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

echo "Starting ScribeCat dev server..."
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
  echo "Waiting for server to be ready..."
  wait_for_server
else
  echo "curl is not available; waiting a moment before opening the app."
  sleep 2
fi

APP_URL="http://127.0.0.1:8787/"

if command -v open >/dev/null 2>&1; then
  echo "Opening ScribeCat in your default browser..."
  open "$APP_URL"
else
  echo "ScribeCat server is ready at $APP_URL"
fi

wait "$SERVER_PID"
