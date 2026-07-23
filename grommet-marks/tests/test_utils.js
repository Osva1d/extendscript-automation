#!/usr/bin/env node
/**
 * GM.Utils Test Suite
 * Characterization tests for the shared helpers in src/lib/utils.js.
 * Locks CURRENT behavior so the upcoming shared-core dedup has a safety net —
 * if these go red after dedup, the dedup changed utils behavior.
 *
 * Scope: deepCopy (priority — GM-only, highest divergence, unasserted until now),
 *        log, error. presetEquals is characterized in test_validation.js.
 *
 * CHARACTERIZATION NOTES (observed current behavior, NOT bugs to fix here):
 *   - deepCopy uses JSON.parse(JSON.stringify(obj)) per its docstring
 *     ("JSON-serializable object"). Consequences that are locked below:
 *       · function-valued and undefined-valued properties are DROPPED,
 *       · these are inherent to the JSON round-trip, not a defect. If dedup
 *         swaps the implementation, these assertions flag the behavior change.
 *
 * Usage: node tests/test_utils.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
var GM = {};

// log() writes via $.writeln; error() calls alert(). Capture both.
var writelnCalls = [];
global.$ = { writeln: function (s) { writelnCalls.push(s); } };
var alertCalls = [];
global.alert = function (m) { alertCalls.push(m); };

// ===== LOAD PRODUCTION CODE =====
// constants.js first: error() reads GM.CONSTANTS.SCRIPT_NAME.
eval(fs.readFileSync(path.join(__dirname, "..", "src", "constants.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));

// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}

// =====================================================
// TEST 1: deepCopy — independence (PRIORITY)
// =====================================================
console.log("--- Utils.deepCopy: independence ---");
(function () {
    var original = {
        offsetX: 5,
        nested: { pitch: 3, flags: [1, 2, 3] },
        edges: { top: { enabled: true, spacing: 10 } }
    };
    var copy = GM.Utils.deepCopy(original);

    // Distinct top-level reference, equal by value.
    assert(copy !== original, "deepCopy returns a new top-level object");
    assert(copy.offsetX === 5, "deepCopy preserves primitive field");
    assert(copy.nested.pitch === 3, "deepCopy preserves nested field");
    assert(copy.nested.flags.length === 3 && copy.nested.flags[2] === 3,
        "deepCopy preserves nested array contents");

    // Nested references are cloned, not shared.
    assert(copy.nested !== original.nested, "deepCopy clones nested object (not same ref)");
    assert(copy.nested.flags !== original.nested.flags, "deepCopy clones nested array (not same ref)");

    // Mutating the copy must NOT touch the original.
    copy.nested.pitch = 999;
    copy.nested.flags.push(4);
    copy.edges.top.enabled = false;
    assert(original.nested.pitch === 3, "mutating copy leaves original nested field");
    assert(original.nested.flags.length === 3, "mutating copy array leaves original array");
    assert(original.edges.top.enabled === true, "mutating copy deep object leaves original");

    // Mutating the original AFTER the copy must NOT touch the copy (reverse independence).
    var original2 = { a: { b: 1 } };
    var copy2 = GM.Utils.deepCopy(original2);
    original2.a.b = 42;
    assert(copy2.a.b === 1, "mutating original after copy leaves the copy");
})();

// =====================================================
// TEST 2: deepCopy — JSON round-trip semantics (characterization)
// =====================================================
console.log("--- Utils.deepCopy: JSON semantics ---");
(function () {
    // undefined- and function-valued properties are dropped by the round-trip.
    var src = { keep: 1, gone: undefined, fn: function () { return 1; } };
    var copy = GM.Utils.deepCopy(src);
    assert(copy.keep === 1, "deepCopy keeps defined primitive");
    assert(copy.hasOwnProperty("gone") === false, "deepCopy drops undefined-valued key (JSON)");
    assert(copy.hasOwnProperty("fn") === false, "deepCopy drops function-valued key (JSON)");

    // Empty containers round-trip.
    assert(GM.Utils.deepCopy({}) !== null && typeof GM.Utils.deepCopy({}) === "object",
        "deepCopy({}) → object");
    var arrCopy = GM.Utils.deepCopy([1, 2]);
    assert(arrCopy.length === 2 && arrCopy[1] === 2, "deepCopy of array → array by value");
})();

// =====================================================
// TEST 3: log — prefixed passthrough to $.writeln
// =====================================================
console.log("--- Utils.log ---");
(function () {
    writelnCalls = [];
    GM.Utils.log("hello");
    assert(writelnCalls.length === 1, "log calls $.writeln exactly once");
    assert(writelnCalls[0] === "[GM] hello", "log prefixes message with '[GM] '");

    writelnCalls = [];
    GM.Utils.log("");
    assert(writelnCalls[0] === "[GM] ", "log of empty string → '[GM] '");
})();

// =====================================================
// TEST 4: error — script-name-prefixed alert
// =====================================================
console.log("--- Utils.error ---");
(function () {
    alertCalls = [];
    GM.Utils.error("something broke");
    assert(alertCalls.length === 1, "error calls alert exactly once");
    assert(alertCalls[0] === "Illustrator Grommet Marks: something broke",
        "error prefixes message with SCRIPT_NAME + ': '");
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
