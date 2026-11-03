# Changelog

Všechny podstatné změny tohoto nástroje.
Formát podle [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/),
verzování podle [SemVer](https://semver.org/lang/cs/).

## [1.0.0] — 2026-11-03

První vydání.

### Přidáno

- **Řetěz kroků nad textem** ve výběru, na aktivním artboardu nebo v celém
  dokumentu: **Číslovat** (Od, Do, Krok, formát 1 / A / a, Číslic,
  Opakovat, Znovu po), **Nahradit** (proměnná, jiný text, regulární výraz;
  rozlišovat velká a malá, jen první shoda v textu) a **Velikost písmen** (VELKÁ,
  malá, Každé Slovo, První písmeno věty). Kroky jdou vypnout, posunout
  a smazat.
- **Proměnné ve složených závorkách** skript najde a nabídne v poli Kde
  s počtem prvků; nabídka ukazuje stav před daným krokem a uložená proměnná,
  která v textu chybí, se ukáže jako „(nenalezeno)“.
- **Prvek** = nejnižší skupina s textem; volné texty se spárují podle
  nejmenšího uzavřeného tvaru kolem nich. **Pořadí** po řádcích nebo po
  sloupcích podle polohy; skupiny nad prvkem pořadí neovlivní.
- **Náhled** po prvcích (Původní, Po vybraném kroku, Nový) a stavový řádek
  ✓ / ⚠ / ✗. Použít nikdy nezapíše výsledek, který náhled neukázal.
- **Zápis po úsecích:** formát mimo nahrazený úsek zůstane; zamčené
  a skryté texty se nikdy nezapíšou; přetečené texty a navázané rámečky se
  přeskočí. Před každým krokem se dokument porovná s náhledem a po zápisu
  se každý text přečte znovu; celý běh vrátí jedno Zpět.
- **Souhrn** změněných prvků a textů, přeskočených textů a neshod po zápisu;
  technická příčina zastaveného zápisu jde do logu
  `~/Library/Application Support/batch-text-edit/bte.log`.
- **Předvolby** (recepty řetězů kroků) podle kánonu rodiny.
