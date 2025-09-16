#!/usr/bin/env bash
cd "$(dirname "$0")"
node server.mjs &
SERVER_PID=$!
sleep 1
open "http://127.0.0.1:8787/"
wait $SERVER_PID
