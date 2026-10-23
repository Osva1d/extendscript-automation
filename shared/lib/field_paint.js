// ------------------------------------------------------------------------
// Module: FieldPaint (shared) — the family's status colours on ScriptUI text
// Part of: shared core (no consumer yet; extendscript-ui-standards §12.3, §12.6)
//
// Namespace-neutral factory: buildFieldPaint(NS) registers NS.FieldPaint on
// the namespace object passed in. A tool's build cats this file and appends
// its own call — buildFieldPaint(TE);. Tests eval this file, then call the
// factory with their mock namespace.
//
// Optional dependency: NS.Utils.log, for a pen the host refuses.
//
// field() is the one function grommet-marks (paintField), zund-summa-marks
// (markFieldValidity) and tile-export (paintField) each wrote, with the same
// fix in all three: the field's own pen is captured before it is painted and
// given back afterwards, because forcing black hides the text on the dark UI.
// Three copies of one fix is the "fix once, holds there too" criterion
// docs/decisions.md asks for. The colours are the canon's (§12.6), from
// tile-export's TE.UI.COLORS.
//
// Illustrator reads a control's own pen back as undefined before show(), so
// the pen given back used to be FALLBACK light grey — on the Medium Light and
// Light UI every field then looked greyed out (2026-10-23). A field that was
// never red is therefore left alone, and one that was red takes the theme pen
// "foreground": Adobe's text colour for the current UI brightness (measured in
// Illustrator 30.8.2: 0.28 on Light, 0.60 on Dark).
// ------------------------------------------------------------------------
function buildFieldPaint(NS) {
    function log(msg) {
        try { if (NS.Utils && NS.Utils.log) { NS.Utils.log(msg); } } catch (e) {}
    }

    NS.FieldPaint = {
        // Status colours of the family, RGB 0-1 (extendscript-ui-standards §12.6).
        COLORS: {
            ERR:  [0.90, 0.20, 0.20],
            WARN: [0.96, 0.60, 0.38],
            OK:   [0.36, 0.60, 0.34]
        },

        // The pen a field gets back after red when neither its own pen nor the
        // theme's text colour is available: a light grey. Legible on the dark
        // UI only — near invisible on the light one, hence the last resort.
        FALLBACK: [0.75, 0.75, 0.75],

        /**
         * Paints a field's text red while its value is invalid, and gives it
         * back its own colour once it is valid. A field that was never red is
         * never written: the host draws it in its own colour for the current
         * UI brightness. The first red remembers the own pen on the control;
         * when it cannot be read (Illustrator), the field gets the theme pen
         * "foreground" back, and FALLBACK only when the host has no theme pen.
         * Never throws: a host build that refuses the pen leaves the field as
         * it is, and the primary button, greyed by the caller, still protects
         * the run.
         * @param {Object} et - The edittext.
         * @param {boolean} valid - False paints it red.
         */
        field: function (et, valid) {
            var g = et && et.graphics;
            if (!g || !g.newPen) { return; }
            try {
                if (!valid) {
                    if (et.sharedDefaultPen === undefined) { et.sharedDefaultPen = g.foregroundColor || null; }
                    g.foregroundColor = g.newPen(g.PenType.SOLID_COLOR, this.COLORS.ERR.concat([1]), 1);
                    return;
                }
                if (et.sharedDefaultPen === undefined) { return; }   // never red: leave the host's colour
                g.foregroundColor = et.sharedDefaultPen || this.themeText(g) ||
                    g.newPen(g.PenType.SOLID_COLOR, this.FALLBACK.concat([1]), 1);
            } catch (e) {
                log("FieldPaint.field: " + e.message);
            }
        },

        /**
         * The theme's text colour of the current UI brightness, as a pen.
         * @param {Object} g - A control's ScriptUIGraphics.
         * @returns {Object|null} The pen, or null when the host has none.
         */
        themeText: function (g) {
            if (!g.PenType || g.PenType.THEME_COLOR === undefined) { return null; }
            try {
                return g.newPen(g.PenType.THEME_COLOR, "foreground", 1);
            } catch (e) {
                log("FieldPaint.themeText: " + e.message);
                return null;
            }
        },

        /**
         * Paints a status text in the colour of its state, as tile-export's
         * status line does.
         * @param {Object} ctrl - A statictext.
         * @param {string} kind - "ERR", "WARN" or "OK".
         */
        text: function (ctrl, kind) {
            var g = ctrl && ctrl.graphics;
            var rgb = this.COLORS[kind];
            if (!g || !g.newPen || !rgb) { return; }
            try {
                g.foregroundColor = g.newPen(g.PenType.SOLID_COLOR, rgb.concat([1]), 1);
            } catch (e) {
                log("FieldPaint.text: " + e.message);
            }
        }
    };
}
