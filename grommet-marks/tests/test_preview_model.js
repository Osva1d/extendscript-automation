#!/usr/bin/env node
/**
 * GM.PreviewModel Test Suite
 * Pure schematic geometry — validates the data behind the dialog preview.
 * Runs outside Illustrator (no DOM).
 *
 * Usage: node tests/test_preview_model.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
var GM = {};

// ===== LOAD PRODUCTION CODE =====
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "preview_model.js"), "utf8"));

// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;

function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}

// ----- helpers -----
function edge(enabled, useNumber, number, spacing) {
    return { enabled: enabled, useNumber: useNumber, number: number, spacing: spacing };
}
function baseSettings(over) {
    var s = {
        offsetX: 7, offsetY: 7,
        top:    edge(true,  true, 10, 105),
        left:   edge(true,  true, 10, 105),
        bottom: edge(false, true, 10, 105),
        right:  edge(false, true, 10, 105),
        bottomMirror: true,
        rightMirror:  true
    };
    if (over) { for (var k in over) if (over.hasOwnProperty(k)) s[k] = over[k]; }
    return s;
}
function countByEdge(dots, name) {
    var c = 0;
    for (var i = 0; i < dots.length; i++) if (dots[i].edge === name) c++;
    return c;
}

var CW = 220, CH = 150;
var CAP = GM.PreviewModel.CONFIG.DISPLAY_CAP;
var SPC = GM.PreviewModel.CONFIG.SPACING_COUNT;

// ===== TESTS: edge resolution (mirror) =====
console.log("--- PreviewModel: mirror resolution ---");
(function () {
    var m = GM.PreviewModel.compute(baseSettings(), CW, CH);
    assert(m.edges.top === true,    "top active");
    assert(m.edges.left === true,   "left active");
    assert(m.edges.bottom === true, "bottom mirrors top (active)");
    assert(m.edges.right === true,  "right mirrors left (active)");
})();
(function () {
    // mirror off, custom edges off
    var m = GM.PreviewModel.compute(baseSettings({
        bottomMirror: false, rightMirror: false
    }), CW, CH);
    assert(m.edges.bottom === false, "bottom not mirrored + disabled → inactive");
    assert(m.edges.right === false,  "right not mirrored + disabled → inactive");
})();
(function () {
    // top off → mirrored bottom also off
    var m = GM.PreviewModel.compute(baseSettings({
        top: edge(false, true, 10, 105)
    }), CW, CH);
    assert(m.edges.top === false,    "top disabled");
    assert(m.edges.bottom === false, "bottom mirrors disabled top → inactive");
})();

// ===== TESTS: dot counts =====
console.log("--- PreviewModel: dot counts ---");
(function () {
    var m = GM.PreviewModel.compute(baseSettings({
        top: edge(true, true, 8, 105), left: edge(false, true, 10, 105),
        bottomMirror: true, rightMirror: true
    }), CW, CH);
    // bottom mirrors top(8); left off so right(mirror left) off
    assert(countByEdge(m.dots, "top") === 8,    "top count mode → 8 dots");
    assert(countByEdge(m.dots, "bottom") === 8, "bottom mirrors top → 8 dots");
    assert(countByEdge(m.dots, "left") === 0,   "left disabled → 0 dots");
    assert(countByEdge(m.dots, "right") === 0,  "right mirrors disabled left → 0 dots");
})();
(function () {
    // cap enforcement
    var m = GM.PreviewModel.compute(baseSettings({
        top: edge(true, true, 100, 105)
    }), CW, CH);
    assert(countByEdge(m.dots, "top") === CAP, "top count 100 capped at DISPLAY_CAP");
})();
(function () {
    // spacing mode → fixed representative count
    var m = GM.PreviewModel.compute(baseSettings({
        top: edge(true, false, 10, 105)
    }), CW, CH);
    assert(countByEdge(m.dots, "top") === SPC, "spacing mode → SPACING_COUNT dots");
})();
(function () {
    // single mark centered
    var m = GM.PreviewModel.compute(baseSettings({
        top: edge(true, true, 1, 105), left: edge(false, true, 1, 1),
        bottomMirror: false, rightMirror: false,
        bottom: edge(false, true, 1, 1), right: edge(false, true, 1, 1)
    }), CW, CH);
    var top = [];
    for (var i = 0; i < m.dots.length; i++) if (m.dots[i].edge === "top") top.push(m.dots[i]);
    assert(top.length === 1, "single mark → 1 dot");
    var midX = m.rect.x + m.rect.w / 2;
    assert(Math.abs(top[0].x - midX) < 0.001, "single mark centered horizontally");
})();

// ===== TESTS: all edges off =====
console.log("--- PreviewModel: empty ---");
(function () {
    var m = GM.PreviewModel.compute(baseSettings({
        top: edge(false, true, 10, 105), left: edge(false, true, 10, 105),
        bottom: edge(false, true, 10, 105), right: edge(false, true, 10, 105),
        bottomMirror: false, rightMirror: false
    }), CW, CH);
    assert(m.dots.length === 0, "all edges off → no dots");
    assert(m.edges.top === false && m.edges.left === false &&
           m.edges.bottom === false && m.edges.right === false, "all flags false");
})();

// ===== TESTS: geometry bounds =====
console.log("--- PreviewModel: bounds ---");
(function () {
    var m = GM.PreviewModel.compute(baseSettings({
        top: edge(true, true, 10, 105), left: edge(true, true, 10, 105),
        bottom: edge(true, true, 10, 105), right: edge(true, true, 10, 105),
        bottomMirror: false, rightMirror: false
    }), CW, CH);
    // rect within canvas
    assert(m.rect.x >= 0 && m.rect.y >= 0, "rect origin non-negative");
    assert(m.rect.x + m.rect.w <= CW, "rect width within canvas");
    assert(m.rect.y + m.rect.h <= CH, "rect height within canvas");
    // every dot within rect
    var allIn = true;
    for (var i = 0; i < m.dots.length; i++) {
        var d = m.dots[i];
        if (d.x < m.rect.x || d.x > m.rect.x + m.rect.w ||
            d.y < m.rect.y || d.y > m.rect.y + m.rect.h) allIn = false;
    }
    assert(allIn, "every dot inside rect bounds");
    assert(m.dots.length === 40, "4 edges × 10 → 40 dots");
})();

// ===== TESTS: robustness =====
console.log("--- PreviewModel: robustness ---");
(function () {
    // string / NaN number coercion
    var m = GM.PreviewModel.compute(baseSettings({
        top: edge(true, true, "5", 105), bottomMirror: false,
        bottom: edge(false, true, 1, 1)
    }), CW, CH);
    assert(countByEdge(m.dots, "top") === 5, "string number coerced to 5");
})();
(function () {
    // NaN number → at least 1
    var m = GM.PreviewModel.compute(baseSettings({
        top: edge(true, true, NaN, 105), bottomMirror: false,
        bottom: edge(false, true, 1, 1)
    }), CW, CH);
    assert(countByEdge(m.dots, "top") >= 1, "NaN number → min 1 dot");
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
