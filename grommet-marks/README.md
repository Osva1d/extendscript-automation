# Grommet Marks (Značky pro oka)

Skript pro Adobe Illustrator, který automaticky vytváří značky pro oka (kroužky) po obvodu plátna (artboardu). Ideální pro přípravu bannerů do výroby.

## Changelog

### v3.1.0 (2026-02-22)
- **REFACTOR:** Sentinel systém — interní klíče `__create__`/`__default__` odděleny od lokalizovaných display stringů
- **REFACTOR:** Unit systém — interní klíče `mm`/`cm`/`in` odděleny od lokalizovaných názvů
- **FEATURE:** Migrace ze starých formátů (lokalizované unit/sentinel stringy → interní klíče)
- **FIX:** `process()` — přidán try-catch wrapper pro neočekávané DOM chyby
- **BUILD:** Nové `tools/build.sh` s aktualizovanou verzí a load order

### v3.0.0 (2026-02-09)
- **FIX:** Systémové vzorníky nyní fungují ve všech lokalizacích Illustratoru (CZ, EN, DE, FR...)
- **FEATURE:** Globální odsazení X/Y pro všechny hrany (nahrazuje per-edge offsety)
- **FEATURE:** Měření ke středu značky (offsety měřeny ke středu, ne k okraji)
- **FEATURE:** 15 tooltipů na klíčových UI prvcích
- **FEATURE:** Modulární build systém (7 zdrojových souborů → 1 distribuce)
- **MIGRATION:** Automatická migrace presetů v2→v3

### v2.1.0
- JSON polyfill (Crockford's json2.js)
- Namespace pattern refaktoring
- JSDoc dokumentace

### v2.0.0
- Nezávislé nastavení bottom/right hran
- Podpora všech artboardů
- Preferovaný rozestup značek

## Funkce
- **Automatické rozmístění**: Vypočítá pozice značek na základě počtu nebo rozestupu.
- **Flexibilní nastavení**: Samostatné nastavení pro každou stranu (Horní, Dolní, Levá, Pravá) s možností zrcadlení.
- **Bezpečnost**: Používá JSON pro ukládání nastavení (bez `eval`).
- **Uživatelské rozhraní**:
    - Výběr vrstvy pro značky.
    - Výběr barvy výplně a obrysu (včetně přetisku).
    - Převod jednotek (mm/cm).
    - Ukládání a načítání presetů.

## Instalace
1. Stáhněte soubor `dist/illustrator-grommet-marks.jsx`.
2. Vložte jej do složky skriptů Illustratoru:
   - **macOS**: `/Applications/Adobe Illustrator [Verze]/Presets/[Jazyk]/Scripts/`
3. Restartujte Illustrator.

## Použití
1. Otevřete dokument v Illustratoru.
2. Spusťte skript přes `Soubor > Skripty > GrommetMarks`.
3. Nastavte parametry a klikněte na **OK**.

## Vývoj

### Struktura projektu

Zdrojový kód je rozdělen do 7 modulů v `src/`:

- **`polyfills/json2.js`** — JSON polyfill (Douglas Crockford)
- **`constants.js`** — `GM.CONSTANTS` (verze, sentinel hodnoty, unit faktory)
- **`locale.js`** — `GM.L` (EN/CS lokalizace, `app.locale` detekce, `format()` helper)
- **`config.js`** — `GM.Config` (persistence, migrace, výchozí hodnoty)
- **`core.js`** — `GM.Core` (geometrické výpočty, `calcPositions`)
- **`illustrator.js`** — `GM.Illustrator` (DOM adapter, `isSystemSwatch`, `placeMark`)
- **`ui.js`** — `GM.UI` (ScriptUI dialog, ~550 řádků)
- **`main.js`** — `GM.Main` (vstupní bod, procesní smyčka)

### Build

Build skript spojuje moduly do jediného souboru:

```bash
bash tools/build.sh
```

**Výstup:** `dist/illustrator-grommet-marks.jsx`

### ES3 Compliance

Veškerý kód je kompatibilní s ExtendScript ES3:
- Pouze `var` (ne `const`, `let`)
- Pouze `function` (ne arrow functions `=>`)
- Žádné template literals
- Žádné ES5+ array metody (`.forEach`, `.map`, `.filter`)

### Architektura

Více informací v [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md):
- Namespace pattern `GM.*`
- Modulové hranice a data flow
- Build pipeline
- v2→v3 migrace
