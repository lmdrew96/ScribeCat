#!/bin/bash

# ScribeCat Safe Dev Launcher
# Double-click this file to start ScribeCat in safe development mode
# This runs npm run safe-dev without opening a terminal window

# Change to the script's directory
cd "$(dirname "$0")"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    osascript -e 'display dialog "npm is not installed or not in PATH. Please install Node.js from nodejs.org" with title "ScribeCat Safe Dev" buttons {"OK"} default button "OK" with icon stop'
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    osascript -e 'display dialog "Dependencies not installed. Running npm install first..." with title "ScribeCat Safe Dev" buttons {"OK"} default button "OK" with icon note'
    npm install
fi

# Show starting notification
osascript -e 'display notification "Starting ScribeCat in safe development mode..." with title "ScribeCat Safe Dev"'

# Run the safe-dev command
npm run safe-dev

# Show completion notification
osascript -e 'display notification "ScribeCat safe-dev has finished." with title "ScribeCat Safe Dev"'