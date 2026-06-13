# GM — Jednotné Esko značky + kompaktní layout (design)

> **Datum:** 2026-06-13
> **Navazuje na:** v5.0.0 (corner zones + path mode, branch `feat/gm-v5-corner-zones-path-marks`)
> **Cílová verze:** **6.0.0** (breaking — mění schéma settings a vzhled výstupu)

---

## 1. Problém a kontext

Po přidání tří v5 panelů (Umístění, Cesta, Rohové zóny) narostl dialog na ~956 px. Na 13" Macu (použitelná výška ~830 px) jsou **tlačítka uříznutá**. Zároveň byl panel Vzhled přebujelý (výběr výplně, tahu, vrstvy, jejich swatche a přetisky) — víc flexibility, než prepress workflow potřebuje.

**Zvolené řešení:** vyřešit výšku **zjednodušením, ne přeskládáním**. Sjednotit vzhled značek na pevný Esko-styl registrační terč, zrušit volby výplně/tahu/vrstvy. Tím zanikne panel Vzhled a single-column dialog se vejde pod limit — bez odklonu od stylu sesterských nástrojů (ZSM/BRE jsou single-column).

**Zamítnuté alternativy** (viz brainstorming): dva sloupce (imbalance, odklon od ZSM/BRE), záložky (skrytá validace), sbalitelné panely (není ScriptUI idiom, křehké), wizard (tření při opakování), separátní okno „Vzhled značky" (overkill pro pár polí — konsensus Adobe/UX/DTP hledisek).

---

## 2. Vzhled značky — Esko-styl registrační terč

Jedna značka = **GroupItem** s tahovými cestami, společný střed `(x, y)`. Inspirace Esko Eyelet Mark (kruh a/nebo kříž, registrační barva, viditelnost na motivu přes bílý podklad).

### Konstrukce a z-pořadí (zdola nahoru)

```
1. bílý KRUH   (stroke = haloWeight, [White], KNOCKOUT)   ── jen když markCircle
2. bílý KŘÍŽ   (stroke = haloWeight, [White], KNOCKOUT)   ── jen když markCross
3. reg. KRUH   (stroke = regWeight,  [Registration], OVERPRINT) ── jen když markCircle
4. reg. KŘÍŽ   (stroke = regWeight,  [Registration], OVERPRINT) ── jen když markCross
```

Všechny **bílé** tahy dole (halo), všechny **registrační** nahoře — registrace tak „sedí" v bílém halu a zůstává čitelná na libovolném podkladu (čitelnost na velkoformátu typu EFI VUTEk je hlavní cíl).

### Geometrie

- **Velikost** (`markSize`, user units) = **průměr kruhu i délka ramen kříže**. Jeden parametr pro oba tvary.
- Kruh: stroked elipsa (prázdná výplň), průměr = markSize.
- Kříž: dvě úsečky (vodorovná + svislá) středem, každá délky = markSize (rameno = markSize/2 na každou stranu). Kříž je **vepsaný** do kruhu (nepřečuhuje).
- Halo přečuhuje za registrační linku o `(haloWeight − regWeight)/2` na stranu.

### Barvy a přetisk

- **Registrace:** `GM.Illustrator.registrationColor()` (existující helper — [Registration] spot, fallback K100). `strokeOverprint = true` (vždy zapnutý, dle rozhodnutí; tiskne přes vše, nevykrajuje motiv).
- **Bílá:** `CMYKColor` 0/0/0/0, `strokeOverprint = false` (**knockout** — konstrukční nutnost, jinak halo zmizí; není to volba v UI).
- Tvary jsou jen **tahované** (žádná výplň) — odpovídá Esko „line thickness".

### Parametry (defaulty)

| Pole | Default | Pozn. |
|---|---|---|
| `markCircle` | `true` | checkbox Kruh |
| `markCross` | `false` | checkbox Kříž |
| `regWeight` | `1.0` pt | registrační tah |
| `haloWeight` | `3.0` pt | bílý podklad (přečuhuje ~1 pt/stranu) |

Defaulty tahů míří na čitelnost velkoformátu; jdou změnit v UI. Aspoň jeden z `markCircle`/`markCross` musí být zapnutý (jinak validace zablokuje Generovat — náhrada za dřívější „výplň a/nebo tah").

---

## 3. Zjednodušený vzhled — co mizí

Z hlavního dialogu i ze schématu settings **mizí**:

- volba **vrstvy** → napevno `GM.CONSTANTS.LAYER_NAME` ("Grommet Marks"), vytvoří se když chybí (= dnešní default chování `getOrCreateLayer(SENTINEL_CREATE)`).
- volba **výplně** (checkbox, swatch, overprint).
- volba **tahu** (checkbox, swatch, overprint, tloušťka).
- volba tvaru kruh/čtverec (`isRound` — beztak zamčeno na kruh od v4.2.0).
- automatický magenta spot „Grommet Marks" (`SWATCH_NAME`) — už se nepoužívá, barva je vždy [Registration].

**Celý panel Vzhled zaniká.** Panel Značka přebírá tvar (kruh/kříž) a tloušťky.

---

## 4. Layout hlavního dialogu

Single column, mezery sjednocené se ZSM (okno `margins 20 / spacing 15`, panel `margins 15 / spacing 8–10`), šířka ~390 px → zmizí pravý prázdný prostor. **Žádné druhé okno.**

```
Window("dialog")  (column, margins 20, spacing 15, width ~390)
 ├─ Panel: Předvolby        ř.1 Načíst [▾] ↺   ř.2 Uložit / Uložit jako… / Smazat
 ├─ Panel: Umístění         radia Hrany artboardu | Vybraná cesta
 ├─ Panel: Hrany            (visible artboard) offsety + 4 edge řádky, mirror inline
 ├─ Panel: Cesta            (visible path) info + Počet/Rozestup
 ├─ Panel: Rohové zóny      Zhustit u rohů + Počet + Rozteč
 ├─ Panel: Značka           Jednotky [▾]  Velikost []
 │                          [✓] Kruh   [ ] Kříž
 │                          Reg. tah [] pt   Bílé halo [] pt
 ├─ Group: copyright
 └─ Group: Storno · Generovat
```

**Výška (artboard mód):** Předvolby 102 + Umístění 66 + Hrany 290 + Rohové zóny 66 + Značka ~95 = 619; + copyright/tlačítka ~50 + 6 mezer×15 = 90 + okraje 40 ≈ **~795 px** (z 956). Na 13" Macu (900 px displej, použitelná výška ~850 po menu baru) se vejde s rezervou ~55 px; na novějších 13" (982 px+) komfortně. V path módu nižší (Cesta < Hrany). **Panel Hrany (~290 px) zůstává dominantní podlaha** — pokud by i ~795 px na nějakém krajně nízkém displeji clipovalo, dalším pákem je zúžení Hran (mimo scope teď, YAGNI).

### Nový panel Značka — chování

- `Kruh` default ON, `Kříž` default OFF; lze oba.
- Tloušťky `Reg. tah` / `Bílé halo` jako edittext v pt, inline (vidět hned, doladit bez okna).
- Live validace: pole tahů mají rules (min/max), oba checkboxy OFF → Generovat šedý.

---

## 5. Změny schématu a migrace

### Nový settings objekt (`GM.Config.getDefaults`)

```javascript
{
    offsetX: 7, offsetY: 7,
    top:    c(true,  true, 10, 105),
    left:   c(true,  true, 10, 105),
    bottom: c(false, true, 10, 105),
    right:  c(false, true, 10, 105),
    bottomMirror: true, rightMirror: true,
    units: "mm",
    markSize: 3,
    // --- v6: tvar značky (nahrazuje isRound + fill/stroke) ---
    markCircle: true,
    markCross:  false,
    regWeight:  1.0,   // pt
    haloWeight: 3.0,   // pt
    placementMode: "artboard",
    cornerZone: { enabled: false, count: 5, pitch: 100 },
    pathDist:   { useNumber: false, number: 24, spacing: 105 }
}
```

**Odstraněná pole:** `isRound`, `markLayerName`, `fillEnabled`, `fillSwatchName`, `fillOverprint`, `strokeEnabled`, `strokeSwatchName`, `strokeOverprint`, `strokeWeight`.

### Migrace (`GM.Storage.load` forward-fill)

- Forward-fill doplní `markCircle/markCross/regWeight/haloWeight` do starých presetů (stejný mechanismus jako v5).
- Stará pole (fill/stroke/layer) se ignorují; po prvním Generate je `result.settings` přepíše (auto-save `[Last Settings]` uloží jen nové schéma) → stará pole přirozeně vymizí.
- Žádná zpětná konverze stará→nová (barva výplně/tahu se nemapuje — vzhled je nově jednotný, ne odvozený z předchozího nastavení). Dokumentovat jako záměr.

---

## 6. Dopad na moduly

| Modul | Změna |
|---|---|
| `constants.js` | `VERSION → "6.0.0"`; odebrat `SWATCH_NAME` (nepoužívaný). |
| `config.js` | nový `getDefaults()` (viz §5). |
| `locale.js` | + klíče: `MARK_CIRCLE`, `MARK_CROSS`, `REG_WEIGHT`, `HALO_WEIGHT`, tipy; odebrat klíče výplně/tahu/vrstvy/overprint (Vzhled panel). `ERR_NO_APPEARANCE` přeformulovat na „aspoň jeden tvar". |
| `illustrator.js` | `placeMark` → **`placeMarkGroup`** (group: halo tahy dole, reg tahy nahoře, kruh/kříž dle flagů). Odebrat `getOrCreateSwatch` (magenta spot), `getSwatchNames`, `getLayerNames`, `isSystemSwatch`, `resolveLayerName`, `layerExists` (UI dropdowny mizí; vrstva fixní). `getOrCreateLayer` zjednodušit na fixní `LAYER_NAME`. Ponechat `registrationColor()`, `getSelectedPathInfo()`, `init()`. |
| `core.js` | beze změny (geometrie pozic se nemění). |
| `ui.js` | smazat panel Vzhled + handlery fill/stroke/layer + mrtvé helpery (`selectDDL`, `ddlValue`, `toDisplay`, `toStorage`, `getUnitDisplayNames` zůstává); **`buildDialog` signatura → `(pData, pathInfo)`** (zahodit `layerInfo`, `swatchInfo`); nový panel Značka (kruh/kříž checkbox, 2× tloušťka); `gatherAll`/`applyAll` na nové schéma; sjednotit mezery na ZSM; validační cíle (regWeight/haloWeight), strukturální check „aspoň jeden tvar". |
| `lib/validation.js` | odebrat pravidla strokeWeight + fill/stroke check; přidat `regWeight`/`haloWeight` rules; appearance check = `markCircle || markCross`. |
| `lib/utils.js` | `presetEquals` na nové klíče (odebrat fill/stroke/layer, přidat markCircle/markCross/regWeight/haloWeight). |
| `main.js` | `run()` přestane volat `getLayerNames`/`getSwatchNames`, `buildDialog(pData, pathInfo)`; `process()` volá `placeMarkGroup`, layer napevno `getOrCreateLayer()`; odpadá fill/stroke barva resolve, swatch fallback warningy i WARN_LAYER_CREATED (vrstva fixní, vytvoří se tiše); ponechat session unlock/restore + failedMarks souhrn. |

---

## 7. Testy

- `test_core_*` — beze změny (geometrie nedotčena).
- `test_storage_migrations` — + test: starý preset s fill/stroke/layer → po load má nové v6 klíče, stará pole se nepropíšou do uloženého výsledku.
- `test_validation` — nahradit fill/stroke check za circle/cross; přidat regWeight/haloWeight range testy; ověřit „oba tvary OFF → invalid".
- `test_ui_dialog` — odebrat assertions panelu Vzhled (label column, fill/stroke/layer dropdowny); přidat: panel Značka má checkbox Kruh (default ON) a Kříž (default OFF), pole tahů; gather vrací markCircle/markCross/regWeight/haloWeight; oba OFF → OK disabled. Počty radií beze změny (mode 2 + path 2 + edge 8 = 12).
- `placeMarkGroup` — DOM, ověří se manuálně (MANUAL_TEST nová sekce: vzhled značky — halo knockout, reg overprint, kruh/kříž kombinace).

---

## 8. Otevřené body

Žádné — všechna rozhodnutí padla v brainstormingu (vzhled, velikost=průměr i kříž, kruh/kříž checkboxy, bílé halo vždy, overprint vždy, fixní vrstva, single column bez druhého okna, defaulty tahů 1,0/3,0 pt jdou měnit).
