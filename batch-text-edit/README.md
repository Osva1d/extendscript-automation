# Batch Text Edit

Upraví texty a {proměnné} ve výběru, na artboardu nebo v celém dokumentu
řetězem kroků.

## Proč existuje

Na archu leží kopie jednoho prvku (samolepka, vstupenka, štítek, cedulka)
a v každé se má změnit text: pořadové číslo, kód, série, velikost písmen.
Vestavěné Najít a nahradit čísla nevytvoří; skládat to z číslovacího
skriptu a ručního přepisování je pomalé a chybu v počtu ukáže až tisk. Batch Text Edit to udělá jedním během, s náhledem
před zápisem a s kontrolou po něm.

## Požadavky

- Adobe Illustrator na macOS; chování, na kterém nástroj stojí, je naměřené
  v Illustratoru 30.8.2. Starší verze a Windows neověřeny.

## Instalace

1. Stáhni hotový `illustrator-batch-text-edit.jsx` z [GitHub Releases](https://github.com/Osva1d/extendscript-automation/releases), nebo si jej postav ze zdroje (`npm run build` → `dist/`).
2. Spusť přes `Soubor ▸ Skripty ▸ Jiný skript…`, nebo jej vlož do složky skriptů Illustratoru pro trvalé umístění:
   - **macOS:** `/Applications/Adobe Illustrator [verze]/Presets/[jazyk]/Scripts/`
3. Při vložení do Presets restartuj Illustrator.

## Funkce

- **Řetěz kroků.** Kroky běží shora dolů, každý pracuje s výsledkem
  předchozího; krok jde vypnout, posunout nebo smazat.
  - **Číslovat:** Od, Do (kontrola počtu), Krok, Formát `1, 2, 3` / `A, B, C`
    / `a, b, c`, Číslic (nuly zleva), Opakovat a Znovu po (např. řady
    sedadel 1–20, 1–20).
  - **Nahradit:** proměnná, jiný text nebo regulární výraz; Rozlišovat velká
    a malá, Jen první shoda v textu. Nový text převezme formát prvního
    nahrazeného znaku, zbytek textu zůstane, jak byl.
  - **Velikost písmen:** VELKÁ, malá, Každé Slovo, První písmeno věty.
- **Proměnné.** Cokoli ve složených závorkách (`{kód}`, `{n}`,
  `{název produktu}`; bez vnořených závorek a bez konce odstavce uvnitř)
  skript v textu najde sám a nabídne v poli Kde (u Nahradit v poli Najít)
  s počtem prvků. Proměnná se hledá doslova, včetně velikosti písmen. Krok,
  který proměnnou nahradí, ji dalším krokům z nabídky odebere.
- **Text bez závorek.** „První číslo v prvku“ přečísluje hotový blok,
  „Jiný text…“ a „Regulární výraz…“ najdou cokoli.
- **Rozsah a pořadí.** Výběr, aktivní artboard nebo celý dokument; číslování
  po řádcích nebo po sloupcích podle polohy na archu.
- **Náhled.** Pro každý prvek Původní → Po vybraném kroku → Nový, dřív než se
  cokoli zapíše.
- **Předvolby.** Uložené řetězy kroků (recepty): předvolba drží pořadí
  a kroky, ne Rozsah (ten se řídí výběrem). Dialog se otevře s posledním
  potvrzeným během; [Výchozí] je jeden krok Číslovat a smazat nejde.

## Použití

1. Do vzoru napiš proměnné ve složených závorkách, např. nad číslo `{kód}`
   a do čísla `{n}`. Vzor rozkopíruj na arch; každou kopii seskup (Cmd+G).
2. Vyber blok (nebo nic a zvol Celý dokument) a spusť skript.
3. Sestav kroky, např. **Nahradit** `{kód}` → „SNB CZ“ a **Číslovat** `{n}`
   Od 1, Do 100, Číslic 3. Zkontroluj náhled a stavový řádek.
4. **Použít.** Souhrn ukáže, kolik prvků a textů se změnilo a jestli kontrola
   po zápisu nenašla rozdíl. Celý běh vrátí jedno **Cmd+Z**.
5. Další blok: vyber ho a spusť znovu se stejnou předvolbou, jen změň kód
   a rozsah čísel.

**Co je prvek.** Jedno číslo dostane vždy celý prvek: nejnižší skupina,
ve které text leží (samolepka). Texty bez skupiny se spárují podle
nejmenšího uzavřeného tvaru kolem nich (např. kruh samolepky). Skupiny nad
prvkem (aršíky) pořadí neovlivní — kdo chce v každém aršíku souvislou řadu,
spustí běh po aršících.

**Použít ukáže náhled, než zapíše.** Náhled se přepočítá po Enteru nebo po
opuštění pole. Když klikneš na Použít hned po úpravě, první klik jen
přepočítá náhled a ukáže hlášku; zapíše až další Použít. Nikdy se tak
nezapíše nic, co náhled neukázal.

## Řešení problémů

- **„Kurzor je v textu“:** skript byl spuštěný z editace textu. Esc, vyber
  prvky, spusť znovu (nebo zvol jiný rozsah).
- **Krok má ⚠ „Nic nenašel“:** proměnná v textu není (ukazuje
  „(nenalezeno)“) — po prvním běhu už je nahrazená; použij „První číslo
  v prvku“ nebo „Jiný text…“.
- **„Poslední číslo vyjde … v poli Do je …“:** počet vybraných prvků nesedí
  na zadaný rozsah. Zkontroluj výběr; zápis to nezablokuje.
- **„Prvek 12 má 2 shody {n}, dostanou stejné číslo“:** v jednom prvku je číslovaná proměnná víckrát
  (vstupenka a ústřižek dostanou stejné číslo), nebo se volné texty slily
  do jednoho prvku — seskup kopie.
- **Zápis se zastavil:** hláška řekne, u kterého prvku a kolik textů se
  zapsalo; Cmd+Z vrátí celý běh. Technická příčina je v logu
  `~/Library/Application Support/batch-text-edit/bte.log`.

## Známá omezení

- Zamčené a skryté texty (i ve skupině nebo vrstvě), přetečené odstavcové
  texty a navázané textové rámečky se přeskočí a spočítají v souhrnu.
- Text v symbolu skript nevidí.
- Dvě místa pro stejné číslo musí ležet přímo v jedné skupině; ve dvou
  podskupinách dostanou různá čísla.
- Regulární výrazy: lookbehind a pojmenované skupiny `(?<…)` Illustrator
  nepodporuje (odmítnuto); `.` najde i konec odstavce; `\w` a `\b` neznají
  češtinu.
- Velikost písmen u znaků, které mění délku (ß → SS), může posunout formát
  uvnitř úseku; text je správně. Česká abeceda se netýká.

## Vývoj

- Build: `npm run build` (= `bash tools/build.sh`) → `dist/illustrator-batch-text-edit.jsx` (UTF-8 BOM + `#target illustrator`).
- Testy: `npm test` (plain Node, `tests/test_*.js`); `npm run verify` = build + test.
- Verze je v `package.json`; build ji ověřuje proti `src/config.js` a proti nejnovějšímu záznamu v `CHANGELOG.md` (parity guard).
- Sdílené jádro (`json2.js`, `ui_state.js`, `numbers.js`, `field_paint.js`, `summary.js`) žije v `../shared/lib/` — viz [../docs/decisions.md](../docs/decisions.md).
- Naměřené chování Illustratoru, na kterém nástroj stojí, a sondy, které ho
  zopakují: [docs/findings.md](docs/findings.md). Ruční testy:
  [docs/manual-test.md](docs/manual-test.md). Návrh:
  [../docs/specs/2026-10-29-batch-text-edit-design.md](../docs/specs/2026-10-29-batch-text-edit-design.md).

## Changelog

Viz [CHANGELOG.md](CHANGELOG.md).
