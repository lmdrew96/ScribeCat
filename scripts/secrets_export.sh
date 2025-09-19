#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$here"

vars=(ASSEMBLYAI_API_KEY OPENAI_API_KEY AIRTABLE_PAT MAKE_WEBHOOK_URL)

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env >/dev/null 2>&1 || true
  set +a
fi

for var in "${vars[@]}"; do
  if [ -n "${!var-}" ]; then
    export "$var"="${!var}"
  else
    export "$var"=""
  fi
done
