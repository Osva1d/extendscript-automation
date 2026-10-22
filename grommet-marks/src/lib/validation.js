// ------------------------------------------------------------------------
// Module: GM.Validation — rules-based input validation
// Part of: Illustrator Grommet Marks
//
// Pure validation logic decoupled from ScriptUI. Numeric checks use
// a shared validateNumber helper. Can be tested in Node without Illustrator.
//
// Depends on: GM.L (error messages), GM.Utils (error: the alert with its
// prefix; deepCopy), GM.Config (getDefaults: what storable() falls back to),
// GM.CONSTANTS (the units), GM.Core (convertVal, round: the fallback lengths
// in the preset's unit), GM.Numbers (shared/lib/numbers.js: reads the field text — one converter for
// the dialog fields, live validation, validate() and storable())
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
        pathOffset:   { min: 0,    max: 9999, integer: false },
        // The drawing scale 1:N is the document's, not a setting: it is no part
        // of the configuration, so validate() does not see it — the dialog
        // checks it live and GM.Main.run() checks it once more (spec 4.3).
        drawingScale: { min: 1,    max: 100,  integer: false }
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
     * The configuration as a preset may hold it: every numeric field is a
     * number its rule accepts, or that field's default from the code. A preset
     * never stores what the next opening cannot read — a typo, NaN (null after
     * JSON) or a value outside the rule — and that includes the fields a run
     * does not check (the other placement mode, a disabled edge, zones off).
     * Values that are already numbers are not read as text: String(1e-7) is
     * "1e-7", which the field grammar refuses.
     * The defaults are written in millimetres, a preset in its own unit
     * (cfg.units): a length that falls back is converted to that unit, rounded
     * the way the dialog's unit switch rounds, so 105 mm is stored as 10,5 in a
     * cm preset and not as 105 cm. Strokes are points and counts are no length:
     * not converted. A missing or unknown unit counts as millimetres.
     * @param {Object} cfg - Raw config from gatherAll(); not changed.
     * @returns {Object} A copy of cfg with usable numbers.
     */
    storable: function (cfg) {
        var rules = GM.Validation.rules;
        var dflt = GM.Config.getDefaults();
        var out = GM.Utils.deepCopy(cfg);

        var UNIT = GM.CONSTANTS.UNIT;
        var unit = (typeof cfg.units === "string" && GM.CONSTANTS.UNIT_FACTORS.hasOwnProperty(cfg.units))
            ? cfg.units : UNIT.MM;
        /** A default length (millimetres in the code) in the preset's unit. */
        function dfltLen(mm) {
            return GM.Core.round(GM.Core.convertVal(mm, UNIT.MM, unit));
        }

        function usable(val, rule, fallback) {
            var n = (typeof val === "number") ? val : GM.Numbers.parse(val);
            if (!isFinite(n)) return fallback;
            if (rule.integer && n !== Math.floor(n)) return fallback;
            return (n >= rule.min && n <= rule.max) ? n : fallback;
        }

        out.offsetX = usable(cfg.offsetX, rules.offsetX, dfltLen(dflt.offsetX));
        out.offsetY = usable(cfg.offsetY, rules.offsetY, dfltLen(dflt.offsetY));
        out.markSize = usable(cfg.markSize, rules.markSize, dfltLen(dflt.markSize));
        out.regWeight = usable(cfg.regWeight, rules.regWeight, dflt.regWeight);
        out.haloWeight = usable(cfg.haloWeight, rules.haloWeight, dflt.haloWeight);
        out.pathOffset = usable(cfg.pathOffset, rules.pathOffset, dfltLen(dflt.pathOffset));

        var edgeKeys = ["top", "left", "bottom", "right"];
        for (var i = 0; i < edgeKeys.length; i++) {
            var k = edgeKeys[i];
            if (!cfg[k]) continue;
            out[k].number = usable(cfg[k].number, rules.edgeCount, dflt[k].number);
            out[k].spacing = usable(cfg[k].spacing, rules.edgeSpacing, dfltLen(dflt[k].spacing));
        }
        if (cfg.cornerZone) {
            out.cornerZone.count = usable(cfg.cornerZone.count, rules.cornerCount, dflt.cornerZone.count);
            out.cornerZone.pitch = usable(cfg.cornerZone.pitch, rules.cornerPitch, dfltLen(dflt.cornerZone.pitch));
        }
        if (cfg.pathDist) {
            out.pathDist.number = usable(cfg.pathDist.number, rules.pathNumber, dflt.pathDist.number);
            out.pathDist.spacing = usable(cfg.pathDist.spacing, rules.pathSpacing, dfltLen(dflt.pathDist.spacing));
        }
        return out;
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

        // Build clean settings: storable() makes every number usable (the
        // fields not checked above included), then the validated values.
        var settings = GM.Validation.storable(cfg);
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
        }

        return { valid: true, settings: settings };
    }
};
