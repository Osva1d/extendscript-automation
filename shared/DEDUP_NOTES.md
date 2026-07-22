# Dedup spike findings (2026-07-22)

Poznatky z throwaway spiku NS-injektáže (kód spiku zahozen, historie čistá).
Laťka spiku splněna: oba buildy zelené, GM 7/7, ZSM 13/13 nad jedním sdíleným
`ui_state`. Mechanismus potvrzen — ostrý dedup staví na tomto.

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
