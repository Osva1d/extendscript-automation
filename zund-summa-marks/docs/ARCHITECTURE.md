# Architecture: Zünd & Summa Marks v26.5.0

> Copyright © 2025-2026 Ladislav Osvald (Osva1d) — licensed under GPL-3.0-or-later.
> Technický přehled projektu.
> Než začneš pracovat na tomto projektu, přečti celý dokument.
>
> **Aktuální verze:** v26.5.0 (Phase 3 — režim „Pouze značky", ořezové linky vždy do
> samostatné top-level vrstvy „Trim", ↺ Revert, odstraněno tlačítko Reset; opravy:
> `canonColor` normalizace registrační barvy v CZ locale, re-validace po `setUIValues`,
> C++ crash guard při vytváření top-level vrstvy nad aktivním sublayerem).
> Manuální měřítko 1:N přišlo v Phase 2 (v26.4.0).

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
├── lib/                  ← pure utility modules — žádný DOM, plně testovatelné offline
│   ├── json2.js          ZSM-independent — JSON polyfill pro ES3
│   ├── utils.js          ZSM.Utils — mm↔pt konverze, log(), error()
│   ├── validation.js     ZSM.Validation — schema-based validace numerických polí
│   ├── ui_state.js       ZSM.UIState — preset save/saveAs/delete, modified detekce
│   ├── storage.js        ZSM.Storage — load/save JSON settings + migrace v26.0→v27
│   └── bounds.js         ZSM.Bounds — měření bounds Illustrator obsahu (clip-aware)
├── locale.js             ZSM.L — EN/CS stringtable, app.locale detekce, format()
├── config.js             ZSM.Config — konstanty, getDefaults() (Storage moved to lib/)
├── core.js               ZSM.Core — calculateAll(), addSteps() — PURE MATH, žádný DOM
├── draw.js               ZSM.Draw — DOM mutace: render(), beginSession(), movePaths()
│                          getBounds() je tenký wrapper přes ZSM.Bounds.get()
├── ui.js                 ZSM.UI — ScriptUI dialog, preset logika, event handling
└── main.jsx              Entry point — IIFE, orchestrace
```

**`src/lib/` vs `src/` boundary:**
- `lib/` = pure utility moduly bez DOM přístupu. Testovatelné s `eval()` + Node.js mocks (žádný Illustrator).
- `src/` root = doménové moduly. `core.js` je čistá matematika (taky offline-testable). `draw.js` a `ui.js` jsou DOM/ScriptUI vrstvy. `config.js` jen konstanty + `getDefaults()`. `locale.js` strings. `main.jsx` orchestrace.
- `_isArtifactLayer` a `_isInsideClippedGroup` jsou v `lib/bounds.js` (`ZSM.Bounds.isArtifactLayer`/`isInsideClippedGroup`) protože jsou sdílené mezi bounds výpočtem a render-side `movePaths()`/`beginSession()`. Render kód v `draw.js` je volá přes `ZSM.Bounds.*` přímo, nikoli přes `this._helper`.

**Invariant — efektivní měřítko (`ZSM.Utils.getEffectiveSF(s)`):**
Jediný zdroj pravdy pro převod „uživatelské reálné mm ↔ doc-space pt". Skládá Adobe Large Canvas `scaleFactor` × manuální `s.scaleN` (1–10). **Každé** místo, které převádí rozměry (pozice i velikosti značek), MUSÍ jít přes tento helper — `core.js` (matematika) i `draw.js` (render). Historicky draw.js použil syrový `getSF()` bez `scaleN`, takže se v 1:10 workflow škálovaly pozice, ale ne velikosti značek (oprava v26.4.0). Regrese hlídána v `tests/test_draw_render.js` (TEST 16).

**Invariant — barva nikdy auto-vytvořena:** `getCol` resolvuje existující swatch, jinak fallback `[Registration]` (+ varování v render). NIKDY netvoří náhradní spot — tichá mutace dokumentu + arbitrární barva jsou v prepressu nebezpečné. Viz `getCol` / `registrationColor` / `swatchExists`.

**Load order (NELZE měnit):**
```
json2.js → locale.js → utils.js → validation.js → ui_state.js → config.js → storage.js → core.js → bounds.js → draw.js → ui.js → main.jsx
```

`locale.js` musí být před vším co volá `ZSM.L.*` (tj. mezi všemi moduly co dělají user-facing zprávy). `bounds.js` musí být před `draw.js` (delegace `getBounds`). `storage.js` musí být po `config.js` (volá `ZSM.Config.getDefaults()`).

**Build:**
```bash
bash tools/build.sh   # → dist/illustrator-zund-summa-marks.jsx
```

`src/` je master. `dist/` je build output — **nikdy editovat ručně**.

---

## Error policy

Sjednocené pravidlo pro error handling napříč moduly:

- **File I/O failures** (`ZSM.Storage.save`, `ZSM.Storage.load`, settings file write): **vždy log + user-facing alert**. Uživatel musí vědět, že se nastavení neuložilo. Příklad: `ZSM.Utils.log("Storage.save failed: " + e.message); alert(ZSM.L.ERR_WRITE_SETTINGS + ...)` v ui.js click handlerech a v main.jsx.
- **DOM hazards** (`doc.layers[i].locked = false`, `layer.remove()`, `app.redraw()`, mutace na artifact layers, čtení geometricBounds z corrupt items): **log + graceful fallback, žádný alert**. Uživatel netuší, co je locked layer; alert by ho jen zmátl. Použití: `try { ... } catch (e) { ZSM.Utils.log("context: " + e.message); }` nebo prázdný catch tam, kde je fallback (continue/return) zřejmý ze struktury (např. cleanup smyčky, defensive `try { redraw } catch {}`).
- **Catastrophic failure** (uncaught error v `main.jsx` outer try/catch): user dostane `ERR_CRITICAL` alert s chybovou zprávou + řádkem.

`ZSM.Utils.log()` je gated přes `ZSM.Config.debug` — produkční dist tedy nezaplaví uživatele console output, ale developer při ladění vidí celý trace.

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
| `docs/MANUAL_TEST.md` | Jediný manuální test plán (deploy gate, P0/P1) |
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
- Manuální testování dle docs/MANUAL_TEST.md (deploy gate P0)
- Deploy do `Projects/extendscript-automation` po PASS na P0
