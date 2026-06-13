# Grommet Marks — Manuální testovací protokol v5.0.0

> **Verze:** 5.0.0
> **Aktualizováno:** 2026-06-13
>
> Automatické testy (`npm test`) pokrývají čisté moduly (core math, storage
> migrace, ui_state, validace, UI dialog). Tento protokol jsou **manuální P0 kontroly**,
> které vyžadují běžící Illustrator.
>
> **Priorita, když není čas na všechno:** E1, E3, F1, F3 (nové v5) → C1, C2 (regrese jádra).

---

## Příprava

1. Otevři **Adobe Illustrator**, vytvoř nový dokument s artboardem cca **200×200 mm**.
2. Spusť `dist/illustrator-grommet-marks.jsx` (`Soubor ▸ Skripty ▸ Jiný skript…`).
3. Po každém testu klikni **Storno** a spusť znovu (čistý stav), pokud není uvedeno jinak.

---

## A) NOVÉ z cyklu 2 — UI

### A1 — Layout (kanonický sloupec)
- [ ] Dialog je **jeden svislý sloupec**: Předvolby → Hrany → Značka → Vzhled → patička → tlačítka.
- [ ] Žádný schématický náhled tam **není** (byl zahozen).
- [ ] Šířka dialogu rozumná, nic se neořezává; české texty mají **správnou diakritiku** (Odsazení, Měrné jednotky, Generovat…).
- [ ] Tlačítka: **Storno vlevo, Generovat vpravo**, Reset úplně vlevo.

### A2 — Mirror uvnitř panelu (TD-001)
- [ ] „Zrcadlit horní" je **uvnitř** řádku Dolní hrany; „Zrcadlit levou" uvnitř Pravé.
- [ ] Zapni „Zrcadlit horní" → ovládání Dolní hrany **zešedne**.

### A3 — Obnova stavu mirroru (TD-003)
1. Zapni Dolní hranu, nastav počet (např. 5).
2. Zaškrtni „Zrcadlit horní" → Dolní se zakáže.
3. **Odškrtni** „Zrcadlit horní".
- [ ] Dolní se vrátí do **předchozího zapnutého stavu** (ne natvrdo vypnutá).

### A4 — Inicializace tlačítka Uložit *(opravený bug)*
- [ ] **Hned po otevření** dialogu je „Uložit" **zašedlé**.
- [ ] Změň cokoli (např. velikost) → „Uložit" **zaktivní** a u aktivní předvolby se objeví **hvězdička `*`**.

### A5 — Live validace + zámek Generovat *(klíčový nový mechanismus)*
- [ ] Do **Odsazení X** napiš `abc` → pole **zčervená** a **Generovat zešedne**.
- [ ] Oprav zpět na číslo → Generovat **zaktivní**.
- [ ] **Nové:** u **Horní hrany** v poli **Počet** napiš `0` nebo `abc` → zčervená a **Generovat zešedne** (dřív se to chytlo až po kliknutí).
- [ ] **Velikost = 0** → zčervená, Generovat zakázán (pravidlo min 0.01).

### A6 — Tooltipy *(opravené chybějící)*
- [ ] Najeď myší ~2 s nad **Měrné jednotky**, **Výplň** a **Obrys** (dropdowny) → objeví se český tooltip. (Tyhle tři dřív chyběly.)

---

## B) NOVÉ z review — robustnost (prepress!)

### B1 — Chybějící swatch → [Registration] místo pádu *(změna chování)*
1. Vytvoř vlastní swatch, vyber ho ve Výplni, **Uložit jako…** novou předvolbu.
2. **Smaž ten swatch** z dokumentu (panel Vzorník).
3. Spusť skript znovu, načti tu předvolbu.
- [ ] V rozbalovátku Výplň je název swatche s označením **„(chybí)"**.
- [ ] Generovat → značky **v barvě [Registration]** + **jedno upozornění** „Vzorník … není v dokumentu".
- [ ] **Nesmí** spadnout ani tiše vytvořit překvapivý spot.

### B2 — Chybějící hodnota nedělá falešnou „změnu" *(jemný fix)*
- [ ] Po načtení předvolby s chybějícím swatchem (B1) u aktivní předvolby **nesvítí** hvězdička `*` (zobrazí se „(chybí)", ale interně je to původní název → není to změna).

### B3 — Generování na ZAMČENOU vrstvu *(nový layer-session)*
1. Vytvoř vrstvu „Grommet Marks", **zamkni ji** (zámek v panelu Vrstvy).
2. Vyber ji ve Vzhled ▸ Vrstva, Generovat.
- [ ] Značky se **vytvoří** (dřív by se tiše ztratily).
- [ ] Po dokončení je vrstva **zase zamčená** (stav obnoven).

### B4 — Chybějící vrstva se vytvoří
- [ ] Načti předvolbu odkazující na neexistující vrstvu → dropdown ukáže „(chybí)"; po Generovat se vrstva **vytvoří** a značky jsou v ní.

### B5 — Tichý fail při uložení *(volitelné, těžké vyvolat)*
- [ ] Přeskoč, pokud nevíš jak. (Šlo by odebráním práv k zápisu do `~/Library/Application Support/GrommetMarks/`.) Cíl: selhání zápisu ukáže **alert**, ne tichý fail.

---

## C) Regrese — že staré pořád funguje

### C1 — Správné umístění značek (geometrie)
Nastav: Odsazení X **10**, Y **15**, Horní **4 ks**, Levá **4 ks**, ostatní vyp. Generovat, změř v Info panelu (`Okno ▸ Informace`).

| Pozice značky | X | Y |
|---|---|---|
| Roh vlevo nahoře | **10 mm** zleva | **15 mm** shora |
| Všechny horní | proměnné | **15 mm** shora (konstantní) |
| Všechny levé | **10 mm** zleva (konstantní) | proměnné |

- [ ] Rohová značka přesně na průsečíku [10 mm, 15 mm]; horní sdílí Y, levé sdílí X.

### C2 — Přesná rozteč (matematika jádra)
Dokument **300×200 mm**, jen Horní hrana: **Počet 5**, Odsazení Y **8 mm**.

```
Šířka 300 mm = ~850.39 pt
Odsazení od kraje: 8 mm × 2.8346 = ~22.68 pt
Dostupný prostor: 850.39 − 2×22.68 = 805.03 pt
Rozteč 5 značek: 805.03 / (5−1) = 201.26 pt ≈ 71 mm
```
- [ ] Značky rovnoměrně po **~71 mm**; první ~8 mm zleva, poslední ~8 mm zprava; všechny Y = horní hrana − 8 mm. **Geometrie se nesmí lišit od dřívějška.**

### C3 — Presety (celý cyklus)
- [ ] **Uložit jako…** → název → vznikne nová předvolba, přepne se na ni.
- [ ] **Uložit** do existující (po změně) → hvězdička zmizí.
- [ ] **Smazat** → potvrzovací dotaz → smaže, vrátí na [Výchozí].
- [ ] Uložit pod názvem `[Výchozí]` → **odmítne** (rezervovaný název).

### C4 — `[Last Settings]` (paměť posledního běhu)
- [ ] Nastav hodnoty, **Generovat**. Spusť skript **znovu** → otevře se s **týmiž** hodnotami.

### C5 — Převod jednotek
- [ ] Přepni Měrné jednotky mm → cm → čísla se **přepočítají** (odsazení 10 → 1).

### C6 — Více artboardů
- [ ] Dokument se 2 artboardy → značky **na obou**, na rozích se nepřekrývají (žádné dvojité).

### C7 — Tvar a vzhled
- [ ] Kruh/Čtverec → značky odpovídají.
- [ ] Zapni Obrys → zaktivní dropdown obrysu + Tloušťka; vypni → zašedne.

### C8 — Migrace starého nastavení (volitelné)
Pokud máš staré `~/Library/Application Support/GrommetMarks/GrommetMarksSettings.json` z v2/v3:
- [ ] Po spuštění se hodnoty načtou bez chyby; per-edge x/y se převede na globální Odsazení; jednotky/sentinel se nezobrazí jako cizí stringy.

### C9 — Lokalizace swatchů (volitelné, dle locale)
- [ ] V CZ i EN Illustratoru: systémové swatche (`[Registration]`/`[Registrační]`, `[None]`/`[Žádná]`) **nejsou** v dropdownech Výplň/Obrys; uživatelské ano.

---

## D) Klávesnice
- [ ] **Esc** zavře dialog (= Storno).
- [ ] **Enter** spustí (= Generovat), pokud jsou hodnoty platné.

---

---

## E) NOVÉ v5 — Umístění na cestu (path mode)

### E1 — Zapnutí path mode
1. Otevři dokument, **nevybírej nic** a spusť skript.
- [ ] V panelu Umístění je radio **Vybraná cesta** zašedlé (disabled).
- [ ] Tooltip na zašedlém radiu říká: „Nejdřív vyberte cestu…"

2. Zavři (Storno). Nakresli **uzavřený obdélník** (Rectangle Tool), vyber ho, spusť skript.
- [ ] Radio **Vybraná cesta** je aktivní.
- [ ] Klikni na něj → panel **Hrany zmizí**, místo něj se zobrazí panel **Cesta**.
- [ ] Panel Cesta zobrazuje: „Uzavřená cesta · 4 rohů".

### E2 — Cesta bez rohů (kruh)
1. Nakresli **elipsu** (Ellipse Tool; kruh = Shift), vyber ji, spusť skript.
- [ ] Panel Cesta: „Uzavřená cesta · bez rohů".
- [ ] Radio **Počet** i **Rozestup** jsou oba aktivní (počet povolený bez rohů).
- [ ] Panel **Rohové zóny** je zašedlý (žádné rohy → zóny nedávají smysl).

### E3 — Generování na uzavřené cestě se 4 rohy
Obdélník **100×200 mm**, Rozestup **50 mm**. Přepni na Vybraná cesta → Generovat.
- [ ] Značky leží **na obrysu** obdélníku (ne uvnitř, ne na artboardu).
- [ ] U každého rohu je **přesně 1 značka** (roh = povinná kotva).
- [ ] Celkem přibližně: 2×(100/50) + 2×(200/50) − 4 rohů + 4 rohů = ~12 značek.
- [ ] **Žádné duplicity** na rohových bodech.

### E4 — Otevřená cesta
1. Nakresli **otevřenou lomenou čáru** (Pen Tool, bez uzavření), vyber ji, spusť.
- [ ] Panel Cesta: „Otevřená cesta · N rohů" (N ≥ 2, krajní body jsou vždy rohy).
- [ ] Generovat → krajní body cesty mají **vždy značku** (endpoint = povinný roh).

### E5 — ERR_PATH_GONE (fallback)
1. Přepni na Vybraná cesta v dialogu.
2. Přepni zpět na jinou aplikaci, odznak cestu (klikni mimo), vrať se do Illustratoru.
3. Klikni Generovat.
- [ ] Zobrazí se **upozornění** o přepnutí zpět na Hrany artboardu (ne pád).
- [ ] Pokud je to možné replikovat: značky se umístí na artboard jako záloha.

---

## F) NOVÉ v5 — Rohové zóny (corner zones)

### F1 — Zapnutí zón v artboard módu
Dokument **300×200 mm**. Hrany: jen Horní, Rozestup **70 mm**, Odsazení X/Y **0**.
- [ ] Bez zón: rovnoměrné rozmístění (cca 5 značek).
- [ ] Zaškrtni **Zhustit u rohů**, Počet **3**, Rozteč **15 mm** → Generovat.
- [ ] U každého rohu horní hrany jsou **3 značky s roztečí ~15 mm**; prostřední část hrany má větší rozteče.
- [ ] Celkový počet se zvětšil oproti bez-zón variantě.

### F2 — Degradace zón (zóny se překrývají)
Krátká hrana (~40 mm), Zóny: Počet **5**, Rozteč **15 mm** (5×15 = 75 mm > 40 mm).
- [ ] Nedojde k pádu ani záporným pozicím.
- [ ] Výsledek: značky zrcadlově z obou konců, se zpracovatelným překryvem (dedup).

### F3 — Zóny zakázané na hladké cestě
Uzavřená elipsa (bez rohů), path mode.
- [ ] Panel Rohové zóny: checkbox **Zhustit u rohů** je zašedlý.
- [ ] Tooltip říká: „Vybraná cesta nemá rohy — značky se rozmístí rovnoměrně…"

### F4 — Zóny na cestě s rohy
Obdélník v path mode, Zóny: Počet **2**, Rozteč **10 mm**.
- [ ] U každého ze 4 rohů jsou **2 značky** na vzdálenost 10 mm od rohu.
- [ ] Středy stran mají větší rozteče (dle nastavení Rozestupu v panelu Cesta).

---

## Hlášení problému

U každého neúspěchu poznač: **číslo testu**, **verzi Illustratoru**, **locale (CZ/EN)**, **co jsi čekal vs. co se stalo**, případně text z ExtendScript konzole.

---

## Testovací prostředí

- macOS (11.0+), Adobe Illustrator (2020+), bash (výchozí), Node.js (pro `npm test`)
- Volitelně: Illustrator ve více jazycích (CZ, EN) pro C9

---

*Připravil: Osva1d — Test Plan v5.0.0, 2026-06-13*
