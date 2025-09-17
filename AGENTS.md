# AGENTS.md

## Project
ScribeCat — Tauri desktop shell bundling the static web app in `web/` (legacy Node helper in `server.mjs`).

## Setup
- Node 20
- Install deps:
  - `npm ci` (fallback `npm i` if no lockfile)
- Desktop shell (Tauri):
  - `npm run tauri -- dev`
- Legacy HTTP helper (avoid for desktop runtime):
  - `node server.mjs`

## Environment
Provide:
- `ASSEMBLYAI_API_KEY`
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_NAME`
- `MAKE_WEBHOOK_URL`

## Agent Tasks to Prefer
- Frontend edits in `/web/index.html` and `/web/*`
- Keep Notes editor shortcuts like Google Docs
- Preserve AssemblyAI/Airtable/Make integrations
- Transcript must never collapse: partials grow, sentences finalize

## Scripts (optional)
- Test (later): `npm test`
