# Test Plan: Zünd & Summa Marks v26.3

**Skript:** `illustrator-zund-summa-marks.jsx`
**Verze:** 26.3.1
**Namespace:** `ZSM.*`
**Datum:** 2026-04-02

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
| **P0** | 16 | 100 % PASS — blocker |
| **P1** | 16 | 90 %+ PASS |
| **P2** | 9 | Best effort |

---

## Testovací prostředí

| Parametr | Hodnota |
|----------|---------|
| OS | macOS 12 Monterey nebo novější |
| Illustrator | CC 2024 (v28.x) nebo CC 2025 (v29.x) |
| Units | Millimeters (`Preferences > Units`) |
| Skript | `dist/illustrator-zund-summa-marks.jsx` |

**Před každým testem:** zavřít všechny dokumenty, načíst skript přes `File > Scripts > Other Script...`

**Pozn. k locale:** Testy chybových hlášek uvádějí české znění (cs). V anglickém Illustratoru se hlášky liší — viz `ZSM.L` stringy. Testovat v locale odpovídajícím uvedeným hlášekám.

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
| Duplicitní barva ve vrstvách | TC-029 | P1 |
| Mode switch — zachování dat | TC-030 | P1 |
| Registration color lokalizace | TC-031 | P1 |
| Orient mark — AB rozšíření | TC-032 | P1 |
| SUMMA intermediate — jen L/R | TC-033 | P1 |
| Auto-create spot color | TC-034 | P1 |
| Prázdný layer name | TC-035 | P2 |
| [Last Settings] smazání | TC-036 | P2 |
| orientDist krajní hodnoty | TC-037 | P2 |

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
Orient. offset: 100 mm
Barva:          [Registration]
Vrstvy:         Cut (barva: [Registration])
```

**Očekávaný výsledek:**
- 5 kruhových značek na layeru `Regmarks` (4 rohy + 1 orientační)
- Žádné intermediate marks (rozteč 400 mm > délka hrany ~130 mm)
- Průměr značky: 5,0 mm ±0,1 mm
- Artboard: 130 mm × symetrický (výška závisí na snap logice)

**Výpočet artboardu (šířka):**
```
offZX = gapInner + rZ = 10 + 2,5 = 12,5 mm
rMax = rZ = 2,5 mm
gapOuter = 0 mm
reqHalfW = 50 + (offZX + rMax + gapOuter) = 50 + (12,5 + 2,5 + 0) = 65 mm
W = snapCeil(65 × 2) = 130 mm
```

**Výpočet artboardu (výška):**
```
offZY = gapInner + rZ = 10 + 2,5 = 12,5 mm
feedT = feedB = gapOuter = 0 mm (ZUND používá gapOuter jako feed)
abTop = gT + mm2pt(offZY) + mm2pt(rZ) + mm2pt(0) = gT + mm2pt(15)
abBot = gB - mm2pt(15)
H = 100 + 30 = 130 mm
```

| Parametr | Očekáváno | Tolerance |
|----------|-----------|-----------|
| Počet značek | 5 | 0 |
| Průměr značky | 5,0 mm | ±0,1 mm |
| Artboard W | 130 mm | ±1 mm |
| Artboard H | 130 mm | ±1 mm |

---

### [TC-002] ZUND — intermediate marks (P0)

**Prerekvizity:** Dokument, vybraný obdélník 600×100 mm.

**Vstup:**
```
Mode: ZUND, Auto-fit
Gap od grafiky: 10 mm
Gap od okraje:  0 mm
Rozteč: 150 mm
Velikost Zünd: 5 mm
Orient. offset: 100 mm
```

**Výpočet:**
```
Délka horní/dolní hrany v marks-space: xR - xL
  xL = gL - mm2pt(offZX) = gL - mm2pt(12,5)
  xR = gR + mm2pt(offZX) = gR + mm2pt(12,5)
  délka = 600 + 25 = 625 mm
segments = Math.ceil(625 / 150) = 5 (v mark-space pt)
intermediate horní/dolní = 5 - 1 = 4

Délka levé/pravé hrany v marks-space: yT - yB
  délka = 100 + 25 = 125 mm
  125 < 150 → 0 intermediate na krátké hraně
```

| Parametr | Očekáváno | Tolerance |
|----------|-----------|-----------|
| Celkem značek | 5 + 4+4+0+0 = 13 | ±1 |
| Intermediate horní hrana | 4 | ±1 |
| Intermediate krátká hrana | 0 | 0 |
| Rozteč intermediate | ~125 mm (625/5) | ±15 mm |

**Pozn.:** `addSteps` dělí rovnoměrně — rozteč intermediate není přesně `maxDist`, ale `délka / segments`.

---

### [TC-003] ZUND — layer mapping (P0)

**Prerekvizity:** Dokument s cestami se Spot color `Cut` a cestami s jinou barvou.

**Vstup:**
```
Vrstvy: Cut (barva: Cut)
```

**Očekávaný výsledek:**
- Layer `Cut` vytvořen
- Cesty s barvou `Cut` přesunuty; ostatní na původních layerech
- Layer order: Regmarks → Cut → Graphics
- Přesunuté cesty mají `fillOverprint = true` / `strokeOverprint = true`

---

### [TC-004] ZUND — Fixed Artboard (P1)

**Prerekvizity:** Artboard ručně 200×200 mm, obdélník 100×100 mm uprostřed, vybraný.

**Vstup:**
```
Mode: ZUND
Výpočet: Dle Artboardu (Fixed)
Gap od okraje: 5 mm
Velikost Zünd: 5 mm
```

**Očekávaný výsledek:**
- Artboard zůstane přesně 200×200 mm
- Značky umístěné dle `distFromEdge = gapOuter + rZ = 5 + 2,5 = 7,5 mm` od AB edge
- `Gap od grafiky` ignorován (disabled v UI)
- `getBounds()` vrací artboardRect, ne selection bounds

---

## SEKCE 2 — SUMMA mód

### [TC-005] SUMMA — základní layout (P0)

**Prerekvizity:** Dokument, vybraný obdélník 100×100 mm.

**Vstup:**
```
Mode:        SUMMA
Gap od okraje: 0 mm
Feed Top:    70 mm
Feed Bottom: 50 mm
Rozteč:      400 mm
Velikost:    3 mm
Červené:     aktivní
```

**Výpočet výšky artboardu:**
```
outY = summaYVisual + rS = 10 + 1,5 = 11,5 mm
rMax = rS = 1,5 mm
abTop_offset = outY + rMax + feedTop = 11,5 + 1,5 + 70 = 83 mm
abBot_offset = outY + rMax + feedBottom = 11,5 + 1,5 + 50 = 63 mm
H = 100 + 83 + 63 = 246 mm (po snapCeil/snapFloor: 245–248 mm)
```

**Výpočet šířky artboardu:**
```
outX = summaXCenter = 10 mm
reqHalfW = 50 + (outX + rMax + gapOuter) = 50 + (10 + 1,5 + 0) = 61,5 mm
W = snapCeil(123) = 123 mm
```

| Parametr | Očekáváno | Tolerance |
|----------|-----------|-----------|
| Počet čtverců | 4 (rohy, žádné intermediate) | 0 |
| Strana čtverce | 3,0 mm | ±0,1 mm |
| Bar Y-pozice | 11,5 mm pod dolním okrajem grafiky | ±0,5 mm |
| Bar tloušťka | 3,0 mm | ±0,1 mm |
| Červené linky | 2 (top a bottom edge AB) | 0 |
| Artboard H | 245–248 mm | — |
| Artboard W | 123 mm | ±1 mm |

---

### [TC-006] SUMMA — červené linky vypnuty (P0)

**Vstup:** SUMMA, červené linky neaktivní.

**Očekávaný výsledek:** Žádné červené linky; bar a čtverce normálně. Žádný sublayer `Trim` v Graphics.

---

### [TC-007] SUMMA — feed margins (P0)

**Vstup:**
```
Mode: SUMMA
Feed Top: 100 mm
Feed Bottom: 30 mm
```

**Očekávaný výsledek:**
- Artboard výška odpovídá novým feed hodnotám (asymetrický snap)
- Červené linky na správných pozicích (top/bottom edge artboardu)

---

### [TC-008] Swatch dropdown pro barvu značek (P1)

**Prerekvizity:** Dokument se Spot swatchem `DieCut` (přímá barva).

**Akce:** Otevřít dialog — zkontrolovat dropdown `Barva značek`.

**Očekávaný výsledek:**
- Dropdown obsahuje lokalizovaný `[Registration]` a `DieCut`
- Neobsahuje procesní CMYK barvy (getSwatchNames iteruje doc.spots)
- Po výběru `DieCut` a vygenerování: značky mají barvu `DieCut`

---

## SEKCE 3 — Dynamické vrstvy

### [TC-009] Dvě aktivní vrstvy (P0)

**Prerekvizity:** Dokument s cestami barvy `Cut` a `Kiss` (dva různé Spot swatche).

**Vstup:**
```
Vrstvy:
  Cut       barva: Cut
  Kiss-cut  barva: Kiss
```

**Očekávaný výsledek:**
- Oba layery vytvořeny, cesty správně přesunuty dle barvy
- Layer order: Regmarks → Cut → Kiss-cut → Graphics
- CompoundPathItems přesunuty jako celek (ne rozpadlé)
- Přesunuté cesty mají overprint zapnutý

---

### [TC-010] Vlastní název vrstvy (P0)

**Vstup:**
```
Vrstvy: Score-cut  barva: [Registration]
```

**Očekávaný výsledek:** Layer `Score-cut` vytvořen v dokumentu.

---

### [TC-011] + Přidat vrstvu — max a pořadí (P0)

**Akce:** Kliknout `+ Přidat` opakovaně.

**Očekávaný výsledek:**
- Nové řádky v UI se přidávají
- Tlačítko `+ Přidat` se deaktivuje při dosažení max 8 vrstev (`MAX_LAYERS = 8`)
- Tlačítko `−` (odebrat) deaktivováno pokud zbývá jediný řádek
- Nový řádek má předvybranou barvu z `detectCutColor()`

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

**Očekávaný výsledek:** Alert `"Výchozí předvolbu nelze smazat."` (`ERR_PRESET_DEL_DEF`), preset zůstane.

---

### [TC-014] Last Settings auto-save (P1)

**Akce:** Generovat s ZUND, Gap: 15 mm → spustit znovu.

**Očekávaný výsledek:** Dialog otevřen s ZUND, Gap 15 mm; aktivní preset `[Last Settings]`.

---

## SEKCE 5 — Validace vstupů

### [TC-015] Neplatná hodnota — písmeno (P0)

**Akce:** Mezera od grafiky = `abc` → Generovat.

**Očekávaný výsledek:**
- Alert: `"Mezera od grafiky: musí být číslo!"` (cs locale, `ERR_MUST_BE_NUMBER` s `GAP_GZ` jako label)
- Dialog zůstane otevřený

**Pozn.:** Label `GAP_GZ` = `"Mezera od grafiky:"` obsahuje dvojtečku — ta se projeví v hlášce.

---

### [TC-016] Hodnota mimo rozsah (P0)

**Akce:** Rozteč = `10000` (max 5000) → Generovat.

**Očekávaný výsledek:**
- Alert: `"Rozteč značek: musí být mezi 50 a 5000!"` (cs locale, `ERR_OUT_OF_RANGE` s `MAX_DIST`)
- Dialog zůstane otevřený

---

## SEKCE 6 — Error handling

### [TC-017] Žádný dokument (P1)

**Prerekvizity:** Všechny dokumenty zavřeny. Spustit skript.

**Očekávaný výsledek:** Alert `"Není otevřený dokument."` (`ERR_NO_DOC`), graceful exit.

---

### [TC-018] Nic nevybráno — Auto-fit (P1)

**Prerekvizity:** Dokument otevřen, nic nevybráno. Mode ZUND, Auto-fit → Generovat.

**Očekávaný výsledek:** Alert `"Nic není vybráno."` (`ERR_NO_SEL`), graceful exit.

**Pozn.:** `getBounds()` vrací null pokud nenalezne žádné pageItems mimo systémové layery.

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

**Očekávaný výsledek:**
- Mode: ZUND
- Gap od grafiky: 5 mm (`gapInner: 5`)
- Gap od okraje: 0 mm (`gapOuter: 0`)
- Rozteč: 500 mm (`maxDist: 500`)
- Velikost Zünd: 5 mm (`markSizeZ: 5`)
- Orient. offset: 100 mm (`orientDist: 100`)
- Barva: [Registration]
- Preset: `[Výchozí]` / `[Default]`
- Vrstvy: 1 řádek — Cut, [Registration]

---

### [TC-021] Migrace ze starého formátu v26.0 (P1)

**Prerekvizity:**
```bash
mkdir -p ~/Library/Application\ Support/ZSM
cat > ~/Library/Application\ Support/ZSM/settings_v26_3.json << 'EOF'
{"mode":"ZUND","gapInner":12,"gapOuter":2,"maxDist":300,"feedTop":70,"feedBottom":50,"drawRed":false,"thruActive":true,"thruName":"cut","kissActive":false,"kissName":"","markSizeZ":5,"markSizeS":3,"markColor":"[Registration]"}
EOF
```

**Migrace chain:**
1. `thruActive/kissActive` → `layers[]` (Migration 1)
2. flat object → preset wrapper (Migration 2)
3. `layers[].active` → odstraněno, inactive řádky vyfiltrovány (Migration 3)
4. `[Výchozí]` → `[Default]` (Migration 4)
5. Forward-fill chybějících klíčů z `getDefaults()`

**Očekávaný výsledek:**
- Skript spustí bez erroru
- Vrstva `Cut` (z thruName "cut") — 1 řádek
- Kiss-cut neexistuje (kissActive: false → odfiltrováno Migration 3)
- Hodnoty: gapInner 12 mm, gapOuter 2 mm, maxDist 300 mm
- `orientDist` doplněno z defaults (100 mm) — forward-fill

---

## SEKCE 8 — Edge cases

### [TC-022] Large Canvas — scaleFactor 10.0 (P2)

**Prerekvizity:** Artboard 6000×3000 mm, vybraný obdélník 5000×2000 mm.

**Vstup:** ZUND, Gap: 10 mm, Velikost: 5 mm.

**Očekávaný výsledek:**
- Průměr značky: **5 mm** (ne 50 mm)
- Offset: **10 mm** (ne 100 mm)
- Všechny fyzické konstanty děleny `scaleFactor` (sf=10)

---

### [TC-023] Clipping masks (P2)

**Prerekvizity:** GroupItem s clipping maskou 100×100 mm, vnitřní obsah větší.

**Vstup:** ZUND, Auto-fit.

**Očekávaný výsledek:**
- Bounds z clip mask (100×100 mm), ne z vnitřního obsahu
- `_getEffectiveBounds()` vrací `pageItems[0].geometricBounds` pro clipped group
- `movePaths()` nepřesouvá cesty z clipped groups (`_isInsideClippedGroup` check)

---

### [TC-024] Locked layers — zachování stavu (P2)

**Prerekvizity:** Layer `Background` zamčený, layer `Hidden` skrytý.

**Očekávaný výsledek:**
- Po dokončení skriptu je `Background` znovu zamčený
- `Hidden` je znovu skrytý
- `beginSession()` / `endSession()` správně ukládají a obnovují stav
- Items na hidden layerech nejsou zahrnuty v bounds výpočtu

---

## SEKCE 9 — Matematická přesnost

### [TC-025] Artboard resize — verifikace (P0)

**Vstup:** Grafika 100×100 mm, ZUND Auto-fit, Gap: 10 mm, Gap od okraje: 0 mm, Velikost: 5 mm.

**Ruční výpočet:**
```
offZX = gapInner + rZ = 10 + 2,5 = 12,5 mm
rMax = rZ = 2,5 mm
reqHalfW = 50 + (12,5 + 2,5 + 0) = 65 mm
W = snapCeil(130) = 130 mm
```

**Měření:** Artboard W = 130 mm ±0,5 mm.

---

### [TC-026] Intermediate marks — pozice (P0)

**Vstup:** Grafika 600×100 mm, ZUND, Gap: 10 mm, Gap od okraje: 0 mm, Rozteč: 200 mm.

**Ruční výpočet:**
```
offZX = 10 + 2,5 = 12,5 mm
Délka horní hrany (mark-space) = 600 + 2×12,5 = 625 mm
segments = Math.ceil(625 / 200) = 4 (v pt, po konverzi)
intermediate = 3
Pozice: rovnoměrně dle 625/4 ≈ 156 mm interval
```

**Pozn.:** `addSteps` počítá vzdálenost v bodech, ne v mm. Přesná rozteč závisí na pt↔mm konverzi.

**Měření:** 3 intermediate na horní hraně, rovnoměrně rozložené ±10 mm.

---

### [TC-027] SUMMA bar pozice (P0)

**Vstup:** SUMMA mód, libovolná grafika.

**Konstanty z kódu:**
```
ZSM.Core.SUMMA_BAR_OFFSET = 11,5 mm (od dolního okraje grafiky ke středové linii baru)
ZSM.Core.SUMMA_BAR_WIDTH  = 3 mm (stroke width)
```

**Měření:** Bar centerline 11,5 mm ±0,5 mm pod dolním okrajem grafiky; stroke 3,0 mm ±0,1 mm.

---

### [TC-028] Feed — výška artboardu (P0)

**Vstup:** SUMMA, Feed Top: 70 mm, Feed Bottom: 50 mm, Grafika: 100×100 mm, Gap od okraje: 0 mm, Velikost: 3 mm.

**Ruční výpočet:**
```
outY = summaYVisual + rS = 10 + 1,5 = 11,5 mm
rMax = rS = 1,5 mm
abTop_offset = outY + rMax + feedTop = 11,5 + 1,5 + 70 = 83 mm
abBot_offset = outY + rMax + feedBottom = 11,5 + 1,5 + 50 = 63 mm
H = 100 + 83 + 63 = 246 mm
Po snapCeil (top) / snapFloor (bot): 245–248 mm
```

**Měření:** Artboard H = 245–248 mm.

---

## SEKCE 10 — Nové testy (doplněné)

### [TC-029] Duplicitní barva ve dvou vrstvách (P1)

**Prerekvizity:** Dokument s cestami barvy `Cut`.

**Vstup:**
```
Vrstvy:
  Cut       barva: Cut
  Kiss-cut  barva: Cut  ← stejná barva!
```

**Očekávaný výsledek (aktuální chování — BUG):**
- Všechny cesty s barvou `Cut` skončí na vrstvě `Kiss-cut` (poslední match)
- Vrstva `Cut` bude prázdná
- Žádný warning se nezobrazí (obě `movePaths` volání vrátí true)

**Očekávaný správný výsledek (po opravě):**
- Varování při generování, nebo validace v UI zamezující duplicitní barvy

---

### [TC-030] Mode switch — zachování dat (P1)

**Akce:**
1. Nastavit ZUND, Gap: 15 mm, Rozteč: 300 mm
2. Přepnout na SUMMA (dropdown)
3. Nastavit Feed Top: 80 mm
4. Přepnout zpět na ZUND

**Očekávaný výsledek:**
- Po přepnutí zpět na ZUND: Gap = 15 mm, Rozteč = 300 mm (zachováno přes [Last Settings])
- Dialog se zavře a znovu otevře s novým layoutem (ne jen hide/show panelů)

---

### [TC-031] Registration color lokalizace (P1)

**Prerekvizity:** Český Illustrator (locale `cs`).

**Akce:** Otevřít dialog, zkontrolovat dropdown barvy.

**Očekávaný výsledek:**
- Registration swatch má lokalizovaný název (např. `[Registrační]`)
- `getRegistrationName()` vrací `doc.swatches[1].name`
- Barva značek funguje korektně s lokalizovaným názvem
- `getCol()` akceptuje jak lokalizovaný název, tak `"[Registration]"`

---

### [TC-032] Orient mark — artboard rozšíření (P1)

**Prerekvizity:** Grafika 50×50 mm.

**Vstup:**
```
Mode: ZUND, Auto-fit
Gap od grafiky: 5 mm
Gap od okraje: 0 mm
Velikost Zünd: 5 mm
Orient. offset: 200 mm (velký offset)
```

**Výpočet:**
```
offZX = 5 + 2,5 = 7,5 mm
reqHalfW (bez orient) = 25 + (7,5 + 2,5 + 0) = 35 mm

orientRight_mm = -(25 + 7,5) + 200 + 5 + 2,5 + 0 = 175 mm
175 > 35 → reqHalfW = 175 mm
W = snapCeil(350) = 350 mm
```

**Očekávaný výsledek:**
- Artboard šířka rozšířena na ~350 mm (ne ~70 mm) kvůli orient marku
- Orient mark je uvnitř artboardu

---

### [TC-033] SUMMA intermediate — jen L/R hrany (P1)

**Prerekvizity:** Grafika 100×600 mm (vysoká).

**Vstup:**
```
Mode: SUMMA
Rozteč: 200 mm
```

**Očekávaný výsledek:**
- Intermediate marks jen na levé a pravé hraně
- Žádné intermediate na horní/dolní hraně (SUMMA OPOS čte jen L/R)
- Kód: `addSteps` voláno jen pro `xL,yB→xL,yT` a `xR,yT→xR,yB`

---

### [TC-034] Auto-create spot color (P1)

**Prerekvizity:** Dokument bez spot swatche `MyCustomColor`.

**Vstup:**
```
Barva značek: MyCustomColor (ručně zadáno / neexistující)
```

**Očekávaný výsledek:**
- Spot swatch `MyCustomColor` automaticky vytvořen
- CMYK fallback: C=0, M=100, Y=0, K=0 (`AUTO_SPOT_COLOR`)
- Speciální znaky v názvu sanitizovány (`[](),.` → `_`)
- Značky vykresleny s touto barvou

---

### [TC-035] Prázdný layer name (P2)

**Vstup:**
```
Vrstvy: "" (prázdný název)  barva: Cut
```

**Očekávaný výsledek:**
- `getLay("")` — chování závisí na tom zda Illustrator akceptuje prázdný layer name
- Ideálně: validace v UI před generováním, nebo fallback na default název

---

### [TC-036] [Last Settings] smazání (P2)

**Akce:** Programově nastavit `activePreset = "[Last Settings]"` → kliknout Smazat.

**Očekávaný výsledek:**
- Alert `"Výchozí předvolbu nelze smazat."` (kód blokuje smazání `[Default]` i `[Last Settings]`)
- [Last Settings] se nezobrazuje v dropdown (odfiltrovaný v `updatePresetList`)

---

### [TC-037] orientDist krajní hodnoty (P2)

**Akce:**
1. Orient. offset = `5` (pod min 10) → Generovat
2. Orient. offset = `2500` (nad max 2000) → Generovat

**Očekávaný výsledek:**
- Alert: `"Vzdálenost orient. značky: musí být mezi 10 a 2000!"` (`ERR_OUT_OF_RANGE`)
- Dialog zůstane otevřený

---

## Edge case matrix

| Vstup | Chování | Priorita |
|-------|---------|----------|
| Gap: `-10` | Validation OK (min = 0) → alert | P2 |
| Rozteč: `0` | Validation error (min 50) | P2 |
| Gap: `""` prázdný | NaN → `ERR_MUST_BE_NUMBER` | P2 |
| Gap: `"10,5"` čárka | Akceptovat (10,5 mm) — normalizace v `validateNumber` | P2 |
| Barva: neexistující | Auto-create spot + CMYK fallback M=100 Y=100 | P1 |
| Barva: `"CUT"` vs `"cut"` | Case-insensitive match v `_matchesSpotColor` | P2 |
| Kliknout Zrušit | Žádná změna v dokumentu, return null | P2 |
| 2 vrstvy stejná barva | BUG: cesty na poslední vrstvě, bez warning | P1 |
| Guide paths v dokumentu | Přeskočeny v `getBounds()` (guides check) | P2 |

---

## Pořadí testování

```
SMOKE  (10 min):  TC-001, TC-005, TC-017
CORE   (60 min):  TC-001–TC-011, TC-015–TC-016, TC-025–TC-028
INTEG  (30 min):  TC-012–TC-014, TC-018–TC-021, TC-029–TC-034
EDGE   (20 min):  TC-022–TC-024, TC-035–TC-037
```

---

## Šablona bug reportu

```markdown
## BUG — [TC-XXX] [Stručný popis]

**Priorita:** P0 / P1 / P2
**Prostředí:** Illustrator CC 202X, macOS X.X, skript v26.3.1

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

---

## Známé bugy (nalezené při revizi test plánu)

### BUG-TP-001: Duplicitní barva ve vrstvách — tiché přepsání (TC-029)

**Priorita:** P1
**Modul:** `ZSM.Draw.movePaths()`

**Popis:** Pokud dvě vrstvy v UI mají přiřazenou stejnou barvu (např. obě `Cut`), `movePaths()` se volá sekvenčně pro každou vrstvu. Iteruje přes `doc.pathItems` (celý dokument), takže druhé volání najde cesty přesunuté prvním voláním a přesune je znovu na druhou vrstvu. Výsledek: všechny cesty s touto barvou skončí na poslední vrstvě, předchozí vrstvy jsou prázdné. Žádný warning.

**Dopad:** Uživatel netuší, že layer mapping nepracuje dle očekávání.

**Návrh opravy:**
- Varianta A: Validace v UI — zakázat duplicitní barvy (alert před generováním)
- Varianta B: `movePaths()` přeskočí cesty, které jsou už na některém z target layerů
- Varianta C: Warning v `geo.warnings[]` pokud barva duplicitní

---

### BUG-TP-002: Prázdný layer name bez validace (TC-035)

**Priorita:** P2
**Modul:** `ZSM.UI.buildDialog()` → `btnOk.onClick`

**Popis:** Validace na řádku 2052-2058 sbírá `layRows[i].etLayer.text || ""`, ale nekontroluje prázdný string. `getLay("")` v Illustratoru vytvoří layer s prázdným názvem, což může způsobit problémy při opakovaném spuštění.

**Návrh opravy:** Validace v `btnOk.onClick` — prázdný layer name → alert + return.


---

## Jak testovat a zapisovat výsledky

### Execution log

Pro každý test zapsat výsledek do tabulky níže. Status:
- **PASS** — skutečnost odpovídá očekávanému výsledku v rámci tolerancí
- **FAIL** — skutečnost se liší od očekávání → vyplnit bug report
- **SKIP** — test nebyl proveden (uvést důvod)
- **BLOCK** — test nelze provést kvůli závislosti na jiném FAIL testu

Sloupec `Actual` slouží pro stručný zápis naměřené hodnoty nebo pozorování.
Sloupec `Bug ID` odkazuje na vyplněný bug report níže.

### Měření v Illustratoru

- Artboard rozměry: `Document Setup` nebo `Artboard Tool` → `W` / `H` v panelu
- Značka průměr/strana: `Direct Selection Tool` → vybrat značku → `W` v Transform panelu
- Offset od grafiky: `Measure Tool` (nebo `Info` panel) — měřit od edge grafiky ke středu značky
- Layer order: Panel `Layers` — vizuální kontrola shora dolů
- Barva: Vybrat objekt → `Swatches` / `Color` panel → ověřit spot name

---

## Execution log

| Test | Priorita | Status | Actual | Bug ID | Tester | Datum |
|------|----------|--------|--------|--------|--------|-------|
| TC-001 | P0 | | | | | |
| TC-002 | P0 | | | | | |
| TC-003 | P0 | | | | | |
| TC-004 | P1 | | | | | |
| TC-005 | P0 | | | | | |
| TC-006 | P0 | | | | | |
| TC-007 | P0 | | | | | |
| TC-008 | P1 | | | | | |
| TC-009 | P0 | | | | | |
| TC-010 | P0 | | | | | |
| TC-011 | P0 | | | | | |
| TC-012 | P1 | | | | | |
| TC-013 | P1 | | | | | |
| TC-014 | P1 | | | | | |
| TC-015 | P0 | | | | | |
| TC-016 | P0 | | | | | |
| TC-017 | P1 | | | | | |
| TC-018 | P1 | | | | | |
| TC-019 | P1 | | | | | |
| TC-020 | P1 | | | | | |
| TC-021 | P1 | | | | | |
| TC-022 | P2 | | | | | |
| TC-023 | P2 | | | | | |
| TC-024 | P2 | | | | | |
| TC-025 | P0 | | | | | |
| TC-026 | P0 | | | | | |
| TC-027 | P0 | | | | | |
| TC-028 | P0 | | | | | |
| TC-029 | P1 | | | | | |
| TC-030 | P1 | | | | | |
| TC-031 | P1 | | | | | |
| TC-032 | P1 | | | | | |
| TC-033 | P1 | | | | | |
| TC-034 | P1 | | | | | |
| TC-035 | P2 | | | | | |
| TC-036 | P2 | | | | | |
| TC-037 | P2 | | | | | |

**Souhrn:**

| Priorita | Total | PASS | FAIL | SKIP | BLOCK |
|----------|-------|------|------|------|-------|
| P0 | 16 | | | | |
| P1 | 16 | | | | |
| P2 | 9 | | | | |
| **Celkem** | **41** | | | | |

**Release rozhodnutí:** PASS / FAIL / CONDITIONAL
**Poznámky:**

---

## Bug reporty

Níže vyplnit jeden blok pro každý nalezený bug. Formát:
- `Bug ID`: sekvenční číslo (BUG-001, BUG-002, ...)
- `Status`: OPEN / FIXED / WONTFIX / DEFERRED
- `Actual` v execution logu odkazuje na Bug ID

---

### BUG-001

**Test:** TC-___
**Priorita:** P_ / P_ / P_
**Status:** OPEN
**Prostředí:** Illustrator CC ____, macOS ____, skript v26.3.1

**Kroky:**
1. 
2. 
3. 

**Očekáváno:**


**Skutečnost:**


**Měření:**

| Parametr | Expected | Actual |
|----------|----------|--------|
| | | |
| | | |

**Modul:** ZSM.Core / ZSM.Draw / ZSM.UI / ZSM.Config
**Funkce:**
**Screenshot/příloha:**

---

### BUG-002

**Test:** TC-___
**Priorita:** P_ / P_ / P_
**Status:** OPEN
**Prostředí:** Illustrator CC ____, macOS ____, skript v26.3.1

**Kroky:**
1. 
2. 
3. 

**Očekáváno:**


**Skutečnost:**


**Měření:**

| Parametr | Expected | Actual |
|----------|----------|--------|
| | | |
| | | |

**Modul:** ZSM.Core / ZSM.Draw / ZSM.UI / ZSM.Config
**Funkce:**
**Screenshot/příloha:**

---

### BUG-003

**Test:** TC-___
**Priorita:** P_ / P_ / P_
**Status:** OPEN
**Prostředí:** Illustrator CC ____, macOS ____, skript v26.3.1

**Kroky:**
1. 
2. 
3. 

**Očekáváno:**


**Skutečnost:**


**Měření:**

| Parametr | Expected | Actual |
|----------|----------|--------|
| | | |
| | | |

**Modul:** ZSM.Core / ZSM.Draw / ZSM.UI / ZSM.Config
**Funkce:**
**Screenshot/příloha:**

---

### BUG-004

**Test:** TC-___
**Priorita:** P_ / P_ / P_
**Status:** OPEN
**Prostředí:** Illustrator CC ____, macOS ____, skript v26.3.1

**Kroky:**
1. 
2. 
3. 

**Očekáváno:**


**Skutečnost:**


**Měření:**

| Parametr | Expected | Actual |
|----------|----------|--------|
| | | |
| | | |

**Modul:** ZSM.Core / ZSM.Draw / ZSM.UI / ZSM.Config
**Funkce:**
**Screenshot/příloha:**

---

### BUG-005

**Test:** TC-___
**Priorita:** P_ / P_ / P_
**Status:** OPEN
**Prostředí:** Illustrator CC ____, macOS ____, skript v26.3.1

**Kroky:**
1. 
2. 
3. 

**Očekáváno:**


**Skutečnost:**


**Měření:**

| Parametr | Expected | Actual |
|----------|----------|--------|
| | | |
| | | |

**Modul:** ZSM.Core / ZSM.Draw / ZSM.UI / ZSM.Config
**Funkce:**
**Screenshot/příloha:**
