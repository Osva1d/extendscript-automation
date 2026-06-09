# Handoff — Zünd & Summa Marks (ZSM) v26.5.0 release

**Date:** 2026-06-09
**Project:** `~/Dev/Sandbox/_incubator/zund-summa-marks/` (Adobe Illustrator ExtendScript, ES3, namespace `ZSM.*`)
**Public mirror:** `~/Dev/Projects/extendscript-automation/` (GitHub `Osva1d/extendscript-automation`, remote `origin`)

## State: DONE and shipped

Release **v26.5.0** (incubator) / repo **v1.4.0** (Projects) committed, deployed, pushed, verified. Both working trees clean. Version parity 26.5.0 across `package.json`, `src/config.js`, incubator dist, deployed dist.

- Incubator commit: `72962d9` (no remote — local monorepo `~/Dev/Sandbox/_incubator`, branch `main`, user commits directly to main).
- Projects commit: `f6922f3`, tag `v1.4.0`, pushed `origin/main`.
- Tests: 13 suites green (`bash tests/run_all.sh`). Build: `bash tools/build.sh` → `dist/illustrator-zund-summa-marks.jsx` 3651 lines, BOM `ef bb bf` ok, `#target illustrator` ok.

Full changelog detail in commits above + `README.md` (incubator §Changelog v26.5.0) + Projects `README.md`/`README.cs.md` (§Changelog v1.4.0). Do not re-summarise — read those.

## What v26.5.0 delivered (this session)

Features: marks-only mode (`marksOnly` setting), ↺ Revert button.
Changes: SUMMA trim lines → dedicated top-level "Trim" layer (both modes); Reset button removed.
Fixes (all 3 critical, manual-tested in Illustrator by user):
1. `canonColor()` — spurious `*` on registration-colour presets in CZ locale (selectDDL read localized "[Registrace]" not canonical "[Registration]").
2. validation-recovery — `setUIValues` now re-runs `liveValidateAll`; stuck red-field/disabled-Generate after invalid input + Reset/Revert. "valid" paint restores default pen not black.
3. C++ crash guard in `ZSM.Draw._drawTrimTopLevel` — reset `doc.activeLayer = doc.layers[0]` + `app.redraw()` before `doc.layers.add()` (top-level add while a sublayer active = crash).

Key files touched: `src/draw.js` (trim unification `_drawTrimTopLevel`/`_paintRedLines`, crash guard, §7 restructure), `src/ui.js` (canonColor, validation recovery, revert btn, Reset removed, parkFocus reverted), `src/locale.js`, `src/config.js`, tests `test_draw_render.js`+`test_ui_layout.js`. Docs: `docs/MANUAL_TEST.md` (single consolidated deploy-gate plan, Forex 1560×3050 base), `docs/ARCHITECTURE.md`, `docs/hig-audit.md`. Removed: `docs/TEST_PLAN.md`, `docs/MANUAL_TEST_v26.4.md`, `.DS_Store` (×2).

## Known non-issues (decided, do NOT re-litigate)

- **Stuck-blue buttons after click**: inherent ScriptUI/macOS focus rendering. Two fix attempts (`ddPreset.active`, `btnOk.active`) failed → reverted (`parkFocus` removed). Accepted as-is.
- **"1:10" edittext baseline misalignment**: normal ScriptUI quirk, not fixed.
- **Trim layer z-order** (user asked: put Trim below Cut / above Graphics): declined — cosmetic only (no output impact), requires `layer.move()` in the just-fixed crash path. Left at top.

## Open item (ONLY remaining)

Task #18: **make `extendscript-automation` repo public**. Significant/irreversible-ish action — user must explicitly confirm. Command if approved:
```
cd ~/Dev/Projects/extendscript-automation && gh repo edit --visibility public
```
User was asked, not yet answered.

## Context notes

- ES3 only (no let/const/arrow/`Array.map|forEach`/template literals). Verify: `grep -nE "\b(let|const)\b|=>" src/*.js`.
- Build guard fails on version drift package.json ↔ config.js. Bump both together.
- Dist BOM: verify with `head -c 3 dist/...jsx | od -An -tx1` (grep -c unreliable on locale).
- User replies in **Czech**. CAVEMAN MODE active this session (full) — terse style; off via "stop caveman".
- Incubator = personal no-remote monorepo, commits straight to `main`. Projects = public, releases to `main` + tag `vX.Y.Z`.

## Suggested skills (next agent invoke)

- `code-style` — before any file edit in `~/Dev` (SemVer, Conventional Commits, BOM rules, header pattern). Source of truth.
- `es3-polyfilling-strategy` — if touching `src/*.js` ExtendScript logic.
- `manipulating-illustrator-items` / `robust-error-handling` — if touching `src/draw.js` DOM/layer code (C++ crash-prone area).
- `systematic-debugging` — if any new bug/crash report.
- `handling-adobe-files` — if touching save/export/path code.
