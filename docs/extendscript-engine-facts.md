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
