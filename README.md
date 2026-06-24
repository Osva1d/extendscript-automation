# ExtendScript Automation for Adobe Illustrator

[![License](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)

> A professional toolkit of JavaScript (`.jsx`) scripts that automate prepress preparation and speed up production work in Adobe Illustrator.

**Language:** English · [Čeština](README.cs.md)

---

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Scripts](#scripts)
  - [Zünd & Summa Marks](#1-illustrator-zund-summa-marksjsx)
  - [Grommet Marks](#2-illustrator-grommet-marksjsx)
  - [Batch Relink & Export](#3-illustrator-batch-relink-exportjsx)
- [Troubleshooting](#troubleshooting)
- [Changelog](#changelog)
- [Licence](#licence)
- [Support the project](#support-the-project)
- [Author](#author)

---

## Features

Three independent scripts that share the same conventions and UX standards:

- **Multilingual UI** — Czech and English, switched automatically by Illustrator's locale
- **Named presets** — saved configurations with automatic recall of the last-used one
- **Layer management** — smart handling of layers and spot colors
- **Large Canvas support** — works with native Illustrator Large Canvas and with manually scaled-down documents (1:N workflow)
- **Robust input validation** — all inputs are validated; no silent fallbacks to zero, no crashes
- **Zero dependencies** — pure ExtendScript, no external libraries or CEP panels

Script-specific features are documented in the [Scripts](#scripts) section.

---

## Requirements

- **Software:** Adobe Illustrator CC 2020+ (tested on CC 2024 and CC 2025)
- **OS:** macOS 12.0+ / Windows 10+
- **Hardware:** Zünd (ECHO) and Summa cutters (optional — scripts also work without a machine for data preparation)

---

## Installation

1. Download the latest `.jsx` files from [`Scripts/`](./Scripts).
2. Copy them to Illustrator's script folder:
   - **macOS:** `/Applications/Adobe Illustrator [Version]/Presets.localized/en_US/Scripts`
   - **Windows:** `C:\Program Files\Adobe\Adobe Illustrator [Version]\Presets\en_US\Scripts`
3. Restart Adobe Illustrator.
4. The scripts appear under `File → Scripts`.

Detailed macOS guide: [`docs/INSTALL_MAC.txt`](./docs/INSTALL_MAC.txt).

> **Run without installing:** `File → Scripts → Other Script…` (Cmd + F12) → pick the `.jsx` file.

---

## Scripts

| # | Script | Version | Purpose |
|---|--------|---------|---------|
| 1 | [`illustrator-zund-summa-marks.jsx`](./Scripts/illustrator-zund-summa-marks.jsx) | **26.5.1** | Registration mark generator for Zünd + Summa, named presets, localisation |
| 2 | [`illustrator-grommet-marks.jsx`](./Scripts/illustrator-grommet-marks.jsx) | **6.0.0** | Banner grommet marks — edges or path, corner zones, Esko-style marks |
| 3 | [`illustrator-batch-relink-export.jsx`](./Scripts/illustrator-batch-relink-export.jsx) | 3.0.0 | Batch-relink PDFs into `.ai` imposition templates and export print-ready PDFs |

---

### 1. illustrator-zund-summa-marks.jsx

Full-featured registration-mark generator for **Zünd (ECHO)** and **Summa (OPOS)** cutters.

**Features:**
- Two technologies (ZUND circular marks, SUMMA square + OPOS bar)
- Auto-fit (artboard adapts to artwork) and Fixed (marks placed inside the artboard) modes
- Corner-to-corner interpolation — mark pitch from 5 mm
- Dynamic mapping of layers to spot colors (up to 8 rows)
- **Marks-only mode** — for documents with already-separated layers: draws only the marks, leaves your layers untouched
- Trim lines (SUMMA) in a dedicated top-level "Trim" layer
- Named presets + auto-saved last-used settings; **↺ Revert** to a preset's saved values
- Manual 1:N scale for scaled-down documents + automatic Large Canvas handling
- Detects and respects clipping masks

**Usage:** Open artwork → run the script → pick the cutter (ZUND/SUMMA) → set parameters → **Generate**.

**Persistence:** `~/Library/Application Support/ZSM/settings.json`

#### Workflow with scaled-down documents (1:10)

If you design at a reduced scale (e.g. a 500×500 mm document represents a real 5000×5000 mm format), enter values **in document scale**, not real-world mm:

| Real-world size | Enter in dialog (1:10) |
|-----------------|------------------------|
| 5 mm marks | 0.5 mm |
| 5 mm gap from artwork | 0.5 mm |
| 400 mm mark pitch | 40 mm |

> **Tip:** Since v26.4.0 you can instead tick **"Work in scale"** and enter a 1:N ratio — the script converts real-world mm for you, so you no longer have to pre-divide every value by hand.

For true Adobe **Large Canvas** mode (artboard > 5765 mm, `scaleFactor = 10`) the script **detects the scaling automatically** — enter real-world values.

---

### 2. illustrator-grommet-marks.jsx

Generator of **grommet marks** (eyelets / banner rings) for large-format and banner workflows.

- **Two placement modes** — along **artboard edges** (per-edge count or spacing, with top↓bottom / left→right mirroring) or along a **selected path** (open or closed; corners always anchored)
- **Corner zones** — densify the first N marks at every corner with their own pitch
- **Uniform registration mark** — Esko-style eyelet: a white halo (knockout) under a registration stroke; circle and/or cross, one size; always on a dedicated "Grommet Marks" layer
- Global X/Y offset; units mm / cm / in
- Presets (save / save as / delete) with auto-remembered last settings; live validation

**Usage:** Open artwork (optionally select a path) → run the script → pick mode and parameters → **Generate**.

---

### 3. illustrator-batch-relink-export.jsx

Batch-relinks PDF files into an `.ai` **imposition template** and exports print-ready PDFs. Ideal for personalised print runs (business cards, tickets, flyers) where every sheet shares one layout but carries different content.

**How it works:** point the script at a template (a multi-up `.ai` with linked PDF positions), a folder of pre-split source PDFs (one per sheet), and an output folder. The script relinks every position to each source file and exports one PDF per sheet.

**Features:**
- Relinks all linked PDF positions on a sheet, then exports with the chosen PDF preset
- Verifies every relink (each position points to the expected file) before exporting
- Automatically unlocks and restores locked layers and objects
- Pre-flight scan of all sources against the template's position count; hard-blocks risky files (more pages than positions, or an ambiguous page count) to prevent silently dropping pages
- Predictable, natural sheet numbering (`part_2` before `part_10`)
- Output naming via a pattern — `{n}` (sheet number), `{template}`, `{source}`
- Pre-run preview (skipped for a clean batch); skip-existing for crash recovery
- Ignores macOS sidecar files (`._*`) on flash drives; localised CS / EN

**Usage:** run the script → pick the template, source folder, and output folder → set the naming pattern and PDF preset → confirm the preview → done.

**Note — short last sheet:** if the last source file has fewer pages than the template has positions, the surplus positions cannot always be removed automatically (Illustrator does not expose the page index of manually placed, clipped PDFs). The script exports the sheet and reports *"N extra positions — remove manually"*. Tip: pad the source to a full multiple of the position count to avoid this entirely.

---

## Troubleshooting

<details>
<summary><strong>Script does not appear in the menu</strong></summary>
Check:
<ul>
<li>The file extension is <code>.jsx</code> (not <code>.jsx.txt</code> — macOS Finder may hide the extension).</li>
<li>The file is in the correct folder for your Illustrator language: <code>en_US</code> vs <code>cs_CZ</code>.</li>
<li>Restart Illustrator after copying the file.</li>
</ul>
</details>

<details>
<summary><strong>Error: "Nothing is selected"</strong></summary>
Auto-fit mode requires an active selection or visible artwork in the document. Either select the artwork (Cmd+A) or switch to "By Artboard" (Fixed) mode.
</details>

<details>
<summary><strong>Marks are placed off canvas / off artboard</strong></summary>
In Auto-fit mode the script expands the artboard. In Fixed mode the artboard stays and marks are placed inside it. Also check:
<ul>
<li>No locked layer blocks the calculation (the script temporarily unlocks them).</li>
<li>No guides extend the bounds (the script ignores guides, but non-guide off-canvas paths can inflate bounds).</li>
</ul>
</details>

<details>
<summary><strong>"Generate" button does nothing</strong></summary>
Validation failed. Check the input fields:
<ul>
<li>No empty fields (since v26.3.x an empty input is an error, not a silent 0).</li>
<li>Values within the allowed range (e.g. mark pitch 5–5000 mm).</li>
<li>For scaled-down documents enter values in document scale — see <a href="#workflow-with-scaled-down-documents-110">1:10 workflow</a> in the Zünd & Summa Marks section.</li>
</ul>
</details>

<details>
<summary><strong>Illustrator crashed</strong></summary>
ExtendScript can trigger a C++ crash in Illustrator that try/catch cannot recover from. Known causes (all mitigated in v26.3.x):
<ul>
<li>Undo + re-running without a restart — DOM in inconsistent state.</li>
<li>Bracket-named layers <code>&lt;Clip Group&gt;</code>, <code>&lt;Group&gt;</code> — the script now avoids mutating them.</li>
<li>Very large coordinates (>16383pt) — the script validates values.</li>
</ul>
If a crash still occurs, please report it to the author with a description of the document (Layers panel) and the action sequence.
</details>

<details>
<summary><strong>A preset "got lost" or changed unexpectedly</strong></summary>
Since v26.3.x named presets are <strong>immutable</strong>. Generate does not modify them — only the <strong>Save</strong> button commits the current UI values into the active preset. To save as a new variant, use <strong>Save As</strong>. The modified indicator (asterisk <code>*</code> next to the name) signals unsaved changes.
</details>

---

## Changelog

Format: [Keep a Changelog](https://keepachangelog.com/) — categories `Added` / `Changed` / `Fixed` / `Removed` / `Security`.

### v1.6.0 (2026-06) — Grommet Marks v6.0.0
- **Added:** Path placement mode — distribute marks along a selected open/closed path (corners always anchored; smooth paths support count or spacing).
- **Added:** Corner zones — densify the first N marks at every corner with a dedicated pitch (artboard and path modes).
- **Added:** Uniform Esko-style registration mark — white halo (knockout) + registration stroke, circle and/or cross, single size; always drawn on a fixed "Grommet Marks" layer.
- **Changed:** Full dialog redesign — placement-mode selector, aligned edges grid with mirroring on its own row, units moved to the top, single 4px spacing scale.
- **Removed:** Fill / stroke / target-layer selection and per-mark swatch choice (superseded by the uniform mark).

### v1.5.0 (2026-06) — Grommet Marks v4.2.1
- **Added:** ↺ Revert button next to the preset dropdown (reload a preset's saved values).
- **Changed:** Two-row preset panel (Save / Save As / Delete below the dropdown), matching the Zünd & Summa Marks layout.
- **Changed:** Appearance dropdowns aligned via a fixed label column.
- **Removed:** Reset button (replaced by ↺ revert) and the Round/Square shape choice — marks are now always circular.
- **Fixed:** Live validation restored the default text colour (no black-on-dark fields).
- **Fixed:** Settings-file write failures are always reported (a silent failure could "resurrect" a deleted preset after restart).
- **Fixed:** Marks that fail to place are reported in one summary warning instead of silently missing from prepress output.
- **Fixed:** The [Registration] fallback verifies the swatch really is the registration spot (a user-deleted [Registration] could silently mis-colour marks).
- **Fixed:** Fractional mark counts ("10.5") are rejected instead of silently truncated.

### v1.4.1 (2026-06) — Zünd & Summa Marks v26.5.1 (hotfix)
- **Fixed:** Re-running SUMMA with trim lines grew the artboard on every run — the "Trim" layer was incorrectly included in the bounds measurement (regression in v26.5.0).
- **Fixed:** A SUMMA run with trim lines off now removes the stale "Trim" layer from a previous run.
- **Fixed:** Settings-file write failures (full disk, permissions) are reported instead of silently ignored.
- **Fixed:** Typing a multi-digit scale (e.g. "12") no longer disables the field after the first keystroke; an out-of-range scale paints red and blocks Generate instead of being silently clamped.
- **Fixed:** Save/Revert buttons grey out immediately after a successful Save.
- **Fixed:** Preset names of the form `[Text]` are reserved; minor consistency and error-message fixes.

### v1.4.0 (2026-06) — Zünd & Summa Marks v26.5.0
- **Added:** "Marks only" mode — for documents with already-separated layers; draws only the marks and leaves user layers untouched.
- **Added:** ↺ Revert button next to the preset dropdown (reload a preset's saved values).
- **Changed:** Trim lines (SUMMA) now always go into a dedicated top-level "Trim" layer (out of Regmarks and cut layers).
- **Removed:** Reset button — factory defaults via the `[Default]` preset, preset revert via ↺. Footer is now Cancel + Generate only.
- **Fixed:** Spurious "modified" asterisk on presets using the registration colour in a localised (CS) Illustrator.
- **Fixed:** Invalid input could leave the dialog stuck (field red, Generate disabled) even after correcting the value or reverting.
- **Fixed:** Illustrator C++ crash when generating SUMMA marks with trim lines.

### v1.3.0 (2026-06) — Batch Relink & Export v3.0.0
- **Changed:** Complete rewrite of Batch Relink & Export — modular ExtendScript, robust safety, CS/EN localisation.
- **Changed:** Output naming via a placeholder pattern (`{n}` / `{template}` / `{source}`, default `{n}_{template}`).
- **Added:** Relink verification, automatic unlock/restore of locked layers and objects.
- **Added:** Pre-flight scan of all sources; hard-blocks files with more pages than positions or an ambiguous page count.
- **Added:** Short last sheet reported for manual cleanup ("N extra positions — remove manually").
- **Added:** Natural (numeric-aware) source ordering for predictable sheet numbering.
- **Fixed:** macOS AppleDouble (`._*`) sidecar files in the source folder are ignored.
- **Removed:** Standalone imposition script (dead development branch).

### v1.2.1 (2026-05) — Zünd & Summa Marks v26.3.2
- **Fixed:** "Mark pitch" validation minimum lowered 50 → 5 mm. 1:10 scaled-down workflows no longer block the Generate button.
- **Added:** "Scaled-down workflow" section in the Zünd & Summa Marks documentation.

### v1.2.0 (2026-04) — Zünd & Summa Marks v26.3.1
- **Added:** Stable presets (immutable named presets, modified indicator `*`).
- **Added:** Save / Save As / Reset split.
- **Added:** E2E test workflow + ES3 compliance linter.
- **Fixed:** Clipping-mask boundary detection + skip Regmarks layer.
- **Fixed:** Empty-string validation (`Number("")` quirk).
- **Fixed:** `main.jsx` read a stale preset instead of `[Last Settings]`.
- **Fixed:** `Array.map` in ExtendScript (ES3 compliance).
- **Security:** Defensive measures in `render()` against C++ pipeline crashes.

### v1.1.x (2026-02) — Grommet Marks v3.0.0
- **Added:** `illustrator-grommet-marks.jsx`.
- **Changed:** Unified script headers (`Script` / `Version` / `Author` / `Updated`).

### v1.0.x (2025–2026) — Initial public release
- **Added:** First public release of the script suite — Zünd & Summa Marks, Batch Relink, Zünd Board Workflow.

---

## Licence

This project is licensed under the **GNU General Public License v3.0** — see [`LICENSE`](LICENSE) (full text) and [`COPYRIGHT`](COPYRIGHT) (summary + third parties).

**What this means in practice:**

- You can **freely use** the software for any purpose — personal, academic, or commercial (e.g. inside a print shop).
- You can **modify** the software and create derivative works.
- If you **distribute** a modified version (resell or publish it), you must keep the GPL-3.0 licence and make the source available.
- The software is provided "as is", without any warranty.

**Commercial licence:** If the GPL-3.0 terms (in particular the obligation to publish modifications) are incompatible with your use case, a commercial licence can be negotiated separately. Contact the author.

**Third parties:** `json2.js` by Douglas Crockford — public domain.

---

## Support the project

If the suite saves you time in daily work and you want to fund further development:

- **[Buy Me a Coffee](https://buymeacoffee.com/osva1d)** — one-off tip, localised currency (USD / EUR / CZK / …).
- **Issues and Pull Requests** — bug reports, ideas, and improvements are welcome in the project's issue tracker.
- **Sharing** — a mention in your community (printshop forums, LinkedIn) is the cheapest form of support.

---

## Author

- **Concept & development:** Ladislav Osvald (Osva1d)
- **Year:** 2025–2026
- **Contact:** via the project's issue tracker or direct message
