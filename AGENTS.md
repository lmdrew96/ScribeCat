# AGENTS.md

> **ScribeCat** — a lightweight, fast, and sturdy **desktop** app for speech-to-notes with streaming transcripts and Google-Docs-style editing.

---

## Purpose & Priorities (strict order)
1. **Intelligence first** — prefer the simplest solution that actually improves UX/perf; propose at least one lean alternative before changing code.
2. **Speed & sturdiness** — low latency, low RAM, low disk churn; fail gracefully.
3. **Safety** — keep data contracts and integrations intact; avoid breaking changes and leaking secrets.

## Scope & Architecture
- **Form factor**: Desktop application.
- **Default runtime**: **Tauri** (lightweight, Rust-backed, great resource use).
- **Alternative**: **Electron** (widely used); **ask first** before switching shells.
- **Frontend**: Static web app rendered in a desktop webview. Frontend technology may evolve; significant framework/library changes require a short proposal and approval, and should be staged incrementally.
- **Node**: v20 LTS for tooling/scripts; application runtime is Tauri (Rust).

### Ask-First Architecture Changes
Before any architecture or foundational library change:
- Output a short **proposal** with:
  - **Plain-English explainer**: what the change is and what it does, no jargon.
  - **Why now**: benefit to user (perf, reliability, UX) and to maintenance.
  - **Trade-offs**: RAM/CPU/disk impact, bundle size, complexity, build tooling.
  - **Rollback plan**: how to revert quickly.
- **Stop** and wait for explicit approval before proceeding.

## Non-Negotiable Invariants
- **Google-Docs-style editor shortcuts** preserved: Cmd/Ctrl-B/I/U, headings, lists, undo/redo.
- **Streaming model**: partials accumulate; **finalized sentences replace partials in place** — never collapse history.
- **Integrations intact**: AssemblyAI (streaming), Airtable, Make webhooks.
- **Secrets** never committed or printed; use environment variables only.
- **No UI redesigns** without explicit approval.

## Performance Budgets & Targets
- **Startup → first interaction**: ≤ **1.0s** on a mid-tier laptop.
- **Streaming update cycle**: ≤ **50 ms** per punctuation-triggered render.
- **Idle RAM**: ≤ **120 MB** (Tauri target); **≤ 300 MB** under active transcription.
- **On-disk footprint** (app data, logs, caches excluding mp3s): ≤ **50 MB** total; rotate logs.
- **Added JS payload per change**: ≤ **10 KB** gzip unless justified in the plan.

## Streaming & Transcript Rules
- **When to update**: render transcript updates **on punctuation** (., !, ?), not every token.
- Debounce paints to ~16–33 ms. Never block typing or selection.
- Keep selection behavior stable; preserve keyboard-first workflows.

## Data Flow, Storage & Privacy
- **Audio**: downloaded locally as **.mp3** in the app’s data folder; provide cleanup utilities and a user-visible storage location.
- **Transcripts & notes**: send full text to **Airtable/Make**. Avoid sending raw audio beyond configured vendors.
- **PII boundaries**: do not log transcript content; log event metadata only (timestamps, operation names, counts, durations, error codes).

## Error Handling & Resilience
- **User-visible toasts** for actionable errors (compact, understandable language).
- **Silent retries** for idempotent operations with exponential backoff.
- On persistent failure, include a short error reference code and (if configured) ping Make via webhook with a compact payload (no PII).

## Library Selection Policy
- Prefer **safe, dependable, popular** libraries with active maintenance; welcome **innovative** options when they measurably reduce complexity or resource use.
- **New dependency rule**: require a plan showing it replaces ≥50 lines of custom code **or** measurably improves perf/maintainability.
- Favor small utilities for DOM, events, and streaming. Adopting or upgrading a frontend framework is allowed with a proposal showing measurable benefits, a migration plan, and graceful fallback.
- Keep the dependency tree auditable; pin ranges and enable integrity checks.

## Environment Variables
- `ASSEMBLYAI_API_KEY`
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_NAME`
- `MAKE_WEBHOOK_URL`

## Workspace Map (typical)
- Desktop shell: `src-tauri/` (Tauri) (or `electron/` if switching shells)
- Web app: `web/` (primary edit surface)
  - Entry: `web/index.html`
  - Scripts/Styles: `web/*`
- Streaming/IPC glue: `app/bridge/*`

## Editor UX Rules
- Preserve Google-Docs-style shortcuts and selection behavior.
- Autosave is diff-based and throttled; never blocks keystrokes.
- Accessibility: keyboard-first, ARIA where relevant, WCAG AA color contrast.

## Logging & Telemetry
- Local logs only by default; rotate files (max 5 MB × 5).
- Send **minimal metadata** to Make on error; no transcript text in logs or telemetry.

## Code Style & Shell Snippets
- Modern JS/TS, strict mode. Keep semicolon usage consistent with the codebase.
- ESLint/Prettier if present; otherwise match existing style.
- **Shell snippets must be copy-pasteable**: **do not include lines or inline examples that start with `#` comments** to avoid zsh copy/paste issues. Use prose explanations above/below instead.
- Commit format: `type(scope): summary` (e.g., `feat(stream): punctuation-based updates`).

## Testing
- Unit tests for pure utilities and transcript merge logic.
- Optional e2e smoke (Playwright) for streaming + editor shortcuts.
- Add tests when fixing bugs in pure functions.

## Build, Release & Changelog
- **Prepare production builds** for **Tauri** by default:
  - Tauri: use the standard toolchain (`cargo`, `pnpm|npm`, `tauri build`) with NSIS (Windows), DMG (macOS), and AppImage/DEB (Linux) targets.
  - Code signing optional; no auto-updater without approval.
- **Alternative shell** (if approved):
  - Electron: package via electron-builder.
- Emit a **CHANGELOG.md** entry per release with user-visible changes and a short technical note.
- Attach build artifacts to the release folder and (optionally) to a Git tag.

## What Not To Do (without explicit approval)
- No desktop shell switches (Tauri ↔ Electron), bundler swaps, or major frontend framework migrations **without proposal & approval**.
- No wholesale UI redesigns. Incremental UX/perf/accessibility improvements are encouraged when scoped and justified.
- No schema migrations or Airtable base/table renames.
- No analytics/trackers/crash reporters added.

## Acceptance Checklist (for every change)
- Short **plan** with at least one lean alternative and trade-offs.
- All **invariants** preserved (shortcuts, streaming model, integrations).
- **Perf budgets** respected (quick manual checks recorded).
- **Errors** surfaced via toasts; retries implemented where safe; no secrets logged.
- **RAM/disk** impact noted if relevant; logs rotate.
- **Tests** updated or added when logic changed.
- **Changelog** entry drafted if the change ships.
- Diff is small, focused; commit message follows format.
