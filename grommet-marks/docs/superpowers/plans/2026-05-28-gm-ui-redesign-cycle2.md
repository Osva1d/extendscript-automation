# Grommet Marks v4.1.0 — Cycle 2 Implementation Plan

> **For agentic workers:** executed inline in-session, commit per task.
> Spec: `docs/superpowers/specs/2026-05-28-gm-ui-redesign-cycle2-design.md`

**Goal:** Redesign the dialog as a clean canonical single column (diverging from
Mars Premedia), resolve TD-001/TD-003, defer TD-002, and extend the test suite.
Result: v4.1.0.

**Architecture:** `ui.js` lays the dialog out as a single column (Předvolby /
Hrany / Značka / Vzhled / footer) with mirror controls moved inside their edge
groups. The `gatherAll()/applyAll()` contract with `main.js` is preserved.

**Tech Stack:** ExtendScript (ES3), ScriptUI, Node.js (tests), bash (build).

**Git:** branch `gm-cycle2-ui`; rollback tag `gm-v4.0.0`.

---

## Decision history

Concept B (schematic preview) was prototyped first (`GM.PreviewModel` +
`onDraw`), then dropped after visual evaluation via HTML mockups — redundant for
expert users and carried cross-version drawing risk. Pivoted to Concept A
(canonical column). `GM.PreviewModel` and its test were removed.

---

## Tasks (as executed)

1. **C2-1** Bump version → 4.1.0 (`package.json`, `constants.js`, `build.sh`).
2. **C2-4** Locale keys: `EDGES_PANEL`, `EDGE_TOP/LEFT/BOTTOM/RIGHT` (EN+CS).
3. **C2-5** `tests/test_ui_state.js` + register.
4. **C2-6** `tests/test_validation.js` + register.
5. **C2-7** `buildEdgePanel`: mirror inline (TD-001), `_prevEnabled` restore
   (TD-003), `onChange` hook.
6. **Layout** `buildDialog` → canonical single column (Předvolby / Hrany /
   Značka / Vzhled / footer). Preserve `gatherAll`/`applyAll`.
7. **Docs + verify** update ARCHITECTURE / TECH_DEBT / TEST_PLAN; `npm run verify`.

> Tasks C2-2/C2-3/C2-8/C2-9 (preview model + schematic rendering) were
> implemented then reverted during the pivot — see git history on `gm-cycle2-ui`.

---

## Verification
- `npm run verify` — build + 4 suites (core_math, storage_migrations, ui_state,
  validation) all pass.
- Version consistency: `grep "4.1.0" package.json src/constants.js tools/build.sh`.
- Manual P0 in Illustrator: `TEST_PLAN.md` TC7 (mirror inline + restore) +
  regression on generation & presets; layout/spacing sanity in the single column.
