#!/usr/bin/env node
/**
 * ZSM.L Localization Test Suite
 * Tests src/locale.js — locale detection, string table integrity, format() helper.
 *
 * Coverage:
 *   - Default locale (en) when app.locale undefined / unsupported
 *   - Locale detection: cs / cs-CZ / CS / en-US
 *   - Schema parity: every key in EN exists in CS (and vice versa)
 *   - format() %s substitution: 0/1/many args, missing args, extra args, types
 *   - format() preserves non-%s text
 *
 * Usage: node tests/test_locale.js
 */

var fs   = require("fs");
var path = require("path");

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

// ===== HELPER: load locale.js with mocked `app.locale` =====
var localeSrc = fs.readFileSync(path.join(__dirname, "..", "src", "locale.js"), "utf8");

function loadLocale(localeStr) {
    // Fresh sandbox each call so IIFE re-evaluates
    var sandbox = {};
    sandbox.ZSM = sandbox.ZSM || {};
    sandbox.app = (localeStr === undefined) ? {} : { locale: localeStr };
    // eval needs `app`, `ZSM` in scope — use Function constructor
    var fn = new Function("ZSM", "app", localeSrc + "; return ZSM.L;");
    return fn(sandbox.ZSM, sandbox.app);
}


// =====================================================
// TEST 1: Default locale (en) fallback
// =====================================================
console.log("\n=== TEST 1: Default locale (en) ===");
var L = loadLocale(undefined);  // app.locale missing
assert(typeof L === "object", "loadLocale(undefined) returns object");
assertEq(L.ERROR_PREFIX, "ERROR: ", "Default locale: ERROR_PREFIX is English");
assertEq(L.PRESET_DEFAULT, "[Default]", "Default locale: PRESET_DEFAULT is English");

L = loadLocale(null);
assertEq(L.ERROR_PREFIX, "ERROR: ", "Null locale: falls back to English");

L = loadLocale("");
assertEq(L.ERROR_PREFIX, "ERROR: ", "Empty locale string: falls back to English");

L = loadLocale("zz_ZZ");  // Unsupported locale
assertEq(L.ERROR_PREFIX, "ERROR: ", "Unsupported locale: falls back to English");

L = loadLocale("fr_FR");  // French not supported
assertEq(L.PRESET_DEFAULT, "[Default]", "French falls back to English");


// =====================================================
// TEST 2: Czech locale detection
// =====================================================
console.log("\n=== TEST 2: Czech locale (cs) ===");
L = loadLocale("cs_CZ");
assertEq(L.ERROR_PREFIX, "CHYBA: ", "cs_CZ: ERROR_PREFIX is Czech");
assertEq(L.PRESET_DEFAULT, "[Výchozí]", "cs_CZ: PRESET_DEFAULT is Czech");

L = loadLocale("cs");
assertEq(L.ERROR_PREFIX, "CHYBA: ", "cs (bare): Czech detected");

L = loadLocale("CS");
assertEq(L.ERROR_PREFIX, "CHYBA: ", "CS (uppercase): Czech detected (lowercase normalization)");

L = loadLocale("cs-CZ");
assertEq(L.ERROR_PREFIX, "CHYBA: ", "cs-CZ (with dash): Czech detected");


// =====================================================
// TEST 3: English locale variants
// =====================================================
console.log("\n=== TEST 3: English variants ===");
L = loadLocale("en_US");
assertEq(L.ERROR_PREFIX, "ERROR: ", "en_US: English");

L = loadLocale("en_GB");
assertEq(L.ERROR_PREFIX, "ERROR: ", "en_GB: English");

L = loadLocale("EN");
assertEq(L.ERROR_PREFIX, "ERROR: ", "EN (uppercase): English");


// =====================================================
// TEST 4: Schema parity — every EN key has CS equivalent
// =====================================================
console.log("\n=== TEST 4: EN/CS schema parity ===");
var enLocale = loadLocale("en");
var csLocale = loadLocale("cs");

var enKeys = [];
for (var k in enLocale) {
    if (enLocale.hasOwnProperty(k) && k !== "format") enKeys.push(k);
}
var csKeys = [];
for (var k in csLocale) {
    if (csLocale.hasOwnProperty(k) && k !== "format") csKeys.push(k);
}

// Every EN key must exist in CS
for (var i = 0; i < enKeys.length; i++) {
    assert(csLocale[enKeys[i]] !== undefined, "Parity: EN key '" + enKeys[i] + "' exists in CS");
}
// And vice versa
for (var i = 0; i < csKeys.length; i++) {
    assert(enLocale[csKeys[i]] !== undefined, "Parity: CS key '" + csKeys[i] + "' exists in EN");
}

// Both should have format()
assert(typeof enLocale.format === "function", "EN has format()");
assert(typeof csLocale.format === "function", "CS has format()");


// =====================================================
// TEST 5: Schema parity — string types
// =====================================================
console.log("\n=== TEST 5: All values are strings ===");
for (var i = 0; i < enKeys.length; i++) {
    assert(typeof enLocale[enKeys[i]] === "string",
           "EN value '" + enKeys[i] + "' is string (got " + typeof enLocale[enKeys[i]] + ")");
}
for (var i = 0; i < csKeys.length; i++) {
    assert(typeof csLocale[csKeys[i]] === "string",
           "CS value '" + csKeys[i] + "' is string");
}


// =====================================================
// TEST 6: Schema parity — %s placeholder count matches
// =====================================================
console.log("\n=== TEST 6: %s placeholder count parity ===");
function countPlaceholders(s) {
    var m = s.match(/%s/g);
    return m ? m.length : 0;
}
for (var i = 0; i < enKeys.length; i++) {
    var k = enKeys[i];
    var enCount = countPlaceholders(enLocale[k]);
    var csCount = countPlaceholders(csLocale[k]);
    assert(enCount === csCount,
           "Placeholder count parity: '" + k + "' EN=" + enCount + " CS=" + csCount);
}


// =====================================================
// TEST 7: format() — basic substitution
// =====================================================
console.log("\n=== TEST 7: format() basic ===");
L = loadLocale("en");
assertEq(L.format("Hello %s", "world"), "Hello world", "format: single %s");
assertEq(L.format("%s + %s = %s", 1, 2, 3), "1 + 2 = 3", "format: 3 %s with numbers");
assertEq(L.format("No placeholders here"), "No placeholders here", "format: 0 placeholders");


// =====================================================
// TEST 8: format() — edge cases
// =====================================================
console.log("\n=== TEST 8: format() edge cases ===");

// Missing args — leave %s as literal
assertEq(L.format("%s and %s", "first"), "first and %s", "format: missing arg leaves %s literal");
assertEq(L.format("%s"), "%s", "format: zero args leaves %s literal");

// Extra args — ignored
assertEq(L.format("%s", "a", "b", "c"), "a", "format: extra args ignored");

// %s with special-char-bearing args
assertEq(L.format("Value: %s", "$1.50"), "Value: $1.50", "format: arg with $ char");
assertEq(L.format("Path: %s", "C:\\test"), "Path: C:\\test", "format: arg with backslash");

// Numeric args coerced to string
assertEq(L.format("Count: %s", 42), "Count: 42", "format: number coerced");
assertEq(L.format("Price: %s", 3.14), "Price: 3.14", "format: float coerced");

// Boolean / null / undefined args
assertEq(L.format("%s", true), "true", "format: boolean true");
assertEq(L.format("%s", false), "false", "format: boolean false");
assertEq(L.format("%s", null), "null", "format: null");
assertEq(L.format("%s", undefined), "undefined", "format: undefined");

// Empty string arg
assertEq(L.format("[%s]", ""), "[]", "format: empty string arg");


// =====================================================
// TEST 9: format() — real-world templates
// =====================================================
console.log("\n=== TEST 9: format() with real strings ===");
assertEq(L.format(L.ERR_MUST_BE_NUMBER, "Gap"),
         "Gap must be a number!", "format: ERR_MUST_BE_NUMBER realistic call");
assertEq(L.format(L.ERR_OUT_OF_RANGE, "Gap", 0, 100),
         "Gap must be between 0 and 100!", "format: ERR_OUT_OF_RANGE realistic call");

// Czech variant
var Lcs = loadLocale("cs");
assertEq(Lcs.format(Lcs.ERR_OUT_OF_RANGE, "Mezera", 0, 100),
         "Mezera musí být mezi 0 a 100!", "format: Czech ERR_OUT_OF_RANGE");


// =====================================================
// TEST 10: format() — does not interfere with %% or %d
// =====================================================
console.log("\n=== TEST 10: format() only handles %s ===");
// Format doesn't escape — %d, %i, etc. are pass-through
assertEq(L.format("%d items", 5), "%d items", "format: %d not handled (pass-through)");
assertEq(L.format("100%% complete"), "100%% complete", "format: %% pass-through");


// =====================================================
// SUMMARY
// =====================================================
console.log("\n" + "=".repeat(50));
console.log("LOCALE TEST RESULTS: " + pass + "/" + total + " PASSED, " + fail + " FAILED");
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
