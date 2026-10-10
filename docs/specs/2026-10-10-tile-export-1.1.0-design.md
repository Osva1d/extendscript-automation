# Návrh — tile-export 1.1.0: pracovní postup, kontrolní pláty a dialog

Nástroj: `tile-export`, namespace `TE`.
Navazuje na [návrh 1.0](2026-09-13-tile-export-design.md) a
[Zünd režim](2026-09-13-tile-export-zund-design.md).

Datum: 2026-10-10 · Stav: **návrh**, čeká na schválení

Vzniklo z prvního provozu (2026-10-10) a z popisu všech voleb dialogu, který
uživatel prošel bod po bodu. Nálezy z té doby jsou v
[nálezech](../../tile-export/docs/findings.md) (N32–N39).

---

## 1. Proč

Nástroj v provozu funguje, ale postup jím drhne:

- **Měřítka matou.** Ruční 1:N se zaškrtávátkem, faktor Large Canvas
  a „Stejné jako dokument", které u kresby 1:10 znamená 1:10 a u Large Canvasu
  skutečnou velikost. K tomu se 1:N přenáší z poslední zakázky.
- **Linka a Zünd** jsou dva výlučné typy výstupu, rozdělené do řádku v Exportu
  a vlastního panelu se zaškrtávátkem.
- **Jen pláty** kreslí artboardy a linky přes původní grafiku. Neukážou plát
  tak, jak vyjde — zamaskovaný, bez linky souseda, se značkami.
- **Názvy souborů** se doplňují ručně, přitom dílna má pevnou konvenci
  s rozměrem a počtem kopií.
- **Rastr** se v dílně nepoužívá: rastruje se ve Photoshopu, a to jen při
  potížích na RIPu.

## 2. Rozhodnutí uživatele (2026-10-10)

| # | rozhodnutí |
|---|---|
| 1 | Měřítka přestavět (§9). |
| 2 | Jedna volba **typu výstupu**: ruční ořez (linka, pomůcka pro finišera, tiskne se) / Zünd (řezová cesta pro stroj, netiskne se). |
| 3 | Rastr z dialogu schovat; rozhodne test rastrování Illustrator vs Photoshop. |
| 4 | Přeskočit hotové výstupy jen na požádání — **hotovo v 1.0.1**. |
| 5 | Kontrolní pláty v **pracovním dokumentu**. Ten se měnit smí, zdrojové PDF nikdy. |
| 6 | Vzor pojmenování podle konvence dílny (§7). |
| 7 | N38 (vodítka u Vodorovně) opravit — **hotovo v 1.0.1**. |
| 8 | Pořadí dialogu podle pracovního postupu. |
| — | Pláty s mezerou, aby artboardy byly rovnou použitelné; delší grafika se zalomí do dalších řad. |
| — | Hranice po ořezu jako vodítko — nápad k úvaze. |
| — | **Do budoucna export z kontrolních plátů** v pracovním dokumentu. |

## 3. Pojmy

- **Zdrojové PDF** — klientská data, umístěná a navázaná. TE ho nikdy nemění.
- **Pracovní dokument** — `.ai` s artboardem čistého formátu, ve kterém TE běží.
- **Čistý formát** — první artboard, jehož název nezačíná `TE_`.
- **Plát načisto / tiskový plát** — kus čistého formátu / tentýž s přelepem
  a přídavky.
- **Dostupný spad** — o kolik zdrojové PDF přesahuje čistý formát na každé hraně.
- **Měřítko kresby** — 1:N, ve kterém je pracovní dokument nakreslený.
- **Měřítko výstupu** — 1:1, nebo 1:N jako kresba.
- **Kontrolní pláty** — pláty v pracovním dokumentu, zamaskované a hotové,
  každý na vlastním artboardu.

## 4. Pracovní postup (happy path)

1. Pracovní dokument: artboard na čistý formát v měřítku kresby, například
   600 × 300 mm v 1:10. Umístit navázané zdrojové PDF, které artboard přesahuje
   o spad (5 mm v kresbě = 50 mm ve skutečnosti).
2. Spustit TE. Panel Dokument ukáže, co našel: čistý formát a dostupný spad ve
   skutečných milimetrech a měřítko kresby uložené v dokumentu. Nový dokument
   má 1:1; měřítko se zadá jednou a dokument si ho zapamatuje.
3. **Dělení:** směr, režim (počet / šířka / vodítka), hodnota, Rovnoměrně.
4. **Přelep a přídavky:** přelep a jeho umístění, přídavky.
5. **Typ výstupu:** ruční ořez (linka), nebo Zünd.
6. **Soubory:** měřítko výstupu (jen u kresby 1:N), PDF preset, složka, vzor
   názvu.
7. **Výsledek:** rozměry plátů, stránky PDF, název prvního souboru, chyby.
8. **Jen pláty** → kontrolní pláty v pracovním dokumentu → prohlédnout.
9. **Vytvořit a exportovat** → PDF podle vzoru názvu.

## 5. Dialog

Dva sloupce jako dnes. Vlevo Předvolby, Dokument, Dělení, Přelep a přídavky;
vpravo Typ výstupu, Soubory, Výsledek. Výška se změří headless jako v 1.0
(strop 793 px).

| panel | obsah | změna proti 1.0 |
|---|---|---|
| Předvolby | seznam, ↺, Uložit, Uložit jako…, Smazat | beze změny; měřítko kresby v předvolbě už není (§9) |
| Dokument | **Měřítko kresby 1:[N]**; čistý formát a dostupný spad ve skutečných mm | jedno pole místo zaškrtávátka; faktor Large Canvas pryč; údaje o dokumentu sem z Výsledku |
| Dělení | Směr, Dělit podle, Počet / Šířka / Zaokrouhlit vodítka, Rovnoměrně | beze změny (N38 opraven v 1.0.1) |
| Přelep a přídavky | Přelep, Umístění přelepu, čtyři přídavky | beze změny |
| Typ výstupu | **Ruční ořez** — Kreslit linku, přímá barva, tloušťka. **Zünd** — barva řezu, barva značek, spad za řezem, průměr značky, odstup od motivu, max. rozteč, orientační bod | nový; obě sady polí ve skupině `stack`, vidět je jen zvolená |
| Soubory | Měřítko výstupu, PDF preset, Cílová složka, Vzor pojmenování, Přeskočit hotové | měřítko výstupu pojmenované číslem a u kresby 1:1 skryté; Obsah (vektor/rastr) a DPI pryč (§9, rozhodnutí 3) |
| Výsledek | chyby a varování nahoře; pláty načisto a tiskové; stránky PDF; **název prvního souboru** | údaje o dokumentu přesunuté do panelu Dokument |
| tlačítka | Storno / Jen pláty / Vytvořit a exportovat | Jen pláty dělají kontrolní pláty (§6) |

Zaškrtávátko **Kreslit linku** u ručního ořezu zůstává: linku umí přidat i RIP
(standard dat v dílně: bez spadávky, s červenou linkou na okraji).

Skupina `stack` drží obě sady polí na stejném místě, panel je vysoký jako
větší z nich (Zünd). Skrytá skupina v ScriptUI místo nevrací (naměřeno v 1.0),
`stack` to obchází — ověřit headless.

## 6. Kontrolní pláty v pracovním dokumentu (Jen pláty)

### 6.1 Co vznikne

Pro každý plát:

- **artboard `TE_nn`** = stránka PDF plátu v měřítku kresby: u ručního ořezu
  tiskový plát, u Zündu stránka se značkami;
- **kopie pozice zdrojového PDF** přes `duplicate()` (drží ořez, N39),
  v ořezové masce: u ručního ořezu tiskový plát, u Zündu řez + spad za řezem;
- **linka** (ruční ořez), nebo **značky a řezová cesta** (Zünd).

Staví je tentýž kód jako export, jen do pracovního dokumentu a v měřítku
kresby.

### 6.2 Vrstvy

Jedna vrstva nejvyšší úrovně pro TE, v ní podvrstva na každý plát (`TE_01`…)
a v té podvrstvy podle role: `Graphics`, linka podle své barvy, u Zündu
`Regmarks` a řez. Plát je tak jeden celek, který jde později vzít a vyexportovat
(§8). Přesné názvy se doladí s ohledem na Zünd Summa Marks.

### 6.3 Rozložení

- Pláty v pořadí číslování **mimo vše, co v dokumentu je**: u Svisle pod tím,
  řada zleva doprava; u Vodorovně vpravo od toho, sloupec shora dolů.
- **Mezera** mezi artboardy: žádný objekt plátu nesáhne do sousedního artboardu
  a artboardy jsou rovnou použitelné (například Uložit kopii jako PDF
  s rozsahem). Návrh 10 mm v kresbě, doladí se na první zkoušce.
- Řada, která by přesáhla plátno Illustratoru (16 383 pt ≈ 5779 mm v kresbě),
  se **zalomí** do další řady, resp. sloupce. U kresby 1:10 je to 57,8 m
  skutečnosti na řadu.
- Když se rozložení nevejde ani zalomené (velká kresba 1:1 na běžném plátně),
  je to chyba jen pro **Jen pláty**. Vytvořit a exportovat v 1.1.0 kontrolní
  pláty nepotřebuje (§8): vyexportuje a řekne, že je nepostavil.

### 6.4 Rámeček jako vodítko (volitelné)

Obdélník plátu převedený na vodítko — netiskne se a do PDF nejde. Naměřeno
2026-10-10: obdélník jde skriptem převést (`guides = true`) a přežije uložení
i znovuotevření.

Vodítka TE musí ležet ve vrstvě TE a čtení vodítek tu vrstvu vynechá. Jinak by
režim Vodítek četl rámečky jako švy. Kterou hranici rámeček ukazuje, je
otevřené (§10).

### 6.5 Opakovaný běh

TE odstraní svou vrstvu i artboardy `TE_` a postaví je znovu; vrstvu před tím
odemkne. Původní artboard, zdrojová pozice a objekty uživatele zůstanou.
Ruční úpravy kontrolních plátů se v 1.1.0 ztratí.

Dnešní náhled — artboardy přes původní grafiku a vrstva `TE_lines` — zaniká.

### 6.6 Rizika

- **Výkon a paměť:** N kopií velkého navázaného PDF v jednom dokumentu.
  Změřit na velkém klientském PDF.
- **Hairline řezu** 0,125 pt je v kresbě 1:10 0,0125 pt, v Large Canvas s 1:10
  ještě desetkrát méně. Změřit, jestli ji Illustrator nezaokrouhlí.
- **Large Canvas** pracovní dokument: stavět ve vnitřních jednotkách, stávajícím
  měřítkovým aparátem (`pageRatio`).

## 7. Pojmenování

Konvence dílny: `RR_zakázka_motiv_plát_rozměr_kopie`, například
`26_13456_a_01_2020x1020mm_1x` — rok, číslo zakázky, motiv, číslo plátu,
rozměr MediaBoxu, počet kopií.

Pevné části píše uživatel do vzoru, mezi ně placeholdery:
`26_13456_a_{n}_{size}_1x`.

| placeholder | hodnota |
|---|---|
| `{n}` | číslo plátu, **vždy aspoň dvě číslice** (`01`); dnes se doplňuje jen na délku počtu, u tří plátů je to `1` |
| `{size}` | rozměr stránky PDF v měřítku výstupu, celé mm: `2020x1020mm`; u Zündu stránka se značkami |
| `{doc}`, `{total}` | beze změny |

- `{size}` je MediaBox, když preset nepřidá spadávku ani značky. Preset
  pass4press stránku zvětší o 12,5 mm na každou stranu (N36).
- Zünd dál přidává k řezovému souboru `_cut`.
- Výsledek ukáže název prvního souboru, aby šel vzor zkontrolovat před exportem.
- Znak, který do názvu souboru nepatří (`/`, `:`), je chyba v dialogu.
- **Poměr u dat 1:N** je otevřený (§10).

## 8. Export

- **1.1.0:** dál dočasný dokument na plát, týmž kódem jako kontrolní pláty, takže
  vyjde totéž, co pláty ukazují. Grafika se do dočasného dokumentu **kopíruje
  z pozice** (`duplicate()`), ne umisťuje znovu (N39).
- Měřítko výstupu se chová jako dnes, jen je pojmenované číslem.
- **Do budoucna:** export z kontrolních plátů v pracovním dokumentu, převezme
  i ruční úpravy. Plát je podvrstva (§6.2), export ji zkopíruje do dočasného
  dokumentu a zvětší měřítkem výstupu. Předtím změřit: kopírování mezi
  dokumenty včetně Large Canvas, zvětšení tahů a značek, hairline.

## 9. Měřítka

- **Jediný vstup:** měřítko kresby 1:N, uložené v pracovním dokumentu (XMP).
  Naměřeno 2026-10-10: vlastní hodnota v `doc.XMPString` přežije uložení
  i znovuotevření. Zapíše se po potvrzeném běhu. Nepatří do předvoleb ani do
  posledního běhu; uložené předvolby ji při načtení ignorují.
- **Large Canvas** TE bere z dokumentu a v dialogu ho neukazuje.
- Všechna čísla v dialogu jsou ve skutečných milimetrech (beze změny).
- **Výstup:** „1:1 skutečná velikost" a „1:N jako kresba" s číslem kresby. U
  kresby 1:1 je volba skrytá.
- Kontrolní pláty jsou v měřítku kresby.
- Rastr z dialogu mizí. Kdyby se po testu vrátil, DPI bude ve finální velikosti
  (N37).
- README dostane upozornění: preset, který převzorkovává, v 1:N srazí obraz
  N× (N36).

## 10. Otevřené otázky

1. **Poměr v názvu u dat 1:N** — jak se píše (příklad názvu pro 1:10)? A je
   rozměr v názvu u 1:10 stránka v 1:10 (`202x102mm`), nebo skutečnost?
2. **Rámeček jako vodítko** — kterou hranici: načisto (kde je šev a kde končí
   přelep)? Hranici řezu ukazuje už linka, u Zündu řezová cesta.
3. **Rastr** — rozhodne test rastrování Illustrator vs Photoshop.
4. **Mezera mezi pláty** — 10 mm v kresbě, nebo jinak.

## 11. Co změřit před implementací

- Polohu plátna v souřadnicích dokumentu: kam se rozložení vejde.
  `artboards.add` mimo plátno hází, to je pojistka, ne výpočet.
- Výkon a paměť N kopií velkého PDF (§6.6).
- Hairline v 1:10 a v Large Canvas (§6.6).
- `duplicate()` z Large Canvas do běžného dokumentu: oprava N39 i budoucí
  export (§8).
- Čtení vodítek s vynechanou vrstvou TE (§6.4).

## 12. Pořadí prací

1. **1.0.1** — N35 po pondělním testu, N39 (navrženo), vydání.
2. **1.1.0 a** — dialog: typ výstupu, pořadí panelů, měřítko kresby v dokumentu,
   výstup pojmenovaný číslem, rastr pryč. Node testy collect/apply/refresh,
   headless měření výšky.
3. **1.1.0 b** — pojmenování: `{n}` dvoumístné, `{size}`, poměr podle §10.
4. **1.1.0 c** — kontrolní pláty: rozložení (Node testy aritmetiky zalomení
   a mezer), vrstvy, opakovaný běh, případně vodítka. Sondy v Illustratoru,
   ruční test.
5. **1.2.0** — export z kontrolních plátů.
