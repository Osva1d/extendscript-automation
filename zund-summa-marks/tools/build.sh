#!/bin/bash
# ===========================================================================
# Script:      build.sh
# Version:     26.4.0
# Author:      Osva1d
# Updated:     2026-05-08
#
# Description:
#   Concatenates Zund/Summa Marks source modules into a single production .jsx.
#
# Module load order (dependencies must come first):
#   json2.js → locale.js → utils.js → validation.js → ui_state.js → config.js → storage.js → core.js → bounds.js → draw.js → ui.js → main.jsx
# ===========================================================================

set -euo pipefail

SLUG="zund-summa-marks"
SCRIPT_NAME="illustrator-${SLUG}.jsx"
HUMAN_NAME="Illustrator Zund & Summa Marks"
# Single source of truth for VERSION is package.json — keeps build, header,
# package.json, and CI smoke-test in lock-step. Falls back to "0.0.0-dev" if
# Node is unavailable (build still works for local hacking but version stamp
# in dist won't match package.json).
VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0-dev")"
DESCRIPTION="Registration marks generator for Zund/Summa cutting tables."
DIST_DIR="dist"
SRC_DIR="src"

# Version parity guard — the runtime constant ZSM.Config.version (shown in the
# dialog title + footer) must match package.json (the dist-header source of
# truth). Without this guard the two can silently drift, so the UI advertises a
# different version than the file header. Fail the build loudly instead.
# (sed -n .../p exits 0 even on no match, so it is safe under `set -o pipefail`.)
SRC_VERSION="$(sed -n 's/.*version:[[:space:]]*"\([^"]*\)".*/\1/p' "$SRC_DIR/config.js" | head -1)"
if [ "$SRC_VERSION" != "$VERSION" ]; then
    echo "ERROR: version drift — package.json=$VERSION but src/config.js version=$SRC_VERSION" >&2
    echo "       Sync the 'version' constant in src/config.js with package.json before building." >&2
    exit 1
fi

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
 * Author:      Ladislav Osvald — PrePresso
 * Updated:     $(date '+%Y-%m-%d')
 *
 * Copyright (C) 2025-$(date '+%Y') Ladislav Osvald (PrePresso). All rights reserved.
 * https://prepresso.lemonsqueezy.com
 *
 * Licensed to the original purchaser. Not for redistribution or resale.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. THE AUTHOR
 * SHALL NOT BE LIABLE FOR ANY DAMAGES OR DATA LOSS ARISING FROM ITS USE.
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
cat "$SRC_DIR/lib/utils.js"      >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/lib/validation.js" >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/lib/ui_state.js"   >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/config.js"         >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/lib/storage.js"    >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/core.js"       >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/lib/bounds.js"     >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/draw.js"       >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/ui.js"         >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/main.jsx"      >> "$OUTPUT"

LINES=$(wc -l < "$OUTPUT" | tr -d ' ')
echo "Build complete: $OUTPUT ($LINES lines)"
