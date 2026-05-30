#!/usr/bin/env node
/**
 * ZSM.UI.selectDDL / ddlValue Test Suite
 *
 * Regression guard for the H2 fix: when a preset references a swatch/layer
 * that the current document does NOT contain, selectDDL must NOT silently
 * jump to item 0 (which swapped the user's saved choice for an unrelated
 * swatch). Instead it preserves the saved name as a synthetic "(missing)"
 * item; ddlValue reads back the raw name so downstream + isModified see the
 * original value.
 *
 * ZSM.UI is a plain object literal — eval'ing ui.js defines it without running
 * any ScriptUI. selectDDL/ddlValue only touch a handful of dropdown methods,
 * which the mock below emulates.
 *
 * Usage: node tests/test_ui_select_ddl.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENV =====
var ZSM = {};
ZSM.L = { DDL_MISSING_SUFFIX: "(missing)" };

// Minimal ScriptUI dropdownlist mock. selection accepts either an integer
// index (ScriptUI resolves it to the ListItem) or an item object.
function makeDDL(texts) {
    var ddl = {
        items: texts.map(function (t) { return { text: t }; }),
        add: function (type, text) { var it = { text: text }; this.items.push(it); return it; },
        remove: function (idx) { this.items.splice(idx, 1); }
    };
    var sel = null;
    Object.defineProperty(ddl, "selection", {
        get: function () { return sel; },
        set: function (v) { sel = (typeof v === "number") ? ddl.items[v] : v; },
        configurable: true
    });
    return ddl;
}

// ===== LOAD PRODUCTION CODE =====
eval(fs.readFileSync(path.join(__dirname, "..", "src", "ui.js"), "utf8"));

// ===== FRAMEWORK =====
var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}
function assertEq(a, b, msg) {
    total++;
    if (a === b) { pass++; }
    else { fail++; console.log("  FAIL: " + msg + " | got=" + JSON.stringify(a) + " expected=" + JSON.stringify(b)); }
}

// =====================================================
// TEST 1: value present → selects existing, no synthetic item
// =====================================================
console.log("\n=== TEST 1: present value selects existing item ===");
var d1 = makeDDL(["[Registration]", "Cut", "Kiss-cut"]);
ZSM.UI.selectDDL(d1, "Cut");
assertEq(d1.items.length, 3, "no synthetic item added when value exists");
assertEq(ZSM.UI.ddlValue(d1), "Cut", "ddlValue returns the selected existing value");

// =====================================================
// TEST 2: missing value → synthetic flagged item, raw value preserved
// =====================================================
console.log("\n=== TEST 2: missing value preserved as synthetic item ===");
var d2 = makeDDL(["[Registration]", "Cut"]);
ZSM.UI.selectDDL(d2, "MyOrange");
assertEq(d2.items.length, 3, "synthetic item appended for missing value");
assert(d2.selection._zsmMissing === true, "synthetic item flagged _zsmMissing");
assert(/MyOrange\s+\(missing\)/.test(d2.selection.text), "display text carries the (missing) marker");
assertEq(ZSM.UI.ddlValue(d2), "MyOrange", "ddlValue strips marker → raw saved name (no silent swap, no false-modified)");

// =====================================================
// TEST 3: switching missing → missing purges stale synthetic (no accumulation)
// =====================================================
console.log("\n=== TEST 3: stale synthetic purged on re-select ===");
var d3 = makeDDL(["[Registration]"]);
ZSM.UI.selectDDL(d3, "FirstMissing");
ZSM.UI.selectDDL(d3, "SecondMissing");
assertEq(d3.items.length, 2, "only one synthetic item remains (1 real + 1 synthetic)");
assertEq(ZSM.UI.ddlValue(d3), "SecondMissing", "ddlValue reflects the latest missing value");

// =====================================================
// TEST 4: missing → then present purges synthetic and selects real item
// =====================================================
console.log("\n=== TEST 4: missing then present clears synthetic ===");
var d4 = makeDDL(["[Registration]", "Cut"]);
ZSM.UI.selectDDL(d4, "Ghost");        // adds synthetic
ZSM.UI.selectDDL(d4, "Cut");          // should purge synthetic, pick real
assertEq(d4.items.length, 2, "synthetic removed when a present value is selected next");
assertEq(ZSM.UI.ddlValue(d4), "Cut", "real value selected after a prior missing one");

// =====================================================
// TEST 5: empty text → item 0, no synthetic
// =====================================================
console.log("\n=== TEST 5: empty text selects item 0 ===");
var d5 = makeDDL(["[Registration]", "Cut"]);
ZSM.UI.selectDDL(d5, "");
assertEq(d5.items.length, 2, "no synthetic item for empty text");
assertEq(ZSM.UI.ddlValue(d5), "[Registration]", "empty text falls back to item 0");

// =====================================================
// TEST 6: ddlValue with no selection → empty string
// =====================================================
console.log("\n=== TEST 6: ddlValue with no selection ===");
var d6 = makeDDL(["A", "B"]);
assertEq(ZSM.UI.ddlValue(d6), "", "ddlValue returns '' when nothing selected");

// =====================================================
// SUMMARY
// =====================================================
console.log("\n" + "=".repeat(50));
console.log("UI.selectDDL TEST RESULTS: " + pass + "/" + total + " PASSED, " + fail + " FAILED");
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
