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
     * Effective scale factor — composes Illustrator Large Canvas factor
     * (auto-detected) with the user's manual 1:N scale (s.scaleN).
     *
     * SINGLE SOURCE OF TRUTH. Every place that converts between
     * "user-entered real-world mm" and "doc-space pt" MUST use this,
     * not raw getSF(). Past bug (v26.4.0 manual test): draw.js used
     * getSF() alone for mark size, so marks were not shrunk in 1:10
     * workflow even though positions were. Fixed by routing both
     * core.js math and draw.js render through this helper.
     *
     * @param {Object} s - Settings object (must carry scaleN; defaults to 1).
     * @returns {number} Composed factor: Large Canvas SF * manual scaleN.
     */
    getEffectiveSF: function (s) {
        var manualN = (s && s.scaleN) ? Number(s.scaleN) : 1;
        if (isNaN(manualN) || manualN < 1) manualN = 1;
        return this.getSF() * manualN;
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
        // Normalize: comma → dot (CZ locale), trim whitespace
        var str = String(val).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
        // JS quirk: Number("") === 0 and Number("  ") === 0, NOT NaN.
        // Treat empty/whitespace-only strings as invalid to prevent
        // silent 0-substitution when user clears a UI field.
        var n = (str === "") ? NaN : Number(str);
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
    },

    /**
     * Displays a non-fatal warning alert with a localized "warning" prefix.
     * Distinct from error() so post-completion notices (missing colour →
     * [Registration] fallback, colour assigned to a layer that matched no
     * paths) aren't mislabelled as errors — the operation still succeeded.
     * @param {string} msg - Warning message body.
     */
    warn: function (msg) {
        alert(ZSM.L.WARN_PREFIX + msg);
    },

    /**
     * Deep-equality test for two settings objects.
     * Used by the UI to detect "modified" state (UI values diverged
     * from the stored preset). Numeric coercion via String() so 5
     * and "5" compare equal — UI inputs are strings, stored values
     * may be numbers.
     *
     * Compares fixed schema fields (mode, gaps, sizes, color, etc.)
     * plus layers[] array (name+color per row). Extra fields outside
     * the schema are ignored.
     *
     * @param {Object} a - First settings object.
     * @param {Object} b - Second settings object.
     * @returns {boolean} True if all schema fields are equal.
     */
    presetEquals: function (a, b) {
        if (!a || !b) return false;
        var keys = ["mode", "gapInner", "gapOuter", "maxDist",
                    "feedTop", "feedBottom", "drawRed", "useArtboardBounds",
                    "markSizeZ", "markSizeS", "orientDist", "markColor",
                    "scaleN", "marksOnly"];
        for (var i = 0; i < keys.length; i++) {
            if (String(a[keys[i]]) !== String(b[keys[i]])) return false;
        }
        var aL = a.layers || [], bL = b.layers || [];
        if (aL.length !== bL.length) return false;
        for (var li = 0; li < aL.length; li++) {
            if ((aL[li].name || "")  !== (bL[li].name || ""))  return false;
            if ((aL[li].color || "") !== (bL[li].color || "")) return false;
        }
        return true;
    }
};
