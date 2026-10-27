# Tile Export — ruční testy

Co se musí vyzkoušet rukou před vydáním a po větší změně. Geometrii dělení,
hlášky, předvolby a výpočty měřítek kryje 15 automatických sad
(`npm test` v `tile-export/`); export v Illustratoru se ověřoval harnessem
přes produkční kód na kopiích testovacích dokumentů, každý běh jako samostatný
skript (N42). Tady zůstává to, co
automat nevidí: jak dialog vypadá, co ukáže prohlížeč, tisk a stroj.

Nálezy: [findings.md](findings.md). Dřívější plán
T1–T8 a přetest R1–R10 s poznámkami o opravách jsou v historii gitu
(`docs/testing/2026-09-15-tile-export-test-plan.md`,
`2026-09-18-tile-export-retest.md`).

---

## 0. Příprava

```bash
cd ~/Dev/extendscript-automation/tile-export && npm run verify
```

Testovací data vyrobí `tools/make-test-document.jsx` (spustit bez otevřeného
dokumentu) do `~/Desktop/tile-export-test/data/`; existující soubory nepřepíše.

| soubor | co to je |
|---|---|
| `arch-3000x1000-1ku10.ai` | 3000 × 1000 mm při 1:10; NEŘEZAT na 850–1450 mm, vodítka 800 a 1900 mm |
| `zed-6000x1000-1ku10.ai` | zeď 6000 × 1000 mm při 1:10; NEŘEZAT 1850–2450, vodítka 1800 a 3900 |
| `lc-6000x1000.ai` | stejná zeď jako Large Canvas (faktor 10), měřítko kresby 1 |

Všechny mají spad 50 mm na každé hraně a pravítka v mm (od generátoru 2.1.0;
starší data jsou v bodech). **Jak číst plát:** čistý formát je
šachovnice 100 × 100 mm, velké číslo pole je jeho vodorovná poloha v mm, „y"
svislá — na kraji plátu tedy přečteš, kde začíná a končí, a v přelepu uvidíš
stejná čísla jako u souseda. Spad za hranou je v pásech **tmavě šedá 0–5,
šedá 5–10, modrá 10–20, zelená 20–40, žlutá 40–50 mm**: barva na vnějším okraji
plátu říká, kolik spadu nese (přídavek 40 mm končí zelenou, v Zünd režimu
přidá maska 5 mm proužek žluté). Bílá uvnitř grafiky je vždycky chyba, kromě
rámečku s legendou.

**Výchozí nastavení** — dialog si pamatuje poslední běh, před každou sekcí ho
vrať (nebo ulož jako předvolbu):

| pole | hodnota |
|---|---|
| Měřítko kresby 1: | 10 (u Large Canvasu 1) — dokument si ho pamatuje |
| Směr / Dělit podle | Svisle / Počtu plátů, 3 |
| Rovnoměrně | nezaškrtnuto |
| Přelep / umístění | 20 mm / Půl na každou stranu |
| Přídavky | 0 / 0 / 0 / 0 |
| Typ výstupu | Ruční ořez; linka zaškrtnutá, CutContour, 1 pt |
| Měřítko výstupu | 1:10 jako kresba |
| Přeskočit hotové | nezaškrtnuto — opakovaný export do stejné složky soubory přepíše |
| Vzor názvu | `{doc}_{n}_{size}_{scale}` |

---

## 1. Co umí jen člověk

**1.1 Dialog okem.** 1022 × 836 px s ručním ořezem i se Zündem — pole obou typů
výstupu se střídají na jednom místě (naměřeno headless 2026-10-20). Volby
umístění přelepu pod sebou, dostupný spad na dvou řádcích, za každým popiskem
pole dvojtečka; text přepínačů a zaškrtávátek ve výšce popisku vedle (1.2.0). Nic
uříznutého, sloupce zarovnané, levý i pravý končí dole na stejné výšce. Panel
Dokument ukáže čistý formát a dostupný spad; měřítko kresby 100 nebo 12,5 se
v nich i v „1:… jako kresba" vejde celé, i když ho napíšeš v otevřeném dialogu
a předvolba má jinou barvu řezu nebo PDF preset než poslední běh (N50).
Výsledek je v pravém sloupci: tučná stavová řádka, tabulka plátů, pod ní
podrobnosti. Dlouhá chybová hláška (Large
Canvas, měřítko kresby 10, výstup 1:1) se v podrobnostech **zalomí**,
neuřízne. Patička „© 2025–2026 Ladislav Osvald · v1.2.0", šedá, jako v ostatních
nástrojích.

**1.2 Klávesnice.** Esc zavře dialog jako Storno, Enter spustí Vytvořit
a exportovat.

**1.3 Předvolby myší.** Změna pole → „jméno *", ↺ a Uložit zaktivní. ↺ vrátí
uložené hodnoty. Uložit se zapíše hned a přežije Storno; u [Výchozí] otevře Uložit jako….
Uložit jako… s prázdným názvem řekne „Zadejte název předvolby.“, s názvem
v hranatých závorkách odmítne, s existujícím názvem se zeptá. Po běhu s jinými hodnotami, než má aktivní předvolba, se dialog otevře
s hvězdičkou.

**1.4 Prohlížeč.** Prostřední plát exportu 1:1 otevřít v **Acrobatu**
a v **Náhledu**, zvětšit na maximum: linka na všech čtyřech hranách (P1).

**1.5 Tisk.** Výřez rohu plátu v 1:1: linka 1 pt bezpečně vidět, nezvětšuje
ořez, je na všech čtyřech hranách. Výsledek zapsat do specu (§4); 2026-10-04
prošel.

**1.6 Zünd v Illustratoru.** Zeď 1:10, typ výstupu Zünd, výstup 1:1. Pole
linky nejsou vidět a v pracovním dokumentu nepřibudou červené linky. Obě PDF otevřít
v Illustratoru: tiskové má shora vrstvy `Regmarks`, `Cut` (vypnutá) a `Graphics`
s grafikou v masce; řezové `Regmarks` a `Cut`, žádnou grafiku.

**1.7 Zünd u stroje — rozhoduje.** Vytisknout tiskové PDF, do Cut Center načíst
`_cut`. Stroj najde značky, udělá rovný ořez, na hraně nezůstane bílá.
PDF preset bez tiskových značek — preset platí pro oba soubory.

**1.8 Ostrá zakázka.** Jedna skutečná zakázka od začátku do konce. Podmínka pro
vydání a push.

**1.9 Měřítko kresby v dokumentu (1.1.0).** Na zdi zadat měřítko 10, Jen pláty,
dokument uložit, zavřít a znovu otevřít, spustit: pole ukáže 10. Nový dokument
začne na 1. Předvolba uložená se starším měřítkem ho nezmění a po úpravě
měřítka se u předvolby neobjeví hvězdička.

**1.10 Kontrolní pláty (1.1.0).** Arch, Svisle, 3 pláty, Jen pláty: pod
originálem tři zamaskované pláty v řadě, každý na svém artboardu, s červenou
linkou a vodítkem na hranici načisto; originál beze změny. Vodorovně: pláty ve
sloupci vpravo. Zeď, Zünd: pláty se značkami a řezem, bez linky. Jen pláty
podruhé: pláty nahrazené, ne přidané; dialog nehlásí dvě grafiky, vodítka
kontrolních plátů nečte jako švy, cesty v barvě Cut nehlásí jako konturu.
Starší dokument s vrstvou `TE_lines`: po běhu zmizí. Po Jen pláty vytáhni
z pravítka vodítko: v panelu Vrstvy musí ležet ve tvé vrstvě, ne v `TE_panels`
(N44).

**1.11 Předvolby a proměnné (1.1.0).** [Výchozí] ukáže přelep 20, přídavky 0,
mezeru značek 5 mm a vzor `{doc}_{n}_{size}_{scale}`, ať soubor nastavení
drží cokoli. Seznam předvoleb s ↺ vyplní levý sloupec, ostatní tlačítka jsou pod ním.
Napiš do vzoru `26_13456_a_` a klikni na `{n}`: proměnná se připíše na konec
a Výsledek ukáže pod tabulkou nové názvy. Vzor `{n}_{clean}_{adds}_{size}`
napsaný ručně: na archu `01_1000x1000mm_1010x1000mm_1010x1000mm.pdf`, `02_…`
s `1020x1000mm` a `03_…`; na zdi se Zündem v 1:1
`01_2000x1000mm_2010x1000mm_2040x1030mm.pdf` a jeho `_cut`.

**1.12 Výsledek a překlep v čísle (1.1.0).** Arch, §0: stavová řádka zeleně
„✓ Připraveno k exportu: 3 pláty, ruční ořez, výstup 1:10.", tabulka podle
regresního přehledu. Vzor `zakazka/{n}`: červeně „✗ Export nejde, Jen pláty
ano: 1 chyba, viz níže.". Zeď, Zünd, na originálu libovolná cesta s tahem
v barvě Cut: oranžově „⚠ Připraveno k exportu, 1 upozornění níže.". Barvy jdou
přečíst. Do Přelepu napiš `2O` (písmeno O): pole zčervená, stavová řádka
„✗ Nejde spustit: 1 chyba, viz níže.", tabulka prázdná, pod ní „✗ Pole
„Přelep“: zadejte číslo, třeba 20 nebo 2,5."; Jen pláty, Vytvořit
a exportovat, Uložit i Uložit jako… šedé. **Enter nesmí nic spustit** —
dialog zůstane otevřený. Přepiš na `20`: červená zmizí a všechno se vrátí.
Prázdné Měřítko kresby: panel Dokument ukáže „—". Předvolba s barvou řezu
`cut` (třeba TEST) na zdi v Zündu: v seznamu Barva řezu „cut  (chybí)“, žádná
[Registrační], stavová řádka oranžově a pod tabulkou „⚠ Barva řezu „cut“
v dokumentu není, export ji založí…“; po výběru `Cut` upozornění zmizí.
Předvolba s barvou značek, kterou dokument nemá (třeba `Bílá`): „Bílá  (chybí)“
a „⚠ Barva značek „Bílá“ v dokumentu není, značky budou v registrační.“
Předvolba s PDF presetem, který Illustrator nemá (ulož ji s vlastním PDF
presetem a ten pak v Illustratoru přejmenuj): „název  (chybí)“, export šedý,
Jen pláty aktivní; po výběru jiného presetu export zase jde. Zeď, Zünd, Šířky plátu
133: pod tabulkou 92 názvů (46 plátů po dvou souborech), pole jde rolovat
a psaní v polích se nezpomalí víc než dřív.


**1.13 Export a souhrn (1.2.0).** Zeď, Šířky plátu 500 (12 plátů), Vytvořit
a exportovat: okno průběhu ukazuje plát, „(n z 12)“ a ukazatel. Podržet **Esc**:
hláška „Zastavuji — rozpracovaný plát se dokončí…“, export skončí po plátu, který
běžel, a souhrn napíše „Zastaveno po n z 12 plátů.“ bez „Vše proběhlo bez
chyb.“ Celý export: souhrn s cílovou složkou, Exportováno 12, Chyby 0 a „Vše
proběhlo bez chyb.“ Dlouhá cílová složka (přes 62 znaků) se v souhrnu
neusekne, okno se rozšíří (N52). Se zaškrtnutým **Po dokončení otevřít cílovou
složku** se složka otevře ve Finderu. Prázdná cílová složka: „✗ Vyberte cílovou složku.“
ve Výsledku, export šedý, Jen pláty aktivní; Vybrat… se ptá stejnými slovy.

**1.14 Přeskočit hotové výstupy (1.2.0).** Uložený dokument, export, pak znovu
se zaškrtnutým Přeskočit hotové výstupy: souhrn Přeskočeno (hotové) 3,
Exportováno 0. Dokument uložit (je teď novější) a znovu: Exportováno 3
a v podrobnostech u každého plátu „výstup byl starší než pracovní dokument
nebo PDF, vytvořil se znovu“.

**1.15 Čárkovaná cesta ve výběru (1.2.0).** Na originálu nakresli cestu
s čárkovaným tahem a kulatými konci, nech ji vybranou a dej Jen pláty: linky
kontrolních plátů (i řez u Zündu) jsou plné, s rovnými konci.

**1.16 Desetinná čárka a [Výchozí] (1.2.0).** Přelep `2,5`, Jen pláty, dialog
znovu otevřít: v poli `2,5`, ne `2.5`. [Výchozí] ukáže PDF preset
[Kvalitní tisk].

---

## 2. Regresní přehled

Očekávané hodnoty dnešní verze pro rychlou kontrolu bez harnessu. Rozměry
v milimetrech.

| dokument, nastavení | Výsledek v dialogu | export |
|---|---|---|
| arch, §0 | „✓ Připraveno k exportu: 3 pláty, ruční ořez, výstup 1:10."; S přídavky 1010 \| 1020 \| 1010 × 1000, Stránka PDF 101 × 100 \| 102 × 100 \| 101 × 100; pod tabulkou tři názvy, `arch-3000x1000-1ku10_01_1010x1000mm_1ku10.pdf` až `…_03_1010x1000mm_1ku10.pdf` | 3 PDF 101 \| 102 \| 101 × 100, v každém jedna linka; otevřené v Illustratoru mají shora vrstvy `CutContour` (linka) a `Graphics` |
| arch, výstup 1:1 | „… výstup 1:1."; Stránka PDF stejná jako S přídavky | 1010 \| 1020 \| 1010 × 1000, linka vidět 1 pt |
| arch, vzor `26_13456_a_{n}_{size}_{scale}_1x`, 1:10 jako kresba | pod tabulkou `26_13456_a_01_1010x1000mm_1ku10_1x.pdf` | soubory s tímto jménem, stránka 101 × 100 |
| totéž, výstup 1:1 | `26_13456_a_01_1010x1000mm_1ku1_1x.pdf` — `{scale}` ve vzoru je volba | stránka 1010 × 1000 |
| vzor `26_13456_a_{n}_{size}_1x`, výstup 1:1 | `26_13456_a_01_1010x1000mm_1x.pdf` | stránka 1010 × 1000 |
| arch, vzor `zakazka/{n}` | „✗ Export nejde, Jen pláty ano: 1 chyba, viz níže."; „✗ Název souboru zakazka/01 obsahuje lomítko…" | export šedý, Jen pláty aktivní |
| zeď, Zünd, předvolba s barvou řezu `cut` | v seznamu „Cut \| cut  (chybí)“; „⚠ Připraveno k exportu, 1 upozornění níže."; „⚠ Barva řezu „cut“ v dokumentu není, export ji založí. Zkontrolujte, že ji Cut Center zná."; „…rovný ořez v barvě „cut“." | `_cut` PDF s vrstvou a řezem v nové přímé barvě `cut` |
| zeď, Zünd, předvolba s barvou značek `Bílá`, kterou dokument nemá | v seznamu „[Registrační] \| Bílá  (chybí)“; „⚠ Barva značek „Bílá“ v dokumentu není, značky budou v registrační." | značky v registrační |
| arch, předvolba s PDF presetem, který Illustrator nemá | v seznamu „název  (chybí)“; „✗ PDF preset „…“ v tomto Illustratoru není a export by s ním PDF neuložil. Vyberte jiný preset." | export šedý, Jen pláty aktivní |
| arch, vzor `{doc}_{size}` | „✗ Export nejde, Jen pláty ano: 1 chyba, viz níže."; „✗ Pláty 1 a 3 by dostaly stejný název souboru „arch-3000x1000-1ku10_1010x1000mm“, export by zapsal jen jeden z nich. Přidejte do vzoru {n}." | export šedý, Jen pláty aktivní |
| arch, Vodorovně, Vodítek, vodorovné vodítko tažené ~60 mm pod horní hranou artboardu, Zaokrouhlit 100 | 2 pláty: S přídavky 3000 × 610 \| 3000 × 410, Stránka PDF 300 × 61 \| 300 × 41 | 2 PDF 300 × 61 \| 300 × 41 (N38) |
| arch, Vodorovně, Šířky plátu 600 | Načisto 3000 × 600 \| 3000 × 400 — zbytek na spodním plátu | 2 PDF 300 × 61 \| 300 × 41 (N41) |
| arch, 1:1, Rastr 150 DPI (jen s `RASTER_ENABLED`, od 1.1.0 skrytý) | totéž | totéž, obraz 150 DPI jen plátu, linka navrchu; obyčejné PDF, otevřené má jednu vrstvu |
| Large Canvas, měřítko kresby 1 | Dokument: spad 50/50/50/50; měřítko výstupu „1:1 — kresba je ve skutečné velikosti" | 2010 \| 2020 \| 2010 × 1000 |
| Large Canvas + měřítko kresby 10, „1:10 jako kresba" | Stránka PDF 2001 × 1000 \| 2002 × 1000 \| 2001 × 1000 | náhled 2001 \| 2002 \| 2001 × 1000 |
| Large Canvas + měřítko kresby 10, výstup 1:1 | „✗ Export nejde, Jen pláty ano…"; „Plát 1 by … měřil 20010 × 10000 mm; artboard … nejvýš 5715 mm" | export šedý, Jen pláty aktivní |
| zeď 1:10, výstup 1:1 | S přídavky 2010 \| 2020 \| 2010 × 1000 | 2010 \| 2020 \| 2010 × 1000; plát 2 začíná polem 1990 (přelep), končí 4010 |
| zeď, Zünd, 1:1 | „✓ … 3 pláty, Zünd, výstup 1:1."; Stránka PDF 2040 × 1030 \| 2050 × 1030 \| 2040 × 1030; pod tabulkou „Značky v barvě „[Registrační]“, rovný ořez v barvě „Cut“." a šest názvů, na plát `…_1ku1.pdf` a `…_1ku1_cut.pdf` | na plát `…_n.pdf` a `…_n_cut.pdf`, stejná stránka; maska 5 mm za řezem, značky 5 mm od masky |
| zeď, Zünd, přídavek vpravo a nahoře 40 | — | plát 3 řeže 2050 × 1040, stránka 2080 × 1070; na pravé a horní hraně tiskového plátu pásy až po proužek žluté (40 + 5 mm) |
| arch, Zünd, Šířka plátu 1460, přelep 0 | „✗ Export nejde, Jen pláty ano: 1 chyba, viz níže."; řádky „1–2" se stránkou 149 × 103 a „3" s 11 × 103; „✗ Plát 3: orientační značka by se dotýkala jiné značky nebo ji překrývala (středy 0 mm od sebe, průměr 5 mm)…" | export šedý, Jen pláty aktivní |
| zeď, Zünd, Max. rozteč značek 4 | bez hlášky — plát nese přes 100 značek, ty dialog nekontroluje | „CHYBA: Plát 1: Zünd značky by se dotýkaly nebo překrývaly (středy 4 mm od sebe, průměr 5 mm)… Nic se neexportovalo a dokument zůstal beze změny."; artboardy ani linky se nezmění |
| arch, Přelep `2O`, prázdný nebo `-5` | „✗ Nejde spustit: 1 chyba, viz níže."; „✗ Pole „Přelep“: zadejte číslo, třeba 20 nebo 2,5.", u `-5` „… nesmí být záporné."; tabulka prázdná, pole červené | nic nejde spustit, Uložit i Uložit jako… šedé |
| arch, Měřítko kresby prázdné | „✗ Pole „Měřítko kresby“: zadejte číslo…"; Dokument „—" | totéž |
| arch, Rastr, Rozlišení 71 (jen s `RASTER_ENABLED`) | „✗ Rozlišení 71 DPI je příliš nízké: Illustrator rastruje až od 72 DPI." | export šedý; se 72 projde |

**Hlášky** (česky): šířka 0 → „Šířka plátu musí být kladné číslo."; Rovnoměrně
se stropem 15 a přelepem 20 → „…musí být větší než přelep."; přídavek vlevo 60
na archu → „Přídavek vlevo (60 mm) překračuje přesah grafiky (50 mm)."; Jen
pláty podruhé → „Počet vytvořených plátů: 3 (předchozí nahrazeny)."

---

## 3. Jak hlásit

Nastavení dialogu (nebo otisk), co vyšlo a co jsi čekal. Nový nález dostane
další číslo v [nálezech](findings.md), naposledy N52.
