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
 * @param {Object} o - {artboards: [[l,t,r,b]...], scaleFactor, pathInfo}
 */
function fakeDoc(o) {
    var rec = { marks: [], layer: { locked: false, visible: true } };
    var doc = { artboards: [] };
    for (var i = 0; i < o.artboards.length; i++) doc.artboards.push({ artboardRect: o.artboards[i] });
    if (o.scaleFactor !== undefined) doc.scaleFactor = o.scaleFactor;
    GM.Illustrator = {
        doc: doc,
        getOrCreateLayer: function () { return rec.layer; },
        placeMarkGroup: function (layer, x, y, size, opts) {
            rec.marks.push({ x: x, y: y, size: size, opts: opts });
            return true;
        },
        getSelectedPathInfo: function () { return o.pathInfo || { ok: false, reason: "no-selection" }; },
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
function squarePathInfo(side) {
    function seg(a, b) { return { p0: a, p1: a, p2: b, p3: b }; }
    var s = [seg([0, 0], [side, 0]), seg([side, 0], [side, side]),
             seg([side, side], [0, side]), seg([0, side], [0, 0])];
    var circuit = GM.Core.buildCircuit(s, true);
    var corners = GM.Core.detectCorners(s, true, GM.CONSTANTS.CORNER_ANGLE_MIN);
    return { ok: true, circuit: circuit, corners: corners, closed: true,
             cornerCount: corners.length, totalLen: circuit.totalLen, pathRef: {} };
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

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
