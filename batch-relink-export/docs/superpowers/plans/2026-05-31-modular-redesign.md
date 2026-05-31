# Batch Relink Export — Modular Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the monolithic `illustrator-batch-relink-export.jsx` into a modular ExtendScript project with ZSM/GM-consistent patterns, robust safety (layer/object unlock, relink verification, partial-sheet handling), cs/en locale, and template-based output naming.

**Architecture:** 5 source modules (`locale.js`, `config.js`, `core.js`, `ui.js`, `main.jsx`) concatenated by `tools/build.sh` into `dist/illustrator-batch-relink-export.jsx`. Namespace `BRE`. No polyfills needed. Build system mirrors GM/ZSM (version from `package.json`, parity guard, UTF-8 BOM).

**Tech Stack:** ExtendScript (ES3), ScriptUI, bash (build), Node.js (version read only)

**Spec:** `docs/superpowers/specs/2026-05-31-modular-redesign-design.md`

**Reference projects:**
- ZSM: `~/Dev/Sandbox/_incubator/zund-summa-marks/` (namespace, locale, session management, build)
- GM: `~/Dev/Sandbox/_incubator/grommet-marks/` (build.sh template, IIFE wrapper)

---

## File structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/locale.js` | `BRE.L` — cs/en string tables, auto-detection, `format()` |
| Create | `src/config.js` | `BRE.Config` — namespace init, version, constants |
| Create | `src/core.js` | `BRE.Core` — session mgmt, relink, verify, countPdfPages, buildOutputName |
| Create | `src/ui.js` | `BRE.UI` — main dialog, dry-run preview, progress, summary |
| Create | `src/main.jsx` | Entry point (IIFE) |
| Create | `tools/build.sh` | Build script |
| Create | `package.json` | Version, metadata, `npm run build` |
| Modify | `README.md` | Update for v3.0.0 modular structure |
| Delete | `illustrator-impose-pdf.jsx` | Dead development |
| Delete | `illustrator-batch-relink-export.jsx` | Replaced by `dist/` output |

---

### Task 1: Scaffold project structure and build system

**Files:**
- Create: `package.json`
- Create: `tools/build.sh`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "batch-relink-export",
  "version": "3.0.0",
  "private": true,
  "description": "Batch PDF relinking and export for Illustrator templates",
  "scripts": {
    "build": "bash tools/build.sh"
  }
}
```

Write to `package.json` in the project root.

- [ ] **Step 2: Create `tools/build.sh`**

```bash
#!/bin/bash
# ===========================================================================
# Script:      build.sh
# Version:     3.0.0
# Author:      Osva1d
# Updated:     2026-05-31
#
# Description:
#   Concatenates Batch Relink Export source modules into a single production .jsx.
#
# Module load order (dependencies must come first):
#   locale.js -> config.js -> core.js -> ui.js -> main.jsx
# ===========================================================================

set -euo pipefail

SLUG="batch-relink-export"
SCRIPT_NAME="illustrator-${SLUG}.jsx"
HUMAN_NAME="Illustrator Batch Relink Export"
VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0-dev")"
DESCRIPTION="Batch PDF relinking and export for Illustrator templates."
DIST_DIR="dist"
SRC_DIR="src"

SRC_VERSION="$(sed -n 's/.*version:[[:space:]]*"\([^"]*\)".*/\1/p' "$SRC_DIR/config.js" | head -1)"
if [ "$SRC_VERSION" != "$VERSION" ]; then
    echo "ERROR: version drift — package.json=$VERSION but src/config.js version=$SRC_VERSION" >&2
    echo "       Sync the 'version' constant in src/config.js with package.json before building." >&2
    exit 1
fi

mkdir -p "$DIST_DIR"
OUTPUT="$DIST_DIR/$SCRIPT_NAME"

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

EOF

cat "$SRC_DIR/locale.js"  >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/config.js"  >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/core.js"    >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/ui.js"      >> "$OUTPUT" && echo "" >> "$OUTPUT"
cat "$SRC_DIR/main.jsx"   >> "$OUTPUT"

LINES=$(wc -l < "$OUTPUT" | tr -d ' ')
echo "Build complete: $OUTPUT ($LINES lines)"
```

Make executable: `chmod +x tools/build.sh`

- [ ] **Step 3: Create empty `src/` and `dist/` directories**

```bash
mkdir -p src dist
```

- [ ] **Step 4: Commit scaffold**

```bash
git add package.json tools/build.sh
git commit -m "chore: scaffold modular project structure with build system"
```

---

### Task 2: Create locale module (`src/locale.js`)

**Files:**
- Create: `src/locale.js`

- [ ] **Step 1: Write `src/locale.js`**

This module must NOT have a UTF-8 BOM (the build script adds it to the dist file).

```js
// ------------------------------------------------------------------------
// Module: BRE.L — Localization
// Part of: Illustrator Batch Relink Export v3.0.0
// ------------------------------------------------------------------------

var BRE = BRE || {};

BRE.L = (function () {
    var lang = "en";
    try {
        if (app.locale) lang = app.locale.substring(0, 2).toLowerCase();
    } catch (e) {}

    var strings = {
        en: {
            // --- Errors ---
            ERR_CRITICAL:       "CRITICAL ERROR: ",
            ERR_TEMPLATE:       "Invalid AI template.",
            ERR_SOURCE:         "Source folder does not exist.",
            ERR_OUTPUT_ASK:     "Output folder does not exist. Create it?",
            ERR_OUTPUT_FAIL:    "Failed to create output folder.",
            ERR_PRESET:         "You must select a PDF Preset.",
            ERR_NO_PDF:         "No PDF files found in the selected folder.",
            ERR_NO_LINKS:       "No linked objects found in the template.",
            ERR_NO_RELINK:      "No linked PDF objects found for relinking.",
            ERR_PROCESS:        "Error processing",
            ERR_RELINK_VERIFY:  "Relink verification failed for item %s: expected '%s', got '%s'.",
            ERR_HIDDEN_LAYER:   "PlacedItem on hidden layer skipped: %s",
            ERR_RELINK_ITEM:    "Failed to relink item %s: %s",
            ERR_NAMING_PATTERN: "Naming pattern must contain {n} placeholder.",

            // --- UI: Title & Panels ---
            TITLE:              "Batch Relink Export",
            PANEL_INPUT:        "Input Files",
            PANEL_CONFIG:       "Export Configuration",

            // --- UI: Labels ---
            LBL_TEMPLATE:       "Template (.ai)",
            LBL_SOURCE:         "Source folder (PDF)",
            LBL_OUTPUT:         "Output folder",
            LBL_NAMING:         "Naming pattern",
            LBL_PRESET:         "PDF Preset",

            // --- UI: Placeholders ---
            PH_TEMPLATE:        "Path to template file…",
            PH_SOURCE:          "Path to PDF source folder…",
            PH_OUTPUT:          "Path for exported files…",

            // --- UI: Buttons ---
            BTN_BROWSE:         "Browse…",
            BTN_RUN:            "Run",
            BTN_CANCEL:         "Cancel",
            BTN_CLOSE:          "Close",
            BTN_STOP:           "Stop",
            BTN_CONTINUE:       "Continue",

            // --- UI: Checkboxes ---
            CB_SKIP:            "Skip existing files",
            CB_OPEN_FOLDER:     "Open output folder when done",

            // --- UI: Help Tips ---
            TIP_TEMPLATE:       "Illustrator template file (.ai) with linked PDF",
            TIP_TEMPLATE_BTN:   "Select template file",
            TIP_SOURCE:         "Folder containing source PDF files",
            TIP_SOURCE_BTN:     "Select source folder",
            TIP_OUTPUT:         "Destination folder for exported PDF files",
            TIP_OUTPUT_BTN:     "Select output folder",
            TIP_NAMING:         "Output filename pattern. {n} = number, {template} = template name, {source} = source PDF name",
            TIP_PRESET:         "PDF quality profile for export",
            TIP_SKIP:           "Skip processing if output file already exists",
            TIP_OPEN:           "Open output folder in system file manager after completion",

            // --- UI: File Dialogs ---
            BROWSE_FOLDER:      "Select folder:",
            BROWSE_FILE:        "Select file:",

            // --- Preview ---
            PREVIEW_TITLE:      "Processing Preview",
            PREVIEW_TEMPLATE:   "Template: %s (%s positions)",
            PREVIEW_SOURCE:     "Source PDFs: %s files",
            PREVIEW_SAMPLE:     "Sample output: %s",
            PREVIEW_PARTIAL:    "Last file (%s) has %s pages — %s positions will be removed from the last sheet.",

            // --- Progress ---
            PROGRESS_TITLE:     "Processing files…",
            PROGRESS_INIT:      "Preparing…",
            PROGRESS_FILE:      "Processing: %s (%s of %s)",

            // --- Log ---
            LOG_TITLE:          "Processing Result",
            LOG_SUCCESS:        "Successful",
            LOG_ERRORS:         "Errors",
            LOG_SKIPPED:        "Skipped",
            LOG_REMOVED:        "Removed positions",
            LOG_ALL_OK:         "All completed without errors.",
            LOG_DETAILS:        "Error and warning details",
            LOG_CANCELLED:      "Cancelled by user after processing %s of %s files.",
            SKIP_MSG:           "Skipped (file exists)"
        },

        cs: {
            // --- Chyby ---
            ERR_CRITICAL:       "KRITICKÁ CHYBA: ",
            ERR_TEMPLATE:       "Neplatná šablona AI.",
            ERR_SOURCE:         "Zdrojová složka neexistuje.",
            ERR_OUTPUT_ASK:     "Výstupní složka neexistuje. Vytvořit?",
            ERR_OUTPUT_FAIL:    "Nepodařilo se vytvořit výstupní složku.",
            ERR_PRESET:         "Musíte vybrat PDF Preset.",
            ERR_NO_PDF:         "Ve vybrané složce nebyly nalezeny žádné PDF soubory.",
            ERR_NO_LINKS:       "V šabloně nebyly nalezeny žádné propojené objekty.",
            ERR_NO_RELINK:      "Žádný propojený PDF objekt nebyl nalezen k relinkování.",
            ERR_PROCESS:        "Chyba při zpracování",
            ERR_RELINK_VERIFY:  "Ověření relinku selhalo pro položku %s: očekáváno ‘%s’, nalezeno ‘%s’.",
            ERR_HIDDEN_LAYER:   "PlacedItem na skryté vrstvě přeskočen: %s",
            ERR_RELINK_ITEM:    "Nepodařilo se relinkovat položku %s: %s",
            ERR_NAMING_PATTERN: "Vzor pojmenování musí obsahovat placeholder {n}.",

            // --- UI: Nadpis a panely ---
            TITLE:              "Dávkové zpracování PDF",
            PANEL_INPUT:        "Vstupní soubory",
            PANEL_CONFIG:       "Konfigurace exportu",

            // --- UI: Popisky ---
            LBL_TEMPLATE:       "Šablona (.ai)",
            LBL_SOURCE:         "Zdrojová složka (PDF)",
            LBL_OUTPUT:         "Výstupní složka",
            LBL_NAMING:         "Vzor pojmenování",
            LBL_PRESET:         "PDF Preset",

            // --- UI: Placeholdery ---
            PH_TEMPLATE:        "Cesta k souboru šablony…",
            PH_SOURCE:          "Cesta ke složce s PDF…",
            PH_OUTPUT:          "Cesta pro uložení exportů…",

            // --- UI: Tlačítka ---
            BTN_BROWSE:         "Vybrat…",
            BTN_RUN:            "Spustit",
            BTN_CANCEL:         "Zrušit",
            BTN_CLOSE:          "Zavřít",
            BTN_STOP:           "Storno",
            BTN_CONTINUE:       "Pokračovat",

            // --- UI: Checkboxy ---
            CB_SKIP:            "Přeskočit existující soubory",
            CB_OPEN_FOLDER:     "Po dokončení otevřít výstupní složku",

            // --- UI: Nápovědy ---
            TIP_TEMPLATE:       "Soubor šablony Illustrator (.ai) s propojeným PDF",
            TIP_TEMPLATE_BTN:   "Vybrat soubor šablony",
            TIP_SOURCE:         "Složka obsahující zdrojové PDF soubory",
            TIP_SOURCE_BTN:     "Vybrat zdrojovou složku",
            TIP_OUTPUT:         "Cílová složka pro exportované PDF",
            TIP_OUTPUT_BTN:     "Vybrat výstupní složku",
            TIP_NAMING:         "Vzor názvu výstupu. {n} = číslo, {template} = název šablony, {source} = název zdrojového PDF",
            TIP_PRESET:         "Profil kvality PDF pro export",
            TIP_SKIP:           "Pokud výstupní soubor již existuje, přeskočí se",
            TIP_OPEN:           "Po dokončení otevře výstupní složku v systému",

            // --- UI: Dialogy souborů ---
            BROWSE_FOLDER:      "Vyberte složku:",
            BROWSE_FILE:        "Vyberte soubor:",

            // --- Náhled ---
            PREVIEW_TITLE:      "Náhled zpracování",
            PREVIEW_TEMPLATE:   "Šablona: %s (%s pozic)",
            PREVIEW_SOURCE:     "Zdrojové PDF: %s souborů",
            PREVIEW_SAMPLE:     "Vzor výstupu: %s",
            PREVIEW_PARTIAL:    "Poslední soubor (%s) má %s stran — %s pozic bude odebráno z posledního archu.",

            // --- Průběh ---
            PROGRESS_TITLE:     "Zpracování souborů…",
            PROGRESS_INIT:      "Připravuji…",
            PROGRESS_FILE:      "Zpracovávám: %s (%s z %s)",

            // --- Log ---
            LOG_TITLE:          "Výsledek zpracování",
            LOG_SUCCESS:        "Úspěšně",
            LOG_ERRORS:         "Chyby",
            LOG_SKIPPED:        "Přeskočeno",
            LOG_REMOVED:        "Odebrané pozice",
            LOG_ALL_OK:         "Vše proběhlo bez chyb.",
            LOG_DETAILS:        "Detaily chyb a varování",
            LOG_CANCELLED:      "Zrušeno uživatelem po zpracování %s z %s souborů.",
            SKIP_MSG:           "Přeskočeno (soubor existuje)"
        }
    };

    var active = strings[lang] || strings["en"];

    active.format = function (template) {
        var args = [];
        for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
        var idx = 0;
        return template.replace(/%s/g, function () {
            return idx < args.length ? String(args[idx++]) : "%s";
        });
    };

    return active;
})();
```

- [ ] **Step 2: Commit**

```bash
git add src/locale.js
git commit -m "feat: add BRE.L locale module with cs/en string tables"
```

---

### Task 3: Create config module (`src/config.js`)

**Files:**
- Create: `src/config.js`

- [ ] **Step 1: Write `src/config.js`**

```js
// ------------------------------------------------------------------------
// Module: BRE.Config — Configuration
// Part of: Illustrator Batch Relink Export v3.0.0
// ------------------------------------------------------------------------

var BRE = BRE || {};

BRE.Config = {
    scriptName: "Batch Relink Export",
    version: "3.0.0",
    debug: false,

    ui: {
        title: null,
        labelWidth: 160,
        fieldWidth: 300,
        dropdownWidth: 200,
        namingWidth: 160,
        dialogMargins: 20,
        dialogSpacing: 15,
        panelMargins: 15,
        panelSpacing: 10
    },

    presetSearchPatterns: ["High Quality", "Tisková kvalita"],

    artboardRange: "",

    defaultNamingPattern: "{n}_{template}",

    placeholders: {
        N: "{n}",
        TEMPLATE: "{template}",
        SOURCE: "{source}"
    }
};

BRE.Config.ui.title = BRE.Config.scriptName + " v" + BRE.Config.version;
```

- [ ] **Step 2: Verify build runs (will fail on missing modules — that's expected)**

```bash
npm run build
```

Expected: build fails because `src/core.js`, `src/ui.js`, `src/main.jsx` don't exist yet. This confirms the version parity guard works (version "3.0.0" matches in both files).

- [ ] **Step 3: Commit**

```bash
git add src/config.js
git commit -m "feat: add BRE.Config module with version, UI constants, and naming defaults"
```

---

### Task 4: Create core module (`src/core.js`)

**Files:**
- Create: `src/core.js`

This is the critical safety module. All operations that touch the Illustrator DOM or make irreversible changes live here.

- [ ] **Step 1: Write `src/core.js`**

```js
// ------------------------------------------------------------------------
// Module: BRE.Core — Session Management, Relink, Verification
// Part of: Illustrator Batch Relink Export v3.0.0
// ------------------------------------------------------------------------

var BRE = BRE || {};

BRE.Core = {

    _lockedLayers: [],
    _lockedItems: [],

    // ---------------------------------------------------------------------
    // Session management
    // ---------------------------------------------------------------------

    /**
     * Unlocks all locked layers and PlacedItems before processing.
     * Stores their state so endSession() can restore it.
     * @param {Document} doc - The active Illustrator document.
     */
    beginSession: function (doc) {
        this._lockedLayers = [];
        this._lockedItems = [];
        var i, layer, item;

        for (i = 0; i < doc.layers.length; i++) {
            layer = doc.layers[i];
            try {
                if (layer.locked) {
                    this._lockedLayers.push({ idx: i, name: layer.name });
                    layer.locked = false;
                }
            } catch (e) {
                this._log("beginSession: layer unlock failed — " + layer.name);
            }
        }

        for (i = 0; i < doc.placedItems.length; i++) {
            item = doc.placedItems[i];
            try {
                if (item.locked) {
                    this._lockedItems.push({ idx: i, name: item.name || ("item_" + i) });
                    item.locked = false;
                }
            } catch (e) {
                this._log("beginSession: item unlock failed — index " + i);
            }
        }
    },

    /**
     * Restores layer and item locks cleared by beginSession().
     * @param {Document} doc - The active Illustrator document.
     */
    endSession: function (doc) {
        var i, rec, lay;

        for (i = 0; i < this._lockedItems.length; i++) {
            try {
                rec = this._lockedItems[i];
                if (rec.idx < doc.placedItems.length) {
                    doc.placedItems[rec.idx].locked = true;
                }
            } catch (e) {}
        }

        for (i = 0; i < this._lockedLayers.length; i++) {
            try {
                rec = this._lockedLayers[i];
                lay = (rec.idx < doc.layers.length && doc.layers[rec.idx].name === rec.name)
                    ? doc.layers[rec.idx]
                    : doc.layers.getByName(rec.name);
                lay.locked = true;
            } catch (e) {}
        }

        this._lockedLayers = [];
        this._lockedItems = [];
    },

    // ---------------------------------------------------------------------
    // Relink pipeline
    // ---------------------------------------------------------------------

    /**
     * Relinks all PlacedItems in the document to the target PDF.
     * Removes PlacedItems whose pageNumber exceeds the source page count.
     *
     * @param {Document} doc - The active document.
     * @param {File} targetPdf - The PDF file to relink to.
     * @param {number} totalPages - Total pages in targetPdf (0 = unknown).
     * @returns {Object} { relinked, skipped, removed, warnings, errors }
     */
    relinkDocument: function (doc, targetPdf, totalPages) {
        var results = { relinked: 0, skipped: 0, removed: 0, warnings: [], errors: [] };
        var items = doc.placedItems;
        var i, item;

        for (i = 0; i < items.length; i++) {
            item = items[i];

            if (!item.file) {
                results.skipped++;
                continue;
            }

            if (this._isOnHiddenLayer(item)) {
                results.warnings.push(
                    BRE.L.format(BRE.L.ERR_HIDDEN_LAYER, item.name || ("item_" + i))
                );
                results.skipped++;
                continue;
            }

            if (totalPages > 0 && item.pageNumber && item.pageNumber > totalPages) {
                continue;
            }

            try {
                item.relink(targetPdf);
                results.relinked++;
            } catch (e) {
                results.errors.push(
                    BRE.L.format(BRE.L.ERR_RELINK_ITEM, item.name || ("item_" + i), e.message)
                );
            }
        }

        if (totalPages > 0) {
            for (i = items.length - 1; i >= 0; i--) {
                try {
                    if (items[i].pageNumber && items[i].pageNumber > totalPages) {
                        items[i].remove();
                        results.removed++;
                    }
                } catch (e) {
                    results.errors.push(
                        BRE.L.format(BRE.L.ERR_RELINK_ITEM, "remove_" + i, e.message)
                    );
                }
            }
        }

        return results;
    },

    // ---------------------------------------------------------------------
    // Relink verification
    // ---------------------------------------------------------------------

    /**
     * Verifies that all PlacedItems point to the expected PDF.
     * @param {Document} doc - The document to verify.
     * @param {File} expectedPdf - The expected linked file.
     * @returns {Object} { ok: boolean, errors: string[] }
     */
    verifyRelink: function (doc, expectedPdf) {
        var items = doc.placedItems;
        var errors = [];
        var expectedPath = expectedPdf.fsName;

        for (var i = 0; i < items.length; i++) {
            if (!items[i].file) continue;
            try {
                var actualPath = items[i].file.fsName;
                if (actualPath !== expectedPath) {
                    errors.push(
                        BRE.L.format(BRE.L.ERR_RELINK_VERIFY,
                            items[i].name || ("item_" + i), expectedPath, actualPath)
                    );
                }
            } catch (e) {
                errors.push(
                    BRE.L.format(BRE.L.ERR_RELINK_ITEM, items[i].name || ("item_" + i), e.message)
                );
            }
        }

        return { ok: errors.length === 0, errors: errors };
    },

    // ---------------------------------------------------------------------
    // PDF page count
    // ---------------------------------------------------------------------

    /**
     * Reads page count from PDF binary data.
     * Finds the highest /Count value in the page tree.
     * @param {File} pdfFile - The PDF file to inspect.
     * @returns {number} Page count, or 0 on failure.
     */
    countPdfPages: function (pdfFile) {
        try {
            pdfFile.encoding = "binary";
            if (!pdfFile.open("r")) return 0;
            var content = pdfFile.read();
            pdfFile.close();

            var maxCount = 0;
            var startIdx = 0;
            while (true) {
                var pos = content.indexOf("/Count ", startIdx);
                if (pos === -1) break;
                var numStr = "";
                for (var ci = pos + 7; ci < content.length && ci < pos + 17; ci++) {
                    var ch = content.charAt(ci);
                    if (ch >= "0" && ch <= "9") {
                        numStr += ch;
                    } else if (numStr.length > 0) {
                        break;
                    }
                }
                if (numStr.length > 0) {
                    var n = parseInt(numStr, 10);
                    if (n > maxCount) maxCount = n;
                }
                startIdx = pos + 1;
            }
            return maxCount;
        } catch (e) {
            this._log("countPdfPages failed: " + e.message);
            return 0;
        }
    },

    // ---------------------------------------------------------------------
    // Output naming
    // ---------------------------------------------------------------------

    /**
     * Builds output filename from a pattern with placeholder substitution.
     * @param {string} pattern - Naming pattern (e.g. "{n}_{template}").
     * @param {number} index - Zero-based file index.
     * @param {number} totalCount - Total number of files (for zero-padding).
     * @param {string} templateName - Template filename without extension.
     * @param {string} sourceName - Source PDF filename without extension.
     * @returns {string} Complete filename with .pdf extension.
     */
    buildOutputName: function (pattern, index, totalCount, templateName, sourceName) {
        var padLen = String(totalCount).length;
        if (padLen < 2) padLen = 2;
        var num = String(index + 1);
        while (num.length < padLen) num = "0" + num;

        var name = pattern;
        name = name.split("{n}").join(num);
        name = name.split("{template}").join(templateName);
        name = name.split("{source}").join(sourceName);
        return name + ".pdf";
    },

    /**
     * Strips file extension from a filename.
     * @param {string} filename - Filename with extension.
     * @returns {string} Filename without extension.
     */
    stripExtension: function (filename) {
        return filename.replace(/\.[^.]+$/, "");
    },

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /**
     * Checks whether an item resides on a hidden layer (or nested hidden parent).
     * @param {PlacedItem} item - The item to check.
     * @returns {boolean} True if any ancestor layer is hidden.
     */
    _isOnHiddenLayer: function (item) {
        try {
            var obj = item.layer;
            while (obj) {
                if (!obj.visible) return true;
                if (!obj.parent || obj.parent.typename !== "Layer") break;
                obj = obj.parent;
            }
        } catch (e) {}
        return false;
    },

    /**
     * Debug logger — writes to ExtendScript console when debug is enabled.
     * @param {string} msg - Message to log.
     */
    _log: function (msg) {
        if (BRE.Config && BRE.Config.debug) {
            $.writeln("[BRE] " + msg);
        }
    }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/core.js
git commit -m "feat: add BRE.Core module — session management, relink pipeline, verification, PDF page count"
```

---

### Task 5: Create UI module (`src/ui.js`)

**Files:**
- Create: `src/ui.js`

- [ ] **Step 1: Write `src/ui.js`**

```js
// ------------------------------------------------------------------------
// Module: BRE.UI — Dialog, Progress, Summary
// Part of: Illustrator Batch Relink Export v3.0.0
// ------------------------------------------------------------------------

var BRE = BRE || {};

BRE.UI = {

    // ---------------------------------------------------------------------
    // Main dialog
    // ---------------------------------------------------------------------

    /**
     * Shows the main configuration dialog.
     * Returns validated config object or null on cancel.
     * @returns {Object|null} Config with templateFile, sourceFolder, outputFolder,
     *          namingPattern, preset, skipExisting, openAfter, pdfFiles, templateName.
     */
    show: function () {
        var c = BRE.Config;
        var l = BRE.L;

        var dialog = new Window("dialog", c.ui.title);
        dialog.orientation = "column";
        dialog.alignChildren = ["fill", "top"];
        dialog.margins = c.ui.dialogMargins;
        dialog.spacing = c.ui.dialogSpacing;

        // --- Input panel ---
        var inputPanel = dialog.add("panel", undefined, l.PANEL_INPUT);
        inputPanel.orientation = "column";
        inputPanel.alignChildren = ["fill", "top"];
        inputPanel.margins = c.ui.panelMargins;
        inputPanel.spacing = c.ui.panelSpacing;

        var templatePath = this._addFileRow(inputPanel, l.LBL_TEMPLATE, l.PH_TEMPLATE,
            false, "*.ai", l.TIP_TEMPLATE, l.TIP_TEMPLATE_BTN);
        var sourcePath = this._addFileRow(inputPanel, l.LBL_SOURCE, l.PH_SOURCE,
            true, undefined, l.TIP_SOURCE, l.TIP_SOURCE_BTN);
        var outputPath = this._addFileRow(inputPanel, l.LBL_OUTPUT, l.PH_OUTPUT,
            true, undefined, l.TIP_OUTPUT, l.TIP_OUTPUT_BTN);

        // --- Config panel ---
        var configPanel = dialog.add("panel", undefined, l.PANEL_CONFIG);
        configPanel.orientation = "column";
        configPanel.alignChildren = ["fill", "top"];
        configPanel.margins = c.ui.panelMargins;
        configPanel.spacing = c.ui.panelSpacing;

        // Naming pattern
        var namingGrp = configPanel.add("group");
        namingGrp.alignChildren = ["left", "center"];
        var namingST = namingGrp.add("statictext", undefined, l.LBL_NAMING);
        namingST.preferredSize.width = c.ui.labelWidth;
        var namingInput = namingGrp.add("edittext", undefined, c.defaultNamingPattern);
        namingInput.preferredSize.width = c.ui.namingWidth;
        namingInput.helpTip = l.TIP_NAMING;

        // PDF Preset
        var presetGrp = configPanel.add("group");
        presetGrp.alignChildren = ["left", "center"];
        var presetST = presetGrp.add("statictext", undefined, l.LBL_PRESET);
        presetST.preferredSize.width = c.ui.labelWidth;
        var presetDDL = presetGrp.add("dropdownlist", undefined, []);
        presetDDL.preferredSize.width = c.ui.dropdownWidth;
        presetDDL.helpTip = l.TIP_PRESET;

        var pdfPresets = [];
        try { pdfPresets = app.PDFPresetsList; } catch (e) {
            pdfPresets = ["[High Quality Print]"];
        }
        for (var pi = 0; pi < pdfPresets.length; pi++) {
            presetDDL.add("item", pdfPresets[pi]);
        }
        if (pdfPresets.length > 0) {
            var defaultIdx = 0;
            for (var di = 0; di < pdfPresets.length; di++) {
                for (var sp = 0; sp < c.presetSearchPatterns.length; sp++) {
                    if (pdfPresets[di].indexOf(c.presetSearchPatterns[sp]) !== -1) {
                        defaultIdx = di;
                        break;
                    }
                }
                if (defaultIdx > 0) break;
            }
            presetDDL.selection = defaultIdx;
        }

        // Checkboxes
        var skipCB = configPanel.add("checkbox", undefined, l.CB_SKIP);
        skipCB.helpTip = l.TIP_SKIP;

        var openCB = configPanel.add("checkbox", undefined, l.CB_OPEN_FOLDER);
        openCB.value = true;
        openCB.helpTip = l.TIP_OPEN;

        // --- Footer ---
        var footerGrp = dialog.add("group");
        footerGrp.alignment = ["right", "center"];
        footerGrp.spacing = 8;
        footerGrp.add("button", undefined, l.BTN_CANCEL, { name: "cancel" });
        footerGrp.add("button", undefined, l.BTN_RUN, { name: "ok" });

        // --- Show dialog ---
        if (dialog.show() !== 1) return null;

        // --- Validation ---
        var templateFile = new File(templatePath.text);
        var sourceFolder = new Folder(sourcePath.text);
        var outputFolder = new Folder(outputPath.text);
        var preset = presetDDL.selection ? presetDDL.selection.text : "";
        var namingPattern = namingInput.text;
        var skipExisting = skipCB.value;
        var openAfter = openCB.value;

        if (!templateFile.exists || !/\.ai$/i.test(templateFile.name)) {
            alert(l.ERR_TEMPLATE);
            return null;
        }
        if (!sourceFolder.exists) {
            alert(l.ERR_SOURCE);
            return null;
        }
        if (!outputFolder.exists) {
            if (confirm(l.ERR_OUTPUT_ASK)) {
                if (!outputFolder.create()) {
                    alert(l.ERR_OUTPUT_FAIL);
                    return null;
                }
            } else {
                return null;
            }
        }
        if (!preset) {
            alert(l.ERR_PRESET);
            return null;
        }
        if (namingPattern.indexOf("{n}") === -1) {
            alert(l.ERR_NAMING_PATTERN);
            return null;
        }

        var pdfFiles = sourceFolder.getFiles(function (f) {
            return f instanceof File && /\.pdf$/i.test(f.name);
        });
        if (pdfFiles.length === 0) {
            alert(l.ERR_NO_PDF);
            return null;
        }

        // Sort PDF files alphabetically for deterministic numbering
        pdfFiles.sort(function (a, b) {
            var na = (a.displayName || decodeURI(a.name)).toLowerCase();
            var nb = (b.displayName || decodeURI(b.name)).toLowerCase();
            if (na < nb) return -1;
            if (na > nb) return 1;
            return 0;
        });

        var templateName = BRE.Core.stripExtension(
            templateFile.displayName || decodeURI(templateFile.name)
        );

        return {
            templateFile: templateFile,
            sourceFolder: sourceFolder,
            outputFolder: outputFolder,
            namingPattern: namingPattern,
            preset: preset,
            skipExisting: skipExisting,
            openAfter: openAfter,
            pdfFiles: pdfFiles,
            templateName: templateName
        };
    },

    // ---------------------------------------------------------------------
    // Dry-run preview
    // ---------------------------------------------------------------------

    /**
     * Shows a preview of what the script will do before processing begins.
     * @param {Object} config - Validated config from show().
     * @param {number} slotCount - Number of PlacedItems in the template.
     * @returns {boolean} True if user confirms, false if cancelled.
     */
    showPreview: function (config, slotCount) {
        var l = BRE.L;

        var sampleName = BRE.Core.buildOutputName(
            config.namingPattern, 0, config.pdfFiles.length,
            config.templateName,
            BRE.Core.stripExtension(config.pdfFiles[0].displayName || decodeURI(config.pdfFiles[0].name))
        );

        var dlg = new Window("dialog", l.PREVIEW_TITLE);
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.margins = 20;
        dlg.spacing = 10;

        var infoText = l.format(l.PREVIEW_TEMPLATE, config.templateName, String(slotCount))
            + "\n" + l.format(l.PREVIEW_SOURCE, String(config.pdfFiles.length))
            + "\n" + l.format(l.PREVIEW_SAMPLE, sampleName);

        // Check last file for partial sheet
        var lastPdf = config.pdfFiles[config.pdfFiles.length - 1];
        var lastPages = BRE.Core.countPdfPages(lastPdf);
        if (lastPages > 0 && lastPages < slotCount) {
            var lastName = lastPdf.displayName || decodeURI(lastPdf.name);
            infoText += "\n\n" + l.format(l.PREVIEW_PARTIAL,
                lastName, String(lastPages), String(slotCount - lastPages));
        }

        var infoST = dlg.add("statictext", undefined, infoText, { multiline: true });
        infoST.preferredSize.width = 500;

        var footerGrp = dlg.add("group");
        footerGrp.alignment = ["right", "center"];
        footerGrp.spacing = 8;
        footerGrp.add("button", undefined, l.BTN_CANCEL, { name: "cancel" });
        footerGrp.add("button", undefined, l.BTN_CONTINUE, { name: "ok" });

        return dlg.show() === 1;
    },

    // ---------------------------------------------------------------------
    // Progress palette
    // ---------------------------------------------------------------------

    /**
     * Creates and shows a progress palette.
     * @param {number} total - Total number of files.
     * @returns {Object} { win, statusText, bar, cancelled, update(i, name), close() }
     */
    createProgress: function (total) {
        var l = BRE.L;

        var dlg = new Window("palette", l.PROGRESS_TITLE, undefined, { closeButton: false });
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.margins = 15;
        dlg.spacing = 10;

        var statusText = dlg.add("statictext", undefined, l.PROGRESS_INIT);
        statusText.preferredSize.width = 450;
        var bar = dlg.add("progressbar", undefined, 0, total);
        bar.preferredSize.width = 450;

        var cancelled = false;
        var cancelBtn = dlg.add("button", undefined, l.BTN_STOP);
        cancelBtn.alignment = ["center", "center"];
        cancelBtn.onClick = function () { cancelled = true; };

        dlg.show();

        return {
            isCancelled: function () { return cancelled; },
            update: function (index, fileName) {
                statusText.text = l.format(l.PROGRESS_FILE,
                    fileName, String(index + 1), String(total));
                bar.value = index;
                dlg.update();
            },
            finish: function () {
                bar.value = total;
                dlg.update();
            },
            close: function () {
                try { dlg.close(); } catch (e) {}
            }
        };
    },

    // ---------------------------------------------------------------------
    // Summary log
    // ---------------------------------------------------------------------

    /**
     * Shows a summary dialog after processing completes.
     * @param {Object} results - { success, errors, skipped, removed, cancelled, total, log }
     */
    showSummary: function (results) {
        var l = BRE.L;

        var logWin = new Window("dialog", l.LOG_TITLE);
        logWin.orientation = "column";
        logWin.alignChildren = ["fill", "top"];
        logWin.margins = 20;
        logWin.spacing = 15;

        var summaryLine = l.LOG_SUCCESS + ": " + results.success
            + "   |   " + l.LOG_ERRORS + ": " + results.errors
            + "   |   " + l.LOG_SKIPPED + ": " + results.skipped;
        if (results.removed > 0) {
            summaryLine += "   |   " + l.LOG_REMOVED + ": " + results.removed;
        }
        if (results.cancelled) {
            var completed = results.success + results.errors + results.skipped;
            summaryLine += "\n" + l.format(l.LOG_CANCELLED,
                String(completed), String(results.total));
        }

        var summST = logWin.add("statictext", undefined, summaryLine, { multiline: true });
        summST.preferredSize.width = 500;

        if (results.log.length > 0) {
            var detailPanel = logWin.add("panel", undefined, l.LOG_DETAILS);
            detailPanel.alignChildren = ["fill", "fill"];
            detailPanel.margins = 15;
            var logBox = detailPanel.add("edittext", undefined, results.log.join("\n"),
                { multiline: true, scrolling: true, "readonly": true });
            logBox.preferredSize = [480, 200];
        } else {
            logWin.add("statictext", undefined, l.LOG_ALL_OK);
        }

        var closeGrp = logWin.add("group");
        closeGrp.alignment = ["right", "center"];
        closeGrp.spacing = 8;
        closeGrp.add("button", undefined, l.BTN_CLOSE, { name: "ok" });

        logWin.show();
    },

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /**
     * Adds a labeled file/folder row to a panel.
     * @returns {EditText} The text input element.
     */
    _addFileRow: function (parent, label, placeholder, isFolder, ext, tipField, tipBtn) {
        var l = BRE.L;
        var c = BRE.Config;

        var grp = parent.add("group");
        grp.alignChildren = ["left", "center"];
        var st = grp.add("statictext", undefined, label);
        st.preferredSize.width = c.ui.labelWidth;
        var et = grp.add("edittext", undefined, placeholder);
        et.preferredSize.width = c.ui.fieldWidth;
        if (tipField) et.helpTip = tipField;
        var btn = grp.add("button", undefined, l.BTN_BROWSE);
        if (tipBtn) btn.helpTip = tipBtn;
        btn.onClick = function () {
            var sel;
            if (isFolder) {
                sel = Folder.selectDialog(l.BROWSE_FOLDER);
            } else {
                sel = File.openDialog(l.BROWSE_FILE, ext);
            }
            if (sel) et.text = sel.fsName;
        };
        return et;
    }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/ui.js
git commit -m "feat: add BRE.UI module — main dialog, dry-run preview, progress, summary"
```

---

### Task 6: Create main entry point (`src/main.jsx`)

**Files:**
- Create: `src/main.jsx`

- [ ] **Step 1: Write `src/main.jsx`**

```js
(function (BRE) {
    try {
        var config = BRE.UI.show();
        if (!config) return;

        // Open template once to count PlacedItems for preview
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
        var slotCount = 0;
        try {
            var tplDoc = app.open(config.templateFile);
            slotCount = tplDoc.placedItems.length;
            tplDoc.close(SaveOptions.DONOTSAVECHANGES);
        } catch (e) {
            app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
            alert(BRE.L.ERR_TEMPLATE + "\n" + e.message);
            return;
        }
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;

        if (slotCount === 0) {
            alert(BRE.L.ERR_NO_LINKS);
            return;
        }

        if (!BRE.UI.showPreview(config, slotCount)) return;

        // Processing loop
        var results = {
            success: 0, errors: 0, skipped: 0, removed: 0,
            cancelled: false, total: config.pdfFiles.length, log: []
        };

        var progress = BRE.UI.createProgress(config.pdfFiles.length);
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
        var doc = null;

        try {
            for (var i = 0; i < config.pdfFiles.length; i++) {
                if (progress.isCancelled()) {
                    results.cancelled = true;
                    break;
                }

                var currentFile = config.pdfFiles[i];
                var sourceFileName = currentFile.displayName || decodeURI(currentFile.name);
                var sourceName = BRE.Core.stripExtension(sourceFileName);

                var outputName = BRE.Core.buildOutputName(
                    config.namingPattern, i, config.pdfFiles.length,
                    config.templateName, sourceName
                );
                var outputFile = new File(config.outputFolder.fsName + "/" + outputName);

                progress.update(i, outputName);

                // Skip existing
                if (config.skipExisting && outputFile.exists) {
                    results.skipped++;
                    results.log.push(sourceFileName + ": " + BRE.L.SKIP_MSG);
                    continue;
                }

                try {
                    doc = app.open(config.templateFile);
                    BRE.Core.beginSession(doc);

                    try {
                        var pageCount = BRE.Core.countPdfPages(currentFile);

                        var relinkResult = BRE.Core.relinkDocument(doc, currentFile, pageCount);

                        // Accumulate warnings and errors
                        var wi;
                        for (wi = 0; wi < relinkResult.warnings.length; wi++) {
                            results.log.push(outputName + ": " + relinkResult.warnings[wi]);
                        }
                        for (wi = 0; wi < relinkResult.errors.length; wi++) {
                            results.log.push(outputName + ": " + relinkResult.errors[wi]);
                        }
                        results.removed += relinkResult.removed;

                        if (relinkResult.relinked === 0) {
                            results.errors++;
                            results.log.push(outputName + ": " + BRE.L.ERR_NO_RELINK);
                            continue;
                        }

                        // Verify relink
                        var verification = BRE.Core.verifyRelink(doc, currentFile);
                        if (!verification.ok) {
                            results.errors++;
                            for (wi = 0; wi < verification.errors.length; wi++) {
                                results.log.push(outputName + ": " + verification.errors[wi]);
                            }
                            continue;
                        }

                        // Export PDF
                        var pdfOpts = new PDFSaveOptions();
                        try {
                            pdfOpts.pDFPreset = config.preset;
                        } catch (pe) {
                            pdfOpts.compatibility = PDFCompatibility.ACROBAT7;
                            pdfOpts.preserveEditability = false;
                        }
                        pdfOpts.saveMultipleArtboards = true;
                        pdfOpts.artboardRange = BRE.Config.artboardRange;

                        doc.saveAs(outputFile, pdfOpts);
                        results.success++;

                    } finally {
                        BRE.Core.endSession(doc);
                        try {
                            doc.close(SaveOptions.DONOTSAVECHANGES);
                        } catch (ce) {}
                        doc = null;
                    }

                } catch (e) {
                    results.errors++;
                    results.log.push(outputName + ": " + BRE.L.ERR_PROCESS + " (" + e.message + ")");
                    try {
                        if (doc) {
                            doc.close(SaveOptions.DONOTSAVECHANGES);
                            doc = null;
                        }
                    } catch (ce) {}
                }
            }

            progress.finish();

        } finally {
            app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
            progress.close();
        }

        // Summary
        BRE.UI.showSummary(results);

        if (config.openAfter && results.success > 0) {
            try { config.outputFolder.execute(); } catch (oe) {}
        }

    } catch (e) {
        try { app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS; } catch (x) {}
        alert(BRE.L.ERR_CRITICAL + e.message + " (line " + e.line + ")");
    }
})(BRE);
```

- [ ] **Step 2: Commit**

```bash
git add src/main.jsx
git commit -m "feat: add main.jsx entry point — processing loop with safety pipeline"
```

---

### Task 7: Build, verify, and clean up

**Files:**
- Delete: `illustrator-impose-pdf.jsx`
- Delete: `illustrator-batch-relink-export.jsx`
- Modify: `README.md`

- [ ] **Step 1: Run the build**

```bash
cd ~/Dev/Sandbox/_incubator/batch-relink-export && npm run build
```

Expected: `Build complete: dist/illustrator-batch-relink-export.jsx (N lines)`

- [ ] **Step 2: Verify BOM**

```bash
xxd dist/illustrator-batch-relink-export.jsx | head -1
```

Expected: first 3 bytes are `efbb bf` (UTF-8 BOM).

- [ ] **Step 3: Verify `#target illustrator` directive is present**

```bash
grep -n '#target illustrator' dist/illustrator-batch-relink-export.jsx
```

Expected: exactly one match, early in the file (after the header).

- [ ] **Step 4: Verify no ES3 violations**

```bash
grep -n 'const \|let \|=> \|`' src/*.js src/*.jsx
```

Expected: no matches.

- [ ] **Step 5: Delete old monolithic files**

```bash
rm illustrator-impose-pdf.jsx
rm illustrator-batch-relink-export.jsx
```

- [ ] **Step 6: Update `README.md`**

Replace the entire README with updated content reflecting the v3.0.0 modular structure:

```markdown
# Batch Relink & Export

Automatizace tiskové přípravy v Adobe Illustrator — hromadné relinkování PDF souborů do šablony a export.

## Stav

- **Typ:** Modulární ExtendScript (ES3)
- **Namespace:** `BRE`
- **Build:** `npm run build` (`tools/build.sh`)
- **Min. verze AI:** CC 2018 (v22) — vyžadováno pro `PlacedItem.pageNumber`

## Workflow

1. Vytvořte AI šablonu s propojenými PDF (stránky z vícestránkového PDF)
2. Oříznout maskou pokud je třeba, přidat řezací značky
3. Uložit šablonu
4. Rozdělit zdrojové PDF podle počtu pozic v šabloně (např. v Adobe Acrobat)
5. Spustit skript, vyplnit dialog, potvrdit náhled, hotovo

## Funkce

- Hromadné relinkování všech PlacedItems v šabloně
- Ověření relinku po každém souboru (verifikace cesty)
- Automatické odemknutí/obnovení zamčených vrstev a objektů
- Odstranění přebytečných pozic u neúplného posledního archu
- Detekce počtu stran PDF (binary read)
- Pojmenování výstupů ze šablony s {n} číslováním
- Dry-run náhled před zpracováním
- Skip existing pro crash recovery
- Lokalizace cs/en (auto-detekce)

## Vývoj

```
src/
├── locale.js      # BRE.L — lokalizace cs/en
├── config.js      # BRE.Config — verze, konstanty
├── core.js        # BRE.Core — session mgmt, relink, verifikace
├── ui.js          # BRE.UI — dialog, progress, souhrn
└── main.jsx       # Entry point
```

Build: `npm run build` → `dist/illustrator-batch-relink-export.jsx`

## Changelog

### v3.0.0 (2026-05)
- **BREAKING:** Modulární redesign (5 modulů, namespace BRE, build systém)
- **BREAKING:** Výstupní pojmenování změněno na pattern `{n}_{template}`
- **FEATURE:** Session management — automatické odemknutí/obnovení zamčených vrstev a objektů
- **FEATURE:** Relink verifikace po každém souboru
- **FEATURE:** Odstranění přebytečných pozic u neúplného archu
- **FEATURE:** Dry-run náhled před zpracováním
- **FEATURE:** Lokalizace cs/en
- **FEATURE:** Detekce počtu stran PDF
- **REFACTOR:** Smazán impose skript (slepý vývoj)

### v2.0.0 (2026-03)
- Původní monolit — hromadné relinkování s exportem
```

- [ ] **Step 7: Commit everything**

```bash
git add -A
git commit -m "feat: complete BRE v3.0.0 modular redesign

- Delete impose script (dead development)
- Delete old monolithic relink script (replaced by dist/ output)
- Update README for v3.0.0"
```

---

### Task 8: Final review

- [ ] **Step 1: Read the built dist file top-to-bottom and check:**

1. Header has correct version, author, date
2. `#target illustrator` present after header
3. All modules concatenated in correct order (locale → config → core → ui → main)
4. No duplicate namespace declarations that overwrite previous modules
5. No stray BOM characters mid-file
6. Czech strings render correctly (not mojibake)

- [ ] **Step 2: Verify all old files are gone**

```bash
ls *.jsx 2>/dev/null
```

Expected: no matches (all `.jsx` files now live in `dist/`).

- [ ] **Step 3: Verify dist exists and is reasonable size**

```bash
wc -l dist/illustrator-batch-relink-export.jsx
```

Expected: ~600–800 lines.
