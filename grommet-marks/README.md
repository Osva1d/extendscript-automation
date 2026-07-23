# Grommet Marks (Značky pro oka)

Skript pro Adobe Illustrator, který automaticky vytváří značky pro oka (kroužky nebo čtverce) po obvodu plátna (artboardu). Ideální pro přípravu bannerů do výroby.

## Funkce

- **Automatické rozmístění** — pozice značek podle pevného počtu nebo preferovaného rozestupu, samostatně pro každou hranu (Horní, Dolní, Levá, Pravá) se zrcadlením protějších hran.
- **Rozmístění na tvar** — volba „Vybraná cesta" umístí značky na libovolnou uzavřenou nebo otevřenou vektorovou cestu; krajní body a rohy jsou vždy kotvy.
- **Rohové zóny** — zhustí N značek u každého rohu s vlastní roztečí; střed hrany/cesty pak jede standardním rozestupem.
- **Globální odsazení X/Y** — měřeno ke středu značky, zarovnané v rozích.
- **Jednotný vzhled značky** — registrační Esko-styl terč (bílé halo + registrační tah, kruh a/nebo kříž); vždy na samostatnou vrstvu „Grommet Marks".
- **Předvolby** — uložit / uložit jako / smazat; automatická paměť posledního běhu (`[Last Settings]`); indikátor neuložených změn.
- **Robustnost** — chybějící vrstva „Grommet Marks" se vytvoří; zamčená vrstva se dočasně odemkne a zase zamkne.
- **Živá validace** — neplatná číselná pole zčervenají a zablokují tlačítko Generovat.
- **Lokalizace** — čeština / angličtina podle jazyka Illustratoru.

## Instalace

1. Stáhni hotový `illustrator-grommet-marks.jsx` z [GitHub Releases](https://github.com/Osva1d/extendscript-automation/releases), nebo si jej postav ze zdroje (`npm run build` → `dist/`).
2. Spusť přes `Soubor ▸ Skripty ▸ Jiný skript…`, nebo jej vlož do složky skriptů Illustratoru pro trvalé umístění:
   - **macOS:** `/Applications/Adobe Illustrator [verze]/Presets/[jazyk]/Scripts/`
3. Při vložení do Presets restartuj Illustrator.

## Použití

1. Otevři dokument v Illustratoru.
2. Spusť skript (`Soubor ▸ Skripty ▸ …`).
3. Nastav parametry a klikni **Generovat**.

---

## Vývoj

### Struktura projektu

Zdrojový kód je v `src/`, rozdělený do modulů s namespace `GM.*`:

```
src/
├── constants.js         GM.CONSTANTS — verze, sentinel hodnoty, unit faktory
├── locale.js            GM.L — EN/CS lokalizace, format() helper
├── lib/
│   ├── utils.js         GM.Utils — log, error, deepCopy, presetEquals
│   ├── storage.js       GM.Storage — čtení/zápis JSON + migrace
│   └── validation.js    GM.Validation — rules-based validace vstupů
├── config.js            GM.Config — getDefaults(), PRESET_KEY_DEFAULT
├── core.js              GM.Core — geometrie (calcPositions), bez DOM
├── illustrator.js       GM.Illustrator — DOM adapter (placeMark, swatch/layer)
├── ui.js                GM.UI — ScriptUI dialog
└── main.js              GM.Main — vstupní bod, procesní smyčka
```

Sdílené jádro `json2.js` (JSON polyfill) a `ui_state.js` (`GM.UIState`) žijí v
`../shared/lib/` v kořeni repozitáře — build vkládá `json2.js` jako první a
`ui_state.js` přes `buildUIState(GM)`. Viz [../docs/decisions.md](../docs/decisions.md).

Podrobnosti (datové struktury, data flow, migrační řetěz) viz [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Build a testy

```bash
npm run build     # spojí moduly → dist/illustrator-grommet-marks.jsx
npm test          # spustí testovací suity (Node.js)
npm run verify    # build + test
```

Testy (`tests/`) pokrývají čisté moduly v Node.js: core math, storage migrace, ui_state, validace. UI a DOM se ověřují manuálně — viz [docs/MANUAL_TEST.md](docs/MANUAL_TEST.md).

Build čte verzi z `package.json` a ověřuje shodu s `src/constants.js` (selže při rozporu).

### ES3 Compliance

Veškerý kód je kompatibilní s ExtendScript ES3:
- Pouze `var` (ne `const`, `let`)
- Pouze `function` (ne arrow functions `=>`)
- Žádné template literals ani ES5+ array metody (`.forEach`, `.map`, `.filter`)
---

## Changelog

Viz [CHANGELOG.md](CHANGELOG.md).
