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
- **„Rozpustit zbytek" u šířky plátu.** Zaškrtnutím se zadané číslo čte jako
  strop **tiskové** šířky — tedy šířka role — a grafika se rozdělí na nejmenší
  počet stejných plátů, které se pod něj vejdou:
  `n = ceil((délka + přídavky − přelep) / (strop − přelep))`. Bez zaškrtnutí
  platí původní chování: přesná čistá šířka a kratší poslední plát.

### Changed

- **Režim „počet plátů" dává pláty stejné tiskové šířky.** Dřív dělil
  rovnoměrně čistý formát a přelep přidal až potom, takže z tiskárny vyjely
  pláty různě široké — 1010/1020/1010 mm na grafice 3000 mm s přelepem 20.
  Přelep a přídavky jsou teď součástí dělení:
  `W = (délka + přídavky + (n−1) × přelep) / n`.
  Stejná je **tisková** šířka, tedy MediaBox, na kterém leží červená linka
  a podle kterého se řeže. Čisté šířky se při nenulovém přelepu liší vždy —
  obojí naráz mít nejde a dřívější chování dávalo přesně opak: stejné čisté
  šířky, různé tiskové. Platí v obou režimech přelepu; jednostranný jen posune
  šev o půl přelepu.
  **Při nulovém přelepu je výsledek totožný s dřívějším**, takže desky, které
  se plátují bez přelepu, se změna nedotkne.
- Dialog přerovnán do vyváženějších sloupců (Přelep a přídavky vlevo) a pole
  Výsledku zkráceno na 85 px. Se zapnutým Zünd režimem měří 796 px, bez něj
  stejně — viz poznámka níž.
- `TE.Export.exportTile()` vrací `{file, contourPaths}` místo `File`.

### Fixed

- **Nápověda u „šířka plátu" slibovala strop, který nedržel.** Stálo tam
  „Největší šířka plátu", jenže to platilo jen o čisté šířce — tištěný plát
  vyjde až o přelep širší (zadáno 1200, vytištěno 1220). Kdo tam psal šířku
  role, dostával pláty o přelep přes. Text teď říká obojí a odkazuje na
  „rozpustit zbytek", které ten strop drží doopravdy.

- **Souhrn v poli Výsledek už nic nezamlčí.** Bylo to `statictext` s pevnou
  výškou 85 px, do kterého se psal libovolně dlouhý text — u pěti plátů se
  zobrazily pláty 1–3 a beze stopy zmizely pláty 4 a 5, řádek s dostupným
  spadem **a všechna varování i chyby**. Tlačítko Vytvořit a exportovat tak
  mohlo zůstat šedé bez jediného vysvětlení. Pole je teď `edittext`
  (readonly, se scrollováním) a chyby s varováními se vypisují **nahoře**,
  nad geometrií. Text jde navíc označit a zkopírovat do zakázkového listu.

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
