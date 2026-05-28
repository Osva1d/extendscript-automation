// ------------------------------------------------------------------------
// Module: GM.PreviewModel — schematic preview geometry (pure, no DOM)
// Part of: Illustrator Grommet Marks
//
// Computes the data behind the dialog's schematic diagram: the artboard
// rectangle and a representative set of grommet-mark dots per active edge.
// Self-contained pure math — testable in Node, reused by the ui.js renderer.
// The output is illustrative (legibility-capped), NOT pixel-accurate to the
// real artboard.
//
// Depends on: (none)
// ------------------------------------------------------------------------
var GM = GM || {};

GM.PreviewModel = {
    // Layout constants for the schematic (px, relative to the preview canvas).
    CONFIG: {
        DISPLAY_CAP:   12,  // max dots drawn per edge (legibility)
        SPACING_COUNT: 6,   // representative dot count in "spacing" mode
        MARGIN:        16,  // rect inset from the canvas edge
        EDGE_INSET:    6,   // dot inset inward from the rect border
        CORNER_INSET:  10   // dot inset from corners along the edge
    },

    /**
     * Resolves an edge's effective dot count for the schematic.
     * @param {Object} cfg - Effective edge config {useNumber, number, spacing}.
     * @returns {number} Dot count, clamped to [1, DISPLAY_CAP].
     */
    edgeDotCount: function (cfg) {
        var C = GM.PreviewModel.CONFIG;
        if (!cfg) return 0;
        if (!cfg.useNumber) return C.SPACING_COUNT;
        var n = parseInt(cfg.number, 10);
        if (isNaN(n) || n < 1) n = 1;
        if (n > C.DISPLAY_CAP) n = C.DISPLAY_CAP;
        return n;
    },

    /**
     * Spreads n positions evenly within [a, b].
     * One position centers at (a+b)/2; otherwise endpoints included.
     * @param {number} a - Range start.
     * @param {number} b - Range end.
     * @param {number} n - Count (>= 1).
     * @returns {Array<number>} Positions.
     */
    spread: function (a, b, n) {
        var out = [];
        if (n <= 1) { out.push((a + b) / 2); return out; }
        var step = (b - a) / (n - 1);
        for (var i = 0; i < n; i++) out.push(a + i * step);
        return out;
    },

    /**
     * Computes the schematic geometry for the current settings.
     * @param {Object} settings - Gathered config (edges + mirror flags).
     * @param {number} canvasW - Preview surface width (px).
     * @param {number} canvasH - Preview surface height (px).
     * @returns {Object} { rect:{x,y,w,h}, dots:[{x,y,edge}], edges:{top,left,bottom,right} }
     */
    compute: function (settings, canvasW, canvasH) {
        var C = GM.PreviewModel.CONFIG;
        settings = settings || {};

        var rect = {
            x: C.MARGIN,
            y: C.MARGIN,
            w: Math.max(canvasW - 2 * C.MARGIN, 0),
            h: Math.max(canvasH - 2 * C.MARGIN, 0)
        };

        // Effective edge configs (mirror copies the opposite edge)
        var topCfg    = settings.top  || {};
        var leftCfg   = settings.left || {};
        var bottomCfg = settings.bottomMirror ? topCfg  : (settings.bottom || {});
        var rightCfg  = settings.rightMirror  ? leftCfg : (settings.right  || {});

        // Active flags (after mirror resolution)
        var topOn    = !!topCfg.enabled;
        var leftOn   = !!leftCfg.enabled;
        var bottomOn = settings.bottomMirror ? topOn  : !!(settings.bottom && settings.bottom.enabled);
        var rightOn  = settings.rightMirror  ? leftOn : !!(settings.right  && settings.right.enabled);

        var edges = { top: topOn, left: leftOn, bottom: bottomOn, right: rightOn };

        var x0 = rect.x + C.CORNER_INSET;
        var x1 = rect.x + rect.w - C.CORNER_INSET;
        var y0 = rect.y + C.CORNER_INSET;
        var y1 = rect.y + rect.h - C.CORNER_INSET;

        var dots = [];
        var i, xs, ys;

        if (topOn) {
            xs = GM.PreviewModel.spread(x0, x1, GM.PreviewModel.edgeDotCount(topCfg));
            for (i = 0; i < xs.length; i++) dots.push({ x: xs[i], y: rect.y + C.EDGE_INSET, edge: "top" });
        }
        if (bottomOn) {
            xs = GM.PreviewModel.spread(x0, x1, GM.PreviewModel.edgeDotCount(bottomCfg));
            for (i = 0; i < xs.length; i++) dots.push({ x: xs[i], y: rect.y + rect.h - C.EDGE_INSET, edge: "bottom" });
        }
        if (leftOn) {
            ys = GM.PreviewModel.spread(y0, y1, GM.PreviewModel.edgeDotCount(leftCfg));
            for (i = 0; i < ys.length; i++) dots.push({ x: rect.x + C.EDGE_INSET, y: ys[i], edge: "left" });
        }
        if (rightOn) {
            ys = GM.PreviewModel.spread(y0, y1, GM.PreviewModel.edgeDotCount(rightCfg));
            for (i = 0; i < ys.length; i++) dots.push({ x: rect.x + rect.w - C.EDGE_INSET, y: ys[i], edge: "right" });
        }

        return { rect: rect, dots: dots, edges: edges };
    }
};
