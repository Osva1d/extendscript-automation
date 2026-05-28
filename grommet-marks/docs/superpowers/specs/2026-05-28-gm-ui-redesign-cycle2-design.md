# Grommet Marks v4.1.0 — Cycle 2: UI Redesign (Schematic Preview)

> Cyklus 2 ze dvou. Tento cyklus: vizuální redesign dialogu + zbylý tech debt.
> Cyklus 1 (v4.0.0): architektura, persistence, naming, testy — hotovo.

---

## Cíl

Přepracovat UI dialogu Grommet Marks vlastním směrem, odlišeným od komerčního
Mars Premedia (původní inspirace), při zachování ScriptUI best practices
(`extendscript-ui-standards`, `ui-ux-principles`). Výsledek: GM v4.1.0.

Zvolený směr: **schématický náhled** — nakreslený diagram artboardu zobrazující
aktivní hrany a reprezentativní rozmístění ok, s ovládáním okolo.

---

## Layout (shora dolů)

```
Window("dialog") — "Illustrator Grommet Marks v4.1.0"
 ├─ Panel: Předvolby            load / Save / Save As / Delete
 ├─ Group (řádek):
 │    ├─ Panel: Náhled          custom-drawn schéma (~220×150) + textové shrnutí
 │    └─ Panel: Hrany           offset X/Y + 4 kompaktní edge řádky, mirror inline
 ├─ Panel: Značka               jednotky / velikost / tvar
 ├─ Panel: Vzhled               vrstva / výplň / obrys / tloušťka
 ├─ Group: Footer               šedý copyright
 └─ Group: Tlačítka             Reset (vlevo) · Storno · OK (vpravo)
```

Rozměry dle `extendscript-ui-standards`: dialog margins 20, panel margins ~12–15,
spacing 8–12, numeric inputs 44–60 px.

---

## Náhled (klíčový prvek)

- **Neblokující / enhancement-only** — dialog je plně funkční i bez náhledu.
- **Semi-live** — překresluje se při změně relevantních ovládacích prvků
  (enable hrany, mirror, počet/rozestup). Schématický, ne pixel-přesný.
- **Graceful degradation** — pokud `onDraw` na cílové verzi nekreslí spolehlivě,
  zůstává textové shrnutí ("Aktivní hrany: …") jako správný informační kanál.

### Moduly

**NOVÝ `src/lib/preview_model.js` → `GM.PreviewModel`** (pure, bez DOM, testovatelné):
- `compute(settings, canvasW, canvasH)` → `{ rect, dots:[{x,y,edge}], edges }`.
- Resolves mirror (bottom=top, right=left); per aktivní hranu emituje
  reprezentativní dots (count mode → `min(number, DISPLAY_CAP)`, spacing mode →
  `SPACING_COUNT`); dots jsou uvnitř `rect`.
- Vlastní geometrické konstanty v `CONFIG` (cap, počty, insety, margin).

**`src/ui.js`** — kreslení (`previewCanvas.onDraw` přes ScriptUIGraphics:
`rectPath`/`strokePath`, `ellipsePath`/`fillPath`), `redrawPreview()` přepočítá
model + aktualizuje shrnutí + vyvolá překreslení. Vizuální konstanty
(`WIDTH/HEIGHT/DOT_RADIUS/colors`) v `GM.CONSTANTS.PREVIEW`.

`buildEdgePanel()` — volitelné `mirrorLabel`/`mirrorTip`: mirror checkbox uvnitř
edge skupiny (TD-001); `_prevEnabled` obnova stavu (TD-003); `onChange` hook.

**Kontrakt:** `gatherAll()`/`applyAll()` zachovávají tvar výstupu → `main.js`,
`GM.Validation`, `GM.Storage` beze změny.

---

## Tech debt

- **TD-001** (mirror mimo panel) → vyřešeno (mirror inline v `buildEdgePanel`).
- **TD-003** (mirror neobnovuje stav) → vyřešeno (`_prevEnabled`).
- **TD-002** (undo grouping) → **odloženo**; chybí spolehlivé cross-version API.

## Testy (pure moduly, Node)

- `test_preview_model.js` — mirror, dot counts, cap, all-off, bounds.
- `test_ui_state.js` — validate/save/saveAs/delete/select/list.
- `test_validation.js` — validateNumber + validate (valid/invalid, mirror-aware).

Kreslení (`onDraw`) se ověřuje manuálně v Illustratoru (`TEST_PLAN.md` TC7/TC8).

---

## Verze

**v4.1.0** — MINOR (nová funkce, bez breaking změny persistence/schématu).

---

*Schváleno: 2026-05-28*
