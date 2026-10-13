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
eval(fs.readFileSync(path.join(__dirname, "..", "..", "shared", "lib", "ui_state.js"), "utf8"));
buildUIState(GM);   // shared core module — bind to GM
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
    var ui = GM.UI.buildDialog(pData || freshPData(),
        pathInfo || { ok: false, reason: "no-selection" });
    return ui; // {window, gatherAll, modeUI, pathUI, zonesUI}
}
function mockPathInfo(cornerCount, closed, totalLen, extra) {
    var p = { ok: true, cornerCount: cornerCount, closed: closed, sharpCount: cornerCount, roundCount: 0,
              totalLen: totalLen || 1000, corners: [], circuit: null, pathRef: {},
              partial: { state: "none", runs: [], selectedSegs: 0, totalSegs: 4 } };
    for (var k in (extra || {})) if (extra.hasOwnProperty(k)) p[k] = extra[k];
    return p;
}
function buildUI3(pData, pathInfo, docInfo) {
    SUI.install();
    return GM.UI.buildDialog(pData || freshPData(), pathInfo || { ok: false, reason: "no-selection" }, docInfo);
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
// Edge radios are now textless (captions live in the column header), so target
// them via the exposed edgeUI API instead of by label text.
console.log("--- UI: Count/Spacing radio exclusivity (regression) ---");
(function () {
    var ui = buildUI();
    assert(ui.gatherAll().top.useNumber === true, "default top edge is count mode");

    var top = ui.edgeUI.top;
    // Choose Spacing on the top edge.
    top.spcRB.onClick();
    assert(ui.gatherAll().top.useNumber === false,
        "clicking Spacing flips top edge to spacing mode (useNumber:false)");
    assert(top.numRB.value === false, "Count radio deselected after choosing Spacing");

    // Flip back to Count.
    top.numRB.onClick();
    assert(ui.gatherAll().top.useNumber === true, "clicking Count flips back to count mode");
    assert(top.spcRB.value === false, "Spacing radio deselected after choosing Count");
    done();
})();

// ===== TEST: shape is locked to circle (no shape control) =====
console.log("--- UI: shape locked to circle ---");
(function () {
    var ui = buildUI();
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

// ===== TEST: mirror flags via gatherAll =====
// Mirror state now lives on the Mirror-group checkboxes (above the edge rows);
// gatherAll reads them into bottomMirror/rightMirror.
console.log("--- UI: mirror flags via gatherAll ---");
(function () {
    var ui = buildUI();
    var cfg = ui.gatherAll();
    // Defaults: bottom & right mirror enabled.
    assert(cfg.bottomMirror === true, "default bottomMirror true");
    assert(cfg.rightMirror === true, "default rightMirror true");
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
    // Cornered path: Count is selectable, but the value is COMPUTED from the
    // corners (read-only field) and marks land on the corners only.
    assert(ui2.pathUI.numRB.enabled === true, "count radio selectable on cornered path");
    assert(ui2.pathUI.spcRB.value === true, "spacing is the default on a cornered path");
    ui2.pathUI.numRB.onClick();
    assert(String(ui2.gatherAll().pathDist.number) === "4",
        "count on a cornered path = corner count (4)");
    assert(ui2.pathUI.numIn.enabled === false, "computed count field is read-only");
    assert(ui2.zonesUI.enableCB.enabled === false, "zones disabled when marks are corners-only");
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

// ===== TEST: validation scope follows the active placement mode =====
// Regression: live validation used to check the hidden mode's fields, greying
// out Generate with the offending field off-screen (and stricter than
// GM.Validation.validate(), which skips the inactive mode on submit).
console.log("--- UI: live validation is scoped to the active mode ---");
(function () {
    // Artboard mode: a bad value in the (hidden) path spacing must NOT block OK.
    var ui = buildUI(null, mockPathInfo(4, true));
    var w = SUI.lastWindow();
    var okBtn = w.findOne(function (c) { return c.type === "button" && c.text === GM.L.OK; });
    ui.pathUI.spcIn.text = "abc";
    ui.pathUI.spcIn.onChange();
    assert(okBtn.enabled === true, "bad hidden path field does not block OK in artboard mode");
    done();

    // Path mode: a bad value in the (hidden) edge field must NOT block OK.
    var ui2 = buildUI(null, mockPathInfo(4, true));
    var w2 = SUI.lastWindow();
    var okBtn2 = w2.findOne(function (c) { return c.type === "button" && c.text === GM.L.OK; });
    ui2.modeUI.pathRB.value = true; ui2.modeUI.pathRB.onClick();
    ui2.edgeUI.top.numIn.text = "abc";
    ui2.edgeUI.top.numIn.onChange();
    assert(okBtn2.enabled === true, "bad hidden edge field does not block OK in path mode");
    done();
})();

// ===== TEST: corner zones report their EFFECTIVE state =====
// Regression: a checked-but-disabled zone box reported enabled:true, so
// validate() checked count/pitch that live validation had skipped.
console.log("--- UI: cornerZone.enabled reflects availability ---");
(function () {
    var ui = buildUI(null, mockPathInfo(0, true));   // smooth path -> zones impossible
    ui.modeUI.pathRB.value = true; ui.modeUI.pathRB.onClick();
    ui.zonesUI.enableCB.value = true;                // stale value from a preset
    assert(ui.zonesUI.enableCB.enabled === false, "zones disabled on a smooth path");
    assert(ui.gatherAll().cornerZone.enabled === false,
        "gather reports zones off when the control is unavailable");
    done();
})();

// ===== TEST: corner zones switch edges to Spacing (review G3) =====
// With zones on, the core fills zoned edges by spacing and ignores the count;
// the dialog used to keep showing Count with Spacing greyed out.
console.log("--- UI: corner zones switch edges to Spacing (G3) ---");
(function () {
    var ui = buildUI();
    var top = ui.edgeUI.top;
    assert(ui.gatherAll().top.useNumber === true, "precheck: default top edge in count mode");
    ui.zonesUI.enableCB.value = true; ui.zonesUI.enableCB.onClick();
    var g = ui.gatherAll();
    assert(g.top.useNumber === false && g.left.useNumber === false, "zones on: edges report spacing mode");
    assert(top.numRB.enabled === false, "zones on: Count radio disabled");
    assert(top.spcRB.value === true && top.spcIn.enabled === true, "zones on: Spacing selected and editable");
    ui.zonesUI.enableCB.value = false; ui.zonesUI.enableCB.onClick();
    assert(ui.gatherAll().top.useNumber === true, "zones off: Count choice restored");
    assert(top.numRB.enabled === true && top.numIn.enabled === true, "zones off: Count editable again");
    done();

    // A stored preset with zones on and Count edges opens in Spacing.
    var p = freshPData();
    p.presets["[Default]"].cornerZone = { enabled: true, count: 3, pitch: 50 };
    var ui2 = buildUI(p);
    assert(ui2.gatherAll().top.useNumber === false, "preset with zones: edges open in spacing mode");
    done();

    // An edge the user set to Spacing stays in Spacing when zones go off.
    var ui3 = buildUI();
    ui3.edgeUI.left.spcRB.value = true; ui3.edgeUI.left.spcRB.onClick();
    ui3.zonesUI.enableCB.value = true; ui3.zonesUI.enableCB.onClick();
    ui3.zonesUI.enableCB.value = false; ui3.zonesUI.enableCB.onClick();
    var g3 = ui3.gatherAll();
    assert(g3.left.useNumber === false && g3.top.useNumber === true,
        "zones off: only edges switched by zones return to Count");
    done();
})();

// ===== TEST: tooltips of greyed-out controls name the actual reason (audit A3, A4) =====
console.log("--- UI: tooltips of greyed-out controls match the reason (audit A3, A4) ---");
(function () {
    // Zones greyed because Count on a cornered path puts marks on the corners only.
    var ui = buildUI(null, mockPathInfo(4, true));
    ui.modeUI.pathRB.value = true; ui.modeUI.pathRB.onClick();
    ui.pathUI.numRB.value = true; ui.pathUI.numRB.onClick();
    assert(ui.zonesUI.enableCB.enabled === false, "precheck: zones greyed with Count on a cornered path");
    assert(ui.zonesUI.enableCB.helpTip === GM.L.TIP_ZONES_CORNERS_ONLY,
        "cornered path + Count: zones tooltip explains corners-only, not 'no corners'");
    done();

    // Zones greyed because the path has no corners.
    var ui2 = buildUI(null, mockPathInfo(0, true));
    ui2.modeUI.pathRB.value = true; ui2.modeUI.pathRB.onClick();
    assert(ui2.zonesUI.enableCB.helpTip === GM.L.TIP_ZONES_NO_CORNERS, "smooth path: 'no corners' tooltip");
    done();

    // Count greyed by corner zones gets its own tooltip, and gets the old one back.
    var ui3 = buildUI();
    ui3.zonesUI.enableCB.value = true; ui3.zonesUI.enableCB.onClick();
    assert(ui3.edgeUI.top.numRB.helpTip === GM.L.TIP_COUNT_ZONES, "zones on: Count tooltip explains why");
    ui3.zonesUI.enableCB.value = false; ui3.zonesUI.enableCB.onClick();
    assert(ui3.edgeUI.top.numRB.helpTip === GM.L.TIP_COUNT, "zones off: Count tooltip back to normal");
    done();
})();

// ===== TEST: a typo turns the field invalid instead of being read as a prefix (audit A9) =====
console.log("--- UI: typos in number fields block Generate (audit A9) ---");
(function () {
    var ui = buildUI();
    var w = SUI.lastWindow();
    var okBtn = w.findOne(function (c) { return c.type === "button" && c.text === GM.L.OK; });
    var top = ui.edgeUI.top;
    top.spcRB.value = true; top.spcRB.onClick();
    top.spcIn.text = "1O5"; top.spcIn.onChange();
    assert(okBtn.enabled === false, "'1O5' in Spacing blocks Generate");
    assert(isNaN(ui.gatherAll().top.spacing), "'1O5' gathers as NaN, not 1");
    top.spcIn.text = "1 000"; top.spcIn.onChange();
    assert(okBtn.enabled === false, "'1 000' in Spacing blocks Generate");
    top.spcIn.text = "12,5"; top.spcIn.onChange();
    assert(okBtn.enabled === true && ui.gatherAll().top.spacing === 12.5, "'12,5' is valid and read as 12.5");
    done();
})();

// ===== TEST: disabled "Selected path" says why (audit A5) =====
console.log("--- UI: disabled 'Selected path' names the reason (audit A5) ---");
(function () {
    var cases = [
        ["no-selection", GM.L.ERR_PATH_NO_SELECTION],
        ["not-a-path",   GM.L.ERR_PATH_NOT_A_PATH],
        ["too-short",    GM.L.ERR_PATH_TOO_SHORT]
    ];
    for (var i = 0; i < cases.length; i++) {
        var ui = buildUI(null, { ok: false, reason: cases[i][0] });
        assert(ui.modeUI.pathRB.enabled === false, cases[i][0] + ": radio disabled");
        assert(!!cases[i][1] && ui.modeUI.pathRB.helpTip === cases[i][1],
            cases[i][0] + ": tooltip names the reason (got '" + ui.modeUI.pathRB.helpTip + "')");
        done();
    }
})();

// ===== TEST: Czech plural forms =====
console.log("--- Locale: Czech plural forms ---");
(function () {
    assert(GM.L.count("INFO_CORNERS", 1) === "1 roh", "1 roh");
    assert(GM.L.count("INFO_CORNERS", 3) === "3 rohy", "3 rohy");
    assert(GM.L.count("INFO_CORNERS", 5) === "5 rohů", "5 rohů");
    assert(GM.L.count("INFO_ROUND", 4) === "4 zaoblené rohy", "4 zaoblené rohy");
    assert(GM.L.count("INFO_CORNERS", 11) === "11 rohů", "11 rohů");
    assert(GM.L.count("INFO_CORNERS", 12) === "12 rohů", "12 rohů");
    assert(GM.L.count("INFO_CORNERS", 0) === "0 rohů", "0 rohů");
})();

// ===== TEST: summary line under Placement (spec §8.1) =====
console.log("--- UI 1.3: summary line (spec §8.1) ---");
(function () {
    var ui = buildUI3(null, null, { artboards: 1, width: 1000 * 2.834645669291339, height: 500 * 2.834645669291339, scale: 1 });
    assert(ui.modeUI.infoLbl.text === "1 artboard · 1000 × 500 mm", "one artboard (got '" + ui.modeUI.infoLbl.text + "')");
    done();
    var ui2 = buildUI3(null, null, { artboards: 3, width: 1, height: 1, scale: 1 });
    assert(ui2.modeUI.infoLbl.text === "3 artboardy · značky dostanou všechny", "three artboards");
    done();

    var p = freshPData();
    p.presets["[Default]"].placementMode = "path";
    var ui3 = buildUI3(p, null, { artboards: 1, width: 100, height: 100, scale: 1 });
    assert(ui3.modeUI.infoLbl.text === GM.L.INFO_FALLBACK, "preset wants a path, none selected: said so");
    ui3.modeUI.artboardRB.value = true; ui3.modeUI.artboardRB.onClick();
    assert(ui3.modeUI.infoLbl.text.indexOf("1 artboard") === 0, "choosing the artboard clears the notice");
    done();

    var ui4 = buildUI3(null, mockPathInfo(5, true), null);
    ui4.modeUI.pathRB.value = true; ui4.modeUI.pathRB.onClick();
    assert(ui4.modeUI.infoLbl.text === "Uzavřená cesta · 5 rohů · značky leží na cestě", "house, offset 0 (got '" + ui4.modeUI.infoLbl.text + "')");
    ui4.pathUI.offsetIn.text = "20"; ui4.pathUI.offsetIn.onChanging();
    assert(ui4.modeUI.infoLbl.text === "Uzavřená cesta · 5 rohů", "offset 20: no 'on the path'");
    done();

    var ui5 = buildUI3(null, mockPathInfo(0, true), null);
    ui5.modeUI.pathRB.value = true; ui5.modeUI.pathRB.onClick();
    ui5.pathUI.offsetIn.text = "20"; ui5.pathUI.offsetIn.onChanging();
    assert(ui5.modeUI.infoLbl.text === "Uzavřená cesta · bez rohů · první značka nahoře", "circle");
    done();

    var ui6 = buildUI3(null, mockPathInfo(5, true, 1000, { sharpCount: 3, roundCount: 2 }), null);
    ui6.modeUI.pathRB.value = true; ui6.modeUI.pathRB.onClick();
    ui6.pathUI.offsetIn.text = "20"; ui6.pathUI.offsetIn.onChanging();
    assert(ui6.modeUI.infoLbl.text === "Uzavřená cesta · 3 rohy, 2 zaoblené", "mixed corners");
    done();
})();

// ===== TEST: path offset field and part of the outline (spec §8.2) =====
console.log("--- UI 1.3: path offset and part of the outline (spec §8.2) ---");
(function () {
    var ui = buildUI3(null, mockPathInfo(3, false), null);
    assert(ui.pathUI.offsetIn.enabled === false && ui.pathUI.offsetIn.helpTip === GM.L.TIP_PATH_OFFSET_OPEN, "open path: offset greyed, says why");
    done();

    var pd = freshPData();
    pd.presets["[Default]"].pathOffset = 15;
    var ui2 = buildUI3(pd, mockPathInfo(4, true), null);
    assert(String(ui2.pathUI.offsetIn.text) === "15" && ui2.pathUI.offsetIn.enabled === true, "offset from the preset");
    ui2.modeUI.pathRB.value = true; ui2.modeUI.pathRB.onClick();
    assert(String(ui2.gatherAll().pathOffset) === "15", "gathered");
    assert(!("pathPartial" in ui2.gatherAll()), "part of the outline is not part of the settings");
    ui2.pathUI.offsetIn.text = "abc"; ui2.pathUI.offsetIn.onChanging();
    var ok = SUI.lastWindow().findOne(function (c) { return c.type === "button" && c.text === GM.L.OK; });
    assert(ok.enabled === false, "invalid offset blocks Generate");
    done();

    var runs = mockPathInfo(10, true, 1000, { partial: { state: "runs", runs: [{ from: 0, len: 1, segs: 11 }], selectedSegs: 11, totalSegs: 20 } });
    var ui3 = buildUI3(null, runs, null);
    ui3.modeUI.pathRB.value = true; ui3.modeUI.pathRB.onClick();
    assert(ui3.pathUI.partialCB.enabled === true && ui3.pathUI.partialCB.value === false, "partial: offered, off by default");
    assert(ui3.pathUI.partialCB.text === "Jen vybraná část obvodu (11 z 20 úseků)", "label says how much");
    assert(ui3.getRunOptions().pathPartial === false, "not ticked: whole outline");
    ui3.pathUI.partialCB.value = true; ui3.pathUI.partialCB.onClick();
    assert(ui3.getRunOptions().pathPartial === true, "ticked: part");
    done();

    var lone = mockPathInfo(4, true, 1000, { partial: { state: "lone", runs: [], selectedSegs: 0, totalSegs: 4 } });
    var ui4 = buildUI3(null, lone, null);
    assert(ui4.pathUI.partialCB.enabled === false && ui4.pathUI.partialCB.helpTip === GM.L.TIP_PARTIAL_LONE, "lone anchor: greyed, own tip");
    done();
    var ui5 = buildUI3(null, mockPathInfo(4, true), null);
    assert(ui5.pathUI.partialCB.helpTip === GM.L.TIP_PARTIAL_NONE, "no direct selection: how to make one");
    done();

    var ui6 = buildUI3(null, mockPathInfo(4, true), null);
    ui6.pathUI.offsetIn.text = "20";
    var ddl = SUI.lastWindow().findOne(function (c) { return c.type === "dropdownlist" && c.items.length === 3; });
    ddl.selection = ddl.items[1]; ddl.onChange();
    assert(String(ui6.pathUI.offsetIn.text) === "2", "mm -> cm converts the path offset (got " + ui6.pathUI.offsetIn.text + ")");
    done();
})();

// ===== TEST: the path offset is a preset change; an invalid one is not "on the path" =====
console.log("--- UI 1.3: path offset enables Save, invalid offset in the summary ---");
(function () {
    var pd = freshPData();
    pd.presets["[Default]"].placementMode = "path";   // opens in path mode, nothing else differs
    var ui = buildUI3(pd, mockPathInfo(4, true), null);
    var save = SUI.lastWindow().findOne(function (c) { return c.type === "button" && c.text === GM.L.SAVE; });
    assert(ui.modeUI.pathRB.value === true, "precheck: dialog opened in path mode");
    assert(save.enabled === false, "unchanged dialog: Save disabled");
    ui.pathUI.offsetIn.text = "20"; ui.pathUI.offsetIn.onChanging();
    assert(save.enabled === true, "changing only the path offset enables Save");
    ui.pathUI.offsetIn.text = "0"; ui.pathUI.offsetIn.onChanging();
    assert(save.enabled === false, "back to the preset value: Save disabled again");
    done();

    var ui2 = buildUI3(null, mockPathInfo(4, true), null);
    ui2.modeUI.pathRB.value = true; ui2.modeUI.pathRB.onClick();
    ui2.pathUI.offsetIn.text = "abc"; ui2.pathUI.offsetIn.onChanging();
    assert(ui2.modeUI.infoLbl.text === "Uzavřená cesta · 4 rohy",
        "invalid offset: no 'on the path' clause (got '" + ui2.modeUI.infoLbl.text + "')");
    ui2.pathUI.offsetIn.text = ""; ui2.pathUI.offsetIn.onChanging();
    assert(ui2.modeUI.infoLbl.text === "Uzavřená cesta · 4 rohy", "empty offset: no clause either");
    ui2.pathUI.offsetIn.text = "0"; ui2.pathUI.offsetIn.onChanging();
    assert(ui2.modeUI.infoLbl.text === "Uzavřená cesta · 4 rohy · značky leží na cestě", "offset 0: the clause is there");
    done();
})();

// ===== TEST: both locales define the same keys =====
console.log("--- Locale: CS and EN key sets are identical ---");
(function () {
    function keysFor(locale) {
        var saved = global.app.locale, NSx = {};
        global.app.locale = locale;
        var fn = new Function("GM", src("locale.js") + "\nreturn GM.L;");
        var table = fn(NSx);
        global.app.locale = saved;
        var keys = [];
        for (var k in table) if (table.hasOwnProperty(k) && k !== "format") keys.push(k);
        return keys.sort();
    }
    var cs = keysFor("cs_CZ"), en = keysFor("en_US");
    var onlyCs = cs.filter(function (k) { return en.indexOf(k) < 0; });
    var onlyEn = en.filter(function (k) { return cs.indexOf(k) < 0; });
    assert(onlyCs.length === 0 && onlyEn.length === 0,
        "same keys (only CS: " + onlyCs.join(",") + "; only EN: " + onlyEn.join(",") + ")");
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
