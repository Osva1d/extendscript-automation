var ZSM = ZSM || {};

/**
 * ZSM.Validation — Pure validation logic for UI-collected settings.
 *
 * Decoupled from ScriptUI so it can be unit-tested in Node without
 * an Illustrator runtime. Numeric checks delegate to ZSM.Utils.validateNumber
 * (which still calls alert() — caller suppresses or mocks as needed).
 *
 * Schema: each numeric field has {min, max, label, mode?}.
 *   - "label" is the key in ZSM.L locale table for user-facing field name.
 *   - "mode" (optional) restricts validation to ZUND or SUMMA. Mode-irrelevant
 *     fields are pulled from `prev` (previously saved settings) instead of
 *     being validated, mirroring the dialog's mode-specific UI.
 */
ZSM.Validation = {
    /**
     * Numeric field validation rules. Single source of truth — used by both
     * the UI dialog (via ZSM.Validation.validate()) and the test suite.
     */
    rules: {
        // Always validated:
        gapOuter:   { min: 0,   max: 1000, label: "GAP_ZO" },
        // maxDist.min lowered from 50 to 5 to unblock 1:10 manual-scale workflows
        // (user enters 40 mm doc-coords representing 400 mm real intent on a
        // 1:10 working file). At true 1:1, a 5 mm spacing produces extremely
        // dense mark grids — acceptable as an explicit user choice. The proper
        // outputScale UI lives in Phase 2.
        maxDist:    { min: 5,   max: 5000, label: "MAX_DIST" },
        // ZUND-only:
        gapInner:   { min: 0,   max: 1000, label: "GAP_GZ",      mode: "ZUND" },
        markSizeZ:  { min: 0.1, max: 50,   label: "MARK_SIZE_Z", mode: "ZUND" },
        orientDist: { min: 10,  max: 2000, label: "ORIENT_DIST", mode: "ZUND" },
        // SUMMA-only:
        markSizeS:  { min: 0.1, max: 50,   label: "MARK_SIZE_S", mode: "SUMMA" },
        feedTop:    { min: 0,   max: 1000, label: "FEED_TOP",    mode: "SUMMA" },
        feedBottom: { min: 0,   max: 1000, label: "FEED_BOT",    mode: "SUMMA" },
        // Phase 2 — manual scale (1:N). Integer 1..10.
        // scaleN=1 = no scaling (UI checkbox unchecked, field disabled).
        // scaleN=2..10 = doc is 1:N (UI checkbox checked, field shows N).
        scaleN:     { min: 1,   max: 10,   label: "SCALE_FIELD_LABEL", integer: true }
    },

    /**
     * Validates raw UI values against the schema and builds a clean settings
     * object. For mode-irrelevant fields, falls back to `prev` (matches the
     * dialog's "preserve other-mode values across mode switch" behavior).
     *
     * @param {Object} raw - Raw UI values (strings or numbers OK, comma-decimal OK).
     *                       Required: mode. Plus all field names in rules + booleans.
     * @param {Object} prev - Previous settings (for mode-irrelevant field preservation).
     *                       Pass {} if no previous state.
     * @param {Object} L    - Locale object (ZSM.L). Used to resolve rule.label
     *                       to the user-facing field name shown in alerts.
     * @returns {Object} { valid: bool, settings: {...}|null, errors: [{field,label}, ...] }
     */
    validate: function (raw, prev, L) {
        if (!raw) return { valid: false, settings: null, errors: [{ field: "_root", label: "missing input" }] };
        // `mode` is the only strictly required field — everything else can
        // fall back to prev or defaults. Without mode we cannot decide which
        // mode-specific rules apply.
        if (!raw.mode)  return { valid: false, settings: null, errors: [{ field: "mode",  label: "mode missing" }] };
        L = L || {};
        prev = prev || {};

        var errors = [];
        var settings = { mode: raw.mode };
        var mode = raw.mode;

        // Numeric fields per rules
        for (var field in this.rules) {
            if (!this.rules.hasOwnProperty(field)) continue;
            var rule = this.rules[field];

            if (rule.mode && rule.mode !== mode) {
                // Mode-irrelevant: preserve from prev (or fall to undefined,
                // caller can fill from defaults if needed)
                settings[field] = prev[field];
                continue;
            }

            // Field not provided in raw input — fall back to prev value.
            // This keeps old presets / partial UIs working without forcing
            // every caller to enumerate every schema field explicitly.
            if (raw[field] === undefined) {
                settings[field] = prev[field];
                continue;
            }

            var label = L[rule.label] || rule.label || field;
            var val = ZSM.Utils.validateNumber(raw[field], rule.min, rule.max, label);
            if (val === null) {
                errors.push({ field: field, label: label });
            } else if (rule.integer && val !== Math.floor(val)) {
                // Integer-only rule (e.g. scaleN): reject decimals.
                // validateNumber already showed range alert; we add a precise
                // "must be integer" alert via the same locale mechanism.
                try {
                    if (typeof alert === "function" && L.ERR_MUST_BE_INTEGER) {
                        alert(L.format ? L.format(L.ERR_MUST_BE_INTEGER, label) : L.ERR_MUST_BE_INTEGER);
                    }
                } catch (e) {}
                errors.push({ field: field, label: label });
            } else {
                settings[field] = val;
            }
        }

        // Pass-through fields (no numeric validation needed)
        // Boolean fields: explicit cast
        settings.drawRed           = (raw.drawRed === true);
        settings.useArtboardBounds = (raw.useArtboardBounds === true);
        settings.marksOnly         = (raw.marksOnly === true);

        // String / dropdown fields: empty → fallback
        settings.markColor = (raw.markColor && raw.markColor !== "")
            ? raw.markColor
            : "[Registration]";

        // Layers: array passthrough (UI is responsible for shape)
        settings.layers = (raw.layers && raw.layers.length > 0)
            ? raw.layers
            : [{ name: "Cut", color: "[Registration]" }];

        return errors.length === 0
            ? { valid: true,  settings: settings, errors: [] }
            : { valid: false, settings: null,     errors: errors };
    }
};
