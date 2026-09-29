# Changelog

Všechny podstatné změny skriptu Grommet Marks. Formát vychází z
[Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), verzování dle
[SemVer](https://semver.org/lang/cs/).

## [Unreleased]

Opravy z code review 2026-09-26
([report](../docs/reports/2026-09-26-code-review-grommet-marks.md)) a úpravy
z auditu UI 2026-09-29
([audit](../docs/reports/2026-09-29-audit-ui-grommet-marks.md)).

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
