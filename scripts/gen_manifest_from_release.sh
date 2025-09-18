#!/usr/bin/env bash
set -euo pipefail
TAG="${1:?usage: gen_manifest_from_release.sh <tag>}"
REMOTE="$(git config --get remote.origin.url || true)"
if [[ "$REMOTE" =~ github.com[:/](.+)/([^/\.]+)(\.git)?$ ]]; then OWNER="${BASH_REMATCH[1]}"; REPO="${BASH_REMATCH[2]}"; else : "${OWNER:?set OWNER}"; : "${REPO:?set REPO}"; fi
JSON="$(gh api "repos/$OWNER/$REPO/releases/tags/$TAG")"
CNT="$(jq '.assets | length' <<<"$JSON")"
[ "$CNT" -eq 0 ] && { echo "no assets on $OWNER/$REPO@$TAG" >&2; exit 3; }
{
  echo '{ "files": ['
  SEP=""
  while IFS=$'\t' read -r NAME URL; do
    [ -z "$URL" ] && continue
    TMP="$(mktemp)"; curl -fsSL "$URL" -o "$TMP"
    SHA="$(shasum -a 256 "$TMP" | awk '{print $1}')"
    rm -f "$TMP"
    case "$NAME" in
      *.ttf|*.otf|*.woff|*.woff2|*.eot) DEST="web/fonts/$NAME" ;;
      scribecat*.png|*icon*.png|*nugget*.png) DEST="src-tauri/icons/icon.png" ;;
      *) DEST="web/assets/$NAME" ;;
    esac
    printf '%s  { "dest": "%s", "url": "%s", "sha256": "%s" }\n' "$SEP" "$DEST" "$URL" "$SHA"
    SEP=","
  done < <(jq -r '.assets[] | [.name, .browser_download_url] | @tsv' <<<"$JSON")
  echo '] }'
} > scripts/assets.manifest.json
echo "wrote scripts/assets.manifest.json"
