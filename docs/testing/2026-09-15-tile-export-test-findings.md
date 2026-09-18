# Nálezy z testu — Tile Export v1.1.0

Patří k [testovacímu plánu](2026-09-15-tile-export-test-plan.md). Běh
**2026-09-15 až 2026-09-18, dokončený**: podle hlášení uživatele vše, co není
zapsané níž, prošlo. Mimo plán zůstává tisková zkouška linky (§9 plánu)
a otevřená otázka u P1.

**Rozhodnutí 2026-09-18:** čekající nálezy se neopravují po jednom. Opraví se
dávkou, až bude plán dojetý celý. Důvod: oprava uprostřed běhu mění vstupy pro
testy, které ještě nejsou hotové, a část nálezů se týká stejných míst v kódu.

Číslování je stálé — na nález se odkazuj jeho číslem, i když se mezitím opraví.

---

## Čeká na opravu

### N7 — export 1:1 selže, když je celá grafika větší než ~5,77 m

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

**Test:** T8.3. **Kde:** `tile-export/src/ui.js:691`, `describeError()`.

`TE_BAD_WIDTH` nemá vlastní text a mapuje se na `ERR_CUTS_ORDER`, takže šířka
0 nebo nesmysl hlásí „Pozice řezů musí být vzestupné a uvnitř grafiky". Od
přepínače Rovnoměrně k té chybě vede druhá cesta: **strop šířky menší nebo rovný
přelepu** — tam je cizí hláška obzvlášť matoucí.

**Oprava:** vlastní řetězec `ERR_BAD_WIDTH` (EN i CS), ideálně rozlišit oba
případy — „šířka musí být kladné číslo" a „strop musí být větší než přelep".

---

### N3 — název hrany v české hlášce je anglicky

**Test:** T8.5. **Kde:** `tile-export/src/lib/validation.js:32–35` předává
`"left"`, `"right"`, `"top"`, `"bottom"` přímo do `ERR_ADD_OVERHANG`.

Výsledek: „Přídavek **left** (60 mm) překračuje přesah grafiky na té hraně".

**Oprava:** názvy hran jako lokalizované řetězce (`EDGE_LEFT` … — česky
„vlevo", „vpravo", „nahoře", „dole"), a větu přeformulovat tak, aby s nimi
gramaticky seděla: „Přídavek vlevo (60 mm) překračuje přesah grafiky (50 mm)."

---

### N4 — souhrnné hlášky: číslovky a „nahrazeno"

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
číselných polích. Rozhodnout, jestli za to stojí.

---

### N6 — chybová hláška u Large Canvasu radí cestu, která nevede ven

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

### N8 — předvolba nedá najevo, že se změnila, a nejde vrátit

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

**Nalezeno** při ověřování standardu pro N8, ne testem. **Kde:**
`tile-export/src/locale.js:286`.

Standard dialogů (`extendscript-ui-standards`, slovník tlačítek i kontrolní
seznam „Storno = Cancel") a Zünd Summa Marks používají **Storno**; tile-export
**Zrušit**. Jeden řetězec.

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
