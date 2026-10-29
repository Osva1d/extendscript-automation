// ------------------------------------------------------------------------
// Module: BTE.Steps — runs a chain of steps over plain strings and returns
//         the state after each step plus what each step found and edits
// Part of: Illustrator Batch Text Edit
// Depends on: BTE.Utils, BTE.Vars, BTE.Numbers (shared)
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
     * ES3 15.5.4.11 and measured in the engine (docs/findings.md). An empty
     * match (x*) is skipped; inserting text is not a v1 feature.
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
     * Largest Číslic (minimum digit count) the Number step accepts for the
     * numeric format. Larger values are an error, so formatValue never pads
     * to an absurd width.
     * @type {number}
     */
    MAX_DIGITS: 20,

    /**
     * Largest whole number the Number step reads or writes: 2^53 - 1. Beyond
     * it a double no longer holds every integer, so a value would silently
     * change (...993 becomes ...992), print as "1e+22", or be Infinity (a
     * 309-digit field), which must never reach a loop or the document.
     * @type {number}
     */
    MAX_SAFE: 9007199254740991,

    /**
     * The step result for a step that failed: the message and no edits.
     * @param {{key: string, args: Array}} error - The message to show.
     * @returns {{error: Object, edits: Array, warns: Array, multi: Array}}
     *     The step result run() merges into StepInfo.
     */
    failed: function (error) {
        return { error: error, edits: [], warns: [], multi: [] };
    },

    /**
     * Reads one integer field of a step. Text goes through the shared
     * BTE.Numbers.parse (decimal comma or dot, spaces around), then must be a
     * whole number within +-MAX_SAFE: 1,5 and 1e3 are refused, 1.0 is the
     * integer 1, and a digit run too long for a double (Infinity) is refused.
     * @param {*} raw - The field as typed (string or number).
     * @param {string} label - BTE.L key of the field's label, named in errors.
     * @param {*} blank - Value of a blank field (spaces only, missing);
     *     undefined when a blank field is an error.
     * @param {number|null} min - Smallest allowed value, or null for none.
     * @returns {{value: *, error: Object|null}} The number (or the blank
     *     value), or the message: ERR_NOT_INTEGER, ERR_MIN_ONE (both with
     *     the label key as argument).
     */
    intField: function (raw, label, blank, min) {
        var v;
        if (blank !== undefined && (raw === undefined || raw === null || BTE.Utils.strip(raw) === "")) {
            return { value: blank, error: null };
        }
        v = BTE.Numbers.parse(raw);
        if (!(Math.abs(v) <= BTE.Steps.MAX_SAFE) || Math.floor(v) !== v) {
            return { value: NaN, error: BTE.Steps.msg("ERR_NOT_INTEGER", [label]) };
        }
        if (min !== null && v < min) {
            return { value: v, error: BTE.Steps.msg("ERR_MIN_ONE", [label]) };
        }
        return { value: v, error: null };
    },

    /**
     * How many steps from the first value the i-th numbered element is
     * (spec 5.3): b = i, or i mod reset when reset is above 0; floor(b /
     * repeats).
     * @param {number} i - Position among the elements the step found
     *     something in, from zero.
     * @param {number} repeats - How often each value is used, at least 1.
     * @param {number} reset - Elements after which the series returns to
     *     the first value; 0 (or less) for never.
     * @returns {number} Number of increments, 0 or more.
     */
    stepsAt: function (i, repeats, reset) {
        var b = reset > 0 ? i % reset : i;
        return Math.floor(b / repeats);
    },

    /**
     * Value of the i-th numbered element (spec 5.3): from + step * stepsAt.
     * @param {number} i - Position among the elements the step found
     *     something in, from zero.
     * @param {number} from - First value (Od).
     * @param {number} step - Increment (Krok), may be negative or 0.
     * @param {number} repeats - How often each value is used, at least 1.
     * @param {number} reset - Elements after which the series returns to
     *     from; 0 (or less) for never.
     * @returns {number} The value.
     */
    valueAt: function (i, from, step, repeats, reset) {
        return from + step * BTE.Steps.stepsAt(i, repeats, reset);
    },

    /**
     * A value as the text written into the document. Integer-only string
     * building, never toFixed (the engine rounds differently, research 7.4).
     * Format "1": a minus sign, then the absolute value padded with zeros to
     * digits. Format "A" / "a": bijective base 26 (1 = A, 26 = Z, 27 = AA),
     * digits is ignored; a value below 1 has no letters and gives "" (the
     * Number step refuses such values before it formats). Any other format
     * is read as "1". A value that is not a whole number within +-MAX_SAFE
     * (NaN, Infinity, 1e22, 2.5) has no text and gives "" in either format,
     * so this never loops on Infinity and never prints "1e+22".
     * @param {number} v - A whole number.
     * @param {string} format - "1", "A" or "a".
     * @param {number} digits - Minimum number of digits for format "1".
     * @returns {string} The text for the value.
     */
    formatValue: function (v, format, digits) {
        var alphabet, out;
        if (!(Math.abs(v) <= BTE.Steps.MAX_SAFE) || Math.floor(v) !== v) { return ""; }
        if (format === "A" || format === "a") {
            alphabet = format === "A" ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "abcdefghijklmnopqrstuvwxyz";
            out = "";
            while (v > 0) {
                out = alphabet.charAt((v - 1) % 26) + out;
                v = Math.floor((v - 1) / 26);
            }
            return out;
        }
        return (v < 0 ? "-" : "") + BTE.Utils.pad(digits, Math.abs(v));
    },

    /**
     * Number step: every element the step finds something in gets the next
     * value of the series, and all its matches get that same value (spec
     * decision 9: "{n}/{n}" in one element is 001/001). A text or element
     * without a match consumes nothing. Kde "first" is the first run of
     * digits [0-9]+ in the element's texts, in text order (spec 5.3); the
     * other kinds go through compile() and are case-sensitive.
     * Od, Krok, Číslic, Opakovat and Znovu po are checked before anything is
     * matched: whole numbers, Číslic and Opakovat at least 1, Číslic at most
     * MAX_DIGITS (Číslic only for the numeric format); every field is a
     * whole number within +-MAX_SAFE, and a series that would leave that
     * range fails with ERR_VALUE_RANGE and writes nothing. Blank Do and Znovu po mean none, blank Opakovat
     * means 1. The Do check warns when the last value differs from Do, and
     * names the missing or extra elements when the series is a plain count
     * (repeats 1, no reset, step not 0) that Do falls on.
     * @param {Array.<Array.<string>>} state - Per element, the texts it holds.
     * @param {Object} step - A number step.
     * @returns {{error: Object|null, edits: Array, warns: Array, multi: Array}}
     *     The step result run() merges into StepInfo.
     */
    number: function (state, step) {
        var letters = step.format === "A" || step.format === "a";
        var specs = [
            ["from", "FIELD_FROM", undefined, null],
            ["to", "FIELD_TO", null, null],
            ["step", "FIELD_STEP", undefined, null],
            ["digits", "FIELD_DIGITS", undefined, 1],
            ["repeats", "FIELD_REPEATS", 1, 1],
            ["reset", "FIELD_RESET", null, null]
        ];
        var vals = { digits: 1 };
        var edits = [];
        var warns = [];
        var multi = [];
        var found = [];
        var first = !!(step.where && step.where.kind === "first");
        var re, c, f, i, j, k, texts, hits, ms, m, reset, v, last, span, want, text;

        if (first) {
            re = new RegExp("[0-9]+", "g");
        } else {
            c = BTE.Steps.compile(step.where, false);
            if (c.error) { return BTE.Steps.failed(c.error); }
            re = c.re;
        }

        for (k = 0; k < specs.length; k++) {
            // The digit count means nothing for letters, so it is not checked.
            if (specs[k][0] === "digits" && letters) { continue; }
            f = BTE.Steps.intField(step[specs[k][0]], specs[k][1], specs[k][2], specs[k][3]);
            if (f.error) { return BTE.Steps.failed(f.error); }
            // pad() loops once per digit, so an unbounded Číslic in the live
            // preview could hang the modal dialog (ruling R13).
            if (specs[k][0] === "digits" && f.value > BTE.Steps.MAX_DIGITS) {
                return BTE.Steps.failed(BTE.Steps.msg("ERR_DIGITS_RANGE", [1, BTE.Steps.MAX_DIGITS]));
            }
            vals[specs[k][0]] = f.value;
        }
        reset = vals.reset === null ? 0 : vals.reset;

        for (i = 0; i < state.length; i++) {
            texts = state[i];
            hits = [];
            for (j = 0; j < texts.length; j++) {
                ms = BTE.Steps.matches(re, texts[j], first);
                for (m = 0; m < ms.length; m++) {
                    hits.push({ tx: j, start: ms[m].index, length: ms[m][0].length });
                }
                if (first && hits.length > 0) { break; }
            }
            if (hits.length > 0) { found.push({ el: i, hits: hits }); }
        }

        for (k = 0; k < found.length; k++) {
            // The increments are checked on their own too: a product beyond
            // 2^53 is already rounded, and adding a negative Od could bring
            // the sum back in range with a wrong last digit.
            if (Math.abs(vals.step * BTE.Steps.stepsAt(k, vals.repeats, reset)) > BTE.Steps.MAX_SAFE) {
                return BTE.Steps.failed(BTE.Steps.msg("ERR_VALUE_RANGE"));
            }
            v = BTE.Steps.valueAt(k, vals.from, vals.step, vals.repeats, reset);
            if (Math.abs(v) > BTE.Steps.MAX_SAFE) { return BTE.Steps.failed(BTE.Steps.msg("ERR_VALUE_RANGE")); }
            if (letters && v < 1) { return BTE.Steps.failed(BTE.Steps.msg("ERR_LETTER_BELOW_ONE")); }
            text = BTE.Steps.formatValue(v, step.format, vals.digits);
            hits = found[k].hits;
            for (m = 0; m < hits.length; m++) {
                edits.push({ el: found[k].el, tx: hits[m].tx, start: hits[m].start, length: hits[m].length, text: text });
            }
            if (hits.length > 1) { multi.push({ el: found[k].el, count: hits.length }); }
        }

        if (vals.to !== null && found.length > 0) {
            last = BTE.Steps.valueAt(found.length - 1, vals.from, vals.step, vals.repeats, reset);
            if (last !== vals.to) {
                warns.push(BTE.Steps.msg("WARN_TO_MISMATCH", [String(last), String(vals.to)]));
                // A plain count (one element per value, no reset) knows how
                // many elements Do would have needed, when it is on the series.
                if (vals.repeats === 1 && reset <= 0 && vals.step !== 0) {
                    span = vals.to - vals.from;
                    if (span % vals.step === 0) {
                        want = span / vals.step + 1;
                        if (want > found.length) {
                            warns.push(BTE.Steps.msg("WARN_MISSING", [String(want - found.length)]));
                        } else if (want >= 1) {
                            warns.push(BTE.Steps.msg("WARN_EXTRA", [String(found.length - want)]));
                        }
                    }
                }
            }
        }
        return { error: null, edits: edits, warns: warns, multi: multi };
    },

    /**
     * The CaseChangeType member each case mode stands for. The write calls
     * range.changeCaseTo(CaseChangeType[BTE.Steps.CASE_MAP[mode]]).
     * @type {Object.<string, string>}
     */
    CASE_MAP: { upper: "UPPERCASE", lower: "LOWERCASE", title: "TITLECASE", sentence: "SENTENCECASE" },

    /**
     * Letters the engine maps to more than one letter, or to a letter the
     * string functions of the ExtendScript engine leave alone (its
     * toUpperCase is the simple mapping: "ß" stays "ß", and the titlecase
     * digraph "ǅ" stays "ǅ" in either direction, measured). changeCaseTo
     * does the full mapping. Measured: ß, ǅ and its family ǆ Ǆ, ǉ, ﬁ and İ;
     * the other entries are the same Unicode rule for the sibling letters
     * and were not measured. A table beats the host's functions here because
     * the host differs: Node (the tests) does the full mapping, the
     * ExtendScript engine does not.
     * @type {Object.<string, string>}
     */
    CASE_UPPER: {
        "ß": "SS", "ﬀ": "FF", "ﬁ": "FI", "ﬂ": "FL", "ﬃ": "FFI", "ﬄ": "FFL", "ﬅ": "ST", "ﬆ": "ST",
        "ǅ": "Ǆ", "ǈ": "Ǉ", "ǋ": "Ǌ", "ǲ": "Ǳ"
    },

    /**
     * Lowercase exceptions, see CASE_UPPER. "İ" becomes "i" plus the
     * combining dot above (U+0307), measured.
     * @type {Object.<string, string>}
     */
    CASE_LOWER: {
        "İ": "i" + String.fromCharCode(775),
        "ǅ": "ǆ", "ǈ": "ǉ", "ǋ": "ǌ", "ǲ": "ǳ"
    },

    /**
     * Titlecase of a letter that starts a word or a sentence, where it is
     * not its uppercase, see CASE_UPPER: "ß" is "Ss", "ﬁ" is "Fi", and a
     * digraph has a titlecase letter of its own whichever form it is in.
     * @type {Object.<string, string>}
     */
    CASE_TITLE: {
        "ß": "Ss", "ﬀ": "Ff", "ﬁ": "Fi", "ﬂ": "Fl", "ﬃ": "Ffi", "ﬄ": "Ffl", "ﬅ": "St", "ﬆ": "St",
        "ǆ": "ǅ", "ǅ": "ǅ", "Ǆ": "ǅ", "ǉ": "ǈ", "ǈ": "ǈ", "Ǉ": "ǈ",
        "ǌ": "ǋ", "ǋ": "ǋ", "Ǌ": "ǋ", "ǳ": "ǲ", "ǲ": "ǲ", "Ǳ": "ǲ"
    },

    /**
     * Word rules of Unicode UAX 29, cut to the characters text in this tool
     * contains. The engine's titlecasing follows them (measured, see
     * docs/findings.md). A character of this set joins two letters when it
     * stands between them ("a:b").
     * @type {string}
     */
    WORD_MID_LETTER: ":·",

    /**
     * A character of this set joins two digits when it stands between them
     * ("1,5").
     * @type {string}
     */
    WORD_MID_NUM: ",;",

    /**
     * A character of this set joins two letters or two digits ("a.b",
     * "1.5", "don't", also with the curly single quotes).
     * @type {string}
     */
    WORD_MID_BOTH: ".'‘’",

    /**
     * A full stop, "!" and "?" end a sentence (sentence rules of UAX 29,
     * measured), with the exceptions sentenceStarts() lists.
     * @type {string}
     */
    SENTENCE_STOP: ".!?",

    /**
     * A character of this set after a stop (and its spaces) keeps the
     * sentence going: "škola. , Druhá" is one sentence.
     * @type {string}
     */
    SENTENCE_CONTINUE: ",-:;–—",

    /**
     * Closing quotes and brackets (and the plain quotes) belong to the
     * sentence they follow: in `škola." Druhá` the break is after the quote.
     * @type {string}
     */
    SENTENCE_CLOSE: "\"'()[]{}«»‘’‚‛“”„‟‹›",

    /**
     * Whether a character is one of the characters of a set. An empty string
     * (a read past the end of a text) is in no set.
     * @param {string} set - The characters.
     * @param {string} c - One character, or "".
     * @returns {boolean} True when c is in the set.
     */
    inSet: function (set, c) {
        return c !== "" && set.indexOf(c) !== -1;
    },

    /**
     * Upper or lower case of a text, character by character through the
     * exception table, the rest through the host's own function.
     * @param {string} s - The text.
     * @param {Object.<string, string>} table - CASE_UPPER or CASE_LOWER.
     * @param {boolean} up - True to uppercase, false to lowercase.
     * @returns {string} The text in the other case.
     */
    mapCase: function (s, table, up) {
        var out = "";
        var from = 0;
        var i, ch, part;

        for (i = 0; i < s.length; i++) {
            ch = s.charAt(i);
            if (table.hasOwnProperty(ch)) {
                part = s.substring(from, i);
                out += (up ? part.toUpperCase() : part.toLowerCase()) + table[ch];
                from = i + 1;
            }
        }
        part = s.substring(from);
        return out + (up ? part.toUpperCase() : part.toLowerCase());
    },

    /**
     * A text in capitals, as changeCaseTo(UPPERCASE) writes it.
     * @param {string} s - The text.
     * @returns {string} The text in capitals.
     */
    upperText: function (s) {
        return BTE.Steps.mapCase(s, BTE.Steps.CASE_UPPER, true);
    },

    /**
     * A text in small letters, as changeCaseTo(LOWERCASE) writes it.
     * @param {string} s - The text.
     * @returns {string} The text in small letters.
     */
    lowerText: function (s) {
        return BTE.Steps.mapCase(s, BTE.Steps.CASE_LOWER, false);
    },

    /**
     * Whether a character has a case: it changes in at least one direction.
     * @param {string} c - One character, or "".
     * @returns {boolean} True for a letter with upper and lower case.
     */
    isCased: function (c) {
        return c !== "" && (BTE.Steps.lowerText(c) !== c || BTE.Steps.upperText(c) !== c);
    },

    /**
     * Whether a character is a small letter (Unicode "Lower"): cased and
     * already in its lowercase form. "ß" is one.
     * @param {string} c - One character, or "".
     * @returns {boolean} True for a small letter.
     */
    isLowerLetter: function (c) {
        return BTE.Steps.isCased(c) && BTE.Steps.lowerText(c) === c;
    },

    /**
     * Whether a character is a capital or titlecase letter (Unicode
     * "Upper"): lowercasing changes it.
     * @param {string} c - One character, or "".
     * @returns {boolean} True for a capital.
     */
    isUpperLetter: function (c) {
        return c !== "" && BTE.Steps.lowerText(c) !== c;
    },

    /**
     * Whether a character is a space between words: a space, tab, no-break
     * space or one of the Unicode space characters, but not a paragraph break.
     * @param {string} c - One character, or "".
     * @returns {boolean} True for a space.
     */
    isSpace: function (c) {
        var n = c === "" ? -1 : c.charCodeAt(0);
        return n === 32 || n === 9 || n === 11 || n === 12 || n === 160 || n === 5760 ||
            (n >= 8192 && n <= 8202) || n === 8239 || n === 8287 || n === 12288;
    },

    /**
     * Whether a character ends a paragraph: the carriage return Illustrator
     * writes between paragraphs, a line feed, or a Unicode separator. The
     * soft line break U+0003 is not one, it is an ordinary character.
     * @param {string} c - One character, or "".
     * @returns {boolean} True for a paragraph separator.
     */
    isParaSep: function (c) {
        var n = c === "" ? -1 : c.charCodeAt(0);
        return n === 13 || n === 10 || n === 133 || n === 8232 || n === 8233;
    },

    /**
     * How a character takes part in a word (UAX 29, cut down): "L" a letter
     * with a case, "N" a digit, "X" an underscore (joins letters and digits),
     * "m" / "n" / "q" a character that joins two letters / two digits / either
     * when it stands between them, "E" a combining mark or format character
     * that belongs to the character before it, "" anything else (a break).
     * @param {string} c - One character, or "".
     * @returns {string} The class.
     */
    wordClass: function (c) {
        var T = BTE.Steps;
        var n;
        if (c === "") { return ""; }
        n = c.charCodeAt(0);
        if (n >= 48 && n <= 57) { return "N"; }
        if (c === "_") { return "X"; }
        if (T.inSet(T.WORD_MID_LETTER, c)) { return "m"; }
        if (T.inSet(T.WORD_MID_NUM, c)) { return "n"; }
        if (T.inSet(T.WORD_MID_BOTH, c)) { return "q"; }
        if ((n >= 768 && n <= 879) || n === 173 || n === 8205) { return "E"; }
        return T.isCased(c) ? "L" : "";
    },

    /**
     * The words of a text as [start, end) ranges, by the rules the engine's
     * titlecasing follows (measured): letters and digits run together, an
     * underscore joins them, a full stop, apostrophe or colon between two
     * letters (a.b, o'neil, a:b) and a full stop or comma between two digits
     * (1.5, 1,5) do not end the word, anything else (a space, a hyphen, a
     * slash, a bracket, a paragraph break) does. Combining marks stay with
     * their letter.
     * @param {string} s - The text.
     * @returns {Array.<Array.<number>>} Word ranges in order.
     */
    wordRuns: function (s) {
        var T = BTE.Steps;
        var runs = [];
        var n = s.length;
        var i = 0;
        var start, last, c, j, next;

        while (i < n) {
            last = T.wordClass(s.charAt(i));
            if (last !== "L" && last !== "N" && last !== "X") { i++; continue; }
            start = i;
            i++;
            while (i < n) {
                c = T.wordClass(s.charAt(i));
                if (c === "E") { i++; continue; }
                if (c === "L" || c === "N" || c === "X") { last = c; i++; continue; }
                if (c === "m" || c === "n" || c === "q") {
                    j = i + 1;
                    while (j < n && T.wordClass(s.charAt(j)) === "E") { j++; }
                    next = j < n ? T.wordClass(s.charAt(j)) : "";
                    if (last === "L" && next === "L" && c !== "n") { i = j; continue; }
                    if (last === "N" && next === "N" && c !== "m") { i = j; continue; }
                }
                break;
            }
            runs.push([start, i]);
        }
        return runs;
    },

    /**
     * Where the sentences of a text start, by the rules the engine follows
     * (UAX 29, measured): a paragraph break ends a sentence; ".", "!" and "?"
     * end one after any closing quotes or brackets and spaces, except that
     * a full stop does not end it when a digit follows at once (3.14), when
     * a capital follows a letter and the stop at once (A.B), or when the next
     * letter is small ("a. b", "odstavec. třetí"); and no stop ends it when
     * a comma, hyphen, colon, semicolon, dash or another stop comes next.
     * @param {string} s - The text.
     * @returns {Array.<number>} Start of every sentence, the first is 0.
     */
    sentenceStarts: function (s) {
        var T = BTE.Steps;
        var n = s.length;
        var starts = [0];
        var i = 0;
        var c, q, k, d, p, hold;

        while (i < n) {
            c = s.charAt(i);
            if (T.isParaSep(c)) {
                i++;
                if (c === "\r" && s.charAt(i) === "\n") { i++; }
                if (i < n) { starts.push(i); }
                continue;
            }
            if (!T.inSet(T.SENTENCE_STOP, c)) { i++; continue; }

            q = i + 1;
            while (q < n && T.inSet(T.SENTENCE_CLOSE, s.charAt(q))) { q++; }
            while (q < n && T.isSpace(s.charAt(q))) { q++; }
            if (q >= n || T.isParaSep(s.charAt(q))) { i = q; continue; }

            d = s.charAt(q);
            hold = T.inSet(T.SENTENCE_CONTINUE, d) || T.inSet(T.SENTENCE_STOP, d);
            if (!hold && c === ".") {
                if (s.charAt(i + 1) >= "0" && s.charAt(i + 1) <= "9") {
                    hold = true;
                } else if (T.isUpperLetter(s.charAt(i + 1))) {
                    p = i - 1;
                    while (p > 0 && T.wordClass(s.charAt(p)) === "E") { p--; }
                    hold = p >= 0 && T.isCased(s.charAt(p));
                }
                if (!hold) {
                    k = q;
                    while (k < n && !T.isCased(s.charAt(k)) && !T.isParaSep(s.charAt(k)) && !T.inSet(T.SENTENCE_STOP, s.charAt(k))) { k++; }
                    hold = k < n && T.isLowerLetter(s.charAt(k));
                }
            }
            if (!hold) { starts.push(q); }
            i = q;
        }
        return starts;
    },

    /**
     * Titlecase of one letter: its entry in CASE_TITLE, else its uppercase.
     * @param {string} c - One character.
     * @returns {string} The character that starts a word.
     */
    titleChar: function (c) {
        return BTE.Steps.CASE_TITLE.hasOwnProperty(c) ? BTE.Steps.CASE_TITLE[c] : BTE.Steps.upperText(c);
    },

    /**
     * One word or sentence in title form, as ICU does it and the engine
     * shows (measured): the first letter or digit gets the titlecase form
     * and all that follows is lowercased; what comes before it (an
     * underscore, a bracket, a quote) is left as it is. A segment that
     * starts with a digit has no capital (3abc, 1_a).
     * @param {string} seg - A word or a sentence.
     * @returns {string} The segment in title form.
     */
    titleSegment: function (seg) {
        var T = BTE.Steps;
        var i = 0;
        var c;

        while (i < seg.length) {
            c = seg.charAt(i);
            if ((c >= "0" && c <= "9") || T.isCased(c)) { break; }
            i++;
        }
        if (i >= seg.length) { return seg; }
        return seg.substring(0, i) + T.titleChar(seg.charAt(i)) + T.lowerText(seg.substring(i + 1));
    },

    /**
     * A text in a case mode: the preview's emulation of what
     * range.changeCaseTo(CaseChangeType[CASE_MAP[mode]]) writes, held to the
     * engine's output by tests/test_steps_case.js (measured pairs, see
     * docs/findings.md). It takes the text of a range alone: changeCaseTo
     * treats a range as a text of its own (measured), so "cd" inside
     * "abcdef" is "Cd" in title mode, whatever surrounds it.
     * @param {string} mode - "upper", "lower", "title" (each word) or
     *     "sentence" (the first letter of each sentence, the rest small).
     * @param {string} s - The text.
     * @returns {string} The text in the mode.
     * @throws {Error} For an unknown mode: a bug in the caller.
     */
    caseText: function (mode, s) {
        var T = BTE.Steps;
        var out = "";
        var last = 0;
        var parts, i;

        if (mode === "upper") { return T.upperText(s); }
        if (mode === "lower") { return T.lowerText(s); }
        if (mode === "title") {
            parts = T.wordRuns(s);
            for (i = 0; i < parts.length; i++) {
                out += s.substring(last, parts[i][0]) + T.titleSegment(s.substring(parts[i][0], parts[i][1]));
                last = parts[i][1];
            }
            return out + s.substring(last);
        }
        if (mode === "sentence") {
            parts = T.sentenceStarts(s);
            for (i = 0; i < parts.length; i++) {
                out += T.titleSegment(s.substring(parts[i], i + 1 < parts.length ? parts[i + 1] : s.length));
            }
            return out;
        }
        throw new Error("BTE.Steps: unknown case mode \"" + mode + "\"");
    },

    /**
     * One edit of the Case step. It carries the emulated result in `text`
     * like every edit, so the preview builds its strings the one way
     * applyEdits does, and `caseMode` besides, which tells the write to
     * call changeCaseTo on the range instead of replacing its contents (the
     * range keeps its formatting). The post-write check compares the
     * document with `text`.
     * @param {string} mode - The case mode.
     * @param {number} el - Element index.
     * @param {number} tx - Text index within the element.
     * @param {number} start - Offset of the range.
     * @param {string} original - The text in the range.
     * @returns {{el: number, tx: number, start: number, length: number, text: string, caseMode: string}}
     *     The edit.
     */
    caseEdit: function (mode, el, tx, start, original) {
        return {
            el: el, tx: tx, start: start, length: original.length,
            text: BTE.Steps.caseText(mode, original), caseMode: mode
        };
    },

    /**
     * Case step: changes the case of every match of Kde, or of the whole
     * text of every text in the element (Celý text, first in the dropdown,
     * spec 5.2). Variable and text are literal and case-sensitive, a regex
     * follows the global rules; there is no Rozlišovat velká a malá here. Each
     * match is a range of its own for changeCaseTo. A blank text (empty, only
     * spaces or paragraph breaks) has nothing to change and gets no edit
     * under Celý text.
     * @param {Array.<Array.<string>>} state - Per element, the texts it holds.
     * @param {Object} step - A case step; mode is a key of CASE_MAP.
     * @returns {{error: Object|null, edits: Array, warns: Array, multi: Array}}
     *     The step result run() merges into StepInfo.
     * @throws {Error} For an unknown mode: a bug in the caller (the preset
     *     loader fills in the default).
     */
    caseStep: function (state, step) {
        var T = BTE.Steps;
        var all = !!(step.where && step.where.kind === "all");
        var edits = [];
        var c, i, j, k, texts, found;

        if (!T.CASE_MAP.hasOwnProperty(step.mode)) {
            throw new Error("BTE.Steps: unknown case mode \"" + step.mode + "\"");
        }
        if (!all) {
            c = T.compile(step.where, false);
            if (c.error) { return T.failed(c.error); }
        }

        for (i = 0; i < state.length; i++) {
            texts = state[i];
            for (j = 0; j < texts.length; j++) {
                if (all) {
                    if (BTE.Utils.strip(texts[j]) !== "") { edits.push(T.caseEdit(step.mode, i, j, 0, texts[j])); }
                    continue;
                }
                found = T.matches(c.re, texts[j], false);
                for (k = 0; k < found.length; k++) {
                    edits.push(T.caseEdit(step.mode, i, j, found[k].index, found[k][0]));
                }
            }
        }
        return { error: null, edits: edits, warns: [], multi: [] };
    },

    /**
     * Runs one step of any type.
     * An unknown type is a bug in the caller (the preset loader drops them),
     * so it throws instead of passing the text on unchanged.
     * @param {Array.<Array.<string>>} state - Input of the step.
     * @param {Object} step - Step object (the preset format).
     * @returns {{error: Object|null, edits: Array, warns: Array, multi: Array}}
     *     The step result run() merges into StepInfo.
     */
    apply: function (state, step) {
        if (step.type === "replace") { return BTE.Steps.replace(state, step); }
        if (step.type === "number") { return BTE.Steps.number(state, step); }
        if (step.type === "case") { return BTE.Steps.caseStep(state, step); }
        throw new Error("BTE.Steps: unknown step type \"" + step.type + "\"");
    },

    /**
     * Checks one edit against the text it is applied to, before applyEdits
     * uses it. A broken edit list is a bug in a step handler, and writing
     * "undefined" into a label or dropping an edit without a word would hide
     * it, so every slip throws: no text (the Case step's edits carry their
     * result in `text` too, a caseMode alone is not enough), an unknown
     * caseMode, a start before the end of the previous edit (edits must be
     * in ascending order and must not overlap), a negative or missing
     * length, a range past the end of the text.
     * @param {Object} e - The edit.
     * @param {string} s - The text the edit is relative to.
     * @param {number} pos - End of the previous edit in this text, or 0.
     * @throws {Error} Naming the slip.
     */
    checkEdit: function (e, s, pos) {
        var where = "BTE.Steps.applyEdits: edit at element " + e.el + ", text " + e.tx + ", start " + e.start;
        if (typeof e.text !== "string") { throw new Error(where + " has no text"); }
        if (e.caseMode !== undefined && !BTE.Steps.CASE_MAP.hasOwnProperty(e.caseMode)) {
            throw new Error(where + " has an unknown caseMode \"" + e.caseMode + "\"");
        }
        if (!(e.start >= pos)) { throw new Error(where + " overlaps or precedes the previous edit"); }
        if (!(e.length >= 0)) { throw new Error(where + " has no valid length"); }
        if (e.start + e.length > s.length) { throw new Error(where + " reaches past the end of the text"); }
    },

    /**
     * Builds the texts after a step from its edits. The one code path both
     * the preview and the write use for what a step produces. Edits must be
     * ordered by element, text and start, as the step handlers emit them,
     * and must not overlap; each has a string `text` (a Case edit has its
     * emulated result there and a `caseMode` besides). A list that breaks
     * this throws, no edit is skipped or half applied silently. Always
     * returns new arrays.
     * @param {Array.<Array.<string>>} state - Input of the step.
     * @param {Array.<{el: number, tx: number, start: number, length: number, text: string, caseMode: (string|undefined)}>} edits
     *     Edits relative to the texts in state.
     * @returns {Array.<Array.<string>>} The state after the step.
     * @throws {Error} For an edit that is unusable, out of order, overlapping
     *     or aimed at an element or text that does not exist.
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
                    BTE.Steps.checkEdit(e, s, pos);
                    built += s.substring(pos, e.start) + e.text;
                    pos = e.start + e.length;
                    k++;
                }
                row.push(built + s.substring(pos));
            }
            out.push(row);
        }
        if (k < edits.length) {
            throw new Error("BTE.Steps.applyEdits: edit " + k + " (element " + edits[k].el + ", text " + edits[k].tx +
                ") is out of order or aimed at a text that does not exist");
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
     *     edits = [{el, tx, start, length, text}] relative to the step's input;
     *     a Case step's edits carry a `caseMode` besides (see caseEdit).
     * @throws {Error} For an unknown step type, an unknown case mode or a
     *     broken edit list: bugs in the caller or in a step handler.
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
