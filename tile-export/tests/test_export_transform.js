#!/usr/bin/env node
/**
 * TE.Export.tileTransform — mapping a panel into its temporary document.
 * Pure maths; the DOM part of export is verified by hand in Illustrator.
 */
var fs = require("fs");
var path = require("path");

var TE = {};
global.app = { documents: { length: 1 }, activeDocument: { scaleFactor: 1 } };
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "config.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "export.js"), "utf8"));

var pass = 0, fail = 0, total = 0;
function assertClose(a, b, tol, msg) {
    total++;
    if (Math.abs(a - b) <= tol) { pass++; }
    else { fail++; console.log("  FAIL: " + msg + " | got=" + a + " expected=" + b); }
}
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}

// Graphic 1000x1000 pt at origin; panel is an inner slice that the graphic
// overhangs by 100 pt on the left and 100 pt on the top.
var GRAPHIC = [0, 1000, 1000, 0];
var TILE = { index: 1, expanded: [100, 900, 500, 100] };   // 400 x 800 pt

console.log("\n=== output at source scale (k = 1) ===");
var r = TE.Export.tileTransform(TILE, GRAPHIC, 1);
assertClose(r.artboard[0], 0, 0.001, "artboard starts at origin");
assertClose(r.artboard[1], 0, 0.001, "artboard top at origin");
assertClose(r.artboard[2], 400, 0.001, "artboard width is the panel width");
assertClose(r.artboard[3], -800, 0.001, "artboard bottom is negative height");
assertClose(r.position[0], -100, 0.001, "graphic sits 100 pt left of the panel");
assertClose(r.position[1], 100, 0.001, "graphic sits 100 pt above the panel");
assertClose(r.size[0], 1000, 0.001, "graphic keeps its width");
assertClose(r.size[1], 1000, 0.001, "graphic keeps its height");

console.log("\n=== output 1:1 from a 1:10 document (k = 10) ===");
var r10 = TE.Export.tileTransform(TILE, GRAPHIC, 10);
assertClose(r10.artboard[2], 4000, 0.001, "artboard scales up tenfold");
assertClose(r10.artboard[3], -8000, 0.001, "height scales too");
assertClose(r10.position[0], -1000, 0.001, "offset scales");
assertClose(r10.position[1], 1000, 0.001, "offset scales on Y as well");
assertClose(r10.size[0], 10000, 0.001, "graphic scales");

console.log("\n=== the graphic keeps its position relative to the panel ===");
var ratio1 = (0 - r.position[0]) / (r.artboard[2] - r.artboard[0]);
var ratio10 = (0 - r10.position[0]) / (r10.artboard[2] - r10.artboard[0]);
assertClose(ratio1, ratio10, 1e-9, "relative offset is scale-invariant");

console.log("\n=== a panel flush with the graphic edge ===");
// Panel 1 of a left-flush job: its left edge IS the graphic's left edge.
var flush = TE.Export.tileTransform({ index: 1, expanded: [0, 1000, 500, 0] }, GRAPHIC, 1);
assertClose(flush.position[0], 0, 0.001, "no offset when the panel starts at the graphic");
assertClose(flush.position[1], 0, 0.001, "no vertical offset either");

console.log("\n=== outputScale: what \"same as document\" means ===");
// sf is the SOURCE document's Large Canvas factor, passed in. It used to be
// read from app.activeDocument — which, during an export, is the temporary
// document and never Large Canvas.
var U = TE.Utils;
assertClose(U.outputScale({ exportScale: "source", scaleN: 10 }, 1), 1, 0.001,
    "ordinary 1:10 document, same as document: stays 1:10");
assertClose(U.outputScale({ exportScale: "actual", scaleN: 10 }, 1), 10, 0.001,
    "ordinary 1:10 document, 1:1: x10");
// N1. Large Canvas is Illustrator's internal representation, invisible on the
// rulers, so "same as document" means what the rulers show.
assertClose(U.outputScale({ exportScale: "source", scaleN: 1 }, 10), 10, 0.001,
    "Large Canvas drawn 1:1, same as document: real size");
assertClose(U.outputScale({ exportScale: "actual", scaleN: 1 }, 10), 10, 0.001,
    "Large Canvas drawn 1:1, 1:1: the same real size");
assertClose(U.outputScale({ exportScale: "source", scaleN: 10 }, 10), 10, 0.001,
    "Large Canvas drawn 1:10, same as document: a 1:10 proof");
assertClose(U.outputScale({ exportScale: "actual", scaleN: 10 }, 10), 100, 0.001,
    "Large Canvas drawn 1:10, 1:1: x100");

console.log("\n=== outputLineScale: the trim line at output scale ===");
// Printed width times this is the stroke in the temporary document. The Large
// Canvas factor cancels out: at 1:1 the line is its printed width, at the
// document's own scale printed / N, and the RIP scales it back up.
assertClose(U.outputLineScale({ exportScale: "actual", scaleN: 10 }), 1, 1e-9,
    "1:1 output: full printed width");
assertClose(U.outputLineScale({ exportScale: "source", scaleN: 10 }), 0.1, 1e-9,
    "1:10 output: a tenth, the RIP scales it up");
assertClose(U.outputLineScale({ exportScale: "source", scaleN: 1 }), 1, 1e-9,
    "a document drawn 1:1: full width either way");
// N10: the old rule divided by the ACTIVE document's factor. On a Large Canvas
// source at 1:1 that was the temporary document's 1, so 0.3 pt came out 3 pt.
global.app.activeDocument.scaleFactor = 10;
assertClose(U.outputLineScale({ exportScale: "actual", scaleN: 1 }), 1, 1e-9,
    "whatever document is active, a 1:1 line stays its printed width");
global.app.activeDocument.scaleFactor = 1;

console.log("\n=== guard: export never asks which document is active ===");
// The two defects above share one cause — reading app.activeDocument while a
// temporary document is the active one. So check the source for it.
// Comments are stripped first: the ones explaining this very rule name
// app.activeDocument, and must not trip it.
function code(src) { return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""); }
var exSrc = code(fs.readFileSync(path.join(__dirname, "..", "src", "export.js"), "utf8"));
var exBody = exSrc.slice(exSrc.indexOf("exportTile: function"));
assert(!/getSF|getEffectiveSF|activeDocument/.test(exBody),
    "exportTile takes every scale from its context");
var drSrc = code(fs.readFileSync(path.join(__dirname, "..", "src", "draw.js"), "utf8"));
var dlBody = drSrc.slice(drSrc.indexOf("drawTileLine: function"),
                         drSrc.indexOf("getRegistrationName: function"));
assert(!/getSF|getEffectiveSF|activeDocument/.test(dlBody),
    "drawTileLine takes its scale as an argument");

console.log("\n=== drawTileLine: centred on the panel edge, twice as thick (N13) ===");
// The page edge crops the outer half and the configured width stays inside
// the panel. The path itself lies ON the edge — where a cutter follows it in
// Zünd mode, and where the edge always falls inside the stroke.
eval(fs.readFileSync(path.join(__dirname, "..", "src", "draw.js"), "utf8"));
TE.Draw.getOrCreateSpot = function () { return "spot"; };
var drawn = null;
var fakeDoc = { pathItems: { rectangle: function (t, l, w, h) {
    drawn = { t: t, l: l, w: w, h: h };
    return {};
} } };
var line = TE.Draw.drawTileLine(fakeDoc, TILE.expanded, { lineSpot: "CutContour", lineWidth: 1 }, 1);
assertClose(drawn.t, TILE.expanded[1], 1e-9, "path top lies on the panel edge");
assertClose(drawn.l, TILE.expanded[0], 1e-9, "path left lies on the panel edge");
assertClose(drawn.w, 400, 1e-9, "full panel width, no inset");
assertClose(drawn.h, 800, 1e-9, "full panel height, no inset");
assertClose(line.strokeWidth, 2, 1e-9, "1 pt visible is a 2 pt stroke");
line = TE.Draw.drawTileLine(fakeDoc, TILE.expanded, { lineWidth: 1 }, 0.1);
assertClose(line.strokeWidth, 0.2, 1e-9, "1:10 output: scaled first, then doubled");
line = TE.Draw.drawTileLine(fakeDoc, TILE.expanded, { lineWidth: "" }, 1);
assertClose(line.strokeWidth, 2, 1e-9, "no width given: the 1 pt default, doubled");
assertClose(TE.Config.getDefaults().lineWidth, 1, 1e-9, "the default is 1 pt visible");

console.log("\n=== buildName ===");
assert(TE.Export.buildName("{doc}_{n}", "banner", 3, 12) === "banner_03",
    "index is zero-padded to the width of the total");
assert(TE.Export.buildName("{doc}_{n}_of_{total}", "b", 1, 4) === "b_1_of_4",
    "single-digit total needs no padding");
assert(TE.Export.buildName("plat_{n}", "ignored", 7, 100) === "plat_007",
    "three-digit total pads to three");

console.log("\n=== sourceOrigin, tileOrigin, k ===");
assertClose(r.sourceOrigin[0], GRAPHIC[0], 0.001, "sourceOrigin drží levý okraj grafiky");
assertClose(r.sourceOrigin[1], GRAPHIC[1], 0.001, "a její horní okraj");
assertClose(r.tileOrigin[0], TILE.expanded[0], 0.001, "tileOrigin drží levý okraj plátu");
assertClose(r.tileOrigin[1], TILE.expanded[1], 0.001, "a jeho horní okraj");
assertClose(r.k, 1, 0.001, "k je měřítko výstupu");
// A source point on the panel's left edge must map to 0 in the temporary doc.
assertClose((TILE.expanded[0] - r.tileOrigin[0]) * r.k, 0, 0.001,
    "levý okraj plátu se mapuje na počátek");
assertClose((GRAPHIC[0] - r.tileOrigin[0]) * r.k, r.position[0], 0.001,
    "pravidlo mapování sedí s pozicí grafiky");
assertClose((GRAPHIC[0] - r10.tileOrigin[0]) * r10.k, r10.position[0], 0.001,
    "a platí i při měřítku výstupu 1:1");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
