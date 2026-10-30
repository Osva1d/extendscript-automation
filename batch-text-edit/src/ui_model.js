// ------------------------------------------------------------------------
// Module: BTE.UIModel — what the dialog shows, computed from plain data: the
//         Kde list, step labels, preview rows, the status line
// Part of: Illustrator Batch Text Edit
// Depends on: BTE.L, BTE.Utils, BTE.Storage (step types and Kde kinds)
//
// No ScriptUI here. The dialog wires controls to these functions, so the
// texts and the rules for what may be applied are tested in Node.
// ------------------------------------------------------------------------
var BTE = BTE || {};

BTE.UIModel = {
    /**
     * Signs the model puts in front of or into text. Not words, so they do
     * not go through BTE.L. "¶" stands for a paragraph break (\r) and "↵"
     * for a soft line break (U+0003) in the preview and in step labels.
     * @type {Object.<string, string>}
     */
    SYMBOL: {
        OK: "✓", WARN: "⚠", ERR: "✗",
        PARA: "¶", BREAK: "↵",
        ARROW: "→", TIMES: "×", ELLIPSIS: "…"
    },

    /**
     * Longest user text shown in a step label before it is cut. The ✗ or ⚠
     * at the end of the label must stay visible in a narrow list.
     * @type {number}
     */
    MAX_FIELD: 24,

    /**
     * How many elements with several matches one step lists by name in the
     * status messages; the rest is counted in one line (a sheet whose
     * prefabs have merged can have hundreds).
     * @type {number}
     */
    MAX_MULTI: 3,

    /**
     * A text for one table cell or label: paragraph breaks and soft line
     * breaks are replaced by their symbols.
     * @param {string} s - Text from the document.
     * @returns {string} The text on one line.
     */
    display: function (s) {
        var sym = BTE.UIModel.SYMBOL;
        return String(s).split("\r").join(sym.PARA).split(String.fromCharCode(3)).join(sym.BREAK);
    },

    /**
     * Cuts a text to a length with an ellipsis in place of the rest.
     * @param {string} s - The text.
     * @param {number} max - Longest result, ellipsis included.
     * @returns {string} The text, or its start and an ellipsis.
     */
    shorten: function (s, max) {
        if (s.length <= max) { return s; }
        return s.substring(0, max - 1) + BTE.UIModel.SYMBOL.ELLIPSIS;
    },

    /**
     * A field's text as it appears in a step label: on one line, cut, and an
     * ellipsis for an empty field so the label never has a hole.
     * @param {*} value - Field text.
     * @returns {string} Text for the label.
     */
    field: function (value) {
        var s = (value === undefined || value === null) ? "" : String(value);
        if (s === "") { return BTE.UIModel.SYMBOL.ELLIPSIS; }
        return BTE.UIModel.shorten(BTE.UIModel.display(s), BTE.UIModel.MAX_FIELD);
    },

    /**
     * A "Kde" in a label or a message: the variable as stored, the text as
     * typed, a regular expression between slashes, or the name of the fixed
     * choice.
     * @param {{kind: string, text: string}} where - The step's Kde.
     * @returns {string} Short text.
     */
    whereText: function (where) {
        var U = BTE.UIModel;
        var w = where || {};
        if (w.kind === "first") { return BTE.L.WHERE_FIRST; }
        if (w.kind === "all") { return BTE.L.WHERE_ALL; }
        if (w.kind === "var" || w.kind === "text") { return U.field(w.text); }
        if (w.kind === "regex") {
            return (w.text === undefined || w.text === null || w.text === "") ? U.SYMBOL.ELLIPSIS : "/" + U.field(w.text) + "/";
        }
        return U.SYMBOL.ELLIPSIS;
    },

    /**
     * The name of a step type, as the list and the type dropdown show it.
     * @param {string} type - "replace", "number" or "case".
     * @returns {string} Localized name.
     * @throws {Error} For an unknown type: a bug in the caller (the preset
     *     loader drops unknown types).
     */
    typeName: function (type) {
        if (type === "replace") { return BTE.L.STEP_REPLACE; }
        if (type === "number") { return BTE.L.STEP_NUMBER; }
        if (type === "case") { return BTE.L.STEP_CASE; }
        throw new Error("BTE.UIModel: unknown step type \"" + type + "\"");
    },

    /**
     * The name of a case mode.
     * @param {string} mode - "upper", "lower", "title" or "sentence".
     * @returns {string} Localized name, an ellipsis for anything else.
     */
    modeName: function (mode) {
        if (mode === "upper") { return BTE.L.MODE_UPPER; }
        if (mode === "lower") { return BTE.L.MODE_LOWER; }
        if (mode === "title") { return BTE.L.MODE_TITLE; }
        if (mode === "sentence") { return BTE.L.MODE_SENTENCE; }
        return BTE.UIModel.SYMBOL.ELLIPSIS;
    },

    /**
     * The first variable of the text, else the type's own default (spec
     * 5.2): first number for Number, other text for Replace, whole text for
     * Change case. What the dialog calls to resolve {kind: "auto"} and for a
     * step it has just added or whose type was switched.
     * @param {string} type - "replace", "number" or "case".
     * @param {Array.<{name: string, count: number}>} vars - The variables
     *     before the step (StepInfo.vars).
     * @returns {{kind: string, text: string}} A new "Kde".
     * @throws {Error} For an unknown type.
     */
    defaultWhere: function (type, vars) {
        if (!BTE.Storage.isType(type)) {
            throw new Error("BTE.UIModel: unknown step type \"" + type + "\"");
        }
        if (vars && vars.length > 0) { return { kind: "var", text: vars[0].name }; }
        return { kind: BTE.Storage.FALLBACK_KIND[type], text: "" };
    },

    /**
     * The items of a step's "Kde" dropdown (spec 5.2): Celý text (Change
     * case only), the variables with their counts, a separator, První číslo
     * v prvku (Number only), Jiný text…, Regulární výraz…. The separator is
     * left out when nothing is above it. The step's stored choice is the
     * selected item; a variable that is not in `vars` is listed after the
     * found ones as "<name>  (nenalezeno)" and selected, never swapped for
     * another item (spec 5.1). The text of a selected Jiný text or Regulární
     * výraz item is the step's own, so reading `where` back from the
     * selected item gives the step's Kde again. An unresolved "auto", or a
     * kind the type does not have, selects what defaultWhere gives; selected
     * is never -1.
     * @param {Object} step - A step; type and where are read.
     * @param {Array.<{name: string, count: number}>} vars - The variables
     *     before the step (StepInfo.vars).
     * @returns {{items: Array.<{label: string, where: ?{kind: string, text: string}, separator: boolean}>, selected: number}}
     *     A separator item has label "-" (ScriptUI turns it into a line) and
     *     where null.
     * @throws {Error} For an unknown type.
     */
    whereItems: function (step, vars) {
        var U = BTE.UIModel;
        var L = BTE.L;
        var list = vars || [];
        var items = [];
        var kinds, w, selected, present, i, at;

        function add(label, where) {
            items.push({ label: label, where: where, separator: false });
        }

        if (!BTE.Storage.isType(step.type)) {
            throw new Error("BTE.UIModel: unknown step type \"" + step.type + "\"");
        }
        kinds = BTE.Storage.KINDS[step.type];
        w = step.where;
        if (!w || BTE.Utils.indexOf(kinds, w.kind) === -1) { w = U.defaultWhere(step.type, list); }

        if (BTE.Utils.indexOf(kinds, "all") !== -1) { add(L.WHERE_ALL, { kind: "all", text: "" }); }
        present = false;
        for (i = 0; i < list.length; i++) {
            add(list[i].name + "   (" + list[i].count + U.SYMBOL.TIMES + ")", { kind: "var", text: list[i].name });
            if (w.kind === "var" && list[i].name === w.text) { present = true; }
        }
        if (w.kind === "var" && !present) {
            add(w.text + "  " + L.NOT_FOUND, { kind: "var", text: w.text });
        }
        if (items.length > 0) { items.push({ label: "-", where: null, separator: true }); }
        if (BTE.Utils.indexOf(kinds, "first") !== -1) { add(L.WHERE_FIRST, { kind: "first", text: "" }); }
        add(L.WHERE_TEXT, { kind: "text", text: w.kind === "text" ? String(w.text) : "" });
        add(L.WHERE_REGEX, { kind: "regex", text: w.kind === "regex" ? String(w.text) : "" });

        selected = -1;
        for (i = 0; i < items.length; i++) {
            at = items[i].where;
            if (at !== null && at.kind === w.kind && (w.kind !== "var" || at.text === w.text)) {
                selected = i;
                break;
            }
        }
        return { items: items, selected: selected };
    },

    /**
     * The line a step has in the step list: position, type, Kde and the
     * main value, and ✗ or ⚠ at the end when the step is on and has an error
     * or a warning. An inactive step shows no sign: it is skipped, so it
     * has nothing to report.
     * @param {Object} step - A step.
     * @param {?Object} info - Its StepInfo from BTE.Steps.run, or nothing.
     * @param {number} index - The step's position in the chain, from zero.
     * @returns {string} e.g. "1  Nahradit {kód} → ABC  ✗".
     * @throws {Error} For an unknown type.
     */
    stepLabel: function (step, info, index) {
        var U = BTE.UIModel;
        var L = BTE.L;
        var sym = U.SYMBOL;
        var name = U.typeName(step.type);
        var where = U.whereText(step.where);
        var tail, mark;

        if (step.type === "replace") {
            tail = where + " " + sym.ARROW + " " + ((step.replace === undefined || step.replace === null || step.replace === "") ? L.STEP_EMPTY : U.field(step.replace));
        } else if (step.type === "number") {
            tail = where + " " + L.STEP_FROM + " " + U.field(step.from);
        } else {
            tail = where + " " + sym.ARROW + " " + U.modeName(step.mode);
        }

        mark = "";
        if (step.active && info) {
            if (info.error) {
                mark = "  " + sym.ERR;
            } else if (info.warns && info.warns.length > 0) {
                mark = "  " + sym.WARN;
            }
        }
        return (index + 1) + "  " + name + " " + tail + mark;
    },

    /**
     * The preview table: one row per element, columns "#", the original
     * texts, the texts after the selected step, the final texts. The texts of
     * one element are joined with " | "; \r shows as "¶" and U+0003 as "↵".
     * @param {Array} states - BTE.Steps.run(...).states: the input, then the
     *     state after each step.
     * @param {number} selectedStep - The selected step, from zero. Out of
     *     range (nothing selected, or no steps) the column shows the final
     *     state.
     * @returns {Array.<Array.<string>>} [[number, original, after, final], ...]
     */
    rows: function (states, selectedStep) {
        var U = BTE.UIModel;
        var out = [];
        var last = states.length - 1;
        var at, i;

        function joined(texts) {
            var parts = [];
            var j;
            for (j = 0; j < texts.length; j++) { parts.push(U.display(texts[j])); }
            return parts.join(" | ");
        }

        if (last < 0) { return out; }
        at = last;
        if (selectedStep >= 0 && selectedStep + 1 <= last && Math.floor(selectedStep) === selectedStep) {
            at = selectedStep + 1;
        }
        for (i = 0; i < states[0].length; i++) {
            out.push([String(i + 1), joined(states[0][i]), joined(states[at][i]), joined(states[last][i])]);
        }
        return out;
    },

    /**
     * A message from BTE.Steps as text. A label key in an argument (the
     * Number step names the field in ERR_NOT_INTEGER and ERR_MIN_ONE with
     * "FIELD_FROM" and the like) is replaced by the label, so the user never
     * sees a key. A key that has no entry of its own but has _1/_2/_5 forms
     * (WARN_MISSING, WARN_EXTRA) is a counted message; the form is picked by
     * the first argument, which is the count.
     * @param {{key: string, args: Array}} msg - A StepInfo error or warning.
     * @returns {string} The message; the key itself when BTE.L has no such
     *     entry (a bug the tests catch, not a crash for the user).
     */
    text: function (msg) {
        var L = BTE.L;
        var tpl = L[msg.key];
        var args = msg.args || [];
        var vals = [];
        var i, a;

        if (typeof tpl !== "string") {
            if (typeof L[msg.key + "_5"] !== "string") { return msg.key; }
            tpl = L.countForm(msg.key, Number(args[0]));
        }
        for (i = 0; i < args.length; i++) {
            a = args[i];
            if (typeof a === "string" && /^FIELD_[A-Z]+$/.test(a) && typeof L[a] === "string") {
                vals.push(L[a]);
            } else {
                vals.push(String(a));
            }
        }
        return L.format.apply(L, [tpl].concat(vals));
    },

    /**
     * What the status line and the message list under the steps say (spec
     * 6.3). Errors of the steps that are on make it ERR and block Použít; a
     * run that changes no element blocks it too; warnings (the Do check,
     * nothing found, an element with several matches, skipped texts) turn it
     * to WARN and leave Použít on. An empty range is an error. Messages:
     * errors first, then warnings, each in step order, led by the step's
     * number; the skipped texts come last. Only steps that are on count.
     * @param {{states: Array, info: Array}} run - BTE.Steps.run result.
     * @param {Array.<Object>} steps - The steps that were run.
     * @param {{locked: number, overflow: number, linked: number}} [skipped]
     *     Texts the scope skipped, by reason (ruling R3).
     * @param {boolean} [cursorInText] - The Rozsah is Výběr and the
     *     selection is text being edited (BTE.Scope.prepare): the empty
     *     range then says so and what to do (spec 4.1), instead of "no text".
     * @returns {{kind: string, line: string, messages: Array.<string>, canApply: boolean, changed: number}}
     *     kind is "OK", "WARN" or "ERR" (the keys of FieldPaint.COLORS);
     *     line starts with the matching sign; changed is the number of
     *     elements whose texts differ at the end.
     */
    status: function (run, steps, skipped, cursorInText) {
        var U = BTE.UIModel;
        var L = BTE.L;
        var sym = U.SYMBOL;
        var states = run.states;
        var total = states[0].length;
        var finalState = states[states.length - 1];
        var errors = [];
        var warns = [];
        var changed = 0;
        var reasons = [["locked", "SKIP_LOCKED"], ["overflow", "SKIP_OVERFLOW"], ["linked", "SKIP_LINKED"]];
        var k, i, j, info, step, count, shown, rest, a, b, kind, line, canApply;

        function led(no, text) { return L.format(L.STATUS_STEP, no, text); }

        if (total === 0) { errors.push(sym.ERR + " " + (cursorInText === true ? L.ERR_CURSOR_IN_TEXT : L.ERR_NO_TEXT)); }

        for (k = 0; k < steps.length; k++) {
            step = steps[k];
            info = run.info[k];
            if (!info || !step.active) { continue; }
            if (info.error) { errors.push(sym.ERR + " " + led(k + 1, U.text(info.error))); }
            // With an empty range every step "found nothing"; that is noise.
            if (total === 0) { continue; }
            for (i = 0; i < info.warns.length; i++) {
                warns.push(sym.WARN + " " + led(k + 1, U.text(info.warns[i])));
            }
            shown = info.multi.length < U.MAX_MULTI ? info.multi.length : U.MAX_MULTI;
            for (i = 0; i < shown; i++) {
                count = info.multi[i].count;
                warns.push(sym.WARN + " " + led(k + 1, L.format(L.countForm("MSG_MULTI", count), info.multi[i].el + 1, count, U.whereText(step.where))));
            }
            rest = info.multi.length - shown;
            if (rest > 0) {
                warns.push(sym.WARN + " " + led(k + 1, L.count("MSG_MULTI_MORE", rest)));
            }
        }

        for (i = 0; i < reasons.length; i++) {
            count = skipped ? Number(skipped[reasons[i][0]]) : 0;
            if (count > 0) {
                warns.push(sym.WARN + " " + L.count(reasons[i][1], count));
            }
        }

        for (i = 0; i < total; i++) {
            a = states[0][i];
            b = finalState[i];
            for (j = 0; j < a.length; j++) {
                if (a[j] !== b[j]) {
                    changed++;
                    break;
                }
            }
        }

        if (errors.length > 0) {
            kind = "ERR";
            line = sym.ERR + " " + L.STATUS_ERR;
            canApply = false;
        } else if (changed === 0) {
            kind = "WARN";
            line = sym.WARN + " " + L.STATUS_NOTHING;
            canApply = false;
        } else {
            kind = warns.length > 0 ? "WARN" : "OK";
            line = sym[kind] + " " + L.format(L.countForm("STATUS_CHANGED", total), changed, total);
            canApply = true;
        }
        return { kind: kind, line: line, messages: errors.concat(warns), canApply: canApply, changed: changed };
    },

    /**
     * The status for a preview that could not be computed: BTE.Steps.run
     * threw, which is a bug (an unknown step type, a broken edit list). The
     * dialog stays open, says what failed and blocks Použít, so nothing is
     * written from a preview nobody saw.
     * @param {string} message - The exception's message.
     * @returns {{kind: string, line: string, messages: Array.<string>, canApply: boolean, changed: number}}
     *     The shape status() returns, kind "ERR".
     */
    failedStatus: function (message) {
        var L = BTE.L;
        var sym = BTE.UIModel.SYMBOL;
        return {
            kind: "ERR",
            line: sym.ERR + " " + L.STATUS_ERR,
            messages: [sym.ERR + " " + L.format(L.ERR_PREVIEW, message)],
            canApply: false,
            changed: 0
        };
    },

    /**
     * The greyed line under Rozsah: what the scope holds, "240 prvků, 480
     * textů", and how many texts it skipped (the reasons are in the status
     * messages). With the cursor in a text it says that instead.
     * @param {{elements: Array, textCount: number, skipped: Object, cursorInText: boolean}} prepared
     *     From BTE.Scope.prepare or reorder.
     * @returns {string} The line.
     */
    scopeLine: function (prepared) {
        var L = BTE.L;
        var s = prepared.skipped || {};
        var skipped = (Number(s.locked) || 0) + (Number(s.overflow) || 0) + (Number(s.linked) || 0);
        var line;
        if (prepared.cursorInText === true) { return L.SCOPE_CURSOR; }
        line = L.format(L.SCOPE_COUNTS, L.count("COUNT_ELEMENTS", prepared.elements.length),
            L.count("COUNT_TEXTS", prepared.textCount));
        if (skipped > 0) { line = L.format(L.SCOPE_SKIPPED, line, skipped); }
        return line;
    }
};
