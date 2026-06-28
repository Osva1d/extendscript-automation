# ExtendScript Automation for Adobe Illustrator

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](#changelog)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

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
- [Contributing](#contributing)
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
| 1 | [`illustrator-zund-summa-marks.jsx`](./Scripts/illustrator-zund-summa-marks.jsx) | **1.0.0** | Registration mark generator for Zünd + Summa, named presets, localisation |
| 2 | [`illustrator-grommet-marks.jsx`](./Scripts/illustrator-grommet-marks.jsx) | **1.0.0** | Banner grommet marks — edges or path, corner zones, Esko-style marks |
| 3 | [`illustrator-batch-relink-export.jsx`](./Scripts/illustrator-batch-relink-export.jsx) | 1.0.0 | Batch-relink PDFs into `.ai` imposition templates and export print-ready PDFs |

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

> **Tip:** You can instead tick **"Work in scale"** and enter a 1:N ratio — the script converts real-world mm for you, so you no longer have to pre-divide every value by hand.

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
- Output naming via a pattern — `{n}` (sheet number), `{template}`, `{source}` — with a **live name preview** and a visible token legend in the dialog
- Pre-run preview (skipped for a clean batch); skip-existing for crash recovery
- Ignores macOS sidecar files (`._*`) on flash drives; localised CS / EN

**Dialog:** three numbered panels (input files / naming & format / options), a live preview of the resulting filename as you edit the pattern, and a status-coloured pre-flight summary.

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
<li>No empty fields (an empty input is an error, not a silent 0).</li>
<li>Values within the allowed range (e.g. mark pitch 5–5000 mm).</li>
<li>For scaled-down documents enter values in document scale — see <a href="#workflow-with-scaled-down-documents-110">1:10 workflow</a> in the Zünd & Summa Marks section.</li>
</ul>
</details>

<details>
<summary><strong>Illustrator crashed</strong></summary>
ExtendScript can trigger a C++ crash in Illustrator that try/catch cannot recover from. Known causes (mitigated):
<ul>
<li>Undo + re-running without a restart — DOM in inconsistent state.</li>
<li>Bracket-named layers <code>&lt;Clip Group&gt;</code>, <code>&lt;Group&gt;</code> — the script now avoids mutating them.</li>
<li>Very large coordinates (>16383pt) — the script validates values.</li>
</ul>
If a crash still occurs, please report it to the author with a description of the document (Layers panel) and the action sequence.
</details>

<details>
<summary><strong>A preset "got lost" or changed unexpectedly</strong></summary>
Named presets are <strong>immutable</strong>. Generate does not modify them — only the <strong>Save</strong> button commits the current UI values into the active preset. To save as a new variant, use <strong>Save As</strong>. The modified indicator (asterisk <code>*</code> next to the name) signals unsaved changes.
</details>

---

## Changelog

Format: [Keep a Changelog](https://keepachangelog.com/) — categories `Added` / `Changed` / `Fixed` / `Removed` / `Security`.

### v1.0.0 (2026-06) — First public release

Open-source (MIT) release of three production-tested Adobe Illustrator scripts, built and refined for real print-production work.

**Zünd & Summa Marks** — registration marks for Zünd (ECHO) and Summa (OPOS) cutters: layer → spot-colour mapping (up to 8 cut layers), "marks only" mode, trim lines on a dedicated layer, named presets with revert, Large Canvas and 1:N scaled-document support, clipping-mask detection, duplicate-colour guard.

**Grommet Marks** — Esko-style grommet marks along edges or any selected path, corner zones, white-halo registration targets, named presets.

**Batch Relink & Export** — batch-relink PDFs into an `.ai` imposition template and export print-ready PDFs: pre-flight validation, relink verification, natural sheet numbering, pattern-based output names, crash-safe skip-existing.

Across the suite: bilingual UI (CS / EN), live input validation, defensive handling of Illustrator's C++ crash edge cases, and an ES3-clean modular build with a Node-based test suite.

---

## Licence

MIT License. Copyright (C) 2025-2026 Ladislav Osvald. See [`LICENSE`](LICENSE).

Free to use, copy, modify, and distribute (including commercially), provided the copyright notice is kept. Provided "as is", without warranty of any kind.

**Third parties:** `json2.js` by Douglas Crockford — public domain.

---

## Contributing

This is an open-source project — feedback and contributions are welcome:

- **Issues** — bug reports and ideas are welcome in the project's issue tracker.
- **Pull requests** — improvements and fixes are appreciated.
- **Sharing** — a mention in your community (print-shop forums, LinkedIn) is the easiest way to help.

---

## Author

- **Concept & development:** Ladislav Osvald (Osva1d)
- **Year:** 2025–2026
- **Contact:** via the project's issue tracker or direct message
