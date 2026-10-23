# Changelog

Všechny podstatné změny skriptu Grommet Marks. Formát vychází z
[Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), verzování dle
[SemVer](https://semver.org/lang/cs/).

## [Unreleased]

Měřítko kresby 1:N a jazyk společný všem nástrojům
([návrh](../docs/specs/2026-10-20-grommet-marks-1.4.0-design.md)).

### Přidáno

- **Měřítko kresby 1:N.** Druhý řádek panelu Umístění má vedle Jednotek pole
  Měřítko kresby 1:. Hodnoty v dialogu se zadávají ve skutečné velikosti
  a skript je při kreslení vydělí N — velikost značky a tloušťky tahů
  (Reg. tah, Bílé halo) také; počty se nedělí a v dokumentu Large Canvas se
  oba přepočty násobí. Dřív bylo potřeba každou hodnotu vydělit deseti
  v hlavě, když se banner kreslil v 1:10. Měřítko patří dokumentu: pamatuje si
  ho ve stejném klíči XMP jako Tile Export, takže dokument s měřítkem od Tile
  Exportu otevře Grommet Marks s tímto měřítkem a obráceně. Platí číslo od 1
  do 100, i desetinné (1:2,5); cokoli jiného pole zčervená a Generovat
  zašedne. Do předvoleb ani do `[Last Settings]` se měřítko neukládá
  a přepnutí jednotek ani předvolby ho nemění. Do dokumentu se zapíše až po
  úspěšném běhu a jen když se liší od přečteného: odmítnutý běh nechá dokument
  beze změny a dokument bez měřítka s během v 1:1 také. Zápis měřítka není
  v kroku Zpět: Zpět (Cmd+Z) po běhu odstraní značky, ale měřítko v dokumentu
  zůstane, takže další dialog nabídne měřítko vráceného běhu (přepište pole;
  dokument bez měřítka dostanete zpět zadáním 1 a jedním Generovat). V měřítku
  1:1 vycházejí stejné polohy i velikosti jako v 1.3.0.
- **Měřítko v šedém řádku.** Je-li jiné než 1:1, řádek pod Umístěním je
  uvede na konci („1 artboard · 8000 × 6000 mm · 1:10“, „Uzavřená cesta ·
  5 rohů · 1:10“) — bez slova „měřítko“, které by dialog rozšířilo.
  Velikost artboardu v režimu Hrany ukáže ve skutečné velikosti
  (artboard × N), protože všechny hodnoty v dialogu
  jsou ve skutečné velikosti — takže měřítko, které přišlo z dokumentu, je
  vidět v poli i v řádku, ne jen v poli.
- **Šedý řádek říká, proč je Generovat šedé.** Dokud Generovat nejde
  stisknout, řádek místo nálezu ukáže důvod, červeně a se symbolem ✗:
  u jednoho neplatného pole jeho jméno a povolený rozsah („✗ Velikost:
  zadejte číslo od 0,01 do 9999 mm.“), u víc polí jejich počet („✗ Neplatná
  pole: 3 — opravte červená pole.“) a když jsou čísla v pořádku, ale nic by
  nevzniklo, „✗ Značka nemá tvar — zapněte Kruh nebo Kříž.“ nebo „✗ Není
  zapnutá žádná hrana.“ Po odstranění důvodu se nález vrátí. Dřív Generovat
  zešedlo a dialog neřekl proč.

### Změněno

- **Rozteč místo Rozestupu.** Vzdálenost středů značek se česky jmenuje
  všude Rozteč (popisky, záhlaví sloupce, nápovědy, hlášky), jako už v rohových
  zónách. Anglicky je všude Spacing, i v zónách (dřív pitch).
- **Čísla v polích se čtou jedním způsobem** — pro pole, živou kontrolu
  i odeslání dohromady, stejně jako v Tile Exportu. Platí desetinná čárka
  i tečka a mezery okolo; `1e3`, `.5`, `0x10`, `1O5`, `1 000` i `20 mm` jsou
  neplatné pole (dřív se `1e3`, `.5` a `0x10` přečetla jako čísla). Desetinná
  čárka zůstane čárkou: zapsaných `2,5` se při dalším otevření ukáže zase
  jako `2,5`, ne `2.5`.
- **Předvolby se chovají jako v ostatních nástrojích.** Hvězdička stojí jen
  u aktivní předvolby a po přepnutí zmizí u té předchozí (dřív u ní
  zůstala). `[Výchozí]` se při každém otevření sestaví z kódu, ne ze souboru
  nastavení. Uložit i Uložit jako… jsou šedé, dokud je některé pole neplatné
  (důvod je v šedém řádku), a po uložení Uložit zhasne (dřív zůstal
  aktivní). Překlep ve skrytém poli — v druhém režimu, v nezapnuté hraně —
  se do předvolby uloží jako výchozí hodnota toho pole (u délky v jednotce
  předvolby: 105 mm je v cm 10,5): předvolba nikdy neuloží hodnotu, kterou
  další otevření nepřečte. Panel je podle šablony
  rodiny: ↺ ve vlastní skupině vedle seznamu a tlačítka Uložit / Uložit
  jako… / Smazat v nativní šířce (dřív 92 px, na „Uložit jako…“ nestačilo).
  Řekne se předvolba, ne nastavení.
- **Předvolba uložená verzí 1.3.0 s překlepem ve skrytém poli.** Taková
  předvolba se může při prvním otevření ukázat jako změněná (hvězdička `*`
  u názvu, svítí Uložit): verze 1.4.0 by ten překlep uložila jako výchozí
  hodnotu pole a ta se od uloženého textu liší. Nic se neztrácí; jedno Uložit
  hvězdičku odstraní a předvolba se už neukáže jako změněná.
- **Hlášky jako v ostatních nástrojích.** Blokující chyba začíná `CHYBA:`,
  upozornění po běhu `UPOZORNĚNÍ:`; názvy stojí v „…“ a žádná hláška nekončí
  vykřičníkem (místo „Velikost musí být číslo!“ je teď Pole „Velikost“ musí
  být číslo.). Odmítnutí, po kterém se dokument nezměnil, to řekne větou
  „Dokument nebyl změněn.“ Neočekávaná chyba má pevnou šablonu: co se stalo,
  v jakém stavu je dokument a komu hlášku poslat. Neuložené nastavení říká
  následek („příště se dialog otevře bez něj“) a běh kvůli němu nekončí, proto
  nemá předponu `CHYBA:`; před během, který pokračuje, hláška dodává „Běh
  pokračuje.“ Meze v hláškách mají desetinnou čárku („0,01“).
- **Titulek dialogu je „Grommet Marks v…“** (dřív „Illustrator Grommet Marks
  v…“), jako u ostatních nástrojů.
- **Registrační barva se hledá podle typu.** Značky se kreslí registrační
  barvou dokumentu, ať je ve vzorníku kdekoli a jak se jmenuje
  (`[Registrační]`, `[Registration]`). Dřív ji skript bral jen z druhého
  políčka vzorníku; stál-li tam jiný vzorek (třeba Bílá), vyšly značky ve
  100 % K. Dokument bez registrační barvy kreslí 100 % K jako dřív.
- **Dialog je o jeden řádek vyšší.** Jednotky se přesunuly do druhého řádku
  Umístění k Měřítku kresby. Nejvyšší stav (Hrany artboardu bez zrcadlení)
  měří 804 px místo 777 px a dialog je 535 px široký místo 521 px, aby se do
  šedého řádku vešel i konec s měřítkem.

### Opraveno

- **Hodnoty v polích jsou čitelné i na světlém uživatelském rozhraní.** Na
  jasu Medium Light a Light vypadala čísla ve všech aktivních polích jako
  zašedlá: skript jim dával vlastní světle šedou, protože barvu, kterou pole
  mělo, si Illustrator před otevřením dialogu přečíst nenechá. Pole, které
  nebylo červené, teď skript nebarví vůbec a kreslí ho Illustrator sám; po
  opravě překlepu dostane zpět barvu textu z motivu Adobe pro nastavený jas.
- **Odsazení od kraje uložené v předvolbě se mimo režim cesty kontroluje
  i proti horní mezi 9999.** Dřív stačilo, aby nebylo záporné, a předvolba
  mohla držet hodnotu, kterou pole v režimu cesty odmítne.
- **Uložit ukládá jen platné hodnoty.** Z neplatného pole (`abc`) se dřív do
  souboru zapsalo `null`, které další otevření nepřečetlo; teď je Uložit
  s neplatným polem šedé.
- **Zrcadlená (skrytá) hrana už nešedí Generovat.** Dolní nebo Pravá hrana,
  která jen zrcadlí Horní nebo Levou, měla v poli nesmysl, který operátor
  neviděl, a Generovat zůstalo šedé bez viditelné příčiny — i když běh ta pole
  ignoruje. Živá kontrola je teď přeskočí taky. Totéž platí pro Odsazení X
  a Y v režimu Vybraná cesta: skryté pole už po kliknutí na Generovat
  neohlásí chybu.
- **Smazat se ptá na jméno předvolby, ne na položku seznamu.** U změněné
  předvolby se dřív ptalo „Smazat předvolbu „Test A *“?“, teď „Test A“.

## [1.3.0] — 2026-10-17

Tvary v režimu Vybraná cesta: odsazení od kraje, zaoblené rohy a část obvodu
([návrh](../docs/specs/2026-10-11-grommet-marks-path-mode-design.md)).

### Přidáno

- **Odsazení od kraje v režimu Vybraná cesta.** Panel Cesta má pole Odsazení
  od kraje: značky leží o zadanou vzdálenost od řezové linky dovnitř tvaru.
  Dřív bylo nutné cestu předem posunout ručně (Objekt ▸ Cesta ▸ Odsazená
  cesta…), spustit skript na kopii a kopii pak smazat. Linku, na které značky
  leží, teď spočítá Illustrator (Odsazená cesta) přímo ze skriptu; řezová
  linka zůstane beze změny a výběr se vrátí tak, jak byl. 0 = značky leží
  přímo na cestě, jako dřív. U otevřené cesty je pole zašedlé. Celý běh je
  pořád jeden krok Zpět.
- **Značka uprostřed zaobleného rohu.** Zaoblený roh (živé rohy, nebo oblouk
  z PDF mezi dvěma rovnými stranami, i rozdělený na víc úseků) dostane jednu
  značku uprostřed oblouku, mezi rohy se doplní podle Rozestupu. Není-li
  poloměr rohu větší než odsazení, má linka ok v rohu ostrý roh a značka padne
  do něj — odsazení od obou hran. Oblouk nakreslený jako mnoho krátkých úseček
  (PDF z CADu) se jako zaoblený roh nepozná: značky zůstanou ve správné
  vzdálenosti od řezu, jen nemusí padnout doprostřed oblouku.
- **Volba Jen vybraná část obvodu.** Zaškrtávátko v panelu Cesta rozmístí
  značky jen na úsecích vybraných nástrojem Přímý výběr (obě koncové kotvy
  úseku). Konce vybrané části dostanou vždy značku. Při každém spuštění
  je vypnuté a do předvolby se neukládá. Bez použitelného přímého výběru je
  zašedlé a nápověda řekne, co vybrat. Dokud je zaškrtnuté, řádek přepne na
  Rozestup a Počet ok zašedne (počet by dal jen konce části a rohy); po
  odškrtnutí se zvolený Počet ok vrátí.
- **Šedý řádek pod Umístěním.** Říká, co skript z výběru pozná: „Uzavřená
  cesta · 5 rohů", „· 4 zaoblené rohy", „· 3 rohy, 2 zaoblené", „· bez rohů ·
  první značka nahoře", u otevřené cesty nebo odsazení 0 „· značky leží na
  cestě". V režimu Hrany artboardu ukáže počet artboardů a u jednoho i jeho
  velikost.
- **Kontrola před vytvořením značek.** Skript odmítne tvar, u kterého by se
  linka ok zhroutila nebo rozpadla na víc částí (úzký pruh, hrdlo činky, příliš
  velké odsazení). Nevznikne žádná značka ani vrstva a hláška říká, co
  zmenšit a že dokument zůstal beze změny. Kontrola hlídá i to, že každá značka leží uvnitř tvaru v zadané
  vzdálenosti od řezu. Značka ve vnitřním (vydutém) rohu tvaru leží v rohu
  linky ok, odsazená od obou hran — od samotného rohu řezu je proto dál, a
  kontrola to uzná. Když Illustrator cestu posunout nedokáže, ohlásí to
  hláškou.

### Změněno

- **Tvar bez rohů začíná nahoře.** První značka leží v nejvyšším bodě, ne na
  první kotvě, kterou operátor nevidí. U kruhu a vzpřímené elipsy je
  rozmístění souměrné podle svislé osy, ať cesta začíná kdekoli a je nakreslená
  kterýmkoli směrem. Kruh otočený o jiný úhel než násobek 90° se odchýlí
  nejvýš o 0,3 mm: kruh z Illustratoru není přesná kružnice a první značka
  sedí v jeho skutečném nejvyšším bodě.
- **Zaoblené rohy už nejsou hladký prstenec od první kotvy.** Dřív skript
  zaoblený roh nepoznal a značky šly rovnoměrně od první kotvy, takže do rohů
  nemusela padnout žádná. Teď má každý zaoblený roh značku a Počet ok na cestě
  s rohy počítá i je.
- **Předvolba s cestou, když žádná není vybraná, to řekne v dialogu.** Dřív se
  skript potichu přepnul na Hrany artboardu. Teď šedý řádek hlásí „Předvolba
  chce cestu, žádná není vybraná — značí se artboard."
- **Staré předvolby mají odsazení cesty 0.** Chovají se jako dřív a kdo si
  cestu posouvá ručně, nedostane dvojí odsazení. Odsazení se nastaví jednou
  a uloží do předvolby.
- **Dialog.** Informace o cestě se z panelu Cesta přesunula do Umístění,
  poznámka „posuňte si cestu předem" zmizela. V režimu Hrany artboardu je
  dialog o jeden řádek vyšší (do 777 px), v režimu cesty o něco nižší.
- **Skupina s jedinou cestou.** Cesta, která je ve skupině sama, jde použít
  jako Vybraná cesta, i když Illustrator hlásí jako vybranou celou skupinu
  (záleží na tom, jak se vybrala). Dřív byla Vybraná cesta zašedlá.
- Při odsazení 0 na cestě s ostrými rohy zůstává rozmístění stejné jako
  v 1.2.0.

## [1.2.0] — 2026-10-04

Opravy z code review 2026-09-26
([report](../docs/reports/2026-09-26-code-review-grommet-marks.md)) a úpravy
z auditu UI 2026-09-29
([audit](../docs/reports/2026-09-29-audit-ui-grommet-marks.md)).

### Přidáno

- **Upozornění, když značky dostaly všechny artboardy (audit A8).** V režimu
  hran skript značkuje každý artboard dokumentu. Když je jich víc, řekne to
  s počtem — artboard mimo obrazovku (štítek, nátisk) se jinak snadno
  přehlédne. U dokumentu s jedním artboardem se nic neukáže.

### Opraveno

- **Značky v dokumentech Large Canvas mají správnou velikost a polohu (G1).**
  Dokument s velkým plátnem (od šířky zhruba 5,8 m) ukládá Illustrator
  v měřítku 1:10 a skript s tím nepočítal: značky vycházely desetkrát větší,
  desetkrát dál od kraje, s desetkrát tlustšími tahy a s desetkrát větším
  rozestupem. Skript teď všechny rozměry přepočítá podle měřítka dokumentu.
- **Značky mají vždy plný tah (G2).** Nová cesta ze skriptu přebírá styl tahu
  naposledy vybraného objektu. Když byla při spuštění vybraná čárkovaná
  kontura (perforace, big, výsekový obrys), vyšly registrační kruh, kříž
  i bílé halo čárkovaně a s kulatými konci. Skript teď čárky a zakončení
  nastaví sám.
- **Roh cesty se zdvojeným bodem dostane značku (G6).** Cesta uzavřená kopií
  svého prvního bodu (typické pro kontury z PDF nebo DXF) měla v tom místě
  úsek nulové délky a skript roh na něm nepoznal — roh zůstal bez značky, bez
  varování. Body na stejném místě se teď berou jako jeden.
- **Skrytá vrstva „Grommet Marks" po běhu zůstane viditelná (G5).** Skript ji
  kvůli zápisu zviditelnil a pak znovu skryl, takže nové značky nebyly vidět
  a nevytiskly se — bez jakékoli hlášky. Vrstva teď zůstane viditelná a skript
  to oznámí. Zámek vrstvy se vrací jako dřív.
- **Zdvojené značky po opakovaném běhu už nezůstanou bez upozornění (G4).**
  Druhé spuštění přidalo do vrstvy druhou sadu značek přes první, bez hlášky;
  při jiném rozestupu tak vznikla směs starých a nových značek. Skript dál jen
  přidává a nic nemaže, ale když nové značky padnou na značky, které ve vrstvě
  už byly, oznámí to s počtem a poradí Zpět nebo smazání starých.
- **S rohovými zónami ukazuje dialog u hran to, co se opravdu použije (G3).**
  Se zapnutými zónami skript střed hrany vždy plnil podle rozestupu a zadaný
  počet ignoroval — dialog ale dál ukazoval aktivní „Počet ok" a pole
  Rozestup zašedlé, takže hrana s počtem 10 dostala třeba 32 značek a hodnota
  v zašedlém poli se ani nekontrolovala. Zapnutí zón teď hrany přepne na
  Rozestup a Počet zašedne; po vypnutí zón se vrátí původní volba.
- **Nápovědy říkají, co platí (audit A1, A3, A4).** Nápověda Velikosti
  mluvila o straně čtverce, který skript nekreslí, a o kříži mlčela. Rohové
  zóny zašedlé kvůli Počtu ok na cestě s rohy tvrdily, že cesta rohy nemá.
  Nápověda zón odkazovala na „rozteč hrany", i když se pole jmenuje Rozestup,
  a zašedlý Počet ok při zapnutých zónách nevysvětloval proč. Tyto nápovědy
  teď popisují skutečný stav.
- **Tloušťky tahů mají u sebe jednotku (audit A2).** Popisky Reg. tah a Bílé
  halo teď uvádějí „(pt)" a nápověda jednotek už netvrdí, že platí pro
  všechny rozměry — tloušťky jsou vždy v bodech. Kdo zadal halo 1
  s milimetry v hlavě, dostal 0,35 mm.
- **Zašedlá „Vybraná cesta" říká proč (audit A5).** Nápověda vždy radila
  „nejdřív vyberte cestu", i když byla vybraná skupina, složená cesta nebo
  víc objektů. Teď podle důvodu: nic není vybráno; výběr není jedna
  jednoduchá cesta (s radou Přímý výběr, rozdělit složenou cestu, nechat
  jeden objekt); cesta má méně než 2 body.
- **Překlep v čísle už neprojde jako jiné číslo (audit A9).** Pole brala
  číslice ze začátku a zbytek zahodila: „1O5" se četlo jako 1, „1 000" jako 1
  a pole zůstalo platné — rozestup 1 mm pak dal tisíce značek. Takový zápis
  teď pole zčervená a Generovat zablokuje. Desetinná čárka i tečka platí dál.

## [1.1.0] — 2026-07-23

### Přidáno

- **Režim „Počet" na cestě s rohy** — dřív byl na hranaté cestě zakázaný
  (mrtvý přepínač) a rovnoměrné rozmístění šlo obejít jen zadáním obřího
  rozestupu. Nově jde „Počet" zvolit i na cestě s rohy: pole ukazuje spočtenou
  hodnotu (= počet rohů, jen pro čtení) a značky se umístí **pouze do rohů**,
  bez vyplňování úseků mezi nimi. Rohové zóny jsou v tomto stavu vypnuté
  (není co zhušťovat).

### Změněno

- **Rezervovaná jména předvoleb** — jako jméno předvolby už nejde uložit žádný
  text v hranatých závorkách (např. `[Moje]`). Hranaté závorky jsou vyhrazené
  interním předvolbám (`[Default]`, `[Last Settings]`); dřív byla blokovaná jen
  tato dvě konkrétní jména. Existujících předvoleb se změna netýká — jen nové
  už takhle pojmenovat nejde.

### Opraveno

- **Falešné blokování tlačítka Generovat** — průběžná kontrola formuláře dřív
  hlídala i pole skrytého režimu (pole hran v režimu cesty a naopak), takže
  neplatná hodnota mimo obrazovku zašedila Generovat bez viditelné příčiny.
  Nově se kontroluje jen aktivní režim.
- **Rohové zóny: zaškrtnuto-ale-nedostupné** — zaškrtnutá, ale nedostupná
  volba zón dřív při potvrzení vyvolala hlášku o polích, která dialog přeskočil.
  Stav zón se teď vyhodnocuje podle skutečné dostupnosti.

## [1.0.0] — 2026-06-28

První veřejné vydání (re-baseline).

---

> **Poznámka k číslování.** Verze `v6.0.0`–`v2.0.0` níže patří **předchozí interní
> řadě** před veřejným vydáním (tagy `gm-v4/5/6.0.0` v historii repozitáře) —
> historická reference, ne veřejná řada. Veřejná řada začíná na 1.0.0; číslo tedy
> nejde „dolů", jen se resetovalo při přechodu na open-source.

## Před veřejným vydáním (interní řada)

### v6.0.0 (2026-06)
- **BREAKING:** Sjednocený vzhled značky — registrační Esko terč (bílé halo + registrační tah, kruh a/nebo kříž, jedna velikost). Zrušena volba výplně/tahu/vrstvy; značky vždy na vrstvu „Grommet Marks".
- **UI:** Zrušen panel Vzhled; dialog jednosloupcový kompaktní (~795 px) — řeší uříznutá tlačítka na 13" displejích.
- **SCHEMA:** Odebráno 9 polí (fill/stroke/layer); přidáno markCircle/markCross/regWeight/haloWeight; forward-fill migrace.

### v5.0.0 (2026-06)
- **FEATURE:** Umístění na tvar — značky po libovolné vektorové cestě; rohové kotvy vždy přítomné; hladká cesta podporuje i počítání.
- **FEATURE:** Rohové zóny — „Zhustit u rohů" s volitelným počtem a roztečí.
- **CORE:** Cubic Bézier arc-length tabulka, detekce rohů tangentovou odchylkou (15°).

### v4.2.1 (2026-06)
- **FIX:** Selhání zápisu nastavení se hlásí uživateli; neumístěné značky souhrnným varováním; fallback na [Registration] ověřuje registrační vzorník; desetinný počet značek se odmítne; prázdný název předvolby hlásí „Zadejte název".

### v4.2.0 (2026-06)
- **UI:** Tvar zamčen na kruh; tlačítko ↺ Revert nahrazuje Reset; dvouřádkový panel předvoleb; oprava černého pole při validaci.

### v4.1.0 (2026-05)
- **UI:** Kanonický jednosloupcový layout; mirror checkbox v edge panelu; živá validace blokuje Generovat.
- **ROBUSTNOST:** Globální error boundary; fallback na `[Registration]`; „(chybí)" pro chybějící hodnoty.
- **BUILD:** Guard proti rozjití verze mezi `package.json` a `constants.js`.

### v4.0.0 (2026-05)
- **REFACTOR:** Modulární `lib/` (utils, storage, validation, ui_state) — sjednocení se Zünd Summa Marks.
- **FEATURE:** Wrapper persistence (`{activePreset, presets}`), `[Last Settings]`, Save As, indikátor změn.

### v3.1.0 (2026-02-22)
- **REFACTOR:** Sentinel systém, interní unit klíče `mm`/`cm`/`in`; migrace lokalizovaných stringů.

### v3.0.0 (2026-02-09)
- **FEATURE:** Globální odsazení X/Y; systémové vzorníky ve všech lokalizacích; modulární build; migrace v2→v3.

### v2.1.0 / v2.0.0
- JSON polyfill, namespace pattern; nezávislé bottom/right hrany, preferovaný rozestup.
