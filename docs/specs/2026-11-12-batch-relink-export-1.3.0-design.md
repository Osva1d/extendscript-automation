# Návrh — batch-relink-export 1.3.0: krok 2 plánu řady

Nástroj: `batch-relink-export`, namespace `BRE`.
Navazuje na [design systém řady](2026-11-07-ui-design-system.md) (dál jen „DS“), jeho
plán fáze 3 v §10, krok 2, a na [audit UX/UI](../reports/2026-11-07-audit-ux-ui-rady-nastroju.md).

Datum: 2026-11-12 · Stav: **návrh ke schválení**

Značky důkazu podle DS: [M] změřeno, [D] `docs/extendscript-engine-facts.md`, [R] běží
v uvedeném nástroji, [N] návrh, [O] čeká na obsluhu.

---

## 1. Proč

BRE je nejklidnější okno řady, ale jako jediné nekontroluje vstup živě. Spustit je pořád
aktivní a každé kliknutí ukáže jeden `alert` z deseti, takže další chybu obsluha zjistí
až při dalším pokusu (U7). Výchozí běh přepíše hotové výstupy bez dotazu (U5). Šablona
se zdvojenou nebo chybějící stranou projde u plných archů bez varování, protože sonda
stran běží jen u neúplného archu (`batch-relink-export/src/core.js:251`).

Krok 2 je první nástroj, který se staví ze sdíleného kitu (`shared/lib/ui_kit.js`).
Ověří jeho první polovinu: patičku, stavový řádek a řádek cesty.

## 2. Rozsah

Z plánu řady (DS §10, krok 2):

1. dotaz před přepisem (U5),
2. živá kontrola místo série `alert`, stavový řádek a šedé Spustit (U7),
3. termíny `Cílová složka:`, `Vzor pojmenování:`, `Příklad názvu:`, `Kontrola souborů`
   (U17, U24),
4. pamatovat `Přeskočit hotové výstupy`,
5. patička a tlačítka v jedné řadě z kitu, panely bez čísel (U23),
6. bez tučného písma (U21), hlášky podle DS §6.3 (U25, U28), úklid dokumentace
   (R8, U20, U30, U31).

Navíc tři úpravy, které obsluha schválila 2026-11-07:

7. `Použít aktivní dokument` pod polem šablony,
8. stavba a mapa stran šablony v Kontrole souborů a v Souhrnu,
9. neúplný poslední arch dávku nezastaví.

Výrobní logika zůstává: relink, odebírání pozic navíc, ověření relinku, blokace souboru
s víc stranami než pozic, přeskakování hotových výstupů. Mění se dialog, texty, kdy se
ukáže Kontrola souborů a co ukáže.

## 3. Hlavní dialog

### 3.1 Rozvržení

```
Batch Relink Export v1.3.0
┌ Soubory ───────────────────────────────────────────────┐
│ Šablona (.ai):     [/…/vizitky.ai              ] [Vybrat…] │
│                    [Použít aktivní dokument]               │
│ Zdrojová složka:   [                           ] [Vybrat…] │
│ Cílová složka:     [/…/export                  ] [Vybrat…] │
│                    [ ] Přeskočit hotové výstupy            │
│                    [✓] Po dokončení otevřít cílovou složku │
└────────────────────────────────────────────────────────┘
┌ Pojmenování a formát ──────────────────────────────────┐
│ Vzor pojmenování:  [{n}_{template}_{source}             ] │
│                    {n} pořadí · {template} šablona · {source} zdroj │
│ Příklad názvu:     01_vizitky_zdroj.pdf                   │
│ PDF preset:        [[Kvalitní tisk]                    ▾] │
└────────────────────────────────────────────────────────┘
✗ Vyberte zdrojovou složku.
© 2025–2026 Ladislav Osvald · v1.3.0          [Storno] [Spustit]
```

- Řádky jsou z kitu: `pathRow`, `textRow`, `listRow`, `checkRow`, `statusLine`,
  `footerRow`. Oba panely sdílejí jednu osu popisků (`UiKit.axis`, DS §2.5).
- `Použít aktivní dokument` stojí na ose polí, v řádku s prázdným popiskem, jako
  zaškrtávátko v `checkRow`.
- Panel `Možnosti` zaniká. Obě zaškrtávátka se týkají cílové složky, proto jdou pod ni
  do panelu `Soubory` (TE je v kroku 5 přesune tamtéž, DS §10). **Otázka 1.**
- Rozestupy a okraje jsou nativní (DS §2.4); vlastní `M.DIALOG_*`, `M.PANEL_*`
  a `M.BUTTON_SPACING` zmizí.
- Příklad názvu je obyčejný text, bez tučného písma; dlouhý název se zkrátí uprostřed.
- Výchozí fokus má pole `Zdrojová složka:`, protože jediné se mění s každou zakázkou
  a cesta zkopírovaná ve Finderu se tam hned vloží (DS §5.3) [O].

Odhad velikosti: asi 490 × 500 px. Proti 460 × 478 dnes přibude řádek s tlačítkem
a stavový řádek a ubude jeden panel. Rozhodne měření `tools/ui-probe`.

### 3.2 Popisky a texty

| dnes | 1.3.0 | proč |
|---|---|---|
| `1 · Vstupní soubory` | `Soubory` | bez čísel (U23); panel drží i cílovou složku |
| `2 · Pojmenování a formát` | `Pojmenování a formát` | bez čísel |
| `Možnosti` | zaniká | zaškrtávátka jdou do `Soubory` |
| `Zdroj (PDF):` | `Zdrojová složka:` | dvojice s `Cílová složka:`; hlášky už říkají „zdrojovou složku“. **Otázka 3.** |
| `Výstup:` | `Cílová složka:` | DS §6.1, U24 |
| `Vzor:` | `Vzor pojmenování:` | DS §6.1 |
| `Náhled názvu:` | `Příklad názvu:` | DS §6.1, U17 |
| `Náhled zpracování` | `Kontrola souborů` | DS §6.1, U17 |
| `Vzor výstupu:` v Kontrole | `Příklad názvu:` | DS §6.1 |

Tipy zůstávají věcně stejné, upraví se do tvaru DS §6.2 (3. osoba, co prvek udělá).

### 3.3 Živá kontrola

Kontrola běží na každý znak a po každém výběru tlačítkem `Vybrat…` (výběr nevyvolá
`onChanging`, DS §7, `pathRow`). Neplatné pole má červený text (`FieldPaint.field`).
Spustit je šedé, dokud platí aspoň jedna chyba. Stavový řádek říká první chybu
v pořadí čtení; když jich je víc, připojí `Další chyby: %s.` Enter na šedém tlačítku
nic nespustí [D].

| pole | chyba ✗ | upozornění ⚠ |
|---|---|---|
| šablona | `Vyberte šablonu.` · `Šablona se nenašla nebo nemá příponu .ai.` | `Šablona je otevřená s neuloženými změnami. Běh ji zavře a použije verzi na disku.` |
| zdrojová složka | `Vyberte zdrojovou složku.` · `Zdrojová složka neexistuje.` · `Ve zdrojové složce nejsou žádné PDF.` | |
| cílová složka | `Vyberte cílovou složku.` · `Cílová složka je stejná jako zdrojová. Další běh by výstupy načetl jako zdroje — vyberte jinou.` | `Cílová složka neexistuje, běh ji vytvoří.` **Otázka 2.** |
| vzor | `Vzor pojmenování musí obsahovat {n}, jinak by se výstupy přepisovaly.` | |
| preset | `Vyberte PDF preset.` · `PDF preset „%s“ v tomto Illustratoru není. Vyberte jiný.` | |

Bez chyby a upozornění řekne stavový řádek, kolik PDF dávka zpracuje:
`✓ Ve zdrojové složce je 12 PDF.` **Otázka 4.** PDF se počítají stejně jako dnes při
spuštění: soubory `*.pdf` v kořeni složky bez skrytých a `._` souborů. Výpis složky
proběhne jen při změně zdrojové cesty, ne při psaní do jiných polí.

Kontrolu počítá čistá funkce `BRE.UI.validate(stav)`, která dostane texty polí a zjištěná
fakta (existuje, je `.ai`, počet PDF, preset chybí, šablona otevřená a neuložená)
a vrátí seznam chyb a upozornění. Fakta čte tenká vrstva nad `File` a `Folder`.
Tím jde kontrolu testovat v Node.

Ze `alert` zbude jen to, co běh zastaví až po dialogu: šablonu nejde otevřít, šablona nemá
pozice a neočekávaná chyba (§6).

### 3.4 Použít aktivní dokument

- Bez otevřeného dokumentu je tlačítko šedé. Dialog je modální, počet dokumentů se
  za jeho běhu nezmění.
- Uložený dokument `.ai` vyplní pole šablony a spustí kontrolu. Má-li neuložené změny,
  ukáže kontrola upozornění z §3.3.
- Dokument, který ještě nikdy nebyl uložený: `✗ Aktivní dokument ještě není uložený.
  Uložte ho jako .ai a zkuste to znovu.` Pole se nezmění.
- Dokument jiného typu, třeba otevřené PDF: `✗ Aktivní dokument není šablona .ai.`
  Pole se nezmění.

Pozice se dál počítají ze souboru na disku, protože z něj se staví každý arch.

### 3.5 Dotaz před přepisem

Po kliknutí na Spustit a před otevřením šablony spočítá `UiKit.existingCount`
výstupy, které běh opravdu zapíše a které v cílové složce už jsou. Výstup, který
`Přeskočit hotové výstupy` nechá být (je novější než zdroj i šablona), se nepočítá.
Když je aspoň jeden, zeptá se `UiKit.confirmOverwrite`:

`V cílové složce už je: 3 soubory. Přepsat?` — `Ano` (výchozí) přepíše, `Ne` vrátí
dialog beze změny.

Soubory, které později zablokuje Kontrola souborů (víc stran než pozic), se počítají
také: v té chvíli ještě nejsou známé a zeptat se jednou navíc je levnější než přepsat
bez dotazu (DS §7, `existingCount`).

### 3.6 Co si dialog pamatuje

Jako dnes šablonu, cílovou složku, vzor, preset a `Po dokončení otevřít cílovou složku`,
nově i `Přeskočit hotové výstupy` (DS §5.7). Výchozí stav Přeskočit zůstává vypnutý.
Zdrojová složka se nepamatuje, mění se se zakázkou. Zapisuje se jen po Spustit.

## 4. Šablona: stavba a mapa stran

### 4.1 Co se zjistí

Dnešní `countSavedPositions` nahradí `inspectTemplate`. Otevře šablonu tak, jak je
uložená na disku, a vrátí:

- počet pozic (`getPositions`, beze změny definice),
- počet pozic na každém kreslicím plátně podle středu pozice; pozice mimo všechna plátna
  se počítají zvlášť,
- formát strany, kterou pozice čekají: rozměr boxu umístěné strany (`_pageSize`), tedy
  totéž, co porovnává `verifyRelink`; když se pozice liší, všechny rozměry,
- mapu stran: kterou stranu PDF ukazuje každá pozice, sondou `_positionPages`, která
  dnes běží jen u neúplného archu.

Šablona otevřená v Illustratoru se nikdy neměří na místě, protože sonda přelinkuje
pozice. Měří se dočasná kopie souboru (dnes jen u neuložené šablony). Zavírá se bez
uložení a kopie se smaže.

### 4.2 Výsledek mapy

| mapa | stav | text |
|---|---|---|
| strany 1 až n, každá jednou | ✓ | `Pozice ukazují strany 1–8, každou jednou.` |
| jiná | ⚠ | `Pozice neukazují strany 1–8 každou jednou: strana 1 třikrát, chybí 2 a 3.` |
| sondu nešlo napsat nebo přečíst | ⚠ | `Strany pozic se nepodařilo zjistit.` |

Nesoulad je upozornění, ne blokace. Šablona, která na všech pozicích opakuje stranu 1,
je platná. **Otázka 5.**

### 4.3 Kdy se ukáže Kontrola souborů

Dnes se Kontrola ukáže při jakékoli odchylce, tedy i u neúplného posledního archu, který
má skoro každá zakázka. V 1.3.0 se ukáže, když platí aspoň jedno:

- soubor s méně stranami uprostřed dávky (`under`),
- soubor s víc stranami než pozic (`over`, blokovaný),
- soubor s nečitelným počtem stran,
- mapa stran šablony není ✓.

Neúplný poslední arch (`partial`) sám Kontrolu nevyvolá. Kratší soubor uprostřed dávky
ji vyvolá dál, protože bývá chybou dělení.

### 4.4 Kontrola souborů

```
Kontrola souborů
⚠ Zpracovat jde 12 z 12 archů, 2 s upozorněním. Blokováno: 0.
Šablona: vizitky · 8 pozic na 2 kreslicích plátnech (4 + 4) · strana 90 × 50 mm
⚠ Pozice neukazují strany 1–8 každou jednou: strana 1 dvakrát, chybí 5.
Zdrojových PDF: 12 · Příklad názvu: 01_vizitky_a.pdf
Počet stran proti 8 pozicím:
   ✓ V pořádku (plný arch): 10
   ⚠ Neúplný poslední arch: 1
   ⚠ Méně stran uprostřed dávky: 1
┌ Podrobnosti ─────────────────────────────┐
│ …                                         │
└───────────────────────────────────────────┘
                                   [Storno] [Pokračovat]
```

- Verdikt je stavový řádek z kitu (`statusLine`, `setStatus`): ✗ když nejde zpracovat nic,
  ⚠ při jakékoli odchylce, jinak ✓. Bez tučného písma.
- Řádky počtů barví `FieldPaint.status` podle jasu UI místo dnešního `FieldPaint.text`
  (U14).
- Neúplný poslední arch se v řádcích počtů ukazuje dál, když se Kontrola ukáže z jiného
  důvodu.
- Když mapa stran není ✓ a dávka má neúplný arch, řekne podrobnost, že pozice navíc se
  neodeberou a arch bude potřebovat ruční úpravu. To je dnešní chování (`WARN_PAGE_MAP`),
  jen ho obsluha uvidí před během, ne až v Souhrnu.

### 4.5 Souhrn

- První řádek (`intro` ve `Summary.show`) je stavba šablony ve stejném tvaru jako
  v Kontrole: `Šablona: vizitky · 8 pozic na 2 kreslicích plátnech (4 + 4) · strana 90 × 50 mm`.
- Upozornění mapy stran jde do podrobností.
- Počet odebraných pozic říká dnešní řádek `Odebrané pozice:`. Neúplný poslední arch
  tak nepřidá do podrobností nic a Souhrn běžné zakázky dál končí `Vše proběhlo bez chyb.`

## 5. Uložení a průběh běhu

Pořadí po Spustit:

1. dialog: živá kontrola, dotaz před přepisem, případně vytvoření cílové složky,
2. uložení nastavení,
3. otevřená šablona s neuloženými změnami: dnešní dotaz `WARN_TEMPLATE_OPEN` zůstává,
   protože běh ji zavře a změny zahodí (DS §5.5),
4. `inspectTemplate`, sken zdrojů,
5. Kontrola souborů podle §4.3,
6. průběh, zpracování a Souhrn beze změny logiky.

## 6. Hlášky

Podle DS §6.3:

| situace | dnes | 1.3.0 |
|---|---|---|
| chyba v poli | `alert` | stavový řádek, §3.3 |
| šablonu nejde otevřít | `alert` bez prefixu | `CHYBA: Šablonu se nepodařilo otevřít. …` |
| šablona nemá pozice | `alert` bez prefixu | `CHYBA: V šabloně nejsou propojené pozice. Umístěte do ní vícestránkové PDF.` |
| cílovou složku nejde vytvořit | `alert` | stavový řádek ✗, dialog zůstane otevřený |
| nastavení se neuložilo | vlastní text | `Nastavení se nepodařilo uložit — příště se dialog otevře bez něj. Běh pokračuje.` |
| neočekávaná chyba | `ERR_CRITICAL` | beze změny |

Odejdou klíče, které nic nepoužívá: `TITLE` (U31) a chybové klíče nahrazené
stavovým řádkem. Každý nový klíč je v `en` i `cs`.

## 7. Kód

| soubor | změna |
|---|---|
| `tools/build.sh` | přidá `../shared/lib/ui_kit.js` a `buildUiKit(BRE);` za `field_paint.js` |
| `src/ui.js` | hlavní dialog z kitu, `validate`, fakta, `Použít aktivní dokument`, dotaz před přepisem; Kontrola souborů podle §4.4; `_addFileRow` a většina `M` zmizí |
| `src/core.js` | `inspectTemplate` místo `countSavedPositions`; čisté funkce `describePageMap`, `positionsPerArtboard`, `outputPaths` |
| `src/main.js` | pořadí z §5, Kontrola podle §4.3, `intro` do Souhrnu |
| `src/storage.js` | klíč `skip` |
| `src/locale.js` | texty z §3 a §6, oba jazyky |
| `src/config.js`, `package.json` | verze 1.3.0 |
| `tests/` | nové: Node testy čistých funkcí a parita locale; `npm test`, `npm run verify` |
| `README.md`, `CHANGELOG.md`, `docs/manual-test.md` | dialog, Kontrola, nové body ručního testu |
| `tools/ui-probe/scenarios/batch-relink-export.js` | stavy okna z §8 |

Kit se nemění. Kdyby ho BRE potřeboval změnit, je to samostatný commit v `shared/`
s vlastním testem.

## 8. Ověření

Podle „Hotovo je krok, když“ v DS §10:

1. **Node:** `npm run verify` v `batch-relink-export/` (nové testy: `validate`,
   `describePageMap`, `positionsPerArtboard`, `outputPaths`, výchozí hodnoty a klíč
   `skip` ve `Storage`, parita locale a tvary `_1/_2/_5`), `npm run lint` v kořeni,
   `tools/typecheck.sh` na nové funkce.
2. **Sondy v Illustratoru**, každá se souhlasem, při prázdném Illustratoru a ne souběžně
   s jiným vláknem:
   - `tools/ui-probe` projde stavy okna: prázdné, platné, s chybou, s upozorněním,
     se šedým `Použít aktivní dokument`. Jedna velikost, Spustit na místě, žádný popisek
     užší než text, výška nejvýš 850 px;
   - `inspectTemplate` na syntetické šabloně: mapa 1..n, zdvojená strana, chybějící
     strana, dvě plátna, pozice mimo plátno; šablona otevřená a uložená i otevřená
     s neuloženými změnami, a pokaždé zůstane dokument obsluhy beze změny.
3. **Obsluha:** snímky okna v tmavém a světlém jasu, ruční test podle `docs/manual-test.md`
   a jedna běžná zakázka.
4. **Zpráva ke kroku:** co se změnilo a proč, které nálezy auditu zmizely a co je ověřené
   čtením kódu, co měřením a co okem obsluhy.
5. Vydání podle `releasing-a-tool`.

## 9. Otevřené otázky

1. **Zaškrtávátka pod cílovou složku a panel `Možnosti` zrušit?** Doporučuji ano. Obě
   volby se týkají cílové složky, okno ušetří jeden panel a vyrovná výšku nového řádku
   s tlačítkem. Stejně je v kroku 5 uspořádá TE.
2. **Neexistující cílová složka: upozornění místo dotazu?** Doporučuji ano. Dnes se
   po Spustit ptá `Cílová složka neexistuje. Vytvořit?`. Vytvoření složky nic nezničí
   (DS §1, zásada 6) a překlep v cestě odhalí žlutý řádek ještě před Spustit.
3. **`Zdroj (PDF):` → `Zdrojová složka:`?** Doporučuji ano: dvojice s `Cílová složka:`
   a hlášky už to slovo používají. Plán to výslovně neschválil.
4. **Stavový řádek v pořádku s počtem PDF?** Doporučuji ano: špatně vybranou složku
   prozradí počet dřív, než běh začne.
5. **Opakuje se v provozu jedna strana na víc pozicích (step and repeat)?** Pokud ano, BRE
   s takovou šablonou dnes neumí počítat: soubory s jednou stranou označí jako kratší
   a každý arch pošle k ruční úpravě. V 1.3.0 to Kontrola aspoň řekne předem (⚠ mapy).
   Počítat strany na arch z mapy místo z počtu pozic by byla změna výrobní logiky,
   proto mimo tento krok. Pokud se to v provozu nedělá, otázka odpadá.

## 10. Mimo rozsah

Zamítnuté 2026-11-07 (DS §10): dělení vícestránkového PDF, jedno velké okno se živou
kontrolou zdrojů, montáž jednostránkových PDF, pojmenované předvolby zakázek, volba
ořezu PDF, počet archů na tlačítku Spustit. Dál: kontrola znaků ve vzoru pojmenování,
změna kitu bez potřeby BRE, přestavba Průběhu.
