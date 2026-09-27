# Návrh — plátování velkých grafik pro ruční ořez

Nástroj: `tile-export`, namespace `TE`.

Datum: 2026-09-13 · Stav: **implementováno** (tile-export 1.0.0, nevydáno)

Záznam návrhu, ne popis dnešního chování — ten drží [README](../../tile-export/README.md).
Pozdější změny jsou zapsané v textu tam, kde se návrh změnil; seznam oprav
z ručního testu je v [nálezech](../../tile-export/docs/findings.md).

---

## 1. Problém

Většinu plátování velkoformátových grafik zvládne RIP. Ručně se plátuje jen ve
dvou případech:

1. **Nerovnoměrné dělení** — šev se musí vyhnout textu nebo logu. RIP to neumí.
2. **Strojní přesný ořez na Zündu** — každý plát potřebuje regmarky a vlastní
   ořezová data.

Tento návrh řeší **výhradně první případ**. Druhý je mimo rozsah (viz §10).

Dnešní ruční postup: kopie grafiky pro každý plát, clipping maska, ruční
artboardy. Zdlouhavé a — jak ukázalo měření v §3 — produkuje soubory, kde každý
plát nese celou grafiku.

## 2. Rozsah v1

**Uvnitř:**

- plátování **jedním směrem** (horizontálně nebo vertikálně, ne obojí naráz)
- tři vstupní režimy dělení: počet plátů, šířka plátu, pozice vodítek
- přídavky (montážní spad) ve **čtyřech nezávislých polích** — nahoře, dole,
  vlevo, vpravo; nula znamená „načisto"
- přelep, samostatně od přídavků; default 2 cm, nula pro desky
- dva režimy přelepu: symetricky kolem švu, nebo celý na jeden plát
- **červená linka** po obvodu **vnějšího rozměru** plátu (MediaBoxu výstupu),
  v **přímé barvě**
- vytvoření artboardů s pojmenováním
- export do PDF — vektorový nebo rastrový režim
- presety, lokalizace cs/en (infrastruktura repa)

**Mimo:**

- Zünd: regmarky a ořezová data pro plát
- 2D mřížka (dělení v obou směrech současně)
- řezací značky, registrační terče, číslování plátů
- ořez obsahu přes externí nástroj (mutool, Ghostscript)

## 3. Naměřená fakta

Illustrator 30.8.1, macOS, 2026-09-13. Zdroj 2000 × 1000 pt, plát 500 × 500 pt
(osmina plochy). Sondy ve `tools/ai-eval.sh`.

| Co | Velikost | Poměr k celku |
|---|---|---|
| Zdroj — vektorový PDF | 74 199 B | — |
| Export celé plochy, bez editability | 43 407 B | 100 % |
| Plát 1/8, jen artboard | 43 391 B | 99,96 % |
| Plát 1/8 + clipping maska (linked) | 44 766 B | 103 % |
| Plát 1/8 + clipping maska (embedded) | 43 451 B | 100 % |
| Plát 1/8 s „Preserve Editing Capabilities" | 358 966 B | 827 % |
| Zdroj — rastrový PDF | 51 794 B | — |
| Rastrový plát 1/8 | 52 841 B | 102 % |
| Rastrový plát 1/8 + maska | 54 202 B | 105 % |
| Rasterizovaný plát ze zdroje vektorového | 51 406 B | — |
| Rasterizovaný plát ze zdroje rastrového | 51 406 B | — |

**Illustrator neořezává obsah.** Artboard mění jen rozměr stránky — `pdfinfo`
potvrdil 500 × 500 pt na výstupu — ale data uvnitř jsou kompletní grafika.
Clipping maska nepomůže, naopak přidá bajty za masku. Embedded ani linked na tom
nic nemění. V `PDFSaveOptions` neexistuje ekvivalent InDesignového
„Crop Image Data to Frames".

**Rasterizace je jediný únik.** Poslední dva řádky: rasterizovaný plát váží
51 406 B ze zdroje vektorového i rastrového, na bajt stejně. Velikost přestává
záviset na zdroji a začíná záviset na ploše plátu a DPI.

**`scaleFactor` nelze nastavit a selže tiše.** Nový dokument z
`app.documents.add()` má `scaleFactor = 1`; přiřazení `doc.scaleFactor = 10`
proběhne **bez výjimky** a hodnota zůstane 1. `DocumentPreset` tu vlastnost
nemá (`title, width, height, numArtboards, artboardLayout, artboardSpacing,
artboardRowsOrCols, colorMode, units, previewMode, rasterResolution,
transparencyGrid, documentBleedOffset, documentBleedLink`). Dočasný dokument
tedy **nikdy není Large Canvas** — viz §7.

**Maximální artboard** u dokumentu se `scaleFactor = 1` leží mezi **16 200 pt
(225 in, 5 715 mm)** a 16 300 pt — 16 200 projde, 16 300 vrátí `CoOA`
(1095724867), nad 16 384 pt `MRAP` (1346458189). Plátno je centrované kolem
počátku, takže artboard vedený z počátku doupadá na mez mnohem dřív; měřeno
vycentrovaně. Mez u Large Canvas neověřena.

Důsledek pro návrh: validace §5 se **neopírá o konstantu**, ale o `try/catch`
kolem přiřazení `artboardRect`. Konstanta by zestárla s verzí Illustratoru,
chyba ne.

**Vodítka** jsou `pathItems` s `guides === true`, geometrie v
`pathPoints[].anchor`. Ověřeno na dokumentu s **ručně taženými** vodítky
(2026-09-13), nejen na vodítkách vytvořených skriptem. Čtyři vlastnosti, na
kterých stojí implementace:

- **Ručně tažené vodítko je plnohodnotný `pathItem`.** Režim `guides` je
  proveditelný.
- **Vodítko přesahuje artboard o řády.** Naměřeno: artboard vysoký 1000 pt,
  vodítko od `y = 7691` do `y = −8692`. Filtrovat vodítka podle toho, jestli
  jejich `geometricBounds` leží uvnitř artboardu, **nelze** — filtruje se podle
  souřadnice řezu, ne podle bounds.
- **Orientace** se pozná z bodů: `x₁ = x₂` je svislé vodítko, `y₁ = y₂`
  vodorovné. Pozice řezu je ta shodná souřadnice.
- **Pozice nejsou celá čísla.** Naměřeno `1553.0909…`, `962.1818…`,
  `425.8181…` — nepřesnost tažení rukou. Dialog proto nabídne volitelné
  zaokrouhlení pozic na zadaný krok.

Pořadí v kolekci je stacking order, ne prostorové — řadit podle souřadnice.

**Vodítka jsou čitelná i na zamčené a na skryté vrstvě** (ověřeno, 3 ze 3).
To je past: nástroj by jinak plátoval podle starého vodítka, které uživatel
nevidí. Viz validační pravidlo v §5.

## 4. Datový model

Souřadnice dokumentové, Y kladné nahoru.

**Vstup**

- čistý formát grafiky = **aktivní artboard bez prefixu `TE_`**, obdélník
  `[X0, Y0, X1, Y1]`. Pláty vznikají jako **nové** artboardy s prefixem, původní
  zůstane nedotčený — je to jediný zdroj pravdy o čistém formátu při opakovaném
  spuštění a export ho vynechává. V dopočtu dialogu je vypsaný číselně a jde
  přepsat ručně (§6)
- směr dělení: `horizontal` (svislé řezy, pláty vedle sebe) nebo `vertical`
- režim dělení: `count` (n) | `width` (w) | `guides`
- přelep `O ≥ 0`, režim `symmetric` | `onesided`
- přídavky `T`, `B`, `L`, `R` — každý `≥ 0`
- červená linka: zapnuto/vypnuto, název přímé barvy, tloušťka

**Mezistav** — seznam pozic řezů `c₁ < c₂ < … < c₍ₙ₋₁₎` uvnitř intervalu dělení.
Všechny tři vstupní režimy plní tutéž strukturu, takže zbytek nástroje o nich neví:

- `count`: `cᵢ = X0 + i · W / n`
- `width`: `cᵢ = X0 + i · w`, poslední plát může být kratší
- `guides`: vodítka kolmá na směr dělení (svislé = `x₁ = x₂`), na viditelných
  vrstvách, seřazená podle souřadnice, ořezaná na interval dělení a volitelně
  zaokrouhlená na zadaný krok

**Hranice plátů** — `b₀ = X0`, `bᵢ = cᵢ`, `bₙ = X1`.

**Plát i** (`0 … n−1`), pro `horizontal`:

- čistý formát: `[bᵢ, Y0, bᵢ₊₁, Y1]`
- levá hrana: `i = 0` → `−L`; jinak `symmetric` → `−O/2`, `onesided` → `0`
- pravá hrana: `i = n−1` → `+R`; jinak `symmetric` → `+O/2`, `onesided` → `+O`
- horní hrana: vždy `+T`; dolní hrana: vždy `−B`

U `onesided` nese přelep vždy **levý** plát (u `vertical` **horní**). Konstanta,
ne parametr — otočit jde jednou změnou, pokud se ukáže, že montáž to chce jinak.

Pro `vertical` platí totéž s prohozenými osami.

**Artboard plátu** = rozšířený obdélník. **Červená linka plátu** = tentýž
rozšířený obdélník, tedy MediaBox exportovaného PDF.

Opraveno 2026-09-13 po prvním běhu: původně byla linka na čistém formátu, což je
obráceně. Řez podle ní by montážní spad odřízl, a montáž ho přitom potřebuje.
Linka na vnějším rozměru znamená, že po řezu spad na plátu **zůstane**.

Dvě věci, které z toho plynou a nejsou samozřejmé:

- **Cesta leží přesně na obdélníku a tah je dvojnásobný** (od 2026-09-18, N13).
  Tah je vždy na střed cesty, takže vnější polovinu ořízne okraj stránky
  a uvnitř zůstane zadaná tloušťka. Hrana stránky tak vždycky padne do tahu.
  Původně byla cesta posunutá o půl tahu dovnitř, aby vnější okraj tahu ležel
  přesně na hraně stránky (ověřeno: desetibodová linka měla střed na `[5, 595]`
  a viditelnou hranu na `[0, 600]`) — jenže s nulovou rezervou, a v prohlížeči
  pak byla linka vidět jen na dvou hranách. Nová geometrie nepřidává závislost:
  na tom, že stránka ořízne obsah, stojí celý nástroj, protože v PDF plátu je
  celá grafika včetně sousedů (§3).
- **Tloušťka je rozměr výstupu, ne dokumentu.** Dělí se měřítkem dokumentu
  a násobí měřítkem výstupu, jinak 0,3 pt v dokumentu 1:10 vyjede jako 3 pt.
  Ověřeno ve všech čtyřech kombinacích: `printed = 0,3 pt` vždy.

**Tloušťka 1 pt jako výchozí** (0,35 mm, viditelná část). Rozhodnutí uživatele
po přetestu 2026-09-18: původních 0,3 pt, vybraných podle tiskových specifikací
(providéři garantují minimum mezi 0,25 a 1 pt, pod 0,25 pt je hairline, který
se při 300 dpi vykreslí jako jediný pixel), bylo v praxi příliš slabých.

## 4b. Vstupní stav dokumentu a přesah grafiky

Výchozí stav: **plátno je založené na rozměr čistého formátu** (u velké
grafiky v poměru 1:10) a do něj se umístí navázané PDF, které **už nese
připravený spad pro přídavky**.

Z toho plynou dvě věci, které návrh musí hlídat:

**Grafika artboard přesahuje.** Materiál pro přídavky je fyzicky k dispozici, ale
jen tolik, kolik ho nesou dodaná data. Nástroj změří skutečný přesah per
hrana z `placedItem.geometricBounds` proti `artboardRect`:

```
přesah vlevo   = artboardRect[0] − bounds[0]
přesah vpravo  = bounds[2] − artboardRect[2]
přesah nahoře  = bounds[1] − artboardRect[1]
přesah dole    = artboardRect[3] − bounds[3]
```

Ověřeno měřením (2026-09-13): navázané PDF 2000 × 1000 pt na artboardu
1800 × 800 pt vrátilo `geometricBounds = −100, 100, 1900, −900`, tedy přesah
100 pt na každé hraně. `visibleBounds` hlásí u nezamaskovaného navázaného PDF
totéž — rozdíl by nastal až u clipnuté skupiny, což v tomto workflow nevzniká.

Zadaný přídavek nesmí přesah překročit — jinak vznikne plát s prázdným okrajem,
což na monitoru vypadá jako plná plocha a pozná se až na výtisku. Dopočet
v dialogu ukazuje dostupný přesah vedle zadaného přídavku.

Přelep tenhle problém nemá: leží uvnitř grafiky, materiál je vždy k dispozici.

**Měřítko skládá dva faktory.** Nativní Large Canvas hlásí Illustrator sám přes
`scaleFactor`. Ruční zmenšení 1:N hlásit nemůže — je to uživatelský parametr.
Nástroj proto přebírá vzor `ZSM.Utils.getEffectiveSF()`, který obojí skládá a je
**jediným zdrojem pravdy** pro každý převod mezi zadanými skutečnými milimetry
a body v dokumentu.

Není to teoretická opatrnost: `zund-summa-marks` v26.4.0 měl bug, kdy `draw.js`
použil samotný `getSF()`, takže se v 1:10 workflow přepočítaly pozice značek, ale
ne jejich velikosti. Tady by se to projevilo jako pláty ve správných pozicích
s desetinásobným přelepem.

Sdílení `getEffectiveSF()` do `shared/lib/` **nenavrhuji** — `docs/decisions.md`
uzavřel kritérium „oprav jednou platí i tam" a rozšiřování sdíleného jádra bylo
opakovaně vyvráceno. Vzor se zkopíruje. Jestli to chceš jinak, je to tvoje
rozhodnutí, ne moje doporučení.

## 5. Validace

| Podmínka | Reakce |
|---|---|
| `n ≥ 2` | chyba — jeden plát není plátování |
| řezy ostře rostoucí a uvnitř grafiky | chyba |
| `O <` nejkratší plát | chyba — pláty by se překrývaly přes sebe |
| rozšířený plát ≤ šířka média | **varování**, ne chyba — médium nemusí být zadáno |
| rozšířený plát je platný artboard | chyba — zjistí se `try/catch` kolem `artboardRect`, ne porovnáním s konstantou (§3) |
| režim `guides` a žádné použitelné vodítko | chyba se srozumitelnou hláškou |
| vodítko na **skryté** vrstvě | ignorovat a nahlásit v souhrnu — uživatel ho nevidí, nemůže podle něj chtít plátovat |
| vodítko na **zamčené** viditelné vrstvě | použít; zámek brání mutaci, ne čtení |
| přídavek ≤ dostupný přesah grafiky na té hraně | chyba — plát by měl prázdný okraj (§4b) |
| v dokumentu je právě jedna umístěná grafika | chyba — export přes dočasný dokument by cokoli dalšího ztratil (§7) |
| rozšířený plát × `k` se vejde do artboardu | chyba — u volby 1:1 může velký plát mez přesáhnout |
| Large Canvas zdroj (`scaleFactor > 1`) s volbou „měřítko zdroje" | chyba — dočasný dokument Large Canvas být nemůže (§3), výstup by vyšel tiše zmenšený |

Za validací se datům věří (`~/Dev/CLAUDE.md`).

## 6. Tok a dialog

**Dvoufázový běh.** Vizuální kontrola mřížky před exportem je důvod, proč se
tohle dělá v Illustratoru a ne příkazem na PDF:

1. **Vytvořit pláty** — spočítá dělení, vytvoří artboardy, nakreslí červené
   linky **všech** plátů jako náhled. Skončí. Pláty si prohlédneš, švy můžeš
   ručně posunout. Linky sousedů leží o přelep od sebe, takže se překrývají —
   při přelepu 2 cm je to čitelné, a na export to nemá vliv.
2. **Exportovat** — druhé spuštění pláty najde podle prefixu `TE_` a nabídne
   rovnou export. Linky nakreslené ve fázi 1 jsou jen náhled; export je nepoužije
   a kreslí si vlastní v dočasném dokumentu (§7). Když chceš jiné dělení, druhá volba pláty zahodí a spočítá
   znovu z původního artboardu.

Dialog nabízí obě fáze naráz, takže jistý běh nezdržuje.

**Struktura dialogu** podle `extendscript-ui-standards`, panely shora dolů:

- **Presety**
- **Měřítko** — ruční 1:N (checkbox + hodnota), vedle něj hlášený nativní
  `scaleFactor`, ať je vidět, se kterým se počítá
- **Dělení** — směr, režim (počet / šířka / vodítka), vstup toho režimu.
  U režimu `guides` navíc krok zaokrouhlení pozic (nula = brát je, jak jsou)
- **Dopočet** — přepisuje se při každé změně: **čistý formát** (přepsatelný
  ručně), rozměr plátu čistý i rozšířený, počet plátů, **dostupný přesah per
  hrana** vedle zadaného přídavku. Varování při nevejití na médium
- **Přelep** — hodnota + přepínač symetricky / jednostranně
- **Přídavky** — čtyři pole: nahoře, dole, vlevo, vpravo
- **Linka** — zapnuto, název přímé barvy, tloušťka
- **Export** — režim vektor / rastr, **měřítko výstupu** (měřítko zdroje / 1:1),
  DPI (aktivní jen u rastru), PDF preset,
  cílová složka, vzor pojmenování s placeholdery jako v `batch-relink-export`
- **Tlačítka** — Storno vlevo, „Jen pláty", vpravo „Vytvořit a exportovat"

Po každé změně dopočtu `win.layout.layout(true)`.

## 7. Export a bezpečnost

### Export běží v dočasném dokumentu na plát

Pláty se **překrývají o přelep**, takže červená linka jednoho plátu leží uvnitř
plochy souseda. Export rozsahu artboardů by ji do souseda propsal.

Smyčka „nakresli linku, exportuj artboard, smaž linku" v původním dokumentu by
to vyřešila, ale procedurálně — spoléhá na to, že úklid proběhne. Návrh volí
**strukturální řešení**: pro každý plát vzniká dočasný dokument, kde linka
souseda neexistuje, protože tam nikdy nebyla.

Pro plát `i`:

1. dočasný dokument o rozměru rozšířeného plátu
2. navázané PDF umístěné tak, aby výřez seděl na plát (link, ne kopie)
3. červená linka plátu, přímá barva se v dočasném dokumentu vytvoří
4. rastrový režim: rasterizace **zde** — dokument se stejně zahazuje, takže
   není co chránit a odpadá duplikování obsahu
5. `saveAs` PDF
6. zavřít bez uložení

Linku kreslí **jediná funkce**, kterou volá náhled ve fázi 1 i export — dostane
dokument a obdélník čistého formátu plátu a nic víc neví. Dvě samostatné
implementace téhož by se rozešly a rozdíl by se projevil až na výtisku.

**Zdrojový dokument se při exportu vůbec nemění.** Pád uprostřed v něm nenechá
nic. Předpokladem je, že dokument obsahuje jen navázanou grafiku — validace §5.

### Měřítko výstupu

Přepínač v dialogu, faktor `k`:

- **měřítko zdroje** (`k = 1`) — dočasný dokument má doslova stejné rozměry
  v bodech, zvětšuje až RIP
- **1:1** (`k = getEffectiveSF()`) — výstup ve skutečné velikosti

Umístění grafiky v dočasném dokumentu, kde plát má v originále rozšířený
obdélník `[tx₁, ty₁, tx₂, ty₂]` a grafika bounds `[gx₁, gy₁, gx₂, gy₂]`:

```
artboard = [0, 0, (tx₂ − tx₁)·k, −(ty₁ − ty₂)·k]
pozice   = [(gx₁ − tx₁)·k, (gy₁ − ty₁)·k]
velikost = [(gx₂ − gx₁)·k, (gy₂ − gy₁)·k]
```

Protože dočasný dokument nikdy není Large Canvas (§3), musí být `k` zvoleno tak,
aby výsledek nepřesáhl mez artboardu. U Large Canvas zdroje s volbou „měřítko
zdroje" by výstup vyšel tiše zmenšený — to §5 zakazuje.

Rastrový režim rasterizuje **celý plát včetně textu a vektorových prvků**. Je to
vlastnost, ne chyba, ale musí být v dialogu řečeno.

**Přímá barva linky.** Nástroj hledá spot podle názvu z dialogu; když ho
nenajde, vytvoří ho s CMYK vzhledem 0/100/100/0. Kaskáda fallbacků podle skillu
`robust-error-handling` — stejný vzor, jakým `zund-summa-marks` řeší
`[Registration]`. Selhání vytvoření spotu je chyba s hláškou, ne tichý pád na
CMYK: linka v nesprávné barvě je horší než žádná, protože vypadá správně.
Název se ukládá do presetu, takže se zadává jednou.

Červené linky se kreslí do vlastní vrstvy `TE_lines`, kterou nástroj při startu
vyčistí bez ptaní. Když běh spadne uprostřed, další spuštění uklidí po něm.
Idempotence podle `~/Dev/CLAUDE.md`.

Převzaté vzory z `batch-relink-export`: odemčení a obnovení zamčených vrstev,
přeskočení existujících výstupů pro zotavení po pádu, souhrn na konci,
ignorování macOS systémových souborů. Guards na začátku: otevřený dokument,
neprázdný, zapisovatelná cílová složka. Try/catch kolem každé hranice DOM
a file I/O, nikdy tichý catch.

## 8. Testování

Geometrie je čistá matematika bez DOM — celá pod Node suite jako `zund-summa-marks`:

- výpočet řezů ze všech tří vstupních režimů, včetně `width` s kratším posledním plátem
- geometrie plátu: krajní plát dostane přídavek a přelep, vnitřní plát přelep
  z obou stran
- oba režimy přelepu
- přepočet měřítka: nativní `scaleFactor`, ruční `scaleN` a **jejich složení**
  — regresní test na past z `zund-summa-marks` v26.4.0
- validace přídavku proti dostupnému přesahu
- transformace do dočasného dokumentu pro obě volby `k` — že plát vyjde ve
  správné velikosti a grafika na správném offsetu
- validační pravidla z §5
- kaskáda hledání a vytvoření přímé barvy (DOM část ručně, logika výběru v testu)

Dvě property testy s `fast-check`, pro libovolné rozměry a počty plátů:

- **sjednocení čistých formátů plátů pokrývá grafiku přesně, bez děr a přesahů**
- **překryv dvou sousedních plátů je přesně zadaný přelep**

Mimo testy: rasterizace a export (vyžadují běžící Illustrator). Ověří se ručně
a naměřená čísla se zapíšou do `docs/extendscript-engine-facts.md`.

## 9. Otevřené body

| Co | Proč to musí být ověřeno |
|---|---|
| Mez artboardu u **Large Canvas** dokumentu | Změřeno jen pro `scaleFactor = 1` (§3). Praktický dopad malý, protože validace stojí na `try/catch` |

## 10. Co přijde po v1

Pořadí podle toho, jak na sobě stojí:

1. **Zünd** — regmarky (znovupoužít `zund-summa-marks`) a ořezová data pro plát.
   Uživatel vkládá tvarový ořez do extra vrstvy v přímé barvě; nástroj ho musí
   rozdělit mezi pláty.

   **Průzkum proveden 2026-09-13, opraven 2026-09-13 po chybném měření:**

   - Clipping maska je **nepoužitelná** — geometrii neořízne (§3), takže by Zünd
     dostal celou konturu včetně části mimo plát.
   - ExtendScript nemá Pathfinder v API. Panelové příkazy `Pathfinder Crop`,
     `Pathfinder Intersect`, `Pathfinder Divide` **neexistují** — vrací
     `yeKB` (1112237433).
   - Funkční cesta: vybrat konturu a **zakrývající obdélník** → `group` →
     `Live Pathfinder Subtract` → `expandStyle`. Bez seskupení se efekt
     neaplikuje. Obdélník musí být **navrchu** — Minus Front odečítá horní
     objekt od spodního.
   - Pathfinder pracuje **s plochami, ne s obrysy**. Kontura musí mít po dobu
     operace výplň; obrys se vrátí až potom.

   | případ | Subtract | Intersect |
   |---|---|---|
   | jeden tvar | ořez sedí | ořez sedí |
   | compound path s dírou | **ořez sedí, díra zůstane** | neořízne (950 místo 600) |
   | dva samostatné tvary | ořez sedí | neořízne (1400 místo 600) |

   **Odečítání je správná operace, průnik ne.** Odpovídá to tomu, jak uživatel
   dělí konturu rukama: zkopírovat celek, odečíst zakrývající obdélník, vložit
   celek zpět, odečíst další.

   ### Opravené chybné tvrzení

   Dřívější verze tohoto specu tvrdila, že Pathfinder rozbíjí compound path
   a selhává na víc tvarech. **Obojí bylo artefaktem vadného měření**, ne
   chováním Illustratoru:

   - compound path byl skládán ručně přes `compoundPathItems.add()` plus
     `moveToBeginning`, což **nevytvoří** even-odd strukturu — vizuální kontrola
     ukázala plný kruh s kružnicí navrchu, tedy žádnou díru. Správná cesta je
     vybrat cesty a zavolat `executeMenuCommand("compoundPath")`.
   - testoval se `Intersect`, ne `Subtract`.

   Poučení, které platí i mimo tenhle nástroj: **u geometrické operace nestačí
   změřit čísla, musí se na výsledek podívat.** `rightmost=600` vypadalo jako
   úspěch i tam, kde díra zmizela.

   ### Důsledek pro návrh

   Vlastní dělení cesty (clipping proti polorovině) zůstává
   **záložní variantou**, ne první volbou. Je pořád proveditelné — Bézierovy
   řídící body jdou v ExtendScriptu číst i zapisovat a cesta postavená od nuly
   má bounds identické s originálem — ale je to 300–500 řádků matematiky proti
   třem voláním `executeMenuCommand`. Sáhne se po něm, až kdyby Pathfinder
   narazil na limit, který v tomhle měření nevyšel najevo.

   Riziko `executeMenuCommand` zůstává: závisí na výběru, z-orderu a seskupení,
   což jsou stavy, které se v testu nedají zachytit jinak než spuštěním
   v Illustratoru.

   **Pozor na slovo „maska".** Výš odmítnutá maska měla **dělit konturu pro
   řezačku** — to neumí, geometrii neořízne. Maska z odsazené řezové cesty,
   která **ořezává tisk**, je naopak jádro další etapy: viz
   [návrh Zünd režimu](2026-09-13-tile-export-zund-design.md) §10.

3. **Značky a číslování plátů** — vynecháno z v1 vědomě, ne přehlédnuto.

   Sem patří i poznámka uživatele z prvního běhu: **linka na vnějším rozměru je
   zároveň cutlinka pro Zünd** u přesného ořezu na sráz. Tatáž geometrie, jiná
   role — a jiná tloušťka: pro stroj se doporučuje hairline 0,125 pt, protože ji
   čte řezačka, ne oko. Až se bude dělat Zünd, je to hotová polovina práce.
4. **Ořez obsahu mimo Illustrator** — pokud se ukáže, že rasterizace nestačí
   u vektorových grafik. Přidá externí závislost, což je u nástroje
   instalovaného copy-paste do složky skriptů provozní zátěž.
