# Test Plan: Zünd & Summa Marks v26.3

> **Note:** Tento test plan byl napsán pro v26.3.0. Projekt je nyní v26.3.1.
> Testovací případy jsou stále platné, ale drobné detaily (čísla řádků, velikosti)
> se mohou lišit.

**Skript:** `illustrator-zund-summa-marks.jsx`
**Verze:** 26.3.0
**Namespace:** `ZSM.*`
**Datum:** 2026-02-21

---

## Přehled

Ověření funkcionality skriptu po refaktorizaci v26.3. Scope:
- Generování registračních značek (ZUND / SUMMA)
- Dynamická správa vrstev (`layers[]`)
- Preset systém (ukládání, přepínání, ochrana výchozích)
- Multilanguage (cs/en dle `app.locale`)
- Validace vstupů a error handling
- Migrace nastavení z předchozích verzí (v26.0)
- Large Canvas kompatibilita (`scaleFactor = 10.0`)

**Hybrid mód byl odstraněn ve v26.0 — testy pro hybrid se nevykonávají.**

---

## Priority a release criteria

| Priorita | Počet | Podmínka pro release |
|----------|-------|----------------------|
| **P0** | 14 | 100 % PASS — blocker |
| **P1** | 12 | 90 %+ PASS |
| **P2** | 8 | Best effort |

---

## Testovací prostředí

| Parametr | Hodnota |
|----------|---------|
| OS | macOS 12 Monterey nebo novější |
| Illustrator | CC 2024 (v28.x) nebo CC 2025 (v29.x) |
| Units | Millimeters (`Preferences > Units`) |
| Skript | `dist/illustrator-zund-summa-marks.jsx` |

**Před každým testem:** zavřít všechny dokumenty, načíst skript přes `File > Scripts > Other Script...`

---

## Coverage matrix

| Oblast | Testy | Priorita |
|--------|-------|----------|
| ZUND — základní layout | TC-001 | P0 |
| ZUND — intermediate marks | TC-002 | P0 |
| ZUND — layer mapping | TC-003 | P0 |
| ZUND — Fixed Artboard | TC-004 | P1 |
| SUMMA — základní layout | TC-005 | P0 |
| SUMMA — červené linky | TC-006 | P0 |
| SUMMA — feed margins | TC-007 | P0 |
| Barva značek — swatch dropdown | TC-008 | P1 |
| Dynamické vrstvy — základní | TC-009 | P0 |
| Dynamické vrstvy — vlastní název | TC-010 | P0 |
| Dynamické vrstvy — + Přidat | TC-011 | P0 |
| Preset — uložení a načtení | TC-012 | P1 |
| Preset — ochrana výchozího | TC-013 | P1 |
| Preset — Last Settings | TC-014 | P1 |
| Validace — písmeno | TC-015 | P0 |
| Validace — mimo rozsah | TC-016 | P0 |
| Error — žádný dokument | TC-017 | P1 |
| Error — nic nevybráno | TC-018 | P1 |
| Persistence — save/load | TC-019 | P1 |
| Persistence — výchozí | TC-020 | P1 |
| Migrace z v26.0 | TC-021 | P1 |
| Large Canvas | TC-022 | P2 |
| Clipping masks | TC-023 | P2 |
| Locked layers | TC-024 | P2 |
| Math — artboard resize | TC-025 | P0 |
| Math — intermediate pozice | TC-026 | P0 |
| Math — SUMMA bar pozice | TC-027 | P0 |
| Math — feed výška artboardu | TC-028 | P0 |

---

## SEKCE 1 — ZUND mód

### [TC-001] ZUND — základní layout, Auto-fit (P0)

**Prerekvizity:** Dokument, vybraný obdélník 100×100 mm.

**Vstup:**
```
Mode:           ZUND
Výpočet:        Dle výběru (Auto-fit)
Gap od grafiky: 10 mm
Gap od okraje:  0 mm
Rozteč:         400 mm
Velikost Zünd:  5 mm
Barva:          [Registration]
Vrstvy:         Cut (aktivní), Kiss-cut (neaktivní)
```

**Očekávaný výsledek:**
- 9 kruhových značek na layeru `Regmarks` (4 rohy + 1 orientační + 4 středové)
- Průměr značky: 5,0 mm ±0,1 mm
- Artboard: 125–126 mm ×125–126 mm

**Výpočet artboardu:**
```
reqHalfW = 50 + 10 + 2,5 + 0 = 62,5 mm
W = Math.ceil(62,5 × 2) = 125 mm
```

| Parametr | Očekáváno | Tolerance |
|----------|-----------|-----------|
| Počet značek | 9 | 0 |
| Průměr značky | 5,0 mm | ±0,1 mm |
| Artboard W | 125–126 mm | — |
| Artboard H | 125–126 mm | — |

---

### [TC-002] ZUND — intermediate marks (P0)

**Prerekvizity:** Dokument, vybraný obdélník 600×100 mm.

**Vstup:**
```
Mode: ZUND, Auto-fit
Gap od grafiky: 10 mm
Rozteč: 150 mm
Velikost Zünd: 5 mm
```

**Výpočet:**
```
segments = Math.ceil(600 / 150) = 4
intermediate = segments - 1 = 3
Pozice: 150, 300, 450 mm od levého rohu
```

| Parametr | Očekáváno | Tolerance |
|----------|-----------|-----------|
| Značky na horní hraně | 7 (4+3) | ±1 |
| Rozteč | 150 mm | ±10 mm |
| Značky na krátké hraně | 2 (pouze rohy) | 0 |

---

### [TC-003] ZUND — layer mapping (P0)

**Prerekvizity:** Dokument s cestami se Spot color `Cut` a cestami s jinou barvou.

**Vstup:**
```
Vrstvy: Cut (aktivní, barva: Cut), Kiss-cut (neaktivní)
```

**Očekávaný výsledek:**
- Layer `Cut` vytvořen
- Cesty s barvou `Cut` přesunuty; ostatní na původních layerech
- Layer order: Regmarks → Cut → Graphics

---

### [TC-004] ZUND — Fixed Artboard (P1)

**Prerekvizity:** Artboard ručně 200×200 mm, obdélník 100×100 mm uprostřed, vybraný.

**Vstup:**
```
Mode: ZUND
Výpočet: Dle Artboardu (Fixed)
Gap od okraje: 5 mm
```

**Očekávaný výsledek:**
- Artboard zůstane přesně 200×200 mm
- Offset značky od AB edge: 5 mm ±0,5 mm
- `Gap od grafiky` ignorován

---

## SEKCE 2 — SUMMA mód

### [TC-005] SUMMA — základní layout (P0)

**Prerekvizity:** Dokument, vybraný obdélník 100×100 mm.

**Vstup:**
```
Mode:        SUMMA
Feed Top:    70 mm
Feed Bottom: 50 mm
Rozteč:      400 mm
Velikost:    3 mm
Červené:     aktivní
```

**Výpočet výšky artboardu:**
```
100 + 2×(10 + 1,5) + 70 + 50 ≈ 243 mm
```

| Parametr | Očekáváno | Tolerance |
|----------|-----------|-----------|
| Počet čtverců | 6 | 0 |
| Strana čtverce | 3,0 mm | ±0,1 mm |
| Bar Y-pozice | 11,5 mm pod grafikou | ±0,5 mm |
| Bar tloušťka | 3,0 mm | ±0,1 mm |
| Červené linky | 2 | 0 |
| Artboard H | 240–245 mm | — |

---

### [TC-006] SUMMA — červené linky vypnuty (P0)

**Vstup:** SUMMA, červené linky neaktivní.

**Očekávaný výsledek:** Žádné červené linky; bar a čtverce normálně.

---

### [TC-007] SUMMA — feed margins (P0)

**Vstup:**
```
Mode: SUMMA
Feed Top: 100 mm (jiná hodnota než TC-005)
Feed Bottom: 30 mm
```

**Očekávaný výsledek:**
- Artboard výška odpovídá novým feed hodnotám
- Červené linky na správných pozicích (okraj artboardu)

---

### [TC-008] Swatch dropdown pro barvu značek (P1)

**Prerekvizity:** Dokument se Spot swatchem `DieCut` (přímá barva).

**Akce:** Otevřít dialog — zkontrolovat dropdown `Barva značek`.

**Očekávaný výsledek:**
- Dropdown obsahuje `[Registration]` a `DieCut`
- Po výběru `DieCut` a vygenerování: značky mají barvu `DieCut`

---

## SEKCE 3 — Dynamické vrstvy

### [TC-009] Dvě aktivní vrstvy (P0)

**Prerekvizity:** Dokument s cestami barvy `Cut` a `Kiss`.

**Vstup:**
```
Vrstvy:
  [✓] Cut       barva: Cut
  [✓] Kiss-cut  barva: Kiss
```

**Očekávaný výsledek:**
- Oba layery vytvořeny, cesty správně přesunuty
- Layer order: Regmarks → Cut → Kiss-cut → Graphics

---

### [TC-010] Vlastní název vrstvy (P0)

**Vstup:**
```
Vrstvy: [✓] Score-cut  barva: [Registration]
```

**Očekávaný výsledek:** Layer `Score-cut` vytvořen v dokumentu.

---

### [TC-011] + Přidat vrstvu — max a pořadí (P0)

**Akce:** Kliknout `+ Přidat vrstvu` 3×.

**Očekávaný výsledek:**
- 3 nové řádky v UI (celkem 5)
- Tlačítko se deaktivuje (max 5 vrstev)
- Tlačítko vždy pod posledním řádkem

---

## SEKCE 4 — Preset systém

### [TC-012] Uložení a načtení presetu (P1)

**Akce:**
1. Nastavit SUMMA, Feed Top: 80 mm → Uložit → zadat `"Test preset"` → Generovat
2. Spustit skript znovu → vybrat `"Test preset"`

**Očekávaný výsledek:** UI naplněno hodnotami SUMMA, 80 mm.

---

### [TC-013] Ochrana výchozího presetu (P1)

**Akce:** Vybrat `[Výchozí]` → kliknout `Smazat`.

**Očekávaný výsledek:** Alert `"Výchozí předvolbu nelze smazat."`, preset zůstane.

---

### [TC-014] Last Settings auto-save (P1)

**Akce:** Generovat s ZUND, Gap: 15 mm → spustit znovu.

**Očekávaný výsledek:** Dialog otevřen s ZUND, 15 mm; aktivní preset `[Last Settings]`.

---

## SEKCE 5 — Validace vstupů

### [TC-015] Neplatná hodnota — písmeno (P0)

**Akce:** Gap od grafiky = `abc` → Generovat.

**Očekávaný výsledek:** Alert `"Gap od grafiky musí být číslo!"`, dialog zůstane otevřený.

---

### [TC-016] Hodnota mimo rozsah (P0)

**Akce:** Rozteč = `10000` (max 5000) → Generovat.

**Očekávaný výsledek:** Alert `"Rozteč značek musí být mezi 50 a 5000!"`, dialog zůstane otevřený.

---

## SEKCE 6 — Error handling

### [TC-017] Žádný dokument (P1)

**Prerekvizity:** Všechny dokumenty zavřeny. Spustit skript.

**Očekávaný výsledek:** Alert `"Není otevřený dokument."`, graceful exit.

---

### [TC-018] Nic nevybráno — Auto-fit (P1)

**Prerekvizity:** Dokument otevřen, nic nevybráno. Mode ZUND, Auto-fit → Generovat.

**Očekávaný výsledek:** Alert `"Nic není vybráno."`, graceful exit.

---

## SEKCE 7 — Persistence

### [TC-019] Save / load (P1)

**Akce:** Generovat SUMMA, Feed Top: 90 mm → zavřít Illustrator → spustit znovu.

**Očekávaný výsledek:** Dialog s SUMMA, 90 mm. Soubor: `~/Library/Application Support/ZSM/settings_v26_3.json`.

---

### [TC-020] Výchozí hodnoty — první spuštění (P1)

**Prerekvizity:**
```bash
rm ~/Library/Application\ Support/ZSM/settings_v26_3.json
```

**Očekávaný výsledek:** Mode: ZUND, Gap: 10 mm, Rozteč: 400 mm, Velikost: 5 mm, preset: `[Výchozí]`.

---

### [TC-021] Migrace ze starého formátu v26.0 (P1)

**Prerekvizity:**
```bash
mkdir -p ~/Library/Application\ Support/ZSM
cat > ~/Library/Application\ Support/ZSM/settings_v26_3.json << 'EOF'
{"mode":"ZUND","gapInner":12,"gapOuter":2,"maxDist":300,"feedTop":70,"feedBottom":50,"drawRed":false,"thruActive":true,"thruName":"cut","kissActive":false,"kissName":"","markSizeZ":5,"markSizeS":3,"markColor":"[Registration]"}
EOF
```

**Očekávaný výsledek:**
- Skript spustí bez erroru
- Vrstva `Cut` aktivní; `Kiss-cut` neaktivní
- Hodnoty: gapInner 12 mm, gapOuter 2 mm, maxDist 300 mm

---

## SEKCE 8 — Edge cases

### [TC-022] Large Canvas — scaleFactor 10.0 (P2)

**Prerekvizity:** Artboard 6000×3000 mm, vybraný obdélník 5000×2000 mm.

**Vstup:** ZUND, Gap: 10 mm, Velikost: 5 mm.

**Očekávaný výsledek:**
- Průměr značky: **5 mm** (ne 50 mm)
- Offset: **10 mm** (ne 100 mm)

Toto je kritický test — Large Canvas bez `/ scaleFactor` by dával 10× větší hodnoty.

---

### [TC-023] Clipping masks (P2)

**Prerekvizity:** GroupItem s clipping maskou 100×100 mm, vnitřní obsah větší.

**Vstup:** ZUND, Auto-fit.

**Očekávaný výsledek:** Bounds z masky (100×100 mm), ne z vnitřního obsahu.

---

### [TC-024] Locked layers — zachování stavu (P2)

**Prerekvizity:** Layer `Background` zamčený.

**Očekávaný výsledek:** Po dokončení skriptu je `Background` znovu zamčený.

---

## SEKCE 9 — Matematická přesnost

### [TC-025] Artboard resize — verifikace (P0)

**Vstup:** Grafika 100×100 mm, ZUND Auto-fit, Gap: 10 mm, Gap od okraje: 0 mm, Velikost: 5 mm.

**Ruční výpočet:**
```
reqHalfW = 50 + 10 + 2,5 + 0 = 62,5 mm
W = Math.ceil(125,0) = 125 mm
```

**Měření:** Artboard W = 125 mm ±0,5 mm.

---

### [TC-026] Intermediate marks — pozice (P0)

**Vstup:** Grafika 600×100 mm, ZUND, Gap: 10 mm, Rozteč: 200 mm.

**Ruční výpočet:**
```
segments = Math.ceil(600 / 200) = 3
intermediate = 2
Pozice: 200 mm, 400 mm od levého rohu
```

**Měření:** 2 intermediate, pozice 200 mm a 400 mm ±5 mm.

---

### [TC-027] SUMMA bar pozice (P0)

**Vstup:** SUMMA mód, libovolná grafika.

**Konstanty z kódu:**
```
ZSM.Core.SUMMA_BAR_OFFSET = 11,5 mm (pod dolním okrajem grafiky)
ZSM.Core.SUMMA_BAR_WIDTH  = 3 mm
```

**Měření:** Bar centerline 11,5 mm ±0,5 mm pod grafikou; tloušťka 3,0 mm ±0,1 mm.

---

### [TC-028] Feed — výška artboardu (P0)

**Vstup:** SUMMA, Feed Top: 70 mm, Feed Bottom: 50 mm, Grafika: 100×100 mm.

**Ruční výpočet:**
```
H = 100 + 2×(10 + 1,5) + 70 + 50 = 243 mm
```

**Měření:** Artboard H = 240–245 mm.

---

## Edge case matrix

| Vstup | Chování | Priorita |
|-------|---------|----------|
| Gap: `-10` | Validation error | P2 |
| Rozteč: `0` | Validation error (min 50) | P2 |
| Gap: `""` prázdný | Validation error | P2 |
| Gap: `"10,5"` čárka | Akceptovat (10,5 mm) | P2 |
| Barva: neexistující | Auto-create spot + warning alert | P1 |
| Barva: `"CUT"` vs `"cut"` | Case-insensitive — funguje | P2 |
| Kliknout Zrušit | Žádná změna v dokumentu | P2 |

---

## Pořadí testování

```
SMOKE  (10 min):  TC-001, TC-005, TC-017
CORE   (60 min):  TC-001–TC-011, TC-015–TC-016, TC-025–TC-028
INTEG  (30 min):  TC-012–TC-014, TC-018–TC-021
EDGE   (20 min):  TC-022–TC-024
```

---

## Šablona bug reportu

```markdown
## BUG — [TC-XXX] [Stručný popis]

**Priorita:** P0 / P1 / P2
**Prostředí:** Illustrator CC 202X, macOS X.X, skript v26.3.0

**Kroky:**
1. ...

**Očekáváno:** ...
**Skutečnost:** ...

**Měření:**
| Parametr | Expected | Actual |
|----------|----------|--------|

**Modul:** ZSM.Core / ZSM.Draw / ZSM.UI / ZSM.Config
**Funkce:** calculateAll() / render() / show() / Storage.load()
```
