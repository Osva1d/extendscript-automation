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
    outputScale: function (s) {
        return (s.exportScale === "actual") ? TE.Utils.getEffectiveSF(s) : 1;
    },

    /**
     * Maps one panel into its own temporary document. PURE FUNCTION — no DOM,
     * which is the whole reason this is testable.
     *
     * The temporary document's artboard starts at the origin, so the graphic
     * is placed at its offset relative to the panel's top-left corner.
     *
     * @param {Object} tile - {expanded: [l, t, r, b]} from TE.Grid.
     * @param {Array} g - Graphic bounds [l, t, r, b] in the source document.
     * @param {number} k - Output scale from outputScale().
     * @returns {Object} {artboard: [l,t,r,b], position: [x,y], size: [w,h]}
     */
    tileTransform: function (tile, g, k) {
        var t = tile.expanded;
        return {
            artboard: [0, 0, (t[2] - t[0]) * k, -(t[1] - t[3]) * k],
            position: [(g[0] - t[0]) * k, (g[1] - t[1]) * k],
            size:     [(g[2] - g[0]) * k, (g[1] - g[3]) * k]
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
     *        total, pdfOptions}.
     * @param {Object} s - Settings.
     * @returns {File} The written PDF.
     * @throws {Error} TE_EXPORT:<index>:<message>
     */
    exportTile: function (tile, ctx, s) {
        var k = this.outputScale(s);
        var tf = this.tileTransform(tile, ctx.graphicBounds, k);
        var tmp = null;

        try {
            tmp = app.documents.add(DocumentColorSpace.CMYK,
                                    tf.artboard[2], -tf.artboard[3]);
            tmp.artboards[0].artboardRect = tf.artboard;

            var pi = tmp.placedItems.add();
            pi.file = ctx.graphicFile;
            pi.width = tf.size[0];
            pi.height = tf.size[1];
            pi.position = tf.position;

            if (s.drawLine) {
                // The panel's outer rect maps exactly onto the temporary
                // artboard, so the line marks the MediaBox of this PDF.
                TE.Draw.drawTileLine(tmp, tf.artboard, s, k);
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
            return out;
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
