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

**1.1 Dialog okem.** 1178 × 807 px s ručním ořezem i se Zündem — pole obou typů
výstupu se střídají na jednom místě (naměřeno headless 2026-10-10). Nic
uříznutého, sloupce zarovnané. Panel Dokument ukáže čistý formát a dostupný
spad; měřítko kresby 100 nebo 12,5 se v nich i v „1:… jako kresba" vejde celé.
Výsledek je v pravém sloupci; dlouhá chybová hláška (Large Canvas, měřítko
kresby 10, výstup 1:1) se v poli **zalomí**, neuřízne.

**1.2 Klávesnice.** Esc zavře dialog jako Storno, Enter spustí Vytvořit
a exportovat.

**1.3 Předvolby myší.** Změna pole → „jméno *", ↺ a Uložit zaktivní. ↺ vrátí
uložené hodnoty. Uložit se zapíše hned a přežije Storno; u [Default] je šedé.
Uložit jako… s názvem v hranatých závorkách odmítne, s existujícím názvem se
zeptá. Po běhu s jinými hodnotami, než má aktivní předvolba, se dialog otevře
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
`_cut`. Stroj najde značky, ořízne po obdélníku, na hraně nezůstane bílá.
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
drží cokoli. Seznam předvoleb je přes celou šířku dialogu. Ve vzoru klikni
mezi dvě podtržítka a pak na `{n}`: proměnná se vloží na místo kurzoru
a Výsledek ukáže nový název; bez kurzoru v poli se připíše na konec.

---

## 2. Regresní přehled

Očekávané hodnoty dnešní verze pro rychlou kontrolu bez harnessu. Rozměry
v milimetrech.

| dokument, nastavení | Výsledek v dialogu | export |
|---|---|---|
| arch, §0 | tiskové 1010 \| 1020 \| 1010 × 1000; „Stránky PDF (1:10): 101 × 100 \| 102 × 100 \| 101 × 100" | 3 PDF 101 \| 102 \| 101 × 100, v každém jedna linka; otevřené v Illustratoru mají shora vrstvy `CutContour` (linka) a `Graphics` |
| arch, výstup 1:1 | „Stránky PDF: skutečná velikost…" | 1010 \| 1020 \| 1010 × 1000, linka vidět 1 pt |
| arch, vzor `26_13456_a_{n}_{size}_{scale}_1x`, 1:10 jako kresba | „Soubor plátu 1: 26_13456_a_01_1010x1000mm_1ku10_1x.pdf" | soubory s tímto jménem, stránka 101 × 100 |
| totéž, výstup 1:1 | „Soubor plátu 1: 26_13456_a_01_1010x1000mm_1x.pdf" — bez poměru a bez `__` | stránka 1010 × 1000 |
| arch, vzor `zakazka/{n}` | „✗ Název souboru zakazka/01 obsahuje lomítko…" | export šedý, Jen pláty aktivní |
| arch, Vodorovně, Vodítek, vodorovné vodítko tažené ~60 mm pod horní hranou artboardu, Zaokrouhlit 100 | 2 pláty: tiskové 3000 × 610 \| 3000 × 410; „Stránky PDF (1:10): 300 × 61 \| 300 × 41" | 2 PDF 300 × 61 \| 300 × 41 (N38) |
| arch, Vodorovně, Šířky plátu 600 | „1: načisto 3000 × 600…, 2: načisto 3000 × 400…" — zbytek na spodním plátu | 2 PDF 300 × 61 \| 300 × 41 (N41) |
| arch, 1:1, Rastr 150 DPI (jen s `RASTER_ENABLED`, od 1.1.0 skrytý) | totéž | totéž, obraz 150 DPI jen plátu, linka navrchu; obyčejné PDF, otevřené má jednu vrstvu |
| Large Canvas, měřítko kresby 1 | Dokument: spad 50/50/50/50; měřítko výstupu „1:1 — kresba je ve skutečné velikosti" | 2010 \| 2020 \| 2010 × 1000 |
| Large Canvas + měřítko kresby 10, „1:10 jako kresba" | „(1:10): 2001 × 1000 \| …" | náhled 2001 \| 2002 \| 2001 × 1000 |
| Large Canvas + měřítko kresby 10, výstup 1:1 | „Plát 1 by … měřil 20010 × 10000 mm; artboard … nejvýš 5715 mm" | export šedý, Jen pláty aktivní |
| zeď 1:10, výstup 1:1 | tiskové 2010 \| 2020 \| 2010 | 2010 \| 2020 \| 2010 × 1000; plát 2 začíná polem 1990 (přelep), končí 4010 |
| zeď, Zünd, 1:1 | „se značkami: 2040 × 1030 \| 2050 × 1030 \| 2040 × 1030"; „Řez: obdélník plátu v barvě Cut." | na plát `…_n.pdf` a `…_n_cut.pdf`, stejná stránka; maska 5 mm za řezem, značky 5 mm od masky |
| zeď, Zünd, přídavek vpravo a nahoře 40 | — | plát 3 řeže 2050 × 1040, stránka 2080 × 1070; na pravé a horní hraně tiskového plátu pásy až po proužek žluté (40 + 5 mm) |
| arch, Zünd, Šířka plátu 1460, přelep 0 | „✗ Plát 3: orientační bod by se dotýkal jiné značky nebo ji překrýval (středy 0 mm od sebe, průměr 5 mm)…"; stránky 149 × 103 \| 149 × 103 \| 11 × 103 | export šedý, Jen pláty aktivní |
| zeď, Zünd, Max. rozteč 4 | bez hlášky — plát nese přes 100 značek, ty dialog nekontroluje | „Plát 1: Zünd značky by se dotýkaly nebo překrývaly (středy 4 mm od sebe, průměr 5 mm)… Nic se neexportovalo a dokument zůstal beze změny."; artboardy ani linky se nezmění |
| arch, Rastr, Rozlišení 71 (jen s `RASTER_ENABLED`) | „✗ Rozlišení 71 DPI je příliš nízké: Illustrator rastruje až od 72 DPI." | export šedý; se 72 projde |

**Hlášky** (česky): šířka 0 → „Šířka plátu musí být kladné číslo."; Rovnoměrně
se stropem 15 a přelepem 20 → „…musí být větší než přelep."; přídavek vlevo 60
na archu → „Přídavek vlevo (60 mm) překračuje přesah grafiky (50 mm)."; Jen
pláty podruhé → „Počet vytvořených plátů: 3 (předchozí nahrazeny)."

---

## 3. Jak hlásit

Nastavení dialogu (nebo otisk), co vyšlo a co jsi čekal. Nový nález dostane
další číslo v [nálezech](findings.md), naposledy N44.
