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

console.log("\n=== count mode: EQUAL CLEAN PANELS ===");
// "n panels" divides the GRAPHIC into n, so the cuts are exact fractions of the
// clean span and nothing else moves them. The overlap is material added on top
// afterwards, the adds sit outside the graphic entirely. Equalising the PRINTED
// widths instead is the other reading, and it lives in the "panel width" mode
// with "equalise" ticked — give it the roll, get equal prints.

// 3000 mm, 3 panels, 20 mm overlap, no adds: cuts are plain thirds.
var base = { divideMode: "count", tileCount: 3, overlap: 20,
             overlapMode: "symmetric", addLeft: 0, addRight: 0 };
var c1 = TE.Grid.computeCuts(merge(D, base), EXT, null);
assert(c1.length === 2, "3 panels produce 2 cuts");
assertClose(c1[0], mm(1000), 0.01, "first cut is a plain third");
assertClose(c1[1], mm(2000), 0.01, "second cut is two thirds");

// The overlap mode decides which panel carries the material, never where the
// seam is — both one-sided variants cut in exactly the same places.
var c1b = TE.Grid.computeCuts(merge(D, merge(base, { overlapMode: "onesided" })), EXT, null);
assertClose(c1b[0], mm(1000), 0.01, "one-sided does not move the first cut");
assertClose(c1b[1], mm(2000), 0.01, "nor the second");
var c1c = TE.Grid.computeCuts(
    merge(D, merge(base, { overlapMode: "onesided", overlapCarrier: "second" })), EXT, null);
assertClose(c1c[0], mm(1000), 0.01, "the other carrier does not move it either");

// Adds sit outside the graphic, so they cannot move an internal seam.
var cAdd = TE.Grid.computeCuts(
    merge(D, merge(base, { addLeft: 40, addRight: 40 })), EXT, null);
assertClose(cAdd[0], mm(1000), 0.01, "edge adds leave the seams alone");

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

console.log("\n=== count mode + equal panels ===");
// The switch asks for equal PRINTED panels with n as typed, so the overlap and
// the adds come back into the division:
//   W = (L + addLeft + addRight + (n-1) * overlap) / n
var eq = merge(D, merge(base, { equalPanels: true }));
var ce = TE.Grid.computeCuts(eq, EXT, null);
// W = (3000 + 2*20) / 3 = 1013.33, symmetric so c1 = W - overlap/2
assertClose(ce[0], mm(1003.3333), 0.01, "equal panels: first cut is W - overlap/2");
assertClose(ce[1], mm(1996.6667), 0.01, "equal panels: second cut is c1 + W - overlap");

// Off, the very same settings give plain thirds. One switch, two readings.
var ceOff = TE.Grid.computeCuts(merge(D, base), EXT, null);
assertClose(ceOff[0], mm(1000), 0.01, "unticked, the same job cuts at a third");

// Zero overlap collapses the two readings, which is why boards never care.
var eq0 = merge(D, { divideMode: "count", tileCount: 3, overlap: 0,
                     addLeft: 0, addRight: 0, equalPanels: true });
assertClose(TE.Grid.computeCuts(eq0, EXT, null)[0], mm(1000), 0.01,
    "no overlap: equal printed and equal clean are the same cut");

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

console.log("\n=== width mode + equal panels ===");
// The width is reread as a ceiling on the PRINTED panel, and the graphic goes
// into the fewest equal panels that fit under it:
//   n >= (span + adds - overlap) / (width - overlap)
// D carries overlap 20 and no adds, so on 3000 mm:
//   1400 -> ceil(2980/1380) = 3 panels, printed 3040/3 = 1013.33
//   1000 -> ceil(2980/ 980) = 4 panels, printed 3060/4 =  765
var dis = function (w) {
    return merge(D, { divideMode: "width", tileWidth: w, equalPanels: true });
};
var cd1 = TE.Grid.computeCuts(dis(1400), EXT, null);
assert(cd1.length === 2, "1400 mm ceiling gives 3 panels");
// The cut is not the width: D is symmetric, so the first seam sits half an
// overlap back from the panel edge — 1013.33 - 10.
assertClose(cd1[0], mm(1003.3333), 0.01, "first cut is an equal-panel cut, not 1400");
var cd2 = TE.Grid.computeCuts(dis(1000), EXT, null);
assert(cd2.length === 3, "1000 mm ceiling needs a fourth panel: five would print 1016");

// The exact boundary must not spill into one panel too many.
var cd3 = TE.Grid.computeCuts(dis(1013.3333333), EXT, null);
assert(cd3.length === 2, "a ceiling exactly on the resulting width stays at 3 panels");

// Its own code, not TE_BAD_WIDTH: the width is a fine positive number here,
// it is only too small to be a ceiling, and the message has to say so (N2).
throwsWith(function () { TE.Grid.computeCuts(dis(20), EXT, null); },
    "TE_CEILING_OVERLAP", "a ceiling equal to the overlap is rejected");
throwsWith(function () { TE.Grid.computeCuts(dis(10), EXT, null); },
    "TE_CEILING_OVERLAP", "a ceiling below the overlap is rejected");
throwsWith(function () { TE.Grid.computeCuts(dis(0), EXT, null); },
    "TE_BAD_WIDTH", "a zero ceiling is a bad width first, not a ceiling problem");
throwsWith(function () { TE.Grid.computeCuts(dis(5000), EXT, null); },
    "TE_MIN_TILES", "a ceiling wider than the graphic cannot be tiled");

// Off, the same number keeps its old meaning: exact clean width, short last.
var cOff = TE.Grid.computeCuts(merge(D, { divideMode: "width", tileWidth: 1400 }), EXT, null);
assertClose(cOff[0], mm(1400), 0.01, "with the box unticked the cut is still at 1400");

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
