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
require("./lib/load_shared.js")(GM, ["numbers", "field_paint"]);   // shared: GM.Numbers, GM.FieldPaint
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
    assert(GM.CONSTANTS.SCRIPT_NAME === "Grommet Marks", "the tool's name is 'Grommet Marks' (no 'Illustrator' in front)");
    assert(w.text === "Grommet Marks v" + GM.CONSTANTS.VERSION,
        "title is '<name> v<version>' (canon 12.7), got '" + w.text + "'");
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

    // the first "7": Offset X (the scale field now stands above, with "1")
    var offX = w.findOne(function (c) { return c.type === "edittext" && c.text === "7"; });
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

// ===== TEST: an invalid field is painted red, its own pen comes back (spec 6.2) =====
// The behaviour of the removed private paintField, now the shared
// GM.FieldPaint.field: forcing black would hide the text on the dark UI.
console.log("--- UI: invalid field turns red, valid gives its own pen back (spec 6.2) ---");
(function () {
    function isErr(pen) {
        var c = pen && pen.color;
        return !!c && c[0] === GM.FieldPaint.COLORS.ERR[0] && c[1] === GM.FieldPaint.COLORS.ERR[1] &&
            c[2] === GM.FieldPaint.COLORS.ERR[2];
    }
    var ui = buildUI(null, mockPathInfo(4, true));
    var top = ui.edgeUI.top;
    top.spcRB.value = true; top.spcRB.onClick();
    var g = top.spcIn.graphics;
    assert(g.foregroundColor === g.ownPen, "a valid field shows its own pen");
    top.spcIn.text = "1O5"; top.spcIn.onChange();
    assert(isErr(g.foregroundColor), "'1O5' paints the field in the family red");
    top.spcIn.text = "12,5"; top.spcIn.onChange();
    assert(g.foregroundColor === g.ownPen, "'12,5' gives the field its own pen back, not black");
    top.spcIn.text = "abc"; top.spcIn.onChange();
    top.spcIn.text = "13"; top.spcIn.onChange();
    assert(g.foregroundColor === g.ownPen, "and again after a second round");

    // A wrong value in the hidden mode's field is not painted: it does not count.
    var hid = ui.pathUI.spcIn.graphics;
    ui.pathUI.spcIn.text = "abc"; ui.pathUI.spcIn.onChange();
    assert(hid.foregroundColor === hid.ownPen, "a bad field of the hidden mode stays in its own pen");

    // Switching the mode paints the field that was hidden and wrong, and
    // gives the pen back to the one that was red and is now hidden.
    top.spcIn.text = "abc"; top.spcIn.onChange();
    assert(isErr(g.foregroundColor), "precheck: the edge field is red while its mode is active");
    ui.modeUI.pathRB.value = true; ui.modeUI.pathRB.onClick();
    assert(isErr(hid.foregroundColor), "the bad field is red once its mode is active");
    assert(g.foregroundColor === g.ownPen, "and the edge field, now hidden, is back in its own pen");
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
    assert(ui2.modeUI.infoLbl.text.indexOf("Odsazení od kraje") > 0 && ui2.modeUI.infoLbl.text.indexOf("on the path") < 0 &&
        ui2.modeUI.infoLbl.text.indexOf("leží na cestě") < 0,
        "invalid offset: the line gives the reason, no 'on the path' clause (got '" + ui2.modeUI.infoLbl.text + "')");
    ui2.pathUI.offsetIn.text = ""; ui2.pathUI.offsetIn.onChanging();
    assert(ui2.modeUI.infoLbl.text.indexOf("Odsazení od kraje") > 0, "empty offset: the reason as well");
    ui2.pathUI.offsetIn.text = "0"; ui2.pathUI.offsetIn.onChanging();
    assert(ui2.modeUI.infoLbl.text === "Uzavřená cesta · 4 rohy · značky leží na cestě", "offset 0: the clause is there");
    done();
})();

// ===== TEST: part of the outline takes Count away from the path row (final review I1) =====
// A run is marked like an open path: in count mode it would get only its ends and
// inner corners (spec §5.3), so an editable count (or the whole outline's corner
// count) would promise marks that never appear. While the box is ticked the row
// is Spacing, like corner zones do to the edges (G3).
console.log("--- UI 1.3: part of the outline switches the path row to Spacing (final review I1) ---");
(function () {
    var runs = { state: "runs", runs: [{ from: 0, len: 1, segs: 2 }], selectedSegs: 2, totalSegs: 4 };
    function openIn(corners, over) {
        var ui = buildUI3(over || null, mockPathInfo(corners, true, 1000, { partial: runs }), null);
        ui.modeUI.pathRB.value = true; ui.modeUI.pathRB.onClick();
        return ui;
    }
    function tick(ui, on) { ui.pathUI.partialCB.value = on; ui.pathUI.partialCB.onClick(); }
    assert(typeof GM.L.TIP_PATH_COUNT_PARTIAL === "string" && GM.L.TIP_PATH_COUNT_PARTIAL.length > 0,
        "locale has TIP_PATH_COUNT_PARTIAL");

    // Smooth path, Count 5 chosen
    var ui = openIn(0);
    var P = ui.pathUI;
    P.numRB.onClick(); P.numIn.text = "5"; P.numIn.onChanging();
    assert(ui.gatherAll().pathDist.useNumber === true && P.numIn.enabled === true, "precheck: Count 5, editable");
    tick(ui, true);
    assert(P.numRB.enabled === false, "ticked: Count radio disabled");
    assert(P.spcRB.value === true && P.numRB.value === false, "ticked: Spacing selected");
    assert(P.spcIn.enabled === true && P.numIn.enabled === false, "ticked: Spacing editable, count field not");
    assert(ui.gatherAll().pathDist.useNumber === false, "ticked: gatherAll reports spacing mode");
    assert(ui.getRunOptions().pathPartial === true, "ticked: the run is partial");
    assert(P.numRB.helpTip === GM.L.TIP_PATH_COUNT_PARTIAL && P.numIn.helpTip === GM.L.TIP_PATH_COUNT_PARTIAL,
        "ticked: Count tooltips say why");
    tick(ui, false);
    assert(P.numRB.enabled === true && P.numRB.value === true && P.spcRB.value === false, "unticked: Count radio is back");
    assert(P.numIn.enabled === true && P.spcIn.enabled === false, "unticked: Count field editable again");
    assert(ui.gatherAll().pathDist.useNumber === true && String(ui.gatherAll().pathDist.number) === "5",
        "unticked: Count 5 comes back in gatherAll");
    assert(P.numRB.helpTip === GM.L.TIP_COUNT && P.numIn.helpTip === GM.L.TIP_COUNT, "unticked: tooltips back to normal");
    done();

    // A Spacing choice of the user's own stays Spacing
    var uiS = openIn(0);
    uiS.pathUI.spcRB.onClick();
    tick(uiS, true); tick(uiS, false);
    assert(uiS.gatherAll().pathDist.useNumber === false && uiS.pathUI.numRB.enabled === true,
        "own Spacing choice: still Spacing after unticking, Count selectable");
    done();

    // Cornered path: read-only corner count gives way, zones become possible, then all comes back
    var uiC = openIn(4);
    var C = uiC.pathUI;
    C.numRB.onClick();
    assert(String(uiC.gatherAll().pathDist.number) === "4" && C.numIn.enabled === false && uiC.zonesUI.enableCB.enabled === false,
        "precheck: cornered path, Count = corner count, zones off");
    tick(uiC, true);
    assert(C.numRB.enabled === false && uiC.gatherAll().pathDist.useNumber === false, "cornered, ticked: Spacing");
    assert(uiC.zonesUI.enableCB.enabled === true, "cornered, ticked: zones possible again (spacing)");
    tick(uiC, false);
    assert(uiC.gatherAll().pathDist.useNumber === true && String(uiC.gatherAll().pathDist.number) === "4" && C.numIn.enabled === false,
        "cornered, unticked: Count = corner count again, read-only");
    assert(uiC.zonesUI.enableCB.enabled === false && C.numRB.helpTip === GM.L.TIP_PATH_COUNT_DISABLED,
        "cornered, unticked: zones off again, original Count tooltip");
    done();

    // Live validation: a bad Count field does not block Generate while Count is not used
    var uiV = openIn(0);
    var okV = SUI.lastWindow().findOne(function (c) { return c.type === "button" && c.text === GM.L.OK; });
    uiV.pathUI.numRB.onClick(); uiV.pathUI.numIn.text = "abc"; uiV.pathUI.numIn.onChanging();
    assert(okV.enabled === false, "precheck: bad count blocks Generate");
    tick(uiV, true);
    assert(okV.enabled === true && GM.Validation.validate(uiV.gatherAll(), GM.L).valid === true,
        "ticked: bad (unused) count no longer blocks, validate() agrees");
    tick(uiV, false);
    assert(okV.enabled === false, "unticked: bad count blocks again");
    done();

    // Loading a preset (revert) while ticked keeps the row on Spacing
    var pd = freshPData();
    pd.presets["[Default]"].placementMode = "path";
    pd.presets["[Default]"].pathDist = { useNumber: true, number: 7, spacing: 100 };
    var uiR = openIn(0, pd);
    var R2 = uiR.pathUI;
    assert(R2.numRB.value === true, "precheck: preset opens in Count");
    tick(uiR, true);
    var revert = SUI.lastWindow().findOne(function (c) { return c.type === "button" && c.text === "↺"; });
    assert(revert.enabled === true, "precheck: the forced Spacing is a change from the preset");
    revert.onClick();
    assert(R2.numRB.enabled === false && R2.spcRB.value === true && R2.numRB.value === false,
        "revert while ticked: still Spacing, Count disabled");
    tick(uiR, false);
    assert(R2.numRB.value === true && String(uiR.gatherAll().pathDist.number) === "7", "then unticked: the preset's Count 7");
    done();

    // The box only counts in path mode: artboard mode gives Count back, path mode takes it again
    var uiM = openIn(0);
    uiM.pathUI.numRB.onClick();
    tick(uiM, true);
    uiM.modeUI.artboardRB.value = true; uiM.modeUI.artboardRB.onClick();
    assert(uiM.gatherAll().pathDist.useNumber === true && uiM.pathUI.numRB.enabled === true,
        "artboard mode: the user's own Count choice is gathered (the box does not apply there)");
    assert(uiM.getRunOptions().pathPartial === false, "artboard mode: not a partial run");
    uiM.modeUI.pathRB.value = true; uiM.modeUI.pathRB.onClick();
    assert(uiM.gatherAll().pathDist.useNumber === false && uiM.pathUI.numRB.enabled === false,
        "back in path mode with the box still ticked: Spacing again");
    done();
})();

// ===== TEST: a broken stored path offset opens as the default (final review I2) =====
// NaN becomes null through JSON. The field then read "" and, on an OPEN path
// where it is greyed out, Generate alerted about a field nobody could edit.
console.log("--- UI 1.3: a broken stored path offset opens as 0 (final review I2) ---");
(function () {
    var alerts = [];
    global.alert = function (m) { alerts.push(String(m)); };
    var bad = [null, NaN, "abc", Infinity];
    for (var i = 0; i < bad.length; i++) {
        var label = "stored " + String(bad[i]);
        var pd = freshPData();
        pd.presets["[Default]"].placementMode = "path";
        pd.presets["[Default]"].pathOffset = bad[i];

        var ui = buildUI3(pd, mockPathInfo(3, false), null);       // open path: the field is greyed
        var ok = SUI.lastWindow().findOne(function (c) { return c.type === "button" && c.text === GM.L.OK; });
        assert(ui.modeUI.pathRB.value === true, label + ": precheck, path mode");
        assert(String(ui.pathUI.offsetIn.text) === "0" && ui.pathUI.offsetIn.enabled === false,
            label + ": open path, greyed field shows 0 (got '" + ui.pathUI.offsetIn.text + "')");
        assert(ok.enabled === true, label + ": open path, Generate enabled");
        assert(ui.gatherAll().pathOffset === 0, label + ": gatherAll().pathOffset is 0");
        alerts = [];
        assert(GM.Validation.validate(ui.gatherAll(), GM.L).valid === true && alerts.length === 0,
            label + ": validate() passes without an alert (" + alerts.join(" | ") + ")");
        done();

        var ui2 = buildUI3(pd, mockPathInfo(4, true), null);        // closed path: editable field
        var ok2 = SUI.lastWindow().findOne(function (c) { return c.type === "button" && c.text === GM.L.OK; });
        assert(String(ui2.pathUI.offsetIn.text) === "0" && ui2.pathUI.offsetIn.enabled === true && ok2.enabled === true,
            label + ": closed path, field shows 0, editable, Generate enabled");
        done();
    }
    // A good stored number is untouched
    var pg = freshPData();
    pg.presets["[Default]"].pathOffset = 12.5;
    var uiG = buildUI3(pg, mockPathInfo(4, true), null);
    assert(String(uiG.pathUI.offsetIn.text) === "12,5",
        "a good stored offset is shown with the Czech decimal comma (got '" + uiG.pathUI.offsetIn.text + "')");
    done();
    delete global.alert;
})();

// ===== TEST: a decimal comma stays a comma (spec 6.1, review focus 1) =====
// Numbers go into the fields with the locale's separator and without rounding,
// and the dialog does not take a preset it just wrote for a changed one.
console.log("--- UI 1.4: a decimal comma stays a comma (spec 6.1) ---");
(function () {
    var pd = freshPData();
    var s = pd.presets["[Default]"];
    s.markSize = 2.5;
    s.cornerZone = { enabled: false, count: 5, pitch: 12.5 };
    s.offsetX = 7.25; s.regWeight = 0.75;
    s.top = { enabled: true, useNumber: false, number: 10, spacing: 105.5 };
    var ui = buildUI3(pd, null, null);
    var w = SUI.lastWindow();
    function field(text) { return w.findOne(function (c) { return c.type === "edittext" && c.text === text; }); }
    var sizeField = field("2,5");
    assert(GM.L.DEC_SEP === ",", "the Czech table carries DEC_SEP ','");
    assert(GM.L.DECIMAL_SEP === undefined, "the old key DECIMAL_SEP is gone");
    assert(!!sizeField, "markSize 2.5 opens as '2,5'");
    if (!sizeField) { done(); return; }
    assert(String(ui.zonesUI.pitchIn.text) === "12,5", "zone pitch 12.5 opens as '12,5' (got '" + ui.zonesUI.pitchIn.text + "')");
    assert(!!field("7,25"), "offsetX 7.25 opens as '7,25' (no rounding)");
    assert(!!field("0,75"), "regWeight 0.75 opens as '0,75'");
    assert(String(ui.edgeUI.top.spcIn.text) === "105,5", "top spacing 105.5 opens as '105,5'");
    assert(String(ui.edgeUI.top.numIn.text) === "10", "a whole number has no separator");

    var cfg = ui.gatherAll();
    assert(cfg.markSize === 2.5 && cfg.cornerZone.pitch === 12.5 && cfg.top.spacing === 105.5,
        "gatherAll reads the commas back as the same numbers");
    var list = w.findOne(function (c) { return c.type === "dropdownlist" && c.items.length === 1; });
    var save = w.findOne(function (c) { return c.type === "button" && c.text === GM.L.SAVE; });
    assert(!!list && list.items[0].text.indexOf(" *") < 0,
        "the preset list shows no '*' for a freshly opened preset (got '" + (list && list.items[0].text) + "')");
    assert(save.enabled === false, "...and Save is off");

    // Typing a dot where the preset holds a comma is the same value, not a change
    sizeField.text = "2.5"; sizeField.onChange();
    assert(list.items[0].text.indexOf(" *") < 0 && save.enabled === false, "'2.5' typed over '2,5' is no change");
    sizeField.text = "2,5";

    // mm -> cm: written back with the comma, unrounded
    var units = w.findOne(function (c) { return c.type === "dropdownlist" && c.items.length === 3; });
    units.selection = units.items[1]; units.onChange();
    assert(sizeField.text === "0,25", "2,5 mm -> cm writes '0,25' (got '" + sizeField.text + "')");
    assert(String(ui.zonesUI.pitchIn.text) === "1,25", "12,5 mm -> cm writes '1,25' (got '" + ui.zonesUI.pitchIn.text + "')");
    assert(ui.gatherAll().markSize === 0.25, "...and it reads back as 0.25");
    done();
})();

// ===== TESTS: presets behave like the family (spec 6.4, 7; canon 9, 12.4) =====
// Three presets, "A" active; markSize 4 and 6 are the only values that differ from
// the defaults, so the field that holds them is found by its text.
function presetPData(active) {
    var p = freshPData();
    var a = GM.Config.getDefaults(); a.markSize = 4;
    var b = GM.Config.getDefaults(); b.markSize = 6;
    p.presets["A"] = a; p.presets["B"] = b;
    p.activePreset = active || "A";
    return p;
}
function winBtn(w, text) { return w.findOne(function (c) { return c.type === "button" && c.text === text; }); }
function presetList(w) { return w.findOne(function (c) { return c.type === "dropdownlist" && c.helpTip === GM.L.TIP_PRESET_LOAD; }); }
function listTexts(list) { var t = []; for (var i = 0; i < list.items.length; i++) t.push(list.items[i].text); return t; }
function textField(w, text) { return w.findOne(function (c) { return c.type === "edittext" && c.text === text; }); }
function isRedPen(pen) {
    var c = pen && pen.color;
    return !!c && c[0] === GM.FieldPaint.COLORS.ERR[0] && c[1] === GM.FieldPaint.COLORS.ERR[1] && c[2] === GM.FieldPaint.COLORS.ERR[2];
}
// Writes go to a list instead of the disk; prompt/confirm answer what the test says.
function withStubs(answers, fn) {
    var saved = [], origSave = GM.Storage.save;
    GM.Storage.save = function (d) { saved.push(JSON.stringify(d)); return true; };
    global.prompt = function () { return answers.prompt === undefined ? null : answers.prompt; };
    global.confirm = function () { return answers.confirm !== false; };
    global.alert = function () {};
    try { fn(saved); }
    finally { GM.Storage.save = origSave; delete global.prompt; delete global.confirm; delete global.alert; }
}

console.log("--- UI 1.4 presets: the star is on the active preset only, every item is relabelled (P5) ---");
(function () {
    var pd = presetPData("A");
    buildUI3(pd, null, null);
    var w = SUI.lastWindow();
    var list = presetList(w);
    assert(listTexts(list).join("|") === "[Výchozí]|A|B", "precheck: the list is [Výchozí], A, B (got " + listTexts(list).join("|") + ")");

    var f = textField(w, "4");
    f.text = "4,5"; f.onChange();
    assert(listTexts(list).join("|") === "[Výchozí]|A *|B", "an edited A is 'A *' (got " + listTexts(list).join("|") + ")");

    list.selection = list.items[2]; list.onChange();
    assert(pd.activePreset === "B", "precheck: B is active now");
    assert(listTexts(list).join("|") === "[Výchozí]|A|B",
        "switching to B takes the star off A and B has none (got " + listTexts(list).join("|") + ")");

    var g = textField(w, "6");
    g.text = "7"; g.onChange();
    assert(listTexts(list).join("|") === "[Výchozí]|A|B *", "an edited B is 'B *' (got " + listTexts(list).join("|") + ")");
    list.selection = list.items[0]; list.onChange();
    assert(listTexts(list).join("|") === "[Výchozí]|A|B", "and on to [Výchozí]: no star anywhere (got " + listTexts(list).join("|") + ")");
    done();
})();

console.log("--- UI 1.4 presets: Save and Save As stay grey while a checked field is invalid ---");
(function () {
    withStubs({}, function (saved) {
        var pd = presetPData("A");
        buildUI3(pd, null, null);
        var w = SUI.lastWindow();
        var list = presetList(w);
        var save = winBtn(w, GM.L.SAVE), saveAs = winBtn(w, GM.L.BTN_SAVE_AS), revert = winBtn(w, "↺");
        assert(save.enabled === false && revert.enabled === false && saveAs.enabled === true,
            "a freshly opened preset: Save and ↺ off, Save As on");

        var f = textField(w, "4");
        f.text = "abc"; f.onChange();
        assert(save.enabled === false, "'abc' in a visible field: Save is grey");
        assert(saveAs.enabled === false, "'abc' in a visible field: Save As is grey");
        assert(revert.enabled === true, "...and ↺ is lit, there is something to take back");
        assert(listTexts(list)[1] === "A *", "...and the list says A is changed");

        f.text = "4,5"; f.onChange();
        assert(save.enabled === true && saveAs.enabled === true && revert.enabled === true, "fixed to 4,5: Save, Save As and ↺ are on");

        save.onClick();
        assert(pd.presets["A"].markSize === 4.5, "Save stored the number 4.5 (got " + pd.presets["A"].markSize + ")");
        assert(saved.length === 1, "...and wrote the file once (" + saved.length + ")");
        assert(save.enabled === false, "after Save: Save is grey");
        assert(revert.enabled === false, "after Save: ↺ is grey");
        assert(saveAs.enabled === true, "after Save: Save As is on");
        assert(listTexts(list).join("|") === "[Výchozí]|A|B", "after Save: no star (got " + listTexts(list).join("|") + ")");

        // Typo in a field that is greyed (a disabled edge) does not count
        var ui = buildUI3(presetPData("A"), null, null);
        var w2 = SUI.lastWindow();
        var save2 = winBtn(w2, GM.L.SAVE), saveAs2 = winBtn(w2, GM.L.BTN_SAVE_AS);
        ui.edgeUI.bottom.numIn.text = "abc"; ui.edgeUI.bottom.numIn.onChange();
        assert(saveAs2.enabled === true, "a typo in the mirrored bottom edge (not checked) leaves Save As on");
        assert(save2.enabled === false, "...and Save stays grey (nothing the preset would change)");
        done();
    });
})();

console.log("--- UI 1.4 presets: only the numbers gate Save; Generate has the structure too (ruling R1) ---");
(function () {
    withStubs({}, function () {
        var ui = buildUI3(presetPData("A"), null, null);
        var w = SUI.lastWindow();
        var ok = winBtn(w, GM.L.OK), save = winBtn(w, GM.L.SAVE), saveAs = winBtn(w, GM.L.BTN_SAVE_AS);
        assert(ok.enabled === true, "precheck: Generate is on");

        // No edge at all: Generate is off, the numbers are fine
        ui.edgeUI.top.cb.value = false; ui.edgeUI.top.cb.onClick();
        ui.edgeUI.left.cb.value = false; ui.edgeUI.left.cb.onClick();
        assert(ok.enabled === false, "no edge: Generate is grey");
        assert(saveAs.enabled === true, "no edge: Save As is on");
        assert(save.enabled === true, "no edge, changed: Save is on");

        // No shape: the same
        ui.edgeUI.top.cb.value = true; ui.edgeUI.top.cb.onClick();
        var circle = w.findOne(function (c) { return c.type === "checkbox" && c.text === GM.L.MARK_CIRCLE; });
        circle.value = false; circle.onClick();
        assert(ok.enabled === false && saveAs.enabled === true && save.enabled === true,
            "no shape: Generate grey, Save As and Save on");

        // A bad number: all three are grey
        circle.value = true; circle.onClick();
        var f = textField(w, "4");
        f.text = "x"; f.onChange();
        assert(ok.enabled === false && save.enabled === false && saveAs.enabled === false, "a bad number: Generate, Save, Save As are grey");
        done();
    });
})();

console.log("--- UI 1.4 presets: an unchecked field with junk is stored as the default (review focus 2) ---");
(function () {
    withStubs({}, function (saved) {
        function isDefaultHidden(p) {
            var D = GM.Config.getDefaults();
            return p.pathDist.spacing === D.pathDist.spacing && p.pathOffset === D.pathOffset;
        }
        // A holds path values of its own; junk in the hidden fields is stored as the defaults
        var pd = presetPData("A");
        pd.presets["A"].pathDist = { useNumber: false, number: 24, spacing: 50 };
        pd.presets["A"].pathOffset = 5;
        var ui = buildUI3(pd, mockPathInfo(4, true), null);
        var w = SUI.lastWindow();
        var save = winBtn(w, GM.L.SAVE), revert = winBtn(w, "↺"), ok = winBtn(w, GM.L.OK);
        assert(ui.modeUI.artboardRB.value === true, "precheck: artboard mode, the path fields are hidden");
        assert(String(ui.pathUI.spcIn.text) === "50" && String(ui.pathUI.offsetIn.text) === "5", "precheck: A's path values are in the hidden fields");
        ui.pathUI.spcIn.text = "abc"; ui.pathUI.spcIn.onChange();
        ui.pathUI.offsetIn.text = "99999"; ui.pathUI.offsetIn.onChange();
        assert(ok.enabled === true, "hidden junk does not grey Generate");
        assert(save.enabled === true, "...and Save is on: it would store other values than A holds");
        save.onClick();
        assert(pd.presets["A"].pathDist.spacing === 105, "Save stored the default spacing 105 (got " + pd.presets["A"].pathDist.spacing + ")");
        assert(pd.presets["A"].pathOffset === 0, "Save stored the offset 0, not 99999 (got " + pd.presets["A"].pathOffset + ")");
        assert(typeof pd.presets["A"].pathDist.spacing === "number" && JSON.stringify(pd.presets["A"]).indexOf("null") < 0, "...numbers, no null after JSON");
        assert(save.enabled === false && revert.enabled === false, "after Save the junk is no change to save: Save and ↺ are grey");
        assert(listTexts(presetList(w))[1] === "A", "...and A has no star (got " + listTexts(presetList(w))[1] + ")");
        done();

        // The next opening: no red field, in either mode, Generate on
        var ui2 = buildUI3(pd, mockPathInfo(4, true), null);
        var w2 = SUI.lastWindow();
        assert(String(ui2.pathUI.spcIn.text) === "105" && String(ui2.pathUI.offsetIn.text) === "0", "reopened: the path fields hold 105 and 0");
        ui2.modeUI.pathRB.value = true; ui2.modeUI.pathRB.onClick();
        assert(!isRedPen(ui2.pathUI.spcIn.graphics.foregroundColor) && !isRedPen(ui2.pathUI.offsetIn.graphics.foregroundColor),
            "reopened, path mode: no red field");
        assert(winBtn(w2, GM.L.OK).enabled === true, "reopened, path mode: Generate is on");
        done();

        // Save As takes the same road
        var pd3 = presetPData("A");
        var ui3 = buildUI3(pd3, mockPathInfo(4, true), null);
        var w3 = SUI.lastWindow();
        ui3.pathUI.spcIn.text = "abc"; ui3.pathUI.spcIn.onChange();
        ui3.pathUI.offsetIn.text = "99999"; ui3.pathUI.offsetIn.onChange();
        var save3 = winBtn(w3, GM.L.SAVE), saveAs3 = winBtn(w3, GM.L.BTN_SAVE_AS);
        assert(saveAs3.enabled === true, "junk in the hidden fields leaves Save As on");
        assert(save3.enabled === false && winBtn(w3, "↺").enabled === false,
            "A already holds the defaults the junk would be stored as: nothing to save, Save and ↺ are grey");
        global.prompt = function () { return "C"; };
        winBtn(w3, GM.L.BTN_SAVE_AS).onClick();
        assert(!!pd3.presets["C"] && pd3.activePreset === "C", "Save As made the preset C and made it active");
        assert(isDefaultHidden(pd3.presets["C"]), "Save As stored the defaults for the junk (got " + pd3.presets["C"].pathDist.spacing + ", " + pd3.presets["C"].pathOffset + ")");
        assert(listTexts(presetList(w3)).join("|") === "[Výchozí]|A|B|C", "the list has C (got " + listTexts(presetList(w3)).join("|") + ")");
        assert(winBtn(w3, GM.L.SAVE).enabled === false, "after Save As: Save is grey");
        done();
    });
})();

console.log("--- UI 1.4 presets: Save on [Výchozí] asks for a name ---");
(function () {
    withStubs({ prompt: "Mine" }, function (saved) {
        var pd = freshPData();
        buildUI3(pd, null, null);
        var w = SUI.lastWindow();
        var f = textField(w, "3");
        f.text = "3,5"; f.onChange();
        var save = winBtn(w, GM.L.SAVE);
        assert(save.enabled === true, "[Výchozí] changed: Save is on");
        save.onClick();
        assert(pd.activePreset === "Mine" && pd.presets["Mine"].markSize === 3.5, "Save on [Výchozí] went through Save As");
        assert(pd.presets["[Default]"].markSize === 3, "[Výchozí] is untouched");
        done();
    });
})();

console.log("--- UI 1.4 presets: the panel follows the canon's template (canon 9) ---");
(function () {
    buildUI3(presetPData("A"), null, null);
    var w = SUI.lastWindow();
    var list = presetList(w);
    var revert = winBtn(w, "↺"), save = winBtn(w, GM.L.SAVE), saveAs = winBtn(w, GM.L.BTN_SAVE_AS), del = winBtn(w, GM.L.DELETE);
    var row = list.parent;
    assert(revert.parent !== row && revert.parent.type === "group" && revert.parent.parent === row,
        "↺ sits in a group of its own, in the list's row");
    assert(revert.parent.children.length === 1, "...alone in it");
    assert(revert.parent.alignment && revert.parent.alignment[0] === "right", "...the group aligned right");
    assert(list.alignment && list.alignment[0] === "fill", "the list fills the row");
    assert(save.parent === saveAs.parent && saveAs.parent === del.parent && del.parent !== row, "Save, Save As and Delete share a row of their own");
    assert(del.parent.alignment && del.parent.alignment[0] === "right", "...aligned right");
    var btns = [save, saveAs, del];
    for (var i = 0; i < btns.length; i++) {
        assert(!(btns[i].preferredSize.width > 0), "'" + btns[i].text + "' has no preferredSize.width (native width), got " + btns[i].preferredSize.width);
    }
    assert(del.enabled === true, "Delete is on for a preset of the user's");
    done();
    buildUI3(presetPData("[Default]"), null, null);
    assert(winBtn(SUI.lastWindow(), GM.L.DELETE).enabled === false, "...and off on [Výchozí]");
    done();
})();

// ===== TESTS: the grey line says why Generate is grey (spec 5; canon 12.3, 12.6; audit P8) =====
// The values below are distinct on purpose, so each field is found by its text.
function reasonPData() {
    var p = freshPData();
    var s = p.presets["[Default]"];
    s.offsetX = 7.5; s.offsetY = 8.5;
    s.markSize = 3.5; s.regWeight = 1.25; s.haloWeight = 3.75;
    return p;
}
var DOC_1000x500 = { artboards: 1, width: 1000 * 2.834645669291339, height: 500 * 2.834645669291339, scale: 1 };
function blockReasonOf(st) {
    return typeof GM.UI.blockReason === "function" ? GM.UI.blockReason(st) : "(GM.UI.blockReason is missing)";
}
function lineIsErr(line) { return line.enabled === true && isRedPen(line.graphics.foregroundColor); }
function lineIsFinding(line) { return line.enabled === false && line.graphics.foregroundColor === line.graphics.ownPen; }

console.log("--- UI 1.4 reason: blockReason(st) in the order of spec 5 ---");
(function () {
    var R = GM.Validation.rules;
    assert(blockReasonOf({ invalid: [], noShape: false, noEdge: false }) === "", "nothing blocks: an empty string");
    assert(blockReasonOf({ invalid: [{ label: "Velikost", rule: R.markSize, unit: " mm" }] }) === "Velikost: zadejte číslo od 0,01 do 9999 mm.",
        "one field: the label, the allowed range, the unit (got '" + blockReasonOf({ invalid: [{ label: "Velikost", rule: R.markSize, unit: " mm" }] }) + "')");
    assert(blockReasonOf({ invalid: [{ label: "Reg. tah", rule: R.regWeight, unit: " pt" }] }) === "Reg. tah: zadejte číslo od 0,1 do 50 pt.",
        "a stroke weight: points");
    assert(blockReasonOf({ invalid: [{ label: "Horní — Počet ok", rule: R.edgeCount, unit: "" }] }) === "Horní — Počet ok: zadejte celé číslo od 1 do 9999.",
        "a count: a whole number, no unit (got '" + blockReasonOf({ invalid: [{ label: "Horní — Počet ok", rule: R.edgeCount, unit: "" }] }) + "')");
    var three = [{ label: "a", rule: R.markSize, unit: " mm" }, { label: "b", rule: R.regWeight, unit: " pt" }, { label: "c", rule: R.edgeCount, unit: "" }];
    assert(blockReasonOf({ invalid: three }) === "Neplatná pole: 3 — opravte červená pole.",
        "three fields: the count after the colon (got '" + blockReasonOf({ invalid: three }) + "')");
    assert(blockReasonOf({ invalid: three, noShape: true, noEdge: true }) === "Neplatná pole: 3 — opravte červená pole.",
        "fields come before the structure");
    assert(blockReasonOf({ invalid: [{ label: "Velikost", rule: R.markSize, unit: " mm" }], noShape: true }) === "Velikost: zadejte číslo od 0,01 do 9999 mm.",
        "one field also comes before the structure");
    assert(blockReasonOf({ invalid: [], noShape: true, noEdge: true }) === "Značka nemá tvar — zapněte Kruh nebo Kříž.",
        "no shape comes before no edge (got '" + blockReasonOf({ invalid: [], noShape: true, noEdge: true }) + "')");
    assert(blockReasonOf({ invalid: [], noShape: false, noEdge: true }) === "Není zapnutá žádná hrana.",
        "no edge (got '" + blockReasonOf({ invalid: [], noShape: false, noEdge: true }) + "')");
    assert(GM.L.REASON_MARK === "✗ ", "the symbol is the canon's ✗ with a space (12.6)");
})();

console.log("--- UI 1.4 reason: one invalid field, then the finding comes back ---");
(function () {
    var ui = buildUI3(reasonPData(), null, DOC_1000x500);
    var w = SUI.lastWindow();
    var line = ui.modeUI.infoLbl;
    var ok = winBtn(w, GM.L.OK);
    assert(line.text === "1 artboard · 1000 × 500 mm", "opened valid: the finding (got '" + line.text + "')");
    assert(lineIsFinding(line), "...grey: disabled, the control's own pen");
    assert(ok.enabled === true, "...Generate is on");

    var size = textField(w, "3,5");
    size.text = "x"; size.onChange();
    assert(line.text === "✗ Velikost: zadejte číslo od 0,01 do 9999 mm.", "Velikost 'x': the reason (got '" + line.text + "')");
    assert(lineIsErr(line), "...in the error colour, enabled so the colour shows");
    assert(ok.enabled === false, "...Generate is grey");

    size.text = "3,5"; size.onChange();
    assert(line.text === "1 artboard · 1000 × 500 mm", "fixed: the finding is back (got '" + line.text + "')");
    assert(lineIsFinding(line), "...grey again, the control's own pen");
    assert(ok.enabled === true, "...Generate is on again");

    // The reason follows the dialog's unit
    var units = w.findOne(function (c) { return c.type === "dropdownlist" && c.items.length === 3; });
    units.selection = units.items[1]; units.onChange();
    var sizeCm = textField(w, "0,35");
    sizeCm.text = "x"; sizeCm.onChange();
    assert(line.text === "✗ Velikost: zadejte číslo od 0,01 do 9999 cm.", "in cm the range says cm (got '" + line.text + "')");
    sizeCm.text = "0,35"; sizeCm.onChange();

    // A change that is not about validity does not wipe the reason (whichever runs last)
    sizeCm.text = "x"; sizeCm.onChange();
    units.selection = units.items[0]; units.onChange();
    assert(line.text.indexOf("✗ Velikost:") === 0 && line.text.indexOf(" mm.") > 0,
        "a unit change with a field still wrong: the reason, now in mm (got '" + line.text + "')");
    ui.edgeUI.top.cb.value = true; ui.edgeUI.top.cb.onClick();
    assert(lineIsErr(line), "another click in the dialog leaves the reason on the line");
    done();
})();

console.log("--- UI 1.4 reason: every field names itself ---");
(function () {
    var ui = buildUI3(reasonPData(), mockPathInfo(0, true), DOC_1000x500);
    var w = SUI.lastWindow();
    var line = ui.modeUI.infoLbl;
    function expectReason(field, restore, expected, what) {
        field.text = "x"; field.onChange();
        assert(line.text === "✗ " + expected, what + " (got '" + line.text + "')");
        field.text = restore; field.onChange();
        assert(lineIsFinding(line), what + ": fixed, the finding is back");
    }
    expectReason(textField(w, "7,5"), "7,5", "Odsazení od kraje ↔: zadejte číslo od 0 do 9999 mm.", "offset ↔");
    expectReason(textField(w, "8,5"), "8,5", "Odsazení od kraje ↕: zadejte číslo od 0 do 9999 mm.", "offset ↕");
    expectReason(textField(w, "1,25"), "1,25", "Reg. tah: zadejte číslo od 0,1 do 50 pt.", "registration stroke");
    expectReason(textField(w, "3,75"), "3,75", "Bílé halo: zadejte číslo od 0,1 do 50 pt.", "white halo");

    // Edges: the row's name and the column's header
    ui.edgeUI.top.numIn.text = "2,5"; ui.edgeUI.top.numIn.onChange();
    assert(line.text === "✗ Horní — Počet ok: zadejte celé číslo od 1 do 9999.", "top count, 2,5 is no whole number (got '" + line.text + "')");
    ui.edgeUI.top.numIn.text = "10"; ui.edgeUI.top.numIn.onChange();
    ui.edgeUI.left.spcRB.value = true; ui.edgeUI.left.spcRB.onClick();
    ui.edgeUI.left.spcIn.text = "0"; ui.edgeUI.left.spcIn.onChange();
    assert(line.text === "✗ Levá — Rozteč: zadejte číslo od 0,01 do 9999 mm.", "left spacing (got '" + line.text + "')");
    ui.edgeUI.left.spcIn.text = "105"; ui.edgeUI.left.spcIn.onChange();

    // Corner zones
    ui.zonesUI.enableCB.value = true; ui.zonesUI.enableCB.onClick();
    ui.zonesUI.countIn.text = "0"; ui.zonesUI.countIn.onChange();
    assert(line.text === "✗ Rohové zóny — Počet: zadejte celé číslo od 1 do 999.", "zone count (got '" + line.text + "')");
    ui.zonesUI.countIn.text = "5"; ui.zonesUI.countIn.onChange();
    ui.zonesUI.pitchIn.text = "x"; ui.zonesUI.pitchIn.onChange();
    assert(line.text === "✗ Rohové zóny — Rozteč: zadejte číslo od 0,01 do 9999 mm.", "zone spacing (got '" + line.text + "')");
    ui.zonesUI.pitchIn.text = "100"; ui.zonesUI.pitchIn.onChange();
    ui.zonesUI.enableCB.value = false; ui.zonesUI.enableCB.onClick();

    // Path mode: its own fields, the hidden mode's do not count
    ui.modeUI.pathRB.value = true; ui.modeUI.pathRB.onClick();
    ui.pathUI.spcIn.text = "x"; ui.pathUI.spcIn.onChange();
    assert(line.text === "✗ Rozteč: zadejte číslo od 0,01 do 9999 mm.", "path spacing (got '" + line.text + "')");
    ui.pathUI.spcIn.text = "105"; ui.pathUI.spcIn.onChange();
    ui.pathUI.offsetIn.text = "-1"; ui.pathUI.offsetIn.onChange();
    assert(line.text === "✗ Odsazení od kraje: zadejte číslo od 0 do 9999 mm.", "path offset (got '" + line.text + "')");
    ui.pathUI.offsetIn.text = "0"; ui.pathUI.offsetIn.onChange();
    ui.pathUI.numRB.value = true; ui.pathUI.numRB.onClick();
    // a path with corners dictates the count; a smooth one lets the operator enter it
    ui.pathUI.numIn.text = "x"; ui.pathUI.numIn.onChange();
    assert(line.text === "✗ Počet ok: zadejte celé číslo od 1 do 9999.", "path count (got '" + line.text + "')");
    done();
})();

console.log("--- UI 1.4 reason: several invalid fields are counted ---");
(function () {
    var ui = buildUI3(reasonPData(), null, DOC_1000x500);
    var w = SUI.lastWindow();
    var line = ui.modeUI.infoLbl;
    var size = textField(w, "3,5"), reg = textField(w, "1,25"), halo = textField(w, "3,75");
    size.text = "x"; size.onChange();
    reg.text = "x"; reg.onChange();
    assert(line.text === "✗ Neplatná pole: 2 — opravte červená pole.", "two fields (got '" + line.text + "')");
    halo.text = "x"; halo.onChange();
    assert(line.text === "✗ Neplatná pole: 3 — opravte červená pole.", "three fields (got '" + line.text + "')");
    assert(lineIsErr(line), "...in the error colour");
    assert(winBtn(w, GM.L.OK).enabled === false, "...Generate is grey");

    // The fields of the hidden mode are not counted
    ui.pathUI.spcIn.text = "x"; ui.pathUI.spcIn.onChange();
    assert(line.text === "✗ Neplatná pole: 3 — opravte červená pole.", "a wrong field of the hidden mode is not counted (got '" + line.text + "')");

    // Fix two, one is left: that one by name
    size.text = "3,5"; size.onChange();
    reg.text = "1,25"; reg.onChange();
    assert(line.text === "✗ Bílé halo: zadejte číslo od 0,1 do 50 pt.", "two fixed, the third is named (got '" + line.text + "')");
    halo.text = "3,75"; halo.onChange();
    assert(lineIsFinding(line) && winBtn(w, GM.L.OK).enabled === true, "all fixed: the finding, Generate on");
    done();
})();

console.log("--- UI 1.4 reason: the unit stands once, the label has no (pt) (ruling R8) ---");
(function () {
    var labels = GM.UI.reasonLabels();
    assert(labels.regWeight === "Reg. tah" && labels.haloWeight === "Bílé halo",
        "CS: the stroke labels have lost '(pt)' (got '" + labels.regWeight + "' / '" + labels.haloWeight + "')");
    var all = [];
    for (var k in labels) if (labels.hasOwnProperty(k)) all.push(labels[k]);
    assert(all.join("|").indexOf("(pt)") < 0, "no label of a reason carries '(pt)'");
    assert(GM.L.REG_WEIGHT === "Reg. tah (pt):", "the dialog's own label keeps its '(pt)': the field shows the unit");
    // The same in English: the table's labels, through the same function
    var saved = GM.L, en = tableFor("en_US");
    GM.L = en;
    try {
        var enLabels = GM.UI.reasonLabels();
        assert(enLabels.regWeight === "Reg. stroke" && enLabels.haloWeight === "White halo",
            "EN: 'Reg. stroke', 'White halo' (got '" + enLabels.regWeight + "' / '" + enLabels.haloWeight + "')");
    } finally { GM.L = saved; }

    var ui = buildUI3(reasonPData(), null, DOC_1000x500);
    var w = SUI.lastWindow();
    var halo = textField(w, "3,75");
    halo.text = "x"; halo.onChange();
    assert(ui.modeUI.infoLbl.text === "✗ Bílé halo: zadejte číslo od 0,1 do 50 pt.", "in the dialog: one 'pt', at the end (got '" + ui.modeUI.infoLbl.text + "')");
    done();
})();

console.log("--- UI 1.4 reason: a mirrored edge row is not checked, as validate() does not (ruling R7) ---");
(function () {
    withStubs({}, function () {
        var ui = buildUI3(presetPData("A"), null, DOC_1000x500);
        var w = SUI.lastWindow();
        var line = ui.modeUI.infoLbl;
        var ok = winBtn(w, GM.L.OK), save = winBtn(w, GM.L.SAVE), saveAs = winBtn(w, GM.L.BTN_SAVE_AS);
        var mirrorTop = w.findOne(function (c) { return c.type === "checkbox" && c.text === GM.L.MIRROR_TOP; });
        var mirrorLeft = w.findOne(function (c) { return c.type === "checkbox" && c.text === GM.L.MIRROR_LEFT; });
        var bottom = ui.edgeUI.bottom, right = ui.edgeUI.right;
        assert(mirrorTop.value === true && mirrorLeft.value === true, "precheck: both mirrors on");

        // Reveal Dolní, switch it on and give it junk
        mirrorTop.value = false; mirrorTop.onClick();
        bottom.cb.value = true; bottom.cb.onClick();
        bottom.spcRB.value = true; bottom.spcRB.onClick();
        bottom.spcIn.text = "x"; bottom.spcIn.onChange();
        assert(line.text === "✗ Dolní — Rozteč: zadejte číslo od 0,01 do 9999 mm.", "mirror off: the field is checked, the reason names it (got '" + line.text + "')");
        assert(isRedPen(bottom.spcIn.graphics.foregroundColor), "...and the field is red");
        assert(ok.enabled === false && saveAs.enabled === false, "...Generate and Save As are grey");

        // Mirror on: the row is hidden and does not count
        mirrorTop.value = true; mirrorTop.onClick();
        assert(ok.enabled === true, "mirror on: Generate is on again, the hidden field does not block it");
        assert(lineIsFinding(line) && line.text === "1 artboard · 1000 × 500 mm", "...the line shows the finding (got '" + line.text + "')");
        assert(bottom.spcIn.graphics.foregroundColor === bottom.spcIn.graphics.ownPen, "...the hidden field is painted valid, its own pen");
        assert(saveAs.enabled === true, "...Save As follows the other fields: on");
        assert(GM.Validation.validate(ui.gatherAll(), GM.L).valid === true, "...and validate() agrees: the run would go");
        var size = textField(w, "4");
        size.text = "5"; size.onChange();
        assert(save.enabled === true, "a valid change of a visible field: Save is on, the hidden junk is no obstacle");

        // The check reads the mirror box as it is now: off, and the same junk counts again
        // (the box alone is flipped, so un-mirroring does not seed the row from the top edge)
        mirrorTop.value = false; ui.edgeUI.top.cb.onClick();
        assert(line.text === "✗ Dolní — Rozteč: zadejte číslo od 0,01 do 9999 mm.", "mirror off: the same field is checked again (got '" + line.text + "')");
        assert(isRedPen(bottom.spcIn.graphics.foregroundColor), "...red again");
        assert(ok.enabled === false && save.enabled === false && saveAs.enabled === false, "...Generate, Save, Save As are grey");
        mirrorTop.value = true; ui.edgeUI.top.cb.onClick();
        assert(ok.enabled === true && lineIsFinding(line), "mirror on: not checked again");

        // The right edge follows the left mirror the same way
        mirrorLeft.value = false; mirrorLeft.onClick();
        right.cb.value = true; right.cb.onClick();
        right.numRB.value = true; right.numRB.onClick();
        right.numIn.text = "2,5"; right.numIn.onChange();
        assert(line.text === "✗ Pravá — Počet ok: zadejte celé číslo od 1 do 9999.", "right edge, mirror off: checked (got '" + line.text + "')");
        mirrorLeft.value = true; mirrorLeft.onClick();
        assert(ok.enabled === true && lineIsFinding(line), "right edge, mirror on: not checked (got '" + line.text + "')");

        // Two hidden junk fields are not counted either
        bottom.spcIn.text = "x"; bottom.spcIn.onChange();
        assert(ok.enabled === true && line.text.indexOf("✗") < 0, "hidden junk in two rows: no reason, no count (got '" + line.text + "')");

        // The mirror does not hide the top and left rows: they are always checked
        ui.edgeUI.top.numIn.text = "x"; ui.edgeUI.top.numIn.onChange();
        assert(line.text === "✗ Horní — Počet ok: zadejte celé číslo od 1 do 9999.", "the top row is always checked (got '" + line.text + "')");
        done();
    });
})();

console.log("--- UI 1.4 reason: no shape, no edge ---");
(function () {
    var ui = buildUI3(reasonPData(), null, DOC_1000x500);
    var w = SUI.lastWindow();
    var line = ui.modeUI.infoLbl, ok = winBtn(w, GM.L.OK);
    var circle = w.findOne(function (c) { return c.type === "checkbox" && c.text === GM.L.MARK_CIRCLE; });

    circle.value = false; circle.onClick();
    assert(line.text === "✗ Značka nemá tvar — zapněte Kruh nebo Kříž.", "no shape (got '" + line.text + "')");
    assert(lineIsErr(line) && ok.enabled === false, "...in the error colour, Generate is grey");
    circle.value = true; circle.onClick();
    assert(lineIsFinding(line) && ok.enabled === true, "a shape again: the finding, Generate on");

    // No edge: top and left off, bottom and right mirror them
    ui.edgeUI.top.cb.value = false; ui.edgeUI.top.cb.onClick();
    assert(line.text === "1 artboard · 1000 × 500 mm" && ok.enabled === true, "only the left edge on: the finding");
    ui.edgeUI.left.cb.value = false; ui.edgeUI.left.cb.onClick();
    assert(line.text === "✗ Není zapnutá žádná hrana.", "no edge on (got '" + line.text + "')");
    assert(lineIsErr(line) && ok.enabled === false, "...in the error colour, Generate is grey");

    // Both: the shape comes first
    circle.value = false; circle.onClick();
    assert(line.text === "✗ Značka nemá tvar — zapněte Kruh nebo Kříž.", "no shape and no edge: the shape is said first");

    // A wrong number is said before the structure
    var size = textField(w, "3,5");
    size.text = "x"; size.onChange();
    assert(line.text === "✗ Velikost: zadejte číslo od 0,01 do 9999 mm.", "a wrong number before the structure (got '" + line.text + "')");
    size.text = "3,5"; size.onChange();
    circle.value = true; circle.onClick();

    // The mirrors count: the bottom edge follows the top, so the top alone is an edge
    ui.edgeUI.top.cb.value = true; ui.edgeUI.top.cb.onClick();
    assert(lineIsFinding(line) && ok.enabled === true, "top on again: the finding");
    done();

    // In path mode there is no edge to switch on
    var ui2 = buildUI3(reasonPData(), mockPathInfo(0, true), DOC_1000x500);
    var w2 = SUI.lastWindow();
    ui2.edgeUI.top.cb.value = false; ui2.edgeUI.top.cb.onClick();
    ui2.edgeUI.left.cb.value = false; ui2.edgeUI.left.cb.onClick();
    ui2.modeUI.pathRB.value = true; ui2.modeUI.pathRB.onClick();
    assert(ui2.modeUI.infoLbl.text.indexOf("✗") < 0 && winBtn(w2, GM.L.OK).enabled === true,
        "path mode: the edges do not block, the line has the finding (got '" + ui2.modeUI.infoLbl.text + "')");
    done();
})();

console.log("--- UI 1.4 reason: the finding keeps its clause for a wrong offset (placementInfoText) ---");
(function () {
    var pi = mockPathInfo(4, true);
    function info(offset) { return GM.UI.placementInfoText({ pathMode: true, pathInfo: pi, docInfo: null, fallback: false, offset: offset, unit: "mm" }); }
    assert(info(NaN) === "Uzavřená cesta · 4 rohy", "a wrong offset is not 'on the path' (got '" + info(NaN) + "')");
    assert(info(0) === "Uzavřená cesta · 4 rohy · značky leží na cestě", "offset 0: the clause is there");
    assert(info(20) === "Uzavřená cesta · 4 rohy", "offset 20: no clause");
})();

console.log("--- UI 1.4 reason: the line is wide enough for the longest reason ---");
(function () {
    var longest = GM.UI.longestInfoText();
    var widest = "", n = 0;
    function note(text) { n++; if (text.length > widest.length) widest = text; }

    var ui = buildUI3(reasonPData(), mockPathInfo(0, true), DOC_1000x500);
    var w = SUI.lastWindow();
    var line = ui.modeUI.infoLbl;
    var circle = w.findOne(function (c) { return c.type === "checkbox" && c.text === GM.L.MARK_CIRCLE; });
    var fields = [textField(w, "7,5"), textField(w, "8,5"), textField(w, "3,5"), textField(w, "1,25"), textField(w, "3,75"),
        ui.edgeUI.top.numIn, ui.edgeUI.left.numIn, ui.zonesUI.countIn, ui.zonesUI.pitchIn];
    ui.zonesUI.enableCB.value = true; ui.zonesUI.enableCB.onClick();
    ui.edgeUI.top.spcRB.value = true; ui.edgeUI.top.spcRB.onClick();
    ui.edgeUI.left.spcRB.value = true; ui.edgeUI.left.spcRB.onClick();
    ui.edgeUI.top.cb.value = true; ui.edgeUI.top.cb.onClick();
    fields.push(ui.edgeUI.top.spcIn, ui.edgeUI.left.spcIn);
    for (var i = 0; i < fields.length; i++) {
        var keep = fields[i].text;
        fields[i].text = "x"; fields[i].onChange(); note(line.text);
        fields[i].text = keep; fields[i].onChange();
    }
    ui.modeUI.pathRB.value = true; ui.modeUI.pathRB.onClick();
    var pfields = [ui.pathUI.spcIn, ui.pathUI.offsetIn];
    for (var j = 0; j < pfields.length; j++) {
        var keep2 = pfields[j].text;
        pfields[j].text = "x"; pfields[j].onChange(); note(line.text);
        pfields[j].text = keep2; pfields[j].onChange();
    }
    ui.modeUI.artboardRB.value = true; ui.modeUI.artboardRB.onClick();
    // the bottom and right rows, shown by switching their mirrors off, are named too
    var mirrors = w.find(function (c) { return c.type === "checkbox" && (c.text === GM.L.MIRROR_TOP || c.text === GM.L.MIRROR_LEFT); });
    for (var m = 0; m < mirrors.length; m++) { mirrors[m].value = false; mirrors[m].onClick(); }
    var rows = [ui.edgeUI.bottom, ui.edgeUI.right];
    for (var r = 0; r < rows.length; r++) {
        rows[r].cb.value = true; rows[r].cb.onClick();
        rows[r].numRB.value = true; rows[r].numRB.onClick();
        rows[r].numIn.text = "x"; rows[r].numIn.onChange(); note(line.text);
        rows[r].numIn.text = "10"; rows[r].numIn.onChange();
        rows[r].spcRB.value = true; rows[r].spcRB.onClick();
        rows[r].spcIn.text = "x"; rows[r].spcIn.onChange(); note(line.text);
        rows[r].spcIn.text = "105"; rows[r].spcIn.onChange();
    }
    note(GM.L.REASON_MARK + GM.L.format(GM.L.REASON_MANY, 99));
    note(GM.L.REASON_MARK + GM.L.REASON_NO_SHAPE);
    note(GM.L.REASON_MARK + GM.L.REASON_NO_EDGE);
    assert(n >= 20, "precheck: " + n + " reasons collected");
    assert(widest.indexOf("✗") === 0, "precheck: the widest is a reason, not a finding (got '" + widest + "')");
    assert(longest.length >= widest.length,
        "longestInfoText (" + longest.length + ") holds the longest reason (" + widest.length + "): '" + widest + "'");
    done();
})();

// ===== TESTS: the drawing scale 1:N (spec 4, 5; Task 6) =====
// The field sits on the second row of the Placement panel, after the units; the
// document supplies the starting value; the scale is not a setting (no preset,
// no modified indicator); invalid, it greys Generate, Save and Save As.
var MMPT = 2.834645669291339;
function docAt(wMm, hMm, drawingScale, extra) {
    var d = { artboards: 1, width: wMm * MMPT, height: hMm * MMPT, scale: 1 };
    if (drawingScale !== undefined) d.drawingScale = drawingScale;
    for (var k in (extra || {})) if (extra.hasOwnProperty(k)) d[k] = extra[k];
    return d;
}
// By its tip: with three presets the preset list also has three items
function unitsList(w) { return w.findOne(function (c) { return c.type === "dropdownlist" && c.helpTip === GM.L.TIP_UNITS; }); }
function types(group) { var t = []; for (var i = 0; i < group.children.length; i++) t.push(group.children[i].type); return t.join(","); }
// The controls of a row in reading order, the groups that only space them opened up
function leaves(group, out) {
    out = out || [];
    for (var i = 0; i < group.children.length; i++) {
        var c = group.children[i];
        if (c.type === "group") leaves(c, out); else out.push(c);
    }
    return out;
}

console.log("--- UI 1.4 scale: Units and Drawing scale share the second row of Placement (spec 4.4) ---");
(function () {
    var ui = buildUI3(null, null, docAt(1000, 500, 2.5));
    var w = SUI.lastWindow();
    var scale = ui.modeUI.scaleIn;
    assert(!!scale && scale.type === "edittext", "modeUI.scaleIn is an edittext");
    if (!scale) { done(); return; }
    var panel = ui.modeUI.infoLbl.parent;
    assert(panel.children.length === 3 && panel.children[2] === ui.modeUI.infoLbl,
        "the panel has three rows: the modes, units + scale, the grey line (got " + panel.children.length + ")");
    var modes = panel.children[0], row = leaves(panel.children[1]);
    assert(types(modes) === "radiobutton,radiobutton" && modes.children[0].text === GM.L.MODE_ARTBOARD && modes.children[1].text === GM.L.MODE_PATH,
        "row 1: only the two modes, the units have moved out (got " + types(modes) + ")");
    var rowTypes = []; for (var t = 0; t < row.length; t++) rowTypes.push(row[t].type);
    assert(rowTypes.join(",") === "statictext,dropdownlist,statictext,edittext", "row 2 is label, list, label, field (got " + rowTypes.join(",") + ")");
    assert(row.length === 4 && row[0].text === "Jednotky:" && row[2].text === "Měřítko kresby 1:",
        "row 2 reads 'Jednotky: [..]  Měřítko kresby 1: [..]'");
    assert(row.length === 4 && row[1] === unitsList(w) && row[3] === scale, "the list and the field are the units list and the scale field");
    assert(row.length === 4 && row[0].text.charAt(row[0].text.length - 1) === ":" && row[2].text.charAt(row[2].text.length - 1) === ":",
        "both labels end with the colon (canon)");
    assert(row.length === 4 && scale.helpTip === GM.L.TIP_SCALE && row[2].helpTip === GM.L.TIP_SCALE && GM.L.TIP_SCALE.length > 20,
        "the tip is on the field and on its label");
    assert(unitsList(w).helpTip === GM.L.TIP_UNITS, "the units keep their tip");
    done();
})();

console.log("--- UI 1.4 scale: the field starts with the document's scale (spec 4.2) ---");
(function () {
    function start(doc) { var ui = buildUI3(null, null, doc); var t = ui.modeUI.scaleIn.text; done(); return t; }
    assert(start(docAt(1000, 500, 2.5)) === "2,5", "2.5 in the document opens as '2,5' (the comma stays a comma)");
    assert(start(docAt(1000, 500, 10)) === "10", "10 opens as '10'");
    assert(start(docAt(1000, 500)) === "1", "no drawingScale in docInfo: '1'");
    assert(start(docAt(1000, 500, 1)) === "1", "1 (a document without a scale): '1'");
    assert(start(null) === "1", "no docInfo at all: '1'");
    assert(start(docAt(1000, 500, 250)) === "250", "a scale outside the rule is shown as it is (Tile Export writes no upper limit)");
    var ui = buildUI3(null, null, docAt(1000, 500, 250));
    assert(isRedPen(ui.modeUI.scaleIn.graphics.foregroundColor), "...and it is red at once");
    assert(winBtn(SUI.lastWindow(), GM.L.OK).enabled === false, "...Generate is grey");
    assert(ui.modeUI.infoLbl.text === "✗ Měřítko kresby: zadejte číslo od 1 do 100.", "...and the line says why (got '" + ui.modeUI.infoLbl.text + "')");
    done();
})();

console.log("--- UI 1.4 scale: a wrong scale greys Generate, Save, Save As and says why (spec 4.3, ruling R1) ---");
(function () {
    withStubs({}, function () {
        var ui = buildUI3(presetPData("A"), null, docAt(1000, 500, 1));
        var w = SUI.lastWindow();
        var scale = ui.modeUI.scaleIn, line = ui.modeUI.infoLbl;
        var ok = winBtn(w, GM.L.OK), save = winBtn(w, GM.L.SAVE), saveAs = winBtn(w, GM.L.BTN_SAVE_AS);
        var size = textField(w, "4");
        size.text = "5"; size.onChange();
        assert(ok.enabled === true && save.enabled === true && saveAs.enabled === true, "precheck: a valid change, all three are on");
        assert(scale.graphics.foregroundColor === scale.graphics.ownPen, "precheck: the scale shows its own pen");

        var bad = ["0,5", "0", "101", "abc", "", "1e1", "-3"];
        for (var i = 0; i < bad.length; i++) {
            scale.text = bad[i]; scale.onChange();
            var tag = "'" + bad[i] + "'";
            assert(isRedPen(scale.graphics.foregroundColor), tag + ": the field is red");
            assert(ok.enabled === false && save.enabled === false && saveAs.enabled === false, tag + ": Generate, Save, Save As are grey");
            assert(line.text === "✗ Měřítko kresby: zadejte číslo od 1 do 100." && lineIsErr(line),
                tag + ": the line gives the reason in the error colour (got '" + line.text + "')");
            scale.text = "2"; scale.onChange();
            assert(scale.graphics.foregroundColor === scale.graphics.ownPen && ok.enabled === true && save.enabled === true && saveAs.enabled === true,
                tag + " fixed to '2': the own pen is back, all three are on");
        }

        // Typing counts as well (onChanging), and the limits are valid
        scale.text = "101"; scale.onChanging();
        assert(ok.enabled === false, "'101' while typing: Generate is grey");
        scale.text = "100"; scale.onChanging();
        assert(ok.enabled === true && isRedPen(scale.graphics.foregroundColor) === false, "'100' is the highest valid scale");
        scale.text = "1"; scale.onChanging();
        assert(ok.enabled === true, "'1' is the lowest valid scale");
        scale.text = "1,5"; scale.onChanging();
        assert(ok.enabled === true, "'1,5' and a dot '1.5' are valid");
        scale.text = "1.5"; scale.onChanging();
        assert(ok.enabled === true, "'1.5' is valid");

        // It counts with the others: a wrong scale and a wrong size are two fields
        scale.text = "0"; scale.onChange();
        size.text = "x"; size.onChange();
        assert(line.text === "✗ Neplatná pole: 2 — opravte červená pole.", "scale and size wrong: counted (got '" + line.text + "')");
        size.text = "5"; size.onChange();
        assert(line.text === "✗ Měřítko kresby: zadejte číslo od 1 do 100.", "size fixed: the scale is named (got '" + line.text + "')");

        // Checked in both modes: the field is not tied to one of them
        var ui2 = buildUI3(null, mockPathInfo(4, true), docAt(1000, 500, 1));
        var ok2 = winBtn(SUI.lastWindow(), GM.L.OK);
        ui2.modeUI.scaleIn.text = "0"; ui2.modeUI.scaleIn.onChange();
        assert(ok2.enabled === false, "artboard mode: Generate is grey");
        ui2.modeUI.pathRB.value = true; ui2.modeUI.pathRB.onClick();
        assert(ok2.enabled === false && isRedPen(ui2.modeUI.scaleIn.graphics.foregroundColor) &&
            ui2.modeUI.infoLbl.text === "✗ Měřítko kresby: zadejte číslo od 1 do 100.", "path mode: still grey, red, the reason (got '" + ui2.modeUI.infoLbl.text + "')");
        done();
    });
})();

console.log("--- UI 1.4 scale: units and presets leave the scale alone; it is no setting (spec 4.2) ---");
(function () {
    withStubs({}, function () {
        var ui = buildUI3(presetPData("A"), null, docAt(1000, 500, 1));
        var w = SUI.lastWindow();
        var scale = ui.modeUI.scaleIn, units = unitsList(w), list = presetList(w);
        var save = winBtn(w, GM.L.SAVE), revert = winBtn(w, "↺");
        var size = textField(w, "4");   // the mark size of preset A, found before the scale is also '4'
        assert(save.enabled === false && revert.enabled === false, "precheck: nothing is changed");

        // The scale is not a change of the preset
        scale.text = "4"; scale.onChange();
        assert(save.enabled === false && revert.enabled === false && listTexts(list).join("|") === "[Výchozí]|A|B",
            "typing a scale: Save and ↺ stay off, the list shows no star (got " + listTexts(list).join("|") + ")");
        assert(!ui.gatherAll().hasOwnProperty("drawingScale") && !ui.gatherAll().hasOwnProperty("scale"), "gatherAll() carries no scale");
        assert(JSON.stringify(GM.Validation.storable(ui.gatherAll())).indexOf("cale") < 0, "...nor does what a preset would store");

        // Units: the scale does not convert
        units.selection = units.items[1]; units.onChange();
        assert(scale.text === "4", "mm -> cm: the scale stays '4' (got '" + scale.text + "')");
        assert(size.text === "0,4", "...while the mark size was converted (got '" + size.text + "')");
        units.selection = units.items[2]; units.onChange();
        assert(scale.text === "4", "cm -> in: the scale stays '4'");
        units.selection = units.items[0]; units.onChange();
        scale.text = "2,5"; scale.onChange();
        units.selection = units.items[1]; units.onChange();
        assert(scale.text === "2,5", "a decimal scale is not converted either (got '" + scale.text + "')");
        units.selection = units.items[0]; units.onChange();

        // Presets: choosing one leaves the scale as it is
        var idx = listTexts(list).indexOf("B");
        list.selection = list.items[idx]; list.onChange();
        assert(ui.gatherAll().markSize === 6, "precheck: preset B is loaded (markSize 6)");
        assert(scale.text === "2,5", "choosing preset B: the scale stays '2,5' (got '" + scale.text + "')");
        winBtn(w, "↺").onClick();
        assert(scale.text === "2,5", "↺: the scale stays '2,5'");
        done();
    });
})();

console.log("--- UI 1.4 scale: getRunOptions hands the scale over (spec 4.2) ---");
(function () {
    var ui = buildUI3(null, null, docAt(1000, 500, 2.5));
    var o = ui.getRunOptions();
    assert(o.drawingScale === 2.5 && o.pathPartial === false, "opened at 2,5: {pathPartial: false, drawingScale: 2.5}");
    ui.modeUI.scaleIn.text = "10"; ui.modeUI.scaleIn.onChange();
    assert(ui.getRunOptions().drawingScale === 10, "typed '10': 10");
    ui.modeUI.scaleIn.text = "3.25"; ui.modeUI.scaleIn.onChange();
    assert(ui.getRunOptions().drawingScale === 3.25, "typed '3.25': 3.25");
    ui.modeUI.scaleIn.text = "abc"; ui.modeUI.scaleIn.onChange();
    assert(isNaN(ui.getRunOptions().drawingScale), "'abc': NaN, not 1 (run() refuses it)");
    done();
    assert(buildUI3(null, null, null).getRunOptions().drawingScale === 1, "a document without a scale: 1");
    done();
})();

console.log("--- UI 1.4 scale: the grey line ends with the scale, the size is the real one (spec 4.6, 5; ruling R3) ---");
(function () {
    var ui = buildUI3(null, null, docAt(800, 600, 10));
    var line = ui.modeUI.infoLbl;
    var expected = "1 artboard · " + GM.UI.formatLen(800 * 10) + " × " + GM.UI.formatLen(600 * 10) + " mm · 1:10";
    assert(line.text === expected, "artboard 800 x 600 mm at 1:10: real size x 10 (got '" + line.text + "')");
    assert(line.text === "1 artboard · 8000 × 6000 mm · 1:10", "...in formatLen's format: '8000 × 6000 mm'");
    assert(lineIsFinding(line), "...a finding, grey");

    // It follows the field while typing
    ui.modeUI.scaleIn.text = "1"; ui.modeUI.scaleIn.onChanging();
    assert(line.text === "1 artboard · 800 × 600 mm", "typed '1': no suffix, the artboard as it is (got '" + line.text + "')");
    ui.modeUI.scaleIn.text = "2,5"; ui.modeUI.scaleIn.onChanging();
    assert(line.text === "1 artboard · 2000 × 1500 mm · 1:2,5", "typed '2,5': the comma, the size x 2.5 (got '" + line.text + "')");
    ui.modeUI.scaleIn.text = "1,0"; ui.modeUI.scaleIn.onChanging();
    assert(line.text === "1 artboard · 800 × 600 mm", "typed '1,0' is 1:1: no suffix (got '" + line.text + "')");
    ui.modeUI.scaleIn.text = "0"; ui.modeUI.scaleIn.onChanging();
    assert(lineIsErr(ui.modeUI.infoLbl) && line.text.indexOf(" · 1:") < 0, "typed '0': the reason, no suffix (got '" + line.text + "')");
    ui.modeUI.scaleIn.text = "10"; ui.modeUI.scaleIn.onChanging();
    assert(line.text === expected && lineIsFinding(line), "back to '10': the finding with the suffix again");

    // The unit changes the number, not the suffix
    var units = unitsList(SUI.lastWindow());
    units.selection = units.items[1]; units.onChange();
    assert(line.text === "1 artboard · 800 × 600 cm · 1:10", "cm: 800 x 600 cm (got '" + line.text + "')");
    done();

    // Large Canvas: the document's own factor and the drawing scale multiply
    var big = buildUI3(null, null, docAt(30, 20, 10, { scale: 10 }));
    assert(big.modeUI.infoLbl.text === "1 artboard · 3000 × 2000 mm · 1:10",
        "Large Canvas x 1:10: 30 x 20 mm in the file is 3000 x 2000 mm (got '" + big.modeUI.infoLbl.text + "')");
    done();

    var three = buildUI3(null, null, docAt(1, 1, 10, { artboards: 3 }));
    assert(three.modeUI.infoLbl.text === "3 artboardy · značky dostanou všechny · 1:10", "several artboards: the suffix at the end (got '" + three.modeUI.infoLbl.text + "')");
    done();

    var pd = freshPData();
    pd.presets["[Default]"].placementMode = "path";
    var fb = buildUI3(pd, null, docAt(100, 100, 10));
    assert(fb.modeUI.infoLbl.text === GM.L.INFO_FALLBACK + " · 1:10", "the notice that no path is selected also ends with the scale (got '" + fb.modeUI.infoLbl.text + "')");
    done();

    // Path mode: the same ending, after the clause
    var p = buildUI3(null, mockPathInfo(5, true), docAt(100, 100, 10));
    p.modeUI.pathRB.value = true; p.modeUI.pathRB.onClick();
    assert(p.modeUI.infoLbl.text === "Uzavřená cesta · 5 rohů · značky leží na cestě · 1:10", "closed path, offset 0 (got '" + p.modeUI.infoLbl.text + "')");
    p.pathUI.offsetIn.text = "20"; p.pathUI.offsetIn.onChanging();
    assert(p.modeUI.infoLbl.text === "Uzavřená cesta · 5 rohů · 1:10", "closed path, offset 20 (got '" + p.modeUI.infoLbl.text + "')");
    p.modeUI.scaleIn.text = "1"; p.modeUI.scaleIn.onChanging();
    assert(p.modeUI.infoLbl.text === "Uzavřená cesta · 5 rohů", "...and at 1:1 the 1.3.0 text (got '" + p.modeUI.infoLbl.text + "')");
    p.modeUI.artboardRB.value = true; p.modeUI.artboardRB.onClick();
    assert(p.modeUI.infoLbl.text === "1 artboard · 100 × 100 mm", "back to the artboard at 1:1: no suffix (got '" + p.modeUI.infoLbl.text + "')");
    done();

    // The function itself: no scale, 1 and unusable ones add nothing
    var st = { pathMode: false, pathInfo: null, docInfo: docAt(1000, 500, 1), fallback: false, offset: 0, unit: "mm" };
    var base = GM.UI.placementInfoText(st);
    assert(base === "1 artboard · 1000 × 500 mm", "no st.drawingScale: the 1.3.0 text (got '" + base + "')");
    var cases = [1, NaN, 0, -2, undefined, null];
    for (var i = 0; i < cases.length; i++) {
        st.drawingScale = cases[i];
        assert(GM.UI.placementInfoText(st) === base, "st.drawingScale " + cases[i] + ": nothing added");
    }
    st.drawingScale = 4;
    assert(GM.UI.placementInfoText(st) === "1 artboard · 4000 × 2000 mm · 1:4", "st.drawingScale 4: the size x 4 and the suffix (got '" + GM.UI.placementInfoText(st) + "')");
    st.drawingScale = 100;
    assert(GM.UI.placementInfoText(st) === "1 artboard · 100000 × 50000 mm · 1:100", "st.drawingScale 100 (got '" + GM.UI.placementInfoText(st) + "')");
    st.docInfo = null; st.drawingScale = 10;
    assert(GM.UI.placementInfoText(st) === "", "no docInfo: the empty line stays empty, no dangling suffix");
})();

console.log("--- UI 1.4 scale: the line is wide enough for the finding with the scale (spec 5) ---");
(function () {
    var longest = GM.UI.longestInfoText();
    var worst = [];
    worst.push(GM.UI.placementInfoText({ pathMode: false, docInfo: docAt(999.9, 999.9, 99.5), fallback: false, offset: 0, unit: "mm", drawingScale: 99.5 }));
    worst.push(GM.UI.placementInfoText({ pathMode: false, docInfo: null, fallback: true, offset: 0, unit: "mm", drawingScale: 99.5 }));
    worst.push(GM.UI.placementInfoText({ pathMode: false, docInfo: docAt(1, 1, 99.5, { artboards: 99 }), fallback: false, offset: 0, unit: "mm", drawingScale: 99.5 }));
    worst.push(GM.UI.placementInfoText({ pathMode: true, pathInfo: mockPathInfo(198, true, 1000, { sharpCount: 99, roundCount: 99 }),
        docInfo: null, fallback: false, offset: 0, unit: "mm", drawingScale: 99.5 }));
    worst.push(GM.UI.placementInfoText({ pathMode: true, pathInfo: mockPathInfo(0, true, 1000), docInfo: null, fallback: false, offset: 0, unit: "mm", drawingScale: 99.5 }));
    for (var i = 0; i < worst.length; i++) {
        assert(worst[i].indexOf(" · 1:99,5") > 0, "precheck " + i + ": the sample carries the scale (got '" + worst[i] + "')");
        assert(longest.length >= worst[i].length,
            "longestInfoText (" + longest.length + ") holds '" + worst[i] + "' (" + worst[i].length + ")");
    }
    // The reason for the scale field is among the samples as well
    var reasonScale = GM.L.REASON_MARK + GM.L.format(GM.L.REASON_FIELD, GM.UI.reasonLabels().scale, "1", "100", "");
    assert(GM.UI.reasonLabels().scale === "Měřítko kresby" && reasonScale === "✗ Měřítko kresby: zadejte číslo od 1 do 100.",
        "the reason's name for the field is SCALE_FIELD (got '" + GM.UI.reasonLabels().scale + "')");
})();

// ===== TEST: both locales define the same keys =====
// The table of one language, built the way the script builds it: locale.js run
// with that app.locale (the suite's own GM.L stays the one loaded at the top).
function tableFor(locale) {
    var saved = global.app.locale;
    global.app.locale = locale;
    var fn = new Function("GM", src("locale.js") + "\nreturn GM.L;");
    var table = fn({});
    global.app.locale = saved;
    return table;
}
function stringKeys(table) {
    var keys = [];
    for (var k in table) if (table.hasOwnProperty(k) && typeof table[k] === "string") keys.push(k);
    return keys.sort();
}

console.log("--- Locale: CS and EN key sets are identical ---");
(function () {
    function keysFor(locale) {
        var table = tableFor(locale), keys = [];
        for (var k in table) if (table.hasOwnProperty(k) && k !== "format") keys.push(k);
        return keys.sort();
    }
    var cs = keysFor("cs_CZ"), en = keysFor("en_US");
    var onlyCs = cs.filter(function (k) { return en.indexOf(k) < 0; });
    var onlyEn = en.filter(function (k) { return cs.indexOf(k) < 0; });
    assert(onlyCs.length === 0 && onlyEn.length === 0,
        "same keys (only CS: " + onlyCs.join(",") + "; only EN: " + onlyEn.join(",") + ")");
})();

// ===== TEST: the family's words (spec 6.5, 6.7; canon 12.1, 12.2, 12.4) =====
console.log("--- Locale: Rozteč / Spacing, no '!', Czech quotes (spec 6.5, 6.7) ---");
(function () {
    var cs = tableFor("cs_CZ"), en = tableFor("en_US");
    var csKeys = stringKeys(cs), enKeys = stringKeys(en);
    var i, bad;

    bad = [];
    for (i = 0; i < csKeys.length; i++) if (/rozestup/i.test(cs[csKeys[i]])) bad.push(csKeys[i]);
    assert(bad.length === 0, "CS: no 'Rozestup' anywhere, it is 'Rozteč' (found in: " + bad.join(", ") + ")");
    assert(cs.SPACING === "Rozteč:", "CS SPACING is 'Rozteč:' (got '" + cs.SPACING + "')");
    assert(cs.EDGE_SPACING_HDR === "Rozteč", "CS EDGE_SPACING_HDR is 'Rozteč' (got '" + cs.EDGE_SPACING_HDR + "')");
    assert(cs.ZONES_PITCH === "Rozteč:", "CS ZONES_PITCH stays 'Rozteč:'");
    assert(cs.TIP_ZONES_CORNERS_ONLY.indexOf("zvolte Rozteč.") > 0, "CS tip: 'zvolte Rozteč.' (feminine, got '" + cs.TIP_ZONES_CORNERS_ONLY + "')");
    assert(cs.TIP_PATH_COUNT_PARTIAL.indexOf("řídí roztečí") > 0, "CS tip: 'řídí roztečí' (instrumental)");

    bad = [];
    for (i = 0; i < enKeys.length; i++) if (/pitch/i.test(en[enKeys[i]])) bad.push(enKeys[i]);
    assert(bad.length === 0, "EN: no 'pitch', it is 'spacing' (found in: " + bad.join(", ") + ")");
    assert(en.ZONES_PITCH === "Spacing:" && en.ZONES_MARKS_PITCH === "marks, spacing",
        "EN zones: 'Spacing:' and 'marks, spacing'");

    bad = [];
    for (i = 0; i < csKeys.length; i++) if (cs[csKeys[i]].indexOf("!") >= 0) bad.push(csKeys[i]);
    assert(bad.length === 0, "CS: no exclamation marks (found in: " + bad.join(", ") + ")");
    bad = [];
    for (i = 0; i < enKeys.length; i++) if (en[enKeys[i]].indexOf("!") >= 0) bad.push(enKeys[i]);
    assert(bad.length === 0, "EN: no exclamation marks (found in: " + bad.join(", ") + ")");

    bad = [];
    for (i = 0; i < csKeys.length; i++) {
        if (/["‘’]/.test(cs[csKeys[i]])) bad.push(csKeys[i]);
    }
    assert(bad.length === 0, "CS: names stand in „…“, never \"…\" or ‘’ (found in: " + bad.join(", ") + ")");
    assert(cs.WARN_LAYER_UNHIDDEN.indexOf("vrstva „%s“ ") > 0, "CS: the layer name is in Czech quotes");
    assert(en.WARN_LAYER_UNHIDDEN.indexOf('layer "%s" ') > 0, "EN keeps straight quotes");

    // Prefixes: two only (canon 12.1)
    assert(cs.ERR_PREFIX === "CHYBA: " && en.ERR_PREFIX === "ERROR: ", "ERR_PREFIX: 'CHYBA: ' / 'ERROR: '");
    assert(cs.WARN_PREFIX === "UPOZORNĚNÍ: " && en.WARN_PREFIX === "WARNING: ", "WARN_PREFIX unchanged");
})();

console.log("--- Locale: the preset sentences are the canon's (12.4), the critical error is 12.2 ---");
(function () {
    var cs = tableFor("cs_CZ"), en = tableFor("en_US");
    var canon = {
        PROMPT_SAVE_AS: [
            "Název nové předvolby:", "Name of the new preset:"],
        CONFIRM_OVERWRITE_PRESET: [
            "Předvolba „%s“ už existuje. Přepsat?", "Preset \"%s\" already exists. Replace it?"],
        CONFIRM_DELETE_PRESET: [
            "Smazat předvolbu „%s“? Smazání nejde vrátit.", "Delete preset \"%s\"? This cannot be undone."],
        ERR_ENTER_NAME: [
            "Zadejte název předvolby.", "Enter a preset name."],
        ERR_RESERVED_NAME: [
            "Názvy v hranatých závorkách jsou vyhrazené. Zvolte jiný název.", "Names in square brackets are reserved. Choose another name."],
        ERR_CANNOT_DELETE_DEFAULT: [
            "Výchozí předvolbu nejde smazat.", "The default preset cannot be deleted."]
    };
    for (var k in canon) if (canon.hasOwnProperty(k)) {
        assert(cs[k] === canon[k][0], "CS " + k + " is the canon's sentence (got '" + cs[k] + "')");
        assert(en[k] === canon[k][1], "EN " + k + " is the canon's sentence (got '" + en[k] + "')");
    }
    assert(cs.PRESET_DEFAULT === "[Výchozí]" && en.PRESET_DEFAULT === "[Default]", "PRESET_DEFAULT");

    // Settings not saved: the consequence (12.2)
    assert(cs.ERR_WRITE_SETTINGS === "Nastavení se nepodařilo uložit — příště se dialog otevře bez něj.",
        "CS ERR_WRITE_SETTINGS says what follows (got '" + cs.ERR_WRITE_SETTINGS + "')");
    assert(en.ERR_WRITE_SETTINGS === "The settings could not be saved — next time the dialog opens without them.",
        "EN ERR_WRITE_SETTINGS says what follows (got '" + en.ERR_WRITE_SETTINGS + "')");

    // Unexpected error: the one template (12.2), %s message, %s line
    assert(cs.ERR_CRITICAL === "Skript se zastavil kvůli neočekávané chybě: %s (řádek %s).\n\nDokument může být částečně změněný — zkontrolujte ho, případně změny vraťte (Cmd+Z). Pošlete tuto hlášku správci skriptu.",
        "CS ERR_CRITICAL is the canon's template (got '" + cs.ERR_CRITICAL + "')");
    assert(en.ERR_CRITICAL === "The script stopped on an unexpected error: %s (line %s).\n\nThe document may be partly changed — check it, or undo the changes (Cmd+Z). Send this message to the script's maintainer.",
        "EN ERR_CRITICAL is the canon's template (got '" + en.ERR_CRITICAL + "')");
    // What happened to the document, said once for the refusals of validate() (ruling R5)
    assert(cs.DOC_UNCHANGED === "Dokument nebyl změněn." && en.DOC_UNCHANGED === "The document was not changed.",
        "DOC_UNCHANGED: 'Dokument nebyl změněn.' / 'The document was not changed.'");
    assert(cs.ERR_UNEXPECTED === undefined && en.ERR_UNEXPECTED === undefined,
        "ERR_UNEXPECTED is gone: ERR_CRITICAL replaced it");
    assert(cs.ERR_NO_DOC === "Před spuštěním skriptu otevřete dokument.", "ERR_NO_DOC is the canon's text, unchanged");
    assert(cs.format(String(cs.ERR_CRITICAL), "boom", "42").indexOf("boom (řádek 42).") > 0, "the line number is in Czech: '(řádek 42)'");
})();

console.log("--- Locale: the reasons for a grey Generate (spec 5; canon 12.1, 12.6) ---");
(function () {
    var cs = tableFor("cs_CZ"), en = tableFor("en_US");
    var exp = {
        REASON_MARK:      ["✗ ", "✗ "],
        REASON_FIELD:     ["%s: zadejte číslo od %s do %s%s.", "%s: enter a number from %s to %s%s."],
        REASON_FIELD_INT: ["%s: zadejte celé číslo od %s do %s.", "%s: enter a whole number from %s to %s."],
        REASON_MANY:      ["Neplatná pole: %s — opravte červená pole.", "Invalid fields: %s — fix the red fields."],
        REASON_NO_SHAPE:  ["Značka nemá tvar — zapněte Kruh nebo Kříž.", "The mark has no shape — turn on Circle or Cross."],
        REASON_NO_EDGE:   ["Není zapnutá žádná hrana.", "No edge is turned on."]
    };
    for (var k in exp) if (exp.hasOwnProperty(k)) {
        assert(cs[k] === exp[k][0], "CS " + k + " (got '" + cs[k] + "')");
        assert(en[k] === exp[k][1], "EN " + k + " (got '" + en[k] + "')");
    }
    // The count stands after the colon, never before the noun (canon 12.1)
    assert(/Neplatná pole: %s/.test(cs.REASON_MANY), "CS: the count of fields stands after the colon");
    assert(/Invalid fields: %s/.test(en.REASON_MANY), "EN: the count of fields stands after the colon");
})();

console.log("--- Locale: the drawing scale (spec 4.3, 5; canon 12.1) ---");
(function () {
    var cs = tableFor("cs_CZ"), en = tableFor("en_US");
    assert(cs.SCALE_LABEL === "Měřítko kresby 1:" && en.SCALE_LABEL === "Drawing scale 1:",
        "SCALE_LABEL: the family's label, ends with the colon (got '" + cs.SCALE_LABEL + "' / '" + en.SCALE_LABEL + "')");
    // The short ending: measured in Illustrator 30.8.2 on 2026-10-21, the CS
    // dialog is 583 px wide with " · měřítko 1:99,9" and 535 px with
    // " · 1:99,9" (EN 566 / 534; 1.3.0 was 521 px).
    assert(cs.INFO_SCALE === " · 1:%s" && en.INFO_SCALE === " · 1:%s",
        "INFO_SCALE: the short ending of the grey line, ' · 1:N' (got '" + cs.INFO_SCALE + "' / '" + en.INFO_SCALE + "')");
    assert(cs.SCALE_FIELD === "Měřítko kresby" && en.SCALE_FIELD === "Drawing scale",
        "SCALE_FIELD: the field's name in a reason, no colon (got '" + cs.SCALE_FIELD + "' / '" + en.SCALE_FIELD + "')");
    assert(typeof cs.TIP_SCALE === "string" && cs.TIP_SCALE.indexOf("1:10") >= 0 && cs.TIP_SCALE.indexOf("zapamatuje") > 0 &&
        cs.TIP_SCALE.indexOf("skutečné velikosti") > 0, "CS TIP_SCALE: 1:10, the document remembers it, real size (got '" + cs.TIP_SCALE + "')");
    assert(typeof en.TIP_SCALE === "string" && en.TIP_SCALE.indexOf("1:10") >= 0 && en.TIP_SCALE.indexOf("remembers") > 0 &&
        en.TIP_SCALE.indexOf("real-world") > 0, "EN TIP_SCALE: 1:10, the document remembers it, real-world size (got '" + en.TIP_SCALE + "')");
    assert(cs.format(cs.INFO_SCALE, "2,5") === " · 1:2,5" && en.format(en.INFO_SCALE, "10") === " · 1:10", "INFO_SCALE takes the scale once");
    // Czech wording: vykání, no quotes, no '!' (the generic locale tests cover every key too)
    assert(!/[!"]/.test(cs.TIP_SCALE + cs.SCALE_LABEL + cs.INFO_SCALE + cs.SCALE_FIELD), "CS: no '!' and no straight quote in the new texts");
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
