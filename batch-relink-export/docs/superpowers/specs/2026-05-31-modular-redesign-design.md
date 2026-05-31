# Batch Relink Export — Modular Redesign

**Date:** 2026-05-31
**Status:** Approved
**Approach:** B (4–5 modules + build.sh)

## Context

`batch-relink-export` is a single-file ExtendScript script (~400 lines) that batch-relinks PDF files into an Illustrator template and exports each result as PDF. It works but fails under non-ideal conditions (locked layers, locked objects, hidden layers with PlacedItems) and lacks the structural patterns established in the reference projects ZSM and GM.

The companion script `illustrator-impose-pdf.jsx` is dead development and will be deleted. Its `countPdfPages()` function is the only reusable piece — it will be absorbed into the redesigned core module.

## Goals

1. **Reliability first** — the script processes hundreds of pages where manual verification is impractical and errors are expensive. Every relink must be verified, every edge case (locked layers, partial sheets, missing pages) handled explicitly.
2. **Style consistency** — match ZSM/GM patterns: namespace, module structure, build system, locale, code style.
3. **Template-based naming** — output files derive names from the template with a `{n}` placeholder for sequencing.
4. **Modular but proportional** — enough modules for clarity and testability, not more than the script's complexity warrants.

## Architecture

### Namespace: `BRE` (Batch Relink Export)

```
batch-relink-export/
├── src/
│   ├── locale.js      # BRE.L
│   ├── config.js      # BRE.Config
│   ├── core.js        # BRE.Core
│   ├── ui.js          # BRE.UI
│   └── main.jsx       # Entry point
├── dist/
│   └── illustrator-batch-relink-export.jsx
├── tools/
│   └── build.sh
├── package.json
└── README.md
```

**Build order:** `locale.js → config.js → core.js → ui.js → main.jsx`

No polyfills needed — the script uses only ES3-native methods.

### Module responsibilities

| Module | Namespace | Responsibility |
|--------|-----------|----------------|
| `locale.js` | `BRE.L` | String tables (cs/en), auto-detection via `app.locale`, `format()` helper for parameterized messages |
| `config.js` | `BRE.Config` | Namespace initialization (`var BRE = {};`), version constant (synced with package.json), runtime title, default preset search patterns |
| `core.js` | `BRE.Core` | Session management (layer/object unlock+restore), relink pipeline, relink verification, PDF page count detection, output name builder |
| `ui.js` | `BRE.UI` | Main dialog construction, input validation, dry-run preview, progress palette, summary log |
| `main.jsx` | — | Entry point: IIFE → open template → show UI → processing loop → export → cleanup in finally |

## Module details

### locale.js — `BRE.L`

Auto-detects Illustrator locale (`app.locale`) and selects cs or en string table. Structure identical to ZSM.L:

```js
var BRE = BRE || {};
BRE.L = (function () {
    var lang = "en";
    try { if (app.locale) lang = app.locale.substring(0, 2).toLowerCase(); } catch (e) {}
    var strings = { en: { ... }, cs: { ... } };
    var active = strings[lang] || strings["en"];
    active.format = function (template) { /* %s replacement */ };
    return active;
})();
```

Key string categories:
- Error messages (ERR_*)
- UI labels (LBL_*, PH_*, TIP_*)
- Button labels (BTN_*)
- Log messages (LOG_*)
- Validation messages (VAL_*)

### config.js — `BRE.Config`

```js
var BRE = BRE || {};
BRE.Config = {
    scriptName: "Batch Relink Export",
    version: "3.0.0",
    debug: false,
    ui: { title: null },
    presetSearchPatterns: ["High Quality", "Tisková kvalita"],
    artboardRange: "",   // empty = all artboards (advanced override)
    defaultNamingPattern: "{n}_{template}",
    placeholders: {
        N: "{n}",
        TEMPLATE: "{template}",
        SOURCE: "{source}"
    }
};
BRE.Config.ui.title = BRE.Config.scriptName + " v" + BRE.Config.version;
```

### core.js — `BRE.Core`

The critical module. All safety-sensitive operations live here.

#### Session management

```js
BRE.Core = {
    _lockedLayers: [],
    _lockedItems: [],

    beginSession: function (doc) {
        // 1. Unlock locked layers (store refs for restore)
        // 2. Unlock locked PlacedItems (store refs for restore)
        // 3. Warn if any PlacedItem is on a hidden layer (don't unhide)
    },

    endSession: function (doc) {
        // 1. Restore item locks from _lockedItems
        // 2. Restore layer locks from _lockedLayers
        // 3. Clear both arrays
        // Always called in finally block
    }
};
```

Layer unlock follows ZSM pattern: store `{idx, name}`, restore by index-then-name fallback. Item unlock stores `{layerIdx, itemIdx}` pairs.

#### Relink pipeline

```js
relinkDocument: function (doc, targetPdf, totalPagesInPdf) {
    var results = { relinked: 0, skipped: 0, removed: 0, errors: [] };
    var items = doc.placedItems;

    // Pass 1 (forward): relink items with valid pageNumber
    for (var i = 0; i < items.length; i++) {
        var item = items[i];

        // Skip non-linked items (embedded images, etc.)
        if (!item.file) {
            results.skipped++;
            continue;
        }

        // Check if item is on a hidden layer — warn and skip
        if (this._isOnHiddenLayer(item)) {
            results.errors.push(/* warning: item on hidden layer */);
            results.skipped++;
            continue;
        }

        // Skip items whose pageNumber exceeds source page count
        // (will be removed in pass 2)
        if (totalPagesInPdf > 0 && item.pageNumber
            && item.pageNumber > totalPagesInPdf) {
            continue;
        }

        // Relink
        try {
            item.relink(targetPdf);
            results.relinked++;
        } catch (e) {
            results.errors.push(/* error detail */);
        }
    }

    // Pass 2 (reverse, safe for removal): delete excess items
    if (totalPagesInPdf > 0) {
        for (var j = items.length - 1; j >= 0; j--) {
            if (items[j].pageNumber && items[j].pageNumber > totalPagesInPdf) {
                items[j].remove();
                results.removed++;
            }
        }
    }

    return results;
},

_isOnHiddenLayer: function (item) {
    try {
        var layer = item.layer;
        while (layer) {
            if (!layer.visible) return true;
            layer = layer.parent;
            if (layer.typename !== "Layer") break;
        }
    } catch (e) {}
    return false;
}
```

#### Relink verification

```js
verifyRelink: function (doc, expectedPdf) {
    var items = doc.placedItems;
    for (var i = 0; i < items.length; i++) {
        if (!items[i].file) continue;
        if (items[i].file.fsName !== expectedPdf.fsName) {
            return { ok: false, item: i, actual: items[i].file.fsName };
        }
    }
    return { ok: true };
}
```

#### PDF page count

Ported from `illustrator-impose-pdf.jsx`. Reads `/Count` values from PDF binary data to find the root page tree count.

```js
countPdfPages: function (pdfFile) {
    // Binary read, parse /Count values, return max
    // Returns 0 on failure (caller decides whether to warn or block)
}
```

#### Output name builder

```js
buildOutputName: function (pattern, index, totalCount, templateName, sourceName) {
    var padLen = String(totalCount).length;
    var num = String(index + 1);
    while (num.length < padLen) num = "0" + num;

    var name = pattern;
    name = name.split("{n}").join(num);
    name = name.split("{template}").join(templateName);
    name = name.split("{source}").join(sourceName);
    return name + ".pdf";
}
```

### ui.js — `BRE.UI`

#### Main dialog

```
┌─ Batch Relink Export v3.0.0 ────────────────────────┐
│                                                      │
│  ┌─ Vstupní soubory ─────────────────────────────┐  │
│  │  Šablona (.ai)      [_______________] [Vybrat] │  │
│  │  Zdrojová složka    [_______________] [Vybrat] │  │
│  │  Výstupní složka    [_______________] [Vybrat] │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌─ Konfigurace exportu ─────────────────────────┐  │
│  │  Vzor pojmenování   [{n}_{template}__]         │  │
│  │  PDF Preset         [▼ dropdown_____]          │  │
│  │  ☐ Přeskočit existující soubory                │  │
│  │  ☑ Po dokončení otevřít výstupní složku        │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│                           [Zrušit]  [Spustit]        │
└──────────────────────────────────────────────────────┘
```

Layout uses `preferredSize` (not pixel bounds) for DPI-safe rendering. Label widths: 160px. Field widths: 300px for paths, 200px for dropdown, 160px for naming pattern.

#### Dry-run preview

Shown as a confirmation dialog after clicking "Spustit" and before processing begins:

```
┌─ Náhled zpracování ──────────────────────────────────┐
│                                                       │
│  Šablona: vizitky-arch.ai (8 pozic)                  │
│  Zdrojové PDF: 25 souborů                            │
│  Vzor výstupu: 01_vizitky-arch.pdf                   │
│                                                       │
│  ⚠ Poslední soubor (page_25.pdf) má 3 strany         │
│    → 5 pozic bude odstraněno z posledního archu       │
│                                                       │
│                           [Zrušit]  [Pokračovat]      │
└───────────────────────────────────────────────────────┘
```

Preview includes:
- Template name + number of PlacedItem positions
- Count of source PDFs
- Sample output filename (first file)
- Warning for any PDF with fewer pages than positions
- Total estimated output files

#### Progress palette

```
┌─ Zpracování souborů… ────────────────────────────────┐
│  Zpracovávám: 03_vizitky-arch.pdf (3 z 25)          │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░               │
│                    [Storno]                            │
└───────────────────────────────────────────────────────┘
```

#### Summary log

Identical structure to current version, with added "Removed" counter for partial-sheet removals.

### main.jsx — Entry point

```js
(function (BRE) {
    try {
        // Validate environment
        if (app.documents.length > 0) {
            // Warn: open documents will not be affected, template opens separately
        }

        // Show main dialog — returns validated config or null on cancel
        var config = BRE.UI.show();
        if (!config) return;

        // Processing loop
        var results = { success: 0, errors: 0, skipped: 0, removed: 0, log: [] };
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

        try {
            for (var i = 0; i < config.pdfFiles.length; i++) {
                if (config.cancelled) break;

                // 1. Open template
                var doc = app.open(config.templateFile);

                // 2. Begin session (unlock layers + items)
                BRE.Core.beginSession(doc);

                try {
                    // 3. Count pages in source PDF
                    var pageCount = BRE.Core.countPdfPages(config.pdfFiles[i]);

                    // 4. Relink + remove excess
                    var relinkResult = BRE.Core.relinkDocument(
                        doc, config.pdfFiles[i], pageCount
                    );

                    // 5. Verify relink
                    var verification = BRE.Core.verifyRelink(doc, config.pdfFiles[i]);
                    if (!verification.ok) {
                        // Log error, skip export
                        throw new Error("Relink verification failed");
                    }

                    // 6. Export PDF
                    var outputName = BRE.Core.buildOutputName(
                        config.namingPattern, i, config.pdfFiles.length,
                        config.templateName, config.pdfFiles[i].displayName
                    );
                    // ... saveAs with PDFSaveOptions ...

                } finally {
                    // 7. End session (restore locks) + close without save
                    BRE.Core.endSession(doc);
                    doc.close(SaveOptions.DONOTSAVECHANGES);
                }
            }
        } finally {
            app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
        }

        // Show summary log
        BRE.UI.showSummary(results);

    } catch (e) {
        try { app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS; } catch (x) {}
        alert(BRE.L.ERR_CRITICAL + e.message + " (line " + e.line + ")");
    }
})(BRE);
```

## Build system

### tools/build.sh

Follows GM/ZSM pattern:
- Reads version from `package.json` (single source of truth)
- Version parity guard: checks `BRE.Config.version` in `src/config.js` matches
- UTF-8 BOM prefix
- Standard file header (Script/Version/Author/Updated/Description)
- `#target illustrator` directive
- Module concatenation in dependency order
- Line count report

### package.json

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

No npm dependencies. `package.json` exists solely for version management and `npm run build`.

## Safety guarantees

| Risk | Mitigation |
|------|-----------|
| Locked layers | `beginSession()` unlocks all, `endSession()` restores in `finally` |
| Locked objects | `beginSession()` unlocks PlacedItems, `endSession()` restores |
| Hidden layer with PlacedItem | Warning logged, item skipped (not relinked) |
| Relink fails silently | Post-relink verification checks every PlacedItem's `.file.fsName` |
| Source PDF has fewer pages than positions | Excess PlacedItems removed before export; warning logged |
| Template damaged | Document closed without save — template file always untouched |
| Crash mid-batch | "Skip existing" checkbox resumes from last successful export |
| `userInteractionLevel` stuck | Reset in both inner and outer `finally` blocks |
| Wrong output naming | Dry-run preview shows sample filenames before processing starts |
| PDF page count unknown | `countPdfPages()` binary read; falls back to "unknown" with warning |

## Migration from v2.0.0

- **Breaking:** output naming changes from `prefix + sourceName` to `{n}_{template}` pattern. Users who depend on the old naming can set pattern to `{source}`.
- **Breaking:** artboard range field removed from main UI (exports all artboards by default).
- **Non-breaking:** all existing functionality preserved (skip existing, open folder, PDF preset selection).
- **Deleted:** `illustrator-impose-pdf.jsx` removed entirely. Its `countPdfPages()` absorbed into `core.js`.

## Version

New version: **3.0.0** (major bump — breaking changes in naming, module restructure, impose script deletion).

## Out of scope

- Preset persistence (ZSM.Storage) — BRE has no presets to save
- Multi-page impositions with `pageNumber` reassignment — clipping masks prevent this
- Automatic PDF splitting — stays as manual pre-processing step
- Test suite — can be added later for `core.js` (buildOutputName, countPdfPages are pure functions)
