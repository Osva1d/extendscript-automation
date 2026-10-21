# Návrh — grommet-marks 1.4.0: měřítko kresby a rodinný jazyk

Nástroj: `grommet-marks`, namespace `GM`. Navazuje na vydání 1.3.0
(2026-10-17, tag `grommet-marks/v1.3.0`).

Datum: 2026-10-20 · Stav: **schváleno** (uživatel, 2026-10-21)

Vzniklo z rozhovoru 2026-10-20 (otázky uživateli, náhled dialogu ve dvou
variantách) a z rozhodnutí, která pro celou rodinu nástrojů už padla:
audit společného jazyka (`docs/reports/2026-10-14-audit-spolecneho-jazyka.md`,
rozhodnutí §8 z 2026-10-15), dodatečný audit
(`docs/reports/2026-10-17-dodatecny-audit-spolecneho-jazyka.md`, měřítko
„varianta C" z 2026-10-17) a kánon ve skillu `extendscript-ui-standards` §12
(dále jen **kánon**). Sdílené moduly v `shared/lib/` (`numbers.js`,
`field_paint.js`, `registration.js`, `drawing_scale.js`) už existují
a Tile Export 1.2.0 je používá — GM je převezme stejně.

---

## 1. Proč

**Měřítko kresby.** Bannery se občas kreslí zmenšeně, typicky 1:10. Uživatel
to dnes řeší ručně: **všechny** hodnoty v dialogu (velikost značky, tloušťky
tahů, rozestup, odsazení) před zadáním vydělí deseti. Funguje to, ale je to
přepočet v hlavě u každé hodnoty. Rodina rozhodla, že měřítko patří dokumentu
a hodnoty se zadávají ve skutečné velikosti, jako v Tile Exportu (audit §8
bod 5; dodatečný audit: varianta C, desetinné měřítko).

**Rodinný jazyk.** Audit 2026-10-14 §9 má pro GM „po merge 1.3.0" nálezy P4
(registrační barva), P5 (hvězdička), P8 (proč je Generovat šedé), P13
([Výchozí] z kódu), J3–J6 (věty předvoleb, titulek, šablona chyby,
typografie); dodatečný audit N1–N3 a N6 (převod čísel, desetinná čárka,
Uložit s neplatným polem).

**Zbytky z 1.3.0.** Uložená hodnota odsazení se mimo režim cesty
nekontroluje proti horní mezi; Uložit ukládá bez kontroly hodnot a po uložení
zůstane aktivní.

## 2. Cíle, ne-cíle, anti-cíle

**Cíle**

- Pole „Měřítko kresby 1:" — hodnoty v dialogu ve skutečné velikosti,
  skript je při kreslení vydělí.
- Šedý řádek pod Umístěním ukáže měřítko jiné než 1:1 a místo nálezu i důvod,
  proč je Generovat šedé.
- GM mluví a chová se podle kánonu §12 (čísla, předvolby, hlášky, titulek,
  slovník, registrace) a používá sdílené moduly.

**Ne-cíle**

- Pravidla rozmístění značek (hrany, cesta, rohy, zóny, kontrola výsledku)
  se nemění.
- Měřítko není v předvolbě, v `[Last Settings]` ani v `[Výchozí]` — patří
  dokumentu.
- Panel předvoleb se nesdílí s ostatními nástroji (audit §6: zatím jen
  sjednotit chování a věty).
- Ostatní nástroje (ZSM, BRE, TE) se v této verzi nemění; složka a soubor
  nastavení GM se nepřejmenují.

**Anti-cíle (neúspěch, i kdyby to technicky fungovalo)**

- Značky v nečekané velikosti, protože měřítko přišlo z dokumentu
  (například z Tile Exportu) a v dialogu nebylo dost vidět.
- Stará předvolba, která po aktualizaci kreslí jinak než v 1.3.0 při
  měřítku 1:1.
- Dialog, kterému se na 13" displeji uříznou tlačítka.

## 3. Rozhodnutí

| # | Rozhodnutí | Zdroj |
|---|---|---|
| 1 | Hodnoty v dialogu ve skutečné velikosti; skript **všechny délky** vydělí N, včetně velikosti značky a tloušťek tahů. | uživatel, 2026-10-20 („vše") |
| 2 | Měřítko patří dokumentu: klíč v XMP, který zapisuje Tile Export (`shared/lib/drawing_scale.js`); výchozí 1:1; desetinné (1:2,5). | rodina, 2026-10-15 a 2026-10-17 |
| 3 | Pole ve **variantě B**: vlastní řádek „Jednotky: … Měřítko kresby 1: …" v panelu Umístění; šířka dialogu zůstává. | uživatel, 2026-10-20 (náhled) |
| 4 | Šedý řádek: měřítko jiné než 1:1 na konci; **důvod šedého Generovat v šedém řádku** místo nálezu. | uživatel, 2026-10-20 |
| 5 | Vzdálenost středů značek se česky jmenuje **všude „Rozteč"** (dnes Rozestup na hranách a u cesty). | uživatel, 2026-10-20 |
| 6 | Kánon §12 (vykání, dvojtečky, „…", předpony, čísla, předvolby, titulek, registrace). | uživatel, 2026-10-15 a 2026-10-17 |
| 7 | Strop výšky dialogu jako u Tile Exportu (~850 px) místo dosavadních 795 px. | **moje volba**, §8 |

## 4. Měřítko kresby

### 4.1 Co se dělí

Každá délka z dialogu se při kreslení dělí N (a jako dnes faktorem
Large Canvas — oba přepočty se násobí):

- velikost značky, Reg. tah, Bílé halo;
- odsazení X/Y, rozteč na hranách, rozteč na cestě, odsazení od kraje
  u cesty, rozteč v rohových zónách.

Počty (Počet ok, počet značek v zóně) se nedělí. Tolerance, které žijí
v jednotkách dokumentu (`OFFSET_TOL`, `SEGMENT_EPS`, mřížka 0,1 pt pro
slučování shodných poloh v `GM.Main` a `GM.Core.placeAlong`), zůstávají
v jednotkách dokumentu — popisují přesnost Illustratoru, ne zadanou hodnotu.
Kontrola kryjících se značek (G4) bere velikost značky už přepočtenou, takže
se přizpůsobí sama.

**Moje volba (kontrola stavitele):** při velkém N a malém odsazení je
kontrola výsledku hrubší — odsazení 5 mm při 1:28 je v dokumentu 0,5 pt, tedy
tolik co `OFFSET_TOL`. Je to stejná mez jako dnes u odsazení 0,2 mm v 1:1
a přesnost Illustratoru se s měřítkem nemění; tolerance se proto nedělí N.
Horní mez N = 100 (§4.3) drží mřížku 0,1 pt pod vzdáleností reálných značek.

Měřítko 1:1 dává bajtově stejné polohy i velikosti jako 1.3.0 (regresní
test).

### 4.2 Kde žije hodnota

- Při otevření dialogu: `DrawingScale.load(doc)`; nic uloženého → 1.
- Po potvrzení dialogu (Generovat) se hodnota zapíše do dokumentu
  (`DrawingScale.save`), stejně jako v Tile Exportu (`tile-export/src/main.js`).
  **Moje volba:** zapisuje se jen tehdy, když se liší od přečtené hodnoty —
  dokument bez měřítka a s 1:1 se tím nemění.
- Do předvoleb ani do `[Last Settings]` se měřítko neukládá. Přepnutí
  předvolby ho nemění.
- Přepnutí jednotek (mm/cm/in) měřítko nemění.
- Dokument, kterému měřítko nastavil Tile Export, otevře GM s tímto
  měřítkem, a obráceně.
- Jestli zápis do XMP patří do téhož kroku Zpět jako běh, není změřené —
  stavitel změří a zapíše do `docs/extendscript-engine-facts.md`.

### 4.3 Pole

- Popisek **„Měřítko kresby 1:"** (CS), „Drawing scale 1:" (EN) — jako Tile
  Export (`LBL_SCALE`).
- Nápověda podle Tile Exportu (`TIP_SCALE`), upravená pro GM: dokument si
  měřítko pamatuje, hodnoty v dialogu se zadávají ve skutečné velikosti.
- Platné je číslo **od 1 do 100**, desetinné, převod podle §6.1; neplatné
  pole zčervená a zašedí Generovat i Uložit (§5, §6.4). **Moje volba
  (kontrola stavitele):** Tile Export a ZSM kreslí N menší než 1 jako 1:1
  (`manualScale`, `getEffectiveSF` — tiché ořezání), GM proto 1:0,5 nepřijme,
  aby dva nástroje nekreslily týž dokument jinak; kánon tichou náhradu
  zakazuje, takže pole zčervená. Horní mez 100 je pojistka proti překlepu
  (1:1000 místo 1:100) a drží tolerance z §4.1 v rozumných mezích; Tile Export
  horní mez nemá — dokument s větším N z Tile Exportu otevře GM s červeným
  polem.
- Zobrazení s desetinnou čárkou v češtině (`1:2,5` zůstane `2,5`).

### 4.4 Dialog (varianta B)

Panel Umístění má tři řádky:

1. Hrany artboardu · Vybraná cesta (beze změny),
2. **Jednotky: [Milimetry ▾]  Měřítko kresby 1: [__]** (jednotky se sem
   přesunou z prvního řádku),
3. šedý řádek (§5).

Šířka dialogu zůstává (CS 521 px). Výška přibude o jeden řádek — viz §8.

### 4.5 Kdy je měřítko „dost vidět" (anti-cíl 1)

**Moje volba (kontrola stavitele):** měřítko jiné než 1:1 je vidět na dvou
místech — v poli a na konci šedého řádku (§5). Barevné zvýraznění ani
upozornění na konci běhu se nepřidává (uživatel náhled se šedým řádkem
schválil). Ruční test K to ověří na dokumentu, kterému měřítko 1:10 zapsal
Tile Export.

### 4.6 Šedý řádek a velikost artboardu

V režimu Hrany artboardu ukazuje šedý řádek velikost artboardu. Při
měřítku 1:N ji ukáže **ve skutečné velikosti** (artboard × N), protože všechny
hodnoty v dialogu jsou ve skutečné velikosti — stejně jako „Čistý formát"
v Tile Exportu.

## 5. Šedý řádek

**Nález** jako v 1.3.0. Když měřítko není 1:1, připojí se na konec
`· měřítko 1:N` (N podle §6.1), v obou režimech:

- `1 artboard · 8 000 × 6 000 mm · měřítko 1:10`
- `Uzavřená cesta · 5 rohů · měřítko 1:10`

**Důvod šedého Generovat** (kánon §12.3, audit P8). Dokud Generovat nejde
stisknout, řádek místo nálezu ukáže důvod v barvě chyby kánonu (§12.6,
`field_paint`), se symbolem ✗. Po odstranění důvodu se vrátí nález. Pořadí,
když platí víc důvodů naráz:

1. jedno neplatné pole: `✗ <popisek pole bez dvojtečky>: <co je povolené>.`
   (například `✗ Velikost: zadejte číslo od 1 do 100 mm.` — skutečné
   rozsahy z `GM.Validation.rules`);
2. víc neplatných polí: `✗ Neplatná pole: 3 — opravte červená pole.`
   (číslo za dvojtečkou, kánon §12.1 Counts);
3. čísla jsou v pořádku, ale nevzniklo by nic: značka nemá tvar
   (`✗ Značka nemá tvar — zapněte Kruh nebo Kříž.`), v režimu Hrany artboardu
   není zapnutá žádná hrana (`✗ Není zapnutá žádná hrana.`).

Texty jsou návrh; stavitel je doladí podle kánonu. Nejdelší možný text řádku
se musí vejít do šířky řádku (dnes se počítá nejdelší nález,
`GM.UI.longestInfoText`).

## 6. Rodinný jazyk (kánon §12)

### 6.1 Čísla (N1, N2, N6)

- Převod textu pole přes sdílený `NS.Numbers.parse` (gramatika Tile Exportu):
  čárka i tečka, mezery okolo; cokoli jiného (`1e3`, `0x10`, `.5`, `1O5`,
  `1 000`, `20 mm`) je neplatné pole. Jeden převod slouží poli, živé
  kontrole i odeslání (dnes `GM.Validation.parseNumber`).
- Zápis hodnoty do pole přes `NS.Numbers.format` s oddělovačem z locale:
  česky `2,5` zůstane `2,5` i po dalším otevření.
- Klíč oddělovače v locale `DEC_SEP` (dnes `DECIMAL_SEP`; kánon §5).

### 6.2 Obarvení neplatného pole

Sdílený `field_paint.field` místo vlastního `paintField` (stejné chování,
jedna kopie pro rodinu).

### 6.3 Registrační barva (P4)

Sdílený `registration.swatch` hledá registraci podle typu v celém vzorníku
(dnes jen `swatches[1]`). Dokument bez registrace kreslí 100 % K jako dnes.

### 6.4 Předvolby (kánon §12.4, P5, P13, N3)

- Hvězdička jen u aktivní předvolby a při každé změně se přepíšou **všechny**
  položky seznamu (dnes zůstane u předchozí).
- `[Výchozí]` se při každém otevření sestaví z kódu (dnes jen bez souboru
  nastavení).
- Uložit a ↺ svítí jen s neuloženými změnami; **Uložit i Uložit jako… jsou
  šedé, dokud je některé pole neplatné**; po uložení Uložit zhasne (dnes
  zůstane aktivní). **Moje volba (kontrola stavitele):** „pole" jsou pole,
  která kontroluje živá kontrola (aktivní režim, povolená pole) — jako
  v Tile Exportu; šedé Uložit tak má vždy vidět důvod v šedém řádku.
  Neplatná hodnota ve skrytém poli (druhý režim) se do předvolby zapíše jako
  výchozí hodnota pole, stejně jako od 1.3.0 odsazení od kraje — předvolba
  nikdy neuloží hodnotu, kterou další otevření nepřečte.
- Rozvržení panelu podle šablony kánonu §9: ↺ ve vlastní skupině vedle
  seznamu, Uložit / Uložit jako… / Smazat v nativní šířce (dnes 92 px, na
  „Uložit jako…" je potřeba 103 px; dodatečný audit C9). Změní výšky a šířky
  z §8 — měřit spolu.
- Uložit na `[Výchozí]` otevře Uložit jako… (beze změny).
- Věty a klíče podle tabulky kánonu §12.4 (`PROMPT_SAVE_AS`,
  `CONFIRM_OVERWRITE_PRESET`, `CONFIRM_DELETE_PRESET`, `ERR_ENTER_NAME`,
  `ERR_RESERVED_NAME`, `ERR_CANNOT_DELETE_DEFAULT`); „předvolba", nikdy
  „nastavení".

### 6.5 Hlášky

- Předpony jen `CHYBA: ` (blokující chyba) a `UPOZORNĚNÍ: ` (upozornění na
  konci běhu); bez vykřičníků (dnes validace „…musí být číslo!").
- Názvy v hláškách v českých uvozovkách „…" (vrstva „Grommet Marks").
- Neočekávaná chyba šablonou kánonu §12.2 `ERR_CRITICAL` (řádek česky, stav
  dokumentu, komu poslat); dnes „Illustrator Grommet Marks: Neočekávaná
  chyba — … (line N)".
- Neuložené nastavení řekne následek (kánon §12.2).
- Hláška bez dokumentu beze změny (je vzorem kánonu).
- Hlášky z 1.3.0 (`ERR_OFFSET_*`) už kánon splňují, dostanou jen předponu.

### 6.6 Titulek a patička

Titulek **„Grommet Marks v1.4.0"** (kánon §12.7; dnes „Illustrator Grommet
Marks v…"). Patička beze změny („© 2025–2026 Ladislav Osvald · v…").

### 6.7 Slovník

- Česky **„Rozteč"** všude, kde dnes stojí „Rozestup" (popisky, záhlaví
  sloupce, nápovědy, hlášky, README, ruční test). V rohových zónách už
  „rozteč" je.
- Anglicky „Spacing" všude (v zónách dnes „pitch") — jako Tile Export
  („Max. mark spacing").

## 7. Zbytky z 1.3.0

- Uložená hodnota odsazení od kraje mimo režim cesty: kontrola i proti horní
  mezi 9999 (dnes jen ≥ 0).
- Uložit uloží jen platné hodnoty (§6.4).

## 8. Výška dialogu

Varianta B přidá řádek: bez zrcadlení odhadem ~803 px (dnes 777 px, strop
z verze v6 795 px). Tile Export běží na displeji uživatele (1512 × 982,
s Dockem) s dialogem 836 px a ruční testy uřízlá tlačítka neviděly; vlákno
Tile Exportu odhadlo strop ~850 px. **Moje volba:** strop GM srovnat s Tile
Exportem (~850 px) místo ubírání jinde. Stavitel výšky změří headless
(všechny stavy, CS i EN) a uživatel v ručním testu potvrdí, že jsou tlačítka
vidět celá.

## 9. Kompatibilita

- Předvolby a `[Last Settings]` beze změny klíčů; měřítko v nich není.
- Hodnoty uložené jako čísla se v polích jen jinak zapíšou (čárka).
- Dokument bez měřítka → 1:1 → stejný výsledek jako 1.3.0.
- Dokument z Tile Exportu s měřítkem → GM ho převezme a řádek ho ukáže.

## 10. Ověření

- Node: převod a zápis čísel v polích; měřítko v gatherAll/validaci; dělení
  všech délek (1:10 = výsledek 1:1 / 10); měřítko × Large Canvas; šedý řádek
  ve všech stavech; předvolby (hvězdička, [Výchozí], Uložit šedé/zhasnuté);
  slovník (žádné „Rozestup" v CS tabulce); parita klíčů CS/EN.
- Illustrator (harness, vlastní dokumenty): 1:10 proti 1:1 (polohy a velikosti
  přesně /10); dokument se zapsaným měřítkem z Tile Exportu; zápis a čtení
  XMP; krok Zpět; výška dialogu headless.
- Ruční test: nová sekce K (měřítko, šedý řádek, předvolby, hlášky).

## 11. Pořadí prací (návrh)

1. Sdílené moduly a čísla (§6.1–6.3).
2. Slovník, hlášky, titulek (§6.5–6.7).
3. Předvolby a zbytky 1.3.0 (§6.4, §7).
4. Šedý řádek s důvody (§5).
5. Měřítko kresby (§4) a výška dialogu (§8).
6. Dokumentace: CHANGELOG, README, ruční test K, engine-facts.

## 12. Co je na staviteli

- Přesné texty důvodů v šedém řádku a anglické texty.
- Kde přesně v běhu se měřítko zapíše vzhledem ke kroku Zpět (měřit).
- Rozdělení práce do commitů a testů.
