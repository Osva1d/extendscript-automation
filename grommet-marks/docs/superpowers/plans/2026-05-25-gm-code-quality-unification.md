# Grommet Marks v4.0 — Code Quality & ZSM Unification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Grommet Marks from a monolithic v3.1 architecture to a modular v4.0 that mirrors the Zünd Summa Marks (ZSM) project structure — separating persistence, validation, preset state, and utilities into testable `lib/` modules.

**Architecture:** Bottom-up extraction. New modules (`lib/utils.js`, `lib/storage.js`, `lib/validation.js`, `lib/ui_state.js`) are created and tested before the existing files (`config.js`, `main.js`, `ui.js`) are slimmed down to use them. Each task produces a buildable script. The persistence format migrates from flat `{presetName: settings}` to a wrapper `{activePreset, presets}` with auto-saved `[Last Settings]`.

**Tech Stack:** ExtendScript (ES3), ScriptUI, Node.js (tests), bash (build)

**Spec:** `docs/superpowers/specs/2026-05-25-gm-code-quality-unification-design.md`

**Reference project:** `../../zund-summa-marks/` (ZSM) — all new modules follow ZSM patterns.

---

### Task 1: Bootstrap project tooling (package.json, run_all.sh, build.sh update)

**Files:**
- Create: `package.json`
- Create: `tests/run_all.sh`
- Modify: `tools/build.sh`

This task sets up the test runner and npm scripts before any code changes, so `npm test` and `npm run build` work from the start.

- [ ] **Step 1: Create package.json**

```json
{
    "name": "grommet-marks",
    "version": "4.0.0",
    "description": "Grommet mark generator for banner production (Adobe Illustrator).",
    "scripts": {
        "build": "bash tools/build.sh",
        "test": "bash tests/run_all.sh",
        "verify": "npm run build && npm test"
    },
    "private": true
}
```

- [ ] **Step 2: Create tests/run_all.sh**

Follow ZSM pattern: runs all `tests/test_*.js` files, prints summary, exits non-zero on failure.

```bash
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
```

- [ ] **Step 3: Commit**

```bash
git add package.json tests/run_all.sh
git commit -m "chore: bootstrap project tooling (package.json, test runner)"
```

> **Note:** `tools/build.sh` will be updated in Task 8 after all new modules exist.

---

### Task 2: Create `src/lib/utils.js` — GM.Utils

**Files:**
- Create: `src/lib/utils.js`

Utility functions used by all other modules. No dependencies except `GM.CONSTANTS` (for `SCRIPT_NAME` in `error()`). Must be loaded after `constants.js` and before everything else in `lib/`.

- [ ] **Step 1: Create src/lib/utils.js**

```javascript
// ------------------------------------------------------------------------
// Module: GM.Utils — shared utility functions
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Utils = {
    /**
     * Writes a debug message to the ExtendScript console.
     * @param {string} msg - Message to log.
     */
    log: function (msg) {
        $.writeln("[GM] " + msg);
    },

    /**
     * Displays a user-facing error alert prefixed with script name.
     * @param {string} msg - Error message body.
     */
    error: function (msg) {
        alert(GM.CONSTANTS.SCRIPT_NAME + ": " + msg);
    },

    /**
     * Returns a deep copy of a JSON-serializable object.
     * @param {Object} obj - Source object.
     * @returns {Object} Independent copy.
     */
    deepCopy: function (obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Deep-equality test for two GM settings objects.
     * Used by the UI to detect "modified" state (UI values diverged
     * from the stored preset). Numeric coercion via String() so 5
     * and "5" compare equal — UI inputs are strings, stored values
     * may be numbers.
     *
     * @param {Object} a - First settings object.
     * @param {Object} b - Second settings object.
     * @returns {boolean} True if all schema fields are equal.
     */
    presetEquals: function (a, b) {
        if (!a || !b) return false;
        var keys = [
            "offsetX", "offsetY", "bottomMirror", "rightMirror",
            "units", "markSize", "isRound",
            "markLayerName", "fillEnabled", "fillSwatchName", "fillOverprint",
            "strokeEnabled", "strokeSwatchName", "strokeOverprint", "strokeWeight"
        ];
        for (var i = 0; i < keys.length; i++) {
            if (String(a[keys[i]]) !== String(b[keys[i]])) return false;
        }
        // Compare edge sub-objects
        var edgeNames = ["top", "left", "bottom", "right"];
        var edgeKeys = ["enabled", "useNumber", "number", "spacing"];
        for (var ei = 0; ei < edgeNames.length; ei++) {
            var aE = a[edgeNames[ei]] || {};
            var bE = b[edgeNames[ei]] || {};
            for (var ek = 0; ek < edgeKeys.length; ek++) {
                if (String(aE[edgeKeys[ek]]) !== String(bE[edgeKeys[ek]])) return false;
            }
        }
        return true;
    }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils.js
git commit -m "feat: add GM.Utils module (log, error, deepCopy, presetEquals)"
```

---

### Task 3: Update `src/constants.js` — remove SENTINEL_DEFAULT, add namespace guard

**Files:**
- Modify: `src/constants.js`

Remove `SENTINEL_DEFAULT` (replaced by `GM.Config.PRESET_KEY_DEFAULT = "[Default]"` in Task 5). Keep `SENTINEL_CREATE` (used for layer/swatch auto-creation). Add namespace guard. Update VERSION to 4.0.0. Add module header.

- [ ] **Step 1: Rewrite src/constants.js**

```javascript
// ------------------------------------------------------------------------
// Module: GM.CONSTANTS — script-wide constants
// Part of: Illustrator Grommet Marks
// Depends on: (none)
// ------------------------------------------------------------------------
var GM = GM || {};

GM.CONSTANTS = {
    SCRIPT_NAME: "Illustrator Grommet Marks",
    VERSION: "4.0.0",
    SETTINGS_FILE_NAME: "GrommetMarksSettings.json",

    LAYER_NAME: "Grommet Marks",
    SWATCH_NAME: "Grommet Marks",

    // Layer/swatch auto-creation sentinel — never displayed, used in logic only
    SENTINEL_CREATE: "__create__",

    // Unit system — internal keys, display names live in locale
    UNIT: { MM: "mm", CM: "cm", IN: "in" },
    UNIT_KEYS: ["mm", "cm", "in"],
    UNIT_FACTORS: {
        "mm": 2.834645669291339,
        "cm": 28.34645669291339,
        "in": 72
    }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/constants.js
git commit -m "refactor: remove SENTINEL_DEFAULT from constants, bump to v4.0.0"
```

---

### Task 4: Extend `src/locale.js` — new preset UI keys, namespace guard

**Files:**
- Modify: `src/locale.js`

Add keys needed by the new preset UI (Save As, Reset, reserved name error, overwrite confirm, placeholder). Add namespace guard and module header.

- [ ] **Step 1: Rewrite src/locale.js**

Add the namespace guard `var GM = GM || {};` at the top. Add the module header block. Then within the `en` and `cs` string tables, add these new keys (insert after the existing `REPLACE_EXISTING` / `SAVE_TITLE` block in the Settings section):

New EN keys to add:
```javascript
BTN_SAVE_AS: "Save As…",
TIP_SAVE_AS: "Save current settings as a new preset.",
BTN_RESET: "Reset",
TIP_RESET: "Reset all settings to factory defaults.",
ERR_RESERVED_NAME: "This name is reserved. Choose a different name.",
ERR_PRESET_EXISTS: "Preset already exists. Overwrite?",
PRESET_PLACEHOLDER: "My Preset",
```

New CS keys to add:
```javascript
BTN_SAVE_AS: "Uložit jako…",
TIP_SAVE_AS: "Uložit aktuální nastavení jako novou předvolbu.",
BTN_RESET: "Reset",
TIP_RESET: "Obnovit všechna nastavení na výchozí hodnoty.",
ERR_RESERVED_NAME: "Tento název je rezervovaný. Vyberte jiný.",
ERR_PRESET_EXISTS: "Předvolba již existuje. Přepsat?",
PRESET_PLACEHOLDER: "Moje předvolba",
```

Also add the module header:
```javascript
// ------------------------------------------------------------------------
// Module: GM.L — localization (EN/CS string tables)
// Part of: Illustrator Grommet Marks
// Depends on: (none — self-contained IIFE)
// ------------------------------------------------------------------------
var GM = GM || {};
```

Remove the redundant `SAVE_TITLE` and `PRESET_NAME` keys (the Save As flow uses a prompt, not a sub-dialog — aligning with ZSM). Replace them with `PROMPT_SAVE_AS`.

New replacement keys:
```javascript
// EN: replace SAVE_TITLE + PRESET_NAME with:
PROMPT_SAVE_AS: "Save current settings as new preset:",

// CS: replace SAVE_TITLE + PRESET_NAME with:
PROMPT_SAVE_AS: "Uložit aktuální nastavení jako novou předvolbu:",
```

- [ ] **Step 2: Verify build still works**

```bash
cd /Users/ladislavosvald/Dev/Sandbox/_incubator/grommet-marks && bash tools/build.sh
```

Expected: `Build complete: dist/illustrator-grommet-marks.jsx (NNN lines)`

- [ ] **Step 3: Commit**

```bash
git add src/locale.js
git commit -m "feat: add new locale keys for Save As, Reset, preset validation"
```

---

### Task 5: Slim down `src/config.js` — keep only getDefaults + PRESET_KEY_DEFAULT

**Files:**
- Modify: `src/config.js`

Remove `load()`, `save()`, `migrate()`, `migrateKeys()`, `getSettingsFile()` — these move to `lib/storage.js` in Task 6. Add `PRESET_KEY_DEFAULT`. Update `getDefaults()` to no longer reference `SENTINEL_DEFAULT`. Add namespace guard and module header.

- [ ] **Step 1: Rewrite src/config.js**

```javascript
// ------------------------------------------------------------------------
// Module: GM.Config — default settings and preset constants
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Config = {
    PRESET_KEY_DEFAULT: "[Default]",

    /**
     * Creates an edge definition (per-edge settings).
     * @param {boolean} enabled - Edge active.
     * @param {boolean} useNum - True = fixed count, false = preferred spacing.
     * @param {number} num - Number of marks.
     * @param {number} spacing - Preferred spacing between mark centers.
     * @returns {Object} Edge definition.
     */
    createEdgeDef: function (enabled, useNum, num, spacing) {
        return {
            enabled: enabled,
            useNumber: useNum,
            number: num,
            spacing: spacing
        };
    },

    /**
     * Returns a fresh default settings object.
     * @returns {Object} Default settings.
     */
    getDefaults: function () {
        var c = GM.Config.createEdgeDef;
        var S = GM.CONSTANTS.SENTINEL_CREATE;
        return {
            offsetX: 7,
            offsetY: 7,
            top: c(true, true, 10, 105),
            left: c(true, true, 10, 105),
            bottom: c(false, true, 10, 105),
            right: c(false, true, 10, 105),
            bottomMirror: true,
            rightMirror: true,
            units: GM.CONSTANTS.UNIT.MM,
            markSize: 3,
            isRound: true,
            markLayerName: S,
            fillEnabled: true,
            fillSwatchName: S,
            fillOverprint: true,
            strokeEnabled: false,
            strokeSwatchName: S,
            strokeOverprint: true,
            strokeWeight: 1
        };
    }
};
```

- [ ] **Step 2: Verify build still works**

```bash
cd /Users/ladislavosvald/Dev/Sandbox/_incubator/grommet-marks && bash tools/build.sh
```

- [ ] **Step 3: Commit**

```bash
git add src/config.js
git commit -m "refactor: slim config.js to getDefaults + PRESET_KEY_DEFAULT"
```

---

### Task 6: Create `src/lib/storage.js` — GM.Storage with migration chain

**Files:**
- Create: `src/lib/storage.js`

Persistence module extracted from the old `config.js`. Handles load/save and the full migration chain: flat→wrapper, `__default__`→`[Default]`, v2→v3 offsets, v3.0→v3.1 localized strings, forward-fill.

- [ ] **Step 1: Create src/lib/storage.js**

```javascript
// ------------------------------------------------------------------------
// Module: GM.Storage — settings persistence + migrations
// Part of: Illustrator Grommet Marks
//
// Responsible for reading/writing the JSON settings file and migrating
// older formats forward. Pure I/O + data transformation; no DOM, no UI.
//
// Depends on: GM.Utils (logging), GM.Config (getDefaults, PRESET_KEY_DEFAULT)
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Storage = {
    PRESET_KEY_LAST: "[Last Settings]",

    /**
     * Returns the settings File object, creating the folder if needed.
     * @returns {File} JSON settings file.
     */
    getFile: function () {
        var folder = new Folder(Folder.userData + "/GrommetMarks");
        if (!folder.exists) folder.create();
        return new File(folder.fsName + "/" + GM.CONSTANTS.SETTINGS_FILE_NAME);
    },

    /**
     * Serializes and saves the full preset wrapper to disk.
     * @param {Object} data - Full preset wrapper {activePreset, presets}.
     */
    save: function (data) {
        try {
            var f = GM.Storage.getFile();
            f.encoding = "UTF-8";
            if (!f.open("w")) {
                GM.Utils.error(GM.L.ERR_WRITE_SETTINGS);
                return;
            }
            f.write(JSON.stringify(data));
            f.close();
        } catch (e) {
            GM.Utils.log("Storage.save failed: " + e.message);
        }
    },

    /**
     * Migrates a single preset's values from older formats.
     * - v2.x per-edge x/y offsets → v3 global offsetX/offsetY
     * - v3.0 localized unit names → v3.1 internal keys (mm/cm/in)
     * - v3.0 localized sentinel strings → internal __create__
     * @param {Object} preset - Single preset object (mutated).
     * @returns {Object} Migrated preset.
     */
    migratePreset: function (preset) {
        // v2 → v3: per-edge x/y to global offsets
        if (typeof preset.offsetX === "undefined") {
            var topX = (preset.top && typeof preset.top.x !== "undefined") ? preset.top.x : 7;
            var topY = (preset.top && typeof preset.top.y !== "undefined") ? preset.top.y : 7;
            preset.offsetX = topX;
            preset.offsetY = topY;
        }

        var edges = ["top", "left", "bottom", "right"];
        for (var i = 0; i < edges.length; i++) {
            var e = preset[edges[i]];
            if (e) { delete e.x; delete e.y; }
        }

        if (typeof preset.bottomMirror === "undefined") preset.bottomMirror = true;
        if (typeof preset.rightMirror === "undefined") preset.rightMirror = true;

        // v3.0 → v3.1: localized unit names to internal keys
        var unitMap = {
            "Milimetry": "mm", "Centimetry": "cm", "Palce": "in",
            "Millimeters": "mm", "Centimeters": "cm", "Inches": "in"
        };
        if (preset.units && unitMap[preset.units]) {
            preset.units = unitMap[preset.units];
        }

        // v3.0 → v3.1: localized sentinel strings to __create__
        var legacySentinels = [
            "[Vytvořit 'Grommet Marks']",
            "[Create 'Grommet Marks']"
        ];
        var sentinelFields = ["markLayerName", "fillSwatchName", "strokeSwatchName"];
        for (var j = 0; j < sentinelFields.length; j++) {
            var field = sentinelFields[j];
            if (preset[field]) {
                for (var k = 0; k < legacySentinels.length; k++) {
                    if (preset[field] === legacySentinels[k]) {
                        preset[field] = GM.CONSTANTS.SENTINEL_CREATE;
                        break;
                    }
                }
            }
        }

        return preset;
    },

    /**
     * Loads settings from disk and runs format migrations.
     * Migration chain:
     *   1. Flat {presetName: settings} → wrapper {activePreset, presets}
     *   2. __default__ → [Default] key rename
     *   3. Per-preset value migrations (v2→v3, v3.0→v3.1)
     *   4. Forward-fill new default keys
     * Returns null on failure; caller falls back to getDefaults().
     * @returns {Object|null} Full preset wrapper or null.
     */
    load: function () {
        var f = GM.Storage.getFile();
        if (!f.exists) return null;

        try {
            f.encoding = "UTF-8";
            f.open("r");
            var content = f.read();
            f.close();
            if (!content) return null;

            var data = JSON.parse(content);
            var DEF = GM.Config.PRESET_KEY_DEFAULT;

            // MIGRATION 1: flat → wrapper
            if (!data.presets) {
                var flat = data;
                var wrapper = { activePreset: DEF, presets: {} };

                // Old format: keys are preset names, values are settings
                for (var fk in flat) {
                    if (flat.hasOwnProperty(fk)) {
                        wrapper.presets[fk] = flat[fk];
                    }
                }
                data = wrapper;
            }

            // MIGRATION 2: __default__ → [Default]
            if (data.presets["__default__"] && !data.presets[DEF]) {
                data.presets[DEF] = data.presets["__default__"];
                delete data.presets["__default__"];
            }
            if (data.activePreset === "__default__") {
                data.activePreset = DEF;
            }

            // Also migrate old localized default keys
            var legacyDefaults = ["[Výchozí]"];
            for (var ld = 0; ld < legacyDefaults.length; ld++) {
                var oldKey = legacyDefaults[ld];
                if (data.presets[oldKey] && !data.presets[DEF]) {
                    data.presets[DEF] = data.presets[oldKey];
                    delete data.presets[oldKey];
                    if (data.activePreset === oldKey) data.activePreset = DEF;
                }
            }

            // Ensure [Default] exists
            if (!data.presets[DEF]) {
                data.presets[DEF] = GM.Config.getDefaults();
            }

            // Ensure activePreset is valid
            if (!data.presets[data.activePreset]) {
                data.activePreset = DEF;
            }

            // MIGRATION 3: per-preset value migrations + forward-fill
            var dflt = GM.Config.getDefaults();
            for (var pk in data.presets) {
                if (!data.presets.hasOwnProperty(pk)) continue;
                data.presets[pk] = GM.Storage.migratePreset(data.presets[pk]);
                for (var dk in dflt) {
                    if (dflt.hasOwnProperty(dk) && typeof data.presets[pk][dk] === "undefined") {
                        data.presets[pk][dk] = dflt[dk];
                    }
                }
            }

            return data;
        } catch (e) {
            GM.Utils.log("Storage.load failed: " + e.message);
            return null;
        }
    }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/storage.js
git commit -m "feat: add GM.Storage module (load/save/migrate extracted from config)"
```

---

### Task 7: Create `src/lib/validation.js` — GM.Validation with rules

**Files:**
- Create: `src/lib/validation.js`

Rules-based validation extracted from `GM.Main.validate()`. Follows ZSM pattern: `rules` object + `validate()` that returns `{valid, settings}`.

- [ ] **Step 1: Create src/lib/validation.js**

```javascript
// ------------------------------------------------------------------------
// Module: GM.Validation — rules-based input validation
// Part of: Illustrator Grommet Marks
//
// Pure validation logic decoupled from ScriptUI. Numeric checks use
// a shared validateNumber helper. Can be tested in Node without Illustrator.
//
// Depends on: GM.L (error messages)
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Validation = {
    rules: {
        offsetX:      { min: 0,    max: 9999, integer: false },
        offsetY:      { min: 0,    max: 9999, integer: false },
        markSize:     { min: 0.01, max: 9999, integer: false },
        strokeWeight: { min: 0.01, max: 100,  integer: false },
        edgeCount:    { min: 1,    max: 9999, integer: true  },
        edgeSpacing:  { min: 0.01, max: 9999, integer: false }
    },

    /**
     * Validates a numeric value against a rule.
     * Normalizes Czech decimal separator (comma -> dot).
     * @param {string|number} val - Raw value.
     * @param {Object} rule - {min, max, integer}.
     * @param {string} label - Display name for error messages.
     * @param {Object} L - Locale object (GM.L).
     * @returns {number|null} Parsed number or null if invalid.
     */
    validateNumber: function (val, rule, label, L) {
        var str = String(val).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
        var n = (str === "") ? NaN : Number(str);
        if (isNaN(n)) {
            alert(L.format(L.ERR_MUST_BE_NUMBER || "%s must be a number!", label));
            return null;
        }
        if (rule.integer && n !== Math.floor(n)) {
            alert(L.format(L.ERR_MUST_BE_INTEGER || "%s must be a whole number!", label));
            return null;
        }
        if (n < rule.min || n > rule.max) {
            alert(L.format(L.ERR_OUT_OF_RANGE || "%s must be between %s and %s!", label, rule.min, rule.max));
            return null;
        }
        return n;
    },

    /**
     * Validates the full gathered configuration.
     * Returns {valid: true, settings} or {valid: false, settings: null}.
     *
     * Unlike the old GM.Main.validate() which returned a string error,
     * this returns a structured result and shows alerts inline.
     *
     * @param {Object} cfg - Raw config from gatherAll().
     * @param {Object} L - Locale object.
     * @returns {Object} {valid: boolean, settings: Object|null}
     */
    validate: function (cfg, L) {
        if (!cfg) return { valid: false, settings: null };
        var rules = GM.Validation.rules;
        var vn = GM.Validation.validateNumber;

        // Numeric fields
        var offsetX = vn(cfg.offsetX, rules.offsetX, L.OFFSET_X || "Offset X", L);
        if (offsetX === null) return { valid: false, settings: null };

        var offsetY = vn(cfg.offsetY, rules.offsetY, L.OFFSET_Y || "Offset Y", L);
        if (offsetY === null) return { valid: false, settings: null };

        var markSize = vn(cfg.markSize, rules.markSize, L.SIZE_LABEL || "Mark size", L);
        if (markSize === null) return { valid: false, settings: null };

        var strokeWeight = cfg.strokeWeight;
        if (cfg.strokeEnabled) {
            strokeWeight = vn(cfg.strokeWeight, rules.strokeWeight, L.WEIGHT || "Stroke weight", L);
            if (strokeWeight === null) return { valid: false, settings: null };
        }

        // Appearance check
        if (!cfg.fillEnabled && !cfg.strokeEnabled) {
            alert(L.ERR_NO_APPEARANCE);
            return { valid: false, settings: null };
        }

        // Edge enabled check (accounting for mirrors)
        var topOn = cfg.top.enabled;
        var leftOn = cfg.left.enabled;
        var bottomOn = cfg.bottomMirror ? topOn : cfg.bottom.enabled;
        var rightOn = cfg.rightMirror ? leftOn : cfg.right.enabled;
        if (!topOn && !leftOn && !bottomOn && !rightOn) {
            alert(L.ERR_NO_EDGE);
            return { valid: false, settings: null };
        }

        // Validate non-mirrored enabled edges
        var edgeKeys = ["top", "left"];
        if (!cfg.bottomMirror) edgeKeys.push("bottom");
        if (!cfg.rightMirror) edgeKeys.push("right");

        for (var i = 0; i < edgeKeys.length; i++) {
            var e = cfg[edgeKeys[i]];
            if (!e.enabled) continue;
            if (e.useNumber) {
                var cnt = vn(e.number, rules.edgeCount, L.COUNT || "Count", L);
                if (cnt === null) return { valid: false, settings: null };
            } else {
                var spc = vn(e.spacing, rules.edgeSpacing, L.SPACING || "Spacing", L);
                if (spc === null) return { valid: false, settings: null };
            }
        }

        // Build clean settings (parsed numbers replace raw strings)
        var settings = GM.Utils.deepCopy(cfg);
        settings.offsetX = offsetX;
        settings.offsetY = offsetY;
        settings.markSize = markSize;
        if (cfg.strokeEnabled) settings.strokeWeight = strokeWeight;

        return { valid: true, settings: settings };
    }
};
```

- [ ] **Step 2: Add locale keys for validation error messages**

Add these keys to both EN and CS string tables in `src/locale.js` (in the Errors section):

EN:
```javascript
ERR_MUST_BE_NUMBER: "%s must be a number!",
ERR_MUST_BE_INTEGER: "%s must be a whole number!",
ERR_OUT_OF_RANGE: "%s must be between %s and %s!",
```

CS:
```javascript
ERR_MUST_BE_NUMBER: "%s musí být číslo!",
ERR_MUST_BE_INTEGER: "%s musí být celé číslo!",
ERR_OUT_OF_RANGE: "%s musí být mezi %s a %s!",
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/validation.js src/locale.js
git commit -m "feat: add GM.Validation module (rules-based validation extracted from main)"
```

---

### Task 8: Create `src/lib/ui_state.js` — GM.UIState

**Files:**
- Create: `src/lib/ui_state.js`

Pure state-transition logic for presets. Extracted from `ui.js` onClick handlers. Testable without ScriptUI. Follows the ZSM.UIState API exactly.

- [ ] **Step 1: Create src/lib/ui_state.js**

```javascript
// ------------------------------------------------------------------------
// Module: GM.UIState — pure preset state-transition logic
// Part of: Illustrator Grommet Marks
//
// Extracted from ScriptUI event handlers so it can be unit-tested without
// a real dialog. The dialog (ui.js) wires these to button onClick handlers;
// everything UI-specific (alerts, prompts, control updates) stays in ui.js.
//
// Depends on: GM.Utils (presetEquals), GM.Config (PRESET_KEY_DEFAULT)
// ------------------------------------------------------------------------
var GM = GM || {};

GM.UIState = {
    PRESET_KEY_DEFAULT: "[Default]",
    PRESET_KEY_LAST:    "[Last Settings]",

    /**
     * Validates a preset name.
     * @param {string} rawName - User-entered name.
     * @returns {string|null} Trimmed name, or null if invalid/reserved.
     */
    validatePresetName: function (rawName) {
        var name = String(rawName == null ? "" : rawName).replace(/^\s+|\s+$/g, "");
        if (!name) return null;
        if (name === this.PRESET_KEY_DEFAULT || name === this.PRESET_KEY_LAST) return null;
        return name;
    },

    /**
     * Returns true if the active preset has unsaved changes.
     * @param {Object} pData - Preset wrapper {activePreset, presets}.
     * @param {Object} currentValues - Current UI values.
     * @returns {boolean}
     */
    isModified: function (pData, currentValues) {
        if (!pData || !currentValues) return false;
        var preset = pData.presets[pData.activePreset];
        if (!preset) return false;
        return !GM.Utils.presetEquals(currentValues, preset);
    },

    /**
     * Builds dropdown list data: ordered keys with display text + modified indicator.
     * @param {Object} pData - Preset wrapper.
     * @param {Object} currentValues - Current UI values.
     * @param {Object} L - Locale (for [Default] display).
     * @returns {Array} [{key, displayText, isActive, isModified}, ...]
     */
    formatPresetList: function (pData, currentValues, L) {
        L = L || {};
        var defaultDisplay = L.DEFAULT_PRESET || this.PRESET_KEY_DEFAULT;
        var DEF = this.PRESET_KEY_DEFAULT;
        var keys = [];
        for (var k in pData.presets) {
            if (pData.presets.hasOwnProperty(k) && k !== this.PRESET_KEY_LAST) keys.push(k);
        }
        keys.sort(function (a, b) {
            if (a === DEF) return -1;
            if (b === DEF) return 1;
            return a < b ? -1 : (a > b ? 1 : 0);
        });

        var modified = this.isModified(pData, currentValues);

        var result = [];
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var displayText = (key === DEF) ? defaultDisplay : key;
            var isActive = (key === pData.activePreset);
            if (isActive && modified) displayText += " *";
            result.push({
                key: key,
                displayText: displayText,
                isActive: isActive,
                isModified: isActive && modified
            });
        }
        return result;
    },

    /**
     * Save current UI values to the active named preset.
     * If active is [Default] or [Last Settings], returns needs-name.
     * @param {Object} pData - Preset wrapper (mutated).
     * @param {Object} currentValues - UI values to save.
     * @returns {Object} {ok, reason?}
     */
    save: function (pData, currentValues) {
        if (!pData || !currentValues) return { ok: false, reason: "missing-input" };
        var active = pData.activePreset;
        if (active === this.PRESET_KEY_DEFAULT || active === this.PRESET_KEY_LAST || !active) {
            return { ok: false, reason: "needs-name" };
        }
        pData.presets[active] = currentValues;
        return { ok: true };
    },

    /**
     * Save current UI values as a new (or replacing existing) named preset.
     * @param {Object} pData - Preset wrapper (mutated).
     * @param {string} name - New preset name (raw user input).
     * @param {Object} currentValues - UI values.
     * @param {Function} confirmOverwrite - Optional callback (returns bool).
     * @returns {Object} {ok, reason?, name?}
     */
    saveAs: function (pData, name, currentValues, confirmOverwrite) {
        if (!pData || !currentValues) return { ok: false, reason: "missing-input" };
        var clean = this.validatePresetName(name);
        if (!clean) return { ok: false, reason: "invalid-name" };
        if (pData.presets[clean]) {
            if (typeof confirmOverwrite === "function" && !confirmOverwrite(clean)) {
                return { ok: false, reason: "user-cancelled" };
            }
        }
        pData.presets[clean] = currentValues;
        pData.activePreset = clean;
        return { ok: true, name: clean };
    },

    /**
     * Delete the active preset (cannot delete [Default] or [Last Settings]).
     * On success, activePreset reverts to [Default].
     * @param {Object} pData - Preset wrapper (mutated).
     * @returns {Object} {ok, reason?}
     */
    deleteActive: function (pData) {
        if (!pData) return { ok: false, reason: "missing-input" };
        var active = pData.activePreset;
        if (active === this.PRESET_KEY_DEFAULT || active === this.PRESET_KEY_LAST) {
            return { ok: false, reason: "reserved" };
        }
        if (!pData.presets[active]) return { ok: false, reason: "not-found" };
        delete pData.presets[active];
        pData.activePreset = this.PRESET_KEY_DEFAULT;
        return { ok: true };
    },

    /**
     * Switch to a different preset.
     * @param {Object} pData - Preset wrapper (mutated).
     * @param {string} name - Target preset key.
     * @returns {Object} {ok, settings?, reason?}
     */
    selectPreset: function (pData, name) {
        if (!pData) return { ok: false, reason: "missing-input" };
        if (!pData.presets[name]) return { ok: false, reason: "not-found" };
        pData.activePreset = name;
        return { ok: true, settings: pData.presets[name] };
    }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ui_state.js
git commit -m "feat: add GM.UIState module (preset CRUD logic extracted from ui)"
```

---

### Task 9: Update `tools/build.sh` — new module load order + version from package.json

**Files:**
- Modify: `tools/build.sh`

Update the concatenation list to include `lib/` modules in dependency order. Read VERSION from `package.json` (ZSM pattern). Update header. Add `set -euo pipefail`.

- [ ] **Step 1: Rewrite tools/build.sh**

```bash
#!/bin/bash
# ===========================================================================
# Script:      build.sh
# Version:     4.0.0
# Author:      Osva1d
# Updated:     2026-05-25
#
# Description:
#   Concatenates Grommet Marks source modules into production script.
#   Build order: polyfills -> constants -> locale -> lib/utils -> config ->
#                lib/storage -> lib/validation -> lib/ui_state -> core ->
#                illustrator -> ui -> main
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
cat "$SRC_DIR/core.js"               >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/illustrator.js"        >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/ui.js"                 >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/main.js"               >> "$OUTPUT"

echo "" >> "$OUTPUT"
echo "})();" >> "$OUTPUT"

LINES=$(wc -l < "$OUTPUT" | tr -d ' ')
echo "Build complete: $OUTPUT ($LINES lines)"
```

- [ ] **Step 2: Run build to verify**

```bash
cd /Users/ladislavosvald/Dev/Sandbox/_incubator/grommet-marks && npm run build
```

Expected: `Build complete: dist/illustrator-grommet-marks.jsx (NNN lines)` — the script will be bigger now due to new modules, but must not error.

- [ ] **Step 3: Commit**

```bash
git add tools/build.sh
git commit -m "refactor: update build.sh with new lib/ modules and package.json version"
```

---

### Task 10: Write test suite — `tests/test_core_math.js`

**Files:**
- Create: `tests/test_core_math.js`

Tests for `GM.Core.calcPositions()`, `GM.Core.convertVal()`, and `GM.Core.round()`. Loads the real `src/core.js` via eval (ZSM pattern).

- [ ] **Step 1: Create tests/test_core_math.js**

```javascript
#!/usr/bin/env node
/**
 * GM.Core Math Test Suite
 * Runs outside Illustrator (pure JS) — validates geometry calculations.
 *
 * Usage: node tests/test_core_math.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
var GM = {};

GM.CONSTANTS = {
    UNIT_FACTORS: {
        "mm": 2.834645669291339,
        "cm": 28.34645669291339,
        "in": 72
    }
};

// ===== LOAD PRODUCTION CODE =====
var corePath = path.join(__dirname, "..", "src", "core.js");
eval(fs.readFileSync(corePath, "utf8"));

// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;

function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}

function assertClose(a, b, tol, msg) {
    total++;
    if (Math.abs(a - b) <= tol) { pass++; }
    else { fail++; console.log("  FAIL: " + msg + " (got " + a + ", expected " + b + ")"); }
}

// ===== TESTS: GM.Core.round =====
console.log("--- GM.Core.round ---");

assert(GM.Core.round(1.0000001) === 1, "round: removes float noise");
assert(GM.Core.round(3.141593) === 3.141593, "round: preserves 6 decimals");
assert(GM.Core.round(0) === 0, "round: zero");

// ===== TESTS: GM.Core.convertVal =====
console.log("--- GM.Core.convertVal ---");

assertClose(GM.Core.convertVal(25.4, "mm", "in"), 1, 0.001, "convertVal: 25.4mm = 1in");
assertClose(GM.Core.convertVal(1, "in", "mm"), 25.4, 0.001, "convertVal: 1in = 25.4mm");
assertClose(GM.Core.convertVal(10, "mm", "cm"), 1, 0.0001, "convertVal: 10mm = 1cm");
assertClose(GM.Core.convertVal(1, "cm", "mm"), 10, 0.0001, "convertVal: 1cm = 10mm");
assert(GM.Core.convertVal(42, "mm", "mm") === 42, "convertVal: identity mm->mm");
assert(GM.Core.convertVal(42, "in", "in") === 42, "convertVal: identity in->in");

// ===== TESTS: GM.Core.calcPositions =====
console.log("--- GM.Core.calcPositions ---");

var mmFactor = GM.CONSTANTS.UNIT_FACTORS["mm"];

// Fixed count: 10 marks, 7mm offset, on a 1000pt span
(function () {
    var edge = { useNumber: true, number: 10, spacing: 0 };
    var pos = GM.Core.calcPositions(edge, 1000, 7, mmFactor);
    assert(pos.length === 10, "calcPositions: fixed count returns 10 marks");
    assertClose(pos[0], 7 * mmFactor, 0.01, "calcPositions: first mark at offset");
    assert(pos[9] <= 1000, "calcPositions: last mark within span");
})();

// Fixed count: 1 mark
(function () {
    var edge = { useNumber: true, number: 1, spacing: 0 };
    var pos = GM.Core.calcPositions(edge, 500, 10, mmFactor);
    assert(pos.length === 1, "calcPositions: single mark");
    assertClose(pos[0], 10 * mmFactor, 0.01, "calcPositions: single mark at offset");
})();

// Preferred spacing
(function () {
    var edge = { useNumber: false, number: 1, spacing: 50 };
    var pos = GM.Core.calcPositions(edge, 1000, 0, mmFactor);
    assert(pos.length > 1, "calcPositions: spacing mode produces multiple marks");
    // All positions should be within span
    for (var i = 0; i < pos.length; i++) {
        assert(pos[i] >= 0 && pos[i] <= 1000, "calcPositions: pos[" + i + "] within span");
    }
})();

// Zero span edge case
(function () {
    var edge = { useNumber: true, number: 5, spacing: 0 };
    var pos = GM.Core.calcPositions(edge, 0, 0, mmFactor);
    assert(pos.length === 5, "calcPositions: zero span still returns marks");
})();

// Very small spacing (safety cap)
(function () {
    var edge = { useNumber: false, number: 1, spacing: 0.001 };
    var pos = GM.Core.calcPositions(edge, 10000, 0, mmFactor);
    assert(pos.length <= 9999, "calcPositions: safety cap prevents freeze");
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
```

- [ ] **Step 2: Run the test**

```bash
cd /Users/ladislavosvald/Dev/Sandbox/_incubator/grommet-marks && node tests/test_core_math.js
```

Expected: All tests pass, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add tests/test_core_math.js
git commit -m "test: add core math test suite (calcPositions, convertVal, round)"
```

---

### Task 11: Write test suite — `tests/test_storage_migrations.js`

**Files:**
- Create: `tests/test_storage_migrations.js`

Tests for `GM.Storage.load()` migration chain. Uses mock File/Folder objects (ZSM pattern).

- [ ] **Step 1: Create tests/test_storage_migrations.js**

```javascript
#!/usr/bin/env node
/**
 * GM.Storage Migration Test Suite
 * Tests Storage.load() against various legacy data shapes.
 *
 * Coverage:
 *   - Migration 1: flat {__default__: ...} -> wrapper {activePreset, presets}
 *   - Migration 2: __default__ -> [Default] key rename
 *   - Migration 3: v2 per-edge offsets -> v3 global
 *   - Migration 4: v3.0 localized strings -> v3.1 internal keys
 *   - Migration 5: localized [Výchozí] -> [Default]
 *   - Forward-fill new default keys
 *   - Empty/corrupt/missing file
 *
 * Usage: node tests/test_storage_migrations.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
var GM = {};

// Mock virtual file system
var mockFS = {};
var SETTINGS_PATH = "/mock/userData/GrommetMarks/GrommetMarksSettings.json";

function MockFolder(p) { this.fsName = p; }
MockFolder.userData = "/mock/userData";
Object.defineProperty(MockFolder.prototype, "exists", {
    get: function () { return true; }
});
MockFolder.prototype.create = function () { return true; };
global.Folder = MockFolder;

function MockFile(p) {
    this.fsName = p;
    this._path = p;
    this.encoding = "UTF-8";
    this._mode = null;
    this._buffer = "";
}
Object.defineProperty(MockFile.prototype, "exists", {
    get: function () { return mockFS.hasOwnProperty(this._path); }
});
MockFile.prototype.open = function (mode) {
    this._mode = mode;
    if (mode === "w") this._buffer = "";
    return true;
};
MockFile.prototype.read = function () {
    return mockFS[this._path] || "";
};
MockFile.prototype.write = function (s) { this._buffer += s; };
MockFile.prototype.close = function () {
    if (this._mode === "w") mockFS[this._path] = this._buffer;
};
global.File = MockFile;

global.alert = function () {};
global.$ = { writeln: function () {} };

// ===== LOAD PRODUCTION CODE =====
eval(fs.readFileSync(path.join(__dirname, "..", "src", "constants.js"), "utf8"));

// Stub locale (needed by storage error paths)
GM.L = { ERR_WRITE_SETTINGS: "Cannot write settings file." };

eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "config.js"), "utf8"));

// JSON polyfill (in case Node version is ancient, unlikely but safe)
eval(fs.readFileSync(path.join(__dirname, "..", "src", "polyfills", "json2.js"), "utf8"));

eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "storage.js"), "utf8"));

// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;

function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}

function setup(content) {
    mockFS = {};
    if (content !== undefined) {
        mockFS[SETTINGS_PATH] = typeof content === "string" ? content : JSON.stringify(content);
    }
}

// ===== TESTS =====
console.log("--- Migration: no file -> null ---");
(function () {
    setup();
    var result = GM.Storage.load();
    assert(result === null, "no file returns null");
})();

console.log("--- Migration: empty file -> null ---");
(function () {
    setup("");
    var result = GM.Storage.load();
    assert(result === null, "empty file returns null");
})();

console.log("--- Migration: corrupt JSON -> null ---");
(function () {
    setup("{broken json!!!}");
    var result = GM.Storage.load();
    assert(result === null, "corrupt JSON returns null");
})();

console.log("--- Migration 1: flat -> wrapper ---");
(function () {
    var flat = {};
    flat["__default__"] = GM.Config.getDefaults();
    flat["MyPreset"] = GM.Config.getDefaults();
    flat["MyPreset"].markSize = 5;
    setup(flat);

    var result = GM.Storage.load();
    assert(result !== null, "flat: load succeeds");
    assert(result.presets !== undefined, "flat: has presets key");
    assert(result.activePreset === "[Default]", "flat: activePreset is [Default]");
    assert(result.presets["[Default]"] !== undefined, "flat: [Default] preset exists");
    assert(result.presets["MyPreset"] !== undefined, "flat: user preset preserved");
    assert(result.presets["MyPreset"].markSize === 5, "flat: user preset values preserved");
})();

console.log("--- Migration 2: __default__ -> [Default] ---");
(function () {
    var data = { activePreset: "__default__", presets: {} };
    data.presets["__default__"] = GM.Config.getDefaults();
    setup(data);

    var result = GM.Storage.load();
    assert(result.presets["[Default]"] !== undefined, "sentinel: [Default] exists");
    assert(result.presets["__default__"] === undefined, "sentinel: __default__ removed");
    assert(result.activePreset === "[Default]", "sentinel: activePreset updated");
})();

console.log("--- Migration 3: localized [Výchozí] -> [Default] ---");
(function () {
    var data = { activePreset: "[Výchozí]", presets: {} };
    data.presets["[Výchozí]"] = GM.Config.getDefaults();
    setup(data);

    var result = GM.Storage.load();
    assert(result.presets["[Default]"] !== undefined, "localized: [Default] exists");
    assert(result.presets["[Výchozí]"] === undefined, "localized: old key removed");
    assert(result.activePreset === "[Default]", "localized: activePreset updated");
})();

console.log("--- Migration: v2 per-edge offsets -> v3 global ---");
(function () {
    var preset = GM.Config.getDefaults();
    delete preset.offsetX;
    delete preset.offsetY;
    preset.top.x = 12;
    preset.top.y = 15;
    var data = { activePreset: "[Default]", presets: { "[Default]": preset } };
    setup(data);

    var result = GM.Storage.load();
    assert(result.presets["[Default]"].offsetX === 12, "v2: offsetX from top.x");
    assert(result.presets["[Default]"].offsetY === 15, "v2: offsetY from top.y");
    assert(result.presets["[Default]"].top.x === undefined, "v2: top.x removed");
    assert(result.presets["[Default]"].top.y === undefined, "v2: top.y removed");
})();

console.log("--- Migration: v3.0 localized units -> v3.1 internal keys ---");
(function () {
    var preset = GM.Config.getDefaults();
    preset.units = "Milimetry";
    var data = { activePreset: "[Default]", presets: { "[Default]": preset } };
    setup(data);

    var result = GM.Storage.load();
    assert(result.presets["[Default]"].units === "mm", "units: Milimetry -> mm");
})();

console.log("--- Migration: v3.0 localized sentinels -> __create__ ---");
(function () {
    var preset = GM.Config.getDefaults();
    preset.fillSwatchName = "[Create 'Grommet Marks']";
    var data = { activePreset: "[Default]", presets: { "[Default]": preset } };
    setup(data);

    var result = GM.Storage.load();
    assert(result.presets["[Default]"].fillSwatchName === "__create__",
        "sentinel: localized -> __create__");
})();

console.log("--- Forward-fill: new keys added to old presets ---");
(function () {
    var preset = { offsetX: 5, offsetY: 5, units: "mm", markSize: 2 };
    // Missing most keys — forward-fill should add them from getDefaults()
    var data = { activePreset: "[Default]", presets: { "[Default]": preset } };
    setup(data);

    var result = GM.Storage.load();
    var p = result.presets["[Default]"];
    assert(p.isRound === true, "forward-fill: isRound added from defaults");
    assert(p.fillEnabled === true, "forward-fill: fillEnabled added");
    assert(p.top !== undefined, "forward-fill: top edge added");
    assert(p.markSize === 2, "forward-fill: existing value preserved");
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
```

- [ ] **Step 2: Run the test**

```bash
cd /Users/ladislavosvald/Dev/Sandbox/_incubator/grommet-marks && node tests/test_storage_migrations.js
```

Expected: All tests pass, exit code 0.

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/ladislavosvald/Dev/Sandbox/_incubator/grommet-marks && npm test
```

Expected: `ALL SUITES PASSED`

- [ ] **Step 4: Commit**

```bash
git add tests/test_storage_migrations.js
git commit -m "test: add storage migration test suite"
```

---

### Task 12: Update `src/main.js` — delegate validation to GM.Validation, use GM.Storage

**Files:**
- Modify: `src/main.js`

Remove `validate()` method (now in `lib/validation.js`). Update `run()` to use `GM.Storage` instead of `GM.Config` for load/save. Add `[Last Settings]` auto-save on Generate. Add namespace guard and module header.

- [ ] **Step 1: Rewrite src/main.js**

```javascript
// ------------------------------------------------------------------------
// Module: GM.Main — entry point and artboard processing loop
// Part of: Illustrator Grommet Marks
// Depends on: GM.Illustrator, GM.Storage, GM.Validation, GM.Core, GM.UI, GM.Config
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Main = {
    run: function () {
        if (!GM.Illustrator.init()) {
            alert(GM.L.ERR_NO_DOC);
            return;
        }

        var pData = GM.Storage.load();
        if (!pData) {
            pData = {
                activePreset: GM.Config.PRESET_KEY_DEFAULT,
                presets: {}
            };
            pData.presets[GM.Config.PRESET_KEY_DEFAULT] = GM.Config.getDefaults();
        }

        var layerInfo = GM.Illustrator.getLayerNames();
        var swatchInfo = GM.Illustrator.getSwatchNames();

        var ui = GM.UI.buildDialog(pData, layerInfo, swatchInfo);

        if (ui.window.show() !== 1) return;

        var cfg = ui.gatherAll();

        var result = GM.Validation.validate(cfg, GM.L);
        if (!result.valid) return;

        // Auto-save [Last Settings]
        pData.presets[GM.Storage.PRESET_KEY_LAST] = result.settings;
        GM.Storage.save(pData);

        GM.Main.process(result.settings);

        app.redraw();
    },

    process: function (cfg) {
        try {
            var doc = GM.Illustrator.doc;

            var topCfg = cfg.top;
            var leftCfg = cfg.left;
            var bottomCfg = cfg.bottomMirror ? topCfg : cfg.bottom;
            var rightCfg = cfg.rightMirror ? leftCfg : cfg.right;

            var topOn = topCfg.enabled;
            var leftOn = leftCfg.enabled;
            var bottomOn = cfg.bottomMirror ? topOn : bottomCfg.enabled;
            var rightOn = cfg.rightMirror ? leftOn : rightCfg.enabled;

            var unitFactor = GM.CONSTANTS.UNIT_FACTORS[cfg.units];
            var targetLayer = GM.Illustrator.getOrCreateLayer(cfg.markLayerName);
            if (!targetLayer) {
                alert(GM.L.format(GM.L.ERR_LAYER_NOT_FOUND, cfg.markLayerName));
                return;
            }

            var fillColor = cfg.fillEnabled ? GM.Illustrator.getOrCreateSwatch(cfg.fillSwatchName) : null;
            var strokeColor = cfg.strokeEnabled ? GM.Illustrator.getOrCreateSwatch(cfg.strokeSwatchName) : null;

            if (cfg.fillEnabled && !fillColor) {
                alert(GM.L.format(GM.L.ERR_SWATCH_NOT_FOUND, cfg.fillSwatchName));
                return;
            }
            if (cfg.strokeEnabled && !strokeColor) {
                alert(GM.L.format(GM.L.ERR_SWATCH_NOT_FOUND, cfg.strokeSwatchName));
                return;
            }

            var markSizePoints = cfg.markSize * unitFactor;
            var radius = markSizePoints / 2;

            var offX = cfg.offsetX;
            var offY = cfg.offsetY;

            var placed = {};
            function place(x, y) {
                var key = Math.round(x * 10) / 10 + "|" + Math.round(y * 10) / 10;
                if (placed[key]) return;
                placed[key] = true;
                GM.Illustrator.placeMark(
                    targetLayer, x, y, radius, markSizePoints,
                    cfg.isRound, fillColor, strokeColor, cfg
                );
            }

            for (var i = 0; i < doc.artboards.length; i++) {
                var ab = doc.artboards[i];
                var r = ab.artboardRect;
                var abLeft = r[0], abTop = r[1], abRight = r[2], abBottom = r[3];
                var abWidth = abRight - abLeft;
                var abHeight = abTop - abBottom;

                if (topOn) {
                    var tPositions = GM.Core.calcPositions(topCfg, abWidth, offX, unitFactor);
                    var tY = abTop - (offY * unitFactor);
                    for (var ti = 0; ti < tPositions.length; ti++) {
                        place(abLeft + tPositions[ti], tY);
                    }
                }

                if (bottomOn) {
                    var bPositions = GM.Core.calcPositions(bottomCfg, abWidth, offX, unitFactor);
                    var bY = abBottom + (offY * unitFactor);
                    for (var bi = 0; bi < bPositions.length; bi++) {
                        place(abLeft + bPositions[bi], bY);
                    }
                }

                if (leftOn) {
                    var lPositions = GM.Core.calcPositions(leftCfg, abHeight, offY, unitFactor);
                    var lX = abLeft + (offX * unitFactor);
                    for (var li = 0; li < lPositions.length; li++) {
                        place(lX, abTop - lPositions[li]);
                    }
                }

                if (rightOn) {
                    var rPositions = GM.Core.calcPositions(rightCfg, abHeight, offY, unitFactor);
                    var rX = abRight - (offX * unitFactor);
                    for (var ri = 0; ri < rPositions.length; ri++) {
                        place(rX, abTop - rPositions[ri]);
                    }
                }
            }
        } catch (e) {
            alert(GM.CONSTANTS.SCRIPT_NAME + ": " + GM.L.ERR_UNEXPECTED + " — " + e.message);
        }
    }
};

// Run
GM.Main.run();
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/ladislavosvald/Dev/Sandbox/_incubator/grommet-marks && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "refactor: main.js delegates to GM.Validation and GM.Storage"
```

---

### Task 13: Rewrite `src/ui.js` — delegate preset logic to GM.UIState, add new UI elements

**Files:**
- Modify: `src/ui.js`

This is the largest task. The dialog structure stays the same (layout changes are cycle 2), but:
1. `buildDialog()` signature changes: receives `pData` (wrapper) instead of flat `allSettings`
2. Preset handlers delegate to `GM.UIState.*`
3. Add Save As button, Reset button, modified indicator, live validation, copyright footer, version in title
4. Add namespace guard and module header

- [ ] **Step 1: Rewrite src/ui.js**

The file is large. Key changes to `buildDialog()`:

**Signature change:**
```javascript
// Old: buildDialog: function (allSettings, layerInfo, swatchInfo)
// New:
buildDialog: function (pData, layerInfo, swatchInfo)
```

**Settings panel** — add Save As button:
```javascript
var saveBtn = setPanel.add("button", undefined, GM.L.SAVE);
saveBtn.helpTip = GM.L.TIP_SAVE;
var saveAsBtn = setPanel.add("button", undefined, GM.L.BTN_SAVE_AS);
saveAsBtn.helpTip = GM.L.TIP_SAVE_AS;
var deleteBtn = setPanel.add("button", undefined, GM.L.DELETE);
deleteBtn.enabled = false;
```

**Title with version:**
```javascript
var dlg = new Window("dialog", GM.CONSTANTS.SCRIPT_NAME + " v" + GM.CONSTANTS.VERSION);
```

**Footer — Reset button (left-aligned) + copyright:**
```javascript
// Copyright footer
var grpCopy = dlg.add("group");
grpCopy.alignment = ["fill", "top"];
var stCopy = grpCopy.add("statictext", undefined,
    "© 2025–2026 Osva1d — " + GM.CONSTANTS.SCRIPT_NAME + " v" + GM.CONSTANTS.VERSION);
stCopy.enabled = false;

// Action buttons
var footerGrp = dlg.add("group");
footerGrp.alignment = ["fill", "center"];
footerGrp.spacing = 8;

var resetBtn = footerGrp.add("button", undefined, GM.L.BTN_RESET);
resetBtn.helpTip = GM.L.TIP_RESET;
resetBtn.alignment = ["left", "center"];

var spacer = footerGrp.add("group");
spacer.alignment = ["fill", "fill"];

footerGrp.add("button", undefined, GM.L.CANCEL, { name: "cancel" });
footerGrp.add("button", undefined, GM.L.OK, { name: "ok" });
```

**Preset handlers** — delegate to `GM.UIState`:

```javascript
// Modified indicator refresh
function refreshModifiedIndicator() {
    var modified;
    try { modified = GM.UIState.isModified(pData, gatherAll()); } catch (e) { modified = false; }
    try { saveBtn.enabled = modified; } catch (e) {}

    if (!loadDDL.selection) return;
    var idx = loadDDL.selection.index;
    var key = sortedKeys[idx];
    if (key !== pData.activePreset) return;
    var displayText = (key === GM.Config.PRESET_KEY_DEFAULT) ? GM.L.DEFAULT_PRESET : key;
    if (modified) displayText += " *";
    try { loadDDL.items[idx].text = displayText; } catch (e) {
        updatePresetList();
    }
}

function updatePresetList() {
    loadDDL.removeAll();
    var entries = GM.UIState.formatPresetList(pData, gatherAll(), GM.L);
    sortedKeys = [];
    var selIdx = 0;
    for (var i = 0; i < entries.length; i++) {
        loadDDL.add("item", entries[i].displayText);
        sortedKeys.push(entries[i].key);
        if (entries[i].isActive) selIdx = i;
    }
    if (loadDDL.items.length > 0) loadDDL.selection = selIdx;
    deleteBtn.enabled = (pData.activePreset !== GM.Config.PRESET_KEY_DEFAULT);
}

// Load initial values from [Last Settings] or active preset
var initPreset = pData.presets[GM.Storage.PRESET_KEY_LAST] || pData.presets[pData.activePreset];
if (initPreset) applyAll(initPreset);
updatePresetList();

loadDDL.onChange = function () {
    if (!loadDDL.selection) return;
    var key = sortedKeys[loadDDL.selection.index];
    if (!key || key === pData.activePreset) return;
    var r = GM.UIState.selectPreset(pData, key);
    if (!r.ok) return;
    deleteBtn.enabled = (key !== GM.Config.PRESET_KEY_DEFAULT);
    applyAll(r.settings);
    refreshModifiedIndicator();
};

saveBtn.onClick = function () {
    var r = GM.UIState.save(pData, gatherAll());
    if (r.ok) {
        updatePresetList();
        try { GM.Storage.save(pData); } catch (e) {}
        return;
    }
    if (r.reason === "needs-name") saveAsBtn.onClick();
};

saveAsBtn.onClick = function () {
    var raw = prompt(GM.L.PROMPT_SAVE_AS, "");
    if (raw === null || raw === "") return;
    var clean = GM.UIState.validatePresetName(raw);
    if (!clean) { alert(GM.L.ERR_RESERVED_NAME); return; }
    var r = GM.UIState.saveAs(pData, raw, gatherAll(), function () {
        return confirm(GM.L.ERR_PRESET_EXISTS);
    });
    if (!r.ok) return;
    updatePresetList();
    refreshModifiedIndicator();
    try { GM.Storage.save(pData); } catch (e) {}
};

deleteBtn.onClick = function () {
    var r = GM.UIState.deleteActive(pData);
    if (!r.ok) {
        if (r.reason === "reserved") alert(GM.L.ERR_CANNOT_DELETE_DEFAULT);
        return;
    }
    updatePresetList();
    applyAll(pData.presets[GM.Config.PRESET_KEY_DEFAULT]);
    refreshModifiedIndicator();
    try { GM.Storage.save(pData); } catch (e) {}
};

resetBtn.onClick = function () {
    applyAll(GM.Config.getDefaults());
    refreshModifiedIndicator();
};
```

**Live validation** — add after all controls are created:

```javascript
var numericFields = [offsetXIn, offsetYIn, sizeInput];
if (weightInput) numericFields.push(weightInput);

function liveValidateAll() {
    var allValid = true;
    for (var i = 0; i < numericFields.length; i++) {
        var et = numericFields[i];
        if (!et.enabled) continue;
        var str = String(et.text || "").replace(/,/g, ".");
        var n = parseFloat(str);
        var valid = !isNaN(n) && n >= 0;
        try {
            var g = et.graphics;
            if (g && g.newPen) {
                var color = valid
                    ? g.newPen(g.PenType.SOLID_COLOR, [0.0, 0.0, 0.0, 1.0], 1)
                    : g.newPen(g.PenType.SOLID_COLOR, [0.85, 0.0, 0.0, 1.0], 1);
                g.foregroundColor = color;
            }
        } catch (e) {}
        if (!valid) allValid = false;
    }
    // OK button reference depends on where it's created — use the named button
    return allValid;
}

// Wire onChange/onChanging to all numeric edittexts
var allEdits = [offsetXIn, offsetYIn, sizeInput, weightInput];
for (var ei = 0; ei < allEdits.length; ei++) {
    if (!allEdits[ei]) continue;
    allEdits[ei].onChange = function () { refreshModifiedIndicator(); liveValidateAll(); };
    allEdits[ei].onChanging = function () { refreshModifiedIndicator(); liveValidateAll(); };
}
```

The full rewrite will be done as a complete file replacement. The key structural change is that `buildDialog` now receives `pData` (wrapper format) and all preset logic uses `GM.UIState`.

- [ ] **Step 2: Verify build**

```bash
cd /Users/ladislavosvald/Dev/Sandbox/_incubator/grommet-marks && npm run build
```

- [ ] **Step 3: Run tests (should still pass — ui.js has no tests yet)**

```bash
cd /Users/ladislavosvald/Dev/Sandbox/_incubator/grommet-marks && npm test
```

Expected: `ALL SUITES PASSED`

- [ ] **Step 4: Commit**

```bash
git add src/ui.js
git commit -m "refactor: ui.js delegates preset logic to GM.UIState, adds Save As/Reset/live validation"
```

---

### Task 14: Add namespace guards to remaining files + module headers

**Files:**
- Modify: `src/core.js`
- Modify: `src/illustrator.js`

Add `var GM = GM || {};` and module header block to the two files that don't have new versions yet.

- [ ] **Step 1: Add namespace guard and header to src/core.js**

Prepend:
```javascript
// ------------------------------------------------------------------------
// Module: GM.Core — geometry and math (pure, no DOM)
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS
// ------------------------------------------------------------------------
var GM = GM || {};
```

- [ ] **Step 2: Add namespace guard and header to src/illustrator.js**

Prepend:
```javascript
// ------------------------------------------------------------------------
// Module: GM.Illustrator — Adobe Illustrator DOM adapter
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS, GM.L
// ------------------------------------------------------------------------
var GM = GM || {};
```

- [ ] **Step 3: Verify build and tests**

```bash
cd /Users/ladislavosvald/Dev/Sandbox/_incubator/grommet-marks && npm run verify
```

Expected: Build succeeds, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/core.js src/illustrator.js
git commit -m "chore: add namespace guards and module headers to core.js, illustrator.js"
```

---

### Task 15: Final build, full test run, and version verification

**Files:**
- Modify: `docs/ARCHITECTURE.md` (update to reflect v4.0 structure)

- [ ] **Step 1: Run full verify**

```bash
cd /Users/ladislavosvald/Dev/Sandbox/_incubator/grommet-marks && npm run verify
```

Expected: Build complete + ALL SUITES PASSED.

- [ ] **Step 2: Verify version consistency**

```bash
cd /Users/ladislavosvald/Dev/Sandbox/_incubator/grommet-marks && grep -r "4.0.0" package.json src/constants.js tools/build.sh
```

Expected: All three files show `4.0.0`.

- [ ] **Step 3: Verify dist file has correct header**

```bash
head -15 /Users/ladislavosvald/Dev/Sandbox/_incubator/grommet-marks/dist/illustrator-grommet-marks.jsx
```

Expected: Version `4.0.0` in the header.

- [ ] **Step 4: Update docs/ARCHITECTURE.md**

Update to reflect v4.0 module structure (new `lib/` directory, updated build order, new data format, new module responsibilities table). Keep existing sections but update their content.

- [ ] **Step 5: Commit**

```bash
git add docs/ARCHITECTURE.md dist/illustrator-grommet-marks.jsx
git commit -m "docs: update ARCHITECTURE.md for v4.0, rebuild dist"
```
