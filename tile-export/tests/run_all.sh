#!/usr/bin/env bash
# TE Test Suite — runs all Node.js test files.
# Returns non-zero exit code if any test fails.
#
# Usage:  bash tests/run_all.sh
#         npm test  (if wired into package.json)

set -u  # error on undefined vars; do NOT use -e (we want to run all suites)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

# ANSI colors (skip if NO_COLOR env set, or output isn't a tty)
if [ -z "${NO_COLOR:-}" ] && [ -t 1 ]; then
    GREEN=$'\033[0;32m'
    RED=$'\033[0;31m'
    BOLD=$'\033[1m'
    DIM=$'\033[2m'
    RESET=$'\033[0m'
else
    GREEN=""; RED=""; BOLD=""; DIM=""; RESET=""
fi

# Suite list (order: lightweight first, then progressively heavier)
SUITES=(
    "tests/test_es3_compliance.js"
    "tests/test_utils.js"
    "tests/test_grid_cuts.js"
    "tests/test_grid_tiles.js"
    "tests/test_validation.js"
    "tests/test_doc.js"
    "tests/test_cut.js"
    "tests/test_markcolor.js"
    "tests/test_export_transform.js"
    "tests/test_properties.js"
    "tests/test_ui_collect.js"
    "tests/test_ui_summary.js"
)

TOTAL_SUITES=${#SUITES[@]}
PASSED_SUITES=0
FAILED_SUITES=0
FAILED_NAMES=()

START=$(date +%s)

echo ""
echo "${BOLD}=== TE Test Suite Runner ===${RESET}"
echo "${DIM}Running ${TOTAL_SUITES} suites...${RESET}"
echo ""

for suite in "${SUITES[@]}"; do
    name=$(basename "$suite" .js)
    echo "${BOLD}▶ ${name}${RESET}"

    if node "$suite"; then
        PASSED_SUITES=$((PASSED_SUITES + 1))
        echo "${GREEN}  ✓ ${name} passed${RESET}"
    else
        FAILED_SUITES=$((FAILED_SUITES + 1))
        FAILED_NAMES+=("$name")
        echo "${RED}  ✗ ${name} FAILED${RESET}"
    fi
    echo ""
done

ELAPSED=$(( $(date +%s) - START ))

echo "${BOLD}=== Summary ===${RESET}"
echo "  Suites passed: ${GREEN}${PASSED_SUITES}/${TOTAL_SUITES}${RESET}"
if [ "$FAILED_SUITES" -gt 0 ]; then
    echo "  ${RED}Failed:${RESET}"
    for name in "${FAILED_NAMES[@]}"; do
        echo "    - $name"
    done
fi
echo "  ${DIM}Elapsed: ${ELAPSED}s${RESET}"
echo ""

if [ "$FAILED_SUITES" -eq 0 ]; then
    echo "${GREEN}${BOLD}ALL SUITES PASSED${RESET}"
    exit 0
else
    echo "${RED}${BOLD}${FAILED_SUITES} SUITE(S) FAILED${RESET}"
    exit 1
fi
