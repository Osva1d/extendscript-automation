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
    ERR_DPI_MIN:       "dpi-below-minimum",
    ERR_MARKS_OVERLAP: "marks-overlap",
    ERR_MARKS_ORIENT:  "marks-orient",
    ERR_MARKS_OUTSIDE: "marks-outside",
    format: function (t) { return t; }
};
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "config.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "grid.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "export.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "..", "shared", "lib", "cut_marks.js"), "utf8"));
buildCutMarks(TE);
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

function job(over, clean) {
    var c = clean || CLEAN;
    var s = merge(D, merge({
        direction: "horizontal", divideMode: "count", tileCount: 3,
        overlap: 20, overlapMode: "symmetric",
        addTop: 40, addBottom: 40, addLeft: 0, addRight: 40
    }, over));
    var cuts = TE.Grid.computeCuts(s, { start: c[0], end: c[2] }, null);
    return { tiles: TE.Grid.computeTiles(cuts, c, s), s: s };
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

console.log("\n=== N23: rastr pod 72 DPI blokuje export ===");
// Illustrator rasterises from 72 DPI up (71 fails, 72 passes — measured).
// Below that every panel used to fail on its own with a raw DOM message.
var jr71 = job({ exportMode: "raster", rasterDPI: 71 });
var rr71 = TE.Validate.check(jr71.tiles, ctx(), jr71.s);
assert(has(rr71.exportErrors, "dpi-below-minimum"), "71 DPI: Illustrator ho nepřijme, export je blokovaný");
assert(!has(rr71.errors, "dpi-below-minimum"), "Jen pláty nic nerastrují a zůstávají dostupné");
var jr72 = job({ exportMode: "raster", rasterDPI: 72 });
assert(!has(TE.Validate.check(jr72.tiles, ctx(), jr72.s).exportErrors, "dpi-below-minimum"), "72 DPI projde");
var jrv = job({ exportMode: "vector", rasterDPI: 10 });
assert(!has(TE.Validate.check(jrv.tiles, ctx(), jrv.s).exportErrors, "dpi-below-minimum"),
    "ve vektorovém exportu na rozlišení nezáleží");

console.log("\n=== N26: Zünd značky, které by na tisku splynuly, blokují export ===");
// A 240 mm graphic in three 80 mm panels, no overlap or adds: the mask is
// 90 mm wide. The orientation dot sits 100 + 5 mm right of the bottom-left
// mark, and the bottom-right mark is 90 + 2 x (5 gap + 2.5 radius) = 105 mm
// away — the two land on each other. Default settings otherwise.
var flat = { zundMode: true, overlap: 0, addTop: 0, addBottom: 0, addLeft: 0, addRight: 0 };
var jzOk = job({ zundMode: true });
assert(TE.Validate.markConflict(jzOk.tiles, ctx(), jzOk.s) === null, "běžné pláty po 1000 mm: bez kolize");
var rzOk = TE.Validate.check(jzOk.tiles, ctx(), jzOk.s);
assert(!has(rzOk.exportErrors, "marks-orient") && !has(rzOk.exportErrors, "marks-overlap"),
    "a dialog nic nehlásí");

var jNar = job(flat, [0, mm(1000), mm(240), 0]);
var cNar = TE.Validate.markConflict(jNar.tiles, ctx(), jNar.s);
assert(cNar !== null && cNar.type === "orient", "pláty po 80 mm: orientační bod na rohové značce");
assert(cNar !== null && cNar.index === 1 && cNar.dist < 0.01, "hlášen plát 1, středy v jednom bodě");
var rNar = TE.Validate.check(jNar.tiles, ctx(), jNar.s);
assert(has(rNar.exportErrors, "marks-orient"), "chyba exportu");
assert(!has(rNar.errors, "marks-orient"), "Jen pláty značky nekreslí, zůstávají dostupné");
var jNarOff = job(merge(flat, { zundMode: false }), [0, mm(1000), mm(240), 0]);
assert(!has(TE.Validate.check(jNarOff.tiles, ctx(), jNarOff.s).exportErrors, "marks-orient"),
    "mimo Zünd režim se značky nekontrolují");

// Only the last panel is narrow: the message names that panel, not panel 1.
var jLast = job(merge(flat, { divideMode: "width", tileWidth: 1000 }), [0, mm(1000), mm(2080), 0]);
var cLast = TE.Validate.markConflict(jLast.tiles, ctx(), jLast.s);
assert(jLast.tiles.length === 3, "šířka 1000 na 2080 mm: tři pláty (1000, 1000, 80)");
assert(cLast !== null && cLast.index === 3, "kolize je jen na posledním, úzkém plátu");

// The marks are checked in real millimetres whatever the scale (N11): the
// same job drawn 1:10 collides the same, at either output scale.
var jN10 = job(merge(flat, { scaleN: 10 }), [0, mm(100), mm(24), 0]);
var cN10 = TE.Validate.markConflict(jN10.tiles, ctx(), jN10.s);
assert(cN10 !== null && cN10.type === "orient", "1:10, výstup jako dokument: stejná kolize");
var jN10a = job(merge(flat, { scaleN: 10, exportScale: "actual" }), [0, mm(100), mm(24), 0]);
var cN10a = TE.Validate.markConflict(jN10a.tiles, ctx(), jN10a.s);
assert(cN10a !== null && cN10a.type === "orient", "1:10, výstup 1:1: stejná kolize");

// Spacing below the mark diameter merges neighbours along an edge. Small
// panels (50 mm) keep the count under the live limit: about 80 marks.
var jSm = job(merge(flat, { maxDist: 4 }), [0, mm(50), mm(150), 0]);
assert(has(TE.Validate.check(jSm.tiles, ctx(), jSm.s).exportErrors, "marks-overlap"),
    "rozteč 4 mm u značky 5 mm: značky splynou");

// findMarkConflict compares every pair of marks. The dialog re-checks on
// every keystroke, so a panel with more marks than the live limit is left to
// main.js, which checks once before the export, without the limit.
var jMany = job({ zundMode: true, maxDist: 4 });
assert(!has(TE.Validate.check(jMany.tiles, ctx(), jMany.s).exportErrors, "marks-overlap"),
    "plát s tisíci značek dialog nekontroluje");
var cMany = TE.Validate.markConflict(jMany.tiles, ctx(), jMany.s);
assert(cMany !== null && cMany.type === "overlap", "kontrola před exportem bez limitu ho najde");
assert(TE.Validate.describeMarkConflict(cMany, jMany.s) === "marks-overlap", "a hlášení odpovídá typu");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
