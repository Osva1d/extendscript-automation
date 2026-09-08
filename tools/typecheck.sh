#!/bin/bash
# ===========================================================================
# Script:      typecheck.sh
# Version:     1.0.0
# Author:      Ladislav Osvald
# Updated:     2026-09-07
#
# Description:
#   Type-checks named source files against the Illustrator DOM typings.
#   Catches the class of mistake that no test can: an API name that does not
#   exist. Measured on a probe of eight plausible-but-wrong calls
#   (artboardRectangle, doc.pathItem, getByname, everyItem, Window("dialogue"),
#   aligmentChildren, File.opon, $.hiresTimr) — all eight reported, most with
#   a "Did you mean" suggestion.
#
#   It also catches missing ES3 built-ins with TYPE awareness, which the regex
#   scanner cannot do: "abc".indexOf(x) passes, [1,2].indexOf(x) fails, because
#   types-for-adobe models ExtendScript's real Array (no ES5 methods).
#
#   FILES ARE REQUIRED, deliberately. Pointed at the whole repo it reports ~29
#   findings in working code where TS is technically right (downcasts, union
#   narrowing) — noise that would train you to ignore it. Point it at what you
#   just wrote.
#
# Usage: tools/typecheck.sh <file.js> [file.js ...]
# Example: tools/typecheck.sh zund-summa-marks/src/draw.js
# ===========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TFA="$REPO_ROOT/node_modules/types-for-adobe"
CONFIG=""

cleanup() { [ -n "$CONFIG" ] && rm -f "$CONFIG"; }
trap cleanup EXIT

if [ $# -eq 0 ]; then
    sed -n 's/^# Usage: //p;s/^# Example: //p' "${BASH_SOURCE[0]}" >&2
    exit 2
fi

[ -d "$TFA" ] || { echo "ERROR: types-for-adobe not installed. Run: npm install" >&2; exit 1; }

# Build a throwaway tsconfig listing the typings plus exactly the files asked
# for. `lib: []` matters: without it TypeScript's own ES2015 lib both collides
# with the ExtendScript typings (13 redeclaration errors) and silently declares
# Array.prototype.map as existing, which is the opposite of what we want.
CONFIG="$(mktemp -t tscheck).json"
{
    printf '{\n  "compilerOptions": {\n'
    printf '    "allowJs": true, "checkJs": true, "noEmit": true,\n'
    printf '    "strict": false, "types": [], "lib": []\n  },\n'
    printf '  "files": [\n'
    printf '    "%s/typings/illustrator-augment.d.ts",\n' "$REPO_ROOT"
    printf '    "%s/shared/JavaScript.d.ts",\n' "$TFA"
    printf '    "%s/shared/ScriptUI.d.ts",\n' "$TFA"
    printf '    "%s/shared/global.d.ts",\n' "$TFA"
    printf '    "%s/Illustrator/2022/index.d.ts"' "$TFA"
    for f in "$@"; do
        [ -f "$f" ] || { echo "ERROR: no such file: $f" >&2; exit 1; }
        printf ',\n    "%s"' "$(cd "$(dirname "$f")" && pwd)/$(basename "$f")"
    done
    printf '\n  ]\n}\n'
} > "$CONFIG"

# tsc exits non-zero on findings; report only, let the caller decide.
npx --no-install tsc -p "$CONFIG"
