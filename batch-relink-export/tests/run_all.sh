#!/usr/bin/env bash
# BRE test runner — runs every listed suite, returns non-zero if any fails.
#
# Usage:  bash tests/run_all.sh
#         npm test   (from batch-relink-export/)

set -u  # error on undefined vars; do NOT use -e (we want to run all suites)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

SUITES=(
    "test_locale.js"
    "test_storage.js"
    "test_core.js"
)

PASSED=0
FAILED=0
FAILED_NAMES=()

for suite in "${SUITES[@]}"; do
    echo "▶ ${suite%.js}"
    if node "$suite"; then
        PASSED=$((PASSED + 1))
    else
        FAILED=$((FAILED + 1))
        FAILED_NAMES+=("$suite")
    fi
done

echo ""
echo "=== batch-relink-export: ${PASSED}/${#SUITES[@]} suites passed ==="
if [ "$FAILED" -gt 0 ]; then
    printf 'FAILED: %s\n' "${FAILED_NAMES[@]}"
    exit 1
fi
exit 0
