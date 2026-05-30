# Test Plan: Zünd & Summa Marks v26.3

**Skript:** `dist/illustrator-zund-summa-marks.jsx` | **Verze:** 26.3.2 | **Datum:** 2026-05-23

---

## Prostředí

macOS 12+, Illustrator CC 2024/2025, Units: mm. Před testem zavřít všechny dokumenty.

Chybové hlášky v testech odpovídají české lokalizaci (`app.locale = cs`).

## Konvence zápisu výsledků

U každého testu je řádek `Výsledek:` — zapsat jedno z:
- **PASS** — vše dle očekávání
- **FAIL** — popsat co se stalo jinak (vlastními slovy, stručně)
- **SKIP** — důvod proč test nebyl proveden

Pokud FAIL, popsat odchylku přímo na řádku. Žádný separátní bug report není potřeba — popis u testu stačí.

---

## SEKCE 1 — ZUND

### TC-001 ZUND základní layout, Auto-fit (P0)

Obdélník 100x100 mm, vybraný.

```
Mode: ZUND, Auto-fit, Gap grafiky: 10, Gap okraj: 0, Rozteč: 400, Zünd: 5, Orient: 100
```

Očekáváno: 5 značek (4 rohy + 1 orient, žádné intermediate — hrana ~130 mm < rozteč 400). Průměr 5 mm. Artboard 130x130 mm (reqHalfW = 50 + 12.5 + 2.5 + 0 = 65 → ceil(130) = 130).

**Výsledek:**

---

### TC-002 ZUND intermediate marks (P0)

Obdélník 600x100 mm, vybraný.

```
Mode: ZUND, Auto-fit, Gap grafiky: 10, Gap okraj: 0, Rozteč: 150, Zünd: 5, Orient: 100
```

Očekáváno: 5 základ + 4 intermediate horní + 4 dolní + 0 krátké hrany = 13 značek. Horní hrana mark-space: 600+25=625 mm, ceil(625/150)=5 segmentů → 4 intermediate.

**Výsledek:**

---

### TC-003 ZUND layer mapping (P0)

Dokument s cestami se Spot color `Cut` a cestami s jinou barvou.

```
Vrstvy: Cut (barva: Cut)
```

Očekáváno: Layer `Cut` vytvořen, cesty s barvou Cut přesunuty s overprint=true. Order: Regmarks → Cut → Graphics.

**Výsledek:**

---

### TC-004 ZUND Fixed Artboard (P1)

Artboard 200x200 mm, obdélník 100x100 mm uprostřed, vybraný.

```
Mode: ZUND, Fixed, Gap okraj: 5, Zünd: 5
```

Očekáváno: AB zůstane 200x200. Značky 7.5 mm (gapOuter+rZ) od AB edge. Gap grafiky disabled v UI.

**Výsledek:**

---

## SEKCE 2 — SUMMA

### TC-005 SUMMA základní layout (P0)

Obdélník 100x100 mm, vybraný.

```
Mode: SUMMA, Gap okraj: 0, Feed Top: 70, Feed Bot: 50, Rozteč: 400, Summa: 3, Červené: ON
```

Očekáváno: 4 čtverce (rohy, žádné intermediate). Strana 3 mm. Bar 11.5 mm pod grafikou, tloušťka 3 mm. 2 červené linky. AB výška ~246 mm (100 + 83 + 63), šířka ~123 mm.

**Výsledek:**

---

### TC-006 SUMMA červené linky vypnuty (P0)

SUMMA, červené linky OFF.

Očekáváno: Žádné červené linky, žádný sublayer Trim. Bar a čtverce normálně.

**Výsledek:**

---

### TC-007 SUMMA feed margins (P0)

```
Mode: SUMMA, Feed Top: 100, Feed Bot: 30
```

Očekáváno: AB výška odpovídá novým feed hodnotám. Červené linky na top/bottom AB edge.

**Výsledek:**

---

### TC-008 Swatch dropdown (P1)

Dokument se Spot swatchem `DieCut`.

Očekáváno: Dropdown obsahuje lokalizovaný [Registration] a DieCut. Neobsahuje procesní CMYK. Po výběru DieCut: značky mají tuto barvu.

**Výsledek:**

---

## SEKCE 3 — Dynamické vrstvy

### TC-009 Dvě vrstvy, různé barvy (P0)

Dokument s cestami barvy `Cut` a `Kiss` (dva Spot swatche).

```
Vrstvy: Cut (barva: Cut), Kiss-cut (barva: Kiss)
```

Očekáváno: Oba layery vytvořeny, cesty správně dle barvy. Order: Regmarks → Cut → Kiss-cut → Graphics. CompoundPaths jako celek, overprint ON.

**Výsledek:**

---

### TC-010 Vlastní název vrstvy (P0)

```
Vrstvy: Score-cut (barva: [Registration])
```

Očekáváno: Layer `Score-cut` vytvořen.

**Výsledek:**

---

### TC-011 Přidat vrstvu — max (P0)

Klikat `+ Přidat` opakovaně.

Očekáváno: Max 8 vrstev (MAX_LAYERS=8), pak tlačítko disabled. Tlačítko `−` disabled při 1 řádku.

**Výsledek:**

---

## SEKCE 4 — Presety

### TC-012 Uložení a načtení presetu (P1)

Nastavit SUMMA, Feed Top: 80 → Uložit jako "Test preset" → Generovat → spustit znovu → vybrat "Test preset".

Očekáváno: UI naplněno SUMMA, 80 mm.

**Výsledek:**

---

### TC-013 Ochrana výchozího presetu (P1)

Vybrat [Výchozí] → Smazat.

Očekáváno: Alert "Výchozí předvolbu nelze smazat." Preset zůstane.

**Výsledek:**

---

### TC-014 Last Settings auto-save (P1)

Generovat ZUND, Gap grafiky: 15 → spustit znovu.

Očekáváno: Dialog s ZUND, Gap 15 mm, preset [Last Settings].

**Výsledek:**

---

## SEKCE 5 — Validace

### TC-015 Neplatná hodnota — písmeno (P0)

Mezera od grafiky = `abc` → Generovat.

Očekáváno: Alert "Mezera od grafiky: musí být číslo!" (label GAP_GZ obsahuje dvojtečku). Dialog zůstane.

**Výsledek:**

---

### TC-016 Hodnota mimo rozsah (P0)

Rozteč = `10000` → Generovat.

Očekáváno: Alert "Rozteč značek: musí být mezi 50 a 5000!" Dialog zůstane.

**Výsledek:**

---

### TC-037 orientDist krajní hodnoty (P2)

Orient. offset = `5` (pod min 10), pak `2500` (nad max 2000) → Generovat.

Očekáváno: Alert "Vzdálenost orient. značky: musí být mezi 10 a 2000!"

**Výsledek:**

---

## SEKCE 6 — Error handling

### TC-017 Žádný dokument (P1)

Všechny dokumenty zavřeny → spustit skript.

Očekáváno: Alert "Není otevřený dokument." Graceful exit.

**Výsledek:**

---

### TC-018 Nic nevybráno — Auto-fit (P1)

Dokument otevřen, nic nevybráno. ZUND, Auto-fit → Generovat.

Očekáváno: Alert "Nic není vybráno." Graceful exit.

**Výsledek:**

---

## SEKCE 7 — Persistence

### TC-019 Save / load (P1)

Generovat SUMMA, Feed Top: 90 → zavřít AI → spustit znovu.

Očekáváno: Dialog s SUMMA, 90 mm. Soubor `~/Library/Application Support/ZSM/settings_v26_3.json`.

**Výsledek:**

---

### TC-020 Výchozí hodnoty — první spuštění (P1)

`rm ~/Library/Application\ Support/ZSM/settings_v26_3.json` → spustit.

Očekáváno: ZUND, gapInner: 5, gapOuter: 0, maxDist: 500, markSizeZ: 5, orientDist: 100, [Registration], preset [Výchozí], 1 vrstva Cut.

**Výsledek:**

---

### TC-021 Migrace z v26.0 (P1)

Uložit starý formát:
```bash
cat > ~/Library/Application\ Support/ZSM/settings_v26_3.json << 'EOF'
{"mode":"ZUND","gapInner":12,"gapOuter":2,"maxDist":300,"feedTop":70,"feedBottom":50,"drawRed":false,"thruActive":true,"thruName":"cut","kissActive":false,"kissName":"","markSizeZ":5,"markSizeS":3,"markColor":"[Registration]"}
EOF
```

Očekáváno: Spustí OK. 1 vrstva Cut (kiss odfiltrováno — kissActive:false). Hodnoty: gapInner 12, gapOuter 2, maxDist 300. orientDist doplněno z defaults (100).

**Výsledek:**

---

## SEKCE 8 — Edge cases

### TC-022 Large Canvas — scaleFactor 10 (P2)

AB 6000x3000 mm, obdélník 5000x2000 mm. ZUND, Gap: 10, Zünd: 5.

Očekáváno: Průměr značky 5 mm (ne 50), offset 10 mm (ne 100). Vše děleno sf=10.

**Výsledek:**

---

### TC-023 Clipping masks (P2)

GroupItem s clip mask 100x100 mm, vnitřní obsah větší. ZUND, Auto-fit.

Očekáváno: Bounds z clip mask (100x100), ne z obsahu. movePaths nepřesouvá cesty z clipped groups.

**Výsledek:**

---

### TC-024 Locked/hidden layers — zachování stavu (P2)

Layer `Background` zamčený, layer `Hidden` skrytý.

Očekáváno: Po skriptu Background znovu zamčený, Hidden znovu skrytý. Items na hidden layerech nezahrnuty v bounds.

**Výsledek:**

---

## SEKCE 9 — Matematická přesnost

### TC-025 Artboard resize verifikace (P0)

Grafika 100x100 mm, ZUND Auto-fit, Gap: 10, Gap okraj: 0, Zünd: 5.

Výpočet: reqHalfW = 50 + (12.5 + 2.5 + 0) = 65 → W = 130 mm.

Očekáváno: Artboard W = 130 mm ±0.5 mm.

**Výsledek:**

---

### TC-026 Intermediate pozice (P0)

Grafika 600x100 mm, ZUND, Gap: 10, Gap okraj: 0, Rozteč: 200.

Výpočet: Hrana mark-space 625 mm, ceil(625/200)=4 segmenty → 3 intermediate na horní hraně.

Očekáváno: 3 intermediate horní, rovnoměrně ±10 mm.

**Výsledek:**

---

### TC-027 SUMMA bar pozice (P0)

SUMMA, libovolná grafika.

Očekáváno: Bar centerline 11.5 mm pod grafikou ±0.5 mm. Stroke 3.0 mm ±0.1 mm.

**Výsledek:**

---

### TC-028 Feed výška artboardu (P0)

SUMMA, Feed Top: 70, Feed Bot: 50, grafika 100x100 mm, Gap okraj: 0, Summa: 3.

Výpočet: H = 100 + (11.5+1.5+70) + (11.5+1.5+50) = 246 mm.

Očekáváno: AB H = 245–248 mm.

**Výsledek:**

---

## SEKCE 10 — Doplňkové testy

### TC-029 Duplicitní barva ve dvou vrstvách (P1)

Dokument s cestami barvy `Cut`.

```
Vrstvy: Cut (barva: Cut), Kiss-cut (barva: Cut) ← stejná barva
```

Očekáváno (aktuální BUG): Všechny cesty skončí na Kiss-cut (poslední), Cut prázdný, žádný warning. Po opravě: validace/warning.

**Výsledek:**

---

### TC-030 Mode switch zachování dat (P1)

Nastavit ZUND Gap: 15, Rozteč: 300 → přepnout SUMMA → nastavit Feed Top: 80 → přepnout zpět ZUND.

Očekáváno: ZUND Gap = 15, Rozteč = 300 (zachováno přes [Last Settings]).

**Výsledek:**

---

### TC-031 Registration color lokalizace (P1)

Český Illustrator. Otevřít dialog, zkontrolovat dropdown.

Očekáváno: Registration má lokalizovaný název ([Registrační] apod.). getCol() akceptuje lokalizovaný i anglický název.

**Výsledek:**

---

### TC-032 Orient mark rozšíření artboardu (P1)

Grafika 50x50 mm.

```
ZUND, Auto-fit, Gap grafiky: 5, Gap okraj: 0, Zünd: 5, Orient: 200
```

Očekáváno: AB šířka ~350 mm (orientRight_mm=175 > reqHalfW=35, takže AB rozšířen). Orient mark uvnitř AB.

**Výsledek:**

---

### TC-033 SUMMA intermediate jen L/R (P1)

Grafika 100x600 mm (vysoká). SUMMA, Rozteč: 200.

Očekáváno: Intermediate jen na L/R hranách. Žádné na top/bottom (OPOS čte jen L/R).

**Výsledek:**

---

### TC-034 Auto-create spot color (P1)

Dokument bez swatche `MyCustomColor`. Nastavit barvu značek: MyCustomColor.

Očekáváno: Spot swatch vytvořen, CMYK C0 M100 Y0 K0, speciální znaky sanitizovány. Značky vykresleny.

**Výsledek:**

---

### TC-035 Prázdný layer name (P2)

Vrstva s prázdným názvem, barva: Cut.

Očekáváno: Ideálně validace v UI (alert). Bez validace: getLay("") vytvoří layer s prázdným jménem.

**Výsledek:**

---

### TC-036 [Last Settings] smazání (P2)

Pokusit se smazat [Last Settings] preset (pokud se dostaneme do stavu kde je aktivní).

Očekáváno: Alert "Výchozí předvolbu nelze smazat." [Last Settings] se ani nezobrazuje v dropdown.

**Výsledek:**

---

## Edge case matrix

| Vstup | Očekáváno | P |
|-------|-----------|---|
| Gap: `-10` | Alert (min 0) | P2 |
| Rozteč: `0` | Alert (min 50) | P2 |
| Gap: `""` prázdný | Alert "musí být číslo" | P2 |
| Gap: `"10,5"` čárka | OK, normalizace čárky na tečku | P2 |
| Barva: neexistující | Auto-create spot M100 | P1 |
| Barva: `"CUT"` vs `"cut"` | Case-insensitive match | P2 |
| Zrušit dialog | Žádná změna v dokumentu | P2 |
| 2 vrstvy stejná barva | BUG — viz TC-029 | P1 |
| Guide paths | Přeskočeny v getBounds | P2 |

---

## Známé bugy v kódu

**BUG-TP-001 — Duplicitní barva ve vrstvách (P1, TC-029)**
movePaths() iteruje doc-level kolekci, takže druhé volání se stejnou barvou přesune cesty z první vrstvy na druhou. Výsledek: poslední vrstva vyhraje, předchozí prázdné, žádný warning.
Oprava: validace v UI, nebo přeskakovat cesty na target layerech, nebo warning.

**BUG-TP-002 — Prázdný layer name (P2, TC-035)**
btnOk.onClick nevaliduje prázdný layer name. getLay("") vytvoří layer s prázdným názvem v AI.
Oprava: alert + return v onClick pokud etLayer.text je prázdný.
