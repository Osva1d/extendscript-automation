# Audit UI, UX a textů — zund-summa-marks

Datum: 2026-09-28. Rozsah: dialog, tok běhu a texty `zund-summa-marks` ve stavu
`main` (d996f3b), tedy s opravami critical a major z
[code review 2026-09-26](2026-09-26-code-review-zund-summa-marks.md), před
vydáním 1.1.0. Kontext: nástroj používají operátoři prepressu denně a pod
časovým tlakem; chyba znamená zkažený tisk nebo řez. UI je česky s anglickou
verzí, repo je veřejné, cílová platforma je jen macOS (README).

Audit je jen prověrka stavu — v kódu se nic neměnilo. Nález je zapsaný jen tam,
kde jde popsat konkrétní situaci, ve které operátorovi škodí; stylová volba bez
praktického dopadu je označená jako preference. Nálezy, které už vedlo review,
nesou jeho kód (K…, T…). Cesty jsou relativní k `zund-summa-marks/`, cesty
začínající `shared/` ke kořeni repa.

## Metoda

- Přečtené `src/ui.js`, `src/locale.js`, `src/lib/validation.js`,
  `src/lib/utils.js`, `src/lib/bounds.js`, `src/main.js` a hlášky v `src/draw.js`.
- Měření v Illustratoru 30.8.2 (cs_CZ) přes `tools/ai-eval.sh`, **bez zobrazení
  okna a bez dokumentu**: skutečný `ui.js` se všemi moduly, přístup k dokumentu
  nahrazený stuby, `show()` přepsané na instanci okna (měřeno 2026-09-27, viz
  [`extendscript-engine-facts.md`](../extendscript-engine-facts.md)). U každého
  popisku, přepínače, zaškrtávátka a tlačítka se porovnala přirozená šířka textu
  se šířkou, kterou mu dialog dá.
- Živý dialog se neotvíral — v Illustratoru pracoval uživatel. Co bez něj nejde
  ověřit, je v sekci „Neověřeno".

**Závažnost:** problém / drobnost / preference.
**Jistota:** *ověřeno z kódu*, *ověřeno měřením*, *odhad bez spuštění*.

## 1. Verdikty

1. **UI — drobnosti.** Rozvržení, stavy prvků i klávesnice jsou dobré a české
   popisky se vejdou; slabá místa jsou výška dialogu na menším displeji, dvojí
   „Výchozí" a hodnoty druhého režimu, které se nepamatují z posledního běhu.
2. **Vstupy a validace — drobnosti.** Živá kontrola (červené pole, vypnuté
   Generovat, rozsah ve stavovém řádku) funguje; mezery jsou u desetinného
   měřítka, ukládání neplatných hodnot a u toho, že živá kontrola a Generovat
   čtou číslo jinak.
3. **UX tok — problém.** Režim „Dle výběru" výběr nečte — značky a artboard se
   počítají kolem veškeré grafiky včetně skrytých vrstev (K4, odložený); navíc
   výchozí předvolba vyvolá upozornění při každém běhu.
4. **Texty — drobnosti.** Nové hlášky z oprav jsou vzorové (co, proč, co
   udělat); tři nápovědy ale tvrdí něco, co neplatí, a jedna hláška posílá
   operátora hledat špatnou věc.

## 2. Nálezy

| ID | Místo | Co | Praktický dopad | Závažnost | Jistota |
|---|---|---|---|---|---|
| A1 | `src/lib/bounds.js:51`, `:70–111`; `src/locale.js:155`, `:191`, `:193`; `src/main.js:84`; `README.md:45`, `:55` | Auto-fit výběr zruší a měří veškerý obsah všech vrstev včetně skrytých a pasteboardu; popisek, nápověda, README i hláška slibují výběr (K4, T2) | Operátor vybere grafiku, v dokumentu je skrytá šablona nebo poznámka mimo artboard → artboard a značky kolem všeho, arch větší, než čekal. V prázdném dokumentu hláška „Nic není vybráno" posílá vybírat | problém | ověřeno z kódu |
| A2 | `src/config.js:68–69`, `src/draw.js:235–237` | Výchozí předvolba mapuje Cut ← [Registration]; od opravy K8 se řádek přeskočí s upozorněním | Každý běh s [Výchozí] končí upozorněním; operátor si zvykne okno odklikávat a přehlédne i důležitá upozornění (K1, K2) | drobnost | ověřeno z kódu |
| A3 | `src/ui.js:633`, `:1030` | Hodnoty druhého režimu se berou z aktivní předvolby, ne z posledního běhu | Neuložená úprava SUMMA (např. horní výjezd 90) po jednom běhu ZUND tiše zmizí, příští SUMMA vyjde s hodnotou z předvolby | drobnost | ověřeno z kódu |
| A4 | `src/ui.js:452` (až 8 řádků vrstev) | Dialog měří 717 px (ZUND) a 753 px (SUMMA) s 1 řádkem, s 8 řádky 920 a 932 px, plus titulek okna; řádek vrstvy přidá 29 px | Na displeji vysokém 900 px se SUMMA zhruba od 5 řádků (ZUND od 6) nevejde a Storno/Generovat jsou mimo obrazovku; při 800 px ani SUMMA s jedním řádkem | drobnost | ověřeno měřením |
| A5 | `src/locale.js:219` (EN `:90`) | Nápověda „Vzdálenost středu značky od okraje grafiky" je špatně, kód měří k okraji značky (T1) | Kdo potřebuje střed značky 10 mm od grafiky, zadá 10 a dostane 12,5 mm | drobnost | ověřeno z kódu |
| A6 | `src/locale.js:202`, `shared/lib/ui_state.js:65` | Nápověda nabídky předvoleb radí zvolit [Last Settings], ta v nabídce není | Operátor ji hledá a nenajde; neví, že dialog se s posledními hodnotami otevírá sám | drobnost | ověřeno z kódu |
| A7 | `src/draw.js:263–264`, `src/locale.js:159` | „Přiřazená barva nebyla v dokumentu nalezena" se ukáže i tehdy, když vzorník existuje, jen v něm není žádná cesta; vrstvu neuvede (T3) | Operátor zkontroluje Vzorníky, Cut tam je, a neví, co opravit (typicky cesty v jiné barvě) | drobnost | ověřeno z kódu |
| A8 | `src/ui.js:167`; `src/locale.js:271` × `:209` | Tlačítko „Výchozí" (tovární hodnoty do dialogu) a předvolba „[Výchozí]" jsou dvě akce se stejným slovem | Operátor chce přepnout na [Výchozí], klikne na tlačítko a pak Uložit → přepíše svou aktivní předvolbu továrními hodnotami | drobnost | ověřeno z kódu |
| A9 | `src/locale.js:251` | „Pouze značky… nesáhne na žádné vrstvy" přehání (T6): režim přidá Regmarks a Trim, obnoví ořezové linky a v Auto-fit změní artboard | Operátor čeká nedotčený dokument a artboard se mu změní | drobnost | ověřeno z kódu |
| A10 | `src/ui.js:794`, `:853–854`, `:882` | Uložit a Uložit jako nekontrolují platnost polí (K17) | Předvolba uložená s prázdným polem se příště otevře s „null" v poli | drobnost | ověřeno z kódu |
| A11 | `src/ui.js:299–305` × `:1106–1111` | Měřítko „2,5" projde živou kontrolou, ale ořízne se na 1:2 (K16) | Běh v jiném měřítku, než operátor zadal; titulek a stavový řádek ukážou 1:2, ale jen pro toho, kdo se podívá | drobnost | ověřeno z kódu |
| A12 | `src/lib/storage.js:85–87`, `:184` | Poškozený soubor s nastavením se tiše zahodí (K15) | Všechny předvolby zmizí bez hlášky a příští Generovat soubor přepíše | drobnost | ověřeno z kódu |
| A13 | `src/ui.js:1197–1216` × `:981–1040` | Duplicitní barvu hlídá jen živá kontrola, obsluha Generovat ne | Kdyby Enter spustil vypnuté Generovat, druhá vrstva se stejnou barvou zůstane prázdná | drobnost | odhad bez spuštění |
| A14 | `src/ui.js:180–185` | „Uložit jako…" potřebuje 103 px, dostane 92 | Text může být oříznutý; tlačítko funguje | preference | šířka ověřená měřením, vzhled neověřen |
| A15 | `src/locale.js` různá místa; `src/main.js:10`, `:48`, `:66`, `:84`, `:93` | České texty píšou „[Registration]", nabídka ukazuje „[Registrační]" (T7); anglická slova v závorkách (Top, Feed, Spot); „Artboard" × „artboard"; uvozovky ‘ ’ místo „ "; vykřičníky ve validaci; prefix CHYBA jen u části hlášek; anglické „(line N)" v kritické chybě (T5) | bez praktického dopadu | preference | ověřeno z kódu |

## 3. Neověřeno

Vyžaduje živý dialog, udělá se, až bude Illustrator volný:

- jestli Enter spustí vypnuté Generovat (rozhoduje o dopadu A13);
- kam skočí focus po otevření ve Fixed, kde je první pole zašedlé
  (`src/ui.js:1361`);
- jak vypadá „Uložit jako…" v šířce 92 px (A14).

## 4. Co je dobře a nemá se rozbít

- Pořadí panelů odpovídá úloze: předvolba → technologie a zdroj → značky →
  role (jen SUMMA) → vrstvy → stav → tlačítka; režimově specifické dialogy bez
  skrytých panelů.
- Živá validace: červené pole, vypnuté Generovat a stavový řádek s názvem pole
  a povoleným rozsahem (u více chyb počet).
- Jednotky „mm" u každého pole, pevná mřížka sloupců (`ZSM.UI.M`); změřeně se
  nikde neořízne český popisek.
- Náhled barvy u každého výběru barvy; chybějící barva nebo vrstva se ukáže
  jako „(chybí)", ne tichou záměnou.
- Stavy prvků: mezera od grafiky ve Fixed zešedne, pole měřítka jen se
  zaškrtnutím, mapování u Pouze značky zešedne, Uložit a ↺ jen při změně,
  [Výchozí] nejde smazat, poslední řádek nejde odebrat, Přidat se vypne na
  8 řádcích.
- Enter/Esc přes `name: "ok"` / `"cancel"`, Storno vlevo, Generovat vpravo,
  focus po otevření v prvním poli.
- Hlášky z oprav (K1, K2, K6, K7, K8, K10, K12) říkají co, proč a co udělat,
  a „Dokument nebyl změněn" jen tam, kde to platí; CHYBA a UPOZORNĚNÍ se liší
  a upozornění přijdou v jednom okně na konci.
- Předpoklady se kontrolují dřív, než se dokument změní; Storno nic nezmění;
  poslední nastavení se ukládá jen po Generovat; předvolba si nese režim (K5).

## 5. Doporučené změny — top 5 podle poměru přínosu k práci

1. **A1 — K4 aspoň v textech.** Skutečné čtení výběru je větší změna
   a rozhodnutí na autorovi.
   - Popisek (`SRC_AUTO`): „Dle výběru (Auto-fit)" → „Dle grafiky (Auto-fit)"
   - Nápověda (`TIP_SRC_AUTO`): „Pozice značek se určí podle vybrané grafiky
     a Artboard se automaticky přizpůsobí." → „Značky se umístí kolem veškeré
     grafiky v dokumentu, i ve skrytých vrstvách a mimo artboard, a artboard se
     přizpůsobí. Výběr se nebere v úvahu."
   - Hláška (`ERR_NO_SEL`): „Nic není vybráno." → „V dokumentu není žádná
     grafika, kolem které by šly značky umístit. Přidejte grafiku, nebo zvolte
     Dle artboardu."
   - README: vypustit „Vyžaduje, aby byla grafika vybrána" a v Rychlém startu
     krok „Vybrat grafiku".
2. **A2 — výchozí řádek mapování** brát z rozpoznané řezové barvy, ne
   z [Registration]. Beze změny textů.
3. **A5, A6, A9 — tři nápovědy.**
   - `TIP_GAP_GZ`: „Vzdálenost středu značky od okraje grafiky." → „Mezera mezi
     okrajem grafiky a okrajem značky."
   - `TIP_PRESET`: „Vyberte uloženou předvolbu pro načtení jejích nastavení,
     nebo zvolte [Last Settings] pro obnovení hodnot z posledního spuštění." →
     „Vyberte uloženou předvolbu; načtou se její hodnoty i režim. Dialog se
     vždy otevírá s hodnotami posledního spuštění."
   - `TIP_MARKS_ONLY`: „Vykreslí pouze registrační značky a nesáhne na žádné
     vrstvy — žádné přesouvání cest ani přejmenování. Použijte, když máte
     řezací vrstvy už separované a schází jen značky." → „Vykreslí jen
     registrační značky: cesty nepřesouvá a vaše vrstvy nepřejmenovává. Vrstvy
     Regmarks a Trim se obnoví a v režimu Dle grafiky se přizpůsobí i artboard.
     Použijte, když máte řezací vrstvy už separované."
4. **A7 — hláška o barvě** (`ERR_COLOR_MISSING`, potřebuje název vrstvy jako
   další parametr): „Přiřazená barva nebyla v dokumentu nalezena: %s" →
   „Vrstva ‘%s’: v barvě ‘%s’ není v dokumentu žádná cesta, nic se
   nepřesunulo. Zkontrolujte barvu řezových cest."
5. **A3 — hodnoty druhého režimu** brát z posledního běhu, ne z aktivní
   předvolby (`src/ui.js:633`, `:1030`). Beze změny textů.

## 6. Naměřeno

Illustrator 30.8.2, cs_CZ, macOS; dialog sestavený a rozvržený bez zobrazení
(`w.layout.layout(true)`), přístup k dokumentu nahrazený stuby.

| dialog | velikost obsahu okna |
|---|---|
| ZUND, 1 řádek vrstev | 448 × 717 px |
| SUMMA, 1 řádek vrstev | 448 × 753 px |
| ZUND, 8 řádků vrstev | 448 × 920 px |
| SUMMA, 8 řádků vrstev | 448 × 932 px |

Přirozená šířka textu proti přidělené šířce: žádný popisek, přepínač ani
zaškrtávátko se neořízne. Užší než přirozená šířka jsou jen tlačítka „↺"
(30 px) a „−" (24 px), záměrně kompaktní, a „Uložit jako…" (92 px proti
103 px, A14).
