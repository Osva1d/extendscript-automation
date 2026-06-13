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

// Locale stub with the formatter + keys the validator references
var L = {
    format: function (t) {
        var a = [], i;
        for (i = 1; i < arguments.length; i++) a.push(arguments[i]);
        var idx = 0;
        return t.replace(/%s/g, function () { return idx < a.length ? a[idx++] : "%s"; });
    },
    ERR_MUST_BE_NUMBER:  "%s must be a number!",
    ERR_MUST_BE_INTEGER: "%s must be a whole number!",
    ERR_OUT_OF_RANGE:    "%s must be between %s and %s!",
    ERR_NO_APPEARANCE:   "Marks must have at least one shape — circle and/or cross.",
    ERR_NO_EDGE:         "At least one edge must be enabled.",
    OFFSET_X: "Offset X", OFFSET_Y: "Offset Y", SIZE_LABEL: "Size",
    WEIGHT: "Weight", COUNT: "Count", SPACING: "Spacing"
};

// ===== LOAD PRODUCTION CODE =====
eval(fs.readFileSync(path.join(__dirname, "..", "src", "constants.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "config.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "validation.js"), "utf8"));

// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}
function validCfg(over) {
    var c = GM.Config.getDefaults();
    // defaults: top+left enabled (count mode), bottom/right mirrored, fill on
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
    assert(GM.Validation.validateNumber("101", R.strokeWeight, "W", L) === null, "above max → null");
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
    assert(lastAlert === L.ERR_NO_APPEARANCE, "no-appearance alert shown");

    // no edges (top+left off, both mirrored)
    var noEdge = validCfg({
        top:  { enabled: false, useNumber: true, number: 10, spacing: 105 },
        left: { enabled: false, useNumber: true, number: 10, spacing: 105 },
        bottomMirror: true, rightMirror: true
    });
    lastAlert = null;
    assert(GM.Validation.validate(noEdge, L).valid === false, "no enabled edges → invalid");
    assert(lastAlert === L.ERR_NO_EDGE, "no-edge alert shown");

    // non-mirrored enabled edge with bad count
    var badCount = validCfg({
        bottomMirror: false,
        bottom: { enabled: true, useNumber: true, number: 0, spacing: 105 }
    });
    assert(GM.Validation.validate(badCount, L).valid === false, "edge count 0 → invalid");

    // stroke enabled with bad weight
    var badWeight = validCfg({ strokeEnabled: true, strokeWeight: "abc" });
    assert(GM.Validation.validate(badWeight, L).valid === false, "bad stroke weight → invalid");
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

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
