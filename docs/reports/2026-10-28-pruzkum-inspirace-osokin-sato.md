# Průzkum cizích skriptů — Osokin a Sato

Datum: 2026-10-28. Rozsah: `docs/inspiration/` (lokální, vyloučené přes
`.git/info/exclude`) — sbírka Sergeye Osokina `illustrator-scripts-master`
a archiv Hiroyuki Sata `Shanfan-Illustrator-Scripts-Archive-418b0e0`.
Otázka: najdou se tam vzory nebo řešení, které jsou lepší než naše?

Kód nástrojů se neměnil. V Illustratoru 30.8.2 proběhly tři sondy, každá ve
vlastních dokumentech a jen bez otevřeného dokumentu uživatele (příloha A).

## 1. Verdikt

Většina sbírky je slabší než naše řešení: nastavení přes `eval`, parser čísel,
který z překlepu udělá jiné číslo, tichý `catch` kolem celého skriptu, kód
kopírovaný z jednoho skriptu do druhého, žádné testy. Ve **čtyřech bodech**
je ale lepší nebo nás upozorňuje na chybu:

| # | Co | Kde u nás | Stav |
|---|---|---|---|
| I1 | Poloha plátna jedním čtením místo bisekce | TE `TE.Check.canvasBounds` | **naměřeno** — shoda na bod, 1–4 ms místo 42–50 ms |
| I2 | Maska z compound path se hledá přes `pathItems[0].clipping` | skill `manipulating-illustrator-items` §3 | **naměřeno** — náš vzor u takové masky vrací rozměr celého obsahu |
| I3 | Ořezová cesta se hledá podle `clipping`, ne podle indexu | ZSM `bounds.js:255` | rozpor s naším vlastním měřením v `engine-facts.md` |
| I4 | Šipky ↑/↓ v číselném poli (Shift ×10) | kánon §12.3, všechna číselná pole | nápad, neměřeno |

Další čtyři jsou nápady nebo rezerva do budoucna (I5–I8). Geometrie Sata je
přesnější než naše vzorkování v GM, rozdíl je ale pro průchodky
zanedbatelný (§5).

## 2. Co ve složce je

**Osokin** (`creold/illustrator-scripts`): 101 `.jsx`, 13 popisů v `md/`
(EN a RU), dva `.zip` (`OffsetObjects`, `ToggleTextStyles`, neotevřené).
Hlavička „Released under the MIT license“, testováno v „CC 2019–2025
(Mac/Win)“, poslední úpravy až z července 2026. Aktivně udržovaná sbírka.
`BeautifySwatchNames.jsx` má 32 676 řádků, většinou slovník názvů barev,
neanalyzováno.

**Sato** (shspage): 25 `.jsx` z let 2004–2011, „tested with Illustrator
CS3/CS5, Windows“. Bez dialogů (vstup přes `prompt()`), čistá geometrie
Bézierových křivek. Licence jen „Free to use and distribute.“ v
`_doc/readme.html`.

**Metoda.** Celé jsem přečetl `FitArtboardsToArtwork`, preview, ukládání
a klávesy v `ResizeToSize`, preview, stepper, `isCorrectEnv` a `evalMath`
v `DrawPolyline` (nejnovější, 2026-07), plátno v `MoveArtboards`
a `DuplicateArtboardsLight`, `getVisibleBounds` v `AlignToArtboards`,
`getBleed` a `maskArtboard` v `MaskArtboards`, `FileVersionInformer`,
`TrimMasks` a od Sata `Path Length` a `Divide (length)`. Zbytek sbírky
prošel strojovým skenem 25 vzorů (nastavení, lokalizace, undo, `scaleFactor`,
meze, jednotky, menu příkazy, klávesy, předvolby, XMP…) přes všech 101
skriptů a výpisem funkcí u skriptů, které se tématem dotýkají našich
nástrojů. Asi 85 skriptů jsem tedy znám jen z výpisu, ne z čtení.

## 3. Nálezy

### I1 — TE: plátno z prázdné cesty místo bisekce (naměřeno)

`TE.Check.canvasBounds` hledá okraje plátna bisekcí — kolem stovky
zkušebních `artboards.add()` a `remove()`. Osokin
(`MoveArtboards.jsx:365`, „Thanks to @moodyallen“) použije prázdnou cestu:
`doc.pathItems.add().position` leží v rohu plátna.

Naměřeno (příloha A1): **`position` prázdné cesty je přesně pravý dolní
roh plátna** `[r, b]`. Osokinův přepočet přes `delta` a obdélník 300 × 300 je
zbytečná oklika, stačí:

```
r = p[0];  b = p[1];  l = r - 16383;  t = b + 16383;
```

| dokument | prázdná cesta | bisekce TE | čas trik / bisekce |
|---|---|---|---|
| 600 × 300 mm | `[9042, −7766,6]` | r 9042, b −7766,6, l −7341, t 8616,4 | 4 / 50 ms |
| A4 na výšku | `[8490, −7771,1]` | r 8490, b −7771,1, l −7893, t 8611,9 | 1 / 42 ms |
| 600 × 300, artboard posunutý o 2000 pt | `[9042, −7766,6]` | beze změny | 1 / 44 ms |
| Large Canvas 6000 × 1000 mm (sf 10) | `[9042, −8050,5]` | r 9042, b −8050,5, w = h = 16 383 | — |
| testovací soubor ZSM `Zund_Summa_Test.ai` (1353 objektů) | `[10 403, −3869,3]` | shoda na všech čtyřech okrajích | 1 / 441 ms |

Na skutečném souboru je bisekce desetkrát dražší než v prázdném dokumentu.

Výhoda není jen rychlost. Bisekce stojí na odmítaných `artboards.add()`, a ty
podle našeho měření (N42, `engine-facts.md` „Odmítnuté `artboards.add` vrací,
co skript odebral“) vracejí, co skript předtím odebral. Proto se dnes musí
měřit v `main.js` před `removeAll`. Trik žádné odmítnutí nepotřebuje.

Pozor na dvě věci, obě naměřené:

- **Na zamčené nebo skryté aktivní vrstvě `doc.pathItems.add()` hází**
  „Target layer cannot be modified“. Cestu proto vytvořit ve vlastní dočasné
  vrstvě (`doc.layers.add().pathItems.add()` funguje) a vrstvu pak odebrat.
- **Levý a horní okraj stojí na konstantě 16 383.** Bisekce ji pokaždé
  naměřila, trik ji předpokládá. `engine-facts.md` („Mez artboardu“)
  upozorňuje, že konstanta může s verzí zestárnout. Pojistka: v harnessu
  nechat jednu kontrolní bisekci, nebo trik ověřit na každé nové verzi.

Měřit dál před první změnou dokumentu. Odebraná dočasná vrstva patří do
stejné třídy jako N42: kdyby později něco odmítlo `artboards.add()`, mohla by
se vrátit.

**K přenesení do vlákna TE.**

### I2 — Skill: maska z compound path se nenajde (naměřeno)

`manipulating-illustrator-items` §3 `getVisualBounds` hledá masku podmínkou
`(PathItem || CompoundPathItem) && sub.clipping`. **`CompoundPathItem`
vlastnost `clipping` nemá**: v typings chybí, v enginu je `undefined`.
Příznak nesou jeho dílčí cesty. Osokin (`AlignToArtboards.jsx`,
`getVisibleBounds`) čte `curItem.pathItems[0].clipping`.

Naměřeno (příloha A2) na masce 200 × 200 z compound path s dírou nad obsahem
500 × 500:

| čtení | výsledek |
|---|---|
| `cp.clipping` | `undefined` |
| `cp.pathItems[0].clipping`, `[1].clipping` | `true`, `true` |
| skill `getVisualBounds` | **501 × 501** (spadne na `visibleBounds` obsahu) |
| hledání přes `pathItems[0].clipping` | 200 × 200 |

Druhé naměřené chování: **`group.clipped = true` s compound path navrchu
DOM odmítne** („The top item in the group must be a path item to create a
mask“). `executeMenuCommand("makeMask")` nad týmiž objekty masku vytvoří.
Dodatek z téhož dne: stejnou hlášku hodí i `clipped = false` na hotové
compound masce. Skill (§3 `isClipPath`, §5) i `engine-facts.md` („Maska
z compound path“) jsou opravené a nový vzor prošel v Illustratoru všemi
případy: maska z cesty, obsah nad maskou, compound maska, compound jako obsah,
skupina bez masky. Na testovacím souboru ZSM `Zund_Summa_Test.ai` (jen
čtení) má všech 338 masek obyčejnou cestu na indexu 0: starý vzor, nový vzor
i `pageItems[0]` dávají shodně 311,81 × 311,81, `visibleBounds` u všech 426,2.
Okrajové případy v tom souboru nejsou.

Osokinův kód řeší ještě compound path bez `pathItems` (podle W. Dowlinga:
rozdělit, seskupit, změřit). Ten případ jsem nevytvořil ani neměřil.

### I3 — ZSM: ořezová cesta podle indexu

`zund-summa-marks/src/lib/bounds.js:255`:
`// Clip mask is always pageItems[0] (topmost child)`. Naše vlastní
`engine-facts.md` („Ořezová cesta nemusí být `pageItems[0]`“) naměřilo opak:
objekt vložený skriptem `PLACEATBEGINNING` do maskované skupiny leží nad
maskou, `clipped` zůstane `true` a na indexu 0 je běžný objekt. Text faktu
končí větou „Masku hledat přes `clipping === true`, ne podle indexu.“

Dopad: značky se rozmístí podle mezí špatného objektu. Pravděpodobnost je
nízká (v souborech z UI jsem takový stav nepotkal a neměřil, jestli tam může
vzniknout), oprava je levná: hledat jako v I2 (`PathItem.clipping`, u
`CompoundPathItem` `pathItems[0].clipping`) a `pageItems[0]` nechat jako
poslední možnost. U compound masky dnešní kód shodou okolností funguje,
protože leží na indexu 0.

**K přenesení do vlákna ZSM.**

### I4 — Šipky v číselném poli (nápad, neměřeno)

Ve 24 skriptech má Osokin u číselných polí `keydown`: ↑/↓ o 1,
se Shiftem o 10 (`ScriptUI.environment.keyboardState.shiftKey`), novější
skripty i `[` a `]`. Po změně volá `kd.preventDefault()` a přepočet. Je to
zvyk z polí Illustratoru, která se stejně ovládají. U nás nic takového není.

Do kánonu by to šlo jako §12.3 „Numbers“ a patřilo by do
`shared/lib/numbers.js`, aby to měla všechna pole najednou. Proti Osokinovi
dvě změny: neplatné pole nekrokovat (on dělá `parseFloat(text) || 0`, takže
z překlepu udělá 1), a zapsat zpět přes `NS.Numbers.format`, s čárkou.
Jak se `keydown` chová na macOS v modálním dialogu, jsem neověřil — chce to
ruční test. **Rozhodnutí o kánonu je na tobě.**

### I5 — Živý náhled přes Zpět (nápad pro GM)

V 31 skriptech: při každé změně pole `app.undo()` poslední náhled, znovu
nakreslit, `app.redraw()`. Při Storno `undo` naposledy, při OK nechat. Funguje
díky tomu, co máme naměřené: `app.redraw()` dělí historii Zpět.

Pasti, ze kterých se Osokin sám poučil nebo které známe my:

- **Vracet jen náhled, který něco změnil.** Starší `ResizeToSize` nastaví
  `isUndo = true` předem. Když náhled nic nezmění, další `undo()` vrátí
  poslední krok uživatele. `DrawPolyline` (2026) to opravuje příznakem
  `success`.
- **Změny artboardu Zpět spolu s ostatními nevrátí** (`engine-facts.md`
  „Změnu artboardu spolu s jinými změnami Zpět nevrátí“). Pro ZSM a TE, které
  artboardy mění, proto nepoužitelné. Pro GM, který jen kreslí značky do
  vrstvy, ano.
- Předvolby změněné kvůli náhledu (`policyForPreservingCorners`) vrací až
  `onClose`. Když skript spadne, zůstanou změněné.
- Před `redraw()` přidá a odebere prázdnou vrstvu. K čemu, neuvádí,
  neověřoval jsem.

Pro GM by to znamenalo vidět průchodky ve výkresu už při psaní rozteče.
Je to nová funkce, ne oprava, takže **k zvážení ve vlákně GM**, ne návrh
k okamžité práci.

### I6 — Pathfinder přes akci vytvořenou za běhu (rezerva)

`TrimMasks.jsx` zapíše `.aia` s událostí `ai_plugin_pathfinder` (Crop,
hodnota 9), pak `app.loadAction`, `app.doScript` a `app.unloadAction` a soubor
smaže. Tak se dá dostat k operacím panelu Pathfinder s parametry, které
`executeMenuCommand` nemá (podle `engine-facts.md` „Pathfinder z
ExtendScriptu“ `Pathfinder Crop` neexistuje). TE dnes vystačí s
`Live Pathfinder Subtract` a `expandStyle`, takže teď není potřeba.
Neměřeno.

### I7 — Výrazy v číselném poli (spíš ne)

`DrawPolyline` `evalMath` přijme `100/2` nebo `3*50` jako pole Illustratoru.
Napřed ale vyhodí všechno kromě číslic a operátorů, takže `1O5` je 15
a `20 mm` je 20. Přesně to kánon §12.3 zakazuje („never a different number“).
Kdyby výrazy někdy chtěly, šlo by to jen s gramatikou, která neznámý znak
odmítne, a bez `eval`. Nedoporučuji.

### I8 — Drobnosti

- **Pamatovat polohu dialogu** (`win.location` v nastavení, 27 skriptů). U nás
  jen ZSM (`_lastBounds`). Malý přínos.
- **Tmavé UI:** `app.preferences.getRealPreference('uiBrightness') <= 0.5`.
  `FieldPaint.isDarkUI` čte štětec motivu a bez něj vrací `null`. Předvolba by
  mohla posloužit jako záloha. Neměřeno.
- **Čísla artboardů během dialogu:** `onShow` nakreslí čísla,
  `executeMenuCommand('artboard')` dvakrát místo `redraw()`, vrstva hned
  pryč. Pro naše nástroje teď nic.

## 4. Co je u nás lépe — nepřebírat

| Oblast | Osokin | My |
|---|---|---|
| Nastavení | `~/Documents/Adobe Scripts/*.json`, zápis vlastním `stringify` (uvozovky neescapuje), čtení `new Function('return (' + json + ')')` nebo `toSource()`, tedy `eval` | `Folder.userData`, `JSON` z `json2.js`, migrace předvoleb, chyby do logu |
| Čísla | `strToNum`: čárka na tečku, pak vyhodí nečíslice (`1O5` je 15) | `NS.Numbers.parse`, striktní gramatika |
| Chyby | `try { main(); } catch (err) {}` na konci 97 ze 101 skriptů, takže každá chyba skončí bez hlášky | chybová hranice na vstupu s hláškou a logem; prázdný `catch {}` máme taky (88×), ale u úklidu (`file.close()`, `layout`, `remove()` dočasných věcí), ne kolem běhu |
| Lokalizace | `$.localize = true` (globální stav enginu) a objekty `{en, ru}` | modul `NS.L` z `app.locale`, parita klíčů v testech |
| Průběh | `progressbar` bez přerušení | `shared/lib/progress.js`, zastavení držením Esc |
| Předvolby uživatele | **95 skriptů hned na začátku nastaví `ShowExternalJSXWarning` na `false`**, tedy natrvalo vypne varování Illustratoru před externími skripty | předvolby Illustratoru neměníme |
| Spadávka dokumentu | `getBleed` čte uložený `.ai` řádek po řádku a hledá `TrimBox[` | TE ji nepotřebuje, bere přesah umístěné grafiky (`TE.Doc.computeOverhang`) |
| Large Canvas | hodnota v jednotkách děleno `scaleFactor` | totéž plus měřítko kresby (`drawing_scale.js`) |
| Organizace | každý skript nese vlastní kopii pomocných funkcí (v `FitArtboardsToArtwork` je `createOutlines` dvakrát), bez testů a buildu | `src/` moduly, `shared/lib`, Node testy, parity guard |
| Výběr v textu | `selection.typename == 'TextRange'` | GM to podle kódu pokrývá: kurzor v textu vede na „není cesta“ (`GM.Illustrator.getSelectedPathInfo`, celé čtení výběru v jednom `try`). Neměřeno |

Pořadí tlačítek podle `$.os` (Mac Storno–OK, Windows OK–Storno) a mnemotechnika
přes podtržení `U+0332` s Cmd+písmenem pro naše nástroje (jen macOS) nemají
smysl.

## 5. Geometrie Sata — délka křivky

GM v režimu cesty měří délku křivky lomenou čarou z 64 vzorků na segment
(`GM.CONSTANTS.SAMPLES_PER_SEGMENT`, `GM.Core.buildCircuit`). Sato (`Path
Length.jsx`, `Divide (length).jsx`) integruje rychlost křivky Simpsonovým
pravidlem (128 dílů) a parametr `t` pro danou délku hledá bisekcí
(30 iterací, tolerance 0,001 pt).

Změřeno v Node proti lomené čaře z 200 000 vzorků (příloha A3), chyba
jednoho segmentu:

| segment | délka | GM 64 vzorků | Simpson 128 |
|---|---|---|---|
| čtvrtkruh R = 1 m | 1571,0 mm | −0,040 mm | 0,000 mm |
| esovka | 2567,1 mm | −0,248 mm | 0,000 mm |
| skoro bod vratu (zkřížená táhla) | 3249,2 mm | −0,692 mm | 0,000 mm |
| úsečka 5 m | 5000,0 mm | 0,000 mm | 0,000 mm |

Lomená čára délku vždy podhodnotí, relativně nejvýš o 2·10⁻⁴. Průchodky se ale
rozmisťují po téže tabulce, takže krajní body sedí a rozteč je kratší o stejný
podíl: na 300 mm asi 0,06 mm. Body na tětivách GM dopočítává na křivku
(`_chordSagitta`, `refine`). **Měnit to netřeba.** Simpson a bisekce jsou
dobrá rezerva, kdyby nástroj potřeboval přesnou délku (třeba délku řezu
k odhadu času na Zündu) nebo vkládat kotvy na danou vzdálenost beze změny
tvaru (`getDivPnt` a `defDir` v `Divide (length).jsx`).

Další Satovy skripty (`Round Any Corner`, `Arc Correction`, `Common Tangents`,
`Metaball`…) jsou geometrie pro kreslení. Žádný z našich nástrojů je
nepotřebuje.

## 6. K přenesení do vláken

- **TE:** I1 — `canvasBounds` přes prázdnou cestu v dočasné vrstvě, měřit dál
  před první změnou, kontrola konstanty 16 383.
- **ZSM:** I3 — `bounds.js:255` hledat masku přes `clipping`.
- **GM:** I5 — živý náhled jako nápad; I4, pokud se dostane do kánonu.
- **BRE:** nic. `BatchTrace`, `SaveAllDocs` a `FileVersionInformer` řeší
  jednodušší úlohy jednodušeji.
- **Společné (skilly, `engine-facts.md`, kánon):** I2 — oprava §3 v
  `manipulating-illustrator-items` a dvě nová fakta o maskách; I4 —
  rozhodnutí o šipkách v §12.3.

Licence: Osokin je MIT. Převzetí podstatné části kódu by znamenalo ponechat
copyright a text licence. U vzorů o pár řádcích (stepper, čtení `position`)
stačí vlastní implementace a poděkování v komentáři, jako to dělá Osokin
u @moodyallen. Sato má jen „Free to use and distribute“, pro algoritmy to
nevadí.

## 7. Co jsem neověřil

- Obsah obou `.zip` a `BeautifySwatchNames` (32 676 řádků).
- Asi 85 skriptů znám jen ze strojového skenu, ne z čtení.
- `keydown` šipek v modálním dialogu na macOS (I4).
- Náhled přes Zpět v modálním dialogu a smysl prázdné vrstvy před `redraw()`
  (I5).
- Compound path bez `pathItems` jako maska (I2).
- Akce vytvořená za běhu (I6) a předvolba `uiBrightness` (I8).

## Příloha A — sondy

Všechny běžely přes `tools/ai-eval.sh` jen při `app.documents.length === 0`,
ve vlastních dokumentech zavřených bez uložení (`finally`). Po každé sondě
Illustrator hlásil 0 dokumentů.

**A1 — plátno.** Jádro triku:

```
var p = layer.pathItems.add(); var pos = [p.position[0], p.position[1]]; p.remove();
```

proti kopii `TE.Check.canvasBounds` (24 iterací, u Large Canvas 30 a dosah
400 000 pt). Výsledky v tabulce I1. Zamčená i skrytá aktivní vrstva:
`doc.pathItems.add()` hází „Target layer cannot be modified“. Vlastní
dočasná vrstva: OK, po úklidu 0 objektů a 1 vrstva.

**A2 — maska z compound path.** Obsah 500 × 500 pt, compound path 200 × 200
s dírou 100 × 100 (`executeMenuCommand("compoundPath")`). DOM
`group.clipped = true` s compound navrchu hází. Maska přes
`executeMenuCommand("makeMask")`: děti `CompoundPathItem, PathItem`,
`grp.clipped === true`. Výsledky v tabulce I2.

**A3 — délka křivky.** Node, lomená čara z `n` vzorků (jako
`GM.Core.buildCircuit`) proti Satově `getLength` z `Path Length.jsx` přepsané
1:1. Reference: lomená čára z 200 000 vzorků. Výsledky v tabulce §5.
