# GM v6 — Uniform Esko Marks + Compact Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace GM's flexible fill/stroke/layer appearance with a fixed Esko-style registration eyelet mark (white halo knockout + registration overprint, circle and/or cross), drop the Appearance panel, and compact the dialog to a single column that fits a 13" Mac.

**Architecture:** Expand-contract refactor. First add the new schema fields, mark renderer, and UI controls *additively* (old fill/stroke path still works → suite stays green). Then flip validation/main to the new path. Finally remove the dead fill/stroke/layer code, fields, and locale keys. Each task ends with `npm test` green and a commit.

**Tech Stack:** Adobe ExtendScript (ES3), ScriptUI, Node.js test harness with mock ScriptUI/DOM.

**Reference spec:** `docs/superpowers/specs/2026-06-13-gm-uniform-esko-marks-compact-layout-design.md`

**Conventions:** ES3 only (no `let`/`const`/arrow/template literals). Build with `bash tools/build.sh`. Test with `npm test`. Commits: Conventional Commits, **no AI co-author trailer** (project rule). Edit `src/`, never `dist/`.

---

## Task 1: Expand schema — new fields + validation rules (additive)

**Files:**
- Modify: `src/constants.js`
- Modify: `src/config.js`
- Modify: `src/lib/validation.js`
- Test: `tests/test_core_math.js` (constants mock if any), `tests/test_validation.js`

- [ ] **Step 1: Bump version in constants**

In `src/constants.js`, change:
```javascript
    VERSION: "5.0.0",
```
to:
```javascript
    VERSION: "6.0.0",
```

- [ ] **Step 2: Add new fields to getDefaults (keep old fields)**

In `src/config.js`, inside `getDefaults()` return object, add after `markSize: 3,`:
```javascript
            markSize: 3,
            // v6 — uniform Esko mark (circle/cross, white halo + registration)
            markCircle: true,
            markCross: false,
            regWeight: 1.0,
            haloWeight: 3.0,
            isRound: true,
```
(Leave `isRound` and all fill/stroke/layer fields in place for now — removed in Task 7.)

- [ ] **Step 3: Add validation rules for the new weights**

In `src/lib/validation.js`, in the `rules` object, add after `strokeWeight`:
```javascript
        strokeWeight: { min: 0.01, max: 100,  integer: false },
        regWeight:    { min: 0.1,  max: 50,   integer: false },
        haloWeight:   { min: 0.1,  max: 50,   integer: false },
```

- [ ] **Step 4: Add tests for new defaults + rules**

In `tests/test_validation.js`, find the `--- Validation v5: zones + path ---` section and add a new block after it (before the summary). Use the file's existing `assert` helper and `GM` reference:
```javascript
console.log("--- Validation v6: weight rules + defaults ---");
(function () {
    var d = GM.Config.getDefaults();
    assert(d.markCircle === true,  "default markCircle true");
    assert(d.markCross === false,  "default markCross false");
    assert(d.regWeight === 1.0,    "default regWeight 1.0");
    assert(d.haloWeight === 3.0,   "default haloWeight 3.0");
    assert(GM.Validation.rules.regWeight.min === 0.1,  "regWeight rule present");
    assert(GM.Validation.rules.haloWeight.max === 50,  "haloWeight rule present");
})();
```

- [ ] **Step 5: Build + run tests**

Run: `npm run verify`
Expected: build OK, ALL SUITES PASSED (old fields still present → nothing breaks; new assertions pass).

- [ ] **Step 6: Commit**

```bash
git add src/constants.js src/config.js src/lib/validation.js tests/test_validation.js
git commit -m "feat(config): add v6 mark schema fields + weight validation rules (additive)"
```

---

## Task 2: Mark renderer — placeMarkGroup (additive, keep placeMark)

**Files:**
- Modify: `src/illustrator.js`

- [ ] **Step 1: Add placeMarkGroup + private stroke helpers**

In `src/illustrator.js`, add these methods to the `GM.Illustrator` object, immediately before `placeMark:` (keep `placeMark` for now):
```javascript
    /**
     * Places one Esko-style registration eyelet mark as a GroupItem centred at
     * (x, y) in document space. White halo strokes (knockout) sit BELOW the
     * registration strokes (overprint) so the mark stays legible on any
     * artwork. Draws a circle and/or a cross per opts flags.
     *
     * @param {Layer} targetLayer - Destination layer.
     * @param {number} x - Centre X (document space, points).
     * @param {number} y - Centre Y (document space, points).
     * @param {number} size - Diameter / cross arm span (points).
     * @param {Object} opts - {circle, cross, regWeight, haloWeight} (weights in pt).
     * @returns {boolean} True on success — caller counts failures.
     */
    placeMarkGroup: function (targetLayer, x, y, size, opts) {
        try {
            var grp = targetLayer.groupItems.add();
            var regCol = GM.Illustrator.registrationColor();
            var white = new CMYKColor();
            white.cyan = 0; white.magenta = 0; white.yellow = 0; white.black = 0;
            // bottom -> top: white halo (knockout), then registration (overprint)
            if (opts.circle) GM.Illustrator._strokeEllipse(grp, x, y, size, white,  opts.haloWeight, false);
            if (opts.cross)  GM.Illustrator._strokeCross(grp,   x, y, size, white,  opts.haloWeight, false);
            if (opts.circle) GM.Illustrator._strokeEllipse(grp, x, y, size, regCol, opts.regWeight,  true);
            if (opts.cross)  GM.Illustrator._strokeCross(grp,   x, y, size, regCol, opts.regWeight,  true);
            return true;
        } catch (e) {
            $.writeln("placeMarkGroup [" + x + ", " + y + "]: " + e.message);
            return false;
        }
    },

    /** Stroked (unfilled) circle centred at (x,y); size = diameter. */
    _strokeEllipse: function (grp, x, y, size, color, weight, overprint) {
        var r = size / 2;
        var el = grp.pathItems.ellipse(y + r, x - r, size, size); // top, left, w, h
        el.filled = false;
        el.stroked = true;
        el.strokeColor = color;
        el.strokeWidth = weight;
        el.strokeOverprint = overprint;
        return el;
    },

    /** Crosshair centred at (x,y); arm span = size (radius each direction). */
    _strokeCross: function (grp, x, y, size, color, weight, overprint) {
        var r = size / 2;
        var hLine = grp.pathItems.add();
        hLine.setEntirePath([[x - r, y], [x + r, y]]);
        hLine.filled = false; hLine.stroked = true;
        hLine.strokeColor = color; hLine.strokeWidth = weight;
        hLine.strokeOverprint = overprint;
        var vLine = grp.pathItems.add();
        vLine.setEntirePath([[x, y - r], [x, y + r]]);
        vLine.filled = false; vLine.stroked = true;
        vLine.strokeColor = color; vLine.strokeWidth = weight;
        vLine.strokeOverprint = overprint;
    },

```

- [ ] **Step 2: Build + run tests**

Run: `npm run verify`
Expected: build OK, ALL SUITES PASSED (no node tests touch the DOM renderer; nothing broke).

- [ ] **Step 3: Commit**

```bash
git add src/illustrator.js
git commit -m "feat(illustrator): add placeMarkGroup — Esko-style halo+registration eyelet mark"
```

---

## Task 3: UI — add Mark-panel shape/weight controls (additive, keep Appearance)

**Files:**
- Modify: `src/locale.js`
- Modify: `src/ui.js`
- Test: `tests/test_ui_dialog.js`

- [ ] **Step 1: Add locale keys (EN + CS)**

In `src/locale.js`, in the `en` table after `SIZE_LABEL: "Size:",` add:
```javascript
            SIZE_LABEL: "Size:",
            MARK_CIRCLE: "Circle",
            MARK_CROSS: "Cross",
            REG_WEIGHT: "Reg. stroke:",
            HALO_WEIGHT: "White halo:",
            TIP_MARK_SHAPE: "Mark shape — circle, cross, or both (registration over a white halo).",
            TIP_REG_WEIGHT: "Registration stroke weight in points (overprints).",
            TIP_HALO_WEIGHT: "White halo (knockout) stroke weight in points — keeps the mark legible on artwork.",
```
In the `cs` table after `SIZE_LABEL: "Velikost:",` add:
```javascript
            SIZE_LABEL: "Velikost:",
            MARK_CIRCLE: "Kruh",
            MARK_CROSS: "Kříž",
            REG_WEIGHT: "Reg. tah:",
            HALO_WEIGHT: "Bílé halo:",
            TIP_MARK_SHAPE: "Tvar značky — kruh, kříž, nebo oba (registrace přes bílé halo).",
            TIP_REG_WEIGHT: "Tloušťka registračního tahu v bodech (přetiskuje).",
            TIP_HALO_WEIGHT: "Tloušťka bílého podkladu (knockout) v bodech — udrží značku čitelnou na motivu.",
```

- [ ] **Step 2: Restructure the Mark panel to a column with three rows**

In `src/ui.js`, replace the whole Mark panel block (from `var markPanel = dlg.add("panel", undefined, GM.L.MARK_PANEL);` through the `sizeInput.helpTip = GM.L.TIP_SIZE;` line and its trailing blank lines) with:
```javascript
        var markPanel = dlg.add("panel", undefined, GM.L.MARK_PANEL);
        markPanel.orientation = "column";
        markPanel.alignChildren = ["left", "top"];
        markPanel.margins = 15;
        markPanel.spacing = 8;

        var mRow1 = markPanel.add("group");
        mRow1.orientation = "row";
        mRow1.alignChildren = ["left", "center"];
        mRow1.spacing = 8;
        mRow1.add("statictext", undefined, GM.L.UNIT_LABEL);
        var unitsDDL = mRow1.add("dropdownlist", undefined, GM.UI.getUnitDisplayNames());
        unitsDDL.preferredSize.width = 130;
        unitsDDL.selection = 0;
        unitsDDL.helpTip = GM.L.TIP_UNITS;
        mRow1.add("statictext", undefined, GM.L.SIZE_LABEL);
        var sizeInput = mRow1.add("edittext", undefined, String(defCfg.markSize));
        sizeInput.preferredSize.width = 60;
        sizeInput.helpTip = GM.L.TIP_SIZE;

        var mRow2 = markPanel.add("group");
        mRow2.orientation = "row";
        mRow2.alignChildren = ["left", "center"];
        mRow2.spacing = 12;
        var circleCB = mRow2.add("checkbox", undefined, GM.L.MARK_CIRCLE);
        circleCB.value = defCfg.markCircle;
        circleCB.helpTip = GM.L.TIP_MARK_SHAPE;
        var crossCB = mRow2.add("checkbox", undefined, GM.L.MARK_CROSS);
        crossCB.value = defCfg.markCross;
        crossCB.helpTip = GM.L.TIP_MARK_SHAPE;

        var mRow3 = markPanel.add("group");
        mRow3.orientation = "row";
        mRow3.alignChildren = ["left", "center"];
        mRow3.spacing = 8;
        mRow3.add("statictext", undefined, GM.L.REG_WEIGHT);
        var regWIn = mRow3.add("edittext", undefined, String(defCfg.regWeight));
        regWIn.preferredSize.width = 50;
        regWIn.helpTip = GM.L.TIP_REG_WEIGHT;
        mRow3.add("statictext", undefined, GM.L.HALO_WEIGHT);
        var haloWIn = mRow3.add("edittext", undefined, String(defCfg.haloWeight));
        haloWIn.preferredSize.width = 50;
        haloWIn.helpTip = GM.L.TIP_HALO_WEIGHT;
```

- [ ] **Step 3: Gather the new fields**

In `gatherAll()` return object, add after `isRound: true,`:
```javascript
                isRound: true,   // shape locked to circle (square removed v4.2.0)
                markCircle: circleCB.value,
                markCross: crossCB.value,
                regWeight: parseFloat(regWIn.text.replace(/,/g, ".")),
                haloWeight: parseFloat(haloWIn.text.replace(/,/g, ".")),
```

- [ ] **Step 4: Apply the new fields**

In `applyAll(s)`, add after the `sizeInput.text = s.markSize;` line:
```javascript
            sizeInput.text = s.markSize;
            circleCB.value = !!s.markCircle;
            crossCB.value = !!s.markCross;
            regWIn.text = s.regWeight;
            haloWIn.text = s.haloWeight;
```

- [ ] **Step 5: Register weight fields in live validation + change hooks**

In the `validationTargets` array, add after `{ et: sizeInput, rule: R.markSize },`:
```javascript
            { et: sizeInput,   rule: R.markSize },
            { et: regWIn,      rule: R.regWeight },
            { et: haloWIn,     rule: R.haloWeight },
```
In the `allEdits` array, add `regWIn, haloWIn`:
```javascript
        var allEdits = [offsetXIn, offsetYIn, sizeInput, weightInput, regWIn, haloWIn,
                        zoneCountIn, zonePitchIn, pathNumIn, pathSpcIn];
```
After the `allEdits` wiring loop, wire the checkboxes:
```javascript
        circleCB.onClick = onUserChange;
        crossCB.onClick = onUserChange;
```

- [ ] **Step 6: Update UI dialog tests for the new controls**

In `tests/test_ui_dialog.js`, add a new block before the `// ===== SUMMARY =====` line:
```javascript
// ===== TEST: v6 mark shape + weight controls =====
console.log("--- UI v6: mark shape controls ---");
(function () {
    var ui = buildUI();
    var w = SUI.lastWindow();
    var circle = w.findOne(function (c) { return c.type === "checkbox" && c.text === GM.L.MARK_CIRCLE; });
    var cross  = w.findOne(function (c) { return c.type === "checkbox" && c.text === GM.L.MARK_CROSS; });
    assert(!!circle, "Circle checkbox exists");
    assert(!!cross, "Cross checkbox exists");
    assert(circle.value === true, "Circle on by default");
    assert(cross.value === false, "Cross off by default");
    var cfg = ui.gatherAll();
    assert(cfg.markCircle === true, "gather markCircle true");
    assert(cfg.markCross === false, "gather markCross false");
    assert(String(cfg.regWeight) === "1" || cfg.regWeight === 1, "gather regWeight default");
    assert(String(cfg.haloWeight) === "3" || cfg.haloWeight === 3, "gather haloWeight default");
    done();
})();
```

- [ ] **Step 7: Build + run tests**

Run: `npm run verify`
Expected: build OK, ALL SUITES PASSED. (Appearance panel still present; dialog temporarily carries both — fine, intermediate state.)

- [ ] **Step 8: Commit**

```bash
git add src/locale.js src/ui.js tests/test_ui_dialog.js
git commit -m "feat(ui): add Mark-panel shape (circle/cross) and weight controls (additive)"
```

---

## Task 4: Flip validation + presetEquals to the new appearance

**Files:**
- Modify: `src/lib/validation.js`
- Modify: `src/lib/utils.js`
- Modify: `src/ui.js`
- Test: `tests/test_validation.js`

- [ ] **Step 1: Replace the appearance check in validate()**

In `src/lib/validation.js`, replace:
```javascript
        // Appearance check (common to both modes)
        if (!cfg.fillEnabled && !cfg.strokeEnabled) {
            alert(L.ERR_NO_APPEARANCE);
            return { valid: false, settings: null };
        }
```
with:
```javascript
        // Appearance: validate weights (always relevant), require a shape.
        var regWeight = vn(cfg.regWeight, rules.regWeight, L.REG_WEIGHT || "Reg stroke", L);
        if (regWeight === null) return { valid: false, settings: null };
        var haloWeight = vn(cfg.haloWeight, rules.haloWeight, L.HALO_WEIGHT || "Halo", L);
        if (haloWeight === null) return { valid: false, settings: null };
        if (!cfg.markCircle && !cfg.markCross) {
            alert(L.ERR_NO_APPEARANCE);
            return { valid: false, settings: null };
        }
```

- [ ] **Step 2: Write the parsed weights into clean settings**

In `src/lib/validation.js`, in the "Build clean settings" block, add after `settings.markSize = markSize;`:
```javascript
        settings.markSize = markSize;
        settings.regWeight = regWeight;
        settings.haloWeight = haloWeight;
```

- [ ] **Step 3: Add new keys to presetEquals**

In `src/lib/utils.js`, in `presetEquals`, extend the flat `keys` array (keep old keys for now — removed Task 7):
```javascript
        var keys = [
            "offsetX", "offsetY", "bottomMirror", "rightMirror",
            "units", "markSize", "isRound",
            "markCircle", "markCross", "regWeight", "haloWeight",
            "markLayerName", "fillEnabled", "fillSwatchName", "fillOverprint",
            "strokeEnabled", "strokeSwatchName", "strokeOverprint", "strokeWeight"
        ];
```

- [ ] **Step 4: Update the UI structural validation to require a shape**

In `src/ui.js`, in `liveValidateAll()`, replace:
```javascript
            // 2) Marks must have a fill and/or a stroke.
            if (!fillCB.value && !strokeCB.value) allValid = false;
```
with:
```javascript
            // 2) Marks must have at least one shape (circle and/or cross).
            if (!circleCB.value && !crossCB.value) allValid = false;
```

- [ ] **Step 5: Reword ERR_NO_APPEARANCE locale (EN + CS)**

In `src/locale.js`, change `ERR_NO_APPEARANCE`:
- EN: `"Marks must have at least one shape — circle and/or cross."`
- CS: `"Značka musí mít aspoň jeden tvar — kruh a/nebo kříž."`

- [ ] **Step 6: Update validation tests**

`tests/test_validation.js` uses a **local `L` stub** (not `GM.L`) and a **`validCfg(over)`** helper that returns `GM.Config.getDefaults()` merged with overrides. Use those.

First, fix the existing appearance-invalid case: in the `--- Validation.validate: invalid ---` block, find the case that disables appearance (uses `{ fillEnabled: false, strokeEnabled: false }`) and change the override to `{ markCircle: false, markCross: false }` — the trigger moved from fill/stroke to shape.

Then add a v6 block before the summary:
```javascript
console.log("--- Validation v6: shape requirement + weights ---");
(function () {
    var noShape = GM.Validation.validate(validCfg({ markCircle: false, markCross: false }), L);
    assert(noShape.valid === false, "no shape -> invalid");
    var crossOnly = GM.Validation.validate(validCfg({ markCircle: false, markCross: true }), L);
    assert(crossOnly.valid === true, "cross only -> valid");
    var badHalo = GM.Validation.validate(validCfg({ haloWeight: 0 }), L);
    assert(badHalo.valid === false, "haloWeight 0 -> invalid");
    var ok = GM.Validation.validate(validCfg(), L);
    assert(ok.valid === true && ok.settings.regWeight === 1.0, "defaults valid, regWeight parsed");
})();
```

- [ ] **Step 7: Build + run tests**

Run: `npm run verify`
Expected: build OK, ALL SUITES PASSED. (Generate now gated on circle/cross + weights; fill/stroke still in schema but no longer block.)

- [ ] **Step 8: Commit**

```bash
git add src/lib/validation.js src/lib/utils.js src/ui.js src/locale.js tests/test_validation.js
git commit -m "feat(validation): require circle/cross + validate mark weights; presetEquals keys"
```

---

## Task 5: main.process — render via placeMarkGroup, fixed layer

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Replace appearance/layer resolve with fixed-layer + mark opts**

In `src/main.js` `process()`, replace the swatch/color/layer block (from `var resolvedLayerName = ...` through the `var radius = markSizePoints / 2;` lines) with:
```javascript
            // Fixed target layer "Grommet Marks" (created if missing, silently).
            var targetLayer = GM.Illustrator.getOrCreateLayer(GM.CONSTANTS.SENTINEL_CREATE);

            var markSizePoints = cfg.markSize * unitFactor;
            var markOpts = {
                circle: !!cfg.markCircle,
                cross: !!cfg.markCross,
                regWeight: cfg.regWeight,
                haloWeight: cfg.haloWeight
            };
```
(Removes `resolvedLayerName`, the WARN_LAYER_CREATED branch, fill/stroke `getOrCreateSwatch` + fallback warnings, `radius`.)

- [ ] **Step 2: Update the place() helper to render a mark group**

In `src/main.js`, replace the `place()` function body:
```javascript
            function place(x, y) {
                var key = Math.round(x * 10) / 10 + "|" + Math.round(y * 10) / 10;
                if (placed[key]) return;
                placed[key] = true;
                var ok = GM.Illustrator.placeMarkGroup(targetLayer, x, y, markSizePoints, markOpts);
                if (!ok) failedMarks++;
            }
```

- [ ] **Step 3: Build + run tests**

Run: `npm run verify`
Expected: build OK, ALL SUITES PASSED (main has no node tests; suite unaffected).

- [ ] **Step 4: Manual smoke (optional, requires Illustrator)**

Open a doc, run `dist/illustrator-grommet-marks.jsx`, Generate. Expect circles in registration with a white halo on the "Grommet Marks" layer. (Full manual matrix in Task 8.)

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat(main): render via placeMarkGroup on fixed Grommet Marks layer"
```

---

## Task 6: Contract UI — remove Appearance panel, signature, dead helpers

**Files:**
- Modify: `src/ui.js`
- Modify: `src/main.js`
- Test: `tests/test_ui_dialog.js`

- [ ] **Step 1: Remove the Appearance panel block**

In `src/ui.js`, delete the entire Appearance panel block — from the `// ===== Appearance Panel ... =====` comment header through the `wGrp.add("statictext", undefined, GM.L.POINTS);` line (the `appPanel`, `layerGrp`, `fillGrp`, `strokeGrp`, `wGrp` and all their controls: `layerDDL`, `fillCB`, `fillDDL`, `fillOPCB`, `strokeCB`, `strokeDDL`, `strokeOPCB`, `weightInput`).

- [ ] **Step 2: Remove Appearance handlers**

In `src/ui.js`, delete the Appearance handlers block: the `fillCB.onClick`, `strokeCB.onClick`, `fillOPCB.onClick`, `strokeOPCB.onClick`, `layerDDL.onChange`, `fillDDL.onChange`, `strokeDDL.onChange` assignments (the section under `// ===== Appearance handlers =====`).

- [ ] **Step 3: Change buildDialog signature + unify width with ZSM**

In `src/ui.js`, change:
```javascript
    buildDialog: function (pData, layerInfo, swatchInfo, pathInfo) {
```
to:
```javascript
    buildDialog: function (pData, pathInfo) {
```
And unify the dialog width with the sibling tools (ZSM = 390) — change `dlg.preferredSize.width = 400;` to:
```javascript
        dlg.preferredSize.width = 390;   // match ZSM/BRE; content grows if needed
```

- [ ] **Step 4: Remove fill/stroke/layer fields from gatherAll**

In `gatherAll()`, delete these properties: `markLayerName`, `fillEnabled`, `fillSwatchName`, `fillOverprint`, `strokeEnabled`, `strokeSwatchName`, `strokeOverprint`, `strokeWeight`, and `isRound`. Keep `markSize`, `markCircle`, `markCross`, `regWeight`, `haloWeight`. The Mark/placement/preset fields remain.

- [ ] **Step 5: Remove fill/stroke/layer from applyAll**

In `applyAll(s)`, delete the lines setting `layerDDL`, `fillCB`, `fillDDL`, `fillOPCB`, `strokeCB`, `strokeDDL`, `strokeOPCB`, `weightInput`, and their `.enabled` toggles. Keep the `circleCB/crossCB/regWIn/haloWIn` lines from Task 3.

- [ ] **Step 6: Remove weight/stroke validation targets**

In `validationTargets`, delete `{ et: weightInput, rule: R.strokeWeight }` (now undefined). Keep `regWIn`/`haloWIn` targets.

- [ ] **Step 7: Remove dead dropdown helpers**

In `src/ui.js`, delete the now-unused methods `selectDDL`, `ddlValue`, `toDisplay`, `toStorage` from the `GM.UI` object. (Keep `getUnitDisplayNames`, `getUnitKey`, `selectUnit`, `addSeparator`, `buildEdgePanel`, `buildDialog`.)

- [ ] **Step 8: Update main.js buildDialog call**

In `src/main.js` `run()`, replace:
```javascript
            var layerInfo = GM.Illustrator.getLayerNames();
            var swatchInfo = GM.Illustrator.getSwatchNames();
            var pathInfo = GM.Illustrator.getSelectedPathInfo();

            var ui = GM.UI.buildDialog(pData, layerInfo, swatchInfo, pathInfo);
```
with:
```javascript
            var pathInfo = GM.Illustrator.getSelectedPathInfo();

            var ui = GM.UI.buildDialog(pData, pathInfo);
```

- [ ] **Step 9: Update UI dialog tests — drop Appearance, fix signature**

In `tests/test_ui_dialog.js`:
- In `buildUI`, change the call to drop the layer/swatch args:
```javascript
function buildUI(pData, pathInfo) {
    SUI.install();
    var ui = GM.UI.buildDialog(pData || freshPData(),
        pathInfo || { ok: false, reason: "no-selection" });
    return ui;
}
```
- Delete the `--- UI: Appearance label column ---` test block entirely.
- In `--- UI: shape locked to circle ---`, remove the `isRound` assertion line `assert(ui.gatherAll().isRound === true, ...)` (field gone); keep the radio-count assertion (still 12).
- In `--- UI: applyAll/gatherAll preserves spacing mode ---`, the seed uses `GM.Config.getDefaults()` so it still has shape fields — no change needed beyond ensuring no `fill*`/`stroke*` assertions remain (there are none in that block).

- [ ] **Step 10: Build + run tests**

Run: `npm run verify`
Expected: build OK, ALL SUITES PASSED.

- [ ] **Step 11: Commit**

```bash
git add src/ui.js src/main.js tests/test_ui_dialog.js
git commit -m "refactor(ui): remove Appearance panel, fill/stroke/layer controls, dead helpers"
```

---

## Task 7: Contract data layer — remove old fields, helpers, locale keys

**Files:**
- Modify: `src/config.js`
- Modify: `src/constants.js`
- Modify: `src/illustrator.js`
- Modify: `src/lib/validation.js`
- Modify: `src/lib/utils.js`
- Modify: `src/locale.js`
- Test: `tests/test_storage_migrations.js`, `tests/test_validation.js`

- [ ] **Step 1: Remove old fields from getDefaults**

In `src/config.js`, delete from the return object: `isRound`, `markLayerName`, `fillEnabled`, `fillSwatchName`, `fillOverprint`, `strokeEnabled`, `strokeSwatchName`, `strokeOverprint`, `strokeWeight`. Final order: offsets, edges, mirrors, units, markSize, markCircle, markCross, regWeight, haloWeight, placementMode, cornerZone, pathDist.

- [ ] **Step 2: Remove SWATCH_NAME constant**

In `src/constants.js`, delete the line `SWATCH_NAME: "Grommet Marks",`.

- [ ] **Step 3: Remove dead illustrator methods**

In `src/illustrator.js`, delete: `isSystemSwatch`, `getLayerNames`, `getSwatchNames`, `resolveLayerName`, `layerExists`, `getOrCreateSwatch`, and `placeMark` (the single-mark renderer; `placeMarkGroup` replaces it). Simplify `getOrCreateLayer` to always resolve the fixed name:
```javascript
    /**
     * Returns the fixed "Grommet Marks" layer, creating it if absent.
     * @returns {Layer} Target layer.
     */
    getOrCreateLayer: function () {
        var doc = GM.Illustrator.doc;
        try {
            return doc.layers.getByName(GM.CONSTANTS.LAYER_NAME);
        } catch (e) {
            var l = doc.layers.add();
            l.name = GM.CONSTANTS.LAYER_NAME;
            return l;
        }
    },
```
Update the `getOrCreateLayer` call in `src/main.js` Task 5 already uses `getOrCreateLayer(GM.CONSTANTS.SENTINEL_CREATE)` — change it to `getOrCreateLayer()` (no arg).

- [ ] **Step 4: Remove strokeWeight rule + block from validation**

In `src/lib/validation.js`: delete the `strokeWeight: { ... }` rule line, and delete the `var strokeWeight = cfg.strokeWeight; if (cfg.strokeEnabled) { ... }` block, and the `if (cfg.strokeEnabled) settings.strokeWeight = strokeWeight;` line in the clean-settings block.

- [ ] **Step 5: Remove old keys from presetEquals**

In `src/lib/utils.js`, reduce the flat `keys` array to:
```javascript
        var keys = [
            "offsetX", "offsetY", "bottomMirror", "rightMirror",
            "units", "markSize",
            "markCircle", "markCross", "regWeight", "haloWeight"
        ];
```

- [ ] **Step 6: Remove dead locale keys**

In `src/locale.js` (both `en` and `cs`), delete keys no longer referenced: `LAYER`, `FILL`, `STROKE`, `OVERPRINT`, `WEIGHT`, `POINTS`, `TIP_FILL`, `TIP_STROKE`, `TIP_LAYER`, `TIP_WEIGHT`, `TIP_OVERPRINT`, `CREATE_LABEL`, `DDL_MISSING_SUFFIX`, `WARN_SWATCH_FALLBACK`, `WARN_LAYER_CREATED`. Keep everything else.

- [ ] **Step 7: Fix the existing forward-fill assertions (now-dead fields)**

The seeding helper is **`setup(content)`** (sets the mock file, accepts object or string). The existing `--- Forward-fill: new keys added to old presets ---` block (around lines 196–208) asserts `p.isRound === true` and `p.fillEnabled === true` — both removed in this task. Replace those two assertion lines:
```javascript
    assert(p.isRound === true, "forward-fill: isRound added from defaults");
    assert(p.fillEnabled === true, "forward-fill: fillEnabled added");
```
with v6 shape-field assertions:
```javascript
    assert(p.markCircle === true, "forward-fill: markCircle added from defaults");
    assert(p.markCross === false, "forward-fill: markCross added from defaults");
    assert(p.regWeight === 1.0, "forward-fill: regWeight added");
    assert(p.haloWeight === 3.0, "forward-fill: haloWeight added");
```

Leave the `--- Migration: v3.0 localized sentinels -> __create__ ---` block as-is: it seeds a legacy `fillSwatchName` and checks `storage.js` sentinel migration still normalizes legacy data on disk (valuable robustness test; `storage.js` migration code is not changed by this plan). Forward-fill only *adds* missing default keys — it does not strip the explicitly-seeded legacy field, so that test stays green.

- [ ] **Step 8: Sweep tests for other dead-field assertions**

```bash
grep -rn "isRound\|fillEnabled\|strokeEnabled\|strokeWeight\|markLayerName\|fillSwatchName\|strokeSwatchName\|fillOverprint\|strokeOverprint" tests/
```
Expected remaining hits: only (a) the legacy *input* in the localized-sentinel migration test (seeding, keep), and (b) any seed objects — not assertions. Fix any **assertion** still referencing a removed field.

- [ ] **Step 9: Build + run tests**

Run: `npm run verify`
Expected: build OK, ALL SUITES PASSED.

- [ ] **Step 10: Commit**

```bash
git add src/config.js src/constants.js src/illustrator.js src/lib/validation.js src/lib/utils.js src/locale.js tests/
git commit -m "refactor: drop fill/stroke/layer schema, swatch helpers, dead locale keys (v6 contract)"
```

---

## Task 8: Docs + release

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/MANUAL_TEST.md`

- [ ] **Step 1: README — Funkce + changelog**

In `README.md`, update the Funkce bullets: replace the "Vzhled — výplň a/nebo obrys…" bullet with a uniform-mark bullet:
```markdown
- **Jednotný vzhled značky** — registrační Esko-styl terč (bílé halo + registrační tah, kruh a/nebo kříž); vždy na samostatnou vrstvu „Grommet Marks".
```
Remove the "Robustnost — chybějící vzorník…" sub-clause about swatch fallback (no longer applies). Add changelog entry at the top:
```markdown
### v6.0.0 (2026-06)
- **BREAKING:** Sjednocený vzhled značky — registrační Esko terč (bílé halo knockout + registrační tah s přetiskem, kruh a/nebo kříž, jedna velikost). Zrušena volba výplně/tahu/vrstvy; značky vždy na pevnou vrstvu „Grommet Marks".
- **UI:** Zrušen panel Vzhled; ovládání tvaru a tlouštěk tahů přesunuto do panelu Značka. Dialog jednosloupcový kompaktní (~795 px) — řeší uříznutá tlačítka na 13" displejích.
- **SCHEMA:** Odebráno 9 polí (fill/stroke/layer); přidáno markCircle/markCross/regWeight/haloWeight; forward-fill migrace.
```

- [ ] **Step 2: ARCHITECTURE — schema, data flow, layout, modules, status**

In `docs/ARCHITECTURE.md`:
- Title → `Architecture: Grommet Marks v6.0.0`.
- Settings object: remove the 9 fields, add markCircle/markCross/regWeight/haloWeight.
- Data flow: `placeMark` → `placeMarkGroup`; remove getLayerNames/getSwatchNames from the buildDialog inputs (`buildDialog(pData, pathInfo)`).
- "Kde hledat co": `placeMark` → `placeMarkGroup`; remove swatch row.
- Layout dialogu → v6 single column (Předvolby, Umístění, Hrany/Cesta, Rohové zóny, Značka, patička, tlačítka); note Vzhled removed.
- Aktuální stav → v6.0.0 cyklus 5 (uniform marks + compact).

- [ ] **Step 3: MANUAL_TEST — new appearance section, drop stale**

In `docs/MANUAL_TEST.md`:
- Version header → v6.0.0, date 2026-06-13.
- Replace section B (swatch fallback / locked-layer parts about swatches) appearance items and the C7 "Tvar a vzhled" item with a new section:
```markdown
## G) NOVÉ v6 — Jednotný vzhled značky

### G1 — Kruh (default)
- [ ] Generovat s default: značky = kruh, registrační tah na bílém halu (halo širší).
- [ ] Bílý kruh **knockout** (vykrojí motiv pod sebou), registrační kruh **overprint** (Okno ▸ Atributy).

### G2 — Kříž
- [ ] Zaškrtni Kříž, odškrtni Kruh → značka = kříž (rameno = Velikost), stejná halo+reg konstrukce.

### G3 — Kruh + kříž
- [ ] Oba zaškrtnuté → kruh i kříž ve společné grupě, společný střed.

### G4 — Žádný tvar
- [ ] Odškrtni oba → Generovat **šedé** (live validace).

### G5 — Tloušťky
- [ ] Změň Reg. tah / Bílé halo → tahy odpovídají; halo > reg = viditelné halo.

### G6 — Pevná vrstva
- [ ] Značky vždy na vrstvě „Grommet Marks" (vytvoří se když chybí); zamčená vrstva se odemkne a zase zamkne.
```
- Remove obsolete B1/B2/B4 swatch/layer-choice items and C7.

- [ ] **Step 4: Build + run tests (final)**

Run: `npm run verify`
Expected: build OK, ALL SUITES PASSED.

- [ ] **Step 5: Commit + tag**

```bash
git add README.md docs/ARCHITECTURE.md docs/MANUAL_TEST.md
git commit -m "docs: v6.0.0 — uniform Esko marks, compact layout, manual test section G"
git tag gm-v6.0.0 HEAD
```

---

## Notes for the executor

- **Expand-contract**: Tasks 1–3 are additive (suite green, dialog temporarily carries both old + new controls). Task 4 flips the gate. Task 5 flips rendering. Tasks 6–7 remove the old path. Never skip ahead — each task depends on the prior leaving green.
- **ES3**: no `let`/`const`/arrow/`=>`/template literals. `for` loops, `var`, named functions only.
- **Weights are points** (strokeWidth is pt) — no unit conversion on regWeight/haloWeight.
- **Overprint semantics**: registration strokes `strokeOverprint=true`; white halo `strokeOverprint=false` (knockout). Not user-configurable.
- After all tasks: run `bash tools/audit-incubator.sh` to confirm dist freshness, then proceed to `finishing-a-development-branch` and deploy to `Projects/extendscript-automation`.
```
