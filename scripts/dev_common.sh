set -euo pipefail
export RUST_BACKTRACE=${RUST_BACKTRACE:-1}
export RUST_LOG=${RUST_LOG:-tauri=info,tauri_runtime_wry=info}
ensure_repo(){ local d="${1:-}"; [ -z "$d" ] && d="$HOME/Desktop/ScribeCat"; echo "$d"; }
default_branch(){ local d; d="$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null || true)"; [ -z "$d" ] && d="$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || true)"; [ -z "$d" ] && d="main"; echo "$d"; }
prep(){ node scripts/fetch_assets.mjs 2>/dev/null || true; bash scripts/ensure_icon.sh 2>/dev/null || true; bash scripts/start_static.sh 2>/dev/null || true; }
