# Changelog

Všechny podstatné změny tohoto nástroje.
Formát podle [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/),
verzování podle [SemVer](https://semver.org/lang/cs/).

## [1.0.1] — nevydáno

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
