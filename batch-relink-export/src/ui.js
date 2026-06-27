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
        namingInput.alignment = ["fill", "center"];
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
            "© 2025–2026 Osva1d — " + c.scriptName + " v" + c.version);
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
        // Fixed width — macOS ScriptUI won't grow a fill field ahead of a button.
        var et = grp.add("edittext", undefined, "");
        et.preferredSize.width = c.ui.pathFieldWidth;
        if (tipField) et.helpTip = tipField;
        var btn = grp.add("button", undefined, l.BTN_BROWSE);
        btn.preferredSize.width = c.ui.browseBtnWidth;
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
