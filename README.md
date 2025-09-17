# ScribeCat Desktop Runtime

ScribeCat now runs fully inside the Tauri shell—no local Node/Express server is spawned at runtime. The renderer (plain HTML/JS) invokes Rust commands for everything that previously hit `server.mjs`.

## Developer workflow

1. Install dependencies once: `npm install`
2. Launch the desktop shell: `npm run tauri dev`
   - Opens the Tauri window and serves `web/index.html`
   - No HTTP dev server is started
3. Build distributables: `npm run tauri build`

Environment variables (AssemblyAI, OpenAI, Airtable, Make) are still read from your shell when the Tauri process starts.

## Command surface (Rust)

The new `src-tauri/src/commands/` modules expose the previous REST routes as `tauri::command`s:

- `get_aai_token`, `upload_audio`, `save_record`, `quit_app`
- Canvas helpers (`canvas_push`, `canvas_pull`)
- OpenAI summarise/polish/chat helpers
- Airtable + Make integrations (`save_record`, `diag_airtable`, `diag_env`)
- Misc helpers (`fetch_ics`, `backend_ready`)

The renderer talks to these via `window.__TAURI__.core.invoke(...)` and never stores secrets.

Audio WAVs are exported locally via the Tauri filesystem APIs and mirrored into the app data directory for attachment to Airtable entries. The old anchor-download fallback still exists if the APIs are unavailable (e.g. when opened in a browser for QA).

## Frontend layout

`web/` now contains all runtime assets:

- `web/index.html` – renderer entry point
- `web/fonts/` – Galaxy Caterpillar and other bundled fonts
- `web/img/nugget.png` – mascot used in the title bar
- `web/favicon.ico`

`src-tauri/tauri.conf.json` points `frontendDist` at `web/`, so the legacy `server/` folder is excluded from packaged builds. The Node script remains only as an optional dev helper.

## Testing

Run `npm run tauri dev` to smoke test the desktop window. Confirm:

- Window opens with ScribeCat UI (fonts + Nugget image load)
- Live transcription still streams from AssemblyAI via the new command proxy
- Saving a session writes a local WAV, uploads through the Rust command, and stores metadata via Airtable/Make
- Quit actions close the app through the Rust `quit_app` command

These steps replace the previous “start Node server + open browser” workflow.
