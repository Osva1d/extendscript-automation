# Architecture decisions — shared core

Rozhodnutí z deduplikace sdíleného kódu (2026-07, větev `feat/core-dedup`,
merge `48a5c67`). Zaznamenává CO platí a PROČ; průběh viz git historie.

## Mechanismus sdílení: factory s namespace parametrem

Sdílený lib soubor (`shared/lib/`) nedeklaruje žádný namespace — definuje
factory funkci, která namespace dostane zvenčí jako argument:

```js
function buildUIState(NS) {
    NS.UIState = {
        // ... tělo modulu; sourozenci VŽDY přes NS.* (NS.Utils, NS.Config) ...
    };
}
```

- **Build** (oba nástroje): `cat` sdíleného souboru + hned za ním řádek volání —
  `buildUIState(GM);` resp. `buildUIState(ZSM);`. Volání MUSÍ přijít až po
  závislostech (NS.Utils…) — pořadí modulů v build.sh.
- **Testy**: `eval(readFileSync(<shared path>))` + jeden řádek `buildUIState(NS);`.
  Žádná textová substituce, žádný zásah do eval scope.
- Zavrženo (a) sed-placeholder: křehké (word-boundary, komentáře/stringy),
  substituce nutná v buildu i před každým test-evalem. Zavrženo (c) společný
  `APP.` namespace: kompletní rename obou projektů včetně core/ui/main a testů.
- ES3: `function` deklarace (hoisted), jen funkce + objekty. Bez let/const/arrow.
- Výjimka **json2**: nemá namespace (definuje globální `JSON`) → prostý sdílený
  soubor bez factory, v buildu VŽDY první (vše za ním smí používat JSON).

**Směr závislosti:** shared `ui_state` konzumuje `NS.Utils.presetEquals` přes
injektáž = shared závisí na tool-provided kontraktu, ne naopak. Proto
presetEquals (schema-doména) MUSÍ zůstat lokální v každém nástroji.

## Behavior changes (podklad pro CHANGELOG)

1. **ui_state / GM** (commit `2e995ef`): GM přijímá ZSM bracketed-name rejection —
   jakékoli `[hranaté]` jméno presetu je rezervované, dřív jen
   `[Default]`/`[Last Settings]`. Vědomé rozhodnutí; charakterizační síť to
   nezachytila (GM žádné `[x]` jako validní netestoval).
2. **json2 / ZSM** (commit `5eb1cfb`): ZSM přebírá GM (úplný Crockford) —
   `JSON.stringify` respektuje replacer (dřív tiše ignorován) a instaluje
   `Date.prototype.toJSON` → Date se serializuje jako ISO-8601 (dřív `{}`).
   Posun k nativní JSON sémantice; produkční kód ani jednu cestu aktuálně nepoužívá.

Kanonické volby: reserved-name = ZSM regex `/^\[.+\]$/` (superset); locale klíč
= `PRESET_DEFAULT` (prefix-first konvence, commit `58c2e16`); json2 = GM verze
(ZSM kopie měla stripnutý replacer plumbing — poškození, ne designová volba).

## Non-dedup decisions (vědomě NEsdíleno)

**Princip:** dedup jen tam, kde platí „oprav jednou místo N-krát". Když je
divergence doménová (oprava v jednom nástroji by se druhého stejně netýkala),
je vynucený sdílený modul špatná abstrakce — trvale sváže nezávislé domény.
Špatná abstrakce je dražší než duplicita.

1. **storage.js**: divergence doménová, ne copy-drift. Měření: 123 vs 118
   kód-řádků, 153 diff (~65 %). Per-tool: cesty (GrommetMarks/ vs ZSM složka
   + legacy soubor), chybová sémantika save (GM alert vs ZSM log+checked
   write/close), migrace = doména každého nástroje (GM: offsety/jednotky/
   sentinely; ZSM: thru/kiss→layers). Společná jen ~25–30ř. kostra propletená
   s doménou. Sub-kandidát **readJsonFile** (6 identických řádků) NEextrahován —
   nepřeváží fixní režii sdíleného modulu (build wiring, testy, scanner).
2. **validation.js**: GM 110 vs ZSM 60 kód-řádků, 148 diff z ~170 (≈ 87 %).
   Odlišná signatura (`validate(cfg, L)` vs `validate(raw, prev, L)`), návratový
   tvar (`{valid, settings}` vs `+errors[]`), algoritmus (imperativní
   early-return vs data-driven smyčka s mode-scopingem a agregací). Architektonická
   volba per nástroj — společné je jen jméno funkce.
3. **utils.js**: měřeno funkci po funkci, žádná nesplňuje kritérium. `log`/`error`
   rozešly vědomě (ZSM debug gate + lokalizovaný prefix), `presetEquals` je
   schema-doména, `deepCopy` má jediného konzumenta (GM) → sdílení by byl přesun,
   ne dedup. ZSM geometrie (mm2pt/getSF/…) je doména.

**Bilance: 2 z 5 sdíleno** (ui_state, json2). Klíčové poučení: **„překryv je ve
jménech, ne v chování"** — stejné jméno signalizuje stejnou ROLI v architektuře,
ne stejnou implementaci. Kritérium sdílitelnosti je sémantické („oprav jednou
platí i tam"), ne textová podobnost.

## Metodika: testování polyfillů

**Polyfilly a cokoli modifikující prototypy testovat v IZOLOVANÉM procesu** —
jinak si varianty půjčují chování a vzniká falešná shoda. Stalo se u prvního
json2 A/B testu: GM polyfill nainstaloval `Date.prototype.toJSON` do sdíleného
procesu, ZSM (načtený po něm) si ho půjčil a vypadal ekvivalentně. Izolace =
jeden `node` proces na variantu (+ u ES3 simulace `delete Date.prototype.toJSON`
před načtením).

## Vzorec: prosa selhává tam, kde je selhání tiché — třikrát naměřeno

Tři nezávislé případy, kdy **pravidlo existovalo, bylo správné, a stejně se
neuplatnilo**. Společné jim je, že porušení nic neohlásí:

1. **Noreply identita** (2026-07) — pravidlo bylo v `CLAUDE.md`, přesto se čtyři
   commity s osobním e-mailem dostaly do veřejného repa. Řešení: `git config
   --global` + GitHub „Block command line pushes that expose my email".
2. **Version drift** — verze duplikovaná v `package.json`, verzní konstantě,
   `Updated:` hlavičce a `CHANGELOG.md`. Parity guard kryje jen první dvě, zbytek
   driftoval (BRE README uvádělo 3.0.0 při skutečné 1.0.0).
3. **Commit přímo na `main`** (2026-07-26) — pravidlo „main je posvátná, práce
   začíná na větvi" se u úklidu konvencí neuplatnilo ani jednou ve dvou blocích
   commitů, v obou repech. Nikdo si toho nevšiml, protože nic nezaprotestovalo.

**Vyřešeno (2026-07-26):** `tools/hooks/` + `tools/install-hooks.sh` v obou
veřejných repech i v `cv-pipeline` — `pre-commit` odmítne commit na `main`
(merge pustí přes `MERGE_HEAD`), `pre-push` odmítne non-fast-forward push na
veřejný `github`. Version parity je rozšířený guard v `build.sh` (ES) resp.
`tools/check-versions.sh` (AS). Zásada: *když se pravidlo opakovaně poruší,
nahraď pravidlo mechanismem.*

## Druhý vzorec: pravidlo napsané bez změření mechaniky

Dvakrát se stalo, že pravidlo znělo rozumně, ale odporovalo tomu, jak systém
reálně funguje — a odhalilo to až měření, ne čtení:

1. **„Veřejné ES commity používají noreply"** (2026-07-25) — předpoklad převzatý
   z `CLAUDE.md`. Měření: všech 188 commitů neslo osobní e-mail; pravidlo nikdy
   nebylo aplikováno.
2. **„`Updated:` = datum verze, musí odpovídat CHANGELOGu"** (2026-07-26) —
   napsáno pro oba repy při auditu konvencí. Měření: v ES to pole **generuje
   build** z data posledního commitu `src/`, takže po každém commitu do `src/`
   se legitimně rozchází s datem releasu (ZSM: dist `2026-07-23` vs CHANGELOG
   `2026-06-28`). Kontrola podle původního pravidla by build okamžitě shodila.
   Opraveno: ES pole negeneruje drift → nekontroluje se; AS pole je ruční →
   kontroluje se. Dvě mechaniky, dvě pravidla — zdokumentováno v obou
   `conventions.md`.

Poučení: **konvenci vytěženou z kódu je pořád nutné ověřit proti mechanismu, který
ji vyrábí.** „Vidím to v souborech" nestačí, když ta hodnota vzniká automaticky.

## Otevřené body — samostatné úkoly (z auditu konvencí 2026-07-26)

Nálezy z měření napříč šesti skripty. **Vědomě neimplementováno** — každý je vlastní
úkol s vlastním rozsahem, ne příloha k úklidu konvencí.

1. **ES3 scanner chybí v GM a BRE** (N6) — hlídá jen ZSM
   (`tests/test_es3_compliance.js`, kryje i `shared/lib/`). GM a BRE `src/` není
   ES3 kontrolované. Dřívější díra, ne regrese. Řešení: rozšířit scanner na ostatní
   `src/` stromy, nebo ho povýšit na repo-level test.
2. **BRE nemá testy** (N7) — GM 7 suit, ZSM 13, BRE 0 (a jen `build` v npm scripts,
   chybí `test`/`verify`). Známá mezera; BRE je nejmenší nástroj, ale bez sítě.
3. **IIFE wrap jen v GM** (N16) — GM balí dist do `(function(){…})()`, ZSM a BRE
   nechávají globální scope. **GM vzor je věcně lepší**: ExtendScript engine drží
   globály mezi běhy, takže stale state z předchozího spuštění může ovlivnit další.
   Ale je to **funkční změna** — vyžaduje testy a ověření v Illustratoru, ne
   textovou úpravu buildu.
4. **`zund-summa-marks/docs/architecture.md` nese pre-rebaseline verze** — nadpis
   „v26.5.1" a „Aktuální verze: v26.5.0", zatímco veřejná řada je 1.0.0. Stejný
   drift, jaký se opravil v README changelogách; ARCHITECTURE se tehdy neměřilo.

## Otevřené body

- **GM nemá ES3 compliance scanner** — GM `src/` není ES3 kontrolované (ZSM
  `test_es3_compliance.js` hlídá ZSM src/ + shared/lib/). Dřívější díra, ne
  regrese dedupu. Kandidát na doplnění; sdílené moduly už kryje ZSM scanner —
  neduplikovat.
- **Dev prostředí:** worktree sdílí `.git`, ale ne gitignored složky — nová
  worktree ⇒ `npm install` v `zund-summa-marks/` (jinak `test_properties` padá
  na chybějící `fast-check`).
- **Version drift napříč soubory.** Verze žije ve víc místech (`package.json`,
  `src/constants.js`/`config.js`, README, CHANGELOG) a driftuje, pokud ji něco
  nehlídá. Build má parity guard `package.json` ↔ `constants.js`/`config.js`
  (funguje — build spadne při nesouladu), ale README/CHANGELOG pod žádnou
  kontrolou nejsou — proto drift vznikal právě tam (BRE README uvádělo 3.0.0 při
  skutečné 1.0.0). Řešení po releasu: buď verzi v README nezmiňovat (odkaz na
  CHANGELOG/Releases — částečně už uděláno), nebo README/CHANGELOG zahrnout do
  parity guardu.

## Sdílené jádro rozšířeno o geometrii značek (2026-09-13)

`ZSM.Core` přesunut do `shared/lib/cut_marks.js` jako `buildCutMarks(NS)`,
stejným vzorem jako `ui_state.js`.

**Proč se po roce otevírá to, co tenhle dokument uzavřel.** Kritérium je
„oprav jednou platí i tam". Geometrie registračních značek je čistá matematika
bez DOM a chyba v pozici značky je chyba v obou nástrojích — `zund-summa-marks`
i `tile-export` z ní počítají totéž. Dřívější návrhy na rozšíření sdíleného
jádra byly odmítnuty proto, že měřily **textovou podobnost** místo tohohle
kritéria; tady obstojí.

**Co sdílené není: kreslení.** `ZSM.Draw` je provázaný se správou řezacích
vrstev, kterou `tile-export` nemá a nepotřebuje. Sdílí se výpočet, ne render.

**Důkaz, že přesun nic nezměnil:** 13 suit ZSM prošlo před i po s identickými
čísly, včetně těch, které modul načítají — MATH 123/123, DRAW.RENDER 78/78,
PROPERTY 24/24.

**Bilance sdíleného jádra po této změně:** 3 moduly — `json2.js`,
`ui_state.js`, `cut_marks.js`.

**Doplněno 2026-09-25:** `calculateAll(s, b, scale)` má volitelný třetí
parametr — měřítko stránky. Tile-export kreslí značky do dočasného dokumentu,
který o ručním 1:N neví, a bez něj by značky u dokumentu 1:10 exportovaného 1:1
vyšly desetkrát menší (tile-export N11). ZSM parametr nepředává a měřítko si
dál bere z aktivního dokumentu, což je v něm správně. Zünd Summa Marks se do
tile-exportu nezapojuje jako druhý běh, ale přes tohle sdílené jádro
(rozhodnuto s uživatelem, `docs/reports/2026-09-25-maskovani-platu.md` §8).
