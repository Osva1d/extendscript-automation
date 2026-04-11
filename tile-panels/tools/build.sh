#!/bin/bash
# ===========================================================================
# Script:      build.sh
# Version:     1.0.0
# Author:      Osva1d
# Updated:     2026-04-01
#
# Description:
#   Concatenates Tile Panels source modules into a single production .jsx.
#
# Module load order (dependencies must come first):
#   json2.js → locale.js → utils.js → config.js → core.js → draw.js → ui.js → main.jsx
# ===========================================================================

SLUG="tile-panels"
SCRIPT_NAME="illustrator-${SLUG}.jsx"
HUMAN_NAME="Illustrator Tile Panels"
VERSION="1.0.0"
DESCRIPTION="Panel tiling script for wide-format print production."
DIST_DIR="dist"
SRC_DIR="src"

mkdir -p "$DIST_DIR"
OUTPUT="$DIST_DIR/$SCRIPT_NAME"

# UTF-8 BOM (required for Illustrator to correctly handle Unicode strings)
printf '\xEF\xBB\xBF' > "$OUTPUT"

# File header
cat >> "$OUTPUT" << EOF
/*
 * ===========================================================================
 * Script:      $HUMAN_NAME
 * Version:     $VERSION
 * Author:      Osva1d
 * Updated:     $(date '+%Y-%m-%d')
 *
 * Copyright (c) 2026-$(date '+%Y') Osva1d. All rights reserved.
 * Licensed under a proprietary license. See LICENSE file for details.
 *
 * Description:
 *   $DESCRIPTION
 * ===========================================================================
 */

#target illustrator

EOF

# Modules — order matters
cat "$SRC_DIR/lib/json2.js"  >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/locale.js"     >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/lib/utils.js"  >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/config.js"     >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/core.js"       >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/draw.js"       >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/ui.js"         >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/main.jsx"      >> "$OUTPUT"

LINES=$(wc -l < "$OUTPUT" | tr -d ' ')
echo "Build complete: $OUTPUT ($LINES lines)"
