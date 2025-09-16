# AGENTS.md

## Project
ScribeCat — local Node server (`server.mjs`) + static web app in `web/`.

## Setup
- Node 20
- Install deps:
  - `npm ci` (fallback `npm i` if no lockfile)
- Start dev server:
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
