// ------------------------------------------------------------------------
// Module: TE.Draw — spot colour, trim line, panel artboards
// Part of: Illustrator Tile Export
// Depends on: TE.Config, TE.Doc, TE.L, TE.Utils
// ------------------------------------------------------------------------
var TE = TE || {};

TE.Draw = {
    /**
     * Finds the named spot colour, or creates it with a red CMYK appearance.
     *
     * Failure is a hard error, never a quiet fall back to process CMYK: a line
     * in the wrong colour looks right on screen and travels all the way to the
     * finisher. Better to stop than to ship a plausible-looking wrong file.
     *
     * @param {Document} doc - Document to look in.
     * @param {string} name - Spot colour name.
     * @returns {SpotColor} Ready to assign to strokeColor.
     * @throws {Error} TE_SPOT when the colour cannot be created.
     */
    getOrCreateSpot: function (doc, name) {
        var i, sc;
        try {
            for (i = 0; i < doc.spots.length; i++) {
                if (doc.spots[i].name === name) {
                    sc = new SpotColor();
                    sc.spot = doc.spots[i];
                    return sc;
                }
            }
        } catch (e) {
            TE.Utils.log("spot lookup failed: " + e.message);
        }

        try {
            var spot = doc.spots.add();
            spot.name = name;
            spot.colorType = ColorModel.SPOT;
            var cmyk = new CMYKColor();
            cmyk.cyan = 0; cmyk.magenta = 100; cmyk.yellow = 100; cmyk.black = 0;
            spot.color = cmyk;
            sc = new SpotColor();
            sc.spot = spot;
            return sc;
        } catch (e2) {
            throw new Error("TE_SPOT");
        }
    },

    /**
     * Draws the trim line around one panel's clean format.
     *
     * THE ONLY PLACE A LINE IS DRAWN. Both the preview in phase 1 and the
     * export in phase 2 call this. Two implementations of the same rectangle
     * would drift, and the difference would only show on the printed sheet.
     *
     * @param {Document} doc - Document to draw into.
     * @param {Array} rect - Clean rect [l, t, r, b], top > bottom.
     * @param {Object} s - Settings (lineSpot, lineWidth).
     * @returns {PathItem} The drawn rectangle.
     */
    drawTileLine: function (doc, rect, s) {
        var spot = this.getOrCreateSpot(doc, s.lineSpot);
        var p = doc.pathItems.rectangle(rect[1], rect[0], rect[2] - rect[0], rect[1] - rect[3]);
        p.filled = false;
        p.stroked = true;
        p.strokeColor = spot;
        p.strokeWidth = Number(s.lineWidth) || 1;
        p.name = "TE_line";
        return p;
    },

    /**
     * Returns the lines layer, emptied. Cleared on every start without asking,
     * so a crashed run leaves nothing behind — idempotence per ~/Dev/CLAUDE.md.
     * @param {Document} doc - Active document.
     * @returns {Layer} The empty layer.
     */
    clearLinesLayer: function (doc) {
        var name = TE.Config.layerLines, lay = null, i;
        try {
            for (i = 0; i < doc.layers.length; i++) {
                if (doc.layers[i].name === name) { lay = doc.layers[i]; break; }
            }
        } catch (e) {
            TE.Utils.log("layer lookup failed: " + e.message);
        }

        if (!lay) {
            lay = doc.layers.add();
            lay.name = name;
            return lay;
        }

        lay.locked = false;
        lay.visible = true;
        // Backwards — pageItems is a live collection and removing from the
        // front reindexes everything after it.
        for (i = lay.pageItems.length - 1; i >= 0; i--) {
            try { lay.pageItems[i].remove(); }
            catch (e2) { TE.Utils.log("cannot remove line item: " + e2.message); }
        }
        return lay;
    },

    /**
     * Creates one artboard per panel, named with the prefix and a zero-padded
     * index. The name is how a second run recognises them.
     * @param {Document} doc - Active document.
     * @param {Array} tiles - Panels from TE.Grid.computeTiles().
     * @returns {number} How many artboards were created.
     * @throws {Error} TE_AB_ADD when Illustrator rejects a rect.
     */
    createTileArtboards: function (doc, tiles) {
        var made = 0, i, ab, num;
        for (i = 0; i < tiles.length; i++) {
            num = String(tiles[i].index);
            while (num.length < 2) { num = "0" + num; }
            try {
                ab = doc.artboards.add(tiles[i].expanded);
                ab.name = TE.Config.tilePrefix + num;
                made++;
            } catch (e) {
                // artboards.add throws MRAP when the rect is malformed or too
                // large; TE.Validate should have caught the size case already.
                throw new Error("TE_AB_ADD:" + num + ":" + e.message);
            }
        }
        return made;
    },

    /**
     * Removes previously generated panel artboards, so a second run can
     * recompute a different split.
     * @param {Document} doc - Active document.
     * @returns {number} How many artboards were removed.
     */
    removeTileArtboards: function (doc) {
        var idx = TE.Doc.findTileArtboards(doc), removed = 0, i;
        for (i = idx.length - 1; i >= 0; i--) {
            try { doc.artboards[idx[i]].remove(); removed++; }
            catch (e) { TE.Utils.log("cannot remove artboard: " + e.message); }
        }
        return removed;
    }
};
