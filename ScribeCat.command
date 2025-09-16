#!/usr/bin/env bash
cd "$(dirname "$0")"
node server.mjs &
SERVER_PID=$!
sleep 1
UI_ENTRY="$PWD/web/index.html"
open "$UI_ENTRY"
wait $SERVER_PID
