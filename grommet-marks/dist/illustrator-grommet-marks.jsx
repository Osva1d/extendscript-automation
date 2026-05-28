/*
 * ===========================================================================
 * Script:      Illustrator Grommet Marks
 * Version:     4.1.0
 * Author:      Osva1d
 * Updated:     2026-05-28
 *
 * Copyright (C) 2025-2026 Ladislav Osvald (Osva1d).
 * Licensed under GNU GPL-3.0-or-later. See LICENSE file or
 * <https://www.gnu.org/licenses/gpl-3.0.txt> for full terms.
 *
 * Description:
 *   Grommet mark generator for banner production.
 * ===========================================================================
 */

#target illustrator

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
// Module: GM.CONSTANTS — script-wide constants
// Part of: Illustrator Grommet Marks
// Depends on: (none)
// ------------------------------------------------------------------------
var GM = GM || {};

GM.CONSTANTS = {
    SCRIPT_NAME: "Illustrator Grommet Marks",
    VERSION: "4.1.0",
    SETTINGS_FILE_NAME: "GrommetMarksSettings.json",

    LAYER_NAME: "Grommet Marks",
    SWATCH_NAME: "Grommet Marks",

    // Layer/swatch auto-creation sentinel — never displayed, used in logic only
    SENTINEL_CREATE: "__create__",

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
// Module: GM.L — localization (EN/CS string tables)
// Part of: Illustrator Grommet Marks
// Depends on: (none — self-contained IIFE)
// ------------------------------------------------------------------------
var GM = GM || {};

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
            EDGES_PANEL: "Edges",
            EDGE_TOP: "Top",
            EDGE_LEFT: "Left",
            EDGE_BOTTOM: "Bottom",
            EDGE_RIGHT: "Right",
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
            BTN_SAVE_AS: "Save As…",
            TIP_SAVE_AS: "Save current settings as a new preset.",
            BTN_RESET: "Reset",
            TIP_RESET: "Reset all settings to factory defaults.",
            PROMPT_SAVE_AS: "Save current settings as new preset:",

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
            TIP_SAVE: "Save settings to the active preset.",

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
            ERR_RESERVED_NAME: "This name is reserved. Choose a different name.",
            ERR_PRESET_EXISTS: "Preset already exists. Overwrite?",
            ERR_MUST_BE_NUMBER: "%s must be a number!",
            ERR_MUST_BE_INTEGER: "%s must be a whole number!",
            ERR_OUT_OF_RANGE: "%s must be between %s and %s!",
            PRESET_PLACEHOLDER: "My Preset",

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
            EDGES_PANEL: "Hrany",
            EDGE_TOP: "Horní",
            EDGE_LEFT: "Levá",
            EDGE_BOTTOM: "Dolní",
            EDGE_RIGHT: "Pravá",
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
            BTN_SAVE_AS: "Uložit jako…",
            TIP_SAVE_AS: "Uložit aktuální nastavení jako novou předvolbu.",
            BTN_RESET: "Reset",
            TIP_RESET: "Obnovit všechna nastavení na výchozí hodnoty.",
            PROMPT_SAVE_AS: "Uložit aktuální nastavení jako novou předvolbu:",

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
            TIP_SAVE: "Uložit nastavení do aktivní předvolby.",

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
            ERR_RESERVED_NAME: "Tento název je rezervovaný. Vyberte jiný.",
            ERR_PRESET_EXISTS: "Předvolba již existuje. Přepsat?",
            ERR_MUST_BE_NUMBER: "%s musí být číslo!",
            ERR_MUST_BE_INTEGER: "%s musí být celé číslo!",
            ERR_OUT_OF_RANGE: "%s musí být mezi %s a %s!",
            PRESET_PLACEHOLDER: "Moje předvolba",

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
// Module: GM.Utils — shared utility functions
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Utils = {
    /**
     * Writes a debug message to the ExtendScript console.
     * @param {string} msg - Message to log.
     */
    log: function (msg) {
        $.writeln("[GM] " + msg);
    },

    /**
     * Displays a user-facing error alert prefixed with script name.
     * @param {string} msg - Error message body.
     */
    error: function (msg) {
        alert(GM.CONSTANTS.SCRIPT_NAME + ": " + msg);
    },

    /**
     * Returns a deep copy of a JSON-serializable object.
     * @param {Object} obj - Source object.
     * @returns {Object} Independent copy.
     */
    deepCopy: function (obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Deep-equality test for two GM settings objects.
     * Used by the UI to detect "modified" state (UI values diverged
     * from the stored preset). Numeric coercion via String() so 5
     * and "5" compare equal — UI inputs are strings, stored values
     * may be numbers.
     *
     * @param {Object} a - First settings object.
     * @param {Object} b - Second settings object.
     * @returns {boolean} True if all schema fields are equal.
     */
    presetEquals: function (a, b) {
        if (!a || !b) return false;
        var keys = [
            "offsetX", "offsetY", "bottomMirror", "rightMirror",
            "units", "markSize", "isRound",
            "markLayerName", "fillEnabled", "fillSwatchName", "fillOverprint",
            "strokeEnabled", "strokeSwatchName", "strokeOverprint", "strokeWeight"
        ];
        for (var i = 0; i < keys.length; i++) {
            if (String(a[keys[i]]) !== String(b[keys[i]])) return false;
        }
        // Compare edge sub-objects
        var edgeNames = ["top", "left", "bottom", "right"];
        var edgeKeys = ["enabled", "useNumber", "number", "spacing"];
        for (var ei = 0; ei < edgeNames.length; ei++) {
            var aE = a[edgeNames[ei]] || {};
            var bE = b[edgeNames[ei]] || {};
            for (var ek = 0; ek < edgeKeys.length; ek++) {
                if (String(aE[edgeKeys[ek]]) !== String(bE[edgeKeys[ek]])) return false;
            }
        }
        return true;
    }
};

// ------------------------------------------------------------------------
// Module: GM.Config — default settings and preset constants
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Config = {
    PRESET_KEY_DEFAULT: "[Default]",

    /**
     * Creates an edge definition (per-edge settings).
     * @param {boolean} enabled - Edge active.
     * @param {boolean} useNum - True = fixed count, false = preferred spacing.
     * @param {number} num - Number of marks.
     * @param {number} spacing - Preferred spacing between mark centers.
     * @returns {Object} Edge definition.
     */
    createEdgeDef: function (enabled, useNum, num, spacing) {
        return {
            enabled: enabled,
            useNumber: useNum,
            number: num,
            spacing: spacing
        };
    },

    /**
     * Returns a fresh default settings object.
     * @returns {Object} Default settings.
     */
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
    }
};

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

// ------------------------------------------------------------------------
// Module: GM.Validation — rules-based input validation
// Part of: Illustrator Grommet Marks
//
// Pure validation logic decoupled from ScriptUI. Numeric checks use
// a shared validateNumber helper. Can be tested in Node without Illustrator.
//
// Depends on: GM.L (error messages)
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Validation = {
    rules: {
        offsetX:      { min: 0,    max: 9999, integer: false },
        offsetY:      { min: 0,    max: 9999, integer: false },
        markSize:     { min: 0.01, max: 9999, integer: false },
        strokeWeight: { min: 0.01, max: 100,  integer: false },
        edgeCount:    { min: 1,    max: 9999, integer: true  },
        edgeSpacing:  { min: 0.01, max: 9999, integer: false }
    },

    /**
     * Validates a numeric value against a rule.
     * Normalizes Czech decimal separator (comma -> dot).
     * @param {string|number} val - Raw value.
     * @param {Object} rule - {min, max, integer}.
     * @param {string} label - Display name for error messages.
     * @param {Object} L - Locale object (GM.L).
     * @returns {number|null} Parsed number or null if invalid.
     */
    validateNumber: function (val, rule, label, L) {
        var str = String(val).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
        var n = (str === "") ? NaN : Number(str);
        if (isNaN(n)) {
            alert(L.format(L.ERR_MUST_BE_NUMBER || "%s must be a number!", label));
            return null;
        }
        if (rule.integer && n !== Math.floor(n)) {
            alert(L.format(L.ERR_MUST_BE_INTEGER || "%s must be a whole number!", label));
            return null;
        }
        if (n < rule.min || n > rule.max) {
            alert(L.format(L.ERR_OUT_OF_RANGE || "%s must be between %s and %s!", label, rule.min, rule.max));
            return null;
        }
        return n;
    },

    /**
     * Validates the full gathered configuration.
     * Returns {valid: true, settings} or {valid: false, settings: null}.
     *
     * @param {Object} cfg - Raw config from gatherAll().
     * @param {Object} L - Locale object.
     * @returns {Object} {valid: boolean, settings: Object|null}
     */
    validate: function (cfg, L) {
        if (!cfg) return { valid: false, settings: null };
        var rules = GM.Validation.rules;
        var vn = GM.Validation.validateNumber;

        var offsetX = vn(cfg.offsetX, rules.offsetX, L.OFFSET_X || "Offset X", L);
        if (offsetX === null) return { valid: false, settings: null };

        var offsetY = vn(cfg.offsetY, rules.offsetY, L.OFFSET_Y || "Offset Y", L);
        if (offsetY === null) return { valid: false, settings: null };

        var markSize = vn(cfg.markSize, rules.markSize, L.SIZE_LABEL || "Mark size", L);
        if (markSize === null) return { valid: false, settings: null };

        var strokeWeight = cfg.strokeWeight;
        if (cfg.strokeEnabled) {
            strokeWeight = vn(cfg.strokeWeight, rules.strokeWeight, L.WEIGHT || "Stroke weight", L);
            if (strokeWeight === null) return { valid: false, settings: null };
        }

        // Appearance check
        if (!cfg.fillEnabled && !cfg.strokeEnabled) {
            alert(L.ERR_NO_APPEARANCE);
            return { valid: false, settings: null };
        }

        // Edge enabled check (accounting for mirrors)
        var topOn = cfg.top.enabled;
        var leftOn = cfg.left.enabled;
        var bottomOn = cfg.bottomMirror ? topOn : cfg.bottom.enabled;
        var rightOn = cfg.rightMirror ? leftOn : cfg.right.enabled;
        if (!topOn && !leftOn && !bottomOn && !rightOn) {
            alert(L.ERR_NO_EDGE);
            return { valid: false, settings: null };
        }

        // Validate non-mirrored enabled edges
        var edgeKeys = ["top", "left"];
        if (!cfg.bottomMirror) edgeKeys.push("bottom");
        if (!cfg.rightMirror) edgeKeys.push("right");

        for (var i = 0; i < edgeKeys.length; i++) {
            var e = cfg[edgeKeys[i]];
            if (!e.enabled) continue;
            if (e.useNumber) {
                var cnt = vn(e.number, rules.edgeCount, L.COUNT || "Count", L);
                if (cnt === null) return { valid: false, settings: null };
            } else {
                var spc = vn(e.spacing, rules.edgeSpacing, L.SPACING || "Spacing", L);
                if (spc === null) return { valid: false, settings: null };
            }
        }

        // Build clean settings (parsed numbers replace raw strings)
        var settings = GM.Utils.deepCopy(cfg);
        settings.offsetX = offsetX;
        settings.offsetY = offsetY;
        settings.markSize = markSize;
        if (cfg.strokeEnabled) settings.strokeWeight = strokeWeight;

        return { valid: true, settings: settings };
    }
};

// ------------------------------------------------------------------------
// Module: GM.UIState — pure preset state-transition logic
// Part of: Illustrator Grommet Marks
//
// Extracted from ScriptUI event handlers so it can be unit-tested without
// a real dialog. The dialog (ui.js) wires these to button onClick handlers;
// everything UI-specific (alerts, prompts, control updates) stays in ui.js.
//
// Depends on: GM.Utils (presetEquals), GM.Config (PRESET_KEY_DEFAULT)
// ------------------------------------------------------------------------
var GM = GM || {};

GM.UIState = {
    PRESET_KEY_DEFAULT: "[Default]",
    PRESET_KEY_LAST:    "[Last Settings]",

    /**
     * Validates a preset name.
     * @param {string} rawName - User-entered name.
     * @returns {string|null} Trimmed name, or null if invalid/reserved.
     */
    validatePresetName: function (rawName) {
        var name = String(rawName == null ? "" : rawName).replace(/^\s+|\s+$/g, "");
        if (!name) return null;
        if (name === this.PRESET_KEY_DEFAULT || name === this.PRESET_KEY_LAST) return null;
        return name;
    },

    /**
     * Returns true if the active preset has unsaved changes.
     * @param {Object} pData - Preset wrapper {activePreset, presets}.
     * @param {Object} currentValues - Current UI values.
     * @returns {boolean}
     */
    isModified: function (pData, currentValues) {
        if (!pData || !currentValues) return false;
        var preset = pData.presets[pData.activePreset];
        if (!preset) return false;
        return !GM.Utils.presetEquals(currentValues, preset);
    },

    /**
     * Builds dropdown list data: ordered keys with display text + modified indicator.
     * @param {Object} pData - Preset wrapper.
     * @param {Object} currentValues - Current UI values.
     * @param {Object} L - Locale (for [Default] display).
     * @returns {Array} [{key, displayText, isActive, isModified}, ...]
     */
    formatPresetList: function (pData, currentValues, L) {
        L = L || {};
        var defaultDisplay = L.DEFAULT_PRESET || this.PRESET_KEY_DEFAULT;
        var DEF = this.PRESET_KEY_DEFAULT;
        var keys = [];
        for (var k in pData.presets) {
            if (pData.presets.hasOwnProperty(k) && k !== this.PRESET_KEY_LAST) keys.push(k);
        }
        keys.sort(function (a, b) {
            if (a === DEF) return -1;
            if (b === DEF) return 1;
            return a < b ? -1 : (a > b ? 1 : 0);
        });

        var modified = this.isModified(pData, currentValues);

        var result = [];
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var displayText = (key === DEF) ? defaultDisplay : key;
            var isActive = (key === pData.activePreset);
            if (isActive && modified) displayText += " *";
            result.push({
                key: key,
                displayText: displayText,
                isActive: isActive,
                isModified: isActive && modified
            });
        }
        return result;
    },

    /**
     * Save current UI values to the active named preset.
     * If active is [Default] or [Last Settings], returns needs-name.
     * @param {Object} pData - Preset wrapper (mutated).
     * @param {Object} currentValues - UI values to save.
     * @returns {Object} {ok, reason?}
     */
    save: function (pData, currentValues) {
        if (!pData || !currentValues) return { ok: false, reason: "missing-input" };
        var active = pData.activePreset;
        if (active === this.PRESET_KEY_DEFAULT || active === this.PRESET_KEY_LAST || !active) {
            return { ok: false, reason: "needs-name" };
        }
        pData.presets[active] = currentValues;
        return { ok: true };
    },

    /**
     * Save current UI values as a new (or replacing existing) named preset.
     * @param {Object} pData - Preset wrapper (mutated).
     * @param {string} name - New preset name (raw user input).
     * @param {Object} currentValues - UI values.
     * @param {Function} confirmOverwrite - Optional callback (returns bool).
     * @returns {Object} {ok, reason?, name?}
     */
    saveAs: function (pData, name, currentValues, confirmOverwrite) {
        if (!pData || !currentValues) return { ok: false, reason: "missing-input" };
        var clean = this.validatePresetName(name);
        if (!clean) return { ok: false, reason: "invalid-name" };
        if (pData.presets[clean]) {
            if (typeof confirmOverwrite === "function" && !confirmOverwrite(clean)) {
                return { ok: false, reason: "user-cancelled" };
            }
        }
        pData.presets[clean] = currentValues;
        pData.activePreset = clean;
        return { ok: true, name: clean };
    },

    /**
     * Delete the active preset (cannot delete [Default] or [Last Settings]).
     * On success, activePreset reverts to [Default].
     * @param {Object} pData - Preset wrapper (mutated).
     * @returns {Object} {ok, reason?}
     */
    deleteActive: function (pData) {
        if (!pData) return { ok: false, reason: "missing-input" };
        var active = pData.activePreset;
        if (active === this.PRESET_KEY_DEFAULT || active === this.PRESET_KEY_LAST) {
            return { ok: false, reason: "reserved" };
        }
        if (!pData.presets[active]) return { ok: false, reason: "not-found" };
        delete pData.presets[active];
        pData.activePreset = this.PRESET_KEY_DEFAULT;
        return { ok: true };
    },

    /**
     * Switch to a different preset.
     * @param {Object} pData - Preset wrapper (mutated).
     * @param {string} name - Target preset key.
     * @returns {Object} {ok, settings?, reason?}
     */
    selectPreset: function (pData, name) {
        if (!pData) return { ok: false, reason: "missing-input" };
        if (!pData.presets[name]) return { ok: false, reason: "not-found" };
        pData.activePreset = name;
        return { ok: true, settings: pData.presets[name] };
    }
};

// ------------------------------------------------------------------------
// Module: GM.Core — geometry and math (pure, no DOM)
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS
// ------------------------------------------------------------------------
var GM = GM || {};

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
// Module: GM.Illustrator — Adobe Illustrator DOM adapter
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS, GM.L
// ------------------------------------------------------------------------
var GM = GM || {};

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
// Module: GM.UI — ScriptUI dialog builder
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS, GM.L, GM.Config, GM.Core, GM.UIState, GM.Storage
// ------------------------------------------------------------------------
var GM = GM || {};

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
     * @param {string} value - Stored value
     * @returns {string} Display string
     */
    toDisplay: function (value) {
        if (value === GM.CONSTANTS.SENTINEL_CREATE) return GM.L.CREATE_LABEL;
        return value;
    },

    /**
     * Maps a dropdown display string back to its storage value.
     * @param {string} displayText - Dropdown selection text
     * @returns {string} Value for storage
     */
    toStorage: function (displayText) {
        if (displayText === GM.L.CREATE_LABEL) return GM.CONSTANTS.SENTINEL_CREATE;
        return displayText;
    },

    /**
     * Builds a compact edge row: enable checkbox + count/spacing radios.
     * When mirrorLabel is supplied (bottom/right edges), a mirror checkbox is
     * rendered ABOVE the row inside the same container (TD-001 — the control
     * that gates the section lives in the section). Toggling mirror on disables
     * the edge controls; toggling off restores the previous enabled state
     * (TD-003). All user interaction calls api.onChange() so the dialog can
     * refresh the modified indicator and live validation.
     *
     * @param {Object} parent - ScriptUI container.
     * @param {string} label - Edge enable label.
     * @param {Object} defaultCfg - Default edge config {enabled,useNumber,number,spacing}.
     * @param {string} [mirrorLabel] - Mirror checkbox label (bottom/right only).
     * @param {string} [mirrorTip] - Mirror checkbox helpTip.
     * @returns {Object} Edge panel API.
     */
    buildEdgePanel: function (parent, label, defaultCfg, mirrorLabel, mirrorTip) {
        var grp = parent.add("group");
        grp.orientation = "column";
        grp.alignChildren = ["left", "top"];
        grp.spacing = 4;

        var api = { onChange: function () {} };

        var mirrorCB = null;
        if (mirrorLabel) {
            mirrorCB = grp.add("checkbox", undefined, mirrorLabel);
            mirrorCB.value = false;
            mirrorCB.helpTip = mirrorTip || "";
        }

        var row = grp.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        row.spacing = 6;

        var cb = row.add("checkbox", undefined, label);
        cb.value = defaultCfg.enabled;
        cb.helpTip = GM.L.TIP_EDGE_ENABLE;
        cb.preferredSize.width = 64;

        var numRB = row.add("radiobutton", undefined, GM.L.COUNT);
        numRB.value = defaultCfg.useNumber;
        numRB.helpTip = GM.L.TIP_COUNT;
        var numIn = row.add("edittext", undefined, String(defaultCfg.number));
        numIn.preferredSize.width = 44;
        numIn.helpTip = GM.L.TIP_COUNT;

        var spcRB = row.add("radiobutton", undefined, GM.L.SPACING);
        spcRB.value = !defaultCfg.useNumber;
        spcRB.helpTip = GM.L.TIP_SPACING;
        var spcIn = row.add("edittext", undefined, String(defaultCfg.spacing));
        spcIn.preferredSize.width = 44;
        spcIn.helpTip = GM.L.TIP_SPACING;

        var _prevEnabled = defaultCfg.enabled;

        function setModeEnabled(state) {
            numRB.enabled = state;
            spcRB.enabled = state;
            numIn.enabled = state && numRB.value;
            spcIn.enabled = state && spcRB.value;
        }

        // Gate the whole row by mirror state; cb itself disabled when mirrored.
        function refresh() {
            var mirrored = !!(mirrorCB && mirrorCB.value);
            cb.enabled = !mirrored;
            setModeEnabled(!mirrored && cb.value);
        }

        numRB.onClick = function () { numIn.enabled = true; spcIn.enabled = false; api.onChange(); };
        spcRB.onClick = function () { numIn.enabled = false; spcIn.enabled = true; api.onChange(); };
        cb.onClick = function () { setModeEnabled(cb.value); api.onChange(); };
        numIn.onChanging = function () { api.onChange(); };
        numIn.onChange   = function () { api.onChange(); };
        spcIn.onChanging = function () { api.onChange(); };
        spcIn.onChange   = function () { api.onChange(); };

        if (mirrorCB) {
            mirrorCB.onClick = function () {
                if (mirrorCB.value) { _prevEnabled = cb.value; cb.value = false; }
                else { cb.value = _prevEnabled; }
                refresh();
                api.onChange();
            };
        }

        refresh();

        api.panel = grp;
        api.cb = cb;
        api.mirrorCB = mirrorCB;
        api.numRB = numRB; api.numIn = numIn; api.spcRB = spcRB; api.spcIn = spcIn;
        api.setAllEnabled = function (state) { setModeEnabled(state); };
        api.refresh = refresh;
        api.gather = function () {
            return {
                enabled: cb.value,
                useNumber: numRB.value,
                number: parseInt(numIn.text.replace(/,/g, "."), 10),
                spacing: parseFloat(spcIn.text.replace(/,/g, "."))
            };
        };
        api.apply = function (e) {
            cb.value = e.enabled;
            _prevEnabled = e.enabled;
            numRB.value = e.useNumber;
            spcRB.value = !e.useNumber;
            numIn.text = e.number;
            spcIn.text = e.spacing;
            refresh();
        };
        api.setMirror = function (v) { if (mirrorCB) mirrorCB.value = v; };
        api.getMirror = function () { return mirrorCB ? mirrorCB.value : false; };
        api.getConvertFields = function () { return [spcIn]; };
        return api;
    },

    /**
     * Adds a thin horizontal separator inside a column container.
     * @param {Object} parent - ScriptUI container.
     */
    addSeparator: function (parent) {
        var sep = parent.add("panel");
        sep.alignment = ["fill", "top"];
        sep.preferredSize.height = 1;
        return sep;
    },

    /**
     * Builds the main ScriptUI dialog (canonical single column).
     * @param {Object} pData - Preset wrapper {activePreset, presets}
     * @param {Object} layerInfo - Layer names and existence flags
     * @param {Object} swatchInfo - Swatch names and existence flags
     * @returns {Object} Dialog object with window and gatherAll methods
     */
    buildDialog: function (pData, layerInfo, swatchInfo) {
        var dlg = new Window("dialog", GM.CONSTANTS.SCRIPT_NAME + " v" + GM.CONSTANTS.VERSION);
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.margins = 20;
        dlg.spacing = 12;
        var defCfg = GM.Config.getDefaults();
        var sortedKeys = [];

        // =================================================================
        // Presets Panel
        // =================================================================
        var setPanel = dlg.add("panel", undefined, GM.L.SETTINGS_PANEL);
        setPanel.orientation = "row";
        setPanel.alignChildren = ["left", "center"];
        setPanel.margins = 15;
        setPanel.spacing = 8;

        setPanel.add("statictext", undefined, GM.L.LOAD);
        var loadDDL = setPanel.add("dropdownlist", undefined, []);
        loadDDL.preferredSize.width = 180;
        loadDDL.helpTip = GM.L.TIP_PRESET_LOAD;

        var saveBtn = setPanel.add("button", undefined, GM.L.SAVE);
        saveBtn.helpTip = GM.L.TIP_SAVE || "";
        var saveAsBtn = setPanel.add("button", undefined, GM.L.BTN_SAVE_AS);
        saveAsBtn.helpTip = GM.L.TIP_SAVE_AS;
        var deleteBtn = setPanel.add("button", undefined, GM.L.DELETE);
        deleteBtn.enabled = false;

        // =================================================================
        // Edges Panel (offsets + 4 compact edge rows, mirror inline)
        // =================================================================
        var edgesPanel = dlg.add("panel", undefined, GM.L.EDGES_PANEL);
        edgesPanel.orientation = "column";
        edgesPanel.alignChildren = ["left", "top"];
        edgesPanel.margins = 15;
        edgesPanel.spacing = 6;

        var offGrp = edgesPanel.add("group");
        offGrp.orientation = "row";
        offGrp.alignChildren = ["left", "center"];
        offGrp.spacing = 6;
        offGrp.add("statictext", undefined, GM.L.OFFSET_X);
        var offsetXIn = offGrp.add("edittext", undefined, String(defCfg.offsetX));
        offsetXIn.preferredSize.width = 44;
        offsetXIn.helpTip = GM.L.TIP_OFFSET_X;
        offGrp.add("statictext", undefined, GM.L.OFFSET_Y);
        var offsetYIn = offGrp.add("edittext", undefined, String(defCfg.offsetY));
        offsetYIn.preferredSize.width = 44;
        offsetYIn.helpTip = GM.L.TIP_OFFSET_Y;

        GM.UI.addSeparator(edgesPanel);

        var topUI    = GM.UI.buildEdgePanel(edgesPanel, GM.L.EDGE_TOP,    defCfg.top);
        var leftUI   = GM.UI.buildEdgePanel(edgesPanel, GM.L.EDGE_LEFT,   defCfg.left);

        GM.UI.addSeparator(edgesPanel);

        var bottomUI = GM.UI.buildEdgePanel(edgesPanel, GM.L.EDGE_BOTTOM, defCfg.bottom, GM.L.BOTTOM_MIRROR, GM.L.TIP_MIRROR_BOTTOM);
        var rightUI  = GM.UI.buildEdgePanel(edgesPanel, GM.L.EDGE_RIGHT,  defCfg.right,  GM.L.RIGHT_MIRROR,  GM.L.TIP_MIRROR_RIGHT);

        // =================================================================
        // Mark Panel (units, size, shape)
        // =================================================================
        var markPanel = dlg.add("panel", undefined, GM.L.MARK_PANEL);
        markPanel.orientation = "row";
        markPanel.alignChildren = ["left", "center"];
        markPanel.margins = 15;
        markPanel.spacing = 8;

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

        var layerGrp = appPanel.add("group");
        layerGrp.add("statictext", undefined, GM.L.LAYER);
        var layerDDL = layerGrp.add("dropdownlist", undefined, layerInfo.names);
        layerDDL.preferredSize.width = 200;
        layerDDL.helpTip = GM.L.TIP_LAYER;
        GM.UI.selectDDL(layerDDL, GM.L.CREATE_LABEL);

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

        var wGrp = appPanel.add("group");
        wGrp.add("statictext", undefined, GM.L.WEIGHT);
        var weightInput = wGrp.add("edittext", undefined, String(defCfg.strokeWeight));
        weightInput.preferredSize.width = 50;
        weightInput.enabled = defCfg.strokeEnabled;
        weightInput.helpTip = GM.L.TIP_WEIGHT;
        wGrp.add("statictext", undefined, GM.L.POINTS);

        // =================================================================
        // Copyright footer
        // =================================================================
        var grpCopy = dlg.add("group");
        grpCopy.alignment = ["fill", "top"];
        var stCopy = grpCopy.add("statictext", undefined,
            "© 2025–2026 Osva1d — " + GM.CONSTANTS.SCRIPT_NAME + " v" + GM.CONSTANTS.VERSION);
        stCopy.enabled = false;

        // =================================================================
        // Footer — Reset + action buttons
        // =================================================================
        var footerGrp = dlg.add("group");
        footerGrp.alignment = ["fill", "center"];
        footerGrp.spacing = 8;

        var resetBtn = footerGrp.add("button", undefined, GM.L.BTN_RESET);
        resetBtn.helpTip = GM.L.TIP_RESET;
        resetBtn.alignment = ["left", "center"];

        var spacer = footerGrp.add("group");
        spacer.alignment = ["fill", "fill"];

        footerGrp.add("button", undefined, GM.L.CANCEL, { name: "cancel" });
        footerGrp.add("button", undefined, GM.L.OK, { name: "ok" });

        // =================================================================
        // Gather & Apply  (output shapes are the contract with main.js)
        // =================================================================
        function gatherAll() {
            return {
                offsetX: parseFloat(offsetXIn.text.replace(/,/g, ".")),
                offsetY: parseFloat(offsetYIn.text.replace(/,/g, ".")),
                top: topUI.gather(),
                left: leftUI.gather(),
                bottom: bottomUI.gather(),
                right: rightUI.gather(),
                bottomMirror: bottomUI.getMirror(),
                rightMirror: rightUI.getMirror(),
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
            GM.UI.selectUnit(unitsDDL, s.units || GM.CONSTANTS.UNIT.MM);
            currentUnit = s.units || GM.CONSTANTS.UNIT.MM;

            offsetXIn.text = s.offsetX;
            offsetYIn.text = s.offsetY;

            topUI.apply(s.top);
            leftUI.apply(s.left);
            bottomUI.apply(s.bottom);
            rightUI.apply(s.right);

            bottomUI.setMirror(s.bottomMirror); bottomUI.refresh();
            rightUI.setMirror(s.rightMirror);   rightUI.refresh();

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
            onUserChange();
        };

        // =================================================================
        // Live Validation
        // =================================================================
        var numericFields = [offsetXIn, offsetYIn, sizeInput];
        if (weightInput) numericFields.push(weightInput);

        function liveValidateAll() {
            var allValid = true;
            for (var i = 0; i < numericFields.length; i++) {
                var et = numericFields[i];
                if (!et.enabled) continue;
                var str = String(et.text || "").replace(/,/g, ".");
                var n = parseFloat(str);
                var valid = !isNaN(n) && n >= 0;
                try {
                    var g = et.graphics;
                    if (g && g.newPen) {
                        var color = valid
                            ? g.newPen(g.PenType.SOLID_COLOR, [0.0, 0.0, 0.0, 1.0], 1)
                            : g.newPen(g.PenType.SOLID_COLOR, [0.85, 0.0, 0.0, 1.0], 1);
                        g.foregroundColor = color;
                    }
                } catch (e) {}
                if (!valid) allValid = false;
            }
            return allValid;
        }

        // =================================================================
        // Shared change hook — modified indicator + validation
        // =================================================================
        function onUserChange() {
            refreshModifiedIndicator();
            liveValidateAll();
        }

        // =================================================================
        // Appearance handlers
        // =================================================================
        fillCB.onClick = function () {
            fillDDL.enabled = fillCB.value;
            fillOPCB.enabled = fillCB.value;
            refreshModifiedIndicator();
        };
        strokeCB.onClick = function () {
            strokeDDL.enabled = strokeCB.value;
            strokeOPCB.enabled = strokeCB.value;
            weightInput.enabled = strokeCB.value;
            refreshModifiedIndicator();
            liveValidateAll();
        };
        fillOPCB.onClick = refreshModifiedIndicator;
        strokeOPCB.onClick = refreshModifiedIndicator;
        layerDDL.onChange = refreshModifiedIndicator;
        fillDDL.onChange = refreshModifiedIndicator;
        strokeDDL.onChange = refreshModifiedIndicator;
        roundRB.onClick = refreshModifiedIndicator;
        squareRB.onClick = refreshModifiedIndicator;

        // Edge panels notify on any internal change.
        topUI.onChange    = onUserChange;
        leftUI.onChange   = onUserChange;
        bottomUI.onChange = onUserChange;
        rightUI.onChange  = onUserChange;

        // =================================================================
        // Preset Handlers (delegating to GM.UIState)
        // =================================================================
        function refreshModifiedIndicator() {
            var modified;
            try { modified = GM.UIState.isModified(pData, gatherAll()); } catch (e) { modified = false; }
            try { saveBtn.enabled = modified; } catch (e) {}

            if (!loadDDL.selection) return;
            var idx = loadDDL.selection.index;
            var key = sortedKeys[idx];
            if (key !== pData.activePreset) return;
            var displayText = (key === GM.Config.PRESET_KEY_DEFAULT) ? GM.L.DEFAULT_PRESET : key;
            if (modified) displayText += " *";
            try { loadDDL.items[idx].text = displayText; } catch (e) {
                updatePresetList();
            }
        }

        function updatePresetList() {
            loadDDL.removeAll();
            var entries = GM.UIState.formatPresetList(pData, gatherAll(), GM.L);
            sortedKeys = [];
            var selIdx = 0;
            for (var i = 0; i < entries.length; i++) {
                loadDDL.add("item", entries[i].displayText);
                sortedKeys.push(entries[i].key);
                if (entries[i].isActive) selIdx = i;
            }
            if (loadDDL.items.length > 0) loadDDL.selection = selIdx;
            deleteBtn.enabled = (pData.activePreset !== GM.Config.PRESET_KEY_DEFAULT);
        }

        // Load initial values from [Last Settings] or active preset
        var initPreset = pData.presets[GM.Storage.PRESET_KEY_LAST] || pData.presets[pData.activePreset];
        if (initPreset) applyAll(initPreset);
        updatePresetList();

        loadDDL.onChange = function () {
            if (!loadDDL.selection) return;
            var key = sortedKeys[loadDDL.selection.index];
            if (!key || key === pData.activePreset) return;
            var r = GM.UIState.selectPreset(pData, key);
            if (!r.ok) return;
            deleteBtn.enabled = (key !== GM.Config.PRESET_KEY_DEFAULT);
            applyAll(r.settings);
            refreshModifiedIndicator();
        };

        saveBtn.onClick = function () {
            var r = GM.UIState.save(pData, gatherAll());
            if (r.ok) {
                updatePresetList();
                try { GM.Storage.save(pData); } catch (e) {}
                return;
            }
            if (r.reason === "needs-name") saveAsBtn.onClick();
        };

        saveAsBtn.onClick = function () {
            var raw = prompt(GM.L.PROMPT_SAVE_AS, "");
            if (raw === null || raw === "") return;
            var clean = GM.UIState.validatePresetName(raw);
            if (!clean) { alert(GM.L.ERR_RESERVED_NAME); return; }
            var r = GM.UIState.saveAs(pData, raw, gatherAll(), function () {
                return confirm(GM.L.ERR_PRESET_EXISTS);
            });
            if (!r.ok) return;
            updatePresetList();
            refreshModifiedIndicator();
            try { GM.Storage.save(pData); } catch (e) {}
        };

        deleteBtn.onClick = function () {
            if (!loadDDL.selection) return;
            var displayName = loadDDL.selection.text;
            if (!confirm(GM.L.format(GM.L.CONFIRM_DELETE_PRESET, displayName))) return;
            var r = GM.UIState.deleteActive(pData);
            if (!r.ok) {
                if (r.reason === "reserved") alert(GM.L.ERR_CANNOT_DELETE_DEFAULT);
                return;
            }
            updatePresetList();
            applyAll(pData.presets[GM.Config.PRESET_KEY_DEFAULT]);
            refreshModifiedIndicator();
            try { GM.Storage.save(pData); } catch (e) {}
        };

        resetBtn.onClick = function () {
            applyAll(GM.Config.getDefaults());
            refreshModifiedIndicator();
        };

        // Wire numeric edits to the shared change hook.
        var allEdits = [offsetXIn, offsetYIn, sizeInput, weightInput];
        for (var ei = 0; ei < allEdits.length; ei++) {
            if (!allEdits[ei]) continue;
            allEdits[ei].onChange = onUserChange;
            allEdits[ei].onChanging = onUserChange;
        }

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
// Module: GM.Main — entry point and artboard processing loop
// Part of: Illustrator Grommet Marks
// Depends on: GM.Illustrator, GM.Storage, GM.Validation, GM.Core, GM.UI, GM.Config
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Main = {
    run: function () {
        if (!GM.Illustrator.init()) {
            alert(GM.L.ERR_NO_DOC);
            return;
        }

        var pData = GM.Storage.load();
        if (!pData) {
            pData = {
                activePreset: GM.Config.PRESET_KEY_DEFAULT,
                presets: {}
            };
            pData.presets[GM.Config.PRESET_KEY_DEFAULT] = GM.Config.getDefaults();
        }

        var layerInfo = GM.Illustrator.getLayerNames();
        var swatchInfo = GM.Illustrator.getSwatchNames();

        var ui = GM.UI.buildDialog(pData, layerInfo, swatchInfo);

        if (ui.window.show() !== 1) return;

        var cfg = ui.gatherAll();

        var result = GM.Validation.validate(cfg, GM.L);
        if (!result.valid) return;

        // Auto-save [Last Settings]
        pData.presets[GM.Storage.PRESET_KEY_LAST] = result.settings;
        GM.Storage.save(pData);

        GM.Main.process(result.settings);

        app.redraw();
    },

    process: function (cfg) {
        try {
            var doc = GM.Illustrator.doc;

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
