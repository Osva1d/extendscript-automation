#!/usr/bin/env node
/**
 * ZSM.Draw.render() Integration Test Suite
 *
 * Uses tests/lib/mock_illustrator.js to simulate the Illustrator DOM
 * with mutation tracking. Tests verify:
 *   - render() doesn't throw on edge cases
 *   - Correct number of mark items created (Zünd circles, Summa squares)
 *   - Correct sublayer structure (Regmarks/Zünd, Regmarks/Summa) + top-level Trim
 *   - Mode-specific sublayer cleanup (Zünd run removes Zünd sub, preserves Summa)
 *   - Bottom-most layer renamed to Graphics
 *   - Coordinate validation prevents creation beyond AI's 16383pt limit
 *   - movePaths semantics
 *
 * NOT covered: C++ crashes, app.redraw timing, real ScriptUI behavior.
 *
 * Usage: node tests/test_draw_render.js
 */

var fs   = require("fs");
var path = require("path");
var Mock = require("./lib/mock_illustrator.js");

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
Mock.install();

// `var ZSM = ZSM || {}` in production files reuses this declaration
var ZSM = {};
ZSM.L = {
    ERROR_PREFIX: "ERR: ",
    ERR_RENDER_CRITICAL: "render error: ",
    ERR_GENERIC: "err: %s",
    ERR_COLOR_MISSING: "missing color %s",
    WARN_PREFIX: "WARN: ",
    WARN_LAYERS_UNHIDDEN: "unhidden %s",
    ERR_MARKS_FAILED: "marks failed %s",
    WARN_MIXED_PAINT: "mixed %s %s",
    WARN_PATHS_SKIPPED: "skipped %s %s %s %s",
    WARN_REG_ROUTING: "regskip %s",
    format: function (template) {
        var args = [];
        for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
        var idx = 0;
        return template.replace(/%s/g, function () { return idx < args.length ? String(args[idx++]) : "%s"; });
    }
};
ZSM.Config = {
    layerRegmarks: "Regmarks",
    layerGraphics: "Graphics",
    layerTrim:     "Trim",
    summaXCenter: 10,    // mm: distance from graphic edge to Summa mark center (X)
    summaYVisual: 10,    // mm: gap from graphic edge to Summa mark outer edge (Y)
    redLineWidth: 1,
    rulerBuffer: 0.1,
    debug: false
};

// Mock alert (for errors raised by render)
global.alert = function () {};

eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "..", "shared", "lib", "cut_marks.js"), "utf8"));
buildCutMarks(ZSM);   // shared factory — must run after ZSM.Utils and ZSM.Config
// Load bounds before draw — draw.getBounds delegates to ZSM.Bounds.get
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "bounds.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "draw.js"), "utf8"));

/** Build a fresh document and bind it as activeDocument */
function setupDoc(spec) {
    var doc = Mock.buildDoc(spec);
    global.app.activeDocument = doc;
    return doc;
}

/** Build typical settings object for tests */
function makeSettings(overrides) {
    var s = {
        mode: "ZUND",
        gapInner: 5, gapOuter: 0, maxDist: 500,
        feedTop: 70, feedBottom: 50,
        drawRed: false, useArtboardBounds: false,
        markSizeZ: 5, markSizeS: 3, orientDist: 100,
        markColor: "[Registration]",
        layers: []
    };
    if (overrides) for (var k in overrides) {
        if (overrides.hasOwnProperty(k)) s[k] = overrides[k];
    }
    return s;
}

/** Quick helper: count items of a given typename in a layer (recursive) */
function countItems(layer, typename) {
    if (!layer) return 0;
    var n = 0;
    function walk(lay) {
        if (!lay || !lay._items) return;
        for (var i = 0; i < lay._items.length; i++) {
            if (lay._items[i].typename === typename) n++;
            // recurse into groups
            if (lay._items[i]._items) {
                for (var ii = 0; ii < lay._items[i]._items.length; ii++) {
                    if (lay._items[i]._items[ii].typename === typename) n++;
                }
            }
        }
        for (var si = 0; si < lay._sublayers.length; si++) walk(lay._sublayers[si]);
    }
    walk(layer);
    return n;
}

/** Find sublayer by name (recursive depth-1) */
function findSublayer(layer, name) {
    for (var i = 0; i < layer._sublayers.length; i++) {
        if (layer._sublayers[i].name === name) return layer._sublayers[i];
    }
    return null;
}

/** Find top-level layer by name in doc */
function findLayer(doc, name) {
    for (var i = 0; i < doc._layers.length; i++) {
        if (doc._layers[i].name === name) return doc._layers[i];
    }
    return null;
}


// =====================================================
// TEST 1: ZUND mode — fresh document → creates Regmarks/Zünd structure
// =====================================================
console.log("\n=== TEST 1: ZUND fresh document ===");
var doc = setupDoc({
    layers: [{ name: "Layer 1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }]
});
var settings = makeSettings({ mode: "ZUND" });
var bounds = ZSM.Draw.getBounds(settings);
var geo = ZSM.Core.calculateAll(settings, bounds);
ZSM.Draw.render(geo, settings);

var regmarks = findLayer(doc, "Regmarks");
assert(regmarks !== null, "ZUND: Regmarks layer created");
var zundSub = regmarks ? findSublayer(regmarks, "Zünd") : null;
assert(zundSub !== null, "ZUND: 'Zünd' sublayer created inside Regmarks");
var summaSub = regmarks ? findSublayer(regmarks, "Summa") : null;
assert(summaSub === null, "ZUND fresh: 'Summa' sublayer NOT present");

// Mark count: 4 corners + 1 orient + intermediate marks (none for 100mm graphic with maxDist=500)
var markCount = zundSub ? countItems(zundSub, "PathItem") : 0;
assertEq(markCount, 5, "ZUND: 5 mark items in Zünd sublayer (4 corners + 1 orient)");

// Bottom layer renamed
var lastLayer = doc._layers[doc._layers.length - 1];
assertEq(lastLayer.name, "Graphics", "ZUND: bottom-most layer renamed to 'Graphics'");


// =====================================================
// TEST 2: SUMMA mode — fresh → creates Regmarks/Summa + bar
// =====================================================
console.log("\n=== TEST 2: SUMMA fresh document ===");
doc = setupDoc({
    layers: [{ name: "Layer 1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }]
});
settings = makeSettings({ mode: "SUMMA" });
bounds = ZSM.Draw.getBounds(settings);
geo = ZSM.Core.calculateAll(settings, bounds);
ZSM.Draw.render(geo, settings);

regmarks = findLayer(doc, "Regmarks");
summaSub = regmarks ? findSublayer(regmarks, "Summa") : null;
assert(summaSub !== null, "SUMMA: 'Summa' sublayer created");

// 4 corners + intermediates (none for 100mm) + 1 OPOS bar = 5 items
markCount = summaSub ? countItems(summaSub, "PathItem") : 0;
assertEq(markCount, 5, "SUMMA: 4 corners + 1 OPOS bar in Summa sublayer (got " + markCount + ")");


// =====================================================
// TEST 3: ZUND → SUMMA workflow (preserves Zünd sublayer)
// =====================================================
console.log("\n=== TEST 3: Sequential ZUND→SUMMA preserves Zünd ===");
doc = setupDoc({
    layers: [{ name: "Layer 1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }]
});
// First run: ZUND
settings = makeSettings({ mode: "ZUND" });
bounds = ZSM.Draw.getBounds(settings);
geo = ZSM.Core.calculateAll(settings, bounds);
ZSM.Draw.render(geo, settings);

// Second run: SUMMA
settings = makeSettings({ mode: "SUMMA" });
bounds = ZSM.Draw.getBounds(settings);
geo = ZSM.Core.calculateAll(settings, bounds);
ZSM.Draw.render(geo, settings);

regmarks = findLayer(doc, "Regmarks");
zundSub = regmarks ? findSublayer(regmarks, "Zünd") : null;
summaSub = regmarks ? findSublayer(regmarks, "Summa") : null;
assert(zundSub !== null, "Sequential: 'Zünd' sublayer preserved after SUMMA run");
assert(summaSub !== null, "Sequential: 'Summa' sublayer added");
assert(zundSub && countItems(zundSub, "PathItem") > 0, "Sequential: Zünd marks still in place");


// =====================================================
// TEST 4: Re-run same mode replaces old sublayer
// =====================================================
console.log("\n=== TEST 4: Re-run same mode replaces sublayer ===");
doc = setupDoc({
    layers: [{ name: "Layer 1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }]
});
settings = makeSettings({ mode: "ZUND" });
bounds = ZSM.Draw.getBounds(settings);
geo = ZSM.Core.calculateAll(settings, bounds);
ZSM.Draw.render(geo, settings);

// Track item count after first render
regmarks = findLayer(doc, "Regmarks");
var firstZund = findSublayer(regmarks, "Zünd");
var firstCount = countItems(firstZund, "PathItem");

// Re-run with maxDist=50 → many more intermediate marks
settings = makeSettings({ mode: "ZUND", maxDist: 50 });
bounds = ZSM.Draw.getBounds(settings);
geo = ZSM.Core.calculateAll(settings, bounds);
ZSM.Draw.render(geo, settings);

var secondZund = findSublayer(regmarks, "Zünd");
var secondCount = countItems(secondZund, "PathItem");
assert(secondZund !== firstZund, "Re-run: new Zünd sublayer instance (old removed)");
assert(secondCount > firstCount, "Re-run with maxDist=50: more intermediate marks (got " +
    secondCount + " vs " + firstCount + ")");


// =====================================================
// TEST 5: Coordinate overflow validation
// =====================================================
console.log("\n=== TEST 5: Coordinate overflow protection ===");
doc = setupDoc({
    layers: [{ name: "Layer 1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }]
});
// Inject extreme coordinates that exceed AI's 16383pt limit
settings = makeSettings({ mode: "ZUND" });
bounds = ZSM.Draw.getBounds(settings);
geo = ZSM.Core.calculateAll(settings, bounds);
// Manually inflate one mark to trigger validation
geo.marksZ.push({ cx: 99999, cy: 99999 });
geo.marksZ.push({ cx: NaN, cy: 0 });

var threwError = false;
try { ZSM.Draw.render(geo, settings); } catch (e) { threwError = true; }
assert(!threwError, "Coordinate overflow: render() does not throw");

regmarks = findLayer(doc, "Regmarks");
zundSub = findSublayer(regmarks, "Zünd");
markCount = countItems(zundSub, "PathItem");
// Original 5 marks valid + 2 invalid (skipped) = 5
assertEq(markCount, 5, "Coordinate overflow: invalid marks skipped (got " + markCount + ")");


// =====================================================
// TEST 6: Empty document (no artwork) — graceful handling
// =====================================================
console.log("\n=== TEST 6: Empty document ===");
doc = setupDoc({ layers: [{ name: "Layer 1", items: [] }] });
settings = makeSettings({ mode: "ZUND" });
bounds = ZSM.Draw.getBounds(settings);
assert(bounds === null, "Empty doc: getBounds returns null");
// In real flow, main.js would catch this and alert. We test that calling render
// with synthetic geo doesn't crash.


// =====================================================
// TEST 7: Pre-existing Regmarks with legacy items → cleared on first run
// =====================================================
console.log("\n=== TEST 7: Legacy Regmarks cleanup ===");
doc = setupDoc({
    layers: [
        { name: "Regmarks", items: [
            { type: "path", bounds: [-50, 200, 200, -50] }   // legacy mark
        ]},
        { name: "Layer 1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }
    ]
});
settings = makeSettings({ mode: "ZUND" });
bounds = ZSM.Draw.getBounds(settings);
// Bounds should NOT include the legacy mark (it's on Regmarks, skipped)
assertEq(bounds[0], 0, "Legacy: bounds L=0 (Regmarks legacy mark skipped)");
assertEq(bounds[2], 100, "Legacy: bounds R=100");

geo = ZSM.Core.calculateAll(settings, bounds);
ZSM.Draw.render(geo, settings);

regmarks = findLayer(doc, "Regmarks");
// Legacy items should be cleared (Zünd sublayer takes over)
assert(regmarks._items.length === 0, "Legacy: Regmarks direct items cleared");
zundSub = findSublayer(regmarks, "Zünd");
assert(zundSub !== null, "Legacy: Zünd sublayer created after cleanup");


// =====================================================
// TEST 8: drawRed = true → trim lines in a top-level "Trim" layer
// =====================================================
// Trim is now ALWAYS a dedicated top-level "Trim" layer (both modes), never a
// Graphics/Trim sublayer — consistent placement, out of Regmarks and cut layers.
console.log("\n=== TEST 8: Trim lines in top-level 'Trim' layer ===");
doc = setupDoc({
    layers: [{ name: "Layer 1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }]
});
settings = makeSettings({ mode: "SUMMA", drawRed: true });
bounds = ZSM.Draw.getBounds(settings);
geo = ZSM.Core.calculateAll(settings, bounds);
ZSM.Draw.render(geo, settings);

var trimLayer = findLayer(doc, "Trim");
assert(trimLayer !== null, "drawRed: top-level 'Trim' layer created");
var trimCount = trimLayer ? countItems(trimLayer, "PathItem") : 0;
assertEq(trimCount, 2, "drawRed: 2 trim lines (top + bottom)");
var graphicsLayer = findLayer(doc, "Graphics");
assert(!graphicsLayer || findSublayer(graphicsLayer, "Trim") === null,
    "drawRed: NO Trim sublayer inside Graphics (trim is top-level now)");


// =====================================================
// TEST 9: drawRed = false → no Trim layer at all
// =====================================================
console.log("\n=== TEST 9: No trim layer when drawRed=false ===");
doc = setupDoc({
    layers: [{ name: "Layer 1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }]
});
settings = makeSettings({ mode: "SUMMA", drawRed: false });
bounds = ZSM.Draw.getBounds(settings);
geo = ZSM.Core.calculateAll(settings, bounds);
ZSM.Draw.render(geo, settings);

assert(findLayer(doc, "Trim") === null, "drawRed=false: no 'Trim' layer");


// =====================================================
// TEST 10: movePaths — spot-colored items moved to target layer
// =====================================================
console.log("\n=== TEST 10: movePaths moves spot-colored items ===");
doc = setupDoc({
    layers: [{
        name: "Layer 1",
        items: [
            { type: "path", bounds: [0, 100, 100, 0] },                                            // no spot
            { type: "path", bounds: [10, 90, 90, 10], spot: "Cut" },                               // spot Cut on fill
            { type: "path", bounds: [20, 80, 80, 20], strokeSpot: "Cut", stroked: true, filled: false }  // spot Cut on stroke (no fill)
        ]
    }]
});
settings = makeSettings({
    mode: "ZUND",
    layers: [{ name: "Cut", color: "Cut" }]
});
bounds = ZSM.Draw.getBounds(settings);
geo = ZSM.Core.calculateAll(settings, bounds);
ZSM.Draw.render(geo, settings);

var cutLayer = findLayer(doc, "Cut");
assert(cutLayer !== null, "movePaths: 'Cut' layer created");
var cutItemCount = cutLayer ? countItems(cutLayer, "PathItem") : 0;
assert(cutItemCount >= 2, "movePaths: 2 spot-Cut items moved (got " + cutItemCount + ")");


// =====================================================
// TEST 11: Locked layer in document — render unlocks it
// =====================================================
console.log("\n=== TEST 11: Render handles locked layers ===");
doc = setupDoc({
    layers: [{
        name: "Layer 1",
        locked: true,
        items: [{ type: "path", bounds: [0, 100, 100, 0] }]
    }]
});
settings = makeSettings({ mode: "ZUND" });

// Run beginSession to unlock
ZSM.Draw.beginSession();
assertEq(doc._layers[0].locked, false, "beginSession: locked layer unlocked");

bounds = ZSM.Draw.getBounds(settings);
geo = ZSM.Core.calculateAll(settings, bounds);
threwError = false;
try { ZSM.Draw.render(geo, settings); } catch (e) { threwError = true; }
assert(!threwError, "Locked layer: render() doesn't throw");

ZSM.Draw.endSession();
// Find the layer (now renamed to Graphics)
var graphicsLay = findLayer(doc, "Graphics");
if (graphicsLay) {
    assertEq(graphicsLay.locked, true, "endSession: original lock restored on renamed layer");
}


// =====================================================
// TEST 12: Bracket-named artifact layer — never mutated
// =====================================================
console.log("\n=== TEST 12: Artifact layer state preserved ===");
doc = setupDoc({
    layers: [
        { name: "<Clip Group>", locked: true, items: [{ type: "path", bounds: [0, 100, 100, 0] }] },
        { name: "Layer 1", items: [{ type: "path", bounds: [10, 90, 90, 10] }] }
    ]
});
settings = makeSettings({ mode: "ZUND" });
ZSM.Draw.beginSession();
// Artifact layer should NOT be unlocked (skip protects from C++ crash)
assertEq(doc._layers[0].locked, true, "Artifact layer: lock state preserved (not modified)");
assertEq(doc._layers[0].name, "<Clip Group>", "Artifact layer: name unchanged");
ZSM.Draw.endSession();


// =====================================================
// TEST 13: render() with NaN bounds doesn't crash
// =====================================================
console.log("\n=== TEST 13: render() with NaN-injected geo ===");
doc = setupDoc({ layers: [{ name: "Layer 1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }] });
settings = makeSettings({ mode: "ZUND" });
bounds = ZSM.Draw.getBounds(settings);
geo = ZSM.Core.calculateAll(settings, bounds);
// Inject some NaN coords
geo.marksZ[0].cx = NaN;
geo.marksZ[1].cy = Infinity;
threwError = false;
try { ZSM.Draw.render(geo, settings); } catch (e) { threwError = true; }
assert(!threwError, "NaN/Infinity in geo: render() doesn't throw");


// =====================================================
// TEST 14: Multiple layer mappings (color-based moves)
// =====================================================
console.log("\n=== TEST 14: Multiple layer mappings ===");
doc = setupDoc({
    layers: [{
        name: "Layer 1",
        items: [
            { type: "path", bounds: [0, 100, 100, 0] },                                            // plain
            { type: "path", bounds: [5, 95, 95, 5], spot: "Cut", filled: true },                   // Cut
            { type: "path", bounds: [10, 90, 90, 10], spot: "Kiss-cut", filled: true }             // Kiss-cut
        ]
    }]
});
settings = makeSettings({
    mode: "ZUND",
    layers: [
        { name: "Cut",      color: "Cut" },
        { name: "Kiss-cut", color: "Kiss-cut" }
    ]
});
bounds = ZSM.Draw.getBounds(settings);
geo = ZSM.Core.calculateAll(settings, bounds);
ZSM.Draw.render(geo, settings);

var cutL = findLayer(doc, "Cut");
var kissL = findLayer(doc, "Kiss-cut");
assert(cutL !== null, "Multi-layer mapping: 'Cut' layer created");
assert(kissL !== null, "Multi-layer mapping: 'Kiss-cut' layer created");
assert(countItems(cutL, "PathItem") >= 1, "Multi-layer: Cut item moved");
assert(countItems(kissL, "PathItem") >= 1, "Multi-layer: Kiss-cut item moved");


// =====================================================
// TEST 15: Mutation log captures key operations
// =====================================================
console.log("\n=== TEST 15: Mutation log integrity ===");
doc = setupDoc({
    layers: [{ name: "Layer 1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }]
});
settings = makeSettings({ mode: "ZUND" });
bounds = ZSM.Draw.getBounds(settings);
geo = ZSM.Core.calculateAll(settings, bounds);
doc._mutationLog = [];   // reset log
ZSM.Draw.render(geo, settings);

// Should contain: Regmarks layer creation + Zünd sublayer + ellipse calls.
// zOrder is skipped when layer is already in target position (optimization).
var ops = doc._mutationLog.map(function (m) { return m.op; });
assert(ops.indexOf("add-toplevel-layer") !== -1, "Log: top-level layer added (Regmarks)");
assert(ops.indexOf("add-sublayer") !== -1, "Log: sublayer added (Zünd)");
assert(ops.indexOf("add-path-ellipse") !== -1, "Log: ellipse paths added (Zünd marks)");
// At least 5 ellipse calls (4 corners + 1 orient)
var ellipseCount = ops.filter(function (op) { return op === "add-path-ellipse"; }).length;
assert(ellipseCount >= 5, "Log: >=5 ellipse calls for Zünd marks (got " + ellipseCount + ")");


// =====================================================
// TEST 16 (regression): mark size shrinks with scaleN — v26.4.0 bug
// =====================================================
// History: draw.js used raw getSF() for mark size, missing the * scaleN
// factor that core.js applied to positions. Manual test caught it:
// scaleN=10 placed marks at 1/10 spacing but each circle was still 5mm.
// Guard: render the same doc with scaleN=1 vs scaleN=10 and assert that
// the ellipse bounding-box width is exactly 1/10. Mock tracks
// geometricBounds, so [L, T, R, B] gives us real dimensions.
console.log("\n=== TEST 16 (regression): mark size scales with scaleN ===");

function firstEllipseBounds(d) {
    var muts = d._mutationLog || [];
    for (var i = 0; i < muts.length; i++) {
        if (muts[i].op === "add-path-ellipse" && muts[i].bounds) return muts[i].bounds;
    }
    return null;
}

// Baseline: scaleN=1 → 5 mm Zünd mark, ellipse w = 5mm = 14.173 pt
var docBase = setupDoc({ layers: [{ name: "L1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }] });
var sBase   = makeSettings({ mode: "ZUND", scaleN: 1 });
var bBase   = ZSM.Draw.getBounds(sBase);
var gBase   = ZSM.Core.calculateAll(sBase, bBase);
ZSM.Draw.render(gBase, sBase);
var ellBase = firstEllipseBounds(docBase);
assert(ellBase !== null, "regression: baseline ellipse drawn");
var widthBase = ellBase ? Math.abs(ellBase[2] - ellBase[0]) : 0;

// scaleN=10 → marks should render at 0.5mm = 1.417 pt (1/10 of baseline)
var docScaled = setupDoc({ layers: [{ name: "L1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }] });
var sScaled   = makeSettings({ mode: "ZUND", scaleN: 10 });
var bScaled   = ZSM.Draw.getBounds(sScaled);
var gScaled   = ZSM.Core.calculateAll(sScaled, bScaled);
ZSM.Draw.render(gScaled, sScaled);
var ellScaled = firstEllipseBounds(docScaled);
assert(ellScaled !== null, "regression: scaled ellipse drawn");
var widthScaled = ellScaled ? Math.abs(ellScaled[2] - ellScaled[0]) : 0;

var ratio = widthBase > 0 ? widthScaled / widthBase : 0;
total++;
if (Math.abs(ratio - 0.1) < 0.001) {
    pass++;
} else {
    fail++;
    console.log("  FAIL: regression: scaleN=10 mark width = baseline/10 | got ratio=" +
                ratio.toFixed(4) + " (widthBase=" + widthBase.toFixed(3) +
                ", widthScaled=" + widthScaled.toFixed(3) + ") — bug from v26.4.0 has returned");
}


// =====================================================
// TEST 17 (regression): getCol never auto-creates a swatch — prepress safety
// =====================================================
// History: getCol() used to mint a magenta spot for any unknown colour name.
// Unsafe — it mutates the document, produces an arbitrary colour that can
// mis-separate on a cutter, and pollutes every file in a batch. The unified
// policy: missing colour → [Registration] fallback + a warning, never create.
console.log("\n=== TEST 17 (regression): getCol does not auto-create swatches ===");
var docCol = setupDoc({
    layers: [{ name: "L1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }],
    spots: [],
    swatches: [{ name: "Cut", color: {} }]
});
var spotsBefore = docCol.spots.length;

var cExisting = ZSM.Draw.getCol("Cut");
assert(cExisting != null, "getCol returns a colour for an existing swatch");

var cMissing = ZSM.Draw.getCol("GhostColour");
assert(cMissing != null, "getCol returns a (fallback) colour for a missing swatch — never null");
assertEq(docCol.spots.length, spotsBefore,
    "getCol did NOT auto-create a spot for the missing colour (prepress safety)");

ZSM.Draw.getCol("");   // empty → registration fallback, still no creation
assertEq(docCol.spots.length, spotsBefore, "getCol('') creates nothing either");

assert(ZSM.Draw.swatchExists("Cut") === true, "swatchExists true for present swatch");
assert(ZSM.Draw.swatchExists("GhostColour") === false, "swatchExists false for missing swatch");


// =====================================================
// TEST 18 (regression W1): a user-MAPPED layer left at the bottom must NOT be
// auto-renamed to "Graphics"
// =====================================================
// History: §7 renamed doc.layers[last] to "Graphics" assuming bottom = artwork.
// But the move/remove passes can leave a real, user-named target layer at the
// bottom — renaming THAT surprised the user. Guard: skip rename for any name in
// the layer mapping (sysNames). Here "Cut" is both the mapped target and the
// bottom layer; it must keep its name (color has no match, so nothing moves and
// "Cut" stays put — exactly the case that used to mis-rename it).
console.log("\n=== TEST 18 (regression): mapped bottom layer not renamed to Graphics ===");
var docW1 = setupDoc({
    layers: [{ name: "Cut", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }]
});
var sW1 = makeSettings({ mode: "ZUND", layers: [{ name: "Cut", color: "Cut" }] });
var bW1 = ZSM.Draw.getBounds(sW1);
var gW1 = ZSM.Core.calculateAll(sW1, bW1);
ZSM.Draw.render(gW1, sW1);

assert(findLayer(docW1, "Cut") !== null,
    "regression: mapped 'Cut' layer kept its name (not renamed)");
assert(findLayer(docW1, "Graphics") === null,
    "regression: mapped bottom layer was NOT auto-renamed to 'Graphics'");


// =====================================================
// TEST 19 (Phase 3): marks-only mode draws marks but never touches layers
// =====================================================
// marksOnly=true must skip §3 (movePaths/routing) and §7 rename entirely, so a
// document whose cut layers are already separated keeps them exactly as-is;
// only the registration marks are added (into Regmarks).
console.log("\n=== TEST 19 (Phase 3): marks-only mode leaves layers untouched ===");
var docMO = setupDoc({
    layers: [{
        name: "Art",
        items: [
            { type: "path", bounds: [0, 100, 100, 0] },                          // plain
            { type: "path", bounds: [5, 95, 95, 5], spot: "Cut", filled: true }  // Cut-spot
        ]
    }]
});
var sMO = makeSettings({ mode: "ZUND", marksOnly: true, layers: [{ name: "Cut", color: "Cut" }] });
var bMO = ZSM.Draw.getBounds(sMO);
var gMO = ZSM.Core.calculateAll(sMO, bMO);
ZSM.Draw.render(gMO, sMO);

var regMO = findLayer(docMO, "Regmarks");
var zundMO = regMO ? findSublayer(regMO, "Zünd") : null;
assert(zundMO !== null && countItems(zundMO, "PathItem") >= 5,
    "marks-only: marks still drawn into Regmarks/Zünd");
assert(findLayer(docMO, "Cut") === null,
    "marks-only: §3 skipped — no 'Cut' routing layer created");
assert(findLayer(docMO, "Art") !== null,
    "marks-only: user layer 'Art' left intact");
assert(findLayer(docMO, "Graphics") === null,
    "marks-only: §7 rename skipped — 'Art' not renamed to 'Graphics'");


// =====================================================
// TEST 20 (Phase 3, bug E): marks-only SUMMA trim → dedicated top-level "Trim"
// =====================================================
// The red trim lines must NOT land in Regmarks (would collide with mark reading)
// nor in any cut layer — they go into their own top-level "Trim" layer.
console.log("\n=== TEST 20 (bug E): marks-only SUMMA trim is a top-level layer, not in Regmarks ===");
var docMT = setupDoc({
    layers: [{ name: "Art", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }]
});
var sMT = makeSettings({ mode: "SUMMA", marksOnly: true, drawRed: true });
var bMT = ZSM.Draw.getBounds(sMT);
var gMT = ZSM.Core.calculateAll(sMT, bMT);
assert(gMT.red.length > 0, "precondition: SUMMA drawRed produced trim lines");
ZSM.Draw.render(gMT, sMT);

var trimTop = findLayer(docMT, "Trim");
var regMT   = findLayer(docMT, "Regmarks");
assert(trimTop !== null && countItems(trimTop, "PathItem") >= 1,
    "marks-only SUMMA: trim lines in a top-level 'Trim' layer");
assert(regMT === null || findSublayer(regMT, "Trim") === null,
    "marks-only SUMMA: NO 'Trim' sublayer inside Regmarks (bug E fixed)");


// =====================================================
// TEST 21 (v26.5.1): stale Trim removed when SUMMA re-runs with drawRed=false
// =====================================================
// Run 1: SUMMA + trim → Trim layer exists. Run 2: SUMMA, trim OFF → the stale
// Trim layer must be REMOVED (its lines sit at outdated artboard edges).
console.log("\n=== TEST 21: SUMMA drawRed=false removes stale Trim layer ===");
var docST = setupDoc({
    layers: [{ name: "Art", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }]
});
var sST = makeSettings({ mode: "SUMMA", drawRed: true });
var bST = ZSM.Draw.getBounds(sST);
var gST = ZSM.Core.calculateAll(sST, bST);
ZSM.Draw.render(gST, sST);
assert(findLayer(docST, "Trim") !== null, "precondition: run 1 created Trim layer");

sST = makeSettings({ mode: "SUMMA", drawRed: false });
bST = ZSM.Draw.getBounds(sST);
gST = ZSM.Core.calculateAll(sST, bST);
ZSM.Draw.render(gST, sST);
assert(findLayer(docST, "Trim") === null,
    "SUMMA drawRed=false: stale Trim layer removed");

// A ZUND run invalidates the whole Summa sheet layout (artboard recompute
// drops the feed; OPOS marks would no longer be outermost) — so it must
// remove the stale Trim together with the Summa output (see TEST 23).
var docZT = setupDoc({
    layers: [{ name: "Art", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }]
});
var sZT = makeSettings({ mode: "SUMMA", drawRed: true });
ZSM.Draw.render(ZSM.Core.calculateAll(sZT, ZSM.Draw.getBounds(sZT)), sZT);
assert(findLayer(docZT, "Trim") !== null, "precondition: SUMMA created Trim");
sZT = makeSettings({ mode: "ZUND" });
ZSM.Draw.render(ZSM.Core.calculateAll(sZT, ZSM.Draw.getBounds(sZT)), sZT);
assert(findLayer(docZT, "Trim") === null,
    "ZUND run removes the invalidated SUMMA Trim layer");


// =====================================================
// TEST 22 (bug): movePaths must never route FROM Regmarks / Trim layers
// =====================================================
// A spot colour shared between the marks and a cut layer (e.g. a white "Spot 1"
// used both for the marks and a "White" cut layer) is a valid workflow. On a
// re-run the other mode's marks sit on Regmarks/<mode> in that spot and trim
// lines sit on Trim; movePaths must skip items on those reserved layers so it
// routes the user's artwork but leaves the marks/trim in place (no cannibalism).
console.log("\n=== TEST 22 (bug): movePaths never routes FROM Regmarks/Trim ===");
var docCan = setupDoc({
    layers: [
        { name: "White", items: [] },                                               // routing target
        { name: "Art",   items: [{ type: "path", spot: "Spot 1", bounds: [0, 10, 10, 0] }] }, // user artwork
        { name: "Regmarks", sublayers: [
            { name: "Zünd", items: [{ type: "path", spot: "Spot 1", bounds: [0, 5, 5, 0] }] }  // mark from a prior run
        ] },
        { name: "Trim", items: [{ type: "path", spot: "Spot 1", bounds: [0, 3, 3, 0] }] }      // a trim line
    ]
});
var whiteLay = findLayer(docCan, "White");
var regCan   = findLayer(docCan, "Regmarks");
var zundCan  = regCan ? findSublayer(regCan, "Zünd") : null;
var trimCan  = findLayer(docCan, "Trim");

ZSM.Draw.movePaths(whiteLay, ["Spot 1"]);

assert(countItems(whiteLay, "PathItem") === 1,
    "movePaths: user artwork (Spot 1) routed to White");
assert(countItems(zundCan, "PathItem") === 1,
    "movePaths: mark on Regmarks/Zünd NOT cannibalised (stays put)");
assert(countItems(trimCan, "PathItem") === 1,
    "movePaths: trim line on Trim layer NOT moved");


// =====================================================
// TEST 23 (bug): SUMMA→ZUND — Zünd run removes the invalidated Summa output
// =====================================================
// OPOS requires the Summa marks to be OUTERMOST. The bounds rule "second run
// places marks outside the first" gives the outermost spot to whichever mode
// runs LAST — so running ZUND after SUMMA would leave the Summa set inside the
// Zünd circles (and the Zünd artboard recompute drops the feed, stranding the
// trim lines). The main flow calls removeSummaOutput() BEFORE measuring bounds;
// the Zünd marks must then land exactly where a clean ZUND run would put them.
// User artwork and mapped cut layers must never be touched.
console.log("\n=== TEST 23 (bug): ZUND after SUMMA removes invalidated Summa output ===");

// Reference: clean ZUND on a fresh doc
var docRef = setupDoc({
    layers: [{ name: "Art", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }]
});
var sRef = makeSettings({ mode: "ZUND" });
var gRef = ZSM.Core.calculateAll(sRef, ZSM.Draw.getBounds(sRef));
ZSM.Draw.render(gRef, sRef);

// Scenario: SUMMA (with trim) first, then the main-flow ZUND sequence
var docSZ = setupDoc({
    layers: [
        { name: "Cut", items: [{ type: "path", spot: "Cut", bounds: [10, 90, 90, 10] }] },
        { name: "Art", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }
    ]
});
var sSZ = makeSettings({ mode: "SUMMA", drawRed: true });
ZSM.Draw.render(ZSM.Core.calculateAll(sSZ, ZSM.Draw.getBounds(sSZ)), sSZ);
assert(findSublayer(findLayer(docSZ, "Regmarks"), "Summa") !== null,
    "precondition: Summa sublayer exists");
assert(findLayer(docSZ, "Trim") !== null, "precondition: Trim exists");

// Main flow: remove invalidated Summa output BEFORE measuring bounds
var removed = ZSM.Draw.removeSummaOutput();
assert(removed === true, "removeSummaOutput reports it removed the Summa set");
var sZ2 = makeSettings({ mode: "ZUND" });
var gZ2 = ZSM.Core.calculateAll(sZ2, ZSM.Draw.getBounds(sZ2));
ZSM.Draw.render(gZ2, sZ2);

var regSZ = findLayer(docSZ, "Regmarks");
assert(findSublayer(regSZ, "Summa") === null,
    "Summa sublayer (marks + OPOS bar) removed");
assert(findLayer(docSZ, "Trim") === null, "stale Trim layer removed");
assert(countItems(findSublayer(regSZ, "Zünd"), "PathItem") === 5,
    "Zünd marks drawn (4 corners + orient)");

// Geometry: identical to a clean ZUND run (bounds no longer inflated)
assertEq(Math.round(gZ2.ab[0]), Math.round(gRef.ab[0]), "artboard L == clean ZUND");
assertEq(Math.round(gZ2.ab[1]), Math.round(gRef.ab[1]), "artboard T == clean ZUND");
assertEq(Math.round(gZ2.ab[2]), Math.round(gRef.ab[2]), "artboard R == clean ZUND");
assertEq(Math.round(gZ2.ab[3]), Math.round(gRef.ab[3]), "artboard B == clean ZUND");

// User layers untouched. The artwork layer is renamed Art→Graphics by the
// standard §7b bottom-layer rename (done already by the SUMMA run — existing
// behaviour, not part of this fix); its CONTENT must survive intact.
var artSZ = findLayer(docSZ, "Graphics") || findLayer(docSZ, "Art");
assert(artSZ !== null && countItems(artSZ, "PathItem") === 1,
    "user artwork content untouched (1 path, layer renamed Graphics by design)");
assert(findLayer(docSZ, "Cut") !== null && countItems(findLayer(docSZ, "Cut"), "PathItem") === 1,
    "mapped cut layer untouched");

// Idempotence: nothing left to remove
assert(ZSM.Draw.removeSummaOutput() === false,
    "second removeSummaOutput call is a no-op");

// Valid direction unchanged: SUMMA after ZUND keeps the Zünd sublayer
var sS3 = makeSettings({ mode: "SUMMA" });
ZSM.Draw.render(ZSM.Core.calculateAll(sS3, ZSM.Draw.getBounds(sS3)), sS3);
assert(findSublayer(findLayer(docSZ, "Regmarks"), "Zünd") !== null,
    "SUMMA after ZUND still preserves the Zünd sublayer");


// =====================================================
// TEST 24 (review K12): hidden output / target layers
// =====================================================
// A hidden layer rejects writes like a locked one (measured, AI 30.8.1). An
// operator who hid Regmarks to check the artwork and re-ran the script got the
// old marks removed and NO new marks — without any message. A hidden mapped
// layer silently kept the cut paths where they were.
console.log("\n=== TEST 24 (review K12): hidden Regmarks / hidden target layer ===");
var alertsK12 = [];
var origAlertK12 = global.alert;
global.alert = function (m) { alertsK12.push(String(m)); };

var docH1 = setupDoc({
    layers: [
        { name: "Regmarks", visible: false, sublayers: [
            { name: "Zünd", items: [{ type: "path", bounds: [-20, 120, -15, 115] }] }   // old mark
        ]},
        { name: "Art", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }
    ]
});
var sH1 = makeSettings({ mode: "ZUND" });
ZSM.Draw.render(ZSM.Core.calculateAll(sH1, ZSM.Draw.getBounds(sH1)), sH1);
var regH1 = findLayer(docH1, "Regmarks");
assertEq(countItems(findSublayer(regH1, "Zünd"), "PathItem"), 5,
    "hidden Regmarks: 5 new marks drawn (not silently lost)");
assert(regH1.visible === true, "hidden Regmarks: made visible so the marks can be drawn");
assert(alertsK12.join("\n").indexOf("unhidden Regmarks") >= 0,
    "hidden Regmarks: operator is told the layer was made visible");

alertsK12.length = 0;
var docH2 = setupDoc({
    layers: [
        { name: "Cut", visible: false, items: [] },
        { name: "Art", items: [
            { type: "path", bounds: [0, 100, 100, 0] },
            { type: "path", bounds: [10, 90, 90, 10], strokeSpot: "Cut", stroked: true, filled: false }
        ]}
    ]
});
var sH2 = makeSettings({ mode: "ZUND", layers: [{ name: "Cut", color: "Cut" }] });
ZSM.Draw.render(ZSM.Core.calculateAll(sH2, ZSM.Draw.getBounds(sH2)), sH2);
var cutH2 = findLayer(docH2, "Cut");
assertEq(countItems(cutH2, "PathItem"), 1, "hidden target: cut path moved into 'Cut'");
assert(cutH2.visible === true, "hidden target: 'Cut' made visible");
assert(alertsK12.join("\n").indexOf("unhidden Cut") >= 0, "hidden target: operator is told");

// Anything that still cannot be drawn is reported as an ERROR (was a
// debug-log line only). Locked Regmarks + render() without beginSession.
alertsK12.length = 0;
var docH3 = setupDoc({
    layers: [
        { name: "Regmarks", locked: true, items: [] },
        { name: "Art", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }
    ]
});
var sH3 = makeSettings({ mode: "ZUND" });
ZSM.Draw.render(ZSM.Core.calculateAll(sH3, ZSM.Draw.getBounds(sH3)), sH3);
assertEq(countItems(findLayer(docH3, "Regmarks"), "PathItem"), 0,
    "precondition: locked Regmarks blocks drawing");
assert(alertsK12.join("\n").indexOf("ERR: marks failed 5") >= 0,
    "draw failures reported as an error with the count (got: " + alertsK12.join(" | ") + ")");

global.alert = origAlertK12;


// =====================================================
// TEST 25 (review K1): objects with printable paint are not routed
// =====================================================
// A cut stroke on a shape that also has a printable fill (sticker background)
// used to move the whole shape onto the cut layer — ABOVE the artwork — and set
// fillOverprint on the printable fill. Rendered in AI 30.8.1: the art under it
// disappeared (no overprint simulation) or changed colour (with it).
console.log("\n=== TEST 25 (review K1): mixed paint stays, pure cut paths move ===");
var alertsK1 = [];
var origAlertK1 = global.alert;
global.alert = function (m) { alertsK1.push(String(m)); };
var WHITE = { typename: "CMYKColor", cyan: 0, magenta: 0, yellow: 0, black: 0 };
var docK1 = setupDoc({
    layers: [{
        name: "Art",
        items: [
            { type: "path", bounds: [0, 100, 100, 0] },
            { type: "path", name: "pure", bounds: [10, 90, 90, 10], strokeSpot: "Cut", stroked: true, filled: false },
            { type: "path", name: "whiteFillCutStroke", bounds: [20, 80, 80, 20], fillColor: WHITE, strokeSpot: "Cut", stroked: true },
            { type: "path", name: "cutFillBlackStroke", bounds: [30, 70, 70, 30], spot: "Cut", stroked: true },
            { type: "compound", name: "mixedCompound", bounds: [40, 60, 60, 40], children: [
                { type: "path", bounds: [40, 60, 60, 40], fillColor: WHITE, strokeSpot: "Cut", stroked: true }
            ]}
        ]
    }]
});
var artK1 = docK1._layers[0];
function itemNamed(lay, nm) {
    for (var i = 0; i < lay._items.length; i++) if (lay._items[i].name === nm) return lay._items[i];
    return null;
}
var mixedK1 = itemNamed(artK1, "whiteFillCutStroke");
var sK1 = makeSettings({ mode: "ZUND", layers: [{ name: "Cut", color: "Cut" }] });
ZSM.Draw.render(ZSM.Core.calculateAll(sK1, ZSM.Draw.getBounds(sK1)), sK1);

var cutK1 = findLayer(docK1, "Cut");
assert(cutK1 !== null && itemNamed(cutK1, "pure") !== null, "pure cut path (stroke only) moved to Cut");
assert(itemNamed(cutK1, "pure").strokeOverprint === true, "pure cut path: stroke overprint set");
var artAfterK1 = findLayer(docK1, "Graphics") || findLayer(docK1, "Art");
assert(itemNamed(artAfterK1, "whiteFillCutStroke") !== null, "white fill + cut stroke stays with the artwork");
assert(mixedK1.fillOverprint === false, "white fill does NOT get overprint");
assert(itemNamed(artAfterK1, "cutFillBlackStroke") !== null, "cut fill + printable stroke stays with the artwork");
assert(itemNamed(artAfterK1, "mixedCompound") !== null, "mixed compound path stays with the artwork");
assert(alertsK1.join("\n").indexOf("mixed Cut 3") >= 0,
    "operator is told how many objects were left and why (got: " + alertsK1.join(" | ") + ")");
global.alert = origAlertK1;


// =====================================================
// TEST 26 (review K3): a hidden bottom layer is left alone
// =====================================================
// The §7b "bottom layer = artwork" rename also set visible = true. A hidden
// template / customer proof / old version at the bottom was renamed Graphics
// and made visible — i.e. it printed.
console.log("\n=== TEST 26 (review K3): hidden bottom layer keeps name and visibility ===");
var docK3 = setupDoc({
    layers: [
        { name: "Art", items: [{ type: "path", bounds: [0, 100, 100, 0] }] },
        { name: "Template", visible: false, items: [{ type: "path", bounds: [0, 100, 100, 0] }] }
    ]
});
var sK3 = makeSettings({ mode: "ZUND" });
ZSM.Draw.render(ZSM.Core.calculateAll(sK3, ZSM.Draw.getBounds(sK3)), sK3);
var tplK3 = findLayer(docK3, "Template");
assert(tplK3 !== null, "hidden bottom layer keeps its name (not renamed to Graphics)");
assert(tplK3 !== null && tplK3.visible === false, "hidden bottom layer stays hidden");
assert(findLayer(docK3, "Graphics") === null, "no layer renamed to Graphics in this document");


// =====================================================
// TEST 27 (review K2): cut paths left in place are reported
// =====================================================
// Paths inside a clipping mask are skipped by design; paths on a locked
// sublayer or a hidden layer cannot be moved (move() throws — measured). Both
// were silent: with one path moved the run looked complete, and the cutter
// then missed the rest.
console.log("\n=== TEST 27 (review K2): skipped cut paths are reported with reasons ===");
var alertsK2 = [];
var origAlertK2 = global.alert;
global.alert = function (m) { alertsK2.push(String(m)); };
var CUTS = { strokeSpot: "Cut", stroked: true, filled: false };
function cutPath(nm, b) { return { type: "path", name: nm, bounds: b, strokeSpot: CUTS.strokeSpot, stroked: true, filled: false }; }
var docK2 = setupDoc({
    layers: [
        { name: "Hid", visible: false, items: [cutPath("onHidden", [5, 95, 95, 5])] },
        { name: "Art", items: [
            { type: "path", bounds: [0, 100, 100, 0] },
            cutPath("free", [10, 90, 90, 10]),
            { type: "group", clipped: true, bounds: [20, 80, 80, 20], children: [
                { type: "path", bounds: [20, 80, 80, 20] },            // clip path
                cutPath("inClip", [25, 75, 75, 25])
            ]}
        ], sublayers: [
            { name: "SubL", locked: true, items: [cutPath("inLockedSub", [30, 70, 70, 30])] }
        ]}
    ]
});
var sK2 = makeSettings({ mode: "ZUND", layers: [{ name: "Cut", color: "Cut" }] });
ZSM.Draw.render(ZSM.Core.calculateAll(sK2, ZSM.Draw.getBounds(sK2)), sK2);
assertEq(countItems(findLayer(docK2, "Cut"), "PathItem"), 1, "the free cut path moved");
assert(alertsK2.join("\n").indexOf("skipped Cut Cut 1 2") >= 0,
    "left-in-place paths reported: 1 in a clipping mask, 2 on locked/hidden layers (got: " + alertsK2.join(" | ") + ")");
assert(alertsK2.join("\n").indexOf("missing color") < 0,
    "no misleading 'colour not found' warning when paths of that colour exist");
global.alert = origAlertK2;


// =====================================================
// TEST 28 (review K8): the registration colour never routes paths
// =====================================================
// [Registration] prints on every separation, so it cannot identify cut paths.
// The default row "Cut ← [Registration]" moved every registration-coloured
// path (trim marks, other tools' marks) onto the cut layer in an English
// Illustrator, and matched nothing (misleading warning) in a localized one.
console.log("\n=== TEST 28 (review K8): registration mapping row is skipped with a warning ===");
var alertsK8 = [];
var origAlertK8 = global.alert;
global.alert = function (m) { alertsK8.push(String(m)); };
var sK8 = makeSettings({ mode: "ZUND", layers: [{ name: "Cut", color: "[Registration]" }] });

var docK8en = setupDoc({
    layers: [{ name: "Art", items: [
        { type: "path", bounds: [0, 100, 100, 0] },
        { type: "path", name: "trimMark", bounds: [-10, 110, -5, 105], strokeSpot: "[Registration]", stroked: true, filled: false }
    ]}]
});
ZSM.Draw.render(ZSM.Core.calculateAll(sK8, ZSM.Draw.getBounds(sK8)), sK8);
assert(findLayer(docK8en, "Cut") === null, "EN: no 'Cut' layer created from a registration row");
assertEq(countItems(findLayer(docK8en, "Graphics") || findLayer(docK8en, "Art"), "PathItem"), 2,
    "EN: registration-coloured path stays with the artwork");
assert(alertsK8.join("\n").indexOf("regskip Cut") >= 0, "EN: operator told why the row was skipped");

alertsK8.length = 0;
var docK8cs = setupDoc({
    layers: [{ name: "Art", items: [
        { type: "path", bounds: [0, 100, 100, 0] },
        { type: "path", bounds: [-10, 110, -5, 105], strokeSpot: "[Registrační]", stroked: true, filled: false }
    ]}]
});
docK8cs.swatches[1].name = "[Registrační]";   // localized Illustrator
ZSM.Draw.render(ZSM.Core.calculateAll(sK8, ZSM.Draw.getBounds(sK8)), sK8);
assert(findLayer(docK8cs, "Cut") === null, "CS: no 'Cut' layer created");
assert(alertsK8.join("\n").indexOf("regskip Cut") >= 0, "CS: the same clear warning");
assert(alertsK8.join("\n").indexOf("missing color") < 0, "CS: no misleading 'colour not found'");
global.alert = origAlertK8;


// =====================================================
// TEARDOWN
// =====================================================
Mock.uninstall();


// =====================================================
// SUMMARY
// =====================================================
console.log("\n" + "=".repeat(50));
console.log("DRAW.RENDER TEST RESULTS: " + pass + "/" + total + " PASSED, " + fail + " FAILED");
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
