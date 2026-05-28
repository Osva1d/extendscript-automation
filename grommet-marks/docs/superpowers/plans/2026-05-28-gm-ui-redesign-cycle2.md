# Grommet Marks v4.1.0 — Cycle 2 Implementation Plan

> **For agentic workers:** executed inline in-session, commit per task.
> Spec: `docs/superpowers/specs/2026-05-28-gm-ui-redesign-cycle2-design.md`

**Goal:** Redesign the dialog around an original schematic-preview concept
(diverging from Mars Premedia), resolve TD-001/TD-003, defer TD-002, and extend
the test suite. Result: v4.1.0.

**Architecture:** New pure `GM.PreviewModel` computes diagram geometry (Node-
testable); `ui.js` renders it via ScriptUIGraphics and reflows the layout to
`[preview | edges]` with mirror controls moved inside their edge groups. The
`gatherAll()/applyAll()` contract with `main.js` is preserved.

**Tech Stack:** ExtendScript (ES3), ScriptUI, Node.js (tests), bash (build).

**Git:** branch `gm-cycle2-ui`; rollback tag `gm-v4.0.0`.

---

### Task C2-1: Bump version → 4.1.0
- `package.json`, `src/constants.js` (`VERSION`), `tools/build.sh` header. Build. Commit.

### Task C2-2: GM.PreviewModel (TDD)
- Write `tests/test_preview_model.js` (fail), implement `src/lib/preview_model.js`,
  register suite in `tests/run_all.sh`. Cover mirror resolution, dot counts,
  `DISPLAY_CAP`, all-off, bounds, robustness. Test. Commit.

### Task C2-3: Wire preview_model into build
- Add `lib/preview_model.js` to `tools/build.sh` concat (after `lib/ui_state.js`).
  Build, confirm dist contains `GM.PreviewModel`. Commit.

### Task C2-4: Locale keys
- Add `EDGES_PANEL`, `PREVIEW_PANEL`, `PREVIEW_ACTIVE_EDGES`, `PREVIEW_NONE`,
  `EDGE_TOP/LEFT/BOTTOM/RIGHT` to EN + CS (synchronized). Build. Commit.

### Task C2-5: GM.UIState tests
- `tests/test_ui_state.js` + register. Test. Commit.

### Task C2-6: GM.Validation tests
- `tests/test_validation.js` + register. Test. Commit.

### Tasks C2-7 / C2-8 / C2-9: ui.js redesign (one cohesive commit)
- `buildEdgePanel`: optional mirror inline (TD-001), `_prevEnabled` restore
  (TD-003), `onChange` hook.
- Preview panel: `previewCanvas.onDraw` via `GM.PreviewModel` + ScriptUIGraphics;
  `redrawPreview()` + text-summary fallback; wire shared `onUserChange`.
- Reflow to `[preview | edges]`; offsets into Edges panel. Add
  `GM.CONSTANTS.PREVIEW`. Preserve `gatherAll`/`applyAll`. Build + test. Commit.

### Task C2-10: Docs + final verify
- Update `ARCHITECTURE.md`, `TECH_DEBT.md` (TD-001/003 resolved, TD-002 deferred),
  `TEST_PLAN.md` (TC7/TC8 + v4.1.0). Create this spec/plan. `npm run verify`,
  rebuild dist. Commit.

---

## Verification
- `npm run verify` — build + 5 suites (core_math, storage_migrations,
  preview_model, ui_state, validation) all pass.
- Version consistency: `grep "4.1.0" package.json src/constants.js tools/build.sh`.
- Manual P0 in Illustrator: `TEST_PLAN.md` TC7 (preview renders/updates/degrades)
  + TC8 (mirror inline + restore) + regression on generation & presets.
