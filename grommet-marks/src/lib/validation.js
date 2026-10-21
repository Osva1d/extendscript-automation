// ------------------------------------------------------------------------
// Module: GM.Validation — rules-based input validation
// Part of: Illustrator Grommet Marks
//
// Pure validation logic decoupled from ScriptUI. Numeric checks use
// a shared validateNumber helper. Can be tested in Node without Illustrator.
//
// Depends on: GM.L (error messages), GM.Utils (error: the alert with its
// prefix), GM.Numbers (shared/lib/numbers.js: reads the field text — one
// converter for the dialog fields, live validation and validate())
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Validation = {
    rules: {
        offsetX:      { min: 0,    max: 9999, integer: false },
        offsetY:      { min: 0,    max: 9999, integer: false },
        markSize:     { min: 0.01, max: 9999, integer: false },
        regWeight:    { min: 0.1,  max: 50,   integer: false },
        haloWeight:   { min: 0.1,  max: 50,   integer: false },
        edgeCount:    { min: 1,    max: 9999, integer: true  },
        edgeSpacing:  { min: 0.01, max: 9999, integer: false },
        cornerCount:  { min: 1,    max: 999,  integer: true  },
        cornerPitch:  { min: 0.01, max: 9999, integer: false },
        pathNumber:   { min: 1,    max: 9999, integer: true  },
        pathSpacing:  { min: 0.01, max: 9999, integer: false },
        pathOffset:   { min: 0,    max: 9999, integer: false }
    },

    /**
     * A refusal of validate(): the error alert and, at its end, what happened
     * to the document — nothing, the values are checked before anything is
     * drawn (canon 12.2). The one place that sentence is added.
     * @param {Object} L - Locale object (GM.L).
     * @param {string} msg - What is wrong.
     */
    refuse: function (L, msg) {
        GM.Utils.error(msg + " " + (L.DOC_UNCHANGED || "The document was not changed."));
    },

    /**
     * Validates a numeric value against a rule.
     * @param {string|number} val - Raw value.
     * @param {Object} rule - {min, max, integer}.
     * @param {string} label - The field's label ("Offset X:"); the message
     *     names the field, so the label's colon is dropped.
     * @param {Object} L - Locale object (GM.L).
     * @returns {number|null} Parsed number or null if invalid.
     */
    validateNumber: function (val, rule, label, L) {
        var n = GM.Numbers.parse(val);
        var name = String(label).replace(/\s*:\s*$/, "");
        if (isNaN(n)) {
            GM.Validation.refuse(L, L.format(L.ERR_MUST_BE_NUMBER || "Field \"%s\" must be a number.", name));
            return null;
        }
        if (rule.integer && n !== Math.floor(n)) {
            GM.Validation.refuse(L, L.format(L.ERR_MUST_BE_INTEGER || "Field \"%s\" must be a whole number.", name));
            return null;
        }
        if (n < rule.min || n > rule.max) {
            // The limits are written the way the fields are (Czech: "0,01").
            GM.Validation.refuse(L, L.format(L.ERR_OUT_OF_RANGE || "Field \"%s\" must be between %s and %s.", name,
                GM.Numbers.format(rule.min, L.DEC_SEP), GM.Numbers.format(rule.max, L.DEC_SEP)));
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

        // Corner zones (both modes; skipped when disabled)
        var zone = cfg.cornerZone || { enabled: false };
        var zoneCount = zone.count, zonePitch = zone.pitch;
        if (zone.enabled) {
            zoneCount = vn(zone.count, rules.cornerCount, L.ZONES_COUNT || "Count", L);
            if (zoneCount === null) return { valid: false, settings: null };
            zonePitch = vn(zone.pitch, rules.cornerPitch, L.ZONES_PITCH || "Spacing", L);
            if (zonePitch === null) return { valid: false, settings: null };
        }

        // Appearance: validate weights (always relevant), require a shape.
        var regWeight = vn(cfg.regWeight, rules.regWeight, L.REG_WEIGHT || "Reg stroke", L);
        if (regWeight === null) return { valid: false, settings: null };
        var haloWeight = vn(cfg.haloWeight, rules.haloWeight, L.HALO_WEIGHT || "Halo", L);
        if (haloWeight === null) return { valid: false, settings: null };
        if (!cfg.markCircle && !cfg.markCross) {
            GM.Validation.refuse(L, L.ERR_NO_APPEARANCE);
            return { valid: false, settings: null };
        }

        var isPathMode = (cfg.placementMode === GM.CONSTANTS.MODE_PATH);
        var pathNumber = cfg.pathDist ? cfg.pathDist.number : 0;
        var pathSpacing = cfg.pathDist ? cfg.pathDist.spacing : 0;
        if (isPathMode) {
            var pathOffset = vn(cfg.pathOffset === undefined ? 0 : cfg.pathOffset,
                rules.pathOffset, L.OFFSET_LABEL || "Edge offset", L);
            if (pathOffset === null) return { valid: false, settings: null };
            if (!cfg.pathDist) return { valid: false, settings: null };
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
                GM.Validation.refuse(L, L.ERR_NO_EDGE);
                return { valid: false, settings: null };
            }

            // Validate non-mirrored enabled edges
            var edgeKeys = ["top", "left"];
            if (!cfg.bottomMirror) edgeKeys.push("bottom");
            if (!cfg.rightMirror) edgeKeys.push("right");

            for (var i = 0; i < edgeKeys.length; i++) {
                var e = cfg[edgeKeys[i]];
                if (!e.enabled) continue;
                // With corner zones on, the core fills every edge by spacing
                // and ignores the count (distributeOnSpan) — check what is used.
                if (e.useNumber && !zone.enabled) {
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
        settings.regWeight = regWeight;
        settings.haloWeight = haloWeight;
        if (zone.enabled) {
            settings.cornerZone.count = zoneCount;
            settings.cornerZone.pitch = zonePitch;
        }
        if (isPathMode) {
            if (cfg.pathDist.useNumber) settings.pathDist.number = pathNumber;
            else settings.pathDist.spacing = pathSpacing;
            settings.pathOffset = pathOffset;
        } else {
            // Not checked outside path mode, but it is stored with the preset:
            // a typo or NaN (null after JSON) there must not come back as a
            // field that cannot be fixed. Anything unusable is stored as 0.
            var storedOffset = GM.Numbers.parse(cfg.pathOffset);
            settings.pathOffset = (isFinite(storedOffset) && storedOffset >= 0) ? storedOffset : 0;
        }

        return { valid: true, settings: settings };
    }
};
