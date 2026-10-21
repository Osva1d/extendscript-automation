#!/usr/bin/env node
/**
 * GM.Utils Test Suite
 * Characterization tests for the shared helpers in src/lib/utils.js.
 * Locks CURRENT behavior so the upcoming shared-core dedup has a safety net —
 * if these go red after dedup, the dedup changed utils behavior.
 *
 * Scope: deepCopy (priority — GM-only, highest divergence, unasserted until now),
 *        log, error, and presetEquals' handling of pathOffset (1.3.0). The rest
 *        of presetEquals is characterized in test_validation.js.
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
// presetEquals reads number fields through the shared GM.Numbers.
require("./lib/load_shared.js")(GM, ["numbers"]);

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

// =====================================================
// TEST 5: presetEquals — the path offset is part of a preset (1.3.0)
// =====================================================
console.log("--- Utils.presetEquals: pathOffset ---");
(function () {
    function preset(extra) {
        var p = { offsetX: 7, offsetY: 7, bottomMirror: true, rightMirror: true,
                  units: "mm", markSize: 3,
                  top: { enabled: true, useNumber: true, number: 10, spacing: 105 } };
        for (var k in extra) if (extra.hasOwnProperty(k)) p[k] = extra[k];
        return p;
    }
    assert(GM.Utils.presetEquals(preset({ pathOffset: 0 }), preset({ pathOffset: 20 })) === false,
        "differing only in pathOffset (0 vs 20) -> not equal");
    assert(GM.Utils.presetEquals(preset({ pathOffset: 20 }), preset({ pathOffset: 20 })) === true,
        "same pathOffset -> equal");
    assert(GM.Utils.presetEquals(preset({}), preset({ pathOffset: 20 })) === true,
        "an old preset without pathOffset still equals the other side");
    assert(GM.Utils.presetEquals(preset({ pathOffset: 20 }), preset({})) === true,
        "...in either direction");
    assert(GM.Utils.presetEquals(preset({ pathOffset: "20" }), preset({ pathOffset: 20 })) === true,
        "'20' and 20 compare equal (string compare, like the other fields)");
})();

// =====================================================
// TEST 6: presetEquals — a number is the same in every spelling (spec 6.1)
// =====================================================
// The dialog writes 2,5 into the field in Czech; the stored preset holds 2.5.
// Unlike text, a number compared as String() would call these two different
// and mark every freshly opened preset as changed (review focus 1).
console.log("--- Utils.presetEquals: '2,5' and 2.5 are one number ---");
(function () {
    function full(over) {
        var p = {
            offsetX: 7, offsetY: 7, bottomMirror: true, rightMirror: true, units: "mm", markSize: 3,
            top:    { enabled: true,  useNumber: true, number: 10, spacing: 105 },
            left:   { enabled: true,  useNumber: true, number: 10, spacing: 105 },
            bottom: { enabled: false, useNumber: true, number: 10, spacing: 105 },
            right:  { enabled: false, useNumber: true, number: 10, spacing: 105 },
            placementMode: "artboard",
            cornerZone: { enabled: false, count: 5, pitch: 100 },
            pathDist: { useNumber: false, number: 24, spacing: 105 },
            markCircle: true, markCross: false, regWeight: 1, haloWeight: 3,
            pathOffset: 0
        };
        for (var k in over) if (over.hasOwnProperty(k)) p[k] = over[k];
        return p;
    }
    var eq = GM.Utils.presetEquals;
    assert(eq({ markSize: "2,5", top: {}, units: "mm" }, { markSize: 2.5, top: {}, units: "mm" }) === true,
        "markSize '2,5' equals 2.5");
    assert(eq({ markSize: "abc" }, { markSize: 5 }) === false, "markSize 'abc' does not equal 5");
    assert(eq({ markSize: 5 }, { markSize: "abc" }) === false, "...in either direction");
    assert(eq({ markSize: "abc" }, { markSize: "abd" }) === false, "two different typos are different");
    assert(eq({ markSize: "1e3" }, { markSize: 1000 }) === false, "'1e3' is no number, so it is not 1000");

    // Every numeric field, both separators
    var cases = [
        ["offsetX",           { offsetX: "7,5" },    { offsetX: 7.5 }],
        ["offsetY",           { offsetY: " 7.5 " },  { offsetY: 7.5 }],
        ["markSize",          { markSize: "2,5" },   { markSize: 2.5 }],
        ["regWeight",         { regWeight: "0,25" }, { regWeight: 0.25 }],
        ["haloWeight",        { haloWeight: "3,5" }, { haloWeight: 3.5 }],
        ["pathOffset",        { pathOffset: "12,5" }, { pathOffset: 12.5 }],
        ["top.number",        { top: { enabled: true, useNumber: true, number: "10", spacing: 105 } },
                              { top: { enabled: true, useNumber: true, number: 10, spacing: 105 } }],
        ["top.spacing",       { top: { enabled: true, useNumber: true, number: 10, spacing: "105,5" } },
                              { top: { enabled: true, useNumber: true, number: 10, spacing: 105.5 } }],
        ["right.spacing",     { right: { enabled: false, useNumber: true, number: 10, spacing: "99,5" } },
                              { right: { enabled: false, useNumber: true, number: 10, spacing: 99.5 } }],
        ["cornerZone.count",  { cornerZone: { enabled: false, count: "5", pitch: 100 } },
                              { cornerZone: { enabled: false, count: 5, pitch: 100 } }],
        ["cornerZone.pitch",  { cornerZone: { enabled: false, count: 5, pitch: "12,5" } },
                              { cornerZone: { enabled: false, count: 5, pitch: 12.5 } }],
        ["pathDist.number",   { pathDist: { useNumber: false, number: "24", spacing: 105 } },
                              { pathDist: { useNumber: false, number: 24, spacing: 105 } }],
        ["pathDist.spacing",  { pathDist: { useNumber: false, number: 24, spacing: "105,5" } },
                              { pathDist: { useNumber: false, number: 24, spacing: 105.5 } }]
    ];
    for (var i = 0; i < cases.length; i++) {
        assert(eq(full(cases[i][1]), full(cases[i][2])) === true, cases[i][0] + ": text and number are equal");
        assert(eq(full(cases[i][2]), full(cases[i][1])) === true, cases[i][0] + ": ...in either direction");
    }

    // The same fields: a typo is never equal to a stored number
    var typos = [
        ["offsetX",          { offsetX: "abc" },    { offsetX: 7 }],
        ["markSize",         { markSize: "" },      { markSize: 3 }],
        ["top.spacing",      { top: { enabled: true, useNumber: true, number: 10, spacing: "1O5" } },
                             { top: { enabled: true, useNumber: true, number: 10, spacing: 105 } }],
        ["cornerZone.pitch", { cornerZone: { enabled: false, count: 5, pitch: "x" } },
                             { cornerZone: { enabled: false, count: 5, pitch: 100 } }],
        ["pathDist.spacing", { pathDist: { useNumber: false, number: 24, spacing: "1 000" } },
                             { pathDist: { useNumber: false, number: 24, spacing: 1000 } }],
        ["pathOffset",       { pathOffset: "12 mm" }, { pathOffset: 12 }]
    ];
    for (var j = 0; j < typos.length; j++) {
        assert(eq(full(typos[j][1]), full(typos[j][2])) === false, typos[j][0] + ": a typo differs from a number");
        assert(eq(full(typos[j][2]), full(typos[j][1])) === false, typos[j][0] + ": ...in either direction");
    }

    // Different numbers stay different, and text fields still compare as text
    assert(eq(full({ markSize: "2,5" }), full({ markSize: 2.6 })) === false, "'2,5' differs from 2.6");
    assert(eq(full({ units: "mm" }), full({ units: "cm" })) === false, "units still compare as text");
    assert(eq(full({ top: { enabled: true, useNumber: true, number: 10, spacing: 105 } }),
              full({ top: { enabled: false, useNumber: true, number: 10, spacing: 105 } })) === false,
        "enabled still compares as text");
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
