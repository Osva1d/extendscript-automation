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

console.log("\n=== outputScale ===");
assertClose(TE.Export.outputScale({ exportScale: "source", scaleN: 10 }), 1, 0.001,
    "source scale keeps document units");
assertClose(TE.Export.outputScale({ exportScale: "actual", scaleN: 10 }), 10, 0.001,
    "actual scale uses the effective factor");

console.log("\n=== buildName ===");
assert(TE.Export.buildName("{doc}_{n}", "banner", 3, 12) === "banner_03",
    "index is zero-padded to the width of the total");
assert(TE.Export.buildName("{doc}_{n}_of_{total}", "b", 1, 4) === "b_1_of_4",
    "single-digit total needs no padding");
assert(TE.Export.buildName("plat_{n}", "ignored", 7, 100) === "plat_007",
    "three-digit total pads to three");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
