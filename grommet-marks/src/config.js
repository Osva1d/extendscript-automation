// ------------------------------------------------------------------------
// Configuration & Persistence
// ------------------------------------------------------------------------
GM.Config = {
    /**
     * Creates an edge definition (per-edge settings).
     * @param {boolean} enabled - Edge active
     * @param {boolean} useNum - True = fixed count, False = preferred spacing
     * @param {number} num - Number of marks
     * @param {number} spacing - Preferred spacing between mark centers
     * @returns {Object} Edge definition
     */
    createEdgeDef: function (enabled, useNum, num, spacing) {
        return {
            enabled: enabled,
            useNumber: useNum,
            number: num,
            spacing: spacing
        };
    },

    getDefaults: function () {
        var c = GM.Config.createEdgeDef;
        var S = GM.CONSTANTS.SENTINEL_CREATE;
        return {
            offsetX: 7,
            offsetY: 7,
            top: c(true, true, 10, 105),
            left: c(true, true, 10, 105),
            bottom: c(false, true, 10, 105),
            right: c(false, true, 10, 105),
            bottomMirror: true,
            rightMirror: true,
            units: GM.CONSTANTS.UNIT.MM,
            markSize: 3,
            isRound: true,
            markLayerName: S,
            fillEnabled: true,
            fillSwatchName: S,
            fillOverprint: true,
            strokeEnabled: false,
            strokeSwatchName: S,
            strokeOverprint: true,
            strokeWeight: 1
        };
    },

    getSettingsFile: function () {
        var folder = Folder(Folder.userData + "/GrommetMarks");
        if (!folder.exists) folder.create();
        return File(folder + "/" + GM.CONSTANTS.SETTINGS_FILE_NAME);
    },

    /**
     * Migrates older settings formats to current version.
     * - v2.x had per-edge x/y offsets -> v3 uses global offsetX/offsetY
     * - v3.0 used localized unit names -> v3.1 uses internal keys (mm/cm/in)
     * - v3.0 used localized sentinel strings -> v3.1 uses __create__/__default__
     */
    migrate: function (preset) {
        // v2 -> v3: per-edge x/y to global offsets
        if (typeof preset.offsetX === "undefined") {
            var topX = (preset.top && typeof preset.top.x !== "undefined") ? preset.top.x : 7;
            var topY = (preset.top && typeof preset.top.y !== "undefined") ? preset.top.y : 7;
            preset.offsetX = topX;
            preset.offsetY = topY;
        }

        // Strip legacy per-edge x/y fields
        var edges = ["top", "left", "bottom", "right"];
        for (var i = 0; i < edges.length; i++) {
            var e = preset[edges[i]];
            if (e) {
                delete e.x;
                delete e.y;
            }
        }

        // Ensure mirror flags exist
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

        // v3.0 -> v3.1: localized sentinel strings to internal keys
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
     * Migrates preset keys (names) from localized to internal sentinels.
     * @param {Object} allSettings - All presets keyed by name
     * @returns {Object} Migrated settings
     */
    migrateKeys: function (allSettings) {
        var legacyDefaults = ["[Výchozí]", "[Default]"];
        for (var i = 0; i < legacyDefaults.length; i++) {
            var old = legacyDefaults[i];
            if (allSettings[old] && !allSettings[GM.CONSTANTS.SENTINEL_DEFAULT]) {
                allSettings[GM.CONSTANTS.SENTINEL_DEFAULT] = allSettings[old];
                delete allSettings[old];
            }
        }
        return allSettings;
    },

    load: function () {
        var defaults = {};
        defaults[GM.CONSTANTS.SENTINEL_DEFAULT] = GM.Config.getDefaults();

        try {
            var file = GM.Config.getSettingsFile();
            if (!file.exists) return defaults;

            file.encoding = "UTF-8";
            file.open("r");
            var content = file.read();
            file.close();

            var parsed = JSON.parse(content);

            // Migrate preset keys first
            parsed = GM.Config.migrateKeys(parsed);

            // Ensure default preset exists
            if (!parsed[GM.CONSTANTS.SENTINEL_DEFAULT]) {
                parsed[GM.CONSTANTS.SENTINEL_DEFAULT] = GM.Config.getDefaults();
            }

            // Migrate each preset's values and forward-fill new default keys
            var dflt = GM.Config.getDefaults();
            for (var k in parsed) {
                if (parsed.hasOwnProperty(k)) {
                    parsed[k] = GM.Config.migrate(parsed[k]);
                    for (var dk in dflt) {
                        if (dflt.hasOwnProperty(dk) && typeof parsed[k][dk] === "undefined") {
                            parsed[k][dk] = dflt[dk];
                        }
                    }
                }
            }
            return parsed;
        } catch (e) {
            return defaults;
        }
    },

    save: function (allSettings) {
        try {
            var file = GM.Config.getSettingsFile();
            file.encoding = "UTF-8";
            file.open("w");
            file.write(JSON.stringify(allSettings));
            file.close();
        } catch (e) {
            alert(GM.CONSTANTS.SCRIPT_NAME + ": " + GM.L.ERR_WRITE_SETTINGS);
        }
    }
};
