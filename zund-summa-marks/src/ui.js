var ZSM = ZSM || {};

ZSM.UI = {

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

        // Fetch live document data once (expensive DOM queries)
        var docData = {
            swatches:      ZSM.Draw.getSwatchNames(),
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
        w.margins        = 20;
        w.spacing        = 15;
        w.preferredSize.width = 390;

        // =================================================================
        // Panel: Presets
        // =================================================================
        var pPreset = w.add("panel", undefined, l.PANEL_PRESET);
        pPreset.alignChildren = ["fill", "top"];
        pPreset.margins = 15;

        var grpPresetRow = pPreset.add("group");
        grpPresetRow.alignment = ["fill", "top"];
        grpPresetRow.spacing   = 8;
        grpPresetRow.add("statictext", undefined, l.PRESET_LABEL);

        var ddPreset = grpPresetRow.add("dropdownlist", undefined, []);
        ddPreset.preferredSize.width = 170;

        var btnSave = grpPresetRow.add("button", undefined, l.BTN_SAVE);
        btnSave.helpTip = l.TIP_SAVE;

        var btnDel = grpPresetRow.add("button", undefined, l.BTN_DEL);
        btnDel.helpTip = l.TIP_DEL;

        // =================================================================
        // Panel: Technology
        // =================================================================
        var pSystem = w.add("panel", undefined, l.PANEL_TECH);
        pSystem.alignChildren = ["fill", "top"];
        pSystem.margins = 15;

        var dMode = pSystem.add("dropdownlist", undefined, [l.MODE_ZUND, l.MODE_SUMMA]);
        dMode.selection = isS ? 1 : 0;
        dMode.helpTip   = l.TIP_MODE;

        // --- ZUND only: source radio buttons ---
        var grpSrc, rbAuto, rbFixed;
        if (isZ) {
            grpSrc = pSystem.add("group");
            grpSrc.orientation   = "row";
            grpSrc.alignChildren = "left";
            rbAuto  = grpSrc.add("radiobutton", undefined, l.SRC_AUTO);
            rbFixed = grpSrc.add("radiobutton", undefined, l.SRC_FIXED);
            if (sData.useArtboardBounds) rbFixed.value = true;
            else rbAuto.value = true;
            rbAuto.helpTip  = l.TIP_SRC_AUTO;
            rbFixed.helpTip = l.TIP_SRC_FIXED;
        }

        // =================================================================
        // Panel: Gap / Geometry (mode-specific rows)
        // =================================================================
        var pGeo = w.add("panel", undefined, l.PANEL_GEO);
        pGeo.alignChildren = ["fill", "top"];
        pGeo.margins = 15;
        pGeo.spacing = 10;

        // ZUND only: gap from graphic
        var rGapGZ;
        if (isZ) {
            rGapGZ = self.addRow(pGeo, l.GAP_GZ, sData.gapInner, l.TIP_GAP_GZ);
            // Gap from graphic is irrelevant in Fixed mode
            rGapGZ.inp.enabled = !(sData.useArtboardBounds);
        }

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

        // Shared: mark color
        var rColor = self.addColorRow(pGeo, l.MARK_COLOR, sData.markColor, docData.swatches, l.TIP_MARK_COLOR);

        // =================================================================
        // Panel: Feed (SUMMA only — not created for ZUND)
        // =================================================================
        var rFT, rFB, chRed;
        if (isS) {
            var pFeed = w.add("panel", undefined, l.PANEL_FEED);
            pFeed.alignChildren = ["fill", "top"];
            pFeed.margins = 15;
            pFeed.spacing = 10;

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
        pLay.margins = 15;
        pLay.spacing = 10;

        // Column headers
        var grpHeaders = pLay.add("group");
        grpHeaders.alignment = "fill";
        grpHeaders.spacing   = 5;
        var hdrLayer = grpHeaders.add("statictext", undefined, l.COL_LAYER);
        hdrLayer.preferredSize.width = 200;
        var hdrColor = grpHeaders.add("statictext", undefined, l.COL_COLOR);
        hdrColor.preferredSize.width = 150;
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
            grp.spacing   = 5;

            var stack = grp.add("group");
            stack.orientation   = "stack";
            stack.alignChildren = ["left", "center"];
            stack.preferredSize.width = 200;

            var ddLayer = stack.add("dropdownlist", undefined, docData.layers);
            ddLayer.preferredSize.width = 200;
            ddLayer.helpTip = l.TIP_LAY_NAME;

            var etLayer = stack.add("edittext", undefined, def.name || "");
            etLayer.preferredSize.width = 180;
            etLayer.helpTip = l.TIP_LAY_NAME;

            ddLayer.onChange = function () {
                if (ddLayer.selection) etLayer.text = ddLayer.selection.text;
            };
            ZSM.UI.selectDDL(ddLayer, def.name || "");

            var ddColor = grp.add("dropdownlist", undefined, docData.swatches);
            ddColor.preferredSize.width = 150;
            ddColor.helpTip = l.TIP_LAY_COLOR;
            ZSM.UI.selectDDL(ddColor, def.color || (docData.swatches.length > 0 ? docData.swatches[0] : ""));

            var btnRemove = grp.add("button", undefined, "\u2212");
            btnRemove.preferredSize = [30, 25];
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
                w.layout.layout(true);
                w.size.height = w.preferredSize.height + 10;
            };

            return { grp: grp, ddColor: ddColor, etLayer: etLayer, ddLayer: ddLayer, btnRemove: btnRemove };
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
            w.layout.layout(true);
            w.size.height = w.preferredSize.height + 10;
        };

        // =================================================================
        // Footer — action buttons
        // =================================================================
        var grpButtons = w.add("group");
        grpButtons.alignment = ["right", "center"];
        grpButtons.spacing   = 8;
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
         * Reads current UI state into a flat settings object.
         * Only reads controls that exist in the current mode;
         * missing-mode values are preserved from the previous preset.
         */
        function getUIValues() {
            var prev = pData.presets[pData.activePreset] || c.getDefaults();
            var layers = [];
            for (var i = 0; i < layRows.length; i++) {
                var cSel = layRows[i].ddColor.selection
                    ? layRows[i].ddColor.selection.text
                    : (layRows[i].ddColor.items.length > 0 ? layRows[i].ddColor.items[0].text : "[Registration]");
                layers.push({ name: layRows[i].etLayer.text || "", color: cSel });
            }
            var markColorSel = rColor.ddl.selection
                ? rColor.ddl.selection.text : "[Registration]";

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
                markColor:         markColorSel,
                layers:            layers
            };
        }

        /**
         * Fills the UI from a flat settings object.
         * Only writes to controls that exist in the current mode.
         */
        function setUIValues(obj) {
            if (!obj) return;

            // Mode dropdown (visual only — actual mode is fixed for this dialog)
            dMode.selection = (obj.mode === "SUMMA") ? 1 : 0;

            // Shared controls
            rGapZO.inp.text = String(obj.gapOuter  !== undefined ? obj.gapOuter  : 0);
            rMaxD.inp.text  = String(obj.maxDist   !== undefined ? obj.maxDist   : 500);
            ZSM.UI.selectDDL(rColor.ddl, obj.markColor || "[Registration]");

            // ZUND-specific
            if (isZ) {
                rbFixed.value   = !!obj.useArtboardBounds;
                rbAuto.value    = !obj.useArtboardBounds;
                rGapGZ.inp.text = String(obj.gapInner  !== undefined ? obj.gapInner  : 5);
                rGapGZ.inp.enabled = !rbFixed.value;
                rMarkSize.inp.text = String(obj.markSizeZ !== undefined ? obj.markSizeZ : 5);
            }

            // SUMMA-specific
            if (isS) {
                rFT.inp.text    = String(obj.feedTop    !== undefined ? obj.feedTop    : 70);
                rFB.inp.text    = String(obj.feedBottom !== undefined ? obj.feedBottom : 50);
                chRed.value     = !!obj.drawRed;
                rMarkSize.inp.text = String(obj.markSizeS !== undefined ? obj.markSizeS : 3);
            }

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
        }

        // =================================================================
        // Preset logic
        // =================================================================
        var sortedKeys = [];

        function updatePresetList() {
            ddPreset.removeAll();
            sortedKeys = [];
            var keys = [];
            for (var k in pData.presets) {
                if (pData.presets.hasOwnProperty(k) && k !== "[Last Settings]") keys.push(k);
            }
            keys.sort();
            var selIdx = 0;
            for (var i = 0; i < keys.length; i++) {
                var displayText = (keys[i] === c.PRESET_KEY_DEFAULT) ? l.PRESET_DEFAULT : keys[i];
                ddPreset.add("item", displayText);
                sortedKeys.push(keys[i]);
                if (keys[i] === pData.activePreset) selIdx = i;
            }
            if (ddPreset.items.length > 0) ddPreset.selection = selIdx;
            btnDel.enabled = (pData.activePreset !== c.PRESET_KEY_DEFAULT);
        }

        ddPreset.onChange = function () {
            if (!ddPreset.selection) return;
            var sel = sortedKeys[ddPreset.selection.index];
            if (!sel || sel === pData.activePreset) return;
            pData.activePreset = sel;
            btnDel.enabled = (sel !== c.PRESET_KEY_DEFAULT);
            if (pData.presets[sel]) setUIValues(pData.presets[sel]);
        };

        btnSave.onClick = function () {
            var name = prompt(l.PROMPT_NEW_PRESET,
                (pData.activePreset !== c.PRESET_KEY_DEFAULT ? pData.activePreset : l.PRESET_PLACEHOLDER));
            if (!name) return;
            if (pData.presets[name] && name !== pData.activePreset) {
                if (!confirm(l.ERR_PRESET_EXISTS)) return;
            }
            pData.presets[name] = getUIValues();
            pData.activePreset  = name;
            updatePresetList();
        };

        btnDel.onClick = function () {
            if (pData.activePreset === c.PRESET_KEY_DEFAULT || pData.activePreset === "[Last Settings]") {
                alert(l.ERR_PRESET_DEL_DEF);
                return;
            }
            delete pData.presets[pData.activePreset];
            pData.activePreset = c.PRESET_KEY_DEFAULT;
            updatePresetList();
            setUIValues(pData.presets[c.PRESET_KEY_DEFAULT]);
        };

        // =================================================================
        // Mode switch handler
        // =================================================================
        var switchTarget = null;

        dMode.onChange = function () {
            var newMode = dMode.selection ? dMode.selection.text : mode;
            if (newMode === mode) return;

            // Snapshot current UI state into [Last Settings] so nothing is lost
            pData.presets["[Last Settings]"] = getUIValues();
            // Tag the snapshot with the TARGET mode so the next dialog opens correctly
            pData.presets["[Last Settings]"].mode = newMode;

            // Preserve window position across mode switch
            docData._lastBounds = w.bounds;

            switchTarget = newMode;
            w.close(2); // code 2 = mode switch (not OK, not Cancel)
        };

        // ZUND: source radio buttons update gapGZ enabled state
        if (isZ) {
            rbAuto.onClick  = function () { rGapGZ.inp.enabled = true; };
            rbFixed.onClick = function () { rGapGZ.inp.enabled = false; };
        }

        // =================================================================
        // OK: validate → build result → close
        // =================================================================
        var result = null;

        btnOk.onClick = function () {
            // Validation — each call shows a localized alert and returns null on failure
            var gapO = ZSM.Utils.validateNumber(rGapZO.inp.text, 0, 1000, l.GAP_ZO);
            if (gapO === null) return;
            var maxD = ZSM.Utils.validateNumber(rMaxD.inp.text, 50, 5000, l.MAX_DIST);
            if (maxD === null) return;

            var prevOk = pData.presets[pData.activePreset] || c.getDefaults();
            var gapI, markSZ, markSS, fTop, fBot;

            if (isZ) {
                gapI = ZSM.Utils.validateNumber(rGapGZ.inp.text, 0, 1000, l.GAP_GZ);
                if (gapI === null) return;
                markSZ = ZSM.Utils.validateNumber(rMarkSize.inp.text, 0.1, 50, l.MARK_SIZE_Z);
                if (markSZ === null) return;
                markSS = prevOk.markSizeS;
                fTop = prevOk.feedTop || 0;
                fBot = prevOk.feedBottom || 0;
            } else {
                gapI = prevOk.gapInner;
                markSS = ZSM.Utils.validateNumber(rMarkSize.inp.text, 0.1, 50, l.MARK_SIZE_S);
                if (markSS === null) return;
                markSZ = prevOk.markSizeZ;
                fTop = ZSM.Utils.validateNumber(rFT.inp.text, 0, 1000, l.FEED_TOP);
                if (fTop === null) return;
                fBot = ZSM.Utils.validateNumber(rFB.inp.text, 0, 1000, l.FEED_BOT);
                if (fBot === null) return;
            }

            var layers = [];
            for (var i = 0; i < layRows.length; i++) {
                var colorSel = layRows[i].ddColor.selection
                    ? layRows[i].ddColor.selection.text
                    : (layRows[i].ddColor.items.length > 0 ? layRows[i].ddColor.items[0].text : "[Registration]");
                layers.push({ name: layRows[i].etLayer.text || "", color: colorSel });
            }

            var markColorSel = rColor.ddl.selection
                ? rColor.ddl.selection.text : "[Registration]";

            var finalSettings = {
                mode:              mode,
                gapInner:          gapI,
                gapOuter:          gapO,
                maxDist:           maxD,
                feedTop:           fTop,
                feedBottom:        fBot,
                drawRed:           isS ? chRed.value : prevOk.drawRed,
                useArtboardBounds: isZ ? rbFixed.value : false,
                markSizeZ:         markSZ,
                markSizeS:         markSS,
                markColor:         markColorSel,
                layers:            layers
            };

            // Always persist last run
            pData.presets["[Last Settings]"] = finalSettings;

            // Auto-save to active named preset
            if (pData.activePreset !== c.PRESET_KEY_DEFAULT && pData.activePreset !== "[Last Settings]") {
                pData.presets[pData.activePreset] = finalSettings;
            } else {
                pData.activePreset = "[Last Settings]";
            }

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

        // Restore window position from previous mode-switch (if any)
        if (docData._lastBounds) {
            w.layout.layout(true);
            w.location = [docData._lastBounds.x, docData._lastBounds.y];
        }

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
        var g  = parent.add("group");
        g.alignment = "fill";
        var st = g.add("statictext", undefined, label);
        st.preferredSize.width = 160;
        if (tip) st.helpTip = tip;
        var et = g.add("edittext", undefined, String(value));
        et.preferredSize.width = 60;
        if (tip) et.helpTip = tip;
        g.add("statictext", undefined, "mm");
        return { inp: et, group: g };
    },

    /**
     * Adds a labeled color row using a dropdownlist of document swatches.
     * @param {Object} parent      - ScriptUI container.
     * @param {string} label       - Row label.
     * @param {string} value       - Initial swatch name.
     * @param {Array}  swatchNames - List from ZSM.Draw.getSwatchNames().
     * @param {string} tip         - HelpTip string.
     * @returns {Object} {ddl: DropDownList, group: Group}
     */
    addColorRow: function (parent, label, value, swatchNames, tip) {
        var g  = parent.add("group");
        g.alignment = "fill";
        var st = g.add("statictext", undefined, label);
        st.preferredSize.width = 160;
        if (tip) st.helpTip = tip;
        var ddl = g.add("dropdownlist", undefined, swatchNames);
        ddl.preferredSize.width = 130;
        if (tip) ddl.helpTip = tip;
        this.selectDDL(ddl, value || "[Registration]");
        return { ddl: ddl, group: g };
    },

    /**
     * Selects a dropdownlist item by text value.
     * Falls back to first item if not found.
     * @param {DropDownList} ddl  - Target control.
     * @param {string}       text - Item text to select.
     */
    selectDDL: function (ddl, text) {
        if (!text) { if (ddl.items.length > 0) ddl.selection = 0; return; }
        for (var i = 0; i < ddl.items.length; i++) {
            if (ddl.items[i].text === text) { ddl.selection = i; return; }
        }
        if (ddl.items.length > 0) ddl.selection = 0;
    }
};
