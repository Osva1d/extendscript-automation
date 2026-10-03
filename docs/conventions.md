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

- **Parity guard verze** — build spadne, když se rozejde `package.json` ↔ verzní
  konstanta (`src/constants.js` u GM, `src/config.js` u ZSM/BRE/TE) ↔ **nejnovější
  položka v `CHANGELOG.md`**. Běží ve všech čtyřech buildech. Chytá „release
  napůl": verze bumpnutá, changelog zapomenutý (nebo naopak).
- **Commit na `main`** — `tools/hooks/pre-commit` ho odmítne; merge do main pustí
  (rozpozná probíhající merge přes `MERGE_HEAD`). Instaluje `tools/install-hooks.sh`.
- **Force push na `github`** — `tools/hooks/pre-push` odmítne non-fast-forward push
  na veřejný remote. Force detekuje **nepřímo** (`git merge-base --is-ancestor`),
  protože hook nevidí příznaky příkazové řádky. Na `origin` (Codeberg, privátní
  záloha) force projde — tam je legitimní.
- **ES3 compliance** — `zund-summa-marks/tests/test_es3_compliance.js` skenuje ZSM
  `src/` **a** `shared/lib/` na zakázané konstrukce (`let`/`const`/arrow/`Array.map`…).
  Vendorovaný `json2.js` je vyloučen (cizí kód nelintujeme).
  ⚠ GM a BRE zatím scanner nemají — viz `decisions.md`.
- **Testy** — `npm test` v adresáři nástroje (GM, ZSM, tile-export; BRE testy nemá);
  `npm run verify` = build + test.

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

**`Updated:` = datum posledního commitu vstupů** (`src/` + `../shared/lib`), ne
datum releasu. Build ho stampuje **deterministicky** z gitu, ne z `date(1)` —
jinak každý rebuild v jiný den mění dist bez změny obsahu. Pole je **generované,
takže nemůže driftovat → nekontroluje se**.

> **Proč tady jinak než v `applescript-automation`.** Tam `Updated:` znamená
> *datum verze* a kontroluje se (`tools/check-versions.sh`). Rozdíl není nedodělek,
> ale důsledek mechaniky: tady pole generuje build, tam ho člověk píše ručně.
> Navíc `dist/` se od 1.1.0 necommituje — k uživateli se dostanou jen release
> buildy z release commitu, kde `Updated` ≈ datum releasu automaticky. Rozpor
> vzniká jen v lokálních dev buildech, které nikdo jiný nevidí.
>
> Pravidlo „`Updated` = datum verze" bylo původně napsané pro oba repy — bez
> změření, jak build reálně funguje. Měření ho vyvrátilo (viz `decisions.md`,
> sekce o vzorcích).

**Hlavička modulu v `src/`:**
```js
// ------------------------------------------------------------------------
// Module: NS.Name — co modul vlastní
// Part of: Illustrator <Tool>
// Depends on: NS.Dep, NS.Dep     (nebo "—")
// ------------------------------------------------------------------------
```

**Namespace** — 2–3písmenný prefix (`GM`, `ZSM`, `BRE`, `TE`), guard `var NS = NS || {};`
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

**Kódování** — zdroj je UTF-8 bez BOM, build distu předřadí BOM a
`#target illustrator`. České texty patří do `locale.js` jako literály, ne
`\uXXXX`. BOM je pojistka, ne podmínka: AI 30.8.2 čte češtinu správně i bez
něj, běh z menu a starší verze ale změřené nejsou — z distu ho neodstraňuj.

**Živé kolekce DOM** — smyčka, která kolekci mění (`move`, `remove`), jde přes
pole zkopírované předem, ne přímo přes kolekci: dopředná smyčka přeskočí každý
druhý prvek. Kolekce na úrovni dokumentu (`doc.pathItems`…) navíc zaostávají
do `app.redraw()`. Obojí je změřené v
[`extendscript-engine-facts.md`](extendscript-engine-facts.md).

## GUIDANCE — Sdílené jádro (`shared/lib/`)

Jen dva moduly: `json2.js` (prostý soubor, bez namespace) a `ui_state.js`
(namespace-neutrální factory `buildUIState(NS)`, build za ni připojí volání).

**Kritérium sdílení: „oprav jednou platí i tam."** Textová podobnost nestačí —
`storage`, `validation` a `utils` zůstávají lokální, protože jejich divergence je
doménová. Odůvodnění v [`decisions.md`](decisions.md).

## GUIDANCE — Vývojové nástroje (repo-level)

Nic z toho nevstupuje do buildu ani do `dist/` — build zůstává `cat` modulů.
Instalace: `npm install` v kořeni repa.

| příkaz | co dělá | kdy |
|---|---|---|
| `npm run lint` | ESLint na `*/src/**` + `shared/lib/**` — chybějící ES3 metody, syntaxe, neznámé globály | před commitem |
| `tools/typecheck.sh <soubory>` | typová kontrola proti Illustrator DOM typings | na **nově psaný** kód |
| `tools/ai-eval.sh -e '<výraz>'` | spustí ExtendScript v běžícím Illustratoru a vrátí hodnotu | když je otázka „existuje tohle API / co to vrací" |

**Dělba práce mezi lintem a typecheckem není libovolná.** ESLint vidí jména
vlastností, ne typy — `[1,2].indexOf()` od `"abc".indexOf()` nerozliší, a to
druhé je legitimní (viz `extendscript-engine-facts.md`). Typecheck to rozliší,
protože typings modelují skutečné ExtendScript `Array`. Naopak `.map()` na
netypovaném parametru chytí jen ESLint. Obojí, ne jedno.

`tools/typecheck.sh` **vyžaduje jména souborů**. Puštěný na celé repo hlásí
~29 nálezů ve funkčním kódu, kde má TS technicky pravdu (downcasty v
`bounds.js`, zúžení `Color` v `draw.js`, `selection: number | ListItem` v
`ui.js`). Srovnat je je samostatný, dobrovolný úkol — ne podmínka.
`jsconfig.json` má proto `checkJs: false`: editor dává napovídání bez červených
vlnovek nad fungujícím kódem.

Naměřené chování enginu, o které se ta konfigurace opírá, je v
[`extendscript-engine-facts.md`](extendscript-engine-facts.md). Když se něco
z toho bude zdát divné, přeměř to — `tools/ai-eval.sh` je na to.

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
`docs/architecture.md` a `docs/manual-test.md` (mají GM a ZSM; tile-export má
`docs/manual-test.md` a k němu `docs/findings.md`; BRE nic — menší nástroj).

**Kam s dokumentem:** živý dokument jednoho nástroje — ruční testy, architektura,
otevřené nálezy — patří do `<nástroj>/docs/`, ať má nástroj své dokumenty
pohromadě. Datovaný snímek — code review, studie, návrh — patří do kořenového
`docs/reports/` nebo `docs/specs/` s datem v názvu: popisuje jeden okamžik,
cituje se z kódu a z `decisions.md` a často přesahuje jeden nástroj (review ZSM
zahrnuje i `shared/lib/`). Snímky se po vzniku nepřesouvají.

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
