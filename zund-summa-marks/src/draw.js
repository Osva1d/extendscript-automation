var ZSM = ZSM || {};

ZSM.Draw = {
    /** @type {Array} AUTO_SPOT_COLOR - CMYK fallback for auto-created spot swatches [C,M,Y,K] */
    AUTO_SPOT_COLOR: [0, 100, 0, 0],

    /** @private Storage for layers locked at session start {index, name}, restored on end. */
    _lockedLayers: [],
    /** @private Storage for layers hidden at session start {index, name}, restored on end. */
    _hiddenLayers: [],

    // -------------------------------------------------------------------------
    // Session management
    // -------------------------------------------------------------------------

    /**
     * Unlocks and makes all layers visible before rendering.
     * Stores locked layer names so endSession() can restore them.
     */
    beginSession: function () {
        var doc = app.activeDocument;
        this._lockedLayers = [];
        this._hiddenLayers = [];
        for (var i = 0; i < doc.layers.length; i++) {
            try {
                // Skip artifact layers (bracket-prefixed names like <Clip Group>)
                // — modifying their state can crash Illustrator at C++ level.
                if (this._isArtifactLayer(doc.layers[i])) continue;

                if (doc.layers[i].locked) {
                    this._lockedLayers.push({ idx: i, name: doc.layers[i].name });
                    doc.layers[i].locked = false;
                }
                if (!doc.layers[i].visible) {
                    this._hiddenLayers.push({ idx: i, name: doc.layers[i].name });
                    doc.layers[i].visible = true;
                }
            } catch (e) {
                ZSM.Utils.log("beginSession: failed to unlock layer — " + doc.layers[i].name);
            }
        }
    },

    /**
     * Restores layer locks that were cleared by beginSession().
     */
    endSession: function () {
        var doc = app.activeDocument;
        // Restore by index first (stable after script adds/removes layers at
        // the top of the stack). Fall back to getByName if the index no longer
        // points to the same layer (e.g. user layers were reordered by render).
        for (var i = 0; i < this._lockedLayers.length; i++) {
            try {
                var rec = this._lockedLayers[i];
                var lay = (rec.idx < doc.layers.length && doc.layers[rec.idx].name === rec.name)
                    ? doc.layers[rec.idx]
                    : doc.layers.getByName(rec.name);
                lay.locked = true;
            } catch (e) {}
        }
        for (var i = 0; i < this._hiddenLayers.length; i++) {
            try {
                var rec = this._hiddenLayers[i];
                var lay = (rec.idx < doc.layers.length && doc.layers[rec.idx].name === rec.name)
                    ? doc.layers[rec.idx]
                    : doc.layers.getByName(rec.name);
                lay.visible = false;
            } catch (e) {}
        }
        this._lockedLayers = [];
        this._hiddenLayers = [];
    },

    // -------------------------------------------------------------------------
    // Bounds
    // -------------------------------------------------------------------------

    /**
     * Returns combined geometric bounds of all artwork items.
     * In Fixed/Artboard mode returns the active artboard rect directly.
     * Skips items on system layers (Regmarks, Graphics) and hidden layers.
     * Handles clipped groups by measuring the clip mask path, not the group.
     *
     * Iterates doc.pageItems directly instead of using the former
     * app.executeMenuCommand('selectall') approach. selectall goes through
     * Illustrator's C++ command pipeline and can crash the application when
     * the DOM is in an inconsistent state (e.g. after partial undo of a
     * previous script run). doc.pageItems is a flat recursive collection,
     * so items nested inside groups are skipped via a parent check —
     * groups themselves are measured via _getEffectiveBounds() which
     * respects clipping masks. If .parent is unreliable (known ExtendScript
     * edge case), the item is skipped conservatively.
     *
     * @param {Object} s - Settings (uses s.useArtboardBounds).
     * @returns {Array|null} [L, T, R, B] in document points, or null.
     */
    getBounds: function (s) {
        var doc = app.activeDocument;

        if (s && s.useArtboardBounds) {
            var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
            return ab.artboardRect;
        }

        var b = [Infinity, -Infinity, -Infinity, Infinity];
        var found = false;
        var pageItems = doc.pageItems;
        // Cache length — ExtendScript re-queries the live DOM on each access
        var piLen = pageItems.length;

        for (var i = 0; i < piLen; i++) {
            try {
                var item = pageItems[i];

                // Skip item types that cannot reliably report bounds
                // (PluginItems, RasterItems with missing links, graph objects)
                var tn = item.typename;
                if (tn === "PluginItem" || tn === "NonNativeItem") continue;

                // Skip items nested inside groups — their bounds are accounted
                // for when we measure the parent group via _getEffectiveBounds.
                // .parent can be unreliable in rare ExtendScript edge cases;
                // failures are caught and the item is skipped conservatively.
                try {
                    if (item.parent && item.parent.typename === "GroupItem") continue;
                } catch (pe) { continue; }

                // Skip system and artifact layers
                try {
                    if (item.layer) {
                        var layName = item.layer.name;
                        if (layName === ZSM.Config.layerRegmarks) continue;

                        // Skip items on artifact layers (bracket-prefixed names)
                        var fc = layName.charAt(0);
                        if (fc === '<' || fc === '(') continue;

                        // Skip trim-line sublayer inside Graphics (from previous run).
                        // Don't skip the Graphics layer itself — it contains user artwork.
                        if (layName === "Trim") {
                            try { if (item.layer.parent.name === ZSM.Config.layerGraphics) continue; } catch (e2) {}
                        }

                        // Skip items from layers hidden before session started
                        var wasHidden = false;
                        for (var h = 0; h < this._hiddenLayers.length; h++) {
                            if (layName === this._hiddenLayers[h]) { wasHidden = true; break; }
                        }
                        if (wasHidden) continue;
                    }
                } catch (le) { continue; }

                // Skip guide paths — guides placed far outside the canvas would
                // inflate bounds to extreme values, causing artboard resize to fail.
                if ((item.typename === "PathItem" || item.typename === "CompoundPathItem") && item.guides) continue;

                // For clipped groups (including nested), measure the clip mask
                // path instead of the whole group. Clip mask is always the
                // first child (top-most) in a clipping group — AI convention.
                var g = this._getEffectiveBounds(item);

                if (g) {
                    b[0] = Math.min(b[0], g[0]);
                    b[1] = Math.max(b[1], g[1]);
                    b[2] = Math.max(b[2], g[2]);
                    b[3] = Math.min(b[3], g[3]);
                    found = true;
                }
            } catch (e) {
                // Skip items that cannot be accessed safely (zombie/corrupted
                // references after undo or DOM inconsistency).
            }
        }

        return found ? b : null;
    },

    // -------------------------------------------------------------------------
    // Rendering
    // -------------------------------------------------------------------------

    /**
     * Renders all geometry into the Illustrator document.
     * Draw order: resize artboard → layers → Zünd marks → Summa marks →
     *             Summa bar → trim lines → redraw.
     *
     * @param {Object} geo - Geometry from ZSM.Core.calculateAll().
     * @param {Object} s   - Settings from UI.
     */
    render: function (geo, s) {
        var doc = app.activeDocument;

        try {
            // 1. Resize artboard (Auto-fit mode only)
            // Validate bounds before setting — coordinates beyond ~16383pt
            // (227in / 5765mm) crash Illustrator at C++ level.
            if (!s.useArtboardBounds) {
                var abMax = 16383;
                if (Math.abs(geo.ab[0]) > abMax || Math.abs(geo.ab[1]) > abMax ||
                    Math.abs(geo.ab[2]) > abMax || Math.abs(geo.ab[3]) > abMax) {
                    ZSM.Utils.error(ZSM.L.ERR_GENERIC
                        ? ZSM.L.format(ZSM.L.ERR_GENERIC, "Artboard exceeds maximum size (5765 mm).")
                        : "Artboard exceeds maximum size.");
                    return;
                }
                var activeIdx = doc.artboards.getActiveArtboardIndex();
                doc.artboards[activeIdx].artboardRect = geo.ab;
            }

            // 2. Prepare Regmarks layer at front — clear old content first
            var reg = this.getLay(ZSM.Config.layerRegmarks);
            this._clearLayer(reg);
            reg.zOrder(ZOrderMethod.BRINGTOFRONT);
            var refLayer = reg;

            // 3. Dynamic layer mapping — move spot-colored paths to named layers
            // Row existence = active (no checkbox in new UI design)
            if (s.layers && s.layers.length > 0) {
                for (var i = 0; i < s.layers.length; i++) {
                    var layDef = s.layers[i];
                    if (layDef.name && layDef.color && layDef.color !== "") {
                        var targetLay = this.getLay(layDef.name);
                        var hit = this.movePaths(targetLay, [layDef.color]);
                        if (!hit) {
                            geo.warnings.push(ZSM.L.format(ZSM.L.ERR_COLOR_MISSING, layDef.color));
                        }
                        targetLay.move(refLayer, ElementPlacement.PLACEAFTER);
                        refLayer = targetLay;
                    }
                }
            }

            // 4. Draw Zünd marks (circles)
            var col = this.getCol(s.markColor);
            doc.activeLayer = reg;

            var sf   = ZSM.Utils.getSF();
            var zSize = (Number(s.markSizeZ) || 5.0) / sf;
            var rZ   = ZSM.Utils.mm2pt(zSize / 2);

            // Illustrator max coordinate ~16383pt (227in). Creating items
            // beyond this crashes at C++ level — validate before drawing.
            var MAX_COORD = 16383;

            var marksZ = geo.marksZ;
            for (var z = 0; z < marksZ.length; z++) {
                var m = marksZ[z];
                if (isNaN(m.cx) || isNaN(m.cy) || Math.abs(m.cx) > MAX_COORD || Math.abs(m.cy) > MAX_COORD) continue;
                try {
                    var circle = reg.pathItems.ellipse(m.cy + rZ, m.cx - rZ, rZ * 2, rZ * 2);
                    circle.fillColor     = col;
                    circle.fillOverprint = true;
                    circle.stroked       = false;
                } catch (e) {
                    ZSM.Utils.log("render: failed to draw Zünd mark at index " + z);
                }
            }

            // 5. Draw Summa marks (squares)
            var sSize = (Number(s.markSizeS) || 3.0) / sf;
            var rS   = ZSM.Utils.mm2pt(sSize / 2);

            var marksS = geo.marksS;
            for (var sm = 0; sm < marksS.length; sm++) {
                var m = marksS[sm];
                if (isNaN(m.cx) || isNaN(m.cy) || Math.abs(m.cx) > MAX_COORD || Math.abs(m.cy) > MAX_COORD) continue;
                try {
                    var sq = reg.pathItems.rectangle(m.cy + rS, m.cx - rS, rS * 2, rS * 2);
                    sq.fillColor     = col;
                    sq.fillOverprint = true;
                    sq.stroked       = false;
                } catch (e) {
                    ZSM.Utils.log("render: failed to draw Summa mark at index " + sm);
                }
            }

            // 6. Draw Summa registration bar
            if (geo.barS) {
                try {
                    var bar = reg.pathItems.add();
                    bar.setEntirePath([[geo.barS.x1, geo.barS.y], [geo.barS.x2, geo.barS.y]]);
                    bar.strokeColor     = col;
                    bar.strokeOverprint = true;
                    bar.strokeWidth     = geo.barS.w;
                    bar.filled          = false;
                } catch (e) {
                    ZSM.Utils.log("render: failed to draw OPOS bar");
                }
            }

            // 7. Name bottom layer as Graphics and draw trim lines into it.
            //    Assumption: the bottom-most layer is the user's artwork layer.
            //    In multi-layer documents, only the absolute bottom layer is renamed.
            var gfxLayer = doc.layers[doc.layers.length - 1];
            if (gfxLayer.name !== ZSM.Config.layerRegmarks && !this._isArtifactLayer(gfxLayer)) {
                // Track rename so endSession() can restore locks/visibility (W3)
                var oldGfxName = gfxLayer.name;
                gfxLayer.name    = ZSM.Config.layerGraphics;
                for (var li = 0; li < this._lockedLayers.length; li++) {
                    if (this._lockedLayers[li] === oldGfxName) {
                        this._lockedLayers[li] = ZSM.Config.layerGraphics; break;
                    }
                }
                for (var li = 0; li < this._hiddenLayers.length; li++) {
                    if (this._hiddenLayers[li] === oldGfxName) {
                        this._hiddenLayers[li] = ZSM.Config.layerGraphics; break;
                    }
                }
                gfxLayer.locked  = false;
                gfxLayer.visible = true;
                gfxLayer.zOrder(ZOrderMethod.SENDTOBACK);

                if (geo.red.length > 0) {
                    // Draw trim lines into a sublayer to keep them
                    // separate from artwork but inside the print layer.
                    // Remove previous Trim sublayer to prevent accumulation.
                    try {
                        var oldTrim = gfxLayer.layers.getByName("Trim");
                        oldTrim.remove();
                    } catch (e) { /* no previous Trim — first run */ }
                    var trimLayer = gfxLayer.layers.add();
                    trimLayer.name = "Trim";

                    var redColor = new CMYKColor();
                    redColor.magenta = 100;
                    redColor.yellow  = 100;
                    for (var r = 0; r < geo.red.length; r++) {
                        try {
                            var line = trimLayer.pathItems.add();
                            line.setEntirePath([
                                [geo.red[r].x1, geo.red[r].y1],
                                [geo.red[r].x2, geo.red[r].y2]
                            ]);
                            line.strokeColor = redColor;
                            line.strokeWidth = geo.red[r].w;
                            line.filled      = false;
                        } catch (e) {
                            ZSM.Utils.log("render: failed to draw trim line at index " + r);
                        }
                    }
                }
            }

            if (geo.warnings.length > 0) ZSM.Utils.error(geo.warnings.join("\n"));
            app.redraw();

        } catch (e) {
            ZSM.Utils.error(ZSM.L.ERR_RENDER_CRITICAL + e.message);
        }
    },

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Removes all page items and sublayers from a layer, leaving it empty.
     * Used to clear old Regmarks before re-rendering.
     * @param {Layer} layer - Layer to clear.
     * @private
     */
    _clearLayer: function (layer) {
        try {
            // Remove sublayers first
            while (layer.layers.length > 0) {
                try { layer.layers[0].remove(); } catch (e) { break; }
            }
            // Remove page items (iterate backwards to avoid index shifts)
            var items = layer.pageItems;
            for (var i = items.length - 1; i >= 0; i--) {
                try { items[i].remove(); } catch (e) {}
            }
        } catch (e) {
            ZSM.Utils.log("_clearLayer: " + e.message);
        }
    },

    /**
     * Detects Illustrator artifact layers with bracket-prefixed names.
     * These are auto-created by operations like Release Clipping Mask
     * (<Clip Group>), Release Compound Path (<Compound Path>), or
     * Isolation Mode artifacts. Modifying their lock/visibility state
     * can cause C++ level crashes that try/catch cannot intercept.
     *
     * @param {Layer} layer - Layer to test.
     * @returns {boolean} True if layer has a bracket-prefixed name.
     * @private
     */
    _isArtifactLayer: function (layer) {
        try {
            var c = layer.name.charAt(0);
            return c === '<' || c === '(';
        } catch (e) { return true; }
    },

    /**
     * Returns effective geometric bounds of an item, respecting clipping
     * masks at any nesting depth. For a clipped group, returns the clip
     * mask bounds. For a non-clipped group, recursively merges children's
     * effective bounds (so a clipped subgroup inside a plain group is
     * handled correctly). For leaf items, returns geometricBounds directly.
     *
     * @param {PageItem} item - Item to measure.
     * @returns {Array|null} [L, T, R, B] in document points, or null on failure.
     * @private
     */
    _getEffectiveBounds: function (item) {
        // Iterative traversal using an explicit stack to avoid stack overflow.
        // ExtendScript has a call stack limit of ~100-200 frames; deeply nested
        // groups (common in programmatically generated or imported SVG files)
        // would crash with a recursive approach.
        try {
            var stack = [item];
            var b = [Infinity, -Infinity, -Infinity, Infinity];
            var found = false;

            while (stack.length > 0) {
                var cur = stack.pop();
                try {
                    if (cur.typename === "GroupItem") {
                        if (cur.clipped) {
                            // Clip mask is always pageItems[0] (topmost child)
                            var cb = cur.pageItems[0].geometricBounds;
                            b[0] = Math.min(b[0], cb[0]);
                            b[1] = Math.max(b[1], cb[1]);
                            b[2] = Math.max(b[2], cb[2]);
                            b[3] = Math.min(b[3], cb[3]);
                            found = true;
                        } else {
                            // Non-clipped group: push children for processing
                            for (var i = 0; i < cur.pageItems.length; i++) {
                                stack.push(cur.pageItems[i]);
                            }
                        }
                    } else {
                        var lb = cur.geometricBounds;
                        b[0] = Math.min(b[0], lb[0]);
                        b[1] = Math.max(b[1], lb[1]);
                        b[2] = Math.max(b[2], lb[2]);
                        b[3] = Math.min(b[3], lb[3]);
                        found = true;
                    }
                } catch (ie) {
                    // Skip items whose bounds can't be read (corrupt, PluginItem, etc.)
                }
            }
            return found ? b : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Checks whether an item is nested inside a clipped group.
     * Walks up the parent chain from the item to the layer root.
     * Returns true if any ancestor is a GroupItem with clipping enabled.
     * Used by getBounds() to skip children whose unclipped geometric bounds
     * would inflate the measured area beyond the visible clip boundary,
     * and by movePaths() to avoid extracting items from clipped groups
     * (which would break the group structure and trigger MRAP errors).
     *
     * @param {PageItem} item - Item to check.
     * @returns {boolean} True if item is inside a clipped group.
     * @private
     */
    _isInsideClippedGroup: function (item) {
        try {
            var p = item.parent;
            while (p) {
                if (p.typename === "GroupItem" && p.clipped) return true;
                // Stop at layer level — no need to check further
                if (p.typename === "Layer") return false;
                p = p.parent;
            }
        } catch (e) {}
        return false;
    },

    /**
     * Gets an existing layer by name or creates it if it doesn't exist.
     * @param {string} name - Layer name.
     * @returns {Layer} Illustrator Layer object.
     */
    getLay: function (name) {
        try {
            return app.activeDocument.layers.getByName(name);
        } catch (e) {
            var layer = app.activeDocument.layers.add();
            layer.name = name;
            return layer;
        }
    },

    /**
     * Moves all paths whose fill or stroke matches any of the given spot color
     * names (case-insensitive) to the target layer.
     * Uses a snapshot to avoid live-collection issues during iteration.
     *
     * @param {Layer}  targetLayer - Destination layer.
     * @param {Array}  names       - Spot color names to match.
     * @returns {boolean} True if at least one path was moved.
     */
    movePaths: function (targetLayer, names) {
        try {
            var doc = app.activeDocument;
            var found = false;

            // --- 1. CompoundPathItems (move as atomic units) ---
            var compounds = doc.compoundPathItems;
            var cpSnap = [];
            for (var ci = 0; ci < compounds.length; ci++) cpSnap.push(compounds[ci]);

            // Track moved compound parents so we skip their children in step 2
            var movedCompounds = [];

            for (var ci = 0; ci < cpSnap.length; ci++) {
                var cp = cpSnap[ci];
                // Skip items on artifact layers — moving them could crash AI
                try { var fc = cp.layer.name.charAt(0); if (fc === '<' || fc === '(') continue; } catch (e) {}
                if (this._isInsideClippedGroup(cp)) continue;
                if (cp.pathItems.length === 0) continue;

                // Match by first sub-path color (all sub-paths share the same color)
                var first = cp.pathItems[0];
                if (this._matchesSpotColor(first, names)) {
                    try {
                        cp.move(targetLayer, ElementPlacement.PLACEATEND);
                        for (var sp = 0; sp < cp.pathItems.length; sp++) {
                            if (cp.pathItems[sp].filled)  cp.pathItems[sp].fillOverprint   = true;
                            if (cp.pathItems[sp].stroked) cp.pathItems[sp].strokeOverprint = true;
                        }
                        movedCompounds.push(cp);
                        found = true;
                    } catch (e) {}
                }
            }

            // --- 2. Standalone PathItems ---
            var items    = doc.pathItems;
            var snapshot = [];
            for (var i = 0; i < items.length; i++) snapshot.push(items[i]);

            for (var i = 0; i < snapshot.length; i++) {
                var item = snapshot[i];

                // Skip items on artifact layers — moving them could crash AI
                try { var fc2 = item.layer.name.charAt(0); if (fc2 === '<' || fc2 === '(') continue; } catch (e) {}

                // Skip items nested inside clipped groups — moving them out
                // would break the group structure and trigger MRAP errors.
                if (this._isInsideClippedGroup(item)) continue;

                // Skip items already moved as part of a CompoundPathItem
                var alreadyMoved = false;
                try {
                    if (item.parent && item.parent.typename === "CompoundPathItem") alreadyMoved = true;
                } catch (e) {}
                if (alreadyMoved) continue;

                if (this._matchesSpotColor(item, names)) {
                    try {
                        item.move(targetLayer, ElementPlacement.PLACEATEND);
                        if (item.filled)  item.fillOverprint   = true;
                        if (item.stroked) item.strokeOverprint = true;
                        found = true;
                    } catch (e) {}
                }
            }
            return found;
        } catch (e) {
            ZSM.Utils.log("movePaths error: " + e.message);
            return false;
        }
    },

    /**
     * Checks if a path's fill or stroke matches any of the given spot color names.
     * @param {PathItem} item  - Path to test.
     * @param {Array}    names - Spot color names (case-insensitive).
     * @returns {boolean} True if match found.
     * @private
     */
    _matchesSpotColor: function (item, names) {
        for (var n = 0; n < names.length; n++) {
            var target = names[n].toLowerCase();
            if (item.stroked && item.strokeColor.typename === "SpotColor") {
                if (item.strokeColor.spot.name.toLowerCase() === target) return true;
            }
            if (item.filled && item.fillColor.typename === "SpotColor") {
                if (item.fillColor.spot.name.toLowerCase() === target) return true;
            }
        }
        return false;
    },

    /**
     * Resolves a color name to an Illustrator Color object.
     * Resolution order: existing swatch → [Registration] fallback → auto-create spot.
     * When auto-creating, sanitizes the name and returns a SpotColor wrapper.
     *
     * @param {string} name - Swatch or spot color name.
     * @returns {Color} Illustrator Color object.
     */
    getCol: function (name) {
        var doc = app.activeDocument;
        var regName = this.getRegistrationName();
        if (!name) name = regName;

        try {
            return doc.swatches.getByName(name).color;
        } catch (e) {
            // Accept both localized and English Registration name
            if (name === regName || name === "[Registration]") {
                var reg = new CMYKColor();
                reg.black = 100;
                return reg;
            }
            // Auto-create a spot swatch as fallback
            try {
                var spot      = doc.spots.add();
                var cleanName = name.replace(/[\[\]\(\)\,\.]/g, "_");
                spot.name     = cleanName;
                var c         = new CMYKColor();
                c.cyan        = this.AUTO_SPOT_COLOR[0];
                c.magenta     = this.AUTO_SPOT_COLOR[1];
                c.yellow      = this.AUTO_SPOT_COLOR[2];
                c.black       = this.AUTO_SPOT_COLOR[3];
                spot.color     = c;
                spot.colorType = ColorModel.SPOT;
                var sc  = new SpotColor();
                sc.spot = spot;
                sc.tint = 100;
                return sc;
            } catch (e2) {
                var fallback = new CMYKColor();
                fallback.black = 100;
                return fallback;
            }
        }
    },

    /**
     * Returns the localized name of the [Registration] swatch.
     * Registration is always at swatches index 1 in any Illustrator locale
     * (index 0 = [None]). This avoids hardcoding locale-specific names
     * like [Registrační] (CS), [Passermarke] (DE), etc.
     *
     * @returns {string} Localized Registration swatch name.
     */
    getRegistrationName: function () {
        try {
            return app.activeDocument.swatches[1].name;
        } catch (e) {
            return "[Registration]";
        }
    },

    /**
     * Detects the most likely cut-path spot color in the active document.
     * Checks document spots against a priority list of industry-standard
     * cut color names (case-insensitive). Returns the first match.
     * Falls back to localized Registration name if no match found.
     *
     * Priority: CutContour (Versaworks/Onyx/Caldera) → Thru-cut (Zünd) →
     *           Kiss-cut (Zünd) → Cut (generic)
     *
     * @returns {string} Detected spot color name or Registration fallback.
     */
    detectCutColor: function () {
        var priority = ["cutcontour", "thru-cut", "kiss-cut", "cut"];
        try {
            var spots = app.activeDocument.spots;
            for (var p = 0; p < priority.length; p++) {
                for (var i = 0; i < spots.length; i++) {
                    try {
                        if (spots[i].name.toLowerCase() === priority[p]) {
                            return spots[i].name; // preserve original case
                        }
                    } catch (e2) {}
                }
            }
        } catch (e) {}
        return this.getRegistrationName();
    },

    /**
     * Returns all non-system swatch names from the active document,
     * prepended with [Registration].
     * Used to populate the spot color dropdown in layer mapping UI.
     *
     * Iterates doc.spots (not doc.swatches) so only spot colors appear.
     * This prevents process CMYK colors from showing in the dropdown —
     * movePaths() matches by SpotColor typename, so process colors
     * would never match and confuse the user (fixes Bug B).
     *
     * @returns {Array} Array of spot color name strings.
     */
    getSwatchNames: function () {
        var regName = this.getRegistrationName();
        var names = [regName];
        try {
            var spots = app.activeDocument.spots;
            for (var i = 0; i < spots.length; i++) {
                try {
                    var n = spots[i].name;
                    // Skip system spots (wrapped in brackets) — Registration already added
                    if (n.charAt(0) === "[") continue;
                    var duplicate = false;
                    for (var j = 0; j < names.length; j++) {
                        if (names[j] === n) { duplicate = true; break; }
                    }
                    if (!duplicate) names.push(n);
                } catch (e2) {
                    // Skip unreadable spots (corrupt, unresolved library refs)
                }
            }
        } catch (e) {}
        return names;
    },

    /**
     * Returns suggested layer names for the editable layer dropdown.
     *
     * Structure: document layers first (what user already has),
     * then predefined industry-standard cutting/processing method names
     * that are not already present in the document.
     * System layers (Regmarks, Graphics) are excluded.
     *
     * Predefined names follow Zünd Design Center v7.2 method list
     * plus common print-related layers (White, Varnish).
     * Order: most common cutting first, then processing, then print.
     *
     * @returns {Array} Array of layer name strings.
     */
    getLayerNames: function () {
        // Predefined industry-standard names (not localized — these are technical terms)
        var predefined = [
            // Common cutting
            "Cut", "Thru-cut", "Kiss-cut", "CutContour",
            // Processing
            "Score", "Crease", "Perforation", "V-cut", "Bevel-cut",
            "Route", "Engrave", "Draw", "Punch", "Drill",
            // Registration
            "Register",
            // Print-related
            "White", "Varnish"
        ];

        // 1. Collect document layers (excluding system layers)
        var docNames = [];
        try {
            var layers = app.activeDocument.layers;
            for (var i = 0; i < layers.length; i++) {
                var n = layers[i].name;
                if (n === ZSM.Config.layerRegmarks || n === ZSM.Config.layerGraphics) continue;
                // Skip artifact layers (bracket-prefixed names like <Clip Group>)
                var fc = n.charAt(0);
                if (fc === '<' || fc === '(') continue;
                docNames.push(n);
            }
        } catch (e) {}

        // 2. Build final list: doc layers + predefined (skip duplicates)
        var names = [];
        for (var i = 0; i < docNames.length; i++) names.push(docNames[i]);
        for (var i = 0; i < predefined.length; i++) {
            var exists = false;
            for (var j = 0; j < names.length; j++) {
                if (names[j] === predefined[i]) { exists = true; break; }
            }
            if (!exists) names.push(predefined[i]);
        }
        return names;
    }
};
