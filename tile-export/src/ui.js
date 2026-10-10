// ------------------------------------------------------------------------
// Module: TE.UI — dialog, live preview, preset handling
// Part of: Illustrator Tile Export
// Depends on: TE.Config, TE.Core, TE.Doc, TE.Export, TE.Grid, TE.L,
//             TE.Storage, TE.Utils, TE.Validate, TE.UIState
// ------------------------------------------------------------------------
var TE = TE || {};

TE.UI = {
    // Shared metrics — the dialog's alignment grid in one place.
    // Every entry is a [deviation] from native sizing and says why.
    M: {
        LABEL_COL: 150,   // label column; every row label shares this right edge
        NUM_FIELD:   7,   // characters, not px — numeric fields scale with locale
        PATH_FIELD: 26,   // characters; output path needs to show a usable tail
        BROWSE_MAX:  90,  // px cap so fill slack goes to the path field, not the button
        REVERT_BTN:  30   // px; a one-glyph button at the native 80 px dwarfs its row
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
     * Adds a labeled read-only value row. The value is created with the
     * longest text it will show: a statictext keeps its first width even
     * after a relayout (measured), and refresh() writes the real value.
     * @param {Object} parent - ScriptUI container.
     * @param {string} label - Row label.
     * @param {string} widest - The longest value the row will show.
     * @param {string} tip - HelpTip shared by the label and the value.
     * @returns {Object} The value statictext.
     */
    addInfoRow: function (parent, label, widest, tip) {
        var g = parent.add("group");
        g.alignment = ["fill", "top"];
        var st = g.add("statictext", undefined, label);
        this.lockW(st, this.M.LABEL_COL);   // [deviation] shared label axis
        st.helpTip = tip;
        var val = g.add("statictext", undefined, widest);
        val.helpTip = tip;
        return val;
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
     * Items for the PDF preset list: Illustrator's own presets, or — when it
     * returns none — one item that says there is no preset, which collect()
     * reads as "" and the export saves with Illustrator's PDF defaults.
     * Never a name of our own: the old fallback named High Quality Print in
     * English, which a Czech install calls [Kvalitní tisk], and saveAs then
     * failed with FNOC on every panel (N20).
     * @param {Array} list - app.PDFPresetsList, or [] when unreadable.
     * @returns {Array} Item texts.
     */
    pdfPresetItems: function (list) {
        var out = [], i;
        for (i = 0; i < list.length; i++) { out.push(list[i]); }
        if (out.length === 0) { out.push(TE.L.PDF_PRESET_NONE); }
        return out;
    },

    /**
     * Builds the dialog and shows it.
     * @param {Object} pData - Preset wrapper {activePreset, presets}.
     * @param {Object} ctx - {cleanRect, guidesByDirection, validation}.
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
     * Kept separate from show() on purpose: a probe can build the dialog, lay
     * it out, read real bounds and close it without ever showing it — see the
     * standard, §11. The 2026-10-03 sizes in the layout comment below were
     * measured that way.
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

        // Two columns, balanced by measured heights (2026-09-25; re-measured
        // 2026-10-03 after N27 took a row out of the left column): left
        // 560 px, right Export 276 + Result filling the rest; the dialog is
        // 662 px. With the Zünd panel built (280 px) the Result drops to its
        // 85 px floor and the dialog grows to 793 px. Stacked in one column the
        // dialog once measured 932 px tall, which does not fit a 1512 x 982
        // logical screen once the menu bar and Dock are gone. ScriptUI has no scrollable container — scrollbar is a
        // control, not a viewport — so the fix is layout, not scrolling.
        // Left column: what gets split. Right column: how it comes out, and
        // the Result under it, stretched to the left column's height (N18).
        var gCols = w.add("group");
        gCols.orientation = "row";
        gCols.alignChildren = ["fill", "fill"];   // columns share one height
        gCols.alignment = ["fill", "top"];

        var colL = gCols.add("group");
        colL.orientation = "column";
        colL.alignChildren = ["fill", "top"];
        colL.alignment = ["fill", "top"];

        var colR = gCols.add("group");
        colR.orientation = "column";
        colR.alignChildren = ["fill", "top"];
        colR.alignment = ["fill", "fill"];   // as tall as the left column (N18)

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
        // Revert and Save sit next to the list they act on, like
        // zund-summa-marks: both are live only while the preset has unsaved
        // edits (N8).
        var btnRevert = gPreset.add("button", undefined, l.BTN_REVERT);
        btnRevert.preferredSize.width = this.M.REVERT_BTN;   // [deviation] see M
        btnRevert.helpTip = l.TIP_REVERT;
        var btnSave = gPreset.add("button", undefined, l.BTN_SAVE);
        btnSave.helpTip = l.TIP_SAVE;
        var btnSaveAs = gPreset.add("button", undefined, l.BTN_SAVE_AS);
        btnSaveAs.helpTip = l.TIP_SAVE_AS;
        var btnDel = gPreset.add("button", undefined, l.BTN_DEL);
        btnDel.helpTip = l.TIP_DEL;

        // --- Document --------------------------------------------------------
        var pDoc = colL.add("panel", undefined, l.PANEL_DOC);
        pDoc.alignChildren = ["fill", "top"];

        // The drawing scale comes from the document, which remembers it: not
        // from the last run, which carried a 1:10 into the next job's 1:1
        // document, nor from a preset (1.1.0). No checkbox — 1 is a scale like
        // any other. Large Canvas is not shown: its rulers already read real
        // size, so it is not a scale the user deals with.
        var etScaleN = this.addRow(pDoc, l.LBL_SCALE, ctx.drawingScale || 1, l.TIP_SCALE);
        // What TE found in the document, in real millimetres — once the
        // Result's first and last lines (1.1.0). Shown whatever the split
        // settings, which do not change it.
        var wide = "9999" + l.DECIMAL + "9";
        var stCleanInfo = this.addInfoRow(pDoc, l.LBL_CLEAN,
            l.format(l.INFO_CLEAN_VAL, "9" + wide, "9" + wide), l.TIP_CLEAN);
        var stBleedInfo = this.addInfoRow(pDoc, l.LBL_BLEED,
            l.format(l.INFO_BLEED_VAL, wide, wide, wide, wide), l.TIP_BLEED);
        // No clean-format fields: the artboard is the clean format. Typed
        // values changed only the preview, while the run kept dividing the
        // artboard (N27); a wrong artboard is fixed in Illustrator.

        // --- Split -----------------------------------------------------------
        var pSplit = colL.add("panel", undefined, l.PANEL_SPLIT);
        pSplit.alignChildren = ["fill", "top"];

        // Named the shop's way (N32): panels side by side are vertical panels,
        // "Svisle". The stored values keep their meaning — "horizontal" is the
        // axis the cuts advance along — so saved presets split as before.
        var rbDir = this.addRadioRow(pSplit, l.LBL_DIRECTION,
            [l.DIR_SIDE_BY_SIDE, l.DIR_STACKED],
            (s.direction === "vertical") ? 1 : 0, l.TIP_DIRECTION);

        // No chained ?: here — ExtendScript evaluates it left to right and
        // reopened a saved "width" as "guides" (N14).
        var modeIdx = 0;
        if (s.divideMode === "width") { modeIdx = 1; }
        if (s.divideMode === "guides") { modeIdx = 2; }
        var rbMode = this.addRadioRow(pSplit, l.LBL_MODE,
            [l.MODE_COUNT, l.MODE_WIDTH, l.MODE_GUIDES], modeIdx, l.TIP_MODE);

        var etCount = this.addRow(pSplit, l.LBL_COUNT, s.tileCount, l.TIP_COUNT);
        var etWidth = this.addRow(pSplit, l.LBL_WIDTH, s.tileWidth, l.TIP_WIDTH, "mm");
        // Its label reads Šířka or Výška with the direction (N40); both fit
        // the locked label column.
        var stWidthLbl = etWidth.parent.children[0];
        var etRound = this.addRow(pSplit, l.LBL_ROUND, s.guideRound, l.TIP_ROUND, "mm");

        // A row of its own because it belongs to BOTH numbers above it: with a
        // count it equalises the n panels asked for, with a width it rereads
        // that width as a ceiling and derives n. One concept, one control — two
        // differently named checkboxes for the same switch would cost more in
        // confusion than this row costs in height. Meaningless with guides,
        // which are placed by hand, so it greys out there.
        var gEqual = pSplit.add("group");
        gEqual.alignment = ["fill", "top"];
        var stEqualLbl = gEqual.add("statictext", undefined, l.LBL_EQUAL);
        this.lockW(stEqualLbl, this.M.LABEL_COL);
        stEqualLbl.helpTip = l.TIP_EQUAL;
        var cbEqual = gEqual.add("checkbox", undefined, l.LBL_EQUAL_CB);
        cbEqual.helpTip = l.TIP_EQUAL;
        cbEqual.value = !!s.equalPanels;

        // --- Overlap and adds ------------------------------------------------
        var pEdges = colL.add("panel", undefined, l.PANEL_EDGES);
        pEdges.alignChildren = ["fill", "top"];

        var etOverlap = this.addRow(pEdges, l.LBL_OVERLAP, s.overlap, l.TIP_OVERLAP, "mm");
        // Three options for two settings: the mode (symmetric or one-sided) and,
        // when one-sided, which panel of the seam carries the material. Kept as
        // one row because the second question only exists inside the second
        // answer, and a separate row would be greyed out most of the time.
        // Not a chained ?: — see modeIdx; this one reopened "half on each
        // side" as "all on left" (N14).
        var carrierIdx = 0;
        if (s.overlapMode === "onesided") {
            carrierIdx = (s.overlapCarrier === "second") ? 2 : 1;
        }
        var rbOverlapMode = this.addRadioRow(pEdges, l.LBL_OVERLAP_MODE,
            [l.OVERLAP_SYMMETRIC, l.OVERLAP_FIRST, l.OVERLAP_SECOND],
            carrierIdx, l.TIP_OVERLAP_MODE);

        var etAddTop    = this.addRow(pEdges, l.LBL_ADD_TOP,    s.addTop,    l.TIP_ADD, "mm");
        var etAddBottom = this.addRow(pEdges, l.LBL_ADD_BOTTOM, s.addBottom, l.TIP_ADD, "mm");
        var etAddLeft   = this.addRow(pEdges, l.LBL_ADD_LEFT,   s.addLeft,   l.TIP_ADD, "mm");
        var etAddRight  = this.addRow(pEdges, l.LBL_ADD_RIGHT,  s.addRight,  l.TIP_ADD, "mm");

        // --- Output type -----------------------------------------------------
        // One choice between the two outputs that exclude each other (1.1.0):
        // a red trim line the finisher cuts along, printed; or Zünd marks and
        // a cut path for the machine, never printed. Each has its own fields,
        // stacked in one place so only the chosen ones show: a hidden group
        // keeps its space (measured), stacked groups share it.
        var pType = colR.add("panel", undefined, l.PANEL_OUT_TYPE);
        pType.alignChildren = ["fill", "top"];

        // Without Zünd mode there is nothing to choose: no row, manual only.
        var rbOutType = null;
        if (c.ZUND_ENABLED) {
            rbOutType = this.addRadioRow(pType, l.LBL_OUT_TYPE,
                [l.OUT_MANUAL, l.OUT_ZUND], s.zundMode ? 1 : 0, l.TIP_OUT_TYPE);
        }

        var gTypeStack = pType.add("group");
        gTypeStack.orientation = "stack";
        gTypeStack.alignChildren = ["fill", "top"];
        gTypeStack.alignment = ["fill", "top"];

        var gManual = gTypeStack.add("group");
        gManual.orientation = "column";
        gManual.alignChildren = ["fill", "top"];

        var gLine = gManual.add("group");
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

        // Hidden behind TE.Config.ZUND_ENABLED — see the comment there. The
        // fields are not built at all rather than merely made invisible.
        var gZundFields = null, ddCutSpot = null, ddMarkColor = null;
        var etMarkSize = null, etGapInner = null, etMaxDist = null, etOrient = null;
        var etBleed = null;

        if (c.ZUND_ENABLED) {
        gZundFields = gTypeStack.add("group");
        gZundFields.orientation = "column";
        gZundFields.alignChildren = ["fill", "top"];

        var gCutSpot = gZundFields.add("group");
        gCutSpot.alignment = ["fill", "top"];
        var stCutSpotLbl = gCutSpot.add("statictext", undefined, l.LBL_CUT_SPOT);
        this.lockW(stCutSpotLbl, this.M.LABEL_COL);
        stCutSpotLbl.helpTip = l.TIP_CUT_SPOT;
        ddCutSpot = gCutSpot.add("dropdownlist", undefined, []);
        ddCutSpot.alignment = ["fill", "center"];
        ddCutSpot.helpTip = l.TIP_CUT_SPOT;
        // The document's spots plus the shop's cut colours and the stored
        // one: a straight cut needs no contour, so its colour need not be in
        // the document yet — the export creates it.
        var spotList = [], zj;
        var candidates = (ctx.spotNames || []).concat(c.CUT_SPOTS, [s.cutSpot]);
        for (zj = 0; zj < candidates.length; zj++) {
            if (candidates[zj] && TE.Utils.indexOf(spotList, candidates[zj]) === -1) {
                spotList.push(candidates[zj]);
            }
        }
        for (zj = 0; zj < spotList.length; zj++) { ddCutSpot.add("item", spotList[zj]); }
        ddCutSpot.selection = 0;
        for (zj = 0; zj < ddCutSpot.items.length; zj++) {
            if (ddCutSpot.items[zj].text === s.cutSpot) { ddCutSpot.selection = zj; break; }
        }

        var gMarkCol = gZundFields.add("group");
        gMarkCol.alignment = ["fill", "top"];
        var stMarkColLbl = gMarkCol.add("statictext", undefined, l.LBL_MARK_COLOR);
        this.lockW(stMarkColLbl, this.M.LABEL_COL);
        stMarkColLbl.helpTip = l.TIP_MARK_COLOR;
        ddMarkColor = gMarkCol.add("dropdownlist", undefined, []);
        ddMarkColor.alignment = ["fill", "center"];
        ddMarkColor.helpTip = l.TIP_MARK_COLOR;
        var mcList = ctx.markColors || [];
        var mj;
        for (mj = 0; mj < mcList.length; mj++) { ddMarkColor.add("item", mcList[mj]); }
        if (ddMarkColor.items.length === 0) { ddMarkColor.add("item", s.markColor); }
        ddMarkColor.selection = 0;
        for (mj = 0; mj < ddMarkColor.items.length; mj++) {
            if (ddMarkColor.items[mj].text === s.markColor) { ddMarkColor.selection = mj; break; }
        }

        etBleed    = this.addRow(gZundFields, l.LBL_CUT_BLEED, s.cutBleed, l.TIP_CUT_BLEED, "mm");
        etMarkSize = this.addRow(gZundFields, l.LBL_MARK_SIZE, s.markSizeZ, l.TIP_MARK_SIZE, "mm");
        etGapInner = this.addRow(gZundFields, l.LBL_GAP_INNER, s.gapInner, l.TIP_GAP_INNER, "mm");
        etMaxDist  = this.addRow(gZundFields, l.LBL_MAX_DIST,  s.maxDist,  l.TIP_MAX_DIST,  "mm");
        etOrient   = this.addRow(gZundFields, l.LBL_ORIENT,    s.orientDist, l.TIP_ORIENT,  "mm");
        }   // end ZUND_ENABLED

        // --- Files -----------------------------------------------------------
        var pExp = colR.add("panel", undefined, l.PANEL_FILES);
        pExp.alignChildren = ["fill", "top"];

        // Raster output is hidden behind TE.Config.RASTER_ENABLED — see there.
        var rbExpMode = null, etDPI = null;
        if (c.RASTER_ENABLED) {
            rbExpMode = this.addRadioRow(pExp, l.LBL_EXPORT_MODE,
                [l.EXPORT_VECTOR, l.EXPORT_RASTER],
                (s.exportMode === "raster") ? 1 : 0, l.TIP_EXPORT_MODE);
            etDPI = this.addRow(pExp, l.LBL_DPI, s.rasterDPI, l.TIP_DPI, "DPI");
        }

        // The output scale is named by the drawing's own number, "1:10 jako
        // kresba", where it used to say "same as document" — which meant real
        // size for a Large Canvas (1.1.0). A 1:1 drawing has nothing to choose
        // and the row says so instead; the two rows are stacked, since a
        // hidden row keeps its space.
        var gScaleStack = pExp.add("group");
        gScaleStack.orientation = "stack";
        gScaleStack.alignChildren = ["fill", "top"];
        gScaleStack.alignment = ["fill", "top"];
        // Created with the longest number it will show: a label keeps its
        // first width (measured), and refresh() writes in the real one.
        var rbExpScale = this.addRadioRow(gScaleStack, l.LBL_EXPORT_SCALE,
            [l.format(l.SCALE_DRAWING, "9999"), l.SCALE_ACTUAL],
            (s.exportScale === "actual") ? 1 : 0, l.TIP_EXPORT_SCALE);
        var gScaleOne = gScaleStack.add("group");
        gScaleOne.alignment = ["fill", "top"];
        var stScaleOneLbl = gScaleOne.add("statictext", undefined, l.LBL_EXPORT_SCALE);
        this.lockW(stScaleOneLbl, this.M.LABEL_COL);
        stScaleOneLbl.helpTip = l.TIP_EXPORT_SCALE;
        gScaleOne.add("statictext", undefined, l.SCALE_ONE).helpTip = l.TIP_EXPORT_SCALE;

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
        catch (pdfErr) {
            pdfList = [];
            TE.Utils.log("PDFPresetsList unreadable: " + pdfErr.message);
        }
        var pdfItems = this.pdfPresetItems(pdfList), pj;
        for (pj = 0; pj < pdfItems.length; pj++) { ddPdf.add("item", pdfItems[pj]); }
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
        // At the foot of the right column, filling what the left column leaves
        // (N18). It used to span both columns at the bottom, at 85 px, while
        // the right column stood half empty: five lines showed and the sixth
        // was cut. Panel lines measure ~370 px and fit the column; longer
        // messages wrap.
        var pCalc = colR.add("panel", undefined, l.PANEL_CALC);
        pCalc.alignment = ["fill", "fill"];
        pCalc.alignChildren = ["fill", "fill"];
        // [deviation] readonly edittext, not statictext. The summary is as long
        // as the job needs — a line per panel plus the bleed line plus any
        // warnings — and a fixed-height statictext CLIPS the rest with no sign
        // that anything is missing: at 85 px a five-panel job showed panels 1-3
        // and swallowed 4, 5, the bleed line and every error. An edittext with
        // scrolling keeps the content reachable, and readonly keeps it from
        // being edited. 85 px is the floor, what is left under the Zünd panel
        // when that panel is built. Selectable text is a bonus: the panel
        // sizes can be copied straight into a job sheet.
        var stCalc = pCalc.add("edittext", undefined, "",
            { multiline: true, scrolling: true, readonly: true });
        // preferredSize, not just a minimum: an edittext otherwise sizes
        // itself to its text, and a twelve-panel job grew the dialog to
        // 932 px (measured). The fill alignment then stretches it into the
        // space the left column leaves.
        stCalc.preferredSize.height = 85;
        stCalc.alignment = ["fill", "fill"];

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
        btnTiles.helpTip = l.TIP_TILES_ONLY;
        var btnExport = gBtn.add("button", undefined, l.BTN_TILES_EXPORT, { name: "ok" });

        // --- wiring ----------------------------------------------------------
        var refs = {
            etScaleN: etScaleN, stCleanInfo: stCleanInfo, stBleedInfo: stBleedInfo,
            rbDir: rbDir, rbMode: rbMode,
            etCount: etCount, etWidth: etWidth, stWidthLbl: stWidthLbl, etRound: etRound,
            cbEqual: cbEqual,
            etOverlap: etOverlap, rbOverlapMode: rbOverlapMode,
            etAddTop: etAddTop, etAddBottom: etAddBottom,
            etAddLeft: etAddLeft, etAddRight: etAddRight,
            rbExpMode: rbExpMode, rbExpScale: rbExpScale, etDPI: etDPI,
            gScaleRow: rbExpScale[0].parent, gScaleOne: gScaleOne,
            cbLine: cbLine, etSpot: etSpot, etLineW: etLineW,
            ddPdf: ddPdf, etOut: etOut, etPattern: etPattern, cbSkip: cbSkip,
            rbOutType: rbOutType, gManual: gManual, gZundFields: gZundFields,
            ddCutSpot: ddCutSpot, ddMarkColor: ddMarkColor,
            etMarkSize: etMarkSize, etBleed: etBleed,
            etGapInner: etGapInner, etMaxDist: etMaxDist, etOrient: etOrient,
            stCalc: stCalc, btnTiles: btnTiles, btnExport: btnExport
        };

        function relayout() { w.layout.layout(true); }

        function refresh() {
            self.refresh(w, refs, ctx);
            refreshModifiedIndicator();
            relayout();
        }

        function wire(ctrl) {
            ctrl.onClick = refresh;
            ctrl.onChange = refresh;
            ctrl.onChanging = refresh;
        }

        var i, all = [etScaleN, etCount, etWidth,
                      etRound, cbEqual,
                      etOverlap, etAddTop, etAddBottom, etAddLeft, etAddRight,
                      etDPI, cbLine, etSpot, etLineW, etOut, etPattern, cbSkip, ddPdf,
                      etMarkSize, etGapInner, etMaxDist, etOrient, etBleed, ddCutSpot,
                      ddMarkColor];
        // Zünd controls are null when the panel is not built.
        var wired = [];
        for (i = 0; i < all.length; i++) { if (all[i]) { wired.push(all[i]); } }
        all = wired;
        for (i = 0; i < all.length; i++) { wire(all[i]); }
        for (i = 0; i < rbDir.length; i++) { wire(rbDir[i]); }
        for (i = 0; i < rbMode.length; i++) { wire(rbMode[i]); }
        for (i = 0; i < rbOverlapMode.length; i++) { wire(rbOverlapMode[i]); }
        if (rbExpMode) {
            for (i = 0; i < rbExpMode.length; i++) { wire(rbExpMode[i]); }
        }
        for (i = 0; i < rbExpScale.length; i++) { wire(rbExpScale[i]); }

        // Null without Zünd mode — see TE.Config.ZUND_ENABLED. refresh() shows
        // the fields of the chosen output.
        if (rbOutType) {
            for (i = 0; i < rbOutType.length; i++) { wire(rbOutType[i]); }
        }

        btnBrowse.onClick = function () {
            var f = Folder.selectDialog(l.LBL_OUTPUT);
            if (f) { etOut.text = f.fsName; refresh(); }
        };

        // --- preset handling -------------------------------------------------
        // State transitions live in the shared TE.UIState; this block only
        // wires them to the controls — the zund-summa-marks pattern (N8).
        // Every preset operation goes to disk at once, as in both sibling
        // tools: Storno throws away edits to the FIELDS, never a preset the
        // user explicitly saved or deleted.
        var sortedKeys = [];

        // The active preset as THIS dialog shows it — what the asterisk
        // compares against. The stored object would not do: the hidden Zünd
        // panel collects defaults whatever the preset holds, and [Default]
        // stores a PDF preset "" that no list item has. Compared raw, both
        // would read as modified the moment they are loaded.
        var baseline = null;

        // What a preset holds: the dialog without the drawing scale, which
        // belongs to the document — editing it must not mark a preset changed.
        function current() { return self.presetValues(self.collect(refs)); }
        function snapshot() { baseline = current(); }

        /** pData with the active preset replaced by its baseline. */
        function shownData() {
            var v = { activePreset: pData.activePreset, presets: {} }, k;
            for (k in pData.presets) {
                if (pData.presets.hasOwnProperty(k)) { v.presets[k] = pData.presets[k]; }
            }
            if (baseline) { v.presets[pData.activePreset] = baseline; }
            return v;
        }

        /** The list text for a key, as TE.UIState.formatPresetList writes it. */
        function presetLabel(key) {
            return (key === c.PRESET_KEY_DEFAULT && l.PRESET_DEFAULT) ? l.PRESET_DEFAULT : key;
        }

        /** Rebuilds the list — order and asterisk from the shared module. */
        function updatePresetList() {
            var entries = TE.UIState.formatPresetList(shownData(), current(), l);
            var sel = 0, j;
            ddPreset.removeAll();
            sortedKeys = [];
            for (j = 0; j < entries.length; j++) {
                ddPreset.add("item", entries[j].displayText);
                sortedKeys.push(entries[j].key);
                if (entries[j].isActive) { sel = j; }
            }
            // Fires onChange, which ignores the preset that is already active.
            if (ddPreset.items.length > 0) { ddPreset.selection = sel; }
        }

        /**
         * Asterisk and button states after any change. Relabels every item,
         * not only the active one: switching away from an edited preset would
         * otherwise leave its asterisk behind.
         */
        function refreshModifiedIndicator() {
            var modified = TE.UIState.isModified(shownData(), current());
            var j, key, text;
            btnRevert.enabled = modified;
            btnSave.enabled = modified && (pData.activePreset !== c.PRESET_KEY_DEFAULT);
            btnDel.enabled = (pData.activePreset !== c.PRESET_KEY_DEFAULT);
            for (j = 0; j < sortedKeys.length && j < ddPreset.items.length; j++) {
                key = sortedKeys[j];
                text = presetLabel(key) + ((key === pData.activePreset && modified) ? " *" : "");
                if (ddPreset.items[j].text !== text) { ddPreset.items[j].text = text; }
            }
        }

        function persist() {
            if (!TE.Storage.save(pData)) { alert(l.ERR_WRITE_SETTINGS); }
        }

        // A file edited by hand or written by an older build may lack
        // [Default] or name an active preset that is gone.
        if (!pData.presets[c.PRESET_KEY_DEFAULT]) {
            pData.presets[c.PRESET_KEY_DEFAULT] = c.getDefaults();
        }
        if (!pData.presets[pData.activePreset] || pData.activePreset === c.PRESET_KEY_LAST) {
            pData.activePreset = c.PRESET_KEY_DEFAULT;
        }

        // The fields hold the last confirmed run, the list names the active
        // preset. Measure that preset as the dialog shows it, then put the run
        // back — so the list says "*" at once when the two differ, instead of
        // naming a preset over values that are not its own (T7.5).
        var activeP = pData.presets[pData.activePreset];
        if (activeP !== s) {
            self.apply(refs, activeP);
            snapshot();
            self.apply(refs, s);
        } else {
            snapshot();
        }
        updatePresetList();

        ddPreset.onChange = function () {
            if (!ddPreset.selection) { return; }
            var key = sortedKeys[ddPreset.selection.index];
            if (!key || key === pData.activePreset) { return; }
            var res = TE.UIState.selectPreset(pData, key);
            if (!res.ok) { return; }
            self.apply(refs, res.settings);
            snapshot();
            refresh();
        };

        /** ↺ — back to the active preset as saved. Nothing is written. */
        btnRevert.onClick = function () {
            var p = pData.presets[pData.activePreset];
            if (!p) { return; }
            self.apply(refs, p);
            snapshot();
            refresh();
        };

        /** Overwrites the active preset. Disabled on [Default]. */
        btnSave.onClick = function () {
            var res = TE.UIState.save(pData, current());
            if (!res.ok) { return; }
            snapshot();
            persist();
            refresh();
        };

        btnSaveAs.onClick = function () {
            var raw = prompt(l.ASK_PRESET_NAME, "");
            if (raw === null || raw === "") { return; }
            if (!TE.UIState.validatePresetName(raw)) {
                alert(l.ERR_RESERVED_NAME);
                return;
            }
            var res = TE.UIState.saveAs(pData, raw, current(), function (name) {
                return confirm(l.format(l.ASK_PRESET_OVERWRITE, name));
            });
            if (!res.ok) { return; }
            snapshot();
            updatePresetList();
            persist();
            refresh();
        };

        btnDel.onClick = function () {
            var name = pData.activePreset;
            if (name === c.PRESET_KEY_DEFAULT) { return; }   // disabled there anyway
            if (!confirm(l.format(l.ASK_PRESET_DELETE, name))) { return; }
            var res = TE.UIState.deleteActive(pData);
            if (!res.ok) { return; }
            self.apply(refs, pData.presets[c.PRESET_KEY_DEFAULT]);
            snapshot();
            updatePresetList();
            persist();
            refresh();
        };

        // --- result ----------------------------------------------------------
        var state = { outcome: null };

        btnTiles.onClick = function () { state.outcome = "tiles"; w.close(1); };
        btnExport.onClick = function () { state.outcome = "export"; w.close(1); };
        btnCancel.onClick = function () { state.outcome = null; w.close(0); };

        // One layout with the widest texts still in place, before refresh()
        // writes the real ones. A statictext keeps the width of its first
        // layout (measured), and without this pass the first layout came
        // after the real values: a longer number later was cut (1.1.0).
        w.layout.layout(true);
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
                // pData.activePreset is kept current by the preset handlers.
                // The list text cannot stand in for it: it may end in " *".
                return { action: state.outcome, wrapper: pData };
            }
        };
    },

    /**
     * Settings as a preset holds them: without the drawing scale, which the
     * document keeps (1.1.0). Presets saved earlier still carry it; apply()
     * ignores it, so loading one never rescales the drawing.
     * @param {Object} s - Settings from collect().
     * @returns {Object} A copy without scaleN.
     */
    presetValues: function (s) {
        var out = {}, k;
        for (k in s) {
            if (s.hasOwnProperty(k) && k !== "scaleN") { out[k] = s[k]; }
        }
        return out;
    },

    /**
     * Reads the dialog into a settings object.
     * @param {Object} r - Control references.
     * @returns {Object} Settings.
     */
    collect: function (r) {
        var s = TE.Config.getDefaults();
        s.scaleN      = TE.Utils.toNumber(r.etScaleN.text) || 1;
        s.direction   = r.rbDir[1].value ? "vertical" : "horizontal";
        s.divideMode  = r.rbMode[1].value ? "width" : (r.rbMode[2].value ? "guides" : "count");
        s.tileCount   = TE.Utils.toNumber(r.etCount.text);
        s.tileWidth   = TE.Utils.toNumber(r.etWidth.text);
        s.equalPanels = r.cbEqual.value;
        s.guideRound  = TE.Utils.toNumber(r.etRound.text) || 0;
        s.overlap     = TE.Utils.toNumber(r.etOverlap.text) || 0;
        s.overlapMode    = r.rbOverlapMode[0].value ? "symmetric" : "onesided";
        s.overlapCarrier = r.rbOverlapMode[2].value ? "second" : "first";
        s.addTop      = TE.Utils.toNumber(r.etAddTop.text) || 0;
        s.addBottom   = TE.Utils.toNumber(r.etAddBottom.text) || 0;
        s.addLeft     = TE.Utils.toNumber(r.etAddLeft.text) || 0;
        s.addRight    = TE.Utils.toNumber(r.etAddRight.text) || 0;
        // Raster rows not built: the export is vector, whatever a preset says.
        s.exportMode  = (r.rbExpMode && r.rbExpMode[1].value) ? "raster" : "vector";
        s.exportScale = r.rbExpScale[1].value ? "actual" : "source";
        if (r.etDPI) { s.rasterDPI = TE.Utils.toNumber(r.etDPI.text) || 150; }
        s.drawLine    = r.cbLine.value;
        s.lineSpot    = r.etSpot.text;
        s.lineWidth   = TE.Utils.toNumber(r.etLineW.text) || 1;     // = default
        // The "no preset" item (N20) stands for "", like [Default]'s value.
        s.pdfPreset   = (r.ddPdf.selection && r.ddPdf.selection.text !== TE.L.PDF_PRESET_NONE)
            ? r.ddPdf.selection.text : "";
        s.outputDir   = r.etOut.text;
        s.namePattern = r.etPattern.text;
        s.skipExisting = r.cbSkip.value;
        if (r.rbOutType) {
            s.zundMode    = r.rbOutType[1].value;
            s.cutSpot     = r.ddCutSpot.selection ? r.ddCutSpot.selection.text : s.cutSpot;
            s.cutBleed    = TE.Utils.toNumber(r.etBleed.text);
            if (isNaN(s.cutBleed) || String(r.etBleed.text).replace(/\s/g, "") === "") {
                s.cutBleed = TE.Config.getDefaults().cutBleed;
            }
            s.markColor   = r.ddMarkColor.selection ? r.ddMarkColor.selection.text : "[Registration]";
            s.markSizeZ   = TE.Utils.toNumber(r.etMarkSize.text) || 5;
            s.gapInner    = TE.Utils.toNumber(r.etGapInner.text) || 5;
            s.maxDist     = TE.Utils.toNumber(r.etMaxDist.text) || 500;
            s.orientDist  = TE.Utils.toNumber(r.etOrient.text) || 100;
        } else {
            // No Zünd fields built: the mode cannot be on, whatever a stored
            // preset says.
            s.zundMode = false;
        }
        return s;
    },

    /**
     * Writes a settings object back into the dialog.
     * @param {Object} r - Control references.
     * @param {Object} s - Settings.
     */
    apply: function (r, s) {
        // The drawing scale is left alone: it is the document's, and a preset
        // or the last run must not overwrite it (1.1.0).
        r.rbDir[0].value = (s.direction !== "vertical");
        r.rbDir[1].value = (s.direction === "vertical");
        r.rbMode[0].value = (s.divideMode === "count");
        r.rbMode[1].value = (s.divideMode === "width");
        r.rbMode[2].value = (s.divideMode === "guides");
        r.etCount.text = String(s.tileCount);
        r.etWidth.text = String(s.tileWidth);
        r.cbEqual.value = !!s.equalPanels;
        r.etRound.text = String(s.guideRound);
        r.etOverlap.text = String(s.overlap);
        var oneSided  = (s.overlapMode === "onesided");
        var carrier2nd = oneSided && (s.overlapCarrier === "second");
        r.rbOverlapMode[0].value = !oneSided;
        r.rbOverlapMode[1].value = oneSided && !carrier2nd;
        r.rbOverlapMode[2].value = carrier2nd;
        r.etAddTop.text = String(s.addTop);
        r.etAddBottom.text = String(s.addBottom);
        r.etAddLeft.text = String(s.addLeft);
        r.etAddRight.text = String(s.addRight);
        if (r.rbExpMode) {
            r.rbExpMode[0].value = (s.exportMode !== "raster");
            r.rbExpMode[1].value = (s.exportMode === "raster");
        }
        r.rbExpScale[0].value = (s.exportScale !== "actual");
        r.rbExpScale[1].value = (s.exportScale === "actual");
        if (r.etDPI) { r.etDPI.text = String(s.rasterDPI); }
        r.cbLine.value = !!s.drawLine;
        r.etSpot.text = String(s.lineSpot);
        r.etLineW.text = String(s.lineWidth);
        // A stored name the list lacks — [Default]'s "", a preset deleted
        // from Illustrator — falls back to the first item, as when the dialog
        // is built. Keeping the previous selection made one preset look
        // different depending on what was loaded before it (N8).
        var pk;
        r.ddPdf.selection = 0;
        for (pk = 0; pk < r.ddPdf.items.length; pk++) {
            if (r.ddPdf.items[pk].text === s.pdfPreset) { r.ddPdf.selection = pk; break; }
        }
        r.etOut.text = String(s.outputDir);
        r.etPattern.text = String(s.namePattern);
        r.cbSkip.value = !!s.skipExisting;
        if (!r.rbOutType) { return; }
        r.rbOutType[0].value = !s.zundMode;
        r.rbOutType[1].value = !!s.zundMode;
        var zk;
        r.ddCutSpot.selection = 0;
        for (zk = 0; zk < r.ddCutSpot.items.length; zk++) {
            if (r.ddCutSpot.items[zk].text === s.cutSpot) { r.ddCutSpot.selection = zk; break; }
        }
        var mk;
        r.ddMarkColor.selection = 0;
        for (mk = 0; mk < r.ddMarkColor.items.length; mk++) {
            if (r.ddMarkColor.items[mk].text === s.markColor) { r.ddMarkColor.selection = mk; break; }
        }
        r.etMarkSize.text = String(s.markSizeZ);
        r.etGapInner.text = String(s.gapInner);
        r.etMaxDist.text = String(s.maxDist);
        r.etOrient.text = String(s.orientDist);
        r.etBleed.text = String(s.cutBleed);
    },

    /**
     * Maps a thrown geometry error code onto a localized message.
     *
     * Stacked panels split the height, so the panel "width" is a height there
     * and the messages say so (N40). A width that leaves one panel says how
     * long the artwork is along the split: "At least 2 panels" alone gave no
     * clue that 1000 mm on a 1000 mm tall graphic was the cause.
     *
     * @param {Error} err - Error from TE.Grid.
     * @param {Object} [s] - Settings: direction, divideMode, tileWidth.
     * @param {string} [span] - Artwork length along the split, displayed mm.
     * @returns {string} Message for the user.
     */
    describeError: function (err, s, span) {
        var l = TE.L, code = String(err && err.message);
        var down = !!s && s.direction === "vertical";
        if (code === "TE_MIN_TILES" && s && s.divideMode === "width" && span) {
            return l.format(down ? l.ERR_ONE_PANEL_H : l.ERR_ONE_PANEL_W,
                TE.Utils.formatMM(Number(s.tileWidth), l.DECIMAL), span);
        }
        if (code === "TE_MIN_TILES") { return l.ERR_MIN_TILES; }
        if (code === "TE_BAD_WIDTH") { return down ? l.ERR_BAD_HEIGHT : l.ERR_BAD_WIDTH; }
        if (code === "TE_CEILING_OVERLAP") { return down ? l.ERR_CEILING_OVERLAP_H : l.ERR_CEILING_OVERLAP; }
        if (code === "TE_NO_GUIDES") { return l.ERR_NO_GUIDES; }
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
        var alerts = [];   // errors and warnings, rendered ABOVE the geometry
        var ok = true, exportOk = true;

        // Mode-dependent fields: show the one that applies, grey the rest.
        r.etCount.enabled = (s.divideMode === "count");
        r.etWidth.enabled = (s.divideMode === "width");
        r.cbEqual.enabled = (s.divideMode !== "guides");
        r.etRound.enabled = (s.divideMode === "guides");
        if (r.etDPI) { r.etDPI.enabled = (s.exportMode === "raster"); }
        // The output scale carries the drawing's number; a 1:1 drawing has
        // nothing to choose and shows that instead.
        var oneToOne = Math.abs(Number(s.scaleN) - 1) < 1e-9;
        r.gScaleRow.visible = !oneToOne;
        r.gScaleOne.visible = oneToOne;
        r.rbExpScale[0].text = l.format(l.SCALE_DRAWING, TE.Utils.formatMM(Number(s.scaleN), l.DECIMAL));
        // Only the chosen output's fields show (1.1.0). Zünd mode draws no
        // trim line, the cut path takes its place; the line's stored choice
        // waits, hidden, for the manual output (N28). Set here rather than in
        // a click handler, so a loaded preset shows its own output too.
        if (r.gManual) { r.gManual.visible = !s.zundMode; }
        if (r.gZundFields) { r.gZundFields.visible = s.zundMode; }
        r.etSpot.enabled  = s.drawLine;
        r.etLineW.enabled = s.drawLine;

        // The artboard, the same rect the run divides (N27).
        var clean = ctx.cleanRect;
        // Document points to displayed millimetres, one decimal.
        var mm = function (pt) {
            return TE.Utils.formatMM(TE.Utils.fromDoc(pt, s), l.DECIMAL);
        };
        var ov = ctx.validation.overhang;
        r.stCleanInfo.text = l.format(l.INFO_CLEAN_VAL,
            mm(clean[2] - clean[0]), mm(clean[1] - clean[3]));
        r.stBleedInfo.text = l.format(l.INFO_BLEED_VAL,
            mm(ov.left), mm(ov.right), mm(ov.top), mm(ov.bottom));

        var ext = (s.direction === "horizontal")
            ? { start: clean[0], end: clean[2] }
            : { start: clean[3], end: clean[1] };
        // Stacked panels split the height: the field is the panel's height
        // there (N40).
        var down = (s.direction === "vertical");
        r.stWidthLbl.text = down ? l.LBL_HEIGHT : l.LBL_WIDTH;
        r.stWidthLbl.helpTip = r.etWidth.helpTip = down ? l.TIP_HEIGHT : l.TIP_WIDTH;

        try {
            // The guides of the chosen direction, as the run reads them. One
            // list for both directions previewed Vodorovně on the vertical
            // guides (N38).
            var cuts = TE.Grid.computeCuts(s, ext,
                ctx.guidesByDirection[s.direction].positions);
            var tiles = TE.Grid.computeTiles(cuts, clean, s);
            var v = TE.Validate.check(tiles, ctx.validation, s);

            lines.push(l.format(l.INFO_COUNT, tiles.length));

            var i, e, cl;
            for (i = 0; i < tiles.length; i++) {
                cl = tiles[i].clean;
                e = tiles[i].expanded;
                lines.push(l.format(l.INFO_TILE, tiles[i].index,
                    mm(cl[2] - cl[0]),
                    mm(cl[1] - cl[3]),
                    mm(e[2] - e[0]),
                    mm(e[1] - e[3])));
            }

            // The panel lines above are real millimetres and do not move with
            // the output scale; only the PDF page does. Say what it will be,
            // or the choice is invisible until the export (N16). Same k as
            // the export and the artboard check, TE.Utils.outputScale.
            var sf = ctx.validation.scaleFactor;
            var k = TE.Utils.outputScale(s, sf);
            var ratio = TE.Utils.pageRatio(s, sf);
            if (s.zundMode) {
                // Zünd pages are the mask plus gap and mark on every side —
                // computed exactly as the export does it (buildZundPanel).
                var zPages = [];
                for (i = 0; i < tiles.length; i++) {
                    var ztf = TE.Export.tileTransform(tiles[i], [0, 0, 0, 0], k);
                    var zab = TE.Core.calculateAll(s, TE.Export.zundLayout(ztf, s, ratio).mask, ratio).ab;
                    zPages.push(TE.Utils.formatMM(TE.Utils.pt2mm(zab[2] - zab[0]), l.DECIMAL) + " \u00d7 "
                        + TE.Utils.formatMM(TE.Utils.pt2mm(zab[1] - zab[3]), l.DECIMAL));
                }
                lines.push(l.format(l.INFO_PAGES_ZUND, TE.Utils.formatMM(ratio, l.DECIMAL), zPages.join(" | ")));
                lines.push(l.format(l.INFO_CUT_RECT, s.cutSpot));
                // Paths in the cut colour look like a shaped contour the user
                // expects to be cut. Say plainly that it is not, yet.
                if (TE.Utils.indexOf(ctx.contourSpots || [], s.cutSpot) !== -1) {
                    alerts.push("! " + l.format(l.WARN_CONTOUR_IGNORED, s.cutSpot));
                }
            } else if (Math.abs(ratio - 1) < 1e-9) {
                lines.push(l.INFO_PAGES_ACTUAL);
            } else {
                var pages = [];
                for (i = 0; i < tiles.length; i++) {
                    e = tiles[i].expanded;
                    pages.push(TE.Utils.formatMM(TE.Utils.pt2mm((e[2] - e[0]) * k), l.DECIMAL) + " \u00d7 "
                        + TE.Utils.formatMM(TE.Utils.pt2mm((e[1] - e[3]) * k), l.DECIMAL));
                }
                lines.push(l.format(l.INFO_PAGES, TE.Utils.formatMM(ratio, l.DECIMAL), pages.join(" | ")));
            }


            for (i = 0; i < v.errors.length; i++) { alerts.push("✗ " + v.errors[i]); }
            for (i = 0; i < v.exportErrors.length; i++) { alerts.push("✗ " + v.exportErrors[i]); }
            for (i = 0; i < v.warnings.length; i++) { alerts.push("! " + v.warnings[i]); }
            ok = (v.errors.length === 0);
            exportOk = (v.exportErrors.length === 0);
        } catch (err) {
            alerts.push("✗ " + this.describeError(err, s, mm(ext.end - ext.start)));
            ok = false;
        }

        // Errors first, then warnings, then the geometry. Whatever else scrolls
        // out of sight, the reason the Export button is dead must not: it used
        // to sit at the BOTTOM, below one line per panel.
        r.stCalc.text = alerts.concat(lines).join("\n");
        r.btnTiles.enabled = ok;
        r.btnExport.enabled = ok && exportOk;
    }
};
