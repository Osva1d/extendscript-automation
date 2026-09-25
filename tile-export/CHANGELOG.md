# Changelog

Všechny podstatné změny tohoto nástroje.
Formát podle [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/),
verzování podle [SemVer](https://semver.org/lang/cs/).

## [1.1.0] — 2026-09-13

### Added

- **Zünd režim** — registrační značky na každém plátu a ořezová data plátu.
  **V dialogu je zatím skrytý** (`TE.Config.ZUND_ENABLED`), protože neposlouží
  plátované zakázce — viz poznámky níž. Kód je hotový a otestovaný; další
  etapa na něm staví.
- Ořezová kontura se hledá podle **přímé barvy**, nezávisle na vrstvě.
- Kontura se ořezává **odečtením zakrývajícího rámu** — toutéž operací, jakou
  se to dělá rukama. Compound path si přitom zachová díry, na rozdíl od průniku.
- Geometrie značek je sdílená se `zund-summa-marks` (`shared/lib/cut_marks.js`),
  takže chyba v pozici značky je chyba na jednom místě, ne na dvou.
- Pláty, do kterých kontura nezasahuje, se hlásí v souhrnu.
- **Barva značek je vlastní nastavení**, oddělené od barvy kontury — značka
  v barvě řezu by na stroji od řezu nešla rozeznat. Výchozí je registrační,
  na výběr jsou přímé barvy dokumentu (typicky bílá `Spot 1` na černý a čirý
  materiál s čirým linerem). Neznámá barva spadne na registrační a nikdy se
  nevytvoří sama.
- **Umístění jednostranného přelepu jde zvolit.** Dřív ho vždy nesl plát před
  švem (levý, u svislého dělení horní). Rešerše ukázala, že jednotná konvence
  neexistuje — směr se řídí pořadím lepení, a to se u tiskového PSV
  a u tapet liší. Volba je teď třetí možnost v řádku „Umístění přelepu";
  výchozí zůstává původní chování a starší předvolby ho podědí.
- **Přepínač „Rovnoměrně — stejné tiskové pláty".** Mění, co má vyjít stejné:
  místo stejných čistých šířek stejné tiskové, tedy včetně přelepu a přídavků
  (`W = (délka + přídavky + (n−1) × přelep) / n`). Platí pro oba číselné
  režimy a liší se jen tím, odkud se bere *n*: u počtu plátů srovná pláty,
  které sis vyžádal, u šířky plátu přečte šířku jako **strop tiskové šířky**
  — šířku role — a vezme nejmenší počet stejných plátů, které se pod něj
  vejdou (`n = ceil((délka + přídavky − přelep) / (strop − přelep))`).
  Vypnuto platí původní chování obou režimů. Dialog o řádek vyšší, 825 px.

### Changed

- **Režim „počet plátů" dělí grafiku, ne materiál.** Během vývoje 1.1.0 byl
  načas přepnutý na stejné **tiskové** šířky
  (`W = (délka + přídavky + (n−1) × přelep) / n`) a je zpátky na tom, co dělal
  v 1.0.0: švy na přesných zlomcích čistého formátu, pláty stejně široké
  **načisto**. Pět plátů z 5000 mm tedy znamená švy na 1000/2000/3000/4000
  a pět plátů po 1000 mm, přelep je materiál navíc. Přelep ani přídavky švem
  nehnou. Stejné tiskové pláty dá od této verze přepínač Rovnoměrně, u počtu
  plátů i u šířky plátu.
- Dialog přerovnán do vyváženějších sloupců (Přelep a přídavky vlevo) a pole
  Výsledku zkráceno na 85 px. Se zapnutým Zünd režimem měří 796 px, bez něj
  stejně — viz poznámka níž.
- `TE.Export.exportTile()` vrací `{file, contourPaths}` místo `File`.
- **Červená linka leží středem na hraně plátu a výchozí tloušťka je 1 pt.**
  Dřív byla cesta posunutá o půl tahu dovnitř, aby vnější okraj tahu padl
  přesně na okraj stránky — s nulovou rezervou, takže zlomek bodu ztracený
  v prohlížeči, RIPu nebo při ořezu linku uřízl nebo vedle ní nechal bílou
  škvíru; v prohlížeči byla vidět jen na dvou hranách. Teď leží cesta přesně
  na hraně a tah je dvojnásobný: vnější polovinu ořízne okraj stránky, uvnitř
  zůstane zadaná tloušťka a hrana stránky do tahu padne vždycky. Pole
  Tloušťka dál znamená, co je vidět v tisku, takže starší předvolby tisknou
  stejně; panel Tah ukazuje dvojnásobek. Výchozí 1 pt místo 0,3 pt, které se
  ukázalo jako příliš slabé. Návrh uživatele z přetestu.

### Fixed

- **Export v 1:1 u velkých zakázek už nepadá.** Do dočasného dokumentu každého
  plátu se vkládá celá grafika a její velikost se nastavovala přes `.width`,
  který Illustrator nad 16 347,7 pt (≈ 5,77 m) odmítne. Každá zeď širší nebo
  vyšší než ~5,77 m i se spadávkou tak v 1:1 spadla na `Specified value greater
  than maximum allowed value` — i když se každý plát vešel. Teď `resize()`, který
  takový strop nemá (změřeno do 70 m).
- **„Stejné jako dokument" znamená, co ukazují pravítka.** U Large Canvasu to
  dřív mířilo na jeho vnitřní desetinové souřadnice, které nikdo nevidí a které
  nejde vyexportovat, a končilo chybou s radou „použij 1:1", která často vedla do
  další chyby. Large Canvas teď v „Stejné jako dokument" vyjde ve skutečné
  velikosti, s ručním 1:10 jako náhled 1:10. Hláška o Large Canvasu zmizela.
- **Linka u Large Canvasu vycházela desetkrát tlustší.** Tloušťka se počítala
  z měřítka *aktivního* dokumentu, a tím je při exportu dočasný, nikdy Large
  Canvas. 0,3 pt tak vyšlo jako 3 pt; dřív se to neprojevilo jen proto, že export
  z Large Canvasu vždycky spadl dřív. Export už aktivní dokument nečte vůbec.
- **Hláška „plát se nevejde do artboardu" říká co a o kolik** — číslo plátu,
  jeho rozměr při zvoleném měřítku výstupu a strop. Dřív nešlo poznat, jestli
  pomůže víc plátů. Validace i export navíc počítají měřítko výstupu jedním
  pravidlem; dřív měl každý svou kopii.

- **Vypnutá linka už nezakládá prázdnou vrstvu.** Vrstva `TE_lines` se
  zakládala při každém běhu, i když se linka nekreslila. Teď existuje právě
  tehdy, když jsou v ní linky: běh bez linky smaže linky z předchozího běhu
  a vezme s sebou i vrstvu. Nikdy ale nesmaže vrstvu, ve které je něco cizího
  (podvrstva), ani poslední vrstvu dokumentu.

- **Souhrn i chybové hlášky ukazují desetiny milimetru.** Všechna čísla v poli
  Výsledek šla přes `Math.round`, tedy na celé milimetry. Dokud se 3000 dělilo
  na tisíce, nevadilo to; s Rovnoměrně vyjdou pláty na 1026,67 mm a dialog
  ukázal 1027 — třikrát 1027 je 3081 mm materiálu, ne 3080. Hlášky navíc
  citovaly číslo, které nikdo nezadal: `Přelep (1001 mm)` u zadaných 1000,5.
  Teď jedna desetina s čárkou (v angličtině s tečkou) a celá čísla bez „,0".

- **Desetinná čárka v dialogu se tiše zahazovala.** Každé číselné pole se četlo
  přes `Number()`, které `0,3` nepřečte, a náhradní hodnota pak nastoupila bez
  jediného slova. U tloušťky linky to byl **1 pt** (i po uložení do předvolby),
  hůř u přelepu a přídavků: **12,5 mm přelepu se změnilo na nulu** a přídavek
  2,5 na „načisto" — rovnou do tiskových dat. Nástroj přitom parser s čárkou
  měl a měl ho otestovaný; dialog ho jen obcházel. Všech 15 polí teď jde přes
  `TE.Utils.toNumber`, test hlídá i zdroják, aby se holé `Number()` nevrátilo,
  a náhradní tloušťka linky je 0,3 pt jako výchozí hodnota, ne 1 pt.

- **Nápověda u „šířka plátu" slibovala strop, který nedržel.** Stálo tam
  „Největší šířka plátu", jenže to platilo jen o čisté šířce — tištěný plát
  vyjde až o přelep širší (zadáno 1200, vytištěno 1220). Kdo tam psal šířku
  role, dostával pláty o přelep přes. Text teď říká obojí a odkazuje na
  Rovnoměrně, které ten strop drží doopravdy.

- **Souhrn v poli Výsledek už nic nezamlčí.** Bylo to `statictext` s pevnou
  výškou 85 px, do kterého se psal libovolně dlouhý text — u pěti plátů se
  zobrazily pláty 1–3 a beze stopy zmizely pláty 4 a 5, řádek s dostupným
  spadem **a všechna varování i chyby**. Tlačítko Vytvořit a exportovat tak
  mohlo zůstat šedé bez jediného vysvětlení. Pole je teď `edittext`
  (readonly, se scrollováním) a chyby s varováními se vypisují **nahoře**,
  nad geometrií. Text jde navíc označit a zkopírovat do zakázkového listu.

- **Dialog po otevření přepínal dvě uložená nastavení.** Uložená „Šířka plátu"
  se otevřela jako „Vodítka" a „Půl na každou stranu" jako „Celý na levý"; kdo
  si toho nevšiml, další běh uložil špatnou hodnotu. Příčina je v enginu:
  ExtendScript vyhodnocuje řetězený ternární operátor zleva
  (`a ? x : b ? y : z` jako `(a ? x : b) ? y : z`), Node podle specifikace —
  proto to testy neviděly. Obě místa jsou přepsaná a vlastní pravidlo lintu
  `engine/no-bare-nested-ternary` hlásí každý vnořený ternár bez závorek.

- **Předvolba dává najevo neuložené změny.** Jakmile se hodnoty v dialogu liší
  od uložené předvolby, dostane v seznamu hvězdičku; **↺** vrátí uložené
  hodnoty a **Uložit** zapíše nové (u [Default] neaktivní). Po otevření seznam
  ukazuje aktivní předvolbu a hvězdičkou přizná, když poslední běh jel s jinými
  hodnotami — dřív tvrdil „[Default]" nad hodnotami, které výchozí nebyly.

- **Uložení a smazání předvolby se zapisuje hned.** Předvolba uložená
  v dialogu se dřív ztratila, když se dialog zavřel Stornem — na disk šla až
  s dokončeným během. Oba sourozenecké nástroje ukládají hned. Storno dál
  zahazuje jen úpravy polí.

- Tlačítko Zrušit se česky jmenuje **Storno**, jako ve standardu dialogů
  a v ostatních nástrojích.

- **Hlášky říkají, co je špatně.** Nulová nebo nesmyslná šířka plátu hlásila
  „Pozice švů musí růst…", tedy chybu, kterou nikdo nezadal; teď má vlastní
  text, a strop tiskové šířky pod přelepem (s Rovnoměrně) taky. Chyba přídavku
  dávala do české věty anglický název hrany („Přídavek left"); teď „Přídavek
  vlevo (60 mm) překračuje přesah grafiky (50 mm)."

- **Souhrnná hlášení sedí na jakékoli číslo.** „Vytvořeno %s plátů" je česky
  správně jen od pěti výš; hlášení teď mají tvar „Počet vytvořených plátů: 3".
  Opakované Jen pláty navíc řekne, že předchozí pláty nahradilo — dřív to
  vypadalo, že přibyly další.

- **Nápovědy, které lhaly.** Linka prý leží po obvodu čistého formátu (leží po
  tiskovém), tloušťka neříkala, že jde o tloušťku v tisku, počet plátů odkazoval
  na už neexistující „rozpuštění zbytku", PDF preset sliboval prázdnou volbu,
  kterou seznam nemá, a tlačítko Jen pláty mělo nápovědu o lince místo o tom,
  co dělá.

- **Rastrový export schovával linku pod obraz.** Před rastrováním se všechny
  objekty sbíraly do skupiny smyčkou přes kolekci, kterou ta smyčka sama
  měnila; linka ze skupiny vypadla a neprůhledný rastr ji zakryl. Teď se
  rastruje jen grafika a linka zůstane navrchu jako vektor, ostrá.

- **Chyba „plát se nevejde do artboardu" už neblokuje Jen pláty.** Týká se
  měřítka výstupu, tedy jen exportu; Jen pláty kreslí v měřítku dokumentu.
  Šedne jen Vytvořit a exportovat.

### Added (během přetestu)

- **Výsledek ukazuje velikost stránek PDF** — „Stránky PDF (1:10): 101 × 100 |
  102 × 100 | 101 × 100 mm", nebo že jsou ve skutečné velikosti. Řádky plátů
  jsou ve skutečných milimetrech a měřítko výstupu s nimi nehne, takže se volba
  dřív projevila až po exportu. Nápověda k měřítku výstupu říká, že se týká jen
  exportu.
- **Výsledek je v pravém sloupci** a zabere volné místo pod Exportem: asi
  patnáct řádků místo pěti, dialog o 130 px nižší (695 px).

### Notes

- **V Zünd režimu je MediaBox plátu větší než plát sám.** Značky leží vně
  plátu — při odstupu 10 mm a značce 5 mm sahají 42,5 pt za každou hranu —
  a stránka musí vyrůst, aby se do ní vešly.
- Dělení kontury stojí na `executeMenuCommand`, takže **není pod Node testy**.
  Ověřuje se sondami s vizuální kontrolou. Proti v1 je to vědomé oslabení.
- Skrývání Zünd panelu dialog **nezmenší** — ScriptUI drží místo i pro
  neviditelnou skupinu. Výšku řeší rozložení sloupců, ne viditelnost.
- Víc řezacích vrstev najednou (proříz, ryl, děrování) tato verze neumí.
- **Zünd režim je v dialogu skrytý a nepokryje plátovanou zakázku.** Na
  rozděleném plátu pokračuje motiv přes šev, takže na té straně není kam
  umístit značky. Odsazená cesta jako maska, která motiv ukončí, je potřeba
  i pro rovný ořez. Panel se vrátí přepnutím `ZUND_ENABLED` v `src/config.js`,
  až bude maska hotová.
- **Pláty jsou obdélníkové a výstup je jeden PDF na plát.** Postup používaný v praxi ořezává grafiku konturou plus spadem a ukládá tiskové i `_cut` PDF
  zvlášť — popsané ve specu §10, včetně vyřešené překážky s parametrickou
  odsazenou cestou.


## [1.0.0] — 2026-09-13

První verze. Plátování velké grafiky na tiskové pláty pro **ruční ořez** —
případ, kdy se šev musí vyhnout textu nebo logu a RIP to neumí.

### Added

**Dělení**

- Plátování jedním směrem, horizontálně nebo vertikálně.
- Tři vstupní režimy, všechny plní tutéž mřížku: **počet plátů**, **šířka
  plátu** (poslední plát vyjde kratší), **vodítka** v dokumentu.
- Volitelné zaokrouhlení pozic vodítek na zadaný krok — ručně tažené vodítko
  nikdy nesedí na kulaté číslo.
- Vodítka na zamčené vrstvě se použijí, na skryté se ignorují a nahlásí
  v souhrnu.

**Okraje**

- **Přídavky ve čtyřech nezávislých polích** — nahoře, dole, vlevo, vpravo.
  Nula znamená „načisto".
- **Přelep** odděleně od přídavků, ve dvou režimech: půl na každou stranu švu,
  nebo celý na levý (u vertikálního dělení horní) plát. Nula pro desky.
- Přídavek se kontroluje proti spadu, který nalinkované PDF skutečně nese.

**Výstup**

- Červená **ořezová linka v přímé barvě** po obvodu vnějšího rozměru plátu,
  tedy na MediaBoxu výstupu — po řezu podle ní zůstane montážní spad na plátu.
  Tah je posunutý dovnitř o svou polovinu, aby jeho vnější okraj ležel přesně
  na hraně a nevytiskl se poloviční.
- Export **do PDF přes dočasný dokument na každý plát**. Zdrojový dokument se
  při exportu nemění a linka sousedního plátu se nemá jak propsat.
- **Vektorový i rastrový** režim. Rastrový udělá plát velký podle jeho plochy
  a DPI místo podle zdroje — u velkých podkladů řádová úspora.
- **Měřítko výstupu**: stejné jako dokument, nebo 1:1 ve skutečné velikosti.
- Vzor pojmenování s `{doc}`, `{n}`, `{total}`; `{n}` se doplňuje nulami podle
  počtu plátů.
- **Přeskakování hotových výstupů** — běh, který spadl v půlce, naváže.

**Dialog**

- Dvoufázový běh: *Jen pláty* vytvoří artboardy a linky ke kontrole,
  *Vytvořit a exportovat* projde oběma kroky najednou.
- **Živý dopočet** — rozměr každého plátu načisto i s přídavky, dostupný spad
  na každé hraně, varování a chyby. Chybné zadání zašedne akční tlačítka.
- Čistý formát se bere z artboardu a jde přepsat ručně.
- **Ruční měřítko 1:N** složené s nativním Large Canvas faktorem. Všechny
  hodnoty se zadávají ve skutečných milimetrech.
- PDF presety z `app.PDFPresetsList`, pojmenované předvolby, lokalizace cs/en.

### Notes

- Vektorový export nese v každém plátu **celou grafiku**. Illustrator obsah
  neořezává ani artboardem, ani clipping maskou, a `PDFSaveOptions` nemá
  ekvivalent InDesignového „Crop Image Data to Frames". Měření je ve specu §3.
- **Large Canvas dokument musí exportovat 1:1** — dočasný dokument nemůže být
  Large Canvas, protože `scaleFactor` u nově vytvořeného dokumentu nejde
  nastavit a selže tiše. Nástroj tuhle kombinaci odmítne.
- Zünd, 2D mřížka a číslování plátů jsou mimo tuto verzi.
