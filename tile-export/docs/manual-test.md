# Tile Export — ruční testy

Co se musí vyzkoušet rukou před vydáním a po větší změně. Geometrii dělení,
hlášky, předvolby a výpočty měřítek kryje 14 automatických sad
(`npm test` v `tile-export/`); export v Illustratoru se ověřoval harnessem
přes produkční kód na kopiích testovacích dokumentů. Tady zůstává to, co
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
| `lc-6000x1000.ai` | stejná zeď jako Large Canvas (faktor 10), ruční měřítko vypnout |

Všechny mají spad 50 mm na každé hraně. **Jak číst plát:** čistý formát je
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
| Ruční měřítko 1:N | zaškrtnuto, 10 (u Large Canvasu vypnuto) |
| Směr / Dělit podle | Horizontálně / Počtu plátů, 3 |
| Rovnoměrně | nezaškrtnuto |
| Přelep / umístění | 20 mm / Půl na každou stranu |
| Přídavky | 0 / 0 / 0 / 0 |
| Linka | zaškrtnuto, CutContour, 1 pt |
| Měřítko výstupu | Stejné jako dokument |
| Přeskočit hotové | zaškrtnuto — **každý export do nové složky**, jinak druhý běh pláty přeskočí |

---

## 1. Co umí jen člověk

**1.1 Dialog okem.** Bez Zünd režimu 1178 × 695 px, se Zünd panelem 1178 ×
793 px. Nic uříznutého, sloupce zarovnané. Výsledek je v pravém sloupci; dlouhá
chybová hláška (Large Canvas, ruční 1:10, výstup 1:1) se v poli **zalomí**,
neuřízne.

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
ořez, je na všech čtyřech hranách. Výsledek zapsat do specu — výchozí tloušťka
je zatím volba, ne měření.

**1.6 Zünd v Illustratoru.** Zeď 1:10, Zünd režim, výstup 1:1. Obě PDF otevřít
v Illustratoru: tiskové má vrstvy `Cut` (vypnutá), `Regmarks`, `Graphics`
s grafikou v masce; řezové `Cut` a `Regmarks`, žádnou grafiku.

**1.7 Zünd u stroje — rozhoduje.** Vytisknout tiskové PDF, do Cut Center načíst
`_cut`. Stroj najde značky, ořízne po obdélníku, na hraně nezůstane bílá.
PDF preset bez tiskových značek — preset platí pro oba soubory.

**1.8 Ostrá zakázka.** Jedna skutečná zakázka od začátku do konce. Podmínka pro
vydání a push.

---

## 2. Regresní přehled

Očekávané hodnoty dnešní verze pro rychlou kontrolu bez harnessu. Rozměry
v milimetrech.

| dokument, nastavení | Výsledek v dialogu | export |
|---|---|---|
| arch, §0 | tiskové 1010 \| 1020 \| 1010 × 1000; „Stránky PDF (1:10): 101 × 100 \| 102 × 100 \| 101 × 100" | 3 PDF 101 \| 102 \| 101 × 100, v každém jedna linka |
| arch, výstup 1:1 | „Stránky PDF: skutečná velikost…" | 1010 \| 1020 \| 1010 × 1000, linka vidět 1 pt |
| arch, 1:1, Rastr 150 DPI | totéž | totéž, obraz 150 DPI jen plátu, linka navrchu |
| Large Canvas, výstup jako dokument | faktor 10; spad 50/50/50/50 | 2010 \| 2020 \| 2010 × 1000 |
| Large Canvas + ruční 1:10 | „(1:10): 2001 × 1000 \| …" | náhled 2001 \| 2002 \| 2001 × 1000 |
| Large Canvas + 1:10, výstup 1:1 | „Plát 1 by … měřil 20010 × 10000 mm; artboard … nejvýš 5715 mm" | export šedý, Jen pláty aktivní |
| zeď 1:10, výstup 1:1 | tiskové 2010 \| 2020 \| 2010 | 2010 \| 2020 \| 2010 × 1000; plát 2 začíná polem 1990 (přelep), končí 4010 |
| zeď, Zünd, 1:1 | „se značkami: 2040 × 1030 \| 2050 × 1030 \| 2040 × 1030"; „Řez: obdélník plátu v barvě Cut." | na plát `…_n.pdf` a `…_n_cut.pdf`, stejná stránka; maska 5 mm za řezem, značky 5 mm od masky |
| zeď, Zünd, přídavek vpravo a nahoře 40 | — | plát 3 řeže 2050 × 1040, stránka 2080 × 1070; na pravé a horní hraně tiskového plátu pásy až po proužek žluté (40 + 5 mm) |

**Hlášky** (česky): šířka 0 → „Šířka plátu musí být kladné číslo."; Rovnoměrně
se stropem 15 a přelepem 20 → „…musí být větší než přelep."; přídavek vlevo 60
na archu → „Přídavek vlevo (60 mm) překračuje přesah grafiky (50 mm)."; Jen
pláty podruhé → „Počet vytvořených plátů: 3 (předchozí nahrazeny)."

---

## 3. Jak hlásit

Nastavení dialogu (nebo otisk), co vyšlo a co jsi čekal. Nový nález dostane
další číslo v [nálezech](findings.md), naposledy N24.
