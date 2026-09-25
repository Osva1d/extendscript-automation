# Nálezy z testu — Tile Export v1.1.0

Patří k [testovacímu plánu](2026-09-15-tile-export-test-plan.md). Běh
**2026-09-15 až 2026-09-18, dokončený**: podle hlášení uživatele vše, co není
zapsané níž, prošlo. Mimo plán zůstává tisková zkouška linky (§9 plánu)
a otevřená otázka u P1.

**Přetest po dávce oprav:** [2026-09-18-tile-export-retest.md](2026-09-18-tile-export-retest.md).

**Rozhodnutí 2026-09-18:** čekající nálezy se neopravují po jednom. Opraví se
dávkou, až bude plán dojetý celý. Důvod: oprava uprostřed běhu mění vstupy pro
testy, které ještě nejsou hotové, a část nálezů se týká stejných míst v kódu.

Číslování je stálé — na nález se odkazuj jeho číslem, i když se mezitím opraví.

**Dávka hotová 2026-09-18:** celky 1–3 opravené. **Celek 4 (N16–N19)
2026-09-25.** Otevřené zůstávají N5 (dluh), N11 (patří do etapy maska/Zünd)
a N20 (drobnost); P1 rozhodne přetest R8.1.

---

## Čeká na opravu

### N7 — export 1:1 selže, když je celá grafika větší než ~5,77 m

**Stav: opraveno v `160341a`** (dávka, celek 1). Níž původní záznam.

**Test:** T6.2b. **Druh:** vada, blokuje export. **Priorita: nejvyšší v dávce.**
Stojí první, i když byla nalezena sedmá.

**Příznak.** Pro každý plát hláška `TE_EXPORT:1:Specified value greater than
maximum allowed value`. Validace přitom prošla a tlačítko bylo aktivní — každý
plát se do artboardu vejde.

**Příčina, naměřená.** Export vkládá do dočasného dokumentu každého plátu
**celou grafiku** v měřítku výstupu a velikost jí nastavuje přes `pi.width`
a `pi.height` (`tile-export/src/export.js:115–116`). Nastavovač `.width` má strop
**16 347,7 pt ≈ 5767 mm**, nezávisle na tom, kde objekt leží; nad ním vyhodí
přesně tuhle chybu. Grafika v T6.2b měla při 1:1 **18 433 × 6 541 pt** (umístěná
navenek 6500 × 2310 mm).

**Není to jen Large Canvas.** Stejně dopadne běžný dokument v 1:10 se zdí, která
je i se spadávkou širší nebo vyšší než ~5,77 m, exportovaný v 1:1 — tedy právě
velké zakázky, kvůli kterým nástroj existuje. Validace to nechytí, protože hlídá
velikost plátu, ne grafiky. Testovací arch z §0 je v 1:1 jen 3100 mm, proto
exporty v T5 prošly.

**Oprava, ověřená sondou.** Na stejný objekt projde `pi.resize(%, %)`. V sondě:
zvětšení na 18 433 × 6 541 pt, umístění, uložení PDF plátu — MediaBox přesně
2020 × 1000 mm a vykreslený obsah správně oříznutý (pravítko, mřížka, blok
NEŘEZAT, spadávka na svém místě). Strop se týká jen nastavovače, ne velikosti
objektu.

**Ověřeno, že maska plátu to NEvyřeší** (dotaz 2026-09-18, sonda na stejném
PDF). (A) Maska kolem plátu a velikost nastavená grafice jako dnes → stejná
chyba: maska jen skryje, co je mimo plát, grafika uvnitř má plnou velikost.
(B) Velikost nastavená celé maskované skupině → skupina hlásí šířku celého
obsahu (879 pt), ne masky (293 pt), takže zvětší podle grafiky, ne podle plátu;
správné zvětšení by znamenalo nastavit ji na 18 459 pt, tedy zase přes strop.
Cestou je jen `resize()` — funguje na grafiku i na maskovanou skupinu, takže
s maskami z další etapy se oprava nevylučuje.

**Nezměřeno:** kde má `resize()` horní mez. Sonda šla do 18 433 pt; zeď 20 m
v 1:1 by měla 56 693 pt. Při opravě doměřit. Kdyby mez existovala, patří do
validace kontrola velikosti **celé grafiky** s čitelnou hláškou — dnes uživatel
dostane surové `TE_EXPORT:…` až po kliknutí na export.

**Souvislosti:** N1 na N7 závisí (viz tam). Ořez kontury v `cut.js` velikost
nenastavuje, ale při opravě projít i cestu Zünd režimu.

---

### N1 — „Stejné jako dokument" u Large Canvasu znamená něco jiného, než slibuje

**Stav: opraveno v `160341a`** (dávka, celek 1). Níž původní záznam.

**Test:** T6.2. **Druh:** návrhová vada, ne chyba výpočtu. **Nahlášeno** jako
bod k úvaze, ne jako chyba — ale rozbor ukázal, že kód nedělá, co říká vlastní
nápověda.

**Příznak.** Dokument 6000 × 1000 mm (Illustrator ho sám založí jako Large
Canvas, faktor 10), ruční měřítko vypnuté — tedy dokument v 1:1. Volba výstupu
„Stejné jako dokument" skončí chybou, volba „1:1 skutečná velikost" projde.
Z pohledu uživatele jsou obě totéž.

**Příčina.** „Stejné jako dokument" v kódu znamená *vnitřní souřadnice
dokumentu* (`k = 1`). Large Canvas je vnitřně desetkrát zmenšený a navenek
ukazovaný ve skutečné velikosti, takže tahle volba míří na velikost, kterou
uživatel nikde nevidí — a kterou ani nejde vyexportovat, protože dočasný dokument
nikdy není Large Canvas. Nápověda přitom slibuje „nechá plátno 1:10 v 1:10",
tedy *zachová měřítko, ve kterém se kreslilo*.

Kořen: pod slovem „měřítko dokumentu" jsou dvě různé věci. **Faktor Large
Canvas** je vnitřnost Illustratoru, na pravítkách vidět není. **Ruční 1:N** je
konvence uživatele. Měřítkem dokumentu v uživatelově smyslu je jen to druhé.

**Návrh opravy.** „Stejné jako dokument" = *co ukazují pravítka*: výstup ve
zdrojovém měřítku bere faktor Large Canvas místo jedničky.

| dokument | Stejné jako dokument | 1:1 skutečná velikost |
|---|---|---|
| běžný v 1:10 (testovací arch) | beze změny — 1:10 | beze změny |
| Large Canvas, ruční vypnuto | dnes chyba → skutečná velikost, totéž co 1:1 | beze změny |
| Large Canvas + ruční 1:10 | dnes chyba → náhled 1:10, plát 2002 mm | beze změny — 20 m se nevejde |

Nic se neztratí: staré chování u Large Canvasu nikdy nic nevyexportovalo.

**Závisí na N7.** Bez něj by oprava jen vyměnila jednu chybu za druhou: „Stejné
jako dokument" u Large Canvasu by vkládalo grafiku desetkrát zvětšenou (6500 mm)
a narazilo na stejný strop jako T6.2b. Pořadí v dávce: nejdřív N7, pak N1.

**Kde:**
- `tile-export/src/export.js:17` — `outputScale()`: pro `"source"` vracet
  `TE.Utils.getSF()` místo `1`.
- `tile-export/src/lib/validation.js:61` — **duplicitní kopie téhož pravidla**
  pro kontrolu velikosti artboardu. Sjednotit s `outputScale()` (nejspíš
  přesunout do `TE.Utils`, protože `validation.js` se builduje před `export.js`),
  jinak by validace kontrolovala jiný rozměr, než jaký se vyexportuje.
- `tile-export/src/lib/validation.js:50` — pravidlo `ERR_LARGE_CANVAS` bude
  nedosažitelné; odstranit i s řetězci v `locale.js:30` a `:165`.
- `tile-export/src/locale.js:98` a `:233` — `TIP_EXPORT_SCALE` přeformulovat
  na „co ukazují pravítka".

**Testy ke změně:** `test_export_transform.js:62` (očekává `1` pro `"source"`
— zůstane pravdou jen pro běžný dokument; doplnit případ s `scaleFactor 10`),
`test_validation.js:101` (případ `jLC` testuje chybu, která zmizí).

**Plán ke změně:** T6.2a a T6.3a v §6 — obě dnes čekají chybu Large Canvas;
po opravě T6.2a projde se stejným výsledkem jako T6.2b a T6.3a vyexportuje
náhled 1:10 (plát 2002 × 1000 mm).

**Pozor na:** Zünd režim (dnes skrytý) počítá značky přes `tf.k` — při opravě
ověřit, že náhled 1:N nekreslí značky ve špatném měřítku. Týká se až další etapy.

---

### N2 — neplatná šířka plátu hlásí cizí chybu

**Stav: opraveno v `a52aab8`** (dávka, celek 3). Obě cesty mají vlastní text; strop
pod přelepem hází vlastní kód `TE_CEILING_OVERLAP`. `ERR_CUTS_ORDER` tím ztratil
jediné použití a zmizel. Hlídá `test_grid_cuts` a `test_ui_summary`. Níž původní záznam.

**Test:** T8.3. **Kde:** `tile-export/src/ui.js:691`, `describeError()`.

`TE_BAD_WIDTH` nemá vlastní text a mapuje se na `ERR_CUTS_ORDER`, takže šířka
0 nebo nesmysl hlásí „Pozice řezů musí být vzestupné a uvnitř grafiky". Od
přepínače Rovnoměrně k té chybě vede druhá cesta: **strop šířky menší nebo rovný
přelepu** — tam je cizí hláška obzvlášť matoucí.

**Oprava:** vlastní řetězec `ERR_BAD_WIDTH` (EN i CS), ideálně rozlišit oba
případy — „šířka musí být kladné číslo" a „strop musí být větší než přelep".

---

### N3 — název hrany v české hlášce je anglicky

**Stav: opraveno v `a52aab8`** (dávka, celek 3). Hlídá `test_ui_summary` pro všechny
čtyři hrany. Níž původní záznam.

**Test:** T8.5. **Kde:** `tile-export/src/lib/validation.js:32–35` předává
`"left"`, `"right"`, `"top"`, `"bottom"` přímo do `ERR_ADD_OVERHANG`.

Výsledek: „Přídavek **left** (60 mm) překračuje přesah grafiky na té hraně".

**Oprava:** názvy hran jako lokalizované řetězce (`EDGE_LEFT` … — česky
„vlevo", „vpravo", „nahoře", „dole"), a větu přeformulovat tak, aby s nimi
gramaticky seděla: „Přídavek vlevo (60 mm) překračuje přesah grafiky (50 mm)."

---

### N4 — souhrnné hlášky: číslovky a „nahrazeno"

**Stav: opraveno v `a8ae9d1`** (dávka, celek 3). Tvar „Počet …: N", který sedí na
jakékoli číslo. Stejnou vadu měla i hláška o vodítkách na skrytých vrstvách
(`WARN_GUIDE_HIDDEN`), opraveno s ní. Níž původní záznam.

**Test:** T4.5. **Kde:** `tile-export/src/locale.js:171–173`,
`tile-export/src/main.js:113`, `:165`, `:166`.

1. **Čeština se s dosazeným číslem neshoduje.** „Vytvořeno %s plátů",
   „Exportováno %s plátů do %s", „%s plátů přeskočeno" jsou správně jen pro
   5 a víc; pro 2–4 má být „vytvořeny 3 pláty", pro 1 „vytvořen 1 plát".
   Bezpečné znění pro jakékoli číslo: „Počet vytvořených plátů: 3".
2. **Hlášení po opakovaném běhu neříká, že něco nahradilo.** Každý běh smaže
   svoje staré artboardy a postaví nové, takže „vytvořeno 3" je pravda — ale
   čte se jako „přibyly další tři". `TE.Draw.removeTileArtboards()` počet
   smazaných vrací, jen se nepoužije. Např. „Počet plátů: 3 (předchozí nahrazeny)".

---

### N5 — (volitelné) po načtení předvolby jsou desetiny s tečkou

**Test:** T7.4. **Kde:** `tile-export/src/ui.js:642`, `:659` a ostatní řádky
`apply()` — `String(číslo)` zapíše `0.3`.

Hodnota je správně a nástroj od opravy desetinné čárky čte čárku i tečku, takže
jde jen o vzhled. Oprava by byla `String(v).replace(".", TE.L.DECIMAL)` ve všech
číselných polích.

**Odloženo jako dluh (2026-09-18).** Uživateli je to jedno; rozhodnuto nechat
mimo dávku, protože jde čistě o vzhled a každá změna navíc rozšiřuje přetest.
Udělat, až se bude do `apply()` sahat z jiného důvodu — ne jako samostatný úklid.

---

### N6 — chybová hláška u Large Canvasu radí cestu, která nevede ven

**Stav: opraveno v `160341a`** (dávka, celek 1). Níž původní záznam.

**Test:** T6.3. **Kde:** `tile-export/src/locale.js:30` a `:165`
(`ERR_LARGE_CANVAS`), `:164` (`ERR_AB_TOO_BIG`).

**Příznak.** T6.3a (Large Canvas + ruční 1:10, výstup Stejné jako dokument)
hlásí „…Použij výstup 1:1." Kdo radu poslechne (T6.3b), dostane jinou chybu:
„Plát se při tomto měřítku výstupu nevejde do artboardu Illustratoru." Obě cesty
jsou zavřené a hláška poslala uživatele z jedné do druhé.

**Příčina.** Rada v `ERR_LARGE_CANVAS` je bezpodmínečná — neověřuje, jestli se
plát v 1:1 vejde. Při složeném měřítku (× 10 × 10 = × 100) má plát 20 × 10 m,
a to je přes strop artboardu, který nástroj hlídá (16 200 pt, asi 5715 mm na
stranu).

**Druhý případ, kde rada selže** (hlášeno z T7.3, 2026-09-18). I u obyčejného
Large Canvasu bez ručního měřítka: dokument 6000 mm s grafikou přes celou šířku.
Po přepnutí na 1:1 dialog projde, ale export pak spadne na N7, protože grafika
je v 1:1 přes 5,77 m. Rada „Použij výstup 1:1" tak vede do slepé uličky i tady,
jen ji uživatel odhalí až po kliknutí na export.

**Řešení: vyřeší ho N1 spolu s N7.** Oprava N1 pravidlo `ERR_LARGE_CANVAS` i s hláškou
odstraní a T6.3a pak vyexportuje náhled 1:10 (plát 2002 mm). Zapsané zvlášť pro
případ, že by se N1 nepřijala — pak by rada musela být podmíněná: nabízet 1:1
jen tehdy, když se plát vejde, jinak říct, že neprojde ani jedno měřítko a proč.

**Související — `ERR_AB_TOO_BIG` neříká, co je moc velké.** Neuvádí rozměr ani
strop, takže uživatel neví, jestli pomůže víc plátů. V T6.3b nepomůže: přetéká
**výška** 10 m, a tu vodorovné dělení nezmenší. Lepší znění: „Plát
20 020 × 10 000 mm je větší než artboard Illustratoru (nejvýš 5715 mm na stranu)."
Tohle se týká i běžných dokumentů, takže to N1 nevyřeší — opravit spolu s ním.

---

### N10 — linka u Large Canvasu desetkrát tlustší

**Stav: opraveno v `160341a`** spolu s N7. **Nalezeno** při opravě N7, ne testem.

`TE.Draw.drawTileLine` počítal tloušťku linky z měřítka `app.activeDocument`.
Při exportu je aktivní dočasný dokument, který nikdy není Large Canvas, takže
plát z Large Canvasu v 1:1 dostal místo 0,3 pt linku **3 pt**. Vada byla skrytá:
export z Large Canvasu vždycky spadl dřív na N7, a oprava N7 by ji odkryla.

Opraveno tak, že se měřítko linky předává (`TE.Utils.outputLineScale`) a export
aktivní dokument nečte vůbec. Test hlídá zdroják `exportTile` i `drawTileLine`,
aby se čtení aktivního dokumentu nevrátilo. Ověřeno exportem z Large Canvasu:
linka 0,3 pt.

---

### N11 — Zünd: značky se měří podle aktivního dokumentu

**Test:** žádný — Zünd režim je v dialogu skrytý. **Nalezeno** čtením kódu při
opravě N10; **neměřeno**. **Kde:** `shared/lib/cut_marks.js:40`
(`NS.Utils.getEffectiveSF(s)` v `calculateAll`), `tile-export/src/draw.js:258`
(`TE.Utils.toDoc` v `drawMarks`).

Stejná třída vady jako N10. Obojí se volá uvnitř `exportTile` až po založení
dočasného dokumentu, takže měřítko čte z něj. Podle kódu: dokument kreslený
v 1:N (N > 1) exportovaný v 1:1 by dostal značky, mezery i rozestupy **N× menší**
— dočasný dokument je ve skutečné velikosti, ale milimetry se v něm dělí N.
Ve „Stejné jako dokument" a u dokumentů kreslených 1:1 vycházejí správně.

**Kdy opravit:** v etapě, která Zünd režim zpřístupní (spolu s maskou) — ta cesta
se bude předělávat tak jako tak. Směr stejný jako u N10: předat měřítko
dočasného dokumentu výslovně, nečíst aktivní dokument. Nejdřív změřit.

---

### N12 — texty o lince: jeden zastaralý, jeden neúplný

**Stav: opraveno v `4b5e764`** (dávka, celek 3), podle N13. Níž původní záznam.

**Test:** přetest R2.1 (2026-09-18). **Druh:** texty, patří do celku 3.

**Příznak.** V dialogu je tloušťka linky 0,3 pt, ale v testovacím archu 1:10 se
nakreslila 0,03 pt. Chování je správné — pole je tloušťka **v tisku** a panel
Tah ukazuje tloušťku v měřítku dokumentu, tedy v 1:10 desetinu. Dialog to ale
nikde neříká, takže to vypadá jako chyba.

Při hledání jsem narazil na horší věc: nápověda k lince **tvrdí nepravdu**.

1. `TIP_LINE` (`tile-export/src/locale.js:110`, `:244`): „Červená linka po
   obvodu **čistého formátu** plátu…" Linka ale leží na **vnějším** rozměru
   plátu, na MediaBoxu — přesně podle zadání z v1, aby po ořezu zůstal montážní
   spad. Text přežil z doby před tou opravou.
2. `tile-export/README.md:156`: totéž — „se kreslí po obvodu čistého formátu".
3. `TIP_LINE_WIDTH` (`locale.js:114`, `:248`): „Tloušťka tahu ořezové linky
   v bodech." — neříká, že jde o tloušťku v tisku, ani že v dokumentu 1:N se
   nakreslí N× tenčí.

**Oprava.** `TIP_LINE`: linka po obvodu tiskového plátu, vnější hranou přesně na
jeho okraji. `TIP_LINE_WIDTH`: tloušťka v tisku; v dokumentu 1:N se nakreslí
N× tenčí (při 1:10 ukáže panel Tah 0,03 pt) a po zvětšení vyjde zadaná. README
opravit stejně. Ověřit, že spec (`docs/specs/2026-09-13-tile-export-design.md`)
to má správně.

**Pozor na N13** — ten mění, kde linka leží a co ukáže panel Tah. Texty N12
psát až podle něj.

---

### N13 — linka vystředěná na hraně, dvojnásobný tah, výchozí 1 pt

**Stav: hotovo v `bb777c2`** (dávka, celek 3). Ověřeno na produkčním `exportTile`,
zeď 6 × 1 m v 1:10: v PDF jeden obdélník přesně na hranách MediaBoxu, tah 2 pt
(0,2 pt v 1:10), Illustrator ho navíc sám obalí ořezem artboardu. Poppler při
600 dpi: vidět 0,96–1,04 pt na všech čtyřech hranách, v 1:10 0,1 pt. **V rastru
je linka schovaná pod obrazem → N19** — dřívější tvrzení „v rastru 300 dpi taky
1 pt" bylo falešné měření, viz tam. Níž původní záznam.

**Test:** přetest, znovu P1 (2026-09-18). **Druh:** změna zadání — návrh
uživatele. Patří do celku 3 spolu s N12, protože mění i texty.

**Návrh.** Neposouvat obdélník linky dovnitř, nechat ho přesně na hraně plátu
a tah zdvojnásobit. Vnější polovina padne za hranu stránky, vnitřní zůstane
v motivu. Viditelná linka v tisku alespoň 1 pt, tedy tah 2 pt.

**Co garantuje dnešek a co návrh.** Dnes (spec §4, „Tah je posunutý dovnitř
o svou polovinu") leží vnější hrana tahu přesně na MediaBoxu, celý tah je vidět
a viditelná tloušťka se rovná zadané **v každém režimu**. Návrh garantuje, že
cesta leží přesně na hraně plátu a hrana stránky padne **vždy dovnitř tahu**.
Viditelná tloušťka se rovná zadané **jen tam, kde tah ořízne hrana stránky**.

**Proč ano.**
- **Tolerance.** Dnes se hrana tahu a hrana stránky potkávají s nulovou rezervou.
  Posun o zlomek bodu při vykreslení, v RIPu nebo při řezu kus linky uřízne,
  nebo mezi ní a hranou nechá bílou škvíru. Tah přes hranu je princip spadávky:
  hrana stránky do něj padne vždy. Asymetrie z P1 může být právě tohle —
  prohlížeč zaokrouhlí hranu stránky a obsah na pixely každou jinak. **Neověřeno**,
  tvůj prohlížeč nemám.
- **Viditelnost.** 1 pt místo 0,3 pt, v náhledu 1:10 0,1 místo 0,03 pt. To P1
  nejspíš odstraní bez ohledu na příčinu.
- **Žádná nová závislost.** Nástroj už dnes spoléhá, že stránka ořízne obsah —
  v PDF plátu je celá grafika včetně sousedů (engine facts, „Illustrator
  neořezává obsah. Nikdy."). Vnější polovina linky je na tom stejně jako
  grafika souseda.
- **Jednodušší kód** — odpadne zmenšování obdélníku.

**Zünd režim** (upřesnění uživatele 2026-09-18). Linka se tam **netiskne**,
slouží jako řezová. Zvětšený artboard (`export.js`, `geo.ab`) jí proto nevadí.
N13 tam naopak pomáhá: cesta poleží přesně na hraně plátu, tedy tam, kde má
řezat stroj — dnes je o půl tahu uvnitř. Tisk v Zünd režimu ohraničí **ořezová
maska z odsazené cesty** této linky; to je zadání etapy maska/Zünd (návrh Zünd režimu §10).
Dřívější návrh tohoto záznamu „linku dát dovnitř masky" byl chybný — řezová
linka musí zůstat celá a samostatná.

**PDF předvolba se spadávkou:** vnější polovina linky se objeví ve spadávce,
spolu s grafikou souseda. Ověřit na předvolbách, které používáš.

**Význam pole Tloušťka se nemění** — dál je to tloušťka viditelná v tisku,
kreslí se dvojnásobná (v 1:N 2/N). Staré předvolby s 0,3 pt tak dál tisknou
0,3 pt. Panel Tah ale ukáže dvojnásobek, a to musí říct nápověda (N12).

**Kde:** `tile-export/src/draw.js:85–103` (`drawTileLine` — bez zmenšení,
tah × 2; náhradní `|| 0.3` na `:87`), `src/config.js:83–86` (výchozí 1 pt,
komentář s důvodem), `src/ui.js:604` (náhradní `|| 0.3`), texty N12, spec §4
(„Tah je posunutý dovnitř…", „Tloušťka 0,3 pt jako výchozí"), engine facts
„Tah je vždy na střed cesty" (poslední odstavec o `drawTileLine`),
`tests/test_export_transform.js`. Plán: §0 a T4.2–T4.3; přetest: R2.3, řádky
s linkou v R3–R5, R8.2 (tisková zkouška teď s 1 pt).

**Ověřit po opravě** sondou jako u N7: tah 2 pt se středem na hraně MediaBoxu,
Poppler vykreslí 1 pt na všech čtyřech hranách. Totéž v 1:10 (tah 0,2 pt,
vidět 0,1 pt).

---

### N8 — předvolba nedá najevo, že se změnila, a nejde vrátit

**Stav: opraveno v `0919ded`** (dávka, celek 2). Ověřeno sondou na skutečném
dialogu z uživatelova nastavení, se zápisem na disk nahrazeným atrapou:
otevření ukáže „[Default] *", ↺ vrátí uložené hodnoty, přepnutí na TEST
nenechá hvězdičku u minulé položky, úprava dá „TEST *", Uložit zapíše. Dialog
beze změny rozměru, 1178 × 825 px.

**Nalezeno při opravě:** uložení a smazání předvolby šlo na disk až
s dokončeným během, takže předvolbu uloženou v dialogu Storno zahodilo. Oba
sourozenecké nástroje zapisují hned — tile-export teď taky. A `apply()` nechával
u uloženého názvu, který seznam nemá (`""` v [Default]), výběr z minula; stejná
předvolba tak vypadala pokaždé jinak a hvězdička by nešla spočítat. Srovnáno se
stavbou dialogu: první položka.

Níž původní záznam.

**Test:** T7.4. **Kde:** `tile-export/src/ui.js:514–545` (sestavení seznamu
a `ddPreset.onChange`), `:152–155` (řádek předvoleb).

**Příznak.** Po uložení předvolby a změně hodnot zůstane v seznamu její jméno
beze změny — nic neukáže, že se hodnoty od uložených liší. Znovuvybrání téže
položky nic neudělá. Jediná cesta k uloženým hodnotám: vybrat Default a pak zase
předvolbu.

**Příčina.** ScriptUI spouští `onChange` jen při *změně* výběru; znovuvybrání
vybrané položky změnou není. Tile-export si seznam staví ručně jen ze jmen a
změnu nikdy neoznačí. Přitom sdílené jádro má všechno hotové:
`shared/lib/ui_state.js` — `isModified()` pozná rozdíl, `formatPresetList()`
přidá k aktivní předvolbě ` *`. Zünd Summa Marks to používá celé
(`zund-summa-marks/src/ui.js:765–830`): hvězdička, tlačítko **↺** pro vrácení
a **Uložit**, obojí aktivní jen když je co ukládat nebo vracet. Tile-export má
navíc řetězec `BTN_SAVE` („Uložit", `locale.js:142`, `:277`), ale tlačítko, které
by ho používalo, nikdy nevzniklo.

**Druhý projev** (hlášeno z T7.5). Po otevření dialogu seznam ukazuje aktivní
předvolbu — třeba „[Default]" — zatímco pole se naplní z `[Last Settings]`,
tedy z posledního potvrzeného běhu. Nápis tak tvrdí „výchozí" nad hodnotami,
které výchozí nejsou, a uživatel to přečte jako „načetl default". Ověřeno na
`settings.json` (2026-09-18 12:13): `activePreset` `[Default]`, `[Last Settings]`
s jednostranným přelepem, výstupem 1:1 a vypnutým ručním měřítkem. S hvězdičkou
by seznam hned po otevření ukázal „[Default] *".

Samotné zahazování úprav při Zrušit vada **není** — odpovídá vzoru v
`docs/persistence.md` §3.2 i oběma sourozeneckým nástrojům.

**Oprava.** Převzít vzor ze ZSM: seznam přes `formatPresetList()`, obnovu
hvězdičky zavěsit na stávající `refresh` při každé změně pole, přidat **↺**
(standard dialogů ho jako jediný povolený znak připouští, s `helpTip`) a
**Uložit** pro přepsání aktivní předvolby (u [Default] neaktivní). Obě tlačítka
přibudou do stávajícího řádku předvoleb, takže jde o šířku, ne výšku — přesto
po úpravě změřit dialog.

---

### N9 — tlačítko Zrušit místo Storno

**Stav: opraveno v `05a7366`** (dávka, celek 2).

**Nalezeno** při ověřování standardu pro N8, ne testem. **Kde:**
`tile-export/src/locale.js:286`.

Standard dialogů (`extendscript-ui-standards`, slovník tlačítek i kontrolní
seznam „Storno = Cancel") a Zünd Summa Marks používají **Storno**; tile-export
**Zrušit**. Jeden řetězec.

---

### N14 — dialog otevře „Půl na každou stranu" jako „Celý na levý" a „Šířku" jako „Vodítka"

**Stav: opraveno v `830ef43`** (dávka, celek 2). Sonda po opravě: všech šest
uložených hodnot se otevře i vrátí správně. Místo `no-nested-ternary` vlastní
pravidlo lintu `engine/no-bare-nested-ternary`: vestavěné by hlásilo i devět
správných závorkovaných tvarů v `grid.js` a sdíleném `ui_state.js`. Změřeno
navíc: ternár vnořený bez závorek do **první** větve engine vůbec nezparsuje.

Níž původní záznam.

**Test:** přetest R4.1 → R4.2 (2026-09-18). **Kde:** `tile-export/src/ui.js:201`
(řádek Dělit podle) a `:233` (Umístění přelepu). **Patří do celku 2.**

**Příznak.** „Při každém novém běhu je umístění přelepu nastaveno na Celý na
levý", přestože minulý běh jel s „Půl na každou stranu". `settings.json` má
v `[Last Settings]` správně `symmetric`.

**Příčina je v enginu, ne v logice.** ExtendScript vyhodnocuje řetězený
ternární operátor **zleva**: `a ? 0 : b ? 2 : 1` počítá jako
`(a ? 0 : b) ? 2 : 1`. Pro `symmetric` tak vyjde index 1 místo 0. Naměřeno
2026-09-18 (engine facts → Syntaxe). Node počítá podle specifikace, takže testy
v Node tuhle vadu vidět nemůžou.

Sonda na skutečném `buildDialog`, pro každou uloženou hodnotu:

| uloženo | dialog ukáže | nepovšimnutý další běh uloží |
|---|---|---|
| Půl na každou stranu | **Celý na levý** | jednostranný, levý |
| Celý na levý | Celý na levý | ✓ |
| Celý na pravý | Celý na pravý | ✓ |
| Počet | Počet | ✓ |
| **Šířka** | **Vodítka** | vodítka |
| Vodítka | Vodítka | ✓ |

Řádek Šířka → Vodítka nikdo nehlásil, našel ho audit. Načtení předvolby
(`apply()`) je v pořádku, protože nastavuje každý přepínač zvlášť. Proto šlo
nastavení spravit přes předvolbu TEST a vada se vracela jen při novém otevření.

**Audit** parserem (espree) přes všech 39 zdrojů všech čtyř nástrojů
a `shared/lib`: nezávorkovaný řetězený ternár je jen tady (2×) a v
`shared/lib/json2.js:66`, `:87`. V json2 je neškodný — prázdné `[]` a `{}`
zapíše jako `[\n\n]` a `{\n\n}`, což je platný JSON a načte se zpátky správně
(změřeno).

**Oprava.** Oba indexy přepsat bez řetězení. Protože Node to nevidí a próza
se tu snadno přehlédne, potřebuje to mechanismus: pravidlo ESLint
`no-nested-ternary` pro `*/src/**` (json2 je cizí kód, výjimka). Po opravě
zopakovat sondu pro všech šest hodnot.

---

### N15 — texty, které přežily změnu návrhu

**Stav: opraveno v `4b5e764`** (dávka, celek 3).

**Nalezeno** při psaní celku 2, ne testem. **Druh:** texty, patří do celku 3.

1. **„Rozpustit zbytek"** — mezistupeň návrhu, ze kterého se stal přepínač
   Rovnoměrně pro **oba** číselné režimy. Zůstal ve třech textech:
   - `TIP_COUNT` (`tile-export/src/locale.js:66`, `:207`): stejné tiskové
     pláty prý dá jen „režim šířky plátu se zaškrtnutým rozpuštěním zbytku".
     Dnes je dá i počet plátů se zaškrtnutým Rovnoměrně.
   - `CHANGELOG.md` 1.1.0, Changed, odstavec o režimu počtu plátů: „Stejné
     tiskové pláty umí od této verze „šířka plátu" + „rozpustit zbytek"…" —
     v rozporu s odstavcem Added o Rovnoměrně o kus výš.
   - `CHANGELOG.md` 1.1.0, Fixed, odstavec o nápovědě u šířky plátu: text prý
     „odkazuje na „rozpustit zbytek"".
2. **`TIP_PDF_PRESET`** (`locale.js:101`, `:242`): „Prázdné použije vestavěný
   výchozí." Pole je seznam presetů Illustratoru, prázdné zvolit nejde.
3. **Tlačítko Jen pláty má nápovědu o lince** (`ui.js:452`,
   `btnTiles.helpTip = l.TIP_LINE`), ne o tom, co dělá. Standard dialogů chce
   u každého tlačítka kromě OK a Storno nápovědu, která akci pojmenuje.

---

### N16 — dialog neukáže, co udělá měřítko výstupu

**Stav: hotovo v `619ffbc`** (dávka, celek 4). Řádek „Stránky PDF (1:N): …", u 1:1
„skutečná velikost, stejná jako s přídavky". Níž původní záznam.

**Test:** přetest R3.1 (2026-09-18). **Druh:** návrh, ne vada. **Kde:**
`tile-export/src/ui.js`, `refresh()` — souhrn převádí body dokumentu na
skutečné milimetry (`fromDoc`) a měřítko výstupu nepoužije; `TE.Utils.outputScale`
volá jen validace (`src/lib/validation.js:59`).

**Pozorování.** Výsledek u R3.1 (Stejné jako dokument) je stejný jako u R3.2
(1:1). To je podle návrhu: souhrn popisuje pláty jako fyzické kusy ve
skutečných milimetrech a ty na měřítku výstupu nezávisí. Měřítko výstupu mění
jen stránku PDF — u testovacího archu 101 \| 102 \| 101 × 100 mm proti
1010 \| 1020 \| 1010 × 1000 mm.

**Proč to přesto zapsat.** Dialog nikde neukáže, jak velké PDF vyjdou; volba se
projeví až po exportu. Na stejném slepém místě vznikl zmatek kolem N1 a N6.

**Návrh.** Jeden řádek ve Výsledku, třeba „Stránky PDF (1:10): 101 × 100 \|
102 × 100 \| 101 × 100 mm". Poměr je efektivní měřítko dokumentu děleno
měřítkem výstupu (`getEffectiveSF(s) / outputScale(s, sf)`), rozměr rozšířený
obdélník plátu krát `outputScale`. Validace ten rozměr už počítá pro kontrolu
artboardu, takže jde o zobrazení, ne o nový výpočet. Opravit po přetestu.

**Doplněno 2026-09-18 (uživatel, s otiskem dialogu):** chce i vysvětlení, že
měřítko výstupu platí jen pro export. Řádek „Stránky PDF (1:10): …" to ukáže
sám a řekne víc než text. K němu jedna věta do `TIP_EXPORT_SCALE`: „Týká se jen
exportovaných PDF — Jen pláty kreslí v měřítku dokumentu a Výsledek ukazuje
pláty ve skutečné velikosti." Statický text v dialogu ne: přidal by výšku
i šum.

---

### N17 — kontrola velikosti výstupu zašedí i Jen pláty

**Stav: opraveno v `66a6f40`** (dávka, celek 4). Validace vrací chybu velikosti
zvlášť (`exportErrors`). Ověřeno harnessem: v R4.4 Jen pláty aktivní a vytvoří
3 pláty. Níž původní záznam.

**Test:** dotaz k přetestu (2026-09-18), týká se R4.4. **Druh:** vada, drobná.
**Kde:** `tile-export/src/ui.js:914–915` (obě tlačítka z jednoho `ok`),
`src/lib/validation.js:54–71` (`ERR_AB_TOO_BIG` měří plát v měřítku výstupu).

Jen pláty měřítko výstupu nepoužívá: artboardy a linky vznikají v dokumentu
v jeho vlastním měřítku (`main.js`, fáze 1; tloušťka linky přes
`getEffectiveSF`). Kontrola „plát se vejde do artboardu v měřítku výstupu" je
ale chyba, a chyba zašedí obě tlačítka. V R4.4 (Large Canvas, ruční 1:10,
výstup 1:1, plát 20 m) je tak šedé i Jen pláty, přestože pláty v dokumentu
(2002 mm) by vznikly bez potíží. Omezení, které se týká jen exportu, blokuje
akci, která nic neexportuje.

**Oprava.** Tahle chyba ať zašedí jen Vytvořit a exportovat; hláška zůstane ve
Výsledku, aby bylo vidět proč. Validace ji vrátí zvlášť (třeba `exportErrors`)
a `refresh` podle ní vypne jen export. Přetest R4.4: export šedý, Jen pláty
aktivní. Opravit po přetestu.

---

### N19 — v rastrovém exportu je linka schovaná pod rastrem

**Stav: opraveno v `dd14cc7`** (dávka, celek 4). Ověřeno: PDF kreslí linku až po
obrazu, render rohů při 300 dpi bez varování Poppleru ukazuje linku navrchu.
Níž původní záznam.

**Test:** přetest R3.3, spuštěný harnessem (2026-09-18). **Druh:** vada, starší
než dávka — linku v rastrovém režimu nikdo neověřoval. **Kde:**
`tile-export/src/export.js`, blok `if (s.exportMode === "raster")`.

**Příznak.** Rastrový plát má správný rozměr a jeden obraz (5965 × 5906 px při
150 dpi, tedy 1010 × 1000 mm), ale červená linka na něm není vidět. V PDF je
jako vektor s tahem 2 pt přesně na MediaBoxu, jenže **vykreslená před
obrazem**, a neprůhledný rastr ji zakryje.

**Příčina, naměřená.** Smyčka
`for (i = tmp.pageItems.length - 1; i >= 0; i--) { … moveToEnd(all) }` prochází
živou kolekci, kterou sama mění. Na syntetickém dokumentu (grafika a nad ní
linka) skončila ve skupině **jen grafika**. Linka zůstala venku
a `rasterize()` položil obraz nad ni. Komentář v kódu „Note this rasterises the
trim line too" i README („rasterizuje … i ořezovou linku") tak neplatí.

**Návrh opravy.** Rastrovat jen grafiku (`tmp.rasterize(pi, …)`) a linku
nechat vektorem **nad** rastrem. Zůstane ostrá a přesná — 1 pt při 150 dpi by
byly dva rozmazané pixely — a odpadne křehká smyčka. Totéž pro značky Zündu.
Test: pořadí v PDF (linka až po obrazu) a render nejvýš 300 dpi bez varování
Poppleru.

**Oprava mého tvrzení u N13.** „V rastru 300 dpi taky 1 pt" bylo falešné
měření: Poppler při 600 dpi obraz nevykreslil („Bogus memory allocation size")
a prosvitla vektorová linka pod ním. Na výsledek jsem se nepodíval.

---

### N18 — Výsledek do prázdného místa v pravém sloupci

**Stav: hotovo v `ae7d81d`** (dávka, celek 4). Dialog 1178 × 695 px (dřív 825), pole
474 × 277 px. Pravý sloupec potřeboval vlastní `alignment` fill a pole pevnou
`preferredSize` — jinak se `edittext` roztáhne podle textu (12 plátů: 932 px).
**Neověřeno:** zalomení dlouhé hlášky (R4.4) — zvenku nejde vidět. Níž původní
záznam.

**Návrh uživatele** (2026-09-18, otisk dialogu). **Druh:** rozvržení dialogu.
**Kde:** `tile-export/src/ui.js`, panel Výsledek (`pCalc`, `stCalc`), dnes přes
oba sloupce dole.

**Proč.** Se skrytým Zünd panelem zůstává v pravém sloupci pod Exportem prázdné
místo, zatímco Výsledek je dole stažený na 85 px. Na otisku je v něm pět řádků
a šestý („Dostupný spad…") je uříznutý.

**Změřeno 2026-09-18** (dialog sestavený bez zobrazení): dialog 1178 × 825 px,
levý sloupec 630 × 593, pravý 508 × 276 (jen Export), **pod Exportem volných
317 px**. Výsledek dnes 1148 × 115, pole 1114 × 85. Šířka textu: řádek plátu
s desetinami 370 px, navrhovaný řádek N16 354 px, nejdelší chybová hláška
(`ERR_AB_TOO_BIG`) 702 px.

**Co z toho plyne.** V pravém sloupci by pole mělo kolem 270 px výšky, tedy
zhruba patnáct řádků místo pěti, a dialog by byl nižší o celý pás Výsledku,
asi o 130 px. Řádky plátů se do šířky sloupce vejdou. Komentář v kódu, že by
se zalomily, je z dřívějšího rozvržení. **Dlouhé chybové hlášky se zalomit musí**
— ověřit, že to víceřádkové `edittext` v ScriptUI udělá, a ne že je ořízne.
Až se vrátí Zünd panel (podle starého měření 165 px), zbude pod ním pro
Výsledek asi 130 px, pořád víc než dnešních 85, a pravý sloupec nepřeroste levý.

**Jak.** Přesunout panel na konec pravého sloupce a roztáhnout ho na zbytek
výšky. Ověřit, jestli to ScriptUI udělá samo (`alignment` fill v ose sloupce),
nebo se výška musí dopočítat po prvním layoutu. Nejmenší výška pole zůstane
85 px. Po změně změřit dialog. Opravit po přetestu, spolu s N16 a N17 — všechny
tři mění panel Výsledek nebo tlačítka pod ním.

---

### N20 — neexistující PDF preset spadne až při uložení, na každém plátu

**Nalezeno** při ladění harnessu (2026-09-25). **Druh:** drobná vada, dnes
těžko dosažitelná. **Kde:** `tile-export/src/main.js` (`try { pdfOpts.pDFPreset
= … } catch`), `src/ui.js` (náhradní položka `[High Quality Print]`, když
Illustrator nevrátí seznam presetů).

Naměřeno: přiřazení neznámého názvu nevyhodí, chyba přijde až v `saveAs` jako
`FNOC` — pro každý plát zvlášť, surovou hláškou. Try/catch v `main.js` tak nic
nechytí. V běžném provozu se to nestane, dialog nabízí jen presety, které
Illustrator vrátí. Cesty, kudy to přijde: náhradní anglický název na české
instalaci (`[High Quality Print]` tu neexistuje, je `[Kvalitní tisk]`)
a předvolba ručně upravená v `settings.json`.

**Oprava**, až se bude sahat do `main.js`: před exportem ověřit název proti
`app.PDFPresetsList` a neznámý nepoužít (s varováním), místo try/catch, který
nefunguje. Náhradní položku v dialogu vynechat.

---

## Pozorování bez vady

### P1 — linka na hraně stránky je v prohlížeči vidět jen dole a vpravo

**Test:** T5.1. **Stav:** PDF je správně, jde o vykreslování v prohlížeči.
**Otevřená otázka:** ve kterém prohlížeči se to ukázalo (Acrobat / Náhled).

Ověřeno na PDF z plochy (2026-09-18 10:47, všechny tři pláty): tah 0,3 pt, jeho
vnější hrana leží na hraně stránky na všech čtyřech stranách s přesností na
tisícinu bodu. Poppler při 3600 dpi vykreslil linku na všech čtyřech hranách
stejně silnou. Linky sousedů v PDF nejsou — v každém plátu je právě jeden tah
v barvě CutContour, takže podstata T5.1 prošla.

**Rozhodne tisk** (§9 plánu). Kdyby se asymetrie ukázala i na vytištěném plátu,
řešením je linku o chlup zasunout dovnitř — to ale jde proti původnímu zadání mít
její vnější hranu přesně na MediaBoxu, takže by to bylo rozhodnutí, ne oprava.

**2026-09-18, přetest:** hlášeno znovu, prohlížeč neuveden. Uživatel navrhl
opak zasunutí: linku vystředit na hranu a tah zdvojnásobit → **N13**.

---

## Opraveno během testu

| nález | test | commit |
|---|---|---|
| desetinná čárka se v dialogu zahazovala — tloušťka linky se vracela jako 1 pt, přelep 12,5 a přídavky 2,5 se měnily na nulu | T7.4 | `bf78166` |
| souhrn i hlášky ukazovaly celé milimetry (1027 místo 1026,7, `Přelep (1001 mm)` u zadaných 1000,5) | T3.2 | `19d7a11` |
| vypnutá linka zakládala prázdnou vrstvu `TE_lines` | T4.7 | `76422ad` |
| T4.2 nešel ověřit okem (odsazení 0,015 pt) — přepsán na kontrolu čísly | T4.2 | `e2f0465` |
| plán neuváděl umístění přelepu; dialog si pamatuje poslední stav → výchozí nastavení v §0 | T1 | `d95e63c` |
| T7.4 zkoušel předvolby jen s celými čísly | T7.4 | `b362fed` |
| T6 neříkal, jak připravit Large Canvas dokument, a že export v T6.3 má být zablokovaný | T6 | `2912ca1` |
