@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto :error
)

echo Launching ScribeCat desktop app...
call npm run tauri dev
if errorlevel 1 goto :error

goto :eof

:error
echo Failed to launch ScribeCat.
exit /b 1
