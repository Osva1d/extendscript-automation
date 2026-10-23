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
// TEST 11: the drawing scale field (spec 1.2.0 §5.1) — the family's label
// =====================================================
console.log("\n=== TEST 11: drawing scale texts ===");
var enS = loadLocale("en"), csS = loadLocale("cs");
assertEq(enS.LBL_SCALE, "Drawing scale 1:", "en: LBL_SCALE as grommet-marks and tile-export");
assertEq(csS.LBL_SCALE, "Měřítko kresby 1:", "cs: LBL_SCALE as grommet-marks and tile-export");
assert(typeof csS.TIP_SCALE === "string" && csS.TIP_SCALE.indexOf("1–100") !== -1,
    "cs: TIP_SCALE gives the range 1–100");
assert(typeof enS.TIP_SCALE === "string" && enS.TIP_SCALE.indexOf("1–100") !== -1,
    "en: TIP_SCALE gives the range 1–100");
var goneScale = ["SCALE_CHECKBOX", "TIP_SCALE_CHECKBOX", "SCALE_FIELD_LABEL", "TIP_SCALE_FIELD", "ERR_MUST_BE_INTEGER"];
for (var gs = 0; gs < goneScale.length; gs++) {
    assert(enS[goneScale[gs]] === undefined && csS[goneScale[gs]] === undefined,
        "the checkbox-era key " + goneScale[gs] + " is gone");
}


// =====================================================
// TEST 12: the notice about foreign objects in Regmarks (spec 1.2.0 §4.3, canon §12.1)
// =====================================================
// The count stands after a colon (never "4 objektů"), the layer name in Czech
// quotes, no exclamation mark; one %s, the count.
console.log("\n=== TEST 12: WARN_REGMARKS_FOREIGN ===");
var enR = loadLocale("en"), csR = loadLocale("cs");
assert(csR.format(csR.WARN_REGMARKS_FOREIGN, 4).indexOf("(objektů: 4)") !== -1, "cs: the count stands after a colon");
assert(csR.WARN_REGMARKS_FOREIGN.indexOf("„Regmarks“") !== -1, "cs: the layer name in Czech quotes „…“");
assert(csR.WARN_REGMARKS_FOREIGN.indexOf("„Zünd“") !== -1 && csR.WARN_REGMARKS_FOREIGN.indexOf("„Summa“") !== -1,
    "cs: the script's two sublayers are named");
assert(enR.format(enR.WARN_REGMARKS_FOREIGN, 4).indexOf("(objects: 4)") !== -1, "en: the count stands after a colon");
assertEq(enR.WARN_REGMARKS_FOREIGN.split("%s").length - 1, 1, "en: exactly one %s");
assertEq(csR.WARN_REGMARKS_FOREIGN.split("%s").length - 1, 1, "cs: exactly one %s");
assert(enR.WARN_REGMARKS_FOREIGN.indexOf("!") === -1 && csR.WARN_REGMARKS_FOREIGN.indexOf("!") === -1, "no exclamation mark");


// =====================================================
// TEST 13: the preset texts of the family canon (spec 1.2.0 §8, canon §12.4)
// =====================================================
// One set of sentences and keys in all four tools; a preset is a "předvolba",
// never "nastavení". The wording is the canon's table, character for character.
console.log("\n=== TEST 13: preset texts as the canon ===");
var enP = loadLocale("en"), csP = loadLocale("cs");
var canonCs = {
    PRESET_DEFAULT:            "[Výchozí]",
    BTN_REVERT:                "↺",
    PROMPT_SAVE_AS:            "Název nové předvolby:",
    CONFIRM_OVERWRITE_PRESET:  "Předvolba „%s“ už existuje. Přepsat?",
    CONFIRM_DELETE_PRESET:     "Smazat předvolbu „%s“? Smazání nejde vrátit.",
    ERR_ENTER_NAME:            "Zadejte název předvolby.",
    ERR_RESERVED_NAME:         "Názvy v hranatých závorkách jsou vyhrazené. Zvolte jiný název.",
    ERR_CANNOT_DELETE_DEFAULT: "Výchozí předvolbu nejde smazat."
};
var canonEn = {
    PRESET_DEFAULT:            "[Default]",
    BTN_REVERT:                "↺",
    PROMPT_SAVE_AS:            "Name of the new preset:",
    CONFIRM_OVERWRITE_PRESET:  "Preset \"%s\" already exists. Replace it?",
    CONFIRM_DELETE_PRESET:     "Delete preset \"%s\"? This cannot be undone.",
    ERR_ENTER_NAME:            "Enter a preset name.",
    ERR_RESERVED_NAME:         "Names in square brackets are reserved. Choose another name.",
    ERR_CANNOT_DELETE_DEFAULT: "The default preset cannot be deleted."
};
for (var ck in canonCs) {
    if (!canonCs.hasOwnProperty(ck)) continue;
    assertEq(csP[ck], canonCs[ck], "cs: " + ck + " is the canon's text");
    assertEq(enP[ck], canonEn[ck], "en: " + ck + " is the canon's text");
}
assertEq(csP.format(csP.CONFIRM_DELETE_PRESET, "A"), "Smazat předvolbu „A“? Smazání nejde vrátit.",
    "cs: CONFIRM_DELETE_PRESET names the preset in „…“");
assertEq(csP.format(csP.CONFIRM_OVERWRITE_PRESET, "A"), "Předvolba „A“ už existuje. Přepsat?",
    "cs: CONFIRM_OVERWRITE_PRESET names the preset in „…“");
var goneP = ["ERR_PRESET_DEL_DEF", "CONFIRM_DEL_PRESET", "ERR_PRESET_EXISTS"];
for (var gp = 0; gp < goneP.length; gp++) {
    assert(enP[goneP[gp]] === undefined && csP[goneP[gp]] === undefined,
        "the key " + goneP[gp] + " the canon's key replaced is gone");
}


// =====================================================
// SUMMARY
// =====================================================
console.log("\n" + "=".repeat(50));
console.log("LOCALE TEST RESULTS: " + pass + "/" + total + " PASSED, " + fail + " FAILED");
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
