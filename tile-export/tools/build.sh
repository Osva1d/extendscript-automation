#!/bin/bash
# ===========================================================================
# Script:      build.sh
# Version:     1.0.0
# Author:      Osva1d
# Updated:     2026-09-13
#
# Description:
#   Concatenates Tile Export source modules into a single production .jsx.
#
# Module load order (dependencies must come first):
#   json2.js → locale.js → utils.js → validation.js → ui_state.js → config.js
#   → storage.js → grid.js → doc.js → draw.js → export.js → ui.js → main.js
# ===========================================================================

set -euo pipefail

SLUG="tile-export"
SCRIPT_NAME="illustrator-${SLUG}.jsx"
HUMAN_NAME="Illustrator Tile Export"
VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0-dev")"
DESCRIPTION="Splits large graphics into printable panels for manual trimming."
DIST_DIR="dist"
SRC_DIR="src"

# Version parity guard — the runtime constant TE.Config.version (shown in the
# dialog title + footer) must match package.json (the dist-header source of
# truth). Without this guard the two can silently drift, so the UI advertises a
# different version than the file header. Fail the build loudly instead.
SRC_VERSION="$(sed -n 's/.*version:[[:space:]]*"\([^"]*\)".*/\1/p' "$SRC_DIR/config.js" | head -1)"
if [ "$SRC_VERSION" != "$VERSION" ]; then
    echo "ERROR: version drift — package.json=$VERSION but src/config.js version=$SRC_VERSION" >&2
    echo "       Sync the 'version' constant in src/config.js with package.json before building." >&2
    exit 1
fi

# CHANGELOG parity — the newest entry must carry the version being built.
# Catches the release-half-done case: version bumped, changelog forgotten.
# Only the VERSION is checked, never the date.
CHANGELOG_VERSION="$(sed -n 's/^## \[\([0-9][^]]*\)\].*/\1/p' CHANGELOG.md | head -1)"
if [ -n "$CHANGELOG_VERSION" ] && [ "$CHANGELOG_VERSION" != "$VERSION" ]; then
    echo "ERROR: version drift — package.json=$VERSION but newest CHANGELOG.md entry=$CHANGELOG_VERSION" >&2
    echo "       Add a CHANGELOG entry for $VERSION (or fix the version) before building." >&2
    exit 1
fi

# Module list, in load order. Paths are relative to this tool's root.
MODULES=(
    "../shared/lib/json2.js"
    "$SRC_DIR/locale.js"
    "$SRC_DIR/lib/utils.js"
    "$SRC_DIR/lib/validation.js"
    "../shared/lib/ui_state.js"
    "$SRC_DIR/config.js"
    "$SRC_DIR/lib/storage.js"
    "$SRC_DIR/grid.js"
    "$SRC_DIR/doc.js"
    "$SRC_DIR/draw.js"
    "$SRC_DIR/export.js"
    "$SRC_DIR/ui.js"
    "$SRC_DIR/main.js"
)

# Existence check before writing anything. During incremental development most
# of these are legitimately missing, and a bare `cat` failure halfway through
# leaves a half-written dist plus an unhelpful message.
MISSING=()
for m in "${MODULES[@]}"; do
    [ -f "$m" ] || MISSING+=("$m")
done
if [ ${#MISSING[@]} -gt 0 ]; then
    echo "ERROR: ${#MISSING[@]} module(s) not written yet:" >&2
    for m in "${MISSING[@]}"; do echo "       $m" >&2; done
    exit 1
fi

mkdir -p "$DIST_DIR"
OUTPUT="$DIST_DIR/$SCRIPT_NAME"

# UTF-8 BOM (required for Illustrator to correctly handle Unicode strings)
printf '\xEF\xBB\xBF' > "$OUTPUT"

# Deterministic build: stamp the last commit date of the build inputs, not
# today. Using date(1) made every rebuild on a new day change dist with zero
# content change.
UPDATED="$(git log -1 --format=%cs -- "$SRC_DIR" ../shared/lib 2>/dev/null || true)"
[ -n "$UPDATED" ] || UPDATED="$(date '+%Y-%m-%d')"
UPDATED_YEAR="${UPDATED%%-*}"

cat >> "$OUTPUT" << HEADER
/*
 * ===========================================================================
 * Script:      $HUMAN_NAME
 * Version:     $VERSION
 * Author:      Ladislav Osvald
 * Updated:     $UPDATED
 *
 * Copyright (C) 2025-$UPDATED_YEAR Ladislav Osvald.
 * MIT License — see LICENSE for full terms.
 *
 * Description:
 *   $DESCRIPTION
 * ===========================================================================
 */

#target illustrator

HEADER

for m in "${MODULES[@]}"; do
    cat "$m" >> "$OUTPUT" && echo "" >> "$OUTPUT"
    # Bind the namespace-neutral shared module right after it loads.
    if [ "$m" = "../shared/lib/ui_state.js" ]; then
        echo "buildUIState(TE);" >> "$OUTPUT" && echo "" >> "$OUTPUT"
    fi
done

LINES=$(wc -l < "$OUTPUT" | tr -d ' ')
echo "Build complete: $OUTPUT ($LINES lines)"
