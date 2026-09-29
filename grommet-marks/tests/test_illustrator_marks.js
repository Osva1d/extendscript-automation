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

var GM = {};
function src(rel) { return fs.readFileSync(path.join(__dirname, "..", "src", rel), "utf8"); }
eval(src("constants.js"));
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

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
