# ScribeCat

Fast desktop capture + glue app built on Tauri v2. Dev loop is button-simple, changes are small and reviewable, and no binaries get committed.

## Repo
https://github.com/lmdrew96/ScribeCat.git

## Requirements
- macOS 15+ with Xcode Command Line Tools
- Node.js (20+ recommended), npm or pnpm
- Rust toolchain (stable), cargo
- gh CLI authenticated to GitHub

## Quickstart
Desktop buttons:
1. ScribeCat Start Session.command
2. ScribeCat Sync+Run.command
3. ScribeCat End Session.command

CLI alternative:
```bash
bash scripts/dev_start.sh
bash scripts/dev_sync.sh
bash scripts/dev_end.sh
```

## Environment
Secrets are never committed. Provide through your platform’s secret manager or local env:
- MAKE_WEBHOOK_URL
- AIRTABLE_PAT
- ASSEMBLYAI_API_KEY
- OPENAI_API_KEY

## Project Structure
```
web/                    static UI (index.html, style.css, app.js)
src-tauri/              Tauri v2 Rust app
  tauri.conf.json       devUrl=http://localhost:1420 ; frontendDist=../web
  src/
  icons/icon.png        generated RGBA icon (ensured each run)
scripts/
  dev_start.sh          start a dev branch, prep, launch
  dev_sync.sh           sync with main, prep, launch
  dev_end.sh            commit, push, open PR
  fetch_assets.mjs      pulls assets from scripts/assets.manifest.json
  ensure_icon.sh        writes a valid RGBA PNG icon
  start_static.sh       serves web/ on :1420
backups/                logs, plans, results
```

## Dev Loop
1. Start Session
2. Prompt Codex for a small change (guardrails on)
3. Merge PR on GitHub
4. Sync+Run to pull and relaunch
5. Repeat 2–4
6. End Session to push any local tweaks and open a final PR

## Dev vs Prod
- The status overlay appears in the lower-right corner to show product version, git branch/SHA, and health checks. Toggle it at any time with <kbd>Cmd/Ctrl</kbd> + <kbd>`</kbd>, force it on with `?status=1` in the URL, or persist your preference via `localStorage.setItem("scribecat:statusVisible", "true" | "false")`.
- During development `SHOW_STATUS_OVERLAY` defaults to `1` (visible); set `SHOW_STATUS_OVERLAY=0` before running `scripts/start_static.sh` or the dev helper scripts to hide it by default in packaged builds.
- Build the desktop bundle with `bash scripts/build_app.sh`. The script fetches assets, injects git metadata, and runs `npx tauri build`; outputs land in `dist/` and remain untracked in git.

## Assets Policy
No binaries or build artifacts in git. If assets are required, add entries to `scripts/assets.manifest.json` and let `scripts/fetch_assets.mjs` download at runtime.

## Troubleshooting
Icon error (`is not RGBA`):
```bash
bash scripts/ensure_icon.sh
```
Static server stuck on port 1420:
```bash
lsof -ti :1420 | xargs -r kill -9
bash scripts/start_static.sh
```
Tauri config complaints:
- Keep `identifier`, `productName`, `version` at top level
- `build.devUrl` and `build.frontendDist` must exist

GitHub auth:
```bash
gh auth login
```

## Contributing
One logical change per PR. Include rationale, risks, validation, and rollback notes.

## License
TBD
