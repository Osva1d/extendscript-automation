# Tile Export — nálezy

Vady a návrhy z ručního testu (2026-09-15 až 18), přetestu, běhů harnessu
(do 2026-09-26), kontrol kódu (od 2026-10-03), druhého ručního testu
(2026-10-04) a provozu (od 2026-10-10). Číslování je stálé: na nález
se odkazuj číslem, i když je opravený. Plné znění uzavřených nálezů, s příčinou a měřením, je v historii
gitu — soubor `docs/testing/2026-09-15-tile-export-test-findings.md`.

Postup testu: [ruční testy](manual-test.md).

---

## Otevřené

### N37 — rozlišení rastru platí pro stránku PDF, v 1:N je ve finále N× nižší

`tile-export/src/export.js`, `rasterizeArt()` — `ro.resolution` je DPI
z dialogu na stránce dočasného dokumentu, a ta je v měřítku výstupu.
Naměřeno 2026-10-10 (kód 1.0.1): kresba 1:10, rastrový režim, 150 DPI —
výstup 1:10 nese rastr 597 × 591 px (150 ppi stránky, **15 ppi ve finální
velikosti**, 0,57 MB), výstup 1:1 rastr 5965 × 5906 px (150 ppi, 3,26 MB).
Dialog píše jen „Rozlišení rastru v DPI", přitom všechny ostatní hodnoty se
zadávají ve skutečné velikosti. **Návrh:** DPI ve finální velikosti, v 1:N
rastrovat N× jemněji — data pak vyjdou stejná jako v 1:1. Předtím změřit
strop `RasterizeOptions.resolution` (300 DPI v 1:10 = 3000 na stránce).
Od 1.1.0 je rastr v dialogu schovaný (`RASTER_ENABLED`), past se tedy
neuplatní; oprava čeká na rozhodnutí, jestli se rastr vrátí.

### N36 — export 1:N s presetem, který převzorkovává, sníží rozlišení obrazu N×

Naměřeno 2026-10-10 (kód 1.0.1, Illustrator 30.8.2): kresba 1:10, obraz
72 ppi ve finální velikosti (5687 × 2852 px), vektorový export jednoho plátu.

| preset | 1:10 (jako dokument) | 1:1 |
|---|---|---|
| žádný | 5687 × 2852 px, 2,10 MB | 5687 × 2852 px, 2,10 MB |
| `[Kvalitní tisk]` | 2370 × 1189 px JPEG, 1,98 MB | 5687 × 2852 px, 2,66 MB |
| `pass4press` | 2370 × 1189 px JPEG, 2,07 MB | 5687 × 2852 px, 2,75 MB |

Měřítko samo data nemění, obraz je v obou stejný. Preset ale převzorkovává
podle rozlišení na stránce, a to je v 1:N N× vyšší: v 1:10 obraz srazí na
300 ppi stránky, po zvětšení v RIPu 30 ppi místo 72. Uživatel posílá na RIP
data 1:10 běžně. **Návrh:** v exportu 1:N převzorkování vypnout, nebo hranici
presetu posunout N× (jestli ji jde po nastavení presetu přečíst, neověřeno).
Rozhodne uživatel.

**Provozu se netýká** (uživatel, 2026-10-10): dílna ukládá PDF presetem
s vypnutým převzorkováním i kompresí, aby nedegradovala klientská data.
Výchozí „žádný" preset nepřevzorkovává také (první řádek tabulky). Zbývá
past pro preset, který převzorkovává — stačí upozornění v README.

Cestou: PDF/X preset `pass4press` zvětší MediaBox o 12,5 mm na každou stranu
(z toho 3 mm spadávka); stránka PDF je pak větší než artboard plátu.

### N35 — Zünd export čtyř rovnoměrných plátů skončil s nula pláty

Hlášeno z provozu (2026-10-10, verze 1.0.0): navázané PDF se spadem 3 mm,
4 rovnoměrné pláty, Zünd režim, spad za řezem 2,9 mm (3 mm bránila N33).
Export proběhl, každý plát skončil chybou a souhrn hlásil 0 exportovaných.
Text chyby se nezachoval; souhrn ho u každého plátu píše za
`<číslo>: TE_EXPORT:<číslo>:`.

**Nezreprodukováno** (kód 1.0.0, Illustrator 30.8.2): stejná sestava se
syntetickým PDF (2006 × 1006 mm, spad 3 mm, dokument 1:1, preset
`[Kvalitní tisk]`) vyexportovala všechny čtyři pláty. Preset to nejspíš není:
Zünd plát prošel s každým z dvanácti presetů vývojového stroje, včetně PDF/X
a pass4press, i bez presetu. Čeká na text chyby z opakování v provozu,
s nastavením dialogu a verzí Illustratoru. Doma ho uživatel nezopakoval
a 1.0.1 vyšla s ním otevřeným: předpoklad je chyba mimo skript (2026-10-10).

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

### N5 — po načtení předvolby jsou desetiny s tečkou (dluh)

`tile-export/src/ui.js`, `apply()` — `String(číslo)` zapíše `0.3`.

Hodnota je správně a nástroj čte čárku i tečku, jde jen o vzhled. **Odloženo
jako dluh** (uživatel, 2026-09-18): udělat, až se bude do `apply()` sahat
z jiného důvodu. Oprava: `String(v).replace(".", TE.L.DECIMAL)` v číselných
polích.

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
| N20 | bez seznamu presetů dialog nabídl `[High Quality Print]`, který česká instalace nemá (je `[Kvalitní tisk]`), a každý plát spadl v `saveAs`; teď nabídne „žádný — výchozí nastavení PDF". Jiná cesta k neznámému názvu není — `settings.json` jde přes `apply()`, které ho nahradí první položkou | `3381a07` |
| N21 | Zünd kontura se ořezávala podle zvětšeného artboardu, ne podle plátu | `ca7c673` |
| N22 | Zünd kontura se nezvětšovala s měřítkem výstupu (kód se zatím nepoužívá, N24) | `666ab22` |
| N23 | rozlišení rastru pod 72 DPI selhalo až při exportu, na každém plátu surovou hláškou; dialog teď export zastaví a řekne minimum | `fd3c1e8` |
| N25 | registrace se brala jako `swatches[1]` bez kontroly typu — bez registrace na indexu 1 je tam Bílá a značky by kamera Zündu neviděla; teď se hledá podle typu (z kontroly po prompt-auditu 2026-10-03) | `16e7317` |
| N26 | Zünd značky, které by na tisku splynuly — orientační bod na rohové značce u úzkého plátu (maska 85–95 mm při výchozím nastavení), rozteč pod průměrem značky — nikdo nehlásil; dialog teď jmenuje plát a zastaví export, plát s víc než 100 značkami zkontroluje `main.js` před exportem (hranice podle měření, `acdd723`) | `2500e03` |
| N27 | pole Čistý formát měnilo jen náhled a validaci, běh dál dělil artboard — dialog mohl ukázat pláty, které běh nevyrobí; pole zrušena, artboard je jediný zdroj pravdy (rozhodnutí uživatele 2026-10-03) | `29640be` |
| N28 | v Zünd režimu zůstal řádek linky aktivní a zdrojový dokument dostal červené náhledové linky, ač se do PDF linka nekreslí; řádek je teď šedý a linka se nekreslí nikde (ruční test 2026-10-04) | `29fe1cd` |
| N29 | testovací dokumenty měly pravítka v bodech; generátor je zakládá v mm přes `addDocument` (nástroj sám na jednotkách nezávisí) | `a24779d` |
| N30 | v Zünd souborech byla nahoře vrstva řezu, ne `Regmarks`; teď shora `Regmarks`, řez, `Graphics` jako v Zünd Summa Marks | `29fe1cd` |
| P1 | linka 0,3 pt, jejíž vnější hrana ležela přesně na hraně stránky, se v prohlížeči vykreslila jen dole a vpravo; po N13 (linka středem na hraně, tah ×2) prošel ruční test v prohlížeči i tisku (2026-10-04) | `bb777c2` |
| N31 | v běžném exportu ležela linka ve vrstvě s grafikou a obyčejné PDF vrstvy nenese; linka má vlastní vrstvu podle své barvy nad `Graphics` a vektorová PDF jsou editovatelná. Rastrová zůstala obyčejná — editovatelné PDF nese obraz dvakrát (naměřeno) | `29fe1cd` |
| N32 | volby směru se jmenovaly obráceně, než říká dílna: „Horizontálně" dělilo na pláty vedle sebe; teď „Svisle" (svislé pláty vedle sebe, jako tapety) a „Vodorovně", uložené hodnoty beze změny (provoz 2026-10-10) | `1db21b5` |
| N33 | kontrola spadu a přídavků porovnávala přesně na body, dialog ukazuje desetiny; PDF se spadem 3 mm (naměřeno 2,9986 mm) pak „potřebovalo 3 mm, neslo 3 mm" a export byl zablokovaný; teď tolerance 0,05 mm (provoz 2026-10-10) | `d0bae05` |
| N34 | nápověda a README tvrdily, že vektorový plát nese vždy celou grafiku; plát nese jen objekty, které do něj zasahují, celý jen objekt přes hranu (naměřeno 2026-10-10) | `8369e3c` |
| N38 | náhled dělení podle vodítek četl u Vodorovně svislá vodítka: se samými vodorovnými šedil obě tlačítka, s oběma ukázal jiné dělení, než běh udělal; teď čte vodítka zvoleného směru jako běh (z popisu voleb 2026-10-10) | `eff1de8` |
| N39 | každý plát umisťoval PDF znovu ze souboru s ořezem z předvolby importu, ne z pozice: PDF umístěné se spadávkou (214 × 102 mm) vyšlo ořezané na TrimBox (210 × 98) a roztažené, bez varování; teď plát dostává `duplicate()` pozice, kopie se odemkne a zviditelní (dědí obojí). Sondy proti starému kódu: past s ořezem shodná se správným výstupem na 0,0009 pt, Large Canvas vektor, Zünd i rastr stejné až na švy vyhlazování (2026-10-10) | `c240bb4` |
| N41 | u Vodorovně šel kratší zbytek šířky plátu na horní plát (řezy se odměřovaly od spodní hrany osy), dokumentace slibuje poslední; teď se odměřuje shora a zbytek jde na spodní plát (rozhodnutí uživatele, ruční test 1.0.1 2026-10-10) | `6d1710c` |
| N40 | u Vodorovně se pole jmenovalo Šířka plátu, ač dělilo výšku, a jediný plát hlásilo jen „Jsou potřeba aspoň 2 pláty"; teď Výška plátu i v nápovědě a hláškách a hláška s délkou grafiky ve směru dělení (1.1.0, ruční test 1.0.1) | `0909105` |
| N42 | druhé spuštění Jen pláty hlásilo, že se pláty na plátno nevejdou, a třetí vrátilo smazané artboardy: plátno se měřilo zkušebními artboardy až po odebrání starých plátů a odmítnuté přidání odebrání vrátilo (engine-facts); teď se měří před odebráním. Harness, který pouštěl všechny běhy v jednom skriptu, chybu neviděl — od teď každý běh jako samostatný skript (1.1.0, harness 2026-10-11) | `3f1f0ec` |
| N44 | po běhu zůstala aktivní podvrstva posledního kontrolního plátu; co uživatel nakreslil potom, třeba vodítko pro nové dělení, mohlo skončit v `TE_panels`, další běh by ho nečetl a s vrstvou smazal. Běh teď vrací vrstvu aktivní před ním; vodítko tažené rukou po běhu skončilo ve Vrstvě 1 (harness a ruční test 1.10, 2026-10-11) | `40c7c41` |
| N43 | měřítko kresby se do dokumentu zapsalo, ale nepřečetlo: Illustrator vrátil prefix XMP `te` jako `te_1_`; teď se hodnota hledá podle jmenného prostoru (1.1.0, harness 2026-10-11) | `2dbdd63` |
| N45 | překlep v číselném poli se tiše měnil v jiné číslo: přelep „2O" dal nulový přelep, „1 000" nebo „20 mm" výchozí hodnotu pole, prázdné měřítko kresby 1:1, a dialog mlčel (i v 1.0.1). Teď pole zčervená, Výsledek ho pojmenuje, obě akce i Uložit zešednou; číslo smí mít jen desetinnou čárku nebo tečku (audit společného jazyka P1, 2026-10-14) | `005e6c1` |
| N46 | vzor bez `{n}` dal plátům se stejným rozměrem stejný název: export si soubor přepsal, se zapnutým přeskakováním další vynechal, bez hlášky (i v 1.0.x); teď Výsledek oba pláty jmenuje, poradí `{n}` a export zablokuje (z přehledu všech názvů, 2026-10-16) | `de84cff` |
| N47 | barva řezu z předvolby, kterou seznam neměl, se při načtení tiše nahradila první položkou — u zdi registrační, takže by se řezalo v barvě značek (předvolba TEST s `cut`, 2026-10-15; i v 1.0.x); teď „cut  (chybí)“ podle `extendscript-ui-standards` §12.3, upozornění ve Výsledku, barvy v hranatých závorkách seznam řezu nenabízí | `8bd88f1` |

Opraveno přímo během testu, bez čísla: desetinná čárka se v dialogu zahazovala
(`bf78166`), souhrn ukazoval celé milimetry (`19d7a11`), vypnutá linka
zakládala prázdnou vrstvu (`76422ad`).
