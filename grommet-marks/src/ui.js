// ------------------------------------------------------------------------
// Module: GM.UI — ScriptUI dialog builder
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS, GM.L, GM.Config, GM.Core, GM.UIState, GM.Storage
// ------------------------------------------------------------------------
var GM = GM || {};

GM.UI = {
    /**
     * Returns localized display names for unit dropdown.
     * Order matches GM.CONSTANTS.UNIT_KEYS.
     * @returns {Array<string>} Display names
     */
    getUnitDisplayNames: function () {
        var keys = GM.CONSTANTS.UNIT_KEYS;
        var names = [];
        for (var i = 0; i < keys.length; i++) {
            names.push(GM.L["UNIT_" + keys[i].toUpperCase()]);
        }
        return names;
    },

    /**
     * Gets the internal unit key from a dropdown selection index.
     * @param {DropDownList} ddl - Unit dropdown
     * @returns {string} Internal unit key (mm/cm/in)
     */
    getUnitKey: function (ddl) {
        return ddl.selection ? GM.CONSTANTS.UNIT_KEYS[ddl.selection.index] : GM.CONSTANTS.UNIT.MM;
    },

    /**
     * Selects a unit in the dropdown by internal key.
     * @param {DropDownList} ddl - Unit dropdown
     * @param {string} unitKey - Internal key (mm/cm/in)
     */
    selectUnit: function (ddl, unitKey) {
        var keys = GM.CONSTANTS.UNIT_KEYS;
        for (var i = 0; i < keys.length; i++) {
            if (keys[i] === unitKey) { ddl.selection = i; return; }
        }
        ddl.selection = 0;
    },

    /**
     * Maps a stored value to its display string for dropdowns.
     * @param {string} value - Stored value
     * @returns {string} Display string
     */
    toDisplay: function (value) {
        if (value === GM.CONSTANTS.SENTINEL_CREATE) return GM.L.CREATE_LABEL;
        return value;
    },

    /**
     * Maps a dropdown display string back to its storage value.
     * @param {string} displayText - Dropdown selection text
     * @returns {string} Value for storage
     */
    toStorage: function (displayText) {
        if (displayText === GM.L.CREATE_LABEL) return GM.CONSTANTS.SENTINEL_CREATE;
        return displayText;
    },

    /**
     * Builds a simplified edge panel with enable checkbox + count/spacing radio.
     * @param {Panel} parent - Parent UI container
     * @param {string} label - Edge label
     * @param {Object} defaultCfg - Default edge configuration
     * @param {number} width - Panel width in pixels
     * @returns {Object} Edge panel with gather/apply methods
     */
    buildEdgePanel: function (parent, label, defaultCfg, width) {
        var pnl = parent.add("panel", undefined, "");
        pnl.alignChildren = ["left", "top"];
        pnl.margins = [12, 12, 12, 8];
        if (width) pnl.preferredSize.width = width;

        var cb = pnl.add("checkbox", undefined, label);
        cb.value = defaultCfg.enabled;
        cb.helpTip = GM.L.TIP_EDGE_ENABLE;

        var modeGrp = pnl.add("group");
        modeGrp.orientation = "row";
        modeGrp.alignChildren = ["left", "center"];

        var radioCol = modeGrp.add("group");
        radioCol.orientation = "column";
        radioCol.alignChildren = ["left", "center"];
        radioCol.spacing = 8;

        var inputCol = modeGrp.add("group");
        inputCol.orientation = "column";
        inputCol.alignChildren = ["fill", "center"];
        inputCol.spacing = 8;

        var numRB = radioCol.add("radiobutton", undefined, GM.L.COUNT);
        numRB.value = defaultCfg.useNumber;
        numRB.helpTip = GM.L.TIP_COUNT;
        var numIn = inputCol.add("edittext", undefined, String(defaultCfg.number));
        numIn.preferredSize.width = 60;
        numIn.helpTip = GM.L.TIP_COUNT;

        var spcRB = radioCol.add("radiobutton", undefined, GM.L.SPACING);
        spcRB.value = !defaultCfg.useNumber;
        spcRB.helpTip = GM.L.TIP_SPACING;
        var spcIn = inputCol.add("edittext", undefined, String(defaultCfg.spacing));
        spcIn.preferredSize.width = 60;
        spcIn.helpTip = GM.L.TIP_SPACING;

        spcIn.enabled = !defaultCfg.useNumber;
        numIn.enabled = defaultCfg.useNumber;

        numRB.onClick = function () { numIn.enabled = true; spcIn.enabled = false; };
        spcRB.onClick = function () { numIn.enabled = false; spcIn.enabled = true; };

        function setAllEnabled(state) {
            numRB.enabled = state;
            spcRB.enabled = state;
            numIn.enabled = state && numRB.value;
            spcIn.enabled = state && spcRB.value;
        }
        cb.onClick = function () { setAllEnabled(cb.value); };
        setAllEnabled(cb.value);

        return {
            panel: pnl, cb: cb,
            numRB: numRB, numIn: numIn, spcRB: spcRB, spcIn: spcIn,
            setAllEnabled: setAllEnabled,
            gather: function () {
                return {
                    enabled: cb.value,
                    useNumber: numRB.value,
                    number: parseInt(numIn.text.replace(/,/g, "."), 10),
                    spacing: parseFloat(spcIn.text.replace(/,/g, "."))
                };
            },
            apply: function (e) {
                cb.value = e.enabled;
                numRB.value = e.useNumber;
                spcRB.value = !e.useNumber;
                numIn.text = e.number;
                spcIn.text = e.spacing;
                setAllEnabled(e.enabled);
            },
            getConvertFields: function () { return [spcIn]; }
        };
    },

    /**
     * Builds the main ScriptUI dialog.
     * @param {Object} pData - Preset wrapper {activePreset, presets}
     * @param {Object} layerInfo - Layer names and existence flags
     * @param {Object} swatchInfo - Swatch names and existence flags
     * @returns {Object} Dialog object with window and gatherAll methods
     */
    buildDialog: function (pData, layerInfo, swatchInfo) {
        var dlg = new Window("dialog", GM.CONSTANTS.SCRIPT_NAME + " v" + GM.CONSTANTS.VERSION);
        dlg.alignChildren = ["fill", "top"];
        dlg.margins  = 20;
        dlg.spacing  = 15;
        var defCfg = GM.Config.getDefaults();
        var sortedKeys = [];

        // =================================================================
        // Settings Panel
        // =================================================================
        var setPanel = dlg.add("panel", undefined, GM.L.SETTINGS_PANEL);
        setPanel.orientation = "row";
        setPanel.alignChildren = ["left", "center"];
        setPanel.margins = 15;

        setPanel.add("statictext", undefined, GM.L.LOAD);
        var loadDDL = setPanel.add("dropdownlist", undefined, []);
        loadDDL.preferredSize.width = 200;
        loadDDL.helpTip = GM.L.TIP_PRESET_LOAD;

        var saveBtn = setPanel.add("button", undefined, GM.L.SAVE);
        saveBtn.helpTip = GM.L.TIP_SAVE || "";
        var saveAsBtn = setPanel.add("button", undefined, GM.L.BTN_SAVE_AS);
        saveAsBtn.helpTip = GM.L.TIP_SAVE_AS;
        var deleteBtn = setPanel.add("button", undefined, GM.L.DELETE);
        deleteBtn.enabled = false;

        // =================================================================
        // Global Position Panel
        // =================================================================
        var posPanel = dlg.add("panel", undefined, GM.L.POSITION_PANEL);
        posPanel.orientation = "row";
        posPanel.alignChildren = ["left", "center"];
        posPanel.margins = 15;

        posPanel.add("statictext", undefined, GM.L.OFFSET_X);
        var offsetXIn = posPanel.add("edittext", undefined, String(defCfg.offsetX));
        offsetXIn.preferredSize.width = 60;
        offsetXIn.helpTip = GM.L.TIP_OFFSET_X;

        posPanel.add("statictext", undefined, GM.L.OFFSET_Y);
        var offsetYIn = posPanel.add("edittext", undefined, String(defCfg.offsetY));
        offsetYIn.preferredSize.width = 60;
        offsetYIn.helpTip = GM.L.TIP_OFFSET_Y;

        // =================================================================
        // Edge Panels — Row 1: Top + Left
        // =================================================================
        var row1 = dlg.add("group");
        row1.orientation = "row";
        row1.alignChildren = ["fill", "top"];

        var topUI = GM.UI.buildEdgePanel(row1, GM.L.TOP, defCfg.top, 280);
        var leftUI = GM.UI.buildEdgePanel(row1, GM.L.LEFT, defCfg.left, 280);

        // =================================================================
        // Edge Panels — Row 2: Bottom (mirror) + Right (mirror)
        // =================================================================
        var row2 = dlg.add("group");
        row2.orientation = "row";
        row2.alignChildren = ["fill", "top"];

        var bottomOuter = row2.add("group");
        bottomOuter.orientation = "column";
        bottomOuter.alignChildren = ["fill", "top"];
        bottomOuter.preferredSize.width = 280;
        var bottomMirrorGrp = bottomOuter.add("group");
        bottomMirrorGrp.margins = [12, 4, 0, 0];
        var bottomMirrorCB = bottomMirrorGrp.add("checkbox", undefined, GM.L.BOTTOM_MIRROR);
        bottomMirrorCB.value = defCfg.bottomMirror;
        bottomMirrorCB.helpTip = GM.L.TIP_MIRROR_BOTTOM;
        var bottomUI = GM.UI.buildEdgePanel(bottomOuter, GM.L.BOTTOM_CUSTOM, defCfg.bottom, 280);

        var rightOuter = row2.add("group");
        rightOuter.orientation = "column";
        rightOuter.alignChildren = ["fill", "top"];
        rightOuter.preferredSize.width = 280;
        var rightMirrorGrp = rightOuter.add("group");
        rightMirrorGrp.margins = [12, 4, 0, 0];
        var rightMirrorCB = rightMirrorGrp.add("checkbox", undefined, GM.L.RIGHT_MIRROR);
        rightMirrorCB.value = defCfg.rightMirror;
        rightMirrorCB.helpTip = GM.L.TIP_MIRROR_RIGHT;
        var rightUI = GM.UI.buildEdgePanel(rightOuter, GM.L.RIGHT_CUSTOM, defCfg.right, 280);

        function updateMirrors() {
            var bm = bottomMirrorCB.value;
            bottomUI.cb.enabled = !bm;
            bottomUI.setAllEnabled(!bm && bottomUI.cb.value);
            if (bm) bottomUI.cb.value = false;

            var rm = rightMirrorCB.value;
            rightUI.cb.enabled = !rm;
            rightUI.setAllEnabled(!rm && rightUI.cb.value);
            if (rm) rightUI.cb.value = false;
        }
        bottomMirrorCB.onClick = updateMirrors;
        rightMirrorCB.onClick = updateMirrors;
        bottomUI.cb.onClick = function () { bottomUI.setAllEnabled(bottomUI.cb.value); };
        rightUI.cb.onClick = function () { rightUI.setAllEnabled(rightUI.cb.value); };
        updateMirrors();

        // =================================================================
        // Mark Panel (units, size, shape)
        // =================================================================
        var markPanel = dlg.add("panel", undefined, GM.L.MARK_PANEL);
        markPanel.orientation = "row";
        markPanel.alignChildren = ["left", "center"];
        markPanel.margins = 15;

        markPanel.add("statictext", undefined, GM.L.UNIT_LABEL);
        var unitsDDL = markPanel.add("dropdownlist", undefined, GM.UI.getUnitDisplayNames());
        unitsDDL.selection = 0;

        markPanel.add("statictext", undefined, GM.L.SIZE_LABEL);
        var sizeInput = markPanel.add("edittext", undefined, String(defCfg.markSize));
        sizeInput.preferredSize.width = 60;
        sizeInput.helpTip = GM.L.TIP_SIZE;

        markPanel.add("statictext", undefined, GM.L.SHAPE_LABEL);
        var roundRB = markPanel.add("radiobutton", undefined, GM.L.ROUND);
        roundRB.value = defCfg.isRound;
        roundRB.helpTip = GM.L.TIP_SHAPE_ROUND;
        var squareRB = markPanel.add("radiobutton", undefined, GM.L.SQUARE);
        squareRB.value = !defCfg.isRound;
        squareRB.helpTip = GM.L.TIP_SHAPE_SQUARE;

        // =================================================================
        // Appearance Panel (layer, fill, stroke)
        // =================================================================
        var appPanel = dlg.add("panel", undefined, GM.L.APPEARANCE_PANEL);
        appPanel.orientation = "column";
        appPanel.alignChildren = ["left", "top"];
        appPanel.margins = [15, 10, 15, 15];
        appPanel.spacing = 10;

        var layerGrp = appPanel.add("group");
        layerGrp.add("statictext", undefined, GM.L.LAYER);
        var layerDDL = layerGrp.add("dropdownlist", undefined, layerInfo.names);
        layerDDL.preferredSize.width = 200;
        layerDDL.helpTip = GM.L.TIP_LAYER;
        GM.UI.selectDDL(layerDDL, GM.L.CREATE_LABEL);

        var fillGrp = appPanel.add("group");
        var fillCB = fillGrp.add("checkbox", undefined, GM.L.FILL);
        fillCB.value = defCfg.fillEnabled;
        fillCB.helpTip = GM.L.TIP_FILL;
        var fillDDL = fillGrp.add("dropdownlist", undefined, swatchInfo.names);
        fillDDL.preferredSize.width = 180;
        GM.UI.selectDDL(fillDDL, GM.L.CREATE_LABEL);
        var fillOPCB = fillGrp.add("checkbox", undefined, GM.L.OVERPRINT);
        fillOPCB.value = defCfg.fillOverprint;
        fillOPCB.helpTip = GM.L.TIP_OVERPRINT;

        var strokeGrp = appPanel.add("group");
        var strokeCB = strokeGrp.add("checkbox", undefined, GM.L.STROKE);
        strokeCB.value = defCfg.strokeEnabled;
        strokeCB.helpTip = GM.L.TIP_STROKE;
        var strokeDDL = strokeGrp.add("dropdownlist", undefined, swatchInfo.names);
        strokeDDL.preferredSize.width = 180;
        strokeDDL.enabled = defCfg.strokeEnabled;
        GM.UI.selectDDL(strokeDDL, GM.L.CREATE_LABEL);
        var strokeOPCB = strokeGrp.add("checkbox", undefined, GM.L.OVERPRINT);
        strokeOPCB.value = defCfg.strokeOverprint;
        strokeOPCB.helpTip = GM.L.TIP_OVERPRINT;
        strokeOPCB.enabled = defCfg.strokeEnabled;

        var wGrp = appPanel.add("group");
        wGrp.add("statictext", undefined, GM.L.WEIGHT);
        var weightInput = wGrp.add("edittext", undefined, String(defCfg.strokeWeight));
        weightInput.preferredSize.width = 50;
        weightInput.enabled = defCfg.strokeEnabled;
        weightInput.helpTip = GM.L.TIP_WEIGHT;
        wGrp.add("statictext", undefined, GM.L.POINTS);

        fillCB.onClick = function () {
            fillDDL.enabled = fillCB.value;
            fillOPCB.enabled = fillCB.value;
        };
        strokeCB.onClick = function () {
            strokeDDL.enabled = strokeCB.value;
            strokeOPCB.enabled = strokeCB.value;
            weightInput.enabled = strokeCB.value;
        };

        // =================================================================
        // Unit Conversion
        // =================================================================
        var currentUnit = GM.CONSTANTS.UNIT.MM;
        unitsDDL.onChange = function () {
            var newUnit = GM.UI.getUnitKey(unitsDDL);
            if (newUnit === currentUnit) return;
            var fields = [offsetXIn, offsetYIn, sizeInput]
                .concat(topUI.getConvertFields())
                .concat(leftUI.getConvertFields())
                .concat(bottomUI.getConvertFields())
                .concat(rightUI.getConvertFields());

            for (var i = 0; i < fields.length; i++) {
                var v = parseFloat(fields[i].text.replace(/,/g, "."));
                if (!isNaN(v)) {
                    fields[i].text = GM.Core.round(GM.Core.convertVal(v, currentUnit, newUnit));
                }
            }
            currentUnit = newUnit;
        };

        // =================================================================
        // Copyright footer
        // =================================================================
        var grpCopy = dlg.add("group");
        grpCopy.alignment = ["fill", "top"];
        var stCopy = grpCopy.add("statictext", undefined,
            "© 2025–2026 Osva1d — " + GM.CONSTANTS.SCRIPT_NAME + " v" + GM.CONSTANTS.VERSION);
        stCopy.enabled = false;

        // =================================================================
        // Footer — Reset + action buttons
        // =================================================================
        var footerGrp = dlg.add("group");
        footerGrp.alignment = ["fill", "center"];
        footerGrp.spacing = 8;

        var resetBtn = footerGrp.add("button", undefined, GM.L.BTN_RESET);
        resetBtn.helpTip = GM.L.TIP_RESET;
        resetBtn.alignment = ["left", "center"];

        var spacer = footerGrp.add("group");
        spacer.alignment = ["fill", "fill"];

        footerGrp.add("button", undefined, GM.L.CANCEL, { name: "cancel" });
        footerGrp.add("button", undefined, GM.L.OK, { name: "ok" });

        // =================================================================
        // Gather & Apply
        // =================================================================
        function gatherAll() {
            return {
                offsetX: parseFloat(offsetXIn.text.replace(/,/g, ".")),
                offsetY: parseFloat(offsetYIn.text.replace(/,/g, ".")),
                top: topUI.gather(),
                left: leftUI.gather(),
                bottom: bottomUI.gather(),
                right: rightUI.gather(),
                bottomMirror: bottomMirrorCB.value,
                rightMirror: rightMirrorCB.value,
                units: GM.UI.getUnitKey(unitsDDL),
                markSize: parseFloat(sizeInput.text.replace(/,/g, ".")),
                isRound: roundRB.value,
                markLayerName: GM.UI.toStorage(layerDDL.selection ? layerDDL.selection.text : GM.L.CREATE_LABEL),
                fillEnabled: fillCB.value,
                fillSwatchName: GM.UI.toStorage(fillDDL.selection ? fillDDL.selection.text : GM.L.CREATE_LABEL),
                fillOverprint: fillOPCB.value,
                strokeEnabled: strokeCB.value,
                strokeSwatchName: GM.UI.toStorage(strokeDDL.selection ? strokeDDL.selection.text : GM.L.CREATE_LABEL),
                strokeOverprint: strokeOPCB.value,
                strokeWeight: parseFloat(weightInput.text.replace(/,/g, "."))
            };
        }

        function applyAll(s) {
            GM.UI.selectUnit(unitsDDL, s.units || GM.CONSTANTS.UNIT.MM);
            currentUnit = s.units || GM.CONSTANTS.UNIT.MM;

            offsetXIn.text = s.offsetX;
            offsetYIn.text = s.offsetY;

            topUI.apply(s.top);
            leftUI.apply(s.left);
            bottomUI.apply(s.bottom);
            rightUI.apply(s.right);

            bottomMirrorCB.value = s.bottomMirror;
            rightMirrorCB.value = s.rightMirror;
            updateMirrors();

            sizeInput.text = s.markSize;
            roundRB.value = s.isRound;
            squareRB.value = !s.isRound;

            GM.UI.selectDDL(layerDDL, GM.UI.toDisplay(s.markLayerName));

            fillCB.value = s.fillEnabled;
            GM.UI.selectDDL(fillDDL, GM.UI.toDisplay(s.fillSwatchName));
            fillOPCB.value = s.fillOverprint;
            fillDDL.enabled = s.fillEnabled;
            fillOPCB.enabled = s.fillEnabled;

            strokeCB.value = s.strokeEnabled;
            GM.UI.selectDDL(strokeDDL, GM.UI.toDisplay(s.strokeSwatchName));
            strokeOPCB.value = s.strokeOverprint;
            weightInput.text = s.strokeWeight;
            strokeDDL.enabled = s.strokeEnabled;
            strokeOPCB.enabled = s.strokeEnabled;
            weightInput.enabled = s.strokeEnabled;
        }

        // =================================================================
        // Preset Handlers (delegating to GM.UIState)
        // =================================================================
        function refreshModifiedIndicator() {
            var modified;
            try { modified = GM.UIState.isModified(pData, gatherAll()); } catch (e) { modified = false; }
            try { saveBtn.enabled = modified; } catch (e) {}

            if (!loadDDL.selection) return;
            var idx = loadDDL.selection.index;
            var key = sortedKeys[idx];
            if (key !== pData.activePreset) return;
            var displayText = (key === GM.Config.PRESET_KEY_DEFAULT) ? GM.L.DEFAULT_PRESET : key;
            if (modified) displayText += " *";
            try { loadDDL.items[idx].text = displayText; } catch (e) {
                updatePresetList();
            }
        }

        function updatePresetList() {
            loadDDL.removeAll();
            var entries = GM.UIState.formatPresetList(pData, gatherAll(), GM.L);
            sortedKeys = [];
            var selIdx = 0;
            for (var i = 0; i < entries.length; i++) {
                loadDDL.add("item", entries[i].displayText);
                sortedKeys.push(entries[i].key);
                if (entries[i].isActive) selIdx = i;
            }
            if (loadDDL.items.length > 0) loadDDL.selection = selIdx;
            deleteBtn.enabled = (pData.activePreset !== GM.Config.PRESET_KEY_DEFAULT);
        }

        // Load initial values from [Last Settings] or active preset
        var initPreset = pData.presets[GM.Storage.PRESET_KEY_LAST] || pData.presets[pData.activePreset];
        if (initPreset) applyAll(initPreset);
        updatePresetList();

        loadDDL.onChange = function () {
            if (!loadDDL.selection) return;
            var key = sortedKeys[loadDDL.selection.index];
            if (!key || key === pData.activePreset) return;
            var r = GM.UIState.selectPreset(pData, key);
            if (!r.ok) return;
            deleteBtn.enabled = (key !== GM.Config.PRESET_KEY_DEFAULT);
            applyAll(r.settings);
            refreshModifiedIndicator();
        };

        saveBtn.onClick = function () {
            var r = GM.UIState.save(pData, gatherAll());
            if (r.ok) {
                updatePresetList();
                try { GM.Storage.save(pData); } catch (e) {}
                return;
            }
            if (r.reason === "needs-name") saveAsBtn.onClick();
        };

        saveAsBtn.onClick = function () {
            var raw = prompt(GM.L.PROMPT_SAVE_AS, "");
            if (raw === null || raw === "") return;
            var clean = GM.UIState.validatePresetName(raw);
            if (!clean) { alert(GM.L.ERR_RESERVED_NAME); return; }
            var r = GM.UIState.saveAs(pData, raw, gatherAll(), function () {
                return confirm(GM.L.ERR_PRESET_EXISTS);
            });
            if (!r.ok) return;
            updatePresetList();
            refreshModifiedIndicator();
            try { GM.Storage.save(pData); } catch (e) {}
        };

        deleteBtn.onClick = function () {
            if (!loadDDL.selection) return;
            var key = sortedKeys[loadDDL.selection.index];
            var displayName = loadDDL.selection.text;
            if (!confirm(GM.L.format(GM.L.CONFIRM_DELETE_PRESET, displayName))) return;
            var r = GM.UIState.deleteActive(pData);
            if (!r.ok) {
                if (r.reason === "reserved") alert(GM.L.ERR_CANNOT_DELETE_DEFAULT);
                return;
            }
            updatePresetList();
            applyAll(pData.presets[GM.Config.PRESET_KEY_DEFAULT]);
            refreshModifiedIndicator();
            try { GM.Storage.save(pData); } catch (e) {}
        };

        resetBtn.onClick = function () {
            applyAll(GM.Config.getDefaults());
            refreshModifiedIndicator();
        };

        // =================================================================
        // Live Validation
        // =================================================================
        var numericFields = [offsetXIn, offsetYIn, sizeInput];
        if (weightInput) numericFields.push(weightInput);

        function liveValidateAll() {
            var allValid = true;
            for (var i = 0; i < numericFields.length; i++) {
                var et = numericFields[i];
                if (!et.enabled) continue;
                var str = String(et.text || "").replace(/,/g, ".");
                var n = parseFloat(str);
                var valid = !isNaN(n) && n >= 0;
                try {
                    var g = et.graphics;
                    if (g && g.newPen) {
                        var color = valid
                            ? g.newPen(g.PenType.SOLID_COLOR, [0.0, 0.0, 0.0, 1.0], 1)
                            : g.newPen(g.PenType.SOLID_COLOR, [0.85, 0.0, 0.0, 1.0], 1);
                        g.foregroundColor = color;
                    }
                } catch (e) {}
                if (!valid) allValid = false;
            }
            return allValid;
        }

        var allEdits = [offsetXIn, offsetYIn, sizeInput, weightInput];
        for (var ei = 0; ei < allEdits.length; ei++) {
            if (!allEdits[ei]) continue;
            allEdits[ei].onChange = function () { refreshModifiedIndicator(); liveValidateAll(); };
            allEdits[ei].onChanging = function () { refreshModifiedIndicator(); liveValidateAll(); };
        }

        return {
            window: dlg,
            gatherAll: gatherAll
        };
    },

    selectDDL: function (ddl, name) {
        for (var i = 0; i < ddl.items.length; i++) {
            if (ddl.items[i].text === name) {
                ddl.selection = i;
                return;
            }
        }
        ddl.selection = 0;
    }
};
