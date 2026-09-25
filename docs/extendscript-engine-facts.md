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

