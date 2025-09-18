# ScribeCat

ScribeCat is a local-first note-taking companion that pairs a static web UI with a lightweight Tauri shell. The project ships a curated set of scripts so you can fetch release assets, boot the static preview server, and develop the desktop wrapper without juggling separate terminals.

## One-Touch Dev

Run the orchestrator to get everything running in one command:

```bash
bash scripts/dev.sh
```

The script chains the core tasks:

1. `node scripts/fetch_assets.mjs` downloads and verifies the runtime assets listed in `scripts/assets.manifest.json`.
2. `bash scripts/ensure_icon.sh` guarantees `src-tauri/icons/icon.png` exists (either from the assets release or a generated placeholder).
3. `bash scripts/start_static.sh` restarts the static preview server on port 1420 so Tauri can load `web/` instantly.
4. `tauri dev` launches the desktop shell pointed at `http://localhost:1420`.

Feel free to rerun the script—it is idempotent and will refresh assets/icons as needed before restarting the stack.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `fetch_assets` reports an HTTP error | Confirm you can reach GitHub Releases and that `scripts/assets.manifest.json` still references the published tag. Re-run once connectivity returns; the script writes status to `backups/assets_fetch_result.json` for inspection. |
| Icon step fails | Ensure `web/assets/nugget.png` exists or allow the placeholder generator to run. You can also delete `src-tauri/icons/icon.png` and rerun the dev script. |
| Static server already bound to port 1420 | Stop the existing server with `lsof -ti :1420 | xargs -r kill -9` and re-run the orchestrator. The helper script records its PID in `backups/static_server.pid` for manual cleanup. |
| `tauri dev` exits immediately | Install the Tauri CLI via `npm ci` (it is listed in `devDependencies`) and confirm Rust toolchain requirements for your OS. |

## Guardrails (Contributor Cheat Sheet)

- **Least surprise:** Never land changes that would break `scripts/dev.sh` or its helpers. When in doubt, propose safer alternatives.
- **Small steps:** Keep diffs scoped to a single logical change and add undo scripts (e.g., `undo_*.sh`) when automating bulk edits.
- **No secrets in git:** Read API keys from the environment; never hardcode them or commit credentials.
- **Explain yourself:** Every pull request must spell out rationale, risks, validation steps, and rollback guidance.
- **No history rewrites:** Avoid force-pushes; create feature branches following the `nae/<feature>` pattern.

## Further Reading

- [docs/notes/quickstart.md](docs/notes/quickstart.md) for a 5-minute setup checklist and the day-to-day developer loop.
- `AGENTS.md` for high-level expectations around integrations and UI behavior.
