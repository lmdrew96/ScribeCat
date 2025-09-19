#!/usr/bin/env bash
set -euo pipefail
for k in ASSEMBLYAI_API_KEY OPENAI_API_KEY AIRTABLE_PAT MAKE_WEBHOOK_URL; do
  v="$(printenv "$k" || true)"
  if [ -n "$v" ]; then export "$k"="$v"; fi
done
