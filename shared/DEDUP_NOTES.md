# Dedup spike findings (2026-07-22)

Poznatky z throwaway spiku NS-injektáže (kód spiku zahozen, historie čistá).
Laťka spiku splněna: oba buildy zelené, GM 7/7, ZSM 13/13 nad jedním sdíleným
`ui_state`. Mechanismus potvrzen — ostrý dedup staví na tomto.

## Behavior changes (⚠ patří do CHANGELOGu při release — uživatel je pocítí)

Průběžný seznam vědomých změn chování z dedupu. Doplňovat u každé další divergence.

1. **ui_state / GM** (commit `2e995ef`): GM přijímá ZSM bracketed-name rejection —
   jakékoli `[hranaté]` jméno presetu je nově rezervované, dřív jen
   `[Default]`/`[Last Settings]`.
2. **json2 / ZSM** (commit dedupu json2): ZSM přebírá GM (úplný Crockford) —
   `JSON.stringify` nově respektuje replacer (dřív tiše ignorován, chybějící
   plumbing) a instaluje `Date.prototype.toJSON` → Date se serializuje jako
   ISO-8601 string (dřív `{}`). Obě změny = posun k nativní JSON sémantice.
   Dnešní produkční kód ani jednu cestu nepoužívá.

## Non-dedup decisions (vědomě NEdedupováno)

**Princip:** dedup jen tam, kde platí „oprav jednou místo N-krát". Když je
divergence doménová (oprava v jednom nástroji by se druhého stejně netýkala),
je vynucený sdílený modul špatná abstrakce — trvale sváže nezávislé domény.
Špatná abstrakce je dražší než duplicita.

1. **storage.js** (rozhodnuto 2026-07-23): divergence je doménová, ne copy-drift.
   Měření: 123 vs 118 kód-řádků, 153 diff řádků (~65 %). Per-tool: cesty
   (GrommetMarks/ vs ZSM složka + legacy soubor), chybová sémantika save
   (GM alert vs ZSM log+checked write/close), migrace = čistá doména každého
   nástroje (GM: offsety/jednotky/sentinely; ZSM: thru/kiss→layers). Společná
   jen ~25–30ř. kostra propletená s doménou. Pozn.: audit odhadoval
   „sjednotitelné s malým úsilím" — měření vyvrátilo (druhý omyl auditu po
   „GM nemá testy").
   - Prověřený sub-kandidát **readJsonFile**: 6řádkové čtecí jádro je v obou
     textově identické a pojmenovatelné, přesto NEextrahováno — 6 řádků
     nepřeváží fixní režii sdíleného modulu (build wiring, testy, ES3 scanner,
     ceremonie kolem každé změny).

2. **validation.js** (rozhodnuto 2026-07-23): NEdedupováno. Měření: GM 110 vs
   ZSM 60 kód-řádků, 148 diff řádků z ~170 (≈ 87 %). Odlišná signatura
   (`validate(cfg, L)` vs `validate(raw, prev, L)`), odlišný návratový tvar
   (`{valid, settings}` vs `{valid, settings, errors[]}`), odlišný algoritmus
   (imperativní early-return vs data-driven smyčka s mode-scopingem a agregací
   chyb). Architektonická volba per nástroj, ne drift — společné je jen jméno
   funkce. GM navíc drží validateNumber zde, ZSM v utils.

3. **utils.js** (rozhodnuto 2026-07-23): NEdedupováno — měřeno funkci po funkci,
   žádná nesplňuje „oprav jednou platí i tam". `log`/`error` se rozešly vědomě
   (ZSM debug gate + lokalizovaný prefix vs GM bezpodmínečný log + SCRIPT_NAME),
   `presetEquals` je schema-doména (tělo = schema nástroje), `deepCopy` má
   JEDINÉHO konzumenta (GM) → sdílení by byl přesun, ne dedup (kód vzdálený od
   jediného uživatele + vazba navíc, nulový přínos). ZSM geometrie
   (mm2pt/getSF/…) je doména.

**Architektonická poznámka:** shared `ui_state` konzumuje `NS.Utils.presetEquals`
přes injektáž = **shared závisí na tool-provided kontraktu, ne naopak**. Zdravý
směr závislosti a důvod, proč presetEquals musí zůstat lokální.

**Bilance dedupu: 2 z 5 sdíleno** (ui_state, json2), 3 lokální (storage,
validation, utils). Klíčové poučení: **„překryv je ve jménech, ne v chování"**
— stejné jméno signalizuje stejnou ROLI v architektuře, ne stejnou implementaci.
Audit vyvrácen 4× (GM testy → storage → validation → utils), protože měřil
textovou podobnost. Jediné platné kritérium pro dedup: „oprav jednou platí i tam."

## Samostatný nález (NEŘEŠIT během dedupu)

**grommet-marks nemá žádný ES3 compliance scanner** — GM `src/` není ES3
kontrolované vůbec (ZSM `test_es3_compliance.js` hlídá jen ZSM src/ + shared/lib/).
Není to regrese z dedupu — dřívější díra. Kandidát na doplnění po dokončení
dedupu (sdílené moduly už kryje ZSM scanner, jedna kontrola stačí — neduplikovat).

## Metodika: testování polyfillů

**Polyfilly a cokoli modifikující prototypy testovat v IZOLOVANÉM procesu** —
jinak si varianty půjčují chování a vzniká falešná shoda. Stalo se u prvního
json2 A/B testu: GM polyfill nainstaloval `Date.prototype.toJSON` do sdíleného
procesu, ZSM (načtený po něm) si ho půjčil a vypadal ekvivalentně. Izolace =
jeden `node` proces na variantu (+ u ES3 simulace `delete Date.prototype.toJSON`
před načtením).

## Mechanismus: factory s namespace parametrem (volba b)

Sdílený lib soubor nedeklaruje žádný namespace — definuje factory funkci, která
namespace dostane zvenčí jako argument:

```js
function buildUIState(NS) {
    NS.UIState = {
        // ... tělo modulu; sourozenci VŽDY přes NS.* (NS.Utils, NS.Config) ...
    };
}
```

- **Build** (oba nástroje): `cat` sdíleného souboru na místě původního lokálního
  + hned za ním přidat řádek volání — `buildUIState(GM);` resp. `buildUIState(ZSM);`.
  Volání MUSÍ přijít až po závislostech (NS.Utils…) — stávající pořadí modulů
  v obou build.sh to splňuje.
- **Testy**: každý test-load = `eval(readFileSync(<shared path>))` + jeden řádek
  `buildUIState(GM/ZSM);`. Žádná textová substituce, žádný zásah do eval scope.
- Proč ne (a) sed-placeholder: křehké (word-boundary, komentáře/stringy),
  substituce nutná v buildu I před každým test-evalem.
- Proč ne (c) společný APP. namespace: blast radius = kompletní rename obou
  projektů včetně core/ui/main a všech testů; není to dedup lib.
- ES3: `function` deklarace (hoisted), jen funkce + objekty. Bez let/const/arrow.

Test-loady ui_state (5 míst k přepojení při ostrém dedupu):
GM: `tests/test_ui_state.js`, `tests/test_ui_dialog.js`;
ZSM: `tests/test_ui_state.js`, `tests/test_e2e_workflow.js`, `tests/test_ui_layout.js`.

## ui_state: 2 body-divergence — VYŘEŠENO (2026-07-22)

1. Locale klíč sjednocen na `PRESET_DEFAULT` — commit
   `refactor(locale): unify preset-default key across GM/ZSM` (58c2e16, rename
   5 míst v GM; ZSM už kanonický tvar měl).
2. Reserved-name: přijat ZSM regex `/^\[.+\]$/` jako kanonický.
   **⚠ VĚDOMÁ ZMĚNA CHOVÁNÍ GM** (rozhodnutí uživatele, 2026-07-22): GM nově
   odmítá VŠECHNA `[hranatá]` jména, dřív jen `[Default]`/`[Last Settings]`.
   Charakterizační síť to nezachytila (GM žádné `[x]` jako validní netestoval) —
   proto zaznamenáno zde i v commit message dedup commitu.
3. Dedup proveden: `shared/lib/ui_state.js` (factory), lokální kopie smazány,
   builds + 5 test-loadů přepojeny, `tools/check-dist-fresh.sh` naučen shared/
   (temp-build mirror + --staged trigger).

## Původní analýza divergencí (historie)

1. **Reserved-name policy** — GM: `name === "[Default]" || name === "[Last Settings]"`;
   ZSM: `/^\[.+\]$/.test(name)` (jakékoli [hranaté] jméno). ZSM regex je **SUPERSET**
   a ZSM test na něj přímo asertuje („Fully-bracketed names reserved") — GM žádný
   opačný asert nemá. **Kanonická volba pro _core: ZSM regex.**
2. **Locale klíč** pro zobrazení defaultu — GM: `L.DEFAULT_PRESET`,
   ZSM: `L.PRESET_DEFAULT`. Sjednotit na **jedno** jméno klíče a upravit locale
   moduly + test stuby pod charakterizační sítí (GM stub v test_ui_state.js,
   ZSM asertuje v test_locale.js, test_ui_layout.js, test_ui_state.js).
   Spike to řešil dočasným dual-key fallbackem — v ostrém dedupu NEpoužívat,
   vybrat kanonický klíč.

## Prostředí

- **Per-worktree `node_modules`** — worktree sdílí `.git`, ale ne gitignored
  složky. Nový worktree ⇒ `npm install` v `zund-summa-marks/` (jinak
  `test_properties` padá na `Cannot find module 'fast-check'`).
- ZSM build stampuje `date(1)` do hlavičky distu ⇒ každý rebuild v jiný den
  špiní strom (GM už má deterministické datum z posledního src commitu).
  Oprava patří do release kroku (Lekce 6), ne do dedupu.
