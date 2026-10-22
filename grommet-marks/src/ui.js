// ------------------------------------------------------------------------
// Module: GM.UI — ScriptUI dialog builder
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS, GM.L, GM.Config, GM.Core, GM.UIState, GM.Storage,
//             GM.Validation (the rules the reasons quote), GM.Numbers, GM.FieldPaint
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

        // Corner zones override Count: distributeOnSpan fills the middle of a
        // zoned edge by spacing and ignores the count. While zones are on the
        // row shows Spacing with Count greyed out; a Count choice switched
        // away that way comes back when zones are turned off.
        var countAllowed = true, forcedSpacing = false;
        function forceSpacing() {
            if (!numRB.value) return;
            forcedSpacing = true;
            numRB.value = false; spcRB.value = true;
        }

        function setModeEnabled(state) {
            numRB.enabled = state && countAllowed;
            spcRB.enabled = state;
            numIn.enabled = state && countAllowed && numRB.value;
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
                // Numbers.parse keeps "10.5" as 10.5, so the edgeCount integer
                // rule sees it, and makes a typo like "1O5" NaN instead of 1.
                number: GM.Numbers.parse(numIn.text),
                spacing: GM.Numbers.parse(spcIn.text)
            };
        };
        api.apply = function (e) {
            cb.value = e.enabled;
            numRB.value = e.useNumber;
            spcRB.value = !e.useNumber;
            numIn.text = GM.Numbers.format(e.number);
            spcIn.text = GM.Numbers.format(e.spacing);
            forcedSpacing = false;
            if (!countAllowed) forceSpacing();
            refresh();
        };
        api.setCountAllowed = function (allowed) {
            if (allowed === countAllowed) return;
            countAllowed = allowed;
            if (!allowed) {
                forceSpacing();
            } else if (forcedSpacing) {
                forcedSpacing = false;
                numRB.value = true; spcRB.value = false;
            }
            numRB.helpTip = allowed ? GM.L.TIP_COUNT : GM.L.TIP_COUNT_ZONES;
            numIn.helpTip = numRB.helpTip;
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

    /** A length for the summary line: one decimal, locale separator. */
    formatLen: function (v) {
        return String(Math.round(v * 10) / 10).replace(".", GM.L.DEC_SEP);
    },

    /**
     * The summary line under Placement (spec §8.1): what the run will mark.
     * With a drawing scale other than 1:1 the line ends with it (spec 5), and
     * the artboard is shown at real size — the dialog's values are real size,
     * so the artboard is N times what the file holds (spec 4.6).
     * @param {Object} st - {pathMode, pathInfo, docInfo, fallback, offset, unit,
     *     drawingScale}; a missing or unusable drawingScale counts as 1 (an
     *     unusable one is shown as the reason instead of this line).
     * @returns {string}
     */
    placementInfoText: function (st) {
        var L = GM.L;
        var n = (st.drawingScale > 0 && isFinite(st.drawingScale)) ? st.drawingScale : 1;
        // Shown to one decimal: the line's width is fixed by the sample with
        // 99,9 (longestInfoText), so more decimals would clip its ending. Display
        // only — the field, the run and the document keep the exact value.
        var tail = (n === 1) ? "" : L.format(L.INFO_SCALE, GM.Numbers.format(Math.round(n * 10) / 10));
        if (!st.pathMode) {
            if (st.fallback) return L.INFO_FALLBACK + tail;
            var di = st.docInfo;
            if (!di) return "";
            if (di.artboards > 1) return L.count("INFO_ARTBOARDS", di.artboards) + " · " + L.INFO_ALL_ARTBOARDS + tail;
            var f = GM.CONSTANTS.UNIT_FACTORS[st.unit] / (di.scale || 1);
            return L.count("INFO_ARTBOARDS", 1) + " · " +
                L.format(L.INFO_SIZE, GM.UI.formatLen(di.width * n / f), GM.UI.formatLen(di.height * n / f), st.unit) + tail;
        }
        var pi = st.pathInfo;
        var sharp = pi.sharpCount !== undefined ? pi.sharpCount : pi.cornerCount;
        var round = pi.roundCount || 0;
        var parts = [pi.closed ? L.PATH_INFO_CLOSED : L.PATH_INFO_OPEN];
        if (!sharp && !round) parts.push(L.PATH_INFO_NO_CORNERS);
        else if (sharp && round) parts.push(L.count("INFO_CORNERS", sharp) + ", " + L.count("INFO_ROUND_SHORT", round));
        else if (round) parts.push(L.count("INFO_ROUND", round));
        else parts.push(L.count("INFO_CORNERS", sharp));
        if (pi.closed && !sharp && !round) parts.push(L.INFO_TOP_START);
        if (!pi.closed || st.offset === 0) parts.push(L.INFO_ON_PATH);
        return parts.join(" · ") + tail;
    },

    /**
     * A field's label as a reason names it: without the colon (canon 12.1) and
     * without the unit in brackets ("Reg. tah (pt):" -> "Reg. tah"), because
     * the reason ends with the unit and says it once.
     */
    bareLabel: function (label) {
        return String(label).replace(/\s*:\s*$/, "").replace(/\s*\(pt\)\s*$/, "");
    },

    /**
     * What the reason line calls each field: the label the dialog shows, without
     * the colon. A field that shares its label says where it sits — the edge's
     * row name over the column's header, the panel's title, the arrow of the
     * offset. One list for the dialog's checks and for the width of the line.
     * @returns {Object} Name by key: scale, offsetX, offsetY, markSize, regWeight,
     *     haloWeight, zoneCount, zonePitch, pathNumber, pathSpacing, pathOffset,
     *     and <edge>Count, <edge>Spacing for top, left, bottom, right.
     */
    reasonLabels: function () {
        var L = GM.L, bare = GM.UI.bareLabel;
        var offset = bare(L.OFFSET_LABEL);
        var out = {
            scale: L.SCALE_FIELD,   // the label ends in "1:", so the field has a name of its own
            offsetX: offset + " ↔",
            offsetY: offset + " ↕",
            markSize: bare(L.SIZE_LABEL),
            regWeight: bare(L.REG_WEIGHT),
            haloWeight: bare(L.HALO_WEIGHT),
            zoneCount: L.ZONES_PANEL + " — " + bare(L.ZONES_COUNT),
            zonePitch: L.ZONES_PANEL + " — " + bare(L.ZONES_PITCH),
            pathNumber: bare(L.COUNT),
            pathSpacing: bare(L.SPACING),
            pathOffset: offset
        };
        var edges = { top: L.EDGE_TOP, left: L.EDGE_LEFT, bottom: L.EDGE_BOTTOM, right: L.EDGE_RIGHT };
        for (var k in edges) {
            if (!edges.hasOwnProperty(k)) continue;
            out[k + "Count"] = edges[k] + " — " + L.EDGE_COUNT_HDR;
            out[k + "Spacing"] = edges[k] + " — " + L.EDGE_SPACING_HDR;
        }
        return out;
    },

    /**
     * Why Generate is grey, in words (spec 5; canon 12.3), without the symbol.
     * The order: one wrong field by name, several by count, then the two
     * structural reasons — the numbers are fine but nothing would be made.
     * @param {Object} st - {invalid: [{label, rule, unit}], noShape, noEdge};
     *     the unit comes with its space (" mm", " pt"), "" for counts.
     * @returns {string} The reason, or "" when nothing blocks.
     */
    blockReason: function (st) {
        var L = GM.L, bad = st.invalid || [];
        if (bad.length === 1) {
            var f = bad[0], lo = GM.Numbers.format(f.rule.min), hi = GM.Numbers.format(f.rule.max);
            return f.rule.integer
                ? L.format(L.REASON_FIELD_INT, f.label, lo, hi)
                : L.format(L.REASON_FIELD, f.label, lo, hi, f.unit);
        }
        if (bad.length > 1) return L.format(L.REASON_MANY, bad.length);
        if (st.noShape) return L.REASON_NO_SHAPE;
        if (st.noEdge) return L.REASON_NO_EDGE;
        return "";
    },

    /**
     * The longest text the line can show — its width is fixed by the first
     * text: the findings with the drawing scale at their end (spec 5), and the
     * reasons (spec 5) at their worst: every label with the widest limits of
     * the rules, in the longest unit.
     */
    longestInfoText: function () {
        var L = GM.L;
        var tail = L.format(L.INFO_SCALE, GM.Numbers.format(99.9));
        var samples = [
            L.INFO_FALLBACK + tail,
            [L.PATH_INFO_CLOSED, L.count("INFO_CORNERS", 99) + ", " + L.count("INFO_ROUND_SHORT", 99), L.INFO_ON_PATH].join(" · ") + tail,
            [L.PATH_INFO_CLOSED, L.PATH_INFO_NO_CORNERS, L.INFO_TOP_START, L.INFO_ON_PATH].join(" · ") + tail,
            L.count("INFO_ARTBOARDS", 1) + " · " + L.format(L.INFO_SIZE, "99999,9", "99999,9", "mm") + tail,
            L.count("INFO_ARTBOARDS", 99) + " · " + L.INFO_ALL_ARTBOARDS + tail,
            L.REASON_MARK + L.format(L.REASON_MANY, 99),
            L.REASON_MARK + L.REASON_NO_SHAPE,
            L.REASON_MARK + L.REASON_NO_EDGE
        ];
        var rules = GM.Validation.rules, lo = "", hi = "";
        for (var r in rules) {
            if (!rules.hasOwnProperty(r)) continue;
            var rmin = GM.Numbers.format(rules[r].min), rmax = GM.Numbers.format(rules[r].max);
            if (rmin.length > lo.length) lo = rmin;
            if (rmax.length > hi.length) hi = rmax;
        }
        var labels = GM.UI.reasonLabels();
        for (var key in labels) {
            if (!labels.hasOwnProperty(key)) continue;
            samples.push(L.REASON_MARK + L.format(L.REASON_FIELD, labels[key], lo, hi, " mm"));
            samples.push(L.REASON_MARK + L.format(L.REASON_FIELD_INT, labels[key], lo, hi));
        }
        var longest = "";
        for (var i = 0; i < samples.length; i++) {
            if (samples[i].length > longest.length) longest = samples[i];
        }
        return longest;
    },

    /**
     * Builds the main ScriptUI dialog (canonical single column).
     * @param {Object} pData - Preset wrapper {activePreset, presets}
     * @param {Object} pathInfo - getSelectedPathInfo() result: {ok, closed, cornerCount,
     *     sharpCount, roundCount, partial, ...} or {ok:false, reason}
     * @param {Object} [docInfo] - getDocInfo() result {artboards, width, height, scale,
     *     drawingScale}; feeds the summary line in artboard mode and the starting
     *     value of the drawing scale field (missing: 1).
     * @returns {Object} Dialog object with window, gatherAll, getRunOptions
     *     (per-run choices not stored in presets: {pathPartial, drawingScale}),
     *     modeUI (with infoLbl — the finding — reasonLbl — why Generate is grey —
     *     and scaleIn), edgeUI, pathUI (with offsetIn, partialCB), zonesUI
     */
    buildDialog: function (pData, pathInfo, docInfo) {
        // Spacing scale — single source in GM.CONSTANTS.LAYOUT (no ad-hoc numbers).
        var LO = GM.CONSTANTS.LAYOUT;
        var dlg = new Window("dialog", GM.CONSTANTS.SCRIPT_NAME + " v" + GM.CONSTANTS.VERSION);
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.margins = LO.DIALOG;
        dlg.spacing = LO.SECTION;   // gap between panels
        // No width is set here on purpose. The layout manager overwrites a
        // container's preferredSize (measured: 390 in -> 312px window out), so
        // the line that used to sit here did nothing. Width comes from the
        // alignChildren "fill" above, cascading to the widest panel.
        var defCfg = GM.Config.getDefaults();
        var sortedKeys = [];

        // =================================================================
        // Presets Panel
        // =================================================================
        var setPanel = dlg.add("panel", undefined, GM.L.SETTINGS_PANEL);
        setPanel.alignChildren = ["fill", "top"];
        setPanel.margins = LO.MARGIN;
        setPanel.spacing = LO.GROUP;

        // Row 1: label + dropdown (fills) + revert (↺), canon 9. ↺ is in a group
        // of its own: ScriptUI shares a row's slack among ALL its controls, so a
        // bare button would grow with the list. 30 px is the canon's one
        // allowed deviation (a single glyph; the native width dwarfs the row).
        var presetTop = setPanel.add("group");
        presetTop.alignment = ["fill", "top"];
        presetTop.spacing = LO.GROUP;
        presetTop.add("statictext", undefined, GM.L.LOAD);
        var loadDDL = presetTop.add("dropdownlist", undefined, []);
        loadDDL.alignment = ["fill", "center"];
        loadDDL.helpTip = GM.L.TIP_PRESET_LOAD;
        var revertGrp = presetTop.add("group");
        revertGrp.alignment = ["right", "center"];
        var revertBtn = revertGrp.add("button", undefined, "↺");
        revertBtn.preferredSize = [30, 24];
        revertBtn.helpTip = GM.L.TIP_REVERT;
        revertBtn.enabled = false;

        // Row 2: Save / Save As / Delete, right-aligned, at native widths
        // (the 92 px of 1.3.0 was too narrow for "Uložit jako…").
        var presetBtns = setPanel.add("group");
        presetBtns.alignment = ["right", "top"];
        presetBtns.spacing = LO.GROUP;
        var saveBtn = presetBtns.add("button", undefined, GM.L.SAVE);
        saveBtn.helpTip = GM.L.TIP_SAVE || "";
        var saveAsBtn = presetBtns.add("button", undefined, GM.L.BTN_SAVE_AS);
        saveAsBtn.helpTip = GM.L.TIP_SAVE_AS;
        var deleteBtn = presetBtns.add("button", undefined, GM.L.DELETE);
        deleteBtn.helpTip = GM.L.TIP_DELETE;
        deleteBtn.enabled = false;

        // =================================================================
        // Placement Panel (artboard edges vs selected path)
        // =================================================================
        var pathOk = !!(pathInfo && pathInfo.ok);
        var modePanel = dlg.add("panel", undefined, GM.L.PLACEMENT_PANEL);
        modePanel.orientation = "column";
        modePanel.alignChildren = ["fill", "top"];
        modePanel.margins = LO.MARGIN;
        modePanel.spacing = LO.GROUP;
        var modeRow = modePanel.add("group");
        modeRow.orientation = "row";
        modeRow.alignChildren = ["left", "center"];
        modeRow.spacing = LO.SECTION;
        var artboardRB = modeRow.add("radiobutton", undefined, GM.L.MODE_ARTBOARD);
        artboardRB.value = true;
        var pathRB = modeRow.add("radiobutton", undefined, GM.L.MODE_PATH);
        pathRB.enabled = pathOk;
        // Say why the mode is unavailable: customer contours often arrive as a
        // group or a compound path, and "select a path" would not help there.
        var pathReasonTips = {
            "no-selection": GM.L.ERR_PATH_NO_SELECTION,
            "not-a-path":   GM.L.ERR_PATH_NOT_A_PATH,
            "too-short":    GM.L.ERR_PATH_TOO_SHORT
        };
        pathRB.helpTip = pathOk ? "" : (pathReasonTips[pathInfo && pathInfo.reason] || GM.L.ERR_PATH_NOT_A_PATH);

        // Row 2 (spec 4.4): Units — the global switch — and the drawing scale
        // 1:N. Each pair is a group of its own (label -> control is GROUP), the
        // pairs are SECTION apart. The scale starts as the document remembers it
        // (1 for a document without one); it is the document's, not a setting:
        // no preset holds it, switching units or presets leaves it alone, and it
        // is not among the fields unitsDDL.onChange converts.
        var unitRow = modePanel.add("group");
        unitRow.orientation = "row";
        unitRow.alignChildren = ["left", "center"];
        unitRow.spacing = LO.SECTION;
        var unitGrp = unitRow.add("group");
        unitGrp.orientation = "row";
        unitGrp.alignChildren = ["left", "center"];
        unitGrp.spacing = LO.GROUP;
        unitGrp.add("statictext", undefined, GM.L.UNIT_LABEL);
        var unitsDDL = unitGrp.add("dropdownlist", undefined, GM.UI.getUnitDisplayNames());
        unitsDDL.preferredSize.width = 110;
        unitsDDL.selection = 0;
        unitsDDL.helpTip = GM.L.TIP_UNITS;
        var scaleGrp = unitRow.add("group");
        scaleGrp.orientation = "row";
        scaleGrp.alignChildren = ["left", "center"];
        scaleGrp.spacing = LO.GROUP;
        var scaleLbl = scaleGrp.add("statictext", undefined, GM.L.SCALE_LABEL);
        scaleLbl.helpTip = GM.L.TIP_SCALE;
        var startScale = (docInfo && docInfo.drawingScale > 0) ? docInfo.drawingScale : 1;
        var scaleIn = scaleGrp.add("edittext", undefined, GM.Numbers.format(startScale));
        scaleIn.preferredSize.width = 50;
        scaleIn.helpTip = GM.L.TIP_SCALE;

        // What the run will mark, in words (spec §8.1), or why Generate is grey
        // (canon 12.3): two statictexts in one stack, exactly one of them
        // visible (ruling R15). The text changes while the dialog is open and a
        // ScriptUI label keeps its first width, so both start as the longest text
        // either can hold (extendscript-ui-standards §4) and the stack keeps the
        // footprint of the one label it replaced.
        //  - placeInfo, the finding: disabled and NEVER painted — the native greyed
        //    look it had in 1.3.0. A custom pen on a disabled statictext is
        //    unmeasured, and Illustrator reads a control's own pen back as null
        //    before show(), so painting it would give it the FALLBACK grey.
        //  - placeReason, the reason: enabled so the colour shows, painted ERR once,
        //    here; it only ever shows reasons, so there is nothing to give back.
        var infoStack = modePanel.add("group");
        infoStack.orientation = "stack";
        infoStack.alignChildren = ["fill", "top"];
        infoStack.spacing = 0;
        infoStack.margins = 0;
        var placeInfo = infoStack.add("statictext", undefined, GM.UI.longestInfoText());
        placeInfo.enabled = false;
        var placeReason = infoStack.add("statictext", undefined, GM.UI.longestInfoText());
        GM.FieldPaint.text(placeReason, "ERR");
        placeReason.visible = false;

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

        var pathClosed = pathOk && !!pathInfo.closed;
        var pathOffRow = pathPanel.add("group");
        pathOffRow.orientation = "row";
        pathOffRow.alignChildren = ["left", "center"];
        pathOffRow.spacing = LO.GROUP;
        pathOffRow.add("statictext", undefined, GM.L.OFFSET_LABEL);
        var pathOffsetIn = pathOffRow.add("edittext", undefined, String(defCfg.pathOffset));
        pathOffsetIn.preferredSize.width = 44;     // as the artboard offsets
        pathOffsetIn.enabled = pathClosed;
        pathOffsetIn.helpTip = pathClosed ? GM.L.TIP_PATH_OFFSET : GM.L.TIP_PATH_OFFSET_OPEN;

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
        if (hasCorners) pathNumRB.helpTip = GM.L.TIP_PATH_COUNT_DISABLED;
        var pathCountTip = pathNumRB.helpTip;   // what Count says when it is selectable

        // "Count" means the number of marks. On a SMOOTH path the user picks it.
        // On a CORNERED path the corners dictate it, so the field shows the
        // computed value (= corner count, read-only) and marks land on the
        // corners only — no span filling.
        function refreshPathDistUI() {
            var numMode = pathNumRB.value;
            if (hasCorners && numMode) {
                pathNumIn.text = pathInfo.cornerCount;
                pathNumIn.enabled = false;      // computed, not editable
            } else {
                pathNumIn.enabled = numMode;
            }
            pathSpcIn.enabled = !numMode;
        }

        pathNumRB.onClick = function () {
            pathNumRB.value = true; pathSpcRB.value = false;
            refreshPathDistUI();
            refreshZonesEnabled();   // corners-only ⇒ zones make no sense
            onUserChange();
        };
        pathSpcRB.onClick = function () {
            pathSpcRB.value = true; pathNumRB.value = false;
            refreshPathDistUI();
            refreshZonesEnabled();
            onUserChange();
        };
        refreshPathDistUI();

        // Part of the outline (spec §5.4): offered only for a direct selection
        // with whole segments; off on every run and never stored, so a direct
        // selection left over from editing changes nothing.
        var part = (pathOk && pathInfo.partial) ? pathInfo.partial : { state: "none" };
        var partialLabel = GM.L.PATH_PARTIAL;
        if (part.state === "runs") partialLabel += GM.L.format(GM.L.PATH_PARTIAL_COUNT, part.selectedSegs, part.totalSegs);
        var partialCB = pathPanel.add("checkbox", undefined, partialLabel);
        partialCB.value = false;
        partialCB.enabled = part.state === "runs";
        if (part.state === "runs") partialCB.helpTip = GM.L.TIP_PARTIAL;
        else if (part.state === "lone") partialCB.helpTip = GM.L.TIP_PARTIAL_LONE;
        else partialCB.helpTip = GM.L.TIP_PARTIAL_NONE;

        // A run is marked like an open path, so Count would give only its ends
        // and inner corners (spec §5.3) — not the number the field promises.
        // While the box applies (ticked, path mode) the row is Spacing and
        // Count is greyed out, like Count on the edges under corner zones; a
        // Count choice switched away that way comes back when the box stops
        // applying (unticked, or artboard mode).
        var pathCountAllowed = true, pathForcedSpacing = false;
        function partialApplies() {
            return pathRB.value && partialCB.enabled && partialCB.value;
        }
        function forcePathSpacing() {
            if (!pathNumRB.value) return;
            pathForcedSpacing = true;
            pathNumRB.value = false; pathSpcRB.value = true;
        }
        function syncPathCountAllowed() {
            var allowed = !partialApplies();
            if (allowed === pathCountAllowed) return;
            pathCountAllowed = allowed;
            if (!allowed) {
                forcePathSpacing();
            } else if (pathForcedSpacing) {
                pathForcedSpacing = false;
                pathNumRB.value = true; pathSpcRB.value = false;
            }
            pathNumRB.enabled = allowed;
            pathNumRB.helpTip = allowed ? pathCountTip : GM.L.TIP_PATH_COUNT_PARTIAL;
            pathNumIn.helpTip = allowed ? GM.L.TIP_COUNT : GM.L.TIP_PATH_COUNT_PARTIAL;
            refreshPathDistUI();
        }
        partialCB.onClick = function () {
            syncPathCountAllowed();
            refreshZonesEnabled();   // Spacing on a cornered path allows zones again
            onUserChange();
        };

        var fallback = false;   // the preset asked for a path that is not there

        // What keeps Generate grey, as liveValidateAll() last found it:
        // {invalid: [{label, rule, unit}], noShape, noEdge}.
        var blockedBy = { invalid: [], noShape: false, noEdge: false };

        // The one place that decides the line under Placement (canon 12.3): why
        // Generate is grey, in the error colour, while it is; else what the
        // script found, grey. Exactly one of the two labels is visible; the
        // finding is never painted (see where they are made). liveValidateAll()
        // calls this last, so no later step can put the finding over a reason.
        function refreshInfo() {
            var reason = GM.UI.blockReason(blockedBy);
            if (reason) {
                placeReason.text = GM.L.REASON_MARK + reason;
                placeReason.visible = true;
                placeInfo.visible = false;
                return;
            }
            placeInfo.text = GM.UI.placementInfoText({
                pathMode: pathRB.value, pathInfo: pathInfo, docInfo: docInfo, fallback: fallback,
                offset: GM.Numbers.parse(pathOffsetIn.text),
                unit: currentUnit || GM.CONSTANTS.UNIT.MM,
                drawingScale: GM.Numbers.parse(scaleIn.text)
            });
            placeInfo.visible = true;
            placeReason.visible = false;
        }

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
            // In path mode zones need corners; and with count mode on a cornered
            // path the marks ARE the corners, so there is nothing to densify.
            var cornersOnly = pathMode && hasCorners && pathNumRB.value;
            var zonesPossible = (!pathMode || hasCorners) && !cornersOnly;
            zoneCB.enabled = zonesPossible;
            var zoneTip = GM.L.TIP_ZONES;
            if (!zonesPossible) zoneTip = cornersOnly ? GM.L.TIP_ZONES_CORNERS_ONLY : GM.L.TIP_ZONES_NO_CORNERS;
            zoneCB.helpTip = zoneTip;
            var fieldsOn = zonesPossible && zoneCB.value;
            zoneCountIn.enabled = fieldsOn;
            zonePitchIn.enabled = fieldsOn;
            // Zones on the artboard edges replace Count by Spacing.
            var countOnEdges = pathMode || !fieldsOn;
            topUI.setCountAllowed(countOnEdges);
            bottomUI.setCountAllowed(countOnEdges);
            leftUI.setCountAllowed(countOnEdges);
            rightUI.setCountAllowed(countOnEdges);
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
            syncPathCountAllowed();
            refreshZonesEnabled();
            relayoutDialog();
            onUserChange();
        }
        artboardRB.onClick = function () { fallback = false; pathRB.value = false; artboardRB.value = true; refreshModeUI(); };
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
                offsetX: GM.Numbers.parse(offsetXIn.text),
                offsetY: GM.Numbers.parse(offsetYIn.text),
                top: topUI.gather(),
                left: leftUI.gather(),
                bottom: bottomUI.gather(),
                right: rightUI.gather(),
                bottomMirror: mirrorTopCB.value,
                rightMirror: mirrorLeftCB.value,
                units: GM.UI.getUnitKey(unitsDDL),
                markSize: GM.Numbers.parse(sizeInput.text),
                markCircle: circleCB.value,
                markCross: crossCB.value,
                regWeight: GM.Numbers.parse(regWIn.text),
                haloWeight: GM.Numbers.parse(haloWIn.text),
                placementMode: pathRB.value ? GM.CONSTANTS.MODE_PATH : GM.CONSTANTS.MODE_ARTBOARD,
                cornerZone: {
                    // Effective state: a checked-but-disabled box (zones are
                    // impossible in the current mode) must report false, or
                    // validate() would check count/pitch fields that live
                    // validation skipped as disabled — OK enabled, submit alerts.
                    enabled: zoneCB.value && zoneCB.enabled,
                    count: GM.Numbers.parse(zoneCountIn.text),
                    pitch: GM.Numbers.parse(zonePitchIn.text)
                },
                pathDist: {
                    useNumber: pathNumRB.value,
                    number: GM.Numbers.parse(pathNumIn.text),
                    spacing: GM.Numbers.parse(pathSpcIn.text)
                },
                pathOffset: GM.Numbers.parse(pathOffsetIn.text)
            };
        }

        function applyAll(s) {
            GM.UI.selectUnit(unitsDDL, s.units || GM.CONSTANTS.UNIT.MM);
            currentUnit = s.units || GM.CONSTANTS.UNIT.MM;

            offsetXIn.text = GM.Numbers.format(s.offsetX);
            offsetYIn.text = GM.Numbers.format(s.offsetY);

            topUI.apply(s.top);
            leftUI.apply(s.left);
            bottomUI.apply(s.bottom);
            rightUI.apply(s.right);

            mirrorTopCB.value = !!s.bottomMirror;
            mirrorLeftCB.value = !!s.rightMirror;
            refreshMirrorRows();

            sizeInput.text = GM.Numbers.format(s.markSize);
            circleCB.value = !!s.markCircle;
            crossCB.value = !!s.markCross;
            regWIn.text = GM.Numbers.format(s.regWeight);
            haloWIn.text = GM.Numbers.format(s.haloWeight);

            var wantPath = (s.placementMode === GM.CONSTANTS.MODE_PATH);
            fallback = wantPath && !pathOk;
            if (fallback) wantPath = false;
            pathRB.value = wantPath; artboardRB.value = !wantPath;

            var z = s.cornerZone || defCfg.cornerZone;
            zoneCB.value = !!z.enabled;
            zoneCountIn.text = GM.Numbers.format(z.count);
            zonePitchIn.text = GM.Numbers.format(z.pitch);

            var pd = s.pathDist || defCfg.pathDist;
            // Count mode is valid on a cornered path too (marks = corners); the
            // stored number is document-dependent, so refreshPathDistUI()
            // recomputes it from the current path.
            var pdUseNum = !!pd.useNumber;
            pathNumRB.value = pdUseNum; pathSpcRB.value = !pdUseNum;
            pathNumIn.text = GM.Numbers.format(pd.number);
            pathSpcIn.text = GM.Numbers.format(pd.spacing);
            pathForcedSpacing = false;
            if (!pathCountAllowed) forcePathSpacing();
            // Only a finite number goes into the field: NaN reaches a stored
            // preset as null, and an empty greyed field cannot be fixed.
            pathOffsetIn.text = GM.Numbers.format((typeof s.pathOffset === "number" && isFinite(s.pathOffset))
                ? s.pathOffset : defCfg.pathOffset);
            refreshPathDistUI();

            refreshModeUI();
        }

        // =================================================================
        // Unit Conversion
        // =================================================================
        var currentUnit = GM.CONSTANTS.UNIT.MM;
        unitsDDL.onChange = function () {
            var newUnit = GM.UI.getUnitKey(unitsDDL);
            if (newUnit === currentUnit) return;
            var fields = [offsetXIn, offsetYIn, sizeInput, zonePitchIn, pathSpcIn, pathOffsetIn]
                .concat(topUI.getConvertFields())
                .concat(leftUI.getConvertFields())
                .concat(bottomUI.getConvertFields())
                .concat(rightUI.getConvertFields());

            for (var i = 0; i < fields.length; i++) {
                var v = GM.Numbers.parse(fields[i].text);
                if (!isNaN(v)) {
                    fields[i].text = GM.Numbers.format(GM.Core.round(GM.Core.convertVal(v, currentUnit, newUnit)));
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
        // `mode` marks a field as belonging to one placement mode only; it is
        // skipped while the other mode is active (its panel is hidden, and
        // GM.Validation.validate() ignores it on submit too). Untagged fields
        // (mark size, weights, corner zones) apply to both modes.
        // `mirrored()` marks the fields of an edge row that its mirror box hides
        // (Bottom follows Top, Right follows Left): validate() does not check
        // them, so neither does this, and the reason never names a row that
        // cannot be seen.
        // `label` names the field in the reason on the placement line; `unit` is
        // the dialog's length unit (LEN), " pt" for the strokes, "" for counts.
        var RL = GM.UI.reasonLabels();
        var LEN = "len", PT = " pt";
        /** @type {Object[]} {et, rule, mode, label, unit, mirrored} */
        var validationTargets = [
            // The drawing scale applies to both modes (no `mode`) and is always enabled.
            { et: scaleIn,     rule: R.drawingScale,                  label: RL.scale,       unit: "" },
            { et: offsetXIn,   rule: R.offsetX,     mode: "artboard", label: RL.offsetX,     unit: LEN },
            { et: offsetYIn,   rule: R.offsetY,     mode: "artboard", label: RL.offsetY,     unit: LEN },
            { et: sizeInput,   rule: R.markSize,                      label: RL.markSize,    unit: LEN },
            { et: regWIn,      rule: R.regWeight,                     label: RL.regWeight,   unit: PT },
            { et: haloWIn,     rule: R.haloWeight,                    label: RL.haloWeight,  unit: PT },
            { et: zoneCountIn, rule: R.cornerCount,                   label: RL.zoneCount,   unit: "" },
            { et: zonePitchIn, rule: R.cornerPitch,                   label: RL.zonePitch,   unit: LEN },
            { et: pathNumIn,   rule: R.pathNumber,  mode: "path",     label: RL.pathNumber,  unit: "" },
            { et: pathSpcIn,   rule: R.pathSpacing, mode: "path",     label: RL.pathSpacing, unit: LEN },
            { et: pathOffsetIn, rule: R.pathOffset, mode: "path",     label: RL.pathOffset,  unit: LEN }
        ];
        var edgeUIs = [topUI, leftUI, bottomUI, rightUI];
        var edgeKeys = ["top", "left", "bottom", "right"];
        var edgeMirrored = [null, null,
            function () { return mirrorTopCB.value; },
            function () { return mirrorLeftCB.value; }];
        for (var vt = 0; vt < edgeUIs.length; vt++) {
            validationTargets.push({ et: edgeUIs[vt].numIn, rule: R.edgeCount, mode: "artboard",
                label: RL[edgeKeys[vt] + "Count"], unit: "", mirrored: edgeMirrored[vt] });
            validationTargets.push({ et: edgeUIs[vt].spcIn, rule: R.edgeSpacing, mode: "artboard",
                label: RL[edgeKeys[vt] + "Spacing"], unit: LEN, mirrored: edgeMirrored[vt] });
        }

        function fieldInRange(et, rule) {
            var n = GM.Numbers.parse(et.text);
            if (isNaN(n)) return false;
            if (rule.integer && n !== Math.floor(n)) return false;
            return n >= rule.min && n <= rule.max;
        }

        // The numbers of the fields this check looks at are fine — the active
        // mode's, the enabled ones. Save and Save As follow it (a preset never
        // stores what the next opening cannot read, canon 12.4); Generate also
        // needs the structure below (ruling R1). Set by liveValidateAll(), which
        // runs before refreshModifiedIndicator() reads it.
        var numbersOk = true;

        function liveValidateAll() {
            // Only the ACTIVE placement mode's fields gate OK. The inactive
            // mode's panel is hidden, so validating it would grey out Generate
            // with the offending field off-screen — and validate() skips it on
            // submit anyway, making live validation stricter than the real one.
            var mode = pathRB.value ? "path" : "artboard";
            var invalid = [];
            for (var i = 0; i < validationTargets.length; i++) {
                var t = validationTargets[i];
                if (!t.et) continue;
                if (t.mode && t.mode !== mode) { GM.FieldPaint.field(t.et, true); continue; }
                if (!t.et.enabled || (t.mirrored && t.mirrored())) { GM.FieldPaint.field(t.et, true); continue; }
                var ok = fieldInRange(t.et, t.rule);
                GM.FieldPaint.field(t.et, ok);
                if (!ok) {
                    invalid.push({
                        label: t.label, rule: t.rule,
                        unit: t.unit === LEN ? " " + (currentUnit || GM.CONSTANTS.UNIT.MM) : t.unit
                    });
                }
            }
            var fieldsOk = invalid.length === 0;

            // Structural checks (mirror GM.Validation.validate) so OK greys out
            // for these too, not just numeric ranges. These have no single field
            // to paint, so they gate the button and give the reason on the line.
            // 1) At least one effective edge enabled (artboard mode only).
            var noEdge = false;
            if (!pathRB.value) {
                var topOn = topUI.cb.value;
                var leftOn = leftUI.cb.value;
                var bottomOn = mirrorTopCB.value ? topOn : bottomUI.cb.value;
                var rightOn = mirrorLeftCB.value ? leftOn : rightUI.cb.value;
                noEdge = !topOn && !leftOn && !bottomOn && !rightOn;
            }
            // 2) Marks must have at least one shape (circle and/or cross).
            var noShape = !circleCB.value && !crossCB.value;

            numbersOk = fieldsOk;
            try { okBtn.enabled = fieldsOk && !noEdge && !noShape; } catch (e) {}
            blockedBy = { invalid: invalid, noShape: noShape, noEdge: noEdge };
            refreshInfo();   // last: the line follows the button
            return numbersOk;
        }

        // =================================================================
        // Shared change hook — modified indicator + validation
        // =================================================================
        function onUserChange() {
            liveValidateAll();               // sets numbersOk and the line under Placement
            refreshModifiedIndicator();
        }

        // Edge panels notify on any internal change.
        topUI.onChange    = onUserChange;
        leftUI.onChange   = onUserChange;
        bottomUI.onChange = onUserChange;
        rightUI.onChange  = onUserChange;


        // =================================================================
        // Preset Handlers (delegating to GM.UIState)
        // =================================================================
        // What the dialog holds, for comparing with the active preset. With the
        // checked fields valid, a typo left in a field nobody checks (the other
        // mode, a disabled edge) counts as the default it would be saved as:
        // otherwise Save would store that default and the preset would still
        // look changed. With a checked field invalid the raw values are
        // compared, so the typo is a change and ↺ takes it back.
        function currentValues() {
            var raw = gatherAll();
            return numbersOk ? GM.Validation.storable(raw) : raw;
        }

        /**
         * Asterisk and button states after any change. Relabels every item of
         * the list, not only the active one: switching away from an edited
         * preset would otherwise leave its asterisk behind (canon 12.4,
         * tile-export refreshModifiedIndicator).
         */
        function refreshModifiedIndicator() {
            var modified = false, entries = [];
            try {
                var now = currentValues();
                modified = GM.UIState.isModified(pData, now);
                entries = GM.UIState.formatPresetList(pData, now, GM.L);
            } catch (e) { modified = false; }
            try { revertBtn.enabled = modified; } catch (e) {}
            try { saveBtn.enabled = modified && numbersOk; } catch (e) {}
            try { saveAsBtn.enabled = numbersOk; } catch (e) {}

            // The list holds the same keys in the same order as the entries
            // (updatePresetList builds both from formatPresetList).
            for (var j = 0; j < entries.length && j < loadDDL.items.length; j++) {
                if (entries[j].key !== sortedKeys[j]) continue;
                try {
                    if (loadDDL.items[j].text !== entries[j].displayText) loadDDL.items[j].text = entries[j].displayText;
                } catch (e) {
                    updatePresetList();
                    return;
                }
            }
        }

        function updatePresetList() {
            loadDDL.removeAll();
            var entries = GM.UIState.formatPresetList(pData, currentValues(), GM.L);
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

        // A preset stores GM.Validation.storable(): numbers the next opening
        // can read (Save and Save As are grey while a checked field is invalid;
        // what is left over is in the fields nobody checks).
        saveBtn.onClick = function () {
            var r = GM.UIState.save(pData, GM.Validation.storable(gatherAll()));
            if (r.ok) {
                refreshModifiedIndicator();
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
            var r = GM.UIState.saveAs(pData, raw, GM.Validation.storable(gatherAll()), function (name) {
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
        var allEdits = [scaleIn, offsetXIn, offsetYIn, sizeInput, regWIn, haloWIn,
                        zoneCountIn, zonePitchIn, pathNumIn, pathSpcIn, pathOffsetIn];
        for (var ei = 0; ei < allEdits.length; ei++) {
            if (!allEdits[ei]) continue;
            allEdits[ei].onChange = onUserChange;
            allEdits[ei].onChanging = onUserChange;
        }
        circleCB.onClick = onUserChange;
        crossCB.onClick = onUserChange;

        // Initial pass: live validation (paints fields, sets OK initial state,
        // numbersOk and the line under Placement) + modified indicator (Save
        // disabled when UI matches the active preset).
        liveValidateAll();
        refreshModifiedIndicator();

        return {
            window: dlg,
            gatherAll: gatherAll,
            getRunOptions: function () {
                // drawingScale: the field as a number (NaN while it is wrong —
                // Generate is grey then, and run() refuses it again).
                return { pathPartial: partialApplies(), drawingScale: GM.Numbers.parse(scaleIn.text) };
            },
            modeUI: { artboardRB: artboardRB, pathRB: pathRB, infoLbl: placeInfo, reasonLbl: placeReason, scaleIn: scaleIn },
            edgeUI: { top: topUI, left: leftUI, bottom: bottomUI, right: rightUI },
            pathUI: { numRB: pathNumRB, numIn: pathNumIn, spcRB: pathSpcRB, spcIn: pathSpcIn,
                      offsetIn: pathOffsetIn, partialCB: partialCB },
            zonesUI: { enableCB: zoneCB, countIn: zoneCountIn, pitchIn: zonePitchIn }
        };
    }
};
