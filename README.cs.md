# ExtendScript automatizace pro Adobe Illustrator

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

> Sada skriptů v jazyce JavaScript (`.jsx`) pro automatizaci předtiskové přípravy
> a zefektivnění práce v Adobe Illustratoru.

**Jazyk:** [English](README.md) · Čeština

Tento repozitář je **monorepo tří nezávislých nástrojů** plus malé sdílené jádro.
Každý nástroj má vlastní README, build a verzi — tato stránka je rozcestník.

---

## Co repozitář obsahuje

| Nástroj | Účel | Dokumentace |
|---------|------|-------------|
| **zund-summa-marks** | Registrační značky pro řezací plotry Zünd (ECHO) a Summa (OPOS) — mapování vrstva→přímá barva, mód „pouze značky", pojmenované presety | [README](zund-summa-marks/README.md) |
| **grommet-marks** | Značky pro oka po obvodu artboardu nebo na vybrané cestě — rohové zóny, registrační terče v Esko stylu | [README](grommet-marks/README.md) · [CHANGELOG](grommet-marks/CHANGELOG.md) |
| **batch-relink-export** | Hromadné relinkování PDF do `.ai` vyřazovací šablony a export tiskových PDF | [README](batch-relink-export/README.md) |

`shared/` drží namespace-neutrální jádro, které oba generátory značek sdílejí;
odůvodnění, co se sdílí a co záměrně ne, je v
[`docs/decisions.md`](docs/decisions.md).

---

## Společné konvence

Všechny tři nástroje sdílejí stejné konvence a UX standardy:

- **Dvojjazyčné UI** — čeština a angličtina, automaticky podle locale Illustratoru
- **Pojmenované presety** — uložená nastavení s automatickým uchováním posledního použitého
- **Robustní validace vstupů** — žádné tiché převody na nulu, žádné pády
- **Large Canvas podpora** — nativní Illustrator Large Canvas i ručně zmenšené dokumenty (1:N)
- **Bez závislostí** — čistý ExtendScript (ES3), žádné externí knihovny ani CEP panely

---

## Požadavky

- **Software:** Adobe Illustrator CC 2020+ (testováno na CC 2024 a CC 2025)
- **OS:** macOS 12.0+ / Windows 10+
- **Hardware:** plotry Zünd (ECHO) a Summa jsou volitelné — skripty připraví data i bez stroje

---

## Kde vzít skripty

Stáhni buildnutý `.jsx` pro potřebný nástroj z
[**GitHub Releases**](https://github.com/Osva1d/extendscript-automation/releases)
a nainstaluj jej — instalační sekci má README každého nástroje.

> **Spuštění bez instalace:** v Illustratoru `Soubor ▸ Skripty ▸ Jiný skript…`
> (Cmd + F12) a vyber `.jsx`.

---

## Sestavení ze zdroje

Každý nástroj je samostatný ExtendScript build (`src/*.js` spojené do jednoho
`dist/*.jsx`). Bez instalačního kroku, bez závislostí pro samotný build:

```bash
cd <nástroj>       # např. grommet-marks
bash tools/build.sh    # nebo: npm run build
# → dist/illustrator-<nástroj>.jsx
```

Buildnuté artefakty se **necommitují** — jsou distribuovány jako release assets.
Zdroj pravdy je strom `src/`. `zund-summa-marks` a `grommet-marks` mají navíc
Node testovou sadu (`npm test`).

---

## Struktura repozitáře

```
extendscript-automation/
├── grommet-marks/          # nástroj: značky pro oka na bannery
├── zund-summa-marks/       # nástroj: registrační značky Zünd/Summa
├── batch-relink-export/    # nástroj: hromadný relink + export PDF
├── shared/lib/             # namespace-neutrální jádro (ui_state, json2)
├── docs/decisions.md       # architektonická rozhodnutí (co se sdílí a proč)
├── LICENSE
└── README.md · README.cs.md
```

---

## Licence

Licence MIT. Copyright (C) 2025–2026 Ladislav Osvald. Viz [`LICENSE`](LICENSE).

Volně k použití, kopírování, úpravám i distribuci (včetně komerční), při zachování
copyrightové poznámky. Poskytováno „tak jak je", bez jakékoli záruky.

**Třetí strany:** `json2.js` od Douglase Crockforda — public domain.

---

## Přispívání

Zpětná vazba a příspěvky vítány — hlášení chyb, nápady i pull requesty přes issue
tracker projektu.

---

## Autor

Ladislav Osvald (Osva1d), 2025–2026.
