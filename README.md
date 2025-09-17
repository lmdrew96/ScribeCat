# ScribeCat Developer Notes

## Environment configuration

1. Copy `server/.env.example` to `server/.env` before running any local tooling.
2. Request fresh credentials from the respective service owners and paste them into your local `server/.env`.
3. Keep `server/.env` out of Git (it is ignored via `.gitignore`). Never commit real secrets.

Required variables:

- `ASSEMBLYAI_API_KEY` – AssemblyAI token for generating temporary streaming tokens.
- `OPENAI_API_KEY` – used by the polishing endpoint when requesting completions.
- `AIRTABLE_API_KEY` – Airtable Personal Access Token (PAT) for Create/Delete operations.
- `AIRTABLE_BASE_ID` – Airtable base that stores recording metadata.
- `AIRTABLE_TABLE_NAME` – table inside the base (defaults to `Recordings`).
- `MAKE_WEBHOOK_URL` – Make.com webhook endpoint for automation hooks; leave blank to disable.

## Secret rotation status

The credentials that previously lived in `server/.env` were quarantined to `.trash/20250917T010108Z/server.env-compromised` and must be treated as compromised. Coordinate with the AssemblyAI, OpenAI, Airtable, and Make owners to rotate the keys and update any downstream allowlists.

If this repository is shared or public, follow up by rewriting Git history (e.g. via BFG Repo-Cleaner or `git filter-repo`) to scrub the exposed values after the rotation.
