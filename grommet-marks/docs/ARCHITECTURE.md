# Architecture: Grommet Marks v5.0.0

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
├── core.js                 GM.Core — calcPositions, distributeOnSpan/Circuit, buildCircuit, detectCorners — PURE MATH
├── illustrator.js          GM.Illustrator — DOM adapter: init(), placeMark(), getOrCreateLayer/Swatch(), getSelectedPathInfo()
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
    isRound:        true,                   // true = kruh (čtverec odstraněn v4.2.0)
    markLayerName:  "__create__",           // název vrstvy nebo SENTINEL_CREATE
    fillEnabled:    true,
    fillSwatchName: "__create__",           // název swatche nebo SENTINEL_CREATE
    fillOverprint:  true,
    strokeEnabled:  false,
    strokeSwatchName: "__create__",
    strokeOverprint: true,
    strokeWeight:   1,                      // points
    // --- v5.0.0 ---
    placementMode:  "artboard",             // "artboard" | "path"
    cornerZone: {
        enabled: false,
        count:   5,                         // počet značek v zóně (včetně rohové kotvy)
        pitch:   100                        // rozteč v user units
    },
    pathDist: {
        useNumber: false,                   // false = spacing mode (počet z délek úseků)
        number:    24,                      // počet (smooth path + count mode)
        spacing:   105                      // rozteč v user units
    }
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
    → GM.Illustrator.getLayerNames() + getSwatchNames() + getSelectedPathInfo()
        → GM.UI.buildDialog(pData, layerInfo, swatchInfo, pathInfo)
            [uživatel nastaví a klikne OK]
            → ui.gatherAll() → cfg objekt
                → GM.Validation.validate(cfg, GM.L)
                    → GM.Storage.save(pData)  // [Last Settings] auto-save
                        → GM.Main.process(settings)
                            ┌─ artboard mode:
                            │    GM.Core.distributeOnSpan() per hrana
                            │        → GM.Illustrator.placeMark() per pozice
                            └─ path mode:
                                 GM.Illustrator.getSelectedPathInfo()  // fresh check
                                     → GM.Core.distributeOnCircuit()
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
├── test_core_math.js           GM.Core: calcPositions, convertVal, buildCircuit, pointAtDistance
├── test_core_circuit.js        GM.Core: detectCorners, distributeOnSpan, distributeOnCircuit
├── test_storage_migrations.js  GM.Storage: celý migrační řetěz (vč. v5 forward-fill)
├── test_ui_state.js            GM.UIState: validate/save/saveAs/delete/select/list
├── test_validation.js          GM.Validation: validateNumber + validate (vč. v5 pravidel)
└── test_ui_dialog.js           GM.UI: ScriptUI dialog (mock ScriptUI, gather/apply, radio excl.)
```

Testy běží v Node.js, produkční kód se načítá přes `eval()` s mock objekty (File, Folder, alert, $, ScriptUI).
`test_ui_dialog.js` pokrývá reálný UI kód přes `lib/mock_scriptui.js` — chytí radio-grouping chyby.

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
| Výpočet pozic artboard (count/spacing/zones) | `src/core.js` → `distributeOnSpan()` |
| Výpočet pozic na cestě | `src/core.js` → `distributeOnCircuit()` |
| Cubic Bézier arc-length, detekce rohů | `src/core.js` → `buildCircuit()`, `detectCorners()` |
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

## Layout dialogu (v5.0.0)

Kanonický jednosloupcový layout dle `extendscript-ui-standards`:

```
Window("dialog")
 ├─ Panel: Předvolby            ř.1: Načíst [dropdown] ↺ (revert)
 │                              ř.2: Uložit / Uložit jako… / Smazat (vpravo, ZSM layout)
 ├─ Panel: Umístění             radio: Hrany artboardu | Vybraná cesta  (path disabled bez výběru)
 ├─ Panel: Hrany                (visible pouze v artboard módu)
 │                              offsety X/Y + 4 kompaktní edge řádky;
 │                              mirror checkbox uvnitř dolní/pravé hrany (TD-001)
 ├─ Panel: Cesta                (visible pouze v path módu)
 │                              info řádek (uzavřená/otevřená · rohy) + Počet/Rozestup
 ├─ Panel: Rohové zóny          Zhustit u rohů + Počet + Rozteč  (zakázáno na hladké cestě)
 ├─ Panel: Značka               jednotky / velikost  (tvar zamčen na kruh)
 ├─ Panel: Vzhled               vrstva / výplň / obrys / tloušťka (zarovnaný label sloupec 75px)
 ├─ Group: Footer               šedý copyright
 └─ Group: Tlačítka             Storno · Generovat (vpravo)
```

---

## Aktuální stav projektu

**Verze:** 5.0.0
**Fáze:** Cyklus 4 kompletní — path mode + corner zones; 234 testů / 6 suit green; připraveno k manuálnímu P0 testu.

**Co je hotovo (v5.0.0 — cyklus 4):**
- Path mode: `getSelectedPathInfo()` (Illustrator DOM → plain segments), `buildCircuit()` (Bézier arc-length, 64 smp/seg), `detectCorners()` (tangentová odchylka, práh 15°), `distributeOnCircuit()` (rohové kotvy + span → span fill; smooth ring = count/spacing).
- Corner zones: `distributeOnSpan()` nahradil `calcPositions()` v `process()`; zóny-off výstup je poziční identický s v4 (regresní kontrakt: legacyCount inner helper, nikoliv Math.round).
- UI: panel Umístění (radio artboard/path), panel Cesta (info + Počet/Rozestup), panel Rohové zóny; `refreshModeUI()` přepíná Hrany↔Cesta; živá validace zakáže edge strukturální testy v path módu; zóny zakázány na hladké cestě.
- Forward-fill: staré presety bez v5 polí dostanou defaulty při načtení; `presetEquals()` presence-guarded (garantováno forward-fillem).
- Nová suite `test_core_circuit.js` (36 testů), `test_ui_dialog.js` rozšířena o 8 v5 scénářů.

**Otevřené úkoly:**
- Manuální P0 test v Illustratoru (viz `docs/MANUAL_TEST.md` sekce E, F + regresní C1/C2)
- TD-002: undo grouping (odloženo — chybí spolehlivé cross-version API)
