# Architecture: Zünd & Summa Marks v26.3.1

> Copyright © 2025-2026 Osva1d. All rights reserved.
> Technický brief pro Antigravity agenty.
> Než začneš pracovat na tomto projektu, přečti celý dokument.

---

## Co skript dělá

Generuje registrační značky pro řezací plottery Zünd a Summa přímo do Adobe Illustratoru. Spouští se jako `.jsx` skript přes `File > Scripts`. Uživatel nastaví parametry v dialogu → skript vypočítá pozice → vykreslí značky → roztřídí cesty do vrstev.

**Dva módy technologie:**
- **ZUND** — kruhové značky, 4 rohy + orientační bod + interpolace na dlouhých stranách, volitelný Fixed/Auto-fit artboard
- **SUMMA** — čtvercové značky, barcode bar pod grafikou, feed margins, červené ořezové linky

Hybrid mód byl odstraněn ve v26.0 a **neexistuje**.

---

## Namespace a soubory

Projekt používá namespace `ZSM.*`. Staré reference na `PMA.*` jsou chyba.

```
src/
├── lib/
│   ├── json2.js        ZSM-independent — JSON polyfill pro ES3
│   └── utils.js        ZSM.Utils — mm↔pt konverze, validateNumber(), log(), error() [src/lib/utils.js]
├── locale.js           ZSM.L — EN/CS stringtable, app.locale detekce, format() helper
├── config.js           ZSM.Config — konstanty, getDefaults(), Storage (save/load/migrate)
├── core.js             ZSM.Core — calculateAll(), addSteps() — PURE MATH, žádný DOM
├── draw.js             ZSM.Draw — Illustrator DOM, render(), getBounds(), getLay(), movePaths()
├── ui.js               ZSM.UI — ScriptUI dialog, preset logika, validace, event handling
└── main.jsx            Entry point — IIFE, orchestrace
```

**Load order (NELZE měnit):**
```
json2.js → locale.js → utils.js → config.js → core.js → draw.js → ui.js → main.jsx
```

`locale.js` musí být první modul — `ZSM.L` volají všechny ostatní moduly.

**Build:**
```bash
bash tools/build.sh   # → dist/illustrator-zund-summa-marks.jsx
```

`src/` je master. `dist/` je build output — **nikdy editovat ručně**.

---

## Datové struktury

### Settings objekt (flat)
```javascript
{
    mode:              "ZUND",           // "ZUND" | "SUMMA"
    gapInner:          5,                // mm — vzdálenost značek od grafiky
    gapOuter:          0,                // mm — vzdálenost od okraje artboardu
    maxDist:           500,              // mm — max rozteč, při překročení se interpoluje
    feedTop:           70,               // mm — horní přesah (SUMMA)
    feedBottom:        50,               // mm — spodní přesah (SUMMA)
    drawRed:           true,             // bool — červené ořezové linky (SUMMA)
    useArtboardBounds: false,            // bool — Fixed mód
    markSizeZ:         5,                // mm — průměr Zünd značky
    markSizeS:         3,                // mm — strana Summa značky
    markColor:         "[Registration]", // string — přímá barva značek
    layers: [
        { name: "Cut", color: "[Registration]" }
    ]
}
```

### Preset wrapper (uloženo na disk a předáváno mezi moduly)
```javascript
{
    activePreset: "[Last Settings]",
    presets: {
        "[Default]":       { /* settings objekt */ },
        "[Last Settings]": { /* settings objekt */ },
        "Moje předvolba":  { /* settings objekt */ }
    }
}
```

`UI.show()` přijímá **wrapper**, ne flat settings. Vrací wrapper nebo `null` (cancel). Main pak extrahuje flat settings přes `wrapper.presets[wrapper.activePreset]`.

### Geometry objekt (výstup ZSM.Core.calculateAll)
```javascript
{
    marksZ:   [{ cx, cy }, ...],   // pozice Zünd kruhů (středy, v points)
    marksS:   [{ cx, cy }, ...],   // pozice Summa čtverců (středy, v points)
    barS:     { x1, x2, y, w },   // Summa barcode bar (nebo null)
    red:      [{ x1, y1, x2, y2, w }, ...],  // červené linky (nebo [])
    ab:       [L, T, R, B],        // nový artboard rect v points
    warnings: ["...", ...]         // nezablokující varování
}
```

Vše v `ZSM.Core` je v **document points** — konverze mm↔pt přes `ZSM.Utils.mm2pt()` / `ZSM.Utils.pt2mm()`. Large Canvas: všechny fyzické konstanty se dělí `ZSM.Utils.getSF()` (vrací 1 nebo 10).

---

## Tok dat

```
Storage.load()               → presetWrapper | null
    ↓
UI.show(presetWrapper)       → presetWrapper | null (null = cancel)
    ↓
Storage.save(presetWrapper)  → disk
    ↓
[extrahuj flat settings]
    ↓
Draw.beginSession()          → odemkne vrstvy, uloží locked list
Draw.getBounds(settings)     → [L, T, R, B] v points
    ↓
Core.calculateAll(settings, bounds)  → geometry
    ↓
Draw.render(geometry, settings)      → Illustrator DOM
Draw.endSession()            → obnoví zámky a viditelnost vrstev
```

---

## Separace odpovědností

| Modul | Smí | Nesmí |
|-------|-----|-------|
| `ZSM.Core` | Počítat, volat `ZSM.Utils` | DOM, alert, UI |
| `ZSM.Draw` | DOM, volat `ZSM.Utils`, `ZSM.Config` | UI, počítání geometrie |
| `ZSM.UI` | ScriptUI, volat `ZSM.Draw` (getSwatchNames/getLayerNames), validovat. Dva mód-specifické dialogy (ZUND/SUMMA), mode-switch loop. | DOM rendering, core math |
| `ZSM.Config` | Konstanty, Storage, getDefaults | DOM, UI, math |

Tato separace je záměrná — Core je testovatelné bez Illustratoru.

---

## Kritická pravidla

**ES3 only** — žádné `const`, `let`, arrow functions, template literals, `forEach`, `map`. Jen `var` a `function`.

**Namespace** — žádné globální proměnné. Vše v `ZSM.*`.

**Lokalizace** — žádné hardcoded české řetězce v src/ souborech. Vždy `ZSM.L.KLIC` nebo `ZSM.L.format(ZSM.L.KLIC, arg1)`. Zdrojové soubory i dist používají **UTF-8 with BOM** — build skript (`tools/build.sh`) automaticky přidává BOM. České znaky v `locale.js` jsou jako literály (ne `\uXXXX` escape), proto je BOM povinný pro správnou interpretaci v ExtendScript.

**Přidat nový string:**
1. Do `src/locale.js` — sekce `en` i `cs`
2. Použít jako `ZSM.L.MOJ_KLIC`

**Layer management** — před DOM operacemi vždy `Draw.beginSession()`, po skončení `Draw.endSession()`. Endession volá `finally` blok v main.jsx — vždy se provede i při chybě.

**Storage** — soubor: `~/Library/Application Support/ZSM/settings_v26_3.json`. Migrace ze starých formátů (`thruActive/kissActive` → `layers[]`, flat → wrapper, `layers[].active` → row existence, localized preset key → `[Default]`) je v `Storage.load()`.

**Iterace nad live DOM kolekcemi** — vždy udělat snapshot pole před iterací, jinak se kolekce mění za běhu. Viz vzor v `Draw.movePaths()` a `Draw.render()`.

---

## Kde hledat co

| Potřebuješ změnit | Soubor |
|-------------------|--------|
| Výchozí hodnoty parametrů | `src/config.js` → `getDefaults()` |
| Fyzické konstanty (bar offset, bar width) | `src/core.js` → `SUMMA_BAR_OFFSET`, `SUMMA_BAR_WIDTH` |
| Výpočet pozic značek | `src/core.js` → `calculateAll()` |
| Interpolaci intermediate marks | `src/core.js` → `addSteps()` |
| Vykreslování v Illustratoru | `src/draw.js` → `render()` |
| Detekci bounds (výběr / artboard) | `src/draw.js` → `getBounds()` |
| Přesun cest na vrstvy | `src/draw.js` → `movePaths()` |
| Barvu ze swatche | `src/draw.js` → `getCol()` |
| Dialog a presety | `src/ui.js` → `ZSM.UI.show()` → `ZSM.UI.buildDialog(mode, ...)` |
| Lokalizaci | `src/locale.js` |
| Ukládání nastavení | `src/config.js` → `Storage` |
| Build systém | `tools/build.sh` |

---

## Existující dokumentace

| Soubor | Obsah |
|--------|-------|
| `README.md` | Uživatelská + vývojářská dokumentace |
| `docs/ARCHITECTURE.md` | Tento technický brief |
| `docs/TEST_PLAN_MASTER.md` | 28 testovacích případů (P0–P2) s konkrétními vstupy a měřeními |
| `tests/test_core_math.js` | Jednotkové testy pro `ZSM.Core` (81 testů) |

---

## Aktuální stav projektu

**Větev:** `_incubator/zund-summa-marks`  
**Fáze:** Refaktorizace dokončena, čeká na manuální test a deploy do `Projects/applescript-automation`

**Co je hotovo:**
- Všechny src/ moduly přepsány (ZSM namespace, locale, dynamické vrstvy, presety)
- Code review: všechny nalezené bugy opraveny (C1–C2, W2–W7)
- UI: dva mód-specifické dialogy (ZUND/SUMMA) místo jednoho s hidden panely
  - Eliminuje ghost spacing (BUG-3), pFeedWrap wrapper odstraněn
  - Mode-switch loop: přepnutí módu → uloží stav → zavře → otevře nový dialog
  - Žádné visible/maximumSize hacky, čistý ScriptUI layout
- BUG-1: symetrické vertikální okraje v ZUND (snapCeil celkové výšky, centrování)
- BUG-2: konzistentní šířka artboardu — 0.01mm tolerance v zaokrouhlení (snapCeil/snapFloor)
- Guides: vodítka ignorována v getBounds()
- Copyright a proprietární licence přidány
- dist/ = build z src/ (synchronizovaný)
- Test coverage: 81 testů včetně BUG-1 symetrie a BUG-2 cliff-effect

**Otevřené úkoly:**
- Manuální testování dle TEST_PLAN_MASTER.md (TC-001 až TC-028)
- Deploy do `Projects/extendscript-automation` po PASS na P0
