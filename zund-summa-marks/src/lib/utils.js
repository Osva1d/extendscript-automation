var ZSM = ZSM || {};

ZSM.Utils = {
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
     * Validates a numerical input within a range.
     * Normalizes Czech decimal separator (comma → dot) before parsing.
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
            alert(ZSM.L.format(ZSM.L.ERR_MUST_BE_NUMBER, name));
            return null;
        }
        if (n < min || n > max) {
            alert(ZSM.L.format(ZSM.L.ERR_OUT_OF_RANGE, name, min, max));
            return null;
        }
        return n;
    },

    /**
     * Writes a debug message to the ExtendScript console.
     * Only active when ZSM.Config.debug is true.
     * @param {string} msg - Message to log.
     */
    log: function (msg) {
        if (ZSM.Config && ZSM.Config.debug) {
            $.writeln("[ZSM] " + msg);
        }
    },

    /**
     * Displays a user-facing error alert with localized prefix.
     * @param {string} msg - Error message body.
     */
    error: function (msg) {
        alert(ZSM.L.ERROR_PREFIX + msg);
    }
};
