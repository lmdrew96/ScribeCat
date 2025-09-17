# AGENTS.md

## Project Mission
ScribeCat is a **Tauri v2 desktop app**. It wraps a local Node server and serves a static UI from `/web`. Goal: reliable, fast desktop build with zero schema drama.

## Architecture (authoritative)
- Desktop shell: **Tauri v2**, single `src-tauri/` at repo root.
- Dev server: `server.mjs` at repo root.
  - Serves **/web** static at `/`.
  - Reserves `/api/*` for backend endpoints.
  - Default port: **8787**.
- Tauri config invariants (`src-tauri/tauri.conf.json`)
  - `build.devUrl = "http://localhost:8787"`
  - `build.beforeDevCommand = "node server.mjs"`
  - `build.frontendDist = "../web"`
  - `app.security.csp = null`
  - `bundle.icon` points to files under `src-tauri/icons` (PNG/ICO/ICNS present).
- Critical assets (do not rename without updating references):
  - `/web/fonts/GalaxyCaterpillar*.ttf`
  - `/web/img/nugget.png`
- Environment: `.env` loaded by Node server (`dotenv`).
  - `ASSEMBLYAI_API_KEY`
  - `AIRTABLE_API_KEY`
  - `AIRTABLE_BASE_ID`
  - `AIRTABLE_TABLE_NAME`
  - `MAKE_WEBHOOK_URL`

## Runtime Requirements
- Node >= 20 (Node 22 OK)
- npm (single PM; no yarn/pnpm unless explicitly configured)
- Rust toolchain for Tauri v2

## Commands
- Dev (desktop): `npm run tauri:dev`
- Build (desktop): `npm run tauri:build`

## What Codex Should Do
- Prefer **big, cohesive PRs** that fix end-to-end flows (desktop boot, icons, server, config).
- Keep all Tauri config under `src-tauri/`; never create `web/src-tauri`.
- Ensure port **8787** and do **not** start duplicate servers.
- Serve `/web/index.html` at `/`; SPA fallback to `index.html`.
- Preserve existing integrations (AssemblyAI, Airtable, Make).
- Keep transcript behavior: partials append, finals never collapse.

## What Codex Must Not Do
- Don’t switch package managers.
- Don’t remove or rename critical assets listed above.
- Don’t add top-level `security` to `tauri.conf.json` (belongs under `app`).
- Don’t use `devPath/distDir` keys (use `devUrl/frontendDist`).

## PR Template (enforced)
- **Title:** Tauri v2: <concise outcome>
- **Summary:** What changed / Why / Validation steps (exact commands).
- **Acceptance:** `npx tauri info` clean, `npm run tauri:dev` opens UI, static assets load, `/api` returns JSON.
