# Grommet Marks (Značky pro oka)

Skript pro Adobe Illustrator, který automaticky vytváří značky pro oka (kroužky nebo čtverce) po obvodu plátna (artboardu). Ideální pro přípravu bannerů do výroby.

## Funkce

- **Automatické rozmístění** — pozice značek podle pevného počtu nebo preferovaného rozestupu, samostatně pro každou hranu (Horní, Dolní, Levá, Pravá) se zrcadlením protějších hran.
- **Globální odsazení X/Y** — měřeno ke středu značky, zarovnané v rozích.
- **Vzhled** — výplň a/nebo obrys s výběrem vzorníku, přetisk (overprint), jednotky mm/cm/in.
- **Předvolby** — uložit / uložit jako / smazat; automatická paměť posledního běhu (`[Last Settings]`); indikátor neuložených změn.
- **Robustnost** — chybějící vzorník degraduje na `[Registration]` (nikdy tichý pád ani překvapivý spot); chybějící vrstva se vytvoří; zamčená cílová vrstva se dočasně odemkne a zase zamkne.
- **Živá validace** — neplatná číselná pole zčervenají a zablokují tlačítko Generovat.
- **Lokalizace** — čeština / angličtina podle jazyka Illustratoru.

## Instalace

1. Vezmi build `dist/illustrator-grommet-marks.jsx`.
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
├── polyfills/json2.js   JSON polyfill (Douglas Crockford, ES3)
├── constants.js         GM.CONSTANTS — verze, sentinel hodnoty, unit faktory
├── locale.js            GM.L — EN/CS lokalizace, format() helper
├── lib/
│   ├── utils.js         GM.Utils — log, error, deepCopy, presetEquals
│   ├── storage.js       GM.Storage — čtení/zápis JSON + migrace
│   ├── validation.js    GM.Validation — rules-based validace vstupů
│   └── ui_state.js      GM.UIState — pure preset state-transitions
├── config.js            GM.Config — getDefaults(), PRESET_KEY_DEFAULT
├── core.js              GM.Core — geometrie (calcPositions), bez DOM
├── illustrator.js       GM.Illustrator — DOM adapter (placeMark, swatch/layer)
├── ui.js                GM.UI — ScriptUI dialog
└── main.js              GM.Main — vstupní bod, procesní smyčka
```

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

### v4.2.1 (2026-06)
- **FIX:** Selhání zápisu nastavení na disk se vždy nahlásí uživateli (dříve mohlo tiše „oživit" smazanou předvolbu po restartu).
- **FIX:** Neumístěné značky se hlásí souhrnným varováním (dříve tichý nedostatek značek na výstupu).
- **FIX:** Fallback na [Registration] ověřuje, že vzorník je skutečně registrační (uživatelem smazaný [Registration] dříve tiše obarvil značky náhodným vzorníkem).
- **FIX:** Desetinný počet značek („10.5") se odmítne místo tichého oříznutí na 10.
- **FIX:** Prázdný název předvolby hlásí „Zadejte název" místo zavádějícího „rezervovaný název"; potvrzení přepisu zobrazuje název předvolby.
- **CLEANUP:** Odstraněno 10 mrtvých lokalizačních klíčů; test synchronizace rezervovaných preset klíčů.

### v4.2.0 (2026-06)
- **UI:** Tvar značky zamčen na kruh — volba kruh/čtverec odstraněna.
- **UI:** Tlačítko ↺ Revert vedle dropdownu předvoleb (návrat k uloženým hodnotám); nahrazuje Reset.
- **UI:** Dvouřádkový panel předvoleb (Uložit / Uložit jako / Smazat pod dropdownem) — layout podle Zünd & Summa Marks.
- **UI:** Zarovnání dropdownů vzhledu přes pevný sloupec popisků.
- **FIX:** Živá validace obnoví výchozí barvu textu (žádné černé pole na tmavém pozadí).

### v4.1.0 (2026-05)
- **UI:** Kanonický jednosloupcový layout dialogu (redesign cyklu 2).
- **UI:** Mirror checkbox přesunut dovnitř edge panelu (TD-001); obnova předchozího stavu při vypnutí (TD-003).
- **UI:** Tlačítko Uložit správně inicializováno (zašedlé bez změn); živá validace blokuje Generovat při neplatném vstupu (včetně polí hran).
- **ROBUSTNOST:** Globální error boundary; pin souřadného systému (Y-up); session zámků cílové vrstvy.
- **ROBUSTNOST:** Chybějící vzorník → fallback na `[Registration]` s upozorněním; chybějící vrstva se vytvoří; chybějící hodnota v dropdownu se zachová s označením „(chybí)".
- **BUILD:** Guard proti rozjití verze mezi `package.json` a `constants.js`.

### v4.0.0 (2026-05)
- **REFACTOR:** Modulární `lib/` (utils, storage, validation, ui_state) — sjednocení architektury se Zünd Summa Marks.
- **FEATURE:** Wrapper formát persistence (`{activePreset, presets}`) s automatickým `[Last Settings]`; Save As, Reset, indikátor změn, živá validace.
- **MIGRATION:** Flat → wrapper, `__default__` → `[Default]`, forward-fill nových klíčů.
- **TEST:** Testovací suity (core math, storage migrace) + npm tooling.

### v3.1.0 (2026-02-22)
- **REFACTOR:** Sentinel systém — interní klíče odděleny od lokalizovaných display stringů.
- **REFACTOR:** Unit systém — interní klíče `mm`/`cm`/`in`.
- **FEATURE:** Migrace ze starých formátů (lokalizované stringy → interní klíče).
- **FIX:** `process()` — try-catch wrapper pro neočekávané DOM chyby.

### v3.0.0 (2026-02-09)
- **FIX:** Systémové vzorníky fungují ve všech lokalizacích Illustratoru.
- **FEATURE:** Globální odsazení X/Y; měření ke středu značky; tooltipy; modulární build.
- **MIGRATION:** Automatická migrace presetů v2→v3.

### v2.1.0
- JSON polyfill (json2.js), namespace pattern, JSDoc.

### v2.0.0
- Nezávislé nastavení bottom/right hran, podpora všech artboardů, preferovaný rozestup.
