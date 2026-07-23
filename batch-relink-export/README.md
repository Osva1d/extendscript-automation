# Batch Relink & Export

Automatizace tiskové přípravy v Adobe Illustrator — hromadné relinkování PDF souborů do šablony a export do tiskových PDF.

## Stav

- **Typ:** Modulární ExtendScript (ES3)
- **Namespace:** `BRE`
- **Build:** `npm run build` (`tools/build.sh`) → `dist/illustrator-batch-relink-export.jsx`
- **Min. verze AI:** CC 2018 (v22)
- **Verze:** 1.0.0

## Instalace

1. Stáhni hotový `illustrator-batch-relink-export.jsx` z [GitHub Releases](https://github.com/Osva1d/extendscript-automation/releases), nebo si jej postav ze zdroje (`npm run build` → `dist/`).
2. Spusť přes `Soubor ▸ Skripty ▸ Jiný skript…`, nebo jej vlož do složky skriptů Illustratoru pro trvalé umístění:
   - **macOS:** `/Applications/Adobe Illustrator [verze]/Presets/[jazyk]/Scripts/`
3. Při vložení do Presets restartuj Illustrator.

## Workflow

1. Vytvoř AI šablonu s nalinkovanými PDF (pozice na archu = stránky z vícestránkového PDF).
2. Podle potřeby ořízni clipping maskou, přidej řezací značky a další prvky archu.
3. Ulož šablonu.
4. Rozděl zdrojové PDF na soubory po N stranách (N = počet pozic v šabloně), typicky v Acrobatu.
5. Spusť skript, vyplň dialog, potvrď náhled (u bezchybné dávky se přeskočí), hotovo.

> **Tip:** Doplň zdrojové PDF prázdnými stranami na násobek N, aby byl každý arch plný — pak nevzniknou žádné přebytečné pozice (viz [Omezení](#omezení--neúplný-poslední-arch)).

## Funkce

- Hromadné relinkování všech nalinkovaných PDF v šabloně + export do PDF (dle zvoleného presetu).
- **Ověření relinku** po každém souboru (kontrola, že každá relinkovaná pozice ukazuje na správný soubor).
- **Session management** — automatické odemčení a obnovení zamčených vrstev i objektů.
- **Pre-flight sken** — před zpracováním proskenuje všechny zdroje a porovná počet stran s počtem pozic; soubor s **více stranami než pozic** nebo s **nejednoznačným počtem stran** (křížová kontrola `/Count` × počet objektů stran) se tvrdě **zablokuje** jako ochrana proti tiché ztrátě stran.
- **Neúplný poslední arch** — skript spočítá přebytečné pozice a v souhrnu nahlásí „N pozic navíc — odeber ručně" (automatické smazání viz [Omezení](#omezení--neúplný-poslední-arch)).
- **Předvídatelné číslování** — zdroje řazeny přirozeně (`part_2` před `part_10`).
- **Pojmenování výstupů** přes vzor s placeholdery (viz níže).
- **Náhled** před zpracováním (přeskočí se, když je dávka bez anomálií).
- **Skip existing** — přeskočí už hotové výstupy (crash recovery).
- Ignoruje macOS systémové soubory (`._*`, tečkové) ve zdrojové složce.
- Lokalizace **cs/en** (auto-detekce dle Illustratoru).

## Vzor pojmenování

Pole „Vzor pojmenování" v dialogu podporuje placeholdery (musí obsahovat aspoň `{n}`):

| Placeholder | Význam |
|---|---|
| `{n}` | pořadové číslo archu (zero-padded, dle přirozeného řazení zdrojů) |
| `{template}` | název šablony bez přípony |
| `{source}` | název zdrojového PDF bez přípony |

Výchozí vzor: `{n}_{template}` → např. `01_vizitky-arch.pdf`. Číslo zakázky si připíšeš před vzor.

## Omezení — neúplný poslední arch

Skript pozná, *kolik* pozic je navíc, ale neumí spolehlivě určit *které*, pokud šablona používá **ručně umístěné (a oříznuté) PDF stránky** — Illustrator u nich přes skript nevrací `PlacedItem.pageNumber` (je `undefined`). Automatické mazání proto funguje jen tam, kde je `pageNumber` čitelný; jinak skript arch vyexportuje a označí „N pozic navíc — odeber ručně".

Dvě praktické cesty:
- **Doplnit zdroj** prázdnými stranami na násobek počtu pozic → žádný arch není neúplný (doporučeno).
- **Dokončit ručně** poslední arch (smazat pár pozic) — týká se jen posledního archu.

## Vývoj

```
src/
├── locale.js   # BRE.L — lokalizace cs/en
├── config.js   # BRE.Config — verze, UI konstanty, výchozí vzor pojmenování
├── core.js     # BRE.Core — session mgmt, relink, verifikace, sken, pojmenování
├── ui.js       # BRE.UI — dialog, náhled, progress, souhrn
└── main.jsx    # Entry point — smyčka zpracování
```

- Build: `npm run build` (= `bash tools/build.sh`) → `dist/illustrator-batch-relink-export.jsx` (přidá UTF-8 BOM + `#target illustrator`).
- Verze je v `package.json`; `tools/build.sh` ji ověřuje proti `src/config.js` (parity guard).
- **Diagnostika:** nastav `BRE.Config.debug = true` (v `src/config.js`, příp. přímo v sestaveném `.jsx`) → do výstupní složky se zapíše `_bre-diagnostika.txt` s popisem každé pozice (pageNumber, vrstva, clip-group) před i po relinku. Pro hledání chyb; ve výchozím stavu vypnuto, bez UI.
---

## Changelog

Viz [CHANGELOG.md](CHANGELOG.md).
