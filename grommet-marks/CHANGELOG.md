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
