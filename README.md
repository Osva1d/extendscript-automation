# ExtendScript Automation for Adobe Illustrator

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

> A suite of JavaScript (`.jsx`) scripts that automate prepress preparation and
> speed up production work in Adobe Illustrator.

**Language:** English · [Čeština](README.cs.md)

This repository is a **monorepo of three independent tools** plus a small shared
core. Each tool has its own README, build, and version — this page is a signpost.

---

## What's inside

| Tool | Purpose | Docs |
|------|---------|------|
| **zund-summa-marks** | Registration marks for Zünd (ECHO) and Summa (OPOS) cutters — layer→spot-colour mapping, marks-only mode, named presets | [README](zund-summa-marks/README.md) |
| **grommet-marks** | Banner grommet marks along artboard edges or a selected path — corner zones, Esko-style registration targets | [README](grommet-marks/README.md) · [CHANGELOG](grommet-marks/CHANGELOG.md) |
| **batch-relink-export** | Batch-relink PDFs into an `.ai` imposition template and export print-ready PDFs | [README](batch-relink-export/README.md) |

`shared/` holds the namespace-neutral core modules both mark generators consume;
the reasoning behind what is shared and what is deliberately not lives in
[`docs/decisions.md`](docs/decisions.md).

---

## Shared conventions

All three tools follow the same conventions and UX standards:

- **Bilingual UI** — Czech and English, switched automatically by Illustrator's locale
- **Named presets** — saved configurations with automatic recall of the last-used one
- **Robust input validation** — no silent fallbacks to zero, no crashes
- **Large Canvas support** — native Illustrator Large Canvas and manually scaled (1:N) documents
- **Zero dependencies** — pure ExtendScript (ES3), no external libraries or CEP panels

---

## Requirements

- **Software:** Adobe Illustrator CC 2020+ (tested on CC 2024 and CC 2025)
- **OS:** macOS 12.0+ / Windows 10+
- **Hardware:** Zünd (ECHO) and Summa cutters are optional — the scripts also prepare data without a machine

---

## Getting the scripts

Download the built `.jsx` for the tool you need from
[**GitHub Releases**](https://github.com/Osva1d/extendscript-automation/releases),
then install it — see each tool's README for its install section.

> **Run without installing:** in Illustrator, `File ▸ Scripts ▸ Other Script…`
> (Cmd + F12) and pick the `.jsx`.

---

## Building from source

Each tool is a self-contained ExtendScript build (`src/*.js` concatenated into a
single `dist/*.jsx`). No install step, no dependencies for the build itself:

```bash
cd <tool>          # e.g. grommet-marks
bash tools/build.sh    # or: npm run build
# → dist/illustrator-<tool>.jsx
```

Built artifacts are **not committed** — they ship as release assets. The `src/`
tree is the source of truth. `zund-summa-marks` and `grommet-marks` also carry a
Node test suite (`npm test`).

---

## Repository layout

```
extendscript-automation/
├── grommet-marks/          # tool: banner grommet marks
├── zund-summa-marks/       # tool: Zünd/Summa registration marks
├── batch-relink-export/    # tool: batch PDF relink + export
├── shared/lib/             # namespace-neutral core (ui_state, json2)
├── docs/decisions.md       # architecture decisions (what is shared, and why)
├── LICENSE
└── README.md · README.cs.md
```

---

## License

MIT License. Copyright (C) 2025–2026 Ladislav Osvald. See [`LICENSE`](LICENSE).

Free to use, copy, modify, and distribute (including commercially), provided the
copyright notice is kept. Provided "as is", without warranty of any kind.

**Third parties:** `json2.js` by Douglas Crockford — public domain.

---

## Contributing

Feedback and contributions are welcome — bug reports, ideas, and pull requests
via the project's issue tracker.

---

## Author

Ladislav Osvald (Osva1d), 2025–2026.
