@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

if not exist node_modules (
  echo [ScribeCat] Installing dependencies (npm install)...
  call npm install
)

echo [ScribeCat] Starting Tauri dev server (leave this window open)...
call npm run tauri:dev
