#!/bin/bash
# ===========================================================================
# Script:      install-hooks.sh
# Version:     1.1.0
# Author:      Ladislav Osvald
# Updated:     2026-11-03
#
# Description:
#   Installs this repo's git hooks from tools/hooks/ into .git/hooks/.
#   Hooks are NOT carried by a clone (.git/hooks is local), so the source of
#   truth lives in tools/hooks/ — versioned, reviewable, backed up — and this
#   script copies it into place. Run it after a fresh clone or a machine
#   rebuild. Idempotent: safe to run repeatedly. Works from the main checkout
#   and from a linked worktree alike: all worktrees share one hooks dir.
#
#   Installed hooks:
#     pre-commit  — refuses a direct commit on main (merges pass) and, on a
#                   tool's branch, a commit touching another tool
#     pre-push    — refuses a non-fast-forward push to the public remote
#
# Usage: bash tools/install-hooks.sh
# ===========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC_DIR="$SCRIPT_DIR/hooks"

# In a linked worktree .git is a file, not a directory; ask git for the shared dir.
COMMON_DIR="$(git -C "$REPO_ROOT" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" \
    || { echo "ERROR: $REPO_ROOT is not a git repo." >&2; exit 1; }
HOOK_DIR="$COMMON_DIR/hooks"

[[ -d "$SRC_DIR" ]] || { echo "ERROR: $SRC_DIR not found." >&2; exit 1; }

mkdir -p "$HOOK_DIR"

installed=0
for src in "$SRC_DIR"/*; do
    [[ -f "$src" ]] || continue
    name="$(basename "$src")"
    cp "$src" "$HOOK_DIR/$name"
    chmod +x "$HOOK_DIR/$name"
    echo "  installed: $name"
    installed=$((installed + 1))
done

echo ""
echo "$installed hook(s) installed into .git/hooks/."
echo "Verify: git commit on main must be refused; a merge into main must pass."
