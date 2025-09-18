# ScribeCat Quickstart

## 5-Minute Setup

1. **Install prerequisites.** Use Node.js 20+ and ensure the Rust toolchain (`rustup`, `cargo`, and an OS-specific linker) is available for the Tauri CLI.
2. **Clone & install.** Run `npm ci` from the repository root to install the pinned dependencies (includes `@tauri-apps/cli`).
3. **Configure environment (optional).** Create a `.env` file or export variables for the AssemblyAI, Airtable, and Make integrations described in `AGENTS.md` when you need live API calls.
4. **Fetch runtime assets.** The dev script automatically calls `node scripts/fetch_assets.mjs`, but you can run it manually the first time to verify connectivity.
5. **Launch everything.** Kick off development with `bash scripts/dev.sh`—it ensures the icon, restarts the static preview server on port 1420, and finally opens the Tauri shell pointed at that local URL.

You should see the static site served at http://localhost:1420/ and the Tauri window loading the same content.

## Daily Flow

1. **Start of day:** Run `bash scripts/dev.sh`. Wait for the "static web" log line so you know the preview server is ready before Tauri attaches.
2. **While working:** Keep the script running in the foreground. Make iterative edits (usually under `web/`) and refresh the Tauri window to validate behavior against the guardrails.
3. **Troubleshoot quickly:** If asset downloads fail or the port is busy, stop the script with `Ctrl+C`, resolve the issue (see README troubleshooting), and rerun the command.
4. **Wrap up:** Stop the dev script with `Ctrl+C`, commit scoped changes with clear rollback notes, and ensure the worktree is clean (`git status`).
5. **Before pushing:** Document rationale/risks/validation in your PR description and double-check that no secrets or generated assets are staged.

This loop keeps development predictable while honoring the guardrails that protect the automation flow.
