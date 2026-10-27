# Changelog

Všechny podstatné změny skriptu Zünd & Summa Marks. Formát vychází z
[Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), verzování dle
[SemVer](https://semver.org/lang/cs/).

## [Unreleased]

Čistý tah, měřítko kresby z dokumentu a jazyk společný všem nástrojům
([návrh](../docs/specs/2026-10-23-zund-summa-marks-1.2.0-design.md)). Kódy
v závorkách odkazují na audity společného jazyka
([2026-10-14](../docs/reports/2026-10-14-audit-spolecneho-jazyka.md),
[2026-10-17](../docs/reports/2026-10-17-dodatecny-audit-spolecneho-jazyka.md)).

### Přidáno

- **Měřítko kresby patří dokumentu (P12).** V panelu Nastavení výstupu je
  jeden řádek **Měřítko kresby 1:**, stejně jako v Grommet Marks a Tile
  Exportu. Pole se
  při otevření vyplní měřítkem, které si pamatuje dokument; dokument bez
  měřítka začne na 1. Hodnoty v dialogu se dál zadávají ve skutečné velikosti.
  Platí číslo od 1 do 100, i desetinné (1:2,5); cokoli jiného pole zčervená
  a Generovat zašedne. Dřív platila jen celá čísla 1–10: „2,5“ tiše běželo
  jako 1:2 a překlep „1O“ jako 1:1. Do předvoleb ani do posledního běhu se
  měřítko neukládá a přepnutí režimu, výběr předvolby ani tlačítko Výchozí ho
  nemění — dřív se po zakázce 1:10 další zakázka 1:1 otevřela v 1:10 a značky
  vyšly desetkrát menší, když jste to přehlédli. Dokument si měřítko pamatuje
  ve stejném klíči jako Tile Export a Grommet Marks: dokument, kterému
  měřítko zapsal Tile Export, otevře Zünd & Summa Marks s tímto měřítkem
  a obráceně (ověřeno s vydaným Tile Exportem 1.1.0). Do dokumentu se zapíše
  až po běhu, který kreslil, a jen když se změnilo; odmítnutý běh nechá
  dokument beze změny. V měřítku 1:1 vycházejí polohy i velikosti značek,
  pruhu a linek stejně jako v 1.1.0, v 1:10 přesně desetinové (změřeno
  v Illustratoru).
- **Stavový řádek říká, co skript v dokumentu našel (J8).** Šedý řádek nad
  tlačítky ukazuje režim, ve Fixed velikost artboardu ve skutečné velikosti
  (artboard × měřítko), měřítko, když není 1:1, a všechny známé řezové barvy,
  které skript v dokumentu našel (CutContour, Thru-cut, Kiss-cut, Cut; u dvou
  a více nejdřív počet všech a nejvýš dvě jména), nebo „řez nenalezen“, při
  zapnutém Pouze značky „pouze značky“: `ZUND · artboard 1 560 × 3 050 mm ·
  1:10 · řezy (2): „Thru-cut“, „Kiss-cut“`. Měřítko a počet stojí před jmény,
  aby je dlouhý seznam při zkrácení řádku neschoval.
  Dřív opakoval nastavení dialogu a „vrstvy: N“ počítalo řádky mapování, ne
  vrstvy v dokumentu. V režimu Dle grafiky a v SUMMA rozměr grafiky
  neuvádí: změřit grafiku před otevřením dialogu trvá na velkém dokumentu
  sekundy (20 000 cest 4 s, změřeno) a dialog by se o tolik později otevřel
  i pro Storno.

### Změněno

- **Dokument z 1.1.0 v měřítku je potřeba jednou zadat.** Dokument kreslený
  ve verzi 1.1.0 v měřítku ho v sobě nemá a otevře se
  v 1:1 — vidět je to v poli; měřítko jiné než 1:1 je navíc v titulku a ve
  stavovém řádku. Zadejte měřítko jednou do pole, po Generovat si ho dokument
  pamatuje. Měřítko uložené v předvolbách a v posledním běhu verze 1.1.0 se
  ignoruje a při dalším uložení ze souboru nastavení zmizí.
- **Zpět vrací značky a artboard, ne měřítko.** Běh ZUND s mapováním vrátí
  dva kroky Zpět (Cmd+Z) — nejdřív značky a vrstvy, pak artboard —, běh SUMMA
  s mapováním a ořezovými linkami čtyři, poslední z nich artboard; další krok
  už vrací vaši úpravu z doby před spuštěním (změřeno přes Úpravy › Zpět
  volané skriptem, běh z menu Soubor › Skripty ověřuje ruční test). Zápis
  měřítka do dokumentu v žádném z těch kroků není: po Zpět zůstane
  v dokumentu měřítko vráceného běhu a další dialog ho nabídne (přepište
  pole; dokument bez měřítka dostanete zadáním 1 a jedním Generovat).
- **Čísla v polích se čtou jedním způsobem (N1, P1, N6).** Pole, živá
  kontrola, Generovat, Uložit i přepnutí režimu čtou číslo stejně jako Tile
  Export a Grommet Marks: desetinná čárka i tečka, mezery okolo. `1O5`,
  `1 000`, `20 mm`, `1e3`, `0x10` i `.5` jsou neplatné pole. Dřív živá
  kontrola četla „1O5“ jako 1 a pole nezčervenalo (zastavil ho až alert),
  „0x10“ v poli s minimem 0 prošlo a nakreslilo se 16 mm a Uložit nebo
  přepnutí režimu tiše uložilo „1O5“ jako 1. Desetinná čárka zůstane čárkou:
  „2,5“ se po dalším otevření ukáže zase jako „2,5“, ne „2.5“, a meze
  v hláškách se píšou s čárkou („0,1–50“).
- **Uložit a Uložit jako… jsou šedé, dokud je některé pole neplatné (N3)**,
  takže předvolba nikdy neuloží hodnotu, kterou další otevření nepřečte;
  důvod ukáže stavový řádek. Zašedlá Mezera od grafiky (Dle artboardu) se
  uloží s hodnotou, kterou nese.
- **Předvolby se chovají jako v ostatních nástrojích (P5, J3).** Hvězdička
  stojí jen u aktivní předvolby a po přepnutí na jinou zmizí i u té předchozí
  (dřív u ní zůstala). [Výchozí] jsou tovární hodnoty režimu, který máte
  otevřený: v SUMMA už nemá trvale „*“ a jeho výběr ze seznamu i ↺ nechají
  dialog v SUMMA (dřív přepnuly do ZUND). Věty jsou jako v ostatních
  nástrojích: „Název nové předvolby:“, „Předvolba „…“ už existuje.
  Přepsat?“ s názvem předvolby, prázdný nebo mezerový název hlásí „Zadejte
  název předvolby.“. ↺ stojí ve vlastní skupině vedle seznamu a Uložit,
  Uložit jako… a Smazat mají přirozenou šířku (dřív 92 px, na „Uložit jako…“
  nestačilo).
- **Slovník Zünd parametrů jako v Tile Exportu (J1).** Rozteč značek se
  jmenuje **Max. rozteč značek**, Velikost Zünd **Průměr značky**, Barva
  značek (Spot) **Barva značek**; nápověda odsazení orientační značky říká,
  že jde o mezeru mezi okraji značek. „artboard“ se píše malým písmenem:
  zdroj se jmenuje **Dle artboardu (Fixed)**.
- **Hlášky jako v ostatních nástrojích (J5, J6).** Blokující chyba začíná
  `CHYBA:` (dřív ji neměla vyhrazená vrstva, prázdný dokument, řádek vrstvy
  bez názvu ani validace), upozornění po běhu `UPOZORNĚNÍ:`; názvy stojí
  v „…“ (dřív ‘…’) a žádná hláška nekončí vykřičníkem. Validace říká
  „Mezera od okraje: zadejte číslo od 0 do 1000 mm.“ pro překlep i pro
  hodnotu mimo rozsah. Bez dokumentu: „Před spuštěním skriptu otevřete
  dokument.“ Neočekávaná chyba má šablonu rodiny: co se stalo (s řádkem
  česky), v jakém stavu může být dokument a komu hlášku poslat. Pád při
  kreslení radí vrátit změny několika kroky Zpět (Cmd+Z) a připomene, že
  změna artboardu je samostatný krok — dřívější rada Soubor › Vrátit by
  zahodila i neuloženou práci z doby před spuštěním. Hláška prázdného
  dokumentu a příliš velkého artboardu končí větou „Dokument nebyl
  změněn.“ Registrační barva se v textech jmenuje slovy. Neuložené nastavení
  po Generovat říká následek: „…příště se dialog otevře s předchozími
  hodnotami. Značky se vykreslí.“ Oslovení a podpis (J2, J4) byly podle
  kánonu už v 1.1.0.
- **Důvod šedého Generovat je červený se symbolem ✗ (J7)**, ne jantarový
  s ⚠: u jednoho neplatného pole jeho jméno a povolený rozsah, u víc polí
  jejich počet.
- **Dialog je 465 px široký (dřív 448 px) a o 3 px vyšší:** ZUND 720 px,
  SUMMA 756 px (1.1.0: 717 a 753 px), česky i anglicky stejně; změřeno
  v Illustratoru bez zobrazení okna. Šířku určuje stavový řádek, který se
  zakládá pro nejdelší text, jaký může ukázat (425 px), panel předvoleb je
  vyšší o tlačítko ↺ v přirozené výšce. S osmi řádky mapování měří dialog
  923 px (SUMMA 932 px), skoro stejně jako 1.1.0 (920 a 932 px), a na menší
  displej se nevejde.
- Úvodní kurzor v režimu Dle artboardu míří na první pole, do kterého jde
  psát (dřív na zašedlou Mezeru od grafiky).

### Opraveno

- **OPOS pruh a ořezové linky mají vždy plný tah (P3).** Když byla
  naposledy vybraná čárkovaná cesta (perforace), nakreslil skript pruh jako
  řetěz zaoblených článků o 3 mm delší a ořezové linky čárkované; zrušení
  výběru styl nevrátí. Pruh i linky si teď nastaví plný tah s rovnými konci.
  Ověřeno v Illustratoru s vybranou čárkovanou cestou s kulatými konci: pruh
  je plný a viditelně stejně dlouhý jako grafika (PNG prohlédnuté). Značky
  Zünd a Summa tah nemají a netýkalo se jich to.
- **Cizí obsah ve vrstvě Regmarks zůstane.** Když vrstva Regmarks neměla
  podvrstvu Zünd ani Summa, skript smazal celý její obsah — i značky v PDF
  plátu, které Tile Export exportoval v režimu Zünd (ten je kreslí přímo do
  vrstvy Regmarks), nebo vlastní obsah.
  Teď mění jen své podvrstvy „Zünd“ a „Summa“ a na konci běhu upozorní,
  kolik cizích objektů ve vrstvě zůstalo. Ve staré zakázce z doby před 1.0.0
  zůstanou staré značky vedle nových; upozornění řekne kde.
- **Skrytá vrstva Trim se ohlásí**, když ji skript zviditelní, jako Regmarks
  a mapované vrstvy (dřív bez hlášky).
- **Nepodařené odstranění staré podvrstvy se ohlásí.** Dřív ho spolkl tichý
  catch a skript přidal druhou podvrstvu stejného jména se starými značkami
  pod novými. Teď ho počítá jako chybu kreslení a druhou podvrstvu nezaloží.
  Výstup Summa, který se po běhu ZUND nepodaří odstranit, skript také ohlásí.
- **Registrační barva se najde i za nečitelným vzorníkem.** Vzorník, jehož
  barvu nejde přečíst, ukončil hledání a značky vyšly ve 100 % K bez hlášky.
  Oprava je ve sdíleném modulu; Grommet Marks a Tile Export ji dostanou od
  svého příštího buildu.
- **Důvod „barva je přiřazena více vrstvám“ se ve stavovém řádku vejde
  celý.** V 1.1.0 se uřízl (anglicky o 80 px); s barvou „CUTCONTOUR“ je to
  nejširší důvod, jaký řádek ukazuje.

## [1.1.0] — 2026-10-03

Opravy z code review 2026-09-26
([report](../docs/reports/2026-09-26-code-review-zund-summa-marks.md)) a úpravy
z auditu UI 2026-09-28
([audit](../docs/reports/2026-09-28-audit-ui-zund-summa-marks.md)).

### Změněno

- **Režim „Dle výběru" se jmenuje „Dle grafiky" (audit A1).** Režim nikdy
  nečetl výběr: značky i artboard počítá kolem veškeré grafiky v dokumentu,
  i ve skrytých vrstvách a mimo artboard. Popisek, nápověda, README i hláška
  prázdného dokumentu teď říkají, co skutečně dělá — dřívější „Nic není
  vybráno" posílalo operátora vybírat, i když dokument neměl žádnou grafiku.
  Režim, který by značky umístil jen kolem výběru, zůstává otevřený (review K4).
- **Výchozí předvolba mapuje řezovou vrstvu na barvu řezu z dokumentu (audit
  A2).** Řádek „Cut ← [Registration]" se od opravy K8 při každém běhu přeskočil
  s upozorněním, takže každý běh s [Výchozí] končil hláškou, kterou se operátor
  naučil odklikávat. [Výchozí] teď vezme řezovou barvu, kterou skript
  v dokumentu najde (CutContour, Thru-cut, Kiss-cut nebo Cut). Vlastní
  předvolby zůstávají, jak jsou uložené.

### Opraveno

- **Skrytá vrstva Regmarks už nezpůsobí tiché ztracení značek (K12).** Opakovaný
  běh se skrytou vrstvou Regmarks smazal staré značky a nové nevykreslil, bez
  jakékoli hlášky; skrytá mapovaná vrstva zase tiše nechala řezové cesty na místě.
  Skript teď skryté vrstvy, do kterých zapisuje, zviditelní a oznámí to. Objekt,
  který se přesto nepodaří vykreslit (značka, OPOS pruh, ořezová linka), ohlásí
  jako chybu s počtem.
- **Přesun řezových cest už nemění tisk (K1).** Objekt, který měl vedle řezové
  barvy i tiskovou výplň nebo tah (typicky podkladový tvar samolepky s řezovým
  tahem), se přesunul do řezové vrstvy nad grafiku a jeho výplň dostala přetisk —
  grafika pod ním zmizela, nebo změnila barvu. Takový objekt teď zůstane na místě
  a skript ho ohlásí s výzvou k rozdělení; přesouvají se jen cesty čistě v řezové
  barvě.
- **Skrytá spodní vrstva zůstane skrytá (K3).** Nejspodnější vrstvu skript
  přejmenoval na „Graphics" a zviditelnil, i když byla skrytá (šablona, náhled od
  zákazníka, stará verze) — a ta se pak tiskla. Skrytou spodní vrstvu teď nechá
  beze změny; přejmenovává jen viditelnou.
- **Nepřesunuté řezové cesty se hlásí (K2).** Cesty v řezové barvě uvnitř
  ořezové masky, v zamčené podvrstvě nebo ve skryté vrstvě zůstaly tiše na místě;
  stačilo, aby se přesunula jediná, a běh vypadal úplný. Skript je teď spočítá
  a ohlásí i s důvodem. Hláška „barva nebyla nalezena" se v takovém případě už
  neobjeví.
- **Registrační barva už neurčuje řezové cesty (K8).** Výchozí mapování
  „Cut ← [Registration]" v anglickém Illustratoru přesunulo do vrstvy Cut všechno
  v registrační barvě (ořezové značky, značky jiných nástrojů), v české verzi
  nepřesunulo nic a ohlásilo nenalezenou barvu. Řádek s registrační barvou teď
  skript přeskočí a vysvětlí proč.
- **Rychlejší přesun cest na velkých dokumentech (K13).** Každý řádek mapování
  procházel celý dokument znovu; na velkém dokumentu s několika řádky to vypadalo
  jako zamrznutí. Teď se dokument projde jednou pro všechny řádky — na 3900
  cestách a třech řádcích klesl celý běh z 2,4 s na 1,1 s a rozdíl roste
  s počtem řádků.
- **Vrstva „Trim" od uživatele už nepřijde o obsah (K6).** Skript považoval každou
  vrstvu „Trim" za svou: při obnově ořezových linek smazal celý její obsah a při
  vypnutých linkách celou vrstvu. Řádek mapování s názvem „Trim" tak přišel
  o právě přesunuté řezové cesty. Mapování na vrstvy Regmarks a Trim se teď
  odmítne dřív, než se dokument změní, a ve vrstvě Trim skript maže jen své
  vlastní linky (nově je označuje; linky ze starších verzí pozná podle vzhledu).
- **Chyba během běhu už nenechá dokument napůl změněný (K10).** Běh ZUND smazal
  výstup Summa dřív, než ověřil, že nový artboard půjde nastavit; příliš velký
  artboard pak skončil obecnou chybou a na dokumentu nezůstaly žádné značky.
  Neplatně spočítané značky se tiše vynechaly. Teď se nejdřív ověří geometrie
  a artboard a výstup Summa se odstraní až potom; příliš velký artboard ohlásí
  svůj rozměr a dokument nechá beze změny. Kritická chyba během vykreslování
  upozorní, že dokument může být částečně změněný.
- **Běh skriptu jde vrátit přes Zpět (K11).** Změna artboardu se zapsala do
  stejného kroku historie jako ostatní změny a Zpět ji nevrátilo: vrstvy
  a značky se vrátily, artboard zůstal zvětšený. Teď má vlastní krok — celý běh
  se vrátí několika kroky Zpět (SUMMA s mapováním a ořezovými linkami: 4)
  a další krok už vrací až úpravy před spuštěním skriptu.
- **Značky, které by splynuly nebo se nevešly na artboard, zastaví běh (K7).**
  Orientační značka stojí vždy o odsazení a velikost značky vpravo od levé
  dolní rohové, ať je grafika jakkoli široká. S výchozím nastavením tak
  u grafiky široké 85–95 mm padla na pravou dolní rohovou značku (u 90 mm
  přesně na ni), na dlouhých hranách se mohla dotknout mezilehlé a ve Fixed
  módu s artboardem užším než 110 mm ležela mimo artboard — bez jakékoli
  hlášky. Teď běh skončí dřív, než se dokument změní, a hláška řekne, kterou
  hodnotu upravit. Blokuje se dotyk a překryv; značky s i malou mezerou
  projdou, protože jakou mezeru potřebuje kamera, zatím ověřené není.
- **Předvolba jiného módu přepne dialog (K5).** Výběr uložené předvolby SUMMA
  v dialogu ZUND (a naopak) načetl její hodnoty do polí aktuálního módu
  a dialog zůstal ZUND — Generovat pak vytvořilo značky Zünd a jediným
  náznakem byla „*" u předvolby. Stejně se choval ↺. Teď se dialog přepne do
  módu předvolby a ukáže její hodnoty.
- **Upozornění na barvu bez cest říká, o kterou vrstvu jde (audit A7).** Hláška
  „Přiřazená barva nebyla v dokumentu nalezena" se ukázala i tehdy, když barva
  ve Vzornících byla, jen v ní nebyla žádná cesta, a neuvedla vrstvu. Teď zní
  „Vrstva ‘Cut’: v barvě ‘Cut’ není v dokumentu žádná cesta, nic se nepřesunulo.
  Zkontrolujte barvu řezových cest."
- **Úprava druhého režimu přežije běh v tom prvním (audit A3).** Hodnoty režimu,
  který dialog právě neukazuje, se braly z aktivní předvolby: neuložená úprava
  SUMMA (třeba horní výjezd 90) po jednom běhu ZUND zmizela a další zakázka
  SUMMA tiše vyšla s hodnotou z předvolby. Teď se berou z posledního běhu,
  případně z předvolby, kterou operátor v dialogu vybral.
- **Nápovědy říkají, co skript opravdu dělá (audit A5, A6, A9).** Mezera od
  grafiky se měří k okraji značky, ne k jejímu středu. Nabídka předvoleb už
  neradí vybrat [Last Settings], která v ní není. Pouze značky upozorní, že
  artboard se přizpůsobí i v tomto režimu, pokud není zvoleno Dle Artboardu.
- **Registrační barva se pozná podle typu, ne podle pozice ve Vzornících.**
  Skript bral jako registraci druhou položku Vzorníku. V dokumentu, kde tam
  registrace není, stojí na tom místě Bílá — značky by vyšly bílé a kamera
  řezacího stroje by je neviděla. Teď skript registraci najde podle typu barvy;
  když v dokumentu chybí, kreslí značky 100 % K.

## [1.0.0] — 2026-06-28

První veřejné vydání (re-baseline). Sjednocení verzí napříč sadou pro open-source
release; funkčně navazuje na interní řadu v26.x (viz níže).

---

> **Poznámka k číslování.** Verze `v26.x` níže patří **interní řadě** před veřejným
> vydáním — čísla jsou historická reference, ne veřejná řada. Veřejná řada začíná
> na 1.0.0.

## Před veřejným vydáním (interní řada)

### v26.5.1 (2026-06) — Hotfix: idempotence Trim vrstvy + nálezy z code review
- **Fix (kritický, regrese v26.5.0):** Top-level vrstva „Trim" se měřila do bounds → každé další spuštění SUMMA s ořezovými linkami zvětšilo artboard. `ZSM.Bounds.get` ji nyní přeskakuje; „Trim" se ani nenabízí v dropdownu vrstev.
- **Fix:** SUMMA běh s vypnutými ořezovými linkami odstraní zastaralou vrstvu „Trim" z předchozího běhu (ZUND ji nechává — patří k SUMMA layoutu).
- **Fix:** `Storage.save` kontroluje open/write/close a vrací úspěch — selhání zápisu už není tiché.
- **Fix (UX):** Psaní víceciferného měřítka nezamkne pole po první číslici; pole 1:N je v live-validaci.
- **Fix (UX):** Po Uložit se tlačítka Uložit/↺ správně deaktivují.
- **Fix:** Názvy předvoleb tvaru `[Text]` jsou rezervované; závorky uvnitř názvu zůstávají povolené.
- **Fix:** Fixed režim neblokuje Generovat kvůli neaktivnímu poli „Mezera od grafiky".
- **Chore:** `ZSM.Config.layerTrim` konstanta; přehláska v patičce; ošetřen `e.line`.

### v26.5.0 (2026-06) — Phase 3: pouze značky + UI polish + crash fix
- **Feat:** Režim **„Pouze značky (neměnit vrstvy)"** — pro dokumenty s už separovanými vrstvami.
- **Feat:** Tlačítko **↺ Revert** vedle dropdownu předvoleb — vrátí aktivní předvolbu na uložené hodnoty.
- **Change:** Ořezové linky (SUMMA) jdou vždy do samostatné top-level vrstvy „Trim" (oba režimy).
- **Change:** Tlačítko **Reset odstraněno** — tovární hodnoty přes `[Výchozí]`, návrat řeší ↺.
- **Fix (kritický, CZ locale):** Falešná `*` u předvoleb s registrační barvou — `canonColor()` normalizuje čtení.
- **Fix (kritický):** Zaseknutý dialog po neplatné hodnotě — `setUIValues` spouští re-validaci.
- **Fix (kritický, C++ crash):** Vytváření top-level „Trim" při aktivním sublayeru shazovalo Illustrator — reset `activeLayer` + commit před `doc.layers.add()`.

### v26.4.0 (2026-05) — Phase 2: manuální měřítko + review-round hardening
- **Feat:** Manuální měřítko 1:N (`scaleN`, 1–10) — `getEffectiveSF()` skládá Large Canvas × scaleN pro core.js i draw.js (oprava: dříve se v 1:10 nezmenšily značky).
- **Fix (prepress-safe):** `getCol` už NEvytváří tiše náhradní spot — chybějící barva → fallback `[Registration]` + neblokující upozornění.
- **Fix (preset robustnost):** chybějící swatch/vrstva se zachová jako „(chybí)"; chybějící cílová vrstva se vytvoří.
- **Fix:** Mazání předvolby vyžaduje potvrzení; silent `catch {}` kolem `Storage.save` sjednoceny do `persistSettings()`.
- **Chore:** `build.sh` version parity guard; artifact-layer kontroly → `ZSM.Bounds.isArtifactLayer`.

### v26.3.2 (2026-05) — Phase 1 patch: 1:10 workflow unblock
- **Fix:** Validace `maxDist` — minimum sníženo 50 → 5 mm (odblokování zmenšeného dokumentu).
- Regresní testy + dokumentace 1:10 workflow.

### v26.3.1 (2026-03)
- Opravy: `endSession()` obnova viditelnosti, `getBounds()` přeskakuje skryté/vodítka, `Storage.save()` try-catch, propagace přejmenování „Graphics", logování v prázdných catch, globální `replace(/,/g, ".")`.
- Migrace: locale-independent default key (`[Výchozí]` → `[Default]`), odstranění `layers[].active`.
- UI: přeuspořádání sloupců Layer → Color, sjednocení spacing.

### v26.3.0 (2026-02-22)
- Přepis namespace `PMA` → `ZSM`; nový `locale.js` (EN/CS, `app.locale` detekce).
- Preset systém (`[Last Settings]`, ochrana `[Default]`); dynamické vrstvy `layers[]`.
- Opravy: `drawRed` pro SUMMA, `markSizeZ/S` fallback; migrace v26.0 → v26.3.

### v26.2.x — v26.0 (2025–2026)
- Viz git history.
