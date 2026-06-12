# GM v5.0.0 — Corner Zones + Path Marks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add corner-zone variable spacing (N marks at pitch A from every corner, preferred pitch B in between) and mark placement along a selected path (corners mandatory, spans filled corner-to-corner), unified over one "circuit" abstraction, plus a dialog typography pass — shipping as v5.0.0.

**Architecture:** Every placement target normalizes to a *circuit* (sequence of line/cubic-Bézier segments + corner set). One pure distribution algorithm in `GM.Core` serves both artboard edges (1 straight segment, 2 corners) and paths (K segments, corners detected by tangent angle). DOM stays in `GM.Illustrator`; core remains Node-testable. Spec: `docs/superpowers/specs/2026-06-12-gm-variable-spacing-path-marks-design.md`.

**Tech Stack:** Adobe ExtendScript (ES3 — no `let`/`const`/arrows/template literals/ES5 array methods), ScriptUI, plain-Node test suite (`tests/run_all.sh`), bash build (`tools/build.sh`).

**Working dir:** `Sandbox/_incubator/grommet-marks/` (git root is `Sandbox/_incubator/`). All paths below relative to the project dir. Run `npm run verify` = build + all tests.

**ES3 reminders for every code block:** `var` only, `function () {}` only, string concat only, `for` loops only, `hasOwnProperty` guard in `for…in`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/constants.js` | Modify | `CORNER_ANGLE_MIN`, `SAMPLES_PER_SEGMENT`, `MODE` keys, `MAX_MARKS`, VERSION 5.0.0 |
| `src/config.js` | Modify | New defaults: `placementMode`, `cornerZone`, `pathDist` |
| `src/locale.js` | Modify | New EN/CS strings (mode panel, path panel, zones, errors) |
| `src/core.js` | Modify | Circuit math: `bezierPoint`, `buildCircuit`, `pointAtDistance`, `detectCorners`, `distributeOnSpan`, `distributeOnCircuit` |
| `src/lib/validation.js` | Modify | Rules `cornerCount`/`cornerPitch`/`pathNumber`/`pathSpacing` + mode-aware `validate` |
| `src/lib/utils.js` | Modify | `presetEquals` new keys |
| `src/illustrator.js` | Modify | `getSelectedPathInfo()` selection guard + extraction |
| `src/ui.js` | Modify | Mode radio panel, Path panel, Corner-zones panel, gather/apply, state-driven disabling, typography pass |
| `src/main.js` | Modify | Mode branch in `run()`/`process()`; artboard edges through `distributeOnSpan` |
| `tests/test_core_circuit.js` | Create | Circuit math suite (regression equivalence incl.) |
| `tests/test_core_math.js` | Modify | Bézier length/point tests |
| `tests/test_validation.js` | Modify | New rules/structural checks |
| `tests/test_storage_migrations.js` | Modify | v4→v5 forward-fill |
| `tests/test_ui_dialog.js` | Modify | Mode switching, new gather fields, state-driven disables |
| `tests/run_all.sh` | Modify | Register `test_core_circuit` |
| `package.json`, `README.md` | Modify | Version 5.0.0, changelog |
| `docs/TEST_PLAN.md` | Modify | Manual P0 cases for path mode |

---

### Task 1: Constants, config defaults, locale strings

**Files:**
- Modify: `src/constants.js`
- Modify: `src/config.js`
- Modify: `src/locale.js`
- Test: `tests/test_storage_migrations.js` (forward-fill assertions)

- [ ] **Step 1.1: Write failing forward-fill test**

Append to `tests/test_storage_migrations.js` before the final summary block (follow the file's existing test-block style):

```javascript
// ===== TEST: v5 forward-fill (placementMode, cornerZone, pathDist) =====
console.log("--- v5 forward-fill ---");
(function () {
    writeMockSettings(JSON.stringify({
        activePreset: "[Default]",
        presets: { "[Default]": legacyV3Preset() }
    }));
    var data = GM.Storage.load();
    var p = data.presets["[Default]"];
    assert(p.placementMode === "artboard", "forward-fill: placementMode added");
    assert(p.cornerZone && p.cornerZone.enabled === false, "forward-fill: cornerZone.enabled");
    assert(p.cornerZone.count === 5, "forward-fill: cornerZone.count");
    assert(p.cornerZone.pitch === 100, "forward-fill: cornerZone.pitch");
    assert(p.pathDist && p.pathDist.useNumber === false, "forward-fill: pathDist.useNumber");
    assert(p.pathDist.spacing === 105, "forward-fill: pathDist.spacing");
})();
```

(`writeMockSettings` / `legacyV3Preset` — use the existing helpers in that file; if named differently, adapt to the file's actual helper names, they exist for every other migration test.)

- [ ] **Step 1.2: Run test, verify it fails**

Run: `node tests/test_storage_migrations.js`
Expected: FAIL on `placementMode added` (forward-fill source `GM.Config.getDefaults()` lacks the key).

- [ ] **Step 1.3: Add constants**

In `src/constants.js`, inside `GM.CONSTANTS` (after `SENTINEL_CREATE`), add:

```javascript
    // Placement modes
    MODE_ARTBOARD: "artboard",
    MODE_PATH: "path",

    // Path geometry
    CORNER_ANGLE_MIN: 15,      // deg — tangent deviation above this = corner
    SAMPLES_PER_SEGMENT: 64,   // arc-length table resolution per Bézier
    MAX_MARKS: 9999,           // freeze guard per circuit (matches calcPositions cap)
```

And bump `VERSION: "4.2.1"` → `VERSION: "5.0.0"`.

- [ ] **Step 1.4: Add config defaults**

In `src/config.js`, in the object returned by `getDefaults()` (after `strokeWeight: 1`), add:

```javascript
            strokeWeight: 1,
            placementMode: GM.CONSTANTS.MODE_ARTBOARD,
            cornerZone: { enabled: false, count: 5, pitch: 100 },
            pathDist: { useNumber: false, number: 24, spacing: 105 }
```

- [ ] **Step 1.5: Add locale strings**

In `src/locale.js` add to **both** tables (EN shown; CS equivalent below):

```javascript
            // Placement panel
            PLACEMENT_PANEL: "Placement",
            MODE_ARTBOARD: "Artboard edges",
            MODE_PATH: "Selected path",
            TIP_MODE_PATH_DISABLED: "Select a path in the document first, then run the script again.",

            // Path panel
            PATH_PANEL: "Path",
            PATH_INFO_CLOSED: "Closed path",
            PATH_INFO_OPEN: "Open path",
            PATH_INFO_CORNERS: "%s corners",
            PATH_INFO_NO_CORNERS: "no corners",
            PATH_INFO_LENGTH: "perimeter ≈ %s %s",
            PATH_OFFSET_NOTE: "Marks sit centred on the path. For an inset from the material edge, offset the path first (Object ▸ Path ▸ Offset Path…).",
            TIP_PATH_COUNT_DISABLED: "A path with corners follows the spacing — the mark count emerges from the span lengths.",

            // Corner zones panel
            ZONES_PANEL: "Corner zones",
            ZONES_ENABLE: "Densify at corners",
            ZONES_COUNT: "Count:",
            ZONES_PITCH: "Pitch:",
            TIP_ZONES: "First N marks from every corner use this pitch; the rest uses the edge/path spacing.",
            TIP_ZONES_NO_CORNERS: "The selected path has no corners — marks are distributed evenly along the whole perimeter.",

            // Mode/selection errors
            ERR_PATH_NO_SELECTION: "Nothing is selected. Select one path and run the script again.",
            ERR_PATH_NOT_A_PATH: "The selection is not a simple path. Release compound paths first: Object ▸ Compound Path ▸ Release.",
            ERR_PATH_TOO_SHORT: "The selected path has fewer than 2 points.",
            ERR_PATH_GONE: "The selected path is no longer available — select it again and rerun.",
            WARN_MODE_FALLBACK: "The preset uses Selected path mode, but no path is selected — switched to Artboard edges.",
```

CS table:

```javascript
            // Placement panel
            PLACEMENT_PANEL: "Umístění",
            MODE_ARTBOARD: "Hrany artboardu",
            MODE_PATH: "Vybraná cesta",
            TIP_MODE_PATH_DISABLED: "Nejdřív vyberte cestu v dokumentu a spusťte skript znovu.",

            // Path panel
            PATH_PANEL: "Cesta",
            PATH_INFO_CLOSED: "Uzavřená cesta",
            PATH_INFO_OPEN: "Otevřená cesta",
            PATH_INFO_CORNERS: "%s rohů",
            PATH_INFO_NO_CORNERS: "bez rohů",
            PATH_INFO_LENGTH: "obvod ≈ %s %s",
            PATH_OFFSET_NOTE: "Značky leží středem na cestě. Potřebujete-li odsazení od kraje, posuňte si cestu předem (Objekt ▸ Cesta ▸ Posunout cestu…).",
            TIP_PATH_COUNT_DISABLED: "Cesta s rohy se řídí roztečí — počet značek vyplyne z délek úseků.",

            // Corner zones panel
            ZONES_PANEL: "Rohové zóny",
            ZONES_ENABLE: "Zhustit u rohů",
            ZONES_COUNT: "Počet:",
            ZONES_PITCH: "Rozteč:",
            TIP_ZONES: "Prvních N značek od každého rohu použije tuto rozteč; zbytek jede podle rozteče hrany/cesty.",
            TIP_ZONES_NO_CORNERS: "Vybraná cesta nemá rohy — značky se rozmístí rovnoměrně po obvodu.",

            // Mode/selection errors
            ERR_PATH_NO_SELECTION: "Nic není vybráno. Vyberte jednu cestu a spusťte skript znovu.",
            ERR_PATH_NOT_A_PATH: "Výběr není jednoduchá cesta. Složenou cestu nejdřív rozdělte: Objekt ▸ Složená cesta ▸ Uvolnit.",
            ERR_PATH_TOO_SHORT: "Vybraná cesta má méně než 2 body.",
            ERR_PATH_GONE: "Vybraná cesta už není dostupná — vyberte ji znovu a spusťte skript.",
            WARN_MODE_FALLBACK: "Předvolba používá režim Vybraná cesta, ale žádná cesta není vybraná — přepnuto na Hrany artboardu.",
```

(Source files are UTF-8 without BOM; literal Czech characters are fine — escapes above only protect this plan against copy/paste encoding. Match the file's existing style: the rest of `locale.js` uses literal diacritics, so paste the literal form.)

- [ ] **Step 1.6: Sync version guard + run tests**

`tools/build.sh` reads VERSION from `package.json` and compares with `constants.js`. Bump `package.json` `"version": "4.2.1"` → `"5.0.0"` now so the build guard stays green for all later tasks.

Run: `node tests/test_storage_migrations.js`
Expected: PASS (forward-fill picks new defaults).
Run: `npm run verify`
Expected: build OK, all suites PASS.

- [ ] **Step 1.7: Commit**

```bash
git add src/constants.js src/config.js src/locale.js package.json tests/test_storage_migrations.js dist/
git commit -m "feat(grommet-marks): v5 scaffolding — constants, defaults, locale for modes/zones/path"
```

---

### Task 2: Core — Bézier point + circuit building + pointAtDistance

**Files:**
- Modify: `src/core.js`
- Test: `tests/test_core_math.js`

- [ ] **Step 2.1: Write failing tests**

Append to `tests/test_core_math.js` (it loads `constants.js` + `core.js`; follow its existing assert style):

```javascript
// ===== TEST: bezierPoint + buildCircuit + pointAtDistance =====
console.log("--- Core.buildCircuit ---");
(function () {
    // Straight segment 0,0 -> 100,0 (handles on anchors = straight)
    var straight = { p0: [0, 0], p1: [0, 0], p2: [100, 0], p3: [100, 0] };
    var c = GM.Core.buildCircuit([straight], false);
    assert(Math.abs(c.totalLen - 100) < 1e-6, "straight segment length exact");

    var mid = GM.Core.pointAtDistance(c, 50);
    assert(Math.abs(mid[0] - 50) < 1e-3 && Math.abs(mid[1]) < 1e-3, "pointAtDistance midpoint");

    var end = GM.Core.pointAtDistance(c, 100);
    assert(Math.abs(end[0] - 100) < 1e-3, "pointAtDistance endpoint");

    // Circle of radius 100 from 4 cubic segments, kappa = 0.5522847498
    var k = 55.22847498;
    var circle = [
        { p0: [100, 0],  p1: [100, k],   p2: [k, 100],   p3: [0, 100] },
        { p0: [0, 100],  p1: [-k, 100],  p2: [-100, k],  p3: [-100, 0] },
        { p0: [-100, 0], p1: [-100, -k], p2: [-k, -100], p3: [0, -100] },
        { p0: [0, -100], p1: [k, -100],  p2: [100, -k],  p3: [100, 0] }
    ];
    var cc = GM.Core.buildCircuit(circle, true);
    var expected = 2 * Math.PI * 100;
    assert(Math.abs(cc.totalLen - expected) / expected < 0.001,
        "circle perimeter within 0.1% of 2*pi*r (got " + cc.totalLen + ")");

    // Monotonie: rostoucí s -> rostoucí úhel po kružnici (první kvadrant)
    var p1 = GM.Core.pointAtDistance(cc, expected * 0.10);
    var p2 = GM.Core.pointAtDistance(cc, expected * 0.20);
    assert(p1[1] > 0 && p2[1] > p1[1] - 1e-9 ? true : (p2[0] < p1[0]),
        "pointAtDistance advances along the circle");

    // Wrap: s == totalLen vrátí start (uzavřený okruh)
    var w = GM.Core.pointAtDistance(cc, expected);
    assert(Math.abs(w[0] - 100) < 0.5 && Math.abs(w[1]) < 0.5, "closed wrap to start");
})();
```

- [ ] **Step 2.2: Run, verify fail**

Run: `node tests/test_core_math.js`
Expected: FAIL — `GM.Core.buildCircuit is not a function`.

- [ ] **Step 2.3: Implement in `src/core.js`**

Add inside `GM.Core` (after `calcPositions`), ES3:

```javascript
    /**
     * Evaluates a cubic Bezier at parameter t.
     * Segment: {p0,p1,p2,p3} — each [x, y]. Straight lines are encoded as
     * p1 === p0 and p2 === p3 (Illustrator anchors without handles).
     * @param {Object} seg - Segment.
     * @param {number} t - Parameter 0..1.
     * @returns {Array<number>} [x, y]
     */
    bezierPoint: function (seg, t) {
        var u = 1 - t;
        var a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        return [
            a * seg.p0[0] + b * seg.p1[0] + c * seg.p2[0] + d * seg.p3[0],
            a * seg.p0[1] + b * seg.p1[1] + c * seg.p2[1] + d * seg.p3[1]
        ];
    },

    /**
     * Builds a circuit: samples every segment into a cumulative arc-length
     * table so positions along the circuit can be resolved by distance.
     * @param {Array<Object>} segments - [{p0,p1,p2,p3}, ...] in draw order.
     * @param {boolean} closed - True for a closed path (wraps around).
     * @returns {Object} {segments:[{seg, len, pts}], totalLen, closed}
     */
    buildCircuit: function (segments, closed) {
        var n = GM.CONSTANTS.SAMPLES_PER_SEGMENT;
        var out = [];
        var total = 0;
        for (var i = 0; i < segments.length; i++) {
            var seg = segments[i];
            var pts = [];
            var len = 0;
            var prev = GM.Core.bezierPoint(seg, 0);
            pts.push({ s: 0, p: prev });
            for (var j = 1; j <= n; j++) {
                var cur = GM.Core.bezierPoint(seg, j / n);
                var dx = cur[0] - prev[0], dy = cur[1] - prev[1];
                len += Math.sqrt(dx * dx + dy * dy);
                pts.push({ s: len, p: cur });
                prev = cur;
            }
            out.push({ seg: seg, len: len, pts: pts });
            total += len;
        }
        return { segments: out, totalLen: total, closed: closed };
    },

    /**
     * Resolves the point at arc distance s along the circuit (linear
     * interpolation between samples; closed circuits wrap).
     * @param {Object} circuit - From buildCircuit.
     * @param {number} s - Distance 0..totalLen.
     * @returns {Array<number>} [x, y]
     */
    pointAtDistance: function (circuit, s) {
        if (circuit.closed) {
            s = s % circuit.totalLen;
            if (s < 0) s += circuit.totalLen;
        } else {
            if (s < 0) s = 0;
            if (s > circuit.totalLen) s = circuit.totalLen;
        }
        for (var i = 0; i < circuit.segments.length; i++) {
            var sg = circuit.segments[i];
            if (s > sg.len) { s -= sg.len; continue; }
            // Binary search in the sample table
            var pts = sg.pts, lo = 0, hi = pts.length - 1;
            while (hi - lo > 1) {
                var midI = (lo + hi) >> 1;
                if (pts[midI].s < s) lo = midI; else hi = midI;
            }
            var a = pts[lo], b = pts[hi];
            var span = b.s - a.s;
            var f = span > 0 ? (s - a.s) / span : 0;
            return [a.p[0] + (b.p[0] - a.p[0]) * f, a.p[1] + (b.p[1] - a.p[1]) * f];
        }
        var last = circuit.segments[circuit.segments.length - 1];
        return last.pts[last.pts.length - 1].p;
    },
```

- [ ] **Step 2.4: Run tests**

Run: `node tests/test_core_math.js`
Expected: PASS.

- [ ] **Step 2.5: Commit**

```bash
git add src/core.js tests/test_core_math.js
git commit -m "feat(grommet-marks): circuit core — bezierPoint, buildCircuit, pointAtDistance"
```

---

### Task 3: Core — corner detection

**Files:**
- Modify: `src/core.js`
- Create: `tests/test_core_circuit.js`
- Modify: `tests/run_all.sh`

- [ ] **Step 3.1: Create failing test file**

Create `tests/test_core_circuit.js` (header style per existing test files):

```javascript
#!/usr/bin/env node
/**
 * GM.Core circuit suite: corner detection + distribution.
 * Pure math — no DOM, no ScriptUI.
 *
 * Usage: node tests/test_core_circuit.js
 */
var fs = require("fs");
var path = require("path");
var GM = {};
function src(rel) { return fs.readFileSync(path.join(__dirname, "..", "src", rel), "utf8"); }
eval(src("constants.js"));
eval(src("core.js"));

var pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}

function straightSeg(ax, ay, bx, by) {
    return { p0: [ax, ay], p1: [ax, ay], p2: [bx, by], p3: [bx, by] };
}

// ===== TEST: detectCorners =====
console.log("--- Core.detectCorners ---");
(function () {
    // Square 100x100 — 4 corners
    var sq = [
        straightSeg(0, 0, 100, 0), straightSeg(100, 0, 100, 100),
        straightSeg(100, 100, 0, 100), straightSeg(0, 100, 0, 0)
    ];
    var c1 = GM.Core.detectCorners(sq, true, 15);
    assert(c1.length === 4, "square has 4 corners (got " + c1.length + ")");

    // Triangle — 3 corners
    var tri = [
        straightSeg(0, 0, 100, 0), straightSeg(100, 0, 50, 80), straightSeg(50, 80, 0, 0)
    ];
    assert(GM.Core.detectCorners(tri, true, 15).length === 3, "triangle has 3 corners");

    // Circle (4 smooth Beziers) — 0 corners
    var k = 55.22847498;
    var circle = [
        { p0: [100, 0],  p1: [100, k],   p2: [k, 100],   p3: [0, 100] },
        { p0: [0, 100],  p1: [-k, 100],  p2: [-100, k],  p3: [-100, 0] },
        { p0: [-100, 0], p1: [-100, -k], p2: [-k, -100], p3: [0, -100] },
        { p0: [0, -100], p1: [k, -100],  p2: [100, -k],  p3: [100, 0] }
    ];
    assert(GM.Core.detectCorners(circle, true, 15).length === 0, "circle has 0 corners");

    // Open polyline — endpoints are corners by definition + 1 inner bend
    var open = [straightSeg(0, 0, 100, 0), straightSeg(100, 0, 100, 100)];
    var c4 = GM.Core.detectCorners(open, false, 15);
    assert(c4.length === 3, "open polyline: 2 endpoints + 1 bend (got " + c4.length + ")");
    assert(c4[0] === 0, "open: first anchor is a corner");
})();

console.log("\nResults: " + pass + "/" + (pass + fail) + " passed, " + fail + " failed");
if (fail > 0) process.exit(1);
```

- [ ] **Step 3.2: Register suite + verify fail**

In `tests/run_all.sh`, add `test_core_circuit` to the suite list (same pattern as the other entries, after `test_core_math`).

Run: `node tests/test_core_circuit.js`
Expected: FAIL — `detectCorners is not a function`.

- [ ] **Step 3.3: Implement `detectCorners` in `src/core.js`**

```javascript
    /**
     * Detects corner anchors by tangent deviation. An anchor is a corner when
     * the angle between the incoming and outgoing tangents exceeds
     * minAngleDeg. Geometric truth — independent of Illustrator PointType
     * (which does not guarantee visual sharpness).
     *
     * Returns anchor indices: anchor i joins segments[i-1] -> segments[i]
     * (anchor 0 = start of segments[0]). Open circuits: both endpoints are
     * corners by definition.
     *
     * @param {Array<Object>} segments - [{p0,p1,p2,p3}, ...]
     * @param {boolean} closed - Closed path flag.
     * @param {number} minAngleDeg - Threshold (GM.CONSTANTS.CORNER_ANGLE_MIN).
     * @returns {Array<number>} Sorted corner anchor indices.
     */
    detectCorners: function (segments, closed, minAngleDeg) {
        var n = segments.length;
        var corners = [];
        var minRad = minAngleDeg * Math.PI / 180;

        // Outgoing tangent at segment start; falls back to the chord when the
        // handle collapses onto the anchor (degenerate handle).
        function outTangent(seg) {
            var dx = seg.p1[0] - seg.p0[0], dy = seg.p1[1] - seg.p0[1];
            if (dx === 0 && dy === 0) { dx = seg.p3[0] - seg.p0[0]; dy = seg.p3[1] - seg.p0[1]; }
            return [dx, dy];
        }
        function inTangent(seg) {
            var dx = seg.p3[0] - seg.p2[0], dy = seg.p3[1] - seg.p2[1];
            if (dx === 0 && dy === 0) { dx = seg.p3[0] - seg.p0[0]; dy = seg.p3[1] - seg.p0[1]; }
            return [dx, dy];
        }
        function deviation(a, b) {
            var cross = a[0] * b[1] - a[1] * b[0];
            var dot = a[0] * b[0] + a[1] * b[1];
            return Math.abs(Math.atan2(cross, dot));
        }

        for (var i = 0; i < n; i++) {
            var isEndpoint = !closed && i === 0;
            if (isEndpoint) { corners.push(i); continue; }
            var prev = segments[(i - 1 + n) % n];
            if (deviation(inTangent(prev), outTangent(segments[i])) > minRad) {
                corners.push(i);
            }
        }
        if (!closed) corners.push(n); // poslední kotva otevřené cesty
        return corners;
    },
```

- [ ] **Step 3.4: Run tests**

Run: `node tests/test_core_circuit.js` → PASS.
Run: `bash tests/run_all.sh` → all suites PASS (new suite registered).

- [ ] **Step 3.5: Commit**

```bash
git add src/core.js tests/test_core_circuit.js tests/run_all.sh
git commit -m "feat(grommet-marks): tangent-based corner detection + circuit test suite"
```

---

### Task 4: Core — `distributeOnSpan` (zones + middle) with regression equivalence

**Files:**
- Modify: `src/core.js`
- Test: `tests/test_core_circuit.js`

- [ ] **Step 4.1: Write failing tests**

Append to `tests/test_core_circuit.js` before the summary:

```javascript
// ===== TEST: distributeOnSpan =====
console.log("--- Core.distributeOnSpan ---");
(function () {
    function nearly(a, b) { return Math.abs(a - b) < 1e-6; }

    // Zones OFF + count mode == legacy calcPositions shape (regression anchor)
    var zOff = { enabled: false, count: 5, pitch: 100 };
    var pos = GM.Core.distributeOnSpan(900, zOff, { useNumber: true, number: 4, spacing: 0 });
    assert(pos.length === 4, "count mode: 4 marks");
    assert(nearly(pos[0], 0) && nearly(pos[3], 900), "count mode: endpoints included");
    assert(nearly(pos[1], 300), "count mode: even pitch");

    // Regression equivalence vs legacy calcPositions (spacing mode):
    // legacy: span 1000, offset 50, unitFactor 1, preferred 300
    var legacy = GM.Core.calcPositions(
        { useNumber: false, number: 1, spacing: 300 }, 1000, 50, 1);
    var modern = GM.Core.distributeOnSpan(
        900, zOff, { useNumber: false, number: 1, spacing: 300 });
    assert(legacy.length === modern.length, "equivalence: same count");
    var eq = true;
    for (var i = 0; i < legacy.length; i++) {
        if (!nearly(legacy[i], modern[i] + 50)) eq = false;
    }
    assert(eq, "equivalence: identical positions (offset-shifted)");

    // Zones ON: L=1000, N=3, A=100 -> zone marks 0,100,200 + mirrored 800,900,1000
    var zOn = { enabled: true, count: 3, pitch: 100 };
    var pz = GM.Core.distributeOnSpan(1000, zOn, { useNumber: false, number: 1, spacing: 300 });
    assert(nearly(pz[0], 0) && nearly(pz[1], 100) && nearly(pz[2], 200), "zone marks from start");
    var last = pz.length - 1;
    assert(nearly(pz[last], 1000) && nearly(pz[last - 1], 900), "zone marks from end");
    // Middle: M = 1000-2*200 = 600, preferred 300 -> 2 gaps -> 1 interior mark at 500
    assert(pz.length === 7, "zones+middle total (got " + pz.length + ")");
    assert(nearly(pz[3], 500), "middle interior mark centered");

    // Degradation: L=300 < 2*(3-1)*100=400 -> zones meet, dedup, no middle
    var pd = GM.Core.distributeOnSpan(300, zOn, { useNumber: false, number: 1, spacing: 300 });
    // from start: 0,100; mirrored from end: 300,200; meeting -> 0,100,200,300
    assert(pd.length === 4, "short span degradation count (got " + pd.length + ")");
    assert(nearly(pd[1], 100) && nearly(pd[2], 200), "short span symmetric positions");

    // Middle smaller than preferred: M=600-... L=500, zones (3,100): M=100 < 300 -> no interior
    var pm = GM.Core.distributeOnSpan(500, zOn, { useNumber: false, number: 1, spacing: 300 });
    assert(pm.length === 6, "no interior when middle < preferred");
})();
```

- [ ] **Step 4.2: Run, verify fail**

Run: `node tests/test_core_circuit.js`
Expected: FAIL — `distributeOnSpan is not a function`.

- [ ] **Step 4.3: Implement in `src/core.js`**

```javascript
    /**
     * Distributes mark positions over one corner-to-corner span.
     * Returns distances 0..L measured from the span start, endpoints
     * (= corner marks) always included. Caller deduplicates shared corners.
     *
     * Corner zone: zone.count marks INCLUDING the corner mark, at zone.pitch,
     * mirrored from both ends; occupies (count-1)*pitch from each end.
     * Middle: preferred-pitch fill (mid.spacing), count computed, pitch
     * adjusted to fit exactly — same philosophy as the legacy spacing mode.
     * Count mode (mid.useNumber) is only meaningful with zones disabled
     * (artboard edges, smooth closed paths handled by distributeOnCircuit).
     *
     * All lengths in the same unit (caller pre-converts to points).
     *
     * @param {number} L - Span length (>= 0).
     * @param {Object} zone - {enabled, count, pitch}.
     * @param {Object} mid - {useNumber, number, spacing}.
     * @returns {Array<number>} Sorted distances from span start.
     */
    distributeOnSpan: function (L, zone, mid) {
        var positions = [];
        var seen = {};
        function push(d) {
            if (d < 0) d = 0;
            if (d > L) d = L;
            var key = String(Math.round(d * 1e6));
            if (seen[key]) return;
            seen[key] = true;
            positions.push(d);
        }

        if (L <= 0) { push(0); return positions; }

        var zoneLen = 0;
        if (zone && zone.enabled) {
            var zc = Math.max(zone.count || 1, 1);
            var zp = Math.max(zone.pitch || 0, 0);
            zoneLen = (zc - 1) * zp;

            if (zp <= 0 || zc === 1) {
                push(0); push(L);
                zoneLen = 0;
            } else if (2 * zoneLen >= L) {
                // Degradation: zones meet — mirror from both ends to the middle.
                for (var di = 0; di < zc; di++) {
                    var d = di * zp;
                    if (d > L) break;
                    push(d); push(L - d);
                }
                positions.sort(function (a, b) { return a - b; });
                return positions;
            } else {
                for (var zi = 0; zi < zc; zi++) { push(zi * zp); push(L - zi * zp); }
            }
        } else {
            push(0); push(L);
        }

        // Middle fill between zone ends (or full span when zones off).
        var m0 = zoneLen, m1 = L - zoneLen;
        var M = m1 - m0;
        if (M > 0) {
            if (mid.useNumber && !(zone && zone.enabled)) {
                // Legacy count mode: N marks across the whole span incl. endpoints.
                var num = Math.max(mid.number || 1, 1);
                if (num > GM.CONSTANTS.MAX_MARKS) num = GM.CONSTANTS.MAX_MARKS;
                var spc = num > 1 ? L / (num - 1) : 0;
                for (var ci = 0; ci < num; ci++) push(ci * spc);
            } else {
                var preferred = Math.max(mid.spacing || 0, 0);
                if (preferred > 0) {
                    var gaps = Math.round(M / preferred);
                    if (gaps < 1) gaps = 1;
                    if (gaps > GM.CONSTANTS.MAX_MARKS) gaps = GM.CONSTANTS.MAX_MARKS;
                    var pitch = M / gaps;
                    for (var gi = 1; gi < gaps; gi++) push(m0 + gi * pitch);
                }
            }
        }

        positions.sort(function (a, b) { return a - b; });
        return positions;
    },
```

> **Pozn. k ekvivalenci:** legacy `calcPositions` ve spacing módu používá
> floor/ceil výběr bližší rozteče; `Math.round(M / preferred)` je totéž
> rozhodnutí vyjádřené přímo (round = bližší z floor/ceil; remíza padne na
> ceil u .5, stejně jako `<=` v legacy porovnání). Ekvivalenční test v kroku
> 4.1 to jistí na konkrétních číslech; pokud na nějakém vstupu selže, převzít
> doslova floor/ceil logiku z `calcPositions` (řádky 62–77 v `core.js`).

- [ ] **Step 4.4: Run tests**

Run: `node tests/test_core_circuit.js` → PASS.

- [ ] **Step 4.5: Commit**

```bash
git add src/core.js tests/test_core_circuit.js
git commit -m "feat(grommet-marks): distributeOnSpan — corner zones + preferred middle + legacy equivalence"
```

---

### Task 5: Core — `distributeOnCircuit`

**Files:**
- Modify: `src/core.js`
- Test: `tests/test_core_circuit.js`

- [ ] **Step 5.1: Write failing tests**

Append to `tests/test_core_circuit.js`:

```javascript
// ===== TEST: distributeOnCircuit =====
console.log("--- Core.distributeOnCircuit ---");
(function () {
    function nearly(a, b, eps) { return Math.abs(a - b) < (eps || 1e-3); }
    var zOff = { enabled: false, count: 5, pitch: 100 };

    // Square 400x400 perimeter 1600, corners mandatory, spacing 200
    var sq = [
        { p0: [0, 0], p1: [0, 0], p2: [400, 0], p3: [400, 0] },
        { p0: [400, 0], p1: [400, 0], p2: [400, 400], p3: [400, 400] },
        { p0: [400, 400], p1: [400, 400], p2: [0, 400], p3: [0, 400] },
        { p0: [0, 400], p1: [0, 400], p2: [0, 0], p3: [0, 0] }
    ];
    var circuit = GM.Core.buildCircuit(sq, true);
    var corners = GM.Core.detectCorners(sq, true, 15);
    var marks = GM.Core.distributeOnCircuit(
        circuit, corners, zOff, { useNumber: false, number: 1, spacing: 200 });
    // Per side: corners + 1 interior at 200 -> 4 corners + 4 interiors = 8
    assert(marks.length === 8, "square spacing 200: 8 marks (got " + marks.length + ")");
    var hasCorner = false, hasMid = false;
    for (var i = 0; i < marks.length; i++) {
        if (nearly(marks[i][0], 0) && nearly(marks[i][1], 0)) hasCorner = true;
        if (nearly(marks[i][0], 200) && nearly(marks[i][1], 0)) hasMid = true;
    }
    assert(hasCorner, "square: corner mark present");
    assert(hasMid, "square: mid-edge mark present");

    // Smooth closed circle: count mode, exactly N evenly
    var k = 55.22847498;
    var circle = [
        { p0: [100, 0],  p1: [100, k],   p2: [k, 100],   p3: [0, 100] },
        { p0: [0, 100],  p1: [-k, 100],  p2: [-100, k],  p3: [-100, 0] },
        { p0: [-100, 0], p1: [-100, -k], p2: [-k, -100], p3: [0, -100] },
        { p0: [0, -100], p1: [k, -100],  p2: [100, -k],  p3: [100, 0] }
    ];
    var cc = GM.Core.buildCircuit(circle, true);
    var noCorners = GM.Core.detectCorners(circle, true, 15);
    var ringCount = GM.Core.distributeOnCircuit(
        cc, noCorners, zOff, { useNumber: true, number: 8, spacing: 0 });
    assert(ringCount.length === 8, "smooth ring count mode: exactly 8");
    // All on radius 100 (within sampling tolerance)
    var onR = true;
    for (var ri = 0; ri < ringCount.length; ri++) {
        var r = Math.sqrt(ringCount[ri][0] * ringCount[ri][0] + ringCount[ri][1] * ringCount[ri][1]);
        if (Math.abs(r - 100) > 0.5) onR = false;
    }
    assert(onR, "smooth ring: marks on the circle");

    // Smooth ring spacing mode: round(perimeter/B)
    var ringSp = GM.Core.distributeOnCircuit(
        cc, noCorners, zOff, { useNumber: false, number: 1, spacing: 157 });
    assert(ringSp.length === Math.round(cc.totalLen / 157),
        "smooth ring spacing mode: round(perimeter/spacing) marks");

    // Cap: micro spacing nesmí zamrznout
    var capped = GM.Core.distributeOnCircuit(
        cc, noCorners, zOff, { useNumber: false, number: 1, spacing: 0.0001 });
    assert(capped.length <= GM.CONSTANTS.MAX_MARKS, "MAX_MARKS cap holds");
})();
```

- [ ] **Step 5.2: Run, verify fail** — `node tests/test_core_circuit.js` → FAIL (function missing).

- [ ] **Step 5.3: Implement in `src/core.js`**

```javascript
    /**
     * Distributes marks over a whole circuit.
     * - With corners: every corner gets a mandatory mark; each corner-to-corner
     *   span is filled by distributeOnSpan (zones + preferred middle). Count
     *   mode is not applicable here (UI disables it) — spacing rules.
     * - Without corners + closed: even ring — count mode places exactly N,
     *   spacing mode places round(totalLen/spacing), starting at distance 0.
     * @param {Object} circuit - From buildCircuit.
     * @param {Array<number>} corners - Corner anchor indices (detectCorners).
     * @param {Object} zone - {enabled, count, pitch} (already unit-converted).
     * @param {Object} dist - {useNumber, number, spacing} (unit-converted).
     * @returns {Array<Array<number>>} [[x, y], ...]
     */
    distributeOnCircuit: function (circuit, corners, zone, dist) {
        var marks = [];
        var seen = {};
        function place(p) {
            var key = Math.round(p[0] * 10) / 10 + "|" + Math.round(p[1] * 10) / 10;
            if (seen[key]) return;
            seen[key] = true;
            marks.push(p);
        }

        var total = circuit.totalLen;
        if (total <= 0) return marks;

        if (corners.length === 0) {
            // Smooth ring (any cornerless path, not just circles).
            var count;
            if (dist.useNumber) {
                count = Math.max(dist.number || 1, 1);
            } else {
                var sp = Math.max(dist.spacing || 0, 0);
                count = sp > 0 ? Math.round(total / sp) : 1;
                if (count < 1) count = 1;
            }
            if (count > GM.CONSTANTS.MAX_MARKS) count = GM.CONSTANTS.MAX_MARKS;
            var step = total / count;
            for (var i = 0; i < count; i++) place(GM.Core.pointAtDistance(circuit, i * step));
            return marks;
        }

        // Corner anchor index -> arc distance from circuit start.
        var anchorDist = [0];
        for (var a = 0; a < circuit.segments.length; a++) {
            anchorDist.push(anchorDist[a] + circuit.segments[a].len);
        }

        var spans = [];
        for (var ci = 0; ci < corners.length; ci++) {
            var from = anchorDist[corners[ci]];
            var to;
            if (ci + 1 < corners.length) {
                to = anchorDist[corners[ci + 1]];
            } else if (circuit.closed) {
                to = total + anchorDist[corners[0]]; // wrap to first corner
            } else {
                break; // open: last corner is the path end, no further span
            }
            spans.push({ from: from, len: to - from });
        }

        for (var si = 0; si < spans.length; si++) {
            var span = spans[si];
            var pos = GM.Core.distributeOnSpan(span.len, zone,
                { useNumber: false, number: 1, spacing: dist.spacing });
            for (var pi = 0; pi < pos.length; pi++) {
                if (marks.length >= GM.CONSTANTS.MAX_MARKS) return marks;
                place(GM.Core.pointAtDistance(circuit, span.from + pos[pi]));
            }
        }
        return marks;
    },
```

- [ ] **Step 5.4: Run tests** — `node tests/test_core_circuit.js` → PASS; `bash tests/run_all.sh` → all PASS.

- [ ] **Step 5.5: Commit**

```bash
git add src/core.js tests/test_core_circuit.js
git commit -m "feat(grommet-marks): distributeOnCircuit — corner spans + smooth ring + cap"
```

---

### Task 6: Validation rules + mode-aware validate

**Files:**
- Modify: `src/lib/validation.js`
- Modify: `src/lib/utils.js` (presetEquals keys)
- Test: `tests/test_validation.js`

- [ ] **Step 6.1: Write failing tests**

Append to `tests/test_validation.js` (uses its existing `mkValidCfg()`-style helper — adapt to actual helper name; extend the helper itself with the new v5 fields so existing tests keep passing):

```javascript
// ===== TEST: v5 rules =====
console.log("--- Validation v5: zones + path ---");
(function () {
    var rules = GM.Validation.rules;
    assert(rules.cornerCount.integer === true, "cornerCount is integer rule");
    assert(rules.cornerCount.min === 1 && rules.cornerCount.max === 999, "cornerCount range");
    assert(rules.cornerPitch.min === 0.01, "cornerPitch min");
    assert(rules.pathNumber.integer === true && rules.pathNumber.max === 9999, "pathNumber rule");
    assert(rules.pathSpacing.min === 0.01, "pathSpacing min");

    // Zones enabled -> cornerCount/Pitch validated
    var cfg = mkValidCfg();
    cfg.cornerZone = { enabled: true, count: 2.5, pitch: 100 };
    var r = GM.Validation.validate(cfg, GM.L);
    assert(r.valid === false, "fractional cornerCount rejected");

    cfg.cornerZone = { enabled: true, count: 5, pitch: 0 };
    assert(GM.Validation.validate(cfg, GM.L).valid === false, "zero cornerPitch rejected");

    // Zones disabled -> zone fields ignored
    cfg.cornerZone = { enabled: false, count: 0, pitch: 0 };
    assert(GM.Validation.validate(cfg, GM.L).valid === true, "disabled zones skip zone fields");

    // Path mode: pathDist validated, edges ignored
    var pc = mkValidCfg();
    pc.placementMode = "path";
    pc.pathDist = { useNumber: false, number: 1, spacing: 0 };
    assert(GM.Validation.validate(pc, GM.L).valid === false, "path spacing 0 rejected");
    pc.pathDist = { useNumber: false, number: 1, spacing: 105 };
    pc.top.enabled = false; pc.left.enabled = false;
    pc.bottom.enabled = false; pc.right.enabled = false;
    pc.bottomMirror = false; pc.rightMirror = false;
    assert(GM.Validation.validate(pc, GM.L).valid === true,
        "path mode ignores edge-enabled structural check");
})();
```

- [ ] **Step 6.2: Run, verify fail** — `node tests/test_validation.js` → FAIL (`rules.cornerCount` undefined).

- [ ] **Step 6.3: Implement**

In `src/lib/validation.js` add to `rules`:

```javascript
        cornerCount:  { min: 1,    max: 999,  integer: true  },
        cornerPitch:  { min: 0.01, max: 9999, integer: false },
        pathNumber:   { min: 1,    max: 9999, integer: true  },
        pathSpacing:  { min: 0.01, max: 9999, integer: false }
```

In `validate()`, after the `strokeWeight` block, add:

```javascript
        // Corner zones (both modes; skipped when disabled)
        var zone = cfg.cornerZone || { enabled: false };
        var zoneCount = zone.count, zonePitch = zone.pitch;
        if (zone.enabled) {
            zoneCount = vn(zone.count, rules.cornerCount, L.ZONES_COUNT || "Count", L);
            if (zoneCount === null) return { valid: false, settings: null };
            zonePitch = vn(zone.pitch, rules.cornerPitch, L.ZONES_PITCH || "Pitch", L);
            if (zonePitch === null) return { valid: false, settings: null };
        }
```

Wrap the existing **edge structural + per-edge checks** in a mode guard, and add the path branch (the appearance check stays common to both modes):

```javascript
        var isPathMode = (cfg.placementMode === GM.CONSTANTS.MODE_PATH);

        var pathNumber = cfg.pathDist ? cfg.pathDist.number : 0;
        var pathSpacing = cfg.pathDist ? cfg.pathDist.spacing : 0;
        if (isPathMode) {
            if (cfg.pathDist.useNumber) {
                pathNumber = vn(cfg.pathDist.number, rules.pathNumber, L.COUNT || "Count", L);
                if (pathNumber === null) return { valid: false, settings: null };
            } else {
                pathSpacing = vn(cfg.pathDist.spacing, rules.pathSpacing, L.SPACING || "Spacing", L);
                if (pathSpacing === null) return { valid: false, settings: null };
            }
        } else {
            // ... existing edge-enabled structural check + per-edge loop,
            //     unchanged, moved inside this else-branch ...
        }
```

And extend the "Build clean settings" block:

```javascript
        if (zone.enabled) {
            settings.cornerZone.count = zoneCount;
            settings.cornerZone.pitch = zonePitch;
        }
        if (isPathMode) {
            if (cfg.pathDist.useNumber) settings.pathDist.number = pathNumber;
            else settings.pathDist.spacing = pathSpacing;
        }
```

In `src/lib/utils.js` `presetEquals`, extend the flat `keys` array with `"placementMode"` and add after the edge loop:

```javascript
        // Compare v5 sub-objects
        var zA = a.cornerZone || {}, zB = b.cornerZone || {};
        var zoneKeys = ["enabled", "count", "pitch"];
        for (var zk = 0; zk < zoneKeys.length; zk++) {
            if (String(zA[zoneKeys[zk]]) !== String(zB[zoneKeys[zk]])) return false;
        }
        var pA = a.pathDist || {}, pB = b.pathDist || {};
        var pdKeys = ["useNumber", "number", "spacing"];
        for (var pk = 0; pk < pdKeys.length; pk++) {
            if (String(pA[pdKeys[pk]]) !== String(pB[pdKeys[pk]])) return false;
        }
```

- [ ] **Step 6.4: Run tests** — `node tests/test_validation.js` → PASS; `bash tests/run_all.sh` → all PASS (ui_state/presetEquals tests still green).

- [ ] **Step 6.5: Commit**

```bash
git add src/lib/validation.js src/lib/utils.js tests/test_validation.js
git commit -m "feat(grommet-marks): v5 validation rules + mode-aware validate + presetEquals keys"
```

---

### Task 7: Illustrator adapter — `getSelectedPathInfo`

**Files:**
- Modify: `src/illustrator.js`

DOM-only, no Node test (GM has no Illustrator mock; logic kept minimal — everything computable lives in core). Manual verification in Task 11.

- [ ] **Step 7.1: Implement in `src/illustrator.js`** (after `getOrCreateSwatch`):

```javascript
    /**
     * Inspects the current selection for path-mode placement.
     * Pure read — never mutates the selection. Everything computable is
     * delegated to GM.Core so this stays a thin DOM extraction layer.
     *
     * @returns {Object} {ok:true, circuit, corners, closed, cornerCount,
     *                    totalLen, pathRef}
     *                   or {ok:false, reason:"no-selection"|"not-a-path"|"too-short"}
     */
    getSelectedPathInfo: function () {
        var sel;
        try { sel = GM.Illustrator.doc.selection; } catch (eSel) { sel = null; }
        if (!sel || sel.length === 0) return { ok: false, reason: "no-selection" };
        if (sel.length !== 1 || sel[0].typename !== "PathItem") {
            return { ok: false, reason: "not-a-path" };
        }
        var item = sel[0];
        var pts;
        try { pts = item.pathPoints; } catch (ePts) { return { ok: false, reason: "not-a-path" }; }
        if (!pts || pts.length < 2) return { ok: false, reason: "too-short" };

        // Extract anchors/handles into plain arrays — core stays DOM-free.
        var segments = [];
        var n = pts.length;
        var segCount = item.closed ? n : n - 1;
        for (var i = 0; i < segCount; i++) {
            var aP = pts[i], bP = pts[(i + 1) % n];
            segments.push({
                p0: [aP.anchor[0], aP.anchor[1]],
                p1: [aP.rightDirection[0], aP.rightDirection[1]],
                p2: [bP.leftDirection[0], bP.leftDirection[1]],
                p3: [bP.anchor[0], bP.anchor[1]]
            });
        }

        var circuit = GM.Core.buildCircuit(segments, !!item.closed);
        var corners = GM.Core.detectCorners(segments, !!item.closed,
            GM.CONSTANTS.CORNER_ANGLE_MIN);
        return {
            ok: true,
            circuit: circuit,
            corners: corners,
            closed: !!item.closed,
            cornerCount: corners.length,
            totalLen: circuit.totalLen,
            pathRef: item
        };
    },
```

- [ ] **Step 7.2: Build + full suite** — `npm run verify` → PASS (no regressions; function unused yet).

- [ ] **Step 7.3: Commit**

```bash
git add src/illustrator.js dist/
git commit -m "feat(grommet-marks): getSelectedPathInfo — thin DOM extraction for path mode"
```

---

### Task 8: UI — Placement panel, Path panel, Corner-zones panel, gather/apply, state-driven disabling

**Files:**
- Modify: `src/ui.js`
- Modify: `src/main.js` (only the `buildDialog` call signature)
- Test: `tests/test_ui_dialog.js`

- [ ] **Step 8.1: Write failing tests**

In `tests/test_ui_dialog.js`, update `buildUI` to the new signature and add tests:

```javascript
function buildUI(pData, pathInfo) {
    SUI.install();
    var ui = GM.UI.buildDialog(pData || freshPData(), { names: [] }, { names: [] },
        pathInfo || { ok: false, reason: "no-selection" });
    return ui;
}

function mockPathInfo(cornerCount, closed, totalLen) {
    return { ok: true, cornerCount: cornerCount, closed: closed,
             totalLen: totalLen || 1000, corners: [], circuit: null, pathRef: {} };
}
```

```javascript
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
    // Path with corners -> count radio disabled (spacing only)
    assert(ui2.pathUI.numRB.enabled === false, "count radio disabled on cornered path");
    assert(ui2.pathUI.spcRB.value === true, "spacing radio forced on cornered path");
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
```

- [ ] **Step 8.2: Run, verify fail** — `node tests/test_ui_dialog.js` → FAIL (signature/`modeUI` missing).

- [ ] **Step 8.3: Implement in `src/ui.js`**

`buildDialog(pData, layerInfo, swatchInfo, pathInfo)` — new 4th parameter.

**(a) Placement panel** — insert between the Presets panel block and the Edges panel block:

```javascript
        // =================================================================
        // Placement Panel (artboard edges vs selected path)
        // =================================================================
        var pathOk = !!(pathInfo && pathInfo.ok);
        var modePanel = dlg.add("panel", undefined, GM.L.PLACEMENT_PANEL);
        modePanel.orientation = "row";
        modePanel.alignChildren = ["left", "center"];
        modePanel.margins = 15;
        modePanel.spacing = 16;
        var artboardRB = modePanel.add("radiobutton", undefined, GM.L.MODE_ARTBOARD);
        artboardRB.value = true;
        var pathRB = modePanel.add("radiobutton", undefined, GM.L.MODE_PATH);
        pathRB.enabled = pathOk;
        pathRB.helpTip = pathOk ? "" : GM.L.TIP_MODE_PATH_DISABLED;
```

**(b) Path panel** — insert directly after the Edges panel block:

```javascript
        // =================================================================
        // Path Panel (replaces Edges in path mode)
        // =================================================================
        var pathPanel = dlg.add("panel", undefined, GM.L.PATH_PANEL);
        pathPanel.orientation = "column";
        pathPanel.alignChildren = ["left", "top"];
        pathPanel.margins = 15;
        pathPanel.spacing = 10;
        pathPanel.visible = false;

        var infoText = "";
        if (pathOk) {
            infoText = (pathInfo.closed ? GM.L.PATH_INFO_CLOSED : GM.L.PATH_INFO_OPEN)
                + " · "
                + (pathInfo.cornerCount > 0
                    ? GM.L.format(GM.L.PATH_INFO_CORNERS, pathInfo.cornerCount)
                    : GM.L.PATH_INFO_NO_CORNERS);
        }
        var pathInfoLbl = pathPanel.add("statictext", undefined, infoText);
        pathInfoLbl.enabled = false;   // šedý informační řádek

        var pathRow = pathPanel.add("group");
        pathRow.orientation = "row";
        pathRow.alignChildren = ["left", "center"];
        pathRow.spacing = 8;
        var pathNumRB = pathRow.add("radiobutton", undefined, GM.L.COUNT);
        var pathNumIn = pathRow.add("edittext", undefined, String(defCfg.pathDist.number));
        pathNumIn.preferredSize.width = 50;
        var pathSpcRB = pathRow.add("radiobutton", undefined, GM.L.SPACING);
        var pathSpcIn = pathRow.add("edittext", undefined, String(defCfg.pathDist.spacing));
        pathSpcIn.preferredSize.width = 50;
        pathSpcRB.value = true;

        var hasCorners = pathOk && pathInfo.cornerCount > 0;
        if (hasCorners) {
            // Cesta s rohy: počet je emergentní z roztečí — Počet disabled.
            pathNumRB.enabled = false;
            pathNumRB.helpTip = GM.L.TIP_PATH_COUNT_DISABLED;
        }
        pathNumRB.onClick = function () {
            pathNumRB.value = true; pathSpcRB.value = false;
            pathNumIn.enabled = true; pathSpcIn.enabled = false;
            onUserChange();
        };
        pathSpcRB.onClick = function () {
            pathSpcRB.value = true; pathNumRB.value = false;
            pathNumIn.enabled = false; pathSpcIn.enabled = true;
            onUserChange();
        };
        pathNumIn.enabled = false;

        var offsetNote = pathPanel.add("statictext", undefined, GM.L.PATH_OFFSET_NOTE,
            { multiline: true });
        offsetNote.enabled = false;
        offsetNote.preferredSize.width = 330;
```

**(c) Corner-zones panel** — insert after the Path panel:

```javascript
        // =================================================================
        // Corner Zones Panel (shared by both modes)
        // =================================================================
        var zonesPanel = dlg.add("panel", undefined, GM.L.ZONES_PANEL);
        zonesPanel.orientation = "row";
        zonesPanel.alignChildren = ["left", "center"];
        zonesPanel.margins = 15;
        zonesPanel.spacing = 8;
        var zoneCB = zonesPanel.add("checkbox", undefined, GM.L.ZONES_ENABLE);
        zoneCB.value = defCfg.cornerZone.enabled;
        zoneCB.helpTip = GM.L.TIP_ZONES;
        zonesPanel.add("statictext", undefined, GM.L.ZONES_COUNT);
        var zoneCountIn = zonesPanel.add("edittext", undefined, String(defCfg.cornerZone.count));
        zoneCountIn.preferredSize.width = 50;
        zonesPanel.add("statictext", undefined, GM.L.ZONES_PITCH);
        var zonePitchIn = zonesPanel.add("edittext", undefined, String(defCfg.cornerZone.pitch));
        zonePitchIn.preferredSize.width = 50;

        function refreshZonesEnabled() {
            var pathMode = pathRB.value;
            var zonesPossible = !pathMode || hasCorners;
            zoneCB.enabled = zonesPossible;
            zoneCB.helpTip = zonesPossible ? GM.L.TIP_ZONES : GM.L.TIP_ZONES_NO_CORNERS;
            var fieldsOn = zonesPossible && zoneCB.value;
            zoneCountIn.enabled = fieldsOn;
            zonePitchIn.enabled = fieldsOn;
        }
        zoneCB.onClick = function () { refreshZonesEnabled(); onUserChange(); };
```

**(d) Mode switching** — after the zones panel:

```javascript
        function refreshModeUI() {
            var pathMode = pathRB.value;
            edgesPanel.visible = !pathMode;
            pathPanel.visible = pathMode;
            refreshZonesEnabled();
            dlg.layout.layout(true);
            onUserChange();
        }
        artboardRB.onClick = function () { pathRB.value = false; artboardRB.value = true; refreshModeUI(); };
        pathRB.onClick = function () { artboardRB.value = false; pathRB.value = true; refreshModeUI(); };
```

(Radio exclusivity explicitní — stejný důvod jako u edge řádků: mezi radii sedí jiné prvky, implicitní ScriptUI grouping neplatí.)

**(e) gatherAll** — add fields:

```javascript
                placementMode: pathRB.value ? GM.CONSTANTS.MODE_PATH : GM.CONSTANTS.MODE_ARTBOARD,
                cornerZone: {
                    enabled: zoneCB.value,
                    count: parseFloat(zoneCountIn.text.replace(/,/g, ".")),
                    pitch: parseFloat(zonePitchIn.text.replace(/,/g, "."))
                },
                pathDist: {
                    useNumber: pathNumRB.value,
                    number: parseFloat(pathNumIn.text.replace(/,/g, ".")),
                    spacing: parseFloat(pathSpcIn.text.replace(/,/g, "."))
                },
```

**(f) applyAll** — add (with mode fallback):

```javascript
            var wantPath = (s.placementMode === GM.CONSTANTS.MODE_PATH);
            if (wantPath && !pathOk) {
                // Preset chce cestu, žádná není vybraná -> artboard + poznámka
                // (jednorázová; vypsat až po show by rušilo — stačí helpTip stavu).
                wantPath = false;
            }
            pathRB.value = wantPath; artboardRB.value = !wantPath;

            var z = s.cornerZone || defCfg.cornerZone;
            zoneCB.value = !!z.enabled;
            zoneCountIn.text = z.count;
            zonePitchIn.text = z.pitch;

            var pd = s.pathDist || defCfg.pathDist;
            var pdUseNum = !!pd.useNumber && !hasCorners;
            pathNumRB.value = pdUseNum; pathSpcRB.value = !pdUseNum;
            pathNumIn.text = pd.number; pathSpcIn.text = pd.spacing;
            pathNumIn.enabled = pdUseNum; pathSpcIn.enabled = !pdUseNum;

            refreshModeUI();
```

(`refreshModeUI` volá `onUserChange` — applyAll se volá až po definici těchto funkcí v inicializaci, pořadí v buildDialog: panely → gather/apply → handlery → `refreshModeUI()` jako součást init před `updatePresetList()`.)

**(g) Live validation** — extend `validationTargets`:

```javascript
            { et: zoneCountIn, rule: R.cornerCount },
            { et: zonePitchIn, rule: R.cornerPitch },
            { et: pathNumIn,   rule: R.pathNumber },
            { et: pathSpcIn,   rule: R.pathSpacing }
```

A ve strukturální části `liveValidateAll`: edge-enabled check jen když `!pathRB.value` (v path módu hrany neexistují).

**(h) Unit conversion** — `unitsDDL.onChange` fields list: přidat `zonePitchIn`, `pathSpcIn` (počty se nekonvertují).

**(i) Wire edits** — `allEdits` doplnit o `zoneCountIn, zonePitchIn, pathNumIn, pathSpcIn`.

**(j) Return** — expose for tests:

```javascript
        return {
            window: dlg,
            gatherAll: gatherAll,
            modeUI: { artboardRB: artboardRB, pathRB: pathRB },
            pathUI: { numRB: pathNumRB, numIn: pathNumIn, spcRB: pathSpcRB, spcIn: pathSpcIn },
            zonesUI: { enableCB: zoneCB, countIn: zoneCountIn, pitchIn: zonePitchIn }
        };
```

**(k) main.js call site** — in `run()`:

```javascript
            var pathInfo = GM.Illustrator.getSelectedPathInfo();
            var ui = GM.UI.buildDialog(pData, layerInfo, swatchInfo, pathInfo);
```

- [ ] **Step 8.4: Run tests** — `node tests/test_ui_dialog.js` → PASS; `bash tests/run_all.sh` → all PASS.

- [ ] **Step 8.5: Commit**

```bash
git add src/ui.js src/main.js tests/test_ui_dialog.js
git commit -m "feat(grommet-marks): v5 dialog — placement mode, path panel, corner zones, state-driven disabling"
```

---

### Task 9: main.js — placement through circuits (both modes)

**Files:**
- Modify: `src/main.js`
- Test: regression via `npm run verify` (core equivalence covered in Task 4; DOM loop manual in Task 11)

- [ ] **Step 9.1: Rewrite `process()` placement**

In `GM.Main.process(cfg)`:

**(a)** After `unitFactor`, convert zone + path settings once:

```javascript
            var zoneCfg = {
                enabled: !!(cfg.cornerZone && cfg.cornerZone.enabled),
                count: cfg.cornerZone ? cfg.cornerZone.count : 0,
                pitch: cfg.cornerZone ? cfg.cornerZone.pitch * unitFactor : 0
            };
```

**(b)** Replace the four per-edge `GM.Core.calcPositions(...)` calls with `distributeOnSpan` (offset math identical to current — positions are relative to the offset-inset span):

```javascript
                if (topOn) {
                    var tAvail = abWidth - 2 * (offX * unitFactor);
                    if (tAvail < 0) tAvail = 0;
                    var tPositions = GM.Core.distributeOnSpan(tAvail, zoneCfg, {
                        useNumber: topCfg.useNumber,
                        number: topCfg.number,
                        spacing: topCfg.spacing * unitFactor
                    });
                    var tY = abTop - (offY * unitFactor);
                    for (var ti = 0; ti < tPositions.length; ti++) {
                        place(abLeft + (offX * unitFactor) + tPositions[ti], tY);
                    }
                }
```

(Mirror the same shape for bottom/left/right — left/right use `abHeight`, `offY` for the span inset, `offX` for the perpendicular, exactly as current code; only `calcPositions` → `distributeOnSpan` + explicit inset.)

**(c)** Add the path branch at the start of the artboard loop:

```javascript
            if (cfg.placementMode === GM.CONSTANTS.MODE_PATH) {
                var pInfo = GM.Illustrator.getSelectedPathInfo();
                if (!pInfo.ok) {
                    // Výběr se mezi otevřením dialogu a OK změnil.
                    alert(GM.CONSTANTS.SCRIPT_NAME + ": " + GM.L.ERR_PATH_GONE);
                    return;
                }
                var pathMarks = GM.Core.distributeOnCircuit(
                    pInfo.circuit, pInfo.corners, zoneCfg, {
                        useNumber: cfg.pathDist.useNumber,
                        number: cfg.pathDist.number,
                        spacing: cfg.pathDist.spacing * unitFactor
                    });
                for (var pm = 0; pm < pathMarks.length; pm++) {
                    place(pathMarks[pm][0], pathMarks[pm][1]);
                }
            } else {
                for (var i = 0; i < doc.artboards.length; i++) {
                    // ... stávající artboard smyčka (s distributeOnSpan dle (b)) ...
                }
            }
```

(Layer session, warnings, `failedMarks`, restore — vše zůstává společné kolem obou větví, beze změny.)

**(d)** `run()`: selection-error hlášky pro režim path řeší dialog (radio disabled), žádná změna v `run()` kromě `pathInfo` z Tasku 8.

- [ ] **Step 9.2: Calc-only smoke + full suite**

Run: `npm run verify`
Expected: build OK, **all suites PASS** — especially `test_core_circuit` equivalence (zones off ≡ legacy positions). `calcPositions` zůstává v core (beze změny) jako reference; products už ji nevolají.

- [ ] **Step 9.3: Commit**

```bash
git add src/main.js dist/
git commit -m "feat(grommet-marks): placement via circuits — path branch + edges through distributeOnSpan"
```

---

### Task 10: Typography pass

**Files:**
- Modify: `src/ui.js`

Mechanické sjednocení dle `ui-ux-principles` / `extendscript-ui-standards` — žádná logika:

- [ ] **Step 10.1: Apply pass**

1. Jednotný sloupec popisků: `preferredSize.width = 75` na **všech** label statictextech v panelech Hrany (Odsazení X/Y), Cesta, Rohové zóny, Značka (dnes jen Vzhled).
2. Rytmus mezer: panely `margins = 15`, `spacing = 10`; řádkové grupy `spacing = 8`; dialog `spacing = 15`, `margins = 20` (zkontrolovat odchylky — edge group má dnes `spacing = 6`, sjednotit na 8).
3. Numerická pole: edge/inline 50 px, standalone 60 px — audit všech `edittext`.
4. Sentence case s dvojtečkou u všech popisků (audit locale — už splněno, zkontrolovat nové).
5. helpTip na 100 % interaktivních prvků — doplnit chybějící (`offsetNote` ne — není interaktivní; `artboardRB`/`pathRB` ano: TIP_MODE_*).
6. Šířkový buffer: nejdelší české labely („Zrcadlit horní", „Zhustit u rohů") — ověřit, že žádný label není oříznutý při `dlg.preferredSize.width = 400`.

- [ ] **Step 10.2: Verify + commit**

Run: `npm run verify` → all PASS (mock nelayoutuje, ale chrání proti syntax/regresi).

```bash
git add src/ui.js dist/
git commit -m "style(grommet-marks): typography pass — unified label column, spacing rhythm, helpTips"
```

---

### Task 11: Manual P0 test plan + docs + release

**Files:**
- Modify: `docs/TEST_PLAN.md`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`

- [ ] **Step 11.1: Add manual P0 cases to `docs/TEST_PLAN.md`**

```markdown
## v5.0.0 — Path mode + corner zones (P0)

| # | Scénář | Očekávání |
|---|---|---|
| P1 | Artboard, zóny OFF, stejná čísla jako ve v4.2.1 | Pozice značek identické s v4.2.1 (vizuální diff) |
| P2 | Artboard, zóny ON (5 × 100 mm), Rozestup 300 | Od každého rohu 5 značek po 100, střed ~300, symetrické |
| P3 | Obdélníková cesta 400×400 mm, Rozestup 200 | Značka v každém rohu, úseky vyplněné, dedup rohů |
| P4 | Kruh ⌀ 300 mm, Počet 12 | Přesně 12 značek rovnoměrně, zóny disabled |
| P5 | Kruh, Rozestup 100 | round(obvod/100) značek |
| P6 | Trojúhelník + zóny ON | Zóny u 3 rohů, střední výplň |
| P7 | Zaoblený obdélník (tangentní oblouky) | 0 rohů → ring chování, zóny disabled |
| P8 | Otevřená lomená čára | Koncové body = značky, ohyb = roh |
| P9 | Výběr smazán mezi dialogem a OK | ERR_PATH_GONE, žádný pád |
| P10 | Složená cesta vybraná | Radio Cesta disabled (not-a-path) |
| P11 | Preset s mode=path načtený bez výběru | Fallback artboard, bez pádu |
| P12 | Mirror hrany + zóny ON | Zrcadlené hrany se zónami konzistentní |
```

- [ ] **Step 11.2: README changelog + features**

`README.md`: do Funkcí přidat odrážky **Rohové zóny** a **Režim Vybraná cesta** (text dle specu); changelog:

```markdown
### v5.0.0 (2026-06)
- **FEATURE:** Rohové zóny — prvních N značek od každého rohu vlastní roztečí (typicky 5 × 100 mm), zbytek preferovanou roztečí. Platí pro hrany artboardu i rohy cesty.
- **FEATURE:** Režim „Vybraná cesta" — rozmístění značek po obvodu vybrané cesty (mnohoúhelníky: značka povinně v každém rohu, úseky roh–roh; hladké cesty: rovnoměrně po obvodu).
- **UI:** Panel Umístění (přepínač režimu), panel Cesta s info řádkem, panel Rohové zóny; stavové disablování (cesta bez rohů, cesta s rohy → jen Rozestup).
- **UI:** Typografický pass — jednotný sloupec popisků, rytmus mezer, helpTipy všude.
- **CORE:** Jednotná abstrakce okruhu (Bézier arc-length sampling, tangentová detekce rohů); hrany artboardu jedou stejným algoritmem (zóny OFF = bitově shodné s v4.2.1).
```

- [ ] **Step 11.3: ARCHITECTURE.md** — doplnit sekci o circuit modelu (moduly, datové toky dle specu — stručně, odkazem na spec).

- [ ] **Step 11.4: Final verify + manual P0 + release commit**

Run: `npm run verify` → all PASS.
Manuálně projet P1–P12 v Illustratoru (P1 a P3 jsou blokující minimum).

```bash
git add docs/TEST_PLAN.md README.md docs/ARCHITECTURE.md dist/
git commit -m "docs(grommet-marks): v5.0.0 — test plan, README, architecture"
```

Deploy do `Projects/extendscript-automation` + update obou README tam — **až po** manuálním P0 (mimo tento plán, stávající deploy rutina).

---

## Self-Review (provedeno při zápisu)

- **Spec coverage:** rozhodnutí ze specu ↔ tasky: zóny globální (T1 config, T4 algoritmus, T8 UI), cesta výběrem (T7), tangentová detekce (T3), odsazení poznámkou (T8b), jednotný model (T5, T9), režim radio (T8a/d), jedna rozteč na obvod (T5, T8b), „Počet" disabled u cesty s rohy (T8b), zóny disabled bez rohů (T8c), typografie (T10), 5.0.0 (T1, T11), migrace forward-fill (T1), validace (T6), error handling reasons (T7, locale T1), testy včetně regresní ekvivalence (T2–T5) a manuálních P0 (T11). Bez mezer.
- **Placeholders:** jediná „adaptuj" instrukce je u názvů test-helperů v T1/T6 (existující helpery, jméno se liší podle souboru) — záměrné, ne placeholder chování.
- **Typová konzistence:** `distributeOnSpan(L, zone, mid)` konzistentní T4→T5→T9; `{ok, reason}` T7→T8→T9; `cornerZone {enabled,count,pitch}` T1→T6→T8→T9; `pathDist {useNumber,number,spacing}` T1→T6→T8→T9; `buildDialog(pData, layerInfo, swatchInfo, pathInfo)` T8 jediná definice, volaná T8k.
