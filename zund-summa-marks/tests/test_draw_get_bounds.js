#!/usr/bin/env node
/**
 * ZSM.Draw.getBounds() Integration Test Suite
 *
 * Uses tests/lib/mock_illustrator.js to simulate the Illustrator DOM.
 * Tests focus on logical correctness of:
 *   - getBounds() return value for various document structures
 *   - _measureLayer() recursion + skip rules
 *   - _getEffectiveBounds() clip group handling
 *   - Layer-clip heuristic for bracket-named sublayers
 *
 * NOT covered: C++ crashes, app.redraw timing, real ScriptUI behavior,
 *              undo state, file I/O.
 *
 * Usage: node tests/test_draw_get_bounds.js
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
function assertClose(a, b, tol, msg) {
    total++;
    if (typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= tol) { pass++; }
    else { fail++; console.log("  FAIL: " + msg + " | got=" + a + " expected≈" + b + " (tol=" + tol + ")"); }
}
function assertNull(v, msg) {
    total++;
    if (v === null) { pass++; }
    else { fail++; console.log("  FAIL: " + msg + " | got=" + JSON.stringify(v)); }
}

// ===== Setup & helpers =====
Mock.install();

// IMPORTANT: declare `var ZSM` at module scope BEFORE eval()'ing src/*.js.
// Production files start with `var ZSM = ZSM || {};` — when eval'd, they
// reuse this declaration (hoisted, then assigned only if currently falsy).
// Setting global.ZSM does NOT work because eval's `var` shadows globals.
var ZSM = {};
ZSM.L = { ERROR_PREFIX: "ERR: ", ERR_NO_SEL: "Nothing selected" };
ZSM.Config = {
    layerRegmarks: "Regmarks",
    layerGraphics: "Graphics",
    debug: false
};
// Load utils (mm2pt, log) — adds ZSM.Utils to our ZSM
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
// Load bounds (must come before draw.js — draw delegates getBounds to ZSM.Bounds)
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "bounds.js"), "utf8"));
// Load draw.js — adds ZSM.Draw to same ZSM
eval(fs.readFileSync(path.join(__dirname, "..", "src", "draw.js"), "utf8"));

/** Helper: run getBounds against a freshly built doc */
function runWith(spec, settings) {
    var doc = Mock.buildDoc(spec);
    global.app.activeDocument = doc;
    return ZSM.Draw.getBounds(settings || { mode: "ZUND", useArtboardBounds: false });
}

var defaultSettings = { mode: "ZUND", useArtboardBounds: false };


// =====================================================
// TEST 1: Empty document
// =====================================================
console.log("\n=== TEST 1: Empty document ===");
assertNull(runWith({ layers: [] }), "Empty doc → null");
assertNull(runWith({ layers: [{ name: "Layer 1", items: [] }] }), "Empty layer → null");


// =====================================================
// TEST 2: Single top-level path
// =====================================================
console.log("\n=== TEST 2: Single PathItem on a layer ===");
var b = runWith({
    layers: [{
        name: "Layer 1",
        items: [{ type: "path", bounds: [10, 200, 110, 50] }]   // L=10, T=200, R=110, B=50
    }]
}, defaultSettings);
assert(b !== null, "Single path → bounds returned");
assertClose(b[0], 10, 0.01, "L = 10");
assertClose(b[1], 200, 0.01, "T = 200");
assertClose(b[2], 110, 0.01, "R = 110");
assertClose(b[3], 50, 0.01, "B = 50");


// =====================================================
// TEST 3: Multiple paths → union bounds
// =====================================================
console.log("\n=== TEST 3: Multiple paths union ===");
b = runWith({
    layers: [{
        name: "Layer 1",
        items: [
            { type: "path", bounds: [0, 100, 50, 0] },      // L=0..R=50
            { type: "path", bounds: [40, 80, 200, 20] }     // R=200, T=80
        ]
    }]
}, defaultSettings);
assertClose(b[0], 0, 0.01, "Union L = 0 (min of 0, 40)");
assertClose(b[1], 100, 0.01, "Union T = 100 (max of 100, 80)");
assertClose(b[2], 200, 0.01, "Union R = 200 (max of 50, 200)");
assertClose(b[3], 0, 0.01, "Union B = 0 (min of 0, 20)");


// =====================================================
// TEST 4: Regmarks layer is skipped entirely
// =====================================================
console.log("\n=== TEST 4: Regmarks layer skipped ===");
b = runWith({
    layers: [
        { name: "Layer 1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] },
        { name: "Regmarks", items: [{ type: "path", bounds: [-50, 200, 200, -50] }] }
    ]
}, defaultSettings);
assertClose(b[0], 0, 0.01, "Regmarks skipped: L stays at 0 (not -50)");
assertClose(b[2], 100, 0.01, "Regmarks skipped: R stays at 100 (not 200)");


// =====================================================
// TEST 5: Current mode sublayer in Regmarks is skipped
// =====================================================
console.log("\n=== TEST 5: Current mode sublayer skip in Regmarks ===");
// In ZUND mode, the "Zünd" sublayer should be skipped (we're replacing it).
// The "Summa" sublayer (other mode) should be MEASURED.
var docSpec = {
    layers: [
        { name: "Layer 1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] },
        { name: "Regmarks", sublayers: [
            { name: "Zünd",  items: [{ type: "path", bounds: [-10, 110, 110, -10] }] },
            { name: "Summa", items: [{ type: "path", bounds: [-20, 120, 120, -20] }] }
        ]}
    ]
};
b = runWith(docSpec, { mode: "ZUND", useArtboardBounds: false });
// ZUND: Zünd sublayer skipped, Summa measured → bounds extends to -20..120
assertClose(b[0], -20, 0.01, "ZUND mode: Summa sublayer measured (L=-20)");
assertClose(b[2], 120, 0.01, "ZUND mode: Summa sublayer measured (R=120)");

b = runWith(docSpec, { mode: "SUMMA", useArtboardBounds: false });
// SUMMA: Summa sublayer skipped, Zünd measured → bounds extends to -10..110
assertClose(b[0], -10, 0.01, "SUMMA mode: Zünd sublayer measured (L=-10)");
assertClose(b[2], 110, 0.01, "SUMMA mode: Zünd sublayer measured (R=110)");


// =====================================================
// TEST 6: Trim sublayer in Graphics is skipped
// =====================================================
console.log("\n=== TEST 6: Trim sublayer in Graphics skipped ===");
b = runWith({
    layers: [{
        name: "Graphics",
        items: [{ type: "path", bounds: [0, 100, 100, 0] }],
        sublayers: [
            { name: "Trim", items: [{ type: "path", bounds: [-50, 200, 200, -50] }] }
        ]
    }]
}, defaultSettings);
assertClose(b[0], 0, 0.01, "Trim skipped: L stays at 0");
assertClose(b[2], 100, 0.01, "Trim skipped: R stays at 100");


// =====================================================
// TEST 7: Clipped GroupItem returns clip mask bounds (not unclipped content)
// =====================================================
console.log("\n=== TEST 7: Clipped group → clip mask bounds ===");
b = runWith({
    layers: [{
        name: "Layer 1",
        items: [{
            type: "group", clipped: true,
            children: [
                // pageItems[0] = clip mask (smaller)
                { type: "path", bounds: [10, 90, 90, 10] },
                // pageItems[1] = clipped content (larger, would inflate without clip)
                { type: "path", bounds: [-100, 300, 300, -100] }
            ]
        }]
    }]
}, defaultSettings);
assertClose(b[0], 10, 0.01, "Clipped group: L=10 (mask), not -100 (content)");
assertClose(b[1], 90, 0.01, "Clipped group: T=90 (mask)");
assertClose(b[2], 90, 0.01, "Clipped group: R=90 (mask)");
assertClose(b[3], 10, 0.01, "Clipped group: B=10 (mask)");


// =====================================================
// TEST 8: Non-clipped group → recurse, union of children
// =====================================================
console.log("\n=== TEST 8: Non-clipped group → union children ===");
b = runWith({
    layers: [{
        name: "Layer 1",
        items: [{
            type: "group", clipped: false,
            children: [
                { type: "path", bounds: [0, 50, 50, 0] },
                { type: "path", bounds: [40, 80, 200, 30] }
            ]
        }]
    }]
}, defaultSettings);
assertClose(b[0], 0, 0.01, "Non-clipped group: L=0 (union)");
assertClose(b[2], 200, 0.01, "Non-clipped group: R=200 (union)");
assertClose(b[1], 80, 0.01, "Non-clipped group: T=80 (union)");


// =====================================================
// TEST 9: Bracket-named sublayer → layer-clip heuristic
// =====================================================
console.log("\n=== TEST 9: Bracket sublayer measures only pageItems[0] ===");
// Layer-clipped sublayer: top item is the clip mask, rest is unclipped content.
// Heuristic: measure only the first direct child.
b = runWith({
    layers: [{
        name: "Layer 1",
        sublayers: [{
            name: "<Clip Group>",
            items: [
                // pageItems[0] = assumed clip mask
                { type: "path", bounds: [10, 90, 90, 10] },
                // pageItems[1+] = content that would inflate without heuristic
                { type: "path", bounds: [-200, 500, 500, -200] }
            ]
        }]
    }]
}, defaultSettings);
assertClose(b[0], 10, 0.01, "Bracket sublayer: L=10 (only first item measured)");
assertClose(b[2], 90, 0.01, "Bracket sublayer: R=90");
assertClose(b[1], 90, 0.01, "Bracket sublayer: T=90");
assertClose(b[3], 10, 0.01, "Bracket sublayer: B=10");

// Variants of bracket prefix
b = runWith({
    layers: [{
        name: "Layer 1",
        sublayers: [{
            name: "<Group>",
            items: [
                { type: "path", bounds: [5, 95, 95, 5] },
                { type: "path", bounds: [-300, 600, 600, -300] }
            ]
        }]
    }]
}, defaultSettings);
assertClose(b[2], 95, 0.01, "<Group> variant: same heuristic applied");

b = runWith({
    layers: [{
        name: "Layer 1",
        sublayers: [{
            name: "(Isolation Mode)",
            items: [
                { type: "path", bounds: [1, 99, 99, 1] },
                { type: "path", bounds: [-500, 800, 800, -500] }
            ]
        }]
    }]
}, defaultSettings);
assertClose(b[2], 99, 0.01, "(Paren) sublayer: heuristic applied (artifact detection)");


// =====================================================
// TEST 10: Hidden / locked layers ARE measured
// =====================================================
console.log("\n=== TEST 10: Hidden layers measured (per script intent) ===");
b = runWith({
    layers: [{
        name: "Layer 1",
        visible: false,
        items: [{ type: "path", bounds: [0, 100, 100, 0] }]
    }]
}, defaultSettings);
assert(b !== null, "Hidden layer: bounds returned (not null)");
assertClose(b[0], 0, 0.01, "Hidden layer: items measured");


// =====================================================
// TEST 11: Guide paths are skipped
// =====================================================
console.log("\n=== TEST 11: Guide paths skipped ===");
b = runWith({
    layers: [{
        name: "Layer 1",
        items: [
            { type: "path", bounds: [0, 100, 100, 0] },
            { type: "path", bounds: [-1000, 2000, 2000, -1000], guides: true }   // huge guide
        ]
    }]
}, defaultSettings);
assertClose(b[0], 0, 0.01, "Guide skipped: L=0");
assertClose(b[2], 100, 0.01, "Guide skipped: R=100 (guide didn't inflate)");


// =====================================================
// TEST 12: useArtboardBounds returns artboard rect
// =====================================================
console.log("\n=== TEST 12: useArtboardBounds=true returns artboard ===");
b = runWith({
    artboardRect: [10, 200, 310, 0],
    layers: [{ name: "Layer 1", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }]
}, { mode: "ZUND", useArtboardBounds: true });
assertClose(b[0], 10, 0.01, "useArtboardBounds: L = artboard L");
assertClose(b[1], 200, 0.01, "useArtboardBounds: T = artboard T");
assertClose(b[2], 310, 0.01, "useArtboardBounds: R = artboard R (not artwork R)");
assertClose(b[3], 0, 0.01, "useArtboardBounds: B = artboard B");


// =====================================================
// TEST 13: Multiple top-level layers union
// =====================================================
console.log("\n=== TEST 13: Multi-layer union ===");
b = runWith({
    layers: [
        { name: "Background", items: [{ type: "path", bounds: [0, 50, 50, 0] }] },
        { name: "Foreground", items: [{ type: "path", bounds: [30, 100, 200, 20] }] }
    ]
}, defaultSettings);
assertClose(b[0], 0, 0.01, "Multi-layer: L=0 (Background)");
assertClose(b[2], 200, 0.01, "Multi-layer: R=200 (Foreground)");
assertClose(b[1], 100, 0.01, "Multi-layer: T=100 (Foreground)");


// =====================================================
// TEST 14: Nested clip groups
// =====================================================
console.log("\n=== TEST 14: Nested clip groups ===");
// Outer clipped group whose mask is at [10,90,90,10].
// Inside is another clipped group with mask [20,80,80,20].
// Outer mask wins (it's pageItems[0] of the outermost clipped group).
b = runWith({
    layers: [{
        name: "Layer 1",
        items: [{
            type: "group", clipped: true,
            children: [
                { type: "path", bounds: [10, 90, 90, 10] },   // outer clip mask
                {
                    type: "group", clipped: true,
                    children: [
                        { type: "path", bounds: [20, 80, 80, 20] },  // inner clip mask
                        { type: "path", bounds: [-500, 1000, 1000, -500] }
                    ]
                }
            ]
        }]
    }]
}, defaultSettings);
assertClose(b[0], 10, 0.01, "Nested clip: outer mask wins (L=10)");
assertClose(b[2], 90, 0.01, "Nested clip: outer mask R=90");


// =====================================================
// TEST 15: PluginItem / NonNativeItem skipped
// =====================================================
console.log("\n=== TEST 15: PluginItem skip ===");
// Mock a plugin item by setting typename manually
var doc = Mock.buildDoc({
    layers: [{
        name: "Layer 1",
        items: [{ type: "path", bounds: [0, 100, 100, 0] }]
    }]
});
// Inject a fake plugin item
var pluginItem = { typename: "PluginItem", parent: doc.layers[0], geometricBounds: [-1000, 2000, 2000, -1000], guides: false };
doc.layers[0].pageItems.push(pluginItem);
global.app.activeDocument = doc;
b = ZSM.Draw.getBounds(defaultSettings);
assertClose(b[0], 0, 0.01, "PluginItem skipped: L=0");
assertClose(b[2], 100, 0.01, "PluginItem skipped: R=100");


// =====================================================
// TEST 16: Items in groups not double-counted
// =====================================================
console.log("\n=== TEST 16: Group children not measured separately ===");
// A non-clipped group's children would be in layer.pageItems (recursive)
// but their parent !== layer, so they should be filtered out.
// Only the parent group is measured (via _getEffectiveBounds → recurse).
b = runWith({
    layers: [{
        name: "Layer 1",
        items: [{
            type: "group", clipped: false,
            children: [
                { type: "path", bounds: [0, 100, 100, 0] }
            ]
        }]
    }]
}, defaultSettings);
assertClose(b[0], 0, 0.01, "Non-clipped group: L=0 (measured via group recursion)");
assertClose(b[2], 100, 0.01, "Non-clipped group: R=100");
// Math: if double-counted, the union would still be the same — but no NaN/Infinity
assert(isFinite(b[0]) && isFinite(b[2]), "No double-count NaN/Infinity");


// =====================================================
// TEST 17: Mode neither ZUND nor SUMMA — defaults to skipping "Zünd" sublayer
// =====================================================
console.log("\n=== TEST 17: Unknown mode → defaults to ZUND skip rules ===");
b = runWith({
    layers: [
        { name: "Regmarks", sublayers: [
            { name: "Zünd",  items: [{ type: "path", bounds: [-10, 110, 110, -10] }] },
            { name: "Summa", items: [{ type: "path", bounds: [-20, 120, 120, -20] }] }
        ]}
    ]
}, { mode: "WHATEVER", useArtboardBounds: false });
// Per code: currentMode = (s.mode === "SUMMA") ? "Summa" : "Zünd"
// So unknown mode treats as ZUND → skips Zünd, measures Summa
assertClose(b[0], -20, 0.01, "Unknown mode → defaults to ZUND skip rules (Summa measured)");


// =====================================================
// TEST 18: Compound path top-level
// =====================================================
console.log("\n=== TEST 18: Top-level CompoundPathItem measured ===");
b = runWith({
    layers: [{
        name: "Layer 1",
        items: [{ type: "compound", bounds: [5, 95, 95, 5], children: [] }]
    }]
}, defaultSettings);
assertClose(b[0], 5, 0.01, "CompoundPath: L=5");
assertClose(b[2], 95, 0.01, "CompoundPath: R=95");


// =====================================================
// TEARDOWN
// =====================================================
Mock.uninstall();


// =====================================================
// SUMMARY
// =====================================================
console.log("\n" + "=".repeat(50));
console.log("DRAW.GET_BOUNDS TEST RESULTS: " + pass + "/" + total + " PASSED, " + fail + " FAILED");
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
