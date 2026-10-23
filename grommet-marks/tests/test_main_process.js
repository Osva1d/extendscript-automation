#!/usr/bin/env node
/**
 * GM.Main.process() Test Suite
 * Artboard/path placement end to end, against a fake DOM adapter that records
 * every mark instead of drawing it. No other suite loads main.js, so the
 * artboard math (offsets, mirrors, edges, artboards) is covered only here.
 *
 * Usage: node tests/test_main_process.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
global.app = { locale: "en_US" };
var alerts = [];
global.alert = function (m) { alerts.push(String(m)); };
global.$ = { writeln: function () {} };

var GM = {};

// ===== LOAD PRODUCTION CODE =====
// eval at top-level scope so the modules' `GM` resolves to the GM above.
function src(rel) { return fs.readFileSync(path.join(__dirname, "..", "src", rel), "utf8"); }
eval(src("constants.js"));
eval(src("locale.js"));
eval(src("lib/utils.js"));
eval(src("config.js"));
eval(src("lib/validation.js"));
require("./lib/load_shared.js")(GM, ["numbers"]);   // shared: GM.Numbers
eval(src("core.js"));
// main.js ends with the auto-run call; drop it so the suite drives process().
var mainSrc = src("main.js");
var runCall = /GM\.Main\.run\(\);\s*$/;
if (!runCall.test(mainSrc)) throw new Error("main.js no longer ends with GM.Main.run(); — update this suite");
eval(mainSrc.replace(runCall, ""));

// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}
function near(a, b, eps) { return Math.abs(a - b) < (eps || 1e-6); }

// ===== FAKE DOM ADAPTER =====
var MM = GM.CONSTANTS.UNIT_FACTORS.mm;

/**
 * Installs a fake GM.Illustrator and returns the recorder.
 * @param {Object} o - {artboards: [[l,t,r,b]...], scaleFactor, pathInfo, offsetPath, existing}
 */
function fakeDoc(o) {
    var rec = { marks: [], layer: { locked: false, visible: true }, layerCalls: 0 };
    var doc = { artboards: [] };
    for (var i = 0; i < o.artboards.length; i++) doc.artboards.push({ artboardRect: o.artboards[i] });
    if (o.scaleFactor !== undefined) doc.scaleFactor = o.scaleFactor;
    GM.Illustrator = {
        doc: doc,
        getOrCreateLayer: function () { rec.layerCalls++; return rec.layer; },
        placeMarkGroup: function (layer, x, y, size, opts) {
            rec.marks.push({ x: x, y: y, size: size, opts: opts });
            return true;
        },
        getSelectedPathInfo: function () { return o.pathInfo || { ok: false, reason: "no-selection" }; },
        offsetPath: o.offsetPath || function () { throw new Error("offsetPath not expected"); },
        getDocInfo: function () { return { artboards: 1, width: 100, height: 100, scale: 1 }; },
        itemCentres: function () { return o.existing || []; }
    };
    return rec;
}
function settings(over) {
    var s = GM.Config.getDefaults();
    for (var k in over) if (over.hasOwnProperty(k)) s[k] = over[k];
    return s;
}
function cornerMark(rec, x, y) {
    for (var i = 0; i < rec.marks.length; i++) {
        if (near(rec.marks[i].x, x, 1e-6) && near(rec.marks[i].y, y, 1e-6)) return rec.marks[i];
    }
    return null;
}
function seg(a, b) { return { p0: a, p1: a, p2: b, p3: b }; }
function squareSegs(a, b) {
    return [seg([a, a], [b, a]), seg([b, a], [b, b]), seg([b, b], [a, b]), seg([a, b], [a, a])];
}
function pathInfoOf(segs, closed, partial) {
    var circuit = GM.Core.buildCircuit(segs, closed);
    var f = GM.Core.findCorners(segs, closed, GM.CONSTANTS.CORNER_ANGLE_MIN, circuit);
    return { ok: true, circuit: circuit,
             corners: GM.Core.detectCorners(segs, closed, GM.CONSTANTS.CORNER_ANGLE_MIN),
             closed: closed, cornerCount: f.dists.length, sharpCount: f.sharp, roundCount: f.round,
             cornerDists: f.dists, segments: segs, partial: partial || { state: "none", runs: [] },
             pointSel: [], totalLen: circuit.totalLen, pathRef: {} };
}
function squarePathInfo(side) { return pathInfoOf(squareSegs(0, side), true); }
function pathCfg(over) {
    var s = settings({ placementMode: "path", pathDist: { useNumber: false, number: 24, spacing: 100 } });
    for (var k in over) if (over.hasOwnProperty(k)) s[k] = over[k];
    return s;
}

// ===== TEST: artboard placement, standard document =====
console.log("--- process: artboard edges, standard document ---");
(function () {
    var rec = fakeDoc({ artboards: [[0, 300 * MM, 300 * MM, 0]] });
    alerts = [];
    GM.Main.process(settings({}));
    assert(rec.marks.length === 36, "defaults: 4 edges x 10 - 4 shared corners = 36 (got " + rec.marks.length + ")");
    var m = cornerMark(rec, 7 * MM, 293 * MM);
    assert(!!m, "top-left mark 7 mm from both edges");
    assert(m && near(m.size, 3 * MM), "mark diameter 3 mm");
    assert(m && m.opts.regWeight === 1 && m.opts.haloWeight === 3, "stroke weights 1 / 3 pt");
    assert(alerts.length === 0, "no alert (got " + alerts.join(" | ") + ")");
})();

// ===== TEST: Large Canvas (review G1) =====
// A Large Canvas document stores geometry at 1/scaleFactor. A 300 mm artboard
// is 30 mm in document units; every value written must be divided by 10 or it
// comes out ten times too large (measured in Illustrator 30.8.1).
console.log("--- process: Large Canvas divides by scaleFactor (G1) ---");
(function () {
    var rec = fakeDoc({ artboards: [[0, 30 * MM, 30 * MM, 0]], scaleFactor: 10 });
    alerts = [];
    GM.Main.process(settings({}));
    assert(rec.marks.length === 36, "same layout as the standard document (got " + rec.marks.length + ")");
    var m = cornerMark(rec, 0.7 * MM, 29.3 * MM);
    assert(!!m, "top-left mark 7 mm (0.7 doc mm) from both edges");
    assert(m && near(m.size, 0.3 * MM), "mark diameter 3 mm (0.3 doc mm), got " + (m && m.size / MM));
    assert(m && near(m.opts.regWeight, 0.1) && near(m.opts.haloWeight, 0.3),
        "stroke weights 1 / 3 pt physical (0.1 / 0.3 doc pt)");

    // Path mode: spacing converts the same way. A 100 mm square (10 doc mm)
    // with 50 mm spacing gets 3 marks per side = 8; unscaled spacing would
    // leave the corners only.
    var rec2 = fakeDoc({ artboards: [[0, 30 * MM, 30 * MM, 0]], scaleFactor: 10,
                         pathInfo: squarePathInfo(10 * MM) });
    GM.Main.process(settings({ placementMode: "path",
        pathDist: { useNumber: false, number: 24, spacing: 50 } }));
    assert(rec2.marks.length === 8, "path spacing scaled: 8 marks (got " + rec2.marks.length + ")");
})();

// ===== TEST: target layer state (review G5) =====
// Writing into a hidden layer needs it visible. Restoring "hidden" afterwards
// left the new marks invisible and unprinted with no message; the lock is
// still restored.
console.log("--- process: hidden target layer stays visible (G5) ---");
(function () {
    var rec = fakeDoc({ artboards: [[0, 300 * MM, 300 * MM, 0]] });
    rec.layer.locked = true; rec.layer.visible = false;
    alerts = [];
    GM.Main.process(settings({}));
    assert(rec.marks.length === 36, "marks placed into the hidden, locked layer");
    assert(rec.layer.visible === true, "layer left visible");
    assert(rec.layer.locked === true, "lock restored");
    assert(alerts.length === 1 && alerts[0].indexOf(GM.CONSTANTS.LAYER_NAME) >= 0,
        "one warning naming the layer (got " + alerts.join(" | ") + ")");

    var rec2 = fakeDoc({ artboards: [[0, 300 * MM, 300 * MM, 0]] });
    rec2.layer.locked = true; rec2.layer.visible = true;
    alerts = [];
    GM.Main.process(settings({}));
    assert(rec2.layer.visible === true && rec2.layer.locked === true, "visible locked layer: state unchanged");
    assert(alerts.length === 0, "no warning for a visible layer (got " + alerts.join(" | ") + ")");
})();

// ===== TEST: marks landing on existing marks (review G4) =====
// A second run adds a second set on top of the first. Nothing is removed (that
// would be a new feature), but the run must not stay silent about it.
console.log("--- process: overlap with existing marks is reported (G4) ---");
(function () {
    function dupMsg(n) {
        return GM.L.WARN_DUPLICATE_MARKS
            ? GM.L.WARN_PREFIX + GM.L.format(GM.L.WARN_DUPLICATE_MARKS, n)
            : "(WARN_DUPLICATE_MARKS missing)";
    }
    var ab = [0, 300 * MM, 300 * MM, 0];
    var first = fakeDoc({ artboards: [ab] });
    GM.Main.process(settings({}));
    var previous = [];
    for (var i = 0; i < first.marks.length; i++) previous.push([first.marks[i].x, first.marks[i].y]);

    var rerun = fakeDoc({ artboards: [ab], existing: previous });
    alerts = [];
    GM.Main.process(settings({}));
    assert(rerun.marks.length === 36, "rerun still places its marks");
    assert(alerts.length === 1 && alerts[0] === dupMsg(36),
        "one warning with the overlap count 36 (got " + alerts.join(" | ") + ")");

    // Different spacing: only the shared corner marks overlap.
    var other = fakeDoc({ artboards: [ab], existing: previous });
    alerts = [];
    var s = settings({});
    s.top = GM.Config.createEdgeDef(true, true, 3, 105);
    s.left = GM.Config.createEdgeDef(true, true, 3, 105);
    GM.Main.process(s);
    assert(alerts.length === 1 && alerts[0] === dupMsg(4),
        "changed count: the 4 corner marks overlap (got " + alerts.join(" | ") + ")");

    // Unrelated content elsewhere on the layer (e.g. another shape's marks): no warning.
    var far = fakeDoc({ artboards: [ab], existing: [[1000 * MM, 1000 * MM]] });
    alerts = [];
    GM.Main.process(settings({}));
    assert(alerts.length === 0, "no warning without overlap (got " + alerts.join(" | ") + ")");

    // Near but clear of a mark (more than one diameter away): no warning.
    var clear = fakeDoc({ artboards: [ab], existing: [[7 * MM + 3.5 * MM, 293 * MM]] });
    alerts = [];
    GM.Main.process(settings({}));
    assert(alerts.length === 0, "a mark 3.5 mm off a 3 mm mark does not overlap");
})();

// ===== TEST: several artboards are reported (audit A8) =====
// Artboard mode marks every artboard; with more than one, an artboard outside
// the view gets marks too. The run says so, but only then — a note after every
// single-artboard run would train the operator to click it away.
console.log("--- process: marks on several artboards are reported (audit A8) ---");
(function () {
    function allMsg(n) {
        return GM.L.WARN_ALL_ARTBOARDS
            ? GM.L.WARN_PREFIX + GM.L.format(GM.L.WARN_ALL_ARTBOARDS, n)
            : "(WARN_ALL_ARTBOARDS missing)";
    }
    var two = [[0, 300 * MM, 300 * MM, 0], [400 * MM, 300 * MM, 500 * MM, 200 * MM]];
    var rec = fakeDoc({ artboards: two });
    alerts = [];
    GM.Main.process(settings({}));
    assert(rec.marks.length > 36, "both artboards get marks (got " + rec.marks.length + ")");
    assert(alerts.length === 1 && alerts[0] === allMsg(2),
        "one note naming 2 artboards (got " + alerts.join(" | ") + ")");

    fakeDoc({ artboards: [[0, 300 * MM, 300 * MM, 0]] });
    alerts = [];
    GM.Main.process(settings({}));
    assert(alerts.length === 0, "single artboard: no note");

    fakeDoc({ artboards: two, pathInfo: squarePathInfo(100 * MM) });
    alerts = [];
    GM.Main.process(settings({ placementMode: "path" }));
    assert(alerts.length === 0, "path mode marks the path only: no note (got " + alerts.join(" | ") + ")");
})();

// ===== TEST: path runs (spec §5, §7, §9) =====
console.log("--- process: path offset through Illustrator (spec §5, §6, §9) ---");
(function () {
    var side = 300 * MM, seen = {};
    var rec = fakeDoc({ artboards: [[0, side, side, 0]], pathInfo: squarePathInfo(side),
        offsetPath: function (info, D) { seen.D = D; return { ok: true, loops: 1, segments: squareSegs(D, side - D) }; } });
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20 }), {});
    assert(near(seen.D, 20 * MM), "offsetPath gets D in document units");
    assert(!!cornerMark(rec, 20 * MM, 20 * MM) && !!cornerMark(rec, 280 * MM, 280 * MM), "corner marks 20 mm in from both edges");
    assert(rec.marks.length === 12, "inset side 260 mm at ~100 mm: 4 per side, 12 in all (got " + rec.marks.length + ")");
    assert(alerts.length === 0, "no alert (" + alerts.join(" | ") + ")");

    // Collapse: Illustrator hands the original back (measured) -> nothing drawn
    var rec2 = fakeDoc({ artboards: [[0, side, side, 0]], pathInfo: squarePathInfo(side),
        offsetPath: function () { return { ok: true, loops: 1, segments: squareSegs(0, side) }; } });
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20 }), {});
    assert(rec2.marks.length === 0 && rec2.layerCalls === 0, "collapsed offset: no mark, no mark layer");
    assert(alerts.length === 1 && alerts[0].indexOf(GM.L.ERR_PREFIX + GM.L.ERR_OFFSET_COLLAPSE.split("%s")[0]) === 0 &&
        alerts[0].indexOf("20 mm") > 0, "collapse reported with the offset (" + alerts.join(" | ") + ")");

    var rec3 = fakeDoc({ artboards: [[0, side, side, 0]], pathInfo: squarePathInfo(side),
        offsetPath: function () { return { ok: true, loops: 2, segments: [] }; } });
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20 }), {});
    assert(rec3.marks.length === 0 && rec3.layerCalls === 0 && alerts.length === 1 &&
        alerts[0].indexOf(GM.L.ERR_PREFIX + GM.L.ERR_OFFSET_SPLIT.split("%s")[0]) === 0, "split line reported, nothing drawn, no mark layer");

    var rec4 = fakeDoc({ artboards: [[0, side, side, 0]], pathInfo: squarePathInfo(side),
        offsetPath: function () { return { ok: false, message: "boom" }; } });
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20 }), {});
    assert(rec4.marks.length === 0 && rec4.layerCalls === 0 && alerts.length === 1 && alerts[0].indexOf("boom") > 0,
        "offset failure reported, no mark layer");
})();

console.log("--- process: refusals say what happened to the document (family language §12.2) ---");
(function () {
    var side = 300 * MM;
    function refuse(off) {
        fakeDoc({ artboards: [[0, side, side, 0]], pathInfo: squarePathInfo(side), offsetPath: off });
        alerts = [];
        GM.Main.process(pathCfg({ pathOffset: 20 }), {});
        return alerts.join(" | ");
    }
    var collapse = refuse(function () { return { ok: true, loops: 1, segments: squareSegs(0, side) }; });
    var split = refuse(function () { return { ok: true, loops: 2, segments: [] }; });
    var failed = refuse(function () { return { ok: false, message: "boom" }; });
    assert(/ The document was not changed\.$/.test(collapse), "collapse ends with the document sentence (" + collapse + ")");
    assert(/ The document was not changed\.$/.test(split), "split ends with the document sentence (" + split + ")");
    assert(/\(boom\)\. No marks were made\.$/.test(failed), "offset failure says no marks were made (" + failed + ")");
    var keepLocale = global.app.locale, CS = {};
    global.app.locale = "cs_CZ";
    (function () { var GM = CS; eval(src("locale.js")); })();
    global.app.locale = keepLocale;
    var cs = CS.L;
    assert(!!cs && cs.OK === "Generovat", "Czech table loaded");
    if (cs) {
        assert(/ Dokument nebyl změněn\.$/.test(cs.ERR_OFFSET_COLLAPSE) && / Dokument nebyl změněn\.$/.test(cs.ERR_OFFSET_SPLIT),
            "CS collapse and split end with Dokument nebyl změněn.");
        assert(cs.ERR_OFFSET_FAILED === "Illustrator nedokázal cestu odsadit (%s). Žádná značka nevznikla.", "CS offset failure: " + cs.ERR_OFFSET_FAILED);
    }
})();

console.log("--- process: open path, part of the outline, top start ---");
(function () {
    var side = 300 * MM;
    var open = pathInfoOf([seg([0, 0], [side, 0]), seg([side, 0], [side, side])], false);
    var rec = fakeDoc({ artboards: [[0, side, side, 0]], pathInfo: open });
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20 }), {});
    assert(alerts.length === 0 && rec.marks.length > 0 && !!cornerMark(rec, side, 0), "open path: on the path, offset not asked for");

    var segs = squareSegs(0, side);
    segs[0].sel = true;                                    // bottom side selected
    var circuit = GM.Core.buildCircuit(segs, true);
    var part = { state: "runs", runs: GM.Core.selectedRuns(segs, true, circuit), selectedSegs: 1, totalSegs: 4 };
    var off = function (info, D) { return { ok: true, loops: 1, segments: squareSegs(D, side - D) }; };
    var rec2 = fakeDoc({ artboards: [[0, side, side, 0]], pathInfo: pathInfoOf(segs, true, part), offsetPath: off });
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20 }), { pathPartial: true });
    var bottomOnly = rec2.marks.length === 4;
    for (var i = 0; i < rec2.marks.length; i++) if (!near(rec2.marks[i].y, 20 * MM, 1e-6)) bottomOnly = false;
    assert(bottomOnly, "part ticked: 4 marks on the bottom eyelet line only (got " + rec2.marks.length + ")");
    var rec3 = fakeDoc({ artboards: [[0, side, side, 0]], pathInfo: pathInfoOf(segs, true, part), offsetPath: off });
    GM.Main.process(pathCfg({ pathOffset: 20 }), { pathPartial: false });
    assert(rec3.marks.length === 12, "part not ticked: whole outline (got " + rec3.marks.length + ")");

    var k = 4 / 3 * Math.tan(Math.PI / 8) * 100 * MM, c = 150 * MM, R = 100 * MM, circle = [];
    for (var q = 0; q < 4; q++) {                       // anchors at 45, 135, 225, 315 deg
        var s0 = Math.PI / 4 + q * Math.PI / 2, s1 = s0 + Math.PI / 2;
        var p0 = [c + R * Math.cos(s0), c + R * Math.sin(s0)], p3 = [c + R * Math.cos(s1), c + R * Math.sin(s1)];
        circle.push({ p0: p0, p1: [p0[0] - k * Math.sin(s0), p0[1] + k * Math.cos(s0)],
                      p2: [p3[0] + k * Math.sin(s1), p3[1] - k * Math.cos(s1)], p3: p3 });
    }
    var rec4 = fakeDoc({ artboards: [[0, side, side, 0]], pathInfo: pathInfoOf(circle, true) });
    GM.Main.process(pathCfg({ pathDist: { useNumber: true, number: 5, spacing: 100 } }), {});
    var top = false;
    for (var j = 0; j < rec4.marks.length; j++) if (near(rec4.marks[j].x, c, 0.5) && near(rec4.marks[j].y, c + R, 0.1)) top = true;
    assert(rec4.marks.length === 5 && top, "cornerless shape: 5 marks, one at the top");
})();

console.log("--- process: Count on a cut line without corners stays an even ring (final review M1) ---");
(function () {
    // Cut line: a circle of 4 arcs (no corners). The eyelet line is the inner
    // circle plus a hair-thin spike at the right: three sharp corners, as an
    // ellipse offset by more than its smallest curvature radius gains cusps.
    // Count mode must not turn them into marks: the cut line has no corners, so
    // the dialog promised N marks in an even ring from the top.
    var KK = 4 / 3 * Math.tan(Math.PI / 8), c = 150 * MM;
    // Circle of r in 4 arcs from angle 0, counter-clockwise; spikeAfter = index
    // of the arc whose end anchor grows a 0.1 mm radial spike (-1: none).
    function circleOf(r, spikeAfter) {
        var segs = [], k = KK * r;
        for (var q = 0; q < 4; q++) {
            var a0 = q * Math.PI / 2, a1 = a0 + Math.PI / 2;
            var p0 = [c + r * Math.cos(a0), c + r * Math.sin(a0)], p3 = [c + r * Math.cos(a1), c + r * Math.sin(a1)];
            segs.push({ p0: p0, p1: [p0[0] - k * Math.sin(a0), p0[1] + k * Math.cos(a0)],
                        p2: [p3[0] + k * Math.sin(a1), p3[1] - k * Math.cos(a1)], p3: p3 });
            if (q === spikeAfter) {
                var T = [p3[0] + 0.1 * MM * Math.cos(a1), p3[1] + 0.1 * MM * Math.sin(a1)];
                segs.push(seg(p3, T), seg(T, p3));
            }
        }
        return segs;
    }
    function cornersOf(segs) {
        return GM.Core.findCorners(segs, true, GM.CONSTANTS.CORNER_ANGLE_MIN, GM.Core.buildCircuit(segs, true)).dists.length;
    }
    var side = 300 * MM, R = 100 * MM, D = 20 * MM;
    var cut = pathInfoOf(circleOf(R, -1), true);
    var eyelet = circleOf(R - D, 3);                      // the spike at the right (angle 0)
    assert(cut.cornerCount === 0 && cornersOf(eyelet) > 0, "precheck: no corners on the cut line, some on the eyelet line");
    var rec = fakeDoc({ artboards: [[0, side, side, 0]], pathInfo: cut,
        offsetPath: function () { return { ok: true, loops: 1, segments: eyelet }; } });
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20, pathDist: { useNumber: true, number: 5, spacing: 100 } }), {});
    var top = false;
    for (var j = 0; j < rec.marks.length; j++) if (near(rec.marks[j].x, c, 0.5) && near(rec.marks[j].y, c + R - D, 0.1)) top = true;
    assert(alerts.length === 0, "no alert (" + alerts.join(" | ") + ")");
    assert(rec.marks.length === 5, "Count 5: five marks, not the eyelet line's corners (got " + rec.marks.length + ")");
    assert(top, "the ring starts at the top of the eyelet line");

    // Spacing mode still uses the corners it finds on the eyelet line
    var rec2 = fakeDoc({ artboards: [[0, side, side, 0]], pathInfo: cut,
        offsetPath: function () { return { ok: true, loops: 1, segments: eyelet }; } });
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20, pathDist: { useNumber: false, number: 5, spacing: 100 } }), {});
    assert(alerts.length === 0 && rec2.marks.length > 0, "Spacing mode unchanged: marks drawn (" + alerts.join(" | ") + ")");

    // A run keeps to the same rule: the upper half selected, the spike at its
    // middle (the top). Count gives the two ends of the run, not the spike.
    var cutSegs = circleOf(R, -1);
    cutSegs[0].sel = true; cutSegs[1].sel = true;
    var cutCircuit = GM.Core.buildCircuit(cutSegs, true);
    var part = { state: "runs", runs: GM.Core.selectedRuns(cutSegs, true, cutCircuit), selectedSegs: 2, totalSegs: 4 };
    var eyeRun = circleOf(R - D, 0);
    var rec3 = fakeDoc({ artboards: [[0, side, side, 0]], pathInfo: pathInfoOf(cutSegs, true, part),
        offsetPath: function () { return { ok: true, loops: 1, segments: eyeRun }; } });
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20, pathDist: { useNumber: true, number: 5, spacing: 100 } }), { pathPartial: true });
    assert(alerts.length === 0 && rec3.marks.length === 2 && !!cornerMark(rec3, c + R - D, c) && !!cornerMark(rec3, c - (R - D), c),
        "partial run, Count: the run's two ends only (got " + rec3.marks.length + "; " + alerts.join(" | ") + ")");
})();

console.log("--- process: polyline arc passes the check (review focus 1) ---");
(function () {
    var side = 300 * MM, d = 20 * MM;
    // Cut line: square whose top-right corner is a quarter circle of 12 line pieces
    var r = 60 * MM, cx = side - r, cy = side - r, cut = [seg([0, 0], [side, 0]), seg([side, 0], [side, cy])];
    var prev = [side, cy];
    for (var i = 1; i <= 12; i++) {
        var a = i * Math.PI / 24, p = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
        cut.push(seg(prev, p)); prev = p;
    }
    cut.push(seg(prev, [0, side])); cut.push(seg([0, side], [0, 0]));
    var inner = [seg([d, d], [side - d, d]), seg([side - d, d], [side - d, cy])];
    prev = [side - d, cy];
    for (var j = 1; j <= 12; j++) {
        var b = j * Math.PI / 24, q = [cx + (r - d) * Math.cos(b), cy + (r - d) * Math.sin(b)];
        inner.push(seg(prev, q)); prev = q;
    }
    inner.push(seg(prev, [d, side - d])); inner.push(seg([d, side - d], [d, d]));
    var rec = fakeDoc({ artboards: [[0, side, side, 0]], pathInfo: pathInfoOf(cut, true),
        offsetPath: function () { return { ok: true, loops: 1, segments: inner }; } });
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20 }), {});
    assert(alerts.length === 0 && rec.marks.length > 0, "marks drawn, check passed (" + alerts.join(" | ") + ")");
})();

console.log("--- process: inner corner passes the check (acceptance test 2026-10-17) ---");
(function () {
    var d = 20 * MM;
    function Lshape(a, b, c) {      // L from (a, a), arms out to b, inner corner at (c, c)
        return [seg([a, a], [b, a]), seg([b, a], [b, c]), seg([b, c], [c, c]),
                seg([c, c], [c, b]), seg([c, b], [a, b]), seg([a, b], [a, a])];
    }
    var cut = Lshape(0, 600 * MM, 300 * MM), inner = Lshape(d, 600 * MM - d, 300 * MM - d);
    var rec = fakeDoc({ artboards: [[0, 600 * MM, 600 * MM, 0]], pathInfo: pathInfoOf(cut, true),
        offsetPath: function () { return { ok: true, loops: 1, segments: inner }; } });
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20 }), {});
    assert(alerts.length === 0 && rec.marks.length > 0, "L shape, offset 20 mm: marks drawn, no refusal (" + alerts.join(" | ") + ")");
    assert(!!cornerMark(rec, 280 * MM, 280 * MM), "a mark in the inner corner of the eyelet line, 20 mm from both edges");
})();

console.log("--- process: a smooth anchor is no inner corner (review 2026-10-17) ---");
(function () {
    // Count 4 on a circle puts every mark on the radius through an anchor, so
    // each mark's nearest cut point IS an anchor. A wrong offset (3 D, a units
    // mistake) must still be refused: only tangent breaks count as corners.
    var r = 300 * MM, d = 20 * MM;
    function circle(rad) {
        var out = [], k = 4 / 3 * Math.tan(Math.PI / 8) * rad;
        for (var i = 0; i < 4; i++) {
            var s = i * Math.PI / 2, e = s + Math.PI / 2;
            var p0 = [rad * Math.cos(s), rad * Math.sin(s)], p3 = [rad * Math.cos(e), rad * Math.sin(e)];
            out.push({ p0: p0, p1: [p0[0] - k * Math.sin(s), p0[1] + k * Math.cos(s)],
                       p2: [p3[0] + k * Math.sin(e), p3[1] - k * Math.cos(e)], p3: p3 });
        }
        return out;
    }
    var rec = fakeDoc({ artboards: [[-r, r, r, -r]], pathInfo: pathInfoOf(circle(r), true),
        offsetPath: function () { return { ok: true, loops: 1, segments: circle(r - 3 * d) }; } });
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20, pathDist: { useNumber: true, number: 4, spacing: 100 } }), {});
    assert(rec.marks.length === 0 && alerts.length === 1 && alerts[0].indexOf(GM.L.ERR_PREFIX + GM.L.ERR_OFFSET_COLLAPSE.split("%s")[0]) === 0,
        "circle, Count 4, eyelet line 3 D in: refused (got " + rec.marks.length + " marks, alerts " + alerts.join(" | ") + ")");
    var rec2 = fakeDoc({ artboards: [[-r, r, r, -r]], pathInfo: pathInfoOf(circle(r), true),
        offsetPath: function () { return { ok: true, loops: 1, segments: circle(r - d) }; } });
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20, pathDist: { useNumber: true, number: 4, spacing: 100 } }), {});
    assert(rec2.marks.length === 4 && alerts.length === 0, "the same circle with the right offset passes (" + alerts.join(" | ") + ")");
})();

console.log("--- process: Large Canvas offset, empty result, decimal separator (spec §6.1, §7, G1) ---");
(function () {
    var side = 30 * MM, seen = {}, collapse = GM.L.ERR_PREFIX + GM.L.ERR_OFFSET_COLLAPSE.split("%s")[0];
    // Large Canvas: 300 mm is 30 mm in document units. The line Illustrator hands
    // back is `extra` doc pt further in than asked for.
    function canvas(extra) {
        return fakeDoc({ artboards: [[0, side, side, 0]], scaleFactor: 10, pathInfo: squarePathInfo(side),
            offsetPath: function (info, D) {
                seen.D = D;
                return { ok: true, loops: 1, segments: squareSegs(D + extra, side - D - extra) };
            } });
    }
    var rec = canvas(0);
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20 }), {});
    assert(near(seen.D, 2 * MM), "20 mm physical is 2 mm in a 1:10 document (got " + seen.D / MM + " mm)");
    assert(rec.marks.length > 0 && alerts.length === 0, "marks drawn, no alert (" + alerts.join(" | ") + ")");

    var rec2 = canvas(0.06);                              // 0.6 pt physical: over the 0.5 pt tolerance
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20 }), {});
    assert(rec2.marks.length === 0 && rec2.layerCalls === 0 && alerts.length === 1 &&
        alerts[0].indexOf(collapse) === 0, "0.06 doc pt off (0.6 pt physical): refused (" + alerts.join(" | ") + ")");

    var rec3 = canvas(0.04);                              // 0.4 pt physical: within it
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20 }), {});
    assert(rec3.marks.length > 0 && alerts.length === 0, "0.04 doc pt off (0.4 pt physical): accepted (" + alerts.join(" | ") + ")");

    // An empty eyelet line is a failure, never a silent success
    var big = 300 * MM;
    var rec4 = fakeDoc({ artboards: [[0, big, big, 0]], pathInfo: squarePathInfo(big),
        offsetPath: function () { return { ok: true, loops: 1, segments: [] }; } });
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 20 }), {});
    assert(rec4.marks.length === 0 && rec4.layerCalls === 0 && alerts.length === 1 &&
        alerts[0].indexOf(collapse) === 0 && alerts[0].indexOf("20 mm") > 0,
        "empty offset result: collapse reported, no mark layer (" + alerts.join(" | ") + ")");

    // The offset is shown with the locale's decimal separator ("." here; the Czech "," is the locale key)
    var rec5 = fakeDoc({ artboards: [[0, big, big, 0]], pathInfo: squarePathInfo(big),
        offsetPath: function () { return { ok: true, loops: 1, segments: squareSegs(0, big) }; } });
    alerts = [];
    GM.Main.process(pathCfg({ pathOffset: 2.5 }), {});
    assert(alerts.length === 1 && alerts[0].indexOf("2" + GM.L.DEC_SEP + "5 mm") > 0 &&
        alerts[0].indexOf("2.5 mm") > 0, "offset 2.5 shown as 2.5 mm (" + alerts.join(" | ") + ")");
})();

// ===== TEST: a blocking alert is an error (spec 6.5, ruling R2) =====
// A refusal ends the run without drawing: it starts with the family's prefix.
console.log("--- process: a refusal starts with the error prefix (spec 6.5) ---");
(function () {
    var side = 300 * MM;
    function refusal(off) {
        fakeDoc({ artboards: [[0, side, side, 0]], pathInfo: squarePathInfo(side), offsetPath: off });
        alerts = [];
        GM.Main.process(pathCfg({ pathOffset: 20 }), {});
        return alerts.length === 1 ? alerts[0] : "(" + alerts.length + " alerts)";
    }
    var offsets = {
        collapse: function () { return { ok: true, loops: 1, segments: squareSegs(0, side) }; },
        split:    function () { return { ok: true, loops: 2, segments: [] }; },
        failed:   function () { return { ok: false, message: "boom" }; }
    };
    var saved = GM.L;
    var langs = [["en_US", "ERROR: "], ["cs_CZ", "CHYBA: "]];
    for (var li = 0; li < langs.length; li++) {
        var keep = global.app.locale;
        global.app.locale = langs[li][0];
        var table = new Function("GM", src("locale.js") + "\nreturn GM.L;")({});
        global.app.locale = keep;
        GM.L = table;
        for (var name in offsets) if (offsets.hasOwnProperty(name)) {
            var text = refusal(offsets[name]);
            assert(table.ERR_PREFIX === langs[li][1] && text.indexOf(langs[li][1]) === 0,
                langs[li][0] + " / " + name + ": starts with '" + langs[li][1] + "' (got '" + text + "')");
            assert(text.indexOf("Illustrator Grommet Marks") < 0, langs[li][0] + " / " + name + ": the tool's name is not in front");
        }
    }
    GM.L = saved;
})();

// ===== TEST: drawing scale 1:N divides every length (spec 4.1) =====
// The dialog holds real-world values; a drawing at 1:N is N times smaller, so
// every length from the dialog is divided by N (and, as before, by the Large
// Canvas factor — the two multiply). Counts and the document's own tolerances
// are not divided. A 300 mm real layout drawn at 1:10 sits on a 30 mm artboard,
// so every position of the 1:10 run is the 1:1 run's divided by ten.
console.log("--- process: drawing scale 1:N divides every length (spec 4.1) ---");
(function () {
    // A configuration that uses most lengths: the two offsets differ, the edges
    // run by spacing, corner zones on, the mark and both strokes are not defaults.
    function lengths() {
        var s = settings({ offsetX: 7, offsetY: 11, markSize: 4, regWeight: 1.5, haloWeight: 3.5 });
        s.top = GM.Config.createEdgeDef(true, false, 10, 80);
        s.left = GM.Config.createEdgeDef(true, false, 10, 60);
        s.cornerZone = { enabled: true, count: 3, pitch: 20 };
        return s;
    }
    function same(ref, got, k, tag) {
        var ok = got.marks.length === ref.marks.length && ref.marks.length > 0;
        for (var i = 0; ok && i < ref.marks.length; i++) {
            var a = ref.marks[i], b = got.marks[i];
            ok = near(b.x, a.x / k, 1e-9) && near(b.y, a.y / k, 1e-9) && near(b.size, a.size / k, 1e-9) &&
                near(b.opts.regWeight, a.opts.regWeight / k, 1e-9) && near(b.opts.haloWeight, a.opts.haloWeight / k, 1e-9);
        }
        assert(ok, tag + " (" + ref.marks.length + " marks at 1:1, " + got.marks.length + " drawn)");
    }

    var ref = fakeDoc({ artboards: [[0, 300 * MM, 300 * MM, 0]] });
    alerts = [];
    GM.Main.process(lengths(), { drawingScale: 1 });
    assert(ref.marks.length >= 20, "precheck: spacing mode and zones give a layout of its own (" + ref.marks.length + " marks)");
    assert(ref.marks[0].size === 4 * MM && ref.marks[0].opts.regWeight === 1.5, "1:1: the mark is 4 mm, the stroke 1.5 pt");

    var ks = [10, 2.5, 100];
    for (var q = 0; q < ks.length; q++) {
        var k = ks[q];
        var rec = fakeDoc({ artboards: [[0, 300 * MM / k, 300 * MM / k, 0]] });
        alerts = [];
        GM.Main.process(lengths(), { drawingScale: k });
        same(ref, rec, k, "1:" + k + ": positions, size and both strokes are the 1:1 values / " + k);
        assert(alerts.length === 0, "1:" + k + ": no alert (" + alerts.join(" | ") + ")");
    }

    // 1:1 is today's result, however the scale is (not) given
    var plain = fakeDoc({ artboards: [[0, 300 * MM, 300 * MM, 0]] });
    GM.Main.process(lengths());
    var plainJson = JSON.stringify(plain.marks);
    var variants = [undefined, {}, { drawingScale: 1 }, { drawingScale: NaN }, { drawingScale: 0 }];
    for (var v = 0; v < variants.length; v++) {
        var again = fakeDoc({ artboards: [[0, 300 * MM, 300 * MM, 0]] });
        GM.Main.process(lengths(), variants[v]);
        assert(JSON.stringify(again.marks) === plainJson, "no scale / 1 / unusable (" + JSON.stringify(variants[v]) + "): the 1:1 result");
    }
    assert(JSON.stringify(ref.marks) === plainJson, "{drawingScale: 1} is the same as no options");

    // Large Canvas (scaleFactor 10) and 1:10 together: / 100
    var big = fakeDoc({ artboards: [[0, 3 * MM, 3 * MM, 0]], scaleFactor: 10 });
    GM.Main.process(lengths(), { drawingScale: 10 });
    same(ref, big, 100, "Large Canvas x 1:10: / 100");

    // Counts are not lengths: the same number of marks on every edge row
    var count = fakeDoc({ artboards: [[0, 30 * MM, 30 * MM, 0]] });
    GM.Main.process(settings({}), { drawingScale: 10 });
    assert(count.marks.length === 36, "count mode: 36 marks at 1:10 as at 1:1 (got " + count.marks.length + ")");

    // Units: 5 cm real is 50 mm real
    var cmRef = fakeDoc({ artboards: [[0, 300 * MM, 300 * MM, 0]] });
    GM.Main.process(settings({ units: "cm", offsetX: 0.7, offsetY: 0.7, markSize: 0.3 }), { drawingScale: 1 });
    var cm10 = fakeDoc({ artboards: [[0, 30 * MM, 30 * MM, 0]] });
    GM.Main.process(settings({ units: "cm", offsetX: 0.7, offsetY: 0.7, markSize: 0.3 }), { drawingScale: 10 });
    same(cmRef, cm10, 10, "centimetres: the same division");
})();

console.log("--- process: path mode at 1:N — the offset is divided, the tolerance is not (spec 4.1) ---");
(function () {
    function squareRun(side, k, scaleFactor, extra, seen) {
        var rec = fakeDoc({ artboards: [[0, side, side, 0]], scaleFactor: scaleFactor, pathInfo: squarePathInfo(side),
            offsetPath: function (info, D) {
                if (seen) seen.D = D;
                return { ok: true, loops: 1, segments: squareSegs(D + extra, side - D - extra) };
            } });
        alerts = [];
        var out = GM.Main.process(pathCfg({ pathOffset: 20 }), { drawingScale: k });
        return { rec: rec, out: out };
    }
    var s1 = {}, s10 = {}, s100 = {};
    var ref = squareRun(300 * MM, 1, 1, 0, s1);
    var tenth = squareRun(30 * MM, 10, 1, 0, s10);
    assert(near(s1.D, 20 * MM) && near(s10.D, 2 * MM, 1e-9),
        "offsetPath gets D = offset / N in document units (20 mm -> " + s10.D / MM + " mm at 1:10)");
    assert(tenth.rec.marks.length === ref.rec.marks.length && ref.rec.marks.length > 0,
        "path mode: the same number of marks (" + ref.rec.marks.length + " / " + tenth.rec.marks.length + ")");
    var ok = true;
    for (var i = 0; i < ref.rec.marks.length; i++) {
        var tm = tenth.rec.marks[i];
        if (!tm || !near(tm.x, ref.rec.marks[i].x / 10, 1e-9) || !near(tm.y, ref.rec.marks[i].y / 10, 1e-9)) ok = false;
    }
    assert(ok, "path mode: every mark of 1:10 is the 1:1 mark / 10");

    var both = squareRun(3 * MM, 10, 10, 0, s100);
    assert(near(s100.D, 0.2 * MM, 1e-9), "Large Canvas x 1:10: D = 20 mm / 100 (got " + s100.D / MM + " mm)");
    assert(both.rec.marks.length === ref.rec.marks.length, "...and the same number of marks");

    // Review focus 5: the check's tolerance is OFFSET_TOL / scaleFactor — the
    // Illustrator's precision in document units — and does not shrink with N.
    var near1 = squareRun(30 * MM, 10, 1, 0.4, null);
    assert(near1.rec.marks.length > 0 && alerts.length === 0, "1:10, 0.4 pt off (tolerance 0.5 pt): accepted (" + alerts.join(" | ") + ")");
    var far1 = squareRun(30 * MM, 10, 1, 0.6, null);
    assert(far1.rec.marks.length === 0 && far1.rec.layerCalls === 0 && alerts.length === 1, "1:10, 0.6 pt off: refused (" + alerts.join(" | ") + ")");
    assert(far1.out === false, "...and process says it drew nothing");
    var near2 = squareRun(3 * MM, 10, 10, 0.04, null);
    assert(near2.rec.marks.length > 0 && alerts.length === 0, "Large Canvas x 1:10, 0.04 pt off (tolerance 0.05 pt): accepted (" + alerts.join(" | ") + ")");
    var far2 = squareRun(3 * MM, 10, 10, 0.06, null);
    assert(far2.rec.marks.length === 0 && alerts.length === 1, "Large Canvas x 1:10, 0.06 pt off: refused (" + alerts.join(" | ") + ")");

    // The refusal names the offset as the operator typed it (real size), not divided
    assert(alerts[0].indexOf("20 mm") > 0, "the refusal shows the typed 20 mm (" + alerts[0] + ")");

    assert(ref.out === true && tenth.out === true, "process says it drew when it did");
})();

// ===== TEST: run saves the scale in the document, not in the settings (spec 4.2) =====
// The dialog and the stores are fakes; process() is the real one. The scale
// reaches the document only when it differs from what the document held and the
// run really drew — a refusal leaves the document as the message promises.
console.log("--- run: the document remembers the scale, [Last Settings] does not (spec 4.2) ---");
(function () {
    var keep = { Storage: GM.Storage, UI: GM.UI, DrawingScale: GM.DrawingScale, redraw: global.app.redraw };
    var LAST = "[Last Settings]";
    function restore(name) { if (keep[name] === undefined) delete GM[name]; else GM[name] = keep[name]; }
    function runWith(o) {
        var rec = fakeDoc({ artboards: [[0, 300 * MM, 300 * MM, 0]], pathInfo: o.pathInfo, offsetPath: o.offsetPath });
        var log = { saves: [], stored: null, docInfo: null, shown: 0 };
        GM.Illustrator.init = function () { return true; };
        GM.Illustrator.getDocInfo = function () {
            return { artboards: 1, width: 300 * MM, height: 300 * MM, scale: 1, drawingScale: o.docScale };
        };
        global.app.redraw = function () {};
        GM.Storage = { PRESET_KEY_LAST: LAST, load: function () { return null; },
            save: function (d, runContinues) { log.stored = JSON.parse(JSON.stringify(d)); log.runContinues = runContinues; return true; } };
        GM.UI = { buildDialog: function (pData, pathInfo, docInfo) {
            log.docInfo = docInfo;
            return {
                window: { show: function () { log.shown++; return o.cancel ? 2 : 1; } },
                gatherAll: function () { return o.cfg || GM.Config.getDefaults(); },
                getRunOptions: function () { return { pathPartial: false, drawingScale: o.dialogScale }; }
            };
        } };
        GM.DrawingScale = { save: function (doc, n) { log.saves.push({ doc: doc, n: n }); return true; } };
        alerts = [];
        var realProcess = GM.Main.process, seen = null;
        GM.Main.process = function (cfg, opts) { seen = { cfg: cfg, opts: opts }; return realProcess.call(GM.Main, cfg, opts); };
        try { GM.Main.run(); }
        finally {
            GM.Main.process = realProcess;
            restore("Storage"); restore("UI"); restore("DrawingScale");
            if (keep.redraw === undefined) delete global.app.redraw; else global.app.redraw = keep.redraw;
        }
        return { rec: rec, log: log, seen: seen };
    }

    // The dialog already shows the document's scale; confirming it changes nothing in the document
    var a = runWith({ docScale: 10, dialogScale: 10 });
    assert(a.rec.marks.length === 36 && alerts.length === 0, "1:10 in the document, 1:10 in the dialog: the run draws (" + alerts.join(" | ") + ")");
    assert(a.log.saves.length === 0, "...and the document is not written to (" + a.log.saves.length + " writes)");
    assert(a.log.runContinues === true, "[Last Settings] is saved as a write the run continues after: a failed write says so (canon 12.2, review M8)");
    assert(a.seen && a.seen.opts.drawingScale === 10, "...the run got the scale 10");
    assert(near(a.rec.marks[0].size, 3 * MM / 10), "...and drew the 3 mm mark as 0.3 mm");

    // The operator changed the scale: it goes into the document, as the number the field held
    var b = runWith({ docScale: 10, dialogScale: 2.5 });
    assert(b.log.saves.length === 1 && b.log.saves[0].n === 2.5 && b.log.saves[0].doc === GM.Illustrator.doc,
        "10 in the document, 2,5 in the dialog: DrawingScale.save(doc, 2.5) once (" + b.log.saves.length + ")");
    assert(near(b.rec.marks[0].size, 3 * MM / 2.5), "...the mark is 3 mm / 2.5");
    assert(b.log.docInfo && b.log.docInfo.drawingScale === 10, "...the dialog was built with the document's scale");

    // A document without a scale is 1:1: a run at 1:1 does not touch it...
    var c = runWith({ docScale: 1, dialogScale: 1 });
    assert(c.rec.marks.length === 36 && c.log.saves.length === 0, "no scale in the document, 1:1 in the dialog: the document stays untouched");
    // ...and a run at another scale gives it one
    var d = runWith({ docScale: 1, dialogScale: 10 });
    assert(d.log.saves.length === 1 && d.log.saves[0].n === 10, "no scale in the document, 1:10 in the dialog: written");

    // Not a setting: neither in [Last Settings] nor in what process() gets as the configuration
    var keys = function (o) { var k = []; for (var p in o) if (o.hasOwnProperty(p)) k.push(p); return k.sort().join(","); };
    var last = d.log.stored && d.log.stored.presets[LAST];
    assert(!!last, "[Last Settings] was written");
    assert(last && keys(last) === keys(GM.Config.getDefaults()), "[Last Settings] has the settings' keys and no scale (" + (last && keys(last)) + ")");
    assert(JSON.stringify(d.log.stored).indexOf("rawingScale") < 0, "...no 'drawingScale' anywhere in the stored data");
    assert(d.seen && keys(d.seen.cfg) === keys(GM.Config.getDefaults()), "process() gets the settings without the scale");

    // A scale the dialog should never hand over (its Generate is grey) is refused again here
    var bad = [NaN, 0.5, 0, 101];
    for (var i = 0; i < bad.length; i++) {
        var e = runWith({ docScale: 1, dialogScale: bad[i] });
        assert(e.rec.marks.length === 0 && e.rec.layerCalls === 0 && e.log.saves.length === 0 && e.log.stored === null && e.seen === null,
            "scale " + bad[i] + ": nothing drawn, nothing saved, no write");
        assert(alerts.length === 1 && alerts[0].indexOf(GM.L.ERR_PREFIX) === 0 && alerts[0].indexOf(GM.L.SCALE_FIELD) > 0 &&
            alerts[0].indexOf(GM.L.DOC_UNCHANGED) > 0, "scale " + bad[i] + ": one error naming the field (" + alerts.join(" | ") + ")");
    }

    // Cancelling the dialog: nothing at all
    var f = runWith({ docScale: 1, dialogScale: 10, cancel: true });
    assert(f.log.shown === 1 && f.rec.marks.length === 0 && f.log.saves.length === 0 && f.log.stored === null, "cancel: no run, no write");

    // A run that ends in a refusal leaves the document as the message says
    var side = 300 * MM;
    var g = runWith({ docScale: 1, dialogScale: 10, cfg: pathCfg({ pathOffset: 20 }), pathInfo: squarePathInfo(side),
        offsetPath: function () { return { ok: true, loops: 1, segments: squareSegs(0, side) }; } });
    assert(g.rec.marks.length === 0 && alerts.length === 1 && alerts[0].indexOf(GM.L.DOC_UNCHANGED) > 0, "a collapsing offset is refused (" + alerts.join(" | ") + ")");
    assert(g.log.saves.length === 0, "...and the scale is not written: 'the document was not changed' stays true");
})();

// ===== TEST: an unexpected error is the canon's template (spec 6.5, canon 12.2) =====
// Both error boundaries (process and run) say the same: message and line, the
// line in the language's own words; no more "Illustrator Grommet Marks: ...".
console.log("--- process, run: an unexpected exception is ERR_CRITICAL ---");
(function () {
    var rec = fakeDoc({ artboards: [[0, 300 * MM, 300 * MM, 0]] });
    var boom = new Error("boom"); boom.line = 42;
    GM.Illustrator.placeMarkGroup = function () { throw boom; };
    rec.layer.locked = true;
    alerts = [];
    GM.Main.process(settings({}));
    assert(alerts.length === 1 && alerts[0] === GM.L.format(String(GM.L.ERR_CRITICAL), "boom", "42"),
        "process: ERR_CRITICAL with the message and the line (got '" + alerts.join(" | ") + "')");
    assert(rec.layer.locked === true, "process: the layer's lock is put back before the alert");

    GM.Illustrator.placeMarkGroup = function () { throw new Error("no line"); };
    alerts = [];
    GM.Main.process(settings({}));
    assert(alerts.length === 1 && alerts[0] === GM.L.format(String(GM.L.ERR_CRITICAL), "no line", "?"),
        "process: no line number -> '?' (got '" + alerts.join(" | ") + "')");

    var failing = new Error("no document"); failing.line = 7;
    GM.Illustrator = { init: function () { throw failing; } };
    alerts = [];
    GM.Main.run();
    assert(alerts.length === 1 && alerts[0] === GM.L.format(String(GM.L.ERR_CRITICAL), "no document", "7"),
        "run: ERR_CRITICAL with the message and the line (got '" + alerts.join(" | ") + "')");
    assert(alerts[0].indexOf("The script stopped on an unexpected error: no document (line 7).") === 0,
        "run: the template's first sentence");

    // The document-less case keeps its own text, with no prefix (R2)
    GM.Illustrator = { init: function () { return false; } };
    alerts = [];
    GM.Main.run();
    assert(alerts.length === 1 && alerts[0] === GM.L.ERR_NO_DOC, "no document: ERR_NO_DOC, unchanged and unprefixed");
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
