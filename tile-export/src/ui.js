// ------------------------------------------------------------------------
// Module: TE.UI — dialog, live preview, preset handling
// Part of: Illustrator Tile Export
// Depends on: TE.Config, TE.Doc, TE.Grid, TE.L, TE.Storage, TE.Utils,
//             TE.Validate, TE.UIState
// ------------------------------------------------------------------------
var TE = TE || {};

TE.UI = {
    // Shared metrics — the dialog's alignment grid in one place.
    // Every entry is a [deviation] from native sizing and says why.
    M: {
        LABEL_COL: 150,   // label column; every row label shares this right edge
        NUM_FIELD:   7,   // characters, not px — numeric fields scale with locale
        PATH_FIELD: 26,   // characters; output path needs to show a usable tail
        BROWSE_MAX:  90   // px cap so fill slack goes to the path field, not the button
    },

    /**
     * Hard-locks a control's width. ScriptUI does not keep sibling groups in
     * columns on its own — only identical, fully-pinned cell widths do. All
     * three dimensions are needed: without minimumSize the cell collapses
     * below preferredSize; without maximumSize a label stretches it.
     * @param {Object} ctrl - Any ScriptUI control.
     * @param {number} w - Width in pixels.
     */
    lockW: function (ctrl, w) {
        ctrl.preferredSize.width = w;
        ctrl.minimumSize.width = w;
        ctrl.maximumSize.width = w;
    },

    /**
     * Adds a labeled numeric row with an optional unit suffix.
     * @param {Object} parent - ScriptUI container.
     * @param {string} label - Row label from the locale table.
     * @param {string|number} value - Initial value.
     * @param {string} tip - HelpTip from the locale table.
     * @param {string} [unit] - Unit suffix such as "mm".
     * @returns {Object} The edittext control.
     */
    addRow: function (parent, label, value, tip, unit) {
        var g = parent.add("group");
        g.alignment = ["fill", "top"];

        var st = g.add("statictext", undefined, label);
        this.lockW(st, this.M.LABEL_COL);   // [deviation] shared label axis
        st.helpTip = tip;

        var et = g.add("edittext", undefined, String(value));
        et.characters = this.M.NUM_FIELD;
        et.helpTip = tip;

        if (unit) { g.add("statictext", undefined, unit); }
        return et;
    },

    /**
     * Adds a labeled radio group in one row.
     * @param {Object} parent - ScriptUI container.
     * @param {string} label - Row label.
     * @param {Array} options - Option labels.
     * @param {number} selected - Index of the initially selected option.
     * @param {string} tip - HelpTip shared by the label and every button.
     * @returns {Array} The radiobutton controls.
     */
    addRadioRow: function (parent, label, options, selected, tip) {
        var g = parent.add("group");
        g.alignment = ["fill", "top"];

        var st = g.add("statictext", undefined, label);
        this.lockW(st, this.M.LABEL_COL);   // [deviation] shared label axis
        st.helpTip = tip;

        var out = [], i, rb;
        for (i = 0; i < options.length; i++) {
            rb = g.add("radiobutton", undefined, options[i]);
            rb.helpTip = tip;
            rb.value = (i === selected);
            out.push(rb);
        }
        return out;
    },

    /**
     * Builds the dialog and shows it.
     * @param {Object} pData - Preset wrapper {activePreset, presets}.
     * @param {Object} ctx - {cleanRect, guides, validation}.
     * @returns {Object|null} {action: "tiles"|"export", wrapper} or null on cancel.
     */
    show: function (pData, ctx) {
        var built = this.buildDialog(pData, ctx);
        built.win.center();
        built.win.show();
        return built.result();
    },

    /**
     * Builds the dialog WITHOUT showing it.
     *
     * Kept separate from show() on purpose: a Window that builds and displays
     * in one call cannot be measured, because ScriptUI Window is a host object
     * whose show() cannot be overridden. With this seam a probe can lay the
     * dialog out, read real bounds and close it — see the standard, §11.
     *
     * @param {Object} pData - Preset wrapper.
     * @param {Object} ctx - Document context.
     * @returns {Object} {win, refs, result} — result() is valid after show().
     */
    buildDialog: function (pData, ctx) {
        var c = TE.Config;
        var l = TE.L;
        var self = this;
        var s = pData.presets[c.PRESET_KEY_LAST] || pData.presets[pData.activePreset]
             || c.getDefaults();

        var w = new Window("dialog", c.scriptName + " v" + c.version);
        w.orientation = "column";
        w.alignChildren = ["fill", "top"];   // panels match the widest one; no width set

        // Two columns. Stacked in one column the dialog measured 932 px tall,
        // which does not fit a 1512 x 982 logical screen once the menu bar and
        // Dock are gone. ScriptUI has no scrollable container — scrollbar is a
        // control, not a viewport — so the fix is layout, not scrolling.
        // Left column: what gets split. Right column: how it comes out.
        var gCols = w.add("group");
        gCols.orientation = "row";
        gCols.alignChildren = ["fill", "top"];
        gCols.alignment = ["fill", "top"];

        var colL = gCols.add("group");
        colL.orientation = "column";
        colL.alignChildren = ["fill", "top"];
        colL.alignment = ["fill", "top"];

        var colR = gCols.add("group");
        colR.orientation = "column";
        colR.alignChildren = ["fill", "top"];
        colR.alignment = ["fill", "top"];

        // --- Presets ---------------------------------------------------------
        var pPreset = colL.add("panel", undefined, l.PANEL_PRESET);
        pPreset.alignChildren = ["fill", "top"];
        var gPreset = pPreset.add("group");
        gPreset.alignment = ["fill", "top"];
        var stPreset = gPreset.add("statictext", undefined, l.PRESET_LABEL);
        this.lockW(stPreset, this.M.LABEL_COL);
        stPreset.helpTip = l.TIP_PRESET;
        var ddPreset = gPreset.add("dropdownlist", undefined, []);
        ddPreset.alignment = ["fill", "center"];
        ddPreset.helpTip = l.TIP_PRESET;
        var btnSaveAs = gPreset.add("button", undefined, l.BTN_SAVE_AS);
        btnSaveAs.helpTip = l.TIP_PRESET;
        var btnDel = gPreset.add("button", undefined, l.BTN_DEL);
        btnDel.helpTip = l.TIP_PRESET;

        // --- Document --------------------------------------------------------
        var pDoc = colL.add("panel", undefined, l.PANEL_DOC);
        pDoc.alignChildren = ["fill", "top"];

        var gScale = pDoc.add("group");
        gScale.alignment = ["fill", "top"];
        var stScaleLbl = gScale.add("statictext", undefined, l.LBL_SCALE);
        this.lockW(stScaleLbl, this.M.LABEL_COL);
        stScaleLbl.helpTip = l.TIP_SCALE;
        var cbScale = gScale.add("checkbox", undefined, "");
        cbScale.helpTip = l.TIP_SCALE;
        cbScale.value = (Number(s.scaleN) > 1);
        var etScaleN = gScale.add("edittext", undefined, String(s.scaleN));
        etScaleN.characters = 4;
        etScaleN.helpTip = l.TIP_SCALE;
        etScaleN.enabled = cbScale.value;
        gScale.add("statictext", undefined,
            l.format(l.LBL_LARGE_CANVAS, String(ctx.validation.scaleFactor)));

        var gClean = pDoc.add("group");
        gClean.alignment = ["fill", "top"];
        var stCleanLbl = gClean.add("statictext", undefined, l.LBL_CLEAN);
        this.lockW(stCleanLbl, this.M.LABEL_COL);
        stCleanLbl.helpTip = l.TIP_CLEAN;
        var etCleanW = gClean.add("edittext", undefined, "");
        etCleanW.characters = this.M.NUM_FIELD;
        etCleanW.helpTip = l.TIP_CLEAN;
        gClean.add("statictext", undefined, "×");
        var etCleanH = gClean.add("edittext", undefined, "");
        etCleanH.characters = this.M.NUM_FIELD;
        etCleanH.helpTip = l.TIP_CLEAN;
        gClean.add("statictext", undefined, "mm");

        // --- Split -----------------------------------------------------------
        var pSplit = colL.add("panel", undefined, l.PANEL_SPLIT);
        pSplit.alignChildren = ["fill", "top"];

        var rbDir = this.addRadioRow(pSplit, l.LBL_DIRECTION,
            [l.DIR_HORIZONTAL, l.DIR_VERTICAL],
            (s.direction === "vertical") ? 1 : 0, l.TIP_DIRECTION);

        var modeIdx = (s.divideMode === "width") ? 1 : (s.divideMode === "guides") ? 2 : 0;
        var rbMode = this.addRadioRow(pSplit, l.LBL_MODE,
            [l.MODE_COUNT, l.MODE_WIDTH, l.MODE_GUIDES], modeIdx, l.TIP_MODE);

        var etCount = this.addRow(pSplit, l.LBL_COUNT, s.tileCount, l.TIP_COUNT);
        var etWidth = this.addRow(pSplit, l.LBL_WIDTH, s.tileWidth, l.TIP_WIDTH, "mm");
        var etRound = this.addRow(pSplit, l.LBL_ROUND, s.guideRound, l.TIP_ROUND, "mm");

        // --- Overlap and adds ------------------------------------------------
        var pEdges = colR.add("panel", undefined, l.PANEL_EDGES);
        pEdges.alignChildren = ["fill", "top"];

        var etOverlap = this.addRow(pEdges, l.LBL_OVERLAP, s.overlap, l.TIP_OVERLAP, "mm");
        var rbOverlapMode = this.addRadioRow(pEdges, l.LBL_OVERLAP_MODE,
            [l.OVERLAP_SYMMETRIC, l.OVERLAP_ONESIDED],
            (s.overlapMode === "onesided") ? 1 : 0, l.TIP_OVERLAP_MODE);

        var etAddTop    = this.addRow(pEdges, l.LBL_ADD_TOP,    s.addTop,    l.TIP_ADD, "mm");
        var etAddBottom = this.addRow(pEdges, l.LBL_ADD_BOTTOM, s.addBottom, l.TIP_ADD, "mm");
        var etAddLeft   = this.addRow(pEdges, l.LBL_ADD_LEFT,   s.addLeft,   l.TIP_ADD, "mm");
        var etAddRight  = this.addRow(pEdges, l.LBL_ADD_RIGHT,  s.addRight,  l.TIP_ADD, "mm");

        // --- Export ----------------------------------------------------------
        var pExp = colR.add("panel", undefined, l.PANEL_EXPORT);
        pExp.alignChildren = ["fill", "top"];

        var rbExpMode = this.addRadioRow(pExp, l.LBL_EXPORT_MODE,
            [l.EXPORT_VECTOR, l.EXPORT_RASTER],
            (s.exportMode === "raster") ? 1 : 0, l.TIP_EXPORT_MODE);
        var rbExpScale = this.addRadioRow(pExp, l.LBL_EXPORT_SCALE,
            [l.SCALE_SOURCE, l.SCALE_ACTUAL],
            (s.exportScale === "actual") ? 1 : 0, l.TIP_EXPORT_SCALE);
        var etDPI = this.addRow(pExp, l.LBL_DPI, s.rasterDPI, l.TIP_DPI, "DPI");

        var gLine = pExp.add("group");
        gLine.alignment = ["fill", "top"];
        var stLineLbl = gLine.add("statictext", undefined, l.LBL_LINE);
        this.lockW(stLineLbl, this.M.LABEL_COL);
        stLineLbl.helpTip = l.TIP_LINE;
        var cbLine = gLine.add("checkbox", undefined, "");
        cbLine.helpTip = l.TIP_LINE;
        cbLine.value = !!s.drawLine;
        var etSpot = gLine.add("edittext", undefined, String(s.lineSpot));
        etSpot.characters = 12;
        etSpot.helpTip = l.TIP_LINE_SPOT;
        var etLineW = gLine.add("edittext", undefined, String(s.lineWidth));
        etLineW.characters = 4;
        etLineW.helpTip = l.TIP_LINE_WIDTH;
        gLine.add("statictext", undefined, "pt");

        // PDF presets come from Illustrator itself, the same way
        // batch-relink-export does it — typing the name by hand is how you get
        // a silent fallback to the default preset on a typo.
        var gPdf = pExp.add("group");
        gPdf.alignment = ["fill", "top"];
        var stPdfLbl = gPdf.add("statictext", undefined, l.LBL_PDF_PRESET);
        this.lockW(stPdfLbl, this.M.LABEL_COL);
        stPdfLbl.helpTip = l.TIP_PDF_PRESET;
        var ddPdf = gPdf.add("dropdownlist", undefined, []);
        ddPdf.alignment = ["fill", "center"];
        ddPdf.helpTip = l.TIP_PDF_PRESET;

        var pdfList = [];
        try { pdfList = app.PDFPresetsList; }
        catch (pdfErr) { pdfList = []; }
        var pj;
        for (pj = 0; pj < pdfList.length; pj++) { ddPdf.add("item", pdfList[pj]); }
        if (ddPdf.items.length === 0) {
            // No list available: fall back to the one preset every install has.
            ddPdf.add("item", "[High Quality Print]");
        }
        ddPdf.selection = 0;
        for (pj = 0; pj < ddPdf.items.length; pj++) {
            if (ddPdf.items[pj].text === s.pdfPreset) { ddPdf.selection = pj; break; }
        }

        var gOut = pExp.add("group");
        gOut.alignment = ["fill", "top"];
        var stOutLbl = gOut.add("statictext", undefined, l.LBL_OUTPUT);
        this.lockW(stOutLbl, this.M.LABEL_COL);
        stOutLbl.helpTip = l.TIP_OUTPUT;
        var etOut = gOut.add("edittext", undefined, String(s.outputDir));
        etOut.characters = this.M.PATH_FIELD;
        etOut.alignment = ["fill", "center"];
        etOut.helpTip = l.TIP_OUTPUT;
        var btnBrowse = gOut.add("button", undefined, l.BTN_BROWSE);
        // Cap the button so fill slack goes to the path field, not the button.
        btnBrowse.maximumSize.width = this.M.BROWSE_MAX;
        btnBrowse.helpTip = l.TIP_OUTPUT;

        var etPattern = this.addRow(pExp, l.LBL_PATTERN, s.namePattern, l.TIP_PATTERN);
        etPattern.characters = 18;

        var gSkip = pExp.add("group");
        gSkip.alignment = ["fill", "top"];
        var stSkipLbl = gSkip.add("statictext", undefined, l.LBL_SKIP);
        this.lockW(stSkipLbl, this.M.LABEL_COL);
        stSkipLbl.helpTip = l.TIP_SKIP;
        var cbSkip = gSkip.add("checkbox", undefined, "");
        cbSkip.helpTip = l.TIP_SKIP;
        cbSkip.value = !!s.skipExisting;

        // --- Result ----------------------------------------------------------
        // Spans both columns: the per-panel lines run to about 60 characters
        // and would wrap inside a single column.
        var pCalc = w.add("panel", undefined, l.PANEL_CALC);
        pCalc.alignChildren = ["fill", "top"];
        var stCalc = pCalc.add("statictext", undefined, "", { multiline: true });
        stCalc.preferredSize.height = 120;   // [deviation] multiline statictext
                                             // collapses to one line without a height
        stCalc.alignment = ["fill", "top"];

        // --- Footer ----------------------------------------------------------
        var gFooter = w.add("group");
        gFooter.alignment = ["fill", "top"];
        var stCopy = gFooter.add("statictext", undefined,
            "© 2026 Osva1d — " + c.scriptName + " v" + c.version);
        stCopy.enabled = false;   // greyed — intentional, not a bug

        // --- Buttons ---------------------------------------------------------
        var gBtn = w.add("group");
        gBtn.alignment = "right";
        var btnCancel = gBtn.add("button", undefined, l.BTN_CANCEL, { name: "cancel" });
        var btnTiles  = gBtn.add("button", undefined, l.BTN_TILES_ONLY);
        btnTiles.helpTip = l.TIP_LINE;
        var btnExport = gBtn.add("button", undefined, l.BTN_TILES_EXPORT, { name: "ok" });

        // --- wiring ----------------------------------------------------------
        var refs = {
            cbScale: cbScale, etScaleN: etScaleN,
            etCleanW: etCleanW, etCleanH: etCleanH,
            rbDir: rbDir, rbMode: rbMode,
            etCount: etCount, etWidth: etWidth, etRound: etRound,
            etOverlap: etOverlap, rbOverlapMode: rbOverlapMode,
            etAddTop: etAddTop, etAddBottom: etAddBottom,
            etAddLeft: etAddLeft, etAddRight: etAddRight,
            rbExpMode: rbExpMode, rbExpScale: rbExpScale, etDPI: etDPI,
            cbLine: cbLine, etSpot: etSpot, etLineW: etLineW,
            ddPdf: ddPdf, etOut: etOut, etPattern: etPattern, cbSkip: cbSkip,
            stCalc: stCalc, btnTiles: btnTiles, btnExport: btnExport
        };

        function relayout() { w.layout.layout(true); }

        function refresh() {
            self.refresh(w, refs, ctx);
            relayout();
        }

        function wire(ctrl) {
            ctrl.onClick = refresh;
            ctrl.onChange = refresh;
            ctrl.onChanging = refresh;
        }

        var i, all = [cbScale, etScaleN, etCleanW, etCleanH, etCount, etWidth, etRound,
                      etOverlap, etAddTop, etAddBottom, etAddLeft, etAddRight,
                      etDPI, cbLine, etSpot, etLineW, etOut, etPattern, cbSkip, ddPdf];
        for (i = 0; i < all.length; i++) { wire(all[i]); }
        for (i = 0; i < rbDir.length; i++) { wire(rbDir[i]); }
        for (i = 0; i < rbMode.length; i++) { wire(rbMode[i]); }
        for (i = 0; i < rbOverlapMode.length; i++) { wire(rbOverlapMode[i]); }
        for (i = 0; i < rbExpMode.length; i++) { wire(rbExpMode[i]); }
        for (i = 0; i < rbExpScale.length; i++) { wire(rbExpScale[i]); }

        cbScale.onClick = function () {
            etScaleN.enabled = cbScale.value;
            refresh();
        };

        btnBrowse.onClick = function () {
            var f = Folder.selectDialog(l.LBL_OUTPUT);
            if (f) { etOut.text = f.fsName; refresh(); }
        };

        // --- preset handling -------------------------------------------------
        function fillPresetList() {
            var k;
            ddPreset.removeAll();
            for (k in pData.presets) {
                if (pData.presets.hasOwnProperty(k) && k !== c.PRESET_KEY_LAST) {
                    ddPreset.add("item", k);
                }
            }
            if (ddPreset.items.length === 0) { ddPreset.add("item", c.PRESET_KEY_DEFAULT); }
            ddPreset.selection = 0;
        }
        fillPresetList();

        ddPreset.onChange = function () {
            if (!ddPreset.selection) { return; }
            var p = pData.presets[ddPreset.selection.text];
            if (p) { self.apply(refs, p); refresh(); }
        };

        btnSaveAs.onClick = function () {
            var name = prompt(l.ASK_PRESET_NAME, "");
            if (!name) { return; }
            pData.presets[name] = self.collect(refs);
            fillPresetList();
            var j;
            for (j = 0; j < ddPreset.items.length; j++) {
                if (ddPreset.items[j].text === name) { ddPreset.selection = j; break; }
            }
        };

        btnDel.onClick = function () {
            if (!ddPreset.selection) { return; }
            var name = ddPreset.selection.text;
            if (name === c.PRESET_KEY_DEFAULT) { return; }
            if (!confirm(l.format(l.ASK_PRESET_DELETE, name))) { return; }
            delete pData.presets[name];
            fillPresetList();
        };

        // --- result ----------------------------------------------------------
        var state = { outcome: null };

        btnTiles.onClick = function () { state.outcome = "tiles"; w.close(1); };
        btnExport.onClick = function () { state.outcome = "export"; w.close(1); };
        btnCancel.onClick = function () { state.outcome = null; w.close(0); };

        refresh();

        return {
            win: w,
            refs: refs,
            /**
             * The dialog's outcome. Only meaningful once show() has returned.
             * @returns {Object|null} {action, wrapper} or null on cancel.
             */
            result: function () {
                if (!state.outcome) { return null; }
                pData.presets[c.PRESET_KEY_LAST] = self.collect(refs);
                pData.activePreset = ddPreset.selection
                    ? ddPreset.selection.text
                    : c.PRESET_KEY_DEFAULT;
                return { action: state.outcome, wrapper: pData };
            }
        };
    },

    /**
     * Reads the dialog into a settings object.
     * @param {Object} r - Control references.
     * @returns {Object} Settings.
     */
    collect: function (r) {
        var s = TE.Config.getDefaults();
        s.scaleN      = r.cbScale.value ? (Number(r.etScaleN.text) || 1) : 1;
        s.direction   = r.rbDir[1].value ? "vertical" : "horizontal";
        s.divideMode  = r.rbMode[1].value ? "width" : (r.rbMode[2].value ? "guides" : "count");
        s.tileCount   = Number(r.etCount.text);
        s.tileWidth   = Number(r.etWidth.text);
        s.guideRound  = Number(r.etRound.text) || 0;
        s.overlap     = Number(r.etOverlap.text) || 0;
        s.overlapMode = r.rbOverlapMode[1].value ? "onesided" : "symmetric";
        s.addTop      = Number(r.etAddTop.text) || 0;
        s.addBottom   = Number(r.etAddBottom.text) || 0;
        s.addLeft     = Number(r.etAddLeft.text) || 0;
        s.addRight    = Number(r.etAddRight.text) || 0;
        s.exportMode  = r.rbExpMode[1].value ? "raster" : "vector";
        s.exportScale = r.rbExpScale[1].value ? "actual" : "source";
        s.rasterDPI   = Number(r.etDPI.text) || 150;
        s.drawLine    = r.cbLine.value;
        s.lineSpot    = r.etSpot.text;
        s.lineWidth   = Number(r.etLineW.text) || 1;
        s.pdfPreset   = r.ddPdf.selection ? r.ddPdf.selection.text : "";
        s.outputDir   = r.etOut.text;
        s.namePattern = r.etPattern.text;
        s.skipExisting = r.cbSkip.value;
        return s;
    },

    /**
     * Writes a settings object back into the dialog.
     * @param {Object} r - Control references.
     * @param {Object} s - Settings.
     */
    apply: function (r, s) {
        r.cbScale.value = (Number(s.scaleN) > 1);
        r.etScaleN.text = String(s.scaleN);
        r.etScaleN.enabled = r.cbScale.value;
        r.rbDir[0].value = (s.direction !== "vertical");
        r.rbDir[1].value = (s.direction === "vertical");
        r.rbMode[0].value = (s.divideMode === "count");
        r.rbMode[1].value = (s.divideMode === "width");
        r.rbMode[2].value = (s.divideMode === "guides");
        r.etCount.text = String(s.tileCount);
        r.etWidth.text = String(s.tileWidth);
        r.etRound.text = String(s.guideRound);
        r.etOverlap.text = String(s.overlap);
        r.rbOverlapMode[0].value = (s.overlapMode !== "onesided");
        r.rbOverlapMode[1].value = (s.overlapMode === "onesided");
        r.etAddTop.text = String(s.addTop);
        r.etAddBottom.text = String(s.addBottom);
        r.etAddLeft.text = String(s.addLeft);
        r.etAddRight.text = String(s.addRight);
        r.rbExpMode[0].value = (s.exportMode !== "raster");
        r.rbExpMode[1].value = (s.exportMode === "raster");
        r.rbExpScale[0].value = (s.exportScale !== "actual");
        r.rbExpScale[1].value = (s.exportScale === "actual");
        r.etDPI.text = String(s.rasterDPI);
        r.cbLine.value = !!s.drawLine;
        r.etSpot.text = String(s.lineSpot);
        r.etLineW.text = String(s.lineWidth);
        var pk;
        for (pk = 0; pk < r.ddPdf.items.length; pk++) {
            if (r.ddPdf.items[pk].text === s.pdfPreset) { r.ddPdf.selection = pk; break; }
        }
        r.etOut.text = String(s.outputDir);
        r.etPattern.text = String(s.namePattern);
        r.cbSkip.value = !!s.skipExisting;
    },

    /**
     * Maps a thrown geometry error code onto a localized message.
     * @param {Error} err - Error from TE.Grid.
     * @returns {string} Message for the user.
     */
    describeError: function (err) {
        var code = String(err && err.message);
        if (code === "TE_MIN_TILES") { return TE.L.ERR_MIN_TILES; }
        if (code === "TE_BAD_WIDTH") { return TE.L.ERR_CUTS_ORDER; }
        if (code === "TE_NO_GUIDES") { return TE.L.ERR_NO_GUIDES; }
        return code;
    },

    /**
     * Recomputes the preview text and the enabled state of the action buttons.
     * Called from every input's onChange and onChanging, so what the dialog
     * shows is always what the buttons would produce.
     *
     * Never throws — a half-typed number must not kill the dialog. Geometry
     * errors surface as text and disable the buttons instead.
     *
     * @param {Window} w - The dialog.
     * @param {Object} r - Control references.
     * @param {Object} ctx - Document context.
     */
    refresh: function (w, r, ctx) {
        var l = TE.L;
        var s = this.collect(r);
        var lines = [];
        var ok = true;

        // Mode-dependent fields: show the one that applies, grey the rest.
        r.etCount.enabled = (s.divideMode === "count");
        r.etWidth.enabled = (s.divideMode === "width");
        r.etRound.enabled = (s.divideMode === "guides");
        r.etDPI.enabled   = (s.exportMode === "raster");
        r.etSpot.enabled  = s.drawLine;
        r.etLineW.enabled = s.drawLine;

        var clean = this.resolveClean(r, ctx, s);

        try {
            var ext = (s.direction === "horizontal")
                ? { start: clean[0], end: clean[2] }
                : { start: clean[3], end: clean[1] };
            var cuts = TE.Grid.computeCuts(s, ext, ctx.guides);
            var tiles = TE.Grid.computeTiles(cuts, clean, s);
            var v = TE.Validate.check(tiles, ctx.validation, s);

            lines.push(l.format(l.INFO_CLEAN,
                Math.round(TE.Utils.fromDoc(clean[2] - clean[0], s)),
                Math.round(TE.Utils.fromDoc(clean[1] - clean[3], s))));
            lines.push(l.format(l.INFO_COUNT, tiles.length));

            var i, e, cl;
            for (i = 0; i < tiles.length; i++) {
                cl = tiles[i].clean;
                e = tiles[i].expanded;
                lines.push(l.format(l.INFO_TILE, tiles[i].index,
                    Math.round(TE.Utils.fromDoc(cl[2] - cl[0], s)),
                    Math.round(TE.Utils.fromDoc(cl[1] - cl[3], s)),
                    Math.round(TE.Utils.fromDoc(e[2] - e[0], s)),
                    Math.round(TE.Utils.fromDoc(e[1] - e[3], s))));
            }

            lines.push(l.format(l.INFO_OVERHANG,
                Math.round(TE.Utils.fromDoc(ctx.validation.overhang.left, s)),
                Math.round(TE.Utils.fromDoc(ctx.validation.overhang.right, s)),
                Math.round(TE.Utils.fromDoc(ctx.validation.overhang.top, s)),
                Math.round(TE.Utils.fromDoc(ctx.validation.overhang.bottom, s))));

            for (i = 0; i < v.warnings.length; i++) { lines.push("! " + v.warnings[i]); }
            for (i = 0; i < v.errors.length; i++) { lines.push("✗ " + v.errors[i]); }
            ok = (v.errors.length === 0);
        } catch (err) {
            lines.push("✗ " + this.describeError(err));
            ok = false;
        }

        r.stCalc.text = lines.join("\n");
        r.btnTiles.enabled = ok;
        r.btnExport.enabled = ok;
    },

    /**
     * The clean-format rect the preview should use: the artboard, unless the
     * user typed an override. An override is a way out when the artboard does
     * not match the graphic; empty fields mean "take the artboard".
     * @param {Object} r - Control references.
     * @param {Object} ctx - Document context.
     * @param {Object} s - Settings.
     * @returns {Array} [l, t, r, b] in document points.
     */
    resolveClean: function (r, ctx, s) {
        var wTxt = String(r.etCleanW.text).replace(/^\s+|\s+$/g, "");
        var hTxt = String(r.etCleanH.text).replace(/^\s+|\s+$/g, "");
        if (wTxt === "" || hTxt === "") { return ctx.cleanRect; }

        var wmm = Number(wTxt.replace(/,/g, "."));
        var hmm = Number(hTxt.replace(/,/g, "."));
        if (isNaN(wmm) || isNaN(hmm) || wmm <= 0 || hmm <= 0) { return ctx.cleanRect; }

        // Keep the artboard's top-left corner; only the size is overridden.
        var c = ctx.cleanRect;
        return [c[0], c[1], c[0] + TE.Utils.toDoc(wmm, s), c[1] - TE.Utils.toDoc(hmm, s)];
    }
};
