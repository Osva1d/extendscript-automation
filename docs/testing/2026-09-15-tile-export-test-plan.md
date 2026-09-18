# Testovací plán — Tile Export v1.1.0

Ruční zkouška celého povrchu nástroje před tím, než se pustíme do další etapy
(odsazená cesta a maska). Datum: 2026-09-15.

**Co tenhle plán netestuje:** čistou geometrii. Tu drží 10 automatických suit
(`npm test` v `tile-export/`) — pozice řezů, rozměry plátů, transformaci do
dočasného dokumentu, validační pravidla, výběr barvy značek, převody jednotek
a sedm property testů. Když se rozbije geometrie, spadnou ony, ne tenhle plán.

**Co testuje:** švy mezi tou geometrií a Illustratorem — čtení dokumentu,
kreslení, export, dialog, chybové stavy. Tam automatické testy nedosáhnou.

Čísla ve sloupci „čekám" jsou spočítaná z produkčního kódu pro testovací arch
níž, ne odhadnutá. Když se neshodnou, je to nález.

---

## 0. Příprava

```bash
cd ~/Dev/extendscript-automation/tile-export && npm run verify 2>/dev/null || (npm test && npm run build)
```

Pak v Illustratoru spusť `tile-export/tools/make-test-document.jsx`. Vyrobí:

- plátno **3000 × 1000 mm při 1:10**, čistý formát na artboardu
- navázané PDF se **spadem 50 mm** na každé hraně (růžové pozadí = mimo čistý formát)
- pravítko ve skutečných mm, CMYK klín, mřížku
- blok **NEŘEZAT na 850–1450 mm** — rovnoměrné dělení na 3 pláty ho v 1000 mm rozřízne
- **vodítka na 800 a 1900 mm**, která ho míjí

### Výchozí nastavení

**Dialog si pamatuje poslední hodnoty**, takže před každou sekcí vrať nastavení
sem. Jinak zdědíš, co jsi zkoušel naposledy, a čísla nebudou sedět — ne kvůli
vadě, ale kvůli jinému vstupu.

| pole v dialogu | hodnota |
|---|---|
| Ruční měřítko 1:N | zaškrtnuto, **10** |
| Čistý formát | prázdné (vezme se artboard) |
| Směr | **Horizontálně** |
| Dělit podle | Počtu plátů, **3** |
| Rovnoměrně | **nezaškrtnuto** |
| Přelep | **20** mm |
| Umístění přelepu | **Půl na každou stranu** |
| Přídavky nahoře / dole / vlevo / vpravo | **0 / 0 / 0 / 0** |
| Kreslit ořezovou linku | zaškrtnuto, CutContour, 0,3 pt |
| Měřítko výstupu | Stejné jako dokument |

Každý test níž uvádí jen to, **čím se od tohohle liší**. Všechny testy běží na
testovacím archu výš.

Nejcitlivější je **Umístění přelepu**: při vypnutém Rovnoměrně na něm závisí
tisková šířka úplně každého testu v sekcích 1 a 2. Při zapnutém Rovnoměrně na
něm tisková šířka nezávisí — to je v sekci 3 naopak předmětem zkoušky.

---

## 1. Dělení (T1)

Výchozí nastavení (§0), mění se jen dělení. Kontroluj v poli Výsledek.

| # | nastavení | čekám (čistá \| tisková šířka, mm) |
|---|---|---|
| T1.1 | počet plátů 3 | 1000 \| 1000 \| 1000 — 1010 \| 1020 \| 1010 |
| T1.2 | šířka plátu 1000 | totéž co T1.1 (3 pláty) |
| T1.3 | šířka plátu 1400 | 1400 \| 1400 \| **200** — 1410 \| 1420 \| 210 |
| T1.4 | vodítka | 800 \| 1100 \| 1100 — 810 \| 1120 \| 1110 |
| T1.5 | vodítka, zaokrouhlit na 250 | 750 \| 1250 \| 1000 — 760 \| 1270 \| 1010 |
| T1.6 | vertikálně, počet 2 | 500 \| 500 — 510 \| 510 |

**T1.7 — vodítko na skryté vrstvě.** Dej jedno vodítko na vrstvu a skryj ji.
Čekám varování „1 vodítko na skryté vrstvě bylo ignorováno" po kliknutí na
Jen pláty, a dělení jen podle viditelných.

**T1.8 — smysl testovacího archu.** T1.1 vede šev v 1000 mm skrz blok NEŘEZAT,
T1.4 ho podle vodítek objede. Podívej se na to v dokumentu, ne jen na čísla —
to je celý důvod, proč režim vodítek existuje.

---

## 2. Přelep a přídavky (T2)

Výchozí nastavení (§0), mění se umístění přelepu.

| # | umístění přelepu | čekám (tisková, mm) |
|---|---|---|
| T2.1 | půl na každou stranu | 1010 \| 1020 \| 1010 |
| T2.2 | celý na levý / horní | 1020 \| 1020 \| **1000** |
| T2.3 | celý na pravý / dolní | **1000** \| 1020 \| 1020 |
| T2.4 | přelep 0 (desky) | 1000 \| 1000 \| 1000 |

Čistá šířka je ve všech čtyřech 1000 × 3 — umístění přelepu švem nehne.

**T2.5 — přídavky.** Nahoře 40, dole 40, vlevo 0, vpravo 40, umístění **Půl na
každou stranu**. Čekám tiskové **1010 \| 1020 \| 1050** a výšku plátů 1080 mm.
(S „Celý na levý / horní" by vyšlo 1020 \| 1020 \| 1040, s „Celý na pravý /
dolní" 1000 \| 1020 \| 1060.)
Přídavek se objeví jen na vnějším obvodu, nikdy na švu.

**T2.6 — načisto.** Vlevo 0 znamená, že levá hrana prvního plátu leží přesně
na čistém formátu. Zkontroluj v dokumentu, že tam nic nepřečnívá.

---

## 3. Rovnoměrně (T3)

Výchozí nastavení (§0) a **Rovnoměrně zaškrtnuto**. Mění, co má vyjít stejné.

Čisté šířky v tabulce platí pro **Půl na každou stranu**. Tiskové šířky na
umístění přelepu záviset nesmí — to ověřuje T3.7.

| # | nastavení | čekám (čistá \| tisková, mm) |
|---|---|---|
| T3.1 | počet 3, přelep 20, bez přídavků, **zap** | 1003,3 \| 993,3 \| 1003,3 — **1013,3 × 3** |
| T3.2 | totéž s přídavky 40/40/0/40 | 1016,7 \| 1006,7 \| 976,7 — **1026,7 × 3** |
| T3.3 | šířka plátu 1000, **zap** | **4 pláty**, 755 \| 745 \| 745 \| 755 — 765 × 4 |
| T3.4 | přelep 0, počet 3, **zap** | 1000 × 3 — 1000 × 3, tedy stejné jako vypnuto |

**T3.5 — očekávaná nečinnost.** Vertikálně, 2 pláty, **Půl na každou stranu**:
zapnuto i vypnuto dá **510 \| 510**. Není to chyba — u dvou plátů bez přídavků
jsou oba krajní a nesou každý půl přelepu, takže se obě definice potkají.

Platí to **jen** pro Půl na každou stranu. S jednostranným umístěním se to
rozejde: vypnuto dá 520 \| 500 nebo 500 \| 520, zapnuto 510 \| 510. Když tohle
uvidíš, zkontroluj umístění dřív, než to nahlásíš.

**T3.6 — strop drží.** Šířka plátu 1000 se zapnutým přepínačem nesmí vytisknout
nic širšího než 1000 mm. Projdi všechny pláty v souhrnu.

**T3.7 — tisková šířka na umístění přelepu nezávisí.** Počet 3, Rovnoměrně
zaškrtnuto. Přepni postupně všechna tři umístění přelepu. Tisková šířka musí
zůstat **1013,3 × 3** ve všech třech; měnit se smí jen čisté šířky a to, který
plát je širší načisto. Totéž u šířky plátu 1000: čtyři pláty po 765 bez ohledu
na umístění.

---

## 4. Kreslení a idempotence (T4)

Tlačítko **Jen pláty** (bez exportu).

**T4.1 — artboardy.** Vznikne tolik nových artboardů, kolik je plátů,
pojmenovaných předponou pro generované pláty. Původní artboard čistého formátu
zůstane.

**T4.2 — červená linka.** Leží po obvodu **tiskového** plátu, ne čistého, a její
**vnější hrana tahu sedí přesně na hraně artboardu**. Tohle už jednou bylo špatně.

Okem to ale nezkontroluješ. Illustrator kreslí tah na střed cesty, takže skript
nakreslí cestu zmenšenou o půl tahu a vnější polovina dosedne na cíl — při 1:10
a lince 0,3 pt je to odsazení **0,015 pt, tedy 5 tisícin milimetru**. Neuvidíš ho
ani při maximálním zvětšení. Dvě cesty, jak to ověřit doopravdy:

1. **Čísly.** Vyber linku a v Okno → Informace přepni na ohraničení. Ohraničení
   *včetně tahu* se musí rovnat rozměru artboardu na setiny. (Cesta samotná je
   o ten půltah menší — to je správně, ne nález.)
2. **Okem.** Nastav linku dočasně na **3 pt**. Odsazení je pak 1,5 pt a je vidět
   okamžitě. Ověřuješ tím přesně stejnou aritmetiku, jen zvětšenou stokrát.

**T4.3 — tloušťka.** Nastav 0,3 pt a změř v Illustratoru (Okno → Tah).
Při 1:10 musí být v dokumentu **0,03 pt**, aby po zvětšení na skutečnou velikost
vyšla 0,3. Kdyby byla v dokumentu 0,3, vytiskne se 3 pt.

**T4.4 — přímá barva.** Linka je v přímé barvě `CutContour`. Když ve vzorníku
není, vytvoří se. Když tam je, **použije se stávající** a nepřepíše se.

**T4.5 — idempotence.** Spusť Jen pláty **třikrát za sebou** se stejným
nastavením. Čekám pořád stejný počet artboardů a linek — ne trojnásobek.

**T4.6 — změna nastavení.** Spusť s 3 pláty, pak s 5. Staré artboardy a linky
musí zmizet, ne se navrstvit.

**T4.7 — vypnutá linka.** Odškrtni Kreslit ořezovou linku. Artboardy vzniknou,
linky ne — a **nevznikne ani prázdná vrstva `TE_lines`**. Pak zapni linku, spusť,
a znovu vypni: vrstva musí zmizet i s linkami, ostatní vrstvy zůstat.
(Prázdná vrstva se zakládala dřív; nalezeno tímhle testem.)

---

## 5. Export (T5)

Tlačítko **Vytvořit a exportovat**, cílová složka na plochu.

**T5.1 — nejdůležitější test celého plánu.** Výchozí nastavení (§0), exportuj.
Otevři **prostřední** PDF. Uvnitř nesmí být **žádná červená linka sousedních
plátů** — jen jeho vlastní po obvodu. Pláty se překrývají o přelep, takže kdyby
se kreslilo do zdrojového dokumentu, sousedova linka by tam byla. Tohle je
jediný důvod, proč export staví dočasný dokument na každý plát.

**T5.2 — MediaBox.** Rozměr stránky exportovaného PDF se rovná tiskové šířce ze
souhrnu. U T1.1 tedy 1010 / 1020 / 1010 mm.

**T5.3 — pojmenování.** Vzor `{doc}_{n}` dá `nazev_1.pdf` … `nazev_3.pdf`.
Zkus i `{doc}_{n}_z{total}` a číslování u 10+ plátů — musí být **zarovnané
nulami** (`01`, `02` … `10`).

**T5.4 — přeskočit hotové.** Nech zaškrtnuté, exportuj znovu do stejné složky.
Čekám hlášku, že se X plátů přeskočilo. Pak jeden soubor smaž a spusť znovu —
doplní se jen ten chybějící.

**T5.5 — PDF preset.** Vyber v rozbalovací nabídce jiný preset než výchozí
a ověř na výstupu (např. jiná komprese nebo přítomnost ořezových značek).
Neexistující preset nesmí shodit běh — jen se zaloguje.

**T5.6 — vektor vs. rastr.** Přepni na Rastr, 150 DPI. Výstup má být
rasterizovaný, rozměr stránky stejný.

**T5.7 — měřítko výstupu.** „Stejné jako dokument" dá PDF v 1:10, tedy 101 mm
široké. „1:1 skutečná velikost" dá 1010 mm. Zkontroluj obojí.

**T5.8 — nezapisovatelná složka.** Zadej neexistující cestu. Čekám chybu
„Cílová složka není zapisovatelná" a **žádný** vyexportovaný soubor.

**T5.9 — zdrojový dokument zůstane nedotčený.** Po exportu musí být zdroj ve
stejném stavu jako před ním (kromě artboardů a linek z fáze 1). Zavři ho bez
uložení a znovu otevři, kdyby sis nebyl jistý.

---

## 6. Měřítko (T6)

**T6.1 — ruční 1:N.** Odškrtni ruční měřítko (tedy 1:1) na archu, který je
kreslený v 1:10. Souhrn začne hlásit desetinové rozměry — čekám 300 × 100 mm.
To je správně: nástroj věří tomu, co mu zadáš.

### Příprava pro T6.2 a T6.3

Testovací arch z §0 k tomu nestačí — je v běžném dokumentu. Založ nový dokument
**6000 × 1000 mm**. Je větší než strop běžného plátna (5779 mm), takže ho
Illustrator sám založí jako **Large Canvas s faktorem 10**: vnitřně má 600 × 100 mm
a všechno ukazuje desetkrát větší.

Umísti do něj **libovolné PDF** (Soubor → Umístit, propojit), třeba
`testovaci-grafika-se-spadem.pdf`. Na grafice tady nezáleží: rozměry plátů se
berou z artboardu a grafika ovlivní jen řádek Dostupný spad. Bez ní ale nástroj
odmítne běžet („V dokumentu není navázaná grafika", T8.8).

V dialogu musí u „Faktor Large Canvas" stát **10**, a **ruční měřítko vypni** —
dokument je ve skutečné velikosti, faktor mu dává Large Canvas. Kdyby zůstalo
zapnuté 1:10 z výchozího nastavení, dostaneš čísla z T6.3.

| # | ruční měřítko | měřítko výstupu | čekám v souhrnu | Vytvořit a exportovat |
|---|---|---|---|---|
| T6.2a | vypnuto | Stejné jako dokument | chyba Large Canvas; 6000 × 1000, tiskové 2010 \| 2020 \| 2010 | **šedé** |
| T6.2b | vypnuto | 1:1 skutečná velikost | bez chyby, stejná čísla | aktivní |
| T6.3a | 1:10 | Stejné jako dokument | chyba Large Canvas; **60000 × 10000**, tiskové 20010 \| 20020 \| 20010 | **šedé** |
| T6.3b | 1:10 | 1:1 skutečná velikost | chyba „Plát se při tomto měřítku výstupu nevejde do artboardu" | **šedé** |

**T6.2 — proč chyba.** Export staví pro každý plát dočasný dokument a ten
**nikdy není Large Canvas** (faktor nejde nastavit a selže potichu — naměřeno).
S výstupem ve zdrojovém měřítku by se plát vyexportoval v desetině skutečné
velikosti a nikdo by si toho nevšiml až do tisku. Proto chyba a zešedlé tlačítko.
S výstupem 1:1 se plát do běžného dokumentu desetkrát zvětší — a 2020 mm se
do artboardu vejde.

**T6.2b — ověř i export.** Vyexportuj a otevři prostřední plát: MediaBox musí mít
**2020 × 1000 mm** (5726,0 × 2834,6 pt). Tím se ověří, že zvětšení z Large Canvas
do běžného dokumentu sedí.

**T6.3 — složené měřítko.** Large Canvas × 10 a k tomu ruční 1:10 znamená × 100:
dokument teď představuje grafiku **60 × 10 metrů**. Souhrn to musí ukázat —
60000 × 10000, pláty po 20000, i dostupný spad desetkrát větší (500 mm). Oba
exporty jsou přitom **správně zablokované**: ve zdrojovém měřítku kvůli Large
Canvas, v 1:1 proto, že plát 20 × 10 m se do artboardu Illustratoru nevejde (strop
je 5779 mm na stranu). T6.3 tedy ověřuje jen to, že se faktory násobí; šedé
tlačítko tu není nález.

---

## 7. Dialog a předvolby (T7)

**T7.1 — šedivění.** Přepni Dělit podle a sleduj: aktivní je vždy jen pole
příslušného režimu. Zaškrtávátko Rovnoměrně je aktivní u počtu i šířky,
**šedé u vodítek**.

**T7.2 — pole Výsledek.** Nastav 12 plátů. Všech 12 řádků musí být dostupných —
buď se vejdou, nebo jde polem **scrollovat**. Nic se nesmí ztratit potichu.
Text jde označit a zkopírovat.

**T7.3 — chyby nahoře.** Zadej přelep 1200 mm. Čekám, že chybová hláška bude
**první řádek** souhrnu, ne poslední, a tlačítko Vytvořit a exportovat zšedne.

**T7.4 — předvolby.** Ulož předvolbu, změň nastavení, načti ji zpět. Musí sedět
**všechna** pole včetně nových (Rovnoměrně, umístění přelepu). Pak ji smaž.

Aspoň tři pole zadej **s desetinnou čárkou** — tloušťka linky `0,3`, přelep
`12,5`, přídavek `2,5`. Po načtení se smí ukázat s tečkou (`0.3`), ale **hodnota
musí sedět**. Tady se našla první vada: čárka se zahazovala, tloušťka se vracela
jako 1 pt a přelep i přídavky jako nula.

**T7.5 — poslední nastavení.** Zavři dialog přes Zrušit a spusť znovu — pamatuje
si poslední hodnoty, ne výchozí.

**T7.6 — stará předvolba.** Máš-li předvolbu uloženou před dneškem, načti ji.
Nesmí spadnout; chybějící nové klíče se doplní z výchozích hodnot a chová se
jako „celý na levý / horní" a Rovnoměrně vypnuto.

**T7.7 — čeština.** Projdi dialog očima: žádné `ÄŤ` ani useknuté popisky.
Najeď myší na každý popisek a přečti nápovědu.

---

## 8. Chybové stavy (T8)

| # | co udělat | čekám |
|---|---|---|
| T8.1 | počet plátů 1 | „Jsou potřeba aspoň 2 pláty." |
| T8.2 | šířka plátu 5000 (> grafika) | totéž |
| T8.3 | šířka plátu 0 nebo text | **známá vada**, viz níž |
| T8.4 | režim vodítek bez vodítek | „Nenalezena použitelná vodítka…" |
| T8.5 | přídavek vlevo 60 (spad je 50) | „Přídavek left (60 mm) překračuje přesah grafiky (50 mm)." |
| T8.6 | přelep 1200 | „Přelep (1200 mm) musí být menší než nejkratší plát (1000 mm)." |
| T8.7 | dvě navázaná PDF v dokumentu | „Dokument musí obsahovat právě jednu navázanou grafiku (nalezeny 2)." |
| T8.8 | dokument bez grafiky | „V dokumentu není navázaná grafika." |
| T8.9 | spustit bez otevřeného dokumentu | srozumitelná hláška, ne pád |
| T8.10 | zamčená vrstva s linkami | nespadne, nebo řekne proč |

**Dvě známé drobnosti, ať je nehlásíš jako nález:**

- U T8.5 je název hrany v české větě anglicky (`left`).
- U T8.3 se ukáže hláška **„Pozice řezů musí být vzestupné a uvnitř grafiky."**
  To je špatně — `TE_BAD_WIDTH` nemá vlastní text a mapuje se na cizí
  (`ui.js`, `describeError`). Týká se to i stropu menšího než přelep
  u zapnutého Rovnoměrně. Chce to vlastní hlášku.

---

## 9. Co plán vědomě nepokrývá

- **Zünd režim** — v dialogu je skrytý (`ZUND_ENABLED`), protože bez masky
  neposlouží plátované zakázce. Jeho geometrii drží 13 suit v `zund-summa-marks`
  a sdílené jádro.
- **Tisková zkouška linky 0,3 pt** — jediné číslo v nástroji, které stojí na
  cizím doporučení a ne na měření u vás. Vytiskni plát a podívej se, jestli je
  linka bezpečně vidět a nezvětšuje ořez. Výsledek patří do specu.
- **Výkon na velké zakázce** — 20+ plátů z těžkého PDF. Není to funkce, ale
  chce se vědět, jestli to doběhne.

---

## 10. Jak hlásit nález

Nastavení dialogu (nebo rovnou otisk) plus co vyšlo. Geometrii pak umím přehrát
offline proti produkčnímu kódu a porovnat, aniž bych hádal.
