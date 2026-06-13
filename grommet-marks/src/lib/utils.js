// ------------------------------------------------------------------------
// Module: GM.Utils — shared utility functions
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS
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
     * from the stored preset). Numeric coercion via String() so 5
     * and "5" compare equal — UI inputs are strings, stored values
     * may be numbers.
     *
     * @param {Object} a - First settings object.
     * @param {Object} b - Second settings object.
     * @returns {boolean} True if all schema fields are equal.
     */
    presetEquals: function (a, b) {
        if (!a || !b) return false;
        var keys = [
            "offsetX", "offsetY", "bottomMirror", "rightMirror",
            "units", "markSize"
        ];
        for (var i = 0; i < keys.length; i++) {
            if (String(a[keys[i]]) !== String(b[keys[i]])) return false;
        }
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
        var edgeKeys = ["enabled", "useNumber", "number", "spacing"];
        for (var ei = 0; ei < edgeNames.length; ei++) {
            var aE = a[edgeNames[ei]] || {};
            var bE = b[edgeNames[ei]] || {};
            for (var ek = 0; ek < edgeKeys.length; ek++) {
                if (String(aE[edgeKeys[ek]]) !== String(bE[edgeKeys[ek]])) return false;
            }
        }
        // Compare v5 sub-objects only when both sides carry the field
        if (a.cornerZone !== undefined && b.cornerZone !== undefined) {
            var zA = a.cornerZone, zB = b.cornerZone;
            var zoneKeys = ["enabled", "count", "pitch"];
            for (var zk = 0; zk < zoneKeys.length; zk++) {
                if (String(zA[zoneKeys[zk]]) !== String(zB[zoneKeys[zk]])) return false;
            }
        }
        if (a.pathDist !== undefined && b.pathDist !== undefined) {
            var pA = a.pathDist, pB = b.pathDist;
            var pdKeys = ["useNumber", "number", "spacing"];
            for (var pk = 0; pk < pdKeys.length; pk++) {
                if (String(pA[pdKeys[pk]]) !== String(pB[pdKeys[pk]])) return false;
            }
        }
        // Compare v6 fields only when both sides carry them (presence-guard mirrors v5).
        var v6Keys = ["markCircle", "markCross", "regWeight", "haloWeight"];
        if (a.markCircle !== undefined && b.markCircle !== undefined) {
            for (var vi = 0; vi < v6Keys.length; vi++) {
                if (String(a[v6Keys[vi]]) !== String(b[v6Keys[vi]])) return false;
            }
        }
        return true;
    }
};
