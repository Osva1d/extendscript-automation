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
        var n = (s && s.scaleN) ? Number(s.scaleN) : 1;
        if (isNaN(n) || n < 1) { n = 1; }
        return this.getSF() * n;
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
