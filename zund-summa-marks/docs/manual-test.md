# Zünd & Summa Marks — ruční testy

Co se musí vyzkoušet rukou před vydáním a po větší změně. Výpočet značek,
validaci, předvolby, migrace nastavení a vykreslení do dokumentu kryjí
automatické sady (`npm test` v `zund-summa-marks/`). Opravy z code review
2026-09-26 se navíc ověřily během skriptu v Illustratoru přes `tools/ai-eval.sh`
([report](../../docs/reports/2026-09-26-code-review-zund-summa-marks.md)).
Tady zůstává to, co automat nevidí: dialog okem a myší, hlavní zakázka od
začátku do konce, běh z menu, anglický Illustrator a stroj.

**Brána pro vydání jsou sekce 1–5.** Sekce 6 je rychlá kontrola čísel a hlášek
bez harnessu. Co prošlo, zaškrtni; co ne, nahlas podle sekce 7. Na konci vyplň
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

**Výchozí nastavení:** tlačítko **Výchozí** v panelu Předvolby, v mapování
vrstev pak řádek **Cut ← Cut**. Výchozí řádek Cut ← [Registrační] skript od
opravy K8 přeskočí s upozorněním.

---

## 1. Dialog

- [ ] **1.1 Okem.** Dialog ZUND i SUMMA: nic uříznutého, pole zarovnaná, titulek
  „Zünd & Summa Marks v…". Přepnutí ZUND ↔ SUMMA zachová zadané hodnoty.
- [ ] **1.2 Klávesnice.** Esc zavře dialog jako Storno, Enter spustí Generovat.
- [ ] **1.3 Validace.** Rozteč 99999 → pole zčervená a Generovat se vypne; zpět na
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
  posledního běhu.

---

## 2. Forex deska — hlavní zakázka

Ve všech krocích platí: skript grafiku nemaže ani nemění, jen přidává značky
a přesouvá cesty čistě v řezové barvě.

- [ ] **2.1 ZUND, Dle výběru.** Vyber grafiku, Generovat → kruhové značky φ 5 mm
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
- [ ] **2.5 Dle Artboardu (Fixed).** ZUND → značky uvnitř artboardu, artboard
  beze změny.
- [ ] **2.6 Pouze značky.** Dokument s už separovanými vrstvami (Cut, Kiss-cut
  s obsahem), zaškrtnout „Pouze značky (neměnit vrstvy)" → mapování zešedne;
  Generovat přidá jen značky a vrstvy zůstanou beze změny; v SUMMA jdou ořezové
  linky do samostatné vrstvy Trim, ne do Regmarks.
- [ ] **2.7 Barvy.** [Výchozí] s barvou značek [Registrační] je po otevření bez
  „*" a značky jsou v registrační barvě. Vlastní přímá barva → značky v ní.
  Předvolba s barvou, která v dokumentu chybí → nabídka ukáže „Název (chybí)";
  Generovat → značky v [Registrační] a „UPOZORNĚNÍ:", žádná nová barva ve
  Vzornících.
- [ ] **2.8 Zámky a skryté vrstvy.** Zamčenou vrstvu skript odemkne, vykreslí
  a zamkne zpět. Skrytá spodní vrstva zůstane skrytá a nepřejmenuje se (K3).
  Skrytá Regmarks se při opakovaném běhu zviditelní a upozornění ji vyjmenuje
  (K12).

---

## 3. Běh z menu a Zpět (K11)

- [ ] Dokument s grafikou a cestou v barvě Cut, SUMMA s mapováním Cut ← Cut
  a ořezovými linkami, spustit přes Soubor › Skripty, pak Úpravy › Zpět po
  jednom kroku → artboard se vrátí na původní rozměr jako samostatný krok
  (přes AppleScript to byly 4 kroky celkem); další Zpět už vrací tvou úpravu
  z doby před spuštěním.

---

## 4. Anglický Illustrator

- [ ] **4.1 Texty.** Dialog a hlášky anglicky.
- [ ] **4.2 Registrační barva (K8).** Dokument s ořezovými značkami (Object ›
  Create Trim Marks), výchozí předvolba (Cut ← [Registration]), Generate →
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

## 6. Regresní přehled

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
| dokument 500 × 500 v měřítku 1:10, značky 5, rozteč 400 | titulek „… — 1:10"; značky v dokumentu 0,5; zrušené měřítko → zpět 5 |

**Hlášky** (česky):

- bez dokumentu → „Není otevřený dokument."; Dle výběru bez výběru → „Nic není
  vybráno."
- grafika tak velká, že by artboard přesáhl mez Illustratoru (K10) → „Artboard
  by měl … × … mm, a to Illustrator nedovolí…", dokument beze změny
- řádek mapování se jménem Trim nebo Regmarks (K6) → „Vrstvu ‘Trim’ nejde
  použít v mapování…", dokument beze změny
- objekt s řezovým tahem a tiskovou výplní (K1) → zůstane na místě, „Objekty
  v řezové barvě ‘Cut’, které mají i tiskovou výplň…"
- cesta v barvě Cut v ořezové masce nebo zamčené podvrstvě (K2) → „Vrstva ‘Cut’:
  některé cesty v barvě ‘Cut’ zůstaly na místě…"
- vlastní objekt ve vrstvě Trim (K6) → zůstane, „Vrstva ‘Trim’ obsahuje
  i objekty, které nevytvořil skript…"
- řádek mapování s barvou a bez názvu → „Řádek vrstvy má barvu (‘Cut’), ale
  nemá název…"

---

## 7. Když něco selže

Nahlas nastavení dialogu (nebo název předvolby), co vyšlo a co jsi čekal.

| symptom | pravděpodobná příčina | co přiložit |
|---|---|---|
| „*" u [Výchozí] bez úprav | normalizace registrační barvy | locale, název registrační barvy |
| pole zůstane červené, Generovat vypnuté | validace a zotavení | posloupnost kroků |
| ve Vzornících přibyla barva | náhradní barva značek | název barvy, dokument |
| vrstva přejmenovaná na Graphics | přejmenování spodní vrstvy | která vrstva, jestli byla v mapování, pořadí vrstev |
| špatná velikost nebo poloha značek | geometrie nebo měřítko | nastavení a naměřené hodnoty |
| pád skriptu nebo Illustratoru | — | panel Vrstvy a posloupnost kroků |

---

## 8. Záznam

```
Datum: ______   Build (commit): ______   Illustrator: ______   Locale: CZ / EN
Sekce 1 [ ]  2 [ ]  3 [ ]  4 [ ]  5 [ ]
Verdikt: [ ] vydat   [ ] blokováno — proč: ______
```

Vydání samo (verze, build, tag, Release) popisuje
[`../../docs/conventions.md`](../../docs/conventions.md).
