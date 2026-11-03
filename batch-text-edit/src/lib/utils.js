// ------------------------------------------------------------------------
// Module: BTE.Utils — ES3 helpers the engine lacks (indexOf, isArray, strip),
//         regex escaping, zero padding, preset comparison, the log file
// Part of: Illustrator Batch Text Edit
// Depends on: — (File, Folder and $ in log)
// ------------------------------------------------------------------------
var BTE = BTE || {};

BTE.Utils = {
    /** @type {string} Folder under Folder.userData that holds the log (and the settings). */
    LOG_FOLDER: "batch-text-edit",

    /** @type {string} The log file in that folder. */
    LOG_FILE: "bte.log",

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
    },

    /**
     * Local time as "YYYY-MM-DD HH:MM:SS" (the ISO date and time without the
     * zone; the log is read by the person who ran the script, on their clock).
     * @param {Date} d - The moment.
     * @returns {string} e.g. "2026-10-31 15:04:09".
     */
    stamp: function (d) {
        var pad = BTE.Utils.pad;
        return d.getFullYear() + "-" + pad(2, d.getMonth() + 1) + "-" + pad(2, d.getDate()) + " " +
            pad(2, d.getHours()) + ":" + pad(2, d.getMinutes()) + ":" + pad(2, d.getSeconds());
    },

    /**
     * Writes a diagnostic line where the maintainer can find it: to the
     * debug console ($.writeln) and appended to the log file under
     * Folder.userData, one line per entry ("stamp message", UTF-8, line
     * breaks in the message turned into spaces). Never throws and never
     * shows anything to the user. When the file cannot be written, the cause
     * is reported on the console; there is nowhere else to report it, and
     * the run goes on.
     * @param {string} msg - What happened (English, for the maintainer).
     */
    log: function (msg) {
        var U = BTE.Utils;
        var text = String(msg);
        var folder, f, wrote, closed;

        function report(why) {
            if (typeof $ !== "undefined" && $.writeln) { $.writeln("[BTE] Utils.log: " + why); }
        }

        if (typeof $ !== "undefined" && $.writeln) { $.writeln("[BTE] " + text); }
        try {
            folder = new Folder(Folder.userData + "/" + U.LOG_FOLDER);
            if (!folder.exists) { folder.create(); }
            f = new File(folder.fsName + "/" + U.LOG_FILE);
            f.encoding = "UTF-8";
            // writeln ends a line with CR on macOS unless told otherwise
            // (measured 2026-11-03): one endless line for tail and grep.
            f.lineFeed = "Unix";
            if (!f.open("a")) {
                report("log file not written: open(a) failed for " + f.fsName);
                return;
            }
            wrote = f.writeln(U.stamp(new Date()) + " " + text.replace(/[\r\n]+/g, " "));
            closed = f.close();
            if (!wrote || !closed) { report("log file not written: write/close failed for " + f.fsName); }
        } catch (e) {
            report("log file not written: " + e.message);
        }
    }
};
