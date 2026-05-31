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
#   locale.js -> config.js -> core.js -> ui.js -> main.jsx
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

mkdir -p "$DIST_DIR"
OUTPUT="$DIST_DIR/$SCRIPT_NAME"

printf '\xEF\xBB\xBF' > "$OUTPUT"

cat >> "$OUTPUT" << EOF
/*
 * ===========================================================================
 * Script:      $HUMAN_NAME
 * Version:     $VERSION
 * Author:      Osva1d
 * Updated:     $(date '+%Y-%m-%d')
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
cat "$SRC_DIR/main.jsx"   >> "$OUTPUT"

LINES=$(wc -l < "$OUTPUT" | tr -d ' ')
echo "Build complete: $OUTPUT ($LINES lines)"
