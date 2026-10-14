# Audit společného jazyka — čtyři nástroje pro Illustrator

Datum: 2026-10-14. Rozsah: všechny čtyři nástroje v `main` (c75ca8a) —
grommet-marks 1.2.0, zund-summa-marks 1.1.0, batch-relink-export 1.1.0
a tile-export 1.1.0 (nevydaná); u grommet-marks navíc větev
`feat/grommet-marks-path-mode` (4299c5c, budoucí 1.3.0) tam, kde mění to, o čem
je řeč. Otázka: které funkční a UI/UX vzory nástroje sdílejí, kde se totéž řeší
různě, co jeden nástroj má a ostatním chybí a co by mělo být společným
rukopisem, aby čtyři skripty působily jako dílo jednoho autora.

Audit je jen prověrka stavu: v kódu se nic neměnilo a v Illustratoru se nic
neměřilo. Nálezy, které vedly dřívější reporty, nesou jejich kód (A…, G…, K…,
B…, N…). Cesty jsou relativní ke kořeni repa.

## Metoda

- Přečtené celé `ui.js`, `main.js`, `locale.js`, `storage.js`, `config.js`
  (u GM i `constants.js`) a validace všech čtyř nástrojů a
  `shared/lib/ui_state.js`; z doménových modulů kreslení, export a hledání
  registrační barvy.
- Podklady: audity UI z 2026-09-28 a 2026-09-29, CHANGELOGy,
  `docs/conventions.md`, `docs/decisions.md`,
  `docs/extendscript-engine-facts.md` a standard `extendscript-ui-standards`.
- České texty spočítané skriptem nad tabulkami `cs` (oslovení, dvojtečky,
  uvozovky, prefixy).
- **Jistota:** *z kódu* (přečteno, nespuštěno), *naměřeno dřív* (opírá se
  o engine-facts), *neověřeno* (potřebuje sondu nebo ruční test).

## 1. Verdikt

1. **Kostra už společná je.** Dialog má ve všech nástrojích stejnou stavbu
   (předvolby nahoře, panely podle úlohy, šedá patička s verzí, Storno vlevo,
   pojmenovaná hlavní akce vpravo), tři nástroje sdílejí logiku předvoleb
   (`ui_state.js`) a slovník tlačítek je sjednocený od září. Na tom se dá stavět.
2. **Rozchází se hlavně to, co operátor čte.** Tytéž Zünd parametry se v ZSM
   a TE jmenují jinak, přestože je počítá jeden sdílený modul; TE tyká, ostatní
   vykají; kolem předvoleb má každý nástroj jiné věty; neočekávanou chybu hlásí
   každý jinak; patička TE se liší od ostatních tří. Opravy jsou levné (texty)
   a viditelné.
3. **Funkční prvky, které jinde chybí, váží víc než vzhled.** Nejvážnější:
   TE ve 13 polích tiše dosadí 0 nebo výchozí hodnotu, když číslo obsahuje
   překlep (GM stejnou třídu chyb opravil v 1.2.0); TE přeskakuje „hotové"
   výstupy jen podle existence souboru (BRE to v 1.1.0 opravil porovnáním
   dat); ochrana proti zděděnému čárkovanému tahu (GM G2) chybí v ZSM
   a v kontrolních plátech TE; průběh se zastavením Esc má jen BRE.
4. **Co nesjednocovat:** rozměrové bloky, okraje a mezery dialogů (standard
   §4.1: tvar a místo ano, hodnoty ne — pro operátora neviditelné), doménové
   rozdíly (jednotky v GM, opakovaný běh GM přidává, BRE bez pojmenovaných
   předvoleb). Sdílený kód jen tam, kde se prokazatelně opravovalo dvakrát (§6).

## 2. Co rodinu spojuje a nemá se rozbít

- Stavba dialogu podle standardu: panel Předvolby první (GM, ZSM, TE), šedá
  patička s verzí, Storno vlevo a pojmenovaná akce vpravo (Generovat, Spustit,
  Vytvořit a exportovat), Enter a Esc přes `name: "ok"` / `"cancel"`,
  `alignChildren: fill` bez šířky okna.
- Předvolby přes sdílený `ui_state.js` (GM, ZSM, TE): [Výchozí] nejde přepsat
  ani smazat, názvy v hranatých závorkách jsou vyhrazené, změněná předvolba
  nese hvězdičku, ↺ stojí vedle seznamu, Uložit / Uložit jako… / Smazat ve
  druhém řádku, smazání i přepsání se potvrzuje, dialog se otevírá s hodnotami
  posledního běhu.
- Slovník tlačítek: Storno, Uložit, Uložit jako…, Smazat, Vybrat….
- Živá kontrola zašedí hlavní tlačítko (GM, ZSM, TE); desetinná čárka i tečka.
- Hlášky z oprav 2026-09 a 2026-10 říkají co, proč a co udělat.
- Nastavení jako JSON ve `Folder.userData`; poslední běh se pamatuje ve všech
  čtyřech (BRE od 1.1.0).
- Předpoklady se kontrolují dřív, než se dokument změní; upozornění přijdou
  v jednom okně na konci.
- Dokument: pevná osa Y (`coordinateSystem`) a přepočet Large Canvas v GM, ZSM
  i TE.
- Sdílené jádro: `json2.js` (4 nástroje), `ui_state.js` (3), `cut_marks.js`
  (ZSM, TE).

## 3. Matice vzorů

✓ má · ✗ nemá · ~ částečně · — netýká se

### Kostra a podpis

| | GM | ZSM | BRE | TE |
|---|---|---|---|---|
| Titulek okna | „Illustrator Grommet Marks v1.2.0" | „Zünd & Summa Marks v1.1.0", v měřítku s „— 1:N" | „Batch Relink Export v1.1.0" (český `TITLE` nepoužitý) | „Tile Export v1.1.0" |
| Patička | „© 2025–2026 Ladislav Osvald · v…" | stejně | stejně, v řádku tlačítek | „© 2026 Osva1d — Tile Export v…" |
| Panel předvoleb | ✓ | ✓ | ✗ jen poslední běh | ✓ |
| Tovární hodnoty (Výchozí) | ✗ | ✓ | — | ✗ (klíč `BTN_DEFAULTS` nepoužitý) |
| Úvodní fokus | ✗ | ✓ první pole | ✗ | ✗ |
| Pozice okna | výchozí | drží se při přepnutí režimu | výchozí | `center()` |

### Vstupy a validace

| | GM | ZSM | BRE | TE |
|---|---|---|---|---|
| Překlep v čísle („1O5", „1 000") | pole zčervená, Generovat zablokované (A9) | živá kontrola projde (`parseFloat`), zastaví až alert po Generovat | — | 13 polí tiše dosadí 0 nebo výchozí hodnotu |
| Červené pole | ✓ | ✓ | — | ✗ |
| Proč je hlavní tlačítko šedé | ✗ (A6) | stavový řádek: pole a povolený rozsah | — | panel Výsledek, řádky ✗ a ! |
| Kontrola cest a složek | — | — | po Spustit, dialog zůstane otevřený | cílová složka až po zavření dialogu |
| Jednotky | volba mm / cm / in, tahy „(pt)" | „mm" u každého pole | — | „mm" / „pt" u polí |

### Zpětná vazba

| | GM | ZSM | BRE | TE |
|---|---|---|---|---|
| Co skript v dokumentu našel | 1.3.0: šedý řádek (artboardy a rozměr, nebo cesta a rohy) | stavový řádek v klidu: režim · měřítko · vrstvy | náhled názvu | panel Dokument + Výsledek |
| Náhled před během | — | — | jen při nesrovnalostech | Výsledek živě |
| Průběh a zastavení | — (zlomek sekundy) | — | paleta, podržet Esc | ✗ |
| Souhrn na konci | jen upozornění | upozornění, nebo chyba | okno s počty a detaily | alert s počty |
| Otevřít výstupní složku | — | — | ✓ volba | ✗ |
| Blokující chyba řekne, že se dokument nezměnil | ✗ | ✓ „Dokument nebyl změněn." | — | ~ jen u kolize značek |
| Neočekávaná chyba | „Illustrator Grommet Marks: Neočekávaná chyba — … (line N)" | „KRITICKÁ CHYBA: … (line N)" | „Skript se zastavil kvůli neočekávané chybě: … Pošlete tuto hlášku správci skriptu (řádek N)." | „KRITICKÁ CHYBA: …" a „Line: N" |
| Bez dokumentu | „Před spuštěním skriptu otevřete dokument." | „Není otevřený dokument." | — | „Není otevřený žádný dokument." |
| Nastavení se neuložilo | „Nelze zapsat soubor s nastavením." | stejně | i s následkem: „…příště se dialog otevře bez něj. Dávka pokračuje." | stejně jako GM |

### Paměť a předvolby

| | GM | ZSM | BRE | TE |
|---|---|---|---|---|
| [Výchozí] z kódu při každém otevření | jen bez souboru nastavení | ✓ (+ barva řezu z dokumentu) | — | ✓ (oprava v 1.1.0) |
| Hvězdička po přepnutí na jinou předvolbu | zůstane u předchozí | zůstane u předchozí | — | ✓ přepíše všechny položky |
| Uložit u [Výchozí] | otevře Uložit jako… | otevře Uložit jako… | — | tlačítko zašedlé |
| Uložená hodnota, kterou dokument nemá | — | „(chybí)" v seznamu | PDF preset: tiše výchozí vzor | tiše první položka (barva značek, PDF preset) |
| Měřítko kresby | ✗ jen Large Canvas | v předvolbě a v posledním běhu | — | v dokumentu (XMP) |
| Soubor nastavení | `GrommetMarks/GrommetMarksSettings.json` | `ZSM/settings.json` | `batch-relink-export/settings.json` | `tile-export/settings.json` |

### Dokument a kreslení

| | GM | ZSM | BRE | TE |
|---|---|---|---|---|
| Registrační barva | jen `swatches[1]` s kontrolou typu | hledá podle typu | — | hledá podle typu |
| Čistý tah nové cesty (G2) | ✓ `_plainStroke` | ✗ OPOS pruh, ořezové linky | — | ✗ kontrolní pláty v pracovním dokumentu |
| Skrytá cílová vrstva | zviditelní a ohlásí | zviditelní a ohlásí | odemkne i podvrstvy (B7) | — vlastní nová vrstva |
| Opakovaný běh | přidá a ohlásí překryv (G4) | nahradí vlastní výstup | — | nahradí `TE_panels` |

### Soubory

| | GM | ZSM | BRE | TE |
|---|---|---|---|---|
| Vzor pojmenování | — | — | `{n} {template} {source}` | `{doc} {n} {total} {size} {scale}` |
| Nápověda proměnných | — | — | šedá legenda pod polem | tlačítka, která připisují na konec |
| Náhled názvu | — | — | ✓ tučně pod vzorem | ✓ ve Výsledku |
| Kontrola názvu (prázdný, `/`, `:`) | — | — | ✗ | ✓ |
| Přeskočit hotové | — | — | jen výstup novější než zdroj i šablona (B8) | stačí, že soubor existuje |
| Výchozí PDF preset | — | — | `[Kvalitní tisk]` | první v seznamu, česky `[Výchozí Illustratoru]` |

### Hlas

| | GM | ZSM | BRE | TE |
|---|---|---|---|---|
| Oslovení | vykání | vykání | vykání | tykání (9 textů), 2 hlášky převzaté ze ZSM vykají |
| Dvojtečka za popiskem pole | ✓ všude | ✓ všude | ✗ (jen „Náhled názvu:") | ✗ |
| Uvozovky kolem názvů v hláškách | "…" | ‘…’ | „…“ i '…' | bez uvozovek |
| Prefix hlášek | UPOZORNĚNÍ: | CHYBA: · UPOZORNĚNÍ: · KRITICKÁ CHYBA: | — | KRITICKÁ CHYBA: |
| Stavové symboly | — | ⚠ | ● v barvách | ✗ a ! |
| Červená chyby (RGB 0–1) | 0,90 0,20 0,20 | 0,90 0,20 0,20, jantarová 0,96 0,60 0,38 | 0,76 0,31 0,25, jantarová 0,79 0,64 0,23 | — |
| Počty v textu | 1.3.0: `L.count` (1 / 2–4 / 5+) | přeformulováno („vrstvy: 3") | přeformulováno („pozic: 4") | přeformulováno („Počet plátů: 3") |

## 4. Viditelné rozdíly v textech a vzhledu

### J1 — Tytéž parametry, různá jména

Zünd parametry počítá v ZSM i TE tentýž `shared/lib/cut_marks.js`, rozdíl tedy
není doménový:

| hodnota | ZSM | TE | návrh |
|---|---|---|---|
| `gapInner` | Mezera od grafiky | Odstup od motivu | Mezera od grafiky |
| `maxDist` | Rozteč značek | Max. rozteč | Max. rozteč značek |
| `markSizeZ` | Velikost Zünd | Průměr značky | Průměr značky |
| `orientDist` | Odsazení orientační značky | Orientační bod | Odsazení orientační značky |
| `markColor` | Barva značek (Spot) | Barva značek | Barva značek |

Hlášky o kolizi značek mluví v ZSM o „orientační značce", v TE o „orientačním
bodu". Operátor, který dělá Zünd v obou nástrojích, hledá pole podle jména.
Návrh: jeden slovník pro oba nástroje; nápovědy převzít tam, kde jsou
konkrétnější (u TE většinou). Délku popisku v TE ověřit měřením, sloupec má
150 px. Do slovníku patří i GM: vzdálenost středů značek se tam jmenuje
Rozestup (hrany) i rozteč (rohové zóny).

Totéž u souborových nástrojů:

| pojem | BRE | TE |
|---|---|---|
| výstupní složka | Výstup | Cílová složka |
| vzor názvu | Vzor | Vzor pojmenování |
| PDF preset | PDF Preset | PDF preset |
| přeskakování | Přeskočit existující soubory | Přeskočit hotové výstupy |

BRE má úzký sloupec popisků (96 px) a krátké tvary jsou tam záměr; sjednotit
jde aspoň nápovědy a hlášky. Jistota: z kódu.

### J2 — Oslovení

TE tyká v 9 textech (`TIP_MODE` „kam jsi je vytáhl", `TIP_WIDTH` „počítej s
tím", `TIP_SAVE` „ulož pod novým jménem", `ERR_RESERVED_NAME` „Zvol jiný" a
další), ale `ERR_MARKS_OVERLAP` a `ERR_MARKS_ORIENT` převzaté ze ZSM vykají
(„Zvětšete…"). GM, ZSM a BRE vykají všude, stejně jako šablony hlášek ve skillu
`ui-ux-principles`. Je to nejnápadnější rozdíl hlasu a TE ho má i uvnitř sebe.
Rozhodnuto: vykání (§8). Jistota: z kódu (spočítáno).

### J3 — Věty kolem předvoleb

Logiku sdílí `ui_state.js`, věty má každý nástroj svoje:

| situace | GM | ZSM | TE |
|---|---|---|---|
| výzva k názvu | „Uložit aktuální nastavení jako novou předvolbu:" | stejně | „Název předvolby:" |
| přepsat | „Nastavení "%s" již existuje. Nahradit?" | „Předvolba již existuje. Přepsat?" (bez názvu) | „Předvolba %s už existuje. Přepsat?" |
| smazat | „Trvale smazat nastavení "%s"?" | „Smazat předvolbu ‘%s’? Tuto akci nelze vrátit zpět." | „Smazat předvolbu %s?" |
| vyhrazený název | „Tento název je rezervovaný. Vyberte jiný." | stejně | „Názvy v hranatých závorkách jsou vyhrazené. Zvol jiný." |
| prázdný název | „Zadejte název." | nic | nic |

GM navíc říká „předvolba" i „nastavení" pro totéž a nápovědy TE (`TIP_SAVE`,
`TIP_DEL`) mluví o [Default], zatímco seznam ukazuje [Výchozí]. Návrh: jedna
sada vět se jménem předvolby v „…" ve všech třech, stejně pojmenované klíče.
Jistota: z kódu.

### J4 — Podpis: patička a titulek

GM, ZSM a BRE píšou „© 2025–2026 Ladislav Osvald · v1.2.0", TE „© 2026 Osva1d
— Tile Export v1.1.0". TE se drží šablony ze standardu
(`extendscript-ui-standards` §9), jenže ta odporuje `docs/conventions.md`:
„Author je vždy Ladislav Osvald … Osva1d je git identita, ne autor produktu".
Všechny čtyři mají text napsaný přímo v `ui.js` (GM `:634`, ZSM `:597`, BRE
`:158`, TE `:552`), takže změna roku znamená čtyři úpravy. Titulek nese
„Illustrator" jen v GM (`GM.CONSTANTS.SCRIPT_NAME`); BRE má český titulek
`TITLE` v locale a nepoužívá ho. Návrh: patička podle conventions ve všech
čtyřech a opravená šablona ve skillu (rozhodnuto, §8); titulek „Název vX.Y.Z"
bez „Illustrator". Jistota: z kódu.

### J5 — Neočekávaná chyba a chybějící dokument

Čtyři formáty neočekávané chyby a tři věty pro chybějící dokument (matice §3).
Nejlépe je na tom BRE: řekne, že se skript zastavil, a co s hláškou udělat;
ZSM u chyby během kreslení navíc radí, jak dokument zkontrolovat a vrátit
(`ERR_RENDER_CRITICAL`). GM, ZSM a TE přidávají anglické „line" / „Line" (ZSM
audit T5). Návrh: jedna šablona — co se stalo (s řádkem), v jakém stavu může
být dokument a co poslat autorovi; pro chybějící dokument věta GM, která říká,
co udělat. Jistota: z kódu.

### J6 — Typografie hlášek

Dvojtečka za popiskem pole: GM a ZSM ano, BRE a TE ne. Uvozovky kolem názvů:
"…" (GM), ‘…’ (ZSM), „…" i '…' (BRE), žádné (TE). Prefixy: UPOZORNĚNÍ:,
CHYBA:, KRITICKÁ CHYBA: nebo nic. GM a ZSM mají ve validaci vykřičníky.
Návrh: české „…“ kolem názvů všude, dva prefixy (CHYBA:, UPOZORNĚNÍ:) podle
ZSM, bez vykřičníků; za popiskem pole dvojtečka (rozhodnuto, §8). Jistota:
z kódu.

### J7 — Stavové symboly a barvy

Tři slovníky symbolů (⚠ v ZSM, ● v BRE, ✗ a ! v TE), dvě různé červené
(GM a ZSM 0,90 0,20 0,20, BRE 0,76 0,31 0,25) a dvě různé jantarové. Návrh:
jedna sada — ✗ chyba, ⚠ upozornění, ✓ v pořádku — a jedny hodnoty RGB zapsané
ve standardu. Jistota: z kódu; vzhled ve světlém a tmavém UI neověřen.

### J8 — Řádek „co skript v dokumentu našel"

Tři nástroje k němu došly každý sám: ZSM (stavový řádek v klidu: „ZUND · 1:10
· vrstvy: 1"), TE (panel Dokument: čistý formát a dostupný spad) a GM 1.3.0
(šedý řádek „1 artboard · 500 × 300 mm" nebo „Uzavřená cesta · 4 rohy ·
značky leží na cestě"). Tvar i místo se liší. Návrh: udělat z něj vědomý
rodinný prvek — šedý řádek s tím, co skript našel, a na stejném místě i důvod,
proč je hlavní tlačítko šedé (spojuje řešení ZSM a TE; GM ho zatím nemá, P8).
Jistota: z kódu.

## 5. Funkční prvky, které jinde chybí

### P1 — TE: překlep v čísle tiše změní hodnotu

`tile-export/src/ui.js:868–906`: 13 polí se čte jako
`TE.Utils.toNumber(text) || výchozí` — Přelep, čtyři přídavky, zaokrouhlení
vodítek, měřítko kresby, tloušťka linky, rozlišení a čtyři Zünd pole. Číslo
s překlepem („2O", „1 000", „20 mm") je NaN a `||` místo něj dosadí 0 nebo
výchozí hodnotu. Výsledek neukáže ✗ ani ! a tlačítka zůstanou aktivní. Přelep
„2O" (písmeno O) tak dá pláty bez přelepu. Je to i ve vydané 1.0.1.

GM stejnou třídu opravil v 1.2.0 (A9) jednou převodní funkcí pro pole, živou
kontrolu i odeslání (`grommet-marks/src/lib/validation.js:36`). ZSM je v
půli cesty: odeslání je přísné (`ZSM.Utils.validateNumber`), ale živá kontrola
čte `parseFloat` (`zund-summa-marks/src/ui.js:618`, `:1126`), takže „1O5"
nezčervená a zastaví ho až alert po Generovat.

Návrh: jedno pravidlo pro rodinu — čárka i tečka, mezery okolo; cokoli jiného
je neplatné pole (červené, s důvodem), nikdy jiné číslo ani tichá výchozí
hodnota. Prázdné pole smí dostat výchozí hodnotu jen tam, kde to pole výslovně
říká. Jistota: z kódu (chování `Number` a `||` je jednoznačné).

### P2 — TE: „Přeskočit hotové výstupy" věří jakémukoli souboru se stejným jménem

`tile-export/src/export.js:156–162` kontroluje jen existenci. Komentář nad
funkcí (`:150`) tvrdí „same crash-recovery behaviour as batch-relink-export",
jenže BRE od 1.1.0 (B8) přeskočí jen výstup novější než zdroj i šablona
(`batch-relink-export/src/main.js:114–126`). Proto TE v 1.0.1 volbu ve
výchozím stavu vypnul — po opravě v něm zůstávaly staré soubory. Návrh:
převzít pravidlo BRE (výstup musí být novější než pracovní dokument
i umístěné PDF, starší se vytvoří znovu a souhrn to řekne). Jistota: z kódu.

### P3 — Zděděný styl tahu (G2) ošetřuje jen GM

Engine-facts (sekce „Styl nových cest, Large Canvas a geometrie cest")
naměřila, že cesta ze skriptu přebírá čárky, konce i spoje z výchozího stylu
dokumentu a že výběr ten styl mění. Závěr tam zní: cesta, na jejímž vzhledu
záleží, si musí `strokeDashes`, `strokeCap` a `strokeJoin` nastavit výslovně.
GM to dělá (`grommet-marks/src/illustrator.js:174–177`). ZSM kreslí tahem OPOS
pruh (`zund-summa-marks/src/draw.js:362–367`) a ořezové linky (`:615–629`)
do aktivního dokumentu bez toho; TE stejně kontrolní pláty
(`tile-export/src/check.js:317–322`, `src/draw.js:92–102`) v pracovním
dokumentu. Export TE kreslí cut cestu a značky do nového dokumentu; ten při
měření začal bez čárek, ale jestli do něj nepřejde styl ze zdrojového
dokumentu, změřené není.

ZSM na začátku kreslení ruší výběr (`draw.js:116`), ale jestli tím vrátí
výchozí styl, engine-facts neměří („stav po zrušení výběru neměřen"). Dopad,
pokud se potvrdí: čárkovaný OPOS pruh, který kamera Summy nemusí přečíst, nebo
čárkovaná linka v kontrolním plátu. Návrh: jedna sonda přes `tools/ai-eval.sh`
(vybrat čárkovanou cestu, zrušit výběr, vytvořit cestu, přečíst
`strokeDashes`) a podle výsledku převzít `_plainStroke`. Pravidlo patří do
skillu `manipulating-illustrator-items`, aby ho nový kód dostal sám. Jistota:
mechanismus naměřený dřív, dopad na ZSM a TE neověřený.

### P4 — Registrační barva: GM hledá jen na pozici 1

`grommet-marks/src/illustrator.js:122–133` vezme `swatches[1]` a ověří typ;
když tam registrace není, kreslí 100 % K. ZSM (`draw.js:1019`) a TE
(`draw.js:121`) projdou celý vzorník podle typu — tuhle opravu dostal
2026-10-03 nejdřív TE, pak ZSM. Komentáře v obou tvrdí „Same check as
grommet-marks", což neplatí. Dopad: v dokumentu, kde registrace není druhá,
dostanou značky GM 100 % K místo registrace. Návrh: převzít hledání podle typu
(kandidát na sdílený kód, §6). Jistota: z kódu.

### P5 — Hvězdička zůstane u předchozí předvolby

Po přepnutí z upravené předvolby na jinou přepisují GM (`ui.js:861`) a ZSM
(`ui.js:809`) jen text aktivní položky, takže předchozí si v seznamu nechá
„ *", přestože její úpravy zmizely. TE přepisuje všechny položky
(`ui.js:691`) a komentář říká proč. Návrh: převzít řešení TE. Jistota: z kódu,
v dialogu neověřeno.

### P6 — Dlouhý běh bez odezvy: průběh a zastavení má jen BRE

BRE ukazuje paletu se souborem, pořadím a ukazatelem a dávku zastaví
podržením Esc (naměřeno: tlačítku palety Illustrator během běhu kliknutí
nepředá; `batch-relink-export/src/ui.js:414–480`). TE exportuje plát po plátu
do dočasných dokumentů, v Zünd režimu dvě PDF na plát
(`tile-export/src/main.js:192–204`), a do konce neukáže nic. U dvanácti plátů
to budou nejspíš desítky sekund — délku exportu jsem neměřil. Návrh: změřit
jeden běh; když přesáhne pár sekund, převzít paletu BRE. Jistota: z kódu,
délka neověřena.

### P7 — Souhrn a otevření výstupní složky

BRE končí oknem Výsledek zpracování (počty, chyby červeně, detaily) a volbou
„Po dokončení otevřít výstupní složku" (`main.js:255–257`). TE končí alertem
s počty, selhání vypíše jako řádky „číslo: hláška" a složku neotevře. Návrh:
TE převezme volbu otevřít složku (levné), souhrnné okno spolu s průběhem (P6).
Jistota: z kódu.

### P8 — Proč je hlavní tlačítko šedé

ZSM to říká ve stavovém řádku (pole a povolený rozsah, u více chyb jejich
počet), TE v panelu Výsledek (chyby nahoře se ✗). GM Generovat zašedí bez
vysvětlení, i ve větvi 1.3.0 — třeba když není zapnutá žádná hrana nebo
značka nemá tvar (audit A6). Návrh: GM přidá důvod do nového šedého řádku
z 1.3.0 (J8). Jistota: z kódu.

### P9 — TE kontroluje cílovou složku až po zavření dialogu

`tile-export/src/main.js:147–151`: s prázdnou nebo neexistující složkou je
Vytvořit a exportovat aktivní. Po kliknutí se nejdřív postaví kontrolní pláty
a pak přijde „Do cílové složky nelze zapisovat: " — u prázdného pole bez cesty.
[Výchozí] má složku prázdnou, takže to potká první export na novém počítači.
BRE měl totéž (audit A4) a opravil to kontrolou při Spustit: dialog zůstane
otevřený a hláška zní „Vyberte výstupní složku." Návrh: TE ukáže důvod ve
Výsledku (✗ a zašedlý export) a prázdné pole pojmenuje. Jistota: z kódu.

### P10 — Uložená hodnota, kterou dokument nemá

ZSM ji ukáže v seznamu s „(chybí)" a při běhu ohlásí náhradu
(`ui.js:1583–1613`); komentář výslovně odmítá tichý návrat na první položku.
TE dělá přesně to: barva značek a PDF preset, které v seznamu nejsou, se tiše
nahradí první položkou (`ui.js:401`, `:467`, `:957`, `:973`). BRE u PDF
presetu tiše vezme výchozí vzor. Dopad: předvolba s bílou přímou barvou pro
čirý materiál dá v dokumentu bez té barvy registrační značky, bez upozornění.
Návrh: převzít „(chybí)" ze ZSM. Jistota: z kódu.

### P11 — Výchozí PDF preset

BRE předvybere `[Kvalitní tisk]` (High Quality Print) v obou jazycích
(`config.js`, `presetSearchPatterns`). TE má v [Výchozí] prázdný preset
a seznam stojí na první položce, v české instalaci `[Výchozí Illustratoru]`
(pořadí naměřené v engine-facts). Po první volbě si ji oba pamatují, týká se
to tedy jen prvního běhu. Návrh: stejný výchozí preset v obou. Jistota: z kódu
a pořadí naměřené dřív.

### P12 — Měřítko kresby patří dokumentu, zatím jen v TE

TE 1.1.0 ukládá měřítko do XMP dokumentu (`tile-export/src/doc.js:190–252`),
protože poslední běh přenášel 1:10 do další zakázky 1:1 (komentář
`ui.js:231`). ZSM má přesně ten starý stav: zaškrtávátko a pole 1:N jdou do
předvolby i do posledního běhu (`ui.js:670`, `:1040`); zmírňuje to jen
přípona „— 1:10" v titulku a stavový řádek. GM měřítko kresby nezná, jen
Large Canvas.

Návrh: měřítko kresby jako vlastnost dokumentu pro celou rodinu — jeden klíč
v XMP, který přečte každý nástroj. Jmenný prostor je dnes
`…/ns/tile-export/1.0/`; po tagu TE 1.1.0 bude změna znamenat číst dva
prostory. Oprava N43 (Illustrator přejmenoval prefix `te` na `te_1_`) by se
jinak psala znovu v ZSM. Rozhodnutí je odložené na dobu po vydání TE 1.1.0
a GM 1.3.0; GM má měřítko kresby dostat (§8). Jistota: z kódu.

### P13 — Drobnější prvky, které mají jen jednotlivci

- Kontrola názvu souboru (prázdný, `/`, `:`) — TE
  (`tile-export/src/lib/validation.js:228`); BRE vzor nekontroluje.
- Tlačítko Výchozí (tovární hodnoty) — jen ZSM; TE má klíč `BTN_DEFAULTS`
  připravený a nepoužitý.
- Náhled barvy u výběru barvy — jen ZSM (`makeSwatch`); TE má dva výběry barvy
  bez něj.
- Úvodní fokus v prvním poli — jen ZSM.
- Skloňování počtů `L.count` (tvary 1 / 2–4 / 5+) — GM 1.3.0; ostatní větu
  přeformulují, aby číslo nestálo před podstatným jménem. Obojí funguje,
  `count` stojí za to dát do šablony locale ve standardu.
- [Výchozí] z kódu při každém otevření — ZSM a TE. GM ho staví jen bez souboru
  nastavení, takže nové výchozí hodnoty v kódu se k uživateli se souborem
  nedostanou (stejná past, kterou TE opravil v 1.1.0).

## 6. Sdílený kód: kde platí „oprav jednou, platí i tam"

Kritérium z `docs/decisions.md`: sdílet jen tam, kde oprava v jednom nástroji
platí i v ostatních — ne podle textové podobnosti; návrhy sdílet víc podle
podobnosti čtyřikrát neobstály.

| kandidát | důkaz | doporučení |
|---|---|---|
| hledání registrační barvy podle typu | stejná oprava 2026-10-03 dvakrát (TE, pak ZSM), GM ji ještě nemá (P4) | sdílet |
| měřítko kresby v XMP | hodnota má být jedna pro dokument; oprava N43 by se psala znovu (P12) | sdílet, pokud padne rozhodnutí pro rodinné měřítko |
| obsluha panelu předvoleb (tlačítka, hvězdička, věty) | TE opravil hvězdičku, GM a ZSM ne (P5); věty se rozešly (J3) | zatím ne: sjednotit chování a věty podle kánonu (§7); sdílet, až se rozejdou znovu — „pravidlo, které se opakovaně poruší, nahraď mechanismem" |
| obarvení neplatného pole | GM a ZSM mají totožnou funkci, obě dostaly stejnou opravu pro tmavé UI | sdílet, až ji převezme TE |
| paleta průběhu s Esc | jeden uživatel (BRE) | při druhém uživateli (TE) přesunout do `shared/lib`, nekopírovat |
| náhled barvy | jeden uživatel (ZSM) | stejně jako paleta |
| převod čísla z pole | pravidlo stejné, prázdné pole záměrně jinak (TE „" → 0) | nesdílet, sjednotit pravidlo (P1) |
| patička | jeden řádek | nesdílet, text podle conventions |

## 7. Návrh společného rukopisu

Pravidla, která by platila ve všech čtyřech nástrojích. U každého je
nástroj, který ho už dělá dobře.

1. Oslovení: vykání (§8).
2. Popisek pole končí dvojtečkou (§8).
3. Hláška říká, co se stalo, proč a co udělat; blokující chyba končí tím, co
   se s dokumentem stalo („Dokument nebyl změněn."). Vzor: ZSM.
4. Názvy v hláškách v českých uvozovkách „…“.
5. Dva prefixy, CHYBA: a UPOZORNĚNÍ:; neočekávaná chyba jednou šablonou (J5).
   Vzor: BRE `ERR_CRITICAL`.
6. Čísla: čárka i tečka; cokoli jiného je neplatné pole, nikdy jiné číslo ani
   tichá výchozí hodnota. Vzor: GM `parseNumber`.
7. Neplatný vstup: pole zčervená, hlavní tlačítko zašedne a jedno místo řekne
   proč. Vzor: stavový řádek ZSM, Výsledek TE.
8. Šedý řádek s tím, co skript v dokumentu našel. Vzor: GM 1.3.0, panel
   Dokument TE.
9. Předvolby: stejné věty a stejné chování (hvězdička jen u aktivní, přepsaná
   u všech položek; Uložit u [Výchozí] otevře Uložit jako…; potvrzení s názvem
   předvolby). Vzor: TE u hvězdičky, GM a ZSM u Uložit.
10. Uložená hodnota, kterou dokument nemá: v seznamu „(chybí)", při běhu
    upozornění, nikdy tichá záměna. Vzor: ZSM `selectDDL`.
11. Běh delší než pár sekund: paleta s průběhem, Esc dokončí rozpracovanou
    položku a zastaví; na konci souhrn s počty; když vznikají soubory, volba
    otevřít složku. Vzor: BRE.
12. Přeskočit hotové výstupy jen u výstupu novějšího než všechny vstupy. Vzor:
    BRE.
13. Stav: ✗ chyba (červená), ⚠ upozornění (jantarová), ✓ v pořádku (zelená),
    jedny hodnoty RGB.
14. Počty: `L.count` s tvary 1 / 2–4 / 5+, nebo věta bez čísla před podstatným
    jménem. Vzor: GM 1.3.0.
15. Podpis: titulek „Název vX.Y.Z", patička „© 2025–2026 Ladislav Osvald ·
    vX.Y.Z" (§8).
16. Jeden slovník pojmů pro sdílené parametry (J1) a pro rodinu (předvolba,
    ne nastavení; artboard; plát; přelep).
17. Nová cesta ze skriptu nastaví čárky, konce a spoje výslovně (P3).
18. Měřítko kresby jako vlastnost dokumentu — rozhodne se po vydání TE 1.1.0
    a GM 1.3.0 (§8).

Kam s tím: pravidla 1–16 do skillu `extendscript-ui-standards` jako nový
oddíl. Skill se nahrává při každé úpravě dialogu v kterémkoli vlákně, takže
další změny se ke kánonu přiblíží samy. Pravidlo 17 patří do
`manipulating-illustrator-items`, v `docs/conventions.md` stačí odkaz. Patří
k tomu i oprava šablony patičky ve standardu §9.

## 8. Rozhodnutí

Otázky z první verze reportu, rozhodnuté autorem 2026-10-15:

1. **Oslovení: vykání.** Mají ho tři nástroje ze čtyř i šablony hlášek ve
   skillu `ui-ux-principles`; v TE se přepíše 9 textů.
2. **Popisek pole končí dvojtečkou.** Česká lokalizace Illustratoru ji píše
   u polí v klasických dialozích („Šířka:", „Šířka okna:", „Spadávka
   nahoře:", „Spadávka vlevo:"), záhlaví sloupců ji nemají
   (`Support Files/Resources/cs_CZ/Lang-Resources/Illustrator.zbin`,
   prohlédnuté výskyty, ne celý soubor). Doplnit do BRE (6 popisků) a TE (36);
   sloupec popisků TE (150 px) po změně přeměřit.
3. **Patička „© 2025–2026 Ladislav Osvald · vX.Y.Z"** — jako GM, ZSM, BRE
   a hlavička distu. Změní se TE a šablona ve skillu `extendscript-ui-standards`
   §9.
4. **Rodinné měřítko kresby: odloženo** na dobu po vydání TE 1.1.0
   a GM 1.3.0. TE vyjde s klíčem tile-exportu; rodinné měřítko ho pak bude
   muset číst taky.
5. **GM a kresby 1:N: odloženo** na dobu po vydání GM 1.3.0, spolu s bodem 4.
   Směr je daný: pole 1:N a ostatní hodnoty ve skutečné velikosti, jako v TE.

## 9. Pořadí a vlákna

Změny nástroje patří do jeho vlákna; tady jen to, co je průřezové.

**Pořadí podle přínosu k práci:**

1. Kánon do skillu (toto vlákno) — aby se další úpravy sbíhaly samy;
   rozhodnutí z §8 jsou známá.
2. TE: P1 — riziko zkažené zakázky a je i ve vydané 1.0.1.
3. TE: P9 a P2 — levné a chrání před omylem.
4. Sonda P3 — jeden běh `ai-eval`, může odhalit vážnou věc v ZSM.
5. Texty J1–J6 ve všech nástrojích.
6. TE: P6 a P7 (průběh, souhrn, otevřít složku), P10, P11.
7. Po vydání TE 1.1.0 a GM 1.3.0: rodinné měřítko kresby (P12) a měřítko
   v GM (§8, body 4 a 5).
8. Zbytek.

**Podle vlákna:**

- **Toto vlákno:** kánon do `extendscript-ui-standards` a pravidlo tahu do
  `manipulating-illustrator-items`, oprava šablony patičky; se souhlasem
  sdílený modul registrační barvy (měřítko v XMP až po rozhodnutí z §8);
  drift dokumentace z §10.
- **tile-export:** P1, P9, P2, P10, P11, P3 (kontrolní pláty), P7, P6 po
  změření, J1–J4, J6; po vydání 1.1.0 rodinné měřítko (P12).
- **grommet-marks:** po merge 1.3.0 P4, P8, P5, [Výchozí] z kódu (P13),
  J3–J6; měřítko kresby 1:N (§8, bod 5).
- **zund-summa-marks:** P3 (nejdřív sonda), P1 (živá kontrola), P5, J1, J3,
  J5, J6; P12 až po rozhodnutí o rodinném měřítku.
- **batch-relink-export:** kontrola názvu z TE (P13), český titulek (J4), J6;
  jeho hlášky o neočekávané chybě a o neuložení nastavení jsou vzorem pro
  ostatní.

## 10. Drobnosti mimo rozsah

- `docs/conventions.md`, oddíl Sdílené jádro: „Jen dva moduly" — od
  2026-09-13 jsou tři (`cut_marks.js`); `decisions.md` už počítá tři.
- `shared/lib/ui_state.js:3`: „consumed by grommet-marks and
  zund-summa-marks" — používá ho i TE.
- `batch-relink-export/src/ui.js:3` a `src/config.js:3`: hlavička modulu
  „v3.0.0", verze je 1.1.0.
- `zund-summa-marks/src/draw.js:1014` a `tile-export/src/draw.js:116`: „Same
  check as grommet-marks" — GM kontroluje jinak (P4).
- `tile-export/src/export.js:150`: „same crash-recovery behaviour as
  batch-relink-export" — od BRE 1.1.0 neplatí (P2).
- `tile-export/src/locale.js`: 25 řádků s `\uXXXX` vedle přímé češtiny;
  konvence chce literály (pro operátora neviditelné).
- `tile-export/src/main.js:192`: `var … res` znovu deklaruje výsledek dialogu
  a smyčka exportu ho přepíše; dnes to neškodí, po smyčce se nečte.
- Složky nastavení mají čtyři styly názvu (`GrommetMarks`, `ZSM`,
  `batch-relink-export`, `tile-export`). Sjednocení by bez migrace ztratilo
  uložené předvolby a operátor složku nevidí — nestojí za to.
