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

Trailing comma je důvod, proč `eslint.config.mjs` parsuje jako `ecmaVersion: 5`
a ne `3`: `grommet-marks/src/illustrator.js:172` jeden má a prokazatelně běží.
ES3 parser by nahlásil chybu, která žádná není.

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

## Export, artboardy a vodítka (naměřeno 2026-09-13, AI 30.8.1)

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
