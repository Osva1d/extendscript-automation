# Společný design systém řady nástrojů — návrh (fáze 2)

Datum: 2026-11-07. Stav: **návrh ke schválení, ne kánon.** Vzhled prošel pohledem obsluhy
ve specimenu ve všech čtyřech jasech UI (§9). Do `UI_UX_CANON.md` půjde až to, co bude
implementované a ověřené ve fázích 3 a 4. Navazuje na
[audit z 2026-11-07](../reports/2026-11-07-audit-ux-ui-rady-nastroju.md) a na kánon
ve skillu `extendscript-ui-standards` §12; kódy U… a R… jsou z auditu.

Značky důkazu:

| značka | význam |
|---|---|
| **[M]** | naměřeno 2026-11-07 v Illustratoru 30.8.2, macOS, nezobrazené okno (`tools/ui-probe`) |
| **[D]** | naměřeno dřív, zdroj je `docs/extendscript-engine-facts.md` |
| **[R]** | vzor už běží v uvedeném nástroji |
| **[V]** | viděla obsluha 2026-11-07 ve `shared/tests/probes/specimen_ui.jsx`, snímky obrazovky ve čtyřech jasech |
| **[O]** | ještě čeká na pohled nebo zkoušku obsluhy |
| **[N]** | návrh, který zatím nikde neběží |

---

## 1. Zásady

Sedm zásad, které rozhodují spory mezi pravidly níž:

1. **Geometrie je stálá.** Okno má od otevření do zavření jednu velikost a primární
   tlačítko jedno místo.
2. **Co neplatí, zešedne.** Skrývá se jen uvnitř rezervované plochy, nikdy tak, aby se
   pohnulo cokoli jiného.
3. **Vzhled dodává Illustrator.** Nativní prvky bez vlastního kreslení. Jednotnost dávají
   rozměry, pořadí, texty a stavy.
4. **Stav stojí u tlačítka.** Důvod, proč nejde spustit, je přímo nad tlačítkem, kterého
   se týká.
5. **Enter je hlavní akce, Esc je Storno.** V každém dialogu.
6. **Dotaz jen tehdy, když hrozí ztráta.** Nikdy na vratnou akci a nikdy preventivně.
7. **Stejná věc se jmenuje stejně** a jedno slovo znamená jednu věc.

---

## 2. Vizuální identita

### 2.1 Co vlastní Illustrator

Poloměr rohů, stíny, přechody, barva tlačítek a stavy hover, active a focus kreslí
Illustrator. Nepřekreslují se. Měřený důvod a meze jsou v §8.

### 2.2 Písmo

Písmo okna je Lucida Grande 11 [M]. Název ani velikost se nenastavují.

| úroveň | použití | provedení |
|---|---|---|
| titulek okna | `<Název> v<verze>`, beze změny za běhu | nativní |
| titulek panelu | podstatné jméno, bez dvojtečky a bez čísla | nativní |
| text | popisky, hodnoty, tlačítka, tipy | nativní |
| stav | symbol a barva podle §2.3 | bez tučného písma: `"BOLD"` ani `"Bold"` se nezobrazí [V] |
| šedý řádek | patička a pomocný text, bez kterého se dá pracovat | `enabled = false` [R: GM, ZSM, TE] |

Šedý řádek je na tmavých jasech čitelný, na 0,726 a 0,941 slabý [V]. Co skript našel
v dokumentu (výběr, rozměr, počet), proto patří do běžného textu [N]; dnes je šedě v GM,
ZSM a TE.

### 2.3 Barvy

Vlastní barvu má jen stav. Text polí a popisků drží barvu Illustratoru, pole se obarví
jen dokud je neplatné [R: `FieldPaint.field`].

Pozadí motivu ve čtyřech jasech je 0,196, 0,326, 0,726 a 0,941 [V, čte ho specimen].
Dnešní jedna sada na nich má kontrast 1,12 až 5,87: upozornění na 0,726 má 1,12 a na
snímku skoro mizí, na 0,941 je slabé [V]. Návrh má dvě sady podle jasu UI, rozlišuje je
`FieldPaint.isDarkUI` [R]:

| stav | symbol | tmavé UI (RGB 0–1) | kontrast na 0,196 / 0,326 | světlé UI (RGB 0–1) | kontrast na 0,726 / 0,941 |
|---|---|---|---|---|---|
| chyba | ✗ | 1,00 0,71 0,69 | 7,63 / 4,57 | 0,52 0,03 0,03 | 5,29 / 9,09 |
| upozornění | ⚠ | 1,00 0,78 0,40 | 8,31 / 4,97 | 0,40 0,23 0,00 | 4,91 / 8,44 |
| v pořádku | ✓ | 0,60 0,88 0,58 | 8,24 / 4,93 | 0,05 0,31 0,09 | 4,99 / 8,57 |

Všechny tři barvy obou sad jsou na snímcích čitelné ve všech čtyřech jasech a hranice
světlá a tmavá sada (průměr pozadí 0,5) padla správně [V]. Chyba na tmavém UI je proti
specimenu (1,00 0,70 0,68, kontrast 4,48 na 0,326) o setinu světlejší, aby držela 4,5;
okem rozdíl není poznat. Jestli světle červená na tmavém působí jako chyba, obsluha
nekomentovala [O].

### 2.4 Rozestupy

Nativní hodnoty plus jedna těsná mezera. Dva nástroje na nich už běží [R: TE, BTE] a kód
je nemusí nastavovat.

| kde | hodnota | v kódu |
|---|---|---|
| okraj okna | 15 [M] | nenastavuje se |
| mezi panely v okně | 15 [M] | nenastavuje se |
| mezi panely ve sloupci | 10 [M] | nenastavuje se |
| okraj panelu | 15, 10, 15, 10 [M] | nenastavuje se |
| mezi řádky a prvky | 10 [M] | nenastavuje se |
| těsně: pole a jednotka, přepínač a jeho pole | 5 [N] | `TIGHT` ve sdíleném kitu |

Odhad z dnešních panelů: GM klesne přibližně o 50 px, BRE zůstane přibližně stejné. Ověří
to měření po změně, nic z toho není změřené.

### 2.5 Rozměry prvků

Výšky jsou nativní [M] a nenastavují se: tlačítko 27, pole a seznam 23, zaškrtávátko
a přepínač 19, text 15.

| prvek | šířka | stav |
|---|---|---|
| číselné pole | 7 znaků, 72 px [M] | [R: TE, BTE] |
| krátký počet | 4 znaky, 48 px [M] | [N], jen tam, kde 7 znaků rozbije řádek hrany v GM |
| cesta | 26 znaků, 224 px [M], bere volné místo řádku | [R: TE] |
| textové pole | 24 znaků | [R: BTE] |
| běžné tlačítko | nativní, nejméně 80 px [M] | [R] |
| `Vybrat…` | nativní, zarovnané vpravo, nejvýš 90 px; řádek končí na hraně textového pole | [M: 80 px, sonda kitu 2026-11-07; BRE a TE dnes končí o 2 až 14 px dřív] |
| znakové tlačítko | 30 px | [R] |
| osa popisků | nejdelší popisek bloku, změřený a zamčený; panely pod sebou v jednom sloupci sdílejí jednu osu | [R: BTE `axis`]; jedna osa [N]: dvě osy po panelech (110 a 105 px) posunuly pole o 5 px [M: sonda kitu] |

### 2.6 Oddělovače a značky

Skupinu tvoří `panel`. Tenká čára je povolená jen uvnitř panelu, pod hlavičkou tabulky
[R: GM]. Značky jsou jen znaky `↺ + − ↑ ↓ ✓ ⚠ ✗`, každá na tlačítku s tipem. Žádné obrázky.
Tlačítko zamčené na 30 px je kruh; `↺` se v něm kreslí menší než ostatní znaky [V], tip je
proto u něj nutný.

---

## 3. Geometrie oken

**G1.** Po otevření nikdo nezapisuje `w.size`, nevolá vynucené zmenšení a okno se
nezavírá kvůli přestavbě.

**G2.** Výška nejvýš 850 px. Nad 932 px (obrazovka 982 minus 50) Illustrator okno ořízne
[M], a co přesahuje, je pod okrajem. Hranice 850 odpovídá malému displeji s lištou a
Dockem [D: komentáře TE a BTE].

**G3.** Dvě třídy: jeden sloupec (asi 465 px) a dva sloupce (asi 850 až 1025 px). Šířka se
nenastavuje, plyne z obsahu.

**G4.** Varianty obsahu jdou do `stack`, který drží výšku nejvyšší varianty. Hodnota, která
v daném stavu neplatí, zešedne. `maximumSize.height = 0`, `remove()` a skrývání mimo
`stack` se v dialogu nepoužívají.

**G5.** Proměnný počet řádků: pevný počet rezervovaných řádků [M: maketa], nebo seznam
a editor [R: BTE]. Plné pole se přidá tlačítkem, které na mezi zešedne.

**G6.** Text proměnné délky: první rozvržení proběhne s nejdelším možným textem [D, R: TE],
na stavovém řádku `truncate: "end"`, podrobnosti v rámečku.

**G7.** Pořadí shora: panely v pořadí práce, stavový řádek, jedna řada s patičkou vlevo
a tlačítky vpravo [R: BRE]. Řada tlačítek nese jen tlačítka; volby patří do panelu.

Dnešní a cílový stav. Dnešní čísla jsou změřená [M], cílová pro GM, BRE a TE jsou
odvozená a změří se po změně.

| nástroj | dnes | změna | cíl |
|---|---|---|---|
| GM | 465 × **678 až 804**, primární y 631 až 757 | Hrany a Cesta v `stack`, zrcadlený řádek zešedne | jedna výška, nejvýš 804 |
| ZSM | 465 × **749 až 932**; SUMMA s 8 řádky chce 959, okno má 932 a tlačítko je z 15 px pod okrajem | dva sloupce, **nejvýš 5 vrstev** (`MAX_LAYERS` z 8 na 5, rozhodnuto 2026-11-07), 5 rezervovaných řádků, žádná přestavba | **851 × 545** ve všech stavech [M: maketa 2026-11-07; 851 × 634 při 8 řádcích M] |

Výšku makety s 8 řádky určoval pravý sloupec: řádek vrstvy má 37 px (tlačítko `−` 27
a mezera 10) a pravý sloupec byl o 89 px vyšší než levý. Při 5 řádcích je o 22 px nižší,
výšku tedy určuje levý sloupec a oba končí skoro stejně. Šířka zůstane, drží ji osa popisků
170 a přepínače zdroje. Maketa ve specimenu 1.0.1 s 5 řádky naměřena 2026-11-07: 851 × 545
ve všech stavech, levý sloupec končí na 458 px, pravý na 436 px, primární tlačítko stojí
na y 503 [M].
| BRE | 460 × 478, stálé | přibude stavový řádek | asi 465 × 500 |
| TE | 1022 × 836, stálé | patička do řady tlačítek, `Po dokončení…` do panelu Soubory | výška asi stejná |
| BTE | 1008 × 768, stálé | stavový řádek a patička podle G7 | výška asi stejná |

---

## 4. Komponenty

Všechny jsou nativní ScriptUI. Sdílená implementace je návrh do §7.

| komponenta | provedení a rozměr | stavy a chování | pravidlo |
|---|---|---|---|
| **Primární tlačítko** | `button`, `{name:"ok"}`, vpravo v řadě; od ostatních ho odliší jen silnější nativní obrys [V] | zešedne při neplatném vstupu; Enter na šedém nic nespustí [D] | sloveso říká, co se stane |
| **Storno** | `button`, `{name:"cancel"}`, vlevo od primárního | vždy živé; neukládá nic | vždy `Storno` |
| **Vedlejší akce dialogu** | `button` mezi Storno a primárním [R: TE] | šedne podle své podmínky | jen když je to jiný výsledek téže práce |
| **Vedlejší tlačítko panelu** | `button`, nativní šířka | `…` otevírá další okno | ve skupině zarovnané vpravo, aby nezískalo volné místo [D] |
| **Destruktivní tlačítko** | `button` bez barvy, text `Smazat` | po kliknutí dotaz; šedne, když není co mazat | pozadí vyhodí chybu [M], pero a písmo se neprojeví [V] |
| **Znakové tlačítko** | `button`, šířka 30, výška nativní | tip je povinný | jen vedle dalšího prvku v řádku |
| **Číselné pole** | popisek na ose, pole 7 znaků, jednotka za polem mezerou 5 | `Numbers.parse/format`, živá kontrola, červený text | jednotka nikdy v popisku |
| **Textové pole** | 24 znaků nebo výplň řádku | živá kontrola, kde má smysl | |
| **Řádek cesty** | popisek, pole 26 znaků s výplní, `Vybrat…` zarovnané vpravo [M] | kontrola při otevřeném dialogu [R: TE] | stejný v BRE i TE |
| **Zaškrtávátko** | text je přímo na něm, začíná na ose polí | klik na text přepíná | žádný popisek s holým zaškrtávátkem |
| **Přepínače** | popisek na ose, do tří krátkých voleb v řádku, jinak sloupec [R: TE] | změna nikdy nehne rozvržením | radio je i volba režimu |
| **Seznam** | `dropdownlist`, výplň řádku nebo změřená šířka | chybějící hodnota `název  (chybí)` [R: ZSM] | |
| **Záložky** | nepoužívají se | `tabbedpanel` vypadá nativně, ale Tab ho přeskočí [V] | skryly by nastavení; režim je radio a `stack` |
| **Skupina prvků** | `panel` s titulkem | v režimu, kterého se netýká, zešedne celá [N] | bez čísla |
| **Tabulka** | `listbox` s hlavičkou, pevná výška | znovu se staví jen při změně počtu řádků [R: BTE] | |
| **Rámeček podrobností** | víceřádkový `edittext` jen pro čtení, pevná výška [R: TE, BTE] | chyby první, pak upozornění, pak ostatní | |
| **Šedý řádek** | `statictext`, `enabled = false` | beze změny rozměru | patička a pomocný text, §2.2 |
| **Stavový řádek** | jeden, přes celou šířku nad patičkou | symbol a barva §2.3, `truncate` | jediné místo s důvodem šedého tlačítka |
| **Potvrzovací dialog** | nativní `confirm`: tlačítka `Ne` a `Ano`, výchozí `Ano` [V] | Enter [O] | otázka, na kterou `Ano` znamená akci, §5.5 |
| **Chybová hláška** | nativní `alert`, §6.3 | | ne na chybu v poli |
| **Průběh** | `NS.Progress` [R] | zastavení podržením Esc [D] | |
| **Souhrn** | `NS.Summary` [R] | jen tlačítko `Zavřít`; okno s jediným tlačítkem zavře Esc i Enter [V] | |

---

## 5. Interakce

### 5.1 Stavy

Hover, active a focus kreslí Illustrator [§8]. Šedý stav je `enabled = false`
a znamená „teď neplatí“; je přednostní před skrytím.

### 5.2 Klávesnice

- Enter spustí primární akci, šedá je nespustí [D].
- Esc zavře dialog jako Storno; běžící dávku zastaví podržením [D].
- Tab jde pořadím vytvoření, takže kód staví prvky v pořadí čtení: levý sloupec, pravý
  sloupec, tlačítka. Zastaví se i na seznamu, záložky přeskočí a mezi panely chce jedno
  stisknutí navíc [V]. Jiné pořadí ScriptUI nastavit neumí, proto na Tabu žádné pravidlo
  nestojí: klávesnice v dialogu znamená psát čísla, Enter a Esc.
- Ochrana BTE (Enter po úpravě pole přepočítá a teprve druhý spustí) zůstává jako jediná
  výjimka, protože běh musí odpovídat náhledu, který obsluha viděla [R].

### 5.3 Výchozí fokus

Bez `active` nemá po otevření fokus nic a psaní nikam nepadne [V]. Každý dialog proto
fokus nastaví výslovně na pole, které obsluha v tom nástroji mění nejčastěji. ZSM to dělá
(`inp.active = true` na mezeru od grafiky) [R]; jestli psaní po otevření ZSM opravdu padne
do toho pole, zbývá vyzkoušet [O]. Fokus se nepřesouvá sám po změně stavu ani na neplatné
pole, protože `active = true` může přepsat celý text [D].

### 5.4 Kontrola vstupu

Kontrola běží na každý znak (`onChanging`), jeden převod pro pole i odeslání [R]. Chyba
v poli je červený text pole a věta ve stavovém řádku: jedna chyba říká pole a rozsah, víc
chyb jejich počet [R: ZSM]. Žádný `alert` během editace. Cesty a složky stejně [R: TE], BRE
přechází ze série `alert` [N].

### 5.5 Potvrzení

| situace | potvrzení |
|---|---|
| smazat předvolbu, přepsat předvolbu | ano [R] |
| přepsat soubory | ano, jen když běh opravdu přepíše aspoň jeden soubor; s počtem; výchozí `Ano` = přepsat, `Ne` = zpět do dialogu bez zápisu [N, rozhodnuto Q5; tlačítka `confirm` V] |
| zavřít neuloženou šablonu v BRE | ano [R] |
| kreslení do dokumentu, vratné přes Cmd+Z | ne |

### 5.6 Konec běhu

| běh | co obsluha dostane |
|---|---|
| zapisuje soubory nebo mění texty (BRE, TE export, BTE) | `NS.Summary` |
| kreslí do dokumentu (GM, ZSM, TE Jen pláty) | nic, když není co říct; jinak jeden `alert` na konci |

### 5.7 Pamatování nastavení

- `[Last Settings]` se zapisuje jen primární akcí. Storno nezanechá nic, ani po přepnutí
  režimu (U12).
- Předvolby podle kánonu §12.4 [R]. Stejné ovládání ve všech nástrojích s předvolbami:
  popisek `Předvolba:`, seznam, ↺, pak `Uložit`, `Uložit jako…`, `Smazat`.
- `Výchozí` mimo seznam má jen ZSM. **Odebrat** (potvrdila obsluha 2026-11-07), protože
  `[Výchozí]` je v seznamu a funkce tím nezmizí.
- BRE si bude pamatovat i `Přeskočit hotové výstupy`, jako TE. Zdrojová složka se dál
  nepamatuje, mění se s dávkou.

---

## 6. Terminologie a texty

### 6.1 Slovník

Jeden pojem, jeden význam. Vedle rozhodnutí z kánonu §12.8:

| pojem | význam | nahrazuje |
|---|---|---|
| **Náhled** | co se stane, před během; panel | TE `Výsledek` |
| **Výsledek** | co se stalo, po běhu; okno Souhrn | |
| **Kontrola souborů** | okno před dávkou v BRE | `Náhled zpracování` |
| **Příklad názvu:** | ukázka jednoho názvu souboru | BRE `Náhled názvu:`, `Vzor výstupu:` |
| **Cílová složka:** | kam se ukládá | BRE `Výstup:` |
| **Vzor pojmenování:** | vzor názvu | BRE `Vzor:` |
| **výstup** | soubor, který běh vyrobí | jiné významy níž |
| **Způsob ořezu:** | Ruční ořez, Zünd | TE `Výstup:`, panel `Typ výstupu` |
| **Režim a zdroj** | panel v ZSM | `Nastavení výstupu` |
| **Zünd**, **Summa** | značky strojů | `ZUND`, `SUMMA` |
| **Role** | panel v ZSM | `Nastavení role (Feed)` |
| **Jen…** | omezení volby | `Pouze…` |
| **Mezera** | vzdálenost mezi hranami dvou věcí | |
| **Odsazení** | vzdálenost středu od okraje (GM) | |
| **Mezera k orientační značce:** | tip říká „mezi okraji značek“ | `Odsazení orientační značky:` |
| **Strana značky:** | Summa, čtverec | `Velikost Summa:` |
| **Nejde…** | nemožnost ve stavu i v hlášce | `Nelze…` |
| **běh** | spuštění nástroje | `dávka` v hláškách o nastavení |

Anglické závorky v ZSM (`Auto-fit`, `Fixed`, `Top`, `Bottom`, `Feed`) se odstraní.
`PDF preset`, `artboard` a názvy nástrojů zůstávají. Tohle i nové popisky BRE
`Cílová složka:` a `Vzor pojmenování:`, které ruší rozhodnutí z 2026-10-28 o krátkých
popiscích, potvrdila obsluha 2026-11-07.

### 6.2 Tvar textů

| místo | tvar | příklad |
|---|---|---|
| tlačítko | infinitiv, název výsledku | `Generovat`, `Uložit jako…` |
| popisek pole | podstatné jméno s dvojtečkou | `Mezera od okraje:` |
| titulek panelu | podstatné jméno bez dvojtečky | `Značky a mezery` |
| tip | 3. osoba, co prvek udělá | `Uloží hodnoty z dialogu jako novou předvolbu.` |
| stav | co se dá, nebo proč ne | `✗ Nejde spustit: 2 chyby, viz níže.` |
| chyba, rada | co je špatně, co udělat, vykání | `Vyberte cílovou složku.` |
| souhrn | příčestí s dvojtečkou a počtem | `Exportováno: 6` |

### 6.3 Šablony hlášek

| situace | šablona | prefix |
|---|---|---|
| pole | `%s: zadejte číslo od %s do %s.` | žádný, stavový řádek |
| chybí předpoklad, běh nezačal | `Co chybí. Co udělat.` | `CHYBA:` |
| běh skončil s výhradou | `Co se stalo. Co zkontrolovat.` | `UPOZORNĚNÍ:` |
| neplatná odpověď v dialogu předvoleb | texty kánonu §12.4 | žádný |
| neočekávaná chyba | `ERR_CRITICAL` z kánonu §12.2 [R] | žádný |
| nastavení se neuložilo | `Nastavení se nepodařilo uložit — příště se dialog otevře bez něj.` a při běhu `Běh pokračuje.` | žádný |
| předvolba se neuložila | `Předvolbu se nepodařilo uložit — příště se dialog otevře bez této změny.` | žádný |
| přepis souborů | `V cílové složce už je: %s. Přepsat?` s počtem přes `NS.L.count` | žádný, otázka |

---

## 7. Sdílená implementace

`shared/lib/ui_kit.js`, factory `buildUiKit(NS)`, jako ostatní moduly v `shared/lib`.
Splňuje kritérium z `docs/decisions.md`: panel předvoleb je dnes čtyřikrát a rozešel se.

| funkce | nahrazuje | stav |
|---|---|---|
| `footerRow(window, version, buttons)` | čtyři podoby patičky a řady tlačítek | krok 1 |
| `statusLine(parent, text)`, `setStatus(line, kind, text)` | `stReason`, `placeReason`, `stStatus` | krok 1 |
| `numberRow`, `textRow`, `pathRow`, `listRow`, `radioRow`, `checkRow` | `addRow`, `_addFileRow`, `addRadioRow` a řádky psané ručně | krok 1 |
| `selectItem`, `listValue` | `selectItem` v TE, ruční `(chybí)` v BRE a ZSM | krok 1 |
| `existingCount`, `confirmOverwrite` | nic, dotaz před přepisem chybí (U5) | krok 1 |
| `lockW`, `axis` | tři kopie `lockW`, `axis` v BTE | krok 1 |
| `TIGHT` a šířky z §2.5 | `LAYOUT`, `M.SP_*`, `M.BROWSE_*` | krok 1 |
| `presetPanel(parent, handlers)` | `pPreset`, `setPanel` v GM, ZSM, TE, BTE | krok 3, s GM |

Řádky vracejí `{row, label, …}`; popisky bloku srovná `axis` až po sestavení, jako v BTE.
Texty dodává nástroj, kit žádné nemá kromě patičky. Mezery a výšky kit nezapisuje, jen
`TIGHT` mezi polem a jednotkou a šířky z §2.5; hlídá to test.

Panel předvoleb přijde s prvním uživatelem, GM (krok 3). Čtyři nástroje ukládají předvolby
čtyřmi způsoby a rozhraní navržené bez uživatele by se v kroku 3 psalo znovu.

Barvy zůstávají ve `FieldPaint`: nová funkce `status(ctrl, kind)` bere sadu podle jasu
(`PALETTES`), kde jas přečíst nejde, dnešní `COLORS`. `field()` a `text()` se nemění.

---

## 8. Co ScriptUI umí a neumí

| požadavek zadání | zjištění | rozhodnutí |
|---|---|---|
| barva pozadí tlačítka | `backgroundColor` vyhodí chybu [M] | nepoužívat |
| barva a tučnost textu tlačítka | zápis projde bez chyby [M], na tlačítku se neprojeví [V] | nepoužívat: primární tlačítko odliší Illustrator obrysem |
| tučný text | `"BOLD"` ani `"Bold"` se na `statictext` nezobrazí [V] | nepoužívat; zdůraznění nese symbol a barva |
| hover | posluchače `mouseover` jdou připojit [M], ale nativní prvek by se musel kreslit sám | nepoužívat |
| poloměr rohů, stíny | žádná vlastnost; jen vlastní kreslení | nepoužívat |
| záložky | `tabbedpanel` jde vytvořit [M], vypadá nativně a přepíná, Tab ho přeskočí [V] | nepoužívat |
| velikost písma | `newFont` vrátí velikost 14 [M], účinek neověřen | nepoužívat, ověřovat není proč |
| vlastní kreslený prvek | `onDraw` funguje na `iconbutton` [R: vzorek barvy ZSM] | jen pro náhled barvy |

Vlastní kreslení by vzalo nativní výchozí tlačítko, fokus a přizpůsobení jasu UI a přineslo
víc kódu bez přínosu pro práci obsluhy.

---

## 9. Ověření návrhu

Specimen (`shared/tests/probes/specimen_ui.jsx`) ukazuje komponenty a maketu ZSM. Změřené
bez zobrazení: maketa má ve všech třech stavech 851 × 634 px a žádný popisek není užší než
svůj text [M].

Obsluha ho 2026-11-07 spustila ve všech čtyřech jasech UI a poslala snímky [V]. Výsledek:

| otázka | odpověď | dopad na návrh |
|---|---|---|
| stavové barvy | dnešní upozornění na světlých jasech skoro mizí; obě navržené sady čitelné všude | sady podle jasu platí, §2.3 |
| pero a tučnost na tlačítku | bez účinku | §8, primární odliší obrys |
| `Bold` proti `BOLD` | ani jedno nezobrazí tučně | stav bez tučného písma, §2.2 |
| šedý řádek | na světlých jasech slabý | jen patička a pomocný text, §2.2 |
| `tabbedpanel` | nativní, Tab ho přeskočí | dál nepoužívat |
| fokus po otevření | bez `active` nikde | fokus výslovně, §5.3 |
| Tab | i na seznam, mezi panely stisknutí navíc | na Tabu nic nestojí, §5.2 |
| okno jen se `Zavřít` | Esc i Enter ho zavřou | souhrn s jedním tlačítkem stačí |
| `confirm` | `Ne` a `Ano`, výchozí `Ano` | otázka, na kterou `Ano` znamená akci |
| maketa ZSM | obsluze nic nechybí | dva sloupce platí; nejvýš 5 vrstev, §3 |

Maketa 1.0.0 neměla napojené `Jen značky`; skutečné ZSM při něm tabulku vrstev zešedí [R:
`applyMarksOnlyState`]. Specimen 1.0.1 to dělá také a stav ukazuje bez tučného písma.

Zbývá [O]: jestli psaní po otevření ZSM padne do pole mezery, jestli Enter v `confirm`
potvrdí `Ano` a jestli světle červená na tmavém UI působí jako chyba.

---

## 10. Plán fáze 3 (schváleno 2026-11-07)

Pravidla průběhu podle rozhodnutí Q3 a Q6 z auditu:

- Každý krok má vlastní větev a worktree, ruční test a vydání. Další nástroj začne až po
  vydání předchozího.
- Úpravy nástrojů začnou po vydání TE 1.3.0, ZSM 1.3.0 a BTE 1.1.0. Kroky 0 a 1 na nich
  nezávisí, protože žádný nástroj nemění.
- Mění se jen to, co pomůže v běžném dni (R1 až R4, R6, R7). TE a BTE se jen napojí na
  sdílené části, nepřestavují se.
- Výpočty a výrobní logika zůstanou. Funkce se bez souhlasu neodebírají; odebrání `Výchozí`
  v ZSM a snížení na 5 vrstev souhlas mají.

| krok | větev | co | řeší | proč v tomhle pořadí |
|---|---|---|---|---|
| 0 | `docs/family-ux-audit` do main | audit, tento návrh, `tools/ui-probe`, specimen | | vlákna ZSM a TE mají návrh číst ze svého worktree |
| 1 | `feat/shared-ui-kit` | `shared/lib/ui_kit.js` podle §7 bez panelu předvoleb; sady barev podle jasu ve `FieldPaint` jako nová funkce, dnešní `COLORS` zůstane, dokud ho nástroje používají; společný dotaz před přepisem; Node testy; měření řádků v Illustratoru | U29, U14 | bez konzumenta se v žádném nástroji nic nezmění, jako sdílené moduly 2026-10-17 |
| 2 | BRE 1.3.0 | dotaz před přepisem; živá kontrola místo série `alert`; stavový řádek a šedé Spustit; `Cílová složka:`, `Vzor pojmenování:`, `Kontrola souborů`; pamatovat Přeskočit; patička a tlačítka v jedné řadě | U5, U7, U13, U17, U23, U24 | ztráta dat je nejhorší nález; nejmenší okno bez předvoleb ověří první polovinu kitu (patička, stav, řádek cesty) |
| 3 | GM 1.5.0 | Hrany a Cesta v `stack`, zrcadlený řádek zešedne; stav nad tlačítky; `presetPanel` do kitu a z něj předvolby, číselné řádky z kitu; co skript našel běžným textem; tipy předvoleb | U1, U6, U15, U26 | denně používaný nástroj s poskakujícím Generovat; ověří druhou polovinu kitu (předvolby, číselné řádky, `stack`) |
| 4 | ZSM 1.4.0 | dva sloupce, nejvýš 5 vrstev, okno bez přestavby, bez `Výchozí`, české termíny, výchozí fokus | U2, U3, U16, U18, U27; U12, pokud ho vlákno ZSM neopraví dřív | největší přestavba přijde, až je kit ověřený na dvou nástrojích |
| 5 | TE 1.4.0 | jen napojení: předvolby, stav a patička z kitu, barvy; dotaz před přepisem; `Náhled`, `Způsob ořezu:`; `Po dokončení…` do panelu Soubory | U5, U13, U17, U24 | rozvržení TE je stálé, mění se málo |
| 6 | BTE 1.2.0 | jen napojení: předvolby, stav nad tlačítky, patička, barvy; ochrana Enteru zůstává | U6, U14 | totéž |

V každém kroku navíc: tučné písmo pryč (U21), hlášky polí podle §6.3 (U25, U28) a úklid
dokumentace toho nástroje, README a CHANGELOG (R8, U20, U30, U31). Rozestupy se mění jen
tam, kde se okno staví z kitu (R5).

Mimo plán vědomě: U4 (ochrana Enteru v BTE je zdůvodněná výjimka), U8 (šířka Souhrnu podle
cesty je záměr z 2026-10-27), U9 (jen pokud v kroku 5 vyjde levně), U11 (fokus se na
neplatné pole nepřesouvá, §5.3).

Dvě věci, které pořadí nechává otevřené:

- TE přepisuje soubory bez dotazu až do kroku 5. Společný dotaz z kroku 1 může vlákno TE
  převzít dřív; je to samostatná malá změna.
- Vydané ZSM 1.2.0 má u Summy s 8 vrstvami Generovat pod okrajem okna. Snížení
  `MAX_LAYERS` na 5 to odstraní i bez přestavby; patří to do vlákna ZSM. V kroku 4 je navíc
  třeba rozhodnout, co s předvolbou, která má víc než 5 řádků (na tomto Macu má nejvíc 2).

Hotovo je krok, když:

1. `npm run verify` ve worktree a `npm run lint` v kořeni projdou.
2. `tools/ui-probe` projde všechny stavy okna: jedna velikost, primární tlačítko na místě,
   žádný popisek užší než text, výška nejvýš 850 px.
3. Obsluha pošle snímky okna v tmavém a světlém jasu a projde běžnou zakázku.
4. Zpráva ke kroku řekne, co se změnilo a proč, které problémy zmizely a co je ověřené
   čtením kódu, co měřením a co okem obsluhy.
5. Vydání podle `releasing-a-tool`.

Po kroku 6 přijde fáze 5 (`UI_UX_CANON.md` jen z ověřeného) a fáze 6
(`UI_UX_VIOLATIONS.md`, `UI_UX_REVIEW_CHECKLIST.md`). Skill `extendscript-ui-standards`
se pak zkrátí na odkaz a to, co potřebuje generování kódu (Q2).
