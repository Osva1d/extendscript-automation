#!/usr/bin/env bash
# GM Test Suite — runs all Node.js test files.
# Returns non-zero exit code if any test fails.
#
# Usage:  bash tests/run_all.sh
#         npm test

set -u

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

if [ -z "${NO_COLOR:-}" ] && [ -t 1 ]; then
    GREEN=$'\033[0;32m'
    RED=$'\033[0;31m'
    BOLD=$'\033[1m'
    DIM=$'\033[2m'
    RESET=$'\033[0m'
else
    GREEN=""; RED=""; BOLD=""; DIM=""; RESET=""
fi

SUITES=(
    "tests/test_core_math.js"
    "tests/test_storage_migrations.js"
    "tests/test_ui_state.js"
    "tests/test_validation.js"
    "tests/test_ui_dialog.js"
)

TOTAL_SUITES=${#SUITES[@]}
PASSED_SUITES=0
FAILED_SUITES=0
FAILED_NAMES=()

START=$(date +%s)

echo ""
echo "${BOLD}=== GM Test Suite Runner ===${RESET}"
echo "${DIM}Running ${TOTAL_SUITES} suites...${RESET}"
echo ""

for suite in "${SUITES[@]}"; do
    name=$(basename "$suite" .js)
    echo "${BOLD}> ${name}${RESET}"

    if node "$suite"; then
        PASSED_SUITES=$((PASSED_SUITES + 1))
        echo "${GREEN}  + ${name} passed${RESET}"
    else
        FAILED_SUITES=$((FAILED_SUITES + 1))
        FAILED_NAMES+=("$name")
        echo "${RED}  x ${name} FAILED${RESET}"
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
