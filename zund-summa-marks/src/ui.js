var ZSM = ZSM || {};

ZSM.UI = {

    // Shared metrics — the dialog's alignment grid in one place. buildDialog and
    // the addRow/addColorRow/makeSwatch helpers all read these, so each grid value
    // lives once. Audit "Audit UI vrstvy" froze the VALUES — do not change them:
    //  • ET_LAYER must stay < LABEL_COL (N6: long name never runs under the arrow)
    //  • COLOR_DD (spot-dropdown right-edge axis, N5) stays separate from VALUE_GROUP
    //  • LABEL_COL and COLOR_DD are two DIFFERENT axes — never unify them
    M: {
        LABEL_COL:    178,   // label column (hdrLayer, ddLayer, addRow.st, addColorRow.st)
        COLOR_DD:     112,   // colour dropdown width (ddColor, addColorRow.ddl-with-swatch)
        VALUE_GROUP:  130,   // value sub-group (addRow.vg, addColorRow.ddl-no-swatch)
        NUM_FIELD:    56,    // numeric edittext (addRow.et)
        ET_LAYER:     152,   // layer-name edittext (< LABEL_COL, N6)
        SWATCH:       16,    // colour swatch square
        LABEL_COL_W:  72,    // output-panel left column (Režim/Zdroj/scale spacer)
        PRESET_BTN:   92,    // preset action buttons
        RADIO:        70,    // mode radios
        SP_PANEL:     10,    // panel spacing (window, pGeo, pFeed, pLay)
        SP_GROUP:     8,     // group spacing (preset, mode, source, buttons …)
        SP_TIGHT:     5,     // colour-picker row rhythm (headers, layer row, addColorRow)
        RELAYOUT_PAD: 10     // height fudge after a relayout
    },

    // =====================================================================
    // Public entry point
    // =====================================================================

    /**
     * Builds and displays the settings dialog for the active mode.
     * Switching modes closes the current dialog and reopens with the new
     * layout — no hidden panels, no ghost spacing.
     *
     * @param {Object} pData - Preset wrapper from Storage.load() or getDefaults().
     * @returns {Object|null} Updated preset wrapper, or null on cancel.
     */
    show: function (pData) {
        var c = ZSM.Config;

        // Safety: ensure wrapper structure is valid
        if (!pData || !pData.presets) {
            pData = { activePreset: c.PRESET_KEY_DEFAULT, presets: {} };
            pData.presets[c.PRESET_KEY_DEFAULT] = c.getDefaults();
        }
        if (!pData.presets[pData.activePreset]) {
            pData.activePreset = c.PRESET_KEY_DEFAULT;
        }

        // Fetch live document data once (expensive DOM queries — getSwatchNames
        // iterates doc.spots, getLayerNames iterates doc.layers, detectCutColor
        // does both). Computed here at show() entry so the mode-switch loop
        // below reuses the same docData on every iteration without re-querying
        // the DOM. Runs in front of any UI construction.
        var docData = {
            swatches:      ZSM.Draw.getSwatchNames(),
            swatchRGB:     ZSM.Draw.getSwatchRGBMap(),
            layers:        ZSM.Draw.getLayerNames(),
            detectedColor: ZSM.Draw.detectCutColor()
        };

        // Determine initial mode from [Last Settings] or active preset
        var initPreset = pData.presets["[Last Settings]"] || pData.presets[pData.activePreset];
        var mode = (initPreset && initPreset.mode === "SUMMA") ? "SUMMA" : "ZUND";

        // Mode-switch loop: buildDialog returns result or a switch signal
        for (;;) {
            var outcome = this.buildDialog(mode, pData, docData);
            if (outcome && outcome._switchTo) {
                mode = outcome._switchTo;
                continue;
            }
            return outcome; // null (cancel) or pData (OK)
        }
    },

    // =====================================================================
    // Dialog builder — creates a mode-specific dialog
    // =====================================================================

    /**
     * Constructs and shows a dialog tailored to the given mode.
     * Returns the updated pData wrapper on OK, null on Cancel,
     * or {_switchTo: "ZUND"|"SUMMA"} when the user switches mode.
     *
     * @param {string} mode    - "ZUND" or "SUMMA"
     * @param {Object} pData   - Preset wrapper (mutated in place on OK/Save)
     * @param {Object} docData - {swatches, layers, detectedColor}
     * @returns {Object|null}
     */
    buildDialog: function (mode, pData, docData) {
        var c = ZSM.Config;
        var l = ZSM.L;
        var M = ZSM.UI.M;   // shared metrics (alignment grid)
        var self = this;
        var isZ = (mode === "ZUND");
        var isS = (mode === "SUMMA");

        // Resolve initial values: [Last Settings] → active preset → defaults
        var sData = pData.presets["[Last Settings]"]
                 || pData.presets[pData.activePreset]
                 || c.getDefaults();

        // =================================================================
        // Window
        // =================================================================
        var w = new Window("dialog", c.ui.title);
        w.orientation    = "column";
        w.alignChildren  = ["fill", "top"];
        w.margins        = [20, 14, 20, 12];
        w.spacing        = M.SP_PANEL;
        w.preferredSize.width = 390;

        // S2 — single relayout helper. The +RELAYOUT_PAD nudge counters the
        // engine under-measuring the window height after rows are added/removed;
        // keeping it in one place means the fudge can never drift between the
        // Add, Remove and setUIValues call sites.
        function relayout() {
            w.layout.layout(true);
            w.size.height = w.preferredSize.height + M.RELAYOUT_PAD;
        }

        // =================================================================
        // Panel: Presets
        // =================================================================
        var pPreset = w.add("panel", undefined, l.PANEL_PRESET);
        pPreset.alignChildren = ["fill", "top"];
        pPreset.margins = 12;
        pPreset.spacing = M.SP_GROUP;

        // Row 1: label + dropdown (full width)
        var grpPresetTop = pPreset.add("group");
        grpPresetTop.alignment = ["fill", "top"];
        grpPresetTop.spacing   = M.SP_GROUP;
        grpPresetTop.add("statictext", undefined, l.PRESET_LABEL);

        var ddPreset = grpPresetTop.add("dropdownlist", undefined, []);
        ddPreset.alignment = ["fill", "center"];
        ddPreset.helpTip = l.TIP_PRESET;

        // Revert (↺) — reload the active preset as saved, discarding unsaved
        // edits. Compact icon-only button (N7) so it no longer crowds the preset
        // dropdown; the helpTip carries the meaning. Enabled only when the preset
        // has unsaved changes (gated in refreshModifiedIndicator). Distinct from
        // Reset/Defaults (which loads factory defaults).
        var btnRevert = grpPresetTop.add("button", undefined, "↺");
        btnRevert.preferredSize = [30, 24];
        btnRevert.alignment = ["right", "center"];
        btnRevert.helpTip = l.TIP_REVERT;

        // Row 2: action buttons. "Defaults" (factory reset, N8) sits on the left
        // — it's a different class of action from the per-preset Save/Save As/
        // Delete cluster on the right, so it gets its own visual slot instead of
        // being hidden behind a [Default] dropdown pick (low discoverability).
        var grpPresetBtns = pPreset.add("group");
        grpPresetBtns.alignment = ["fill", "top"];
        grpPresetBtns.spacing = M.SP_GROUP;

        var btnReset = grpPresetBtns.add("button", undefined, l.BTN_RESET);
        btnReset.preferredSize.width = 80;
        btnReset.alignment = ["left", "center"];
        btnReset.helpTip = l.TIP_RESET;

        var grpPresetBtnsR = grpPresetBtns.add("group");
        grpPresetBtnsR.alignment = ["right", "center"];
        grpPresetBtnsR.spacing = M.SP_GROUP;

        // Uniform width so the three buttons line up evenly (text-based widths
        // made them ragged: "Uložit" vs "Uložit jako…" vs "Smazat").
        var PRESET_BTN_W = M.PRESET_BTN;
        var btnSave = grpPresetBtnsR.add("button", undefined, l.BTN_SAVE);
        btnSave.preferredSize.width = PRESET_BTN_W;
        btnSave.helpTip = l.TIP_SAVE;

        var btnSaveAs = grpPresetBtnsR.add("button", undefined, l.BTN_SAVE_AS);
        btnSaveAs.preferredSize.width = PRESET_BTN_W;
        btnSaveAs.helpTip = l.TIP_SAVE_AS;

        var btnDel = grpPresetBtnsR.add("button", undefined, l.BTN_DEL);
        btnDel.preferredSize.width = PRESET_BTN_W;
        btnDel.helpTip = l.TIP_DEL;

        // =================================================================
        // Panel: Output Settings (merges the former Technology + Document panels)
        // Mode, source and scale all describe HOW the job is emitted, so one
        // bordered block groups them and lowers the dialog by one panel border.
        // =================================================================
        var pOutput = w.add("panel", undefined, l.PANEL_OUTPUT);
        pOutput.alignChildren = ["left", "top"];
        pOutput.margins = 12;
        pOutput.spacing = M.SP_GROUP;

        // Shared left-column width: "Režim:", "Zdroj:" and the scale spacer all
        // reserve this, so the controls after them share one left edge. A
        // statictext (not a group) carries the width — ScriptUI honours
        // preferredSize on leaf controls but ignores it on groups.
        var LABEL_COL_W = M.LABEL_COL_W;

        // Mode row: label + segmented-style selector (H2). ScriptUI has no
        // native segmented control, so two mutually-exclusive radio buttons in
        // one group give the same one-glance "pick a technology" affordance
        // without the extra click a dropdown costs.
        var grpMode = pOutput.add("group");
        grpMode.orientation   = "row";
        grpMode.alignChildren = ["left", "center"];
        grpMode.spacing       = M.SP_GROUP;
        var stMode = grpMode.add("statictext", undefined, l.LBL_MODE);
        stMode.preferredSize.width = LABEL_COL_W;
        stMode.helpTip = l.TIP_MODE;
        var rbZund  = grpMode.add("radiobutton", undefined, l.MODE_ZUND);
        var rbSumma = grpMode.add("radiobutton", undefined, l.MODE_SUMMA);
        rbZund.preferredSize.width  = M.RADIO;
        rbSumma.preferredSize.width = M.RADIO;
        rbZund.value  = isZ;
        rbSumma.value = isS;
        rbZund.helpTip  = l.TIP_MODE;
        rbSumma.helpTip = l.TIP_MODE;

        // --- ZUND only: source radio buttons ---
        var grpSrc, rbAuto, rbFixed;
        if (isZ) {
            grpSrc = pOutput.add("group");
            grpSrc.orientation   = "row";
            grpSrc.alignChildren = ["left", "center"];
            grpSrc.spacing       = M.SP_GROUP;
            // Leading "Zdroj:" label (72px) under "Režim:" — the unlabelled
            // second radio row was ambiguous about what it selected.
            var stSource = grpSrc.add("statictext", undefined, l.LBL_SOURCE);
            stSource.preferredSize.width = LABEL_COL_W;
            rbAuto  = grpSrc.add("radiobutton", undefined, l.SRC_AUTO);
            rbFixed = grpSrc.add("radiobutton", undefined, l.SRC_FIXED);
            if (sData.useArtboardBounds) rbFixed.value = true;
            else rbAuto.value = true;
            rbAuto.helpTip  = l.TIP_SRC_AUTO;
            rbFixed.helpTip = l.TIP_SRC_FIXED;
        }

        // --- Scale row (Phase 2): 72px spacer + checkbox + 1:N field ---
        // Scale describes the document, but lives in the merged Output panel now.
        // Derived state: scaleN > 1 → checkbox checked, field enabled.
        // scaleN === 1 → checkbox unchecked, field disabled at "1".
        // Single source of truth: scaleN value (no extra checkbox state stored).
        var grpScale = pOutput.add("group");
        grpScale.orientation   = "row";
        grpScale.alignChildren = ["left", "center"];
        grpScale.spacing       = 10;   // breathing room between checkbox and the ratio

        // Leading spacer (LABEL_COL_W) aligns the checkbox's left edge with the
        // radios above. A statictext carries the width reliably (groups ignore it).
        var stScaleSpacer = grpScale.add("statictext", undefined, "");
        stScaleSpacer.preferredSize.width = LABEL_COL_W;

        var cbScale = grpScale.add("checkbox", undefined, l.SCALE_CHECKBOX);
        cbScale.helpTip = l.TIP_SCALE_CHECKBOX;

        // "1:" hugs its field as one unit (tight spacing) instead of floating
        // with equal gaps on both sides.
        var grpRatio = grpScale.add("group");
        grpRatio.orientation   = "row";
        grpRatio.alignChildren = ["left", "center"];
        grpRatio.spacing       = 3;

        var stScaleLabel = grpRatio.add("statictext", undefined, l.SCALE_FIELD_LABEL);
        stScaleLabel.helpTip = l.TIP_SCALE_FIELD;

        var etScale = grpRatio.add("edittext", undefined, "1");
        etScale.preferredSize.width = 60;   // match the other numeric inputs (addRow)
        etScale.helpTip = l.TIP_SCALE_FIELD;

        /** Enable/disable the ratio field AND its "1:" label together, so the
         *  whole "1:N" unit greys out as one when scaling is off. */
        function setScaleEnabled(on) {
            etScale.enabled      = on;
            stScaleLabel.enabled = on;
        }

        // Sync UI to initial scaleN value
        var initScaleN = parseInt(sData.scaleN, 10);
        if (isNaN(initScaleN) || initScaleN < 1) initScaleN = 1;
        if (initScaleN > 1) {
            cbScale.value   = true;
            etScale.text    = String(initScaleN);
            setScaleEnabled(true);
        } else {
            cbScale.value   = false;
            etScale.text    = "1";
            setScaleEnabled(false);
        }

        /** Read current scaleN from the UI controls (clean integer 1..10). */
        function readScaleN() {
            if (!cbScale.value) return 1;
            var n = parseInt(etScale.text, 10);
            if (isNaN(n) || n < 1) return 1;
            if (n > 10) return 10;
            return n;
        }

        /** Apply title suffix when scaling is active. */
        function applyTitleSuffix() {
            var n = readScaleN();
            var baseTitle = c.ui.title || "";
            // Strip any previous suffix " — 1:N"
            var base = baseTitle.replace(/\s*—\s*1:\d+\s*$/, "");
            try {
                w.text = (n > 1) ? (base + " — 1:" + n) : base;
            } catch (e) {}
        }
        applyTitleSuffix();   // initial

        cbScale.onClick = function () {
            if (cbScale.value) {
                setScaleEnabled(true);
                // Auto-suggest "10" when activating from "1"
                var cur = parseInt(etScale.text, 10);
                if (isNaN(cur) || cur <= 1) etScale.text = "10";
            } else {
                setScaleEnabled(false);
                etScale.text = "1";
            }
            applyTitleSuffix();
            refreshModifiedIndicator();
        };

        // onChange (commit, focus leaves the field) vs onChanging (every
        // keystroke) MUST differ here: the auto-uncheck on "1" may only run on
        // commit. If it ran per keystroke, typing "12" would disable the field
        // after the first "1" — mid-typing lockout. liveValidateAll paints the
        // field red / gates Generate for out-of-range values (e.g. 50).
        etScale.onChange = function () {
            var n = parseInt(etScale.text, 10);
            // Auto-uncheck when user explicitly commits 1
            if (n === 1) {
                cbScale.value   = false;
                setScaleEnabled(false);
            }
            applyTitleSuffix();
            refreshModifiedIndicator();
            liveValidateAll();
        };
        etScale.onChanging = function () {
            applyTitleSuffix();
            refreshModifiedIndicator();
            liveValidateAll();
        };

        // =================================================================
        // Panel: Gap / Geometry (mode-specific rows)
        // =================================================================
        var pGeo = w.add("panel", undefined, l.PANEL_GEO);
        pGeo.alignChildren = ["fill", "top"];
        pGeo.margins = 12;
        pGeo.spacing = M.SP_PANEL;

        // ZUND only: gap from graphic
        var rGapGZ;
        if (isZ) {
            rGapGZ = self.addRow(pGeo, l.GAP_GZ, sData.gapInner, l.TIP_GAP_GZ);
        }

        // S1 — single source for the Auto-fit/Fixed → "gap from graphics" enable
        // rule (gap from graphics is irrelevant in Fixed mode). ZUND-only; a no-op
        // in SUMMA (no source radios / gap row). Called from init, the source
        // radios' onClick, and setUIValues, so the three former inline copies can
        // never drift apart.
        function applySourceState() {
            if (isZ && rGapGZ && rGapGZ.inp && rbFixed) {
                rGapGZ.inp.enabled = !rbFixed.value;
            }
        }
        applySourceState();   // initial

        // Shared rows
        var rGapZO = self.addRow(pGeo, l.GAP_ZO,  sData.gapOuter, l.TIP_GAP_ZO);
        var rMaxD  = self.addRow(pGeo, l.MAX_DIST, sData.maxDist,  l.TIP_MAX_DIST);

        // Mode-specific mark size
        var rMarkSize;
        if (isZ) {
            rMarkSize = self.addRow(pGeo, l.MARK_SIZE_Z, sData.markSizeZ || 5, l.TIP_SIZE_Z);
        } else {
            rMarkSize = self.addRow(pGeo, l.MARK_SIZE_S, sData.markSizeS || 3, l.TIP_SIZE_S);
        }

        // ZUND only: orientation mark offset
        var rOrientDist;
        if (isZ) {
            rOrientDist = self.addRow(pGeo, l.ORIENT_DIST, sData.orientDist !== undefined ? sData.orientDist : 100, l.TIP_ORIENT_DIST);
        }

        // Shared: mark color
        var rColor = self.addColorRow(pGeo, l.MARK_COLOR, sData.markColor, docData.swatches, l.TIP_MARK_COLOR, docData.swatchRGB);

        // =================================================================
        // Panel: Feed (SUMMA only — not created for ZUND)
        // =================================================================
        var rFT, rFB, chRed;
        if (isS) {
            var pFeed = w.add("panel", undefined, l.PANEL_FEED);
            pFeed.alignChildren = ["fill", "top"];
            pFeed.margins = 12;
            pFeed.spacing = M.SP_PANEL;

            rFT   = self.addRow(pFeed, l.FEED_TOP, sData.feedTop,    l.TIP_FEED_TOP);
            rFB   = self.addRow(pFeed, l.FEED_BOT, sData.feedBottom, l.TIP_FEED_BOT);
            chRed = pFeed.add("checkbox", undefined, l.DRAW_RED);
            chRed.value   = sData.drawRed;
            chRed.helpTip = l.TIP_DRAW_RED;
        }

        // =================================================================
        // Panel: Layer to Color mapping (shared, dynamic rows)
        // =================================================================
        var pLay = w.add("panel", undefined, l.PANEL_LAYERS);
        pLay.alignChildren = ["fill", "top"];
        pLay.margins = 12;
        pLay.spacing = M.SP_PANEL;

        // "Marks only" toggle — sits atop the mapping table it controls. When on,
        // the script draws only marks and never touches layers, so the mapping
        // below is irrelevant and gets greyed out (see applyMarksOnlyState).
        var cbMarksOnly = pLay.add("checkbox", undefined, l.MARKS_ONLY);
        cbMarksOnly.helpTip = l.TIP_MARKS_ONLY;
        cbMarksOnly.value   = (sData.marksOnly === true);

        // Column headers
        var grpHeaders = pLay.add("group");
        grpHeaders.alignment = "fill";
        grpHeaders.spacing   = M.SP_TIGHT;
        var hdrLayer = grpHeaders.add("statictext", undefined, l.COL_LAYER);
        hdrLayer.preferredSize.width = M.LABEL_COL;
        var hdrColor = grpHeaders.add("statictext", undefined, l.COL_COLOR);
        hdrColor.preferredSize.width = 120;
        var hdrSpacer = grpHeaders.add("statictext", undefined, "");
        hdrSpacer.preferredSize.width = 30;

        // Row container (add button lives outside — ScriptUI limitation)
        var layContainer = pLay.add("group");
        layContainer.orientation   = "column";
        layContainer.alignChildren = ["fill", "top"];
        layContainer.spacing       = 6;

        var layRows    = [];
        var MAX_LAYERS = 8;

        function updateRemoveButtons() {
            var canRemove = layRows.length > 1;
            for (var r = 0; r < layRows.length; r++) {
                layRows[r].btnRemove.enabled = canRemove;
            }
        }

        /**
         * Builds a single layer-to-color mapping row (Harbs pattern).
         * @param {Object} def - {name, color}
         */
        function buildLayerRow(def) {
            var grp = layContainer.add("group");
            grp.alignment = "fill";
            grp.spacing   = M.SP_TIGHT;

            var stack = grp.add("group");
            stack.orientation   = "stack";
            stack.alignChildren = ["left", "center"];
            // Stack width follows its widest child — ScriptUI ignores
            // preferredSize on GROUP containers, so the column width (178, the
            // same left edge as the spot swatch and numeric fields) is set on
            // ddLayer directly, not on the stack.

            var ddLayer = stack.add("dropdownlist", undefined, docData.layers);
            ddLayer.preferredSize.width = M.LABEL_COL;
            ddLayer.helpTip = l.TIP_LAY_NAME;

            var etLayer = stack.add("edittext", undefined, def.name || "");
            // Narrower than the dropdown behind it (178) so a long custom layer
            // name never runs under the dropdown's expand arrow (N6).
            etLayer.preferredSize.width = M.ET_LAYER;
            etLayer.helpTip = l.TIP_LAY_NAME;

            ddLayer.onChange = function () {
                // Use ddlValue so picking a synthetic "(missing)" item copies the
                // raw layer name into the edittext, not the display marker.
                if (ddLayer.selection) etLayer.text = ZSM.UI.ddlValue(ddLayer);
            };
            ZSM.UI.selectDDL(ddLayer, def.name || "");

            var swColor = ZSM.UI.makeSwatch(grp);
            var ddColor = grp.add("dropdownlist", undefined, docData.swatches);
            ddColor.preferredSize.width = M.COLOR_DD;
            ddColor.helpTip = l.TIP_LAY_COLOR;
            ZSM.UI.selectDDL(ddColor, def.color || (docData.swatches.length > 0 ? docData.swatches[0] : ""));
            ZSM.UI.setSwatch(swColor, ZSM.UI.ddlValue(ddColor), docData.swatchRGB);

            var btnRemove = grp.add("button", undefined, "\u2212");
            btnRemove.preferredSize = [24, 22];
            btnRemove.alignment = ["right", "center"];
            btnRemove.helpTip = l.TIP_BTN_REMOVE;

            btnRemove.onClick = function () {
                if (layRows.length <= 1) return;
                for (var r = 0; r < layRows.length; r++) {
                    if (layRows[r].grp === grp) {
                        layContainer.remove(grp);
                        layRows.splice(r, 1);
                        break;
                    }
                }
                btnAddLayer.enabled = (layRows.length < MAX_LAYERS);
                updateRemoveButtons();
                relayout();
            };

            return { grp: grp, ddColor: ddColor, swColor: swColor, etLayer: etLayer, ddLayer: ddLayer, btnRemove: btnRemove };
        }

        // Populate initial layer rows
        var initLayers = (sData.layers && sData.layers.length > 0)
            ? sData.layers
            : [{ name: "Cut", color: docData.detectedColor }];

        for (var i = 0; i < initLayers.length; i++) {
            layRows.push(buildLayerRow(initLayers[i]));
        }
        updateRemoveButtons();

        var btnAddLayer = pLay.add("button", undefined, l.BTN_ADD_LAYER);
        btnAddLayer.alignment = "left";
        btnAddLayer.helpTip   = l.TIP_BTN_ADD;
        if (layRows.length >= MAX_LAYERS) btnAddLayer.enabled = false;

        btnAddLayer.onClick = function () {
            if (layRows.length >= MAX_LAYERS) return;
            var newRow = buildLayerRow({ name: "", color: docData.detectedColor });
            layRows.push(newRow);
            if (layRows.length >= MAX_LAYERS) btnAddLayer.enabled = false;
            updateRemoveButtons();
            relayout();
        };

        /** Grey out the mapping table when "marks only" is active (it has no
         *  effect then). The checkbox itself stays interactive (it's outside the
         *  disabled groups). Restores the normal Add-button gating when off. */
        function applyMarksOnlyState() {
            var on = cbMarksOnly.value;
            grpHeaders.enabled   = !on;
            layContainer.enabled = !on;
            btnAddLayer.enabled  = on ? false : (layRows.length < MAX_LAYERS);
        }
        cbMarksOnly.onClick = function () {
            applyMarksOnlyState();
            refreshModifiedIndicator();
            liveValidateAll();   // marks-only toggles whether layer names are required
        };
        applyMarksOnlyState();   // initial state from sData.marksOnly

        // =================================================================
        // Footer — copyright (greyed) + action buttons
        // =================================================================
        // Copyright footer per extendscript-ui-standards §5: dynamic string
        // composed from constants (never hardcoded), enabled=false greys it
        // intentionally to visually distinguish from active controls.
        // Status line (V2) — explains *why* Generate is disabled and names the
        // offending field + its valid range. Sits directly above the footer so
        // the cause and the greyed button are seen together. Updated by
        // liveValidateAll; empty (reserved space) while everything is valid.
        var grpStatus = w.add("group");
        grpStatus.alignment = ["fill", "top"];
        var stStatus = grpStatus.add("statictext", undefined, "", { truncate: "end" });
        stStatus.preferredSize.width = 340;
        stStatus.alignment = ["fill", "center"];

        var grpFooterCopy = w.add("group");
        grpFooterCopy.alignment = ["fill", "top"];
        var stCopy = grpFooterCopy.add("statictext", undefined,
            "© 2025–2026 Osva1d — " + c.scriptName + " v" + c.version);
        stCopy.enabled = false;

        // Cancel (left) | Generate (right), right-aligned. Factory defaults load
        // via the "Defaults" button in the preset panel (N8); reverting a preset's
        // unsaved edits is the ↺ button next to the preset dropdown.
        var grpButtons = w.add("group");
        grpButtons.alignment = ["right", "center"];
        grpButtons.spacing   = M.SP_GROUP;

        var btnCan = grpButtons.add("button", undefined, l.BTN_CANCEL, { name: "cancel" });
        btnCan.helpTip = l.TIP_CANCEL;
        var btnOk  = grpButtons.add("button", undefined, l.BTN_OK,     { name: "ok" });
        btnOk.helpTip  = l.TIP_OK;

        // =================================================================
        // Internal helpers
        // =================================================================

        /** Parse a numeric edittext value (comma-safe). */
        function parseNum(et) {
            return parseFloat(et.text.replace(/,/g, "."));
        }

        /**
         * Normalise a colour read from a dropdown back to the canonical
         * "[Registration]" token. selectDDL's registration alias selects the
         * document's LOCALIZED registration swatch (e.g. CS "[Registrace]"), so
         * ddlValue reads that localized name back — but presets store the
         * canonical English token. Without this, a localized Illustrator would
         * see every registration colour as "changed" (a permanent "*" on every
         * preset, including [Default]). Maps the localized reg name → canonical;
         * leaves all other swatch names untouched.
         */
        function canonColor(name) {
            if (!name) return name;
            var regName;
            try {
                regName = (ZSM.Draw && ZSM.Draw.getRegistrationName)
                    ? ZSM.Draw.getRegistrationName() : "[Registration]";
            } catch (e) { regName = "[Registration]"; }
            return (name === regName) ? "[Registration]" : name;
        }

        /**
         * Reads current UI state into a flat settings object.
         * Only reads controls that exist in the current mode;
         * missing-mode values are preserved from the previous preset.
         */
        function getUIValues() {
            var prev = pData.presets[pData.activePreset] || c.getDefaults();
            var layers = [];
            for (var i = 0; i < layRows.length; i++) {
                var cSel = canonColor(ZSM.UI.ddlValue(layRows[i].ddColor)) || "[Registration]";
                layers.push({ name: layRows[i].etLayer.text || "", color: cSel });
            }
            var markColorSel = canonColor(ZSM.UI.ddlValue(rColor.ddl)) || "[Registration]";

            return {
                mode:              mode,
                gapInner:          isZ ? parseNum(rGapGZ.inp) : prev.gapInner,
                gapOuter:          parseNum(rGapZO.inp),
                maxDist:           parseNum(rMaxD.inp),
                feedTop:           isS ? parseNum(rFT.inp)    : prev.feedTop,
                feedBottom:        isS ? parseNum(rFB.inp)    : prev.feedBottom,
                drawRed:           isS ? chRed.value          : prev.drawRed,
                useArtboardBounds: isZ ? rbFixed.value        : false,
                markSizeZ:         isZ ? parseNum(rMarkSize.inp) : prev.markSizeZ,
                markSizeS:         isS ? parseNum(rMarkSize.inp) : prev.markSizeS,
                orientDist:        isZ ? parseNum(rOrientDist.inp) : prev.orientDist,
                markColor:         markColorSel,
                scaleN:            readScaleN(),
                marksOnly:         cbMarksOnly.value,
                layers:            layers
            };
        }

        /**
         * Fills the UI from a flat settings object.
         * Only writes to controls that exist in the current mode.
         */
        function setUIValues(obj) {
            if (!obj) return;

            // Mode selector (visual only — actual mode is fixed for this dialog;
            // reflect the dialog's own mode so the radios never desync from it).
            rbZund.value  = isZ;
            rbSumma.value = isS;

            // Shared controls
            rGapZO.inp.text = String(obj.gapOuter  !== undefined ? obj.gapOuter  : 0);
            rMaxD.inp.text  = String(obj.maxDist   !== undefined ? obj.maxDist   : 500);
            ZSM.UI.selectDDL(rColor.ddl, obj.markColor || "[Registration]");
            if (rColor.refresh) rColor.refresh();

            // ZUND-specific
            if (isZ) {
                rbFixed.value   = !!obj.useArtboardBounds;
                rbAuto.value    = !obj.useArtboardBounds;
                rGapGZ.inp.text = String(obj.gapInner  !== undefined ? obj.gapInner  : 5);
                applySourceState();
                rMarkSize.inp.text = String(obj.markSizeZ !== undefined ? obj.markSizeZ : 5);
                rOrientDist.inp.text = String(obj.orientDist !== undefined ? obj.orientDist : 100);
            }

            // SUMMA-specific
            if (isS) {
                rFT.inp.text    = String(obj.feedTop    !== undefined ? obj.feedTop    : 70);
                rFB.inp.text    = String(obj.feedBottom !== undefined ? obj.feedBottom : 50);
                chRed.value     = !!obj.drawRed;
                rMarkSize.inp.text = String(obj.markSizeS !== undefined ? obj.markSizeS : 3);
            }

            // Scale (Phase 2) — sync checkbox + field from scaleN value.
            var newScaleN = parseInt(obj.scaleN, 10);
            if (isNaN(newScaleN) || newScaleN < 1) newScaleN = 1;
            if (newScaleN > 10) newScaleN = 10;
            if (newScaleN > 1) {
                cbScale.value   = true;
                etScale.text    = String(newScaleN);
                setScaleEnabled(true);
            } else {
                cbScale.value   = false;
                etScale.text    = "1";
                setScaleEnabled(false);
            }
            applyTitleSuffix();

            // Rebuild layer rows
            while (layContainer.children.length > 0) {
                layContainer.remove(layContainer.children[0]);
            }
            layRows = [];

            var newLayers = (obj.layers && obj.layers.length > 0)
                ? obj.layers
                : [{ name: "Cut", color: docData.detectedColor }];
            for (var i = 0; i < newLayers.length; i++) {
                layRows.push(buildLayerRow(newLayers[i]));
            }
            btnAddLayer.enabled = (layRows.length < MAX_LAYERS);
            updateRemoveButtons();

            // Marks-only — sync checkbox and grey/enable the freshly-rebuilt
            // mapping controls to match.
            cbMarksOnly.value = (obj.marksOnly === true);
            applyMarksOnlyState();

            // Refresh the window layout so the rebuilt rows actually render.
            // The Add/Remove handlers do this inline and work; setUIValues must
            // do the SAME unconditionally. (An earlier `if (w.visible)` guard was
            // the bug: Window.visible is unreliable for "dialog" windows in
            // ExtendScript, so the relayout was skipped during Reset/preset-switch
            // — the rebuilt rows stayed un-laid-out, looking "cleared", and the
            // next Add was what finally revealed them, reading as "added two".)
            // Pre-show (initial load) this is a harmless no-op that w.show()
            // re-layouts anyway. Wrapped in try/catch defensively.
            try {
                relayout();
            } catch (e) {}

            // S3 — always (re)wire the freshly rebuilt layer rows. Runtime callers
            // (preset switch / Reset / Revert / Delete) used to call wireLayerRows()
            // themselves; centralising it here means setUIValues can never leave a
            // row unwired. Guarded: the var-expression form of wireLayerRows is not
            // yet assigned during the initial build call — initial wiring still runs
            // once after the first row build. The _zsmWired guard keeps it idempotent.
            if (typeof wireLayerRows === "function") wireLayerRows();

            // Re-run live validation after a programmatic value change. setUIValues
            // sets .text directly, which does NOT fire the edittext onChange that
            // normally drives validation — so without this, a stale "invalid" red +
            // disabled Generate button would persist after Reset / Revert / preset
            // switch even though the freshly-loaded values are valid (the dialog
            // looked permanently broken). No-op during the initial build (guarded).
            liveValidateAll();
        }

        // =================================================================
        // Preset logic — all state transitions delegated to ZSM.UIState.
        // ScriptUI-specific code (alerts, prompts, dropdown updates) lives here;
        // pure pData mutations and validation live in ZSM.UIState (testable).
        // =================================================================
        var sortedKeys = [];

        /** True if current UI values differ from the active preset. */
        function isModified() {
            try { return ZSM.UIState.isModified(pData, getUIValues()); } catch (e) { return false; }
        }

        /** Rebuild the preset dropdown from pData (using formatPresetList for ordering + asterisk). */
        function updatePresetList() {
            ddPreset.removeAll();
            var entries = ZSM.UIState.formatPresetList(pData, getUIValues(), l);
            sortedKeys = [];
            var selIdx = 0;
            for (var i = 0; i < entries.length; i++) {
                ddPreset.add("item", entries[i].displayText);
                sortedKeys.push(entries[i].key);
                if (entries[i].isActive) selIdx = i;
            }
            if (ddPreset.items.length > 0) ddPreset.selection = selIdx;
            btnDel.enabled = (pData.activePreset !== c.PRESET_KEY_DEFAULT);
        }

        /**
         * Refresh the active dropdown item's text + Save button state.
         * Lighter than updatePresetList(); call from input onChange handlers.
         */
        function refreshModifiedIndicator() {
            var modified = isModified();
            try { btnSave.enabled   = modified; } catch (e) {}
            try { btnRevert.enabled = modified; } catch (e) {}

            if (!ddPreset.selection) return;
            var idx = ddPreset.selection.index;
            var key = sortedKeys[idx];
            if (key !== pData.activePreset) return;
            var displayText = (key === c.PRESET_KEY_DEFAULT) ? l.PRESET_DEFAULT : key;
            if (modified) displayText += " *";
            try { ddPreset.items[idx].text = displayText; } catch (e) {
                // Some ScriptUI versions don't allow direct mutation
                updatePresetList();
            }
        }

        /**
         * Persist the preset wrapper to disk with consistent error reporting.
         * Single source of truth for all save call-sites (Save / Save As /
         * Delete) so a failed write is never silently swallowed — a stale
         * on-disk state that "resurrects" a deleted preset after restart is a
         * data-integrity bug, not a cosmetic one.
         */
        function persistSettings() {
            var ok = false;
            try { ok = ZSM.Storage.save(pData); } catch (e) { ok = false; }
            if (!ok) alert(l.ERR_WRITE_SETTINGS);
        }

        ddPreset.onChange = function () {
            if (!ddPreset.selection) return;
            var key = sortedKeys[ddPreset.selection.index];
            if (!key || key === pData.activePreset) return;
            var r = ZSM.UIState.selectPreset(pData, key);
            if (!r.ok) return;
            btnDel.enabled = (key !== c.PRESET_KEY_DEFAULT);
            setUIValues(r.settings);
            refreshModifiedIndicator();
        };

        /**
         * Save = update current named preset (silent overwrite, no prompt).
         * On [Default] / [Last Settings] degrades to Save As (needs a name).
         * Disabled by refreshModifiedIndicator when no unsaved changes.
         */
        btnSave.onClick = function () {
            var r = ZSM.UIState.save(pData, getUIValues());
            if (r.ok) {
                updatePresetList();
                // Saved → UI now matches the preset; Save/Revert must grey out
                // (updatePresetList refreshes the asterisk but not the buttons).
                refreshModifiedIndicator();
                persistSettings();
                return;
            }
            if (r.reason === "needs-name") btnSaveAs.onClick();
        };

        /**
         * Save As = create a new preset (always prompts for name).
         * Existing-name conflicts go through confirm(); cancellation preserves state.
         */
        btnSaveAs.onClick = function () {
            var raw = prompt(l.PROMPT_SAVE_AS, "");
            if (raw === null || raw === "") return;

            // Pre-validate to give a localized alert for reserved names
            // (UIState.saveAs returns "invalid-name" but no alert).
            var clean = ZSM.UIState.validatePresetName(raw);
            if (!clean) {
                alert(l.ERR_RESERVED_NAME);
                return;
            }

            var r = ZSM.UIState.saveAs(pData, raw, getUIValues(), function (existingName) {
                return confirm(l.ERR_PRESET_EXISTS);
            });
            if (!r.ok) return;
            updatePresetList();
            refreshModifiedIndicator();
            persistSettings();
        };

        btnDel.onClick = function () {
            // Guard reserved preset before prompting (no point confirming a
            // delete that will be rejected anyway).
            if (pData.activePreset === c.PRESET_KEY_DEFAULT) {
                alert(l.ERR_PRESET_DEL_DEF);
                return;
            }
            // Destructive + persisted to disk immediately → require explicit
            // confirmation (extendscript-ui-standards §10, ui-ux-principles §5).
            if (!confirm(ZSM.L.format(l.CONFIRM_DEL_PRESET, pData.activePreset))) {
                return;
            }
            var r = ZSM.UIState.deleteActive(pData);
            if (!r.ok) {
                if (r.reason === "reserved") alert(l.ERR_PRESET_DEL_DEF);
                return;
            }
            updatePresetList();
            setUIValues(pData.presets[c.PRESET_KEY_DEFAULT]);
            refreshModifiedIndicator();
            persistSettings();
        };

        /**
         * Revert = reload the ACTIVE preset's saved values, discarding the
         * current unsaved UI edits. Distinct from Reset (factory defaults):
         * Revert restores exactly what the selected preset holds on disk, so the
         * user can undo experimental edits without re-picking the preset. Enabled
         * only when modified (see refreshModifiedIndicator). Does NOT persist.
         */
        btnRevert.onClick = function () {
            var preset = pData.presets[pData.activePreset];
            if (!preset) return;
            setUIValues(preset);
            refreshModifiedIndicator();
        };

        /**
         * Reset = load factory defaults into the dialog (N8). Keeps the current
         * mode (switching modes is a separate control) and does NOT persist or
         * alter any named preset; the change simply shows as unsaved edits ("*")
         * until the user explicitly saves.
         */
        btnReset.onClick = function () {
            var d = c.getDefaults();
            d.mode = mode;
            setUIValues(d);
            refreshModifiedIndicator();
            liveValidateAll();
        };

        // =================================================================
        // Mode switch handler
        // =================================================================
        var switchTarget = null;

        function requestModeSwitch(newMode) {
            if (newMode === mode) return;

            // Snapshot current UI state into [Last Settings] so nothing is lost
            pData.presets["[Last Settings]"] = getUIValues();
            // Tag the snapshot with the TARGET mode so the next dialog opens correctly
            pData.presets["[Last Settings]"].mode = newMode;

            // Preserve window position across mode switch
            docData._lastBounds = w.bounds;

            switchTarget = newMode;
            w.close(2); // code 2 = mode switch (not OK, not Cancel)
        }

        // Segmented selector (H2): each radio requests the switch; the guard in
        // requestModeSwitch makes re-clicking the active mode a no-op.
        rbZund.onClick  = function () { requestModeSwitch("ZUND"); };
        rbSumma.onClick = function () { requestModeSwitch("SUMMA"); };

        // ZUND: source radio buttons update gapGZ enabled state
        if (isZ) {
            rbAuto.onClick  = function () { applySourceState(); };
            rbFixed.onClick = function () { applySourceState(); };
        }

        // =================================================================
        // OK: validate → build result → close
        // =================================================================
        var result = null;

        btnOk.onClick = function () {
            // Collect raw UI values (everything as written by user, no validation yet)
            var layers = [];
            for (var i = 0; i < layRows.length; i++) {
                var colorSel = canonColor(ZSM.UI.ddlValue(layRows[i].ddColor)) || "[Registration]";
                layers.push({ name: layRows[i].etLayer.text || "", color: colorSel });
            }

            // Every row carries a colour (defaults to [Registration]); a row with
            // a colour but a blank/whitespace name is an incomplete mapping that
            // render would silently drop. Block with a clear message so the user
            // names it or removes the row (symmetric to ERR_LAY_COLOR). Skipped
            // in marks-only mode — the mapping is ignored there.
            if (!cbMarksOnly.value) {
                for (var lc = 0; lc < layers.length; lc++) {
                    if ((layers[lc].name || "").replace(/^\s+|\s+$/g, "") === "") {
                        alert(ZSM.L.format(ZSM.L.ERR_LAY_NAME, layers[lc].color));
                        return;
                    }
                }
            }

            var markColorSel = canonColor(ZSM.UI.ddlValue(rColor.ddl)) || "[Registration]";

            var raw = {
                mode:              mode,
                gapOuter:          rGapZO.inp.text,
                maxDist:           rMaxD.inp.text,
                // gapInner is irrelevant (and its field disabled) in Fixed mode —
                // pass undefined so validation falls back to prev instead of
                // blocking Generate on a stale out-of-range value the user
                // cannot even edit.
                gapInner:          (isZ && rGapGZ.inp.enabled) ? rGapGZ.inp.text : undefined,
                markSizeZ:         isZ ? rMarkSize.inp.text  : undefined,
                orientDist:        isZ ? rOrientDist.inp.text: undefined,
                markSizeS:         isS ? rMarkSize.inp.text  : undefined,
                feedTop:           isS ? rFT.inp.text        : undefined,
                feedBottom:        isS ? rFB.inp.text        : undefined,
                drawRed:           isS ? !!chRed.value       : undefined,
                useArtboardBounds: isZ ? !!rbFixed.value     : false,
                markColor:         markColorSel,
                // scaleN: derived from checkbox + field state (1 when unchecked)
                scaleN:            readScaleN(),
                marksOnly:         cbMarksOnly.value,
                layers:            layers
            };

            // Run validation (alerts shown by validateNumber on failure).
            // Mode-irrelevant fields are pulled from prevOk (active preset).
            var prevOk = pData.presets[pData.activePreset] || c.getDefaults();
            var result_v = ZSM.Validation.validate(raw, prevOk, l);
            if (!result_v.valid) return;  // Errors already shown via alerts

            var finalSettings = result_v.settings;

            // Pass-through fields that ZSM.Validation doesn't currently handle
            // (mode-conditional booleans). Match prior behavior: keep prev value
            // when in opposite mode, otherwise read from UI.
            finalSettings.drawRed = isS ? !!chRed.value : (prevOk.drawRed === true);

            // Persist last run state — but DO NOT modify named presets.
            // Presets are immutable until explicitly saved via btnSave.
            // [Last Settings] is the runtime memory; activePreset stays
            // pointing at whatever named preset (or [Default]) was active.
            pData.presets["[Last Settings]"] = finalSettings;

            result = pData;
            w.close(1);
        };

        // =================================================================
        // Init and show
        // =================================================================

        // 1. Populate preset dropdown
        updatePresetList();

        // 2. Load initial values
        var initPreset = pData.presets["[Last Settings]"] || pData.presets[pData.activePreset];
        if (initPreset) setUIValues(initPreset);

        // 3. Sync dropdown selection to activePreset
        for (var initIdx = 0; initIdx < sortedKeys.length; initIdx++) {
            if (sortedKeys[initIdx] === pData.activePreset) {
                ddPreset.selection = initIdx;
                break;
            }
        }

        // -----------------------------------------------------------------
        // Live validation — visual feedback + OK-button gating
        // -----------------------------------------------------------------
        //
        // Every numeric edittext is paired with its ZSM.Validation rule.
        // On each keystroke we check value ∈ [min, max] and:
        //   - paint the edittext text red on invalid, default colour on valid
        //   - disable the Generate button if ANY visible numeric field is
        //     invalid (so the user can't submit an unprocessable value).
        //
        // graphics.foregroundColor is wrapped in try/catch — Adobe's API
        // can throw on certain Illustrator versions and graphics objects
        // not yet "realised". Failure to colour is non-fatal: the
        // OK-disable still works and protects from bad input.
        //
        // Mode-specific fields (rGapGZ etc.) are conditionally added so
        // the numericRows array only contains rows that exist for the
        // current mode.
        var numericRows = [];
        if (isZ) {
            numericRows.push({ row: rGapGZ,      rule: ZSM.Validation.rules.gapInner   });
            numericRows.push({ row: rOrientDist, rule: ZSM.Validation.rules.orientDist });
            numericRows.push({ row: rMarkSize,   rule: ZSM.Validation.rules.markSizeZ  });
        } else {
            numericRows.push({ row: rMarkSize, rule: ZSM.Validation.rules.markSizeS });
            numericRows.push({ row: rFT,       rule: ZSM.Validation.rules.feedTop   });
            numericRows.push({ row: rFB,       rule: ZSM.Validation.rules.feedBottom });
        }
        numericRows.push({ row: rGapZO, rule: ZSM.Validation.rules.gapOuter });
        numericRows.push({ row: rMaxD,  rule: ZSM.Validation.rules.maxDist  });
        // Scale field (1:N) — without this an out-of-range N (e.g. 50) would be
        // silently clamped to 10 by readScaleN with no visual signal. Wrapped in
        // {inp:} to match the row shape; skipped automatically when the checkbox
        // is off (the field is disabled then).
        numericRows.push({ row: { inp: etScale }, rule: ZSM.Validation.rules.scaleN });

        function isValueInRange(et, rule) {
            var raw = String(et.text || "").replace(/,/g, ".");
            var n   = parseFloat(raw);
            if (isNaN(n)) return false;
            return (n >= rule.min && n <= rule.max);
        }

        function markFieldValidity(et, valid) {
            // Try to repaint the edittext. Wrapped because Adobe's graphics
            // API can throw "no graphics yet" until the window is realised
            // and on some legacy versions doesn't support newPen at all.
            try {
                var g = et.graphics;
                if (!g || !g.newPen) return;
                // Capture the field's DEFAULT foreground pen once (after graphics
                // is realised). "Valid" must restore that theme default — forcing
                // black [0,0,0] is wrong on Illustrator's dark UI (text vanishes)
                // and visually fails to clear the red. Light-grey is a safe
                // fallback if the default pen can't be read.
                if (et._zsmDefPen === undefined) {
                    et._zsmDefPen = g.foregroundColor || null;
                }
                if (valid) {
                    g.foregroundColor = et._zsmDefPen
                        ? et._zsmDefPen
                        : g.newPen(g.PenType.SOLID_COLOR, [0.75, 0.75, 0.75, 1.0], 1);
                } else {
                    g.foregroundColor = g.newPen(g.PenType.SOLID_COLOR, [0.90, 0.20, 0.20, 1.0], 1);
                }
            } catch (e) { /* graphics not ready or unsupported — ignored */ }
        }

        function liveValidateAll() {
            // numericRows is assigned below this function in source order; the
            // initial setUIValues() call (during dialog build) runs before that,
            // so guard against the not-yet-wired state — it re-runs after init.
            if (!numericRows) return true;
            var allValid = true;
            var invalidCount = 0;
            var firstMsg = "";
            for (var i = 0; i < numericRows.length; i++) {
                var nr = numericRows[i];
                if (!nr.row || !nr.row.inp) continue;
                // Skip disabled rows (e.g. gapInner is disabled in Fixed mode)
                if (!nr.row.inp.enabled) {
                    markFieldValidity(nr.row.inp, true);
                    continue;
                }
                var ok = isValueInRange(nr.row.inp, nr.rule);
                markFieldValidity(nr.row.inp, ok);
                if (!ok) {
                    allValid = false;
                    invalidCount++;
                    if (!firstMsg) {
                        // scaleN's rule label is the bare "1:" ratio prefix — swap
                        // it for the checkbox caption so the message reads sensibly.
                        var lblKey = nr.rule && nr.rule.label;
                        if (lblKey === "SCALE_FIELD_LABEL") lblKey = "SCALE_CHECKBOX";
                        var lbl = (lblKey && l[lblKey]) ? l[lblKey] : "";
                        lbl = String(lbl).replace(/:\s*$/, "");
                        firstMsg = ZSM.L.format(l.STATUS_RANGE, lbl, nr.rule.min, nr.rule.max);
                    }
                }
            }

            // Layer-name live validation (V4): a mapping row with a colour but a
            // blank name is incomplete and render would silently drop it. Flag it
            // live (red) and gate Generate, mirroring the numeric fields — instead
            // of only catching it via a modal alert on Generate. Skipped in
            // marks-only mode, where the mapping table is ignored entirely.
            var marksOnlyOn = false;
            try { marksOnlyOn = cbMarksOnly.value; } catch (em) {}
            for (var li = 0; li < layRows.length; li++) {
                var etL = layRows[li].etLayer;
                if (!etL) continue;
                if (marksOnlyOn) { markFieldValidity(etL, true); continue; }
                var nameOk = String(etL.text || "").replace(/^\s+|\s+$/g, "") !== "";
                markFieldValidity(etL, nameOk);
                if (!nameOk) {
                    allValid = false;
                    invalidCount++;
                    if (!firstMsg) firstMsg = l.STATUS_LAYER_NAME;
                }
            }

            // Duplicate-colour validation: the same spot colour mapped to two
            // rows is a contradiction — movePaths routes ALL paths of that colour
            // to whichever row renders last, silently emptying the other layer.
            // No safe auto-resolution exists, so block Generate until the user
            // removes the duplicate. canonColor normalises localized [Registration]
            // aliases so the comparison is reliable across locales.
            if (!marksOnlyOn) {
                var seenColors = {};
                var dupColorName = null;
                for (var di = 0; di < layRows.length; di++) {
                    var ddc = layRows[di].ddColor;
                    if (!ddc) continue;
                    var rawC = ZSM.UI.ddlValue(ddc);
                    var canC = canonColor(rawC);
                    if (!canC) continue;
                    if (seenColors[canC]) { dupColorName = rawC; break; }
                    seenColors[canC] = true;
                }
                if (dupColorName) {
                    allValid = false;
                    invalidCount++;
                    if (!firstMsg) firstMsg = ZSM.L.format(l.STATUS_DUP_COLOR, dupColorName);
                }
            }

            try { btnOk.enabled = allValid; } catch (e) {}

            // Status line. When everything is valid it no longer sits empty (N1) —
            // it shows a subtle, default-coloured context summary (mode · scale ·
            // layer count) so the reserved row carries meaning. When invalid it
            // turns amber; with more than one bad field it aggregates the count
            // (N3) instead of naming only the first. Graphics access is wrapped —
            // Adobe's API can throw before the control is realised.
            try {
                var msg, amber;
                if (allValid) {
                    amber = false;
                    var ctx = mode;
                    var sN  = readScaleN();
                    if (sN > 1) ctx += " · 1:" + sN;
                    var marksOnlyCtx = false;
                    try { marksOnlyCtx = cbMarksOnly.value; } catch (emc) {}
                    msg = marksOnlyCtx
                        ? ZSM.L.format(l.STATUS_OK_MARKS, ctx)
                        : ZSM.L.format(l.STATUS_OK, ctx, layRows.length);
                } else {
                    amber = true;
                    msg = (invalidCount > 1)
                        ? ("\u26A0 " + ZSM.L.format(l.STATUS_RANGE_MULTI, invalidCount))
                        : ("\u26A0 " + (firstMsg || l.STATUS_INVALID));
                }
                stStatus.text = msg;
                var sg = stStatus.graphics;
                if (sg && sg.newPen) {
                    // Capture the realised default pen once. It is often null on
                    // first read, so the valid branch must NOT gate on it — it has
                    // to set an explicit pen every time, otherwise the amber pen
                    // from a previous error state is never overwritten and the
                    // status text stays orange after the error clears (matches the
                    // per-field fallback at the geometry rows).
                    if (stStatus._zsmDefPen === undefined) stStatus._zsmDefPen = sg.foregroundColor || null;
                    if (!amber) {
                        sg.foregroundColor = stStatus._zsmDefPen
                            ? stStatus._zsmDefPen
                            : sg.newPen(sg.PenType.SOLID_COLOR, [0.75, 0.75, 0.75, 1.0], 1);
                    } else {
                        sg.foregroundColor = sg.newPen(sg.PenType.SOLID_COLOR, [0.96, 0.60, 0.38, 1.0], 1);
                    }
                }
            } catch (e) {}

            return allValid;
        }

        // 4. Wire input change handlers — refresh modified indicator (asterisk)
        //    in dropdown whenever any field changes. Layer rows are dynamic;
        //    they're wired in buildLayerRow() and the Add/Remove handlers below.
        var wireInputs = function () {
            var addOnChange = function (et) {
                if (!et) return;
                et.onChange  = function () { refreshModifiedIndicator(); liveValidateAll(); };
                et.onChanging = function () { refreshModifiedIndicator(); liveValidateAll(); };
            };
            addOnChange(rGapZO.inp);
            addOnChange(rMaxD.inp);
            if (isZ) {
                addOnChange(rGapGZ.inp);
                addOnChange(rMarkSize.inp);
                addOnChange(rOrientDist.inp);
                // Source toggle changes rGapGZ.enabled → re-run validation so
                // a previously-invalid disabled gapInner stops blocking OK.
                if (rbAuto)  rbAuto.onClick  = (function (orig) { return function () { if (orig) orig(); refreshModifiedIndicator(); liveValidateAll(); }; })(rbAuto.onClick);
                if (rbFixed) rbFixed.onClick = (function (orig) { return function () { if (orig) orig(); refreshModifiedIndicator(); liveValidateAll(); }; })(rbFixed.onClick);
            }
            if (isS) {
                addOnChange(rFT.inp);
                addOnChange(rFB.inp);
                if (chRed) chRed.onClick = refreshModifiedIndicator;
                addOnChange(rMarkSize.inp);
            }
            if (rColor && rColor.ddl) {
                rColor.ddl.onChange = (function (orig) {
                    return function () { if (orig) orig(); if (rColor.refresh) rColor.refresh(); refreshModifiedIndicator(); };
                })(rColor.ddl.onChange);
            }
            // Layer rows: hook into existing handlers via wrapper.
            // Add/Remove buttons modify layRows length → also need refresh.
            var origAdd = btnAddLayer.onClick;
            btnAddLayer.onClick = function () {
                if (origAdd) origAdd();
                wireLayerRows();
                refreshModifiedIndicator();
                liveValidateAll();   // recompute footer count after a row is added
            };
        };

        var wireLayerRows = function () {
            for (var ri = 0; ri < layRows.length; ri++) {
                var row = layRows[ri];
                // Wire each row exactly once. wireLayerRows() runs after every
                // Add and after each setUIValues rebuild; without this guard the
                // already-wired rows get their onChange/onClick re-wrapped on
                // every Add, nesting handlers unboundedly. Fresh rows (from
                // buildLayerRow) have no _zsmWired flag, so they get wired;
                // existing ones are skipped.
                if (row._zsmWired) continue;
                row._zsmWired = true;
                row.etLayer.onChange   = function () { refreshModifiedIndicator(); liveValidateAll(); };
                row.etLayer.onChanging = function () { refreshModifiedIndicator(); liveValidateAll(); };
                // ddLayer's onChange already updates etLayer; chain refresh after
                var origDD = row.ddLayer.onChange;
                row.ddLayer.onChange = (function (orig) {
                    return function () { if (orig) orig(); refreshModifiedIndicator(); };
                })(origDD);
                row.ddColor.onChange = (function (rw) {
                    return function () {
                        ZSM.UI.setSwatch(rw.swColor, ZSM.UI.ddlValue(rw.ddColor), docData.swatchRGB);
                        refreshModifiedIndicator();
                        liveValidateAll();   // a colour change can create/clear a duplicate
                    };
                })(row);
                var origRm = row.btnRemove.onClick;
                row.btnRemove.onClick = (function (orig) {
                    return function () { if (orig) orig(); refreshModifiedIndicator(); liveValidateAll(); };
                })(origRm);
            }
        };

        wireInputs();
        wireLayerRows();

        // Initialize Save button state (disabled when UI matches active preset)
        refreshModifiedIndicator();

        // Initialize live validation state — paints any out-of-range stored
        // values red on first paint and disables OK if needed. Runs after
        // wireInputs so onChanging handlers are already attached.
        liveValidateAll();

        // Restore window position from previous mode-switch (if any)
        if (docData._lastBounds) {
            w.layout.layout(true);
            w.location = [docData._lastBounds.x, docData._lastBounds.y];
        }

        // Initial keyboard focus on the first editable geometry field so Tab
        // walks the dialog in creation order (N9: explicit, predictable focus
        // start instead of relying on the platform default).
        try { (isZ ? rGapGZ : rGapZO).inp.active = true; } catch (e) {}

        w.show();

        // Interpret close code
        if (switchTarget) return { _switchTo: switchTarget };
        return result;
    },

    // =====================================================================
    // Shared UI helpers
    // =====================================================================

    /**
     * Adds a labeled edittext row with a "mm" suffix.
     * @param {Object} parent - ScriptUI container.
     * @param {string} label  - Row label.
     * @param {number} value  - Initial value.
     * @param {string} tip    - HelpTip string.
     * @returns {Object} {inp: EditText, group: Group}
     */
    addRow: function (parent, label, value, tip) {
        var M = ZSM.UI.M;
        var g  = parent.add("group");
        g.alignment = "fill";
        var st = g.add("statictext", undefined, label);
        st.preferredSize.width = M.LABEL_COL;
        if (tip) st.helpTip = tip;
        // Value sub-group with a FIXED width so its right edge lines up with the
        // colour dropdown below it (N5 — consistent right edges in the geometry
        // panel). Holds the input, the "mm" unit and the greyed range hint.
        var vg = g.add("group");
        vg.orientation   = "row";
        vg.alignChildren = ["left", "center"];
        vg.spacing       = 6;
        vg.preferredSize.width = M.VALUE_GROUP;
        var et = vg.add("edittext", undefined, String(value));
        et.preferredSize.width = M.NUM_FIELD;
        if (tip) et.helpTip = tip;
        vg.add("statictext", undefined, "mm");
        return { inp: et, group: g };
    },

    /**
     * Converts an Illustrator colour object to an [r,g,b] triple (0–255).
     * Best-effort across CMYK / RGB / Gray / Spot. Returns null if unreadable.
     * Powers the colour-swatch previews next to the colour dropdowns (M1).
     * @param {Object} col - Illustrator Color object.
     * @returns {Array|null} [r,g,b] 0–255, or null.
     */
    colorToRGB: function (col) {
        try {
            if (!col) return null;
            var t = col.typename;
            if (t === "RGBColor")  return [col.red, col.green, col.blue];
            if (t === "GrayColor") { var v = Math.round(255 * (1 - col.gray / 100)); return [v, v, v]; }
            if (t === "CMYKColor") {
                var c = col.cyan / 100, m = col.magenta / 100, y = col.yellow / 100, k = col.black / 100;
                return [
                    Math.round(255 * (1 - c) * (1 - k)),
                    Math.round(255 * (1 - m) * (1 - k)),
                    Math.round(255 * (1 - y) * (1 - k))
                ];
            }
            if (t === "SpotColor") return ZSM.UI.colorToRGB(col.spot.color);
        } catch (e) {}
        return null;
    },

    /**
     * Creates a 16×16 colour-swatch preview control (M1). Uses an iconbutton
     * with a custom onDraw so no temp image files are needed. The painted value
     * lives in `._rgb`:
     *   • [r,g,b] (0–255) → solid fill
     *   • "REG"           → white tile + black crosshair (the [Registration] colour)
     *   • null / other    → grey tile + red slash (missing / unresolved)
     * All drawing is wrapped — a graphics failure must never break the dialog.
     * @param {Object} parent - ScriptUI container.
     * @returns {Object} the swatch control.
     */
    makeSwatch: function (parent) {
        var sw;
        try {
            sw = parent.add("iconbutton", undefined, undefined, { style: "toolbutton", toggle: false });
        } catch (e) {
            sw = parent.add("iconbutton", undefined, undefined);
        }
        var sz = ZSM.UI.M.SWATCH;
        sw.preferredSize = [sz, sz];
        sw.minimumSize   = [sz, sz];
        sw.maximumSize   = [sz, sz];
        sw._rgb = null;
        sw.onDraw = function () {
            try {
                var g = this.graphics;
                var w = this.size[0], h = this.size[1];
                var border = g.newPen(g.PenType.SOLID_COLOR, [0.45, 0.45, 0.45, 1], 1);
                var val = this._rgb;
                if (val === "REG") {
                    var wb = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1, 1]);
                    g.newPath(); g.rectPath(0, 0, w, h); g.fillPath(wb);
                    var cp = g.newPen(g.PenType.SOLID_COLOR, [0, 0, 0, 1], 1);
                    g.newPath(); g.moveTo(w / 2, 2); g.lineTo(w / 2, h - 2); g.strokePath(cp);
                    g.newPath(); g.moveTo(2, h / 2); g.lineTo(w - 2, h / 2); g.strokePath(cp);
                } else if (val && val.length === 3) {
                    var b = g.newBrush(g.BrushType.SOLID_COLOR, [val[0] / 255, val[1] / 255, val[2] / 255, 1]);
                    g.newPath(); g.rectPath(0, 0, w, h); g.fillPath(b);
                } else {
                    var gb = g.newBrush(g.BrushType.SOLID_COLOR, [0.82, 0.82, 0.82, 1]);
                    g.newPath(); g.rectPath(0, 0, w, h); g.fillPath(gb);
                    var rp = g.newPen(g.PenType.SOLID_COLOR, [0.7, 0.25, 0.2, 1], 1);
                    g.newPath(); g.moveTo(2, h - 2); g.lineTo(w - 2, 2); g.strokePath(rp);
                }
                g.newPath(); g.rectPath(0, 0, w - 1, h - 1); g.strokePath(border);
            } catch (e) {}
        };
        return sw;
    },

    /**
     * Repaints a swatch (from makeSwatch) to show colour `name`, resolved through
     * `rgbMap` (name → [r,g,b] | "REG"). Toggling visibility forces onDraw to
     * re-run — ScriptUI has no direct "invalidate" call.
     * @param {Object} sw     - Swatch control.
     * @param {string} name   - Colour name to display.
     * @param {Object} rgbMap - name → colour map.
     */
    setSwatch: function (sw, name, rgbMap) {
        if (!sw) return;
        var val = null;
        if (name && rgbMap && rgbMap[name] !== undefined) val = rgbMap[name];
        sw._rgb = val;
        try { sw.hide(); sw.show(); } catch (e) {}
    },

    /**
     * Adds a labeled color row using a dropdownlist of document swatches.
     * @param {Object} parent      - ScriptUI container.
     * @param {string} label       - Row label.
     * @param {string} value       - Initial swatch name.
     * @param {Array}  swatchNames - List from ZSM.Draw.getSwatchNames().
     * @param {string} tip         - HelpTip string.
     * @param {Object} rgbMap      - Optional name→RGB map; when present a colour
     *                               swatch preview is drawn before the dropdown (M1).
     * @returns {Object} {ddl, group, sw, refresh}
     */
    addColorRow: function (parent, label, value, swatchNames, tip, rgbMap) {
        var M = ZSM.UI.M;
        var g  = parent.add("group");
        g.alignment = "fill";
        // Match the layer-table row rhythm (grp.spacing = 5) so the swatch hugs
        // its dropdown identically in both places — one consistent colour-picker.
        g.spacing = M.SP_TIGHT;
        var st = g.add("statictext", undefined, label);
        st.preferredSize.width = M.LABEL_COL;
        if (tip) st.helpTip = tip;
        var sw = rgbMap ? this.makeSwatch(g) : null;
        var ddl = g.add("dropdownlist", undefined, swatchNames);
        ddl.preferredSize.width = sw ? M.COLOR_DD : M.VALUE_GROUP;   // swatch+gap+ddl keeps the right edge aligned
        if (tip) ddl.helpTip = tip;
        this.selectDDL(ddl, value || "[Registration]");
        var self = this;
        var refresh = function () { if (sw) self.setSwatch(sw, self.ddlValue(ddl), rgbMap); };
        refresh();
        return { ddl: ddl, group: g, sw: sw, refresh: refresh };
    },

    /**
     * Selects a dropdownlist item by text value.
     *
     * When the requested value is NOT present in the current document (e.g. a
     * preset references swatch "MyOrange" but this document has no such spot),
     * we do NOT silently fall back to item 0 — that would swap the user's saved
     * choice for an unrelated swatch/layer with no signal. Instead we insert a
     * synthetic item that preserves the saved name with a "(missing)" marker and
     * select it. The marker is display-only; ZSM.UI.ddlValue() reads back the
     * raw name, so downstream resolution and isModified() both see the original
     * value — no false "modified" asterisk, no silent colour swap. A missing
     * mark colour degrades to [Registration] with a warning (see ZSM.Draw.getCol);
     * a missing layer is auto-created by getLay (layers are low-risk containers).
     *
     * @param {DropDownList} ddl  - Target control.
     * @param {string}       text - Item text to select.
     */
    selectDDL: function (ddl, text) {
        // Purge any stale synthetic "missing" item from a previous selection so
        // they don't accumulate across preset switches on a persistent dropdown.
        for (var k = ddl.items.length - 1; k >= 0; k--) {
            if (ddl.items[k]._zsmMissing) ddl.remove(k);
        }
        if (!text) { if (ddl.items.length > 0) ddl.selection = 0; return; }
        for (var i = 0; i < ddl.items.length; i++) {
            if (ddl.items[i].text === text) { ddl.selection = i; return; }
        }
        // [Registration] alias — the canonical English token and the document's
        // localized registration swatch name (e.g. CS "[Registrace]") are the
        // SAME colour. getSwatchNames lists the localized name, but presets/
        // defaults store canonical "[Registration]"; match them interchangeably
        // so the default doesn't render as a bogus "(missing)" item in a
        // non-English Illustrator. (ZSM.Draw guard keeps selectDDL unit-testable.)
        var regName = (typeof ZSM !== "undefined" && ZSM.Draw && ZSM.Draw.getRegistrationName)
            ? ZSM.Draw.getRegistrationName() : "[Registration]";
        if (text === "[Registration]" || text === regName) {
            for (var r = 0; r < ddl.items.length; r++) {
                var rt = ddl.items[r].text;
                if (rt === "[Registration]" || rt === regName) { ddl.selection = r; return; }
            }
        }
        // Not in the document — preserve the saved name as a flagged item.
        var suffix = (ZSM.L && ZSM.L.DDL_MISSING_SUFFIX) ? ZSM.L.DDL_MISSING_SUFFIX : "(missing)";
        var missing = ddl.add("item", text + "  " + suffix);
        missing._zsmRawValue = text;
        missing._zsmMissing  = true;
        ddl.selection = missing;
    },

    /**
     * Reads the resolved value of a dropdown selection. For a synthetic
     * "missing" item (added by selectDDL when a saved value wasn't in the
     * document), returns the raw saved name without the display marker;
     * otherwise returns the selection text. Empty string when nothing selected.
     *
     * @param {DropDownList} ddl - Target control.
     * @returns {string} Resolved value.
     */
    ddlValue: function (ddl) {
        var sel = ddl.selection;
        if (!sel) return "";
        return (sel._zsmRawValue != null) ? sel._zsmRawValue : sel.text;
    }
};
