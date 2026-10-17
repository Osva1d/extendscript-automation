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

// Bezier approximation of a circular arc from angle a0 to a1 (radians;
// a1 < a0 runs clockwise) in `parts` equal pieces.
function arcSegs(cx, cy, r, a0, a1, parts) {
    var out = [], step = (a1 - a0) / parts;
    var k = 4 / 3 * Math.tan(Math.abs(step) / 4) * r * (step < 0 ? -1 : 1);
    for (var i = 0; i < parts; i++) {
        var s = a0 + i * step, e = s + step;
        var p0 = [cx + r * Math.cos(s), cy + r * Math.sin(s)];
        var p3 = [cx + r * Math.cos(e), cy + r * Math.sin(e)];
        out.push({ p0: p0, p1: [p0[0] - k * Math.sin(s), p0[1] + k * Math.cos(s)],
                   p2: [p3[0] + k * Math.sin(e), p3[1] - k * Math.cos(e)], p3: p3 });
    }
    return out;
}
// Rounded rectangle (0,0)-(w,h), radius r, counter-clockwise; arcs in `parts`
// pieces each. r = 0 gives a plain rectangle starting at (0,0).
function roundedRect(w, h, r, parts) {
    var P = Math.PI, s = [];
    s.push(straightSeg(r, 0, w - r, 0));
    if (r > 0) s = s.concat(arcSegs(w - r, r, r, -P / 2, 0, parts));
    s.push(straightSeg(w, r, w, h - r));
    if (r > 0) s = s.concat(arcSegs(w - r, h - r, r, 0, P / 2, parts));
    s.push(straightSeg(w - r, h, r, h));
    if (r > 0) s = s.concat(arcSegs(r, h - r, r, P / 2, P, parts));
    s.push(straightSeg(0, h - r, 0, r));
    if (r > 0) s = s.concat(arcSegs(r, r, r, P, 1.5 * P, parts));
    return s;
}
function reverseSegs(segs) {
    return segs.slice(0).reverse().map(function (s) { return { p0: s.p3, p1: s.p2, p2: s.p1, p3: s.p0 }; });
}

// The 1.2.0 entry point, kept for its regression tests: corner anchor
// indices -> arc distances, then placeAlong from distance 0.
function distributeOnCircuit(circuit, corners, zone, dist) {
    var anchorDist = [0];
    for (var a = 0; a < circuit.segments.length; a++) anchorDist.push(anchorDist[a] + circuit.segments[a].len);
    var cd = [];
    for (var c = 0; c < corners.length; c++) cd.push(anchorDist[corners[c]]);
    return GM.Core.placeAlong(circuit, cd, circuit.closed, zone, dist, 0);
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

// ===== TEST: distributeOnCircuit (test-local wrapper over placeAlong) =====
console.log("--- distributeOnCircuit (1.2.0 entry, test-local) ---");
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
    var marks = distributeOnCircuit(
        circuit, corners, zOff, { useNumber: false, number: 1, spacing: 200 });
    // Per side: corners + 1 interior at 200 -> 4 corners + 4 interiors = 8
    assert(marks.length === 8, "square spacing 200: 8 marks (got " + marks.length + ")");

    // Count mode on a cornered path = corners only, no span filling.
    var cornersOnly = distributeOnCircuit(
        circuit, corners, zOff, { useNumber: true, number: 99, spacing: 200 });
    assert(cornersOnly.length === 4,
        "square count mode: 4 marks = 4 corners (got " + cornersOnly.length + ")");
    var allAtCorners = true;
    for (var ci2 = 0; ci2 < cornersOnly.length; ci2++) {
        var x = cornersOnly[ci2][0], y = cornersOnly[ci2][1];
        var onCorner = (nearly(x, 0) || nearly(x, 400)) && (nearly(y, 0) || nearly(y, 400));
        if (!onCorner) allAtCorners = false;
    }
    assert(allAtCorners, "count mode marks sit exactly on the corners");
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
    var ringCount = distributeOnCircuit(
        cc, noCorners, zOff, { useNumber: true, number: 8, spacing: 0 });
    assert(ringCount.length === 8, "smooth ring count mode: exactly 8 (got " + ringCount.length + ")");
    var onR = true;
    for (var ri = 0; ri < ringCount.length; ri++) {
        var r = Math.sqrt(ringCount[ri][0] * ringCount[ri][0] + ringCount[ri][1] * ringCount[ri][1]);
        if (Math.abs(r - 100) > 0.5) onR = false;
    }
    assert(onR, "smooth ring: marks on the circle");

    // Smooth ring spacing mode: round(perimeter/B)
    var ringSp = distributeOnCircuit(
        cc, noCorners, zOff, { useNumber: false, number: 1, spacing: 157 });
    assert(ringSp.length === Math.round(cc.totalLen / 157),
        "smooth ring spacing mode: round(perimeter/spacing) (got " + ringSp.length + ")");

    // Cap: micro spacing must not freeze
    var capped = distributeOnCircuit(
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
    var triMarks = distributeOnCircuit(
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
    var openMarks = distributeOnCircuit(
        openC, openCorners, zOff, { useNumber: false, number: 1, spacing: 150 });
    var hasStart = false, hasEnd = false;
    for (var om = 0; om < openMarks.length; om++) {
        if (nearly(openMarks[om][0], 0) && nearly(openMarks[om][1], 0)) hasStart = true;
        if (nearly(openMarks[om][0], 300) && nearly(openMarks[om][1], 300)) hasEnd = true;
    }
    assert(hasStart && hasEnd, "open path: both endpoints marked");
})();

// ===== TEST: coincident anchors (review G6) =====
// A closed path whose last anchor repeats the first (PDF/DXF contours; kept as
// 5 pathPoints by Illustrator 30.8.1) has a zero-length closing segment. Its
// tangent is [0, 0], so the corner it sits on went undetected and got no mark.
console.log("--- Core.dropDegenerateSegments (G6) ---");
(function () {
    function nearly(a, b) { return Math.abs(a - b) < 1e-6; }
    function seg(a, b) { return { p0: a, p1: a, p2: b, p3: b }; }
    var W = 1000, H = 500;
    var rect = [seg([0, 0], [W, 0]), seg([W, 0], [W, H]), seg([W, H], [0, H]), seg([0, H], [0, 0])];
    var dup = rect.concat([seg([0, 0], [0, 0])]);

    var cleaned = GM.Core.dropDegenerateSegments(dup, GM.CONSTANTS.SEGMENT_EPS);
    assert(cleaned.length === 4, "zero-length closing segment dropped (got " + cleaned.length + ")");
    var corners = GM.Core.detectCorners(cleaned, true, GM.CONSTANTS.CORNER_ANGLE_MIN);
    assert(corners.length === 4, "all 4 corners detected (got " + corners.length + ")");
    var marks = distributeOnCircuit(GM.Core.buildCircuit(cleaned, true), corners,
        { enabled: false, count: 1, pitch: 0 }, { useNumber: false, number: 1, spacing: 300 });
    var pts = [[0, 0], [W, 0], [W, H], [0, H]], allCorners = true;
    for (var c = 0; c < 4; c++) {
        var hit = false;
        for (var m = 0; m < marks.length; m++) {
            if (nearly(marks[m][0], pts[c][0]) && nearly(marks[m][1], pts[c][1])) hit = true;
        }
        if (!hit) allCorners = false;
    }
    assert(allCorners, "every corner carries a mark");

    // A coincident pair in the middle of an edge is dropped too, the edge stays one span.
    var mid = [seg([0, 0], [500, 0]), seg([500, 0], [500, 0]), seg([500, 0], [W, 0])];
    assert(GM.Core.dropDegenerateSegments(mid, GM.CONSTANTS.SEGMENT_EPS).length === 2,
        "coincident anchors mid-edge dropped");

    // A loop (end on the start, handles pulled out) has length — it stays.
    var loop = [{ p0: [0, 0], p1: [100, 100], p2: [-100, 100], p3: [0, 0] }];
    assert(GM.Core.dropDegenerateSegments(loop, GM.CONSTANTS.SEGMENT_EPS).length === 1,
        "closed loop with extended handles is kept");

    // Clean input passes through unchanged.
    assert(GM.Core.dropDegenerateSegments(rect, GM.CONSTANTS.SEGMENT_EPS).length === 4,
        "clean rectangle unchanged");
})();

// ===== TEST: placeAlong (generalised distribution) =====
console.log("--- Core.placeAlong ---");
(function () {
    var zone = { enabled: false, count: 1, pitch: 0 };
    var sq = roundedRect(100, 100, 0, 1);
    var c = GM.Core.buildCircuit(sq, true);
    var dist = { useNumber: false, number: 1, spacing: 30 };
    var b = GM.Core.placeAlong(c, [0, 100, 200, 300], true, zone, dist, 0);
    assert(b.length === 12, "square 100, spacing 30: 12 marks (got " + b.length + ")");
    assert(b[0][0] === 0 && b[0][1] === 0, "the first mark is the start corner [0, 0] (got " + b[0] + ")");

    var lc = GM.Core.buildCircuit([straightSeg(0, 0, 300, 0)], false);
    var m = GM.Core.placeAlong(lc, [0, 300], false, zone, { useNumber: false, number: 1, spacing: 100 }, 0);
    assert(m.length === 4, "open run 300, spacing 100: 4 marks (got " + m.length + ")");
    var m2 = GM.Core.placeAlong(lc, [0, 300], false, zone, { useNumber: true, number: 7, spacing: 0 }, 0);
    assert(m2.length === 2, "count mode with corners: corners only (got " + m2.length + ")");

    // Closed, no corners: the ring starts at startDist
    var circ = GM.Core.buildCircuit(arcSegs(0, 0, 100, Math.PI / 4, Math.PI / 4 + 2 * Math.PI, 4), true);
    var top = GM.Core.topmostDist(circ);
    var tp = GM.Core.pointAtDistance(circ, top);
    assert(Math.abs(tp[1] - 100) < 0.05 && Math.abs(tp[0]) < 0.5,
        "topmostDist finds the top between anchors (got " + tp[0].toFixed(3) + ", " + tp[1].toFixed(3) + ")");
    var ring = GM.Core.placeAlong(circ, [], true, zone, { useNumber: true, number: 5, spacing: 0 }, top);
    assert(ring.length === 5, "5 marks on the ring");
    assert(Math.abs(ring[0][0]) < 0.5 && Math.abs(ring[0][1] - 100) < 0.05, "first mark at the top");
    var mirrored = true;
    for (var j = 1; j < ring.length; j++) {
        var hit = false;
        for (var k = 1; k < ring.length; k++) {
            if (Math.abs(ring[k][0] + ring[j][0]) < 0.5 && Math.abs(ring[k][1] - ring[j][1]) < 0.5) hit = true;
        }
        if (!hit) mirrored = false;
    }
    assert(mirrored, "odd count from the top is symmetric about the vertical axis");

    // Apex 0.01 rad before and after an anchor (review finding 1)
    [0.01, -0.01].forEach(function (off) {
        var cc = GM.Core.buildCircuit(arcSegs(0, 0, 100, off, off + 2 * Math.PI, 4), true);
        var p = GM.Core.pointAtDistance(cc, GM.Core.topmostDist(cc));
        assert(Math.abs(p[0]) < 0.05 && Math.abs(p[1] - 100) < 0.05,
            "apex near an anchor (offset " + off + "): got " + p[0].toFixed(3) + ", " + p[1].toFixed(3));
    });
    // Flat top: the middle, whichever way the path runs (review finding 2)
    var flat = roundedRect(200, 100, 20, 1);
    var pf = GM.Core.pointAtDistance(GM.Core.buildCircuit(flat, true), GM.Core.topmostDist(GM.Core.buildCircuit(flat, true)));
    var rflat = reverseSegs(flat);
    var pr = GM.Core.pointAtDistance(GM.Core.buildCircuit(rflat, true), GM.Core.topmostDist(GM.Core.buildCircuit(rflat, true)));
    assert(Math.abs(pf[0] - 100) < 1e-6 && Math.abs(pf[1] - 100) < 1e-9, "flat top CCW: middle (got " + pf[0] + ")");
    assert(Math.abs(pr[0] - 100) < 1e-6 && Math.abs(pr[1] - 100) < 1e-9, "flat top CW: middle (got " + pr[0] + ")");
})();

// ===== TEST: findCorners — sharp and rounded corners (spec §4, §5.2) =====
console.log("--- Core.findCorners ---");
(function () {
    function corners(segs, closed) {
        return GM.Core.findCorners(segs, closed, 15, GM.Core.buildCircuit(segs, closed));
    }
    var rr = roundedRect(1000, 500, 100, 1);
    var f = corners(rr, true);
    assert(f.sharp === 0 && f.round === 4, "rounded rectangle: 0 sharp, 4 rounded (got " + f.sharp + "/" + f.round + ")");
    var c = GM.Core.buildCircuit(rr, true), br = [900 + 100 * Math.SQRT1_2, 100 - 100 * Math.SQRT1_2], hit = false;
    for (var i = 0; i < f.dists.length; i++) {
        var p = GM.Core.pointAtDistance(c, f.dists[i]);
        if (Math.abs(p[0] - br[0]) < 0.05 && Math.abs(p[1] - br[1]) < 0.05) hit = true;
    }
    assert(hit, "the bottom-right mark sits mid-arc");
    var f2 = corners(roundedRect(1000, 500, 100, 2), true);
    assert(f2.sharp === 0 && f2.round === 4, "arcs in two pieces (Illustrator's offset output): 4 rounded");
    var f2r = corners(reverseSegs(roundedRect(1000, 500, 100, 2)), true);
    assert(f2r.round === 4, "clockwise rounded rectangle: 4 rounded");
    var f3 = corners(roundedRect(1000, 500, 0, 1), true);
    assert(f3.sharp === 4 && f3.round === 0, "plain rectangle: 4 sharp");
    var half = [straightSeg(-100, 0, 100, 0)].concat(arcSegs(0, 0, 100, 0, Math.PI, 2));
    var f4 = corners(half, true);
    assert(f4.sharp === 2 && f4.round === 0, "half circle: 2 sharp, the arc is a side (got " + f4.sharp + "/" + f4.round + ")");
    assert(corners(arcSegs(0, 0, 100, 0, 2 * Math.PI, 4), true).dists.length === 0, "circle: no corners");
    var house = [straightSeg(0, 0, 1000, 0), straightSeg(1000, 0, 1000, 600),
                 straightSeg(1000, 600, 500, 1000), straightSeg(500, 1000, 0, 600), straightSeg(0, 600, 0, 0)];
    var f6 = corners(house, true);
    assert(f6.sharp === 5 && f6.round === 0, "house: 5 sharp");

    // Open: straight + 30 deg arc + straight -> 2 ends + 1 rounded; 10 deg -> not a corner
    function bend(deg) {
        var a1 = -Math.PI / 2 + deg * Math.PI / 180;
        var arc = arcSegs(0, 1000, 1000, -Math.PI / 2, a1, 1);
        var e = arc[0].p3, t = [-Math.sin(a1), Math.cos(a1)];
        return [straightSeg(-200, 0, 0, 0)].concat(arc).concat([straightSeg(e[0], e[1], e[0] + 200 * t[0], e[1] + 200 * t[1])]);
    }
    var f7 = corners(bend(30), false);
    assert(f7.sharp === 2 && f7.round === 1, "open, 30 deg arc between straights: 2 ends + 1 rounded");
    var f8 = corners(bend(10), false);
    assert(f8.sharp === 2 && f8.round === 0, "open, 10 deg arc: no rounded corner");
    var tail = [straightSeg(-200, 0, 0, 0)].concat(arcSegs(0, 100, 100, -Math.PI / 2, 0, 1));
    assert(corners(tail, false).round === 0, "open path ending in an arc: the arc is not a corner");

    // Review focus 1: a quarter circle made of nine 10 deg line pieces (CAD PDF)
    var poly = [straightSeg(-300, 0, 0, 0)];
    for (var q = 0; q < 9; q++) {
        var s0 = -Math.PI / 2 + q * Math.PI / 18, s1 = s0 + Math.PI / 18;
        poly.push(straightSeg(100 * Math.cos(s0), 100 + 100 * Math.sin(s0), 100 * Math.cos(s1), 100 + 100 * Math.sin(s1)));
    }
    poly.push(straightSeg(100, 100, 100, 400));
    var f9 = corners(poly, false);
    assert(f9.round === 0 && f9.sharp === 2, "polyline arc (10 deg bends): no corner found — documented limitation");
})();

// ===== TEST: distance, inside, area, check (spec §7) =====
console.log("--- Core: distance / inside / area / checkMarks ---");
(function () {
    var sq = roundedRect(1000, 1000, 0, 1);
    var c = GM.Core.buildCircuit(sq, true);
    assert(Math.abs(GM.Core.distanceToCircuit(c, [500, 50]) - 50) < 1e-6, "distance to the nearest side");
    assert(Math.abs(GM.Core.distanceToCircuit(c, [-30, -40]) - 50) < 1e-6, "distance to a corner from outside");
    var circ = GM.Core.buildCircuit(arcSegs(0, 0, 500, 0, 2 * Math.PI, 4), true), worst = 0;
    for (var a = 0; a < 360; a += 7) {
        var q = [450 * Math.cos(a * Math.PI / 180), 450 * Math.sin(a * Math.PI / 180)];
        worst = Math.max(worst, Math.abs(GM.Core.distanceToCircuit(circ, q) - 50));
    }
    assert(worst < 0.2, "circle r 500: points on r 450 are 50 away (Bezier circle error ~0.14), worst " + worst.toFixed(4));
    var poly = GM.Core._samplePolygon(c);
    assert(GM.Core.pointInPolygon(poly, [500, 500]) === true, "centre inside");
    assert(GM.Core.pointInPolygon(poly, [500, -1]) === false, "below the square outside");
    assert(GM.Core.signedArea(c) > 0, "counter-clockwise: positive area");
    assert(GM.Core.signedArea(GM.Core.buildCircuit(reverseSegs(sq), true)) < 0, "clockwise: negative area");
    assert(Math.abs(GM.Core.nearestDistance(c, [500, -30]) - 500) < 1e-6, "nearest point 500 along the bottom side");

    assert(GM.Core.checkMarks([[50, 50], [500, 50], [950, 950]], c, 50, 0.5).ok === true, "marks 50 inside pass");
    assert(GM.Core.checkMarks([[0, 0], [500, 0]], c, 50, 0.5).ok === false, "marks on the cut line fail (offset returned the original)");
    var out = GM.Core.checkMarks([[500, -50]], c, 50, 0.5);
    assert(out.ok === false && out.reason === "outside", "a mark outside fails as outside");
    assert(GM.Core.checkMarks([], c, 50, 0.5).ok === true, "no marks, nothing to object to");
    assert(GM.Core._samplePolygon(GM.Core.buildCircuit(roundedRect(1000, 1000, 0, 1), true)).length === 5,
        "straight outline: one vertex per corner (+ closing repeat)");
    var cad = [];
    for (var v = 0; v < 360; v++) {
        var a0 = v * Math.PI / 180, a1 = (v + 1) * Math.PI / 180;
        cad.push(straightSeg(500 * Math.cos(a0), 500 * Math.sin(a0), 500 * Math.cos(a1), 500 * Math.sin(a1)));
    }
    assert(GM.Core._samplePolygon(GM.Core.buildCircuit(cad, true)).length === 361,
        "CAD outline of 360 line pieces: 361 vertices, not 23 041");
    assert(Math.abs(GM.Core.nearestDistance(c, [1030, 500]) - 1500) < 1e-6, "nearest point on the second side: 1500 along");
    var onCut = GM.Core.checkMarks([[500, 0]], c, 50, 0.5);
    assert(onCut.ok === false && onCut.reason === "distance" && Math.abs(onCut.worst - 50) < 1e-6,
        "mark on the bottom edge: distance failure, worst 50");
    var off10 = GM.Core.checkMarks([[500, 60]], c, 50, 0.5);
    assert(off10.ok === false && off10.reason === "distance" && Math.abs(off10.worst - 10) < 1e-6,
        "inside but 10 off the offset: distance failure");

    // N1 (Task 10, S11b): the check measures to the cut line's sample chords,
    // which sit inside the curve by their sagitta — on a 4-anchor circle of
    // r 2.4 m about 0.5 pt, enough to refuse a correct offset.
    assert(GM.Core._chordSagitta(c) < 1e-9, "straight square: chords are the outline, sagitta ~0, got " + GM.Core._chordSagitta(c));
    var R = 6803, D = 56.69;                         // r 2400 mm, D 20 mm
    var big = GM.Core.buildCircuit(arcSegs(0, 0, R, 0, 2 * Math.PI, 4), true);
    var sag = GM.Core._chordSagitta(big);
    assert(sag > 0.45 && sag < 0.6, "4-arc circle r 6803: largest chord sagitta ~0.5, got " + sag.toFixed(4));
    // Marks exactly D inside the cut line itself, along its normal, as
    // Illustrator's offset puts them. (A true inset circle would not do: the
    // 4-arc Bezier circle bulges up to 1.85 pt beyond r.)
    function inside(dist) {
        var out = [];
        for (var m = 0; m < 300; m++) {
            var sgm = big.segments[m % 4].seg, t = (Math.floor(m / 4) + 0.5) / 75;
            var p = GM.Core.bezierPoint(sgm, t), p2 = GM.Core.bezierPoint(sgm, t + 1e-6);
            var tx = p2[0] - p[0], ty = p2[1] - p[1], tl = Math.sqrt(tx * tx + ty * ty);
            out.push([p[0] - ty / tl * dist, p[1] + tx / tl * dist]);   // left normal = inside (counter-clockwise)
        }
        return out;
    }
    var bigChk = GM.Core.checkMarks(inside(D), big, D, 0.5);
    assert(bigChk.worst > 0.5, "the 2.4 m circle needs the allowance: worst measured " + bigChk.worst.toFixed(3) + " > tol 0.5");
    assert(bigChk.ok === true, "marks exactly D inside a 2.4 m circle pass (worst measured " +
        bigChk.worst.toFixed(3) + ", reason '" + bigChk.reason + "')");
    // The allowance is bounded from above: marks deeper than D by more than
    // tol + sagitta (0.5 + 0.556 = 1.056 here) still fail on distance.
    [3, 1.3].forEach(function (extra) {
        var deep = GM.Core.checkMarks(inside(D + extra), big, D, 0.5);
        assert(deep.ok === false && deep.reason === "distance",
            "marks " + extra + " pt deeper than D on the 2.4 m circle fail on distance (worst " +
            deep.worst.toFixed(3) + ", reason '" + deep.reason + "')");
    });
    var onBig = [];
    for (var k = 0; k < 40; k++) onBig.push(GM.Core.pointAtDistance(big, k * big.totalLen / 40 + 1));
    var onBigChk = GM.Core.checkMarks(onBig, big, D, 0.5);
    assert(onBigChk.ok === false && onBigChk.reason === "outside",
        "marks on the 2.4 m cut line itself fail as outside (collapse caught), reason '" + onBigChk.reason + "'");
    // The sagitta is worked out only when the check needs it: CAD outlines of
    // many line pieces cost 260-310 ms for it in the engine (2026-10-13).
    var small = GM.Core.buildCircuit(arcSegs(0, 0, 500, 0, 2 * Math.PI, 4), true);
    assert(GM.Core.checkMarks([[450, 0], [0, 450], [-450, 0]], small, 50, 0.5).ok === true &&
        small._sagitta === undefined, "a check within tol leaves the sagitta uncomputed");
})();

// ===== TEST: inner corners (acceptance test 2026-10-17) =====
console.log("--- Core: checkMarks at an inner corner ---");
(function () {
    // L shape, counter-clockwise; its inner (reflex) corner is (300, 300).
    var Lsh = [straightSeg(0, 0, 600, 0), straightSeg(600, 0, 600, 300), straightSeg(600, 300, 300, 300),
               straightSeg(300, 300, 300, 600), straightSeg(300, 600, 0, 600), straightSeg(0, 600, 0, 0)];
    var c = GM.Core.buildCircuit(Lsh, true), D = 20;
    var anchors = Lsh.map(function (sg) { return sg.p0; });
    // Illustrator's mitred offset: the eyelet line's inner corner is D from
    // both edges, D * sqrt(2) from the corner point itself.
    var marks = [[20, 20], [580, 20], [580, 280], [280, 280], [280, 580], [20, 580]];
    var chk = GM.Core.checkMarks(marks, c, D, 0.5, anchors);
    assert(chk.ok === true, "L shape: the inner-corner mark (D * sqrt 2 from the corner point) passes (reason '" +
        chk.reason + "', worst " + chk.worst + ")");
    assert(GM.Core.checkMarks(marks, c, D, 0.5).ok === false, "without the anchors the inner corner is a wrong distance");
    assert(GM.Core.checkMarks([[300, 300], [450, 300]], c, D, 0.5, anchors).ok === false, "marks on the cut line still fail (collapse)");
    var tooFar = GM.Core.checkMarks([[240, 240]], c, D, 0.5, anchors);
    assert(tooFar.ok === false && tooFar.reason === "distance", "farther than the miter limit (4 D) from the corner point: fails");
    var tooClose = GM.Core.checkMarks([[290, 290]], c, D, 0.5, anchors);
    assert(tooClose.ok === false && tooClose.reason === "distance", "closer than D to the corner point: fails");
    // A convex outline keeps the strict rule: a units mistake (3 D in) is caught.
    var sq = roundedRect(1000, 1000, 0, 1), sc = GM.Core.buildCircuit(sq, true);
    var wrong = GM.Core.checkMarks([[150, 150], [850, 150], [850, 850], [150, 850]], sc, 50, 0.5,
        sq.map(function (sg) { return sg.p0; }));
    assert(wrong.ok === false && wrong.reason === "distance", "square: corner marks 3 D in still fail with the anchors given");
})();

// ===== TEST: part of the outline (spec §5.4) =====
console.log("--- Core: selectedRuns / mapRun / runCorners ---");
(function () {
    function flagged(segs, flags) {
        return segs.map(function (s, i) { return { p0: s.p0, p1: s.p1, p2: s.p2, p3: s.p3, sel: flags[i] }; });
    }
    var sq = roundedRect(1000, 1000, 0, 1), c = GM.Core.buildCircuit(sq, true);
    var r1 = GM.Core.selectedRuns(flagged(sq, [true, true, false, false]), true, c);
    assert(r1.length === 1 && Math.abs(r1[0].from) < 1e-6 && Math.abs(r1[0].len - 2000) < 1e-6 && r1[0].segs === 2, "two adjacent sides: one run 0+2000");
    assert(GM.Core.selectedRuns(flagged(sq, [true, false, true, false]), true, c).length === 2, "opposite sides: two runs");
    var r3 = GM.Core.selectedRuns(flagged(sq, [true, false, false, true]), true, c);
    assert(r3.length === 1 && Math.abs(r3[0].from - 3000) < 1e-6 && Math.abs(r3[0].len - 2000) < 1e-6, "run across the first anchor stays whole (from 3000)");
    assert(GM.Core.selectedRuns(flagged(sq, [true, true, true, true]), true, c).length === 0, "all selected: whole outline");
    assert(GM.Core.selectedRuns(flagged(sq, [false, false, false, false]), true, c).length === 0, "none selected: whole outline");

    // Eyelet line = square inset by 50, counter-clockwise and clockwise
    var inset = [straightSeg(50, 50, 950, 50), straightSeg(950, 50, 950, 950),
                 straightSeg(950, 950, 50, 950), straightSeg(50, 950, 50, 50)];
    var ccw = GM.Core.buildCircuit(inset, true);
    var m1 = GM.Core.mapRun(c, { from: 0, len: 1000 }, ccw);
    assert(Math.abs(m1.from) < 1e-6 && Math.abs(m1.len - 900) < 1e-6, "bottom side -> inset bottom 0+900");
    var cw = GM.Core.buildCircuit(reverseSegs(inset), true);
    var m2 = GM.Core.mapRun(c, { from: 0, len: 1000 }, cw);
    var a = GM.Core.pointAtDistance(cw, m2.from), b = GM.Core.pointAtDistance(cw, m2.from + m2.len);
    assert(Math.abs(m2.len - 900) < 1e-6 && Math.abs(a[1] - 50) < 1e-6 && Math.abs(b[1] - 50) < 1e-6,
        "clockwise eyelet line: the run still covers the bottom (len " + m2.len + ")");

    var rc = GM.Core.runCorners([0, 900, 1800, 2700], { from: 0, len: 900 }, 3600);
    assert(rc.length === 2 && rc[0] === 0 && rc[1] === 900, "run between two corners: just its ends");
    var rw = GM.Core.runCorners([0, 900, 1800, 2700], { from: 2700, len: 1800 }, 3600);
    assert(rw.length === 3 && rw[1] === 3600 && rw[2] === 4500, "run across the start: inner corner unwrapped to 3600");
    // Corner arc of R 5 collapses into the corner of an eyelet line inset by 50
    var rr5 = roundedRect(1000, 1000, 5, 1), c5 = GM.Core.buildCircuit(rr5, true);
    var line5 = GM.Core.buildCircuit(inset, true);
    var onlyArc = GM.Core.selectedRuns(flagged(rr5, [false, true, false, false, false, false, false, false]), true, c5);
    var mArc = GM.Core.mapRun(c5, onlyArc[0], line5);
    var pArc = GM.Core.pointAtDistance(line5, mArc.from);
    assert(mArc.len === 0 && Math.abs(pArc[0] - 950) < 1e-6 && Math.abs(pArc[1] - 50) < 1e-6,
        "only the collapsed corner arc: a single point at the eyelet corner (len " + mArc.len + ")");
    var allButArc = GM.Core.selectedRuns(flagged(rr5, [true, false, true, true, true, true, true, true]), true, c5);
    var mAll = GM.Core.mapRun(c5, allButArc[0], line5);
    assert(Math.abs(mAll.len - line5.totalLen) < 1e-6, "everything but that arc: the whole eyelet loop (len " + mAll.len + ")");
    var one = GM.Core.placeAlong(line5, GM.Core.runCorners([0, 900, 1800, 2700], mArc, line5.totalLen), false,
        { enabled: false, count: 1, pitch: 0 }, { useNumber: false, number: 1, spacing: 100 }, 0);
    assert(one.length === 1, "a single-point run gives one mark (got " + one.length + ")");
})();

// ===== TEST: findCorners — run across the start, sharp anchor inside a run (Task 2 review) =====
console.log("--- Core.findCorners: wrap and split ---");
(function () {
    function corners(segs, closed) {
        return GM.Core.findCorners(segs, closed, GM.CONSTANTS.CORNER_ANGLE_MIN, GM.Core.buildCircuit(segs, closed));
    }
    // Closed path that starts in the middle of the bottom-right arc
    var rr = roundedRect(1000, 500, 100, 2);
    var rot = rr.slice(2).concat(rr.slice(0, 2));
    var f = corners(rot, true), c = GM.Core.buildCircuit(rot, true);
    assert(f.sharp === 0 && f.round === 4, "arc split across the start: still 4 rounded (got " + f.sharp + "/" + f.round + ")");
    var br = [900 + 100 * Math.SQRT1_2, 100 - 100 * Math.SQRT1_2], hit = false;
    for (var i = 0; i < f.dists.length; i++) {
        var p = GM.Core.pointAtDistance(c, f.dists[i]);
        if (Math.abs(p[0] - br[0]) < 0.05 && Math.abs(p[1] - br[1]) < 0.05) hit = true;
    }
    assert(hit, "the arc across the start keeps its mid-arc mark");

    // Open: straight, 30 deg arc, sharp 40 deg kink, 30 deg arc, straight
    var R = 100, d2r = Math.PI / 180;
    var arc1 = arcSegs(0, R, R, -90 * d2r, -60 * d2r, 1), e1 = arc1[0].p3;
    var th = 70 * d2r;                                   // 30 deg end tangent + 40 deg kink
    var c2 = [e1[0] - R * Math.sin(th), e1[1] + R * Math.cos(th)];
    var arc2 = arcSegs(c2[0], c2[1], R, th - 90 * d2r, th - 60 * d2r, 1), e2 = arc2[0].p3;
    var t2 = 100 * d2r;
    var kinked = [straightSeg(-200, 0, 0, 0)].concat(arc1).concat(arc2)
        .concat([straightSeg(e2[0], e2[1], e2[0] + 200 * Math.cos(t2), e2[1] + 200 * Math.sin(t2))]);
    var g = corners(kinked, false);
    assert(g.sharp === 3 && g.round === 0, "sharp kink inside a curved run: 3 sharp, no rounded (got " + g.sharp + "/" + g.round + ")");
})();

console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
if (fail > 0) process.exit(1);
