# Studie proveditelnosti — maskování plátu pro Zünd

Podklad pro etapu maska/Zünd v `tile-export`. Datum: 2026-09-25.
Návrh navazuje na [specifikaci Zünd režimu](../specs/2026-09-13-tile-export-zund-design.md)
§10, kde je popsaný postup z praxe. Tady je ověřené, **jestli a jak** ho jde
udělat skriptem.

Nic z toho zatím není v nástroji. Všechno naměřené běželo v Illustratoru 30.8.1
ve vlastních dočasných dokumentech. Aritmetika běžela jako virtuální test
nad skutečným kódem nástroje, `tile-export/tests/feasibility/mask_arithmetic.js`.

---

## 1. Zadání

V Zünd režimu se linka plátu **netiskne**, je to řezová cesta. Z ní, nebo
z tvarové kontury plátu, vznikne **odsazená cesta ven o spad** a ta poslouží
jako **ořezová maska tisku**. Motiv tak skončí kousek za řezem. Grafika
souseda se do okolí značek nedostane a kolem značek zůstane prázdné místo.
Z jednoho plátu vzniknou dvě PDF: tiskové a `_cut`.

## 2. Závěr

**Proveditelné, bez zásadní překážky.** Každý krok postupu je změřený a funguje.
Nutné jsou dvě cesty přes `executeMenuCommand`: Pathfinder, který už existuje,
a nově „Vytvořit masku" pro tvar s dírou. Ty jsou mimo Node testy. Všechna
aritmetika jde pod testy.

Cestou se ukázaly **dvě chyby v dnešním skrytém Zünd kódu**. Obě by etapu
rozbily, takže je oprava musí zahrnout (§5).

## 3. Návrh — co se stane s jedním plátem

V dočasném dokumentu plátu (ten existuje už dnes), ve třech vrstvách:

| vrstva | obsah | tiskové PDF | `_cut` PDF |
|---|---|---|---|
| `TE_print` | grafika v ořezové masce | ✓ | — |
| `TE_marks` | registrační značky | ✓ | ✓ |
| `TE_cut` | řezová cesta v přímé barvě | — | ✓ |

Značky potřebují oba výstupy: tisk je nese na materiál a řezací data podle nich
stroj ustaví řez. Proto mají vlastní vrstvu. (Moje první sonda je dala do tiskové
vrstvy a v `_cut` chyběly.)

**Postup:**

1. **Vložit grafiku** v měřítku výstupu, jako dnes. V rastrovém režimu ji hned
   rastrovat (stejně jako po opravě N19).
2. **Řezová cesta plátu**:
   - rovný plát: obdélník plátu (`expanded`, tedy včetně přelepu a přídavků),
   - tvarový ořez: kontura minus všechno mimo plát (dnešní `renderTileContour`,
     Pathfinder Minus Front).
3. **Maska = řezová cesta odsazená ven o spad** (výchozí 5 mm):
   - rovný plát: **aritmetika**, obdélník větší o spad na každé straně. Přesná,
     s ostrými rohy, bez Illustratoru, celá pod testy.
   - tvar: `applyEffect` „Adobe Offset Path", `jntp 0` (zaoblené rohy), pak
     `expandStyle`. Na kopii **s výplní a bez tahu**, jinak výsledkem není
     cesta, ale skupina dvou cest (naměřeno).
4. **Oříznout grafiku maskou**:
   - obyčejná cesta: skupina, maska navrch, `group.clipped = true`,
   - složená cesta (tvar s dírou): `executeMenuCommand("makeMask")` nad
     výběrem. DOM tu **nestačí**: „The top item in the group must be a path
     item" (naměřeno, i s příznakem `clipping` na podcestě).
5. **Artboard = ohraničení masky + odstup + značka** na každé straně. Značky se
   měří **od masky**, tedy od konce motivu, ne od řezu. Tak to popisuje postup
   z praxe (spec §10 krok 4: „5 mm odstup od grafiky plus 5 mm značka"). Je to
   i bezpečnější, protože prázdné místo kolem značky pak nezávisí na spadu.
   Rozměr se bere z masky, ne ze skupiny: maskovaná skupina hlásí rozměr celé
   grafiky (engine facts).
6. **Značky** ze sdílené geometrie `calculateAll`, s měřítkem předaným výslovně
   (§5, N11).
7. **Dvě PDF** s `acrobatLayers = false` nastaveným výslovně:
   - tiskové: `TE_cut` skrytá,
   - `_cut`: `TE_print` skrytá.

**Nový parametr: spad za řezem** (mm, výchozí 5). **Změněná výchozí hodnota:**
odstup značky se měří od motivu, spec §10 uvádí 5 mm místo dnešních 10 mm od
okraje plátu.

**Nová validace:** na vnějších hranách musí PDF nést spad aspoň přídavek + spad
za řezem. Jinak maska sáhne za konec grafiky a bude tam bílá. Na švech to
neplatí, tam grafika pokračuje.

**Tvarový ořez musí být uzavřený.** Odsazení otevřené cesty dá obrys kolem
čáry, ne plochu (naměřeno), takže maska by zakryla všechno kromě proužku.
Otevřenou konturu hlásit chybou.

## 4. Naměřeno

### Sondy v Illustratoru

| # | co | výsledek |
|---|---|---|
| A1 | obdélník 1000 × 500 pt, odsazení 5 mm, `jntp 0` | 1 cesta, 8 bodů, přesně +14,17 pt, zaoblené rohy |
| A2 | totéž, `jntp 2` | 1 cesta, 4 body, ostré rohy |
| A3 | prstenec (složená cesta) | složená cesta: vnějšek +14,17, díra −14,17 (200 → 171,7 pt) |
| A4 | hvězda, 400 bodů | 444 bodů, **56 ms** |
| A5 | otevřená cesta | uzavřený obrys kolem čáry — pro masku nepoužitelné |
| A6 | obdélník 16 000 × 5 000 pt s tahem | **skupina dvou cest** (výplň + tah); bez tahu jedna cesta, správně |
| B1 | maska z odsazeného obdélníku na umístěném PDF | funguje, vykresleno: grafika končí 5 mm za řezem |
| B2 | maska ze složené cesty | DOM odmítne; `makeMask` funguje, díra zůstane prázdná (vykresleno) |
| B3 | rastrování maskované skupiny | rastr přes celý artboard, mimo masku bílý |
| D1 | maska na `RasterItem` | funguje (vykresleno) — rastrový režim: rastrovat grafiku, pak maskovat |
| C | tiskové a `_cut` PDF skrytím vrstvy | s výchozím nastavením jde skrytá vrstva do PDF **jako vypnutá vrstva (OCG) s daty řezu uvnitř**; s `acrobatLayers = false` z PDF zmizí |
| D2 | totéž s presetem PDF/X-4, obě pořadí nastavení | `acrobatLayers = false` platí; vlastnost ale čte `false` i tehdy, když vrstvy v PDF jsou — nastavovat vždy výslovně |

Časová stránka: odsazení je v desítkách milisekund, rozhoduje Pathfinder a
uložení PDF, jako dnes.

### Virtuální test aritmetiky

Skutečné `TE.Utils` a sdílené `calculateAll` v Node, plát 2020 × 1000 mm
(prostřední plát zdi 6 m), spad 5 mm, odstup 5 mm, značka 5 mm. Pět měřítkových
situací, které nástroj podporuje:

| situace | stránka | maska za řezem | značka od masky | artboard | dnešní geometrie značek |
|---|---|---|---|---|---|
| dokument 1:10, výstup jako dokument | 1:10 | 5 mm ✓ | 5 mm ✓ | 2050 mm ✓ | ✓ |
| **dokument 1:10, výstup 1:1** | 1:1 | 5 mm ✓ | 5 mm ✓ | 2050 mm ✓ | **✗ značka 0,5 mm, odstup 0,5 mm** |
| dokument 1:1, výstup 1:1 | 1:1 | ✓ | ✓ | ✓ | ✓ |
| Large Canvas, jako dokument | 1:1 | ✓ | ✓ | ✓ | ✓ |
| Large Canvas + ruční 1:10 | 1:10 | ✓ | ✓ | ✓ | ✓ |

Rozměry jsou ve skutečných milimetrech. Návrh: 15 z 15.

Klíč k měřítku je **jeden poměr stránky**: kolik skutečných milimetrů připadá
na milimetr stránky, `R = faktor Large Canvasu × ruční 1:N / měřítko výstupu`.
Spad, odstup i značka se do dočasného dokumentu převádějí jako `mm2pt(mm) / R`.
Tentýž poměr už počítá řádek „Stránky PDF" (N16).

## 5. Chyby nalezené v dnešním Zünd kódu

**Obě opraveny 2026-09-25** (viz nálezy N11, N21).

**N11 — potvrzeno výpočtem.** `calculateAll` si měřítko bere
z `getEffectiveSF`, tedy z **aktivního** dokumentu. Při exportu je to dočasný
dokument, který o ručním měřítku nic neví. Chyba se projeví přesně u
**nejčastější velké zakázky**: dokument kreslený 1:N exportovaný 1:1. Značky
i odstupy vyjdou N× menší, u 1:10 značka 0,5 mm. Oprava: poměr stránky `R` předat
do `calculateAll` jako volitelný parametr. Sdílené jádro to unese, protože
zund-summa-marks ho nepředá a chová se dál po staru. Totéž platí pro `drawMarks`.

**N21 — kontura se ořezává podle zvětšeného artboardu, ne podle plátu.**
Nalezeno čtením kódu, neměřeno. `exportTile` nejdřív zvětší artboard pro značky
(`export.js:144`) a pak volá `renderTileContour` (`:150`), který si hranici
bere z artboardu. Řezová data by tak sahala o odstup + značku do souseda.
Oprava: předat obdélník plátu (`tf.artboard` před zvětšením). V novém postupu
se artboard mění až v kroku 5, takže pořadí bude správně samo.

## 6. Rizika a co zůstává neověřené

- **Dva příkazy menu** (Pathfinder, Vytvořit masku) závisí na výběru a pořadí
  vrstev. Chyba tam znamená chybu jednoho plátu s hlášením. Pokrýt sondami
  s vykreslením, ne Node testy — jako dnes u Pathfinderu.
- **Skutečná zákaznická kontura** pořád chybí (spec §9). Všechno je měřené na
  syntetických tvarech. Před implementací tvarového ořezu jeden reálný soubor
  s dírami a víc tvary.
- **Stroj.** Jestli Zünd Cut Center přečte `_cut` PDF tak, jak ho uděláme
  (barva, tloušťka, značky), ověří jen první řez. To je obdoba R9.
- **Velikost PDF se maskou nezmenší.** Illustrator obsah neořezává, v tiskovém
  PDF zůstane celá grafika jako dnes. Menší soubor dá jen rastrový režim.
- **Rastr a maska:** rastr zabírá celý artboard, maska ho jen skryje. Přesnost
  hrany masky na rastru je daná jeho rozlišením.

## 7. Otázky na tebe

1. **Barva a tloušťka řezové cesty** v `_cut`. Linka plátu je dnes v `CutContour`
   a tvarová kontura v `cut`. Pro stroj jedna barva, nebo dvě (rovný řez
   a tvar)? Hairline 0,125 pt?
2. **Spad za řezem:** stačí jedna hodnota s výchozími 5 mm, nebo se liší podle
   materiálu?
3. **Orientační bod** na každém plátu, nebo jen na prvním (spec §9)?
4. **Pojmenování výstupů:** `{doc}_{n}.pdf` a `{doc}_{n}_cut.pdf`?

## 8. Rozhodnutí (2026-09-25)

- **Nejdřív rovný ořez, tvarový až potom** (uživatel). Rovný plát pokryje běžnou
  plátovanou zakázku, jeho maska je aritmetika pod testy a nepotřebuje reálnou
  konturu, která zatím chybí. Postup ze §3 se na tvar jen rozšíří (krok 2
  a 3), vrstvy ani výstupy se nemění.
- **Zünd Summa Marks jako knihovna, ne jako druhý běh.** Druhý běh by znamenal
  otevírat každé PDF plátu v Illustratoru, spouštět skript a ukládat dvakrát
  ručně. Geometrie značek je už sdílená (`shared/lib/cut_marks.js`), kreslení
  zůstane v tile-exportu. Místo převzetí `ZSM.Draw.render` (370 řádků svázaných
  s aktivním dokumentem) **křížová kontrola**: stejný obdélník plátu projde
  ZSM i tile-exportem a polohy značek a artboard se porovnají. Režim Summa
  zůstává mimo.

### Odpovědi uživatele k §7 (2026-09-25)

1. **Přímé barvy řezu:** `Cut`, případně `Thru-cut` a `Kiss-cut` (přesný zápis
   `Thru-cut` ověřit). Pro rovný plát průřez; výběr ze seznamu, výchozí `Cut`.
   Dnešní výchozí `cutSpot` je `cut` s malým písmenem — opravit.
2. **Spad za řezem** podle místa na materiálu: běžně 3 nebo 5 mm, u velkých
   plátů až 10 mm. Jedno číselné pole, výchozí 5 mm.
3. **Jména:** řezový soubor se suffixem `_cut`. Vzor pojmenování později rozšířit
   o rozměr plátu a čistého formátu po ořezu.
4. Orientační bod: navrženo na každém plátu (zakládají se jednotlivě); bez
   námitky.

## 9. Stav

- **2026-09-25:** N11 a N21 opravené.
- **2026-09-26: rovný plát hotový** (krok 2). Zünd panel je zpět v dialogu.
  Ověřeno exportem přes produkční kód: zeď 1:10 v 1:1 i jako náhled, rastr,
  Large Canvas. Cestou nalezeno a zapsáno: N22 (kontura se nezvětšovala —
  opraveno), N23 (rozlišení pod 72 DPI), N24 (kontura mimo plát nechá rám jako
  řez). **Tvarový ořez má víc děr, než tahle studie čekala** — kromě masky
  (§3 krok 3–4) i samotné dělení kontury (N24). V této verzi se kontura
  nepoužívá a dialog ji ohlásí.

## 10. Doporučené pořadí

1. Opravit N11 a N21 (malé, s testy). Bez nich nemá smysl dál stavět.
2. Rovný plát: aritmetická maska, tři vrstvy, dva výstupy, značky od masky,
   validace spadu. Všechno kromě uložení jde pod Node testy. Tím je Zünd
   použitelný na běžnou plátovanou zakázku s rovným ořezem.
3. Tvarový ořez: odsazení přes `applyEffect` a maska přes `makeMask`. Předtím
   reálná kontura.
4. Vrátit Zünd panel do dialogu (`ZUND_ENABLED`). Pole Výsledku pod ním klesne
   na 85 px (N18), dialog bude mít 760 px.
