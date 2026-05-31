# Manuální testovací plán — ZSM v26.4.0 + GM (review-round)

> **Verze:** 26.4.0 · **Aktualizováno:** 2026-05-30 · **Autor:** Osva1d
> **Rozsah:** ověření změn z review-round sezení, které **nelze** pokrýt unit testy
> (reálné ScriptUI chování + Illustrator DOM). Unit testy: ZSM 13 suites, GM 4 suites.

Legenda: `[ ]` krok · ✅ PASS kritérium · ❌ FAIL signál · ⚠️ vysoké riziko

---

## ⚠️ Nejdůležitější bod — ScriptUI custom-props (H2)

Jediný bod s nejistotou z review: H2 ukládá raw název na `ListItem` přes vlastní
property (`_zsmRawValue` / `_gmRawValue`). Mock to umí; **reálné ScriptUI to musí
potvrdit**. Testy **T3** a **G1** to ověřují — pokud dropdown ukáže prázdno/divně
místo názvu, custom-props v reálu nefungují a je nutný jiný přístup.
**Tyto dva testy sleduj obzvlášť pozorně.**

---

## Příprava prostředí

```
[ ] Illustrator CC 2024+ otevřený
[ ] Dokument A: A4, nakreslit pár objektů, vytvořit přímou barvu (Swatch) "Cut"
    a obarvit jí jeden objekt
[ ] Dokument B: prázdná A4 BEZ swatche "Cut" a BEZ "MyOrange" (cross-doc testy)
[ ] Window > Swatches a Window > Layers otevřené — budeš ověřovat jejich obsah
[ ] (volitelné) čistý start: smazat ~/Library/Application Support/ZSM/settings.json
```

---

## ZSM — P0 (musí projít před deployem)

### T1 — scaleN 1:10 (headline fix)
```
[ ] ZUND mód, vyber objekt, otevři skript
[ ] Zaškrtni "Pracovat v měřítku", pole = 10, Velikost Zünd = 5
[ ] Titulek dialogu ukazuje "… — 1:10"
[ ] Generovat → změř vygenerovanou kruhovou značku
    ✅ značka má ~0,5 mm průměr (5 / 10), NE 5 mm
[ ] Znovu se scaleN = 1 (odškrtnuto) → značka 5 mm (baseline, žádná regrese)
[ ] SUMMA mód, scaleN = 10, Velikost Summa = 3 → značka ~0,3 mm
```

### T3 — H2 chybějící barva z cizího presetu ⚠️
```
[ ] V dokumentu A: mark barva = "MyOrange" (vytvoř swatch), Uložit jako "Test"
[ ] Přepni na dokument B (nemá ten swatch)
[ ] Otevři skript, vyber preset "Test"
    ✅ barevný dropdown ukazuje "MyOrange  (chybí)" — vidíš RAW název
    ✅ u presetu NENÍ hvězdička "*" (není falešně "modified")
[ ] Generovat
    ✅ značky nakresleny v [Registration] (registračně černá)
    ✅ dialog "UPOZORNĚNÍ: Barva značek 'MyOrange' není v dokumentu…"
    ✅ ve Swatches panelu NEPŘIBYL magenta swatch "MyOrange"
    ❌ FAIL: vznikl magenta spot / barva se tiše změnila / dropdown ukázal
       prázdno či [Registration] místo "MyOrange (chybí)"
```

### T4 — H2 chybějící cílová vrstva z presetu
```
[ ] Preset s řádkem vrstev: název = "SpecialCut" (v dok. B neexistuje), barva = "Cut"
[ ] Vyber preset → combobox vrstvy ukazuje "SpecialCut"
[ ] Generovat
    ✅ vrstva "SpecialCut" se VYTVOŘILA, cesty s barvou Cut do ní přesunuty
```

### T2 — Delete preset confirm
```
[ ] Vytvoř preset "Test2", vyber ho, klikni Smazat
    ✅ vyskočí "Smazat předvolbu 'Test2'? Tuto akci nelze vrátit zpět."
[ ] Storno → preset zůstává
[ ] Smazat → OK → preset zmizí
[ ] Zavři skript, otevři znovu → "Test2" se NEVRÁTIL (persist funguje)
[ ] Vyber [Výchozí], Smazat → alert "nelze smazat" (bez confirm dialogu)
```

### T10 — Základní happy-path (regrese)
```
[ ] ZUND, výchozí hodnoty, vybraná grafika, Generovat
    ✅ 4 rohové značky + orientační + mezilehlé; artboard se přizpůsobil
[ ] SUMMA, Generovat
    ✅ čtvercové značky + OPOS bar + (když zapnuto) červené ořezové linky
[ ] Spusť ZUND, pak SUMMA na stejný dok → oba sety značek koexistují (sublayery)
```

---

## ZSM — P1 (důležité, ne blokující)

### T6 — Klávesy + popisky
```
[ ] Tlačítko vlevo dole = "Storno" (ne "Zrušit")
[ ] Esc zavře dialog (= Storno)
[ ] Enter spustí Generovat
```

### T8 — Label varování
```
[ ] Jakékoli varování (T3, T5) má prefix "UPOZORNĚNÍ:", NE "CHYBA:"
```

### T5 — Chybějící barva v mapování vrstev
```
[ ] Řádek vrstev s barvou "GhostColor" (není v dokumentu)
[ ] Generovat → "UPOZORNĚNÍ: …nebyla nalezena…" (ERR_COLOR_MISSING), žádný crash
```

### T7 — Layer routing (core feature)
```
[ ] Dok. s cestami v barvě "Cut"; řádek vrstev: název "Cut Layer", barva "Cut"
[ ] Generovat → "Cut Layer" vytvořena, všechny Cut-cesty do ní přesunuty
```

### T9 — Persistence napříč spuštěními
```
[ ] Ulož preset, zavři skript, otevři → preset tam je
[ ] Změň hodnoty bez uložení, zavři, otevři → [Last Settings] obnovilo poslední běh
```

### T11 — Validace
```
[ ] Vymaž pole "Rozteč značek" (prázdné) → Generovat zšedne / pole červené
[ ] Zadej rozteč 5 → OK (minimum po Phase 1)
[ ] Zamčená vrstva v dokumentu → skript ji odemkne, vykreslí, zamkne zpět
```

---

## GM — P0 (změny commitnuté, netestované v Illustratoru)

### G1 — H2 chybějící swatch (GM) ⚠️
```
[ ] Preset s fill barvou z jiného dokumentu, otevři v dok. bez ní
    ✅ dropdown ukazuje "Název  (chybí)"
[ ] Generovat → grommet značky v [Registration] + "UPOZORNĚNÍ:" varování
    ✅ žádný auto-vytvořený magenta swatch
```

### G2 — Layer create (vyžádaná změna)
```
[ ] Preset s cílovou vrstvou "Banners" (v dok. neexistuje)
[ ] Generovat
    ✅ vrstva "Banners" vytvořena, grommet značky nakresleny do ní
    ❌ FAIL: skript zhlásí chybu a přeruší (staré chování)
```

### G3 — GM happy-path + persist + delete confirm
```
[ ] Výchozí (sentinel "[Vytvořit Grommet Marks]") → vytvoří vrstvu "Grommet Marks"
    + swatch + nakreslí oka na všech 4 hranách
[ ] Per-edge konfigurace (top/bottom/left/right nezávisle) funguje
[ ] Delete preset → confirm dialog
[ ] Ulož / zavři / otevři → preset persistuje
```

---

## Pokud něco selže

| Symptom | Pravděpodobná příčina | Co nahlásit |
|---|---|---|
| Dropdown "(chybí)" prázdný/divný | ScriptUI custom-props nefungují | T3/G1 — screenshot dropdownu |
| Vznikl magenta swatch | getCol fallback nefunguje | jaký název, jaký dokument |
| Značky špatná velikost u 1:10 | getEffectiveSF | scaleN hodnota + naměřená velikost |
| Skript spadl (Illustrator) | C++ pipeline | Layers panel stav + posloupnost akcí |

**Doporučené pořadí:** T1 → T3 → G1 (nejvyšší riziko/hodnota). Když projdou tyto tři,
zbytek je z ~90 % regrese-safe.

---

## Záznam výsledku

```
Datum testu: __________   Illustrator verze: __________
P0 ZSM:  T1 [ ]  T2 [ ]  T3 [ ]  T4 [ ]  T10 [ ]
P1 ZSM:  T5 [ ]  T6 [ ]  T7 [ ]  T8 [ ]  T9 [ ]  T11 [ ]
P0 GM:   G1 [ ]  G2 [ ]  G3 [ ]
Verdikt: [ ] PASS — připraveno k deployi   [ ] FAIL — viz poznámky
Poznámky: ______________________________________________
```
