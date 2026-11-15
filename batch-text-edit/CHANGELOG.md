# Changelog

Všechny podstatné změny tohoto nástroje.
Formát podle [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/),
verzování podle [SemVer](https://semver.org/lang/cs/).

## [1.1.0] — nevydáno

### Přidáno

- **Pořadí po aršících.** Aršík je skupina, ve které leží skupiny prvků.
  Se zaškrtnutým Po aršících se číslování projde celý aršík, než přejde na
  další; prvky mimo aršík přijdou na konec. Sloupec # v náhledu ukazuje
  aršík a pořadí (`3 · 25`), řádek rozsahu počet aršíků.
- **Číslovat: řada v každém aršíku.** Zaškrtnuté „v každém aršíku“ začne
  v každém aršíku znovu na Od, i když mají aršíky různý počet prvků.
- **Zbylé proměnné.** Když po posledním kroku zůstane v textu `{…}`, náhled
  i Souhrn to ohlásí s počtem prvků. Použít zůstane aktivní.
- Hlášky k aršíkům: žádný prvek v aršíku, každý aršík s jedním prvkem,
  prvky mimo aršík.

### Změněno

- **Do je konec řady.** Prvek, jehož číslo by Do překročilo, zůstane
  v kroku beze změny a náhled ohlásí, kolik jich je; nová řada (Znovu po,
  další aršík) začne znovu na Od. Dřív Do jen kontrolovalo počet a krok
  očísloval všechny prvky. Předvolby z 1.0.0 s vyplněným Do proto teď
  zastaví na Do.
- Od za hranicí Do je ✗ (krok by nic neočísloval).
- Seznam kroků nemá zaškrtávátka: vypnutý krok nese na konci řádku
  „(vypnutý)“ a zapíná se přepínačem Aktivní. Illustrator 2027 je kreslil
  šedě, kliknutí je nepřeplo a ukázal je až po pohybu myši.

### Opraveno

- Hláška po neočekávané chybě radila Cmd+Z, i když se nic nezapsalo; teď
  řekne „Dokument nebyl změněn.“
- Pokyn „potvrďte Použít znovu“ se už neukáže vedle šedého Použít.
- Chyba v ovládání dialogu zašedí Použít a Uložit i tehdy, když se nepodaří
  vykreslit stav, a hláška už neukáže „undefined“.
- V Illustratoru 2027 se dialog po kliknutí na zaškrtávátko (Aktivní, Po
  aršících a další) překreslí hned; dřív se změna ukázala až po dalším
  kliknutí do dialogu.

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
