var TP = TP || {};

TP.Utils = {
    /**
     * Converts millimeters to points.
     * @param {number} mm - Value in millimeters.
     * @returns {number} Value in points.
     */
    mm2pt: function (mm) { return mm * 2.834645669291339; },

    /**
     * Converts points to millimeters.
     * @param {number} pt - Value in points.
     * @returns {number} Value in millimeters.
     */
    pt2mm: function (pt) { return pt / 2.834645669291339; },

    /**
     * Retrieves the scale factor of the active document (Large Canvas support).
     * Returns 1 for standard documents, 10 for Large Canvas mode.
     * @returns {number} Scale factor.
     */
    getSF: function () {
        try {
            if (app.documents.length === 0) return 1;
            return app.activeDocument.scaleFactor || 1;
        } catch (e) {
            return 1;
        }
    },

    /**
     * Rounds a millimeter value for display.
     * @param {number} val - Value to round.
     * @param {number} [decimals=1] - Decimal places.
     * @returns {number} Rounded value.
     */
    roundMM: function (val, decimals) {
        var d = (decimals !== undefined) ? decimals : 1;
        var f = Math.pow(10, d);
        return Math.round(val * f) / f;
    },

    /**
     * Validates a numerical input within a range.
     * Normalizes Czech decimal separator (comma -> dot) before parsing.
     * Returns null and shows alert if invalid; keeps dialog open.
     * @param {string|number} val - The value to validate.
     * @param {number} min - Minimum allowed value (inclusive).
     * @param {number} max - Maximum allowed value (inclusive).
     * @param {string} name - Display name used in error messages.
     * @returns {number|null} Validated number or null if invalid.
     */
    validateNumber: function (val, min, max, name) {
        var str = String(val).replace(/,/g, ".");
        var n = Number(str);
        if (isNaN(n)) {
            alert(TP.L.format(TP.L.ERR_MUST_BE_NUMBER, name));
            return null;
        }
        if (n < min || n > max) {
            alert(TP.L.format(TP.L.ERR_OUT_OF_RANGE, name, min, max));
            return null;
        }
        return n;
    },

    /**
     * Writes a debug message to the ExtendScript console.
     * Only active when TP.Config.debug is true.
     * @param {string} msg - Message to log.
     */
    log: function (msg) {
        if (TP.Config && TP.Config.debug) {
            $.writeln("[TP] " + msg);
        }
    }
};
