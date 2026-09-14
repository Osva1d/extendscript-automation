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
// The count mode promises EQUAL printed panels, so the cuts depend on the
// overlap and the edge adds. Each scenario therefore recomputes its own cuts —
// reusing one set across different overlaps is what made the earlier version
// of this test wrong.
var s = merge(D, {
    direction: "horizontal", divideMode: "count", tileCount: 3,
    overlap: 20, overlapMode: "symmetric",
    addTop: 40, addBottom: 40, addLeft: 0, addRight: 40
});

/** Cuts and panels for one settings object, against CLEAN. */
function build(st, clean) {
    var c = clean || CLEAN;
    var ext = (st.direction === "horizontal")
        ? { start: c[0], end: c[2] }
        : { start: c[3], end: c[1] };
    return TE.Grid.computeTiles(TE.Grid.computeCuts(st, ext, null), c, st);
}

/** Finished width of a panel along the split axis, in real millimetres. */
function widthMM(tile, st) {
    var e = tile.expanded;
    var d = (st.direction === "horizontal") ? (e[2] - e[0]) : (e[1] - e[3]);
    return Math.round(TE.Utils.fromDoc(d, st) * 100) / 100;
}

function assertAllEqual(tiles, st, expected, label) {
    var i, w, ok = true;
    for (i = 0; i < tiles.length; i++) {
        w = widthMM(tiles[i], st);
        if (Math.abs(w - expected) > 0.02) { ok = false; }
    }
    total++;
    if (ok) { pass++; }
    else {
        fail++;
        var got = [];
        for (i = 0; i < tiles.length; i++) { got.push(widthMM(tiles[i], st)); }
        console.log("  FAIL: " + label + " | got=" + got.join("|") + " expected all " + expected);
    }
}

var t = build(s);
assert(t.length === 3, "3 panels");
assert(t[0].index === 1 && t[2].index === 3, "panels numbered 1..3");

// W = (3000 + 0 + 40 + 2*20) / 3 = 1026.67 mm
assertAllEqual(t, s, 1026.67, "všechny tři pláty stejně široké");

assertClose(t[0].clean[0], 0, 0.001, "p1 clean left at graphic edge");
assertClose(t[0].clean[2], mm(1016.6667), 0.01, "p1 clean right at the first cut");
assertClose(t[0].expanded[0], 0, 0.001, "p1 left flush: no add");
assertClose(t[0].expanded[2], mm(1026.6667), 0.01, "p1 right: half the overlap");
assertClose(t[0].expanded[1], mm(1040), 0.01, "p1 top: 40 mm add");
assertClose(t[0].expanded[3], mm(-40), 0.01, "p1 bottom: 40 mm add");

assertClose(t[1].expanded[0], mm(1006.6667), 0.01, "p2 left: half overlap into panel 1");
assertClose(t[1].expanded[2], mm(2033.3333), 0.01, "p2 right: half overlap into panel 3");

assertClose(t[2].expanded[0], mm(2013.3333), 0.01, "p3 left: half overlap");
assertClose(t[2].expanded[2], mm(3040), 0.01, "p3 right: 40 mm add, not overlap");

console.log("\n=== overlap lands exactly on the seam ===");
assertClose(t[0].expanded[2] - t[1].expanded[0], mm(20), 0.01, "p1/p2 overlap is 20 mm");
assertClose(t[1].expanded[2] - t[2].expanded[0], mm(20), 0.01, "p2/p3 overlap is 20 mm");

console.log("\n=== one-sided overlap: still equal panels ===");
var s1 = merge(s, { overlapMode: "onesided" });
var t1 = build(s1);
assertAllEqual(t1, s1, 1026.67, "jednostranný přelep dá stejně široké pláty");
assertClose(t1[0].expanded[2], mm(1026.6667), 0.01, "left panel carries the whole overlap");
assertClose(t1[1].expanded[0], mm(1006.6667), 0.01, "right panel starts exactly on the seam");
assertClose(t1[0].expanded[2] - t1[1].expanded[0], mm(20), 0.01, "overlap is still 20 mm");

console.log("\n=== one-sided the other way: the RIGHT panel carries it ===");
// Same job, overlapCarrier "second". The panels stay equal and the seam moves,
// mirroring the "first" case: panel 1 now ends exactly on the seam instead of
// reaching past it.
var s2 = merge(s, { overlapMode: "onesided", overlapCarrier: "second" });
var t2 = build(s2);
assertAllEqual(t2, s2, 1026.67, "druhý nosič přelepu nechává pláty stejné");
assertClose(t2[0].expanded[2], mm(1026.6667), 0.01, "left panel ends exactly on the seam");
assertClose(t2[1].expanded[0], mm(1006.6667), 0.01, "right panel carries the whole overlap");
assertClose(t2[0].expanded[2] - t2[1].expanded[0], mm(20), 0.01, "overlap is still 20 mm");
assertClose(t2[0].expanded[0], 0, 0.001, "outer left edge untouched: flush stays flush");
assertClose(t2[2].expanded[2], mm(3040), 0.01, "outer right edge still carries the add");

console.log("\n=== rigid boards: overlap 0 behaves exactly as plain division ===");
var s0 = merge(s, { overlap: 0 });
var t0 = build(s0);
// W = (3000 + 0 + 40) / 3 = 1013.33
assertAllEqual(t0, s0, 1013.33, "bez přelepu jsou pláty taky stejné");
assertClose(t0[0].clean[2], mm(1013.3333), 0.01, "no overlap: first cut is a plain third of the padded span");
assertClose(t0[0].expanded[2], mm(1013.3333), 0.01, "panels butt together");
assertClose(t0[1].expanded[0], mm(1013.3333), 0.01, "no overlap on the other side either");

// With no adds at all, zero overlap must give exact thirds — the pre-change
// behaviour, which is what keeps rigid-board presets working.
var sPlain = merge(s, { overlap: 0, addTop: 0, addBottom: 0, addLeft: 0, addRight: 0 });
var tPlain = build(sPlain);
assertClose(tPlain[0].clean[2], mm(1000), 0.01, "no overlap, no adds: exact thirds");
assertClose(tPlain[1].clean[2], mm(2000), 0.01, "and the second third");

console.log("\n=== clean format never carries adds or overlap ===");
assertClose(t[1].clean[0], mm(1016.6667), 0.01, "p2 clean left is the cut");
assertClose(t[1].clean[2], mm(2023.3333), 0.01, "p2 clean right is the cut");
assertClose(t[1].clean[1], mm(1000), 0.01, "p2 clean top is the graphic top");
assertClose(t[1].clean[3], 0, 0.001, "p2 clean bottom is the graphic bottom");

console.log("\n=== vertical: panels numbered top down, still equal ===");
var sv = merge(D, {
    direction: "vertical", divideMode: "count", tileCount: 2,
    overlap: 20, overlapMode: "symmetric",
    addTop: 40, addBottom: 0, addLeft: 30, addRight: 30
});
var tv = build(sv);
assert(tv.length === 2, "2 vertical panels");
// W = (1000 + 0 + 40 + 20) / 2 = 530 mm
assertAllEqual(tv, sv, 530, "svislé pláty jsou taky stejně vysoké");
assertClose(tv[0].clean[1], mm(1000), 0.01, "panel 1 is the TOP one");
assertClose(tv[0].expanded[1], mm(1040), 0.01, "panel 1 top: 40 mm add");
assertClose(tv[1].expanded[3], 0, 0.001, "panel 2 bottom flush: no add");
assertClose(tv[0].expanded[0], mm(-30), 0.01, "side adds apply to every vertical panel");
assertClose(tv[0].expanded[2], mm(3030), 0.01, "side adds apply on the right too");

console.log("\n=== vertical + one-sided: the combination the unit tests used to miss ===");
// Found by property test: the top panel carries the whole overlap, and top is
// the HIGH end of the ascending axis, so the panel at the low end carries none.
// Getting that backwards made the two panels differ by exactly 2x the overlap.
var svo = merge(sv, { overlapMode: "onesided" });
var tvo = build(svo);
assertAllEqual(tvo, svo, 530, "svisle jednostranně jsou pláty taky stejné");
assertClose(tvo[0].expanded[3] - tvo[1].expanded[1], mm(-20), 0.01,
    "horní plát nese celý přelep, dolní začíná přesně na švu");

console.log("\n=== vertical + the other carrier: the LOWER panel carries it ===");
// Vertical flips the axis end, so "second" here means the panel at the LOW end
// of the ascending axis carries the overlap — the mirror of the case above.
var svo2 = merge(sv, { overlapMode: "onesided", overlapCarrier: "second" });
var tvo2 = build(svo2);
assertAllEqual(tvo2, svo2, 530, "svisle a obráceně jsou pláty pořád stejné");
assertClose(tvo2[0].expanded[3], mm(510), 0.01, "horní plát končí přesně na švu");
assertClose(tvo2[1].expanded[1], mm(530), 0.01, "dolní plát nese celý přelep");
assertClose(tvo2[1].expanded[1] - tvo2[0].expanded[3], mm(20), 0.01, "přelep je pořád 20 mm");

console.log("\n=== 1:10 document ===");
var CLEAN10 = [0, mm(100), mm(300), 0];
var s10 = merge(s, { scaleN: 10 });
var t10 = build(s10, CLEAN10);
assertAllEqual(t10, s10, 1026.67, "měřítko 1:10 nemění skutečné šířky plátů");
assertClose(t10[0].expanded[2], mm(102.6667), 0.01, "adds and overlap shrink with the document");
assertClose(t10[0].expanded[1], mm(104), 0.01, "top add shrinks too");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
