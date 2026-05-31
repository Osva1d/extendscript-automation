# Batch Relink & Export

Automatizace tiskové přípravy v Adobe Illustrator — hromadné relinkování PDF souborů do šablony a export.

## Stav

- **Typ:** Modulární ExtendScript (ES3)
- **Namespace:** `BRE`
- **Build:** `npm run build` (`tools/build.sh`)
- **Min. verze AI:** CC 2018 (v22) — vyžadováno pro `PlacedItem.pageNumber`

## Workflow

1. Vytvořte AI šablonu s propojenými PDF (stránky z vícestránkového PDF)
2. Oříznout maskou pokud je třeba, přidat řezací značky
3. Uložit šablonu
4. Rozdělit zdrojové PDF podle počtu pozic v šabloně (např. v Adobe Acrobat)
5. Spustit skript, vyplnit dialog, potvrdit náhled, hotovo

## Funkce

- Hromadné relinkování všech PlacedItems v šabloně
- Ověření relinku po každém souboru (verifikace cesty)
- Automatické odemknutí/obnovení zamčených vrstev a objektů
- **Pre-flight sken** — před zpracováním proskenuje všechny zdrojové PDF a porovná počet stran s počtem pozic; soubor s více stranami než pozic se odmítne (tvrdý blok proti tiché ztrátě stran), ostatní odchylky se vypíší v náhledu
- Odstranění přebytečných pozic u neúplného posledního archu
- Detekce počtu stran PDF (binary read)
- Pojmenování výstupů ze šablony s {n} číslováním
- Dry-run náhled před zpracováním
- Skip existing pro crash recovery
- Lokalizace cs/en (auto-detekce)

## Vývoj

```
src/
├── locale.js      # BRE.L — lokalizace cs/en
├── config.js      # BRE.Config — verze, konstanty
├── core.js        # BRE.Core — session mgmt, relink, verifikace
├── ui.js          # BRE.UI — dialog, progress, souhrn
└── main.jsx       # Entry point
```

Build: `npm run build` → `dist/illustrator-batch-relink-export.jsx`

## Changelog

### v3.0.0 (2026-05)
- **BREAKING:** Modulární redesign (5 modulů, namespace BRE, build systém)
- **BREAKING:** Výstupní pojmenování změněno na pattern `{n}_{template}`
- **FEATURE:** Session management — automatické odemknutí/obnovení zamčených vrstev a objektů
- **FEATURE:** Relink verifikace po každém souboru
- **FEATURE:** Pre-flight sken všech zdrojů + tvrdý blok souborů s více stranami než pozic
- **FEATURE:** Odstranění přebytečných pozic u neúplného archu
- **FEATURE:** Dry-run náhled před zpracováním
- **FEATURE:** Lokalizace cs/en
- **FEATURE:** Detekce počtu stran PDF
- **REFACTOR:** Smazán impose skript (slepý vývoj)

### v2.0.0 (2026-03)
- Původní monolit — hromadné relinkování s exportem
