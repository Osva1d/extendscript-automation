# Návrh — Zünd režim pro tile-export

Rozšíření `tile-export` o přípravu plátů pro strojní přesný ořez na Zündu.
Navazuje na [v1](2026-09-13-tile-export-design.md).

Datum: 2026-09-13 · Stav: návrh, neschválený k implementaci

---

## 1. Problém

`tile-export` v1 řeší první ze dvou případů, kdy se plátuje ručně:
nerovnoměrné dělení, kde se šev musí vyhnout textu. Tenhle návrh řeší **druhý**:
strojní přesný ořez, tvarový nebo rovný, kde každý plát potřebuje regmarky
a vlastní korektní ořezová data.

Ruční postup: zkopírovat celkovou konturu do schránky, cestářem od ní odečíst zakrývající obdélník ve vhodném místě —
výsledek je ořez jednoho plátu — vložit kompletní konturu zpět a odečíst, co
nemá zůstat. A tak dokola pro každý plát.

Tenhle postup je zároveň **odpovědí na to, jak úlohu řešit strojově**: odečítání,
ne průnik (§2).

## 2. Naměřená fakta

Illustrator 30.8.1, 2026-09-13. Sondy přes `tools/ai-eval.sh`.

### Pathfinder z ExtendScriptu

- Panelové příkazy `Pathfinder Crop`, `Pathfinder Intersect`,
  `Pathfinder Divide` **neexistují** — `executeMenuCommand` vrací
  `yeKB` (1112237433).
- Funkční cesta: vybrat konturu a zakrývající obdélník → `group` →
  `Live Pathfinder Subtract` → `expandStyle`. **Bez seskupení se efekt
  neaplikuje** a tvar zůstane neoříznutý.
- Obdélník musí být **navrchu** — Minus Front odečítá horní objekt od spodního.
- Pathfinder pracuje **s plochami, ne s obrysy**: kontura musí mít po dobu
  operace výplň, obrys se vrací až potom.

| případ | Subtract | Intersect |
|---|---|---|
| jeden tvar | ořez sedí | ořez sedí |
| compound path s dírou | **ořez sedí, díra zůstane** | neořízne (950 místo 600) |
| dva samostatné tvary | ořez sedí | neořízne (1400 místo 600) |

### Opravené chybné měření

Dřívější průzkum tvrdil, že Pathfinder rozbíjí compound path a selhává na víc
tvarech. **Obojí byl artefakt vadného testu:**

- compound path se skládal ručně přes `compoundPathItems.add()` plus
  `moveToBeginning`. To **nevytvoří** even-odd strukturu — vizuální kontrola
  ukázala plný kruh s kružnicí nakreslenou navrch. `compoundPathItems.length`
  přesto hlásilo 1. Správně je vybrat cesty a zavolat
  `executeMenuCommand("compoundPath")`.
- testoval se `Intersect`, ne `Subtract`.

**Poučení nad rámec tohoto nástroje:** u geometrické operace nestačí změřit
čísla, musí se na výsledek podívat. `rightmost = 600` vypadalo jako úspěch
i tam, kde díra nikdy neexistovala. Sondy v §8 proto exportují PNG.

### Bézierovy body

Čtení i zápis `anchor`, `leftDirection`, `rightDirection` funguje; cesta
postavená od nuly má bounds identické s originálem na setiny bodu. Vlastní
dělení cesty je tedy proveditelné — zůstává ale **záložní variantou** (§4).

## 3. Architektura

Zünd režim je **přepínač uvnitř `tile-export`**, ne nový nástroj. Plátování,
dočasný dokument na plát, přídavky, přelep i export už existují a Zünd je jen
další obsah, který v tom dočasném dokumentu vznikne.

### Sdílené jádro se otevírá

`ZSM.Core.calculateAll(s, bounds)` se přesune do
`shared/lib/cut_marks.js` jako namespace-neutrální factory `buildCutMarks(NS)`,
stejným vzorem jako `ui_state.js`. Volá se per nástroj po jejích závislostech.

**Proč se po roce otevírá to, co `docs/decisions.md` uzavřelo:** geometrie
značek je čistá matematika bez DOM a chyba v pozici značky je chyba v obou
nástrojích. To je kritérium „oprav jednou platí i tam" — a na něm dřívější
návrhy na rozšíření sdíleného jádra pohořely, protože měřily textovou podobnost
místo tohohle. Tady obstojí.

**Kreslení sdílené není.** `ZSM.Draw` je provázaný se správou řezacích vrstev,
kterou tile-export nemá a nepotřebuje.

## 4. Dělení kontury

**Kontura je identifikována přímou barvou**, vrstva nehraje roli — stejný
mechanismus, jakým ZSM přesouvá cesty na řezací vrstvy.

**Ořezová data plátu = kontura minus všechno mimo obdélník plátu.**

Pro každý plát v jeho dočasném dokumentu:

1. **přenést kompletní konturu** — `pathItem.duplicate(targetLayer,
   ElementPlacement.PLACEATEND)` napříč dokumenty. Ověřeno na reálné kontuře
   (56 bodů, přímá barva `cut`): funguje, **zachová přímou barvu**, nevytváří
   duplicitní swatche a duplikát přežije zavření zdroje.

   **Past:** `duplicate()` zachová pozici **vůči středu artboardu**, ne
   absolutně. Naměřeno: kontura na `x = 44…815` ve zdroji se v cíli s poloviční
   šířkou objevila na `−168…603`, tedy posunutá o 212,5 pt — přesně rozdíl
   středů obou artboardů. Při shodných artboardech je posun nulový.

   Implementace proto **posun nepředpovídá, ale měří**: po duplikaci se přečtou
   `geometricBounds` kopie a posune se tam, kam patří podle téže transformace,
   jakou dostane grafika. To je odolné vůči tomu, jak Illustrator pozici počítá.
2. dočasně jí dát výplň — Pathfinder pracuje s plochami, ne s obrysy
3. nakreslit **zakrývající rám** a dát ho navrch
4. `group` → `Live Pathfinder Subtract` → `expandStyle`
5. vrátit obrys, zrušit výplň, obnovit přímou barvu

**Zakrývající rám je jeden compound path**, ne čtyři obdélníky: velký obdélník
přesahující všechno, plus obdélník plátu jako díra, spojené přes
`executeMenuCommand("compoundPath")`. Odečte přesně to, co leží mimo plát,
a nevznikají překryvy v rozích, které čtyři samostatné obdélníky mají.

**Hranice plátu je `expanded` rect**, tedy včetně přídavků a přelepu. Tím je
chování na švu určené přelepem a **žádný nový parametr nevzniká**: přelep 0 dá
pláty natupo, přelep 20 mm dá překryv.

**Spad za konturou nástroj neřeší.** Je součástí dodaných dat, nekontroluje se,
nedokresluje se.

**Rovný ořez není zvláštní případ ani ústupová pozice** — obdélníkový výřez je
jen jednoduchý tvar a projde toutéž cestou. Kdyby Pathfinder u tvarového ořezu
v praxi zlobil, rovný ořez funguje dál, protože kontura plátu je pak prostě
obdélník.

**Záložní varianta**, kdyby se Pathfinder ukázal jako slepá ulička: vlastní
clipping proti polorovině (návrh uživatele) — najít průsečík Bézierovy křivky
s přímkou, rozdělit v něm segment de Casteljauem, zahodit vnějšek, uzavřít
podél hranice. Odhadem 300–500 řádků, zato plně testovatelné bez Illustratoru.
Sáhne se po něm až po doloženém selhání, ne preventivně.

## 5. Regmarky

Počítají se ze sdíleného `buildCutMarks(TE)` s bounds **expanded rectu plátu**,
v jeho dočasném dokumentu. Značky tak sedí na plát, ne na celou grafiku.

**Artboard plátu musí v Zünd režimu vyrůst.** Značky leží *vně* plátu —
naměřeno: při odstupu 10 mm a značce 5 mm sahají 42,5 pt za každou hranu.
Sdílená geometrie proto vrací i `geo.ab`, artboard, který je pojme; `exportTile`
jím po nakreslení značek artboard přepíše. Bez toho by se značky do PDF vůbec
nedostaly.

Důsledek: **MediaBox plátu je v Zünd režimu větší než plát sám.** Červená linka
zůstává na hranici plátu, tedy nově uvnitř většího MediaBoxu — to je správně,
protože označuje ořez, ne okraj stránky.

Parametry převzaté z `ZSM.Config`: velikost značky, odstup od okraje, maximální
rozteč, vzdálenost orientačního bodu.

## 6. Dialog

Zünd panel jde do **pravého sloupce**, a sloupce se přerozdělí podle
naměřených výšek: vlevo Předvolby 57 + Dokument 86 + Dělení 177 + Přelep 214
= 534 px, vpravo Export 276 + Zünd 165 = 441 px. Pole Výsledku se zkrátí ze 120
na 85 px. Výsledek: **796 px v obou stavech**, uvnitř použitelné výšky.

**Dynamické skrývání panelu nefunguje a nepočítá se s ním.** ScriptUI drží místo
i pro neviditelnou skupinu; naměřeno, že přepnutí `visible` i zastropování
`maximumSize.height` pohnou dialogem o 0 px. Skrývání zůstalo jen proto, aby
zašedlá Zünd pole nerušila, když je režim vypnutý — ne kvůli výšce.

Obsah panelu: přímá barva kontury (dropdown ze swatchů dokumentu) a parametry
značek z §5.

## 7. Chybové stavy

| Situace | Reakce |
|---|---|
| přímá barva kontury v dokumentu není | **chyba před během**, ne až u pátého plátu |
| kontura do plátu nezasahuje | není chyba — plát legitimně nemá řez; **patří do souhrnu**, protože tichý plát bez ořezu je na stroji nepříjemné překvapení |
| Pathfinder selže | chyba s číslem plátu; nejpravděpodobnější místo selhání, protože `executeMenuCommand` závisí na stavu, který nejde předem ověřit |

## 8. Testování a kde má díru

**Pod Node testy:**

- geometrie značek — **převzaté testy z `zund-summa-marks`**, které už existují
  a po přesunu do sdíleného jádra pokryjí oba nástroje
- detekce kontury podle přímé barvy — pod mockem, jako `TE.Doc`

**Mimo Node testy — a je to skutečné oslabení proti v1:**

Dělení kontury stojí na `executeMenuCommand`, tedy na běžícím Illustratoru.
Ověřuje se sondami, které **musí exportovat PNG a někdo se na něj musí
podívat** — viz poučení v §2. Jádro v2 tak bude ověřitelné jen ručně, zatímco
v1 měla geometrii celou pod testy.

Sondy pokryjí: jeden tvar, compound path s dírou, víc samostatných tvarů, tvar
zcela mimo plát, tvar přesně na hranici plátu.

## 9. Otevřené body

| Co | Proč |
|---|---|
| **Reálná ořezová data** | Vše měřeno na syntetickém prstenci. Dnešek ukázal, jak snadno syntetický test svede na scestí — než se na tom postaví implementace, je potřeba jeden skutečný tvarový ořez s dírou nebo děrováním |
| Chování `expandStyle` u víc cest naráz | Měřeno na jednom a dvou tvarech; u desítek cest se struktura výsledku může lišit |
| Kolik spotů `duplicate()` do cíle skutečně přenese | Sonda ukázala, že barva duplikátu je správná, ale `spots` v cíli obsahovaly po operaci nečekanou sadu. Před implementací ověřit, že se nevytváří duplicitní swatche |
| Orientační bod per plát | ZSM ho kreslí jednou pro celou grafiku. Jestli má mít každý plát vlastní, nebo jen první, není rozhodnuto |

## 10. Další etapa — tvarové pláty podle reálného postupu

**Tohle je nejbližší a nejdůležitější pokračování.** Verze popsaná výš dělá
obdélníkové pláty; postup používaný v praxi je jiný a je popsán níž tak, aby
se k němu dalo vrátit bez dalšího vyptávání.

### Maska je nutná i pro ROVNÝ ořez

Zásadní zjištění (2026-09-14), které mění vyznění celé implementované verze:

**Na rozděleném plátu pokračuje motiv přes šev.** Grafika tam sahá až k hraně
plátu a dál, takže na té straně **není kam umístit značky** — registrační značka
potřebuje kolem sebe prázdné místo, aby ji stroj přečetl.

Odsazená cesta jako maska tedy není jen věc tvarového ořezu. **Je nutná i pro
rovný ořez**, protože je to ona, kdo motiv na švu ukončí a uvolní pás pro
značky.

Důsledek: implementovaná verze (obdélníkové pláty, grafika sahající k hraně)
**neumí umístit značky na stranu, kde plát navazuje na soused**. Je použitelná
jen tam, kde plát žádného souseda nemá — tedy prakticky nikde, protože kdyby
neměl, neplátoval by se.

### Jak postup vypadá

Pro každý plát:

1. Rozdělenou konturu plátu vzít a udělat z ní **odsazenou cestu ven o spad**
   (typicky 5 mm).
2. Tou odsazenou cestou **oříznout grafiku clipping maskou**. Grafika plátu
   tedy **není obdélník**, ale tvar kontury plus spad.
3. Masku i ořezovou cestu přenést do nového dokumentu.
4. **Artboard přizpůsobit grafice**, pak zvětšit o 20 mm na šířku i výšku.
   Těch 20 mm není konstanta — je to důsledek parametrů značky: 5 mm odstup od
   grafiky plus 5 mm značka na každé straně. ZSM tohle už počítá a vrací
   `geo.ab`, takže žádný nový parametr nevzniká.
5. Po obvodu rozmístit regmarky.
6. **Vypnout vrstvu s ořezovou cestou** → uložit **tiskové PDF**.
7. **Smazat vrstvu s grafikou**, zůstanou regmarky a cut → uložit **řezací PDF**
   se suffixem `_cut`.

Dva výstupy na plát, ne jeden. Artboard je pro obě stejný, jinak by stroj
nevěděl, kde je co.

### Čím se to liší od implementované verze

| | implementováno | reálný postup |
|---|---|---|
| tvar grafiky na plátu | obdélník plátu | kontura + spad, přes clipping mask |
| artboard | plát rozšířený o značky | bounding box oříznuté grafiky, pak značky |
| výstupy na plát | jeden PDF | dva — tiskový a `_cut` |
| spad za konturou | neřeší se | parametr, vytváří se odsazením cesty |

Tvarový plát šetří materiál i barvu: u výřezu s velkými prázdnými plochami je
bounding box oříznuté grafiky výrazně menší než obdélník plátu.

### Co je pro to hotové

- **Dělení kontury na pláty** (`TE.Cut.renderTileContour`) — ověřeno na reálné
  kontuře, včetně prostředního plátu ořezávaného z obou stran.
- **Detekce kontury podle přímé barvy** (`TE.Cut.findContour`).
- **Sdílená geometrie značek** včetně `geo.ab`.
- **Dialog** — přibude parametr spadu a změní se výchozí odstup značky.

### Odsazená cesta — naměřeno, klíčová překážka je vyřešená

`executeMenuCommand("Live Offset Path")` existuje, ale **hodnotu předat neumí**
a aplikuje se s nulou. Panelový `Offset Path` neexistuje. Parametrizovaně to
jde přes Live Effect XML:

```js
item.applyEffect('<LiveEffect name="Adobe Offset Path">'
               + '<Dict data="R mlim 10 R ofst ' + offsetPt + ' I jntp 0 "/>'
               + '</LiveEffect>');
app.executeMenuCommand("expandStyle");   // efekt -> skutečná geometrie
```

`jntp` naměřeno na šesticípé hvězdě při offsetu 5 mm: **0 = zaoblený roh, dá
přesně 14,17 pt**; 1 = uříznutý (10,90 pt, ubírá); 2 = prodloužená špička
(35,48 pt, přidává). Kontrola na kruhu dala 14,17 pt vždy. **Pro ořezovou
konturu `jntp 0`.**

### Co zbývá vyřešit

- Jak se vrstvy pojmenují a jak se pozná, která je která při druhém uložení.
- ~~Barva značek jako vlastní parametr~~ — **vyřešeno 2026-09-14.**
  `s.markColor` s kaskádou: definice přenesená ze zdroje se v dočasném
  dokumentu obnoví, jinak pojmenovaný swatch, jinak registrační. Nikdy se
  nevytvoří barva, kterou uživatel nezadal. Registrační swatch se čte jako
  `swatches[1]`, protože jeho jméno je lokalizované.
- Jestli je bounding box brát z `visibleBounds` nebo `geometricBounds` oříznuté
  skupiny — u clipnuté skupiny se liší, viz skill `manipulating-illustrator-items`.
- Chování, když kontura po odsazení přeteče přes sousední plát.

## 11. Dál za tím

1. **Víc řezacích vrstev najednou** — proříz, ryl a děrování jako samostatné
   přímé barvy, po vzoru tabulky vrstev v ZSM.
2. **Summa** — stejná cesta, jiná geometrie značek; sdílené jádro už je na místě.
3. **2D mřížka** — pořád otevřená z v1.
