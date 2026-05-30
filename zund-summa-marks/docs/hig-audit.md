# HIG Audit — ZSM Dialog (v26.3.2)

**Stav:** Baseline pro v26.3.2 (květen 2026)
**Změna oproti v26.3.1:** Žádné UI změny — patch verze upravila pouze validační minimum `maxDist`. HIG layout zůstává shodný.
**Auditor:** Automated assertions in `tests/test_ui_layout.js` + manual review

Tento dokument definuje **závazné konvence vizuálního layoutu** pro ScriptUI dialog skriptu Zünd & Summa Marks. Každá položka je buď automaticky vynucena testem (📋 viz `tests/test_ui_layout.js`), nebo platí jako review-checklist.

Reference: Adobe Creative Cloud Scripting Guide, ScriptUI Programming Guide, "JavaScript Tools Guide" (PDF v2.0).

---

## 1. Window (root dialogu)

| Položka | Hodnota | Kde vynuceno |
|---------|---------|--------------|
| Kind | `dialog` (modal) | TEST 1 |
| Title | App name + version (např. „Zünd & Summa Marks v26.3.1") | TEST 1 (regex `v\d+\.\d+`) |
| Margins | **20** | TEST 1 (HIG range 16-20) |
| Spacing | **15** | TEST 1 (HIG range 8-15) |
| preferredSize.width | **390** (rozsah 350-450) | TEST 1 |
| Orientation | `column` | manuál |

**HIG rationale:** Větší vnější padding (20px) odděluje obsah od okna. Vertikální spacing 15px vytváří jasné sekce mezi paneli.

---

## 2. Panely

Každý panel ohraničuje logickou skupinu nastavení. Pořadí v dialogu (shora dolů):

1. **Presets** (`l.PANEL_PRESET`) — preset selector + Save/Save As/Delete
2. **Technology** (`l.PANEL_TECH`) — mode dropdown + (ZUND only) source radio buttons
3. **Gap Settings** (`l.PANEL_GEO`) — geometry inputs (mode-specific)
4. **Feed Settings** (`l.PANEL_FEED`) — SUMMA only
5. **Layer to Color Mapping** (`l.PANEL_LAYERS`) — dynamic layer rows + Add button

| Položka | Hodnota | Kde vynuceno |
|---------|---------|--------------|
| Margins | **15** (všechny panely) | TEST 2 (každý panel) |
| AlignChildren | `["fill", "top"]` | manuál |
| Spacing | **8-10** (záleží na panelu) | manuál |
| Title | Lokalizováno přes `ZSM.L.PANEL_*` | manuál |

---

## 3. Footer (akční tlačítka)

```
[Reset]                                 [Cancel] [Generate]
```

| Tlačítko | Vlastnost | Hodnota | Kde vynuceno |
|----------|-----------|---------|--------------|
| Reset | text | `l.BTN_RESET` | TEST 3 |
| Reset | alignment | `["left", "center"]` | TEST 3 (HIG: destructive separation) |
| Cancel | name | `"cancel"` | TEST 3 (ScriptUI binding for Esc key) |
| Cancel | text | `l.BTN_CANCEL` | manuál |
| Generate | name | `"ok"` | TEST 3 (ScriptUI binding for Enter key) |
| Generate | text | `l.BTN_OK` | manuál |
| Order | OK after Cancel (sibling index) | TEST 3 |

**HIG rationale:** Adobe konvence — destructive akce (Reset) je vlevo, oddělená od primárních (Cancel/OK), aby uživatel omylem neresetoval místo zrušení dialogu. OK musí být **vpravo od** Cancel — z toho vyplývá pořadí konstrukce v `grpButtons.add()`.

---

## 4. HelpTip coverage (a11y)

**Pravidlo:** Každý interaktivní control MUSÍ mít `helpTip` poskytující kontextovou nápovědu při hover.

| Typ controlu | helpTip povinen? | Kde vynuceno |
|--------------|------------------|--------------|
| `button` | ✅ ano | TEST 4 (všechna tlačítka) |
| `dropdownlist` | ✅ ano | TEST 4 (všechny dropdowny) |
| `edittext` | ✅ ano | manuál (mostly via `addRow` helper) |
| `checkbox` | ✅ ano | manuál |
| `radiobutton` | ✅ ano | manuál |
| `statictext` (label) | ✅ ano (pokud je vázaný k inputu) | manuál |

**Známé výjimky:** žádné. Jakékoliv nově přidané controly bez helpTip selžou v TEST 4.

---

## 5. Numerické edit-text kontroly

```
[Label  80-160px][Input 60px][mm]
```

| Položka | Hodnota | Kde vynuceno |
|---------|---------|--------------|
| Edit text width | **60px** | TEST 5 (≥ 4 inputs at width 60) |
| Static label width | 80px (gap rows) nebo 160px (mark color) | manuál (záleží na panelu) |
| Suffix label | „mm" jako static text | manuál |
| Decimal separator | Comma OR dot (CZ/EN locale-tolerant) | TEST 7 v `test_validation.js` |

Helper `ZSM.UI.addRow(parent, label, value, tip)` zapouzdřuje tento řádek; nové numerické řádky musí jít přes něj.

---

## 6. Dropdowns (DropDownList)

| Kontext | Width | Kde vynuceno |
|---------|-------|--------------|
| Mode selector (Technology panel) | default (no preferredSize) | manuál |
| Mark color | **130px** | TEST 6 (range 100-250) |
| Layer row: layer name | **200px** | TEST 6 |
| Layer row: layer color | **150px** | TEST 6 |
| Preset selector | `alignment: fill` (no fixed) | manuál |

Všechny dropdowny mají `helpTip` (TEST 4). Selection se automaticky resetuje na 1. položku, pokud aktuální hodnota není v items (helper `selectDDL`).

---

## 7. Mode-specifická layout

### ZUND mode

| Control | Důvod existence | Kde vynuceno |
|---------|-----------------|--------------|
| Source radio buttons (Auto / Fixed) | Volba mezi auto-fit a fixed artboard | TEST 7 |
| Gap from graphics (`gapInner`) | Mezera značek od grafiky | TEST 7 |
| Mark size (`markSizeZ`) | Průměr Zünd kroužku | TEST 7 |
| Orient distance | Pozice orientation marky | manuál |

NEZOBRAZUJE: drawRed checkbox, feedTop, feedBottom (TEST 7 explicit absence).

### SUMMA mode

| Control | Důvod existence | Kde vynuceno |
|---------|-----------------|--------------|
| Feed top / bottom | Material excess for feeder | TEST 8 |
| Draw red trim lines | Volba kreslení červených ořezových linek | TEST 8 |
| Mark size (`markSizeS`) | Strana Summa čtverce | TEST 8 |

NEZOBRAZUJE: gap from graphics, source radio buttons (TEST 8 explicit absence).

---

## 8. Layer mapping panel (dynamic rows)

```
[Layer        ][Color       ]
[stack: dd|et][dropdown    ][−]
[stack: dd|et][dropdown    ][−]
[+ Add]
```

| Položka | Hodnota | Kde vynuceno |
|---------|---------|--------------|
| Header row | StaticText "Layer" + "Color" | manuál |
| Row controls | layerNameStack (dd+et) + colorDropdown + removeButton | TEST 10 |
| Layer name | Stack of dropdown (preset names) + edittext (custom) | manuál |
| Remove button | text `"−"` (U+2212), preferredSize [30, 25] | manuál |
| MAX_LAYERS | **8** | manuál |
| Add button text | `l.BTN_ADD_LAYER` ("+ Add" / "+ Přidat") | TEST 10 |
| Min rows | **1** (cannot remove the last row) | manuál (`updateRemoveButtons`) |

---

## 9. Preset panel

```
[Předvolba: ][═══ Dropdown ═════════]
                  [Save] [Save As…] [Delete]
```

| Položka | Hodnota | Kde vynuceno |
|---------|---------|--------------|
| Preset dropdown | width fill | manuál |
| Preset dropdown | helpTip = `l.PRESET_LABEL` | TEST 4 (regression-fixed) |
| Save button | enabled iff modified | TEST 12 |
| Save As button | always enabled | manuál |
| Delete button | disabled on `[Default]` | manuál |
| Modified indicator | suffix `" *"` na active item | TEST 15 |

---

## 10. Lokalizace

| Pravidlo | Kde vynuceno |
|----------|--------------|
| Veškerý user-facing text přes `ZSM.L.*` | manuál (review) |
| Locale tabulky: `en` (default) + `cs` | `tests/test_locale.js` (407 tests) |
| Settings storage je locale-independent | `tests/test_storage_migrations.js` (migrace `[Výchozí]` → `[Default]`) |
| Decimal separator: comma OR dot tolerant | `tests/test_validation.js` |

---

## 11. Accessibility

| Pravidlo | Stav |
|----------|------|
| Tooltips na všech controlech | ✅ TEST 4 |
| Keyboard: Esc → Cancel | ✅ ScriptUI auto (button name = "cancel") |
| Keyboard: Enter → Generate | ✅ ScriptUI auto (button name = "ok") |
| Focus order = creation order | ✅ default ScriptUI |
| Tab navigation | ⚠️ default (nelze customize v ScriptUI) |
| Screen reader | ⚠️ není podporováno ScriptUI |

---

## 12. Záměrné odchylky od HIG

| Odchylka | Důvod |
|----------|-------|
| Panel preset má 2-row layout (label+dropdown / buttons) | Výchozí HIG single-row by nevešel 4 buttony do 360px viewport |
| Reset button v dialog footer (ne v Edit menu) | ScriptUI dialog nemá menubar; Reset je interní akce dialogu |

---

## 13. Validace nových kontrolů (checklist)

Při přidávání nového controlu do dialogu zkontrolujte:

- [ ] Má `helpTip` (povinné — viz TEST 4)
- [ ] Pokud edittext numerický, šířka **60px** (TEST 5)
- [ ] Pokud dropdown, šířka **100-250px** (TEST 6) nebo `alignment: fill`
- [ ] Lokalizovaný text přes `ZSM.L.*`
- [ ] Mode-specific? Přidat do TEST 7/8 jako presence/absence assertion
- [ ] Pokud přidává state, rozšiřte `getUIValues()` + `setUIValues()` + `ZSM.Validation.rules`

---

## 14. Test coverage souhrn

| Aspekt | Test | Pokrytí |
|--------|------|---------|
| Window dimensions | TEST 1 | margins, spacing, width, title |
| Panel margins | TEST 2 | 15px na všech panelech |
| Footer button order | TEST 3 | Reset left, Cancel/OK right, names |
| HelpTip coverage | TEST 4 | buttons + dropdowns |
| Numeric inputs | TEST 5 | 60px width |
| Dropdown widths | TEST 6 | 100-250px |
| ZUND-specific | TEST 7 | radio, gap, mark size; absent: feed/drawRed |
| SUMMA-specific | TEST 8 | feed, drawRed; absent: radio, gapInner |
| Mode dropdown | TEST 9 | items, selection |
| Layer mapping | TEST 10 | panel, +Add, rows |
| Preset panel | TEST 11 | Save/SaveAs/Delete |
| Save state | TEST 12 | initial disabled |
| Mode reflect | TEST 13 | dropdown selection |
| Default values | TEST 14 | populated |
| Modified asterisk | TEST 15 | UI change → asterisk + Save enabled |

**Celkem 51 assertions napříč 15 testy.**

---

## 15. Co NENÍ pokryté (manuálně review)

Tyto aspekty mockovaný ScriptUI testovat neumí:

- ❌ **Pixel-level rendering** — vyžaduje běžící Illustrator
- ❌ **OS-specific theming** — macOS dark mode vs Windows light mode
- ❌ **Font rendering** — antialiasing, kerning
- ❌ **Resize behavior** — uživatel může okno roztáhnout (default ScriptUI dialog je fixed-size; review)
- ❌ **Real keyboard navigation** — Tab order v praxi (default ScriptUI je creation order)
- ❌ **Accessibility tools** — VoiceOver, screen reader

Pro tyto aspekty platí **manuální checklist při major UI změnách**:

1. Spustit skript v AI na macOS — porovnat s předchozí verzí
2. Spustit v dark mode + light mode
3. Test Tab navigation (Tab a Shift+Tab projedou všechny inputs)
4. Test keyboard shortcuts (Enter = Generate, Esc = Cancel)
5. Test na Czech locale (CS/EN dle `app.locale`)
6. Vyzkoušet všechny scénáře v `docs/manual-checklist.md` (TODO: vytvořit)
