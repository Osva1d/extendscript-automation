// ============================================================================
// Script:      illustrator-batch-relink-export.jsx
// Version:     2.0.0
// Author:      Osva1d
// Updated:     2026-03-15
//
// Description:
//   Automates relinking of PDF files in an AI template and exporting to PDF.
//   Batch processes all PDFs in a source folder against a single template.
// ============================================================================

#target illustrator

try {
(function () {

    // ========================================================================
    // UI Strings
    // ========================================================================
    var S = {
        TITLE:            "Dávkové zpracování PDF",
        PANEL_INPUT:      "Výběr vstupů a složek",
        PANEL_CONFIG:     "Konfigurace exportu",
        LABEL_TEMPLATE:   "Šablona (.ai)",
        LABEL_SOURCE:     "Zdrojová složka (PDF)",
        LABEL_OUTPUT:     "Výstupní složka",
        PH_TEMPLATE:      "Cesta k souboru šablony…",
        PH_SOURCE:        "Cesta ke složce s PDF…",
        PH_OUTPUT:        "Cesta pro uložení exportů…",
        LABEL_PREFIX:     "Prefix výstupního souboru",
        LABEL_PRESET:     "PDF Preset",
        LABEL_ARTBOARD:   "Rozsah artboardů",
        BTN_BROWSE:       "Vybrat…",
        BTN_RUN:          "Spustit",
        BTN_CANCEL:       "Zrušit",
        BTN_CLOSE:        "Zavřít",
        BTN_STOP:         "Storno",
        BROWSE_FOLDER:    "Vyberte složku:",
        BROWSE_FILE:      "Vyberte soubor:",
        CB_SKIP:          "Přeskočit existující soubory",
        CB_OPEN_FOLDER:   "Po dokončení otevřít výstupní složku",
        ERR_TEMPLATE:     "Neplatná šablona AI.",
        ERR_SOURCE:       "Zdrojová složka neexistuje.",
        ERR_OUTPUT_ASK:   "Výstupní složka neexistuje. Vytvořit?",
        ERR_OUTPUT_FAIL:  "Nepodařilo se vytvořit výstupní složku.",
        ERR_PRESET:       "Musíte vybrat PDF Preset.",
        ERR_NO_PDF:       "Ve vybrané složce nebyly nalezeny žádné PDF soubory.",
        ERR_NO_LINKS:     "V šabloně nebyly nalezeny propojené objekty.",
        ERR_NO_RELINK:    "Žádný PDF propojený objekt nebyl nalezen k relinkování.",
        ERR_PRESET_FALLBACK: "PDF Preset nebyl nalezen. Použito záložní nastavení.",
        ERR_PROCESS:      "Chyba při zpracování",
        PROGRESS_TITLE:   "Zpracování souborů…",
        PROGRESS_INIT:    "Připravuji…",
        LOG_TITLE:        "Výsledek zpracování",
        LOG_SUCCESS:      "Úspěšně",
        LOG_ERRORS:       "Chyby",
        LOG_SKIPPED:      "Přeskočeno",
        LOG_ALL_OK:       "Vše proběhlo bez chyb.",
        LOG_DETAILS:      "Detaily chyb a varování",
        SKIP_MSG:         "Přeskočeno (soubor existuje)",
        TIP_TEMPLATE:     "Soubor šablony Illustrator (.ai) s propojeným PDF",
        TIP_TEMPLATE_BTN: "Vybrat soubor šablony",
        TIP_SOURCE:       "Složka obsahující zdrojové PDF soubory",
        TIP_SOURCE_BTN:   "Vybrat zdrojovou složku",
        TIP_OUTPUT:       "Cílová složka pro exportované PDF",
        TIP_OUTPUT_BTN:   "Vybrat výstupní složku",
        TIP_PREFIX:       "Předpona přidaná před název výstupního souboru",
        TIP_PRESET:       "Profil kvality PDF pro export",
        TIP_ARTBOARD:     "Rozsah artboardů, např. \"1\" nebo \"1-3\" (prázdné = všechny)",
        TIP_SKIP:         "Pokud výstupní soubor již existuje, přeskočí se",
        TIP_OPEN:         "Po dokončení otevře výstupní složku v systému"
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

    /**
     * Adds a labeled file/folder selection row.
     * Uses preferredSize (not pixel bounds) for DPI-safe layout.
     */
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
        true, undefined, S.TIP_SOURCE, S.TIP_SOURCE_BTN);
    var outputPath = addFileRow(inputPanel, S.LABEL_OUTPUT, S.PH_OUTPUT,
        true, undefined, S.TIP_OUTPUT, S.TIP_OUTPUT_BTN);

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

    // Skip existing checkbox
    var skipCB = configPanel.add("checkbox", undefined, S.CB_SKIP);
    skipCB.helpTip = S.TIP_SKIP;

    // Open output folder checkbox
    var openCB = configPanel.add("checkbox", undefined, S.CB_OPEN_FOLDER);
    openCB.value = true;
    openCB.helpTip = S.TIP_OPEN;

    // ========================================================================
    // Dialog — Footer (right-aligned, spacing 8)
    // ========================================================================
    var footerGrp = dialog.add("group");
    footerGrp.alignment = ["right", "center"];
    footerGrp.spacing   = 8;
    footerGrp.add("button", undefined, S.BTN_CANCEL, { name: "cancel" });
    footerGrp.add("button", undefined, S.BTN_RUN,    { name: "ok" });

    // ========================================================================
    // Show dialog — !== 1 catches cancel, close button, and any non-OK exit
    // ========================================================================
    if (dialog.show() !== 1) return;

    // ========================================================================
    // Validation
    // ========================================================================
    var templateFile = new File(templatePath.text);
    var sourceFolder = new Folder(sourcePath.text);
    var outputFolder = new Folder(outputPath.text);
    var prefix       = prefixInput.text;
    var preset       = presetDDL.selection ? presetDDL.selection.text : "";
    var artboardRange = artboardInput.text;
    var skipExisting = skipCB.value;
    var openAfter    = openCB.value;

    if (!templateFile.exists || !/\.ai$/i.test(templateFile.name)) {
        alert(S.ERR_TEMPLATE); return;
    }
    if (!sourceFolder.exists) {
        alert(S.ERR_SOURCE); return;
    }
    if (!outputFolder.exists) {
        if (confirm(S.ERR_OUTPUT_ASK)) {
            if (!outputFolder.create()) { alert(S.ERR_OUTPUT_FAIL); return; }
        } else { return; }
    }
    if (!preset) {
        alert(S.ERR_PRESET); return;
    }

    // Case-insensitive PDF filter (catches .pdf, .PDF, .Pdf)
    var pdfFiles = sourceFolder.getFiles(function (f) {
        return f instanceof File && /\.pdf$/i.test(f.name);
    });
    if (pdfFiles.length === 0) {
        alert(S.ERR_NO_PDF); return;
    }

    // ========================================================================
    // Processing loop
    // ========================================================================
    var successCount = 0;
    var errorCount   = 0;
    var skipCount    = 0;
    var errors       = [];
    var warnings     = [];
    var totalFiles   = pdfFiles.length;
    var cancelled    = false;

    // Progress palette with cancel button
    var progressDlg = new Window("palette", S.PROGRESS_TITLE, undefined,
        { closeButton: false });
    progressDlg.orientation   = "column";
    progressDlg.alignChildren = ["fill", "top"];
    progressDlg.margins = 15;
    progressDlg.spacing = 10;
    var statusText  = progressDlg.add("statictext", undefined, S.PROGRESS_INIT);
    statusText.preferredSize.width = 400;
    var progressBar = progressDlg.add("progressbar", undefined, 0, totalFiles);
    progressBar.preferredSize.width = 400;
    var cancelBtn   = progressDlg.add("button", undefined, S.BTN_STOP);
    cancelBtn.alignment = ["center", "center"];
    cancelBtn.onClick = function () { cancelled = true; };
    progressDlg.show();

    // try/finally guarantees userInteractionLevel is always restored
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
    var doc = null;

    try {
        for (var i = 0; i < totalFiles; i++) {
            if (cancelled) break;

            var currentFile    = pdfFiles[i];
            var sourceFileName = currentFile.displayName || decodeURI(currentFile.name);

            statusText.text = "Zpracovávám: " + sourceFileName +
                " (" + (i + 1) + " z " + totalFiles + ")";
            progressBar.value = i;
            progressDlg.update();

            try {
                // Skip existing output file
                var outputName = prefix + sourceFileName.replace(/\.pdf$/i, "") + ".pdf";
                var outputFile = new File(outputFolder.fsName + "/" + outputName);

                if (skipExisting && outputFile.exists) {
                    skipCount++;
                    warnings.push(sourceFileName + ": " + S.SKIP_MSG);
                    continue;
                }

                // Open template
                doc = app.open(templateFile);
                var links = doc.placedItems;

                if (links.length === 0) {
                    doc.close(SaveOptions.DONOTSAVECHANGES);
                    doc = null;
                    throw new Error(S.ERR_NO_LINKS);
                }

                // Relink ALL PlacedItems to the current source PDF.
                // Typical workflow: multi-page imposition template (e.g. 8-up
                // ticket sheet) where each PlacedItem points to a different
                // page of the SAME PDF. Relinking all items swaps the source
                // file while preserving individual pageNumber assignments.
                var relinked = false;
                for (var j = 0; j < links.length; j++) {
                    var link = links[j];
                    if (link.typename === "PlacedItem" && link.file) {
                        link.relink(currentFile);
                        relinked = true;
                    }
                }

                if (!relinked) {
                    doc.close(SaveOptions.DONOTSAVECHANGES);
                    doc = null;
                    throw new Error(S.ERR_NO_RELINK);
                }

                // Save PDF
                var pdfOpts = new PDFSaveOptions();
                try {
                    pdfOpts.pDFPreset = preset;
                } catch (pe) {
                    pdfOpts.compatibility = PDFCompatibility.ACROBAT7;
                    pdfOpts.preserveEditability = false;
                    errors.push(sourceFileName + ": " + S.ERR_PRESET_FALLBACK);
                }

                // Artboard range
                pdfOpts.saveMultipleArtboards = true;
                pdfOpts.artboardRange = artboardRange || "";

                doc.saveAs(outputFile, pdfOpts);
                doc.close(SaveOptions.DONOTSAVECHANGES);
                doc = null;
                successCount++;

            } catch (e) {
                errorCount++;
                errors.push(sourceFileName + ": " + S.ERR_PROCESS +
                    " (" + e.message + ")");
                try {
                    if (doc) {
                        doc.close(SaveOptions.DONOTSAVECHANGES);
                        doc = null;
                    }
                } catch (ce) {}
            }
        }
        progressBar.value = totalFiles;
    } finally {
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
        try { progressDlg.close(); } catch (pc) {}
    }

    // ========================================================================
    // Structured summary log
    // ========================================================================
    var logWin = new Window("dialog", S.LOG_TITLE);
    logWin.orientation   = "column";
    logWin.alignChildren = ["fill", "top"];
    logWin.margins  = 20;
    logWin.spacing  = 15;

    var summaryLine = S.LOG_SUCCESS + ": " + successCount +
        "   |   " + S.LOG_ERRORS + ": " + errorCount +
        "   |   " + S.LOG_SKIPPED + ": " + skipCount;
    if (cancelled) {
        var completed = successCount + errorCount + skipCount;
        summaryLine += "\nZrušeno uživatelem po zpracování " +
            completed + " z " + totalFiles + " souborů.";
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

    // Open output folder in Finder/Explorer after completion.
    // Folder.execute() is a standard ExtendScript API, reliable on both
    // macOS (opens Finder) and Windows (opens Explorer).
    if (openAfter && successCount > 0) {
        try { outputFolder.execute(); } catch (oe) {}
    }

})();
} catch (e) {
    try { app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS; } catch (x) {}
    alert("Kritická chyba: " + e.message + "\n\nŘádek: " + e.line);
}
