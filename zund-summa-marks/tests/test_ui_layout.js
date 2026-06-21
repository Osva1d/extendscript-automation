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
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "validation.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "ui_state.js"), "utf8"));

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

// preferredSize.width set
assert(w.preferredSize.width >= 350 && w.preferredSize.width <= 450,
    "Window width 350-450px (got " + w.preferredSize.width + ")");


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
// 56px wide (gap, maxDist, markSize, orientDist, etc.). The scale field (etScale,
// 60px) and the layer-name field (124px) are sized separately and excluded here.
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
