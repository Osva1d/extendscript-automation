// ------------------------------------------------------------------------
// Module: TE.Export — temporary document per panel, PDF output
// Part of: Illustrator Tile Export
// Depends on: TE.Config, TE.Draw, TE.L, TE.Utils
// ------------------------------------------------------------------------
var TE = TE || {};

TE.Export = {
    /**
     * Output scale factor.
     *   "source" — the temporary document keeps the source document's units,
     *              so a 1:10 job exports 1:10 and the RIP scales up.
     *   "actual" — real-world size.
     * @param {Object} s - Settings.
     * @returns {number} Multiplier applied to every coordinate.
     */

    /**
     * Maps one panel into its own temporary document. PURE FUNCTION — no DOM,
     * which is the whole reason this is testable.
     *
     * The temporary document's artboard starts at the origin, so the graphic
     * is placed at its offset relative to the panel's top-left corner.
     *
     * @param {Object} tile - {expanded: [l, t, r, b]} from TE.Grid.
     * @param {Array} g - Graphic bounds [l, t, r, b] in the source document.
     * @param {number} k - Output scale from TE.Utils.outputScale().
     * @returns {Object} {artboard: [l,t,r,b], position: [x,y], size: [w,h]}
     */
    tileTransform: function (tile, g, k) {
        var t = tile.expanded;
        return {
            artboard: [0, 0, (t[2] - t[0]) * k, -(t[1] - t[3]) * k],
            position: [(g[0] - t[0]) * k, (g[1] - t[1]) * k],
            size:     [(g[2] - g[0]) * k, (g[1] - g[3]) * k],
            // Where the graphic sits in the SOURCE document, for reference.
            sourceOrigin: [g[0], g[1]],
            // The panel's top-left corner in the SOURCE document, plus the
            // output scale. TE.Cut uses both to place a duplicated contour:
            // a source point X maps to (X - tileOrigin) * k in the temporary
            // document, which is the same rule the graphic follows.
            tileOrigin: [t[0], t[1]],
            k: k
        };
    },

    /**
     * Output file name from the pattern. {n} is zero-padded to the width of
     * the total, so twelve panels sort correctly in Finder.
     * @param {string} pattern - Carries {doc}, {n}, {total}.
     * @param {string} docName - Source document name without extension.
     * @param {number} index - 1-based panel number.
     * @param {number} total - How many panels there are.
     * @returns {string} File name without extension.
     */
    buildName: function (pattern, docName, index, total) {
        var width = String(total).length;
        var n = String(index);
        while (n.length < width) { n = "0" + n; }
        return String(pattern)
            .replace(/\{doc\}/g, docName)
            .replace(/\{n\}/g, n)
            .replace(/\{total\}/g, String(total));
    },

    /**
     * Whether this panel's output file is already on disk.
     * Lets a run that died on panel 9 of 12 resume without redoing the eight
     * already finished — same crash-recovery behaviour as batch-relink-export.
     * @param {Object} tile - Panel to check.
     * @param {Object} ctx - Export context.
     * @param {Object} s - Settings.
     * @returns {boolean} True when the output exists.
     */
    outputExists: function (tile, ctx, s) {
        var name = this.buildName(s.namePattern, ctx.docName, tile.index, ctx.total);
        return new File(ctx.outFolder.fsName + "/" + name + ".pdf").exists;
    },

    /**
     * Exports one panel through a temporary document.
     *
     * This is the structural answer to the overlap problem: panels overlap by
     * the overlap amount, so a neighbour's trim line falls inside this panel's
     * area. Here the neighbour's line does not exist, because it was never
     * drawn — there is no cleanup step that could go wrong.
     *
     * The source document is not touched at all.
     *
     * @param {Object} tile - One entry from TE.Grid.computeTiles().
     * @param {Object} ctx - {graphicFile, graphicBounds, docName, outFolder,
     *        total, pdfOptions, contour, markDef}.
     * @param {Object} s - Settings.
     * @returns {Object} {file: File, contourPaths: number}. contourPaths is 0
     *          when the cut contour does not reach this panel, which is not an
     *          error but belongs in the summary.
     * @throws {Error} TE_EXPORT:<index>:<message>
     */
    exportTile: function (tile, ctx, s) {
        // Every scale comes from ctx, never from app.activeDocument: from the
        // documents.add() below on, the active document is the temporary one,
        // which is never Large Canvas. Reading it is what made a Large Canvas
        // line ten times too thick (N10).
        var k = TE.Utils.outputScale(s, ctx.scaleFactor);
        var lineScale = TE.Utils.outputLineScale(s);
        var tf = this.tileTransform(tile, ctx.graphicBounds, k);
        var tmp = null;
        var contourPaths = 0;

        try {
            tmp = app.documents.add(DocumentColorSpace.CMYK,
                                    tf.artboard[2], -tf.artboard[3]);
            tmp.artboards[0].artboardRect = tf.artboard;

            var pi = tmp.placedItems.add();
            pi.file = ctx.graphicFile;
            // resize(), not width/height. The .width setter refuses anything
            // above 16347.7 pt (about 5767 mm), wherever the item sits, and the
            // WHOLE graphic of a large job passes that at 1:1 long before any
            // panel does (N7). resize() scales by percentage and has no such
            // cap — measured, docs/extendscript-engine-facts.md.
            pi.resize(tf.size[0] / pi.width * 100, tf.size[1] / pi.height * 100);
            pi.position = tf.position;

            if (s.drawLine) {
                // The panel's outer rect maps exactly onto the temporary
                // artboard, so the line marks the MediaBox of this PDF.
                TE.Draw.drawTileLine(tmp, tf.artboard, s, lineScale);
            }

            if (s.zundMode) {
                // Marks are computed from THIS panel's rect, so they sit on
                // the panel rather than on the whole graphic.
                var geo = TE.Core.calculateAll(s, tf.artboard);
                // markDef carries the spot definition from the source document;
                // a temporary document starts with only the default swatches.
                TE.Draw.drawMarks(tmp, geo, s, ctx.markDef);

                // Marks sit OUTSIDE the panel — measured: with a 10 mm gap and
                // a 5 mm mark, they reach 42.5 pt past each edge. The shared
                // geometry returns the artboard that fits them, and the panel
                // must grow to it or the marks never reach the PDF. The trim
                // line stays where it was, now inside a larger MediaBox.
                if (geo.ab) { tmp.artboards[0].artboardRect = geo.ab; }

                if (ctx.contour && ctx.contour.length) {
                    // Zero back means the contour does not reach this panel —
                    // not an error (a middle panel of a rectangular cut-out
                    // legitimately has none), but the caller reports it.
                    contourPaths = TE.Cut.renderTileContour(tmp, ctx.contour, tf, s);
                }
            }

            if (s.exportMode === "raster") {
                // Rasterising here is free — the document is thrown away
                // anyway, so there is nothing to protect and no duplication
                // needed. Note this rasterises the trim line too.
                var ro = new RasterizeOptions();
                ro.resolution = Number(s.rasterDPI) || 150;
                ro.antiAliasing = true;
                ro.transparency = false;
                var all = tmp.groupItems.add();
                var i;
                for (i = tmp.pageItems.length - 1; i >= 0; i--) {
                    if (tmp.pageItems[i] !== all) { tmp.pageItems[i].moveToEnd(all); }
                }
                tmp.rasterize(all, undefined, ro);
            }

            var name = this.buildName(s.namePattern, ctx.docName, tile.index, ctx.total);
            var out = new File(ctx.outFolder.fsName + "/" + name + ".pdf");
            tmp.saveAs(out, ctx.pdfOptions);
            return { file: out, contourPaths: contourPaths };
        } catch (e) {
            throw new Error("TE_EXPORT:" + tile.index + ":" + e.message);
        } finally {
            if (tmp) {
                try { tmp.close(SaveOptions.DONOTSAVECHANGES); }
                catch (e2) { TE.Utils.log("cannot close temp doc: " + e2.message); }
            }
        }
    }
};
