# Handoff — Batch Relink & Export

**Date:** 2026-06-05
**Status:** v3.0.0 complete, deployed locally to publication repo. Not pushed to GitHub.

## What this project is

Adobe Illustrator ExtendScript (ES3). Batch-relinks PDF files into an `.ai`
imposition template (multi-up, linked PDF positions) and exports one print PDF
per source file. Modular `src/` → `dist/` build, namespace `BRE`.

- **Source of truth:** `~/Dev/Sandbox/_incubator/batch-relink-export/` (git repo root: `_incubator`, branch `main`).
- **Published mirror:** `~/Dev/Projects/extendscript-automation/` (separate git repo, branch `main`).
- Design + plan: `docs/superpowers/specs/2026-05-31-modular-redesign-design.md`, `docs/superpowers/plans/2026-05-31-modular-redesign.md`.
- README (dev): `README.md`. Build: `npm run build` → `dist/illustrator-batch-relink-export.jsx`.

## Architecture

`src/locale.js` (BRE.L, cs/en) · `config.js` (BRE.Config, version, UI consts) ·
`core.js` (BRE.Core — session mgmt, relink, verify, scan, naming, diagnostics) ·
`ui.js` (BRE.UI — dialog, preview, progress, summary) · `main.jsx` (entry, loop).
Build order + version parity guard in `tools/build.sh`. No polyfills. No npm deps.

## Key history / decisions (see git log for detail)

- Modular redesign from v2.0.0 monolith. Old `illustrator-impose-pdf.jsx` deleted (dead dev).
- Three rounds of code review (local `pr-review-toolkit:code-reviewer`); all findings fixed.
- **Root cause of the main bug (confirmed via diagnostic log):** `PlacedItem.pageNumber`
  reads `undefined` for manually-placed, clip-masked PDF pages in the user's templates.
  So pageNumber-based auto-removal of excess positions on a short last sheet CANNOT fire.
- **Resolution (user choice):** export the short sheet and report "N extra positions —
  remove manually" (summary + per-sheet log). Auto-removal kept best-effort for templates
  where pageNumber IS readable. User accepts padding the source to a full multiple as the
  clean workaround.
- macOS AppleDouble `._*` files in source folder were being processed as real PDFs →
  fixed (filter skips leading-dot names).
- Natural (numeric) source sort for predictable sheet numbering.
- Diagnostic mode: checkbox removed from UI; capability kept behind `BRE.Config.debug`
  (writes `_bre-diagnostika.txt` to output folder). Off by default.
- UI matched to ZSM/GM house style + `extendscript-ui-standards` (added greyed copyright footer).

## Current state

- Incubator `main`: clean. Last commit `5a43433` (README rewrite).
- Projects `main`: deploy committed `947f53b` (v3.0.0 artifact + bilingual READMEs updated to repo v1.3.0). **1 commit ahead of remote, NOT pushed.**
- dist current with src (1606 lines, BOM + `#target` ok, ES3 clean).

## Open / next

1. **Push decision (pending user):** `Projects/extendscript-automation` `main` has 1 unpushed
   commit. Public GitHub release repo with `.github` workflow — push only on explicit user OK.
   Incubator has no remote.
2. **User's pending real-world verification:** run latest build on the SRA3 2-artboard / 6-DL
   template + the 8-page short file. Expect: dotfiles ignored (8 sheets not 16), numbering
   01–08 by natural order, short sheet flagged "4 pozice navíc — odeber ručně", full sheets correct.
3. Known stale doc (optional): `_incubator/_INSPECTION_REPORT.md` still lists batch-relink as
   2.0.0/1.0.0 and references the deleted impose script.

## Known limitation (do not "fix" blindly)

Auto-removal of surplus positions needs readable `PlacedItem.pageNumber`. Illustrator does
not expose it for manually-placed clipped pages. This is an Illustrator API limit, not a code
bug. Safety nets: pre-flight scan hard-blocks over-page/ambiguous files; verifyRelink + the
manual-cleanup flag mean a wrong sheet is never silently produced (worst case = loud skip or
manual-cleanup notice).

## Suggested skills for next session

- `code-style`, `extendscript-ui-standards` — house conventions (ES3, BOM, UI).
- `manipulating-illustrator-items`, `handling-adobe-files` — DOM/file ops.
- `superpowers:systematic-debugging` — if a new bug appears (diagnostic mode is the evidence tool).
- `robust-error-handling` — error-boundary patterns.
