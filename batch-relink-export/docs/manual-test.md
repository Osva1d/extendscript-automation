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

Připrav si reálnou zakázku: šablonu s pozicemi umístěnými z vícestránkového
PDF, zdrojovou složku s PDF rozdělenými po N stranách (N = počet pozic, poslední
soubor kratší) a prázdnou výstupní složku.

---

## 1. Dialog

- [ ] **1.1 Okem.** Nic uříznutého, pole zarovnaná. Vzor je předvyplněný
  `{n}_{template}_{source}` a náhled názvu ukazuje `01_sablona_zdroj.pdf` (B8).
  Nápověda u „Přeskočit existující soubory" říká, že se přeskočí jen výstup
  novější než zdroj i šablona.
- [ ] **1.2 Klávesnice.** Esc zavře dialog jako Storno, Enter spustí Spustit.
- [ ] **1.3 Výstup do zdrojové složky (B8).** Stejná složka jako Zdroj i Výstup →
  hláška „Výstupní složka je stejná jako zdrojová…" a skript skončí, nic se
  nezapíše. Podsložka zdrojové složky jako Výstup projde.
- [ ] **1.4 Náhled (T2).** Dávka s kratším posledním souborem → tučný verdikt
  „… archů lze zpracovat (1 s upozorněním) · 0 blokováno", celý čitelný.
  Dávka, kde je každý soubor delší než počet pozic → Pokračovat je vypnuté;
  zkus i Enter — jestli vypnuté tlačítko spustí, ověřené není.
- [ ] **1.5 Storno.** Storno v hlavním dialogu, u dotazu na otevřenou šablonu
  i v náhledu → ve výstupní složce nic nepřibude a otevřené dokumenty zůstanou.

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
| propojené logo, pozice na skryté vrstvě | počet pozic bez nich; „PlacedItem na skryté vrstvě přeskočen: …" |
| zdroj 110 × 60 mm na pozice 100 × 70 | „Pozice …: strana zdroje má 110 × 60 mm, šablona počítá s 100 × 70 mm…" |
| 2 strany na 4 pozice | náhled „…: stran 2, pozic navíc 2 — odeberou se z archu.", souhrn „Odebrané pozice 2" |
| šablona se stranou 1 dvakrát, 2 strany | „Pozice navíc se neodebraly automaticky…", „Pozic navíc, které se nepodařilo odebrat: 2. Ukazují znovu stranu 1…" |
| 5 stran na 4 pozice | náhled „…: stran 5 > pozic 4 — BUDE PŘESKOČENO…", souhrn „Přeskočeno: stran je více než pozic (5 > 4)…" |
| výstup = zdroj | „Výstupní složka je stejná jako zdrojová…" |
| existující výstup starší než zdroj | „Výstup už existoval, ale je starší než zdroj nebo šablona — vytvořen znovu." |
| dávka zastavená Esc po 1 ze 3 souborů | „Zrušeno uživatelem po zpracování 1 z 3 souborů.", bez „Vše proběhlo bez chyb." |

**Známé, vědomě neopravené** (minor z review): výchozí PDF preset se liší podle
jazyka a nepamatuje se (B9); po běhu zůstane v Illustratoru změněná předvolba
importu PDF — strana a ořez posledního linku šablony (B10); dialog si
nepamatuje nastavení a validuje až po zavření, takže chyba znamená vyplnit
cesty znovu; texty T3–T8 kromě skloňování čísel.

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
