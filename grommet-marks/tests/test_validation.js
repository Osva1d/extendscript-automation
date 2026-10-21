#!/usr/bin/env node
/**
 * GM.Validation Test Suite
 * Rules-based input validation (no ScriptUI). Alerts are captured, not shown.
 *
 * Usage: node tests/test_validation.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
var GM = {};
var lastAlert = null;
global.alert = function (m) { lastAlert = m; };

// The real locale: the texts the operator reads, in both languages. Alerts
// go through GM.Utils.error, which reads GM.L, so the suite's GM.L is the
// English table and the Czech one is swapped in where a test needs it.
global.app = { locale: "en_US" };
function tableFor(locale) {
    var saved = global.app.locale;
    global.app.locale = locale;
    var table = new Function("GM", fs.readFileSync(path.join(__dirname, "..", "src", "locale.js"), "utf8") +
        "\nreturn GM.L;")({});
    global.app.locale = saved;
    return table;
}

// ===== LOAD PRODUCTION CODE =====
eval(fs.readFileSync(path.join(__dirname, "..", "src", "constants.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "locale.js"), "utf8"));
var L = GM.L;
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "config.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "validation.js"), "utf8"));
// Field text is read by the shared GM.Numbers (the family grammar).
require("./lib/load_shared.js")(GM, ["numbers"]);

// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}
function validCfg(over) {
    var c = GM.Config.getDefaults();
    // defaults: top+left enabled (count mode), bottom/right mirrored
    if (over) { for (var k in over) if (over.hasOwnProperty(k)) c[k] = over[k]; }
    return c;
}

// ===== validateNumber =====
console.log("--- Validation.validateNumber ---");
var R = GM.Validation.rules;
(function () {
    lastAlert = null;
    assert(GM.Validation.validateNumber("5", R.offsetX, "X", L) === 5, "parses integer string");
    assert(GM.Validation.validateNumber("5,5", { min: 0, max: 10, integer: false }, "X", L) === 5.5,
        "comma decimal normalized");
    assert(GM.Validation.validateNumber("  4 ", R.offsetX, "X", L) === 4, "trims whitespace");

    lastAlert = null;
    assert(GM.Validation.validateNumber("abc", R.offsetX, "X", L) === null, "non-number → null");
    assert(lastAlert !== null, "non-number raises alert");

    lastAlert = null;
    assert(GM.Validation.validateNumber("3.5", R.edgeCount, "Count", L) === null, "non-integer for integer rule → null");

    lastAlert = null;
    assert(GM.Validation.validateNumber("101", R.haloWeight, "W", L) === null, "above max → null");
    assert(GM.Validation.validateNumber("0", R.markSize, "S", L) === null, "below min → null");
})();

// ===== validate: happy path =====
console.log("--- Validation.validate: valid ---");
(function () {
    var cfg = validCfg({ offsetX: "7", offsetY: "7", markSize: "3" });
    var r = GM.Validation.validate(cfg, L);
    assert(r.valid === true, "default config valid");
    assert(r.settings.offsetX === 7, "offsetX parsed to number");
    assert(r.settings.markSize === 3, "markSize parsed to number");
    assert(typeof r.settings.offsetY === "number", "offsetY is number");
})();

// ===== validate: failures =====
console.log("--- Validation.validate: invalid ---");
(function () {
    assert(GM.Validation.validate(null, L).valid === false, "null cfg → invalid");

    var neg = validCfg({ offsetX: -5 });
    assert(GM.Validation.validate(neg, L).valid === false, "negative offsetX → invalid");

    var zeroSize = validCfg({ markSize: 0 });
    assert(GM.Validation.validate(zeroSize, L).valid === false, "markSize 0 → invalid");

    // no appearance (shape gate: neither circle nor cross)
    var noApp = validCfg({ markCircle: false, markCross: false });
    lastAlert = null;
    assert(GM.Validation.validate(noApp, L).valid === false, "no circle/cross → invalid");
    assert(lastAlert === L.ERR_PREFIX + L.ERR_NO_APPEARANCE + " " + L.DOC_UNCHANGED, "no-appearance alert shown (got " + lastAlert + ")");

    // no edges (top+left off, both mirrored)
    var noEdge = validCfg({
        top:  { enabled: false, useNumber: true, number: 10, spacing: 105 },
        left: { enabled: false, useNumber: true, number: 10, spacing: 105 },
        bottomMirror: true, rightMirror: true
    });
    lastAlert = null;
    assert(GM.Validation.validate(noEdge, L).valid === false, "no enabled edges → invalid");
    assert(lastAlert === L.ERR_PREFIX + L.ERR_NO_EDGE + " " + L.DOC_UNCHANGED, "no-edge alert shown (got " + lastAlert + ")");

    // non-mirrored enabled edge with bad count
    var badCount = validCfg({
        bottomMirror: false,
        bottom: { enabled: true, useNumber: true, number: 0, spacing: 105 }
    });
    assert(GM.Validation.validate(badCount, L).valid === false, "edge count 0 → invalid");

    // bad halo weight
    var badWeight = validCfg({ haloWeight: "abc" });
    assert(GM.Validation.validate(badWeight, L).valid === false, "bad halo weight → invalid");
})();

// ===== validate: spacing-mode edge =====
console.log("--- Validation.validate: spacing edge ---");
(function () {
    var cfg = validCfg({
        bottomMirror: false,
        bottom: { enabled: true, useNumber: false, number: 10, spacing: "50" }
    });
    var r = GM.Validation.validate(cfg, L);
    assert(r.valid === true, "valid spacing-mode edge passes");
})();

// ===== TEST: v5 rules =====
console.log("--- Validation v5: zones + path ---");
(function () {
    var rules = GM.Validation.rules;
    assert(rules.cornerCount.integer === true, "cornerCount is integer rule");
    assert(rules.cornerCount.min === 1 && rules.cornerCount.max === 999, "cornerCount range");
    assert(rules.cornerPitch.min === 0.01, "cornerPitch min");
    assert(rules.pathNumber.integer === true && rules.pathNumber.max === 9999, "pathNumber rule");
    assert(rules.pathSpacing.min === 0.01, "pathSpacing min");

    // Zones enabled -> cornerCount/Pitch validated
    var cfg = validCfg();
    cfg.cornerZone = { enabled: true, count: 2.5, pitch: 100 };
    assert(GM.Validation.validate(cfg, L).valid === false, "fractional cornerCount rejected");

    cfg.cornerZone = { enabled: true, count: 5, pitch: 0 };
    assert(GM.Validation.validate(cfg, L).valid === false, "zero cornerPitch rejected");

    // Zones disabled -> zone fields ignored
    cfg.cornerZone = { enabled: false, count: 0, pitch: 0 };
    assert(GM.Validation.validate(cfg, L).valid === true, "disabled zones skip zone fields");

    // Path mode: pathDist validated, edges ignored
    var pc = validCfg();
    pc.placementMode = "path";
    pc.pathDist = { useNumber: false, number: 1, spacing: 0 };
    assert(GM.Validation.validate(pc, L).valid === false, "path spacing 0 rejected");

    pc.pathDist = { useNumber: false, number: 1, spacing: 105 };
    pc.top.enabled = false; pc.left.enabled = false;
    pc.bottom.enabled = false; pc.right.enabled = false;
    pc.bottomMirror = false; pc.rightMirror = false;
    assert(GM.Validation.validate(pc, L).valid === true,
        "path mode ignores edge-enabled structural check");

    // Path mode count: fractional rejected
    pc.pathDist = { useNumber: true, number: 3.5, spacing: 105 };
    assert(GM.Validation.validate(pc, L).valid === false, "path count fractional rejected");

    // Clean settings carry parsed zone values
    var cz = validCfg();
    cz.cornerZone = { enabled: true, count: "5", pitch: "100" };
    var rcz = GM.Validation.validate(cz, L);
    assert(rcz.valid === true && rcz.settings.cornerZone.count === 5, "zone count parsed to number");
    assert(rcz.settings.cornerZone.pitch === 100, "zone pitch parsed to number");
})();

// ===== TEST: presetEquals v5 fields =====
console.log("--- Utils.presetEquals v5 ---");
(function () {
    var a = GM.Config.getDefaults();
    var b = GM.Config.getDefaults();
    assert(GM.Utils.presetEquals(a, b) === true, "identical defaults are equal");

    // Differing only in cornerZone.pitch → NOT equal
    var c = GM.Config.getDefaults();
    c.cornerZone = { enabled: false, count: 5, pitch: 200 };
    assert(GM.Utils.presetEquals(a, c) === false, "differing cornerZone.pitch → not equal");

    // Differing only in placementMode → NOT equal
    var d = GM.Config.getDefaults();
    d.placementMode = "path";
    assert(GM.Utils.presetEquals(a, d) === false, "differing placementMode → not equal");

    // Differing only in pathDist.spacing → NOT equal
    var e = GM.Config.getDefaults();
    e.pathDist = { useNumber: false, number: 24, spacing: 999 };
    assert(GM.Utils.presetEquals(a, e) === false, "differing pathDist.spacing → not equal");

    // Presets without v5 fields compare equal to each other (backward-compat)
    var f = { offsetX: 7, offsetY: 7, bottomMirror: true, rightMirror: true,
              units: "mm", markSize: 3, isRound: true, markLayerName: "__create__",
              fillEnabled: true, fillSwatchName: "__create__", fillOverprint: true,
              strokeEnabled: false, strokeSwatchName: "__create__", strokeOverprint: true,
              strokeWeight: 1,
              top: { enabled: true, useNumber: true, number: 10, spacing: 105 },
              left: { enabled: true, useNumber: true, number: 10, spacing: 105 },
              bottom: { enabled: false, useNumber: true, number: 10, spacing: 105 },
              right: { enabled: false, useNumber: true, number: 10, spacing: 105 } };
    var g = GM.Config.getDefaults();
    // f has no v5 fields; g has them — the presence-guard in presetEquals skips
    // v5-field comparison when one side lacks them, so f and g compare as EQUAL
    // (they differ only in v5-field presence; all base/edge fields match).
    assert(GM.Utils.presetEquals(f, g) === true,
        "presence-guarded v5 fields: old preset compares equal to new default ignoring v5-only differences");
    // BUT two old-format presets without v5 fields should be equal to each other
    var h = { offsetX: 7, offsetY: 7, bottomMirror: true, rightMirror: true,
              units: "mm", markSize: 3, isRound: true, markLayerName: "__create__",
              fillEnabled: true, fillSwatchName: "__create__", fillOverprint: true,
              strokeEnabled: false, strokeSwatchName: "__create__", strokeOverprint: true,
              strokeWeight: 1,
              top: { enabled: true, useNumber: true, number: 10, spacing: 105 },
              left: { enabled: true, useNumber: true, number: 10, spacing: 105 },
              bottom: { enabled: false, useNumber: true, number: 10, spacing: 105 },
              right: { enabled: false, useNumber: true, number: 10, spacing: 105 } };
    assert(GM.Utils.presetEquals(f, h) === true, "two old-format presets (no v5 fields) are equal");
})();

// ===== TEST: v6 mark schema =====
console.log("--- Validation v6: weight rules + defaults ---");
(function () {
    var d = GM.Config.getDefaults();
    assert(d.markCircle === true,  "default markCircle true");
    assert(d.markCross === false,  "default markCross false");
    assert(d.regWeight === 1.0,    "default regWeight 1.0");
    assert(d.haloWeight === 3.0,   "default haloWeight 3.0");
    assert(GM.Validation.rules.regWeight.min === 0.1,  "regWeight rule present");
    assert(GM.Validation.rules.haloWeight.max === 50,  "haloWeight rule present");
})();

// ===== TEST: v6 shape requirement + weights =====
console.log("--- Validation v6: shape requirement + weights ---");
(function () {
    var noShape = GM.Validation.validate(validCfg({ markCircle: false, markCross: false }), L);
    assert(noShape.valid === false, "no shape -> invalid");
    var crossOnly = GM.Validation.validate(validCfg({ markCircle: false, markCross: true }), L);
    assert(crossOnly.valid === true, "cross only -> valid");
    var badHalo = GM.Validation.validate(validCfg({ haloWeight: 0 }), L);
    assert(badHalo.valid === false, "haloWeight 0 -> invalid");
    var ok = GM.Validation.validate(validCfg(), L);
    assert(ok.valid === true && ok.settings.regWeight === 1.0, "defaults valid, regWeight parsed");
})();

// ===== TEST: strict number parsing (audit A9, spec 6.1) =====
// parseFloat read the digits at the start and dropped the rest: "1O5" became
// 1, "1 000" became 1, and the field looked valid. A typo must be invalid.
// Since 1.4.0 the grammar is the shared GM.Numbers.parse (the family's): a
// comma or a dot, spaces around — and "1e3", ".5", "0x10", which Number()
// used to read as numbers, are typos as well.
console.log("--- Validation: typos are not numbers (audit A9, spec 6.1) ---");
(function () {
    assert(GM.Validation.parseNumber === undefined,
        "GM.Validation.parseNumber is gone: one converter, GM.Numbers.parse");

    var bad = ["1O5", "1 000", "10.5.2", "5o", "", "   ", "abc", "null",
               "1e3", ".5", "0x10", "20 mm"];
    var i, r;
    for (i = 0; i < bad.length; i++) {
        lastAlert = null;
        assert(GM.Validation.validateNumber(bad[i], R.markSize, "S", L) === null,
            "validateNumber: '" + bad[i] + "' is not a number");
        assert(lastAlert !== null, "validateNumber: '" + bad[i] + "' raises the alert");
        r = GM.Validation.validate(validCfg({ markSize: bad[i] }), L);
        assert(r.valid === false && r.settings === null,
            "validate: markSize '" + bad[i] + "' is invalid (was " + (r.valid ? "accepted" : "refused") + ")");
    }
    var fields = ["offsetX", "offsetY", "regWeight", "haloWeight"];
    for (i = 0; i < fields.length; i++) {
        var over = {}; over[fields[i]] = "1e3";
        assert(GM.Validation.validate(validCfg(over), L).valid === false, fields[i] + " '1e3' is invalid");
    }

    var good = [["2,5", 2.5], [" 3 ", 3], ["2.5", 2.5], ["12,5", 12.5], ["7", 7], [7, 7]];
    for (i = 0; i < good.length; i++) {
        r = GM.Validation.validate(validCfg({ markSize: good[i][0] }), L);
        assert(r.valid === true && r.settings.markSize === good[i][1],
            "validate: markSize " + JSON.stringify(good[i][0]) + " is " + good[i][1]);
    }
    assert(GM.Validation.validateNumber("0", { min: 0, max: 10, integer: false }, "X", L) === 0,
        "zero is a number (range rules decide)");
})();

// ===== TEST: corner zones fill edges by spacing (review G3) =====
// With zones on, distributeOnSpan uses the edge spacing even for a Count edge,
// so that spacing must be validated — it used to go through unchecked.
console.log("--- Validation: zones validate the spacing that is used (G3) ---");
(function () {
    var zoned = validCfg({ cornerZone: { enabled: true, count: 3, pitch: 50 } });
    zoned.top.spacing = "abc";
    lastAlert = null;
    assert(GM.Validation.validate(zoned, L).valid === false,
        "zones on: Count edge with invalid spacing -> invalid");

    var plain = validCfg({ cornerZone: { enabled: false, count: 3, pitch: 50 } });
    plain.top.spacing = "abc";
    lastAlert = null;
    assert(GM.Validation.validate(plain, L).valid === true,
        "zones off: spacing of a Count edge is unused and not checked");
})();

console.log("--- validate: path offset ---");
(function () {
    var cfg = GM.Config.getDefaults();
    cfg.placementMode = "path";
    cfg.pathOffset = "12,5";
    var r = GM.Validation.validate(cfg, L);
    assert(r.valid === true && r.settings.pathOffset === 12.5, "comma decimal accepted, parsed to 12.5");
    cfg.pathOffset = "-1";
    assert(GM.Validation.validate(cfg, L).valid === false, "negative offset rejected");
    cfg.placementMode = "artboard";
    assert(GM.Validation.validate(cfg, L).valid === true, "artboard mode ignores the path offset");
})();

console.log("--- validate: an invalid path offset never reaches the stored settings (final review I2) ---");
(function () {
    // Outside path mode the field is not checked, so a typo (or NaN, which JSON
    // turns into null) used to be stored and came back as an unusable field.
    var bad = ["abc", "", "-1", null, NaN, undefined, Infinity];
    for (var i = 0; i < bad.length; i++) {
        var cfg = GM.Config.getDefaults();
        cfg.placementMode = "artboard";
        cfg.pathOffset = bad[i];
        var r = GM.Validation.validate(cfg, L);
        assert(r.valid === true && r.settings.pathOffset === 0,
            "artboard mode, pathOffset " + String(bad[i]) + " -> stored as 0 (got " + (r.settings && r.settings.pathOffset) + ")");
        var back = JSON.parse(JSON.stringify(r.settings));
        assert(back.pathOffset === 0, "artboard mode, pathOffset " + String(bad[i]) + " -> still 0 after JSON");
    }
    var ok = GM.Config.getDefaults();
    ok.placementMode = "artboard";
    ok.pathOffset = "12,5";
    var r2 = GM.Validation.validate(ok, L);
    assert(r2.valid === true && r2.settings.pathOffset === 12.5, "artboard mode, a good offset is kept (parsed)");
    ok.pathOffset = 0;
    assert(GM.Validation.validate(ok, L).settings.pathOffset === 0, "artboard mode, offset 0 stays 0");
    // Path mode is unchanged: a bad offset is still an error there
    var pm = GM.Config.getDefaults();
    pm.placementMode = "path";
    pm.pathOffset = null;
    lastAlert = null;
    assert(GM.Validation.validate(pm, L).valid === false && lastAlert !== null, "path mode: a null offset is still rejected");
})();

// ===== TEST: storable — what a preset may hold (spec 6.4, 7) =====
// Every numeric field is a number the rules accept, or the field's default from
// the code: a preset never stores what the next opening cannot read. Fields
// the run does not check (the other mode, a disabled edge) are covered too.
console.log("--- Validation.storable: every number field is read, the unusable ones become defaults (spec 6.4) ---");
(function () {
    var D = GM.Config.getDefaults();

    // Good values: parsed (comma, spaces, strings), numbers kept
    var cfg = validCfg();
    cfg.offsetX = "12,5"; cfg.offsetY = " 8 "; cfg.markSize = 2.5;
    cfg.regWeight = "0.5"; cfg.haloWeight = "4";
    cfg.top = { enabled: true, useNumber: true, number: "12", spacing: "99,5" };
    cfg.cornerZone = { enabled: false, count: "7", pitch: "50" };
    cfg.pathDist = { useNumber: false, number: "30", spacing: "88,5" };
    cfg.pathOffset = "3,5";
    var s = GM.Validation.storable(cfg);
    assert(s.offsetX === 12.5 && s.offsetY === 8 && s.markSize === 2.5, "offsets and size parsed (got " + s.offsetX + ", " + s.offsetY + ", " + s.markSize + ")");
    assert(s.regWeight === 0.5 && s.haloWeight === 4, "weights parsed");
    assert(s.top.number === 12 && s.top.spacing === 99.5, "edge count and spacing parsed");
    assert(s.cornerZone.count === 7 && s.cornerZone.pitch === 50, "zone count and pitch parsed");
    assert(s.pathDist.number === 30 && s.pathDist.spacing === 88.5, "path count and spacing parsed");
    assert(s.pathOffset === 3.5, "path offset parsed");
    assert(typeof cfg.offsetX === "string" && cfg.top.number === "12", "the argument is not touched");

    // Each rule falls back to its own default: unreadable, out of range, fractional count
    var cases = [
        ["offsetX",   function (c, v) { c.offsetX = v; },               function (r) { return r.offsetX; },            D.offsetX,        ["abc", "", -1, 10000, NaN, null, undefined, Infinity]],
        ["offsetY",   function (c, v) { c.offsetY = v; },               function (r) { return r.offsetY; },            D.offsetY,        ["1O5", 99999]],
        ["markSize",  function (c, v) { c.markSize = v; },              function (r) { return r.markSize; },           D.markSize,       ["abc", 0, 0.001, 10000]],
        ["regWeight", function (c, v) { c.regWeight = v; },             function (r) { return r.regWeight; },          D.regWeight,      ["abc", 0, 51]],
        ["haloWeight", function (c, v) { c.haloWeight = v; },           function (r) { return r.haloWeight; },         D.haloWeight,     ["abc", 0.05, 51]],
        ["top.number", function (c, v) { c.top.number = v; },           function (r) { return r.top.number; },         D.top.number,     ["abc", 0, 10000, 10.5]],
        ["left.spacing", function (c, v) { c.left.spacing = v; },       function (r) { return r.left.spacing; },       D.left.spacing,   ["abc", 0, 10000]],
        ["bottom.number", function (c, v) { c.bottom.number = v; },     function (r) { return r.bottom.number; },      D.bottom.number,  ["1 000"]],
        ["right.spacing", function (c, v) { c.right.spacing = v; },     function (r) { return r.right.spacing; },      D.right.spacing,  ["1e3"]],
        ["cornerZone.count", function (c, v) { c.cornerZone.count = v; }, function (r) { return r.cornerZone.count; }, D.cornerZone.count, ["abc", 0, 1000, 2.5]],
        ["cornerZone.pitch", function (c, v) { c.cornerZone.pitch = v; }, function (r) { return r.cornerZone.pitch; }, D.cornerZone.pitch, ["abc", 0]],
        ["pathDist.number", function (c, v) { c.pathDist.number = v; }, function (r) { return r.pathDist.number; },     D.pathDist.number, ["abc", 0, 3.5]],
        ["pathDist.spacing", function (c, v) { c.pathDist.spacing = v; }, function (r) { return r.pathDist.spacing; }, D.pathDist.spacing, ["abc", 0]],
        ["pathOffset", function (c, v) { c.pathOffset = v; },           function (r) { return r.pathOffset; },         D.pathOffset,     ["abc", -1, 99999, NaN, null]]
    ];
    for (var i = 0; i < cases.length; i++) {
        var name = cases[i][0], set = cases[i][1], get = cases[i][2], dflt = cases[i][3], bad = cases[i][4];
        for (var j = 0; j < bad.length; j++) {
            var c = validCfg();
            set(c, bad[j]);
            var got = get(GM.Validation.storable(c));
            assert(got === dflt, name + " " + String(bad[j]) + " -> the default " + dflt + " (got " + got + ")");
        }
    }

    // A value that is already a number is not read as text: String(1e-7) is "1e-7",
    // which the field grammar refuses, but 1e-7 is a good Offset X (min 0).
    var tiny = validCfg({ offsetX: 1e-7, pathOffset: 1e-7 });
    var st = GM.Validation.storable(tiny);
    assert(st.offsetX === 1e-7 && st.pathOffset === 1e-7, "a tiny number stays (got " + st.offsetX + ", " + st.pathOffset + ")");

    // Nothing but numbers changes; the result survives JSON
    var cfg2 = validCfg({ units: "cm", markSize: "abc" });
    cfg2.markLayerName = "L"; cfg2.placementMode = "path";
    var s2 = GM.Validation.storable(cfg2);
    assert(s2.units === "cm" && s2.markLayerName === "L" && s2.placementMode === "path" &&
           s2.markCircle === true && s2.bottomMirror === true && s2.top.enabled === true && s2.top.useNumber === true,
           "text, flags and edge switches are copied unchanged");
    assert(JSON.stringify(GM.Validation.storable(validCfg({ offsetX: NaN, markSize: NaN }))).indexOf("null") < 0,
        "no null after JSON (NaN is what JSON turns into null)");

    // A cfg without the sub-objects does not throw
    var thin = { offsetX: "5", markSize: "abc" };
    var rt = null, threw = false;
    try { rt = GM.Validation.storable(thin); } catch (e) { threw = true; }
    assert(!threw && rt.offsetX === 5 && rt.markSize === D.markSize && rt.regWeight === D.regWeight,
        "a thin cfg is read too: missing fields take the defaults");
})();

console.log("--- validate: the stored settings come from storable (spec 6.4, review focus 2) ---");
(function () {
    var D = GM.Config.getDefaults();
    // Artboard mode: the path fields are hidden, so a typo there is not checked...
    var cfg = validCfg();
    cfg.placementMode = "artboard";
    cfg.pathDist = { useNumber: false, number: "abc", spacing: "abc" };
    cfg.pathOffset = "99999";
    cfg.cornerZone = { enabled: false, count: "x", pitch: "y" };
    cfg.bottom.number = "x"; cfg.bottom.spacing = "y";   // mirrored: not checked
    cfg.left.spacing = "y";                              // a Count edge: its spacing is not used
    lastAlert = null;
    var r = GM.Validation.validate(cfg, L);
    assert(r.valid === true && lastAlert === null, "hidden or unused typos do not refuse the run");
    assert(r.settings.pathDist.number === D.pathDist.number && r.settings.pathDist.spacing === D.pathDist.spacing,
        "...and are stored as the path defaults (got " + r.settings.pathDist.number + ", " + r.settings.pathDist.spacing + ")");
    assert(r.settings.pathOffset === 0, "...pathOffset 99999 as 0 (the upper bound 9999 holds there too)");
    assert(r.settings.cornerZone.count === D.cornerZone.count && r.settings.cornerZone.pitch === D.cornerZone.pitch,
        "...the unused zone fields as the zone defaults");
    assert(r.settings.bottom.number === D.bottom.number && r.settings.bottom.spacing === D.bottom.spacing &&
           r.settings.left.spacing === D.left.spacing && r.settings.left.number === 10,
        "...the unused edge fields as the edge defaults");
    var back = JSON.parse(JSON.stringify(r.settings));
    var gate = GM.Validation.validate(back, L);
    assert(gate.valid === true, "what is stored passes validate() when it comes back");

    // Path mode: the edges are hidden
    var pm = validCfg();
    pm.placementMode = "path";
    pm.pathDist = { useNumber: false, number: 24, spacing: "88,5" };
    pm.pathOffset = "2";
    pm.top.number = "x"; pm.top.spacing = "y";
    var rp = GM.Validation.validate(pm, L);
    assert(rp.valid === true && rp.settings.pathDist.spacing === 88.5 && rp.settings.pathOffset === 2,
        "path mode: the checked values are the parsed ones");
    assert(rp.settings.top.number === D.top.number && rp.settings.top.spacing === D.top.spacing,
        "path mode: hidden edge typos are stored as the edge defaults");

    // The checked fields still refuse (nothing is swallowed into a default)
    lastAlert = null;
    assert(GM.Validation.validate(validCfg({ markSize: "abc" }), L).valid === false && lastAlert !== null,
        "a typo in a checked field is still refused, not turned into a default");
})();

// ===== TEST: a blocking alert is "CHYBA: ..." and never shouts (spec 6.5) =====
// validate() refuses with an alert after which the run ends: the family's
// prefix in front, no exclamation mark, the field's name in quotes without the
// label's colon ("Odsazení X:" is a label, the message names the field), and
// at the end what happened to the document (canon 12.2, ruling R5): nothing,
// the dialog's values are checked before anything is drawn.
console.log("--- Validation: alerts carry the error prefix, no '!' (spec 6.5) ---");
(function () {
    var refusals = [
        ["not a number",   function () { return validCfg({ offsetX: "abc" }); }],
        ["not a whole number", function () { return validCfg({ top: { enabled: true, useNumber: true, number: 3.5, spacing: 105 } }); }],
        ["out of range",   function () { return validCfg({ markSize: 0 }); }],
        ["zone spacing",   function () { return validCfg({ cornerZone: { enabled: true, count: 5, pitch: 0 } }); }],
        ["path spacing",   function () {
            return validCfg({ placementMode: "path", pathDist: { useNumber: false, number: 24, spacing: 0 } });
        }],
        ["no shape",       function () { return validCfg({ markCircle: false, markCross: false }); }],
        ["no edge",        function () {
            return validCfg({
                top:  { enabled: false, useNumber: true, number: 10, spacing: 105 },
                left: { enabled: false, useNumber: true, number: 10, spacing: 105 },
                bottomMirror: true, rightMirror: true });
        }]
    ];
    var langs = [["cs_CZ", "CHYBA: "], ["en_US", "ERROR: "]];
    var saved = GM.L;
    for (var li = 0; li < langs.length; li++) {
        GM.L = tableFor(langs[li][0]);
        assert(GM.L.ERR_PREFIX === langs[li][1], langs[li][0] + ": ERR_PREFIX is '" + langs[li][1] + "'");
        for (var ri = 0; ri < refusals.length; ri++) {
            lastAlert = null;
            var r = GM.Validation.validate(refusals[ri][1](), GM.L);
            var tag = langs[li][0] + " / " + refusals[ri][0];
            assert(r.valid === false && lastAlert !== null, tag + ": refused with an alert");
            if (lastAlert === null) continue;
            var prefix = String(GM.L.ERR_PREFIX);
            assert(lastAlert.indexOf(prefix) === 0, tag + ": starts with '" + prefix + "' (got '" + lastAlert + "')");
            assert(lastAlert.indexOf("!") < 0, tag + ": no exclamation mark (got '" + lastAlert + "')");
            assert(lastAlert.indexOf("%s") < 0 && lastAlert.indexOf("undefined") < 0, tag + ": no unfilled placeholder (got '" + lastAlert + "')");
            var sentence = String(GM.L.DOC_UNCHANGED), tail = " " + sentence;
            assert(lastAlert.length > tail.length && lastAlert.substring(lastAlert.length - tail.length) === tail,
                tag + ": ends with '" + tail + "' (got '" + lastAlert + "')");
            assert(lastAlert.indexOf(sentence) === lastAlert.lastIndexOf(sentence),
                tag + ": the sentence stands once");
            assert(lastAlert.substring(prefix.length).indexOf(":") < 0,
                tag + ": the label's colon is not carried into the sentence (got '" + lastAlert + "')");
        }
    }

    // The exact words, Czech and English
    GM.L = tableFor("cs_CZ");
    lastAlert = null; GM.Validation.validate(validCfg({ offsetX: "abc" }), GM.L);
    assert(lastAlert === "CHYBA: Pole „Odsazení X“ musí být číslo. Dokument nebyl změněn.", "CS number: got '" + lastAlert + "'");
    lastAlert = null; GM.Validation.validate(validCfg({ offsetX: -5 }), GM.L);
    assert(lastAlert === "CHYBA: Pole „Odsazení X“ musí být mezi 0 a 9999. Dokument nebyl změněn.", "CS range: got '" + lastAlert + "'");
    lastAlert = null; GM.Validation.validate(validCfg({ top: { enabled: true, useNumber: true, number: 3.5, spacing: 105 } }), GM.L);
    assert(lastAlert === "CHYBA: Pole „Počet ok“ musí být celé číslo. Dokument nebyl změněn.", "CS whole number: got '" + lastAlert + "'");
    GM.L = tableFor("en_US");
    lastAlert = null; GM.Validation.validate(validCfg({ offsetX: "abc" }), GM.L);
    assert(lastAlert === 'ERROR: Field "Offset X" must be a number. The document was not changed.', "EN number: got '" + lastAlert + "'");
    lastAlert = null; GM.Validation.validate(validCfg({ offsetX: -5 }), GM.L);
    assert(lastAlert === 'ERROR: Field "Offset X" must be between 0 and 9999. The document was not changed.', "EN range: got '" + lastAlert + "'");

    // The limits in a range message are written the way the fields are: the
    // Czech comma, not a dot (ruling R5b); the dot stays in English.
    GM.L = tableFor("cs_CZ");
    lastAlert = null; GM.Validation.validate(validCfg({ markSize: 0 }), GM.L);
    assert(lastAlert === "CHYBA: Pole „Velikost“ musí být mezi 0,01 a 9999. Dokument nebyl změněn.",
        "CS markSize range shows '0,01' (got '" + lastAlert + "')");
    lastAlert = null; GM.Validation.validate(validCfg({ regWeight: 0 }), GM.L);
    assert(lastAlert.indexOf("mezi 0,1 a 50.") > 0, "CS weight range shows '0,1' (got '" + lastAlert + "')");
    GM.L = tableFor("en_US");
    lastAlert = null; GM.Validation.validate(validCfg({ markSize: 0 }), GM.L);
    assert(lastAlert === 'ERROR: Field "Size" must be between 0.01 and 9999. The document was not changed.',
        "EN markSize range keeps '0.01' (got '" + lastAlert + "')");

    // The zone's spacing field is named by the glossary's word
    GM.L = tableFor("cs_CZ");
    lastAlert = null; GM.Validation.validate(validCfg({ cornerZone: { enabled: true, count: 5, pitch: 0 } }), GM.L);
    assert(lastAlert.indexOf("Pole „Rozteč“") > 0, "CS zone pitch is named 'Rozteč' (got '" + lastAlert + "')");
    GM.L = saved;
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
