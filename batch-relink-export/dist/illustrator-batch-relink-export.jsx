/*
 * ===========================================================================
 * Script:      Illustrator Batch Relink Export
 * Version:     3.0.0
 * Author:      Osva1d
 * Updated:     2026-06-01
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
            ERR_UNCERTAIN:      "Skipped: page count could not be reliably verified (/Count %s vs %s page objects).",
            WARN_TEMPLATE_OPEN: "The template is already open with unsaved changes. Processing closes it without saving and discards those changes. Continue?",

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
            SCAN_FILE_PARTIAL:  "%s: %s pages — %s positions removed from last sheet.",
            SCAN_FILE_UNREAD:   "%s: page count could not be detected — all positions relinked, none removed.",
            SCAN_FILE_UNCERTAIN: "%s: ambiguous page count (/Count %s vs %s page objects) — WILL BE SKIPPED, check manually",
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
            ERR_UNCERTAIN:      "Přeskočeno: počet stran nelze spolehlivě ověřit (/Count %s vs %s objektů stran).",
            WARN_TEMPLATE_OPEN: "Šablona je již otevřená s neuloženými změnami. Zpracování ji zavře bez uložení a změny zahodí. Pokračovat?",

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
            SCAN_FILE_PARTIAL:  "%s: %s stran — %s pozic odebráno z posledního archu.",
            SCAN_FILE_UNREAD:   "%s: počet stran nelze zjistit — relinkne se vše bez odebrání.",
            SCAN_FILE_UNCERTAIN: "%s: nejednoznačný počet stran (/Count %s vs %s objektů stran) — BUDE PŘESKOČENO, zkontrolujte ručně",
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
    version: "3.0.0",
    debug: false,

    ui: {
        title: null,
        labelWidth: 190,
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
     * @returns {Object} { relinked, skipped, removed, warnings, errors }
     */
    relinkDocument: function (doc, targetPdf, totalPages) {
        var results = {
            relinked: 0, skipped: 0, removed: 0,
            relinkedItems: [], warnings: [], errors: [], ok: false
        };
        var items = doc.placedItems;
        var i, item, label;

        for (i = 0; i < items.length; i++) {
            item = items[i];
            label = item.name || ("item_" + i);

            if (!item.file) {
                results.skipped++;
                continue;
            }

            if (this._isOnHiddenLayer(item)) {
                results.warnings.push(BRE.L.format(BRE.L.ERR_HIDDEN_LAYER, label));
                results.skipped++;
                continue;
            }

            if (totalPages > 0 && item.pageNumber && item.pageNumber > totalPages) {
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

        if (totalPages > 0) {
            // Remove ONLY managed positions (linked + visible) whose page is
            // beyond the source PDF. Deliberately-skipped items — fileless or
            // on a hidden layer — are never removed: their pageNumber refers to
            // a DIFFERENT document and must not be compared to this PDF.
            // Reverse iteration is required when removing from a live collection.
            for (i = items.length - 1; i >= 0; i--) {
                try {
                    item = items[i];
                    if (!item.file || this._isOnHiddenLayer(item)) continue;
                    if (item.pageNumber && item.pageNumber > totalPages) {
                        item.remove();
                        results.removed++;
                    }
                } catch (e) {
                    results.errors.push(BRE.L.format(BRE.L.ERR_RELINK_ITEM, "remove_" + i, e.message));
                }
            }

            // Post-condition: no surviving MANAGED item may reference a page
            // beyond the source. If one does, a remove() silently failed —
            // flag it so the caller refuses to export a lossy sheet.
            for (i = 0; i < items.length; i++) {
                try {
                    item = items[i];
                    if (!item.file || this._isOnHiddenLayer(item)) continue;
                    if (item.pageNumber && item.pageNumber > totalPages) {
                        results.errors.push(
                            BRE.L.format(BRE.L.ERR_REMOVE_FAIL, String(item.pageNumber))
                        );
                    }
                } catch (e) {}
            }
        }

        results.ok = (results.errors.length === 0);
        return results;
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

    /**
     * Reads page count from PDF binary data (highest /Count in the page tree).
     * @param {File} pdfFile - The PDF file to inspect.
     * @returns {number} Page count, or 0 on failure.
     */
    countPdfPages: function (pdfFile) {
        var content = this._readPdfBinary(pdfFile);
        if (content === null) return 0;
        return this._maxCount(content);
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
     * @returns {Object} { items: [{name, pages, pageObjs, status}], counts, processable }
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
            items.push({ name: name, pages: pages, pageObjs: pageObjs, status: status });
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

        var templatePath = this._addFileRow(inputPanel, l.LBL_TEMPLATE,
            false, "*.ai", l.TIP_TEMPLATE, l.TIP_TEMPLATE_BTN);
        var sourcePath = this._addFileRow(inputPanel, l.LBL_SOURCE,
            true, undefined, l.TIP_SOURCE, l.TIP_SOURCE_BTN);
        var outputPath = this._addFileRow(inputPanel, l.LBL_OUTPUT,
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

        var infoText = l.format(l.PREVIEW_TEMPLATE, config.templateName, String(slotCount))
            + "\n" + l.format(l.PREVIEW_SOURCE, String(config.pdfFiles.length))
            + "\n" + l.format(l.PREVIEW_SAMPLE, sampleName);

        var infoST = dlg.add("statictext", undefined, infoText, { multiline: true });
        infoST.preferredSize.width = 500;

        // --- Pre-flight scan summary (counts) ---
        var c = scan.counts;
        var summary = l.format(l.SCAN_HEADER, String(slotCount))
            + "\n  " + l.format(l.SCAN_OK, String(c.ok));
        if (c.partial > 0)    summary += "\n  " + l.format(l.SCAN_PARTIAL, String(c.partial));
        if (c.under > 0)      summary += "\n  " + l.format(l.SCAN_UNDER, String(c.under));
        if (c.unreadable > 0) summary += "\n  " + l.format(l.SCAN_UNREADABLE, String(c.unreadable));
        if (c.over > 0)       summary += "\n  " + l.format(l.SCAN_OVER, String(c.over));
        if (c.uncertain > 0)  summary += "\n  " + l.format(l.SCAN_UNCERTAIN, String(c.uncertain));

        var sumST = dlg.add("statictext", undefined, summary, { multiline: true });
        sumST.preferredSize.width = 500;

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
                details.push(l.format(l.SCAN_FILE_UNCERTAIN, it.name, String(it.pages), String(it.pageObjs)));
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
        if (results.blocked > 0) {
            summaryLine += "   |   " + l.LOG_BLOCKED + ": " + results.blocked;
        }
        if (results.removed > 0) {
            summaryLine += "   |   " + l.LOG_REMOVED + ": " + results.removed;
        }
        if (results.cancelled) {
            var completed = results.success + results.errors + results.skipped + results.blocked;
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
     * The field starts empty — ScriptUI has no greyed placeholder, so a
     * descriptive default value would be mistaken for a real path by the
     * validation. The label plus helpTip convey the field's purpose.
     * @returns {EditText} The text input element.
     */
    _addFileRow: function (parent, label, isFolder, ext, tipField, tipBtn) {
        var l = BRE.L;
        var c = BRE.Config;

        var grp = parent.add("group");
        grp.alignChildren = ["left", "center"];
        var st = grp.add("statictext", undefined, label);
        st.preferredSize.width = c.ui.labelWidth;
        var et = grp.add("edittext", undefined, "");
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

        if (!BRE.UI.showPreview(config, slotCount, scan)) return;

        // Processing loop
        var results = {
            success: 0, errors: 0, skipped: 0, blocked: 0, removed: 0,
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

                // Hard block: a file with more pages than positions would
                // silently drop pages. Refuse to process — never emit a lossy
                // sheet (the user cannot manually verify a large batch).
                var fileInfo = scan.items[i];
                if (fileInfo.status === "over") {
                    results.blocked++;
                    results.log.push(outputName + ": " + BRE.L.format(
                        BRE.L.ERR_OVER_PAGES, String(fileInfo.pages), String(slotCount)));
                    continue;
                }
                if (fileInfo.status === "uncertain") {
                    results.blocked++;
                    results.log.push(outputName + ": " + BRE.L.format(
                        BRE.L.ERR_UNCERTAIN, String(fileInfo.pages), String(fileInfo.pageObjs)));
                    continue;
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

                    try {
                        // Reuse the page count from the pre-flight scan
                        // (already counted once — no need to re-read the PDF).
                        var relinkResult = BRE.Core.relinkDocument(doc, currentFile, fileInfo.pages);

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
