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

> **Tip:** Neúplný arch skript vyčistí sám (viz [Neúplný arch](#neúplný-arch)). Kdo chce plné archy, doplní zdrojové PDF prázdnými stranami na násobek N.

## Funkce

- Hromadné relinkování pozic šablony + export do PDF (dle zvoleného presetu). Pozice jsou viditelné umístěné stránky PDF, ze kterého šablona vznikla (soubor, na který odkazuje většina umístěných objektů). Logo nebo značky umístěné jako jiný soubor zůstanou beze změny; skryté pozice se nepočítají.
- **Ověření relinku** po každém souboru: každá relinkovaná pozice ukazuje na správný soubor a strana zdroje má stejný rozměr jako strana šablony (po ořezu PDF). Zdroj jiného formátu nebo PDF se spadávkou v ploše stránky bez TrimBoxu se nevyexportuje — Illustrator by stranu tiše přeškáloval.
- **Session management** — automatické odemčení a obnovení zamčených vrstev i objektů.
- **Pre-flight sken** — před zpracováním zjistí počet stran každého zdroje a porovná ho s počtem pozic; soubor s **více stranami než pozic** se tvrdě **zablokuje** jako ochrana proti tiché ztrátě stran. Počet se čte ze stromu stran PDF stejně jako v prohlížeči, i u PDF 1.5+ s komprimovanými tabulkami. Když ho přečíst nejde (poškozené nebo šifrované PDF), zdroj se zpracuje s upozorněním v souhrnu.
- **Neúplný arch** — pozice, pro které zdroj nemá stranu, skript z archu odebere (viz [Neúplný arch](#neúplný-arch)).
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

## Neúplný arch

Když má zdrojové PDF méně stran než šablona pozic, ukázaly by pozice pro chybějící strany znovu stranu 1 — Illustrator při relinku na neexistující stranu vezme první. Skript proto u takového archu zjistí, kterou stranu která pozice ukazuje, a pozice navíc odebere, u oříznuté pozice i s ořezovou maskou.

Stránku pozice Illustrator skriptu neprozradí (`PlacedItem` nemá žádnou vlastnost se stranou). Skript ji zjistí tak, že pozice na chvíli přelinkuje na dočasné pomocné PDF, v němž má každá strana jinou šířku, a pak je přelinkuje na zdroj.

Automaticky se odebírá jen tehdy, když šablona ukazuje strany 1 až N každou právě jednou. Jinak (například stejná strana na dvou pozicích) skript arch vyexportuje beze změny a v souhrnu napíše, kolik pozic navíc je třeba před tiskem odstranit ručně.

## Vývoj

```
src/
├── locale.js   # BRE.L — lokalizace cs/en
├── config.js   # BRE.Config — verze, UI konstanty, výchozí vzor pojmenování
├── pdf.js      # BRE.Pdf — počet stran PDF, pomocné PDF pro zjištění strany pozice
├── core.js     # BRE.Core — session mgmt, relink, verifikace, sken, pojmenování
├── ui.js       # BRE.UI — dialog, náhled, progress, souhrn
└── main.js    # Entry point — smyčka zpracování
```

- Build: `npm run build` (= `bash tools/build.sh`) → `dist/illustrator-batch-relink-export.jsx` (přidá UTF-8 BOM + `#target illustrator`).
- Verze je v `package.json`; `tools/build.sh` ji ověřuje proti `src/config.js` (parity guard).
- **Diagnostika:** nastav `BRE.Config.debug = true` (v `src/config.js`, příp. přímo v sestaveném `.jsx`) → do výstupní složky se zapíše `_bre-diagnostika.txt` s popisem každé pozice (vrstva, clip-group, propojený soubor) před i po relinku. Pro hledání chyb; ve výchozím stavu vypnuto, bez UI.
---

## Changelog

Viz [CHANGELOG.md](CHANGELOG.md).
