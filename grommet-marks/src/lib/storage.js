// ------------------------------------------------------------------------
// Module: GM.Storage — settings persistence + migrations
// Part of: Illustrator Grommet Marks
//
// Responsible for reading/writing the JSON settings file and migrating
// older formats forward. Pure I/O + data transformation; no DOM, no UI.
//
// Depends on: GM.Utils (logging), GM.Config (getDefaults, PRESET_KEY_DEFAULT)
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Storage = {
    PRESET_KEY_LAST: "[Last Settings]",

    /**
     * Returns the settings File object, creating the folder if needed.
     * @returns {File} JSON settings file.
     */
    getFile: function () {
        var folder = new Folder(Folder.userData + "/GrommetMarks");
        if (!folder.exists) folder.create();
        return new File(folder.fsName + "/" + GM.CONSTANTS.SETTINGS_FILE_NAME);
    },

    /**
     * Serializes and saves the full preset wrapper to disk.
     * @param {Object} data - Full preset wrapper {activePreset, presets}.
     */
    save: function (data) {
        try {
            var f = GM.Storage.getFile();
            f.encoding = "UTF-8";
            if (!f.open("w")) {
                GM.Utils.error(GM.L.ERR_WRITE_SETTINGS);
                return;
            }
            f.write(JSON.stringify(data));
            f.close();
        } catch (e) {
            GM.Utils.log("Storage.save failed: " + e.message);
        }
    },

    /**
     * Migrates a single preset's values from older formats.
     * - v2.x per-edge x/y offsets -> v3 global offsetX/offsetY
     * - v3.0 localized unit names -> v3.1 internal keys (mm/cm/in)
     * - v3.0 localized sentinel strings -> internal __create__
     * @param {Object} preset - Single preset object (mutated).
     * @returns {Object} Migrated preset.
     */
    migratePreset: function (preset) {
        // v2 -> v3: per-edge x/y to global offsets
        if (typeof preset.offsetX === "undefined") {
            var topX = (preset.top && typeof preset.top.x !== "undefined") ? preset.top.x : 7;
            var topY = (preset.top && typeof preset.top.y !== "undefined") ? preset.top.y : 7;
            preset.offsetX = topX;
            preset.offsetY = topY;
        }

        var edges = ["top", "left", "bottom", "right"];
        for (var i = 0; i < edges.length; i++) {
            var e = preset[edges[i]];
            if (e) { delete e.x; delete e.y; }
        }

        if (typeof preset.bottomMirror === "undefined") preset.bottomMirror = true;
        if (typeof preset.rightMirror === "undefined") preset.rightMirror = true;

        // v3.0 -> v3.1: localized unit names to internal keys
        var unitMap = {
            "Milimetry": "mm", "Centimetry": "cm", "Palce": "in",
            "Millimeters": "mm", "Centimeters": "cm", "Inches": "in"
        };
        if (preset.units && unitMap[preset.units]) {
            preset.units = unitMap[preset.units];
        }

        // v3.0 -> v3.1: localized sentinel strings to __create__
        var legacySentinels = [
            "[Vytvořit 'Grommet Marks']",
            "[Create 'Grommet Marks']"
        ];
        var sentinelFields = ["markLayerName", "fillSwatchName", "strokeSwatchName"];
        for (var j = 0; j < sentinelFields.length; j++) {
            var field = sentinelFields[j];
            if (preset[field]) {
                for (var k = 0; k < legacySentinels.length; k++) {
                    if (preset[field] === legacySentinels[k]) {
                        preset[field] = GM.CONSTANTS.SENTINEL_CREATE;
                        break;
                    }
                }
            }
        }

        return preset;
    },

    /**
     * Loads settings from disk and runs format migrations.
     * Migration chain:
     *   1. Flat {presetName: settings} -> wrapper {activePreset, presets}
     *   2. __default__ -> [Default] key rename
     *   3. Per-preset value migrations (v2->v3, v3.0->v3.1)
     *   4. Forward-fill new default keys
     * Returns null on failure; caller falls back to getDefaults().
     * @returns {Object|null} Full preset wrapper or null.
     */
    load: function () {
        var f = GM.Storage.getFile();
        if (!f.exists) return null;

        try {
            f.encoding = "UTF-8";
            f.open("r");
            var content = f.read();
            f.close();
            if (!content) return null;

            var data = JSON.parse(content);
            var DEF = GM.Config.PRESET_KEY_DEFAULT;

            // MIGRATION 1: flat -> wrapper
            if (!data.presets) {
                var flat = data;
                var wrapper = { activePreset: DEF, presets: {} };

                for (var fk in flat) {
                    if (flat.hasOwnProperty(fk)) {
                        wrapper.presets[fk] = flat[fk];
                    }
                }
                data = wrapper;
            }

            // MIGRATION 2: __default__ -> [Default]
            if (data.presets["__default__"] && !data.presets[DEF]) {
                data.presets[DEF] = data.presets["__default__"];
                delete data.presets["__default__"];
            }
            if (data.activePreset === "__default__") {
                data.activePreset = DEF;
            }

            // Also migrate old localized default keys
            var legacyDefaults = ["[Výchozí]"];
            for (var ld = 0; ld < legacyDefaults.length; ld++) {
                var oldKey = legacyDefaults[ld];
                if (data.presets[oldKey] && !data.presets[DEF]) {
                    data.presets[DEF] = data.presets[oldKey];
                    delete data.presets[oldKey];
                    if (data.activePreset === oldKey) data.activePreset = DEF;
                }
            }

            // Ensure [Default] exists
            if (!data.presets[DEF]) {
                data.presets[DEF] = GM.Config.getDefaults();
            }

            // Ensure activePreset is valid
            if (!data.presets[data.activePreset]) {
                data.activePreset = DEF;
            }

            // MIGRATION 3: per-preset value migrations + forward-fill
            var dflt = GM.Config.getDefaults();
            for (var pk in data.presets) {
                if (!data.presets.hasOwnProperty(pk)) continue;
                data.presets[pk] = GM.Storage.migratePreset(data.presets[pk]);
                for (var dk in dflt) {
                    if (dflt.hasOwnProperty(dk) && typeof data.presets[pk][dk] === "undefined") {
                        data.presets[pk][dk] = dflt[dk];
                    }
                }
            }

            return data;
        } catch (e) {
            GM.Utils.log("Storage.load failed: " + e.message);
            return null;
        }
    }
};
