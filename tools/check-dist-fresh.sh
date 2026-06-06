#!/bin/bash
# ===========================================================================
# Script:      check-dist-fresh.sh
# Version:     1.0.0
# Author:      Osva1d
# Updated:     2026-06-06
#
# Description:
#   Verifies that every modular ExtendScript project's dist/ artifact is an
#   up-to-date build of its src/. Rebuilds each project into a throwaway temp
#   copy (never touches the working tree) and compares against the committed
#   dist, ignoring volatile header lines (Updated date, copyright year).
#
#   Modes:
#     (no args)   Check ALL modular projects against their working-tree dist.
#     --staged    Pre-commit mode — only check projects whose src/ has staged
#                 changes. Used by the pre-commit hook (install-hooks.sh).
#
#   A modular project is any direct subdirectory holding both tools/build.sh
#   and src/, shipping dist/illustrator-<dirname>.jsx.
# ===========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

STAGED_ONLY=false
[[ "${1:-}" == "--staged" ]] && STAGED_ONLY=true

# Single temp root, cleaned on any exit (set -u safe via the :- default).
TMPROOT="$(mktemp -d)"
cleanup() { rm -rf "${TMPROOT:-}"; }
trap cleanup EXIT

# Strip the two header lines that change without a real source change, so a
# fresh build of unchanged src compares equal to the committed dist.
normalize() {
    sed -E -e 's/^( \* Updated:).*/\1 <date>/' \
           -e 's/Copyright \(C\) 2025-[0-9]{4}/Copyright (C) 2025-<year>/'
}

stale=()

for build in "$REPO_ROOT"/*/tools/build.sh; do
    [[ -f "$build" ]] || continue
    proj_dir="$(cd "$(dirname "$build")/.." && pwd)"
    slug="$(basename "$proj_dir")"
    [[ -d "$proj_dir/src" ]] || continue
    dist="$proj_dir/dist/illustrator-$slug.jsx"

    # Pre-commit mode: skip projects without staged src/ changes.
    if $STAGED_ONLY; then
        if ! git -C "$REPO_ROOT" diff --cached --name-only -- "$slug/src/" | grep -q .; then
            continue
        fi
    fi

    if [[ ! -f "$dist" ]]; then
        stale+=("$slug (dist missing)")
        continue
    fi

    # Build into an isolated copy so the working tree is never modified.
    work="$TMPROOT/$slug"
    mkdir -p "$work"
    cp -R "$proj_dir/src" "$proj_dir/tools" "$work/"
    [[ -f "$proj_dir/package.json" ]] && cp "$proj_dir/package.json" "$work/"

    if ! ( cd "$work" && bash tools/build.sh ) >/dev/null 2>&1; then
        stale+=("$slug (build failed)")
        continue
    fi

    fresh="$work/dist/illustrator-$slug.jsx"
    if ! diff -q <(normalize < "$dist") <(normalize < "$fresh") >/dev/null; then
        stale+=("$slug")
    fi
done

if [[ ${#stale[@]} -gt 0 ]]; then
    echo "ERROR: dist is stale (src changed but dist was not rebuilt):" >&2
    for s in "${stale[@]}"; do
        echo "   - $s" >&2
    done
    echo "" >&2
    echo "   Rebuild and stage the artifact:" >&2
    echo "     cd <project> && npm run build && git add dist" >&2
    exit 1
fi

echo "OK: all dist artifacts are up to date with src."
