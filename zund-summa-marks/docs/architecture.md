# Architecture: Zünd & Summa Marks

> Copyright © 2025-2026 Ladislav Osvald — MIT License.
> Technický přehled projektu.
> Než začneš pracovat na tomto projektu, přečti celý dokument.
>
> **Verze skriptu tady záměrně není** — žila by vedle `package.json`,
> `src/config.js` a `CHANGELOG.md` jako čtvrtá kopie, kterou nic nehlídá (a taky
> driftla: dokument uváděl v26.5.1, zatímco veřejná řada je 1.0.0). Aktuální verzi
> hledej v [`../CHANGELOG.md`](../CHANGELOG.md).
>
> Čísla `v26.x` a dřívější v textu jsou **historické reference** k interní řadě
> před veřejným vydáním, ne tvrzení o aktuálním stavu.

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
│   ├── utils.js          ZSM.Utils — mm↔pt konverze, log(), error()
│   ├── validation.js     ZSM.Validation — schema-based validace numerických polí
│   ├── storage.js        ZSM.Storage — load/save JSON settings + migrace v26.0→v27
│   └── bounds.js         ZSM.Bounds — měření bounds Illustrator obsahu (clip-aware)
├── locale.js             ZSM.L — EN/CS stringtable, app.locale detekce, format()
├── config.js             ZSM.Config — konstanty, getDefaults()
├── draw.js               ZSM.Draw — DOM mutace: render(), beginSession(), movePaths()
│                          getBounds() je tenký wrapper přes ZSM.Bounds.get()
├── ui.js                 ZSM.UI — ScriptUI dialog, preset logika, event handling
└── main.js               Entry point — IIFE, orchestrace

../shared/lib/            ← sdílené jádro, viz ../../docs/decisions.md
├── json2.js              JSON polyfill
├── ui_state.js           buildUIState(ZSM) → ZSM.UIState — přechody presetů
└── cut_marks.js          buildCutMarks(ZSM) → ZSM.Core — calculateAll(), addSteps() — PURE MATH, žádný DOM
```

**`src/lib/` vs `src/` boundary:**
- `lib/` = pure utility moduly bez DOM přístupu. Testovatelné s `eval()` + Node.js mocks (žádný Illustrator).
- `src/` root = doménové moduly. `draw.js` a `ui.js` jsou DOM/ScriptUI vrstvy. `config.js` jen konstanty + `getDefaults()`. `locale.js` strings. `main.js` orchestrace. Čistá matematika (`ZSM.Core`) je ve sdíleném `../shared/lib/cut_marks.js` — testovatelná offline a sdílená s tile-exportem.
- `_isArtifactLayer` a `_isInsideClippedGroup` jsou v `lib/bounds.js` (`ZSM.Bounds.isArtifactLayer`/`isInsideClippedGroup`) protože jsou sdílené mezi bounds výpočtem a render-side `movePaths()`/`beginSession()`. Render kód v `draw.js` je volá přes `ZSM.Bounds.*` přímo, nikoli přes `this._helper`.

**Invariant — efektivní měřítko (`ZSM.Utils.getEffectiveSF(s)`):**
Jediný zdroj pravdy pro převod „uživatelské reálné mm ↔ doc-space pt". Skládá Adobe Large Canvas `scaleFactor` × manuální `s.scaleN` (1–10). **Každé** místo, které převádí rozměry (pozice i velikosti značek), MUSÍ jít přes tento helper — `ZSM.Core` (matematika v `cut_marks.js`) i `draw.js` (render). Historicky draw.js použil syrový `getSF()` bez `scaleN`, takže se v 1:10 workflow škálovaly pozice, ale ne velikosti značek (oprava v26.4.0). Regrese hlídána v `tests/test_draw_render.js` (TEST 16).

**Invariant — barva nikdy auto-vytvořena:** `getCol` resolvuje existující swatch, jinak fallback `[Registration]` (+ varování v render). NIKDY netvoří náhradní spot — tichá mutace dokumentu + arbitrární barva jsou v prepressu nebezpečné. Viz `getCol` / `registrationColor` / `swatchExists`.

**Load order (NELZE měnit; zdroj pravdy je `tools/build.sh`):**
```
../shared/lib/json2.js → locale.js → lib/utils.js → lib/validation.js → ../shared/lib/ui_state.js (buildUIState(ZSM)) → config.js → lib/storage.js → ../shared/lib/cut_marks.js (buildCutMarks(ZSM)) → lib/bounds.js → draw.js → ui.js → main.js
```

`locale.js` musí být před vším co volá `ZSM.L.*` (tj. mezi všemi moduly co dělají user-facing zprávy). `bounds.js` musí být před `draw.js` (delegace `getBounds`). `storage.js` musí být po `config.js` (volá `ZSM.Config.getDefaults()`). `cut_marks.js` musí být po `utils.js` a `config.js` (factory čte `ZSM.Utils` a `ZSM.Config`).

**Build:**
```bash
bash tools/build.sh   # → dist/illustrator-zund-summa-marks.jsx
```

`src/` je master. `dist/` je build output — **nikdy editovat ručně**.

---

## Error policy

Sjednocené pravidlo pro error handling napříč moduly:

- **File I/O failures** (`ZSM.Storage.save`, `ZSM.Storage.load`, settings file write): **vždy log + user-facing alert**. Uživatel musí vědět, že se nastavení neuložilo. Příklad: `ZSM.Utils.log("Storage.save failed: " + e.message); alert(ZSM.L.ERR_WRITE_SETTINGS + ...)` v ui.js click handlerech a v main.js.
- **DOM hazards** (`doc.layers[i].locked = false`, `layer.remove()`, `app.redraw()`, mutace na artifact layers, čtení geometricBounds z corrupt items): **log + graceful fallback, žádný alert**. Uživatel netuší, co je locked layer; alert by ho jen zmátl. Použití: `try { ... } catch (e) { ZSM.Utils.log("context: " + e.message); }` nebo prázdný catch tam, kde je fallback (continue/return) zřejmý ze struktury (např. cleanup smyčky, defensive `try { redraw } catch {}`).
- **Catastrophic failure** (uncaught error v `main.js` outer try/catch): user dostane `ERR_CRITICAL` alert s chybovou zprávou + řádkem.

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
    orientDist:        100,              // mm — odsazení orientační značky (ZUND)
    markColor:         "[Registration]", // string — přímá barva značek
    scaleN:            1,                // 1–10 — práce v měřítku 1:N (1 = vypnuto)
    marksOnly:         false,            // bool — jen značky, vrstvy beze změny
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

`[Default]` obsahuje jen tovární hodnoty — Uložit do ní nikdy nezapíše (změní se na Uložit jako). `UI.show()` ji proto při každém otevření sestaví znovu přes `ZSM.UI.defaultsForDocument()`: `getDefaults()` s řezovou barvou, kterou `ZSM.Draw.detectCutColor()` najde v dokumentu. Tlačítko Výchozí načítá totéž.

`UI.show()` přijímá **wrapper**, ne flat settings. Vrací wrapper nebo `null` (cancel). Main pak bere nastavení běhu z `wrapper.presets["[Last Settings]"]`, které dialog zapíše při Generovat: pole zobrazeného režimu z dialogu, pole druhého režimu z toho, s čím byl dialog otevřen nebo naposledy načten (poslední běh, vybraná předvolba, tovární hodnoty) — ne z aktivní předvolby.

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

Vše v `ZSM.Core` je v **document points** — konverze mm↔pt přes `ZSM.Utils.mm2pt()` / `ZSM.Utils.pt2mm()`. Fyzické konstanty (mm) se dělí efektivním měřítkem `ZSM.Utils.getEffectiveSF(s)` — Large Canvas × 1:N, viz invariant výš.

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
| `ZSM.Config` | Konstanty, getDefaults | DOM, UI, math |
| `ZSM.Storage` | File I/O, migrace nastavení | DOM, UI, math |

Tato separace je záměrná — Core je testovatelné bez Illustratoru.

---

## Kritická pravidla

Pravidla celého repa — ES3, namespace, kódování, živé kolekce DOM — jsou
v [`../../docs/conventions.md`](../../docs/conventions.md). Tady jen to, co je
specifické pro ZSM.

**Lokalizace** — žádné hardcoded české řetězce v src/ souborech. Vždy `ZSM.L.KLIC` nebo `ZSM.L.format(ZSM.L.KLIC, arg1)`.

**Přidat nový string:**
1. Do `src/locale.js` — sekce `en` i `cs`
2. Použít jako `ZSM.L.MOJ_KLIC`

**Layer management** — před DOM operacemi vždy `Draw.beginSession()`, po skončení `Draw.endSession()`. `endSession()` volá `finally` blok v main.js — vždy se provede i při chybě.

**Storage** — soubor `Folder.userData/ZSM/settings.json` (na macOS `~/Library/Application Support/ZSM/`). `Storage.load()` přejmenuje starší `settings_v26_3.json` a migruje staré formáty (`thruActive/kissActive` → `layers[]`, flat → wrapper, `layers[].active` → row existence, localized preset key → `[Default]`).

---

## Kde hledat co

| Potřebuješ změnit | Soubor |
|-------------------|--------|
| Výchozí hodnoty parametrů | `src/config.js` → `getDefaults()` |
| Fyzické konstanty (bar offset, bar width) | `../shared/lib/cut_marks.js` → `SUMMA_BAR_OFFSET`, `SUMMA_BAR_WIDTH` |
| Výpočet pozic značek | `../shared/lib/cut_marks.js` → `calculateAll()` |
| Interpolaci intermediate marks | `../shared/lib/cut_marks.js` → `addSteps()` |
| Vykreslování v Illustratoru | `src/draw.js` → `render()` |
| Detekci bounds (výběr / artboard) | `src/lib/bounds.js` → `ZSM.Bounds.get()` |
| Přesun cest na vrstvy | `src/draw.js` → `movePaths()` |
| Barvu ze swatche | `src/draw.js` → `getCol()` |
| Dialog a presety | `src/ui.js` → `ZSM.UI.show()` → `ZSM.UI.buildDialog(mode, ...)` |
| Lokalizaci | `src/locale.js` |
| Ukládání nastavení | `src/lib/storage.js` → `ZSM.Storage` |
| Build systém | `tools/build.sh` |

`cut_marks.js` sdílí tile-export — po změně pusť i jeho testy (`npm test` v `tile-export/`).

---

## Existující dokumentace

| Soubor | Obsah |
|--------|-------|
| `README.md` | Uživatelská dokumentace + stručný vývojářský úvod |
| `CHANGELOG.md` | Změny z pohledu uživatele |
| `docs/architecture.md` | Tento technický brief |
| `docs/manual-test.md` | Jediný manuální test plán (deploy gate, P0/P1) |
| `tests/` | Node.js sady bez Illustratoru — `npm test`; `npm run verify` = build + testy |
| `../docs/` | Konvence repa, rozhodnutí, naměřené chování enginu, reporty z review |
