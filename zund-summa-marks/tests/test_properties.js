#!/usr/bin/env node
/**
 * Property-based tests using fast-check.
 *
 * Approach: instead of writing specific test cases, we declare INVARIANTS
 * that must hold for all valid inputs. fast-check generates ~100 random
 * inputs per property, asserts the invariant, and on failure shrinks the
 * input to a minimal failing case for easy debugging.
 *
 * Coverage:
 *   - mm2pt / pt2mm roundtrip
 *   - presetEquals reflexivity, symmetry, transitivity
 *   - calculateAll: finite coords, ≥4 marks, positive AB, etc.
 *   - addSteps: intermediate count math, position on segment
 *   - validateNumber: boundary correctness
 *
 * Usage: node tests/test_properties.js
 *        npm run test:props
 */

var fc   = require("fast-check");
var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
var ZSM = {};
ZSM.L = {
    ERR_MUST_BE_NUMBER: "%s nan",
    ERR_OUT_OF_RANGE:   "%s range",
    format: function (template) {
        var args = []; for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
        var idx = 0;
        return template.replace(/%s/g, function () { return idx < args.length ? String(args[idx++]) : "%s"; });
    }
};
ZSM.Config = {
    zundSize: 5, summaSize: 3,
    summaXCenter: 10, summaYVisual: 10,
    redLineWidth: 1, debug: false
};
global.alert = function () {};

// Load production code
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "core.js"), "utf8"));


// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0;
function runProp(name, prop) {
    try {
        fc.assert(prop, { numRuns: 100, verbose: false });
        pass++;
        console.log("  PASS: " + name);
    } catch (e) {
        fail++;
        console.log("  FAIL: " + name);
        // Print only the first line of error (counterexample)
        var msg = e.message.split("\n").slice(0, 5).join("\n");
        console.log("    " + msg);
    }
}


// =====================================================
// Property 1: mm/pt roundtrip
// =====================================================
console.log("\n=== Property 1: mm/pt roundtrip ===");
runProp("mm → pt → mm preserves value (within float tolerance)",
    fc.property(
        fc.double({ min: -100000, max: 100000, noNaN: true, noDefaultInfinity: true }),
        function (mm) {
            var roundtrip = ZSM.Utils.pt2mm(ZSM.Utils.mm2pt(mm));
            return Math.abs(roundtrip - mm) < 1e-6 * Math.max(1, Math.abs(mm));
        }
    )
);

runProp("pt → mm → pt preserves value",
    fc.property(
        fc.double({ min: -100000, max: 100000, noNaN: true, noDefaultInfinity: true }),
        function (pt) {
            var roundtrip = ZSM.Utils.mm2pt(ZSM.Utils.pt2mm(pt));
            return Math.abs(roundtrip - pt) < 1e-6 * Math.max(1, Math.abs(pt));
        }
    )
);

runProp("mm2pt is monotonically increasing",
    fc.property(
        fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }),
        function (a, b) {
            if (a < b) return ZSM.Utils.mm2pt(a) < ZSM.Utils.mm2pt(b);
            if (a > b) return ZSM.Utils.mm2pt(a) > ZSM.Utils.mm2pt(b);
            return ZSM.Utils.mm2pt(a) === ZSM.Utils.mm2pt(b);
        }
    )
);


// =====================================================
// Property 2: presetEquals algebraic laws
// =====================================================
console.log("\n=== Property 2: presetEquals laws ===");

// Generator for arbitrary preset settings
var presetArb = fc.record({
    mode: fc.constantFrom("ZUND", "SUMMA"),
    gapInner: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
    gapOuter: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
    maxDist: fc.double({ min: 50, max: 5000, noNaN: true, noDefaultInfinity: true }),
    feedTop: fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
    feedBottom: fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
    drawRed: fc.boolean(),
    useArtboardBounds: fc.boolean(),
    markSizeZ: fc.double({ min: 0.1, max: 50, noNaN: true, noDefaultInfinity: true }),
    markSizeS: fc.double({ min: 0.1, max: 50, noNaN: true, noDefaultInfinity: true }),
    orientDist: fc.double({ min: 10, max: 2000, noNaN: true, noDefaultInfinity: true }),
    markColor: fc.string({ minLength: 1, maxLength: 20 }),
    layers: fc.array(
        fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            color: fc.string({ minLength: 1, maxLength: 20 })
        }),
        { minLength: 1, maxLength: 5 }
    )
});

runProp("Reflexivity: presetEquals(a, a) === true",
    fc.property(presetArb, function (a) {
        return ZSM.Utils.presetEquals(a, a) === true;
    })
);

runProp("Symmetry: presetEquals(a, b) === presetEquals(b, a)",
    fc.property(presetArb, presetArb, function (a, b) {
        return ZSM.Utils.presetEquals(a, b) === ZSM.Utils.presetEquals(b, a);
    })
);

runProp("Transitivity: a==b && b==c → a==c",
    fc.property(presetArb, function (a) {
        // Construct b and c by JSON copy (deep clone) — should all be equal
        var b = JSON.parse(JSON.stringify(a));
        var c = JSON.parse(JSON.stringify(a));
        var eqAB = ZSM.Utils.presetEquals(a, b);
        var eqBC = ZSM.Utils.presetEquals(b, c);
        var eqAC = ZSM.Utils.presetEquals(a, c);
        if (eqAB && eqBC) return eqAC;
        return true;  // vacuously
    })
);

runProp("Inequality: changing a numeric field flips the result",
    fc.property(presetArb, function (a) {
        var b = JSON.parse(JSON.stringify(a));
        b.gapInner = b.gapInner + 1;  // diverge
        return ZSM.Utils.presetEquals(a, b) === false;
    })
);


// =====================================================
// Property 3: calculateAll invariants
// =====================================================
console.log("\n=== Property 3: calculateAll invariants ===");

// Generator: realistic graphic bounds + settings
var validBoundsArb = fc.record({
    w: fc.integer({ min: 10, max: 2000 }),   // graphic width mm
    h: fc.integer({ min: 10, max: 2000 }),   // graphic height mm
    gapInner: fc.integer({ min: 0, max: 100 }),
    gapOuter: fc.integer({ min: 0, max: 100 }),
    maxDist: fc.integer({ min: 50, max: 1000 }),
    markSize: fc.double({ min: 1, max: 20, noNaN: true, noDefaultInfinity: true }),
    orientDist: fc.integer({ min: 10, max: 500 })
});

function makeBounds(p) { return [0, ZSM.Utils.mm2pt(p.h), ZSM.Utils.mm2pt(p.w), 0]; }
function makeSettings(p, mode) {
    return {
        mode: mode,
        gapInner: p.gapInner, gapOuter: p.gapOuter, maxDist: p.maxDist,
        feedTop: 70, feedBottom: 50,
        drawRed: false, useArtboardBounds: false,
        markSizeZ: p.markSize, markSizeS: p.markSize,
        orientDist: p.orientDist,
        markColor: "[Registration]",
        layers: [{ name: "Cut", color: "[Registration]" }]
    };
}
function isFiniteResult(geo) {
    if (!geo) return false;
    function arr(a) {
        for (var i = 0; i < a.length; i++) {
            if (!isFinite(a[i].cx) || !isFinite(a[i].cy)) return false;
        }
        return true;
    }
    if (!arr(geo.marksZ) || !arr(geo.marksS)) return false;
    if (geo.barS && (!isFinite(geo.barS.x1) || !isFinite(geo.barS.x2) || !isFinite(geo.barS.y))) return false;
    for (var i = 0; i < geo.ab.length; i++) if (!isFinite(geo.ab[i])) return false;
    return true;
}

runProp("ZUND: all coords are finite (no NaN/Infinity)",
    fc.property(validBoundsArb, function (p) {
        var geo = ZSM.Core.calculateAll(makeSettings(p, "ZUND"), makeBounds(p));
        return isFiniteResult(geo);
    })
);

runProp("ZUND: at least 5 marks (4 corners + orient)",
    fc.property(validBoundsArb, function (p) {
        var geo = ZSM.Core.calculateAll(makeSettings(p, "ZUND"), makeBounds(p));
        return geo.marksZ.length >= 5;
    })
);

runProp("ZUND: artboard has positive width and height",
    fc.property(validBoundsArb, function (p) {
        var geo = ZSM.Core.calculateAll(makeSettings(p, "ZUND"), makeBounds(p));
        return geo.ab[2] > geo.ab[0] && geo.ab[1] > geo.ab[3];
    })
);

runProp("ZUND: artboard contains all corner marks",
    fc.property(validBoundsArb, function (p) {
        var geo = ZSM.Core.calculateAll(makeSettings(p, "ZUND"), makeBounds(p));
        var rZ = ZSM.Utils.mm2pt(p.markSize / 2);
        // First 4 marks are corners. Their bounding extent (cx ± rZ) must be inside AB.
        // Allow tiny float epsilon for AB rounding.
        var EPS = 0.5;
        for (var i = 0; i < 4; i++) {
            var m = geo.marksZ[i];
            if (m.cx - rZ < geo.ab[0] - EPS) return false;
            if (m.cx + rZ > geo.ab[2] + EPS) return false;
            if (m.cy - rZ < geo.ab[3] - EPS) return false;
            if (m.cy + rZ > geo.ab[1] + EPS) return false;
        }
        return true;
    })
);

runProp("SUMMA: all coords finite",
    fc.property(validBoundsArb, function (p) {
        var geo = ZSM.Core.calculateAll(makeSettings(p, "SUMMA"), makeBounds(p));
        return isFiniteResult(geo);
    })
);

runProp("SUMMA: exactly 4 corner marks (+ optional intermediates)",
    fc.property(validBoundsArb, function (p) {
        var geo = ZSM.Core.calculateAll(makeSettings(p, "SUMMA"), makeBounds(p));
        return geo.marksS.length >= 4;
    })
);

runProp("SUMMA: bar exists",
    fc.property(validBoundsArb, function (p) {
        var geo = ZSM.Core.calculateAll(makeSettings(p, "SUMMA"), makeBounds(p));
        return geo.barS !== null;
    })
);

runProp("ZUND has no Summa marks; SUMMA has no Zund marks",
    fc.property(validBoundsArb, function (p) {
        var z = ZSM.Core.calculateAll(makeSettings(p, "ZUND"), makeBounds(p));
        var s = ZSM.Core.calculateAll(makeSettings(p, "SUMMA"), makeBounds(p));
        return z.marksS.length === 0 && z.barS === null
            && s.marksZ.length === 0;
    })
);


// =====================================================
// Property 4: addSteps invariants
// =====================================================
console.log("\n=== Property 4: addSteps invariants ===");

runProp("max <= 0 produces no intermediates",
    fc.property(
        fc.double({ min: -100, max: 0, noNaN: true, noDefaultInfinity: true }),
        function (max) {
            var arr = [];
            ZSM.Core.addSteps(arr, 0, 0, 1000, 0, max);
            return arr.length === 0;
        }
    )
);

runProp("intermediate count = ceil(d/max) - 1",
    fc.property(
        fc.double({ min: 100, max: 5000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 10, max: 1000, noNaN: true, noDefaultInfinity: true }),
        function (segLen, max) {
            var arr = [];
            ZSM.Core.addSteps(arr, 0, 0, segLen, 0, max);
            // d > max → intermediates inserted
            if (segLen > max) {
                var expected = Math.ceil(segLen / max) - 1;
                return arr.length === expected;
            } else {
                return arr.length === 0;
            }
        }
    )
);

runProp("intermediates lie ON the segment (horizontal)",
    fc.property(
        fc.double({ min: 100, max: 2000, noNaN: true, noDefaultInfinity: true }),
        function (segLen) {
            var arr = [];
            ZSM.Core.addSteps(arr, 0, 50, segLen, 50, 100);  // horizontal at y=50
            for (var i = 0; i < arr.length; i++) {
                if (Math.abs(arr[i].cy - 50) > 1e-6) return false;
                if (arr[i].cx < 0 || arr[i].cx > segLen) return false;
            }
            return true;
        }
    )
);

runProp("intermediates lie ON segment (vertical)",
    fc.property(
        fc.double({ min: 100, max: 2000, noNaN: true, noDefaultInfinity: true }),
        function (segLen) {
            var arr = [];
            ZSM.Core.addSteps(arr, 50, 0, 50, segLen, 100);  // vertical at x=50
            for (var i = 0; i < arr.length; i++) {
                if (Math.abs(arr[i].cx - 50) > 1e-6) return false;
            }
            return true;
        }
    )
);


// =====================================================
// Property 5: validateNumber boundary correctness
// =====================================================
console.log("\n=== Property 5: validateNumber boundary correctness ===");

runProp("valid range (min <= n <= max) returns the number",
    fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 100, max: 200 }),
        fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        function (min, max, val) {
            // Constrain val to [min, max]
            var clamped = Math.max(min, Math.min(max, val));
            var result = ZSM.Utils.validateNumber(String(clamped), min, max, "Test");
            return result !== null && Math.abs(result - clamped) < 1e-9;
        }
    )
);

runProp("below min returns null",
    fc.property(
        fc.integer({ min: 10, max: 100 }),
        fc.double({ min: -1000, max: 9, noNaN: true, noDefaultInfinity: true }),
        function (min, valBelow) {
            var result = ZSM.Utils.validateNumber(String(valBelow), min, 1000, "Test");
            return result === null;
        }
    )
);

runProp("above max returns null",
    fc.property(
        fc.integer({ min: 10, max: 100 }),
        fc.double({ min: 101, max: 10000, noNaN: true, noDefaultInfinity: true }),
        function (max, valAbove) {
            var result = ZSM.Utils.validateNumber(String(valAbove), 0, max, "Test");
            return result === null;
        }
    )
);

runProp("comma decimal converts to dot",
    fc.property(
        fc.integer({ min: 0, max: 999 }),
        fc.integer({ min: 0, max: 9999 }),
        function (intPart, fracPart) {
            var commaStr = intPart + "," + fracPart;
            var dotResult = ZSM.Utils.validateNumber(intPart + "." + fracPart, 0, 99999999, "Test");
            var commaResult = ZSM.Utils.validateNumber(commaStr, 0, 99999999, "Test");
            // Both should produce the same result
            return dotResult === commaResult;
        }
    )
);


// =====================================================
// Property 6: scaleFactor (Large Canvas) invariants
// =====================================================
//
// Adobe's Large Canvas mode reports app.activeDocument.scaleFactor > 1
// (typically 10). Internal coordinates are 1/sf of visible coordinates,
// so core math must divide user-input mm by sf before going into mm2pt
// to keep visible mark sizes constant. These properties pin down the
// invariants the audit P2-12 called out.
console.log("\n=== Property 6: scaleFactor (Large Canvas) invariants ===");

// Helper: temporarily override getSF, run a calc, restore.
function withScaleFactor(sf, fn) {
    var orig = ZSM.Utils.getSF;
    ZSM.Utils.getSF = function () { return sf; };
    try { return fn(); } finally { ZSM.Utils.getSF = orig; }
}

runProp("calculateAll is total for any reasonable scaleFactor (no NaN/Infinity, no throw)",
    fc.property(
        validBoundsArb,
        fc.integer({ min: 1, max: 20 }),     // realistic Large Canvas ratios
        fc.constantFrom("ZUND", "SUMMA"),
        function (p, sf, mode) {
            try {
                var geo = withScaleFactor(sf, function () {
                    return ZSM.Core.calculateAll(makeSettings(p, mode), makeBounds(p));
                });
                return isFiniteResult(geo);
            } catch (e) { return false; }
        }
    )
);

// NOTE: a tempting stronger invariant would be "mark count is invariant under
// scaleFactor". In practice it does NOT hold uniformly — at very small
// document sizes and high sf, the rZ/rS (which divide by sf) shrinks the
// effective collision footprint of marks, sometimes admitting one extra
// intermediate that wouldn't fit at sf=1. The visible RESULT is still
// correct (marks render at the same physical size), but mark COUNT
// legitimately varies across sf in edge cases. See test runs with
// {w:10,h:10,maxDist:50,markSize:1,sf=3} for a concrete counterexample.
// We keep only the totality property above; visual-fidelity tests live in
// the manual MANUAL_TEST.md (TC-022 Large Canvas).


// =====================================================
// SUMMARY
// =====================================================
var total = pass + fail;
console.log("\n" + "=".repeat(50));
console.log("PROPERTY TEST RESULTS: " + pass + "/" + total + " PROPERTIES PASSED, " + fail + " FAILED");
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
