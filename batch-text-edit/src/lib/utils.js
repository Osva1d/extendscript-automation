// ------------------------------------------------------------------------
// Module: BTE.Utils — ES3 helpers the engine lacks (indexOf, isArray, strip),
//         regex escaping, zero padding, preset comparison
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
    },

    /**
     * Whether a value is an array. Array.isArray does not exist in the engine.
     * @param {*} x - Any value.
     * @returns {boolean} True for an array.
     */
    isArray: function (x) {
        return Object.prototype.toString.call(x) === "[object Array]";
    },

    /**
     * Deep comparison of two preset values ({order, steps: [...]}), read by
     * the shared UIState.isModified. The flat comparison the other tools use
     * would call two different step lists equal ("[object Object]" on both
     * sides). Plain data only: objects, arrays, strings, numbers, booleans.
     * Key order does not matter; there is no coercion ("1" differs from 1,
     * Storage.normalize has already made every field the type it is stored
     * as).
     * @param {*} a - First value.
     * @param {*} b - Second value.
     * @returns {boolean} True when both hold the same data.
     */
    presetEquals: function (a, b) {
        var k, i;
        if (a === b) { return true; }
        if (!a || !b || typeof a !== "object" || typeof b !== "object") { return false; }
        if (BTE.Utils.isArray(a) !== BTE.Utils.isArray(b)) { return false; }
        if (BTE.Utils.isArray(a)) {
            if (a.length !== b.length) { return false; }
            for (i = 0; i < a.length; i++) {
                if (!BTE.Utils.presetEquals(a[i], b[i])) { return false; }
            }
            return true;
        }
        for (k in a) {
            if (a.hasOwnProperty(k)) {
                if (!b.hasOwnProperty(k) || !BTE.Utils.presetEquals(a[k], b[k])) { return false; }
            }
        }
        for (k in b) {
            if (b.hasOwnProperty(k) && !a.hasOwnProperty(k)) { return false; }
        }
        return true;
    }
};
