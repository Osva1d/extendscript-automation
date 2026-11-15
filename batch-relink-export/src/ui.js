// ------------------------------------------------------------------------
// Module: BRE.UI — Dialog, Progress, Summary
// Part of: Illustrator Batch Relink Export v3.0.0
// ------------------------------------------------------------------------

var BRE = BRE || {};

BRE.UI = {

    /**
     * Lists the source PDFs of a run: files only, no dotfiles (macOS
     * AppleDouble "._x.pdf" siblings on FAT/exFAT drives), "*.pdf" in any
     * case, not recursive, in natural order (part_2 before part_10).
     * @param {Folder} folder - The source folder.
     * @returns {Array} The PDF File objects, sorted.
     */
    listPdfs: function (folder) {
        var files = folder.getFiles(function (f) {
            if (!(f instanceof File)) return false;
            var nm = f.displayName || decodeURI(f.name);
            if (nm.charAt(0) === ".") return false;
            return /\.pdf$/i.test(nm);
        });
        files.sort(function (a, b) {
            return BRE.Core.naturalCompare(
                a.displayName || decodeURI(a.name),
                b.displayName || decodeURI(b.name)
            );
        });
        return files;
    },

    /**
     * Counts the PDFs in a folder given by path.
     * @param {string} path - Folder path.
     * @returns {number} -1 when the folder does not exist, else the PDF count.
     */
    countPdfs: function (path) {
        // Function form: new Folder(file path) is a Folder that exists (measured).
        var folder = Folder(path);
        if (!(folder instanceof Folder) || !folder.exists) return -1;
        return BRE.UI.listPdfs(folder).length;
    },

    /**
     * Reads the facts the live check needs from File/Folder and the open
     * documents. Does not list the source folder: the caller passes the count.
     * @param {{template: string, source: string, output: string}} t - Field texts.
     * @param {number} pdfCount - PDFs in the source folder (-1 = unknown).
     * @returns {Object} Facts for validate().
     */
    facts: function (t, pdfCount) {
        var tpl = new File(t.template);
        var tplExists = tpl.exists;
        var open = tplExists ? BRE.Core.findOpenDocument(tpl) : null;
        // Function form: new Folder(file path) is a Folder that exists (measured).
        var src = Folder(t.source);
        var out = Folder(t.output);
        return {
            templateExists: tplExists,
            templateIsAi: /\.ai$/i.test(tpl.name || t.template),
            templateOpenUnsaved: !!open && open.saved === false,
            sourceExists: src instanceof Folder && src.exists,
            pdfCount: pdfCount,
            outputExists: out instanceof Folder && out.exists,
            outputIsFile: out instanceof File && out.exists,
            sameFolder: BRE.Core.samePath(src.fsName, out.fsName, true)
        };
    },

    /**
     * The dialog's live check as a pure function (spec 3.3). Per field the
     * first matching rule wins; fields run in reading order.
     * @param {Object} s - {template, source, output, pattern, preset: {value, missing}, f}.
     * @returns {{errors: Array, warnings: Array, kind: string, text: string}}
     */
    validate: function (s) {
        var l = BRE.L, f = s.f, errors = [], warnings = [];
        function blank(v) { return /^\s*$/.test(v); }
        function err(field, text) { errors.push({ field: field, text: text }); }
        function warn(field, text) { warnings.push({ field: field, text: text }); }

        if (blank(s.template)) err("template", l.ERR_TEMPLATE_EMPTY);
        else if (!f.templateExists || !f.templateIsAi) err("template", l.ERR_TEMPLATE);
        else if (f.templateOpenUnsaved) warn("template", l.WARN_TEMPLATE_UNSAVED);

        if (blank(s.source)) err("source", l.ERR_SOURCE_EMPTY);
        else if (!f.sourceExists) err("source", l.ERR_SOURCE);
        else if (f.pdfCount === 0) err("source", l.ERR_NO_PDF);

        if (blank(s.output)) err("output", l.ERR_OUTPUT_EMPTY);
        else if (!blank(s.source) && f.sameFolder) err("output", l.ERR_OUTPUT_IS_SOURCE);
        else if (f.outputIsFile) err("output", l.ERR_OUTPUT_FAIL);
        else if (!f.outputExists) warn("output", l.WARN_OUTPUT_NEW);

        if (s.pattern.indexOf(BRE.Config.placeholders.N) === -1) {
            err("pattern", l.ERR_NAMING_PATTERN);
        }

        if (s.preset.value === "") err("preset", l.ERR_PRESET);
        else if (s.preset.missing) err("preset", l.format(l.ERR_PDF_PRESET_MISSING, s.preset.value));

        var kind = "OK", text;
        if (errors.length > 0) {
            kind = "ERR";
            text = errors[0].text;
            if (errors.length > 1) {
                text += " " + l.format(l.STATUS_MORE_ERRORS, errors.length - 1);
            }
        } else if (warnings.length > 0) {
            kind = "WARN";
            text = warnings[0].text;
        } else {
            text = l.count("PDF_READY", f.pdfCount);
        }
        return { errors: errors, warnings: warnings, kind: kind, text: text };
    },

    // The Kontrola window's layout values in one place
    // (extendscript-ui-standards §4.1). Each one departs from ScriptUI's
    // native sizing and says why. The main dialog writes none: its rows come
    // from BRE.UiKit with native spacing (design system §2.4).
    M: {
        // Buttons closer together than native 10.
        BUTTON_SPACING: 8,
        // Preview: one width for its lines — the verdict line, the info block
        // (explicit lines, so its height follows the text) and the header —
        // so they line up; the details box scrolls past its size.
        PREVIEW_W: 500,
        PREVIEW_MARGINS: 20,
        PREVIEW_SPACING: 10,
        PREVIEW_DETAILS: [480, 160],
        DETAILS_MARGINS: 15,
        // Status rows of the preview: the symbol close to its text, the rows
        // close to each other, indented a little under the header.
        ROW_SPACING: 7,
        ROWS_SPACING: 3,
        ROWS_MARGINS: [4, 2, 0, 2]
    },

    // ---------------------------------------------------------------------
    // Main dialog
    // ---------------------------------------------------------------------

    /**
     * Reads the active document for Použít aktivní dokument.
     * @returns {{state: string, path: string}} state "none" (no document),
     *     "never" (never saved: no file on disk), "notAi" (its file is not
     *     .ai) or "ok"; path is the document's file when it has one, else "".
     */
    activeDocInfo: function () {
        try {
            if (app.documents.length === 0) return { state: "none", path: "" };
        } catch (e) {
            BRE.Core._log("UI.activeDocInfo: " + e.message);
            return { state: "none", path: "" };
        }
        var f;
        try {
            f = app.activeDocument.fullName;
        } catch (e2) {
            // Guard only: measured 2026-11-12, fullName of a never-saved
            // document does not throw (see below).
            BRE.Core._log("UI.activeDocInfo: no file: " + e2.message);
            return { state: "never", path: "" };
        }
        // Measured 2026-11-12: it returns a File that is not on disk
        // ('/Bez názvu -1'), so a missing file means never saved, and only
        // a file that exists goes on to the .ai test.
        if (!f || !f.exists) return { state: "never", path: "" };
        return { state: /\.ai$/i.test(f.fsName) ? "ok" : "notAi", path: f.fsName };
    },

    /**
     * The PDF presets of this Illustrator.
     * @returns {Array} Preset names; ["[High Quality Print]"] when the list
     *     cannot be read.
     */
    pdfPresets: function () {
        try {
            return app.PDFPresetsList;
        } catch (e) {
            BRE.Core._log("UI.pdfPresets: " + e.message);
            return ["[High Quality Print]"];
        }
    },

    /**
     * Builds the main dialog from the shared kit (spec 3.1), without showing
     * it: panel Soubory (template, Použít aktivní dokument, source, output,
     * the two checkboxes), panel Pojmenování a formát (pattern, its legend,
     * the example name, the PDF preset), the status line and the footer.
     * Every keystroke in a field, every pick and every preset change re-runs
     * the live check (spec 3.3); Spustit stays grey while it finds an error.
     * @param {Object} saved - Remembered settings from BRE.Storage.load():
     *     { template, output, pattern, preset, openAfter, skip }.
     * @returns {Object} {w, template, source, output, pattern, preset, skip,
     *     open, activeBtn, runBtn, status, refresh, result}: the four fields
     *     are edittexts, preset the dropdownlist, skip and open checkboxes;
     *     result() is the config after a successful Run, else null.
     */
    buildMain: function (saved) {
        var c = BRE.Config, l = BRE.L, K = BRE.UiKit;

        // A row whose label belongs to no field: the active document's
        // button, the legend and the example name. Its label joins the axis,
        // as checkRow's empty one does.
        function row(parent, label) {
            var g = parent.add("group");
            g.alignment = ["fill", "top"];
            return { row: g, label: g.add("statictext", undefined, label) };
        }

        var w = new Window("dialog", c.ui.title);
        w.orientation = "column";
        w.alignChildren = ["fill", "top"];

        // --- Soubory ---
        var files = w.add("panel", undefined, l.PANEL_FILES);
        files.alignChildren = ["fill", "top"];
        var tpl = K.pathRow(files, { label: l.LBL_TEMPLATE, value: saved.template,
            tip: l.TIP_TEMPLATE, tipButton: l.TIP_TEMPLATE_BTN, button: l.BTN_BROWSE,
            folder: false, ext: "*.ai", prompt: l.BROWSE_TEMPLATE, onPick: refresh });
        var act = row(files, "");
        var activeBtn = act.row.add("button", undefined, l.BTN_ACTIVE_DOC);
        activeBtn.helpTip = l.TIP_ACTIVE_DOC;
        // The source changes with every job, so it is not remembered. A pick
        // lists the folder again even when the path is the same: PDFs may
        // have been copied in since.
        var src = K.pathRow(files, { label: l.LBL_SOURCE, value: "",
            tip: l.TIP_SOURCE, tipButton: l.TIP_SOURCE_BTN, button: l.BTN_BROWSE,
            folder: true, prompt: l.BROWSE_SOURCE,
            onPick: function () { lastSource = null; refresh(); } });
        var out = K.pathRow(files, { label: l.LBL_OUTPUT, value: saved.output,
            tip: l.TIP_OUTPUT, tipButton: l.TIP_OUTPUT_BTN, button: l.BTN_BROWSE,
            folder: true, prompt: l.BROWSE_OUTPUT, onPick: refresh });
        var skip = K.checkRow(files, { text: l.CB_SKIP, value: saved.skip, tip: l.TIP_SKIP });
        var open = K.checkRow(files, { text: l.CB_OPEN_FOLDER, value: saved.openAfter, tip: l.TIP_OPEN });

        // --- Pojmenování a formát ---
        var fmt = w.add("panel", undefined, l.PANEL_CONFIG);
        fmt.alignChildren = ["fill", "top"];
        var pat = K.textRow(fmt, { label: l.LBL_NAMING, value: saved.pattern, tip: l.TIP_NAMING });
        var leg = row(fmt, "");
        var legend = leg.row.add("statictext", undefined, l.NAMING_LEGEND);
        legend.enabled = false;
        // The example name is plain text, not bold (design system §2.2); a
        // long one is cut in the middle, where the order number and the
        // extension stay readable.
        var ex = row(fmt, l.LBL_PREVIEW);
        var example = ex.row.add("statictext", undefined, "", { truncate: "middle" });
        example.characters = K.TEXT_CHARS;
        example.alignment = ["fill", "center"];
        var presets = BRE.UI.pdfPresets();
        var pr = K.listRow(fmt, { label: l.LBL_PRESET, items: presets, tip: l.TIP_PRESET });
        // With nothing remembered: the first preset that looks like high
        // quality print, else "" — selectItem then takes the first item.
        function defaultPreset() {
            var i, j, pats = c.presetSearchPatterns;
            for (i = 0; i < presets.length; i++) {
                for (j = 0; j < pats.length; j++) {
                    if (String(presets[i]).indexOf(pats[j]) !== -1) return presets[i];
                }
            }
            return "";
        }
        // The preset chosen last time, shown "(chybí)" when this Illustrator
        // lacks it.
        K.selectItem(pr.list, saved.preset || defaultPreset(), l.DDL_MISSING_SUFFIX);

        var status = K.statusLine(w);
        var runBtn = K.footerRow(w, c.version, [
            { text: l.BTN_CANCEL, name: "cancel" },
            { text: l.BTN_RUN, name: "ok" }
        ]).buttons[1];

        // One axis over both panels (design system §2.5).
        K.axis([tpl.label, act.label, src.label, out.label, skip.label, open.label,
            pat.label, leg.label, ex.label, pr.label]);

        // --- Live check (spec 3.3) ---
        // refresh is a function declaration, so the path rows above can take
        // it as onPick; it first runs below, once every control exists.
        // The source folder is listed only when its path changed, not on
        // every keystroke in another field.
        var lastSource = null, pdfCount = -1;
        function refresh() {
            var t = { template: tpl.field.text, source: src.field.text, output: out.field.text };
            if (t.source !== lastSource) {
                lastSource = t.source;
                pdfCount = -1;
                if (!/^\s*$/.test(t.source)) {
                    try {
                        pdfCount = BRE.UI.countPdfs(t.source);
                    } catch (e) {
                        // A folder that cannot be listed has nothing to run.
                        BRE.Core._log("UI.refresh: countPdfs: " + e.message);
                        pdfCount = 0;
                    }
                }
            }
            var sel = pr.list.selection;
            var v = BRE.UI.validate({
                template: t.template, source: t.source, output: t.output,
                pattern: pat.field.text,
                preset: { value: K.listValue(pr.list), missing: !!(sel && sel.kitMissing) },
                f: BRE.UI.facts(t, pdfCount)
            });
            var bad = {}, i;
            for (i = 0; i < v.errors.length; i++) bad[v.errors[i].field] = true;
            BRE.FieldPaint.field(tpl.field, !bad.template);
            BRE.FieldPaint.field(src.field, !bad.source);
            BRE.FieldPaint.field(out.field, !bad.output);
            BRE.FieldPaint.field(pat.field, !bad.pattern);
            runBtn.enabled = v.errors.length === 0;
            K.setStatus(status, v.kind, v.text);

            var name;
            try {
                name = t.template
                    ? BRE.Core.stripExtension(decodeURI(new File(t.template).name))
                    : l.SAMPLE_TEMPLATE;
            } catch (e2) {
                // A malformed %-escape in a typed name; the example keeps
                // the sample name.
                BRE.Core._log("UI.refresh: template name: " + e2.message);
                name = l.SAMPLE_TEMPLATE;
            }
            example.text = BRE.Core.buildOutputName(pat.field.text, 0, 1, name, l.SAMPLE_SOURCE);
        }
        tpl.field.onChanging = refresh;
        src.field.onChanging = refresh;
        out.field.onChanging = refresh;
        pat.field.onChanging = refresh;
        pr.list.onChange = refresh;

        // --- Použít aktivní dokument (spec 3.4) ---
        // Read once: the dialog is modal, the open documents cannot change
        // while it is up.
        var doc = BRE.UI.activeDocInfo();
        activeBtn.enabled = doc.state !== "none";
        activeBtn.onClick = function () {
            if (doc.state === "ok") {
                tpl.field.text = doc.path;
                refresh();
                return;
            }
            K.setStatus(status, "ERR", doc.state === "never" ? l.ERR_ACTIVE_NEVER_SAVED : l.ERR_ACTIVE_NOT_AI);
        };

        // --- Run ---
        var result = null;
        runBtn.onClick = function () {
            // The check again, from the disk: a folder may have changed since
            // its path was typed. An error greys Spustit and stays put.
            lastSource = null;
            refresh();
            if (!runBtn.enabled) return;

            var templateFile = new File(tpl.field.text);
            var sourceFolder = new Folder(src.field.text);
            var outputFolder = new Folder(out.field.text);
            var config = {
                templateFile: templateFile,
                sourceFolder: sourceFolder,
                outputFolder: outputFolder,
                namingPattern: pat.field.text,
                preset: K.listValue(pr.list),
                skipExisting: skip.box.value,
                openAfter: open.box.value,
                pdfFiles: BRE.UI.listPdfs(sourceFolder),
                templateName: BRE.Core.stripExtension(
                    templateFile.displayName || decodeURI(templateFile.name))
            };
            // Ask before overwriting (spec 3.5); Ne leaves the dialog as it was.
            var n = K.existingCount(BRE.Core.overwriteCandidates(config));
            if (!K.confirmOverwrite(n, l.format(l.CONFIRM_OVERWRITE_FILES, l.count("FILES", n)))) return;
            // A missing output folder is a warning, created only now
            // (decision 2 in spec 9).
            if (!outputFolder.exists && !outputFolder.create()) {
                K.setStatus(status, "ERR", l.ERR_OUTPUT_FAIL);
                return;
            }
            result = config;
            w.close(1);
        };

        refresh();
        // Default focus: the one field that changes with every job, where a
        // path copied in Finder goes straight in (design system §5.3).
        src.field.active = true;

        return {
            w: w, template: tpl.field, source: src.field, output: out.field,
            pattern: pat.field, preset: pr.list, skip: skip.box, open: open.box,
            activeBtn: activeBtn, runBtn: runBtn, status: status, refresh: refresh,
            result: function () { return result; }
        };
    },

    /**
     * Shows the main dialog.
     * @param {Object} saved - Remembered settings from BRE.Storage.load().
     * @returns {Object|null} Config with templateFile, sourceFolder,
     *     outputFolder, namingPattern, preset, skipExisting, openAfter,
     *     pdfFiles, templateName; null on Storno.
     */
    show: function (saved) {
        var d = BRE.UI.buildMain(saved);
        if (d.w.show() !== 1) return null;
        return d.result();
    },

    // ---------------------------------------------------------------------
    // Kontrola souborů — the template, its page map and the source files
    // ---------------------------------------------------------------------

    /**
     * The template line: name, positions and artboards, page size(s).
     * @param {string} name - Template name.
     * @param {Object} info - Result of BRE.Core.inspectTemplate().
     * @returns {string}
     */
    templateLine: function (name, info) {
        var l = BRE.L;
        var counts = info.perArtboard.counts;
        var k = counts.length;
        var spread = l.count("POSITIONS", info.positions) + " " + l.count("ON_ARTBOARDS", k);
        if (k > 1) { spread += " (" + counts.join(" + ") + ")"; }
        if (info.perArtboard.outside > 0) {
            spread += ", " + l.format(l.OUTSIDE_ARTBOARDS, String(info.perArtboard.outside));
        }
        var sizes = [];
        for (var i = 0; i < info.sizes.length; i++) {
            sizes.push(l.format(l.SIZE_MM, BRE.Core._mm(info.sizes[i][0]), BRE.Core._mm(info.sizes[i][1])));
        }
        var size = sizes.length === 1
            ? l.format(l.PAGE_SIZE, sizes[0])
            : l.format(l.PAGE_SIZES, sizes.join(", "));
        return l.format(l.TEMPLATE_LINE, name, spread, size);
    },

    /**
     * The page map as a status: OK, or WARN with what is wrong.
     * @param {Object} map - info.pageMap from BRE.Core.describePageMap().
     * @param {number} n - Number of positions.
     * @returns {{kind: string, text: string}}
     */
    pageMapStatus: function (map, n) {
        var l = BRE.L;
        if (map.ok) { return { kind: "OK", text: l.format(l.MAP_OK, String(n)) }; }
        if (map.unknown) { return { kind: "WARN", text: l.MAP_UNKNOWN }; }
        var parts = [], i;
        for (i = 0; i < map.duplicates.length; i++) {
            parts.push(l.format(l.MAP_DUP, String(map.duplicates[i].page), String(map.duplicates[i].times)));
        }
        if (map.missing.length > 0) { parts.push(l.format(l.MAP_MISSING, map.missing.join(", "))); }
        if (map.beyond.length > 0) { parts.push(l.format(l.MAP_BEYOND, String(n), map.beyond.join(", "))); }
        return { kind: "WARN", text: l.format(l.MAP_BAD, String(n), parts.join(", ")) };
    },

    /**
     * The verdict's kind: ERR when nothing can be processed, WARN on any
     * deviation (a count other than ok, or a bad page map), else OK.
     * @param {Object} scan - Result of BRE.Core.scanSources().
     * @param {boolean} mapOk - info.pageMap.ok.
     * @returns {string} "ERR", "WARN" or "OK".
     */
    checkKind: function (scan, mapOk) {
        if (scan.processable === 0) { return "ERR"; }
        var c = scan.counts;
        if (c.partial > 0 || c.under > 0 || c.over > 0 || c.unreadable > 0 || !mapOk) { return "WARN"; }
        return "OK";
    },

    /**
     * Shows the check before processing begins: verdict, template, page map,
     * source count with an example name, the page counts per file. Disables
     * Continue when no file can be processed safely.
     * @param {Object} config - Validated config from show().
     * @param {Object} info - Result of BRE.Core.inspectTemplate().
     * @param {Object} scan - Result of BRE.Core.scanSources().
     * @returns {boolean} True if user confirms, false if cancelled.
     */
    showCheck: function (config, info, scan) {
        var l = BRE.L;
        var M = BRE.UI.M;
        var slotCount = info.positions;
        var pageMap = info.pageMap;

        var sampleName = BRE.Core.buildOutputName(
            config.namingPattern, 0, config.pdfFiles.length,
            config.templateName,
            BRE.Core.stripExtension(config.pdfFiles[0].displayName || decodeURI(config.pdfFiles[0].name))
        );

        var dlg = new Window("dialog", l.CHECK_TITLE);
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.margins = M.PREVIEW_MARGINS;
        dlg.spacing = M.PREVIEW_SPACING;

        // Verdict: processable / total / with a warning / blocked. Processable
        // includes the short and unreadable sheets, so they are counted apart.
        var total = config.pdfFiles.length;
        var verdictLine = BRE.UiKit.statusLine(dlg);
        BRE.UiKit.setStatus(verdictLine, BRE.UI.checkKind(scan, pageMap.ok), l.format(l.CHECK_VERDICT,
            String(scan.processable), l.count("VERDICT_OF", total),
            String(scan.processable - scan.counts.ok), String(total - scan.processable)));

        var tplST = dlg.add("statictext", undefined, BRE.UI.templateLine(config.templateName, info),
            { multiline: true });
        tplST.preferredSize.width = M.PREVIEW_W;

        var mapStatus = BRE.UI.pageMapStatus(pageMap, slotCount);
        var mapLine = BRE.UiKit.statusLine(dlg);
        BRE.UiKit.setStatus(mapLine, mapStatus.kind, mapStatus.text);

        var srcST = dlg.add("statictext", undefined,
            l.format(l.CHECK_SOURCES, String(total), sampleName), { truncate: "middle" });
        srcST.alignment = ["fill", "top"];

        // --- Pre-flight scan summary: header + one status row per count ---
        var c = scan.counts;
        var headerST = dlg.add("statictext", undefined, l.count("SCAN_HEADER", slotCount));
        headerST.preferredSize.width = M.PREVIEW_W;

        var rowsGrp = dlg.add("group");
        rowsGrp.orientation = "column";
        rowsGrp.alignChildren = ["left", "center"];
        rowsGrp.spacing = M.ROWS_SPACING;
        rowsGrp.margins = M.ROWS_MARGINS;

        function addCountRow(n, str, kind, force) {
            if (!force && n === 0) return;
            var g = rowsGrp.add("group");
            g.alignChildren = ["left", "center"];
            g.spacing = M.ROW_SPACING;
            var sym = g.add("statictext", undefined, BRE.UiKit.SYMBOL[kind]);
            BRE.FieldPaint.status(sym, kind);
            g.add("statictext", undefined, l.format(str, String(n)));
        }
        addCountRow(c.ok, l.SCAN_OK, "OK", true);
        addCountRow(c.partial, l.SCAN_PARTIAL, "WARN", false);
        addCountRow(c.under, l.SCAN_UNDER, "WARN", false);
        addCountRow(c.unreadable, l.SCAN_UNREADABLE, "WARN", false);
        addCountRow(c.over, l.SCAN_OVER, "ERR", false);

        // --- Details: the short-sheet note, then every file except "ok" ---
        var details = [];
        if (!pageMap.ok) { details.push(mapStatus.text); }
        if (!pageMap.ok && c.partial + c.under > 0) { details.push(l.CHECK_MAP_MANUAL); }
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
            }
        }
        if (details.length > 0) {
            var detPanel = dlg.add("panel", undefined, l.LOG_DETAILS);
            detPanel.alignChildren = ["fill", "fill"];
            detPanel.margins = M.DETAILS_MARGINS;
            var detBox = detPanel.add("edittext", undefined, details.join("\n"),
                { multiline: true, scrolling: true, "readonly": true });
            detBox.preferredSize = M.PREVIEW_DETAILS;
        }

        if (scan.processable === 0) {
            var noneST = dlg.add("statictext", undefined, l.SCAN_NONE);
            noneST.preferredSize.width = M.PREVIEW_W;
        }

        var footerGrp = dlg.add("group");
        footerGrp.alignment = ["right", "center"];
        footerGrp.spacing = M.BUTTON_SPACING;
        footerGrp.add("button", undefined, l.BTN_CANCEL, { name: "cancel" });
        var okBtn = footerGrp.add("button", undefined, l.BTN_CONTINUE, { name: "ok" });
        if (scan.processable === 0) okBtn.enabled = false;

        return dlg.show() === 1;
    },

    // ---------------------------------------------------------------------
    // Progress palette and summary — the shared modules progress.js and
    // summary.js (extendscript-ui-standards §12.5); BRE hands them its texts.
    // ---------------------------------------------------------------------

    /**
     * Creates and shows the progress palette (BRE.Progress). The batch stops
     * on held Esc, after the file in progress.
     * @param {number} total - Total number of files.
     * @returns {Object} { isCancelled(), poll(), update(i, name), finish(), close() }
     */
    createProgress: function (total) {
        var l = BRE.L;
        return BRE.Progress.create(total, {
            title: l.PROGRESS_TITLE,
            init: l.PROGRESS_INIT,
            item: l.PROGRESS_FILE,
            hint: l.PROGRESS_STOP_HINT,
            stopping: l.PROGRESS_STOPPING
        });
    },

    /**
     * Shows the summary after processing (BRE.Summary). A stopped batch gets
     * the cancellation note and never "all OK".
     * @param {Object} results - { success, errors, skipped, blocked, removed,
     *        manual, cancelled, total, log }
     * @param {Object} info - Result of BRE.Core.inspectTemplate().
     * @param {Object} config - Validated config (templateName).
     */
    showSummary: function (results, info, config) {
        var l = BRE.L;
        var pageMap = info.pageMap;
        var details = results.log;
        if (!pageMap.ok) {
            details = [BRE.UI.pageMapStatus(pageMap, info.positions).text].concat(results.log);
        }
        var note = null;
        if (results.cancelled) {
            var completed = results.success + results.errors + results.skipped + results.blocked;
            note = l.format(l.LOG_CANCELLED, String(completed), String(results.total));
        }
        BRE.Summary.show({
            title: l.LOG_TITLE,
            intro: BRE.UI.templateLine(config.templateName, info),
            pairs: [
                { label: l.LOG_SUCCESS, value: results.success, always: true },
                { label: l.LOG_ERRORS, value: results.errors, alert: true, always: true },
                { label: l.LOG_SKIPPED, value: results.skipped, always: true },
                { label: l.LOG_BLOCKED, value: results.blocked },
                { label: l.LOG_REMOVED, value: results.removed },
                { label: l.LOG_MANUAL_LABEL, value: results.manual }
            ],
            note: note,
            details: details,
            detailsTitle: l.LOG_DETAILS,
            allOk: l.LOG_ALL_OK,
            close: l.BTN_CLOSE
        });
    }
};
