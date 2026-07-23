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

## Otevřené body

- **GM nemá ES3 compliance scanner** — GM `src/` není ES3 kontrolované (ZSM
  `test_es3_compliance.js` hlídá ZSM src/ + shared/lib/). Dřívější díra, ne
  regrese dedupu. Kandidát na doplnění; sdílené moduly už kryje ZSM scanner —
  neduplikovat.
- **Dev prostředí:** worktree sdílí `.git`, ale ne gitignored složky — nová
  worktree ⇒ `npm install` v `zund-summa-marks/` (jinak `test_properties` padá
  na chybějící `fast-check`).
