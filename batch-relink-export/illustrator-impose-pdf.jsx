// ============================================================================
// Script:      illustrator-impose-pdf.jsx
// Version:     1.0.0
// Author:      Osva1d
// Updated:     2026-03-17
//
// Description:
//   Automated N-up imposition from a multi-page PDF source.
//   Uses an Illustrator template to define layout — each PlacedItem
//   represents one slot on the sheet. The script reads slot geometry,
//   then pages through the source PDF, placing the correct page
//   into each slot and exporting one sheet at a time.
//
//   No manual PDF splitting required. Best suited for templates
//   where PlacedItems are NOT inside clipping groups (simple layouts).
//   For templates with clipping masks and manual adjustments,
//   use illustrator-batch-relink-export.jsx with pre-split PDFs.
// ============================================================================

#target illustrator

try {
(function () {

    // ========================================================================
    // UI Strings
    // ========================================================================
    var S = {
        TITLE:             "Imposice PDF",
        PANEL_INPUT:       "Vstupní soubory",
        PANEL_CONFIG:      "Konfigurace exportu",
        LABEL_TEMPLATE:    "Šablona (.ai)",
        LABEL_SOURCE:      "Zdrojové PDF",
        LABEL_OUTPUT:      "Výstupní složka",
        LABEL_PAGES:       "Celkový počet stran",
        PH_TEMPLATE:       "Cesta k souboru šablony…",
        PH_SOURCE:         "Cesta k vícestránkovému PDF…",
        PH_OUTPUT:         "Cesta pro uložení archů…",
        LABEL_PREFIX:      "Prefix výstupního souboru",
        LABEL_PRESET:      "PDF Preset",
        LABEL_ARTBOARD:    "Rozsah artboardů",
        BTN_BROWSE:        "Vybrat…",
        BTN_DETECT:        "Detekovat",
        BTN_RUN:           "Spustit",
        BTN_CANCEL:        "Zrušit",
        BTN_CLOSE:         "Zavřít",
        BTN_STOP:          "Storno",
        BROWSE_FOLDER:     "Vyberte složku:",
        BROWSE_FILE:       "Vyberte soubor:",
        CB_SKIP:           "Přeskočit existující soubory",
        CB_OPEN_FOLDER:    "Po dokončení otevřít výstupní složku",
        ERR_TEMPLATE:      "Neplatná šablona AI.",
        ERR_SOURCE:        "Zdrojové PDF neexistuje.",
        ERR_OUTPUT_ASK:    "Výstupní složka neexistuje. Vytvořit?",
        ERR_OUTPUT_FAIL:   "Nepodařilo se vytvořit výstupní složku.",
        ERR_PRESET:        "Musíte vybrat PDF Preset.",
        ERR_NO_SLOTS:      "V šabloně nebyly nalezeny žádné PlacedItems (sloty).",
        ERR_PAGES:         "Neplatný počet stran.",
        ERR_PROCESS:       "Chyba při zpracování archu",
        ERR_PLACE:         "Chyba při umístění stránky",
        PROGRESS_TITLE:    "Generování archů…",
        PROGRESS_INIT:     "Připravuji…",
        LOG_TITLE:         "Výsledek imposice",
        LOG_SUCCESS:       "Úspěšně",
        LOG_ERRORS:        "Chyby",
        LOG_SKIPPED:       "Přeskočeno",
        LOG_ALL_OK:        "Vše proběhlo bez chyb.",
        LOG_DETAILS:       "Detaily chyb a varování",
        LOG_PARTIAL:       "Neúplný arch",
        SKIP_MSG:          "Přeskočeno (soubor existuje)",
        TIP_TEMPLATE:      "Šablona s PlacedItems definujícími pozice na archu",
        TIP_TEMPLATE_BTN:  "Vybrat soubor šablony",
        TIP_SOURCE:        "Vícestránkové PDF (vstupenky, vizitky…)",
        TIP_SOURCE_BTN:    "Vybrat zdrojové PDF",
        TIP_OUTPUT:        "Cílová složka pro tiskové archy",
        TIP_OUTPUT_BTN:    "Vybrat výstupní složku",
        TIP_PREFIX:        "Předpona názvu každého archu",
        TIP_PRESET:        "Profil kvality PDF pro export",
        TIP_ARTBOARD:      "Rozsah artboardů, např. \"1\" (prázdné = všechny)",
        TIP_PAGES:         "Celkový počet stran ve zdrojovém PDF",
        TIP_DETECT:        "Automaticky zjistit počet stran (může trvat chvíli)",
        TIP_SKIP:          "Pokud výstupní soubor již existuje, přeskočí se",
        TIP_OPEN:          "Po dokončení otevře výstupní složku"
    };

    // ========================================================================
    // Dialog — Input Panel
    // ========================================================================
    var dialog = new Window("dialog", S.TITLE);
    dialog.orientation   = "column";
    dialog.alignChildren = ["fill", "top"];
    dialog.margins       = 20;
    dialog.spacing       = 15;

    var inputPanel = dialog.add("panel", undefined, S.PANEL_INPUT);
    inputPanel.orientation   = "column";
    inputPanel.alignChildren = ["fill", "top"];
    inputPanel.margins = 15;
    inputPanel.spacing = 10;

    function addFileRow(parent, label, placeholder, isFolder, ext, tipField, tipBtn) {
        var grp = parent.add("group");
        grp.alignChildren = ["left", "center"];
        var st = grp.add("statictext", undefined, label);
        st.preferredSize.width = 160;
        var et = grp.add("edittext", undefined, placeholder);
        et.preferredSize.width = 300;
        if (tipField) et.helpTip = tipField;
        var btn = grp.add("button", undefined, S.BTN_BROWSE);
        if (tipBtn) btn.helpTip = tipBtn;
        btn.onClick = function () {
            var sel;
            if (isFolder) {
                sel = Folder.selectDialog(S.BROWSE_FOLDER);
            } else {
                sel = File.openDialog(S.BROWSE_FILE, ext);
            }
            if (sel) et.text = sel.fsName;
        };
        return et;
    }

    var templatePath = addFileRow(inputPanel, S.LABEL_TEMPLATE, S.PH_TEMPLATE,
        false, "*.ai", S.TIP_TEMPLATE, S.TIP_TEMPLATE_BTN);
    var sourcePath = addFileRow(inputPanel, S.LABEL_SOURCE, S.PH_SOURCE,
        false, "*.pdf", S.TIP_SOURCE, S.TIP_SOURCE_BTN);
    var outputPath = addFileRow(inputPanel, S.LABEL_OUTPUT, S.PH_OUTPUT,
        true, undefined, S.TIP_OUTPUT, S.TIP_OUTPUT_BTN);

    // Page count — manual entry + auto-detect button
    var pagesGrp = inputPanel.add("group");
    pagesGrp.alignChildren = ["left", "center"];
    var pagesST = pagesGrp.add("statictext", undefined, S.LABEL_PAGES);
    pagesST.preferredSize.width = 160;
    var pagesInput = pagesGrp.add("edittext", undefined, "");
    pagesInput.preferredSize.width = 60;
    pagesInput.helpTip = S.TIP_PAGES;
    var detectBtn = pagesGrp.add("button", undefined, S.BTN_DETECT);
    detectBtn.helpTip = S.TIP_DETECT;

    // ========================================================================
    // Dialog — Config Panel
    // ========================================================================
    var configPanel = dialog.add("panel", undefined, S.PANEL_CONFIG);
    configPanel.orientation   = "column";
    configPanel.alignChildren = ["fill", "top"];
    configPanel.margins = 15;
    configPanel.spacing = 10;

    // Prefix
    var prefixGrp = configPanel.add("group");
    prefixGrp.alignChildren = ["left", "center"];
    var prefixST = prefixGrp.add("statictext", undefined, S.LABEL_PREFIX);
    prefixST.preferredSize.width = 160;
    var prefixInput = prefixGrp.add("edittext", undefined, "arch_");
    prefixInput.preferredSize.width = 100;
    prefixInput.helpTip = S.TIP_PREFIX;

    // PDF Preset
    var presetGrp = configPanel.add("group");
    presetGrp.alignChildren = ["left", "center"];
    var presetST = presetGrp.add("statictext", undefined, S.LABEL_PRESET);
    presetST.preferredSize.width = 160;
    var presetDDL = presetGrp.add("dropdownlist", undefined, []);
    presetDDL.preferredSize.width = 200;
    presetDDL.helpTip = S.TIP_PRESET;

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
            if (pdfPresets[di].indexOf("High Quality") !== -1 ||
                pdfPresets[di].indexOf("Tisková kvalita") !== -1) {
                defaultIdx = di;
                break;
            }
        }
        presetDDL.selection = defaultIdx;
    }

    // Artboard range
    var abGrp = configPanel.add("group");
    abGrp.alignChildren = ["left", "center"];
    var abST = abGrp.add("statictext", undefined, S.LABEL_ARTBOARD);
    abST.preferredSize.width = 160;
    var artboardInput = abGrp.add("edittext", undefined, "1");
    artboardInput.preferredSize.width = 60;
    artboardInput.helpTip = S.TIP_ARTBOARD;

    // Checkboxes
    var skipCB = configPanel.add("checkbox", undefined, S.CB_SKIP);
    skipCB.helpTip = S.TIP_SKIP;

    var openCB = configPanel.add("checkbox", undefined, S.CB_OPEN_FOLDER);
    openCB.value = true;
    openCB.helpTip = S.TIP_OPEN;

    // ========================================================================
    // Dialog — Footer
    // ========================================================================
    var footerGrp = dialog.add("group");
    footerGrp.alignment = ["right", "center"];
    footerGrp.spacing   = 8;
    footerGrp.add("button", undefined, S.BTN_CANCEL, { name: "cancel" });
    footerGrp.add("button", undefined, S.BTN_RUN,    { name: "ok" });

    // ========================================================================
    // Detect page count — binary search (runs while dialog is open)
    // ========================================================================
    /**
     * Reads page count directly from PDF binary data.
     * Finds the highest /Count value in Pages dictionaries,
     * which corresponds to the root page tree's total page count.
     */
    function countPdfPages(pdfFile) {
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
    }

    detectBtn.onClick = function () {
        var pdf = new File(sourcePath.text);
        if (!pdf.exists || !/\.pdf$/i.test(pdf.name)) {
            alert(S.ERR_SOURCE);
            return;
        }
        var count = countPdfPages(pdf);
        if (count > 0) {
            pagesInput.text = String(count);
        } else {
            alert(S.ERR_PAGES);
        }
    };

    // ========================================================================
    // Show dialog
    // ========================================================================
    if (dialog.show() !== 1) return;

    // ========================================================================
    // Validation
    // ========================================================================
    var templateFile  = new File(templatePath.text);
    var sourceFile    = new File(sourcePath.text);
    var outputFolder  = new Folder(outputPath.text);
    var prefix        = prefixInput.text;
    var preset        = presetDDL.selection ? presetDDL.selection.text : "";
    var artboardRange = artboardInput.text;
    var totalPages    = parseInt(pagesInput.text, 10);
    var skipExisting  = skipCB.value;
    var openAfter     = openCB.value;

    if (!templateFile.exists || !/\.ai$/i.test(templateFile.name)) {
        alert(S.ERR_TEMPLATE); return;
    }
    if (!sourceFile.exists || !/\.pdf$/i.test(sourceFile.name)) {
        alert(S.ERR_SOURCE); return;
    }
    if (!outputFolder.exists) {
        if (confirm(S.ERR_OUTPUT_ASK)) {
            if (!outputFolder.create()) { alert(S.ERR_OUTPUT_FAIL); return; }
        } else { return; }
    }
    if (!preset) { alert(S.ERR_PRESET); return; }
    if (isNaN(totalPages) || totalPages < 1) { alert(S.ERR_PAGES); return; }

    // ========================================================================
    // Read slot geometry from template + Processing loop
    // ========================================================================
    var slots = [];
    var slotsPerSheet = 0;
    var totalSheets   = 0;
    var successCount    = 0;
    var errorCount      = 0;
    var skipCount       = 0;
    var errors          = [];
    var warnings        = [];
    var cancelled       = false;
    var progressDlg     = null;
    var progressBar     = null;
    var statusText      = null;
    var doc             = null;

    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

    try {
        var tplDoc = app.open(templateFile);
        var items  = tplDoc.placedItems;

        if (items.length === 0) {
            tplDoc.close(SaveOptions.DONOTSAVECHANGES);
            alert(S.ERR_NO_SLOTS);
            return;
        }

        for (var si = 0; si < items.length; si++) {
            var it = items[si];
            slots.push({
                top:    it.top,
                left:   it.left,
                width:  it.width,
                height: it.height
            });
        }

        // Illustrator's placedItems collection is in stacking order
        // (top-to-bottom in the Layers panel). Reverse to get visual
        // reading order (top-left first). If slot assignment is wrong
        // after testing, this is the line to adjust.
        slots.reverse();

        tplDoc.close(SaveOptions.DONOTSAVECHANGES);

        slotsPerSheet = slots.length;
        totalSheets   = Math.ceil(totalPages / slotsPerSheet);

        // Progress palette
        progressDlg = new Window("palette", S.PROGRESS_TITLE, undefined,
            { closeButton: false });
        progressDlg.orientation   = "column";
        progressDlg.alignChildren = ["fill", "top"];
        progressDlg.margins = 15;
        progressDlg.spacing = 10;
        statusText  = progressDlg.add("statictext", undefined, S.PROGRESS_INIT);
        statusText.preferredSize.width = 450;
        progressBar = progressDlg.add("progressbar", undefined, 0, totalSheets);
        progressBar.preferredSize.width = 450;
        var cancelBtn   = progressDlg.add("button", undefined, S.BTN_STOP);
        cancelBtn.alignment = ["center", "center"];
        cancelBtn.onClick = function () { cancelled = true; };
        progressDlg.show();

        for (var sheetIdx = 0; sheetIdx < totalSheets; sheetIdx++) {
            if (cancelled) break;

            // Zero-padded sheet number
            var sheetNum = String(sheetIdx + 1);
            var padLen = String(totalSheets).length;
            while (sheetNum.length < padLen) sheetNum = "0" + sheetNum;

            var outputName = prefix + sheetNum + ".pdf";
            var outputFile = new File(outputFolder.fsName + "/" + outputName);

            statusText.text = "Arch " + (sheetIdx + 1) + " z " + totalSheets +
                " (" + outputName + ")";
            progressBar.value = sheetIdx;
            progressDlg.update();

            try {
                // Skip existing
                if (skipExisting && outputFile.exists) {
                    skipCount++;
                    warnings.push(outputName + ": " + S.SKIP_MSG);
                    continue;
                }

                // Open fresh template
                doc = app.open(templateFile);

                // Remove all existing PlacedItems
                var existingItems = doc.placedItems;
                for (var ri = existingItems.length - 1; ri >= 0; ri--) {
                    existingItems[ri].remove();
                }

                // Place each page into its slot
                var pagesOnSheet = 0;
                for (var slotIdx = 0; slotIdx < slotsPerSheet; slotIdx++) {
                    var pageNum = sheetIdx * slotsPerSheet + slotIdx + 1;
                    if (pageNum > totalPages) break;

                    try {
                        var placed = doc.placedItems.add();
                        placed.file = sourceFile;
                        placed.pageNumber = pageNum;

                        // Apply saved geometry from template
                        var slot = slots[slotIdx];
                        placed.top    = slot.top;
                        placed.left   = slot.left;
                        placed.width  = slot.width;
                        placed.height = slot.height;

                        pagesOnSheet++;
                    } catch (pe) {
                        errors.push(outputName + " / p." + pageNum + ": " +
                            S.ERR_PLACE + " (" + pe.message + ")");
                    }
                }

                // Skip export if no pages were placed (all slots failed)
                if (pagesOnSheet === 0) {
                    errorCount++;
                    errors.push(outputName + ": " + S.ERR_PLACE + " (0/" + slotsPerSheet + ")");
                    doc.close(SaveOptions.DONOTSAVECHANGES);
                    doc = null;
                    continue;
                }

                // Note partial last sheet in log
                if (pagesOnSheet < slotsPerSheet) {
                    warnings.push(outputName + ": " + S.LOG_PARTIAL +
                        " (" + pagesOnSheet + "/" + slotsPerSheet + ")");
                }

                // Export PDF
                var pdfOpts = new PDFSaveOptions();
                try {
                    pdfOpts.pDFPreset = preset;
                } catch (presetErr) {
                    pdfOpts.compatibility = PDFCompatibility.ACROBAT7;
                    pdfOpts.preserveEditability = false;
                }
                pdfOpts.saveMultipleArtboards = true;
                pdfOpts.artboardRange = artboardRange || "";

                doc.saveAs(outputFile, pdfOpts);
                doc.close(SaveOptions.DONOTSAVECHANGES);
                doc = null;
                successCount++;

            } catch (e) {
                errorCount++;
                errors.push(outputName + ": " + S.ERR_PROCESS +
                    " (" + e.message + ")");
                try {
                    if (doc) {
                        doc.close(SaveOptions.DONOTSAVECHANGES);
                        doc = null;
                    }
                } catch (ce) {}
            }
        }
        if (progressBar) progressBar.value = totalSheets;
    } finally {
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
        try { if (progressDlg) progressDlg.close(); } catch (pc) {}
    }

    // ========================================================================
    // Summary log
    // ========================================================================
    var logWin = new Window("dialog", S.LOG_TITLE);
    logWin.orientation   = "column";
    logWin.alignChildren = ["fill", "top"];
    logWin.margins  = 20;
    logWin.spacing  = 15;

    var summaryLine = S.LOG_SUCCESS + ": " + successCount + " archů" +
        "   |   " + S.LOG_ERRORS + ": " + errorCount +
        "   |   " + S.LOG_SKIPPED + ": " + skipCount +
        "\nSlotů na arch: " + slotsPerSheet +
        "   |   Celkem stran: " + totalPages +
        "   |   Celkem archů: " + totalSheets;
    if (cancelled) {
        var completed = successCount + errorCount + skipCount;
        summaryLine += "\nZrušeno uživatelem po " +
            completed + " z " + totalSheets + " archů.";
    }
    var summST = logWin.add("statictext", undefined, summaryLine,
        { multiline: true });
    summST.preferredSize.width = 500;

    var logEntries = errors.concat(warnings);
    if (logEntries.length > 0) {
        var detailPanel = logWin.add("panel", undefined, S.LOG_DETAILS);
        detailPanel.alignChildren = ["fill", "fill"];
        detailPanel.margins = 15;
        var logBox = detailPanel.add("edittext", undefined, logEntries.join("\n"),
            { multiline: true, scrolling: true, "readonly": true });
        logBox.preferredSize = [480, 200];
    } else {
        logWin.add("statictext", undefined, S.LOG_ALL_OK);
    }

    var closeGrp = logWin.add("group");
    closeGrp.alignment = ["right", "center"];
    closeGrp.spacing   = 8;
    closeGrp.add("button", undefined, S.BTN_CLOSE, { name: "ok" });

    logWin.show();

    // Open output folder (Folder.execute() — standard ExtendScript API)
    if (openAfter && successCount > 0) {
        try { outputFolder.execute(); } catch (oe) {}
    }

})();
} catch (e) {
    try { app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS; } catch (x) {}
    alert("Kritická chyba: " + e.message + "\n\nŘádek: " + e.line);
}
