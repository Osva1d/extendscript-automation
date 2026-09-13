# Changelog

Všechny podstatné změny tohoto nástroje.
Formát podle [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/),
verzování podle [SemVer](https://semver.org/lang/cs/).

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
