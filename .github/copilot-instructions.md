# ScribeCat – AI agent quickstart

Follow these repo-specific rules to implement features correctly and keep tests green.

## Architecture
- Electron app with 3 layers:
  - Main: `src/main.js` creates the window/menu and owns all IPC handlers
  - Preload: `src/preload/preload.js` exposes a minimal API on `window.electronAPI`
  - Renderer: `src/renderer/` UI (`index.html`, `styles.css`, `app.js`)
- Security: `nodeIntegration: false`, `contextIsolation: true`. Renderer must only call through preload.

## IPC patterns (use these shapes)
- Request/response channel: main registers `ipcMain.handle('name', async (e, data) => ({ success: true }))`
- Preload exposes: `name: (data) => ipcRenderer.invoke('name', data)`
- Existing channels: `drive:ensure-target`, `drive:save-html`, `store:get`, `store:set`, `show-folder-dialog`, `save-audio-file`, `transcription:start-vosk`, `transcription:start-whisper`, `transcription:stop`, `keytar:get`, `keytar:set`
- Menu events: main uses `webContents.send('menu:new-recording'|'menu:save')`; preload exposes `onMenuAction(cb)` to subscribe.
- Return shapes for file ops: `{ success: boolean, path?: string, error?: string }`

## Storage (electron-store v10)
Use default export in CJS:
```js
const ElectronStore = require('electron-store');
const Store = ElectronStore.default || ElectronStore;
const store = new Store({ name: 'settings' });
```

## Run and test
- Dev: `npm run dev`; Prod-like: `npm start`; Build: `npm run build` / `pack` / platform scripts
- Tests: `npm test` runs `test/smoke-test.js` then `test/e2e-boot.test.js`
- E2E markers (printed when `E2E=1`): `E2E:MAIN_READY` (main ready), `E2E:WINDOW_LOADED` (renderer loaded), `E2E:PRELOAD_EXPOSED` (preload finished). Do not rename/remove.

## Integration points
- Drive: `drive:ensure-target` (mkdir -p), `drive:save-html` expects `{ filePath, fileName, content }`
- Audio: `save-audio-file` expects `{ audioData, fileName, folderPath }` and writes `${fileName}.wav`
- Transcription demo: start handlers emit `transcription:*` events a couple seconds later to simulate results

## Gotchas
- `electron-reload` is optional in dev and wrapped in try/catch; don’t require it in tests or prod
- Any new renderer capability must be bridged via preload; keep `contextIsolation` on
- Assets under `assets/`; window icon path: `assets/images/icon.png`
