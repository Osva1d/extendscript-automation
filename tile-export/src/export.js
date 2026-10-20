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
     * Output file name from the pattern. PURE FUNCTION.
     *
     * {n} has at least two digits, as the shop numbers panels (01, 02), and
     * more when the total needs them, so twelve panels sort in Finder. A
     * placeholder with no value goes with one separator next to it, so no
     * double separator is left behind. Values go in through a function: a
     * "$" in a document name would otherwise be read as a replacement
     * pattern.
     *
     * @param {string} pattern - Carries {doc}, {n}, {total}, {size}, {scale},
     *        {clean}, {adds}.
     * @param {string} docName - Source document name without extension.
     * @param {number} index - 1-based panel number.
     * @param {number} total - How many panels there are.
     * @param {Object} [extra] - {size, scale, clean, adds}; missing ones count
     *        as empty.
     * @returns {string} File name without extension.
     */
    buildName: function (pattern, docName, index, total, extra) {
        var width = Math.max(2, String(total).length);
        var n = String(index);
        while (n.length < width) { n = "0" + n; }
        var x = extra || {};
        var vals = [["doc", String(docName)], ["n", n], ["total", String(total)],
                    ["size", x.size ? String(x.size) : ""], ["scale", x.scale ? String(x.scale) : ""],
                    ["clean", x.clean ? String(x.clean) : ""], ["adds", x.adds ? String(x.adds) : ""]];
        var out = String(pattern), i;
        for (i = 0; i < vals.length; i++) {
            out = this.fillToken(out, vals[i][0], vals[i][1]);
        }
        return out;
    },

    /**
     * One placeholder of a name pattern filled in. PURE FUNCTION.
     * @param {string} text - Pattern so far.
     * @param {string} key - Placeholder name without braces.
     * @param {string} value - Its value; empty removes it with a separator.
     * @returns {string} The pattern with the placeholder filled.
     */
    fillToken: function (text, key, value) {
        var token = "\\{" + key + "\\}";
        if (value === "") {
            return text.replace(new RegExp("[_\\-. ]" + token, "g"), "")
                       .replace(new RegExp(token + "[_\\-. ]?", "g"), "");
        }
        return text.replace(new RegExp(token, "g"), function () { return value; });
    },

    /**
     * Real size of a panel's PDF page in mm, [w, h]: the printed panel, or in
     * Zünd mode the page with its marks, at real size whatever the output
     * scale. PURE FUNCTION — computed the way the export lays the page out
     * (zundLayout, calculateAll), so the name's {size} is the page it names.
     * @param {Object} tile - Panel.
     * @param {Object} s - Settings.
     * @param {number} sf - The SOURCE document's Large Canvas factor.
     * @returns {Array} [width, height] in real millimetres.
     */
    pageSizeMm: function (tile, s, sf) {
        var k = TE.Utils.outputScale(s, sf);
        var ratio = TE.Utils.pageRatio(s, sf);
        var ab;
        if (s.zundMode) {
            ab = TE.Core.calculateAll(s,
                this.zundLayout(this.tileTransform(tile, [0, 0, 0, 0], k), s, ratio).mask, ratio).ab;
            return [TE.Utils.pt2mm(ab[2] - ab[0]) * ratio, TE.Utils.pt2mm(ab[1] - ab[3]) * ratio];
        }
        return this.rectMm(tile.expanded, s, sf);
    },

    /**
     * Real size of a rectangle of the document in mm, [w, h], at the same
     * scale as pageSizeMm, so the panel with its adds measures what a
     * manual-trim page does. PURE FUNCTION.
     * @param {Array} rect - [left, top, right, bottom] in document points.
     * @param {Object} s - Settings.
     * @param {number} sf - The SOURCE document's Large Canvas factor.
     * @returns {Array} [width, height] in real millimetres.
     */
    rectMm: function (rect, s, sf) {
        var k = TE.Utils.outputScale(s, sf);
        var ratio = TE.Utils.pageRatio(s, sf);
        return [TE.Utils.pt2mm((rect[2] - rect[0]) * k) * ratio,
                TE.Utils.pt2mm((rect[1] - rect[3]) * k) * ratio];
    },

    /**
     * A panel's file name without extension, every placeholder filled: the
     * one place the export, the skip check and the dialog build it, so the
     * three cannot disagree.
     *
     * {size} is the page at REAL size in whole millimetres, and {scale} the
     * ratio of the data to real size: "1ku10" as drawn at 1:10, "1ku1" at
     * real size. The shop names a 1:10 file by its real size and the ratio
     * (user, 2026-10-10); a {scale} in the pattern of a 1:1 job is a choice,
     * and it shows (user, 2026-10-11) — a pattern without it gives no ratio.
     * The decimal comma is the shop's convention, not the dialog's language.
     * {clean} and {adds} are the panel at real size, clean and with its adds,
     * in whole millimetres (user, 2026-10-16). With a manual trim {adds} is
     * {size}; in Zünd mode {size} is the page with its marks.
     *
     * @param {Object} tile - Panel.
     * @param {Object} ctx - {docName, total, scaleFactor}.
     * @param {Object} s - Settings.
     * @param {Array} [pageMm] - pageSizeMm of this panel when the caller has
     *        it already (the dialog computes it for its table); else computed.
     * @returns {string} File name without extension.
     */
    fileName: function (tile, ctx, s, pageMm) {
        var ratio = (s.exportScale === "actual") ? 1 : TE.Utils.manualScale(s);
        // [w, h] real millimetres as the name writes them: "2020x1020mm".
        var size = function (mm) { return Math.round(mm[0]) + "x" + Math.round(mm[1]) + "mm"; };
        return this.buildName(s.namePattern, ctx.docName, tile.index, ctx.total, {
            size: size(pageMm || this.pageSizeMm(tile, s, ctx.scaleFactor)),
            scale: TE.Config.namingScalePrefix + TE.Utils.formatMM(ratio, ","),
            clean: size(this.rectMm(tile.clean, s, ctx.scaleFactor)),
            adds: size(this.rectMm(tile.expanded, s, ctx.scaleFactor))
        });
    },

    /**
     * Whether a panel's outputs count as finished. PURE FUNCTION.
     * A run that died on panel 9 of 12 resumes without redoing the eight
     * finished ones. An output older than the working document or the
     * placed PDF belongs to another job with the same name, or to an
     * earlier state of this one, and is made again — the rule of
     * batch-relink-export (B8, audit P2). With no date for the inputs, a
     * working document never saved, nothing counts as finished.
     * @param {Array} outputs - Each output file's modified Date, or null
     *        when it is missing.
     * @param {Date|null} inputsModified - The later of the two inputs' dates.
     * @returns {string} "missing", "fresh" or "stale".
     */
    outputState: function (outputs, inputsModified) {
        var i;
        for (i = 0; i < outputs.length; i++) {
            if (!outputs[i]) { return "missing"; }
        }
        if (!inputsModified) { return "stale"; }
        for (i = 0; i < outputs.length; i++) {
            if (!(outputs[i].getTime() > inputsModified.getTime())) { return "stale"; }
        }
        return "fresh";
    },

    /**
     * The state of a panel's outputs on disk, for "Přeskočit hotové
     * výstupy". Zünd writes two files; a panel is finished only when both
     * are.
     * @param {Object} tile - Panel to check.
     * @param {Object} ctx - Export context; inputsModified as outputState().
     * @param {Object} s - Settings.
     * @returns {string} "missing", "fresh" or "stale".
     */
    panelOutputState: function (tile, ctx, s) {
        var name = this.fileName(tile, ctx, s);
        var dir = ctx.outFolder.fsName + "/";
        var files = [new File(dir + name + ".pdf")], dates = [], i;
        if (s.zundMode) { files.push(new File(dir + this.cutName(name) + ".pdf")); }
        for (i = 0; i < files.length; i++) { dates.push(files[i].exists ? files[i].modified : null); }
        return this.outputState(dates, ctx.inputsModified);
    },

    /**
     * The later of the working document's and the placed PDF's modified
     * dates, as saved on disk; null when either is unknown — a document
     * never saved has no file, and its fullName throws.
     * @param {Document} doc - The working document.
     * @param {PlacedItem} graphic - The placed PDF.
     * @returns {Date|null} The date, or null.
     */
    inputsModified: function (doc, graphic) {
        var d = null, p = null;
        try { d = doc.fullName.modified; } catch (e) { d = null; }
        try { p = graphic.file.modified; } catch (e2) { p = null; }
        if (!d || !p) { return null; }
        return (d.getTime() > p.getTime()) ? d : p;
    },

    /**
     * Name of the cut file for a panel's print file name (without extension).
     * @param {string} name - Print file name.
     * @returns {string} Cut file name.
     */
    cutName: function (name) {
        return name + "_cut";
    },

    /**
     * Zünd layout of one panel in its temporary document. PURE FUNCTION.
     *
     * The cut is the panel rectangle — the MediaBox the trim line used to
     * mark. The mask is the cut grown by the bleed past it, converted from
     * real millimetres with the page ratio (N11): 5 mm real is 0.5 mm on a
     * 1:10 page.
     *
     * @param {Object} tf - From tileTransform().
     * @param {Object} s - Settings (cutBleed).
     * @param {number} ratio - TE.Utils.pageRatio().
     * @returns {Object} {cut: [l,t,r,b], mask: [l,t,r,b]} in temp doc points.
     */
    zundLayout: function (tf, s, ratio) {
        var c = tf.artboard;
        var b = TE.Utils.mm2pt(Number(s.cutBleed) || 0) / (Number(ratio) || 1);
        return { cut: c, mask: [c[0] - b, c[1] + b, c[2] + b, c[3] - b] };
    },

    /**
     * Builds a Zünd panel in its temporary document: three layers, the cut,
     * the marks measured from the mask, the page grown to fit them, and the
     * artwork clipped by the mask. See the study,
     * docs/reports/2026-09-25-maskovani-platu.md §3.
     *
     *   Regmarks — registration marks      (both PDFs; the top layer)
     *   <cutSpot> — cut path, e.g. "Cut"   (hidden in print, shown in _cut)
     *   Graphics — artwork in the mask     (print PDF; removed from _cut)
     *
     * Names and order as in zund-summa-marks. Both files are editable PDFs
     * (main.js), so these layers are what an operator sees on reopening.
     *
     * Order matters: a raster is made after the page has grown, because
     * rasterize() crops to the artboard and the bleed lies outside the panel.
     *
     * @param {Document} tmp - The panel's temporary document.
     * @param {PlacedItem} pi - The placed artwork, already positioned.
     * @param {Object} tf - From tileTransform().
     * @param {Object} ctx - Export context (scaleFactor, markDef).
     * @param {Object} s - Settings.
     * @returns {Object} {cutPaths, layPrint, layCut}.
     */
    buildZundPanel: function (tmp, pi, tf, ctx, s) {
        var ratio = TE.Utils.pageRatio(s, ctx.scaleFactor);
        var zl = this.zundLayout(tf, s, ratio);
        var layPrint = tmp.layers[0];
        layPrint.name = TE.Config.layerGraphics;
        // layers.add() puts the new layer on top (measured), so the cut layer
        // comes first and Regmarks ends above it, as zund-summa-marks has it
        // (N30). It used to be the other way round: the cut layer on top.
        var layCut = tmp.layers.add();
        layCut.name = s.cutSpot;
        var layMarks = tmp.layers.add();
        layMarks.name = TE.Config.layerRegmarks;

        // 1. The cut: the panel rectangle. A shaped contour is the next stage
        //    — TE.Cut.renderTileContour is kept for it but not called: on a
        //    panel the contour does not reach it leaves the covering frame
        //    behind and turns it into cut paths (N24, measured 2026-09-26).
        var r = layCut.pathItems.rectangle(zl.cut[1], zl.cut[0],
            zl.cut[2] - zl.cut[0], zl.cut[1] - zl.cut[3]);
        r.filled = false;
        r.stroked = true;
        r.strokeColor = TE.Draw.getOrCreateSpot(tmp, s.cutSpot);
        // Read by the machine, not the eye: a hairline.
        r.strokeWidth = 0.125;
        r.name = "TE_cut";
        var cutPaths = 1;

        // 2. Marks from the MASK, the end of the printed artwork: the gap is
        //    clear space around a mark whatever the bleed. The page ratio is
        //    passed, or the shared geometry reads the temporary document (N11).
        var geo = TE.Core.calculateAll(s, zl.mask, ratio);
        TE.Draw.drawMarks(tmp, geo, s, ctx.markDef, ratio, layMarks);
        if (geo.ab) { tmp.artboards[0].artboardRect = geo.ab; }

        // 3. Raster mode: the artwork only, now that the page has grown.
        var art = pi;
        if (s.exportMode === "raster") { art = this.rasterizeArt(tmp, pi, s); }

        // 4. The mask. A plain path, so the DOM can clip — a compound path
        //    could not (measured; the shaped mask will need makeMask).
        var m = layPrint.pathItems.rectangle(zl.mask[1], zl.mask[0],
            zl.mask[2] - zl.mask[0], zl.mask[1] - zl.mask[3]);
        m.filled = true;
        m.stroked = false;
        var g = layPrint.groupItems.add();
        art.move(g, ElementPlacement.PLACEATEND);
        m.move(g, ElementPlacement.PLACEATBEGINNING);
        g.clipped = true;

        return { cutPaths: cutPaths, layPrint: layPrint, layCut: layCut };
    },

    /**
     * Rasterises the placed artwork only (N19): whatever is drawn on top
     * stays vector. rasterize() replaces the item in place and crops it to
     * the artboard (measured).
     * @param {Document} tmp - Temporary document.
     * @param {PlacedItem} pi - Placed artwork.
     * @param {Object} s - Settings (rasterDPI).
     * @returns {RasterItem} The raster.
     */
    rasterizeArt: function (tmp, pi, s) {
        var ro = new RasterizeOptions();
        ro.resolution = Number(s.rasterDPI) || 150;
        ro.antiAliasing = true;
        ro.transparency = false;
        return tmp.rasterize(pi, undefined, ro);
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
     * @param {Object} ctx - {graphic, graphicBounds, docName, outFolder,
     *        total, pdfOptions, contour, markDef}. graphic is the placed item
     *        in the working document; each panel gets a copy of it.
     * @param {Object} s - Settings.
     * @returns {Object} {file: File, cutFile: File|undefined, contourPaths:
     *          number}. cutFile only in Zünd mode. contourPaths counts the cut
     *          paths; 0 when a contour exists but does not reach this panel,
     *          which is not an error but belongs in the summary.
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

            // A copy of the item in the working document, not a new place of
            // its file. A new place takes the crop from Illustrator's PDF
            // import preference, which every opened document with linked PDFs
            // rewrites: a bleed-cropped item came back trim-cropped and was
            // stretched to the item's size (N39, measured). duplicate() keeps
            // the item's own crop. The copy also inherits locked and hidden
            // (measured): hidden prints nothing, locked would travel into the
            // editable PDF. Both are cleared.
            var pi = ctx.graphic.duplicate(tmp.layers[0], ElementPlacement.PLACEATBEGINNING);
            pi.locked = false;
            pi.hidden = false;
            // resize(), not width/height. The .width setter refuses anything
            // above 16347.7 pt (about 5767 mm), wherever the item sits, and the
            // WHOLE graphic of a large job passes that at 1:1 long before any
            // panel does (N7). resize() scales by percentage and has no such
            // cap — measured, docs/extendscript-engine-facts.md.
            pi.resize(tf.size[0] / pi.width * 100, tf.size[1] / pi.height * 100);
            pi.position = tf.position;

            if (s.zundMode) {
                // The trim line is not printed in Zünd mode: the cut path in
                // the _cut PDF takes its place.
                var zp = this.buildZundPanel(tmp, pi, tf, ctx, s);
                contourPaths = zp.cutPaths;
                var zName = this.fileName(tile, ctx, s);
                var zDir = ctx.outFolder.fsName + "/";
                // Print file: the cut layer hidden, not removed — it is there
                // on reopening. Hidden layers stay out of the printed page
                // because main.js sets acrobatLayers = false; otherwise they
                // travel as an optional-content layer (measured).
                zp.layCut.visible = false;
                tmp.saveAs(new File(zDir + zName + ".pdf"), ctx.pdfOptions);
                // Cut file: the cut layer shown, the graphics layer removed.
                // The temporary document is thrown away after this anyway.
                zp.layCut.visible = true;
                zp.layPrint.remove();
                var zCut = new File(zDir + this.cutName(zName) + ".pdf");
                tmp.saveAs(zCut, ctx.pdfOptions);
                return { file: new File(zDir + zName + ".pdf"), cutFile: zCut, contourPaths: contourPaths };
            }

            // The artwork's layer has the name it has in a Zünd file, and the
            // trim line a layer of its own on top, named after its colour like
            // the Zünd cut layer (N31). Reopened in Illustrator the layers are
            // there only in an editable PDF; main.js decides which those are.
            tmp.layers[0].name = TE.Config.layerGraphics;
            if (s.drawLine) {
                var layLine = tmp.layers.add();
                layLine.name = s.lineSpot || TE.Config.layerLines;
                // The panel's outer rect maps exactly onto the temporary
                // artboard, so the line marks the MediaBox of this PDF.
                TE.Draw.drawTileLine(tmp, tf.artboard, s, lineScale, layLine);
            }

            if (s.exportMode === "raster") {
                // Only the GRAPHIC is rasterised; the trim line stays vector
                // on top (N19). See rasterizeArt().
                this.rasterizeArt(tmp, pi, s);
            }

            var name = this.fileName(tile, ctx, s);
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
