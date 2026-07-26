# Konvence — extendscript-automation

Vytěženo z kódu (2026-07-26), ne vymyšleno dopředu. Popisuje, co tři nástroje
v tomto repu **reálně dělají**. Když se kód a tento dokument rozejdou, měř kód.

Rozdělení podle **vynutitelnosti** — ať je poznat, co hlídá stroj a co disciplína:

| značka | co to znamená |
|---|---|
| **ENFORCED** | selže build nebo test, když to porušíš |
| **TEMPLATE** | v `templates/` — kopíruj, nepiš znovu |
| **GUIDANCE** | nikdo to nehlídá; drž se toho, nebo to změň vědomě |

---

## ENFORCED — hlídá stroj

- **Parity guard verze** — build spadne, když `package.json` ≠ verzní konstanta
  v `src/constants.js` (GM) / `src/config.js` (ZSM, BRE). Běží ve všech třech buildech.
- **ES3 compliance** — `zund-summa-marks/tests/test_es3_compliance.js` skenuje ZSM
  `src/` **a** `shared/lib/` na zakázané konstrukce (`let`/`const`/arrow/`Array.map`…).
  Vendorovaný `json2.js` je vyloučen (cizí kód nelintujeme).
  ⚠ GM a BRE zatím scanner nemají — viz `decisions.md`.
- **Testy** — `npm test` (GM 7 suit, ZSM 13 suit); `npm run verify` = build + test.

## TEMPLATE — kopíruj z `templates/`

- `module-header.js` — hlavička modulu + JSDoc vzor + ES3 připomínka
- `README.md` — kostra README nástroje
- `CHANGELOG.md` — Keep a Changelog kostra

Soubor, který se kopíruje, nemůže driftovat od sebe sama.

---

## GUIDANCE — Kód

**Hlavička distu** (generuje build, needituj ručně): `Script / Version / Author /
Updated` + Copyright + `Description`. `Author` je vždy **`Ladislav Osvald`** (plné
jméno; `Osva1d` je git identita, ne autor produktu).

**`Updated:` = datum verze**, ne datum poslední editace. Musí odpovídat datu
poslední položky v `CHANGELOG.md`. Build ho stampuje **deterministicky** z data
posledního commitu vstupů (`src/` + `../shared/lib`), ne z `date(1)` — jinak každý
rebuild v jiný den mění dist bez změny obsahu.

**Hlavička modulu v `src/`:**
```js
// ------------------------------------------------------------------------
// Module: NS.Name — co modul vlastní
// Part of: Illustrator <Tool>
// Depends on: NS.Dep, NS.Dep     (nebo "—")
// ------------------------------------------------------------------------
```

**Namespace** — 2–3písmenný prefix (`GM`, `ZSM`, `BRE`), guard `var NS = NS || {};`
v každém modulu, žádné globální proměnné mimo namespace.

**Struktura `src/`** — `config.js` (uživatelská nastavení, `getDefaults()`),
`core.js` (čistá matematika, testovatelná bez DOM), `ui.js` (ScriptUI),
`locale.js` (EN/CS stringtable), `main.js` (entry point, vždy poslední v build
orderu). `lib/` = pure utility bez DOM. Doménové moduly navíc podle nástroje
(`illustrator.js`, `draw.js`, `bounds.js`).

- **`constants.js` má jen GM** — a je to v pořádku: odděluje *pevné hodnoty*
  (názvy vrstev, sentinely, unit faktory) od *uživatelských nastavení* v `config.js`.
  ZSM a BRE tolik pevných hodnot nemají. Vynucovat symetrii = churn za vzhled.

**Entry point je `main.js`** (ne `.jsx`) — obsah je plain JS, přípona `.jsx`
nenesla informaci.

**Komentáře anglicky** (99 % kódu). JSDoc na veřejné API modulu, inline `//` na
*proč*, ne *co*. České texty patří do `locale.js`, ne do komentářů.

**ES3 only** — `var`, `function`. Žádné `let`/`const`/arrow/template literals/
`Array.prototype.map`. JSON polyfill je v `shared/lib/json2.js`, v build orderu vždy první.

## GUIDANCE — Sdílené jádro (`shared/lib/`)

Jen dva moduly: `json2.js` (prostý soubor, bez namespace) a `ui_state.js`
(namespace-neutrální factory `buildUIState(NS)`, build za ni připojí volání).

**Kritérium sdílení: „oprav jednou platí i tam."** Textová podobnost nestačí —
`storage`, `validation` a `utils` zůstávají lokální, protože jejich divergence je
doménová. Odůvodnění v [`decisions.md`](decisions.md).

## GUIDANCE — Git

**Conventional Commits** — 100 % commitů. Typy dle četnosti: `feat`, `docs`, `fix`,
`refactor`, `chore`, `test`, `build`, `style`, `revert`.

- **`merge:`** je vědomé lokální rozšíření — Conventional Commits merge commity
  nepokrývá. Ponecháno záměrně.
- `polish:` / `harden:` (historické) → dopředu mapuj na `style` / `refactor` / `fix`.

**Scope = plný název adresáře nástroje** (`grommet-marks`, ne `gm`;
`zund-summa-marks`, ne `zsm`). Historie nese obojí — nepřepisuje se, platí dopředu.

**Tagy** — slash-namespace `<nástroj>/vX.Y.Z`, **anotované** (`git tag -a`).
Legacy `gm-v4/5/6.0.0` jsou lightweight a zůstávají jak jsou.

**Větve** — `feat/`, `fix/`, `refactor/`, `docs/` + krátký popis. Merge do `main`
vědomě `--no-ff` (jedna vratná hranice, čitelná závorka v grafu).

**Identita** — `Osva1d <143696990+Osva1d@users.noreply.github.com>`, globálně.

## GUIDANCE — Dokumentace

**Root:** `README.md` + `README.cs.md` (rozcestník, plná parita), `LICENSE`,
`docs/decisions.md` (architektonická rozhodnutí a proč).

**Per-nástroj:** `README.md` (česky), `CHANGELOG.md`, volitelně
`docs/ARCHITECTURE.md` a `docs/MANUAL_TEST.md` (mají GM a ZSM; BRE ne — menší nástroj).

**CHANGELOG** — Keep a Changelog, česky, **z pohledu uživatele skriptu**.
Jeden zdroj pravdy: README na něj jen odkazuje. Interní řadu před veřejným vydáním
uveď pod „Před veřejným vydáním (interní řada)" s poznámkou o diskontinuitě čísel.

**Kdy psát entry:** když se změní chování, které uživatel pocítí. Refaktor bez
změny chování do CHANGELOGu nepatří (patří do commit message).

**Kdy bumpovat:** patch = oprava bez změny API; minor = nová schopnost nebo změna
chování; major = rozbití existujících presetů/dat. Bump = `package.json` + verzní
konstanta + nová položka v CHANGELOGu + `Updated:` na datum verze.

## GUIDANCE — Distribuce

`dist/` se **necommituje** (gitignored) — artefakty jsou GitHub Release assety,
`src/` je zdroj pravdy. Jeden Release per nástroj, `.jsx` nahrán ručně navrch
k automatickému „Source code" zipu.
