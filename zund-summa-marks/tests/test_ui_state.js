#!/usr/bin/env node
/**
 * ZSM.UIState Test Suite
 * Tests src/lib/ui_state.js — pure preset state machine, no DOM dependency.
 *
 * Coverage:
 *   - validatePresetName (reserved keys, whitespace, empty, valid)
 *   - isModified (UI vs active preset compare)
 *   - formatPresetList (sort order, asterisk on active+modified, [Default] localization)
 *   - save (immutable on [Default]/[Last Settings], updates named)
 *   - saveAs (validation, overwrite confirmation, activate new)
 *   - deleteActive (reserved keys protection)
 *   - selectPreset (existence check)
 *
 * Usage: node tests/test_ui_state.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
var ZSM = {};
ZSM.L = { ERROR_PREFIX: "ERR: ", ERR_MUST_BE_NUMBER: "%s nan", ERR_OUT_OF_RANGE: "%s range",
    format: function (template) {
        var args = []; for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
        var idx = 0;
        return template.replace(/%s/g, function () { return idx < args.length ? String(args[idx++]) : "%s"; });
    }
};
global.alert = function () {};

// Load Utils (needed for presetEquals)
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "ui_state.js"), "utf8"));


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


// ===== Fixtures =====
function baseValues(overrides) {
    var b = {
        mode: "ZUND",
        gapInner: 5, gapOuter: 0, maxDist: 500,
        feedTop: 70, feedBottom: 50,
        drawRed: true, useArtboardBounds: false,
        markSizeZ: 5, markSizeS: 3, orientDist: 100,
        markColor: "[Registration]",
        layers: [{ name: "Cut", color: "[Registration]" }]
    };
    if (overrides) for (var k in overrides) {
        if (overrides.hasOwnProperty(k)) b[k] = overrides[k];
    }
    return b;
}
function basePData(active) {
    return {
        activePreset: active || "[Default]",
        presets: {
            "[Default]":      baseValues(),
            "[Last Settings]": baseValues(),
            "MyZund":         baseValues({ gapInner: 7 }),
            "MySumma":        baseValues({ mode: "SUMMA", gapInner: 5 })
        }
    };
}


// =====================================================
// TEST 1: validatePresetName
// =====================================================
console.log("\n=== TEST 1: validatePresetName ===");
assertEq(ZSM.UIState.validatePresetName("MyName"), "MyName", "Valid name preserved");
assertEq(ZSM.UIState.validatePresetName("  MyName  "), "MyName", "Trim whitespace");
assertEq(ZSM.UIState.validatePresetName(""), null, "Empty string invalid");
assertEq(ZSM.UIState.validatePresetName("   "), null, "Whitespace-only invalid");
assertEq(ZSM.UIState.validatePresetName(null), null, "null invalid");
assertEq(ZSM.UIState.validatePresetName(undefined), null, "undefined invalid");
assertEq(ZSM.UIState.validatePresetName("[Default]"), null, "[Default] is reserved");
assertEq(ZSM.UIState.validatePresetName("[Last Settings]"), null, "[Last Settings] is reserved");
// The whole "[...]" namespace is reserved (sentinel collision with the
// localized-default migration in Storage.load) — any fully-bracketed name
// is rejected. Brackets INSIDE a name remain fine.
assertEq(ZSM.UIState.validatePresetName("[MyCustom]"), null, "Fully-bracketed names reserved");
assertEq(ZSM.UIState.validatePresetName("My [10] preset"), "My [10] preset", "Inner brackets still valid");


// =====================================================
// TEST 2: isModified
// =====================================================
console.log("\n=== TEST 2: isModified ===");
var pData = basePData("MyZund");
var current = baseValues({ gapInner: 7 });   // matches MyZund
assertEq(ZSM.UIState.isModified(pData, current), false, "Match active preset → not modified");

current = baseValues({ gapInner: 8 });        // differs from MyZund
assertEq(ZSM.UIState.isModified(pData, current), true, "UI value diff → modified");

assertEq(ZSM.UIState.isModified(null, current), false, "null pData → not modified");
assertEq(ZSM.UIState.isModified(pData, null), false, "null currentValues → not modified");

// Active preset doesn't exist
pData.activePreset = "Nonexistent";
assertEq(ZSM.UIState.isModified(pData, current), false, "Active not in presets → not modified (graceful)");


// =====================================================
// TEST 3: formatPresetList — sort + asterisk
// =====================================================
console.log("\n=== TEST 3: formatPresetList ===");
pData = basePData("MyZund");
current = baseValues({ gapInner: 7 });   // = MyZund, not modified

var list = ZSM.UIState.formatPresetList(pData, current, { PRESET_DEFAULT: "[Výchozí]" });
// Should be sorted alphabetically: [Default], MySumma, MyZund (excluding [Last Settings])
assertEq(list.length, 3, "List excludes [Last Settings] (3 entries)");
assertEq(list[0].key, "[Default]", "Sort order: [Default] first");
assertEq(list[0].displayText, "[Výchozí]", "Localization: [Default] → [Výchozí]");
assertEq(list[1].key, "MySumma", "Sort: MySumma second");
assertEq(list[2].key, "MyZund", "Sort: MyZund third");
assertEq(list[2].isActive, true, "MyZund is active");
assertEq(list[2].isModified, false, "MyZund not modified (UI matches)");

// Modify UI value → asterisk on active
current = baseValues({ gapInner: 99 });
list = ZSM.UIState.formatPresetList(pData, current, { PRESET_DEFAULT: "[Default]" });
assertEq(list[2].isModified, true, "After UI change: active flagged modified");
assertEq(list[2].displayText, "MyZund *", "Asterisk in displayText");
// Non-active presets never get asterisk
assertEq(list[0].isModified, false, "[Default] not modified (not active)");
assertEq(list[1].isModified, false, "MySumma not modified (not active)");

// [Last Settings] never appears
var hasLast = false;
for (var i = 0; i < list.length; i++) if (list[i].key === "[Last Settings]") hasLast = true;
assertEq(hasLast, false, "[Last Settings] hidden from list");


// =====================================================
// TEST 4: save (silent overwrite of named preset)
// =====================================================
console.log("\n=== TEST 4: save — named preset ===");
pData = basePData("MyZund");
current = baseValues({ gapInner: 99 });
var r = ZSM.UIState.save(pData, current);
assertEq(r.ok, true, "save on named: ok=true");
assertEq(pData.presets["MyZund"].gapInner, 99, "save: preset updated to current values");


// =====================================================
// TEST 5: save — [Default] degrades to needs-name
// =====================================================
console.log("\n=== TEST 5: save — [Default] is immutable ===");
pData = basePData("[Default]");
var origDefault = pData.presets["[Default]"].gapInner;
r = ZSM.UIState.save(pData, baseValues({ gapInner: 999 }));
assertEq(r.ok, false, "save on [Default]: ok=false");
assertEq(r.reason, "needs-name", "save on [Default]: reason=needs-name");
assertEq(pData.presets["[Default]"].gapInner, origDefault, "[Default] unchanged");


// =====================================================
// TEST 6: save — [Last Settings] is immutable too
// =====================================================
console.log("\n=== TEST 6: save — [Last Settings] is immutable ===");
pData = basePData("[Last Settings]");
r = ZSM.UIState.save(pData, baseValues({ gapInner: 999 }));
assertEq(r.ok, false, "save on [Last Settings]: ok=false");
assertEq(r.reason, "needs-name", "save on [Last Settings]: reason=needs-name");


// =====================================================
// TEST 7: saveAs — new preset
// =====================================================
console.log("\n=== TEST 7: saveAs — fresh name ===");
pData = basePData("[Default]");
r = ZSM.UIState.saveAs(pData, "NewPreset", baseValues({ gapInner: 12 }));
assertEq(r.ok, true, "saveAs new: ok");
assertEq(r.name, "NewPreset", "saveAs returns clean name");
assertEq(pData.presets["NewPreset"].gapInner, 12, "saveAs: preset stored");
assertEq(pData.activePreset, "NewPreset", "saveAs: active switched to new preset");


// =====================================================
// TEST 8: saveAs — name validation
// =====================================================
console.log("\n=== TEST 8: saveAs — invalid names ===");
pData = basePData();
r = ZSM.UIState.saveAs(pData, "", baseValues());
assertEq(r.ok, false, "saveAs empty: ok=false");
assertEq(r.reason, "invalid-name", "saveAs empty: reason");

r = ZSM.UIState.saveAs(pData, "   ", baseValues());
assertEq(r.ok, false, "saveAs whitespace: ok=false");

r = ZSM.UIState.saveAs(pData, "[Default]", baseValues());
assertEq(r.ok, false, "saveAs [Default]: invalid (reserved)");

r = ZSM.UIState.saveAs(pData, "[Last Settings]", baseValues());
assertEq(r.ok, false, "saveAs [Last Settings]: invalid (reserved)");


// =====================================================
// TEST 9: saveAs — overwrite confirmation
// =====================================================
console.log("\n=== TEST 9: saveAs — overwrite ===");
pData = basePData();
// Confirm callback returns true → overwrite proceeds
var confirmCalls = 0;
r = ZSM.UIState.saveAs(pData, "MyZund", baseValues({ gapInner: 99 }),
    function (name) { confirmCalls++; return true; });
assertEq(r.ok, true, "saveAs overwrite (confirm=true): ok");
assertEq(confirmCalls, 1, "Confirm callback called once");
assertEq(pData.presets["MyZund"].gapInner, 99, "Overwrite: new values stored");

// Confirm callback returns false → user cancels
pData = basePData();
var origZund = pData.presets["MyZund"].gapInner;
r = ZSM.UIState.saveAs(pData, "MyZund", baseValues({ gapInner: 99 }),
    function () { return false; });
assertEq(r.ok, false, "saveAs overwrite (confirm=false): ok=false");
assertEq(r.reason, "user-cancelled", "Cancellation reason");
assertEq(pData.presets["MyZund"].gapInner, origZund, "Cancelled: preset unchanged");


// =====================================================
// TEST 10: saveAs — name trimming
// =====================================================
console.log("\n=== TEST 10: saveAs — name trimming ===");
pData = basePData();
r = ZSM.UIState.saveAs(pData, "  Spaced  ", baseValues());
assertEq(r.ok, true, "saveAs trim: ok");
assertEq(r.name, "Spaced", "saveAs returns trimmed name");
assertEq(pData.presets["Spaced"] !== undefined, true, "Trimmed name stored");


// =====================================================
// TEST 11: deleteActive — named preset
// =====================================================
console.log("\n=== TEST 11: deleteActive — named ===");
pData = basePData("MyZund");
r = ZSM.UIState.deleteActive(pData);
assertEq(r.ok, true, "delete named: ok");
assertEq(pData.presets["MyZund"], undefined, "delete: removed from presets");
assertEq(pData.activePreset, "[Default]", "delete: active reverts to [Default]");
// MySumma still there
assertEq(pData.presets["MySumma"] !== undefined, true, "Other presets preserved");


// =====================================================
// TEST 12: deleteActive — [Default] / [Last Settings] protected
// =====================================================
console.log("\n=== TEST 12: deleteActive — reserved keys protected ===");
pData = basePData("[Default]");
r = ZSM.UIState.deleteActive(pData);
assertEq(r.ok, false, "delete [Default]: ok=false");
assertEq(r.reason, "reserved", "delete [Default]: reason");
assert(pData.presets["[Default]"] !== undefined, "[Default] preserved");

pData = basePData("[Last Settings]");
r = ZSM.UIState.deleteActive(pData);
assertEq(r.ok, false, "delete [Last Settings]: ok=false");
assertEq(r.reason, "reserved", "delete [Last Settings]: reason");


// =====================================================
// TEST 13: selectPreset
// =====================================================
console.log("\n=== TEST 13: selectPreset ===");
pData = basePData("[Default]");
r = ZSM.UIState.selectPreset(pData, "MyZund");
assertEq(r.ok, true, "selectPreset existing: ok");
assertEq(pData.activePreset, "MyZund", "selectPreset: active changed");
assertEq(r.settings.gapInner, 7, "selectPreset: returns target settings");

r = ZSM.UIState.selectPreset(pData, "Nonexistent");
assertEq(r.ok, false, "selectPreset nonexistent: ok=false");
assertEq(r.reason, "not-found", "selectPreset nonexistent: reason");
assertEq(pData.activePreset, "MyZund", "selectPreset failed: active unchanged");


// =====================================================
// TEST 14: Roundtrip — full workflow
// =====================================================
console.log("\n=== TEST 14: Full workflow ===");
// Start fresh
pData = {
    activePreset: "[Default]",
    presets: {
        "[Default]":       baseValues(),
        "[Last Settings]": baseValues()
    }
};

// 1. User modifies values (UI state diverges from [Default])
var uiValues = baseValues({ gapInner: 12, markSizeZ: 6 });
assertEq(ZSM.UIState.isModified(pData, uiValues), true, "Workflow: divergence detected");

// 2. Tries to Save — degrades to needs-name (on [Default])
r = ZSM.UIState.save(pData, uiValues);
assertEq(r.reason, "needs-name", "Workflow: save on [Default] needs name");

// 3. Save As "MySetup"
r = ZSM.UIState.saveAs(pData, "MySetup", uiValues);
assertEq(r.ok, true, "Workflow: saveAs new succeeds");
assertEq(pData.activePreset, "MySetup", "Workflow: switched to MySetup");
assertEq(ZSM.UIState.isModified(pData, uiValues), false, "Workflow: after save not modified");

// 4. Modify again → save (now silently overwrites named preset)
uiValues = baseValues({ gapInner: 15 });
r = ZSM.UIState.save(pData, uiValues);
assertEq(r.ok, true, "Workflow: save on named preset");
assertEq(pData.presets["MySetup"].gapInner, 15, "Workflow: preset updated");

// 5. Switch back to [Default]
r = ZSM.UIState.selectPreset(pData, "[Default]");
assertEq(r.ok, true, "Workflow: switch to [Default]");
assertEq(r.settings.gapInner, 5, "Workflow: [Default] values returned");

// 6. Delete MySetup
pData.activePreset = "MySetup";
r = ZSM.UIState.deleteActive(pData);
assertEq(r.ok, true, "Workflow: delete MySetup");
assertEq(pData.presets["MySetup"], undefined, "Workflow: MySetup gone");
assertEq(pData.activePreset, "[Default]", "Workflow: back to [Default]");


// =====================================================
// SUMMARY
// =====================================================
console.log("\n" + "=".repeat(50));
console.log("UI STATE TEST RESULTS: " + pass + "/" + total + " PASSED, " + fail + " FAILED");
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
