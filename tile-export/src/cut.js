// ------------------------------------------------------------------------
// Module: TE.Cut — cut contour detection and per-panel clipping
// Part of: Illustrator Tile Export
// Depends on: TE.Config, TE.Draw, TE.L, TE.Utils
// ------------------------------------------------------------------------
var TE = TE || {};

TE.Cut = {
    /**
     * Cut-contour items, identified by spot colour regardless of layer — the
     * same mechanism zund-summa-marks uses to route paths onto cut layers.
     *
     * Checks both stroke and fill: a contour is normally a stroke, but data
     * arriving from another workflow can carry the colour as a fill.
     *
     * @param {Document} doc - Document to search.
     * @param {string} spotName - Spot colour name.
     * @returns {Array} Matching page items. A compound path counts once, not
     *          once per sub-path.
     */
    findContour: function (doc, spotName) {
        var out = [], i;

        function matches(item) {
            var c;
            try {
                c = item.strokeColor;
                if (c && c.typename === "SpotColor" && c.spot.name === spotName) { return true; }
            } catch (e) {}
            try {
                c = item.fillColor;
                if (c && c.typename === "SpotColor" && c.spot.name === spotName) { return true; }
            } catch (e2) {}
            return false;
        }

        try {
            for (i = 0; i < doc.pathItems.length; i++) {
                if (matches(doc.pathItems[i])) { out.push(doc.pathItems[i]); }
            }
        } catch (e3) {
            TE.Utils.log("findContour: pathItems unreadable: " + e3.message);
        }

        try {
            for (i = 0; i < doc.compoundPathItems.length; i++) {
                // A compound path reports its colour on the first sub-path —
                // measured on a real ring built through Make Compound Path.
                if (matches(doc.compoundPathItems[i].pathItems[0])) {
                    out.push(doc.compoundPathItems[i]);
                }
            }
        } catch (e4) {
            TE.Utils.log("findContour: compoundPathItems unreadable: " + e4.message);
        }

        return out;
    },

    /**
     * Whether the document defines this spot colour.
     * @param {Document} doc - Document to check.
     * @param {string} spotName - Spot colour name.
     * @returns {boolean} True when present.
     */
    hasSpot: function (doc, spotName) {
        var i;
        try {
            for (i = 0; i < doc.spots.length; i++) {
                if (doc.spots[i].name === spotName) { return true; }
            }
        } catch (e) {}
        return false;
    },

    /**
     * Rectangles for the covering frame: everything outside the panel.
     *
     * PURE FUNCTION. The frame is one compound path — an outer rectangle with
     * the panel as a hole — not four separate rectangles. Four would overlap
     * at the corners, and what Pathfinder does there is one more thing to
     * reason about for no gain.
     *
     * @param {Array} tileRect - Panel rect [l, t, r, b] in the temporary document.
     * @param {number} margin - How far the outer rectangle reaches beyond the
     *        panel. Must exceed anything the contour can reach, or a piece of
     *        it survives outside the frame and never gets subtracted.
     * @returns {Object} {outer: [l,t,r,b], hole: [l,t,r,b]}
     */
    frameRects: function (tileRect, margin) {
        return {
            outer: [tileRect[0] - margin, tileRect[1] + margin,
                    tileRect[2] + margin, tileRect[3] - margin],
            hole: [tileRect[0], tileRect[1], tileRect[2], tileRect[3]]
        };
    }
};
