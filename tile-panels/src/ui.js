var TP = TP || {};

TP.UI = {

    // =====================================================================
    // Row helper — standard labeled input row
    // =====================================================================

    /**
     * Adds a labeled numeric input row with optional unit suffix.
     * @param {Object} parent - ScriptUI container.
     * @param {string} label - Row label (from locale).
     * @param {*} value - Initial value.
     * @param {string} tip - HelpTip string (from locale).
     * @param {string} [unit] - Unit suffix, e.g. "mm" (optional).
     * @returns {Object} { inp: EditText, group: Group }
     */
    addRow: function (parent, label, value, tip, unit) {
        var g = parent.add("group");
        g.alignment = ["fill", "top"];
        g.spacing = 8;
        var st = g.add("statictext", undefined, label);
        st.preferredSize.width = 160;
        if (tip) st.helpTip = tip;
        var et = g.add("edittext", undefined, String(value));
        et.preferredSize.width = 60;
        if (tip) et.helpTip = tip;
        if (unit) g.add("statictext", undefined, unit);
        return { inp: et, group: g };
    },

    // =====================================================================
    // Phase 1: Setup dialog
    // =====================================================================

    /**
     * Shows the Phase 1 setup dialog.
     *
     * @param {Object} defaults - Default/saved settings.
     * @param {Object} artworkInfo - { widthMM, heightMM } (document mm, not real).
     * @returns {Object|null} Settings object or null on cancel.
     */
    showSetup: function (defaults, artworkInfo) {
        var l = TP.L;
        var cfg = TP.Config;
        var self = this;
        var u = TP.Utils;

        // =================================================================
        // Window
        // =================================================================
        var w = new Window("dialog", l.TITLE_SETUP);
        w.orientation = "column";
        w.alignChildren = ["fill", "top"];
        w.margins = 20;
        w.spacing = 15;
        w.preferredSize.width = 390;

        // =================================================================
        // Panel: Source artwork + Scale
        // =================================================================
        var pSource = w.add("panel", undefined, l.PANEL_SOURCE);
        pSource.alignChildren = ["fill", "top"];
        pSource.margins = 15;
        pSource.spacing = 10;

        // Artboard size (document mm)
        var grpAb = pSource.add("group");
        grpAb.alignment = ["fill", "top"];
        grpAb.spacing = 8;
        var stAbLabel = grpAb.add("statictext", undefined, l.LBL_ARTBOARD_SIZE);
        stAbLabel.preferredSize.width = 160;
        var stAbSize = grpAb.add("statictext", undefined,
            u.roundMM(artworkInfo.widthMM, 1) + " \u00d7 " +
            u.roundMM(artworkInfo.heightMM, 1) + " " + l.UNIT_MM);

        // Scale
        var grpScale = pSource.add("group");
        grpScale.alignment = ["fill", "top"];
        grpScale.spacing = 8;
        var stScaleLabel = grpScale.add("statictext", undefined, l.LBL_SCALE);
        stScaleLabel.preferredSize.width = 160;
        stScaleLabel.helpTip = l.TIP_SCALE;
        var etScale = grpScale.add("edittext", undefined, String(defaults.scale));
        etScale.preferredSize.width = 60;
        etScale.helpTip = l.TIP_SCALE;

        // Real size (dynamic)
        var grpReal = pSource.add("group");
        grpReal.alignment = ["fill", "top"];
        grpReal.spacing = 8;
        var stRealLabel = grpReal.add("statictext", undefined, l.LBL_REAL_SIZE);
        stRealLabel.preferredSize.width = 160;
        var stRealSize = grpReal.add("statictext", undefined, "");
        stRealSize.preferredSize.width = 180;

        function getScale() {
            var s = parseFloat(String(etScale.text).replace(/,/g, ".")) || 1;
            return s < 1 ? 1 : s;
        }

        function updateRealSize() {
            var sc = getScale();
            var rw = u.roundMM(artworkInfo.widthMM * sc, 1);
            var rh = u.roundMM(artworkInfo.heightMM * sc, 1);
            stRealSize.text = rw + " \u00d7 " + rh + " " + l.UNIT_MM;
        }
        updateRealSize();

        // =================================================================
        // Panel: Panel size (mode radio)
        // =================================================================
        var pPanel = w.add("panel", undefined, l.PANEL_PANEL_SIZE);
        pPanel.alignChildren = ["fill", "top"];
        pPanel.margins = 15;
        pPanel.spacing = 10;

        // Mode radio buttons
        var grpMode = pPanel.add("group");
        grpMode.alignment = ["fill", "top"];
        grpMode.spacing = 8;
        var rbMaxWidth = grpMode.add("radiobutton", undefined, l.LBL_MODE_MAX_WIDTH);
        rbMaxWidth.helpTip = l.TIP_MODE_MAX_WIDTH;
        var rbCount = grpMode.add("radiobutton", undefined, l.LBL_MODE_COUNT);
        rbCount.helpTip = l.TIP_MODE_COUNT;
        rbMaxWidth.value = (defaults.mode !== "panelCount");
        rbCount.value = (defaults.mode === "panelCount");

        // --- Max width fields ---
        var grpMW = pPanel.add("group");
        grpMW.orientation = "column";
        grpMW.alignment = ["fill", "top"];
        grpMW.alignChildren = ["fill", "top"];
        grpMW.spacing = 10;

        var rWidth = self.addRow(grpMW, l.LBL_PANEL_WIDTH, defaults.maxPanelWidth,
                                 l.TIP_PANEL_WIDTH, l.UNIT_MM);
        var rHeight = self.addRow(grpMW, l.LBL_PANEL_HEIGHT,
                                  defaults.maxPanelHeight || 0,
                                  l.TIP_PANEL_HEIGHT, l.UNIT_MM);

        var stHintH = grpMW.add("statictext", undefined, l.LBL_HEIGHT_HINT);
        stHintH.alignment = ["fill", "top"];

        // Redistribution checkbox + percentage
        var grpRedist = grpMW.add("group");
        grpRedist.alignment = ["fill", "top"];
        grpRedist.spacing = 8;
        var cbRedist = grpRedist.add("checkbox", undefined, l.LBL_REDISTRIBUTE);
        cbRedist.value = defaults.redistribute;
        cbRedist.helpTip = l.TIP_REDISTRIBUTE;
        var etRedistPct = grpRedist.add("edittext", undefined, String(defaults.redistributePct));
        etRedistPct.preferredSize.width = 40;
        etRedistPct.helpTip = l.TIP_REDISTRIBUTE;
        grpRedist.add("statictext", undefined, l.UNIT_PCT);

        // --- Panel count fields ---
        var grpPC = pPanel.add("group");
        grpPC.orientation = "column";
        grpPC.alignment = ["fill", "top"];
        grpPC.alignChildren = ["fill", "top"];
        grpPC.spacing = 10;

        var rCols = self.addRow(grpPC, l.LBL_COLUMNS, defaults.columns,
                                l.TIP_COLUMNS, "");
        var rRows = self.addRow(grpPC, l.LBL_ROWS, defaults.rows,
                                l.TIP_ROWS, "");
        var stHintR = grpPC.add("statictext", undefined, l.LBL_ROWS_HINT);
        stHintR.alignment = ["fill", "top"];

        // Mode toggle
        function updateMode() {
            var isMW = rbMaxWidth.value;
            grpMW.visible = isMW;
            grpPC.visible = !isMW;
            updatePreview();
        }

        rbMaxWidth.onClick = updateMode;
        rbCount.onClick = updateMode;
        updateMode();

        // =================================================================
        // Panel: Overlap
        // =================================================================
        var pOverlap = w.add("panel", undefined, l.PANEL_OVERLAP);
        pOverlap.alignChildren = ["fill", "top"];
        pOverlap.margins = 15;
        pOverlap.spacing = 10;

        var rOverlap = self.addRow(pOverlap, l.LBL_OVERLAP, defaults.overlap,
                                   l.TIP_OVERLAP, l.UNIT_MM);

        // =================================================================
        // Panel: Bleed
        // =================================================================
        var pBleed = w.add("panel", undefined, l.PANEL_BLEED);
        pBleed.alignChildren = ["fill", "top"];
        pBleed.margins = 15;
        pBleed.spacing = 10;

        // Uniform row
        var grpUni = pBleed.add("group");
        grpUni.alignment = ["fill", "top"];
        grpUni.spacing = 8;
        var cbUniform = grpUni.add("checkbox", undefined, l.LBL_BLEED_UNIFORM);
        cbUniform.value = defaults.bleedUniform;
        cbUniform.helpTip = l.TIP_BLEED_UNIFORM;
        var etBleedUni = grpUni.add("edittext", undefined, String(defaults.bleed));
        etBleedUni.preferredSize.width = 60;
        etBleedUni.helpTip = l.TIP_BLEED_UNIFORM;
        grpUni.add("statictext", undefined, l.UNIT_MM);

        // Per-edge row
        var grpEdge = pBleed.add("group");
        grpEdge.alignment = ["fill", "top"];
        grpEdge.spacing = 4;
        var stEdge = grpEdge.add("statictext", undefined, l.LBL_BLEED_PER_EDGE);
        stEdge.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.LBL_BLEED_TOP);
        var etBT = grpEdge.add("edittext", undefined, String(defaults.bleedTop));
        etBT.preferredSize.width = 40; etBT.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.LBL_BLEED_BOTTOM);
        var etBB = grpEdge.add("edittext", undefined, String(defaults.bleedBottom));
        etBB.preferredSize.width = 40; etBB.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.LBL_BLEED_LEFT);
        var etBL = grpEdge.add("edittext", undefined, String(defaults.bleedLeft));
        etBL.preferredSize.width = 40; etBL.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.LBL_BLEED_RIGHT);
        var etBR = grpEdge.add("edittext", undefined, String(defaults.bleedRight));
        etBR.preferredSize.width = 40; etBR.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.UNIT_MM);

        function updateBleedState() {
            var uni = cbUniform.value;
            etBleedUni.enabled = uni;
            etBT.enabled = !uni;
            etBB.enabled = !uni;
            etBL.enabled = !uni;
            etBR.enabled = !uni;
        }
        cbUniform.onClick = function () {
            updateBleedState();
            updatePreview();
        };
        updateBleedState();

        // =================================================================
        // Panel: Options
        // =================================================================
        var pOpts = w.add("panel", undefined, l.PANEL_OPTIONS);
        pOpts.alignChildren = ["fill", "top"];
        pOpts.margins = 15;
        pOpts.spacing = 10;

        var grpKeep = pOpts.add("group");
        grpKeep.alignment = ["fill", "top"];
        var cbKeep = grpKeep.add("checkbox", undefined, l.LBL_KEEP_ORIGINAL);
        cbKeep.value = defaults.keepOriginalArtboard;
        cbKeep.helpTip = l.TIP_KEEP_ORIGINAL;

        // =================================================================
        // Panel: Preview (dynamically updated)
        // =================================================================
        var pPreview = w.add("panel", undefined, l.PANEL_PREVIEW);
        pPreview.alignChildren = ["fill", "top"];
        pPreview.margins = 15;
        pPreview.spacing = 6;

        var stPreviewGrid = pPreview.add("statictext", undefined, "");
        var stPreviewDims = pPreview.add("statictext", undefined, "");
        var stPreviewDoc = pPreview.add("statictext", undefined, "");
        var stPreviewNote = pPreview.add("statictext", undefined, "");

        function updatePreview() {
            if (!stPreviewGrid) return; // Guard: preview panel not yet constructed
            var sc = getScale();
            var realW = artworkInfo.widthMM * sc;
            var realH = artworkInfo.heightMM * sc;

            updateRealSize();

            var gridParams = {
                artworkWidthMM: realW,
                artworkHeightMM: realH
            };

            if (rbMaxWidth.value) {
                gridParams.mode = "maxWidth";
                gridParams.maxPanelWidth = parseFloat(String(rWidth.inp.text).replace(/,/g, ".")) || 0;
                gridParams.maxPanelHeight = parseFloat(String(rHeight.inp.text).replace(/,/g, ".")) || 0;
                gridParams.redistribute = cbRedist.value;
                gridParams.redistributePct = parseFloat(String(etRedistPct.text).replace(/,/g, ".")) || 30;
            } else {
                gridParams.mode = "panelCount";
                gridParams.columns = parseInt(rCols.inp.text, 10) || 1;
                gridParams.rows = parseInt(rRows.inp.text, 10) || 1;
            }

            if (gridParams.mode === "maxWidth" && gridParams.maxPanelWidth <= 0) {
                stPreviewGrid.text = "";
                stPreviewDims.text = "";
                stPreviewDoc.text = "";
                stPreviewNote.text = "";
                return;
            }

            var grid = TP.Core.calculateGrid(gridParams);
            var total = grid.totalPanels;

            if (total <= 1 && grid.columns <= 1 && grid.rows <= 1) {
                stPreviewGrid.text = l.LBL_PREVIEW_NO_TILE;
                stPreviewDims.text = "";
                stPreviewDoc.text = "";
                stPreviewNote.text = "";
                return;
            }

            stPreviewGrid.text = l.format(l.LBL_PREVIEW_GRID,
                grid.columns, grid.rows, total);

            // Show real panel dimensions
            var dimParts = [];
            if (grid.columns > 1 || gridParams.mode === "panelCount") {
                dimParts.push(u.roundMM(grid.vResult.panelDimMM, 1));
            }
            if (grid.rows > 1) {
                dimParts.push(u.roundMM(grid.hResult.panelDimMM, 1));
            }
            stPreviewDims.text = l.format(l.LBL_PREVIEW_DIMS,
                dimParts.join(" \u00d7 "));

            // Show document dimensions if scale > 1
            if (sc > 1) {
                var docParts = [];
                if (dimParts.length > 0) {
                    docParts.push(u.roundMM(grid.vResult.panelDimMM / sc, 1));
                }
                if (grid.rows > 1) {
                    docParts.push(u.roundMM(grid.hResult.panelDimMM / sc, 1));
                }
                stPreviewDoc.text = l.format(l.LBL_PREVIEW_DIMS_DOC,
                    docParts.join(" \u00d7 "));
            } else {
                stPreviewDoc.text = "";
            }

            var noteText = "";
            if (grid.vResult.redistributed) {
                noteText += l.format(l.LBL_PREVIEW_REDIST, gridParams.maxPanelWidth);
            }
            if (grid.hResult.redistributed) {
                if (noteText) noteText += " ";
                noteText += l.format(l.LBL_PREVIEW_REDIST, gridParams.maxPanelHeight);
            }
            if (total > 100) {
                if (noteText) noteText += "\n";
                noteText += l.format(l.LBL_PREVIEW_WARN_COUNT, total);
            }
            stPreviewNote.text = noteText;
        }

        // Wire onChange listeners for dynamic preview
        rWidth.inp.onChanging = updatePreview;
        rHeight.inp.onChanging = updatePreview;
        rCols.inp.onChanging = updatePreview;
        rRows.inp.onChanging = updatePreview;
        etScale.onChanging = updatePreview;
        cbRedist.onClick = updatePreview;
        etRedistPct.onChanging = updatePreview;

        // Initial preview
        updatePreview();

        // =================================================================
        // Footer
        // =================================================================
        var grpFooter = w.add("group");
        grpFooter.alignment = ["fill", "top"];
        var stCopy = grpFooter.add("statictext", undefined,
            "\u00a9 " + cfg.COPYRIGHT_YEAR + " " + cfg.AUTHOR +
            " \u2014 " + cfg.SCRIPT_NAME + " v" + cfg.VERSION);
        stCopy.enabled = false;

        // =================================================================
        // Buttons
        // =================================================================
        var grpBtns = w.add("group");
        grpBtns.alignment = "right";
        grpBtns.spacing = 8;
        grpBtns.add("button", undefined, l.BTN_CANCEL, { name: "cancel" });
        grpBtns.add("button", undefined, l.BTN_PLACE, { name: "ok" });

        // =================================================================
        // Validation and result
        // =================================================================
        w.defaultElement = grpBtns.children[1]; // OK button
        grpBtns.children[1].onClick = function () {
            var v = TP.Utils.validateNumber;

            var scale = v(etScale.text, 1, 1000, l.LBL_SCALE);
            if (scale === null) return;

            var mode = rbMaxWidth.value ? "maxWidth" : "panelCount";
            var maxW = 0, maxH = 0, cols = 1, rows = 1;
            var redist = false, redistPct = 30;

            if (mode === "maxWidth") {
                maxW = v(rWidth.inp.text, 1, 999999, l.LBL_PANEL_WIDTH);
                if (maxW === null) return;

                var maxHRaw = String(rHeight.inp.text).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
                if (maxHRaw !== "" && maxHRaw !== "0") {
                    maxH = v(maxHRaw, 1, 999999, l.LBL_PANEL_HEIGHT);
                    if (maxH === null) return;
                }

                redist = cbRedist.value;
                if (redist) {
                    redistPct = v(etRedistPct.text, 1, 90, l.LBL_REDISTRIBUTE);
                    if (redistPct === null) return;
                }
            } else {
                cols = v(rCols.inp.text, 1, 999, l.LBL_COLUMNS);
                if (cols === null) return;
                cols = Math.round(cols);

                rows = v(rRows.inp.text, 1, 999, l.LBL_ROWS);
                if (rows === null) return;
                rows = Math.round(rows);
            }

            var overlap = v(rOverlap.inp.text, 0, 99999, l.LBL_OVERLAP);
            if (overlap === null) return;

            var bleedUni = cbUniform.value;
            var bleedVal, bT, bB, bL, bR;

            if (bleedUni) {
                bleedVal = v(etBleedUni.text, 0, 9999, l.LBL_BLEED_UNIFORM);
                if (bleedVal === null) return;
                bT = bB = bL = bR = bleedVal;
            } else {
                bT = v(etBT.text, 0, 9999, l.LBL_BLEED_TOP);    if (bT === null) return;
                bB = v(etBB.text, 0, 9999, l.LBL_BLEED_BOTTOM);  if (bB === null) return;
                bL = v(etBL.text, 0, 9999, l.LBL_BLEED_LEFT);    if (bL === null) return;
                bR = v(etBR.text, 0, 9999, l.LBL_BLEED_RIGHT);   if (bR === null) return;
                bleedVal = bT;
            }

            w.result = {
                scale:           scale,
                mode:            mode,
                maxPanelWidth:   maxW,
                maxPanelHeight:  maxH,
                redistribute:    redist,
                redistributePct: redistPct,
                columns:         cols,
                rows:            rows,
                overlap:         overlap,
                bleedUniform:    bleedUni,
                bleed:           bleedVal,
                bleedTop:        bT,
                bleedBottom:     bB,
                bleedLeft:       bL,
                bleedRight:      bR,
                keepOriginalArtboard: cbKeep.value,
                markCropMarks:      defaults.markCropMarks,
                markLabels:         defaults.markLabels,
                markOverlapIndicators: defaults.markOverlapIndicators,
                markCrosshairs:     defaults.markCrosshairs
            };
            w.close(1);
        };

        if (w.show() === 1) {
            return w.result;
        }
        return null;
    },

    // =====================================================================
    // Phase 2: Apply dialog
    // =====================================================================

    /**
     * Shows the Phase 2 apply dialog.
     *
     * @param {Object} storedParams - Params from Phase 1 (pre-fills).
     * @param {Object} splitInfo - { splitsV: [], splitsH: [] } counts.
     * @returns {Object|null} Options object or null on cancel.
     */
    showApply: function (storedParams, splitInfo) {
        var l = TP.L;
        var cfg = TP.Config;
        var self = this;
        var defaults = storedParams || cfg.getDefaults();

        // =================================================================
        // Window
        // =================================================================
        var w = new Window("dialog", l.TITLE_APPLY);
        w.orientation = "column";
        w.alignChildren = ["fill", "top"];
        w.margins = 20;
        w.spacing = 15;
        w.preferredSize.width = 390;

        // =================================================================
        // Panel: Split lines found
        // =================================================================
        var pSplits = w.add("panel", undefined, l.PANEL_SPLITS);
        pSplits.alignChildren = ["fill", "top"];
        pSplits.margins = 15;
        pSplits.spacing = 10;

        var grpSV = pSplits.add("group");
        grpSV.spacing = 8;
        grpSV.add("statictext", undefined, l.LBL_SPLITS_V);
        grpSV.add("statictext", undefined, String(splitInfo.splitsV.length));

        var grpSH = pSplits.add("group");
        grpSH.spacing = 8;
        grpSH.add("statictext", undefined, l.LBL_SPLITS_H);
        grpSH.add("statictext", undefined, String(splitInfo.splitsH.length));

        // =================================================================
        // Panel: Overlap
        // =================================================================
        var pOverlap = w.add("panel", undefined, l.PANEL_OVERLAP);
        pOverlap.alignChildren = ["fill", "top"];
        pOverlap.margins = 15;
        pOverlap.spacing = 10;

        var rOverlap = self.addRow(pOverlap, l.LBL_OVERLAP, defaults.overlap,
                                   l.TIP_OVERLAP, l.UNIT_MM);

        // =================================================================
        // Panel: Bleed
        // =================================================================
        var pBleed = w.add("panel", undefined, l.PANEL_BLEED);
        pBleed.alignChildren = ["fill", "top"];
        pBleed.margins = 15;
        pBleed.spacing = 10;

        var grpUni = pBleed.add("group");
        grpUni.alignment = ["fill", "top"];
        grpUni.spacing = 8;
        var cbUniform = grpUni.add("checkbox", undefined, l.LBL_BLEED_UNIFORM);
        cbUniform.value = defaults.bleedUniform;
        cbUniform.helpTip = l.TIP_BLEED_UNIFORM;
        var etBleedUni = grpUni.add("edittext", undefined, String(defaults.bleed));
        etBleedUni.preferredSize.width = 60;
        etBleedUni.helpTip = l.TIP_BLEED_UNIFORM;
        grpUni.add("statictext", undefined, l.UNIT_MM);

        var grpEdge = pBleed.add("group");
        grpEdge.alignment = ["fill", "top"];
        grpEdge.spacing = 4;
        var stEdge = grpEdge.add("statictext", undefined, l.LBL_BLEED_PER_EDGE);
        stEdge.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.LBL_BLEED_TOP);
        var etBT = grpEdge.add("edittext", undefined, String(defaults.bleedTop));
        etBT.preferredSize.width = 40; etBT.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.LBL_BLEED_BOTTOM);
        var etBB = grpEdge.add("edittext", undefined, String(defaults.bleedBottom));
        etBB.preferredSize.width = 40; etBB.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.LBL_BLEED_LEFT);
        var etBL = grpEdge.add("edittext", undefined, String(defaults.bleedLeft));
        etBL.preferredSize.width = 40; etBL.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.LBL_BLEED_RIGHT);
        var etBR = grpEdge.add("edittext", undefined, String(defaults.bleedRight));
        etBR.preferredSize.width = 40; etBR.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.UNIT_MM);

        function updateBleedState() {
            var uni = cbUniform.value;
            etBleedUni.enabled = uni;
            etBT.enabled = !uni;
            etBB.enabled = !uni;
            etBL.enabled = !uni;
            etBR.enabled = !uni;
        }
        cbUniform.onClick = updateBleedState;
        updateBleedState();

        // =================================================================
        // Panel: Assembly marks
        // =================================================================
        var pMarks = w.add("panel", undefined, l.PANEL_MARKS);
        pMarks.alignChildren = ["fill", "top"];
        pMarks.margins = 15;
        pMarks.spacing = 10;

        var cbCrop = pMarks.add("checkbox", undefined, l.LBL_MARK_CROP);
        cbCrop.value = defaults.markCropMarks;
        cbCrop.helpTip = l.TIP_CROP_MARKS;

        var cbLabels = pMarks.add("checkbox", undefined, l.LBL_MARK_LABELS);
        cbLabels.value = defaults.markLabels;
        cbLabels.helpTip = l.TIP_LABELS;

        var cbOverlap = pMarks.add("checkbox", undefined, l.LBL_MARK_OVERLAP);
        cbOverlap.value = defaults.markOverlapIndicators;
        cbOverlap.helpTip = l.TIP_OVERLAP_IND;

        var cbCross = pMarks.add("checkbox", undefined, l.LBL_MARK_CROSSHAIRS);
        cbCross.value = defaults.markCrosshairs;
        cbCross.helpTip = l.TIP_CROSSHAIRS;

        // =================================================================
        // Footer
        // =================================================================
        var grpFooter = w.add("group");
        grpFooter.alignment = ["fill", "top"];
        var stCopy = grpFooter.add("statictext", undefined,
            "\u00a9 " + cfg.COPYRIGHT_YEAR + " " + cfg.AUTHOR +
            " \u2014 " + cfg.SCRIPT_NAME + " v" + cfg.VERSION);
        stCopy.enabled = false;

        // =================================================================
        // Buttons
        // =================================================================
        var grpBtns = w.add("group");
        grpBtns.alignment = "right";
        grpBtns.spacing = 8;
        grpBtns.add("button", undefined, l.BTN_CANCEL, { name: "cancel" });
        grpBtns.add("button", undefined, l.BTN_APPLY, { name: "ok" });

        // =================================================================
        // Validation and result
        // =================================================================
        grpBtns.children[1].onClick = function () {
            var v = TP.Utils.validateNumber;

            var overlap = v(rOverlap.inp.text, 0, 99999, l.LBL_OVERLAP);
            if (overlap === null) return;

            var bleedUni = cbUniform.value;
            var bleedVal, bT, bB, bL, bR;

            if (bleedUni) {
                bleedVal = v(etBleedUni.text, 0, 9999, l.LBL_BLEED_UNIFORM);
                if (bleedVal === null) return;
                bT = bB = bL = bR = bleedVal;
            } else {
                bT = v(etBT.text, 0, 9999, l.LBL_BLEED_TOP);    if (bT === null) return;
                bB = v(etBB.text, 0, 9999, l.LBL_BLEED_BOTTOM);  if (bB === null) return;
                bL = v(etBL.text, 0, 9999, l.LBL_BLEED_LEFT);    if (bL === null) return;
                bR = v(etBR.text, 0, 9999, l.LBL_BLEED_RIGHT);   if (bR === null) return;
                bleedVal = bT;
            }

            w.result = {
                scale:          defaults.scale,
                overlap:        overlap,
                bleedUniform:   bleedUni,
                bleed:          bleedVal,
                bleedTop:       bT,
                bleedBottom:    bB,
                bleedLeft:      bL,
                bleedRight:     bR,
                keepOriginalArtboard: defaults.keepOriginalArtboard,
                markCropMarks:      cbCrop.value,
                markLabels:         cbLabels.value,
                markOverlapIndicators: cbOverlap.value,
                markCrosshairs:     cbCross.value
            };
            w.close(1);
        };

        if (w.show() === 1) {
            return w.result;
        }
        return null;
    }
};
