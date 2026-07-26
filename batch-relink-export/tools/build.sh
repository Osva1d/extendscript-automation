#!/bin/bash
# ===========================================================================
# Script:      build.sh
# Version:     3.0.0
# Author:      Osva1d
# Updated:     2026-05-31
#
# Description:
#   Concatenates Batch Relink Export source modules into a single production .jsx.
#
# Module load order (dependencies must come first):
#   locale.js -> config.js -> core.js -> ui.js -> main.js
# ===========================================================================

set -euo pipefail

SLUG="batch-relink-export"
SCRIPT_NAME="illustrator-${SLUG}.jsx"
HUMAN_NAME="Illustrator Batch Relink Export"
VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0-dev")"
DESCRIPTION="Batch PDF relinking and export for Illustrator templates."
DIST_DIR="dist"
SRC_DIR="src"

SRC_VERSION="$(sed -n 's/.*version:[[:space:]]*"\([^"]*\)".*/\1/p' "$SRC_DIR/config.js" | head -1)"
if [ "$SRC_VERSION" != "$VERSION" ]; then
    echo "ERROR: version drift — package.json=$VERSION but src/config.js version=$SRC_VERSION" >&2
    echo "       Sync the 'version' constant in src/config.js with package.json before building." >&2
    exit 1
fi

# CHANGELOG parity — the newest entry in CHANGELOG.md must carry the version
# being built. Catches the release-half-done case: version bumped, changelog
# forgotten (or the reverse). Only the VERSION is checked, never the date:
# `Updated:` in the header is generated from the last src commit, so in a local
# dev build it legitimately differs from the release date.
CHANGELOG_VERSION="$(sed -n 's/^## \[\([0-9][^]]*\)\].*/\1/p' CHANGELOG.md | head -1)"
if [ -n "$CHANGELOG_VERSION" ] && [ "$CHANGELOG_VERSION" != "$VERSION" ]; then
    echo "ERROR: version drift — package.json=$VERSION but newest CHANGELOG.md entry=$CHANGELOG_VERSION" >&2
    echo "       Add a CHANGELOG entry for $VERSION (or fix the version) before building." >&2
    exit 1
fi

mkdir -p "$DIST_DIR"
OUTPUT="$DIST_DIR/$SCRIPT_NAME"

printf '\xEF\xBB\xBF' > "$OUTPUT"

# Deterministic build: stamp the last commit date of the build inputs, not today.
# Using date(1) made every rebuild on a new day change dist with zero content
# change. Fallback: no git / no history.
UPDATED="$(git log -1 --format=%cs -- "$SRC_DIR" 2>/dev/null || true)"
[ -n "$UPDATED" ] || UPDATED="$(date '+%Y-%m-%d')"
UPDATED_YEAR="${UPDATED%%-*}"

cat >> "$OUTPUT" << EOF
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

EOF

cat "$SRC_DIR/locale.js"  >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/config.js"  >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/core.js"    >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/ui.js"      >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/main.js"   >> "$OUTPUT"

LINES=$(wc -l < "$OUTPUT" | tr -d ' ')
echo "Build complete: $OUTPUT ($LINES lines)"
