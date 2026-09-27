# Code review — batch-relink-export

Datum: 2026-09-27. Rozsah: celé `batch-relink-export/src/` (5 modulů), `tools/build.sh`,
README a CHANGELOG ve stavu `main` (831bb50), tedy verze 1.0.0 plus nevydaná změna
slovníku tlačítek. Zadání: nástroj používají operátoři v prepressu pod tlakem a chyba
znamená zkažený tisk nebo řez, takže správnost má přednost před elegancí.

Review je jen analýza — v kódu se nic neměnilo. Cesty jsou relativní
k `batch-relink-export/`. Výjimkou jsou cesty začínající `docs/` a nástroje
`tools/ai-eval.sh` a `tools/typecheck.sh`, které jsou relativní ke kořeni repa.

## Metoda

- Přečtený celý kód. `npm run lint` je čistý, locale cs/en mají stejné klíče. BRE nemá testy.
- `tools/typecheck.sh` hlásí neexistující `PlacedItem.pageNumber` na `src/core.js:581`,
  na `:124` ne — tam je proměnná bez typu. BRE je starší než ten nástroj.
- Sondy v Illustratoru 30.8.2 (cs_CZ) přes `tools/ai-eval.sh`:
  - Illustrator na začátku neběžel, spustila ho první sonda. Každá mutující sonda
    by se při otevřeném cizím dokumentu přerušila a vše, co otevřela, zavřela.
  - Testovací PDF z Illustratoru: A a B (4 strany 100 × 70 mm s ořezovými
    značkami, takže MediaBox ≠ TrimBox), C (2 strany), D (4 strany 110 × 60 mm),
    E (logo). Ručně v Pythonu: G (4 strany 106 × 76 mm se spadávkou v ploše
    stránky, bez TrimBoxu) a šest PDF pro parser počtu stran.
  - Šablona T1 má 4 pozice umístěné s ořezem TrimBox, dvě z nich v ořezové masce.
    Šablona T2 má zamčenou ořezovou skupinu, zamčenou podvrstvu, skrytou vrstvu
    a propojené logo.
  - Moduly BRE jsem nahrál z `src/` do rozsahu jedné funkce a volal skutečné
    `scanSources`, `beginSession`, `relinkDocument`, `verifyRelink`
    a `countManagedPositions`. V enginu nezůstal globální `BRE` (ověřeno).
  - Výstupy jsem uložil s presetem `[Tisková kvalita]`, který BRE na této instalaci
    volí jako výchozí, vyrenderoval Popplerem a prohlédl.
  - Parser počtu stran: šest ručně sestavených PDF, platnost a skutečný počet stran
    ověřený přes `pdfinfo`, na nich skutečné `scanSources` v enginu.
- **Vedlejší účinek sond:** otevření šablony přepsalo uživatelovu předvolbu importu PDF
  (B10). Vrátil jsem ji na hodnoty změřené na začátku: strana 1, ořez Bounding Box.
- Sondy a testovací data nejsou součástí repa.
- Naměřené chování DOM je zapsané v
  [`extendscript-engine-facts.md`](../extendscript-engine-facts.md), sekce
  „Relink umístěných PDF a předvolby importu".

**Výhrada:** sondy běží přes AppleScript `do javascript`, ne přes Soubor › Skripty.
U DOM volání by se to lišit nemělo, ale ověřené to není.

**Závažnost:** critical / major / minor / nit.
**Jistota:**
- *ověřeno živě* — sonda v Illustratoru, u geometrie render prohlédnutý,
- *ověřeno* — kód nebo výpočet,
- *pravděpodobné*,
- *spekulace*.

## 1. Shrnutí

Základní předpoklad nástroje platí: `relink()` zachová každé pozici její stránku i typ
ořezu a globální předvolby importu PDF ho neovlivní (změřeno). Problémy jsou v tom,
co nástroj považuje za hotový arch:

- **Formát zdroje se nekontroluje (B1).** PDF se spadávkou v ploše stránky a bez
  TrimBoxu se po relinku zmenší na 93,6 % a spadávka se objeví uvnitř pozice. PDF jiného
  formátu se tiše přeškáluje. Kontrola projde a arch se vyexportuje.
- **Neúplný arch tiskne duplicity (B2).** Pozice navíc ukážou znovu stranu 1.
  Automatické odebrání nemůže nikdy proběhnout, protože `PlacedItem.pageNumber`
  v DOM neexistuje. Náhled u „Méně stran uprostřed dávky" přesto slibuje odebrání.
- **Počet stran z hrubých bajtů (B3).** Inkrementálně uložené PDF po smazání stran
  projde jako „ok" s duplicitami. Velké PDF s víceúrovňovým stromem stran projde
  jako „ok" a strany se tiše ztratí. Objektové proudy vypnou ochranu proti přebytku
  stran.
- **Co je pozice (B4).** Propojené logo se přelinkuje na stranu 1 zakázky. Skryté
  pozice se počítají do počtu.
- **Běžný stav šablony zastaví dávku (B6, B7).** Nedostupné původní PDF nebo zamčená
  podvrstva znamenají chybu na každém archu s anglickou hláškou.

Co je v pořádku a nesahal bych na to:
- relink sám (stránka, ořez, střed pozice, nezávislost na předvolbách);
- šablona se nikdy neukládá, výstupy jsou nové soubory a cizí otevřené dokumenty se
  nemění — undo tu nemá co vracet; Storno je čisté ve všech dialozích před zpracováním;
- sken před jakoukoli prací, tvrdá blokace „víc stran než pozic" (tam, kde počet sedí),
  přirozené řazení, přeskakování `._*` souborů, izolace chyb po arších, obnova
  `userInteractionLevel` ve `finally`;
- Core nikdy nevolá UI ani `alert` — vrací výsledky, hlásí `main.js`;
- sken je rychlý: 8 MB se přečte za 17 ms a parsuje za 25 ms;
- skrytá vrstva se s `[Tisková kvalita]` neuloží jako vrstva PDF (žádné `/OCProperties`).

## 2. Chyby a okrajové případy

### B1 · critical · ověřeno živě — formát zdrojového PDF se nekontroluje

**Kde:** relink bez porovnání rozměru `src/core.js:132–141`; `verifyRelink`
porovnává jen cestu `:272–291`; export `src/main.js:180–216`.

**Naměřeno** (T1: pozice 100 × 70 mm, umístěné s ořezem TrimBox):

| zdroj | pozice po relinku | render |
|---|---|---|
| 110 × 60 mm s TrimBoxem | 107,16 × 58,45 mm, střed zachován | obsah přeškálovaný na 97,4 % |
| 106 × 76 mm se spadávkou v ploše, bez TrimBoxu | 99,20 × 71,13 mm | spadávka uvnitř pozice, obsah na 93,6 % |

Illustrator zachová typ ořezu a střed pozice a novou stranu přeškáluje. Obě měření
sedí na 0,01 mm s tím, že se zachovává úhlopříčka pozice. Chybu nevyhodí
a `verifyRelink` projde.

**Dopad:** zákaznické PDF se spadávkou v ploše stránky a bez TrimBoxu (export bez
značek z kancelářských a online nástrojů) vytiskne celou dávku zmenšenou o 6 %
a se spadávkou v řezu. Jak časté takové PDF je, jsem neověřil — odhaduju, že běžné.
Stejně dopadne omylem zvolená šablona jiného formátu.

**Návrh:**
- Před relinkem uložit `geometricBounds` každé pozice a po relinku je porovnat
  (tolerance zhruba 0,1 mm).
- Rozdíl je chyba archu s hláškou: „Zdrojové PDF má jiný formát stránky (106 × 76 mm)
  než pozice šablony (100 × 70 mm). Chybí mu TrimBox, nebo jde o jinou šablonu."
- Nejlépe to zjistit už na prvním archu a zastavit dávku, než vznikne padesát
  špatných.
- Kontrola nahradí dnešní `verifyRelink`, které v žádné sondě nic nenašlo: relink
  buď projde, nebo hodí výjimku.

### B2 · critical · ověřeno živě — neúplný arch: pozice navíc tisknou znovu stranu 1

**Kde:** podmínka, která nikdy neplatí, `src/core.js:124–130`; odebírání `:144–162`;
export s příznakem `src/main.js:189–202`; texty `src/locale.js:208`, `:209`, `:228`;
`README.md:58`.

**Naměřeno:**
- `PlacedItem.pageNumber` v DOM neexistuje: `"pageNumber" in item` je `false`
  a `reflect.properties` ji nemá. Platí to i u pozic, které skript sám umístil
  s `pageToOpen` 2–4. README tvrdí, že chybí jen u ručně umístěných stran.
  Ve skutečnosti chybí vždy, takže automatické odebrání nemůže proběhnout.
- Relink šablony se 4 pozicemi na 2stránkové PDF: pozice pro strany 3 a 4 ukážou
  stranu 1 (render: C1 C2 C1 C1). `relinkDocument` vrátí `removed = 0`.

**Dopad:**
- Poslední neúplný arch je běžný případ, dávky málokdy vyjdou na celé archy. Uloží
  se pod normálním jménem s duplicitami strany 1. Jediná stopa je řádek v souhrnu,
  který se po zavření ztratí.
- U „Méně stran uprostřed dávky" náhled slibuje „přebytečné pozice budou odebrány",
  takže operátor čeká čistý arch.
- U číslovaných a personalizovaných tiskovin (vstupenky, poukazy, vizitky) to
  znamená duplicitní kusy.

**Návrh, hned (pár řádků):**
- arch s pozicemi navíc ukládat s příponou `_KONTROLA` nebo do podsložky;
- souhrn zapsat i do souboru (§6);
- opravit texty (T1);
- „under" blokovat, nebo ho nechat potvrdit zvlášť. Komentář `src/core.js:417`
  ho sám nazývá „likely split error".

**Návrh, řešení:** zjistit stránku každé pozice. Dvě varianty:
- **A:** dočasné PDF, kde má strana *k* jiný poměr stran. Po relinku na něj se
  z `width / height` pozice vyčte *k*. Že relink zachová poměr stran, je změřeno
  (B1); celý postup ověřený není.
- **B:** číslo strany zapsat do `note` pozice jednorázovým krokem „Připravit šablonu".

Pozice navíc pak odebírat celou ořezovou skupinou. `remove()` funguje (S1).

### B3 · major (dopad critical) · ověřeno živě na zkonstruovaných PDF, výskyt v praxi neověřen — počet stran z hrubých bajtů

**Kde:** `src/core.js:302–402`, klasifikace `:448–458`, zpracování „unreadable"
`src/main.js:113–116`.

**Naměřeno** skutečným `scanSources` v enginu na PDF ověřených `pdfinfo`:

| PDF | stran | BRE | pozic | stav | dopad |
|---|---|---|---|---|---|
| inkrementální uložení po smazání 2 stran | 4 | 6 | 6 | ok | pozice 5–6 = strana 1, bez příznaku |
| totéž | 4 | 6 | 4 | over | falešná blokace |
| záložky (`/Outlines /Count 12`) | 8 | 12 | 8 | over | falešná blokace |
| štítky stran (`/Type /PageLabel`) | 8 | 8, objektů 10 | 8 | uncertain | falešná blokace |
| přes 8 MB, dvouúrovňový strom stran | 12 | 8 | 8 | ok | strany 9–12 tiše ztracené |
| PDF 1.5 s objektovými proudy | 8 | 0 | 8 | unreadable | ochrana proti přebytku vypnutá |

Komentář `:307–311` tvrdí, že token mimo čtené okno dá nízký nebo nulový počet,
a tedy bezpečný stav „unreadable". Neplatí to: nízký nenulový počet dá „ok" nebo
„under".

**Realističnost:**
- Inkrementální uložení je v Acrobatu obvyklé pro Soubor › Uložit — pravděpodobné.
- Dvouúrovňový strom nad 8 MB jsem zkonstruoval — spekulace.
- Objektové proudy záleží na producentovi. Jaké soubory dělá Acrobat
  „Rozdělit dokument", jsem neověřil.

**Návrh:**
- Počet stran číst přes trailer: `startxref` → xref (i `/Prev`) → `/Root` → `/Pages`
  → `/Count`. Na offsety `seek`, místo načítání 8 MB. To vyřeší prvních pět řádků.
- Xref stream (komprimovaný) bez inflate nepřečteš a ExtendScript inflate nemá.
  „Unreadable" proto blokovat, nebo ho pustit jen po výslovném potvrzení v náhledu.
- `app.system` v Illustratoru neexistuje (změřeno), takže počet přes PDFKit nebo
  shell zjistit nejde.
- Parser je čistá funkce, dobré místo pro první Node testy BRE. Sada PDF ze sond
  je připravená.

### B4 · major · ověřeno živě — za pozici se považuje každý PlacedItem

**Kde:** slotCount `src/main.js:24`, `:27`; relink všeho s `file` `src/core.js:109–142`;
počítání `:176–185`.

**Naměřeno** (T2: tři viditelné pozice, jedna pozice na skryté vrstvě, propojené logo):
- `slotCount = 5`, ale `countManagedPositions = 4`. Každá funkce počítá jinou množinu.
- Logo (propojené PDF) se přelinkuje na zdroj a ukáže miniaturu strany 1 zakázky
  (render). `verifyRelink` projde.

**Dopad:**
- Šablona s dalším linkem (logo, značky jako `.ai` nebo `.pdf`, podklad) vytiskne
  na každém archu stranu 1 místo loga.
- Skrytá pozice i každý další link zvýší slotCount.
  - Zdroj s N stranami hlásí u všech souborů „Méně stran". Je to šum, kterým se
    operátor naučí proklikávat.
  - Zdroj s N+1 stranami projde jako „ok" a poslední strana se tiše ztratí.

**Návrh:**
- Jedna funkce `getPositions(doc)`: propojené, viditelné a odkazující na tentýž
  soubor jako většina pozic. Použít ji pro slotCount, relink i počítání.
- Ostatní linky nechat být a vypsat je v náhledu.

### B5 · major · ověřeno (kód) — neuložené změny otevřené šablony

**Kde:** `src/main.js:8–13`, `:23–24`, `:59–62`.

**Problém:** slotCount se čte z otevřené instance včetně neuložených změn, zpracování
jde z disku.

**Scénář:**
1. Operátor přidá do šablony dvě pozice a neuloží ji.
2. Spustí BRE a potvrdí, že se změny zahodí.
3. Desetistránkové zdroje dostanou stav „ok", takže se náhled ani neukáže.
4. Zpracuje se 8 pozic. Strany 9–10 zmizí bez příznaku: `remaining` (8) není větší
   než `expected` (10).

**Návrh:** při neuložených změnách nabídnout Uložit / Storno, ne „zahodit a pokračovat".
Nebo po zavření instance slotCount přepočítat z disku a při rozdílu skenovat znovu.

### B6 · major · ověřeno živě — nedostupné původní PDF šablony zastaví celou dávku

**Kde:** `src/core.js:113` (`if (!item.file)`), `:181`.

**Naměřeno:**
- Když původní PDF chybí (přesunutý mustr, archivovaná zakázka), `item.file` hází
  „There is no file associated with this item".
- `relinkDocument` spadne a každý arch skončí hláškou „Chyba při zpracování
  (There is no file associated with this item)".
- Samotný `relink()` na takové pozici přitom projde a stránky zachová (render B1–B4).

**Návrh:** čtení `.file` dát do try/catch a chybějící link brát jako pozici
k přelinkování. Pár řádků.

### B7 · major · ověřeno živě — zamčená podvrstva zastaví celou dávku

**Kde:** `src/core.js:27–37` odemyká jen `doc.layers`.

**Naměřeno:**

| stav pozice | `relink()` |
|---|---|
| zamčená vrstva nejvyšší úrovně | „Target layer cannot be modified" (proto se odemyká) |
| zamčená podvrstva | „Target layer cannot be modified" — BRE ji neodemkne |
| skrytá vrstva | „Target layer cannot be modified" (BRE ji přeskočí) |
| zamčená ořezová skupina | projde |
| zamčený objekt | projde, zůstane zamčený |

**Dopad:** na každém archu „Export přeskočen: 1 pozic se nepodařilo relinkovat"
a v detailu anglická hláška. Je to bezpečné, ale dávka stojí a text nevede k opravě.

**Návrh:** odemykat vrstvy rekurzivně. Odemykání objektů je zbytečné (S2).

### B8 · major · ověřeno (kód) + živě (tiché přepsání) — výstupní složka

**Kde:** `src/ui.js:195–204`, `src/main.js:90`, `:119–123`, `:215`; `src/config.js:33`.

**Problém:**
- Nic nebrání tomu, aby výstupní složka byla stejná jako zdrojová. Při dalším běhu se
  vlastní výstupy načtou jako zdroje: jsou jednostránkové, dostanou „Méně stran",
  zpracují se a posunou číslování.
- `saveAs` existující výstup přepíše bez dotazu (změřeno). Staré archy navíc
  z delší předchozí dávky ve složce zůstanou.
- Výchozí vzor `{n}_{template}` nenese nic ze zakázky. S „Přeskočit existující" se
  tak přeskočí archy **jiné** zakázky se stejnou šablonou — skip porovnává jen jméno.

**Dopad:** ve složce „k tisku" se míchají archy dvou zakázek.

**Návrh:**
- Zakázat výstup do zdrojové složky. Podsložka zdroje nevadí, `getFiles` do
  podsložek nechodí.
- V náhledu vypsat PDF ve výstupní složce, která běh nepřepíše, nebo která přeskočí.
- Do výchozího vzoru přidat `{source}` nebo název zdrojové složky.
- Přeskakovat jen tehdy, když je výstup novější než zdroj i šablona.

### B9 · minor · ověřeno živě pro cs_CZ — výchozí PDF preset

**Kde:** `src/config.js:29`, `src/ui.js:104–123`, `src/main.js:205–211`.

**Naměřeno:**
- Na české instalaci BRE vybere `[Tisková kvalita]` (Press Quality).
- Podle vzoru v kódu by v anglickém Illustratoru vybral `[High Quality Print]`, tedy
  jiný preset. EN jsem neměřil. Český ekvivalent `[Kvalitní tisk]` vzor nezná.
- Vlastní presety dílny (tady čtyři pass4press) se musí vybírat při každém běhu,
  nic se nepamatuje.

**Drobnosti:**
- Cyklus `:120` při shodě na indexu 0 hledá dál.
- Fallback `["[High Quality Print]"]` (`:106`) je na české instalaci neplatný název.
- try/catch kolem `pDFPreset` (`src/main.js:206–211`) nic nechytí. Neplatný preset
  nehází při přiřazení, až v `saveAs`
  ([engine facts](../extendscript-engine-facts.md), „Neexistující PDF preset selže
  až při uložení").

**Návrh:** pamatovat si poslední preset (§4).

### B10 · minor · ověřeno živě — BRE mění uživateli předvolbu importu PDF

**Kde:** `app.open` `src/main.js:26`, `:126`; `relink` `src/core.js:133`.

**Naměřeno:**
- Otevření šablony i každý relink zapíše do `app.preferences.PDFFileOptions` stránku
  a typ ořezu dané pozice. Po otevření T1 to byla strana 3 a TrimBox, po relinku
  postupně 3, 2, 4, 1.
- Opačně to neplatí: předvolba nastavená těsně před relinkem na stranu 2 a MediaBox
  výsledek nezměnila (render).

**Dopad:** po běhu BRE otevře Soubor › Otevřít nebo Umístit PDF jinou stranu nebo
s jiným ořezem, než je operátor zvyklý. Jestli to ovlivní i Umístit s dialogem
možností importu, jsem neověřil.

**Návrh:** na začátku běhu uložit `pageToOpen` a `pDFCropToBox`, ve `finally` je vrátit.

### Okrajové případy ze zadání bez vlastního nálezu

- **Žádný dokument ani výběr:** BRE nepotřebuje aktivní dokument ani výběr. Cizí
  otevřené dokumenty nemění, zavře jen otevřenou šablonu.
- **Groupy a ořezové masky:** relink uvnitř masky i zamčené skupiny funguje (T1, T2).
- **Compound paths:** BRE je nečte.
- **Souřadnice a jednotky:** BRE je nepočítá, relink drží střed pozice. Jediný
  rozměrový problém je B1.
- **Více artboardů:** export všech (`saveMultipleArtboards`, prázdný rozsah) —
  neměřeno. Pozice na pasteboardu se počítají a relinkují, ale neexportují.
- **Undo:** není co vracet. Výstupy se ale přepisují bez dotazu (B8).
- **Velké dokumenty:** sken je rychlý (změřeno). Relink u těžkých PDF a šablon
  s desítkami pozic neměřen. Průběh se ukazuje jen po souborech.

### Drobnosti (nit, ověřeno)

- `src/main.js:113–116`: poznámka „unreadable" se zapíše i u archu, který se potom
  přeskočí jako existující.
- `src/main.js:121`: přeskočené archy jsou v logu pod jménem zdroje, ostatní pod
  jménem výstupu.
- `src/core.js:487–499`: vzor se nesanitizuje. Znak „/" v názvu zlomí `saveAs`
  u každého archu.
- `src/ui.js:166`: náhled názvu počítá s jedním souborem a ukáže „01_…", běh se
  100 a více soubory dá „001_…".

## 3. Zbytečná složitost, duplicity, mrtvý kód

**S1 (minor, ověřeno živě) — asi 90 řádků, které se nikdy nespustí:**
- Co: větev `toRemove`, `_removePosition`, `_groupContainsOnly`, `_inSet`,
  `ERR_REMOVE_FAIL`, `results.removed` s `LOG_REMOVED` (vždy 0, řádek se nezobrazí)
  a `page=`/`over=` v diagnostice. Důvodem je B2.
- `_removePosition` navíc stojí na vyvráceném předpokladu. Komentář `src/core.js:188–191`
  tvrdí, že `remove()` na obsahu ořezové masky nic neudělá. Změřeno: funguje —
  pozice zmizí a zůstane prázdná skupina s ořezovou cestou.
- Commit 1e2aeaf to uvedl jako potvrzenou příčinu. Následný 056f607 našel skutečnou:
  `pageNumber` je `undefined`.
- Neexistující chování popisují i komentáře `:91–94`, `:124–130`, `:144–152`,
  `:307–311`, README `:36`, `:58` a CHANGELOG `:35`. Kdo bude řešit B2, bude se
  řídit špatnou mapou.

**S2 (minor, ověřeno živě) — session management dělá dvě zbytečné věci a jednu
potřebnou vynechává:**
- Odemyká objekty (`src/core.js:39–52`), přestože relink na zamčeném objektu projde.
- `endSession` obnovuje zámky v dokumentu, který se zavře bez uložení — komentář
  to sám přiznává.
- Chybí přitom odemčení podvrstev (B7).

**S3 (minor):** `verifyRelink` je tautologie, v sondách nezachytil nic. Nahradit
rozměrovou kontrolou (B1).

**S4 (nit):** mrtvé
- `L.TITLE` — okno má anglický titulek z `Config.scriptName`,
- fallback presetu a try/catch (B9),
- `relinkResult.skipped` — jen debug.

**S5 (nit):** `f.displayName || decodeURI(f.name)` je pětkrát
(`src/ui.js:216`, `:232–233`, `:238`, `:273`, `src/core.js:442`).

**S6 (nit) — dokumentace:**
- hlavičky modulů uvádějí „v3.0.0" a `tools/build.sh` „Version 3.0.0 / Updated 2026-05-31";
- README píše o poli „Vzor pojmenování", v UI je „Vzor";
- „Min. verze AI: CC 2018" nikdo neověřil;
- `docs/decisions.md` vede N6 (ES3 kontrola GM a BRE) jako otevřený bod a neuvádí,
  že ho od 2026-09-07 kryje ruční `npm run lint`. `docs/conventions.md:31` je
  v pořádku — strojově vynucenou kontrolu BRE opravdu nemá.

Odložený bod N16 (IIFE) má u BRE nízké riziko: jediný stav mezi běhy
(`_lockedLayers`) nuluje `beginSession`.

## 4. UI/UX

- **Pořadí polí** je logické: Šablona → Zdroj → Výstup → Vzor s legendou a náhledem
  názvu → Preset → Možnosti → Storno/Spustit. Jen panel „1 · Vstupní soubory"
  obsahuje i Výstup. Navrhuju ho přejmenovat na „Soubory", nebo Výstup přesunout
  do panelu 2.
- **Výchozí hodnoty:**
  - preset se liší podle jazyka a nic se nepamatuje (B9);
  - vzor nenese zakázku (B8);
  - „Přeskočit existující" je vypnuté, což je správně — s dnešní logikou podle jména
    by zapnuté bylo nebezpečné;
  - „Otevřít složku" je zapnuté, to je v pořádku.
- **Validace** proběhne až po zavření dialogu (`src/ui.js:176–226`). Každá chyba
  ukončí skript a operátor vyplňuje tři cesty znovu.
  - Prázdné pole Výstup: `new Folder("")` je `/tmp00000001` (změřeno), takže přijde
    dotaz „Výstupní složka neexistuje. Vytvořit?" a pokus o vytvoření v kořeni disku
    (nespouštěl jsem, pravděpodobně selže).
  - Návrh: kontrolu dát do `onClick` tlačítka Spustit a dialog nechat otevřený.
    Prázdné pole = „Vyberte výstupní složku".
- **Vzor** vyžaduje `{n}`, přestože unikátnost zaručí i `{source}`. Znak „/"
  nekontroluje.
- **Storno** je čisté v hlavním dialogu, u varování o otevřené šabloně i v náhledu.
  Otevřená uložená šablona se ale před zpracováním bez ptaní zavře
  (`src/main.js:59–62`) — data se neztratí, jen zmizí okno.
- **Zastavit:** podle komentáře doběhne aktuální soubor. Jestli paleta během smyčky
  kliknutí vůbec přijme, jsem neověřil (§9).
- **Zapamatování nastavení** chybí úplně. Šablona, výstupní složka, vzor a preset se
  opakují zakázku od zakázky, mění se jen zdroj. GM a ZSM mají `storage.js`
  a `docs/persistence.md` — vzor jde převzít. „Přeskočit existující" záměrně
  nepamatovat (B8).
- **Náhled** se zobrazí jen při anomáliích, to je dobře. Verdikt ale počítá „under"
  a „unreadable" jako „v pořádku" (T2). Pořadí souborů s čísly archů neukazuje,
  přitom na něm závisí číslování.
- **Souhrn** se po zavření ztratí, nic se nezapisuje. Archy k ruční úpravě se počítají
  i do „Úspěšně".

## 5. Texty

**T1 (major):** `SCAN_FILE_UNDER` (`src/locale.js:208`, EN `:98`) říká „přebytečné pozice
budou odebrány". Nikdy se neodeberou (B2). Návrh: „%s: %s stran, %s pozic — pozice navíc
ukážou znovu stranu 1, před tiskem je odstraňte."

**T2 (major):** `PREVIEW_VERDICT` (`:162`) „%s z %s archů v pořádku · %s blokováno"
zahrnuje do „v pořádku" i „Méně stran" a „Nečitelný počet". Návrh: „%s archů lze
zpracovat, z toho %s s upozorněním · %s blokováno".

**T3 (minor):** `SCAN_FILE_UNREAD` (`:210`) „relinkne se vše bez odebrání" neříká
riziko. Návrh: „%s: počet stran nejde zjistit — ověřte, že PDF nemá víc než %s stran,
jinak se přebytek ztratí."

**T4 (minor):** `LOG_MANUAL` (`:228`) „odeber ručně" neříká, kde ani jak. Návrh:
„%s pozic navíc ukazuje znovu stranu 1 — před tiskem je odstraňte."

**T5 (minor):** chyby končí holým `e.message` v angličtině: `ERR_PROCESS` s „There is
no file associated with this item" (B6), „Target layer cannot be modified" (B7),
`ERR_CRITICAL` s „(line N)". DOM hlášky jsou anglicky vždy
([engine facts](../extendscript-engine-facts.md), „Chybové hlášky mají dva jazyky"), takže jdou
spolehlivě přeložit na „co udělat". Například: „Šablona odkazuje na PDF, které chybí:
%s" nebo „Pozice je v zamčené podvrstvě ‚%s' — odemkněte ji."

**T6 (minor):** `ERR_HIDDEN_LAYER` (`:138`) „PlacedItem na skryté vrstvě přeskočen: %s"
- je žargon;
- platí i pro skrytý objekt, nejen vrstvu;
- nepojmenovanou pozici hlásí jako „item_3", což v dokumentu nikdo nenajde.

Návrh: „Pozice na skryté vrstvě ‚%s' zůstala se starým PDF (netiskne se)."

**T7 (minor):**
- `ERR_TEMPLATE` (`:128`) „Neplatná šablona AI." se použije pro chybějící soubor,
  špatnou příponu i chybu otevření.
- `ERR_NO_RELINK` (`:135`) mluví o „relinkování".
- `SCAN_FILE_UNCERTAIN` (`:211`) neříká, co udělat.

**T8 (nit):**
- chybí plurály („1 pozic", „1 stran");
- tyká („odeber") vedle vykání („zkontrolujte", „Musíte");
- titulek okna je anglicky;
- výběr složky má pro zdroj i výstup stejný prompt „Vyberte složku:" (`:190`).

## 6. Funkce, které by operátor čekal

1. Kontrolu formátu zdroje proti pozicím (B1) — nejdůležitější chybějící kontrola.
2. Automatické odebrání pozic navíc (B2), které slibují texty i CHANGELOG.
3. Zapamatování posledního nastavení (§4).
4. Záznam běhu do souboru ve výstupní složce (například `_bre-log.txt`: co se
   zablokovalo a co potřebuje ruční úpravu) a označení takových archů v názvu.
5. Kontrolu výstupní složky před během (B8).
6. Seznam souborů v pořadí s čísly archů v náhledu.

## 7. Připravenost na UXP

Aktuální stav UXP v Illustratoru a parita jeho DOM se neověřovaly. Tabulka hodnotí
jen to, jak těsně je kód svázaný se ScriptUI a s ExtendScriptem.

| modul | vazba | co brání přenosu |
|---|---|---|
| `locale.js`, `config.js` | čisté (`app.locale` při načtení) | nic podstatného |
| `core.js` — pojmenování, řazení, parser PDF | čistá logika | `scanSources` míchá synchronní binární `File` I/O s klasifikací |
| `core.js` — relink, session, počty | DOM, bez UI | idiomy ExtendScript DOM |
| `ui.js` | ScriptUI | v builderu dialogu `app.PDFPresetsList`, zobrazení a validace v jedné funkci |
| `main.js` | orchestrace | celé zpracování archu (open, relink, verify, `PDFSaveOptions`, `saveAs`, close) promíchané s paletou průběhu |

Vazba DOM ↔ ScriptUI je volná, lepší než u ZSM: Core nevolá UI ani `alert`.

Pomohlo by i bez UXP:
- zpracování jednoho archu vytáhnout do `Core.processSheet(…) → {status, log}`,
  aby `main.js` jen iteroval a hlásil;
- oddělit čtení bajtů od klasifikace (čistá `classify(pages, pageObjs, slots, isLast)`),
  což je zároveň testovatelné v Node (B3);
- validaci dialogu vytáhnout do čisté `validateConfig(raw) → errors[]` (§4).

UXP je asynchronní, takže se smyčka bude přestavovat tak jako tak.

## 8. Top 5 podle poměru přínosu k práci

1. **B1 — rozměrová kontrola po relinku.**
   - Práce: desítky řádků (uložit bounds, porovnat).
   - Přínos: chytí PDF bez TrimBoxu i špatnou šablonu, tedy tichý špatný tisk
     celé dávky.
2. **B2 (okamžitá část) + T1, T2 — archy s pozicemi navíc.**
   - Práce: pár řádků. Ukládat je jako `_KONTROLA`, opravit sliby v náhledu
     a „under" nechat potvrdit.
   - Přínos: duplicity strany 1 přestanou vypadat jako hotový arch.
3. **B4 — jedna definice pozice.**
   - Práce: zhruba 30 řádků; jedna funkce pro slotCount, relink i počítání.
   - Přínos: logo přestane být stranou 1 a skrytá pozice přestane polykat stranu.
4. **B5 + B6 + B7 — tři drobnosti v přípravě archu, každá na pár řádků.**
   - Neuložená šablona → Uložit/Storno. Brání tiché ztrátě stran.
   - Chybějící link → relinkovat.
   - Podvrstvy odemknout.
   - Poslední dvě brání tomu, aby běžný stav šablony zastavil celou dávku.
5. **B3 — počet stran přes trailer/xref, „nečitelné" jen s potvrzením.**
   - Práce: střední. Zároveň první Node testy BRE nad sadou PDF ze sond.
   - Přínos: zmizí falešná „ok" i falešné blokace.

Hned za nimi, s malou prací:
- B8 (výstupní složka),
- B10 (vrátit předvolby importu, tři řádky),
- zapamatování presetu a cest,
- validace bez zavírání dialogu.

## 9. Neověřeno

- **Zastavit během zpracování.** Paleta nemusí kliknutí přijmout, dokud smyčka běží.
  Stačí jeden ruční běh s pěti soubory.
- **Struktura PDF z Acrobatu „Rozdělit dokument".** Rozhoduje, jak často nastane
  „Nečitelný počet stran". Stačí pustit BRE na jednu reálnou dávku a podívat se
  do náhledu.
- **Běh přes Soubor › Skripty** — sondy běžely přes AppleScript.
- **EN Illustrator** — názvy presetů a výchozí volba.
- **Rychlost relinku** u těžkých PDF a šablon s desítkami pozic.
- **Šablona v Large Canvas.**
- **Vytvoření `/tmp00000001` při prázdném poli Výstup.** Nespouštěl jsem, šlo by
  o zápis do kořene disku.
- **Stabilita pořadí `doc.placedItems` mezi otevřeními.** V sondách bylo pokaždé
  stejné. Důležité pro variantu A u B2.
- **Vliv změněné předvolby importu (B10) na Umístit** s dialogem možností.

## 10. Naměřeno — přehled sond

| sonda | co | výsledek |
|---|---|---|
| P0 | prostředí | AI 30.8.2 cs_CZ, 12 presetů, BRE volí `[Tisková kvalita]`; `new Folder("")` = `/tmp00000001`, neexistuje; `app.system` neexistuje |
| B | stavba PDF a šablon, render šablony | A1–A4 na místech; `pageNumber` chybí i u pozic umístěných skriptem |
| R1 | relink T1 → B | B1–B4 na místech, rozměry beze změny |
| R2b | předvolby strana 2 / MediaBox nastavené po otevření, těsně před relinkem | výsledek beze změny; relink předvolbu přepsal (B10) |
| R3 | relink na 2stránkové PDF | C1 C2 C1 C1 (B2) |
| R4 | relink na 110 × 60 mm | 107,16 × 58,45 mm, střed zachován (B1) |
| R8 | relink na 106 × 76 mm bez TrimBoxu | 99,20 × 71,13 mm, spadávka uvnitř (B1) |
| T2 | zámky, skrytá vrstva, logo; pipeline BRE | B4, B7; logo = B1 |
| T3, T4 | nedostupné původní PDF | `.file` hází, relink projde (B6) |
| T5 | `remove()` v ořezové masce; čtení 8 a 40 MB | funguje (S1); 17 ms + 25 ms |
| T6 | `scanSources` na šesti PDF | B3 |
| T7 | vlastní zámek, zamčená vrstva, přepsání výstupu | projde / hází / tiše přepíše |
| T8 | co mění `PDFFileOptions` | otevření šablony i relink (B10) |
| R5 | `[Tisková kvalita]` a skrytá vrstva | žádné `/OCProperties` |
