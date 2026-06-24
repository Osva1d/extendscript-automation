# ExtendScript automatizace pro Adobe Illustrator

[![Version](https://img.shields.io/gitea/v/release/Osva1d/extendscript-automation?gitea_url=https%3A%2F%2Fcodeberg.org&label=version&color=blue)](https://codeberg.org/Osva1d/extendscript-automation/releases)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)

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
| 1 | [`illustrator-zund-summa-marks.jsx`](./Scripts/illustrator-zund-summa-marks.jsx) | **26.5.1** | Generátor registračních značek pro Zünd + Summa, presety, lokalizace |
| 2 | [`illustrator-grommet-marks.jsx`](./Scripts/illustrator-grommet-marks.jsx) | **6.0.0** | Značky pro oka — hrany nebo cesta, rohové zóny, Esko značky |
| 3 | [`illustrator-batch-relink-export.jsx`](./Scripts/illustrator-batch-relink-export.jsx) | 3.0.0 | Hromadný relink PDF do `.ai` vyřazovacích šablon a export tiskových PDF |

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

> **Tip:** Od v26.4.0 můžete místo toho zaškrtnout **„Pracovat v měřítku"** a zadat poměr 1:N — skript reálné mm přepočítá za vás, takže už nemusíte každou hodnotu dělit ručně.

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
- Pojmenování výstupů přes vzor — `{n}` (číslo archu), `{template}`, `{source}`
- Náhled před během (přeskočí se u bezchybné dávky); přeskočení existujících pro obnovu po pádu
- Ignoruje macOS sidecar soubory (`._*`) na flash discích; lokalizace CS / EN

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
<li>Žádné prázdné pole (od v26.3.x prázdný vstup = chyba, ne tichá 0).</li>
<li>Hodnoty v dovoleném rozsahu (např. Rozteč značek 5–5000 mm).</li>
<li>Při zmenšeném dokumentu zadávejte hodnoty v měřítku dokumentu — viz <a href="#workflow-při-zmenšeném-měřítku-110">Workflow 1:10</a> v sekci Zünd & Summa Marks.</li>
</ul>
</details>

<details>
<summary><strong>Skript shodil Illustrator</strong></summary>
ExtendScript může v Illustratoru vyvolat C++ crash, který try/catch nezachytí. Známé příčiny (všechny ošetřeny ve v26.3.x):
<ul>
<li>Krok zpět (Undo) a opakované spuštění bez restartu — DOM v nekonzistentním stavu.</li>
<li>Bracket-pojmenované vrstvy <code>&lt;Clip Group&gt;</code>, <code>&lt;Group&gt;</code> — skript se nyní vyhýbá modifikacím.</li>
<li>Velmi velké souřadnice (>16383pt) — skript hodnoty validuje.</li>
</ul>
Pokud crash přetrvává, prosím nahlaste autorovi s popisem dokumentu (Layers panel) a posloupností akcí.
</details>

<details>
<summary><strong>Preset se „ztratil" / nečekaně změnil</strong></summary>
Od v26.3.x jsou pojmenované presety <strong>immutable</strong>. Generate je nemění — pouze tlačítko <strong>Uložit</strong> commituje aktuální hodnoty UI do aktivního presetu. Pokud chcete uložit jako novou variantu, použijte <strong>Uložit jako</strong>. Modified indicator (hvězdička <code>*</code> u názvu) signalizuje neuložené změny.
</details>

---

## Changelog

Formát: [Keep a Changelog](https://keepachangelog.com/) — kategorie `Added` / `Changed` / `Fixed` / `Removed` / `Security`.

### v1.6.0 (2026-06) — Grommet Marks v6.0.0
- **Added:** Režim umístění na cestu — značky po vybrané otevřené/uzavřené cestě (rohy vždy ukotvené; hladké cesty podporují počet i rozestup).
- **Added:** Rohové zóny — zhuštění prvních N značek u každého rohu vlastní roztečí (hrany i cesta).
- **Added:** Jednotná Esko značka — bílé halo (knockout) + registrační tah, kruh a/nebo kříž, jedna velikost; vždy na pevné vrstvě „Grommet Marks".
- **Changed:** Kompletní redesign dialogu — volba režimu umístění, zarovnaná mřížka hran se zrcadlením ve vlastním řádku, jednotky nahoře, jednotná 4px škála mezer.
- **Removed:** Volba výplně / tahu / cílové vrstvy a per-mark vzorník (nahrazeno jednotnou značkou).

### v1.5.0 (2026-06) — Grommet Marks v4.2.1
- **Added:** Tlačítko ↺ Revert vedle dropdownu předvoleb (návrat k uloženým hodnotám předvolby).
- **Changed:** Dvouřádkový panel předvoleb (Uložit / Uložit jako / Smazat pod dropdownem) podle layoutu Zünd & Summa Marks.
- **Changed:** Zarovnání dropdownů vzhledu přes pevný sloupec popisků.
- **Removed:** Tlačítko Reset (nahrazeno ↺ revert) a volba tvaru kruh/čtverec — značky jsou nyní vždy kruhové.
- **Fixed:** Živá validace obnoví výchozí barvu textu (žádné černé pole na tmavém pozadí).
- **Fixed:** Selhání zápisu nastavení na disk se vždy nahlásí (tiché selhání mohlo „oživit" smazanou předvolbu po restartu).
- **Fixed:** Neumístěné značky se hlásí souhrnným varováním místo tichého chybění na tiskovém výstupu.
- **Fixed:** Fallback na [Registration] ověřuje, že vzorník je skutečně registrační (smazaný [Registration] mohl tiše obarvit značky náhodným vzorníkem).
- **Fixed:** Desetinný počet značek („10.5") se odmítne místo tichého oříznutí na 10.

### v1.4.1 (2026-06) — Zünd & Summa Marks v26.5.1 (hotfix)
- **Fixed:** Opakované spuštění SUMMA s ořezovými linkami zvětšovalo artboard při každém běhu — vrstva „Trim" se chybně započítávala do měření hranic (regrese z v26.5.0).
- **Fixed:** SUMMA běh s vypnutými ořezovými linkami nyní odstraní zastaralou vrstvu „Trim" z předchozího běhu.
- **Fixed:** Selhání zápisu souboru nastavení (plný disk, oprávnění) se hlásí, místo tichého ignorování.
- **Fixed:** Psaní víceciferného měřítka (např. „12") už nezamkne pole po první číslici; měřítko mimo rozsah zčervená a zablokuje Generovat, místo tichého oříznutí.
- **Fixed:** Tlačítka Uložit/↺ se deaktivují ihned po úspěšném uložení.
- **Fixed:** Názvy předvoleb tvaru `[Text]` jsou rezervované; drobné opravy konzistence a chybových hlášek.

### v1.4.0 (2026-06) — Zünd & Summa Marks v26.5.0
- **Added:** Režim „Pouze značky" — pro dokumenty s už separovanými vrstvami; vykreslí jen značky, uživatelské vrstvy nechá beze změny.
- **Added:** Tlačítko ↺ Revert vedle dropdownu předvoleb (návrat k uloženým hodnotám předvolby).
- **Changed:** Ořezové linky (SUMMA) jdou nově vždy do samostatné top-level vrstvy „Trim" (mimo Regmarks i cut vrstvy).
- **Removed:** Tlačítko Reset — tovární hodnoty přes předvolbu `[Výchozí]`, návrat k předvolbě přes ↺. Footer je nyní jen Storno + Generovat.
- **Fixed:** Falešná hvězdička „změněno" u předvoleb s registrační barvou v lokalizovaném (CZ) Illustratoru.
- **Fixed:** Neplatný vstup mohl zaseknout dialog (pole červené, Generovat vypnutý) i po opravě hodnoty nebo revertu.
- **Fixed:** Pád Illustratoru (C++) při generování SUMMA značek s ořezovými linkami.

### v1.3.0 (2026-06) — Batch Relink & Export v3.0.0
- **Changed:** Kompletní přepis Batch Relink & Export — modulární ExtendScript, robustní pojistky, lokalizace CS/EN.
- **Changed:** Pojmenování výstupů přes vzor s placeholdery (`{n}` / `{template}` / `{source}`, výchozí `{n}_{template}`).
- **Added:** Ověření relinku, automatické odemčení/obnovení zamčených vrstev a objektů.
- **Added:** Pre-flight sken všech zdrojů; tvrdý blok souborů s více stranami než pozic nebo s nejednoznačným počtem stran.
- **Added:** Neúplný poslední arch hlášen k ručnímu dočištění („N pozic navíc — odeber ručně").
- **Added:** Přirozené (numerické) řazení zdrojů pro předvídatelné číslování archů.
- **Fixed:** macOS AppleDouble (`._*`) soubory ve zdrojové složce se ignorují.
- **Removed:** Samostatný vyřazovací skript (slepá větev vývoje).

### v1.2.1 (2026-05) — Zünd & Summa Marks v26.3.2
- **Fixed:** Validace „Rozteč značek" snížila minimum 50 → 5 mm. Workflow 1:10 zmenšených dokumentů už nezasekává tlačítko Generovat.
- **Added:** Sekce „Workflow při zmenšeném měřítku" v dokumentaci skriptu Zünd & Summa Marks.

### v1.2.0 (2026-04) — Zünd & Summa Marks v26.3.1
- **Added:** Stabilní presety (immutable named presets, modified indicator `*`).
- **Added:** Save / Save As / Reset rozdělení.
- **Added:** E2E test workflow + ES3 compliance linter.
- **Fixed:** Detekce hranice clipping masky + skip vrstvy Regmarks.
- **Fixed:** Validace prázdného řetězce (`Number("")` quirk).
- **Fixed:** `main.jsx` četl stale preset místo `[Last Settings]`.
- **Fixed:** `Array.map` v ExtendScriptu (ES3 compliance).
- **Security:** Defenzivní opatření v `render()` proti C++ pipeline crashům.

### v1.1.x (2026-02) — Grommet Marks v3.0.0
- **Added:** `illustrator-grommet-marks.jsx`.
- **Changed:** Sjednocené hlavičky skriptů (`Script` / `Version` / `Author` / `Updated`).

### v1.0.x (2025–2026) — Initial public release
- **Added:** První veřejná verze sady skriptů — Zünd & Summa Marks, Batch Relink, Zünd Board Workflow.

---

## Licence

Tento projekt je licencován pod **GNU General Public License v3.0** — viz [`LICENSE`](LICENSE) (plný text) a [`COPYRIGHT`](COPYRIGHT) (shrnutí + třetí strany).

**Co to znamená v praxi:**

- Software můžete **volně používat** pro jakýkoli účel — osobní, akademický i komerční (např. v print shopu).
- Software můžete **modifikovat** a vytvářet odvozená díla.
- Pokud modifikovanou verzi **distribuujete** (přeprodáváte nebo zveřejňujete), musíte zachovat licenci GPL-3.0 a zpřístupnit zdrojový kód.
- Software je poskytován „as is", bez jakýchkoli záruk.

**Komerční licence:** Pokud podmínky GPL-3.0 (zejména povinnost zveřejnit modifikace) nejsou pro váš use case kompatibilní, lze sjednat komerční licenci samostatně. Kontaktujte autora.

**Třetí strany:** `json2.js` od Douglas Crockford — public domain.

---

## Podpora projektu

Pokud vám sada šetří čas v každodenní práci a chcete přispět na další vývoj:

- **[Buy Me a Coffee](https://buymeacoffee.com/osva1d)** — jednorázový tip, lokalizovaná měna (USD / EUR / CZK / …).
- **Issues a Pull Requests** — bug reporty, návrhy a vylepšení jsou vítány v [Issues](https://codeberg.org/Osva1d/extendscript-automation/issues).
- **Sdílení** — zmínka v komunitě (CZ/SK printshop fóra, LinkedIn) je nejlevnější forma podpory.

---

## Autor

- **Koncept & vývoj:** Ladislav Osvald (Osva1d)
- **Rok:** 2025–2026
- **Kontakt:** přes [Issues](https://codeberg.org/Osva1d/extendscript-automation/issues) nebo direct message
