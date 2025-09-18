# Backup Consolidation Dry Run Plan

## Objective
Organize legacy HTML backups into a structured, reviewable format while drafting supporting documentation for the docs/notes workspace.

## Scope
- Catalogue key snapshots from existing `index.*.html` files.
- Draft evergreen notes in `docs/notes/` describing how to navigate the backup set and future curation steps.
- Keep the application runnable by avoiding any changes to build scripts, runtime assets, or source code outside Markdown/text notes.

## Proposed Steps
1. Review current backups in the repository to map significant milestones (version markers, timestamps, and anomaly reports).
2. Summarize observed states and outstanding questions in a new Markdown note under `docs/notes/`.
3. Capture action items for future cleanup, including prioritizing which HTML backups to convert to Markdown and which to archive externally.
4. Cross-reference the dev workflow so documentation readers know how to validate the static assets before promoting changes.

## Deliverables
- `docs/notes/` Markdown note summarizing the backup landscape, outstanding tasks, and validation checklist.
- Companion console summary enumerating risks and validation commands to run before and after touching backups.

## Validation Checklist
- `node scripts/fetch_assets.mjs && bash scripts/ensure_icon.sh`
- `bash scripts/start_static.sh && curl -sI http://localhost:1420/ | head -n 1`
- `npx tauri info`
- `npx tauri dev`

## Risks and Mitigations
- **Stale HTML snapshots**: Risk of documenting outdated UI behaviours. *Mitigation*: flag uncertain snapshots and suggest verifying against current production builds.
- **Ignored backups directory**: `.gitignore` excludes `/backups/`, so new files require `git add -f`. *Mitigation*: record this requirement and double-check `git status` before committing.
- **Validation fatigue**: Commands are resource-intensive. *Mitigation*: recommend running them selectively when markup changes touch runtime assumptions.

## Rollback Strategy
Use `git revert <commit-sha>` on the documentation commit if the plan proves inaccurate or needs to be replaced wholesale.
