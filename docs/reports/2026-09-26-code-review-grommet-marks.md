# Code review — grommet-marks

Datum: 2026-09-26. Rozsah: celé `grommet-marks/src/` a sdílené
`shared/lib/ui_state.js` ve stavu `main` (c87ddb0), chováním shodné
s `grommet-marks/v1.1.0` — dva pozdější commity jsou bez změny chování
(odstranění nefunkční šířky okna a rozšíření parity guardu v buildu). Zadání:
nástroj používají operátoři v prepressu pod tlakem a chyba znamená zkažený tisk
nebo řez, takže správnost má přednost před elegancí.

Review je jen analýza — v kódu se nic neměnilo. Cesty v textu jsou relativní
k `grommet-marks/`. Výjimkou jsou cesty začínající `shared/`
a `zund-summa-marks/`, které jsou relativní ke kořeni repa.

## Metoda

- Přečtený celý kód včetně buildu, testů a dokumentace. Testy prošly (7/7 sad)
  a `npm run lint` je čistý.
- Chování jádra a dialogu reprodukované v Node: produkční moduly z `src/`
  a `tests/lib/mock_scriptui.js`, včetně skutečného `GM.Main.process()` nad
  falešným dokumentem, který zaznamenává volání `placeMarkGroup`.
- Sondy v Illustratoru 30.8.1 (cs_CZ) přes `tools/ai-eval.sh`:
  - každá sonda běžela ve vlastním dočasném dokumentu a sama se přerušila, když našla otevřený jiný dokument;
  - moduly GM se nahrály z `src/` do rozsahu jedné funkce, takže v enginu nezůstal globální `GM`;
  - bez dialogu a bez `storage.js`, takže se uživatelovo nastavení nečetlo ani nepsalo;
  - `GM.Main.process()` se v Illustratoru nespouštěl, protože volá `alert()` a ten by most zablokoval; jeho posloupnost volání DOM sonda zopakovala přes `GM.Illustrator`;
  - geometrie je exportovaná do PDF, vykreslená Popplerem 26.04 a prohlédnutá.
- Naměřené chování DOM je zapsané v
  [`extendscript-engine-facts.md`](../extendscript-engine-facts.md), sekce
  „Styl nových cest, Large Canvas a geometrie cest".

**Výhrada:** sondy běží přes AppleScript `do javascript`, ne přes Soubor › Skripty.
U undo a u dědění stylu z výběru myší se to může lišit.

**Závažnost:** critical / major / minor / nit.
**Jistota:**
- *ověřeno živě* — sonda v Illustratoru,
- *ověřeno* — kód, výpočet nebo reprodukce v Node,
- *pravděpodobné*,
- *spekulace*.

## 1. Shrnutí

Jádro (rozložení po hraně, po cestě a rohové zóny) je čisté a dobře otestované.
Problémy jsou na hranicích: jak skript převádí míry do dokumentu, co zdědí od
Illustratoru a co udělá s tím, co už v dokumentu je. Hlavní body:

- **Large Canvas (G1).** V dokumentu nad ~5,78 m vyjdou značky 10× větší,
  10× dál od kraje a s 10× větším rozestupem.
- **Zděděný čárkovaný tah (G2).** Když je vybraná čárkovaná kontura, značky se
  vykreslí čárkovaně.
- **Chybějící roh (G6).** Kontura se zdvojeným uzavíracím bodem ztratí roh
  a ten zůstane bez oka.
- **Dialog neodpovídá výstupu (G3).** Se zapnutými rohovými zónami ukazuje
  Počet, ale výstup jede podle zašedlého Rozestupu.
- **Opakovaný běh (G4, G5).** Druhé spuštění přidá druhou sadu značek; do skryté
  vrstvy se generuje neviditelně.

Artboardová matematika v `src/main.js` nemá žádný test — G1 i G3 by test odhalil.

Co je v pořádku a nesahal bych na to:
- registrace přes `swatches[1]` s kontrolou `colorType` (funguje i v CZ, ověřeno živě),
- konstrukce značky: bílé halo s knockoutem pod registrací s přetiskem (ověřeno živě),
- jeden běh = jeden krok Zpět včetně obnovení zámku vrstvy (ověřeno živě),
- čisté jádro bez DOM, sdílené `ui_state.js`, ruční exkluzivita radií s regresním testem,
- migrační řetěz nastavení s testy, parity guard verze v buildu.

## 2. Chyby a okrajové případy

### G1 · critical · ověřeno živě — Large Canvas se ignoruje

**Kde:** převod délek `src/main.js:77`, `:104`, `:121`, `:144–145`, `:151`;
tloušťky tahů `src/main.js:81–82` → `src/illustrator.js:153`, `:164`, `:169`.

**Problém:** všechny délky se převádějí na body dokumentu jen faktorem jednotky,
bez dělení `doc.scaleFactor`. V dokumentu Large Canvas (`scaleFactor` 10) je
každá zapsaná hodnota v bodech fyzicky desetkrát větší — pozice, průměr
i `strokeWidth`.

**Dopad** (naměřeno): artboard fyzicky 300 × 300 mm v normálním dokumentu
a v Large Canvas, značka s výchozím nastavením v levém horním rohu, PDF
vykreslená vedle sebe. V normálním dokumentu sedí značka 3 mm přesně 7 mm od
rohu. V Large Canvas má průměr 30 mm, tahy 10 a 30 pt a střed 70 mm od rohu.
Rozestup je desetkrát větší, takže značek je desetina. Large Canvas vzniká od
šířky ~5,78 m — přesně u bannerů, pro které nástroj je. Obří značku operátor
možná zaregistruje, 70 mm od kraje už ne: oka se proseknou do motivu.

**Návrh:** v `process()` jednou `var sf = doc.scaleFactor || 1` a dělit jím
faktor pro délky i tloušťky tahů. Vzor je v `zund-summa-marks/src/lib/utils.js`
(`getSF()`) a `shared/lib/cut_marks.js`. Test přes artboardovou matematiku
vytaženou do jádra (D2).

### G2 · major · ověřeno živě — značky dědí aktuální styl tahu dokumentu

**Kde:** `src/illustrator.js:147–156` (`_strokeEllipse`), `:159–171`
(`_strokeCross`).

**Problém:** pomocné funkce nastaví `filled`, `stroked`, barvu, šířku a přetisk,
ale ne `strokeDashes`, `strokeCap` a `strokeJoin`. Nová cesta ze skriptu je
přebírá z výchozího stylu dokumentu a ten se nastaví výběrem objektu.

**Dopad** (naměřeno): čárkovaná kontura `[8, 4]` s kulatými konci vybraná
skriptem, pak režim „Vybraná cesta" — registrační kruh i bílé halo všech čtyř
značek vyšly čárkované s kulatými konci (PDF vykreslené a prohlédnuté). Totéž
platí v režimu hran, když je při spuštění vybraný čárkovaný objekt. Čárkované
bývají perforace, bigy a výsekové obrysy, tedy přesně kontury, na které se
značky dávají. Pokud značky čte kamera stroje, rozbitý kruh může rozpoznání
shodit (spekulace).

**Návrh:** v obou funkcích výslovně `strokeDashes = []`, `strokeDashOffset = 0`,
`strokeCap = StrokeCap.BUTTENDCAP`, `strokeJoin = StrokeJoin.MITERENDJOIN`.
Dědění `opacity` a `blendingMode` neměřeno; pro jistotu nastavit i ty.

### G3 · major · ověřeno — rohové zóny přepnou hranu z Počtu na zašedlý Rozestup

**Kde:** jádro `src/core.js:254`; UI bez vazby zón na režim hrany
`src/ui.js:107–117` a `:497–508`; validace `src/lib/validation.js:127–133`.

**Problém:** `distributeOnSpan` se zapnutými zónami režim Počet ignoruje a střed
hrany plní rozestupem (komentář `src/core.js:185–186` to říká). UI ale nechá
aktivní radio Počet a pole Rozestup zašedlé. Validace kontroluje jen viditelný
režim, tedy počet.

**Dopad** (reprodukce v Node přes skutečný `GM.Main.process()`): artboard
3 × 1 m, výchozí nastavení (Počet 10). Bez zón je na horní hraně 10 značek,
se zónami 3 × 50 mm **32**. Se zapomenutým „0.5" v zašedlém poli Rozestup
validace prošla, Generovat bylo aktivní a vzniklo **14 304** značek. Tooltip zón
(„zbytek jede podle rozteče") to naznačuje, ovládací prvky tvrdí opak.

**Návrh:** se zapnutými zónami v režimu hran přepnout hrany na Rozestup a radio
Počet zakázat s tooltipem. UI tím odpovídá tomu, co jádro garantuje už dnes —
chování se nemění. Počet se zónami v jádře by byl nová schopnost a samostatné
rozhodnutí.

### G4 · major · ověřeno — opakovaný běh zdvojí značky

**Kde:** `src/main.js:61–207`, `src/illustrator.js:128–144`.

**Problém:** skript nezjišťuje, co už na vrstvě „Grommet Marks" je, a skupiny
značek nijak neoznačuje. Deduplikace (`placed`) platí jen uvnitř jednoho běhu.

**Dopad:** vygeneruju, rozestup se nelíbí, spustím znovu s jiným — na vrstvě
jsou stará i nová sada, při stejném nastavení neviditelně přes sebe. Kdo
zapomene na Zpět, pošle do tisku obě.

**Návrh:** značky označit (`note`, viz engine facts; nebo `name`). Když na
cílové vrstvě už nějaké jsou, zeptat se „Nahradit / Přidat / Storno". V režimu
hran nahrazovat jen v mezích zpracovaných artboardů; v režimu cesty může být na
vrstvě víc tvarů, tam spíš jen varovat. Souvisí s F1.

### G5 · major · ověřeno — skrytá cílová vrstva zůstane skrytá

**Kde:** `src/main.js:85–87`, `:192–194`, `:202–204`.

**Problém:** vrstvu „Grommet Marks" skript odemkne a zviditelní a po zápisu
vrátí obojí. U zámku je to správně. U skrytí to znamená, že výsledek není vidět.

**Dopad:** operátor si vrstvu schoval (nebo ji má skrytou šablona), spustí
skript a nevidí nic, bez hlášky. Spustí znovu (G4). Skrytá vrstva se nevytiskne
a do PDF jde jako vypnutá vrstva.

**Návrh:** je to volba mezi „respektuj stav vrstvy" a „ukaž výsledek".
Doporučuju vrstvu nechat viditelnou a zmínit to v souhrnu; minimálně varovat
„Značky jsou na skryté vrstvě".

### G6 · major · mechanismus ověřen živě, výskyt v datech pravděpodobný — zdvojená kotva schová roh

**Kde:** extrakce segmentů `src/illustrator.js:65–76`; tečny `src/core.js:396–410`.

**Problém:** když se dvě sousední kotvy kryjí, vznikne segment nulové délky. Jeho
tečna je `[0, 0]`, odchylka vyjde 0 a roh na tom místě se nedetekuje.

**Dopad** (naměřeno): uzavřený obdélník, jehož pátá kotva leží na první, má
v Illustratoru opravdu 5 `pathPoints` (bod se nesloučí) a `getSelectedPathInfo`
najde 3 rohy ze 4. V Node (1000 × 500, rozestup 300) ležela nejbližší značka
100 mm od chybějícího rohu, v Illustratoru (200 × 100 mm, rozestup 30 mm)
10 mm. Roh banneru bez oka, bez varování. Takhle uzavřené cesty jsou typické
pro kontury z PDF, DXF nebo Corelu; jak často přicházejí v zákaznických datech,
neměřeno.

**Návrh:** v `getSelectedPathInfo` vyhodit sousední kotvy bližší než ~0,01 pt
(včetně uzavírací kotvy shodné s první) a přidat test na obdélník s pěti body.

### G7 · minor · ověřeno — odsazení se kontroluje i v režimu cesty

**Kde:** `src/lib/validation.js:67–71` proti `src/ui.js:724–725`.

**Problém:** živá validace pole odsazení v režimu cesty přeskočí (jsou ve skrytém
panelu Hrany), `validate()` je kontroluje vždy.

**Dopad** (reprodukce v Node): neplatné odsazení, přepnout na „Vybraná cesta" →
Generovat je aktivní → alert „Odsazení X: musí být číslo!" a skript skončí (U4).
Pole přitom v režimu cesty není vidět. Stejná třída chyby, jakou verze 1.1.0
opravila opačným směrem.

**Návrh:** odsazení validovat jen v režimu hran; systémově D1.

### G8 · minor · ověřeno — skrytý zrcadlený řádek blokuje Generovat

**Kde:** `src/ui.js:735–738`, `:778–779`; zrcadlení `src/ui.js:371–374`.

**Problém:** zrcadlení řádek skryje, ale jeho pole zůstanou `enabled`, takže je
živá validace dál kontroluje. Komentář `src/ui.js:715–716`, že se zrcadlené
hrany přeskakují, neplatí.

**Dopad** (reprodukce v Node): neplatná hodnota v řádku Dolní a pak zapnuté
zrcadlení → Generovat zůstane šedé a žádné červené pole není vidět. `validate()`
by přitom prošlo.

**Návrh:** přeskočit řádky zrcadlených hran stejnou podmínkou jako
`src/lib/validation.js:120–122`; systémově D1.

### G9 · minor (dopad na předvolby velký, pravděpodobnost nízká) · ověřeno — poškozený soubor nastavení tiše smaže všechny předvolby

**Kde:** načtení `src/lib/storage.js:117–190`, zápis `:33–49`;
`src/main.js:28–35` a `:48–50`.

**Problém:** `load()` při jakékoli chybě (poškozený JSON, prázdné čtení, `null`
místo předvolby) vrátí `null` a zaloguje to jen do `$.writeln`. `main.js` pak
založí čistá data s `[Default]`. `save()` není atomický: `open("w")` soubor hned
zkrátí a návratové hodnoty `write` a `close` se nekontrolují.

**Dopad:** dialog se otevře s výchozími hodnotami bez vysvětlení a první uložení
(Generovat, Uložit, Uložit jako, Smazat) přepíše soubor jen s `[Default]`
a `[Last Settings]` — pojmenované předvolby jsou pryč. Pád nebo plný disk
uprostřed zápisu je přesně cesta k poškozenému souboru. Stejná chyba je v ZSM
(K15).

**Návrh:** při selhání načtení soubor odložit
(`GrommetMarksSettings.broken-RRRRMMDD.json`) a jednou to oznámit; zapisovat
přes dočasný soubor a přejmenování, kontrolovat `write` a `close`.

### G10 · minor · ověřeno — `parseFloat` bere překlepy

**Kde:** `src/ui.js:154–155`, `:612–639` (`gatherAll`), `:762` (`fieldInRange`).

**Problém:** čísla z polí čte `parseFloat`, který vezme číslice ze začátku
a zbytek zahodí. Striktní `Number()` ve `src/lib/validation.js:38` nic nezmůže,
protože dostává už převedená čísla.

**Dopad** (reprodukce v Node): „1O5" → 1 mm, „1 000" → 1 mm, „10.5.2" → 10,5,
„5o" → 5. Pole nezčervená a Generovat je aktivní. Výsledek je vidět (rozestup
1 mm = tisíce značek), ale pod tlakem je to zbytečná past. Illustrator
nezamrzne — tvorba značky trvá 0,1–0,2 ms (ověřeno živě).

**Návrh:** jedna striktní převodní funkce (ořez mezer, čárka → tečka,
`Number()`) pro `gatherAll` i `fieldInRange`.

### G11 · minor · ověřeno živě — zaoblené rohy se berou jako „bez rohů"

**Kde:** `src/core.js:311–326`, detekce `:389–422`.

**Problém:** zaoblený roh je hladký oblouk, takže ho detekce odchylkou tečen
nevidí. Cesta pak jde do režimu „prstenec": rovnoměrně po obvodu od první kotvy.

**Dopad** (naměřeno): `roundedRectangle()` 200 × 100 mm s poloměrem 20 mm =
8 kotev, 0 rohů. S rozestupem 60 mm leží u nejhoršího rohu nejbližší značka
22,9 mm od rohu obálky; značka na středu oblouku by byla 8,3 mm. Kde značky
vyjdou, závisí na tom, kde leží první kotva (u `roundedRectangle()` na levé
hraně na začátku levého dolního oblouku). Live Corners neměřeno.

**Návrh:** oblouk, na kterém se tečna otočí o ≥ ~45° na úseku kratším než
rozestup, brát jako roh v jeho středu. Minimálně napsat do informačního řádku,
že cesta nemá rohy a značky jdou rovnoměrně od prvního bodu.

### G12 · minor · ověřeno (výpočet) — náhradní tečna u stažené úchytky je tětiva

**Kde:** `src/core.js:396–405`.

**Problém:** když je úchytka stažená na kotvu (`p1 == p0`), skutečný směr tečny
je `p2 − p0` (dá ho druhá derivace), kód ale bere tětivu `p3 − p0`. Komentář
`src/core.js:381–382` přiznává chybu až ~30°.

**Dopad** (výpočet v Node na syntetické geometrii): tečně navazující přechod
úsečka → křivka vyšel jako falešný roh, tedy povinná značka navíc a rozdělený
úsek. Naopak skutečný roh těsně nad prahem může zmizet. Jak často jsou
v datech křivky s jednou staženou úchytkou, neměřeno.

**Návrh:** `p2 − p0` pro výstupní a `p3 − p1` pro vstupní tečnu, tětiva až když
splývají obě úchytky. Dva řádky a test na přechod úsečka → křivka.

### G13 · nit · ověřeno živě — podvrstva „Grommet Marks" se nenajde

**Kde:** `src/illustrator.js:27–36`.

**Problém:** `doc.layers.getByName` hledá jen vrstvy nejvyšší úrovně. Je-li
„Grommet Marks" podvrstvou, vznikne nahoře druhá vrstva stejného jména.

**Návrh:** stačí to zmínit v README; hledání v podvrstvách by otevřelo otázku,
kterou z více shod vzít.

### Co je ošetřené

- Žádný dokument: `src/main.js:13–16`, hláška říká, co udělat (ověřeno).
- Textový kurzor místo výběru objektu: `src/illustrator.js:51–59` ho zachytí
  jako „není cesta" (ověřeno).
- Zamčená cílová vrstva se odemkne a zámek se vrátí, i při výjimce
  (`src/main.js:202–204`, ověřeno).
- Víc artboardů: souřadnice artboardu i cesty se čtou i zapisují ve stejném
  připnutém systému (`src/main.js:22–26`) a rohy sdílené hranami deduplikuje
  `place()` (ověřeno).
- Velké dokumenty: skript obsah dokumentu neprochází, výkon závisí jen na
  počtu značek (0,1–0,2 ms na značku, ověřeno živě).
- Undo: jeden krok včetně zámku vrstvy (ověřeno živě). Každé budoucí
  `app.redraw()` uprostřed běhu by undo rozdělilo (engine facts).

## 3. Zbytečná složitost, duplicity, mrtvý kód

- **D1 · minor, kořen tří chyb — dvě implementace validace.** Živá
  (`src/ui.js:718–801`) a při odeslání (`src/lib/validation.js:62–154`) mají
  každá vlastní pravidla viditelnosti: režim, zrcadlení, zóny, zašedlá pole.
  Rozjely se už třikrát (oprava v 1.1.0, G7, G8). Návrh: jedna čistá funkce
  `GM.Validation.check(cfg) → [{field, key, args}]`; UI z ní barví pole
  a zamyká Generovat, `main.js` ji použije při odeslání. Největší krok i k UXP
  (kap. 7).
- **D2 · minor — artboardová matematika bez testu.** `src/main.js:132–190`
  (odsazení, zrcadlení, hrany, víc artboardů) žádná sada nenačítá; manuální
  test C1/C2 ji kontroluje ručně. Vytáhnout do `GM.Core` jako čistou funkci
  (obdélníky artboardů + nastavení + měřítko → body), pak jde G1 i G3 pokrýt
  testem.
- **D3 · nit — mrtvé klíče locale** (obě jazykové sady): `TOP`, `LEFT`,
  `BOTTOM_MIRROR`, `RIGHT_MIRROR`, `MIRROR_TOP_ACTIVE`, `MIRROR_LEFT_ACTIVE`,
  `PATH_INFO_LENGTH` smazat. Nepoužívají se ani `ERR_PATH_NO_SELECTION`,
  `ERR_PATH_NOT_A_PATH`, `ERR_PATH_TOO_SHORT` a `ERR_PATH_GONE` — ty ale
  naopak zapojit (U1).
- **D4 · nit — `calcPositions`** (`src/core.js:40–88`) volají jen testy jako
  regresní orákulum pro `distributeOnSpan`. Patří do `tests/lib/`, regresní
  kontrakt zůstane.
- **D5 · nit — nevolaný kód.** `api.setAllEnabled` (`src/ui.js:145`) nikdo
  nevolá. Migrace sentinelů (`src/lib/storage.js:86–102`, `SENTINEL_CREATE`)
  převádí pole `markLayerName`, `fillSwatchName` a `strokeSwatchName`, která od
  v6 nikdo nečte (ověřeno grepem). Buď smazat, nebo ta pole při migraci rovnou
  odstranit.
- **D6 · nit — zastaralé komentáře.** JSDoc `buildEdgePanel`
  (`src/ui.js:46–60`) popisuje parametry zrcadlení, které funkce nemá. Komentář
  hlavičky (`src/ui.js:336–340`) uvádí šířky 118/84/90, kód má 72/78/90.
  Pixelové literály mimo metrický blok jsou vědomě odložené (rozhodnutí
  2026-09-08) — opravit jen komentář, až se na soubor sáhne.

## 4. UI/UX

- **U1 · minor — neřekne se, proč je „Vybraná cesta" zašedlá.**
  `src/ui.js:266–267`: tooltip je vždy „vyberte cestu", i když operátor vybral
  skupinu, složenou cestu nebo dva objekty. `getSelectedPathInfo` důvod vrací
  a texty existují (D3). Návrh: důvod jako tooltip i jako šedý řádek v panelu
  Umístění; u skupiny „vyberte cestu nástrojem Přímý výběr (A)".
- **U2 · minor — vybraná cesta nepřepne režim.** `src/ui.js:666–670`: dialog
  otevře režim z `[Last Settings]`. Kdo vybere konturu a odklepne Enter, dostane
  značky po hranách artboardu. Výběr je silnější signál záměru než minulý běh;
  návrh: s platnou vybranou cestou předvolit „Vybraná cesta". Je to volba,
  ne chyba.
- **U3 · minor — tloušťky jsou v bodech a nikde to nestojí.** Tooltip jednotek
  (`src/locale.js:55`, `:183`) slibuje „pro všechny rozměry", pole Reg. tah
  a Bílé halo (`src/ui.js:578–585`) nemají příponu. Halo „1" myšlené v mm je
  0,35 mm. Délková pole jednotku nemají vůbec. Návrh: „pt" za tloušťky,
  zkratka jednotky za délky, opravit tooltip.
- **U4 · minor — chyba při odeslání zavře dialog.** `src/main.js:45–46`: alert
  a konec skriptu, zadané hodnoty se neuloží ani do `[Last Settings]`. Návrh:
  validovat v `onClick` tlačítka Generovat a okno zavřít až po úspěchu.
- **U5 · minor — hláška neřekne kde.** `src/lib/validation.js:128–132`:
  „Počet ok: musí být celé číslo!" platí pro kteroukoli ze čtyř hran i pro
  cestu; „Odsazení X" v dialogu nikde není (je tam ↔). Návrh: „Horní hrana —
  počet ok musí být celé číslo od 1 do 9999."
- **U6 · minor — ukládají se nevalidované hodnoty.** Uložit předvolbu
  (`src/ui.js:869–877`) validaci nehlídá a `validate()`
  (`src/lib/validation.js:138`) zkopíruje do `[Last Settings]` i pole, která
  nekontroluje. NaN se v JSON změní na `null` a po načtení je v poli text „null"
  (ScriptUI ověřeno živě — nespadne). Stejná chyba jako ZSM K17.
- **U7 · nit — převod jednotek driftuje.** `src/ui.js:705`: 7 mm →
  0,275591 in → 7,000011 mm a předvolba se pak tváří jako změněná (ověřeno
  v Node). Převádět z uložené hodnoty v mm, ne z textu pole.
- **U8 · nit — výchozí hodnoty.** Výchozí Počet 10 (`src/config.js:37–40`) dá
  věrohodně vypadající výsledek na jakémkoli rozměru; Rozestup se rozměru
  přizpůsobí sám. Jaký rozestup je v provozu standard, neověřeno. Počet 1 dá
  jednu značku do rohu (`src/core.js:257–263`), na boční hraně tedy prakticky
  nic — je to kompatibilita s v4 a stojí za rozhodnutí (minimum 2, nebo střed
  hrany).
- **U9 · nit — drobnosti.** `[Last Settings]` nejde po přepnutí předvolby znovu
  vybrat. Rádia Hrany/Cesta nemají tooltip, který standard vyžaduje.

Storno je v pořádku: nic negeneruje a `[Last Settings]` nemění. Uložit, Uložit
jako a Smazat se zapisují hned, jak jejich názvy slibují. Pořadí panelů
(Předvolby → Umístění → Hrany/Cesta → Rohové zóny → Značka) sedí na pracovní
postup.

## 5. Texty

- **T1 · minor — tvar, který neexistuje.** `TIP_SIZE` (`src/locale.js:114`,
  `:242`) mluví o „straně čtverce"; čtverec od v4.2 není a délka ramen kříže
  chybí. Totéž slibuje `README.md:3` („kroužky nebo čtverce").
- **T2 · minor — hlášky, které neříkají, co dělat.** `WARN_MARKS_FAILED`
  („zkontrolujte cílovou vrstvu") a `ERR_UNEXPECTED`, který připojí anglickou
  hlášku DOM. Dobře to dělají `ERR_NO_DOC`, `ERR_ENTER_NAME` a hlavně
  `PATH_OFFSET_NOTE`.
- **T3 · nit — čeština a terminologie.**
  - „4 rohů", „2 značek" — chybí tvary pro 2–4 (`PATH_INFO_CORNERS`, `WARN_MARKS_FAILED`);
  - pro totéž se střídá „předvolba" a „nastavení" (`CONFIRM_*`, `TIP_PRESET_LOAD`, `ERR_CANNOT_DELETE_DEFAULT`);
  - „Počet ok" v hlavičce vs. „značek" v tooltipech;
  - `TIP_COUNT` a `TIP_SPACING` říkají „na hraně" i v panelu Cesta;
  - copyright v patičce je natvrdo „2025–2026" (`src/ui.js:594`).
- **T4 · minor — dokumentace driftuje.** `docs/architecture.md` uvádí
  „Verze: 6.0.0", neexistující `GM.UI.toDisplay()`
  a `GM.Illustrator.isSystemSwatch()` a starý layout. `docs/manual-test.md`
  A1–A3 testuje UI, které už neexistuje (Reset, zrcadlení v řádku hrany), a E5
  nejde provést — modální dialog změnu výběru nedovolí.

## 6. Funkce, které by operátor čekal

- **F1 — Nahradit předchozí značky** (G4). Nejvyšší priorita.
- **F2 — Živý náhled počtu** v dialogu, např. „Horní: 11 × 498 mm, celkem 36".
  Jádro je čisté, takže to jde spočítat bez DOM. Chytilo by G1 (s měřítkem),
  G3, překlepy i omyl v jednotkách dřív, než značky vzniknou.
- **F3 — Rozsah artboardů:** aktivní / všechny / rozsah. Teď se značkují vždy
  všechny (`src/main.js:155`), i pomocné. Artboard menší než dvojnásobek
  odsazení dostane značku mimo sebe bez varování (`src/main.js:163`).
- **F4 — Souhrn po doběhu** („Vytvořeno 36 značek na 2 plátnech"). Teď je
  ticho, pokud nejde o varování; nula značek (např. cesta nulové délky) projde
  bez hlášky.
- **F5 — Režim cesty:** víc vybraných cest najednou, skupina s jedinou cestou,
  vnější obrys složené cesty a odsazení dovnitř přímo v dialogu místo ručního
  Posunout cestu.

## 7. Připravenost na UXP

Stav UXP v Illustratoru neověřen; hodnotí se jen, jak moc je logika svázaná se
ScriptUI a ExtendScriptem.

| modul | vazba | co by bylo potřeba |
|---|---|---|
| `core.js`, `config.js`, `constants.js`, `shared/lib/ui_state.js` | žádná | přenést beze změny |
| `lib/validation.js` | `alert()` uvnitř | oddělit kontrolu od hlášení (D1) |
| `lib/storage.js` | `File`/`Folder`, json2 | adaptér úložiště (v UXP asynchronní); migrace jsou čisté |
| `lib/utils.js`, `locale.js` | `$.writeln`, `alert`, `app.locale` | malý hostitelský adaptér |
| `illustrator.js` | DOM | tenký, pracuje s prostými poli — změny by se soustředily tady |
| `main.js` | `window.show()`, `gatherAll()`, DOM a matematika dohromady | dialog vrací `{status, settings}`, matematika do jádra (D2) |
| `ui.js` | celý ScriptUI | přepsat; žijí v něm pravidla režimů, zón, zrcadlení, převodu jednotek a živé validace |

Celkově středně připravené. Zhruba polovina kódu je přenositelná beze změny,
ale pravidla schovaná v `ui.js` by se musela napsat podruhé — přesně ten druh
duplicity, který už rozjel dvě validace. D1 a D2 se vyplatí kvůli dnešním
chybám; UXP je bonus.

## 8. Naměřeno

### Sondy v Illustratoru (30.8.1, cs_CZ)

| co | výsledek |
|---|---|
| značka ve stejném 300 × 300 mm artboardu, normální vs. Large Canvas, PDF vykreslená vedle sebe | 3 mm a 7 mm od rohu vs. 30 mm a 70 mm, tahy 10× (G1) |
| PDF z Large Canvas | MediaBox 85,04 pt + `/UserUnit 10.0` = fyzicky 300 mm |
| výchozí styl dokumentu nastavený na čárkovaný, pak značka GM | všech 6 cest čárkovaných, kulaté konce, zkosené spoje (G2) |
| čárkovaná kontura vybraná skriptem, pak značky v režimu cesty, PDF | `defaultStrokeDashes` převzal `[8,4]`; značky čárkované (G2) |
| obdélník s pátou kotvou na první, `closed = true` | 5 `pathPoints`, 3 rohy ze 4 (G6) |
| `pathItems.rectangle()` | 4 body, 4 rohy |
| `pathItems.roundedRectangle()` 200 × 100 mm, R 20, rozestup 60 mm | 8 bodů, 0 rohů, nejhorší roh 22,9 mm od značky (G11) |
| 200 značek za sebou bez redraw | 0,1 ms (kruh), 0,2 ms (kruh + kříž) na značku |
| odemknout, 8 značek, zamknout, redraw; pak Zpět | jeden krok: značky pryč, vrstva znovu zamčená |
| `swatches[1]` a `registrationColor()` | `[Registrační]`, SpotColor, `REGISTRATION` |
| podvrstva „Grommet Marks" + `getOrCreateLayer()` | nová vrstva nejvyšší úrovně (G13) |
| `app.coordinateSystem` přepnutý v jednom volání, čtený v dalším | zase DOCUMENT — trvalost se neprojevila |
| ScriptUI `edittext.text = null` / `undefined` | text „null" / „undefined", bez výjimky (U6) |

Podrobnosti DOM: [`extendscript-engine-facts.md`](../extendscript-engine-facts.md),
sekce „Styl nových cest, Large Canvas a geometrie cest".

### Reprodukce v Node

Produkční moduly z `src/` a `tests/lib/mock_scriptui.js`; `GM.Main.process()`
nad falešným dokumentem se záznamem volání `placeMarkGroup`. Výsledky jsou
u G3, G6, G7, G8, G10, G12 a U7. Mock nepřevádí číselný `dropdownlist.selection`
na položku seznamu, sonda převodu jednotek proto nastavuje položku přímo.

## 9. Top 5 podle poměru přínosu k práci

1. **G1** — dělit délky a tloušťky tahů `doc.scaleFactor`. Pár řádků, vzor
   v ZSM. Brání značkám 70 mm od kraje na velkých bannerech.
2. **G2** — výslovný styl tahu v `_strokeEllipse` a `_strokeCross`. Čtyři
   řádky na funkci. Brání čárkovaným značkám.
3. **G6** — vyhodit shodné sousední kotvy v `getSelectedPathInfo` a přidat
   test. Asi deset řádků. Brání rohu bez oka.
4. **G3** — zapnuté zóny přepnou hrany na Rozestup a zakážou Počet. Malá úprava
   UI a test. Výstup přestane odporovat dialogu.
5. **G4 + G5** — označit značky, u existujících nabídnout Nahradit, skrytou
   vrstvu nenechat skrytou. Z pětice nejvíc práce a jedno UX rozhodnutí, ale
   řeší nejčastější provozní chybu.

Hned za nimi, s malou prací:
- G9 (odložit poškozený soubor nastavení, atomický zápis),
- D2 (vytáhnout artboardovou matematiku do jádra — podmínka testů pro G1 a G3),
- U3 a T1 (jednotky u polí, opravené tooltipy).

## 10. Neověřeno

- Běh přes Soubor › Skripty (undo, rychlost tvorby značek).
- Dědění stylu při výběru myší a po zrušení výběru; dědění `opacity`
  a `blendingMode` (G2).
- Jak často mají zákaznické kontury zdvojený uzavírací bod (G6) a křivky
  s jednou staženou úchytkou (G12).
- Live Corners (G11).
- Jestli značky čte kamera stroje a jak by zvládla čárkovaný kruh (G2).
- `doc.layers.add()` s aktivní podvrstvou (stejná výhrada jako v ZSM review) —
  `getOrCreateLayer` ho volá. V sondě s podvrstvou (G13) proběhl bez pádu,
  aktivní vrstva se ale nekontrolovala.
