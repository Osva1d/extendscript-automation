# Batch Text Edit

Upraví texty a {proměnné} ve výběru, na artboardu nebo v celém dokumentu
řetězem kroků.

## Proč existuje

## Požadavky

- Adobe Illustrator CC 2020+
- macOS 12.0+ / Windows 10+

## Instalace

1. Stáhni hotový `illustrator-batch-text-edit.jsx` z [GitHub Releases](https://github.com/Osva1d/extendscript-automation/releases), nebo si jej postav ze zdroje (`npm run build` → `dist/`).
2. Spusť přes `Soubor ▸ Skripty ▸ Jiný skript…`, nebo jej vlož do složky skriptů Illustratoru pro trvalé umístění:
   - **macOS:** `/Applications/Adobe Illustrator [verze]/Presets/[jazyk]/Scripts/`
3. Při vložení do Presets restartuj Illustrator.

## Funkce

## Použití

## Řešení problémů

## Známá omezení

## Vývoj

- Build: `npm run build` (= `bash tools/build.sh`) → `dist/illustrator-batch-text-edit.jsx` (UTF-8 BOM + `#target illustrator`).
- Testy: `npm test` (plain Node, `tests/test_*.js`); `npm run verify` = build + test.
- Verze je v `package.json`; build ji ověřuje proti `src/config.js` (parity guard).
- Sdílené jádro (`json2.js`, `ui_state.js`, `numbers.js`, `field_paint.js`, `summary.js`) žije v `../shared/lib/` — viz [../docs/decisions.md](../docs/decisions.md).

## Changelog

Viz [CHANGELOG.md](CHANGELOG.md).
