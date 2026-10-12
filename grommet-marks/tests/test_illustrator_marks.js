#!/usr/bin/env node
/**
 * GM.Illustrator DOM adapter — mark drawing and path extraction, against a
 * fake DOM. New paths in Illustrator inherit the document's current stroke style
 * (measured in 30.8.1: dashes, cap, join after selecting a dashed path), so the
 * fake hands out paths that already carry an inherited dashed, round-capped
 * stroke — whatever placeMarkGroup does not set explicitly shows up here.
 *
 * Usage: node tests/test_illustrator_marks.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
global.app = { locale: "en_US" };
global.$ = { writeln: function () {} };
global.StrokeCap = { BUTTENDCAP: "BUTT", ROUNDENDCAP: "ROUND", PROJECTINGENDCAP: "PROJECTING" };
global.ColorModel = { REGISTRATION: "REGISTRATION", SPOT: "SPOT", PROCESS: "PROCESS" };
global.CMYKColor = function () { this.typename = "CMYKColor"; };
global.PathPointSelection = { ANCHORPOINT: "ANCHOR", NOSELECTION: "NONE",
                              LEFTDIRECTION: "LEFT", RIGHTDIRECTION: "RIGHT" };

var GM = {};
function src(rel) { return fs.readFileSync(path.join(__dirname, "..", "src", rel), "utf8"); }
eval(src("constants.js"));
eval(src("lib/utils.js"));
eval(src("core.js"));
eval(src("illustrator.js"));

// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}

// ===== FAKE DOM =====
function inheritedPath() {
    return { strokeDashes: [6, 3], strokeCap: StrokeCap.ROUNDENDCAP,
             setEntirePath: function (pts) { this.points = pts; } };
}
function fakeLayer() {
    var created = [];
    var grp = {
        pathItems: {
            ellipse: function () { var p = inheritedPath(); created.push(p); return p; },
            add: function () { var p = inheritedPath(); created.push(p); return p; }
        }
    };
    return { layer: { groupItems: { add: function () { return grp; } } }, created: created };
}
GM.Illustrator.doc = {
    swatches: [null, { color: { typename: "SpotColor", spot: { colorType: ColorModel.REGISTRATION } } }]
};

// ===== TEST: marks do not inherit the document stroke style (review G2) =====
console.log("--- placeMarkGroup: explicit stroke style (G2) ---");
(function () {
    var f = fakeLayer();
    var ok = GM.Illustrator.placeMarkGroup(f.layer, 100, 100, 10,
        { circle: true, cross: true, regWeight: 1, haloWeight: 3 });
    assert(ok === true, "placeMarkGroup succeeds");
    assert(f.created.length === 6, "circle + cross, halo + registration = 6 paths (got " + f.created.length + ")");
    var solid = true, butt = true;
    for (var i = 0; i < f.created.length; i++) {
        if (!(f.created[i].strokeDashes instanceof Array) || f.created[i].strokeDashes.length !== 0) solid = false;
        if (f.created[i].strokeCap !== StrokeCap.BUTTENDCAP) butt = false;
    }
    assert(solid, "every path has a solid stroke (no inherited dashes)");
    assert(butt, "every path has butt caps (no inherited round caps)");
})();

// ===== TEST: selected path with a duplicated closing anchor (review G6) =====
console.log("--- getSelectedPathInfo: duplicated closing anchor (G6) ---");
(function () {
    function pp(x, y) { return { anchor: [x, y], leftDirection: [x, y], rightDirection: [x, y] }; }
    var rect = { typename: "PathItem", closed: true,
                 pathPoints: [pp(0, 0), pp(1000, 0), pp(1000, 500), pp(0, 500), pp(0, 0)] };
    GM.Illustrator.doc.selection = [rect];
    var info = GM.Illustrator.getSelectedPathInfo();
    assert(info.ok === true, "5-point closed rectangle is a usable path");
    assert(info.cornerCount === 4, "all 4 corners found (got " + info.cornerCount + ")");
    assert(Math.abs(info.totalLen - 3000) < 1e-6, "perimeter unchanged: 3000 (got " + info.totalLen + ")");
})();

// ===== TEST: corners, part of the outline (spec §5.2, §5.4) =====
console.log("--- getSelectedPathInfo: corners and a direct selection ---");
(function () {
    function pp(x, y, sel) {
        return { anchor: [x, y], leftDirection: [x, y], rightDirection: [x, y],
                 selected: sel ? PathPointSelection.ANCHORPOINT : PathPointSelection.NOSELECTION };
    }
    var house = { typename: "PathItem", closed: true, pathPoints: [
        pp(0, 0, true), pp(1000, 0, true), pp(1000, 600, false), pp(500, 1000, false), pp(0, 600, false)] };
    GM.Illustrator.doc.selection = [house];
    var info = GM.Illustrator.getSelectedPathInfo();
    assert(info.sharpCount === 5 && info.roundCount === 0 && info.cornerCount === 5, "house: 5 corners");
    assert(info.partial.state === "runs" && info.partial.runs.length === 1 && info.partial.selectedSegs === 1,
        "bottom side selected: one run of 1 segment (got " + info.partial.state + ")");
    assert(info.partial.totalSegs === 5, "5 segments in total");
    assert(info.pointSel.length === 5 && info.pointSel[0] === PathPointSelection.ANCHORPOINT, "point states kept for restoring");

    var lone = { typename: "PathItem", closed: true, pathPoints: [
        pp(0, 0, true), pp(1000, 0, false), pp(1000, 600, false), pp(0, 600, false)] };
    GM.Illustrator.doc.selection = [lone];
    assert(GM.Illustrator.getSelectedPathInfo().partial.state === "lone", "one lone anchor: 'lone'");

    var whole = { typename: "PathItem", closed: true, pathPoints: [
        pp(0, 0, true), pp(1000, 0, true), pp(1000, 600, true), pp(0, 600, true)] };
    GM.Illustrator.doc.selection = [whole];
    assert(GM.Illustrator.getSelectedPathInfo().partial.state === "none", "every anchor selected (Selection tool): whole outline");
})();

console.log("--- getDocInfo ---");
(function () {
    GM.Illustrator.doc.artboards = [{ artboardRect: [0, 500, 1000, 0] }, { artboardRect: [0, 0, 10, -10] }];
    GM.Illustrator.doc.scaleFactor = 10;
    var d = GM.Illustrator.getDocInfo();
    assert(d.artboards === 2 && d.width === 1000 && d.height === 500 && d.scale === 10, "count, first artboard size, scale");
    delete GM.Illustrator.doc.scaleFactor;
    assert(GM.Illustrator.getDocInfo().scale === 1, "no scaleFactor -> 1");
})();

// ===== TEST: what Task 5 delivers — rounded corners counted, selection aligned (review) =====
console.log("--- getSelectedPathInfo: rounded corners, selection with a duplicated anchor ---");
(function () {
    var A = PathPointSelection.ANCHORPOINT, N = PathPointSelection.NOSELECTION;
    function P(ax, ay, lx, ly, rx, ry, sel) {
        return { anchor: [ax, ay], leftDirection: [lx, ly], rightDirection: [rx, ry], selected: sel ? A : N };
    }
    // Rounded rectangle 1000 x 600, R 100, 8 anchors with circle handles (live corners)
    var W = 1000, H = 600, R = 100, k = 0.5522847498 * R;
    var rr = { typename: "PathItem", closed: true, pathPoints: [
        P(R, 0, R - k, 0, R, 0), P(W - R, 0, W - R, 0, W - R + k, 0),
        P(W, R, W, R - k, W, R), P(W, H - R, W, H - R, W, H - R + k),
        P(W - R, H, W - R + k, H, W - R, H), P(R, H, R, H, R - k, H),
        P(0, H - R, 0, H - R + k, 0, H - R), P(0, R, 0, R, 0, R - k)] };
    GM.Illustrator.doc.selection = [rr];
    var i1 = GM.Illustrator.getSelectedPathInfo();
    assert(i1.cornerCount === 4 && i1.sharpCount === 0 && i1.roundCount === 4,
        "rounded rectangle: 4 corners, all rounded (got " + i1.cornerCount + "/" + i1.sharpCount + "/" + i1.roundCount + ")");
    assert(i1.partial.state === "none", "nothing selected: whole outline");

    // Duplicated middle anchor; the segment after it is selected
    function pp(x, y, sel) { return P(x, y, x, y, x, y, sel); }
    var dup = { typename: "PathItem", closed: true, pathPoints: [
        pp(0, 0, false), pp(1000, 0, false), pp(1000, 0, true), pp(1000, 600, true), pp(0, 600, false)] };
    GM.Illustrator.doc.selection = [dup];
    var i2 = GM.Illustrator.getSelectedPathInfo();
    assert(i2.partial.state === "runs" && i2.partial.runs.length === 1 &&
        Math.abs(i2.partial.runs[0].from - 1000) < 1e-6 && Math.abs(i2.partial.runs[0].len - 600) < 1e-6,
        "selection stays aligned after dropping the zero-length segment: run 1000+600");
    assert(i2.partial.totalSegs === 4, "4 segments after the drop");

    // Duplicated closing anchor, only the two coincident anchors selected
    var close = { typename: "PathItem", closed: true, pathPoints: [
        pp(0, 0, true), pp(1000, 0, false), pp(1000, 600, false), pp(0, 600, false), pp(0, 0, true)] };
    GM.Illustrator.doc.selection = [close];
    assert(GM.Illustrator.getSelectedPathInfo().partial.state === "lone",
        "two coincident anchors selected: no whole segment — 'lone', not a run");
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
