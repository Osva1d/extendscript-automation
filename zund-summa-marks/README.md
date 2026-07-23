# Zünd & Summa Marks

> Copyright © 2025-2026 Ladislav Osvald.
> Licensed under the **MIT License** — see [LICENSE](../LICENSE).

Skript pro Adobe Illustrator, který automaticky generuje registrační značky pro řezací plotry Zünd a Summa. Určen pro tiskovou přípravu v prepress/DTP prostředí.

---

## Funkce

- **ZUND mód** — kruhové značky (φ 5 mm), orientační bod, interpolace na dlouhých stranách
- **SUMMA mód** — čtvercové značky (3 mm), barcode bar, volitelné ořezové červené linky, feed margins
- **Dynamická správa vrstev** — libovolný počet řezacích vrstev s vlastním názvem a přímou barvou
- **Preset systém** — ukládání a přepínání konfigurací; automatický `[Last Settings]`
- **Multilanguage** — čeština (cs) a angličtina (en) dle locale Illustratoru
- **Large Canvas podpora** — správná práce s `scaleFactor = 10.0`
- **Manuální měřítko 1:N** — práce se zmenšeným dokumentem (např. 1:10); zadáváš reálné rozměry, skript je přepočítá (checkbox „Pracovat v měřítku")
- **Migrace nastavení** — automatický převod formátů z předchozích verzí

---

## Požadavky

- Adobe Illustrator CC 2024+ (v28.x) nebo CC 2025 (v29.x)
- macOS (testováno na Monterey 12+)
- ExtendScript engine (součást Illustratoru)

---

## Instalace

1. Stáhni hotový `illustrator-zund-summa-marks.jsx` z [GitHub Releases](https://github.com/Osva1d/extendscript-automation/releases), nebo si jej postav ze zdroje (`bash tools/build.sh` → `dist/`).
2. Spusť přes `Soubor ▸ Skripty ▸ Jiný skript…`, nebo jej vlož do složky skriptů Illustratoru pro trvalé umístění:
   - **macOS:** `/Applications/Adobe Illustrator [verze]/Presets/[jazyk]/Scripts/`
3. Při vložení do Presets restartuj Illustrator.

---

## Použití

### Rychlý start

1. Otevřít dokument s grafikou
2. Vybrat grafiku (nebo použít mód "Dle Artboardu")
3. Spustit: `File > Scripts > Other Script... > illustrator-zund-summa-marks.jsx`
4. Nastavit parametry v dialogu → kliknout **Generovat**

### Módy

**Dle výběru (Auto-fit)** — artboard se automaticky přizpůsobí grafice; značky se umisťují od okraje výběru. Vyžaduje, aby byla grafika vybrána.

**Dle Artboardu (Fixed)** — artboard se nemění; značky se umisťují od okraje artboardu. Nevyžaduje výběr.

### Správa vrstev

Panel *Přiřazení vrstev k barvám* obsahuje tabulku řezacích vrstev. Každý řádek má:
- **Combobox** — název vrstvy v dokumentu (výběr z existujících nebo vlastní text)
- **Dropdown** — přímá barva asociovaná s touto vrstvou (seznam živých swatchů z dokumentu)
- **Tlačítko ✕** — odebrání řádku (minimum 1 řádek musí vždy existovat)

Tlačítkem **+ Přidat** lze přidat až 8 vrstev.

Skript přesune všechny cesty s odpovídající přímou barvou na příslušnou vrstvu automaticky.

### Presets

Nastavení se ukládají jako pojmenované presety. Speciální presety:
- `[Default]` — výchozí hodnoty, nelze smazat (v UI zobrazen lokalizovaně jako `[Výchozí]`)
- `[Last Settings]` — interní auto-save posledního spuštění (v dropdown se nezobrazuje)

---

## Adresářová struktura

```
zund-summa-marks/
├── src/
│   ├── lib/
│   │   └── utils.js        # ZSM.Utils — konverze, validace, logging
│   ├── locale.js           # ZSM.L — lokalizace (cs/en), format helper
│   ├── config.js           # ZSM.Config — konstanta, defaults, Storage
│   ├── core.js             # ZSM.Core — čistá matematika (testovatelné bez DOM)
│   ├── draw.js             # ZSM.Draw — Illustrator DOM, vrstvy, renderování
│   ├── ui.js               # ZSM.UI — ScriptUI dialog, presety, validace
│   └── main.jsx            # Entry point — IIFE, orchestrace
├── dist/
│   └── illustrator-zund-summa-marks.jsx   # Build output (single file)
├── docs/
│   ├── ARCHITECTURE.md
│   └── MANUAL_TEST.md
├── tests/
│   └── test_core_math.js
├── tools/
│   └── build.sh
└── README.md
```

### Load order

```
../shared/lib/json2.js → locale.js → utils.js → validation.js →
../shared/lib/ui_state.js (buildUIState(ZSM)) → config.js → storage.js →
core.js → bounds.js → draw.js → ui.js → main.jsx
```

`locale.js` musí být před `utils.js`, protože `ZSM.Utils` volá `ZSM.L.format()`.
Sdílené jádro `json2.js` a `ui_state.js` žije v `../shared/lib/` v kořeni repozitáře
(viz [../docs/decisions.md](../docs/decisions.md)); build je vkládá přímo, resp.
přes `buildUIState(ZSM)`.

---

## Build

```bash
cd zund-summa-marks
bash tools/build.sh
```

Output: `dist/illustrator-zund-summa-marks.jsx`

Soubory v `src/` jsou master. Soubor v `dist/` je build output — **needitovat ručně**.

---

## Architektura

```
ZSM.L        — lokalizace, načte se jako první, dostupná všem modulům
ZSM.Utils    — helper funkce (mm↔pt, validace, log, error alert)
ZSM.Config   — konfigurace, Storage (save/load/migrate), getDefaults()
ZSM.Core     — calculateAll() — pure math, žádný DOM, testovatelné
ZSM.Draw     — renderování, getBounds(), layer management, swatch/layer helpers
ZSM.UI       — ScriptUI dialog, preset logika, event handling
```

Separace je záměrná: Core nepracuje s DOM, Draw nevytváří UI, UI nepočítá geometrii.

### Datový tok

```
Storage.load()
    → UI.show(presetWrapper)
        → Core.calculateAll(settings, bounds)
            → Draw.render(geometry, settings)
                → Draw.beginSession() / endSession()
    → Storage.save(presetWrapper)
```

### Preset wrapper

Skript interně pracuje s wrapperem, ne s flat objektem nastavení:

```javascript
{
    activePreset: "[Last Settings]",
    presets: {
        "[Default]":       { mode: "ZUND", gapInner: 5, layers: [...], ... },
        "[Last Settings]": { mode: "SUMMA", gapInner: 8, layers: [...], ... },
        "Moje předvolba": { ... }
    }
}
```

---

## Nastavení vrstev — datová struktura

Každá vrstva je objekt:

```javascript
{ name: "Cut", color: "[Registration]" }
```

Přítomnost řádku v poli = vrstva je aktivní. Výchozí stav při prvním spuštění:

```javascript
layers: [
    { name: "Cut", color: "[Registration]" }
]
```

---

## Nastavení — popis parametrů

| Parametr | Výchozí | Popis |
|----------|---------|-------|
| `mode` | `ZUND` | Technologie: `ZUND` nebo `SUMMA` |
| `gapInner` | `5` mm | Vzdálenost značek od grafiky (ZUND) |
| `gapOuter` | `0` mm | Vzdálenost značek od okraje artboardu |
| `maxDist` | `500` mm | Maximální rozteč — při překročení se vkládají mezilehlé body |
| `markSizeZ` | `5` mm | Průměr značky Zünd |
| `markSizeS` | `3` mm | Strana značky Summa |
| `markColor` | `[Registration]` | Přímá barva značek |
| `feedTop` | `70` mm | Horní přesah materiálu (SUMMA) |
| `feedBottom` | `50` mm | Spodní přesah materiálu (SUMMA) |
| `drawRed` | `true` | Kreslit červené ořezové linky (SUMMA) |
| `useArtboardBounds` | `false` | Mód Dle Artboardu (Fixed) |

---

## Uložená nastavení

Soubor: `~/Library/Application Support/ZSM/settings.json`
(starší `settings_v26_3.json` se při prvním spuštění automaticky načte a přepíše na nový název)

Skript automaticky migruje starší formáty:
- `settings_v26_3.json` → `settings.json` (přejmenování souboru)
- v26.0 flat (`thruActive/kissActive`) → v26.3 `layers[]`
- flat objekt → preset wrapper
- `layers[].active` property → row existence (aktivní = přítomen v poli)
- lokalizovaný klíč `[Výchozí]` → fixní `[Default]`

---

## Vývoj

### Konvence

- ES3 only — `var`, `function`, žádné `const/let/arrow functions/template literals`
- Namespace: `ZSM.*` — žádné globální proměnné
- Komentáře v kódu anglicky, UI texty česky (nebo přes `ZSM.L`)
- České řetězce v `locale.js` jako literály (UTF-8 with BOM zajišťuje správnou interpretaci v ExtendScript)

### Přidání nového lokalizovaného stringu

1. Přidat klíč do `ZSM.L` v `src/locale.js` — do obou sekcí `en` a `cs`
2. Použít jako `ZSM.L.KLIC` nebo `ZSM.L.format(ZSM.L.KLIC, arg1, arg2)`

### Testování

Jednotkové testy pro `ZSM.Core` (pure math): `tests/test_core_math.js`

Manuální testy: viz `docs/MANUAL_TEST.md`
---

## Changelog

Viz [CHANGELOG.md](CHANGELOG.md).


---

## Licence

Licence MIT. Copyright © 2025-2026 Ladislav Osvald. Viz [LICENSE](../LICENSE).

Software můžete volně používat, kopírovat, upravovat a distribuovat (i komerčně), pokud zachováte copyright. Poskytováno „as is", bez záruk.

Třetí strany: `json2.js` (Douglas Crockford) — public domain.
