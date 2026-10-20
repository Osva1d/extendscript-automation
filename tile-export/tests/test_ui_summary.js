#!/usr/bin/env node
/**
 * TE.UI.refresh — the Result: its status line, its table of panels and the
 * details under them — and TE.Utils.formatMM behind it.
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
load("../shared/lib/numbers.js");
global.buildNumbers(TE);
load("../shared/lib/field_paint.js");
global.buildFieldPaint(TE);
load("src/lib/validation.js");
load("../shared/lib/cut_marks.js");
global.buildCutMarks(TE);
load("src/config.js");
load("src/grid.js");
load("src/export.js");
load("src/ui.js");
// No file system here: every folder exists unless a test says otherwise.
var folders = { missing: {} };
TE.UI.folderExists = function (path) { return !folders.missing[path]; };

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

/** A listbox stand-in: removeAll() and add() with three sub-items. */
function listbox() {
    var lb = { items: [] };
    lb.removeAll = function () { lb.items = []; };
    lb.add = function (type, text) {
        var it = { text: text, subItems: [{ text: "" }, { text: "" }, { text: "" }] };
        lb.items.push(it);
        return it;
    };
    return lb;
}

/** Stand-in controls, set to the test plan's baseline plus overrides. */
function refs(o) {
    function et(v) { return { text: String(v), enabled: true }; }
    function cb(v) { return { value: !!v, enabled: true }; }
    function rb(n, on) { var a = [], i; for (i = 0; i < n; i++) { a.push({ value: i === on }); } return a; }
    var r = {
        etScaleN: et(10),
        rbDir: rb(2, 0), rbMode: rb(3, 0),
        etCount: et(3), etWidth: et(1000), cbEqual: cb(false),
        etRound: et(0), etOverlap: et(20), rbOverlapMode: rb(3, 0),
        etAddTop: et(0), etAddBottom: et(0), etAddLeft: et(0), etAddRight: et(0),
        rbExpMode: rb(2, 0), rbExpScale: rb(2, 0), etDPI: et(150),
        cbLine: cb(true), etSpot: et("CutContour"), etLineW: et(0.3),
        ddPdf: { selection: null }, etOut: et("/Users/shop/out"), etPattern: et("{doc}_{n}"),
        cbSkip: cb(true), cbOpen: cb(false), rbOutType: null,
        gManual: { visible: true }, gZundFields: { visible: false },
        gScaleRow: { visible: true }, gScaleOne: { visible: false },
        stCleanInfo: { text: "" }, stBleedInfo: { text: "" }, stBleedInfo2: { text: "" }, stWidthLbl: { text: "", helpTip: "" },
        stStatus: { text: "" }, lbTiles: listbox(),
        stCalc: { text: "" }, btnTiles: { enabled: true }, btnExport: { enabled: true }
    };
    var k;
    for (k in o) { if (o.hasOwnProperty(k)) { r[k] = o[k]; } }
    return r;
}

var mm10 = function (real) { return TE.Utils.mm2pt(real / 10); };
var bleed = mm10(50);
var ctx = {
    cleanRect: [0, mm10(1000), mm10(3000), 0], docName: "arch",
    spotNames: ["CutContour"],
    guidesByDirection: { horizontal: { positions: [] }, vertical: { positions: [] } },
    validation: { overhang: { left: bleed, right: bleed, top: bleed, bottom: bleed },
        graphicCount: 1, scaleFactor: 1, mediaWidth: null, maxArtboard: 16200, hasCutSpot: true }
};
/** The whole Result as text: status, one "a | b | c | d" line per row, details. */
function text(r) {
    var rows = [], i, it;
    for (i = 0; i < r.lbTiles.items.length; i++) {
        it = r.lbTiles.items[i];
        rows.push(it.text + " | " + it.subItems[0].text + " | " + it.subItems[1].text + " | " + it.subItems[2].text);
    }
    return r.stStatus.text + "\n" + rows.join("\n") + "\n" + r.stCalc.text;
}
function summary(o) { var r = refs(o); TE.UI.refresh(null, r, ctx); return text(r); }

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
has(t32, "1 | 1016,7 × 1000 | 1026,7 × 1080 |", "panel 1");
has(t32, "2 | 1006,7 × 1000 | 1026,7 × 1080 |", "panel 2");
has(t32, "3 | 976,7 × 1000 | 1026,7 × 1080 |", "panel 3");

console.log("\n=== whole millimetres still read as whole millimetres ===");
var t11 = summary({});
has(t11, "1 | 1000 × 1000 | 1010 × 1000 |", "T1.1 panel 1 has no ,0");

console.log("\n=== 1.1.0: the Document panel shows what TE found ===");
// Clean format and available bleed moved from the Result into the Document
// panel, in real millimetres, and show even when the split cannot be made.
var rDoc = refs({});
TE.UI.refresh(null, rDoc, ctx);
eq(rDoc.stCleanInfo.text, "3000 × 1000 mm", "clean format at real size");
eq(rDoc.stBleedInfo.text + " | " + rDoc.stBleedInfo2.text, "vlevo 50, vpravo 50 mm | nahoře 50, dole 50 mm",
    "available bleed on each edge, in two lines (N49)");
eq(rDoc.stCalc.text.indexOf("Čistý formát") === -1 && rDoc.stCalc.text.indexOf("Dostupný spad") === -1, true,
    "and the Result no longer repeats them");
var rDocErr = refs({ etCount: { text: "1", enabled: true } });
TE.UI.refresh(null, rDocErr, ctx);
eq(rDocErr.stCleanInfo.text === "3000 × 1000 mm" && rDocErr.stCalc.text.indexOf("✗") === 0, true,
    "a split that fails still leaves the document info in place");

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

console.log("\n=== 1.1.0: the output scale carries the drawing's number ===");
// "Same as document" meant 1:10 for a drawing at 1:10 and real size for a
// Large Canvas. The option now names the number; a 1:1 drawing has no choice.
var rs10 = refs({});
TE.UI.refresh(null, rs10, ctx);
eq(rs10.rbExpScale[0].text, "1:10 jako kresba", "1:10 drawing: the option reads 1:10 jako kresba");
eq(rs10.gScaleRow.visible && !rs10.gScaleOne.visible, true, "and the choice is shown");
var rs125 = refs({ etScaleN: { text: "12,5", enabled: true } });
TE.UI.refresh(null, rs125, ctx);
eq(rs125.rbExpScale[0].text, "1:12,5 jako kresba", "a decimal scale keeps its comma");
var rs1 = refs({ etScaleN: { text: "1", enabled: true } });
TE.UI.refresh(null, rs1, ctx);
eq(!rs1.gScaleRow.visible && rs1.gScaleOne.visible, true, "1:1 drawing: no choice, the row says 1:1");

console.log("\n=== N16: the summary shows what the output scale does ===");
// The panel lines are in real millimetres and do not move with the output
// scale; only the PDF page does. Without this line the choice was invisible
// until the export (R3.1 looked exactly like R3.2).
var t16 = summary({});
has(t16, "1 | 1000 × 1000 | 1010 × 1000 | 101 × 100", "1:10 sheet: a panel and its page on one line");
has(t16, "2 | 1000 × 1000 | 1020 × 1000 | 102 × 100", "panel 2");
has(t16, "3 | 1000 × 1000 | 1010 × 1000 | 101 × 100", "panel 3, not merged with panel 1 two rows up");
has(summary({ rbExpScale: [{ value: false }, { value: true }] }),
    "1 | 1000 × 1000 | 1010 × 1000 | 1010 × 1000", "1:1 output: the page is the panel with its adds");
has(summary({ etScaleN: { text: "12,5", enabled: true } }), "výstup 1:12,5.", "a decimal scale keeps its comma");

console.log("\n=== Zünd: pages carry the marks, and the cut is named ===");
// Defaults: bleed 5 past the cut, marks 5 mm, 5 mm clear of the mask, so
// the page grows by 15 mm per side. The test sheet is 1:10.
function zund(extra) {
    var o = { rbOutType: [{ value: false }, { value: true }],
        ddCutSpot: { selection: { text: "Cut" } }, ddMarkColor: { selection: { text: "[Registration]" } },
        etMarkSize: { text: "5" }, etGapInner: { text: "5" }, etMaxDist: { text: "500" },
        etOrient: { text: "100" }, etBleed: { text: "5" } };
    var k; for (k in extra) { if (extra.hasOwnProperty(k)) { o[k] = extra[k]; } }
    return o;
}
ctx.contourSpots = [];
var tz = summary(zund({}));
has(tz, "1 | 1000 × 1000 | 1010 × 1000 | 104 × 103", "pages with marks");
has(tz, "2 | 1000 × 1000 | 1020 × 1000 | 105 × 103", "panel 2");
has(tz, "Značky v barvě „[Registration]“, rovný ořez v barvě „Cut“.", "no contour: a straight cut");
// A stored cut colour the document lacks shows as "(chybí)" and is said in
// the Result: the export creates it, a "cut" for "Cut" must not go unseen.
var missingCut = { text: "cut  (chybí)", teMissing: true, teRawValue: "cut" };
var tmc = summary(zund({ ddCutSpot: { selection: missingCut } }));
has(tmc, "⚠ Připraveno k exportu, 1 upozornění níže.", "the status line warns");
has(tmc, "⚠ Barva řezu „cut“ v dokumentu není, export ji založí. Zkontrolujte, že ji Cut Center zná.",
    "the details name the colour");
has(tmc, "rovný ořez v barvě „cut“.", "and the run uses the stored name");
eq(summary(zund({})).indexOf("v dokumentu není") === -1, true, "a colour from the list is not warned about");
// A mark colour the document lacks: the marks go in registration, said so.
var missingMark = { text: "Bílá  (chybí)", teMissing: true, teRawValue: "Bílá" };
var tmm = summary(zund({ ddMarkColor: { selection: missingMark } }));
has(tmm, "⚠ Barva značek „Bílá“ v dokumentu není, značky budou v registrační.", "the marks' colour is warned about");
has(tmm, "⚠ Připraveno k exportu, 1 upozornění níže.", "and the export can still run");
// A PDF preset this Illustrator lacks would fail to save every panel (N20):
// the export waits for another preset, Panels only writes no PDF.
var missingPdf = { text: "Dílna bez komprese  (chybí)", teMissing: true, teRawValue: "Dílna bez komprese" };
var rPdf = refs({ ddPdf: { selection: missingPdf } });
TE.UI.refresh(null, rPdf, ctx);
has(rPdf.stCalc.text, "✗ PDF preset „Dílna bez komprese“ v tomto Illustratoru není a export by s ním PDF neuložil. Vyberte jiný preset.",
    "the missing preset is named");
has(rPdf.stStatus.text, "✗ Export nejde, Jen pláty ano: 1 chyba, viz níže.", "the status line says the export cannot run");
eq(rPdf.btnExport.enabled === false && rPdf.btnTiles.enabled === true, true, "it stops the export only");
ctx.contourSpots = ["Cut"];
var tzc = summary(zund({}));
has(tzc, "⚠ Dokument má cesty v barvě „Cut“. Tvarový ořez v této verzi ještě není", "a contour is announced as not cut yet");
has(tzc, "— použije se rovný ořez.", "a contour is not cut: the straight cut is used");
has(tzc, "rovný ořez v barvě „Cut“.", "and the details still name the straight cut");
ctx.contourSpots = [];
has(summary(zund({ etBleed: { text: "10" } })), "1 | 1000 × 1000 | 1010 × 1000 | 105 × 104",
    "bleed 10 grows the page by 1 mm a side at 1:10");
// Adds are part of the panel, so they are part of the cut: the cut is the
// printed panel (clean + adds + overlap), where the red line lies in the
// ordinary mode, and the bleed past the cut comes on top. Add right 40 and
// top 40 at 1:10: panel 3 cuts 1050 x 1040, its page is 1080 x 1070 = 108 x 107.
has(summary(zund({ etAddRight: { text: "40" }, etAddTop: { text: "40" } })),
    "3 | 1000 × 1000 | 1050 × 1040 | 108 × 107", "adds widen the cut and the page");

console.log("\n=== N26: marks that would merge are named before the export ===");
// Panel width 1460 on the 3000 mm sheet, no overlap: panels of 1460, 1460
// and 80 mm. The last mask is 90 mm wide and its orientation dot lands on
// the bottom-right mark (see test_validation). The manual test uses this row.
var rOk = refs(zund({}));
TE.UI.refresh(null, rOk, ctx);
eq(rOk.stCalc.text.indexOf("✗") === -1 && rOk.btnExport.enabled, true,
    "the default Zünd job has no conflict and can be exported");
var rNar = refs(zund({ rbMode: widthMode, etWidth: { text: "1460", enabled: true }, etOverlap: { text: "0" } }));
TE.UI.refresh(null, rNar, ctx);
has(rNar.stCalc.text, "✗ Plát 3: orientační značka by se dotýkala jiné značky nebo ji překrývala (středy 0 mm od sebe, průměr 5 mm)",
    "the message names the narrow panel, the distance and the diameter");
eq(rNar.btnExport.enabled, false, "and the export is blocked");
eq(rNar.btnTiles.enabled, true, "Panels only draws no marks and stays available");

console.log("\n=== 1.1.0: one output type, only its fields show (N28) ===");
// Manual trim and Zünd exclude each other. The cut path takes the line's
// place, so in Zünd mode the line's fields are not shown at all.
var rL = refs(zund({}));
TE.UI.refresh(null, rL, ctx);
eq(rL.gManual.visible === false && rL.gZundFields.visible === true, true,
    "Zünd shows the Zünd fields and hides the trim line");
eq(TE.UI.collect(rL).drawLine, true, "hidden, the line's stored choice stays as it was");
// The real dialog builds the Zünd fields whenever it offers the choice.
var manual = [{ value: true }, { value: false }];
var rL2 = refs(zund({ rbOutType: manual }));
TE.UI.refresh(null, rL2, ctx);
eq(rL2.gManual.visible === true && rL2.gZundFields.visible === false, true,
    "manual trim shows the line and hides the Zünd fields");
eq(TE.UI.collect(rL2).zundMode, false, "and is read as manual trim");
eq(rL2.etSpot.enabled && rL2.etLineW.enabled, true, "the line's fields follow its checkbox");
var rL3 = refs(zund({ rbOutType: manual, cbLine: { value: false, enabled: true } }));
TE.UI.refresh(null, rL3, ctx);
eq(rL3.etSpot.enabled || rL3.etLineW.enabled, false, "with no line the colour and width grey out");

console.log("\n=== N23: raster resolution below 72 DPI ===");
var rDpi = refs({ rbExpMode: [{ value: false }, { value: true }], etDPI: { text: "71", enabled: true } });
TE.UI.refresh(null, rDpi, ctx);
has(rDpi.stCalc.text, "✗ Rozlišení 71 DPI je příliš nízké: Illustrator rastruje až od 72 DPI.",
    "the message says what the minimum is");
eq(rDpi.btnExport.enabled, false, "and the export is blocked");
eq(rDpi.btnTiles.enabled, true, "Panels only rasterises nothing");

console.log("\n=== N38: the preview reads the guides of the chosen direction ===");
// The run splits on the guides across the cuts: vertical ones for Svisle,
// horizontal ones for Vodorovně. The preview read the vertical ones for both,
// so horizontal guides alone greyed out both buttons for Vodorovně, and with
// both kinds it previewed a split the run never made.
var guidesMode = [{ value: false }, { value: false }, { value: true }];
var stacked = [{ value: false }, { value: true }];
ctx.guidesByDirection = { horizontal: { positions: [mm10(1000)] }, vertical: { positions: [mm10(400)] } };
var t38v = summary({ rbDir: stacked, rbMode: guidesMode });
has(t38v, "1 | 3000 × 600 | 3000 × 610 |", "Vodorovně splits on the horizontal guide: top panel");
has(t38v, "2 | 3000 × 400 | 3000 × 410 |", "and bottom panel");
var t38s = summary({ rbMode: guidesMode });
has(t38s, "1 | 1000 × 1000 | 1010 × 1000 |", "Svisle splits on the vertical guide: left panel");
has(t38s, "2 | 2000 × 1000 | 2010 × 1000 |", "and right panel");
ctx.guidesByDirection = { horizontal: { positions: [] }, vertical: { positions: [mm10(400)] } };
var r38 = refs({ rbDir: stacked, rbMode: guidesMode });
TE.UI.refresh(null, r38, ctx);
eq(r38.btnTiles.enabled && r38.btnExport.enabled, true, "horizontal guides alone are enough for Vodorovně");
ctx.guidesByDirection = { horizontal: { positions: [] }, vertical: { positions: [] } };

console.log("\n=== N40: stacked panels split the height, and the dialog says so ===");
var r40s = refs({ rbMode: widthMode });
TE.UI.refresh(null, r40s, ctx);
eq(r40s.stWidthLbl.text, "Šířka plátu:", "Svisle: the field is the panel width");
var r40v = refs({ rbDir: stacked, rbMode: widthMode });
TE.UI.refresh(null, r40v, ctx);
eq(r40v.stWidthLbl.text, "Výška plátu:", "Vodorovně: the field is the panel height");
eq(r40v.etWidth.helpTip.indexOf("Výška plátu načisto") === 0, true, "and so is its tooltip");
// The reported case: 1000 mm on a graphic 1000 mm tall is one panel.
has(summary({ rbDir: stacked, rbMode: widthMode, etWidth: { text: "1000", enabled: true } }),
    "✗ Výška plátu 1000 mm dá jen 1 plát: grafika měří ve směru dělení 1000 mm.",
    "one panel: the message names the height and how tall the artwork is");
has(summary({ rbMode: widthMode, etWidth: { text: "3000", enabled: true } }),
    "✗ Šířka plátu 3000 mm dá jen 1 plát: grafika měří ve směru dělení 3000 mm.",
    "the same going across names the width");
has(summary({ rbDir: stacked, rbMode: widthMode, etWidth: { text: "0", enabled: true } }),
    "✗ Výška plátu musí být kladné číslo.", "a bad height says height");
has(summary({ etCount: { text: "1", enabled: true } }), "✗ Jsou potřeba aspoň 2 pláty.",
    "a count of one keeps the general message");

console.log("\n=== N41: a width split puts the remainder on the last panel, going down too ===");
var t41 = summary({ rbDir: stacked, rbMode: widthMode, etWidth: { text: "600", enabled: true } });
has(t41, "1 | 3000 × 600 | 3000 × 610 |", "Vodorovně: the top panel is a full 600");
has(t41, "2 | 3000 × 400 | 3000 × 410 |", "and the bottom one takes the remainder");

console.log("\n=== audit P1: a typo names its field and stops the run ===");
function run(o) { var r = refs(o); var st = TE.UI.refresh(null, r, ctx); r.st = st; return r; }
var rTypo = run({ etOverlap: { text: "2O", enabled: true } });
has(rTypo.stCalc.text, "✗ Pole „Přelep“: zadejte číslo, třeba 20 nebo 2,5.", "overlap 2O is named");
eq(rTypo.btnTiles.enabled || rTypo.btnExport.enabled, false, "and neither run can start");
eq(rTypo.st.numbersOk, false, "refresh() says so, for the preset buttons");
has(run({ etAddLeft: { text: "-5", enabled: true } }).stCalc.text, "✗ Pole „Přídavek vlevo“ nesmí být záporné.",
    "a negative add");
var rScale = run({ etScaleN: { text: "0", enabled: true } });
has(rScale.stCalc.text, "✗ Pole „Měřítko kresby“ musí být větší než 0.", "a zero drawing scale");
eq(rScale.stCleanInfo.text, "—", "the Document panel shows no millimetres without a scale");
has(run({ etScaleN: { text: "", enabled: true } }).stCalc.text, "✗ Pole „Měřítko kresby“: zadejte číslo",
    "an empty drawing scale is no 1:1 any more");
var rDown = run({ rbDir: [{ value: false }, { value: true }], rbMode: [{ value: false }, { value: true }, { value: false }],
    etWidth: { text: "6OO", enabled: true } });
has(rDown.stCalc.text, "✗ Pole „Výška plátu“: zadejte číslo", "stacked panels name the height");
var rUnused = run({ etCount: { text: "abc", enabled: true }, rbMode: [{ value: false }, { value: true }, { value: false }] });
eq(rUnused.btnExport.enabled && rUnused.st.numbersOk, true, "a field the split does not use does not stop it");

console.log("\n=== 1.1.0: the Result names every file ===");
// The arch sheet is 3000 x 1000 mm at 1:10; panel 1 prints 1010 x 1000 mm.
// All the files the export writes, not only the first panel's (user,
// 2026-10-16): the details field scrolls.
has(summary({}), "\narch_01.pdf\narch_02.pdf\narch_03.pdf", "the pattern of these stand-ins, {n} with two digits");
var shopPat = { text: "26_13456_a_{n}_{size}_{scale}_1x", enabled: true };
has(summary({ etPattern: shopPat }),
    "\n26_13456_a_01_1010x1000mm_1ku10_1x.pdf\n26_13456_a_02_1020x1000mm_1ku10_1x.pdf\n26_13456_a_03_1010x1000mm_1ku10_1x.pdf",
    "1:10 as drawn: real size and the ratio, panel by panel");
has(summary({ etPattern: shopPat, rbExpScale: [{ value: false }, { value: true }] }),
    "\n26_13456_a_01_1010x1000mm_1ku1_1x.pdf",
    "1:1: a {scale} in the pattern is meant, so the ratio is 1ku1 (user, 2026-10-11)");
has(summary(zund({ etPattern: shopPat })),
    "\n26_13456_a_01_1040x1030mm_1ku10_1x.pdf\n26_13456_a_01_1040x1030mm_1ku10_1x_cut.pdf"
    + "\n26_13456_a_02_1050x1030mm_1ku10_1x.pdf\n26_13456_a_02_1050x1030mm_1ku10_1x_cut.pdf"
    + "\n26_13456_a_03_1040x1030mm_1ku10_1x.pdf\n26_13456_a_03_1040x1030mm_1ku10_1x_cut.pdf",
    "Zünd: each panel's page with its marks, its _cut file beside it");
var rNames = refs(zund({}));
TE.UI.refresh(null, rNames, ctx);
eq(rNames.stCalc.text.split("\n").length, 7, "Zünd, three panels: the marks line and six files");

console.log("\n=== 1.1.0: {clean} and {adds}, typed by hand ===");
// The panel clean and with its adds at real size, whole millimetres, like
// {size}; no buttons (user, 2026-10-16).
var sizesPat = { text: "{n}_{clean}_{adds}_{size}", enabled: true };
has(summary({ etPattern: sizesPat }), "\n01_1000x1000mm_1010x1000mm_1010x1000mm.pdf\n02_1000x1000mm_1020x1000mm_1020x1000mm.pdf",
    "manual trim at 1:10: clean, with adds, and {size} the same as {adds}");
has(summary({ etPattern: sizesPat, rbExpScale: [{ value: false }, { value: true }] }),
    "\n01_1000x1000mm_1010x1000mm_1010x1000mm.pdf", "at 1:1 the same real sizes");
has(summary(zund({ etPattern: sizesPat })), "\n01_1000x1000mm_1010x1000mm_1040x1030mm.pdf",
    "Zünd: {adds} is the panel, {size} the page with its marks");
has(summary({ etPattern: { text: "{clean}_{adds}", enabled: true }, cbEqual: { value: true, enabled: true },
    etAddTop: { text: "40" }, etAddBottom: { text: "40" }, etAddRight: { text: "40" } }),
    "\n1017x1000mm_1027x1080mm.pdf", "equal panels of 1016,7 mm round to whole millimetres");
var rSlash = refs({ etPattern: { text: "zakazka/{n}", enabled: true } });
TE.UI.refresh(null, rSlash, ctx);
has(rSlash.stCalc.text, "✗ Název souboru „zakazka/01“ obsahuje lomítko nebo dvojtečku, které macOS čte jako složku.",
    "a slash in the name is named");
eq(rSlash.btnExport.enabled === false && rSlash.btnTiles.enabled === true, true,
    "it stops the export only: Panels only writes no file");
has(summary({ etPattern: { text: "   ", enabled: true } }), "✗ Vzor pojmenování dává prázdný název souboru.",
    "an empty pattern is caught before the export");
eq(summary({ etPattern: { text: "   ", enabled: true } }).indexOf("stejný název") === -1, true,
    "and not once more as a name every panel shares");
// Panels 1 and 3 of the arch print 1010 x 1000 mm: without {n} they share
// a name, and the export would leave one file for both (2026-10-16).
var rDup = refs({ etPattern: { text: "{doc}_{size}", enabled: true } });
TE.UI.refresh(null, rDup, ctx);
has(text(rDup), "✗ Export nejde, Jen pláty ano: 1 chyba, viz níže.", "the status line says the export cannot run");
has(rDup.stCalc.text,
    "✗ Pláty 1 a 3 by dostaly stejný název souboru „arch_1010x1000mm“, export by zapsal jen jeden z nich. Přidejte do vzoru {n}.",
    "the message names both panels, the name and the fix");
eq(rDup.btnExport.enabled === false && rDup.btnTiles.enabled === true, true,
    "it stops the export only: Panels only writes no file");
var rDupZ = refs(zund({ etPattern: { text: "{doc}", enabled: true } }));
TE.UI.refresh(null, rDupZ, ctx);
has(rDupZ.stCalc.text, "✗ Pláty 1 a 2 by dostaly stejný název souboru „arch“", "Zünd: the same check");
var rNoDup = refs({ etPattern: { text: "{doc}_{n}_{size}", enabled: true } });
TE.UI.refresh(null, rNoDup, ctx);
eq(rNoDup.btnExport.enabled && rNoDup.stCalc.text.indexOf("stejný název") === -1, true, "with {n} every name differs");

console.log("\n=== N50: the widest texts are laid out before the preset loads ===");
// A label keeps the width of its first layout. Loading the active preset can
// change a list's selection, whose onChange lays the dialog out with the real
// values; the pass with the widest texts has to come first, or "1:100 jako
// kresba", the clean format and the bleed are cut at drawing scale 100.
var uiSrc = fs.readFileSync(path.join(__dirname, "..", "src", "ui.js"), "utf8");
// The pass is a statement of its own; relayout() holds the same call.
var firstLayout = uiSrc.indexOf("\n        w.layout.layout(true);\n");
var presetLoad = uiSrc.indexOf("self.apply(refs, activeP)");
eq(firstLayout > 0 && presetLoad > 0 && firstLayout < presetLoad, true,
    "the first layout comes before the active preset is applied");

console.log("\n=== audit P9: the output folder is checked in the dialog ===");
// An empty or a missing folder used to show only after the dialog, once the
// check panels were built. Only the export needs it.
var rNoDir = refs({ etOut: { text: "", enabled: true } });
TE.UI.refresh(null, rNoDir, ctx);
has(rNoDir.stCalc.text, "✗ Vyberte cílovou složku.", "an empty folder is named");
eq(rNoDir.btnExport.enabled === false && rNoDir.btnTiles.enabled === true, true, "it stops the export, not Panels only");
has(rNoDir.stStatus.text, "✗ Export nejde, Jen pláty ano: 1 chyba, viz níže.", "and the status line says so");
folders.missing["/Volumes/Zakazky/old"] = true;
var rGone = refs({ etOut: { text: "/Volumes/Zakazky/old", enabled: true } });
TE.UI.refresh(null, rGone, ctx);
has(rGone.stCalc.text, "✗ Cílová složka „/Volumes/Zakazky/old“ neexistuje. Vyberte jinou.", "a missing folder is named with its path");
eq(rGone.btnExport.enabled, false, "and stops the export");
var rDir = refs({});
TE.UI.refresh(null, rDir, ctx);
eq(rDir.btnExport.enabled && rDir.stCalc.text.indexOf("složk") === -1, true, "an existing folder says nothing");

console.log("\n=== T6.3b: the artboard message says what is too big (N6) ===");
// Large Canvas x10 with manual 1:10, 1:1 output: the panel is 20 m wide and
// 10 m tall. The old message named neither, so nobody could tell that more
// panels would not help — it is the height that overflows.
app.activeDocument.scaleFactor = 10;
var lcCtx = {
    cleanRect: [0, TE.Utils.mm2pt(100), TE.Utils.mm2pt(600), 0],
    spotNames: ["CutContour"],
    guidesByDirection: { horizontal: { positions: [] }, vertical: { positions: [] } },
    validation: { overhang: { left: bleed, right: bleed, top: bleed, bottom: bleed },
        graphicCount: 1, scaleFactor: 10, mediaWidth: null, maxArtboard: 16200, hasCutSpot: true }
};
var r63 = refs({ etScaleN: { text: "10" },
    rbExpScale: [{ value: false }, { value: true }] });
TE.UI.refresh(null, r63, lcCtx);
has(r63.stCalc.text,
    "Plát 1 by při tomto měřítku výstupu měřil 20010 × 10000 mm; artboard Illustratoru unese nejvýš 5715 mm na stranu.",
    "the message names the panel, its size and the limit");
eq(r63.btnExport.enabled, false, "and the export stays blocked");
eq(r63.btnTiles.enabled, true, "Panels only stays available: it draws at the document's own scale (N17)");

console.log("\n=== T6.2a: Large Canvas at same-as-document now just works (N1) ===");
var r62 = refs({ etScaleN: { text: "1" } });
TE.UI.refresh(null, r62, lcCtx);
eq(r62.btnExport.enabled, true, "no Large Canvas error, export enabled");
eq(r62.stCalc.text.indexOf("Large Canvas") === -1, true, "and the old message is gone");
has(text(r62), "1 | 2000 × 1000 | 2010 × 1000 | 2010 × 1000", "Large Canvas at same-as-document prints real size (N16)");
var r43 = refs({ etScaleN: { text: "10" } });
TE.UI.refresh(null, r43, lcCtx);
has(text(r43), "1 | 20000 × 10000 | 20010 × 10000 | 2001 × 1000",
    "R4.3: Large Canvas with manual 1:10 is a 1:10 preview");
var rLcName = refs({ etScaleN: { text: "1" }, etPattern: { text: "{n}_{size}_{scale}", enabled: true } });
TE.UI.refresh(null, rLcName, lcCtx);
has(rLcName.stCalc.text, "01_2010x1000mm_1ku1.pdf",
    "Large Canvas at drawing scale 1: real size, 1ku1 — the canvas factor is no ratio");
var rLcSizes = refs({ etScaleN: { text: "10" }, etPattern: { text: "{n}_{clean}_{adds}_{size}", enabled: true } });
TE.UI.refresh(null, rLcSizes, lcCtx);
has(rLcSizes.stCalc.text, "01_20000x10000mm_20010x10000mm_20010x10000mm.pdf",
    "Large Canvas with drawing scale 10: {clean} and {adds} at real size too");
app.activeDocument.scaleFactor = 1;

console.log("\n=== 1.1.0: the status line says whether the export can run ===");
// The variant the user chose on 2026-10-15: one line in the family colour,
// the table under it, the details last.
eq(run({}).stStatus.text, "✓ Připraveno k exportu: 3 pláty, ruční ořez, výstup 1:10.", "ready, in words");
eq(run(zund({})).stStatus.text, "✓ Připraveno k exportu: 3 pláty, Zünd, výstup 1:10.", "Zünd");
ctx.contourSpots = ["Cut"];
eq(run(zund({})).stStatus.text, "⚠ Připraveno k exportu, 1 upozornění níže.", "a warning: still ready, and said so");
ctx.contourSpots = [];
eq(run(zund({ rbMode: widthMode, etWidth: { text: "1460", enabled: true }, etOverlap: { text: "0" } })).stStatus.text,
    "✗ Export nejde, Jen pláty ano: 1 chyba, viz níže.", "an export error leaves Panels only");
eq(run({ etOverlap: { text: "2O", enabled: true } }).stStatus.text, "✗ Nejde spustit: 1 chyba, viz níže.",
    "a typo stops both");
eq(run({ etAddLeft: { text: "60" }, etAddRight: { text: "60" } }).stStatus.text,
    "✗ Nejde spustit: 2 chyby, viz níže.", "two errors, counted in Czech");
eq(TE.L.count("TILES", 1) + "/" + TE.L.count("TILES", 4) + "/" + TE.L.count("TILES", 12),
    "1 plát/4 pláty/12 plátů", "the count forms");
eq(run({ etOverlap: { text: "2O", enabled: true } }).lbTiles.items.length, 0, "no split, an empty table");

console.log("\n=== the status line in its colour ===");
function painted(o) {
    var r = refs(o);
    r.stStatus.graphics = { PenType: { SOLID_COLOR: 1 },
        newPen: function (t, c) { return { rgb: c.slice(0, 3).join(",") }; } };
    TE.UI.refresh(null, r, ctx);
    return r.stStatus.graphics.foregroundColor.rgb;
}
eq(painted({}), TE.FieldPaint.COLORS.OK.join(","), "green when ready");
eq(painted({ etOverlap: { text: "2O", enabled: true } }), TE.FieldPaint.COLORS.ERR.join(","), "red on an error");

console.log("\n=== equal panels share a row ===");
var t5 = summary({ etCount: { text: "5", enabled: true } });
has(t5, "1 | 600 × 1000 | 610 × 1000 | 61 × 100", "panel 1 carries half an overlap");
has(t5, "2–4 | 600 × 1000 | 620 × 1000 | 62 × 100", "the inner three are one row");
has(t5, "5 | 600 × 1000 | 610 × 1000 | 61 × 100", "and the last its own");
has(summary({ etCount: { text: "5", enabled: true }, etOverlap: { text: "0" } }),
    "1–5 | 600 × 1000 | 600 × 1000 | 60 × 100", "without overlap all five are one row");
eq(TE.UI.groupRows([[1, "a", "b", "c"], [2, "a", "b", "x"], [3, "a", "b", "c"]]).length, 3, "only neighbours merge");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
