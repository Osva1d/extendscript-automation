#!/bin/bash
# ===========================================================================
# Script:      ai-eval.sh
# Version:     1.0.0
# Author:      Ladislav Osvald
# Updated:     2026-09-07
#
# Description:
#   Runs an ExtendScript snippet or file inside the RUNNING Adobe Illustrator
#   and prints the result. Turns "does this DOM call exist / what does it
#   return" from a guess into a measurement.
#
#   The value of the script's last expression is what comes back, so end a
#   probe with the thing you want to see:
#       tools/ai-eval.sh -e 'app.version'
#       tools/ai-eval.sh -e 'app.activeDocument.pathItems.length'
#       tools/ai-eval.sh probe.jsx
#       echo 'app.documents.length' | tools/ai-eval.sh -
#
#   An uncaught ExtendScript error surfaces as a non-zero exit plus the
#   offending line, e.g.
#       Error 2: neexistujiciSymbol je nedefinovaný.Line: 1->  var x = ...
#
# CAUTION: this executes arbitrary code against whatever documents are open.
#   Probes should READ. Anything that mutates belongs in a document you
#   created for the purpose — see the documents.length guard pattern in
#   docs/extendscript-engine-facts.md.
#
# Usage: tools/ai-eval.sh [-t SECONDS] (<file.jsx> | -e '<code>' | -)
# ===========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER="$SCRIPT_DIR/lib/run-jsx.applescript"
TIMEOUT=600
TMP=""

cleanup() { [ -n "$TMP" ] && rm -f "$TMP"; }
trap cleanup EXIT

usage() {
    sed -n 's/^# Usage: //p' "${BASH_SOURCE[0]}" >&2
    exit 2
}

[ -f "$RUNNER" ] || { echo "ERROR: missing $RUNNER" >&2; exit 1; }

while [ $# -gt 0 ]; do
    case "$1" in
        -t) [ $# -ge 2 ] || usage; TIMEOUT="$2"; shift 2 ;;
        -e) [ $# -ge 2 ] || usage
            TMP="$(mktemp -t ai-eval).jsx"
            printf '%s\n' "$2" > "$TMP"
            shift 2 ;;
        -)  TMP="$(mktemp -t ai-eval).jsx"
            cat > "$TMP"
            shift ;;
        -h|--help) usage ;;
        *)  [ -f "$1" ] || { echo "ERROR: no such file: $1" >&2; exit 1; }
            # Copy to a temp file so the runner always gets an absolute path
            # and the caller can pass a relative one.
            TMP="$(mktemp -t ai-eval).jsx"
            cat "$1" > "$TMP"
            shift ;;
    esac
done

[ -n "$TMP" ] || usage

# Illustrator would be launched implicitly by the Apple event, which takes
# ~20 s and is a surprising side effect of what looks like a lint command.
# Say so rather than appearing to hang.
if ! pgrep -f "Adobe Illustrator" >/dev/null 2>&1; then
    echo "note: Illustrator is not running — the Apple event will launch it (~20 s)." >&2
fi

osascript "$RUNNER" "$TMP" "$TIMEOUT"
