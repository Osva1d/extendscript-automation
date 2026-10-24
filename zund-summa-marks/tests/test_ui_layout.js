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
    ERROR_PREFIX: "ERR: ",
    // The locale's shape (spec 1.2.0 §9.3): field, min, max; the unit rides on the max.
    ERR_MUST_BE_NUMBER: "%s: enter a number from %s to %s.", ERR_OUT_OF_RANGE: "%s: enter a number from %s to %s.",
    ERR_NO_DOC: "no doc", ERR_NO_SEL: "no sel", ERR_CRITICAL: "critical: ",
    ERR_RENDER_CRITICAL: "render: ", ERR_COLOR_MISSING: "%s missing",
    ERR_LAY_NAME: "A layer row has the colour %s but no name.",
    ERR_CANNOT_DELETE_DEFAULT: "no del", ERR_ENTER_NAME: "enter a name", ERR_RESERVED_NAME: "reserved",
    ERR_WRITE_SETTINGS: "write fail",
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
    COL_COLOR: "Color", COL_LAYER: "Layer",
    TIP_MODE: "tip", TIP_SRC_AUTO: "tip", TIP_SRC_FIXED: "tip",
    TIP_GAP_GZ: "tip", TIP_GAP_ZO: "tip", TIP_MAX_DIST: "tip",
    TIP_SIZE_Z: "tip", TIP_SIZE_S: "tip", TIP_MARK_COLOR: "tip",
    TIP_ORIENT_DIST: "tip", TIP_FEED_TOP: "tip", TIP_FEED_BOT: "tip", TIP_DRAW_RED: "tip",
    TIP_LAY_COLOR: "tip", TIP_LAY_NAME: "tip", TIP_BTN_REMOVE: "tip", TIP_BTN_ADD: "tip",
    TIP_SAVE: "tip", TIP_SAVE_AS: "tip", TIP_DEL: "tip", TIP_RESET: "tip",
    TIP_OK: "tip", TIP_CANCEL: "tip", TIP_PRESET: "tip", TIP_REVERT: "tip",
    // v26.6.0 audit additions
    PANEL_DOC: "Document",
    LBL_SCALE: "Drawing scale 1:", TIP_SCALE: "tip",
    MARKS_ONLY: "Marks only", TIP_MARKS_ONLY: "tip",
    // The canon's wording (extendscript-ui-standards 12.4), Czech: the tests read the quotes back.
    CONFIRM_OVERWRITE_PRESET: "Předvolba „%s“ už existuje. Přepsat?",
    CONFIRM_DELETE_PRESET: "Smazat předvolbu „%s“? Smazání nejde vrátit.",
    BTN_REVERT: "↺",
    STATUS_INVALID: "fix", STATUS_LAYER_NAME: "name",
    STATUS_RANGE: "%s range %s–%s", STATUS_RANGE_MULTI: "%s out of range",
    STATUS_DUP_COLOR: "dup %s",
    // The status line at rest (spec 1.2.0 §7), Czech: the tests read the spec's text back.
    STATUS_FOUND_ARTBOARD: "artboard %s × %s mm", STATUS_FOUND_ARTWORK: "grafika %s × %s mm",
    STATUS_FOUND_CUT: "řez „%s“", STATUS_NO_CUT: "řez nenalezen", STATUS_MARKS_ONLY: "pouze značky",
    THOU_SEP: " ",
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
require("./lib/load_shared.js")(ZSM, ["numbers", "field_paint", "drawing_scale"]);   // shared: ZSM.Numbers, ZSM.FieldPaint, ZSM.DrawingScale, bound the way the build does

// The document the dialog opens for: show() reads the drawing scale from its
// XMP packet. A new document's packet holds none (scale 1); tests swap it.
var XMP_PACKET = require("./lib/mock_illustrator.js").XMP_PACKET;
global.app = { activeDocument: { XMPString: XMP_PACKET } };
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
function buildAndCapture(mode, pData, drawingScale) {
    pData = pData || {
        activePreset: "[Default]",
        presets: { "[Default]": ZSM.Config.getDefaults() }
    };
    var docData = {
        swatches: ZSM.Draw.getSwatchNames(),
        swatchRGB: ZSM.Draw.getSwatchRGBMap(),
        layers: ZSM.Draw.getLayerNames(),
        detectedColor: ZSM.Draw.detectCutColor(),
        drawingScale: (drawingScale !== undefined) ? drawingScale : 1   // what show() reads from the document
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
    // The reason Generate is grey: the visible statictext that starts with ✗
    // (the hidden reason label keeps its last text, spec 1.2.0 §7).
    function statusLine(win) {
        return win.findOne(function (c) { return c.type === "statictext" && c.visible && String(c.text).indexOf("✗") === 0; });
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

    // --- A greyed field keeps the preset's value: a typo left in it is never saved (spec 6.1) ---
    // Auto-fit, "5mm" in the gap-from-graphics field (red, Save grey), then Fixed:
    // the field greys and the live check skips it. Save and the mode-switch
    // snapshot must then carry the preset's gapInner (7), not NaN / null.
    function fixedWithTypo(win) {
        var gap = fieldCtl(win, ZSM.L.GAP_GZ), maxD = fieldCtl(win, ZSM.L.MAX_DIST);
        var rbAutoCtl = win.findOne(function (c) { return c.type === "radiobutton" && c.text === ZSM.L.SRC_AUTO; });
        var rbFixedCtl = win.findOne(function (c) { return c.type === "radiobutton" && c.text === ZSM.L.SRC_FIXED; });
        maxD.text = "450"; maxD.onChanging();      // a valid edit, so Save has something to save
        gap.text = "5mm"; gap.onChanging();
        var redBefore = isErrPen(gap.graphics.foregroundColor), saveBefore = btnText(win, ZSM.L.BTN_SAVE).enabled;
        rbFixedCtl.value = true; rbAutoCtl.value = false; rbFixedCtl.onClick();
        return { redBefore: redBefore, saveBefore: saveBefore, gap: gap };
    }
    var origStorage = ZSM.Storage;
    ZSM.Storage = { save: function () { return true; } };
    try {
        var pGrey = mineData({ gapInner: 7 });
        var greyState = null, greySave = null;
        runDialogs(pGrey, [function (win) {
            greyState = fixedWithTypo(win);
            greySave = btnText(win, ZSM.L.BTN_SAVE);
            greyState.saveAfter = greySave.enabled;
            if (greySave.enabled) greySave.onClick();
        }]);
        assert(greyState.redBefore === true && greyState.saveBefore === false,
            "greyed typo: precondition, '5mm' is red and Save is grey while the field is live");
        assertEq(greyState.saveAfter, true, "greyed typo: after Fixed the field is skipped and Save is live (maxDist changed)");
        var savedMine = pGrey.presets["Mine"];
        assertEq(savedMine.gapInner, 7, "greyed typo: Save stores the preset's gapInner, not NaN (got " + savedMine.gapInner + ")");
        assertEq(savedMine.useArtboardBounds, true, "greyed typo: ...with the Fixed source and the maxDist edit");
        assertEq(savedMine.maxDist, 450, "greyed typo: ...and the valid edit made before");

        var pGrey2 = mineData({ gapInner: 7 });
        runDialogs(pGrey2, [function (win) { fixedWithTypo(win); clickRadio(win, ZSM.L.MODE_SUMMA); }, function () {}]);
        var greySnap = pGrey2.presets["[Last Settings]"];
        assertEq(greySnap.gapInner, 7, "greyed typo: the mode-switch snapshot carries the preset's gapInner (got " + greySnap.gapInner + ")");

        // A valid edit made before the switch is not kept either: the greyed field carries the previous run's value.
        var pGrey3 = mineData({ gapInner: 7 });
        runDialogs(pGrey3, [function (win) {
            var gap = fieldCtl(win, ZSM.L.GAP_GZ);
            gap.text = "9"; gap.onChanging();
            var rbF = win.findOne(function (c) { return c.type === "radiobutton" && c.text === ZSM.L.SRC_FIXED; });
            rbF.value = true; rbF.onClick();
            clickRadio(win, ZSM.L.MODE_SUMMA);
        }, function () {}]);
        assertEq(pGrey3.presets["[Last Settings]"].gapInner, 7, "greyed field: an earlier valid edit (9) is not saved either, the preset's 7 stays");
    } finally {
        ZSM.Storage = origStorage;
        if (origStorage === undefined) delete ZSM.Storage;
    }

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
// TEST 21 (spec 1.2.0 §5): the drawing scale comes from the document
// =====================================================
// A checkbox "Work at scale" and an integer field "1:" used to take the scale
// from the preset and the last run: after a 1:10 job the next 1:1 job opened
// at 1:10. One decimal field "Drawing scale 1:" now starts from the
// document's XMP (no scale stored = 1), and neither a preset, the last run, a
// mode switch nor the Defaults button changes it.
console.log("\n=== TEST 21 (spec 1.2.0 §5): drawing scale from the document ===");
(function () {
    var BASE_TITLE = ZSM.Config.ui.title;
    function isErrPen(pen) {
        var c = pen && pen.color, e = ZSM.FieldPaint.COLORS.ERR;
        return !!c && c[0] === e[0] && c[1] === e[1] && c[2] === e[2];
    }
    function scaleCtl(win) {
        var lbl = win.findOne(function (c) { return c.type === "statictext" && c.text === ZSM.L.LBL_SCALE; });
        return lbl ? lbl.parent.findOne(function (c) { return c.type === "edittext"; }) : null;
    }
    function scaleText(win) { var et = scaleCtl(win); return et ? et.text : null; }
    function typeScale(win, text) { var et = scaleCtl(win); et.text = text; et.onChanging(); }
    // The status line at rest starts with the mode: "ZUND · …" / "SUMMA · …".
    function restLine(win) {
        var st = win.findOne(function (c) { return c.type === "statictext" && /^(ZUND|SUMMA) · /.test(String(c.text)); });
        return st ? st.text : null;
    }
    function okBtn(win) { return win.findOne(function (c) { return c.type === "button" && c.name === "ok"; }); }
    function btn(win, text) { return win.findOne(function (c) { return c.type === "button" && c.text === text; }); }
    function presetShown(win) { var dd = k5PresetDD(win); return dd.selection ? dd.selection.text : null; }
    function docWithScale(n) {
        global.app.activeDocument = { XMPString: (n === null) ? XMP_PACKET : ZSM.DrawingScale.write(XMP_PACKET, n) };
    }
    function data(lastScale, mineScale) {
        var last = ZSM.Config.getDefaults(), mine = ZSM.Config.getDefaults();
        if (lastScale !== undefined) last.scaleN = lastScale;
        if (mineScale !== undefined) mine.scaleN = mineScale;
        return { activePreset: "Mine", presets: { "[Default]": ZSM.Config.getDefaults(), "Mine": mine, "[Last Settings]": last } };
    }
    function bannerData() {
        var p = data();
        var banner = ZSM.Config.getDefaults(); banner.mode = "SUMMA"; banner.feedTop = 123;
        var gap = ZSM.Config.getDefaults(); gap.gapInner = 17;
        p.presets["Banner"] = banner; p.presets["Gap17"] = gap;
        return p;
    }

    ZSM.L.DEC_SEP = ",";   // the Czech table's separator

    // --- the document holds 1:10: field, title, status line ---
    docWithScale(10);
    var s10 = {}, p10 = data();
    runDialogs(p10, [function (win) {
        s10.field = scaleText(win); s10.title = win.text; s10.line = restLine(win);
        clickGenerate(win);
    }]);
    assertEq(s10.field, "10", "XMP 1:10: the field shows '10'");
    assert(s10.title === BASE_TITLE + " — 1:10", "XMP 1:10: the title ends ' — 1:10' (got '" + s10.title + "')");
    assert(s10.line !== null && s10.line.indexOf("· 1:10") !== -1,
        "XMP 1:10: the status line carries '· 1:10' (got '" + s10.line + "')");
    assertEq(p10.presets["[Last Settings]"].scaleN, 10, "XMP 1:10: Generate runs at 1:10");

    // --- 1:2,5 is written with the comma ---
    docWithScale(2.5);
    var s25 = {}, p25 = data();
    runDialogs(p25, [function (win) {
        s25.field = scaleText(win); s25.title = win.text; s25.line = restLine(win);
        clickGenerate(win);
    }]);
    assertEq(s25.field, "2,5", "XMP 2.5: the field shows '2,5'");
    assert(s25.title === BASE_TITLE + " — 1:2,5", "XMP 2.5: the title ends ' — 1:2,5' (got '" + s25.title + "')");
    assert(s25.line !== null && s25.line.indexOf("· 1:2,5") !== -1,
        "XMP 2.5: the status line carries '· 1:2,5' (got '" + s25.line + "')");
    assertEq(p25.presets["[Last Settings]"].scaleN, 2.5, "XMP 2.5: Generate runs at 1:2.5");

    // --- review focus 1: a 1.1.0 file at 1:10, a document without a scale ---
    docWithScale(null);
    var s1 = {}, p1 = data(10, 10);
    runDialogs(p1, [function (win) {
        s1.field = scaleText(win); s1.title = win.text; s1.line = restLine(win); s1.preset = presetShown(win);
        s1.save = btn(win, ZSM.L.BTN_SAVE).enabled;
        clickGenerate(win);
    }]);
    assertEq(s1.field, "1", "1.1.0 file with scaleN 10, no scale in the document: the field shows '1'");
    assertEq(s1.title, BASE_TITLE, "...the title has no scale suffix");
    assert(s1.line !== null && s1.line.indexOf("1:") === -1, "...the status line no scale (got '" + s1.line + "')");
    assertEq(s1.preset, "Mine", "...the preset list shows 'Mine' without ' *'");
    assertEq(s1.save, false, "...Save is grey (nothing changed)");
    assertEq(p1.presets["[Last Settings]"].scaleN, 1, "...and Generate runs at 1:1");

    // --- "2,5" survives the mode switches, a preset pick and the Defaults button ---
    docWithScale(null);
    var seen = [];
    runDialogs(bannerData(), [
        function (win) { typeScale(win, "2,5"); clickRadio(win, ZSM.L.MODE_SUMMA); },
        function (win) { seen.push(["ZUND -> SUMMA", scaleText(win), win.text]); clickRadio(win, ZSM.L.MODE_ZUND); },
        function (win) {
            seen.push(["SUMMA -> ZUND", scaleText(win), win.text]);
            pick(win, "Gap17");
            seen.push(["same-mode preset", scaleText(win), win.text]);
            btn(win, ZSM.L.BTN_RESET).onClick();
            seen.push(["Defaults button", scaleText(win), win.text]);
            pick(win, "Banner");
        },
        function (win) { seen.push(["other-mode preset", scaleText(win), win.text]); }
    ]);
    assertEq(seen.length, 5, "the scale walk reached every step");
    for (var si = 0; si < seen.length; si++) {
        assertEq(seen[si][1], "2,5", seen[si][0] + ": the field still shows '2,5'");
        assertEq(seen[si][2], BASE_TITLE + " — 1:2,5", seen[si][0] + ": the title still ends ' — 1:2,5'");
    }

    // --- the field is not a preset value: no "*", Save stays grey ---
    docWithScale(null);
    var wM = buildAndCapture("ZUND", data(), 1);
    typeScale(wM, "10");
    assertEq(presetShown(wM), "Mine", "typing a scale does not mark the preset modified");
    assertEq(btn(wM, ZSM.L.BTN_SAVE).enabled, false, "...Save stays grey");
    assertEq(wM.text, BASE_TITLE + " — 1:10", "...the title follows the field: ' — 1:10'");
    typeScale(wM, "1");
    assertEq(wM.text, BASE_TITLE, "...and loses the suffix at '1'");

    // --- an invalid scale: red field, Generate / Save / Save As grey, no suffix ---
    var bad = ["0,5", "101", "1O", ""];
    for (var bi = 0; bi < bad.length; bi++) {
        var wB = buildAndCapture("ZUND", data(), 1);
        btn(wB, ZSM.L.BTN_RESET).onClick();   // an unsaved change, so Save would be live
        var before = btn(wB, ZSM.L.BTN_SAVE).enabled;
        typeScale(wB, bad[bi]);
        assert(isErrPen(scaleCtl(wB).graphics.foregroundColor), "'" + bad[bi] + "': the scale field is red");
        assertEq(okBtn(wB).enabled, false, "'" + bad[bi] + "': Generate is grey");
        assert(before === true && btn(wB, ZSM.L.BTN_SAVE).enabled === false,
            "'" + bad[bi] + "': Save turns grey (was " + before + ")");
        assertEq(btn(wB, ZSM.L.BTN_SAVE_AS).enabled, false, "'" + bad[bi] + "': Save As is grey");
        assertEq(wB.text, BASE_TITLE, "'" + bad[bi] + "': the title carries no scale");
        var warn = wB.findOne(function (c) { return c.type === "statictext" && c.visible && String(c.text).indexOf("✗") === 0; });
        // The suite's STATUS_RANGE is "%s range %s–%s": the label without its ratio "1:".
        assert(warn !== null && warn.text.indexOf("✗ Drawing scale range 1–100") === 0,
            "'" + bad[bi] + "': the status line names the field 'Drawing scale' (got '" + (warn && warn.text) + "')");
        typeScale(wB, "2,5");
        assert(okBtn(wB).enabled === true && !isErrPen(scaleCtl(wB).graphics.foregroundColor),
            "'2,5' after '" + bad[bi] + "': valid again");
    }

    // --- a typo carried through a mode switch stays a typo, never 1 ---
    docWithScale(10);
    var carried = {};
    runDialogs(data(), [
        function (win) { typeScale(win, "1O"); clickRadio(win, ZSM.L.MODE_SUMMA); },
        function (win) {
            carried.text = scaleText(win);
            carried.red = isErrPen(scaleCtl(win).graphics.foregroundColor);
            carried.ok = okBtn(win).enabled;
        }
    ]);
    assertEq(carried.text, "", "'1O' carried through a switch: an empty field, not '1' or '10'");
    assert(carried.red === true && carried.ok === false, "...red, Generate grey");

    delete ZSM.L.DEC_SEP;
    docWithScale(null);
})();


// =====================================================
// TEST 22 (spec 1.2.0 §8): presets as the family canon
// =====================================================
// Every list item is relabelled on each change (switching away from an edited
// preset left its " *" behind), [Default] is the factory values of the
// dialog's own mode (in SUMMA it carried a permanent " *" and ↺ jumped to
// Zünd), the save-as / delete texts are the canon's, and the panel is the
// canon's template: ↺ in a group of its own beside the list, the preset
// buttons at their native widths.
console.log("\n=== TEST 22 (spec 1.2.0 §8): presets as the family canon ===");
(function () {
    var DEFAULT_ITEM = ZSM.L.PRESET_DEFAULT;
    function btn(win, text) { return win.findOne(function (c) { return c.type === "button" && c.text === text; }); }
    function itemTexts(win) {
        return k5PresetDD(win).items.map(function (it) { return it.text; });
    }
    function field(win, label) {
        var lbl = win.findOne(function (c) { return c.type === "statictext" && c.text === label; });
        return lbl ? lbl.parent.findOne(function (c) { return c.type === "edittext"; }) : null;
    }
    function edit(win, label, text) { var f = field(win, label); f.text = text; f.onChanging(); }
    function twoPresets(active) {
        var a = ZSM.Config.getDefaults(); a.maxDist = 400;
        var b = ZSM.Config.getDefaults(); b.maxDist = 300;
        return { activePreset: active, presets: { "[Default]": ZSM.Config.getDefaults(), "A": a, "B": b } };
    }
    // SUMMA data whose last run is the SUMMA factory values of this document
    // ([Default] maps the detected cut colour, so the last run must too).
    function summaData(active, extra) {
        var last = ZSM.Config.getDefaults();
        last.mode = "SUMMA"; last.layers[0].color = "Cut";
        var p = { activePreset: active, presets: { "[Default]": ZSM.Config.getDefaults(), "[Last Settings]": last } };
        for (var k in extra) { if (extra.hasOwnProperty(k)) p.presets[k] = extra[k]; }
        return p;
    }
    function withStorage(fn) {
        var origStorage = ZSM.Storage;
        ZSM.Storage = { save: function () { return true; } };
        try { return fn(); } finally {
            ZSM.Storage = origStorage;
            if (origStorage === undefined) delete ZSM.Storage;
        }
    }

    // --- every item is relabelled, not only the active one ---
    var rl = {};
    runDialogs(twoPresets("A"), [function (win) {
        rl.start = itemTexts(win);
        edit(win, ZSM.L.MAX_DIST, "450");
        rl.edited = itemTexts(win);
        pick(win, "B");
        rl.pickedB = itemTexts(win);
        rl.pickedBSel = k5PresetDD(win).selection.text;
        edit(win, ZSM.L.MAX_DIST, "310");
        rl.editedB = itemTexts(win);
        pick(win, "A");
        rl.backToA = itemTexts(win);
        edit(win, ZSM.L.MAX_DIST, "410");
        pick(win, DEFAULT_ITEM);
        rl.pickedDefault = itemTexts(win);
        rl.revertAfter = btn(win, ZSM.L.BTN_REVERT).enabled;
        rl.saveAfter = btn(win, ZSM.L.BTN_SAVE).enabled;
    }]);
    assertEq(JSON.stringify(rl.start), JSON.stringify([DEFAULT_ITEM, "A", "B"]), "A active, unedited: no asterisk anywhere");
    assertEq(JSON.stringify(rl.edited), JSON.stringify([DEFAULT_ITEM, "A *", "B"]), "A edited: only A carries the asterisk");
    assertEq(JSON.stringify(rl.pickedB), JSON.stringify([DEFAULT_ITEM, "A", "B"]),
        "A edited, B picked: A loses its asterisk, B has none");
    assertEq(rl.pickedBSel, "B", "...and the list shows B selected");
    assertEq(JSON.stringify(rl.editedB), JSON.stringify([DEFAULT_ITEM, "A", "B *"]), "B edited: the asterisk moves to B");
    assertEq(JSON.stringify(rl.backToA), JSON.stringify([DEFAULT_ITEM, "A", "B"]), "B edited, A picked: B loses its asterisk");
    assertEq(JSON.stringify(rl.pickedDefault), JSON.stringify([DEFAULT_ITEM, "A", "B"]),
        "A edited, [Default] picked: A loses its asterisk, [Default] has none");
    assertEq(rl.revertAfter, false, "...and the revert button is grey");
    assertEq(rl.saveAfter, false, "...and so is Save");

    // --- [Default] in SUMMA: the factory values of SUMMA, the mode stays ---
    function summaWalk(how) {
        var out = { closeCodes: [] };
        var p = summaData("[Default]");
        var shown = runDialogs(p, [function (win) {
            win.close = function (code) { out.closeCodes.push(code); };
            out.startMode = radioOn(win, ZSM.L.MODE_SUMMA);
            out.startItems = itemTexts(win);
            out.startSave = btn(win, ZSM.L.BTN_SAVE).enabled;
            out.startRevert = btn(win, ZSM.L.BTN_REVERT).enabled;
            out.startSaveAs = btn(win, ZSM.L.BTN_SAVE_AS).enabled;
            edit(win, ZSM.L.FEED_TOP, "90");
            edit(win, ZSM.L.GAP_ZO, "3");
            out.editedItems = itemTexts(win);
            out.editedSave = btn(win, ZSM.L.BTN_SAVE).enabled;
            out.editedRevert = btn(win, ZSM.L.BTN_REVERT).enabled;
            how(win);
            out.feedTop = field(win, ZSM.L.FEED_TOP).text;
            out.gapOuter = field(win, ZSM.L.GAP_ZO).text;
            out.summaOn = radioOn(win, ZSM.L.MODE_SUMMA);
            out.items = itemTexts(win);
            out.save = btn(win, ZSM.L.BTN_SAVE).enabled;
            out.revert = btn(win, ZSM.L.BTN_REVERT).enabled;
            out.colour = mappingColour(win);
        }]);
        out.shown = shown.length;
        return out;
    }
    var viaRevert = summaWalk(function (win) { btn(win, ZSM.L.BTN_REVERT).onClick(); });
    assertEq(viaRevert.startMode, true, "SUMMA [Default]: the dialog opens as SUMMA");
    assertEq(JSON.stringify(viaRevert.startItems), JSON.stringify([DEFAULT_ITEM]), "SUMMA [Default] unedited: no asterisk");
    assert(viaRevert.startSave === false && viaRevert.startRevert === false, "...Save and ↺ are grey");
    assertEq(viaRevert.startSaveAs, true, "...Save As is live");
    assertEq(JSON.stringify(viaRevert.editedItems), JSON.stringify([DEFAULT_ITEM + " *"]), "SUMMA [Default] edited: the asterisk");
    assert(viaRevert.editedSave === true && viaRevert.editedRevert === true, "...Save and ↺ are live");
    assertEq(viaRevert.shown, 1, "↺ on SUMMA [Default]: no second dialog");
    assert(viaRevert.closeCodes.length === 0, "↺ on SUMMA [Default]: the dialog is not closed (no mode switch)");
    assertEq(viaRevert.summaOn, true, "↺ on SUMMA [Default]: the dialog is still SUMMA");
    assertEq(viaRevert.feedTop, "70", "↺ on SUMMA [Default]: the SUMMA factory top feed");
    assertEq(viaRevert.gapOuter, "0", "↺ on SUMMA [Default]: the factory gap from the edge");
    assertEq(viaRevert.colour, "Cut", "↺ on SUMMA [Default]: the mapping row has the detected cut colour, as the Defaults button gives");
    assertEq(JSON.stringify(viaRevert.items), JSON.stringify([DEFAULT_ITEM]), "↺ on SUMMA [Default]: no asterisk again");
    assert(viaRevert.save === false && viaRevert.revert === false, "↺ on SUMMA [Default]: Save and ↺ grey again");

    var viaButton = summaWalk(function (win) { btn(win, ZSM.L.BTN_RESET).onClick(); });
    assert(viaButton.feedTop === viaRevert.feedTop && viaButton.gapOuter === viaRevert.gapOuter &&
           viaButton.colour === viaRevert.colour && viaButton.shown === viaRevert.shown &&
           JSON.stringify(viaButton.items) === JSON.stringify(viaRevert.items),
        "↺ on [Default] does what the Defaults button does");
    assertEq(viaButton.summaOn, true, "the Defaults button keeps SUMMA");

    // Picking [Default] from the list in a SUMMA dialog: the SUMMA factory values, no jump to Zünd.
    var mine = ZSM.Config.getDefaults();
    mine.mode = "SUMMA"; mine.feedTop = 99; mine.layers[0].color = "Cut";
    var pick1 = { closeCodes: [] };
    var pMine = summaData("Mine", { "Mine": mine });
    pMine.presets["[Last Settings]"] = JSON.parse(JSON.stringify(mine));   // the last run was Mine as saved
    var shownPick = runDialogs(pMine, [function (win) {
        win.close = function (code) { pick1.closeCodes.push(code); };
        pick1.startItems = itemTexts(win);
        pick1.startFeed = field(win, ZSM.L.FEED_TOP).text;
        pick(win, DEFAULT_ITEM);
        pick1.feedTop = field(win, ZSM.L.FEED_TOP).text;
        pick1.items = itemTexts(win);
        pick1.summaOn = radioOn(win, ZSM.L.MODE_SUMMA);
    }]);
    assertEq(JSON.stringify(pick1.startItems), JSON.stringify([DEFAULT_ITEM, "Mine"]), "SUMMA, Mine active, unedited: no asterisk");
    assertEq(pick1.startFeed, "99", "SUMMA dialog on Mine shows its feed");
    assert(shownPick.length === 1 && pick1.closeCodes.length === 0, "picking [Default] in SUMMA: no mode switch");
    assertEq(pick1.feedTop, "70", "picking [Default] in SUMMA: the SUMMA factory top feed");
    assertEq(JSON.stringify(pick1.items), JSON.stringify([DEFAULT_ITEM, "Mine"]), "picking [Default] in SUMMA: no asterisk anywhere");
    assertEq(pick1.summaOn, true, "picking [Default] in SUMMA: still SUMMA");

    // ZUND [Default]: ↺ is the Defaults button there too.
    var zr = {};
    runDialogs(twoPresets("[Default]"), [function (win) {
        edit(win, ZSM.L.GAP_ZO, "7");
        btn(win, ZSM.L.BTN_REVERT).onClick();
        zr.gap = field(win, ZSM.L.GAP_ZO).text; zr.colour = mappingColour(win); zr.items = itemTexts(win);
    }]);
    assertEq(zr.gap, "0", "ZUND: ↺ on [Default] gives the factory values");
    assertEq(zr.colour, "Cut", "ZUND: ↺ on [Default] keeps the detected cut colour");
    assertEq(JSON.stringify(zr.items), JSON.stringify([DEFAULT_ITEM, "A", "B"]), "ZUND: ↺ on [Default] clears the asterisk");

    // --- Save As: the canon's texts and checks ---
    function saveAs(answer, confirmAnswer, pre) {
        var log = { alerts: [], confirms: [] };
        var o = { prompt: global.prompt, alert: global.alert, confirm: global.confirm };
        global.prompt = function (m) { log.prompt = m; return answer; };
        global.alert = function (m) { log.alerts.push(m); };
        global.confirm = function (m) { log.confirms.push(m); return confirmAnswer; };
        var p = twoPresets("A");
        try {
            withStorage(function () {
                runDialogs(p, [function (win) {
                    edit(win, ZSM.L.MAX_DIST, "450");   // an edit, so there is something to save
                    if (pre) pre(win);
                    btn(win, ZSM.L.BTN_SAVE_AS).onClick();
                    log.items = itemTexts(win);
                }]);
            });
        } finally {
            global.prompt = o.prompt; global.alert = o.alert; global.confirm = o.confirm;
        }
        log.pData = p;
        return log;
    }
    var emptyNames = ["", "   ", "\t "];
    for (var ei = 0; ei < emptyNames.length; ei++) {
        var eLog = saveAs(emptyNames[ei], true);
        assertEq(JSON.stringify(eLog.alerts), JSON.stringify([ZSM.L.ERR_ENTER_NAME]),
            "Save As with " + JSON.stringify(emptyNames[ei]) + ": ERR_ENTER_NAME");
        assert(eLog.confirms.length === 0 && eLog.pData.activePreset === "A" && !eLog.pData.presets[emptyNames[ei]],
            "...and nothing is saved");
    }
    var rLog = saveAs("[x]", true);
    assertEq(JSON.stringify(rLog.alerts), JSON.stringify([ZSM.L.ERR_RESERVED_NAME]), "Save As with '[x]': ERR_RESERVED_NAME");
    assert(rLog.confirms.length === 0 && rLog.pData.activePreset === "A", "...and nothing is saved");
    var cLog = saveAs(null, true);
    assert(cLog.alerts.length === 0 && cLog.confirms.length === 0 && cLog.pData.activePreset === "A",
        "Save As cancelled (prompt null): no message, nothing saved");
    assertEq(cLog.prompt, ZSM.L.PROMPT_SAVE_AS, "Save As asks with PROMPT_SAVE_AS");

    var oLog = saveAs("A", false);
    assertEq(oLog.confirms.length, 1, "Save As over 'A': one confirmation");
    assert(String(oLog.confirms[0]).indexOf("„A“") !== -1, "...the confirmation names „A“ (got '" + oLog.confirms[0] + "')");
    assertEq(oLog.confirms[0], ZSM.L.format(ZSM.L.CONFIRM_OVERWRITE_PRESET, "A"), "...it is CONFIRM_OVERWRITE_PRESET");
    assertEq(oLog.pData.presets["A"].maxDist, 400, "...declined: 'A' keeps its saved value");
    var oLog2 = saveAs("  A  ", true);
    assertEq(oLog2.confirms.length, 1, "Save As over ' A ' (spaces): the trimmed name is confirmed");
    assert(String(oLog2.confirms[0]).indexOf("„A“") !== -1, "...as „A“");
    assertEq(oLog2.pData.presets["A"].maxDist, 450, "...accepted: 'A' holds the edited value");
    assertEq(JSON.stringify(oLog2.items), JSON.stringify([DEFAULT_ITEM, "A", "B"]), "...and the list shows no asterisk");

    var nLog = saveAs("C", true);
    assert(nLog.alerts.length === 0 && nLog.confirms.length === 0, "Save As with a new name: no message, no confirmation");
    assertEq(nLog.pData.activePreset, "C", "...the new preset is active");
    assertEq(nLog.pData.presets["C"].maxDist, 450, "...it holds the edited values");
    assertEq(nLog.pData.presets["A"].maxDist, 400, "...and 'A' is as it was saved");
    assertEq(JSON.stringify(nLog.items), JSON.stringify([DEFAULT_ITEM, "A", "B", "C"]), "...the list shows A without asterisk and C unmodified");

    // --- Delete: the canon's confirmation, the default cannot be deleted ---
    function del(active, confirmAnswer) {
        var log = { alerts: [], confirms: [] };
        var o = { alert: global.alert, confirm: global.confirm };
        global.alert = function (m) { log.alerts.push(m); };
        global.confirm = function (m) { log.confirms.push(m); return confirmAnswer; };
        var p = twoPresets(active);
        try {
            withStorage(function () {
                runDialogs(p, [function (win) {
                    btn(win, ZSM.L.BTN_DEL).onClick();
                    log.items = itemTexts(win);
                }]);
            });
        } finally { global.alert = o.alert; global.confirm = o.confirm; }
        log.pData = p;
        return log;
    }
    var dNo = del("A", false);
    assertEq(dNo.confirms.length, 1, "Delete 'A': one confirmation");
    assertEq(dNo.confirms[0], ZSM.L.format(ZSM.L.CONFIRM_DELETE_PRESET, "A"), "...it is CONFIRM_DELETE_PRESET");
    assert(String(dNo.confirms[0]).indexOf("„A“") !== -1, "...naming „A“");
    assert(dNo.pData.presets["A"] !== undefined && dNo.pData.activePreset === "A", "...declined: 'A' stays");
    var dYes = del("A", true);
    assert(dYes.pData.presets["A"] === undefined && dYes.pData.activePreset === "[Default]", "...accepted: 'A' is gone, [Default] is active");
    assertEq(JSON.stringify(dYes.items), JSON.stringify([DEFAULT_ITEM, "B"]), "...and the list follows");
    var dDef = del("[Default]", true);
    assertEq(JSON.stringify(dDef.alerts), JSON.stringify([ZSM.L.ERR_CANNOT_DELETE_DEFAULT]),
        "Delete on [Default]: ERR_CANNOT_DELETE_DEFAULT");
    assertEq(dDef.confirms.length, 0, "...without asking first");

    // --- the panel: ↺ in a group of its own, the buttons at their native widths ---
    var wP = buildAndCapture("ZUND");
    var pnl = wP.findOne(function (c) { return c.type === "panel" && c.text === ZSM.L.PANEL_PRESET; });
    var ddP = pnl.findOne(function (c) { return c.type === "dropdownlist"; });
    var revertP = btn(pnl, ZSM.L.BTN_REVERT);
    assert(revertP !== null, "the ↺ button is labelled with BTN_REVERT");
    assertEq(typeof ZSM.UI.M.REVERT_BTN, "number", "M.REVERT_BTN is a width");
    assertEq(ZSM.UI.M.PRESET_BTN, undefined, "M.PRESET_BTN is gone");
    assertEq(revertP.preferredSize.width, ZSM.UI.M.REVERT_BTN, "↺ takes its width from M.REVERT_BTN");
    assert(revertP.parent !== ddP.parent && revertP.parent.parent === ddP.parent,
        "↺ sits in a group of its own inside the list's row");
    assertEq(revertP.parent.children.length, 1, "...which holds nothing else");
    assertEq(JSON.stringify(revertP.parent.alignment), JSON.stringify(["right", "center"]), "...aligned right (it takes none of the row's slack)");
    var labels = [ZSM.L.BTN_SAVE, ZSM.L.BTN_SAVE_AS, ZSM.L.BTN_DEL, ZSM.L.BTN_RESET];
    for (var li = 0; li < labels.length; li++) {
        assertEq(btn(pnl, labels[li]).preferredSize.width, -1, "'" + labels[li] + "' has no width set (native)");
    }
    var oldRevert = ZSM.L.BTN_REVERT;
    ZSM.L.BTN_REVERT = "<R>";
    var wR = buildAndCapture("ZUND");
    assert(btn(wR, "<R>") !== null, "the ↺ text is not a literal in the code");
    ZSM.L.BTN_REVERT = oldRevert;
})();


// =====================================================
// TEST 23 (spec 1.2.0 §7): the status line says what the script found
// =====================================================
// At rest the line repeated the dialog's own settings ("ZUND · 1:10 · layers: 1",
// the count being mapping rows, not layers); an invalid field turned it amber
// with ⚠, and the pen it was given back was a guess. Now, as grommet-marks
// 1.4.0: two statictexts in one stack, exactly one of them visible — the
// finding (mode, artboard or artwork at real size, the cut colour found, the
// scale when not 1:1), disabled and never painted, and the reason Generate is
// grey, ✗ in the canon's error colour, painted once.
console.log("\n=== TEST 23 (spec 1.2.0 §7): the status line says what the script found ===");
(function () {
    var COLORS = ZSM.FieldPaint.COLORS;
    function sameRGB(pen, rgb) {
        var c = pen && pen.color;
        return !!c && c[0] === rgb[0] && c[1] === rgb[1] && c[2] === rgb[2];
    }
    // The status line: a stack of two statictexts (a layer row's stack holds a list and a field).
    function statusStack(win) {
        return win.findOne(function (c) {
            return c.type === "group" && c.orientation === "stack" && c.children.length === 2 &&
                   c.children[0].type === "statictext" && c.children[1].type === "statictext";
        });
    }
    function found(win)  { var s = statusStack(win); return s ? s.children[0] : null; }
    function reason(win) { var s = statusStack(win); return s ? s.children[1] : null; }
    function fieldCtl(win, label) {
        var lbl = win.findOne(function (c) { return c.type === "statictext" && c.text === label; });
        return lbl ? lbl.parent.findOne(function (c) { return c.type === "edittext"; }) : null;
    }
    function ctl(win, type, text) {
        return win.findOne(function (c) { return c.type === type && c.text === text; });
    }
    function okBtn(win) { return win.findOne(function (c) { return c.type === "button" && c.name === "ok"; }); }
    function presetData(patch) {
        var mine = ZSM.Config.getDefaults();
        for (var k in patch) { if (patch.hasOwnProperty(k)) mine[k] = patch[k]; }
        return { activePreset: "Mine", presets: { "[Default]": ZSM.Config.getDefaults(), "Mine": mine } };
    }
    // docData as show() builds it, with the document's findings patched in.
    function buildWith(mode, patch, doc) {
        var docData = {
            swatches: ZSM.Draw.getSwatchNames(), swatchRGB: ZSM.Draw.getSwatchRGBMap(),
            layers: ZSM.Draw.getLayerNames(), detectedColor: "Cut", drawingScale: 1,
            artboard: null, artwork: null
        };
        for (var k in doc) { if (doc.hasOwnProperty(k)) docData[k] = doc[k]; }
        ZSM.UI.buildDialog(mode, presetData(patch), docData);
        return SUI.lastWindow();
    }
    var FIXED = { useArtboardBounds: true };
    var AB = { artboard: { w: 1560, h: 3050 } };

    // --- the stack: finding disabled and never painted, reason painted once, widths from M ---
    var w0 = buildWith("ZUND", FIXED, AB);
    var f0 = found(w0), r0 = reason(w0);
    assert(f0 !== null && r0 !== null, "the status line is a stack of two statictexts");
    assertEq(typeof ZSM.UI.M.STATUS_W, "number", "M.STATUS_W is a width");
    assert(f0.preferredSize.width === ZSM.UI.M.STATUS_W && r0.preferredSize.width === ZSM.UI.M.STATUS_W,
        "both labels take their width from M.STATUS_W (got " + f0.preferredSize.width + ", " + r0.preferredSize.width + ")");
    assertEq(f0.enabled, false, "the finding is disabled (the canon's greyed line)");
    assertEq(r0.enabled, true, "the reason is enabled, so its colour shows");
    assert(sameRGB(r0.graphics.foregroundColor, COLORS.ERR), "the reason is painted in COLORS.ERR");
    assertEq(f0.graphics.assignments, 0, "the finding is never painted");
    assert(f0.visible === true && r0.visible === false, "valid values: the finding shows, the reason does not");

    // --- Fixed, artboard 1560 × 3050 mm, cut colour "Cut", 1:1 ---
    var t0 = f0.text;
    assert(t0.indexOf("ZUND · ") === 0, "the finding starts with the mode (got '" + t0 + "')");
    assert(t0.indexOf("artboard 1 560 × 3 050 mm") !== -1, "Fixed: the artboard at real size, thousands grouped (got '" + t0 + "')");
    assert(t0.indexOf("řez „Cut“") !== -1, "the cut colour found, in „…“ (got '" + t0 + "')");
    assertEq(t0.indexOf("1:"), -1, "1:1: no scale in the line (got '" + t0 + "')");
    assertEq(t0.indexOf("layers"), -1, "no mapping-row count any more (got '" + t0 + "')");

    // --- 1:10, artboard 156 × 305: the real size is × 10, the scale at the end ---
    var t10 = found(buildWith("ZUND", FIXED, { artboard: { w: 156, h: 305 }, drawingScale: 10 })).text;
    assert(t10.indexOf("artboard 1 560 × 3 050 mm") !== -1, "1:10: the artboard × 10 (got '" + t10 + "')");
    assert(/ · 1:10$/.test(t10), "1:10: the line ends ' · 1:10' (got '" + t10 + "')");

    // --- the scale typed while the dialog is open: size and ending follow the field ---
    var wS = buildWith("ZUND", FIXED, { artboard: { w: 156, h: 305 } });
    var etScale = fieldCtl(wS, ZSM.L.LBL_SCALE);
    etScale.text = "10"; etScale.onChanging();
    var tS = found(wS).text;
    assert(tS.indexOf("artboard 1 560 × 3 050 mm") !== -1 && / · 1:10$/.test(tS),
        "typing 10 into the scale: 1 560 × 3 050 mm and ' · 1:10' (got '" + tS + "')");

    // --- no cut colour: detectCutColor's registration fallback is "not found" ---
    var tReg = found(buildWith("ZUND", FIXED, { artboard: AB.artboard, detectedColor: "[Registration]" })).text;
    assert(tReg.indexOf("řez nenalezen") !== -1 && tReg.indexOf("„") === -1,
        "no cut colour ([Registration]): 'řez nenalezen' (got '" + tReg + "')");
    ZSM.Draw.getRegistrationName = function () { return "[Registrace]"; };
    try {
        var tRegCs = found(buildWith("ZUND", FIXED, { artboard: AB.artboard, detectedColor: "[Registrace]" })).text;
        assert(tRegCs.indexOf("řez nenalezen") !== -1, "no cut colour (Czech [Registrace]): 'řez nenalezen' (got '" + tRegCs + "')");
    } finally { delete ZSM.Draw.getRegistrationName; }

    // --- an invalid field: ✗ in the error colour; fixed, the finding and its own pen are back ---
    var wE = buildWith("ZUND", FIXED, AB);
    var fE = found(wE), rE = reason(wE), before = fE.text;
    var maxD = fieldCtl(wE, ZSM.L.MAX_DIST);
    maxD.text = "1O5"; maxD.onChanging();
    assert(rE.visible === true && fE.visible === false, "'1O5': the reason shows instead of the finding");
    assert(rE.text.indexOf("✗ ") === 0, "'1O5': the reason starts with ✗ (got '" + rE.text + "')");
    assertEq(rE.text.indexOf("⚠"), -1, "'1O5': no ⚠ any more");
    assert(sameRGB(rE.graphics.foregroundColor, COLORS.ERR), "'1O5': the reason's pen is COLORS.ERR");
    assertEq(okBtn(wE).enabled, false, "'1O5': Generate is grey");
    maxD.text = "450"; maxD.onChanging();
    assert(fE.visible === true && rE.visible === false, "'450' after '1O5': the finding shows again");
    assertEq(fE.text, before, "'450': the same finding as before the error");
    assert(fE.graphics.foregroundColor === fE.graphics.ownPen && fE.graphics.assignments === 0,
        "'450': the finding has the pen it had before the error (never written)");
    assert(!sameRGB(fE.graphics.foregroundColor, COLORS.ERR) && !sameRGB(fE.graphics.foregroundColor, COLORS.WARN),
        "'450': neither ERR nor WARN on the finding");
    // Several invalid fields: the count, after ✗.
    maxD.text = "x"; maxD.onChanging();
    var gapO = fieldCtl(wE, ZSM.L.GAP_ZO);
    gapO.text = "y"; gapO.onChanging();
    assert(rE.visible === true && rE.text.indexOf("✗ 2 out of range") === 0,
        "two invalid fields: '✗ ' and the count (got '" + rE.text + "')");

    // --- Auto-fit: the artwork's size when known, never the artboard's ---
    var tAuto = found(buildWith("ZUND", {}, AB)).text;
    assert(tAuto.indexOf("artboard") === -1 && tAuto.indexOf("×") === -1,
        "Auto-fit, artwork not measured: no size at all (got '" + tAuto + "')");
    assertEq(tAuto, "ZUND · řez „Cut“", "Auto-fit, artwork not measured: mode and cut colour");
    var tArt = found(buildWith("ZUND", {}, { artboard: AB.artboard, artwork: { w: 1200, h: 800 } })).text;
    assert(tArt.indexOf("grafika 1 200 × 800 mm") !== -1 && tArt.indexOf("artboard") === -1,
        "Auto-fit, artwork measured: 'grafika 1 200 × 800 mm' (got '" + tArt + "')");
    // The source radios switch the line while the dialog is open.
    var wR = buildWith("ZUND", {}, AB);
    var rbFixedCtl = ctl(wR, "radiobutton", ZSM.L.SRC_FIXED), rbAutoCtl = ctl(wR, "radiobutton", ZSM.L.SRC_AUTO);
    rbFixedCtl.value = true; rbAutoCtl.value = false; rbFixedCtl.onClick();
    var tToFixed = found(wR).text;
    rbAutoCtl.value = true; rbFixedCtl.value = false; rbAutoCtl.onClick();
    var tToAuto = found(wR).text;
    assert(tToFixed.indexOf("artboard 1 560 × 3 050 mm") !== -1, "Auto -> Fixed: the artboard appears (got '" + tToFixed + "')");
    assertEq(tToAuto.indexOf("artboard"), -1, "Fixed -> Auto: the artboard goes (got '" + tToAuto + "')");

    // --- SUMMA fits the artwork: no artboard size ---
    var tSum = found(buildWith("SUMMA", { mode: "SUMMA" }, AB)).text;
    assertEq(tSum, "SUMMA · řez „Cut“", "SUMMA, artwork not measured: mode and cut colour only (got '" + tSum + "')");
    var tSumArt = found(buildWith("SUMMA", { mode: "SUMMA" }, { artwork: { w: 1200, h: 800 }, drawingScale: 2.5 })).text;
    assert(tSumArt.indexOf("SUMMA · grafika 3 000 × 2 000 mm") === 0 && / · 1:2\.5$/.test(tSumArt),
        "SUMMA, artwork measured at 1:2.5: real size and the scale (got '" + tSumArt + "')");

    // --- marks only: "pouze značky" in place of the cut colour, live ---
    var wM = buildWith("ZUND", { useArtboardBounds: true, marksOnly: true }, AB);
    var tM = found(wM).text;
    assert(tM.indexOf("pouze značky") !== -1 && tM.indexOf("řez") === -1,
        "marks only: 'pouze značky', no cut colour (got '" + tM + "')");
    var cbM = ctl(wM, "checkbox", ZSM.L.MARKS_ONLY);
    cbM.value = false; cbM.onClick();
    assert(found(wM).text.indexOf("řez „Cut“") !== -1, "marks only off: the cut colour is back (got '" + found(wM).text + "')");

    // --- decimals: a tenth, the locale's separators ---
    ZSM.L.DEC_SEP = ",";
    var tDec = found(buildWith("ZUND", FIXED, { artboard: { w: 1234.56, h: 99.94 } })).text;
    assert(tDec.indexOf("artboard 1 234,6 × 99,9 mm") !== -1, "cs: '1 234,6 × 99,9 mm' (got '" + tDec + "')");
    ZSM.L.DEC_SEP = "."; ZSM.L.THOU_SEP = ",";
    var tDecEn = found(buildWith("ZUND", FIXED, { artboard: { w: 1234.56, h: 99.94 } })).text;
    assert(tDecEn.indexOf("artboard 1,234.6 × 99.9 mm") !== -1, "en: '1,234.6 × 99.9 mm' (got '" + tDecEn + "')");
    ZSM.L.THOU_SEP = " ";
    delete ZSM.L.DEC_SEP;

    // --- the real tables: the spec's text in Czech, its English twin, the duplicate named in „…“ ---
    var localeSrc = fs.readFileSync(path.join(__dirname, "..", "src", "locale.js"), "utf8");
    function realL(locale) { return new Function("ZSM", "app", localeSrc + "; return ZSM.L;")({}, { locale: locale }); }
    var mockL = ZSM.L;
    try {
        ZSM.L = realL("cs_CZ");
        assertEq(found(buildWith("ZUND", FIXED, { artboard: { w: 156, h: 305 }, drawingScale: 10 })).text,
            "ZUND · artboard 1 560 × 3 050 mm · řez „Cut“ · 1:10", "cs: the spec's line, word for word");
        var cs = ZSM.L;
        assertEq(cs.STATUS_OK, undefined, "cs: STATUS_OK is gone");
        assertEq(cs.STATUS_OK_MARKS, undefined, "cs: STATUS_OK_MARKS is gone");
        var dupD = presetData(FIXED);
        dupD.presets["Mine"].layers = [{ name: "Cut", color: "Cut" }, { name: "Kiss-cut", color: "Cut" }];
        ZSM.UI.buildDialog("ZUND", dupD, { swatches: ZSM.Draw.getSwatchNames(), swatchRGB: ZSM.Draw.getSwatchRGBMap(),
            layers: ZSM.Draw.getLayerNames(), detectedColor: "Cut", drawingScale: 1, artboard: null, artwork: null });
        var rDup = reason(SUI.lastWindow());
        assertEq(rDup.text, "✗ Barva „Cut“ je přiřazena více vrstvám — odeberte duplicitu.",
            "cs: the duplicate colour is named in „…“");
        ZSM.L = realL("en_US");
        assertEq(found(buildWith("ZUND", FIXED, { artboard: { w: 156, h: 305 }, drawingScale: 10 })).text,
            "ZUND · artboard 1,560 × 3,050 mm · cut \"Cut\" · 1:10", "en: the same line in English");
        assertEq(found(buildWith("ZUND", { useArtboardBounds: true, marksOnly: true }, { artboard: { w: 156, h: 305 },
            detectedColor: "[Registration]" })).text, "ZUND · artboard 156 × 305 mm · marks only", "en: marks only");
        assertEq(found(buildWith("ZUND", FIXED, { artboard: { w: 156, h: 305 }, detectedColor: "[Registration]" })).text,
            "ZUND · artboard 156 × 305 mm · no cut colour", "en: no cut colour");
        assertEq(ZSM.L.STATUS_OK, undefined, "en: STATUS_OK is gone");
    } finally { ZSM.L = mockL; }

    // --- show() reads the active artboard, Large Canvas included, and leaves the selection alone ---
    var origApp = global.app, selectionWrites = 0;
    var abs = [{ artboardRect: [0, 100, 100, 0] }, { artboardRect: [0, 864.5669, 442.2047, 0] }];
    abs.getActiveArtboardIndex = function () { return 1; };
    var doc = { XMPString: XMP_PACKET, scaleFactor: 10, artboards: abs };
    Object.defineProperty(doc, "selection", { get: function () { return []; }, set: function () { selectionWrites++; } });
    global.app = { documents: { length: 1 }, activeDocument: doc };
    var last = ZSM.Config.getDefaults();
    last.useArtboardBounds = true;
    var shownLine = null;
    try {
        runDialogs({ activePreset: "[Default]", presets: { "[Default]": ZSM.Config.getDefaults(), "[Last Settings]": last } },
            [function (win) { shownLine = found(win).text; }]);
    } finally { global.app = origApp; }
    assert(shownLine !== null && shownLine.indexOf("artboard 1 560 × 3 050 mm") !== -1,
        "show(): the active artboard (156 × 305 mm) × Large Canvas 10 (got '" + shownLine + "')");
    assertEq(selectionWrites, 0, "show(): the selection is never written before the dialog");
})();


// =====================================================
// TEST 23 (spec 1.2.0 §9.3, §10): the validation alerts and the first focus
// =====================================================
// A blocking alert carries one ERROR_PREFIX; the field name has no colon of its
// own in the middle of the sentence and no exclamation mark ("Mezera od okraje:
// musí být číslo!" -> "Mezera od okraje: zadejte číslo od 0 do 1000 mm."); the
// drawing scale names no ratio and no unit. The dialog's first focus goes to
// the first field the operator can type in — in Fixed the gap from graphics is
// greyed, and the focus used to land on it.
console.log("\n=== TEST 23 (spec 1.2.0 §9.3, §10): validation alerts, first focus ===");
(function () {
    function fieldOf(win, label) {
        var lbl = win.findOne(function (c) { return c.type === "statictext" && c.text === label; });
        return lbl ? lbl.parent.findOne(function (c) { return c.type === "edittext"; }) : null;
    }
    function okOf(win) { return win.findOne(function (c) { return c.type === "button" && c.name === "ok"; }); }
    function dataOf(patch) {
        var mine = ZSM.Config.getDefaults();
        for (var k in patch) { if (patch.hasOwnProperty(k)) mine[k] = patch[k]; }
        return { activePreset: "[Default]", presets: { "[Default]": ZSM.Config.getDefaults(), "[Last Settings]": mine } };
    }
    function activeFields(win) {
        return win.find(function (c) { return c.type === "edittext" && c.active === true; });
    }
    // Generate pressed on a dialog whose field `label` holds `text`; returns the alerts.
    function generateWith(mode, patch, label, text) {
        var seen = [], o = global.alert;
        global.alert = function (m) { seen.push(String(m)); };
        try {
            var win = buildAndCapture(mode, dataOf(patch));
            var f = fieldOf(win, label);
            f.text = text; f.onChanging();
            okOf(win).onClick();
        } finally { global.alert = o; }
        return seen;
    }

    // --- first focus ---
    var wFocusAuto = buildAndCapture("ZUND", dataOf({ useArtboardBounds: false }));
    var actAuto = activeFields(wFocusAuto);
    assertEq(actAuto.length, 1, "ZUND Auto-fit: one field has the focus");
    assert(actAuto[0] === fieldOf(wFocusAuto, ZSM.L.GAP_GZ), "ZUND Auto-fit: the focus is on the gap from graphics");

    var wFocusFixed = buildAndCapture("ZUND", dataOf({ useArtboardBounds: true }));
    assertEq(fieldOf(wFocusFixed, ZSM.L.GAP_GZ).enabled, false, "ZUND Fixed: precondition, the gap from graphics is greyed");
    var actFixed = activeFields(wFocusFixed);
    assertEq(actFixed.length, 1, "ZUND Fixed: one field has the focus");
    assert(actFixed[0] === fieldOf(wFocusFixed, ZSM.L.GAP_ZO) && actFixed[0].enabled === true,
        "ZUND Fixed: the focus is on the first field that can be typed in (gap from edge), not on the greyed one");

    var wFocusSumma = buildAndCapture("SUMMA", dataOf({ mode: "SUMMA" }));
    var actSumma = activeFields(wFocusSumma);
    assert(actSumma.length === 1 && actSumma[0] === fieldOf(wFocusSumma, ZSM.L.GAP_ZO), "SUMMA: the focus is on the gap from edge");

    // --- alerts from validation ---
    var typo = generateWith("ZUND", {}, ZSM.L.GAP_ZO, "abc");
    assertEq(typo.length, 1, "a typo in a field: Generate shows one alert");
    assertEq(typo[0], "ERR: Gap from edge: enter a number from 0 to 1000 mm.", "...one prefix, the name without its colon, the range in mm");

    var range = generateWith("ZUND", {}, ZSM.L.MAX_DIST, "9999");
    assertEq(range[0], "ERR: Max dist: enter a number from 5 to 5000 mm.", "out of range: the same sentence");

    var scale = generateWith("ZUND", {}, ZSM.L.LBL_SCALE, "500");
    assertEq(scale.length, 1, "the scale out of range: one alert");
    assertEq(scale[0], "ERR: Drawing scale: enter a number from 1 to 100.", "...no \"1:\" after the name, no \"mm\"");
    var scaleTypo = generateWith("ZUND", {}, ZSM.L.LBL_SCALE, "1O");
    assertEq(scaleTypo[0], scale[0], "the scale typo: the same sentence");

    var all = typo.concat(range, scale, scaleTypo);
    for (var ai = 0; ai < all.length; ai++) {
        assert(all[ai].indexOf(": :") === -1 && all[ai].indexOf("::") === -1 && all[ai].indexOf("!") === -1,
            "alert " + ai + ": no second colon, no exclamation mark");
    }

    // --- a mapping row with a colour and no name: a blocking error with the prefix, the colour as the list shows it ---
    // On a Czech install the document's registration swatch is "[Registrační]";
    // the stored token "[Registration]" must not reach the operator (spec 9.5).
    function nameAlertFor(swatches, rowColour) {
        var seen = [], oA = global.alert, shown = {};
        global.alert = function (m) { seen.push(String(m)); };
        var rgb = {};
        for (var si = 0; si < swatches.length; si++) rgb[swatches[si]] = "REG";
        var d = dataOf({ layers: [{ name: "Cut", color: rowColour }] });
        try {
            ZSM.UI.buildDialog("ZUND", d, { swatches: swatches, swatchRGB: rgb, layers: ZSM.Draw.getLayerNames(),
                detectedColor: "Cut", drawingScale: 1 });
            var wN = SUI.lastWindow();
            var panelN = wN.findOne(function (c) { return c.type === "panel" && c.text === ZSM.L.PANEL_LAYERS; });
            // The row's second dropdown is the colour (the first lists the layers).
            shown.colour = ZSM.UI.ddlValue(panelN.find(function (c) { return c.type === "dropdownlist"; })[1]);
            panelN.findOne(function (c) { return c.type === "edittext"; }).text = "";
            okOf(wN).onClick();
        } finally { global.alert = oA; }
        shown.alerts = seen;
        return shown;
    }
    var CZ_REG = "[Registrační]", origRegName = ZSM.Draw.getRegistrationName;
    ZSM.Draw.getRegistrationName = function () { return CZ_REG; };
    try {
        var nameReg = nameAlertFor([CZ_REG, "Cut", "Kiss-cut"], "[Registration]");
        assertEq(nameReg.colour, CZ_REG, "a row on the registration colour: the list shows the document's swatch name");
        assertEq(nameReg.alerts.length, 1, "...a layer row without a name: one alert");
        assertEq(nameReg.alerts[0], "ERR: " + ZSM.L.format(ZSM.L.ERR_LAY_NAME, CZ_REG),
            "...with the prefix and the colour as the list shows it (got: " + nameReg.alerts[0] + ")");
        assert(nameReg.alerts[0].indexOf("[Registration]") === -1, "...never the stored token [Registration]");
        var nameCut = nameAlertFor([CZ_REG, "Cut", "Kiss-cut"], "Cut");
        assertEq(nameCut.alerts[0], "ERR: " + ZSM.L.format(ZSM.L.ERR_LAY_NAME, "Cut"), "a spot colour is named as it is");
    } finally {
        if (origRegName === undefined) delete ZSM.Draw.getRegistrationName; else ZSM.Draw.getRegistrationName = origRegName;
    }

    // --- settings that could not be saved from the preset buttons: the preset sentence, the dialog stays ---
    var saveAlerts = [], oAlert2 = global.alert, oPrompt = global.prompt, origStorage23 = ZSM.Storage;
    global.alert = function (m) { saveAlerts.push(String(m)); };
    global.prompt = function () { return "Novy"; };
    ZSM.Storage = { save: function () { return false; } };
    try {
        var wSave = buildAndCapture("ZUND", dataOf({}));
        fieldOf(wSave, ZSM.L.MAX_DIST).text = "450"; fieldOf(wSave, ZSM.L.MAX_DIST).onChanging();
        wSave.findOne(function (c) { return c.type === "button" && c.text === ZSM.L.BTN_SAVE_AS; }).onClick();
    } finally {
        global.alert = oAlert2; global.prompt = oPrompt; ZSM.Storage = origStorage23;
        if (origStorage23 === undefined) delete ZSM.Storage;
    }
    assertEq(JSON.stringify(saveAlerts), JSON.stringify([ZSM.L.ERR_WRITE_SETTINGS]), "Save As that cannot write: ERR_WRITE_SETTINGS once");
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
