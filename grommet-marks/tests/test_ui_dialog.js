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
function buildUI(pData, pathInfo) {
    SUI.install();
    var ui = GM.UI.buildDialog(pData || freshPData(), { names: [] }, { names: [] },
        pathInfo || { ok: false, reason: "no-selection" });
    return ui; // {window, gatherAll, modeUI, pathUI, zonesUI}
}
function mockPathInfo(cornerCount, closed, totalLen) {
    return { ok: true, cornerCount: cornerCount, closed: closed,
             totalLen: totalLen || 1000, corners: [], circuit: null, pathRef: {} };
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
    assert(spacingRadios.length === 5, "five Spacing radios (four edges + path panel)");
    assert(countRadios.length === 5, "five Count radios (four edges + path panel)");

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
    // 8 edge radios (4 edges × Count/Spacing) + 2 mode radios (artboard/path)
    // + 2 path-panel radios (count/spacing) — no shape radios.
    var radios = w.find(function (c) { return c.type === "radiobutton"; });
    assert(radios.length === 12, "exactly 12 radios (8 edges + 2 mode + 2 path, no shape radios)");
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

// ===== TEST: v5 placement mode UI =====
console.log("--- UI v5: placement mode ---");
(function () {
    // No selection -> path radio disabled, artboard active
    var ui = buildUI();
    assert(ui.modeUI.pathRB.enabled === false, "path radio disabled without selection");
    assert(ui.gatherAll().placementMode === "artboard", "default mode artboard");
    done();

    // Valid path with corners -> radio enabled; switching gathers "path"
    var ui2 = buildUI(null, mockPathInfo(4, true));
    assert(ui2.modeUI.pathRB.enabled === true, "path radio enabled with selection");
    ui2.modeUI.pathRB.value = true; ui2.modeUI.pathRB.onClick();
    assert(ui2.gatherAll().placementMode === "path", "gather reports path mode");
    // Path with corners -> count radio disabled (spacing only)
    assert(ui2.pathUI.numRB.enabled === false, "count radio disabled on cornered path");
    assert(ui2.pathUI.spcRB.value === true, "spacing radio forced on cornered path");
    done();

    // Smooth path (0 corners) -> count allowed, zones panel disabled
    var ui3 = buildUI(null, mockPathInfo(0, true));
    ui3.modeUI.pathRB.value = true; ui3.modeUI.pathRB.onClick();
    assert(ui3.pathUI.numRB.enabled === true, "count radio enabled on smooth path");
    assert(ui3.zonesUI.enableCB.enabled === false, "zones disabled on smooth path");
    done();

    // Zones gather/apply roundtrip (artboard mode)
    var ui4 = buildUI();
    ui4.zonesUI.enableCB.value = true; ui4.zonesUI.enableCB.onClick();
    ui4.zonesUI.countIn.text = "5"; ui4.zonesUI.pitchIn.text = "100";
    var g = ui4.gatherAll();
    assert(g.cornerZone.enabled === true, "gather: zones enabled");
    assert(String(g.cornerZone.count) === "5" || g.cornerZone.count === 5, "gather: zone count");
    done();
})();

// ===== TEST: v6 mark shape + weight controls =====
console.log("--- UI v6: mark shape controls ---");
(function () {
    var ui = buildUI();
    var w = SUI.lastWindow();
    var circle = w.findOne(function (c) { return c.type === "checkbox" && c.text === GM.L.MARK_CIRCLE; });
    var cross  = w.findOne(function (c) { return c.type === "checkbox" && c.text === GM.L.MARK_CROSS; });
    assert(!!circle, "Circle checkbox exists");
    assert(!!cross, "Cross checkbox exists");
    assert(circle.value === true, "Circle on by default");
    assert(cross.value === false, "Cross off by default");
    var cfg = ui.gatherAll();
    assert(cfg.markCircle === true, "gather markCircle true");
    assert(cfg.markCross === false, "gather markCross false");
    assert(String(cfg.regWeight) === "1" || cfg.regWeight === 1, "gather regWeight default");
    assert(String(cfg.haloWeight) === "3" || cfg.haloWeight === 3, "gather haloWeight default");
    done();
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
