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

        // The pen a field shows when its own cannot be read back: a light grey
        // that stays legible on both the light and the dark UI.
        FALLBACK: [0.75, 0.75, 0.75],

        /**
         * Paints a field's text red while its value is invalid, and gives it
         * back the pen it had before once it is valid. The first call
         * remembers that pen on the control. Never throws: a host build that
         * refuses the pen leaves the field as it is, and the primary button,
         * greyed by the caller, still protects the run.
         * @param {Object} et - The edittext.
         * @param {boolean} valid - False paints it red.
         */
        field: function (et, valid) {
            var g = et && et.graphics;
            if (!g || !g.newPen) { return; }
            try {
                if (et.sharedDefaultPen === undefined) { et.sharedDefaultPen = g.foregroundColor || null; }
                g.foregroundColor = valid
                    ? (et.sharedDefaultPen || g.newPen(g.PenType.SOLID_COLOR, this.FALLBACK.concat([1]), 1))
                    : g.newPen(g.PenType.SOLID_COLOR, this.COLORS.ERR.concat([1]), 1);
            } catch (e) {
                log("FieldPaint.field: " + e.message);
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
