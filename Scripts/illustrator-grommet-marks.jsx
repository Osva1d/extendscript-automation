/*
 * ===========================================================================
 * Script:      Illustrator Grommet Marks
 * Version:     3.0.0
 * Author:      Osva1d
 * Updated:     2026-02-13
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
    VERSION: "3.0.0",
    SETTINGS_FILE_NAME: "GrommetMarksSettings.json",
    CREATE_LABEL: "[Vytvo\u0159it 'Grommet Marks']",
    LAYER_NAME: "Grommet Marks",
    SWATCH_NAME: "Grommet Marks",
    DEFAULT_PRESET: "[V\u00FDchoz\u00ED]",
    UNIT: {
        MM: "Milimetry",
        CM: "Centimetry"
    },
    UNIT_NAMES: ["Milimetry", "Centimetry"],
    UNIT_FACTORS: {
        "Milimetry": 2.834645669291339,
        "Centimetry": 28.34645669291339
    },
    UI_LABELS: {
        // Global position panel
        POSITION_PANEL: "Pozice zna\u010Dek (glob\u00E1ln\u00ED)",
        OFFSET_X: "Odsazen\u00ED X:",
        OFFSET_Y: "Odsazen\u00ED Y:",

        // Edges
        TOP: "Horn\u00ED",
        LEFT: "Lev\u00E1",
        BOTTOM_MIRROR: "Zrcadlit horn\u00ED",
        BOTTOM_CUSTOM: "Doln\u00ED \u2014 vlastn\u00ED",
        RIGHT_MIRROR: "Zrcadlit levou",
        RIGHT_CUSTOM: "Prav\u00E1 \u2014 vlastn\u00ED",

        // Edge fields
        COUNT: "Po\u010Det ok:",
        SPACING: "Rozestup:",

        // Mark options panel
        MARK_PANEL: "Zna\u010Dka",
        UNIT_LABEL: "M\u011Brn\u00E9 jednotky:",
        SIZE_LABEL: "Velikost:",
        SHAPE_LABEL: "Tvar:",
        ROUND: "Kruh",
        SQUARE: "\u010Ctverec",

        // Appearance
        APPEARANCE_PANEL: "Vzhled",
        LAYER: "Vrstva:",
        FILL: "V\u00FDpl\u0148:",
        STROKE: "Obrys:",
        OVERPRINT: "P\u0159etisk",
        WEIGHT: "Tlou\u0161\u0165ka:",
        POINTS: "pt",

        // Settings
        SETTINGS_PANEL: "Nastaven\u00ED",
        LOAD: "Na\u010D\u00EDst:",
        DELETE: "Smazat",
        SAVE: "Ulo\u017Eit",
        SAVE_TITLE: "Ulo\u017Eit nastaven\u00ED",
        NAME: "N\u00E1zev:",
        REPLACE_EXISTING: "Nahradit existuj\u00EDc\u00ED:",

        // Buttons
        OK: "OK",
        CANCEL: "Storno"
    },
    TOOLTIPS: {
        OFFSET_X: "Vzd\u00E1lenost st\u0159edu zna\u010Dek od lev\u00E9ho a prav\u00E9ho okraje artboardu",
        OFFSET_Y: "Vzd\u00E1lenost st\u0159edu zna\u010Dek od horn\u00EDho a doln\u00EDho okraje artboardu",
        COUNT: "Pevn\u00FD po\u010Det zna\u010Dek na hran\u011B (rozestup se dopo\u010D\u00EDt\u00E1)",
        SPACING: "Preferovan\u00E1 vzd\u00E1lenost mezi st\u0159edy zna\u010Dek (po\u010Det se dopo\u010D\u00EDt\u00E1)",
        MIRROR_BOTTOM: "Pou\u017Eije stejn\u00E9 nastaven\u00ED jako horn\u00ED strana",
        MIRROR_RIGHT: "Pou\u017Eije stejn\u00E9 nastaven\u00ED jako lev\u00E1 strana",
        OVERPRINT: "Zna\u010Dka bude ti\u0161t\u011Bna p\u0159es ostatn\u00ED barvy (overprint)",
        SIZE: "Pr\u016Fm\u011Br kruhu nebo d\u00E9lka strany \u010Dtverce v m\u011Brn\u00FDch jednotk\u00E1ch",
        FILL: "Barevn\u00E1 v\u00FDpl\u0148 zna\u010Dky",
        STROKE: "Obrysov\u00E1 linka zna\u010Dky",
        LAYER: "C\u00EDlov\u00E1 vrstva pro um\u00EDst\u011Bn\u00ED zna\u010Dek",
        WEIGHT: "Tlou\u0161\u0165ka obrysov\u00E9 linky v bodech (points)",
        EDGE_ENABLE: "Zapne/vypne um\u00EDst\u011Bn\u00ED zna\u010Dek na tuto hranu",
        SHAPE_ROUND: "Zna\u010Dka bude kruhov\u00E1",
        SHAPE_SQUARE: "Zna\u010Dka bude \u010Dtvercov\u00E1",
        PRESET_LOAD: "Vyberte ulo\u017Een\u00E9 nastaven\u00ED"
    }
};

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
        var L = GM.CONSTANTS.CREATE_LABEL;
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
            markLayerName: L,
            fillEnabled: true,
            fillSwatchName: L,
            fillOverprint: true,
            strokeEnabled: false,
            strokeSwatchName: L,
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
     * Migrates older settings formats to v3.0.
     * - v2.x had per-edge x/y offsets → v3 uses global offsetX/offsetY
     * - v2.x edge defs had x/y properties → v3 only has enabled/useNumber/number/spacing
     */
    migrate: function (preset) {
        // Migrate from v2 per-edge x/y to global offsetX/offsetY
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

        // Ensure bottomMirror/rightMirror exist
        if (typeof preset.bottomMirror === "undefined") preset.bottomMirror = true;
        if (typeof preset.rightMirror === "undefined") preset.rightMirror = true;

        return preset;
    },

    load: function () {
        var file = GM.Config.getSettingsFile();
        var defaults = {};
        defaults[GM.CONSTANTS.DEFAULT_PRESET] = GM.Config.getDefaults();

        if (!file.exists) return defaults;

        file.open("r");
        var content = file.read();
        file.close();

        try {
            var parsed = JSON.parse(content);
            if (!parsed[GM.CONSTANTS.DEFAULT_PRESET]) {
                parsed[GM.CONSTANTS.DEFAULT_PRESET] = GM.Config.getDefaults();
            }
            for (var k in parsed) {
                if (parsed.hasOwnProperty(k)) {
                    parsed[k] = GM.Config.migrate(parsed[k]);
                }
            }
            return parsed;
        } catch (e) {
            return defaults;
        }
    },

    save: function (allSettings) {
        var file = GM.Config.getSettingsFile();
        file.open("w");
        file.write(JSON.stringify(allSettings));
        file.close();
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
            alert("P\u0159ed spu\u0161t\u011Bn\u00EDm skriptu otev\u0159ete dokument.");
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
        var names = [GM.CONSTANTS.CREATE_LABEL];
        var has = false;
        var layers = GM.Illustrator.doc.layers;
        for (var i = 0; i < layers.length; i++) {
            var n = layers[i].name;
            names.push(n);
            if (n === GM.CONSTANTS.LAYER_NAME) has = true;
        }
        return { names: names, has: has };
    },

    getSwatchNames: function () {
        var names = [GM.CONSTANTS.CREATE_LABEL];
        var has = false;
        var swatches = GM.Illustrator.doc.swatches;
        for (var i = 0; i < swatches.length; i++) {
            var n = swatches[i].name;
            // Skip system swatches: [None]/[Zadna], [Registration]/[Registracni], etc.
            if (GM.Illustrator.isSystemSwatch(n)) continue;
            names.push(n);
            if (n === GM.CONSTANTS.SWATCH_NAME) has = true;
        }
        return { names: names, has: has };
    },

    getOrCreateLayer: function (layerName) {
        var doc = GM.Illustrator.doc;
        if (layerName === GM.CONSTANTS.CREATE_LABEL) {
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
                alert("Vrstva \"" + layerName + "\" nenalezena.");
                return null;
            }
        }
    },

    getOrCreateSwatch: function (swatchName) {
        var doc = GM.Illustrator.doc;
        if (swatchName === GM.CONSTANTS.CREATE_LABEL) {
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
                alert("Vzorn\u00EDk \"" + swatchName + "\" nenalezen.");
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
            if (typeof $ !== "undefined") {
                $.writeln("GM: placeMark failed at [" + x + ", " + y + "] - " + e);
            }
        }
    }
};

// ------------------------------------------------------------------------
// UI (ScriptUI Dialog)
// ------------------------------------------------------------------------
GM.UI = {
    /**
     * Builds a simplified edge panel with enable checkbox + count/spacing radio.
     * Global X/Y offsets are no longer per-edge (removed in v3.0).
     * @param {Panel} parent - Parent UI container
     * @param {string} label - Edge label (from GM.CONSTANTS.UI_LABELS)
     * @param {Object} defaultCfg - Default edge configuration
     * @param {number} width - Panel width in pixels
     * @returns {Object} Edge panel with gather/apply methods
     */
    buildEdgePanel: function (parent, label, defaultCfg, width) {
        var L = GM.CONSTANTS.UI_LABELS;
        var T = GM.CONSTANTS.TOOLTIPS;
        var pnl = parent.add("panel", undefined, "");
        pnl.alignChildren = ["left", "top"];
        pnl.margins = [12, 12, 12, 8];
        if (width) pnl.preferredSize.width = width;

        var cb = pnl.add("checkbox", undefined, label);
        cb.value = defaultCfg.enabled;
        cb.helpTip = T.EDGE_ENABLE;

        // Layout: Count or Spacing
        var numGrp = pnl.add("group");
        var numRB = numGrp.add("radiobutton", undefined, L.COUNT);
        numRB.value = defaultCfg.useNumber;
        numRB.helpTip = T.COUNT;
        var numIn = numGrp.add("edittext", undefined, String(defaultCfg.number));
        numIn.characters = 8;
        numIn.helpTip = T.COUNT;

        var spcGrp = pnl.add("group");
        var spcRB = spcGrp.add("radiobutton", undefined, L.SPACING);
        spcRB.value = !defaultCfg.useNumber;
        spcRB.helpTip = T.SPACING;
        var spcIn = spcGrp.add("edittext", undefined, String(defaultCfg.spacing));
        spcIn.characters = 8;
        spcIn.helpTip = T.SPACING;

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
                    number: parseInt(numIn.text, 10) || 10,
                    spacing: parseFloat(spcIn.text) || 100
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

    rebuildPresets: function (ddl, allSettings) {
        ddl.removeAll();
        var sorted = [GM.CONSTANTS.DEFAULT_PRESET];
        for (var k in allSettings) {
            if (allSettings.hasOwnProperty(k) && k !== GM.CONSTANTS.DEFAULT_PRESET) {
                sorted.push(k);
            }
        }
        for (var j = 0; j < sorted.length; j++) {
            ddl.add("item", sorted[j]);
        }
        return sorted;
    },

    /**
     * Builds the main ScriptUI dialog.
     * @param {Object} allSettings - All saved presets
     * @param {Object} layerInfo - Layer names and existence flags
     * @param {Object} swatchInfo - Swatch names and existence flags
     * @returns {Object} Dialog object with window, gatherAll, and applyAll methods
     */
    buildDialog: function (allSettings, layerInfo, swatchInfo) {
        var L = GM.CONSTANTS.UI_LABELS;
        var T = GM.CONSTANTS.TOOLTIPS;
        var dlg = new Window("dialog", GM.CONSTANTS.SCRIPT_NAME + "  v" + GM.CONSTANTS.VERSION);
        dlg.alignChildren = ["fill", "top"];
        var defCfg = GM.Config.getDefaults();

        // =================================================================
        // Global Position Panel
        // =================================================================
        var posPanel = dlg.add("panel", undefined, L.POSITION_PANEL);
        posPanel.orientation = "row";
        posPanel.alignChildren = ["left", "center"];
        posPanel.margins = [15, 14, 15, 10];

        posPanel.add("statictext", undefined, L.OFFSET_X);
        var offsetXIn = posPanel.add("edittext", undefined, String(defCfg.offsetX));
        offsetXIn.characters = 8;
        offsetXIn.helpTip = T.OFFSET_X;

        posPanel.add("statictext", undefined, L.OFFSET_Y);
        var offsetYIn = posPanel.add("edittext", undefined, String(defCfg.offsetY));
        offsetYIn.characters = 8;
        offsetYIn.helpTip = T.OFFSET_Y;

        // =================================================================
        // Edge Panels — Row 1: Top + Left
        // =================================================================
        var row1 = dlg.add("group");
        row1.orientation = "row";
        row1.alignChildren = ["fill", "top"];

        var topUI = GM.UI.buildEdgePanel(row1, L.TOP, defCfg.top, 280);
        var leftUI = GM.UI.buildEdgePanel(row1, L.LEFT, defCfg.left, 280);

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
        var bottomMirrorCB = bottomOuter.add("checkbox", undefined, L.BOTTOM_MIRROR);
        bottomMirrorCB.value = defCfg.bottomMirror;
        bottomMirrorCB.helpTip = T.MIRROR_BOTTOM;
        var bottomUI = GM.UI.buildEdgePanel(bottomOuter, L.BOTTOM_CUSTOM, defCfg.bottom, 280);

        // Right column
        var rightOuter = row2.add("group");
        rightOuter.orientation = "column";
        rightOuter.alignChildren = ["fill", "top"];
        rightOuter.preferredSize.width = 280;
        var rightMirrorCB = rightOuter.add("checkbox", undefined, L.RIGHT_MIRROR);
        rightMirrorCB.value = defCfg.rightMirror;
        rightMirrorCB.helpTip = T.MIRROR_RIGHT;
        var rightUI = GM.UI.buildEdgePanel(rightOuter, L.RIGHT_CUSTOM, defCfg.right, 280);

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
        var markPanel = dlg.add("panel", undefined, L.MARK_PANEL);
        markPanel.orientation = "row";
        markPanel.alignChildren = ["left", "center"];
        markPanel.margins = [15, 14, 15, 10];

        markPanel.add("statictext", undefined, L.UNIT_LABEL);
        var unitsDDL = markPanel.add("dropdownlist", undefined, GM.CONSTANTS.UNIT_NAMES);
        unitsDDL.selection = 0;

        markPanel.add("statictext", undefined, L.SIZE_LABEL);
        var sizeInput = markPanel.add("edittext", undefined, String(defCfg.markSize));
        sizeInput.characters = 8;
        sizeInput.helpTip = T.SIZE;

        markPanel.add("statictext", undefined, L.SHAPE_LABEL);
        var roundRB = markPanel.add("radiobutton", undefined, L.ROUND);
        roundRB.value = defCfg.isRound;
        roundRB.helpTip = T.SHAPE_ROUND;
        var squareRB = markPanel.add("radiobutton", undefined, L.SQUARE);
        squareRB.value = !defCfg.isRound;
        squareRB.helpTip = T.SHAPE_SQUARE;

        // =================================================================
        // Appearance Panel (layer, fill, stroke)
        // =================================================================
        var appPanel = dlg.add("panel", undefined, L.APPEARANCE_PANEL);
        appPanel.alignChildren = ["left", "top"];
        appPanel.margins = [15, 14, 15, 10];

        // Layer
        var layerGrp = appPanel.add("group");
        layerGrp.add("statictext", undefined, L.LAYER);
        var layerDDL = layerGrp.add("dropdownlist", undefined, layerInfo.names);
        layerDDL.preferredSize.width = 200;
        layerDDL.helpTip = T.LAYER;
        GM.UI.selectDDL(layerDDL, GM.CONSTANTS.LAYER_NAME);

        // Fill
        var fillGrp = appPanel.add("group");
        var fillCB = fillGrp.add("checkbox", undefined, L.FILL);
        fillCB.value = defCfg.fillEnabled;
        fillCB.helpTip = T.FILL;
        var fillDDL = fillGrp.add("dropdownlist", undefined, swatchInfo.names);
        fillDDL.preferredSize.width = 180;
        GM.UI.selectDDL(fillDDL, GM.CONSTANTS.SWATCH_NAME);
        var fillOPCB = fillGrp.add("checkbox", undefined, L.OVERPRINT);
        fillOPCB.value = defCfg.fillOverprint;
        fillOPCB.helpTip = T.OVERPRINT;

        // Stroke
        var strokeGrp = appPanel.add("group");
        var strokeCB = strokeGrp.add("checkbox", undefined, L.STROKE);
        strokeCB.value = defCfg.strokeEnabled;
        strokeCB.helpTip = T.STROKE;
        var strokeDDL = strokeGrp.add("dropdownlist", undefined, swatchInfo.names);
        strokeDDL.preferredSize.width = 180;
        strokeDDL.enabled = defCfg.strokeEnabled;
        GM.UI.selectDDL(strokeDDL, GM.CONSTANTS.SWATCH_NAME);
        var strokeOPCB = strokeGrp.add("checkbox", undefined, L.OVERPRINT);
        strokeOPCB.value = defCfg.strokeOverprint;
        strokeOPCB.helpTip = T.OVERPRINT;
        strokeOPCB.enabled = defCfg.strokeEnabled;

        // Weight
        var wGrp = appPanel.add("group");
        wGrp.add("statictext", undefined, L.WEIGHT);
        var weightInput = wGrp.add("edittext", undefined, String(defCfg.strokeWeight));
        weightInput.characters = 6;
        weightInput.enabled = defCfg.strokeEnabled;
        weightInput.helpTip = T.WEIGHT;
        wGrp.add("statictext", undefined, L.POINTS);

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
            var newUnit = unitsDDL.selection.text;
            if (newUnit === currentUnit) return;
            var fields = [offsetXIn, offsetYIn, sizeInput]
                .concat(topUI.getConvertFields())
                .concat(leftUI.getConvertFields())
                .concat(bottomUI.getConvertFields())
                .concat(rightUI.getConvertFields());

            for (var i = 0; i < fields.length; i++) {
                var v = parseFloat(fields[i].text);
                if (!isNaN(v)) {
                    fields[i].text = GM.Core.round(GM.Core.convertVal(v, currentUnit, newUnit));
                }
            }
            currentUnit = newUnit;
        };

        // =================================================================
        // Settings Panel
        // =================================================================
        var setPanel = dlg.add("panel", undefined, L.SETTINGS_PANEL);
        setPanel.orientation = "row";
        setPanel.alignChildren = ["left", "center"];
        setPanel.margins = [15, 12, 15, 10];

        setPanel.add("statictext", undefined, L.LOAD);
        var loadDDL = setPanel.add("dropdownlist", undefined, []);
        loadDDL.preferredSize.width = 200;
        loadDDL.helpTip = T.PRESET_LOAD;

        var sortedPresets = GM.UI.rebuildPresets(loadDDL, allSettings);
        loadDDL.selection = 0;

        var deleteBtn = setPanel.add("button", undefined, L.DELETE);
        deleteBtn.enabled = false;
        var saveBtn = setPanel.add("button", undefined, L.SAVE);

        // =================================================================
        // OK / Cancel Buttons
        // =================================================================
        var btnGrp = dlg.add("group");
        btnGrp.alignment = "center";
        btnGrp.add("button", undefined, L.OK, { name: "ok" });
        btnGrp.add("button", undefined, L.CANCEL, { name: "cancel" });

        // =================================================================
        // Gather & Apply
        // =================================================================
        function gatherAll() {
            return {
                offsetX: parseFloat(offsetXIn.text) || 7,
                offsetY: parseFloat(offsetYIn.text) || 7,
                top: topUI.gather(),
                left: leftUI.gather(),
                bottom: bottomUI.gather(),
                right: rightUI.gather(),
                bottomMirror: bottomMirrorCB.value,
                rightMirror: rightMirrorCB.value,
                units: unitsDDL.selection ? unitsDDL.selection.text : GM.CONSTANTS.UNIT.MM,
                markSize: parseFloat(sizeInput.text) || 3,
                isRound: roundRB.value,
                markLayerName: layerDDL.selection ? layerDDL.selection.text : GM.CONSTANTS.CREATE_LABEL,
                fillEnabled: fillCB.value,
                fillSwatchName: fillDDL.selection ? fillDDL.selection.text : GM.CONSTANTS.CREATE_LABEL,
                fillOverprint: fillOPCB.value,
                strokeEnabled: strokeCB.value,
                strokeSwatchName: strokeDDL.selection ? strokeDDL.selection.text : GM.CONSTANTS.CREATE_LABEL,
                strokeOverprint: strokeOPCB.value,
                strokeWeight: parseFloat(weightInput.text) || 1
            };
        }

        function applyAll(s) {
            GM.UI.selectDDL(unitsDDL, s.units || GM.CONSTANTS.UNIT.MM);
            currentUnit = s.units || GM.CONSTANTS.UNIT.MM;

            offsetXIn.text = s.offsetX;
            offsetYIn.text = s.offsetY;

            topUI.apply(s.top);
            leftUI.apply(s.left);
            bottomUI.apply(s.bottom);
            rightUI.apply(s.right);

            bottomMirrorCB.value = s.bottomMirror;
            rightMirrorCB.value = s.rightMirror;
            updateMirrors();

            sizeInput.text = s.markSize;
            roundRB.value = s.isRound;
            squareRB.value = !s.isRound;

            GM.UI.selectDDL(layerDDL, s.markLayerName);

            fillCB.value = s.fillEnabled;
            GM.UI.selectDDL(fillDDL, s.fillSwatchName);
            fillOPCB.value = s.fillOverprint;
            fillDDL.enabled = s.fillEnabled;
            fillOPCB.enabled = s.fillEnabled;

            strokeCB.value = s.strokeEnabled;
            GM.UI.selectDDL(strokeDDL, s.strokeSwatchName);
            strokeOPCB.value = s.strokeOverprint;
            weightInput.text = s.strokeWeight;
            strokeDDL.enabled = s.strokeEnabled;
            strokeOPCB.enabled = s.strokeEnabled;
            weightInput.enabled = s.strokeEnabled;
        }

        // =================================================================
        // Preset Handlers
        // =================================================================
        applyAll(allSettings[GM.CONSTANTS.DEFAULT_PRESET]);

        loadDDL.onChange = function () {
            if (!loadDDL.selection) return;
            var n = loadDDL.selection.text;
            deleteBtn.enabled = (n !== GM.CONSTANTS.DEFAULT_PRESET);
            var s = allSettings[n];
            if (s) applyAll(s);
        };

        deleteBtn.onClick = function () {
            if (!loadDDL.selection) return;
            var n = loadDDL.selection.text;
            if (n === GM.CONSTANTS.DEFAULT_PRESET) {
                alert("V\u00FDchoz\u00ED nastaven\u00ED nelze smazat.");
                return;
            }
            if (!confirm("Trvale smazat nastaven\u00ED \"" + n + "\"?")) return;
            delete allSettings[n];
            GM.Config.save(allSettings);
            sortedPresets = GM.UI.rebuildPresets(loadDDL, allSettings);
            loadDDL.selection = 0;
        };

        saveBtn.onClick = function () {
            var sd = new Window("dialog", L.SAVE_TITLE);
            sd.alignChildren = ["fill", "top"];
            var ng = sd.add("group");
            ng.add("statictext", undefined, L.NAME);
            var ni = ng.add("edittext", undefined, "");
            ni.characters = 25;
            ni.active = true;

            var rc = sd.add("checkbox", undefined, L.REPLACE_EXISTING);
            var rd = sd.add("dropdownlist", undefined, sortedPresets);
            rd.selection = 0;
            rd.enabled = false;
            rc.onClick = function () { rd.enabled = rc.value; ni.enabled = !rc.value; };

            var bg = sd.add("group");
            bg.alignment = "center";
            bg.add("button", undefined, L.OK, { name: "ok" });
            bg.add("button", undefined, L.CANCEL, { name: "cancel" });

            if (sd.show() === 1) {
                var sn;
                if (rc.value && rd.selection) {
                    sn = rd.selection.text;
                } else {
                    sn = ni.text;
                    if (!sn || !sn.length) { alert("Zadejte n\u00E1zev."); return; }
                    if (allSettings[sn] && sn !== GM.CONSTANTS.DEFAULT_PRESET) {
                        if (!confirm("Nastaven\u00ED \"" + sn + "\" ji\u017E existuje. Nahradit?")) return;
                    }
                }
                allSettings[sn] = gatherAll();
                GM.Config.save(allSettings);
                sortedPresets = GM.UI.rebuildPresets(loadDDL, allSettings);
                GM.UI.selectDDL(loadDDL, sn);
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
    run: function () {
        if (!GM.Illustrator.init()) return;

        var settings = GM.Config.load();
        var layerInfo = GM.Illustrator.getLayerNames();
        var swatchInfo = GM.Illustrator.getSwatchNames();

        var ui = GM.UI.buildDialog(settings, layerInfo, swatchInfo);

        if (ui.window.show() !== 1) return;

        var cfg = ui.gatherAll();
        GM.Main.process(cfg);

        app.redraw();
    },

    process: function (cfg) {
        var doc = GM.Illustrator.doc;

        // Resolve effective edge configs (mirror = copy from opposite)
        var topCfg = cfg.top;
        var leftCfg = cfg.left;
        var bottomCfg = cfg.bottomMirror ? topCfg : cfg.bottom;
        var rightCfg = cfg.rightMirror ? leftCfg : cfg.right;

        // Check if any edge is enabled
        var topOn = topCfg.enabled;
        var leftOn = leftCfg.enabled;
        var bottomOn = cfg.bottomMirror ? topOn : bottomCfg.enabled;
        var rightOn = cfg.rightMirror ? leftOn : rightCfg.enabled;

        if (!topOn && !leftOn && !bottomOn && !rightOn) {
            alert("Mus\u00ED b\u00FDt zapnut\u00E1 alespo\u0148 jedna hrana.");
            return;
        }

        if (!cfg.fillEnabled && !cfg.strokeEnabled) {
            alert("Zna\u010Dky mus\u00ED m\u00EDt v\u00FDpl\u0148 a/nebo obrys.");
            return;
        }

        // Input validation
        if (cfg.markSize <= 0) {
            alert("Velikost zna\u010Dky mus\u00ED b\u00FDt kladn\u00E9 \u010D\u00EDslo.");
            return;
        }
        if (cfg.offsetX < 0 || cfg.offsetY < 0) {
            alert("Odsazen\u00ED X a Y nesm\u00ED b\u00FDt z\u00E1porn\u00E9.");
            return;
        }

        var unitFactor = GM.CONSTANTS.UNIT_FACTORS[cfg.units];
        var targetLayer = GM.Illustrator.getOrCreateLayer(cfg.markLayerName);
        if (!targetLayer) return;

        var fillColor = cfg.fillEnabled ? GM.Illustrator.getOrCreateSwatch(cfg.fillSwatchName) : null;
        var strokeColor = cfg.strokeEnabled ? GM.Illustrator.getOrCreateSwatch(cfg.strokeSwatchName) : null;

        if (cfg.fillEnabled && !fillColor) return;
        if (cfg.strokeEnabled && !strokeColor) return;

        var markSizePoints = cfg.markSize * unitFactor;
        var radius = markSizePoints / 2;

        // Global offsets in user units
        var offX = cfg.offsetX;
        var offY = cfg.offsetY;

        /** Places a mark at center coordinates (x, y) in document space */
        var placed = {};  // Deduplication hash: prevents duplicate marks at corners
        function place(x, y) {
            var key = Math.round(x) + "|" + Math.round(y);
            if (placed[key]) return;  // Skip if already placed at this position
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
            var abHeight = abTop - abBottom; // positive value

            // Top edge: marks along width, offset Y from top
            if (topOn) {
                var tPositions = GM.Core.calcPositions(topCfg, abWidth, offX, unitFactor);
                var tY = abTop - (offY * unitFactor);
                for (var ti = 0; ti < tPositions.length; ti++) {
                    place(abLeft + tPositions[ti], tY);
                }
            }

            // Bottom edge: marks along width, offset Y from bottom
            if (bottomOn) {
                var bPositions = GM.Core.calcPositions(bottomCfg, abWidth, offX, unitFactor);
                var bY = abBottom + (offY * unitFactor);
                for (var bi = 0; bi < bPositions.length; bi++) {
                    place(abLeft + bPositions[bi], bY);
                }
            }

            // Left edge: marks along height, offset X from left
            if (leftOn) {
                var lPositions = GM.Core.calcPositions(leftCfg, abHeight, offY, unitFactor);
                var lX = abLeft + (offX * unitFactor);
                for (var li = 0; li < lPositions.length; li++) {
                    place(lX, abTop - lPositions[li]);
                }
            }

            // Right edge: marks along height, offset X from right
            if (rightOn) {
                var rPositions = GM.Core.calcPositions(rightCfg, abHeight, offY, unitFactor);
                var rX = abRight - (offX * unitFactor);
                for (var ri = 0; ri < rPositions.length; ri++) {
                    place(rX, abTop - rPositions[ri]);
                }
            }
        }
    }
};

// Run
GM.Main.run();

})();
