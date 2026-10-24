// ------------------------------------------------------------------------
// Module: Numbers (shared) — number fields: reading the text, writing it back
// Part of: shared core (grommet-marks, tile-export, zund-summa-marks;
//          extendscript-ui-standards §12.3)
//
// Namespace-neutral factory: buildNumbers(NS) registers NS.Numbers on the
// namespace object passed in. A tool's build cats this file and appends its
// own call — buildNumbers(TE);. Tests eval this file, then call the factory
// with their mock namespace.
//
// Optional dependency: NS.L.DEC_SEP, the locale's decimal separator, used by
// format() when no separator is passed.
//
// parse() is tile-export's TE.Utils.parseNumber, unchanged. grommet-marks and
// zund-summa-marks each fixed the same class of typo on their own, through
// Number(), and the three drifted apart: "0x10" read as 16 there, as invalid
// here (follow-up audit 2026-10-17, N1) — until grommet-marks 1.4.0 and
// zund-summa-marks 1.2.0 took this module. One grammar for the family is the
// "fix once, holds there too" criterion docs/decisions.md asks for.
// ------------------------------------------------------------------------
function buildNumbers(NS) {
    NS.Numbers = {
        /**
         * Field text to a number. A decimal comma or dot, spaces around
         * ignored; anything else — "1O5", "1 000", "20 mm", "1e3", "0x10",
         * ".5", an empty field — is NaN, never a different number. Each
         * caller decides what an empty field falls back to, where its tip
         * says it has one.
         * @param {string|number} val - Raw field text.
         * @returns {number} The number, or NaN.
         */
        parse: function (val) {
            var str = (val === null || val === undefined) ? "" : String(val).replace(/^\s+|\s+$/g, "");
            if (!/^[+-]?\d+([.,]\d+)?$/.test(str)) { return NaN; }
            return Number(str.replace(",", "."));
        },

        /**
         * A number as field text, with the locale's decimal separator and
         * without rounding: 2.5 is "2,5" in Czech, 0.25 stays "0,25". parse()
         * reads both separators, so the value comes back unchanged. NaN,
         * Infinity, null and undefined give an empty field — never "NaN" —
         * which the field's check then names.
         * @param {*} v - Stored value.
         * @param {string} [sep] - Decimal separator; NS.L.DEC_SEP, else ".".
         * @returns {string} Field text.
         */
        format: function (v, sep) {
            if (v === null || v === undefined || v === "") { return ""; }
            var n = (typeof v === "number") ? v : Number(v);
            if (!isFinite(n)) { return ""; }
            var s = sep || (NS.L && NS.L.DEC_SEP) || ".";
            return String(n).replace(".", s);
        }
    };
}
