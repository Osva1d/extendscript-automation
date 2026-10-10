// ------------------------------------------------------------------------
// Module: TE.Check — check panels in the working document (Panels only)
// Part of: Illustrator Tile Export
// Depends on: TE.Config, TE.Core, TE.Doc, TE.Draw, TE.Export, TE.Utils
// ------------------------------------------------------------------------
var TE = TE || {};

TE.Check = {
    /**
     * Geometry of one check panel in the working document. PURE FUNCTION.
     *
     * The working document stays at its drawing scale, so a check panel is
     * built in its own coordinates — inner units on a Large Canvas — with the
     * ratio of real millimetres per document millimetre: the drawing scale
     * times the Large Canvas factor. The Zünd cut, mask, marks and page come
     * from the functions the export uses (zundLayout, calculateAll); all of
     * them are measured from the panel, so a moved panel gets them moved.
     *
     * @param {Object} tile - {index, clean, expanded} in document points.
     * @param {Object} s - Settings.
     * @param {number} sf - Large Canvas factor of the working document.
     * @returns {Object} {ratio, clean, panel, mask, cut, page, geo}; cut and
     *          geo only in Zünd mode, page is the PDF page the export writes.
     */
    geometry: function (tile, s, sf) {
        var ratio = (Number(sf) || 1) * TE.Utils.manualScale(s);
        var e = tile.expanded;
        var g = { ratio: ratio, clean: tile.clean, panel: e, mask: e, cut: null, page: e, geo: null };
        if (s.zundMode) {
            var zl = TE.Export.zundLayout({ artboard: e }, s, ratio);
            g.cut = zl.cut;
            g.mask = zl.mask;
            g.geo = TE.Core.calculateAll(s, zl.mask, ratio);
            if (g.geo && g.geo.ab) { g.page = g.geo.ab; }
        }
        return g;
    },

    /**
     * A tile moved by (dx, dy). PURE FUNCTION.
     * @param {Object} tile - {index, clean, expanded}.
     * @param {number} dx - Horizontal move, points.
     * @param {number} dy - Vertical move, points.
     * @returns {Object} The moved tile.
     */
    shiftTile: function (tile, dx, dy) {
        function sh(r) { return [r[0] + dx, r[1] + dy, r[2] + dx, r[3] + dy]; }
        return { index: tile.index, clean: sh(tile.clean), expanded: sh(tile.expanded) };
    },

    /**
     * Gap between check panels, document points. PURE FUNCTION.
     * At least 10 mm on the rulers, and 5 % of the widest page side, so that
     * panels of a drawing at real size still read as apart. Nothing of a
     * panel reaches its neighbour: the line's outer half and the marks lie on
     * the panel's own page.
     * @param {Array} pages - Page rects [l, t, r, b].
     * @param {number} sf - Large Canvas factor: rulers show sf × points.
     * @returns {number} Gap in document points.
     */
    gap: function (pages, sf) {
        var side = 0, i, p;
        for (i = 0; i < pages.length; i++) {
            p = pages[i];
            side = Math.max(side, p[2] - p[0], p[1] - p[3]);
        }
        return Math.max(TE.Utils.mm2pt(10) / (Number(sf) || 1), side * 0.05);
    },

    /**
     * Where each check panel goes, as moves of its page. PURE FUNCTION.
     *
     * In numbering order and clear of everything in the document: Svisle
     * panels in a row below it, left to right; Vodorovně panels in a column
     * to its right, top down. A row or column that would leave the canvas
     * wraps onto the next. Every page has to lie on the canvas — a path past
     * its edge gets deformed, while a placed copy may reach past it (both
     * measured 2026-10-10) and is clipped to its page anyway.
     *
     * @param {Array} pages - Page rects [l, t, r, b] where the panels lie now.
     * @param {Array} content - Bounds of what the document holds [l, t, r, b].
     * @param {Object} canvas - {l, t, r, b}.
     * @param {string} direction - "horizontal" (Svisle) or "vertical".
     * @param {number} gap - Gap between pages, points.
     * @returns {Array|null} [[dx, dy], …] per page, or null when they do not fit.
     */
    layout: function (pages, content, canvas, direction, gap) {
        var out = [], i, p, w, h;
        if (direction !== "vertical") {
            var x0 = Math.max(content[0], canvas.l), x = x0;
            var top = content[3] - gap, rowH = 0;
            for (i = 0; i < pages.length; i++) {
                p = pages[i];
                w = p[2] - p[0];
                h = p[1] - p[3];
                if (x > x0 && x + w > canvas.r) {
                    top -= rowH + gap;
                    x = x0;
                    rowH = 0;
                }
                if (x + w > canvas.r || top - h < canvas.b) { return null; }
                out.push([x - p[0], top - p[1]]);
                x += w + gap;
                rowH = Math.max(rowH, h);
            }
            return out;
        }
        var y0 = Math.min(content[1], canvas.t), y = y0;
        var left = content[2] + gap, colW = 0;
        for (i = 0; i < pages.length; i++) {
            p = pages[i];
            w = p[2] - p[0];
            h = p[1] - p[3];
            if (y < y0 && y - h < canvas.b) {
                left += colW + gap;
                y = y0;
                colW = 0;
            }
            if (y - h < canvas.b || left + w > canvas.r) { return null; }
            out.push([left - p[0], y - p[1]]);
            y -= h + gap;
            colW = Math.max(colW, w);
        }
        return out;
    },

    /**
     * The canvas in document coordinates, {l, t, r, b}. Illustrator does not
     * report it: it is 16 383 pt square, centred on the first artboard as the
     * document was made, and stays put when artboards move (measured
     * 2026-10-10). An artboard past it is refused, so its edges are found by
     * bisection with probe artboards — about a hundred added and removed,
     * ~0.1 s.
     * @param {Document} doc - Working document.
     * @returns {Object} {l, t, r, b}.
     */
    canvasBounds: function (doc) {
        var a = doc.artboards[0].artboardRect;
        var cx = (a[0] + a[2]) / 2, cy = (a[1] + a[3]) / 2;
        var far = 40000;   // past any canvas
        function fits(rect) {
            try { doc.artboards.add(rect).remove(); return true; }
            catch (e) { return false; }
        }
        function edge(inside, outside, test) {
            var i, mid;
            for (i = 0; i < 24; i++) {
                mid = (inside + outside) / 2;
                if (test(mid)) { inside = mid; } else { outside = mid; }
            }
            return inside;
        }
        return {
            l: edge(cx, cx - far, function (x) { return fits([x, cy, x + 1, cy - 1]); }),
            r: edge(cx, cx + far, function (x) { return fits([x - 1, cy, x, cy - 1]); }),
            t: edge(cy, cy + far, function (y) { return fits([cx, y, cx + 1, y - 1]); }),
            b: edge(cy, cy - far, function (y) { return fits([cx, y + 1, cx + 1, y]); })
        };
    },

    /**
     * Bounds of what the document holds: its own artboards and the placed
     * graphic. Guides are left out — they reach across the whole canvas.
     * @param {Document} doc - Working document.
     * @param {PlacedItem} graphic - The placed artwork.
     * @returns {Array} [l, t, r, b].
     */
    contentBounds: function (doc, graphic) {
        var g = graphic.geometricBounds;
        var b = [g[0], g[1], g[2], g[3]], i, r;
        for (i = 0; i < doc.artboards.length; i++) {
            if (String(doc.artboards[i].name).indexOf(TE.Config.tilePrefix) === 0) { continue; }
            r = doc.artboards[i].artboardRect;
            b = [Math.min(b[0], r[0]), Math.max(b[1], r[1]), Math.max(b[2], r[2]), Math.min(b[3], r[3])];
        }
        return b;
    },

    /**
     * Takes away what an earlier run built: the panel artboards, the check
     * layer, and the TE_lines layer of the 1.0 overview.
     * @param {Document} doc - Working document.
     * @returns {number} How many panel artboards there were.
     */
    removeAll: function (doc) {
        var removed = TE.Draw.removeTileArtboards(doc);
        TE.Draw.removeLinesLayer(doc);
        var lay = TE.Doc.findCheckLayer(doc);
        if (lay) {
            // A hidden or locked layer refuses changes (measured).
            lay.locked = false;
            lay.visible = true;
            try { lay.remove(); }
            catch (e) { TE.Utils.log("cannot remove the check layer: " + e.message); }
        }
        return removed;
    },

    /**
     * Builds the check panels beside the original: each panel masked on its
     * own artboard, with its trim line or its Zünd cut and marks, and its
     * clean boundary as a guide — what the export will write, at the
     * document's scale.
     * @param {Document} doc - Working document.
     * @param {Array} tiles - From TE.Grid.computeTiles().
     * @param {Object} ctx - {graphic, scaleFactor, markDef}.
     * @param {Object} s - Settings.
     * @returns {Object} {fits, count}; nothing is built when they do not fit.
     */
    build: function (doc, tiles, ctx, s) {
        var sf = Number(ctx.scaleFactor) || 1;
        var pages = [], i;
        for (i = 0; i < tiles.length; i++) { pages.push(this.geometry(tiles[i], s, sf).page); }
        var c = this.canvasBounds(doc);
        // A point inside each edge: the bisection ends on the last good value.
        var canvas = { l: c.l + 1, t: c.t - 1, r: c.r - 1, b: c.b + 1 };
        var moves = this.layout(pages, this.contentBounds(doc, ctx.graphic), canvas,
            s.direction, this.gap(pages, sf));
        if (!moves) { return { fits: false, count: 0 }; }

        var root = doc.layers.add();
        root.name = TE.Config.layerCheck;
        for (i = 0; i < tiles.length; i++) {
            var t = this.shiftTile(tiles[i], moves[i][0], moves[i][1]);
            this.buildPanel(doc, root, t, this.geometry(t, s, sf), moves[i], ctx, s);
        }
        return { fits: true, count: tiles.length };
    },

    /**
     * One check panel: its artboard and a sublayer holding, from the top,
     * Regmarks and the cut layer or the trim line's layer, then Graphics —
     * the layers of the panel's PDF — and the clean boundary as a guide.
     * @param {Document} doc - Working document.
     * @param {Layer} root - The check layer.
     * @param {Object} tile - The panel, already moved.
     * @param {Object} g - geometry() of the moved panel.
     * @param {Array} move - [dx, dy] the panel was moved by.
     * @param {Object} ctx - {graphic, scaleFactor, markDef}.
     * @param {Object} s - Settings.
     */
    buildPanel: function (doc, root, tile, g, move, ctx, s) {
        var num = String(tile.index);
        while (num.length < 2) { num = "0" + num; }
        doc.artboards.add(g.page).name = TE.Config.tilePrefix + num;

        var lay = root.layers.add();
        lay.name = TE.Config.tilePrefix + num;
        // Graphics first: layers.add() puts each new layer on top (measured),
        // which leaves the order of the panel's PDF.
        var layG = lay.layers.add();
        layG.name = TE.Config.layerGraphics;

        // A copy of the placed item, as the export makes one (N39), moved
        // with its panel and clipped to it.
        var art = ctx.graphic.duplicate(layG, ElementPlacement.PLACEATBEGINNING);
        art.locked = false;
        art.hidden = false;
        art.translate(move[0], move[1]);
        var mk = g.mask;
        var m = layG.pathItems.rectangle(mk[1], mk[0], mk[2] - mk[0], mk[1] - mk[3]);
        m.filled = true;
        m.stroked = false;
        var grp = layG.groupItems.add();
        art.move(grp, ElementPlacement.PLACEATEND);
        m.move(grp, ElementPlacement.PLACEATBEGINNING);
        grp.clipped = true;

        if (s.zundMode) {
            var layCut = lay.layers.add();
            layCut.name = s.cutSpot;
            var c = g.cut;
            var r = layCut.pathItems.rectangle(c[1], c[0], c[2] - c[0], c[1] - c[3]);
            r.filled = false;
            r.stroked = true;
            r.strokeColor = TE.Draw.getOrCreateSpot(doc, s.cutSpot);
            // The export's hairline, as it shows on the rulers.
            r.strokeWidth = 0.125 / (Number(ctx.scaleFactor) || 1);
            r.name = "TE_cut";
            var layMarks = lay.layers.add();
            layMarks.name = TE.Config.layerRegmarks;
            TE.Draw.drawMarks(doc, g.geo, s, ctx.markDef, g.ratio, layMarks);
        } else if (s.drawLine) {
            var layLine = lay.layers.add();
            layLine.name = s.lineSpot || TE.Config.layerLines;
            TE.Draw.drawTileLine(doc, g.panel, s, 1 / g.ratio, layLine);
        }

        // The clean boundary, where the seam and the overlap's end lie, as a
        // guide: it neither prints nor goes into a PDF (user, 2026-10-10). In
        // the check layer, which the guide reader leaves out.
        var cl = g.clean;
        var guide = lay.pathItems.rectangle(cl[1], cl[0], cl[2] - cl[0], cl[1] - cl[3]);
        guide.filled = false;
        guide.stroked = false;
        guide.guides = true;
    }
};
