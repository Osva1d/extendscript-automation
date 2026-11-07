# Společný design systém řady nástrojů — návrh (fáze 2)

Datum: 2026-11-07. Stav: **návrh ke schválení, ne kánon.** Do `UI_UX_CANON.md` půjde až
to, co bude implementované a ověřené ve fázích 3 a 4. Navazuje na
[audit z 2026-11-07](../reports/2026-11-07-audit-ux-ui-rady-nastroju.md) a na kánon
ve skillu `extendscript-ui-standards` §12; kódy U… a R… jsou z auditu.

Značky důkazu:

| značka | význam |
|---|---|
| **[M]** | naměřeno 2026-11-07 v Illustratoru 30.8.2, macOS, nezobrazené okno (`tools/ui-probe`) |
| **[D]** | naměřeno dřív, zdroj je `docs/extendscript-engine-facts.md` |
| **[R]** | vzor už běží v uvedeném nástroji |
| **[O]** | čeká na pohled obsluhy ve `shared/tests/probes/specimen_ui.jsx` |
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
| stav | jediná tučná věc v okně | `ScriptUI.newFont(jméno, "BOLD", velikost)` [D] |
| šedý řádek | co skript našel v dokumentu, patička | `enabled = false` [R: GM, ZSM, TE] |

### 2.3 Barvy

Vlastní barvu má jen stav. Text polí a popisků drží barvu Illustratoru, pole se obarví
jen dokud je neplatné [R: `FieldPaint.field`].

Dnešní jedna sada má na světlém UI kontrast 1,91 až 3,77 a na tmavém 2,97 až 5,86 [M].
Návrh má dvě sady podle jasu UI, rozlišuje je `FieldPaint.isDarkUI` [R]:

| stav | symbol | tmavé UI (RGB 0–1) | kontrast na 0,196 / 0,325 | světlé UI (RGB 0–1) | kontrast na 0,72 / 0,94 |
|---|---|---|---|---|---|
| chyba | ✗ | 1,00 0,70 0,68 | 7,49 / 4,50 | 0,52 0,03 0,03 | 5,20 / 9,06 |
| upozornění | ⚠ | 1,00 0,78 0,40 | 8,31 / 4,99 | 0,40 0,23 0,00 | 4,83 / 8,42 |
| v pořádku | ✓ | 0,60 0,88 0,58 | 8,23 / 4,95 | 0,05 0,31 0,09 | 4,90 / 8,55 |

Pozadí 0,196 je změřené [M], 0,94 pochází z `field_paint.js` [D]; 0,325 a 0,72 jsou zatím
předpoklad pro střední jasy a specimen je ukáže [O]. Jestli je světlá červená ještě
čitelná jako chyba, rozhodne oko [O].

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
| `Vybrat…` | nativní, nejvýš 90 px | [R: BRE, TE] |
| znakové tlačítko | 30 px | [R] |
| osa popisků | nejdelší popisek bloku, změřený a zamčený | [R: BTE `axis`] |

### 2.6 Oddělovače a značky

Skupinu tvoří `panel`. Tenká čára je povolená jen uvnitř panelu, pod hlavičkou tabulky
[R: GM]. Značky jsou jen znaky `↺ + − ↑ ↓ ✓ ⚠ ✗`, každá na tlačítku s tipem. Žádné obrázky.

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
| ZSM | 465 × **749 až 932**; SUMMA s 8 řádky chce 959, okno má 932 a tlačítko je z 15 px pod okrajem | dva sloupce, 8 rezervovaných řádků, žádná přestavba | **851 × 634** ve všech stavech [M: maketa] |
| BRE | 460 × 478, stálé | přibude stavový řádek | asi 465 × 500 |
| TE | 1022 × 836, stálé | patička do řady tlačítek, `Po dokončení…` do panelu Soubory | výška asi stejná |
| BTE | 1008 × 768, stálé | stavový řádek a patička podle G7 | výška asi stejná |

---

## 4. Komponenty

Všechny jsou nativní ScriptUI. Sdílená implementace je návrh do §7.

| komponenta | provedení a rozměr | stavy a chování | pravidlo |
|---|---|---|---|
| **Primární tlačítko** | `button`, `{name:"ok"}`, vpravo v řadě | zešedne při neplatném vstupu; Enter na šedém nic nespustí [D] | sloveso říká, co se stane |
| **Storno** | `button`, `{name:"cancel"}`, vlevo od primárního | vždy živé; neukládá nic | vždy `Storno` |
| **Vedlejší akce dialogu** | `button` mezi Storno a primárním [R: TE] | šedne podle své podmínky | jen když je to jiný výsledek téže práce |
| **Vedlejší tlačítko panelu** | `button`, nativní šířka | `…` otevírá další okno | ve skupině zarovnané vpravo, aby nezískalo volné místo [D] |
| **Destruktivní tlačítko** | `button` bez barvy, text `Smazat` | po kliknutí dotaz; šedne, když není co mazat | barva nativního tlačítka nejde [M] |
| **Znakové tlačítko** | `button`, šířka 30, výška nativní | tip je povinný | jen vedle dalšího prvku v řádku |
| **Číselné pole** | popisek na ose, pole 7 znaků, jednotka za polem mezerou 5 | `Numbers.parse/format`, živá kontrola, červený text | jednotka nikdy v popisku |
| **Textové pole** | 24 znaků nebo výplň řádku | živá kontrola, kde má smysl | |
| **Řádek cesty** | popisek, pole 26 znaků s výplní, `Vybrat…` | kontrola při otevřeném dialogu [R: TE] | stejný v BRE i TE |
| **Zaškrtávátko** | text je přímo na něm, začíná na ose polí | klik na text přepíná | žádný popisek s holým zaškrtávátkem |
| **Přepínače** | popisek na ose, do tří krátkých voleb v řádku, jinak sloupec [R: TE] | změna nikdy nehne rozvržením | radio je i volba režimu |
| **Seznam** | `dropdownlist`, výplň řádku nebo změřená šířka | chybějící hodnota `název  (chybí)` [R: ZSM] | |
| **Záložky** | nepoužívají se [O] | | skryly by nastavení; režim je radio a `stack` |
| **Skupina prvků** | `panel` s titulkem | v režimu, kterého se netýká, zešedne celá [N] | bez čísla |
| **Tabulka** | `listbox` s hlavičkou, pevná výška | znovu se staví jen při změně počtu řádků [R: BTE] | |
| **Rámeček podrobností** | víceřádkový `edittext` jen pro čtení, pevná výška [R: TE, BTE] | chyby první, pak upozornění, pak ostatní | |
| **Šedý řádek** | `statictext`, `enabled = false` | beze změny rozměru | co skript našel, ne proč nejde spustit |
| **Stavový řádek** | jeden, přes celou šířku nad patičkou | symbol, barva §2.3, tučně, `truncate` | jediné místo s důvodem šedého tlačítka |
| **Potvrzovací dialog** | nativní `confirm` [O] | Enter a Esc [O] | otázka se slovesem, §5.5 |
| **Chybová hláška** | nativní `alert`, §6.3 | | ne na chybu v poli |
| **Průběh** | `NS.Progress` [R] | zastavení podržením Esc [D] | |
| **Souhrn** | `NS.Summary` [R] | jen tlačítko `Zavřít`; Esc [O] | |

---

## 5. Interakce

### 5.1 Stavy

Hover, active a focus kreslí Illustrator [§8]. Šedý stav je `enabled = false`
a znamená „teď neplatí“; je přednostní před skrytím.

### 5.2 Klávesnice

- Enter spustí primární akci, šedá je nespustí [D].
- Esc zavře dialog jako Storno; běžící dávku zastaví podržením [D].
- Tab jde pořadím vytvoření, takže kód staví prvky v pořadí čtení: levý sloupec, pravý
  sloupec, tlačítka. Tab přes seznamy a přepínače závisí na nastavení macOS [O].
- Ochrana BTE (Enter po úpravě pole přepočítá a teprve druhý spustí) zůstává jako jediná
  výjimka, protože běh musí odpovídat náhledu, který obsluha viděla [R].

### 5.3 Výchozí fokus

Každý dialog fokus nastavuje výslovně, ne náhodou. Pravidlo čeká na test ve specimenu,
kam po otevření padne text [O]. Návrh: první pole, které obsluha v tom nástroji mění
nejčastěji [R: ZSM]. Fokus se nepřesouvá sám po změně stavu ani na neplatné pole, protože
`active = true` může přepsat celý text [D].

### 5.4 Kontrola vstupu

Kontrola běží na každý znak (`onChanging`), jeden převod pro pole i odeslání [R]. Chyba
v poli je červený text pole a věta ve stavovém řádku: jedna chyba říká pole a rozsah, víc
chyb jejich počet [R: ZSM]. Žádný `alert` během editace. Cesty a složky stejně [R: TE], BRE
přechází ze série `alert` [N].

### 5.5 Potvrzení

| situace | potvrzení |
|---|---|
| smazat předvolbu, přepsat předvolbu | ano [R] |
| přepsat soubory | ano, jen když běh opravdu přepíše aspoň jeden soubor; s počtem; výchozí Přepsat [N, rozhodnuto Q5] |
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
- `Výchozí` mimo seznam má jen ZSM. Návrh: **odebrat**, protože `[Výchozí]` je v seznamu
  a funkce tím nezmizí.
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

Anglické závorky v ZSM (`Auto-fit`, `Fixed`, `Top`, `Bottom`, `Feed`) se odstraní, pokud
obsluha ty termíny nepoužívá. `PDF preset`, `artboard` a názvy nástrojů zůstávají.

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

| funkce | nahrazuje |
|---|---|
| `presetPanel(parent, handlers)` | `pPreset`, `setPanel` v GM, ZSM, TE, BTE |
| `footerRow(window, buttons)` | čtyři podoby patičky a řady tlačítek |
| `statusLine(parent)`, `setStatus(line, kind, text)` | `stReason`, `placeReason`, `stStatus` |
| `numberRow`, `pathRow`, `checkRow`, `radioRow` | `addRow`, `_addFileRow`, `addRadioRow` |
| `lockW`, `axis` | tři kopie `lockW` |
| `TIGHT` | `LAYOUT`, `M.SP_*` |

Barvy zůstávají ve `FieldPaint`, který dostane sady podle jasu. Rozsah a pořadí zavádění
upřesní plán fáze 3.

---

## 8. Co ScriptUI umí a neumí

| požadavek zadání | zjištění | rozhodnutí |
|---|---|---|
| barva pozadí tlačítka | `backgroundColor` vyhodí chybu [M] | nepoužívat |
| barva a tučnost textu tlačítka | zápis projde bez chyby [M], účinek [O] | nepoužívat, ať už funguje, nebo ne: primární tlačítko odliší Illustrator |
| hover | posluchače `mouseover` jdou připojit [M], ale nativní prvek by se musel kreslit sám | nepoužívat |
| poloměr rohů, stíny | žádná vlastnost; jen vlastní kreslení | nepoužívat |
| záložky | `tabbedpanel` jde vytvořit [M], vzhled [O] | nepoužívat |
| velikost písma | `newFont` vrátí velikost 14 [M], účinek [O] | nepoužívat |
| vlastní kreslený prvek | `onDraw` funguje na `iconbutton` [R: vzorek barvy ZSM] | jen pro náhled barvy |

Vlastní kreslení by vzalo nativní výchozí tlačítko, fokus a přizpůsobení jasu UI a přineslo
víc kódu bez přínosu pro práci obsluhy.

---

## 9. Ověření návrhu

Specimen (`shared/tests/probes/specimen_ui.jsx`) ukazuje komponenty a maketu ZSM. Změřené
bez zobrazení: maketa má ve všech třech stavech 851 × 634 px a žádný popisek není užší než
svůj text [M]. **Vzhled zatím nikdo neviděl.**

Čeká na pohled obsluhy:

- stavové barvy ve všech jasech UI a čitelnost světlé červené;
- účinek červeného pera a tučnosti na nativním tlačítku, `Bold` proti `BOLD`;
- vzhled `tabbedpanel`;
- kam po otevření padne text; Tab přes seznamy a přepínače;
- Esc v okně jen se `Zavřít`; popisky a Enter v nativním `confirm`;
- maketa ZSM: je rozložení ve dvou sloupcích pro denní práci lepší než dnešní okno?
