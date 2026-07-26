# <Název Nástroje>

<Jedna až dvě věty: co skript dělá a pro koho.>

## Proč existuje

<Konkrétní bolest, kterou řeší: co se dělalo ručně, jak často, kolik to stálo času.>

## Požadavky

- Adobe Illustrator CC 2020+ (uveď reálně testované verze)
- macOS 12.0+ / Windows 10+
- <hardware, pokud je relevantní — plotr, Bridge…>

## Instalace

1. Stáhni hotový `illustrator-<slug>.jsx` z [GitHub Releases](https://github.com/Osva1d/extendscript-automation/releases), nebo si jej postav ze zdroje (`npm run build` → `dist/`).
2. Spusť přes `Soubor ▸ Skripty ▸ Jiný skript…`, nebo jej vlož do složky skriptů Illustratoru pro trvalé umístění:
   - **macOS:** `/Applications/Adobe Illustrator [verze]/Presets/[jazyk]/Scripts/`
3. Při vložení do Presets restartuj Illustrator.

## Funkce

- **<Název funkce>** — <co dělá z pohledu uživatele>

## Použití

1. Otevři dokument v Illustratoru.
2. Spusť skript (`Soubor ▸ Skripty ▸ …`).
3. Nastav parametry a klikni **Generovat**.

## Řešení problémů

- **<symptom v uvozovkách>** — <příčina a náprava>

## Známá omezení

- <co skript neumí a proč>

## Vývoj

```
src/
├── config.js     NS.Config — getDefaults(), uživatelská nastavení
├── core.js       NS.Core — čistá matematika, žádný DOM (testovatelné)
├── ui.js         NS.UI — ScriptUI dialog
└── main.js       Entry point
```

- Build: `npm run build` (= `bash tools/build.sh`) → `dist/illustrator-<slug>.jsx` (UTF-8 BOM + `#target illustrator`).
- Testy: `npm test` (plain Node, `tests/test_*.js`); `npm run verify` = build + test.
- Verze je v `package.json`; build ji ověřuje proti `src/config.js` (parity guard).
- Sdílené jádro (`json2.js`, `ui_state.js`) žije v `../shared/lib/` — viz [../docs/decisions.md](../docs/decisions.md).

## Changelog

Viz [CHANGELOG.md](CHANGELOG.md).
