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
