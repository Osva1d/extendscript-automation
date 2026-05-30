#!/usr/bin/env node
/**
 * ZSM.Core Math Verification Test Suite
 * Runs outside Illustrator (pure JS) — validates geometry calculations.
 *
 * IMPORTANT: Loads the real src/core.js — no copy-pasted algorithms.
 * Single source of truth for the tested code.
 *
 * Reference: PROJECT_CHARTER.md specifications
 *   - Zund: d5mm circles, center 10+2.5mm from graphic edge
 *   - Summa: 3x3mm squares, center X=10mm, edge Y=10mm from graphic
 *   - OPOS bar: full graphic width, 11.5mm below graphic bottom
 *   - Orientation mark: 100mm + markSize from corner
 *   - Artboard: ceil to whole mm
 *
 * Usage: node tests/test_core_math.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
// ZSM namespace with mock Utils and Config (no Illustrator DOM needed)
var ZSM = {};

ZSM.Utils = {
    mm2pt: function (mm) { return mm * 2.83464567; },
    pt2mm: function (pt) { return pt / 2.83464567; },
    getSF: function () { return 1; },
    // Mirror src/lib/utils.js — composes Large Canvas SF with manual scaleN.
    // Keep in sync with the production implementation.
    getEffectiveSF: function (s) {
        var n = (s && s.scaleN) ? Number(s.scaleN) : 1;
        if (isNaN(n) || n < 1) n = 1;
        return this.getSF() * n;
    },
    log: function () {}
};

ZSM.Config = {
    zundSize: 5,
    summaSize: 3,
    summaXCenter: 10,
    summaYVisual: 10,
    redLineWidth: 1,
    debug: false
};

// ===== LOAD PRODUCTION CODE =====
var corePath = path.join(__dirname, "..", "src", "core.js");
eval(fs.readFileSync(corePath, "utf8"));


// ===== TEST FRAMEWORK =====
var mm2pt = ZSM.Utils.mm2pt;
var pt2mm = ZSM.Utils.pt2mm;
var pass = 0, fail = 0, total = 0;

function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}

function assertClose(a, b, tol, msg) {
    total++;
    if (Math.abs(a - b) <= tol) { pass++; }
    else { fail++; console.log("  FAIL: " + msg + " | got=" + a.toFixed(4) + " expected=" + b.toFixed(4) + " diff=" + (a - b).toFixed(4)); }
}

/** Shallow merge (ES3-safe replacement for Object.assign) */
function merge(base, overrides) {
    var result = {};
    var k;
    for (k in base)      { if (base.hasOwnProperty(k))      result[k] = base[k]; }
    for (k in overrides) { if (overrides.hasOwnProperty(k))  result[k] = overrides[k]; }
    return result;
}


// ===== TEST DATA =====
// Standard 100x100mm graphic at origin [0, 100mm_pt, 100mm_pt, 0]
var W100 = mm2pt(100);
var boundsStd = [0, W100, W100, 0]; // L,T,R,B


// =====================================================
// TEST 1: UNIT CONVERSION ROUNDTRIP
// =====================================================
console.log("\n=== TEST 1: Unit Conversion ===");
assertClose(mm2pt(1), 2.83464567, 0.0001, "1mm -> pt");
assertClose(pt2mm(mm2pt(1)), 1.0, 0.0001, "mm->pt->mm roundtrip");
assertClose(mm2pt(25.4), 72.0, 0.01, "25.4mm (1 inch) = 72pt");


// =====================================================
// TEST 2: ZUND MODE - 100x100mm graphic, defaults
// =====================================================
console.log("\n=== TEST 2: ZUND 100×100 mm — corner offset = gapInner + rZ; orient at BL+105 mm ===");
var settingsZ = {
    mode: "ZUND", markSizeZ: 5, markSizeS: 3,
    gapInner: 10, gapOuter: 0, maxDist: 400, orientDist: 100,
    feedTop: 70, feedBottom: 50, drawRed: false,
    useArtboardBounds: false, thruActive: true, thruName: "cut",
    kissActive: false, kissName: ""
};
var geoZ = ZSM.Core.calculateAll(settingsZ, boundsStd);

// Expected: offZX = gapInner + rZ = 10 + 2.5 = 12.5mm
// Mark left X = graphicLeft - 12.5mm(pt)
var expectedOffZ = mm2pt(12.5);
assertClose(geoZ.marksZ[0].cx, 0 - expectedOffZ, 0.01, "Z: Left mark X = graphic_left - 12.5mm");
assertClose(geoZ.marksZ[0].cy, 0 - mm2pt(12.5), 0.01, "Z: Bottom mark Y = graphic_bottom - 12.5mm");
assertClose(geoZ.marksZ[2].cx, W100 + expectedOffZ, 0.01, "Z: Right mark X = graphic_right + 12.5mm");
assertClose(geoZ.marksZ[1].cy, W100 + mm2pt(12.5), 0.01, "Z: Top mark Y = graphic_top + 12.5mm");

// 4 corners + orientation mark = 5 base marks (no intermediates needed for 100mm + 400mm maxDist)
assert(geoZ.marksZ.length >= 5, "Z: At least 5 marks (4 corners + 1 orient)");

// Orientation mark: BL corner X + (100mm + 5mm) = BL.cx + 105mm
var orientExpectedX = geoZ.marksZ[0].cx + mm2pt(105);
assertClose(geoZ.marksZ[4].cx, orientExpectedX, 0.01, "Z: Orient mark at BL + 105mm");
assertClose(geoZ.marksZ[4].cy, geoZ.marksZ[0].cy, 0.01, "Z: Orient mark same Y as BL corner");

// No Summa marks in ZUND mode
assert(geoZ.marksS.length === 0, "Z: No Summa marks");
assert(geoZ.barS === null, "Z: No OPOS bar");

// Artboard: should be > graphic (ceil to mm)
var abWmm = pt2mm(geoZ.ab[2] - geoZ.ab[0]);
var abHmm = pt2mm(geoZ.ab[1] - geoZ.ab[3]);
assert(abWmm >= 100, "Z: Artboard width >= 100mm (got " + abWmm.toFixed(1) + "mm)");
assert(abHmm >= 100, "Z: Artboard height >= 100mm (got " + abHmm.toFixed(1) + "mm)");
assert(Math.ceil(abWmm) === abWmm || Math.abs(abWmm - Math.round(abWmm)) < 0.02,
       "Z: AB width is whole mm (" + abWmm.toFixed(3) + ")");


// =====================================================
// TEST 3: SUMMA MODE - 100x100mm, defaults
// =====================================================
console.log("\n=== TEST 3: SUMMA 100×100 mm — corner X centers ±10 mm; bar at full graphic width below ===");
var settingsS = {
    mode: "SUMMA", markSizeZ: 5, markSizeS: 3,
    gapInner: 10, gapOuter: 0, maxDist: 400, orientDist: 100,
    feedTop: 70, feedBottom: 50, drawRed: true,
    useArtboardBounds: false, thruActive: false, thruName: "",
    kissActive: true, kissName: "cut"
};
var geoS = ZSM.Core.calculateAll(settingsS, boundsStd);

// Summa X: center at 10mm from graphic edge
assertClose(geoS.marksS[0].cx, 0 - mm2pt(10), 0.01, "S: Left Summa mark X = -10mm (center)");
assertClose(geoS.marksS[2].cx, W100 + mm2pt(10), 0.01, "S: Right Summa mark X = +10mm (center)");

// Summa Y: offSY = summaYVisual + rS = 10 + 1.5 = 11.5mm (center)
var offSY_mm = 10 + 1.5; // 11.5
assertClose(geoS.marksS[0].cy, 0 - mm2pt(offSY_mm), 0.01, "S: Bottom Summa Y = -11.5mm (center)");
assertClose(geoS.marksS[1].cy, W100 + mm2pt(offSY_mm), 0.01, "S: Top Summa Y = +11.5mm (center)");

// Visual gap from graphic edge to mark edge should be 10mm:
// Mark center at 11.5mm, mark half-size = 1.5mm -> edge = 11.5 - 1.5 = 10mm
var visualGapY = offSY_mm - 1.5;
assertClose(visualGapY, 10.0, 0.01, "S: Visual Y gap = 10mm (charter spec)");

// OPOS Bar
assert(geoS.barS !== null, "S: OPOS bar exists");
assertClose(geoS.barS.x1, boundsStd[0], 0.01, "S: Bar x1 = graphic left");
assertClose(geoS.barS.x2, boundsStd[2], 0.01, "S: Bar x2 = graphic right");
assertClose(geoS.barS.y, 0 - mm2pt(11.5), 0.01, "S: Bar Y = graphic_bottom - 11.5mm");
assertClose(pt2mm(geoS.barS.w), 3.0, 0.01, "S: Bar width = 3mm");

// No Zund marks in SUMMA mode
assert(geoS.marksZ.length === 0, "S: No Zund marks");

// Red lines should exist
assert(geoS.red.length === 2, "S: Two red lines (top + bottom)");

// Artboard asymmetric feed: top 70mm + bottom 50mm must be independent
var abAboveGraphic = pt2mm(geoS.ab[1] - boundsStd[1]);
assert(abAboveGraphic >= 82, "S: AB extends >=82mm above graphic (got " + abAboveGraphic.toFixed(1) + ")");
var abBelowGraphic = pt2mm(boundsStd[3] - geoS.ab[3]);
assert(abBelowGraphic >= 62, "S: AB extends >=62mm below graphic (got " + abBelowGraphic.toFixed(1) + ")");


// =====================================================
// TEST 4: SUMMA MODE - symmetric feed
// =====================================================
console.log("\n=== TEST 4: SUMMA symmetric feed (top=bottom=70 mm) — artboard mirrors top/bottom around graphic ===");
var settingsSymm = merge(settingsS, { feedTop: 70, feedBottom: 70 });
var geoSymm = ZSM.Core.calculateAll(settingsSymm, boundsStd);

var symmAbove = pt2mm(geoSymm.ab[1] - boundsStd[1]);
var symmBelow = pt2mm(boundsStd[3] - geoSymm.ab[3]);
// With equal feeds the margins above/below should be equal
assertClose(symmAbove, symmBelow, 1.0, "Symm: Above and below margins equal (+/- 1mm rounding)");
assert(symmAbove >= 82, "Symm: AB extends >=82mm above graphic (got " + symmAbove.toFixed(1) + ")");


// =====================================================
// TEST 5: INTERMEDIATE MARKS (addSteps)
// =====================================================
console.log("\n=== TEST 5: Intermediate Marks (addSteps) ===");

// Small graphic: 10x10mm with maxDist=50mm -> no intermediates needed
var boundsSmall = [0, mm2pt(10), mm2pt(10), 0];
var settingsSmall = merge(settingsZ, { maxDist: 50 });
var geoSmall = ZSM.Core.calculateAll(settingsSmall, boundsSmall);
assert(geoSmall.marksZ.length === 5, "Small: Only 5 marks (4 corners + orient), no intermediates");

// Large graphic: 1000x1000mm with maxDist=400mm -> needs intermediates
var boundsLarge = [0, mm2pt(1000), mm2pt(1000), 0];
var settingsLarge = merge(settingsZ, { maxDist: 400 });
var geoLarge = ZSM.Core.calculateAll(settingsLarge, boundsLarge);
assert(geoLarge.marksZ.length > 5, "Large: More than 5 marks (got " + geoLarge.marksZ.length + ")");

// Each 1000mm side should get ceil(1025/400)=3 segments -> 2 intermediates per side x 4 sides = 8
var sideLen = mm2pt(1000 + 25); // marks are offset, so side ~1025mm
var segs = Math.ceil(pt2mm(sideLen + mm2pt(25)) / 400);
console.log("  (Info: Large side ~" + pt2mm(sideLen).toFixed(0) + "mm, expecting ~" + ((segs - 1) * 4) + " intermediates)");
assert(geoLarge.marksZ.length > 12, "Large: Sufficient intermediate marks (got " + geoLarge.marksZ.length + ")");


// =====================================================
// TEST 6: FIXED ARTBOARD MODE (ZUND only)
// =====================================================
console.log("\n=== TEST 6: ZUND Fixed Artboard — marks placed relative to artboard, AB rect unchanged ===");
var boundsAB = [0, mm2pt(200), mm2pt(300), 0]; // 300x200mm artboard
var settingsFixed = {
    mode: "ZUND", markSizeZ: 5, markSizeS: 3,
    gapInner: 10, gapOuter: 5, maxDist: 400, orientDist: 100,
    feedTop: 0, feedBottom: 0, drawRed: false,
    useArtboardBounds: true, thruActive: true, thruName: "cut",
    kissActive: false, kissName: ""
};
var geoFixed = ZSM.Core.calculateAll(settingsFixed, boundsAB);

// Artboard should remain unchanged
assertClose(geoFixed.ab[0], boundsAB[0], 0.01, "Fixed: AB left unchanged");
assertClose(geoFixed.ab[1], boundsAB[1], 0.01, "Fixed: AB top unchanged");
assertClose(geoFixed.ab[2], boundsAB[2], 0.01, "Fixed: AB right unchanged");
assertClose(geoFixed.ab[3], boundsAB[3], 0.01, "Fixed: AB bottom unchanged");

// Marks should be INSIDE artboard (gapOuter + rZ from edge)
// distFromEdge = gapO(5) + rZ(2.5) = 7.5mm
var dfe = mm2pt(7.5);
assertClose(geoFixed.marksZ[0].cx, boundsAB[0] + dfe, 0.01, "Fixed: Left mark inside AB by 7.5mm");
assertClose(geoFixed.marksZ[2].cx, boundsAB[2] - dfe, 0.01, "Fixed: Right mark inside AB by 7.5mm");
assertClose(geoFixed.marksZ[1].cy, boundsAB[1] - dfe, 0.01, "Fixed: Top mark inside AB by 7.5mm");
assertClose(geoFixed.marksZ[0].cy, boundsAB[3] + dfe, 0.01, "Fixed: Bottom mark inside AB by 7.5mm");


// =====================================================
// TEST 7: EDGE CASES
// =====================================================
console.log("\n=== TEST 7: Edge Cases ===");

// Very small graphic: 5x5mm
var boundsMin = [0, mm2pt(5), mm2pt(5), 0];
var geoMin = ZSM.Core.calculateAll(settingsZ, boundsMin);
assert(geoMin.marksZ.length >= 4, "MinSize: At least 4 corner marks");
assert(geoMin.ab[2] - geoMin.ab[0] > 0, "MinSize: AB has positive width");

// Zero gapOuter
var settingsNoGap = merge(settingsZ, { gapOuter: 0 });
var geoNoGap = ZSM.Core.calculateAll(settingsNoGap, boundsStd);
assert(geoNoGap.ab[2] - geoNoGap.ab[0] > 0, "ZeroGap: AB still valid");

// Large Canvas (SF=10) simulation
var origSF = ZSM.Utils.getSF;
ZSM.Utils.getSF = function () { return 10; };
var geoSF = ZSM.Core.calculateAll(settingsZ, boundsStd);
assert(geoSF.marksZ.length >= 4, "SF10: Marks generated");
// In SF=10, all mm values are divided by 10 -> marks closer to graphic
var sfMarkDist = Math.abs(pt2mm(geoSF.marksZ[0].cx));
assert(sfMarkDist < 2, "SF10: Mark distance scaled down (got " + sfMarkDist.toFixed(2) + "mm)");
ZSM.Utils.getSF = origSF; // restore


// =====================================================
// TEST 8: RED LINES
// =====================================================
console.log("\n=== TEST 8: Red Lines ===");
// Red lines should span full artboard width at top and bottom
assert(geoS.red.length === 2, "Red: 2 lines");
assertClose(geoS.red[0].x1, geoS.ab[0], 0.01, "Red top: starts at AB left");
assertClose(geoS.red[0].x2, geoS.ab[2], 0.01, "Red top: ends at AB right");
assertClose(geoS.red[1].x1, geoS.ab[0], 0.01, "Red bot: starts at AB left");
assertClose(geoS.red[1].x2, geoS.ab[2], 0.01, "Red bot: ends at AB right");
// Red line Y should be at AB edge (+/- half stroke)
assertClose(geoS.red[0].y1, geoS.ab[1] - 0.5, 0.01, "Red top: Y at AB top - half stroke");
assertClose(geoS.red[1].y1, geoS.ab[3] + 0.5, 0.01, "Red bot: Y at AB bot + half stroke");

// ZUND mode should NOT have red lines
assert(geoZ.red.length === 0, "Red: ZUND has no red lines");


// =====================================================
// TEST 9: ARTBOARD DIMENSIONS
// =====================================================
console.log("\n=== TEST 9: Artboard Dimensions (ceil to mm) ===");
// For all non-fixed modes, AB dimensions should be whole mm (ceil)
var abW = pt2mm(geoZ.ab[2] - geoZ.ab[0]);
var abH = pt2mm(geoZ.ab[1] - geoZ.ab[3]);
assertClose(abW, Math.ceil(abW), 0.05, "Z AB: Width is ceil mm (" + abW.toFixed(3) + ")");
assertClose(abH, Math.ceil(abH), 0.05, "Z AB: Height is ceil mm (" + abH.toFixed(3) + ")");

var abWs = pt2mm(geoS.ab[2] - geoS.ab[0]);
var abHs = pt2mm(geoS.ab[1] - geoS.ab[3]);
assertClose(abWs, Math.ceil(abWs), 0.05, "S AB: Width is ceil mm (" + abWs.toFixed(3) + ")");
assertClose(abHs, Math.ceil(abHs), 0.05, "S AB: Height is ceil mm (" + abHs.toFixed(3) + ")");

// AB should be centered horizontally on graphic
var abCxZ = (geoZ.ab[0] + geoZ.ab[2]) / 2;
var gCx = (boundsStd[0] + boundsStd[2]) / 2;
assertClose(abCxZ, gCx, 0.01, "Z AB: Centered horizontally on graphic");


// =====================================================
// TEST 10: NARROW GRAPHIC — orientation mark must fit in artboard
// =====================================================
console.log("\n=== TEST 10: Narrow graphic (80mm, orient mark check) ===");
var boundsNarrow = [0, mm2pt(200), mm2pt(80), 0]; // 80x200mm
var settingsNarrow = merge(settingsZ, { gapInner: 5, gapOuter: 0 });
var geoNarrow = ZSM.Core.calculateAll(settingsNarrow, boundsNarrow);

// Orient mark X = xL + mm2pt(orientDist + markSizeZ) = BL corner + 105mm
// For narrow graphics this extends far to the right of the normal AB width.
var orientX = geoNarrow.marksZ[4].cx;
var orientRightEdge = orientX + mm2pt(2.5); // mark center + radius
assert(orientRightEdge <= geoNarrow.ab[2], "Narrow: Orient mark right edge inside AB (orient=" +
    pt2mm(orientRightEdge).toFixed(1) + "mm, AB right=" + pt2mm(geoNarrow.ab[2]).toFixed(1) + "mm)");

// Very narrow: 40mm graphic — orient mark dominates AB width
var boundsVeryNarrow = [0, mm2pt(200), mm2pt(40), 0];
var geoVN = ZSM.Core.calculateAll(settingsNarrow, boundsVeryNarrow);
var orientVN = geoVN.marksZ[4].cx + mm2pt(2.5);
assert(orientVN <= geoVN.ab[2], "VeryNarrow: Orient mark inside AB (orient=" +
    pt2mm(orientVN).toFixed(1) + "mm, AB right=" + pt2mm(geoVN.ab[2]).toFixed(1) + "mm)");

// Standard 100mm — orient mark should NOT inflate AB (normal case still works)
assert(geoZ.marksZ[4].cx + mm2pt(2.5) <= geoZ.ab[2],
    "Standard: Orient mark inside AB for 100mm graphic");

// Non-default orientDist: 150mm → mark should land at BL + (150+5)mm = 155mm
var settingsOD150 = merge(settingsZ, { orientDist: 150 });
var geoOD150 = ZSM.Core.calculateAll(settingsOD150, boundsStd);
var orientExpected150 = geoOD150.marksZ[0].cx + mm2pt(155);
assertClose(geoOD150.marksZ[4].cx, orientExpected150, 0.01, "OrientDist=150: mark at BL + 155mm");
assertClose(geoOD150.marksZ[4].cy, geoOD150.marksZ[0].cy, 0.01, "OrientDist=150: same Y as BL corner");

// Non-default orientDist on narrow graphic: must still fit in artboard
var settingsOD200Narrow = merge(settingsZ, { orientDist: 200, gapInner: 5, gapOuter: 0 });
var geoOD200N = ZSM.Core.calculateAll(settingsOD200Narrow, boundsNarrow);
var orientOD200Edge = geoOD200N.marksZ[4].cx + mm2pt(2.5);
assert(orientOD200Edge <= geoOD200N.ab[2] + 0.01, "OrientDist=200 narrow: mark inside AB (orient=" +
    pt2mm(orientOD200Edge).toFixed(1) + "mm, AB right=" + pt2mm(geoOD200N.ab[2]).toFixed(1) + "mm)");


// =====================================================
// TEST 11: addSteps — horizontal, vertical, and short segments
// =====================================================
console.log("\n=== TEST 11: addSteps edge cases (horizontal, vertical, short) ===");

// Pure horizontal segment (dy = 0)
var hArr = [];
ZSM.Core.addSteps(hArr, 0, 100, mm2pt(600), 100, mm2pt(200));
assert(hArr.length > 0, "Horizontal: intermediates inserted (got " + hArr.length + ")");
for (var hi = 0; hi < hArr.length; hi++) {
    assertClose(hArr[hi].cy, 100, 0.01, "Horizontal: intermediate " + hi + " Y unchanged");
}

// Pure vertical segment (dx = 0)
var vArr = [];
ZSM.Core.addSteps(vArr, 50, 0, 50, mm2pt(600), mm2pt(200));
assert(vArr.length > 0, "Vertical: intermediates inserted (got " + vArr.length + ")");
for (var vi = 0; vi < vArr.length; vi++) {
    assertClose(vArr[vi].cx, 50, 0.01, "Vertical: intermediate " + vi + " X unchanged");
}

// Segment shorter than max — no intermediates
var shortArr = [];
ZSM.Core.addSteps(shortArr, 0, 0, mm2pt(50), mm2pt(50), mm2pt(200));
assert(shortArr.length === 0, "Short segment: no intermediates (got " + shortArr.length + ")");

// Zero-length segment — no intermediates
var zeroArr = [];
ZSM.Core.addSteps(zeroArr, 10, 20, 10, 20, mm2pt(100));
assert(zeroArr.length === 0, "Zero-length: no intermediates");

// Large Canvas SF=10 with SUMMA mode
console.log("\n=== TEST 11b: Large Canvas (SF=10) + SUMMA ===");
var origSF2 = ZSM.Utils.getSF;
ZSM.Utils.getSF = function () { return 10; };
var settingsSF10S = merge(settingsS, {});
var geoSF10S = ZSM.Core.calculateAll(settingsSF10S, boundsStd);
assert(geoSF10S.marksS.length >= 4, "SF10 SUMMA: marks generated (got " + geoSF10S.marksS.length + ")");
assert(geoSF10S.barS !== null, "SF10 SUMMA: OPOS bar exists");
assert(!isNaN(geoSF10S.marksS[0].cy), "SF10 SUMMA: mark Y is not NaN");
ZSM.Utils.getSF = origSF2;


// =====================================================
// TEST 12: BUG-1 — Symmetric vertical margins in ZUND mode
// =====================================================
console.log("\n=== TEST 12: BUG-1 — Symmetric vertical margins (ZUND) ===");

// Non-integer graphic height: margins above/below marks must be equal
var boundsAsymm = [0, mm2pt(503.7), mm2pt(300), 0]; // 300 x 503.7mm
var settingsB1 = merge(settingsZ, { gapInner: 5, gapOuter: 0 });
var geoB1 = ZSM.Core.calculateAll(settingsB1, boundsAsymm);

var abTopMm = pt2mm(geoB1.ab[1]);
var abBotMm = pt2mm(geoB1.ab[3]);
var markTopMm = pt2mm(geoB1.marksZ[1].cy); // TL corner mark Y
var markBotMm = pt2mm(geoB1.marksZ[0].cy); // BL corner mark Y

var marginTop = abTopMm - markTopMm;
var marginBot = markBotMm - abBotMm;
assertClose(marginTop, marginBot, 0.02, "BUG-1: Top margin (" + marginTop.toFixed(3) +
    ") == bottom margin (" + marginBot.toFixed(3) + ")");

// Another non-integer case: 701.3mm height
var boundsAsymm2 = [0, mm2pt(701.3), mm2pt(400), 0];
var geoB1b = ZSM.Core.calculateAll(settingsB1, boundsAsymm2);
var mTop2 = pt2mm(geoB1b.ab[1]) - pt2mm(geoB1b.marksZ[1].cy);
var mBot2 = pt2mm(geoB1b.marksZ[0].cy) - pt2mm(geoB1b.ab[3]);
assertClose(mTop2, mBot2, 0.02, "BUG-1b: Symmetric margins for 701.3mm graphic");

// SUMMA with asymmetric feed must remain asymmetric (no regression)
var settingsB1S = merge(settingsS, { feedTop: 70, feedBottom: 50 });
var geoB1S = ZSM.Core.calculateAll(settingsB1S, boundsStd);
var sAbove = pt2mm(geoB1S.ab[1] - boundsStd[1]);
var sBelow = pt2mm(boundsStd[3] - geoB1S.ab[3]);
assert(Math.abs(sAbove - sBelow) > 10, "BUG-1: SUMMA asymmetric feed preserved (above=" +
    sAbove.toFixed(1) + ", below=" + sBelow.toFixed(1) + ")");


// =====================================================
// TEST 13: BUG-2 — Consistent width for near-integer half-widths
// =====================================================
console.log("\n=== TEST 13: BUG-2 — Cliff-effect rounding ===");

// Two graphics differing by 0.001mm should produce same artboard width
var boundsA = [0, mm2pt(500), mm2pt(400.000), 0];
var boundsB = [0, mm2pt(500), mm2pt(400.001), 0];
var settingsB2 = merge(settingsZ, { gapInner: 5, gapOuter: 0 });
var geoA = ZSM.Core.calculateAll(settingsB2, boundsA);
var geoB = ZSM.Core.calculateAll(settingsB2, boundsB);
var widthA = pt2mm(geoA.ab[2] - geoA.ab[0]);
var widthB = pt2mm(geoB.ab[2] - geoB.ab[0]);
assertClose(widthA, widthB, 0.1, "BUG-2: Width consistent for 400.000 vs 400.001mm (" +
    widthA.toFixed(3) + " vs " + widthB.toFixed(3) + ")");

// Edge case: graphic dimension exactly whole mm — no extra rounding
var boundsExact = [0, mm2pt(500), mm2pt(400), 0];
var geoExact = ZSM.Core.calculateAll(settingsB2, boundsExact);
var widthExact = pt2mm(geoExact.ab[2] - geoExact.ab[0]);
assertClose(widthExact, Math.round(widthExact), 0.05,
    "BUG-2: Exact mm graphic → whole mm AB width (" + widthExact.toFixed(3) + ")");

// Edge case: graphic at .999mm — should snap up, not double-round
var boundsAlmost = [0, mm2pt(500), mm2pt(399.999), 0];
var geoAlmost = ZSM.Core.calculateAll(settingsB2, boundsAlmost);
var widthAlmost = pt2mm(geoAlmost.ab[2] - geoAlmost.ab[0]);
assertClose(widthAlmost, widthExact, 0.1,
    "BUG-2: 399.999mm and 400mm produce same AB width (" + widthAlmost.toFixed(3) + " vs " + widthExact.toFixed(3) + ")");

// Vertical cliff-effect: heights should also be consistent
var heightA = pt2mm(geoA.ab[1] - geoA.ab[3]);
var heightB = pt2mm(geoB.ab[1] - geoB.ab[3]);
assertClose(heightA, heightB, 0.1, "BUG-2: Height consistent for near-identical graphics (" +
    heightA.toFixed(3) + " vs " + heightB.toFixed(3) + ")");


// =====================================================
// TEST 14: EXOTIC INPUTS — degenerate bounds
// =====================================================
console.log("\n=== TEST 14: Exotic bounds (degenerate inputs) ===");

// Helper: check that no coords in a geometry are NaN/Infinity
function isFiniteCoords(geo) {
    if (!geo) return false;
    var arrs = [geo.marksZ, geo.marksS];
    for (var ai = 0; ai < arrs.length; ai++) {
        for (var i = 0; i < arrs[ai].length; i++) {
            if (!isFinite(arrs[ai][i].cx) || !isFinite(arrs[ai][i].cy)) return false;
        }
    }
    if (geo.barS && (!isFinite(geo.barS.x1) || !isFinite(geo.barS.x2) || !isFinite(geo.barS.y))) return false;
    for (var ri = 0; ri < geo.red.length; ri++) {
        if (!isFinite(geo.red[ri].x1) || !isFinite(geo.red[ri].y1)
         || !isFinite(geo.red[ri].x2) || !isFinite(geo.red[ri].y2)) return false;
    }
    if (!isFinite(geo.ab[0]) || !isFinite(geo.ab[1])
     || !isFinite(geo.ab[2]) || !isFinite(geo.ab[3])) return false;
    return true;
}

// Zero-area bounds: L === R, T === B (degenerate point)
var boundsPoint = [0, 0, 0, 0];
var geoPoint;
try {
    geoPoint = ZSM.Core.calculateAll(settingsZ, boundsPoint);
    assert(isFiniteCoords(geoPoint), "Exotic: zero-area bounds → all coords finite");
    assert(geoPoint.marksZ.length >= 4, "Exotic: zero-area still produces 4 corner marks");
} catch (e) {
    assert(false, "Exotic: zero-area bounds threw — " + e.message);
}

// Zero-width (vertical line) bounds: L === R but T !== B
var boundsVLine = [0, mm2pt(100), 0, 0];
try {
    var geoVLine = ZSM.Core.calculateAll(settingsZ, boundsVLine);
    assert(isFiniteCoords(geoVLine), "Exotic: zero-width bounds → finite coords");
} catch (e) {
    assert(false, "Exotic: zero-width threw — " + e.message);
}

// Zero-height bounds
var boundsHLine = [0, 0, mm2pt(100), 0];
try {
    var geoHLine = ZSM.Core.calculateAll(settingsZ, boundsHLine);
    assert(isFiniteCoords(geoHLine), "Exotic: zero-height bounds → finite coords");
} catch (e) {
    assert(false, "Exotic: zero-height threw — " + e.message);
}

// Inverted bounds: L > R (negative width)
var boundsInv = [mm2pt(100), mm2pt(100), 0, 0];
try {
    var geoInv = ZSM.Core.calculateAll(settingsZ, boundsInv);
    // Document current behavior — function doesn't error, may produce strange geometry
    assert(geoInv !== undefined, "Exotic: inverted bounds doesn't crash function");
    assert(isFiniteCoords(geoInv), "Exotic: inverted bounds → finite coords (no NaN/Inf)");
} catch (e) {
    assert(false, "Exotic: inverted bounds threw — " + e.message);
}

// Negative coordinate bounds (graphic in negative quadrant)
var boundsNeg = [mm2pt(-100), 0, 0, mm2pt(-100)];
try {
    var geoNeg = ZSM.Core.calculateAll(settingsZ, boundsNeg);
    assert(isFiniteCoords(geoNeg), "Exotic: negative-quadrant bounds → finite coords");
    assert(geoNeg.marksZ.length >= 4, "Exotic: negative-quadrant still produces marks");
} catch (e) {
    assert(false, "Exotic: negative-quadrant threw — " + e.message);
}


// =====================================================
// TEST 15: EXOTIC INPUTS — extreme settings values
// =====================================================
console.log("\n=== TEST 15: Exotic settings (extreme values) ===");

// gapInner = 0 (marks touching the graphic)
var settingsZeroGap = merge(settingsZ, { gapInner: 0 });
try {
    var geoZeroGap = ZSM.Core.calculateAll(settingsZeroGap, boundsStd);
    assert(isFiniteCoords(geoZeroGap), "Extreme: gapInner=0 → finite coords");
    // Mark center distance from graphic edge = 0 + rZ = 2.5mm
    assertClose(Math.abs(pt2mm(geoZeroGap.marksZ[0].cx)), 2.5, 0.01, "Extreme: gapInner=0 mark at edge+radius");
} catch (e) { assert(false, "Extreme: gapInner=0 threw — " + e.message); }

// gapInner very large (1000mm)
var settingsHugeGap = merge(settingsZ, { gapInner: 1000 });
try {
    var geoHugeGap = ZSM.Core.calculateAll(settingsHugeGap, boundsStd);
    assert(isFiniteCoords(geoHugeGap), "Extreme: gapInner=1000mm → finite coords");
} catch (e) { assert(false, "Extreme: gapInner=1000mm threw — " + e.message); }

// markSize at minimum (0.1mm)
var settingsTinyMark = merge(settingsZ, { markSizeZ: 0.1 });
try {
    var geoTinyMark = ZSM.Core.calculateAll(settingsTinyMark, boundsStd);
    assert(isFiniteCoords(geoTinyMark), "Extreme: markSizeZ=0.1 → finite coords");
} catch (e) { assert(false, "Extreme: markSizeZ=0.1 threw — " + e.message); }

// markSize at maximum (50mm) on a small graphic
var settingsHugeMark = merge(settingsZ, { markSizeZ: 50 });
try {
    var geoHugeMark = ZSM.Core.calculateAll(settingsHugeMark, [0, mm2pt(50), mm2pt(50), 0]);
    assert(isFiniteCoords(geoHugeMark), "Extreme: markSizeZ=50 on 50mm graphic → finite coords");
} catch (e) { assert(false, "Extreme: markSizeZ=50 threw — " + e.message); }

// maxDist = 0 (no intermediate marks regardless of side length)
var settingsNoStep = merge(settingsZ, { maxDist: 0 });
try {
    var geoNoStep = ZSM.Core.calculateAll(settingsNoStep, [0, mm2pt(2000), mm2pt(2000), 0]);
    // Only corners + orient mark — no intermediates due to maxDist=0
    assert(geoNoStep.marksZ.length === 5, "Extreme: maxDist=0 → only corners + orient (got " + geoNoStep.marksZ.length + ")");
} catch (e) { assert(false, "Extreme: maxDist=0 threw — " + e.message); }

// Very small maxDist (1mm) on small graphic — many intermediates
var settingsTinyStep = merge(settingsZ, { maxDist: 5 });
try {
    var geoTinyStep = ZSM.Core.calculateAll(settingsTinyStep, [0, mm2pt(50), mm2pt(50), 0]);
    assert(isFiniteCoords(geoTinyStep), "Extreme: maxDist=5mm → finite coords");
    // Should produce many intermediates
    assert(geoTinyStep.marksZ.length > 30, "Extreme: maxDist=5mm produces many intermediates (got " + geoTinyStep.marksZ.length + ")");
} catch (e) { assert(false, "Extreme: maxDist=5mm threw — " + e.message); }

// Negative maxDist — should behave like 0 (no intermediates)
var settingsNegStep = merge(settingsZ, { maxDist: -10 });
try {
    var geoNegStep = ZSM.Core.calculateAll(settingsNegStep, boundsStd);
    assert(geoNegStep.marksZ.length === 5, "Extreme: negative maxDist treated as 0 (got " + geoNegStep.marksZ.length + ")");
} catch (e) { assert(false, "Extreme: negative maxDist threw — " + e.message); }


// =====================================================
// TEST 16: EXOTIC INPUTS — invalid/unusual mode
// =====================================================
console.log("\n=== TEST 16: Exotic mode values ===");

// Unknown mode — should default to ZUND-like behavior (or produce safe geometry)
var settingsUnknownMode = merge(settingsZ, { mode: "UNKNOWN" });
try {
    var geoUnknown = ZSM.Core.calculateAll(settingsUnknownMode, boundsStd);
    assert(isFiniteCoords(geoUnknown), "Exotic: mode='UNKNOWN' → finite coords");
    // Document current behavior: unknown mode treats as non-ZUND non-SUMMA → no marks of either type
    // (this may be a defect; test documents behavior either way)
    // Actual: code uses (s.mode === "ZUND" ?...) and (s.mode === "SUMMA" ?...) — neither branch fires
    assert(geoUnknown.marksZ.length === 0, "Exotic: unknown mode → no Zünd marks");
    assert(geoUnknown.marksS.length === 0, "Exotic: unknown mode → no Summa marks");
} catch (e) { assert(false, "Exotic: unknown mode threw — " + e.message); }

// Empty string mode
var settingsEmptyMode = merge(settingsZ, { mode: "" });
try {
    var geoEmptyMode = ZSM.Core.calculateAll(settingsEmptyMode, boundsStd);
    assert(isFiniteCoords(geoEmptyMode), "Exotic: mode='' → finite coords");
} catch (e) { assert(false, "Exotic: mode='' threw — " + e.message); }

// Lower-case mode (should NOT match — current code is strict equality)
var settingsLowerMode = merge(settingsZ, { mode: "zund" });
try {
    var geoLowerMode = ZSM.Core.calculateAll(settingsLowerMode, boundsStd);
    assert(geoLowerMode.marksZ.length === 0, "Exotic: mode='zund' (lowercase) is strict-mismatch, no ZUND marks");
} catch (e) { assert(false, "Exotic: lowercase mode threw — " + e.message); }


// =====================================================
// TEST 17: EXOTIC INPUTS — coordinate overflow (AI 16383pt limit)
// =====================================================
console.log("\n=== TEST 17: Coordinate overflow (Illustrator 16383pt limit) ===");

// 5000mm graphic = ~14173pt, marks extend beyond → near limit
var bounds5000mm = [0, mm2pt(5000), mm2pt(5000), 0];
try {
    var geo5000 = ZSM.Core.calculateAll(settingsZ, bounds5000mm);
    assert(isFiniteCoords(geo5000), "Overflow: 5000mm graphic → finite coords");
    // Document: artboard may exceed AI's 16383pt max — render() validates and bails
    // Math layer should produce the values regardless; render layer enforces bounds.
} catch (e) { assert(false, "Overflow: 5000mm threw — " + e.message); }

// Hugely positive bounds — math should produce numbers, not Infinity
var boundsBig = [mm2pt(1000), mm2pt(2000), mm2pt(2000), mm2pt(1000)];
try {
    var geoBig = ZSM.Core.calculateAll(settingsZ, boundsBig);
    assert(isFiniteCoords(geoBig), "Overflow: graphic at 1000-2000mm → finite coords");
} catch (e) { assert(false, "Overflow: huge offset threw — " + e.message); }


// =====================================================
// TEST 18: addSteps — pathological cases
// =====================================================
console.log("\n=== TEST 18: addSteps pathological cases ===");

// max = 0 → should produce no intermediates
var arrMax0 = [];
ZSM.Core.addSteps(arrMax0, 0, 0, mm2pt(1000), 0, 0);
assert(arrMax0.length === 0, "addSteps: max=0 produces no intermediates");

// max < 0 → should produce no intermediates (the `max > 0` guard)
var arrMaxNeg = [];
ZSM.Core.addSteps(arrMaxNeg, 0, 0, mm2pt(1000), 0, -100);
assert(arrMaxNeg.length === 0, "addSteps: max<0 produces no intermediates");

// Very small max with very long segment — produces many intermediates but should not hang
var arrMany = [];
var t0 = Date.now();
ZSM.Core.addSteps(arrMany, 0, 0, mm2pt(1000), 0, mm2pt(1));
var elapsed = Date.now() - t0;
assert(elapsed < 1000, "addSteps: 1mm step over 1000mm completes in <1s (took " + elapsed + "ms, " + arrMany.length + " intermediates)");
assert(arrMany.length > 900, "addSteps: 1mm step produces ~999 intermediates (got " + arrMany.length + ")");

// NaN inputs — should not crash
var arrNaN = [];
try {
    ZSM.Core.addSteps(arrNaN, 0, 0, NaN, 0, 100);
    // Should not throw; may produce NaN intermediates or none
    assert(true, "addSteps: NaN endpoint doesn't throw");
} catch (e) {
    assert(false, "addSteps: NaN endpoint threw — " + e.message);
}


// =====================================================
// TEST 19: Phase 2 — scaleN math composition (manual 1:N scaling)
// =====================================================
console.log("\n=== TEST 19: scaleN math composition (Phase 2) ===");

// Baseline: 100mm graphic with no scaleN (or scaleN=1) → standard math
var baselineSettings = merge(settingsZ, { gapInner: 10 });
var baselineGeo = ZSM.Core.calculateAll(baselineSettings, boundsStd);

// scaleN=1 explicit must be identical to no scaleN
var scaleN1Geo = ZSM.Core.calculateAll(merge(baselineSettings, { scaleN: 1 }), boundsStd);
assertClose(scaleN1Geo.marksZ[0].cx, baselineGeo.marksZ[0].cx, 0.001,
    "scaleN=1 identical to baseline (no regression)");
assertClose(scaleN1Geo.marksZ[0].cy, baselineGeo.marksZ[0].cy, 0.001, "scaleN=1: BL mark Y identical");

// scaleN=2: bounds halved in doc-space (representing 2× larger reality)
// → mark offsets should be half of baseline
var scale2Geo = ZSM.Core.calculateAll(merge(baselineSettings, { scaleN: 2 }), boundsStd);
var baselineOffset = Math.abs(baselineGeo.marksZ[0].cx - boundsStd[0]);   // baseline distance from L edge
var scale2Offset   = Math.abs(scale2Geo.marksZ[0].cx - boundsStd[0]);
assertClose(scale2Offset, baselineOffset / 2, 0.01,
    "scaleN=2: mark offset half of baseline (got " + scale2Offset.toFixed(2) + " vs baseline/2=" +
    (baselineOffset / 2).toFixed(2) + ")");

// scaleN=10: 10× smaller doc-space offsets
var scale10Geo = ZSM.Core.calculateAll(merge(baselineSettings, { scaleN: 10 }), boundsStd);
var scale10Offset = Math.abs(scale10Geo.marksZ[0].cx - boundsStd[0]);
assertClose(scale10Offset, baselineOffset / 10, 0.01,
    "scaleN=10: mark offset 1/10 of baseline (got " + scale10Offset.toFixed(2) +
    " vs baseline/10=" + (baselineOffset / 10).toFixed(2) + ")");

// SUMMA mode: SUMMA_BAR_OFFSET (11.5mm) and SUMMA_BAR_WIDTH (3mm) must also scale
var summaBaselineGeo = ZSM.Core.calculateAll(settingsS, boundsStd);
var summaScale10Geo = ZSM.Core.calculateAll(merge(settingsS, { scaleN: 10 }), boundsStd);

// Bar Y offset from graphic bottom should be 1/10 in doc-space at scaleN=10
var baselineBarOffset = Math.abs(summaBaselineGeo.barS.y - boundsStd[3]);
var scaledBarOffset   = Math.abs(summaScale10Geo.barS.y - boundsStd[3]);
assertClose(scaledBarOffset, baselineBarOffset / 10, 0.01,
    "SUMMA scaleN=10: bar Y offset scales (got " + scaledBarOffset.toFixed(2) +
    " vs " + (baselineBarOffset / 10).toFixed(2) + ")");

// Bar stroke width should also scale
assertClose(summaScale10Geo.barS.w, summaBaselineGeo.barS.w / 10, 0.001,
    "SUMMA scaleN=10: bar width scales (3mm/10 → 0.3mm equivalent)");

// scaleN out of bounds — math accepts any positive number (validation lives elsewhere)
var scaleN5Geo = ZSM.Core.calculateAll(merge(baselineSettings, { scaleN: 5 }), boundsStd);
assert(isFiniteCoords(scaleN5Geo), "scaleN=5: all coords finite");

// scaleN=0 or negative — undefined behavior, but math should not crash
var scaleN0Geo;
try {
    scaleN0Geo = ZSM.Core.calculateAll(merge(baselineSettings, { scaleN: 0 }), boundsStd);
    // With (s.scaleN || 1), 0 is falsy → falls back to 1
    assertClose(scaleN0Geo.marksZ[0].cx, baselineGeo.marksZ[0].cx, 0.001,
        "scaleN=0 → falsy fallback to 1 (graceful degradation)");
} catch (e) {
    assert(false, "scaleN=0 threw — " + e.message);
}

// Composition with AI Large Canvas (SF=10): combined effective sf = 100
var origSFC = ZSM.Utils.getSF;
ZSM.Utils.getSF = function () { return 10; };
var combinedGeo = ZSM.Core.calculateAll(merge(baselineSettings, { scaleN: 10 }), boundsStd);
assert(isFiniteCoords(combinedGeo), "Composition (AI sf=10 × scaleN=10 = 100): finite coords");
var combinedOffset = Math.abs(combinedGeo.marksZ[0].cx - boundsStd[0]);
// Compose: should be 1/100 of baseline (1 × 10 × 10)
// Baseline used getSF=1, so effective sf=1. With combined we get sf=100 → 100× smaller doc-offset
assertClose(combinedOffset, baselineOffset / 100, 0.01,
    "Composition: combined offset = baseline/100 (got " + combinedOffset.toFixed(3) +
    " vs " + (baselineOffset / 100).toFixed(3) + ")");
ZSM.Utils.getSF = origSFC;


// =====================================================
// SUMMARY
// =====================================================
console.log("\n" + "=".repeat(50));
console.log("MATH TEST RESULTS: " + pass + "/" + total + " PASSED, " + fail + " FAILED");
if (fail === 0) {
    console.log("ALL TESTS PASSED");
} else {
    console.log(fail + " TEST(S) FAILED");
}
console.log("=".repeat(50));

process.exit(fail > 0 ? 1 : 0);
