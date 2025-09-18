# First Task Plan — 2025-09-18T02:21:35Z

## Objective
Implement **Phase 1 Task 2: Persist layout & behavior toggles across sessions** so users retain their preferred layout/behavior defaults when relaunching ScribeCat.

## Entry points & files
- `web/index.html`
  - `<script>` block that defines UI references (`stackedToggle`, `b_sentence`, `autoScroll`, etc.).
  - Drawer markup containing the toggle checkboxes (IDs: `stackedToggle`, `b_sentence`, `b_autoretry`, `b_markers`, `b_autoscroll`, `b_timestamps`, `b_autopolish`).
  - Stage controls (`autoScrollChk`, `tsChk`, `sentenceChk`) that mirror default behaviors.

## Implementation steps
1. **Define a lightweight preference helper.** Near the top of the script, after DOM queries, add a `const PREF_KEYS = { ... }` map describing each checkbox (`element`, `storageKey`, optional `coerce` function). Instantiate a shared `const storedPrefs = JSON.parse(localStorage.getItem('sc_prefs') || '{}');`.
2. **Hydrate initial state.** Iterate through the map:
   - If a stored value exists, apply it to the checkbox (`checked = Boolean(value)`) and immediately trigger any dependent side effects (e.g., toggle `document.body.classList.toggle('stacked', stackedToggle.checked)` so the layout matches).
   - Synchronize the stage controls by checking whether `b_*` defaults changed; for example, set `autoScroll.checked = stacked value ?? autoScroll.defaultChecked`.
3. **Persist on change.** Attach `change` listeners to each checkbox defined in the map. Each handler updates `storedPrefs[key] = el.checked`, writes the JSON back to `localStorage`, and invokes existing behavior (e.g., call the same functions currently bound to change events such as toggling stacked layout). Prefer small helper `function persistPref(key, value)` to centralize serialization and `try/catch` for quota errors.
4. **Guard against corrupted storage.** Wrap the initial parse in `try/catch`; if parsing fails, clear the saved entry and fall back to defaults to avoid blocking startup.
5. **Document the behavior inline.** Add concise comments near the helper definition to explain Guardrail 2 considerations (do not break `scripts/start_static.sh` / `scripts/dev.sh`).
6. **Manual QA script.** After implementation, load the static UI (via validation command 2), toggle options (e.g., disable auto-scroll, enable stacked layout), reload the page, and confirm preferences persist.

## Expected validation steps
- `node scripts/fetch_assets.mjs && bash scripts/ensure_icon.sh`
- `bash scripts/start_static.sh && curl -sI http://localhost:1420/ | head -n 1`
- `npx tauri info`
- `npx tauri dev`

## Risks & mitigations
- **LocalStorage quota/blocking:** mitigate by wrapping read/write in `try/catch`; fall back to defaults on error.
- **State drift between drawer defaults and live controls:** ensure hydration updates both the drawer checkbox and the live control (auto-scroll/timestamps). Write a small helper to sync them to avoid duplicate logic.
- **Regression if elements are renamed:** keep the `PREF_KEYS` map adjacent to DOM queries so renamed IDs are caught during review.

## Rollback plan
If unexpected behavior appears, delete the new helper block and remove `localStorage` interactions (single-file change). Preferences will revert to existing hard-coded defaults; no server restart needed.
