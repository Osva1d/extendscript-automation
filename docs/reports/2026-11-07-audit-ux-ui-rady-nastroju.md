# Audit UX/UI řady nástrojů — fáze 1

Datum: 2026-11-07. Rozsah: `main` 005a663 — grommet-marks 1.4.0 (GM),
zund-summa-marks 1.2.0 (ZSM), batch-relink-export 1.2.0 (BRE), tile-export 1.2.0
(TE), batch-text-edit 1.0.0 (BTE) a `shared/lib`. Rozpracované větve TE 1.3.0,
ZSM 1.3.0 a BTE 1.1.0 audit nehodnotí.

Audit jen čte. V kódu se nic nezměnilo a v Illustratoru se nic nespouštělo: dialogy
jsem v této fázi neviděl. Navazuje na audity společného jazyka z 2026-10-14
a 2026-10-17 (nálezy J, P, N); tady jde o rozložení, chování a stabilitu.

Každé tvrzení má úroveň důkazu:

| značka | význam |
|---|---|
| **[K]** | přečteno v kódu, odkaz vede na `main` 005a663 |
| **[M]** | změřené nebo ověřené dřív, převzato s uvedením zdroje; starší čísla se mohla změnit |
| **[V]** | vypočtené z naměřených hodnot |
| **[H]** | předpoklad, zatím neověřeno, patří do měření nebo ručního testu (§6) |

Závažnost: BLOCKER znemožní práci, CRITICAL přímo odporuje zadání nebo hrozí
škodou na datech, MAJOR obsluhu v běžném dni zdržuje nebo mate, MINOR je kosmetika
nebo dluh. **Blocker jsem nenašel.**

---

## 1. Výsledky

### 1.1 Shrnutí

Řada už mluví jedním jazykem, ale nechová se jako jeden produkt. Texty, předvolby,
převod čísel, stavové barvy, patička a pořadí tlačítek jsou jednotné, protože se
sjednocovaly vědomě. Geometrie a chování oken se nesjednocovaly nikdy.

TE a BTE (mladší nástroje) mají stálé rozměry okna a jsou blízko cíli. **Skutečná
práce leží v GM a ZSM:** obě okna mění výšku a primární tlačítko se pohybuje, což
je přesně to, co zadání zakazuje. BRE je stabilní, ale jako jediný neukazuje stav
živě a chyby hlásí po jedné přes `alert`.

Hlavní příčina je architektonická: `shared/lib` sdílí logiku (`UIState`, `Numbers`,
`FieldPaint`, `Progress`, `Summary`), ale **žádný sdílený vzhled ovládacích prvků**.
Panel předvoleb, řádek s polem, patička i řada tlačítek jsou v každém nástroji
napsané znovu, a proto se rozcházejí.

### 1.2 Nástroje

| nástroj | účel | primární akce | hlavní okno [M] | `ui.js` | sdílené moduly |
|---|---|---|---|---|---|
| GM | značky pro průchodky po hranách artboardu nebo vybrané cestě | Generovat | 465 × 804 px, nejvyšší stav (`CHANGELOG` 1.4.0); výška se mění | 1383 ř. | DrawingScale, FieldPaint, Numbers, Registration, UIState |
| ZSM | registrační značky pro Zünd a Summa, přiřazení vrstev k barvám | Generovat | 465 × 720 (ZUND), 756 (SUMMA), s 8 řádky vrstev až 932 px (`CHANGELOG`) | 1657 ř. | CutMarks, DrawingScale, FieldPaint, Numbers, Registration, UIState |
| BRE | dávka: šablona + složka PDF → relink a export | Spustit | 460 × 478 px (audit 2026-09-28, verze 1.1.0) | 562 ř. | FieldPaint, Progress, Summary |
| TE | dělení velké grafiky na pláty, export | Vytvořit a exportovat, vedle Jen pláty | 1022 × 836 px (`CHANGELOG` 1.2.0) | 1494 ř. | CutMarks, DrawingScale, FieldPaint, Numbers, Progress, Registration, Summary, UIState |
| BTE | řetěz textových úprav s živým náhledem | Použít | 1008 × 768 px (komentář `ui.js:428`, 2026-10-30) | 1338 ř. | FieldPaint, Numbers, Summary, UIState |

Technologie je všude stejná: **ScriptUI** v ExtendScriptu, žádný CEP ani UXP [K].
Ze 6434 řádků `ui.js` žádný nepoužívá `tabbedpanel` [K]. Vlastní kreslení (`onDraw`)
má jen vzorek barvy v ZSM (`zund-summa-marks/src/ui.js:1519`) [K].

### 1.3 Struktura oken

| nástroj | pořadí panelů | co se mění podle stavu |
|---|---|---|
| GM | Předvolby → Umístění (režim, jednotky, měřítko, šedý řádek) → Hrany **nebo** Cesta → Rohové zóny → Značka → patička → Storno / Generovat | sbalení panelů a řádků, výška okna |
| ZSM | Předvolby → Nastavení výstupu → Značky a mezery → [SUMMA: Nastavení role] → Přiřazení vrstev → stavový řádek → patička → Storno / Generovat | zavření a nová stavba okna, řádky vrstev, titulek okna |
| BRE | 1 · Vstupní soubory → 2 · Pojmenování a formát → Možnosti → patička → Storno / Spustit; pak Náhled zpracování (jen při anomálii) → průběh → Souhrn | nic |
| TE | levý sloupec: Předvolby, Dokument, Dělení, Přelep a přídavky; pravý: Typ výstupu, Soubory, Výsledek; dole patička, zaškrtávátko, Storno / Jen pláty / Vytvořit a exportovat; pak průběh → Souhrn | `stack` při stálé výšce |
| BTE | Předvolby \| Rozsah → Kroky (seznam + editor v `stack`) → Náhled → patička → Storno / Použít; pak Souhrn | `stack` při stálé výšce |

### 1.4 Co už je jednotné a nesmí se rozbít

Ověřeno v kódu a v locale [K]:

- Vykání: sken imperativů 2. osoby v českém locale našel 0 výskytů ve všech pěti
  nástrojích. Žádný vykřičník, žádné `...` místo `…`, žádné ASCII uvozovky.
- Titulek `<Název> v<verze>` a patička `© 2025–2026 Ladislav Osvald · v…`.
- Pořadí Storno vlevo, primární vpravo; `{name:"cancel"}` a `{name:"ok"}` všude.
- Texty předvoleb (dotazy, chyby), `[Výchozí]`, hvězdička u změněné předvolby.
- `ERR_NO_DOC` stejný; `ERR_CRITICAL` stejná šablona (BRE vědomě kratší).
- Převod čísel přes `Numbers.parse/format`, `DEC_SEP` = čárka. Stavové symboly
  a barvy z `FieldPaint`.
- Dialog si pamatuje poslední potvrzené hodnoty; Storno je neukládá (výjimka U12).
- Šedé primární tlačítko je dostatečná brána: Enter na něm nic nespustí
  [M: `extendscript-engine-facts.md`, TE 1.1.0, 2026-10-17].

### 1.5 Srovnání rozměrů

| vlastnost | GM | ZSM | BRE | TE | BTE |
|---|---|---|---|---|---|
| okraj okna | 20 | [20,14,20,12] | 20 | nativní 15 | nativní 15 |
| okraj panelu | 16 | 12 | 15 | nativní [15,10,15,10] | nativní |
| mezi panely | 16 | 10 | 12 | 15 v okně, nativní 10 ve sloupci | nativní 15 |
| mezery uvnitř | 4, 8 | 5, 6, 8, 10 | 3, 7, 8, 10 | nativní 10 | nativní 10 |
| číselné pole | 44, 46, 50, 60 px | 56 px | není | 7 znaků | 7 znaků |
| sloupec popisků | bez společného sloupce | 178 px | 96 px | 165 px | po blocích, podle nejdelšího popisku |
| ↺ | [30, 24] | šířka 30 | není | šířka 30 | šířka 30 |
| přidat řádek / položku | není | `+ Přidat` | není | není | `+` |
| odebrat | není | `−` [24, 22] | není | není | `−` šířka 30 |
| Vybrat… | není | není | 90 px | max. 90 px | není |
| zvláštní řez písma | žádný | žádný | tučně náhled názvu a verdikt | tučně stav | tučně stav |

Hodnoty [K]. Vlastní rozestupy v GM (`constants.js:42`), ZSM (`ui.js:17`) a BRE
(`ui.js:12`) tvoří tři různé systémy. Kánon §3 přitom říká obojí: „nenastavujte“
i „pojmenovaná škála je lepší než obojí“ (U20).

### 1.6 Srovnání chování

| situace | GM | ZSM | BRE | TE | BTE |
|---|---|---|---|---|---|
| přepnutí režimu | sbalení panelu, okno změní výšku | okno se zavře a postaví znovu | není | `stack`, výška stejná | `stack`, výška stejná |
| přidání obsahu | Zrcadlit sbalí řádky, okno změní výšku | řádek vrstvy změní výšku okna | není | není | seznam stálé výšky |
| načtení předvolby | může změnit režim i řádky, a tím výšku | může postavit okno znovu, řádky mění výšku | není | výška stejná | výška stejná |
| kde je důvod šedého tlačítka | šedý řádek v Umístění, nahoře | stavový řádek těsně nad patičkou | žádný, tlačítko nešedne | panel Výsledek, vpravo | panel Náhled, uprostřed |
| kontrola polí | živě | živě | po kliknutí, po jednom `alert` | živě | živě |
| výchozí fokus | neřešený | první pole značek (`ui.js:1342`) | neřešený | neřešený | neřešený |
| Enter z pole | spustí hned | spustí hned | spustí hned, kontrola až po něm | spustí hned, přepisuje soubory | první Enter přepočítá a podrží, druhý spustí (`ui.js:1291`) |
| konec běhu | nic, nebo `alert` s upozorněními | nic, nebo upozornění | Souhrn | `alert` (Jen pláty), Souhrn (export) | Souhrn |
| průběh | není potřeba | není potřeba | paleta, zastavení podržením Esc | paleta, zastavení podržením Esc | není |
| přepis hotových souborů | netýká se | netýká se | bez dotazu, Přeskočit vypnuté a nepamatuje se | bez dotazu, Přeskočit výchozí vypnuté | netýká se |

Hodnoty [K]. TE přepočítává na každý znak (`ui.js:726`), znovu rozvrhuje celé okno
a staví znovu tabulku (U9).

### 1.7 Hodnocení podle kritérií zadání

✓ splněno, ~ částečně, ✗ nesplněno, ? nelze posoudit bez spuštění. Řádky A1 až A5
a B7 jsou můj úsudek, ostatní mají oporu v kódu. C7 a C8 hodnotí zapojení kláves,
ne živý test.

| kritérium | GM | ZSM | BRE | TE | BTE |
|---|---|---|---|---|---|
| **A. UX** | | | | | |
| A1 účel je hned jasný | ✓ | ✓ | ✓ | ✓ | ✓ |
| A2 workflow dává smysl | ✓ | ✓ | ✓ | ✓ | ✓ |
| A3 pořadí ovládání = pořadí práce | ~ | ✓ | ✓ | ✓ | ✓ |
| A4 je jasné, co je hlavní | ✓ | ✓ | ✓ | ~ | ✓ |
| A5 obejde se bez zbytečného přemýšlení | ~ | ~ | ✓ | ~ | ~ |
| A6 rychlá práce bez klikání navíc | ✓ | ✓ | ~ | ✓ | ✓ |
| A7 nevratné operace jsou ošetřené | ✓ | ~ | ✗ | ✗ | ✓ |
| A8 chybové stavy jsou srozumitelné | ✓ | ✓ | ~ | ✓ | ✓ |
| **B. UI** | | | | | |
| B1 hierarchie | ✓ | ✓ | ~ | ✓ | ✓ |
| B2 stejné prvky mají stejný rozměr | ✗ | ✓ | ✓ | ✓ | ✓ |
| B3 rozestupy uvnitř nástroje | ✓ | ~ | ~ | ✓ | ✓ |
| B4 typografie | ✓ | ✓ | ~ | ✓ | ✓ |
| B5 barvy (kontrast viz U14) | ~ | ~ | ~ | ~ | ~ |
| B6 tlačítka | ~ | ~ | ✓ | ✓ | ✓ |
| B7 přehlednost při mnoha funkcích | ~ | ✓ | ✓ | ~ | ✓ |
| B8 profesionální dojem | ? | ? | ? | ? | ? |
| **C. Stabilita** | | | | | |
| C1 stálý rozměr okna | ✗ | ✗ | ✓ | ✓ | ✓ |
| C2 primární tlačítko stojí na místě | ✗ | ✗ | ✓ | ✓ | ✓ |
| C3 obsah se neposouvá | ✗ | ✗ | ✓ | ✓ | ✓ |
| C4 skrývání má jasnou logiku | ~ | ~ | ✓ | ✓ | ✓ |
| C5 předvídatelný výchozí fokus | ? | ✓ | ? | ? | ? |
| C6 fokus neskáče | ? | ✗ | ? | ~ | ? |
| C7 Enter se chová stejně | ✓ | ✓ | ✓ | ~ | ~ |
| C8 Esc se chová stejně | ✓ | ✓ | ✓ | ✓ | ✓ |
| C9 opakovaný běh | ✓ | ~ | ✓ | ✓ | ✓ |
| C10 stabilita při délce textu | ✓ | ✓ | ✓ | ✓ | ? |
| C11 stabilita při různém nastavení | ✗ | ✗ | ✓ | ✓ | ✓ |

### 1.8 Komentář k jednotlivým nástrojům

**GM.** Logika práce je dobrá: obsluha vybere umístění, rozložení a značku a jeden
Enter spustí. Jen velikost značky, na které rozteč závisí, je až na konci (A3).
Slabina je výška: každé Zrcadlit a každé přepnutí režimu posune všechno pod sebou
včetně Generovat (U1). Řádek hrany je nejhustší prvek celé řady (zaškrtávátko, dva
přepínače, dvě pole) a pole mají čtyři různé šířky (U15). Jako
jediný má seznam jednotek a jako jediný píše `Načíst:` místo `Předvolba:`.

**ZSM.** Texty a validace patří k nejlepším v řadě a stavový řádek stojí na správném
místě, přímo nad tlačítky. Přestavba okna je ale ojedinělá: okno zmizí a objeví se,
změní výšku a fokus přeskočí (U2). Přidání vrstvy hýbe Generovat a s 8 řádky má okno
932 px, tedy víc než použitelná výška malého displeje (U3). Běh maže výstup Summa
a prázdné vrstvy a `app.redraw` má 12 volání, přitom každé uzavírá krok zpět [M],
takže počet Cmd+Z je třeba změřit (A7). Do popisků se míchá
angličtina (`Auto-fit`, `Fixed`, `Feed`, `Top`) a režimy píše `ZUND`, zatímco TE
`Zünd` (U18).

**BRE.** Nejklidnější okno a nejlepší kontrola před během: počet stran proti pozicím.
Slabina je opak ostatních: tlačítko nikdy nešedne a každé kliknutí ukáže jeden
`alert`, další chybu obsluha zjistí až při dalším pokusu (U7). Přeskočit hotové
výstupy se nepamatuje a je vypnuté, takže výchozí běh přepisuje bez dotazu (U5).
Zdrojová složka se nepamatuje také, nejspíš záměrně, protože se mění s každou dávkou. Číslování panelů `1 ·`, `2 ·` a nečíslované
`Možnosti` nemá v řadě obdobu.

**TE.** Technicky nejvyzrálejší rozložení: stálá výška, živý Výsledek, šířky měřené
na nejdelší text. Okno je velké, ale dělá nejvíc práce. Problémy: Enter spouští
export, který přepisuje soubory (U5), a panel se jmenuje Výsledek, i když ukazuje,
co se teprve stane (U17). Přepočet na každý znak staví znovu celou tabulku (U9).
Zaškrtávátko vedle tlačítek rozmazává, co je akce a co volba.

**BTE.** Nejblíž cíli. Stálé okno, živý náhled, ochrana Enteru a zápis, který nerozděluje
historii zpět (`write.js:139`). Seznam a editor kroků jsou vzor pro práci s řádky.
Zbývá přesunout stav k tlačítkům (U6), pokud to bude společné pravidlo. Ochrana
Enteru přidává druhý stisk, který jinde není; je zdůvodněná, protože běh počítá
z náhledu, ale obsluha si ji musí pamatovat (U4).

---

## 2. Zjištěné problémy

### Nestabilní layout

| kód | závažnost | problém | důkaz |
|---|---|---|---|
| **U1** | CRITICAL | GM mění výšku okna při každém přepnutí režimu a každém Zrcadlit. Panely pod místem změny i Generovat se posunou, někdy pod kurzorem, kterým obsluha právě klikla. | [K] `grommet-marks/src/ui.js:674`, `:680`, `:910` volají `relayoutDialog` (`:894`), které dělá `dlg.size = dlg.preferredSize` |
| **U2** | CRITICAL | ZSM při změně režimu zavírá a staví okno znovu. Výška se změní o 36 px, okno problikne, fokus přeskočí na první pole. Stejně se chová výběr předvolby druhého režimu, kde to obsluha nečeká. | [K] `zund-summa-marks/src/ui.js:979`, `:836`, `:1334`, `:1342`; výšky [M] `CHANGELOG` |
| **U3** | CRITICAL | Řádky vrstev v ZSM mění výšku okna, s posunem Generovat a korekcí +10 px, protože engine výšku podměřuje. S 8 řádky 923 až 932 px; po odečtení lišty a Docku zbývá na malém displeji asi 850 px, takže spodek okna včetně tlačítek může být mimo obrazovku. | [K] `ui.js:176`, `:487`, `:514`, `:726`; [M] `CHANGELOG` a komentáře `tile-export/src/ui.js:250`, `batch-text-edit/src/ui.js:436` |
| **U8** | MINOR | Okno Souhrn roste s délkou cesty v úvodním řádku. Záměr (2026-10-27), aby se cesta neuřízla, ale je to jediné okno, jehož šířka závisí na obsahu. | [K] `shared/lib/summary.js:62` |
| **U9** | MINOR | TE na každý znak znovu rozvrhne celé okno a znovu postaví tabulku Výsledku, takže odrolovaná tabulka skočí nahoru. BTE staví tabulku znovu jen při změně počtu řádků. | [K] `tile-export/src/ui.js:720`, `:726`, `:1286`; `batch-text-edit/src/ui.js:822`. Viditelný dopad [H] |

### Nekonzistentní ovládání a stavy

| kód | závažnost | problém | důkaz |
|---|---|---|---|
| **U5** | CRITICAL | TE a BRE přepisují existující soubory bez dotazu a Enter z kteréhokoli pole běh spustí. Přeskočit hotové výstupy je ve výchozím stavu vypnuté (TE) nebo se vůbec nepamatuje (BRE). Export do špatné složky přepíše cizí práci a Cmd+Z to nevrátí. | [K] `tile-export/src/config.js:186`, `tile-export/src/main.js:207`, `batch-relink-export/src/main.js:118`, `batch-relink-export/src/ui.js:196` |
| **U4** | MAJOR | Enter znamená v BTE něco jiného než jinde: po úpravě pole první Enter přepočítá a podrží, druhý spustí. Důvod je platný, ale jde o různé chování téže klávesy. | [K] `batch-text-edit/src/ui.js:1291` |
| **U6** | MAJOR | Důvod šedého tlačítka je v každém nástroji jinde: GM nahoře v Umístění, ZSM nad tlačítky, TE v pravém sloupci, BTE uprostřed. V GM je tak důvod daleko od tlačítka, ke kterému patří. | [K] `grommet-marks/src/ui.js:548`, `zund-summa-marks/src/ui.js:556`, `tile-export/src/ui.js:632`, `batch-text-edit/src/ui.js:645` |
| **U7** | MAJOR | BRE nekontroluje živě. Spustit je vždy živé a každé kliknutí ukáže jeden `alert` z deseti možných, takže další chybu obsluha zjistí až při dalším pokusu. Tentýž stav (chybějící cílová složka) TE ukáže živě a export zašedne. | [K] `batch-relink-export/src/ui.js:247`–`302` |
| **U10** | MAJOR | Výchozí fokus nastavuje jen ZSM; zbytek spoléhá na výchozí chování prostředí, které nikdo neměřil. | [K] `zund-summa-marks/src/ui.js:1342`; efekt [H] |
| **U11** | MINOR | Žádný nástroj nepřesune fokus na neplatné pole. Automatika má cenu zvážit opatrně: `active = true` může vybrat celý text [M: engine-facts, 2026-10-11]. | [K] |
| **U12** | MAJOR | ZSM: přepnutí režimu uloží snímek do `[Last Settings]`. Když po něm obsluha uloží předvolbu a dá Storno, snímek se zapíše na disk a příště se otevře hodnota z běhu, který se nikdy nepotvrdil. | [K] `zund-summa-marks/src/ui.js:967`, `:823`, `:1082`. Nespuštěno [H] |
| **U13** | MINOR | Stejná volba má různou podobu. `Přeskočit hotové výstupy` je v BRE zaškrtávátko s textem, v TE popisek s holým zaškrtávátkem. `Po dokončení otevřít cílovou složku` je v BRE v Možnostech, v TE vedle tlačítek. | [K] `batch-relink-export/src/ui.js:196`, `:199`; `tile-export/src/ui.js:609`, `:669` |
| **U15** | MAJOR | Rozměry se liší bez důvodu: číselná pole čtyřmi šířkami v GM, 56 px v ZSM, 7 znaků v TE a BTE; ↺, `−` a `+` podle §1.5. | [K] `grommet-marks/src/ui.js:95`, `:105`, `:594`, `:940`; `zund-summa-marks/src/ui.js:472`; `batch-text-edit/src/ui.js:518` |
| **U16** | MINOR | Stejný prvek jinak: vzorek barvy u `Barva značek:` jen v ZSM, ne v TE; tlačítka proměnných u vzoru jen v TE, v BRE jen text pod polem; jednotka `pt` v TE za polem, v GM v závorce v popisku; tlačítko `Výchozí` jen v ZSM; titulek okna mění jen ZSM (`— 1:N`). | [K] `zund-summa-marks/src/ui.js:315`, `:222`, `:1510`; `tile-export/src/ui.js:600`, `:447`; `grommet-marks/src/ui.js:949` |

### Vizuální jednotnost a přístupnost

| kód | závažnost | problém | důkaz |
|---|---|---|---|
| **U14** | MAJOR | Stavové barvy mají na světlém a tmavém UI nedostatečný kontrast. Celá věta stavu je tak obarvená. Na světlém UI: upozornění 1,91:1, OK 2,99:1, chyba 3,77:1. Na tmavém: chyba 2,93:1, OK 3,70:1. Běžná hranice pro text je 4,5:1. Význam částečně nese symbol ✗ ⚠ ✓. Střední jasy UI nejsou změřené. | [V] z `FieldPaint.COLORS` a pozadí 0,94 a 0,20 [M: `shared/lib/field_paint.js`] |
| **U19** | MAJOR | Tři systémy okrajů a mezer plus nativní hodnoty (§1.5). Obsluha to vnímá jako jiný rytmus každého okna. | [K] |
| **U21** | MINOR | Tučné písmo nemá jedno pravidlo: v BRE je tučně i obyčejný náhled názvu, v GM a ZSM není tučně ani stav. BRE píše styl `"Bold"`, TE a BTE `"BOLD"`. | [K] `batch-relink-export/src/ui.js:133`, `tile-export/src/ui.js:636`; účinek `"Bold"` [H] |
| **U22** | MINOR | Třídy šířky oken nejsou definované: 460, 465, 465, 1008, 1022 px. Dvě velké dvousloupcové a tři úzké jednosloupcové jsou obhajitelné, ale není to pravidlo. | [M] |
| **U23** | MINOR | Číslování panelů jen v BRE, navíc jen u dvou ze tří. | [K] `batch-relink-export/src/ui.js:75`, `:93`, `:190` |

### Terminologie

| kód | závažnost | problém | důkaz |
|---|---|---|---|
| **U17** | MAJOR | `Výsledek` znamená v TE panel **před** během a v Souhrnu TE a BTE stav **po** běhu. Totéž co TE Výsledek se v BTE jmenuje `Náhled`; BRE má `Náhled názvu` a `Náhled zpracování`, což je ve skutečnosti kontrola. | [K] locale: TE `SUM_TITLE`, BTE `PANEL_PREVIEW`, BRE `PREVIEW_TITLE` |
| **U24** | MAJOR | `Výstup` má tři významy: v BRE cílová složka, v TE způsob ořezu (Ruční ořez / Zünd), v ZSM v názvu panelu režim, zdroj a měřítko. Navíc `výstup` jako soubor v `Přeskočit hotové výstupy`. | [K] BRE `LBL_OUTPUT`, TE `LBL_OUT_TYPE`, ZSM `PANEL_OUTPUT` |
| **U18** | MINOR | Míchání jazyků a tvarů: `(Auto-fit)`, `(Fixed)`, `(Top)`, `(Bottom)`, `(Feed)`; `ZUND` × `Zünd`; `Pouze značky` × `Jen pláty`, `Jen první shoda`. | [K] locale |
| **U25** | MINOR | Jedna kontrola čísla pěti slovy: `Pole „%s“ musí být číslo.`, `%s: zadejte číslo od %s do %s.`, `%s — povolený rozsah %s–%s.`, `Pole „%s“: zadejte číslo, třeba 20 nebo 2,5.`, `Číslic musí být od %s do %s.` | [K] locale |
| **U26** | MINOR | Tipy předvoleb třemi tvary a GM porušuje kánon `předvolba ≠ nastavení` (`Uložit aktuální nastavení…`). `Běh pokračuje` × `Dávka pokračuje` × `Značky se vykreslí`. ZSM `Předvolby se nepodařilo uložit` × jinde `Nastavení…`. | [K] locale |
| **U27** | MINOR | Rozhodnout, jestli jde o totéž: `Odsazení od kraje` (GM), `Mezera od okraje` (ZSM), `Odsazení orientační značky` (ZSM, TE). A `Velikost Summa:` × `Průměr značky:` v jednom panelu. | [K] locale |
| **U28** | MINOR | Prefix `CHYBA:` nemá pravidlo použití. BRE ho nezná, BTE má jen `UPOZORNĚNÍ:`, v ostatních ho chyby v obsluze předvoleb nemají. Kánon říká „jen dva prefixy“, ne kdy. | [K] |

### Technické a dokumentační

| kód | závažnost | problém | důkaz |
|---|---|---|---|
| **U29** | MAJOR | Vzhled ovládacích prvků není sdílený. Panel předvoleb je čtyřikrát (GM, ZSM, TE, BTE), `lockW` třikrát, `addRow` dvakrát, řádek souboru v BRE a TE zvlášť. Rozdíly U10, U15, U16 a `Načíst:` jsou přímý důsledek. | [K] `grommet-marks/src/ui.js:204`, `:443`; `zund-summa-marks/src/ui.js:184`, `:1448`; `tile-export/src/ui.js:63`, `:78`, `:279`; `batch-text-edit/src/ui.js:299`, `:444` |
| **U20** | MINOR | Kánon je místy nejasný nebo zastaralý. §3 si protiřečí (U19). §12.3 tvrdí, že GM a ZSM ještě převádějí přes `Number()` a že GM, ZSM a TE zapisují číslo s tečkou, ale všechny tři už používají `Numbers.parse` a `Numbers.format`. §12.8 drží `Rozestup` × `rozteč`, ale GM 1.4.0 má všude `Rozteč`. §9 a popis skillu mluví o čtyřech nástrojích. `building-adobe-ui` §5.2 učí vzor, který žádný nástroj nepoužívá. | [K] |
| **U30** | MINOR | `engine-facts` tvrdí, že `maximumSize.height = 0` okno nezmenší. GM to dělá s `preferredSize` a dvěma průchody rozvržení. Jedno z toho je neúplné. | [K] `extendscript-engine-facts.md:1011`, `grommet-marks/src/ui.js:884` |
| **U31** | MINOR | Mrtvé klíče a zastaralé texty: TE `BTN_DEFAULTS`, `LBL_LINE_SPOT`, `ERR_SPOT_FAILED`, `WARN_NO_CONTOUR`, BRE `TITLE` (statické hledání, dynamicky složený klíč nevylučuje); komentář `Footer — Reset` v `grommet-marks/src/ui.js:967`; README GM „kroužky nebo čtverce“. | [K] |

---

## 3. Navržená řešení

Jde o směr, ne hotový design systém. Ten je fáze 2 a počítá s rozhodnutími z §5.

**R1. Jedna velikost okna po celou dobu dialogu** (U1, U2, U3, U15). Vzor existuje
v TE a BTE: `stack`, který drží výšku nejvyššího obsahu. Skrytý obsah místo drží,
to je naměřené.
- GM: Hrany a Cesta v jednom `stack`. Zrcadlený řádek hrany zašednout, ne sbalit.
- ZSM: jedno okno, prvky režimu v `stack`, řádky vrstev v rezervované ploše (§5, Q4).

**R2. Sdílené komponenty vzhledu** (U29, U15, U16). `shared/lib/ui_kit.js` jako
factory `buildUiKit(NS)`: panel předvoleb, patička s tlačítky, stavový řádek, řádek
s číslem, řádek se souborem, škála rozestupů. Splňuje kritérium „oprav jednou, platí
i tam“ z `docs/decisions.md`. Otestovat lze stejně jako dosavadní moduly, jen rozměry
potřebují měření v Illustratoru.

**R3. Jeden stavový řádek na jednom místě** (U6, U7, U21). Přímo nad tlačítky,
přes celou šířku, stálá výška, symbol + barva + tučně. Podrobnosti zůstávají
v panelu nástroje. BRE dostane živou kontrolu, šedé tlačítko a stav; kontrola
počtu stran před během zůstává.

**R4. Pravidla klávesnice** (U4, U5, U10, U11). Enter = primární akce, Esc = Storno,
všude. Výchozí fokus: první pole, které se v běžné práci mění, nebo žádné, když
se obvykle jen potvrzuje; po měření. Před přepisem souborů dotaz, ale jen když běh
opravdu něco přepíše. Ochrana v BTE zůstává jako zdůvodněná výjimka, protože jinak
by běh neodpovídal náhledu.

**R5. Jedna škála rozestupů** (U19, U20). Nativní hodnoty mají výhodu, že „nemůžou
driftovat“, ale zvýší GM a ZSM, které jsou už teď vysoké. Rozhodnu po změření;
kánon §3 pak bude říkat jednu věc.

**R6. Stavové barvy podle jasu UI** (U14). `FieldPaint` už jas rozlišuje (`isDarkUI`).
Přidat dvě sady s kontrastem aspoň 4,5:1 proti změřeným pozadím, změřit i střední
jasy a ověřit okem.

**R7. Slovník** (U17, U18, U24–U28). Návrh k potvrzení ve fázi 2:

| dnes | návrh | proč |
|---|---|---|
| TE panel `Výsledek` | `Náhled` | ukazuje, co se teprve stane; `Výsledek` zůstane pro Souhrn |
| BRE `Náhled zpracování` | `Kontrola souborů` | je to kontrola, ne náhled |
| BRE `Výstup:` | `Cílová složka:` | rozhodnutý termín; sloupec 96 px je třeba rozšířit, kánon §12.8 upravit |
| TE `Výstup:` | `Způsob ořezu:` | neplést se soubory |
| ZSM `Nastavení výstupu` | `Režim` nebo `Stroj` | panel nenastavuje soubory |
| ZSM `ZUND`, `SUMMA` | `Zünd`, `Summa` | značka se píše takto i v TE a v názvu nástroje |
| `Pouze…` | `Jen…` | kratší a převažuje |
| ZSM `(Auto-fit)`, `(Fixed)`, `(Top)`, `(Bottom)`, `(Feed)` | bez závorek | zůstane, jen pokud obsluha anglický termín opravdu používá |
| chyby polí | `%s: zadejte číslo od %s do %s.` | říká, kde je chyba i co zadat |

**R8. Úklid dokumentace** (U20, U30, U31) spolu s každým nástrojem; mimo pořadí jen
to, co by mátlo další práci.

**R9. Před zásahem do ZSM ověřit U12** a případně opravit jako samostatnou chybu.
Vztahuje se k vydané verzi, nečeká na fázi 3. Patří do vlákna ZSM.

---

## 4. Provedené změny

Jen tento report na větvi `docs/family-ux-audit` ve worktree
`.worktrees/family-ux-audit`. Kód nástrojů, skilly, kánon ani `main` se nezměnily.
Nic není pushnuto.

---

## 5. Nevyřešené otázky

**Q1. Vizuální položky zadání, které ScriptUI nejspíš nedovolí.** Zadání chce
hover, active a focus stavy, poloměr rohů, vzhled tlačítek a záložek. Nativní prvky
kreslí Illustrator a změřené máme jen písmo a barvu textu na `statictext`
a `edittext` [M]. O barvě nativního tlačítka a o `tabbedpanel` nic změřeného
nemáme [H]. Vlastní kreslení přes `onDraw` by vzhled dalo, ale vzalo by nativní
výchozí tlačítko, fokus a chování na různých jasech UI a znamenalo víc kódu.
**Doporučení:** nativní prvky a disciplína v rozměrech, pořadí, textech a stavech.
„Destruktivní tlačítko“ odliší text a potvrzení, ne barva. Krátkou sondou ověřit,
co jde, a do kánonu zapsat jen to.

**Q2. Kde bude kánon.** Zadání chce `UI_UX_CANON.md`. Skill
`extendscript-ui-standards` §12 a checklist §10 to z velké části už jsou; dva zdroje
by se rozešly a skilly nejsou pod gitem. Repo je veřejné a odložený úklid interních
dokumentů se tohoto rozhodnutí týká. **Doporučení:** `UI_UX_CANON.md`,
`UI_UX_VIOLATIONS.md` a `UI_UX_REVIEW_CHECKLIST.md` do `docs/` tohoto repa jako jediný
zdroj; skill se zkrátí na odkaz a na to, co potřebuje generování kódu. Nic v nich není
tajné.

**Q3. Pořadí vůči rozpracovaným verzím a vláknům.** Běží TE 1.3.0, ZSM 1.3.0
a BTE 1.1.0; ZSM 1.3.0 mění právě tabulku vrstev. Platí i pravidlo „jedno vlákno na
nástroj“, kdežto tohle je jedna práce napříč. **Doporučení:** nejdřív dokončit
a vydat tyto tři verze, jinak bude refactor kolidovat. Fáze 2 a sdílené moduly tady;
přechod každého nástroje na vlastní větvi jeden po druhém, s ručním testem
a vydáním, než začne další.

**Q4. Stálá výška proti malému displeji (zásadní pro GM a ZSM).** Stálá výška znamená
výšku nejvyššího stavu. GM má dnes až 804 px, což se vejde. ZSM s rezervou na 8 řádků
vrstev by mělo přes 900 px, což se nevejde, a ScriptUI nemá posuvnou plochu.
Varianty pro ZSM:
- **a) Dva sloupce jako TE a BTE, vrstvy vpravo v rezervované ploše s pevným počtem
  řádků.** Stálé, vejde se, rychlé. Zavádí horní mez počtu vrstev, dnes žádná není.
  **Doporučuji, pokud je mez přijatelná.** Otázka zní: kolik vrstev se v praxi
  mapuje nejvýš?
- b) Seznam vrstev + editor jako kroky v BTE. Bez meze, ale víc klikání na každou změnu.
- c) Nechat ZSM jako vědomou výjimku a stabilizovat jen okolí. Nejlevnější, ale zadání
  tím nesplní.

**Q5. Přepis souborů.** Zavést dotaz před přepisem v TE a BRE, jen když běh opravdu
přepíše něco, co Přeskočit nechrání? V provozu se možná vědomě přepisuje při každém
opakování a dotaz by pak zdržoval. **Doporučení:** dotaz s počtem souborů
a výchozí volbou Přepsat, takže Enter + Enter práci nezpomalí, ale omyl zachytí.

**Q6. Rozsah změny.** Fáze 3 znamená zásah do 6400 řádků `ui.js`, nové vydání pěti
nástrojů a změnu rozložení, na které má obsluha v ZSM a GM svalovou paměť. **Doporučení:**
přijmout to jen pro to, co přináší hodnotu v běžném dni: R1 až R4 a R6, R7. TE a BTE
nepřestavovat kvůli vzhledu, jen je napojit na sdílené prvky, až bude co sdílet.

**Q7. Měření v Illustratoru.** Bez něj se nedá rozhodnout R5, ověřit fokus a Q1.
Potřebuje to Illustrator bez otevřeného pracovního dokumentu a souhlas se spuštěním
sond s dialogy bez zobrazení. Vzhled ověří jen lidské oko: potřebuji snímky pěti oken
ve světlém a tmavém UI.

---

## 6. Co se statickým čtením ověřit nedá

Měření v Illustratoru (sonda bez zobrazení, se souhlasem, bez otevřeného dokumentu):

- aktuální rozměry všech oken ve všech režimech, poloha primárního tlačítka;
- výška GM a ZSM po převedení na `stack`;
- výchozí fokus v každém dialogu;
- počet kroků Cmd+Z po běhu ZSM;
- pozadí středních jasů UI a kontrast stavových barev;
- účinek `"Bold"` proti `"BOLD"`; barva textu nativního tlačítka; vzhled `tabbedpanel`;
- U30: kdy sbalení panelu opravdu zmenší okno.

Ruční test obsluhou:

- problikávání při přestavbě a při přepočtu na každý znak (U2, U9);
- Tab přes přepínače, seznamy a dvousloupcové rozložení;
- Esc v okně Souhrn, které má jen tlačítko Zavřít;
- U12: přepnout režim, Uložit jako…, Storno, znovu otevřít;
- celkový dojem z oken (B8), který ze zdrojového kódu nelze posoudit.
