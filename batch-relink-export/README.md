# Batch Relink & Export / Imposice PDF

Automatizace tiskové přípravy v Adobe Illustrator — hromadné relinkování PDF a N-up imposice.

## Proč existuje

Při výrobě vstupenek, vizitek nebo jiných opakujících se tiskovin je potřeba hromadně zpracovat desítky až stovky PDF souborů — buď je relinkovat do šablon s clipping maskami, nebo z vícestránkového PDF vytvořit tiskové archy (imposice). Ruční práce v Illustratoru by trvala hodiny. Tyto dva skripty celý proces automatizují.

## Stav

- **Typ:** Monolity (single-file ExtendScript, ES3)
- **Namespace:** žádný (IIFE wrapper)
- **src/dist:** N/A — single file je zároveň zdrojem i distribucí
- **Min. verze AI:** CC 2018 (v22) — vyžadováno pro `PlacedItem.pageNumber`

## Skripty

### illustrator-batch-relink-export.jsx (v2.0.0)

Hromadné relinkování PDF souborů do AI šablony a export.

1. Otevře AI šablonu s propojenými PDF
2. Pro každý PDF ve zdrojové složce přelinkuje všechny PlacedItems
3. Exportuje výsledek jako PDF (dle zvoleného presetu)
4. Zavře dokument bez uložení

### illustrator-impose-pdf.jsx (v1.0.0)

Automatická N-up imposice z vícestránkového PDF.

1. Načte geometrii slotů z AI šablony (každý PlacedItem = 1 pozice na archu)
2. Stránkuje zdrojové PDF a umísťuje správnou stránku do každého slotu
3. Exportuje jednotlivé archy jako PDF

## Workflow

Typický postup pro tisk vstupenek, vizitek apod.:

1. **Imposice:** `illustrator-impose-pdf.jsx` — vícestránkové PDF → tiskové archy
2. **Batch relink:** `illustrator-batch-relink-export.jsx` — pro šablony s clipping maskami, kde imposice skript nestačí (vyžaduje předem rozdělené PDF, např. z Adobe Acrobat)

## Technické poznámky

- `userInteractionLevel` se vždy resetuje na `DISPLAYALERTS` — v normálním i chybovém průběhu (try/finally)
- Nested try-catch kolem každé kritické operace (open, relink, export, close)
- ES3 compliant, žádné violations
- UI v češtině

## Changelog

### v2.0.0 / v1.0.0
- Aktuální verze
