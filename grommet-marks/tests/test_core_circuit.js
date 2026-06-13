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

// ===== TEST: distributeOnSpan =====
console.log("--- Core.distributeOnSpan ---");
(function () {
    function nearly(a, b) { return Math.abs(a - b) < 1e-6; }
    var zOff = { enabled: false, count: 5, pitch: 100 };

    // Count mode: endpoints included, even pitch
    var pos = GM.Core.distributeOnSpan(900, zOff, { useNumber: true, number: 4, spacing: 0 });
    assert(pos.length === 4, "count mode: 4 marks (got " + pos.length + ")");
    assert(nearly(pos[0], 0) && nearly(pos[3], 900), "count mode: endpoints included");
    assert(nearly(pos[1], 300), "count mode: even pitch");

    // Count mode: single mark
    var pos1 = GM.Core.distributeOnSpan(900, zOff, { useNumber: true, number: 1, spacing: 0 });
    assert(pos1.length === 1 && nearly(pos1[0], 0), "count mode: single mark at start");

    // REGRESSION EQUIVALENCE vs legacy calcPositions — spacing mode, sweep
    // legacy(edgeCfg, span, offset, unitFactor) places at startOff + i*spc;
    // modern must equal legacy minus the offset shift, for many inputs.
    var eqAll = true, eqDetail = "";
    var spans = [1000, 953.7, 300, 120.5, 50];
    var offsets = [0, 50, 10.25];
    var spacings = [300, 105, 97.3, 33.33];
    for (var s = 0; s < spans.length; s++) {
        for (var o = 0; o < offsets.length; o++) {
            for (var p = 0; p < spacings.length; p++) {
                var span = spans[s], off = offsets[o], spc = spacings[p];
                var avail = span - 2 * off;
                if (avail < 0) avail = 0;
                var legacy = GM.Core.calcPositions(
                    { useNumber: false, number: 1, spacing: spc }, span, off, 1);
                var modern = GM.Core.distributeOnSpan(
                    avail, zOff, { useNumber: false, number: 1, spacing: spc });
                if (legacy.length !== modern.length) {
                    eqAll = false;
                    eqDetail = "len mismatch span=" + span + " off=" + off + " spc=" + spc +
                        " legacy=" + legacy.length + " modern=" + modern.length;
                } else {
                    for (var i = 0; i < legacy.length; i++) {
                        if (!nearly(legacy[i], modern[i] + off)) {
                            eqAll = false;
                            eqDetail = "pos mismatch span=" + span + " off=" + off + " spc=" + spc + " i=" + i;
                        }
                    }
                }
            }
        }
    }
    assert(eqAll, "legacy equivalence sweep (" + eqDetail + ")");

    // Count-mode equivalence sweep
    var eqCnt = true;
    var counts = [1, 2, 5, 10];
    for (var c = 0; c < counts.length; c++) {
        var lg = GM.Core.calcPositions({ useNumber: true, number: counts[c], spacing: 0 }, 1000, 50, 1);
        var md = GM.Core.distributeOnSpan(900, zOff, { useNumber: true, number: counts[c], spacing: 0 });
        if (lg.length !== md.length) eqCnt = false;
        else for (var ci = 0; ci < lg.length; ci++) {
            if (!nearly(lg[ci], md[ci] + 50)) eqCnt = false;
        }
    }
    assert(eqCnt, "legacy count-mode equivalence");

    // Zones ON: L=1000, N=3, A=100 -> 0,100,200 + 800,900,1000 + middle
    var zOn = { enabled: true, count: 3, pitch: 100 };
    var pz = GM.Core.distributeOnSpan(1000, zOn, { useNumber: false, number: 1, spacing: 300 });
    assert(nearly(pz[0], 0) && nearly(pz[1], 100) && nearly(pz[2], 200), "zone marks from start");
    var last = pz.length - 1;
    assert(nearly(pz[last], 1000) && nearly(pz[last - 1], 900), "zone marks from end");
    // Middle: M = 600, preferred 300 -> 2 gaps -> 1 interior at 500
    assert(pz.length === 7, "zones+middle total (got " + pz.length + ")");
    assert(nearly(pz[3], 500), "middle interior mark centered");

    // Degradation: L=300 < 2*(3-1)*100=400 -> 0,100,200,300 via mirror+dedup
    var pd = GM.Core.distributeOnSpan(300, zOn, { useNumber: false, number: 1, spacing: 300 });
    assert(pd.length === 4, "short span degradation count (got " + pd.length + ")");
    assert(nearly(pd[1], 100) && nearly(pd[2], 200), "short span symmetric positions");

    // Exact fit: L = 2*(N-1)*A -> zones touch, no middle
    var pf = GM.Core.distributeOnSpan(400, zOn, { useNumber: false, number: 1, spacing: 300 });
    // L == 2*zoneLen satisfies the >= L degradation guard, so this exercises
    // the degradation path (still 5 marks: 0,100,200,300,400).
    assert(pf.length === 5, "exact-fit triggers degradation L==2*zoneLen (got " + pf.length + ")");

    // Middle smaller than preferred: L=500 -> M=100 < 300 -> no interior
    var pm = GM.Core.distributeOnSpan(500, zOn, { useNumber: false, number: 1, spacing: 300 });
    assert(pm.length === 6, "no interior when middle < preferred (got " + pm.length + ")");

    // Zone count 1 = just corner marks + middle fill
    var z1 = { enabled: true, count: 1, pitch: 100 };
    var p1m = GM.Core.distributeOnSpan(600, z1, { useNumber: false, number: 1, spacing: 300 });
    assert(nearly(p1m[0], 0) && nearly(p1m[p1m.length - 1], 600), "count-1 zone keeps endpoints");

    // L=0 degenerate
    var pz0 = GM.Core.distributeOnSpan(0, zOn, { useNumber: false, number: 1, spacing: 300 });
    assert(pz0.length === 1 && nearly(pz0[0], 0), "zero-length span: single mark");
})();

// ===== TEST: distributeOnCircuit =====
console.log("--- Core.distributeOnCircuit ---");
(function () {
    function nearly(a, b, eps) { return Math.abs(a - b) < (eps || 1e-3); }
    var zOff = { enabled: false, count: 5, pitch: 100 };

    // Square 400x400 perimeter 1600, corners mandatory, spacing 200
    var sq = [
        { p0: [0, 0], p1: [0, 0], p2: [400, 0], p3: [400, 0] },
        { p0: [400, 0], p1: [400, 0], p2: [400, 400], p3: [400, 400] },
        { p0: [400, 400], p1: [400, 400], p2: [0, 400], p3: [0, 400] },
        { p0: [0, 400], p1: [0, 400], p2: [0, 0], p3: [0, 0] }
    ];
    var circuit = GM.Core.buildCircuit(sq, true);
    var corners = GM.Core.detectCorners(sq, true, 15);
    var marks = GM.Core.distributeOnCircuit(
        circuit, corners, zOff, { useNumber: false, number: 1, spacing: 200 });
    // Per side: corners + 1 interior at 200 -> 4 corners + 4 interiors = 8
    assert(marks.length === 8, "square spacing 200: 8 marks (got " + marks.length + ")");
    var hasCorner = false, hasMid = false;
    for (var i = 0; i < marks.length; i++) {
        if (nearly(marks[i][0], 0) && nearly(marks[i][1], 0)) hasCorner = true;
        if (nearly(marks[i][0], 200) && nearly(marks[i][1], 0)) hasMid = true;
    }
    assert(hasCorner, "square: corner mark present");
    assert(hasMid, "square: mid-edge mark present");

    // Corner is placed exactly once despite being shared by two spans (dedup)
    var cornerHits = 0;
    for (var ch = 0; ch < marks.length; ch++) {
        if (nearly(marks[ch][0], 400) && nearly(marks[ch][1], 0)) cornerHits++;
    }
    assert(cornerHits === 1, "shared corner placed once (dedup)");

    // Smooth closed circle: count mode, exactly N evenly
    var k = 55.22847498;
    var circle = [
        { p0: [100, 0],  p1: [100, k],   p2: [k, 100],   p3: [0, 100] },
        { p0: [0, 100],  p1: [-k, 100],  p2: [-100, k],  p3: [-100, 0] },
        { p0: [-100, 0], p1: [-100, -k], p2: [-k, -100], p3: [0, -100] },
        { p0: [0, -100], p1: [k, -100],  p2: [100, -k],  p3: [100, 0] }
    ];
    var cc = GM.Core.buildCircuit(circle, true);
    var noCorners = GM.Core.detectCorners(circle, true, 15);
    var ringCount = GM.Core.distributeOnCircuit(
        cc, noCorners, zOff, { useNumber: true, number: 8, spacing: 0 });
    assert(ringCount.length === 8, "smooth ring count mode: exactly 8 (got " + ringCount.length + ")");
    var onR = true;
    for (var ri = 0; ri < ringCount.length; ri++) {
        var r = Math.sqrt(ringCount[ri][0] * ringCount[ri][0] + ringCount[ri][1] * ringCount[ri][1]);
        if (Math.abs(r - 100) > 0.5) onR = false;
    }
    assert(onR, "smooth ring: marks on the circle");

    // Smooth ring spacing mode: round(perimeter/B)
    var ringSp = GM.Core.distributeOnCircuit(
        cc, noCorners, zOff, { useNumber: false, number: 1, spacing: 157 });
    assert(ringSp.length === Math.round(cc.totalLen / 157),
        "smooth ring spacing mode: round(perimeter/spacing) (got " + ringSp.length + ")");

    // Cap: micro spacing must not freeze
    var capped = GM.Core.distributeOnCircuit(
        cc, noCorners, zOff, { useNumber: false, number: 1, spacing: 0.0001 });
    assert(capped.length <= GM.CONSTANTS.MAX_MARKS, "MAX_MARKS cap holds (got " + capped.length + ")");

    // Triangle with zones ON: each corner gets a mark + zone densification
    var tri = [
        { p0: [0, 0], p1: [0, 0], p2: [600, 0], p3: [600, 0] },
        { p0: [600, 0], p1: [600, 0], p2: [300, 500], p3: [300, 500] },
        { p0: [300, 500], p1: [300, 500], p2: [0, 0], p3: [0, 0] }
    ];
    var triC = GM.Core.buildCircuit(tri, true);
    var triCorners = GM.Core.detectCorners(tri, true, 15);
    assert(triCorners.length === 3, "triangle 3 corners precheck");
    var zOn = { enabled: true, count: 3, pitch: 50 };
    var triMarks = GM.Core.distributeOnCircuit(
        triC, triCorners, zOn, { useNumber: false, number: 1, spacing: 200 });
    // Each of 3 corners present exactly once
    var triCornerOk = true;
    var triCornerPts = [[0,0],[600,0],[300,500]];
    for (var tc = 0; tc < 3; tc++) {
        var hits = 0;
        for (var tm = 0; tm < triMarks.length; tm++) {
            if (nearly(triMarks[tm][0], triCornerPts[tc][0]) && nearly(triMarks[tm][1], triCornerPts[tc][1])) hits++;
        }
        if (hits !== 1) triCornerOk = false;
    }
    assert(triCornerOk, "triangle: each corner placed exactly once with zones on");

    // Open path (corners include endpoints): marks span end to end, no wrap span
    var openSegs = [
        { p0: [0, 0], p1: [0, 0], p2: [300, 0], p3: [300, 0] },
        { p0: [300, 0], p1: [300, 0], p2: [300, 300], p3: [300, 300] }
    ];
    var openC = GM.Core.buildCircuit(openSegs, false);
    var openCorners = GM.Core.detectCorners(openSegs, false, 15);
    var openMarks = GM.Core.distributeOnCircuit(
        openC, openCorners, zOff, { useNumber: false, number: 1, spacing: 150 });
    var hasStart = false, hasEnd = false;
    for (var om = 0; om < openMarks.length; om++) {
        if (nearly(openMarks[om][0], 0) && nearly(openMarks[om][1], 0)) hasStart = true;
        if (nearly(openMarks[om][0], 300) && nearly(openMarks[om][1], 300)) hasEnd = true;
    }
    assert(hasStart && hasEnd, "open path: both endpoints marked");
})();

console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
if (fail > 0) process.exit(1);
