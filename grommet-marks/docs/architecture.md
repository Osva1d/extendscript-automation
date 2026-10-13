# Architecture: Grommet Marks

> Technický přehled projektu.
> Než začneš pracovat na tomto projektu, přečti celý dokument.
>
> **Verze skriptu tady záměrně není** — byla by čtvrtou kopií vedle
> `package.json`, `src/constants.js` a `CHANGELOG.md`, kterou nic nehlídá (a taky
> driftla: dokument uváděl v6.0.0, zatímco veřejná řada je 1.1.0). Aktuální verzi
> hledej v [`../CHANGELOG.md`](../CHANGELOG.md).
>
> Čísla `v2`–`v6` v textu jsou **historické reference** k interní řadě před
> veřejným vydáním, ne tvrzení o aktuálním stavu.

---

## Co skript dělá

Generuje značky pro oka (kroužky/čtverce) po obvodu artboardů v Adobe Illustratoru, nebo po vybrané cestě (tvary: odsazení dovnitř, ostré i zaoblené rohy, část obvodu). Spouští se jako `.jsx` skript přes `File > Scripts`. Uživatel nastaví parametry v dialogu → skript vypočítá pozice → vykreslí značky na cílovou vrstvu.

Podporuje libovolný počet artboardů v jednom dokumentu. Deduplication hash zabrání duplicitním značkám na rozích kde se hrany překrývají.

---

## Namespace a soubory

Projekt používá namespace `GM.*`. Každý modul má guard `var GM = GM || {};` a hlavičku s `Module`, `Part of`, `Depends on`.

```
src/
├── constants.js            GM.CONSTANTS — verze, názvy vrstev/swatchů, sentinel, unit faktory
├── locale.js               GM.L — EN/CS stringtable, app.locale detekce, format() helper
├── lib/
│   ├── utils.js            GM.Utils — log, error, deepCopy, presetEquals
│   ├── storage.js          GM.Storage — čtení/zápis JSON, migrační řetěz
│   └── validation.js       GM.Validation — rules-based validace vstupů
(../shared/lib/json2.js a ../shared/lib/ui_state.js — sdílené jádro, viz ../../docs/decisions.md)
├── config.js               GM.Config — getDefaults(), PRESET_KEY_DEFAULT, createEdgeDef()
├── core.js                 GM.Core — calcPositions, distributeOnSpan, placeAlong, buildCircuit, detectCorners/findCorners, topmostDist, selectedRuns/mapRun/runCorners, checkMarks — PURE MATH
├── illustrator.js          GM.Illustrator — DOM adapter: init(), placeMarkGroup(), getOrCreateLayer(), registrationColor(), getDocInfo(), getSelectedPathInfo(), offsetPath()
├── ui.js                   GM.UI — ScriptUI dialog, deleguje preset logiku na GM.UIState
└── main.js                 GM.Main — entry point, process() (smyčka přes artboardy), pathMarks() (průběh režimu cesty)
```

**Load order (dependencies first):**
```
../shared/lib/json2.js → constants.js → locale.js → lib/utils.js → config.js →
lib/storage.js → lib/validation.js → ../shared/lib/ui_state.js (buildUIState(GM)) →
core.js → illustrator.js → ui.js → main.js
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
    markSize:       3,                      // user units — průměr kruhu i délka ramen kříže
    // --- v6.0.0 ---
    markCircle:     true,                   // vykreslit kruh (default ON)
    markCross:      false,                  // vykreslit kříž (default OFF)
    regWeight:      1.0,                    // tloušťka registračního tahu (points)
    haloWeight:     3.0,                    // tloušťka bílého hala (points, knockout)
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
    },
    // --- 1.3.0 ---
    pathOffset:     0                       // user units — odsazení linky ok od řezové linky dovnitř
                                            // (jen uzavřená cesta); 0 = značky leží na cestě.
                                            // Staré předvolby ho dostanou forward-fillem jako 0.
}
```

### Sentinel hodnoty
```javascript
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

Volby jednoho běhu, které se **neukládají**: `GM.UI` je vrací z `getRunOptions()` (dnes `{pathPartial}` — zaškrtávátko „Jen vybraná část obvodu") a `GM.Main.process(settings, opts)` je dostane jako druhý parametr.

---

## Tok dat

```
GM.Storage.load()
    → GM.Illustrator.getSelectedPathInfo()   // cesta: segmenty (+ sel), rohy, přímý výběr, circuit
    → GM.Illustrator.getDocInfo()            // artboardy pro šedý řádek v režimu Hrany
        → GM.UI.buildDialog(pData, pathInfo, docInfo)
            [uživatel nastaví a klikne OK]
            → ui.gatherAll() → cfg objekt
                → GM.Validation.validate(cfg, GM.L)
                    → GM.Storage.save(pData)  // [Last Settings] auto-save
                        → GM.Main.process(settings, ui.getRunOptions())
                            ┌─ artboard mode:
                            │    GM.Core.distributeOnSpan() per hrana
                            │        → GM.Illustrator.placeMarkGroup() per pozice
                            └─ path mode:
                                 GM.Illustrator.getSelectedPathInfo()  // fresh check (zmizelá cesta → fallback na artboard)
                                     → GM.Main.pathMarks(cfg, opts, pathInfo, ...)
                                          ├ GM.Illustrator.offsetPath(pathInfo, D)   // jen uzavřená cesta a D > 0 → linka ok
                                          │     (musí vyjít 1 smyčka)                // dropDegenerateSegments → buildCircuit
                                          ├ GM.Core.findCorners(linka ok)            // ostré + zaoblené rohy
                                          ├ GM.Core.placeAlong(...)                  // celý obvod: od topmostDist()
                                          │     nebo část obvodu: mapRun → runCorners → placeAlong per běh
                                          └ GM.Core.checkMarks(marks, řezová linka, D, OFFSET_TOL / scale)   // jen D > 0
                                       → {ok:true, marks} | {ok:false, message}
                                         (chyba = alert a konec, vrstva ani značka nevznikne)
                                     → GM.Illustrator.placeMarkGroup() per značka
    → app.redraw()
```

---

## Režim cesty (1.3.0)

Návrh a zdůvodnění: [`../../docs/specs/2026-10-11-grommet-marks-path-mode-design.md`](../../docs/specs/2026-10-11-grommet-marks-path-mode-design.md).
Měřené chování Illustratoru: [`../../docs/extendscript-engine-facts.md`](../../docs/extendscript-engine-facts.md).

- **Pojmy.** *Řezová linka* = vybraná cesta. *Linka ok* = čára, na kterou padnou
  středy značek: řezová linka posunutá o D dovnitř (u otevřené cesty nebo při
  D = 0 řezová linka sama). Rohy a rozmístění se počítají na lince ok, kontrola
  se měří proti řezové lince.
- **`getSelectedPathInfo()`** je čisté čtení (výběr nemění) a vrací `circuit`,
  `segments` (každý s `sel` = obě koncové kotvy vybrané), `closed`, `sharpCount`,
  `roundCount`, `cornerCount` (= ostré + zaoblené), `cornerDists`, `partial`
  (`state` `none` | `runs` | `lone`, `runs`, `selectedSegs`, `totalSegs`),
  `pointSel` (stavy kotev pro obnovu výběru) a `pathRef`.
- **`offsetPath(pathInfo, D)`**: čistá kopie řezové linky bod po bodu (výplň, bez
  tahu a vzhledu) → `applyEffect` Adobe Offset Path (`ofst -D`, ostrý spoj) →
  řezová linka se výslovně odznačí a vybere se jen kopie (hlídá se, že vybraná
  je právě ona) → `expandStyle` → geometrie z výběru → smazání dočasných objektů
  → obnova výběru bod po bodu. Vrací `{ok, segments, loops}`; `loops !== 1` je
  chyba „linka ok se rozpadá". Celý běh je jeden krok Zpět.
- **`findCorners`** hledá ostré rohy (`detectCorners`, 15°) a zaoblené rohy
  (oblouk mezi dvěma rovnými úseky, který se celkem stočí o víc než 15°; značka
  v půli oblouku). Tvar bez rohů začíná v nejvyšším bodě (`topmostDist`).
- **Část obvodu:** `selectedRuns` (souvislé vybrané úseky na řezové lince) →
  `mapRun` (konce běhu na nejbližší body linky ok) → `runCorners` (konce + rohy
  uvnitř) → `placeAlong` jako otevřená cesta.
- **`checkMarks`** (jen D > 0): každá značka uvnitř řezové linky a ve vzdálenosti
  D ± (`OFFSET_TOL` + největší průhyb tětiv řezové linky). Měří k navzorkované
  řezové lince, proto přídavek `_chordSagitta`. Chytí i tichý návrat originálu,
  který Illustrator vrací u příliš úzkého tvaru.

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
├── test_core_circuit.js        GM.Core: detectCorners/findCorners, distributeOnSpan, placeAlong (s test-local obálkou distributeOnCircuit = regrese 1.2.0), topmostDist, selectedRuns/mapRun/runCorners, checkMarks
├── test_storage_migrations.js  GM.Storage: celý migrační řetěz (vč. v5 forward-fill)
├── test_ui_state.js            GM.UIState: validate/save/saveAs/delete/select/list
├── test_utils.js               GM.Utils: deepCopy, log, error (charakterizační testy)
├── test_validation.js          GM.Validation: validateNumber + validate (vč. v5 pravidel)
├── test_ui_dialog.js           GM.UI: ScriptUI dialog (mock ScriptUI, gather/apply, radio excl., šedý řádek, panel Cesta, zaškrtávátko části obvodu)
├── test_main_process.js        GM.Main: process() a pathMarks() end to end proti falešnému adaptéru (artboardy, offsety, zrcadlení; cesta: odsazení, rohy, běhy, kontrola)
└── test_illustrator_marks.js   GM.Illustrator: placeMarkGroup, getSelectedPathInfo (zaoblené rohy, přímý výběr), offsetPath proti falešnému DOM
```

Testy běží v Node.js, produkční kód se načítá přes `eval()` s mock objekty (File, Folder, alert, $, ScriptUI).
`test_ui_dialog.js` pokrývá reálný UI kód přes `lib/mock_scriptui.js` — chytí radio-grouping chyby.
Chování `offsetPath` v Illustratoru (výsledek Offset Path, výběr, jeden krok Zpět) Node nepokryje — ověřuje se na skutečném buildu a ručně ([manual-test.md](manual-test.md), sekce J).

---

## Kritická pravidla

Pravidla celého repa — ES3, namespace, kódování, živé kolekce DOM — jsou
v [`../../docs/conventions.md`](../../docs/conventions.md). Tady jen to, co je
specifické pro GM.

**Namespace** — `var GM = {}` deklaruje build (hned za `json2.js`); guard `var GM = GM || {};` v každém modulu je pojistka navíc.

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
| Výpočet pozic na cestě | `src/core.js` → `placeAlong()` (začátek tvaru bez rohů: `topmostDist()`) |
| Průběh režimu cesty (odsazení → rohy → rozmístění → kontrola) | `src/main.js` → `GM.Main.pathMarks()` |
| Odsazení cesty přes Illustrator | `src/illustrator.js` → `offsetPath()` |
| Cubic Bézier arc-length, detekce rohů (ostré i zaoblené) | `src/core.js` → `buildCircuit()`, `detectCorners()`, `findCorners()` |
| Část obvodu (Přímý výběr) | `src/illustrator.js` → `getSelectedPathInfo()`; `src/core.js` → `selectedRuns()`, `mapRun()`, `runCorners()` |
| Kontrola výsledku před kreslením | `src/core.js` → `checkMarks()`, `GM.CONSTANTS.OFFSET_TOL` |
| Šedý řádek pod Umístěním | `src/ui.js` → `GM.UI.placementInfoText()` |
| Vykreslování v Illustratoru | `src/illustrator.js` → `placeMarkGroup()` |
| Vytvoření vrstvy „Grommet Marks" | `src/illustrator.js` → `getOrCreateLayer()` |
| Dialog a presety | `src/ui.js` → `GM.UI.buildDialog()` |
| Edge panel + mirror inline | `src/ui.js` → `GM.UI.buildEdgePanel()` |
| Preset state transitions | `../shared/lib/ui_state.js` → `GM.UIState` |
| Validaci vstupů | `src/lib/validation.js` → `GM.Validation` |
| Ukládání nastavení / migraci | `src/lib/storage.js` → `GM.Storage` |
| Unit konverze v UI | `src/ui.js` → `unitsDDL.onChange` |
| Lokalizaci | `src/locale.js` |
| Artboard smyčku | `src/main.js` → `GM.Main.process()` |
| Build systém | `tools/build.sh` |

---

## Layout dialogu (v6.0.0)

Kanonický jednosloupcový kompaktní layout (strop ~795 px; naměřeno headless 2026-10-13: Hrany 731 px, bez zrcadlení 777 px, Cesta 651 px), dle `extendscript-ui-standards`. Panel Vzhled odstraněn.

```
Window("dialog")
 ├─ Panel: Předvolby            ř.1: Načíst [dropdown] ↺ (revert)
 │                              ř.2: Uložit / Uložit jako… / Smazat (vpravo, ZSM layout)
 ├─ Panel: Umístění             radio: Hrany artboardu | Vybraná cesta  (path disabled bez výběru) + Jednotky
 │                              šedý řádek: co skript z výběru poznal (artboardy / rohy, zaoblené rohy, bez rohů)
 ├─ Panel: Hrany                (visible pouze v artboard módu)
 │                              offsety X/Y + 4 kompaktní edge řádky;
 │                              mirror checkbox uvnitř dolní/pravé hrany
 ├─ Panel: Cesta                (visible pouze v path módu)
 │                              Odsazení od kraje (jen uzavřená cesta) + Počet/Rozestup +
 │                              [ ] Jen vybraná část obvodu (aktivní jen při přímém výběru celého úseku)
 ├─ Panel: Rohové zóny          Zhustit u rohů + Počet + Rozteč  (zakázáno na hladké cestě)
 ├─ Panel: Značka               Jednotky / Velikost;
 │                              [✓] Kruh  [ ] Kříž;
 │                              Reg. tah [] pt  Bílé halo [] pt
 ├─ Group: Footer               šedý copyright
 └─ Group: Tlačítka             Storno · Generovat (vpravo)
```
