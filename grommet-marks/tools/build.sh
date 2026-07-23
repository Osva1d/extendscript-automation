#!/bin/bash
# ===========================================================================
# Script:      build.sh
# Version:     4.2.0
# Author:      Osva1d
# Updated:     2026-05-28
#
# Description:
#   Concatenates Grommet Marks source modules into production script.
#   Build order: ../shared/lib/json2 -> constants -> locale -> lib/utils -> config ->
#                lib/storage -> lib/validation -> ../shared/lib/ui_state ->
#                core -> illustrator -> ui -> main
# ===========================================================================

set -euo pipefail

SLUG="grommet-marks"
SCRIPT_NAME="illustrator-${SLUG}.jsx"
HUMAN_NAME="Illustrator Grommet Marks"
VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0-dev")"
DESCRIPTION="Grommet mark generator for banner production."
DIST_DIR="dist"
SRC_DIR="src"

# Version parity guard — the runtime constant GM.CONSTANTS.VERSION (shown in the
# dialog title + footer) must match package.json (the dist-header source of
# truth). Without this guard the two can silently drift, so the UI advertises a
# different version than the file header. Fail the build loudly instead.
# (sed -n .../p exits 0 even on no match, so it is safe under `set -o pipefail`.)
SRC_VERSION="$(sed -n 's/.*VERSION:[[:space:]]*"\([^"]*\)".*/\1/p' "$SRC_DIR/constants.js" | head -1)"
if [ "$SRC_VERSION" != "$VERSION" ]; then
    echo "ERROR: version drift — package.json=$VERSION but src/constants.js VERSION=$SRC_VERSION" >&2
    echo "       Sync the VERSION constant in src/constants.js with package.json before building." >&2
    exit 1
fi

mkdir -p "$DIST_DIR"
OUTPUT="$DIST_DIR/$SCRIPT_NAME"

# UTF-8 BOM (required for Illustrator Unicode strings)
printf '\xEF\xBB\xBF' > "$OUTPUT"

# Deterministic build: stamp the last src commit date, not today. Using date(1)
# made every rebuild on a new day dirty dist with zero content change, which
# fights the dist-freshness pre-commit hook and forces empty "refresh" commits.
UPDATED="$(git log -1 --format=%cs -- "$SRC_DIR" 2>/dev/null || true)"
[ -n "$UPDATED" ] || UPDATED="$(date '+%Y-%m-%d')"   # fallback: no git / no history
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

(function () {

EOF

# Modules — order matters (dependencies first)
cat "../shared/lib/json2.js"         >> "$OUTPUT" && echo "" >> "$OUTPUT"   # shared core module (must stay FIRST — everything below may use JSON)
echo "var GM = {};"                  >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/constants.js"          >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/locale.js"             >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/lib/utils.js"          >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/config.js"             >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/lib/storage.js"        >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/lib/validation.js"     >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "../shared/lib/ui_state.js"      >> "$OUTPUT" && echo "" >> "$OUTPUT"   # shared core module
echo "buildUIState(GM);"             >> "$OUTPUT" && echo "" >> "$OUTPUT"   # bind shared module to GM namespace
cat "$SRC_DIR/core.js"               >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/illustrator.js"        >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/ui.js"                 >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/main.js"               >> "$OUTPUT"

echo "" >> "$OUTPUT"
echo "})();" >> "$OUTPUT"

LINES=$(wc -l < "$OUTPUT" | tr -d ' ')
echo "Build complete: $OUTPUT ($LINES lines)"
