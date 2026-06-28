# ExtendScript automatizace pro Adobe Illustrator

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](#changelog)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

> Profesionální sada nástrojů v jazyce JavaScript (`.jsx`) pro automatizaci předtiskové přípravy a zefektivnění práce v Adobe Illustratoru.

**Jazyk:** [English](README.md) · Čeština

---

## Obsah

- [Funkce](#funkce)
- [Požadavky](#požadavky)
- [Instalace](#instalace)
- [Skripty](#skripty)
  - [Zünd & Summa Marks](#1-illustrator-zund-summa-marksjsx)
  - [Grommet Marks](#2-illustrator-grommet-marksjsx)
  - [Batch Relink & Export](#3-illustrator-batch-relink-exportjsx)
- [Troubleshooting](#troubleshooting)
- [Changelog](#changelog)
- [Licence](#licence)
- [Podpora projektu](#podpora-projektu)
- [Autor](#autor)

---

## Funkce

Sada tří nezávislých skriptů sdílí společné konvence a UX standardy:

- **Multilanguage UI** — čeština a angličtina, automaticky podle locale Illustratoru
- **Pojmenované presety** — uložená nastavení, automatické uchování posledního použitého
- **Layer management** — inteligentní správa vrstev a přímých barev (spot colors)
- **Large Canvas podpora** — funguje s Illustrator Large Canvas i s ručně zmenšenými dokumenty (1:N workflow)
- **Robustní validace** — vstupy jsou validovány, žádné tiché převody na nuly či pády
- **Bez závislostí** — čistý ExtendScript, žádné externí knihovny ani CEP panely

Funkce specifické pro jednotlivé skripty jsou popsány v sekci [Skripty](#skripty).

---

## Požadavky

- **Software:** Adobe Illustrator CC 2020+ (testováno na CC 2024 a CC 2025)
- **OS:** macOS 12.0+ / Windows 10+
- **Hardware:** podpora pro Zünd (ECHO) a Summa řezací stoly (volitelné — skript funguje i bez stroje pro přípravu dat)

---

## Instalace

1. Stáhněte nejnovější `.jsx` soubory ze složky [`Scripts/`](./Scripts).
2. Zkopírujte soubory do skriptové složky Illustratoru:
   - **macOS:** `/Applications/Adobe Illustrator [Verze]/Presets.localized/cs_CZ/Scripts`
   - **Windows:** `C:\Program Files\Adobe\Adobe Illustrator [Verze]\Presets\cs_CZ\Skripty`
3. Restartujte Adobe Illustrator.
4. Skripty naleznete v menu `Soubor → Skripty`.

Detailní návod pro macOS: [`docs/INSTALL_MAC.cs.txt`](./docs/INSTALL_MAC.cs.txt).

> **Rychlé spuštění bez instalace:** `Soubor → Skripty → Jiný skript…` (Cmd + F12) → vybrat `.jsx` soubor.

---

## Skripty

| # | Skript | Verze | Účel |
|---|--------|-------|------|
| 1 | [`illustrator-zund-summa-marks.jsx`](./Scripts/illustrator-zund-summa-marks.jsx) | **1.0.0** | Generátor registračních značek pro Zünd + Summa, presety, lokalizace |
| 2 | [`illustrator-grommet-marks.jsx`](./Scripts/illustrator-grommet-marks.jsx) | **1.0.0** | Značky pro oka — hrany nebo cesta, rohové zóny, Esko značky |
| 3 | [`illustrator-batch-relink-export.jsx`](./Scripts/illustrator-batch-relink-export.jsx) | 1.0.0 | Hromadný relink PDF do `.ai` vyřazovacích šablon a export tiskových PDF |

---

### 1. illustrator-zund-summa-marks.jsx

Komplexní generátor značek pro plottery **Zünd (ECHO)** a **Summa (OPOS)**.

**Funkce:**
- Dvě technologie (ZUND kruhové značky, SUMMA čtvercové + OPOS bar)
- Auto-fit (artboard se přizpůsobí grafice) i Fixed (značky uvnitř artboardu) režim
- Interpolace mezi rohy — rozteč značek od 5 mm
- Dynamické mapování vrstev na přímé barvy (až 8 řádků)
- **Režim „Pouze značky"** — pro dokumenty s už separovanými vrstvami: vykreslí jen značky, vrstvy nechá beze změny
- Ořezové linky (SUMMA) v samostatné top-level vrstvě „Trim"
- Pojmenované presety + auto-uchování posledního nastavení; **↺ Revert** na uložené hodnoty předvolby
- Manuální měřítko 1:N pro zmenšené dokumenty + automatická detekce Large Canvas
- Detekce a respektování clipping masek

**Použití:** Otevřete grafiku → spusťte skript → vyberte stroj (ZUND/SUMMA) → nastavte parametry → **Generovat**.

**Persistence:** `~/Library/Application Support/ZSM/settings.json`

#### Workflow při zmenšeném měřítku (1:10)

Pokud pracujete na velkém formátu reprezentovaném zmenšeně (např. dokument 500×500 mm reprezentuje reálný formát 5000×5000 mm), zadávejte hodnoty **v měřítku dokumentu**, nikoliv reálné mm:

| Reálná velikost | Zadat do dialogu (1:10) |
|-----------------|-------------------------|
| Značky 5 mm | 0,5 mm |
| Vzdálenost od grafiky 5 mm | 0,5 mm |
| Rozteč značek 400 mm | 40 mm |

> **Tip:** Můžete místo toho zaškrtnout **„Pracovat v měřítku"** a zadat poměr 1:N — skript reálné mm přepočítá za vás, takže už nemusíte každou hodnotu dělit ručně.

Pro skutečný Adobe **Large Canvas** režim (artboard > 5765 mm, `scaleFactor = 10`) skript scaling **detekuje automaticky** — zadávejte reálné hodnoty.

---

### 2. illustrator-grommet-marks.jsx

Generátor **značek pro oka** (grommets / průchodky / banner ringy) pro velkoformátový tisk a banner workflow.

- **Dva režimy umístění** — po **hranách artboardu** (počet nebo rozestup per hrana, zrcadlení horní↓dolní / levou→pravou) nebo po **vybrané cestě** (otevřené i uzavřené; rohy vždy ukotvené)
- **Rohové zóny** — zhuští prvních N značek u každého rohu vlastní roztečí
- **Jednotná značka** — Esko-styl terč: bílé halo (knockout) pod registračním tahem; kruh a/nebo kříž, jedna velikost; vždy na samostatnou vrstvu „Grommet Marks"
- Globální X/Y offset; jednotky mm / cm / in
- Presety (uložit / uložit jako / smazat) s automatickou pamětí posledního běhu; živá validace

**Použití:** Otevřete grafiku (případně vyberte cestu) → spusťte skript → zvolte režim a parametry → **Generovat**.

---

### 3. illustrator-batch-relink-export.jsx

Hromadný relink PDF souborů do `.ai` **vyřazovací šablony** a export tiskových PDF. Ideální pro personalizované tiskové zakázky (vizitky, vstupenky, letáky), kde má každý arch stejné rozvržení, ale jiný obsah.

**Princip:** skriptu předáte šablonu (vícepozicové `.ai` s nalinkovanými PDF pozicemi), složku předem rozdělených zdrojových PDF (jeden soubor = jeden arch) a výstupní složku. Skript relinkuje každou pozici na daný zdroj a vyexportuje jedno PDF na arch.

**Funkce:**
- Relinkuje všechny nalinkované pozice na archu a exportuje (zvolený PDF preset)
- Před exportem ověří každý relink (pozice ukazuje na správný soubor)
- Automaticky odemkne a obnoví zamčené vrstvy i objekty
- Pre-flight sken všech zdrojů vůči počtu pozic; tvrdě blokuje rizikové soubory (více stran než pozic, nebo nejednoznačný počet stran), aby tiše nezahodil stránky
- Předvídatelné přirozené číslování archů (`part_2` před `part_10`)
- Pojmenování výstupů přes vzor — `{n}` (číslo archu), `{template}`, `{source}` — se **živým náhledem názvu** a viditelnou legendou tokenů v dialogu
- Náhled před během (přeskočí se u bezchybné dávky); přeskočení existujících pro obnovu po pádu
- Ignoruje macOS sidecar soubory (`._*`) na flash discích; lokalizace CS / EN

**Dialog:** tři číslované panely (vstupní soubory / pojmenování a formát / možnosti), živý náhled výsledného názvu při psaní vzoru a barevně odlišený pre-flight souhrn.

**Použití:** spusťte skript → vyberte šablonu, zdrojovou a výstupní složku → nastavte vzor pojmenování a PDF preset → potvrďte náhled → hotovo.

**Pozn. — neúplný poslední arch:** pokud má poslední zdrojový soubor méně stran než má šablona pozic, přebytečné pozice nelze vždy odstranit automaticky (Illustrator u ručně umístěných oříznutých PDF nevrací číslo stránky). Skript arch vyexportuje a nahlásí *„N pozic navíc — odeber ručně"*. Tip: doplňte zdroj na plný násobek počtu pozic a problém odpadne úplně.

---

## Troubleshooting

<details>
<summary><strong>Skript se nezobrazuje v menu</strong></summary>
Zkontrolujte:
<ul>
<li>Přípona souboru je <code>.jsx</code> (nikoliv <code>.jsx.txt</code> — macOS Finder může příponu skrýt).</li>
<li>Soubor je ve správné složce dle jazyka Illustratoru: <code>cs_CZ</code> vs <code>en_US</code>.</li>
<li>Po překopírování restartujte Illustrator.</li>
</ul>
</details>

<details>
<summary><strong>Chyba: „Nic není vybráno"</strong></summary>
Auto-fit režim vyžaduje aktivní výběr nebo viditelnou grafiku v dokumentu. Buď grafiku vyberte (Cmd+A), nebo přepněte na režim „Dle Artboardu" (Fixed).
</details>

<details>
<summary><strong>Značky jsou mimo plátno / artboard</strong></summary>
Skript v Auto-fit režimu artboard rozšiřuje. Pokud používáte Fixed režim, artboard zůstává a značky se umisťují dovnitř. Zkontrolujte také:
<ul>
<li>Žádná zamknutá vrstva neblokuje výpočet (skript ji dočasně odemkne).</li>
<li>Žádné guides neprotahují bounds (skript je ignoruje, ale ne-guide path off-canvas může bounds inflovat).</li>
</ul>
</details>

<details>
<summary><strong>Tlačítko „Generovat" nereaguje</strong></summary>
Validace selhala. Zkontrolujte vstupní pole:
<ul>
<li>Žádné prázdné pole (prázdný vstup = chyba, ne tichá 0).</li>
<li>Hodnoty v dovoleném rozsahu (např. Rozteč značek 5–5000 mm).</li>
<li>Při zmenšeném dokumentu zadávejte hodnoty v měřítku dokumentu — viz <a href="#workflow-při-zmenšeném-měřítku-110">Workflow 1:10</a> v sekci Zünd & Summa Marks.</li>
</ul>
</details>

<details>
<summary><strong>Skript shodil Illustrator</strong></summary>
ExtendScript může v Illustratoru vyvolat C++ crash, který try/catch nezachytí. Známé příčiny (ošetřeny):
<ul>
<li>Krok zpět (Undo) a opakované spuštění bez restartu — DOM v nekonzistentním stavu.</li>
<li>Bracket-pojmenované vrstvy <code>&lt;Clip Group&gt;</code>, <code>&lt;Group&gt;</code> — skript se nyní vyhýbá modifikacím.</li>
<li>Velmi velké souřadnice (>16383pt) — skript hodnoty validuje.</li>
</ul>
Pokud crash přetrvává, prosím nahlaste autorovi s popisem dokumentu (Layers panel) a posloupností akcí.
</details>

<details>
<summary><strong>Preset se „ztratil" / nečekaně změnil</strong></summary>
Pojmenované presety jsou <strong>immutable</strong>. Generate je nemění — pouze tlačítko <strong>Uložit</strong> commituje aktuální hodnoty UI do aktivního presetu. Pokud chcete uložit jako novou variantu, použijte <strong>Uložit jako</strong>. Modified indicator (hvězdička <code>*</code> u názvu) signalizuje neuložené změny.
</details>

---

## Changelog

Formát: [Keep a Changelog](https://keepachangelog.com/) — kategorie `Added` / `Changed` / `Fixed` / `Removed` / `Security`.

### v1.0.0 (2026-06) — První veřejné vydání

Open-source (MIT) vydání tří produkčně ověřených skriptů pro Adobe Illustrator, vyvinutých a vyladěných pro reálnou předtiskovou práci.

**Zünd & Summa Marks** — registrační značky pro plottery Zünd (ECHO) a Summa (OPOS): mapování vrstev na přímé barvy (až 8 řezacích vrstev), režim „Pouze značky", ořezové linky v samostatné vrstvě, pojmenované předvolby s návratem, podpora Large Canvas i zmenšených dokumentů 1:N, detekce ořezových masek, kontrola duplicitní barvy.

**Grommet Marks** — Esko značky pro oka po hranách nebo libovolné cestě, rohové zóny, registrační terče s bílým halo, pojmenované předvolby.

**Batch Relink & Export** — hromadný relink PDF do `.ai` vyřazovací šablony a export tiskových PDF: pre-flight validace, ověření relinku, přirozené číslování archů, pojmenování přes vzor, obnova po pádu (skip-existing).

Napříč sadou: dvojjazyčné UI (CS / EN), živá validace vstupů, defenzivní ošetření C++ crash edge-cases Illustratoru, a ES3-čistý modulární build s testovací suitou v Node.js.

---

## Licence

Licence MIT. Copyright (C) 2025-2026 Ladislav Osvald. Viz [`LICENSE`](LICENSE).

Software můžete volně používat, kopírovat, upravovat a distribuovat (i komerčně), pokud zachováte copyright. Poskytováno „as is", bez jakýchkoli záruk.

**Třetí strany:** `json2.js` od Douglas Crockford — public domain.

---

## Podpora projektu

Pokud vám sada šetří čas v každodenní práci a chcete přispět na další vývoj:

- **[Buy Me a Coffee](https://buymeacoffee.com/osva1d)** — jednorázový tip, lokalizovaná měna (USD / EUR / CZK / …).
- **Issues a Pull Requests** — bug reporty, návrhy a vylepšení jsou vítány v issue trackeru projektu.
- **Sdílení** — zmínka v komunitě (CZ/SK printshop fóra, LinkedIn) je nejlevnější forma podpory.

---

## Autor

- **Koncept & vývoj:** Ladislav Osvald (Osva1d)
- **Rok:** 2025–2026
- **Kontakt:** přes issue tracker projektu nebo direct message
