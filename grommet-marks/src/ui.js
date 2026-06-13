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
     * Builds a compact edge row: enable checkbox + count/spacing radios.
     * When mirrorLabel is supplied (bottom/right edges), a mirror checkbox is
     * rendered ABOVE the row inside the same container (TD-001 — the control
     * that gates the section lives in the section). Toggling mirror on disables
     * the edge controls; toggling off restores the previous enabled state
     * (TD-003). All user interaction calls api.onChange() so the dialog can
     * refresh the modified indicator and live validation.
     *
     * @param {Object} parent - ScriptUI container.
     * @param {string} label - Edge enable label.
     * @param {Object} defaultCfg - Default edge config {enabled,useNumber,number,spacing}.
     * @param {string} [mirrorLabel] - Mirror checkbox label (bottom/right only).
     * @param {string} [mirrorTip] - Mirror checkbox helpTip.
     * @returns {Object} Edge panel API.
     */
    buildEdgePanel: function (parent, label, defaultCfg, mirrorLabel, mirrorTip) {
        var grp = parent.add("group");
        grp.orientation = "column";
        grp.alignChildren = ["left", "top"];
        grp.spacing = 6;

        var api = { onChange: function () {} };

        var mirrorCB = null;
        if (mirrorLabel) {
            mirrorCB = grp.add("checkbox", undefined, mirrorLabel);
            mirrorCB.value = false;
            mirrorCB.helpTip = mirrorTip || "";
        }

        var row = grp.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        row.spacing = 8;

        var cb = row.add("checkbox", undefined, label);
        cb.value = defaultCfg.enabled;
        cb.helpTip = GM.L.TIP_EDGE_ENABLE;
        cb.preferredSize.width = 64;

        var numRB = row.add("radiobutton", undefined, GM.L.COUNT);
        numRB.value = defaultCfg.useNumber;
        numRB.helpTip = GM.L.TIP_COUNT;
        var numIn = row.add("edittext", undefined, String(defaultCfg.number));
        numIn.preferredSize.width = 50;
        numIn.helpTip = GM.L.TIP_COUNT;

        var spcRB = row.add("radiobutton", undefined, GM.L.SPACING);
        spcRB.value = !defaultCfg.useNumber;
        spcRB.helpTip = GM.L.TIP_SPACING;
        var spcIn = row.add("edittext", undefined, String(defaultCfg.spacing));
        spcIn.preferredSize.width = 50;
        spcIn.helpTip = GM.L.TIP_SPACING;

        var _prevEnabled = defaultCfg.enabled;

        function setModeEnabled(state) {
            numRB.enabled = state;
            spcRB.enabled = state;
            numIn.enabled = state && numRB.value;
            spcIn.enabled = state && spcRB.value;
        }

        // Gate the whole row by mirror state; cb itself disabled when mirrored.
        function refresh() {
            var mirrored = !!(mirrorCB && mirrorCB.value);
            cb.enabled = !mirrored;
            setModeEnabled(!mirrored && cb.value);
        }

        // Explicit radio exclusivity. ScriptUI only auto-groups radio buttons
        // that are CONSECUTIVE within the same container; here numIn sits
        // between numRB and spcRB, which breaks the implicit group — without
        // this, clicking "Spacing" leaves numRB.value === true and gather()
        // always reports count mode (regression from the cycle-2 compact row).
        numRB.onClick = function () {
            numRB.value = true; spcRB.value = false;
            numIn.enabled = true; spcIn.enabled = false;
            api.onChange();
        };
        spcRB.onClick = function () {
            spcRB.value = true; numRB.value = false;
            numIn.enabled = false; spcIn.enabled = true;
            api.onChange();
        };
        cb.onClick = function () { setModeEnabled(cb.value); api.onChange(); };
        numIn.onChanging = function () { api.onChange(); };
        numIn.onChange   = function () { api.onChange(); };
        spcIn.onChanging = function () { api.onChange(); };
        spcIn.onChange   = function () { api.onChange(); };

        if (mirrorCB) {
            mirrorCB.onClick = function () {
                if (mirrorCB.value) { _prevEnabled = cb.value; cb.value = false; }
                else { cb.value = _prevEnabled; }
                refresh();
                api.onChange();
            };
        }

        refresh();

        api.panel = grp;
        api.cb = cb;
        api.mirrorCB = mirrorCB;
        api.numRB = numRB; api.numIn = numIn; api.spcRB = spcRB; api.spcIn = spcIn;
        api.setAllEnabled = function (state) { setModeEnabled(state); };
        api.refresh = refresh;
        api.gather = function () {
            return {
                enabled: cb.value,
                useNumber: numRB.value,
                // parseFloat (not parseInt) — parseInt would silently truncate
                // "10.5" to 10 before GM.Validation ever sees it, making the
                // edgeCount integer rule unenforceable on the submit path.
                number: parseFloat(numIn.text.replace(/,/g, ".")),
                spacing: parseFloat(spcIn.text.replace(/,/g, "."))
            };
        };
        api.apply = function (e) {
            cb.value = e.enabled;
            _prevEnabled = e.enabled;
            numRB.value = e.useNumber;
            spcRB.value = !e.useNumber;
            numIn.text = e.number;
            spcIn.text = e.spacing;
            refresh();
        };
        api.setMirror = function (v) { if (mirrorCB) mirrorCB.value = v; };
        api.getMirror = function () { return mirrorCB ? mirrorCB.value : false; };
        api.getConvertFields = function () { return [spcIn]; };
        return api;
    },

    /**
     * Adds a thin horizontal separator inside a column container.
     * @param {Object} parent - ScriptUI container.
     */
    addSeparator: function (parent) {
        var sep = parent.add("panel");
        sep.alignment = ["fill", "top"];
        sep.preferredSize.height = 1;
        return sep;
    },

    /**
     * Builds the main ScriptUI dialog (canonical single column).
     * @param {Object} pData - Preset wrapper {activePreset, presets}
     * @param {Object} layerInfo - Layer names and existence flags
     * @param {Object} swatchInfo - Swatch names and existence flags
     * @param {Object} pathInfo - {ok, cornerCount, closed, totalLen} or {ok:false, reason}
     * @returns {Object} Dialog object with window, gatherAll, modeUI, pathUI, zonesUI
     */
    buildDialog: function (pData, layerInfo, swatchInfo, pathInfo) {
        var dlg = new Window("dialog", GM.CONSTANTS.SCRIPT_NAME + " v" + GM.CONSTANTS.VERSION);
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.margins = 20;
        dlg.spacing = 15;   // matches ZSM / BRE / extendscript-ui-standards §2
        dlg.preferredSize.width = 400;   // baseline floor; content grows if needed
        var defCfg = GM.Config.getDefaults();
        var sortedKeys = [];

        // =================================================================
        // Presets Panel
        // =================================================================
        var setPanel = dlg.add("panel", undefined, GM.L.SETTINGS_PANEL);
        setPanel.alignChildren = ["fill", "top"];
        setPanel.margins = 15;
        setPanel.spacing = 8;

        // Row 1: label + dropdown (fills) + revert (↺), ZSM layout.
        var presetTop = setPanel.add("group");
        presetTop.alignment = ["fill", "top"];
        presetTop.spacing = 8;
        presetTop.add("statictext", undefined, GM.L.LOAD);
        var loadDDL = presetTop.add("dropdownlist", undefined, []);
        loadDDL.alignment = ["fill", "center"];
        loadDDL.helpTip = GM.L.TIP_PRESET_LOAD;
        var revertBtn = presetTop.add("button", undefined, "↺");
        revertBtn.preferredSize = [30, 24];
        revertBtn.alignment = ["right", "center"];
        revertBtn.helpTip = GM.L.TIP_REVERT;
        revertBtn.enabled = false;

        // Row 2: Save / Save As / Delete, right-aligned, equal width (ZSM layout).
        var PRESET_BTN_W = 92;
        var presetBtns = setPanel.add("group");
        presetBtns.alignment = ["right", "top"];
        presetBtns.spacing = 6;
        var saveBtn = presetBtns.add("button", undefined, GM.L.SAVE);
        saveBtn.preferredSize.width = PRESET_BTN_W;
        saveBtn.helpTip = GM.L.TIP_SAVE || "";
        var saveAsBtn = presetBtns.add("button", undefined, GM.L.BTN_SAVE_AS);
        saveAsBtn.preferredSize.width = PRESET_BTN_W;
        saveAsBtn.helpTip = GM.L.TIP_SAVE_AS;
        var deleteBtn = presetBtns.add("button", undefined, GM.L.DELETE);
        deleteBtn.preferredSize.width = PRESET_BTN_W;
        deleteBtn.helpTip = GM.L.TIP_DELETE;
        deleteBtn.enabled = false;

        // =================================================================
        // Placement Panel (artboard edges vs selected path)
        // =================================================================
        var pathOk = !!(pathInfo && pathInfo.ok);
        var modePanel = dlg.add("panel", undefined, GM.L.PLACEMENT_PANEL);
        modePanel.orientation = "row";
        modePanel.alignChildren = ["left", "center"];
        modePanel.margins = 15;
        modePanel.spacing = 15;
        var artboardRB = modePanel.add("radiobutton", undefined, GM.L.MODE_ARTBOARD);
        artboardRB.value = true;
        var pathRB = modePanel.add("radiobutton", undefined, GM.L.MODE_PATH);
        pathRB.enabled = pathOk;
        pathRB.helpTip = pathOk ? "" : GM.L.TIP_MODE_PATH_DISABLED;

        // =================================================================
        // Edges Panel (offsets + 4 compact edge rows, mirror inline)
        // =================================================================
        var edgesPanel = dlg.add("panel", undefined, GM.L.EDGES_PANEL);
        edgesPanel.orientation = "column";
        edgesPanel.alignChildren = ["left", "top"];
        edgesPanel.margins = 15;
        edgesPanel.spacing = 10;

        var offGrp = edgesPanel.add("group");
        offGrp.orientation = "row";
        offGrp.alignChildren = ["left", "center"];
        offGrp.spacing = 8;
        offGrp.add("statictext", undefined, GM.L.OFFSET_X);
        var offsetXIn = offGrp.add("edittext", undefined, String(defCfg.offsetX));
        offsetXIn.preferredSize.width = 50;
        offsetXIn.helpTip = GM.L.TIP_OFFSET_X;
        offGrp.add("statictext", undefined, GM.L.OFFSET_Y);
        var offsetYIn = offGrp.add("edittext", undefined, String(defCfg.offsetY));
        offsetYIn.preferredSize.width = 50;
        offsetYIn.helpTip = GM.L.TIP_OFFSET_Y;

        GM.UI.addSeparator(edgesPanel);

        var topUI    = GM.UI.buildEdgePanel(edgesPanel, GM.L.EDGE_TOP,    defCfg.top);
        var leftUI   = GM.UI.buildEdgePanel(edgesPanel, GM.L.EDGE_LEFT,   defCfg.left);

        GM.UI.addSeparator(edgesPanel);

        var bottomUI = GM.UI.buildEdgePanel(edgesPanel, GM.L.EDGE_BOTTOM, defCfg.bottom, GM.L.BOTTOM_MIRROR, GM.L.TIP_MIRROR_BOTTOM);
        var rightUI  = GM.UI.buildEdgePanel(edgesPanel, GM.L.EDGE_RIGHT,  defCfg.right,  GM.L.RIGHT_MIRROR,  GM.L.TIP_MIRROR_RIGHT);

        // =================================================================
        // Path Panel (replaces Edges in path mode)
        // =================================================================
        var pathPanel = dlg.add("panel", undefined, GM.L.PATH_PANEL);
        pathPanel.orientation = "column";
        pathPanel.alignChildren = ["left", "top"];
        pathPanel.margins = 15;
        pathPanel.spacing = 10;
        pathPanel.visible = false;

        var infoText = "";
        if (pathOk) {
            infoText = (pathInfo.closed ? GM.L.PATH_INFO_CLOSED : GM.L.PATH_INFO_OPEN)
                + " · "
                + (pathInfo.cornerCount > 0
                    ? GM.L.format(GM.L.PATH_INFO_CORNERS, pathInfo.cornerCount)
                    : GM.L.PATH_INFO_NO_CORNERS);
        }
        var pathInfoLbl = pathPanel.add("statictext", undefined, infoText);
        pathInfoLbl.enabled = false;

        var pathRow = pathPanel.add("group");
        pathRow.orientation = "row";
        pathRow.alignChildren = ["left", "center"];
        pathRow.spacing = 8;
        var pathNumRB = pathRow.add("radiobutton", undefined, GM.L.COUNT);
        pathNumRB.helpTip = GM.L.TIP_COUNT;
        var pathNumIn = pathRow.add("edittext", undefined, String(defCfg.pathDist.number));
        pathNumIn.preferredSize.width = 50;
        pathNumIn.helpTip = GM.L.TIP_COUNT;
        var pathSpcRB = pathRow.add("radiobutton", undefined, GM.L.SPACING);
        pathSpcRB.helpTip = GM.L.TIP_SPACING;
        var pathSpcIn = pathRow.add("edittext", undefined, String(defCfg.pathDist.spacing));
        pathSpcIn.preferredSize.width = 50;
        pathSpcIn.helpTip = GM.L.TIP_SPACING;
        pathSpcRB.value = true;

        var hasCorners = pathOk && pathInfo.cornerCount > 0;
        if (hasCorners) {
            pathNumRB.enabled = false;
            pathNumRB.helpTip = GM.L.TIP_PATH_COUNT_DISABLED;
        }
        pathNumRB.onClick = function () {
            pathNumRB.value = true; pathSpcRB.value = false;
            pathNumIn.enabled = true; pathSpcIn.enabled = false;
            onUserChange();
        };
        pathSpcRB.onClick = function () {
            pathSpcRB.value = true; pathNumRB.value = false;
            pathNumIn.enabled = false; pathSpcIn.enabled = true;
            onUserChange();
        };
        pathNumIn.enabled = false;

        var offsetNote = pathPanel.add("statictext", undefined, GM.L.PATH_OFFSET_NOTE,
            { multiline: true });
        offsetNote.enabled = false;
        offsetNote.preferredSize.width = 330;

        // =================================================================
        // Corner Zones Panel (shared by both modes)
        // =================================================================
        var zonesPanel = dlg.add("panel", undefined, GM.L.ZONES_PANEL);
        zonesPanel.orientation = "row";
        zonesPanel.alignChildren = ["left", "center"];
        zonesPanel.margins = 15;
        zonesPanel.spacing = 8;
        var zoneCB = zonesPanel.add("checkbox", undefined, GM.L.ZONES_ENABLE);
        zoneCB.value = defCfg.cornerZone.enabled;
        zoneCB.helpTip = GM.L.TIP_ZONES;
        zonesPanel.add("statictext", undefined, GM.L.ZONES_COUNT);
        var zoneCountIn = zonesPanel.add("edittext", undefined, String(defCfg.cornerZone.count));
        zoneCountIn.preferredSize.width = 50;
        zoneCountIn.helpTip = GM.L.TIP_ZONES;
        zonesPanel.add("statictext", undefined, GM.L.ZONES_PITCH);
        var zonePitchIn = zonesPanel.add("edittext", undefined, String(defCfg.cornerZone.pitch));
        zonePitchIn.preferredSize.width = 50;
        zonePitchIn.helpTip = GM.L.TIP_ZONES;

        function refreshZonesEnabled() {
            var pathMode = pathRB.value;
            var zonesPossible = !pathMode || hasCorners;
            zoneCB.enabled = zonesPossible;
            zoneCB.helpTip = zonesPossible ? GM.L.TIP_ZONES : GM.L.TIP_ZONES_NO_CORNERS;
            var fieldsOn = zonesPossible && zoneCB.value;
            zoneCountIn.enabled = fieldsOn;
            zonePitchIn.enabled = fieldsOn;
        }
        zoneCB.onClick = function () { refreshZonesEnabled(); onUserChange(); };

        // (d) Mode switching
        function refreshModeUI() {
            var pathMode = pathRB.value;
            edgesPanel.visible = !pathMode;
            pathPanel.visible = pathMode;
            refreshZonesEnabled();
            dlg.layout.layout(true);
            onUserChange();
        }
        artboardRB.onClick = function () { pathRB.value = false; artboardRB.value = true; refreshModeUI(); };
        pathRB.onClick = function () { artboardRB.value = false; pathRB.value = true; refreshModeUI(); };

        // =================================================================
        // Mark Panel (units, size, shape, weights)
        // =================================================================
        var markPanel = dlg.add("panel", undefined, GM.L.MARK_PANEL);
        markPanel.orientation = "column";
        markPanel.alignChildren = ["left", "top"];
        markPanel.margins = 15;
        markPanel.spacing = 8;

        var mRow1 = markPanel.add("group");
        mRow1.orientation = "row";
        mRow1.alignChildren = ["left", "center"];
        mRow1.spacing = 8;
        mRow1.add("statictext", undefined, GM.L.UNIT_LABEL);
        var unitsDDL = mRow1.add("dropdownlist", undefined, GM.UI.getUnitDisplayNames());
        unitsDDL.preferredSize.width = 130;
        unitsDDL.selection = 0;
        unitsDDL.helpTip = GM.L.TIP_UNITS;
        mRow1.add("statictext", undefined, GM.L.SIZE_LABEL);
        var sizeInput = mRow1.add("edittext", undefined, String(defCfg.markSize));
        sizeInput.preferredSize.width = 60;
        sizeInput.helpTip = GM.L.TIP_SIZE;

        var mRow2 = markPanel.add("group");
        mRow2.orientation = "row";
        mRow2.alignChildren = ["left", "center"];
        mRow2.spacing = 12;
        var circleCB = mRow2.add("checkbox", undefined, GM.L.MARK_CIRCLE);
        circleCB.value = defCfg.markCircle;
        circleCB.helpTip = GM.L.TIP_MARK_SHAPE;
        var crossCB = mRow2.add("checkbox", undefined, GM.L.MARK_CROSS);
        crossCB.value = defCfg.markCross;
        crossCB.helpTip = GM.L.TIP_MARK_SHAPE;

        var mRow3 = markPanel.add("group");
        mRow3.orientation = "row";
        mRow3.alignChildren = ["left", "center"];
        mRow3.spacing = 8;
        mRow3.add("statictext", undefined, GM.L.REG_WEIGHT);
        var regWIn = mRow3.add("edittext", undefined, String(defCfg.regWeight));
        regWIn.preferredSize.width = 50;
        regWIn.helpTip = GM.L.TIP_REG_WEIGHT;
        mRow3.add("statictext", undefined, GM.L.HALO_WEIGHT);
        var haloWIn = mRow3.add("edittext", undefined, String(defCfg.haloWeight));
        haloWIn.preferredSize.width = 50;
        haloWIn.helpTip = GM.L.TIP_HALO_WEIGHT;


        // =================================================================
        // Appearance Panel (layer, fill, stroke)
        // =================================================================
        var appPanel = dlg.add("panel", undefined, GM.L.APPEARANCE_PANEL);
        appPanel.orientation = "column";
        appPanel.alignChildren = ["left", "top"];
        appPanel.margins = [15, 10, 15, 15];
        appPanel.spacing = 10;

        var layerGrp = appPanel.add("group");
        var layerLbl = layerGrp.add("statictext", undefined, GM.L.LAYER);
        layerLbl.preferredSize.width = 75;
        var layerDDL = layerGrp.add("dropdownlist", undefined, layerInfo.names);
        layerDDL.preferredSize.width = 170;
        layerDDL.helpTip = GM.L.TIP_LAYER;
        GM.UI.selectDDL(layerDDL, GM.L.CREATE_LABEL);

        var fillGrp = appPanel.add("group");
        var fillCB = fillGrp.add("checkbox", undefined, GM.L.FILL);
        fillCB.value = defCfg.fillEnabled;
        fillCB.helpTip = GM.L.TIP_FILL;
        fillCB.preferredSize.width = 75;
        var fillDDL = fillGrp.add("dropdownlist", undefined, swatchInfo.names);
        fillDDL.preferredSize.width = 170;
        fillDDL.helpTip = GM.L.TIP_FILL;
        GM.UI.selectDDL(fillDDL, GM.L.CREATE_LABEL);
        var fillOPCB = fillGrp.add("checkbox", undefined, GM.L.OVERPRINT);
        fillOPCB.value = defCfg.fillOverprint;
        fillOPCB.helpTip = GM.L.TIP_OVERPRINT;

        var strokeGrp = appPanel.add("group");
        var strokeCB = strokeGrp.add("checkbox", undefined, GM.L.STROKE);
        strokeCB.value = defCfg.strokeEnabled;
        strokeCB.helpTip = GM.L.TIP_STROKE;
        strokeCB.preferredSize.width = 75;
        var strokeDDL = strokeGrp.add("dropdownlist", undefined, swatchInfo.names);
        strokeDDL.preferredSize.width = 170;
        strokeDDL.enabled = defCfg.strokeEnabled;
        strokeDDL.helpTip = GM.L.TIP_STROKE;
        GM.UI.selectDDL(strokeDDL, GM.L.CREATE_LABEL);
        var strokeOPCB = strokeGrp.add("checkbox", undefined, GM.L.OVERPRINT);
        strokeOPCB.value = defCfg.strokeOverprint;
        strokeOPCB.helpTip = GM.L.TIP_OVERPRINT;
        strokeOPCB.enabled = defCfg.strokeEnabled;

        var wGrp = appPanel.add("group");
        var weightLbl = wGrp.add("statictext", undefined, GM.L.WEIGHT);
        weightLbl.preferredSize.width = 75;
        var weightInput = wGrp.add("edittext", undefined, String(defCfg.strokeWeight));
        weightInput.preferredSize.width = 60;   // standalone numeric field — house standard (ZSM/§2)
        weightInput.enabled = defCfg.strokeEnabled;
        weightInput.helpTip = GM.L.TIP_WEIGHT;
        wGrp.add("statictext", undefined, GM.L.POINTS);

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
        footerGrp.alignment = ["right", "center"];
        footerGrp.spacing = 8;

        footerGrp.add("button", undefined, GM.L.CANCEL, { name: "cancel" });
        var okBtn = footerGrp.add("button", undefined, GM.L.OK, { name: "ok" });

        // =================================================================
        // Gather & Apply  (output shapes are the contract with main.js)
        // =================================================================
        function gatherAll() {
            return {
                offsetX: parseFloat(offsetXIn.text.replace(/,/g, ".")),
                offsetY: parseFloat(offsetYIn.text.replace(/,/g, ".")),
                top: topUI.gather(),
                left: leftUI.gather(),
                bottom: bottomUI.gather(),
                right: rightUI.gather(),
                bottomMirror: bottomUI.getMirror(),
                rightMirror: rightUI.getMirror(),
                units: GM.UI.getUnitKey(unitsDDL),
                markSize: parseFloat(sizeInput.text.replace(/,/g, ".")),
                isRound: true,   // shape locked to circle (square removed v4.2.0)
                markCircle: circleCB.value,
                markCross: crossCB.value,
                regWeight: parseFloat(regWIn.text.replace(/,/g, ".")),
                haloWeight: parseFloat(haloWIn.text.replace(/,/g, ".")),
                markLayerName: GM.UI.toStorage(GM.UI.ddlValue(layerDDL) || GM.L.CREATE_LABEL),
                fillEnabled: fillCB.value,
                fillSwatchName: GM.UI.toStorage(GM.UI.ddlValue(fillDDL) || GM.L.CREATE_LABEL),
                fillOverprint: fillOPCB.value,
                strokeEnabled: strokeCB.value,
                strokeSwatchName: GM.UI.toStorage(GM.UI.ddlValue(strokeDDL) || GM.L.CREATE_LABEL),
                strokeOverprint: strokeOPCB.value,
                strokeWeight: parseFloat(weightInput.text.replace(/,/g, ".")),
                placementMode: pathRB.value ? GM.CONSTANTS.MODE_PATH : GM.CONSTANTS.MODE_ARTBOARD,
                cornerZone: {
                    enabled: zoneCB.value,
                    count: parseFloat(zoneCountIn.text.replace(/,/g, ".")),
                    pitch: parseFloat(zonePitchIn.text.replace(/,/g, "."))
                },
                pathDist: {
                    useNumber: pathNumRB.value,
                    number: parseFloat(pathNumIn.text.replace(/,/g, ".")),
                    spacing: parseFloat(pathSpcIn.text.replace(/,/g, "."))
                }
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

            bottomUI.setMirror(s.bottomMirror); bottomUI.refresh();
            rightUI.setMirror(s.rightMirror);   rightUI.refresh();

            sizeInput.text = s.markSize;
            circleCB.value = !!s.markCircle;
            crossCB.value = !!s.markCross;
            regWIn.text = s.regWeight;
            haloWIn.text = s.haloWeight;

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

            var wantPath = (s.placementMode === GM.CONSTANTS.MODE_PATH);
            if (wantPath && !pathOk) {
                wantPath = false;
            }
            pathRB.value = wantPath; artboardRB.value = !wantPath;

            var z = s.cornerZone || defCfg.cornerZone;
            zoneCB.value = !!z.enabled;
            zoneCountIn.text = z.count;
            zonePitchIn.text = z.pitch;

            var pd = s.pathDist || defCfg.pathDist;
            var pdUseNum = !!pd.useNumber && !hasCorners;
            pathNumRB.value = pdUseNum; pathSpcRB.value = !pdUseNum;
            pathNumIn.text = pd.number; pathSpcIn.text = pd.spacing;
            pathNumIn.enabled = pdUseNum; pathSpcIn.enabled = !pdUseNum;

            refreshModeUI();
        }

        // =================================================================
        // Unit Conversion
        // =================================================================
        var currentUnit = GM.CONSTANTS.UNIT.MM;
        unitsDDL.onChange = function () {
            var newUnit = GM.UI.getUnitKey(unitsDDL);
            if (newUnit === currentUnit) return;
            var fields = [offsetXIn, offsetYIn, sizeInput, zonePitchIn, pathSpcIn]
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
            onUserChange();
        };

        // =================================================================
        // Live Validation — each numeric field is checked against its own
        // GM.Validation rule (min/max/integer), the same rules used on submit.
        // Disabled fields (inactive edge mode, stroke off, mirrored edge) are
        // skipped and painted valid. OK is gated on all visible fields valid.
        // =================================================================
        var R = GM.Validation.rules;
        var validationTargets = [
            { et: offsetXIn,   rule: R.offsetX },
            { et: offsetYIn,   rule: R.offsetY },
            { et: sizeInput,   rule: R.markSize },
            { et: regWIn,      rule: R.regWeight },
            { et: haloWIn,     rule: R.haloWeight },
            { et: weightInput, rule: R.strokeWeight },
            { et: zoneCountIn, rule: R.cornerCount },
            { et: zonePitchIn, rule: R.cornerPitch },
            { et: pathNumIn,   rule: R.pathNumber },
            { et: pathSpcIn,   rule: R.pathSpacing }
        ];
        var edgeUIs = [topUI, leftUI, bottomUI, rightUI];
        for (var vt = 0; vt < edgeUIs.length; vt++) {
            validationTargets.push({ et: edgeUIs[vt].numIn, rule: R.edgeCount });
            validationTargets.push({ et: edgeUIs[vt].spcIn, rule: R.edgeSpacing });
        }

        function paintField(et, valid) {
            try {
                var g = et.graphics;
                if (!g || !g.newPen) return;
                // Capture the field's DEFAULT foreground pen once (after the
                // graphics object is realised). "Valid" restores that theme
                // default — forcing black [0,0,0] makes the text invisible on
                // the dark UI. Light-grey is a safe fallback if it can't be read.
                if (et._gmDefPen === undefined) {
                    et._gmDefPen = g.foregroundColor || null;
                }
                if (valid) {
                    g.foregroundColor = et._gmDefPen
                        ? et._gmDefPen
                        : g.newPen(g.PenType.SOLID_COLOR, [0.75, 0.75, 0.75, 1.0], 1);
                } else {
                    g.foregroundColor = g.newPen(g.PenType.SOLID_COLOR, [0.90, 0.20, 0.20, 1.0], 1);
                }
            } catch (e) {}
        }

        function fieldInRange(et, rule) {
            var n = parseFloat(String(et.text || "").replace(/,/g, "."));
            if (isNaN(n)) return false;
            if (rule.integer && n !== Math.floor(n)) return false;
            return n >= rule.min && n <= rule.max;
        }

        function liveValidateAll() {
            var allValid = true;
            for (var i = 0; i < validationTargets.length; i++) {
                var t = validationTargets[i];
                if (!t.et) continue;
                if (!t.et.enabled) { paintField(t.et, true); continue; }
                var ok = fieldInRange(t.et, t.rule);
                paintField(t.et, ok);
                if (!ok) allValid = false;
            }

            // Structural checks (mirror GM.Validation.validate) so OK greys out
            // for these too, not just numeric ranges. These have no single field
            // to paint, so they only gate the button.
            // 1) At least one effective edge enabled (artboard mode only).
            if (!pathRB.value) {
                var topOn = topUI.cb.value;
                var leftOn = leftUI.cb.value;
                var bottomOn = bottomUI.getMirror() ? topOn : bottomUI.cb.value;
                var rightOn = rightUI.getMirror() ? leftOn : rightUI.cb.value;
                if (!topOn && !leftOn && !bottomOn && !rightOn) allValid = false;
            }
            // 2) Marks must have a fill and/or a stroke.
            if (!fillCB.value && !strokeCB.value) allValid = false;

            try { okBtn.enabled = allValid; } catch (e) {}
            return allValid;
        }

        // =================================================================
        // Shared change hook — modified indicator + validation
        // =================================================================
        function onUserChange() {
            refreshModifiedIndicator();
            liveValidateAll();
        }

        // =================================================================
        // Appearance handlers
        // =================================================================
        fillCB.onClick = function () {
            fillDDL.enabled = fillCB.value;
            fillOPCB.enabled = fillCB.value;
            refreshModifiedIndicator();
            liveValidateAll();
        };
        strokeCB.onClick = function () {
            strokeDDL.enabled = strokeCB.value;
            strokeOPCB.enabled = strokeCB.value;
            weightInput.enabled = strokeCB.value;
            refreshModifiedIndicator();
            liveValidateAll();
        };
        fillOPCB.onClick = refreshModifiedIndicator;
        strokeOPCB.onClick = refreshModifiedIndicator;
        layerDDL.onChange = refreshModifiedIndicator;
        fillDDL.onChange = refreshModifiedIndicator;
        strokeDDL.onChange = refreshModifiedIndicator;

        // Edge panels notify on any internal change.
        topUI.onChange    = onUserChange;
        leftUI.onChange   = onUserChange;
        bottomUI.onChange = onUserChange;
        rightUI.onChange  = onUserChange;

        // =================================================================
        // Preset Handlers (delegating to GM.UIState)
        // =================================================================
        function refreshModifiedIndicator() {
            var modified;
            try { modified = GM.UIState.isModified(pData, gatherAll()); } catch (e) { modified = false; }
            try { saveBtn.enabled = modified; } catch (e) {}
            try { revertBtn.enabled = modified; } catch (e) {}

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
        else refreshModeUI();
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
                GM.Storage.save(pData);   // reports failure itself
                return;
            }
            if (r.reason === "needs-name") saveAsBtn.onClick();
        };

        saveAsBtn.onClick = function () {
            var raw = prompt(GM.L.PROMPT_SAVE_AS, "");
            if (raw === null) return;   // cancelled
            var clean = GM.UIState.validatePresetName(raw);
            if (!clean) {
                // Distinguish empty/whitespace-only (needs a name) from a
                // reserved key — "name is reserved" for "" is misleading.
                var isEmpty = String(raw).replace(/^\s+|\s+$/g, "") === "";
                alert(isEmpty ? GM.L.ERR_ENTER_NAME : GM.L.ERR_RESERVED_NAME);
                return;
            }
            var r = GM.UIState.saveAs(pData, raw, gatherAll(), function (name) {
                return confirm(GM.L.format(GM.L.CONFIRM_OVERWRITE_PRESET, name));
            });
            if (!r.ok) return;
            updatePresetList();
            refreshModifiedIndicator();
            GM.Storage.save(pData);   // reports failure itself
        };

        deleteBtn.onClick = function () {
            if (!loadDDL.selection) return;
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
            GM.Storage.save(pData);   // reports failure itself
        };

        revertBtn.onClick = function () {
            // Discard unsaved edits: reload the active preset as saved.
            // For [Default] (immutable) this restores factory defaults.
            var saved = pData.presets[pData.activePreset];
            if (saved) applyAll(saved);
            refreshModifiedIndicator();
        };

        // Wire numeric edits to the shared change hook.
        var allEdits = [offsetXIn, offsetYIn, sizeInput, weightInput, regWIn, haloWIn,
                        zoneCountIn, zonePitchIn, pathNumIn, pathSpcIn];
        for (var ei = 0; ei < allEdits.length; ei++) {
            if (!allEdits[ei]) continue;
            allEdits[ei].onChange = onUserChange;
            allEdits[ei].onChanging = onUserChange;
        }
        circleCB.onClick = onUserChange;
        crossCB.onClick = onUserChange;

        // Initial pass: modified indicator (Save disabled when UI matches the
        // active preset) + live validation (paints fields, sets OK initial state).
        refreshModifiedIndicator();
        liveValidateAll();

        return {
            window: dlg,
            gatherAll: gatherAll,
            modeUI: { artboardRB: artboardRB, pathRB: pathRB },
            pathUI: { numRB: pathNumRB, numIn: pathNumIn, spcRB: pathSpcRB, spcIn: pathSpcIn },
            zonesUI: { enableCB: zoneCB, countIn: zoneCountIn, pitchIn: zonePitchIn }
        };
    },

    /**
     * Selects a dropdown item by display text.
     *
     * When the requested value is NOT present in the current document (e.g. a
     * preset references swatch "MyOrange" but this document has no such spot),
     * we do NOT silently fall back to item 0 (= the "[Create …]" sentinel),
     * which would discard the user's saved choice and create a fresh default
     * swatch/layer on OK. Instead we insert a synthetic item that preserves the
     * saved name with a "(missing)" marker and select it. The marker is
     * display-only; GM.UI.ddlValue() reads back the raw name, so toStorage()
     * and isModified() both see the original value — no silent swap, no false
     * "modified" asterisk. Downstream getOrCreate{Layer,Swatch} then recreates
     * the named layer/spot.
     */
    selectDDL: function (ddl, name) {
        // Purge any stale synthetic "missing" item so they don't accumulate
        // across preset switches on a persistent dropdown.
        for (var k = ddl.items.length - 1; k >= 0; k--) {
            if (ddl.items[k]._gmMissing) ddl.remove(k);
        }
        for (var i = 0; i < ddl.items.length; i++) {
            if (ddl.items[i].text === name) {
                ddl.selection = i;
                return;
            }
        }
        // Not in the document — preserve the saved name as a flagged item.
        var suffix = (GM.L && GM.L.DDL_MISSING_SUFFIX) ? GM.L.DDL_MISSING_SUFFIX : "(missing)";
        var missing = ddl.add("item", name + "  " + suffix);
        missing._gmRawValue = name;
        missing._gmMissing  = true;
        ddl.selection = missing;
    },

    /**
     * Reads the resolved value of a dropdown selection. For a synthetic
     * "missing" item (added by selectDDL when a saved value wasn't in the
     * document), returns the raw saved name without the display marker;
     * otherwise returns the selection text. Empty string when nothing selected.
     */
    ddlValue: function (ddl) {
        var sel = ddl.selection;
        if (!sel) return "";
        return (sel._gmRawValue != null) ? sel._gmRawValue : sel.text;
    }
};
