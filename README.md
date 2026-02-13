# ExtendScript automatizace pro Adobe Illustrator

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)]()
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey.svg)]()

> Profesionální sada nástrojů v jazyce JavaScript (.jsx) pro automatizaci předtiskové přípravy a zefektivnění práce v Adobe Illustratoru.

---

## Obsah

- [Funkce](#funkce)
- [Požadavky](#požadavky)
- [Instalace](#instalace)
- [Skripty](#skripty)
- [Konfigurace](#konfigurace)
- [Troubleshooting](#troubleshooting)
- [Autor](#autor)

---

## Funkce

- ✅ **Zund & Summa Marks:** Generování registračních značek pro ploché stoly i rolky.
- ✅ **Batch Relink:** Automatické vkládání a export stovek PDF souborů do šablon.
- ✅ **Layer Management:** Inteligentní správa vrstev (`Regmarks`, `Cut`, `Kiss-cut`).
- ✅ **Large Canvas:** Podpora pro Illustrator Large Canvas (měřítko 1:10).
- ✅ **Safe Workflow:** Fixace grafiky proti posunu a automatické čištění názvů.
- ✅ **Grommet Marks:** Značky pro kroužkovou vazbu — nezávislé hrany, presety, globální offset.

---

## Požadavky

- **Software:** Adobe Illustrator CC 2020+
- **OS:** macOS 12.0+ / Windows 10+
- **Hardware:** Podpora pro Zünd (ECHO) a Summa řezací stoly.

---

## Instalace

1. Stáhněte nejnovější `.jsx` soubory ze složky `Scripts`.
2. Zkopírujte soubory do složky skriptů Illustratoru:
   - **macOS:** `/Applications/Adobe Illustrator [Verze]/Presets.localized/cs_CZ/Scripts`
   - **Windows:** `C:\Program Files\Adobe\Adobe Illustrator [Verze]\Presets\cs_CZ\Skripty`
3. Restartujte Adobe Illustrator.
4. Skripty naleznete v menu `Soubor > Skripty`.

---

## Skripty

### 1. [illustrator-zund-summa-marks.jsx](./Scripts/illustrator-zund-summa-marks.jsx)
Komplexní generátor značek. Automaticky detekuje typ stroje a nastavuje parametry pro Zünd (ECHO) nebo Summa (OPOS Bar).
- **Použití:** Otevřete grafiku -> Spusťte skript -> Vyberte stroj a parametry.

### 2. [illustrator-batch-relink-export.jsx](./Scripts/illustrator-batch-relink-export.jsx)
Hromadný relink PDF souborů do připravené `.ai` šablony a následný export.
- **Použití:** Spusťte skript -> Vyberte šablonu, zdroj a cíl -> Spustit hromadnou akci.

### 3. [illustrator-zund-marks.jsx](./Scripts/illustrator-zund-marks.jsx)
Specializovaný "Board Workflow" skript pro Zünd. Zaměřeno na maximální rychlost u deskových materiálů.

### 4. [illustrator-grommet-marks.jsx](./Scripts/illustrator-grommet-marks.jsx)
Generátor značek pro kroužkovou vazbu. Podporuje kruhové i čtvercové značky, nezávislou konfiguraci každé hrany, globální X/Y offset a persistenci nastavení.
- **Použití:** Otevřete grafiku -> Spusťte skript -> Nastavte parametry pro každou hranu -> OK.

---

## Konfigurace

Většinu parametrů lze měnit přímo v UI, ale základní konstanty jsou definovány v hlavičce souborů:

| Proměnná | Výchozí | Popis |
|----------|---------|-------|
| `MARK_SIZE` | `5mm` | Průměr registrační značky |
| `SAFE_ZONE` | `10mm` | Bezpečná zóna kolem grafiky |
| `CUT_LAYER` | `"Cut"` | Název vrstvy pro ořez |
| `MARK_SIZE` | `4mm` | Průměr/strana grommet značky |
| `OFFSET_X/Y` | `0mm` | Globální posun všech značek |

---

## Troubleshooting

### Časté dotazy (FAQ)

<details>
<summary><strong>Skript se nezobrazuje v menu</strong></summary>
Zkontrolujte, zda je přípona souboru skutečně `.jsx` (nikoliv `.jsx.txt`) a zda je soubor ve správné složce podle jazykové mutace Illustratoru (např. `cs_CZ` vs `en_US`).
</details>

<details>
<summary><strong>Chyba: "No document open"</strong></summary>
Před spuštěním generátoru značek musíte mít otevřený aktivní dokument s grafikou.
</details>

<details>
<summary><strong>Značky jsou mimo plátno</strong></summary>
Ujistěte se, že nemáte zamknuté vrstvy nebo skryté ořezové cesty, které by mohly ovlivnit výpočet rozměrů.
</details>

---

## Autor

- **Koncept:** Ladislav Osvald
- **Vývoj:** AI Collaborative Project (Antigravity IDE)
- **Rok:** 2026