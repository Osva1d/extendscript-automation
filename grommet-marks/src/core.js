// ------------------------------------------------------------------------
// Module: GM.Core — geometry and math (pure, no DOM)
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Core = {
    /**
     * Converts a value between units.
     * @param {number} val - Value to convert
     * @param {string} fromUnit - Source unit name
     * @param {string} toUnit - Target unit name
     * @returns {number} Converted value
     */
    convertVal: function (val, fromUnit, toUnit) {
        if (fromUnit === toUnit) return val;
        return (val * GM.CONSTANTS.UNIT_FACTORS[fromUnit]) / GM.CONSTANTS.UNIT_FACTORS[toUnit];
    },

    /**
     * Rounds value to 6 decimal places to avoid float errors.
     * @param {number} val
     * @returns {number}
     */
    round: function (val) {
        return Math.round(val * 1000000) / 1000000;
    },

    /**
     * Calculates positions of marks along an edge.
     * All positions are measured from the start of the edge (center-to-center).
     *
     * @param {Object} edgeCfg - Edge config { useNumber, number, spacing }
     * @param {number} span - Total edge length in points
     * @param {number} offset - Global offset from both ends in user units (X or Y)
     * @param {number} unitFactor - Conversion factor (user units → points)
     * @returns {Array<number>} Array of positions in points from edge start
     */
    calcPositions: function (edgeCfg, span, offset, unitFactor) {
        // Validation
        var num = Math.max(edgeCfg.number || 1, 1);
        var spacing = Math.max(edgeCfg.spacing || 0, 0);

        var startOff = offset * unitFactor;
        var endOff = startOff; // Symmetric — same offset on both ends
        var available = span - startOff - endOff;

        if (available < 0) available = 0;

        var count, spc;

        if (edgeCfg.useNumber) {
            count = num;
            spc = count > 1 ? available / (count - 1) : 0;
        } else {
            var preferred = spacing * unitFactor;
            if (preferred <= 0) {
                count = 1;
                spc = 0;
            } else {
                var raw = (available / preferred) + 1;
                var floor = Math.max(Math.floor(raw), 1);
                var ceil = Math.max(Math.ceil(raw), 1);
                var sFloor = floor > 1 ? available / (floor - 1) : 0;
                var sCeil = ceil > 1 ? available / (ceil - 1) : 0;

                if (floor <= 1) {
                    count = ceil;
                    spc = sCeil;
                } else if (Math.abs(sFloor - preferred) <= Math.abs(sCeil - preferred)) {
                    count = floor;
                    spc = sFloor;
                } else {
                    count = ceil;
                    spc = sCeil;
                }
                // Safety cap — prevent freeze from very small spacing values
                if (count > 9999) { count = 9999; spc = count > 1 ? available / (count - 1) : 0; }
            }
        }

        var positions = [];
        for (var i = 0; i < count; i++) {
            positions.push(startOff + i * spc);
        }
        return positions;
    }
};
