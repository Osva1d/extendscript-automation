# Changelog

Všechny podstatné změny skriptu Grommet Marks. Formát vychází z
[Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), verzování dle
[SemVer](https://semver.org/lang/cs/).

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
