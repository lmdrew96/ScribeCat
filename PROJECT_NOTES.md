# Project Notes

## Desktop configuration flow
- The Tauri shell now resolves a writable config directory (`app_handle.path().app_config_dir()`) and launches the Node sidecar with `SCRIBECAT_CONFIG_DIR` pointing at that location.
- `server/server.mjs` seeds and loads a `.env` file in that directory (falling back to `server/.env.template` when empty) so AssemblyAI, Airtable, Make, and optional OpenAI keys live outside the app bundle.
- Two Tauri commands (`read_config` / `write_config`) bridge the `.env` file to the UI. Saving updates the file and restarts the sidecar so backend requests immediately see new credentials.
- The Settings drawer in `index.html` exposes an “Integrations” section where users can paste their keys. A desktop-only notice appears if the form is opened outside the packaged app.
- Template values remain minimal (blank placeholders, default Airtable table name) so user-provided keys are clearly visible and easy to edit later.
