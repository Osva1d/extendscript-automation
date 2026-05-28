#!/usr/bin/env node
/**
 * GM.UIState Test Suite
 * Pure preset state-transition logic (no ScriptUI).
 *
 * Usage: node tests/test_ui_state.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
var GM = {};

// ===== LOAD PRODUCTION CODE =====
eval(fs.readFileSync(path.join(__dirname, "..", "src", "constants.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "config.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "ui_state.js"), "utf8"));

var L = { DEFAULT_PRESET: "[Default]" };

// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}

function makePData() {
    var p = { activePreset: "[Default]", presets: {} };
    p.presets["[Default]"] = GM.Config.getDefaults();
    return p;
}

// ===== validatePresetName =====
console.log("--- UIState.validatePresetName ---");
assert(GM.UIState.validatePresetName("  Foo  ") === "Foo", "trims whitespace");
assert(GM.UIState.validatePresetName("") === null, "empty → null");
assert(GM.UIState.validatePresetName("   ") === null, "blank → null");
assert(GM.UIState.validatePresetName(null) === null, "null → null");
assert(GM.UIState.validatePresetName("[Default]") === null, "reserved [Default] → null");
assert(GM.UIState.validatePresetName("[Last Settings]") === null, "reserved [Last Settings] → null");
assert(GM.UIState.validatePresetName("Banner") === "Banner", "normal name kept");

// ===== isModified =====
console.log("--- UIState.isModified ---");
(function () {
    var p = makePData();
    var cur = GM.Utils.deepCopy(p.presets["[Default]"]);
    assert(GM.UIState.isModified(p, cur) === false, "identical → not modified");
    cur.markSize = 99;
    assert(GM.UIState.isModified(p, cur) === true, "changed field → modified");
    assert(GM.UIState.isModified(p, null) === false, "null currentValues → false");
})();

// ===== save =====
console.log("--- UIState.save ---");
(function () {
    var p = makePData();
    var cur = GM.Utils.deepCopy(p.presets["[Default]"]);
    assert(GM.UIState.save(p, cur).reason === "needs-name", "active [Default] → needs-name");
    p.activePreset = "[Last Settings]";
    assert(GM.UIState.save(p, cur).reason === "needs-name", "active [Last Settings] → needs-name");
    assert(GM.UIState.save(null, cur).reason === "missing-input", "missing pData → missing-input");

    p.presets["Banner"] = GM.Config.getDefaults();
    p.activePreset = "Banner";
    cur.markSize = 42;
    var r = GM.UIState.save(p, cur);
    assert(r.ok === true, "save to named preset ok");
    assert(p.presets["Banner"].markSize === 42, "named preset updated with current values");
})();

// ===== saveAs =====
console.log("--- UIState.saveAs ---");
(function () {
    var p = makePData();
    var cur = GM.Utils.deepCopy(p.presets["[Default]"]);
    var r = GM.UIState.saveAs(p, "  New One  ", cur);
    assert(r.ok === true && r.name === "New One", "saveAs trims + returns name");
    assert(p.presets["New One"] !== undefined, "new preset stored");
    assert(p.activePreset === "New One", "activePreset switched to new");

    assert(GM.UIState.saveAs(p, "[Default]", cur).reason === "invalid-name", "reserved → invalid-name");
    assert(GM.UIState.saveAs(p, "  ", cur).reason === "invalid-name", "blank → invalid-name");

    // overwrite existing — confirm declines
    var r2 = GM.UIState.saveAs(p, "New One", cur, function () { return false; });
    assert(r2.reason === "user-cancelled", "existing + decline → user-cancelled");
    // overwrite existing — confirm accepts
    var r3 = GM.UIState.saveAs(p, "New One", cur, function () { return true; });
    assert(r3.ok === true, "existing + accept → ok");
})();

// ===== deleteActive =====
console.log("--- UIState.deleteActive ---");
(function () {
    var p = makePData();
    assert(GM.UIState.deleteActive(p).reason === "reserved", "delete [Default] → reserved");
    p.activePreset = "[Last Settings]";
    assert(GM.UIState.deleteActive(p).reason === "reserved", "delete [Last Settings] → reserved");

    p.presets["Banner"] = GM.Config.getDefaults();
    p.activePreset = "Banner";
    var r = GM.UIState.deleteActive(p);
    assert(r.ok === true, "delete named preset ok");
    assert(p.presets["Banner"] === undefined, "named preset removed");
    assert(p.activePreset === "[Default]", "activePreset reverts to [Default]");

    p.activePreset = "Ghost"; // not in presets
    assert(GM.UIState.deleteActive(p).reason === "not-found", "missing active → not-found");
})();

// ===== selectPreset =====
console.log("--- UIState.selectPreset ---");
(function () {
    var p = makePData();
    p.presets["Banner"] = GM.Config.getDefaults();
    var r = GM.UIState.selectPreset(p, "Banner");
    assert(r.ok === true && r.settings !== undefined, "select existing → ok + settings");
    assert(p.activePreset === "Banner", "activePreset updated");
    assert(GM.UIState.selectPreset(p, "Nope").reason === "not-found", "select missing → not-found");
})();

// ===== formatPresetList =====
console.log("--- UIState.formatPresetList ---");
(function () {
    var p = makePData();
    p.presets["Beta"]  = GM.Config.getDefaults();
    p.presets["Alpha"] = GM.Config.getDefaults();
    p.presets["[Last Settings]"] = GM.Config.getDefaults();
    p.activePreset = "[Default]";
    var cur = GM.Utils.deepCopy(p.presets["[Default]"]);

    var list = GM.UIState.formatPresetList(p, cur, L);
    // [Last Settings] excluded
    var hasLast = false;
    for (var i = 0; i < list.length; i++) if (list[i].key === "[Last Settings]") hasLast = true;
    assert(!hasLast, "[Last Settings] excluded from list");
    assert(list.length === 3, "Default + Alpha + Beta listed");
    assert(list[0].key === "[Default]", "Default first");
    assert(list[1].key === "Alpha" && list[2].key === "Beta", "named presets sorted alpha");
    assert(list[0].displayText === "[Default]", "Default uses localized display");

    // modified indicator
    cur.markSize = 7;
    var list2 = GM.UIState.formatPresetList(p, cur, L);
    assert(list2[0].isActive === true, "Default is active");
    assert(/\*$/.test(list2[0].displayText), "active+modified shows trailing *");
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
