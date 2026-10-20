#!/usr/bin/env node
/**
 * Presets (N8): what the list compares, and what loading a preset shows.
 *
 * The dialog wiring itself needs ScriptUI and is verified by a probe in
 * Illustrator. What runs here is the logic it stands on: TE.Utils.presetEquals,
 * the shared TE.UIState it feeds, and TE.UI.apply() against stand-in controls.
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
load("../shared/lib/ui_state.js");
global.buildUIState(TE);
load("src/config.js");
load("src/lib/storage.js");
load("src/ui.js");

var pass = 0, fail = 0, total = 0;
function eq(got, want, msg) {
    total++;
    if (got === want) { pass++; } else { fail++; console.log("  FAIL: " + msg + " | got=" + got + " expected=" + want); }
}

/** Dropdown stand-in: like ScriptUI, assigning an index selects that item. */
function dd(names, selIdx) {
    var o = { items: [], sel: null };
    names.forEach(function (n, i) { o.items.push({ text: n, index: i }); });
    Object.defineProperty(o, "selection", {
        get: function () { return this.sel; },
        set: function (v) { this.sel = (typeof v === "number") ? (this.items[v] || null) : v; }
    });
    o.selection = selIdx;
    return o;
}

/** Every control apply() writes and collect() reads. */
function refs() {
    function et() { return { text: "", enabled: true }; }
    function cb() { return { value: false, enabled: true }; }
    function rb(n) { var a = [], i; for (i = 0; i < n; i++) { a.push({ value: i === 0 }); } return a; }
    return {
        etScaleN: et(), rbDir: rb(2), rbMode: rb(3),
        etCount: et(), etWidth: et(), cbEqual: cb(), etRound: et(),
        etOverlap: et(), rbOverlapMode: rb(3),
        etAddTop: et(), etAddBottom: et(), etAddLeft: et(), etAddRight: et(),
        rbExpMode: rb(2), rbExpScale: rb(2), etDPI: et(),
        cbLine: cb(), etSpot: et(), etLineW: et(),
        ddPdf: dd(["[Výchozí Illustratoru]", "[PDF/X-4:2008]"], 1),
        etOut: et(), etPattern: et(), cbSkip: cb(), rbOutType: null
    };
}

console.log("\n=== presetEquals: what counts as a change ===");
var a = TE.Config.getDefaults();
var b = TE.Config.getDefaults();
eq(TE.Utils.presetEquals(a, b), true, "two default objects are equal");
b.overlap = 25;
eq(TE.Utils.presetEquals(a, b), false, "a changed overlap is a change");
b = TE.Config.getDefaults();
b.overlap = "20";
eq(TE.Utils.presetEquals(a, b), true, "20 and \"20\" are the same value");
b = TE.Config.getDefaults();
delete b.equalPanels;
eq(TE.Utils.presetEquals(a, b), false, "a missing key is a change");
eq(TE.Utils.presetEquals(a, null), false, "nothing to compare is never equal");

console.log("\n=== the shared list marks the active preset when it differs ===");
var pData = { activePreset: "TEST", presets: {} };
pData.presets["[Default]"] = TE.Config.getDefaults();
pData.presets["[Last Settings]"] = TE.Config.getDefaults();
pData.presets.TEST = TE.Config.getDefaults();
var cur = TE.Config.getDefaults();
var list = TE.UIState.formatPresetList(pData, cur, TE.L);
eq(list.length, 2, "[Last Settings] is not offered");
eq(list[0].key, "[Default]", "[Default] comes first");
eq(list[1].displayText, "TEST", "unchanged: no asterisk");
cur.overlap = 25;
list = TE.UIState.formatPresetList(pData, cur, TE.L);
eq(list[1].displayText, "TEST *", "changed: asterisk on the active preset");
eq(list[0].displayText, "[Výchozí]", "and only on the active one; named in Czech, as in zund-summa-marks");

console.log("\n=== loading a preset: a value the list lacks falls back to the first item ===");
// [Default] stores pdfPreset "" — no dropdown item has that name. apply()
// used to leave whatever the previous preset had selected, so the same
// preset showed different values depending on what was loaded before, and
// the asterisk could not be computed from it.
var r = refs();
TE.UI.apply(r, TE.Config.getDefaults());
eq(r.ddPdf.selection.text, "[Výchozí Illustratoru]", "missing PDF preset selects the first item");
var named = TE.Config.getDefaults();
named.pdfPreset = "[PDF/X-4:2008]";
TE.UI.apply(r, named);
eq(r.ddPdf.selection.text, "[PDF/X-4:2008]", "a present PDF preset is selected");
// audit P11: [Default] stands for High Quality Print in either language, as
// in batch-relink-export, not for Illustrator's first preset.
var rHq = refs();
rHq.ddPdf = dd(["[Výchozí Illustratoru]", "[Kvalitní tisk]", "[PDF/X-4:2008]"], 0);
TE.UI.apply(rHq, TE.Config.getDefaults());
eq(rHq.ddPdf.selection.text, "[Kvalitní tisk]", "[Default] preselects [Kvalitní tisk]");
rHq.ddPdf = dd(["[Illustrator Default]", "[High Quality Print]"], 0);
TE.UI.apply(rHq, TE.Config.getDefaults());
eq(rHq.ddPdf.selection.text, "[High Quality Print]", "and [High Quality Print] in English");
eq(TE.UI.collect(rHq).pdfPreset, "[High Quality Print]", "which a run then stores by its name");

console.log("\n=== 1.1.0: loading a preset keeps the document's drawing scale ===");
// Presets saved before 1.1.0 still carry scaleN; the scale is the document's
// now, so apply() must not write it into the field.
r = refs();
r.etScaleN.text = "10";
var oldPreset = TE.Config.getDefaults();
oldPreset.scaleN = 1;
TE.UI.apply(r, oldPreset);
eq(r.etScaleN.text, "10", "a preset carrying scaleN 1 leaves the document's 1:10 alone");
eq(TE.UI.collect(r).scaleN, 10, "and the run reads 1:10");

console.log("\n=== every radio position survives apply -> collect ===");
// N14 was the BUILD computing these; apply() sets them one by one and was
// right. This keeps the mapping honest in both directions. It cannot see the
// engine's left-to-right ?: — the lint rule and the Illustrator probe do.
var modes = ["count", "width", "guides"], i, s, back;
for (i = 0; i < modes.length; i++) {
    s = TE.Config.getDefaults();
    s.divideMode = modes[i];
    r = refs();
    TE.UI.apply(r, s);
    back = TE.UI.collect(r);
    eq(back.divideMode, modes[i], "divide mode " + modes[i]);
}
var place = [["symmetric", "first"], ["onesided", "first"], ["onesided", "second"]];
for (i = 0; i < place.length; i++) {
    s = TE.Config.getDefaults();
    s.overlapMode = place[i][0];
    s.overlapCarrier = place[i][1];
    r = refs();
    TE.UI.apply(r, s);
    back = TE.UI.collect(r);
    eq(back.overlapMode + "/" + back.overlapCarrier, place[i].join("/"), "overlap " + place[i].join("/"));
}

console.log("\n=== [Default] comes from the code, whatever the file holds ===");
// A settings file from before N8 (2026-09-18) kept [Default] with values a
// test had put there — overlap 33, right add 40, mark gap 10 — and the dialog
// showed them as the defaults (manual test, 2026-10-11).
var file = { activePreset: "[Default]", presets: {} };
file.presets["[Default]"] = TE.Config.getDefaults();
file.presets["[Default]"].overlap = 33;
file.presets["[Default]"].addRight = 40;
file.presets["[Default]"].gapInner = 10;
file.presets["TEST"] = TE.Config.getDefaults();
file.presets["TEST"].overlap = 33;
TE.UI.normalizePresets(file);
var fd = file.presets["[Default]"], cd = TE.Config.getDefaults();
eq(fd.overlap + "/" + fd.addRight + "/" + fd.gapInner, cd.overlap + "/" + cd.addRight + "/" + cd.gapInner,
    "[Default] gets the code's overlap, adds and mark gap back");
eq(fd.namePattern, cd.namePattern, "and the code's name pattern");
eq(file.presets["TEST"].overlap, 33, "the user's own preset keeps its values");
eq(file.activePreset, "[Default]", "the active preset stays");
var gone = { activePreset: "Smazana", presets: {} };
eq(TE.UI.normalizePresets(gone).activePreset, "[Default]", "an active preset that is gone falls back to [Default]");
eq(gone.presets["[Default]"].overlap, cd.overlap, "and a file without [Default] gets one");
var last = { activePreset: "[Last Settings]", presets: { "[Last Settings]": TE.Config.getDefaults() } };
eq(TE.UI.normalizePresets(last).activePreset, "[Default]", "[Last Settings] is never the active preset");

console.log("\n=== a preset holding NaN leaves its field empty ===");
// A field with a typo the run did not use is kept as NaN in memory; loaded
// again in the same dialog, it must not read "NaN".
var rNaN = refs(), sNaN = TE.Config.getDefaults();
sNaN.overlap = NaN;
TE.UI.apply(rNaN, sNaN);
eq(rNaN.etOverlap.text, "", "the overlap field is empty, and the check will name it");

console.log("\n=== a number comes back with the decimal comma (audit N6) ===");
// Typed "2,5", stored 2.5: the field used to show "2.5" the next time, and
// the operator could think the comma does not work. Unrounded: a line of
// 0,25 pt must not become 0,3 the way the Result rounds to tenths.
var rDec = refs(), sDec = TE.Config.getDefaults();
sDec.overlap = 2.5; sDec.lineWidth = 0.25; sDec.addTop = 40;
TE.UI.apply(rDec, sDec);
eq(rDec.etOverlap.text, "2,5", "2.5 in the overlap field reads 2,5");
eq(rDec.etLineW.text, "0,25", "0.25 pt stays 0,25, not rounded");
eq(rDec.etAddTop.text, "40", "a whole number has no comma");
eq(TE.UI.collect(rDec).overlap, 2.5, "and reads back as the same number");

console.log("\n=== a stored null takes the default ===");
// A field left with a typo where the run does not use it is saved as NaN,
// which JSON writes as null. Loaded back, it must not show as "null".
var filled = TE.Storage.fillDefaults({ overlap: null, addTop: 7 });
eq(filled.overlap, TE.Config.getDefaults().overlap, "null overlap: the default");
eq(filled.addTop, 7, "a stored number stays");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
