#!/usr/bin/env node
/**
 * GM.UI dialog structural tests.
 *
 * Builds the REAL GM.UI.buildDialog against a mock ScriptUI tree, then drives
 * control handlers and reads gatherAll() — the same path Generate uses. This is
 * the layer that pure-module tests never touched, and where the cycle-2
 * Count/Spacing radio regression lived.
 *
 * The mock makes radio buttons independent (no implicit ScriptUI grouping), so
 * any dialog relying on that implicit grouping fails here. See mock_scriptui.js.
 *
 * Usage: node tests/test_ui_dialog.js
 */

var fs   = require("fs");
var path = require("path");
var SUI  = require("./lib/mock_scriptui.js");

// ===== ENV =====
global.app = { locale: "cs_CZ" };

var GM = {};

// ===== LOAD PRODUCTION CODE (order matters) =====
// eval at top-level scope so the modules' `GM` resolves to the GM above
// (a helper function would capture a function-local GM and lose it).
function src(rel) { return fs.readFileSync(path.join(__dirname, "..", "src", rel), "utf8"); }
eval(src("constants.js"));
eval(src("locale.js"));
eval(src("lib/utils.js"));
eval(src("config.js"));
eval(src("lib/validation.js"));
eval(src("lib/ui_state.js"));
eval(src("core.js"));
eval(src("lib/storage.js"));
eval(src("ui.js"));

// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}

function freshPData() {
    var p = { activePreset: "[Default]", presets: {} };
    p.presets["[Default]"] = GM.Config.getDefaults();
    return p;
}
function buildUI(pData) {
    SUI.install();
    var ui = GM.UI.buildDialog(pData || freshPData(), { names: [] }, { names: [] });
    return ui; // {window, gatherAll}
}
function done() { SUI.uninstall(); }

// Find an edge group by a label substring among its descendants' text.
function findRadio(win, labelText) {
    return win.findOne(function (c) {
        return c.type === "radiobutton" && c.text === labelText;
    });
}

// ===== TEST: reserved preset keys stay in sync =====
// GM.UIState intentionally duplicates the reserved keys (unit-testable without
// Config/Storage). The "MUST stay in sync" comment is enforced here — this is
// the only suite that loads all three modules together.
console.log("--- UIState reserved-key sync ---");
(function () {
    assert(GM.UIState.PRESET_KEY_DEFAULT === GM.Config.PRESET_KEY_DEFAULT,
        "UIState.PRESET_KEY_DEFAULT === Config.PRESET_KEY_DEFAULT");
    assert(GM.UIState.PRESET_KEY_LAST === GM.Storage.PRESET_KEY_LAST,
        "UIState.PRESET_KEY_LAST === Storage.PRESET_KEY_LAST");
})();

// ===== TEST: dialog builds =====
console.log("--- UI.buildDialog: builds ---");
(function () {
    var ui = buildUI();
    assert(ui && typeof ui.gatherAll === "function", "buildDialog returns gatherAll");
    var w = SUI.lastWindow();
    assert(w && w.type === "window", "a window was created");
    assert(/v\d/.test(w.text), "title contains version");
    done();
})();

// ===== TEST: Count/Spacing radio exclusivity (THE regression) =====
console.log("--- UI: Count/Spacing radio exclusivity (regression) ---");
(function () {
    var ui = buildUI();
    var cfg = ui.gatherAll();
    // Default is count mode on top edge.
    assert(cfg.top.useNumber === true, "default top edge is count mode");

    // Click the top edge's "Spacing" radio. There are 4 edges; the top edge is
    // the first SPACING radio in tree order.
    var w = SUI.lastWindow();
    var spacingRadios = w.find(function (c) {
        return c.type === "radiobutton" && c.text === GM.L.SPACING;
    });
    var countRadios = w.find(function (c) {
        return c.type === "radiobutton" && c.text === GM.L.COUNT;
    });
    assert(spacingRadios.length === 4, "four Spacing radios (one per edge)");
    assert(countRadios.length === 4, "four Count radios (one per edge)");

    // Fire the top edge's Spacing onClick.
    spacingRadios[0].onClick();
    var after = ui.gatherAll();
    assert(after.top.useNumber === false,
        "clicking Spacing flips top edge to spacing mode (useNumber:false)");
    // And the count radio must have been turned off (explicit exclusivity).
    assert(countRadios[0].value === false,
        "Count radio is deselected after choosing Spacing");

    // Flip back to Count.
    countRadios[0].onClick();
    assert(ui.gatherAll().top.useNumber === true, "clicking Count flips back to count mode");
    assert(spacingRadios[0].value === false, "Spacing radio deselected after choosing Count");
    done();
})();

// ===== TEST: shape is locked to circle (no shape control) =====
console.log("--- UI: shape locked to circle ---");
(function () {
    var ui = buildUI();
    assert(ui.gatherAll().isRound === true, "gather reports isRound:true (circle)");
    var w = SUI.lastWindow();
    // Only the 8 edge radios remain (4 edges × Count/Spacing); no shape radios.
    var radios = w.find(function (c) { return c.type === "radiobutton"; });
    assert(radios.length === 8, "exactly 8 radios (edges only, no shape radios)");
    done();
})();

// ===== TEST: gatherAll round-trips a spacing preset =====
console.log("--- UI: applyAll/gatherAll preserves spacing mode ---");
(function () {
    var p = freshPData();
    // Seed [Last Settings] with a spacing-mode top edge (what a saved preset holds).
    var s = GM.Config.getDefaults();
    s.top = { enabled: true, useNumber: false, number: 10, spacing: 500 };
    s.offsetX = 50; s.offsetY = 50;
    p.presets["[Last Settings]"] = s;

    var ui = buildUI(p);  // buildDialog applies [Last Settings] on open
    var cfg = ui.gatherAll();
    assert(cfg.top.useNumber === false, "spacing mode survives applyAll → gatherAll");
    assert(cfg.top.spacing === 500, "spacing value 500 survives");
    assert(cfg.offsetX === 50, "offsetX 50 survives");
    done();
})();

// ===== TEST: mirror reads through getMirror =====
console.log("--- UI: mirror flags via gatherAll ---");
(function () {
    var ui = buildUI();
    var cfg = ui.gatherAll();
    // Defaults: bottom & right mirror enabled.
    assert(cfg.bottomMirror === true, "default bottomMirror true");
    assert(cfg.rightMirror === true, "default rightMirror true");
    done();
})();

// ===== TEST: Appearance labels share a fixed width (aligned dropdowns) =====
console.log("--- UI: Appearance label column ---");
(function () {
    var ui = buildUI();
    var w = SUI.lastWindow();
    var LABEL_W = 75;
    function widthOf(pred) { var c = w.findOne(pred); return c ? c.preferredSize.width : -1; }
    var layer  = widthOf(function (c) { return c.type === "statictext" && c.text === GM.L.LAYER; });
    var fill   = widthOf(function (c) { return c.type === "checkbox"   && c.text === GM.L.FILL; });
    var stroke = widthOf(function (c) { return c.type === "checkbox"   && c.text === GM.L.STROKE; });
    var weight = widthOf(function (c) { return c.type === "statictext" && c.text === GM.L.WEIGHT; });
    assert(layer === LABEL_W,  "Vrstva label width fixed to " + LABEL_W);
    assert(fill === LABEL_W,   "Výplň checkbox width fixed to " + LABEL_W);
    assert(stroke === LABEL_W, "Obrys checkbox width fixed to " + LABEL_W);
    assert(weight === LABEL_W, "Tloušťka label width fixed to " + LABEL_W);
    done();
})();

// ===== TEST: revert (↺) replaces Reset =====
console.log("--- UI: revert button ---");
(function () {
    var ui = buildUI();
    var w = SUI.lastWindow();
    var resetBtns = w.find(function (c) { return c.type === "button" && c.text === "Reset"; });
    assert(resetBtns.length === 0, "Reset button removed");
    var revert = w.findOne(function (c) { return c.type === "button" && c.text === "↺"; });
    assert(!!revert, "revert (↺) button exists");
    assert(revert.enabled === false, "revert disabled when not modified");

    var offX = w.findOne(function (c) { return c.type === "edittext"; });
    offX.text = "999";
    if (typeof offX.onChange === "function") offX.onChange();
    assert(revert.enabled === true, "revert enabled after a change");

    revert.onClick();
    assert(ui.gatherAll().offsetX === 7, "revert restores offsetX to default 7");
    done();
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
