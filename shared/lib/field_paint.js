// ------------------------------------------------------------------------
// Module: FieldPaint (shared) — the family's status colours on ScriptUI text
// Part of: shared core (grommet-marks, tile-export, zund-summa-marks;
//          extendscript-ui-standards §12.3, §12.6)
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
// docs/decisions.md asks for; all three tools now use this module instead.
// The colours are the canon's (§12.6), from tile-export's TE.UI.COLORS.
//
// Illustrator reads a control's own pen back as undefined before show(), so
// the pen given back used to be FALLBACK light grey — on the Medium Light and
// Light UI every field then looked greyed out (2026-10-23). A field that was
// never red is therefore left alone. One that was red gets, on a light UI, the
// theme pen "foreground" — Adobe's text colour, identical to the host's own on
// Light — and on a dark UI the light grey, because the theme's 0.60 there is
// visibly dimmer than the white the host draws its fields in, and 0.75 looked
// like it (user screenshots 2026-10-23). The theme brush "background" tells
// the two apart (Illustrator 30.8.2: 0.94 on Light, 0.20 on Dark).
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

        // The pen a field gets back after red on the dark UI, where it looks
        // like the host's own white; also the last resort when the host has no
        // theme pen. Near invisible on the light UI, so never chosen there
        // while the theme's text colour is available.
        FALLBACK: [0.75, 0.75, 0.75],

        /**
         * Paints a field's text red while its value is invalid, and gives it
         * back its own colour once it is valid. A field that was never red is
         * never written: the host draws it in its own colour for the current
         * UI brightness. The first red remembers the own pen on the control;
         * when it cannot be read (Illustrator), the field gets FALLBACK back
         * on a dark UI and the theme pen "foreground" on a light one (or when
         * the brightness is unknown), and FALLBACK when the host has no theme
         * pen.
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
                var grey = g.newPen(g.PenType.SOLID_COLOR, this.FALLBACK.concat([1]), 1);
                g.foregroundColor = et.sharedDefaultPen ||
                    (this.isDarkUI(g) === true ? grey : (this.themeText(g) || grey));
            } catch (e) {
                log("FieldPaint.field: " + e.message);
            }
        },

        /**
         * Whether the UI is dark, from the theme brush "background".
         * @param {Object} g - A control's ScriptUIGraphics.
         * @returns {boolean|null} True on a dark UI, false on a light one,
         *     null when the host has no theme brush.
         */
        isDarkUI: function (g) {
            if (!g.newBrush || !g.BrushType || g.BrushType.THEME_COLOR === undefined) { return null; }
            try {
                var c = g.newBrush(g.BrushType.THEME_COLOR, "background").color;
                if (!c || c.length < 3) { return null; }
                return (c[0] + c[1] + c[2]) / 3 < 0.5;
            } catch (e) {
                log("FieldPaint.isDarkUI: " + e.message);
                return null;
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
