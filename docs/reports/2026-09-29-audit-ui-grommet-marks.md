# Audit UI, UX a textů — grommet-marks

Datum: 2026-09-29. Rozsah: dialog, tok běhu a texty `grommet-marks` ve stavu
větve `fix/grommet-marks-review` (fbbf564), tedy s opravami critical a major z
[code review 2026-09-26](2026-09-26-code-review-grommet-marks.md), před buildem
pro ruční testy. Kontext: nástroj umísťuje značky pro oka po hranách artboardu
nebo po vybrané cestě, v prepressu bannerů před tiskem a osazováním ok;
používají ho operátoři pod časovým tlakem a chyba znamená zkažený tisk nebo
řez. UI je česky s anglickou verzí, repo je veřejné, cílová platforma je podle
README jen macOS. Jak často nástroj operátoři používají, v zadání nebylo.

Audit je jen prověrka stavu — v kódu se nic neměnilo. Nález je zapsaný jen tam,
kde jde popsat konkrétní situaci, ve které operátorovi škodí; stylová volba bez
praktického dopadu je označená jako preference. Nálezy, které už vedlo review,
nesou jeho kód (G…, U…, T…). Cesty jsou relativní k `grommet-marks/`.

## Metoda

- Přečtené `src/ui.js`, `src/locale.js`, `src/lib/validation.js`, `src/main.js`,
  `src/config.js` a `shared/lib/ui_state.js`.
- Měření v Illustratoru 30.8.2 (cs_CZ) přes `tools/ai-eval.sh`, **bez zobrazení
  okna**: skutečný build, dialog postavený a rozvržený (`layout.layout(true)`),
  `show()` přepsané na instanci, úložiště nastavení nahrazené stubem. U každého
  popisku, přepínače, zaškrtávátka a tlačítka se porovnala přirozená šířka
  textu (stejný prvek v prázdném okně) se šířkou, kterou mu dialog dá; anglická
  verze se změřila s vynuceným `lang = "en"`.
- Nezobrazené okno má `visible === false`: kontrola viditelnosti prvků se musí
  zastavit před oknem, jinak přeskočí všechno. První verze sondy tak falešně
  hlásila „nic se neořízne"; čísla níž jsou z opravené verze.
- Živý dialog se neotvíral. Co bez něj nejde ověřit, je v sekci „Neověřeno".

**Závažnost:** problém / drobnost / preference.
**Jistota:** *ověřeno z kódu*, *ověřeno měřením*, *odhad bez spuštění*.

## 1. Verdikty

1. **UI — drobnosti.** Pořadí panelů, zarovnaná mřížka hran a logika zašednutí
   jsou dobré, dialog měří nejvýš 754 px a česky se ořízne jen „Uložit jako…";
   slabá místa jsou nápovědy u zašedlých voleb, které neodpovídají důvodu,
   a Generovat, které zašedne bez vysvětlení.
2. **Vstupy a validace — drobnosti.** Živá kontrola (červené pole, vypnuté
   Generovat) a čárka i tečka fungují; u polí ale chybí jednotky (tloušťky jsou
   v bodech a nápověda tvrdí opak) a `parseFloat` pustí překlepy.
3. **UX tok — drobnosti.** Předpoklady se kontrolují před dialogem, Storno nic
   nezmění, běh je jeden krok Zpět a nové hlášky říkají co a proč; chybí
   shrnutí výsledku (značky jdou na všechna plátna) a vybraná cesta nepředvolí
   režim cesty.
4. **Texty — drobnosti.** Nové hlášky z oprav jsou vzorové; čtyři nápovědy ale
   tvrdí něco, co neplatí (čtverec, „všechny rozměry", „nemá rohy", rozteč ×
   rozestup).

## 2. Nálezy

| ID | Místo | Co | Praktický dopad | Závažnost | Jistota |
|---|---|---|---|---|---|
| A1 | `src/locale.js:244` (EN `:114`) | `TIP_SIZE` mluví o „straně čtverce", čtverec neexistuje, o kříži nic (T1) | S křížem operátor neví, jestli Velikost je celé rameno, nebo půlka | drobnost | ověřeno z kódu |
| A2 | `src/locale.js:185` (EN `:55`); popisky `src/ui.js:610`, `:614` | Nápověda jednotek slibuje „všechny rozměry", tloušťky jsou v bodech a popisek jednotku nemá (U3) | S milimetry v hlavě zadá halo 1 → 0,35 mm, značka je na tmavém motivu hůř čitelná | drobnost | ověřeno z kódu |
| A3 | `src/ui.js:527–530`, `src/locale.js:220` | Zóny zašedlé kvůli Počtu na cestě s rohy ukazují „Vybraná cesta nemá rohy" | Informační řádek hlásí „4 rohů", nápověda opak; operátor neví, že stačí přepnout na Rozestup | drobnost | ověřeno z kódu |
| A4 | `src/locale.js:219`; `src/ui.js:188` | `TIP_ZONES` říká „podle rozteče hrany/cesty", pole hrany se jmenuje Rozestup; od opravy G3 je tento text i na zašedlém Počtu („…použije tuto rozteč…") | Operátor hledá u hrany pole „Rozteč"; na Počtu text nevysvětlí, proč je zašedlý | drobnost | ověřeno z kódu |
| A5 | `src/ui.js:293`, `src/locale.js:200` | Zašedlá „Vybraná cesta" má jednu nápovědu „Nejdřív vyberte cestu" bez ohledu na důvod (U1); konkrétní texty v locale existují a nepoužívají se | Zákaznická kontura bývá skupina nebo složená cesta; nápověda radí vybrat cestu, kterou má vybranou → zdržení | drobnost | ověřeno z kódu |
| A6 | `src/ui.js:826`, `:829` | Generovat zašedne i bez zapnuté hrany nebo bez tvaru, nic nezčervená ani se nevysvětlí | Operátor vypne Horní a Levou (se zrcadlením tím i Dolní a Pravou) a neví, proč nejde generovat | drobnost | ověřeno z kódu |
| A7 | `src/ui.js:698–699` | S vybranou cestou se dialog otevře v režimu z minulého běhu (U2) | Vybere konturu, odklepne Enter → značky po hranách artboardu; Zpět a znovu | drobnost | ověřeno z kódu |
| A8 | `src/main.js:171`, `:225` | Po běhu žádné shrnutí, přitom značky jdou na všechna plátna | Ve vícestránkovém dokumentu dostane značky i plátno mimo obrazovku (štítek, nátisk); přijde se na to u tisku | drobnost | ověřeno z kódu |
| A9 | `src/ui.js:644`, `:794` | Čísla čte `parseFloat`: „1O5" → 1, „1 000" → 1, pole nezčervená (G10) | Překlep dá rozestup 1 mm a tisíce značek; výsledek je vidět, ale stojí Zpět a nový běh | drobnost | ověřeno (Node, review) |
| A10 | `src/main.js:46`; `src/lib/validation.js:67`, `:130` | Chyba až při odeslání zavře dialog a hodnoty se neuloží; hláška jmenuje „Odsazení X" (v dialogu je ↔) nebo „Počet ok" bez hrany (U4, U5, G7) | Hlavně u G7: alert o poli, které v režimu cesty není vidět, a zadání je pryč | drobnost | ověřeno z kódu a v Node |
| A11 | `src/locale.js:253`, `:255`; `src/main.js:230` | „Neočekávaná chyba — ⟨anglická hláška DOM⟩" a „…zkontrolujte cílovou vrstvu" neříkají, co dělat, ani že část značek už vznikla (T2) | Při vzácné chybě operátor neví, v jakém stavu dokument je (stačí jedno Zpět) | drobnost | ověřeno z kódu |
| A12 | `src/config.js:51` × `:37` | Výchozí zóny 5 × 100 mm a výchozí rozestup 105 mm jsou skoro stejné | Operátor si zóny zkusí s výchozími hodnotami, nic se viditelně nezhustí a má za to, že funkce nefunguje | drobnost | ověřeno z kódu |
| A13 | `src/ui.js:265`, `:272` | „Uložit jako…" potřebuje 103 px, dostane 92 | Text může být oříznutý, tlačítko funguje | preference | šířka ověřená měřením, vzhled neověřen |
| A14 | `src/ui.js:334`, `:340`, `:462`, `:520` | V palcích se „0.275591" (57 px) nevejde do pole 44 px, „4.133858" do 50 px | Vidět je jen začátek čísla; v české dílně se palce nejspíš nepoužívají | preference | ověřeno měřením |
| A15 | `src/locale.js` různá místa; `src/ui.js:289`, `:293` | „4 rohů", „2 značek" (chybí tvar pro 2–4); „předvolba" × „nastavení" pro totéž; „Počet ok" × „značky"; „artboard" místo „kreslicí plátno"; rovné uvozovky a vykřičníky ve validaci; anglický titulek okna; rádia Hrany/Cesta bez nápovědy; nápovědy Počtu a Rozestupu říkají „na hraně" i v panelu Cesta | bez praktického dopadu | preference | ověřeno z kódu |

## 3. Neověřeno

Vyžaduje živý dialog nebo jiné prostředí:

- kam skočí fokus po otevření a pořadí tabulátoru (kód fokus nenastavuje; na
  macOS záleží na systémové „navigaci klávesnicí");
- jestli Enter spustí zašedlé Generovat (rozhoduje o dopadu A10);
- vzhled „Uložit jako…" v 92 px (A13) a červené písmo v poli ve světlém
  i tmavém UI;
- Windows: build má BOM, měl by se tedy číst jako UTF-8, ale znaky ↺ ▸ ↔ ↕
  nemusí být ve výchozím písmu — README uvádí jen macOS;
- které výchozí hodnoty jsou v dílně nejčastější (Počet 10 na hranu se
  rozměru nepřizpůsobí, Rozestup ano);
- displej vysoký 800 px: bez zrcadlení má okno 754 px obsahu plus titulek,
  s menu barem to nemusí vyjít; na 900 px a víc se vejde.

## 4. Co je dobře a nemá se rozbít

- Pořadí panelů: předvolby → umístění a jednotky → hrany/cesta → rohové zóny →
  značka → tlačítka; Hrany a Cesta sdílejí jedno místo a okno se při přepnutí
  zmenší i zvětší (změřeno 708 ↔ 661 px).
- Mřížka hran se zamčenými šířkami a hlavičkou Počet ok / Rozestup; česky se
  nic neořízne kromě A13.
- Živá validace: červené pole a zašedlé Generovat, desetinná čárka i tečka.
- Zašedlé volby s nápovědou: Vybraná cesta bez cesty, zóny na hladké cestě,
  spočtený Počet na cestě s rohy, Počet při zónách (G3), Uložit a ↺ jen při
  změně, [Výchozí] nejde smazat.
- Enter a Esc přes `name: "ok"` / `"cancel"`, Storno vlevo, Generovat vpravo,
  ↺ s nápovědou, potvrzení před smazáním i přepsáním předvolby.
- Poslední nastavení se obnoví samo (i jednotky); režim cesty se bez výběru
  bezpečně vrátí na hrany.
- Poznámka v panelu Cesta (proč tu není odsazení a jak ho udělat) — vzor
  nápovědy.
- Nové hlášky G4 a G5: co, proč, co dělat; upozornění v jednom okně na konci.
- Bez dokumentu jasná hláška ještě před dialogem; Storno nic nevytvoří
  (změřeno); běh je jeden krok Zpět; značky vzniknou za zlomek sekundy,
  průběh netřeba.
- Kódování: build má jeden BOM, zdroje žádný, EN a CS mají stejné klíče;
  čeština v textech dialogu i hlášek se v Illustratoru přečte správně
  (změřeno).

## 5. Doporučené změny — top 5 podle poměru přínosu k práci

1. **A1, A3, A4 — nápovědy, které neplatí.**
   - `TIP_SIZE`: „Průměr kruhu nebo délka strany čtverce v měrných jednotkách"
     → „Průměr kruhu a délka ramen kříže, v jednotkách nahoře." (EN „Circle
     diameter and cross arm span, in the units above.")
   - `TIP_ZONES`: „Prvních N značek od každého rohu použije tuto rozteč;
     zbytek jede podle rozteče hrany/cesty." → „Prvních N značek od každého
     rohu dostane tuto rozteč; zbytek hrany nebo cesty se rozmístí podle
     rozestupu." (EN beze změny)
   - zašedlý Počet při zónách (nový text místo `TIP_ZONES`) → „Se zapnutými
     rohovými zónami se hrana plní podle rozestupu, počet se nepoužije."
   - zóny zašedlé kvůli Počtu na cestě s rohy (nový text místo „Vybraná cesta
     nemá rohy…") → „S Počtem na cestě s rohy leží značky jen v rozích, zóny
     nemají co zhustit. Pro zóny zvolte Rozestup."
2. **A2 — jednotky tlouštěk.** Popisky „Reg. tah:" → „Reg. tah (pt):",
   „Bílé halo:" → „Bílé halo (pt):" (EN obdobně); `TIP_UNITS`: „Měrné jednotky
   pro všechny rozměry." → „Jednotky pro odsazení, rozestupy a velikost
   značky. Tloušťky tahů jsou vždy v bodech." Po změně popisků šířku znovu
   změřit.
3. **A5 — proč je „Vybraná cesta" zašedlá**, podle důvodu, který skript zná:
   - nic vybráno: „Nejdřív vyberte cestu v dokumentu a spusťte skript znovu."
     → „Nic není vybráno. Vyberte jednu cestu a spusťte skript znovu."
     (text v locale už je);
   - skupina, složená cesta, víc objektů: „Výběr není jednoduchá cesta.
     Složenou cestu nejdřív rozdělte: Objekt ▸ Složená cesta ▸ Uvolnit." →
     „Výběr není jedna jednoduchá cesta. Cestu ze skupiny vyberte nástrojem
     Přímý výběr (A), složenou cestu rozdělte (Objekt ▸ Složená cesta ▸
     Uvolnit), z více objektů nechte vybraný jeden.";
   - méně než dva body: „Vybraná cesta má méně než 2 body." (existuje).
4. **A8 — shrnutí jen ve vícestránkovém dokumentu**, ať se neodklikává po každém
   běhu: nová hláška, že značky vznikly na všech artboardech dokumentu, s jejich
   počtem.
5. **A9 — přísné čtení čísel**: jedna převodní funkce pro dialog i živou
   kontrolu, takže „1O5" nebo „1 000" zčervená místo tichého 1 mm. Beze změny
   textů.

Mimo top 5: A7 (předvolit „Vybranou cestu", když je cesta vybraná) je spíš
rozhodnutí než oprava — výběr signalizuje záměr, ale může zůstat i omylem.

## 6. Naměřeno

Illustrator 30.8.2, cs_CZ, macOS; dialog sestavený a rozvržený bez zobrazení,
skutečný build (SHA-256 73f3013d…).

| stav dialogu | CS | EN |
|---|---|---|
| Hrany artboardu, zrcadlení zapnuté | 521 × 708 px | 492 × 708 px |
| Hrany artboardu, bez zrcadlení (4 řádky) | 521 × 754 px | 492 × 754 px |
| Vybraná cesta | 521 × 661 px | 492 × 661 px |

- Přirozená šířka textu proti přidělené: užší je jen „Uložit jako…"
  (92 / 103 px, CS) a „↺" (30 px, záměrně kompaktní).
- Víceřádková poznámka v panelu Cesta: box 330 × 60 px, zalomený text
  potřebuje 45 px — vejde se.
- Palce: „0.275591" potřebuje 57 px v poli 44 px, „4.133858" a „3.937008"
  57 px v polích 50 px.
- Storno: dokument beze změny, vrstva nevznikla.
