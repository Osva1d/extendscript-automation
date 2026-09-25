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
        cbScale: cb(false), etScaleN: et(1),
        rbDir: rb(2, 0), rbMode: rb(3, 0),
        etCount: et(d.tileCount), etWidth: et(d.tileWidth), cbEqual: cb(false),
        etRound: et(d.guideRound), etOverlap: et(d.overlap), rbOverlapMode: rb(3, 0),
        etAddTop: et(0), etAddBottom: et(0), etAddLeft: et(0), etAddRight: et(0),
        rbExpMode: rb(2, 0), rbExpScale: rb(2, 0), etDPI: et(d.rasterDPI),
        cbLine: cb(true), etSpot: et(d.lineSpot), etLineW: et(d.lineWidth),
        ddPdf: { selection: null }, etOut: et(""), etPattern: et(d.namePattern),
        cbSkip: cb(true), cbZund: null
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
rzc.cbZund = { value: true }; rzc.ddCutSpot = { selection: { text: "Thru-cut" } };
rzc.ddMarkColor = { selection: null }; rzc.etMarkSize = { text: "5" }; rzc.etGapInner = { text: "5" };
rzc.etMaxDist = { text: "500" }; rzc.etOrient = { text: "100" }; rzc.etBleed = { text: "2,5" };
var cz = TE.UI.collect(rzc);
eq(cz.cutBleed, 2.5, "bleed 2,5");
eq(cz.cutSpot, "Thru-cut", "cut colour from the list");
rzc.etBleed.text = "";
eq(TE.UI.collect(rzc).cutBleed, TE.Config.getDefaults().cutBleed, "empty bleed falls back to the default");

console.log("\n=== fallbacks are unchanged — only the parsing moved ===");
// Empty, zero and garbage still take the same fallback each field always had.
// The one fallback that changed is the line width's: it disagreed with the
// default and with draw.js's own guard. Compared to the default itself, which
// N13 moved from 0.3 to 1 pt.
var LW = TE.Config.getDefaults().lineWidth;
eq(TE.UI.collect(refs({ etLineW: "" })).lineWidth, LW, "empty line width falls back to the default");
eq(TE.UI.collect(refs({ etLineW: "0" })).lineWidth, LW, "zero line width falls back to the default");
eq(TE.UI.collect(refs({ etLineW: "abc" })).lineWidth, LW, "garbage line width falls back to the default");
eq(TE.UI.collect(refs({ etOverlap: "" })).overlap, 0, "empty overlap is still 0");
eq(TE.UI.collect(refs({ etDPI: "" })).rasterDPI, 150, "empty DPI still falls back to 150");
eq(isNaN(TE.UI.collect(refs({ etWidth: "abc" })).tileWidth), true,
    "garbage width stays NaN so the grid rejects it, as before");

console.log("\n=== guard: no text field reaches Number() unparsed ===");
// The bug was a bypass, not a missing helper — TE.Utils already parsed commas
// and was tested for it. So check the source, not just the behaviour.
var ui = fs.readFileSync(path.join(__dirname, "..", "src", "ui.js"), "utf8");
// Lookbehind so "toNumber(r.etX.text)" does not count as a bare Number().
var bare = ui.match(/(?<![\w.])Number\(\s*r\.et\w+\.text\s*\)/g) || [];
eq(bare.length, 0, "collect() uses TE.Utils.toNumber for every field (found: " + bare.join(", ") + ")");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
