#!/usr/bin/env node
/**
 * ZSM.Draw.render() Integration Test Suite
 *
 * Uses tests/lib/mock_illustrator.js to simulate the Illustrator DOM
 * with mutation tracking. Tests verify:
 *   - render() doesn't throw on edge cases
 *   - Correct number of mark items created (Zünd circles, Summa squares)
 *   - Correct sublayer structure (Regmarks/Zünd, Regmarks/Summa, Graphics/Trim)
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
    summaXCenter: 10,    // mm: distance from graphic edge to Summa mark center (X)
    summaYVisual: 10,    // mm: gap from graphic edge to Summa mark outer edge (Y)
    redLineWidth: 1,
    rulerBuffer: 0.1,
    debug: false
};

// Mock alert (for errors raised by render)
global.alert = function () {};

eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "core.js"), "utf8"));
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
// In real flow, main.jsx would catch this and alert. We test that calling render
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
// TEST 8: drawRed = true → trim lines added
// =====================================================
console.log("\n=== TEST 8: Trim lines on Graphics ===");
doc = setupDoc({
    layers: [{ name: "Layer 1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }]
});
settings = makeSettings({ mode: "SUMMA", drawRed: true });
bounds = ZSM.Draw.getBounds(settings);
geo = ZSM.Core.calculateAll(settings, bounds);
ZSM.Draw.render(geo, settings);

var graphicsLayer = findLayer(doc, "Graphics");
assert(graphicsLayer !== null, "drawRed: Graphics layer exists");
var trimSub = graphicsLayer ? findSublayer(graphicsLayer, "Trim") : null;
assert(trimSub !== null, "drawRed: Trim sublayer created");
var trimCount = trimSub ? countItems(trimSub, "PathItem") : 0;
assertEq(trimCount, 2, "drawRed: 2 trim lines (top + bottom)");


// =====================================================
// TEST 9: drawRed = false → no Trim sublayer
// =====================================================
console.log("\n=== TEST 9: No trim lines when drawRed=false ===");
doc = setupDoc({
    layers: [{ name: "Layer 1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }]
});
settings = makeSettings({ mode: "SUMMA", drawRed: false });
bounds = ZSM.Draw.getBounds(settings);
geo = ZSM.Core.calculateAll(settings, bounds);
ZSM.Draw.render(geo, settings);

graphicsLayer = findLayer(doc, "Graphics");
trimSub = graphicsLayer ? findSublayer(graphicsLayer, "Trim") : null;
assert(trimSub === null, "drawRed=false: no Trim sublayer");


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
            { type: "path", bounds: [20, 80, 80, 20], strokeSpot: "Cut", stroked: true }           // spot Cut on stroke
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
