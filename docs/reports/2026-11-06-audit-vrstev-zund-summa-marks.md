# Audit ZSM: práce s vrstvami a výrobní praxe

Zünd & Summa Marks, stav větve `feat/zund-summa-marks-1.3.0`, commit `58fcaab`
(test build 1.3.0b). Čísla řádků platí pro tento commit. Audit nic v kódu nemění.

## Jak číst tento report

Každé tvrzení nese značku původu:

| Značka | Co znamená |
|---|---|
| **Ž** | naměřeno živě v Illustratoru dříve (`docs/extendscript-engine-facts.md`, AI 30.8.x) |
| **S** | simulováno dnes: skutečný kód ZSM 1.3.0b nad simulací Illustratoru z `tests/lib/mock_illustrator.js` |
| **K** | přečteno z kódu |
| **V** | dokumentace výrobce (Zünd, Summa, Adobe) |
| **T** | třetí strana: školní laboratoř, RIP, fórum. Místní zvyklost, ne specifikace |
| **Z** | můj technický závěr |
| **N** | neověřeno |

Meze metody:

- Dnes jsem **v Illustratoru nic nespustil**, protože v něm byly otevřené tři
  vaše dokumenty. Zkoušky naživo jsou v plánu jako fáze 0.
- Simulace neumí pořadí vrstev (`Layer.move` v ní nic nedělá). Pořadí v tomto
  reportu proto beru z kódu a z ručního testu, ne ze simulace.
- Na stroji jsem nic nezkoušel. Podle záznamu z 2026-09-28 jste prošel celý ruční
  test verze 1.1, jehož součástí je sekce 5 „U stroje“: Zünd načte značky a ořízne
  podle Cut, Summa najde OPOS pruh i značky. To je nejsilnější důkaz o kompatibilitě,
  který mám, ale platí pro váš postup a stroje, které neznám v detailu (viz §8).
- Čísla Illustratoru v §2 a §3 platí pro verzi 30.8.x, CS6 ani Windows nejsou změřené.

## 1. Shrnutí současného stavu

ZSM dělá dobře to, co dělá viditelně: značky mají správnou geometrii, opakovaný
běh je stabilní (S: běhy Z, Z, S, S, Z dávají stejné artboardy a počty značek),
cizí obsah v Regmarks a Trim chrání a zamítnutý běh dokument nezmění. Předchozí
review opravilo hrubé chyby a dost na tom záleželo.

**Slabina je to, co skript neřekne.** Všech pět kritických nálezů má společný
vzorec: běh skončí bez hlášky a výrobní data jsou špatně.

1. Řezová barva bez řádku v mapování zůstane v tiskové vrstvě, stroj ji neřízne (L1).
2. Druhý řádek se stejným názvem vrstvy se tiše zahodí (L2).
3. Jeden nečitelný objekt tiše zastaví přesun všech dalších cest (L3).
4. Po běhu Zünd je aktivní podvrstva značek. Co do ní operátor přidá, další běh
   smaže bez hlášky (L4).
5. Vrstva se jménem začínajícím závorkou se měří jen podle prvního objektu, značky
   pak mohou ležet přes grafiku (L5).

Opravy jsou malé, žádná z nich nevyžaduje přestavbu. Doporučuji je přidat do
ještě nevydané 1.3.0.

Kompatibilita se Zündem a Summou je v podstatě v pořádku, protože struktura
Regmarks + jedna vrstva na metodu odpovídá tomu, co obě strany popisují. Otevřené
jsou tři odchylky od manuálů, které u vás na stroji fungují, ale jinde nemusí
(pruh 3 mm, rozteč 500 mm, výraz „Register“), a chybějící návod k předání dat.

## 2. Technická analýza zdrojového kódu

Rozsah: 4 314 řádků ve vlastních modulech, plus sdílené jádro.

| Modul | Řádků | Úloha |
|---|---|---|
| `src/main.js` | 136 | řízení běhu: dialog, kontrola vyhrazených jmen, zámky, počátek pravítek, měření, kreslení, zápis měřítka |
| `src/ui.js` | 1 674 | dialog, předvolby, živá validace, stavový řádek |
| `src/draw.js` | 1 302 | všechny zásahy do dokumentu: vrstvy, přesun cest, značky, Trim, barvy |
| `src/lib/bounds.js` | 310 | měření grafiky, jen čte (až na zrušení výběru, `:51`) |
| `src/lib/validation.js`, `storage.js`, `utils.js` | 506 | čísla, nastavení, převody |
| `shared/lib/cut_marks.js` | 281 | geometrie značek bez DOM, sdílená s Tile Exportem |
| `shared/lib/registration.js`, `drawing_scale.js`, `numbers.js`, `field_paint.js`, `ui_state.js`, `json2.js` | | registrace podle typu, měřítko v XMP, čísla, barvy polí, předvolby, JSON |

Běh (`main.js`, K):

```
UI.show → reservedMappingName → beginSession (odemkne vrstvy) → rulerOrigin = [0,0]
→ Bounds.get → Core.calculateAll → findMarkConflict v render → render → endSession
```

`render` (`draw.js:96`) dělá v tomto pořadí: artboard, Regmarks a podvrstva režimu,
přesun cest, čištění prázdných vrstev, Spot 1, značky, pruh, Trim, přejmenování na
Graphics, hlášky.

Závislosti na verzi a API Illustratoru (K, V):

| Závislost | Kde | Riziko |
|---|---|---|
| ExtendScript (ES3) | celý skript | Adobe staví nové rozhraní (UXP); pro Illustrator termín neznám (N) |
| `doc.layers`, `layer.layers`, `pageItems`, `pathItems`, `compoundPathItems` | `draw.js`, `bounds.js` | stabilní API |
| `doc.pathItems` se aktualizuje až po `redraw` (Ž) | `draw.js:961` | kód proto volá `redraw` před přesunem, když maže podvrstvu |
| `Layer.move`, `zOrder`, `doc.activeLayer` | `draw.js:245, 285, 356, 552` | `layers.add()` s aktivní podvrstvou má padat, viz L12 |
| `doc.spots.add` + `ColorModel.SPOT` (Ž) | `draw.js:1070` | u nové barvy neměřeno, jestli je hned mezi vzorníky |
| `app.coordinateSystem` | `main.js:26` | zachyceno pro CS6 |
| `pageItem.note` (Ž) | `draw.js` Trim | značky razítko nemají (L4) |
| `getByName` nenajde podvrstvu (Ž) | `draw.js:828` | proto jdou mapovat jen vrstvy nejvyšší úrovně |
| Velikost písmen a duplicity v `getByName` | `draw.js:828` | neměřeno (N) |

README uvádí „CC 2024+ (v28.x) nebo CC 2025 (v29.x)“, měřeno je ale na 30.8.x. To
je zastaralý údaj (L28).

Co v kódu **není** vůbec (K, grep v `src/`): `layer.printable`, `layer.isTemplate`,
`artboards.length`, čtení výběru a modul průběhu (`tools/build.sh:12` ho nesestavuje).

## 3. Vyhodnocení práce s Illustrator Layers

Všechny operace nad vrstvami (K):

| Operace | Co | Kde | Hlásí to? |
|---|---|---|---|
| Vytvoří | `Regmarks` (`getLay`), podvrstvu `Zünd` nebo `Summa` | `draw.js:166, 236` | ne |
| Vytvoří | vrstvu z řádku mapování, i když se nic nepřesune | `draw.js:279` | jen „nic se nepřesunulo“ |
| Vytvoří | `Trim` nahoře (jen SUMMA s linkami) | `draw.js:570` | ne |
| Odemkne a zase zamkne | všechny vrstvy nejvyšší úrovně kromě systémových | `draw.js:22, 44` | ne |
| Zviditelní | `Regmarks`, `Trim`, vrstvu z mapování | `draw.js:828` | ano |
| Přesune vrstvu | `Regmarks` nahoru, vrstvy z mapování hned pod ni, v pořadí řádků | `draw.js:245, 285` | ne |
| Přesune objekty | cesty čistě v řezové barvě do vrstvy řádku, zapne přetisk | `draw.js:905–1006` | jen výjimky |
| Přejmenuje | spodní viditelnou nenamapovanou vrstvu na `Graphics`, jen když žádná Graphics není | `draw.js:429–450` | ne |
| Smaže | svou podvrstvu režimu; v běhu Zünd i podvrstvu Summa | `draw.js:197, 213, 656` | Summa ano, vlastní ne |
| Smaže | své linky v Trim, případně celou Trim bez cizího obsahu | `draw.js:591` | cizí obsah ano |
| Smaže | každou prázdnou viditelnou nenamapovanou vrstvu | `draw.js:311–333` | ne |
| Nesahá | na objekty uživatele (nemaže), na skryté vrstvy (kromě výše), na `<…>` a `(…)` | | |

Co je v pořádku a stojí za zachování:

- **Cesty uživatele nikdy nemaže** a přesouvá jen ty čistě v řezové barvě. Objekt
  s tiskovou výplní nechá na místě a ohlásí (S, scénář 6). Tím se odstranila
  nejhorší výrobní chyba z minulého review (K1).
- **Režim „Pouze značky“** nesahá na vrstvy uživatele (S, scénář 5b). Je to správná
  volba pro dokument, který má operátor roztříděný.
- **Cizí obsah** v Regmarks a Trim zůstane a běh ho spočítá (S, scénář 8a).
- **Hlášky o zbylých cestách** v masce, v zamčené a ve skryté vrstvě jsou přesné
  (S, scénáře 3, 4a).
- **Odmítnutí před změnou:** kolize značek a neplatná geometrie zastaví běh dřív,
  než se dokument změní.
- **Zpět** je zdokumentované a počty kroků změřené (Ž).

Slabiny jsou v §6. Tři zásady, které z nich vyplývají:

1. **Skript je spolehlivý v hlášení výjimek, ale ne v hlášení výsledku.** Nikdy
   neřekne „přesunul jsem 14 cest do Thru-cut a smazal vrstvu Poznámky“.
2. **Rozpoznává své vrstvy jen podle přesného jména na nejvyšší úrovni.** Cokoli
   jiného je pro něj grafika (L5, L10).
3. **Podvrstva značek patří skriptu celá,** ale po běhu Zünd je aktivní (L4).

Předchozí nálezy V1–V5: V1 (mazání prázdných vrstev) jste rozhodl 2026-11-06:
mazání opravdu prázdných vrstev je v pořádku, a to i zamčených. Chování pojišťuje
test, proto ho tady znovu neotvírám. V3 (přeskládání namapovaných vrstev) je záměr.
V4 je dnes L4. V5 je L17 a L30.

## 4. Vyhodnocení z pohledu DTP a velkoformátové výroby

### 4.1 Dvanáct rizikových situací

Úplné výstupy simulace jsou v archivu (viz §10).

**1. Jedna vrstva** (S)
- Očekávané: grafika zůstane, řez do vlastní vrstvy, značky nahoře.
- Skutečné: `Regmarks › Zünd`, `Thru-cut`, `Graphics`. Přesně tak. Bez hlášky.
- Problém: žádný.
- Dopad: základní případ je v pořádku.
- Řešení: nic.

**2. Několik vrstev s různými objekty** (S)
- Očekávané: řez se oddělí, ostatní vrstvy zůstanou, jak jsou.
- Skutečné: řez se oddělí, `Texty` a `Foto` zůstanou, spodní `Podklad` se přejmenuje
  na `Graphics`, prázdná `Řez` zmizí.
- Problém: jméno `Podklad` se ztratí a jen jedna z vrstev s grafikou se jmenuje
  Graphics. Nikdo to jméno nečte (vaše informace).
- Dopad: žádný na výrobu, jen orientace ve vrstvách.
- Řešení: L14.

**3. Vnořené vrstvy a skupiny** (S)
- Očekávané: řez se najde všude, struktura operátora zůstane.
- Skutečné: řezy z podvrstev i ze skupin se přesunou do vrstev nejvyšší úrovně,
  cesta z masky zůstane a je ohlášená. V `Zakázka › Řez` zůstane prázdná podvrstva.
- Problém: skupina přijde o člena a po přesunu zůstane prázdná podvrstva.
- Dopad: výrobně správně, organizace se změní. Pro zachování struktury je tu
  „Pouze značky“.
- Řešení: L27, zmínka v README.

**4. Zamčené a skryté vrstvy** (S)
- Očekávané: zámky se obnoví, co nejde přesunout, je ohlášené, skryté se netiskne.
- Skutečné: zámky se obnoví, řez ze skryté vrstvy a ze zamčené podvrstvy zůstane
  a je ohlášený. Skrytá vrstva `Poznámky` ale **zvětšila grafiku na 600 × 459 mm**
  a značky jsou kolem ní. O tom běh mlčí.
- Problém: L9. Nápověda to říká, ale v okamžiku běhu se o tom nedozvíte.
- Dopad: plýtvání materiálem, velký artboard, značky daleko od grafiky.
- Řešení: L9.

**5. Existující řezací kontury** (S)
- Očekávané: nic se nerozbije.
- Skutečné: běžný režim je najde a nechá ve správných vrstvách, jen přeskládá
  vrstvy podle řádků a zapne přetisk. „Pouze značky“ nesahá na nic.
- Problém: běžný režim nezmění jen značky, ale i pořadí a přetisk.
- Dopad: malý, je to očekávaná normalizace.
- Řešení: L15.

**6. Přímé barvy** (S)
- Očekávané: Pantone a bílá v grafice zůstanou, řez se oddělí.
- Skutečné: přesně tak. Řez s tiskovou výplní zůstane a je ohlášený.
- Problém: řez v procesní barvě nebo v umístěném PDF skript nevidí (K: `routeOf`
  čte jen `SpotColor`, `doc.pathItems` nesahá do umístěných souborů ani symbolů).
- Dopad: operátor to pozná jen podle hlášky „nic se nepřesunulo“, a jen když má
  na tu barvu řádek.
- Řešení: L22 (popsat), částečně L1.

**7. Více řezných operací** (S)
- Očekávané: každá operace ve své vrstvě, nebo varování.
- Skutečné: **řádek jen pro Thru-cut: Kiss-cut a Crease tiše zůstanou v Graphics.**
  **Řádky `Cut ← Thru-cut` a `Cut ← CutContour`: CutContour tiše zůstane v Graphics.**
- Problém: L1, L2. Výchozí předvolba má jediný řádek, takže L1 je běžný stav.
- Dopad: **chybná výrobní data:** operace se neprovede a kontura se může vytisknout.
- Řešení: L1, L2.

**8. Existující registrační značky** (S)
- Očekávané: staré značky se nahradí, nebo varování.
- Skutečné: ve vrstvě `Regmarks` přímo: zůstanou, varování s počtem. Ve vrstvě
  `Register`: **započítají se jako grafika** (114,7 mm místo 99,8 mm), zůstanou
  a varování **není**. Ve vnořené `Tisk › Regmarks`: totéž, bez varování.
- Problém: L10.
- Dopad: dvě sady značek na tisku. Stroj může číst špatnou (N).
- Řešení: L10.

**9. Duplicitní názvy vrstev** (S)
- Očekávané: nic se neztratí.
- Skutečné: dvě `Cut`: cesty se sjednotí do první, druhá zůstane prázdná. Dvě
  `Regmarks`: **ve druhé zůstanou staré značky, bez varování.** Dvě vrstvy
  stejného jména, jedna zamčená: **po běhu je zamčená ta druhá** (L17).
- Problém: L10, L17.
- Dopad: staré značky na tisku. Prohozený zámek chrání špatnou vrstvu.
- Řešení: L10, L17. GoSign má pro duplicity volbu „Combine layers with same name“ (V).

**10. Opakované spuštění** (S)
- Očekávané: stejný výsledek, žádné narůstání.
- Skutečné: běhy Z, Z, S, S, Z dají pokaždé stejný artboard a počty. Běh Zünd po
  Summa odstraní její výstup a řekne to.
- Problém: **cokoli přidané po běhu Zünd do aktivní podvrstvy další běh smaže** (L4).
- Dopad: chybějící objekt v tisku, bez hlášky.
- Řešení: L4.

**11. Nestandardní struktura** (S)
- Očekávané: skript buď správně změří, nebo řekne, že neumí.
- Skutečné:
  - Vrstva `(podklad zákazníka)` s objektem 423 mm: měří se jen první objekt,
    **značky ho neobejmou** (L5).
  - Název `Thru-cut ` s mezerou na konci projde a vznikne vrstva, kterou se stroj
    nemusí naučit (L13).
  - Spodní vrstva `Trim` se přejmenuje na Graphics a linky v ní pak zůstanou (L14).
  - Bludný bod 1 m od grafiky: artboard 1 080 × 1 079 mm, bez hlášky (L9).
  - Objekt zásuvného modulu přesahující grafiku: nezapočte se (L6).
- Problém: L5, L6, L9, L13, L14.
- Dopad: špatné umístění značek.
- Řešení: viz nálezy.

**12. Velké množství objektů** (K, Ž)
- Očekávané: běh doběhne, je vidět, že pracuje.
- Skutečné: běží bez odezvy. Změřeno: měření kresby 1 006 cest 15 ms, 5 026 cest
  0,25 s, 20 101 cest 3,9 s, roste kvadraticky (Ž, 1.2.0). Přesun cest (`movePaths`)
  měřený není. Čtení velkého pole je kvadratické a 300 000 prvků zablokovalo
  Illustrator na desítky minut (Ž, jiný test).
- Problém: L19. Navíc nečitelný objekt zastaví přesun (L3), a to je ve velkém
  a složitém dokumentu pravděpodobnější.
- Dopad: operátor neví, jestli Illustrator zamrzl. Vynucené ukončení ztrácí práci.
- Řešení: L19.

### 4.2 Typické postupy

| Postup | Hodnocení | Poznámka |
|---|---|---|
| Oddělení tisku, řezu a pomocných objektů | ✓ | hlavní přínos, ale L1 a L2 |
| Více řezných operací v jednom dokumentu | ✗ bez ručního nastavení | L1, L2; výchozí předvolba má jeden řádek |
| Značky pro kameru | ✓ | geometrie stabilní, 1:N změřené (Ž) |
| Poloha, měřítko, orientace objektů | ✓ | skript nehýbe grafikou, jen vrstvami; počátek pravítek ale změní (L11) |
| Opakované použití na různých zakázkách | ✓ s výhradou | předvolby fungují, chybějící barva je vidět jako „(chybí)“; prázdná vrstva L16 |
| Více artboardů | ✗ | skript je nerozlišuje, L8 |
| Plná grafika na spad v režimu Fixed | ✗ | značky přes grafiku bez varování, L7 |
| Soubor od zákazníka s neznámou strukturou | ✗ | L5, L6, L9, L10 |

### 4.3 Ergonomie a spolehlivost

| Otázka | Odpověď | Proč |
|---|---|---|
| Je ovládání jednoznačné? | Většinou ano | Dialog je srozumitelný, stavový řádek říká důvod šedého tlačítka. Nejasné je, že pořadí řádků určuje pořadí vrstev (L15) |
| Jsou operace předvídatelné? | Částečně | Značky ano. Přejmenování, přeskládání a mazání prázdných vrstev se děje mimo dohled (L11) |
| Informuje o změnách? | **Ne** | Úspěšný běh neřekne nic. Hlásí jen výjimky (L11) |
| Zvládne chybný dokument? | Částečně | Nekonečná čísla, velký artboard a kolize zastaví. Závorková vrstva, plugin objekt a nečitelný objekt projdou bez hlášky (L3, L5, L6, L18) |
| Jde to vrátit? | Ano, několika kroky | ZUND dva kroky, SUMMA čtyři, změřeno a popsáno (Ž). Měřítko v XMP a počátek pravítek Zpět nevrátí |
| Přepisuje existující data? | Jen své | Výjimka L4; přejmenování a přeskládání vrstev jsou změna struktury |
| Vydrží opakované použití? | Ano | S potvrdilo stabilitu, výjimky L4 a L14 (Trim dole) |

## 5. Kompatibilita se Zünd a Summa

Co je čí vlastnost:

| Vrstva problému | Co určuje | Stav |
|---|---|---|
| **Illustrator** | vrstvy, podvrstvy, přímé barvy, přetisk | změřeno (Ž) |
| **Export do PDF** | Vrstvy do PDF jdou jen volbou „Create Acrobat Layers from Top-Level Layers“, která je dostupná pro kompatibilitu Acrobat 6 a vyšší. Podvrstvy se nepřenesou jako samostatné (V Adobe CS3, T) | **Z:** obsah `Regmarks › Zünd` skončí v PDF ve vrstvě `Regmarks`, živě neměřeno |
| **Zünd Cut Center a Summa GoSign** | jak přečtou názvy vrstev a barvy | viz níže |
| **Verze a konfigurace** | mapování metod, sada akcí, RIP | u vás neznámé, viz §8 |

### Zünd

Ověřené nebo doložené:

- **Oficiální seznam metod (V, Zünd Design Center 7.2, s. 21):** Register, Draw,
  Score, Crease, Kiss-cut, Punch, Drill, Engrave, V-cut, Bevel-cut, Thru-cut, Route.
  Každá metoda je přiřazená vrstvě s přímou barvou a cesty lze metodě přiřadit
  „pomocí vrstev nebo přímých barev“. ZSM tomu odpovídá: dává názvy vrstev **a**
  nechává přímé barvy na cestách. Nabídka v 1.3.0 má navíc Cut, CutContour
  a Perforation, které v tomto seznamu nejsou (L28).
- **Vrstva značek:** oficiální metoda se jmenuje **Register**, ne Regmarks. Laboratoř
  Harvard GSD uvádí jako přijímané aliasy „Camera, Regmark, Regmarks, Dots,
  Registration, Register, Reg“ (T). Jestli aliasy platí pro každý Cut Center,
  nebo jsou to místní nastavení, nevím (N). U vás značky stroj načetl.
- **Pořadí a podvrstvy (T, Harvard):** pořadí vrstev určuje pořadí operací, Register
  první. Barva a tloušťka čáry se nečtou. „Zünd Software does not recognize
  sub-layer information.“ ZSM dává Regmarks nahoru, to sedí. Podvrstva `Zünd` by
  v PDF neměla vadit (**Z**, viz export); při předání přímo jako AI je to
  neověřené (N).
- **Kamera ICC (V):** výrobce uvádí spolehlivé čtení i u nízkého kontrastu a lesklých
  materiálů. Velikost ani tvar značky na stránce nejsou. 5 mm ve ZSM je tedy neověřený
  výrobní údaj; Harvard používá černé tečky 1/4″, tedy 6,35 mm (T).
- **Barvy se mohou mapovat i bez vrstev:** PrintFactory mapuje přímé barvy pojmenované
  jako nástroje Zünd automaticky (T). ZSM oba způsoby zachovává.

Neověřeno (N): jak Cut Center čte podvrstvy z AI, jakou mezeru potřebuje kamera mezi
značkami (K7), jak se chová k orientační značce, co udělá se značkami Summa v téže
vrstvě Regmarks (běh Zünd + Summa), jestli čte bílé značky na černém materiálu.

### Summa

Ověřené nebo doložené (V, GoSign User Manual Rev 004):

- **Třídění při importu:** „The methods can be separated by layer name, by spot colour
  name, or by colour. We recommend using layers for PDF.“ (s. 27). Struktura ZSM tedy
  sedí na doporučený postup.
- **Neznámé vrstvy:** objekty v neznámých názvech vrstev jdou do horní vrstvy seznamu
  (s. 35) a neznámá metoda dostane nástroj **Kiss-cut** (s. 38). **Z:** vrstvy `Trim`
  a `Graphics` se mohou v GoSignu stát řeznými daty, když je neoznačíte „Exclude
  layers“ (s. 27). Viz L22.
- **Značky:** obvykle se poznají při importu, jinak je najde funkce Search regmarks;
  názvy vrstev jsou v ní citlivé na velikost písmen (s. 32).
- **„OPOS jobs cannot be rotated or mirrored.“** (s. 14) Orientace z dokumentu tedy
  platí, pootočení v RIPu je problém (**Z**).
- **Měřítko:** „Normal pdf export […] outputs files of max. 5 metres“ a měřítko
  z importu se nemá používat u PDF, které si měřítko nese samo (s. 26). Large Canvas
  dává PDF `/UserUnit` 10 (Ž), takže **Z:** v GoSignu faktor měřítka nepoužít dvakrát.
- **OPOS CAM** umí kulaté značky na libovolném místě (s. 39), standardní OPOS čte čtverce.

Odchylky od manuálu S Class 2 OPOS-CAM (V, s. 74):

| Parametr | Manuál | ZSM | Stav |
|---|---|---|---|
| Tloušťka čáry OPOS XY | „should be 1mm thick“ | 3 mm (`cut_marks.js:22`) | **odchylka**, u vás test 5.3 prošel |
| Vzdálenost středu značek od čáry | max. 20 mm | 0 mm (čára mezi značkami) | ✓ „between or above the front Y marks“ |
| Okraj mezi čárou a značkou | 10 mm | 10 mm na střed, 8,5 mm na hranu | ✓ / nejasné, co manuál měří |
| Bílé místo nad čárou | min. 3 mm | 10 mm | ✓ |
| Velikost značky | výchozí 3 mm (T, EFI, z výsledku hledání) | 3 mm | ✓ |
| Rozteč značek | „normally 20 cm“, větší = rychlejší, menší = přesnější (V, OPOS guide, ale jen z výsledku hledání) | **500 mm** výchozí | **odchylka**, ověřit |

Neověřeno (N): váš model Summy, jestli platí manuál S Class 2 i pro něj, jestli OPOS
senzor přečte bílé značky na černém (kalibruje se na černém vinylu s bílým podkladem,
V). PrintFactory nabízí bílou kolem značky (T), možná je to lepší postup než bílá
značka. Nezkoušel jsem.

Plugin Summa GoSign pro Illustrator podle výrobce od verze 26.3 na Windows nefunguje
(V, z výsledku hledání). Pokud je to obecný stav, ZSM má v provozu skutečnou roli.

## 6. Seznam nalezených problémů

Závažnost podle vašeho zadání. „Pravděp.“ je můj odhad, jak často to v běžném
provozu nastane.

### KRITICKÉ

| ID | Problém | Kde | Důkaz | Pravděp. |
|---|---|---|---|---|
| **L1** | **Řezová barva bez řádku v mapování tiše zůstane v tiskové vrstvě.** Výchozí předvolba má jeden řádek a seznam známých barev (`detectCutColors`) se při běhu nepoužívá | `draw.js:905` (`routeOf`), `:1149`; `ui.js:1366` | S 7a | vysoká |
| **L2** | **Druhý řádek se stejným názvem vrstvy se tiše zahodí** i s řezem. Dialog hlídá jen stejnou barvu, ne stejný název | `draw.js:276`; `ui.js:1192–1208` | S 7b | střední |
| **L3** | **Jeden nečitelný objekt tiše ukončí přesun všech dalších cest.** `routeOf` je mimo vnitřní `try`, vnější `catch` jen loguje a log je mimo ladění prázdný | `draw.js:905, :933, :969, :1006`; `utils.js:94` | S 12 | nízká |
| **L4** | **Po běhu Zünd zůstane aktivní `Regmarks › Zünd`.** Co tam operátor nakreslí nebo vloží, se nepočítá do grafiky a další běh to smaže bez hlášky. Počítadlo cizího obsahu do podvrstev režimu nevidí | `draw.js:356, :197, :776`; `bounds.js:97` | S 10b; Ž (ruční práce jde do `activeLayer`) | střední |
| **L5** | **Vrstva se jménem začínajícím `(` nebo `<` se měří podle prvního objektu.** Značky ji neobejmou. Předpoklad „závorka = maskovaná vrstva“ nikde nedoložený | `bounds.js:158–175, :224` | S 11a | nízká až střední |

### VYSOKÁ

| ID | Problém | Kde | Důkaz |
|---|---|---|---|
| **L6** | `PluginItem` a `NonNativeItem` přímo ve vrstvě se do grafiky nepočítají, ve skupině ano. Značky mohou padnout přes objekt | `bounds.js:167, 187` proti `:269` | S 11e; které objekty to jsou, měřit |
| **L7** | Fixed nekontroluje, jestli značky neleží na grafice. S přetiskem a bez bílého lemu | `bounds.js:44–47`; `cut_marks.js:133–138` | S 11f |
| **L8** | Více artboardů: Auto-fit změří celý dokument a roztáhne jen aktivní artboard, Fixed vidí jen aktivní. Bez varování | `bounds.js:44–47, :70`; `draw.js:142–149` | K |
| **L9** | Auto-fit počítá skryté a netiskové vrstvy, šablony, poznámky a bludné body a výsledný rozměr nikde neřekne. Navazuje na otevřený K4 | `bounds.js:35, :70–111` | S 4a, 11d |
| **L10** | Značky ve vrstvě `Register`, `Regmark`…, druhá `Regmarks` nebo vnořená `Regmarks`: staré značky zůstanou bez varování a v prvních dvou případech zvětší grafiku | `draw.js:166`; `bounds.js:87` | S 8b, 8c, 9b |
| **L11** | Úspěšný běh neoznámí nic: přesuny, smazané vrstvy, přejmenování, velikost artboardu ani změnu počátku pravítek. TE, BRE i BTE mají souhrn podle kánonu §12.5, ZSM ne | `draw.js:296–300, :333, :450`; `main.js:99` | K |
| **L12** | `layers.add()` s aktivní podvrstvou má podle komentáře v kódu padat na úrovni C++. Trim se proti tomu chrání, `getLay` ne. Otevře-li operátor dokument s aktivní podvrstvou, je první běh riziko | `draw.js:166, :832` proti `:546–552` | K, N: záměrně neměřeno, může shodit Illustrator |

### STŘEDNÍ

| ID | Problém | Kde | Důkaz |
|---|---|---|---|
| **L13** | Názvy v mapování se nečistí: mezera na konci projde. Vyhrazená jména se porovnávají přesně, `regmarks` projde | `ui.js:1010–1017`; `draw.js:809` | S 11c |
| **L14** | Přejmenování na Graphics přepíše pojmenovanou vrstvu, i když jméno nikdo nečte; spodní vlastní `Trim` s linkami taky | `draw.js:429–450` | S 2, 11c |
| **L15** | Pořadí řádků určuje pořadí vrstev a podle T i pořadí operací (prořez před kiss-cut je výrobní chyba). Není to nikde napsané a nejde to změnit jinak než smazáním řádku | `draw.js:285` | K, T |
| **L16** | Řádek, který nic nepřesunul, zanechá prázdnou vrstvu | `draw.js:279` | S 11b |
| **L17** | Dvě vrstvy stejného jména: zpětné zamčení zamkne špatnou | `draw.js:52–55` | S 9c |
| **L18** | Tiché `catch` při měření: nečitelný objekt se nezapočte a nikdo se to nedozví. Porušuje pravidlo repa | `bounds.js:99, 108, 172, 191, 202, 204, 276` | K |
| **L19** | Velký dokument bez odezvy; `movePaths` neměřený (K13). Sdílený modul průběhu existuje | `draw.js:905–1006`; `tools/build.sh:12` | Ž, K |
| **L20** | OPOS pruh 3 mm proti 1 mm v manuálu S Class 2 | `cut_marks.js:22, :185` | V; u vás funguje |
| **L21** | Výchozí rozteč 500 mm i pro Summa, manuál uvádí obvykle 20 cm; jedna hodnota pro oba režimy v jedné předvolbě | `config.js:53`; `ui.js:352` | V z hledání |
| **L22** | README neříká, jak data předat stroji: nastavení PDF, vrstvy pro GoSign, Exclude layers, řez v procesní barvě a v umístěném PDF | `README.md` | K, V |
| **L23** | Bílé značky Spot 1 na černém: čtení kamerou a OPOS není ověřené. Nová funkce 1.3.0 | `draw.js:1070` | N |
| **L24** | Zamčený objekt: přesun projde (Ž), zápis přetisku po něm možná ne. Pak by se přesunutá cesta hlásila jako „zůstala na místě“ | `draw.js:996` | N, změřit |

### NÍZKÁ

| ID | Problém | Kde |
|---|---|---|
| **L25** | Otevřené K18 (maska mimo `pageItems[0]`), K19 (tloušťka tahu a efekty se neměří); vnořená vodítka se měří | `bounds.js:256, 269` |
| **L26** | Cesta v závorkové vrstvě je ohlášená jako „v ořezové masce“ | `locale.js` `WARN_PATHS_SKIPPED`; `draw.js:941, 988` |
| **L27** | Prázdné podvrstvy po přesunu zůstanou, čištění jde jen po nejvyšší úrovni | `draw.js:325` |
| **L28** | Zastaralé údaje: požadavky v README; komentář tvrdí, že nabídka odpovídá ZDC 7.2, ale má i Cut, CutContour, Perforation | `README.md`; `draw.js:1259` |
| **L29** | `[Registration]` tiskne všechny separace, tedy až 400 % inkoustu; na nesavém materiálu to může rozmazat hranu značky (Z, N: záleží na RIPu, ověřit) | `config.js` `markColor` |
| **L30** | Mrtvá větev `SENDTOBACK`: vrstva je z definice spodní | `draw.js:463` |

## 7. Konkrétní návrhy na vylepšení

Každý návrh je malý a řeší reálný problém. Neplánuji přestavbu.

### KRITICKÉ

- **L1: Varování podle skutečných cest.** Při přesunu už skript čte barvu každé
  cesty. Stačí počítat cesty ve známých řezových barvách, které nemají řádek, a
  na konci říct: „V dokumentu je 12 cest v barvě Kiss-cut bez řádku v mapování.
  Zůstaly v grafice a stroj je neřízne.“ Není to výpis z palety, který jste
  odmítl v 1.2.0: hlásí jen barvy na skutečných cestách. Volitelně: `[Výchozí]`
  nabídne řádek pro každou nalezenou řezovou barvu.
- **L2: Sloučit, ne zahodit.** Kontrola `seenTargets` chránila před přesunem vrstvy
  na sebe sama, ne před dvěma barvami v jedné vrstvě. Doporučuji přesun vrstvy
  přeskočit, ale barvu do trasy přidat, takže `Cut ← Thru-cut` i `Cut ← CutContour`
  skončí v Cut. Alternativa je zablokovat to v dialogu, ale kombinace je legitimní.
- **L3: Selhání po objektech.** `routeOf` dát dovnitř vnitřního `try`, nečitelné
  objekty počítat a ohlásit. Přesun ostatních doběhne.
- **L4: Dvě pojistky.** (a) Na konci běhu vrátit aktivní vrstvu na vrstvu grafiky
  nebo nejvyšší vrstvu. (b) Značkám dát razítko do poznámky, jako mají linky Trim,
  a při obnově mazat jen své značky, cizí nechat a spočítat. (a) je pár řádků,
  (b) dotahuje vzor z K6. Razítko neumí staré značky, ty je potřeba poznat jinak.
- **L5: Zrušit závorkový odhad.** Měřit všechny objekty i ve vrstvách `(…)` a `<…>`.
  Pokud měření ukáže skutečnou maskovanou vrstvu, řešit ji přes `clipped`, ne přes
  jméno. Před úpravou zjistit, odkud pravidlo přišlo: co staré chování garantovalo.

### VYSOKÁ

- **L6:** Měřit i tyto objekty stejně jako ve skupině, s `try`. Nejdřív změřit, jaké
  typy to reálně jsou a jestli `geometricBounds` vrací smysluplný rozměr.
- **L7:** Ve Fixed při běhu (ne v dialogu) změřit grafiku a varovat: „Značky leží na
  grafice.“ Sekundy navíc při běhu jsou přijatelné.
- **L8:** Při více artboardech varovat. Auto-fit by měl říct, že měří celý dokument
  a mění jen aktivní artboard.
- **L9:** Minimum je rozměr grafiky a artboardu v souhrnu a varování, když skryté
  nebo netiskové vrstvy zvětšily rozměr. Změnu výpočtu (netiskové a šablony nepočítat)
  bych udělal až po vašem rozhodnutí: dnešní chování garantuje, že značky nepřekryjí
  **žádnou** grafiku.
- **L10:** Varovat při druhé `Regmarks`, při `Regmarks` v podvrstvě a při vrstvě s názvem
  ze seznamu aliasů (Register, Regmark, Reg, Registration, Camera, Dots). Nic nemazat.
- **L11:** Závěrečný souhrn podle kánonu §12.5, se sdíleným `shared/lib/summary.js`:
  přesuny po vrstvách, smazané a přejmenované vrstvy, artboard. Bez problému může být
  jen stavový text nebo krátké okno, aby každý běh nevyžadoval další klik. Tvar ještě
  chce vaše rozhodnutí.
- **L12:** Nastavit aktivní vrstvu na nejvyšší vrstvu dřív, než se cokoli přidá. Pár
  řádků a neublíží to. Sondu pouštět jen s vaším souhlasem, může shodit Illustrator;
  oprava ji nepotřebuje.

### STŘEDNÍ

- **L13:** Název ořezat při odeslání dialogu, vyhrazená jména porovnávat bez ohledu na
  velikost písmen.
- **L14:** Přejmenovat jen výchozí názvy (`Vrstva 1`, `Layer 1`, případně jiné jazyky).
  Vlastní jména nechat. `Trim` vyřadit vždy.
- **L15:** Napsat pořadí do README a do nápovědy tabulky. Tlačítka pro posun řádků až
  když se potvrdí, že na pořadí ve vašem Cut Center záleží.
- **L16:** Vrstvu, kterou běh sám založil a nic do ní nepřesunul, zase odstranit.
- **L17:** Držet odkaz na objekt vrstvy místo indexu a jména. `===` u vrstev funguje (Ž).
- **L18:** Počítat přeskočené objekty a ohlásit jejich počet.
- **L19:** Změřit `movePaths` na 20 000 a 100 000 cestách, zapojit `shared/lib/progress.js`
  a uložit délky kolekcí mimo smyčku.
- **L20, L21:** Rozhodnout po zkoušce na vašem stroji. Pokud 3 mm a 500 mm fungují
  spolehlivě, stačí zapsat do README, proč se liší od manuálu.
- **L22:** Přidat do README oddíl „Předání do stroje“: PDF s vrstvami z nejvyšší úrovně,
  kompatibilita Acrobat 6+, vrstvy pro GoSign včetně Exclude layers, co ZSM nevidí.
- **L23:** Otestovat na stroji před vydáním 1.3.0: bílá značka na černém, Zünd i Summa.
  Zkusit i černou značku na bílém podkladu, jako nabízí PrintFactory.
- **L24:** Změřit, případně přesunout zápis přetisku do vlastního `try`.

### NÍZKÁ

L25 až L30: opravit při nejbližší úpravě daného místa, samostatnou práci si nezaslouží.
L29 zjistit na stroji.

### Co nedoporučuji

- **Přestavbu dialogu a živý přehled.** Probrané minule, přínos neodpovídá riziku.
- **Přejmenování `Regmarks` na `Register` a `Zünd` na ASCII.** Běžící postup funguje.
  Jen když zkouška ukáže problém.
- **Automatické mazání cizích značek.** Skript je nemá jak bezpečně poznat.
- **Vlastní export PDF ze ZSM.** Patří do jiného nástroje nebo do předvolby.
- **Podporu podvrstev jako cíle mapování.** Podle T je Zünd stejně nečte.

## 8. Prioritizovaný plán

### Fáze 0: doplnit fakta (bez kódu)

Otázky na vás. Na nich závisí L15, L20, L21, L22 a váha §5:

1. Jak předáváte data do Zünd Cut Center: PDF, AI, nebo přes RIP? Jakou verzi, jaký stroj
   a kameru máte (ICC, OCC)?
2. Přiděluje Cut Center metody podle názvu vrstvy, nebo podle barvy? Záleží vám na pořadí?
3. Jaký model Summy, jaký OPOS (X, XY, CAM) a jak nastavený import v GoSignu?
4. Jaký RIP a jaká PDF předvolba? Je to PDF/X?
5. Běží někdy Zünd a Summa nad stejným dokumentem, nebo stačí jeden režim?
6. Tiskne se `[Registration]` opravdu všemi inkousty, nebo ji RIP mapuje jinak?

Zkoušky v Illustratoru, až nebudou otevřené dokumenty:

| Sonda | Odpověď na |
|---|---|
| `doc.spots.add()`: je barva hned mezi vzorníky, tint 100, RGB dokument, Zpět | 1.3.0 |
| Ruční kresba a vkládání po běhu Zünd: končí opravdu v podvrstvě? | L4 |
| `getByName`: velikost písmen, duplicity | L10, L13 |
| Typy `PluginItem`: prolnutí, obálka, živá malba; jejich `geometricBounds` | L6 |
| Přetisk na zamčeném objektu po přesunu | L24 |
| Čas běhu na 20 000 a 100 000 cestách | L19 |
| PDF z dokumentu s podvrstvami: jaké OCG v něm jsou | §5 |

Zkouška na stroji: bílé značky Spot 1 na černém materiálu, Zünd a Summa (L23).

### Fáze 1: do nevydané 1.3.0

L1, L2, L3, L4 (a), L5, L13. Malé opravy s testy, které zastaví tiché chyby. Protože 1.3.0
ještě neprošla ručním testem, stačí jedno kolo testování. Doporučuji ji kvůli tomu teď
nevydávat samostatně.

### Fáze 2: 1.4.0, spolehlivost a informovanost

L11 (souhrn) jako první, protože na něj navazují ostatní. Potom L6, L7, L8, L9, L10, L12,
L16, L17, L18, L4 (b). L9 a L14 po vašem rozhodnutí.

### Fáze 3: výkon a dokumentace

L19 po měření. L22 je možné napsat kdykoli a nezávisí na kódu. L15, L20, L21 podle výsledků
z fáze 0. L25 až L30 průběžně.

### Rozhodnutí, která potřebuji

| Bod | Otázka | Moje doporučení |
|---|---|---|
| L1 | Jen varování, nebo i víc řádků v `[Výchozí]`? | obojí, varování nejdřív |
| L2 | Sloučit barvy do jedné vrstvy, nebo blokovat? | sloučit |
| L4 | Stačí vrátit aktivní vrstvu, nebo i razítka značek? | teď vrátit, razítka v 1.4.0 |
| L9 | Má Auto-fit dál počítat skryté a netiskové vrstvy? | ano, ale varovat |
| L11 | Souhrn po každém běhu, nebo jen po změnách? | po každém, nejkratší možná forma |
| L14 | Přejmenovat jen výchozí názvy? | ano |
| Fáze 1 | Přidat L1–L5 a L13 do 1.3.0? | ano |

## 9. Zdroje

Výrobci:

- [Zünd Design Center v7.2, softwarový návod (de)](https://www.zund.com/media/1160/download/sal_ZDC_20250205_9_de-DE.pdf?v=8), s. 21 a 28
- [Summa GoSign User Manual Rev 004](https://download.airmark.com/user-manuals/gosign_rev004_en.pdf), s. 14, 26, 27, 32, 35, 37–39
- [Summa S Class 2 OPOS-CAM, kapitola OPOS XY](https://www.manualslib.com/manual/873863/Summa-S-Class-2-Opos-Cam.html?page=74)
- [Summa, Contour cutting with OPOS](https://www.summa.com/media/lccbhxat/opos20_en.pdf) (přímé otevření selhalo, citace z výsledku hledání)
- [Summa Support: GoSign plugin pro Illustrator](https://support.summa.eu/support/solutions/articles/43000737811-info-print-cut-for-legacy-roll-cutters-using-the-gosign-plugin-for-adobe-illustrator-to-create-fil) (z výsledku hledání)
- [Zünd ICC kamera](https://www.zund.com/en/cutting-systems/registration-methods/integrated-compact-color-camera)
- [Adobe Illustrator CS3 User Guide, volby PDF](https://www.manualsdir.com/manuals/753997/adobe-illustrator-cs3.html?page=288)

Třetí strany:

- [Harvard GSD: Zünd Overview](https://fablab.gsd.harvard.edu/zund-overview/), [Zünd File Prep](https://fablab.gsd.harvard.edu/places/zund-cutter/zund-file-prep/)
- [PrintFactory: Zünd Cut Center integration](https://support.printfactory.cloud/portal/en/kb/articles/printfactory-zund-cut-center-integration)
- [PrintPlanet: Zund cutter file setup](https://printplanet.com/forum/wide-format-and-inkjet/wide-format-and-inkjet-discussion/245197-zund-cutter-file-setup)
- [ONYX a Summa, pracovní postupy](https://www.uksignboards.com/wp-content/uploads/attachments/Adobe%20ONYX%20Summa%20Cutting%20Workflows%202016%20v1.pdf)
- [Adobe Community: PDF vrstvy a podvrstvy](https://community.adobe.com/questions-9/creating-a-pdf-with-layers-and-sublayers-1298104), [Macworld: vrstvy v PDF](https://www.macworld.com/article/169897/marchcreate.html)

Zdroje třetích stran popisují místní postupy a některé jsou staré. Oficiální návod
k Zünd Cut Center jsem veřejně nenašel. Za definitivní nelze považovat nic, co není
potvrzené na vašem stroji.

Dřívější reporty: [code review 2026-09-26](2026-09-26-code-review-zund-summa-marks.md),
[audit UI 2026-09-28](2026-09-28-audit-ui-zund-summa-marks.md).

## 10. Simulace

Skript a jeho výstup jsou mimo repo v `~/Dev/_archive/audit-zsm-vrstvy-2026-11-06/`
(`scenarios.js`, `vystup-simulace.txt`). Spouští se s cestou ke složce `zund-summa-marks`.
Buduje dokumenty přes `Mock.buildDoc` a volá v pořadí `main.js` funkce
`reservedMappingName`, `beginSession`, `getBounds`, `calculateAll`, `render`, `endSession`.
Dialog neprochází. Když se některý nález bude opravovat, patří jeho scénář jako regresní
test do `tests/test_draw_render.js`.
