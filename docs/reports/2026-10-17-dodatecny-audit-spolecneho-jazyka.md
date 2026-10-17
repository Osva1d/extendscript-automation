# Dodatečný audit společného jazyka — vydané verze

Datum: 2026-10-17. Rozsah: `main` 3299b75 — grommet-marks 1.3.0,
tile-export 1.1.0 (obě vydané dnes), zund-summa-marks 1.1.0
a batch-relink-export 1.1.0. Navazuje na
[audit z 2026-10-14](2026-10-14-audit-spolecneho-jazyka.md) a jeho rozhodnutí
z 2026-10-15 (§8) a na kánon zapsaný do skillu `extendscript-ui-standards`
§12. Kódy nálezů (J…, P…) jsou z původního reportu.

Audit je jen prověrka stavu: v kódu se nic neměnilo a v Illustratoru se nic
neměřilo.

## Metoda

- Změny od výchozího stavu původního auditu (c75ca8a): GM 32 commitů, TE 18;
  ZSM, BRE a `shared/lib` beze změny, jejich stav je proto stejný jako
  14. 10. a v tabulce §2 je převzatý.
- České texty všech čtyř `locale.js` spočítané skriptem stejně jako
  v původním auditu (oslovení, dvojtečky, uvozovky, prefixy, vykřičníky,
  parita klíčů EN/CS).
- Převod čísel změřený v Node přímo na zdrojových funkcích všech tří
  nástrojů (§3, N1).
- Ostatní body ověřené čtením kódu, s řádky.
- Pokus o rozdělení práce mezi dvanáct agentů přerušil limit relace dřív,
  než kterýkoli vrátil výsledek; nic z něj tu není.

**Jistota:** *z kódu* (přečteno, nespuštěno), *změřeno* (spuštěno v Node),
*neověřeno*.

## 1. Verdikt

1. **TE 1.1.0 převzal z auditu nejvíc:** přísné čtení čísel s červeným polem
   a důvodem ve Výsledku (P1), „(chybí)" u barvy řezu, barvy značek a PDF
   presetu (P10), barvy kánonu (J7), stavovou řádku (J8) a rodinnou patičku
   (J4).
2. **Dvě rozhodnutí z 15. 10. ale TE 1.1.0 nepřevzal:** 9 textů dál tyká
   (J2) a 36 popisků je bez dvojtečky (J6). Kánon ve skillu existoval dva dny
   před vydáním — to, že ho skill má, samo nestačilo.
3. **GM 1.3.0** převzal šedý řádek s tím, co skript našel (J8, bez důvodu
   šedého Generovat), skloňování přes `count` a hlášky podle §12.2 u nových
   chyb. Ostatní body auditu má v plánu další verze.
4. **Nové:** v rodině jsou teď dva „přísné" převody čísel s jinou gramatikou
   a kánon jako vzor uvádí ten, který pravidlo porušuje (N1, N2); obarvení
   neplatného pole má třetí kopii, takže splnilo podmínku pro sdílení ze
   §6 původního reportu. Desetinnou čárku všechny tři nástroje s čísly
   přečtou, ale do pole ji vrátí jako tečku (N6).
5. **Měřítko kresby je na řadě.** Doporučuji rodinný klíč, který už existuje:
   dnešní klíč TE v XMP, s kódem přesunutým do `shared/lib` (§5).

## 2. Stav nálezů

✓ vyřešeno · ~ částečně · ✗ otevřené · — netýká se

| nález | GM 1.3.0 | ZSM 1.1.0 | BRE 1.1.0 | TE 1.1.0 |
|---|---|---|---|---|
| J1 jeden slovník | ✗ Rozestup × rozteč (nerozhodnuto) | ✗ Zünd popisky | ✗ souborové pojmy (nerozhodnuto) | ✗ Zünd popisky, „orientační bod" v `ERR_MARKS_ORIENT` |
| J2 vykání | ✓ | ✓ | ✓ | ✗ 9 textů tyká |
| J3 věty předvoleb | ✗ (+ „nastavení" pro předvolbu) | ✗ | — | ✗ (+ `TIP_SAVE`, `TIP_DEL` mluví o [Default]) |
| J4 patička a titulek | ~ patička ✓, titulek „Illustrator Grommet Marks" | ✓ | ~ ✓, český `TITLE` nepoužitý | ✓ (patička opravena v 1.1.0) |
| J5 chybová hláška, bez dokumentu | ~ bez dokumentu ✓, neočekávaná chyba ✗ | ✗ | ✓ vzor | ✗ `KRITICKÁ CHYBA:` + „Line:", jiná věta bez dokumentu |
| J5 neuložené nastavení | ✗ | ✗ | ✓ vzor | ✗ |
| J6 dvojtečka za popiskem | ✓ | ✓ | ✗ 6 popisků | ✗ 36 popisků |
| J6 uvozovky „…" | ✗ "…" (3) | ✗ ‘…’ (12) | ~ '…' (1) | ✓ |
| J6 prefixy, vykřičníky | ✗ vykřičníky (3) | ✗ 4 prefixy, vykřičníky (3) | ✓ | ~ `KRITICKÁ CHYBA:` |
| J7 symboly a barvy | ~ jen červená | ~ barvy ✓, ✓ v klidu chybí | ✗ vlastní paleta | ✓ `TE.UI.COLORS` = kánon |
| J8 co skript našel + proč šedé | ~ řádek ano, důvod ne | ✓ | ~ náhled názvu | ✓ |
| P1 přísné čtení čísel | ~ přísné, ale jiná gramatika (N1) | ✗ živě `parseFloat` | — | ✓ opraveno v 1.1.0 |
| P2 přeskočit jen novější | — | — | ✓ vzor | ✗ jen existence; komentář `export.js:172` slibuje totéž co BRE |
| P3 čistý tah nové cesty | ✓ | ✗ sonda neudělaná | — | ✗ kontrolní pláty, cut cesta |
| P4 registrace podle typu | ✗ `illustrator.js:297` `swatches[1]` | ✓ | — | ✓ |
| P5 hvězdička u všech položek | ✗ `ui.js` refreshModifiedIndicator | ✗ | — | ✓ vzor |
| P6 průběh a Esc | — | — | ✓ vzor | ✗ |
| P7 souhrn, otevřít složku | — | — | ✓ vzor | ✗ |
| P8 proč je Generovat šedé | ✗ | ✓ | — | ✓ |
| P9 složka kontrolovaná v dialogu | — | — | ✓ vzor | ✗ `main.js:147–151` |
| P10 „(chybí)" | — | ✓ vzor | ✗ PDF preset tiše výchozí | ✓ opraveno v 1.1.0 (`selectItem`) |
| P11 výchozí PDF preset | — | — | ✓ `[Kvalitní tisk]` | ✗ první v seznamu |
| P12 měřítko kresby | ✗ (rozhodnuto, že přijde) | ✗ v předvolbě | — | ✓ vzor |
| P13 [Výchozí] z kódu | ✗ jen bez souboru (`main.js:34`) | ✓ | — | ✓ |
| P13 kontrola názvu souboru | — | — | ✗ | ✓ (+ stejné názvy N46) |
| P13 tlačítko Výchozí | ✗ | ✓ | — | ✗ klíč `BTN_DEFAULTS` nepoužitý |
| C12.4c Uložit u [Výchozí] → Uložit jako… | ✓ | ✓ | — | ✗ tlačítko zašedlé (`ui.js:755`) |
| C9 tlačítka předvoleb v nativní šířce | ✗ 92 px | ✗ 92 px | — | ✓ |

Jistota: z kódu; počty textů spočítané skriptem.

## 3. Nové nálezy

### N1 — Dva přísné převody čísel, každý s jinou gramatikou

GM (`GM.Validation.parseNumber`) a ZSM při odeslání
(`ZSM.Utils.validateNumber`) berou text přes `Number()`. TE 1.1.0 má nový
`TE.Utils.parseNumber` s pravidlem `/^[+-]?\d+([.,]\d+)?$/`
(`tile-export/src/lib/utils.js:176–180`). Změřeno na zdrojových funkcích:

| vstup | GM | ZSM odeslání | ZSM živě | TE |
|---|---|---|---|---|
| `2,5`, ` 2,5 `, `+5` | 2,5 / 2,5 / 5 | stejně | stejně | stejně |
| `.5` | 0,5 | 0,5 | 0,5 | neplatné |
| `5.` | 5 | 5 | 5 | neplatné |
| `1e3` | 1000 | 1000 | 1000 | neplatné |
| `0x10` | **16** | **16** | 0 | neplatné |
| `2O`, `1 000`, `20 mm` | neplatné | neplatné | **2 / 1 / 20** | neplatné |

Dopad: `.5` v GM projde, v TE pole zčervená. `0x10` dá v GM a ZSM jiné
číslo, než kdo zamýšlel — přesně to, co kánon (§12.3) zakazuje; jako překlep
je ale nepravděpodobný. Návrh: jedna gramatika pro rodinu, ta z TE — odpovídá
slovům kánonu („desetinná čárka nebo tečka, mezery okolo; cokoli jiného je
neplatné"). Jestli má `.5` projít, je drobné rozhodnutí; dnes ho TE odmítá.
Jistota: změřeno.

### N2 — Kánon uvádí jako vzor převod, který jeho pravidlo porušuje

Skill `extendscript-ui-standards` §12.3: „Reference: grommet-marks
`GM.Validation.parseNumber`". Ten bere `0x10` jako 16 (N1). Vzorem má být
`TE.Utils.parseNumber`. Patří do tohoto vlákna. Jistota: z kódu a změřeno.

### N3 — Uložit s neplatným číslem: jen TE ho zablokuje

TE 1.1.0 zašedí Uložit i Uložit jako…, dokud pole nemá platné číslo
(`ui.js:755`, `numbersOk`). GM ukládá bez kontroly (známá drobnost z jeho
plánu) a ZSM taky (review K17). Uložená předvolba s neplatnou hodnotou se pak
příště otevře rozbitá. Návrh: pravidlo do kánonu §12.4 a převzít v GM a ZSM.
Jistota: z kódu.

### N4 — CHANGELOG TE má anglické nadpisy

`### Added / Changed / Fixed` místo `Přidáno / Změněno / Opraveno`, které má
šablona `templates/CHANGELOG.md` i ostatní tři nástroje. Text pod nadpisy je
česky. Jistota: z kódu.

### N5 — Rozhodnutí z 15. 10. se do TE 1.1.0 nedostala

Vykání (J2) a dvojtečka za popiskem (J6) byla rozhodnutá dva dny před
vydáním a kánon je od té doby ve skillu, přesto vyšla 1.1.0 s 9 tykajícími
texty a 36 popisky bez dvojtečky. Nejde o chybu kódu, ale o proces: kánon
se v konverzaci vydání neuplatnil. Návrh: v rituálu vydání (`releasing-a-tool`)
krok „zkontrolovat §10 checklist standardu" — nebo to v příští verzi TE udělat
vědomě. U dvojteček v TE přeměřit sloupec popisků 150 px. Jistota: z kódu.

### N6 — Desetinná čárka: zadat jde, zpátky se vrací tečka

Ověřeno na otázku uživatele, jestli v TE jde psát desetinná čísla s čárkou.

**Zadání s čárkou funguje ve všech třech nástrojích s čísly.** V TE jde všech
16 číselných polí přes `TE.Utils.parseNumber` (`ui.js:924–959`), který `2,5`
přečte jako 2,5; GM přes `GM.Validation.parseNumber`, ZSM přes
`ZSM.Utils.validateNumber` (a živě `parseFloat` po záměně čárky). Výjimky:
`,5` a `.5` TE odmítne (N1) a pole měřítka v ZSM čte `parseInt`, takže z `2,5`
udělá 2 bez hlášky (`ui.js:315`, review K16).

**Zpátky do pole se ale číslo vrací s tečkou** — při dalším otevření, po
načtení předvolby, po ↺. TE píše `String(v)` (`numText`, `ui.js:975`; první
hodnota v `addRow`), GM přiřazuje číslo přímo (`ui.js:809–843`, totéž po
převodu jednotek) a ZSM `String(...)` (`ui.js:690–719`). Změřeno na funkcích
TE: napsáno `2,5` → uloženo 2.5 → příště v poli `2.5`. Ve stejném dialogu TE
přitom popisek ukáže `1:2,5 jako kresba` (`formatMM` s `l.DECIMAL`). Operátor
tak vidí, že jeho čárka „zmizela", a může mít za to, že čárka nejde.

Každý nástroj má v locale vlastní klíč pro desetinný oddělovač — GM
`DECIMAL_SEP`, TE `DECIMAL`, ZSM a BRE `DEC_SEP` — a používá ho jen v popiscích
a hláškách, ne v polích.

Návrh: rodinné pravidlo „číslo zapsané do pole má desetinný oddělovač jazyka
(česky čárku), bez zaokrouhlení" — čtení bere obojí, takže hodnota oběhne beze
změny. Zaokrouhlovat se nesmí: `formatMM` z TE zaokrouhluje na desetiny
a tloušťku linky 0,25 by změnila na 0,3. Jeden název klíče v locale (`DEC_SEP`,
mají ho dva nástroje ze čtyř). Převod tam i zpět patří do sdíleného modulu
s parserem (§4). Jestli má projít i `,5`, je drobné rozhodnutí; dnes ho TE
odmítá. Jistota: změřeno (TE), z kódu (GM, ZSM).

## 4. Sdílený kód — přehodnocení

Kritérium zůstává „oprav jednou, platí i tam".

| kandidát | 14. 10. | teď | doporučení |
|---|---|---|---|
| obarvení neplatného pole | 2 kopie (GM, ZSM) se stejnou opravou výchozího pera | **3 kopie** — TE `ui.js:1144–1149` se stejnou opravou | sdílet teď: podmínka z původního §6 („až ji převezme TE") je splněná |
| přísný převod čísla | „nesdílet, sjednotit pravidlo" | GM a TE opravily stejnou chybu každý zvlášť a rozešly se (N1); zpětný zápis s tečkou ve všech třech (N6) | sdílet čtení i zápis v jednom modulu: rozchod je přesně to, čemu sdílení brání |
| „(chybí)" v rozbalovacím seznamu | 1 kopie (ZSM) | 2 kopie (ZSM `selectDDL`, TE `selectItem`), obě nejdřív odstraní značku z předchozího volání (v TE oprava jeho N8) | sdílet, až ji převezme BRE pro PDF preset (P10) |
| registrace podle typu | sdílet | beze změny, GM pořád `swatches[1]` | sdílet |
| měřítko kresby v XMP | podle rozhodnutí | rozhodnutí na řadě | §5 |
| obsluha předvoleb, hvězdička | sjednotit chováním | beze změny | převzít řešení TE v GM a ZSM |
| paleta průběhu, náhled barvy | 1 kopie | 1 kopie | beze změny |

## 5. Měřítko kresby — rozhodnutí, které je na řadě

### Co platí dnes (z kódu)

- **Sémantika je v ZSM a TE stejná:** skutečný faktor = `scaleFactor`
  (Large Canvas) × N z měřítka 1:N; N pod 1 se bere jako 1
  (`zund-summa-marks/src/lib/utils.js` `getEffectiveSF`,
  `tile-export/src/lib/utils.js` `getEffectiveSF`, `manualScale`). Sdílený
  `cut_marks.js` ji čte přes `NS.Utils.getEffectiveSF(s)` — jako rodinná
  smlouva tedy už existuje.
- **Liší se uložení a rozsah.** TE čte měřítko z XMP dokumentu při otevření
  (`main.js:61`) a zapíše ho po potvrzeném běhu (`main.js:84`), jmenný prostor
  `…/ns/tile-export/1.0/`, klíč `drawingScale`, jakékoli N > 0. ZSM ho drží
  v předvolbě a v posledním běhu (`ui.js:670`, `:1040`), jen celá čísla 1–10,
  se zaškrtávátkem — a tak přenese 1:10 z minulé zakázky do další 1:1; mírní
  to jen přípona „— 1:10" v titulku.
- **GM** zná jen Large Canvas (`main.js:77–78`). Na kresbě 1:10 vyjde
  velikost značky, odsazení, rozestup i tloušťky desetkrát větší, pokud
  operátor hodnoty nedělí ručně.
- TE 1.1.0 je od dneška venku, dokumenty proto už nesou klíč tile-exportu.

### Varianty

| varianta | co znamená | cena |
|---|---|---|
| A — každý nástroj zvlášť | ZSM a GM si měřítko uloží po svém (vlastní klíč, nebo dál předvolba) | kód XMP včetně opravy N43 by se psal znovu; tentýž dokument v GM a TE by chtěl měřítko zadat dvakrát a mohl dostat dvě různá |
| B — nový rodinný jmenný prostor | čistý název, TE čte i starý klíč | čtení dvou prostorů napořád |
| **C — rodinný klíč = dnešní klíč TE** | URI je neviditelný identifikátor; kód `TE.Doc` pro XMP přesunout do `shared/lib`, GM a ZSM ho použijí | bez migrace; jen název prostoru zní „tile-export" |

### Doporučení: C

- **shared/lib:** čtení a zápis měřítka z `tile-export/src/doc.js`
  (`scalePatterns`, `readDrawingScale`, `writeDrawingScale`,
  `loadDrawingScale`, `saveDrawingScale`) jako sdílený modul se stejným
  klíčem. Sdílet ho má smysl i bez dalších důvodů: oprava N43 je přesně ten
  případ „oprav jednou, platí i tam".
- **TE:** použije sdílený modul, chování beze změny.
- **ZSM:** místo zaškrtávátka pole `Měřítko kresby 1:` (stejný popisek jako
  TE) předvyplněné z dokumentu. Předvolby měřítko nenesou — stejně jako
  `presetValues` v TE. Přípona v titulku může zůstat. Rozsah sladit s TE.
- **GM:** pole 1:N (rozhodnuto 15. 10.), všechny ostatní hodnoty ve skutečné
  velikosti, tedy `unitFactor / (scaleFactor × N)` a tloušťky tahů / N.
  Šedý řádek může měřítko ukázat.
- **Rizika:** dokument uložený jako nová zakázka si měřítko nese dál — je ale
  vidět v každém dialogu a předvyplněné, ne skryté. Dokument bez RDF v XMP
  měřítko neuloží (TE to jen zaloguje). Jestli zápis do XMP jde vrátit přes
  Zpět, změřené není.

### Rozhodnuto 2026-10-17

1. **Varianta C.**
2. GM a TE na stejném pracovním dokumentu běží občas, většinou ne. Rodinný
   klíč tak ušetří zadávání měřítka dvakrát jen někdy; hlavní přínos je jedna
   implementace (s opravou N43), konec pasti v ZSM a měřítko pro GM.
3. **Měřítko smí být desetinné**, v ZSM stejně jako v TE (N > 0) — a desetinná
   čísla se mají psát s čárkou (N6).

## 6. Co dál podle vláken

Změny nástroje patří do jeho vlákna.

- **Toto vlákno:** opravit vzor v kánonu §12.3 (N2) a doplnit zápis čísel
  s čárkou (N6); doplnit do §12.4 pravidlo „Uložit jen s platnými poli" (N3);
  přepsat §12.9 podle rozhodnutí o měřítku;
  se souhlasem sdílené moduly — obarvení pole, převod čísla, registrace
  (a měřítko podle §5); případně krok s checklistem do `releasing-a-tool` (N5).
- **tile-export (1.1.1 / 1.2.0):** J2 vykání (9 textů), J6 dvojtečky
  (36, přeměřit sloupec), J1 Zünd popisky a „orientační značka", J3 věty
  předvoleb a `[Default]` v nápovědách, J5 `ERR_CRITICAL`, `ERR_NO_DOC`,
  `ERR_WRITE_SETTINGS`, Uložit u [Výchozí] (C12.4c), P2, P3, P6, P7, P9, P11,
  N4 nadpisy CHANGELOGu, N6 zápis čísel do polí s čárkou, drift z §7.
- **grommet-marks (další verze, plán je v paměti vlákna):** P4, P5, P8,
  [Výchozí] z kódu, J3, titulek bez „Illustrator", J5, J6 uvozovky
  a vykřičníky, převod čísla na rodinnou gramatiku (N1), Uložit jen
  s platnými poli (N3), N6 zápis čísel s čárkou, tlačítka předvoleb v nativní
  šířce, měřítko 1:N (§5).
- **zund-summa-marks:** P1 živá kontrola (N1), P3 nejdřív sonda, P5, J1, J3,
  J5, J6 (‘…’ → „…", vykřičníky, prefixy), N3, N6, tlačítka předvoleb, P12
  podle §5 včetně desetinného měřítka (dnes `parseInt`).
- **batch-relink-export:** P10 „(chybí)" u PDF presetu, kontrola názvu
  souboru (P13), J6 dvojtečky (6), J1 pojmy, hlavičky modulů z §7.

## 7. Drift dokumentace

Všechny body z §10 původního reportu jsou otevřené:

- `docs/conventions.md:111`: „Jen dva moduly" — moduly jsou tři.
- `shared/lib/ui_state.js:3`: „consumed by grommet-marks and
  zund-summa-marks" — používá ho i TE.
- `batch-relink-export/src/ui.js:3`, `src/config.js:3`: „v3.0.0".
- `zund-summa-marks/src/draw.js:1014`, `tile-export/src/draw.js:116`: „Same
  check as grommet-marks" — GM kontroluje jinak (P4).
- `tile-export/src/export.js:172`: „same crash-recovery behaviour as
  batch-relink-export" — neplatí (P2).
- `tile-export/src/locale.js`: řádků s `\uXXXX` je teď 28 (bylo 25).
- `tile-export/src/main.js:192`: `var … res` dál přepisuje výsledek dialogu.
- `tile-export/src/locale.js` `TIP_SAVE`, `TIP_DEL`: „[Default]".

Nově: N4 (nadpisy CHANGELOGu TE).
