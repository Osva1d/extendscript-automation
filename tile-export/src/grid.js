// ------------------------------------------------------------------------
// Module: TE.Grid — cut positions and panel geometry (NO Illustrator DOM)
// Part of: Illustrator Tile Export
// Depends on: TE.Utils, TE.Config
// ------------------------------------------------------------------------
var TE = TE || {};

TE.Grid = {
    /**
     * Cut positions along the split axis.
     *
     * All three input modes fill the same structure, so the rest of the tool
     * never learns which one the user picked.
     *
     * @param {Object} s - Settings.
     * @param {Object} extent - {start, end}, always an ASCENDING axis. Caller
     *        passes {left, right} for horizontal and {bottom, top} for vertical.
     * @param {Array|null} guides - Guide positions in document points, used
     *        only when s.divideMode === "guides". Unsorted input is fine.
     * @returns {Array} Ascending cut positions, edges excluded.
     * @throws {Error} message is one of TE_MIN_TILES, TE_BAD_WIDTH, TE_NO_GUIDES.
     */
    computeCuts: function (s, extent, guides) {
        var start = extent.start;
        var span = extent.end - start;
        var cuts = [];
        var i, n, w;

        if (s.divideMode === "count") {
            n = Math.round(Number(s.tileCount));
            if (isNaN(n) || n < 2) { throw new Error("TE_MIN_TILES"); }
            for (i = 1; i < n; i++) { cuts.push(start + span * i / n); }
            return cuts;
        }

        if (s.divideMode === "width") {
            w = TE.Utils.toDoc(Number(s.tileWidth), s);
            if (isNaN(w) || w <= 0) { throw new Error("TE_BAD_WIDTH"); }
            // Tolerance guards the exact-fit case: 3000/1500 must give 2 panels,
            // not 3 with a zero-width trailing one, despite float arithmetic.
            n = Math.ceil(span / w - 1e-9);
            if (n < 2) { throw new Error("TE_MIN_TILES"); }
            for (i = 1; i < n; i++) { cuts.push(start + w * i); }
            return cuts;
        }

        return this.prepareGuides(guides, extent, s);
    },

    /**
     * Filters, rounds, sorts and de-duplicates guide positions.
     *
     * Hand-dragged guides are never round numbers (measured: 1553.09, 962.18,
     * 425.82 pt) and arrive in stacking order, not spatial order. They also
     * overhang the artboard by orders of magnitude, which is why only the cut
     * coordinate is ever considered here.
     *
     * @param {Array|null} guides - Raw positions in document points.
     * @param {Object} extent - {start, end}.
     * @param {Object} s - Settings, carries guideRound and scaleN.
     * @returns {Array} Ascending, de-duplicated cut positions.
     * @throws {Error} TE_NO_GUIDES when nothing usable is left.
     */
    prepareGuides: function (guides, extent, s) {
        if (!guides || guides.length === 0) { throw new Error("TE_NO_GUIDES"); }

        var step = Number(s.guideRound) > 0 ? TE.Utils.toDoc(Number(s.guideRound), s) : 0;
        var eps = 1e-6;
        var out = [];
        var i, p;

        for (i = 0; i < guides.length; i++) {
            p = guides[i];
            if (step > 0) {
                p = extent.start + Math.round((p - extent.start) / step) * step;
            }
            // Strictly inside: a cut on the edge would make a zero-width panel.
            if (p > extent.start + eps && p < extent.end - eps) { out.push(p); }
        }

        out.sort(function (a, b) { return a - b; });

        // Collapse duplicates — two guides can round onto the same position.
        var dedup = [];
        for (i = 0; i < out.length; i++) {
            if (i === 0 || Math.abs(out[i] - dedup[dedup.length - 1]) > eps) {
                dedup.push(out[i]);
            }
        }

        if (dedup.length === 0) { throw new Error("TE_NO_GUIDES"); }
        return dedup;
    }
};
