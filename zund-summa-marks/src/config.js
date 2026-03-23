var ZSM = ZSM || {};

ZSM.Config = {
    scriptName: "Zund & Summa Marks",
    zundSize:    5,   // mm, default Zünd mark diameter
    summaSize:   3,   // mm, default Summa mark side
    orientDist:  100, // mm, orientation mark offset from corner

    summaXCenter: 10,  // mm: distance from graphic edge to Summa mark center (X)
    summaYVisual: 10,  // mm: gap from graphic edge to Summa mark outer edge (Y)
    redLineWidth: 1,   // pt: stroke width for trim lines
    rulerBuffer:  0.1,
    debug: false,

    // System layer names — not localized (must match document layer names exactly)
    layerRegmarks: "Regmarks",
    layerGraphics: "Graphics",
    PRESET_KEY_DEFAULT: "[Default]",

    ui: {
        title: "Zünd & Summa Marks v26.3.1"
    },

    /**
     * Returns a fresh default settings object.
     * Used when no saved settings exist or as preset baseline.
     * layers[] uses {name, color} format — row existence implies active.
     * @returns {Object} Default settings.
     */
    getDefaults: function () {
        return {
            mode:             "ZUND",
            gapInner:         5,
            gapOuter:         0,
            maxDist:          500,
            feedTop:          70,
            feedBottom:       50,
            drawRed:          true,
            useArtboardBounds: false,
            markSizeZ:        5,
            markSizeS:        3,
            markColor:        "[Registration]",
            layers: [
                { name: "Cut", color: "[Registration]" }
            ]
        };
    },

    Storage: {
        /**
         * Returns the settings File object, creating the folder if needed.
         * @returns {File} JSON settings file.
         */
        getFile: function () {
            var folder = new Folder(Folder.userData + "/ZSM");
            if (!folder.exists) folder.create();
            return new File(folder.fsName + "/settings_v26_3.json");
        },

        /**
         * Serializes and saves the full preset wrapper to disk.
         * @param {Object} data - Full preset wrapper {presets, activePreset}.
         */
        save: function (data) {
            try {
                var f = this.getFile();
                f.encoding = "UTF-8";
                if (!f.open("w")) {
                    ZSM.Utils.error(ZSM.L.ERR_WRITE_SETTINGS);
                    return;
                }
                f.write(JSON.stringify(data));
                f.close();
            } catch (e) {
                ZSM.Utils.log("Storage.save failed: " + e.message);
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
            if (!f.exists) return null;
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
                // (e.g. "[Výchozí]" in Czech). Rename to the fixed key "[Default]".
                if (data.presets) {
                    var knownLocalized = ["[Výchozí]"];
                    for (var ld = 0; ld < knownLocalized.length; ld++) {
                        var localKey = knownLocalized[ld];
                        if (data.presets[localKey] && !data.presets[ZSM.Config.PRESET_KEY_DEFAULT]) {
                            data.presets[ZSM.Config.PRESET_KEY_DEFAULT] = data.presets[localKey];
                            delete data.presets[localKey];
                            if (data.activePreset === localKey) {
                                data.activePreset = ZSM.Config.PRESET_KEY_DEFAULT;
                            }
                        }
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
    }
};
