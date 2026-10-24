# Zünd & Summa Marks — ruční testy

Co se musí vyzkoušet rukou před vydáním a po větší změně. Výpočet značek,
validaci, předvolby, migrace nastavení a vykreslení do dokumentu kryjí
automatické sady (`npm test` v `zund-summa-marks/`). Opravy z code review
2026-09-26 se navíc ověřily během skriptu v Illustratoru přes `tools/ai-eval.sh`
([report](../../docs/reports/2026-09-26-code-review-zund-summa-marks.md)).
Tady zůstává to, co automat nevidí: dialog okem a myší, hlavní zakázka od
začátku do konce, běh z menu, anglický Illustrator a stroj.

**Brána pro vydání jsou sekce 1–6.** Sekce 7 je rychlá kontrola čísel a hlášek
bez harnessu. Co prošlo, zaškrtni; co ne, nahlas podle sekce 8. Na konci vyplň
záznam a před dalším kolem vrať zaškrtnutí na `[ ]`. Kódy K1–K12 odkazují na
nálezy v reportu z review.

---

## 0. Příprava

```bash
cd ~/Dev/extendscript-automation/zund-summa-marks && npm run verify
```

Build vznikne v `dist/illustrator-zund-summa-marks.jsx`. Spouštěj vždy tento
soubor přes **Soubor › Skripty › Jiný skript…**, ne starou nainstalovanou kopii.
Pro čistý start přejmenuj `~/Library/Application Support/ZSM/settings.json`
a po testu ho vrať.

| dokument | příprava |
|---|---|
| Forex | nový dokument 1560 × 3050 mm, CMYK, jednotky mm; ve vrstvě obdélník ~1500 × 3000 mm (grafika); přímá barva **Cut** a pár cest v ní |
| malý | nový dokument s obdélníkem 100 × 100 mm, pro čísla v sekci 6 |

**Výchozí nastavení:** tlačítko **Výchozí** v panelu Předvolby. Řádek
mapování dostane řezovou barvu, kterou skript v dokumentu najde — ve Forex
dokumentu **Cut ← Cut**.

---

## 1. Dialog

- [ ] **1.1 Okem.** Dialog ZUND i SUMMA: nic uříznutého, pole zarovnaná, titulek
  „Zünd & Summa Marks v…". Přepnutí ZUND ↔ SUMMA zachová zadané hodnoty. Zdroj
  se jmenuje „Dle grafiky (Auto-fit)" a nápověda říká, že se výběr nebere
  v úvahu (A1).
- [ ] **1.2 Klávesnice.** Esc zavře dialog jako Storno, Enter spustí Generovat.
- [ ] **1.3 Validace.** Max. rozteč značek 99999 → pole zčervená a Generovat se vypne; zpět na
  500 → obojí se vrátí. Znovu neplatná hodnota a pak ↺ nebo jiná předvolba →
  dialog se zotaví. Prázdné pole → Generovat vypnuté. Hodnota `10,5` s čárkou
  projde.
- [ ] **1.4 Předvolby.** Uložit jako… „Test" → je v nabídce. Změna hodnoty →
  „Test *", ↺ a Uložit aktivní. ↺ → uložené hodnoty, „*" zmizí, ↺ a Uložit
  zešednou. Změna + Uložit → přepíše „Test" bez „*". Smazat → potvrzení,
  předvolba zmizí; [Výchozí] smazat nejde. Tlačítko **Výchozí** načte tovární
  hodnoty do dialogu, mód nezmění a předvolbu nepřepíše.
- [ ] **1.5 Předvolba jiného módu (K5).** V režimu SUMMA ulož předvolbu, přepni
  na ZUND a vyber ji v nabídce → dialog se přepne na SUMMA s jejími hodnotami,
  bez „*". Přepni na ZUND a klikni ↺ → znovu SUMMA s hodnotami předvolby.
  Engine je ověřený bez zobrazení okna, živý dialog ne.
- [ ] **1.6 Paměť.** Uložená předvolba přežije zavření a nové spuštění. Po
  Generovat s neuloženými změnami otevře další spuštění dialog s hodnotami
  posledního běhu. Neuložená úprava SUMMA (horní výjezd 90) přežije jeden běh
  ZUND: po přepnutí zpět na SUMMA je tam pořád 90 (A3).

---

## 2. Forex deska — hlavní zakázka

Ve všech krocích platí: skript grafiku nemaže ani nemění, jen přidává značky
a přesouvá cesty čistě v řezové barvě.

- [ ] **2.1 ZUND, Dle grafiky.** Generovat → kruhové značky φ 5 mm
  v rozích a orientační u levého dolního rohu; artboard obepne grafiku
  s mezerami; značky ve vrstvě Regmarks › Zünd; cesty v barvě Cut ve vrstvě
  Cut; spodní vrstva přejmenovaná na Graphics. Když dole skončí vrstva
  z mapování (např. Cut), jméno si nechá.
- [ ] **2.2 Rozteč.** Rozteč 400 mm → na dlouhé hraně 7 mezilehlých značek, na
  krátké 3, rovnoměrně. Rozteč 5000 mm → jen rohy.
- [ ] **2.3 SUMMA po ZUND.** Stejný dokument, SUMMA s „Přidat ořezové linky" →
  čtvercové značky 3 mm a OPOS pruh pod grafikou; červené linky v samostatné
  vrstvě Trim nahoře; Regmarks › Zünd a Regmarks › Summa vedle sebe.
- [ ] **2.4 ZUND po SUMMA.** → upozornění „Výstup Summa byl odstraněn…",
  zůstanou jen značky Zünd.
- [ ] **2.5 Dle artboardu (Fixed).** ZUND → značky uvnitř artboardu, artboard
  beze změny.
- [ ] **2.6 Pouze značky.** Dokument s už separovanými vrstvami (Cut, Kiss-cut
  s obsahem), zaškrtnout „Pouze značky (neměnit vrstvy)" → mapování zešedne;
  Generovat přidá jen značky a vrstvy zůstanou beze změny; v SUMMA jdou ořezové
  linky do samostatné vrstvy Trim, ne do Regmarks.
- [ ] **2.7 Barvy.** [Výchozí] má v dokumentu s přímou barvou Cut řádek
  mapování Cut ← Cut (A2), po otevření je bez „*" a značky jsou v registrační
  barvě. Vlastní přímá barva → značky v ní.
  Předvolba s barvou, která v dokumentu chybí → nabídka ukáže „Název (chybí)";
  Generovat → značky v [Registrační] a „UPOZORNĚNÍ:", žádná nová barva ve
  Vzornících.
- [ ] **2.8 Zámky a skryté vrstvy.** Zamčenou vrstvu skript odemkne, vykreslí
  a zamkne zpět. Skrytá spodní vrstva zůstane skrytá a nepřejmenuje se (K3).
  Skrytá Regmarks se při opakovaném běhu zviditelní a upozornění ji vyjmenuje
  (K12).

---

## 3. Běh z menu a Zpět (K11)

- [ ] Dokument s grafikou a cestou v barvě Cut, posuňte grafiku o kousek (úprava
  před spuštěním), SUMMA s mapováním Cut ← Cut a ořezovými linkami, spusťte
  přes Soubor › Skripty, pak Úpravy › Zpět po jednom kroku → artboard se vrátí
  na původní rozměr jako samostatný krok, čtvrtým Zpět (změřeno 2026-10-24
  příkazem menu Zpět ze skriptu: ořezové linky, vrstva Trim, značky a vrstvy,
  artboard); až další Zpět vrací posun grafiky. U ZUND s mapováním jsou to dva
  kroky (značky a vrstvy, pak artboard). Měřítko kresby zůstane — viz 6.2.

---

## 4. Anglický Illustrator

- [ ] **4.1 Texty.** Dialog a hlášky anglicky.
- [ ] **4.2 Registrační barva (K8).** Dokument s ořezovými značkami (Object ›
  Create Trim Marks) bez řezové barvy, výchozí předvolba (řádek zůstane
  Cut ← [Registration]), Generate →
  ořezové značky zůstanou ve vrstvě grafiky, vrstva Cut nevznikne; upozornění,
  že registrační barvou nejde rozpoznat řezové cesty.

---

## 5. U stroje — rozhoduje

- [ ] **5.1 Zünd.** Zakázku z 2.1 vytisknout a načíst → stroj najde všechny
  značky, pozná orientaci archu a ořízne podle Cut.
- [ ] **5.2 Orientační značka blízko rohu (K7).** Výchozí předvolba, dva archy:
  grafika 96 mm široká (orientační značka 1 mm od pravé dolní rohové) a 80 mm
  (orientační 5 mm za pravou dolní rohovou) → stroj najde všechny značky
  a pozná orientaci. Když ne, kontrola kolizí (`findMarkConflict`) blokuje
  zatím jen dotyk a překryv — doplnit do ní minimální mezeru, kterou stroj
  potřebuje.
- [ ] **5.3 Summa.** Výstup z 2.3 vytisknout a načíst → OPOS najde pruh
  i značky.

---

## 6. Nové v 1.2.0 — čistý tah, měřítko kresby, rodinný jazyk

> Co přinesla verze 1.2.0
> ([návrh](../../docs/specs/2026-10-23-zund-summa-marks-1.2.0-design.md)).
> Logiku (čtení čísel, předvolby, texty, parita CS/EN, měřítko v XMP přes
> mock) hlídají Node testy a v Illustratoru ji 2026-10-24 ověřil harness bez
> zobrazení dialogu (`../../docs/extendscript-engine-facts.md`). Tady je, co
> harness nevidí: dialog na obrazovce, barvy, myš a klávesnice, Tile Export
> v ruce a běh z menu.
>
> **Příprava:** Forex dokument z oddílu 0 bez měřítka (nový dokument, nebo
> zadejte 1 a jednou Generovat) a jedna zakázka Tile Exportu (viz 6.2).

- [ ] **6.1 Plný tah s vybranou perforací (P3).** V dokumentu s grafikou
  nakreslete přes grafiku rovnou cestu, dejte jí přerušovanou čáru 8/4
  a zaoblené konce (panel Tah) a **nechte ji vybranou**. SUMMA se zaškrtnutým
  „Přidat ořezové linky“, Generovat → OPOS pruh pod grafikou je **plný
  s rovnými konci** a končí přesně na šířce grafiky, ne o 3 mm dál; obě
  červené ořezové linky jsou plné; vaše perforace zůstala přerušovaná.
  Vytiskněte a načtěte u Summy (5.3).
- [ ] **6.2 Měřítko z dokumentu.** (a) Zakázka Tile Exportu, kde jste
  v Tile Exportu zadali Měřítko kresby 1:10 a potvrdili dialog (Tile Export
  zapíše měřítko hned po potvrzení; potřebuje umístěnou grafiku a cílovou
  složku, postup je v ručním testu Grommet Marks K1). Kontrolní pláty, které
  po sobě Tile Export nechá (artboardy `TE_…`, vrstva `TE_panels`), smažte —
  měřítko leží v metadatech dokumentu a smazání ho nezmění. Spusťte Zünd
  & Summa Marks → pole **Měřítko kresby 1:**
  ukazuje **10**, titulek končí „— 1:10“, stavový řádek končí „· 1:10“
  a v režimu Dle artboardu ukazuje artboard ve skutečné velikosti (× 10).
  (b) Změňte pole na **4** a Generovat; otevřete dialog Tile Exportu
  a zavřete ho Storno → nabízí 1:4. (c) Nový dokument → pole ukazuje **1**, ne
  4 ani 10: předvolby ani poslední běh měřítko nenesou. (d) Pole **2,5**,
  Generovat, další spuštění → **2,5** (ne 2.5 ani 2). (e) Přepnutí ZUND ↔ SUMMA,
  výběr jiné předvolby a tlačítko Výchozí pole nezmění.
- [ ] **6.3 Přechod z 1.1.0.** Dokument, který jste kreslili ve verzi 1.1.0
  v měřítku 1:10, se otevře s polem **1** — dokument
  měřítko v sobě nemá. Titulek je bez přípony a řádek bez „· 1:10“: vidět je to
  jen v poli. Zadejte 10, Generovat a spusťte znovu → **10**.
- [ ] **6.4 Neplatné měřítko.** Do pole napište postupně `0,5`, `0`, `101`,
  `abc` a `1e1` → pokaždé pole zčervená, **Generovat, Uložit i Uložit jako…**
  zešednou a řádek nad tlačítky je červený: „✗ Měřítko kresby — povolený
  rozsah 1–100.“ Platí `1`, `100` a `10` s mezerou okolo.
- [ ] **6.5 Zpět vrací značky, ne měřítko.** Měřítko **7**, Generovat, pak
  Úpravy › Zpět tolikrát, kolik má běh kroků (oddíl 3) → značky i artboard
  jsou zpět, ale další spuštění ukáže v poli **7**. Zadejte 1 a jednou
  Generovat → dokument je zase bez měřítka.
- [ ] **6.6 Čísla s čárkou a překlepy (N1, P1, N6).** Max. rozteč značek
  `450,5` → projde a po Generovat a dalším spuštění je tam zase `450,5`.
  Postupně `1O5` (písmeno O), `0x10`, `1 000`, `20 mm` → pole zčervená,
  Generovat a Uložit zešednou, řádek: „✗ Max. rozteč značek — povolený rozsah
  5–5000.“ Dvě neplatná pole → „✗ Chyb ve formuláři: 2 — viz zvýrazněná
  pole.“
- [ ] **6.7 Předvolby (P5, J3).** Předvolba `Test A`, změňte hodnotu → „Test A
  *“; přepněte na `[Výchozí]` → hvězdička u `Test A` **zmizí**. V režimu SUMMA
  je `[Výchozí]` bez „*“ a jeho výběr ze seznamu i ↺ nechají dialog v SUMMA.
  Uložit jako… s prázdným nebo mezerovým názvem → „Zadejte název předvolby.“;
  existující název → „Předvolba „Test A“ už existuje. Přepsat?“. Smazat →
  „Smazat předvolbu „Test A“? Smazání nejde vrátit.“ ↺ stojí vedle seznamu,
  „Uložit jako…“ je na tlačítku celé.
- [ ] **6.8 Stavový řádek na světlém i tmavém UI.** V klidu je řádek šedý
  a říká, co skript našel: `ZUND · řez „Cut“`, v Dle artboardu
  `ZUND · artboard 1 560 × 3 050 mm · řez „Cut“`, se zaškrtnutým Pouze značky
  `… · pouze značky`, v dokumentu bez řezové barvy `… · řez nenalezen`. Klikněte
  na „+ Přidat“ (nový řádek dostane stejnou řezovou barvu) → červeně
  „✗ Barva „Cut“ je přiřazena více vrstvám — odeberte duplicitu.“, celé,
  nic se neuřízne. Po odebrání řádku se vrátí šedý nález. Projděte to na
  tmavém i světlém jasu uživatelského rozhraní (Illustrator › Nastavení ›
  Uživatelské rozhraní › Jas): červená je čitelná, šedý nález vypadá jako
  zašedlý text, ne jinak.
- [ ] **6.9 Dialog na displeji 13".** ZUND i SUMMA, česky i anglicky: dialog je
  vidět celý i s tlačítky Storno a Generovat (bez záhlaví okna měří ZUND 720
  px, SUMMA 756 px, šířka 465 px; změřeno). S osmi řádky mapování měří 923 a
  932 px a na 13" displeji se nemusí vejít — stejně jako v 1.1.0; zapište, od
  kolika řádků se tlačítka schovají.
- [ ] **6.10 Hlášky (J5, J6).** Bez otevřeného dokumentu → „Před spuštěním
  skriptu otevřete dokument.“ Prázdný dokument, Dle grafiky → „CHYBA:
  V dokumentu není žádná grafika… Dokument nebyl změněn.“ a počátek pravítek,
  který jste si předtím posunuli, zůstane, kde byl. Názvy v hláškách stojí
  v „…“, žádná hláška nekončí vykřičníkem.
- [ ] **6.11 Výstup Tile Exportu ve vrstvě Regmarks.** Značky přímo ve vrstvě
  Regmarks (bez podvrstev) má **PDF plátu, které Tile Export exportoval
  v režimu Zünd** — ne pracovní dokument, tam leží Regmarks jako podvrstva
  kontrolního plátu (`TE_panels` › `TE_nn` › Regmarks). Otevřete takové
  tiskové PDF v Illustratoru (vrstvy Regmarks, Cut, Graphics) a v panelu
  Vrstvy si spočítejte objekty ve vrstvě Regmarks (N). Spusťte Zünd & Summa
  Marks, ZUND, Generovat → značky Tile Exportu **zůstanou** přímo ve vrstvě
  Regmarks, vedle nich vznikne podvrstva Regmarks › Zünd s novými značkami
  a běh skončí „UPOZORNĚNÍ: Vrstva „Regmarks“ obsahuje i objekty, které
  nevytvořil skript (objektů: N)…“ (N bez obsahu podvrstev). Dřív je skript
  smazal. PDF zavřete bez uložení.

---

## 7. Regresní přehled

Očekávané hodnoty dnešní verze. Rozměry v mm, ostatní nastavení výchozí.

| grafika, nastavení | výsledek |
|---|---|
| 100 × 100, ZUND, mezera od grafiky 10 | artboard 130 × 130; 5 značek (4 rohy + orientační), žádné mezilehlé |
| 600 × 100, ZUND, mezera 10, rozteč 200 | na dlouhé hraně 3 mezilehlé, rovnoměrně |
| 100 × 100, SUMMA | OPOS pruh 11,5 pod grafikou, tloušťka 3; výška artboardu 246 |
| 100 × 100, ZUND, odsazení orientační značky 200 | artboard se rozšíří, aby orientační značku obsáhl |
| grafika v ořezové masce s větším obsahem, ZUND | značky a artboard podle masky, ne podle skrytého obsahu |
| 200 × 100, ZUND | artboard 220 × 120 |
| totéž, pak SUMMA s linkami | artboard 244 × 266; vrstva Trim se 2 linkami; Regmarks › Summa 4 značky + pruh |
| 90 široká, ZUND (K7) | chyba „Orientační značka by se dotýkala jiné značky…"; dokument beze změny |
| Fixed, artboard 100 × 100, ZUND (K7) | chyba „Značka by přesahovala artboard o 10 mm…"; dokument beze změny |
| dokument 500 × 500, Měřítko kresby 10, značky 5, rozteč 400 | titulek „… — 1:10“; značky v dokumentu 0,5; Měřítko kresby 1 → zpět 5 |
| stejná grafika 1:1 a desetkrát menší v 1:10 (ZUND i SUMMA s linkami) | polohy i velikosti v 1:10 přesně desetinové (změřeno 2026-10-24: nejvýš 0,00003 pt) |

**Hlášky** (česky):

- bez dokumentu → „Před spuštěním skriptu otevřete dokument.“; prázdný
  dokument, Dle grafiky → „CHYBA: V dokumentu není žádná grafika, kolem které
  by šly značky umístit… Dokument nebyl změněn.“
- grafika tak velká, že by artboard přesáhl mez Illustratoru (K10) → „CHYBA:
  Artboard by měl … × … mm, a to Illustrator nedovolí… Dokument nebyl změněn.“
- řádek mapování se jménem Trim nebo Regmarks (K6) → „CHYBA: Vrstvu „Trim“
  nejde použít v mapování… Dokument nebyl změněn.“
- objekt s řezovým tahem a tiskovou výplní (K1) → zůstane na místě,
  „UPOZORNĚNÍ: Objekty v řezové barvě „Cut“, které mají i tiskovou výplň…“
- cesta v barvě Cut v ořezové masce nebo zamčené podvrstvě (K2) → „Vrstva
  „Cut“: některé cesty v barvě „Cut“ zůstaly na místě…“
- přímá barva Cut, kterou nemá žádná cesta, řádek Cut ← Cut (A7) → „Vrstva
  „Cut“: v barvě „Cut“ není v dokumentu žádná cesta, nic se nepřesunulo…“
- vlastní objekt ve vrstvě Trim (K6) → zůstane, „Vrstva „Trim“ obsahuje
  i objekty, které nevytvořil skript…“
- cizí objekt přímo ve vrstvě Regmarks → zůstane, „Vrstva „Regmarks“ obsahuje
  i objekty, které nevytvořil skript (objektů: N)…“
- řádek mapování s barvou a bez názvu → „CHYBA: Řádek vrstvy má barvu („Cut“),
  ale nemá název…“

---

## 8. Když něco selže

Nahlas nastavení dialogu (nebo název předvolby), co vyšlo a co jsi čekal.

| symptom | pravděpodobná příčina | co přiložit |
|---|---|---|
| „*" u [Výchozí] bez úprav | normalizace registrační barvy | locale, název registrační barvy |
| pole zůstane červené, Generovat vypnuté | validace a zotavení | posloupnost kroků |
| ve Vzornících přibyla barva | náhradní barva značek | název barvy, dokument |
| vrstva přejmenovaná na Graphics | přejmenování spodní vrstvy | která vrstva, jestli byla v mapování, pořadí vrstev |
| špatná velikost nebo poloha značek | geometrie nebo měřítko | nastavení a naměřené hodnoty |
| značky desetkrát menší nebo větší | měřítko kresby z dokumentu (pole, titulek, stavový řádek) | co ukazovalo pole Měřítko kresby a který nástroj dokument předtím zpracoval |
| pád skriptu nebo Illustratoru | — | panel Vrstvy a posloupnost kroků |

---

## 9. Záznam

```
Datum: ______   Build (commit): ______   Illustrator: ______   Locale: CZ / EN
Sekce 1 [ ]  2 [ ]  3 [ ]  4 [ ]  5 [ ]  6 [ ]
Verdikt: [ ] vydat   [ ] blokováno — proč: ______
```

Vydání samo (verze, build, tag, Release) popisuje
[`../../docs/conventions.md`](../../docs/conventions.md).
