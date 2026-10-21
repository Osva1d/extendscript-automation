// ------------------------------------------------------------------------
// Module: GM.Utils — shared utility functions
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS, GM.Numbers (shared/lib/numbers.js, for presetEquals)
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Utils = {
    /**
     * Writes a debug message to the ExtendScript console.
     * @param {string} msg - Message to log.
     */
    log: function (msg) {
        $.writeln("[GM] " + msg);
    },

    /**
     * Displays a user-facing error alert prefixed with script name.
     * @param {string} msg - Error message body.
     */
    error: function (msg) {
        alert(GM.CONSTANTS.SCRIPT_NAME + ": " + msg);
    },

    /**
     * Returns a deep copy of a JSON-serializable object.
     * @param {Object} obj - Source object.
     * @returns {Object} Independent copy.
     */
    deepCopy: function (obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Deep-equality test for two GM settings objects.
     * Used by the UI to detect "modified" state (UI values diverged
     * from the stored preset). Text fields compare through String(), so
     * true and "true" are equal. Number fields compare as numbers, read the
     * way the dialog reads them (GM.Numbers.parse): the dialog writes "2,5"
     * into a field where the preset holds 2.5, and those are one value. A
     * value that is no number on either side (a typo, a field the object
     * lacks) falls back to its text, so "abc" never equals 5.
     *
     * @param {Object} a - First settings object.
     * @param {Object} b - Second settings object.
     * @returns {boolean} True if all schema fields are equal.
     */
    presetEquals: function (a, b) {
        if (!a || !b) return false;

        function sameNumber(x, y) {
            var nx = GM.Numbers.parse(String(x)), ny = GM.Numbers.parse(String(y));
            if (isNaN(nx) || isNaN(ny)) return String(x) === String(y);
            return nx === ny;
        }
        // Compares the listed fields of two objects: text keys as text,
        // number keys as numbers.
        function sameFields(x, y, textKeys, numKeys) {
            var i;
            for (i = 0; i < textKeys.length; i++) {
                if (String(x[textKeys[i]]) !== String(y[textKeys[i]])) return false;
            }
            for (i = 0; i < numKeys.length; i++) {
                if (!sameNumber(x[numKeys[i]], y[numKeys[i]])) return false;
            }
            return true;
        }

        if (!sameFields(a, b, ["bottomMirror", "rightMirror", "units"],
                              ["offsetX", "offsetY", "markSize"])) return false;
        // Presence-guard the v5 fields: pre-v5 presets lack them. Storage.load()
        // forward-fills from getDefaults() after load, so at runtime both sides
        // always carry them; the guard only protects hand-built presets in tests
        // and the brief pre-forward-fill window.
        // Compare placementMode only when both sides carry the field
        if (a.placementMode !== undefined && b.placementMode !== undefined) {
            if (String(a.placementMode) !== String(b.placementMode)) return false;
        }
        // Compare edge sub-objects
        var edgeNames = ["top", "left", "bottom", "right"];
        for (var ei = 0; ei < edgeNames.length; ei++) {
            if (!sameFields(a[edgeNames[ei]] || {}, b[edgeNames[ei]] || {},
                    ["enabled", "useNumber"], ["number", "spacing"])) return false;
        }
        // Compare v5 sub-objects only when both sides carry the field
        if (a.cornerZone !== undefined && b.cornerZone !== undefined) {
            if (!sameFields(a.cornerZone, b.cornerZone, ["enabled"], ["count", "pitch"])) return false;
        }
        if (a.pathDist !== undefined && b.pathDist !== undefined) {
            if (!sameFields(a.pathDist, b.pathDist, ["useNumber"], ["number", "spacing"])) return false;
        }
        // Compare v6 fields only when both sides carry them (presence-guard mirrors v5).
        if (a.markCircle !== undefined && b.markCircle !== undefined) {
            if (!sameFields(a, b, ["markCircle", "markCross"], ["regWeight", "haloWeight"])) return false;
        }
        // Compare the 1.3.0 path offset only when both sides carry it.
        if (a.pathOffset !== undefined && b.pathOffset !== undefined) {
            if (!sameNumber(a.pathOffset, b.pathOffset)) return false;
        }
        return true;
    }
};
