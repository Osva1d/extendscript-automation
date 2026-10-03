# Batch Relink & Export — ruční testy

Co se musí vyzkoušet rukou před vydáním a po větší změně. BRE nemá
automatické sady; opravy z code review 2026-09-27
([report](../../docs/reports/2026-09-27-code-review-batch-relink-export.md))
se ověřily během sestaveného skriptu v Illustratoru 30.8.2 přes
`tools/ai-eval.sh`, s dialogy procházenými bez zobrazení (pole vyplnil
skript), a na reálné zakázce (12 pozic, oboustranný arch, 4 zdroje). Tady
zůstává, co tak ověřit nešlo: dialog okem a myší, běh z menu, zastavení
klávesou Esc, PDF z dalších programů, anglický Illustrator a tisk.

**Brána pro vydání jsou sekce 1–4.** Sekce 6 je rychlá kontrola hlášek. Co
prošlo, zaškrtni; co ne, nahlas podle sekce 7. Na konci vyplň záznam a před
dalším kolem vrať zaškrtnutí na `[ ]`. Kódy B1–B8 a T1–T2 odkazují na nálezy
v reportu z review.

---

## 0. Příprava

```bash
cd ~/Dev/extendscript-automation/batch-relink-export && npm run build
```

Build vznikne v `dist/illustrator-batch-relink-export.jsx`. Spouštěj vždy tento
soubor přes **Soubor › Skripty › Jiný skript…**, ne starou nainstalovanou kopii.

Dialog si pamatuje nastavení v `~/Library/Application Support/batch-relink-export/settings.json`.
Pro test prvního spuštění (bod 1.1) soubor přejmenuj a po testu vrať.

Připrav si reálnou zakázku: šablonu s pozicemi umístěnými z vícestránkového
PDF, zdrojovou složku s PDF rozdělenými po N stranách (N = počet pozic, poslední
soubor kratší) a prázdnou výstupní složku.

---

## 1. Dialog

- [ ] **1.1 Okem.** Nic uříznutého, pole zarovnaná. Při prvním spuštění (bez
  souboru s nastavením) je vzor předvyplněný `{n}_{template}_{source}`
  a náhled názvu ukazuje `01_sablona_zdroj.pdf` (B8). Předvybraný PDF preset
  je `[Kvalitní tisk]` (B9).
  Nápověda u „Přeskočit existující soubory" říká, že se přeskočí jen výstup
  novější než zdroj i šablona.
- [ ] **1.2 Klávesnice.** Esc zavře dialog jako Storno, Enter spustí Spustit.
  Enter s prázdným polem Výstup ukáže „Vyberte výstupní složku." a dialog
  zůstane otevřený — jestli Enter volá kontrolu jako kliknutí na Spustit,
  ověřené není.
- [ ] **1.3 Výstup do zdrojové složky (B8).** Stejná složka jako Zdroj i Výstup →
  hláška „Výstupní složka je stejná jako zdrojová…", dialog zůstane otevřený
  a nic se nezapíše. Podsložka zdrojové složky jako Výstup projde.
- [ ] **1.4 Náhled (T2).** Dávka s kratším posledním souborem → tučný verdikt
  „… archů lze zpracovat (1 s upozorněním) · 0 blokováno", celý čitelný.
  Dávka, kde je každý soubor delší než počet pozic → Pokračovat je vypnuté;
  zkus i Enter — jestli vypnuté tlačítko spustí, ověřené není.
- [ ] **1.5 Storno.** Storno v hlavním dialogu, u dotazu na otevřenou šablonu
  i v náhledu → ve výstupní složce nic nepřibude a otevřené dokumenty zůstanou.
- [ ] **1.6 Chyba nezavře dialog (A3, A4).** Spustit s vyplněnými cestami
  a vzorem bez `{n}` → hláška, dialog zůstane otevřený se všemi poli. Oprav
  vzor a znovu Spustit → dávka se spustí.
- [ ] **1.7 Zapamatované nastavení (A1, A2).** Proběhni dávku s vlastním
  presetem dílny (třeba pass4press), vlastním vzorem a vypnutým „Otevřít
  složku". Spusť skript znovu, i po restartu Illustratoru → šablona, výstup,
  vzor, preset a „Otevřít složku" jsou z minula; zdroj je prázdný
  a „Přeskočit existující" vypnuté. Okno má stejnou šířku jako při prvním
  spuštění — dlouhá cesta se do pole nevejde celá.

---

## 2. Reálná zakázka od začátku do konce

- [ ] **2.1 Plné archy.** Každý arch nese strany svého zdroje na správných
  pozicích; u oboustranného archu se kryje líc s rubem. Kontrola v Acrobatu.
- [ ] **2.2 Neúplný poslední arch (B2).** Pozice, pro které zdroj nemá stranu,
  na archu nejsou — ani prázdná maska, ani znovu strana 1. Souhrn ukáže
  „Odebrané pozice". Šablona, která ukazuje některou stranu dvakrát, se
  vyexportuje beze změny s hláškou „Pozice navíc se neodebraly automaticky…".
- [ ] **2.3 Nedostupné původní PDF (B6).** Šablonu, jejíž PDF leží na
  nepřipojeném disku nebo bylo přesunuto, skript zpracuje.
- [ ] **2.4 Zamčené vrstvy (B7).** Šablona se zamčenou vrstvou i podvrstvou
  s pozicemi se zpracuje; šablona na disku se nezmění.
- [ ] **2.5 Otevřená neuložená šablona (B5).** Šablonu otevři, přidej pozici,
  neukládej a spusť skript → dotaz na zahození změn. Po Ano náhled počítá
  pozice uložené šablony; Storno v náhledu nechá dokument otevřený i se změnou.
- [ ] **2.6 Jiný formát zdroje (B1).** Zdroj jiného rozměru nebo PDF se
  spadávkou v ploše stránky bez TrimBoxu → arch se nevyexportuje a hláška
  uvede oba rozměry v mm.
- [ ] **2.7 Logo (B4).** Šablona s propojeným logem nebo značkami jako
  souborem → logo zůstane logem, počet pozic v náhledu ho nezahrnuje.
- [ ] **2.8 Přeskočit existující (B8).** Dávku zastav po dvou arších, spusť
  znovu se zaškrtnutým „Přeskočit existující" → hotové archy se přeskočí.
  Pak změň a ulož šablonu a spusť znovu → archy se vytvoří znovu se záznamem
  „Výstup už existoval, ale je starší…".
- [ ] **2.9 Chyby Illustratoru (A10).** Ověřené jen s podvrženou chybou,
  ne se skutečnou:
  - šablona, kterou Illustrator neotevře (třeba jiný soubor přejmenovaný na
    `.ai`) → hláška „Šablonu se nepodařilo otevřít — zkuste ji otevřít
    v Illustratoru ručně." s hláškou Illustratoru; Illustrator přitom nesmí
    ukázat vlastní okno a zaseknout se;
  - výstupní složka bez práva zápisu → u každého archu „Arch se nevyexportoval
    kvůli chybě: …" a dávka doběhne do souhrnu.
- [ ] **2.10 Předvolba importu PDF (B10).** Umísti (Soubor › Umístit, bez
  možností importu) vícestránkové PDF do prázdného dokumentu a všimni si
  strany a ořezu. Spusť dávku a umísti ho znovu → stejná strana i ořez, ne
  poslední pozice šablony. Že dávka předvolbu vrátí, ověřil harness; jestli ji
  Umístit bez možností importu používá, ověřené není.

---

## 3. Běh z menu a zastavení dávky

- [ ] **3.1 Menu.** Všechno v sekci 2 poběží přes Soubor › Skripty (ověřování
  běželo přes AppleScript).
- [ ] **3.2 Zastavení klávesou Esc.** Dávka o deseti a více souborech, během
  zpracování podrž Esc zhruba sekundu → paleta napíše „Zastavuji — rozpracovaný
  soubor se dokončí…", soubor doběhne a souhrn napíše „Zrušeno uživatelem po
  zpracování…". Zkus Esc podržet i ve chvíli, kdy se ukládá PDF: jestli
  Illustrator samotné ukládání nepřeruší (a nenechá ve výstupní složce
  rozepsaný soubor), ověřené není — výstup posledního souboru otevři v Acrobatu.

---

## 4. Zdroje z dalších programů (B3)

- [ ] **4.1 Počty stran.** PDF z běžných zdrojů dílny — Acrobat „Rozdělit
  dokument", export z InDesignu, PDF/X, zákaznická PDF — náhled ukáže stejný
  počet stran jako Acrobat. Každé „Nečitelný počet stran" si zapiš i s tím,
  čím PDF vzniklo.
- [ ] **4.2 Čas skenu.** Sken běží před náhledem bez ukazatele průběhu. PDF
  s komprimovanými tabulkami trvá v enginu až ~2 s na soubor, extrémní soubor
  (18 MB, 4 053 stran) 16 s. U dávky desítek takových souborů změř, jak dlouho
  Illustrator nereaguje.

---

## 5. Anglický Illustrator

- [ ] **5.1 Texty.** Dialog, náhled, souhrn a hlášky anglicky; verdikt náhledu
  „… sheets can be processed (… with a warning) · … blocked".
- [ ] **5.2 Preset.** Výchozí PDF preset (podle kódu `[High Quality Print]`,
  neměřeno).

---

## 6. Regresní přehled

Hlášky dnešní verze (česky), jak je dal běh s headless dialogy:

| situace | výsledek |
|---|---|
| šablona s nedostupným původním PDF | arch vyexportovaný, bez chyby |
| pozice v zamčené podvrstvě | arch vyexportovaný, bez chyby |
| propojené logo, pozice na skryté vrstvě | počet pozic bez nich; „Skrytá pozice se nepřelinkovala (netiskne se) — vrstva „…“." |
| zdroj 110 × 60 mm na pozice 100 × 70 | „Pozice …: strana zdroje má 110 × 60 mm, šablona počítá s 100 × 70 mm…" |
| 2 strany na 4 pozice | náhled „…: stran 2, pozic navíc 2 — odeberou se z archu.", souhrn „Odebrané pozice 2" |
| šablona se stranou 1 dvakrát, 2 strany | „Pozice navíc se neodebraly automaticky…", „Pozic navíc, které se nepodařilo odebrat: 2. Ukazují znovu stranu 1…" |
| 5 stran na 4 pozice | náhled „…: stran 5 > pozic 4 — BUDE PŘESKOČENO…", souhrn „Přeskočeno: stran je více než pozic (5 > 4)…" |
| výstup = zdroj | „Výstupní složka je stejná jako zdrojová…", dialog zůstane otevřený |
| prázdné pole Šablona, Zdroj, Výstup | „Vyberte šablonu." / „Vyberte zdrojovou složku." / „Vyberte výstupní složku.", dialog zůstane otevřený s vyplněnými poli |
| vzor bez `{n}` a výstupní složka, která ještě neexistuje | hláška o vzoru, složka se nevytvoří; po opravě dotaz na vytvoření a běh |
| šablona jiného typu (PDF) | „Šablona se nenašla nebo nemá příponu .ai. Vyberte ji tlačítkem Vybrat…" |
| vzor bez `{n}` | „Vzor musí obsahovat {n} (pořadí archu), jinak by se výstupy přepisovaly." |
| zdroj s nečitelným počtem stran | „…: počet stran nejde zjistit (poškozené nebo šifrované PDF?). Ověřte, že nemá víc stran než pozic…" |
| existující výstup starší než zdroj | „Výstup už existoval, ale je starší než zdroj nebo šablona — vytvořen znovu." |
| dávka zastavená Esc po 1 ze 3 souborů | „Zrušeno uživatelem po zpracování 1 z 3 souborů.", bez „Vše proběhlo bez chyb." |
| druhé spuštění | šablona, výstup (i s diakritikou v cestě), vzor, preset a „Otevřít složku" z minula, zdroj prázdný; výstup s uloženým `[PDF/X-4:2008]` je PDF 1.6 s PDF/X |
| zapamatované dlouhé cesty (72 i 133 znaků) | okno 460 × 478 px jako bez nastavení; pole cest 180 px, vzor, náhled názvu a preset 280 px — pole se nenatahují podle textu |
| ručně upravený soubor s nastavením (číslo místo cesty, neexistující preset) | špatné hodnoty výchozí, ostatní z minula, bez hlášky |
| poškozený soubor s nastavením | výchozí hodnoty, bez hlášky; běh soubor přepíše platným |
| nastavení nejde zapsat | „Nastavení dialogu se nepodařilo uložit — příště se dialog otevře bez něj. Dávka pokračuje." a dávka proběhne |
| předvolba importu PDF strana 2 / MediaBox před během | po dávce, po Stornu v náhledu, po chybě i po zastavení Esc zůstane 2 / MediaBox (dřív strana a ořez poslední pozice šablony) |

**Známé, vědomě neopravené** (minor z review): v detailu chyby zůstává anglická hláška Illustratoru (T5); titulek okna je
anglicky a výběr zdroje i výstupu má stejnou výzvu „Vyberte složku:" (T8).

**Sledováno — pád a zamrznutí Illustratoru.** 2026-09-28 Illustrator 30.8.2
jednou spadl při dávce se zaškrtnutým „Přeskočit existující" (bez crash
reportu; tentýž běh pak prošel) a jednou zamrzl na deadlocku uvnitř aplikace,
3 s po dávce s neúplným archem (skript už neběžel). Příčina není známá, kód se
kvůli tomu neměnil. Když se to zopakuje, zapiš podle sekce 7, u kterého souboru
paleta byla a jestli šlo o pád, nebo zamrznutí.

---

## 7. Když něco selže

Nahlas, s čím skript běžel (šablona, počet souborů, preset), co vyšlo a co jsi
čekal.

| symptom | pravděpodobná příčina | co přiložit |
|---|---|---|
| na pozici jiná strana, než má být | relink / zjištění strany pozice | šablonu a zdroj |
| pozice navíc zůstala | šablona neukazuje strany 1–N každou jednou | souhrn a šablonu |
| „Nečitelný počet stran" u běžného PDF | struktura PDF, kterou parser nezná | to PDF (nebo aspoň `pdfinfo`) |
| arch odmítnutý kvůli rozměru, ač sedí | TrimBox zdroje nebo šablony | `pdfinfo -box` zdroje |
| Illustrator dlouho nereaguje | sken velkých PDF | počet a velikost zdrojů |
| Illustrator spadne nebo zamrzne během dávky či krátce po ní | neznámá, sledováno (sekce 6) | u kterého souboru paleta byla; pád, nebo zamrznutí (točící se kolečko); jestli dávka měla neúplný arch nebo zaškrtnuté „Přeskočit existující"; čas; soubor `Adobe Illustrator_…` z `/Library/Logs/DiagnosticReports` |

---

## 8. Záznam

```
Datum: ______   Build (commit): ______   Illustrator: ______   Locale: CZ / EN
Sekce 1 [ ]  2 [ ]  3 [ ]  4 [ ]
Verdikt: [ ] vydat   [ ] blokováno — proč: ______
```

Vydání samo (verze, build, tag, Release) popisuje
[`../../docs/conventions.md`](../../docs/conventions.md).
