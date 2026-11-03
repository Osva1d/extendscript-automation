// ------------------------------------------------------------------------
// Module: BTE.Vars — finds {variables} in texts so steps and the dialog can
//         offer them
// Part of: Illustrator Batch Text Edit
// Depends on: BTE.Utils
// ------------------------------------------------------------------------
var BTE = BTE || {};

BTE.Vars = {
    /**
     * Regex source of one {variable}: braces around one or more characters
     * that are neither a brace, a paragraph break (\r) nor a soft line break
     * (U+0003). Spaces, digits and diacritics are allowed. Kept as a source
     * string, not a RegExp: the engine's lastIndex handling is unmeasured and
     * looks unreliable (/a/g.test twice returned true, true,
     * docs/reports/2026-10-28-text-chain-research.md §7.4), so the code never
     * depends on it and every use builds a fresh new RegExp(SOURCE, "g").
     * @type {string}
     */
    SOURCE: "\\{[^{}\\r\\u0003]+\\}",

    /**
     * All variables in one text, in order of appearance, duplicates kept.
     * @param {string} s - Text to scan.
     * @returns {Array.<string>} Matches including braces, e.g. ["{kód}", "{n}"].
     */
    inText: function (s) {
        var found = String(s).match(new RegExp(BTE.Vars.SOURCE, "g"));
        return found === null ? [] : found;
    },

    /**
     * Variables across a set of elements, with how many elements use each.
     * An element counts once per name however often the name occurs in its
     * texts ("{n}/{n}" is one use, it consumes one number). Named list, not
     * find, because the lint rule bans the property name "find" on any object.
     * @param {Array.<Array.<string>>} state - Per element, the texts it holds.
     * @returns {Array.<{name: string, count: number}>} Ordered by first
     *     occurrence (element order, then text order, then position).
     */
    list: function (state) {
        var names = [];
        var counts = [];
        var result = [];
        var i, j, k, texts, seen, found, at;

        for (i = 0; i < state.length; i++) {
            texts = state[i];
            seen = [];
            for (j = 0; j < texts.length; j++) {
                found = BTE.Vars.inText(texts[j]);
                for (k = 0; k < found.length; k++) {
                    if (BTE.Utils.indexOf(seen, found[k]) !== -1) { continue; }
                    seen.push(found[k]);
                    at = BTE.Utils.indexOf(names, found[k]);
                    if (at === -1) {
                        names.push(found[k]);
                        counts.push(1);
                    } else {
                        counts[at]++;
                    }
                }
            }
        }

        for (i = 0; i < names.length; i++) {
            result.push({ name: names[i], count: counts[i] });
        }
        return result;
    }
};
