#!/usr/bin/env node
/**
 * GM.Core Math Test Suite
 * Runs outside Illustrator (pure JS) — validates geometry calculations.
 *
 * Usage: node tests/test_core_math.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
var GM = {};

GM.CONSTANTS = {
    UNIT_FACTORS: {
        "mm": 2.834645669291339,
        "cm": 28.34645669291339,
        "in": 72
    }
};

// ===== LOAD PRODUCTION CODE =====
var corePath = path.join(__dirname, "..", "src", "core.js");
eval(fs.readFileSync(corePath, "utf8"));

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
    else { fail++; console.log("  FAIL: " + msg + " (got " + a + ", expected " + b + ")"); }
}

// ===== TESTS: GM.Core.round =====
console.log("--- GM.Core.round ---");

assert(GM.Core.round(1.0000001) === 1, "round: removes float noise");
assert(GM.Core.round(3.141593) === 3.141593, "round: preserves 6 decimals");
assert(GM.Core.round(0) === 0, "round: zero");

// ===== TESTS: GM.Core.convertVal =====
console.log("--- GM.Core.convertVal ---");

assertClose(GM.Core.convertVal(25.4, "mm", "in"), 1, 0.001, "convertVal: 25.4mm = 1in");
assertClose(GM.Core.convertVal(1, "in", "mm"), 25.4, 0.001, "convertVal: 1in = 25.4mm");
assertClose(GM.Core.convertVal(10, "mm", "cm"), 1, 0.0001, "convertVal: 10mm = 1cm");
assertClose(GM.Core.convertVal(1, "cm", "mm"), 10, 0.0001, "convertVal: 1cm = 10mm");
assert(GM.Core.convertVal(42, "mm", "mm") === 42, "convertVal: identity mm->mm");
assert(GM.Core.convertVal(42, "in", "in") === 42, "convertVal: identity in->in");

// ===== TESTS: GM.Core.calcPositions =====
console.log("--- GM.Core.calcPositions ---");

var mmFactor = GM.CONSTANTS.UNIT_FACTORS["mm"];

// Fixed count: 10 marks, 7mm offset, on a 1000pt span
(function () {
    var edge = { useNumber: true, number: 10, spacing: 0 };
    var pos = GM.Core.calcPositions(edge, 1000, 7, mmFactor);
    assert(pos.length === 10, "calcPositions: fixed count returns 10 marks");
    assertClose(pos[0], 7 * mmFactor, 0.01, "calcPositions: first mark at offset");
    assert(pos[9] <= 1000, "calcPositions: last mark within span");
})();

// Fixed count: 1 mark
(function () {
    var edge = { useNumber: true, number: 1, spacing: 0 };
    var pos = GM.Core.calcPositions(edge, 500, 10, mmFactor);
    assert(pos.length === 1, "calcPositions: single mark");
    assertClose(pos[0], 10 * mmFactor, 0.01, "calcPositions: single mark at offset");
})();

// Preferred spacing — exact division (50 divides 1000mm span evenly)
(function () {
    var edge = { useNumber: false, number: 1, spacing: 50 };
    var span = 1000 * mmFactor;
    var pos = GM.Core.calcPositions(edge, span, 0, mmFactor);
    assert(pos.length > 1, "calcPositions: spacing mode produces multiple marks");
    for (var i = 0; i < pos.length; i++) {
        assert(pos[i] >= 0 && pos[i] <= span, "calcPositions: pos[" + i + "] within span");
    }
    // 1000mm / 50mm = 20 gaps → 21 marks; every gap exactly 50mm.
    assert(pos.length === 21, "calcPositions: spacing 50 over 1000mm → 21 marks");
    var maxErr = 0;
    for (var j = 1; j < pos.length; j++) {
        var gapMM = (pos[j] - pos[j - 1]) / mmFactor;
        maxErr = Math.max(maxErr, Math.abs(gapMM - 50));
    }
    assert(maxErr < 0.001, "calcPositions: spacing-mode gaps are exactly 50mm");
})();

// Preferred spacing is a TARGET (even-fit), not a fixed pitch: a spacing that
// doesn't divide the span evenly rounds to the nearest even fit. Documents the
// intended behaviour so it isn't mistaken for the radio-group regression.
(function () {
    var edge = { useNumber: false, number: 1, spacing: 105 };
    var pos = GM.Core.calcPositions(edge, 1000 * mmFactor, 0, mmFactor);
    // 1000/105 ≈ 9.52 → nearest even fit is 10 gaps (100mm), i.e. 11 marks.
    assert(pos.length === 11, "calcPositions: spacing 105 over 1000mm even-fits to 11 marks");
    var gapMM = (pos[1] - pos[0]) / mmFactor;
    assert(Math.abs(gapMM - 100) < 0.001, "calcPositions: even-fit gap is 100mm (not 105)");
})();

// Zero span edge case
(function () {
    var edge = { useNumber: true, number: 5, spacing: 0 };
    var pos = GM.Core.calcPositions(edge, 0, 0, mmFactor);
    assert(pos.length === 5, "calcPositions: zero span still returns marks");
})();

// Very small spacing (safety cap)
(function () {
    var edge = { useNumber: false, number: 1, spacing: 0.001 };
    var pos = GM.Core.calcPositions(edge, 10000, 0, mmFactor);
    assert(pos.length <= 9999, "calcPositions: safety cap prevents freeze");
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
