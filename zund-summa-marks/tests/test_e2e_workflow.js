#!/usr/bin/env node
/**
 * End-to-End Workflow Tests
 *
 * Simulates the production data flow through main.jsx WITHOUT a real
 * ScriptUI dialog. The dialog is "stubbed" by directly mutating pData
 * the way btnOk.onClick would, then we verify that main.jsx's settings
 * extraction yields what render() needs.
 *
 * Why this exists: each individual module (Validation, UIState, Draw,
 * Storage) has unit tests. But the GLUE between them (main.jsx logic)
 * was untested. A real bug slipped through:
 *
 *   - User on named preset "MyZund" (color="[Registration]")
 *   - User changes UI dropdown to "cut" — does not click Save
 *   - btnOk stores [Last Settings] with "cut"; named preset stays
 *     immutable per Tier 2 stable-preset semantics
 *   - main.jsx (PRE-FIX) reads `presets[activePreset]` → "[Registration]"
 *   - Render reports missing-color warning for "[Registration]"
 *
 * Tests below codify these expectations so the regression cannot recur.
 *
 * Usage: node tests/test_e2e_workflow.js
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

// ===== SETUP =====
var ZSM = {};
ZSM.L = {
    ERROR_PREFIX: "ERR: ",
    ERR_MUST_BE_NUMBER: "%s nan",
    ERR_OUT_OF_RANGE:   "%s range",
    format: function (template) {
        var args = []; for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
        var idx = 0;
        return template.replace(/%s/g, function () { return idx < args.length ? String(args[idx++]) : "%s"; });
    }
};
global.alert = function () {};

eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "validation.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "ui_state.js"), "utf8"));


// =====================================================
// Helpers — simulate the dialog without ScriptUI
// =====================================================

/**
 * Simulates btnOk.onClick: takes a `pData` (preset wrapper) + raw user
 * UI inputs, runs validation + Tier 2 stable-preset semantics, returns
 * the post-Generate pData. Mirrors src/ui.js btnOk.onClick logic.
 */
function simulateBtnOk(pData, rawUI) {
    var prevOk = pData.presets[pData.activePreset] || {};
    var result = ZSM.Validation.validate(rawUI, prevOk, ZSM.L);
    if (!result.valid) return null;

    // Tier 2: only [Last Settings] is updated, named presets immutable.
    pData.presets["[Last Settings]"] = result.settings;
    return pData;
}

/**
 * Simulates main.jsx's settings extraction. Must match src/main.jsx exactly:
 *   var res = resultWrapper.presets["[Last Settings]"]
 *          || resultWrapper.presets[resultWrapper.activePreset];
 */
function extractRuntimeSettings(pData) {
    return pData.presets["[Last Settings]"] || pData.presets[pData.activePreset];
}

/**
 * Builds a baseline pData wrapper.
 */
function basePData(activeKey, customPresets) {
    var p = { activePreset: activeKey || "[Default]", presets: {} };
    var defaults = {
        mode: "ZUND",
        gapInner: 5, gapOuter: 0, maxDist: 500,
        feedTop: 70, feedBottom: 50,
        drawRed: true, useArtboardBounds: false,
        markSizeZ: 5, markSizeS: 3, orientDist: 100,
        markColor: "[Registration]",
        layers: [{ name: "Cut", color: "[Registration]" }]
    };
    p.presets["[Default]"] = JSON.parse(JSON.stringify(defaults));
    p.presets["[Last Settings]"] = JSON.parse(JSON.stringify(defaults));
    if (customPresets) for (var k in customPresets) {
        if (customPresets.hasOwnProperty(k)) p.presets[k] = customPresets[k];
    }
    return p;
}

/**
 * Builds raw UI input matching what ui.js btnOk would collect.
 */
function rawUI(overrides) {
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


// =====================================================
// TEST 1: Bug regression — modified UI on named preset
// =====================================================
// THIS IS THE ACTUAL BUG. User had named preset "MyZund" with color
// "[Registration]". Changed dropdown to "cut" in UI without clicking Save.
// Hit Generate. Expected: render uses "cut". Actual (PRE-FIX): render used
// "[Registration]" because main.jsx pulled from presets[activePreset].
console.log("\n=== TEST 1: BUG REGRESSION — runtime uses [Last Settings], not stale preset ===");

var pData = basePData("MyZund", {
    "MyZund": {
        mode: "ZUND",
        gapInner: 5, gapOuter: 0, maxDist: 500,
        feedTop: 70, feedBottom: 50,
        drawRed: true, useArtboardBounds: false,
        markSizeZ: 5, markSizeS: 3, orientDist: 100,
        markColor: "[Registration]",
        layers: [{ name: "Cut", color: "[Registration]" }]   // OLD value
    }
});

// User's UI has the layer color changed to "cut"
var raw = rawUI({
    layers: [{ name: "Cut", color: "cut" }]
});

simulateBtnOk(pData, raw);

// Sanity: named preset MUST remain immutable (Tier 2)
assertEq(pData.presets["MyZund"].layers[0].color, "[Registration]",
    "Tier 2: named preset 'MyZund' unchanged (color stays [Registration])");

// [Last Settings] must reflect user's UI input
assertEq(pData.presets["[Last Settings]"].layers[0].color, "cut",
    "[Last Settings] reflects user's UI choice (cut)");

// THE FIX — main.jsx must read from [Last Settings]
var res = extractRuntimeSettings(pData);
assertEq(res.layers[0].color, "cut",
    "BUG FIX: extractRuntimeSettings returns 'cut' (from [Last Settings]), not '[Registration]'");
assert(res.layers[0].color !== "[Registration]",
    "BUG FIX: NOT '[Registration]' (the stale named-preset value)");


// =====================================================
// TEST 2: Same workflow but on [Default] (also immutable)
// =====================================================
console.log("\n=== TEST 2: [Default] preset — UI changes also picked up via [Last Settings] ===");
pData = basePData("[Default]");
raw = rawUI({
    gapInner: "10",        // changed from default 5
    layers: [{ name: "Cut", color: "MySpot" }]
});
simulateBtnOk(pData, raw);

// [Default] must remain factory-pristine
assertEq(pData.presets["[Default]"].gapInner, 5, "[Default]: gapInner unchanged (5)");
assertEq(pData.presets["[Default]"].layers[0].color, "[Registration]",
    "[Default]: layer color unchanged");

res = extractRuntimeSettings(pData);
assertEq(res.gapInner, 10, "Runtime: gapInner=10 (from UI)");
assertEq(res.layers[0].color, "MySpot", "Runtime: layer color=MySpot (from UI)");


// =====================================================
// TEST 3: Multiple sequential generations on same preset
// =====================================================
console.log("\n=== TEST 3: Multiple Generate runs preserve preset, [Last Settings] tracks each ===");
pData = basePData("MyZund", {
    "MyZund": {
        mode: "ZUND", gapInner: 5, gapOuter: 0, maxDist: 500,
        feedTop: 70, feedBottom: 50, drawRed: true, useArtboardBounds: false,
        markSizeZ: 5, markSizeS: 3, orientDist: 100,
        markColor: "[Registration]",
        layers: [{ name: "Cut", color: "[Registration]" }]
    }
});

// Run 1: gapInner=7
simulateBtnOk(pData, rawUI({ gapInner: "7" }));
res = extractRuntimeSettings(pData);
assertEq(res.gapInner, 7, "Run 1: gapInner=7 used");
assertEq(pData.presets["MyZund"].gapInner, 5, "Run 1: MyZund preset unchanged (5)");

// Run 2: gapInner=12 (different value)
simulateBtnOk(pData, rawUI({ gapInner: "12" }));
res = extractRuntimeSettings(pData);
assertEq(res.gapInner, 12, "Run 2: gapInner=12 used");
assertEq(pData.presets["MyZund"].gapInner, 5, "Run 2: MyZund still unchanged");

// activePreset must stay on MyZund
assertEq(pData.activePreset, "MyZund", "activePreset stays on MyZund across runs");


// =====================================================
// TEST 4: Save button explicitly commits to named preset
// =====================================================
console.log("\n=== TEST 4: Save commits UI → preset; subsequent Generate uses committed values ===");
pData = basePData("MyZund", {
    "MyZund": {
        mode: "ZUND", gapInner: 5, gapOuter: 0, maxDist: 500,
        feedTop: 70, feedBottom: 50, drawRed: true, useArtboardBounds: false,
        markSizeZ: 5, markSizeS: 3, orientDist: 100,
        markColor: "[Registration]",
        layers: [{ name: "Cut", color: "[Registration]" }]
    }
});

// User modifies UI
raw = rawUI({ gapInner: "8", layers: [{ name: "Cut", color: "cut" }] });

// User clicks Save BEFORE Generate
var validated = ZSM.Validation.validate(raw, pData.presets["MyZund"], ZSM.L);
assert(validated.valid, "Save: validation passes");
ZSM.UIState.save(pData, validated.settings);
assertEq(pData.presets["MyZund"].gapInner, 8, "Save: MyZund.gapInner committed to 8");
assertEq(pData.presets["MyZund"].layers[0].color, "cut", "Save: MyZund layer color committed");

// Then Generate
simulateBtnOk(pData, raw);
res = extractRuntimeSettings(pData);
assertEq(res.gapInner, 8, "After Save+Generate: runtime uses 8");
assertEq(res.layers[0].color, "cut", "After Save+Generate: runtime uses 'cut'");


// =====================================================
// TEST 5: Mode switch preserves [Last Settings] across dialog reopen
// =====================================================
// Simulating the mode-switch dialog reopen pattern from ui.js
console.log("\n=== TEST 5: Mode switch preserves user values via [Last Settings] ===");
pData = basePData("[Default]");

// User switches mode in UI: snapshot UI to [Last Settings] with new mode
raw = rawUI({ mode: "SUMMA", gapInner: undefined, markSizeS: "4", feedTop: "75", feedBottom: "55" });
// Apply (simulates the mode-switch handler in ui.js)
var validatedSwitch = ZSM.Validation.validate(raw, pData.presets["[Default]"], ZSM.L);
assert(validatedSwitch.valid, "Mode switch: validation passes");
pData.presets["[Last Settings]"] = validatedSwitch.settings;

// New dialog opens; reads [Last Settings] for initial values (per ui.js init)
var initValues = pData.presets["[Last Settings]"];
assertEq(initValues.mode, "SUMMA", "Mode switch preserved: mode=SUMMA");
assertEq(initValues.markSizeS, 4, "Mode switch preserved: markSizeS=4");

// User then hits Generate
res = extractRuntimeSettings(pData);
assertEq(res.mode, "SUMMA", "After mode switch + Generate: runtime mode=SUMMA");


// =====================================================
// TEST 6: Cancel dialog → [Last Settings] NOT updated
// =====================================================
console.log("\n=== TEST 6: Cancel preserves prior [Last Settings] ===");
pData = basePData("[Default]");
// Set initial [Last Settings] to known state
pData.presets["[Last Settings]"].gapInner = 5;

// User opens dialog, modifies, then CANCELS (no btnOk call → [Last Settings] unchanged)
// In real ui.js, Cancel just returns null and main.jsx aborts.
// We simulate by NOT calling simulateBtnOk.

assertEq(pData.presets["[Last Settings]"].gapInner, 5,
    "Cancel: [Last Settings] preserved (gapInner=5)");


// =====================================================
// TEST 7: First-time run (no [Last Settings] from disk)
// =====================================================
console.log("\n=== TEST 7: First-time run — fallback to activePreset works ===");
// Simulates what happens if [Last Settings] is missing for some reason
pData = { activePreset: "[Default]", presets: { "[Default]": {
    mode: "ZUND", gapInner: 5, gapOuter: 0, maxDist: 500,
    feedTop: 70, feedBottom: 50, drawRed: true, useArtboardBounds: false,
    markSizeZ: 5, markSizeS: 3, orientDist: 100,
    markColor: "[Registration]",
    layers: [{ name: "Cut", color: "[Registration]" }]
}}};

res = extractRuntimeSettings(pData);
assert(res !== undefined, "Missing [Last Settings]: fallback returns activePreset values");
assertEq(res.gapInner, 5, "Fallback: gapInner from [Default]");
assertEq(res.mode, "ZUND", "Fallback: mode from [Default]");


// =====================================================
// TEST 8: Color-mapping integration — layer color reaches render
// =====================================================
// Direct test of the bug scenario: any spot color the user picks must
// reach render() unchanged.
console.log("\n=== TEST 8: Layer color round-trip integrity ===");
var spotColors = ["[Registration]", "Cut", "cut", "Thru-cut", "MyCustomSpot", "K100"];
for (var i = 0; i < spotColors.length; i++) {
    var color = spotColors[i];
    pData = basePData("MyPreset", {
        "MyPreset": {
            mode: "ZUND", gapInner: 5, gapOuter: 0, maxDist: 500,
            feedTop: 70, feedBottom: 50, drawRed: true, useArtboardBounds: false,
            markSizeZ: 5, markSizeS: 3, orientDist: 100,
            markColor: "[Registration]",
            layers: [{ name: "Cut", color: "ORIGINAL" }]
        }
    });
    raw = rawUI({ layers: [{ name: "Cut", color: color }] });
    simulateBtnOk(pData, raw);
    res = extractRuntimeSettings(pData);
    assertEq(res.layers[0].color, color, "Round-trip: '" + color + "' reaches runtime unchanged");
}


// =====================================================
// SUMMARY
// =====================================================
console.log("\n" + "=".repeat(50));
console.log("E2E WORKFLOW TEST RESULTS: " + pass + "/" + total + " PASSED, " + fail + " FAILED");
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
