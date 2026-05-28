# Grommet Marks v4.1.0 — Cycle 2: UI Redesign (Canonical Column)

> Cyklus 2 ze dvou. Tento cyklus: vizuální redesign dialogu + zbylý tech debt.
> Cyklus 1 (v4.0.0): architektura, persistence, naming, testy — hotovo.

---

## Cíl

Přepracovat UI dialogu Grommet Marks vlastním směrem, odlišeným od komerčního
Mars Premedia (původní inspirace), při zachování ScriptUI best practices
(`extendscript-ui-standards`, `ui-ux-principles`). Výsledek: GM v4.1.0.

**Zvolený směr: kanonický jednosloupcový layout (Concept A).**

> **Pozn. k vývoji rozhodnutí:** Nejprve byl prototypován *schématický náhled*
> (Concept B) — nakreslený diagram artboardu s aktivními hranami. Po vizuálním
> vyhodnocení (HTML mockupy variant A/B/C) byl náhled vyhodnocen jako nadbytečný
> pro uživatele, který už zná význam hran, a nesl technické riziko (`onDraw`
> kreslení napříč verzemi Illustratoru). Zvolen čistý kanonický sloupec.
> Stejný princip (jednosloupcový layout) potvrzen i pro ZSM — to už ho má,
> takže ZSM beze změny.

---

## Layout (shora dolů)

```
Window("dialog") — "Illustrator Grommet Marks v4.1.0"
 ├─ Panel: Předvolby            Načíst / Uložit / Uložit jako… / Smazat
 ├─ Panel: Hrany                offset X/Y + 4 kompaktní edge řádky, mirror inline
 ├─ Panel: Značka               jednotky / velikost / tvar
 ├─ Panel: Vzhled               vrstva / výplň / obrys / tloušťka
 ├─ Group: Footer               šedý copyright
 └─ Group: Tlačítka             Reset (vlevo) · Storno · OK (vpravo)
```

Rozměry dle `extendscript-ui-standards`: dialog margins 20, panel margins 15,
spacing 8–12, numeric inputs 44–60 px. Hrany jsou kompaktní řádky; oddělovač
odděluje horní/levou od dolní/pravé.

---

## Změny modulů

**`src/ui.js`** — `buildDialog` přepsán na jednosloupcový layout. `buildEdgePanel`
přijímá volitelné `mirrorLabel`/`mirrorTip`: mirror checkbox uvnitř edge skupiny
(TD-001); `_prevEnabled` obnova stavu při vypnutí mirror (TD-003). Sdílený
`onUserChange` hook = modified indicator + live validace.

**Kontrakt:** `gatherAll()`/`applyAll()` zachovávají tvar výstupu → `main.js`,
`GM.Validation`, `GM.Storage` beze změny.

**`src/locale.js`** — přidány `EDGES_PANEL`, `EDGE_TOP/LEFT/BOTTOM/RIGHT`.
**`src/constants.js`** — `VERSION` 4.1.0.

---

## Tech debt

- **TD-001** (mirror mimo panel) → vyřešeno (mirror inline v `buildEdgePanel`).
- **TD-003** (mirror neobnovuje stav) → vyřešeno (`_prevEnabled`).
- **TD-002** (undo grouping) → **odloženo**; chybí spolehlivé cross-version API.

## Testy (pure moduly, Node)

- `test_ui_state.js` — validate/save/saveAs/delete/select/list.
- `test_validation.js` — validateNumber + validate (valid/invalid, mirror-aware).

Plus stávající `test_core_math.js`, `test_storage_migrations.js`. Celkem 4 suity.

---

## Verze

**v4.1.0** — MINOR (nová funkce / UI, bez breaking změny persistence/schématu).

---

*Schváleno: 2026-05-28 (pivot na Concept A: 2026-05-28)*
