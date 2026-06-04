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

        var debugCB = configPanel.add("checkbox", undefined, l.CB_DEBUG);
        debugCB.helpTip = l.TIP_DEBUG;

        // --- Copyright footer (greyed) — extendscript-ui-standards §5 ---
        var copyGrp = dialog.add("group");
        copyGrp.alignment = ["fill", "top"];
        var stCopy = copyGrp.add("statictext", undefined,
            "© 2025–2026 Osva1d — " + c.scriptName + " v" + c.version);
        stCopy.enabled = false;

        // --- Buttons ---
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
        var debug = debugCB.value;

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
            debug: debug,
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
        if (results.manual > 0) {
            summaryLine += "   |   " + l.LOG_MANUAL_LABEL + ": " + results.manual;
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
