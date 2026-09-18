# Přetest — Tile Export 1.1.0 po dávce oprav

Navazuje na [testovací plán](2026-09-15-tile-export-test-plan.md) a
[nálezy](2026-09-15-tile-export-test-findings.md). Datum: 2026-09-18.

Tentokrát **jen to, co se opravou změnilo, a co neumím ověřit sám**. Geometrii
drží 12 automatických suit a export jsem ověřil v Illustratoru na produkčním
kódu — ale jen voláním funkcí zevnitř. Dialog, plný běh přes `main.js`, pohled
do PDF v tvém prohlížeči, tisk a ostrá zakázka jsou tvoje.

**Stav dávky:** celek 1 hotový (N7, N1, N6, N10 — `160341a`). Celky 2 (předvolby)
a 3 (hlášky) zatím nejsou postavené — **sekce R6 a R7 platí až po nich**, zbytek
jde testovat hned.

**Doplněno během přetestu (2026-09-18):** N14 (dialog otevře uložené „Půl na
každou stranu" a „Šířku" jinak) patří do celku 2. N13 (linka vystředěná na
hraně, 1 pt) patří do celku 3 a **mění očekávání u linky** v R2.3, R3–R5
a R8.2. Rozměry stránek v R3–R5 platí dál.

**Celek 2 hotový** (N14 `830ef43`, N8 `0919ded`, N9 `05a7366`) — R6 platí.
**Celek 3 hotový** (N2 a N3 `a52aab8`, N4 `a8ae9d1`, N13 `bb777c2`, texty N12
a N15 `4b5e764`) — R7 platí a **linka má nová čísla**: pole Tloušťka je dál to, co je vidět
v tisku (výchozí 1 pt), ale kreslí se dvojnásobná přes hranu plátu. Očekávání
níž jsou přepsaná; R2.1 a R2.2 z první várky platily pro starou linku.

---

## Co jsem ověřil sám — neopakuj

| co | jak | výsledek |
|---|---|---|
| N7 — export 1:1 s grafikou 6,5 m, Large Canvas | produkční `exportTile`, rozbor PDF, vykreslení | stránka 2020 × 1000 mm, jedna linka 0,3 pt na hraně, správný výřez |
| N7 — totéž v běžném dokumentu 1:10 (zeď 6 m) | totéž | 2020 × 1000 mm, 0,3 pt |
| N1 — Large Canvas, Stejné jako dokument | totéž | skutečná velikost, 2020 × 1000 mm |
| náhled 1:10 z běžného dokumentu | totéž | 202 × 100 mm, 0,03 pt |
| N10 — tloušťka linky u Large Canvasu | totéž + test hlídá zdroják | 0,3 pt (dřív by vyšlo 3 pt) |
| rastr u grafiky větší než plát | totéž | obraz jen plátu, 11 930 × 5 906 px |
| strop `resize()` | sonda | bez chyby až do 70 m |
| texty souhrnu a hlášek | skutečný `refresh()` s češtinou | čísla v R4 a R5 níž |
| N14 — obnovení přepínačů | skutečný `buildDialog` ze všech šesti uložených hodnot | každá se otevře i vrátí správně |
| N8 — předvolby | skutečný dialog z tvého nastavení, zápis nahrazený atrapou | otevření „[Default] *", ↺, přepnutí, „TEST *", Uložit; rozměr 1178 × 825 beze změny |
| N13 — linka na hraně | produkční `exportTile`, zeď 6 × 1 m v 1:10, rozbor PDF, Poppler 600 dpi | jeden obdélník přesně na MediaBoxu, tah 2 pt (0,2 v 1:10); vidět 0,96–1,04 pt na všech čtyřech hranách (0,1 v 1:10) |
| N2, N3 — hlášky | skutečný `refresh()` s češtinou | „Šířka plátu musí být kladné číslo.", strop pod přelepem, „Přídavek vlevo (60 mm)…" |

## Co potřebuji od tebe

- **Plný běh přes dialog.** Náhled linky kreslí `main.js` a do toho se zvenku
  nedostanu — a právě tam se změnil způsob, jak se linka škáluje.
- **Tvůj prohlížeč PDF** — P1 zůstává otevřený.
- **Tisk** — jediné číslo v nástroji, které stojí na cizím doporučení.
- **Ostrou zakázku** — podmínka pro push.

---

## 0. Příprava

Sestav a spusť čerstvý skript:

```bash
cd ~/Dev/extendscript-automation/tile-export && npm run build
```

Připravil jsem dva dokumenty do `~/Desktop/tile-export-test/`:

| soubor | co to je |
|---|---|
| `lc-6000x1000.ai` | **Large Canvas** (faktor 10), 6000 × 1000 mm, testovací grafika přes celou plochu i se spadem |
| `zed-6000x1000-1ku10.ai` | **běžný dokument 1:10** (600 × 100 mm), stejná grafika — zeď 6 m |

K tomu testovací arch z §0 původního plánu (`make-test-document.jsx`).

Výchozí nastavení je tabulka z §0 původního plánu a každý test níž uvádí jen to,
čím se od ní liší. **Dialog si pamatuje poslední stav** — před každou sekcí ho
vrať.

**Každý export do nové složky** (nebo předchozí PDF odstraň). Přeskočit hotové je
v §0 zapnuté a jména plátů se mezi testy téhož dokumentu neliší — R3.2 by jinak
přeskočil všechny pláty z R3.1, R4.2 z R4.1 a R5.2 z R5.1, a na disku by zůstaly
stránky z předchozího testu. Hlášení po exportu to řekne řádkem „Počet
přeskočených plátů".

**Předvolba TEST má ještě tloušťku linky 0,3 pt.** Načti ji, přepiš tloušťku na
1 pt a dej **Uložit** — tím zároveň zkoušíš R6.1 a R6.3.

---

## R1 — Kouř: dialog žije (testovací arch)

**R1.1** Dialog se otevře bez chyby, „Faktor Large Canvas: 1", souhrn podle T1.1:
čisté 1000 × 3, tiskové 1010 \| 1020 \| 1010.

**R1.2** Nápověda u **Měřítka výstupu** má nové znění — mluví o tom, co ukazují
pravítka, a o Large Canvasu.

---

## R2 — Linka v náhledu (Jen pláty)

Linka se škáluje jinak (N10) a od N13 leží jinde. V náhledu to zvenku ověřit
neumím. Tloušťka v dialogu **1 pt**:

| # | dokument | ruční měřítko | Okno → Tah ukáže |
|---|---|---|---|
| R2.1 | testovací arch | 1:10 | **0,2 pt** |
| R2.2 | `lc-6000x1000.ai` | vypnuto | **2 pt** |

**Pole v dialogu je tloušťka viditelná v tisku.** Panel Tah ukazuje celý tah
v měřítku dokumentu: ten je dvojnásobný, protože vnější polovinu ořízne okraj
stránky, a arch kreslený v 1:10 ho má desetkrát menší — 2 × 1 pt / 10 = 0,2 pt.
Large Canvas je navenek ve skutečné velikosti, takže panel ukáže rovnou 2 pt.

**R2.3** Cesta linky leží přesně na hraně artboardu: ohraničení **bez tahu**
v Okno → Informace se rovná artboardu, s tahem je na každé straně o půl tahu
větší (T4.2). Na archu i v `lc-6000x1000.ai`. Při 1 pt ve skutečné velikosti
je vidět okem, že linka hranu obkročuje.

**R2.4** Rychlá regrese: Jen pláty třikrát po sobě nezmnoží artboardy ani linky
(T4.5); s vypnutou linkou nevznikne vrstva `TE_lines` (T4.7).

---

## R3 — Export na testovacím archu

Změnil se kód, kterým se grafika vkládá do plátu.

| # | měřítko výstupu | čekám |
|---|---|---|
| R3.1 | Stejné jako dokument | 3 PDF, stránky **101 \| 102 \| 101 × 100 mm**, v každém právě jedna linka, vidět 0,1 pt |
| R3.2 | 1:1 skutečná velikost | stránky **1010 \| 1020 \| 1010 × 1000 mm**, linka vidět **1 pt** na všech čtyřech hranách |
| R3.3 | 1:1, **Rastr** 150 dpi | stránky jako R3.2, obsah rastrový |

**Panel Výsledek je u R3.1 i R3.2 stejný** — ukazuje pláty ve skutečných
milimetrech a měřítko výstupu ho nemění. R3.1 a R3.2 se tedy liší až na
stránkách PDF. Nápad, jak rozdíl ukázat už v dialogu: N16.

**R3.4** Přeskočit hotové (T5.4): druhý běh do stejné složky nic nepřepíše a řekne,
kolik přeskočil.

---

## R4 — Large Canvas (N1, N7, N10) — `lc-6000x1000.ai`

Ruční měřítko **vypnuté**. Dialog musí ukázat „Faktor Large Canvas: 10".

| # | měřítko výstupu | čekám v souhrnu | čekám z exportu |
|---|---|---|---|
| R4.1 | Stejné jako dokument | **bez chyby**; 6000 × 1000; tiskové 2010 \| 2020 \| 2010; spad vlevo 250, vpravo 250, nahoře 655, dole 655 | 3 PDF, stránky **2010 \| 2020 \| 2010 × 1000 mm**, linka vidět **1 pt** |
| R4.2 | 1:1 skutečná velikost | totéž | totéž |

Pak ruční měřítko **1:10** (složené × 100 — dokument představuje zeď 60 × 10 m):

| # | měřítko výstupu | čekám v souhrnu | čekám z exportu |
|---|---|---|---|
| R4.3 | Stejné jako dokument | bez chyby; 60000 × 10000; tiskové 20010 \| 20020 \| 20010 | **náhled 1:10**: stránky 2001 \| 2002 \| 2001 × 1000 mm, linka vidět 0,1 pt |
| R4.4 | 1:1 skutečná velikost | „Plát 1 by při tomto měřítku výstupu měřil 20010 × 10000 mm; artboard Illustratoru unese nejvýš 5715 mm na stranu." Tlačítko **šedé**. | — |

Do opravy: R4.1 hlásil chybu Large Canvasu, R4.2 padal při exportu
(`Specified value greater than maximum allowed value`), a kdyby prošel, linka by
byla desetkrát tlustší.

---

## R5 — Velká zeď v běžném dokumentu (hlavní případ N7) — `zed-6000x1000-1ku10.ai`

Ruční měřítko **1:10** (výchozí), „Faktor Large Canvas: 1".

| # | měřítko výstupu | čekám v souhrnu | čekám z exportu |
|---|---|---|---|
| R5.1 | Stejné jako dokument | 6000 × 1000; tiskové 2010 \| 2020 \| 2010 | stránky **201 \| 202 \| 201 × 100 mm**, linka vidět 0,1 pt |
| R5.2 | 1:1 skutečná velikost | totéž | stránky **2010 \| 2020 \| 2010 × 1000 mm**, linka vidět **1 pt** |

**R5.2 je nejdůležitější řádek přetestu.** Tohle je běžná velká zakázka
a do opravy N7 tady export padal na každém plátu.

---

## R6 — Předvolby (celek 2: N8, N9, N14)

Pravidlo, podle kterého se to celé řídí: **pole po otevření ukazují poslední
potvrzený běh, seznam aktivní předvolbu, a hvězdička říká, že se ty dvě věci
liší.** Operace s předvolbou (Uložit, Uložit jako…, Smazat) se zapisují hned;
Storno zahazuje jen úpravy polí.

**R6.1** Načti TEST a změň libovolnou hodnotu → v seznamu „TEST *", ↺ a Uložit
zaktivní.

**R6.2** **↺** vrátí uložené hodnoty, hvězdička zmizí, obě tlačítka zešednou.

**R6.3** Změň hodnotu, **Uložit**, pak **Storno** a spusť znovu → TEST drží
novou hodnotu (uložilo se hned). U [Default] je Uložit šedé.

**R6.4** Načti TEST, změň přelep na 25 a spusť **Jen pláty**. Spusť znovu → pole
ukážou přelep 25 a seznam „TEST *", protože poslední běh se od uložené
předvolby liší (T7.5). ↺ vrátí 20.

**R6.5** Tlačítko se jmenuje **Storno** a Esc dialog zavře.

**R6.6** Regrese T7.4: předvolba s hodnotami zadanými s desetinnou čárkou
(`0,3`, `12,5`, `2,5`) přežije uložení a načtení.

**R6.7** N14: nastav Dělit podle **Šířky plátu** a Umístění přelepu **Půl na
každou stranu**, spusť Jen pláty, spusť znovu → obojí zůstane. Pak totéž
s **Celý na pravý / dolní**.

**R6.8** Uložit jako… s názvem v hranatých závorkách → hláška o vyhrazeném
názvu. S názvem existující předvolby → dotaz na přepsání.

---

## R7 — Hlášky (celek 3: N2, N3, N4, N15)

| # | co udělat | čekám |
|---|---|---|
| R7.1 | Dělit podle šířky, šířka plátu 0 | „Šířka plátu musí být kladné číslo." |
| R7.2 | šířka plátu 15, Rovnoměrně, přelep 20 | „Se zaškrtnutým Rovnoměrně je šířka plátu stropem tiskové šířky a musí být větší než přelep." |
| R7.3 | přídavek vlevo 60 na archu se spadem 50 | „Přídavek vlevo (60 mm) překračuje přesah grafiky (50 mm)." |
| R7.4 | Jen pláty dvakrát po sobě | první „Počet vytvořených plátů: 3.", druhé „… (předchozí nahrazeny)." |
| R7.5 | Jen pláty a export se 2, 3 a 5 pláty | hlášení mají tvar „Počet …: N", česky správně pro každý počet |
| R7.6 | nápovědy: Počet plátů, PDF preset, Jen pláty, linka, tloušťka | žádná nemluví o „rozpuštění zbytku" ani o prázdném PDF presetu; Jen pláty říká, co tlačítko dělá; linka je „po obvodu tiskového plátu" |

---

## R8 — Fyzicky

**R8.1 — P1, prohlížeč.** Otevři prostřední plát z R3.2 v **Acrobatu** i v
**Náhledu** a zvětši na maximum. Je linka vidět na všech čtyřech hranách? Napiš,
ve kterém prohlížeči co — data v PDF jsou symetrická, jde jen o vykreslení.

**R8.2 — tisková zkouška** (§9 původního plánu). Vytiskni ve skutečné velikosti
plát z R3.2 nebo R5.2, stačí výřez s rohem:
- je linka 1 pt **bezpečně vidět**?
- nezvětšuje ořez?
- je na **všech čtyřech** hranách?

Výsledek patří do specu. Výchozí 1 pt je tvoje volba z přetestu; tisk ji
potvrdí nebo posune.

---

## R9 — Ostrá zakázka

Jedna skutečná zakázka od začátku do konce, ideálně velká v 1:1. Tvoje
rozhodnutí bylo pushnout až produkční nástroj — tohle je ten důkaz.

---

## Jak hlásit

Stejně jako minule: nastavení dialogu (nebo otisk) a co vyšlo. Nové nálezy
pokračují v [nálezech](2026-09-15-tile-export-test-findings.md) číslem N12.

---

## Výsledky

| test | datum | výsledek | poznámka |
|---|---|---|---|
| R2.1 | 2026-09-18 | ✓ | panel Tah 0,03 pt; dotaz na rozdíl proti dialogu → N12 |
| R2.2 | 2026-09-18 | ✓ | panel Tah 0,3 pt — potvrzuje, jak Large Canvas tloušťku zobrazuje |
| R4.1 | 2026-09-18 | ✓ | proběhl |
| R4.2 | 2026-09-18 | — | dialog neotevřel umístění přelepu z minulého běhu → N14; výsledek exportu nehlášen |
| R6.1–R6.5 | 2026-09-18 | — | celek 2 ještě není postavený — výsledek to jen potvrzuje; opakovat po něm |
| R8.1 (P1) | 2026-09-18 | — | linka dál není vidět po celém obvodu, prohlížeč neuveden; návrh změny → N13 |
| R3.1 | 2026-09-18 | — | Výsledek stejný jako u R3.2 — podle návrhu, souhrn je ve skutečných mm; zobrazení výstupu → N16; stránky PDF zatím nehlášeny |

