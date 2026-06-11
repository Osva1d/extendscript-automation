// ------------------------------------------------------------------------
// Module: ZSM.Storage — settings persistence + migrations
// Part of: Illustrator Zund & Summa Marks
//
// Responsible for reading/writing the JSON settings file at
// `Folder.userData/ZSM/settings.json` and migrating older layouts forward.
// Pure I/O + data transformation; no DOM access, no UI.
//
// Depends on: ZSM.Utils (logging), ZSM.Config (getDefaults, PRESET_KEY_DEFAULT)
// ------------------------------------------------------------------------
var ZSM = ZSM || {};

ZSM.Storage = {
    /**
     * Returns the settings File object, creating the folder if needed.
     * @returns {File} JSON settings file at the canonical path.
     */
    getFile: function () {
        var folder = new Folder(Folder.userData + "/ZSM");
        if (!folder.exists) folder.create();
        return new File(folder.fsName + "/settings.json");
    },

    /**
     * Returns the legacy v26.3 settings file (used by load() for one-time
     * migration to the new canonical filename).
     * @returns {File} Legacy file path.
     */
    getLegacyFile: function () {
        var folder = new Folder(Folder.userData + "/ZSM");
        return new File(folder.fsName + "/settings_v26_3.json");
    },

    /**
     * Serializes and saves the full preset wrapper to disk.
     * Returns success so CALLERS decide how to surface a failure (alert with
     * context); this module never alerts itself. open(), write() and close()
     * are all checked — File.write returns false on a full disk / permission
     * error without throwing, so an unchecked call would lose settings silently.
     * @param {Object} data - Full preset wrapper {presets, activePreset}.
     * @returns {boolean} True when the file was written completely.
     */
    save: function (data) {
        try {
            var f = this.getFile();
            f.encoding = "UTF-8";
            if (!f.open("w")) {
                ZSM.Utils.log("Storage.save: open(w) failed for " + f.fsName);
                return false;
            }
            var wrote  = f.write(JSON.stringify(data));
            var closed = f.close();
            if (!wrote || !closed) {
                ZSM.Utils.log("Storage.save: write/close failed for " + f.fsName);
                return false;
            }
            return true;
        } catch (e) {
            ZSM.Utils.log("Storage.save failed: " + e.message);
            return false;
        }
    },

    /**
     * Loads settings from disk and runs format migrations.
     * Migration chain: v26.0 flat → v26.3 layers[] → v26.3 presets wrapper → v27 layers without active
     * Returns null on failure; caller falls back to getDefaults().
     * @returns {Object|null} Full preset wrapper or null.
     */
    load: function () {
        var f = this.getFile();
        // FILENAME MIGRATION: v26.x used settings_v26_3.json. If the new
        // canonical file doesn't exist but the legacy one does, read from
        // legacy (will be re-saved to new path on next save()).
        if (!f.exists) {
            var legacy = this.getLegacyFile();
            if (legacy.exists) f = legacy;
            else return null;
        }
        try {
            f.encoding = "UTF-8";
            f.open("r");
            var content = f.read();
            f.close();
            if (!content) return null;

            var data = JSON.parse(content);

            // MIGRATION 1: v26.0 flat thru/kiss → v26.3 layers[]
            if (data.thruActive !== undefined && data.layers === undefined) {
                data.layers = [
                    { active: data.thruActive,        name: data.thruName || "Cut",      color: "[Registration]" },
                    { active: data.kissActive || false, name: data.kissName || "Kiss-cut", color: "[Registration]" }
                ];
                delete data.thruActive; delete data.thruName;
                delete data.kissActive; delete data.kissName;
            }

            // MIGRATION 2: flat settings object → preset wrapper
            if (!data.presets) {
                var flatData = data;
                var defPreset = ZSM.Config.getDefaults();

                // Merge flat data onto defaults to fill any missing keys
                var migratedPreset = {};
                for (var key in defPreset) {
                    if (defPreset.hasOwnProperty(key)) {
                        migratedPreset[key] = flatData.hasOwnProperty(key) ? flatData[key] : defPreset[key];
                    }
                }

                data = {
                    activePreset: "[Last Settings]",
                    presets: {}
                };
                data.presets[ZSM.Config.PRESET_KEY_DEFAULT] = defPreset;
                data.presets["[Last Settings]"]     = migratedPreset;
            }

            // MIGRATION 3: v26.3 layers {active, name, color} → v27 {name, color}
            // Remove inactive rows (active:false = user had them disabled)
            // and strip the `active` property from remaining rows.
            if (data.presets) {
                for (var pKey in data.presets) {
                    if (!data.presets.hasOwnProperty(pKey)) continue;
                    var preset = data.presets[pKey];
                    if (preset.layers && preset.layers.length > 0) {
                        var migrated = [];
                        for (var li = 0; li < preset.layers.length; li++) {
                            var row = preset.layers[li];
                            // Keep only rows that were active (or have no active property = new format)
                            if (row.active === false) continue;
                            migrated.push({ name: row.name || "", color: row.color || "" });
                        }
                        // Ensure at least one row after migration
                        if (migrated.length === 0) {
                            migrated.push({ name: "Cut", color: "[Registration]" });
                        }
                        preset.layers = migrated;
                    }
                }
            }

            // MIGRATION 4: locale-independent default preset key (W4)
            // Older versions stored the default preset under a localized key
            // (e.g. "[Výchozí]" in Czech, possibly other locales). Detect any
            // bracketed key that looks like a sentinel ("[<text>]") and is NOT
            // the canonical "[Default]" / "[Last Settings]", and rename it to
            // "[Default]" if no canonical default exists.
            // Pattern-based (instead of a hardcoded whitelist) so future
            // localizations migrate automatically without a code change.
            if (data.presets && !data.presets[ZSM.Config.PRESET_KEY_DEFAULT]) {
                var SENTINEL_RE = /^\[.+\]$/;
                var KNOWN_RESERVED = { "[Last Settings]": true };
                for (var sKey in data.presets) {
                    if (!data.presets.hasOwnProperty(sKey)) continue;
                    if (KNOWN_RESERVED[sKey]) continue;
                    if (!SENTINEL_RE.test(sKey)) continue;
                    // First bracketed non-reserved key wins as the localized default
                    data.presets[ZSM.Config.PRESET_KEY_DEFAULT] = data.presets[sKey];
                    delete data.presets[sKey];
                    if (data.activePreset === sKey) {
                        data.activePreset = ZSM.Config.PRESET_KEY_DEFAULT;
                    }
                    break;
                }
            }

            // Forward-fill: add any new default keys missing from all presets
            var defKeys = ZSM.Config.getDefaults();
            for (var pKey2 in data.presets) {
                if (!data.presets.hasOwnProperty(pKey2)) continue;
                var preset2 = data.presets[pKey2];
                for (var k in defKeys) {
                    if (defKeys.hasOwnProperty(k) && typeof preset2[k] === "undefined") {
                        preset2[k] = defKeys[k];
                    }
                }
            }

            return data;
        } catch (e) {
            ZSM.Utils.log("Storage.load failed: " + e.message);
            return null;
        }
    }
};
