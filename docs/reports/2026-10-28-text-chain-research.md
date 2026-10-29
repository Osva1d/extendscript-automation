# Řetěz kroků pro text — rešerše funkcí a voleb

Datum: 2026-10-28. Podklad pro návrh (spec) pátého nástroje rodiny: řetěz
kroků nad textem, který už v dokumentu je, po vzoru Transnomina. Kód nevznikl,
nic se nescaffoldovalo.

Zdroje: sedm hromadných přejmenovávačů, InDesign (Najít/Změnit, číslování,
Data Merge), čtyři skripty Osokina z `docs/inspiration/` a sedm sond
v Illustratoru 30.8.2 (příloha A). Co jsem nezměřil, je tak označené.

## 1. Shrnutí

- **Koncept je proveditelný bez kompromisu, který by uživatel viděl.** Celý
  řetěz se dá spočítat jako řetězce v JS (náhled bez zásahu do dokumentu)
  a zapsat najednou. Zápis 200 čísel a 200 kódů trval 0,15 s a **jedno Zpět
  vrátilo celý běh** (naměřeno).
- **Formátování přežije, když se nepíše přes `contents =`.** Zápis celého
  `contents` přebarví text podle prvního znaku (naměřeno, přesně slabina
  MakeNumbersSequence). Náhrada úseku přes `characters[i]` + `length` drží
  formátování nahrazovaného úseku a zbytek textu nechá být (naměřeno).
- **DOM zámky nehlídá.** Zápis `contents` projde do textu na zamčené i skryté
  vrstvě, do zamčeného objektu i do zamčené skupiny. `editable` přitom vrací
  `false`. Nástroj musí zámky respektovat sám (naměřeno, nové).
- **Regulární výrazy enginu mají tři pasti**, které uživatel s regexem pozná
  až na výsledku: lookbehind a pojmenované skupiny se tiše nic nenajdou, `.`
  chytá konec odstavce `\r` a `\w` ani `\b` neznají češtinu (naměřeno).
- **Doporučená v1: dva kroky (Číslovat, Nahradit) a třetí levný (Velikost
  písmen)**, k tomu Rozsah, Pořadí, náhled, předvolby, vypnutí kroku a kontrola
  počtu. Zbytek katalogu (§3) je na později.
- **Jeden vzor z rešerše bych převzal hned:** každý krok má pole „Kde“, které
  určí, na jakou část textu krok sahá (Transnomino „Find“ u každého kroku).
  Číslovat tak nepotřebuje šablonu: „první číslo v prvku“, „text {n}“ nebo
  regex.

## 2. Metoda

| oblast | jak | hloubka |
|---|---|---|
| Transnomino | web + 6 screenshotů (`assets/screenshot-*.webp`) prohlédnutých v prohlížeči | UI kroků přečtené ze screenshotů, nápověda na webu není |
| ReNamer (den4b) | dokumentace pravidel Serialize a Replace | doslovné názvy voleb |
| Advanced Renamer | stránky metod Renumber, Replace, Add | doslovné názvy voleb |
| A Better Finder Rename 12 | manuál: Sequence, Text, Multi-step, Filters | doslovné názvy voleb |
| Name Mangler | nápověda: akce a multi-step | doslovné názvy voleb |
| NameChanger | web | jen výčet funkcí |
| Bulk Rename Utility | web + fórum | **volby panelu Numbering jen z fóra**, oficiální manuál jsem nenašel |
| Finder | nápověda Apple | režimy ano, přesné popisky Format ne |
| InDesign | helpx: volby hledání, Data Merge, číslované seznamy | popisky ověřené na stránkách z 2026-06 |
| Osokin | celé čtení 4 skriptů, výpis zástupných textů BatchRenamer | §8 |
| Illustrator | 7 sond přes `tools/ai-eval.sh`, příloha A | co nejde změřit headless, je v §7.6 |

## 3. Katalog typů kroků

Priorita: **v1** = navrhuji do první verze, **později** = dává smysl, ale
nečeká na to žádná zakázka, **ne** = nepatří do nástroje. Proveditelnost:
ES3 je logika v enginu, DOM je zápis do Illustratoru, UI je ScriptUI.

| krok CS / EN | co dělá | volby | příklad z praxe | proveditelnost | priorita |
|---|---|---|---|---|---|
| **Číslovat** / Number | vepíše pořadové číslo prvku na místo určené polem Kde | §4.1 | samolepky 001–080, vstupenky řada × místo, sedadla A1–A20 | ES3 ✓, DOM ✓ náhrada úseku drží formát, UI ✓ | **v1** |
| **Nahradit** / Replace | najde text nebo regex a nahradí ho | §4.2 | „SNB CZ“ → „SNB SK“, „2025“ → „2026“ | ES3 ✓ s pastmi regexu (§7.4), DOM ✓, UI ✓ | **v1** |
| **Velikost písmen** / Change case | VELKÁ, malá, Každé Slovo, První věta | Kde; režim (4 hodnoty) | kódy na štítcích do verzálek | DOM `changeCaseTo` zachová formát, umí češtinu (naměřeno) | **v1** (levné) |
| Vložit / Insert (Prefix, Suffix) | přidá text na začátek, konec, pozici N nebo před/za shodu | text; kam (začátek, konec, pozice od začátku/od konce, před/za Kde) | „SK-“ před kód, „ks“ za číslo | ES3 ✓, DOM `insertionPoints[i].characters.add()` ✓ (naměřeno) | později; začátek a konec umí Nahradit s regexem `^`/`$` |
| Vybrat / Select (filtr) | další kroky platí jen pro prvky, které splňují podmínku | obsahuje / neobsahuje / regex / každý N-tý / rozsah pořadí / vrstva | v jednom výběru číslovat jen samolepky s „CZ“ | ES3 ✓, UI: šedé řádky v náhledu | později (jeden běh = jeden výběr to dnes řeší) |
| Posunout čísla / Renumber relative | k existujícímu číslu přičte N, mezery v řadě zůstanou | Kde; o kolik; Číslic | druhá role pokračuje 101–200 | ES3 ✓ | později, jako režim Číslovat |
| Nastavit text / Set, Compose | přepíše celý text podle šablony se zástupnými texty | šablona `{puvodni}`, `{n}`, `{datum}` | „{kód} {n}/{celkem}“ | DOM: celý zápis přebere formát prvního znaku | později |
| Seznam hodnot / List, Arbitrary terms | dosadí hodnoty ze seznamu po řadě, dokola | seznam (řádky nebo čárky); dokola / jednou | velikosti S/M/L, střídání CZ/SK | ES3 ✓ | později; seznam z e-mailu uživatel pro bloky odmítl |
| Odstranit / Remove, Trim | smaže znaky: prvních N, posledních N, rozsah, číslice, mezery navíc | Kde; co | úklid po importu, dvojité mezery | ES3 ✓, DOM `range.remove()` ✓ | později; většinu umí Nahradit s prázdnou náhradou |
| Více dvojic / Lookup table | víc náhrad v jednom kroku (A→B, C→D) | tabulka dvojic | jazykové mutace, kódy zemí | UI: tabulka v listboxu bez editace buněk | později |
| Datum / Date | vloží dnešní datum ve formátu | formát (D. M. RRRR, RRRR-MM-DD) | datum výroby na štítku | ES3 ✓ | později |
| Náhodně / Shuffle, Random | zamíchá pořadí čísel, nebo unikátní náhodná čísla | rozsah, semínko | tombola, slosovatelné vstupenky | ES3 ✓ | později |
| Smazat nadbytečné / Remove surplus | odebere prvky navíc za Do | jen nahlásit / skrýt / smazat | arch 104 samolepek, zakázka 100 | DOM ✓, ale nevratné mimo Zpět | otázka (§10) |
| Formátování / Find format | změní barvu nebo styl nalezeného textu | — | zvýraznit nalezené | DOM ✓ | ne, nástroj pracuje s textem |
| Data ze souboru / CSV, Data Merge | text z tabulky po záznamech | — | personalizace | Illustrator má vlastní Proměnné a sady dat (`doc.variables`, `doc.dataSets` existují, naměřeno) | ne |
| Metadata, EXIF, hudba, cesty | — | — | — | v Illustratoru nedává smysl | ne |
| Přepis diakritiky, Windows názvy | — | — | — | — | ne |
| Skript (Pascal, NCDL, JS) | uživatel napíše vlastní krok | — | — | `eval` | ne |

Formát čísla (1, 01, A, a, I) a „Znovu od začátku“ nejsou samostatné kroky,
jsou to volby Číslovat (§4.1). Obrácené pořadí (Osokin „Reverse Apply“) patří
do Pořadí, ne do kroků.

## 4. Podrobné volby

### 4.1 Číslovat

Jak volby nazývají vzory:

| volba | Transnomino | ReNamer Serialize | Advanced Renamer | ABFR | Name Mangler | Osokin MNS | InDesign |
|---|---|---|---|---|---|---|---|
| kde | Find + Position, Offset | Insert where | Number position | před/za textem, pozice | celé jméno | celý text / čísla / `{%n}` | Number `^#.` |
| od | Start | Index starts | New number | Start with | Start at | Start | Start At |
| krok | Step | Step | Skip | Step value | Increase by | Increment | — |
| číslic | Digits | Pad with zero to length | Automatic / Manual / No padding | Padding | Minimum digits | Auto / Fixed | Format 01, 001 |
| opakovat | Repeat | Repeat | — | — | — | — | — |
| znovu od začátku | Reset every N, Reset every folder change | Reset every, if folder changes, if file name changes | — | Sort each folder separately | Group by | — | Restart Numbers At This Level After |
| formát | Decimal, Hex, Roman | decimal, letters, Roman, custom | — | (zvlášť Roman, Alphabetical) | Arabic, Roman, letters, Arbitrary Terms | — | 1, 01, i, A… |
| do | — | — | — | — | — | End (zastaví se) | — |
| jiné | Random | — | Absolute / Relative | auto-increment counters | Laziness indicator | Shuffle, Trailing zeros, Remove unused | Continue across stories |

Návrh voleb pro v1:

| volba | význam | výchozí | poznámka |
|---|---|---|---|
| **Kde** | první číslo v prvku · text (např. `{n}`, `###`) · regulární výraz · celý text | první číslo v prvku | jako Transnomino Find; „celý text“ píše přes `contents`, ostatní přes náhradu úseku |
| **Všechny shody v prvku** | stejné číslo všem shodám v jednom prvku | zapnuto | vstupenka a ústřižek, číslo vpředu a vzadu na štítku |
| **Od** | první hodnota | 1 | celé číslo, záporné povolit |
| **Do** | nepovinné, kontrola počtu | prázdné | když poslední číslo ≠ Do, krok má ✗ a Použít zašedne; hláška „Chybí N prvků“ / „Prvků je o N víc“ (prototyp) |
| **Krok** | přírůstek | 1 | záporný = sestupně; 0 = všude stejné |
| **Číslic** | nejmenší počet číslic, doplní nuly zleva | 3 | prázdné = Auto podle největšího čísla (Advanced Renamer Automatic) |
| **Opakovat** | kolikrát se každé číslo použije | 1 | řada vstupenek: 1 × 20, 2 × 20… |
| **Znovu od začátku po** | po kolika prvcích se řada vrací na Od | prázdné | místa v řadě: 1–20, 1–20… (prototyp: „jiný rytmus“) |
| **Formát** | 1 · A · a | 1 | písmena jako sloupce Excelu: Z, AA, AB (sedadla). ReNamer „English letters“ jde a…z, ba, bb, to pro sedadla nesedí |

Hodnota pro prvek s pořadím *i* (od nuly), jak ji počítá prototyp:

```
b = (Znovu po > 0) ? i mod Znovu po : i
hodnota = Od + Krok × floor(b / Opakovat)
```

Příklad vstupenek (pořadí po řádcích, 20 míst v řadě): krok 1 Číslovat, Kde
`{r}`, Opakovat 20 → řada 1 dvacetkrát, pak 2. Krok 2 Číslovat, Kde `{m}`,
Znovu od začátku po 20 → místa 1–20, 1–20. Se Formátem A je první krok
řada A, B, C.

Co čísluje: **prvek, ve kterém Kde něco našlo**, ne každý text. Prvek bez shody
číslo nedostane a řadu nezvýší (prototyp, MakeNumbersSequence filtruje
stejně). Číslo převezme formát prvního znaku nahrazovaného úseku
(naměřeno T3, T4): když má `{n}` jiný styl na `{` než na `n`, platí `{`.

Na později: Posun (relativně, Advanced Renamer Relative), římské číslice,
přeskočit čísla (řada 13), pokračovat od posledního běhu (ABFR auto-increment
counters, InDesign Continue across stories), znovu od začátku při změně textu
(ReNamer „if file name changes“, Name Mangler Group by: oba bloky CZ a SK
v jednom výběru by se číslovaly zvlášť), náhodně.

### 4.2 Nahradit

| volba | Transnomino | ReNamer | ABFR | Advanced Renamer | Name Mangler | InDesign |
|---|---|---|---|---|---|---|
| režim | `*` / Re | Interpret wildcards | Replace regular expression | Use regular expressions | Query is a regular expression | Text / GREP |
| velikost písmen | Aa | Case sensitive | Ignore case | Case Sensitive | Ignore case | Case Sensitive |
| výskyt | 1st | all / first / last | all, 1.–6., last, 1.–6. od konce | — | — | — |
| celá slova | — | Whole words only | — | — | — | Whole Word |
| víc dvojic | Lookup table | `*\|*` | — | oddělovač | — | — |
| zpětné odkazy | `$1` | (regex pravidlo) | ano | ano | `$n` | `$1` |

Návrh pro v1:

| volba | výchozí | poznámka |
|---|---|---|
| **Najít** | — | prázdné = ✗ „Zadejte, co hledat.“ |
| **Nahradit** | prázdné | prázdné maže |
| **Regulární výraz** | vypnuto | v režimu text se `$` v náhradě escapuje (prototyp) |
| **Rozlišovat velká a malá** | zapnuto | prototyp; InDesign Text má výchozí vypnuto, GREP zapnuto — rozhodnutí v §10 |
| **Jen první shoda** | vypnuto | v textu, ne v prvku |
| **Celá slova** | později | engine `\b` češtinu nezná (§7.4), musí být vlastní hranice slova |

Zápis: každá shoda zvlášť přes `characters[i]` + `length` + `contents`, od
konce textu, ať se indexy neposunou. Index v řetězci `contents` odpovídá indexu
v `characters`, `\r` i měkký zlom U+0003 jsou znaky (naměřeno T2, T7). Pro
znaky mimo BMP (emoji) neověřeno.

## 5. Doporučená sada pro v1

Kroky: **Číslovat, Nahradit, Velikost písmen.** Velikost písmen stojí na
nativním `changeCaseTo`, takže je skoro zadarmo a formát nechá být.

Kolem kroků (už v prototypu):

- **Rozsah:** Výběr · Aktivní artboard · Celý dokument.
- **Pořadí:** Po řádcích · Po sloupcích · Podle vrstev, plus Obráceně.
- **Prvek = nejvyšší objekt rozsahu** (skupina = samolepka, volný text = prvek
  sám). Texty v prvku shora dolů. Otázka k vnořeným skupinám v §10.
- **Kroky:** seznam s + − ↑ ↓, krok jde vypnout, vybraný krok v editoru.
- **Náhled:** tabulka # · Původní · Nový, ✗ u kroku s chybou, ✗ Použít, když
  nesedí Do.
- **Předvolby** podle kánonu rodiny (recepty Transnomina).
- **Zamčené a skryté texty přeskočit a spočítat** v souhrnu.
- **Jeden krok Zpět**: bez `app.redraw()` během zápisu (naměřeno §7.5).

## 6. Vzory UX k převzetí

| vzor | odkud | pro nás | priorita |
|---|---|---|---|
| Živý náhled Původní → Nový | všechny | náhled je čistý výpočet nad řetězci, dokument se nemění, past Zpět z náhledu (Osokin, I5 v průzkumu z 2026-10-28) odpadá | v1 |
| Pole Kde u každého kroku s přepínači `*` Re Aa 1st | Transnomino | jednotný ovládací prvek pro Číslovat, Nahradit, Velikost písmen | v1 |
| Vypnout krok bez smazání | Transnomino Active, ABFR Active, ReNamer | zaškrtávátko nebo ✓ v seznamu, viz §7.6 | v1 |
| Chyba u kroku v seznamu (✗) a počet zasažených | prototyp, Transnomino „Rename 4 files“ | „24 prvků, 48 textů“, Použít zašedlé | v1 |
| Recepty / předvolby | Transnomino, ABFR, ReNamer, Name Mangler | kánon předvoleb rodiny | v1 |
| Mezivýsledek po vybraném kroku | Name Mangler (prostřední sloupec), ABFR „This Action“ | sloupec „Po kroku N“ v náhledu | v1 nebo později, §10 |
| Šedé řádky, které krok Vybrat vyřadil | Transnomino Select | jen s krokem Vybrat | později |
| Filtr platí do dalšího filtru | ABFR Filter actions | jen s krokem Vybrat | později |
| Repeat a Reset u číslování | Transnomino, ReNamer | Opakovat, Znovu od začátku po | v1 |
| Upozornění na duplicity | Name Mangler, ABFR | „dva prvky mají číslo 017“ | později, levné |
| Name vs Original Name | Name Mangler | zástupný text pro původní text | později |
| Pevné pořadí panelů 1–14 | Bulk Rename Utility | **nepřebírat**: pořadí kroků musí určit uživatel | ne |
| Kontrolní seznam souborů (zaškrtnout, co přejmenovat) | NameChanger | v Illustratoru to dělá výběr | ne |

## 7. Omezení Illustratoru a ExtendScriptu

Vše naměřeno 2026-10-28 v Illustratoru 30.8.2 přes `tools/ai-eval.sh`
(AppleScript `do javascript`), ve vlastních dokumentech. Běh přes Soubor ›
Skripty neměřen.

### 7.1 Zápis a formátování

Text „SNB CZ 001“: „SNB“ červeně 20 pt, zbytek černě 12 pt.

| operace | výsledek | test |
|---|---|---|
| `tf.contents = "SNB SK 002"` | **celý text červeně 20 pt** (formát prvního znaku) | T1 |
| `r = tf.characters[4]; r.length = 2; r.contents = "SK"` | „SNB SK 001“, SK černě 12, zbytek beze změny | T2 |
| úsek „001“ → „0123“ (delší) | nové znaky převezmou formát úseku | T3 |
| úsek přes hranici formátů „B C“ → „xyz“ | celá náhrada ve formátu **prvního** znaku úseku | T4 |
| `tf.insertionPoints[7].characters.add("#")` | vloží, převezme formát znaku **před** místem; na pozici 0 formát znaku za ním | T5, T5d |
| `range.remove()` i `range.contents = ""` | smaže, okolí beze změny | T6 |
| text vyprázdněný na `""`, pak `contents = "ABC"` | dostane formát bývalého prvního znaku | T9 |
| `textRange.changeCaseTo(CaseChangeType.…)` | formát zůstane; TITLECASE „Čau Světe“, SENTENCECASE „čau světe“ | T8 |
| `CaseChangeType` | UPPERCASE, LOWERCASE, TITLECASE, SENTENCECASE | T8b |
| `characters[4].characterOffset` | čte se **5** (od jedničky); zápis `characterOffset = 7` ukázal na znak s indexem 7 (od nuly) | T2b |

Důsledek: krok zapisuje přes úsek, nikdy přes celé `contents` (kromě Kde =
celý text). `characterOffset` nepoužívat, čtení a zápis počítají jinak.

### 7.2 Druhy textu, odstavce, přetečení, navázání

| co | naměřeno | test |
|---|---|---|
| bodový, odstavcový, text na cestě | všechny `TextFrame`, `kind` POINTTEXT / AREATEXT / PATHTEXT | T11 |
| konec odstavce | `\r`; zapsané `\n` i `\r\n` se uloží jako jediné `\r` | T7b, T7c |
| měkký zlom (Shift+Enter) | znak U+0003; **`paragraphs` ho počítá jako nový odstavec** (1× `\r` + 1× U+0003 = 3 odstavce) | T7 |
| přetečení | vlastnost pro přetečení **není**. Odstavcový text 54 znaků, v řádcích 22: `characters.length` 54, součet `lines[i].characters.length` 22 | T12 |
| přetečený text v `contents` | je tam celý, včetně skryté části | T12 |
| navázané rámečky | `contents` vrací **jen část v tom rámečku** (15 + 24 znaků, příběh 39). Zápis do druhého rámečku nahradí jeho část a text přeteče zpět do prvního | T13 |
| tabulátor, pomlčka, NBSP, tenká mezera, měkké dělení | projdou zápisem i čtením beze změny | M4 |
| `words` | dělí jen podle mezer: [čau][světe][SNB-CZ][1-100][ks] | M3 |

Důsledek: přetečení poznat součtem řádků a ukázat v náhledu (náhrada v neviditelné
části). Navázané rámečky v1 přeskočit a nahlásit, nebo pracovat s `story`.

### 7.3 Kde text leží: zámky, skupiny, masky, symboly

Dokument s 11 texty v různých místech (S1, S2):

| umístění | v `doc.textFrames` | `editable` | zápis `contents` |
|---|---|---|---|
| volně ve vrstvě | ✓ | true | projde |
| ve skupině, ve vnořené skupině, v ořezové skupině | ✓ | true | projde |
| v podvrstvě | ✓ | true | projde |
| objekt `locked` | ✓ | **false** | **projde** (i náhrada úseku) |
| objekt `hidden` | ✓ | **false** | **projde** |
| v zamčené skupině | ✓ | **false** | **projde** |
| ve skryté skupině | ✓ | **false** | **projde** |
| na zamčené vrstvě | ✓ | **false** | **projde** |
| na skryté vrstvě | ✓ | **false** | **projde** (i `changeCaseTo`) |
| v symbolu | ✗ | — | dostupný až po `symbolItem.breakLink()` (M6) |

Proti `engine-facts.md` („Skrytá vrstva je pro zápis zamčená“) to není rozpor:
tam selhává **vytvoření** nebo **přesun** objektu do skryté či zamčené vrstvy.
Změna obsahu existujícího textu zámky ignoruje. **K zapsání do
`engine-facts.md`.**

Další naměřené:

- `doc.textFrames` je seřazený **odpředu dozadu** (nejvyšší vrstva první),
  `absoluteZOrderPosition` roste dopředu. `layer.textFrames` vrací jen přímé
  potomky (S1, S1b, S7).
- `doc.textFrames` se **nezpožďuje** do `app.redraw()` (M1: 3 nové texty hned
  vidět). `engine-facts.md` u `doc.pathItems` naměřilo zpoždění; proč se liší,
  neměřeno.
- Výběr: celá skupina → `GroupItem`; text uvnitř skupiny vybraný přímo →
  `TextFrame`. **Když je ve skupině vybrané všechno, hlásí se skupina**:
  vybraný jediný text ve vnořené skupině G2 › G3 se v `selection` objevil jako
  `G2` (S3, S3b, S3c).
- `selection` je seřazený odpředu dozadu (S3c).
- `doc.selectObjectsOnActiveArtboard()` vybere objekty nejvyšší úrovně
  (skupinu jako skupinu), **i ty jen napůl na artboardu**, a vynechá zamčené
  a skryté. Mění výběr uživatele (S4).
- Bodový text: `geometricBounds` = `visibleBounds`, `position` = levý horní
  roh (S5). Mez ořezové skupiny z compound path: past I2 z průzkumu
  2026-10-28, platí i pro řazení prvků.
- `TextFrame` má `uuid` (čtení 400× pod 1 ms), hodí se na spárování náhledu
  se zápisem.

### 7.4 Regulární výrazy a řetězce v enginu

| co | výsledek | dopad |
|---|---|---|
| příznaky | `g`, `i`, `m` ano; `y`, `u`, `s` = chyba syntaxe | jen tři přepínače |
| lookahead `(?=)`, `(?!)` | funguje | — |
| **lookbehind `(?<=)`** | **bez chyby, nic nenajde** | validovat: vzor s `(?<` odmítnout hláškou |
| **pojmenovaná skupina `(?<n>)`** | **bez chyby, nic nenajde** | totéž |
| `$1`, `$&`, `` $` ``, `$'`, `$$`, funkce jako náhrada | fungují; `$10` s jednou skupinou = `$1` + „0“ | — |
| **`.` a `\r`** | **`.` chytá `\r`** (specifikace ne) | `.+` přeteče přes odstavce |
| `^` s `m` na `\r` | funguje | — |
| `\s` | NBSP ano, U+0003 ne | — |
| **`\w`, `\b`** | **č není `\w`**; `\bau\b` najde „au“ uvnitř „čau“ | Celá slova jen vlastní hranicí |
| `i` a čeština | `/č/i` najde Č | — |
| `toUpperCase` / `toLowerCase` | celá česká abeceda správně; ß zůstane ß | — |
| řazení | `sort` i `localeCompare` po kódech: c, d, h, č | řadit podle textu jen vlastní kolací |
| `(2.5).toFixed(0)` | „2“ (specifikace „3“) | čísla formátovat celočíselně, ne `toFixed` |
| `/a/g.test` dvakrát | true, true (specifikace true, false) | nespoléhat na `lastIndex` |
| `"ab".replace(/x*/g, "-")` | „-a-b“ (specifikace „-a-b-“) | okrajové |
| neplatný vzor | `SyntaxError`, zpráva lokalizovaná („Chyba syntaxe“) | testovat `e.name`, ne text |
| `normalize` | neexistuje | — |
| `replace` na 119 kB řetězci | 397 ms | na jednotlivé texty zanedbatelné |

### 7.5 Rychlost a Zpět

200 samolepek (skupina: kruh, kód, číslo, obdélník), 400 textů:

| operace | čas |
|---|---|
| sebrat 400 textů z `doc.textFrames` | 39 ms |
| přečíst 400× `contents` / `editable` / `uuid` | 1 / 1 / 0 ms |
| `geometricBounds` 200 skupin | 33 ms |
| 200× náhrada úseku (`{n}` → 001…200) | 117 ms |
| 200× `contents =` | 29 ms |
| 200× `changeCaseTo` | 97 ms |
| **jedno `app.undo()` po běhu se všemi třemi zápisy** | **vrátilo všechno** |

Odpovídá `engine-facts.md` („`app.redraw()` dělí historii Zpět“): bez
redraw je běh jeden krok. Stavba 200 skupin skriptem trvala 12 s, to se
nástroje netýká.

### 7.6 ScriptUI

| prvek | naměřeno | neověřeno |
|---|---|---|
| seznam kroků (`listbox`) | `ListItem.checked` jde nastavit i číst (před nastavením `undefined`, ne `false`); položky mají i `icon`, `expanded` | jak zaškrtnutí vypadá a jestli ho klik přepne — **ruční test** |
| přesun ↑ ↓ | `remove` + `add("item", text, index)` funguje, `checked` se musí přenést ručně | — |
| programový výběr | `lb.selection = 1` spustí `onChange` (jako u `dropdownlist` v `engine-facts.md`) | — |
| editor podle typu | skupina `orientation = "stack"` má výšku nejvyššího editoru (193 px pro 7 zaškrtávátek), přepnutí `visible` výšku okna nezmění | — |
| tabulka náhledu | `listbox` se sloupci: 33 + 20 px na řádek (10 řádků 233 px), seznam bez hlavičky 14 + 20 (8 řádků 174 px), shodně s `engine-facts.md` | barevné ✓/✗ v buňce (měřené jen na `statictext`) |
| `treeview` | existuje | — |
| oddělovač v `dropdownlist` | položka `"-"` má `type = separator` | — |
| `$.screens` | hlásí 756 × 474 (horní okraj 31), polovinu displeje 1512 × 982 | proč; jako strop výšky nepoužívat |

Rozpočet výšky (odhad, ne měření): ve dvou sloupcích (vlevo seznam kroků se
6 řádky + tlačítka ≈ 170 px, vpravo editor ≈ 200 px) a s tabulkou náhledu
pod nimi (10 řádků 233 px) vychází dialog s předvolbami, Rozsahem, Pořadím
a patičkou kolem 650–700 px. V jednom sloupci kolem 840 px, tedy na stropu
rodiny (~850 px). **Doporučuji dva sloupce**, rozměry změřit headless ve
fázi návrhu (kánon §11).

### 7.7 Co jsem nezměřil

- Výběr, když má uživatel kurzor v textu (editační režim). Skriptem vybraný
  úsek se v `selection` hlásí jako `[TextFrame]` (M2), uživatelský kurzor může
  dát `TextRange` (Osokin s tím počítá). Ruční test.
- Zaškrtávátko v `listbox` na obrazovce a klik na něj.
- Indexy u znaků mimo BMP (emoji), svislý text, text na cestě při zápisu
  (jen `kind`), OpenType a variabilní písma.
- Rychlost na skutečném souboru s tisíci prvky (jen 400 textů).
- Běh přes Soubor › Skripty (Zpět se tam může lišit).
- **První běh sondy 2 vcelku se zasekl:** AppleEvent timeout po 120 s,
  Illustrator pak asi pět minut neodpovídal ani na čtení, s nízkou zátěží
  procesoru. Po pokynu uživatele „Zkus to ještě jednou“ odpověděl s 0
  dokumenty (sonda tedy doběhla a svůj dokument zavřela). Tytéž testy po
  šesti částech proběhly každá za ~2 s. Příčinu neznám; obrazovku jsem neviděl.

## 8. Slabiny inspiračních skriptů

Cesty vedou do `docs/inspiration/illustrator-scripts-master/jsx/` (lokální,
mimo git).

| skript | slabina | kde | dopad na nás |
|---|---|---|---|
| MakeNumbersSequence | `tfs[i].contents = …` přepíše celý text | `MakeNumbersSequence.jsx:446` | naměřeno T1: smíšený formát zmizí |
| | „Numbers in Text“: regex `(\d+([.,]\d+)*)` s `g` nahradí **všechna** čísla stejným číslem | `:439` | „SNB 2026 001“ → obě čísla stejná |
| | porovnání s tolerancí při řazení není tranzitivní | `:883–888`, tolerance půl mediánu `:911–929` | pořadí v řádku se může přeházet; řešit shlukováním do řádků |
| | tichý `catch` kolem celého skriptu | `:969–971` | chyba bez hlášky |
| | `strToNum`: „1O5“ → 15 | `:677–685` | kánon §12.3 zakazuje |
| | čísluje **každý text**, ne prvek; rekurze do skupin | `:657–669` | v samolepce s kódem a číslem čísluje i kód, když obsahuje číslici |
| | zámky a viditelnost nekontroluje | — | podle S2 by přepsal i zamčené texty (odvozeno, neměřeno na skriptu) |
| | výchozí pořadí = obrácený výběr | `:68` | čísluje odzadu dopředu |
| | End: za ním nechá texty beze změny, „Remove Unused“ smaže **texty**, ne skupiny | `:451–456` | zbude samolepka bez čísla |
| | nastavení přes `new Function`, vypíná `ShowExternalJSXWarning` | `:566`, `:43` | už v průzkumu 2026-10-28 |
| MultiEditText | „Keep Para Format“ kopíruje bílý seznam atributů odstavce, experimentální a pomalé | `MultiEditText.jsx:511–549` | jen po odstavcích, ne po znacích |
| | náhled přes Zpět s pomocnou cestou `Remove_Path`, aby vždy byl krok k vrácení | `:295–296`, `:330–339` | u nás náhled bez zásahu do dokumentu |
| | v CC 2020 Zpět u textu shodí Illustrator, náhled vypnutý | `:184–188` | 30.8.2 Zpět textu zvládl (§7.5) |
| | řazení: pevná tolerance 10 pt, netranzitivní | `:431–442` | jako výš |
| | měkký zlom U+0003 převádí na `@#` pro editaci | `:451–460` | potvrzuje T7 |
| InsertText | vkládá přes `characters[pos].contents = vložené + znak` | `InsertText.jsx:467–472` | formát podle znaku, shodné s T5 |
| | kotva Zpět `doc.swatches.add().remove()` | `:298–317` | jiný trik téhož (MultiEditText) |
| | `alert` uvnitř náhledu, tiché `catch` kolem zápisu | `:322–340` | — |
| | pozice „1,3-5“, každý N-tý, liché/sudé, od začátku/konce, před/za/přepsat | `:93–162` | inspirace pro krok Vložit |
| ReplaceFormattedText | schránku čte přes `app.paste()` a smazání vloženého | `ReplaceFormattedText.jsx:117–125` | mění dokument i výběr |
| | kopíruje `characterAttributes` prvního znaku každého odstavce | `:127–152` | formát jen po odstavcích |
| | polyfill přepíše `Array.prototype.forEach` globálně | `:92–102` | globální stav enginu |
| BatchRenamer | zástupné texty `{nu:0}`, `{nd:0}`, `{w}`, `{h}`, `{f}`, `{dmy}` v rozbalovacím seznamu | `BatchRenamer.jsx:103–130` | vzor nabídky zástupných textů |

## 9. Poučení z InDesignu

- **Najít/Změnit** — rozsah All Documents, Document, Story, To End of Story,
  Selection (u nás Rozsah). Include Locked Layers and Locked Objects je
  **Find Only**, Include Hidden Layers and Hidden Objects **nahradit dovolí**.
  U nás v1 obojí přeskočit (§7.3, otázka v §10). Uložené dotazy = předvolby.
  Find Format / Change Format do nástroje nepatří.
- **Číslované seznamy** — číslo uvnitř šablony (Number `^#.`), Start At,
  Continue from Previous Number, Restart Numbers At This Level After,
  Continue Numbers Across Stories / from Previous Document in Book. Pro nás
  potvrzuje Kde s textem `{n}`, Znovu od začátku a nápad „pokračovat od
  posledního běhu“.
- **Data Merge** — Multiple Records (rozmístění po řádcích nebo sloupcích),
  rozsah záznamů, Remove Blank Lines For Empty Fields. Illustrator má
  obdobu v panelu Proměnné; nástroj ji nemá kopírovat.

## 10. Otevřené otázky

1. **Nahradí řetěz samostatný skript na najdi/nahraď?** Doporučuji ano:
   Nahradit v řetězci umí totéž a jeden krok jde uložit jako předvolba.
2. **Co je prvek?** Návrh: nejvyšší objekt rozsahu. Co když je celý arch
   jedna skupina se samolepkami uvnitř? Pak by byl prvek jeden. Potřebuji
   vidět strukturu skutečného souboru (vrstvy, skupiny), nebo pravidlo
   „nejnižší skupina, která obsahuje text“.
3. **Podle vrstev: shora (jako panel Vrstvy), nebo odspodu (pořadí
   vzniku)?** Osokin čísluje odspodu. Kopie přes Alt+tah leží nahoře, takže
   pořadí vzniku je odspodu.
4. **Zamčené a skryté:** přeskočit a spočítat (doporučuji), nebo nabídnout
   „Zahrnout skryté“ jako InDesign?
5. **Přetečený text a navázané rámečky:** přeskočit s hláškou (doporučuji
   pro v1)?
6. **Když nesedí Do:** zašednout Použít (prototyp), nebo jen varovat?
   A prvky navíc: jen nahlásit, skrýt, nebo smazat?
7. **Dvě shody v jednom prvku** (vstupenka a ústřižek): stejné číslo oběma
   (doporučuji), nebo jen první?
8. **Formát písmeny (A–Z, AA) ve v1?** Vychází levně a řeší sedadla.
9. **Velikost písmen ve v1?**
10. **Rozlišovat velká a malá v Nahradit**: výchozí zapnuto (prototyp), nebo
    vypnuto jako InDesign Text?
11. **Sloupec „Po vybraném kroku“ v náhledu** (Name Mangler) ve v1?
12. **Kurzor v textu** při spuštění: chovat se jako bez výběru, nebo odmítnout
    jako MakeNumbersSequence? (Neměřeno, §7.7.)
13. **Pracovní název a prefix namespace** (zpráva používá „text-chain“
    jen jako pracovní).

## 11. K zapsání jinam (po rozhodnutí)

- `engine-facts.md`: zápis obsahu ignoruje zámky (§7.3); `contents =` proti
  náhradě úseku (§7.1); `characterOffset` čte od 1, zapisuje od 0; měkký zlom
  jako odstavec; přetečení přes součet řádků; navázané rámečky; regex pasti
  (§7.4); `doc.textFrames` bez zpoždění; výběr celé vnořené skupiny;
  `selectObjectsOnActiveArtboard`; `ListItem.checked`; `stack`.
- Skill `manipulating-illustrator-items`: oddíl o textu zatím chybí.

## 12. Zdroje

Přejmenovávače:

- Transnomino — [web](https://www.transnomino.com/), screenshoty
  [numbering](https://www.transnomino.com/assets/screenshot-numbering.webp),
  [select](https://www.transnomino.com/assets/screenshot-select.webp),
  [all](https://www.transnomino.com/assets/screenshot-all.webp),
  [regex](https://www.transnomino.com/assets/screenshot-regex.webp),
  [trim](https://www.transnomino.com/assets/screenshot-trim.webp),
  [case](https://www.transnomino.com/assets/screenshot-case.webp),
  [conversion lookup](https://www.transnomino.com/assets/screenshot-conversion-lookup.webp)
- ReNamer — [Serialize](https://www.den4b.com/docs/books/renamer/page/serialize-rule),
  [Replace](https://www.den4b.com/docs/books/renamer/page/replace-rule),
  [přehled pravidel](https://www.den4b.com/wiki/ReNamer:Rules)
- Advanced Renamer — [metody](https://www.advancedrenamer.com/user_guide/v4/methods),
  [Renumber](https://www.advancedrenamer.com/user_guide/v4/method_renumber),
  [Replace](https://www.advancedrenamer.com/user_guide/v4/method_replace),
  [Add](https://www.advancedrenamer.com/user_guide/v4/method_add)
- A Better Finder Rename 12 — [manuál](https://www.publicspace.net/ABetterFinderRename/v12/index.html),
  [Sequence numbers](https://www.publicspace.net/ABetterFinderRename/v12/ActionsSequenceNumbers.html),
  [Text](https://www.publicspace.net/ABetterFinderRename/v12/ActionsText.html),
  [Multi-step](https://www.publicspace.net/ABetterFinderRename/v12/MultiStepRename.html),
  [Filters](https://www.publicspace.net/ABetterFinderRename/v12/FilterActions.html)
- Name Mangler — [akce](https://manytricks.com/namemangler/help/renaming.html),
  [multi-step](https://manytricks.com/namemangler/help/multistep.html)
- NameChanger — [web](https://mrrsoftware.com/namechanger/)
- Bulk Rename Utility — [web](https://www.bulkrenameutility.co.uk/),
  fórum: [reset po N](https://www.bulkrenameutility.co.uk/forum/viewtopic.php?p=15864),
  [Numbering(10)](https://www.bulkrenameutility.co.uk/forum/viewtopic.php?p=9513)
- Finder — [Přejmenování souborů](https://support.apple.com/guide/mac-help/rename-files-folders-and-disks-mchlp1144/mac)

InDesign:

- [Volby hledání](https://helpx.adobe.com/indesign/desktop/get-started/settings-and-preferences/search-scope-options.html)
- [Najít a nahradit](https://helpx.adobe.com/indesign/desktop/add-and-manage-text/add-and-import-text/find-replace-text.html)
- [Seznamy](https://helpx.adobe.com/indesign/desktop/format-and-style-text/lists-and-numbering/create-lists.html),
  [restart a pokračování](https://helpx.adobe.com/indesign/desktop/format-and-style-text/lists-and-numbering/restart-or-continue-numbered-lists.html)
- [Data Merge](https://helpx.adobe.com/indesign/desktop/automation-and-scripting/merge-data/merge-data.html)

V repu: `docs/extendscript-engine-facts.md`,
`docs/reports/2026-10-28-pruzkum-inspirace-osokin-sato.md`, skilly
`extendscript-ui-standards` a `building-adobe-ui`, prototyp
`chain-prototype.html` (scratchpad brainstormingu, zmizí asi za tři dny).

## Příloha A — sondy

Před každou sondou samostatné `app.documents.length` (vždy 0), každá sonda
navíc přerušila běh při otevřeném dokumentu. Mutující sondy ve vlastních
dokumentech zavřených bez uložení (`finally`, `DONTDISPLAYALERTS`). Po každé
sondě 0 dokumentů. Žádný dokument se neotevíral, předvolby importu PDF se
proto neukládaly. Skripty sond jsou ve scratchpadu této session (zmizí).

| sonda | co | dokument |
|---|---|---|
| P1 | regex, řetězce, velikost písmen, čísla (§7.4) | žádný |
| P2a–f | zápis a formát T0–T15 (§7.1, §7.2), po prvním zaseknutí rozdělená na šest běhů s logem | vlastní, 800 × 800 pt |
| P3 | zámky, skupiny, masky, symbol, výběr, artboardy, pořadí S1–S7 (§7.3) | vlastní, 600 × 400 pt |
| P4a–c | 200 samolepek, rychlost, jedno Zpět (§7.5); dokument zůstal otevřený mezi 4a a 4c, 4b a 4c ověřily, že jde o dokument sondy (1 dokument, 400 textů) | vlastní, 2000 × 2000 pt |
| P5 | ScriptUI L1–L13, okno nezobrazené, žádný zápis per ani barev (§7.6) | žádný |
| P6 | výběr úseku, zpoždění kolekce, `words`, zvláštní znaky, symbol M1–M6 | vlastní, 600 × 400 pt |
