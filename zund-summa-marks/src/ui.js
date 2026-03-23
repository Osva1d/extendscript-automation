var ZSM = ZSM || {};

ZSM.UI = {

    /**
     * Builds and displays the main settings dialog.
     * Receives and returns the full preset wrapper {presets, activePreset},
     * not a flat settings object. Returns null if the user cancels.
     *
     * @param {Object} pData - Preset wrapper from Storage.load() or getDefaults().
     * @returns {Object|null} Updated preset wrapper, or null on cancel.
     */
    show: function (pData) {
        var c = ZSM.Config;
        var l = ZSM.L;

        // Safety: ensure wrapper structure is valid
        if (!pData || !pData.presets) {
            pData = { activePreset: c.PRESET_KEY_DEFAULT, presets: {} };
            pData.presets[c.PRESET_KEY_DEFAULT] = c.getDefaults();
        }
        if (!pData.presets[pData.activePreset]) {
            pData.activePreset = c.PRESET_KEY_DEFAULT;
        }

        var sData = pData.presets[pData.activePreset]; // Current preset values

        // -----------------------------------------------------------------------
        // Live document data (swatches, layers) — fetched once at dialog open
        // -----------------------------------------------------------------------
        var docSwatches   = ZSM.Draw.getSwatchNames();
        var docLayers     = ZSM.Draw.getLayerNames();
        var detectedColor = ZSM.Draw.detectCutColor();

        // -----------------------------------------------------------------------
        // Window
        // -----------------------------------------------------------------------
        var w = new Window("dialog", c.ui.title);
        w.orientation    = "column";
        w.alignChildren  = ["fill", "top"];
        w.margins        = 20;
        w.spacing        = 15;
        w.preferredSize.width = 390;

        // -----------------------------------------------------------------------
        // Panel: Presets
        // -----------------------------------------------------------------------
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

        // -----------------------------------------------------------------------
        // Panel 1: Technology
        // -----------------------------------------------------------------------
        var pSystem = w.add("panel", undefined, l.PANEL_TECH);
        pSystem.alignChildren = ["fill", "top"];
        pSystem.margins = 15;

        var dMode = pSystem.add("dropdownlist", undefined, [l.MODE_ZUND, l.MODE_SUMMA]);
        dMode.selection = (sData.mode === "SUMMA") ? 1 : 0;
        dMode.helpTip   = l.TIP_MODE;

        var grpSrc = pSystem.add("group");
        grpSrc.orientation   = "row";
        grpSrc.alignChildren = "left";
        var rbAuto  = grpSrc.add("radiobutton", undefined, l.SRC_AUTO);
        var rbFixed = grpSrc.add("radiobutton", undefined, l.SRC_FIXED);
        if (sData.useArtboardBounds) rbFixed.value = true;
        else rbAuto.value = true;
        rbAuto.helpTip  = l.TIP_SRC_AUTO;
        rbFixed.helpTip = l.TIP_SRC_FIXED;

        // -----------------------------------------------------------------------
        // Panel 2: Gap / Geometry
        // -----------------------------------------------------------------------
        var pGeo = w.add("panel", undefined, l.PANEL_GEO);
        pGeo.alignChildren = ["fill", "top"];
        pGeo.margins = 15;
        pGeo.spacing = 10;

        var rGapGZ = this.addRow(pGeo, l.GAP_GZ,      sData.gapInner,       l.TIP_GAP_GZ);
        var rGapZO = this.addRow(pGeo, l.GAP_ZO,      sData.gapOuter,       l.TIP_GAP_ZO);
        var rMaxD  = this.addRow(pGeo, l.MAX_DIST,     sData.maxDist,        l.TIP_MAX_DIST);
        var rSizeZ = this.addRow(pGeo, l.MARK_SIZE_Z,  sData.markSizeZ || 5, l.TIP_SIZE_Z);
        var rSizeS = this.addRow(pGeo, l.MARK_SIZE_S,  sData.markSizeS || 3, l.TIP_SIZE_S);

        // Mark color — dropdown from live document swatches (fixes UX-03)
        var rColor = this.addColorRow(pGeo, l.MARK_COLOR, sData.markColor, docSwatches, l.TIP_MARK_COLOR);

        // -----------------------------------------------------------------------
        // Panel 3: Feed (Summa only)
        // -----------------------------------------------------------------------
        var pFeed = w.add("panel", undefined, l.PANEL_FEED);
        pFeed.alignChildren = ["fill", "top"];
        pFeed.margins = 15;
        pFeed.spacing = 10;

        var rFT   = this.addRow(pFeed, l.FEED_TOP, sData.feedTop,    l.TIP_FEED_TOP);
        var rFB   = this.addRow(pFeed, l.FEED_BOT, sData.feedBottom, l.TIP_FEED_BOT);
        var chRed = pFeed.add("checkbox", undefined, l.DRAW_RED);
        chRed.value   = sData.drawRed;
        chRed.helpTip = l.TIP_DRAW_RED;

        // -----------------------------------------------------------------------
        // Panel 4: Layer to Color mapping (dynamic rows)
        // -----------------------------------------------------------------------
        var pLay = w.add("panel", undefined, l.PANEL_LAYERS);
        pLay.alignChildren = ["fill", "top"];
        pLay.margins = 15;
        pLay.spacing = 10;

        // Column headers above rows (enterprise table convention)
        // Spacer mirrors the minus-button column so ScriptUI compresses
        // header and data rows at the same ratio → columns stay aligned.
        var grpHeaders = pLay.add("group");
        grpHeaders.alignment = "fill";
        grpHeaders.spacing   = 5;
        var hdrLayer = grpHeaders.add("statictext", undefined, l.COL_LAYER);
        hdrLayer.preferredSize.width = 200;
        var hdrColor = grpHeaders.add("statictext", undefined, l.COL_COLOR);
        hdrColor.preferredSize.width = 150;
        var hdrSpacer = grpHeaders.add("statictext", undefined, "");
        hdrSpacer.preferredSize.width = 30;

        // Dedicated container for mapping rows — add button lives outside
        // so we never need to remove/re-add it (ScriptUI limitation).
        var layContainer = pLay.add("group");
        layContainer.orientation   = "column";
        layContainer.alignChildren = ["fill", "top"];
        layContainer.spacing       = 6;

        var layRows    = [];
        var MAX_LAYERS = 8;

        /**
         * Updates minus button enabled state across all rows.
         * Disabled when only 1 row remains (minimum-one enforcement).
         */
        function updateRemoveButtons() {
            var canRemove = layRows.length > 1;
            for (var r = 0; r < layRows.length; r++) {
                layRows[r].btnRemove.enabled = canRemove;
            }
        }

        /**
         * Builds a single layer-to-color mapping row inside layContainer.
         * Row structure: [layer edittext/dropdown stack] [spot color dropdown] [minus btn]
         *
         * Layer name uses Harbs pattern: edittext overlaid on dropdownlist
         * via stack orientation. Edittext is narrower to expose dropdown arrow.
         * User can type a custom name or pick from the predefined list.
         *
         * @param {Object} def - {name, color}
         * @returns {Object} {grp, ddColor, etLayer, ddLayer, btnRemove}
         */
        function buildLayerRow(def) {
            var grp = layContainer.add("group");
            grp.alignment = "fill";
            grp.spacing   = 5;

            // Layer name — Harbs pattern (edittext stacked over dropdownlist)
            var stack = grp.add("group");
            stack.orientation   = "stack";
            stack.alignChildren = ["left", "center"];
            stack.preferredSize.width = 200;

            // Dropdown first (bottom of stack, full width)
            var ddLayer = stack.add("dropdownlist", undefined, docLayers);
            ddLayer.preferredSize.width = 200;
            ddLayer.helpTip = l.TIP_LAY_NAME;

            // Edittext on top, narrower to expose dropdown arrow (~20px)
            var etLayer = stack.add("edittext", undefined, def.name || "");
            etLayer.preferredSize.width = 180;
            etLayer.helpTip = l.TIP_LAY_NAME;

            // Dropdown selection syncs into edittext
            ddLayer.onChange = function () {
                if (ddLayer.selection) etLayer.text = ddLayer.selection.text;
            };

            // Pre-select dropdown if saved name matches a list item
            ZSM.UI.selectDDL(ddLayer, def.name || "");

            // Spot color dropdown (attribute — what to match)
            var ddColor = grp.add("dropdownlist", undefined, docSwatches);
            ddColor.preferredSize.width = 150;
            ddColor.helpTip = l.TIP_LAY_COLOR;
            ZSM.UI.selectDDL(ddColor, def.color || (docSwatches.length > 0 ? docSwatches[0] : ""));

            // Remove button (Unicode minus sign, not hyphen)
            var btnRemove = grp.add("button", undefined, "\u2212");
            btnRemove.preferredSize = [30, 25];
            btnRemove.helpTip = l.TIP_BTN_REMOVE;

            btnRemove.onClick = function () {
                if (layRows.length <= 1) return; // safety guard
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

        // Populate initial rows from saved settings
        var initLayers = (sData.layers && sData.layers.length > 0)
            ? sData.layers
            : [{ name: "Cut", color: detectedColor }];

        for (var i = 0; i < initLayers.length; i++) {
            layRows.push(buildLayerRow(initLayers[i]));
        }
        updateRemoveButtons();

        // Add button — lives in pLay below layContainer, never removed
        var btnAddLayer = pLay.add("button", undefined, l.BTN_ADD_LAYER);
        btnAddLayer.alignment = "left";
        btnAddLayer.helpTip   = l.TIP_BTN_ADD;
        if (layRows.length >= MAX_LAYERS) btnAddLayer.enabled = false;

        btnAddLayer.onClick = function () {
            if (layRows.length >= MAX_LAYERS) return;
            var newRow = buildLayerRow({ name: "", color: detectedColor });
            layRows.push(newRow);
            if (layRows.length >= MAX_LAYERS) btnAddLayer.enabled = false;
            updateRemoveButtons();
            w.layout.layout(true);
            w.size.height = w.preferredSize.height + 10;
        };

        // -----------------------------------------------------------------------
        // Footer — action buttons
        // -----------------------------------------------------------------------
        var grpButtons = w.add("group");
        grpButtons.alignment = ["right", "center"];
        grpButtons.spacing   = 8;
        var btnCan = grpButtons.add("button", undefined, l.BTN_CANCEL, { name: "cancel" });
        btnCan.helpTip = l.TIP_CANCEL;
        var btnOk  = grpButtons.add("button", undefined, l.BTN_OK,     { name: "ok" });
        btnOk.helpTip  = l.TIP_OK;

        // -----------------------------------------------------------------------
        // Internal helpers
        // -----------------------------------------------------------------------

        /**
         * Reads current UI state and returns a flat settings object.
         * @returns {Object} Flat settings (mode, gaps, layers, etc.)
         */
        function getUIValues() {
            var mode = dMode.selection.text;
            var isZ  = (mode === "ZUND");
            var isS  = (mode === "SUMMA");
            var layers = [];
            for (var i = 0; i < layRows.length; i++) {
                var colorSel = layRows[i].ddColor.selection
                    ? layRows[i].ddColor.selection.text
                    : (layRows[i].ddColor.items.length > 0 ? layRows[i].ddColor.items[0].text : "[Registration]");
                // Layer name comes from edittext (user may have typed a custom name)
                var layName = layRows[i].etLayer.text || "";
                layers.push({
                    name:   layName,
                    color:  colorSel
                });
            }
            var colorSel = rColor.ddl.selection
                ? rColor.ddl.selection.text
                : "[Registration]";
            var prev = pData.presets[pData.activePreset] || c.getDefaults();
            return {
                mode:             mode,
                gapInner:         parseFloat(rGapGZ.inp.text.replace(/,/g, ".")),
                gapOuter:         parseFloat(rGapZO.inp.text.replace(/,/g, ".")),
                maxDist:          parseFloat(rMaxD.inp.text.replace(/,/g, ".")),
                feedTop:          isS ? parseFloat(rFT.inp.text.replace(/,/g, ".")) : prev.feedTop,
                feedBottom:       isS ? parseFloat(rFB.inp.text.replace(/,/g, ".")) : prev.feedBottom,
                drawRed:          isS ? chRed.value : prev.drawRed,
                useArtboardBounds: isZ && rbFixed.value,
                markSizeZ:        isZ ? parseFloat(rSizeZ.inp.text.replace(/,/g, ".")) : prev.markSizeZ,
                markSizeS:        isS ? parseFloat(rSizeS.inp.text.replace(/,/g, ".")) : prev.markSizeS,
                markColor:        colorSel,
                layers:           layers
            };
        }

        /**
         * Fills the UI from a flat settings object.
         * Rebuilds layer rows (remove old → insert new before button).
         * @param {Object} obj - Flat settings object.
         */
        function setUIValues(obj) {
            if (!obj) return;
            dMode.selection = (obj.mode === "SUMMA") ? 1 : 0;
            rbFixed.value   = !!obj.useArtboardBounds;
            rbAuto.value    = !obj.useArtboardBounds;
            rGapGZ.inp.text = String(obj.gapInner  !== undefined ? obj.gapInner  : 5);
            rGapZO.inp.text = String(obj.gapOuter  !== undefined ? obj.gapOuter  : 0);
            rMaxD.inp.text  = String(obj.maxDist   !== undefined ? obj.maxDist   : 500);
            rSizeZ.inp.text = String(obj.markSizeZ !== undefined ? obj.markSizeZ : 5);
            rSizeS.inp.text = String(obj.markSizeS !== undefined ? obj.markSizeS : 3);
            ZSM.UI.selectDDL(rColor.ddl, obj.markColor || "[Registration]");
            rFT.inp.text    = String(obj.feedTop    !== undefined ? obj.feedTop    : 70);
            rFB.inp.text    = String(obj.feedBottom !== undefined ? obj.feedBottom : 50);
            chRed.value     = !!obj.drawRed;

            // Clear layer rows from container (button stays in pLay untouched)
            while (layContainer.children.length > 0) {
                layContainer.remove(layContainer.children[0]);
            }
            layRows = [];

            var newLayers = (obj.layers && obj.layers.length > 0)
                ? obj.layers
                : [{ name: "Cut", color: detectedColor }];
            for (var i = 0; i < newLayers.length; i++) {
                layRows.push(buildLayerRow(newLayers[i]));
            }
            btnAddLayer.enabled = (layRows.length < MAX_LAYERS);
            updateRemoveButtons();

            update();
        }

        // -----------------------------------------------------------------------
        // Visibility / enabled logic (called on mode change)
        // -----------------------------------------------------------------------
        function update() {
            var isZ = (dMode.selection.text === "ZUND");
            var isS = (dMode.selection.text === "SUMMA");

            rGapGZ.group.visible            = isZ;
            rGapGZ.group.maximumSize.height = isZ ? 1000 : 0;
            // Gap from graphic is irrelevant in Fixed mode (marks measure from artboard edge)
            rGapGZ.inp.enabled              = isZ && !rbFixed.value;
            grpSrc.visible                  = isZ;
            grpSrc.maximumSize.height       = isZ ? 1000 : 0;
            rSizeZ.group.visible            = isZ;
            rSizeZ.group.maximumSize.height = isZ ? 1000 : 0;
            rSizeS.group.visible            = isS;
            rSizeS.group.maximumSize.height = isS ? 1000 : 0;
            pFeed.visible                   = isS;
            pFeed.maximumSize.height        = isS ? 1000 : 0;
            chRed.enabled                   = isS;

            // Reset hidden mode inputs to preset values (not defaults)
            // so switching modes doesn't lose custom values (fixes H/I visual)
            var prevU = pData.presets[pData.activePreset] || c.getDefaults();
            if (!isZ) rSizeZ.inp.text = String(prevU.markSizeZ);
            if (!isS) {
                rSizeS.inp.text = String(prevU.markSizeS);
                chRed.value = prevU.drawRed;
            }

            w.layout.layout(true);
            w.preferredSize.height = -1;
            w.layout.layout(true);
            if (w.preferredSize.height > 0) w.size.height = w.preferredSize.height + 10;
        }

        // -----------------------------------------------------------------------
        // Preset logic
        // -----------------------------------------------------------------------
        // sortedKeys is shared between updatePresetList and init sync below.
        // Declared here so the init block can reference it after the first call.
        var sortedKeys = [];

        function updatePresetList() {
            ddPreset.removeAll();
            sortedKeys = [];
            var keys = [];
            for (var k in pData.presets) {
                // [Last Settings] is an internal auto-save key — never shown in dropdown
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
            // Load only — no auto-save (matches Adobe standard: switching never overwrites)
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

        // -----------------------------------------------------------------------
        // Event wiring
        // -----------------------------------------------------------------------
        dMode.onChange   = function () { update(); };
        rbAuto.onClick   = function () { update(); };
        rbFixed.onClick  = function () { update(); };

        // -----------------------------------------------------------------------
        // OK: validate → build result → close
        // -----------------------------------------------------------------------
        var result = null;

        btnOk.onClick = function () {
            var mode = dMode.selection.text;
            var isZ  = (mode === "ZUND");
            var isS  = (mode === "SUMMA");

            // Validation — each call shows a localized alert and returns null on failure
            var gapI   = ZSM.Utils.validateNumber(rGapGZ.inp.text, 0,   1000, l.GAP_GZ);    if (gapI   === null) return;
            var gapO   = ZSM.Utils.validateNumber(rGapZO.inp.text, 0,   1000, l.GAP_ZO);    if (gapO   === null) return;
            var maxD   = ZSM.Utils.validateNumber(rMaxD.inp.text,  50,  5000, l.MAX_DIST);  if (maxD   === null) return;
            var prevOk = pData.presets[pData.activePreset] || c.getDefaults();
            var markSZ = isZ ? ZSM.Utils.validateNumber(rSizeZ.inp.text, 0.1, 50, l.MARK_SIZE_Z) : prevOk.markSizeZ;
            if (isZ && markSZ === null) return;
            var markSS = isS ? ZSM.Utils.validateNumber(rSizeS.inp.text, 0.1, 50, l.MARK_SIZE_S) : prevOk.markSizeS;
            if (isS && markSS === null) return;
            var fTop = prevOk.feedTop || 0, fBot = prevOk.feedBottom || 0;
            if (isS) {
                fTop = ZSM.Utils.validateNumber(rFT.inp.text, 0, 1000, l.FEED_TOP); if (fTop === null) return;
                fBot = ZSM.Utils.validateNumber(rFB.inp.text, 0, 1000, l.FEED_BOT); if (fBot === null) return;
            }

            var layers = [];
            for (var i = 0; i < layRows.length; i++) {
                var colorSel = layRows[i].ddColor.selection
                    ? layRows[i].ddColor.selection.text
                    : (layRows[i].ddColor.items.length > 0 ? layRows[i].ddColor.items[0].text : "[Registration]");
                var layName = layRows[i].etLayer.text || "";
                layers.push({
                    name:   layName,
                    color:  colorSel
                });
            }

            var colorSel = rColor.ddl.selection
                ? rColor.ddl.selection.text
                : "[Registration]";

            var finalSettings = {
                mode:              mode,
                gapInner:          gapI,
                gapOuter:          gapO,
                maxDist:           maxD,
                feedTop:           fTop,
                feedBottom:        fBot,
                drawRed:           isS ? chRed.value : prevOk.drawRed,
                useArtboardBounds: isZ && rbFixed.value,
                markSizeZ:         markSZ,
                markSizeS:         markSS,
                markColor:         colorSel,
                layers:            layers
            };

            // Always persist last run as [Last Settings]
            pData.presets["[Last Settings]"] = finalSettings;

            // Auto-save modifications back to the active named preset
            if (pData.activePreset !== c.PRESET_KEY_DEFAULT && pData.activePreset !== "[Last Settings]") {
                pData.presets[pData.activePreset] = finalSettings;
            } else {
                pData.activePreset = "[Last Settings]";
            }

            result = pData;
            w.close(1);
        };

        // -----------------------------------------------------------------------
        // Init and show
        // -----------------------------------------------------------------------

        // 1. Populate dropdown (without [Last Settings])
        updatePresetList();

        // 2. Load values from [Last Settings] if it exists (transparent state restore),
        //    otherwise fall back to the active preset
        var initPreset = pData.presets["[Last Settings]"] || pData.presets[pData.activePreset];
        if (initPreset) setUIValues(initPreset);

        // 3. Sync dropdown selection to activePreset — setUIValues() does not touch the dropdown
        for (var initIdx = 0; initIdx < sortedKeys.length; initIdx++) {
            if (sortedKeys[initIdx] === pData.activePreset) {
                ddPreset.selection = initIdx;
                break;
            }
        }

        update();
        w.show();
        return result;
    },

    // -------------------------------------------------------------------------
    // Shared UI helpers (also used inside show() via ZSM.UI.x)
    // -------------------------------------------------------------------------

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
     * Replaces the old edittext-based addColorRow (fixes UX-03).
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
