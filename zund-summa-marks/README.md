# Zünd & Summa Marks

> Copyright © 2025-2026 Ladislav Osvald (Osva1d).
> Licensed under **GNU GPL-3.0-or-later** — see [LICENSE](LICENSE) for details.

Skript pro Adobe Illustrator, který automaticky generuje registrační značky pro řezací plotry Zünd a Summa. Určen pro tiskovou přípravu v prepress/DTP prostředí.

---

## Funkce

- **ZUND mód** — kruhové značky (φ 5 mm), orientační bod, interpolace na dlouhých stranách
- **SUMMA mód** — čtvercové značky (3 mm), barcode bar, volitelné ořezové červené linky, feed margins
- **Dynamická správa vrstev** — libovolný počet řezacích vrstev s vlastním názvem a přímou barvou
- **Preset systém** — ukládání a přepínání konfigurací; automatický `[Last Settings]`
- **Multilanguage** — čeština (cs) a angličtina (en) dle locale Illustratoru
- **Large Canvas podpora** — správná práce s `scaleFactor = 10.0`
- **Migrace nastavení** — automatický převod formátů z předchozích verzí

---

## Požadavky

- Adobe Illustrator CC 2024+ (v28.x) nebo CC 2025 (v29.x)
- macOS (testováno na Monterey 12+)
- ExtendScript engine (součást Illustratoru)

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
│   │   ├── json2.js        # JSON polyfill (ES3 kompatibilní)
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
│   └── TEST_PLAN_MASTER.md
├── tests/
│   └── test_core_math.js
├── tools/
│   └── build.sh
├── LICENSE
└── README.md
```

### Load order

```
json2.js → locale.js → utils.js → config.js → core.js → draw.js → ui.js → main.jsx
```

`locale.js` musí být před `utils.js`, protože `ZSM.Utils` volá `ZSM.L.format()`.

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

Soubor: `~/Library/Application Support/ZSM/settings_v26_3.json`

Skript automaticky migruje starší formáty:
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

Manuální testy: viz `docs/TEST_PLAN_MASTER.md`

---

## Changelog

### v26.3.2 (2026-05) — Phase 1 patch: 1:10 workflow unblock
- **Fix:** Validace `maxDist` (rozteč značek) — minimum sníženo 50 → 5 mm. Workflow uživatele pracujícího se zmenšeným dokumentem (např. 500×500 mm reprezentujícím 5000×5000 mm reality) přestal být blokován validací při zadání rozteče < 50 mm. Plně automatická scale-aware podpora přijde ve v27.x (Phase 2).
- Regresní testy: `tests/test_validation.js` boundary asserts aktualizovány (5/4 místo 50/49) + 2 nové scenario testy pro 1:10 vstupy 30 mm a 40 mm.
- Dokumentace: README sekce „Workflow při zmenšeném měřítku (1:10)" v Projects/extendscript-automation, INSTALL_MAC aktualizován s aktuálními názvy skriptů.

#### Test pyramide (post-v26.3.1 milestones zachované)
- 12 test suites, **1051 tests** + 24 properties (~2400 random cases)
- ES3 compliance linter (`tests/test_es3_compliance.js`) — chrání proti ExtendScript runtime crashům typu `Array.map is not a function`
- HIG audit `docs/hig-audit.md` + automatizované `tests/test_ui_layout.js`
- E2E workflow simulace (`tests/test_e2e_workflow.js`) — zachytává integrace UI ↔ render

### v26.3.1 (2026-03)
- Oprava: `endSession()` obnovuje viditelnost dříve skrytých vrstev
- Oprava: `getBounds()` přeskakuje skryté vrstvy a vodítka (guides)
- Oprava: `Storage.save()` obalena try-catch
- Oprava: přejmenování vrstvy „Graphics" se propaguje do locked/hidden trackerů
- Oprava: prázdné catch bloky v `render()` nyní logují chybu
- Oprava: `replace(",", ".")` → globální `replace(/,/g, ".")` pro decimální vstup
- Migrace: locale-independent default preset key (`[Výchozí]` → `[Default]`)
- Migrace: odstranění `layers[].active` property (row existence = active)
- UI: přeuspořádání sloupců na Layer → Color (mentální model)
- UI: sjednocení spacing (10px), oprava zarovnání header/data sloupců
- Přidán copyright a proprietární licence
- Aktualizace README.md a ARCHITECTURE.md

### v26.3.0 (2026-02-22)
- Přepis namespace `PMA` → `ZSM`
- Nový modul `locale.js` — kompletní EN/CS lokalizace, `app.locale` detekce
- Preset systém — pojmenované presety, `[Last Settings]`, ochrana `[Default]`
- Dynamické vrstvy — `layers[]`, combobox s existujícími vrstvami, swatch dropdown
- Oprava bugu: `drawRed` nefungovalo pro SUMMA mód (`isS` scope error)
- Oprava bugu: `markSizeZ/S` fallback odkazoval na špatný objekt
- Swatch dropdown pro barvu značek (UX-03)
- Migrace ze starých formátů v26.0 → v26.3
- Synchronizace `src/` a `dist/` — src jako master
- Aktualizace `build.sh` (nový load order s `locale.js`)

### v26.2.x — v26.0 (2025–2026)
- Viz git history

---

## Licence

Copyright © 2025-2026 Ladislav Osvald (Osva1d).

Tento software je licencován pod **GNU General Public License v3.0** (or later) — viz [LICENSE](LICENSE). Plný text licence: <https://www.gnu.org/licenses/gpl-3.0.txt>.

Pro komerční licencování (mimo GPL podmínky) kontaktujte autora.

Třetí strany: `json2.js` (Douglas Crockford) — public domain.
