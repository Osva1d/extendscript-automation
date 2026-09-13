# Tile Export

Rozdělí velkou grafiku na tiskové pláty pro ruční ořez — přídavky zvlášť pro
každou hranu, přelep na švech, červená ořezová linka v přímé barvě a export
každého plátu do vlastního PDF.

## Proč existuje

Ruční plátování ve studiu se dělá jen ve dvou případech; ten zbytek zvládne RIP.
Tenhle nástroj řeší **první z nich: nerovnoměrné dělení**, kdy se šev musí
vyhnout textu nebo logu a RIP to neumí.

Dosud to znamenalo nakopírovat grafiku tolikrát, kolik je plátů, každou kopii
zamaskovat a naskládat artboardy ručně. Kromě času to má měřitelný vedlejší
účinek: **clipping maska data neořízne**, takže každá zamaskovaná kopie nese
celou grafiku. Dvanáct plátů znamená dvanáctinásobek dat v dokumentu i ve všech
výstupech.

Strojní ořez na Zündu (druhý případ) zatím nástroj neumí — viz
[Známá omezení](#známá-omezení).

## Požadavky

- Adobe Illustrator CC 2020+ (vyvinuto a ověřeno na 30.8.1)
- macOS 12.0+ / Windows 10+

## Instalace

1. Stáhni hotový `illustrator-tile-export.jsx` z [GitHub Releases](https://github.com/Osva1d/extendscript-automation/releases), nebo si jej postav ze zdroje (`npm run build` → `dist/`).
2. Spusť přes `Soubor ▸ Skripty ▸ Jiný skript…`, nebo jej vlož do složky skriptů Illustratoru pro trvalé umístění:
   - **macOS:** `/Applications/Adobe Illustrator [verze]/Presets/[jazyk]/Scripts/`
3. Při vložení do Presets restartuj Illustrator.

## Příprava dokumentu

Nástroj počítá s dokumentem v tomhle tvaru:

1. **Plátno na rozměr čistého formátu.** U velké grafiky ve zmenšeném měřítku,
   typicky 1:10 — pak zaškrtni v dialogu **Ruční měřítko 1:N** a zadej 10.
   Všechny hodnoty v dialogu se pak zadávají ve **skutečných milimetrech**.
2. **Navázané PDF umístěné do plátna, už se spadem pro přídavky.** Grafika tedy
   plátno přesahuje. Nástroj ten přesah změří a odmítne přídavek, který by ho
   překročil — jinak by plát měl prázdný okraj, který se pozná až na výtisku.
3. **Vodítka** tam, kde mají padnout švy — jen když chceš dělit nerovnoměrně.

Dokument musí obsahovat **právě jednu** umístěnou grafiku. Export běží
v dočasném dokumentu, kam se přenáší jen ona; cokoli dalšího by se ztratilo.

## Použití

Nástroj běží ve dvou fázích, protože mřížku chceš vidět dřív, než se exportuje.

1. Spusť skript, vyplň dialog. Pod nastavením se průběžně přepočítává, co z toho
   vyjde — rozměr každého plátu načisto i s přídavky a dostupný spad na každé
   hraně. Chybné zadání zašedne obě akční tlačítka.
2. **Jen pláty** — vzniknou artboardy `TE_01`…`TE_0n` a červené linky. Prohlédni
   si je, švy můžeš ručně posunout.
3. Spusť znovu a dej **Vytvořit a exportovat**.

Když si jistý jsi, druhý a třetí krok splyne do jednoho tlačítka.

## Přídavky, přelep a linka

**Přídavek** je montážní spad na vnějším obvodu celé grafiky. Čtyři nezávislá
pole, každé může být nula — to znamená „načisto". Typické zadání „nahoře a dole
4 cm, vlevo načisto, vpravo 4 cm" se zapíše přesně takhle.

**Přelep** je materiál společný dvěma sousedním plátům. Výchozí 2 cm pro ořez na
tupo; **u desek (forex, kapa) nastav nulu** — pláty pak jdou k sobě natupo.
Umístění přelepu má dvě varianty:

| volba | co udělá |
|---|---|
| Půl na každou stranu | šev leží uprostřed překryvové zóny |
| Celý na jeden plát | levý (u vertikálního dělení horní) plát nese celý přelep, soused začíná přesně na švu |

**Červená linka** se kreslí po obvodu **čistého formátu** plátu, tedy včetně švů,
v přímé barvě. Na hranách „načisto" splývá s okrajem plátu. Přímá barva se
v dokumentu vytvoří, pokud tam není; když ji vytvořit nelze, nástroj se zastaví
místo aby tiše přepadl na CMYK — linka ve špatné barvě vypadá správně a dojede
až k finišerovi.

## Vodítka

Režim **Vodítek** čte vodítka kolmá na směr dělení: při horizontálním dělení
svislá, při vertikálním vodorovná.

- Vodítka na **zamčené** vrstvě se použijí, na **skryté** se ignorují a nástroj
  je spočítá do souhrnu. Vodítko, které nevidíš, nemůže rozhodovat o dělení.
- Ručně tažené vodítko nikdy nesedí na kulaté číslo. Pole **Zaokrouhlit vodítka
  na** to srovná; nula je vezme tak, jak jsou.

## Zünd režim

Pro strojní přesný ořez. Přepínač v dialogu; když je vypnutý, nic nestojí.

Zapnutý přidá do každého exportovaného plátu dvě věci:

- **Registrační značky** — kulaté, v přímé barvě, na všech čtyřech hranách plus
  orientační bod, který stroji říká, jak je plát otočený. Na dlouhých hranách
  se interpolují, aby rozteč nepřesáhla zadané maximum.
- **Ořezová data plátu** — tvarová kontura oříznutá na rozměr plátu.

### Jak označit konturu

**Přímou barvou, na vrstvě nezáleží.** V dialogu vybereš barvu ze seznamu
přímých barev dokumentu; všechny cesty s tou barvou se považují za konturu,
včetně compound paths s dírami.

### Co kontura dělá na švu

Nic zvláštního — **řídí to přelep**, který už znáš z tiskových plátů. Přelep 0
dá pláty natupo, přelep 20 mm dá překryv. Žádné další nastavení.

**Spad za konturou nástroj neřeší.** Musí být v dodaných datech; nekontroluje
se a nedokresluje.

### Na co si dát pozor

- **MediaBox plátu je větší než plát.** Značky leží vně plátu — při odstupu
  10 mm a značce 5 mm sahají 42,5 pt za každou hranu — takže stránka musí
  vyrůst, aby se do ní vešly. Červená ořezová linka zůstává na hranici plátu,
  tedy uvnitř většího MediaBoxu.
- **Plát, do kterého kontura nezasahuje**, se v souhrnu nahlásí. Není to chyba
  (prostřední plát obdélníkového výřezu ho legitimně nemá), ale plát, který
  tiše dojede ke stroji bez ořezových dat, je tam nepříjemné překvapení.
- **Jedna řezací barva.** Proříz, ryl a děrování zvlášť tahle verze neumí.
- **Pláty jsou obdélníkové.** Reálný studiový postup ořezává grafiku samotnou
  konturou rozšířenou o spad a ukládá dva PDF na plát — tiskové a `_cut`. To
  tahle verze zatím neumí; postup i naměřené podklady k němu jsou ve specu
  [`docs/specs/2026-09-13-tile-export-zund-design.md`](../docs/specs/2026-09-13-tile-export-zund-design.md) §10.

## Měřítko výstupu

| volba | kdy |
|---|---|
| Stejné jako dokument | plátno 1:10 zůstane 1:10, zvětšuje až RIP |
| 1:1 skutečná velikost | výstup ve skutečném rozměru |

**Large Canvas dokument musí exportovat 1:1.** Dočasný dokument, přes který
export běží, nemůže být Large Canvas — `scaleFactor` u nově vytvořeného
dokumentu nejde nastavit a selže tiše. Nástroj tuhle kombinaci odmítne, protože
jinak by výstup vyšel desetinásobně zmenšený a vypadal by správně.

## Známá omezení

- **Vektorový export nese v každém plátu celou grafiku.** Není to chyba nástroje:
  Illustrator obsah neořezává ani artboardem, ani clipping maskou, a
  `PDFSaveOptions` nemá ekvivalent InDesignového „Crop Image Data to Frames".
  Měření je v [../docs/specs/2026-09-13-tile-export-design.md](../docs/specs/2026-09-13-tile-export-design.md) §3.
  Když na velikosti záleží, použij **rastrový** režim — velikost plátu pak
  závisí na jeho ploše a DPI, ne na zdroji.
- **Rastrový režim rasterizuje celý plát**, tedy i text, vektorová loga
  a ořezovou linku.
- **Dělení jen jedním směrem.** 2D mřížka pro desky zatím není.
- **Zünd není podporován.** Regmarky a rozdělení tvarové ořezové kontury mezi
  pláty jsou samostatná etapa; průzkum, co pro ni funguje a co ne, je ve specu
  v sekci „Co přijde po v1".
- Velký plát se při výstupu 1:1 nemusí vejít do artboardu Illustratoru
  (mez leží mezi 16 200 a 16 300 pt, tedy okolo 5,7 m).
- **Dělení ořezové kontury není pod automatickými testy.** Stojí na
  `executeMenuCommand`, tedy na běžícím Illustratoru, a ověřuje se sondami
  s vizuální kontrolou. Geometrie plátů pod testy je, kontura ne.
- Zünd režim zvládne **jednu** řezací přímou barvu. Summa není podporovaná.

## Řešení problémů

- **„Přídavek vpravo překračuje přesah grafiky"** — nalinkované PDF nenese
  dost spadu na té hraně. Buď zmenši přídavek, nebo si vyžádej data s větším
  spadem. Dostupný spad je vidět v dopočtu dialogu.
- **„Nenalezen artboard čistého formátu"** — všechny artboardy v dokumentu
  začínají na `TE_`, tedy jsou to vygenerované pláty. Původní artboard se
  nesmí přejmenovat ani smazat.
- **„Dokument musí obsahovat právě jednu umístěnou grafiku"** — export přes
  dočasný dokument přenáší jen jednu navázanou grafiku.
- **Pláty zůstaly v dokumentu po neúspěšném běhu** — další spuštění je najde
  podle prefixu a přepočítá. Vrstva `TE_lines` se vyprazdňuje při každém startu.

## Vývoj

```
src/
├── locale.js       TE.L        — EN/CS stringtable, detekce podle app.locale
├── config.js       TE.Config   — konstanty, getDefaults()
├── grid.js         TE.Grid     — řezy a geometrie plátů, žádný DOM (testovatelné)
├── doc.js          TE.Doc      — čtení artboardu, grafiky, přesahu, vodítek
├── draw.js         TE.Draw     — přímá barva, ořezová linka, značky, artboardy
├── cut.js          TE.Cut      — detekce a ořez ořezové kontury
├── export.js       TE.Export   — transformace a dočasný dokument na plát
├── ui.js           TE.UI       — ScriptUI dialog, živý dopočet, předvolby
├── main.js                     — entry point, error boundary, dvoufázový běh
└── lib/
    ├── utils.js    TE.Utils    — mm/pt, složené měřítko, ES3 helpery
    ├── validation.js TE.Validate — kontroly před během
    └── storage.js  TE.Storage  — předvolby na disk
```

- Build: `npm run build` (= `bash tools/build.sh`) → `dist/illustrator-tile-export.jsx` (UTF-8 BOM + `#target illustrator`).
- Testy: `npm test` (plain Node, `tests/test_*.js`); `npm run verify` = build + test.
- Geometrie je čistá matematika — `grid.js` nesahá na DOM a je proto celá pod
  testy, včetně property testů na pokrytí mřížky a přesnost přelepu.
- Verze je v `package.json`; build ji ověřuje proti `src/config.js` i proti
  nejnovějšímu záznamu v `CHANGELOG.md` (parity guard).
- Sdílené jádro (`json2.js`, `ui_state.js`, `cut_marks.js`) žije
  v `../shared/lib/`. Geometrii registračních značek sdílí se
  `zund-summa-marks` — odůvodnění v [../docs/decisions.md](../docs/decisions.md).

## Changelog

Viz [CHANGELOG.md](CHANGELOG.md).
