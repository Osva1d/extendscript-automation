#!/usr/bin/env node
/**
 * TE.Grid.computeTiles — panel geometry: adds per edge, overlap on seams.
 * The main case is a real job spec: horizontal, 3 panels, 4 cm top and bottom,
 * left flush ("načisto"), 4 cm right.
 */
var fs = require("fs");
var path = require("path");

var TE = {};
global.app = { documents: { length: 1 }, activeDocument: { scaleFactor: 1 } };
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "config.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "grid.js"), "utf8"));

var mm = TE.Utils.mm2pt;
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
function merge(base, over) {
    var r = {}, k;
    for (k in base) { if (base.hasOwnProperty(k)) { r[k] = base[k]; } }
    for (k in over) { if (over.hasOwnProperty(k)) { r[k] = over[k]; } }
    return r;
}

var D = TE.Config.getDefaults();
// 3000 x 1000 mm graphic, origin bottom-left at [0,0]
var CLEAN = [0, mm(1000), mm(3000), 0];

console.log("\n=== real job: horizontal, 3 panels, T/B 40 mm, left flush, right 40 mm ===");
var s = merge(D, {
    direction: "horizontal", divideMode: "count", tileCount: 3,
    overlap: 20, overlapMode: "symmetric",
    addTop: 40, addBottom: 40, addLeft: 0, addRight: 40
});
var cuts = TE.Grid.computeCuts(s, { start: CLEAN[0], end: CLEAN[2] }, null);
var t = TE.Grid.computeTiles(cuts, CLEAN, s);

assert(t.length === 3, "3 panels");
assert(t[0].index === 1 && t[2].index === 3, "panels numbered 1..3");

assertClose(t[0].clean[0], 0, 0.001, "p1 clean left at graphic edge");
assertClose(t[0].clean[2], mm(1000), 0.001, "p1 clean right at first cut");
assertClose(t[0].expanded[0], 0, 0.001, "p1 left flush: no add, expanded == clean");
assertClose(t[0].expanded[2], mm(1010), 0.001, "p1 right: half the 20 mm overlap");
assertClose(t[0].expanded[1], mm(1040), 0.001, "p1 top: 40 mm add");
assertClose(t[0].expanded[3], mm(-40), 0.001, "p1 bottom: 40 mm add");

assertClose(t[1].expanded[0], mm(990), 0.001, "p2 left: half overlap into panel 1");
assertClose(t[1].expanded[2], mm(2010), 0.001, "p2 right: half overlap into panel 3");
assertClose(t[1].expanded[1], mm(1040), 0.001, "p2 top add is unchanged");

assertClose(t[2].expanded[0], mm(1990), 0.001, "p3 left: half overlap");
assertClose(t[2].expanded[2], mm(3040), 0.001, "p3 right: 40 mm add, not overlap");

console.log("\n=== overlap lands exactly on the seam ===");
assertClose(t[0].expanded[2] - t[1].expanded[0], mm(20), 0.001, "p1/p2 overlap is 20 mm");
assertClose(t[1].expanded[2] - t[2].expanded[0], mm(20), 0.001, "p2/p3 overlap is 20 mm");

console.log("\n=== one-sided overlap ===");
var s1 = merge(s, { overlapMode: "onesided" });
var t1 = TE.Grid.computeTiles(cuts, CLEAN, s1);
assertClose(t1[0].expanded[2], mm(1020), 0.001, "left panel carries the whole overlap");
assertClose(t1[1].expanded[0], mm(1000), 0.001, "right panel starts exactly on the seam");
assertClose(t1[0].expanded[2] - t1[1].expanded[0], mm(20), 0.001, "overlap is still 20 mm");

console.log("\n=== rigid boards: overlap 0 ===");
var s0 = merge(s, { overlap: 0 });
var t0 = TE.Grid.computeTiles(cuts, CLEAN, s0);
assertClose(t0[0].expanded[2], mm(1000), 0.001, "no overlap: panels butt together");
assertClose(t0[1].expanded[0], mm(1000), 0.001, "no overlap on the other side either");

console.log("\n=== clean format never carries adds or overlap ===");
assertClose(t[1].clean[0], mm(1000), 0.001, "p2 clean left is the cut");
assertClose(t[1].clean[2], mm(2000), 0.001, "p2 clean right is the cut");
assertClose(t[1].clean[1], mm(1000), 0.001, "p2 clean top is the graphic top");
assertClose(t[1].clean[3], 0, 0.001, "p2 clean bottom is the graphic bottom");

console.log("\n=== vertical: panels numbered top down ===");
var sv = merge(D, {
    direction: "vertical", divideMode: "count", tileCount: 2,
    overlap: 20, overlapMode: "symmetric",
    addTop: 40, addBottom: 0, addLeft: 30, addRight: 30
});
var cutsV = TE.Grid.computeCuts(sv, { start: CLEAN[3], end: CLEAN[1] }, null);
var tv = TE.Grid.computeTiles(cutsV, CLEAN, sv);
assert(tv.length === 2, "2 vertical panels");
assertClose(tv[0].clean[1], mm(1000), 0.001, "panel 1 is the TOP one");
assertClose(tv[0].clean[3], mm(500), 0.001, "panel 1 bottom at the cut");
assertClose(tv[0].expanded[1], mm(1040), 0.001, "panel 1 top: 40 mm add");
assertClose(tv[0].expanded[3], mm(490), 0.001, "panel 1 bottom: half overlap");
assertClose(tv[1].expanded[1], mm(510), 0.001, "panel 2 top: half overlap");
assertClose(tv[1].expanded[3], 0, 0.001, "panel 2 bottom flush: no add");
assertClose(tv[0].expanded[0], mm(-30), 0.001, "side adds apply to every vertical panel");
assertClose(tv[0].expanded[2], mm(3030), 0.001, "side adds apply on the right too");

console.log("\n=== 1:10 document ===");
var CLEAN10 = [0, mm(100), mm(300), 0];
var s10 = merge(s, { scaleN: 10 });
var cuts10 = TE.Grid.computeCuts(s10, { start: 0, end: mm(300) }, null);
var t10 = TE.Grid.computeTiles(cuts10, CLEAN10, s10);
assertClose(t10[0].expanded[2], mm(101), 0.001, "40 mm add and 20 mm overlap shrink with the document");
assertClose(t10[0].expanded[1], mm(104), 0.001, "top add shrinks too");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
