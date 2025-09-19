#!/usr/bin/env bash
set -euo pipefail
for _ in $(seq 1 40); do
  if pgrep -x "scribecat" >/dev/null 2>&1 || pgrep -f "target/debug/scribecat" >/dev/null 2>&1; then
    osascript -e 'tell application "System Events" to set frontmost of process "scribecat" to true' >/dev/null 2>&1 || true
    osascript -e 'tell application "System Events" to set frontmost of process "ScribeCat" to true' >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 0.25
done
exit 0
