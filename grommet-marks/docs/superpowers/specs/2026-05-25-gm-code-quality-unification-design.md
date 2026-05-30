# Grommet Marks v4.0 — Code Quality & ZSM Unification

> Cyklus 1 ze dvou. Tento cyklus: architektura, persistence, naming, testy.
> Cyklus 2 (budoucí): UI redesign inspirovaný Mars Premedia.

---

## Cíl

Sjednotit architekturu Grommet Marks (GM) s referenčním projektem Zünd Summa Marks (ZSM) v oblastech:

- Separace odpovědností (persistence, validace, preset logika, utils)
- Persistence formát (wrapper + `[Last Settings]`)
- Sentinel konvence (`[Default]` místo `__default__`)
- Naming, hlavičky modulů, namespace guard
- Základní test suite
- UX vylepšení plynoucí ze sjednocení (modified indicator, live validace, Save As, Reset)

Výsledek: GM v4.0.0 — architektonicky shodný se ZSM, připravený pro UI redesign v cyklu 2.

---

## Přístup

Bottom-up refactor — extrakce modulů od spodu závislostního stromu nahoru. Každý krok je izolovaný, buildovatelný, testovatelný.

---

## 1. Adresářová struktura

### Současná

```
src/
├── polyfills/json2.js
├── constants.js
├── locale.js
├── config.js         # persistence + getDefaults + migrate
├── core.js
├── illustrator.js
├── ui.js             # ScriptUI + preset logika
└── main.js
```

### Navrhovaná

```
src/
├── polyfills/json2.js
├── lib/
│   ├── utils.js          # NOVÝ
│   ├── storage.js        # NOVÝ (extrahováno z config.js)
│   ├── validation.js     # NOVÝ (extrahováno z main.js)
│   └── ui_state.js       # NOVÝ (extrahováno z ui.js)
├── constants.js          # jen naming review
├── locale.js             # rozšíření o nové klíče
├── config.js             # ZMENŠENÝ: getDefaults() + PRESET_KEY_DEFAULT
├── core.js               # beze změn
├── illustrator.js        # beze změn
├── ui.js                 # ZMENŠENÝ: čisté ScriptUI, deleguje na ui_state
└── main.js               # ZMENŠENÝ: deleguje validaci na validation
```

### Build order (build.sh)

```
json2 → constants → locale → lib/utils → config → lib/storage →
lib/validation → lib/ui_state → core → illustrator → ui → main
```

---

## 2. Persistence

### Nový disk formát

```javascript
{
    activePreset: "[Default]",
    presets: {
        "[Default]": { /* settings */ },
        "[Last Settings]": { /* settings */ },
        "Banner 400x150": { /* settings */ }
    }
}
```

Soubor: `~/Library/Application Support/GrommetMarks/GrommetMarksSettings.json` (beze změny cesty).

### Chování `[Last Settings]`

- Při Generate se aktuální UI stav uloží jako `[Last Settings]`.
- Při dalším otevření se načtou hodnoty z `[Last Settings]`.
- Pojmenované presety se nemění — jsou immutable dokud uživatel neklikne Save.
- `activePreset` ukazuje na naposledy vybraný pojmenovaný preset.

### Migrace ze starého formátu

`GM.Storage.load()` obsahuje migrační řetěz:

1. **Flat → wrapper**: detekce chybějícího `presets` klíče → zabalení do wrapperu.
2. **`__default__` → `[Default]`**: přejmenování sentinel klíče v presets i activePreset.
3. **Stávající migrace**: v2→v3 (per-edge offsets → global), v3.0→v3.1 (lokalizované unit/sentinel stringy → interní klíče). Tyto běží per-preset po zabalení do wrapperu.
4. **Forward-fill**: nové default klíče se doplní do existujících presetů.

---

## 3. Nové moduly

### `lib/utils.js` — `GM.Utils`

| Funkce | Popis |
|---|---|
| `log(msg)` | `$.writeln` wrapper |
| `error(msg)` | `alert(GM.CONSTANTS.SCRIPT_NAME + ": " + msg)` |
| `deepCopy(obj)` | `JSON.parse(JSON.stringify(obj))` |
| `presetEquals(a, b)` | Hluboké porovnání dvou settings objektů (pro modified indicator) |

Závislosti: `GM.CONSTANTS` (pro SCRIPT_NAME v error).

### `lib/storage.js` — `GM.Storage`

Extrahováno z `config.js`. Odpovědnost: čtení/zápis JSON souboru + migrace.

| Funkce | Popis |
|---|---|
| `getFile()` | Vrací File objekt (`Folder.userData + "/GrommetMarks/"`) |
| `load()` | Čtení + celý migrační řetěz → wrapper nebo null |
| `save(data)` | Serializace + zápis |

Závislosti: `GM.Utils` (logging), `GM.Config` (getDefaults, PRESET_KEY_DEFAULT).

### `lib/validation.js` — `GM.Validation`

Extrahováno z `main.js`. Rules-based validace jako ZSM.

```javascript
GM.Validation.rules = {
    offsetX:      { min: 0, max: 9999, integer: false },
    offsetY:      { min: 0, max: 9999, integer: false },
    markSize:     { min: 0.01, max: 9999, integer: false },
    strokeWeight: { min: 0.01, max: 100, integer: false },
    edgeCount:    { min: 1, max: 9999, integer: true },
    edgeSpacing:  { min: 0.01, max: 9999, integer: false }
};
```

| Funkce | Popis |
|---|---|
| `validateNumber(value, rule, label, L)` | Společný validátor, vrací parsed number nebo null + alert |
| `validate(raw, prev, L)` | Celková validace → `{valid, settings}` |

Závislosti: `GM.L` (chybové hlášky).

### `lib/ui_state.js` — `GM.UIState`

Extrahováno z `ui.js`. Pure state-transition logika pro presety — testovatelná bez ScriptUI.

| Konstanta / Funkce | Popis |
|---|---|
| `PRESET_KEY_DEFAULT` | `"[Default]"` |
| `PRESET_KEY_LAST` | `"[Last Settings]"` |
| `validatePresetName(raw)` | Trimmed name nebo null (reserved names rejected) |
| `isModified(pData, currentValues)` | Boolean — UI differs from stored preset |
| `formatPresetList(pData, currentValues, L)` | Dropdown entries s hvězdičkou |
| `save(pData, currentValues)` | Uložit do aktivního presetu → `{ok, reason?}` |
| `saveAs(pData, name, currentValues, confirmFn)` | Nový preset → `{ok, name?}` |
| `deleteActive(pData)` | Smazat aktivní → `{ok, reason?}` |
| `selectPreset(pData, name)` | Přepnout → `{ok, settings?}` |

Závislosti: `GM.Utils` (presetEquals).

---

## 4. Změny existujících modulů

### `config.js` — ZMENŠENÝ

Zůstává:
- `GM.Config.getDefaults()` — default settings objekt
- `GM.Config.PRESET_KEY_DEFAULT = "[Default]"`
- `GM.Config.createEdgeDef()` — factory pro edge definition

Odchází do `lib/storage.js`:
- `load()`, `save()`, `migrate()`, `migrateKeys()`, `getSettingsFile()`

### `main.js` — ZMENŠENÝ

`GM.Main.validate()` se přesune do `lib/validation.js`.
`process()` zůstává (artboard smyčka + placeMark volání).
`run()` se aktualizuje: volá `GM.Storage` místo `GM.Config` pro load/save.

Změna v `run()` — při OK:
```javascript
// Uložit [Last Settings]
pData.presets["[Last Settings]"] = cfg;
GM.Storage.save(pData);
```

### `ui.js` — ZMENŠENÝ

Preset onClick handlery (save, delete, load onChange) se ztenčí na:
1. Zavolat `GM.UIState.*` pro state transition
2. Pokud `ok` → aktualizovat dropdown, zavolat `setUIValues`
3. Pokud error → alert s lokalizovanou hláškou

Nové UI elementy (cyklus 1, žádná změna layoutu):
- **Save As tlačítko** vedle Save
- **Reset tlačítko** (left-aligned ve footer, jako ZSM)
- **Modified indicator** — hvězdička v dropdown textu, Save disabled bez změn
- **Live validace** — červený text + disabled OK (vzor z ZSM: `markFieldValidity` + `liveValidateAll`)
- **Copyright footer** — `© 2025–2026 Osva1d — Illustrator Grommet Marks v4.0`
- **Verze v titulku** dialogu

### `locale.js` — ROZŠÍŘENÍ

Nové klíče (EN + CS):

```
BTN_SAVE_AS / TIP_SAVE_AS
BTN_RESET / TIP_RESET
ERR_RESERVED_NAME
ERR_PRESET_EXISTS (confirm overwrite)
PRESET_PLACEHOLDER
```

### `constants.js`

- Odstranit `SENTINEL_CREATE` a `SENTINEL_DEFAULT` (nahrazeny `PRESET_KEY_*` v config a stringy v locale).
- Sentinel `"__create__"` pro layer/swatch zůstává — interní, nesouvisí s presety.

Upřesnění: `SENTINEL_DEFAULT` (`"__default__"`) se odstraní, protože je nahrazen `GM.Config.PRESET_KEY_DEFAULT = "[Default]"`. `SENTINEL_CREATE` (`"__create__"`) zůstává beze změny — slouží pro layer/swatch auto-creation a není součástí preset systému.

---

## 5. Naming konvence

| Oblast | Pravidlo |
|---|---|
| Namespace guard | `var GM = GM \|\| {};` na začátku každého souboru |
| Hlavičky modulů | Blok: `// Module: GM.X — jednořádkový popis` / `// Part of: Illustrator Grommet Marks` / `// Depends on: GM.Y, GM.Z` |
| JSDoc | Všechny veřejné funkce |
| Komentáře | Minimální, anglicky (shodné s aktuálním GM i ZSM stylem) |

---

## 6. Testy

```
tests/
├── run_all.sh
├── test_core_math.js
└── test_storage_migrations.js
```

Plus `package.json`:
```json
{
    "name": "grommet-marks",
    "version": "4.0.0",
    "scripts": {
        "build": "bash tools/build.sh",
        "test": "bash tests/run_all.sh",
        "verify": "npm run build && npm test"
    }
}
```

### `test_core_math.js`

- `calcPositions` — fixed count, preferred spacing, edge cases (0 span, 1 mark, huge count)
- `convertVal` — mm↔cm↔in, identity
- `round` — float precision

### `test_storage_migrations.js`

- Flat `{__default__: ...}` → wrapper `{activePreset, presets}`
- `__default__` → `[Default]` key rename
- v2 per-edge offsets → v3 global offsets
- v3.0 localized strings → v3.1 internal keys
- Forward-fill nových default klíčů
- Null/empty/corrupt input → graceful fallback

---

## 7. Verze

**v4.0.0** — breaking change v persistence formátu (s automatickou migrací).

`VERSION` bump v:
- `tools/build.sh`
- `src/constants.js` (SCRIPT_NAME zůstává, VERSION se aktualizuje)
- `package.json`

---

## 8. Tech debt řešený tímto cyklem

- **TD-002** (undo grouping): mimo scope cyklu 1, zůstává otevřený.
- **TD-003** (mirror checkbox neobnovuje stav): mimo scope cyklu 1, zůstává otevřený.
- **TD-001** (mirror checkbox mimo panel): odloženo na cyklus 2 (UI redesign).

---

## 9. Mimo scope (cyklus 2)

- UI layout redesign (inspirace Mars Premedia)
- TD-001 řešení (mirror checkbox do panelu)
- TD-003 řešení (stav mirror restore)
- Rozšířená test suite (ui_state, validation, e2e)
- Případná další UX vylepšení (undo grouping, preview)

---

*Schváleno: 2026-05-25*
