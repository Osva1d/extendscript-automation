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
    buildEdgePanel: function (parent, label, defaultCfg) {
        // One uniform grid row of the Edges panel — identical for all four edges.
        // Fixed column widths keep the value columns aligned with the header:
        //   c1 = edge enable checkbox | c2 = Count radio + field | c3 = Spacing radio + field
        // Radios are textless — the "Count"/"Spacing" captions live once in the
        // header row built by buildDialog. Mirroring is handled in buildDialog by
        // hiding the opposite row, so this row carries no mirror controls.
        var LO = GM.CONSTANTS.LAYOUT;
        var COL1_W = 72, COL_NUM = 78, COL_SPC = 90;
        var row = parent.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        row.spacing = LO.GROUP;   // must equal hdrRow.spacing (column alignment)
        row.margins = 0;

        var api = { onChange: function () {} };

        // Every cell is hard-locked to a shared width (same values used by the
        // header) so columns 2/3 start at the same x on all four rows.
        var c1 = row.add("group");
        c1.orientation = "row"; c1.alignChildren = ["left", "center"];
        GM.UI.lockW(c1, COL1_W);
        var cb = c1.add("checkbox", undefined, label);
        cb.value = defaultCfg.enabled;
        cb.helpTip = GM.L.TIP_EDGE_ENABLE;

        var c2 = row.add("group");
        c2.orientation = "row"; c2.alignChildren = ["left", "center"]; c2.spacing = LO.TIGHT;
        GM.UI.lockW(c2, COL_NUM);
        var numRB = c2.add("radiobutton", undefined, "");
        numRB.value = defaultCfg.useNumber;
        numRB.helpTip = GM.L.TIP_COUNT;
        var numIn = c2.add("edittext", undefined, String(defaultCfg.number));
        numIn.preferredSize.width = 46;
        numIn.helpTip = GM.L.TIP_COUNT;

        var c3 = row.add("group");
        c3.orientation = "row"; c3.alignChildren = ["left", "center"]; c3.spacing = LO.TIGHT;
        GM.UI.lockW(c3, COL_SPC);
        var spcRB = c3.add("radiobutton", undefined, "");
        spcRB.value = !defaultCfg.useNumber;
        spcRB.helpTip = GM.L.TIP_SPACING;
        var spcIn = c3.add("edittext", undefined, String(defaultCfg.spacing));
        spcIn.preferredSize.width = 50;
        spcIn.helpTip = GM.L.TIP_SPACING;

        function setModeEnabled(state) {
            numRB.enabled = state;
            spcRB.enabled = state;
            numIn.enabled = state && numRB.value;
            spcIn.enabled = state && spcRB.value;
        }

        // Gate the value controls by the edge enable checkbox.
        function refresh() {
            setModeEnabled(cb.value);
        }

        // Explicit radio exclusivity. ScriptUI only auto-groups radio buttons
        // that are CONSECUTIVE in one container; numIn sits between numRB and
        // spcRB (separate cells), breaking the implicit group — without this,
        // clicking "Spacing" leaves numRB.value === true and gather() reports
        // count mode.
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

        refresh();

        api.panel = row;
        api.cb = cb;
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
            numRB.value = e.useNumber;
            spcRB.value = !e.useNumber;
            numIn.text = e.number;
            spcIn.text = e.spacing;
            refresh();
        };
        api.getConvertFields = function () { return [spcIn]; };
        return api;
    },

    /**
     * Hard-locks a control's width. ScriptUI does not keep sibling groups in
     * columns on its own — only identical, fully-pinned cell widths do. All
     * three dimensions are needed: without minimumSize the cell collapses below
     * preferredSize; without maximumSize a checkbox stretches it to its label.
     * @param {Object} ctrl - ScriptUI control/group.
     * @param {number} w - Locked width in px.
     */
    lockW: function (ctrl, w) {
        ctrl.preferredSize.width = w;
        ctrl.minimumSize.width = w;
        ctrl.maximumSize.width = w;
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
     * @param {Object} pathInfo - {ok, cornerCount, closed, totalLen} or {ok:false, reason}
     * @returns {Object} Dialog object with window, gatherAll, modeUI, pathUI, zonesUI
     */
    buildDialog: function (pData, pathInfo) {
        // Spacing scale — single source in GM.CONSTANTS.LAYOUT (no ad-hoc numbers).
        var LO = GM.CONSTANTS.LAYOUT;
        var dlg = new Window("dialog", GM.CONSTANTS.SCRIPT_NAME + " v" + GM.CONSTANTS.VERSION);
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.margins = LO.DIALOG;
        dlg.spacing = LO.SECTION;   // gap between panels
        dlg.preferredSize.width = 390;   // match ZSM/BRE; content grows if needed
        var defCfg = GM.Config.getDefaults();
        var sortedKeys = [];

        // =================================================================
        // Presets Panel
        // =================================================================
        var setPanel = dlg.add("panel", undefined, GM.L.SETTINGS_PANEL);
        setPanel.alignChildren = ["fill", "top"];
        setPanel.margins = LO.MARGIN;
        setPanel.spacing = LO.GROUP;

        // Row 1: label + dropdown (fills) + revert (↺), ZSM layout.
        var presetTop = setPanel.add("group");
        presetTop.alignment = ["fill", "top"];
        presetTop.spacing = LO.GROUP;
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
        presetBtns.spacing = LO.GROUP;
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
        modePanel.margins = LO.MARGIN;
        modePanel.spacing = LO.SECTION;
        var artboardRB = modePanel.add("radiobutton", undefined, GM.L.MODE_ARTBOARD);
        artboardRB.value = true;
        var pathRB = modePanel.add("radiobutton", undefined, GM.L.MODE_PATH);
        pathRB.enabled = pathOk;
        pathRB.helpTip = pathOk ? "" : GM.L.TIP_MODE_PATH_DISABLED;

        // Units — global switch lives at the top. Fill spacer pushes it right.
        var modeSpacer = modePanel.add("group");
        modeSpacer.alignment = ["fill", "center"];
        modePanel.add("statictext", undefined, GM.L.UNIT_LABEL);
        var unitsDDL = modePanel.add("dropdownlist", undefined, GM.UI.getUnitDisplayNames());
        unitsDDL.preferredSize.width = 110;
        unitsDDL.selection = 0;
        unitsDDL.helpTip = GM.L.TIP_UNITS;

        // =================================================================
        // Placement stack — Edges and Path are two modes of the SAME slot, so
        // they share one stacked container. This way the hidden panel adds no
        // extra dlg.spacing (the phantom gap above Corner zones), and it occupies
        // exactly one section gap regardless of which mode is visible.
        // =================================================================
        var placementStack = dlg.add("group");
        placementStack.orientation = "stack";
        placementStack.alignChildren = ["fill", "top"];
        placementStack.spacing = 0;
        placementStack.margins = 0;

        // =================================================================
        // Edges Panel (offsets + 4 compact edge rows, mirror inline)
        // =================================================================
        var edgesPanel = placementStack.add("panel", undefined, GM.L.EDGES_PANEL);
        edgesPanel.orientation = "column";
        edgesPanel.alignChildren = ["left", "top"];
        edgesPanel.margins = LO.MARGIN;
        edgesPanel.spacing = LO.GROUP;

        var offGrp = edgesPanel.add("group");
        offGrp.orientation = "row";
        offGrp.alignChildren = ["left", "center"];
        offGrp.spacing = LO.GROUP;
        offGrp.add("statictext", undefined, GM.L.OFFSET_LABEL);
        var gX = offGrp.add("group");
        gX.orientation = "row"; gX.alignChildren = ["left", "center"]; gX.spacing = LO.TIGHT;
        gX.add("statictext", undefined, "↔");
        var offsetXIn = gX.add("edittext", undefined, String(defCfg.offsetX));
        offsetXIn.preferredSize.width = 44;
        offsetXIn.helpTip = GM.L.TIP_OFFSET_X;
        var gY = offGrp.add("group");
        gY.orientation = "row"; gY.alignChildren = ["left", "center"]; gY.spacing = LO.TIGHT;
        gY.add("statictext", undefined, "↕");
        var offsetYIn = gY.add("edittext", undefined, String(defCfg.offsetY));
        offsetYIn.preferredSize.width = 44;
        offsetYIn.helpTip = GM.L.TIP_OFFSET_Y;

        // Mirror controls — above the rows, not inside them. Each hides the
        // opposite edge row (Bottom mirrors Top, Right mirrors Left). Both on by
        // default, matching the default bottomMirror/rightMirror.
        var mirrorGrp = edgesPanel.add("group");
        mirrorGrp.orientation = "row";
        mirrorGrp.alignChildren = ["left", "center"];
        mirrorGrp.spacing = LO.GROUP;
        mirrorGrp.add("statictext", undefined, GM.L.MIRROR_GROUP_LABEL);
        var mPair = mirrorGrp.add("group");
        mPair.orientation = "row"; mPair.alignChildren = ["left", "center"]; mPair.spacing = LO.SECTION;
        var mirrorTopCB = mPair.add("checkbox", undefined, GM.L.MIRROR_TOP);
        mirrorTopCB.value = defCfg.bottomMirror;
        mirrorTopCB.helpTip = GM.L.TIP_MIRROR_BOTTOM;
        var mirrorLeftCB = mPair.add("checkbox", undefined, GM.L.MIRROR_LEFT);
        mirrorLeftCB.value = defCfg.rightMirror;
        mirrorLeftCB.helpTip = GM.L.TIP_MIRROR_RIGHT;

        GM.UI.addSeparator(edgesPanel);

        // Column header — "Count"/"Spacing" captions sit once over the value
        // columns. Spacer width = buildEdgePanel c1 (118) + row spacing (6).
        // Header uses the SAME locked cell structure as an EdgeRow (118/84/90)
        // so captions sit over their columns. The ~18px left margin shifts each
        // caption off the radio dot and over the numeric field.
        var hdrRow = edgesPanel.add("group");
        hdrRow.orientation = "row";
        hdrRow.alignChildren = ["left", "center"];
        hdrRow.spacing = LO.GROUP;
        var h1 = hdrRow.add("group"); GM.UI.lockW(h1, 72);   // empty, but locked (= c1)
        var h2 = hdrRow.add("group"); GM.UI.lockW(h2, 78);
        h2.alignChildren = ["left", "center"]; h2.margins = [20, 0, 0, 0];
        h2.add("statictext", undefined, GM.L.EDGE_COUNT_HDR);
        var h3 = hdrRow.add("group"); GM.UI.lockW(h3, 90);
        h3.alignChildren = ["left", "center"]; h3.margins = [20, 0, 0, 0];
        h3.add("statictext", undefined, GM.L.EDGE_SPACING_HDR);

        // Rows live in one tight column group (regular spacing, no inherited
        // panel gaps) so vertical rhythm stays even as rows hide/show.
        var edgeRowsGroup = edgesPanel.add("group");
        edgeRowsGroup.orientation = "column";
        edgeRowsGroup.alignChildren = ["left", "top"];
        edgeRowsGroup.spacing = LO.GROUP;
        edgeRowsGroup.margins = 0;

        // Row order: top, bottom, left, right — pairs adjacent so the mirror
        // relationship reads top-to-bottom.
        var topUI    = GM.UI.buildEdgePanel(edgeRowsGroup, GM.L.EDGE_TOP,    defCfg.top);
        var bottomUI = GM.UI.buildEdgePanel(edgeRowsGroup, GM.L.EDGE_BOTTOM, defCfg.bottom);
        var leftUI   = GM.UI.buildEdgePanel(edgeRowsGroup, GM.L.EDGE_LEFT,   defCfg.left);
        var rightUI  = GM.UI.buildEdgePanel(edgeRowsGroup, GM.L.EDGE_RIGHT,  defCfg.right);

        // Mirror toggles hide the opposite row (collapse to zero height) and
        // relayout. Hiding keeps the row's values — gatherAll still reads them,
        // and main.js overrides them from the source edge anyway.
        function refreshMirrorRows() {
            showPanel(bottomUI.panel, !mirrorTopCB.value);
            showPanel(rightUI.panel, !mirrorLeftCB.value);
        }
        // Seed the revealed edge from its source so un-mirroring isn't a jump
        // from stale defaults. Only seeds values; the user can overwrite. (When
        // mirror is on, main.js overrides the target from the source anyway.)
        function seedFrom(srcUI, dstUI) {
            dstUI.numIn.text = srcUI.numIn.text;
            dstUI.spcIn.text = srcUI.spcIn.text;
            dstUI.numRB.value = srcUI.numRB.value;
            dstUI.spcRB.value = srcUI.spcRB.value;
            dstUI.refresh();
        }
        mirrorTopCB.onClick = function () {
            if (!mirrorTopCB.value) seedFrom(topUI, bottomUI);   // revealing Bottom
            refreshMirrorRows();
            relayoutDialog();
            onUserChange();
        };
        mirrorLeftCB.onClick = function () {
            if (!mirrorLeftCB.value) seedFrom(leftUI, rightUI);  // revealing Right
            refreshMirrorRows();
            relayoutDialog();
            onUserChange();
        };
        refreshMirrorRows();

        // =================================================================
        // Path Panel (replaces Edges in path mode)
        // =================================================================
        var pathPanel = placementStack.add("panel", undefined, GM.L.PATH_PANEL);
        pathPanel.orientation = "column";
        pathPanel.alignChildren = ["left", "top"];
        pathPanel.margins = LO.MARGIN;
        pathPanel.spacing = LO.GROUP;
        // Start collapsed (artboard is the default mode). refreshModeUI() flips
        // this; the zero maximumSize keeps the hidden panel from reserving a slot.
        pathPanel.visible = false;
        pathPanel.maximumSize.height = 0;
        pathPanel.preferredSize.height = 0;

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
        pathRow.spacing = LO.GROUP;
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
        zonesPanel.margins = LO.MARGIN;
        zonesPanel.spacing = LO.GROUP;
        var zoneCB = zonesPanel.add("checkbox", undefined, GM.L.ZONES_ENABLE);
        zoneCB.value = defCfg.cornerZone.enabled;
        zoneCB.helpTip = GM.L.TIP_ZONES;
        zonesPanel.add("statictext", undefined, GM.L.ZONES_FIRST);
        var zoneCountIn = zonesPanel.add("edittext", undefined, String(defCfg.cornerZone.count));
        zoneCountIn.preferredSize.width = 44;
        zoneCountIn.helpTip = GM.L.TIP_ZONES;
        zonesPanel.add("statictext", undefined, GM.L.ZONES_MARKS_PITCH);
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
        // A hidden panel keeps its layout slot on some Illustrator/ScriptUI
        // builds, leaving a vertical gap in the single column. Collapse the
        // hidden panel to zero height (maximumSize + preferredSize) so the
        // column reclaims the space; restore auto-height when shown.
        function showPanel(panel, shown) {
            panel.visible = shown;
            panel.maximumSize.height = shown ? 10000 : 0;
            panel.preferredSize.height = shown ? -1 : 0;
        }

        // Full window relayout after show/hide of panels or rows. Releasing the
        // edges-panel height + a resize + a second layout pass makes ScriptUI
        // actually shrink the window (one pass / panel-only layout leaves the
        // window at its old height with empty space).
        function relayoutDialog() {
            edgeRowsGroup.preferredSize.height = -1; // release the rows group (hidden mirror rows)
            edgesPanel.preferredSize.height = -1;    // release edges panel
            placementStack.preferredSize.height = -1; // release the shared mode slot
            dlg.preferredSize.height = -1;           // release window height
            dlg.layout.layout(true);                 // recompute preferred
            dlg.size = dlg.preferredSize;            // shrink the window itself
            dlg.layout.layout(true);                 // second pass settles it
        }

        function refreshModeUI() {
            var pathMode = pathRB.value;
            showPanel(edgesPanel, !pathMode);
            showPanel(pathPanel, pathMode);
            refreshZonesEnabled();
            relayoutDialog();
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
        markPanel.margins = LO.MARGIN;
        markPanel.spacing = LO.GROUP;

        var mRow1 = markPanel.add("group");
        mRow1.orientation = "row";
        mRow1.alignChildren = ["left", "center"];
        mRow1.spacing = LO.GROUP;
        mRow1.add("statictext", undefined, GM.L.MARK_SHAPE_LABEL);
        var circleCB = mRow1.add("checkbox", undefined, GM.L.MARK_CIRCLE);
        circleCB.value = defCfg.markCircle;
        circleCB.helpTip = GM.L.TIP_MARK_SHAPE;
        var crossCB = mRow1.add("checkbox", undefined, GM.L.MARK_CROSS);
        crossCB.value = defCfg.markCross;
        crossCB.helpTip = GM.L.TIP_MARK_SHAPE;
        var mShapeSpacer = mRow1.add("group");
        mShapeSpacer.alignment = ["fill", "center"];
        mRow1.add("statictext", undefined, GM.L.SIZE_LABEL);
        var sizeInput = mRow1.add("edittext", undefined, String(defCfg.markSize));
        sizeInput.preferredSize.width = 60;
        sizeInput.helpTip = GM.L.TIP_SIZE;

        var mRow2 = markPanel.add("group");
        mRow2.orientation = "row";
        mRow2.alignChildren = ["left", "center"];
        mRow2.spacing = LO.GROUP;
        mRow2.add("statictext", undefined, GM.L.REG_WEIGHT);
        var regWIn = mRow2.add("edittext", undefined, String(defCfg.regWeight));
        regWIn.preferredSize.width = 50;
        regWIn.helpTip = GM.L.TIP_REG_WEIGHT;
        mRow2.add("statictext", undefined, GM.L.HALO_WEIGHT);
        var haloWIn = mRow2.add("edittext", undefined, String(defCfg.haloWeight));
        haloWIn.preferredSize.width = 50;
        haloWIn.helpTip = GM.L.TIP_HALO_WEIGHT;


        // =================================================================
        // Copyright footer
        // =================================================================
        var grpCopy = dlg.add("group");
        grpCopy.alignment = ["fill", "top"];
        var stCopy = grpCopy.add("statictext", undefined,
            "© 2025–2026 Ladislav Osvald · v" + GM.CONSTANTS.VERSION);
        stCopy.enabled = false;

        // =================================================================
        // Footer — Reset + action buttons
        // =================================================================
        var footerGrp = dlg.add("group");
        footerGrp.alignment = ["right", "center"];
        footerGrp.spacing = LO.GROUP;

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
                bottomMirror: mirrorTopCB.value,
                rightMirror: mirrorLeftCB.value,
                units: GM.UI.getUnitKey(unitsDDL),
                markSize: parseFloat(sizeInput.text.replace(/,/g, ".")),
                markCircle: circleCB.value,
                markCross: crossCB.value,
                regWeight: parseFloat(regWIn.text.replace(/,/g, ".")),
                haloWeight: parseFloat(haloWIn.text.replace(/,/g, ".")),
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

            mirrorTopCB.value = !!s.bottomMirror;
            mirrorLeftCB.value = !!s.rightMirror;
            refreshMirrorRows();

            sizeInput.text = s.markSize;
            circleCB.value = !!s.markCircle;
            crossCB.value = !!s.markCross;
            regWIn.text = s.regWeight;
            haloWIn.text = s.haloWeight;

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
                var bottomOn = mirrorTopCB.value ? topOn : bottomUI.cb.value;
                var rightOn = mirrorLeftCB.value ? leftOn : rightUI.cb.value;
                if (!topOn && !leftOn && !bottomOn && !rightOn) allValid = false;
            }
            // 2) Marks must have at least one shape (circle and/or cross).
            if (!circleCB.value && !crossCB.value) allValid = false;

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
        var allEdits = [offsetXIn, offsetYIn, sizeInput, regWIn, haloWIn,
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
            edgeUI: { top: topUI, left: leftUI, bottom: bottomUI, right: rightUI },
            pathUI: { numRB: pathNumRB, numIn: pathNumIn, spcRB: pathSpcRB, spcIn: pathSpcIn },
            zonesUI: { enableCB: zoneCB, countIn: zoneCountIn, pitchIn: zonePitchIn }
        };
    }
};
