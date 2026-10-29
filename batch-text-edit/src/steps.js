// ------------------------------------------------------------------------
// Module: BTE.Steps — runs a chain of steps over plain strings and returns
//         the state after each step plus what each step found and edits
// Part of: Illustrator Batch Text Edit
// Depends on: BTE.Utils, BTE.Vars
// ------------------------------------------------------------------------
var BTE = BTE || {};

BTE.Steps = {
    /**
     * A message for the UI: a locale key and the values for its %s slots.
     * The core never builds user text, it only names it (BTE.L has the copy).
     * @param {string} key - Key in BTE.L, e.g. "ERR_FIND_EMPTY".
     * @param {Array} [args] - Values for the %s placeholders, in order.
     * @returns {{key: string, args: Array}} The message.
     */
    msg: function (key, args) {
        return { key: key, args: args || [] };
    },

    /**
     * Compiles a step's "Kde" field into a global RegExp. Variable and plain
     * text are escaped, so metacharacters in {a+b} or "a.b" match literally.
     * A variable is always case-sensitive (spec 5.1), text and regex follow
     * caseInsensitive. Flags are "g" plus "i", never "m": ^ and $ then mean
     * the start and end of the whole text. Any kind other than var, text and
     * regex (an unresolved "auto", or "first"/"all" in a step that has no
     * such position) is reported as an empty search, so a leak shows as an
     * error and never as a step that quietly does nothing.
     * @param {{kind: string, text: string}} where - The step's Kde field.
     * @param {boolean} caseInsensitive - Match without regard to case.
     * @returns {{re: RegExp}|{error: {key: string, args: Array}}} The regex,
     *     or the message to show (ERR_FIND_EMPTY, ERR_LOOKBEHIND,
     *     ERR_BAD_REGEX).
     */
    compile: function (where, caseInsensitive) {
        var w = where || {};
        var source, flags;

        if (w.kind !== "var" && w.kind !== "text" && w.kind !== "regex") {
            return { error: BTE.Steps.msg("ERR_FIND_EMPTY") };
        }
        if (w.text === undefined || w.text === null || w.text === "") {
            return { error: BTE.Steps.msg("ERR_FIND_EMPTY") };
        }

        if (w.kind === "regex") {
            source = String(w.text);
            // Lookbehind and named groups do not raise a SyntaxError in the
            // engine, they silently find nothing (measured), so refuse them.
            if (source.indexOf("(?<") !== -1) {
                return { error: BTE.Steps.msg("ERR_LOOKBEHIND") };
            }
        } else {
            source = BTE.Utils.escapeRegExp(w.text);
        }

        flags = (caseInsensitive && w.kind !== "var") ? "gi" : "g";
        try {
            return { re: new RegExp(source, flags) };
        } catch (e) {
            // The message text is localized by the engine, the name is not.
            if (e.name === "SyntaxError") {
                return { error: BTE.Steps.msg("ERR_BAD_REGEX") };
            }
            throw e;
        }
    },

    /**
     * Non-empty matches of a compiled regex in one text, in order. Collected
     * through String.replace with a function replacer, so the engine's own
     * loop decides when to stop and nothing here depends on lastIndex: the
     * engine's lastIndex handling is unmeasured and looks unreliable
     * (/a/g.test twice returned true, true, research 7.4), and a hand-written
     * exec loop that relied on it could hang the dialog. A fresh RegExp is
     * built on every call. The replacer returns the matched text, so the
     * throwaway result of replace is the input again. The arguments layout
     * (match, groups..., offset, whole string) and the offset are standard
     * ES3 15.5.4.11, queued for an engine probe. An empty match (x*) is
     * skipped; inserting text is not a v1 feature.
     * @param {RegExp} re - Regex from compile().
     * @param {string} s - The text.
     * @param {boolean} [firstOnly] - Keep only the first non-empty match.
     * @returns {Array.<Object>} Match objects {0: whole, 1..n: groups, index,
     *     length}; length is n + 1 like an exec result, and a group that did
     *     not take part is "".
     */
    matches: function (re, s, firstOnly) {
        var rx = new RegExp(re.source, re.ignoreCase ? "gi" : "g");
        var found = [];

        s.replace(rx, function () {
            var a = arguments;
            var groups = a.length - 3;
            var m = { 0: a[0], index: a[a.length - 2], length: groups + 1 };
            var g;

            if (a[0].length === 0 || (firstOnly && found.length > 0)) { return a[0]; }
            for (g = 1; g <= groups; g++) {
                m[g] = (a[g] === undefined || a[g] === null) ? "" : a[g];
            }
            found.push(m);
            return a[0];
        });
        return found;
    },

    /**
     * Expands $-tokens of a regex-mode replacement for one match: $$, $&,
     * $` (text before the match), $' (text after), $1-$99. A group number
     * the pattern does not have stays as written; a group that did not take
     * part is an empty string (matches() has made it one). Plain-text and
     * variable replacements never come here, their $ is literal.
     * @param {string} tpl - Replacement text as typed.
     * @param {Object} m - Match object from matches().
     * @param {string} s - The text the match was found in.
     * @returns {string} The replacement for this match.
     */
    expand: function (tpl, m, s) {
        var groups = m.length - 1;
        return tpl.replace(/\$(\$|&|`|'|\d\d?)/g, function (all, tok) {
            var n;
            if (tok === "$") { return "$"; }
            if (tok === "&") { return m[0]; }
            if (tok === "`") { return s.substring(0, m.index); }
            if (tok === "'") { return s.substring(m.index + m[0].length); }
            if (tok.length === 2) {
                n = Number(tok);
                if (n >= 1 && n <= groups) { return m[n]; }
            }
            n = Number(tok.charAt(0));
            if (n >= 1 && n <= groups) {
                return m[n] + tok.substring(1);
            }
            return all;
        });
    },

    /**
     * Replace step: the edits for replacing every non-empty match of Najít
     * (or only the first in each text) with the replacement. In text and
     * variable mode the replacement is literal; in regex mode $1, $& etc.
     * work.
     * @param {Array.<Array.<string>>} state - Per element, the texts it holds.
     * @param {Object} step - A replace step.
     * @returns {{error: Object|null, edits: Array, warns: Array, multi: Array}}
     *     The step result run() merges into StepInfo.
     */
    replace: function (state, step) {
        var c = BTE.Steps.compile(step.where, !step.matchCase);
        var rep = (step.replace === undefined || step.replace === null) ? "" : String(step.replace);
        var edits = [];
        var i, j, k, texts, found;

        if (c.error) { return { error: c.error, edits: [], warns: [], multi: [] }; }

        for (i = 0; i < state.length; i++) {
            texts = state[i];
            for (j = 0; j < texts.length; j++) {
                found = BTE.Steps.matches(c.re, texts[j], step.firstOnly);
                for (k = 0; k < found.length; k++) {
                    edits.push({
                        el: i,
                        tx: j,
                        start: found[k].index,
                        length: found[k][0].length,
                        text: step.where.kind === "regex" ? BTE.Steps.expand(rep, found[k], texts[j]) : rep
                    });
                }
            }
        }
        return { error: null, edits: edits, warns: [], multi: [] };
    },

    /**
     * Runs one step of any type. The place Number and Case steps plug in.
     * An unknown type is a bug in the caller (the preset loader drops them),
     * so it throws instead of passing the text on unchanged.
     * @param {Array.<Array.<string>>} state - Input of the step.
     * @param {Object} step - Step object (the preset format).
     * @returns {{error: Object|null, edits: Array, warns: Array, multi: Array}}
     *     The step result run() merges into StepInfo.
     */
    apply: function (state, step) {
        if (step.type === "replace") { return BTE.Steps.replace(state, step); }
        throw new Error("BTE.Steps: unknown step type \"" + step.type + "\"");
    },

    /**
     * Builds the texts after a step from its edits. The one code path both
     * the preview and the write use for what a step produces. Edits must be
     * ordered by element, text and start, as the step handlers emit them,
     * and must not overlap. Always returns new arrays.
     * @param {Array.<Array.<string>>} state - Input of the step.
     * @param {Array.<{el: number, tx: number, start: number, length: number, text: string}>} edits
     *     Edits relative to the texts in state.
     * @returns {Array.<Array.<string>>} The state after the step.
     */
    applyEdits: function (state, edits) {
        var out = [];
        var k = 0;
        var i, j, texts, row, s, built, pos, e;

        for (i = 0; i < state.length; i++) {
            texts = state[i];
            row = [];
            for (j = 0; j < texts.length; j++) {
                s = texts[j];
                built = "";
                pos = 0;
                while (k < edits.length && edits[k].el === i && edits[k].tx === j) {
                    e = edits[k];
                    built += s.substring(pos, e.start) + e.text;
                    pos = e.start + e.length;
                    k++;
                }
                row.push(built + s.substring(pos));
            }
            out.push(row);
        }
        return out;
    },

    /**
     * Number of elements an ordered edit list touches.
     * @param {Array.<{el: number}>} edits - Edits ordered by element.
     * @returns {number} Elements with at least one edit.
     */
    countElements: function (edits) {
        var n = 0;
        var last = -1;
        var i;
        for (i = 0; i < edits.length; i++) {
            if (edits[i].el !== last) {
                n++;
                last = edits[i].el;
            }
        }
        return n;
    },

    /**
     * Runs the chain: each active step works on the output of the one before.
     * An inactive step, and a step that fails, pass their input on (as a
     * copy) and the chain goes on. The variables are those of each step's
     * own input, also for inactive steps, so the dialog can fill every
     * step's list. The input is never changed.
     * @param {Array.<Array.<string>>} state - Per element, the texts it holds.
     * @param {Array.<Object>} steps - Step objects, in order.
     * @returns {{states: Array, info: Array}} states[k] is the state after
     *     step k (states[0] is the input); info[k] is
     *     {hits, error, warns, vars, multi, edits} for step k: hits = elements
     *     the step found something in, error and warns = {key, args} messages,
     *     vars = [{name, count}] in the step's input, multi = [{el, count}],
     *     edits = [{el, tx, start, length, text}] relative to the step's input.
     */
    run: function (state, steps) {
        var states = [state];
        var info = [];
        var cur = state;
        var k, step, item, res;

        for (k = 0; k < steps.length; k++) {
            step = steps[k];
            item = { hits: 0, error: null, warns: [], vars: BTE.Vars.list(cur), multi: [], edits: [] };

            if (step.active) {
                res = BTE.Steps.apply(cur, step);
                if (res.error) {
                    item.error = res.error;
                } else {
                    item.edits = res.edits;
                    item.warns = res.warns;
                    item.multi = res.multi;
                    item.hits = BTE.Steps.countElements(res.edits);
                    if (item.hits === 0) { item.warns.push(BTE.Steps.msg("WARN_NOTHING_FOUND")); }
                }
            }

            cur = BTE.Steps.applyEdits(cur, item.edits);
            states.push(cur);
            info.push(item);
        }
        return { states: states, info: info };
    }
};
