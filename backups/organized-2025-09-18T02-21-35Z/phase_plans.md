# Phase Plan — 2025-09-18T02:21:35Z

## Context
- Repository: `ScribeCat` (Tauri v2 frontend in `web/` with local API at `server/server.mjs`).
- Guardrails observed: DRY RUN (planning only), keep `scripts/dev.sh` flow conceptually safe (mirrors fetch assets → ensure icon → start static server → run Tauri), no binaries committed.
- Validations expected whenever changes are staged:
  1. `node scripts/fetch_assets.mjs && bash scripts/ensure_icon.sh`
  2. `bash scripts/start_static.sh && curl -sI http://localhost:1420/ | head -n 1`
  3. `npx tauri info`
  4. `npx tauri dev`

## Phase 1 — Tactical tasks (3–6 items, ≤60 min each)
1. **Bootstrap the dev environment health check (≈15 min)**
   - *Rationale:* Confirm that runtime assets, static server, and Tauri CLI remain healthy before code edits. Baseline logs will inform later debugging and satisfy Guardrail 2.
   - *Key steps:*
     - Run validation commands 1–3 in sequence; capture anomalies in `backups/assets_fetch_result.json` if rerun modifies it.
     - Use `npx tauri dev` only long enough to confirm the desktop shell launches, then exit cleanly to avoid stray processes.
   - *Risks & mitigations:* Asset download failure (mitigate by checking network and rerunning with verbose logging). Static server port conflicts (kill stale PID via `backups/static_server.pid`).
   - *Validation:* Commands 1–3 (and 4 if time permits without UI changes yet).

2. **Persist layout & behavior toggles across sessions (≈45 min)**
   - *Rationale:* Users currently lose Drawer settings (stacked layout, sentence mode, auto-scroll, etc.) on reload. Storing preferences improves usability without altering capture logic.
   - *Key steps:*
     - Touch `web/index.html` to read defaults from `localStorage` on boot and write back on toggle changes (e.g., `localStorage.setItem('pref_stacked', stackedToggle.checked)`).
     - Guard against corrupt values with sane defaults and input validation.
     - Update helper functions to reuse existing `tag` styling logic instead of duplicating code.
   - *Risks & mitigations:* Potential mismatch between stored values and checkbox states (resolve by normalizing on load). Must avoid blocking `scripts/start_static.sh`; only front-end script edits.
   - *Validation:* Commands 1–4, plus manual reload test in the static server (ensure toggles persist).

3. **Clarify API status pill messaging (≈40 min)**
   - *Rationale:* The API status pill only shows “API” in yellow/red without actionable guidance. Enhancing the label/tooltip improves troubleshooting for missing env vars or offline API.
   - *Key steps:*
     - Update `web/index.html` to fetch `/api/health` (new endpoint described in Task 4) and display `ok`, `warn`, or `bad` text such as “API ✓” or “API auth?".
     - Add accessible `title` attributes or `aria-live` region updates when the status changes.
   - *Risks & mitigations:* Changing the fetch target could break boot if the endpoint is absent—ship Task 4 in the same release window or guard with fallback to `/`. Wrap fetch in `try/catch` with a short timeout.
   - *Validation:* Commands 1–4, then open static UI and confirm status updates reflect the new message when the API server is stopped vs running.

4. **Record preference for transcript auto-polish interval (≈50 min)**
   - *Rationale:* The auto-polish routine currently runs every ~5 s with a hard-coded value. Making this adjustable (small select element) supports varying editing cadence while keeping defaults.
   - *Key steps:*
     - Modify `web/index.html` to expose an interval selector (e.g., 3 s/5 s/10 s) tied to the existing `autoPolish` timer.
     - Ensure timers clear/restart cleanly when values change.
     - Store the chosen interval in `localStorage` alongside Task 2 preferences.
   - *Risks & mitigations:* Timer leaks causing duplicate intervals (clear `setInterval` before starting a new one). Avoid values <2 s to limit API load.
   - *Validation:* Commands 1–4, focusing on `npx tauri dev` to verify the desktop shell stays responsive when adjusting the new selector.

## Phase 2 — Deeper follow-up tasks (>60 min or multi-step)
- **Server health endpoint & diagnostics dashboard.** Add `/api/health` in `server/server.mjs` summarizing Airtable/AssemblyAI credential presence, Canvas cache counts, and timestamp of the last successful save. Surface this data in a new diagnostics drawer section. Requires coordinated updates to both server and UI, plus environment-variable mocks for local testing. Validations: commands 1–4 plus targeted `curl http://127.0.0.1:8787/api/health` assertions.
- **Modularize front-end scripts.** Break the monolithic `<script>` in `web/index.html` into ES modules (e.g., `web/js/prefs.js`, `web/js/transcript.js`) loaded with `<script type="module">`. This will simplify testing but needs adjustments to the static bundler (`scripts/static_web.mjs`) and careful review to keep `scripts/dev.sh` parity. Validations: commands 1–4, plus linting once introduced.
- **Offline-first note caching.** Persist live transcript + notes in IndexedDB so power interruptions do not cause loss. Introduce conflict resolution logic and UI messaging. Requires new utility module and regression testing across browsers, so allocate dedicated QA time. Validations: commands 1–4 plus manual offline simulations.

## Validation cadence
- After each Phase 1 task and before merging, run:
  - `node scripts/fetch_assets.mjs && bash scripts/ensure_icon.sh`
  - `bash scripts/start_static.sh && curl -sI http://localhost:1420/ | head -n 1`
  - `npx tauri info`
  - `npx tauri dev`
- Document results and collect any new risks in the commit message/PR description per Guardrail 5.
