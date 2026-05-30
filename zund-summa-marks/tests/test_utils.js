#!/usr/bin/env node
/**
 * ZSM.Utils Test Suite
 * Tests pure JS helpers in src/lib/utils.js — no Illustrator DOM needed.
 *
 * Coverage:
 *   - mm2pt / pt2mm conversions (roundtrip + edge cases)
 *   - validateNumber (range, decimals, comma decimal, NaN, infinity)
 *   - presetEquals (deep compare, type coercion, layers array, exotic values)
 *
 * Usage: node tests/test_utils.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
var ZSM = {};
// validateNumber calls alert() and ZSM.L.format() on validation failure.
// Mock both so tests don't crash and we can capture the failure path.
var alertCalls = [];
global.alert = function (msg) { alertCalls.push(msg); };
ZSM.L = {
    ERR_MUST_BE_NUMBER: "%s must be a number",
    ERR_OUT_OF_RANGE:   "%s must be between %s and %s",
    format: function (template) {
        var args = [];
        for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
        var idx = 0;
        return template.replace(/%s/g, function () {
            return idx < args.length ? String(args[idx++]) : "%s";
        });
    }
};

// ===== LOAD PRODUCTION CODE =====
var utilsPath = path.join(__dirname, "..", "src", "lib", "utils.js");
eval(fs.readFileSync(utilsPath, "utf8"));


// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}
function assertClose(a, b, tol, msg) {
    total++;
    if (Math.abs(a - b) <= tol) { pass++; }
    else { fail++; console.log("  FAIL: " + msg + " | got=" + a + " expected=" + b); }
}


// =====================================================
// TEST 1: mm/pt CONVERSIONS
// =====================================================
console.log("\n=== TEST 1: mm/pt conversions ===");
assertClose(ZSM.Utils.mm2pt(0), 0, 0.0001, "mm2pt(0) = 0");
assertClose(ZSM.Utils.mm2pt(1), 2.83464567, 0.0001, "mm2pt(1) = 2.834...");
assertClose(ZSM.Utils.mm2pt(25.4), 72.0, 0.01, "mm2pt(25.4) = 72 (1 inch)");
assertClose(ZSM.Utils.mm2pt(1000), 2834.64567, 0.001, "mm2pt(1000) = 2834.6...");
assertClose(ZSM.Utils.pt2mm(0), 0, 0.0001, "pt2mm(0) = 0");
assertClose(ZSM.Utils.pt2mm(72), 25.4, 0.01, "pt2mm(72) = 25.4");
assertClose(ZSM.Utils.pt2mm(ZSM.Utils.mm2pt(123.456)), 123.456, 0.0001, "Roundtrip mm");

// Negative values
assertClose(ZSM.Utils.mm2pt(-50), -141.732, 0.001, "mm2pt: negative input preserves sign");
assertClose(ZSM.Utils.pt2mm(-72), -25.4, 0.01, "pt2mm: negative input preserves sign");

// NaN propagation
assert(isNaN(ZSM.Utils.mm2pt(NaN)), "mm2pt(NaN) = NaN");
assert(isNaN(ZSM.Utils.pt2mm(NaN)), "pt2mm(NaN) = NaN");


// =====================================================
// TEST 2: validateNumber — happy paths
// =====================================================
console.log("\n=== TEST 2: validateNumber happy path ===");
alertCalls = [];
assert(ZSM.Utils.validateNumber("5", 0, 10, "Test") === 5, "validateNumber: '5' → 5");
assert(ZSM.Utils.validateNumber(5, 0, 10, "Test") === 5, "validateNumber: 5 → 5");
assert(ZSM.Utils.validateNumber("5.5", 0, 10, "Test") === 5.5, "validateNumber: '5.5' → 5.5");
assert(ZSM.Utils.validateNumber("5,5", 0, 10, "Test") === 5.5, "validateNumber: '5,5' (CZ comma) → 5.5");
assert(ZSM.Utils.validateNumber("0", 0, 10, "Test") === 0, "validateNumber: '0' (min boundary) → 0");
assert(ZSM.Utils.validateNumber("10", 0, 10, "Test") === 10, "validateNumber: '10' (max boundary) → 10");
assert(alertCalls.length === 0, "validateNumber: happy path no alerts");


// =====================================================
// TEST 3: validateNumber — error paths
// =====================================================
console.log("\n=== TEST 3: validateNumber error paths ===");
alertCalls = [];

// NaN inputs
assert(ZSM.Utils.validateNumber("abc", 0, 10, "Test") === null, "validateNumber: 'abc' → null");
assert(alertCalls.length === 1, "validateNumber: 'abc' triggers 1 alert");
assert(/must be a number/.test(alertCalls[0]), "validateNumber: 'abc' alert message correct");

// Out of range
alertCalls = [];
assert(ZSM.Utils.validateNumber("-1", 0, 10, "Test") === null, "validateNumber: -1 below min → null");
assert(alertCalls.length === 1, "validateNumber: out of range triggers alert");
assert(/between/.test(alertCalls[0]), "validateNumber: out-of-range message correct");

alertCalls = [];
assert(ZSM.Utils.validateNumber("11", 0, 10, "Test") === null, "validateNumber: 11 above max → null");

// Empty string
alertCalls = [];
assert(ZSM.Utils.validateNumber("", 0, 10, "Test") === null, "validateNumber: '' (empty) → null");

// Whitespace-only (post-fix: treated as invalid)
alertCalls = [];
assert(ZSM.Utils.validateNumber("   ", 0, 10, "Test") === null, "validateNumber: whitespace-only → null");
assert(alertCalls.length === 1, "validateNumber: whitespace-only triggers 'must be a number' alert");
assert(/must be a number/.test(alertCalls[0]), "validateNumber: whitespace alert message correct");

// Multiple commas (invalid)
alertCalls = [];
assert(ZSM.Utils.validateNumber("1,2,3", 0, 10, "Test") === null, "validateNumber: '1,2,3' → null");

// Infinity
alertCalls = [];
assert(ZSM.Utils.validateNumber(Infinity, 0, 10, "Test") === null, "validateNumber: Infinity > max → null");

// Scientific notation
alertCalls = [];
assert(ZSM.Utils.validateNumber("1e2", 0, 200, "Test") === 100, "validateNumber: '1e2' → 100");


// =====================================================
// TEST 4: presetEquals — null/undefined handling
// =====================================================
console.log("\n=== TEST 4: presetEquals null/undefined ===");
assert(ZSM.Utils.presetEquals(null, null) === false, "presetEquals(null, null) = false");
assert(ZSM.Utils.presetEquals(undefined, undefined) === false, "presetEquals(undef, undef) = false");
assert(ZSM.Utils.presetEquals({}, null) === false, "presetEquals({}, null) = false");
assert(ZSM.Utils.presetEquals(null, {}) === false, "presetEquals(null, {}) = false");


// =====================================================
// TEST 5: presetEquals — identical objects
// =====================================================
console.log("\n=== TEST 5: presetEquals identical ===");
function makeBaseline() {
    return {
        mode: "ZUND",
        gapInner: 5, gapOuter: 0, maxDist: 500,
        feedTop: 70, feedBottom: 50,
        drawRed: true, useArtboardBounds: false,
        markSizeZ: 5, markSizeS: 3, orientDist: 100,
        markColor: "[Registration]",
        scaleN: 1,                                            // Phase 2
        layers: [{ name: "Cut", color: "[Registration]" }]
    };
}
var a = makeBaseline();
var b = makeBaseline();
assert(ZSM.Utils.presetEquals(a, b) === true, "presetEquals: identical objects → true");
assert(ZSM.Utils.presetEquals(a, a) === true, "presetEquals: same reference → true");


// =====================================================
// TEST 6: presetEquals — single-field differences
// =====================================================
console.log("\n=== TEST 6: presetEquals single-field diff ===");
var fields = ["mode", "gapInner", "gapOuter", "maxDist", "feedTop", "feedBottom",
              "drawRed", "useArtboardBounds", "markSizeZ", "markSizeS",
              "orientDist", "markColor", "scaleN"];
for (var fi = 0; fi < fields.length; fi++) {
    var orig = makeBaseline();
    var modified = makeBaseline();
    var k = fields[fi];
    // Mutate the field to a different value
    if (typeof orig[k] === "boolean")     modified[k] = !orig[k];
    else if (typeof orig[k] === "number") modified[k] = orig[k] + 1;
    else                                   modified[k] = orig[k] + "_diff";
    assert(ZSM.Utils.presetEquals(orig, modified) === false,
           "presetEquals: diff in '" + k + "' → false");
}


// =====================================================
// TEST 7: presetEquals — type coercion (string vs number)
// =====================================================
console.log("\n=== TEST 7: presetEquals type coercion ===");
var stringy = makeBaseline();
stringy.gapInner = "5";          // String instead of number
stringy.markSizeZ = "5";
var numeric = makeBaseline();
// Both compare equal because String() coerces
assert(ZSM.Utils.presetEquals(stringy, numeric) === true,
       "presetEquals: '5' (string) == 5 (number) via String() coercion");

var stringyDiff = makeBaseline();
stringyDiff.gapInner = "5.0";
assert(ZSM.Utils.presetEquals(stringyDiff, numeric) === false,
       "presetEquals: '5.0' (string) !== '5' via String() (no normalization)");


// =====================================================
// TEST 8: presetEquals — layers array
// =====================================================
console.log("\n=== TEST 8: presetEquals layers array ===");

// Different array lengths
var aLen2 = makeBaseline();
aLen2.layers = [{ name: "Cut", color: "[Registration]" }, { name: "Kiss", color: "[Registration]" }];
assert(ZSM.Utils.presetEquals(makeBaseline(), aLen2) === false,
       "presetEquals: layers length 1 vs 2 → false");

// Same length, different name
var diffName = makeBaseline();
diffName.layers = [{ name: "Thru-cut", color: "[Registration]" }];
assert(ZSM.Utils.presetEquals(makeBaseline(), diffName) === false,
       "presetEquals: different layer name → false");

// Same length, different color
var diffColor = makeBaseline();
diffColor.layers = [{ name: "Cut", color: "MyCustomSpot" }];
assert(ZSM.Utils.presetEquals(makeBaseline(), diffColor) === false,
       "presetEquals: different layer color → false");

// Empty layers vs missing layers
var noLayers = makeBaseline();
delete noLayers.layers;
var emptyLayers = makeBaseline();
emptyLayers.layers = [];
assert(ZSM.Utils.presetEquals(noLayers, emptyLayers) === true,
       "presetEquals: missing layers === empty layers (both default to [])");

// Layer with missing name vs empty name
var nullName = makeBaseline();
nullName.layers = [{ name: null, color: "[Registration]" }];
var emptyName = makeBaseline();
emptyName.layers = [{ name: "", color: "[Registration]" }];
assert(ZSM.Utils.presetEquals(nullName, emptyName) === true,
       "presetEquals: null name === empty name (both default to '')");


// =====================================================
// TEST 9: presetEquals — extra fields outside schema
// =====================================================
console.log("\n=== TEST 9: presetEquals ignores extra fields ===");
var withExtra = makeBaseline();
withExtra.somethingExtra = "ignored";
withExtra.activePreset = "should-not-affect-equality";
assert(ZSM.Utils.presetEquals(makeBaseline(), withExtra) === true,
       "presetEquals: extra fields outside schema are ignored");


// =====================================================
// TEST 10: presetEquals — exotic values
// =====================================================
console.log("\n=== TEST 10: presetEquals exotic values ===");

// undefined fields (vs missing) — String(undefined) === "undefined"
var undefField = makeBaseline();
undefField.gapInner = undefined;
var missingField = makeBaseline();
delete missingField.gapInner;
// Both result in String(undefined) === "undefined" → equal
assert(ZSM.Utils.presetEquals(undefField, missingField) === true,
       "presetEquals: undefined === missing field (both stringify to 'undefined')");

// NaN handling — String(NaN) === "NaN"
var nanField = makeBaseline();
nanField.gapInner = NaN;
var nanField2 = makeBaseline();
nanField2.gapInner = NaN;
assert(ZSM.Utils.presetEquals(nanField, nanField2) === true,
       "presetEquals: NaN === NaN via String() (unlike === in JS)");


// =====================================================
// TEST 11: getEffectiveSF — composes Large Canvas SF with manual scaleN
// Regression guard for the v26.4.0 bug where draw.js used raw getSF()
// and ignored scaleN, so marks weren't shrunk in 1:10 workflow.
// =====================================================
console.log("\n=== TEST 11: getEffectiveSF (scaleN composition) ===");

// Mock app for getSF(): standard doc → scaleFactor 1
global.app = {
    documents: { length: 1 },
    activeDocument: { scaleFactor: 1 }
};

assert(ZSM.Utils.getEffectiveSF({ scaleN: 1 })  === 1,  "scaleN=1, SF=1 → 1");
assert(ZSM.Utils.getEffectiveSF({ scaleN: 2 })  === 2,  "scaleN=2, SF=1 → 2");
assert(ZSM.Utils.getEffectiveSF({ scaleN: 10 }) === 10, "scaleN=10, SF=1 → 10");

// Defensive defaults — missing/garbage scaleN must collapse to 1, not crash
assert(ZSM.Utils.getEffectiveSF({})              === 1, "missing scaleN → defaults to 1");
assert(ZSM.Utils.getEffectiveSF({ scaleN: 0 })   === 1, "scaleN=0 (invalid) → coerced to 1");
assert(ZSM.Utils.getEffectiveSF({ scaleN: -3 })  === 1, "scaleN<0 (invalid) → coerced to 1");
assert(ZSM.Utils.getEffectiveSF({ scaleN: NaN }) === 1, "scaleN=NaN → coerced to 1");
assert(ZSM.Utils.getEffectiveSF(null)            === 1, "null settings → 1");
assert(ZSM.Utils.getEffectiveSF(undefined)       === 1, "undefined settings → 1");

// String coercion — UI inputs are sometimes strings
assert(ZSM.Utils.getEffectiveSF({ scaleN: "5" }) === 5, "scaleN='5' (string) → 5");

// Compose with Large Canvas
global.app.activeDocument.scaleFactor = 10;
assert(ZSM.Utils.getEffectiveSF({ scaleN: 1 })  === 10,  "Large Canvas (SF=10) × scaleN=1 → 10");
assert(ZSM.Utils.getEffectiveSF({ scaleN: 10 }) === 100, "Large Canvas (SF=10) × scaleN=10 → 100");


// =====================================================
// SUMMARY
// =====================================================
console.log("\n" + "=".repeat(50));
console.log("UTILS TEST RESULTS: " + pass + "/" + total + " PASSED, " + fail + " FAILED");
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
