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
     * Draws the trim line around one panel's OUTER rectangle.
     *
     * THE ONLY PLACE A LINE IS DRAWN. Both the preview in phase 1 and the
     * export in phase 2 call this. Two implementations of the same rectangle
     * would drift, and the difference would only show on the printed sheet.
     *
     * Three things that are easy to get wrong and were:
     *
     * 1. The line marks the panel's OUTER size — the MediaBox of the exported
     *    PDF — not the clean format. Cutting along it leaves the mounting bleed
     *    on the panel, which is what the fitter needs. A line on the clean
     *    format would have the finisher cut the bleed off.
     *
     * 2. The path lies ON that rectangle and the stroke is twice the set
     *    width. Strokes are always centred on their path, so the page edge
     *    crops the outer half and the set width stays inside the panel. Until
     *    N13 the path was inset by half the stroke instead, which put the
     *    stroke's outer edge exactly on the page edge — with zero tolerance,
     *    so a fraction of a point lost in a viewer, the RIP or the cut shaved
     *    the line or opened a white sliver beside it. Now the edge always
     *    falls inside the stroke. In Zünd mode the line is the cut path and
     *    does not print; there the path must be on the edge anyway.
     *
     * 3. Stroke width is a printed-output measurement, so it has to be scaled
     *    to the document it is drawn into. Without that, a 0.3 pt line in a
     *    1:10 document comes out as 3 pt on the press — the same class of bug
     *    as zund-summa-marks v26.4.0. The scale is PASSED IN: it used to be
     *    derived here from app.activeDocument, which during an export is the
     *    temporary document, so a Large Canvas panel got a line ten times too
     *    thick (N10).
     *
     * @param {Document} doc - Document to draw into.
     * @param {Array} rect - Outer rect [l, t, r, b] of the panel, top > bottom.
     * @param {Object} s - Settings (lineSpot, lineWidth).
     * @param {number} lineScale - Stroke points per printed point:
     *        1 / TE.Utils.getEffectiveSF(s) for the preview in the source
     *        document, TE.Utils.outputLineScale(s) in a temporary one.
     * @returns {PathItem} The drawn rectangle.
     */
    drawTileLine: function (doc, rect, s, lineScale) {
        var spot = this.getOrCreateSpot(doc, s.lineSpot);
        // Visible width in document points; the stroke is twice that (see 2).
        var sw = (Number(s.lineWidth) || 1) * (Number(lineScale) || 1);

        var p = doc.pathItems.rectangle(rect[1], rect[0],
            rect[2] - rect[0], rect[1] - rect[3]);
        p.filled = false;
        p.stroked = true;
        p.strokeColor = spot;
        p.strokeWidth = 2 * sw;
        p.name = "TE_line";
        return p;
    },



    /**
     * Name of the registration swatch. It is always index 1 and its name is
     * LOCALIZED — "[Registrační]" on a Czech install — so it must be read,
     * never assumed. Same approach as zund-summa-marks.
     * @param {Document} doc - Document to read from.
     * @returns {string} The registration swatch name.
     */
    getRegistrationName: function (doc) {
        try {
            return doc.swatches[1].name;
        } catch (e) {
            return "[Registration]";
        }
    },

    /**
     * Colours offerable for registration marks: registration first, then the
     * document's own spot colours. System spots are bracketed and skipped —
     * registration is already in the list.
     * @param {Document} doc - Document to read from.
     * @returns {Array} Swatch names.
     */
    listMarkColors: function (doc) {
        var names = [this.getRegistrationName(doc)];
        var i, j, n, dup;
        try {
            for (i = 0; i < doc.spots.length; i++) {
                try {
                    n = doc.spots[i].name;
                    if (n.charAt(0) === "[") { continue; }
                    dup = false;
                    for (j = 0; j < names.length; j++) {
                        if (names[j] === n) { dup = true; break; }
                    }
                    if (!dup) { names.push(n); }
                } catch (e2) {
                    // Skip unreadable spots (corrupt or unresolved library refs).
                }
            }
        } catch (e) {
            TE.Utils.log("listMarkColors: spots unreadable: " + e.message);
        }
        return names;
    },

    /**
     * Reads a spot colour's definition so it can be recreated in a temporary
     * document, which starts with only the default swatches.
     *
     * Returns null for registration — every document already has it — and for
     * anything unknown, which the caller turns into a registration fallback.
     *
     * @param {Document} doc - Source document.
     * @param {string} name - Spot colour name.
     * @returns {Object|null} {name, cyan, magenta, yellow, black} or null.
     */
    readSpotDef: function (doc, name) {
        if (!name || name === this.getRegistrationName(doc) || name.charAt(0) === "[") {
            return null;
        }
        var i, sp, c;
        try {
            for (i = 0; i < doc.spots.length; i++) {
                sp = doc.spots[i];
                if (sp.name !== name) { continue; }
                c = sp.color;
                if (c && c.typename === "CMYKColor") {
                    return { name: name, cyan: c.cyan, magenta: c.magenta,
                             yellow: c.yellow, black: c.black };
                }
                // Non-CMYK spot (RGB or Lab): recreate as black rather than
                // guessing a conversion the press would disagree with.
                return { name: name, cyan: 0, magenta: 0, yellow: 0, black: 100 };
            }
        } catch (e) {
            TE.Utils.log("readSpotDef failed for " + name + ": " + e.message);
        }
        return null;
    },

    /**
     * The colour to draw marks with, in THIS document.
     *
     * Cascade: a definition carried from the source document is recreated here;
     * otherwise the named swatch if it exists; otherwise registration. Never
     * silently invents a spot colour the user did not ask for — a mark in the
     * wrong colour is one the machine will not read.
     *
     * @param {Document} doc - Document to draw into.
     * @param {string} name - Requested colour name.
     * @param {Object|null} def - Definition from TE.Draw.readSpotDef(), or null.
     * @returns {Object} A colour ready to assign.
     */
    resolveMarkColor: function (doc, name, def) {
        var i, sc;
        if (def) {
            try {
                for (i = 0; i < doc.spots.length; i++) {
                    if (doc.spots[i].name === def.name) {
                        sc = new SpotColor();
                        sc.spot = doc.spots[i];
                        return sc;
                    }
                }
                var spot = doc.spots.add();
                spot.name = def.name;
                spot.colorType = ColorModel.SPOT;
                var cmyk = new CMYKColor();
                cmyk.cyan = def.cyan; cmyk.magenta = def.magenta;
                cmyk.yellow = def.yellow; cmyk.black = def.black;
                spot.color = cmyk;
                sc = new SpotColor();
                sc.spot = spot;
                return sc;
            } catch (e) {
                TE.Utils.log("resolveMarkColor: cannot recreate " + def.name + ": " + e.message);
            }
        }
        try {
            return doc.swatches.getByName(name || this.getRegistrationName(doc)).color;
        } catch (e2) {
            try {
                return doc.swatches.getByName(this.getRegistrationName(doc)).color;
            } catch (e3) {
                var k = new CMYKColor();
                k.black = 100;
                return k;
            }
        }
    },

    /**
     * Draws Zünd registration marks from the shared geometry.
     *
     * Geometry comes from shared/lib/cut_marks.js so a wrong mark position is
     * wrong in one place, not two. Drawing stays per tool: ZSM.Draw is wired
     * into cut-layer management this tool does not have.
     *
     * The mark colour is its OWN setting, not the contour's — marks in the cut
     * colour would be indistinguishable from the cut on the machine. Default is
     * registration; white Spot 1 is used on black and clear material.
     *
     * @param {Document} doc - Temporary document of one panel.
     * @param {Object} geo - Output of TE.Core.calculateAll().
     * @param {Object} s - Settings.
     * @param {Object|null} markDef - Spot definition carried from the source
     *        document, from TE.Draw.readSpotDef(). Null means registration.
     * @returns {number} How many marks were drawn.
     */
    drawMarks: function (doc, geo, s, markDef, pageRatio) {
        var spot = this.resolveMarkColor(doc, s.markColor, markDef);
        // Radius in the temporary document. Passed in, never read from the
        // active document: that one is the temporary document and lost the
        // manual 1:N, so a 1:10 job exported 1:1 got 0.5 mm marks (N11).
        var r = TE.Utils.mm2pt(Number(s.markSizeZ) / 2) / (Number(pageRatio) || 1);
        var i, m, c, n = 0;

        for (i = 0; i < geo.marksZ.length; i++) {
            // The shared geometry returns marks as {cx, cy} centres, not pairs.
            m = geo.marksZ[i];
            if (isNaN(m.cx) || isNaN(m.cy)) {
                TE.Utils.log("drawMarks: skipping mark " + i + ", coordinate is NaN");
                continue;
            }
            try {
                // pathItems.ellipse(top, left, width, height) — the mark is
                // centred on m, so the box starts half a diameter away.
                c = doc.pathItems.ellipse(m.cy + r, m.cx - r, r * 2, r * 2);
                c.filled = true;
                c.fillColor = spot;
                // Overprint, as zund-summa-marks does: the mark must not knock
                // a hole in the artwork underneath it.
                c.fillOverprint = true;
                c.stroked = false;
                c.name = "TE_mark";
                n++;
            } catch (e) {
                TE.Utils.log("drawMarks: failed at mark " + i + ": " + e.message);
            }
        }
        return n;
    },

    /**
     * Returns the lines layer, emptied. Cleared on every start without asking,
     * so a crashed run leaves nothing behind — idempotence per ~/Dev/CLAUDE.md.
     * @param {Document} doc - Active document.
     * @returns {Layer} The empty layer.
     */
    /**
     * The tool's own lines layer, or null when the document has none.
     * @param {Document} doc - Target document.
     * @returns {Layer|null} The layer named TE.Config.layerLines.
     */
    findLinesLayer: function (doc) {
        var name = TE.Config.layerLines, i;
        try {
            for (i = 0; i < doc.layers.length; i++) {
                if (doc.layers[i].name === name) { return doc.layers[i]; }
            }
        } catch (e) {
            TE.Utils.log("layer lookup failed: " + e.message);
        }
        return null;
    },

    /**
     * Get-or-create the lines layer and empty it, ready to draw into.
     * Call only when lines are about to be drawn — on a run without lines
     * this would leave an empty layer behind; use removeLinesLayer() there.
     * @param {Document} doc - Target document.
     * @returns {Layer} The emptied layer.
     */
    clearLinesLayer: function (doc) {
        var lay = this.findLinesLayer(doc), i;

        if (!lay) {
            lay = doc.layers.add();
            lay.name = TE.Config.layerLines;
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
     * For a run WITHOUT lines: take away what a previous run with lines left.
     *
     * Two jobs that used to be one. The old lines must go — otherwise turning
     * the line off would keep last run's lines on screen. But the layer itself
     * should not appear just because this ran: a document that never had lines
     * got an empty TE_lines layer.
     *
     * The layer is emptied exactly as clearLinesLayer() would, and then removed
     * only when that leaves it truly empty. A sublayer someone put there, or a
     * layer that is the document's last, stays — deleting those would destroy
     * more than a clear ever did.
     *
     * @param {Document} doc - Target document.
     * @returns {boolean} True when the layer existed and was removed.
     */
    removeLinesLayer: function (doc) {
        var lay = this.findLinesLayer(doc);
        if (!lay) { return false; }

        this.clearLinesLayer(doc);
        if (lay.layers.length > 0 || lay.pageItems.length > 0) { return false; }
        if (doc.layers.length < 2) { return false; }
        try {
            lay.remove();
            return true;
        } catch (e) {
            TE.Utils.log("cannot remove lines layer: " + e.message);
            return false;
        }
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
