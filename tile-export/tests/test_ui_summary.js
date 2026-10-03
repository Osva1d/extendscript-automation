#!/usr/bin/env node
/**
 * TE.UI.refresh — the text of the Result field, and TE.Utils.formatMM behind it.
 * Runs the real refresh() against stand-in controls, on the test sheet from
 * tools/make-test-document.jsx: 3000 x 1000 mm at 1:10, 50 mm bleed.
 */
var fs = require("fs");
var path = require("path");

var TE = {};
global.app = { documents: { length: 1 }, activeDocument: { scaleFactor: 1 }, locale: "cs_CZ" };
function load(rel) { eval.call(global, fs.readFileSync(path.join(__dirname, "..", rel), "utf8")); }
global.TE = TE;
load("src/locale.js");
load("src/lib/utils.js");
load("src/lib/validation.js");
load("../shared/lib/cut_marks.js");
global.buildCutMarks(TE);
load("src/config.js");
load("src/grid.js");
load("src/export.js");
load("src/ui.js");

var pass = 0, fail = 0, total = 0;
function eq(got, want, msg) {
    total++;
    if (got === want) { pass++; } else { fail++; console.log("  FAIL: " + msg + " | got=" + got + " expected=" + want); }
}
function has(text, needle, msg) {
    total++;
    if (text.indexOf(needle) !== -1) { pass++; }
    else { fail++; console.log("  FAIL: " + msg + " | missing \"" + needle + "\" in:\n" + text); }
}

/** Stand-in controls, set to the test plan's baseline plus overrides. */
function refs(o) {
    function et(v) { return { text: String(v), enabled: true }; }
    function cb(v) { return { value: !!v, enabled: true }; }
    function rb(n, on) { var a = [], i; for (i = 0; i < n; i++) { a.push({ value: i === on }); } return a; }
    var r = {
        cbScale: cb(true), etScaleN: et(10),
        rbDir: rb(2, 0), rbMode: rb(3, 0),
        etCount: et(3), etWidth: et(1000), cbEqual: cb(false),
        etRound: et(0), etOverlap: et(20), rbOverlapMode: rb(3, 0),
        etAddTop: et(0), etAddBottom: et(0), etAddLeft: et(0), etAddRight: et(0),
        rbExpMode: rb(2, 0), rbExpScale: rb(2, 0), etDPI: et(150),
        cbLine: cb(true), etSpot: et("CutContour"), etLineW: et(0.3),
        ddPdf: { selection: null }, etOut: et(""), etPattern: et("{doc}_{n}"),
        cbSkip: cb(true), cbZund: null,
        etCleanW: et(""), etCleanH: et(""),
        stCalc: { text: "" }, btnTiles: { enabled: true }, btnExport: { enabled: true }
    };
    var k;
    for (k in o) { if (o.hasOwnProperty(k)) { r[k] = o[k]; } }
    return r;
}

var mm10 = function (real) { return TE.Utils.mm2pt(real / 10); };
var bleed = mm10(50);
var ctx = {
    cleanRect: [0, mm10(1000), mm10(3000), 0],
    spotNames: ["CutContour"], guides: [],
    validation: { overhang: { left: bleed, right: bleed, top: bleed, bottom: bleed },
        graphicCount: 1, scaleFactor: 1, mediaWidth: null, maxArtboard: 16200, hasCutSpot: true }
};
function summary(o) { var r = refs(o); TE.UI.refresh(null, r, ctx); return r.stCalc.text; }

console.log("\n=== formatMM ===");
eq(TE.Utils.formatMM(1026.6667, ","), "1026,7", "one decimal, Czech comma");
eq(TE.Utils.formatMM(1026.6667, "."), "1026.7", "one decimal, English point");
eq(TE.Utils.formatMM(1000, ","), "1000", "a whole number carries no ,0");
eq(TE.Utils.formatMM(999.96, ","), "1000", "rounding up to a whole number drops the ,0 too");
eq(TE.Utils.formatMM(0.04, ","), "0", "tiny values round to 0, not -0 or 0,0");
eq(TE.Utils.formatMM(-12.25, ","), "-12,3", "negative values keep their sign");
eq(TE.Utils.formatMM(976.6667), "976.7", "separator defaults to a point");

console.log("\n=== the report: T3.2 showed whole millimetres ===");
// Equal panels with adds 40/40/0/40 print 1026.67 mm each. Whole millimetres
// showed 1027, which the plan could not be checked against and which, three
// panels later, adds up to 3081 mm of material instead of 3080.
var t32 = summary({ cbEqual: { value: true, enabled: true },
    etAddTop: { text: "40" }, etAddBottom: { text: "40" }, etAddRight: { text: "40" } });
has(t32, "1: načisto 1016,7 × 1000 mm, s přídavky 1026,7 × 1080 mm", "panel 1");
has(t32, "2: načisto 1006,7 × 1000 mm, s přídavky 1026,7 × 1080 mm", "panel 2");
has(t32, "3: načisto 976,7 × 1000 mm, s přídavky 1026,7 × 1080 mm", "panel 3");

console.log("\n=== whole millimetres still read as whole millimetres ===");
var t11 = summary({});
has(t11, "Čistý formát: 3000 × 1000 mm", "clean format");
has(t11, "1: načisto 1000 × 1000 mm, s přídavky 1010 × 1000 mm", "T1.1 panel 1 has no ,0");
has(t11, "Dostupný spad: vlevo 50, vpravo 50, nahoře 50, dole 50 mm", "bleed line");

console.log("\n=== error messages carry the same precision ===");
// Since the decimal comma is read, a 12,5 mm overlap is a real value — and a
// message that rounds it to 13 would be quoting a number nobody typed.
var tErr = summary({ etOverlap: { text: "1000,5" } });
has(tErr, "Přelep (1000,5 mm) musí být menší než nejkratší plát (1000 mm).",
    "overlap error quotes what was typed");
var tAdd = summary({ etAddLeft: { text: "52,5" } });
has(tAdd, "(52,5 mm)", "add error quotes what was typed");

console.log("\n=== N2: a bad panel width says so, not 'cut positions' ===");
var widthMode = [{ value: false }, { value: true }, { value: false }];
var t71 = summary({ rbMode: widthMode, etWidth: { text: "0", enabled: true } });
has(t71, "\u2717 Šířka plátu musí být kladné číslo.", "R7.1: zero width");
eq(t71.indexOf("Pozice švů") === -1, true, "and not the cut-order message");
var t72 = summary({ rbMode: widthMode, etWidth: { text: "15", enabled: true },
    cbEqual: { value: true, enabled: true } });
has(t72, "\u2717 Se zaškrtnutým Rovnoměrně je šířka plátu stropem tiskové šířky a musí být větší než přelep.",
    "R7.2: a ceiling at or under the overlap");

console.log("\n=== N3: the edge is named in Czech, and the sentence reads ===");
var t73 = summary({ etAddLeft: { text: "60" } });
has(t73, "\u2717 Přídavek vlevo (60 mm) překračuje přesah grafiky (50 mm).", "R7.3: left");
has(summary({ etAddBottom: { text: "60" } }), "Přídavek dole (60 mm)", "bottom");
has(summary({ etAddRight: { text: "60" } }), "Přídavek vpravo (60 mm)", "right");
has(summary({ etAddTop: { text: "60" } }), "Přídavek nahoře (60 mm)", "top");

console.log("\n=== N16: the summary shows what the output scale does ===");
// The panel lines are in real millimetres and do not move with the output
// scale; only the PDF page does. Without this line the choice was invisible
// until the export (R3.1 looked exactly like R3.2).
has(summary({}), "Stránky PDF (1:10): 101 × 100 | 102 × 100 | 101 × 100 mm", "1:10 sheet, same as document");
has(summary({ rbExpScale: [{ value: false }, { value: true }] }),
    "Stránky PDF: skutečná velikost, stejná jako s přídavky.", "1:1 output repeats no sizes");
has(summary({ etScaleN: { text: "12,5", enabled: true } }), "Stránky PDF (1:12,5):", "a decimal scale keeps its comma");

console.log("\n=== Zünd: pages carry the marks, and the cut is named ===");
// Defaults: bleed 5 past the cut, marks 5 mm, 5 mm clear of the mask, so
// the page grows by 15 mm per side. The test sheet is 1:10.
function zund(extra) {
    var o = { cbZund: { value: true, enabled: true },
        ddCutSpot: { selection: { text: "Cut" } }, ddMarkColor: { selection: { text: "[Registration]" } },
        etMarkSize: { text: "5" }, etGapInner: { text: "5" }, etMaxDist: { text: "500" },
        etOrient: { text: "100" }, etBleed: { text: "5" } };
    var k; for (k in extra) { if (extra.hasOwnProperty(k)) { o[k] = extra[k]; } }
    return o;
}
ctx.contourSpots = [];
var tz = summary(zund({}));
has(tz, "Stránky PDF (1:10) se značkami: 104 × 103 | 105 × 103 | 104 × 103 mm", "pages with marks");
has(tz, "Řez: obdélník plátu v barvě Cut.", "no contour: the panel rectangle is cut");
ctx.contourSpots = ["Cut"];
var tzc = summary(zund({}));
has(tzc, "! Dokument má cesty v barvě Cut. Tvarový ořez v této verzi ještě není", "a contour is announced as not cut yet");
has(tzc, "Řez: obdélník plátu v barvě Cut.", "and the rectangle is still what gets cut");
ctx.contourSpots = [];
has(summary(zund({ etBleed: { text: "10" } })), "se značkami: 105 × 104 |", "bleed 10 grows the page by 1 mm a side at 1:10");
// Adds are part of the panel, so they are part of the cut: the cut is the
// printed panel (clean + adds + overlap), where the red line lies in the
// ordinary mode, and the bleed past the cut comes on top. Add right 40 and
// top 40 at 1:10: panel 3 cuts 1050 x 1040, its page is 1080 x 1070 = 108 x 107.
has(summary(zund({ etAddRight: { text: "40" }, etAddTop: { text: "40" } })),
    "Stránky PDF (1:10) se značkami: 104 × 107 | 105 × 107 | 108 × 107 mm", "adds widen the cut and the page");

console.log("\n=== N26: marks that would merge are named before the export ===");
// Three 80 mm panels without overlap: the mask is 90 mm wide and the
// orientation dot lands on the bottom-right mark (see test_validation).
var rOk = refs(zund({}));
TE.UI.refresh(null, rOk, ctx);
eq(rOk.stCalc.text.indexOf("✗") === -1 && rOk.btnExport.enabled, true,
    "the default Zünd job has no conflict and can be exported");
var rNar = refs(zund({ etCleanW: { text: "240" }, etCleanH: { text: "1000" }, etOverlap: { text: "0" } }));
TE.UI.refresh(null, rNar, ctx);
has(rNar.stCalc.text, "✗ Plát 1: orientační bod by se dotýkal jiné značky nebo ji překrýval (středy 0 mm od sebe, průměr 5 mm)",
    "the message names the panel, the distance and the diameter");
eq(rNar.btnExport.enabled, false, "and the export is blocked");
eq(rNar.btnTiles.enabled, true, "Panels only draws no marks and stays available");

console.log("\n=== N23: raster resolution below 72 DPI ===");
var rDpi = refs({ rbExpMode: [{ value: false }, { value: true }], etDPI: { text: "71", enabled: true } });
TE.UI.refresh(null, rDpi, ctx);
has(rDpi.stCalc.text, "✗ Rozlišení 71 DPI je příliš nízké: Illustrator rastruje až od 72 DPI.",
    "the message says what the minimum is");
eq(rDpi.btnExport.enabled, false, "and the export is blocked");
eq(rDpi.btnTiles.enabled, true, "Panels only rasterises nothing");

console.log("\n=== T6.3b: the artboard message says what is too big (N6) ===");
// Large Canvas x10 with manual 1:10, 1:1 output: the panel is 20 m wide and
// 10 m tall. The old message named neither, so nobody could tell that more
// panels would not help — it is the height that overflows.
app.activeDocument.scaleFactor = 10;
var lcCtx = {
    cleanRect: [0, TE.Utils.mm2pt(100), TE.Utils.mm2pt(600), 0],
    spotNames: ["CutContour"], guides: [],
    validation: { overhang: { left: bleed, right: bleed, top: bleed, bottom: bleed },
        graphicCount: 1, scaleFactor: 10, mediaWidth: null, maxArtboard: 16200, hasCutSpot: true }
};
var r63 = refs({ cbScale: { value: true, enabled: true }, etScaleN: { text: "10" },
    rbExpScale: [{ value: false }, { value: true }] });
TE.UI.refresh(null, r63, lcCtx);
has(r63.stCalc.text,
    "Plát 1 by při tomto měřítku výstupu měřil 20010 × 10000 mm; artboard Illustratoru unese nejvýš 5715 mm na stranu.",
    "the message names the panel, its size and the limit");
eq(r63.btnExport.enabled, false, "and the export stays blocked");
eq(r63.btnTiles.enabled, true, "Panels only stays available: it draws at the document's own scale (N17)");

console.log("\n=== T6.2a: Large Canvas at same-as-document now just works (N1) ===");
var r62 = refs({ cbScale: { value: false, enabled: true } });
TE.UI.refresh(null, r62, lcCtx);
eq(r62.btnExport.enabled, true, "no Large Canvas error, export enabled");
eq(r62.stCalc.text.indexOf("Large Canvas") === -1, true, "and the old message is gone");
has(r62.stCalc.text, "Stránky PDF: skutečná velikost", "Large Canvas at same-as-document prints real size (N16)");
var r43 = refs({ cbScale: { value: true, enabled: true }, etScaleN: { text: "10" } });
TE.UI.refresh(null, r43, lcCtx);
has(r43.stCalc.text, "Stránky PDF (1:10): 2001 × 1000 | 2002 × 1000 | 2001 × 1000 mm",
    "R4.3: Large Canvas with manual 1:10 is a 1:10 preview");
app.activeDocument.scaleFactor = 1;

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
