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

Hodnoty v dialogu jsou ve skutečné velikosti. Banner nakreslený zmenšeně (1:N) má měřítko zapsané v dokumentu a skript všechny délky při kreslení vydělí N — viz Měřítko kresby (1.4.0).

---

## Namespace a soubory

Projekt používá namespace `GM.*`. Každý modul má guard `var GM = GM || {};` a hlavičku s `Module`, `Part of`, `Depends on`.

```
src/
├── constants.js            GM.CONSTANTS — verze, názvy vrstev/swatchů, sentinel, unit faktory
├── locale.js               GM.L — EN/CS stringtable, app.locale detekce, format() helper
├── lib/
│   ├── utils.js            GM.Utils — log, error (předpona CHYBA:), deepCopy, presetEquals (čísla číselně)
│   ├── storage.js          GM.Storage — čtení/zápis JSON, migrační řetěz, [Default] z kódu
│   └── validation.js       GM.Validation — rules (vč. drawingScale), validateNumber, refuse, storable, validate
(../shared/lib/ — sdílené jádro: json2.js, numbers.js, field_paint.js, registration.js, drawing_scale.js, ui_state.js; viz níže a ../../docs/decisions.md)
├── config.js               GM.Config — getDefaults(), PRESET_KEY_DEFAULT, createEdgeDef()
├── core.js                 GM.Core — calcPositions, distributeOnSpan, placeAlong, buildCircuit, detectCorners/findCorners, topmostDist, selectedRuns/mapRun/runCorners, checkMarks — PURE MATH
├── illustrator.js          GM.Illustrator — DOM adapter: init(), placeMarkGroup(), getOrCreateLayer(), registrationColor() (přes GM.Registration), getDocInfo() (vč. měřítka dokumentu), getSelectedPathInfo(), offsetPath()
├── ui.js                   GM.UI — ScriptUI dialog, šedý řádek (nález / důvod), deleguje preset logiku na GM.UIState
└── main.js                 GM.Main — entry point (run() zapisuje měřítko po úspěšném běhu), process() (smyčka přes artboardy; vrací true, když kreslil), pathMarks() (průběh režimu cesty)
```

**Load order (dependencies first):**
```
../shared/lib/json2.js → constants.js → locale.js →
../shared/lib/numbers.js (buildNumbers(GM)) → ../shared/lib/field_paint.js (buildFieldPaint(GM)) →
../shared/lib/registration.js (buildRegistration(GM)) → ../shared/lib/drawing_scale.js (buildDrawingScale(GM)) →
lib/utils.js → config.js → lib/storage.js → lib/validation.js →
../shared/lib/ui_state.js (buildUIState(GM)) → core.js → illustrator.js → ui.js → main.js
```

**Build:**
```bash
npm run build     # = bash tools/build.sh → dist/illustrator-grommet-marks.jsx
npm test          # = bash tests/run_all.sh
npm run verify    # build + test
```

`src/` je master. `dist/` je build output — **nikdy editovat ručně**.

### Sdílená jádra v `../shared/lib/` (od 1.4.0)

Namespace-neutrální továrny `buildX(NS)`: soubor se vloží do dist, `tools/build.sh` za něj připíše `buildX(GM);` (po `locale.js`, před `lib/utils.js`). Testy je nahrávají přes `tests/lib/load_shared.js`. Oprava v modulu platí pro všechny nástroje, které ho používají (kritérium „oprav jednou platí i tam“, viz [`../../docs/decisions.md`](../../docs/decisions.md)).

| Modul | Namespace | Co dělá | Kdo ho v GM volá |
|---|---|---|---|
| `numbers.js` | `GM.Numbers` | `parse(text)` — gramatika rodiny: desetinná čárka nebo tečka, mezery okolo; `1e3`, `.5`, `0x10`, `1 000`, `20 mm` dávají NaN. `format(v, sep)` — zápis do pole s `GM.L.DEC_SEP`, bez zaokrouhlení (`2,5` zůstane `2,5`) | `ui.js` (`gatherAll`, `applyAll`, převod jednotek, živá kontrola), `validation.js` (`validateNumber`, `storable`; tudy čte měřítko i `main.js`, který `GM.Numbers` sám nevolá), `utils.js` (`presetEquals`) |
| `field_paint.js` | `GM.FieldPaint` | `field(et, valid)` — červený text neplatného pole, platnému vrací jeho původní pero (na tmavém UI nesmí zůstat černé); `text(ctrl, kind)` — jednou obarví stavový text (`ERR`, `WARN`, `OK`) | `ui.js` (`field`: `liveValidateAll`; `text`: popisek důvodu v šedém řádku) |
| `registration.js` | `GM.Registration` | `swatch` / `name` / `color(doc)` — registrační vzorek podle **typu** v celém vzorníku, ne podle názvu ani pořadí; dokument bez něj → 100 % K | `illustrator.js` → `registrationColor()` |
| `drawing_scale.js` | `GM.DrawingScale` | `load(doc)` / `save(doc, n)` — měřítko kresby v XMP dokumentu, klíč, který zapisuje Tile Export | `illustrator.js` → `getDocInfo()`, `main.js` → `run()` |

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

Volby jednoho běhu, které se **neukládají**: `GM.UI` je vrací z `getRunOptions()` (dnes `{pathPartial, drawingScale}` — zaškrtávátko „Jen vybraná část obvodu“ a pole „Měřítko kresby 1:“) a `GM.Main.process(settings, opts)` je dostane jako druhý parametr. Měřítko patří dokumentu, ne nastavení: není v žádné předvolbě ani v `[Last Settings]`.

---

## Tok dat

```
GM.Storage.load()                            // [Default] se sestaví z kódu při každém načtení
    → GM.Illustrator.getSelectedPathInfo()   // cesta: segmenty (+ sel), rohy, přímý výběr, circuit
    → GM.Illustrator.getDocInfo()            // artboardy pro šedý řádek + měřítko dokumentu (GM.DrawingScale.load, jinak 1)
        → GM.UI.buildDialog(pData, pathInfo, docInfo)   // pole Měřítko kresby 1: začíná na docInfo.drawingScale
            [uživatel nastaví a klikne OK]
            → ui.gatherAll() → cfg objekt        // čísla z polí přes GM.Numbers.parse
                → GM.Validation.validate(cfg, GM.L)
                    → ui.getRunOptions()         // {pathPartial, drawingScale}
                    → GM.Validation.validateNumber(drawingScale, rules.drawingScale, ...)  // 1–100, jinak konec
                    → GM.Storage.save(pData)  // [Last Settings] auto-save (bez měřítka)
                        → drew = GM.Main.process(settings, runOpts)
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
                                          └ GM.Core.checkMarks(marks, řezová linka, D, OFFSET_TOL / scale, zlomy)   // jen D > 0
                                       → {ok:true, marks} | {ok:false, message}
                                         (chyba = alert a konec, vrstva ani značka nevznikne)
                                     → GM.Illustrator.placeMarkGroup() per značka
                        → pokud drew a drawingScale !== docInfo.drawingScale:
                              GM.DrawingScale.save(doc, drawingScale)    // měřítko se zapíše až po běhu, který kreslil
    → app.redraw()
```

---

## Měřítko kresby (1.4.0)

Návrh a zdůvodnění: [`../../docs/specs/2026-10-20-grommet-marks-1.4.0-design.md`](../../docs/specs/2026-10-20-grommet-marks-1.4.0-design.md).

- **Hodnoty ve skutečné velikosti, kresba N× menší.** `process()` počítá `lengthDiv = doc.scaleFactor × N` (Large Canvas a měřítko kresby se násobí) a vydělí jím všechno, co je délka: `unitFactor = UNIT_FACTORS[units] / lengthDiv` pro odsazení X/Y, rozteče hran a cesty, rozteč v rohových zónách, velikost značky a odsazení od kraje; `regWeight` a `haloWeight` (v pt) také. Počty (Počet ok, počet značek v zóně) se nedělí.
- **Tolerance zůstávají v jednotkách dokumentu.** `OFFSET_TOL`, `SEGMENT_EPS` a mřížka 0,1 pt pro slučování shodných poloh v `place()` popisují přesnost Illustratoru, ne zadanou hodnotu. `pathMarks()` proto dostane `unitFactor` s měřítkem a `scale` jako samotný `scaleFactor` dokumentu.
- **Měřítko není v `cfg`.** `validate()` ho nevidí. `run()` ho čte z `getRunOptions()` a kontroluje pravidlem `rules.drawingScale` (1–100, desetinné; Tile Export a ZSM kreslí N < 1 jako 1:1, GM takové pole odmítne, ať dva nástroje nekreslí týž dokument jinak). Pole je vždy povolené a jeho hodnotu nemění přepnutí jednotek ani předvolby.
- **Zápis do dokumentu.** `run()` zapíše měřítko (`GM.DrawingScale.save`) až po úspěšném `process()` (vrací `true`, když kreslil) a jen když se liší od `docInfo.drawingScale`: odmítnutý běh nechá dokument beze změny a dokument bez měřítka s během v 1:1 zůstane nedotčený. Tile Export píše před během; GM po něm, protože odmítnutí slibuje „Dokument nebyl změněn.“ Zápis není v kroku Zpět: jedno Zpět vrátí značky, ale ne měřítko, takže další dialog nabídne měřítko vráceného běhu (změřeno, [`../../docs/extendscript-engine-facts.md`](../../docs/extendscript-engine-facts.md)). Klíč XMP je společný, takže každý nástroj otevře měřítko od druhého.
- **Šedý řádek** ukáže měřítko jiné než 1:1 na konci a velikost artboardu ve skutečné velikosti (`width × N`).

---

## Šedý řádek pod Umístěním: nález, nebo důvod

- Řádek jsou **dva** `statictext` ve skupině `stack` (ruling R15), z nichž je viditelný vždy právě jeden: nález (`placeInfo`, zakázaný, **nikdy nemalovaný**) a důvod (`placeReason`, povolený, jednou obarvený). Co se ukáže, určuje **jediná** funkce, `refreshInfo()` v `buildDialog`: nastaví text zobrazovaného popisku a přepne `visible`. `liveValidateAll()` ji volá jako **poslední**, takže žádný pozdější krok nepřebije důvod nálezem. Oba popisky se zakládají s textem `longestInfoText()`, takže stack drží stopu jednoho popisku jako v 1.3.0.
- **Důvod** (dokud je Generovat šedé): `GM.L.REASON_MARK + GM.UI.blockReason(blockedBy)` v popisku `placeReason`, který je povolený jako stavová řádka Tile Exportu (jak ScriptUI kreslí vlastní pero na zakázaném statictextu, není změřeno) a při založení jednou obarvený `GM.FieldPaint.text(placeReason, "ERR")`; vracet pero není co, ukazuje jen důvody. Pořadí: jedno neplatné pole se jménem a rozsahem (`REASON_FIELD`, `REASON_FIELD_INT`), víc polí počtem (`REASON_MANY`), pak `REASON_NO_SHAPE`, nakonec `REASON_NO_EDGE`.
- **Nález** (jinak): `GM.UI.placementInfoText(st)` — artboardy nebo tvar cesty, na konci měřítko jiné než 1:1 — v popisku `placeInfo`, zakázaném (`enabled = false`) a **bez jediného zápisu pera**: nativní zašedlý vzhled jako v 1.3.0. Malovat ho by znamenalo `FALLBACK` (šedá 0,75), protože Illustrator vlastní pero čte před `show()` jako `null`, a jak ScriptUI kreslí vlastní pero na zakázaném statictextu, není změřeno (`../../docs/extendscript-engine-facts.md`).
- `blockedBy = {invalid: [{label, rule, unit}], noShape, noEdge}` plní `liveValidateAll()` z tabulky `validationTargets` (`{et, rule, mode, label, unit, mirrored}`); jména polí dává `GM.UI.reasonLabels()`. Kontroluje jen pole aktivního režimu, povolená a nezrcadlená — řádek zrcadlené hrany je skrytý a `validate()` ho nečte, takže ani živá kontrola. Stejně Odsazení X/Y v režimu Vybraná cesta (jsou v panelu Hrany a běh je tam nepoužije): `validate()` je kontroluje jen v režimu Hrany artboardu, v režimu cesty je uloží tak, jak je `storable()` upraví.
- `liveValidateAll()` vrací `numbersOk` (čísla kontrolovaných polí jsou v pořádku). **Generovat** = `numbersOk` a zároveň není `noEdge` ani `noShape`. **Uložit jako…** = `numbersOk`, **Uložit** = `numbersOk` a neuložená změna.
- Šířku řádku drží `GM.UI.longestInfoText()`: statictext si pamatuje šířku prvního textu, proto začíná nejdelším možným (nález s koncem měřítka i nejdelší důvod).

---

## Co smí uložit předvolba: `GM.Validation.storable`

- Předvolba nikdy neuloží hodnotu, kterou další otevření nepřečte. `storable(cfg)` vrací kopii konfigurace, v níž je každé číselné pole číslem, které pravidlo (`rules`) přijímá, jinak výchozí hodnotou pole z `GM.Config.getDefaults()` — i u polí, která nic nekontroluje (druhý režim, vypnutá hrana, vypnuté zóny). Číslo, které už číslem je, se nečte znovu jako text (`String(1e-7)` je `"1e-7"`, což gramatika polí odmítá). Výchozí hodnoty jsou v mm, předvolba je ve své jednotce (`cfg.units`): délka, která spadne na výchozí hodnotu, se převede do jednotky předvolby (`GM.Core.round(GM.Core.convertVal(…))`, stejné zaokrouhlení jako přepínač jednotek), takže 105 mm se v cm uloží jako 10,5, ne jako 105 cm. Pera (pt) a počty se nepřevádějí; chybějící nebo neznámá jednotka znamená mm.
- Používá ho Uložit, Uložit jako… (`ui.js`) i `validate()` (storable plus ověřené hodnoty).
- Indikátor změn (hvězdička, ↺, Uložit) porovnává předvolbu se `storable(gatherAll())`, dokud jsou kontrolovaná pole platná (`currentValues()`); s neplatným polem se porovnávají syrové hodnoty, aby překlep byl změna, kterou ↺ vezme zpět.
- Hvězdička jen u aktivní předvolby: `GM.UIState.formatPresetList` ji dává aktivní položce a `refreshModifiedIndicator()` přepíše text **všech** položek seznamu.
- `GM.Storage.load()` sestaví `[Default]` z `getDefaults()` při každém načtení (viz migrační řetěz).

---

## Režim cesty (1.3.0)

Návrh a zdůvodnění: [`../../docs/specs/2026-10-11-grommet-marks-path-mode-design.md`](../../docs/specs/2026-10-11-grommet-marks-path-mode-design.md).
Měřené chování Illustratoru: [`../../docs/extendscript-engine-facts.md`](../../docs/extendscript-engine-facts.md).

- **Pojmy.** *Řezová linka* = vybraná cesta. *Linka ok* = čára, na kterou padnou
  středy značek: řezová linka posunutá o D dovnitř (u otevřené cesty nebo při
  D = 0 řezová linka sama). Rohy a rozmístění se počítají na lince ok, kontrola
  se měří proti řezové lince.
- **`getSelectedPathInfo()`** je čisté čtení (výběr nemění); vybraná skupina,
  ve které není nic než jedna cesta (i vnořeně), se bere jako ta cesta —
  Illustrator takovou cestu podle způsobu výběru hlásí jako skupinu. Vrací `circuit`,
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
  který Illustrator vrací u příliš úzkého tvaru. Výjimka: značka, jejímž
  nejbližším bodem řezové linky je zlom (kotva, kde se směr zlomí o víc než
  `OFFSET_CORNER_MIN`), smí ležet dál než D, nejvýš `OFFSET_MITER_LIMIT` × D —
  ve vnitřním rohu je roh linky ok D od obou hran, ale dál od vrcholu. Hladké
  kotvy výjimku nedostanou (na kruhu s Počtem ok 4 by prošlo špatné odsazení).

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
| `GM.Numbers` (shared) | Číst a psát čísla polí, volat `GM.L.DEC_SEP` | DOM, UI, alert |
| `GM.FieldPaint` (shared) | Obarvit ScriptUI text podle stavu | Rozhodovat, co je platné |
| `GM.Registration` (shared) | Číst vzorník dokumentu | UI, geometrie |
| `GM.DrawingScale` (shared) | Číst a psát XMP dokumentu | UI, geometrie |
| `GM.UI` | ScriptUI, volat `GM.UIState`/`GM.Storage`/`GM.Core` | DOM rendering |
| `GM.Config` | Konstanty, getDefaults | DOM, UI, File I/O |

---

## Migrační řetěz (GM.Storage.load)

1. **Flat → wrapper**: detekce chybějícího `presets` klíče → zabalení do wrapperu
2. **`__default__` → `[Default]`**: přejmenování sentinel klíče
3. **`[Výchozí]` → `[Default]`**: lokalizovaný legacy klíč
4. **`[Default]` z kódu**: pod tímto klíčem se vždy uloží `GM.Config.getDefaults()`; co soubor držel (starší verze, ruční zásah), se zahodí. Ostatní předvolby a aktivní klíč se nemění.
5. **Per-preset migrace**: v2→v3 (per-edge offsets → global), v3.0→v3.1 (lokalizované stringy → interní klíče)
6. **Forward-fill**: nové default klíče se doplní do existujících presetů

---

## Testy

```
tests/
├── run_all.sh                  Test runner (bash, ANSI output)
├── test_core_math.js           GM.Core: calcPositions, convertVal, buildCircuit, pointAtDistance
├── test_core_circuit.js        GM.Core: detectCorners/findCorners, distributeOnSpan, placeAlong (s test-local obálkou distributeOnCircuit = regrese 1.2.0), topmostDist, selectedRuns/mapRun/runCorners, checkMarks
├── test_storage_migrations.js  GM.Storage: celý migrační řetěz (vč. v5 forward-fill; [Default] z kódu při každém načtení)
├── test_ui_state.js            GM.UIState: validate/save/saveAs/delete/select/list
├── test_utils.js               GM.Utils: deepCopy, log, error (předpona CHYBA:), presetEquals (čísla číselně)
├── test_validation.js          GM.Validation: validateNumber (gramatika polí), rules.drawingScale, storable, refuse, validate (vč. v5 pravidel)
├── test_ui_dialog.js           GM.UI: ScriptUI dialog (mock ScriptUI, gather/apply, radio excl., šedý řádek — nález i důvod, měřítko, panel Cesta, zaškrtávátko části obvodu, předvolby: hvězdička a Uložit, slovník CS/EN a parita klíčů)
├── test_main_process.js        GM.Main: process() a pathMarks() end to end proti falešnému adaptéru (artboardy, offsety, zrcadlení; cesta: odsazení, rohy, běhy, kontrola; dělení délek měřítkem kresby, zápis měřítka až po úspěšném běhu)
├── test_illustrator_marks.js   GM.Illustrator: placeMarkGroup, registrationColor (podle typu), getDocInfo (měřítko dokumentu), getSelectedPathInfo (zaoblené rohy, přímý výběr), offsetPath proti falešnému DOM
└── lib/
    ├── load_shared.js          nahraje moduly ze shared/lib/ do jmenného prostoru testu tak, jak to dělá tools/build.sh
    └── mock_scriptui.js        falešný ScriptUI: zaznamená strom kontrolek a jejich stav, nevykresluje
```

Testy běží v Node.js, produkční kód se načítá přes `eval()` s mock objekty (File, Folder, alert, $, ScriptUI).
`test_ui_dialog.js` pokrývá reálný UI kód přes `lib/mock_scriptui.js` — chytí radio-grouping chyby.
Chování `offsetPath` v Illustratoru (výsledek Offset Path, výběr, jeden krok Zpět) Node nepokryje — ověřuje se na skutečném buildu a ručně ([manual-test.md](manual-test.md), sekce J). Stejně tak zápis měřítka do XMP, barvy šedého řádku na světlém a tmavém UI a rozměry dialogu: sekce K.

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

**Hlášky** — texty jsou jen v `GM.L`. Blokující chyba jde přes `GM.Utils.error` (předpona `CHYBA:`), upozornění po běhu mají `GM.L.WARN_PREFIX` jednou na začátku; odmítnutí před zásahem do dokumentu doplní `GM.Validation.refuse` větou „Dokument nebyl změněn.“; názvy v textu stojí v „…“ a vykřičník žádná hláška nemá.

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
| Šedý řádek pod Umístěním — nález | `src/ui.js` → `GM.UI.placementInfoText()` |
| Šedý řádek — důvod šedého Generovat | `src/ui.js` → `refreshInfo()`, `GM.UI.blockReason()`, `reasonLabels()`, `longestInfoText()` |
| Měřítko kresby (dělení délek) | `src/main.js` → `GM.Main.process()` (`lengthDiv`) |
| Měřítko kresby (čtení a zápis do dokumentu) | `../shared/lib/drawing_scale.js`; `src/illustrator.js` → `getDocInfo()`; `src/main.js` → `GM.Main.run()` |
| Vykreslování v Illustratoru | `src/illustrator.js` → `placeMarkGroup()` |
| Vytvoření vrstvy „Grommet Marks" | `src/illustrator.js` → `getOrCreateLayer()` |
| Dialog a presety | `src/ui.js` → `GM.UI.buildDialog()` |
| Edge panel + mirror inline | `src/ui.js` → `GM.UI.buildEdgePanel()` |
| Preset state transitions | `../shared/lib/ui_state.js` → `GM.UIState` |
| Validaci vstupů | `src/lib/validation.js` → `GM.Validation` |
| Co smí uložit předvolba | `src/lib/validation.js` → `GM.Validation.storable()` |
| Čtení a zápis čísel v polích | `../shared/lib/numbers.js` → `GM.Numbers` |
| Barva neplatného pole | `../shared/lib/field_paint.js` → `GM.FieldPaint` |
| Registrační barva značek | `../shared/lib/registration.js`; `src/illustrator.js` → `registrationColor()` |
| Ukládání nastavení / migraci | `src/lib/storage.js` → `GM.Storage` |
| Unit konverze v UI | `src/ui.js` → `unitsDDL.onChange` |
| Lokalizaci | `src/locale.js` |
| Artboard smyčku | `src/main.js` → `GM.Main.process()` |
| Build systém | `tools/build.sh` |

---

## Layout dialogu (v6.0.0)

Kanonický jednosloupcový kompaktní layout dle `extendscript-ui-standards`. Panel Vzhled odstraněn. V 1.3.0 měl dialog strop ~795 px (naměřeno headless 2026-10-13: Hrany 731 px, bez zrcadlení 777 px, Cesta 651 px). Verze 1.4.0 přidala řádek s Měřítkem kresby a podle návrhu (§8) srovnala strop s Tile Exportem na cca 850 px; změřené rozměry jsou v [manual-test.md](manual-test.md), sekce K7.

```
Window("dialog")
 ├─ Panel: Předvolby            ř.1: Načíst [dropdown] + ↺ (revert, vlastní skupina vedle seznamu)
 │                              ř.2: Uložit / Uložit jako… / Smazat (vpravo, nativní šířky)
 ├─ Panel: Umístění             ř.1: radio Hrany artboardu | Vybraná cesta  (path disabled bez výběru)
 │                              ř.2: Jednotky [dropdown]   Měřítko kresby 1: [__]
 │                              ř.3: šedý řádek (stack ze dvou popisků): nález (artboardy / rohy, zaoblené rohy, bez rohů; na konci měřítko), nebo důvod
 │                                   nebo, dokud je Generovat šedé, důvod červeně se symbolem ✗
 ├─ Panel: Hrany                (visible pouze v artboard módu)
 │                              offsety X/Y + 4 kompaktní edge řádky;
 │                              mirror checkbox uvnitř dolní/pravé hrany
 ├─ Panel: Cesta                (visible pouze v path módu)
 │                              Odsazení od kraje (jen uzavřená cesta) + Počet/Rozteč +
 │                              [ ] Jen vybraná část obvodu (aktivní jen při přímém výběru celého úseku)
 ├─ Panel: Rohové zóny          Zhustit u rohů + Počet + Rozteč  (zakázáno na hladké cestě)
 ├─ Panel: Značka               Tvar: [✓] Kruh  [ ] Kříž   Velikost [];
 │                              Reg. tah (pt) []  Bílé halo (pt) []
 ├─ Group: Footer               šedý copyright
 └─ Group: Tlačítka             Storno · Generovat (vpravo)
```
