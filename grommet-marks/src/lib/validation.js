// ------------------------------------------------------------------------
// Module: GM.Validation — rules-based input validation
// Part of: Illustrator Grommet Marks
//
// Pure validation logic decoupled from ScriptUI. Numeric checks use
// a shared validateNumber helper. Can be tested in Node without Illustrator.
//
// Depends on: GM.L (error messages)
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Validation = {
    rules: {
        offsetX:      { min: 0,    max: 9999, integer: false },
        offsetY:      { min: 0,    max: 9999, integer: false },
        markSize:     { min: 0.01, max: 9999, integer: false },
        strokeWeight: { min: 0.01, max: 100,  integer: false },
        edgeCount:    { min: 1,    max: 9999, integer: true  },
        edgeSpacing:  { min: 0.01, max: 9999, integer: false },
        cornerCount:  { min: 1,    max: 999,  integer: true  },
        cornerPitch:  { min: 0.01, max: 9999, integer: false },
        pathNumber:   { min: 1,    max: 9999, integer: true  },
        pathSpacing:  { min: 0.01, max: 9999, integer: false }
    },

    /**
     * Validates a numeric value against a rule.
     * Normalizes Czech decimal separator (comma -> dot).
     * @param {string|number} val - Raw value.
     * @param {Object} rule - {min, max, integer}.
     * @param {string} label - Display name for error messages.
     * @param {Object} L - Locale object (GM.L).
     * @returns {number|null} Parsed number or null if invalid.
     */
    validateNumber: function (val, rule, label, L) {
        var str = String(val).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
        var n = (str === "") ? NaN : Number(str);
        if (isNaN(n)) {
            alert(L.format(L.ERR_MUST_BE_NUMBER || "%s must be a number!", label));
            return null;
        }
        if (rule.integer && n !== Math.floor(n)) {
            alert(L.format(L.ERR_MUST_BE_INTEGER || "%s must be a whole number!", label));
            return null;
        }
        if (n < rule.min || n > rule.max) {
            alert(L.format(L.ERR_OUT_OF_RANGE || "%s must be between %s and %s!", label, rule.min, rule.max));
            return null;
        }
        return n;
    },

    /**
     * Validates the full gathered configuration.
     * Returns {valid: true, settings} or {valid: false, settings: null}.
     *
     * @param {Object} cfg - Raw config from gatherAll().
     * @param {Object} L - Locale object.
     * @returns {Object} {valid: boolean, settings: Object|null}
     */
    validate: function (cfg, L) {
        if (!cfg) return { valid: false, settings: null };
        var rules = GM.Validation.rules;
        var vn = GM.Validation.validateNumber;

        var offsetX = vn(cfg.offsetX, rules.offsetX, L.OFFSET_X || "Offset X", L);
        if (offsetX === null) return { valid: false, settings: null };

        var offsetY = vn(cfg.offsetY, rules.offsetY, L.OFFSET_Y || "Offset Y", L);
        if (offsetY === null) return { valid: false, settings: null };

        var markSize = vn(cfg.markSize, rules.markSize, L.SIZE_LABEL || "Mark size", L);
        if (markSize === null) return { valid: false, settings: null };

        var strokeWeight = cfg.strokeWeight;
        if (cfg.strokeEnabled) {
            strokeWeight = vn(cfg.strokeWeight, rules.strokeWeight, L.WEIGHT || "Stroke weight", L);
            if (strokeWeight === null) return { valid: false, settings: null };
        }

        // Corner zones (both modes; skipped when disabled)
        var zone = cfg.cornerZone || { enabled: false };
        var zoneCount = zone.count, zonePitch = zone.pitch;
        if (zone.enabled) {
            zoneCount = vn(zone.count, rules.cornerCount, L.ZONES_COUNT || "Count", L);
            if (zoneCount === null) return { valid: false, settings: null };
            zonePitch = vn(zone.pitch, rules.cornerPitch, L.ZONES_PITCH || "Pitch", L);
            if (zonePitch === null) return { valid: false, settings: null };
        }

        // Appearance check (common to both modes)
        if (!cfg.fillEnabled && !cfg.strokeEnabled) {
            alert(L.ERR_NO_APPEARANCE);
            return { valid: false, settings: null };
        }

        var isPathMode = (cfg.placementMode === GM.CONSTANTS.MODE_PATH);
        var pathNumber = cfg.pathDist ? cfg.pathDist.number : 0;
        var pathSpacing = cfg.pathDist ? cfg.pathDist.spacing : 0;
        if (isPathMode) {
            if (cfg.pathDist.useNumber) {
                pathNumber = vn(cfg.pathDist.number, rules.pathNumber, L.COUNT || "Count", L);
                if (pathNumber === null) return { valid: false, settings: null };
            } else {
                pathSpacing = vn(cfg.pathDist.spacing, rules.pathSpacing, L.SPACING || "Spacing", L);
                if (pathSpacing === null) return { valid: false, settings: null };
            }
        } else {
            // Edge enabled check (accounting for mirrors)
            var topOn = cfg.top.enabled;
            var leftOn = cfg.left.enabled;
            var bottomOn = cfg.bottomMirror ? topOn : cfg.bottom.enabled;
            var rightOn = cfg.rightMirror ? leftOn : cfg.right.enabled;
            if (!topOn && !leftOn && !bottomOn && !rightOn) {
                alert(L.ERR_NO_EDGE);
                return { valid: false, settings: null };
            }

            // Validate non-mirrored enabled edges
            var edgeKeys = ["top", "left"];
            if (!cfg.bottomMirror) edgeKeys.push("bottom");
            if (!cfg.rightMirror) edgeKeys.push("right");

            for (var i = 0; i < edgeKeys.length; i++) {
                var e = cfg[edgeKeys[i]];
                if (!e.enabled) continue;
                if (e.useNumber) {
                    var cnt = vn(e.number, rules.edgeCount, L.COUNT || "Count", L);
                    if (cnt === null) return { valid: false, settings: null };
                } else {
                    var spc = vn(e.spacing, rules.edgeSpacing, L.SPACING || "Spacing", L);
                    if (spc === null) return { valid: false, settings: null };
                }
            }
        }

        // Build clean settings (parsed numbers replace raw strings)
        var settings = GM.Utils.deepCopy(cfg);
        settings.offsetX = offsetX;
        settings.offsetY = offsetY;
        settings.markSize = markSize;
        if (cfg.strokeEnabled) settings.strokeWeight = strokeWeight;
        if (zone.enabled) {
            settings.cornerZone.count = zoneCount;
            settings.cornerZone.pitch = zonePitch;
        }
        if (isPathMode) {
            if (cfg.pathDist.useNumber) settings.pathDist.number = pathNumber;
            else settings.pathDist.spacing = pathSpacing;
        }

        return { valid: true, settings: settings };
    }
};
