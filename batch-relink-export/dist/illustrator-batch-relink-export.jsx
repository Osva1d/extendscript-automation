/*
 * ===========================================================================
 * Script:      Illustrator Batch Relink Export
 * Version:     1.0.0
 * Author:      Ladislav Osvald
 * Updated:     2026-06-28
 *
 * Copyright (C) 2025-2026 Ladislav Osvald.
 * MIT License — see LICENSE for full terms.
 *
 * Description:
 *   Batch PDF relinking and export for Illustrator templates.
 * ===========================================================================
 */

#target illustrator

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
            ERR_RELINK_FAILED:  "Export skipped: %s position(s) could not be relinked.",
            ERR_REMOVE_FAIL:    "Excess position (page %s) could not be removed.",
            ERR_UNCERTAIN:      "Skipped: ambiguous page count — please check this file manually.",
            WARN_TEMPLATE_OPEN: "The template is already open with unsaved changes. Processing closes it without saving and discards those changes. Continue?",

            // --- UI: Title & Panels ---
            TITLE:              "Batch Relink Export",
            PANEL_INPUT:        "1 · Input files",
            PANEL_CONFIG:       "2 · Naming & format",
            PANEL_OPTIONS:      "Options",

            // --- UI: Labels (short — narrow label column, full text in helpTip) ---
            LBL_TEMPLATE:       "Template (.ai)",
            LBL_SOURCE:         "Source (PDF)",
            LBL_OUTPUT:         "Output",
            LBL_NAMING:         "Pattern",
            LBL_PRESET:         "PDF Preset",
            LBL_PREVIEW:        "Name preview:",
            NAMING_LEGEND:      "{n} index · {template} template · {source} source",
            SAMPLE_TEMPLATE:    "template",
            SAMPLE_SOURCE:      "source",
            PREVIEW_VERDICT:    "%s of %s sheets OK · %s blocked",

            // --- UI: Buttons ---
            BTN_BROWSE:         "Browse…",
            BTN_RUN:            "Run",
            BTN_CANCEL:         "Cancel",
            BTN_CLOSE:          "Close",
            BTN_STOP:           "Stop",
            BTN_STOPPING:       "Stopping…",
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

            // --- Pre-flight scan ---
            SCAN_HEADER:        "Source file check (pages vs. %s positions):",
            SCAN_OK:            "OK (full sheet): %s",
            SCAN_PARTIAL:       "Partial last sheet: %s",
            SCAN_UNDER:         "Fewer pages mid-batch: %s",
            SCAN_UNREADABLE:    "Page count unreadable: %s",
            SCAN_OVER:          "Blocked (more pages than positions): %s",
            SCAN_UNCERTAIN:     "Uncertain page count (blocked): %s",
            SCAN_FILE_OVER:     "%s: %s pages > %s positions — WILL BE SKIPPED (risk of dropped pages)",
            SCAN_FILE_UNDER:    "%s: %s pages < %s positions (excess positions will be removed)",
            SCAN_FILE_PARTIAL:  "%s: %s pages — %s extra position(s) will remain (remove manually).",
            SCAN_FILE_UNREAD:   "%s: page count could not be detected — all positions relinked, none removed.",
            SCAN_FILE_UNCERTAIN: "%s: ambiguous page count — WILL BE SKIPPED, check manually",
            SCAN_NONE:          "No file can be processed safely.",
            ERR_OVER_PAGES:     "Skipped: %s pages exceeds %s positions — risk of silently dropping pages.",

            // --- Progress ---
            PROGRESS_TITLE:     "Processing files…",
            PROGRESS_INIT:      "Preparing…",
            PROGRESS_FILE:      "Processing: %s (%s of %s)",

            // --- Log ---
            LOG_TITLE:          "Processing Result",
            LOG_SUCCESS:        "Successful",
            LOG_ERRORS:         "Errors",
            LOG_SKIPPED:        "Skipped",
            LOG_BLOCKED:        "Blocked",
            LOG_REMOVED:        "Removed positions",
            LOG_MANUAL_LABEL:   "Needs manual cleanup",
            LOG_MANUAL:         "%s extra position(s) on this sheet — remove manually",
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
            ERR_RELINK_VERIFY:  "Ověření relinku selhalo pro položku %s: očekáváno '%s', nalezeno '%s'.",
            ERR_HIDDEN_LAYER:   "PlacedItem na skryté vrstvě přeskočen: %s",
            ERR_RELINK_ITEM:    "Nepodařilo se relinkovat položku %s: %s",
            ERR_NAMING_PATTERN: "Vzor pojmenování musí obsahovat placeholder {n}.",
            ERR_RELINK_FAILED:  "Export přeskočen: %s pozic se nepodařilo relinkovat.",
            ERR_REMOVE_FAIL:    "Přebytečnou pozici (strana %s) se nepodařilo odebrat.",
            ERR_UNCERTAIN:      "Přeskočeno: nejednoznačný počet stran — zkontrolujte tento soubor ručně.",
            WARN_TEMPLATE_OPEN: "Šablona je již otevřená s neuloženými změnami. Zpracování ji zavře bez uložení a změny zahodí. Pokračovat?",

            // --- UI: Nadpis a panely ---
            TITLE:              "Dávkové zpracování PDF",
            PANEL_INPUT:        "1 · Vstupní soubory",
            PANEL_CONFIG:       "2 · Pojmenování a formát",
            PANEL_OPTIONS:      "Možnosti",

            // --- UI: Popisky (krátké — úzký sloupec, plný text v helpTipu) ---
            LBL_TEMPLATE:       "Šablona (.ai)",
            LBL_SOURCE:         "Zdroj (PDF)",
            LBL_OUTPUT:         "Výstup",
            LBL_NAMING:         "Vzor",
            LBL_PRESET:         "PDF Preset",
            LBL_PREVIEW:        "Náhled názvu:",
            NAMING_LEGEND:      "{n} pořadí · {template} šablona · {source} zdroj",
            SAMPLE_TEMPLATE:    "sablona",
            SAMPLE_SOURCE:      "zdroj",
            PREVIEW_VERDICT:    "%s z %s archů v pořádku · %s blokováno",

            // --- UI: Tlačítka ---
            BTN_BROWSE:         "Vybrat…",
            BTN_RUN:            "Spustit",
            BTN_CANCEL:         "Zrušit",
            BTN_CLOSE:          "Zavřít",
            BTN_STOP:           "Storno",
            BTN_STOPPING:       "Zastavuji…",
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

            // --- Pre-flight sken ---
            SCAN_HEADER:        "Kontrola zdrojových souborů (počet stran vs. %s pozic):",
            SCAN_OK:            "V pořádku (plný arch): %s",
            SCAN_PARTIAL:       "Neúplný poslední arch: %s",
            SCAN_UNDER:         "Méně stran uprostřed dávky: %s",
            SCAN_UNREADABLE:    "Nečitelný počet stran: %s",
            SCAN_OVER:          "Blokováno (více stran než pozic): %s",
            SCAN_UNCERTAIN:     "Nejistý počet stran (blokováno): %s",
            SCAN_FILE_OVER:     "%s: %s stran > %s pozic — BUDE PŘESKOČENO (hrozí ztráta stran)",
            SCAN_FILE_UNDER:    "%s: %s stran < %s pozic (přebytečné pozice budou odebrány)",
            SCAN_FILE_PARTIAL:  "%s: %s stran — zůstane %s pozic navíc (odeber ručně).",
            SCAN_FILE_UNREAD:   "%s: počet stran nelze zjistit — relinkne se vše bez odebrání.",
            SCAN_FILE_UNCERTAIN: "%s: nejednoznačný počet stran — BUDE PŘESKOČENO, zkontrolujte ručně",
            SCAN_NONE:          "Žádný soubor nelze bezpečně zpracovat.",
            ERR_OVER_PAGES:     "Přeskočeno: %s stran je více než %s pozic — hrozí tichá ztráta stran.",

            // --- Průběh ---
            PROGRESS_TITLE:     "Zpracování souborů…",
            PROGRESS_INIT:      "Připravuji…",
            PROGRESS_FILE:      "Zpracovávám: %s (%s z %s)",

            // --- Log ---
            LOG_TITLE:          "Výsledek zpracování",
            LOG_SUCCESS:        "Úspěšně",
            LOG_ERRORS:         "Chyby",
            LOG_SKIPPED:        "Přeskočeno",
            LOG_BLOCKED:        "Blokováno",
            LOG_REMOVED:        "Odebrané pozice",
            LOG_MANUAL_LABEL:   "Vyžaduje ruční úpravu",
            LOG_MANUAL:         "%s pozic navíc na tomto archu — odeber ručně",
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

// ------------------------------------------------------------------------
// Module: BRE.Config — Configuration
// Part of: Illustrator Batch Relink Export v3.0.0
// ------------------------------------------------------------------------

var BRE = BRE || {};

BRE.Config = {
    scriptName: "Batch Relink Export",
    version: "1.0.0",
    debug: false,

    ui: {
        title: null,
        labelWidth: 96,
        dialogWidth: 460,
        browseBtnWidth: 90,
        // Fields stretch (fill) to one shared right edge; this floor stops a
        // field from collapsing. The Browse button is capped (maximumSize) so
        // the row's slack flows into the field, not the button — that capping
        // is what makes fill behave (the earlier "fat button" symptom).
        fieldMinWidth: 180,
        dialogMargins: 20,
        dialogSpacing: 12,
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
                    // Store a direct reference, not an index — relinkDocument may
                    // remove items, which shifts indices and would make an
                    // index-based restore lock the wrong surviving item.
                    this._lockedItems.push(item);
                    item.locked = false;
                }
            } catch (e) {
                this._log("beginSession: item unlock failed — index " + i);
            }
        }
    },

    /**
     * Restores layer and item locks cleared by beginSession().
     * Note: in the current flow the document is always closed without saving,
     * so the restore never persists — it is kept as a cheap defensive measure
     * (ZSM session pattern) in case a future flow ever saves the document.
     * @param {Document} doc - The active Illustrator document.
     */
    endSession: function (doc) {
        var i, rec, lay;

        // Restore item locks by reference. Items removed during processing
        // throw here (reference invalid) and are harmlessly swallowed.
        for (i = 0; i < this._lockedItems.length; i++) {
            try {
                this._lockedItems[i].locked = true;
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
     * @returns {Object} { relinked, skipped, removed, relinkedItems, warnings, errors, ok }
     */
    relinkDocument: function (doc, targetPdf, totalPages) {
        var results = {
            relinked: 0, skipped: 0, removed: 0,
            relinkedItems: [], warnings: [], errors: [], ok: false
        };
        var items = doc.placedItems;
        var i, item, label;
        var toRemove = [];

        for (i = 0; i < items.length; i++) {
            item = items[i];
            label = item.name || ("item_" + i);

            if (!item.file) {
                results.skipped++;
                continue;
            }

            if (this._isHidden(item)) {
                results.warnings.push(BRE.L.format(BRE.L.ERR_HIDDEN_LAYER, label));
                results.skipped++;
                continue;
            }

            if (totalPages > 0 && item.pageNumber && item.pageNumber > totalPages) {
                // Excess position (its page is beyond this PDF). Capture the
                // reference now; remove after the loop. Only managed items
                // (linked + visible) reach here — hidden/fileless were skipped.
                toRemove.push({ item: item, page: item.pageNumber });
                continue;
            }

            try {
                item.relink(targetPdf);
                results.relinked++;
                // Keep a reference so verifyRelink checks ONLY the items we
                // actually relinked — never the deliberately-skipped ones
                // (hidden-layer / fileless), which still point to the old PDF.
                results.relinkedItems.push({ item: item, label: label });
            } catch (e) {
                results.errors.push(BRE.L.format(BRE.L.ERR_RELINK_ITEM, label, e.message));
            }
        }

        // Remove captured excess positions by reference (safe against live
        // collection mutation). Each position may be the clipped content of a
        // clipping mask — _removePosition removes the whole clip group so no
        // clip path / frame is left behind. The remove-set lets it refuse to
        // delete a clip group that also encloses a position we are keeping.
        // Best-effort auto-removal (only fires when pageNumber is readable).
        // Anything that cannot be removed is reported as a warning; the caller
        // counts the leftover positions and asks the user to remove them by
        // hand — it never refuses the sheet on this account.
        var removeRefs = [];
        for (i = 0; i < toRemove.length; i++) removeRefs.push(toRemove[i].item);
        for (i = 0; i < toRemove.length; i++) {
            try {
                this._removePosition(toRemove[i].item, removeRefs);
                results.removed++;
            } catch (e) {
                results.warnings.push(BRE.L.format(BRE.L.ERR_REMOVE_FAIL, String(toRemove[i].page)));
            }
        }

        results.ok = (results.errors.length === 0);
        return results;
    },

    /**
     * Counts managed positions in the document — placed items that are linked
     * (have a file) and not hidden (item itself or any ancestor layer). Used
     * to detect how many extra positions remain on a sheet so the user can be
     * told to remove them.
     * @param {Document} doc - The document to inspect.
     * @returns {number} Managed position count.
     */
    countManagedPositions: function (doc) {
        var n = 0;
        var items = doc.placedItems;
        for (var i = 0; i < items.length; i++) {
            try {
                if (items[i].file && !this._isHidden(items[i])) n++;
            } catch (e) {}
        }
        return n;
    },

    /**
     * Removes one position from the sheet. If the placed item is the clipped
     * content of a clipping mask, the whole clip group is removed instead —
     * calling remove() on the clipped item alone is an ineffective no-op in
     * Illustrator and would leave the clipped PDF (and frame) on the sheet.
     *
     * Safety: the climb only ascends into a clip group whose every placed item
     * is itself being removed (removeRefs). A clip group that also encloses a
     * position we are KEEPING is never removed — otherwise good artwork would
     * be silently deleted. In that case removal falls back to the bare item
     * (an ineffective no-op for clipped content); the caller then counts the
     * surviving positions (countManagedPositions) and flags the sheet for
     * manual cleanup instead of failing it.
     *
     * @param {PlacedItem} item - The placed item to remove.
     * @param {Array} removeRefs - All placed items scheduled for removal.
     */
    _removePosition: function (item, removeRefs) {
        var target = item;
        var p = item.parent;
        while (p && p.typename === "GroupItem" && p.clipped === true) {
            if (!this._groupContainsOnly(p, removeRefs)) break;
            target = p;
            p = p.parent;
        }
        try { target.locked = false; } catch (e) {}
        try { if (target.parent && target.parent.locked) target.parent.locked = false; } catch (e) {}
        target.remove();
    },

    /**
     * True if every placed item anywhere inside the group is in removeRefs
     * (i.e. removing the group deletes only positions we already intend to
     * remove). Walks pageItems recursively so the result does not depend on
     * whether Illustrator's typed collections are recursive, and so nested
     * groups / nested clip masks are handled correctly. Non-placed items
     * (the clipping path, frames) do not count. Returns false on any access
     * error — the caller then declines to climb (fails safe).
     * @param {GroupItem} group - Candidate clip group.
     * @param {Array} removeRefs - Placed items scheduled for removal.
     * @returns {boolean}
     */
    _groupContainsOnly: function (group, removeRefs) {
        try {
            var kids = group.pageItems;
            for (var k = 0; k < kids.length; k++) {
                var it = kids[k];
                if (it.typename === "PlacedItem") {
                    if (!this._inSet(it, removeRefs)) return false;
                } else if (it.typename === "GroupItem") {
                    if (!this._groupContainsOnly(it, removeRefs)) return false;
                }
            }
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Reference-equality membership test.
     * @param {Object} item - Item to find.
     * @param {Array} refs - Array of references.
     * @returns {boolean}
     */
    _inSet: function (item, refs) {
        for (var m = 0; m < refs.length; m++) {
            if (refs[m] === item) return true;
        }
        return false;
    },

    // ---------------------------------------------------------------------
    // Relink verification
    // ---------------------------------------------------------------------

    /**
     * Verifies that every relinked item now points to the expected PDF.
     * Takes the relinked-items list from relinkDocument() — NOT the whole
     * document — so deliberately-skipped items (hidden-layer / fileless),
     * which still reference the old PDF, are never wrongly flagged.
     * @param {Array} relinkedItems - [{ item, label }] from relinkDocument.
     * @param {File} expectedPdf - The expected linked file.
     * @returns {Object} { ok: boolean, errors: string[] }
     */
    verifyRelink: function (relinkedItems, expectedPdf) {
        var errors = [];
        var expectedPath = expectedPdf.fsName;

        for (var i = 0; i < relinkedItems.length; i++) {
            var rec = relinkedItems[i];
            try {
                var actualPath = rec.item.file.fsName;
                if (actualPath !== expectedPath) {
                    errors.push(
                        BRE.L.format(BRE.L.ERR_RELINK_VERIFY, rec.label, expectedPath, actualPath)
                    );
                }
            } catch (e) {
                errors.push(BRE.L.format(BRE.L.ERR_RELINK_ITEM, rec.label, e.message));
            }
        }

        return { ok: errors.length === 0, errors: errors };
    },

    // ---------------------------------------------------------------------
    // PDF page count
    // ---------------------------------------------------------------------

    /**
     * Reads a PDF's raw bytes as a binary string.
     * @param {File} pdfFile - The PDF file to read.
     * @returns {string|null} File content, or null on failure.
     */
    _readPdfBinary: function (pdfFile) {
        try {
            pdfFile.encoding = "binary";
            if (!pdfFile.open("r")) return null;

            // Cap memory for very large print PDFs: the /Count and /Type/Page
            // tokens live in the object section and trailer, so we scan the
            // head and tail rather than loading the whole file. A token missed
            // by this window yields a low/zero count → safe "unreadable"
            // fallback (relink all, remove none), never a wrong removal.
            var CAP = 8 * 1024 * 1024;
            var len = pdfFile.length;
            var content;
            if (len <= 0 || len <= CAP) {
                content = pdfFile.read();
            } else {
                var half = Math.floor(CAP / 2);
                var head = pdfFile.read(half);
                pdfFile.seek(len - half, 0);
                content = head + pdfFile.read(half);
            }
            pdfFile.close();
            return content;
        } catch (e) {
            this._log("_readPdfBinary failed: " + e.message);
            try { pdfFile.close(); } catch (ce) {}
            return null;
        }
    },

    /**
     * Skips a run of PDF whitespace starting at idx.
     * @param {string} content - PDF content.
     * @param {number} idx - Start index.
     * @returns {number} Index of the first non-whitespace character.
     */
    _skipPdfWhitespace: function (content, idx) {
        while (idx < content.length) {
            var w = content.charAt(idx);
            if (w === " " || w === "\n" || w === "\r" || w === "\t" || w === "\f" || w === "\0") {
                idx++;
            } else {
                break;
            }
        }
        return idx;
    },

    /**
     * Highest /Count value in the content. /Count is followed by arbitrary
     * PDF whitespace (space, newline, CR, tab…), not only a single space —
     * matching just "/Count " misses "/Count\n8" and silently undercounts,
     * which (with the remove-excess logic) risks dropping real pages.
     * @param {string} content - PDF content.
     * @returns {number} Highest /Count, or 0 if none found.
     */
    _maxCount: function (content) {
        var token = "/Count";
        var maxCount = 0;
        var startIdx = 0;
        while (true) {
            var pos = content.indexOf(token, startIdx);
            if (pos === -1) break;
            var ci = this._skipPdfWhitespace(content, pos + token.length);
            var numStr = "";
            while (ci < content.length) {
                var ch = content.charAt(ci);
                if (ch >= "0" && ch <= "9") { numStr += ch; ci++; } else { break; }
            }
            if (numStr.length > 0) {
                var n = parseInt(numStr, 10);
                if (n > maxCount) maxCount = n;
            }
            startIdx = pos + token.length;
        }
        return maxCount;
    },

    /**
     * Counts page objects: "/Type" + whitespace + "/Page" (excluding "/Pages").
     * An independent cross-check against _maxCount. Returns 0 when page
     * objects live in compressed object streams (PDF 1.5+) — callers treat
     * 0 as "no cross-check available" rather than a contradiction.
     * @param {string} content - PDF content.
     * @returns {number} Number of /Type /Page objects found.
     */
    _countPageObjects: function (content) {
        var token = "/Type";
        var count = 0;
        var startIdx = 0;
        while (true) {
            var pos = content.indexOf(token, startIdx);
            if (pos === -1) break;
            var ci = this._skipPdfWhitespace(content, pos + token.length);
            if (content.substr(ci, 5) === "/Page" && content.charAt(ci + 5) !== "s") {
                count++;
            }
            startIdx = pos + token.length;
        }
        return count;
    },

    // ---------------------------------------------------------------------
    // Pre-flight scan
    // ---------------------------------------------------------------------

    /**
     * Scans every source PDF and classifies its page count against the
     * template's position count. This is the safety net: it surfaces every
     * file whose page count does not match the number of positions BEFORE
     * any destructive processing, and flags over-page files for hard block.
     *
     * Status values:
     *   "ok"         pages === slotCount (full sheet)
     *   "partial"    pages < slotCount AND last file (expected short last sheet)
     *   "under"      pages < slotCount AND not last file (likely split error)
     *   "over"       pages > slotCount (would silently drop pages — BLOCKED)
     *   "uncertain"  page-object count exceeds /Count — BLOCKED
     *   "unreadable" pages === 0 (count could not be detected)
     *
     * Each PDF is read once; both /Count and /Type/Page counts are derived
     * from the same bytes. Only the dangerous direction is blocked: when there
     * are MORE page objects than /Count claims (pageObjs > pages), /Count is
     * undercounting and the remove-excess step would drop real pages, so the
     * file is marked "uncertain" and hard-blocked for manual review. The other
     * direction (pageObjs < pages, e.g. page objects hidden in compressed
     * object streams of a modern PDF) is NOT a contradiction — /Count is
     * authoritative there, so it is trusted.
     *
     * @param {File[]} pdfFiles - Source PDF files (already sorted).
     * @param {number} slotCount - Number of PlacedItems in the template.
     * @returns {Object} { items: [{file, name, pages, pageObjs, status}], counts, processable }
     */
    scanSources: function (pdfFiles, slotCount) {
        var items = [];
        var counts = { ok: 0, partial: 0, under: 0, over: 0, uncertain: 0, unreadable: 0 };
        var lastIdx = pdfFiles.length - 1;

        for (var i = 0; i < pdfFiles.length; i++) {
            var f = pdfFiles[i];
            var name = f.displayName || decodeURI(f.name);
            var content = this._readPdfBinary(f);
            var pages = (content === null) ? 0 : this._maxCount(content);
            var pageObjs = (content === null) ? 0 : this._countPageObjects(content);
            var status;

            if (pages === 0) {
                status = "unreadable";
            } else if (pageObjs > pages) {
                status = "uncertain";
            } else if (pages > slotCount) {
                status = "over";
            } else if (pages === slotCount) {
                status = "ok";
            } else {
                status = (i === lastIdx) ? "partial" : "under";
            }

            counts[status]++;
            // Carry the File reference so callers iterate scan items directly
            // instead of index-coupling back to the pdfFiles array.
            items.push({ file: f, name: name, pages: pages, pageObjs: pageObjs, status: status });
        }

        // "over" and "uncertain" files are hard-blocked; the rest are processable.
        return {
            items: items,
            counts: counts,
            processable: pdfFiles.length - counts.over - counts.uncertain
        };
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

        var ph = BRE.Config.placeholders;
        var name = pattern;
        name = name.split(ph.N).join(num);
        name = name.split(ph.TEMPLATE).join(templateName);
        name = name.split(ph.SOURCE).join(sourceName);
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

    /**
     * Natural (numeric-aware) comparison of two filenames.
     * Sorts embedded numbers by value so "part_2" precedes "part_10"
     * (a plain lexical sort would order 1, 10, 11, 2…, which looks random
     * to the operator and produces unpredictable sheet numbering).
     * Case-insensitive. Returns -1 / 0 / 1.
     * @param {string} a - First name.
     * @param {string} b - Second name.
     * @returns {number} Comparison result.
     */
    naturalCompare: function (a, b) {
        a = String(a).toLowerCase();
        b = String(b).toLowerCase();
        var ia = 0, ib = 0;
        while (ia < a.length && ib < b.length) {
            var ca = a.charAt(ia), cb = b.charAt(ib);
            var da = (ca >= "0" && ca <= "9");
            var db = (cb >= "0" && cb <= "9");
            if (da && db) {
                var na = "";
                while (ia < a.length && a.charAt(ia) >= "0" && a.charAt(ia) <= "9") { na += a.charAt(ia++); }
                var nb = "";
                while (ib < b.length && b.charAt(ib) >= "0" && b.charAt(ib) <= "9") { nb += b.charAt(ib++); }
                var diff = parseInt(na, 10) - parseInt(nb, 10);
                if (diff !== 0) return diff < 0 ? -1 : 1;
                // Equal value but different digit count → fewer leading zeros first.
                if (na.length !== nb.length) return na.length < nb.length ? -1 : 1;
            } else {
                if (ca !== cb) return ca < cb ? -1 : 1;
                ia++; ib++;
            }
        }
        var ra = a.length - ia, rb = b.length - ib;
        if (ra !== rb) return ra < rb ? -1 : 1;
        return 0;
    },

    /**
     * Finds an already-open document matching the given file, if any.
     * Used to warn before closing a template the user has open.
     * @param {File} file - The file to look for among open documents.
     * @returns {Document|null} The open document, or null.
     */
    findOpenDocument: function (file) {
        try {
            for (var i = 0; i < app.documents.length; i++) {
                var d = app.documents[i];
                try {
                    if (d.fullName && d.fullName.fsName === file.fsName) return d;
                } catch (e) {}
            }
        } catch (e) {}
        return null;
    },

    /**
     * Builds a human-readable snapshot of every placed item in the document —
     * pageNumber, "over" verdict, layer + visibility, parent group / clip
     * state, hidden-layer result, linked file name. Used by diagnostic mode to
     * reveal the real document structure when removal behaves unexpectedly.
     * @param {Document} doc - Document to inspect.
     * @param {number} totalPages - Detected page count of the source PDF.
     * @returns {string} Multi-line report.
     */
    diagnosticReport: function (doc, totalPages) {
        var items = doc.placedItems;
        var lines = [];
        lines.push("  totalPages=" + totalPages + "  placedItems=" + items.length);
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            var pn = "?", lay = "?", vis = "?", par = "?", clp = "-", hid = "?", fil = "?";
            try { pn = it.pageNumber; } catch (e) { pn = "ERR"; }
            try { lay = it.layer.name; } catch (e) {}
            try { vis = it.layer.visible; } catch (e) {}
            try {
                par = it.parent.typename;
                if (par === "GroupItem") clp = it.parent.clipped;
            } catch (e) {}
            try { hid = this._isHidden(it); } catch (e) {}
            try { fil = it.file ? decodeURI(it.file.name) : "NONE"; } catch (e) { fil = "ERR"; }
            lines.push("    [" + i + "] page=" + pn +
                       " over=" + (totalPages > 0 && pn !== "ERR" && pn > totalPages) +
                       " layer='" + lay + "' vis=" + vis +
                       " parent=" + par + " clipped=" + clp + " hidden=" + hid + " file=" + fil);
        }
        return lines.join("\n");
    },

    /**
     * Appends a UTF-8 line of text to a log file in the given folder.
     * @param {Folder} folder - Destination folder.
     * @param {string} fileName - Log file name.
     * @param {string} text - Text to append.
     */
    appendLog: function (folder, fileName, text) {
        try {
            var f = new File(folder.fsName + "/" + fileName);
            f.encoding = "UTF-8";
            if (f.open("a")) {
                f.write(text + "\n");
                f.close();
            }
        } catch (e) {
            this._log("appendLog failed: " + e.message);
        }
    },

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /**
     * Checks whether an item is effectively invisible — the item itself is
     * hidden, or it resides on a hidden layer (or nested hidden parent layer).
     * @param {PlacedItem} item - The item to check.
     * @returns {boolean} True if the item or any ancestor layer is hidden.
     */
    _isHidden: function (item) {
        try {
            if (item.hidden) return true;
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
        // Fixed width anchors the fill-width fields (they have no fixed size now).
        dialog.preferredSize.width = c.ui.dialogWidth;

        // Forward declaration — defined once previewST / namingInput exist.
        var refreshPreview;

        // --- Panel 1: input files (narrow label, fields fill the width) ---
        var inputPanel = dialog.add("panel", undefined, l.PANEL_INPUT);
        inputPanel.orientation = "column";
        inputPanel.alignChildren = ["fill", "top"];
        inputPanel.margins = c.ui.panelMargins;
        inputPanel.spacing = c.ui.panelSpacing;

        var templatePath = this._addFileRow(inputPanel, l.LBL_TEMPLATE,
            false, "*.ai", l.TIP_TEMPLATE, l.TIP_TEMPLATE_BTN,
            function () { if (refreshPreview) refreshPreview(); });
        var sourcePath = this._addFileRow(inputPanel, l.LBL_SOURCE,
            true, undefined, l.TIP_SOURCE, l.TIP_SOURCE_BTN);
        var outputPath = this._addFileRow(inputPanel, l.LBL_OUTPUT,
            true, undefined, l.TIP_OUTPUT, l.TIP_OUTPUT_BTN);

        // --- Panel 2: naming & format ---
        var configPanel = dialog.add("panel", undefined, l.PANEL_CONFIG);
        configPanel.orientation = "column";
        configPanel.alignChildren = ["fill", "top"];
        configPanel.margins = c.ui.panelMargins;
        configPanel.spacing = c.ui.panelSpacing;

        // Naming pattern (field fills the width)
        var namingGrp = configPanel.add("group");
        namingGrp.alignment = ["fill", "center"];
        namingGrp.alignChildren = ["left", "center"];
        var namingST = namingGrp.add("statictext", undefined, l.LBL_NAMING);
        namingST.preferredSize.width = c.ui.labelWidth;
        namingST.helpTip = l.TIP_NAMING;
        var namingInput = namingGrp.add("edittext", undefined, c.defaultNamingPattern);
        // Fill to the panel's right edge — same line as panel-1's buttons.
        namingInput.alignment = ["fill", "center"];
        namingInput.minimumSize.width = c.ui.fieldMinWidth;
        namingInput.helpTip = l.TIP_NAMING;

        // Visible token legend (lifted out of the helpTip)
        var legendGrp = configPanel.add("group");
        legendGrp.alignChildren = ["left", "center"];
        var legendPad = legendGrp.add("statictext", undefined, "");
        legendPad.preferredSize.width = c.ui.labelWidth;
        var legendST = legendGrp.add("statictext", undefined, l.NAMING_LEGEND);
        legendST.enabled = false;

        // Live output-name preview (presentation only — reads buildOutputName)
        var previewGrp = configPanel.add("group");
        previewGrp.alignment = ["fill", "center"];
        previewGrp.alignChildren = ["left", "center"];
        var previewLbl = previewGrp.add("statictext", undefined, l.LBL_PREVIEW);
        previewLbl.preferredSize.width = c.ui.labelWidth;
        var previewST = previewGrp.add("statictext", undefined, "", { truncate: "middle" });
        previewST.alignment = ["fill", "center"];
        previewST.minimumSize.width = c.ui.fieldMinWidth;
        try {
            var pf = previewST.graphics.font;
            previewST.graphics.font = ScriptUI.newFont(pf.name, "Bold", pf.size);
        } catch (fe) {}

        // PDF Preset (dropdown fills the width)
        var presetGrp = configPanel.add("group");
        presetGrp.alignment = ["fill", "center"];
        presetGrp.alignChildren = ["left", "center"];
        var presetST = presetGrp.add("statictext", undefined, l.LBL_PRESET);
        presetST.preferredSize.width = c.ui.labelWidth;
        presetST.helpTip = l.TIP_PRESET;
        var presetDDL = presetGrp.add("dropdownlist", undefined, []);
        presetDDL.alignment = ["fill", "center"];
        presetDDL.minimumSize.width = c.ui.fieldMinWidth;
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

        // --- Panel 3: options (optional toggles, separated from settings) ---
        var optionsPanel = dialog.add("panel", undefined, l.PANEL_OPTIONS);
        optionsPanel.orientation = "column";
        optionsPanel.alignChildren = ["left", "top"];
        optionsPanel.margins = c.ui.panelMargins;
        optionsPanel.spacing = c.ui.panelSpacing;

        var skipCB = optionsPanel.add("checkbox", undefined, l.CB_SKIP);
        skipCB.helpTip = l.TIP_SKIP;

        var openCB = optionsPanel.add("checkbox", undefined, l.CB_OPEN_FOLDER);
        openCB.value = true;
        openCB.helpTip = l.TIP_OPEN;

        // --- Footer: greyed copyright (left) + buttons (right), one row ---
        var footerGrp = dialog.add("group");
        footerGrp.alignment = ["fill", "center"];
        footerGrp.spacing = 8;
        var stCopy = footerGrp.add("statictext", undefined,
            "© 2025–2026 Ladislav Osvald · v" + c.version);
        stCopy.enabled = false;
        stCopy.alignment = ["left", "center"];
        var footerSpacer = footerGrp.add("group");
        footerSpacer.alignment = ["fill", "center"];
        var btnGrp = footerGrp.add("group");
        btnGrp.alignment = ["right", "center"];
        btnGrp.spacing = 8;
        btnGrp.add("button", undefined, l.BTN_CANCEL, { name: "cancel" });
        btnGrp.add("button", undefined, l.BTN_RUN, { name: "ok" });

        // Live name preview — presentation only, read-only call into the
        // existing buildOutputName. No validation, no write, no side-effect.
        refreshPreview = function () {
            var tpl;
            try {
                tpl = templatePath.text
                    ? BRE.Core.stripExtension(decodeURI(new File(templatePath.text).name))
                    : l.SAMPLE_TEMPLATE;
            } catch (te) { tpl = l.SAMPLE_TEMPLATE; }
            try {
                previewST.text = BRE.Core.buildOutputName(
                    namingInput.text, 0, 1, tpl, l.SAMPLE_SOURCE);
            } catch (pe2) { previewST.text = ""; }
        };
        namingInput.onChanging = refreshPreview;
        refreshPreview();

        // Recompute the layout with the deterministic fixed widths.
        try { dialog.layout.layout(true); } catch (le) {}

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
        if (namingPattern.indexOf(c.placeholders.N) === -1) {
            alert(l.ERR_NAMING_PATTERN);
            return null;
        }

        var pdfFiles = sourceFolder.getFiles(function (f) {
            if (!(f instanceof File)) return false;
            var nm = f.displayName || decodeURI(f.name);
            // Skip macOS AppleDouble files (._name) and other hidden/system
            // dotfiles — on FAT/exFAT flash drives "._x.pdf" siblings appear
            // and would otherwise be processed as real PDFs.
            if (nm.charAt(0) === ".") return false;
            return /\.pdf$/i.test(nm);
        });
        if (pdfFiles.length === 0) {
            alert(l.ERR_NO_PDF);
            return null;
        }

        // Sort PDF files in natural (numeric-aware) order so sheet numbering
        // is predictable: part_2 before part_10, not lexical 1,10,11,2…
        pdfFiles.sort(function (a, b) {
            return BRE.Core.naturalCompare(
                a.displayName || decodeURI(a.name),
                b.displayName || decodeURI(b.name)
            );
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
     * Renders the pre-flight scan report (per-file page count vs. positions)
     * and disables Continue when no file can be processed safely.
     * @param {Object} config - Validated config from show().
     * @param {number} slotCount - Number of PlacedItems in the template.
     * @param {Object} scan - Result of BRE.Core.scanSources().
     * @returns {boolean} True if user confirms, false if cancelled.
     */
    showPreview: function (config, slotCount, scan) {
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

        // One-line verdict (bold): processable / total / blocked.
        var total = config.pdfFiles.length;
        var verdictST = dlg.add("statictext", undefined, l.format(l.PREVIEW_VERDICT,
            String(scan.processable), String(total), String(total - scan.processable)));
        verdictST.preferredSize.width = 500;
        try {
            var vf = verdictST.graphics.font;
            verdictST.graphics.font = ScriptUI.newFont(vf.name, "Bold", vf.size);
        } catch (vfe) {}

        var infoText = l.format(l.PREVIEW_TEMPLATE, config.templateName, String(slotCount))
            + "\n" + l.format(l.PREVIEW_SOURCE, String(config.pdfFiles.length))
            + "\n" + l.format(l.PREVIEW_SAMPLE, sampleName);

        var infoST = dlg.add("statictext", undefined, infoText, { multiline: true });
        infoST.preferredSize.width = 500;

        // --- Pre-flight scan summary: header + one status-dot row per count ---
        var c = scan.counts;
        var headerST = dlg.add("statictext", undefined, l.format(l.SCAN_HEADER, String(slotCount)));
        headerST.preferredSize.width = 500;

        var rowsGrp = dlg.add("group");
        rowsGrp.orientation = "column";
        rowsGrp.alignChildren = ["left", "center"];
        rowsGrp.spacing = 3;
        rowsGrp.margins = [4, 2, 0, 2];

        var GREEN = [0.36, 0.60, 0.34], AMBER = [0.79, 0.64, 0.23],
            RED = [0.76, 0.31, 0.25], GREY = [0.60, 0.60, 0.58];
        function addCountRow(n, str, rgb, force) {
            if (!force && n === 0) return;
            var g = rowsGrp.add("group");
            g.alignChildren = ["left", "center"];
            g.spacing = 7;
            var dot = g.add("statictext", undefined, "●");  // ●
            BRE.UI._color(dot, rgb);
            g.add("statictext", undefined, l.format(str, String(n)));
        }
        addCountRow(c.ok, l.SCAN_OK, GREEN, true);
        addCountRow(c.partial, l.SCAN_PARTIAL, AMBER, false);
        addCountRow(c.under, l.SCAN_UNDER, AMBER, false);
        addCountRow(c.unreadable, l.SCAN_UNREADABLE, GREY, false);
        addCountRow(c.over, l.SCAN_OVER, RED, false);
        addCountRow(c.uncertain, l.SCAN_UNCERTAIN, RED, false);

        // --- Per-file anomaly details (everything except "ok") ---
        var details = [];
        for (var i = 0; i < scan.items.length; i++) {
            var it = scan.items[i];
            if (it.status === "over") {
                details.push(l.format(l.SCAN_FILE_OVER, it.name, String(it.pages), String(slotCount)));
            } else if (it.status === "under") {
                details.push(l.format(l.SCAN_FILE_UNDER, it.name, String(it.pages), String(slotCount)));
            } else if (it.status === "partial") {
                details.push(l.format(l.SCAN_FILE_PARTIAL, it.name, String(it.pages), String(slotCount - it.pages)));
            } else if (it.status === "unreadable") {
                details.push(l.format(l.SCAN_FILE_UNREAD, it.name));
            } else if (it.status === "uncertain") {
                details.push(l.format(l.SCAN_FILE_UNCERTAIN, it.name));
            }
        }
        if (details.length > 0) {
            var detPanel = dlg.add("panel", undefined, l.LOG_DETAILS);
            detPanel.alignChildren = ["fill", "fill"];
            detPanel.margins = 15;
            var detBox = detPanel.add("edittext", undefined, details.join("\n"),
                { multiline: true, scrolling: true, "readonly": true });
            detBox.preferredSize = [480, 160];
        }

        if (scan.processable === 0) {
            var noneST = dlg.add("statictext", undefined, l.SCAN_NONE);
            noneST.preferredSize.width = 500;
        }

        var footerGrp = dlg.add("group");
        footerGrp.alignment = ["right", "center"];
        footerGrp.spacing = 8;
        footerGrp.add("button", undefined, l.BTN_CANCEL, { name: "cancel" });
        var okBtn = footerGrp.add("button", undefined, l.BTN_CONTINUE, { name: "ok" });
        if (scan.processable === 0) okBtn.enabled = false;

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
        cancelBtn.onClick = function () {
            // Cancellation takes effect after the current file finishes (the
            // loop polls between files). Give immediate visual feedback so the
            // button doesn't look dead during the in-progress file.
            cancelled = true;
            cancelBtn.text = l.BTN_STOPPING;
            cancelBtn.enabled = false;
            dlg.update();
        };

        dlg.show();

        return {
            isCancelled: function () { return cancelled; },
            update: function (index, fileName) {
                // Keep the status line from overflowing on long names.
                var nm = fileName;
                if (nm.length > 38) nm = nm.substr(0, 18) + "…" + nm.substr(nm.length - 17);
                statusText.text = l.format(l.PROGRESS_FILE,
                    nm, String(index + 1), String(total));
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
     * @param {Object} results - { success, errors, skipped, blocked, removed,
     *        manual, cancelled, total, log }
     */
    showSummary: function (results) {
        var l = BRE.L;

        var logWin = new Window("dialog", l.LOG_TITLE);
        logWin.orientation = "column";
        logWin.alignChildren = ["fill", "top"];
        logWin.margins = 20;
        logWin.spacing = 15;

        // Aligned label : value pairs (Errors red when > 0).
        var RED = [0.76, 0.31, 0.25];
        var pairsGrp = logWin.add("group");
        pairsGrp.orientation = "column";
        pairsGrp.alignChildren = ["left", "center"];
        pairsGrp.spacing = 3;
        function addPair(label, val, redIfPositive, force) {
            if (!force && val === 0) return;
            var g = pairsGrp.add("group");
            g.alignChildren = ["left", "center"];
            g.spacing = 8;
            var ls = g.add("statictext", undefined, label);
            ls.preferredSize.width = 150;
            var vs = g.add("statictext", undefined, String(val));
            vs.preferredSize.width = 60;
            if (redIfPositive && val > 0) BRE.UI._color(vs, RED);
        }
        addPair(l.LOG_SUCCESS, results.success, false, true);
        addPair(l.LOG_ERRORS, results.errors, true, true);
        addPair(l.LOG_SKIPPED, results.skipped, false, true);
        addPair(l.LOG_BLOCKED, results.blocked, false, false);
        addPair(l.LOG_REMOVED, results.removed, false, false);
        addPair(l.LOG_MANUAL_LABEL, results.manual, false, false);

        if (results.cancelled) {
            var completed = results.success + results.errors + results.skipped + results.blocked;
            var cancST = logWin.add("statictext", undefined,
                l.format(l.LOG_CANCELLED, String(completed), String(results.total)));
            cancST.preferredSize.width = 500;
        }

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
     * Sets a control's text colour. Wrapped in try/catch — colouring is
     * cosmetic and must never break the dialog if a host build rejects the pen.
     * @param {Object} ctrl - A ScriptUI control (statictext).
     * @param {number[]} rgb - [r, g, b] in 0..1.
     */
    _color: function (ctrl, rgb) {
        try {
            var g = ctrl.graphics;
            ctrl.graphics.foregroundColor = g.newPen(g.PenType.SOLID_COLOR, rgb, 1);
        } catch (e) {}
    },

    /**
     * Adds a labeled file/folder row to a panel. The narrow label shares the
     * field's helpTip (the short label carries the full description there); the
     * field fills the remaining width. The field starts empty — ScriptUI has no
     * greyed placeholder, so a descriptive default would be mistaken for a real
     * path by the validation.
     * @param {Function} [onPick] - Optional callback fired after a path is picked.
     * @returns {EditText} The text input element.
     */
    _addFileRow: function (parent, label, isFolder, ext, tipField, tipBtn, onPick) {
        var l = BRE.L;
        var c = BRE.Config;

        var grp = parent.add("group");
        grp.orientation = "row";
        grp.alignment = ["fill", "center"];
        grp.alignChildren = ["left", "center"];
        var st = grp.add("statictext", undefined, label);
        st.preferredSize.width = c.ui.labelWidth;
        if (tipField) st.helpTip = tipField;
        // Field fills the row; the button is capped so the slack goes to the
        // field (not the button), giving every row one shared right edge.
        var et = grp.add("edittext", undefined, "");
        et.alignment = ["fill", "center"];
        et.minimumSize.width = c.ui.fieldMinWidth;
        if (tipField) et.helpTip = tipField;
        var btn = grp.add("button", undefined, l.BTN_BROWSE);
        btn.preferredSize.width = c.ui.browseBtnWidth;
        btn.maximumSize.width = c.ui.browseBtnWidth;
        if (tipBtn) btn.helpTip = tipBtn;
        btn.onClick = function () {
            var sel;
            if (isFolder) {
                sel = Folder.selectDialog(l.BROWSE_FOLDER);
            } else {
                sel = File.openDialog(l.BROWSE_FILE, ext);
            }
            if (sel) {
                et.text = sel.fsName;
                if (onPick) onPick();
            }
        };
        return et;
    }
};

(function (BRE) {
    try {
        var config = BRE.UI.show();
        if (!config) return;

        // If the template is already open with unsaved changes, processing
        // would close it without saving and discard the user's work. Warn first.
        var openTpl = BRE.Core.findOpenDocument(config.templateFile);
        if (openTpl) {
            try {
                if (openTpl.saved === false && !confirm(BRE.L.WARN_TEMPLATE_OPEN)) return;
            } catch (e) {}
        }

        // Count PlacedItems for the preview. If the user already has the
        // template open, read from THAT instance without closing it — closing
        // here would discard their unsaved work even if they then cancel at the
        // preview. (Processing later closes it on the first iteration, which is
        // what the warning above is about.)
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
        var slotCount = 0;
        try {
            if (openTpl) {
                slotCount = openTpl.placedItems.length;
            } else {
                var tplDoc = app.open(config.templateFile);
                slotCount = tplDoc.placedItems.length;
                tplDoc.close(SaveOptions.DONOTSAVECHANGES);
            }
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

        // Pre-flight scan — count pages of every source PDF and classify
        // against the template position count. Surfaces every anomaly before
        // any destructive work; over-page files are hard-blocked in the loop.
        var scan = BRE.Core.scanSources(config.pdfFiles, slotCount);

        // Fewer dialogs: only show the preview when there is something to
        // review (anomalies or blocked files). A fully clean batch — every
        // file has exactly the right page count — proceeds straight to
        // processing after the user clicked Run.
        var clean = (scan.counts.ok === config.pdfFiles.length);
        if (!clean && !BRE.UI.showPreview(config, slotCount, scan)) return;

        // Every sheet must build from the template's saved on-disk state. If
        // the user still has it open, app.open() would return that in-memory
        // instance — including unsaved edits — for the FIRST sheet only, making
        // sheet 01 inconsistent with the rest. Close it now, after the user
        // confirmed all dialogs (cancelling above leaves their document intact).
        if (openTpl) {
            try { openTpl.close(SaveOptions.DONOTSAVECHANGES); } catch (e) {}
            openTpl = null;
        }

        // Processing loop
        var results = {
            success: 0, errors: 0, skipped: 0, blocked: 0, removed: 0, manual: 0,
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

                var fileInfo = scan.items[i];
                var currentFile = fileInfo.file;
                var sourceFileName = fileInfo.name;
                var sourceName = BRE.Core.stripExtension(sourceFileName);

                var outputName = BRE.Core.buildOutputName(
                    config.namingPattern, i, config.pdfFiles.length,
                    config.templateName, sourceName
                );
                var outputFile = new File(config.outputFolder.fsName + "/" + outputName);

                progress.update(i, outputName);

                // Hard block: a file with more pages than positions would
                // silently drop pages. Refuse to process — never emit a lossy
                // sheet (the user cannot manually verify a large batch).
                if (fileInfo.status === "over") {
                    results.blocked++;
                    results.log.push(outputName + ": " + BRE.L.format(
                        BRE.L.ERR_OVER_PAGES, String(fileInfo.pages), String(slotCount)));
                    continue;
                }
                if (fileInfo.status === "uncertain") {
                    results.blocked++;
                    results.log.push(outputName + ": " + BRE.L.ERR_UNCERTAIN);
                    continue;
                }

                // Unreadable page count: the sheet still processes (relink all,
                // remove none), but the short-sheet check below cannot work
                // without a page count — note it in the summary so the operator
                // verifies this sheet by eye.
                if (fileInfo.status === "unreadable") {
                    results.log.push(outputName + ": " + BRE.L.format(
                        BRE.L.SCAN_FILE_UNREAD, sourceFileName));
                }

                // Skip existing
                if (config.skipExisting && outputFile.exists) {
                    results.skipped++;
                    results.log.push(sourceFileName + ": " + BRE.L.SKIP_MSG);
                    continue;
                }

                try {
                    doc = app.open(config.templateFile);
                    BRE.Core.beginSession(doc);

                    // Diagnostic logging: when BRE.Config.debug is enabled (a
                    // source-level support switch, no UI), snapshot the freshly-
                    // opened template BEFORE any relink/removal so the log shows
                    // the true structure (pageNumbers, clip groups, layers).
                    if (BRE.Config.debug) {
                        BRE.Core.appendLog(config.outputFolder, "_bre-diagnostika.txt",
                            "=== " + outputName + "  (zdroj: " + sourceFileName + ") ===\n" +
                            "BEFORE relink:\n" +
                            BRE.Core.diagnosticReport(doc, fileInfo.pages));
                    }

                    try {
                        // Reuse the page count from the pre-flight scan
                        // (already counted once — no need to re-read the PDF).
                        var relinkResult = BRE.Core.relinkDocument(doc, currentFile, fileInfo.pages);

                        if (BRE.Config.debug) {
                            BRE.Core.appendLog(config.outputFolder, "_bre-diagnostika.txt",
                                "AFTER relink: relinked=" + relinkResult.relinked +
                                " removed=" + relinkResult.removed +
                                " skipped=" + relinkResult.skipped +
                                " errors=" + relinkResult.errors.length + "\n" +
                                BRE.Core.diagnosticReport(doc, fileInfo.pages) + "\n");
                        }

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

                        // A relink or remove error means a position is wrong or
                        // an excess page survived — never export a lossy sheet.
                        if (!relinkResult.ok) {
                            results.errors++;
                            results.log.push(outputName + ": " + BRE.L.format(
                                BRE.L.ERR_RELINK_FAILED, String(relinkResult.errors.length)));
                            continue;
                        }

                        // Verify only the items we actually relinked
                        var verification = BRE.Core.verifyRelink(relinkResult.relinkedItems, currentFile);
                        if (!verification.ok) {
                            results.errors++;
                            for (wi = 0; wi < verification.errors.length; wi++) {
                                results.log.push(outputName + ": " + verification.errors[wi]);
                            }
                            continue;
                        }

                        // A short source leaves more positions than pages. The
                        // tool cannot reliably tell WHICH are excess when the
                        // template's pageNumber is not readable, so it does not
                        // delete them — it flags the sheet for manual cleanup
                        // and still exports it (the operator removes the few
                        // extra positions by hand on the last sheet).
                        var expected = (fileInfo.pages > 0 && fileInfo.pages < slotCount)
                            ? fileInfo.pages : slotCount;
                        var remaining = BRE.Core.countManagedPositions(doc);
                        if (remaining > expected) {
                            results.manual++;
                            results.log.push(outputName + ": " + BRE.L.format(
                                BRE.L.LOG_MANUAL, String(remaining - expected)));
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
