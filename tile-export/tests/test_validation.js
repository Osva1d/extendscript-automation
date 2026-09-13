#!/usr/bin/env node
/**
 * TE.Validate — the §5 rules. Errors stop the run, warnings do not.
 */
var fs = require("fs");
var path = require("path");

var TE = {};
global.app = { documents: { length: 1 }, activeDocument: { scaleFactor: 1 } };
TE.L = {
    ERR_OVERLAP_BIG:   "overlap-too-big",
    ERR_ADD_OVERHANG:  "add-exceeds-overhang",
    ERR_MANY_GRAPHICS: "wrong-graphic-count",
    ERR_AB_TOO_BIG:    "artboard-too-big",
    ERR_LARGE_CANVAS:  "large-canvas-source-scale",
    WARN_MEDIA:        "media-too-narrow",
    format: function (t) { return t; }
};
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "config.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "grid.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "validation.js"), "utf8"));

var mm = TE.Utils.mm2pt;
var pass = 0, fail = 0, total = 0;
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
function has(list, code) { return TE.Utils.indexOf(list, code) !== -1; }

var D = TE.Config.getDefaults();
var CLEAN = [0, mm(1000), mm(3000), 0];

function job(over) {
    var s = merge(D, merge({
        direction: "horizontal", divideMode: "count", tileCount: 3,
        overlap: 20, overlapMode: "symmetric",
        addTop: 40, addBottom: 40, addLeft: 0, addRight: 40
    }, over));
    var cuts = TE.Grid.computeCuts(s, { start: CLEAN[0], end: CLEAN[2] }, null);
    return { tiles: TE.Grid.computeTiles(cuts, CLEAN, s), s: s };
}

function ctx(over) {
    return merge({
        overhang: { left: mm(50), right: mm(50), top: mm(50), bottom: mm(50) },
        graphicCount: 1,
        scaleFactor: 1,
        mediaWidth: null,
        maxArtboard: 16200
    }, over || {});
}

console.log("\n=== clean job passes ===");
var j = job({});
var r = TE.Validate.check(j.tiles, ctx(), j.s);
assert(r.errors.length === 0, "no errors on a valid job");
assert(r.warnings.length === 0, "no warnings either");

console.log("\n=== add must not exceed the graphic overhang ===");
var r2 = TE.Validate.check(j.tiles, ctx({
    overhang: { left: mm(50), right: mm(10), top: mm(50), bottom: mm(50) }
}), j.s);
assert(has(r2.errors, "add-exceeds-overhang"), "add beyond the overhang is an error");

var r3 = TE.Validate.check(j.tiles, ctx({
    overhang: { left: mm(50), right: mm(40), top: mm(40), bottom: mm(40) }
}), j.s);
assert(r3.errors.length === 0, "add exactly equal to the overhang is fine");

var r4 = TE.Validate.check(j.tiles, ctx({
    overhang: { left: 0, right: mm(50), top: mm(50), bottom: mm(50) }
}), j.s);
assert(r4.errors.length === 0, "a flush edge needs no overhang");

console.log("\n=== overlap must be smaller than the shortest panel ===");
var jBig = job({ overlap: 1200 });
var r5 = TE.Validate.check(jBig.tiles, ctx(), jBig.s);
assert(has(r5.errors, "overlap-too-big"), "overlap wider than a panel is an error");

console.log("\n=== exactly one placed graphic ===");
var r6 = TE.Validate.check(j.tiles, ctx({ graphicCount: 0 }), j.s);
assert(has(r6.errors, "wrong-graphic-count"), "zero graphics is an error");
var r7 = TE.Validate.check(j.tiles, ctx({ graphicCount: 3 }), j.s);
assert(has(r7.errors, "wrong-graphic-count"), "several graphics is an error");

console.log("\n=== panel must fit an artboard at the output scale ===");
var j10 = job({ scaleN: 10, exportScale: "actual" });
var r8 = TE.Validate.check(j10.tiles, ctx({ scaleFactor: 1, maxArtboard: 100 }), j10.s);
assert(has(r8.errors, "artboard-too-big"), "panel beyond the artboard limit is an error");

console.log("\n=== Large Canvas source cannot export at source scale ===");
var jLC = job({ exportScale: "source" });
var r9 = TE.Validate.check(jLC.tiles, ctx({ scaleFactor: 10 }), jLC.s);
assert(has(r9.errors, "large-canvas-source-scale"),
    "Large Canvas with source scale is an error");

var r10 = TE.Validate.check(jLC.tiles, ctx({ scaleFactor: 1 }), jLC.s);
assert(r10.errors.length === 0, "a normal document at source scale is fine");

console.log("\n=== media width is a warning, not an error ===");
var r11 = TE.Validate.check(j.tiles, ctx({ mediaWidth: 800 }), j.s);
assert(r11.errors.length === 0, "narrow media does not stop the run");
assert(has(r11.warnings, "media-too-narrow"), "narrow media warns");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
