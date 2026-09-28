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
2. Spustit: `File > Scripts > Other Script... > illustrator-zund-summa-marks.jsx`
3. Nastavit parametry v dialogu → kliknout **Generovat**

Běh se vrací několika kroky Zpět (Cmd+Z). Změna artboardu je samostatný krok —
ve stejném kroku s ostatními změnami by ji Illustrator nevrátil vůbec. SUMMA
s ořezovými linkami má kroků víc než ZUND.

### Módy

**Dle grafiky (Auto-fit)** — značky se umístí kolem veškeré grafiky v dokumentu, i ve skrytých vrstvách a mimo artboard, a artboard se jí přizpůsobí. Výběr se nebere v úvahu: co značky obepínat nemají (šablony, poznámky mimo artboard), musí z dokumentu pryč.

**Dle Artboardu (Fixed)** — artboard se nemění; značky se umisťují od okraje artboardu.

Značky, které by se dotýkaly nebo překrývaly (typicky orientační značka s pravou dolní rohovou u grafiky široké kolem 90 mm) nebo by ve Fixed módu přesahovaly artboard, zastaví běh dřív, než se dokument změní. Hláška řekne, kterou hodnotu upravit.

### Správa vrstev

Panel *Přiřazení vrstev k barvám* obsahuje tabulku řezacích vrstev. Každý řádek má:
- **Combobox** — název vrstvy v dokumentu (výběr z existujících nebo vlastní text)
- **Dropdown** — přímá barva asociovaná s touto vrstvou (seznam živých swatchů z dokumentu)
- **Tlačítko ✕** — odebrání řádku (minimum 1 řádek musí vždy existovat)

Tlačítkem **+ Přidat** lze přidat až 8 vrstev.

Skript přesune všechny cesty s odpovídající přímou barvou na příslušnou vrstvu automaticky. Objekt, který má vedle řezové barvy i tiskovou výplň nebo tah (typicky podkladový tvar samolepky s řezovým tahem), nepřesune a ohlásí ho — v řezové vrstvě nad grafikou by změnil tisk.

Vrstvy **Regmarks** a **Trim** patří skriptu (značky a ořezové linky) a v mapování je použít nejde. Ve vrstvě Trim skript obnovuje jen své vlastní ořezové linky; cizí objekty v ní nechá a upozorní na ně.

### Presets

Nastavení se ukládají jako pojmenované presety. Speciální presety:
- `[Default]` — výchozí hodnoty, nelze smazat (v UI zobrazen lokalizovaně jako `[Výchozí]`)
- `[Last Settings]` — interní auto-save posledního spuštění (v dropdown se nezobrazuje)

Preset si pamatuje i mód. Výběr presetu jiného módu (nebo ↺ na něj) přepne dialog do jeho módu.

---

## Nastavení vrstev — datová struktura

Každá vrstva je objekt:

```javascript
{ name: "Cut", color: "[Registration]" }
```

Přítomnost řádku v poli = vrstva je aktivní. Výchozí předvolba má jeden řádek
Cut s řezovou barvou, kterou skript najde v dokumentu (CutContour, Thru-cut,
Kiss-cut nebo Cut, v tomto pořadí). Když žádnou nenajde, zůstane
`[Registration]` — takový řádek se při běhu přeskočí s upozorněním, protože
registrační barvou nejde rozpoznat řezové cesty.

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
| `orientDist` | `100` mm | Mezera mezi levou dolní rohovou a orientační značkou (ZUND) |
| `markColor` | `[Registration]` | Přímá barva značek |
| `feedTop` | `70` mm | Horní přesah materiálu (SUMMA) |
| `feedBottom` | `50` mm | Spodní přesah materiálu (SUMMA) |
| `drawRed` | `true` | Kreslit červené ořezové linky (SUMMA) |
| `useArtboardBounds` | `false` | Mód Dle Artboardu (Fixed) |
| `scaleN` | `1` | Práce v měřítku 1:N (1–10); rozměry se zadávají v reálných mm |
| `marksOnly` | `false` | Pouze značky — vrstvy a cesty beze změny |

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

### Struktura

```
zund-summa-marks/
├── src/
│   ├── lib/
│   │   ├── utils.js        # ZSM.Utils — mm↔pt, měřítko, validace čísla, log, hlášky
│   │   ├── validation.js   # ZSM.Validation — validace nastavení
│   │   ├── storage.js      # ZSM.Storage — nastavení na disk + migrace
│   │   └── bounds.js       # ZSM.Bounds — měření grafiky (clip-aware)
│   ├── locale.js           # ZSM.L — lokalizace (cs/en), format helper
│   ├── config.js           # ZSM.Config — konstanty, getDefaults()
│   ├── draw.js             # ZSM.Draw — Illustrator DOM, vrstvy, renderování
│   ├── ui.js               # ZSM.UI — ScriptUI dialog, presety
│   └── main.js             # Entry point — IIFE, orchestrace
├── docs/                   # architecture.md, manual-test.md
├── tests/                  # Node.js sady test_*.js, mocky v tests/lib/
├── tools/build.sh
└── dist/                   # build output (gitignored)
```

Matematiku značek (`ZSM.Core`) a další sdílené moduly vkládá build
z `../shared/lib/` (viz [../docs/decisions.md](../docs/decisions.md)). Moduly,
pořadí v buildu, datový tok a formát uložených presetů popisuje
[docs/architecture.md](docs/architecture.md), pravidla celého repa (ES3,
namespace, kódování) [../docs/conventions.md](../docs/conventions.md).

### Build a testy

```bash
npm run build     # = bash tools/build.sh → dist/illustrator-zund-summa-marks.jsx
npm test          # všechny sady v tests/ (Node.js, bez Illustratoru)
npm run verify    # build + testy
```

`src/` je master, `dist/` je build output — needitovat ručně. Co automat nevidí,
je v [docs/manual-test.md](docs/manual-test.md).

### Přidání nového lokalizovaného stringu

1. Přidat klíč do `ZSM.L` v `src/locale.js` — do obou sekcí `en` a `cs`
2. Použít jako `ZSM.L.KLIC` nebo `ZSM.L.format(ZSM.L.KLIC, arg1, arg2)`

---

## Changelog

Viz [CHANGELOG.md](CHANGELOG.md).


---

## Licence

Licence MIT. Copyright © 2025-2026 Ladislav Osvald. Viz [LICENSE](../LICENSE).

Software můžete volně používat, kopírovat, upravovat a distribuovat (i komerčně), pokud zachováte copyright. Poskytováno „as is", bez záruk.

Třetí strany: `json2.js` (Douglas Crockford) — public domain.
