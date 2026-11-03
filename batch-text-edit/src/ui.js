// ------------------------------------------------------------------------
// Module: BTE.UI — the dialog: presets, range and order, the step chain with
//         its editor, the live preview
// Part of: Illustrator Batch Text Edit
// Depends on: BTE.L, BTE.Config, BTE.Utils, BTE.Storage, BTE.UIState,
//             BTE.FieldPaint, BTE.Vars, BTE.Steps, BTE.Scope, BTE.UIModel
//
// The texts are read from the document once, when the dialog opens and when
// the Rozsah changes (BTE.Scope.prepare); a new Pořadí only re-sorts them
// (BTE.Scope.reorder). Every other change reruns BTE.Steps.run over plain
// strings (spec 6.2). What the dialog says comes from BTE.UIModel and BTE.L,
// so this module wires controls to them and builds no text of its own. The
// pure helpers at the top are tested in Node (tests/test_ui.js); build() is
// measured headless by tests/probes/probe_dialog.jsx.
// ------------------------------------------------------------------------
var BTE = BTE || {};

BTE.UI = {
    // Shared metrics — the dialog's layout values in one place.
    // Every entry is a [deviation] from native sizing and says why.
    M: {
        // px; the preset list's own width before its row stretches it. A
        // dropdown grows with its longest item, and a long preset name once
        // widened tile-export's dialog by 137 px (engine-facts, row slack).
        PRESET_LIST: 100,
        // px; ↺, +, −, ↑, ↓: one glyph each, the native 80 px dwarfs its row
        GLYPH_BTN: 30,
        // px; floor of the step list, width and height. The width keeps a
        // step label readable when the preview is narrow; the height shows
        // six steps (14 + 20 px per row, engine-facts listbox) and the list
        // stretches to the editor beside it.
        STEP_LIST: [300, 134],
        // px; the Kde dropdowns. Their items are variable names from the
        // document, and a dropdown grows with its longest item: a long name
        // would widen the dialog. Fixed, a long name is cut in the list only.
        WHERE_DD: 220,
        TEXT_CHARS: 24,   // characters; Jiný text, Regulární výraz, Nahradit
        NUM_CHARS: 7,     // characters; the number fields (-100000 fits)
        // px; three lines of messages show, the rest scrolls (tile-export's
        // details box: 58 px for three lines, measured 2026-10-15)
        MSG_H: 58,
        // px; the preview's columns: #, Původní, Po vybraném kroku, Nový.
        // "240" fits 40; the three text columns share the dialog's width.
        PREVIEW_COLS: [40, 300, 300, 300],
        // px; the preview shows its header and eight rows and scrolls past
        // that: 33 px plus 20 per row (engine-facts, listbox table)
        PREVIEW_H: 193
    },

    /**
     * The edittext event that recomputes the preview: "onChanging" (every
     * keystroke) while a refresh with 240 rows stays under ~200 ms, else
     * "onChange" (Enter, leaving the field), spec 6.2. Measured by
     * probe_dialog.jsx on 240 prefabs (docs/findings.md, Dialog probe): a
     * refresh takes 190-310 ms, up to ~600 ms with a garbage-collection
     * pause, so the preview follows on onChange.
     * @type {string}
     */
    LIVE_EVENT: "onChange",

    /**
     * ms after a refresh from a text field during which Použít only shows
     * the new preview, with the hint HOLD_HINT, instead of applying. Enter in
     * a field, or a click on Použít while a field holds an edit, commits the
     * field (onChange, a refresh) and fires Použít at once: the user has not
     * seen that preview, and the tool never writes one nobody saw (spec 2,
     * anti-goals; ruling R28). The two events come within a few ms; a person
     * who looks at a preview and then clicks takes far longer. Values no
     * refresh has seen at all are held by settle() in build(). The next
     * Použít applies.
     * @type {number}
     */
    HOLD_MS: 400,

    /** Step types in the order of the type dropdowns. */
    TYPES: ["replace", "number", "case"],

    /** Number formats in the order of the Formát dropdown. */
    FORMATS: ["1", "A", "a"],

    /** Case modes in the order of the Režim dropdown. */
    MODES: ["upper", "lower", "title", "sentence"],

    /** Rozsah kinds in the order of their radio buttons. */
    SCOPES: ["selection", "artboard", "document"],

    /** Pořadí values in the order of their radio buttons. */
    ORDERS: ["rows", "cols"],

    /** The Number step's text fields. */
    NUMBER_FIELDS: ["from", "to", "step", "digits", "repeats", "reset"],

    /** The step field a FIELD_* label key in a Number error names. */
    FIELD_OF: {
        FIELD_FROM: "from", FIELD_TO: "to", FIELD_STEP: "step",
        FIELD_DIGITS: "digits", FIELD_REPEATS: "repeats", FIELD_RESET: "reset"
    },

    // ---- pure helpers (tests/test_ui.js) ----------------------------------

    /**
     * A deep copy of plain data (objects, arrays, strings, numbers,
     * booleans): presets and steps, so an edit in the dialog never changes a
     * stored preset behind the asterisk's back.
     * @param {*} v - The value.
     * @returns {*} The copy.
     */
    copy: function (v) {
        var out, k, i;
        if (v === null || typeof v !== "object") { return v; }
        if (BTE.Utils.isArray(v)) {
            out = [];
            for (i = 0; i < v.length; i++) { out.push(BTE.UI.copy(v[i])); }
            return out;
        }
        out = {};
        for (k in v) {
            if (v.hasOwnProperty(k)) { out[k] = BTE.UI.copy(v[k]); }
        }
        return out;
    },

    /**
     * The Rozsah the dialog opens with: Výběr when objects are selected or
     * text is being edited, else Celý dokument. Text being edited is not an
     * array but one TextRange (findings.md Task 8 fact 2); opening on Výběr
     * shows the cursor error at once (spec 4.1, decision 15; ruling R27).
     * @param {*} sel - doc.selection.
     * @returns {string} "selection" or "document".
     */
    initialScope: function (sel) {
        if (sel === null || sel === undefined) { return "document"; }
        if (!BTE.Utils.isArray(sel)) { return "selection"; }
        return sel.length > 0 ? "selection" : "document";
    },

    /**
     * A preset with every Kde "auto" resolved for these texts: each step
     * gets BTE.UIModel.defaultWhere with the variables of its own input,
     * that is after the steps above it. Only [Výchozí] holds "auto" (ruling
     * R4); the dialog resolves it with the variables the current values
     * see, on open, on ↺ and when the Rozsah changes, so [Výchozí] does not
     * show "*" right after it was loaded (Task 11 carry).
     * @param {{order: string, steps: Array}} preset - A preset.
     * @param {Array.<Array.<string>>} state - The texts (prepared.state).
     * @returns {{order: string, steps: Array}} A resolved copy.
     * @throws {Error} From BTE.Steps.run for an unknown step type.
     */
    resolveAuto: function (preset, state) {
        var out = BTE.UI.copy(preset);
        var steps = out.steps;
        var k, run;
        for (k = 0; k < steps.length; k++) {
            if (steps[k].where && steps[k].where.kind === "auto") {
                run = BTE.Steps.run(state, steps.slice(0, k));
                steps[k].where = BTE.UIModel.defaultWhere(steps[k].type, BTE.Vars.list(run.states[k]));
            }
        }
        return out;
    },

    /**
     * The Kde a step gets when an item of its Kde list is picked. Moving
     * between Jiný text and Regulární výraz keeps what was typed; every
     * other pick takes the item's own Kde.
     * @param {{kind: string, text: string}} picked - The item's where
     *     (BTE.UIModel.whereItems).
     * @param {?{kind: string, text: string}} old - The step's Kde before.
     * @returns {{kind: string, text: string}} A new Kde.
     */
    whereAfterPick: function (picked, old) {
        var typed = picked.kind === "text" || picked.kind === "regex";
        var had = !!old && (old.kind === "text" || old.kind === "regex");
        return { kind: picked.kind, text: (typed && had) ? String(old.text) : String(picked.text) };
    },

    /**
     * The editor field a step's error is about, to paint it red: "where"
     * for the Jiný text / Regulární výraz field, a Number field name, or
     * null when the error names no single field (a value out of range, a
     * letter below A) or the step has none. Only a step that is on reports.
     * @param {Object} step - The step.
     * @param {?Object} info - Its StepInfo from BTE.Steps.run.
     * @returns {?string} "where", "from", "to", "step", "digits",
     *     "repeats", "reset" or null.
     */
    errorField: function (step, info) {
        var e = (info && step && step.active) ? info.error : null;
        var f;
        if (!e) { return null; }
        if (e.key === "ERR_FIND_EMPTY" || e.key === "ERR_BAD_REGEX" || e.key === "ERR_LOOKBEHIND") { return "where"; }
        if (e.key === "ERR_DIGITS_RANGE") { return "digits"; }
        if (e.key === "ERR_NOT_INTEGER" || e.key === "ERR_MIN_ONE") {
            f = e.args ? e.args[0] : undefined;
            return (typeof f === "string" && BTE.UI.FIELD_OF.hasOwnProperty(f)) ? BTE.UI.FIELD_OF[f] : null;
        }
        return null;
    },

    /**
     * The variables after a step, for a step added below it.
     * @param {?{states: Array}} run - BTE.Steps.run result, or null.
     * @param {number} at - The step, from zero; -1 for the input.
     * @returns {Array.<{name: string, count: number}>} Empty without a run.
     */
    varsAfter: function (run, at) {
        if (!run || !run.states[at + 1]) { return []; }
        return BTE.Vars.list(run.states[at + 1]);
    },

    /**
     * A step added below the selected one (spec 6.1, +).
     * @param {Array} steps - The chain.
     * @param {number} at - The selected step; out of range adds at the end.
     * @param {Object} step - The new step.
     * @returns {{steps: Array, selected: number}} A new chain and the new
     *     step's position.
     */
    insertStep: function (steps, at, step) {
        var pos = (at >= 0 && at < steps.length) ? at + 1 : steps.length;
        var out = steps.slice(0, pos);
        out.push(step);
        return { steps: out.concat(steps.slice(pos)), selected: pos };
    },

    /**
     * The chain without the selected step (spec 6.1, −). The only step is
     * never removed.
     * @param {Array} steps - The chain.
     * @param {number} at - The selected step.
     * @returns {{steps: Array, selected: number}} A new chain and the step
     *     selected after it: the next one, or the new last one.
     */
    removeStep: function (steps, at) {
        var out;
        if (steps.length <= 1 || at < 0 || at >= steps.length) {
            return { steps: steps.slice(), selected: Math.max(0, Math.min(at, steps.length - 1)) };
        }
        out = steps.slice(0, at).concat(steps.slice(at + 1));
        return { steps: out, selected: at < out.length ? at : out.length - 1 };
    },

    /**
     * The chain with the selected step one place up or down (spec 6.1,
     * ↑ ↓). At the end of the chain nothing moves.
     * @param {Array} steps - The chain.
     * @param {number} at - The selected step.
     * @param {number} dir - -1 up, +1 down.
     * @returns {{steps: Array, selected: number}} A new chain and where the
     *     step is now.
     */
    moveStep: function (steps, at, dir) {
        var to = at + dir;
        var out = steps.slice();
        var t;
        if (at < 0 || at >= steps.length || to < 0 || to >= steps.length) { return { steps: out, selected: at }; }
        t = out[at];
        out[at] = out[to];
        out[to] = t;
        return { steps: out, selected: to };
    },

    /**
     * A step switched to another type: the new type's factory values, the
     * Aktivní state kept, the Kde from BTE.UIModel.defaultWhere (its
     * documented use on a type switch).
     * @param {Object} step - The step.
     * @param {string} type - The new type.
     * @param {Array.<{name: string, count: number}>} vars - The variables of
     *     the step's input.
     * @returns {Object} The same step for the same type, else a new one.
     */
    convertStep: function (step, type, vars) {
        var s;
        if (step.type === type) { return step; }
        s = BTE.Storage.newStep(type);
        s.active = step.active;
        s.where = BTE.UIModel.defaultWhere(type, vars);
        return s;
    },

    /**
     * Writes a failure where a debugger can see it; the dialog says what it
     * means for the user itself.
     * @param {string} msg - What failed.
     */
    log: function (msg) {
        if (typeof $ !== "undefined" && $.writeln) { $.writeln("[BTE] UI." + msg); }
    },

    // ---- ScriptUI ---------------------------------------------------------

    /**
     * Hard-locks a control's width. ScriptUI does not keep sibling groups in
     * columns on its own — only identical, fully-pinned cell widths do.
     * @param {Object} ctrl - Any ScriptUI control.
     * @param {number} w - Width in pixels.
     */
    lockW: function (ctrl, w) {
        ctrl.preferredSize.width = w;
        ctrl.minimumSize.width = w;
        ctrl.maximumSize.width = w;
    },

    /**
     * One alignment axis: every label of it gets the width of the widest,
     * measured in the dialog's own font and language. A computed width
     * instead of a number in M, because the axis must fit the Czech and the
     * English labels alike. An unsized statictext lays out exactly as wide
     * as graphics.measureString says (probe_dialog.jsx: six labels, 0 px
     * apart), so no margin is added.
     * @param {Array} labels - statictexts.
     * @returns {number} The axis width in px.
     */
    axis: function (labels) {
        var w = 0;
        var i, m;
        for (i = 0; i < labels.length; i++) {
            m = Math.ceil(labels[i].graphics.measureString(labels[i].text)[0]);
            if (m > w) { w = m; }
        }
        for (i = 0; i < labels.length; i++) { BTE.UI.lockW(labels[i], w); }
        return w;
    },

    /**
     * Controls of one column made as wide as the widest of them, so the
     * labels after them start on one axis: the Formát dropdown and the Od
     * and Opakovat fields above and below it. Computed from their own
     * preferred widths, for the same reason as axis().
     * @param {Array} ctrls - Controls of one column.
     * @returns {number} The width in px, 0 when none was known.
     */
    matchWidths: function (ctrls) {
        var w = 0;
        var i;
        for (i = 0; i < ctrls.length; i++) {
            if (ctrls[i].preferredSize.width > w) { w = ctrls[i].preferredSize.width; }
        }
        if (w <= 0) { return 0; }
        for (i = 0; i < ctrls.length; i++) { BTE.UI.lockW(ctrls[i], w); }
        return w;
    },

    /**
     * The dialog's first layout, a method of its own for one reason:
     * probe_dialog.jsx replaces it to check the host's default maximumSize
     * first. In the AppleEvent session of 2026-10-30 every element defaulted
     * to a maximum of 2^32 - 50 px ($.screens said 756 x 443), the unshown
     * layout then gave every control -50 px, and a later layout(true) could
     * not recover (findings, Dialog probe). The dialog needs nothing more.
     * @param {Window} w - The built window.
     */
    firstLayout: function (w) {
        w.layout.layout(true);
    },

    /**
     * Shows the dialog. Notes from loading the presets are shown once,
     * before it opens.
     * @param {Document} doc - The active document.
     * @returns {?{scope: string, order: string, steps: Array, prepared: Object, run: Object}}
     *     null for Storno; else the run the preview showed, the steps it
     *     ran, and the prepared scope it ran on.
     * @throws {Error} When the document cannot be read on open
     *     (BTE.Scope.prepare); main's error boundary reports it.
     */
    show: function (doc) {
        var d = BTE.UI.build(doc);
        if (d.notes.length > 0) { alert(BTE.L.WARN_PREFIX + d.notes.join("\n")); }
        d.win.center();
        d.win.show();
        return d.result();
    },

    /**
     * Builds the dialog WITHOUT showing it, so a probe can lay it out, read
     * real bounds and drive its handlers (extendscript-ui-standards 11).
     * @param {Document} doc - The active document.
     * @returns {{win: Window, refs: Object, state: Object, notes: Array.<string>,
     *     refresh: Function, result: Function}} result() is valid once the
     *     window has closed.
     */
    build: function (doc) {
        var U = BTE.UI;
        var L = BTE.L;
        var C = BTE.Config;
        var M = U.M;
        var Model = BTE.UIModel;
        var DEF = C.PRESET_KEY_DEFAULT;
        var LAST = C.PRESET_KEY_LAST;
        var indexOf = BTE.Utils.indexOf;
        var pData = BTE.Storage.load();
        var st = {
            kind: "document", order: "rows", steps: [], sel: 0,
            prepared: null, run: null, status: null, shown: [],
            fieldsOk: true, busy: false, outcome: null,
            // the values the preview was last computed from, when a text
            // field last refreshed it (ms, see HOLD_MS), and whether Použít
            // has just held a preview back (the hint shows until a refresh)
            shownValues: null, textAt: 0, holdHint: false
        };
        var typeNames = [], modeNames = [], labels = [], axis2 = [];
        var sel, start, i, k, rb, r;

        try {
            sel = doc.selection;
        } catch (e) {
            throw new Error("BTE.UI: reading the selection failed: " + e.message);
        }
        st.kind = U.initialScope(sel);

        // The fields open with the last confirmed run, the list names the
        // active preset (tile-export T7.5): "*" shows at once when they differ.
        if (!pData.presets.hasOwnProperty(pData.activePreset) || pData.activePreset === LAST) {
            pData.activePreset = DEF;
        }
        start = pData.presets.hasOwnProperty(LAST) ? pData.presets[LAST] : pData.presets[pData.activePreset];
        st.prepared = BTE.Scope.prepare(doc, st.kind, start.order);
        pData.presets[DEF] = U.resolveAuto(BTE.Storage.defaultPreset(), st.prepared.state);
        start = U.resolveAuto(start, st.prepared.state);
        st.order = start.order;
        st.steps = start.steps;

        for (i = 0; i < U.TYPES.length; i++) { typeNames.push(Model.typeName(U.TYPES[i])); }
        for (i = 0; i < U.MODES.length; i++) { modeNames.push(Model.modeName(U.MODES[i])); }

        // Measured headless 2026-10-30 (probe_dialog.jsx, 240 prefabs): the
        // window is 1008 x 768 px in Czech and in English, the preview table
        // sets the width; Kroky 217 px tall, Náhled 316 px, no text cut.
        var w = new Window("dialog", C.scriptName + " v" + C.version);
        w.orientation = "column";
        w.alignChildren = ["fill", "top"];   // panels match the widest one; no width set

        // --- Presets and Rozsah ----------------------------------------------
        // Side by side: each is two or three short rows, and stacked they
        // would cost the preview about 100 px of the ~850 px a laptop screen
        // leaves (spec 6.1 estimate). Presets stay first in reading order.
        var gTop = w.add("group");
        gTop.orientation = "row";
        gTop.alignChildren = ["fill", "fill"];
        gTop.alignment = ["fill", "top"];

        var pPreset = gTop.add("panel", undefined, L.PANEL_PRESET);
        pPreset.alignChildren = ["fill", "top"];
        var gPresetTop = pPreset.add("group");
        gPresetTop.alignment = ["fill", "top"];
        var stPreset = gPresetTop.add("statictext", undefined, L.PRESET_LABEL);
        stPreset.helpTip = L.TIP_PRESET;
        var ddPreset = gPresetTop.add("dropdownlist", undefined, []);
        ddPreset.alignment = ["fill", "center"];
        ddPreset.preferredSize.width = M.PRESET_LIST;   // [deviation] see M
        ddPreset.helpTip = L.TIP_PRESET;
        // In a group of its own: a row's slack is shared among all its
        // controls, and the list is to get it (engine-facts, row slack).
        var gRevert = gPresetTop.add("group");
        gRevert.alignment = ["right", "center"];
        var btnRevert = gRevert.add("button", undefined, L.BTN_REVERT);
        btnRevert.preferredSize.width = M.GLYPH_BTN;   // [deviation] see M
        btnRevert.helpTip = L.TIP_REVERT;
        var gPresetBtns = pPreset.add("group");
        gPresetBtns.alignment = ["right", "top"];
        var btnSave = gPresetBtns.add("button", undefined, L.BTN_SAVE);
        btnSave.helpTip = L.TIP_SAVE;
        var btnSaveAs = gPresetBtns.add("button", undefined, L.BTN_SAVE_AS);
        btnSaveAs.helpTip = L.TIP_SAVE_AS;
        var btnDel = gPresetBtns.add("button", undefined, L.BTN_DEL);
        btnDel.helpTip = L.TIP_DEL;

        var pScope = gTop.add("panel", undefined, L.PANEL_SCOPE);
        pScope.alignChildren = ["left", "top"];
        var gKind = pScope.add("group");
        var rbKind = [];
        var kindNames = [L.SCOPE_SELECTION, L.SCOPE_ARTBOARD, L.SCOPE_DOCUMENT];
        for (i = 0; i < kindNames.length; i++) {
            rb = gKind.add("radiobutton", undefined, kindNames[i]);
            rb.helpTip = L.TIP_SCOPE;
            rbKind.push(rb);
        }
        var gOrder = pScope.add("group");
        var stOrder = gOrder.add("statictext", undefined, L.LBL_ORDER);
        stOrder.helpTip = L.TIP_ORDER;
        var rbOrder = [];
        var orderNames = [L.ORDER_ROWS, L.ORDER_COLS];
        for (i = 0; i < orderNames.length; i++) {
            rb = gOrder.add("radiobutton", undefined, orderNames[i]);
            rb.helpTip = L.TIP_ORDER;
            rbOrder.push(rb);
        }
        // What the scope holds: greyed, as the family shows what it found
        // (canon 12.3). Created with a long sample; it fills the panel anyway.
        var stScope = pScope.add("statictext", undefined,
            Model.scopeLine({ elements: { length: 99999 }, textCount: 99999, skipped: { locked: 99999 } }));
        stScope.alignment = ["fill", "top"];
        stScope.enabled = false;   // greyed — intentional, not a bug

        // --- Steps: the list and the editor of the selected step --------------
        var pSteps = w.add("panel", undefined, L.PANEL_STEPS);
        pSteps.orientation = "row";
        pSteps.alignChildren = ["fill", "fill"];

        var colList = pSteps.add("group");
        colList.orientation = "column";
        colList.alignChildren = ["fill", "top"];
        colList.alignment = ["fill", "fill"];   // takes the row's slack
        var lbSteps = colList.add("listbox", undefined, []);
        lbSteps.preferredSize.width = M.STEP_LIST[0];   // [deviation] see M
        lbSteps.preferredSize.height = M.STEP_LIST[1];
        lbSteps.alignment = ["fill", "fill"];
        lbSteps.helpTip = L.TIP_STEP_LIST;
        var gListBtns = colList.add("group");
        gListBtns.alignment = ["left", "bottom"];
        var ddAddType = gListBtns.add("dropdownlist", undefined, typeNames);
        ddAddType.selection = 0;
        ddAddType.helpTip = L.TIP_ADD_TYPE;
        function glyph(text, tip) {
            var b = gListBtns.add("button", undefined, text);
            b.preferredSize.width = M.GLYPH_BTN;   // [deviation] see M
            b.helpTip = tip;
            return b;
        }
        var btnAdd = glyph(L.BTN_ADD, L.TIP_ADD);
        var btnRemove = glyph(L.BTN_REMOVE, L.TIP_REMOVE);
        var btnUp = glyph(L.BTN_UP, L.TIP_UP);
        var btnDown = glyph(L.BTN_DOWN, L.TIP_DOWN);

        // The editor keeps its natural width (a right-aligned group gets no
        // slack, engine-facts row slack); the list beside it takes the rest.
        var colEdit = pSteps.add("group");
        colEdit.orientation = "column";
        colEdit.alignChildren = ["left", "top"];
        colEdit.alignment = ["right", "top"];

        function label(g, text, tip, axisList) {
            var s = g.add("statictext", undefined, text);
            if (tip) { s.helpTip = tip; }
            axisList.push(s);
            return s;
        }
        function numField(g, tip) {
            var et = g.add("edittext", undefined, "");
            et.characters = M.NUM_CHARS;
            et.helpTip = tip;
            return et;
        }
        // The Kde dropdown and, under it, the field for Jiný text and
        // Regulární výraz. In every type group of its own, so showing the
        // field never changes the editor's height (spec 6.1).
        function whereRows(g, text, tip) {
            var r1 = g.add("group");
            var r2, out = { key: null, items: [] };
            label(r1, text, tip, labels);
            out.dd = r1.add("dropdownlist", undefined, []);
            U.lockW(out.dd, M.WHERE_DD);   // [deviation] see M
            out.dd.helpTip = tip;
            r2 = g.add("group");
            label(r2, "", null, labels);   // keeps the field under the dropdown
            out.et = r2.add("edittext", undefined, "");
            out.et.characters = M.TEXT_CHARS;
            out.et.helpTip = L.TIP_WHERE_TEXT;
            out.row = r2;
            return out;
        }
        function typeGroup() {
            var g = gStack.add("group");
            g.orientation = "column";
            g.alignChildren = ["left", "top"];
            return g;
        }

        var gType = colEdit.add("group");
        label(gType, L.LBL_TYPE, L.TIP_TYPE, labels);
        var ddType = gType.add("dropdownlist", undefined, typeNames);
        ddType.helpTip = L.TIP_TYPE;
        var cbActive = gType.add("checkbox", undefined, L.CB_ACTIVE);
        cbActive.helpTip = L.TIP_ACTIVE;

        // One group per step type in a stack: the stack is as tall as the
        // tallest, and switching visible never changes the window (measured,
        // engine-facts).
        var gStack = colEdit.add("group");
        gStack.orientation = "stack";
        gStack.alignChildren = ["left", "top"];
        var ed = {};

        var gRep = typeGroup();
        ed.replace = whereRows(gRep, L.LBL_FIND, L.TIP_FIND);
        ed.replace.group = gRep;
        r = gRep.add("group");
        label(r, L.LBL_REPLACE, L.TIP_REPLACE, labels);
        ed.replace.etReplace = r.add("edittext", undefined, "");
        ed.replace.etReplace.characters = M.TEXT_CHARS;
        ed.replace.etReplace.helpTip = L.TIP_REPLACE;
        r = gRep.add("group");
        label(r, "", null, labels);
        ed.replace.cbCase = r.add("checkbox", undefined, L.CB_MATCH_CASE);
        ed.replace.cbCase.helpTip = L.TIP_MATCH_CASE;
        r = gRep.add("group");
        label(r, "", null, labels);
        ed.replace.cbFirst = r.add("checkbox", undefined, L.CB_FIRST_ONLY);
        ed.replace.cbFirst.helpTip = L.TIP_FIRST_ONLY;

        // In the order of spec 6.1: Od, Do, Krok; Formát and its Číslic;
        // Opakovat and Znovu po. The first column's controls share a width
        // and a second axis lines up the labels after them.
        var gNum = typeGroup();
        ed.number = whereRows(gNum, L.LBL_WHERE, L.TIP_WHERE_NUMBER);
        ed.number.group = gNum;
        ed.number.fields = {};
        r = gNum.add("group");
        label(r, L.LBL_FROM, L.TIP_FROM, labels);
        ed.number.fields.from = numField(r, L.TIP_FROM);
        label(r, L.LBL_TO, L.TIP_TO, axis2);
        ed.number.fields.to = numField(r, L.TIP_TO);
        r.add("statictext", undefined, L.LBL_STEP).helpTip = L.TIP_STEP;
        ed.number.fields.step = numField(r, L.TIP_STEP);
        r = gNum.add("group");
        label(r, L.LBL_FORMAT, L.TIP_FORMAT, labels);
        ed.number.ddFormat = r.add("dropdownlist", undefined, [L.FORMAT_NUM, L.FORMAT_UPPER, L.FORMAT_LOWER]);
        ed.number.ddFormat.helpTip = L.TIP_FORMAT;
        label(r, L.LBL_DIGITS, L.TIP_DIGITS, axis2);
        ed.number.fields.digits = numField(r, L.TIP_DIGITS);
        r = gNum.add("group");
        label(r, L.LBL_REPEATS, L.TIP_REPEATS, labels);
        ed.number.fields.repeats = numField(r, L.TIP_REPEATS);
        label(r, L.LBL_RESET, L.TIP_RESET, axis2);
        ed.number.fields.reset = numField(r, L.TIP_RESET);
        // [deviation] alignment axis, see matchWidths()
        U.matchWidths([ed.number.fields.from, ed.number.ddFormat, ed.number.fields.repeats]);

        var gCase = typeGroup();
        ed["case"] = whereRows(gCase, L.LBL_WHERE, L.TIP_WHERE_CASE);
        ed["case"].group = gCase;
        r = gCase.add("group");
        label(r, L.LBL_MODE, L.TIP_MODE, labels);
        ed["case"].ddMode = r.add("dropdownlist", undefined, modeNames);
        ed["case"].ddMode.helpTip = L.TIP_MODE;

        U.axis(labels);   // [deviation] alignment axis, see axis()
        U.axis(axis2);

        // --- Preview -----------------------------------------------------------
        var pPrev = w.add("panel", undefined, L.PANEL_PREVIEW);
        pPrev.alignChildren = ["fill", "top"];
        var stStatus = pPrev.add("statictext", undefined, Model.SYMBOL.ERR + " " + L.STATUS_ERR);
        stStatus.alignment = ["fill", "top"];
        try {
            var f0 = stStatus.graphics.font;
            stStatus.graphics.font = ScriptUI.newFont(f0.name, "BOLD", f0.size);
        } catch (fontErr) {
            U.log("status font: " + fontErr.message);
        }
        // [deviation] readonly edittext, not statictext: the messages can run
        // longer than three lines, and a fixed-height statictext cuts the rest
        // with no sign (tile-export's details box).
        var etMsgs = pPrev.add("edittext", undefined, "", { multiline: true, scrolling: true, readonly: true });
        etMsgs.preferredSize.height = M.MSG_H;   // [deviation] see M
        etMsgs.helpTip = L.TIP_MESSAGES;
        var lbPrev = pPrev.add("listbox", undefined, undefined, {
            numberOfColumns: 4, showHeaders: true,
            columnTitles: [L.COL_NO, L.COL_BEFORE, L.COL_AFTER, L.COL_FINAL],
            columnWidths: M.PREVIEW_COLS
        });
        lbPrev.preferredSize.height = M.PREVIEW_H;   // [deviation] see M
        lbPrev.helpTip = L.TIP_PREVIEW;

        // --- Footer and buttons -----------------------------------------------
        var gFooter = w.add("group");
        gFooter.alignment = ["fill", "top"];
        // The family's footer (extendscript-ui-standards 9): no tool name, the
        // title has it.
        var stCopy = gFooter.add("statictext", undefined, "© 2025–2026 Ladislav Osvald · v" + C.version);
        stCopy.enabled = false;   // greyed — intentional, not a bug

        var gBtns = w.add("group");
        gBtns.alignment = ["right", "top"];
        var btnCancel = gBtns.add("button", undefined, L.BTN_CANCEL, { name: "cancel" });
        var btnOk = gBtns.add("button", undefined, L.BTN_APPLY, { name: "ok" });

        // One layout with the widest texts in place, before any real value is
        // written: a statictext keeps the width of its first layout, and a
        // programmatic selection fires onChange (engine-facts, tile-export N50).
        U.firstLayout(w);

        // --- rendering ---------------------------------------------------------

        function selected() { return st.steps[st.sel]; }

        /** Ticks clicked in the step list into the steps; true when one changed. */
        function syncChecks() {
            var changed = false;
            var n = lbSteps.items.length;
            var j, v;
            for (j = 0; j < st.steps.length && j < n; j++) {
                v = lbSteps.items[j].checked;
                if (v !== undefined && (v === true) !== st.steps[j].active) {
                    st.steps[j].active = (v === true);
                    changed = true;
                }
            }
            return changed;
        }

        /** Rebuilds the step list from the steps; the marks come with refresh(). */
        function renderStepList() {
            var j, it;
            st.busy = true;
            try {
                lbSteps.removeAll();
                for (j = 0; j < st.steps.length; j++) {
                    it = lbSteps.add("item", Model.stepLabel(st.steps[j], null, j));
                    it.checked = st.steps[j].active === true;
                }
                lbSteps.selection = st.sel;
            } finally {
                st.busy = false;
            }
        }

        function updateStepLabels() {
            var n = lbSteps.items.length;
            var j, text, it;
            st.busy = true;
            try {
                for (j = 0; j < st.steps.length && j < n; j++) {
                    it = lbSteps.items[j];
                    text = Model.stepLabel(st.steps[j], st.run ? st.run.info[j] : null, j);
                    if (it.text !== text) { it.text = text; }
                    if ((it.checked === true) !== st.steps[j].active) { it.checked = st.steps[j].active; }
                }
            } finally {
                st.busy = false;
            }
        }

        /** Fills the editor from the selected step. */
        function showEditor() {
            var step = selected();
            var e = ed[step.type];
            var kind = step.where ? step.where.kind : "";
            var j, f;
            st.busy = true;
            try {
                for (j = 0; j < U.TYPES.length; j++) { ed[U.TYPES[j]].group.visible = (U.TYPES[j] === step.type); }
                ddType.selection = indexOf(U.TYPES, step.type);
                cbActive.value = step.active === true;
                e.et.text = (kind === "text" || kind === "regex") ? String(step.where.text) : "";
                if (step.type === "replace") {
                    e.etReplace.text = String(step.replace);
                    e.cbCase.value = step.matchCase === true;
                    e.cbFirst.value = step.firstOnly === true;
                } else if (step.type === "number") {
                    for (j = 0; j < U.NUMBER_FIELDS.length; j++) {
                        f = U.NUMBER_FIELDS[j];
                        e.fields[f].text = String(step[f]);
                    }
                    e.ddFormat.selection = Math.max(0, indexOf(U.FORMATS, step.format));
                } else {
                    e.ddMode.selection = Math.max(0, indexOf(U.MODES, step.mode));
                }
            } finally {
                st.busy = false;
            }
        }

        /** The Kde list of the selected step, rebuilt only when its items change. */
        function renderWhere(e, step, vars) {
            var wi = Model.whereItems(step, vars);
            var texts = [];
            var j, key;
            for (j = 0; j < wi.items.length; j++) { texts.push(wi.items[j].label); }
            key = texts.join("\n");
            st.busy = true;
            try {
                if (key !== e.key) {
                    e.dd.removeAll();
                    for (j = 0; j < wi.items.length; j++) {
                        if (wi.items[j].separator) {
                            e.dd.add("separator");
                        } else {
                            e.dd.add("item", wi.items[j].label);
                        }
                    }
                    e.key = key;
                }
                e.items = wi.items;
                if (!e.dd.selection || e.dd.selection.index !== wi.selected) { e.dd.selection = wi.selected; }
            } finally {
                st.busy = false;
            }
        }

        /** Kde list, the field under it, red fields and greyed options. */
        function renderEditor() {
            var step = selected();
            var e = ed[step.type];
            var info = st.run ? st.run.info[st.sel] : null;
            var kind = step.where ? step.where.kind : "";
            var bad, j, f;
            renderWhere(e, step, info ? info.vars : []);
            e.row.visible = (kind === "text" || kind === "regex");
            bad = U.errorField(step, info);
            BTE.FieldPaint.field(e.et, bad !== "where");
            if (step.type === "number") {
                for (j = 0; j < U.NUMBER_FIELDS.length; j++) {
                    f = U.NUMBER_FIELDS[j];
                    BTE.FieldPaint.field(e.fields[f], bad !== f);
                }
                // Číslic means nothing for letters (spec 5.3).
                e.fields.digits.enabled = (step.format === "1");
            } else if (step.type === "replace") {
                // A variable is always matched exactly (spec 5.4).
                e.cbCase.enabled = (kind !== "var");
            }
        }

        /** The preview table; on an unchanged row count only changed cells are set. */
        function renderPreview() {
            var rows = st.run ? Model.rows(st.run.states, st.sel) : [];
            var n = rows.length;
            var items, j, c, it, row, old;
            if (lbPrev.items.length !== n) {
                lbPrev.removeAll();
                for (j = 0; j < n; j++) {
                    row = rows[j];
                    it = lbPrev.add("item", row[0]);
                    it.subItems[0].text = row[1];
                    it.subItems[1].text = row[2];
                    it.subItems[2].text = row[3];
                }
            } else {
                items = lbPrev.items;
                for (j = 0; j < n; j++) {
                    row = rows[j];
                    old = st.shown[j];
                    it = items[j];
                    if (!old || row[0] !== old[0]) { it.text = row[0]; }
                    for (c = 1; c < 4; c++) {
                        if (!old || row[c] !== old[c]) { it.subItems[c - 1].text = row[c]; }
                    }
                }
            }
            st.shown = rows;
        }

        /** Status line and messages; the hold hint first while it applies (ruling R28). */
        function renderStatus() {
            var msgs = st.holdHint ? [L.HOLD_HINT].concat(st.status.messages) : st.status.messages;
            stStatus.text = st.status.line;
            BTE.FieldPaint.text(stStatus, st.status.kind);
            etMsgs.text = msgs.join("\n");
        }

        // --- presets -------------------------------------------------------------
        // State transitions live in the shared BTE.UIState; this block wires
        // them to the controls (tile-export, zund-summa-marks). Every preset
        // operation goes to disk at once: Storno throws away edits to the
        // fields, never a preset the user saved or deleted.
        var sortedKeys = [];

        /** What a preset holds: the order and the chain (spec 6.4). */
        function current() { return { order: st.order, steps: U.copy(st.steps) }; }

        function presetLabel(key) { return key === DEF ? L.PRESET_DEFAULT : key; }

        /** Rebuilds the preset list — order and asterisk from BTE.UIState. */
        function updatePresetList() {
            var entries = BTE.UIState.formatPresetList(pData, current(), L);
            var at = 0;
            var j;
            st.busy = true;
            try {
                ddPreset.removeAll();
                sortedKeys = [];
                for (j = 0; j < entries.length; j++) {
                    ddPreset.add("item", entries[j].displayText);
                    sortedKeys.push(entries[j].key);
                    if (entries[j].isActive) { at = j; }
                }
                if (ddPreset.items.length > 0) { ddPreset.selection = at; }
            } finally {
                st.busy = false;
            }
        }

        /**
         * Asterisk and preset buttons after any change. Relabels every item,
         * not only the active one: switching away from an edited preset must
         * not leave its asterisk behind (canon 12.4).
         */
        function refreshPresetIndicator() {
            var modified = BTE.UIState.isModified(pData, current());
            var n = ddPreset.items.length;
            var j, key, text;
            btnRevert.enabled = modified;
            // A preset never stores a field the next run would refuse (canon 12.4).
            btnSave.enabled = modified && st.fieldsOk;
            btnSaveAs.enabled = st.fieldsOk;
            btnDel.enabled = (pData.activePreset !== DEF);
            for (j = 0; j < sortedKeys.length && j < n; j++) {
                key = sortedKeys[j];
                text = presetLabel(key) + ((key === pData.activePreset && modified) ? " *" : "");
                if (ddPreset.items[j].text !== text) { ddPreset.items[j].text = text; }
            }
        }

        function persist() {
            if (!BTE.Storage.save(pData)) { alert(L.ERR_WRITE_SETTINGS); }
        }

        /** [Výchozí] resolved for the texts in the dialog now (Task 11 carry). */
        function resolveDefault() {
            pData.presets[DEF] = U.resolveAuto(BTE.Storage.defaultPreset(), st.prepared.state);
        }

        // --- the one recompute ------------------------------------------------------

        function refresh() {
            var err = null;
            var j;
            if (syncChecks()) { cbActive.value = selected().active === true; }
            st.shownValues = current();
            st.holdHint = false;
            st.run = null;
            try {
                st.run = BTE.Steps.run(st.prepared.state, st.steps);
            } catch (e) {
                // A bug (unknown step type, broken edit list): said in the
                // status, Použít greyed, the dialog stays usable.
                err = e;
                U.log("refresh: " + e.message + " (line " + e.line + ")");
            }
            if (st.run) {
                st.status = Model.status(st.run, st.steps, st.prepared.skipped, st.prepared.cursorInText);
                st.fieldsOk = true;
                for (j = 0; j < st.steps.length; j++) {
                    if (st.steps[j].active && st.run.info[j].error) { st.fieldsOk = false; }
                }
            } else {
                st.status = Model.failedStatus(err.message);
                st.fieldsOk = false;
            }
            updateStepLabels();
            renderEditor();
            renderPreview();
            renderStatus();
            btnOk.enabled = st.status.canApply;
            btnRemove.enabled = st.steps.length > 1;
            btnUp.enabled = st.sel > 0;
            btnDown.enabled = st.sel < st.steps.length - 1;
            refreshPresetIndicator();
        }

        /** Loads preset values into the dialog. */
        function applyValues(v) {
            if (v.order !== st.order) {
                st.prepared = BTE.Scope.reorder(st.prepared, v.order);
                st.order = v.order;
            }
            rbOrder[Math.max(0, indexOf(U.ORDERS, st.order))].value = true;
            st.steps = U.copy(v.steps);
            st.sel = 0;
            renderStepList();
            showEditor();
            refresh();
        }

        // --- wiring -------------------------------------------------------------------

        /**
         * A handler that can never fail silently or half-way: an exception
         * is logged and shown as a ✗ status, and Použít, Uložit and Uložit
         * jako… go grey until the next refresh succeeds. The dialog stays
         * open; nothing has been written.
         */
        function guard(fn) {
            return function (ev) {
                try {
                    return fn(ev);
                } catch (e) {
                    st.busy = false;
                    U.log("handler: " + e.message + " (line " + e.line + ")");
                    try {
                        st.status = Model.failedStatus(String(e.message), "ERR_HANDLER");
                        st.fieldsOk = false;
                        st.holdHint = false;
                        renderStatus();
                        btnOk.enabled = false;
                        btnSave.enabled = false;
                        btnSaveAs.enabled = false;
                    } catch (e2) {
                        U.log("handler error display: " + e2.message + " (line " + e2.line + ")");
                    }
                }
            };
        }

        /** Whether the preview was computed from the values the dialog holds now. */
        function previewCurrent() {
            return st.shownValues !== null && BTE.Utils.presetEquals(current(), st.shownValues);
        }

        /**
         * Brings the preview up to what the dialog holds before anything uses
         * the values: a tick clicked in the step list without an event, an
         * edit no refresh has seen yet. Použít, Uložit and Uložit jako… call
         * it first, so they never act on values the preview did not show.
         * @returns {boolean} True when it had to refresh.
         */
        function settle() {
            if (syncChecks()) { cbActive.value = selected().active === true; }
            if (previewCurrent()) { return false; }
            refresh();
            return true;
        }

        /** A refresh caused by typing, remembered for Použít (HOLD_MS). */
        function textRefresh() {
            refresh();
            st.textAt = new Date().getTime();
        }

        /**
         * A text field: `apply` copies it into the selected step on every
         * keystroke; the preview follows on U.LIVE_EVENT. onChange refreshes
         * only what the preview does not show yet, so a field left without an
         * edit never holds Použít back.
         */
        function wireText(et, apply) {
            et.onChanging = guard(function () {
                if (st.busy) { return; }
                apply(et.text);
                if (U.LIVE_EVENT === "onChanging") { textRefresh(); }
            });
            et.onChange = guard(function () {
                if (st.busy) { return; }
                apply(et.text);
                if (!previewCurrent()) { textRefresh(); }
            });
        }

        function wireWhere(e) {
            e.dd.onChange = guard(function () {
                var step, item, kind;
                if (st.busy || !e.dd.selection) { return; }
                step = selected();
                item = e.items[e.dd.selection.index];
                if (item && !item.separator) {
                    step.where = U.whereAfterPick(item.where, step.where);
                    kind = step.where.kind;
                    st.busy = true;
                    try {
                        e.et.text = (kind === "text" || kind === "regex") ? step.where.text : "";
                    } finally {
                        st.busy = false;
                    }
                }
                refresh();
            });
            wireText(e.et, function (text) {
                var step = selected();
                if (step.where && (step.where.kind === "text" || step.where.kind === "regex")) {
                    step.where = { kind: step.where.kind, text: text };
                }
            });
        }
        wireWhere(ed.replace);
        wireWhere(ed.number);
        wireWhere(ed["case"]);

        wireText(ed.replace.etReplace, function (text) { selected().replace = text; });
        ed.replace.cbCase.onClick = guard(function () {
            selected().matchCase = ed.replace.cbCase.value === true;
            refresh();
        });
        ed.replace.cbFirst.onClick = guard(function () {
            selected().firstOnly = ed.replace.cbFirst.value === true;
            refresh();
        });
        function numberSetter(f) {
            return function (text) { selected()[f] = text; };
        }
        for (k = 0; k < U.NUMBER_FIELDS.length; k++) {
            wireText(ed.number.fields[U.NUMBER_FIELDS[k]], numberSetter(U.NUMBER_FIELDS[k]));
        }
        ed.number.ddFormat.onChange = guard(function () {
            if (st.busy || !ed.number.ddFormat.selection) { return; }
            selected().format = U.FORMATS[ed.number.ddFormat.selection.index];
            refresh();
        });
        ed["case"].ddMode.onChange = guard(function () {
            if (st.busy || !ed["case"].ddMode.selection) { return; }
            selected().mode = U.MODES[ed["case"].ddMode.selection.index];
            refresh();
        });

        ddType.onChange = guard(function () {
            var type, vars;
            if (st.busy || !ddType.selection) { return; }
            type = U.TYPES[ddType.selection.index];
            if (type === selected().type) { return; }
            syncChecks();
            vars = st.run ? st.run.info[st.sel].vars : [];
            st.steps[st.sel] = U.convertStep(selected(), type, vars);
            showEditor();
            refresh();
        });
        cbActive.onClick = guard(function () {
            selected().active = cbActive.value === true;
            // The list's tick follows at once, or refresh() would read the
            // old tick back as a click.
            st.busy = true;
            try {
                lbSteps.items[st.sel].checked = selected().active;
            } finally {
                st.busy = false;
            }
            refresh();
        });

        lbSteps.onChange = guard(function () {
            if (st.busy) { return; }
            if (!lbSteps.selection) {
                // A click into the empty part of the list deselects; the
                // editor always shows a step.
                st.busy = true;
                try {
                    lbSteps.selection = st.sel;
                } finally {
                    st.busy = false;
                }
                return;
            }
            syncChecks();
            st.sel = lbSteps.selection.index;
            showEditor();
            refresh();
        });
        // A click on a tick may not change the selection; whether it fires
        // onChange is unmeasured (spec 6.1, manual test), so mouseup checks,
        // and settle() catches a tick that came without any event.
        try {
            lbSteps.addEventListener("mouseup", guard(function () {
                if (!st.busy && syncChecks()) {
                    cbActive.value = selected().active === true;
                    refresh();
                }
            }));
        } catch (listenErr) {
            U.log("step list mouseup: " + listenErr.message);
        }

        function replaceChain(res) {
            st.steps = res.steps;
            st.sel = res.selected;
            renderStepList();
            showEditor();
            refresh();
        }
        btnAdd.onClick = guard(function () {
            var type = U.TYPES[ddAddType.selection ? ddAddType.selection.index : 0];
            var s = BTE.Storage.newStep(type);
            syncChecks();
            s.where = Model.defaultWhere(type, U.varsAfter(st.run, st.sel));
            replaceChain(U.insertStep(st.steps, st.sel, s));
        });
        btnRemove.onClick = guard(function () {
            if (st.steps.length <= 1) { return; }
            syncChecks();
            replaceChain(U.removeStep(st.steps, st.sel));
        });
        btnUp.onClick = guard(function () {
            syncChecks();
            replaceChain(U.moveStep(st.steps, st.sel, -1));
        });
        btnDown.onClick = guard(function () {
            syncChecks();
            replaceChain(U.moveStep(st.steps, st.sel, 1));
        });

        function setKind(kind) {
            var p;
            if (kind === st.kind) { return; }
            try {
                p = BTE.Scope.prepare(doc, kind, st.order);
            } catch (e) {
                U.log("setKind: " + e.message + " (line " + e.line + ")");
                alert(L.format(L.ERR_SCOPE_READ, e.message));
                rbKind[indexOf(U.SCOPES, st.kind)].value = true;
                return;
            }
            st.kind = kind;
            st.prepared = p;
            resolveDefault();
            stScope.text = Model.scopeLine(p);
            refresh();
        }
        function kindClick(kind) { return guard(function () { setKind(kind); }); }
        for (k = 0; k < rbKind.length; k++) { rbKind[k].onClick = kindClick(U.SCOPES[k]); }

        function setOrder(order) {
            if (order === st.order) { return; }
            st.prepared = BTE.Scope.reorder(st.prepared, order);
            st.order = order;
            refresh();
        }
        function orderClick(order) { return guard(function () { setOrder(order); }); }
        for (k = 0; k < rbOrder.length; k++) { rbOrder[k].onClick = orderClick(U.ORDERS[k]); }

        ddPreset.onChange = guard(function () {
            var key, res;
            if (st.busy || !ddPreset.selection) { return; }
            key = sortedKeys[ddPreset.selection.index];
            if (!key || key === pData.activePreset) { return; }
            res = BTE.UIState.selectPreset(pData, key);
            if (!res.ok) { return; }
            if (key === DEF) { resolveDefault(); }
            applyValues(pData.presets[key]);
        });

        /** ↺ — back to the active preset as saved. Nothing is written. */
        btnRevert.onClick = guard(function () {
            if (pData.activePreset === DEF) { resolveDefault(); }
            applyValues(pData.presets[pData.activePreset]);
        });

        /**
         * Saves the values under a new name. A field the preview has not
         * checked yet is checked first, and an invalid one is never saved
         * (canon 12.4): the button is grey then, and the field red.
         */
        btnSaveAs.onClick = guard(function () {
            var raw, res;
            settle();
            if (!st.fieldsOk) { return; }
            raw = prompt(L.PROMPT_SAVE_AS, "");
            if (raw === null) { return; }
            if (!/\S/.test(raw)) {
                alert(L.ERR_ENTER_NAME);
                return;
            }
            if (!BTE.UIState.validatePresetName(raw)) {
                alert(L.ERR_RESERVED_NAME);
                return;
            }
            res = BTE.UIState.saveAs(pData, raw, current(), function (name) {
                return confirm(L.format(L.CONFIRM_OVERWRITE_PRESET, name));
            });
            if (!res.ok) { return; }
            updatePresetList();
            persist();
            refreshPresetIndicator();
        });

        /** Overwrites the active preset; on [Výchozí] it asks for a name (canon 12.4). */
        btnSave.onClick = guard(function () {
            var res;
            settle();
            if (!st.fieldsOk) { return; }
            if (pData.activePreset === DEF) {
                btnSaveAs.onClick();
                return;
            }
            res = BTE.UIState.save(pData, current());
            if (!res.ok) { return; }
            persist();
            refreshPresetIndicator();
        });

        btnDel.onClick = guard(function () {
            var res;
            if (pData.activePreset === DEF) { return; }   // greyed there anyway
            if (!confirm(L.format(L.CONFIRM_DELETE_PRESET, pData.activePreset))) { return; }
            res = BTE.UIState.deleteActive(pData);
            if (!res.ok) { return; }
            resolveDefault();
            updatePresetList();
            persist();
            applyValues(pData.presets[DEF]);
        });

        /**
         * Applies only a preview that has been on screen (spec 2, anti-goals).
         * Held back, it shows the new preview with a hint and the next Použít
         * applies: when settle() had to refresh (an edit or a tick no refresh
         * had seen), or when a text field refreshed it just now (Enter in the
         * field, or this click committed it; HOLD_MS). The run handed back is
         * the one the preview shows.
         */
        btnOk.onClick = guard(function () {
            var held = settle() || (new Date().getTime() - st.textAt < U.HOLD_MS);
            if (held) {
                st.holdHint = true;
                renderStatus();
                return;
            }
            if (!st.status.canApply) { return; }
            pData.presets[LAST] = current();
            if (!BTE.Storage.save(pData)) { alert(L.ERR_WRITE_SETTINGS_RUN); }
            st.outcome = { scope: st.kind, order: st.order, steps: U.copy(st.steps), prepared: st.prepared, run: st.run };
            w.close(1);
        });
        btnCancel.onClick = guard(function () {
            st.outcome = null;
            w.close(0);
        });

        // --- first fill ---------------------------------------------------------------
        rbKind[indexOf(U.SCOPES, st.kind)].value = true;
        rbOrder[Math.max(0, indexOf(U.ORDERS, st.order))].value = true;
        stScope.text = Model.scopeLine(st.prepared);
        renderStepList();
        showEditor();
        updatePresetList();
        refresh();

        return {
            win: w,
            notes: pData.notes,
            state: st,
            refresh: refresh,
            settle: settle,
            refs: {
                ddPreset: ddPreset, btnRevert: btnRevert, btnSave: btnSave, btnSaveAs: btnSaveAs, btnDel: btnDel,
                rbKind: rbKind, rbOrder: rbOrder, stScope: stScope,
                lbSteps: lbSteps, ddAddType: ddAddType, btnAdd: btnAdd, btnRemove: btnRemove,
                btnUp: btnUp, btnDown: btnDown, ddType: ddType, cbActive: cbActive, gStack: gStack, ed: ed,
                stStatus: stStatus, etMsgs: etMsgs, lbPrev: lbPrev, btnOk: btnOk, btnCancel: btnCancel,
                pSteps: pSteps, pPrev: pPrev, colList: colList, colEdit: colEdit
            },
            /**
             * The dialog's outcome, valid once the window has closed.
             * @returns {?Object} See show().
             */
            result: function () { return st.outcome; }
        };
    }
};
