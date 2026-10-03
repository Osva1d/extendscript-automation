# Persistence — settings storage in ExtendScript

Reference for `NS.Storage`: JSON settings under `Folder.userData`, schema
validation, versioned migrations. The module it describes is already
implemented, so the code is the source of truth wherever the two disagree:

- `grommet-marks/src/lib/storage.js`
- `zund-summa-marks/src/lib/storage.js`

Kept for the reasoning behind the design (metadata wrapper, type-checked
merge, migration chain) and for the anti-patterns in §5.

---
Standardised patterns for storing and retrieving user settings in Adobe Illustrator using local JSON files under `Folder.userData`.


## When this applies

- Saving user preferences between script runs ("Remember my settings")
- Restoring previous UI state (checkbox states, dropdown selections, input values) on dialog open
- Migrating settings when the script's stored-data schema changes
- Storing per-document or global configuration
- Implementing preset save/load (multiple named settings sets)

## 1. Storage locations

| Location | Path (macOS / Windows) | Use case | Cross-platform |
|---|---|---|---|
| `Folder.userData` | `~/Library/Application Support/` / `%APPDATA%` | User preferences (canonical) | ✅ |
| `Folder.appData` | (same as userData on macOS) / `%LOCALAPPDATA%` | App-wide settings | ✅ |
| `Folder.temp` | `/tmp/` / `%TEMP%` | Temporary, expendable | ✅ |
| `Folder.desktop` | `~/Desktop/` | User-visible exports | ✅ |
| `Folder.myDocuments` | `~/Documents/` | User-visible files | ✅ |

**Default**: `Folder.userData`. It survives macOS migrations, is hidden from the user (no Desktop clutter), and works identically on Windows.

```javascript
// macOS:   ~/Library/Application Support/<scriptFolder>/settings.json
// Windows: C:\Users\{user}\AppData\Roaming\<scriptFolder>\settings.json
var basePath = Folder.userData.fsName;
```

## 2. Complete `NS.Storage` module

Replace `NS` with the script's namespace (`GM` for Grommet Marks, `ZSM` for Zünd & Summa Marks, etc.) — same naming convention as `NS.L` (`extendscript-ui-standards` §3) and `NS.utils` (`es3-polyfilling-strategy` §5).

```javascript
var NS = NS || {};

NS.Storage = {
    // Configuration — change per script
    folderName: "GrommetMarks",          // Application Support subfolder
    fileName:   "settings.json",
    version:    1,                       // Schema version for migrations

    // ─────────────────────────────────────────────────────────────
    // FILE OPERATIONS
    // ─────────────────────────────────────────────────────────────

    /**
     * Get the storage file path. Creates the parent folder if missing.
     * Falls back to Folder.temp if userData is unavailable (rare).
     * @returns {File}
     */
    getFile: function () {
        var base = Folder.userData;
        if (!base.exists) base = new Folder(Folder.temp);

        var folderPath = base.fsName + "/" + this.folderName;
        var folder = new Folder(folderPath);
        if (!folder.exists) folder.create();

        return new File(folderPath + "/" + this.fileName);
    },

    exists: function () {
        return this.getFile().exists;
    },

    // ─────────────────────────────────────────────────────────────
    // SAVE
    // ─────────────────────────────────────────────────────────────

    /**
     * Save settings to file with metadata wrapper.
     * @param {Object} data - Settings payload
     * @returns {boolean}
     */
    save: function (data) {
        if (typeof JSON === "undefined") {
            this._logError("JSON not available — the build must concatenate shared/lib/json2.js first");
            return false;
        }

        try {
            var wrapper = {
                _meta: {
                    version:       this.version,
                    savedAt:       new Date().getTime(),   // ms; toISOString does not exist in ExtendScript
                    scriptVersion: NS.CONSTANTS ? NS.CONSTANTS.VERSION : "unknown"
                },
                settings: data
            };

            var file = this.getFile();
            file.open("w");
            file.encoding = "UTF-8";
            file.write(JSON.stringify(wrapper, null, 2));
            file.close();

            return true;
        } catch (e) {
            this._logError("Save failed: " + e.message);
            return false;
        }
    },

    // ─────────────────────────────────────────────────────────────
    // LOAD
    // ─────────────────────────────────────────────────────────────

    /**
     * Load settings, automatically running migrations if the stored
     * version is older than this.version. Returns null if no file or
     * the file is corrupt.
     * @returns {Object|null}
     */
    load: function () {
        if (typeof JSON === "undefined") {
            this._logError("JSON not available");
            return null;
        }

        try {
            var file = this.getFile();
            if (!file.exists) return null;

            file.open("r");
            file.encoding = "UTF-8";
            var content = file.read();
            file.close();

            if (!content || content.length === 0) return null;

            var wrapper = JSON.parse(content);

            if (wrapper._meta && wrapper._meta.version < this.version) {
                return this._migrate(wrapper);
            }

            return wrapper.settings || wrapper;   // tolerate pre-wrapper format
        } catch (e) {
            this._logError("Load failed: " + e.message);
            return null;
        }
    },

    /**
     * Load and merge with defaults — the safe entry point most callers
     * actually want. Always returns a complete object.
     * @param {Object} defaults
     * @returns {Object}
     */
    loadWithDefaults: function (defaults) {
        var stored = this.load();
        return this.merge(defaults, stored);
    },

    // ─────────────────────────────────────────────────────────────
    // MERGE & VALIDATE
    // ─────────────────────────────────────────────────────────────

    /**
     * Merge stored values into defaults, type-checking each override.
     * Keys present in stored but not in defaults are dropped (prevents
     * stale or hand-edited junk from leaking into the runtime config).
     * Keys whose stored type does not match the default type are also
     * dropped — guards against manually edited JSON.
     * @param {Object} defaults
     * @param {Object} stored
     * @returns {Object}
     */
    merge: function (defaults, stored) {
        if (!stored) return this._clone(defaults);

        var merged = {};
        for (var key in defaults) {
            if (defaults.hasOwnProperty(key)) merged[key] = defaults[key];
        }
        for (var key in stored) {
            if (stored.hasOwnProperty(key) && merged.hasOwnProperty(key)) {
                if (typeof stored[key] === typeof defaults[key]) {
                    merged[key] = stored[key];
                }
            }
        }
        return merged;
    },

    /**
     * Validate settings against a schema.
     * @param {Object} settings
     * @param {Object} schema - { fieldName: { type, required, min, max, enum } }
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validate: function (settings, schema) {
        var errors = [];

        for (var key in schema) {
            if (!schema.hasOwnProperty(key)) continue;

            var rule  = schema[key];
            var value = settings[key];

            if (rule.required && (value === undefined || value === null)) {
                errors.push("Missing required field: " + key);
                continue;
            }
            if (rule.type && typeof value !== rule.type) {
                errors.push("Invalid type for " + key + ": expected " + rule.type);
            }
            if (rule.min !== undefined && value < rule.min) {
                errors.push(key + " below minimum: " + rule.min);
            }
            if (rule.max !== undefined && value > rule.max) {
                errors.push(key + " above maximum: " + rule.max);
            }
            if (rule.enum && rule.enum.indexOf(value) === -1) {
                errors.push(key + " not in allowed values: " + rule.enum.join(", "));
            }
        }

        return { valid: errors.length === 0, errors: errors };
    },

    // ─────────────────────────────────────────────────────────────
    // MIGRATIONS
    // ─────────────────────────────────────────────────────────────

    /**
     * Migration handlers, keyed by "<oldVersion>_to_<newVersion>".
     * Add a new entry every time you bump this.version.
     */
    migrations: {
        // v0 → v1: rename a field
        "0_to_1": function (oldSettings) {
            if (oldSettings.markFromEdgeMm !== undefined) {
                oldSettings.gapMarkToEdgeMm = oldSettings.markFromEdgeMm;
                delete oldSettings.markFromEdgeMm;
            }
            return oldSettings;
        }
    },

    /**
     * Run migrations sequentially from oldVersion to this.version.
     * Saves the migrated result so subsequent loads skip the work.
     * @private
     */
    _migrate: function (wrapper) {
        var oldVersion = wrapper._meta.version || 0;
        var settings   = wrapper.settings || wrapper;

        for (var v = oldVersion; v < this.version; v++) {
            var migrationKey = v + "_to_" + (v + 1);
            if (this.migrations[migrationKey]) {
                settings = this.migrations[migrationKey](settings);
            }
        }

        this.save(settings);
        return settings;
    },

    // ─────────────────────────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────────────────────────

    /** Delete the settings file (force back to defaults on next load). */
    reset: function () {
        try {
            var file = this.getFile();
            if (file.exists) file.remove();
            return true;
        } catch (e) {
            this._logError("Reset failed: " + e.message);
            return false;
        }
    },

    /** Copy settings.json → settings_backup.json before risky changes. */
    backup: function () {
        try {
            var file = this.getFile();
            if (!file.exists) return false;

            var backupName = this.fileName.replace(".json", "_backup.json");
            var backupFile = new File(file.parent + "/" + backupName);
            return file.copy(backupFile);
        } catch (e) {
            this._logError("Backup failed: " + e.message);
            return false;
        }
    },

    /** Deep clone via JSON round-trip — works for plain data only (no functions, no Dates). */
    _clone: function (obj) {
        if (typeof JSON !== "undefined") return JSON.parse(JSON.stringify(obj));

        // Shallow fallback for environments without JSON
        var clone = {};
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) clone[key] = obj[key];
        }
        return clone;
    },

    _logError: function (msg) {
        if (NS.Logger && NS.Logger.error) {
            NS.Logger.error("Storage: " + msg);
        }
    }
};
```

## 3. Usage patterns

### 3.1 Basic save / load

```javascript
var defaults = {
    mode:     "echo",
    markSize: 5,
    gap:      10,
    showGrid: true
};

// Always returns a complete object — first run uses defaults, subsequent runs use stored values
var settings = NS.Storage.loadWithDefaults(defaults);

// ... user modifies settings via the dialog ...

NS.Storage.save(settings);
```

### 3.2 Integration with the dialog-result pattern

The canonical `main()` of a workspace script:

```javascript
NS.Main = function () {
    var defaults = NS.Config.getDefaultSettings();
    var settings = NS.Storage.loadWithDefaults(defaults);

    // Show dialog populated with the loaded settings
    var result = NS.UI.showDialog(settings);

    if (result.status === "ok") {
        NS.Storage.save(result.settings);
        NS.execute(result.settings);
    }
};
```

(See `building-adobe-ui` §6.2 for `showDialog`'s `{status, settings}` contract.)

### 3.3 With validation

Useful when settings can come from outside (imported preset, manually edited file):

`validate` belongs to the reference module in §2 — the tools' real `storage.js`
has none. There, check loaded JSON with `Validate.settings` from the
`robust-error-handling` skill.

```javascript
var schema = {
    mode:     { type: "string", required: true, enum: ["echo", "summa", "both"] },
    markSize: { type: "number", required: true, min: 1, max: 50 },
    gap:      { type: "number", required: true, min: 0 }
};

var settings   = NS.Storage.load();
var validation = NS.Storage.validate(settings, schema);

if (!validation.valid) {
    alert("Neplatné nastavení:\n" + validation.errors.join("\n"));
    settings = NS.Config.getDefaultSettings();
}
```

### 3.4 Per-document settings

For settings that should bind to a specific Illustrator document rather than the user globally:

```javascript
NS.Storage.getDocumentFile = function (doc) {
    var docName = doc.name.replace(/\.[^.]+$/, "");   // strip extension
    return new File(this.getFile().parent + "/" + docName + "_settings.json");
};

NS.Storage.saveForDocument = function (doc, data) {
    var file = this.getDocumentFile(doc);
    // ... same write logic as save() but with this file
};
```

## 4. Cross-platform considerations

### Path separators

```javascript
// ✅ Always forward slash — Adobe normalises on Windows
var path = folder.fsName + "/" + fileName;

// ❌ Never backslash — breaks on macOS, also requires escape pairs in JS strings
var path = folder.fsName + "\\" + fileName;
```

### File encoding

Always set UTF-8 explicitly **before** `open()`:

```javascript
file.encoding = "UTF-8";
file.open("w");
```

Without this, Czech diacritics in stored values (preset names, file paths) get mojibake'd. See `ui-string-management` for the broader Czech-encoding rules; here, UTF-8 plus the BOM-on-dist invariant from `code-style` §7.1 cover most cases.

### Folder creation

```javascript
var folder = new Folder(path);
if (!folder.exists) folder.create();
```

`Folder.userData` itself always exists, but the per-script subfolder (`folderName`) does not on first run.

## 5. Anti-patterns

### ❌ No default fallback

```javascript
// BAD — crashes when settings file does not exist yet
var settings = NS.Storage.load();
var mode = settings.mode;        // TypeError: settings is null

// GOOD — loadWithDefaults always returns a complete object
var settings = NS.Storage.loadWithDefaults(defaults);
var mode = settings.mode;
```

### ❌ Trusting stored types

```javascript
// BAD — user may have hand-edited the JSON
var gap = settings.gap;
var result = 100 / gap;          // NaN if gap is "10" instead of 10

// GOOD — coerce or fall back
var gap = typeof settings.gap === "number" ? settings.gap : defaults.gap;
```

`merge()` already does this for top-level keys; this rule applies at deeper levels you handle manually.

### ❌ No migration strategy

```javascript
// BAD — old users' stored settings produce undefined after a rename
// v1 stored: { markFromEdgeMm: 10 }
// v2 reads:  settings.gapMarkToEdgeMm  → undefined
var gap = settings.gapMarkToEdgeMm;

// GOOD — add an entry to migrations and bump this.version
NS.Storage.migrations["1_to_2"] = function (s) {
    if (s.markFromEdgeMm !== undefined) {
        s.gapMarkToEdgeMm = s.markFromEdgeMm;
        delete s.markFromEdgeMm;
    }
    return s;
};
NS.Storage.version = 2;
```

### ❌ Storing sensitive data

```javascript
// BAD — settings.json is plain text, world-readable to anything on the user's machine
var settings = {
    apiKey:   "sk-1234567890",
    password: "secret123"
};

// GOOD — only non-sensitive preferences
var settings = {
    mode:           "echo",
    lastUsedPreset: "default"
};
```

For credentials, use macOS Keychain via `do shell script "security ..."` (see `applescript-patterns` §4) or prompt the user each time.

### ❌ No error handling around file ops

```javascript
// BAD — disk full, permission denied, corrupted file → uncaught error
var file = NS.Storage.getFile();
file.open("w");
file.write(data);

// GOOD — already what NS.Storage.save() does internally
try {
    var file = NS.Storage.getFile();
    file.open("w");
    file.encoding = "UTF-8";
    file.write(data);
    file.close();
} catch (e) {
    alert("Nastavení nelze uložit: " + e.message);
}
```

## 6. Validation schema reference

```javascript
var schema = {
    fieldName: {
        type:     "string",      // "string", "number", "boolean", "object"
        required: true,          // Must exist
        min:      0,             // Minimum (numbers only)
        max:      100,           // Maximum (numbers only)
        enum:     ["a", "b"],    // Allowed values
        default:  "a"            // Default if missing (consumed by your own merge logic, not by validate())
    }
};
```

## 7. Debugging tips

### Inspect storage location

```javascript
alert("Settings stored at:\n" + NS.Storage.getFile().fsName);
```

### View stored content

```javascript
var file = NS.Storage.getFile();
if (file.exists) {
    file.open("r");
    file.encoding = "UTF-8";
    alert(file.read());
    file.close();
}
```

### Reset to defaults

```javascript
NS.Storage.reset();
alert("Nastavení smazáno. Spusťte skript znovu pro výchozí hodnoty.");
```

### Verify migration ran

After bumping `version`, run the script with a stored older-version file and confirm:

1. The stored file's `_meta.version` is now the new version (migration ran + saved).
2. Renamed/transformed keys are present in their new form.
3. No alert / error.

## See also

- **`code-style`** skill (§7.1 ExtendScript) — file headers, BOM rules, ES3 syntax constraints, build-script polyfill order.
- **`handling-adobe-files`** skill — for the underlying `File` / `Folder` API (`fsName`, `open`/`read`/`write`/`close`, encoding, file pickers if you let users pick a custom storage location).
- **`es3-polyfilling-strategy`** skill — the JSON polyfill (`json2.js`) is mandatory for this skill to work; it must be the first concatenated module in `tools/build.sh`.
- **`extendscript-ui-standards`** skill (§3 Localization, §4 Preset panel) — the dialog that consumes loaded settings and emits the values this skill saves; preset save/load lives between this skill and the preset panel pattern.
- **`building-adobe-ui`** skill (§6.2 dialog result pattern) — the `{status, settings}` contract that pairs cleanly with `loadWithDefaults` → show dialog → `save`.
- **`ui-string-management`** skill — for Czech text in stored preset names, error messages emitted by the storage module, etc.
