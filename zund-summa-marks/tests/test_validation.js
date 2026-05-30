#!/usr/bin/env node
/**
 * ZSM.Validation Test Suite
 * Tests src/lib/validation.js — pure validation logic with no DOM dependency.
 *
 * Coverage:
 *   - Schema completeness (rules table)
 *   - Happy path: valid raw values → clean settings
 *   - Error path: out-of-range, NaN, empty/whitespace strings
 *   - Mode-specific fields preserved from prev when opposite mode
 *   - Boolean / dropdown / layers passthrough
 *   - Comma-decimal normalization
 *   - Edge cases: missing raw, missing prev, missing locale
 *   - All min/max boundaries documented
 *
 * Usage: node tests/test_validation.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
var ZSM = {};
var alertCalls = [];
global.alert = function (msg) { alertCalls.push(msg); };

// Minimal locale (with format() for validateNumber alerts)
var L_EN = {
    ERR_MUST_BE_NUMBER: "%s must be a number",
    ERR_OUT_OF_RANGE:   "%s must be between %s and %s",
    GAP_ZO:        "Outer gap",
    GAP_GZ:        "Inner gap",
    MAX_DIST:      "Max distance",
    MARK_SIZE_Z:   "Zünd size",
    MARK_SIZE_S:   "Summa size",
    ORIENT_DIST:   "Orient distance",
    FEED_TOP:      "Feed top",
    FEED_BOT:      "Feed bottom",
    format: function (template) {
        var args = [];
        for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
        var idx = 0;
        return template.replace(/%s/g, function () {
            return idx < args.length ? String(args[idx++]) : "%s";
        });
    }
};
ZSM.L = L_EN;

// ===== LOAD PRODUCTION CODE =====
var utilsPath = path.join(__dirname, "..", "src", "lib", "utils.js");
eval(fs.readFileSync(utilsPath, "utf8"));
var validationPath = path.join(__dirname, "..", "src", "lib", "validation.js");
eval(fs.readFileSync(validationPath, "utf8"));


// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}
function assertEq(a, b, msg) {
    total++;
    if (a === b) { pass++; }
    else { fail++; console.log("  FAIL: " + msg + " | got=" + JSON.stringify(a) + " expected=" + JSON.stringify(b)); }
}


// ===== TEST FIXTURES =====
function rawZund(overrides) {
    var base = {
        mode: "ZUND",
        gapOuter: "0", maxDist: "500",
        gapInner: "5", markSizeZ: "5", orientDist: "100",
        useArtboardBounds: false,
        markColor: "[Registration]",
        layers: [{ name: "Cut", color: "[Registration]" }]
    };
    if (overrides) for (var k in overrides) {
        if (overrides.hasOwnProperty(k)) base[k] = overrides[k];
    }
    return base;
}
function rawSumma(overrides) {
    var base = {
        mode: "SUMMA",
        gapOuter: "0", maxDist: "500",
        markSizeS: "3", feedTop: "70", feedBottom: "50",
        drawRed: true,
        useArtboardBounds: false,
        markColor: "[Registration]",
        layers: [{ name: "Cut", color: "[Registration]" }]
    };
    if (overrides) for (var k in overrides) {
        if (overrides.hasOwnProperty(k)) base[k] = overrides[k];
    }
    return base;
}
function fullPrev() {
    return {
        mode: "ZUND",
        gapOuter: 0, maxDist: 500,
        gapInner: 5, markSizeZ: 5, orientDist: 100,
        markSizeS: 3, feedTop: 70, feedBottom: 50,
        drawRed: true, useArtboardBounds: false,
        markColor: "[Registration]",
        layers: [{ name: "Cut", color: "[Registration]" }]
    };
}


// =====================================================
// TEST 1: Schema completeness
// =====================================================
console.log("\n=== TEST 1: Schema (rules table) completeness ===");
assert(typeof ZSM.Validation === "object", "ZSM.Validation exists");
assert(typeof ZSM.Validation.validate === "function", "validate() function exists");
assert(typeof ZSM.Validation.rules === "object", "rules object exists");

var requiredRuleFields = ["gapOuter", "maxDist", "gapInner", "markSizeZ",
                          "orientDist", "markSizeS", "feedTop", "feedBottom",
                          "scaleN"];
for (var i = 0; i < requiredRuleFields.length; i++) {
    var f = requiredRuleFields[i];
    assert(ZSM.Validation.rules[f] !== undefined, "Rule for '" + f + "' exists");
    assert(typeof ZSM.Validation.rules[f].min === "number", "Rule '" + f + "' has min");
    assert(typeof ZSM.Validation.rules[f].max === "number", "Rule '" + f + "' has max");
    assert(typeof ZSM.Validation.rules[f].label === "string", "Rule '" + f + "' has label");
}

// scaleN-specific schema asserts (Phase 2)
assert(ZSM.Validation.rules.scaleN.min === 1, "scaleN.min === 1");
assert(ZSM.Validation.rules.scaleN.max === 10, "scaleN.max === 10");
assert(ZSM.Validation.rules.scaleN.integer === true, "scaleN.integer === true");


// =====================================================
// TEST 2: Happy path — ZUND mode
// =====================================================
console.log("\n=== TEST 2: Happy path ZUND ===");
alertCalls = [];
var r = ZSM.Validation.validate(rawZund(), fullPrev(), L_EN);
assert(r.valid === true, "ZUND valid input → valid=true");
assert(r.errors.length === 0, "ZUND valid input → no errors");
assertEq(r.settings.mode, "ZUND", "mode preserved");
assertEq(r.settings.gapInner, 5, "gapInner parsed to number");
assertEq(r.settings.markSizeZ, 5, "markSizeZ parsed");
assertEq(r.settings.orientDist, 100, "orientDist parsed");
// Mode-irrelevant fields from prev
assertEq(r.settings.markSizeS, 3, "markSizeS preserved from prev (SUMMA-only)");
assertEq(r.settings.feedTop, 70, "feedTop preserved from prev");
assertEq(r.settings.feedBottom, 50, "feedBottom preserved from prev");
assert(alertCalls.length === 0, "Happy path: no alerts");


// =====================================================
// TEST 3: Happy path — SUMMA mode
// =====================================================
console.log("\n=== TEST 3: Happy path SUMMA ===");
alertCalls = [];
r = ZSM.Validation.validate(rawSumma(), fullPrev(), L_EN);
assert(r.valid === true, "SUMMA valid input → valid=true");
assertEq(r.settings.mode, "SUMMA", "mode preserved");
assertEq(r.settings.markSizeS, 3, "markSizeS parsed");
assertEq(r.settings.feedTop, 70, "feedTop parsed");
assertEq(r.settings.feedBottom, 50, "feedBottom parsed");
// Mode-irrelevant from prev
assertEq(r.settings.gapInner, 5, "gapInner preserved from prev (ZUND-only)");
assertEq(r.settings.markSizeZ, 5, "markSizeZ preserved from prev");
assertEq(r.settings.orientDist, 100, "orientDist preserved from prev");


// =====================================================
// TEST 4: Boundary values per rule
// =====================================================
console.log("\n=== TEST 4: Min/max boundaries ===");
alertCalls = [];

// gapOuter: 0..1000
assert(ZSM.Validation.validate(rawZund({ gapOuter: "0" }), fullPrev(), L_EN).valid, "gapOuter=0 (min) valid");
assert(ZSM.Validation.validate(rawZund({ gapOuter: "1000" }), fullPrev(), L_EN).valid, "gapOuter=1000 (max) valid");
assert(!ZSM.Validation.validate(rawZund({ gapOuter: "-1" }), fullPrev(), L_EN).valid, "gapOuter=-1 invalid");
assert(!ZSM.Validation.validate(rawZund({ gapOuter: "1001" }), fullPrev(), L_EN).valid, "gapOuter=1001 invalid");

// maxDist: 5..5000 (min lowered from 50 to 5 to support 1:10 manual-scale workflows)
assert(ZSM.Validation.validate(rawZund({ maxDist: "5" }),    fullPrev(), L_EN).valid, "maxDist=5 (min) valid");
assert(ZSM.Validation.validate(rawZund({ maxDist: "5000" }), fullPrev(), L_EN).valid, "maxDist=5000 (max) valid");
assert(!ZSM.Validation.validate(rawZund({ maxDist: "4" }),   fullPrev(), L_EN).valid, "maxDist=4 below min");
assert(!ZSM.Validation.validate(rawZund({ maxDist: "5001" }),fullPrev(), L_EN).valid, "maxDist=5001 above max");
assert(!ZSM.Validation.validate(rawZund({ maxDist: "0" }),   fullPrev(), L_EN).valid, "maxDist=0 below min");

// Regression: 1:10 scale workflow — user enters 40 mm (was blocked before fix)
assert(ZSM.Validation.validate(rawZund({ maxDist: "40" }), fullPrev(), L_EN).valid,
    "BUG FIX: maxDist=40 valid (1:10 scale workflow unblocked)");
// And a typical 1:10 corner: 30 mm (= 300 mm real intent)
assert(ZSM.Validation.validate(rawZund({ maxDist: "30" }), fullPrev(), L_EN).valid,
    "1:10 workflow: maxDist=30 (300 mm real intent) valid");

// markSizeZ: 0.1..50
assert(ZSM.Validation.validate(rawZund({ markSizeZ: "0.1" }), fullPrev(), L_EN).valid, "markSizeZ=0.1 (min) valid");
assert(ZSM.Validation.validate(rawZund({ markSizeZ: "50" }), fullPrev(), L_EN).valid, "markSizeZ=50 (max) valid");
assert(!ZSM.Validation.validate(rawZund({ markSizeZ: "0" }), fullPrev(), L_EN).valid, "markSizeZ=0 below min");
assert(!ZSM.Validation.validate(rawZund({ markSizeZ: "51" }), fullPrev(), L_EN).valid, "markSizeZ=51 above max");

// orientDist: 10..2000
assert(ZSM.Validation.validate(rawZund({ orientDist: "10" }), fullPrev(), L_EN).valid, "orientDist=10 (min) valid");
assert(ZSM.Validation.validate(rawZund({ orientDist: "2000" }), fullPrev(), L_EN).valid, "orientDist=2000 (max) valid");
assert(!ZSM.Validation.validate(rawZund({ orientDist: "9" }), fullPrev(), L_EN).valid, "orientDist=9 below min");

// SUMMA fields
assert(ZSM.Validation.validate(rawSumma({ markSizeS: "0.1" }), fullPrev(), L_EN).valid, "markSizeS=0.1 (min) valid");
assert(ZSM.Validation.validate(rawSumma({ feedTop: "0" }), fullPrev(), L_EN).valid, "feedTop=0 (min) valid");
assert(ZSM.Validation.validate(rawSumma({ feedBottom: "1000" }), fullPrev(), L_EN).valid, "feedBottom=1000 (max) valid");


// =====================================================
// TEST 5: Multiple invalid fields → errors collected
// =====================================================
console.log("\n=== TEST 5: Multiple errors collected ===");
alertCalls = [];
r = ZSM.Validation.validate(rawZund({
    gapOuter: "abc",      // NaN
    maxDist: "10000",     // out of range
    markSizeZ: ""         // empty string
}), fullPrev(), L_EN);
assert(r.valid === false, "Multiple errors → valid=false");
assert(r.errors.length === 3, "3 errors collected (got " + r.errors.length + ")");
assertEq(r.settings, null, "On error, settings is null");

// Verify error fields
var errFields = {};
for (var ei = 0; ei < r.errors.length; ei++) errFields[r.errors[ei].field] = true;
assert(errFields.gapOuter, "Error: gapOuter flagged");
assert(errFields.maxDist, "Error: maxDist flagged");
assert(errFields.markSizeZ, "Error: markSizeZ flagged");
// Alerts: each invalid field triggers one
assert(alertCalls.length === 3, "3 alerts shown (one per error, got " + alertCalls.length + ")");


// =====================================================
// TEST 6: NaN inputs
// =====================================================
console.log("\n=== TEST 6: NaN/exotic inputs ===");
alertCalls = [];
assert(!ZSM.Validation.validate(rawZund({ gapOuter: "abc" }), fullPrev(), L_EN).valid, "non-numeric string invalid");
assert(!ZSM.Validation.validate(rawZund({ gapOuter: "" }), fullPrev(), L_EN).valid, "empty string invalid");
assert(!ZSM.Validation.validate(rawZund({ gapOuter: "   " }), fullPrev(), L_EN).valid, "whitespace-only invalid");
assert(!ZSM.Validation.validate(rawZund({ gapOuter: "1,2,3" }), fullPrev(), L_EN).valid, "multiple commas invalid");
assert(!ZSM.Validation.validate(rawZund({ gapOuter: "Infinity" }), fullPrev(), L_EN).valid, "Infinity invalid (out of range)");


// =====================================================
// TEST 7: Comma-decimal normalization (Czech locale)
// =====================================================
console.log("\n=== TEST 7: Comma decimal ===");
alertCalls = [];
r = ZSM.Validation.validate(rawZund({ gapInner: "5,5", markSizeZ: "2,5" }), fullPrev(), L_EN);
assert(r.valid === true, "Comma decimals (CZ): valid");
assertEq(r.settings.gapInner, 5.5, "5,5 → 5.5");
assertEq(r.settings.markSizeZ, 2.5, "2,5 → 2.5");


// =====================================================
// TEST 8: Pass-through fields
// =====================================================
console.log("\n=== TEST 8: Pass-through fields ===");
alertCalls = [];

// Boolean: drawRed (only in SUMMA mode, ZUND defaults to false-ish)
r = ZSM.Validation.validate(rawSumma({ drawRed: true }), fullPrev(), L_EN);
assertEq(r.settings.drawRed, true, "drawRed=true preserved");

r = ZSM.Validation.validate(rawSumma({ drawRed: false }), fullPrev(), L_EN);
assertEq(r.settings.drawRed, false, "drawRed=false preserved");

// useArtboardBounds: only relevant for ZUND
r = ZSM.Validation.validate(rawZund({ useArtboardBounds: true }), fullPrev(), L_EN);
assertEq(r.settings.useArtboardBounds, true, "useArtboardBounds=true preserved");

// markColor: empty → fallback
r = ZSM.Validation.validate(rawZund({ markColor: "" }), fullPrev(), L_EN);
assertEq(r.settings.markColor, "[Registration]", "Empty markColor → fallback to [Registration]");

r = ZSM.Validation.validate(rawZund({ markColor: "MyCustomSpot" }), fullPrev(), L_EN);
assertEq(r.settings.markColor, "MyCustomSpot", "Custom markColor preserved");

// Layers: array passthrough
var customLayers = [
    { name: "Thru-cut", color: "[Registration]" },
    { name: "Kiss-cut", color: "MyCustomSpot" }
];
r = ZSM.Validation.validate(rawZund({ layers: customLayers }), fullPrev(), L_EN);
assertEq(r.settings.layers.length, 2, "Custom layers length preserved");
assertEq(r.settings.layers[0].name, "Thru-cut", "Custom layer name preserved");

// Empty layers → fallback to default
r = ZSM.Validation.validate(rawZund({ layers: [] }), fullPrev(), L_EN);
assertEq(r.settings.layers.length, 1, "Empty layers → 1 default Cut row");
assertEq(r.settings.layers[0].name, "Cut", "Default layer name = Cut");


// =====================================================
// TEST 9: Edge cases — missing inputs
// =====================================================
console.log("\n=== TEST 9: Missing/null inputs ===");
alertCalls = [];

// Null raw
r = ZSM.Validation.validate(null, fullPrev(), L_EN);
assert(r.valid === false, "null raw → invalid");
assert(r.errors.length > 0, "null raw → errors");

// Undefined raw
r = ZSM.Validation.validate(undefined, fullPrev(), L_EN);
assert(r.valid === false, "undefined raw → invalid");

// Empty raw object
r = ZSM.Validation.validate({}, fullPrev(), L_EN);
assert(r.valid === false, "empty raw object → invalid (mode missing)");

// Missing prev (should not throw)
alertCalls = [];
r = ZSM.Validation.validate(rawZund(), null, L_EN);
// Mode-irrelevant fields will be undefined (no prev to fallback)
// But ZUND validation should still pass
assert(r.valid === true, "Missing prev: ZUND validation still passes");
assertEq(r.settings.markSizeS, undefined, "Missing prev: markSizeS undefined");

// Missing locale (should not throw, uses field name as fallback)
alertCalls = [];
r = ZSM.Validation.validate(rawZund({ gapOuter: "abc" }), fullPrev(), null);
assert(r.valid === false, "Missing locale: still validates");
assert(alertCalls.length === 1, "Missing locale: alert still shown");


// =====================================================
// TEST 10: Mode-irrelevant fields preserved exactly
// =====================================================
console.log("\n=== TEST 10: Mode-irrelevant field preservation ===");
alertCalls = [];

// In ZUND mode, change only ZUND fields. SUMMA fields in prev should pass through.
var customPrev = fullPrev();
customPrev.markSizeS = 4.5;
customPrev.feedTop = 80;
customPrev.feedBottom = 60;

r = ZSM.Validation.validate(rawZund({ gapInner: "7" }), customPrev, L_EN);
assertEq(r.settings.gapInner, 7, "ZUND: gapInner from raw");
assertEq(r.settings.markSizeS, 4.5, "ZUND: markSizeS from prev (4.5)");
assertEq(r.settings.feedTop, 80, "ZUND: feedTop from prev (80)");
assertEq(r.settings.feedBottom, 60, "ZUND: feedBottom from prev (60)");

// Vice versa for SUMMA
r = ZSM.Validation.validate(rawSumma({ feedTop: "65" }), customPrev, L_EN);
assertEq(r.settings.feedTop, 65, "SUMMA: feedTop from raw");
assertEq(r.settings.gapInner, 5, "SUMMA: gapInner from prev (5)");
assertEq(r.settings.markSizeZ, 5, "SUMMA: markSizeZ from prev (5)");
assertEq(r.settings.orientDist, 100, "SUMMA: orientDist from prev (100)");


// =====================================================
// TEST 11: scaleN (Phase 2) — boundary + integer-only
// =====================================================
console.log("\n=== TEST 11: scaleN boundary + integer ===");
alertCalls = [];

// Valid integer values in range
assert(ZSM.Validation.validate(rawZund({ scaleN: 1 }),  fullPrev(), L_EN).valid, "scaleN=1 valid");
assert(ZSM.Validation.validate(rawZund({ scaleN: 2 }),  fullPrev(), L_EN).valid, "scaleN=2 valid");
assert(ZSM.Validation.validate(rawZund({ scaleN: 5 }),  fullPrev(), L_EN).valid, "scaleN=5 valid");
assert(ZSM.Validation.validate(rawZund({ scaleN: 10 }), fullPrev(), L_EN).valid, "scaleN=10 (max) valid");

// Out of range
alertCalls = [];
assert(!ZSM.Validation.validate(rawZund({ scaleN: 0 }),  fullPrev(), L_EN).valid, "scaleN=0 below min");
assert(!ZSM.Validation.validate(rawZund({ scaleN: 11 }), fullPrev(), L_EN).valid, "scaleN=11 above max");
assert(!ZSM.Validation.validate(rawZund({ scaleN: -1 }), fullPrev(), L_EN).valid, "scaleN=-1 invalid");

// Integer-only: decimals must fail (use a value that's IN-range as decimal but not integer)
alertCalls = [];
assert(!ZSM.Validation.validate(rawZund({ scaleN: 2.5 }), fullPrev(), L_EN).valid, "scaleN=2.5 invalid (not integer)");
assert(!ZSM.Validation.validate(rawZund({ scaleN: 5.1 }), fullPrev(), L_EN).valid, "scaleN=5.1 invalid (not integer)");

// String inputs (UI sends numbers, but validation should still cope)
assert(ZSM.Validation.validate(rawZund({ scaleN: "10" }), fullPrev(), L_EN).valid, "scaleN='10' string valid");
assert(!ZSM.Validation.validate(rawZund({ scaleN: "abc" }), fullPrev(), L_EN).valid, "scaleN='abc' invalid");

// Settings preserved when valid
var rOk = ZSM.Validation.validate(rawZund({ scaleN: 10 }), fullPrev(), L_EN);
assertEq(rOk.settings.scaleN, 10, "scaleN=10: settings.scaleN === 10");

// Fallback to prev when scaleN missing in raw (backward compat for old presets)
alertCalls = [];
var prevWithScale = fullPrev(); prevWithScale.scaleN = 5;
var rFallback = ZSM.Validation.validate(rawZund(), prevWithScale, L_EN);  // no scaleN in raw
assertEq(rFallback.settings.scaleN, 5, "scaleN missing in raw → fallback to prev.scaleN=5");


// =====================================================
// SUMMARY
// =====================================================
console.log("\n" + "=".repeat(50));
console.log("VALIDATION TEST RESULTS: " + pass + "/" + total + " PASSED, " + fail + " FAILED");
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
