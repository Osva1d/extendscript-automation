# Grommet Marks — Test Plan v4.1.0

> **Version:** 4.1.0
> **Test Coverage:** 8 manual test cases + automated suites (`npm test`)
> **Last Updated:** 2026-05-28
>
> Automated suites (`npm test`) cover the pure modules: core math, storage
> migrations, preview model, UI state, validation. The cases below are the
> manual P0 checks that require a running Illustrator — especially the
> schematic preview's custom drawing, which cannot be unit-tested.

---

## Test Case 1: System Swatch Localization

**Objective:** Verify that system swatches are filtered correctly in all Illustrator localizations.

### Setup
- Adobe Illustrator with Czech locale (CZ)
- Adobe Illustrator with English locale (EN) — or switch locale in preferences

### Test Steps

1. **Czech Illustrator:**
   - Open Illustrator in Czech locale
   - Open any document
   - Run `dist/illustrator-grommet-marks.jsx`
   - Open Fill or Stroke dropdown

2. **Expected Result (CZ):**
   - System swatches NOT visible: `[Registrační]`, `[Žádná]`
   - User swatches visible (no brackets)
   - No error: "vzorník nenalezen"

3. **English Illustrator:**
   - Switch locale to English (or use EN version)
   - Open any document
   - Run `dist/illustrator-grommet-marks.jsx`
   - Open Fill or Stroke dropdown

4. **Expected Result (EN):**
   - System swatches NOT visible: `[Registration]`, `[None]`
   - User swatches visible
   - No error: "swatch not found"

### Pass Criteria
✅ No system swatches in dropdowns (any locale)  
✅ No "swatch not found" errors

---

## Test Case 2: Global X/Y Offset Alignment

**Objective:** Verify that marks align correctly using global X/Y offsets, especially at corners.

### Setup
- Create new document: 200×200mm artboard
- Run script with following settings:
  - **Offset X:** 10mm
  - **Offset Y:** 15mm
  - **Top edge:** Enabled, 4 marks (fixed count)
  - **Left edge:** Enabled, 4 marks (fixed count)
  - All other edges disabled

### Test Steps

1. Run script with above settings
2. Measure top-left corner mark center:
   - Use Illustrator's Info panel (Window > Info)
   - Select mark, read X/Y coordinates
3. Measure all top edge marks:
   - Vertical position should be constant
4. Measure all left edge marks:
   - Horizontal position should be constant

### Expected Results

| Mark Position | X Coordinate | Y Coordinate |
|---------------|--------------|--------------|
| Top-left corner | 10mm from left edge | 15mm from top edge |
| All top marks | Variable | **15mm from top** (constant) |
| All left marks | **10mm from left** (constant) | Variable |

### Pass Criteria
✅ Corner mark at exact [10mm, 15mm] intersection  
✅ All top marks share Y = 15mm  
✅ All left marks share X = 10mm

---

## Test Case 3: v2→v3 Preset Migration

**Objective:** Verify that legacy v2 presets are automatically migrated to v3 schema.

### Setup

1. **Create Legacy v2 Preset:**
   - Manually create file: `~/Library/Application Support/GrommetMarks/GrommetMarksSettings.json`
   - Content:
     ```json
     {
       "[Výchozí]": {
         "top": {
           "enabled": true,
           "useNumber": true,
           "number": 8,
           "spacing": 100,
           "x": 5,
           "y": 10
         },
         "left": {
           "enabled": true,
           "useNumber": false,
           "number": 8,
           "spacing": 120,
           "x": 5,
           "y": 10
         },
         "bottom": {
           "enabled": false,
           "useNumber": true,
           "number": 8,
           "spacing": 100,
           "x": 5,
           "y": 10
         },
         "right": {
           "enabled": false,
           "useNumber": true,
           "number": 8,
           "spacing": 100,
           "x": 5,
           "y": 10
         },
         "units": "Milimetry",
         "markSize": 3,
         "isRound": true,
         "markLayerName": "[Vytvořit 'Grommet Marks']",
         "fillEnabled": true,
         "fillSwatchName": "[Vytvořit 'Grommet Marks']",
         "fillOverprint": true,
         "strokeEnabled": false,
         "strokeSwatchName": "[Vytvořit 'Grommet Marks']",
         "strokeOverprint": true,
         "strokeWeight": 1
       }
     }
     ```

2. **Run Script:**
   - Open Illustrator
   - Run `dist/illustrator-grommet-marks.jsx`

### Expected Results

**UI State After Migration:**
- **Offset X field:** 5mm (extracted from `top.x`)
- **Offset Y field:** 10mm (extracted from `top.y`)
- **Top edge:** Enabled, 8 marks (fixed count)
- **Left edge:** Enabled, spacing mode, 120mm
- **No x/y fields in edge panels** (removed in v3)

**Settings File After Save:**
```json
{
  "__default__": {
    "offsetX": 5,
    "offsetY": 10,
    "top": {
      "enabled": true,
      "useNumber": true,
      "number": 8,
      "spacing": 100
    },
    "left": {
      "enabled": true,
      "useNumber": false,
      "number": 8,
      "spacing": 120
    },
    ...
  }
}
```

### Pass Criteria
✅ Global offsets populated from legacy `top.x` and `top.y`  
✅ Edge panels show no X/Y inputs  
✅ All other settings preserved  
✅ Saved file uses v3.1 schema (no per-edge `x`/`y`, `__default__` key, `"mm"` unit key)

---

## Test Case 4: Tooltip Display

**Objective:** Verify that all 15 tooltips appear correctly when hovering over UI fields.

### Test Steps

1. Run `dist/illustrator-grommet-marks.jsx`
2. Hover over each field listed below for 1-2 seconds
3. Verify Czech tooltip text appears in ScriptUI's tooltip box (near cursor)

### Tooltip Verification Checklist

| # | UI Field | Expected Tooltip (Czech) |
|---|----------|--------------------------|
| 1 | Odsazení X | "Vzdálenost středu značek od levého a pravého okraje artboardu" |
| 2 | Odsazení Y | "Vzdálenost středu značek od horního a dolního okraje artboardu" |
| 3 | Počet ok (Top) | "Pevný počet značek na hraně (rozestup se dopočítá)" |
| 4 | Rozestup (Top) | "Preferovaná vzdálenost mezi středy značek (počet se dopočítá)" |
| 5 | Počet ok (Left) | "Pevný počet značek na hraně (rozestup se dopočítá)" |
| 6 | Rozestup (Left) | "Preferovaná vzdálenost mezi středy značek (počet se dopočítá)" |
| 7 | Zrcadlit horní | "Použije stejné nastavení jako horní strana" |
| 8 | Zrcadlit levou | "Použije stejné nastavení jako levá strana" |
| 9 | Velikost | "Průměr kruhu nebo délka strany čtverce v měrných jednotkách" |
| 10 | Výplň checkbox | "Barevná výplň značky" |
| 11 | Obrys checkbox | "Obrysová linka značky" |
| 12 | Vrstva dropdown | "Cílová vrstva pro umístění značek" |
| 13 | Přetisk (Výplň) | "Značka bude tištěna přes ostatní barvy (overprint)" |
| 14 | Přetisk (Obrys) | "Značka bude tištěna přes ostatní barvy (overprint)" |
| 15 | Tloušťka | "Tloušťka obrysové linky v bodech (points)" |

### Pass Criteria
✅ All 15 tooltips display correct Czech text  
✅ Tooltips appear within 1-2 seconds of hover  
✅ No JavaScript errors in ExtendScript console

---

## Test Case 5: Build System Integrity

**Objective:** Verify that the build system correctly concatenates modules and produces valid output.

### Test Steps

1. **Clean Build:**
   ```bash
   cd /Users/ladislavosvald/Dev/Sandbox/_incubator/grommet-marks
   rm -f dist/illustrator-grommet-marks.jsx
   bash tools/build.sh
   ```

2. **Verify Output:**
   ```bash
   test -f dist/illustrator-grommet-marks.jsx && echo "✅ File exists" || echo "❌ Build failed"
   wc -l dist/illustrator-grommet-marks.jsx  # Should be ~1537 lines
   ls -lh dist/illustrator-grommet-marks.jsx  # Should be ~59KB
   ```

3. **Verify Version Header:**
   ```bash
   head -15 dist/illustrator-grommet-marks.jsx
   ```

4. **Verify IIFE Wrapper:**
   ```bash
   head -20 dist/illustrator-grommet-marks.jsx | grep "(function ()"
   tail -5 dist/illustrator-grommet-marks.jsx | grep "})();"
   ```

5. **Verify Module Order:**
   ```bash
   grep -n "// JSON Polyfill" dist/illustrator-grommet-marks.jsx    # Should be ~line 17
   grep -n "GM.CONSTANTS =" dist/illustrator-grommet-marks.jsx      # Should be ~line 151
   grep -n "GM.Config =" dist/illustrator-grommet-marks.jsx         # Should be ~line 400
   grep -n "GM.Core =" dist/illustrator-grommet-marks.jsx           # Should be ~line 583
   grep -n "GM.Illustrator =" dist/illustrator-grommet-marks.jsx    # Should be ~line 667
   grep -n "GM.UI =" dist/illustrator-grommet-marks.jsx             # Should be ~line 814
   grep -n "GM.Main =" dist/illustrator-grommet-marks.jsx           # Should be ~line 1365
   ```

6. **Verify Entry Point:**
   ```bash
   tail -3 dist/illustrator-grommet-marks.jsx
   # Should contain: GM.Main.run();
   ```

### Expected Results

**Console Output:**
```
Build complete: dist/illustrator-grommet-marks.jsx (~1537 lines)
```

**File Properties:**
- Size: ~59KB
- Lines: ~1537
- Line 2: `/*`
- Line 5: `* Version:     3.1.0`
- Line 14: `(function () {`
- Last line: `})();`

### Pass Criteria
✅ `dist/illustrator-grommet-marks.jsx` created successfully
✅ Version header shows `3.1.0`
✅ IIFE wrapper present
✅ All 7 modules concatenated in correct order
✅ Entry point `GM.Main.run();` present
✅ No syntax errors (run in Illustrator without errors)

---

## Test Case 6: Regression — Core Geometry Unchanged

**Objective:** Verify that `GM.Core.calcPositions()` produces the same results as v2.x (no geometry regressions).

### Setup
- Create new document: 300×200mm artboard
- Use marks with **fixed count** mode

### Test Steps

1. **Run Script:**
   - **Top edge:**
     - Enabled: Yes
     - Mode: Počet ok (fixed count)
     - Count: 5 marks
     - Offset Y: 8mm
   - All other edges disabled

2. **Calculate Expected Spacing:**
   ```
   Artboard width: 300mm = ~850.39 points
   Offset from each end: 8mm × 2.8346 = ~22.68 points
   Available space: 850.39 - (2 × 22.68) = 805.03 points
   Spacing between 5 marks: 805.03 / (5 - 1) = 201.26 points
                            = ~71mm
   ```

3. **Measure Actual Marks:**
   - Select all top marks
   - Use Info panel to read X coordinates
   - Calculate spacing: `X[n+1] - X[n]`

### Expected Results

| Mark # | Expected X (approx) | Expected Y |
|--------|---------------------|------------|
| 1 | 22.68 pt (~8mm from left) | Top edge - 8mm |
| 2 | 223.94 pt | Top edge - 8mm |
| 3 | 425.20 pt (center) | Top edge - 8mm |
| 4 | 626.46 pt | Top edge - 8mm |
| 5 | 827.71 pt (~8mm from right) | Top edge - 8mm |

**Spacing Between Marks:** ~201.26 points (~71mm)

### Pass Criteria
✅ Marks evenly spaced at ~71mm intervals  
✅ First mark ~8mm from left edge  
✅ Last mark ~8mm from right edge  
✅ All marks at Y = top edge - 8mm  
✅ Geometry identical to v2.x (no regression)

---

## Test Case 7: Schematic Preview (v4.1.0)

**Objective:** Verify the Náhled (preview) panel renders and updates, and that it degrades gracefully.

### Test Steps

1. Run `dist/illustrator-grommet-marks.jsx` on any open document.
2. Observe the **Náhled** panel: an artboard rectangle with dots on the active edges, plus a text line "Aktivní hrany: …" below.
3. Toggle the **Horní** edge off → its dots disappear and the summary updates.
4. Change **Horní** count (e.g. 10 → 3) → the number of top dots changes.
5. Enable **Zrcadlit horní** on the Dolní edge → bottom dots mirror the top configuration.
6. Switch a preset / click **Reset** → preview reflects the loaded values.

### Pass Criteria
✅ Rectangle + dots render for active edges
✅ Diagram updates live on edge enable / count / mirror changes
✅ Text summary always matches the active edges (even if the drawing does not render)
✅ No ExtendScript console errors

> **Graceful degradation:** if the rectangle/dots do not render on this Illustrator
> version, the dialog must still be fully usable and the "Aktivní hrany" summary
> must still be correct. Report the Illustrator version if drawing fails.

---

## Test Case 8: Mirror Inline + State Restore (TD-001 / TD-003)

**Objective:** Verify the mirror checkbox lives inside its edge group and restores state.

### Test Steps

1. Run the script. In the **Hrany** panel, confirm "Zrcadlit horní" sits inside the Dolní edge row (and "Zrcadlit levou" inside the Pravá row).
2. On the Dolní edge: enable it, set a count → then tick **Zrcadlit horní**. The Dolní controls disable.
3. Untick **Zrcadlit horní** → the Dolní edge returns to its previous enabled state and values (not forced off).
4. Generate marks → bottom edge while mirrored uses the top edge's configuration.

### Pass Criteria
✅ Mirror checkbox is visually inside the edge group it controls (TD-001)
✅ Enabling mirror disables that edge's controls
✅ Disabling mirror restores the previous enabled state (TD-003)
✅ Mirrored generation matches the source edge

---

## Test Environment

**Required:**
- macOS (11.0+)
- Adobe Illustrator (2020+)
- Bash shell (macOS default)
- Node.js (for `npm test`)

**Optional:**
- ExtendScript Toolkit (for debugging)
- Illustrator in multiple locales (CZ, EN)

---

## Regression Test Summary

| Test Case | v2.x Behavior | v3.0 Expected | Status |
|-----------|---------------|---------------|--------|
| System swatches | Failed in CZ locale | Works in all locales | ✅ Fixed |
| Corner alignment | Misaligned (per-edge offsets) | Aligned (global offsets) | ✅ Improved |
| Preset migration | N/A | Auto-converts v2→v3 | ✅ New |
| Tooltips | None | 15 tooltips | ✅ New |
| Build process | Single file | Modular build | ✅ New |
| Core geometry | Correct | **Must remain identical** | ⚠️ Test |

---

## Bug Reporting

If any test fails, report with:
1. **Test Case Number**
2. **Illustrator Version** (e.g., 28.0)
3. **Locale** (CZ / EN / other)
4. **Expected vs Actual Result**
5. **ExtendScript Console Output** (if errors)

**Report To:** [Project Issue Tracker or Maintainer Email]

---

**Test Plan Version:** 1.1
**Prepared By:** Osva1d
**Date:** 2026-03-22
