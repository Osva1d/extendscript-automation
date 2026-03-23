# Architecture: Grommet Marks v3.1.0

> Technický brief pro Antigravity agenty.
> Než začneš pracovat na tomto projektu, přečti celý dokument.

---

## Co skript dělá

Generuje značky pro oka (kroužky/čtverce) po obvodu artboardů v Adobe Illustratoru. Spouští se jako `.jsx` skript přes `File > Scripts`. Uživatel nastaví parametry v dialogu → skript vypočítá pozice → vykreslí značky na cílovou vrstvu.

Podporuje libovolný počet artboardů v jednom dokumentu. Deduplication hash zabrání duplicitním značkám na rozích kde se hrany překrývají.

---

## Namespace a soubory

Projekt používá namespace `GM.*`.

```
src/
├── polyfills/
│   └── json2.js        JSON polyfill (Douglas Crockford, ES3)
├── constants.js        GM.CONSTANTS — verze, názvy vrstev/swatchů, sentinel hodnoty, unit faktory
├── locale.js           GM.L — EN/CS stringtable, app.locale detekce, format() helper
├── config.js           GM.Config — getDefaults(), Storage (load/save/migrate)
├── core.js             GM.Core — calcPositions(), convertVal() — PURE MATH, žádný DOM
├── illustrator.js      GM.Illustrator — DOM adapter: init(), placeMark(), getOrCreateLayer/Swatch()
├── ui.js               GM.UI — ScriptUI dialog, preset logika, edge panely, unit konverze
└── main.js             GM.Main — entry point, artboard smyčka
```

**Load order (NELZE měnit):**
```
json2.js → constants.js → locale.js → config.js → core.js → illustrator.js → ui.js → main.js
```

`locale.js` musí být po `constants.js` (používá `GM.CONSTANTS.SENTINEL_*`), ale před vším ostatním.

**Build:**
```bash
bash tools/build.sh   # → dist/illustrator-grommet-marks.jsx
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

### Sentinel hodnoty (NIKDY nezobrazovat v UI)
```javascript
GM.CONSTANTS.SENTINEL_CREATE  = "__create__"    // → vytvořit default vrstvu/swatch
GM.CONSTANTS.SENTINEL_DEFAULT = "__default__"   // → klíč výchozího presetu v uložených datech
```

Lokalizované display strings (`[Vytvořit 'Grommet Marks']`, `[Výchozí]`) jsou výhradně v `GM.L` a nikdy se neukládají na disk.

### Uložená data (disk)
Objekt kde klíče jsou interní jména presetů, hodnoty jsou settings objekty:
```javascript
{
    "__default__": { /* settings */ },
    "Banner 400x150": { /* settings */ }
}
```

Soubor: `~/Library/Application Support/GrommetMarks/GrommetMarksSettings.json`

---

## Tok dat

```
GM.Config.load()
    → GM.Illustrator.getLayerNames() + getSwatchNames()
        → GM.UI.buildDialog(allSettings, layerInfo, swatchInfo)
            [uživatel nastaví a klikne OK]
            → ui.gatherAll() → cfg objekt
                → GM.Main.process(cfg)
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
| `GM.UI` | ScriptUI, volat `GM.Illustrator` (getLayerNames/getSwatchNames), `GM.Core` (convertVal) | DOM rendering |
| `GM.Config` | Konstanty, Storage, getDefaults | DOM, UI, math |

---

## Kritická pravidla

**ES3 only** — žádné `const`, `let`, arrow functions, template literals, `.forEach`/`.map`.

**Namespace** — žádné globální proměnné. `var GM = {}` je deklarováno buildem (vloženo po json2.js).

**Sentinels** — nikdy neukládat lokalizované display stringy na disk. Disk = interní klíče. UI = `GM.UI.toDisplay()` / `GM.UI.toStorage()` pro konverzi.

**Unit systém** — na disk se ukládají interní klíče (`"mm"`, `"cm"`, `"in"`), ne lokalizované názvy. Viz migrace v `GM.Config.migrate()`.

**System swatches** — `GM.Illustrator.isSystemSwatch(name)` filtruje bracketed swatches `[...]` — locale-independent, funguje v CZ/EN/DE/FR Illustratoru.

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
| Unit konverze v UI | `src/ui.js` → `unitsDDL.onChange` |
| Lokalizaci | `src/locale.js` |
| Ukládání nastavení / migraci | `src/config.js` → `GM.Config.load/save/migrate()` |
| Artboard smyčku | `src/main.js` → `GM.Main.process()` |
| Build systém | `tools/build.sh` |

---

## Aktuální stav projektu

**Větev:** `_incubator/grommet-marks`
**Fáze:** Ready to deploy — čeká na unifikaci konvencí před přesunem do `Projects/extendscript-automation`

**Co je hotovo:**
- Sentinel systém (v3.1.0) — interní klíče odděleny od UI stringů
- Unit systém (v3.1.0) — interní klíče `mm/cm/in`
- Migrace ze starých formátů (v2→v3, lokalizované strings → interní klíče)
- `process()` — try-catch wrapper pro neočekávané DOM chyby (v3.1.0)
- dist/ = build z src/ (synchronizovaný)
- Audit (2026-03): opraveny nalezené bugy:
  - C1: per-item try/catch v getSwatchNames() (crash resilience)
  - C2: per-item try/catch v getLayerNames() (crash resilience)
  - C3: placeMark() neabortuje zbývající značky při chybě jedné
  - W1: dedikovaný ERR_WRITE_SETTINGS lokalizační klíč v save()
  - Locale: \uXXXX escape nahrazeny literálními českými znaky

**Otevřené úkoly:**
- Manuální testování
- Konvence unifikace před deployem (dle `05-PROJECT-MAP.md`)
