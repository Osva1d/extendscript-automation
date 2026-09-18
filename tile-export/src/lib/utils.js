// ------------------------------------------------------------------------
// Module: TE.Utils — mm/pt conversion, scale composition, ES3 helpers
// Part of: Illustrator Tile Export
// Depends on: TE.L
// ------------------------------------------------------------------------
var TE = TE || {};

TE.Utils = {
    /**
     * Converts millimeters to points.
     * @param {number} mm - Value in millimeters.
     * @returns {number} Value in points.
     */
    mm2pt: function (mm) { return mm * 2.83464567; },

    /**
     * Converts points to millimeters.
     * @param {number} pt - Value in points.
     * @returns {number} Value in millimeters.
     */
    pt2mm: function (pt) { return pt / 2.83464567; },

    /**
     * Illustrator Large Canvas factor of the active document.
     * @returns {number} 1 for a standard document, 10 for Large Canvas.
     */
    getSF: function () {
        try {
            if (app.documents.length === 0) { return 1; }
            return app.activeDocument.scaleFactor || 1;
        } catch (e) {
            return 1;
        }
    },

    /**
     * Effective scale factor — composes the Large Canvas factor Illustrator
     * reports itself with the manual 1:N scale it cannot report.
     *
     * SINGLE SOURCE OF TRUTH. Every conversion between user-entered real-world
     * millimetres and document points MUST route through toDoc()/fromDoc(),
     * which use this. Never call getSF() directly for geometry.
     *
     * Past bug (zund-summa-marks v26.4.0): draw.js used getSF() alone, so in a
     * 1:10 workflow mark positions were scaled but mark sizes were not. Here
     * the same mistake would produce panels in the right places with a
     * tenfold overlap.
     *
     * @param {Object} s - Settings carrying scaleN.
     * @returns {number} getSF() * scaleN, never 0 or NaN.
     */
    getEffectiveSF: function (s) {
        return this.getSF() * this.manualScale(s);
    },

    /**
     * The user's manual 1:N, clamped: a missing, zero or nonsense value is 1.
     * @param {Object} s - Settings carrying scaleN.
     * @returns {number} N >= 1.
     */
    manualScale: function (s) {
        var n = (s && s.scaleN) ? Number(s.scaleN) : 1;
        if (isNaN(n) || n < 1) { n = 1; }
        return n;
    },

    /**
     * Output scale of a panel's temporary document: its points per point of
     * the source document. THE ONE RULE — the export sizes the panel with it
     * and the validation measures the panel with it. They used to keep a copy
     * each, and a change to one would have had validation checking a size the
     * export never produced.
     *
     * "Same as document" means what the rulers show. For an ordinary document
     * that is its own coordinates, so 1. A Large Canvas is stored at 1/sf and
     * displayed at full size, so its rulers show sf times the coordinates and
     * that is what it exports — before N1 it meant the raw coordinates, a size
     * the user never sees and a temporary document cannot hold. The manual 1:N
     * is the user's own drawing scale: kept by "same as document", undone by
     * "1:1 actual size".
     *
     * sf is the SOURCE document's Large Canvas factor, passed in rather than
     * read from app.activeDocument: during an export the active document is the
     * temporary one, which is never Large Canvas.
     *
     * @param {Object} s - Settings (exportScale, scaleN).
     * @param {number} sf - Large Canvas factor of the source document, 1 if none.
     * @returns {number} sf, or sf * N for 1:1.
     */
    outputScale: function (s, sf) {
        var f = Number(sf) || 1;
        return (s.exportScale === "actual") ? f * this.manualScale(s) : f;
    },

    /**
     * Stroke points per printed point of trim line, in a panel's temporary
     * document. At 1:1 the line is its printed width; at the document's own
     * scale it is printed / N and the RIP scales it back up.
     *
     * The Large Canvas factor cancels out, which is the point: the old rule
     * divided the output scale by the effective factor of the ACTIVE document —
     * the temporary one, factor 1 — so a Large Canvas panel at 1:1 got a line
     * ten times too thick (N10).
     *
     * @param {Object} s - Settings (exportScale, scaleN).
     * @returns {number} 1, or 1/N at the document's own scale.
     */
    outputLineScale: function (s) {
        return (s.exportScale === "actual") ? 1 : 1 / this.manualScale(s);
    },

    /**
     * Real-world millimetres to document points.
     * @param {number} mm - Real-world millimetres.
     * @param {Object} s - Settings.
     * @returns {number} Points in document space.
     */
    toDoc: function (mm, s) {
        return this.mm2pt(mm) / this.getEffectiveSF(s);
    },

    /**
     * Document points to real-world millimetres.
     * @param {number} pt - Points in document space.
     * @param {Object} s - Settings.
     * @returns {number} Real-world millimetres.
     */
    fromDoc: function (pt, s) {
        return this.pt2mm(pt * this.getEffectiveSF(s));
    },

    /**
     * ES3 replacement for Array.prototype.indexOf, which the ExtendScript
     * engine genuinely does not have — measured, see
     * docs/extendscript-engine-facts.md. String.indexOf does exist and is
     * unaffected; the two look identical in code.
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
     * Text from a dialog field to a Number, accepting the Czech decimal comma.
     *
     * Otherwise exactly Number() — "" is 0, garbage is NaN — so every caller
     * keeps deciding for itself what an empty or invalid field falls back to.
     * Bare Number() rejects "0,3" as NaN, and the dialog's "|| fallback" then
     * swapped in a different value without a word: 1 pt for a line width,
     * zero for an overlap or an add.
     *
     * @param {string|number} val - Raw field text.
     * @returns {number} Parsed value, NaN when not numeric.
     */
    toNumber: function (val) {
        return Number(String(val).replace(/,/g, ".").replace(/^\s+|\s+$/g, ""));
    },

    /**
     * Millimetres for the dialog: rounded to a tenth, the locale's decimal
     * separator, and no trailing ",0" on a whole number.
     *
     * Whole millimetres were enough while a count divided 3000 into thousands.
     * Equal panels, guide rounding and decimal input make fractions ordinary,
     * and rounding them hid real differences — three 1026.67 mm panels showed
     * as 1027, which adds up to 3081 mm of material instead of 3080.
     *
     * Built from integer tenths rather than toFixed() or String(float), so no
     * engine's float formatting can leak a 1026.7000000001 into the dialog.
     *
     * @param {number} v - Millimetres.
     * @param {string} [sep] - Decimal separator, "." when omitted.
     * @returns {string} e.g. "1026,7", "1000", "-12,3".
     */
    formatMM: function (v, sep) {
        var n = Number(v);
        // Round the magnitude, not the signed value: Math.round takes a half
        // towards +infinity, so -12.25 would show as -12,2 beside 12,3.
        var t = Math.round(Math.abs(n) * 10);
        var sign = (n < 0 && t !== 0) ? "-" : "";   // never "-0"
        var whole = Math.floor(t / 10), tenth = t % 10;
        return sign + String(whole) + (tenth ? (sep || ".") + String(tenth) : "");
    },

    /**
     * Validates a numeric input. Normalises the Czech decimal comma and trims
     * whitespace. Returns null rather than a silent zero — Number("") is 0 in
     * JavaScript, which would turn an empty field into a valid measurement.
     * @param {string|number} val - Raw input.
     * @param {number} min - Minimum, inclusive.
     * @param {number} max - Maximum, inclusive.
     * @param {string} name - Display name used by the caller's message.
     * @returns {number|null} The number, or null when invalid.
     */
    validateNumber: function (val, min, max, name) {
        var str = String(val).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
        if (str === "") { return null; }
        var n = Number(str);
        if (isNaN(n)) { return null; }
        if (n < min || n > max) { return null; }
        return n;
    },

    /**
     * Debug log, silent unless TE.Config.debug is on.
     * @param {string} msg - Message to write.
     */
    log: function (msg) {
        try {
            if (TE.Config && TE.Config.debug) { $.writeln("[TE] " + msg); }
        } catch (e) {}
    }
};
