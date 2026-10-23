#!/usr/bin/env node
/**
 * UI Layout / HIG Conformance Test Suite
 *
 * Loads ui.js with mocked ScriptUI, calls buildDialog(), and asserts on the
 * resulting tree against Adobe ScriptUI conventions and our internal style:
 *
 *   - Window: margins, spacing, title with version
 *   - Panels: margins (12px), spacing (8-10px)
 *   - Buttons: helpTip on every interactive button, OK/Cancel naming
 *   - Footer: Cancel/Generate right (factory Defaults lives in Document panel)
 *   - Numeric edit texts: 56px width (addRow value subgroup)
 *   - Dropdowns: reasonable widths (130-200px)
 *   - Mode selector: two radios (Zünd/Summa); ZUND adds gapInner+orient; SUMMA adds feedTop/Bottom + drawRed
 *   - Layer mapping: rows have Layer / Color / Remove; +Add button below
 *   - Modified indicator: asterisk appears when UI diverges from active preset
 *   - Save button enabled state: off when unmodified, on when modified
 *
 * NOT covered: real pixel rendering, OS theming, font metrics.
 *
 * Usage: node tests/test_ui_layout.js
 */

var fs   = require("fs");
var path = require("path");
var SUI  = require("./lib/mock_scriptui.js");

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


// ===== Setup =====
SUI.install();

var ZSM = {};
ZSM.L = {
    ERROR_PREFIX: "ERR: ", ERR_MUST_BE_NUMBER: "%s nan", ERR_OUT_OF_RANGE: "%s range",
    ERR_NO_DOC: "no doc", ERR_NO_SEL: "no sel", ERR_CRITICAL: "critical: ",
    ERR_RENDER_CRITICAL: "render: ", ERR_GENERIC: "%s", ERR_COLOR_MISSING: "%s missing",
    ERR_PRESET_DEL_DEF: "no del", ERR_PRESET_EXISTS: "exists?", ERR_RESERVED_NAME: "reserved",
    ERR_WRITE_SETTINGS: "write fail", ERR_LAY_COLOR: "lay %s", ERR_SWATCH: "swatch %s",
    PRESET_DEFAULT: "[Default]", PRESET_LABEL: "Preset:",
    PROMPT_NEW_PRESET: "Name?", PROMPT_SAVE_AS: "Save as?",
    BTN_SAVE: "Save", BTN_SAVE_AS: "Save As…", BTN_DEL: "Delete", BTN_RESET: "Defaults",
    BTN_OK: "Generate", BTN_CANCEL: "Cancel", BTN_ADD_LAYER: "+ Add",
    PANEL_PRESET: "Presets", PANEL_OUTPUT: "Output Settings", PANEL_GEO: "Gaps",
    LBL_SOURCE: "Source:",
    PANEL_FEED: "Feed", PANEL_LAYERS: "Layers",
    LBL_MODE: "Mode:", MODE_ZUND: "ZUND", MODE_SUMMA: "SUMMA",
    SRC_AUTO: "Auto", SRC_FIXED: "Fixed",
    GAP_GZ: "Gap from graphics:", GAP_ZO: "Gap from edge:", MAX_DIST: "Max dist:",
    MARK_SIZE_Z: "Zünd Size:", MARK_SIZE_S: "Summa Size:", MARK_COLOR: "Color:",
    ORIENT_DIST: "Orient dist:", FEED_TOP: "Feed top:", FEED_BOT: "Feed bottom:",
    DRAW_RED: "Trim lines",
    COL_COLOR: "Color", COL_LAYER: "Layer", PRESET_PLACEHOLDER: "My Preset",
    TIP_MODE: "tip", TIP_SRC_AUTO: "tip", TIP_SRC_FIXED: "tip",
    TIP_GAP_GZ: "tip", TIP_GAP_ZO: "tip", TIP_MAX_DIST: "tip",
    TIP_SIZE_Z: "tip", TIP_SIZE_S: "tip", TIP_MARK_COLOR: "tip",
    TIP_ORIENT_DIST: "tip", TIP_FEED_TOP: "tip", TIP_FEED_BOT: "tip", TIP_DRAW_RED: "tip",
    TIP_LAY_COLOR: "tip", TIP_LAY_NAME: "tip", TIP_BTN_REMOVE: "tip", TIP_BTN_ADD: "tip",
    TIP_SAVE: "tip", TIP_SAVE_AS: "tip", TIP_DEL: "tip", TIP_RESET: "tip",
    TIP_OK: "tip", TIP_CANCEL: "tip", TIP_PRESET: "tip", TIP_REVERT: "tip",
    DEF_CUT: "Cut", DEF_KISS: "Kiss-cut",
    // v26.6.0 audit additions
    PANEL_DOC: "Document",
    SCALE_CHECKBOX: "Work at scale", TIP_SCALE_CHECKBOX: "tip",
    SCALE_FIELD_LABEL: "1:", TIP_SCALE_FIELD: "tip",
    MARKS_ONLY: "Marks only", TIP_MARKS_ONLY: "tip",
    CONFIRM_DEL_PRESET: "del %s?",
    STATUS_INVALID: "fix", STATUS_LAYER_NAME: "name",
    STATUS_RANGE: "%s range %s–%s", STATUS_RANGE_MULTI: "%s out of range",
    STATUS_OK: "%s · layers: %s", STATUS_OK_MARKS: "%s · marks only",
    STATUS_DUP_COLOR: "dup %s",
    format: function (template) {
        var args = []; for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
        var idx = 0;
        return template.replace(/%s/g, function () { return idx < args.length ? String(args[idx++]) : "%s"; });
    }
};
ZSM.Config = {
    layerRegmarks: "Regmarks", layerGraphics: "Graphics", layerTrim: "Trim", PRESET_KEY_DEFAULT: "[Default]",
    summaXCenter: 10, summaYVisual: 10, redLineWidth: 1, debug: false,
    zundSize: 5, summaSize: 3,
    ui: { title: "Zünd & Summa Marks v26.4.0" },
    getDefaults: function () {
        return {
            mode: "ZUND",
            gapInner: 5, gapOuter: 0, maxDist: 500,
            feedTop: 70, feedBottom: 50,
            drawRed: true, useArtboardBounds: false,
            markSizeZ: 5, markSizeS: 3, orientDist: 100,
            markColor: "[Registration]",
            scaleN: 1,                                    // Phase 2 default
            marksOnly: false,                             // Phase 3 default
            layers: [{ name: "Cut", color: "[Registration]" }]
        };
    },
    Storage: {
        save: function () {},
        load: function () { return null; }
    }
};

// Load production utility modules (no DOM dependencies)
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
require("./lib/load_shared.js")(ZSM, ["numbers", "field_paint"]);   // shared: ZSM.Numbers, ZSM.FieldPaint, bound the way the build does
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "validation.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "..", "shared", "lib", "ui_state.js"), "utf8"));
buildUIState(ZSM);   // shared core module — bind to ZSM

// Stub ZSM.Draw with deterministic test data (no Illustrator DOM needed)
ZSM.Draw = {
    getSwatchNames: function () { return ["[Registration]", "Cut", "Thru-cut", "Kiss-cut"]; },
    getSwatchRGBMap: function () {
        return { "[Registration]": "REG", "Cut": [1, 0, 0, 1], "Thru-cut": [0, 1, 0, 1], "Kiss-cut": [0, 0, 1, 1] };
    },
    getLayerNames: function () { return ["Cut", "Thru-cut", "Kiss-cut", "Score", "White"]; },
    detectCutColor: function () { return "Cut"; }
};

// Load ui.js — ZSM.UI now exists
eval(fs.readFileSync(path.join(__dirname, "..", "src", "ui.js"), "utf8"));

/** Helper: build a fresh dialog and return the captured Window. */
function buildAndCapture(mode, pData) {
    pData = pData || {
        activePreset: "[Default]",
        presets: { "[Default]": ZSM.Config.getDefaults() }
    };
    var docData = {
        swatches: ZSM.Draw.getSwatchNames(),
        swatchRGB: ZSM.Draw.getSwatchRGBMap(),
        layers: ZSM.Draw.getLayerNames(),
        detectedColor: ZSM.Draw.detectCutColor()
    };
    ZSM.UI.buildDialog(mode, pData, docData);
    return SUI.lastWindow();
}


// =====================================================
// TEST 1: Window structure (title + outer dimensions)
// =====================================================
console.log("\n=== TEST 1: Window structure ===");
var w = buildAndCapture("ZUND");
assert(w !== null, "Window built");
assertEq(w.kind, "dialog", "Window kind = dialog");
assert(/v\d+\.\d+/.test(w.text), "Window title contains version (matches /v\\d\\.\\d/)");
assert(w.text.indexOf("Zünd") >= 0 && w.text.indexOf("Summa") >= 0,
    "Window title contains both 'Zünd' and 'Summa'");

// HIG: Window margins recommended 16-20px. Margins are an explicit
// [left, top, right, bottom] array (v26.6.0 §2.9) — check each side is sane:
// horizontal 16-20, vertical 12-16 (slightly tighter top/bottom).
var m = w.margins;
assert(Object.prototype.toString.call(m) === "[object Array]" && m.length === 4,
    "Window margins is a 4-tuple [l,t,r,b] (got " + JSON.stringify(m) + ")");
if (m && m.length === 4) {
    assert(m[0] >= 16 && m[0] <= 20 && m[2] >= 16 && m[2] <= 20,
        "Window horizontal margins 16-20 (got l=" + m[0] + ", r=" + m[2] + ")");
    assert(m[1] >= 12 && m[1] <= 16 && m[3] >= 12 && m[3] <= 16,
        "Window vertical margins 12-16 (got t=" + m[1] + ", b=" + m[3] + ")");
}
// HIG: Window spacing recommended 12-15px
assert(w.spacing >= 8 && w.spacing <= 15,
    "Window spacing in HIG range 8-15 (got " + w.spacing + ")");

// Width is deliberately NOT set on the window: the layout manager overwrites a
// container's preferredSize (measured in Illustrator 30.8.1 — setting 390 gives
// a 312px window). Assert the mechanism that actually controls width instead of
// the one that silently did nothing.
assert(String(w.alignChildren).indexOf("fill") !== -1,
    "Window alignChildren cascades fill (got " + w.alignChildren + ")");


// =====================================================
// TEST 2: All panels have HIG-conformant margins
// =====================================================
console.log("\n=== TEST 2: Panel margins ===");
var panels = w.find(function (c) { return c.type === "panel"; });
assert(panels.length >= 4, "Dialog has at least 4 panels (got " + panels.length + ")");
for (var i = 0; i < panels.length; i++) {
    var p = panels[i];
    assertEq(p.margins, 12,
        "Panel '" + p.text + "' has margins=12");
}


// =====================================================
// TEST 3: Footer button order — Cancel left | Generate right
// =====================================================
console.log("\n=== TEST 3: Footer layout (HIG button order) ===");
var okBtn    = w.findOne(function (c) { return c.type === "button" && c.name === "ok"; });
var cancelBtn= w.findOne(function (c) { return c.type === "button" && c.name === "cancel"; });

assert(okBtn    !== null, "OK button exists with name='ok'");
assert(cancelBtn!== null, "Cancel button exists with name='cancel'");

// "Defaults" (factory reset) lives in the Document panel, NOT the footer.
var resetBtn = w.findOne(function (c) { return c.type === "button" && c.text === ZSM.L.BTN_RESET; });
assert(resetBtn !== null, "Defaults (factory reset) button exists");
if (okBtn) {
    var footerHasReset = okBtn.parent.children.filter(function (c) {
        return c.type === "button" && c.text === ZSM.L.BTN_RESET;
    }).length > 0;
    assertEq(footerHasReset, false, "Defaults button is NOT in the footer group");
}

// Cancel/OK are siblings within the same group, OK after Cancel
if (okBtn && cancelBtn) {
    assertEq(okBtn.parent, cancelBtn.parent, "Cancel and OK share the same parent group");
    var siblings = okBtn.parent.children;
    var idxCancel = siblings.indexOf(cancelBtn);
    var idxOk = siblings.indexOf(okBtn);
    assert(idxOk > idxCancel,
        "OK is added after Cancel in parent (right-of-Cancel order, idxCancel=" + idxCancel + ", idxOk=" + idxOk + ")");
}


// =====================================================
// TEST 4: HelpTip coverage on all interactive buttons
// =====================================================
console.log("\n=== TEST 4: HelpTip coverage ===");
var allButtons = w.find(function (c) { return c.type === "button"; });
var btnsMissingTip = 0;
for (var b = 0; b < allButtons.length; b++) {
    if (!allButtons[b].helpTip) {
        // Layer-row "−" remove button is acceptable (has TIP_BTN_REMOVE)
        // List for diagnostic only
        btnsMissingTip++;
        console.log("    (info) button without helpTip: text='" + allButtons[b].text + "' name='" + allButtons[b].name + "'");
    }
}
assert(btnsMissingTip === 0, "All buttons have helpTip (missing: " + btnsMissingTip + ")");

var allDropdowns = w.find(function (c) { return c.type === "dropdownlist"; });
var ddMissingTip = 0;
for (var d = 0; d < allDropdowns.length; d++) {
    if (!allDropdowns[d].helpTip) ddMissingTip++;
}
assert(ddMissingTip === 0, "All dropdowns have helpTip (missing: " + ddMissingTip + ")");


// =====================================================
// TEST 5: Numeric edit text widths (HIG: 60px)
// =====================================================
console.log("\n=== TEST 5: Numeric edit text widths ===");
var allEdits = w.find(function (c) { return c.type === "edittext"; });
// Numeric edit-texts built via addRow live in a 130px value subgroup and are
// M.NUM_FIELD (56px) wide (gap, maxDist, markSize, orientDist, etScale). The
// layer-name field (M.ET_LAYER) is a different axis and is excluded here.
var numericEdits = allEdits.filter(function (e) {
    return e.preferredSize.width === 56;
});
assert(numericEdits.length >= 4,
    "At least 4 numeric edit texts have width=56 (got " + numericEdits.length + ")");


// =====================================================
// TEST 6: Dropdown widths in HIG range
// =====================================================
console.log("\n=== TEST 6: Dropdown widths ===");
for (var dd = 0; dd < allDropdowns.length; dd++) {
    var w_dd = allDropdowns[dd];
    if (w_dd.preferredSize.width === -1) continue;  // alignment="fill" = no fixed width
    assert(w_dd.preferredSize.width >= 100 && w_dd.preferredSize.width <= 250,
        "Dropdown width 100-250px (got " + w_dd.preferredSize.width + ")");
}


// =====================================================
// TEST 7: ZUND-specific controls present
// =====================================================
console.log("\n=== TEST 7: ZUND-specific layout ===");
w = buildAndCapture("ZUND");
// ZUND has source radio buttons (Auto / Fixed)
var radios = w.find(function (c) { return c.type === "radiobutton"; });
assert(radios.length >= 2, "ZUND: at least 2 radio buttons (Auto/Fixed)");
// ZUND has gapInner row — search by static text label
var hasGapInner = w.findOne(function (c) {
    return c.type === "statictext" && c.text === ZSM.L.GAP_GZ;
}) !== null;
assert(hasGapInner, "ZUND: GAP_GZ (gap from graphics) row exists");
var hasMarkZ = w.findOne(function (c) {
    return c.type === "statictext" && c.text === ZSM.L.MARK_SIZE_Z;
}) !== null;
assert(hasMarkZ, "ZUND: MARK_SIZE_Z label exists");

// ZUND should NOT have feed/drawRed
var hasDrawRed = w.findOne(function (c) {
    return c.type === "checkbox" && c.text === ZSM.L.DRAW_RED;
}) !== null;
assertEq(hasDrawRed, false, "ZUND: no drawRed checkbox");
var hasFeedTop = w.findOne(function (c) {
    return c.type === "statictext" && c.text === ZSM.L.FEED_TOP;
}) !== null;
assertEq(hasFeedTop, false, "ZUND: no feedTop row");


// =====================================================
// TEST 8: SUMMA-specific controls present
// =====================================================
console.log("\n=== TEST 8: SUMMA-specific layout ===");
w = buildAndCapture("SUMMA");
// SUMMA has feedTop, feedBottom, drawRed
hasFeedTop = w.findOne(function (c) {
    return c.type === "statictext" && c.text === ZSM.L.FEED_TOP;
}) !== null;
assert(hasFeedTop, "SUMMA: FEED_TOP label exists");
var hasFeedBot = w.findOne(function (c) {
    return c.type === "statictext" && c.text === ZSM.L.FEED_BOT;
}) !== null;
assert(hasFeedBot, "SUMMA: FEED_BOT label exists");
hasDrawRed = w.findOne(function (c) {
    return c.type === "checkbox" && c.text === ZSM.L.DRAW_RED;
}) !== null;
assert(hasDrawRed, "SUMMA: drawRed checkbox exists");
var hasMarkS = w.findOne(function (c) {
    return c.type === "statictext" && c.text === ZSM.L.MARK_SIZE_S;
}) !== null;
assert(hasMarkS, "SUMMA: MARK_SIZE_S label exists");

// SUMMA should NOT have ZUND-specific controls
hasGapInner = w.findOne(function (c) {
    return c.type === "statictext" && c.text === ZSM.L.GAP_GZ;
}) !== null;
assertEq(hasGapInner, false, "SUMMA: no GAP_GZ row");
// Mode is now a 2-radio selector (Zünd/Summa) present in both modes; SUMMA has
// only those two (no Auto-fit/Fixed source radios — those are ZUND-only).
radios = w.find(function (c) { return c.type === "radiobutton"; });
assertEq(radios.length, 2, "SUMMA: exactly 2 radio buttons (mode selector only)");
var radioTexts = radios.map(function (r) { return r.text; });
assert(radioTexts.indexOf(ZSM.L.MODE_ZUND) !== -1 && radioTexts.indexOf(ZSM.L.MODE_SUMMA) !== -1,
    "SUMMA: the 2 radios are the Zünd/Summa mode selector");


// =====================================================
// TEST 9: Mode selector — two radio buttons in Output Settings panel
// =====================================================
console.log("\n=== TEST 9: Mode radio selector ===");
w = buildAndCapture("ZUND");
var techPanel = w.findOne(function (c) {
    return c.type === "panel" && c.text === ZSM.L.PANEL_OUTPUT;
});
assert(techPanel !== null, "Output Settings panel exists");
var modeRadios = techPanel ? techPanel.find(function (c) {
    return c.type === "radiobutton" &&
        (c.text === ZSM.L.MODE_ZUND || c.text === ZSM.L.MODE_SUMMA);
}) : [];
assertEq(modeRadios.length, 2, "Mode selector has 2 radios (Zünd/Summa) in Output Settings panel");
var modeRadioTexts = modeRadios.map(function (r) { return r.text; });
assert(modeRadioTexts.indexOf(ZSM.L.MODE_ZUND) !== -1, "Mode selector has 'ZUND' radio");
assert(modeRadioTexts.indexOf(ZSM.L.MODE_SUMMA) !== -1, "Mode selector has 'SUMMA' radio");


// =====================================================
// TEST 10: Layer mapping panel structure
// =====================================================
console.log("\n=== TEST 10: Layer mapping panel ===");
w = buildAndCapture("ZUND");
var layerPanel = w.findOne(function (c) {
    return c.type === "panel" && c.text === ZSM.L.PANEL_LAYERS;
});
assert(layerPanel !== null, "Layer mapping panel exists");
if (layerPanel) {
    // Add button with text BTN_ADD_LAYER
    var addBtn = layerPanel.findOne(function (c) {
        return c.type === "button" && c.text === ZSM.L.BTN_ADD_LAYER;
    });
    assert(addBtn !== null, "Layer panel: +Add button exists");
    // At least 1 row with a layer-name dropdown + color dropdown + remove button
    var dropdownsInPanel = layerPanel.find(function (c) { return c.type === "dropdownlist"; });
    assert(dropdownsInPanel.length >= 2,
        "Layer panel has at least 2 dropdowns (1 name + 1 color in default row, got " + dropdownsInPanel.length + ")");
}


// =====================================================
// TEST 11: Preset panel — Save / SaveAs / Delete buttons
// =====================================================
console.log("\n=== TEST 11: Preset panel buttons ===");
w = buildAndCapture("ZUND");
var presetPanel = w.findOne(function (c) {
    return c.type === "panel" && c.text === ZSM.L.PANEL_PRESET;
});
assert(presetPanel !== null, "Preset panel exists");
if (presetPanel) {
    var btnSave = presetPanel.findOne(function (c) {
        return c.type === "button" && c.text === ZSM.L.BTN_SAVE;
    });
    var btnSaveAs = presetPanel.findOne(function (c) {
        return c.type === "button" && c.text === ZSM.L.BTN_SAVE_AS;
    });
    var btnDel = presetPanel.findOne(function (c) {
        return c.type === "button" && c.text === ZSM.L.BTN_DEL;
    });
    assert(btnSave !== null, "Preset panel: Save button exists");
    assert(btnSaveAs !== null, "Preset panel: Save As button exists");
    assert(btnDel !== null, "Preset panel: Delete button exists");
}


// =====================================================
// TEST 12: Save button initial enabled state
// =====================================================
console.log("\n=== TEST 12: Save button enabled state (unmodified = disabled) ===");
// Fresh dialog with [Default] active and matching UI values → not modified → Save disabled
var pData = {
    activePreset: "[Default]",
    presets: { "[Default]": ZSM.Config.getDefaults() }
};
w = buildAndCapture("ZUND", pData);
var saveBtn = w.findOne(function (c) {
    return c.type === "button" && c.text === ZSM.L.BTN_SAVE;
});
assert(saveBtn !== null, "Save button found");
if (saveBtn) {
    assertEq(saveBtn.enabled, false,
        "Save: initially disabled (UI matches active preset)");
}


// =====================================================
// TEST 13: Mode radio reflects built mode (SUMMA radio checked)
// =====================================================
console.log("\n=== TEST 13: Mode radio reflects current mode ===");
w = buildAndCapture("SUMMA");
techPanel = w.findOne(function (c) {
    return c.type === "panel" && c.text === ZSM.L.PANEL_OUTPUT;
});
var rbSummaSel = techPanel ? techPanel.findOne(function (c) {
    return c.type === "radiobutton" && c.text === ZSM.L.MODE_SUMMA;
}) : null;
var rbZundSel = techPanel ? techPanel.findOne(function (c) {
    return c.type === "radiobutton" && c.text === ZSM.L.MODE_ZUND;
}) : null;
if (rbSummaSel && rbZundSel) {
    assertEq(rbSummaSel.value, true, "SUMMA dialog: Summa radio is checked");
    assertEq(rbZundSel.value, false, "SUMMA dialog: Zünd radio is unchecked");
}


// =====================================================
// TEST 14: ZUND mark size = 5 by default in dialog
// =====================================================
console.log("\n=== TEST 14: Default value population ===");
w = buildAndCapture("ZUND");
var allEdits2 = w.find(function (c) { return c.type === "edittext"; });
// At least one edit text has a numeric value matching getDefaults
var numericValues = allEdits2.map(function (e) { return e.text; }).filter(function (t) {
    return /^[\d.,]+$/.test(t);
});
assert(numericValues.length >= 4, "Multiple numeric edit texts populated (got " + numericValues.length + ")");


// =====================================================
// TEST 15: Asterisk indicator after UI value diverges from preset
// =====================================================
console.log("\n=== TEST 15: Modified indicator (visual asterisk) ===");
// Build with [Default] active. Change one edit text to differ. Trigger refresh.
pData = {
    activePreset: "[Default]",
    presets: { "[Default]": ZSM.Config.getDefaults() }
};
w = buildAndCapture("ZUND", pData);
// Find the gapInner edit-text (label GAP_GZ followed by edittext)
var gapLabel = w.findOne(function (c) {
    return c.type === "statictext" && c.text === ZSM.L.GAP_GZ;
});
// addRow nests the edittext inside a value subgroup, so search the whole row
// group (label + value subgroup) rather than only direct siblings.
var gapEdit = null;
if (gapLabel) {
    gapEdit = gapLabel.parent.findOne(function (c) { return c.type === "edittext"; });
}
assert(gapEdit !== null, "Found gapInner edit text in its row group");

if (gapEdit && gapEdit.onChanging) {
    // Modify and fire onChanging (which invokes refreshModifiedIndicator)
    gapEdit.text = "999";
    try { gapEdit.onChanging(); } catch (e) {}
    // Now inspect dropdown items for asterisk
    var presetDD = w.findOne(function (c) {
        return c.type === "dropdownlist" &&
               c.parent && c.parent.parent &&
               c.parent.parent.type === "panel" &&
               c.parent.parent.text === ZSM.L.PANEL_PRESET;
    });
    if (presetDD && presetDD.selection) {
        assert(/\*/.test(presetDD.selection.text),
            "Dropdown shows asterisk after UI change (got '" + presetDD.selection.text + "')");
    }
    // Save button now enabled
    saveBtn = w.findOne(function (c) {
        return c.type === "button" && c.text === ZSM.L.BTN_SAVE;
    });
    if (saveBtn) {
        assertEq(saveBtn.enabled, true, "Save button enabled after UI change");
    }
}


// =====================================================
// TEST 16: Duplicate colour mapping blocks Generate
// =====================================================
// Two layer rows mapped to the SAME spot colour is a contradiction — movePaths
// routes all paths of that colour to the last row, silently emptying the other.
// liveValidateAll must detect it (canonical compare) and gate Generate.
console.log("\n=== TEST 16: Duplicate colour blocks Generate ===");

function presetWithLayers(layers) {
    var d = ZSM.Config.getDefaults();
    d.layers = layers;
    return { activePreset: "[Default]", presets: { "[Default]": d } };
}

// Duplicate: two rows both mapped to "Cut" → blocked.
w = buildAndCapture("ZUND", presetWithLayers([
    { name: "Cut",      color: "Cut" },
    { name: "Kiss-cut", color: "Cut" }
]));
var okDup = w.findOne(function (c) { return c.type === "button" && c.name === "ok"; });
assert(okDup !== null && okDup.enabled === false,
    "Duplicate colour: Generate is disabled");
var dupStatus = w.findOne(function (c) {
    return c.type === "statictext" && /dup/.test(c.text || "");
});
assert(dupStatus !== null, "Duplicate colour: status names the duplicate");

// Distinct colours: no false positive → Generate enabled.
w = buildAndCapture("ZUND", presetWithLayers([
    { name: "Cut",      color: "Cut" },
    { name: "Kiss-cut", color: "Kiss-cut" }
]));
var okDistinct = w.findOne(function (c) { return c.type === "button" && c.name === "ok"; });
assert(okDistinct !== null && okDistinct.enabled === true,
    "Distinct colours: Generate stays enabled (no false positive)");


// =====================================================
// TEST 17 (review K5): a preset of the other mode reopens the dialog in it
// =====================================================
// setUIValues fills only the current mode's controls and ignores obj.mode:
// picking a SUMMA preset in the ZUND dialog loaded its values into the ZUND
// fields, the dialog stayed ZUND and Generate drew Zünd marks — only a "*"
// hinted at it. Revert did the same. Drive the real ZSM.UI.show() mode loop:
// each show() of the mock runs the next scripted step on that dialog.
console.log("\n=== TEST 17 (review K5): preset of the other mode switches the dialog ===");
function runDialogs(pData, steps) {
    var shown = [];
    SUI.MockWindow.prototype.show = function () {
        shown.push(this);
        var step = steps[shown.length - 1];
        if (step) step(this);
        return 0;
    };
    try { ZSM.UI.show(pData); } finally { delete SUI.MockWindow.prototype.show; }
    return shown;
}
function k5PresetDD(win) {
    return win.findOne(function (c) {
        return c.type === "dropdownlist" && c.parent && c.parent.parent &&
               c.parent.parent.type === "panel" && c.parent.parent.text === ZSM.L.PANEL_PRESET;
    });
}
function fieldText(win, label) {
    var lbl = win.findOne(function (c) { return c.type === "statictext" && c.text === label; });
    var et = lbl ? lbl.parent.findOne(function (c) { return c.type === "edittext"; }) : null;
    return et ? et.text : null;
}
function radioOn(win, label) {
    var rb = win.findOne(function (c) { return c.type === "radiobutton" && c.text === label; });
    return rb ? rb.value : null;
}
function pick(win, name) {
    var dd = k5PresetDD(win);
    for (var i = 0; i < dd.items.length; i++) {
        if (dd.items[i].text.indexOf(name) === 0) { dd.selection = i; dd.onChange(); return; }
    }
    throw new Error("preset not in dropdown: " + name);
}
function bannerPresets() {
    var banner = ZSM.Config.getDefaults();
    banner.mode = "SUMMA"; banner.feedTop = 123; banner.markSizeS = 4;
    var zundGap = ZSM.Config.getDefaults();
    zundGap.gapInner = 17;
    return { "[Default]": ZSM.Config.getDefaults(), "Banner": banner, "Gap17": zundGap };
}

// (a) ZUND dialog, pick the SUMMA preset → the dialog reopens as SUMMA with its values
var pK5 = { activePreset: "[Default]", presets: bannerPresets() };
var closeCode = null, afterSwitch = {};
var shownK5 = runDialogs(pK5, [
    function (win) { win.close = function (c) { closeCode = c; }; pick(win, "Banner"); },
    function (win) {
        afterSwitch.summaOn = radioOn(win, ZSM.L.MODE_SUMMA);
        afterSwitch.feedTop = fieldText(win, ZSM.L.FEED_TOP);
        afterSwitch.size    = fieldText(win, ZSM.L.MARK_SIZE_S);
        afterSwitch.preset  = k5PresetDD(win).selection ? k5PresetDD(win).selection.text : null;
    }
]);
assertEq(closeCode, 2, "picking a SUMMA preset closes the ZUND dialog as a mode switch");
assertEq(shownK5.length, 2, "the dialog is shown again");
assertEq(afterSwitch.summaOn, true, "the new dialog is SUMMA");
assertEq(afterSwitch.feedTop, "123", "the new dialog shows the preset's feed");
assertEq(afterSwitch.size, "4", "the new dialog shows the preset's Summa size");
assertEq(afterSwitch.preset, "Banner", "the preset is active and unmodified (no asterisk)");
assertEq(pK5.activePreset, "Banner", "activePreset = the picked preset");
assert(pK5.presets["[Last Settings]"] !== pK5.presets["Banner"],
    "[Last Settings] is a copy, not the named preset itself");
assertEq(pK5.presets["Banner"].feedTop, 123, "the named preset is unchanged");

// (b) same-mode preset: values load in place, no second dialog
var pK5b = { activePreset: "[Default]", presets: bannerPresets() };
var gapAfter = null;
var shownK5b = runDialogs(pK5b, [
    function (win) { pick(win, "Gap17"); gapAfter = fieldText(win, ZSM.L.GAP_GZ); }
]);
assertEq(shownK5b.length, 1, "same-mode preset: no mode switch");
assertEq(gapAfter, "17", "same-mode preset: values loaded into the open dialog");

// (c) Revert with a SUMMA preset active in a ZUND dialog → back to SUMMA
var pK5c = { activePreset: "Banner", presets: bannerPresets() };
pK5c.presets["[Last Settings]"] = ZSM.Config.getDefaults();   // last run: ZUND
var revert = {};
var shownK5c = runDialogs(pK5c, [
    function (win) {
        revert.startZund = radioOn(win, ZSM.L.MODE_ZUND);
        win.findOne(function (c) { return c.type === "button" && c.text === "↺"; }).onClick();
    },
    function (win) {
        revert.summaOn = radioOn(win, ZSM.L.MODE_SUMMA);
        revert.feedTop = fieldText(win, ZSM.L.FEED_TOP);
        revert.preset  = k5PresetDD(win).selection ? k5PresetDD(win).selection.text : null;
    }
]);
assertEq(revert.startZund, true, "revert: the dialog starts in ZUND (last run)");
assertEq(shownK5c.length, 2, "revert to a SUMMA preset reopens the dialog");
assertEq(revert.summaOn, true, "revert: the new dialog is SUMMA");
assertEq(revert.feedTop, "123", "revert: the preset's values");
assertEq(revert.preset, "Banner", "revert: the preset shows unmodified");


// =====================================================
// TEST 18 (audit A2): the factory preset maps to the detected cut colour
// =====================================================
// The stored factory row "Cut ← [Registration]" is skipped with a warning on
// every run (registration cannot identify cut paths), so every run with
// [Default] ended in a warning the operator learnt to dismiss. [Default] is
// never saved by the user, so it is rebuilt per document with the cut colour
// ZSM.Draw.detectCutColor() finds; user presets stay as saved.
console.log("\n=== TEST 18 (audit A2): factory preset uses the detected cut colour ===");
function mappingColour(win) {
    var pLay = win.findOne(function (c) { return c.type === "panel" && c.text === ZSM.L.PANEL_LAYERS; });
    var dds = pLay ? pLay.find(function (c) { return c.type === "dropdownlist"; }) : [];
    for (var i = 0; i < dds.length; i++) {
        var isLayerList = false;
        for (var j = 0; j < dds[i].items.length; j++) if (dds[i].items[j].text === "Score") isLayerList = true;
        if (!isLayerList) return dds[i].selection ? dds[i].selection.text : null;
    }
    return null;
}
var mineA2 = ZSM.Config.getDefaults();
mineA2.gapInner = 9;
var pA2 = { activePreset: "[Default]", presets: { "[Default]": ZSM.Config.getDefaults(), "Mine": mineA2 } };
var a2 = {};
runDialogs(pA2, [function (win) {
    a2.colour = mappingColour(win);
    a2.preset = k5PresetDD(win).selection ? k5PresetDD(win).selection.text : null;
}]);
assertEq(a2.colour, "Cut", "[Default]: mapping row shows the detected cut colour");
assertEq(a2.preset, "[Default]", "[Default] shows unmodified (no asterisk)");
assertEq(pA2.presets["[Default]"].layers[0].color, "Cut", "[Default] rebuilt with the detected colour");
assertEq(pA2.presets["Mine"].layers[0].color, "[Registration]", "user presets stay as saved");

var origDetectA2 = ZSM.Draw.detectCutColor;
ZSM.Draw.detectCutColor = function () { return "[Registration]"; };
var pA2b = { activePreset: "[Default]", presets: { "[Default]": ZSM.Config.getDefaults() } };
runDialogs(pA2b, [function () {}]);
assertEq(pA2b.presets["[Default]"].layers[0].color, "[Registration]",
    "no cut colour in the document: the factory row keeps [Registration]");
ZSM.Draw.detectCutColor = origDetectA2;

var pA2c = { activePreset: "Mine", presets: { "[Default]": ZSM.Config.getDefaults(), "Mine": mineA2 } };
var a2c = {};
runDialogs(pA2c, [function (win) {
    win.findOne(function (c) { return c.type === "button" && c.text === ZSM.L.BTN_RESET; }).onClick();
    a2c.colour = mappingColour(win);
}]);
assertEq(a2c.colour, "Cut", "Defaults button: mapping row gets the detected cut colour");


// =====================================================
// TEST 19 (audit A3): the other mode's values come from the last run
// =====================================================
// Fields of the mode a dialog does not show were taken from the active
// preset. An unsaved SUMMA tweak (top feed 90) therefore vanished after one
// ZUND run, and the next SUMMA job silently used the preset's 70.
console.log("\n=== TEST 19 (audit A3): other-mode values survive a run in the other mode ===");
function clickRadio(win, label) {
    win.findOne(function (c) { return c.type === "radiobutton" && c.text === label; }).onClick();
}
function clickGenerate(win) {
    win.findOne(function (c) { return c.type === "button" && c.name === "ok"; }).onClick();
}
var lastA3 = ZSM.Config.getDefaults();
lastA3.mode = "SUMMA";
lastA3.feedTop = 90;
var pA3 = { activePreset: "[Default]", presets: { "[Default]": ZSM.Config.getDefaults(), "[Last Settings]": lastA3 } };
runDialogs(pA3, [
    function (win) { clickRadio(win, ZSM.L.MODE_ZUND); },   // SUMMA dialog -> ZUND
    function (win) { clickGenerate(win); }                   // ZUND run
]);
assertEq(pA3.presets["[Last Settings]"].mode, "ZUND", "the ZUND run is the last run");
assertEq(pA3.presets["[Last Settings]"].feedTop, 90, "the SUMMA top feed from the last SUMMA values survives the ZUND run");

var feedA3 = null;
runDialogs(pA3, [
    function (win) { clickRadio(win, ZSM.L.MODE_SUMMA); },   // next job: back to SUMMA
    function (win) { feedA3 = fieldText(win, ZSM.L.FEED_TOP); }
]);
assertEq(feedA3, "90", "the next SUMMA dialog shows the last SUMMA top feed");

// Loading a preset adopts all of its values, the other mode's included.
var bannerZ = ZSM.Config.getDefaults();
bannerZ.feedTop = 55;
bannerZ.gapInner = 8;
var lastZ = ZSM.Config.getDefaults();
lastZ.feedTop = 90;
var pA3c = { activePreset: "[Default]", presets: { "[Default]": ZSM.Config.getDefaults(), "[Last Settings]": lastZ, "Banner Z": bannerZ } };
runDialogs(pA3c, [
    function (win) { pick(win, "Banner Z"); clickGenerate(win); }
]);
assertEq(pA3c.presets["[Last Settings]"].feedTop, 55, "a picked preset brings its own values for the other mode");


// =====================================================
// TEST 20 (spec 6.1-6.3): one strict number reading, a decimal comma stays a
// comma, the shared field paint, no save over an invalid field
// =====================================================
// The live check read fields with parseFloat ("1O5" -> 1, "0x10" -> 0,
// "1 000" -> 1, "20 mm" -> 20), the same fields were written back with String()
// (a dot in a Czech dialog), and Save stayed live over a typo. The dialog now
// reads through ZSM.Numbers.parse, writes through ZSM.Numbers.format, paints
// through ZSM.FieldPaint.field, and greys Save / Save As while a field is
// invalid. The pen is the mock's: a pen made with the family red carries it.
console.log("\n=== TEST 20 (spec 6.1-6.3): numbers, field paint, Save gate ===");
(function () {
    function isErrPen(pen) {
        var c = pen && pen.color, e = ZSM.FieldPaint.COLORS.ERR;
        return !!c && c[0] === e[0] && c[1] === e[1] && c[2] === e[2];
    }
    function fieldCtl(win, label) {
        var lbl = win.findOne(function (c) { return c.type === "statictext" && c.text === label; });
        return lbl ? lbl.parent.findOne(function (c) { return c.type === "edittext"; }) : null;
    }
    function btnText(win, text) {
        return win.findOne(function (c) { return c.type === "button" && c.text === text; });
    }
    function okBtn(win) { return win.findOne(function (c) { return c.type === "button" && c.name === "ok"; }); }
    // The status line is the only statictext that starts with the warning sign.
    function statusLine(win) {
        return win.findOne(function (c) { return c.type === "statictext" && String(c.text).indexOf("⚠") === 0; });
    }
    function mineData(patch) {
        var mine = ZSM.Config.getDefaults();
        for (var k in patch) { if (patch.hasOwnProperty(k)) mine[k] = patch[k]; }
        return { activePreset: "Mine", presets: { "[Default]": ZSM.Config.getDefaults(), "Mine": mine } };
    }
    function gatesOf(win) {
        return { ok: okBtn(win).enabled, save: btnText(win, ZSM.L.BTN_SAVE).enabled, saveAs: btnText(win, ZSM.L.BTN_SAVE_AS).enabled };
    }

    ZSM.L.DEC_SEP = ",";   // the Czech table's separator

    // --- Typos: red field, Generate / Save / Save As grey, the status line names the field ---
    var typos = ["1O5", "0x10", "1 000", "20 mm"];
    for (var ti = 0; ti < typos.length; ti++) {
        var typo = typos[ti];
        var wT = buildAndCapture("ZUND", mineData({}));
        var gapOut = fieldCtl(wT, ZSM.L.GAP_ZO), maxDist = fieldCtl(wT, ZSM.L.MAX_DIST);
        // A valid edit first, so Save is live and the grey below is the gate's doing.
        maxDist.text = "450"; maxDist.onChanging();
        var before = gatesOf(wT);
        assert(before.ok === true && before.save === true && before.saveAs === true,
            "'" + typo + "': precondition, a valid edit leaves Generate, Save and Save As live");

        gapOut.text = typo; gapOut.onChanging();
        assert(isErrPen(gapOut.graphics.foregroundColor), "'" + typo + "': the field is painted in the family red");
        var gT = gatesOf(wT);
        assertEq(gT.ok, false, "'" + typo + "': Generate is grey");
        assertEq(gT.save, false, "'" + typo + "': Save is grey");
        assertEq(gT.saveAs, false, "'" + typo + "': Save As is grey");
        var stT = statusLine(wT);
        assert(stT !== null && stT.text.indexOf("Gap from edge") >= 0,
            "'" + typo + "': the status line names the field (got '" + (stT && stT.text) + "')");

        gapOut.text = "2,5"; gapOut.onChange();
        assert(gapOut.graphics.foregroundColor === gapOut.graphics.ownPen, "'2,5': the field gets its own pen back");
        var gOk = gatesOf(wT);
        assert(gOk.ok === true && gOk.save === true && gOk.saveAs === true,
            "'2,5' after '" + typo + "': Generate, Save and Save As are live again");
        assertEq(statusLine(wT), null, "'2,5' after '" + typo + "': the warning is gone");
    }

    // --- A field that was never red is never written (shared FieldPaint) ---
    var wClean = buildAndCapture("ZUND", mineData({}));
    var painted = wClean.find(function (c) { return c.type === "edittext" && c.graphics.assignments !== 0; });
    assertEq(painted.length, 0, "opened with valid values: no field is painted (" + painted.length + " were)");

    // --- Save stays grey when something other than the live check refreshes the indicator ---
    // chRed.onClick only refreshes the indicator; it must not give Save back.
    var wS = buildAndCapture("SUMMA", mineData({ mode: "SUMMA" }));
    var chRed = wS.findOne(function (c) { return c.type === "checkbox" && c.text === ZSM.L.DRAW_RED; });
    var gapS = fieldCtl(wS, ZSM.L.GAP_ZO);
    gapS.text = "1O5"; gapS.onChanging();
    chRed.value = !chRed.value; chRed.onClick();
    var gS = gatesOf(wS);
    assert(gS.save === false && gS.saveAs === false && gS.ok === false,
        "a checkbox refresh over '1O5': Save, Save As and Generate stay grey");

    // --- Direct reads: the typo is NaN, not a prefix; the mode-switch snapshot does not store 1 ---
    // getUIValues() is the dialog's own; it is seen through [Last Settings], which
    // the switch writes from it, and through the dialog that opens from that.
    var pSw = mineData({});
    var swSecond = {};
    runDialogs(pSw, [
        function (win) {
            var f = fieldCtl(win, ZSM.L.GAP_ZO);
            f.text = "1O5"; f.onChanging();
            clickRadio(win, ZSM.L.MODE_SUMMA);
        },
        function (win) {
            var f = fieldCtl(win, ZSM.L.GAP_ZO);
            swSecond.text = f.text;
            swSecond.red = isErrPen(f.graphics.foregroundColor);
            swSecond.gates = gatesOf(win);
        }
    ]);
    var snap = pSw.presets["[Last Settings]"];
    assert(snap && typeof snap.gapOuter === "number" && isNaN(snap.gapOuter),
        "mode switch with '1O5': [Last Settings].gapOuter is NaN (got " + (snap && snap.gapOuter) + ")");
    assert(snap && snap.gapOuter !== 1, "mode switch with '1O5': [Last Settings] does not store 1");
    assertEq(swSecond.text, "", "the dialog opened after the switch shows an empty field for it");
    assertEq(swSecond.red, true, "...painted red");
    assert(swSecond.gates.ok === false && swSecond.gates.save === false && swSecond.gates.saveAs === false,
        "...with Generate, Save and Save As grey");

    // --- A stored null: empty red field, everything grey (review focus 2) ---
    var wN = buildAndCapture("ZUND", mineData({ gapOuter: null }));
    var nullField = fieldCtl(wN, ZSM.L.GAP_ZO);
    assertEq(nullField.text, "", "gapOuter null opens as an empty field, not 'null'");
    assert(isErrPen(nullField.graphics.foregroundColor), "...painted red");
    var gN = gatesOf(wN);
    assert(gN.ok === false && gN.save === false && gN.saveAs === false, "...Generate, Save and Save As grey");
    var stN = statusLine(wN);
    assert(stN !== null && stN.text.indexOf("Gap from edge") >= 0, "...and the status line names the field");

    // The same through a preset pick: setUIValues validates, then the indicator refresh runs.
    var pPick = mineData({});
    var brokenPreset = ZSM.Config.getDefaults();
    brokenPreset.gapOuter = null;
    pPick.presets["Broken"] = brokenPreset;
    var pickState = {};
    runDialogs(pPick, [function (win) {
        pick(win, "Broken");
        var f = fieldCtl(win, ZSM.L.GAP_ZO);
        pickState.text = f.text; pickState.red = isErrPen(f.graphics.foregroundColor); pickState.gates = gatesOf(win);
    }]);
    assertEq(pickState.text, "", "picking a preset with gapOuter null: empty field");
    assertEq(pickState.red, true, "...red");
    assert(pickState.gates.ok === false && pickState.gates.save === false && pickState.gates.saveAs === false,
        "...Generate, Save and Save As grey after the pick (the indicator refresh does not give Save back)");

    // --- Fixed source: the greyed gap field is not checked, so a typo there does not gate ---
    var wF = buildAndCapture("ZUND", mineData({ useArtboardBounds: true }));
    var gapG = fieldCtl(wF, ZSM.L.GAP_GZ);
    gapG.text = "1O5"; gapG.onChanging();
    assert(okBtn(wF).enabled === true && !isErrPen(gapG.graphics.foregroundColor),
        "Fixed source: a typo in the greyed gap field neither paints it nor blocks Generate");

    // --- Writing numbers: the locale's separator, no rounding ---
    var fractions = { gapInner: 5.5, gapOuter: 2.5, maxDist: 500.5, markSizeZ: 0.25, orientDist: 100.5 };
    var pFmt = mineData(fractions);
    var firstZ = {};
    runDialogs(pFmt, [function (win) {
        firstZ.gapInner = fieldText(win, ZSM.L.GAP_GZ);
        firstZ.gapOuter = fieldText(win, ZSM.L.GAP_ZO);
        firstZ.maxDist = fieldText(win, ZSM.L.MAX_DIST);
        firstZ.markSizeZ = fieldText(win, ZSM.L.MARK_SIZE_Z);
        firstZ.orientDist = fieldText(win, ZSM.L.ORIENT_DIST);
        clickGenerate(win);
    }]);
    assertEq(firstZ.gapInner, "5,5", "cs: gapInner 5.5 opens as '5,5'");
    assertEq(firstZ.gapOuter, "2,5", "cs: gapOuter 2.5 opens as '2,5'");
    assertEq(firstZ.maxDist, "500,5", "cs: maxDist 500.5 opens as '500,5'");
    assertEq(firstZ.markSizeZ, "0,25", "cs: markSizeZ 0.25 opens as '0,25' (no rounding)");
    assertEq(firstZ.orientDist, "100,5", "cs: orientDist 100.5 opens as '100,5'");
    var last = pFmt.presets["[Last Settings]"];
    assert(last && last.gapOuter === 2.5 && last.gapInner === 5.5 && last.markSizeZ === 0.25,
        "cs: Generate reads the commas back as the same numbers");
    var againZ = {};
    runDialogs(pFmt, [function (win) {
        againZ.gapOuter = fieldText(win, ZSM.L.GAP_ZO);
        againZ.markSizeZ = fieldText(win, ZSM.L.MARK_SIZE_Z);
    }]);
    assertEq(againZ.gapOuter, "2,5", "cs: after Generate and a new opening gapOuter is still '2,5'");
    assertEq(againZ.markSizeZ, "0,25", "cs: ...and markSizeZ '0,25'");

    var pSum = mineData({ mode: "SUMMA", feedTop: 70.5, feedBottom: 50.25, markSizeS: 3.5 });
    var sumTexts = {};
    runDialogs(pSum, [function (win) {
        sumTexts.feedTop = fieldText(win, ZSM.L.FEED_TOP);
        sumTexts.feedBottom = fieldText(win, ZSM.L.FEED_BOT);
        sumTexts.markSizeS = fieldText(win, ZSM.L.MARK_SIZE_S);
    }]);
    assertEq(sumTexts.feedTop, "70,5", "cs SUMMA: feedTop 70.5 opens as '70,5'");
    assertEq(sumTexts.feedBottom, "50,25", "cs SUMMA: feedBottom 50.25 opens as '50,25'");
    assertEq(sumTexts.markSizeS, "3,5", "cs SUMMA: markSizeS 3.5 opens as '3,5'");

    // Typing a dot where the preset holds a comma is the same value, not a change.
    var wSame = buildAndCapture("ZUND", mineData({ gapOuter: 2.5 }));
    var sameField = fieldCtl(wSame, ZSM.L.GAP_ZO);
    sameField.text = "2.5"; sameField.onChanging();
    assertEq(btnText(wSame, ZSM.L.BTN_SAVE).enabled, false, "'2.5' typed over '2,5' is no change: Save stays grey");

    // The first value of a row goes through the same formatter.
    var hostWin = new Window("dialog", "host");
    assertEq(ZSM.UI.addRow(hostWin, "L", 2.5, "tip").inp.text, "2,5", "cs: addRow writes its first value with the comma");
    assertEq(ZSM.UI.addRow(hostWin, "L", null, "tip").inp.text, "", "addRow: null is an empty field, not 'null'");

    // en: the dot
    ZSM.L.DEC_SEP = ".";
    var pEn = mineData({ gapOuter: 2.5 });
    var enText = null, enAgain = null;
    runDialogs(pEn, [function (win) { enText = fieldText(win, ZSM.L.GAP_ZO); clickGenerate(win); }]);
    runDialogs(pEn, [function (win) { enAgain = fieldText(win, ZSM.L.GAP_ZO); }]);
    assertEq(enText, "2.5", "en: gapOuter 2.5 opens as '2.5'");
    assertEq(enAgain, "2.5", "en: ...and again after Generate and a new opening");
    assertEq(ZSM.UI.addRow(hostWin, "L", 2.5, "tip").inp.text, "2.5", "en: addRow writes its first value with the dot");

    // --- The limits in the status line are written the way the field is ---
    ZSM.L.DEC_SEP = ",";
    var wL = buildAndCapture("ZUND", mineData({}));
    var sizeCs = fieldCtl(wL, ZSM.L.MARK_SIZE_Z);
    sizeCs.text = "0,05"; sizeCs.onChanging();
    var stCs = statusLine(wL);
    assert(stCs !== null && stCs.text.indexOf("0,1–50") >= 0,
        "cs: the status line gives the mark size limits as '0,1–50' (got '" + (stCs && stCs.text) + "')");
    ZSM.L.DEC_SEP = ".";
    var wLe = buildAndCapture("ZUND", mineData({}));
    var sizeEn = fieldCtl(wLe, ZSM.L.MARK_SIZE_Z);
    sizeEn.text = "0.05"; sizeEn.onChanging();
    var stEn = statusLine(wLe);
    assert(stEn !== null && stEn.text.indexOf("0.1–50") >= 0,
        "en: the status line gives the mark size limits as '0.1–50' (got '" + (stEn && stEn.text) + "')");

    delete ZSM.L.DEC_SEP;   // back to the suite's default (no separator -> dot)
})();


// =====================================================
// TEARDOWN
// =====================================================
SUI.uninstall();


// =====================================================
// SUMMARY
// =====================================================
console.log("\n" + "=".repeat(50));
console.log("UI LAYOUT TEST RESULTS: " + pass + "/" + total + " PASSED, " + fail + " FAILED");
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
