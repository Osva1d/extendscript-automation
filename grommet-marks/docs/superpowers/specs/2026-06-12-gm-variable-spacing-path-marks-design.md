# GM v5.0.0 — Variabilní rozestupy (rohové zóny) + značky po cestě

Datum: 2026-06-12
Stav: schválený design (brainstorming dokončen)
Cílová verze: 5.0.0 (z 4.2.1)

## Cíl

Dvě nové funkce + typografický polish, aby GM působil jako profesionální nástroj:

1. **Rohové zóny (variabilní rozestupy)** — typické zadání: „prvních 5 značek
   v rozích po 100 mm, ostatní po 300 mm". Hustší značky u rohů kvůli
   větrnému namáhání banneru.
2. **Značky po obvodu cesty** — rozmístění po obvodu vybrané cesty (kruh,
   trojúhelník, nepravidelný mnohoúhelník). U cest s rohy značka povinně
   v každém rohu, úseky vyplněné roh–roh.

## Schválená rozhodnutí (brainstorming 2026-06-12)

| Otázka | Rozhodnutí |
|---|---|
| Definice rohové zóny | Počet od **každého** rohu: N značek s roztečí A, symetricky |
| Střední zóna | Preferovaná rozteč B, počet dopočítán, rozteč přizpůsobena (dnešní chování režimu Rozestup) |
| Umístění configu zón | **Globální** (roh sdílí dvě hrany — hustota má smysl na obou) |
| Výběr cesty | Výběr v dokumentu **před spuštěním** (Illustrator idiom) |
| Co je roh | Geometricky: úhel mezi tečnami > `CORNER_ANGLE_MIN` (default 15°). Ne `PointType` — neručí za vizuální ostrost |
| Odsazení od cesty | Značky **na cestě**; odsazení si uživatel připraví nativním Objekt ▸ Cesta ▸ Posunout cestu (dialog poradí) |
| Zóny × cesta | **Jednotný model** — zóny platí u každého detekovaného rohu cesty; cesta bez rohů = bez zón |
| Režim v UI | Radio přepínač „Umístění" nahoře, panely se přehazují (`visible` + `layout(true)`) |
| Config cesty | **Jedna** rozteč/počet pro celý obvod (per-úsek zamítnuto — YAGNI) |
| UX polish | Pouze typografie a rytmus dialogu (živý souhrn, report, undo grouping zamítnuty) |
| Verze | **5.0.0** |
| Architektura | **Varianta A — jednotná abstrakce „okruh"** (zamítnuty: dva enginy, virtuální hrany) |

Předpoklad (odsouhlasený mlčky, lze změnit při implementaci): **otevřená
cesta** je podporovaná, koncové body se chovají jako povinné rohové značky.

## Architektura — jednotný okruh

Každý cíl umístění se normalizuje na **okruh** (circuit): posloupnost úseků
(úsečky / kubické Béziery) + množina rohů. Jeden distribuční algoritmus pro
artboard i cestu.

- Hrana artboardu = otevřený okruh, 1 přímý úsek, 2 rohy.
- Cesta = okruh K úseků (z `pathPoints`: P0=anchor[i], P1=rightDirection[i],
  P2=leftDirection[i+1], P3=anchor[i+1]), rohy detekované tangentovým testem,
  flag uzavřenosti.
- Uzavřená cesta bez rohů = jeden kruhový span (rovnoměrná distribuce,
  start v `pathPoints[0]`).

### Zasažené moduly

| Modul | Změna |
|---|---|
| `core.js` | Těžiště. `sampleBezier` (kumulativní tabulka délek, 64 vzorků/úsek), `pointAtDistance` (binární hledání + lerp), `detectCorners` (úhel tečen), `distributeOnSpan` (zóny + střed na úseku roh–roh), `distributeOnCircuit`. Dnešní `calcPositions` = speciální případ `distributeOnSpan` bez zón |
| `illustrator.js` | `getSelectedPathInfo()` — selection guard, jen `PathItem`; extrakce `pathPoints` do čistých polí `[x,y]` (core zůstává bez DOM) |
| `main.js` | Placement větví podle `placementMode`; artboard hrany přes `distributeOnSpan` |
| `ui.js` | Radio režimu, panel Cesta, panel Rohové zóny, typografický pass |
| `config.js` | Nové defaulty (viz schéma) |
| `lib/validation.js` | Nová pravidla + strukturální checky režimu |
| `lib/storage.js` | Forward-fill pokryje nová pole; `presetEquals` klíče |
| `locale.js` | Nové stringy EN/CS |
| `constants.js` | `CORNER_ANGLE_MIN`, `SAMPLES_PER_SEGMENT`, klíče režimů |

## Distribuční algoritmus (úsek roh–roh, délka L)

1. **Rohová zóna:** N značek *včetně rohové*, rozteč A → zóna zabírá
   `(N−1)·A` od každého konce úseku. Rohová značka vždy; sdílená mezi
   sousedními úseky — dedup existujícím mechanismem `place()`.
2. **Střed:** `M = L − 2(N−1)A`, vyplněno preferovanou roztečí B
   (počet dopočítán, rozteč přizpůsobena — dnešní chování).
3. **Degradace (deterministická):**
   - `L < 2(N−1)A` → zóny se zrcadlově potkají uprostřed, přesah ořeže dedup;
     střed neexistuje.
   - `M < B` → střed bez značek.
4. **Artboard:** roh = dnešní první značka (offset od rohu artboardu); zóny
   počítají od ní; mirror beze změny. **Zóny vypnuté = bitově dnešní
   chování** (regresní kotva).
5. **Cesta bez rohů (uzavřená):** režim Počet = přesně N rovnoměrně; režim
   Rozestup = `round(obvod/B)` značek, rozteč `obvod/počet`.
5b. **Cesta s rohy — jen režim Rozestup.** Jedno celkové číslo nelze rozumně
   rozdělit mezi povinné rohové značky a úseky různých délek; počet je
   emergentní z rohů + rozteče. UI: radio „Počet ok" disabled s helpTipem
   „Cesta s rohy se řídí roztečí — počet značek vyplyne z délek úseků."
   (Rozhodnutí ze self-review specu — stavové chování, stejný vzor jako
   disablování zón u cest bez rohů.)
6. **Cap:** max 9999 značek na okruh (ochrana proti freeze).

## Datový model (preset schéma v5)

```javascript
// nová pole (forward-fill doplní do starých presetů):
placementMode: "artboard",                            // "artboard" | "path"
cornerZone: { enabled: false, count: 5, pitch: 100 },
pathDist:   { useNumber: false, number: 24, spacing: 105 }
```

- Migrace: existující forward-fill mechanismus, žádný breaking change.
- `presetEquals` / `gatherAll` / `applyAll` rozšířeny o nová pole.
- Preset s `placementMode: "path"` načtený bez platného výběru → dialog se
  otevře v režimu artboard + jednorázová nenásilná poznámka (filozofie
  missing-swatch).

## UI/UX

Pořadí panelů: Předvolby → **Umístění** (nový) → Hrany ⟷ **Cesta** (přepínané)
→ **Rohové zóny** (nový, sdílený) → Značka → Vzhled → footer → tlačítka.

- **Umístění:** radio „Hrany artboardu / Vybraná cesta". Bez platného výběru
  je „Vybraná cesta" disabled, helpTip: „Nejdřív vyberte cestu v dokumentu
  a spusťte skript znovu."
- **Panel Cesta:** info řádek (uzavřenost, počet detekovaných rohů, obvod
  v aktuálních jednotkách) + radio Počet ok / Rozestup + poznámka:
  „Značky leží středem na cestě. Potřebujete-li odsazení od kraje, posuňte
  si cestu předem (Objekt ▸ Cesta ▸ Posunout cestu…)."
- **Panel Rohové zóny:** ☑ Zhustit u rohů + Počet + Rozteč. Pole disabled
  dokud checkbox off. V režimu Cesta s 0 detekovanými rohy se **celý panel
  disabluje** s helpTipem: „Vybraná cesta nemá rohy — značky se rozmístí
  rovnoměrně po obvodu." (Stavové chování, žádná mrtvá volba; platí pro
  jakoukoliv hladkou cestu, nejen kruh.)
- **Přepínání:** `panel.visible` + `dlg.layout.layout(true)` po každé změně.
- **Typografický pass:** jednotný sloupec popisků 75 px ve všech panelech,
  rytmus mezer 20/15/10/8, numerická pole 50 px (edge) / 60 px (standalone),
  sentence case s dvojtečkou, +20 % šířkový buffer pro česká labelová maxima,
  helpTip na 100 % interaktivních prvků.

## Validace

| Pole | Pravidlo |
|---|---|
| `cornerCount` | int, 1–999 |
| `cornerPitch` | 0.01–9999 |
| `pathNumber` | int, 1–9999 |
| `pathSpacing` | 0.01–9999 |

Strukturální (submit + zrcadleno v live validaci): režim Cesta → výběr
stále platný (re-check při OK), obvod > 0. Disabled pole se přeskakují
(existující mechanismus).

## Error handling

- `getSelectedPathInfo()` vrací `{ok, reason}`: `no-selection` /
  `not-a-path` / `too-short` — každý důvod má vlastní českou hlášku
  s návodem (např. složená cesta → „Objekt ▸ Složená cesta ▸ Uvolnit").
- Bézier sampling v try/catch s kontextem (index úseku); padlé úseky do
  collected warnings, skript pokračuje.
- Vše ostatní existující infrastrukturou: global boundary, collected+dedup
  warnings, layer session, `WARN_MARKS_FAILED`.

## Testy

| Suite | Pokrytí |
|---|---|
| `test_core_math` + | `sampleBezier`: kruh ze 4 Bézierů (κ=0.5523) vs. 2πr < 0,1 %; přímka přesně; `pointAtDistance` monotonie |
| `test_core_circuit` (nová) | `distributeOnSpan` zóny+střed, degradace krátkého úseku, **zóny off ≡ dnešní `calcPositions`** (regresní ekvivalence proti referenčnímu výpočtu); `detectCorners`: čtverec 4, kruh 0, zaoblený obdélník 0, trojúhelník 3 |
| `test_validation` + | nová pravidla, strukturální checky |
| `test_ui_dialog` + | přepínání režimů, gather nových polí, disabled zóny bez rohů, disabled radio bez výběru, disabled „Počet ok" u cesty s rohy |
| `test_storage_migrations` + | forward-fill v4→v5 |

## Mimo rozsah v5.0.0

- Per-úsek konfigurace na cestě (zamítnuto — YAGNI).
- Vlastní výpočet odsazení od cesty (nativní Offset Path je spolehlivější).
- `CompoundPathItem` / `GroupItem` jako cíl (přátelská chyba s návodem).
- Živý souhrn počtu, report po dokončení, undo grouping (TD-002) —
  uživatel explicitně odložil.
