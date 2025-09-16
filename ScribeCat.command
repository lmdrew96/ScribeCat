#!/bin/zsh
set -euo pipefail

# Where am I?
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Places to look for index.html (first one that exists wins)
CANDIDATES=(
  "$SCRIPT_DIR/web/index.html"
  "$SCRIPT_DIR/index.html"
  "$HOME/Desktop/lecture-capture/web/index.html"
)

FOUND=""
for p in "${CANDIDATES[@]}"; do
  if [ -f "$p" ]; then
    FOUND="$p"
    break
  fi
done

if [ -z "$FOUND" ]; then
  # Friendly heads-up if we can't find it
  /usr/bin/osascript -e 'display alert "ScribeCat" message "index.html not found.\nPut it in: Desktop/lecture-capture/web/"' >/dev/null 2>&1 || true
  echo "index.html not found in expected locations." >&2
  exit 1
fi

# Open with your default browser (Safari/Chrome/whatever macOS is set to)
open "$FOUND"

# If you want to force Chrome instead, comment the line above and uncomment this:
# open -a "Google Chrome" "$FOUND"
