# Backup Curation Notes — 2025-09-18

## Inventory Highlights
- Legacy HTML snapshots in the repository root capture UI versions such as `index.before_v1.9.8.html`, `index.before_v1.9.7.html`, and `index.backup-20250915-211503.html`.
- Structured plans already live under `backups/organized-2025-09-18T02-21-35Z/` and `backups/organized-2025-09-18T11-05-22Z/`, outlining earlier triage and offender tracking.
- Newly added `backups/organized-20250918T110600Z/` holds the current dry-run plan and console summary to guide consolidation work.

## Current Observations
- The `.gitignore` entry for `/backups/` still applies, so forced adds (`git add -f`) are required for any new backup documentation.
- Multiple HTML backups share similar timestamps; we should compare their critical UI states before pruning duplicates.
- No Markdown exists yet to explain how backup HTML maps to production releases—this note aims to seed that documentation.

## Action Items
1. Cross-check HTML snapshots against release tags or changelog entries to anchor them in time.
2. Decide which backups warrant Markdown conversions (e.g., major release transitions or incidents documented in `index.broken*.txt`).
3. Follow the plan in `backups/organized-20250918T110600Z/plan.md` to create a consistent template for future backup notes.
4. When ready to execute, run the validation checklist below to ensure the static bundle still serves correctly.

## Validation Checklist
- `node scripts/fetch_assets.mjs && bash scripts/ensure_icon.sh`
- `bash scripts/start_static.sh && curl -sI http://localhost:1420/ | head -n 1`
- `npx tauri info`
- `npx tauri dev`

## Risks and Mitigations
- **Documentation drift**: Without periodic updates, these notes could fall out of sync with actual backups. *Mitigation*: schedule reviews when new backups are added.
- **Command fatigue**: The validation list is long; confirm which steps are necessary before each run. *Mitigation*: annotate future notes with the minimum required checks.

## Rollback Guidance
If these notes need to be undone or replaced, revert commit `chore(docs): create backups/ directory and seed project notes (text-only)` using `git revert <commit-sha>` to restore the previous documentation state.
