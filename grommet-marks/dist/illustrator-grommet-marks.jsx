#target illustrator
/*
 * ===========================================================================
 * Script:      Illustrator Grommet Marks
 * Version:     3.1.0
 * Author:      Osva1d
 * Updated:     2026-03-23
 *
 * Description:
 *   Grommet mark generator for banner production.
 * ===========================================================================
 */

(function () {

// ------------------------------------------------------------------------
// JSON Polyfill (Douglas Crockford's json2.js - Minified Logic)
// NOTE: The eval() call inside JSON.parse below is SAFE — it executes
// only AFTER the input string passes strict regex validation that
// rejects anything other than valid JSON tokens.
// ------------------------------------------------------------------------
if (typeof JSON !== 'object') { JSON = {}; }
(function () {
    var rx_one = /^[\],:{}\s]*$/,
        rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,
        rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
        rx_four = /(?:^|:|,)(?:\s*\[)+/g,
        rx_escapable = /[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

    function f(n) { return n < 10 ? '0' + n : n; }
    function this_value() { return this.valueOf(); }
    if (typeof Date.prototype.toJSON !== 'function') {
        Date.prototype.toJSON = function () {
            return isFinite(this.valueOf())
                ? this.getUTCFullYear() + '-' + f(this.getUTCMonth() + 1) + '-' + f(this.getUTCDate()) + 'T' +
                f(this.getUTCHours()) + ':' + f(this.getUTCMinutes()) + ':' + f(this.getUTCSeconds()) + 'Z'
                : null;
        };
        Boolean.prototype.toJSON = this_value;
        Number.prototype.toJSON = this_value;
        String.prototype.toJSON = this_value;
    }

    var gap, indent, meta, rep;

    function quote(string) {
        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string) ? '"' + string.replace(rx_escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }

    function str(key, holder) {
        var i, k, v, length, mind = gap, partial, value = holder[key];
        if (value && typeof value === 'object' && typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }
        if (typeof rep === 'function') { value = rep.call(holder, key, value); }
        switch (typeof value) {
            case 'string': return quote(value);
            case 'number': return isFinite(value) ? String(value) : 'null';
            case 'boolean':
            case 'null': return String(value);
            case 'object':
                if (!value) { return 'null'; }
                gap += indent;
                partial = [];
                if (Object.prototype.toString.apply(value) === '[object Array]') {
                    length = value.length;
                    for (i = 0; i < length; i += 1) {
                        partial[i] = str(i, value) || 'null';
                    }
                    v = partial.length === 0 ? '[]' : gap ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' : '[' + partial.join(',') + ']';
                    gap = mind;
                    return v;
                }
                if (rep && typeof rep === 'object') {
                    length = rep.length;
                    for (i = 0; i < length; i += 1) {
                        if (typeof rep[i] === 'string') {
                            k = rep[i];
                            v = str(k, value);
                            if (v) { partial.push(quote(k) + (gap ? ': ' : ':') + v); }
                        }
                    }
                } else {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = str(k, value);
                            if (v) { partial.push(quote(k) + (gap ? ': ' : ':') + v); }
                        }
                    }
                }
                v = partial.length === 0 ? '{}' : gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' : '{' + partial.join(',') + '}';
                gap = mind;
                return v;
        }
    }

    if (typeof JSON.stringify !== 'function') {
        meta = { '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"': '\\"', '\\': '\\\\' };
        JSON.stringify = function (value, replacer, space) {
            var i; gap = ''; indent = '';
            if (typeof space === 'number') { for (i = 0; i < space; i += 1) { indent += ' '; } }
            else if (typeof space === 'string') { indent = space; }
            rep = replacer;
            if (replacer && typeof replacer !== 'function' && (typeof replacer !== 'object' || typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }
            return str('', { '': value });
        };
    }
    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {
            var j;
            function walk(holder, key) {
                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) { value[k] = v; } else { delete value[k]; }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }
            text = String(text);
            rx_dangerous.lastIndex = 0;
            if (rx_dangerous.test(text)) {
                text = text.replace(rx_dangerous, function (a) {
                    return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }
            if (rx_one.test(text.replace(rx_two, '@').replace(rx_three, ']').replace(rx_four, ''))) {
                j = eval('(' + text + ')');
                return typeof reviver === 'function' ? walk({ '': j }, '') : j;
            }
            throw new SyntaxError('JSON.parse');
        };
    }
}());

var GM = {};

// ------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------
GM.CONSTANTS = {
    SCRIPT_NAME: "Illustrator Grommet Marks",
    VERSION: "3.1.0",
    SETTINGS_FILE_NAME: "GrommetMarksSettings.json",

    // Functional identifiers (not displayed in UI)
    LAYER_NAME: "Grommet Marks",
    SWATCH_NAME: "Grommet Marks",

    // Internal sentinel values — never displayed, used in logic only
    SENTINEL_CREATE: "__create__",
    SENTINEL_DEFAULT: "__default__",

    // Unit system — internal keys, display names live in locale
    UNIT: { MM: "mm", CM: "cm", IN: "in" },
    UNIT_KEYS: ["mm", "cm", "in"],
    UNIT_FACTORS: {
        "mm": 2.834645669291339,
        "cm": 28.34645669291339,
        "in": 72
    }
};

// ------------------------------------------------------------------------
// Localization
// ------------------------------------------------------------------------
GM.L = (function () {
    // Detect Illustrator UI language
    var lang = "en";
    try {
        if (app.locale) lang = app.locale.substring(0, 2).toLowerCase();
    } catch (e) {}

    var strings = {
        en: {
            // Sentinel display strings
            CREATE_LABEL: "[Create 'Grommet Marks']",
            DEFAULT_PRESET: "[Default]",

            // Units
            UNIT_MM: "Millimeters",
            UNIT_CM: "Centimeters",
            UNIT_IN: "Inches",

            // Position panel
            POSITION_PANEL: "Mark position",
            OFFSET_X: "Offset X:",
            OFFSET_Y: "Offset Y:",

            // Edge labels
            TOP: "Top",
            LEFT: "Left",
            BOTTOM_MIRROR: "Mirror top",
            BOTTOM_CUSTOM: "Bottom — custom",
            RIGHT_MIRROR: "Mirror left",
            RIGHT_CUSTOM: "Right — custom",

            // Edge fields
            COUNT: "Count:",
            SPACING: "Spacing:",

            // Mark panel
            MARK_PANEL: "Mark",
            UNIT_LABEL: "Units:",
            SIZE_LABEL: "Size:",
            SHAPE_LABEL: "Shape:",
            ROUND: "Round",
            SQUARE: "Square",

            // Appearance panel
            APPEARANCE_PANEL: "Appearance",
            LAYER: "Layer:",
            FILL: "Fill:",
            STROKE: "Stroke:",
            OVERPRINT: "Overprint",
            WEIGHT: "Weight:",
            POINTS: "pt",

            // Settings panel
            SETTINGS_PANEL: "Presets",
            LOAD: "Load:",
            DELETE: "Delete",
            SAVE: "Save",
            SAVE_TITLE: "Save preset",
            PRESET_NAME: "Name:",
            REPLACE_EXISTING: "Replace existing:",

            // Buttons
            OK: "Generate",
            CANCEL: "Cancel",

            // Tooltips
            TIP_OFFSET_X: "Distance of mark centers from left and right artboard edges",
            TIP_OFFSET_Y: "Distance of mark centers from top and bottom artboard edges",
            TIP_COUNT: "Fixed number of marks per edge (spacing is calculated)",
            TIP_SPACING: "Preferred distance between mark centers (count is calculated)",
            TIP_MIRROR_BOTTOM: "Use same settings as top edge",
            TIP_MIRROR_RIGHT: "Use same settings as left edge",
            TIP_OVERPRINT: "Mark will print over other colors (overprint)",
            TIP_SIZE: "Circle diameter or square side length in selected units",
            TIP_FILL: "Mark fill color",
            TIP_STROKE: "Mark stroke color",
            TIP_LAYER: "Target layer for mark placement",
            TIP_WEIGHT: "Stroke weight in points",
            TIP_EDGE_ENABLE: "Enable/disable mark placement on this edge",
            TIP_SHAPE_ROUND: "Marks will be circular",
            TIP_SHAPE_SQUARE: "Marks will be square",
            TIP_PRESET_LOAD: "Select saved preset",

            // Errors
            ERR_NO_DOC: "Open a document before running the script.",
            ERR_NO_EDGE: "At least one edge must be enabled.",
            ERR_NO_APPEARANCE: "Marks must have fill and/or stroke.",
            ERR_MARK_SIZE: "Mark size must be a positive number.",
            ERR_NEGATIVE_OFFSET: "Offset X and Y must not be negative.",
            ERR_INVALID_OFFSET: "Offset X and Y must be valid non-negative numbers.",
            ERR_INVALID_WEIGHT: "Stroke weight must be a positive number.",
            ERR_EDGE_COUNT: "Mark count must be a whole number ≥ 1.",
            ERR_EDGE_SPACING: "Mark spacing must be a positive number.",
            ERR_UNEXPECTED: "Unexpected error",
            ERR_WRITE_SETTINGS: "Cannot write settings file.",
            ERR_LAYER_NOT_FOUND: "Layer \"%s\" not found.",
            ERR_SWATCH_NOT_FOUND: "Swatch \"%s\" not found.",
            ERR_CANNOT_DELETE_DEFAULT: "Default preset cannot be deleted.",
            ERR_ENTER_NAME: "Enter a name.",

            // Confirmations
            CONFIRM_DELETE_PRESET: "Permanently delete preset \"%s\"?",
            CONFIRM_OVERWRITE_PRESET: "Preset \"%s\" already exists. Replace?"
        },

        cs: {
            // Sentinel display strings
            CREATE_LABEL: "[Vytvořit 'Grommet Marks']",
            DEFAULT_PRESET: "[Výchozí]",

            // Units
            UNIT_MM: "Milimetry",
            UNIT_CM: "Centimetry",
            UNIT_IN: "Palce",

            // Position panel
            POSITION_PANEL: "Pozice značek",
            OFFSET_X: "Odsazení X:",
            OFFSET_Y: "Odsazení Y:",

            // Edge labels
            TOP: "Horní",
            LEFT: "Levá",
            BOTTOM_MIRROR: "Zrcadlit horní",
            BOTTOM_CUSTOM: "Dolní — vlastní",
            RIGHT_MIRROR: "Zrcadlit levou",
            RIGHT_CUSTOM: "Pravá — vlastní",

            // Edge fields
            COUNT: "Počet ok:",
            SPACING: "Rozestup:",

            // Mark panel
            MARK_PANEL: "Značka",
            UNIT_LABEL: "Měrné jednotky:",
            SIZE_LABEL: "Velikost:",
            SHAPE_LABEL: "Tvar:",
            ROUND: "Kruh",
            SQUARE: "Čtverec",

            // Appearance panel
            APPEARANCE_PANEL: "Vzhled",
            LAYER: "Vrstva:",
            FILL: "Výplň:",
            STROKE: "Obrys:",
            OVERPRINT: "Přetisk",
            WEIGHT: "Tloušťka:",
            POINTS: "pt",

            // Settings panel
            SETTINGS_PANEL: "Předvolby",
            LOAD: "Načíst:",
            DELETE: "Smazat",
            SAVE: "Uložit",
            SAVE_TITLE: "Uložit nastavení",
            PRESET_NAME: "Název:",
            REPLACE_EXISTING: "Nahradit existující:",

            // Buttons
            OK: "Generovat",
            CANCEL: "Storno",

            // Tooltips
            TIP_OFFSET_X: "Vzdálenost středu značek od levého a pravého okraje artboardu",
            TIP_OFFSET_Y: "Vzdálenost středu značek od horního a dolního okraje artboardu",
            TIP_COUNT: "Pevný počet značek na hraně (rozestup se dopočítá)",
            TIP_SPACING: "Preferovaná vzdálenost mezi středy značek (počet se dopočítá)",
            TIP_MIRROR_BOTTOM: "Použije stejné nastavení jako horní strana",
            TIP_MIRROR_RIGHT: "Použije stejné nastavení jako levá strana",
            TIP_OVERPRINT: "Značka bude tištěna přes ostatní barvy (overprint)",
            TIP_SIZE: "Průměr kruhu nebo délka strany čtverce v měrných jednotkách",
            TIP_FILL: "Barevná výplň značky",
            TIP_STROKE: "Obrysová linka značky",
            TIP_LAYER: "Cílová vrstva pro umístění značek",
            TIP_WEIGHT: "Tloušťka obrysové linky v bodech (points)",
            TIP_EDGE_ENABLE: "Zapne/vypne umístění značek na tuto hranu",
            TIP_SHAPE_ROUND: "Značka bude kruhová",
            TIP_SHAPE_SQUARE: "Značka bude čtvercová",
            TIP_PRESET_LOAD: "Vyberte uložené nastavení",

            // Errors
            ERR_NO_DOC: "Před spuštěním skriptu otevřete dokument.",
            ERR_NO_EDGE: "Musí být zapnutá alespoň jedna hrana.",
            ERR_NO_APPEARANCE: "Značky musí mít výplň a/nebo obrys.",
            ERR_MARK_SIZE: "Velikost značky musí být kladné číslo.",
            ERR_NEGATIVE_OFFSET: "Odsazení X a Y nesmí být záporné.",
            ERR_INVALID_OFFSET: "Odsazení X a Y: zadejte platné nezáporné číslo.",
            ERR_INVALID_WEIGHT: "Tloušťka obrysu musí být kladné číslo.",
            ERR_EDGE_COUNT: "Počet značek musí být celé číslo ≥ 1.",
            ERR_EDGE_SPACING: "Rozestup značek musí být kladné číslo.",
            ERR_UNEXPECTED: "Neočekávaná chyba",
            ERR_WRITE_SETTINGS: "Nelze zapsat soubor s nastavením.",
            ERR_LAYER_NOT_FOUND: "Vrstva \"%s\" nenalezena.",
            ERR_SWATCH_NOT_FOUND: "Vzorník \"%s\" nenalezen.",
            ERR_CANNOT_DELETE_DEFAULT: "Výchozí nastavení nelze smazat.",
            ERR_ENTER_NAME: "Zadejte název.",

            // Confirmations
            CONFIRM_DELETE_PRESET: "Trvale smazat nastavení \"%s\"?",
            CONFIRM_OVERWRITE_PRESET: "Nastavení \"%s\" již existuje. Nahradit?"
        }
    };

    var active = strings[lang] || strings["en"];

    // Simple string formatter: GM.L.format(GM.L.ERR_LAYER_NOT_FOUND, layerName)
    active.format = function (template) {
        var args = [];
        for (var i = 1; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        var idx = 0;
        return template.replace(/%s/g, function () {
            return idx < args.length ? args[idx++] : "%s";
        });
    };

    return active;
})();

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

// ------------------------------------------------------------------------
// Core Logic (Geometry & Math)
// ------------------------------------------------------------------------
GM.Core = {
    /**
     * Converts a value between units.
     * @param {number} val - Value to convert
     * @param {string} fromUnit - Source unit name
     * @param {string} toUnit - Target unit name
     * @returns {number} Converted value
     */
    convertVal: function (val, fromUnit, toUnit) {
        if (fromUnit === toUnit) return val;
        return (val * GM.CONSTANTS.UNIT_FACTORS[fromUnit]) / GM.CONSTANTS.UNIT_FACTORS[toUnit];
    },

    /**
     * Rounds value to 6 decimal places to avoid float errors.
     * @param {number} val
     * @returns {number}
     */
    round: function (val) {
        return Math.round(val * 1000000) / 1000000;
    },

    /**
     * Calculates positions of marks along an edge.
     * All positions are measured from the start of the edge (center-to-center).
     *
     * @param {Object} edgeCfg - Edge config { useNumber, number, spacing }
     * @param {number} span - Total edge length in points
     * @param {number} offset - Global offset from both ends in user units (X or Y)
     * @param {number} unitFactor - Conversion factor (user units → points)
     * @returns {Array<number>} Array of positions in points from edge start
     */
    calcPositions: function (edgeCfg, span, offset, unitFactor) {
        // Validation
        var num = Math.max(edgeCfg.number || 1, 1);
        var spacing = Math.max(edgeCfg.spacing || 0, 0);

        var startOff = offset * unitFactor;
        var endOff = startOff; // Symmetric — same offset on both ends
        var available = span - startOff - endOff;

        if (available < 0) available = 0;

        var count, spc;

        if (edgeCfg.useNumber) {
            count = num;
            spc = count > 1 ? available / (count - 1) : 0;
        } else {
            var preferred = spacing * unitFactor;
            if (preferred <= 0) {
                count = 1;
                spc = 0;
            } else {
                var raw = (available / preferred) + 1;
                var floor = Math.max(Math.floor(raw), 1);
                var ceil = Math.max(Math.ceil(raw), 1);
                var sFloor = floor > 1 ? available / (floor - 1) : 0;
                var sCeil = ceil > 1 ? available / (ceil - 1) : 0;

                if (floor <= 1) {
                    count = ceil;
                    spc = sCeil;
                } else if (Math.abs(sFloor - preferred) <= Math.abs(sCeil - preferred)) {
                    count = floor;
                    spc = sFloor;
                } else {
                    count = ceil;
                    spc = sCeil;
                }
                // Safety cap — prevent freeze from very small spacing values
                if (count > 9999) { count = 9999; spc = count > 1 ? available / (count - 1) : 0; }
            }
        }

        var positions = [];
        for (var i = 0; i < count; i++) {
            positions.push(startOff + i * spc);
        }
        return positions;
    }
};

// ------------------------------------------------------------------------
// Illustrator DOM Adapter
// ------------------------------------------------------------------------
GM.Illustrator = {
    doc: null,

    /**
     * Initializes the module by getting active document.
     * @returns {boolean} True if document exists.
     */
    init: function () {
        if (app.documents.length === 0) {
            return false;
        }
        GM.Illustrator.doc = app.activeDocument;
        return true;
    },

    /**
     * Checks if swatch name is a system swatch (e.g. [None], [Registration]).
     * Works across all AI localizations by detecting the bracket pattern.
     * @param {string} name - Swatch name
     * @returns {boolean} True if system swatch
     */
    isSystemSwatch: function (name) {
        return name.charAt(0) === "[" && name.charAt(name.length - 1) === "]";
    },

    getLayerNames: function () {
        var names = [GM.L.CREATE_LABEL];
        var has = false;
        var layers = GM.Illustrator.doc.layers;
        for (var i = 0; i < layers.length; i++) {
            try {
                var n = layers[i].name;
                names.push(n);
                if (n === GM.CONSTANTS.LAYER_NAME) has = true;
            } catch (e) {}
        }
        return { names: names, has: has };
    },

    getSwatchNames: function () {
        var names = [GM.L.CREATE_LABEL];
        var has = false;
        var swatches = GM.Illustrator.doc.swatches;
        for (var i = 0; i < swatches.length; i++) {
            try {
                var n = swatches[i].name;
                // Skip system swatches: [None]/[Zadna], [Registration]/[Registracni], etc.
                if (GM.Illustrator.isSystemSwatch(n)) continue;
                names.push(n);
                if (n === GM.CONSTANTS.SWATCH_NAME) has = true;
            } catch (e) {}
        }
        return { names: names, has: has };
    },

    /**
     * Resolves layer by name or creates the default "Grommet Marks" layer.
     * @param {string} layerName - Layer name or SENTINEL_CREATE
     * @returns {Layer|null} Target layer or null on failure
     */
    getOrCreateLayer: function (layerName) {
        var doc = GM.Illustrator.doc;
        if (layerName === GM.CONSTANTS.SENTINEL_CREATE) {
            try {
                return doc.layers.getByName(GM.CONSTANTS.LAYER_NAME);
            } catch (e) {
                var l = doc.layers.add();
                l.name = GM.CONSTANTS.LAYER_NAME;
                return l;
            }
        } else {
            try {
                return doc.layers.getByName(layerName);
            } catch (e) {
                return null;
            }
        }
    },

    /**
     * Resolves swatch by name or creates the default "Grommet Marks" spot color.
     * @param {string} swatchName - Swatch name or SENTINEL_CREATE
     * @returns {Color|null} Swatch color or null on failure
     */
    getOrCreateSwatch: function (swatchName) {
        var doc = GM.Illustrator.doc;
        if (swatchName === GM.CONSTANTS.SENTINEL_CREATE) {
            try {
                return doc.swatches.getByName(GM.CONSTANTS.SWATCH_NAME).color;
            } catch (e) {
                var sp = doc.spots.add();
                sp.name = GM.CONSTANTS.SWATCH_NAME;
                sp.colorType = ColorModel.SPOT;
                var c = new CMYKColor();
                c.cyan = 0; c.magenta = 100; c.yellow = 0; c.black = 0;
                sp.color = c;
                var sc = new SpotColor();
                sc.spot = sp; sc.tint = 100;
                return sc;
            }
        } else {
            try {
                return doc.swatches.getByName(swatchName).color;
            } catch (e) {
                return null;
            }
        }
    },

    /**
     * Places a single mark on the target layer.
     * x, y are the CENTER coordinates of the mark in document space.
     */
    placeMark: function (targetLayer, x, y, radius, size, isRound, fillCol, strokeCol, cfg) {
        try {
            var m;
            if (isRound) {
                m = targetLayer.pathItems.ellipse(y + radius, x - radius, size, size);
            } else {
                m = targetLayer.pathItems.rectangle(y + radius, x - radius, size, size);
            }

            if (cfg.fillEnabled && fillCol) {
                m.filled = true;
                m.fillColor = fillCol;
                m.fillOverprint = cfg.fillOverprint;
            } else {
                m.filled = false;
            }

            if (cfg.strokeEnabled && strokeCol) {
                m.stroked = true;
                m.strokeColor = strokeCol;
                m.strokeWidth = cfg.strokeWeight;
                m.strokeOverprint = cfg.strokeOverprint;
            } else {
                m.stroked = false;
            }
        } catch (e) {
            $.writeln("placeMark [" + x + ", " + y + "]: " + e.message);
        }
    }
};

// ------------------------------------------------------------------------
// UI (ScriptUI Dialog)
// ------------------------------------------------------------------------
GM.UI = {
    /**
     * Returns localized display names for unit dropdown.
     * Order matches GM.CONSTANTS.UNIT_KEYS.
     * @returns {Array<string>} Display names
     */
    getUnitDisplayNames: function () {
        var keys = GM.CONSTANTS.UNIT_KEYS;
        var names = [];
        for (var i = 0; i < keys.length; i++) {
            names.push(GM.L["UNIT_" + keys[i].toUpperCase()]);
        }
        return names;
    },

    /**
     * Gets the internal unit key from a dropdown selection index.
     * @param {DropDownList} ddl - Unit dropdown
     * @returns {string} Internal unit key (mm/cm/in)
     */
    getUnitKey: function (ddl) {
        return ddl.selection ? GM.CONSTANTS.UNIT_KEYS[ddl.selection.index] : GM.CONSTANTS.UNIT.MM;
    },

    /**
     * Selects a unit in the dropdown by internal key.
     * @param {DropDownList} ddl - Unit dropdown
     * @param {string} unitKey - Internal key (mm/cm/in)
     */
    selectUnit: function (ddl, unitKey) {
        var keys = GM.CONSTANTS.UNIT_KEYS;
        for (var i = 0; i < keys.length; i++) {
            if (keys[i] === unitKey) { ddl.selection = i; return; }
        }
        ddl.selection = 0;
    },

    /**
     * Maps a stored value to its display string for dropdowns.
     * Converts SENTINEL_CREATE to localized CREATE_LABEL.
     * @param {string} value - Stored value
     * @returns {string} Display string for dropdown matching
     */
    toDisplay: function (value) {
        if (value === GM.CONSTANTS.SENTINEL_CREATE) return GM.L.CREATE_LABEL;
        return value;
    },

    /**
     * Maps a dropdown display string back to its storage value.
     * Converts localized CREATE_LABEL to SENTINEL_CREATE.
     * @param {string} displayText - Dropdown selection text
     * @returns {string} Value for storage
     */
    toStorage: function (displayText) {
        if (displayText === GM.L.CREATE_LABEL) return GM.CONSTANTS.SENTINEL_CREATE;
        return displayText;
    },

    /**
     * Builds a simplified edge panel with enable checkbox + count/spacing radio.
     * @param {Panel} parent - Parent UI container
     * @param {string} label - Edge label
     * @param {Object} defaultCfg - Default edge configuration
     * @param {number} width - Panel width in pixels
     * @returns {Object} Edge panel with gather/apply methods
     */
    buildEdgePanel: function (parent, label, defaultCfg, width) {
        var pnl = parent.add("panel", undefined, "");
        pnl.alignChildren = ["left", "top"];
        pnl.margins = [12, 12, 12, 8]; // Compact — intentional for 2×2 edge grid
        if (width) pnl.preferredSize.width = width;

        var cb = pnl.add("checkbox", undefined, label);
        cb.value = defaultCfg.enabled;
        cb.helpTip = GM.L.TIP_EDGE_ENABLE;

        // Layout: Count or Spacing — two-column grid
        // Radio buttons share one parent (radioCol) for native ScriptUI exclusion
        var modeGrp = pnl.add("group");
        modeGrp.orientation = "row";
        modeGrp.alignChildren = ["left", "center"];

        var radioCol = modeGrp.add("group");
        radioCol.orientation = "column";
        radioCol.alignChildren = ["left", "center"];
        radioCol.spacing = 8;

        var inputCol = modeGrp.add("group");
        inputCol.orientation = "column";
        inputCol.alignChildren = ["fill", "center"];
        inputCol.spacing = 8;

        var numRB = radioCol.add("radiobutton", undefined, GM.L.COUNT);
        numRB.value = defaultCfg.useNumber;
        numRB.helpTip = GM.L.TIP_COUNT;
        var numIn = inputCol.add("edittext", undefined, String(defaultCfg.number));
        numIn.preferredSize.width = 60;
        numIn.helpTip = GM.L.TIP_COUNT;

        var spcRB = radioCol.add("radiobutton", undefined, GM.L.SPACING);
        spcRB.value = !defaultCfg.useNumber;
        spcRB.helpTip = GM.L.TIP_SPACING;
        var spcIn = inputCol.add("edittext", undefined, String(defaultCfg.spacing));
        spcIn.preferredSize.width = 60;
        spcIn.helpTip = GM.L.TIP_SPACING;

        spcIn.enabled = !defaultCfg.useNumber;
        numIn.enabled = defaultCfg.useNumber;

        numRB.onClick = function () { numIn.enabled = true; spcIn.enabled = false; };
        spcRB.onClick = function () { numIn.enabled = false; spcIn.enabled = true; };

        function setAllEnabled(state) {
            numRB.enabled = state;
            spcRB.enabled = state;
            numIn.enabled = state && numRB.value;
            spcIn.enabled = state && spcRB.value;
        }
        cb.onClick = function () { setAllEnabled(cb.value); };
        setAllEnabled(cb.value);

        return {
            panel: pnl, cb: cb,
            numRB: numRB, numIn: numIn, spcRB: spcRB, spcIn: spcIn,
            setAllEnabled: setAllEnabled,
            gather: function () {
                return {
                    enabled: cb.value,
                    useNumber: numRB.value,
                    number: parseInt(numIn.text.replace(/,/g, "."), 10),
                    spacing: parseFloat(spcIn.text.replace(/,/g, "."))
                };
            },
            apply: function (e) {
                cb.value = e.enabled;
                numRB.value = e.useNumber;
                spcRB.value = !e.useNumber;
                numIn.text = e.number;
                spcIn.text = e.spacing;
                setAllEnabled(e.enabled);
            },
            getConvertFields: function () { return [spcIn]; }
        };
    },

    /**
     * Rebuilds the preset dropdown from allSettings.
     * Default preset is always first, shown with localized display name.
     * @param {DropDownList} ddl - Preset dropdown
     * @param {Object} allSettings - All presets
     * @returns {Array<string>} Sorted internal preset keys
     */
    rebuildPresets: function (ddl, allSettings) {
        ddl.removeAll();
        var SD = GM.CONSTANTS.SENTINEL_DEFAULT;
        var sortedKeys = [SD];
        for (var k in allSettings) {
            if (allSettings.hasOwnProperty(k) && k !== SD) {
                sortedKeys.push(k);
            }
        }
        for (var j = 0; j < sortedKeys.length; j++) {
            // Display localized name for default, raw name for user presets
            var display = (sortedKeys[j] === SD) ? GM.L.DEFAULT_PRESET : sortedKeys[j];
            ddl.add("item", display);
        }
        return sortedKeys;
    },

    /**
     * Builds the main ScriptUI dialog.
     * @param {Object} allSettings - All saved presets
     * @param {Object} layerInfo - Layer names and existence flags
     * @param {Object} swatchInfo - Swatch names and existence flags
     * @returns {Object} Dialog object with window and gatherAll methods
     */
    buildDialog: function (allSettings, layerInfo, swatchInfo) {
        var dlg = new Window("dialog", GM.CONSTANTS.SCRIPT_NAME);
        dlg.alignChildren = ["fill", "top"];
        dlg.margins  = 20;
        dlg.spacing  = 15;
        var defCfg = GM.Config.getDefaults();

        // =================================================================
        // Settings Panel (first — matches ZSM preset-first layout)
        // =================================================================
        var setPanel = dlg.add("panel", undefined, GM.L.SETTINGS_PANEL);
        setPanel.orientation = "row";
        setPanel.alignChildren = ["left", "center"];
        setPanel.margins = 15;

        setPanel.add("statictext", undefined, GM.L.LOAD);
        var loadDDL = setPanel.add("dropdownlist", undefined, []);
        loadDDL.preferredSize.width = 200;
        loadDDL.helpTip = GM.L.TIP_PRESET_LOAD;

        var sortedKeys = GM.UI.rebuildPresets(loadDDL, allSettings);
        loadDDL.selection = 0;

        var deleteBtn = setPanel.add("button", undefined, GM.L.DELETE);
        deleteBtn.enabled = false;
        var saveBtn = setPanel.add("button", undefined, GM.L.SAVE);

        // =================================================================
        // Global Position Panel
        // =================================================================
        var posPanel = dlg.add("panel", undefined, GM.L.POSITION_PANEL);
        posPanel.orientation = "row";
        posPanel.alignChildren = ["left", "center"];
        posPanel.margins = 15;

        posPanel.add("statictext", undefined, GM.L.OFFSET_X);
        var offsetXIn = posPanel.add("edittext", undefined, String(defCfg.offsetX));
        offsetXIn.preferredSize.width = 60;
        offsetXIn.helpTip = GM.L.TIP_OFFSET_X;

        posPanel.add("statictext", undefined, GM.L.OFFSET_Y);
        var offsetYIn = posPanel.add("edittext", undefined, String(defCfg.offsetY));
        offsetYIn.preferredSize.width = 60;
        offsetYIn.helpTip = GM.L.TIP_OFFSET_Y;

        // =================================================================
        // Edge Panels — Row 1: Top + Left
        // =================================================================
        var row1 = dlg.add("group");
        row1.orientation = "row";
        row1.alignChildren = ["fill", "top"];

        var topUI = GM.UI.buildEdgePanel(row1, GM.L.TOP, defCfg.top, 280);
        var leftUI = GM.UI.buildEdgePanel(row1, GM.L.LEFT, defCfg.left, 280);

        // =================================================================
        // Edge Panels — Row 2: Bottom (mirror) + Right (mirror)
        // =================================================================
        var row2 = dlg.add("group");
        row2.orientation = "row";
        row2.alignChildren = ["fill", "top"];

        // Bottom column
        var bottomOuter = row2.add("group");
        bottomOuter.orientation = "column";
        bottomOuter.alignChildren = ["fill", "top"];
        bottomOuter.preferredSize.width = 280;
        var bottomMirrorGrp = bottomOuter.add("group");
        bottomMirrorGrp.margins = [12, 4, 0, 0];
        var bottomMirrorCB = bottomMirrorGrp.add("checkbox", undefined, GM.L.BOTTOM_MIRROR);
        bottomMirrorCB.value = defCfg.bottomMirror;
        bottomMirrorCB.helpTip = GM.L.TIP_MIRROR_BOTTOM;
        var bottomUI = GM.UI.buildEdgePanel(bottomOuter, GM.L.BOTTOM_CUSTOM, defCfg.bottom, 280);

        // Right column
        var rightOuter = row2.add("group");
        rightOuter.orientation = "column";
        rightOuter.alignChildren = ["fill", "top"];
        rightOuter.preferredSize.width = 280;
        var rightMirrorGrp = rightOuter.add("group");
        rightMirrorGrp.margins = [12, 4, 0, 0];
        var rightMirrorCB = rightMirrorGrp.add("checkbox", undefined, GM.L.RIGHT_MIRROR);
        rightMirrorCB.value = defCfg.rightMirror;
        rightMirrorCB.helpTip = GM.L.TIP_MIRROR_RIGHT;
        var rightUI = GM.UI.buildEdgePanel(rightOuter, GM.L.RIGHT_CUSTOM, defCfg.right, 280);

        // Mirror Logic
        function updateMirrors() {
            var bm = bottomMirrorCB.value;
            bottomUI.cb.enabled = !bm;
            bottomUI.setAllEnabled(!bm && bottomUI.cb.value);
            if (bm) bottomUI.cb.value = false;

            var rm = rightMirrorCB.value;
            rightUI.cb.enabled = !rm;
            rightUI.setAllEnabled(!rm && rightUI.cb.value);
            if (rm) rightUI.cb.value = false;
        }
        bottomMirrorCB.onClick = updateMirrors;
        rightMirrorCB.onClick = updateMirrors;
        bottomUI.cb.onClick = function () { bottomUI.setAllEnabled(bottomUI.cb.value); };
        rightUI.cb.onClick = function () { rightUI.setAllEnabled(rightUI.cb.value); };
        updateMirrors();

        // =================================================================
        // Mark Panel (units, size, shape)
        // =================================================================
        var markPanel = dlg.add("panel", undefined, GM.L.MARK_PANEL);
        markPanel.orientation = "row";
        markPanel.alignChildren = ["left", "center"];
        markPanel.margins = 15;

        markPanel.add("statictext", undefined, GM.L.UNIT_LABEL);
        var unitsDDL = markPanel.add("dropdownlist", undefined, GM.UI.getUnitDisplayNames());
        unitsDDL.selection = 0;

        markPanel.add("statictext", undefined, GM.L.SIZE_LABEL);
        var sizeInput = markPanel.add("edittext", undefined, String(defCfg.markSize));
        sizeInput.preferredSize.width = 60;
        sizeInput.helpTip = GM.L.TIP_SIZE;

        markPanel.add("statictext", undefined, GM.L.SHAPE_LABEL);
        var roundRB = markPanel.add("radiobutton", undefined, GM.L.ROUND);
        roundRB.value = defCfg.isRound;
        roundRB.helpTip = GM.L.TIP_SHAPE_ROUND;
        var squareRB = markPanel.add("radiobutton", undefined, GM.L.SQUARE);
        squareRB.value = !defCfg.isRound;
        squareRB.helpTip = GM.L.TIP_SHAPE_SQUARE;

        // =================================================================
        // Appearance Panel (layer, fill, stroke)
        // =================================================================
        var appPanel = dlg.add("panel", undefined, GM.L.APPEARANCE_PANEL);
        appPanel.orientation = "column";
        appPanel.alignChildren = ["left", "top"];
        appPanel.margins = [15, 10, 15, 15];
        appPanel.spacing = 10;

        // Layer
        var layerGrp = appPanel.add("group");
        layerGrp.add("statictext", undefined, GM.L.LAYER);
        var layerDDL = layerGrp.add("dropdownlist", undefined, layerInfo.names);
        layerDDL.preferredSize.width = 200;
        layerDDL.helpTip = GM.L.TIP_LAYER;
        GM.UI.selectDDL(layerDDL, GM.L.CREATE_LABEL);

        // Fill
        var fillGrp = appPanel.add("group");
        var fillCB = fillGrp.add("checkbox", undefined, GM.L.FILL);
        fillCB.value = defCfg.fillEnabled;
        fillCB.helpTip = GM.L.TIP_FILL;
        var fillDDL = fillGrp.add("dropdownlist", undefined, swatchInfo.names);
        fillDDL.preferredSize.width = 180;
        GM.UI.selectDDL(fillDDL, GM.L.CREATE_LABEL);
        var fillOPCB = fillGrp.add("checkbox", undefined, GM.L.OVERPRINT);
        fillOPCB.value = defCfg.fillOverprint;
        fillOPCB.helpTip = GM.L.TIP_OVERPRINT;

        // Stroke
        var strokeGrp = appPanel.add("group");
        var strokeCB = strokeGrp.add("checkbox", undefined, GM.L.STROKE);
        strokeCB.value = defCfg.strokeEnabled;
        strokeCB.helpTip = GM.L.TIP_STROKE;
        var strokeDDL = strokeGrp.add("dropdownlist", undefined, swatchInfo.names);
        strokeDDL.preferredSize.width = 180;
        strokeDDL.enabled = defCfg.strokeEnabled;
        GM.UI.selectDDL(strokeDDL, GM.L.CREATE_LABEL);
        var strokeOPCB = strokeGrp.add("checkbox", undefined, GM.L.OVERPRINT);
        strokeOPCB.value = defCfg.strokeOverprint;
        strokeOPCB.helpTip = GM.L.TIP_OVERPRINT;
        strokeOPCB.enabled = defCfg.strokeEnabled;

        // Weight
        var wGrp = appPanel.add("group");
        wGrp.add("statictext", undefined, GM.L.WEIGHT);
        var weightInput = wGrp.add("edittext", undefined, String(defCfg.strokeWeight));
        weightInput.preferredSize.width = 50;
        weightInput.enabled = defCfg.strokeEnabled;
        weightInput.helpTip = GM.L.TIP_WEIGHT;
        wGrp.add("statictext", undefined, GM.L.POINTS);

        // Handlers
        fillCB.onClick = function () {
            fillDDL.enabled = fillCB.value;
            fillOPCB.enabled = fillCB.value;
        };
        strokeCB.onClick = function () {
            strokeDDL.enabled = strokeCB.value;
            strokeOPCB.enabled = strokeCB.value;
            weightInput.enabled = strokeCB.value;
        };

        // =================================================================
        // Unit Conversion
        // =================================================================
        var currentUnit = GM.CONSTANTS.UNIT.MM;
        unitsDDL.onChange = function () {
            var newUnit = GM.UI.getUnitKey(unitsDDL);
            if (newUnit === currentUnit) return;
            var fields = [offsetXIn, offsetYIn, sizeInput]
                .concat(topUI.getConvertFields())
                .concat(leftUI.getConvertFields())
                .concat(bottomUI.getConvertFields())
                .concat(rightUI.getConvertFields());

            for (var i = 0; i < fields.length; i++) {
                var v = parseFloat(fields[i].text.replace(/,/g, "."));
                if (!isNaN(v)) {
                    fields[i].text = GM.Core.round(GM.Core.convertVal(v, currentUnit, newUnit));
                }
            }
            currentUnit = newUnit;
        };

        // =================================================================
        // Footer — action buttons
        // =================================================================
        var footerGrp = dlg.add("group");
        footerGrp.alignment = ["right", "center"];
        footerGrp.spacing   = 8;
        footerGrp.add("button", undefined, GM.L.CANCEL, { name: "cancel" });
        footerGrp.add("button", undefined, GM.L.OK,     { name: "ok" });

        // =================================================================
        // Gather & Apply
        // =================================================================
        function gatherAll() {
            return {
                offsetX: parseFloat(offsetXIn.text.replace(/,/g, ".")),
                offsetY: parseFloat(offsetYIn.text.replace(/,/g, ".")),
                top: topUI.gather(),
                left: leftUI.gather(),
                bottom: bottomUI.gather(),
                right: rightUI.gather(),
                bottomMirror: bottomMirrorCB.value,
                rightMirror: rightMirrorCB.value,
                units: GM.UI.getUnitKey(unitsDDL),
                markSize: parseFloat(sizeInput.text.replace(/,/g, ".")),
                isRound: roundRB.value,
                markLayerName: GM.UI.toStorage(layerDDL.selection ? layerDDL.selection.text : GM.L.CREATE_LABEL),
                fillEnabled: fillCB.value,
                fillSwatchName: GM.UI.toStorage(fillDDL.selection ? fillDDL.selection.text : GM.L.CREATE_LABEL),
                fillOverprint: fillOPCB.value,
                strokeEnabled: strokeCB.value,
                strokeSwatchName: GM.UI.toStorage(strokeDDL.selection ? strokeDDL.selection.text : GM.L.CREATE_LABEL),
                strokeOverprint: strokeOPCB.value,
                strokeWeight: parseFloat(weightInput.text.replace(/,/g, "."))
            };
        }

        function applyAll(s) {
            // Stored values are in the stored unit — set currentUnit first,
            // then write raw values. No conversion needed (intentional).
            GM.UI.selectUnit(unitsDDL, s.units || GM.CONSTANTS.UNIT.MM);
            currentUnit = s.units || GM.CONSTANTS.UNIT.MM;

            offsetXIn.text = s.offsetX;
            offsetYIn.text = s.offsetY;

            topUI.apply(s.top);
            leftUI.apply(s.left);
            bottomUI.apply(s.bottom);
            rightUI.apply(s.right);

            bottomMirrorCB.value = s.bottomMirror;
            rightMirrorCB.value = s.rightMirror;
            // updateMirrors() must run AFTER both mirror CBs and edge panels
            // are set — it disables/enables controls based on mirror state.
            updateMirrors();

            sizeInput.text = s.markSize;
            roundRB.value = s.isRound;
            squareRB.value = !s.isRound;

            GM.UI.selectDDL(layerDDL, GM.UI.toDisplay(s.markLayerName));

            fillCB.value = s.fillEnabled;
            GM.UI.selectDDL(fillDDL, GM.UI.toDisplay(s.fillSwatchName));
            fillOPCB.value = s.fillOverprint;
            fillDDL.enabled = s.fillEnabled;
            fillOPCB.enabled = s.fillEnabled;

            strokeCB.value = s.strokeEnabled;
            GM.UI.selectDDL(strokeDDL, GM.UI.toDisplay(s.strokeSwatchName));
            strokeOPCB.value = s.strokeOverprint;
            weightInput.text = s.strokeWeight;
            strokeDDL.enabled = s.strokeEnabled;
            strokeOPCB.enabled = s.strokeEnabled;
            weightInput.enabled = s.strokeEnabled;
        }

        // =================================================================
        // Preset Handlers
        // =================================================================
        applyAll(allSettings[GM.CONSTANTS.SENTINEL_DEFAULT]);

        loadDDL.onChange = function () {
            if (!loadDDL.selection) return;
            var idx = loadDDL.selection.index;
            var key = sortedKeys[idx];
            deleteBtn.enabled = (key !== GM.CONSTANTS.SENTINEL_DEFAULT);
            var s = allSettings[key];
            if (s) applyAll(s);
        };

        deleteBtn.onClick = function () {
            if (!loadDDL.selection) return;
            var idx = loadDDL.selection.index;
            var key = sortedKeys[idx];
            if (key === GM.CONSTANTS.SENTINEL_DEFAULT) {
                alert(GM.L.ERR_CANNOT_DELETE_DEFAULT);
                return;
            }
            var displayName = loadDDL.selection.text;
            if (!confirm(GM.L.format(GM.L.CONFIRM_DELETE_PRESET, displayName))) return;
            delete allSettings[key];
            sortedKeys = GM.UI.rebuildPresets(loadDDL, allSettings);
            loadDDL.selection = 0;
            deleteBtn.enabled = false;
            applyAll(allSettings[sortedKeys[0]]);
        };

        saveBtn.onClick = function () {
            var sd = new Window("dialog", GM.L.SAVE_TITLE);
            sd.alignChildren = ["fill", "top"];
            var ng = sd.add("group");
            ng.add("statictext", undefined, GM.L.PRESET_NAME);
            var ni = ng.add("edittext", undefined, "");
            ni.characters = 25;
            ni.active = true;

            var bg = sd.add("group");
            bg.alignment = "center";
            bg.add("button", undefined, GM.L.CANCEL, { name: "cancel" });
            bg.add("button", undefined, GM.L.OK, { name: "ok" });

            if (sd.show() === 1) {
                var sn = ni.text.replace(/^\s+|\s+$/g, "");
                if (!sn || !sn.length) { alert(GM.L.ERR_ENTER_NAME); return; }
                if (sn === GM.CONSTANTS.SENTINEL_CREATE || sn === GM.CONSTANTS.SENTINEL_DEFAULT) {
                    alert(GM.L.ERR_ENTER_NAME); return;
                }
                if (allSettings[sn]) {
                    if (!confirm(GM.L.format(GM.L.CONFIRM_OVERWRITE_PRESET, sn))) return;
                }
                allSettings[sn] = gatherAll();
                sortedKeys = GM.UI.rebuildPresets(loadDDL, allSettings);
                // Select saved preset — find by key in sortedKeys
                for (var si = 0; si < sortedKeys.length; si++) {
                    if (sortedKeys[si] === sn) { loadDDL.selection = si; break; }
                }
            }
        };

        return {
            window: dlg,
            gatherAll: gatherAll
        };
    },

    selectDDL: function (ddl, name) {
        for (var i = 0; i < ddl.items.length; i++) {
            if (ddl.items[i].text === name) {
                ddl.selection = i;
                return;
            }
        }
        ddl.selection = 0;
    }
};

// ------------------------------------------------------------------------
// Main App
// ------------------------------------------------------------------------
GM.Main = {
    /**
     * Validates gathered configuration before processing.
     * Returns first error message string, or null if all valid.
     * @param {Object} cfg - Configuration from gatherAll()
     * @returns {string|null} Localized error message or null
     */
    validate: function (cfg) {
        if (isNaN(cfg.offsetX) || cfg.offsetX < 0) return GM.L.ERR_INVALID_OFFSET;
        if (isNaN(cfg.offsetY) || cfg.offsetY < 0) return GM.L.ERR_INVALID_OFFSET;
        if (isNaN(cfg.markSize) || cfg.markSize <= 0) return GM.L.ERR_MARK_SIZE;
        if (cfg.strokeEnabled && (isNaN(cfg.strokeWeight) || cfg.strokeWeight <= 0)) return GM.L.ERR_INVALID_WEIGHT;

        // Check appearance
        if (!cfg.fillEnabled && !cfg.strokeEnabled) return GM.L.ERR_NO_APPEARANCE;

        // Resolve effective enabled state (mirror = copy from opposite)
        var topOn = cfg.top.enabled;
        var leftOn = cfg.left.enabled;
        var bottomOn = cfg.bottomMirror ? topOn : cfg.bottom.enabled;
        var rightOn = cfg.rightMirror ? leftOn : cfg.right.enabled;
        if (!topOn && !leftOn && !bottomOn && !rightOn) return GM.L.ERR_NO_EDGE;

        // Validate enabled, non-mirrored edges only
        var edgeKeys = ["top", "left"];
        if (!cfg.bottomMirror) edgeKeys.push("bottom");
        if (!cfg.rightMirror) edgeKeys.push("right");

        for (var i = 0; i < edgeKeys.length; i++) {
            var e = cfg[edgeKeys[i]];
            if (!e.enabled) continue;
            if (e.useNumber) {
                if (isNaN(e.number) || e.number < 1) return GM.L.ERR_EDGE_COUNT;
            } else {
                if (isNaN(e.spacing) || e.spacing <= 0) return GM.L.ERR_EDGE_SPACING;
            }
        }

        return null;
    },

    run: function () {
        if (!GM.Illustrator.init()) {
            alert(GM.L.ERR_NO_DOC);
            return;
        }

        var settings = GM.Config.load();
        var layerInfo = GM.Illustrator.getLayerNames();
        var swatchInfo = GM.Illustrator.getSwatchNames();

        var ui = GM.UI.buildDialog(settings, layerInfo, swatchInfo);

        if (ui.window.show() !== 1) return;

        // Persist all preset mutations (saves, deletes) only on OK
        GM.Config.save(settings);

        var cfg = ui.gatherAll();

        var err = GM.Main.validate(cfg);
        if (err) {
            alert(err);
            return;
        }

        GM.Main.process(cfg);

        app.redraw();
    },

    process: function (cfg) {
        try {
            var doc = GM.Illustrator.doc;

            // Resolve effective edge configs (mirror = copy from opposite)
            var topCfg = cfg.top;
            var leftCfg = cfg.left;
            var bottomCfg = cfg.bottomMirror ? topCfg : cfg.bottom;
            var rightCfg = cfg.rightMirror ? leftCfg : cfg.right;

            var topOn = topCfg.enabled;
            var leftOn = leftCfg.enabled;
            var bottomOn = cfg.bottomMirror ? topOn : bottomCfg.enabled;
            var rightOn = cfg.rightMirror ? leftOn : rightCfg.enabled;

            var unitFactor = GM.CONSTANTS.UNIT_FACTORS[cfg.units];
            var targetLayer = GM.Illustrator.getOrCreateLayer(cfg.markLayerName);
            if (!targetLayer) {
                alert(GM.L.format(GM.L.ERR_LAYER_NOT_FOUND, cfg.markLayerName));
                return;
            }

            var fillColor = cfg.fillEnabled ? GM.Illustrator.getOrCreateSwatch(cfg.fillSwatchName) : null;
            var strokeColor = cfg.strokeEnabled ? GM.Illustrator.getOrCreateSwatch(cfg.strokeSwatchName) : null;

            if (cfg.fillEnabled && !fillColor) {
                alert(GM.L.format(GM.L.ERR_SWATCH_NOT_FOUND, cfg.fillSwatchName));
                return;
            }
            if (cfg.strokeEnabled && !strokeColor) {
                alert(GM.L.format(GM.L.ERR_SWATCH_NOT_FOUND, cfg.strokeSwatchName));
                return;
            }

            var markSizePoints = cfg.markSize * unitFactor;
            var radius = markSizePoints / 2;

            var offX = cfg.offsetX;
            var offY = cfg.offsetY;

            var placed = {};
            function place(x, y) {
                var key = Math.round(x * 10) / 10 + "|" + Math.round(y * 10) / 10;
                if (placed[key]) return;
                placed[key] = true;
                GM.Illustrator.placeMark(
                    targetLayer, x, y, radius, markSizePoints,
                    cfg.isRound, fillColor, strokeColor, cfg
                );
            }

            for (var i = 0; i < doc.artboards.length; i++) {
                var ab = doc.artboards[i];
                var r = ab.artboardRect;
                var abLeft = r[0], abTop = r[1], abRight = r[2], abBottom = r[3];
                var abWidth = abRight - abLeft;
                var abHeight = abTop - abBottom;

                if (topOn) {
                    var tPositions = GM.Core.calcPositions(topCfg, abWidth, offX, unitFactor);
                    var tY = abTop - (offY * unitFactor);
                    for (var ti = 0; ti < tPositions.length; ti++) {
                        place(abLeft + tPositions[ti], tY);
                    }
                }

                if (bottomOn) {
                    var bPositions = GM.Core.calcPositions(bottomCfg, abWidth, offX, unitFactor);
                    var bY = abBottom + (offY * unitFactor);
                    for (var bi = 0; bi < bPositions.length; bi++) {
                        place(abLeft + bPositions[bi], bY);
                    }
                }

                if (leftOn) {
                    var lPositions = GM.Core.calcPositions(leftCfg, abHeight, offY, unitFactor);
                    var lX = abLeft + (offX * unitFactor);
                    for (var li = 0; li < lPositions.length; li++) {
                        place(lX, abTop - lPositions[li]);
                    }
                }

                if (rightOn) {
                    var rPositions = GM.Core.calcPositions(rightCfg, abHeight, offY, unitFactor);
                    var rX = abRight - (offX * unitFactor);
                    for (var ri = 0; ri < rPositions.length; ri++) {
                        place(rX, abTop - rPositions[ri]);
                    }
                }
            }
        } catch (e) {
            alert(GM.CONSTANTS.SCRIPT_NAME + ": " + GM.L.ERR_UNEXPECTED + " — " + e.message);
        }
    }
};

// Run
GM.Main.run();

})();
