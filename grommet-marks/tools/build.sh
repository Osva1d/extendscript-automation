#!/bin/bash
# ===========================================================================
# Script:      build.sh
# Version:     4.1.0
# Author:      Osva1d
# Updated:     2026-05-28
#
# Description:
#   Concatenates Grommet Marks source modules into production script.
#   Build order: polyfills -> constants -> locale -> lib/utils -> config ->
#                lib/storage -> lib/validation -> lib/ui_state ->
#                lib/preview_model -> core -> illustrator -> ui -> main
# ===========================================================================

set -euo pipefail

SLUG="grommet-marks"
SCRIPT_NAME="illustrator-${SLUG}.jsx"
HUMAN_NAME="Illustrator Grommet Marks"
VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0-dev")"
DESCRIPTION="Grommet mark generator for banner production."
DIST_DIR="dist"
SRC_DIR="src"

mkdir -p "$DIST_DIR"
OUTPUT="$DIST_DIR/$SCRIPT_NAME"

# UTF-8 BOM (required for Illustrator Unicode strings)
printf '\xEF\xBB\xBF' > "$OUTPUT"

cat >> "$OUTPUT" << EOF
/*
 * ===========================================================================
 * Script:      $HUMAN_NAME
 * Version:     $VERSION
 * Author:      Osva1d
 * Updated:     $(date '+%Y-%m-%d')
 *
 * Copyright (C) 2025-$(date '+%Y') Ladislav Osvald (Osva1d).
 * Licensed under GNU GPL-3.0-or-later. See LICENSE file or
 * <https://www.gnu.org/licenses/gpl-3.0.txt> for full terms.
 *
 * Description:
 *   $DESCRIPTION
 * ===========================================================================
 */

#target illustrator

(function () {

EOF

# Modules — order matters (dependencies first)
cat "$SRC_DIR/polyfills/json2.js"    >> "$OUTPUT" && echo "" >> "$OUTPUT"
echo "var GM = {};"                  >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/constants.js"          >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/locale.js"             >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/lib/utils.js"          >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/config.js"             >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/lib/storage.js"        >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/lib/validation.js"     >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/lib/ui_state.js"       >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/lib/preview_model.js"  >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/core.js"               >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/illustrator.js"        >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/ui.js"                 >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/main.js"               >> "$OUTPUT"

echo "" >> "$OUTPUT"
echo "})();" >> "$OUTPUT"

LINES=$(wc -l < "$OUTPUT" | tr -d ' ')
echo "Build complete: $OUTPUT ($LINES lines)"
