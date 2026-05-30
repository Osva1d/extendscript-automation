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

        // Fetch live document data once (expensive DOM queries — getSwatchNames
        // iterates doc.spots, getLayerNames iterates doc.layers, detectCutColor
        // does both). Computed here at show() entry so the mode-switch loop
        // below reuses the same docData on every iteration without re-querying
        // the DOM. Runs in front of any UI construction.
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
        pPreset.spacing = 8;

        // Row 1: label + dropdown (full width)
        var grpPresetTop = pPreset.add("group");
        grpPresetTop.alignment = ["fill", "top"];
        grpPresetTop.spacing   = 8;
        grpPresetTop.add("statictext", undefined, l.PRESET_LABEL);

        var ddPreset = grpPresetTop.add("dropdownlist", undefined, []);
        ddPreset.alignment = ["fill", "center"];
        ddPreset.helpTip = l.TIP_PRESET;

        // Row 2: action buttons (right-aligned)
        var grpPresetBtns = pPreset.add("group");
        grpPresetBtns.alignment = ["right", "top"];
        grpPresetBtns.spacing = 6;

        var btnSave = grpPresetBtns.add("button", undefined, l.BTN_SAVE);
        btnSave.helpTip = l.TIP_SAVE;

        var btnSaveAs = grpPresetBtns.add("button", undefined, l.BTN_SAVE_AS);
        btnSaveAs.helpTip = l.TIP_SAVE_AS;

        var btnDel = grpPresetBtns.add("button", undefined, l.BTN_DEL);
        btnDel.helpTip = l.TIP_DEL;

        // =================================================================
        // Panel: Technology
        // =================================================================
        var pSystem = w.add("panel", undefined, l.PANEL_TECH);
        pSystem.alignChildren = ["fill", "top"];
        pSystem.margins = 15;

        // Mode row: label + dropdown (matches addRow pattern used elsewhere
        // for visual consistency per building-adobe-ui §4.4)
        var grpMode = pSystem.add("group");
        grpMode.orientation   = "row";
        grpMode.alignChildren = ["left", "center"];
        grpMode.spacing       = 8;
        var stMode = grpMode.add("statictext", undefined, l.LBL_MODE);
        stMode.preferredSize.width = 60;
        stMode.helpTip = l.TIP_MODE;
        var dMode = grpMode.add("dropdownlist", undefined, [l.MODE_ZUND, l.MODE_SUMMA]);
        dMode.preferredSize.width = 130;
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

        // --- Scale row (Phase 2): checkbox + 1:N field ---
        // Derived state: scaleN > 1 → checkbox checked, field enabled.
        // scaleN === 1 → checkbox unchecked, field disabled at "1".
        // Single source of truth: scaleN value (no extra checkbox state stored).
        var grpScale = pSystem.add("group");
        grpScale.orientation   = "row";
        grpScale.alignChildren = ["left", "center"];
        grpScale.spacing       = 6;

        var cbScale = grpScale.add("checkbox", undefined, l.SCALE_CHECKBOX);
        cbScale.helpTip = l.TIP_SCALE_CHECKBOX;

        var stScaleLabel = grpScale.add("statictext", undefined, l.SCALE_FIELD_LABEL);
        stScaleLabel.helpTip = l.TIP_SCALE_FIELD;

        var etScale = grpScale.add("edittext", undefined, "1");
        etScale.preferredSize.width = 40;
        etScale.helpTip = l.TIP_SCALE_FIELD;

        // Sync UI to initial scaleN value
        var initScaleN = parseInt(sData.scaleN, 10);
        if (isNaN(initScaleN) || initScaleN < 1) initScaleN = 1;
        if (initScaleN > 1) {
            cbScale.value   = true;
            etScale.text    = String(initScaleN);
            etScale.enabled = true;
        } else {
            cbScale.value   = false;
            etScale.text    = "1";
            etScale.enabled = false;
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
                etScale.enabled = true;
                // Auto-suggest "10" when activating from "1"
                var cur = parseInt(etScale.text, 10);
                if (isNaN(cur) || cur <= 1) etScale.text = "10";
            } else {
                etScale.enabled = false;
                etScale.text = "1";
            }
            applyTitleSuffix();
            refreshModifiedIndicator();
        };

        etScale.onChange = function () {
            var n = parseInt(etScale.text, 10);
            // Auto-uncheck when user explicitly types 1
            if (n === 1) {
                cbScale.value   = false;
                etScale.enabled = false;
            }
            // Clamp out-of-range silently here; validation will alert on Generate
            applyTitleSuffix();
            refreshModifiedIndicator();
        };
        etScale.onChanging = etScale.onChange;

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

        // ZUND only: orientation mark offset
        var rOrientDist;
        if (isZ) {
            rOrientDist = self.addRow(pGeo, l.ORIENT_DIST, sData.orientDist !== undefined ? sData.orientDist : 100, l.TIP_ORIENT_DIST);
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
                // Use ddlValue so picking a synthetic "(missing)" item copies the
                // raw layer name into the edittext, not the display marker.
                if (ddLayer.selection) etLayer.text = ZSM.UI.ddlValue(ddLayer);
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
        // Footer — copyright (greyed) + action buttons
        // =================================================================
        // Copyright footer per extendscript-ui-standards §5: dynamic string
        // composed from constants (never hardcoded), enabled=false greys it
        // intentionally to visually distinguish from active controls.
        var grpFooterCopy = w.add("group");
        grpFooterCopy.alignment = ["fill", "top"];
        var stCopy = grpFooterCopy.add("statictext", undefined,
            "© 2025–2026 Osva1d — " + c.scriptName + " v" + c.version);
        stCopy.enabled = false;

        var grpButtons = w.add("group");
        grpButtons.alignment = ["fill", "center"];
        grpButtons.spacing   = 8;

        // Reset is left-aligned (secondary, less commonly used)
        var btnReset = grpButtons.add("button", undefined, l.BTN_RESET);
        btnReset.helpTip = l.TIP_RESET;
        btnReset.alignment = ["left", "center"];

        // Spacer pushes Cancel/Generate to the right edge
        var grpFooterSpacer = grpButtons.add("group");
        grpFooterSpacer.alignment = ["fill", "fill"];

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
                var cSel = ZSM.UI.ddlValue(layRows[i].ddColor) || "[Registration]";
                layers.push({ name: layRows[i].etLayer.text || "", color: cSel });
            }
            var markColorSel = ZSM.UI.ddlValue(rColor.ddl) || "[Registration]";

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
                etScale.enabled = true;
            } else {
                cbScale.value   = false;
                etScale.text    = "1";
                etScale.enabled = false;
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
            try { btnSave.enabled = modified; } catch (e) {}

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
            try {
                ZSM.Storage.save(pData);
            } catch (e) {
                ZSM.Utils.log("Storage.save failed: " + e.message);
                alert(l.ERR_WRITE_SETTINGS + "\n\n" + e.message);
            }
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
         * Reset = load factory defaults into UI, but keep activePreset pointer.
         * Modified indicator will show * (unless on [Default]).
         * User can then click Save to commit defaults to current preset, or
         * Save As to create a new preset, or Cancel to discard.
         * Does NOT persist — same as any other UI change.
         */
        btnReset.onClick = function () {
            var defaults = c.getDefaults();
            // Preserve current mode in defaults (so Reset doesn't switch dialog)
            defaults.mode = mode;
            setUIValues(defaults);
            // Re-wire layer rows that setUIValues just rebuilt
            wireLayerRows();
            refreshModifiedIndicator();
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
            // Collect raw UI values (everything as written by user, no validation yet)
            var layers = [];
            for (var i = 0; i < layRows.length; i++) {
                var colorSel = ZSM.UI.ddlValue(layRows[i].ddColor) || "[Registration]";
                layers.push({ name: layRows[i].etLayer.text || "", color: colorSel });
            }
            var markColorSel = ZSM.UI.ddlValue(rColor.ddl) || "[Registration]";

            var raw = {
                mode:              mode,
                gapOuter:          rGapZO.inp.text,
                maxDist:           rMaxD.inp.text,
                gapInner:          isZ ? rGapGZ.inp.text     : undefined,
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
                var color = valid
                    ? g.newPen(g.PenType.SOLID_COLOR, [0.0, 0.0, 0.0, 1.0], 1)
                    : g.newPen(g.PenType.SOLID_COLOR, [0.85, 0.0, 0.0, 1.0], 1);
                g.foregroundColor = color;
            } catch (e) { /* graphics not ready or unsupported — ignored */ }
        }

        function liveValidateAll() {
            var allValid = true;
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
                if (!ok) allValid = false;
            }
            try { btnOk.enabled = allValid; } catch (e) {}
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
                    return function () { if (orig) orig(); refreshModifiedIndicator(); };
                })(rColor.ddl.onChange);
            }
            // Layer rows: hook into existing handlers via wrapper.
            // Add/Remove buttons modify layRows length → also need refresh.
            var origAdd = btnAddLayer.onClick;
            btnAddLayer.onClick = function () {
                if (origAdd) origAdd();
                wireLayerRows();
                refreshModifiedIndicator();
            };
        };

        var wireLayerRows = function () {
            for (var ri = 0; ri < layRows.length; ri++) {
                var row = layRows[ri];
                row.etLayer.onChange   = refreshModifiedIndicator;
                row.etLayer.onChanging = refreshModifiedIndicator;
                // ddLayer's onChange already updates etLayer; chain refresh after
                var origDD = row.ddLayer.onChange;
                row.ddLayer.onChange = (function (orig) {
                    return function () { if (orig) orig(); refreshModifiedIndicator(); };
                })(origDD);
                row.ddColor.onChange = refreshModifiedIndicator;
                var origRm = row.btnRemove.onClick;
                row.btnRemove.onClick = (function (orig) {
                    return function () { if (orig) orig(); refreshModifiedIndicator(); };
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
