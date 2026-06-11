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
     * Resolves a layer config value to the actual layer name.
     * The SENTINEL_CREATE sentinel maps to the default "Grommet Marks" name;
     * any other value is an explicit layer name.
     * @param {string} layerName - Layer name or SENTINEL_CREATE.
     * @returns {string} Resolved layer name.
     */
    resolveLayerName: function (layerName) {
        return (layerName === GM.CONSTANTS.SENTINEL_CREATE)
            ? GM.CONSTANTS.LAYER_NAME : layerName;
    },

    /**
     * Returns true if a layer with the given name exists in the document.
     * @param {string} name - Resolved layer name.
     * @returns {boolean}
     */
    layerExists: function (name) {
        try {
            GM.Illustrator.doc.layers.getByName(name);
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Resolves the target layer by name, creating it if absent.
     *
     * A layer is a low-risk container (unlike a colour, it cannot mis-separate
     * on output), so a missing target is created and drawn into rather than
     * aborting — matching the SENTINEL_CREATE default and ZSM's getLay. The
     * sentinel resolves to the default "Grommet Marks" name; any other value is
     * taken as an explicit layer name.
     *
     * @param {string} layerName - Layer name or SENTINEL_CREATE.
     * @returns {Layer} Target layer (created if it didn't exist).
     */
    getOrCreateLayer: function (layerName) {
        var doc = GM.Illustrator.doc;
        var name = GM.Illustrator.resolveLayerName(layerName);
        try {
            return doc.layers.getByName(name);
        } catch (e) {
            var l = doc.layers.add();
            l.name = name;
            return l;
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
                // Named swatch missing → null signals the caller, which degrades
                // to registrationColor() + a warning (never silently auto-create
                // a surprise spot — unsafe for prepress output).
                return null;
            }
        }
    },

    /**
     * Returns the document's [Registration] swatch colour (swatches[1] in any
     * AI locale; index 0 is [None]), or 100% K CMYK as a last-resort fallback.
     * The index assumption is VERIFIED (spot.colorType must be REGISTRATION) —
     * the user can delete [Registration] from the Swatches panel, and then
     * swatches[1] is an arbitrary swatch that would silently mis-colour the
     * fallback marks. Used when a named fill/stroke swatch is missing — marks
     * degrade to a safe, cutter-readable colour instead of being dropped.
     * @returns {Color} Registration (or black) colour.
     */
    registrationColor: function () {
        try {
            var c = GM.Illustrator.doc.swatches[1].color;
            if (c && c.typename === "SpotColor" && c.spot &&
                c.spot.colorType === ColorModel.REGISTRATION) {
                return c;
            }
        } catch (e) {}
        var k = new CMYKColor();
        k.cyan = 0; k.magenta = 0; k.yellow = 0; k.black = 100;
        return k;
    },

    /**
     * Places a single mark on the target layer.
     * x, y are the CENTER coordinates of the mark in document space.
     * @returns {boolean} True if the mark was placed — the caller counts
     * failures and surfaces one summary warning (never per-mark alert spam,
     * never silently missing marks on prepress output).
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
            return true;
        } catch (e) {
            $.writeln("placeMark [" + x + ", " + y + "]: " + e.message);
            return false;
        }
    }
};
