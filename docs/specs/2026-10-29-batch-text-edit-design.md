# Návrh — Batch Text Edit: řetěz kroků nad textem a proměnnými

Nástroj: nový, pátý v rodině (vedle grommet-marks, zund-summa-marks,
batch-relink-export, tile-export). Název **Batch Text Edit**, adresář
`batch-text-edit`, namespace `BTE` (uživatel 2026-10-29).

Datum: 2026-10-29 · Stav: **návrh, čeká na schválení uživatelem**

Vzniklo z brainstormingu 2026-10-28/29. Podklady:

- `docs/reports/2026-10-28-text-chain-research.md` (dále **rešerše**):
  katalog kroků, volby ze sedmi přejmenovávačů a InDesignu, sondy
  v Illustratoru 30.8.2.
- `docs/reports/2026-10-28-pruzkum-inspirace-osokin-sato.md`.
- Test pravidel pro prvek na třech testovacích souborech uživatele
  (2026-10-29, jen čtení, §4.2).
- Klikací HTML prototypy z brainstormingu. Leží ve scratchpadu, takže
  zmizí; jejich chování popisuje tento návrh.

Kánon dialogů a rodinného jazyka je skill `extendscript-ui-standards`
(dále **kánon**).

---

## 1. Proč

V DTP se pořád opakuje stejná úloha. Na archu leží kopie jednoho prvku
(samolepka, vstupenka, štítek, cedulka, pozvánka) a v každé se má změnit
text: pořadové číslo, kód, série, rok, velikost písmen. Někdy celý arch,
jindy jen jeden blok, jeden artboard nebo vybrané prvky.

Illustrator na to vlastní nástroj nemá:

- **Úpravy › Najít a nahradit** hledá v celém dokumentu, rozsah na výběr
  ani artboard nastavit nejde, regulární výrazy neumí a číslovat neumí.
  Vychází to z manuálu CS4, na verzi 30.8 neověřeno.
- **Proměnné a datové sady** pracují vždy s jedním záznamem na dokument.

Dnes se to proto skládá ručně: prvek se rozkopíruje, očísluje skriptem
MakeNumbersSequence (Osokin), blok se zkopíruje, kusy navíc se domažou
a text se přepíše přes Najít a nahradit. Bolí na tom čtyři věci:

- **Počet hlídá jen oko.** Chyba v něm se ukáže až na archu.
- **Najít a nahradit nemá rozsah**, takže přepis v novém bloku může
  zasáhnout hotový blok.
- **MakeNumbersSequence mění formát.** Zapisuje přes `contents =`
  a celý text se pak přebarví podle prvního znaku (naměřeno, rešerše
  §7.1). Řazení po řádcích porovnává s tolerancí, což není tranzitivní,
  chyby končí v tichém `catch` a „Numbers in Text“ nahradí všechna čísla
  v textu (rešerše §8).
- **Každá varianta znamená celý postup znovu.**

Batch Text Edit je obecný nástroj na úpravu textu v zadaném rozsahu.
Opírá se hlavně o **proměnné**, tedy text ve složených závorkách, který
si operátor předem napíše do šablony: `{kód}`, `{n}`, `Série {série}`.
Umí ale i text bez závorek.

### 1.1 Příklady použití

Příklady jsou ilustrační. Nástroj nezná žádný konkrétní typ zakázky.

| úloha | rozsah | řetěz kroků |
|---|---|---|
| Šablona prvku se zástupnými texty, jeden blok | Výběr | Nahradit `{kód}` → text · Číslovat `{n}` od 1, Číslic 3, Do 100 |
| Další blok ze stejné šablony | Výběr | stejná předvolba, jiný text a rozsah čísel |
| Přečíslovat hotový blok, ve kterém už žádné závorky nejsou | Výběr | Číslovat „první číslo v prvku“ od 101 |
| Vstupenky: řada a místo | Celý dokument | Číslovat `{řada}` Formát A, Opakovat 20 · Číslovat `{místo}` Znovu od začátku po 20 |
| Změna roku jen na jednom artboardu | Aktivní artboard | Nahradit „Jiný text…“ `2025` → `2026` |
| Kódy do verzálek | Výběr | Velikost písmen `{kód}` (nebo Celý text) VELKÁ |

## 2. Cíle, ne-cíle, anti-cíle

**Cíle**

- Jeden běh upraví texty v rozsahu (výběr, aktivní artboard, dokument)
  řetězem kroků. Kroky jdou shora dolů a každý pracuje s výsledkem
  předchozího.
- Proměnné ve složených závorkách nástroj v textu najde sám a nabídne je
  ve výběru s počtem výskytů. Nic se nepíše ručně, takže odpadají
  překlepy.
- Funguje i na textu bez závorek: první číslo v prvku, libovolný text,
  regulární výraz.
- Před zápisem náhled po prvcích: Původní → Po vybraném kroku → Nový. Při
  náhledu se dokument nemění.
- Formát textu mimo nahrazený úsek zůstane beze změny.
- Spolehlivost má přednost před pohodlím: co ukáže náhled, to se zapíše
  (a ověří, §7); nic se nezapíše do zamčeného ani skrytého textu; celý běh
  vrátí jedno Zpět.
- Recepty, tedy uložené řetězy kroků, fungují jako předvolby podle kánonu.

**Ne-cíle v1**

- Vkládání seznamu nebo tabulky hodnot: uživatel ho odmítl. Různé
  varianty = víc běhů.
- Rozkopírování prvků a mazání prvků navíc.
- Změna formátu (barva, styl). Nástroj pracuje s obsahem textu.
- Text v symbolech, navázané rámečky a přetečený text: přeskočit
  s hláškou (§4.1).
- Kroky mimo v1 a další formáty čísla (§12).

**Anti-cíle**

- Zapsat jiný text, než ukázal náhled.
- Zapsat do zamčeného nebo skrytého textu. DOM to dovolí, i když
  `editable` vrací `false` (naměřeno, rešerše §7.3).
- Pořadí, které závisí na neviditelné struktuře dokumentu, třeba na
  skupinách nad prvkem. Operátor by ho z archu nepředvídal (rozhodnutí 13).
- Tichá záměna uložené proměnné za jinou, když v dokumentu chybí
  (rozhodnutí 18).
- Zápis přes celé `contents` tam, kde stačí úsek.
- Náhled přes Zpět, tedy zápis do dokumentu a jeho vracení. Mění dokument
  a historii.

## 3. Rozhodnutí

| # | rozhodnutí | kdo |
|---|---|---|
| 1 | Řetěz kroků po vzoru Transnomina, žádné řádky proměnných | uživatel 2026-10-28 |
| 2 | Jeden nástroj; najdi/nahraď je krok Nahradit, samostatný skript nebude | uživatel (rešerše §10 ot. 1) |
| 3 | Jeden běh = jeden rozsah. Varianty = víc běhů, seznam se nevkládá | uživatel |
| 4 | Kroky v1: Číslovat, Nahradit, Velikost písmen | uživatel (ot. 9) + rešerše |
| 5 | Formát čísla v1: `1` (s počtem číslic), `A` (A–Z, AA…), `a` | uživatel chtěl písmena; malá písmena jsou **moje volba** |
| 6 | Zamčené a skryté texty přeskočit a spočítat | uživatel (ot. 4) |
| 7 | Přetečený text a navázané rámečky přeskočit s hláškou | uživatel (ot. 5) |
| 8 | Když nesedí Do: jen varovat a nahlásit, Použít zůstane aktivní, prvky navíc jen nahlásit | uživatel (ot. 6) |
| 9 | Všechny shody kroku Číslovat v jednom prvku dostanou stejné číslo | uživatel (ot. 7) |
| 10 | Rozlišovat velká a malá: výchozí vypnuto | uživatel (ot. 10) |
| 11 | Náhled má sloupec „Po kroku N“ pro vybraný krok | uživatel (ot. 11) |
| 12 | Prvek = nejnižší skupina s textem; volné texty spárovat geometricky; jinak text sám (§4.2) | instinkt uživatele, ověřeno testem; geometrie je **moje volba** |
| 13 | Pořadí jen podle polohy prvků, přes celý rozsah. Skupiny nad prvkem pořadí neovlivní | **moje volba**; uživatel chce „robustní a spolehlivé“ |
| 14 | Pořadí Podle vrstev ve v1 není | **moje volba**; uživatel pro něj nemá použití |
| 15 | Kurzor v textu při Rozsahu Výběr: odmítnout s hláškou | **moje volba**; uživatel nevěděl (ot. 12) |
| 16 | Název Batch Text Edit (`batch-text-edit`, `BTE`) | uživatel 2026-10-29 |
| 17 | Proměnná = text ve složených závorkách. Nástroj proměnné najde a nabídne v poli Kde s počtem výskytů | uživatel 2026-10-29 |
| 18 | Nabídka ukazuje proměnné podle stavu textu před daným krokem. Uložená proměnná, která v textu není, se ukáže jako „(nenalezeno)“ a krok upozorní | **moje volba**, podle pravidla „(chybí)“ v kánonu §12.3 |

## 4. Rozsah, prvek, pořadí

### 4.1 Rozsah

| volba | které texty |
|---|---|
| **Výběr** | každý `TextFrame` ve vybraných objektech, rekurzivně přes skupiny a ořezové skupiny. Výběr může obsahovat skupiny skupin, jednotlivé prvky i texty vybrané přímo |
| **Aktivní artboard** | texty prvků, jejichž střed (§4.3) leží v obdélníku aktivního artboardu. `selectObjectsOnActiveArtboard` nepoužívat, mění výběr (rešerše §7.3) |
| **Celý dokument** | `doc.textFrames` |

Texty v rozsahu, které nástroj **přeskočí** a v Rozsahu i v souhrnu spočítá
po důvodech:

- **Zamčené nebo skryté:** `editable === false`. Pokrývá zamčený
  i skrytý objekt, skupinu i vrstvu (naměřeno, rešerše §7.3).
- **Přetečený text:** pravidlo „součet `lines[i].characters.length` je
  menší než `characters.length`“ z rešerše §7.2 je **chybné**, protože
  `lines` nezahrnují zakončení řádku (`\r`, U+0003), takže by hlásilo
  přetečení u každého textu s koncem odstavce. Platí průchod řádky, který
  za řádkem přičte i zakončení, ale jen když za ním stojí `\r` nebo U+0003
  (naměřeno 2026-10-29, Task 8,
  `batch-text-edit/docs/findings.md` §4). Opraveno 2026-10-29.
- **Navázaný rámeček:** `tf.story.textFrames.length > 1` (naměřeno
  2026-10-29, Task 8; `nextFrame` k tomu použít nejde).
- **Text v symbolu:** do `doc.textFrames` se nedostane, takže ho nástroj
  ani nevidí. Zmínit v README.

**Kurzor v textu.** Když je Rozsah nastavený na Výběr a výběr je úsek
textu (editační režim), nástroj odmítne s hláškou: ukončit úpravu textu
klávesou Esc a vybrat prvky. Co v tu chvíli vrací `app.selection`, změří
stavitel (rešerše §7.7). Rozsahy Aktivní artboard a Celý dokument výběr
nečtou a proběhnou normálně.

### 4.2 Prvek

Prvek je jednotka, která dostane jedno číslo, a podle jeho polohy se
řadí. Pravidlo:

1. **Text ve skupině:** prvek je nejnižší `GroupItem` nad textem, i když
   je to ořezová skupina.
2. **Text přímo ve vrstvě nebo podvrstvě:** prvek je nejmenší uzavřená
   `PathItem` nebo `CompoundPathItem`, která není ořezovou maskou, je
   větší než text a jejíž `geometricBounds` obsahují střed textu.
   Volné texty se stejným tvarem tvoří jeden prvek. Tvar může ležet
   kdekoli v dokumentu, i uvnitř skupiny.
3. **Jinak** je prvkem text sám.

Pravidla jsem otestoval 2026-10-29 jen čtením na třech testovacích
souborech uživatele. Ve všech je 240 prvků se dvěma texty, oba jsou
zástupné texty v závorkách. Řezné obrysy leží zvlášť ve vrstvě, grafika
prvku je v ořezové skupině.

| pravidlo | prvek = skupina | prvky ve skupinách po 12 (3 × 4) | bez skupin |
|---|---|---|---|
| nejnižší skupina s textem | ✓ 240 | ✓ 240 | ✗ 480 |
| nejvyšší objekt (co vybere Cmd+A) | ✓ 240 | ✗ 20 prvků po 24 textech | ✗ 480 |
| geometrie | ✓ 240 | ✓ 240 | ✓ 240, i bez řezných obrysů |

Kde se pravidlo láme (odvozeno, neměřeno), a proto je potřeba kontrola
v §6.3:

- **Texty jednoho prvku v různých podskupinách** se rozpadnou na víc
  prvků. Když je v prvku jen jedno číslo, nevadí to, protože text bez
  shody číslo nespotřebuje.
- **Dvě místa pro stejné číslo ve dvou podskupinách** (vstupenka
  a ústřižek) dostanou různá čísla. Oba texty musí být přímo v jedné
  skupině.
- **Volné texty na pozadí bez vlastního tvaru** (jen obdélník archu) se
  geometricky slijí do jednoho prvku.

Výkon: geometrie je pro každý volný text hledání mezi uzavřenými cestami.
Hranice cest se přečtou z DOM jednou, porovnává se v JS, případně
s mřížkou podle polohy. Cíl: 1000 volných textů a 10 000 cest pod 2 s.
Ověřit, neměřeno.

### 4.3 Pořadí

- **Střed prvku** je střed jeho hranic. Pro skupinu `geometricBounds`;
  u ořezové skupiny hranice masky, kvůli pasti s maskou z compound path
  (průzkum inspirace, I2). Pro geometrický prvek hranice tvaru, pro
  samotný text hranice textu.
- **Po řádcích** (výchozí): prvky se rozdělí do řádků podle středu Y.
  Nový řádek začne, když se střed liší o víc než polovinu mediánu výšky
  prvků. Řádky jdou shora dolů, v řádku zleva doprava. Shlukování je
  tranzitivní, porovnání dvojic s tolerancí ne (MakeNumbersSequence).
- **Po sloupcích:** totéž s osou X. Sloupce zleva doprava, v nich shora
  dolů.
- **Shoda:** rozhodne pořadí v `doc.textFrames` prvního textu prvku.
  Výsledek musí být deterministický.
- **Skupiny nad prvkem pořadí neovlivní** (rozhodnutí 13). Test na
  souboru se skupinami po 12 prvcích ukázal, že při číslování přes celý
  arch dostane levá horní skupina čísla 1, 2, 3, 13, 14, 15, 25… Kdo chce
  souvislou řadu v každé skupině, vybere skupinu a spustí běh, pak další
  s jiným Od. Výslovná volba „po skupinách“ je v §12.
- **Texty uvnitř prvku** jdou shora dolů, pak zleva doprava. Toto pořadí
  platí pro „první číslo v prvku“, pro pořadí v nabídce proměnných
  a pro zobrazení v náhledu.

Pořadí je jedno pro celý řetěz. Počítadlo každého kroku Číslovat počítá
jen prvky, ve kterých jeho Kde něco našlo.

## 5. Proměnné a kroky

### 5.1 Proměnné

- **Proměnná** je text mezi `{` a `}`, který neobsahuje další závorku ani
  konec odstavce (`\r`, U+0003): vzor `\{[^{}\r\u0003]+\}`. Smí obsahovat
  mezery, čísla i diakritiku, takže `{kód}`, `{n}`, `{1}` i `{název
  produktu}` jsou proměnné. Osamělá závorka proměnnou není.
- Proměnná může stát sama v textu, nebo uvnitř delšího textu
  (`Série {série}/{rok}`). Nahradí se jen ona, zbytek textu i jeho formát
  zůstanou.
- **Nabídka proměnných** u kroku obsahuje proměnné, které jsou v textech
  rozsahu ve stavu **před tímto krokem**, tedy po předchozích aktivních
  krocích. Krok, který proměnnou nahradil, ji dalším krokům z nabídky
  odebere, takže pořadí kroků je vidět přímo v nabídce.
- **Pořadí v nabídce** je podle prvního výskytu (pořadí prvků podle §4.3,
  texty v prvku podle §4.3). **Počet** je počet prvků, které proměnnou
  obsahují: „{n} (240×)“.
- **Uložená proměnná, která v textu není** (předvolba z jiné zakázky,
  nebo po prvním běhu, kdy už proměnné nahrazené jsou), zůstane vybraná
  jako „{n} (nenalezeno)“. Krok dostane ⚠ „Nic nenašel“. Nic se tiše
  nezamění za jinou položku (kánon §12.3, vzor ZSM.UI.selectDDL).
- Shoda proměnné je doslovná a rozlišuje velká a malá písmena.

### 5.2 Pole Kde

Každý krok má typ, přepínač Aktivní (vypnutý krok se přeskočí a zůstane
v řetězu) a pole **Kde**, které určí, na jakou část textu krok sahá (vzor
Transnomino Find, rešerše §6). U Nahradit se pole jmenuje **Najít**.

Kde je rozbalovací nabídka:

| položka | Číslovat | Nahradit | Velikost písmen |
|---|---|---|---|
| Celý text | — | — | ✓ (první položka) |
| nalezené proměnné s počtem | ✓ | ✓ | ✓ |
| oddělovač | ✓ | ✓ | ✓ |
| První číslo v prvku | ✓ | — | — |
| Jiný text… | ✓ | ✓ | ✓ |
| Regulární výraz… | ✓ | ✓ | ✓ |

- **Jiný text…** a **Regulární výraz…** ukážou pod nabídkou pole, kam se
  text nebo vzor napíše. ScriptUI nemá rozbalovací nabídku, do které jde
  i psát. Oddělovač je položka `"-"` (`type = separator`, naměřeno).
- **Jiný text** u Číslovat a Velikosti písmen hledá doslovně a rozlišuje
  velká a malá písmena. U Nahradit se řídí volbou Rozlišovat velká a malá
  (**moje volba**).
- **Regulární výrazy** se ve všech krocích kompilují s příznakem `g`
  a bez `m`, takže `^` a `$` znamenají začátek a konec celého textu
  (**moje volba**). Pasti enginu jsou v §5.4.
- **Výchozí Kde nového kroku** (**moje volba**): první proměnná
  v nabídce. Když v textu žádná není, Číslovat dostane „První číslo
  v prvku“, Nahradit „Jiný text…“ a Velikost písmen „Celý text“.
- „Celý text“ u Číslovat není: v prvku s více texty by číslo přepsalo
  všechny (**moje volba**).

### 5.3 Číslovat

| volba | význam | výchozí |
|---|---|---|
| **Kde** | §5.2 | §5.2 |
| **Od** | první hodnota, celé číslo, i záporné | 1 |
| **Do** | nepovinné, kontrola počtu | prázdné |
| **Krok** | přírůstek; záporný = sestupně, 0 = všude stejné | 1 |
| **Formát** | `1, 2, 3` · `A, B, C` · `a, b, c` | `1, 2, 3` |
| **Číslic** | nejmenší počet číslic, nuly zleva; jen pro formát `1` | 3 |
| **Opakovat** | kolikrát se každá hodnota použije | 1 |
| **Znovu od začátku po** | po kolika prvcích se řada vrací na Od; prázdné = nikdy | prázdné |

Hodnota prvku s pořadím *i* (od nuly) mezi prvky, kde Kde něco našlo:

```
b       = (Znovu po > 0) ? i mod Znovu po : i
hodnota = Od + Krok × floor(b / Opakovat)
```

- **Formát písmen:** bijektivní základ 26, tedy 1 = A, 26 = Z, 27 = AA
  (jako sloupce v Excelu). Hodnota pod 1 je ve formátu písmen chyba ✗.
- **Záporná hodnota ve formátu 1:** mínus a za ním číslice doplněné na
  Číslic, tedy −7 při Číslic 3 dá `-007` (podle prototypu). Čísla se
  formátují celočíselně, bez `toFixed`, protože engine zaokrouhluje jinak
  (naměřeno, rešerše §7.4).
- **„První číslo v prvku“:** první souvislá řada číslic `[0-9]+` v textech
  prvku v pořadí podle §4.3. Znaménko ani desetinnou část nebere (**moje
  volba**).
- **Všechny shody v prvku** dostanou stejnou hodnotu (rozhodnutí 9). Platí
  pro proměnnou, text i regex. U „prvního čísla“ je shoda vždy jedna.
- **Do:** když je vyplněné a poslední přidělená hodnota se od něj liší,
  objeví se ⚠ s textem podle prototypu: „Poslední číslo vyjde 24, v poli
  Do je 30.“ Když jsou Opakovat 1 a Znovu po prázdné, přidá se
  „Chybí 6 prvků.“ nebo „Prvků je o 6 víc.“ Použít zůstane aktivní
  (rozhodnutí 8).

### 5.4 Nahradit

| volba | výchozí | poznámka |
|---|---|---|
| **Najít** | §5.2 | prázdný Jiný text = ✗ „Zadejte, co hledat.“ |
| **Nahradit** | prázdné | prázdné maže |
| **Rozlišovat velká a malá** | vypnuto | rozhodnutí 10; u proměnné šedé, proměnná se hledá doslovně |
| **Jen první shoda v textu** | vypnuto | **moje volba**, levné, Transnomino „1st“ |

V režimu Jiný text se vzor escapuje, `$` v náhradě taky. V režimu
Regulární výraz fungují `$1`, `$&` a další (naměřeno).

Pasti enginu (naměřeno, rešerše §7.4), které musí nástroj ošetřit:

- **Lookbehind `(?<=…)` a pojmenované skupiny `(?<n>…)`** se neohlásí
  chybou a nic nenajdou. Vzor obsahující `(?<` proto odmítnout s ✗.
- **`.` chytá konec odstavce `\r`.** Napsat do helpTipu.
- **`\w` a `\b` neznají češtinu.** Volba Celá slova je proto až v §12.
- **Prázdné shody** (`x*`) přeskočit, vkládání ve v1 není (**moje volba**).
- **Neplatný vzor** poznat podle `e.name === "SyntaxError"`, ne podle
  textu hlášky, který engine lokalizuje.

### 5.5 Velikost písmen

| volba | hodnoty | výchozí |
|---|---|---|
| **Kde** | §5.2 | §5.2 |
| **Režim** | VELKÁ · malá · Každé Slovo · První písmeno věty | VELKÁ |

Zápis jde přes `textRange.changeCaseTo(CaseChangeType.…)`, které nechá
formát beze změny a umí češtinu (naměřeno, rešerše §7.1). Náhled ale musí
výsledek spočítat v JS. Stavitel změří, jestli se emulace všech čtyř
režimů shoduje s `changeCaseTo` na české sadě vstupů. Rešerše pro
SENTENCECASE zapsala výsledek, který je potřeba ověřit znovu. Když se
shodu dosáhnout nepodaří, zachytí rozdíl kontrola po zápisu (§7)
a nahlásí ho.

Když je Kde proměnná, mění se velikost písmen celé proměnné i se
závorkami. Závorky se tím nezmění, takže proměnná zůstane proměnnou
(s jiným názvem).

## 6. Dialog

### 6.1 Rozvržení

Kánon §2: Předvolby, obsah, patička, tlačítka Storno | Použít. Podle
prototypu a rešerše §7.6:

```
Předvolby   [Předvolba ▾] [↺] / [Uložit] [Uložit jako…] [Smazat]
Rozsah      (•) Výběr ( ) Aktivní artboard ( ) Celý dokument
            Pořadí: (•) Po řádcích ( ) Po sloupcích
            240 prvků, 480 textů · přeskočeno: 2 zamčené
Kroky       ┌ seznam kroků ───────┐  ┌ editor vybraného kroku ─────┐
            │☑ 1 Nahradit {kód} → │  │ Krok: [Číslovat ▾]  ☑ Aktivní
            │☑ 2 Číslovat {n} od 1│  │ Kde:  [{n}  (240×) ▾]
            │☑ 3 Nahradit {série} │  │ Od [ ] Do [ ] Krok [ ]
            └─────────────────────┘  │ Formát [1, 2, 3 ▾] Číslic [ ]
            [Nahradit ▾][+][−][↑][↓] │ Opakovat [ ] Znovu po [ ]
Náhled      ✓/⚠/✗ stavová řádka + seznam hlášek
            # | Původní | Po kroku N | Nový   (listbox se sloupci)
© 2026 Ladislav Osvald · v1.0.0          [Storno] [Použít]
```

- **Dva sloupce v panelu Kroky.** Výšku odhaduje rešerše na
  650–700 px, změří se headless (kánon §11). V jednom sloupci by dialog
  vyšel kolem 840 px, na stropu rodiny.
- **Položka seznamu** shrne krok: typ, Kde a hlavní hodnotu. ✗ nebo ⚠
  na konci ukazuje chybu nebo upozornění kroku.
- **Vypnutí kroku:** zaškrtávátko položky v listboxu (`ListItem.checked`
  jde nastavit i číst, naměřeno). Jak vypadá a jestli ho přepne klik,
  ověří ruční test. Když to nepůjde, stačí přepínač Aktivní v editoru
  a ☐ v textu položky.
- **Editor:** skupiny podle typu kroku ve skupině `orientation = "stack"`,
  přepínané přes `visible`. Výška okna se při přepnutí nemění (naměřeno).
  Pole pro Jiný text a Regulární výraz patří do téže skupiny, aby
  ukázání pole výšku neměnilo.
- **+** přidá krok typu zvoleného v dropdownu pod vybraný krok, **−** ho
  odebere (u jediného kroku je šedé), **↑ ↓** posunou. `checked` se při
  přesunu přenáší ručně (naměřeno). Po každé změně řetězu se nabídky Kde
  přepočítají (§5.1).
- **Náhled:** jeden řádek na prvek. Texty prvku spojené ` | `, konec
  odstavce zobrazený jako `¶`. Sloupec „Po kroku N“ ukazuje stav po
  vybraném kroku (rozhodnutí 11).

### 6.2 Živý přepočet

Texty se z DOM přečtou jednou, při otevření dialogu a při změně Rozsahu.
Řetěz i nabídky proměnných se pak počítají jen nad řetězci v JS. Plnění
listboxu se stovkami řádků a čtyřmi sloupci může být pomalé: stavitel
změří, a když přepočet s naplněním trvá přes ~200 ms, přepočítávat při
`onChange` (Enter, opuštění pole), ne při každém úhozu.

### 6.3 Kontroly

**✗ zablokuje Použít:**
- prázdný Jiný text nebo Regulární výraz;
- neplatný vzor nebo `(?<`;
- neplatné číslo v poli (čtení přes sdílený `numbers.js`, jen celá čísla);
- Číslic nebo Opakovat pod 1;
- hodnota pod 1 ve formátu písmen;
- v rozsahu není žádný text;
- kurzor v textu s Rozsahem Výběr.

**⚠ jen upozorní, Použít zůstane:**
- nesedí Do;
- krok nic nenašel, včetně proměnné „(nenalezeno)“;
- **prvek má víc shod jednoho kroku Číslovat.** Hláška „Prvek 1 má 24
  shod {n}, dostanou stejné číslo.“ chytí slité prvky z §4.2;
- přeskočené texty.

**Nic se nezmění:** Použít je šedé (**moje volba**, podle prototypu).

Barvy a symboly podle kánonu §12.6 (`shared/lib/field_paint.js`).

### 6.4 Předvolby

Podle kánonu §9 a §12.4. Předvolba nese Pořadí a celý řetěz kroků se
všemi poli. U pole Kde ukládá druh (proměnná, první číslo, jiný text,
regex, celý text) a text, u proměnné její název i se závorkami. Rozsah
nenese (**moje volba**: patří k běhu, ne k receptu). [Výchozí] se staví
z kódu a obsahuje jeden krok Číslovat s výchozími hodnotami z §5.2
a §5.3. Ukládání podle `docs/persistence.md`
a `shared/lib/ui_state.js`.

## 7. Zápis a záruky

1. **Výpočet:** pro každý text v pořadí se spočítá řetěz. Každý krok
   vrátí seznam úprav (text, začátek, délka, náhrada, nebo změna velikosti
   písmen) vůči stavu textu po předchozím kroku. Tatáž funkce plní
   náhled i nabídky proměnných.
2. **Zápis:** kroky se aplikují v pořadí. V jednom textu se úpravy kroku
   píšou od konce, aby se indexy neposunuly. Náhrada úseku jde přes
   `r = tf.characters[start]; r.length = délka; r.contents = náhrada`,
   které nechá formát mimo úsek beze změny a náhrada převezme formát
   prvního znaku úseku (naměřeno T2–T4). U proměnné je to tedy formát
   znaku `{`. `characterOffset` nepoužívat, čte se od 1 a zapisuje od 0
   (naměřeno). Index v `contents` odpovídá indexu v `characters` (`\r`
   i U+0003 jsou znaky, naměřeno); pro znaky mimo BMP neověřeno.
3. **Jedno Zpět:** během zápisu žádné `app.redraw()` (naměřeno, rešerše
   §7.5: 600 zápisů vrátilo jedno `app.undo()`). Běh ze Soubor › Skripty
   ověří ruční test.
4. **Kontrola po zápisu:** obsah každého zapsaného textu se přečte znovu
   a porovná s náhledem. Rozdíl se v souhrnu nahlásí jako chyba ✗ s počtem
   a prvními případy. Náhled = zápis je tak ověřené, ne předpokládané.
5. **Chyba DOM uprostřed zápisu:** zápis se zastaví a souhrn řekne, kolik
   prvků se zapsalo, a nabídne Zpět. Vzory podle skillu
   `robust-error-handling`, žádný tichý `catch`.
6. **Souhrn** (kánon §12.5): změněné prvky a texty, přeskočené po
   důvodech, upozornění Do, výsledek kontroly. Okno průběhu jen tehdy,
   když by zápis trval přes pár sekund; podle rešerše trvá 200 náhrad
   0,12 s, takže nejspíš nebude potřeba.

## 8. Architektura (návrh)

- Vlastní adresář `batch-text-edit/` se `src/`, `tools/build.sh` a testy,
  kopírovaný z `templates/`. Pravidla jsou v `docs/conventions.md`.
- **Moduly podle odpovědnosti:**
  - čisté jádro bez DOM: `vars.js` (hledání proměnných a počty),
    `steps.js` (řetěz nad řetězci → úpravy), `order.js`, `element.js`
    (pravidlo prvku nad prostými daty);
  - DOM: `scope.js` (sběr textů, důvody přeskočení, hranice), `write.js`
    (zápis a kontrola);
  - UI a běh: `ui.js`, `locale.js`, `config.js`, `main.js`.
- **Sdílené moduly:** `json2`, `ui_state`, `numbers`, `field_paint`,
  případně `summary`, podle kritérií v `docs/decisions.md`.
- **Testy v Node:** čisté jádro se testuje přímo. Pravidlo prvku na
  fixtures ve tvaru struktury tří testovacích souborů (typ, rodič,
  hranice, text). Sondu, která strukturu vypsala, napíše stavitel znovu,
  protože ta ze scratchpadu zmizí. Je to rekurze přes `layer.pageItems`
  a `group.pageItems`, která jen čte.

## 9. Ověření

**Node:**
- hledání proměnných: vzor, mezery a diakritika v názvu, proměnná uvnitř
  textu, osamělá závorka, konec odstavce, pořadí a počty, stav před
  krokem, „(nenalezeno)“;
- vzorec Číslovat (Od, Krok, záporné, 0, Opakovat, Znovu po);
- formát písmen (Z → AA, hodnota 0);
- kontrola Do;
- Nahradit: proměnná, jiný text, regex, velikost písmen, první shoda,
  `$`, `(?<`, prázdné shody;
- emulace velikosti písmen;
- shlukování řádků s rozptylem středů;
- pravidlo prvku na třech fixtures (240 / 240 / 240);
- úpravy od konce textu;
- shoda náhledu se seznamem úprav.

**Sondy v Illustratoru** (pravidla v paměti `illustrator-probe-hygiene`):
- formát mimo úsek při mixu formátů, i u proměnné uvnitř delšího textu;
- zamčené a skryté se nezapíšou;
- jedno Zpět;
- kontrola po zápisu;
- detekce přetečení a navázaných rámečků;
- `app.selection` s kurzorem v textu;
- `changeCaseTo` proti emulaci;
- rychlost plnění listboxu stovkami řádků;
- rozměry dialogu headless.

**Ruční test s uživatelem** na třech testovacích souborech (skupina,
skupiny po 12, bez skupin):
- nabídka Kde ukáže obě proměnné souboru s počtem 240×;
- krok Nahradit nahradí proměnnou kódu libovolným textem a krok Číslovat
  `{n}` od 1, Číslic 3 dá 240 prvků s čísly 001–240 po řádcích; formát
  a grafika zůstanou beze změny; jedno Cmd+Z vrátí všechno;
- druhý běh na hotovém bloku: proměnné ukazují „(nenalezeno)“,
  „První číslo v prvku“ přečísluje;
- zaškrtávátko v listboxu;
- kurzor v textu.

## 10. Pořadí prací (návrh)

1. Čisté jádro a testy: proměnné, kroky, pořadí, pravidlo prvku na
   fixtures.
2. Sběr textů a zápis se sondami: formát, zámky, Zpět, kontrola.
3. Dialog, nabídky Kde, živý náhled, kontroly, měření rozměrů.
4. Předvolby, souhrn, README, CHANGELOG, ruční test, vydání 1.0.0
   (skill `releasing-a-tool`).

## 11. Co je na staviteli

- Přesné šířky a texty podle kánonu.
- Formát uložení předvoleb.
- Optimalizace geometrie (mřížka).
- Zobrazení textů prvku v náhledu a položek seznamu kroků.
- Plnění a výkon listboxu.
- Kdy zobrazit okno průběhu.

Co by změnilo, co se staví, patří zpět uživateli.

## 12. Později

Z katalogu rešerše §3 a z brainstormingu, až je bude chtít zakázka:

- **Kroky:** Vložit (prefix, suffix, pozice), Vybrat (filtr), Seznam
  hodnot, Odstranit, Více dvojic, Datum, Náhodně.
- **Formáty čísla:** římské číslice, vlastní abeceda (např. bez I a O,
  které se pletou s 1 a 0), přeskočit čísla.
- **Číslování:** posun existujících čísel; pokračovat od posledního běhu.
- **Pořadí:** číslovat po skupinách jako **výslovná** volba s náhledem;
  Podle vrstev; Obráceně.
- **Prvek:** ruční volba (vybrané objekty, každý text).
- **Nahradit:** Celá slova s vlastní hranicí slova; upozornění na
  duplicitní čísla.

## 13. Otevřené

- **Zaškrtávátko v listboxu.** Rozhodne ruční test (§6.1).
