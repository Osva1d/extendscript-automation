# Grommet Marks — Manuální testovací protokol

> **Verze skriptu tady záměrně není** — žila by vedle `package.json`,
> `src/constants.js` a `CHANGELOG.md` jako čtvrtá kopie, kterou nic nehlídá
> (a taky driftla: dokument uváděl v6.0.0, zatímco veřejná řada je 1.x).
> Aktuální verzi hledej v [`../CHANGELOG.md`](../CHANGELOG.md).
>
> Čísla `v6.x` a dřívější v textu jsou **historické reference** k interní
> řadě před veřejným vydáním, ne tvrzení o aktuálním stavu.
> **Aktualizováno:** 2026-10-21 (sekce K)
>
> Automatické testy (`npm test`) pokrývají čisté moduly (core math, storage
> migrace, ui_state, validace, UI dialog). Tento protokol jsou **manuální P0 kontroly**,
> které vyžadují běžící Illustrator.
>
> **Priorita, když není čas na všechno:** K1–K8 (měřítko kresby, šedý řádek s důvodem, předvolby, hlášky, 1.4.0) → J1–J10 (tvary v režimu cesty, 1.3.0) → H1–H6 (opravy z review) → I1–I5 (audit UI) → G1, G6 (nové v6) → E1, E3, F1, F3 → C1, C2 (regrese jádra).

---

## Příprava

1. Otevři **Adobe Illustrator**, vytvoř nový dokument s artboardem cca **200×200 mm**.
2. Spusť `dist/illustrator-grommet-marks.jsx` (`Soubor ▸ Skripty ▸ Jiný skript…`).
3. Po každém testu klikni **Storno** a spusť znovu (čistý stav), pokud není uvedeno jinak.

---

## A) NOVÉ z cyklu 2 — UI

### A1 — Layout (kanonický sloupec)
- [ ] Dialog je **jeden svislý sloupec**: Předvolby → Umístění → Hrany → Rohové zóny → Značka → patička → tlačítka.
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

### A6 — Tooltipy
- [ ] Najeď myší ~2 s nad **Měrné jednotky** (dropdown) a **Kruh**/**Kříž** (checkboxy) → objeví se český tooltip.

---

## B) Robustnost (prepress!)

### B3 — Generování na ZAMČENOU vrstvu „Grommet Marks"
1. Vytvoř vrstvu **„Grommet Marks"**, **zamkni ji** (zámek v panelu Vrstvy).
2. Generovat.
- [ ] Značky se **vytvoří** (skript dočasně odemkne zamčenou vrstvu).
- [ ] Po dokončení je vrstva **zase zamčená** (stav obnoven).

### B4 — Chybějící vrstva se vytvoří
- [ ] Smaž vrstvu „Grommet Marks" (nebo spusť v dokumentu kde chybí) → po Generovat se vrstva **automaticky vytvoří** a značky jsou v ní.

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

### C8 — Migrace starého nastavení (volitelné)
Pokud máš staré `~/Library/Application Support/GrommetMarks/GrommetMarksSettings.json` z v2/v3/v5:
- [ ] Po spuštění se hodnoty načtou bez chyby; per-edge x/y se převede na globální Odsazení; jednotky/sentinel se nezobrazí jako cizí stringy.
- [ ] Stará pole (fill/stroke/layer) jsou ignorována; nová pole (markCircle, markCross, regWeight, haloWeight) se doplní výchozími hodnotami.

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
- [ ] Tooltip na zašedlém radiu říká: „Nic není vybráno. Vyberte jednu cestu…"
- [ ] Vyber **skupinu** s obdélníkem a ještě jedním objektem (nástroj Výběr) a spusť skript → tooltip radí Přímý výběr (A), rozdělení složené cesty a jeden objekt. *(Skupina, ve které je jen obdélník, se od 1.3.0 bere jako ten obdélník — J12.)*

2. Zavři (Storno). Nakresli **uzavřený obdélník** (Rectangle Tool), vyber ho, spusť skript.
- [ ] Radio **Vybraná cesta** je aktivní.
- [ ] Klikni na něj → panel **Hrany zmizí**, místo něj se zobrazí panel **Cesta**.
- [ ] Šedý řádek pod Umístěním hlásí: „Uzavřená cesta · 4 rohy · značky leží na cestě".

### E2 — Cesta bez rohů (kruh)
1. Nakresli **elipsu** (Ellipse Tool; kruh = Shift), vyber ji, spusť skript.
- [ ] Šedý řádek pod Umístěním: „Uzavřená cesta · bez rohů · první značka nahoře · značky leží na cestě".
- [ ] Radio **Počet** i **Rozteč** jsou oba aktivní (počet povolený bez rohů).
- [ ] Panel **Rohové zóny** je zašedlý (žádné rohy → zóny nedávají smysl).

### E3 — Generování na uzavřené cestě se 4 rohy
Obdélník **100×200 mm**, Rozteč **50 mm**. Přepni na Vybraná cesta → Generovat.
- [ ] Značky leží **na obrysu** obdélníku (ne uvnitř, ne na artboardu).
- [ ] U každého rohu je **přesně 1 značka** (roh = povinná kotva).
- [ ] Celkem přibližně: 2×(100/50) + 2×(200/50) − 4 rohů + 4 rohů = ~12 značek.
- [ ] **Žádné duplicity** na rohových bodech.

### E4 — Otevřená cesta
1. Nakresli **otevřenou lomenou čáru** (Pen Tool, bez uzavření), vyber ji, spusť.
- [ ] Šedý řádek pod Umístěním: „Otevřená cesta · N rohů · značky leží na cestě" (N ≥ 2, krajní body jsou vždy rohy).
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
Dokument **300×200 mm**. Hrany: jen Horní, Rozteč **70 mm**, Odsazení X/Y **0**.
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
- [ ] Středy stran mají větší rozteče (dle nastavení Rozteče v panelu Cesta).

---

## G) NOVÉ v6 — Jednotný vzhled značky

### G1 — Kruh (default)
- [ ] Generovat s default: značky = kruh, registrační tah na bílém halu (halo širší).
- [ ] Bílý kruh **knockout** (vykrojí motiv pod sebou), registrační kruh **overprint** (Okno ▸ Atributy).

### G2 — Kříž
- [ ] Zaškrtni Kříž, odškrtni Kruh → značka = kříž (rameno = Velikost), stejná halo+reg konstrukce.

### G3 — Kruh + kříž
- [ ] Oba zaškrtnuté → kruh i kříž ve společné grupě, společný střed.

### G4 — Žádný tvar
- [ ] Odškrtni oba → Generovat **šedé** (live validace).

### G5 — Tloušťky
- [ ] Změň Reg. tah / Bílé halo → tahy odpovídají; halo > reg = viditelné halo.

### G6 — Pevná vrstva
- [ ] Značky vždy na vrstvě „Grommet Marks" (vytvoří se když chybí); zamčená vrstva se odemkne a zase zamkne.

---

## H) Opravy z code review 2026-09-26

> Opravy nálezů critical a major z
> [code review](../../docs/reports/2026-09-26-code-review-grommet-marks.md).
> Každou už ověřil skutečný build v Illustratoru 30.8.2 (dialog bez zobrazení,
> výsledek změřený a vykreslený). Tady zůstává, co se tak ověřit nedá: běh
> z menu, výběr myší, pohled na dialog, Cmd+Z a skutečná data. Číslo v závorce
> je nález v reportu — „nález G1" není test G1 výš.

### H1 — Velké plátno (nález G1)
1. Nový dokument **6000 × 1000 mm** (nad ~5,8 m ho Illustrator založí jako velké plátno).
2. Spusť skript z `Soubor ▸ Skripty`, výchozí nastavení (Odsazení 7 mm, Velikost 3 mm), Generovat.
- [ ] Rohová značka má **průměr 3 mm** a její střed je **7 mm** od levého i horního kraje (nástroj Měřítko nebo panel Informace).
- [ ] Značky nejsou obří a nepřekrývají se (před opravou 30 mm a 70 mm od kraje).

### H2 — Plný tah i při vybrané čárkované kontuře (nález G2)
1. Nakresli obdélník a dej mu **přerušovaný tah** s kulatými konci (panel Tah).
2. Vyber ho **myší** a spusť skript. Zapni **Kruh i Kříž**, přepni na **Vybraná cesta**, Generovat.
- [ ] Registrační kruh, kříž i bílé halo jsou **plné**, konce kříže rovné.
3. Vyber čárkovaný obdélník znovu myší a spusť skript v režimu **Hrany artboardu**.
- [ ] I tady jsou značky plné.

### H3 — Roh pod zdvojeným bodem (nález G6) *(volitelné, chce skutečná data)*
1. Otevři výsekový obrys z PDF nebo DXF od zákazníka, vyber ho a spusť skript v režimu **Vybraná cesta**.
- [ ] Informační řádek hlásí tolik rohů, kolik jich obrys opravdu má.
- [ ] Po Generovat má **každý roh značku**.

### H4 — Skrytá vrstva „Grommet Marks" (nález G5)
1. Vytvoř vrstvu **„Grommet Marks"**, **skryj** ji a **zamkni**.
2. Generovat.
- [ ] Přijde upozornění, že skrytá vrstva byla zviditelněna; text se dobře čte a nic není uříznuté.
- [ ] Po běhu je vrstva **viditelná** a **zamčená**, značky jsou vidět.
3. Jednou **Cmd+Z**.
- [ ] Značky zmizí a vrstva je zase **skrytá** — celý běh je jeden krok Zpět.

### H5 — Opakovaný běh (nález G4)
1. Generovat s výchozím nastavením, pak skript spusť **znovu** se stejným nastavením a Generovat.
- [ ] Po druhém běhu přijde upozornění, že se nové značky kryjí se staršími, s počtem; radí Zpět nebo smazání starých.
2. Jednou **Cmd+Z**.
- [ ] Zmizí jen značky druhého běhu, první sada zůstane.
3. Nakresli dva obdélníky daleko od sebe. Vyber první, spusť skript v režimu **Vybraná cesta**, Generovat; pak totéž s druhým.
- [ ] Druhý běh **nic nehlásí** — značky jiného tvaru se nepočítají.

### H6 — Rohové zóny přepnou hrany na Rozteč (nález G3)
1. Spusť skript s výchozím nastavením (hrany v režimu **Počet ok**).
2. Zaškrtni **Zhustit u rohů**.
- [ ] Řádky hran se přepnou na **Rozteč** a **Počet ok zešedne**; tooltip na zašedlém Počtu popisuje zóny.
3. Zóny odškrtni.
- [ ] Hrany se vrátí na **Počet ok** s původními hodnotami.
4. Zóny znovu zaškrtni (Počet 3, Rozteč 50 mm) a Generovat.
- [ ] Značky na hraně odpovídají **Rozteči**, kterou dialog ukazoval.

---

## I) Úpravy z auditu UI 2026-09-29

> Top 5 z [auditu UI](../../docs/reports/2026-09-29-audit-ui-grommet-marks.md).
> Texty a stavy ověřil skutečný build v Illustratoru 30.8.2 bez zobrazení okna;
> tady zůstává, jak se nápovědy a hlášky ukážou na obrazovce.

### I1 — Nápovědy (audit A1, A3, A4)
- [ ] Najeď na pole **Velikost** → nápověda mluví o průměru kruhu a délce ramen kříže, ne o čtverci.
- [ ] Zaškrtni **Zhustit u rohů** a najeď na zašedlé rádio **Počet ok** v řádku hrany → nápověda vysvětluje, že se zónami se hrana plní podle rozteče. (Ukáže se nápověda i na zašedlém prvku?)
- [ ] Obdélník v režimu **Vybraná cesta**, zvol **Počet ok** → najeď na zašedlé **Zhustit u rohů** → nápověda radí zvolit Rozteč, netvrdí „nemá rohy".

### I2 — Jednotky tlouštěk (audit A2)
- [ ] Popisky jsou **„Reg. tah (pt):"** a **„Bílé halo (pt):"**, nic není uříznuté a řádek je zarovnaný jako dřív.
- [ ] Nápověda u **Jednotek** říká, že tloušťky tahů jsou vždy v bodech.

### I3 — Proč je „Vybraná cesta" zašedlá (audit A5)
1. Vyber **dva objekty** (nebo složenou cestu) a spusť skript.
- [ ] Nápověda na zašedlé „Vybraná cesta" radí nechat vybraný jeden objekt a rozdělit složenou cestu.

### I4 — Víc artboardů (audit A8)
1. Dokument se **dvěma artboardy**, režim **Hrany artboardu**, Generovat.
- [ ] Na konci přijde upozornění, že značky dostaly všechny artboardy, s počtem 2.
2. Totéž v dokumentu s **jedním** artboardem.
- [ ] Žádné upozornění.

### I5 — Překlep v čísle (audit A9)
- [ ] Do **Rozteče** napiš `1O5` (písmeno O) → pole zčervená a **Generovat zešedne**.
- [ ] `1 000` → totéž. `12,5` → pole je v pořádku.

---

## J) Tvary v režimu cesty (1.3.0)

> Odsazení od kraje, zaoblené rohy, část obvodu a kontrola před vytvořením
> značek — [návrh](../../docs/specs/2026-10-11-grommet-marks-path-mode-design.md).
> Čísla (polohy značek, odsazení, jeden krok Zpět, výška dialogu) už ověřil
> skutečný build v Illustratoru 30.8.2 (2026-10-13) na tvarech zadaných
> v bodech. Automatický průchod 2026-10-17 (skript v Illustratoru, tvary
> zadané body, dialog bez kliknutí) prošel J1–J9, J12, J13, G1 a G6. Ručně
> zbývá, co se tak ověřit nedá: J10, J11, vzhled dialogu v J8, J12
> skutečnými kliky, tvar nakreslený rukou (J1, J2 krok 2) a skutečná data
> (J2 krok 5). Počty značek platí pro
> rozměry uvedené v kroku; u ručně nakresleného tvaru se mohou lišit o značku
> na dlouhé straně.
>
> **Příprava:** dokument cca 800 × 600 mm, jednotky mm, výchozí Velikost
> a tahy. Před každým testem smaž vrstvu „Grommet Marks" (nebo dej Zpět) —
> jinak skript ohlásí značky kryjící se s předchozím během.
>
> **Kontrola odsazení očima:** zkopíruj řezovou linku a dej na kopii
> `Objekt ▸ Cesta ▸ Odsazená cesta…` s posunem **−20 mm** (dovnitř), Spoje
> čar **Ostré**, Limit úkosu **4** — stejné nastavení jako ve skriptu. Středy
> značek leží na té kopii. Kopii potom smaž.

### J1 — Štít: odsazení a rohy
1. Nakresli štít domu (Pen Tool, uzavřená cesta o pěti bodech): základna
   **600 mm**, stěny **320 mm**, hřeben **210 mm** nad okapy. Vyber ho nástrojem
   Výběr (V), spusť skript a přepni na **Vybraná cesta**.
- [ ] Šedý řádek pod Umístěním: „Uzavřená cesta · 5 rohů · značky leží na cestě".
- [ ] Panel Cesta: **Odsazení od kraje** (0), Počet ok / Rozteč, zašedlé
  **Jen vybraná část obvodu**. Poznámka „posuňte si cestu předem" tam není.
- [ ] Po zadání Odsazení **20** řádek ztratí „· značky leží na cestě".
2. Odsazení od kraje **20**, Rozteč **300 mm**, Generovat.
- [ ] **6 značek**: jedna v každém z pěti rohů a jedna uprostřed spodní strany.
- [ ] Rohové značky leží **20 mm od obou stran** rohu, uvnitř tvaru. Kontrola
  očima: všechny středy leží na kopii posunuté o −20 mm.
- [ ] Řezová linka zůstala beze změny: pořád vybraná, 5 kotev. V dokumentu
  nezůstala žádná odsazená kopie (panel Vrstvy: původní vrstva a vrstva
  „Grommet Marks").
3. Smaž značky, obrať směr cesty (příkaz **Obrátit směr cesty** — název
   ověřený v české lokalizaci, místo v menu ne — nebo nakresli štít z druhé
   strany) a Generovat znovu.
- [ ] Stejných 6 značek na stejných místech.

### J2 — Zaoblený obdélník: živé rohy, R > D i R < D
1. Nakresli obdélník **600 × 320 mm** (Rectangle Tool) a v panelu Transformace
   nastav živým rohům poloměr **50 mm**. Vyber ho, spusť skript, **Vybraná
   cesta**.
- [ ] Šedý řádek: „Uzavřená cesta · 4 zaoblené rohy · značky leží na cestě".
- [ ] Zvol **Počet ok**: pole ukáže **4** a je zašedlé (počet je dán rohy,
  zaoblené se počítají).
2. Odsazení **20** (poloměr je větší), Rozteč **300 mm**, Generovat.
- [ ] **6 značek**: v každém rohu **jedna uprostřed oblouku** (na úhlopříčce
  rohu) a po jedné uprostřed horní a spodní strany. Na svislých stranách
  (kratších než Rozteč) nic dalšího.
- [ ] Všechny značky jsou 20 mm od řezu, i v obloucích (kontrola kopií).
3. Smaž značky. Poloměr rohu změň na **10 mm** (menší než odsazení), Odsazení
   **20**, Generovat.
- [ ] Šedý řádek pořád hlásí „4 zaoblené rohy" (čte řezovou linku, na
  odsazení nezávisí).
- [ ] 6 značek, rohové v ostrých rozích linky ok — **20 mm od obou stran**, jako
  u obdélníku s ostrými rohy.
4. Smaž značky, poloměr **50 mm**, Odsazení **0**, Generovat.
- [ ] Značky leží na samotné cestě: v každém zaobleném rohu jedna uprostřed
  oblouku (1.2.0 dávala hladký prstenec od první kotvy).
5. *(volitelné, chce skutečná data)* Cesta z PDF od klienta se zaobleným
   rohem.
- [ ] Roh z jednoho nebo víc Bézierových úseků se hlásí jako **zaoblený** a má
  jednu značku uprostřed oblouku. Oblouk z mnoha krátkých úseček zaoblený
  roh nehlásí (známé omezení, návrh §4) — zapiš, jak takové PDF vypadá.

### J3 — Kruh: začátek nahoře, Počet
1. Nakresli kruh o průměru **600 mm** (Ellipse Tool + Shift), vyber ho, spusť
   skript, **Vybraná cesta**.
- [ ] Šedý řádek: „Uzavřená cesta · bez rohů · první značka nahoře · značky leží
  na cestě". **Počet ok** i **Rozteč** jsou aktivní.
2. Odsazení **20**, **Počet ok 7**, Generovat.
- [ ] **7 značek** na kružnici o poloměru 280 mm, první **přesně nahoře** (X
  značky = X středu kruhu), ostatní souměrně vlevo a vpravo po cca 51,4°.
3. Smaž značky, přepni na **Rozteč 300 mm**, Generovat.
- [ ] **6 značek** (obvod linky ok ≈ 1759 mm), první nahoře a jedna dole.
4. Smaž značky, otoč kruh o 30° (Objekt ▸ Transformovat ▸ Otočit), takže první
   kotva leží jinde. Generovat s Počtem 7.
- [ ] Stejné polohy jako v kroku 2 (do 0,3 mm: otočený kruh z Illustratoru
  není přesná kružnice a jeho nejvyšší bod se posune), první značka zase
  v nejvyšším bodě — nezávisí na první kotvě ani na tom, kudy je cesta
  nakreslená.
5. Smaž značky, Odsazení **0**, Počet 7, Generovat.
- [ ] Značky leží na samotné kružnici, první nahoře.

### J4 — Část obvodu (Přímý výběr)
1. Vyber štít z J1 nástrojem **Výběr (V)** (všechny kotvy), spusť skript,
   **Vybraná cesta**.
- [ ] **Jen vybraná část obvodu** je zašedlé; nápověda radí vybrat část
  nástrojem Přímý výběr (A): kotvy na začátku i na konci každého úseku.
2. Storno. Přímým výběrem klikni **jen na jednu kotvu**, spusť skript.
- [ ] Zaškrtávátko zašedlé; nápověda říká, že je vybraná jen samostatná kotva
  a má se označit i druhý konec úseku.
3. Storno. Přímým výběrem klikni na **spodní stranu** (na úsečku, ne na kotvu)
   — obě její kotvy jsou vyplněné. Spusť skript, **Vybraná cesta**, Odsazení
   **20**, Rozteč **300 mm**.
- [ ] Zaškrtávátko je aktivní, vypnuté, s textem „Jen vybraná část obvodu
  (1 z 5 úseků)".
4. Zaškrtni ho a Generovat.
- [ ] **3 značky** na spodní straně: dvě v dolních rozích linky ok a jedna
  uprostřed, všechny 20 mm nad spodní hranou. Střecha a stěny bez značek.
- [ ] Spodní strana je po běhu **pořád vybraná** Přímým výběrem (obě kotvy
  vyplněné) — výběr se nezměnil na celou cestu.
5. Spusť skript znovu se stejným výběrem.
- [ ] Zaškrtávátko je zase **vypnuté** (do předvolby se neukládá).
- [ ] Zaškrtni, Generovat: stejné tři polohy a upozornění na kryjící se značky
  (počet: 3).
6. Spusť skript znovu se stejným výběrem, **Vybraná cesta**, vyber **Počet ok**
   (na štítu ukáže 5, jen pro čtení).
- [ ] Zaškrtni **Jen vybraná část obvodu**: řádek se přepne na **Rozteč**
  (Počet ok zašedne, pole Rozteč jde upravit) a nápověda zašedlého Počtu ok
  říká, že u vybrané části se značky řídí roztečí. Zhustit u rohů jde na
  štítu zase zapnout.
- [ ] Zruš zaškrtnutí: **Počet ok** je zase vybraný (na štítu 5, jen pro čtení)
  a pole Rozteč je zašedlé.

### J5 — Kontrola před vytvořením značek: pruh a činka
1. Nakresli úzký pruh **35 × 350 mm**, vyber ho, spusť skript, **Vybraná
   cesta**, Odsazení **20** (dvakrát 20 je víc než 35). Generovat.
- [ ] Jediná hláška, začíná „CHYBA:“ (ne „UPOZORNĚNÍ:“): „Odsazení 20 mm je na
  tento tvar moc velké — linka ok by se v nejužším místě zhroutila. Zmenšete
  odsazení. Dokument nebyl změněn."
- [ ] **Nic nevzniklo**: žádná značka, vrstva „Grommet Marks" se nevytvořila
  (pokud předtím nebyla), pruh zůstal vybraný a beze změny.
- [ ] `Úpravy ▸ Zpět`: první Zpět vrátí neviditelný krok skriptu (kopii, na
  které kontrola měřila; v dokumentu se nic nezmění), teprve druhé tvůj
  poslední krok. Změřeno 2026-10-17 — odmítnutý běh nechá krok v historii,
  ne v dokumentu.
2. Znovu, Odsazení **12**, Generovat.
- [ ] Projde: každá značka leží 12 mm od nejbližší strany pruhu.
3. Nakresli **činku**: dva kruhy o průměru 150 mm se středy 250 mm od sebe
   a mezi ně obdélník vysoký **28 mm** (hrdlo), vše spoj v Pathfinderu
   (Sjednotit) do **jedné cesty**. Vyber ji, **Vybraná cesta**, Odsazení
   **20**, Generovat.
- [ ] Hláška „CHYBA: Linka ok se v úzkém místě rozpadá na víc částí (2).
  Zmenšete odsazení. Dokument nebyl změněn." a nic nevzniklo (ověřeno
  2026-10-17, předpona od 1.4.0).
4. Znovu, Odsazení **10** (2 × 10 se do hrdla 28 mm vejde), Generovat.
- [ ] Projde: značky i ve čtyřech vnitřních rozích u hrdla, 10 mm od obou
  hran. V úzkém hrdle se dvojice značek skoro dotýkají — tak vychází tvar,
  není to chyba. *(Do 2026-10-17 skript vnitřní rohy odmítal hláškou o moc
  velkém odsazení, viz J13.)*

### J6 — Otevřená cesta
1. Nakresli otevřenou lomenou čáru ze tří bodů, dva úseky po cca **375 mm**
   (úhel u vrcholu cca 100°), vyber ji, spusť skript, **Vybraná cesta**.
- [ ] Šedý řádek: „Otevřená cesta · 3 rohy · značky leží na cestě".
- [ ] Pole **Odsazení od kraje** je zašedlé; nápověda říká, že u otevřené
  cesty nejde určit, na kterou stranu odsadit.
2. Generovat, Rozteč **300 mm** (v zašedlém poli klidně zůstává 20).
- [ ] Bez hlášky; **3 značky** přímo na čáře (středem): oba konce a vrchol.
  Platí pro úseky do 400 mm (u 375 mm je rezerva); od 400 mm výš se mezi
  konec a vrchol začnou doplňovat další značky (u přesně 400 mm je to
  rozhraní, proto 375).

### J7 — Stará předvolba s ručně odsazenou cestou
> **Příprava:** potřebuješ předvolbu, která v souboru nemá `pathOffset` (jako
> uložená ve verzi 1.2.0). Nejjistější je předvolba uložená skutečným během
> 1.2.0; jinak si ji vyrob:
> 1. Spusť skript s vybraným štítem, **Vybraná cesta**, Odsazení **20**,
>    **Uložit jako…** `Stará 1.2`, Storno.
> 2. **Zazálohuj** soubor, např. v Terminálu:
>    `cp -p "$HOME/Library/Application Support/GrommetMarks/GrommetMarksSettings.json"{,.bak}`
> 3. Soubor je **jeden řádek JSON** bez zalomení. V textovém editoru, který
>    zvládne dlouhý řádek, najdi `"Stará 1.2":{` a v té předvolbě odstraň
>    dvojici `"pathOffset":20` **spolu s čárkou před ní**, tedy `,"pathOffset":20`
>    těsně před uzavírací `}` předvolby (je to její poslední položka; kdyby za
>    ní ještě něco stálo, vyjmi místo toho čárku za ní). Ostatní předvolby nech
>    být.
> 4. Ověř, že je JSON pořád platný (bez výstupu kromě `OK`):
>    `node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' "$HOME/Library/Application Support/GrommetMarks/GrommetMarksSettings.json" && echo OK`
>    Poškozený soubor skript tiše ignoruje (předvolby zmizí z dialogu) a příští
>    uložení ho přepíše — v tom případě vrať zálohu (`.bak`).
1. Nakresli štít a **ručně ho odsaď** jako dřív (kopie, `Objekt ▸ Cesta ▸
   Odsazená cesta…`, posun −20 mm). Vyber odsazenou kopii a spusť skript. Dialog se
   otevře z `[Last Settings]`; předvolbu `Stará 1.2` načti v seznamu **Načíst**
   (je-li už vybraná, přepni na `[Výchozí]` a zpět, nebo klikni na ↺).
- [ ] Režim Vybraná cesta, **Odsazení od kraje** je **0** (ne 20); šedý řádek
  končí „· značky leží na cestě".
2. Generovat.
- [ ] Značky leží přímo na vybrané (ručně odsazené) cestě — **žádné druhé
  odsazení**. Štít má ostré rohy, takže pro stejnou cestu a nastavení vyjdou
  stejné polohy jako v 1.2.0.
3. Zadej Odsazení **20**.
- [ ] Rozsvítí se **Uložit** a u předvolby hvězdička `*` (změna samotného
  odsazení se počítá). Po Uložit zkontroluj, že je v předvolbě 20: načti ji
  (↺, nebo přepni na jinou předvolbu a zpět) — dialog se otevírá z
  `[Last Settings]`, ne z předvolby.

### J8 — Šedý řádek ve všech stavech a nápovědy zašedlých prvků
- [ ] Řádek pod Umístěním ukazuje v těchto stavech přesně tyto texty (sleduj
  taky, že se při přepnutí režimu, jednotek a změně Odsazení mění hned).
  Řádky uzavřených tvarů končí „· značky leží na cestě" jen při Odsazení 0;
  tabulka uvádí texty při **Odsazení větším než 0** (zadej 20).

| stav | předpoklad | text |
|---|---|---|
| Hrany artboardu, 1 artboard | dokument s jedním artboardem | `1 artboard · 800 × 600 mm` podle dokumentu (po přepnutí na cm `80 × 60 cm`) |
| Hrany artboardu, víc artboardů | dokument se 3 artboardy (4: `4 artboardy`, 5 a víc: `5 artboardů`) | `3 artboardy · značky dostanou všechny` |
| předvolba chce cestu, žádná není vybraná | poslední běh (`[Last Settings]`) nebo načtená předvolba byl v režimu Vybraná cesta a při spuštění není nic vybráno | `Předvolba chce cestu, žádná není vybraná — značí se artboard.` Dialog se otevře v režimu Hrany artboardu. |
| štít | uzavřená cesta, Odsazení 20 | `Uzavřená cesta · 5 rohů` |
| zaoblený obdélník (J2) | Odsazení 20 | `Uzavřená cesta · 4 zaoblené rohy` |
| štít s oběma dolními rohy zaoblenými (živé rohy) | Odsazení 20 | `Uzavřená cesta · 3 rohy, 2 zaoblené` |
| kruh | Odsazení 20 | `Uzavřená cesta · bez rohů · první značka nahoře` |
| libovolná uzavřená cesta | Odsazení 0 | totéž + ` · značky leží na cestě` |
| otevřená cesta | libovolné Odsazení (pole je zašedlé) | `Otevřená cesta · 3 rohy · značky leží na cestě` |

- [ ] Nic se v řádku neuřízne ani nepřetéká a dialog neposkakuje při
  přepínání režimů. Dialog se vejde na obrazovku 13": nejvyšší stav
  (Hrany artboardu bez zrcadlení) měřil v 1.3.0 777 px, tlačítka Storno
  a Generovat byla vidět celá. Od 1.4.0 je dialog o řádek vyšší — výšky
  a kontrola tlačítek jsou v K7.
- [ ] Zašedlé prvky mají nápovědu s důvodem: **Vybraná cesta** (jako I3),
  **Odsazení od kraje** u otevřené cesty (J6), **Jen vybraná část obvodu**
  (J4), **Počet ok** při zaškrtnuté části obvodu (J4 krok 6), **Zhustit u
  rohů** na kruhu a s Počtem ok na tvaru s rohy (jako F3, I1). *(Ukáže se
  nápověda i na zašedlém prvku? Pokud ne, jde o chování Illustratoru, ne
  o text.)*

### J9 — Jeden krok Zpět
1. Štít z J1, Odsazení 20, Generovat. Jednou **Cmd+Z**.
- [ ] Zmizí všechny značky i vrstva „Grommet Marks" (pokud ji běh vytvořil).
- [ ] Řezová linka je na svém místě, beze změny (5 kotev, uzavřená) a není
  v dokumentu žádný odsazený zbytek.

### J10 — Klik Přímým výběrem přímo na zakřivený úsek
> Tohle je měření, ne test: návrh (§14) neví, co Přímý výběr hlásí při kliknutí
> **přímo na zakřivený úsek**. Výsledek patří do `docs/extendscript-engine-facts.md`.
1. Zaoblený obdélník z J2 (poloměr 50 mm). Přímým výběrem klikni doprostřed
   **oblouku v rohu** (na křivku, ne na kotvu). Spusť skript, **Vybraná cesta**.
- [ ] Zapiš, co ukáže **Jen vybraná část obvodu**: (a) aktivní s počtem úseků
  „(1 z 8 úseků)", (b) zašedlé s nápovědou o samostatné kotvě, (c) zašedlé
  s nápovědou o výběru části obvodu.
2. Je-li aktivní, zaškrtni a Generovat.
- [ ] Zapiš, kam značky padly (nezměřené očekávání: konce oblouku a jeho střed,
  odsazené dovnitř), a zda je výběr po běhu stejný jako před ním.

### J11 — Vypnuté „Nová kresba má základní vzhled"
> Také měření, ne test: `offsetPath` zakládá kopii řezové linky novým objektem
> a nastavuje jen výplň a tah. Co udělá vypnutá volba **Nová kresba má základní
> vzhled** (menu panelu Vzhled), není změřeno — nová kopie by mohla převzít
> vzhled posledního objektu. Výsledek patří do `docs/extendscript-engine-facts.md`.
1. V panelu Vzhled (Appearance) vypni v jeho menu **Nová kresba má základní
   vzhled**. Zopakuj J1 krok 2 (štít, Odsazení 20, Rozteč 300 mm, Generovat).
- [ ] Zapiš: stejných 6 značek na stejných místech jako s volbou zapnutou?
  Hlásí skript chybu nebo kontrolu před vytvořením značek? Zůstalo v dokumentu
  něco navíc (panel Vrstvy)?
2. Volbu zase zapni.

### J12 — Řezová linka uvnitř skupiny
> Také měření, ne test: kopii pro odsazení zakládá `offsetPath` na vrstvě řezové
> linky, ne uvnitř její skupiny. Výsledek patří do
> `docs/extendscript-engine-facts.md`.
1. Štít z J1 dej do skupiny (Cmd+G). Přímým výběrem (A) klikni na jeho úsek
   uvnitř skupiny, spusť skript, **Vybraná cesta**.
- [ ] Zapiš: je **Vybraná cesta** dostupná a ukazuje šedý řádek „Uzavřená cesta ·
  5 rohů"?
2. Odsazení **20**, Rozteč **300 mm**, Generovat.
- [ ] Zapiš: polohy značek (jako J1?), co zůstalo vybrané po běhu, a zda
  v dokumentu (skupina, vrstva) nezůstal odsazený zbytek.
3. Vyber skupinu se štítem nástrojem **Výběr (V)** a spusť skript znovu.
- [ ] **Vybraná cesta** je dostupná a značky padnou jako v J1: skupina, ve
  které není nic než jedna cesta, se bere jako ta cesta (Illustrator takovou
  cestu podle způsobu výběru hlásí jako vybranou skupinu; do 2026-10-17
  Vybraná cesta zašedla).
4. Přidej do skupiny ještě jeden objekt, vyber skupinu nástrojem Výběr (V).
- [ ] Vybraná cesta zašedlá — ve skupině je víc objektů (jako dřív).

### J13 — Vnitřní roh: tvar L
1. Nakresli tvar L (uzavřená cesta o šesti bodech): **600 × 600 mm**, obě ramena
   široká **300 mm**. Vyber ho, **Vybraná cesta**, Odsazení **20**, Rozteč
   **300 mm**, Generovat.
- [ ] Projde bez hlášky, **8 značek**: v každém z šesti rohů linky ok jedna
  a po jedné uprostřed dvou dlouhých stran. Značka ve vnitřním rohu leží
  20 mm od obou hran — od vrcholu vnitřního rohu řezu je tím pádem 28 mm
  (20 × √2), a tak to má být.
- [ ] Šedý řádek: „Uzavřená cesta · 6 rohů". Do 2026-10-17 skript takový tvar
  odmítal hláškou „Odsazení 20 mm je na tento tvar moc velké".

---

## K) Měřítko kresby a rodinný jazyk (1.4.0)

> Pole Měřítko kresby 1:, šedý řádek s důvodem, předvolby a hlášky podle
> šablony všech nástrojů —
> [návrh](../../docs/specs/2026-10-20-grommet-marks-1.4.0-design.md). Logiku
> (dělení délek, texty řádku, předvolby, slovník, parita CS/EN) hlídají Node
> testy; tady je to, co Node nevidí: zápis měřítka do dokumentu, barvy řádku
> na světlém i tmavém UI, vzhled předvoleb v seznamu a rozměry dialogu. Rozměry
> v K7 jsou změřené v Illustratoru
> (`docs/extendscript-engine-facts.md`), nejsou odhad.
>
> **Příprava:** dokument s jedním artboardem **přesně 800 × 600 mm** (K1, K2
> a K4 čekají přesná čísla, ne přibližná; K1 si vyžádá zakázku Tile Exportu,
> viz tam), jednotky mm, výchozí hodnoty (`[Výchozí]`),
> Illustrator česky. Před každým testem smaž vrstvu „Grommet Marks“ (nebo dej
> Zpět) — jinak skript ohlásí značky kryjící se s předchozím během.
> **Měřítko si pamatuje dokument:** pokud test nepíše jinak, začíná na
> dokumentu bez měřítka (nový dokument, nebo v tomhle zadej 1 a jednou
> Generovat). Před K5 si zazálohuj nastavení:
> `cp -p "$HOME/Library/Application Support/GrommetMarks/GrommetMarksSettings.json"{,.bak}`

### K1 — Měřítko z Tile Exportu (nečekaná velikost značek)
1. Dokument pro K1 je zakázka Tile Exportu: artboard 800 × 600 mm
   s umístěným (linkovaným) PDF, které artboard pokrývá a které na disku
   existuje, a s cílovou složkou nastavenou v dialogu Tile Exportu — bez
   umístěné grafiky Tile Export hlásí „V dokumentu není umístěná grafika.“
   a nespustí se. Spusť **Tile Export** (1.1.0 a novější), zadej Měřítko
   kresby **1:10** a potvrď. Tile Export zapíše měřítko hned po potvrzení
   dialogu; export pak nech doběhnout do zkušební složky (v Tile Exportu
   1.2.0 ho jde zastavit podržením Esc, starší verze to neumí). Po každém
   běhu Tile Exportu zůstanou v dokumentu kontrolní pláty — artboardy
   `TE_01`…`TE_0n` a vrstva `TE_panels`, další běh je nahradí. **Smaž je**
   (artboardy v panelu Artboardy, původní artboard 800 × 600 mm nech; vrstvu
   v panelu Vrstvy), jinak by Grommet Marks viděl víc artboardů, řádek by
   ukázal třeba „3 artboardy · značky dostanou všechny“ a značky by vznikly
   na všech. Měřítko leží v metadatech dokumentu (XMP), ne v artboardech ani
   ve vrstvách, mazání ho nemění — ověří to první kontrola níž (pole ukazuje
   10). Dokument nezavírej. Spusť Grommet Marks.
- [ ] Pole **Měřítko kresby 1:** ukazuje **10**.
- [ ] Šedý řádek pod Umístěním je `1 artboard · 8000 × 6000 mm · 1:10`.
  Velikost artboardu je **skutečná** (800 × 600 mm × 10), ne velikost
  v souboru.
- [ ] Přepni Jednotky na cm: řádek je `1 artboard · 800 × 600 cm · 1:10`,
  Měřítko zůstává 10.
- [ ] Měřítko je vidět na dvou místech — v poli a na konci řádku. Nejde ho
  přehlédnout dřív, než klikneš na Generovat.
2. Generovat s výchozími hodnotami.
- [ ] Značky mají **0,3 mm** (Velikost 3 mm ve skutečnosti ÷ 10) a leží
  0,7 mm od okraje. V 1:10 je to správně, není to chyba.
3. Smaž vrstvu značek, změň Měřítko na **4** a Generovat. Potom otevři dialog
   Tile Exportu a zavři ho Storno.
- [ ] Tile Export nabídl **Měřítko kresby 1:4** — dokument si měřítko pamatuje
  ve společném klíči, v obou směrech.
4. Otevři **nový** dokument (bez měřítka) a spusť Grommet Marks.
- [ ] Měřítko je **1**, ne 4 a ne 10: `[Last Settings]` ho nenese, patří
  dokumentu.

### K2 — 1:10 proti ruční dělení deseti
> Smysl: při měřítku 1:10 skript vydělí **všechny** délky deseti, i velikost
> značky a tloušťky tahů, a počty nechá. Výsledek musí být stejný jako běh
> v 1:1 s hodnotami vydělenými ručně — tak se to dělalo do 1.3.0.
1. Dokument 800 × 600 mm bez měřítka. Nastav **Měřítko 10**, Odsazení X
   **70**, Odsazení Y **70**, Horní i Levou na **Rozteč 1050 mm**, Velikost
   **30**, Reg. tah **10**, Bílé halo **30**. Generovat. Vrstvu „Grommet Marks“
   přejmenuj na „A“.
2. Totéž v 1:1 s hodnotami vydělenými ručně: **Měřítko 1**, Odsazení X **7**,
   Odsazení Y **7**, Horní i Levou na **Rozteč 105 mm**, Velikost **3**, Reg.
   tah **1**, Bílé halo **3**. Generovat. Vznikne nová vrstva „Grommet Marks“.
- [ ] Obě vrstvy mají **stejný počet značek** a značky leží **přesně přes
  sebe** (střídavě skryj jednu a druhou vrstvu: nic se neposune; v panelu
  Informace má rohová značka na obou vrstvách stejné X/Y, 7 mm od okraje).
- [ ] Značka má na obou vrstvách **3 mm**, registrační tah **1 pt** a bílé
  halo **3 pt** — tloušťky tahů se dělí taky.
3. Smaž obě vrstvy a nakresli štít z J1 **ve zmenšení 1:10** (základna
   60 mm, stěny 32 mm, hřeben 21 mm nad okapy). Vyber ho, **Vybraná cesta**,
   Měřítko **10**, Odsazení od kraje **20**, Rozteč **300 mm**, Velikost
   **30**.
- [ ] Šedý řádek před spuštěním: `Uzavřená cesta · 5 rohů · 1:10`.
4. Generovat.
- [ ] Stejných **6 značek** jako v J1 (pět rohů a jedna uprostřed základny).
  Rohové značky leží **2 mm** od obou stran rohu (20 mm ve skutečnosti ÷ 10):
  zkopíruj cestu, na kopii dej Odsazená cesta −2 mm a zkontroluj očima, jako
  v úvodu J.

### K3 — Neplatné měřítko; jednotky a předvolby ho nemění
1. Vyrob předvolbu `Test A` (**Uložit jako…**) a změň u ní Velikost, ať má
   Uložit proč svítit. Do pole Měřítko kresby 1: napiš postupně `0,5`, `0`,
   `101`, `abc` a `1e1`.
- [ ] Pokaždé pole **zčervená** a **Generovat**, **Uložit** i **Uložit jako…**
  zešednou.
- [ ] Šedý řádek pod Umístěním je červený a říká
  `✗ Měřítko kresby: zadejte číslo od 1 do 100.`
- [ ] Platí `1`, `100`, `10` s mezerou okolo a `2,5` (zůstane `2,5`, po
  Generovat a dalším otevření taky). Po opravě se pole vrátí na normální
  barvu, řádek na šedý nález a tlačítka se rozsvítí.
2. Měřítko **10**. Přepni Jednotky mm → cm → mm.
- [ ] Měřítko zůstává **10**; ostatní délky se přepočítají (jako C5).
3. Přepni v seznamu předvoleb na `[Výchozí]` a zpět na `Test A`.
- [ ] Měřítko zůstává **10** — předvolba ho nemění a nenese.
4. **Zpět vrací značky, ne měřítko.** Nastav Měřítko **7**, Generovat (smaž
   předtím vrstvu značek), jednou **Cmd+Z** a spusť skript znovu.
- [ ] Značky z toho běhu zmizely, ale pole Měřítko kresby 1: ukazuje **7**:
  měřítko se do dokumentu zapíše mimo krok Zpět (změřeno 2026-10-21, viz
  `docs/extendscript-engine-facts.md`) a dokument si ho drží. Opravíš ho
  přepsáním pole; dokument bez měřítka dostaneš zpět zadáním `1` a jedním
  Generovat.

### K4 — Šedý řádek v pěti stavech, na světlém i tmavém UI
> Řádek má dvě podoby: **nález** (šedý, jako zašedlý text) a **důvod**
> (červený, se symbolem ✗, dokud je Generovat šedé). Ruční je tu barva:
> Node ověří text, ne jak červená vypadá na tmavém pozadí ani jestli se po
> opravě vrátí šedá. Projdi stavy dvakrát: s **tmavým** a se **světlým**
> uživatelským rozhraním Illustratoru (v jeho nastavení, část Uživatelské
> rozhraní, jas; název položky se liší podle verze; po přepnutí skript spusť
> znovu); čtyři úrovně jasu jsou v posledním bodě tohoto testu.

| # | stav | jak ho vyvolat | text v řádku |
|---|---|---|---|
| 1 | normální | Hrany artboardu, dokument bez měřítka | `1 artboard · 800 × 600 mm` (šedě) |
| 2 | měřítko 1:10 | Měřítko kresby 10 | `1 artboard · 8000 × 6000 mm · 1:10`; s vybraným štítem v režimu Vybraná cesta a **Odsazením od kraje 20** `Uzavřená cesta · 5 rohů · 1:10` (šedě); s výchozím Odsazením 0 řádek před koncem dodá `· značky leží na cestě` |
| 3 | jedno neplatné pole | Velikost `abc` | `✗ Velikost: zadejte číslo od 0,01 do 9999 mm.` (červeně) |
| 4 | víc neplatných polí | `abc` do Velikosti, Reg. tahu a Bílého hala | `✗ Neplatná pole: 3 — opravte červená pole.` (červeně) |
| 5 | bez tvaru, bez hrany | odškrtni Kruh i Kříž; v jiném běhu vypni Horní i Levou hranu | `✗ Značka nemá tvar — zapněte Kruh nebo Kříž.`; `✗ Není zapnutá žádná hrana.` (červeně) |

- [ ] Ve stavech 3–5 je text **červený a čitelný** na světlém i na tmavém UI
  (ne černý na tmavém, ne bledě růžový) a Generovat je šedé.
- [ ] Po odstranění důvodu se řádek vrátí na **šedý nález** (stav 1 nebo 2),
  ne zůstane červený a není ani černý či jinak kontrastní než ve stavu 1;
  Generovat se rozsvítí.
- [ ] Další pole se pojmenují stejně: Reg. tah `0` → `✗ Reg. tah: zadejte číslo
  od 0,1 do 50 pt.`; Horní Počet ok `1,5` → `✗ Horní — Počet ok: zadejte celé
  číslo od 1 do 9999.`; Odsazení X `-1` → `✗ Odsazení od kraje ↔: zadejte
  číslo od 0 do 9999 mm.`
- [ ] Je-li neplatné pole **i** chybí tvar, řádek jmenuje pole (pole mají
  přednost před tvarem, tvar před hranou).
- [ ] Nic se v řádku neuřízne a dialog při změnách neposkakuje na šířku.
- [ ] **Čtyři úrovně jasu.** Illustrator › Nastavení › Uživatelské rozhraní ›
  Jas (Settings › User Interface › Brightness): **Dark, Medium Dark, Medium
  Light, Light**; na každé skript spusť znovu. Stavy 1 a 2 (nález) i 3–5
  (důvod) jsou čitelné na všech čtyřech a **nález vypadá jako v 1.3.0**:
  nativní zašedlý text, ne zvlášť světle šedý a ne vybledlý do pozadí
  (zejména na Medium Light). Nález je zakázaný popisek, který skript nikdy
  nemaluje; důvod je druhý popisek, červený, ve stejném místě. Mezi stavy
  se viditelný text vždy vymění celý (nezůstane vidět starý přes nový).

### K5 — Předvolby: hvězdička, [Výchozí], Uložit
1. **[Výchozí] z kódu.** Zazálohuj nastavení (úvod K). Spusť skript,
   **Uložit jako…** `Test A`, Storno. Otevři soubor `GrommetMarksSettings.json`
   v textovém editoru (je na jednom řádku, bez mezer): za `"[Default]":{`
   najdi první `"markSize":3` a změň ho na `"markSize":77`, ulož. Spusť
   skript a vyber v seznamu `[Výchozí]`.
- [ ] Velikost je **3**, ne 77: `[Výchozí]` se při každém otevření sestaví
  z kódu. (Hodnota 77 v souboru zmizí při dalším uložení; chceš-li, vrať
  soubor ze zálohy.)
2. **Hvězdička jen u aktivní předvolby.** Vyber `Test A`, změň Velikost.
- [ ] Zavřená položka seznamu se přepsala na `Test A *` a svítí ↺ i Uložit.
3. Vyber v seznamu `[Výchozí]` (změny se zahodí), otevři seznam.
- [ ] **Žádná** položka nemá hvězdičku. Změň Velikost: hvězdičku má jen
  `[Výchozí] *`, `Test A` ne. Vrať se na `Test A`: `[Výchozí]` je zase bez
  hvězdičky.
4. **Uložit s neplatným polem.** U `Test A` změň Velikost na `4` (svítí Uložit,
   ↺, hvězdička), pak na `4x`.
- [ ] Pole je červené, **Uložit** i **Uložit jako…** jsou šedé, ↺ svítí
  a řádek pod Umístěním říká `✗ Velikost: …`.
5. Vrať Velikost na `4` a klikni **Uložit**.
- [ ] **Uložit zhasne** (i ↺), hvězdička zmizí z položky `Test A`.
- [ ] Uložit na změněném `[Výchozí]` otevře **Uložit jako…** (výzva `Název
  nové předvolby:`), jako dřív; zavři ji Storno.
6. **Překlep ve skrytém poli.** Vyber štít z J1, spusť skript, **Vybraná
   cesta**, do Odsazení od kraje napiš `abc` (pole zčervená, Generovat šedé).
   Přepni zpátky na **Hrany artboardu**.
- [ ] Generovat se rozsvítí — pole druhého režimu se nekontroluje.
7. **Uložit jako…** `Test B`.
- [ ] Položka `Test B` nemá po uložení hvězdičku.
- [ ] V souboru nastavení má `Test B` u `pathOffset` hodnotu `0` (výchozí
  hodnota pole), ne `null` ani text. Předvolba nikdy neuloží hodnotu, kterou
  další otevření nepřečte.
8. Panel Předvolby: ↺ je malé tlačítko ve vlastní skupině vedle seznamu;
   **Uložit**, **Uložit jako…** a **Smazat** jsou vpravo pod seznamem
   a žádné nemá uříznutý popisek (viz také K7).

### K6 — Hlášky: CHYBA:, UPOZORNĚNÍ:, „…“, bez vykřičníků
1. **Odmítnutí.** Nakresli pruh **35 × 350 mm** (jako J5), vyber ho,
   **Vybraná cesta**, Měřítko **5**, Odsazení od kraje **100** (ve skutečnosti
   100 mm, v dokumentu 20 mm — víc než polovina pruhu), Generovat. Dokument
   před tím měřítko 5 nemá (drží 1, nebo 10 z K1).
- [ ] Hláška začíná **`CHYBA: `** a končí **`Dokument nebyl změněn.`**:
  „Odsazení 100 mm je na tento tvar moc velké — linka ok by se v nejužším
  místě zhroutila. Zmenšete odsazení. Dokument nebyl změněn.“ Bez
  vykřičníku. (Selhání samotného odsazení Illustratoru končí jinak:
  „… Žádná značka nevznikla.“ — to se snadno nevyvolá.)
- [ ] Nic nevzniklo (žádná značka, žádná nová vrstva).
2. Spusť skript znovu.
- [ ] Měřítko je dál tím, co dokument držel před odmítnutým během (1, nebo 10
  z K1) — **ne 5**. Měřítko se do dokumentu zapíše až po úspěšném běhu.
3. Nastav Měřítko **5**, Odsazení od kraje **20**, Generovat. Spusť skript
   znovu.
- [ ] Běh projde a Měřítko je teď **5**.
4. **Upozornění.** Spusť skript a Generovat ještě jednou na stejném
   dokumentu, bez smazání vrstvy.
- [ ] Hláška začíná **`UPOZORNĚNÍ: `**: „Nové značky se kryjí se značkami,
  které už ve vrstvě byly (počet: …) — nejspíš opakovaný běh. …“ Je-li
  upozornění víc, předpona stojí jednou na začátku a upozornění jsou na
  samostatných řádcích.
5. Smaž značky z vrstvy „Grommet Marks“, vrstvu skryj (oko) a Generovat.
- [ ] „UPOZORNĚNÍ: Skrytá vrstva „Grommet Marks“ byla zviditelněna, aby byly
  nové značky vidět a vytiskly se.“ Název vrstvy je v „…“.
6. Předvolby `Test A` a `Test B` vznikly v **K5** — bez K5 je nejdřív vyrob
   (**Uložit jako…**, dvě různé hodnoty Velikosti). **Uložit jako…**
   existujícím názvem (`Test A`), **Smazat** neupravenou předvolbu (`Test B`;
   na otázku odpověz Ne, předvolbu ještě potřebuješ), prázdný název, název
   `[x]`.
- [ ] `Předvolba „Test A“ už existuje. Přepsat?`
- [ ] `Smazat předvolbu „Test B“? Smazání nejde vrátit.` Změň u `Test B`
  Velikost (v seznamu je `Test B *`) a dej Smazat znovu: otázka je stejná
  a jméno je bez hvězdičky; odpověz Ne.
- [ ] `Zadejte název předvolby.`
- [ ] `Názvy v hranatých závorkách jsou vyhrazené. Zvolte jiný název.`
7. *(volitelné)* Zavři všechny dokumenty a spusť skript.
- [ ] `Před spuštěním skriptu otevřete dokument.` (beze změny, bez předpony.)
8. *(volitelné, jako B5)* Selhání zápisu nastavení.
- [ ] Při Generovat: `Nastavení se nepodařilo uložit — příště se dialog
  otevře bez něj. Běh pokračuje.` Běh opravdu pokračuje a hláška nemá
  předponu `CHYBA:`. Z tlačítek předvoleb (Uložit, Uložit jako…, Smazat)
  stejná hláška končí po „bez něj.“ — dialog zůstává otevřený, není co
  pokračovat.
- [ ] Žádná z hlášek, které jsi viděl, nekončí vykřičníkem. Záhlaví dialogu je
  **Grommet Marks v…** (bez slova Illustrator na začátku).

### K7 — Dialog na 13" displeji: tlačítka celá
> Cíl z návrhu (§8): dialog nejvýš cca 850 px na výšku (strop jako u Tile
> Exportu), bez uřízlých tlačítek. Displej uživatele je 1512 × 982 s Dockem.
> Rozměry jsou změřené headless v Illustratoru 30.8.2 (2026-10-21,
> `window.size` bez záhlaví okna; nejvyšší stav i se záhlavím 832 px,
> podrobnosti v `docs/extendscript-engine-facts.md`); tady se ověřuje, že na
> skutečném displeji nic nepřesahuje.

| stav dialogu | výška (px) | šířka (px) |
|---|---|---|
| Hrany artboardu, obě zrcadlení zapnutá (výchozí) | 758 | 535 |
| Hrany artboardu, obě zrcadlení vypnutá (nejvyšší) | 804 | 535 |
| Vybraná cesta (štít) | 678 | 535 |
| totéž anglicky | 758 / 804 / 678 | 534 |

1. Projdi stavy v tabulce; v každém se podívej na spodní okraj dialogu.
- [ ] **Storno** a **Generovat** jsou vidět **celé** a dialog nezasahuje pod
  Dock ani pod spodní okraj displeje, v každém stavu.
- [ ] Panel Předvolby: ↺ je malé tlačítko vedle seznamu, **Uložit**,
  **Uložit jako…** a **Smazat** mají celé popisky (zvlášť „Uložit jako…“
  včetně tří teček) a žádné tlačítko neroste se šířkou seznamu.
- [ ] Panel Umístění: druhý řádek „Jednotky: [Milimetry ▾] Měřítko kresby 1:
  [__]“ je na jednom řádku a nic se neřeže.
- [ ] Šedý řádek jsou od posledního měření dva popisky ve stohu (jeden
  viditelný): rozměry dialogu v tabulce se tím **nezměnily** (tolerance pár
  pixelů) a pod řádkem není nová mezera. Kdyby se změnily, zapiš nové hodnoty.
2. Spusť skript s vybraným štítem a v poli Měřítko kresby 1: napiš `99,9`;
   potom přepni Jednotky a režimy (Hrany artboardu ⇄ Vybraná cesta).
- [ ] Šedý řádek se vejde i s koncem „· 1:99,9“ v obou režimech
  a **dialog při tom nemění šířku**.
- [ ] Nejdelší důvody se vejdou taky: zapni Rohové zóny a do Rozteče napiš
  `x` → `✗ Rohové zóny — Rozteč: zadejte číslo od 0,01 do 9999 mm.`
3. *(má-li uživatel anglický Illustrator; jinak je anglická varianta
   změřená, viz `docs/extendscript-engine-facts.md`)* Spusť skript
   v angličtině.
- [ ] Panel Corner zones: „Densify at corners ☐ — first [5] marks, spacing
  [100]“ je v jednom řádku, nic se nepřekrývá ani neřeže (dřív „marks,
  pitch“). Záhlaví sloupce hran je „Spacing“, popisek v panelu Cesta
  „Spacing:“.
- [ ] Důvod v zónách se vejde: `✗ Corner zones — Spacing: enter a number from
  0.01 to 9999 mm.`

### K8 — Zrcadlená hrana s nesmyslem nešedí Generovat
1. V panelu Hrany **vypni** „horní ↓ dolní“ (zrcadlení). Zobrazí se řádek
   Dolní hrany. Zapni Dolní hranu a do jejího **Počet ok** napiš `abc`.
- [ ] Pole je červené, Generovat je šedé a řádek pod Umístěním říká
  `✗ Dolní — Počet ok: zadejte celé číslo od 1 do 9999.`
2. Zapni zpět zrcadlení „horní ↓ dolní“. Řádek Dolní hrany zmizí.
- [ ] Generovat se **rozsvítí** a řádek se vrátí na šedý nález. Řádek, který
  operátor nevidí, nic neblokuje (zrcadlená hrana se z `abc` nečte).
3. Generovat.
- [ ] Projde bez hlášky; dolní hrana má stejné značky jako horní (zrcadlí ji).
4. Totéž pro Pravou hranu a zrcadlení „levou → pravou“.
- [ ] Stejný výsledek.

---

## Hlášení problému

U každého neúspěchu poznač: **číslo testu**, **verzi Illustratoru**, **locale (CZ/EN)**, **co jsi čekal vs. co se stalo**, případně text z ExtendScript konzole.

---

## Testovací prostředí

- macOS (11.0+), Adobe Illustrator (2020+), bash (výchozí), Node.js (pro `npm test`)
- Volitelně: Illustrator ve více jazycích (CZ, EN) pro C9

---

*Připravil: Osva1d — 2026-06-13*
