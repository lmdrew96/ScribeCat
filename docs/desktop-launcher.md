# ScribeCat Desktop Launcher Button

Use the provided launcher files in the repository root to open the ScribeCat desktop (Tauri) app without remembering any commands.

## macOS
- Double-click **`LaunchScribeCatDesktop.command`**.
- A Terminal window appears, installs dependencies if `node_modules` is missing, and then runs `npm run tauri:dev`.
- Keep the window open while you use ScribeCat; close it (or press `Ctrl+C`) to stop the app.

## Windows
- Double-click **`LaunchScribeCatDesktop.bat`**.
- Command Prompt will install dependencies if needed and then execute `npm run tauri:dev`.
- Leave the window open; close it or press `Ctrl+C` to stop the app.

## Linux / WSL
- Run `./scripts/launch-tauri-desktop.sh` from the repository root or `bash LaunchScribeCatDesktop.command`.
- The script mirrors the behavior described above.

> Both launchers assume you have [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) available and will reuse the pinned Tauri CLI from `package.json`.
