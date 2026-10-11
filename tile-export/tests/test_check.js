#!/usr/bin/env node
/**
 * TE.Check — the check panels' geometry and layout (1.1.0). Pure parts only;
 * building them in Illustrator is checked by probes.
 */
var fs = require("fs");
var path = require("path");

var TE = {};
global.app = { documents: { length: 1 }, activeDocument: { scaleFactor: 1 } };
global.TE = TE;
function load(rel) { eval.call(global, fs.readFileSync(path.join(__dirname, "..", rel), "utf8")); }
load("src/lib/utils.js");
load("src/config.js");
load("../shared/lib/cut_marks.js");
global.buildCutMarks(TE);
load("src/export.js");
load("src/check.js");

var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}
function close(a, b, msg) { assert(Math.abs(a - b) < 1e-6, msg + " | got=" + a + " expected=" + b); }

var P = TE.Utils.mm2pt;
function merge(o) {
    var s = TE.Config.getDefaults(), k;
    for (k in o) { if (o.hasOwnProperty(k)) { s[k] = o[k]; } }
    return s;
}
// Panel 1 of the arch sheet, 3000 x 1000 mm at 1:10: 1000 mm clean plus
// half the 20 mm overlap, in document points (a tenth of real size).
var T1 = { index: 1, clean: [0, P(100), P(100), 0], expanded: [0, P(100), P(101), 0] };

console.log("\n=== geometry: the page the export writes, at the drawing's scale ===");
var gm = TE.Check.geometry(T1, merge({ scaleN: 10 }), 1);
close(gm.ratio, 10, "1:10 drawing: ten real mm per document mm");
assert(gm.page === T1.expanded && gm.mask === T1.expanded && gm.cut === null,
    "manual trim: the page and the mask are the printed panel");
var gz = TE.Check.geometry(T1, merge({ scaleN: 10, zundMode: true }), 1);
// The dialog shows this panel's Zünd page as 104 x 103 mm at 1:10 (test_ui_summary).
close(TE.Utils.pt2mm(gz.page[2] - gz.page[0]), 104, "Zünd page width as the dialog and the export have it");
close(TE.Utils.pt2mm(gz.page[1] - gz.page[3]), 103, "Zünd page height");
close(TE.Utils.pt2mm(gz.cut[0] - gz.mask[0]), 0.5, "the mask reaches 5 mm real (0.5 mm drawn) past the cut");
var glc = TE.Check.geometry(T1, merge({ scaleN: 1 }), 10);
close(glc.ratio, 10, "Large Canvas at 1:1: inner units are a tenth of real size");

console.log("\n=== moving a panel moves its whole geometry ===");
var moved = TE.Check.shiftTile(T1, 500, -700);
close(moved.expanded[0], 500, "expanded left");
close(moved.clean[3], -700, "clean bottom");
var gzm = TE.Check.geometry(moved, merge({ scaleN: 10, zundMode: true }), 1);
close(gzm.page[0] - gz.page[0], 500, "the Zünd page moves along: x");
close(gzm.page[1] - gz.page[1], -700, "and y");
close(gzm.geo.marksZ[0].cx - gz.geo.marksZ[0].cx, 500, "and so do the marks");

console.log("\n=== gap: 10 mm on the rulers, or 5 % of the widest page ===");
close(TE.Check.gap([[0, P(100), P(100), 0]], 1), P(10), "small pages: 10 mm");
close(TE.Check.gap([[0, P(1000), P(400), 0]], 1), P(50), "a 1000 mm page: 5 % of it");
close(TE.Check.gap([[0, P(10), P(10), 0]], 10), P(1), "Large Canvas: 10 mm on the rulers is 1 mm inside");

console.log("\n=== layout: below the content in a row, right of it in a column ===");
var CANVAS = { l: -7000, t: 8000, r: 9000, b: -8000 };
var CONTENT = [0, P(100), P(300), 0];
var pages = [[0, P(100), P(101), 0], [P(99), P(100), P(201), 0], [P(199), P(100), P(300), 0]];
var G = P(10);
var row = TE.Check.layout(pages, CONTENT, CANVAS, "horizontal", G);
assert(row !== null && row.length === 3, "Svisle: three moves");
function placed(i, mv) { var p = pages[i]; return [p[0] + mv[i][0], p[1] + mv[i][1], p[2] + mv[i][0], p[3] + mv[i][1]]; }
var r0 = placed(0, row), r1 = placed(1, row), r2 = placed(2, row);
close(r0[1], CONTENT[3] - G, "the row starts a gap below the content");
close(r0[0], CONTENT[0], "at the content's left edge");
close(r1[0] - r0[2], G, "panels a gap apart");
close(r2[0] - r1[2], G, "all of them");
assert(r0[1] === r1[1] && r1[1] === r2[1], "one row, numbered left to right");
var col = TE.Check.layout(pages, CONTENT, CANVAS, "vertical", G);
var c0 = placed(0, col), c1 = placed(1, col);
close(c0[0], CONTENT[2] + G, "Vodorovně: the column starts a gap right of the content");
close(c0[1], CONTENT[1], "at the content's top");
close(c0[3] - c1[1], G, "panels a gap apart, top down");

console.log("\n=== layout: wrapping, and what does not fit ===");
// A canvas that holds two pages a row: the third goes to a second row.
var narrow = { l: -7000, t: 8000, r: P(101) + G + P(102) + 1, b: -8000 };
var wrap = TE.Check.layout(pages, CONTENT, narrow, "horizontal", G);
var w2 = placed(2, wrap), w0 = placed(0, wrap);
close(w2[0], w0[0], "the third page starts the next row at the left edge");
close(w0[3] - w2[1], G, "a gap below the first row");
assert(TE.Check.layout(pages, CONTENT, { l: -7000, t: 8000, r: P(50), b: -8000 }, "horizontal", G) === null,
    "a page wider than the room: nothing fits");
assert(TE.Check.layout(pages, CONTENT, { l: -7000, t: 8000, r: 9000, b: -P(50) }, "horizontal", G) === null,
    "no room below the content: nothing fits");
var many = [], i;
for (i = 0; i < 12; i++) { many.push([P(i * 100), P(100), P(i * 100 + 101), 0]); }
var big = TE.Check.layout(many, [0, P(100), P(1200), 0], { l: -7000, t: 8000, r: P(450), b: -8000 }, "horizontal", G);
var ok = big !== null, j, a, b;
for (i = 0; ok && i < many.length; i++) {
    a = [many[i][0] + big[i][0], many[i][1] + big[i][1], many[i][2] + big[i][0], many[i][3] + big[i][1]];
    if (a[2] > P(450) + 1e-6 || a[1] > -G + 1e-6) { ok = false; }
    for (j = 0; ok && j < i; j++) {
        b = [many[j][0] + big[j][0], many[j][1] + big[j][1], many[j][2] + big[j][0], many[j][3] + big[j][1]];
        if (a[0] < b[2] + G - 1e-6 && b[0] < a[2] + G - 1e-6 && a[3] < b[1] + G - 1e-6 && b[3] < a[1] + G - 1e-6) {
            ok = false;
        }
    }
}
assert(ok, "twelve pages over several rows: on the canvas, below the content, a gap apart");

console.log("\n=== the canvas is measured before a run removes anything ===");
// The measurement probes with artboards.add, which Illustrator refuses past
// the canvas. A refused add in a script that has already removed artboards
// or layers brings them back inside Illustrator while the script still sees
// them gone; every add after it failed with "there is no document", the
// canvas measured as a point and a second Panels only found no room
// (measured 2026-10-11, AI 30.8.2).
var mainSrc = fs.readFileSync(path.join(__dirname, "..", "src/main.js"), "utf8");
var checkSrc = fs.readFileSync(path.join(__dirname, "..", "src/check.js"), "utf8");
var iCanvas = mainSrc.indexOf("TE.Check.canvasBounds(doc)");
var iRemove = mainSrc.indexOf("TE.Check.removeAll(doc)");
assert(iCanvas !== -1 && iRemove !== -1 && iCanvas < iRemove,
    "main.js measures the canvas before it removes the old panels");
var buildSrc = checkSrc.slice(checkSrc.indexOf("    build: function"), checkSrc.indexOf("    buildPanel: function"));
assert(buildSrc.length > 0 && buildSrc.indexOf("canvasBounds(") === -1,
    "build() measures nothing itself: its caller hands it the canvas");

console.log("\n=== a run never removes the active layer ===");
// A first run left the last panel's sublayer active, and the next one starts
// there. A removed active layer still reads as doc.activeLayer, and build()
// hands back the layer it finds, so it must be moved out first.
var docNode = { typename: "Document" };
function lay(name, parent) { return { name: name, typename: "Layer", parent: parent || docNode }; }
var userL = lay("Layer 1"), checkL = lay(TE.Config.layerCheck), linesL = lay(TE.Config.layerLines);
var deepL = lay("CutContour", lay("TE_03", checkL));
var seen = null;
TE.Doc = { findCheckLayer: function () { return null; } };
TE.Draw = {
    removeTileArtboards: function (d) { seen = d.activeLayer; return 0; },
    removeLinesLayer: function () { return false; }
};
var dRun = { activeLayer: deepL, layers: [checkL, userL] };
TE.Check.removeAll(dRun);
assert(seen === userL, "the active layer leaves the check layer before anything is removed");
dRun = { activeLayer: linesL, layers: [linesL, checkL, userL] };
TE.Check.removeAll(dRun);
assert(seen === userL, "and the 1.0 lines layer too, past the check layer");
dRun = { activeLayer: userL, layers: [checkL, lay("Layer 2"), userL] };
TE.Check.removeAll(dRun);
assert(seen === userL, "the user's own active layer stays");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
