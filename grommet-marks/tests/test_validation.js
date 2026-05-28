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
    ERR_NO_APPEARANCE:   "Marks must have fill and/or stroke.",
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

    // no appearance
    var noApp = validCfg({ fillEnabled: false, strokeEnabled: false });
    lastAlert = null;
    assert(GM.Validation.validate(noApp, L).valid === false, "no fill/stroke → invalid");
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

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
