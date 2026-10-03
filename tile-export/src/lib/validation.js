// ------------------------------------------------------------------------
// Module: TE.Validate — §5 rules. Errors stop the run, warnings do not.
// Part of: Illustrator Tile Export
// Depends on: TE.Config, TE.Core, TE.Export, TE.Utils, TE.L
// ------------------------------------------------------------------------
var TE = TE || {};

TE.Validate = {
    /**
     * Checks a computed job against the document it will run on.
     *
     * @param {Array} tiles - Output of TE.Grid.computeTiles().
     * @param {Object} ctx - {overhang:{left,right,top,bottom} in doc points,
     *        graphicCount, scaleFactor, mediaWidth (mm or null), maxArtboard (pt)}.
     * @param {Object} s - Settings.
     * @returns {Object} {errors, exportErrors, warnings}. errors stop every
     *          action; exportErrors stop the export only (N17).
     */
    check: function (tiles, ctx, s) {
        var errors = [], exportErrors = [], warnings = [];
        var eps = 1e-6;
        var i, t, w, h, k, shortest, overlapPt, conflict;

        // Exactly one placed graphic — export builds a temporary document that
        // carries only the graphic, so anything else would be silently dropped.
        if (ctx.graphicCount !== 1) {
            errors.push(TE.L.format(TE.L.ERR_MANY_GRAPHICS, ctx.graphicCount));
        }

        // Adds must be covered by material the supplied PDF actually carries.
        // A bigger add would leave a blank margin that looks fine on screen
        // and is only found on the printed sheet.
        // Edge names come from the locale: they land inside a sentence (N3).
        this.checkAdd(errors, Number(s.addLeft),   ctx.overhang.left,   TE.L.EDGE_LEFT,   s);
        this.checkAdd(errors, Number(s.addRight),  ctx.overhang.right,  TE.L.EDGE_RIGHT,  s);
        this.checkAdd(errors, Number(s.addTop),    ctx.overhang.top,    TE.L.EDGE_TOP,    s);
        this.checkAdd(errors, Number(s.addBottom), ctx.overhang.bottom, TE.L.EDGE_BOTTOM, s);

        // Overlap must stay inside the shortest panel, or a panel would reach
        // past its neighbour entirely.
        shortest = this.shortestPanel(tiles, s);
        overlapPt = TE.Utils.toDoc(Number(s.overlap) || 0, s);
        if (tiles.length > 1 && overlapPt >= shortest - eps) {
            errors.push(TE.L.format(TE.L.ERR_OVERLAP_BIG,
                TE.Utils.formatMM(Number(s.overlap), TE.L.DECIMAL),
                TE.Utils.formatMM(TE.Utils.fromDoc(shortest, s), TE.L.DECIMAL)));
        }

        // Zünd: the print mask reaches a bleed past the cut, and on the OUTER
        // edges there is only as much artwork as the placed PDF carries. Add
        // plus bleed beyond that is a white strip on the printed panel. An
        // export error: Panels only draws no mask. Seams need no check, the
        // artwork continues there.
        if (s.zundMode) {
            this.checkBleed(exportErrors, Number(s.addLeft),   ctx.overhang.left,   TE.L.EDGE_LEFT,   s);
            this.checkBleed(exportErrors, Number(s.addRight),  ctx.overhang.right,  TE.L.EDGE_RIGHT,  s);
            this.checkBleed(exportErrors, Number(s.addTop),    ctx.overhang.top,    TE.L.EDGE_TOP,    s);
            this.checkBleed(exportErrors, Number(s.addBottom), ctx.overhang.bottom, TE.L.EDGE_BOTTOM, s);

            // Marks that would print as one shape (N26): on a narrow panel the
            // orientation dot lands on a corner mark, a short spacing merges
            // neighbours. Live, so only up to MARK_CHECK_LIVE_MAX marks a
            // panel; main.js checks the rest before the export.
            conflict = this.markConflict(tiles, ctx, s, TE.Config.MARK_CHECK_LIVE_MAX);
            if (conflict) { exportErrors.push(this.describeMarkConflict(conflict, s)); }
        }

        // Panel must fit an Illustrator artboard once the output scale applies.
        // TE.Utils.outputScale is the export's own rule, so this measures the
        // size the export will actually produce. The message names the panel,
        // its size and the limit: without them nobody could tell whether more
        // panels would help — they do not when it is the height that overflows.
        // An EXPORT error: Panels only draws in the document at its own scale
        // and never meets this limit, so it must not be blocked by it (N17).
        k = TE.Utils.outputScale(s, ctx.scaleFactor);
        for (i = 0; i < tiles.length; i++) {
            t = tiles[i].expanded;
            w = (t[2] - t[0]) * k;
            h = (t[1] - t[3]) * k;
            if (w > ctx.maxArtboard || h > ctx.maxArtboard) {
                exportErrors.push(TE.L.format(TE.L.ERR_AB_TOO_BIG, tiles[i].index,
                    TE.Utils.formatMM(TE.Utils.pt2mm(w), TE.L.DECIMAL),
                    TE.Utils.formatMM(TE.Utils.pt2mm(h), TE.L.DECIMAL),
                    TE.Utils.formatMM(TE.Utils.pt2mm(ctx.maxArtboard), TE.L.DECIMAL)));
                break;
            }
        }

        // Media width only warns — the user may not have entered one, and
        // knowing better than them about their own press is not our job.
        if (ctx.mediaWidth) {
            for (i = 0; i < tiles.length; i++) {
                t = tiles[i].expanded;
                w = TE.Utils.fromDoc(t[2] - t[0], s);
                if (w > Number(ctx.mediaWidth) + eps) {
                    warnings.push(TE.L.format(TE.L.WARN_MEDIA,
                        TE.Utils.formatMM(w, TE.L.DECIMAL),
                        TE.Utils.formatMM(Number(ctx.mediaWidth), TE.L.DECIMAL)));
                    break;
                }
            }
        }

        return { errors: errors, exportErrors: exportErrors, warnings: warnings };
    },

    /**
     * One edge: the add must not exceed the graphic overhang there.
     * Zero add ("načisto") needs no overhang at all.
     * @param {Array} errors - Collected errors, mutated in place.
     * @param {number} addMm - Add on this edge, real-world mm.
     * @param {number} overhangPt - Available overhang, document points.
     * @param {string} edge - Edge name for the message.
     * @param {Object} s - Settings.
     */
    checkAdd: function (errors, addMm, overhangPt, edge, s) {
        var add = Number(addMm) || 0;
        if (add <= 0) { return; }
        var addPt = TE.Utils.toDoc(add, s);
        if (addPt > overhangPt + 1e-6) {
            errors.push(TE.L.format(TE.L.ERR_ADD_OVERHANG, edge,
                TE.Utils.formatMM(add, TE.L.DECIMAL),
                TE.Utils.formatMM(TE.Utils.fromDoc(overhangPt, s), TE.L.DECIMAL)));
        }
    },

    /**
     * One outer edge in Zünd mode: add plus bleed past the cut must be
     * covered by the placed PDF's overhang there.
     * @param {Array} out - Collected export errors, mutated in place.
     * @param {number} addMm - Add on this edge, mm.
     * @param {number} overhangPt - Graphic overhang on this edge, doc points.
     * @param {string} edge - Localized edge name.
     * @param {Object} s - Settings (cutBleed).
     */
    checkBleed: function (out, addMm, overhangPt, edge, s) {
        var add = Number(addMm) || 0;
        var bleed = Number(s.cutBleed) || 0;
        if (TE.Utils.toDoc(add + bleed, s) > overhangPt + 1e-6) {
            out.push(TE.L.format(TE.L.ERR_BLEED_OVERHANG,
                TE.Utils.formatMM(bleed, TE.L.DECIMAL), edge,
                TE.Utils.formatMM(add, TE.L.DECIMAL),
                TE.Utils.formatMM(add + bleed, TE.L.DECIMAL),
                TE.Utils.formatMM(TE.Utils.fromDoc(overhangPt, s), TE.L.DECIMAL)));
        }
    },

    /**
     * Zünd: the first panel whose marks would print as one shape or stick out
     * of the page — the shared check zund-summa-marks runs before it draws
     * (review K7), on the geometry the export builds (buildZundPanel).
     *
     * Panels of one size carry the same marks, so each size is checked once.
     * findMarkConflict compares every pair of marks; with maxMarks, a panel
     * that carries more is skipped, so a spacing typed on the way to its final
     * value cannot stall the dialog.
     *
     * @param {Array} tiles - Panels from computeTiles().
     * @param {Object} ctx - {scaleFactor}.
     * @param {Object} s - Settings.
     * @param {number} [maxMarks] - Skip panels with more marks than this.
     * @returns {Object|null} {index, type, dist} with dist in real mm, or null.
     */
    markConflict: function (tiles, ctx, s, maxMarks) {
        var k = TE.Utils.outputScale(s, ctx.scaleFactor);
        var ratio = TE.Utils.pageRatio(s, ctx.scaleFactor);
        var seen = [], i, tf, size, geo, c;
        for (i = 0; i < tiles.length; i++) {
            tf = TE.Export.tileTransform(tiles[i], [0, 0, 0, 0], k);
            size = Math.round(tf.artboard[2] * 1000) + "x" + Math.round(tf.artboard[3] * 1000);
            if (TE.Utils.indexOf(seen, size) !== -1) { continue; }
            seen.push(size);
            geo = TE.Core.calculateAll(s, TE.Export.zundLayout(tf, s, ratio).mask, ratio);
            if (maxMarks && geo.marksZ.length > maxMarks) { continue; }
            c = TE.Core.findMarkConflict(geo, s, ratio);
            if (c) { return { index: tiles[i].index, type: c.type, dist: c.dist }; }
        }
        return null;
    },

    /**
     * The message for a markConflict() result.
     * @param {Object} c - {index, type, dist} from markConflict().
     * @param {Object} s - Settings (markSizeZ).
     * @returns {string} Localized message.
     */
    describeMarkConflict: function (c, s) {
        var tpl = { overlap: TE.L.ERR_MARKS_OVERLAP, orient: TE.L.ERR_MARKS_ORIENT,
                    outside: TE.L.ERR_MARKS_OUTSIDE }[c.type];
        return TE.L.format(tpl, c.index,
            TE.Utils.formatMM(c.dist, TE.L.DECIMAL),
            TE.Utils.formatMM(Number(s.markSizeZ), TE.L.DECIMAL));
    },

    /**
     * Shortest clean panel along the split axis, in document points.
     * @param {Array} tiles - Panels from computeTiles().
     * @param {Object} s - Settings.
     * @returns {number} Length in document points.
     */
    shortestPanel: function (tiles, s) {
        var min = Infinity, i, c, len;
        for (i = 0; i < tiles.length; i++) {
            c = tiles[i].clean;
            len = (s.direction === "horizontal") ? (c[2] - c[0]) : (c[1] - c[3]);
            if (len < min) { min = len; }
        }
        return min;
    }
};
