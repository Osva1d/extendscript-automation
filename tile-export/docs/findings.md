# Tile Export — nálezy

Vady a návrhy z ručního testu (2026-09-15 až 18), přetestu a běhů harnessu
(do 2026-09-26). Číslování je stálé: na nález se odkazuj číslem, i když je
opravený. Plné znění uzavřených nálezů, s příčinou a měřením, je v historii
gitu — soubor `docs/testing/2026-09-15-tile-export-test-findings.md`.

Postup testu: [ruční testy](manual-test.md).

---

## Otevřené

### N24 — Zünd: kontura, která do plátu nezasahuje, nechá rám jako řez

**Patří do etapy tvarového ořezu.** `tile-export/src/cut.js`, `renderTileContour`.

Na plátu, kam kontura nezasahuje, Pathfinder nemá co odečíst a zakrývající rám
zůstane. Krok 5 pak obarví jako řez **každou cestu v dokumentu**: obdélník plátu
(díru rámu), vnější rám a kopii kontury mimo stránku. Funkce vrátí 3 místo 0,
souhrn plát bez řezu neohlásí a `_cut` PDF nese řez, který tam nepatří
(naměřeno 2026-09-26).

**Dnes obejito:** Zünd režim řeže vždy obdélník plátu, kontura se nepoužívá
a dialog cesty v barvě řezu ohlásí varováním. **Oprava:** předem vyřadit kopie,
které plát neprotínají; po Pathfinderu brát jen výsledné kusy, ne všechny cesty
dokumentu; sondou ověřit i konturu, která plát obkružuje (ohraničení se protíná,
tvar ne). Související N22 je opravený, ale do té doby se nepoužívá.

### N23 — rozlišení rastru pod 72 DPI selže až při exportu

`tile-export/src/ui.js` (`collect`, `rasterDPI`), `src/lib/validation.js`.

Illustrator přijme rozlišení rastru od **72 DPI** (naměřeno: 71 selže, 72
projde). Dialog pustí i menší číslo a export pak na každém plátu vrátí surové
`Specified value less than minimum allowed value`. **Oprava:** validační chyba
v rastrovém režimu pod 72, s hláškou, co je minimum.

### N20 — neexistující PDF preset spadne až při uložení

`tile-export/src/main.js` (`try { pdfOpts.pDFPreset = … } catch`), `src/ui.js`
(náhradní položka `[High Quality Print]`).

Přiřazení neznámého názvu nevyhodí, chyba přijde až v `saveAs` jako `FNOC`, pro
každý plát zvlášť (naměřeno). V běžném provozu se to nestane — dialog nabízí jen
presety, které Illustrator vrátí. Cesty, kudy to přijde: náhradní anglický název
na české instalaci (`[High Quality Print]` tu neexistuje, je `[Kvalitní tisk]`)
a ručně upravený `settings.json`. **Oprava**, až se bude sahat do `main.js`:
ověřit název proti `app.PDFPresetsList` a neznámý nepoužít, s varováním.

### N5 — po načtení předvolby jsou desetiny s tečkou (dluh)

`tile-export/src/ui.js`, `apply()` — `String(číslo)` zapíše `0.3`.

Hodnota je správně a nástroj čte čárku i tečku, jde jen o vzhled. **Odloženo
jako dluh** (uživatel, 2026-09-18): udělat, až se bude do `apply()` sahat
z jiného důvodu. Oprava: `String(v).replace(".", TE.L.DECIMAL)` v číselných
polích.

### P1 — linka v prohlížeči jen dole a vpravo (ověřit)

Hlášeno u linky 0,3 pt, jejíž vnější hrana ležela přesně na hraně stránky. Data
PDF byla symetrická; šlo o vykreslení. **N13 to nejspíš odstranilo** — linka
teď leží středem na hraně s dvojnásobným tahem a Poppler ji vykreslí 0,96 pt na
všech čtyřech hranách. Uzavře ruční test v prohlížeči a tisku.

---

## Uzavřené

| # | co bylo špatně | commit |
|---|---|---|
| N1 | „Stejné jako dokument" u Large Canvasu mířilo na vnitřní souřadnice a končilo chybou | `4be5b7f` |
| N2 | neplatná šířka plátu hlásila cizí chybu o pozicích švů | `a52aab8` |
| N3 | název hrany v české hlášce anglicky („Přídavek left") | `a52aab8` |
| N4 | souhrnné hlášky česky správně jen od pěti; opakovaný běh neříkal „nahrazeno" | `a8ae9d1` |
| N6 | hláška u Large Canvasu radila cestu, která nevede ven | `4be5b7f` |
| N7 | export 1:1 padal, když byla celá grafika větší než ~5,77 m (strop nastavovače `.width`) | `4be5b7f` |
| N8 | předvolba nedávala najevo změnu, nešla vrátit; uložená předvolba zmizela se Stornem | `0919ded` |
| N9 | tlačítko „Zrušit" místo „Storno" | `05a7366` |
| N10 | linka u Large Canvasu desetkrát tlustší (měřítko z aktivního dokumentu) | `4be5b7f` |
| N11 | Zünd značky N× menší u dokumentu 1:N exportovaného 1:1 | `ca7c673` |
| N12 | nápovědy k lince tvrdily „čistý formát" a neříkaly, že jde o tloušťku v tisku | `4b5e764` |
| N13 | linka vystředěná na hraně, tah ×2, výchozí 1 pt (změna zadání od uživatele) | `bb777c2` |
| N14 | dialog otevíral „Půl na každou stranu" a „Šířku" jinak — engine počítá řetězený ternár zleva | `830ef43` |
| N15 | texty, které přežily změnu návrhu („rozpuštění zbytku", prázdný PDF preset, nápověda Jen pláty) | `4b5e764` |
| N16 | dialog neukazoval velikost stránek PDF — přidán řádek „Stránky PDF" | `619ffbc` |
| N17 | chyba velikosti výstupu šedila i Jen pláty | `66a6f40` |
| N18 | Výsledek přesunut do pravého sloupce, dialog o 130 px nižší | `ae7d81d` |
| N19 | v rastrovém exportu byla linka schovaná pod rastrem | `dd14cc7` |
| N21 | Zünd kontura se ořezávala podle zvětšeného artboardu, ne podle plátu | `ca7c673` |
| N22 | Zünd kontura se nezvětšovala s měřítkem výstupu (kód se zatím nepoužívá, N24) | `666ab22` |
| N25 | registrace se brala jako `swatches[1]` bez kontroly typu — bez registrace na indexu 1 je tam Bílá a značky by kamera Zündu neviděla; teď se hledá podle typu (z kontroly po prompt-auditu 2026-10-03) | `16e7317` |

Opraveno přímo během testu, bez čísla: desetinná čárka se v dialogu zahazovala
(`bf78166`), souhrn ukazoval celé milimetry (`19d7a11`), vypnutá linka
zakládala prázdnou vrstvu (`76422ad`).
