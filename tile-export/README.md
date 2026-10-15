# Tile Export

Rozdělí velkou grafiku na tiskové pláty pro ruční ořez — přídavky zvlášť pro
každou hranu, přelep na švech, červená ořezová linka v přímé barvě a export
každého plátu do vlastního PDF.

## Proč existuje

Ruční plátování má smysl jen ve dvou případech; zbytek zvládne RIP.
Tenhle nástroj řeší **první z nich: nerovnoměrné dělení**, kdy se šev musí
vyhnout textu nebo logu a RIP to neumí.

Dosud to znamenalo nakopírovat grafiku tolikrát, kolik je plátů, každou kopii
zamaskovat a naskládat artboardy ručně. Kromě času to má měřitelný vedlejší
účinek: **clipping maska data neořízne** — obrázek, který přes plát přechází,
nese každý plát celý.

Strojní ořez na Zündu (druhý případ) nástroj umí zatím **rovný** — viz
[Zünd režim](#zünd-režim).

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
   typicky 1:10 — pak zadej v dialogu **Měřítko kresby 1:** 10. Dokument si
   měřítko zapamatuje a příště ho dialog nabídne sám. Všechny hodnoty v dialogu
   se pak zadávají ve **skutečných milimetrech**.
2. **Navázané PDF umístěné do plátna, už se spadem pro přídavky.** Grafika tedy
   plátno přesahuje. Nástroj ten přesah změří a odmítne přídavek, který by ho
   překročil — jinak by plát měl prázdný okraj, který se pozná až na výtisku.
3. **Vodítka** tam, kde mají padnout švy — jen když chceš dělit nerovnoměrně.

Dokument musí obsahovat **právě jednu** umístěnou grafiku. Export běží
v dočasném dokumentu, kam se přenáší jen ona; cokoli dalšího by se ztratilo.

## Použití

Nástroj běží ve dvou fázích, protože mřížku chceš vidět dřív, než se exportuje.

1. Spusť skript, vyplň dialog. Panel **Dokument** ukáže čistý formát a dostupný
   spad na každé hraně. **Výsledek** průběžně přepočítává: stavová řádka řekne,
   jestli export poběží, tabulka ukáže každý plát načisto, s přídavky a jako
   stránku PDF, pod ní jsou hlášky a název prvního souboru. Chybné zadání
   zašedne obě akční tlačítka. Čísla piš s desetinnou čárkou nebo tečkou,
   bez jednotek; pole s jiným zápisem, i prázdné, zčervená a Výsledek ho
   pojmenuje. **Typ výstupu** volí mezi ručním ořezem (červená linka)
   a Zündem (značky a řezová cesta).
2. **Jen pláty** — vedle originálu vzniknou **kontrolní pláty**: každý plát
   zamaskovaný na vlastním artboardu `TE_01`…`TE_0n`, s červenou linkou, nebo se
   Zünd značkami a řezem — tak, jak ho zapíše export, jen v měřítku kresby.
   U Svisle jsou v řadě pod originálem, u Vodorovně ve sloupci vpravo od něj;
   řada, která by vyjela z plátna Illustratoru, se zalomí. Hranici načisto
   (šev a konec přelepu) ukazuje vodítko. Originál zůstane, jak je; vše leží ve
   vrstvě `TE_panels`, kterou další běh nahradí. Když šev nesedí, uprav
   nastavení nebo vodítka a spusť znovu — ruční úpravy kontrolních plátů
   export nepřevezme, pláty počítá z nastavení znovu.
3. Spusť znovu a dej **Vytvořit a exportovat**.

Když si jistý jsi, druhý a třetí krok splyne do jednoho tlačítka.

## Tři způsoby dělení

| volba | co zaručuje |
|---|---|
| **počet plátů** | *n* plátů **stejné čisté šířky**, švy na přesných zlomcích |
| **šířka plátu** | pláty zadané čisté šířky, poslední kratší |
| **vodítka** | švy přesně tam, kam je položíš |

Každý režim patří tomu, kdo zakázku svazuje: **počet** určuje návrh, **šířku**
materiál, **vodítka** ty. Nad všemi třemi stojí přepínač **Rovnoměrně**, který
mění, co se má srovnat — viz níž.

„Počet plátů" dělí **grafiku**. Pět plátů z 5000 mm znamená švy na 1000, 2000,
3000 a 4000 a pět plátů po 1000 mm načisto. Přelep je materiál, který se k tomu
přidá navíc, a přídavky leží mimo grafiku — ani jedno šev neposune.

Tiskové šířky pak stejné nejsou, a být nemůžou: krajní plát má jeden šev,
vnitřní dva. Na 5000 mm, 5 plátů, přelep 20 mm, bez přídavků:

| umístění přelepu | tisková šířka | čistá šířka |
|---|---|---|
| půl na každou stranu | 1010 \| 1020 \| 1020 \| 1020 \| 1010 | 1000 × 5 |
| celý na levý / horní | 1020 \| 1020 \| 1020 \| 1020 \| 1000 | 1000 × 5 |
| celý na pravý / dolní | 1000 \| 1020 \| 1020 \| 1020 \| 1020 | 1000 × 5 |

**Potřebuješ naopak stejné tiskové pláty?** Na to je přepínač Rovnoměrně.
Obojí naráz mít nejde: buď stejné čisté šířky, nebo stejné tiskové. Při
**nulovém přelepu** obě definice splynou, takže desky se plátují tak i tak
stejně.

### Rovnoměrně — stejné tiskové pláty

Zaškrtnutí mění, co má vyjít stejné: místo stejných **čistých** šířek stejné
**tiskové**, tedy včetně přelepu a přídavků. Šířka plátu je pak
`W = (délka + přídavky + (n − 1) × přelep) / n`.

Přepínač platí pro oba číselné režimy a v každém dělá totéž — liší se jen tím,
odkud se bere *n*.

**S počtem plátů** srovná pláty, které sis vyžádal. Na 5000 mm, 5 plátů,
přelep 20 mm:

| Rovnoměrně | tisková šířka | čistá šířka |
|---|---|---|
| vypnuto | 1000 \| 1020 \| 1020 \| 1020 \| 1020 | 1000 × 5 |
| zapnuto | 1016 × 5 | 1016 \| 996 \| 996 \| 996 \| 996 |

**Se šířkou plátu** se zadaná šířka přečte jako **strop tiskové šířky**, tedy
šířka role, a vyjde nejmenší počet stejných plátů, které se pod něj vejdou:

```
n = ceil((délka + přídavky − přelep) / (strop − přelep))
```

| strop | pláty | tisková šířka |
|---|---|---|
| 1300 | 4 | 1265 |
| 1200 | 5 | 1016 |
| 1000 | **6** | **850** |

Poslední řádek ukazuje, proč je to strop a ne přání: pět plátů by se vytisklo
na 1016 mm, tedy přes, takže se musí na šest. Skok je nevyhnutelný — jakmile
mají být pláty stejné a zároveň pod stropem, jejich šířka je počtem plátů
jednoznačně daná.

**Bez zaškrtnutí** je šířka plátu prostě čistá šířka a poslední plát vyjde
kratší o zbytek. Pozor: **tištěný plát je pak o přelep širší** — 1200 mm
načisto se vytiskne na 1220 — takže na roli musí zbýt místo. Právě tohle
zaškrtnutí odstraní.

## Přídavky, přelep a linka

**Přídavek** je montážní spad na vnějším obvodu celé grafiky. Čtyři nezávislá
pole, každé může být nula — to znamená „načisto". Typické zadání „nahoře a dole
4 cm, vlevo načisto, vpravo 4 cm" se zapíše přesně takhle.

**Přelep** je materiál společný dvěma sousedním plátům. Výchozí 2 cm pro ořez na
tupo; **u desek (forex, kapa) nastav nulu** — pláty pak jdou k sobě natupo.
Umístění přelepu má tři varianty:

| volba | co udělá |
|---|---|
| Půl na každou stranu | šev leží uprostřed překryvové zóny |
| Celý na levý / horní | přelep nese plát před švem, soused začíná přesně na švu |
| Celý na pravý / dolní | přelep nese plát za švem, opačně |

Která z jednostranných je ta správná, **neurčuje žádná jednotná norma** — řídí
se pořadím lepení. Tiskové PSV se lepí zprava doleva a levý plát překrývá pravý
(u vodorovných švů zdola nahoru, aby voda stékala přes šev, ne do něj); tapety
se běžně lepí opačně. **Při ořezu na tupo je volba lhostejná** — přelep se
stejně odřízne. Rozhoduje až tam, kde překryv na grafice zůstane: pak má
překrývající hrana ležet odvrácená od hlavního směru pohledu, aby nevrhala
viditelný stín.

**Červená linka** se kreslí po obvodu **tiskového** plátu — včetně přelepu
a přídavků, tedy přesně po MediaBoxu exportovaného PDF — v přímé barvě. Leží
středem na hraně plátu a má dvojnásobnou tloušťku: vnější polovinu ořízne okraj
stránky a vytiskne se vnitřní, v tloušťce zadané v dialogu (výchozí 1 pt).
Hrana stránky tak vždycky padne do tahu a posun o zlomek bodu v prohlížeči,
v RIPu ani při ořezu linku neuřízne ani vedle ní nenechá bílou škvíru. Panel
Tah v Illustratoru proto ukazuje dvojnásobek.

Přímá barva se v dokumentu vytvoří, pokud tam není; když ji vytvořit nelze,
nástroj se zastaví místo aby tiše přepadl na CMYK — linka ve špatné barvě
vypadá správně a dojede až k finišerovi.

Ve vektorovém exportu má linka v PDF **vlastní vrstvu** pojmenovanou podle
barvy (výchozí `CutContour`) nad vrstvou `Graphics` s grafikou. Aby vrstvy po
otevření v Illustratoru zůstaly, ukládá se PDF jako editovatelné (zhruba
0,3–0,9 MB navíc na soubor, naměřeno). Rastrové PDF zůstává obyčejné, bez
vrstev: editovatelné by neslo obraz dvakrát. V Zünd režimu se linka nekreslí
vůbec, ani na kontrolní pláty — nahrazuje ji řezová cesta.

## Vodítka

Režim **Vodítek** čte vodítka podél švů: u svislých plátů (Svisle) svislá,
u vodorovných (Vodorovně) vodorovná.

- Vodítka na **zamčené** vrstvě se použijí, na **skryté** se ignorují a nástroj
  je spočítá do souhrnu. Vodítko, které nevidíš, nemůže rozhodovat o dělení.
- Ručně tažené vodítko nikdy nesedí na kulaté číslo. Pole **Zaokrouhlit vodítka
  na** to srovná; nula je vezme tak, jak jsou.

## Zünd režim

Pro strojní přesný ořez na Zündu, **zatím jen rovný ořez**. Tvarový ořez
podle kontury přijde v další verzi.

Zvolený jako **Typ výstupu** udělá z každého plátu **dvě PDF se stejnou
stránkou**:

| soubor | obsah |
|---|---|
| `zed_01_2040x1030mm.pdf` | grafika oříznutá maskou **o spad za řezem** (výchozí 5 mm), kolem ní volný pás a registrační značky; vrstva řezu je v souboru **vypnutá** |
| `zed_01_2040x1030mm_cut.pdf` | stejné značky a řezová cesta rovného ořezu v přímé barvě řezu, hairline 0,125 pt; **bez vrstvy grafiky** |

Obě PDF se ukládají **se zachovanou editovatelností v Illustratoru**. Otevřené
mají vrstvy jako soubor ze Zünd Summa Marks, shora `Regmarks`, vrstvu řezu
pojmenovanou podle barvy (`Cut`) a `Graphics` (grafika v masce). Stojí to
zhruba 0,3–0,9 MB navíc na soubor (naměřeno); propojená grafika se
nezdvojuje, rastr v rastrovém režimu ano, takže Zünd soubor je pak o obraz
větší. Grafika zůstává **propojená** s původním PDF — tisk to neovlivní, ale
na počítači, kde původní soubor na stejné cestě není, Illustrator při otevření
ohlásí chybějící propojení.

Na materiál se tiskne první, do Cut Center se načte druhý. Kamera najde
značky, srovná podle nich polohu a natočení a ořízne po řezové cestě. Spad za
řezem pokryje drobnou nepřesnost, takže na hraně nezůstane bílá.

Červená linka se v tomto režimu **netiskne** — jejím místem je řezová cesta.

### Nastavení

- **Barva řezu** — přímá barva řezové cesty, výchozí `Cut`. Seznam nabízí
  `Cut` a přímé barvy dokumentu. V dokumentu být nemusí, export ji v PDF
  vytvoří. Stroj rozlišuje velká a malá písmena.
- **Spad za řezem** — o kolik grafika přesahuje řez. Běžně 3 nebo 5 mm,
  u velkých plátů s místem na materiálu až 10 mm.
- **Odstup od motivu** — volné místo mezi koncem grafiky a značkou (výchozí
  5 mm), aby stroj značku přečetl.
- **Barva značek** — oddělená od barvy řezu, značka v barvě řezu by na stroji
  od řezu nešla rozeznat. Výchozí registrační; na černý a čirý materiál bílá
  `Spot 1`. Neznámá barva spadne na registrační, nástroj ji sám nevytvoří.
- **Průměr značky, max. rozteč, orientační bod** — jako v Zünd Summa Marks,
  se kterými tile-export sdílí výpočet polohy značek.

Stránka je maska plus odstup a značka na každé straně: plát 2020 × 1000 mm
se spadem 5, odstupem 5 a značkou 5 mm dá stránku 2050 × 1030 mm. Výsledek
v dialogu ji ukazuje ve sloupci Stránka PDF.

### Na co si dát pozor

- **Na vnějších hranách musí PDF nést přídavek + spad za řezem.** Jinak by maska
  sáhla za konec grafiky; dialog to hlásí a export zablokuje. Na švech se to
  nekontroluje, tam grafika pokračuje.
- **Značky se nesmí slít.** U úzkého plátu padne orientační bod na rohovou
  značku (při výchozím nastavení, když je maska široká 85–95 mm), při rozteči
  pod průměrem značky splynou sousední. Dialog jmenuje plát a export zablokuje;
  pomůže jiná vzdálenost orientačního bodu, případně rozteč.
- **Cesty v barvě řezu v dokumentu se zatím nepoužijí.** Dialog na ně upozorní
  a použije se rovný ořez.
- **Starší předvolby** mají barvu `cut` s malým písmenem a odstup 10 mm, který
  se dřív měřil od okraje plátu. Po načtení zkontroluj.
- **PDF preset platí pro oba soubory.** Preset s tiskovými značkami nebo
  spadávkou (třeba `pass4press`) je přidá i do `_cut`. Posun to nezpůsobí,
  stránky se zvětší stejně; pro Zünd ale vyber preset bez tiskových značek.
- **Jedna řezací barva.** Proříz, ryl a děrování zvlášť tahle verze neumí.
- Návrh a naměřené podklady:
  [`docs/reports/2026-09-25-maskovani-platu.md`](../docs/reports/2026-09-25-maskovani-platu.md).

## Měřítko výstupu

| volba | kdy |
|---|---|
| 1:N jako kresba (třeba „1:10 jako kresba") | data zůstanou v měřítku kresby, zvětšuje až RIP |
| 1:1 skutečná velikost | výstup ve skutečném rozměru |

U kresby 1:1 se nevolí nic, obě volby dají totéž. **Large Canvas** se zapíše
ve skutečné velikosti — tak ho ukazují pravítka — a jeho faktor dialog
neukazuje. Měřítko kresby se s ním skládá: Large Canvas s 1:10 vyjde jako
kresba v 1:10.

Pro data v měřítku kresby použij PDF preset **bez převzorkování**. Preset
převzorkovává podle rozlišení na stránce, a to je v 1:10 desetkrát vyšší: obraz,
který má ve skutečné velikosti 72 ppi, by po zvětšení v RIPu měl 30 ppi
(naměřeno, nález N36).

## Pojmenování souborů

Vzor pojmenování skládá název každého PDF. Pevné části se píšou, jak jsou, mezi
ně proměnné:

| proměnná | hodnota |
|---|---|
| `{n}` | číslo plátu, vždy aspoň dvoumístné (`01`) |
| `{size}` | skutečný rozměr stránky v celých mm (`2020x1020mm`), u Zündu stránka se značkami |
| `{scale}` | poměr dat ke skutečné velikosti: `1ku10`, ve skutečné velikosti `1ku1` |
| `{doc}` | název dokumentu bez přípony |
| `{total}` | počet plátů |

Výchozí vzor `{doc}_{n}_{size}_{scale}` dá `zed_01_2040x1030mm_1ku10.pdf`.
Konvenci dílny rok_zakázka_motiv_plát_rozměr_poměr_kopie zapíšeš jako
`26_13456_a_{n}_{size}_{scale}_1x`. Data 1:10 pak dostanou
`26_13456_a_01_2020x1020mm_1ku10_1x.pdf`, data 1:1
`26_13456_a_01_2020x1020mm_1ku1_1x.pdf`. Kde poměr u 1:1 nechceš, vynech
`{scale}` ze vzoru: `26_13456_a_{n}_{size}_1x` dá `26_13456_a_01_2020x1020mm_1x.pdf`.
Zünd přidá k řezovému souboru `_cut`.

Proměnné přidávají tlačítka pod polem: klik připíše proměnnou na konec vzoru,
vzor tedy skládej zleva doprava. Výsledek v dialogu ukazuje název prvního
souboru. Prázdný název, lomítko nebo
dvojtečku export odmítne. Rozměr odpovídá MediaBoxu, když PDF preset nepřidá
spadávku ani tiskové značky; pass4press stránku zvětší o 12,5 mm na každou
stranu.

## Známá omezení

- **Vektorový plát nese celý každý objekt, který do něj zasahuje.** Objekty mimo
  plát do PDF nejdou, ale objekt přes hranu Illustrator neořízne ani artboardem,
  ani clipping maskou — velký obrázek tak jde celý do každého plátu, kam sahá.
  `PDFSaveOptions` nemá ekvivalent InDesignového „Crop Image Data to Frames".
  Měření je v [../docs/extendscript-engine-facts.md](../docs/extendscript-engine-facts.md).
- **Rastrový export je od 1.1.0 z dialogu schovaný** (`TE.Config.RASTER_ENABLED`).
  Dílna rastruje ve Photoshopu, a to jen při potížích na RIPu; jestli jde věřit
  rastru Illustratoru, se teprve ověří. Uložené předvolby s rastrem exportují
  vektor.
- **Dělení jen jedním směrem.** 2D mřížka pro desky zatím není.
- **Zünd jen s rovným ořezem.** Tvarový ořez podle kontury je další etapa.
- Velký plát se při výstupu 1:1 nemusí vejít do artboardu Illustratoru
  (mez leží mezi 16 200 a 16 300 pt, tedy okolo 5,7 m).
- **Uložení dvou PDF v Zünd režimu není pod automatickými testy** — stojí na
  skrývání vrstev při ukládání, ověřuje se exportem v Illustratoru. Geometrie
  masky a značek pod testy je.
- Zünd režim zvládne **jednu** řezací přímou barvu. Summa není podporovaná.

## Řešení problémů

- **„Přídavek vpravo překračuje přesah grafiky"** — nalinkované PDF nenese
  dost spadu na té hraně. Buď zmenši přídavek, nebo si vyžádej data s větším
  spadem. Dostupný spad ukazuje panel Dokument.
- **„Nenalezen artboard čistého formátu"** — všechny artboardy v dokumentu
  začínají na `TE_`, tedy jsou to vygenerované pláty. Původní artboard se
  nesmí přejmenovat ani smazat.
- **„Dokument musí obsahovat právě jednu umístěnou grafiku"** — export přes
  dočasný dokument přenáší jen jednu navázanou grafiku.
- **Pláty zůstaly v dokumentu po neúspěšném běhu** — další spuštění je najde
  podle prefixu a přepočítá: artboardy `TE_` i vrstvu `TE_panels` nahradí,
  vrstvu `TE_lines` ze starších verzí odstraní.
- **„Kontrolní pláty se vedle originálu nevejdou na plátno"** — kresba ve
  skutečné velikosti je pro plátno Illustratoru (5,78 m) i se zalomením moc
  velká. Pomůže kresba v měřítku 1:10 nebo Large Canvas; export kontrolní
  pláty nepotřebuje a proběhne i bez nich.

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
├── check.js        TE.Check    — kontrolní pláty v pracovním dokumentu
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
