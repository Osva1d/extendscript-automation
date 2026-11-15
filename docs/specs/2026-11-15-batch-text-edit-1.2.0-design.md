# Návrh — Batch Text Edit 1.2.0: navázání na minulý běh, dvojí číslo, filtr náhledu

Nástroj: `batch-text-edit`, namespace `BTE`.
Navazuje na [návrh 1.0](2026-10-29-batch-text-edit-design.md)
a [návrh 1.1.0](2026-11-05-batch-text-edit-1.1.0-design.md); co tu není,
platí podle nich.

Datum: 2026-11-15 · Stav: **návrh** (čeká na schválení)

Rozsah vybral uživatel 2026-11-15 ze seznamu kandidátů (odložené body §12
návrhu 1.0, §9 návrhu 1.1.0 a rešerše): tři funkce a drobnosti z finálního
review 1.1.0. Ostatní kandidáti čekají na zakázku (§9).

---

## 1. Proč

- **Druhý blok znamená počítat.** README radí: další blok vybrat, spustit
  znovu se stejnou předvolbou a změnit rozsah čísel. Dialog se otevře
  s minulým během, tedy s Od 1 a Do 240, a obsluha musí sama spočítat 241
  a 480. Překlep dá díru v řadě nebo dvě stejná čísla v zakázce a ukáže se
  až na tisku.
- **Dvojí číslo v jednom běhu popisuje jen README.** S Kde „První číslo
  v prvku“ si prvky za Do nechají staré číslo (rozhodnutí 19). Když je to
  číslo, které krok dal jinému prvku, je na archu dvakrát. Náhled to ukáže
  v řádku prvku, ale mezi 240 řádky to nikdo nenajde.
- **Náhled nejde zúžit.** Hlášky řeknou „12 prvků zůstane beze změny“ nebo
  „Prvek 112 má 2 shody“, ale řádky je nutné hledat rolováním. U Nahradit
  v celém dokumentu se mezi stovkami nezměněných textů ztratí těch 20, které
  se mění.

## 2. Rozhodnutí

Číslování navazuje na tabulku návrhu 1.1.0.

| # | rozhodnutí | kdo |
|---|---|---|
| 25 | Navázání na minulý běh je tlačítko u kroku Číslovat s číslem, které dosadí („Navázat (241)“). Od se samo nezmění | uživatel 2026-11-15 (rozsah přijat i s tímto návrhem) |
| 26 | Navázat posune Od na další číslo řady a Do o stejný kus (1–240 → 241–480) | **moje volba**, §10 |
| 27 | Číslo k navázání drží jen poslední běh, který se zapsal celý a prošel kontrolou; předvolby ho nenesou | **moje volba** |
| 28 | Dvojí číslo se hledá jen mezi prvky, které krok nechal za Do, a hodnotami, které krok zapsal. Je to ⚠, Použít zůstane | uživatel 2026-11-15 (omezení na rozsah běhu); hranice **moje volba** |
| 29 | Náhled dostane volbu Ukázat: Všechny · Změněné · K prověření, každá s počtem prvků. Neukládá se | uživatel 2026-11-15 (filtr); třetí volba a počty **moje volba** |
| 30 | Hláška WARN_TO_CUT zůstane; počet očíslovaných prvků řekne Souhrn (§3.5) | **moje volba**, uzavírá drobnost 1 z review 1.1.0 |
| 31 | Krok 6 plánu řady (napojení na sdílený UI kit) bude BTE 1.3.0 | **moje volba** (doporučeno 2026-11-15), potvrdí se se schválením návrhu |

## 3. Navázat

### 3.1 Co dělá

Tlačítko **Navázat (241)** v editoru kroku Číslovat. Klik:

- dá do Od další číslo řady minulého běhu,
- posune Do o stejný kus jako Od: minulý běh Od 1, Do 240, další číslo 241
  → Od 241, Do 480. Když minulý běh Do neměl, Do zůstane prázdné,
- přepočítá náhled jako každá jiná změna pole.

Číslo v textu tlačítka je hodnota, kterou klik dá do Od, ve tvaru pole
(i u Formátu A je to číslo, jako v poli Od). Nápověda tlačítka řekne celou
změnu a odkud je: „Od 241 a Do 480 podle běhu v Samolepky.ai, 15. 11. 14:32.“
Jméno dokumentu a čas prozradí, když číslo patří k jiné zakázce.

Klik je jen úprava polí: Od a Do jde přepsat zpět a předvolba ukáže `*`
jako po každé jiné úpravě.

### 3.2 Další číslo

Další číslo je hodnota, kterou by minulý běh dal dalšímu prvku:
`valueAt(n)`, kde *n* je počet prvků, kterým krok dal číslo (bez prvků za
Do). Pro prostou řadu je to poslední číslo + Krok; když řadu ukončilo Do,
je to Do + Krok.

Tlačítko je šedé, když navázání nedává smysl:

- krok nepochází z minulého běhu (nový krok, načtená předvolba, ↺), nebo
  v něm nic neočísloval,
- minulý běh se nezapsal celý nebo kontrola po zápisu našla neshodu (§3.4),
- krok měl volbu v každém aršíku (každý aršík začíná znovu na Od),
- další číslo je stejné jako Od minulého běhu: Krok 0, nebo Znovu po, když
  blok skončil celým cyklem. Místa 1–20 v řadě se tak nepřepíšou,
- další prvek by nezačínal novou skupinu: počet *n* není násobkem Opakovat,
  nebo Znovu po (blok skončil uprostřed řady vstupenek). Navázat by tu dalo
  řadu, která se s minulou nepotká.

Šedé tlačítko ukazuje jen „Navázat“ a jeho nápověda řekne důvod jednou
větou.

### 3.3 Příklad vstupenek

Krok 1 Číslovat `{r}` Opakovat 20 (řada), krok 2 Číslovat `{m}` Znovu
po 20 (místo). Blok 1 má 240 prvků = 12 celých řad. Krok 1 nabídne Navázat
(13), krok 2 je šedý, protože místa začínají znovu na 1. Blok 2 tak dostane
řady 13–24 a místa 1–20.

### 3.4 Kde se číslo drží

- Po Použít se poslední běh ukládá jako dnes (klíč poslední běh
  v `settings.json`), ale **bez** čísla k navázání.
- `main.js` po zápisu a kontrole bez neshody uloží ke každému kroku Číslovat
  posledního běhu záznam `last`: Od, Do a další číslo, jak je krok použil,
  jméno dokumentu a čas. Selže-li zápis nebo kontrola najde neshodu, záznam
  nevznikne a Navázat zůstane šedé.
- `last` patří jen k poslednímu běhu. `normalize()` ho jinde zahodí,
  Uložit a Uložit jako ho do předvolby nezapíšou a `*` u předvolby ho
  nevidí.
- Platí napříč dokumenty: další arch může být nový soubor (§10).

### 3.5 Souhrn

Souhrn po zápisu dostane v Podrobnostech řádek za každý krok Číslovat, který
něco zapsal: „Číslovat {n}: 001–240, 240 prvků; další číslo 241.“ Počet
prvků je tvar podle počtu (prvek, prvky, prvků). Bez dalšího čísla
(šedé Navázat) končí řádek počtem prvků.

## 4. Dvojí číslo

### 4.1 Pravidlo

Krok Číslovat po výpočtu porovná hodnoty, které zapsal, se shodami, které
nechal v prvcích za Do. Prvek za Do, jehož shoda je stejná jako některá
zapsaná hodnota, má **dvojí číslo**.

- **Číslo se porovnává jako číslo:** `007`, `07` a `7` jsou totéž, protože
  na archu znamenají totéž. Písmena (Formát A, a) jako text.
- **Kde `{n}` dvojí číslo nedá:** prvek za Do si nechá `{n}`, a to už hlásí
  zbylé proměnné (rozhodnutí 21). Prakticky jde o Kde „První číslo
  v prvku“, „Jiný text…“ a „Regulární výraz…“.
- **Opakovat, Znovu po a Krok 0** dávají stejné hodnoty záměrně. Mezi
  zapsanými hodnotami se proto dvojí číslo nehledá, jen proti prvkům za Do.

### 4.2 Co uživatel vidí

- ⚠ v hláškách, tvar podle počtu: „10 prvků za Do si nechá číslo, které
  krok dal jinému prvku (např. prvek 245 má 241 jako prvek 1).“ Přesné
  znění a tvary pro 1, 2 a 5 určí plán.
- Řádky těch prvků jsou K prověření (§5).
- Použít zůstane aktivní: Do je hranice z rozhodnutí obsluhy a dvojí číslo
  může být záměr (přečíslovaný blok, který pokračuje jinde).

### 4.3 Hranice

Prvky, které krok vůbec nenašel, kontrola nevidí. Typický případ: Rozsah
Celý dokument zahrne blok očíslovaný minulým během (už bez `{n}`) a nový
blok dostane stejná čísla. Hledat čísla ve všech textech rozsahu by hlásilo
i rozměry a letopočty. Proti tomuhle stojí Navázat; obecnější kontrola je
v §9.

## 5. Filtr náhledu

- **Ovládání:** popisek **Ukázat:** a seznam v panelu Náhled nad tabulkou.
  Položky s počtem prvků: „Všechny (240)“, „Změněné (228)“, „K prověření
  (12)“. Počty se mění s každým přepočtem; šířka seznamu je pevná pro
  nejdelší položku s pětimístným počtem.
- **Změněné:** prvek, jehož některý text se po posledním kroku liší od
  původního.
- **K prověření:** prvek, na který ukazuje některá hláška: krok Číslovat
  ho nechal za Do, má víc shod jednoho čísla, po posledním kroku v něm
  zůstalo `{…}`, nebo má dvojí číslo (§4).
- **Sloupec #** nese dál pořadí prvku v rozsahu, takže filtr řádky
  nepřečísluje (`241`, `3 · 25`).
- **Výchozí** je Všechny při každém otevření; volba se neukládá, je to
  pohled, ne recept.
- **Prázdný filtr** ukáže prázdnou tabulku; počet v seznamu říká proč.
- **Použít** filtr neovlivní: zapíše se celý náhled, filtr jen skrývá řádky.
- **Illustrator 2027:** změna seznamu přepíše tabulku a skončí `repaint()`
  jako přepočet. Překreslení po výběru v rozbalovacím seznamu se v 2027
  neměřilo; ověří ho ruční test.

**Umístění** určí sonda dialogu. Návrh: seznam vpravo v řádku stavové řádky,
aby okno nezvýšil. Když by stavová řádka useknula nejdelší text, dostane
seznam vlastní řádek nad tabulkou (asi +25 px výšky).

## 6. Drobnosti z review 1.1.0

- **Hlavička `src/lib/storage.js`** popisuje formát předvolby bez `bySheet`
  a `perSheet` a tvrdí, že starší formát neexistuje. Nově: oba klíče,
  předvolba z 1.0.0 jako starší formát řešený výchozími hodnotami a `last`
  jen u posledního běhu (§3.4).
- **Sloupec #** má pro „240 · 240“ (každý prvek vlastním aršíkem,
  SHEET_SINGLES) jen odhadnutou rezervu. Sonda ho změří; když text usekne,
  vezme sloupec # potřebné pixely sloupci Původní a okno šířku nezmění.
- **WARN_TO_CUT** beze změny (rozhodnutí 30).
- **Hranice aršíků se čtou i s vypnutým Po aršících.** Zůstává: tak to
  chce §4.2 návrhu 1.1.0 (přepnutí nečte dokument znovu) a na souborech
  uživatele to zpomalení nedalo. Ruční test hlídá čas otevření (9.1).

## 7. Co se nemění

Kroky Nahradit a Velikost písmen, pravidlo prvku, pořadí, zápis a záruky
(§7 návrhu 1.0: náhled = zápis, kontrola po zápisu, jedno Zpět), formát
předvoleb (`last` do nich nepatří) a šířka okna 1008 px. Výška smí narůst
jen kvůli tlačítku Navázat nebo filtru, nejvýš na 850 px (kánon řady).

**Verze:** 1.2.0, nové funkce bez změny dosavadního chování (SemVer minor).
Krok 6 plánu řady v `2026-11-07-ui-design-system.md` §10 se přejmenuje na
BTE 1.3.0 (rozhodnutí 31).

## 8. Ověření

- **Node:**
  - `steps`: další číslo pro prostou řadu, řadu ukončenou Do, Krok
    záporný, Opakovat a Znovu po na hranici skupiny i uprostřed, Krok 0,
    v každém aršíku, písmena; dvojí číslo s `007` proti `7`, s písmeny,
    s Kde `{n}` (nikdy), s Opakovat (jen proti prvkům za Do);
  - `ui_model`: počty a řádky filtru (Všechny, Změněné, K prověření),
    stav a nápověda Navázat, řádek Souhrnu, tvary pro 1, 2 a 5;
  - `storage`: `last` přežije jen u posledního běhu, poškozený `last` se
    zahodí, Uložit ho nezapíše;
  - `main`: záznam `last` vznikne jen po zápisu a kontrole bez neshody;
  - `ui`: Navázat nastaví Od a Do, `*` předvolby `last` nevidí, změna
    filtru nepřepočítává řetěz;
  - ES3 sken, `npm run lint`.
- **Sondy:**
  - dialog: umístění tlačítka a seznamu, nic useknutého v CS i EN, okno
    1008 px na šířku a nejvýš 850 px na výšku, sloupec # s „240 · 240“,
    čas přestavby tabulky při změně filtru na 240 prvcích;
  - ruční test (`probe_manual.jsx`): dva bloky za sebou, druhý přes
    Navázat, zpětné čtení 1–240 a 241–480; scénář dvojího čísla; počty
    filtru.
- **Ruční test:** `manual-test.md` dostane oddíly Navázat (dva bloky
  v jednom dokumentu i ve dvou), Dvojí číslo a Filtr náhledu, včetně
  překreslení po změně filtru v Illustratoru 2027. Brány vydání: 4.1, 4.2,
  6.3–6.5 jako dosud a nově Navázat přes dva bloky.

## 9. Později

Doplněk k §12 návrhu 1.0 a §9 návrhu 1.1.0; čeká na zakázku:

- abeceda bez I a O, přeskočit čísla;
- krok Vložit (před a za text);
- stohování (cut & stack) a Obráceně;
- cíl kroku, Datum, Náhodně, Více dvojic, dialog do 720 px;
- kontrola dvojího čísla proti číslům v prvcích, které krok nenašel (§4.3).

## 10. Otevřené

- **Do při navázání:** posunout o stejný kus (moje volba: kontrola konce
  řady zůstane), nebo vymazat.
- **Navázání napříč dokumenty:** moje volba je ano, nápověda jmenuje
  dokument a čas. Nevím, jestli další arch bývá nový soubor, nebo další
  artboard či blok v témže dokumentu; když vždy totéž, šlo by navázání
  omezit na stejný dokument.
