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
        getSelectedPathInfo: function () { return o.pathInfo || { ok: false, reason: "no-selection" }; }
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

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
