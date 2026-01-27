# ExtendScript automatizace pro Adobe Illustrator

Sada nástrojů v jazyce JavaScript (.jsx) pro automatizaci předtiskové přípravy, zefektivnění práce a generování tiskových dat v Adobe Illustratoru.

## Skripty

### 1. Zund Registration Marks (`Illustrator_Zund_Marks.jsx`)
- *Starší verze / Legacy skript pouze pro Zund.*
- Automatická příprava dat pro řezací stoly **Zund**.
- Generuje 5mm registrační značky v bezpečném rozložení **10-5-10**.
- Třídí vrstvy na `REGMARKS`, `CUT` a tisková data.

### 2. Batch Relink & Export (`Batch_Relink_Export.jsx`)
- Hromadné vkládání PDF souborů do připravené šablony (impozice)
- **Uživatelské rozhraní:** Přehledný dialog pro výběr šablony (.ai), zdrojové složky a cílové složky
- **Inteligentní Relink:** Automaticky najde propojený objekt (placeholder) v šabloně a nahradí ho aktuálním souborem
- Export s definovaným **PDF Presetem** (např. `[Tisková kvalita]`)
- Možnost nastavení prefixu výstupních souborů
- Detailní reportování chyb a progress bar

### 3. Zund & Summa Automation (`Illustrator_Zund_Summa_Marks.jsx`)
- **Komplexní automatizace** pro řezací stoly **ZUND (Desky)** a **SUMMA (Role/OPOS)**.
- **Inteligentní UI:** Jedno okno (350px) s dynamickým přepínáním voleb podle zvoleného stroje.
- **Layer Engine:** Automatická správa vrstev `Regmarks`, `Thru-cut`, `Kiss-cut`.
- **Logic:** Výpočet Artboardu na základě pozice značek (fixace grafiky proti posunu).
- **Features:**
  - Obsahuje správu vrstev, Feed logiku a Red Lines.
  - Asymetrická značka pro kontrolu rotace.
  - Generování OPOS Bar pro Summu.
  - Automatické přejmenování spodní vrstvy na `Graphics`.

## Požadavky

- **macOS** nebo **Windows**
- **Adobe Illustrator** (testováno na verzích CC)

## Instalace

1. Stáhněte `.jsx` soubory ze složky `Scripts` v tomto repozitáři
2. Přesuňte soubory do systémové složky Skripty v Adobe Illustratoru:
   - **macOS:** `/Applications/Adobe Illustrator [Verze]/Presets.localized/cs_CZ/Scripts`
   - **Windows:** `C:\Program Files\Adobe\Adobe Illustrator [Verze]\Presets\cs_CZ\Skripty`
3. Restartujte Adobe Illustrator
4. Skripty naleznete v menu `Soubor` → `Skripty`

### Spouštění klávesovou zkratkou
Pro časté používání doporučuji vytvořit Akci:
1. Otevřete panel Akce (`F9`)
2. Vytvořte novou akci
3. Přes menu panelu zvolte "Vložit položku nabídky..." (Insert Menu Item)
4. Vyberte nainstalovaný skript z menu Soubor → Skripty
5. Přiřaďte funkční klávesu (např. F5)

## Použití

### Příprava značek pro iEcho/Zund
1. Otevřete grafiku v Illustratoru
2. Zajistěte, aby ořezová cesta měla tah přímou barvou (Spot Color) s názvem "Cut" (nebo upravte název v nastavení skriptu)
3. Spusťte `Echo_Zund_Marks.jsx`
4. Skript automaticky roztáhne plátno, seřadí vrstvy a vloží značky

### Hromadný export (Batch Relink)
1. Připravte si šablonu `.ai`, kde je umístěn libovolný "linked" soubor jako zástupný objekt
2. Spusťte `Batch_Relink_Export.jsx`
3. V dialogovém okně vyberte:
   - Šablonu (.ai)
   - Složku se zdrojovými PDF
   - Složku pro export
4. Zadejte přesný název PDF presetu (musí existovat v Illustratoru)
5. Klikněte na **Spustit**

## Autor
- **Koncept a testování:** Ladislav Osvald
- **Implementace:** Gemini (Google DeepMind) & Claude (Anthropic AI)
- **Rok:** 2025