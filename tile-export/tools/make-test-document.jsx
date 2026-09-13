// ===========================================================================
// Script:      make-test-document.jsx
// Version:     1.0.0
// Author:      Ladislav Osvald
// Updated:     2026-09-13
//
// Description:
//   Builds a test setup for tile-export: a source PDF carrying bleed, plus a
//   working document at 1:10 with that PDF placed and two guides.
//
//   The source PDF is deliberately NOT a blank page. It carries a ruler in
//   real-world millimetres, a CMYK step wedge, a 100 mm grid and text placed
//   where a seam must not fall — so a finished panel can be measured and
//   checked rather than just looked at.
//
//   Real size 3000 x 1000 mm, drawn at 1:10, bleed 50 mm real on every edge.
//
// Usage: File > Scripts > Other Script…, or tools/ai-eval.sh tools/make-test-document.jsx
// ===========================================================================

#target illustrator

(function () {
    var SCALE = 10;                       // document is 1:10
    var REAL_W = 3000, REAL_H = 1000;     // mm, clean format
    var REAL_BLEED = 50;                  // mm, bleed carried by the source PDF

    /** Real-world millimetres to document points at this scale. */
    function mm(v) { return (v / SCALE) * 2.83464567; }

    function cmyk(c, m, y, k) {
        var col = new CMYKColor();
        col.cyan = c; col.magenta = m; col.yellow = y; col.black = k;
        return col;
    }

    var BLACK = cmyk(0, 0, 0, 100);
    var GREY  = cmyk(0, 0, 0, 35);
    var BLEED_BG = cmyk(0, 35, 20, 0);    // pink: everything outside the clean format
    var WHITE = cmyk(0, 0, 0, 0);

    /** Rectangle helper: x/y are the top-left corner in document points. */
    function rect(doc, x, y, w, h, fill, layer) {
        var p = (layer || doc).pathItems.rectangle(y, x, w, h);
        p.stroked = false;
        p.filled = true;
        p.fillColor = fill;
        return p;
    }

    function line(doc, x1, y1, x2, y2, color, width, layer) {
        var p = (layer || doc).pathItems.add();
        p.setEntirePath([[x1, y1], [x2, y2]]);
        p.filled = false;
        p.stroked = true;
        p.strokeColor = color;
        p.strokeWidth = width;
        return p;
    }

    function label(doc, x, y, text, sizePt, color, layer) {
        var t = (layer || doc).textFrames.add();
        t.contents = text;
        t.textRange.characterAttributes.size = sizePt;
        t.textRange.characterAttributes.fillColor = color;
        t.left = x;
        t.top = y;
        return t;
    }

    // =====================================================================
    // 1. Source PDF — clean format plus bleed on every edge
    // =====================================================================
    var docW = mm(REAL_W + 2 * REAL_BLEED);
    var docH = mm(REAL_H + 2 * REAL_BLEED);
    var src = app.documents.add(DocumentColorSpace.CMYK, docW, docH);
    // documents.add() puts the artboard at [0, height, width, 0] — measured.
    // Everything below draws downward from the origin, so pin it to the
    // convention this tool uses everywhere: [left, top, right, bottom] with a
    // negative bottom. Without this the whole sheet lands under the artboard
    // and exports blank.
    src.artboards[0].artboardRect = [0, 0, docW, -docH];

    var B = mm(REAL_BLEED);               // bleed in document points
    var CW = mm(REAL_W), CH = mm(REAL_H); // clean format in document points

    // Bleed background: pink everywhere, so the clean format is unmistakable.
    rect(src, 0, 0, docW, docH, BLEED_BG);
    // Clean format: white, top-left at (B, -B) in Y-up document coordinates.
    rect(src, B, -B, CW, CH, WHITE);

    // --- 100 mm grid inside the clean format -----------------------------
    var i, x, y, isMajor;
    for (i = 100; i < REAL_W; i += 100) {
        x = B + mm(i);
        isMajor = (i % 500 === 0);
        line(src, x, -B, x, -B - CH, isMajor ? GREY : cmyk(0, 0, 0, 12),
             isMajor ? 0.4 : 0.2);
    }
    for (i = 100; i < REAL_H; i += 100) {
        y = -B - mm(i);
        isMajor = (i % 500 === 0);
        line(src, B, y, B + CW, y, isMajor ? GREY : cmyk(0, 0, 0, 12),
             isMajor ? 0.4 : 0.2);
    }

    // --- ruler along the top edge, numbered in REAL millimetres ----------
    for (i = 0; i <= REAL_W; i += 100) {
        x = B + mm(i);
        isMajor = (i % 500 === 0);
        line(src, x, -B, x, -B - mm(isMajor ? 60 : 30), BLACK, isMajor ? 0.8 : 0.4);
        if (isMajor) {
            // The last label would overflow into the bleed, so it hangs left.
            label(src, x + mm(i === REAL_W ? -130 : 10), -B - mm(20),
                  String(i), 7, BLACK);
        }
    }
    // --- ruler down the left edge ----------------------------------------
    for (i = 0; i <= REAL_H; i += 100) {
        y = -B - mm(i);
        isMajor = (i % 500 === 0);
        line(src, B, y, B + mm(isMajor ? 60 : 30), y, BLACK, isMajor ? 0.8 : 0.4);
        if (isMajor && i > 0) {
            label(src, B + mm(70), y + mm(25), String(i), 7, BLACK);
        }
    }

    // --- CMYK step wedge, lower left -------------------------------------
    var inks = [
        { n: "C", c: [100, 0, 0, 0] },
        { n: "M", c: [0, 100, 0, 0] },
        { n: "Y", c: [0, 0, 100, 0] },
        { n: "K", c: [0, 0, 0, 100] }
    ];
    var steps = [100, 75, 50, 25, 10];
    var swW = mm(70), swH = mm(60);
    var wx0 = B + mm(150), wy0 = -B - mm(650);
    var ink, st, f;
    for (i = 0; i < inks.length; i++) {
        ink = inks[i];
        label(src, wx0 - mm(60), wy0 - i * swH + mm(5), ink.n, 8, BLACK);
        for (st = 0; st < steps.length; st++) {
            f = steps[st] / 100;
            rect(src, wx0 + st * swW, wy0 - i * swH, swW - mm(4), swH - mm(4),
                 cmyk(ink.c[0] * f, ink.c[1] * f, ink.c[2] * f, ink.c[3] * f));
        }
    }
    label(src, wx0, wy0 - inks.length * swH - mm(10), "CMYK 100/75/50/25/10 %", 7, BLACK);

    // --- text that a seam must not cut through ---------------------------
    // Sits between 850 and 1450 mm, so an even 3-way split — seams at 1000 and
    // 2000 mm — cuts straight through it. That is the whole point: it shows why
    // the guides mode exists. The guides below dodge it.
    rect(src, B + mm(850), -B - mm(380), mm(600), mm(240), cmyk(85, 60, 0, 30));
    label(src, B + mm(905), -B - mm(430), "NEŘEZAT", 30, WHITE);
    label(src, B + mm(890), -B - mm(530), "850–1450 mm", 11, WHITE);

    // --- corner markers of the clean format ------------------------------
    var arm = mm(120);
    var corners = [
        [B, -B, 1, -1], [B + CW, -B, -1, -1],
        [B, -B - CH, 1, 1], [B + CW, -B - CH, -1, 1]
    ];
    for (i = 0; i < corners.length; i++) {
        line(src, corners[i][0], corners[i][1],
             corners[i][0] + corners[i][2] * arm, corners[i][1], BLACK, 1);
        line(src, corners[i][0], corners[i][1],
             corners[i][0], corners[i][1] + corners[i][3] * arm, BLACK, 1);
    }

    // --- captions ---------------------------------------------------------
    label(src, B + mm(150), -B - mm(120),
          "TILE EXPORT — testovací arch  ·  čistý formát " +
          REAL_W + " × " + REAL_H + " mm  ·  spad " + REAL_BLEED + " mm", 11, BLACK);
    label(src, B + mm(700), -B - mm(940),
          "Růžová plocha je spad. Bílá plocha je čistý formát. " +
          "Pravítko je ve skutečných mm.", 8, BLACK);
    label(src, mm(20) - B + B, -mm(15),
          "SPAD " + REAL_BLEED + " mm", 7, BLACK);

    // --- save the source PDF ----------------------------------------------
    var folder = new Folder(Folder.desktop + "/tile-export-test");
    if (!folder.exists) { folder.create(); }
    var srcFile = new File(folder.fsName + "/testovaci-grafika-se-spadem.pdf");
    var po = new PDFSaveOptions();
    po.preserveEditability = false;
    src.saveAs(srcFile, po);
    src.close(SaveOptions.DONOTSAVECHANGES);

    // =====================================================================
    // 2. Working document — clean format only, PDF placed with its bleed
    // =====================================================================
    var doc = app.documents.add(DocumentColorSpace.CMYK, CW, CH);
    doc.artboards[0].artboardRect = [0, 0, CW, -CH];

    var pi = doc.placedItems.add();
    pi.file = srcFile;
    pi.width = docW;
    pi.height = docH;
    pi.position = [-B, B];     // bleed hangs outside the artboard on every edge

    // Guides that dodge the NEŘEZAT block (850–1450 mm): 800 clears it by
    // 50 mm on the left, 1900 by 450 mm on the right. An even 3-way split
    // would put a seam at 1000 mm, straight through the block.
    function guide(xReal) {
        var g = doc.pathItems.add();
        g.setEntirePath([[mm(xReal), mm(4000)], [mm(xReal), -mm(4000)]]);
        g.guides = true;
    }
    guide(800);
    guide(1900);

    return "Hotovo.\n" +
           "Zdroj:    " + srcFile.fsName + "\n" +
           "Plátno:   " + Math.round(CW) + " x " + Math.round(CH) + " pt" +
           "  (= " + REAL_W + " x " + REAL_H + " mm při 1:" + SCALE + ")\n" +
           "Grafika:  přesah " + Math.round(B) + " pt na každé hraně" +
           "  (= " + REAL_BLEED + " mm skutečných)\n" +
           "Vodítka:  2 svislá na 800 a 1900 mm — míjí blok NEŘEZAT,\n" +
           "          rovnoměrné dělení na 3 pláty by ho v 1000 mm rozřízlo\n" +
           "V dialogu: měřítko 1:10, horizontálně, 3 pláty nebo vodítka,\n" +
           "           přelep 20, přídavky 40 / 40 / 0 / 40";
})();
