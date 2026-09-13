# Návrh — Zünd režim pro tile-export

Rozšíření `tile-export` o přípravu plátů pro strojní přesný ořez na Zündu.
Navazuje na [v1](2026-09-13-tile-export-design.md).

Datum: 2026-09-13 · Stav: návrh, neschválený k implementaci

---

## 1. Problém

`tile-export` v1 řeší první ze dvou případů, kdy se ve studiu plátuje ručně:
nerovnoměrné dělení, kde se šev musí vyhnout textu. Tenhle návrh řeší **druhý**:
strojní přesný ořez, tvarový nebo rovný, kde každý plát potřebuje regmarky
a vlastní korektní ořezová data.

Dnešní ruční postup, popsaný uživatelem: zkopírovat celkovou konturu do
schránky, cestářem od ní odečíst zakrývající obdélník ve vhodném místě —
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
   ElementPlacement.PLACEATEND)` napříč dokumenty. Ověřeno: funguje, **zachová
   přímou barvu** a duplikát přežije zavření zdrojového dokumentu.
   Past: `duplicate()` zachová **absolutní** pozici, takže se kontura musí
   posunout toutéž transformací jako grafika — `TE.Export.tileTransform()`
   už ji počítá.
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

Parametry převzaté z `ZSM.Config`: velikost značky, odstup od okraje, maximální
rozteč, vzdálenost orientačního bodu.

## 6. Dialog

Zünd panel jde do **pravého sloupce** a je **viditelný jen když je režim
zapnutý**, s `win.layout.layout(true)` po přepnutí. Dialog v1 měří 767 px
a Zünd panel by přidal zhruba 150 px, tedy přes použitelnou výšku obrazovky.
Kdo Zünd nepoužívá, neplatí za něj místem.

Zároveň se pole Výsledku zkrátí ze 120 na 85 px.

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

## 10. Co přijde potom

1. **Víc řezacích vrstev najednou** — proříz, ryl a děrování jako samostatné
   přímé barvy, po vzoru tabulky vrstev v ZSM.
2. **Summa** — stejná cesta, jiná geometrie značek; sdílené jádro už bude na
   místě.
3. **2D mřížka** — pořád otevřená z v1.
