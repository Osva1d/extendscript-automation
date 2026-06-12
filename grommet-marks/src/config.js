// ------------------------------------------------------------------------
// Module: GM.Config — default settings and preset constants
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Config = {
    PRESET_KEY_DEFAULT: "[Default]",

    /**
     * Creates an edge definition (per-edge settings).
     * @param {boolean} enabled - Edge active.
     * @param {boolean} useNum - True = fixed count, false = preferred spacing.
     * @param {number} num - Number of marks.
     * @param {number} spacing - Preferred spacing between mark centers.
     * @returns {Object} Edge definition.
     */
    createEdgeDef: function (enabled, useNum, num, spacing) {
        return {
            enabled: enabled,
            useNumber: useNum,
            number: num,
            spacing: spacing
        };
    },

    /**
     * Returns a fresh default settings object.
     * @returns {Object} Default settings.
     */
    getDefaults: function () {
        var c = GM.Config.createEdgeDef;
        var S = GM.CONSTANTS.SENTINEL_CREATE;
        return {
            offsetX: 7,
            offsetY: 7,
            top: c(true, true, 10, 105),
            left: c(true, true, 10, 105),
            bottom: c(false, true, 10, 105),
            right: c(false, true, 10, 105),
            bottomMirror: true,
            rightMirror: true,
            units: GM.CONSTANTS.UNIT.MM,
            markSize: 3,
            isRound: true,
            markLayerName: S,
            fillEnabled: true,
            fillSwatchName: S,
            fillOverprint: true,
            strokeEnabled: false,
            strokeSwatchName: S,
            strokeOverprint: true,
            strokeWeight: 1,
            placementMode: GM.CONSTANTS.MODE_ARTBOARD,
            cornerZone: { enabled: false, count: 5, pitch: 100 },
            pathDist: { useNumber: false, number: 24, spacing: 105 }
        };
    }
};
