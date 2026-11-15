# Batch Relink & Export — ruční testy

Co se musí vyzkoušet rukou před vydáním a po větší změně. BRE má
Node testy čistých funkcí (`npm test`), ale dialog, Illustrator a běh pokrývají jen ruční body; opravy z code review 2026-09-27
([report](../../docs/reports/2026-09-27-code-review-batch-relink-export.md))
se ověřily během sestaveného skriptu v Illustratoru 30.8.2 přes
`tools/ai-eval.sh`, s dialogy procházenými bez zobrazení (pole vyplnil
skript), a na reálné zakázce (12 pozic, oboustranný arch, 4 zdroje). Tady
zůstává, co tak ověřit nešlo: dialog okem a myší, běh z menu, zastavení
klávesou Control, PDF z dalších programů, anglický Illustrator a tisk.

**Brána pro vydání jsou sekce 1–4.** Sekce 6 je rychlá kontrola hlášek. Co
prošlo, zaškrtni; co ne, nahlas podle sekce 7. Na konci vyplň záznam a před
dalším kolem vrať zaškrtnutí na `[ ]`. Kódy B1–B8 a T1–T2 odkazují na nálezy
v reportu z review.

---

## 0. Příprava

```bash
cd <worktree>/batch-relink-export && npm run build
```

Stavěj ve worktree, ne v `~/Dev/extendscript-automation`: build v `~/Dev`
přepíše vydaný `dist/`. Build vznikne v `dist/illustrator-batch-relink-export.jsx`
(řídící vlákno ho zkopíruje do `~/Dev` jako `…-X.Y.Zx-test.jsx`). Spouštěj vždy
tento soubor přes **Soubor › Skripty › Jiný skript…**, ne starou nainstalovanou
kopii.

Dialog si pamatuje nastavení v `~/Library/Application Support/batch-relink-export/settings.json`.
Pro test prvního spuštění (bod 1.1) soubor přejmenuj a po testu vrať.

Pro body 1.10–1.13 měj po ruce Illustrator bez otevřeného dokumentu, pak
uloženou šablonu, nikdy neuložený nový dokument a šablonu s neuloženou změnou.

Připrav si reálnou zakázku: šablonu s pozicemi umístěnými z vícestránkového
PDF, zdrojovou složku s PDF rozdělenými po N stranách (N = počet pozic, poslední
soubor kratší) a prázdnou cílovou složku.

---

## 1. Dialog

- [ ] **1.1 Okem.** Nic uříznutého, pole zarovnaná. Při prvním spuštění (bez
  souboru s nastavením) je vzor předvyplněný `{n}_{template}_{source}`
  a příklad názvu ukazuje `01_sablona_zdroj.pdf` (B8). Předvybraný PDF preset
  je `[Kvalitní tisk]` (B9).
  Nápověda u „Přeskočit hotové výstupy" říká, že se přeskočí jen výstup
  novější než zdroj i šablona.
- [ ] **1.2 Klávesnice.** Esc zavře dialog jako Storno, Enter spustí Spustit.
  Při otevření má fokus pole Zdrojová složka, takže cesta zkopírovaná ve
  Finderu se tam hned vloží (Cmd+V) [O]. Enter, dokud je Spustit šedé (třeba
  s prázdným polem Cílová složka), nic nespustí a stavový řádek zůstane — jestli
  Enter na šedém tlačítku opravdu nic nedělá, ověřené není [O].
- [ ] **1.3 Cílová složka = zdrojová (B8).** Stejná složka jako Zdrojová
  i Cílová → stavový řádek „✗ Cílová složka je stejná jako zdrojová…", Spustit
  šedé a nic se nezapíše. Podsložka zdrojové složky jako Cílová projde.
- [ ] **1.4 Kontrola souborů (T2).** Dávka s kratším souborem uprostřed →
  okno Kontrola souborů s verdiktem „⚠ Zpracovat jde … z … archů, 1 s upozorněním.
  Blokováno: 0.", celý čitelný a bez tučného písma.
  Symboly ✓ ⚠ ✗ u řádků kontroly jsou čitelné ve světlém i tmavém UI
  Illustratoru (Předvolby › Uživatelské rozhraní) — barvy sady vedle sebe na
  obou neověřené.
  Dávka, kde je každý soubor delší než počet pozic → Pokračovat je vypnuté;
  zkus i Enter — jestli vypnuté tlačítko spustí, ověřené není [O].
- [ ] **1.5 Storno.** Storno v hlavním dialogu, u dotazu na otevřenou šablonu
  i v Kontrole souborů → v cílové složce nic nepřibude a otevřené dokumenty zůstanou.
- [ ] **1.6 Živá kontrola, šedé Spustit (A3, A4).** Vyplň cesty a do vzoru
  pojmenování napiš text bez `{n}` → hned po napsání stavový řádek „✗ Vzor
  musí obsahovat {n}, jinak se výstupy přepíšou.", pole vzoru červené, Spustit šedé; dialog
  se nezavírá a ostatní pole zůstávají. Prázdná pole hlásí jednu chybu za druhou
  v pořadí čtení (šablona, zdrojová složka, cílová složka…) a ke každé další
  chybě se připojí „Další chyby: N." Oprav vzor → Spustit se odemkne a řádek
  řekne „✓ Ve zdrojové složce je N PDF." Neexistující cílová složka ukáže
  „⚠ Cílová složka neexistuje, běh ji vytvoří." a Spustit zůstane aktivní.
  Výběr složky tlačítkem Vybrat… kontrolu spustí také a vyberete-li znovu tutéž
  složku po zkopírování dalších PDF, počet se změní.
- [ ] **1.7 Zapamatované nastavení (A1, A2).** Proběhni dávku s vlastním
  presetem dílny (třeba pass4press), vlastním vzorem a vypnutým „Otevřít
  složku". Spusť skript znovu, i po restartu Illustratoru → šablona, výstup,
  vzor, preset a „Otevřít složku" jsou z minula; zdroj je prázdný. „Přeskočit hotové výstupy" se teď pamatuje také (vypnuté při prvním
  spuštění). Okno má stejnou šířku jako při prvním spuštění — dlouhá cesta se
  do pole nevejde celá.
- [ ] **1.8 Chybějící preset (§12.3).** V `settings.json` přepiš `preset` na
  název, který Illustrator nemá, a spusť skript → seznam ukáže „název  (chybí)"
  a Spustit je šedé hned po otevření. Stavový řádek říká „✗ PDF preset „…“
  v Illustratoru není, vyberte jiný." Při prázdném zdroji řekne nejdřív chybu
  zdroje a připojí „Další chyby: 1." Po výběru jiného presetu (a vyplněném
  zdroji) se Spustit odemkne a dávka proběhne.
- [ ] **1.9 Výzvy výběru (T8).** Vybrat… u Šablony, Zdrojové a Cílové složky → okno
  výběru říká „Vyberte šablonu (.ai):", „Vyberte zdrojovou složku s PDF:"
  a „Vyberte cílovou složku:". Jestli macOS výzvu v okně výběru ukáže,
  ověřené není.
- [ ] **1.10 Použít aktivní dokument, žádný dokument.** Illustrator bez
  otevřeného dokumentu → tlačítko pod polem šablony je šedé.
- [ ] **1.11 Použít aktivní dokument, nikdy neuložený.** Nový dokument bez
  uložení → klik: pole šablony se nezmění a stavový řádek řekne „✗ Aktivní
  dokument není uložený. Uložte ho jako .ai." Totéž pro otevřené PDF: „Aktivní
  dokument není šablona .ai."
- [ ] **1.12 Použít aktivní dokument, uložený.** Uložený `.ai` → klik vyplní
  cestu a kontrola proběhne hned. S neuloženou změnou v dokumentu se objeví
  „⚠ Šablona má neuložené změny, běh použije verzi na disku." a Spustit zůstane
  aktivní.
- [ ] **1.13 Dotaz před přepisem.** Cílová složka s hotovými výstupy
  téhož pojmenování → po Spustit „V cílové složce už je: N souborů. Přepsat?"
  Ne vrátí dialog beze změny a nic se nezapíše; Ano dávku spustí a soubory
  přepíše. Se zaškrtnutým „Přeskočit hotové výstupy" a výstupy novějšími než
  zdroj i šablona dotaz nepřijde (počítají se jen soubory, které by běh
  opravdu zapsal).
- [ ] **1.14 Snímky ve světlém a tmavém UI.** Okno ve všech stavech (prázdné,
  platné, upozornění, chyba) vyfoť ve světlém i tmavém jasu Illustratoru
  (Předvolby › Uživatelské rozhraní): nic uříznutého, stavový řádek se vejde
  i s „Další chyby: N.", barvy ✓ ⚠ ✗ a červený text polí čitelné [O]. Okno je
  498 × 479 px a Spustit stojí pořád na stejném místě.

---

## 2. Reálná zakázka od začátku do konce

- [ ] **2.1 Plné archy.** Každý arch nese strany svého zdroje na správných
  pozicích; u oboustranného archu se kryje líc s rubem. Kontrola v Acrobatu.
- [ ] **2.2 Neúplný poslední arch (B2).** Pozice, pro které zdroj nemá stranu,
  na archu nejsou — ani prázdná maska, ani znovu strana 1. Souhrn ukáže
  „Odebrané pozice". Zakázka, jejíž jediný kratší soubor je poslední arch,
  proběhne **bez okna Kontrola souborů** a Souhrn končí „Vše proběhlo bez
  chyb." Šablona, která ukazuje některou stranu dvakrát, se vyexportuje beze
  změny s hláškou „Pozice navíc se neodebraly automaticky…".
- [ ] **2.2a Špatná mapa stran šablony.** Šablona, která ukazuje stranu 1 na
  dvou pozicích (a jedna strana chybí) → Kontrola souborů se ukáže i u plných
  archů, řádek „⚠ Pozice neukazují strany 1–N každou jednou: strana 1 je na 2 pozicích;
  chybí …", řádek „Šablona: … · N pozic na … kreslicích plátnech · strana … mm".
  Souhrn nese ten řádek „Šablona:" na začátku. Se špatnou mapou a neúplným
  posledním archem Kontrola ukáže navíc řádek, že pozice navíc se neodeberou a arch
  bude potřebovat ruční úpravu.
- [ ] **2.3 Nedostupné původní PDF (B6).** Šablonu, jejíž PDF leží na
  nepřipojeném disku nebo bylo přesunuto, skript zpracuje.
- [ ] **2.4 Zamčené vrstvy (B7).** Šablona se zamčenou vrstvou i podvrstvou
  s pozicemi se zpracuje; šablona na disku se nezmění.
- [ ] **2.5 Otevřená neuložená šablona (B5).** Šablonu otevři, přidej pozici,
  neukládej a spusť skript → dotaz na zahození změn. Po Ano běh prozkoumá
  uloženou šablonu (otevřenou měří na dočasné kopii) a Kontrolu souborů ukáže
  jen tehdy, když něco chce pohled; Storno v Kontrole souborů nechá dokument otevřený
  i se změnou. Otevřená uložená i neuložená šablona se přitom nikdy neměří na
  místě: dokument obsluhy zůstane otevřený a beze změny.
- [ ] **2.6 Jiný formát zdroje (B1).** Zdroj jiného rozměru nebo PDF se
  spadávkou v ploše stránky bez TrimBoxu → arch se nevyexportuje a hláška
  uvede oba rozměry v mm.
- [ ] **2.7 Logo (B4).** Šablona s propojeným logem nebo značkami jako
  souborem → logo zůstane logem, počet pozic v řádku „Šablona:" ho nezahrnuje.
- [ ] **2.8 Přeskočit hotové výstupy (B8).** Dávku zastav po dvou arších, spusť
  znovu se zaškrtnutým „Přeskočit hotové výstupy" → hotové archy se přeskočí
  a dotaz před přepisem se na ně neptá.
  Pak změň a ulož šablonu a spusť znovu → archy se vytvoří znovu se záznamem
  „Výstup už existoval, ale je starší…".
- [ ] **2.9 Chyby Illustratoru (A10).** Ověřené jen s podvrženou chybou,
  ne se skutečnou:
  - šablona, kterou Illustrator neotevře (třeba jiný soubor přejmenovaný na
    `.ai`) → hláška „Šablonu se nepodařilo otevřít — zkuste ji otevřít
    v Illustratoru ručně." s hláškou Illustratoru; Illustrator přitom nesmí
    ukázat vlastní okno a zaseknout se;
  - cílová složka bez práva zápisu → u každého archu „Arch se nevyexportoval
    kvůli chybě: …" a dávka doběhne do souhrnu.
- [ ] **2.10 Předvolba importu PDF (B10).** Umísti (Soubor › Umístit, bez
  možností importu) vícestránkové PDF do prázdného dokumentu a všimni si
  strany a ořezu. Spusť dávku a umísti ho znovu → stejná strana i ořez, ne
  poslední pozice šablony. Že dávka předvolbu vrátí, ověřil harness; jestli ji
  Umístit bez možností importu používá, ověřené není.
- [ ] **2.11 Diakritika v názvech zdrojů a šablony.** Zkopíruj zdroje
  v Terminálu s ručně napsaným názvem s „Č“ (`cp zdroj.pdf "Část1.pdf"` —
  název pak má „Č“ jako jeden znak) a spusť dávku → archy se vyexportují bez
  „Ověření relinku selhalo". Totéž se šablonou s diakritikou v názvu, otevřenou
  s neuloženou změnou → stavový řádek ukáže „⚠ Šablona má neuložené změny…".
  Ověřeno sondou 2026-11-15.

---

## 3. Běh z menu a zastavení dávky

- [ ] **3.1 Menu.** Všechno v sekci 2 poběží přes Soubor › Skripty (ověřování
  běželo přes AppleScript).
- [ ] **3.2 Zastavení klávesou Control.** Dávka o deseti a více souborech, během
  zpracování podrž Control (^) zhruba sekundu → paleta napíše „Zastavuji — rozpracovaný
  soubor se dokončí…", soubor doběhne a souhrn napíše „Zrušeno uživatelem po
  zpracování…". Paleta radí „Dávku zastavíte podržením klávesy Control (^).".
  Esc v Illustratoru 2027 dávku nezastaví, když je Illustrator vpředu
  (naměřeno 2026-11-15, engine-facts). Zkus Control podržet i ve chvíli, kdy se ukládá PDF: jestli
  Illustrator samotné ukládání nepřeruší (a nenechá ve výstupní složce
  rozepsaný soubor), ověřené není — výstup posledního souboru otevři v Acrobatu.

---

## 4. Zdroje z dalších programů (B3)

- [ ] **4.1 Počty stran.** PDF z běžných zdrojů dílny — Acrobat „Rozdělit
  dokument", export z InDesignu, PDF/X, zákaznická PDF — Kontrola souborů ukáže stejný
  počet stran jako Acrobat (ukáže se, jen když se něco odchyluje; zkus tedy
  i dávku s kratším souborem uprostřed). Každé „Nečitelný počet stran" si zapiš i s tím,
  čím PDF vzniklo.
- [ ] **4.2 Čas skenu.** Sken běží před Kontrolou souborů bez ukazatele průběhu. PDF
  s komprimovanými tabulkami trvá v enginu až ~2 s na soubor, extrémní soubor
  (18 MB, 4 053 stran) 16 s. U dávky desítek takových souborů změř, jak dlouho
  Illustrator nereaguje.

---

## 5. Anglický Illustrator

- [ ] **5.1 Texty.** Dialog, Kontrola souborů, souhrn a hlášky anglicky; verdikt Kontroly
  „… sheets can be processed, … with a warning. Blocked: …".
- [ ] **5.2 Preset.** Výchozí PDF preset (podle kódu `[High Quality Print]`,
  neměřeno).

---

## 6. Regresní přehled

Hlášky verze 1.3.0 (česky). Chyby polí ukazuje stavový řádek hlavního dialogu
(Spustit je šedé), ostatní hlášky okno nebo Souhrn:

| situace | výsledek |
|---|---|
| šablona s nedostupným původním PDF | arch vyexportovaný, bez chyby |
| pozice v zamčené podvrstvě | arch vyexportovaný, bez chyby |
| propojené logo, pozice na skryté vrstvě | počet pozic bez nich; „Skrytá pozice se nepřelinkovala (netiskne se) — vrstva „…“." |
| zdroj 110 × 60 mm na pozice 100 × 70 | „Pozice …: strana zdroje má 110 × 60 mm, šablona počítá s 100 × 70 mm…" |
| 2 strany na 4 pozice | Kontrola souborů (jen když se ukáže z jiného důvodu) „…: stran 2, pozic navíc 2 — odeberou se z archu.", souhrn „Odebrané pozice 2" |
| šablona se stranou 1 dvakrát, 2 strany | „Pozice navíc se neodebraly automaticky…", „Pozic navíc, které se nepodařilo odebrat: 2. Ukazují znovu stranu 1…" |
| 5 stran na 4 pozice | Kontrola souborů „…: stran 5 > pozic 4 — BUDE PŘESKOČENO…", souhrn „Přeskočeno: stran je více než pozic (5 > 4)…" |
| cílová = zdrojová složka | stavový řádek „✗ Cílová složka je stejná jako zdrojová, vyberte jinou.", Spustit šedé |
| prázdné pole Šablona, Zdrojová složka, Cílová složka | stavový řádek „✗ Vyberte šablonu." / „Vyberte zdrojovou složku." / „Vyberte cílovou složku." (první z chyb, ke zbylým „Další chyby: N."), Spustit šedé |
| vzor bez `{n}` a cílová složka, která ještě neexistuje | stavový řádek ✗ o vzoru, složka se nevytvoří; po opravě „⚠ Cílová složka neexistuje, běh ji vytvoří." a běh ji vytvoří |
| šablona jiného typu (PDF) | stavový řádek „✗ Šablona se nenašla nebo nemá příponu .ai." |
| vzor bez `{n}` | stavový řádek „✗ Vzor musí obsahovat {n}, jinak se výstupy přepíšou." |
| zdroj s nečitelným počtem stran | „…: počet stran nejde zjistit (poškozené nebo šifrované PDF?). Ověřte, že nemá víc stran než pozic…" |
| existující výstup starší než zdroj | „Výstup už existoval, ale je starší než zdroj nebo šablona — vytvořen znovu." |
| dávka o jednom souboru s upozorněním | verdikt Kontroly „Zpracovat jde 1 z 1 archu, 1 s upozorněním. Blokováno: 0." |
| neočekávaná chyba mimo zpracování archu | „Skript se zastavil kvůli neočekávané chybě: … (řádek N). Pošlete tuto hlášku správci skriptu." |
| Vybrat… u šablony, zdroje a výstupu | výzvy „Vyberte šablonu (.ai):", „Vyberte zdrojovou složku s PDF:", „Vyberte cílovou složku:" |
| dávka zastavená Control po 1 ze 3 souborů | „Zrušeno uživatelem po zpracování 1 z 3 souborů.", bez „Vše proběhlo bez chyb." |
| druhé spuštění | šablona, výstup (i s diakritikou v cestě), vzor, preset a „Otevřít složku" z minula, zdroj prázdný; výstup s uloženým `[PDF/X-4:2008]` je PDF 1.6 s PDF/X |
| zapamatované dlouhé cesty (72 i 133 znaků) | okno 498 × 479 px jako bez nastavení — pole se nenatahují podle textu |
| aktivní dokument nikdy neuložený / jiného typu | stavový řádek „✗ Aktivní dokument není uložený. Uložte ho jako .ai." / „✗ Aktivní dokument není šablona .ai.", pole šablony beze změny |
| ručně upravený soubor s nastavením (číslo místo cesty) | špatná hodnota výchozí, ostatní z minula, bez hlášky |
| zapamatovaný preset, který Illustrator nemá | v seznamu „název  (chybí)", stavový řádek „✗ PDF preset „…“ v Illustratoru není, vyberte jiný.", Spustit šedé; po výběru jiného presetu dávka proběhne a uloží se nový |
| poškozený soubor s nastavením | výchozí hodnoty, bez hlášky; běh soubor přepíše platným |
| nastavení nejde zapsat | „Nastavení se nepodařilo uložit — příště se dialog otevře bez něj. Běh pokračuje." a dávka proběhne |
| předvolba importu PDF strana 2 / MediaBox před během | po dávce, po Stornu v Kontrole souborů, po chybě i po zastavení dávky zůstane 2 / MediaBox (dřív strana a ořez poslední pozice šablony) |

**Známé, vědomě neopravené** (minor z review): v detailu chyby zůstává
anglická hláška Illustratoru (T5). Titulek okna nese anglický název nástroje
jako ve zbytku sady (kánon §12.7).

**Sledováno — pád a zamrznutí Illustratoru.** 2026-09-28 Illustrator 30.8.2
jednou spadl při dávce se zaškrtnutým „Přeskočit hotové výstupy" (bez crash
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
| Illustrator spadne nebo zamrzne během dávky či krátce po ní | neznámá, sledováno (sekce 6) | u kterého souboru paleta byla; pád, nebo zamrznutí (točící se kolečko); jestli dávka měla neúplný arch nebo zaškrtnuté „Přeskočit hotové výstupy"; čas; soubor `Adobe Illustrator_…` z `/Library/Logs/DiagnosticReports` |

---

## 8. Záznam

```
Datum: ______   Build (commit): ______   Illustrator: ______   Locale: CZ / EN
Sekce 1 [ ]  2 [ ]  3 [ ]  4 [ ]
Verdikt: [ ] vydat   [ ] blokováno — proč: ______
```

Vydání samo (verze, build, tag, Release) popisuje
[`../../docs/conventions.md`](../../docs/conventions.md).
