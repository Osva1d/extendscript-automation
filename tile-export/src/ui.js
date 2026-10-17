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
        REVERT_BTN:  30,  // px; a one-glyph button at the native 80 px dwarfs its row
        // px around a placeholder button's text: at the native 80 px five of
        // them were wider than the pattern field they sit under (2026-10-11)
        TOKEN_PAD:   24,
        // px; the Result's table columns: Panel, Clean, With adds, PDF page.
        // "20010 × 10000" fits 130, the headers fit, and the four with the
        // scroll bar stay inside the 478 px of the right column (2026-10-15)
        RESULT_COLS: [50, 130, 135, 140],
        // px; the table shows its header and three rows — equal panels share
        // a row, so three cover most splits — and scrolls past that. A listbox
        // with headers needs 33 px plus 20 per row (measured 2026-10-15)
        RESULT_TABLE_H: 93,
        // px; three lines of details show, a Zünd job's marks line and its
        // first two files (preview of 2026-10-15); the other names scroll
        RESULT_TEXT_H: 58
    },

    // Status colours of the family (extendscript-ui-standards §12.6), RGB 0-1.
    COLORS: {
        ERR:  [0.90, 0.20, 0.20],
        WARN: [0.96, 0.60, 0.38],
        OK:   [0.36, 0.60, 0.34]
    },

    // The number fields of TE.Validate.NUMBER_FIELDS: their control and the
    // name a message gives them.
    NUMBER_CONTROLS: {
        scaleN: ["etScaleN", "FIELD_SCALE"], tileCount: ["etCount", "LBL_COUNT"],
        tileWidth: ["etWidth", "LBL_WIDTH"], guideRound: ["etRound", "LBL_ROUND"],
        overlap: ["etOverlap", "LBL_OVERLAP"], addTop: ["etAddTop", "LBL_ADD_TOP"],
        addBottom: ["etAddBottom", "LBL_ADD_BOTTOM"], addLeft: ["etAddLeft", "LBL_ADD_LEFT"],
        addRight: ["etAddRight", "LBL_ADD_RIGHT"], rasterDPI: ["etDPI", "LBL_DPI"],
        lineWidth: ["etLineW", "LBL_LINE_WIDTH"], cutBleed: ["etBleed", "LBL_CUT_BLEED"],
        markSizeZ: ["etMarkSize", "LBL_MARK_SIZE"], gapInner: ["etGapInner", "LBL_GAP_INNER"],
        maxDist: ["etMaxDist", "LBL_MAX_DIST"], orientDist: ["etOrient", "LBL_ORIENT"]
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
        this.normalizePresets(pData);
        var s = pData.presets[c.PRESET_KEY_LAST] || pData.presets[pData.activePreset]
             || c.getDefaults();

        var w = new Window("dialog", c.scriptName + " v" + c.version);
        w.orientation = "column";
        w.alignChildren = ["fill", "top"];   // panels match the widest one; no width set

        // Two columns, balanced by measured heights. 2026-10-11, with the
        // presets in two rows at the top of the left column and the
        // placeholder row: both columns 647 px, the Result stretched from its
        // 85 px floor to 99, the dialog 1178 x 749 px. Stacked in one column the
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
        colL.alignment = ["fill", "fill"];   // as tall as the right column, see pEdges

        var colR = gCols.add("group");
        colR.orientation = "column";
        colR.alignChildren = ["fill", "top"];
        colR.alignment = ["fill", "fill"];   // as tall as the left column (N18)

        // --- Presets ---------------------------------------------------------
        // At the top of the left column: the list and its revert button on
        // one row, the buttons that manage presets under it, as
        // zund-summa-marks has them. With all four in one row of the column
        // the list got 88 px; across the whole dialog it was 621 px with the
        // buttons far off at the right edge, too long (user, 2026-10-11). The
        // second row costs the left column 37 px, which the right one is
        // taller by anyway.
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
        // Revert reloads what the list shows, so it sits next to it (user,
        // 2026-10-11). Live only while the preset has unsaved edits (N8). In a
        // group of its own: ScriptUI shares a row's slack among all its
        // controls, and the list is to get it (engine-facts, row slack).
        var gRevert = gPreset.add("group");
        gRevert.alignment = ["right", "center"];
        var btnRevert = gRevert.add("button", undefined, l.BTN_REVERT);
        btnRevert.preferredSize.width = this.M.REVERT_BTN;   // [deviation] see M
        btnRevert.helpTip = l.TIP_REVERT;
        // Save, Save As and Delete manage the presets: under the list,
        // aligned right like the revert button above them.
        var gPresetBtns = pPreset.add("group");
        gPresetBtns.alignment = ["right", "top"];
        var btnSave = gPresetBtns.add("button", undefined, l.BTN_SAVE);
        btnSave.helpTip = l.TIP_SAVE;
        var btnSaveAs = gPresetBtns.add("button", undefined, l.BTN_SAVE_AS);
        btnSaveAs.helpTip = l.TIP_SAVE_AS;
        var btnDel = gPresetBtns.add("button", undefined, l.BTN_DEL);
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
        // Down to the foot of the column: since the Result has its status line
        // and table, the right column is the taller one, and the two columns
        // end on one line instead of the left one stopping 74 px short.
        pEdges.alignment = ["fill", "fill"];

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
        // The document's spots plus the shop's cut colours: a straight cut
        // needs no contour, so its colour need not be in the document yet —
        // the export creates it. Swatches in brackets ([Registrační]) are no
        // cut colour; a cut in registration could not be told from the marks.
        // A stored colour the list lacks shows as "(chybí)", never as the
        // first item (2026-10-16).
        var spotList = [], zj;
        var candidates = (ctx.spotNames || []).concat(c.CUT_SPOTS);
        for (zj = 0; zj < candidates.length; zj++) {
            if (candidates[zj] && candidates[zj].charAt(0) !== "["
                    && TE.Utils.indexOf(spotList, candidates[zj]) === -1) {
                spotList.push(candidates[zj]);
            }
        }
        for (zj = 0; zj < spotList.length; zj++) { ddCutSpot.add("item", spotList[zj]); }
        this.selectItem(ddCutSpot, s.cutSpot);

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
        // A stored colour the document lacks shows as "(chybí)"; the marks
        // then go in registration and the Result says so (§12.3, 2026-10-16).
        this.selectItem(ddMarkColor, s.markColor, this.sameMarkColor);

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
        // A stored preset this Illustrator lacks shows as "(chybí)" and stops
        // the export, which could not save with it (§12.3, 2026-10-16).
        this.selectItem(ddPdf, s.pdfPreset);

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
        // The whole row: the shop's pattern is 32 characters, 194 px, and the
        // 18-character field showed about half of it (measured 2026-10-11).
        etPattern.alignment = ["fill", "center"];

        // Placeholders as buttons under the field (user, 2026-10-11): a click
        // adds one at the end — the cursor is lost to the click, see
        // insertToken(). The button text is the placeholder it adds. {total}
        // has no button, the shop does not use it; typed, it still works
        // (user, 2026-10-16).
        var gTokens = pExp.add("group");
        gTokens.alignment = ["fill", "top"];
        var stTokens = gTokens.add("statictext", undefined, l.LBL_TOKENS);
        this.lockW(stTokens, this.M.LABEL_COL);   // [deviation] shared label axis
        stTokens.helpTip = l.TIP_TOKENS;
        var tokens = [["{doc}", l.TIP_TOKEN_DOC], ["{n}", l.TIP_TOKEN_N],
                      ["{size}", l.TIP_TOKEN_SIZE], ["{scale}", l.TIP_TOKEN_SCALE]];
        var btnTokens = [], ti, bt;
        for (ti = 0; ti < tokens.length; ti++) {
            bt = gTokens.add("button", undefined, tokens[ti][0]);
            // [deviation] see M: as wide as its text, not the native 80 px
            bt.preferredSize.width = Math.ceil(bt.graphics.measureString(tokens[ti][0])[0]) + this.M.TOKEN_PAD;
            bt.helpTip = tokens[ti][1];
            btnTokens.push(bt);
        }

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
        // Three parts since 1.1.0 (user, 2026-10-15): one status line that
        // says whether the export can run, coloured as the family colours its
        // states; a table, one row per panel or run of equal panels, so a
        // panel's sizes and its PDF page stand on one line instead of the old
        // "a | b | c" row of pages; and the details under it.
        var pCalc = colR.add("panel", undefined, l.PANEL_CALC);
        pCalc.alignment = ["fill", "fill"];
        pCalc.alignChildren = ["fill", "top"];
        var stStatus = pCalc.add("statictext", undefined, l.STATUS_NO_EXPORT);
        stStatus.alignment = ["fill", "top"];
        try {
            var sf0 = stStatus.graphics.font;
            stStatus.graphics.font = ScriptUI.newFont(sf0.name, "BOLD", sf0.size);
        } catch (fontErr) { TE.Utils.log("status font: " + fontErr.message); }
        var lbTiles = pCalc.add("listbox", undefined, undefined, { numberOfColumns: 4, showHeaders: true,
            columnTitles: [l.COL_TILE, l.COL_CLEAN, l.COL_EXPANDED, l.COL_PAGE],
            columnWidths: this.M.RESULT_COLS });
        lbTiles.preferredSize.height = this.M.RESULT_TABLE_H;   // [deviation] see M
        lbTiles.alignment = ["fill", "fill"];   // takes what the left column leaves (N18)
        // [deviation] readonly edittext, not statictext: errors, the marks
        // line and the file names can run longer than three lines, and a
        // fixed-height statictext CLIPS the rest with no sign that anything
        // is missing. Scrolling keeps it reachable, readonly keeps it from
        // being edited; a fixed height keeps a long text from growing the
        // dialog (a twelve-panel job once grew it to 932 px, measured).
        var stCalc = pCalc.add("edittext", undefined, "",
            { multiline: true, scrolling: true, readonly: true });
        stCalc.preferredSize.height = this.M.RESULT_TEXT_H;   // [deviation] see M
        stCalc.alignment = ["fill", "bottom"];

        // --- Footer ----------------------------------------------------------
        var gFooter = w.add("group");
        gFooter.alignment = ["fill", "top"];
        // The family's footer (extendscript-ui-standards §9): the author as
        // in the dist header, the version, no tool name — the title has it.
        var stCopy = gFooter.add("statictext", undefined,
            "© 2025–2026 Ladislav Osvald · v" + c.version);
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
            stStatus: stStatus, lbTiles: lbTiles,
            stCalc: stCalc, btnTiles: btnTiles, btnExport: btnExport
        };

        // One layout with the widest texts still in place, before anything
        // can write the real ones. A statictext keeps the width of its first
        // layout (measured), and the real values arrive early: loading the
        // active preset below changes a list's selection, its onChange runs
        // refresh(), and that lays the dialog out. At the end of the build
        // this pass came too late — at drawing scale 100 the clean format,
        // the bleed and "1:100 jako kresba" were cut (2026-10-17).
        w.layout.layout(true);

        function relayout() { w.layout.layout(true); }

        // A preset is not saved over a typo in a field the run uses (P1).
        var numbersOk = true;

        function refresh() {
            numbersOk = self.refresh(w, refs, ctx).numbersOk;
            refreshModifiedIndicator();
            relayout();
        }

        function wire(ctrl) {
            ctrl.onClick = refresh;
            ctrl.onChange = refresh;
            ctrl.onChanging = refresh;
        }

        /** A placeholder button: into the pattern, then the preview follows. */
        function tokenClick(token) {
            return function () {
                self.insertToken(etPattern, token);
                refresh();
            };
        }
        for (ti = 0; ti < btnTokens.length; ti++) { btnTokens[ti].onClick = tokenClick(btnTokens[ti].text); }

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
            btnSave.enabled = modified && numbersOk && (pData.activePreset !== c.PRESET_KEY_DEFAULT);
            btnSaveAs.enabled = numbersOk;
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
     * Adds a placeholder at the end of the pattern. Where the cursor was is
     * lost the moment another control is clicked, and ScriptUI cannot say:
     * tried with the user on 2026-10-11, textselection then wrote at the
     * start after a button or a tool button, at the end after a clickable
     * text, and a button that gave the field its focus back replaced the
     * whole pattern. A pattern is built left to right, so the end is right.
     * @param {Object} et - The pattern edittext.
     * @param {string} token - Placeholder such as "{n}".
     */
    insertToken: function (et, token) {
        et.text = et.text + token;
    },

    /**
     * The preset wrapper as the dialog needs it, changed in place.
     * [Default] holds the factory values only — Save never writes it — so it
     * is rebuilt from the code every time, as zund-summa-marks does. Kept
     * from the file, it showed what a build before N8 (2026-09-18) had let a
     * test write there, overlap 33 instead of 20 (manual test 2026-10-11),
     * and no later change to the defaults reached the dialog. An active
     * preset that is gone, or [Last Settings], falls back to [Default].
     * @param {Object} pData - Preset wrapper.
     * @returns {Object} The same wrapper.
     */
    normalizePresets: function (pData) {
        var c = TE.Config;
        pData.presets[c.PRESET_KEY_DEFAULT] = c.getDefaults();
        if (!pData.presets[pData.activePreset] || pData.activePreset === c.PRESET_KEY_LAST) {
            pData.activePreset = c.PRESET_KEY_DEFAULT;
        }
        return pData;
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
        s.scaleN      = TE.Utils.parseNumber(r.etScaleN.text);
        s.direction   = r.rbDir[1].value ? "vertical" : "horizontal";
        s.divideMode  = r.rbMode[1].value ? "width" : (r.rbMode[2].value ? "guides" : "count");
        s.tileCount   = TE.Utils.parseNumber(r.etCount.text);
        s.tileWidth   = TE.Utils.parseNumber(r.etWidth.text);
        s.equalPanels = r.cbEqual.value;
        s.guideRound  = TE.Utils.parseNumber(r.etRound.text);
        s.overlap     = TE.Utils.parseNumber(r.etOverlap.text);
        s.overlapMode    = r.rbOverlapMode[0].value ? "symmetric" : "onesided";
        s.overlapCarrier = r.rbOverlapMode[2].value ? "second" : "first";
        s.addTop      = TE.Utils.parseNumber(r.etAddTop.text);
        s.addBottom   = TE.Utils.parseNumber(r.etAddBottom.text);
        s.addLeft     = TE.Utils.parseNumber(r.etAddLeft.text);
        s.addRight    = TE.Utils.parseNumber(r.etAddRight.text);
        // Raster rows not built: the export is vector, whatever a preset says.
        s.exportMode  = (r.rbExpMode && r.rbExpMode[1].value) ? "raster" : "vector";
        s.exportScale = r.rbExpScale[1].value ? "actual" : "source";
        if (r.etDPI) { s.rasterDPI = TE.Utils.parseNumber(r.etDPI.text); }
        s.drawLine    = r.cbLine.value;
        s.lineSpot    = r.etSpot.text;
        s.lineWidth   = TE.Utils.parseNumber(r.etLineW.text);
        // The "no preset" item (N20) stands for "", like [Default]'s value.
        var pdf = this.itemValue(r.ddPdf);
        s.pdfPreset   = (pdf !== TE.L.PDF_PRESET_NONE) ? pdf : "";
        s.outputDir   = r.etOut.text;
        s.namePattern = r.etPattern.text;
        s.skipExisting = r.cbSkip.value;
        if (r.rbOutType) {
            s.zundMode    = r.rbOutType[1].value;
            s.cutSpot     = this.itemValue(r.ddCutSpot) || s.cutSpot;
            s.cutBleed    = TE.Utils.parseNumber(r.etBleed.text);
            s.markColor   = this.itemValue(r.ddMarkColor) || "[Registration]";
            s.markSizeZ   = TE.Utils.parseNumber(r.etMarkSize.text);
            s.gapInner    = TE.Utils.parseNumber(r.etGapInner.text);
            s.maxDist     = TE.Utils.parseNumber(r.etMaxDist.text);
            s.orientDist  = TE.Utils.parseNumber(r.etOrient.text);
        } else {
            // No Zünd fields built: the mode cannot be on, whatever a stored
            // preset says.
            s.zundMode = false;
        }
        return s;
    },

    /**
     * A stored number as field text. NaN — a typo in a field the run did not
     * use, kept as it was — and null show as an empty field, which the check
     * then names; never as "NaN" (audit P1).
     * @param {*} v - Stored value.
     * @returns {string} Field text.
     */
    numText: function (v) {
        if (v === null || v === undefined || (typeof v === "number" && !isFinite(v))) { return ""; }
        return String(v);
    },

    /**
     * Selects a list item by its text. A stored value the list lacks is
     * never swapped for the first item: it is added as "<value>  (chybí)"
     * and selected, and itemValue() reads it back without the marker
     * (extendscript-ui-standards §12.3, after zund-summa-marks
     * ZSM.UI.selectDDL). The marker item of an earlier call goes first, so
     * a preset looks the same whatever was loaded before it (N8). No stored
     * value — [Default]'s PDF preset "" — has nothing to keep: the first item.
     * @param {Object} dd - The dropdownlist.
     * @param {string} text - The value to select.
     * @param {Function} [same] - (itemText, value) -> whether they name the
     *        same thing; equal text when left out.
     */
    selectItem: function (dd, text, same) {
        var i;
        for (i = dd.items.length - 1; i >= 0; i--) {
            if (dd.items[i].teMissing) { dd.remove(i); }
        }
        if (!text) {
            if (dd.items.length > 0) { dd.selection = 0; }
            return;
        }
        for (i = 0; i < dd.items.length; i++) {
            if (same ? same(dd.items[i].text, text) : dd.items[i].text === text) {
                dd.selection = i;
                return;
            }
        }
        var missing = dd.add("item", text + "  " + TE.L.DDL_MISSING_SUFFIX);
        missing.teRawValue = text;
        missing.teMissing = true;
        dd.selection = missing;
    },

    /**
     * The value of a list's selection: the stored value behind a "(chybí)"
     * item, else the item's text; "" with nothing selected.
     * @param {Object} dd - The dropdownlist.
     * @returns {string} The value.
     */
    itemValue: function (dd) {
        var sel = dd.selection;
        if (!sel) { return ""; }
        return sel.teMissing ? sel.teRawValue : sel.text;
    },

    /**
     * Whether a mark colour list item and a stored mark colour are the same
     * colour. Registration is the one swatch in brackets the list holds, and
     * its name is the language's — [Registration], [Registrační] — so any
     * bracketed name is registration, as TE.Draw.readSpotDef takes it.
     * @param {string} itemText - The list item's text.
     * @param {string} value - The stored colour.
     * @returns {boolean} True for the same colour.
     */
    sameMarkColor: function (itemText, value) {
        return itemText === value || (itemText.charAt(0) === "[" && value.charAt(0) === "[");
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
        r.etCount.text = this.numText(s.tileCount);
        r.etWidth.text = this.numText(s.tileWidth);
        r.cbEqual.value = !!s.equalPanels;
        r.etRound.text = this.numText(s.guideRound);
        r.etOverlap.text = this.numText(s.overlap);
        var oneSided  = (s.overlapMode === "onesided");
        var carrier2nd = oneSided && (s.overlapCarrier === "second");
        r.rbOverlapMode[0].value = !oneSided;
        r.rbOverlapMode[1].value = oneSided && !carrier2nd;
        r.rbOverlapMode[2].value = carrier2nd;
        r.etAddTop.text = this.numText(s.addTop);
        r.etAddBottom.text = this.numText(s.addBottom);
        r.etAddLeft.text = this.numText(s.addLeft);
        r.etAddRight.text = this.numText(s.addRight);
        if (r.rbExpMode) {
            r.rbExpMode[0].value = (s.exportMode !== "raster");
            r.rbExpMode[1].value = (s.exportMode === "raster");
        }
        r.rbExpScale[0].value = (s.exportScale !== "actual");
        r.rbExpScale[1].value = (s.exportScale === "actual");
        if (r.etDPI) { r.etDPI.text = this.numText(s.rasterDPI); }
        r.cbLine.value = !!s.drawLine;
        r.etSpot.text = String(s.lineSpot);
        r.etLineW.text = this.numText(s.lineWidth);
        // As when the dialog is built: [Default]'s "" takes the first item,
        // a preset deleted from Illustrator shows as "(chybí)". Keeping the
        // previous selection made one preset look different depending on
        // what was loaded before it (N8).
        this.selectItem(r.ddPdf, s.pdfPreset);
        r.etOut.text = String(s.outputDir);
        r.etPattern.text = String(s.namePattern);
        r.cbSkip.value = !!s.skipExisting;
        if (!r.rbOutType) { return; }
        r.rbOutType[0].value = !s.zundMode;
        r.rbOutType[1].value = !!s.zundMode;
        this.selectItem(r.ddCutSpot, s.cutSpot);
        this.selectItem(r.ddMarkColor, s.markColor, this.sameMarkColor);
        r.etMarkSize.text = this.numText(s.markSizeZ);
        r.etGapInner.text = this.numText(s.gapInner);
        r.etMaxDist.text = this.numText(s.maxDist);
        r.etOrient.text = this.numText(s.orientDist);
        r.etBleed.text = this.numText(s.cutBleed);
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
    /**
     * Paints a number field red while it holds no usable number, and gives
     * it back the pen it had before. Forcing black would hide the text on the
     * dark UI (grommet-marks paintField, extendscript-ui-standards §12.3).
     * @param {Object} et - The edittext.
     * @param {boolean} valid - False paints it red.
     */
    paintField: function (et, valid) {
        var g = et && et.graphics;
        if (!g || !g.newPen) { return; }
        try {
            if (et.teDefaultPen === undefined) { et.teDefaultPen = g.foregroundColor || null; }
            g.foregroundColor = valid
                ? (et.teDefaultPen || g.newPen(g.PenType.SOLID_COLOR, [0.75, 0.75, 0.75, 1], 1))
                : g.newPen(g.PenType.SOLID_COLOR, this.COLORS.ERR.concat([1]), 1);
        } catch (e) {
            TE.Utils.log("paintField: " + e.message);
        }
    },

    /**
     * The message for a TE.Validate.numberErrors() entry, naming the field
     * as its label does, without the colon a label may carry.
     * @param {Object} e - {key, kind}.
     * @param {Object} s - Settings (direction names the width field).
     * @returns {string} Localized message.
     */
    numberMessage: function (e, s) {
        var l = TE.L;
        var labelKey = (e.key === "tileWidth" && s.direction === "vertical") ? "LBL_HEIGHT" : this.NUMBER_CONTROLS[e.key][1];
        var name = String(l[labelKey]).replace(/\s*:\s*$/, "");
        var tpl = { nan: l.ERR_FIELD_NUMBER, negative: l.ERR_FIELD_NEGATIVE, zero: l.ERR_FIELD_ZERO }[e.kind];
        return l.format(tpl, name);
    },

    /**
     * Rows of the Result table: consecutive panels with the same sizes and
     * page share one row, "2–4". Inner panels of a split are mostly equal, so
     * twelve panels fit three rows. PURE FUNCTION.
     * @param {Array} cells - [index, clean, withAdds, page] per panel.
     * @returns {Array} [label, clean, withAdds, page] per row.
     */
    groupRows: function (cells) {
        var rows = [], i, head, tail;
        for (i = 0; i < cells.length; i++) {
            head = cells[i];
            tail = head;
            while (i + 1 < cells.length && cells[i + 1][1] === head[1]
                    && cells[i + 1][2] === head[2] && cells[i + 1][3] === head[3]) {
                i++;
                tail = cells[i];
            }
            rows.push([(head === tail) ? String(head[0]) : head[0] + "\u2013" + tail[0], head[1], head[2], head[3]]);
        }
        return rows;
    },

    /**
     * Fills the Result table; empty when no split could be made.
     * @param {Object} lb - The listbox.
     * @param {Array} rows - From groupRows().
     */
    renderRows: function (lb, rows) {
        if (!lb) { return; }
        lb.removeAll();
        var i, it;
        for (i = 0; i < rows.length; i++) {
            it = lb.add("item", rows[i][0]);
            it.subItems[0].text = rows[i][1];
            it.subItems[1].text = rows[i][2];
            it.subItems[2].text = rows[i][3];
        }
    },

    /**
     * The status line, in the family colour of its state (§12.6).
     * @param {Object} st - The statictext.
     * @param {Object} status - {kind: "OK"|"WARN"|"ERR", text}.
     */
    renderStatus: function (st, status) {
        if (!st) { return; }
        st.text = status.text;
        var g = st.graphics;
        if (!g || !g.newPen) { return; }
        try {
            g.foregroundColor = g.newPen(g.PenType.SOLID_COLOR, this.COLORS[status.kind].concat([1]), 1);
        } catch (e) {
            TE.Utils.log("status colour: " + e.message);
        }
    },

    refresh: function (w, r, ctx) {
        var l = TE.L;
        var s = this.collect(r);
        var alerts = [];   // errors, rendered first
        var warns = [], info = [], names = [], rows = [];
        var count = 0, ratio = 1;
        var ok = true, exportOk = true;

        // A typo names its field and stops the run, instead of turning into a
        // default nobody sees (audit P1). Nothing is computed from it.
        var bad = TE.Validate.numberErrors(s), badKeys = {}, key, j;
        for (j = 0; j < bad.length; j++) {
            badKeys[bad[j].key] = true;
            alerts.push("✗ " + this.numberMessage(bad[j], s));
        }
        for (key in this.NUMBER_CONTROLS) {
            if (this.NUMBER_CONTROLS.hasOwnProperty(key) && r[this.NUMBER_CONTROLS[key][0]]) {
                this.paintField(r[this.NUMBER_CONTROLS[key][0]], !badKeys[key]);
            }
        }

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
        // Page millimetres, already converted, as "w × h".
        var size = function (w, h) {
            return TE.Utils.formatMM(w, l.DECIMAL) + " \u00d7 " + TE.Utils.formatMM(h, l.DECIMAL);
        };
        var ov = ctx.validation.overhang;
        // Real millimetres need the drawing scale; without one, no numbers.
        r.stCleanInfo.text = badKeys.scaleN ? "—" : l.format(l.INFO_CLEAN_VAL,
            mm(clean[2] - clean[0]), mm(clean[1] - clean[3]));
        r.stBleedInfo.text = badKeys.scaleN ? "—" : l.format(l.INFO_BLEED_VAL,
            mm(ov.left), mm(ov.right), mm(ov.top), mm(ov.bottom));

        var ext = (s.direction === "horizontal")
            ? { start: clean[0], end: clean[2] }
            : { start: clean[3], end: clean[1] };
        // Stacked panels split the height: the field is the panel's height
        // there (N40).
        var down = (s.direction === "vertical");
        r.stWidthLbl.text = down ? l.LBL_HEIGHT : l.LBL_WIDTH;
        r.stWidthLbl.helpTip = r.etWidth.helpTip = down ? l.TIP_HEIGHT : l.TIP_WIDTH;

        if (bad.length > 0) {
            ok = false;
        } else try {
            // The guides of the chosen direction, as the run reads them. One
            // list for both directions previewed Vodorovně on the vertical
            // guides (N38).
            var cuts = TE.Grid.computeCuts(s, ext,
                ctx.guidesByDirection[s.direction].positions);
            var tiles = TE.Grid.computeTiles(cuts, clean, s);
            var v = TE.Validate.check(tiles, ctx.validation, s);

            // One row per panel: its sizes and its PDF page on one line. The
            // sizes are real millimetres and do not move with the output
            // scale; only the page does, so it is shown, or the choice stays
            // invisible until the export (N16). The page is the export's own,
            // TE.Export.pageSizeMm — in Zünd mode the mask plus gap and mark
            // on every side — at real size, shown at the output scale. It is
            // computed once per panel and handed to the file names below: a
            // Zünd layout per panel is what the live preview spends its time
            // on, and the names computing it again doubled the refresh
            // (46 Zünd panels, measured 2026-10-16).
            var sf = ctx.validation.scaleFactor;
            ratio = TE.Utils.pageRatio(s, sf);
            var cells = [], pages = [], i, e, cl, pm;
            for (i = 0; i < tiles.length; i++) {
                cl = tiles[i].clean;
                e = tiles[i].expanded;
                pm = TE.Export.pageSizeMm(tiles[i], s, sf);
                pages.push(pm);
                cells.push([tiles[i].index, mm(cl[2] - cl[0]) + " \u00d7 " + mm(cl[1] - cl[3]),
                    mm(e[2] - e[0]) + " \u00d7 " + mm(e[1] - e[3]), size(pm[0] / ratio, pm[1] / ratio)]);
            }
            rows = this.groupRows(cells);
            count = tiles.length;

            if (s.zundMode) {
                info.push(l.format(l.INFO_MARKS_CUT, s.markColor, s.cutSpot));
                // Paths in the cut colour look like a shaped contour the user
                // expects to be cut. Say plainly that it is not, yet.
                if (TE.Utils.indexOf(ctx.contourSpots || [], s.cutSpot) !== -1) {
                    warns.push("\u26a0 " + l.format(l.WARN_CONTOUR_IGNORED, s.cutSpot));
                }
                // A stored cut colour the list lacks (§12.3): the export
                // creates it under that name. Said, so a "cut" for "Cut"
                // does not reach the machine unseen.
                if (r.ddCutSpot && r.ddCutSpot.selection && r.ddCutSpot.selection.teMissing) {
                    warns.push("\u26a0 " + l.format(l.WARN_CUT_SPOT_MISSING, s.cutSpot));
                }
                // A mark colour the document lacks: the marks go in
                // registration, as TE.Draw.resolveMarkColor falls back.
                if (r.ddMarkColor && r.ddMarkColor.selection && r.ddMarkColor.selection.teMissing) {
                    warns.push("\u26a0 " + l.format(l.WARN_MARK_COLOR_MISSING, s.markColor));
                }
            }

            // Every file the export will write, under the name it will get, so
            // the pattern can be checked before anything is written (1.1.0):
            // all of them, not only the first panel's (user, 2026-10-16). The
            // field scrolls, so a long job only makes the list longer.
            var nctx = { docName: ctx.docName || "", total: tiles.length, scaleFactor: sf };
            var nm, panelNames = [];
            for (i = 0; i < tiles.length; i++) {
                nm = TE.Export.fileName(tiles[i], nctx, s, pages[i]);
                panelNames.push(nm);
                names.push(nm + ".pdf");
                if (s.zundMode) { names.push(TE.Export.cutName(nm) + ".pdf"); }
            }
            // Only the export writes files, so only the export is stopped.
            // Every name comes from the one pattern; the first stands for all.
            // A name two panels share would leave one file for both; an empty
            // one is already said, and every panel shares it.
            var nameErr = TE.Validate.nameError(panelNames[0]);
            var dup = nameErr ? null : TE.Validate.duplicateName(panelNames);
            // A PDF preset this Illustrator lacks: saving with it would fail
            // on every panel (N20), so the export waits for another one.
            var pdfMissing = !!(r.ddPdf && r.ddPdf.selection && r.ddPdf.selection.teMissing);

            for (i = 0; i < v.errors.length; i++) { alerts.push("\u2717 " + v.errors[i]); }
            for (i = 0; i < v.exportErrors.length; i++) { alerts.push("\u2717 " + v.exportErrors[i]); }
            if (nameErr) { alerts.push("\u2717 " + nameErr); }
            if (dup) {
                alerts.push("\u2717 " + l.format(l.ERR_NAME_DUPLICATE,
                    tiles[dup.a].index, tiles[dup.b].index, panelNames[dup.a]));
            }
            if (pdfMissing) { alerts.push("\u2717 " + l.format(l.ERR_PDF_PRESET_MISSING, s.pdfPreset)); }
            for (i = 0; i < v.warnings.length; i++) { warns.push("\u26a0 " + v.warnings[i]); }
            ok = (v.errors.length === 0);
            exportOk = (v.exportErrors.length === 0) && !nameErr && !dup && !pdfMissing;
        } catch (err) {
            alerts.push("\u2717 " + this.describeError(err, s, mm(ext.end - ext.start)));
            ok = false;
        }

        // The status line says first whether the export can run; the details
        // put errors first, then warnings, then what the run will make, so
        // the reason a button is grey never scrolls out of sight.
        var status;
        if (alerts.length > 0) {
            status = { kind: "ERR", text: l.format(ok ? l.STATUS_NO_EXPORT : l.STATUS_STOP,
                l.count("ERRORS", alerts.length)) };
        } else if (warns.length > 0) {
            status = { kind: "WARN", text: l.format(l.STATUS_WARN, l.count("WARNINGS", warns.length)) };
        } else {
            status = { kind: "OK", text: l.format(l.STATUS_READY, l.count("TILES", count),
                s.zundMode ? l.OUT_SHORT_ZUND : l.OUT_SHORT_MANUAL, TE.Utils.formatMM(ratio, l.DECIMAL)) };
        }
        this.renderStatus(r.stStatus, status);
        this.renderRows(r.lbTiles, rows);
        r.stCalc.text = alerts.concat(warns, info, names).join("\n");
        r.btnTiles.enabled = ok;
        r.btnExport.enabled = ok && exportOk;
        return { ok: ok, exportOk: exportOk, numbersOk: bad.length === 0 };
    }
};
