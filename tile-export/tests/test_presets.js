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
load("../shared/lib/ui_state.js");
global.buildUIState(TE);
load("src/config.js");
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
        cbScale: cb(), etScaleN: et(), rbDir: rb(2), rbMode: rb(3),
        etCount: et(), etWidth: et(), cbEqual: cb(), etRound: et(),
        etOverlap: et(), rbOverlapMode: rb(3),
        etAddTop: et(), etAddBottom: et(), etAddLeft: et(), etAddRight: et(),
        rbExpMode: rb(2), rbExpScale: rb(2), etDPI: et(),
        cbLine: cb(), etSpot: et(), etLineW: et(),
        ddPdf: dd(["[Výchozí Illustratoru]", "[PDF/X-4:2008]"], 1),
        etOut: et(), etPattern: et(), cbSkip: cb(), cbZund: null
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
eq(list[0].displayText, "[Default]", "and only on the active one");

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

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
