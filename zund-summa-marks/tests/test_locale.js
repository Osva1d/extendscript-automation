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
assertEq(L.format(L.ERR_MUST_BE_NUMBER, "Gap", 0, "100 mm"),
         "Gap: enter a number from 0 to 100 mm.", "format: ERR_MUST_BE_NUMBER realistic call");
assertEq(L.format(L.ERR_OUT_OF_RANGE, "Gap", 0, "100 mm"),
         "Gap: enter a number from 0 to 100 mm.", "format: ERR_OUT_OF_RANGE realistic call");

// Czech variant
var Lcs = loadLocale("cs");
assertEq(Lcs.format(Lcs.ERR_OUT_OF_RANGE, "Mezera od okraje", "0", "1000 mm"),
         "Mezera od okraje: zadejte číslo od 0 do 1000 mm.", "format: Czech ERR_OUT_OF_RANGE");
assertEq(Lcs.format(Lcs.ERR_MUST_BE_NUMBER, "Mezera od okraje", "0", "1000 mm"),
         "Mezera od okraje: zadejte číslo od 0 do 1000 mm.", "format: Czech ERR_MUST_BE_NUMBER");


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
// TEST 14: messages and glossary as the family canon (spec 1.2.0 §9, canon §12.1, §12.2, §12.8)
// =====================================================
console.log("\n=== TEST 14: messages and glossary as the family canon ===");
var enM = loadLocale("en"), csM = loadLocale("cs");
var mKeys = [];
for (var mk in csM) { if (csM.hasOwnProperty(mk) && mk !== "format") mKeys.push(mk); }

// --- typography (canon 12.1): „…“ for names, no "!", only the two prefixes ---
for (var ti = 0; ti < mKeys.length; ti++) {
    var tk = mKeys[ti], cv = csM[tk], ev = enM[tk];
    assert(cv.indexOf("‘") === -1 && cv.indexOf("’") === -1, "cs " + tk + ": no ‘…’ (names stand in „…“)");
    assert(cv.indexOf("!") === -1, "cs " + tk + ": no exclamation mark");
    assert(ev.indexOf("!") === -1, "en " + tk + ": no exclamation mark");
    if (tk !== "ERROR_PREFIX" && tk !== "WARN_PREFIX") {
        assert(cv.indexOf("CHYBA: ") === -1 && cv.indexOf("UPOZORNĚNÍ: ") === -1,
            "cs " + tk + ": no prefix of its own (the call site composes ERROR_PREFIX / WARN_PREFIX)");
        assert(ev.indexOf("ERROR: ") === -1 && ev.indexOf("WARNING: ") === -1,
            "en " + tk + ": no prefix of its own");
    }
    assert(cv.indexOf("KRITICKÁ") === -1, "cs " + tk + ": no 'KRITICKÁ'");
    assert(cv.indexOf("Velikost Zünd") === -1, "cs " + tk + ": no 'Velikost Zünd' (the glossary says Průměr značky)");
    assert(!/\bline\b/.test(cv), "cs " + tk + ": no English 'line'");
    // "artboard" in lower case, a capital only opening a sentence
    assert(cv.replace(/(^|[.?] )Artboard/g, "$1artboard").indexOf("Artboard") === -1, "cs " + tk + ": 'artboard' in lower case");
}
assert(csM.ERROR_PREFIX === "CHYBA: " && csM.WARN_PREFIX === "UPOZORNĚNÍ: ", "cs: the two prefixes");

// --- templates of the canon (12.2), character for character ---
var canonMsg = {
    cs: {
        ERR_NO_DOC:   "Před spuštěním skriptu otevřete dokument.",
        ERR_CRITICAL: "Skript se zastavil kvůli neočekávané chybě: %s (řádek %s).\n\nDokument může být částečně změněný — zkontrolujte ho, případně změny vraťte (Cmd+Z). Pošlete tuto hlášku správci skriptu."
    },
    en: {
        ERR_NO_DOC:   "Open a document before running the script.",
        ERR_CRITICAL: "The script stopped on an unexpected error: %s (line %s).\n\nThe document may be partly changed — check it, or undo the changes (Cmd+Z). Send this message to the script's maintainer."
    }
};
for (var cm in canonMsg.cs) {
    if (!canonMsg.cs.hasOwnProperty(cm)) continue;
    assertEq(csM[cm], canonMsg.cs[cm], "cs: " + cm + " is the canon's text");
    assertEq(enM[cm], canonMsg.en[cm], "en: " + cm + " is the canon's text");
}
assertEq(csM.format(csM.ERR_CRITICAL, "boom", "42").indexOf("boom (řádek 42)"), csM.ERR_CRITICAL.indexOf("%s (řádek"),
    "cs: ERR_CRITICAL names the line in Czech");

// --- a crash while drawing: one template, the line, Undo (spec 9.2) ---
assertEq(csM.ERR_RENDER_CRITICAL.split("%s").length - 1, 2, "cs: ERR_RENDER_CRITICAL takes the message and the line");
assertEq(enM.ERR_RENDER_CRITICAL.split("%s").length - 1, 2, "en: ERR_RENDER_CRITICAL takes the message and the line");
assert(csM.ERR_RENDER_CRITICAL.indexOf("řádek") !== -1, "cs: ERR_RENDER_CRITICAL says řádek");
// Undo (R10): the whole run is undone in SEVERAL Zpět steps and the artboard
// change is a step of its own (README, engine-facts) — for ZUND too, so the
// advice names no mode and does not promise one Cmd+Z.
assert(csM.ERR_RENDER_CRITICAL.indexOf("několika kroky Zpět (Cmd+Z)") !== -1
    && csM.ERR_RENDER_CRITICAL.indexOf("změna artboardu je samostatný krok") !== -1,
    "cs: ERR_RENDER_CRITICAL advises several Zpět steps (Cmd+Z), the artboard change a step of its own");
assert(csM.ERR_RENDER_CRITICAL.indexOf("zkontrolujte artboard a vrstvy") !== -1, "cs: ...and to check the artboard and the layers");
assert(csM.ERR_RENDER_CRITICAL.indexOf("SUMMA") === -1 && csM.ERR_RENDER_CRITICAL.indexOf("spusťte") === -1,
    "cs: ...no mode named, no 'run it again' (after an unexpected error it would likely stop again)");
assert(csM.ERR_RENDER_CRITICAL.indexOf("Vrátit") === -1 && csM.ERR_RENDER_CRITICAL.indexOf("Kritická chyba") === -1,
    "cs: ERR_RENDER_CRITICAL no longer sends the operator to File > Revert, nor carries a second prefix");
assert(enM.ERR_RENDER_CRITICAL.indexOf("The script stopped on an unexpected error while drawing: ") === 0
    && enM.ERR_RENDER_CRITICAL.indexOf("(line ") !== -1 && enM.ERR_RENDER_CRITICAL.indexOf("Cmd+Z") !== -1
    && enM.ERR_RENDER_CRITICAL.indexOf("several Cmd+Z steps") !== -1
    && enM.ERR_RENDER_CRITICAL.indexOf("the artboard change is a step of its own") !== -1
    && enM.ERR_RENDER_CRITICAL.indexOf("SUMMA") === -1 && enM.ERR_RENDER_CRITICAL.indexOf("again") === -1
    && enM.ERR_RENDER_CRITICAL.indexOf("Revert") === -1 && enM.ERR_RENDER_CRITICAL.toLowerCase().indexOf("critical error") === -1,
    "en: the same, in English");

// --- settings not saved: the consequence, split by what follows (spec 9.2) ---
assert(csM.ERR_WRITE_SETTINGS.indexOf("Předvolby") === 0 && csM.ERR_WRITE_SETTINGS.indexOf("příště se dialog otevře") !== -1,
    "cs: ERR_WRITE_SETTINGS speaks of the presets and says what happens next time");
assert(csM.ERR_WRITE_SETTINGS.indexOf("Značky") === -1 && csM.ERR_WRITE_SETTINGS.indexOf("Běh pokračuje") === -1,
    "cs: ERR_WRITE_SETTINGS (preset buttons) does not promise a run");
assert(csM.ERR_WRITE_SETTINGS_RUN.indexOf("příště se dialog otevře s předchozími hodnotami") !== -1
    && /Značky se vykreslí\.$/.test(csM.ERR_WRITE_SETTINGS_RUN), "cs: ERR_WRITE_SETTINGS_RUN says the marks are drawn");
assert(typeof enM.ERR_WRITE_SETTINGS === "string" && /marks will be drawn\.$/i.test(enM.ERR_WRITE_SETTINGS_RUN)
    && enM.ERR_WRITE_SETTINGS.toLowerCase().indexOf("marks") === -1, "en: the same split");

// --- "Dokument nebyl změněn." (spec 9.4) ---
assert(/Dokument nebyl změněn\.$/.test(csM.ERR_NO_SEL) && /The document was not changed\.$/.test(enM.ERR_NO_SEL),
    "ERR_NO_SEL ends with the document's state");
assert(/Dokument nebyl změněn\.$/.test(csM.ERR_ARTBOARD_TOO_LARGE) && /The document was not changed\.$/.test(enM.ERR_ARTBOARD_TOO_LARGE),
    "ERR_ARTBOARD_TOO_LARGE ends with the same sentence");
assert(csM.ERR_NO_SEL.indexOf("Dle artboardu (Fixed)") !== -1, "cs: ERR_NO_SEL names the option as the dialog does");

// --- validation: "<field>: enter a number from <min> to <max> mm." (spec 9.3) ---
assertEq(csM.ERR_MUST_BE_NUMBER.split("%s").length - 1, 3, "cs: ERR_MUST_BE_NUMBER takes field, min, max");
assertEq(csM.ERR_OUT_OF_RANGE.split("%s").length - 1, 3, "cs: ERR_OUT_OF_RANGE takes field, min, max");
assertEq(enM.ERR_MUST_BE_NUMBER.split("%s").length - 1, 3, "en: ERR_MUST_BE_NUMBER takes field, min, max");
assertEq(enM.ERR_OUT_OF_RANGE.split("%s").length - 1, 3, "en: ERR_OUT_OF_RANGE takes field, min, max");
assert(csM.format(csM.ERR_OUT_OF_RANGE, "Mezera", 0, 5).indexOf(": :") === -1
    && csM.format(csM.ERR_OUT_OF_RANGE, "Mezera", 0, 5).indexOf("::") === -1, "cs: no second colon");

// --- the glossary (canon 12.8) ---
assertEq(csM.MAX_DIST, "Max. rozteč značek:", "cs: MAX_DIST");
assertEq(csM.MARK_SIZE_Z, "Průměr značky:", "cs: MARK_SIZE_Z");
assertEq(csM.MARK_COLOR, "Barva značek:", "cs: MARK_COLOR");
assertEq(csM.GAP_GZ, "Mezera od grafiky:", "cs: GAP_GZ unchanged");
assertEq(csM.ORIENT_DIST, "Odsazení orientační značky:", "cs: ORIENT_DIST unchanged");
assertEq(enM.MAX_DIST, "Max. mark spacing:", "en: MAX_DIST");
assertEq(enM.MARK_SIZE_Z, "Mark diameter:", "en: MARK_SIZE_Z");
assertEq(enM.MARK_COLOR, "Mark color:", "en: MARK_COLOR");
assert(csM.TIP_ORIENT_DIST.indexOf("mezi okraji značek") !== -1, "cs: TIP_ORIENT_DIST says the gap is between the mark edges");
assert(enM.TIP_ORIENT_DIST.indexOf("between the edges of the marks") !== -1, "en: TIP_ORIENT_DIST says the gap is between the mark edges");
assert(csM.ERR_MARKS_OVERLAP.indexOf("max. rozteč značek") !== -1 && csM.ERR_MARKS_ORIENT.indexOf("max. rozteč značek") !== -1,
    "cs: the collision messages say 'max. rozteč značek'");
assert(csM.ERR_MARKS_OVERLAP.indexOf("velikost značky") !== -1, "cs: ...and keep 'velikost značky'");
assertEq(csM.SRC_FIXED, "Dle artboardu (Fixed)", "cs: SRC_FIXED, artboard in lower case");
assert(csM.TIP_SRC_FIXED.indexOf("artboardu") !== -1, "cs: TIP_SRC_FIXED, artboard in lower case");
// a preset is a "předvolba", never "nastavení"
assert(csM.TIP_SAVE_AS.indexOf("nastavení") === -1 && csM.TIP_SAVE_AS.indexOf("předvolb") !== -1, "cs: TIP_SAVE_AS says předvolba");
assert(csM.TIP_RESET.indexOf("nastavení") === -1 && csM.TIP_RESET.indexOf("předvolb") !== -1, "cs: TIP_RESET says předvolba");

// --- the registration colour in words (spec 9.5) ---
assert(csM.WARN_COLOR_FALLBACK.indexOf("[Registration]") === -1 && csM.WARN_COLOR_FALLBACK.indexOf("registrační") !== -1,
    "cs: WARN_COLOR_FALLBACK says 'registrační barva', not [Registration]");
assert(enM.WARN_COLOR_FALLBACK.indexOf("[Registration]") === -1 && enM.WARN_COLOR_FALLBACK.indexOf("registration colour") !== -1,
    "en: WARN_COLOR_FALLBACK says 'registration colour'");
assert(csM.TIP_MARK_COLOR.indexOf("[Registration]") === -1 && csM.TIP_MARK_COLOR.indexOf("výchozí") === -1
    && csM.TIP_MARK_COLOR.indexOf("Registrační barva") !== -1, "cs: TIP_MARK_COLOR no longer calls the registration colour the default");
assert(enM.TIP_MARK_COLOR.indexOf("[Registration]") === -1, "en: TIP_MARK_COLOR without [Registration]");

// --- the names in „…“ (canon 12.1) ---
assertEq(csM.format(csM.ERR_COLOR_MISSING, "Cut", "Cut"), "Vrstva „Cut“: v barvě „Cut“ není v dokumentu žádná cesta, nic se nepřesunulo. Zkontrolujte barvu řezových cest.",
    "cs: ERR_COLOR_MISSING is the canon's example");
assert(csM.WARN_TRIM_FOREIGN.indexOf("„Trim“") !== -1, "cs: WARN_TRIM_FOREIGN names the layer in „…“");
assert(csM.format(csM.ERR_LAY_NAME, "Cut").indexOf("(„Cut“)") !== -1, "cs: ERR_LAY_NAME names the colour in „…“");

// --- the duplicate colour: a mapping fact, not a document fact (Task 8 hand-over) ---
assert(enM.STATUS_DUP_COLOR.indexOf("mapped twice") !== -1 && enM.STATUS_DUP_COLOR.indexOf("several layers") === -1,
    "en: STATUS_DUP_COLOR says the colour is mapped twice");

// --- a Summa output the Zünd run could not remove (R6) ---
assert(typeof csM.WARN_SUMMA_NOT_REMOVED === "string" && typeof enM.WARN_SUMMA_NOT_REMOVED === "string",
    "WARN_SUMMA_NOT_REMOVED exists in both languages");
assert(csM.WARN_SUMMA_NOT_REMOVED.indexOf("„Summa“") !== -1 && csM.WARN_SUMMA_NOT_REMOVED.indexOf("SUMMA") !== -1,
    "cs: WARN_SUMMA_NOT_REMOVED names the sublayer and says to run SUMMA again");

// --- keys nothing reads (spec 9.6) ---
var deadKeys = ["ERR_LAY_COLOR", "ERR_SWATCH", "ERR_GENERIC", "ERR_MIN_ROW", "DEF_CUT", "DEF_KISS", "PRESET_PLACEHOLDER"];
for (var dk = 0; dk < deadKeys.length; dk++) {
    assert(enM[deadKeys[dk]] === undefined && csM[deadKeys[dk]] === undefined, "the unused key " + deadKeys[dk] + " is gone");
}
assert(typeof csM.BTN_REVERT === "string" && typeof csM.DEC_SEP === "string", "BTN_REVERT and DEC_SEP stay (in use)");


// =====================================================
// SUMMARY
// =====================================================
console.log("\n" + "=".repeat(50));
console.log("LOCALE TEST RESULTS: " + pass + "/" + total + " PASSED, " + fail + " FAILED");
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
