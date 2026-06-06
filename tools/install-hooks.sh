#!/bin/bash
# ===========================================================================
# Script:      install-hooks.sh
# Version:     1.0.0
# Author:      Osva1d
# Updated:     2026-06-06
#
# Description:
#   Installs the _incubator git hooks. Git hooks live under .git/hooks and are
#   not version-controlled, so this script reinstalls them after a fresh clone.
#   Idempotent — safe to run repeatedly. Currently installs:
#     pre-commit -> tools/check-dist-fresh.sh --staged
# ===========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOK_DIR="$REPO_ROOT/.git/hooks"

[[ -d "$REPO_ROOT/.git" ]] || { echo "ERROR: $REPO_ROOT is not a git repo." >&2; exit 1; }
mkdir -p "$HOOK_DIR"

HOOK="$HOOK_DIR/pre-commit"
cat > "$HOOK" << 'EOF'
#!/bin/bash
# Auto-installed by tools/install-hooks.sh — do not edit here, edit the source.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
exec bash "$ROOT/tools/check-dist-fresh.sh" --staged
EOF
chmod +x "$HOOK"

echo "OK: installed pre-commit hook -> tools/check-dist-fresh.sh --staged"
