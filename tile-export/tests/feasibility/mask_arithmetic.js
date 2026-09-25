#!/usr/bin/env node
/**
 * Virtual feasibility test for the panel mask (Zünd stage) — see
 * docs/reports/2026-09-25-maskovani-platu.md. NOT part of run_all.sh: it
 * measures a design that is not built yet, and prints where today's code
 * (N11) differs. Run: node tests/feasibility/mask_arithmetic.js
 *
 * Runs the REAL
 * tile-export utils and the REAL shared mark geometry in Node, with a stub for
 * the active document, across the five scale situations the tool supports.
 *
 * What it checks, on the exported PDF page (in page millimetres):
 *  1. proposed: the mask reaches exactly `bleed` real mm past the cut,
 *  2. proposed: marks sit `gap` real mm clear of the mask, sized `mark` mm,
 *  3. today:    the shared geometry, reading the ACTIVE (temporary) document,
 *               sizes the marks — this is N11, now made concrete.
 */
var fs = require("fs"), path = require("path");
var BASE = path.join(__dirname, "..", "..", "..") + "/";
var TE = {};
global.TE = TE;
global.app = { documents: { length: 1 }, activeDocument: { scaleFactor: 1 }, locale: "cs_CZ" };
function load(rel) { eval.call(global, fs.readFileSync(BASE + rel, "utf8")); }
load("tile-export/src/locale.js");
load("tile-export/src/lib/utils.js");
load("tile-export/src/config.js");
load("shared/lib/cut_marks.js");
global.buildCutMarks(TE);
var U = TE.Utils;

var pass = 0, fail = 0;
function close(got, want, msg) {
    if (Math.abs(got - want) < 0.01) { pass++; console.log("  ok    " + msg + " = " + got.toFixed(2)); }
    else { fail++; console.log("  FAIL  " + msg + " | got " + got.toFixed(3) + ", want " + want.toFixed(3)); }
}

// Real-world numbers of the design: 5 mm bleed past the cut (spec §10),
// marks 5 mm, 5 mm clear of the artwork (spec §10 step 4: "5 mm odstup od
// grafiky plus 5 mm značka").
var BLEED = 5, GAP = 5, MARK = 5;
// A 2020 x 1000 mm panel (real size), the middle panel of the 6 m wall.
var PANEL_W = 2020, PANEL_H = 1000;

var cases = [
    { name: "běžný dokument 1:10, výstup jako dokument", sf: 1,  manual: 10, out: "source" },
    { name: "běžný dokument 1:10, výstup 1:1",          sf: 1,  manual: 10, out: "actual" },
    { name: "dokument 1:1, výstup 1:1",                 sf: 1,  manual: 1,  out: "actual" },
    { name: "Large Canvas, výstup jako dokument",       sf: 10, manual: 1,  out: "source" },
    { name: "Large Canvas + ruční 1:10, jako dokument",  sf: 10, manual: 10, out: "source" }
];

cases.forEach(function (c) {
    console.log("\n=== " + c.name + " ===");
    var s = TE.Config.getDefaults();
    s.scaleN = c.manual; s.exportScale = c.out; s.mode = "ZUND";
    s.gapInner = GAP; s.gapOuter = 0; s.markSizeZ = MARK; s.maxDist = 500; s.orientDist = 100;

    // Source document: panel rect in document points.
    app.activeDocument.scaleFactor = c.sf;
    var srcPanel = [0, U.toDoc(PANEL_H, s), U.toDoc(PANEL_W, s), 0];
    // Temporary document: the export scales by k, and is never Large Canvas.
    var k = U.outputScale(s, c.sf);
    var cut = srcPanel.map(function (v) { return v * k; });
    // Page ratio: real mm per page mm. The one number the temp document needs.
    var ratio = c.sf * U.manualScale(s) / k;
    var toTemp = function (mm) { return U.mm2pt(mm) / ratio; };
    var pageMm = function (pt) { return U.pt2mm(pt); };
    console.log("  k = " + k + ", page ratio 1:" + ratio + ", page " + pageMm(cut[2] - cut[0]).toFixed(1) + " × " + pageMm(cut[1] - cut[3]).toFixed(1) + " mm");

    // 1. proposed mask: the cut rect grown by the bleed in temp units.
    var o = toTemp(BLEED);
    var mask = [cut[0] - o, cut[1] + o, cut[2] + o, cut[3] - o];
    close(pageMm(cut[0] - mask[0]) * ratio, BLEED, "mask past the cut, real mm");

    // 2. proposed marks: shared geometry on the MASK bounds, with the page
    //    ratio passed in (stub: the temp document reports it as its factor).
    app.activeDocument.scaleFactor = ratio / U.manualScale(s);
    var geo = TE.Core.calculateAll(s, mask);
    var m0 = geo.marksZ[0];
    var clearReal = (pageMm(mask[0] - m0.cx) - pageMm(U.mm2pt(MARK / 2) / ratio)) * ratio;
    close(clearReal, GAP, "mark clear of the mask, real mm");
    close(pageMm(geo.ab[2] - geo.ab[0]) * ratio, PANEL_W + 2 * (BLEED + GAP + MARK), "artboard width, real mm");

    // 3. today: calculateAll reads the ACTIVE document — the temporary one,
    //    scaleFactor 1 — times the manual scale.
    app.activeDocument.scaleFactor = 1;
    var geoNow = TE.Core.calculateAll(s, mask);
    var clearNow = (pageMm(mask[0] - geoNow.marksZ[0].cx) - pageMm(U.mm2pt(MARK / 2) / U.getEffectiveSF(s))) * ratio;
    var markNow = pageMm(U.mm2pt(MARK) / U.getEffectiveSF(s)) * ratio;
    var tag = (Math.abs(markNow - MARK) < 0.01) ? "ok    " : "WRONG ";
    console.log("  " + tag + "today (N11): mark " + markNow.toFixed(2) + " mm, clear " + clearNow.toFixed(2) + " mm (want " + MARK + " and " + GAP + ")");
});
console.log("\n--- proposed: " + pass + " ok, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
