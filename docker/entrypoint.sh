#!/bin/sh
set -eu

if [ -z "${DISPLAY:-}" ]; then
  export DISPLAY=:99
fi

XVFB_DISPLAY="${DISPLAY}"
XVFB_PID=""

cleanup() {
  if [ -n "$XVFB_PID" ] && kill -0 "$XVFB_PID" 2>/dev/null; then
    kill "$XVFB_PID" 2>/dev/null || true
    wait "$XVFB_PID" 2>/dev/null || true
  fi
}

trap cleanup INT TERM EXIT

if ! xdpyinfo -display "$XVFB_DISPLAY" >/dev/null 2>&1; then
  Xvfb "$XVFB_DISPLAY" -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
  XVFB_PID=$!

  for _ in $(seq 1 20); do
    if xdpyinfo -display "$XVFB_DISPLAY" >/dev/null 2>&1; then
      break
    fi
    sleep 0.25
  done
fi

if ! xdpyinfo -display "$XVFB_DISPLAY" >/dev/null 2>&1; then
  echo "Failed to start Xvfb on display $XVFB_DISPLAY" >&2
  exit 1
fi

exec "$@"
