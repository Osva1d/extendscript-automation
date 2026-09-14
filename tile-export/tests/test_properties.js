#!/usr/bin/env node
/**
 * Property tests for TE.Grid — invariants that must hold for ANY input.
 *   1. Clean panels tile the graphic exactly: no gaps, no overlaps, full cover.
 *   2. Adjacent expanded panels overlap by exactly the configured amount.
 *   3. Outer edges carry the add, never the overlap.
 */
var fs = require("fs");
var path = require("path");
var fc = require("fast-check");

var TE = {};
global.app = { documents: { length: 1 }, activeDocument: { scaleFactor: 1 } };
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "config.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "grid.js"), "utf8"));

var mm = TE.Utils.mm2pt;
var D = TE.Config.getDefaults();
var TOL = 1e-6;

function merge(base, over) {
    var r = {}, k;
    for (k in base) { if (base.hasOwnProperty(k)) { r[k] = base[k]; } }
    for (k in over) { if (over.hasOwnProperty(k)) { r[k] = over[k]; } }
    return r;
}

function build(n, widthMm, heightMm, overlapMm, mode, dir) {
    var s = merge(D, {
        direction: dir, divideMode: "count", tileCount: n,
        overlap: overlapMm, overlapMode: mode,
        addTop: 40, addBottom: 25, addLeft: 0, addRight: 40
    });
    var clean = [0, mm(heightMm), mm(widthMm), 0];
    var ext = (dir === "horizontal")
        ? { start: clean[0], end: clean[2] }
        : { start: clean[3], end: clean[1] };
    var cuts = TE.Grid.computeCuts(s, ext, null);
    return { tiles: TE.Grid.computeTiles(cuts, clean, s), clean: clean, s: s };
}

// Overlap must stay smaller than the shortest panel, or a panel would reach
// past its neighbour entirely — that case is rejected by TE.Validate, not here.
var arbJob = fc.record({
    n:       fc.integer({ min: 2, max: 12 }),
    width:   fc.integer({ min: 600, max: 12000 }),
    height:  fc.integer({ min: 600, max: 6000 }),
    overlap: fc.integer({ min: 0, max: 40 }),
    mode:    fc.constantFrom("symmetric", "onesided"),
    dir:     fc.constantFrom("horizontal", "vertical")
}).filter(function (j) {
    var span = (j.dir === "horizontal") ? j.width : j.height;
    return j.overlap < span / j.n;
});

console.log("\n=== Property 1: clean panels tile the graphic exactly ===");
fc.assert(fc.property(arbJob, function (j) {
    var r = build(j.n, j.width, j.height, j.overlap, j.mode, j.dir);
    var t = r.tiles, i;
    if (t.length !== j.n) { return false; }

    if (j.dir === "horizontal") {
        if (Math.abs(t[0].clean[0] - r.clean[0]) > TOL) { return false; }
        if (Math.abs(t[t.length - 1].clean[2] - r.clean[2]) > TOL) { return false; }
        for (i = 0; i < t.length - 1; i++) {
            // No gap and no double-cover: the seam is one shared coordinate.
            if (Math.abs(t[i].clean[2] - t[i + 1].clean[0]) > TOL) { return false; }
        }
    } else {
        if (Math.abs(t[0].clean[1] - r.clean[1]) > TOL) { return false; }
        if (Math.abs(t[t.length - 1].clean[3] - r.clean[3]) > TOL) { return false; }
        for (i = 0; i < t.length - 1; i++) {
            if (Math.abs(t[i].clean[3] - t[i + 1].clean[1]) > TOL) { return false; }
        }
    }
    return true;
}), { numRuns: 500 });
console.log("  ok (500 runs)");

console.log("\n=== Property 2: adjacent panels overlap by exactly the configured amount ===");
fc.assert(fc.property(arbJob, function (j) {
    var r = build(j.n, j.width, j.height, j.overlap, j.mode, j.dir);
    var t = r.tiles, i, got;
    var want = TE.Utils.toDoc(j.overlap, r.s);

    for (i = 0; i < t.length - 1; i++) {
        got = (j.dir === "horizontal")
            ? t[i].expanded[2] - t[i + 1].expanded[0]
            : t[i + 1].expanded[1] - t[i].expanded[3];
        if (Math.abs(got - want) > 1e-6) { return false; }
    }
    return true;
}), { numRuns: 500 });
console.log("  ok (500 runs)");

console.log("\n=== Property 3: outer edges carry the add, never the overlap ===");
fc.assert(fc.property(arbJob, function (j) {
    var r = build(j.n, j.width, j.height, j.overlap, j.mode, j.dir);
    var t = r.tiles;
    var addL = TE.Utils.toDoc(0,  r.s);   // addLeft is 0 — "načisto"
    var addR = TE.Utils.toDoc(40, r.s);

    if (j.dir === "horizontal") {
        if (Math.abs(t[0].expanded[0] - (r.clean[0] - addL)) > TOL) { return false; }
        if (Math.abs(t[t.length - 1].expanded[2] - (r.clean[2] + addR)) > TOL) { return false; }
    }
    return true;
}), { numRuns: 500 });
console.log("  ok (500 runs)");

console.log("\n=== Property 4: the count mode yields panels of EQUAL printed width ===");
// The strongest invariant of the three modes: "n panels" must mean n panels
// of the same PRINTED size — the expanded rect, which is what gets cut —
// whatever the overlap, the adds or the direction. The clean widths differ
// by design; see TE.Grid.equalCuts.
fc.assert(fc.property(arbJob, function (j) {
    var r = build(j.n, j.width, j.height, j.overlap, j.mode, j.dir);
    var t = r.tiles, i, w, first;
    for (i = 0; i < t.length; i++) {
        w = (j.dir === "horizontal")
            ? t[i].expanded[2] - t[i].expanded[0]
            : t[i].expanded[1] - t[i].expanded[3];
        if (i === 0) { first = w; }
        else if (Math.abs(w - first) > 1e-6) { return false; }
    }
    return true;
}), { numRuns: 500 });
console.log("  ok (500 runs)");

console.log("\n=== Property 5: panels consume exactly the expected material ===");
// Sum of printed widths = clean span + both edge adds + one overlap per seam.
// That is the identity the equal-width formula is derived from, checked the
// other way round.
fc.assert(fc.property(arbJob, function (j) {
    var r = build(j.n, j.width, j.height, j.overlap, j.mode, j.dir);
    var t = r.tiles, i, sum = 0;
    for (i = 0; i < t.length; i++) {
        sum += (j.dir === "horizontal")
            ? t[i].expanded[2] - t[i].expanded[0]
            : t[i].expanded[1] - t[i].expanded[3];
    }
    var span = (j.dir === "horizontal")
        ? r.clean[2] - r.clean[0]
        : r.clean[1] - r.clean[3];
    var addLow  = (j.dir === "horizontal") ? 0  : 25;   // addLeft / addBottom in build()
    var addHigh = (j.dir === "horizontal") ? 40 : 40;   // addRight / addTop
    var want = span
             + TE.Utils.toDoc(addLow, r.s) + TE.Utils.toDoc(addHigh, r.s)
             + (j.n - 1) * TE.Utils.toDoc(j.overlap, r.s);
    return Math.abs(sum - want) < 1e-6;
}), { numRuns: 500 });
console.log("  ok (500 runs)");

console.log("\nALL PROPERTIES HOLD");
