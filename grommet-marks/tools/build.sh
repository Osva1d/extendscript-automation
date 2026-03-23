#!/bin/bash
# ===========================================================================
# Script:      build.sh
# Version:     3.1.0
# Author:      Osva1d
# Updated:     2026-02-16
#
# Description:
#   Concatenates Grommet Marks source modules into production script.
#   Build order: polyfills → constants → locale → config → core →
#                illustrator → ui → main
# ===========================================================================

SLUG="grommet-marks"
SCRIPT_NAME="illustrator-${SLUG}.jsx"
HUMAN_NAME="Illustrator Grommet Marks"
VERSION="3.1.0"
DESCRIPTION="Grommet mark generator for banner production."
DIST_DIR="dist"
SRC_DIR="src"

mkdir -p "$DIST_DIR"
OUTPUT="$DIST_DIR/$SCRIPT_NAME"

# Write UTF-8 BOM + #target directive
printf '\xEF\xBB\xBF' > "$OUTPUT"
echo "#target illustrator" >> "$OUTPUT"
# Append header
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

(function () {

EOF

cat "$SRC_DIR/polyfills/json2.js" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "var GM = {};" >> "$OUTPUT"
echo "" >> "$OUTPUT"
cat "$SRC_DIR/constants.js" >> "$OUTPUT"
echo "" >> "$OUTPUT"
cat "$SRC_DIR/locale.js" >> "$OUTPUT"
echo "" >> "$OUTPUT"
cat "$SRC_DIR/config.js" >> "$OUTPUT"
echo "" >> "$OUTPUT"
cat "$SRC_DIR/core.js" >> "$OUTPUT"
echo "" >> "$OUTPUT"
cat "$SRC_DIR/illustrator.js" >> "$OUTPUT"
echo "" >> "$OUTPUT"
cat "$SRC_DIR/ui.js" >> "$OUTPUT"
echo "" >> "$OUTPUT"
cat "$SRC_DIR/main.js" >> "$OUTPUT"

echo "" >> "$OUTPUT"
echo "})();" >> "$OUTPUT"

LINES=$(wc -l < "$OUTPUT" | tr -d ' ')
echo "Build complete: $OUTPUT ($LINES lines)"
