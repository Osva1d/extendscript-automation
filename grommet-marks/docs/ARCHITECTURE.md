# Architecture: Grommet Marks v4.1.0

> Technický přehled projektu.
> Než začneš pracovat na tomto projektu, přečti celý dokument.

---

## Co skript dělá

Generuje značky pro oka (kroužky/čtverce) po obvodu artboardů v Adobe Illustratoru. Spouští se jako `.jsx` skript přes `File > Scripts`. Uživatel nastaví parametry v dialogu → skript vypočítá pozice → vykreslí značky na cílovou vrstvu.

Podporuje libovolný počet artboardů v jednom dokumentu. Deduplication hash zabrání duplicitním značkám na rozích kde se hrany překrývají.

---

## Namespace a soubory

Projekt používá namespace `GM.*`. Každý modul má guard `var GM = GM || {};` a hlavičku s `Module`, `Part of`, `Depends on`.

```
src/
├── polyfills/
│   └── json2.js            JSON polyfill (Douglas Crockford, ES3)
├── constants.js            GM.CONSTANTS — verze, názvy vrstev/swatchů, sentinel, unit faktory
├── locale.js               GM.L — EN/CS stringtable, app.locale detekce, format() helper
├── lib/
│   ├── utils.js            GM.Utils — log, error, deepCopy, presetEquals
│   ├── storage.js          GM.Storage — čtení/zápis JSON, migrační řetěz
│   ├── validation.js       GM.Validation — rules-based validace vstupů
│   └── ui_state.js         GM.UIState — pure state-transition logika pro presety
├── config.js               GM.Config — getDefaults(), PRESET_KEY_DEFAULT, createEdgeDef()
├── core.js                 GM.Core — calcPositions(), convertVal() — PURE MATH, žádný DOM
├── illustrator.js          GM.Illustrator — DOM adapter: init(), placeMark(), getOrCreateLayer/Swatch()
├── ui.js                   GM.UI — ScriptUI dialog, deleguje preset logiku na GM.UIState
└── main.js                 GM.Main — entry point, deleguje validaci na GM.Validation
```

**Load order (dependencies first):**
```
json2.js → constants.js → locale.js → lib/utils.js → config.js →
lib/storage.js → lib/validation.js → lib/ui_state.js → core.js →
illustrator.js → ui.js → main.js
```

**Build:**
```bash
npm run build     # = bash tools/build.sh → dist/illustrator-grommet-marks.jsx
npm test          # = bash tests/run_all.sh
npm run verify    # build + test
```

`src/` je master. `dist/` je build output — **nikdy editovat ručně**.

---

## Datové struktury

### Settings objekt (jeden preset)
```javascript
{
    offsetX:        7,                      // user units — vzdálenost od levého/pravého okraje
    offsetY:        7,                      // user units — vzdálenost od horního/dolního okraje
    top:    { enabled: true,  useNumber: true, number: 10, spacing: 105 },
    left:   { enabled: true,  useNumber: true, number: 10, spacing: 105 },
    bottom: { enabled: false, useNumber: true, number: 10, spacing: 105 },
    right:  { enabled: false, useNumber: true, number: 10, spacing: 105 },
    bottomMirror:   true,                   // true = bottom kopíruje top
    rightMirror:    true,                   // true = right kopíruje left
    units:          "mm",                   // interní klíč: "mm" | "cm" | "in"
    markSize:       3,                      // user units — průměr/strana
    isRound:        true,                   // true = kruh, false = čtverec
    markLayerName:  "__create__",           // název vrstvy nebo SENTINEL_CREATE
    fillEnabled:    true,
    fillSwatchName: "__create__",           // název swatche nebo SENTINEL_CREATE
    fillOverprint:  true,
    strokeEnabled:  false,
    strokeSwatchName: "__create__",
    strokeOverprint: true,
    strokeWeight:   1                       // points
}
```

### Sentinel hodnoty
```javascript
GM.CONSTANTS.SENTINEL_CREATE = "__create__"    // → vytvořit default vrstvu/swatch
GM.Config.PRESET_KEY_DEFAULT = "[Default]"     // → klíč výchozího presetu
GM.Storage.PRESET_KEY_LAST   = "[Last Settings]" // → automaticky uložený poslední stav
```

### Uložená data (disk) — wrapper formát (v4.0)
```javascript
{
    activePreset: "[Default]",
    presets: {
        "[Default]": { /* settings */ },
        "[Last Settings]": { /* settings */ },
        "Banner 400x150": { /* settings */ }
    }
}
```

Soubor: `~/Library/Application Support/GrommetMarks/GrommetMarksSettings.json`

`[Last Settings]` se automaticky uloží při každém Generate — umožňuje obnovit poslední stav UI při dalším otevření.

---

## Tok dat

```
GM.Storage.load()
    → GM.Illustrator.getLayerNames() + getSwatchNames()
        → GM.UI.buildDialog(pData, layerInfo, swatchInfo)
            [uživatel nastaví a klikne OK]
            → ui.gatherAll() → cfg objekt
                → GM.Validation.validate(cfg, GM.L)
                    → GM.Storage.save(pData)  // [Last Settings] auto-save
                        → GM.Main.process(settings)
                            → GM.Core.calcPositions() per hrana
                                → GM.Illustrator.placeMark() per pozice
    → app.redraw()
```

---

## Separace odpovědností

| Modul | Smí | Nesmí |
|-------|-----|-------|
| `GM.Core` | Počítat, volat `GM.CONSTANTS` | DOM, alert, UI |
| `GM.Illustrator` | DOM, volat `GM.CONSTANTS`/`GM.L` | UI, geometrie |
| `GM.Utils` | Logging, deep copy, porovnání presetů | DOM, UI |
| `GM.Storage` | File I/O, migrace, volat `GM.Utils`/`GM.Config` | DOM, UI |
| `GM.Validation` | Validace vstupů, alert (chybové hlášky) | DOM, UI, File I/O |
| `GM.UIState` | State transitions presetů, volat `GM.Utils` | DOM, UI, File I/O |
| `GM.UI` | ScriptUI, volat `GM.UIState`/`GM.Storage`/`GM.Core` | DOM rendering |
| `GM.Config` | Konstanty, getDefaults | DOM, UI, File I/O |

---

## Migrační řetěz (GM.Storage.load)

1. **Flat → wrapper**: detekce chybějícího `presets` klíče → zabalení do wrapperu
2. **`__default__` → `[Default]`**: přejmenování sentinel klíče
3. **`[Výchozí]` → `[Default]`**: lokalizovaný legacy klíč
4. **Per-preset migrace**: v2→v3 (per-edge offsets → global), v3.0→v3.1 (lokalizované stringy → interní klíče)
5. **Forward-fill**: nové default klíče se doplní do existujících presetů

---

## Testy

```
tests/
├── run_all.sh                  Test runner (bash, ANSI output)
├── test_core_math.js           GM.Core: calcPositions, convertVal, round
├── test_storage_migrations.js  GM.Storage: celý migrační řetěz
├── test_ui_state.js            GM.UIState: validate/save/saveAs/delete/select/list
└── test_validation.js          GM.Validation: validateNumber + validate
```

Testy běží v Node.js, produkční kód se načítá přes `eval()` s mock objekty (File, Folder, alert, $).
Pokrývají pure moduly (žádné ScriptUI).

---

## Kritická pravidla

**ES3 only** — žádné `const`, `let`, arrow functions, template literals, `.forEach`/`.map`.

**Namespace** — žádné globální proměnné. `var GM = {}` je deklarováno buildem (vloženo po json2.js). Každý modul má guard `var GM = GM || {};`.

**Sentinels** — nikdy neukládat lokalizované display stringy na disk. Disk = interní klíče. UI = `GM.UI.toDisplay()` / `GM.UI.toStorage()` pro konverzi.

**Unit systém** — na disk se ukládají interní klíče (`"mm"`, `"cm"`, `"in"`), ne lokalizované názvy.

**System swatches** — `GM.Illustrator.isSystemSwatch(name)` filtruje bracketed swatches `[...]` — locale-independent.

**Deduplication** — `process()` udržuje `placed` hash `"x|y"` → žádné duplicitní značky na rozích.

---

## Kde hledat co

| Potřebuješ změnit | Soubor |
|-------------------|--------|
| Výchozí hodnoty parametrů | `src/config.js` → `getDefaults()` |
| Výpočet pozic (count/spacing logika) | `src/core.js` → `calcPositions()` |
| Vykreslování v Illustratoru | `src/illustrator.js` → `placeMark()` |
| Vytvoření vrstvy / swatche | `src/illustrator.js` → `getOrCreateLayer/Swatch()` |
| Dialog a presety | `src/ui.js` → `GM.UI.buildDialog()` |
| Edge panel + mirror inline | `src/ui.js` → `GM.UI.buildEdgePanel()` |
| Preset state transitions | `src/lib/ui_state.js` → `GM.UIState` |
| Validaci vstupů | `src/lib/validation.js` → `GM.Validation` |
| Ukládání nastavení / migraci | `src/lib/storage.js` → `GM.Storage` |
| Unit konverze v UI | `src/ui.js` → `unitsDDL.onChange` |
| Lokalizaci | `src/locale.js` |
| Artboard smyčku | `src/main.js` → `GM.Main.process()` |
| Build systém | `tools/build.sh` |

---

## Layout dialogu (v4.1.0)

Kanonický jednosloupcový layout dle `extendscript-ui-standards`:

```
Window("dialog")
 ├─ Panel: Předvolby            (Načíst / Uložit / Uložit jako… / Smazat)
 ├─ Panel: Hrany                offsety X/Y + 4 kompaktní edge řádky;
 │                              mirror checkbox uvnitř dolní/pravé hrany (TD-001)
 ├─ Panel: Značka               jednotky / velikost / tvar
 ├─ Panel: Vzhled               vrstva / výplň / obrys / tloušťka
 ├─ Group: Footer               šedý copyright
 └─ Group: Tlačítka             Reset (vlevo) · Storno · OK (vpravo)
```

---

## Aktuální stav projektu

**Verze:** 4.1.0
**Fáze:** Cyklus 2 kompletní — UI redesign (kanonický sloupec), připraveno k manuálnímu testu a deployi.

**Co je hotovo (v4.1.0 — cyklus 2):**
- Kanonický jednosloupcový layout dle extendscript-ui-standards; offsety přesunuty do panelu Hrany
- Kompaktní edge řádky; TD-001: mirror checkbox uvnitř edge skupiny (`buildEdgePanel`)
- TD-003: obnova předchozího stavu při vypnutí mirror (`_prevEnabled`)
- Sdílený `onUserChange` hook (modified indicator + live validace)
- Rozšířená test suite: + ui_state, validation (4 suity)

> Pozn.: cyklus 2 původně zkoušel schématický náhled (Concept B), ale po vizuálním
> vyhodnocení se přešlo na čistý kanonický sloupec (Concept A). Modul `GM.PreviewModel`
> byl odstraněn.

**Co je hotovo (v4.0.0 — cyklus 1):**
- Modulární lib/ extrakce (utils, storage, validation, ui_state)
- Wrapper persistence formát s `[Last Settings]` auto-save
- Migrační řetěz flat→wrapper + sentinel rename
- Namespace guards a module headers na všech souborech
- Rules-based validace, modified indicator, Save As, Reset, live validace
- Verze z package.json v build.sh, `set -euo pipefail`

**Otevřené úkoly:**
- Manuální P0 test v Illustratoru (viz `TEST_PLAN.md`), zvlášť ověření `onDraw` náhledu
- TD-002: undo grouping (odloženo — chybí spolehlivé cross-version API)
