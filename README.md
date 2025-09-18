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

- Run `node scripts/env_inject.mjs` to expose `ASSEMBLYAI_API_KEY` to the web runtime, then launch the dev console at http://localhost:1420 and use the recording pill to capture audio notes.

## Features
- Status overlay that tracks connectivity, static server health, and bundle metadata.
- Built-in audio recorder with VU meter, elapsed timer, and safe download links.
- Optional AssemblyAI transcription when the `ASSEMBLYAI_API_KEY` environment variable is present.

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
- Development serves the UI from `http://localhost:1420` through `scripts/start_static.sh` or the dev helpers in `scripts/dev.sh`; the static server should keep running while you iterate.
- Packaged releases ship the same assets inside the `.app` bundle, so no static server is required when you launch the desktop app.
- The status overlay is available in both environments. It is visible by default while developing on `localhost`, starts hidden in packaged builds, and can always be toggled with <kbd>Cmd/Ctrl</kbd> + <kbd>`</kbd> or forced on with `?status=1`. The preference persists via `localStorage.setItem("scribecat:statusVisible", "true" | "false")`.
- Override the default during local testing by exporting `SHOW_STATUS_OVERLAY=0` before running `scripts/start_static.sh`.

## Prod (Packaged) App
1. **Build** – `bash scripts/release_build.sh`
   - Fetches runtime assets (best effort), regenerates the icon, ensures `web/version.json`, injects git metadata, runs `npx tauri info`, and then `npx tauri build`. The script restores `web/index.html` on exit so the working tree stays clean and defaults the packaged overlay to hidden.
2. **Stage** – `bash scripts/release_stage.sh`
   - Copies `target/release/bundle/macos/ScribeCat.app` into `~/Applications/ScribeCat.app`. Use `--dry-run` to preview the paths without copying (helpful on non-macOS hosts or CI).
3. **Open** – `bash scripts/release_open.sh`
   - Launches the staged bundle, falling back to the freshly built output. `--dry-run` prints the path it would open.

- Build outputs stay in `target/`/`dist/` and the staged app lives in `~/Applications`; `.gitignore` prevents committing bundles or backups.
- In the packaged app the status overlay defaults to hidden until toggled via the hotkey or query flag; the visibility persists between launches.

### Desktop shortcuts
Create a macOS launcher on the Desktop so non-terminal users can reopen the packaged app quickly:

```bash
cat <<'EOF' > "$HOME/Desktop/ScribeCat Open Release.command"
#!/usr/bin/env bash
set -euo pipefail
cd /path/to/your/ScribeCat/checkout
bash scripts/release_open.sh
EOF
chmod +x "$HOME/Desktop/ScribeCat Open Release.command"
```

An optional builder shortcut can chain the scripts:

```bash
cat <<'EOF' > "$HOME/Desktop/ScribeCat Build Release.command"
#!/usr/bin/env bash
set -euo pipefail
cd /path/to/your/ScribeCat/checkout
bash scripts/release_build.sh
bash scripts/release_stage.sh
bash scripts/release_open.sh
EOF
chmod +x "$HOME/Desktop/ScribeCat Build Release.command"
```

Both commands keep binaries outside the repo—only the Desktop helpers are created locally.

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
