#!/usr/bin/env node
/**
 * TE.Grid.computeCuts — cut positions from count / width / guides.
 * Pure maths, no Illustrator DOM.
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
function throwsWith(fn, code, msg) {
    total++;
    try { fn(); fail++; console.log("  FAIL: " + msg + " | did not throw"); }
    catch (e) {
        if (e.message === code) { pass++; }
        else { fail++; console.log("  FAIL: " + msg + " | got " + e.message + " expected " + code); }
    }
}

var D = TE.Config.getDefaults();
var EXT = { start: 0, end: mm(3000) };   // 3000 mm wide graphic

console.log("\n=== count mode: EQUAL FINISHED PANELS ===");
// The count mode promises n equal panels, so the cuts must account for the
// overlap and the edge adds — the printed width is
//   W = (L + addLeft + addRight + (n-1) * overlap) / n
// Dividing the clean format evenly and adding the overlap afterwards gives
// panels of different widths, which matches no job spec.

// 3000 mm, 3 panels, 20 mm overlap, no adds: W = (3000 + 40) / 3 = 1013.33
var base = { divideMode: "count", tileCount: 3, overlap: 20,
             overlapMode: "symmetric", addLeft: 0, addRight: 0 };
var c1 = TE.Grid.computeCuts(merge(D, base), EXT, null);
assert(c1.length === 2, "3 panels produce 2 cuts");
assertClose(c1[0], mm(1003.3333), 0.01, "first cut: W - overlap/2");
assertClose(c1[1], mm(1996.6667), 0.01, "second cut: previous + W - overlap");

// One-sided overlap shifts only the first cut: c1 = W - overlap
var c1b = TE.Grid.computeCuts(merge(D, merge(base, { overlapMode: "onesided" })), EXT, null);
assertClose(c1b[0], mm(993.3333), 0.01, "one-sided: first cut is W - overlap");
assertClose(c1b[1], mm(1986.6667), 0.01, "one-sided: second cut follows the same step");

// Edge adds enlarge the printed panel, so they belong in W too.
// W = (3000 + 40 + 40 + 40) / 3 = 1040
var cAdd = TE.Grid.computeCuts(
    merge(D, merge(base, { addLeft: 40, addRight: 40 })), EXT, null);
assertClose(cAdd[0], mm(990), 0.01, "with adds: W - overlap/2 - addLeft");

// ZERO OVERLAP must reduce to plain even division — this is what keeps rigid
// boards behaving exactly as before.
var c2 = TE.Grid.computeCuts(
    merge(D, { divideMode: "count", tileCount: 2, overlap: 0, addLeft: 0, addRight: 0 }),
    EXT, null);
assert(c2.length === 1, "2 panels produce 1 cut");
assertClose(c2[0], mm(1500), 0.001, "no overlap: cut in the middle, as before");

var c2c = TE.Grid.computeCuts(
    merge(D, { divideMode: "count", tileCount: 3, overlap: 0, addLeft: 0, addRight: 0 }),
    EXT, null);
assertClose(c2c[0], mm(1000), 0.001, "no overlap, 3 panels: thirds, as before");
assertClose(c2c[1], mm(2000), 0.001, "and the second third");

throwsWith(function () {
    TE.Grid.computeCuts(merge(D, { divideMode: "count", tileCount: 1 }), EXT, null);
}, "TE_MIN_TILES", "one panel is rejected");

console.log("\n=== width mode ===");
var c3 = TE.Grid.computeCuts(merge(D, { divideMode: "width", tileWidth: 1400 }), EXT, null);
assert(c3.length === 2, "1400 mm width over 3000 mm gives 2 cuts");
assertClose(c3[0], mm(1400), 0.001, "cut at 1400 mm");
assertClose(c3[1], mm(2800), 0.001, "cut at 2800 mm, last panel is 200 mm");

var c4 = TE.Grid.computeCuts(merge(D, { divideMode: "width", tileWidth: 1500 }), EXT, null);
assert(c4.length === 1, "exact fit gives 1 cut, not 2");

throwsWith(function () {
    TE.Grid.computeCuts(merge(D, { divideMode: "width", tileWidth: 0 }), EXT, null);
}, "TE_BAD_WIDTH", "zero width is rejected");

console.log("\n=== guides mode ===");
var g = [mm(2000), mm(-50), mm(500), mm(3200), mm(1200)];
var c5 = TE.Grid.computeCuts(merge(D, { divideMode: "guides" }), EXT, g);
assert(c5.length === 3, "only guides inside the extent are used");
assertClose(c5[0], mm(500), 0.001, "sorted ascending: first");
assertClose(c5[1], mm(1200), 0.001, "sorted ascending: second");
assertClose(c5[2], mm(2000), 0.001, "sorted ascending: third");

var messy = [mm(500.4), mm(1199.6)];
var c6 = TE.Grid.computeCuts(merge(D, { divideMode: "guides", guideRound: 10 }), EXT, messy);
assertClose(c6[0], mm(500), 0.01, "rounded to 10 mm step");
assertClose(c6[1], mm(1200), 0.01, "rounded to 10 mm step");

var c7 = TE.Grid.computeCuts(merge(D, { divideMode: "guides", guideRound: 0 }), EXT, messy);
assertClose(c7[0], mm(500.4), 0.001, "no rounding when step is 0");

var dup = [mm(1000.1), mm(1000.4)];
var c8 = TE.Grid.computeCuts(merge(D, { divideMode: "guides", guideRound: 10 }), EXT, dup);
assert(c8.length === 1, "guides that round to the same position collapse to one cut");

throwsWith(function () {
    TE.Grid.computeCuts(merge(D, { divideMode: "guides" }), EXT, []);
}, "TE_NO_GUIDES", "no guides is rejected");

throwsWith(function () {
    TE.Grid.computeCuts(merge(D, { divideMode: "guides" }), EXT, [mm(5000)]);
}, "TE_NO_GUIDES", "guides all outside the extent is rejected");

console.log("\n=== scale: 1:10 document ===");
var s10 = merge(D, { divideMode: "width", tileWidth: 1400, scaleN: 10 });
var c9 = TE.Grid.computeCuts(s10, { start: 0, end: mm(300) }, null);
assertClose(c9[0], mm(140), 0.001, "panel width is scaled into document space");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
