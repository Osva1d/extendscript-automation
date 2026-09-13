#!/usr/bin/env node
/**
 * TE.Doc — reading the artboard, the graphic, its overhang and the guides.
 */
var fs = require("fs");
var path = require("path");
var M = require("./lib/mock_illustrator.js");

var TE = {};
global.app = { documents: { length: 1 }, activeDocument: { scaleFactor: 1 } };
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "config.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "doc.js"), "utf8"));

var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}
function assertClose(a, b, tol, msg) {
    total++;
    if (Math.abs(a - b) <= tol) { pass++; }
    else { fail++; console.log("  FAIL: " + msg + " | got=" + a + " expected=" + b); }
}

console.log("\n=== findCleanArtboard ===");
var d1 = M.mockDoc({ artboards: [
    { name: "Artboard 1", artboardRect: [0, 800, 1200, 0] }
]});
var ca = TE.Doc.findCleanArtboard(d1);
assert(ca !== null && ca.index === 0, "the only artboard is the clean format");

var d2 = M.mockDoc({ artboards: [
    { name: "Artboard 1", artboardRect: [0, 800, 1200, 0] },
    { name: "TE_01",      artboardRect: [0, 840, 420, -40] },
    { name: "TE_02",      artboardRect: [380, 840, 820, -40] }
]});
var ca2 = TE.Doc.findCleanArtboard(d2);
assert(ca2.index === 0, "generated panels are not mistaken for the clean format");
assert(TE.Doc.findTileArtboards(d2).length === 2, "both panels are recognised");

var d3 = M.mockDoc({ artboards: [{ name: "TE_01", artboardRect: [0, 10, 10, 0] }] });
assert(TE.Doc.findCleanArtboard(d3) === null, "only panels means no clean format");

console.log("\n=== computeOverhang ===");
// Measured case: a 2000x1000 pt PDF on an 1800x800 pt artboard overhangs 100 pt each side.
var oh = TE.Doc.computeOverhang([-100, 900, 1900, -100], [0, 800, 1800, 0]);
assertClose(oh.left, 100, 0.001, "left overhang");
assertClose(oh.right, 100, 0.001, "right overhang");
assertClose(oh.top, 100, 0.001, "top overhang");
assertClose(oh.bottom, 100, 0.001, "bottom overhang");

var oh2 = TE.Doc.computeOverhang([50, 700, 1700, 100], [0, 800, 1800, 0]);
assertClose(oh2.left, -50, 0.001, "graphic short of the edge gives negative overhang");

console.log("\n=== readGuides ===");
var visible = { name: "Layer 1", visible: true,  locked: false };
var locked  = { name: "Locked",  visible: true,  locked: true  };
var hidden  = { name: "Hidden",  visible: false, locked: false };

// Hand-dragged guides overhang the artboard by orders of magnitude —
// measured y from 7691 down to -8692 on a 1000 pt tall artboard.
var d4 = M.mockDoc({ pathItems: [
    M.mockGuide(1553.09, 7691, 1553.09, -8692, visible),
    M.mockGuide(962.18,  7691, 962.18,  -8692, visible),
    M.mockGuide(0, 400, 2000, 400, visible),
    M.mockGuide(800, 7691, 800, -8692, locked),
    M.mockGuide(300, 7691, 300, -8692, hidden),
    M.mockPathItem({ guides: false, layer: visible,
                     points: [{ anchor: [10, 10] }, { anchor: [20, 20] }] })
]});

var gh = TE.Doc.readGuides(d4, "horizontal");
assert(gh.positions.length === 3, "horizontal split uses vertical guides only");
assert(TE.Utils.indexOf(gh.positions, 800) !== -1, "a guide on a locked layer is used");
assert(TE.Utils.indexOf(gh.positions, 300) === -1, "a guide on a hidden layer is ignored");
assert(gh.hiddenCount === 1, "ignored hidden guides are counted for the summary");

var gv = TE.Doc.readGuides(d4, "vertical");
assert(gv.positions.length === 1, "vertical split uses horizontal guides only");
assertClose(gv.positions[0], 400, 0.001, "horizontal guide position is its Y");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
