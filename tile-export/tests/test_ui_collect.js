#!/usr/bin/env node
/**
 * TE.UI.collect — reading the dialog back into settings.
 * Runs the real collect() against stand-in controls: it only ever reads
 * .text, .value and .selection, so no ScriptUI is needed.
 */
var fs = require("fs");
var path = require("path");

var TE = {};
global.app = { documents: { length: 1 }, activeDocument: { scaleFactor: 1 }, locale: "cs_CZ" };
eval(fs.readFileSync(path.join(__dirname, "..", "src", "locale.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "config.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "ui.js"), "utf8"));

var pass = 0, fail = 0, total = 0;
function eq(got, want, msg) {
    total++;
    var ok = (typeof want === "number" && typeof got === "number")
        ? Math.abs(got - want) < 1e-9
        : got === want;
    if (ok) { pass++; } else { fail++; console.log("  FAIL: " + msg + " | got=" + got + " expected=" + want); }
}

/** Stand-in for every control collect() reads, filled with default settings. */
function refs(textOverrides) {
    var d = TE.Config.getDefaults();
    function et(v) { return { text: String(v) }; }
    function cb(v) { return { value: !!v }; }
    function rb(n, on) { var a = [], i; for (i = 0; i < n; i++) { a.push({ value: i === on }); } return a; }
    var r = {
        etScaleN: et(1),
        rbDir: rb(2, 0), rbMode: rb(3, 0),
        etCount: et(d.tileCount), etWidth: et(d.tileWidth), cbEqual: cb(false),
        etRound: et(d.guideRound), etOverlap: et(d.overlap), rbOverlapMode: rb(3, 0),
        etAddTop: et(0), etAddBottom: et(0), etAddLeft: et(0), etAddRight: et(0),
        rbExpMode: rb(2, 0), rbExpScale: rb(2, 0), etDPI: et(d.rasterDPI),
        cbLine: cb(true), etSpot: et(d.lineSpot), etLineW: et(d.lineWidth),
        ddPdf: { selection: null }, etOut: et(""), etPattern: et(d.namePattern),
        cbSkip: cb(true), rbOutType: null
    };
    var k;
    for (k in textOverrides) { if (textOverrides.hasOwnProperty(k)) { r[k].text = textOverrides[k]; } }
    return r;
}

console.log("\n=== the reported bug: a decimal line width came back as 1 pt ===");
// Typed with the Czech decimal comma, which Number() rejects. The old code
// then fell back to 1 — a value that matches neither the default nor draw.js.
eq(TE.UI.collect(refs({ etLineW: "0,3" })).lineWidth, 0.3, "line width 0,3 is read as 0.3");
eq(TE.UI.collect(refs({ etLineW: "0.3" })).lineWidth, 0.3, "line width 0.3 still works");
eq(TE.UI.collect(refs({ etLineW: " 0,25 " })).lineWidth, 0.25, "whitespace around the comma is fine");

console.log("\n=== the silent half: decimals in print geometry used to become zero ===");
// Same parse, but the fallback here is 0, so the value did not come back
// wrong — it vanished. An overlap of 12,5 mm turned into butted panels.
eq(TE.UI.collect(refs({ etOverlap: "12,5" })).overlap, 12.5, "overlap 12,5 is not zero");
eq(TE.UI.collect(refs({ etAddTop: "2,5" })).addTop, 2.5, "add top 2,5 is not načisto");
eq(TE.UI.collect(refs({ etAddBottom: "2,5" })).addBottom, 2.5, "add bottom");
eq(TE.UI.collect(refs({ etAddLeft: "2,5" })).addLeft, 2.5, "add left");
eq(TE.UI.collect(refs({ etAddRight: "2,5" })).addRight, 2.5, "add right");
eq(TE.UI.collect(refs({ etWidth: "1000,5" })).tileWidth, 1000.5, "panel width with a comma");
eq(TE.UI.collect(refs({ etRound: "2,5" })).guideRound, 2.5, "guide rounding with a comma");

console.log("\n=== Zünd: bleed past the cut is read with a comma too ===");
var rzc = refs({});
rzc.rbOutType = [{ value: false }, { value: true }]; rzc.ddCutSpot = { selection: { text: "Thru-cut" } };
rzc.ddMarkColor = { selection: null }; rzc.etMarkSize = { text: "5" }; rzc.etGapInner = { text: "5" };
rzc.etMaxDist = { text: "500" }; rzc.etOrient = { text: "100" }; rzc.etBleed = { text: "2,5" };
var cz = TE.UI.collect(rzc);
eq(cz.cutBleed, 2.5, "bleed 2,5");
eq(cz.cutSpot, "Thru-cut", "cut colour from the list");
rzc.etBleed.text = "";
eq(isNaN(TE.UI.collect(rzc).cutBleed), true, "an empty bleed is no number, not the default (audit P1)");

console.log("\n=== a typo stays a typo (audit P1) ===");
// collect() used to put a default in place of whatever Number() could not
// read: overlap "2O" became no overlap, line width "abc" became 1 pt, and the
// dialog said nothing. It now hands back NaN and refresh() names the field.
eq(isNaN(TE.UI.collect(refs({ etOverlap: "2O" })).overlap), true, "overlap 2O is no number");
eq(isNaN(TE.UI.collect(refs({ etOverlap: "" })).overlap), true, "an empty overlap is none either");
eq(isNaN(TE.UI.collect(refs({ etLineW: "abc" })).lineWidth), true, "garbage line width");
eq(TE.UI.collect(refs({ etLineW: "0" })).lineWidth, 0, "a zero line width is kept, the check names it");
eq(isNaN(TE.UI.collect(refs({ etDPI: "" })).rasterDPI), true, "an empty DPI field");
eq(isNaN(TE.UI.collect(refs({ etScaleN: "1O" })).scaleN), true, "drawing scale 1O");
eq(isNaN(TE.UI.collect(refs({ etAddLeft: "1 000" })).addLeft), true, "a space inside a number");
eq(isNaN(TE.UI.collect(refs({ etWidth: "abc" })).tileWidth), true, "garbage width");

console.log("\n=== guard: no text field reaches Number() unparsed ===");
// The bug was a bypass, not a missing helper — TE.Utils already parsed commas
// and was tested for it. So check the source, not just the behaviour.
var ui = fs.readFileSync(path.join(__dirname, "..", "src", "ui.js"), "utf8");
// Lookbehind so "toNumber(r.etX.text)" does not count as a bare Number().
var bare = ui.match(/(?<![\w.])Number\(\s*r\.et\w+\.text\s*\)/g) || [];
eq(bare.length, 0, "collect() parses every field (found: " + bare.join(", ") + ")");
var collectSrc = ui.slice(ui.indexOf("    collect: function"), ui.indexOf("    apply: function"));
eq(/parseNumber\([^)]*\)\s*\|\|/.test(collectSrc) || /toNumber/.test(collectSrc), false,
    "and no field hides a typo behind a default (audit P1)");

console.log("\n=== N20: the PDF preset list never names a preset Illustrator lacks ===");
// The old fallback, "[High Quality Print]", does not exist on a Czech install
// ([Kvalitní tisk]); saveAs then failed with FNOC on every panel.
var items = TE.UI.pdfPresetItems(["[Výchozí Illustratoru]", "[Kvalitní tisk]"]);
eq(items.length === 2 && items[1] === "[Kvalitní tisk]", true, "Illustrator's own list is offered as it is");
var none = TE.UI.pdfPresetItems([]);
eq(none.length === 1 && none[0] === TE.L.PDF_PRESET_NONE, true, "no list: one item that says so");
eq(ui.indexOf("\"[High Quality Print]\""), -1, "the dialog has no preset name of its own");
var rpn = refs({});
rpn.ddPdf = { selection: { text: TE.L.PDF_PRESET_NONE } };
eq(TE.UI.collect(rpn).pdfPreset, "", "that item reads as no preset, like [Default]");
rpn.ddPdf = { selection: { text: "[Kvalitní tisk]" } };
eq(TE.UI.collect(rpn).pdfPreset, "[Kvalitní tisk]", "a real preset is read as it is");

console.log("\n=== N32: the direction is named the way the shop says it ===");
// The shop calls panels side by side "vertical" — vertical strips, like
// wallpaper from ceiling to floor — and stacked ones "horizontal". The stored
// values keep their meaning ("horizontal" = the cuts advance along X), so
// saved presets split as before; only what the dialog says changed.
eq(TE.L.DIR_SIDE_BY_SIDE, "Svisle", "panels side by side read Svisle");
eq(TE.L.DIR_STACKED, "Vodorovně", "panels above each other read Vodorovně");
eq(/addRadioRow\(pSplit,\s*l\.LBL_DIRECTION,\s*\[l\.DIR_SIDE_BY_SIDE,\s*l\.DIR_STACKED\]/.test(ui), true,
    "the first button, stored as \"horizontal\", is the side-by-side one");
eq(/r\.rbDir\[1\]\.value \? "vertical" : "horizontal"/.test(ui), true, "collect() still stores the old values");

console.log("\n=== N27: no clean-format override — the dialog divides what the run divides ===");
// The fields changed only the preview and the validation; Panels only and the
// export kept dividing the artboard. The artboard is the one source of truth.
eq(/etClean|resolveClean/.test(ui), false, "no override field or resolver left in the dialog");

console.log("\n=== 1.1.0: the drawing scale is the document's ===");
// One field, no checkbox: 1 is a scale like any other.
eq(TE.UI.collect(refs({ etScaleN: "10" })).scaleN, 10, "1:10 is read");
eq(TE.UI.collect(refs({ etScaleN: "12,5" })).scaleN, 12.5, "with the decimal comma too");
eq(isNaN(TE.UI.collect(refs({ etScaleN: "" })).scaleN), true,
    "an empty field is no number: its tip promises no default (audit P1, family rule)");
eq(/cbScale/.test(ui), false, "the old checkbox is gone");
// A preset leaves it alone: it neither carries the scale nor changes it.
var pv = TE.UI.presetValues(TE.UI.collect(refs({ etScaleN: "10" })));
eq(pv.hasOwnProperty("scaleN"), false, "a preset does not store the drawing scale");
eq(pv.overlap, TE.Config.getDefaults().overlap, "but everything else");
eq(/function current\(\) \{ return self\.presetValues\(self\.collect\(refs\)\); \}/.test(ui), true,
    "the preset list compares and saves without the scale");
eq(/etScaleN = this\.addRow\(pDoc, l\.LBL_SCALE, ctx\.drawingScale \|\| 1,/.test(ui), true,
    "the field starts at the document's scale, 1:1 when it has none");
var mainSrc = fs.readFileSync(path.join(__dirname, "..", "src", "main.js"), "utf8");
eq(/drawingScale:\s*TE\.Doc\.loadDrawingScale\(doc\)/.test(mainSrc), true, "main.js reads it before the dialog");
eq(/TE\.Doc\.saveDrawingScale\(doc, s\.scaleN\)/.test(mainSrc), true, "and stores it after a confirmed run");

console.log("\n=== 1.1.0: raster output is out of the dialog ===");
// The shop rasterises in Photoshop; Illustrator's raster is still to be
// trusted, and its DPI counts on the page (N37). The rows are not built.
eq(TE.Config.RASTER_ENABLED, false, "raster is switched off");
eq(/if \(c\.RASTER_ENABLED\) \{\s*rbExpMode = this\.addRadioRow/.test(ui), true, "its rows are built only when on");
var rnr = refs({});
rnr.rbExpMode = null; rnr.etDPI = null;
eq(TE.UI.collect(rnr).exportMode, "vector", "without the rows the export is vector");
eq(TE.UI.collect(rnr).rasterDPI, TE.Config.getDefaults().rasterDPI, "and the DPI keeps its default");

console.log("\n=== skipping finished outputs is asked for, not assumed ===");
// On by default, a re-export after a fix kept the old files under the same
// names and only reported them as skipped (user, 2026-10-10).
eq(TE.Config.getDefaults().skipExisting, false, "a fresh dialog overwrites");

console.log("\n=== placeholder buttons: the placeholder goes at the end ===");
// Where the cursor was is lost the moment another control is clicked: tried
// with the user (2026-10-11), textselection then wrote at the start after a
// button, at the end after a text, and a button that gave the field its focus
// back replaced the whole pattern. A pattern is built left to right.
// The stand-in does what ScriptUI did after a button click: a value set as
// textselection lands at the start of the field.
function clicked(text) {
    var f = { text: text };
    Object.defineProperty(f, "textselection", {
        get: function () { return ""; },
        set: function (v) { this.text = v + this.text; }
    });
    return f;
}
var f1 = clicked("26_13456_a_");
TE.UI.insertToken(f1, "{n}");
eq(f1.text, "26_13456_a_{n}", "after what is typed");
f1.text += "_";
TE.UI.insertToken(f1, "{size}");
eq(f1.text, "26_13456_a_{n}_{size}", "and the next one after the separator typed by hand");
var f2 = clicked("");
TE.UI.insertToken(f2, "{doc}");
eq(f2.text, "{doc}", "an empty pattern starts with it");

console.log("\n=== a stored value the list lacks shows as (chybí) (§12.3) ===");
// The TEST preset kept "cut"; the wall's list had [Registrační] and "Cut",
// and the dialog silently took the first: a cut in registration, the colour
// of the marks (2026-10-15). Never item 0 instead of the stored value.
/** A dropdownlist stand-in: items, add(), remove(index), selection by index or item. */
function dd(names) {
    var d = { items: [], sel: null };
    d.add = function (type, text) { var it = { text: text }; d.items.push(it); return it; };
    d.remove = function (i) { if (d.sel === d.items[i]) { d.sel = null; } d.items.splice(i, 1); };
    Object.defineProperty(d, "selection", {
        get: function () { return d.sel; },
        set: function (v) { d.sel = (typeof v === "number") ? d.items[v] : v; }
    });
    var i;
    for (i = 0; i < names.length; i++) { d.add("item", names[i]); }
    return d;
}
var cut = dd(["Cut", "Spot 1"]);
TE.UI.selectItem(cut, "Spot 1");
eq(cut.selection.text, "Spot 1", "a value the list has is selected");
eq(cut.items.length, 2, "and nothing is added");
TE.UI.selectItem(cut, "cut");
eq(cut.selection.text, "cut  (chybí)", "a value it lacks shows with the marker");
eq(cut.items.length, 3, "as one added item");
eq(TE.UI.itemValue(cut), "cut", "and reads back without it");
TE.UI.selectItem(cut, "Thru-cut");
eq(cut.items.length === 3 && cut.selection.text === "Thru-cut  (chybí)", true,
    "the next missing value replaces the earlier marker item");
TE.UI.selectItem(cut, "Cut");
eq(cut.items.length === 2 && TE.UI.itemValue(cut) === "Cut", true, "a value the list has removes it");
eq(TE.UI.itemValue(dd([])), "", "nothing selected reads as empty");
var rzm = refs({});
rzm.rbOutType = [{ value: false }, { value: true }]; rzm.ddCutSpot = dd(["Cut"]);
TE.UI.selectItem(rzm.ddCutSpot, "cut");
rzm.ddMarkColor = { selection: null }; rzm.etMarkSize = { text: "5" }; rzm.etGapInner = { text: "5" };
rzm.etMaxDist = { text: "500" }; rzm.etOrient = { text: "100" }; rzm.etBleed = { text: "5" };
eq(TE.UI.collect(rzm).cutSpot, "cut", "collect() reads the stored colour, not its label");

// No stored value has nothing to keep: [Default]'s PDF preset "" takes the
// first item, as it always did.
var pdfs = dd(["[Výchozí Illustratoru]", "[Kvalitní tisk]"]);
TE.UI.selectItem(pdfs, "");
eq(pdfs.selection.text === "[Výchozí Illustratoru]" && pdfs.items.length === 2, true, "an empty value: the first item");
TE.UI.selectItem(pdfs, "Dílna bez komprese");
eq(pdfs.selection.text, "Dílna bez komprese  (chybí)", "a preset this Illustrator lacks");
var rpdf = refs({}); rpdf.ddPdf = pdfs;
eq(TE.UI.collect(rpdf).pdfPreset, "Dílna bez komprese", "collect() keeps its name");
var none = dd([TE.L.PDF_PRESET_NONE]); TE.UI.selectItem(none, "");
rpdf.ddPdf = none;
eq(TE.UI.collect(rpdf).pdfPreset, "", "the no-preset item still reads as \"\" (N20)");

// Registration is the one bracketed mark colour, named in the language of
// the install; a stored [Registration] is the list's [Registrační].
var marks = dd(["[Registrační]", "Spot 1"]);
TE.UI.selectItem(marks, "[Registration]", TE.UI.sameMarkColor);
eq(marks.selection.text === "[Registrační]" && marks.items.length === 2, true, "[Registration] selects [Registrační]");
TE.UI.selectItem(marks, "Spot 1", TE.UI.sameMarkColor);
eq(marks.selection.text, "Spot 1", "a spot colour by its name");
TE.UI.selectItem(marks, "Bílá", TE.UI.sameMarkColor);
eq(marks.selection.text === "Bílá  (chybí)" && TE.UI.itemValue(marks) === "Bílá", true, "a missing one shows as (chybí)");
eq(TE.UI.sameMarkColor("[Registrační]", "Spot 1") || TE.UI.sameMarkColor("Spot 1", "[Registration]"), false,
    "registration and a spot colour are not the same");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
