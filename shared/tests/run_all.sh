#!/usr/bin/env bash
# Shared-core test runner — the shared/lib modules that no tool's own suite
# covers. Returns non-zero if any suite fails.
#
# Usage:  bash shared/tests/run_all.sh
#         npm run test:shared   (from the repo root)

set -u  # error on undefined vars; do NOT use -e (we want to run all suites)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

SUITES=(
    "test_numbers.js"
    "test_field_paint.js"
    "test_registration.js"
    "test_drawing_scale.js"
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
echo "=== shared: ${PASSED}/${#SUITES[@]} suites passed ==="
if [ "$FAILED" -gt 0 ]; then
    printf 'FAILED: %s\n' "${FAILED_NAMES[@]}"
    exit 1
fi
exit 0
