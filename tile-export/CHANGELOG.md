# Changelog

Všechny podstatné změny tohoto nástroje.
Formát podle [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/),
verzování podle [SemVer](https://semver.org/lang/cs/).

## [1.1.0] — nevydáno

### Added

- **Měřítko kresby si pamatuje dokument.** Jedno pole „Měřítko kresby 1:"
  místo zaškrtávátka; hodnota se po potvrzeném běhu uloží do dokumentu
  a příště se nabídne sama. Už se nepřenáší z poslední zakázky do další
  a načtená předvolba ho nemění.
- Panel **Dokument** ukazuje čistý formát a dostupný spad ve skutečných
  milimetrech, i když dělení hlásí chybu.
- **Pojmenování podle konvence dílny.** Vzor zná `{size}`, skutečný rozměr
  stránky (`2020x1020mm`), a `{scale}`, poměr dat ke skutečné velikosti
  (`1ku10`, ve skutečné velikosti `1ku1`; kde poměr nechceš, vynech ho):
  `26_13456_a_{n}_{size}_{scale}_1x`. Výsledek ukazuje názvy všech souborů,
  které export zapíše; prázdný název, lomítko nebo dvojtečku export odmítne.
- **Proměnné jako tlačítka.** Pod vzorem pojmenování je řada `{doc}` `{n}`
  `{size}` `{scale}`; klik ji připíše na konec vzoru, který se tak skládá
  zleva doprava. `{total}` tlačítko nemá, dílna ho nepoužívá; napsaný ručně
  funguje dál.
- **Skryté proměnné `{clean}` a `{adds}`:** čistý formát plátu a formát
  s přídavky ve skutečné velikosti, v celých mm (`2000x1000mm`, `2010x1000mm`).
  Tlačítko nemají, do vzoru se píšou ručně. U ručního ořezu je `{adds}` totéž
  co `{size}`, u Zündu je `{size}` stránka i se značkami.

### Changed

- **Jen pláty staví kontrolní pláty.** Místo artboardů a červených linek přes
  originál vznikne vedle něj každý plát zamaskovaný na vlastním artboardu,
  s linkou, nebo se Zünd značkami a řezem — tak, jak ho zapíše export, v měřítku
  kresby. Svisle v řadě pod originálem, Vodorovně ve sloupci vpravo; co by
  vyjelo z plátna, se zalomí. Hranice načisto je vodítko. Originál zůstane, jak
  je, a další běh vrstvu `TE_panels` nahradí. Když se pláty na plátno nevejdou,
  Jen pláty to ohlásí a export proběhne bez nich.
- **Výsledek začíná stavovou řádkou.** Tučně, zeleně, oranžově nebo červeně
  řekne, jestli export poběží: „✓ Připraveno k exportu: 3 pláty, ruční ořez,
  výstup 1:10.", „⚠ Připraveno k exportu, 1 upozornění níže.", „✗ Export
  nejde, Jen pláty ano: …" nebo „✗ Nejde spustit: …". Pod ní tabulka plátů se
  sloupci Načisto, S přídavky a Stránka PDF (u Zündu se značkami); stejné
  sousední pláty sdílí řádek, třeba „1–2". Nejníž hlášky, chyby první,
  a názvy všech souborů, které export zapíše; pole se dá rolovat.
- **Typ výstupu: ruční ořez, nebo Zünd.** Jedna volba místo řádku linky
  v panelu Export a panelu Zünd se zaškrtávátkem; pod ní jen pole zvoleného
  typu. Panel Export se jmenuje Soubory.
- **Měřítko výstupu se jmenuje číslem kresby,** třeba „1:10 jako kresba"
  místo „Stejné jako dokument". U kresby 1:1 se nevolí nic. Faktor Large
  Canvas dialog neukazuje.
- **Rastrový export není v dialogu.** Dílna rastruje ve Photoshopu a jestli
  jde věřit rastru Illustratoru, se teprve ověří. Uložené předvolby s rastrem
  exportují vektor.
- **Předvolby mají dva řádky:** seznam s ↺ přes levý sloupec, Uložit,
  Uložit jako… a Smazat pod ním. Seznam má místo i pro dlouhé názvy, dřív mu
  tlačítka nechala 88 px. Výchozí předvolba se česky jmenuje [Výchozí], jako
  v Zünd Summa Marks.
- Pole vzoru pojmenování je přes celý řádek. Dialog měří 1178 × 836 px
  (1.0.1: 793 px na výšku).
- `{n}` má vždy aspoň dvě číslice, jak dílna čísluje pláty: `zed_01`, ne
  `zed_1`.
- **Výchozí vzor názvu je `{doc}_{n}_{size}_{scale}`**, třeba
  `zed_01_2040x1030mm_1ku10`. Zakázku a počet kopií dopíšeš do vzoru sám.
- Zünd mluví slovy dílny: **rovný ořez** a **tvarový ořez** místo „obdélníku
  plátu" — ve Výsledku, ve varování o cestách v barvě řezu i v nápovědě.
- Patička je stejná jako v ostatních nástrojích:
  „© 2025–2026 Ladislav Osvald · v1.1.0", bez názvu nástroje, který nese
  titulek okna.

### Fixed

- **Barva řezu z předvolby se už tiše nemění.** Barvu, kterou dokument nemá
  — třeba starší `cut` s malým písmenem —, dialog dřív nahradil první
  položkou seznamu; u dokumentu bez přímých barev to byla registrační, takže
  by se řezalo v barvě značek (i v 1.0.x). Teď seznam ukáže „cut  (chybí)“,
  Výsledek upozorní, že ji export založí, a registrační ani jiné barvy
  v hranatých závorkách seznam řezu nenabízí.
- **Vzor bez `{n}` už nezapíše jeden soubor za víc plátů.** Pláty se stejným
  rozměrem dostaly stejný název a export si soubor přepsal, se zapnutým
  přeskakováním další vynechal — bez hlášky (i v 1.0.x). Teď Výsledek řekne,
  které dva pláty se jmenují stejně, poradí přidat `{n}` a export zablokuje;
  Jen pláty soubory nezapisuje, zůstává aktivní.
- **Překlep v číselném poli už nevydá jiné číslo.** Přelep „2O" dřív tiše
  znamenal nulový přelep, „1 000" nebo „20 mm" výchozí hodnotu pole a prázdné
  měřítko kresby 1:1; dialog nic neřekl a export proběhl (i v 1.0.1). Teď
  pole zčervená, Výsledek ho pojmenuje — „✗ Pole „Přelep“: zadejte číslo,
  třeba 20 nebo 2,5." — a Jen pláty, export, Uložit i Uložit jako… zešednou.
  Číslo smí mít desetinnou čárku nebo tečku a mezery okolo; cokoli jiného,
  i prázdné pole, je chyba. Pole, které zvolené nastavení nepoužívá, se
  nehodnotí.
- U směru Vodorovně se pole jmenuje Výška plátu a hlášky mluví o výšce. Když
  výška vydá jen na jeden plát, hláška řekne, kolik grafika ve směru dělení
  měří — dřív stálo jen „Jsou potřeba aspoň 2 pláty."
- Načtená předvolba ukáže pole svého typu výstupu; Zünd pole dřív zůstala
  skrytá nebo vidět podle předchozího stavu.
- **[Výchozí] ukazuje vždy výchozí hodnoty nástroje.** Soubor nastavení
  z doby před opravou předvoleb (září 2026) v něm mohl držet hodnoty z testu —
  přelep 33 mm, přídavek vpravo 40 mm, mezeru značek 10 mm — a dialog je
  nabízel jako výchozí. Vlastní předvolby a poslední běh zůstávají, jak byly.

## [1.0.1] — 2026-10-10

### Changed

- **Směr plátování se jmenuje jako v dílně.** „Svisle" dělí na svislé pláty
  vedle sebe, jako tapety od stropu k podlaze; „Vodorovně" na vodorovné pláty
  nad sebou. Dřív se tytéž volby jmenovaly obráceně, Horizontálně
  a Vertikálně. Uložené předvolby dělí dál stejně.
- **Přeskočit hotové výstupy je ve výchozím stavu vypnuté.** Zapnuté nechávalo
  při opakovaném exportu po opravě staré soubory se stejnými názvy a hlásilo
  je jen jako přeskočené. Volba zůstává pro navázání běhu, který spadl
  v půlce. Uložené předvolby a poslední běh si nesou svou hodnotu.

### Fixed

- **Export bral ořez PDF z předvolby importu, ne z umístěné grafiky.** Každý
  plát umisťoval PDF znovu ze souboru a ořez (Trim, Bleed, Media) převzal
  z globální předvolby Illustratoru, kterou přepíše každé otevření dokumentu
  s navázaným PDF. PDF umístěné se spadávkou pak vyšlo ořezané na TrimBox
  a roztažené na rozměr pozice — obsah nerovnoměrně zvětšený, místo spadávky
  roztažený okraj, bez varování. Plát teď dostává kopii umístěné grafiky, ořez
  zůstane, jak ho máš v dokumentu.
- Šířka plátu u směru Vodorovně: kratší zbytek vycházel na horní plát, ne na
  poslední, jak slibuje nápověda. Teď jde na spodní plát.
- Dělení podle vodítek u směru Vodorovně: náhled v dialogu četl svislá
  vodítka. Se samými vodorovnými hlásil „Nenalezena použitelná vodítka"
  a nepustil dál, s oběma ukazoval jiné dělení, než běh udělal.
- Kontrola spadu za řezem a přídavků odmítala 3 mm u PDF se spadem 3 mm:
  Illustrator v něm kvůli zaokrouhleným souřadnicím naměří třeba 2,9986 mm
  a hláška pak tvrdila „potřebují 3 mm, PDF nese 3 mm". Kontroly teď platí
  v přesnosti, jakou dialog ukazuje.
- Nápověda k obsahu exportu a README tvrdily, že vektorový plát nese vždy
  celou grafiku. Plát nese jen objekty, které do něj zasahují; celý zůstane
  objekt přes hranu plátu, typicky velký obrázek.
- README radilo po Jen pláty posunout šev ručně. Ručně posunutý artboard
  export nepřevezme, pláty počítá z nastavení znovu.

## [1.0.0] — 2026-10-04

První verze. Plátování velké grafiky na tiskové pláty pro **ruční ořez** —
případ, kdy se šev musí vyhnout textu nebo logu a RIP to neumí — a pro
**strojní ořez na Zündu** s rovným řezem.

### Added

**Dělení**

- Plátování jedním směrem, horizontálně nebo vertikálně.
- Tři režimy: **počet plátů** (švy na přesných zlomcích, pláty stejné
  načisto), **šířka plátu** (poslední plát vyjde kratší), **vodítka**
  v dokumentu, volitelně zaokrouhlená na krok. Vodítka na skryté vrstvě se
  ignorují a nahlásí.
- **Rovnoměrně — stejné tiskové pláty:** stejně velké pláty včetně přelepu
  a přídavků. U počtu plátů srovná ty, které sis vyžádal; u šířky plátu ji čte
  jako strop tiskové šířky (šířku role) a vezme nejmenší počet stejných plátů.

**Okraje**

- **Přídavky** ve čtyřech nezávislých polích; kontrolují se proti spadu, který
  umístěné PDF skutečně nese.
- **Přelep** odděleně od přídavků: půl na každou stranu švu, nebo celý na levý
  / horní, nebo celý na pravý / dolní plát. Nula pro desky na tupo.

**Výstup**

- Červená **ořezová linka v přímé barvě** po obvodu tiskového plátu. Leží
  středem na hraně s dvojnásobným tahem: okraj stránky ořízne vnější polovinu
  a hrana stránky vždy padne do tahu. Tloušťka se zadává jako viditelná
  v tisku, výchozí 1 pt.
- Export **do PDF přes dočasný dokument na každý plát** — zdroj se nemění
  a linka souseda se nemá jak propsat.
- Ve vektorovém exportu má linka **vlastní vrstvu** nad vrstvou `Graphics`,
  pojmenovanou podle své barvy, a PDF je editovatelné v Illustratoru, aby
  vrstvy po otevření zůstaly. Rastrové PDF zůstává obyčejné: editovatelné
  by neslo obraz dvakrát.
- **Vektorový i rastrový** režim. Rastrový rastruje jen grafiku, plát je velký
  podle své plochy a DPI; linka zůstane navrchu jako vektor. Rozlišení pod
  72 DPI, které Illustrator nepřijme, dialog do exportu nepustí.
- **Měřítko výstupu:** stejné jako dokument (co ukazují pravítka; Large Canvas
  tedy ve skutečné velikosti), nebo 1:1. Velké zakázky nenarážejí na strop
  Illustratoru pro nastavení velikosti (~5,77 m).
- Vzor pojmenování `{doc}`, `{n}`, `{total}`; přeskakování hotových výstupů,
  aby běh, který spadl v půlce, navázal.

**Zünd režim (rovný ořez)**

- Z každého plátu dvě PDF se stejnou stránkou: **tiskové**, kde grafiku ořízne
  maska o **spad za řezem** (výchozí 5 mm), a **`_cut`** s řezovou cestou —
  obdélníkem plátu v přímé barvě `Cut`, hairline 0,125 pt. Řez zahrnuje
  přídavky i přelep.
- Obě PDF se **zachovanou editovatelností v Illustratoru** a vrstvami jako
  ze Zünd Summa Marks, shora `Regmarks`, vrstva řezu podle barvy a `Graphics`.
  V tiskovém je vrstva řezu vypnutá a do tištěné stránky se nedostane,
  z řezového je vrstva grafiky odstraněná.
- Ořezová linka se v Zünd režimu nekreslí nikam, ani do zdrojového dokumentu;
  její řádek v dialogu je šedý a po vypnutí režimu se vrátí, jak byl.
- Registrační značky se měří od konce grafiky (odstup 5 mm, značka 5 mm);
  geometrie je sdílená se Zünd Summa Marks. Značky, řez i stránka jsou v obou
  souborech shodné (ověřeno na 0,0000 mm).
- Kontrola, že PDF na vnějších hranách unese přídavek + spad za řezem.
- Kontrola, že se značky na žádném plátu nedotknou ani nepřekryjí — typicky
  orientační bod na rohové značce u úzkého plátu. Dialog jmenuje plát a export
  zastaví; při kolizi se neexportuje nic.

**Dialog**

- Dvoufázový běh: *Jen pláty* vytvoří artboardy a linky ke kontrole,
  *Vytvořit a exportovat* projde oběma kroky.
- **Živý výsledek:** rozměr každého plátu načisto i s přídavky, velikost
  stránek PDF v měřítku výstupu (v Zünd režimu i se značkami), dostupný spad.
  Chyby a varování nahoře; chyba, která se týká jen exportu, nešedí Jen pláty.
- Desetinná čárka v každém poli, desetiny v souhrnu i v hláškách.
- **Ruční měřítko 1:N** složené s faktorem Large Canvas; všechno se zadává ve
  skutečných milimetrech.
- **Předvolby:** hvězdička u změněné, ↺ vrátí uložené hodnoty, Uložit, Uložit
  jako…, Smazat — zapisuje se hned. Dialog se otevře s hodnotami posledního
  potvrzeného běhu.
- PDF presety z Illustratoru, lokalizace cs/en, tlačítka Storno / Jen pláty /
  Vytvořit a exportovat.

### Notes

- Vektorový export nese v každém plátu **celou grafiku** — Illustrator obsah
  neořezává ani artboardem, ani maskou. Menší soubor dá rastrový režim.
- Plát se v měřítku výstupu musí vejít do artboardu Illustratoru, nejvýš
  5715 mm na stranu.
- PDF preset platí pro oba Zünd soubory; preset s tiskovými značkami je přidá
  i do `_cut`.
- **Tvarový ořez podle kontury** zatím není: cesty v barvě řezu dialog ohlásí
  a řeže se obdélník plátu. Dále mimo tuto verzi: víc řezacích barev, Summa,
  2D mřížka.
- Otevřené drobnosti jsou v `tile-export/docs/findings.md`.
