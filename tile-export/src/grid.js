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
            return this.equalCuts(s, extent, n);
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
     * Panel geometry. Two rules that never meet on the same edge:
     * an OUTER edge of the graphic gets the per-edge add, an INNER edge
     * (a seam with a neighbour) gets the overlap.
     *
     * The horizontal and vertical branches are written out separately rather
     * than abstracted over an axis — this code is read when a panel comes out
     * wrong, and explicit beats clever there.
     *
     * @param {Array} cuts - Ascending cut positions from computeCuts().
     * @param {Array} cleanRect - [left, top, right, bottom] of the whole
     *        graphic, top > bottom.
     * @param {Object} s - Settings.
     * @returns {Array} [{index, clean:[l,t,r,b], expanded:[l,t,r,b]}], for
     *          vertical numbered from the top down.
     */
    computeTiles: function (cuts, cleanRect, s) {
        var L = cleanRect[0], T = cleanRect[1], R = cleanRect[2], B = cleanRect[3];
        var o  = TE.Utils.toDoc(Number(s.overlap)   || 0, s);
        var aT = TE.Utils.toDoc(Number(s.addTop)    || 0, s);
        var aB = TE.Utils.toDoc(Number(s.addBottom) || 0, s);
        var aL = TE.Utils.toDoc(Number(s.addLeft)   || 0, s);
        var aR = TE.Utils.toDoc(Number(s.addRight)  || 0, s);
        var sym = (s.overlapMode === "symmetric");
        var tiles = [];
        var b = [], i, n, lo, hi;

        if (s.direction === "horizontal") {
            b.push(L);
            for (i = 0; i < cuts.length; i++) { b.push(cuts[i]); }
            b.push(R);
            n = b.length - 1;

            for (i = 0; i < n; i++) {
                lo = (i === 0)     ? b[i]     - aL : (sym ? b[i]     - o / 2 : b[i]);
                hi = (i === n - 1) ? b[i + 1] + aR : (sym ? b[i + 1] + o / 2 : b[i + 1] + o);
                tiles.push({
                    index: i + 1,
                    clean:    [b[i], T, b[i + 1], B],
                    expanded: [lo, T + aT, hi, B - aB]
                });
            }
            return tiles;
        }

        // vertical — cuts ascend along Y, but panels are numbered top down,
        // so the boundary list is built descending from the top.
        b.push(T);
        for (i = cuts.length - 1; i >= 0; i--) { b.push(cuts[i]); }
        b.push(B);
        n = b.length - 1;

        for (i = 0; i < n; i++) {
            hi = (i === 0)     ? b[i]     + aT : (sym ? b[i]     + o / 2 : b[i]);
            lo = (i === n - 1) ? b[i + 1] - aB : (sym ? b[i + 1] - o / 2 : b[i + 1] - o);
            tiles.push({
                index: i + 1,
                clean:    [L, b[i], R, b[i + 1]],
                expanded: [L - aL, hi, R + aR, lo]
            });
        }
        return tiles;
    },

    /**
     * Cut positions for n panels of equal PRINTED width.
     *
     * PRINTED width is the expanded rect — the PDF MediaBox, which is where the
     * red line sits and therefore what the finisher cuts. Equal printed width
     * means equal pieces of material and one number for the estimate.
     *
     * It cannot be had together with equal CLEAN widths, and that is a design
     * choice, not an artefact. An outer panel has one seam and an inner panel
     * has two, so at a constant printed width the outer panel must carry more
     * of the graphic (3000 mm, 3 panels, 20 mm overlap, symmetric):
     *
     *   equal printed (here):        printed 1013.3 x3  clean 1003.3/993.3/1003.3
     *   equal clean (even division): clean   1000   x3  printed 1010/1020/1010
     *
     * Both answer a real job spec. This tool prints and cuts, so the printed
     * width is the one that has to be predictable. At zero overlap they meet.
     *
     * Equal printed width holds in BOTH overlap modes — one-sided does not
     * break it, it only moves the seam by overlap/2 (measured: horizontal cuts
     * at 993.3 instead of 1003.3, vertical at 1013.3, the two directions
     * shifting opposite ways because a different end of the axis carries the
     * overlap). What the mode changes is which panel ends up with the wider
     * clean width.
     *
     * The material a job consumes is the clean length plus both edge adds plus
     * one overlap per inner seam, and there are n-1 of those:
     *
     *     W = (span + addLow + addHigh + (n - 1) * overlap) / n
     *
     * At zero overlap this reduces to plain even division, so rigid boards —
     * which are tiled without overlap — behave exactly as before.
     *
     * Equal panels matter for wallpaper and wall graphics, where constant strip
     * width eases fitting and makes material use one number. Sign work often
     * wants the opposite, a width that suits the installer; that is what the
     * "panel width" and "guides" modes are for.
     *
     * @param {Object} s - Settings.
     * @param {Object} extent - {start, end} ascending axis.
     * @param {number} n - Panel count, already validated as >= 2.
     * @returns {Array} Ascending cut positions.
     */
    equalCuts: function (s, extent, n) {
        var span = extent.end - extent.start;
        var o = TE.Utils.toDoc(Number(s.overlap) || 0, s);

        // The adds at the two ENDS OF THE SPLIT AXIS, which are different
        // settings depending on direction.
        var addLow, addHigh;
        if (s.direction === "horizontal") {
            addLow  = TE.Utils.toDoc(Number(s.addLeft) || 0, s);
            addHigh = TE.Utils.toDoc(Number(s.addRight) || 0, s);
        } else {
            // The axis ascends from the bottom, so "low" is the bottom edge.
            addLow  = TE.Utils.toDoc(Number(s.addBottom) || 0, s);
            addHigh = TE.Utils.toDoc(Number(s.addTop) || 0, s);
        }

        var W = (span + addLow + addHigh + (n - 1) * o) / n;

        // Where the first cut sits depends on how much of the overlap the
        // panel at the LOW end of the axis carries.
        //
        // Symmetric: half, either direction.
        // One-sided horizontal: the LEFT panel carries all of it, and left is
        //   the low end — so its seam sits a full overlap short.
        // One-sided vertical: the TOP panel carries all of it, and top is the
        //   HIGH end — so the panel at the low end carries none.
        // Missing that asymmetry made vertical one-sided panels differ by
        // exactly 2x the overlap (found by property test, n=2, overlap=1).
        var first;
        if (s.overlapMode === "symmetric") {
            first = W - o / 2 - addLow;
        } else if (s.direction === "horizontal") {
            first = W - o - addLow;
        } else {
            first = W - addLow;
        }
        var cuts = [];
        var c = extent.start + first;
        cuts.push(c);
        var i;
        for (i = 2; i < n; i++) {
            c = c + W - o;
            cuts.push(c);
        }
        return cuts;
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
