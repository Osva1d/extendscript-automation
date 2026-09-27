# Code review — zund-summa-marks

Datum: 2026-09-26. Rozsah: celé `zund-summa-marks/src/` a sdílené
`shared/lib/cut_marks.js` a `shared/lib/ui_state.js` ve stavu `main` (c87ddb0),
chováním shodné s `zund-summa-marks/v1.0.0`. Zadání: nástroj používají operátoři
v prepressu pod tlakem a chyba znamená zkažený tisk nebo řez, takže správnost má
přednost před elegancí.

Review je jen analýza — v kódu se nic neměnilo. Cesty v textu jsou relativní
k `zund-summa-marks/`. Výjimkou jsou cesty začínající `shared/` a
`grommet-marks/`, které jsou relativní ke kořeni repa.

## Metoda

- Přečtený celý kód. Testy prošly (13/13 sad) a `npm run lint` je čistý.
- Geometrie okrajových případů spočítaná v Node nad skutečným `cut_marks.js`.
- Sondy v Illustratoru 30.8.1 (cs_CZ) přes `tools/ai-eval.sh`:
  - každá sonda běžela ve vlastním dočasném dokumentu a sama se přerušila, když našla otevřený jiný dokument;
  - moduly ZSM se nahrály z `src/` do rozsahu jedné funkce, takže v enginu nezůstal globální `ZSM`;
  - bez dialogu a bez `storage.js`, takže se uživatelovo nastavení nečetlo ani nepsalo;
  - výsledky jsou exportované do PNG a PDF a prohlédnuté; PDF se vyrenderovala Popplerem 26.04 se simulací přetisku i bez ní.
- Naměřené chování DOM je zapsané v
  [`extendscript-engine-facts.md`](../extendscript-engine-facts.md), sekce
  „Undo, kolekce, skryté vrstvy a masky".

**Výhrada:** sondy běží přes AppleScript `do javascript`, ne přes Soubor › Skripty.
U undo (K11) se to může lišit. Jeden ruční běh z menu to potvrdí.

**Závažnost:** critical / major / minor / nit.
**Jistota:**
- *ověřeno živě* — sonda v Illustratoru,
- *ověřeno* — kód nebo výpočet,
- *pravděpodobné*,
- *spekulace*.

## 1. Shrnutí

Nejvážnější problémy nejsou v geometrii, ale v tom, jak skript zachází s cizími
objekty a vrstvami v dokumentu. Hlavní body:

- **Tichá ztráta značek (K12).** Opakovaný běh se skrytou vrstvou Regmarks staré
  značky smaže a nové nevykreslí, bez chyby i bez varování.
- **Zkažený tisk (K1).** Objekt s tiskovou výplní a řezovým tahem se přesune do
  řezové vrstvy nad grafiku a jeho výplň dostane přetisk.
- **Neúplný řez (K2).** Cesty v ořezových maskách, zamčených podvrstvách
  a skrytých vrstvách se tiše nepřesunou.
- **Tisk skrytého obsahu (K3).** Skrytá spodní vrstva se zviditelní.
- **Špatná technologie (K5).** Výběr předvolby nepřepne ZUND/SUMMA.
- **Undo (K11).** Běh nejde čistě vrátit přes Zpět — artboard zůstane zvětšený.

Pod testy je logika dobře pokrytá. Mock Illustratoru ale nemodeluje zamčené ani
skryté vrstvy a jeho `move()` nikdy neselže — přesně tyhle případy proto testy
nevidí.

Co je v pořádku a nesahal bych na to:
- validace čísel před změnou dokumentu a blokace duplicitní barvy,
- žádné automatické vytváření swatchů, clip-aware bounds, vracení zámků vrstev,
- idempotentní opakovaný běh, pravidlo „Summa vždy vně",
- jednotný `getEffectiveSF` pro Large Canvas i 1:N.

Storno je čisté: dokument se nezmění a na disk se zapíše jen to, co operátor
výslovně uloží nebo smaže přes Uložit, Uložit jako a Smazat.

## 2. Chyby a okrajové případy

### K1 · critical · ověřeno živě — přesun cest mění tisk

**Kde:** `src/draw.js:641–645` a `:681–683`, shoda barvy `:702–713`, pořadí vrstev `:214–216`.

**Problém:** `_matchesSpotColor` hledá shodu na tahu nebo na výplni. Pak se přesune celý objekt a `fillOverprint = true` se nastaví, kdykoli je objekt vyplněný. Řezová vrstva přitom stojí nad grafikou.

**Dopad** (naměřeno skutečným během): samolepka se žlutou výplní, řezovým tahem a purpurovým kruhem navrch. Po běhu je tvar ve vrstvě Cut nad grafikou a má přetisk výplně. PDF bez simulace přetisku kruh zakryje, se simulací je kruh červený. Ani jedno neodpovídá originálu. U bílé výplně s přetiskem zmizí podklad.

Test `tests/test_draw_render.js:357` takovou cestu obsahuje (mock má výplň standardně zapnutou), ale přetisk výplně nekontroluje.

**Návrh:** přetisk nastavovat jen na atributu, který se shodoval. Objekt, který sedí jen tahem a má tiskovou výplň, nepřesouvat, ale nahlásit („cesta má řezový tah i tiskovou výplň — rozděl ji"). K tomu test na oba případy.

### K2 · major · ověřeno živě — neúplné řezové vrstvy bez varování

**Kde:** přeskočení clip group `src/draw.js:633`, `:666`; tichý `catch (e) {}` `:648`, `:685`; varování jen při nulovém přesunu `:207–209`; `beginSession` odemyká jen top-level vrstvy `:29–46`.

**Naměřeno** na sedmi řezových cestách:
- **Nepřesunou se** cesty v zamčené podvrstvě, ve skryté vrstvě a v ořezové masce. `move()` u prvních dvou hází a výjimka se spolkne.
- **Přesunou se** objekt s vlastním zámkem (Objekt › Zamknout) a skrytý objekt — skrytý se přesune a zůstane skrytý.
- `movePaths` přesto vrátí `true`, bez varování i bez logu.
- Komentář `src/draw.js:26` platí: skryté staré kontury se do řezové vrstvy nestáhnou.

**Dopad:** když se z 200 řezových cest přesune 190, operátor se to nedozví a stroj 10 kontur nevyřízne.

**Návrh:** `movePaths` ať vrací počty (přesunuto / v masce / zamčená podvrstva / skrytá vrstva / chyba) a závěrečné hlášení je vypíše. Každé přeskočení = varování s důvodem.

### K3 · major · ověřeno — skrytá spodní vrstva se přejmenuje a zviditelní

**Kde:** `src/draw.js:338–369`, konkrétně `:358–359`.

**Problém:** nejspodnější nemapovaná vrstva dostane název „Graphics" a `visible = true`. `endSession` vrací zámky, viditelnost ne.

**Dopad:** skrytá šablona, zákazníkovo kontrolní PDF nebo stará verze se po běhu zobrazí a vytiskne.

**Návrh:** viditelnost uživatelských vrstev neměnit a skrytou spodní vrstvu nepřejmenovávat (nebo varovat). Společná zásada s K12 je v §8.

### K4 · major · ověřeno (kód + TEST 10) — „Dle výběru" výběr nečte

**Kde:** `src/lib/bounds.js:51` výběr zruší, `:65–106` měří všechny vrstvy; `doc.selection` se v `src/` nikde nečte. Proti tomu texty `src/locale.js:50`, `:167`, `:169` a `README.md:51` („Vyžaduje, aby byla grafika vybrána").

**Problém:** do bounds jde obsah skrytých a netiskových vrstev, skryté objekty, poznámky na pasteboardu i grafika z ostatních artboardů. Aktivní artboard se roztáhne přes to všechno. Hláška „Nic není vybráno" (`src/main.js:77`) se objeví jen u dokumentu bez grafiky. Komentář `src/draw.js:26` tvrdí opak než `src/lib/bounds.js:35`.

**Co dnešní chování garantuje:** značky nikdy nepřekryjí žádnou grafiku v dokumentu, ani skrytou. Je to legitimní volba, jen je špatně pojmenovaná.

**Návrh:** když je něco vybráno, měřit výběr (clip-aware přes `_getEffectiveBounds`). Jinak měřit celý dokument, ale jen viditelné a tiskové vrstvy, a při více artboardech varovat. Minimum: přejmenovat režim na „Dle grafiky v dokumentu" a opravit texty.

### K5 · major · ověřeno — výběr předvolby nepřepne režim

**Kde:** `src/ui.js:822–831` volá `setUIValues`, který režim ignoruje (`:664–670`); stejně Revert `:906–911` a `shared/lib/ui_state.js:154–159`.

**Problém:** v ZUND dialogu vybereš předvolbu „Summa banner", dialog zůstane ZUND a do svých polí načte její hodnoty. U předvolby se objeví jen „*".

**Dopad:** Generovat vytvoří značky Zünd.

**Návrh:** když `r.settings.mode !== mode`, uložit předvolbu do `[Last Settings]` a zavolat `requestModeSwitch(r.settings.mode)`.

### K6 · major (dopad critical, pravděpodobnost nízká) · ověřeno — vrstvu „Trim" skript považuje za svou

**Kde:** `src/draw.js:330–334`, `:408–411`, `:432–452`; legacy úklid Regmarks `:137–139`; bounds vrstvu Trim vynechávají `src/lib/bounds.js:80`; validace `src/ui.js:976–983` hlídá jen prázdný název.

**Problém:** dvě cesty ke ztrátě dat.
- Operátor napíše do tabulky vrstev „Trim": krok 3 do ní přesune řezové cesty a běh SUMMA ji v kroku 7 vyčistí, nebo ji při vypnutých ořezových linkách smaže celou.
- Dokument už vlastní vrstvu „Trim" má, třeba předseparovaný dokument v režimu „Pouze značky": dopadne stejně.

`getLayerNames` rezervované názvy jen skryje v dropdownu (`src/draw.js:911–912`), edittext je propustí.

**Návrh:** rezervované názvy (Regmarks, Trim, Graphics, Zünd, Summa) blokovat v live validaci i v `btnOk`. Robustněji: mazat jen objekty, které skript vytvořil. Označit je jde přes `pageItem.note` — vlastnost existuje a jde zapsat (změřeno).

### K7 · major · geometrie ověřena výpočtem a vidět na renderu, vliv na kameru Zünd je spekulace — orientační značka koliduje

**Kde:** `shared/lib/cut_marks.js:149`, `addSteps` bez výjimky `:152–155`; `warnings` Core nikdy neplní `:128`.

**Problém** (výchozí hodnoty: mezera 5, Zünd 5, orient 100):

| šířka grafiky | orientační vs. pravá dolní rohová (osově) |
|---|---|
| 80 mm | 10 mm, orientační stojí za rohem mimo obdélník značek |
| 85 mm | 5 mm — dotýkají se |
| 88 mm | 2 mm — překryv |
| **90 mm** | **0 mm — leží přesně na sobě** |
| 92 mm | 2 mm — překryv |
| 95 mm | 5 mm — dotýkají se |
| 100 mm | 10 mm (vidět i na renderu k K1) |

Při rozteči kolem 105–110 mm padne mezilehlá značka 3–4 mm od orientační (spočítáno pro 1000/105 a 1500/110 mm). V režimu Fixed s artboardem užším než ~110 mm leží orientační značka mimo artboard.

**Dopad:** stroj může přijít o informaci o orientaci archu. Nic z toho nevyvolá varování.

**Návrh:** přidat do Core kontrolu kolizí (vzdálenost menší než průměr + odstup) a značku posunout, nebo zablokovat s varováním. Ve Fixed ověřit, že všechny značky leží na artboardu. Oprava platí jednou i pro tile-export.

### K8 · major v EN Illustratoru, minor v CZ · CZ ověřeno živě, EN pravděpodobné — výchozí mapování „Cut ← [Registration]"

**Kde:** `src/config.js:65–67`; `src/ui.js:525–527` (`detectCutColor` se u prvního řádku nepoužije, protože výchozí nastavení řádek vždy má); `src/draw.js:702–713`.

**Problém:** `movePaths` porovnává kanonické „[Registration]" s lokalizovaným názvem spotu; `canonColor` překládá jen jedním směrem.

**Naměřeno:** v CZ se jmenuje `[Registrační]` a výchozí mapování nepřesune nic — každý běh s výchozí předvolbou tak skončí varováním. Komentáře `src/ui.js:610` a `:1538` uvádějí chybně „[Registrace]".

**Dopad:** v EN Illustratoru výchozí předvolba přesune do Cut všechno v registrační barvě mimo Regmarks a Trim, pravděpodobně i značky z grommet-marks, a to i ze skupin. V CZ se operátor naučí varování přeskakovat.

**Návrh:** první řádek brát z `detectCutColor()`, v `movePaths` přeložit kanonický název na lokalizovaný a registraci jako řezovou barvu zakázat nebo aspoň varovat.

### K9 · minor · ověřeno živě pro skript, UI neověřeno — `getRegistrationName()` věří indexu `swatches[1]`

**Kde:** `src/draw.js:779–785`; stojí na tom `registrationColor`/`getCol` (`:730–756`), `canonColor` i `getSwatchNames`.

**Problém:** grommet-marks stejnou funkci opravil ve v4.2.1 (`grommet-marks/src/illustrator.js:92–113`, kontrola `spot.colorType === ColorModel.REGISTRATION`), protože `[Registration]` má jít smazat ze Swatches.

**Naměřeno:** skriptem to nejde — `remove()` přes index, jméno i `doc.spots` projde bez chyby a nic neudělá. Jestli ji jde smazat v UI, jsem neověřil.

**Návrh:** převzít pětiřádkovou kontrolu z grommet-marks. Priorita nízká.

### K10 · major · ověřeno (kód + měření meze v engine facts) — chyba během renderu nechá dokument napůl změněný

**Kde:** `src/main.js:65–84`, kontrola limitu `src/draw.js:107–117`, tiché `continue` u značek `:280`, `:298`, catch-all `:376–378`.

**Problém:**
- Odstranění výstupu Summa a posun počátku pravítek proběhnou dřív, než se ověří, že artboard půjde nastavit.
- Kontrola `|souřadnice| > 16383` skutečnou mez nezachytí: engine facts (Mez artboardu) naměřily, že plátno je centrované kolem počátku a přiřazení artboardu selže už od šířky ~16 300 pt (`CoOA`).
- Selhání tak přijde až jako výjimka z přiřazení a ohlásí se jako obecná kritická chyba.
- Značka s NaN nebo mimo limit se tiše vynechá.

**Dopad:** u příliš velkého dokumentu zmizí výstup Summa a nic nového nevznikne. Výjimka uprostřed běhu nechá roztažený artboard, část přesunutých cest a žádné značky. Neúplná sada značek je horší než žádná.

**Návrh:** nejdřív spočítat všechno (bounds, geometrii, barvy, plán přesunů) a teprve potom měnit dokument. Kolem `artboardRect =` dát try/catch se srozumitelnou hláškou (doporučení engine facts místo konstanty). Vynechaná značka = chyba. Do hlášky přidat „dokument může být částečně změněný — Soubor › Vrátit".

### K11 · major · ověřeno živě (výhrada kontextu) — běh nejde čistě vrátit přes Zpět

**Kde:** `app.redraw()` v `src/draw.js:169, 180, 363, 374, 404, 411, 416, 444, 448, 487`; změna artboardu `:118–119`.

**Naměřeno:**
- Každé `app.redraw()` uzavře samostatný krok Zpět.
- Skutečný běh SUMMA s mapováním a ořezovými linkami = 3 kroky. Po nich jsou vrstvy a cesty zpátky, **artboard zůstane zvětšený**.
- Změna artboardu ve stejném kroku jako jiné změny se přes Zpět nevrátí. V jednom testu ji vrátil až další krok, spolu s poslední akcí před spuštěním skriptu. V jiném se nevrátila ani tak.

**Dopad:** operátor nemá jak běh čistě vrátit přes Cmd+Z; spolehlivé je jen Soubor › Vrátit k poslednímu uložení.

**Návrh (ověřeno):** `app.redraw()` těsně před a po `artboardRect = …`. Změna artboardu je pak samostatný krok a vrátí se správně. Redraw nejde prostě odebrat: kolekce na úrovni dokumentu se bez něj uvnitř skriptu neaktualizují (engine facts).

### K12 · critical · ověřeno živě — skryté vrstvy: značky se tiše nevykreslí

**Kde:** `getLay` `src/draw.js:563–571` nevrací viditelnost; kreslení značek s tichým catch `:281–288` a `:299–306`; přesun vrstvy `:215–216`.

**Naměřeno:** skrytá vrstva se pro zápis chová jako zamčená — vytvoření cesty i `move()` do ní hází „Cannot modify a layer that is locked". Dva skutečné běhy ZUND:
- **Existující Regmarks je skrytá** (operátor ji schoval kvůli kontrole grafiky a spustil skript znovu):
  - stará podvrstva Zünd se odstraní a nová se vytvoří,
  - všech 5 značek selže („failed to draw Zünd mark" jde jen do logu, v produkci vypnutého),
  - skript neukáže chybu ani varování,
  - výsledek: **žádné značky, staré smazané**.
- **Existující cílová vrstva Cut je skrytá:** řezová cesta zůstane v grafice (přejmenované na Graphics). Varování tvrdí „Přiřazená barva nebyla v dokumentu nalezena: ProbeCut", přestože barva i cesta existují.

**Dopad:** v prvním případě operátor pošle na stroj dokument bez značek a dozví se to až u řezačky. Ve druhém stroj nevyřízne a hláška vede ke špatné příčině.

**Návrh:**
- `getLay` a kreslení: Regmarks a cílové vrstvy zviditelnit a oznámit to.
- Selhání kreslení značky brát jako chybu běhu, ne jako řádek logu.
- Společná zásada s K3 je v §8.

### K13 · major pro velké dokumenty · složitost ověřena, časy neměřeny — `movePaths` prochází celý dokument pro každý řádek

**Kde:** `src/draw.js:197–206`, `:613–693`.

**Problém:** každý mapovaný řádek udělá snapshot všech `pathItems` i `compoundPathItems` a u každé cesty přes deset DOM čtení včetně procházení rodičů. Úzké hrdlo je DOM, ne JS (engine facts).

**Dopad:** u 20 000 cest a 3 řádků jsou to statisíce volání bez indikace průběhu. Operátor to může považovat za zamrznutí a Illustrator zabít.

**Návrh:** jeden průchod s mapou barva → vrstva, nejdřív levné testy (`typename`, `stroked`, `filled`) a progress palette.

### K14 · minor · ověřeno — úklid maže i vrstvy, které byly prázdné už předtím

**Kde:** `src/draw.js:223–247`.

**Problém:** komentář slibuje jen vrstvy vyprázdněné přesunem, kód ale smaže každou prázdnou viditelnou nemapovanou vrstvu.

**Návrh:** zapamatovat si neprázdné vrstvy před přesunem a mazat jen ty, které se vyprázdnily během běhu.

### K15 · minor · ověřeno — poškozené nastavení tiše smaže všechny předvolby

**Kde:** `src/lib/storage.js:43–62`, `:182–185`, `src/main.js:31–36`, `:47`.

**Problém:** `open("w")` soubor nejdřív zkrátí. Když zápis selže nebo někdo JSON ručně rozbije, `load()` vrátí `null` jen s logem. Příští Generovat soubor přepíše výchozími hodnotami. Odporuje to error policy v `docs/architecture.md` i vzoru `backup()` v [`persistence.md`](../persistence.md).

**Návrh:** zapsat do `.tmp`, ověřit, nahradit a nechat zálohu `.bak`. Poškozený soubor přejmenovat na `settings.corrupt-<datum>.json` a upozornit.

### K16 · minor · ověřeno — desetinné měřítko se tiše ořízne

**Kde:** `src/ui.js:299–305`, `:1005`, `:1088–1093`.

**Problém:** live kontrola přes `parseFloat` pustí „2,5". `readScaleN()` přes `parseInt` pošle dál 2, takže pravidlo `integer` (`src/lib/validation.js:99`) desetinné číslo nikdy nedostane.

**Dopad:** běh proběhne v 1:2 místo 1:2,5.

**Návrh:** validovat surový text, stejným parserem live i při Generovat.

### K17 · minor · ověřeno — Uložit a Uložit jako ukládají nevalidované hodnoty

**Kde:** `src/ui.js:838–874`.

**Problém:** prázdné pole dá `NaN`, json2 ho uloží jako `null` a pole pak ukazuje „null". Stejně projdou hodnoty mimo rozsah.

**Návrh:** Uložit povolit jen při platném formuláři.

### K18 · minor · ověřeno živě pro stav vytvořený skriptem — ořezová cesta se předpokládá na `pageItems[0]`

**Kde:** `src/lib/bounds.js:249–251`.

**Naměřeno:** objekt vložený skriptem do ořezové masky nad ořezovou cestu. Illustrator ořízne správně (vidět je okno 20 mm), ZSM i `visibleBounds` ale hlásí 60 mm. Jestli takový stav vzniká i v UI, neověřeno.

**Návrh:** hledat potomka s `clipping === true` a `[0]` použít jen jako fallback.

### K19 · minor · ověřeno živě — `geometricBounds` nezahrnuje tloušťku tahu

**Kde:** `src/lib/bounds.js:251`, `:264`.

**Naměřeno:** 10mm tah → `geometricBounds` 100 mm, `visibleBounds` 110 mm.

**Dopad:** silný tah na okraji grafiky zmenší skutečnou mezeru o polovinu tloušťky. S mezerou 0 značka tah překryje.

**Návrh:** rozhodnout a zapsat, odkud se mezera měří. U tiskové grafiky zvážit `visibleBounds`.

### K20 · minor (proces) · ověřeno živě — deploy gate pořád hlásí P0-E jako FAIL

**Kde:** `docs/manual-test.md:79–84`, `:186`.

**Naměřeno:** „Pouze značky" + SUMMA + ořezové linky na předseparovaném dokumentu. Trim je samostatná vrstva nahoře (rodič Document), ne v Regmarks. Cut, Kiss-cut a Grafika zůstaly beze změny a render sedí. Chování je tedy v pořádku a zastaralý je jen zápis. Chyba se zapsala ve stejném commitu jako oprava (8e15db3) a ruční přetest už neproběhl.

**Návrh:** přetestovat E z menu a manual-test aktualizovat.

### Drobnosti (nit, ověřeno)

- Větev SUMMA + Fixed v `shared/lib/cut_marks.js:184–185` umístí OPOS pruh 11,5 mm pod artboard (spočítáno). ZSM ji nepoužívá (`src/ui.js:649`, `:1002`), ale kód je sdílený.
- `beginSession` v catchi znovu čte `doc.layers[i].name` (`src/draw.js:43`), takže může vyhodit výjimku přímo z catche.

## 3. Zbytečná složitost, duplicity, mrtvý kód

**S1 (minor):** stav UI čtou dvě funkce — `getUIValues` (`src/ui.js:632–658`) a `raw` v `btnOk` (`:987–1008`). K tomu přepis `drawRed` (`:1021`) a fallback režimu ve `src/lib/validation.js:80–93`. Už se rozešly (`parseFloat` vs `Number`, `gapInner` ve Fixed). Jedna funkce `readRaw()` → `validate()` pro isModified, Uložit i Generovat zároveň vyřeší K16 a K17.

**S2 (minor):** schéma nastavení žije na šesti místech: `getDefaults`, `Validation.rules`, klíče `presetEquals` (`src/lib/utils.js:132–135`), `getUIValues`, `btnOk` a `setUIValues`. K tomu natvrdo zapsané výchozí hodnoty v `src/ui.js:673–693` a `:388–396`. Nové pole = šest úprav. Klíče a výchozí hodnoty stačí odvodit z `getDefaults()`.

**S3 (minor):** práce s registrací je roztroušená (`getRegistrationName`, `getCol`, `canonColor`, alias v `selectDDL`, `getSwatchRGBMap`, kontrola v renderu) a chybí právě v `movePaths` (K8, K9). Stačila by jedna funkce `Draw.resolveColor()`.

**S4 (nit):** mrtvý kód:
- `Config.scriptName`, `zundSize`, `summaSize`, `rulerBuffer` (`src/config.js:9–20`),
- klíče v locale `ERR_LAY_COLOR`, `ERR_SWATCH`, `ERR_MIN_ROW`, `DEF_CUT`, `DEF_KISS`, `PRESET_PLACEHOLDER`, `BTN_REVERT`, `DEC_SEP`,
- pravidlo `integer` (K16) a delegát `Draw.getBounds` (`src/draw.js:80–82`).

**S5 (nit):** názvy podvrstev „Zünd"/„Summa" jsou natvrdo v `src/draw.js:129–132`, `:478` a `src/lib/bounds.js:55`, zatímco Regmarks a Trim jsou v Config.

**S6 (minor):** dokumentace neodpovídá kódu:
- README a `docs/architecture.md` popisují neexistující `src/core.js` a „81 testů".
- Uvádějí `settings_v26_3.json` a pravidlo „Draw nesmí volat UI", i když `src/draw.js:834` volá `ZSM.UI.colorToRGB`.
- `.gitignore:14` tvrdí, že `dist` je commitnutý (od 3bf6eba není).
- `CHANGELOG.md:34` hlásí odstranění Resetu, přitom tlačítko „Výchozí" v UI je.
- [`conventions.md`](../conventions.md) znají jen dva sdílené moduly; `cut_marks.js` chybí.
- Hlavička `tools/build.sh` uvádí verzi 26.4.0.
- `package.json` nemá `test:selectddl`.
- Mock `tests/lib/mock_illustrator.js` bere `layer.pageItems` rekurzivně, Illustrator vrací jen přímé potomky (změřeno).

## 4. UI/UX

- **Pořadí polí** dává smysl (Předvolby → Výstup → Značky → Role → Vrstvy → stav → tlačítka) a Storno/Generovat i Esc/Enter odpovídají standardu. Hlavní problém je vazba předvolby na režim (K5).
- **Výchozí hodnoty:** nejslabší je mapování „Cut ← [Registration]" (K8). Mezera od okraje 0 staví značky až k hraně artboardu; jestli RIP potiskne okraj, závisí na tiskárně (spekulace).
- **Validace:** live kontrola a Generovat používají jiné parsery — „12abc" projde live, ale neprojde po kliknutí. Duplicitní barva se hlídá jen live a `btnOk` ji nekontroluje. Jestli Enter spustí vypnuté výchozí tlačítko, neověřeno; doplnit kontrolu do `btnOk` je levné.
- **Zapamatování:** `[Last Settings]` se ukládá jen po Generovat, což je správně. Hodnoty druhého režimu se ale berou z aktivní předvolby, ne z posledního běhu (`src/ui.js:633`, `:1012`), takže neuložená úprava SUMMA po jednom běhu ZUND zmizí.
- **Chyba prázdného dokumentu** přijde až po vyplnění dialogu a uložení nastavení (`src/main.js:47` vs `:77`).
- **Tlačítko „Výchozí"** (`src/ui.js:167`) a předvolba „[Výchozí]" jsou dvě různé akce se stejným slovem. Navrhuju tlačítko přejmenovat na „Tovární hodnoty".

## 5. Texty

**T1 (minor, ověřeno):** tip „Vzdálenost středu značky od okraje grafiky" (`src/locale.js:195`, EN `:78`) je špatně. Kód měří k bližšímu okraji značky (`shared/lib/cut_marks.js:55–56`), což potvrzuje i výpočet v manual-test J (50 + 12,5 + 2,5). Správně: „od okraje grafiky k okraji značky".

**T2:** „Nic není vybráno" (K4). Návrh: „V dokumentu není žádná grafika k měření (vrstvy Regmarks a Trim se nepočítají). Přidejte grafiku, nebo zvolte Dle artboardu."

**T3:** „Přiřazená barva nebyla v dokumentu nalezena" (`src/locale.js:147`) se zobrazí i tehdy, když barva existuje, ale nic se nepřesunulo — naměřeno u skryté cílové vrstvy (K12). Neříká ani, o kterou vrstvu jde. Návrh: „Vrstva ‚%s': žádná cesta v barvě ‚%s' nebyla přesunuta (barva chybí, nebo jsou cesty zamčené, skryté či v ořezové masce)."

**T4:** chyba limitu vyjde jako „CHYBA: CHYBA: Artboard exceeds maximum size (5765 mm)." Prefix je dvakrát (`src/draw.js:113–115` + `src/lib/utils.js:101`), text je anglicky a 5765 mm neplatí pro Large Canvas ani 1:N.

**T5:** `ERR_CRITICAL`, `ERR_RENDER_CRITICAL`, `ERR_WRITE_SETTINGS` (`src/locale.js:144–146`) ukážou surovou `e.message` a anglické „(line N)". Chybí proč a jak opravit i zmínka, že dokument může být napůl změněný.

**T6:** „nesáhne na žádné vrstvy" (`src/locale.js:227`) přehání — režim přidá Regmarks a Trim, starou Trim smaže a v Auto-fit změní artboard. Návrh: „nepřesouvá cesty ani nepřejmenovává vaše vrstvy".

**T7 (nit):** u orientační značky doplnit „mezera mezi okraji značek" (`src/locale.js:205`). České texty píšou „[Registration]", ale v dropdownu je `[Registrační]` (`:148`, `:207`).

## 6. Funkce, které by operátor čekal

1. Skutečný režim podle výběru a práci s více artboardy (K4).
2. Souhrn po běhu (značky, rozměr artboardu, přesunuto a přeskočeno podle vrstev) a log do souboru. V produkci se neloguje nic (`src/lib/utils.js:90–94`, `debug: false`) — i selhání kreslení značek v K12 zůstalo neviditelné.
3. Kontrolu odstupů: značky vs. grafika ve Fixed, orientační vs. ostatní značky, značky na artboardu (K7).
4. Akci „Odstranit značky ZSM", aby se nemuselo spoléhat na Zpět (K11).
5. Černou K100 jako barvu značek. Registrace znamená 400 % inkoustu; jestli se jí dílna na velkoformátu vyhýbá, je otázka praxe (spekulace).
6. Indikaci průběhu (K13).

## 7. Připravenost na UXP

Aktuální stav UXP v Illustratoru a parita jeho DOM se neověřovaly. Tabulka hodnotí jen to, jak těsně je kód svázaný se ScriptUI a s ExtendScriptem.

| modul | vazba | co brání přenosu |
|---|---|---|
| `cut_marks.js` | čistá matematika | bez předaného `scale` čte `app.activeDocument` |
| `ui_state.js` | čistý | nic |
| `validation.js` | čistá logika | volá `alert()` |
| `storage.js` | synchronní `File`/`Folder` | migrace smíchané s I/O v `load()` |
| `bounds.js` | DOM, jen čtení | idiomy ExtendScript DOM |
| `draw.js` | DOM + efekty v UI | `alert` v renderu, volá `ZSM.UI.colorToRGB`, `render()` nic nevrací |
| `ui.js` | ScriptUI | `buildDialog` je closure o ~1 250 řádcích: layout, stav, validace, ukládání i dotazy do DOM |

Čistá část (Core, UIState, validační pravidla, texty) tvoří zhruba pětinu kódu a přenese se téměř beze změny. Zbytek by se pro UXP přepisoval tak jako tak, ale konkrétních vazeb není mnoho.

Pomohlo by i bez UXP:
- vyndat `alert()` z Validation, Utils a Draw,
- nechat `render()` vracet `{warnings, stats}` — to zároveň řeší K2 a K12,
- vytáhnout čistou funkci `migrate()` ze `Storage.load()`,
- dostat `getUIValues`/`setUIValues` z closure a oddělit `show()` od stavby dialogu.

UXP je navíc asynchronní, takže synchronní tok v `main.js` se bude muset přestavět tak jako tak.

## 8. Zásada pro viditelnost vrstev (K3 + K12)

Obě chyby mají jeden kořen: skript nemá pravidlo, kdy smí měnit viditelnost. Navrhuju:
- **Vrstvy, do kterých skript zapisuje** (Regmarks a její podvrstvy, mapované cílové vrstvy, Trim), zviditelnit před zápisem a oznámit to ve varování. Do skryté vrstvy zapsat nejde (změřeno), takže bez toho zápis selže.
- **Uživatelské vrstvy, do kterých skript nezapisuje**, nechat, jak jsou — žádné `visible = true` na spodní vrstvě.

## 9. Naměřeno

### Sondy v Illustratoru (30.8.1, cs_CZ)

| sonda | co | výsledek |
|---|---|---|
| A | `movePaths` na 7 cestách v různých stavech | viz K2; `hit = true` i při 3 nepřesunutých |
| A | cesta s bílou výplní a řezovým tahem | `fillOverprint = true` po přesunu |
| A | výchozí mapování v CZ | `[Registrační]`, nic se nepřesune (K8) |
| A | `pageItem.note` | existuje, zápis i čtení funguje |
| A | tah 10 mm | geometric 100 mm, visible 110 mm (K19) |
| C | skutečný běh ZUND na samolepce, PDF bez simulace přetisku a s ní | kruh zakrytý / červený (K1) |
| C | objekt vložený do ořezové masky nad ořezovou cestu, PNG | vidět 20 mm, ZSM 60 mm (K18) |
| C | `remove()` na `[Registrační]` | bez chyby, bez účinku (K9) |
| U | šest cest ve třech dvojicích oddělených `app.redraw()` | Zpět: 6 → 4 → 2 → 0; bez redraw 4 → 0 (K11) |
| Z | skutečný běh SUMMA s mapováním a ořezovými linkami, Zpět po krocích | 3 kroky, artboard zůstal (K11) |
| AB | artboard sám / s jinými změnami / oddělený redraw | sám a oddělený se vrátí, s jinými změnami ne (K11) |
| E | P0-E, „Pouze značky" SUMMA na předseparovaném dokumentu, PNG | Trim top-level, vrstvy beze změny (K20) |
| K12 | kreslení a přesun do skryté vrstvy; běh se skrytou Regmarks a se skrytou Cut | hází „locked"; žádné značky bez hlášky; cesta zůstane v grafice (K12) |

Podrobnosti DOM: [`extendscript-engine-facts.md`](../extendscript-engine-facts.md),
sekce „Undo, kolekce, skryté vrstvy a masky".

### Výpočet v Node

K7: skutečné `shared/lib/cut_marks.js` s mockem `app` (`scaleFactor` 1). Hodnoty
jsou v tabulce u K7. `geo.warnings` zůstalo ve všech případech prázdné.

## 10. Top 5 podle poměru přínosu k práci

1. **K12** — před zápisem zviditelnit Regmarks a cílové vrstvy a selhání kreslení
   značky brát jako chybu. Pár řádků. Brání tomu, aby na stroj odešel dokument
   bez značek.
2. **K1** — přetisk jen na atributu, který se shodoval; objekt s tiskovou výplní
   nahlásit místo přesunu. Dvě místa v `movePaths` a test. Brání zkaženému tisku.
3. **K3** — neměnit viditelnost spodní vrstvy. Pár řádků. Brání tisku skrytého
   obsahu.
4. **K5** — výběr předvolby přepne režim. Pár řádků. Brání značkám pro špatnou
   technologii.
5. **K2** — počty přesunutých a přeskočených cest do závěrečného hlášení. Malá až
   střední práce. Neúplná řezová vrstva přestane být tichá.

Hned za nimi, s malou prací:
- K6 (rezervované názvy vrstev),
- K11 (redraw kolem změny artboardu — ověřená oprava),
- K8 (první řádek z `detectCutColor()`),
- texty T1 a K4.

## 11. Neověřeno

- Undo při běhu přes Soubor › Skripty (K11). Stačí jeden ruční běh: SUMMA s ořezovými linkami, pak Cmd+Z po jednom kroku a sledovat artboard.
- EN Illustrator u K8.
- Mazání `[Registration]` v UI (K9).
- Jestli `doc.layers.add()` s aktivní podvrstvou shodí Illustrator. Kód se tomu u vrstvy Trim brání (oprava ve v26.5.0), `getLay` ne. Sonda se nespustila, protože Illustrator opravdu může spadnout.
- Časy u velkých dokumentů (K13).
- Jak stroj Zünd zachází s orientační značkou, která splyne s rohovou (K7).
