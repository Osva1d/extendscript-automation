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
        maxArtboard: 16200,
        hasCutSpot: true
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
assert(has(r8.exportErrors, "artboard-too-big"), "panel beyond the artboard limit blocks the export");
assert(!has(r8.errors, "artboard-too-big"), "but not Panels only, which never uses the output scale (N17)");

console.log("\n=== Large Canvas at \"same as document\" is allowed (N1) ===");
// It now means what the rulers show — real size on a Large Canvas — which a
// temporary document can hold. The old rule refused it outright.
var jLC = job({ exportScale: "source" });
var r9 = TE.Validate.check(jLC.tiles, ctx({ scaleFactor: 10 }), jLC.s);
assert(!has(r9.errors, "large-canvas-source-scale"),
    "Large Canvas with same-as-document output is no longer an error");
// (This fixture is 3000 mm in document coordinates, so at x10 it is a 30 m
// wall and the artboard check below rightly stops it — that is the next test,
// not a leftover of the old rule.)

var r10 = TE.Validate.check(jLC.tiles, ctx({ scaleFactor: 1 }), jLC.s);
assert(r10.errors.length === 0, "a normal document at source scale is fine");

console.log("\n=== the artboard check measures the size the export produces ===");
// Validation kept its own copy of the output-scale rule. On a Large Canvas at
// source scale it then measured the panel at a tenth of what got exported.
// The same panel: 1080 mm tall, 3061 pt at document size, 30 610 pt at x10.
var r10d = TE.Validate.check(jLC.tiles, ctx({ scaleFactor: 10, maxArtboard: 16200 }),
    merge(jLC.s, { exportScale: "actual" }));
assert(has(r10d.exportErrors, "artboard-too-big"), "x10 at 1:1 is measured at real size");
var jLC10 = job({ exportScale: "source" });
var r10e = TE.Validate.check(jLC10.tiles, ctx({ scaleFactor: 10, maxArtboard: 16200 }), jLC10.s);
assert(has(r10e.exportErrors, "artboard-too-big"),
    "x10 at same-as-document is measured at real size too, not at a tenth");

console.log("\n=== media width is a warning, not an error ===");
var r11 = TE.Validate.check(j.tiles, ctx({ mediaWidth: 800 }), j.s);
assert(r11.errors.length === 0, "narrow media does not stop the run");
assert(has(r11.warnings, "media-too-narrow"), "narrow media warns");

console.log("\n=== Zünd: barva řezu nemusí v dokumentu být ===");
// Without a contour in that colour the cut is the panel rectangle, and the
// export creates the spot in each panel document. Its absence is no error.
var jz = job({ zundMode: true, cutSpot: "Cut", cutBleed: 5 });
var rz = TE.Validate.check(jz.tiles, ctx(), jz.s);
assert(rz.errors.length === 0 && rz.exportErrors.length === 0, "rovný řez bez kontury projde");

console.log("\n=== Zünd: PDF musí na vnějších hranách unést přídavek + spad za řezem ===");
TE.L.ERR_BLEED_OVERHANG = "bleed-beyond-overhang";
// job(): adds top 40, bottom 40, right 40, left 0; ctx(): 50 mm everywhere.
var rb1 = TE.Validate.check(jz.tiles, ctx(), jz.s);
assert(!has(rb1.exportErrors, "bleed-beyond-overhang"), "40 + 5 <= 50: projde");
var jz15 = job({ zundMode: true, cutBleed: 15 });
var rb2 = TE.Validate.check(jz15.tiles, ctx(), jz15.s);
assert(has(rb2.exportErrors, "bleed-beyond-overhang"), "40 + 15 > 50: chyba exportu");
assert(!has(rb2.errors, "bleed-beyond-overhang"), "Jen pláty tím blokované není — masku kreslí export");
var rb3 = TE.Validate.check(jz.tiles, ctx({ overhang: { left: mm(3), right: mm(50), top: mm(50), bottom: mm(50) } }), jz.s);
assert(has(rb3.exportErrors, "bleed-beyond-overhang"), "hrana načisto potřebuje aspoň spad: 0 + 5 > 3");
var jn = job({ zundMode: false, cutBleed: 15 });
var rb4 = TE.Validate.check(jn.tiles, ctx(), jn.s);
assert(!has(rb4.exportErrors, "bleed-beyond-overhang"), "mimo Zünd režim se spad nekontroluje");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
