# Grommet Marks (Značky pro oka)

Skript pro Adobe Illustrator, který automaticky vytváří značky pro oka (kroužky nebo čtverce) po obvodu plátna (artboardu). Ideální pro přípravu bannerů do výroby.

## Funkce

- **Automatické rozmístění** — pozice značek podle pevného počtu nebo preferovaného rozestupu, samostatně pro každou hranu (Horní, Dolní, Levá, Pravá) se zrcadlením protějších hran.
- **Rozmístění na tvar** — volba „Vybraná cesta" umístí značky na uzavřenou nebo otevřenou vektorovou cestu (kruh, štít, zaoblený obdélník…); krajní body a rohy jsou vždy kotvy. U uzavřené cesty zadáš **odsazení od kraje**: značky leží o tuto vzdálenost od řezové linky dovnitř tvaru, linku ok spočítá Illustrator (Posunout cestu), takže si cestu nemusíš posouvat ručně. **Zaoblený roh** (živé rohy, oblouk z PDF) dostane jednu značku uprostřed oblouku (oblouk nakreslený jako mnoho krátkých úseček, typicky PDF z CADu, se jako roh nepozná: značky zůstanou ve správné vzdálenosti od řezu, jen nemusí padnout doprostřed oblouku), tvar bez rohů začíná nahoře. Volitelně jen **vybraná část obvodu** (Přímý výběr). Pravidla do detailu: [návrh](../docs/specs/2026-10-11-grommet-marks-path-mode-design.md).
- **Rohové zóny** — zhustí N značek u každého rohu s vlastní roztečí; střed hrany/cesty pak jede standardním rozestupem.
- **Globální odsazení X/Y** — měřeno ke středu značky, zarovnané v rozích.
- **Jednotný vzhled značky** — registrační Esko-styl terč (bílé halo + registrační tah, kruh a/nebo kříž); vždy na samostatnou vrstvu „Grommet Marks".
- **Předvolby** — uložit / uložit jako / smazat; automatická paměť posledního běhu (`[Last Settings]`); indikátor neuložených změn.
- **Robustnost** — chybějící vrstva „Grommet Marks" se vytvoří; zamčená vrstva se dočasně odemkne a zase zamkne; skrytá se zviditelní a skript to oznámí.
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

**Tvarový banner** (kruh, štít, zaoblený obdélník): vyber řezovou linku, spusť skript, zvol **Vybraná cesta** a zadej **odsazení od kraje** (vzdálenost středu oka od řezu, dovnitř tvaru) a Počet ok nebo Rozestup. Šedý řádek pod Umístěním říká, co skript z cesty poznal (rohy, zaoblené rohy, tvar bez rohů). Kdo chce značky jen na části obvodu, označí ji Přímým výběrem (A) — kotvy na začátku i na konci úseků — a zaškrtne **Jen vybraná část obvodu**. Když je odsazení na tvar příliš velké, skript nic nevytvoří a řekne to. Odsazení 0 = značky leží přímo na cestě; předvolby uložené před verzí 1.3 mají odsazení 0, takže kdo si cestu posouvá ručně, nic nemění.

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

Podrobnosti (datové struktury, data flow, migrační řetěz) viz [docs/architecture.md](docs/architecture.md).

### Build a testy

```bash
npm run build     # spojí moduly → dist/illustrator-grommet-marks.jsx
npm test          # spustí testovací suity (Node.js)
npm run verify    # build + test
```

Testy (`tests/`) běží v Node.js bez Illustratoru: core math a obvod, storage migrace, ui_state, validace, utils, dialog přes mock ScriptUI, průběh běhu (`GM.Main`) proti falešnému adaptéru a DOM adaptér proti falešnému DOM. DOM se ověřuje ručně — viz [docs/manual-test.md](docs/manual-test.md).

Build čte verzi z `package.json` a ověřuje shodu s `src/constants.js` (selže při rozporu).

### Konvence

Pravidla celého repa (ES3, namespace, kódování, živé kolekce DOM) jsou
v [../docs/conventions.md](../docs/conventions.md). ES3 hlídá `npm run lint`
v kořeni repa.

---

## Changelog

Viz [CHANGELOG.md](CHANGELOG.md).
