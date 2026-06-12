#!/usr/bin/env node
/**
 * GM.Core circuit suite: corner detection + distribution.
 * Pure math — no DOM, no ScriptUI.
 *
 * Usage: node tests/test_core_circuit.js
 */
var fs = require("fs");
var path = require("path");
var GM = {};
function src(rel) { return fs.readFileSync(path.join(__dirname, "..", "src", rel), "utf8"); }
eval(src("constants.js"));
eval(src("core.js"));

var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}

function straightSeg(ax, ay, bx, by) {
    return { p0: [ax, ay], p1: [ax, ay], p2: [bx, by], p3: [bx, by] };
}

// ===== TEST: detectCorners =====
console.log("--- Core.detectCorners ---");
(function () {
    // Square 100x100 — 4 corners
    var sq = [
        straightSeg(0, 0, 100, 0), straightSeg(100, 0, 100, 100),
        straightSeg(100, 100, 0, 100), straightSeg(0, 100, 0, 0)
    ];
    var c1 = GM.Core.detectCorners(sq, true, 15);
    assert(c1.length === 4, "square has 4 corners (got " + c1.length + ")");

    // Triangle — 3 corners
    var tri = [
        straightSeg(0, 0, 100, 0), straightSeg(100, 0, 50, 80), straightSeg(50, 80, 0, 0)
    ];
    assert(GM.Core.detectCorners(tri, true, 15).length === 3, "triangle has 3 corners");

    // Circle (4 smooth Beziers) — 0 corners
    var k = 55.22847498;
    var circle = [
        { p0: [100, 0],  p1: [100, k],   p2: [k, 100],   p3: [0, 100] },
        { p0: [0, 100],  p1: [-k, 100],  p2: [-100, k],  p3: [-100, 0] },
        { p0: [-100, 0], p1: [-100, -k], p2: [-k, -100], p3: [0, -100] },
        { p0: [0, -100], p1: [k, -100],  p2: [100, -k],  p3: [100, 0] }
    ];
    assert(GM.Core.detectCorners(circle, true, 15).length === 0, "circle has 0 corners");

    // Open polyline — endpoints are corners by definition + 1 inner bend
    var open = [straightSeg(0, 0, 100, 0), straightSeg(100, 0, 100, 100)];
    var c4 = GM.Core.detectCorners(open, false, 15);
    assert(c4.length === 3, "open polyline: 2 endpoints + 1 bend (got " + c4.length + ")");
    assert(c4[0] === 0, "open: first anchor is a corner");
    assert(c4[c4.length - 1] === 2, "open: last anchor index = segment count");

    // Shallow bend below threshold is NOT a corner (deviation ~5.7° < 15°)
    var shallow = [straightSeg(0, 0, 100, 0), straightSeg(100, 0, 200, 10)];
    var c5 = GM.Core.detectCorners(shallow, false, 15);
    assert(c5.length === 2, "shallow bend below threshold ignored (endpoints only)");

    // 1-segment open path: both endpoints are corners
    var single = [straightSeg(0, 0, 100, 0)];
    var cs = GM.Core.detectCorners(single, false, 15);
    assert(cs.length === 2 && cs[0] === 0 && cs[1] === 1,
        "1-segment open path: both endpoints (got " + cs.length + ")");

    // 1-segment closed path: no crash (UI-layer concern, loose contract)
    var singleClosed = [{ p0: [100, 0], p1: [100, 55], p2: [55, 100], p3: [0, 100] }];
    var sc = GM.Core.detectCorners(singleClosed, true, 15);
    assert(sc.length === 0 || sc.length === 1, "1-segment closed: no crash, 0 or 1 corners");
})();

console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
if (fail > 0) process.exit(1);
