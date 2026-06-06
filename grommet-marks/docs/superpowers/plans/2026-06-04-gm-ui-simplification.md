# Grommet Marks v4.2.0 — UI Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the GM dialog — lock the mark shape to circle, replace the Reset button with a ZSM-style revert (↺), fix the live-validation text colour (invisible on dark UI), and align the Appearance panel dropdowns.

**Architecture:** All changes are in `src/ui.js` (the ScriptUI dialog) plus `src/locale.js` and the version files. The pure modules (core/validation/storage/ui_state) are untouched. The new `tests/test_ui_dialog.js` harness verifies shape removal, revert behaviour, and dropdown alignment against the mock ScriptUI tree.

**Tech Stack:** ExtendScript (ES3), ScriptUI, Node.js (tests), bash (build).

**Spec:** `docs/superpowers/specs/2026-06-04-gm-ui-simplification-design.md`

---

### Task 1: Version bump → 4.2.0

**Files:**
- Modify: `package.json:3`
- Modify: `src/constants.js:10`
- Modify: `tools/build.sh:4`

- [ ] **Step 1: Bump package.json**

Change line 3 from `"version": "4.1.0",` to `"version": "4.2.0",`.

- [ ] **Step 2: Bump constants.js**

Change line 10 from `VERSION: "4.1.0",` to `VERSION: "4.2.0",`.

- [ ] **Step 3: Bump build.sh header**

Change line 4 from `# Version:     4.1.0` to `# Version:     4.2.0`.

- [ ] **Step 4: Build to confirm version-drift guard passes**

Run: `cd grommet-marks && npm run build`
Expected: `Build complete: dist/illustrator-grommet-marks.jsx (NNN lines)` — no "version drift" error.

- [ ] **Step 5: Commit**

```bash
git add grommet-marks/package.json grommet-marks/src/constants.js grommet-marks/tools/build.sh grommet-marks/dist/illustrator-grommet-marks.jsx
git commit -m "chore(grommet-marks): bump version to 4.2.0"
```

---

### Task 2: Locale — add TIP_REVERT, remove shape + reset keys

**Files:**
- Modify: `src/locale.js` (EN block ~53–97, CS block ~167–211)

- [ ] **Step 1: EN — remove shape keys**

Delete these three lines from the EN block (around lines 53–55):
```javascript
            SHAPE_LABEL: "Shape:",
            ROUND: "Round",
            SQUARE: "Square",
```
Delete these two lines from the EN tooltips (around 96–97):
```javascript
            TIP_SHAPE_ROUND: "Marks will be circular",
            TIP_SHAPE_SQUARE: "Marks will be square",
```

- [ ] **Step 2: EN — remove reset keys, add revert tip**

Replace these two lines (around 74–75):
```javascript
            BTN_RESET: "Reset",
            TIP_RESET: "Reset all settings to factory defaults.",
```
with:
```javascript
            TIP_REVERT: "Discard unsaved changes and reload the selected preset.",
```

- [ ] **Step 3: CS — remove shape keys**

Delete from the CS block (around 167–169):
```javascript
            SHAPE_LABEL: "Tvar:",
            ROUND: "Kruh",
            SQUARE: "Čtverec",
```
Delete from CS tooltips (around 210–211):
```javascript
            TIP_SHAPE_ROUND: "Značka bude kruhová",
            TIP_SHAPE_SQUARE: "Značka bude čtvercová",
```

- [ ] **Step 4: CS — remove reset keys, add revert tip**

Replace (around 188–189):
```javascript
            BTN_RESET: "Reset",
            TIP_RESET: "Obnovit všechna nastavení na výchozí hodnoty.",
```
with:
```javascript
            TIP_REVERT: "Zahodit neuložené změny a znovu načíst předvolbu.",
```

- [ ] **Step 5: Verify locale sync + no stale refs yet**

Run: `cd grommet-marks && node --check src/locale.js && grep -c "TIP_REVERT" src/locale.js`
Expected: `2` (one per locale). (Build will fail until ui.js stops referencing removed keys — that's Tasks 3–4. Do NOT build yet.)

- [ ] **Step 6: Commit**

```bash
git add grommet-marks/src/locale.js
git commit -m "feat(grommet-marks): locale — add TIP_REVERT, drop shape + reset keys"
```

---

### Task 3: Lock mark shape to circle

**Files:**
- Modify: `src/ui.js` (markPanel ~299–305, gatherAll ~398, applyAll ~426–427, shape onClick ~562–575)
- Modify: `tests/test_ui_dialog.js` (Round/Square test ~113–127)

- [ ] **Step 1: Update the failing test first**

In `tests/test_ui_dialog.js`, replace the whole block (lines ~113–127, the
`--- UI: Round/Square radio exclusivity ---` section) with:

```javascript
// ===== TEST: shape is locked to circle (no shape control) =====
console.log("--- UI: shape locked to circle ---");
(function () {
    var ui = buildUI();
    assert(ui.gatherAll().isRound === true, "gather reports isRound:true (circle)");
    var w = SUI.lastWindow();
    // Only the 8 edge radios remain (4 edges × Count/Spacing); no shape radios.
    var radios = w.find(function (c) { return c.type === "radiobutton"; });
    assert(radios.length === 8, "exactly 8 radios (edges only, no shape radios)");
    done();
})();
```

- [ ] **Step 2: Run the test — it fails**

Run: `cd grommet-marks && node tests/test_ui_dialog.js`
Expected: FAIL — currently 10 radios (8 edge + 2 shape), and `GM.L.SQUARE` is undefined so the old block would also error. The new block reports `exactly 8 radios` FAIL (got 10).

- [ ] **Step 3: Remove the shape control in ui.js**

Delete these lines (markPanel, ~299–305):
```javascript
        markPanel.add("statictext", undefined, GM.L.SHAPE_LABEL);
        var roundRB = markPanel.add("radiobutton", undefined, GM.L.ROUND);
        roundRB.value = defCfg.isRound;
        roundRB.helpTip = GM.L.TIP_SHAPE_ROUND;
        var squareRB = markPanel.add("radiobutton", undefined, GM.L.SQUARE);
        squareRB.value = !defCfg.isRound;
        squareRB.helpTip = GM.L.TIP_SHAPE_SQUARE;
```

- [ ] **Step 4: Hardcode isRound in gatherAll**

Change the gatherAll line (~398) from:
```javascript
                isRound: roundRB.value,
```
to:
```javascript
                isRound: true,   // shape locked to circle (square removed v4.2.0)
```

- [ ] **Step 5: Remove shape lines from applyAll**

Delete these two lines (~426–427):
```javascript
            roundRB.value = s.isRound;
            squareRB.value = !s.isRound;
```

- [ ] **Step 6: Remove the shape onClick handlers**

Delete this whole block (~562–575, the Round/Square exclusivity handlers added earlier):
```javascript
        // Explicit Round/Square exclusivity. These radios are currently
        // consecutive siblings (ScriptUI would auto-group them), but gather()
        // reads roundRB.value directly, so a future control inserted between
        // them — or a runtime that doesn't group — would silently desync.
        // Set the opposite radio explicitly, same hardening as the edge radios.
        roundRB.onClick = function () {
            roundRB.value = true; squareRB.value = false;
            refreshModifiedIndicator();
        };
        squareRB.onClick = function () {
            squareRB.value = true; roundRB.value = false;
            refreshModifiedIndicator();
        };
```

- [ ] **Step 7: Run the test — it passes**

Run: `cd grommet-marks && node tests/test_ui_dialog.js`
Expected: PASS (8 radios, isRound:true). All assertions green.

- [ ] **Step 8: Commit**

```bash
git add grommet-marks/src/ui.js grommet-marks/tests/test_ui_dialog.js
git commit -m "feat(grommet-marks): lock mark shape to circle (remove Round/Square)"
```

---

### Task 4: Revert (↺) button replacing Reset

**Files:**
- Modify: `src/ui.js` (preset panel ~235–245, footer ~369–381, refreshModifiedIndicator ~585–599, reset onClick ~686)
- Modify: `tests/test_ui_dialog.js` (add revert test)

- [ ] **Step 1: Add the failing revert test**

In `tests/test_ui_dialog.js`, add this block just before the `===== SUMMARY =====`
line near the end:

```javascript
// ===== TEST: revert (↺) replaces Reset =====
console.log("--- UI: revert button ---");
(function () {
    var ui = buildUI();
    var w = SUI.lastWindow();
    // No Reset button anywhere.
    var resetBtns = w.find(function (c) { return c.type === "button" && c.text === "Reset"; });
    assert(resetBtns.length === 0, "Reset button removed");
    // A revert button exists.
    var revert = w.findOne(function (c) { return c.type === "button" && c.text === "↺"; });
    assert(!!revert, "revert (↺) button exists");
    // Disabled when nothing is modified (fresh [Default]).
    assert(revert.enabled === false, "revert disabled when not modified");

    // Modify a field, refresh the indicator via an offset onChange, expect enabled.
    var offX = w.findOne(function (c) { return c.type === "edittext"; });
    offX.text = "999";
    if (typeof offX.onChange === "function") offX.onChange();
    assert(revert.enabled === true, "revert enabled after a change");

    // Click revert → values return to the active preset ([Default] = 7).
    revert.onClick();
    assert(ui.gatherAll().offsetX === 7, "revert restores offsetX to default 7");
    done();
})();
```

- [ ] **Step 2: Run the test — it fails**

Run: `cd grommet-marks && node tests/test_ui_dialog.js`
Expected: FAIL — no ↺ button yet, and a "Reset" button still exists.

- [ ] **Step 3: Add the revert button in the preset panel**

In `src/ui.js`, the preset panel currently has (around 235–245):
```javascript
        var loadDDL = setPanel.add("dropdownlist", undefined, []);
        loadDDL.preferredSize.width = 170;
        loadDDL.helpTip = GM.L.TIP_PRESET_LOAD;

        var saveBtn = setPanel.add("button", undefined, GM.L.SAVE);
```
Insert a revert button between `loadDDL` and `saveBtn` so it reads:
```javascript
        var loadDDL = setPanel.add("dropdownlist", undefined, []);
        loadDDL.preferredSize.width = 170;
        loadDDL.helpTip = GM.L.TIP_PRESET_LOAD;

        var revertBtn = setPanel.add("button", undefined, "↺");
        revertBtn.preferredSize = [30, 24];
        revertBtn.helpTip = GM.L.TIP_REVERT;
        revertBtn.enabled = false;

        var saveBtn = setPanel.add("button", undefined, GM.L.SAVE);
```

- [ ] **Step 4: Enable revert alongside Save in refreshModifiedIndicator**

In `refreshModifiedIndicator` (around 588), change:
```javascript
            try { saveBtn.enabled = modified; } catch (e) {}
```
to:
```javascript
            try { saveBtn.enabled = modified; } catch (e) {}
            try { revertBtn.enabled = modified; } catch (e) {}
```

- [ ] **Step 5: Wire revert onClick (reuse the Reset handler's location)**

Replace the existing reset handler (around 686):
```javascript
        resetBtn.onClick = function () {
            applyAll(GM.Config.getDefaults());
            refreshModifiedIndicator();
        };
```
with:
```javascript
        revertBtn.onClick = function () {
            // Discard unsaved edits: reload the active preset as saved.
            // For [Default] (immutable) this restores factory defaults.
            var saved = pData.presets[pData.activePreset];
            if (saved) applyAll(saved);
            refreshModifiedIndicator();
        };
```

- [ ] **Step 6: Remove the Reset button + spacer from the footer; right-align buttons**

Replace the footer block (around 369–381):
```javascript
        var footerGrp = dlg.add("group");
        footerGrp.alignment = ["fill", "center"];
        footerGrp.spacing = 8;

        var resetBtn = footerGrp.add("button", undefined, GM.L.BTN_RESET);
        resetBtn.helpTip = GM.L.TIP_RESET;
        resetBtn.alignment = ["left", "center"];

        var spacer = footerGrp.add("group");
        spacer.alignment = ["fill", "fill"];

        footerGrp.add("button", undefined, GM.L.CANCEL, { name: "cancel" });
        var okBtn = footerGrp.add("button", undefined, GM.L.OK, { name: "ok" });
```
with:
```javascript
        var footerGrp = dlg.add("group");
        footerGrp.alignment = ["right", "center"];
        footerGrp.spacing = 8;

        footerGrp.add("button", undefined, GM.L.CANCEL, { name: "cancel" });
        var okBtn = footerGrp.add("button", undefined, GM.L.OK, { name: "ok" });
```

- [ ] **Step 7: Run the test — it passes**

Run: `cd grommet-marks && node tests/test_ui_dialog.js`
Expected: PASS — Reset gone, ↺ present, disabled→enabled→revert restores 7.

- [ ] **Step 8: Commit**

```bash
git add grommet-marks/src/ui.js grommet-marks/tests/test_ui_dialog.js
git commit -m "feat(grommet-marks): ZSM-style revert (↺) replaces Reset button"
```

---

### Task 5: Fix live-validation text colour (no black-on-dark)

**Files:**
- Modify: `src/ui.js` (`paintField`, ~488–504)

This is a ScriptUI-runtime colour fix; the mock stubs `graphics`, so it is
verified manually in Illustrator (Task 7 checklist), not by an automated test.

- [ ] **Step 1: Rewrite paintField to capture + restore the default pen**

Replace the existing `paintField` function (around 488–504):
```javascript
        function paintField(et, valid) {
            try {
                var g = et.graphics;
                if (g && g.newPen) {
                    g.foregroundColor = valid
                        ? g.newPen(g.PenType.SOLID_COLOR, [0.0, 0.0, 0.0, 1.0], 1)
                        : g.newPen(g.PenType.SOLID_COLOR, [0.85, 0.0, 0.0, 1.0], 1);
                }
            } catch (e) {}
        }
```
with (ports ZSM markFieldValidity — restore the field's own default colour
instead of forcing black, which vanishes on Illustrator's dark UI):
```javascript
        function paintField(et, valid) {
            try {
                var g = et.graphics;
                if (!g || !g.newPen) return;
                // Capture the field's DEFAULT foreground pen once (after the
                // graphics object is realised). "Valid" restores that theme
                // default — forcing black [0,0,0] makes the text invisible on
                // the dark UI. Light-grey is a safe fallback if it can't be read.
                if (et._gmDefPen === undefined) {
                    et._gmDefPen = g.foregroundColor || null;
                }
                if (valid) {
                    g.foregroundColor = et._gmDefPen
                        ? et._gmDefPen
                        : g.newPen(g.PenType.SOLID_COLOR, [0.75, 0.75, 0.75, 1.0], 1);
                } else {
                    g.foregroundColor = g.newPen(g.PenType.SOLID_COLOR, [0.90, 0.20, 0.20, 1.0], 1);
                }
            } catch (e) {}
        }
```

- [ ] **Step 2: Build + run all tests (no regressions)**

Run: `cd grommet-marks && npm run verify`
Expected: build OK, `ALL SUITES PASSED` (5 suites). The dialog test still passes —
the mock graphics accepts the new calls.

- [ ] **Step 3: Commit**

```bash
git add grommet-marks/src/ui.js grommet-marks/dist/illustrator-grommet-marks.jsx
git commit -m "fix(grommet-marks): live validation restores default text colour (no black-on-dark)"
```

---

### Task 6: Align Appearance panel dropdowns

**Files:**
- Modify: `src/ui.js` (Appearance panel ~316–355)
- Modify: `tests/test_ui_dialog.js` (add alignment test)

- [ ] **Step 1: Add the failing alignment test**

In `tests/test_ui_dialog.js`, add before `===== SUMMARY =====`:

```javascript
// ===== TEST: Appearance labels share a fixed width (aligned dropdowns) =====
console.log("--- UI: Appearance label column ---");
(function () {
    var ui = buildUI();
    var w = SUI.lastWindow();
    var LABEL_W = 75;
    function widthOf(pred) { var c = w.findOne(pred); return c ? c.preferredSize.width : -1; }
    var layer  = widthOf(function (c) { return c.type === "statictext" && c.text === GM.L.LAYER; });
    var fill   = widthOf(function (c) { return c.type === "checkbox"   && c.text === GM.L.FILL; });
    var stroke = widthOf(function (c) { return c.type === "checkbox"   && c.text === GM.L.STROKE; });
    var weight = widthOf(function (c) { return c.type === "statictext" && c.text === GM.L.WEIGHT; });
    assert(layer === LABEL_W,  "Vrstva label width fixed to " + LABEL_W);
    assert(fill === LABEL_W,   "Výplň checkbox width fixed to " + LABEL_W);
    assert(stroke === LABEL_W, "Obrys checkbox width fixed to " + LABEL_W);
    assert(weight === LABEL_W, "Tloušťka label width fixed to " + LABEL_W);
    done();
})();
```

- [ ] **Step 2: Run the test — it fails**

Run: `cd grommet-marks && node tests/test_ui_dialog.js`
Expected: FAIL — these labels/checkboxes have no fixed width yet (`-1` or auto).

- [ ] **Step 3: Fix widths in the Appearance panel**

In `src/ui.js`, change the layer label line (around 317) from:
```javascript
        var layerGrp = appPanel.add("group");
        layerGrp.add("statictext", undefined, GM.L.LAYER);
```
to:
```javascript
        var layerGrp = appPanel.add("group");
        var layerLbl = layerGrp.add("statictext", undefined, GM.L.LAYER);
        layerLbl.preferredSize.width = 75;
```

Change the fill checkbox (around 324) — add a width line after its helpTip:
```javascript
        var fillCB = fillGrp.add("checkbox", undefined, GM.L.FILL);
        fillCB.value = defCfg.fillEnabled;
        fillCB.helpTip = GM.L.TIP_FILL;
        fillCB.preferredSize.width = 75;
```

Change the stroke checkbox (around 336) — add a width line after its helpTip:
```javascript
        var strokeCB = strokeGrp.add("checkbox", undefined, GM.L.STROKE);
        strokeCB.value = defCfg.strokeEnabled;
        strokeCB.helpTip = GM.L.TIP_STROKE;
        strokeCB.preferredSize.width = 75;
```

Change the weight label (around 350) from:
```javascript
        var wGrp = appPanel.add("group");
        wGrp.add("statictext", undefined, GM.L.WEIGHT);
```
to:
```javascript
        var wGrp = appPanel.add("group");
        var weightLbl = wGrp.add("statictext", undefined, GM.L.WEIGHT);
        weightLbl.preferredSize.width = 75;
```

- [ ] **Step 4: Run the test — it passes**

Run: `cd grommet-marks && node tests/test_ui_dialog.js`
Expected: PASS — all four widths are 75.

- [ ] **Step 5: Commit**

```bash
git add grommet-marks/src/ui.js grommet-marks/tests/test_ui_dialog.js
git commit -m "fix(grommet-marks): align Appearance dropdowns via fixed label column"
```

---

### Task 7: Final verify, docs, rebuild dist

**Files:**
- Modify: `docs/ARCHITECTURE.md` (status + layout note)
- Modify: `docs/TECH_DEBT.md` (if the black-colour issue was tracked — it was P3, note resolved)

- [ ] **Step 1: Full verify**

Run: `cd grommet-marks && npm run verify`
Expected: build OK + `ALL SUITES PASSED` (5 suites).

- [ ] **Step 2: Version consistency**

Run: `cd grommet-marks && grep -h "4.2.0" package.json src/constants.js tools/build.sh`
Expected: three lines, all `4.2.0`.

- [ ] **Step 3: No stale references to removed symbols**

Run: `cd grommet-marks && grep -rnE "roundRB|squareRB|resetBtn|BTN_RESET|TIP_RESET|SHAPE_LABEL|TIP_SHAPE" src/ tests/`
Expected: no matches (empty).

- [ ] **Step 4: Update ARCHITECTURE.md**

In `docs/ARCHITECTURE.md`, update the "Layout dialogu" section: Mark panel is now
`jednotky / velikost` (no shape); preset panel has a revert ↺; footer is
`Storno · OK` (Reset removed). Update the status block to v4.2.0 with a one-line
note: "Tvar zamčen na kruh; revert (↺) nahradil Reset; oprava barvy validace; zarovnání Vzhled."

- [ ] **Step 5: Update TECH_DEBT.md**

If a "black-on-dark validation colour" item exists, mark it resolved in v4.2.0.
If not, append a one-line resolved note under a "Vyřešeno" heading. (Skip if no
such file section exists.)

- [ ] **Step 6: Rebuild dist + commit**

```bash
cd grommet-marks && npm run build
git add grommet-marks/docs/ARCHITECTURE.md grommet-marks/docs/TECH_DEBT.md grommet-marks/dist/illustrator-grommet-marks.jsx
git commit -m "docs(grommet-marks): update ARCHITECTURE/TECH_DEBT for v4.2.0, rebuild dist"
```

---

## Manual verification (Illustrator — after the automated plan)

These cannot be unit-tested (ScriptUI runtime). Run `dist/illustrator-grommet-marks.jsx`:

- [ ] Mark panel shows only **Měrné jednotky | Velikost** (no Tvar). Generated marks are circles.
- [ ] **↺** sits right after the preset dropdown; greyed on a clean [Default]; becomes active after any change; clicking it reverts to the preset's saved values (on [Default] → 7/7/10/105 etc.).
- [ ] No **Reset** button; footer is **Storno · Generovat** on the right.
- [ ] Enabled numeric fields (offsets, count, size) show **light/legible** text, not black-on-dark. Type a letter → field turns **red**; fix it → returns to normal colour.
- [ ] In **Vzhled**, the Vrstva / Výplň / Obrys dropdowns and the Tloušťka field are **vertically aligned** (same left edge).
- [ ] Esc cancels, Enter generates.

---

## Self-review notes
- Spec §1 (shape) → Task 3. §2 (revert) → Task 4. §3 (colour) → Task 5. §4 (alignment) → Task 6. Version → Task 1. Locale → Task 2. Docs/verify → Task 7. All covered.
- Names consistent: `revertBtn`, `_gmDefPen`, `LABEL_W = 75`, `isRound: true`.
- LABEL_W is **75** (not the spec's "~70") to safely fit `Tloušťka:` + the checkbox box in Czech — the test and code both use 75.
