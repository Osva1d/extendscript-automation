# ExtendScript engine — co bylo změřeno

Naměřeno **2026-09-07** v běžícím Adobe Illustrator **30.8.1** (macOS 26.6.2,
Apple Silicon, `$.locale = cs_CZ`, `$.version = 4.5.6`, engine `main`).

Vzniklo proto, že dvě tvrzení, se kterými se tu pracovalo, měření nevydržela.
Každý řádek níž je `typeof` nebo návratová hodnota z živé aplikace, ne položka
z ES5 kompatibilní tabulky. Přeměřit: `tools/ai-eval.sh -e '<výraz>'`.

Platí zásada z [`decisions.md`](decisions.md): *konvenci vytěženou z kódu je
pořád nutné ověřit proti mechanismu, který ji vyrábí.*

---

## Opravy dřívějších tvrzení

**`Array.prototype.indexOf` v ExtendScriptu NEEXISTUJE.**
Hlavička `zund-summa-marks/tests/test_es3_compliance.js` ho uváděla pod SAFE
jako „ES5 but supported". Změřeno:

```
typeof "abc".indexOf           = function      ← String.indexOf JE
typeof [].indexOf              = undefined
typeof Array.prototype.indexOf = undefined
var a=[1,2,3]; a.indexOf(2)    → THROWS: a.indexOf není funkce
```

Sanity check: `push`, `join`, `sort`, `slice` jsou `function`, engine tedy není
rozbitý. Všechna čtyři místa v kódu, kde se `.indexOf(` volá
(`batch-relink-export/src/ui.js:115,209`, `src/core.js:363,393`), jsou na
**stringu** — živý bug to není. Past to je: rozlišení string/pole nejde udělat
bez typové informace, proto ho hlídá `tools/typecheck.sh`, ne ESLint.

**`$.hiresTimer` je na téhle platformě nepoužitelný.**
Třikrát po sobě týž `$.sleep(1000)`: `31585000`, `25064000`, `23586000`
— ±25 % rozptyl na identické práci. `$.sleep(2000)` vrátil `-943338000`,
tedy přetečení do záporu. Škáluje nelineárně a dokumentované mikrosekundy
nedrží ani řádově.

Použitelná náhrada je `new Date().getTime()`:

| `$.sleep()` | naměřeno |
|---|---|
| 250 ms | 253 ms |
| 500 ms | 506 ms |
| 1000 ms | 1010 ms |
| 2000 ms | 2019 ms |

Lineární, ~1 % režie. `Date.now` je v enginu rovněž přítomné (`function`).

**Engine není pomalý.** Smyčka 200 000 iterací `s += i` = **20 ms**
(~10 M op/s, měřeno přes `Date`). Úzké hrdlo skriptů je DOM, ne JS —
profiling JS kódu tady nic nevyřeší.

---

## Co engine má a nemá

Vše `typeof`, ověřeno jednotlivě.

| chybí (`undefined`) | je (`function`) |
|---|---|
| `[].map` `.forEach` `.filter` `.reduce` | `[].push` `.pop` `.join` `.sort` `.slice` |
| `[].some` `.every` `.indexOf` `.lastIndexOf` | `"".indexOf` `.replace` `.split` `.substring` |
| `"".trim` `.trimRight` `.includes` | `Date.now` |
| `Object.keys` `.create` `.defineProperty` | |
| `Array.isArray` | |
| `Function.prototype.bind` | |
| `JSON` (proto `shared/lib/json2.js`) | |
| `PageItemType` (enum vůbec neexistuje) | |

## Syntaxe

| konstrukce | engine |
|---|---|
| `let x = 1` | **odmítá** — „Bylo očekáváno: ;" |
| arrow `(a) => a` | **odmítá** — „> nemá hodnotu" |
| template literal `` `x` `` | **odmítá** — „Chyba syntaxe" |
| `const x = 1` | **přijímá** (zákaz v conventions.md je styl, ne prevence pádu) |
| `{a: 1,}` trailing comma | **přijímá** |
| `[1, 2,]` trailing comma | **přijímá**, `length === 2` (ne stará IE chyba) |
| `"use strict"` | přijímá |
| `a ? x : b ? y : z` | **přijímá, ale počítá zleva** — viz níž |

Trailing comma je důvod, proč `eslint.config.mjs` parsuje jako `ecmaVersion: 5`
a ne `3`: `grommet-marks/src/illustrator.js:172` jeden má a prokazatelně běží.
ES3 parser by nahlásil chybu, která žádná není.

### Řetězený ternár se vyhodnocuje zleva (naměřeno 2026-09-18, AI 30.8.1)

Specifikace i Node sdružují `a ? x : b ? y : z` zprava, tedy
`a ? x : (b ? y : z)`. Engine ho počítá jako `(a ? x : b) ? y : z`:

| výraz | Node | engine |
|---|---|---|
| `true ? 0 : false ? 2 : 1` | 0 | **1** |
| `true ? "x" : false ? "y" : "z"` | x | **y** |
| `true ? 5 : false ? 2 : 1` | 5 | **2** |
| `false ? 0 : true ? 2 : 1` | 2 | 2 |
| `true ? 0 : (false ? 2 : 1)` | 0 | 0 |
| `true ? false ? 1 : 2 : 3` | 2 | **chyba syntaxe** „Bylo očekáváno: :" |
| `true ? (false ? 1 : 2) : 3` | 2 | 2 |

Liší se to jen tehdy, když je **první** podmínka pravdivá — proto vada přežije,
dokud někdo nezvolí první možnost. Rozepsání na víc řádků nepomůže, závorka
kolem vnořeného ternáru ano, v obou větvích.

Testy v Node to nevidí, protože Node počítá podle specifikace. Tak prošla
`tile-export` N14: dialog otevíral uložené „Půl na každou stranu" jako „Celý na
levý" a „Šířku" jako „Vodítka". Audit parserem přes všechny zdroje našel ještě
`shared/lib/json2.js:66` a `:87` — neškodné, prázdné `[]` a `{}` jen zapíše
s odřádkováním.

**Hlídá to lint:** vlastní pravidlo `engine/no-bare-nested-ternary`
v `eslint.config.mjs` hlásí vnořený ternár bez vlastních závorek. Vestavěné
`no-nested-ternary` by hlásilo i závorkované tvary, které jsou správně
a v `tile-export/src/grid.js` a `shared/lib/ui_state.js` jich je devět.

---

## Chybové hlášky mají dva jazyky

```
engine (null.foo)      : null není objekt          ← lokalizováno
engine (a.indexOf)     : a.indexOf není funkce     ← lokalizováno
DOM (chybějící swatch) : No such element           ← anglicky
DOM (bez dokumentu)    : No such element           ← anglicky
```

Skill `robust-error-handling` matchuje na text chyby. **DOM vzory
(`No such element`, `locked`, `PARM Error`) jsou bezpečné, engine vzory ne** —
na českém systému nesednou.

Vedlejší potvrzení: `[Registration]` na čerstvém dokumentu vyhodí
`No such element`. CMYK fallback není opatrnost navíc, je nutný.

---

## Typings vs. skutečnost

`doc.reflect.properties` na živém 30.8.1: Document má **85** vlastností.
`types-for-adobe/Illustrator/2022` jich zná **77 (91 %)**. Chybí osm:

`assets`, `cloudPath`, `gridRepeatItems`, `isCloudDocument`, `listStyles`,
`radialRepeatItems`, **`scaleFactor`**, `symmetryRepeatItems`

Deklarovaná je jen `scaleFactor` (jediná, kterou tenhle kód používá) —
v `typings/illustrator-augment.d.ts`. Zbylých sedm je tady, aby doplnění
další bylo dohledání, ne nové měření.

---

## Provozní poznámky k mostu

- **Specifier pro `.vscode/launch.json`**: `BridgeTalk.appSpecifier` vrací
  `illustrator-30.064` (`appName = illustrator`, `appVersion = 30.064`).
- **`with timeout` je povinné.** Bez něj padá Apple event na `-1712` už při
  ~7 s práce v Illustratoru a vypadá to jako zamrznutí, ne jako timeout.
- **Neodchycená chyba** dá nenulový exit a hlášku s číslem řádku:
  `Error 2: neexistuje je nedefinovaný.Line: 1->  neexistuje.foo() (5001)`
- **Mutující sondy** patří do dokumentu, který si sonda sama založí. Vzor:

  ```js
  if (app.documents.length !== 0) { "PRERUSENO: otevrene dokumenty"; }
  else {
      var doc = app.documents.add();
      // … měření …
      doc.close(SaveOptions.DONOTSAVECHANGES);
  }
  ```

  Platí i pro sondu, která si otevírá **kopie** dokumentů: jsou-li otevřené
  dokumenty uživatele, přerušit a zeptat se.
- **Globální proměnné přežívají mezi skripty** v jedné relaci Illustratoru
  (naměřeno 2026-09-18): sonda narazila na `TE.UI` z dřívějšího běhu, starší
  než kód na disku. Sonda, která nahrává moduly, musí nahrát všechny a ověřit,
  že v enginu je aktuální kód — třeba hledáním řetězce z poslední změny
  v `String(funkce)`.
- **`$.evalFile` uvnitř funkce vyhodnocuje v rozsahu té funkce** (naměřeno
  2026-09-18): `var` ze souboru zůstane lokální, jen nedeklarované přiřazení
  uteče do globálu. Moduly s `var TE = TE || {}` nahrané z funkce tak skončí
  v lokální proměnné a globální `TE` zůstane, jaký byl. Moduly nahrávat na
  nejvyšší úrovni skriptu.
- **`copy()` je příkaz Illustratoru** (Úpravy → Kopírovat), dostupný jako
  globální funkce. Vlastní `function copy()` ho nepřekryje — volání spustí
  menu příkaz; bez dokumentu skončí „No documents are open". Stejně tak
  `alert` nejde nahradit přes `$.global.alert = …`. Pomocné funkce v sondách
  pojmenovávat jinak než příkazy aplikace.
- **Zavření posledního dokumentu může vrátit `-1712`, i když proběhlo**
  (naměřeno 2026-09-26). Samostatné volání `close(SaveOptions.DONOTSAVECHANGES)`
  bez `DONTDISPLAYALERTS` skončilo timeoutem AppleEventu, dokument se přesto
  zavřel a další volání odpovědělo normálně. Příčina neprokázaná; zavírání
  ve `finally` se `DONTDISPLAYALERTS` proběhlo v tomtéž sezení bez potíží.
  Po timeoutu nejdřív čtecím dotazem zjistit stav, nic dalšího nespouštět.
- **Otevření dokumentu s propojenými PDF přepíše uživateli předvolbu importu PDF**
  (naměřeno 2026-09-27). Sonda, která takové dokumenty otevírá nebo relinkuje,
  si `app.preferences.PDFFileOptions.pageToOpen` a `.pDFCropToBox` uloží na
  začátku a ve `finally` je vrátí. Jinak po ní v Illustratoru zůstane jiná
  výchozí strana a ořez. Podrobnosti v sekci „Relink umístěných PDF a předvolby
  importu".

## Export, artboardy a vodítka (naměřeno 2026-09-13, AI 30.8.1)

### `rasterize(item)` nahradí objekt na místě (naměřeno 2026-09-25)

`doc.rasterize(placedItem, undefined, opts)` vrátí `RasterItem`, který stojí
v pořadí vrstev **tam, kde byl původní objekt**, a je oříznutý na artboard
(grafika přesahující artboard na všech stranách → rastr přesně na artboard).
Co leží nad ním, zůstane nad ním. Proto tile-export rastruje jen grafiku
a linku nechá vektorem navrchu (N19). Sbírat objekty do skupiny smyčkou přes
živou kolekci `pageItems` je naopak past: linka ze skupiny vypadla.

### Odsazená cesta, maska a skryté vrstvy v PDF (naměřeno 2026-09-25)

Ze studie maskování plátu (`docs/reports/2026-09-25-maskovani-platu.md`):

- **Offset objektu s tahem** vrátí po `expandStyle` **skupinu dvou cest**
  (výplň a tah). Pro jednu cestu odsazovat kopii s výplní a bez tahu.
- **Offset otevřené cesty** dá uzavřený obrys kolem čáry, ne plochu.
- **Složená cesta nejde jako maska přes DOM:** `group.clipped = true` hlásí
  „The top item in the group must be a path item", i s `clipping = true`
  na podcestě. `executeMenuCommand("makeMask")` nad výběrem funguje, díra
  zůstane prázdná.
- **Maska na `RasterItem`** funguje. Rastrování maskované skupiny dá rastr přes
  celý artboard, mimo masku bílý.
- **Skrytá vrstva jde do PDF jako vypnutá vrstva (OCG), data zůstanou uvnitř**,
  pokud se nenastaví `acrobatLayers = false`. Nová instance `PDFSaveOptions`
  přitom čte `acrobatLayers` jako `false` — i po nastavení presetu PDF/X-4 —
  takže čtení nic neříká. Nastavovat výslovně; pořadí vůči `pDFPreset` je
  jedno.

### Přečtené `PDFSaveOptions` neodpovídají presetu (naměřeno 2026-09-26)

Po `o.pDFPreset = "pass4press"` čte `bleedOffsetRect` `0,0,0,0`, `trimMarks`
i `registrationMarks` `false` — a uložené PDF přesto má 3 mm spadávky
a ořezové značky (MediaBox o 35,5 pt větší na každé straně, TrimBox na
artboardu). Stejně jako u `acrobatLayers`: vlastnosti po nastavení presetu
nic neříkají o tom, co preset udělá. Ověřovat na uloženém PDF (`pdfinfo -box`).

### Rozlišení rastru od 72 DPI (naměřeno 2026-09-26)

`RasterizeOptions.resolution` pod 72 (71, 50) přijme, ale `rasterize()` pak
vyhodí „Specified value less than minimum allowed value". 72 a víc projde.
Horní mez neměřena — 2400 DPI na malém objektu vyčerpalo časový limit mostu.

### Neexistující PDF preset selže až při uložení (naměřeno 2026-09-25)

`pdfOptions.pDFPreset = "neexistuje"` **nevyhodí**. Chyba přijde až
v `saveAs`: `an Illustrator error occurred: 1129270854 ('FNOC')`. Try/catch
kolem přiřazení tak nic nechytí. Názvy presetů jsou lokalizované
(`[Výchozí Illustratoru]`, ne `[Illustrator Default]`) — anglický název na
české instalaci je „neexistující". A soubor sondy bez BOM, který český název
obsahuje, ho přečte s rozbitou diakritikou a skončí stejně; v sondách psát
`\u00fd` apod.

Vzniklo při návrhu `tile-export`; platí ale mimo něj.

### Illustrator neořezává obsah. Nikdy.

Export výřezu nese **celá** zdrojová data. Artboard mění jen rozměr stránky —
`pdfinfo` na výstupu hlásí správných 500 × 500 pt, ale uvnitř je celá grafika.

| Co | Velikost | Poměr k celku |
|---|---|---|
| zdroj (vektorové PDF) | 74 199 B | — |
| export celé plochy | 43 407 B | 100 % |
| **plát 1/8 plochy, jen artboard** | **43 391 B** | **99,96 %** |
| plát 1/8 + clipping maska (linked) | 44 766 B | 103 % |
| plát 1/8 + clipping maska (embedded) | 43 451 B | 100 % |
| plát 1/8 s „Preserve Editing Capabilities" | 358 966 B | 827 % |
| rastrový zdroj | 51 794 B | — |
| rastrový plát 1/8 | 52 841 B | 102 % |
| rasterizovaný plát **ze zdroje vektorového** | 51 406 B | — |
| rasterizovaný plát **ze zdroje rastrového** | 51 406 B | — |

- **Clipping maska nepomůže** — přidá pár bajtů za masku samotnou.
- **Embedded ani linked** na tom nic nemění.
- `PDFSaveOptions` nemá ekvivalent InDesignového „Crop Image Data to Frames".
- **Rasterizace je jediný únik.** Poslední dva řádky: stejná velikost na bajt
  bez ohledu na zdroj. Velikost pak závisí na ploše a DPI, ne na zdroji.

### `scaleFactor` nejde nastavit a selže tiše

`app.documents.add()` dá dokument se `scaleFactor = 1`. Přiřazení
`doc.scaleFactor = 10` proběhne **bez výjimky** a hodnota zůstane 1.
`DocumentPreset` tu vlastnost nemá vůbec — vlastnosti jsou `title, width,
height, numArtboards, artboardLayout, artboardSpacing, artboardRowsOrCols,
colorMode, units, previewMode, rasterResolution, transparencyGrid,
documentBleedOffset, documentBleedLink`.

**Důsledek:** skriptem vytvořený dokument nikdy není Large Canvas.

### Mez artboardu

Měřeno **vycentrovaně** (plátno je centrované kolem počátku, takže artboard
vedený z počátku narazí mnohem dřív a měření pak měří něco jiného):

| šířka | výsledek |
|---|---|
| 16 200 pt (225 in) | OK |
| 16 300 pt (226 in) | `CoOA` (1095724867) |
| 16 384 pt a výš | `MRAP` (1346458189) |

Mez u Large Canvas neověřena. Spolehlivější než konstanta je `try/catch`
kolem přiřazení `artboardRect` — konstanta zestárne s verzí.

### Vodítka

- **Ručně tažené vodítko JE `pathItem`** s `guides === true`, geometrie
  v `pathPoints[].anchor`.
- **Přesahuje artboard o řády.** Naměřeno: artboard vysoký 1000 pt, vodítko
  od `y = 7691` do `y = −8692`. Filtrovat podle `geometricBounds` **nelze**.
- **Orientace** z bodů: `x₁ = x₂` svislé, `y₁ = y₂` vodorovné.
- **Pozice nejsou celá čísla** — naměřeno 1553,0909 · 962,1818 · 425,8181 pt.
- **Čitelná i na zamčené i na skryté vrstvě** (3 ze 3). Skryté je nutné
  ignorovat: uživatel je nevidí, nemůže podle nich chtít dělit.
- Pořadí v kolekci je stacking order, ne prostorové — řadit podle souřadnice.

### Pathfinder z ExtendScriptu

- Panelové příkazy `Pathfinder Crop`, `Pathfinder Intersect`,
  `Pathfinder Divide` **neexistují** — `executeMenuCommand` vrací
  `yeKB` (1112237433).
- Funguje `group` → `Live Pathfinder Intersect` → `expandStyle`. **Bez
  seskupení se efekt neaplikuje** a tvar zůstane neoříznutý.
- Pathfinder pracuje **s plochami, ne s obrysy** — kontura musí mít po dobu
  operace výplň.
- **Odečítání, ne průnik.** `Live Pathfinder Subtract` ořízne správně jeden
  tvar, compound path **i s dírou**, i víc samostatných tvarů. `Intersect`
  u posledních dvou neořízne vůbec. Zakrývající obdélník musí být navrchu —
  Minus Front odečítá horní objekt od spodního.
- **`compoundPathItems.add()` + `moveToBeginning` NEVYTVOŘÍ compound path.**
  Vznikne plná plocha s kružnicí navrchu, ne díra, a `compoundPathItems.length`
  přesto hlásí 1. Správně je vybrat cesty a zavolat
  `executeMenuCommand("compoundPath")`. Dřívější závěr „Pathfinder rozbíjí
  compound path" byl artefaktem tohohle omylu — čísla vypadala správně
  (`rightmost` sedělo), ale vizuální kontrola ukázala, že díra tam nikdy
  nebyla. **U geometrických operací kontroluj výsledek očima, ne jen čísly.**

### Odsazená cesta s parametrem — jedině přes `applyEffect()`

`executeMenuCommand("Live Offset Path")` **existuje, ale hodnotu předat neumí** —
aplikuje se s nulou a geometrie se nezmění. Panelový `Offset Path` neexistuje
(`yeKB`).

Parametrizovaně to jde přes Live Effect XML:

```js
item.applyEffect('<LiveEffect name="Adobe Offset Path">'
               + '<Dict data="R mlim 10 R ofst ' + offsetPt + ' I jntp 0 "/>'
               + '</LiveEffect>');
app.executeMenuCommand("expandStyle");   // efekt -> skutečná geometrie
```

**Mapování `jntp` naměřeno na šesticípé hvězdě, offset 5 mm (14,17 pt):**

| `jntp` | roh | rozšíření bounds |
|---|---|---|
| **0** | zaoblený | **14,17 pt — přesně zadaná hodnota** |
| 1 | uříznutý | 10,90 pt (ubírá) |
| 2 | prodloužená špička | 35,48 pt (přidává) |

Kontrola na kruhu (bez rohů) dala 14,17 pt při každém nastavení — matematika
offsetu je správná, liší se jen chování v rozích. **Pro ořezovou konturu
`jntp 0`.**

### Pozor na menu příkazy s dialogem

`executeMenuCommand("Expand3")` otevře modální okno `Objekt ▸ Rozdělit…`.
V sondě přes `ai-eval.sh` to **zablokuje Illustrator**, AppleScript most spadne
na `-609 („Propojení je neplatné")` a neuložené dokumenty se ztratí. Naměřeno
tvrdě, ztrátou dokumentu.

Před testováním neznámého menu příkazu si ověř, že nevyvolává dialog.

### ScriptUI: skrytá skupina si drží místo

`group.visible = false` **nezmenší dialog** — layout manager pro ni prostor
rezervuje dál. Nepomůže ani `group.maximumSize.height = 0`. Naměřeno na dialogu
`tile-export`: přepnutí obou vlastností pohnulo výškou okna o **0 px**.

Důsledek: dynamickou viditelnost nelze použít jako nástroj na výšku dialogu.
Výšku musí vyřešit rozložení (sloupce, zkrácení polí). `visible` má smysl jen
na to, aby nerušil obsah, který právě neplatí.

### Spot barva a artboardy

- `doc.spots.add()` + `colorType = ColorModel.SPOT` + `SpotColor.spot`
  vytvoří použitelnou přímou barvu; `strokeColor.typename` je pak `SpotColor`.
- `doc.artboards.add([left, top, right, bottom])` přijme rect se **záporným**
  spodkem. `MRAP` znamená špatné pořadí nebo příliš velký rect.
- **`documents.add(space, w, h)` položí artboard na `[0, h, w, 0]`**, tedy od
  `y = h` dolů k nule — ne od nuly do záporna. Kód, který kreslí dolů od
  počátku, tak míří **pod** artboard a export vyjde prázdný. Naměřeno:
  `documents.add(CMYK, 600, 400)` → `[0, 400, 600, 0]`. Po `documents.add()`
  proto vždy `artboardRect` nastav explicitně.
- **`duplicate()` napříč dokumenty** zachová přímou barvu, nevytvoří duplicitní
  swatche a kopie přežije zavření zdroje. Pozici ale drží **vůči středu
  artboardu**, ne absolutně: kontura na `x = 44…815` se v dokumentu s poloviční
  šířkou objevila na `−168…603`, tedy o 212,5 pt jinde — přesně rozdíl středů.
  Při shodných artboardech je posun nulový. **Offset měř, nepředpovídej.**
- Výchozí artboard se v české lokalizaci jmenuje **„Kreslicí plátno 1"** —
  detekce vlastních artboardů podle prefixu je proto jazykově nezávislá,
  detekce podle výchozího jména by nebyla.

### Tah je vždy na střed cesty a zarovnání není v DOM

Panel Tah nabízí zarovnání dovnitř / na střed / ven, ale **PathItem tu vlastnost
nemá**. Naměřeno (Illustrator 30.8.1): `"strokeAlignment" in pathItem` → `false`,
`typeof pathItem.strokeAlignment` → `"undefined"`.

Tah tedy vždy přesahuje **půl své šířky na každou stranu** cesty. Naměřeno na
obdélníku s `geometricBounds` `10,80,60,30` a tahem 10 pt: `visibleBounds` jsou
`5,85,65,25`, tedy 5 pt ven po celém obvodu.

Důsledek: když má vnější hrana tahu ležet na konkrétním obdélníku, musí se
**cesta nakreslit zmenšená o půl tahu** na každé straně. Tak to do 2026-09-18
dělal `TE.Draw.drawTileLine` (naměřená odchylka vnější hrany od cíle 0 pt při
1:1 i 1:10, pro 0,3 i 3 pt). Od tile-export N13 jde opačně: cesta leží přímo
na hraně stránky a tah je dvojnásobný, protože vnější polovinu ořízne stránka.
V PDF to Illustrator navíc sám obalí ořezovou cestou artboardu (`re W n`).

### Strop nastavení velikosti a jak ho obejít

Nastavovač `pageItem.width` (a `.height`) odmítne hodnotu nad **16 347,7 pt
(≈ 5767 mm)** hláškou `Specified value greater than maximum allowed value` —
změřeno půlením intervalu, platí pro cestu i umístěné PDF a **nezávisí na poloze**
objektu. Je to strop nastavovače, ne velikosti objektu: `pageItem.resize(%, %)`
tentýž objekt zvětší bez chyby a okamžitě — změřeno až do **200 000 pt (70 m)**,
mez nenalezena — a dokument se pak normálně uloží jako PDF (ověřeno vykreslením
při 18 433 pt a v produkčním exportu s grafikou 6,5 m).

`doc.rasterize(skupina, undefined, volby)` v dočasném dokumentu, kde umístěná
grafika přesahuje artboard, vytvořila obraz přesně o rozměru artboardu:
11 930 × 5 906 px pro plát 2020 × 1000 mm při 150 dpi. Přesah se nerasterizuje.

**Maskovaná skupina hlásí šířku celého obsahu, ne masky.** Skupina s ořezovou
cestou 293 pt kolem umístěného PDF o šířce 879 pt má `width = 879`. Nastavení
`group.width` proto zvětšuje podle obsahu: `group.width = 6153` dá obsah 6153 pt
a masku jen 2051 pt, ne zamýšlených 6153. Kdo chce masku dostat na přesný rozměr,
musí počítat poměr z masky sám a zvětšovat přes `resize()`.

### Large Canvas jde založit skriptem

`app.documents.add(DocumentColorSpace.CMYK, w, h)` s rozměrem nad strop běžného
plátna (16 383 pt ≈ 5779 mm) založí **Large Canvas s `scaleFactor` 10** — bez
dialogu, za ~0,3 s. Změřeno na 6000 × 1000 mm: artboard vnitřně 600 × 100 mm.

Dřívější sonda, která navíc zkoušela `app.documents.addDocument("Print",
DocumentPreset)`, vypršela na časový limit a nechala **oba** dokumenty otevřené;
příčina nezjištěná. V sondách proto jen `documents.add()`, s úklidem ve `finally`
a s `app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS`.

## Undo, kolekce, skryté vrstvy a masky (naměřeno 2026-09-26, AI 30.8.1)

Zdroj: code review zund-summa-marks
([`reports/2026-09-26-code-review-zund-summa-marks.md`](reports/2026-09-26-code-review-zund-summa-marks.md)).
Vše běželo přes `tools/ai-eval.sh`, tedy AppleScript `do javascript`, ve
vlastních dočasných dokumentech. **Běh přes Soubor › Skripty neměřen** — u undo
se to může lišit.

### `app.redraw()` dělí historii Zpět

Skript vytvořil šest cest ve třech dvojicích a mezi dvojice vložil
`app.redraw()`. Každé Zpět jako samostatné volání mostu: **6 → 4 → 2 → 0** cest.
Kontrola: čtyři cesty bez redraw, jedno Zpět → 0. Skript bez redraw je tedy
jeden krok a každé `app.redraw()` krok uzavře.

Skutečný běh zund-summa-marks (SUMMA s mapováním a ořezovými linkami) = 3 kroky
Zpět.

### Změnu artboardu spolu s jinými změnami Zpět nevrátí

| obsah skriptu | Zpět #1 | Zpět #2 |
|---|---|---|
| jen `artboardRect` | artboard zpět | předchozí akce |
| `artboardRect` + nová vrstva + cesta | vrstva a cesta zpět, **artboard ne** | předchozí akce zpět, **artboard ne** |
| `rulerOrigin` + `artboardRect` + vrstva + cesta | vrstva a cesta zpět, **artboard ne** | — |
| vrstva + cesta · `redraw` · `artboardRect` · `redraw` · cesta | cesta zpět | **artboard zpět** |

V běhu zund-summa-marks vrátily tři kroky Zpět vrstvy i cesty a artboard zůstal
zvětšený. Čtvrtý krok ho vrátil — spolu s akcí provedenou **před** spuštěním
skriptu. Chování tedy není ani stálé: jednou se artboard vrátil s předchozím
krokem, jindy ani tak.

**Důsledek:** změna artboardu patří do vlastního kroku, tedy mezi dvě
`app.redraw()` (poslední řádek tabulky).

### Kolekce na úrovni dokumentu se aktualizují až po `app.redraw()`

Uvnitř jednoho skriptu:

```
doc.pathItems.length    0 → (2 nové cesty) 0 → redraw → 2 → (2 další) 2 → redraw → 4
layer.pathItems.length  po 2 nových cestách hned 2
doc.layers.length       po add() hned 2, po remove() hned 1
```

Skript, který vytvořil šest cest se dvěma redraw, vrátil `doc.pathItems.length`
4. Samostatné čtení hned potom vrátilo 6. Kdo po změně ve stejném skriptu počítá
nebo prochází `doc.pathItems`, potřebuje předtím `app.redraw()` — nebo kolekci
vrstvy, ta je aktuální. Nejspíš proto nástroje volají redraw jako „commit".
Cena je, že každý takový redraw přidá krok Zpět.

### Skrytá vrstva je pro zápis zamčená

| operace | výsledek |
|---|---|
| nová cesta ve skryté vrstvě | „Cannot modify a layer that is locked" |
| nová podvrstva ve skryté vrstvě | projde |
| nová cesta v podvrstvě skryté vrstvy | „Cannot modify a layer that is locked" |
| `move()` do skryté vrstvy | „Cannot modify a layer that is locked" |
| `move()` do zamčené vrstvy | „Cannot modify a layer that is locked" |
| `move()` ze skryté vrstvy | „Target layer cannot be modified" |
| `move()` ze zamčené podvrstvy (nadřazená vrstva odemčená) | „Target layer cannot be modified" |
| `move()` objektu s vlastním `locked = true` | projde, zámek zůstane |
| `move()` objektu s vlastním `hidden = true` | projde, objekt zůstane skrytý |
| `move()` cesty z ořezové skupiny ven | projde |
| `remove()` podvrstvy uvnitř skryté vrstvy (podvrstva sama viditelná) | projde |

Hlášky klamou dvakrát. Skrytá vrstva se hlásí jako „locked" a u přesunu ze
zdrojové vrstvy mluví hláška o cíli. Kdo do vrstvy zapisuje, musí ji nejdřív
**zviditelnit i odemknout**, jinak zápis selže. Když selhání spolkne tichý catch,
nezůstane po něm stopa (zund-summa-marks K12: žádné značky, žádná hláška).

### Přímí potomci, nebo všechno

- `layer.pageItems`, `layer.pathItems` i `group.pageItems` vracejí **jen přímé
  potomky**. Změřeno na vrstvě se skupinou (3 cesty + vnořená skupina se 2),
  podvrstvou (2 cesty) a jednou volnou cestou:

  | kolekce | délka |
  |---|---|
  | `layer.pageItems` | 2 |
  | `layer.pathItems` | 1 |
  | `group.pageItems` | 4 |

- `doc.pathItems` vrací **všechno**: cesty vnořené ve skupinách i v ořezových
  maskách, ve skrytých vrstvách, v zamčených podvrstvách i skryté objekty
  (15 z 15).
- `doc.layers.add()` vkládá novou vrstvu na **index 0** (nahoru).
- DOM objekty jde porovnat přes `===`. `item.parent === layer`,
  `doc.layers[0] === doc.layers[0]` i `layer.layers[0] === podvrstva` vrátí `true`.

### Registrace v české lokalizaci a `remove()` bez účinku

Swatch registrace je `swatches[1]` s názvem **`[Registrační]`**
(`spot.colorType === ColorModel.REGISTRATION`). Stejný název vrací i
`strokeColor.spot.name` cesty v registrační barvě. Že
`getByName("[Registration]")` hází `No such element`, je výš v „Chybové hlášky
mají dva jazyky".

`remove()` na registraci — přes `swatches[1]`, přes `getByName` i přes spot
v `doc.spots` — projde **bez chyby a bez účinku**, seznam swatchů zůstane beze
změny. Skript registraci smazat nemůže. Jestli jde smazat v UI, neověřeno.

### Ořezová cesta nemusí být `pageItems[0]`

`item.move(clipGroup, ElementPlacement.PLACEATBEGINNING)` vloží běžný objekt
**nad** ořezovou cestu. `pageItems[0]` je pak on (`clipping === false`),
`clipped` zůstane `true` a Illustrator dál ořezává původní cestou (vykresleno:
vidět je jen okno 20 mm). `group.visibleBounds` ale hlásí 60 mm, tedy rozměr
vloženého objektu. Masku hledat přes `clipping === true`, ne podle indexu.

Skupina, kde má `clipping = true` spodní cesta, po `group.clipped = true` udělá
ořezovou cestou tu **horní**, která ztratí barvu. Spodní hlásí `clipping === true`,
ale vykreslí se jako běžný obsah.

Viz i „Maskovaná skupina hlásí šířku celého obsahu" výš.

### `pageItem.note`

Existuje (`typeof` vrací `string`) a jde zapsat i přečíst. Hodí se jako značka
objektů, které vytvořil skript: mazat pak jde jen je, ne celou vrstvu podle
jména.

## Styl nových cest, Large Canvas a geometrie cest (naměřeno 2026-09-26, AI 30.8.1)

Zdroj: code review grommet-marks
([`reports/2026-09-26-code-review-grommet-marks.md`](reports/2026-09-26-code-review-grommet-marks.md)).
Stejný kontext jako předchozí sekce: `tools/ai-eval.sh`, vlastní dočasné
dokumenty, **běh přes Soubor › Skripty neměřen**. Moduly grommet-marks se
nahrály přes `$.evalFile` do funkce, která si předtím založila lokální
`var GM = {}`. Celý kód tak běžel nad lokálním `GM` a v enginu žádný globál
nezůstal (viz „`$.evalFile` uvnitř funkce" výš).

### Nová cesta dědí výchozí styl tahu — a výběr ho mění

Cesta vytvořená skriptem (`pathItems.add()`, `pathItems.ellipse()`) přebírá
`strokeDashes`, `strokeCap` a `strokeJoin` z výchozího stylu dokumentu
(`doc.defaultStrokeDashes`, `defaultStrokeCap`, `defaultStrokeJoin`). Barvu,
šířku a přetisk skripty obvykle nastaví, tyhle tři ne — a zdědí je. Změřeno na
značce grommet-marks: po nastavení výchozího stylu na `[6,3]`, kulaté konce
a zkosené spoje mělo totéž všech šest cest značky.

Výchozí styl se mění výběrem:

| krok | `doc.defaultStrokeDashes` | `doc.defaultStrokeCap` |
|---|---|---|
| nový dokument | `[]` | BUTTENDCAP |
| vytvořit cestu `[8,4]` s kulatými konci, nic nevybráno | `[]` | nečteno |
| `cesta.selected = true` | `[8,4]` | ROUNDENDCAP |

Značky vytvořené potom (režim „Vybraná cesta") byly čárkované — registrační
kruh i bílé halo; PDF vykreslené a prohlédnuté. Výběr myší a stav po zrušení
výběru neměřen, dědění `opacity` a `blendingMode` taky ne.

**Důsledek:** cesta ze skriptu, na jejímž vzhledu záleží, si musí
`strokeDashes = []`, `strokeCap` a `strokeJoin` nastavit výslovně.

### Large Canvas: všechno v bodech ×`scaleFactor`, PDF s `/UserUnit`

Stejná značka ve fyzicky stejném artboardu 300 × 300 mm — v normálním
dokumentu a v dokumentu se `scaleFactor` 10 (založen jako 6000 × 1000 mm, pak
`artboardRect` zmenšen na vnitřních 30 × 30 mm). PDF obou vykreslená vedle
sebe a prohlédnutá:

| zapsáno | normální | Large Canvas |
|---|---|---|
| průměr 8,5 pt (3 mm) | 3 mm | 30 mm |
| střed 7 mm od rohu, v bodech | 7 mm | 70 mm |
| tahy 1 a 3 pt | 1 a 3 pt | 10 a 30 pt |

Každá hodnota v bodech, kterou skript zapíše — pozice, rozměr i `strokeWidth` —
je fyzicky `scaleFactor`krát větší. Fyzické míry se musí dělit
`doc.scaleFactor`; `zund-summa-marks` a `tile-export` to dělají, grommet-marks
ne (review G1).

PDF uložené z takového dokumentu má MediaBox ve vnitřních jednotkách
(85,04 pt) a `/UserUnit 10.0`. `pdfinfo` hlásí nezvětšenou velikost 85 × 85 pt;
fyzickou velikost prozradí až `/UserUnit` (`grep -a /UserUnit soubor.pdf`).
`pdftoppm -scale-to` stránku vykreslí správně, takže normální a Large Canvas
výstup jde porovnat vedle sebe.

### Geometrie cest

- `setEntirePath()` s posledním bodem shodným s prvním a `closed = true` nechá
  **5** `pathPoints` — Illustrator bod nesloučí. Segment nulové délky má
  nulovou tečnu a detekce rohů podle odchylky tečen ten roh nevidí
  (grommet-marks G6: 3 rohy ze 4).
- `pathItems.rectangle()` = 4 body. `pathItems.roundedRectangle()` = 8 bodů,
  rohy jsou hladké oblouky (detekce rohů jich najde 0) a první kotva leží na
  levé hraně na začátku levého dolního oblouku (200 × 100 mm, R 20: 80 mm od
  horní hrany).

### Rychlost a undo při tvorbě značek

- Skupina + 2 cesty (kruh s halem) **0,1 ms**, skupina + 6 cest (kruh a kříž
  s halem) **0,2 ms**; 200 kusů za sebou, bez `app.redraw()`. Tisíce objektů
  jsou otázka sekund.
- Odemknout vrstvu, vytvořit 8 značek, vrstvu zamknout, `app.redraw()` na konci:
  **jedno Zpět** vrátí značky i zámek. `app.redraw()` na úplném konci skriptu
  tedy prázdný krok nepřidá.

### Drobnosti

- `doc.layers.getByName()` hledá jen vrstvy nejvyšší úrovně; podvrstvu stejného
  jména nenajde a vyhodí výjimku.
- `app.coordinateSystem` přepnutý na ARTBOARD v jednom volání mostu byl
  v dalším volání zase DOCUMENT (bez otevřeného dokumentu). Že by nastavení
  přežívalo mezi skripty, se neprojevilo; s otevřeným dokumentem a přes
  Soubor › Skripty neměřeno.
- ScriptUI: `edittext.text = null` zobrazí text „null", `undefined` text
  „undefined", bez výjimky. `parseFloat` z nich dá `NaN`.

## Relink umístěných PDF a předvolby importu (naměřeno 2026-09-27, AI 30.8.2)

Zdroj: code review batch-relink-export
([`reports/2026-09-27-code-review-batch-relink-export.md`](reports/2026-09-27-code-review-batch-relink-export.md)).
Stejný kontext jako předchozí sekce: `tools/ai-eval.sh`, vlastní dokumenty,
**běh přes Soubor › Skripty neměřen**. Illustrator mezitím povýšil na 30.8.2.

Testovací data: vícestránková PDF 100 × 70 mm s ořezovými značkami (MediaBox je
větší než TrimBox), každá strana jiné barvy a s vlastním číslem. Šablona má čtyři
pozice umístěné skriptem s ořezem TrimBox a stranami 1–4, dvě z nich v ořezové
masce. Výstupy jsou vyrenderované a prohlédnuté.

### `PlacedItem.pageNumber` neexistuje

`"pageNumber" in item` vrací `false` a `item.reflect.properties` ji nemá — ani
u pozic, které skript umístil s `PDFFileOptions.pageToOpen` 2–4. Kterou stranu PDF
pozice ukazuje, ze skriptu zjistit nejde. Úplný seznam vlastností `PlacedItem`:

```
file matrix boundingBox contentVariable typename uRL note layer locked hidden
selected position width height geometricBounds visibleBounds controlBounds name
uuid blendingMode opacity isIsolated artworkKnockout zOrderPosition
absoluteZOrderPosition editable sliced top left visibilityVariable tags
pixelAligned wrapped wrapOffset wrapInside parent
```

Typings ji nemají taky. `tools/typecheck.sh` ji nahlásí, jen když má proměnná typ.

### `relink()` zachová stranu i ořez pozice

| relink na | výsledek |
|---|---|
| PDF stejného formátu | každá pozice ukáže svou stranu, rozměr beze změny |
| totéž, `pageToOpen = 2` a `pDFCropToBox = PDFMEDIABOX` nastavené těsně před relinkem | beze změny — předvolby relink neovlivní |
| PDF s méně stranami (2 místo 4) | pozice pro chybějící strany ukážou **stranu 1**, bez chyby |
| PDF jiného formátu (TrimBox 110 × 60 mm) | pozice 107,16 × 58,45 mm, střed zachován, bez chyby |
| PDF 106 × 76 mm bez TrimBoxu (spadávka v ploše stránky) | 99,20 × 71,13 mm, spadávka uvnitř pozice, bez chyby |

Obě změny rozměru sedí na 0,01 mm s tímto popisem: Illustrator ponechá typ ořezu
(bez TrimBoxu tedy celou stránku) i střed pozice a novou stranu přeškáluje tak,
aby zůstala úhlopříčka pozice. Poměr stran nové strany zůstane přesný. Kdo po
relinku potřebuje jistotu rozměru, porovná `geometricBounds` před a po.

### Chybějící soubor, zámky a odebrání

| operace | výsledek |
|---|---|
| `item.file`, když propojený soubor chybí | hází „There is no file associated with this item" |
| `item.relink()` na takové pozici | projde, strana zachována |
| relink v zamčené vrstvě nejvyšší úrovně | „Target layer cannot be modified" |
| relink v zamčené podvrstvě (nadřazená vrstva odemčená) | „Target layer cannot be modified" |
| relink ve skryté vrstvě | „Target layer cannot be modified" |
| relink objektu s vlastním `locked = true` | projde, zámek zůstane |
| relink uvnitř zamčené ořezové skupiny | projde |
| `remove()` na PlacedItem, který je obsahem ořezové masky | projde; skupina s ořezovou cestou zůstane |
| `doc.placedItems` | všech 5 pozic včetně skryté vrstvy, zamčené podvrstvy a ořezové masky |
| `saveAs` do existujícího PDF (`DONTDISPLAYALERTS`) | přepíše bez dotazu |

Pořadí `doc.placedItems` po otevření neodpovídá pořadí vytvoření. Mezi sedmi
otevřeními téhož souboru bylo stejné; obecně to prokázané není.

### Otevření dokumentu i relink přepisují předvolbu importu PDF

`app.preferences.PDFFileOptions` je globální předvolba pro Otevřít a Umístit PDF.

| krok | `pageToOpen` | `pDFCropToBox` |
|---|---|---|
| nastaveno | 1 | PDFBOUNDINGBOX |
| `app.open()` šablony s propojenými PDF | 3 | PDFTRIMBOX |
| relink čtyř pozic se stranami 3, 2, 4, 1 | 3 → 2 → 4 → 1 | PDFTRIMBOX |
| `saveAs` do PDF, `close()` | beze změny | beze změny |

Po skriptu tedy zůstane taková, jakou měl poslední načtený link. Jestli to ovlivní
i Umístit s dialogem možností importu, neměřeno. Vlastnost se jmenuje
`pDFCropToBox`; `pDFCropBounds` neexistuje a čte se bez chyby jako `undefined`.

### Drobnosti

- `new Folder("")` i `new File("")` mají `fsName` `/tmp00000001` a
  `exists === false`. `Folder.current` je `/`.
- `app.system` neexistuje (`typeof` → `undefined`). Shell ze skriptu spustit nejde.
- Binární čtení (`encoding = "binary"`, `read()`) 8 MB souboru trvá 17 ms. Dva
  průchody `indexOf` + `charAt` přes takový řetězec 25 ms.
- S presetem `[Tisková kvalita]` nemá PDF dokumentu se skrytou vrstvou
  `/OCProperties`. Jiné presety neměřeny; srovnej „Skrytá vrstva jde do PDF jako
  vypnutá vrstva" výš.
- Názvy PDF presetů v české instalaci, v pořadí `app.PDFPresetsList`:
  `[Výchozí Illustratoru]`, `[Kvalitní tisk]`, `[Nejmenší velikost souboru]`,
  `[Nejmenší velikost souboru (PDF 1.6)]`, `[PDF/X-1a:2001]`, `[PDF/X-3:2002]`,
  `[PDF/X-4:2008]`, `[Tisková kvalita]`. Podle pořadí odpovídají anglickým
  High Quality Print (druhý) a Press Quality (poslední); EN instalace neměřena.


---

## Kódování zdroje a živé kolekce (naměřeno 2026-09-27, AI 30.8.2)

Zdroj: úklid dokumentace. Kódování přes `$.evalFile` a přes AppleScript
`do javascript` se souborem, kolekce přes `tools/ai-eval.sh` ve vlastním
dočasném dokumentu. Locale `cs_CZ`.

### Čeština se přečte i bez BOM

Soubor s řádkem `var s = "čřž";`, jednou jako UTF-8 s BOM, jednou bez něj.
Výsledek je délka řetězce a kódy prvních dvou znaků (`č` = 269, `ř` = 345):

| načtení | s BOM | bez BOM |
|---|---|---|
| `$.evalFile(file)` | `3:269:345` | `3:269:345` |
| `do javascript (POSIX file …)` | `3:269:345` | `3:269:345` |

Komentáře v `tools/build.sh` u GM, ZSM a tile-exportu tvrdily, že BOM je pro
Illustrator nutný, a totéž psala `zund-summa-marks/docs/architecture.md`.
V AI 30.8.2 to neplatí. Zdrojové soubory v `src/` BOM nemají, dist ho dostane
od buildu. Běh z menu Soubor › Skripty a starší verze (skripty cílí na CC 2020+)
změřené nejsou, proto BOM v distu zůstává jako pojistka.

### Dopředná smyčka nad živou kolekcí přeskakuje

Čtyři cesty ve vrstvě a smyčka
`for (i = 0; i < src.pathItems.length; i++) src.pathItems[i].move(dst, …)`:
přesunuly se **2 ze 4**. Kolekce se po každém `move` přečísluje a index přeskočí
následující prvek. Zbylé dvě cesty, zkopírované předem do pole, se přesunuly
obě. Kolekce na úrovni dokumentu se navíc aktualizují až po `app.redraw()`
(viz „Kolekce na úrovni dokumentu…" výš).

## Velká pole a řetězce s NUL (naměřeno 2026-09-28, AI 30.8.2)

Zdroj: opravy z review batch-relink-export — dekodér Flate pro počet stran PDF
(`batch-relink-export/src/pdf.js`, nález B3). Kontext: `tools/ai-eval.sh`, bez
dokumentu.

### Velká pole zpomalují kvadraticky

Čas v ms pro n zápisů nebo čtení:

| operace | n = 10 000 | n = 40 000 |
|---|---|---|
| `a.push(x)` | 96 | 1 582 |
| `a[i] = x` do rostoucího pole | 37 | 1 232 |
| `a[i] = x` do `new Array(n)` | 34 | 641 |
| `a[i & 32767] = x` do pole 32 768 prvků | 40 | 908 |
| `s += znak` | 10 | 147 |
| pole jednoznakových řetězců, `join("")` | 186 | 3 437 |
| bloky po 4 096 znacích, každý `join("")` | 80 | 253 |
| `s.charCodeAt(i)` | 10 | 42 |

Čtyřikrát víc prvků stojí u pole šestnáctkrát víc času. Zpomaluje i předem
alokované pole a pole pevné velikosti, takže cena roste s velikostí pole, ne
s počtem zápisů. Lineárně se chovají jen malá pole spojovaná do řetězců
a `charCodeAt`. `String.fromCharCode.apply(null, pole)` se 4 096 prvky funguje,
ale jedno volání trvá ~84 ms.

V praxi: první dekodér držel výstup jako jedno pole čísel a 102 kB textu
rozbaloval **147 s** — Illustrator mezitím nereagoval. S výstupem v blocích po
4 096 znacích a oknem zpětných odkazů jako řetězcem totéž trvá 0,75 s. V cyklech
přes tisíce prvků drž pole do ~4 096 položek a výsledek skládej po blocích.

### `charAt` vrací pro znak NUL prázdný řetězec

```
var s = "a" + String.fromCharCode(0) + "b";
s.length             → 3
s.charCodeAt(1)      → 0
s.charAt(1).length   → 0      ← "" místo znaku NUL
```

Spojování řetězců, `join`, `substring` i `String.fromCharCode` NUL zachovají.
Binární data z `File.read()` (kódování `BINARY`) nuly obsahují — bajty z nich
ber přes `charCodeAt` a tabulku jednoznakových řetězců, nikdy přes `charAt`.
Dekodér, který bral bajty přes `charAt`, ztratil přesně nulové bajty: z 20 000
náhodných bajtů vrátil 19 925.
