// ===========================================================================
// Script:      make-test-document.jsx
// Version:     2.0.0
// Author:      Ladislav Osvald
// Updated:     2026-09-26
//
// Description:
//   Builds the test data for tile-export: source PDFs carrying bleed, and
//   three working documents with them placed — a 3000 x 1000 mm sheet at 1:10,
//   a 6000 x 1000 mm wall at 1:10 and the same wall as a Large Canvas.
//
//   Made to be read at a glance, on screen, in a PDF viewer or on a print:
//   - the clean format is a 100 mm checkerboard, every field labelled with
//     its position in real millimetres (big: horizontal, "y": vertical) —
//     no white anywhere in the artwork outside the legend box,
//     so any white on a panel is missing artwork, and the labels say which
//     part of the graphic a panel carries and what repeats in the overlap;
//   - rulers on all four edges, a tick every 10 mm, a number every 100 mm;
//   - the bleed is five coloured bands, 0-5, 5-10, 10-20, 20-40 and 40-50 mm
//     past the clean edge, so the colour at a panel's outer edge says how
//     much bleed it carries (an add of 40 ends in the yellow band, a Zünd
//     mask of 5 mm in the dark grey one). No red: the trim line is red;
//   - a NEŘEZAT block across the first seam of an even three-way split, and
//     two guides that dodge it.
//
//   Writes into ~/Desktop/tile-export-test/data/ and never overwrites a file
//   that is already there. Leaves no document open.
//
// Usage: tools/ai-eval.sh tools/make-test-document.jsx, or File > Scripts >
//        Other Script… with no document open.
// ===========================================================================

#target illustrator

(function () {
    var made = [];          // documents this script opened, closed on failure
    var DRAW = 10;          // sources are drawn at 1:10: 6 m exceeds the canvas
    var BLEED = 50;         // mm of bleed carried on every edge
    var PT = 72 / 25.4;

    /** Real millimetres to points of a 1:10 drawing. */
    function mm(v) { return v / DRAW * PT; }

    function cmyk(c, m, y, k) {
        var col = new CMYKColor();
        col.cyan = c; col.magenta = m; col.yellow = y; col.black = k;
        return col;
    }

    var BLACK = cmyk(0, 0, 0, 100);
    var CHECK_A = cmyk(0, 8, 30, 0);      // warm light
    var CHECK_B = cmyk(25, 0, 12, 0);     // cool light
    var BANDS = [                          // outermost first
        { to: 50, col: cmyk(0, 0, 60, 0),   name: "40–50" },
        { to: 40, col: cmyk(55, 0, 75, 0),  name: "20–40" },
        { to: 20, col: cmyk(70, 20, 0, 0),  name: "10–20" },
        { to: 10, col: cmyk(0, 0, 0, 40),   name: "5–10" },
        { to: 5,  col: cmyk(0, 0, 0, 75),   name: "0–5" }
    ];

    function rect(layer, x, y, w, h, fill) {
        var p = layer.pathItems.rectangle(y, x, w, h);
        p.stroked = false; p.filled = true; p.fillColor = fill;
        return p;
    }

    function line(layer, x1, y1, x2, y2, width) {
        var p = layer.pathItems.add();
        p.setEntirePath([[x1, y1], [x2, y2]]);
        p.filled = false; p.stroked = true;
        p.strokeColor = BLACK; p.strokeWidth = width;
        return p;
    }

    function label(layer, x, y, text, sizeMm, color) {
        var t = layer.textFrames.add();
        t.contents = text;
        t.textRange.characterAttributes.size = mm(sizeMm);
        t.textRange.characterAttributes.fillColor = color || BLACK;
        t.left = x; t.top = y;
        return t;
    }

    /** Never overwrite: a taken name gets a numeric suffix. */
    function freeFile(folder, base, ext) {
        var f = new File(folder.fsName + "/" + base + ext), n = 2;
        while (f.exists) { f = new File(folder.fsName + "/" + base + "-" + n + ext); n++; }
        return f;
    }

    /**
     * Draws one source sheet and saves it as a PDF.
     * @param {number} W - Clean width, real mm.
     * @param {number} H - Clean height, real mm.
     * @returns {File} The saved PDF.
     */
    function buildSource(W, H, folder) {
        var docW = mm(W + 2 * BLEED), docH = mm(H + 2 * BLEED);
        var src = app.documents.add(DocumentColorSpace.CMYK, docW, docH);
        made.push(src);
        src.artboards[0].artboardRect = [0, 0, docW, -docH];
        var L = src.layers[0];
        var B = mm(BLEED), i, j, x, y, big;

        // Bleed bands, outermost first, each inset by its own depth.
        for (i = 0; i < BANDS.length; i++) {
            var inset = BLEED - BANDS[i].to;
            rect(L, mm(inset), -mm(inset), docW - 2 * mm(inset), docH - 2 * mm(inset), BANDS[i].col);
        }
        // Band names in the wide bands, every 500 mm along top and bottom,
        // every 500 mm down the sides.
        var mids = [{ n: "40–50", d: 45 }, { n: "20–40", d: 30 }, { n: "10–20", d: 15 }];
        for (x = 250; x < W; x += 500) {
            for (j = 0; j < mids.length; j++) {
                label(L, B + mm(x), -mm(BLEED - mids[j].d - 3), mids[j].n, 6, BLACK);
                label(L, B + mm(x), -B - mm(H) - mm(mids[j].d - 3), mids[j].n, 6, BLACK);
            }
        }

        // Clean format: 100 mm checkerboard, every field labelled.
        for (i = 0; i < W / 100; i++) {
            for (j = 0; j < H / 100; j++) {
                x = B + mm(i * 100); y = -B - mm(j * 100);
                rect(L, x, y, mm(100), mm(100), ((i + j) % 2) ? CHECK_B : CHECK_A);
                label(L, x + mm(8), y - mm(38), String(i * 100), 18, BLACK);
                label(L, x + mm(8), y - mm(62), "y " + (j * 100), 12, BLACK);
            }
        }

        // Rulers on all four clean edges: tick every 10 mm, longer every 50,
        // longest every 100.
        function tick(v) { return (v % 100 === 0) ? 25 : ((v % 50 === 0) ? 15 : 8); }
        for (x = 0; x <= W; x += 10) {
            big = (x % 100 === 0) ? 0.5 : 0.25;
            line(L, B + mm(x), -B, B + mm(x), -B - mm(tick(x)), big);
            line(L, B + mm(x), -B - mm(H), B + mm(x), -B - mm(H) + mm(tick(x)), big);
        }
        for (y = 0; y <= H; y += 10) {
            big = (y % 100 === 0) ? 0.5 : 0.25;
            line(L, B, -B - mm(y), B + mm(tick(y)), -B - mm(y), big);
            line(L, B + mm(W), -B - mm(y), B + mm(W) - mm(tick(y)), -B - mm(y), big);
        }

        // NEŘEZAT across the first seam of an even three-way split.
        var seam = W / 3;
        rect(L, B + mm(seam - 150), -B - mm(380), mm(600), mm(240), cmyk(85, 60, 0, 30));
        label(L, B + mm(seam - 95), -B - mm(420), "NEŘEZAT", 90, cmyk(0, 0, 0, 0));
        label(L, B + mm(seam - 110), -B - mm(540),
              (seam - 150) + "–" + (seam + 450) + " mm", 35, cmyk(0, 0, 0, 0));

        // Legend in its own white box, lower right, clear of the NEŘEZAT
        // block: printed over the checkerboard it could not be read.
        var lx = B + mm(W - 1400), ly = -B - mm(H - 330);
        var box = rect(L, lx, ly, mm(1300), mm(260), cmyk(0, 0, 0, 0));
        box.stroked = true; box.strokeColor = BLACK; box.strokeWidth = 0.3;
        label(L, lx + mm(30), ly - mm(30),
              "TILE EXPORT · čistý formát " + W + " × " + H + " mm · spad " + BLEED + " mm", 34, BLACK);
        label(L, lx + mm(30), ly - mm(95),
              "Pole 100 × 100 mm: velké číslo = vodorovná poloha, y = svislá (mm).", 22, BLACK);
        label(L, lx + mm(30), ly - mm(140),
              "Spad za hranou čistého formátu: tmavě šedá 0–5, šedá 5–10,", 22, BLACK);
        label(L, lx + mm(30), ly - mm(185),
              "modrá 10–20, zelená 20–40, žlutá 40–50 mm. Zdroj kreslený 1:" + DRAW + ".", 22, BLACK);

        var f = freeFile(folder, "zdroj-" + W + "x" + H + "-spad" + BLEED, ".pdf");
        var po = new PDFSaveOptions(); po.preserveEditability = false;
        src.saveAs(f, po);
        src.close(SaveOptions.DONOTSAVECHANGES);
        return f;
    }

    /**
     * A working document with the source placed, bleed hanging outside the
     * artboard on every edge, and two guides that dodge the NEŘEZAT block.
     * @param {number} W - Clean width, real mm.
     * @param {number} H - Clean height, real mm.
     * @param {File} srcFile - Source PDF.
     * @param {boolean} largeCanvas - True: a real-size Large Canvas document.
     */
    function buildWorking(W, H, srcFile, largeCanvas, folder, base) {
        // Both kinds hold the clean format at 1/10 in internal points: a 1:10
        // drawing does so by the user's convention, a Large Canvas because it
        // stores everything at 1/scaleFactor. So the source goes in at 100 %.
        var CW = mm(W), CH = mm(H);
        var doc = largeCanvas
            ? app.documents.add(DocumentColorSpace.CMYK, W * PT, H * PT)
            : app.documents.add(DocumentColorSpace.CMYK, CW, CH);
        made.push(doc);
        doc.artboards[0].artboardRect = [0, 0, CW, -CH];
        var pi = doc.placedItems.add();
        pi.file = srcFile;
        pi.position = [-mm(BLEED), mm(BLEED)];

        var seam = W / 3;
        var gx = [seam - 200, 2 * seam - 100], i, g;
        for (i = 0; i < gx.length; i++) {
            g = doc.pathItems.add();
            g.setEntirePath([[mm(gx[i]), mm(2 * H)], [mm(gx[i]), -mm(3 * H)]]);
            g.guides = true;
        }
        var f = freeFile(folder, base, ".ai");
        var sf = doc.scaleFactor;
        doc.saveAs(f, new IllustratorSaveOptions());
        doc.close(SaveOptions.DONOTSAVECHANGES);
        return { file: f, sf: sf, guides: gx };
    }

    if (app.documents.length > 0) {
        return "PŘERUŠENO: zavři nejdřív otevřené dokumenty (" + app.documents.length + ").";
    }
    var oldUIL = app.userInteractionLevel;
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
    var out = [];
    try {
        // $.global.TE_TESTDATA_DIR overrides the folder (development runs).
        var folder = new Folder($.global.TE_TESTDATA_DIR || (Folder.desktop + "/tile-export-test/data"));
        if (!folder.exists) { folder.create(); }
        var s3 = buildSource(3000, 1000, folder);
        var s6 = buildSource(6000, 1000, folder);
        var a = buildWorking(3000, 1000, s3, false, folder, "arch-3000x1000-1ku10");
        var z = buildWorking(6000, 1000, s6, false, folder, "zed-6000x1000-1ku10");
        var c = buildWorking(6000, 1000, s6, true, folder, "lc-6000x1000");
        out.push("Hotovo, složka " + folder.fsName);
        out.push("  " + a.file.name + "  1:10, vodítka " + a.guides.join(" a ") + " mm");
        out.push("  " + z.file.name + "  1:10, vodítka " + z.guides.join(" a ") + " mm");
        out.push("  " + c.file.name + "  Large Canvas, faktor " + c.sf + ", vodítka " + c.guides.join(" a ") + " mm");
        out.push("  zdroje: " + s3.name + ", " + s6.name);
    } catch (e) {
        out.push("CHYBA: " + e.message + " (řádek " + e.line + ")");
        for (var m = 0; m < made.length; m++) {
            try { made[m].close(SaveOptions.DONOTSAVECHANGES); } catch (ce) { /* already closed */ }
        }
    } finally {
        app.userInteractionLevel = oldUIL;
    }
    return out.join("\n");
})();
