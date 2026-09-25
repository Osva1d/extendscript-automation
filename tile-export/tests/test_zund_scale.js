#!/usr/bin/env node
/**
 * Zünd marks in the temporary panel document (N11) and the contour boundary
 * (N21).
 *
 * During export the ACTIVE document is the temporary one, which is never
 * Large Canvas and knows nothing of the manual 1:N scale. Anything that reads
 * its scale from there is wrong whenever the page ratio differs from the
 * manual scale — above all the common big job: a 1:10 document exported 1:1,
 * where marks came out 0.5 mm instead of 5 mm. The ratio is now passed in.
 *
 * Runs the real TE.Utils and the shared geometry in Node; the active document
 * is a stub set to what the temporary document reports: scaleFactor 1.
 */
var fs = require("fs");
var path = require("path");

var TE = {};
global.TE = TE;
global.app = { documents: { length: 1 }, activeDocument: { scaleFactor: 1 }, locale: "cs_CZ" };
function load(rel) { eval.call(global, fs.readFileSync(path.join(__dirname, "..", rel), "utf8")); }
load("src/locale.js");
load("src/lib/utils.js");
load("src/config.js");
load("../shared/lib/cut_marks.js");
global.buildCutMarks(TE);
load("src/draw.js");
var U = TE.Utils;

var pass = 0, fail = 0, total = 0;
function close(got, want, msg) {
    total++;
    if (Math.abs(got - want) < 0.01) { pass++; }
    else { fail++; console.log("  FAIL: " + msg + " | got=" + got + " expected=" + want); }
}
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}

console.log("\n=== pageRatio: real mm per page mm ===");
var situations = [
    { name: "1:10 document, same as document", sf: 1,  manual: 10, out: "source", ratio: 10 },
    { name: "1:10 document, 1:1 output",       sf: 1,  manual: 10, out: "actual", ratio: 1 },
    { name: "1:1 document, 1:1 output",        sf: 1,  manual: 1,  out: "actual", ratio: 1 },
    { name: "Large Canvas, same as document",  sf: 10, manual: 1,  out: "source", ratio: 1 },
    { name: "Large Canvas + 1:10, same as doc", sf: 10, manual: 10, out: "source", ratio: 10 }
];
function settings(c) {
    var s = TE.Config.getDefaults();
    s.scaleN = c.manual; s.exportScale = c.out; s.mode = "ZUND";
    s.markSizeZ = 5; s.gapInner = 10; s.gapOuter = 0; s.maxDist = 500; s.orientDist = 100;
    return s;
}
situations.forEach(function (c) {
    close(U.pageRatio(settings(c), c.sf), c.ratio, c.name);
});

console.log("\n=== marks on the PDF page, in real mm, in every situation (N11) ===");
// A 2020 x 1000 mm panel mapped into its temporary document the way the
// export does it, then marks from the shared geometry and drawMarks.
situations.forEach(function (c) {
    var s = settings(c);
    var R = U.pageRatio(s, c.sf);
    var toPage = function (mm) { return U.mm2pt(mm) / R; };   // real mm -> temp pt
    var panel = [0, toPage(1000), toPage(2020), 0];
    var geo = TE.Core.calculateAll(s, panel, R);
    var m = geo.marksZ[0];
    // Mark centre sits gap + radius outside the panel edge.
    close(U.pt2mm(panel[0] - m.cx) * R, 10 + 2.5, c.name + ": mark centre 12.5 mm off the edge");

    var drawn = [];
    var fakeDoc = { pathItems: { ellipse: function (t, l, w, h) { var e = { w: w }; drawn.push(e); return e; } } };
    TE.Draw.resolveMarkColor = function () { return "spot"; };
    TE.Draw.drawMarks(fakeDoc, { marksZ: [m] }, s, null, R);
    close(U.pt2mm(drawn[0].w) * R, 5, c.name + ": mark diameter 5 mm");
});

console.log("\n=== ZSM keeps its own behaviour without the new argument ===");
// zund-summa-marks calls calculateAll(s, b): the scale then still comes from
// the active document, which in that tool is the right one.
var sZ = settings(situations[0]);
global.app.activeDocument.scaleFactor = 1;
var gOld = TE.Core.calculateAll(sZ, [0, 1000, 2000, 0]);
var gNew = TE.Core.calculateAll(sZ, [0, 1000, 2000, 0], U.getEffectiveSF(sZ));
close(gOld.marksZ[0].cx, gNew.marksZ[0].cx, "no third argument = the active document's scale");

console.log("\n=== guards: the export path takes its scale from its context ===");
function code(src) { return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""); }
function body(file, start, end) {
    var src = code(fs.readFileSync(path.join(__dirname, "..", file), "utf8"));
    var a = src.indexOf(start);
    return src.slice(a, end ? src.indexOf(end, a + start.length) : undefined);
}
var ex = body("src/export.js", "buildZundPanel: function", "\n    },");
assert(/calculateAll\(\s*s\s*,\s*zl\.mask\s*,\s*ratio\s*\)/.test(ex), "the panel passes the page ratio to calculateAll");
assert(/drawMarks\(\s*tmp\s*,\s*geo\s*,\s*s\s*,\s*ctx\.markDef\s*,\s*ratio\b/.test(ex),
    "the panel passes the page ratio to drawMarks");
assert(!/getSF|getEffectiveSF|activeDocument/.test(ex), "the panel builder reads no document scale");
var dm = body("src/draw.js", "drawMarks: function", "\n    },");
assert(!/toDoc|getSF|getEffectiveSF|activeDocument/.test(dm), "drawMarks reads no document scale");

console.log("\n=== N21: the contour is cut against the panel, not the enlarged artboard ===");
// exportTile grows the artboard for the marks BEFORE splitting the contour;
// reading the artboard there put the cut data a mark-width into the neighbour.
var rc = body("src/cut.js", "renderTileContour: function", "\n    },");
assert(!/artboardRect/.test(rc), "renderTileContour does not read the artboard");
assert(/frameRects\(\s*tf\.artboard/.test(rc), "the covering frame is built on the panel rect");

console.log("\n=== N22: the contour is scaled with the artwork ===");
// A 1:10 document exported 1:1 placed the contour at the right spot but ten
// times too small: it was moved by k, never scaled by it.
assert(/\.resize\(\s*tf\.k\s*\*\s*100\s*,\s*tf\.k\s*\*\s*100/.test(rc), "renderTileContour scales the copy by the output scale");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
