// ------------------------------------------------------------------------
// Module: BTE.Utils — ES3 helpers the engine lacks (indexOf, strip), regex
//         escaping, zero padding
// Part of: Illustrator Batch Text Edit
// Depends on: —
// ------------------------------------------------------------------------
var BTE = BTE || {};

BTE.Utils = {
    /**
     * Position of an item in an array. Array.prototype.indexOf does not exist
     * in the ExtendScript engine (measured: typeof [].indexOf is "undefined"
     * and calling it throws); String.prototype.indexOf does and is unaffected.
     * @param {Array} arr - Array to search.
     * @param {*} item - Value to find, compared with ===.
     * @returns {number} Index, or -1 when absent.
     */
    indexOf: function (arr, item) {
        var i;
        for (i = 0; i < arr.length; i++) {
            if (arr[i] === item) { return i; }
        }
        return -1;
    },

    /**
     * Escapes a string so new RegExp() reads it literally.
     * @param {string} s - Text to match literally.
     * @returns {string} Text with every regex metacharacter backslashed.
     */
    escapeRegExp: function (s) {
        return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    },

    /**
     * Left-pads a whole number with zeros. Never truncates: a number wider
     * than the width comes back as it is.
     * @param {number} digits - Minimum width.
     * @param {number} n - The number.
     * @returns {string} e.g. pad(3, 7) -> "007", pad(1, 120) -> "120".
     */
    pad: function (digits, n) {
        var s = String(n);
        while (s.length < digits) { s = "0" + s; }
        return s;
    },

    /**
     * Strips JS \s whitespace from both ends. Named strip, not trim, because
     * the lint rule bans the property name "trim" on any object. \s in
     * ExtendScript does not match the soft line break U+0003 (measured,
     * docs/reports/2026-10-28-text-chain-research.md §7.4).
     * @param {string} s - Text to strip.
     * @returns {string} Text without leading and trailing \s whitespace.
     */
    strip: function (s) {
        return String(s).replace(/^\s+|\s+$/g, "");
    }
};
