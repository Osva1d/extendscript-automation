var TP = TP || {};

TP.Draw = {

    /** @private Storage for layer names locked at session start, restored on end. */
    _lockedLayers: [],
    /** @private Storage for layer names hidden at session start, restored on end. */
    _hiddenLayers: [],

    // -------------------------------------------------------------------------
    // Session management
    // -------------------------------------------------------------------------

    /**
     * Unlocks and makes all layers visible before manipulation.
     * Stores locked/hidden layer names so endSession() can restore them.
     */
    beginSession: function () {
        var doc = app.activeDocument;
        this._lockedLayers = [];
        this._hiddenLayers = [];
        for (var i = 0; i < doc.layers.length; i++) {
            try {
                if (doc.layers[i].locked) {
                    this._lockedLayers.push(doc.layers[i].name);
                    doc.layers[i].locked = false;
                }
                if (!doc.layers[i].visible) {
                    this._hiddenLayers.push(doc.layers[i].name);
                    doc.layers[i].visible = true;
                }
            } catch (e) {
                TP.Utils.log("beginSession: failed on layer — " + doc.layers[i].name);
            }
        }
    },

    /**
     * Restores layer locks/visibility cleared by beginSession().
     */
    endSession: function () {
        try {
            var doc = app.activeDocument;
            for (var i = 0; i < this._lockedLayers.length; i++) {
                try { doc.layers.getByName(this._lockedLayers[i]).locked = true; } catch (e) {}
            }
            for (var i = 0; i < this._hiddenLayers.length; i++) {
                try { doc.layers.getByName(this._hiddenLayers[i]).visible = false; } catch (e) {}
            }
        } catch (e) {}
        this._lockedLayers = [];
        this._hiddenLayers = [];
    },

    // -------------------------------------------------------------------------
    // Phase detection
    // -------------------------------------------------------------------------

    /**
     * Detects which phase to run by checking for the preview layer.
     * @returns {string} "SETUP" or "APPLY"
     */
    detectPhase: function () {
        try {
            app.activeDocument.layers.getByName(TP.Config.LAYER_PREVIEW);
            return "APPLY";
        } catch (e) {
            return "SETUP";
        }
    },

    // -------------------------------------------------------------------------
    // Artwork bounds
    // -------------------------------------------------------------------------

    /**
     * Returns the first artboard's rect as the artwork bounds.
     * @returns {Array} [left, top, right, bottom] in points.
     */
    getArtworkBounds: function () {
        var doc = app.activeDocument;
        var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
        return ab.artboardRect; // [L, T, R, B]
    },

    // -------------------------------------------------------------------------
    // Layer helpers
    // -------------------------------------------------------------------------

    /**
     * Gets or creates a layer by name.
     * @param {string} name - Layer name.
     * @returns {Layer} The found or created layer.
     */
    getOrCreateLayer: function (name) {
        var doc = app.activeDocument;
        try {
            return doc.layers.getByName(name);
        } catch (e) {
            var lay = doc.layers.add();
            lay.name = name;
            return lay;
        }
    },

    /**
     * Removes a layer by name if it exists.
     * @param {string} name - Layer name.
     */
    removeLayer: function (name) {
        try {
            var lay = app.activeDocument.layers.getByName(name);
            lay.locked = false;
            lay.visible = true;
            lay.remove();
        } catch (e) {}
    },

    // -------------------------------------------------------------------------
    // Color helpers
    // -------------------------------------------------------------------------

    /**
     * Creates an RGB color.
     * @param {number} r - Red (0–255).
     * @param {number} g - Green (0–255).
     * @param {number} b - Blue (0–255).
     * @returns {RGBColor}
     */
    makeRGB: function (r, g, b) {
        var c = new RGBColor();
        c.red = r; c.green = g; c.blue = b;
        return c;
    },

    /**
     * Creates a CMYK color.
     * @param {number} c - Cyan (0–100).
     * @param {number} m - Magenta (0–100).
     * @param {number} y - Yellow (0–100).
     * @param {number} k - Black (0–100).
     * @returns {CMYKColor}
     */
    makeCMYK: function (c, m, y, k) {
        var col = new CMYKColor();
        col.cyan = c; col.magenta = m; col.yellow = y; col.black = k;
        return col;
    },

    /**
     * Returns Registration color (CMYK 100/100/100/100).
     * @returns {CMYKColor}
     */
    makeRegistration: function () {
        return this.makeCMYK(100, 100, 100, 100);
    },

    /**
     * Returns Cyan color (CMYK 100/0/0/0).
     * @returns {CMYKColor}
     */
    makeCyan: function () {
        return this.makeCMYK(100, 0, 0, 0);
    },

    // -------------------------------------------------------------------------
    // Phase 1: Split lines
    // -------------------------------------------------------------------------

    /**
     * Draws split lines and position labels on the preview layer.
     * Also stores params in a hidden textFrame.
     *
     * Split positions in grid are in REAL mm. Labels show real mm.
     * Document positions are calculated by dividing by the effective scale.
     *
     * @param {Object} grid - Result from TP.Core.calculateGrid.
     * @param {Array} artworkBounds - [L, T, R, B] in points.
     * @param {Object} params - Settings to store for Phase 2 (includes .scale).
     */
    drawSplitLines: function (grid, artworkBounds, params) {
        var doc = app.activeDocument;
        var lay = this.getOrCreateLayer(TP.Config.LAYER_PREVIEW);
        lay.locked = false;
        lay.printable = false;
        lay.visible = true;

        var cfg = TP.Config;
        var u = TP.Utils;
        // Effective scale: user scale combined with Illustrator's Large Canvas factor
        var scale = (params.scale || 1) * u.getSF();
        var extPt = u.mm2pt(cfg.SPLIT_LINE_EXTEND / scale);

        var aL = artworkBounds[0];
        var aT = artworkBounds[1];
        var aR = artworkBounds[2];
        var aB = artworkBounds[3];

        var strokeCol = this.makeRGB(255, 0, 0);

        // Vertical split lines (real mm → document points)
        var vSplits = grid.vResult.splits;
        for (var i = 0; i < vSplits.length; i++) {
            var xPt = aL + u.mm2pt(vSplits[i] / scale);
            var line = lay.pathItems.add();
            line.setEntirePath([[xPt, aT + extPt], [xPt, aB - extPt]]);
            line.stroked = true;
            line.strokeColor = strokeCol;
            line.strokeWidth = cfg.SPLIT_LINE_WEIGHT;
            line.strokeDashes = [cfg.SPLIT_LINE_DASH, cfg.SPLIT_LINE_GAP];
            line.filled = false;
            line.name = cfg.SPLIT_V_PREFIX + (i + 1);

            // Position label above the line — shows REAL mm
            var label = lay.textFrames.add();
            label.contents = u.roundMM(vSplits[i], 1) + " mm";
            label.textRange.characterAttributes.size = cfg.SPLIT_LABEL_SIZE;
            try { label.textRange.characterAttributes.textFont = app.textFonts.getByName("Helvetica"); } catch (e) {}
            label.textRange.characterAttributes.fillColor = strokeCol;
            label.position = [xPt - u.mm2pt(8 / scale), aT + extPt + u.mm2pt(5 / scale)];
            label.name = cfg.SPLIT_V_PREFIX + (i + 1) + "_label";
        }

        // Horizontal split lines (real mm → document points)
        var hSplits = grid.hResult.splits;
        for (var i = 0; i < hSplits.length; i++) {
            var yPt = aT - u.mm2pt(hSplits[i] / scale);
            var line = lay.pathItems.add();
            line.setEntirePath([[aL - extPt, yPt], [aR + extPt, yPt]]);
            line.stroked = true;
            line.strokeColor = strokeCol;
            line.strokeWidth = cfg.SPLIT_LINE_WEIGHT;
            line.strokeDashes = [cfg.SPLIT_LINE_DASH, cfg.SPLIT_LINE_GAP];
            line.filled = false;
            line.name = cfg.SPLIT_H_PREFIX + (i + 1);

            // Position label to the left — shows REAL mm
            var label = lay.textFrames.add();
            label.contents = u.roundMM(hSplits[i], 1) + " mm";
            label.textRange.characterAttributes.size = cfg.SPLIT_LABEL_SIZE;
            try { label.textRange.characterAttributes.textFont = app.textFonts.getByName("Helvetica"); } catch (e) {}
            label.textRange.characterAttributes.fillColor = strokeCol;
            label.position = [aL - extPt - u.mm2pt(25 / scale), yPt + u.mm2pt(5 / scale)];
            label.name = cfg.SPLIT_H_PREFIX + (i + 1) + "_label";
        }

        // Overlap zone boundary lines (cyan dashed)
        var overlapPt = u.mm2pt((params.overlap || 0) / scale);
        if (overlapPt > 0) {
            var cyanCol = this.makeCMYK(100, 0, 0, 0);
            var bothSides = params.overlapBothSides;

            var _addCyanLine = function (p1, p2, name) {
                var ovLine = lay.pathItems.add();
                ovLine.setEntirePath([p1, p2]);
                ovLine.stroked = true;
                ovLine.strokeColor = cyanCol;
                ovLine.strokeWidth = cfg.SPLIT_LINE_WEIGHT;
                ovLine.strokeDashes = [cfg.SPLIT_LINE_DASH, cfg.SPLIT_LINE_GAP];
                ovLine.filled = false;
                ovLine.name = name;
            };

            for (var i = 0; i < vSplits.length; i++) {
                var xPt = aL + u.mm2pt(vSplits[i] / scale);
                if (bothSides) {
                    // Two cyan lines: ov/2 on each side of red split
                    _addCyanLine([xPt - overlapPt / 2, aT + extPt], [xPt - overlapPt / 2, aB - extPt],
                        cfg.SPLIT_V_PREFIX + (i + 1) + "_ovL");
                    _addCyanLine([xPt + overlapPt / 2, aT + extPt], [xPt + overlapPt / 2, aB - extPt],
                        cfg.SPLIT_V_PREFIX + (i + 1) + "_ovR");
                } else {
                    // One cyan line at right edge of overlap zone
                    _addCyanLine([xPt + overlapPt, aT + extPt], [xPt + overlapPt, aB - extPt],
                        cfg.SPLIT_V_PREFIX + (i + 1) + "_overlap");
                }
            }

            for (var i = 0; i < hSplits.length; i++) {
                var yPt = aT - u.mm2pt(hSplits[i] / scale);
                if (bothSides) {
                    // Two cyan lines: ov/2 on each side of red split
                    _addCyanLine([aL - extPt, yPt + overlapPt / 2], [aR + extPt, yPt + overlapPt / 2],
                        cfg.SPLIT_H_PREFIX + (i + 1) + "_ovT");
                    _addCyanLine([aL - extPt, yPt - overlapPt / 2], [aR + extPt, yPt - overlapPt / 2],
                        cfg.SPLIT_H_PREFIX + (i + 1) + "_ovB");
                } else {
                    // One cyan line at bottom edge of overlap zone
                    _addCyanLine([aL - extPt, yPt - overlapPt], [aR + extPt, yPt - overlapPt],
                        cfg.SPLIT_H_PREFIX + (i + 1) + "_overlap");
                }
            }
        }

        // Store params for Phase 2
        this.storeParams(lay, params);
    },

    /**
     * Stores parameters as a hidden textFrame on the given layer.
     * @param {Layer} layer - Target layer.
     * @param {Object} params - Settings object.
     */
    storeParams: function (layer, params) {
        var tf = layer.textFrames.add();
        tf.contents = TP.Config.DATA_FRAME_PREFIX + JSON.stringify(params);
        tf.position = [-10000, -10000];
        tf.textRange.characterAttributes.size = 1;
        tf.name = TP.Config.DATA_FRAME_PREFIX;
    },

    /**
     * Reads stored parameters from the hidden textFrame on the preview layer.
     * @returns {Object|null} Parsed settings or null.
     */
    readStoredParams: function () {
        try {
            var lay = app.activeDocument.layers.getByName(TP.Config.LAYER_PREVIEW);
            for (var i = 0; i < lay.textFrames.length; i++) {
                var tf = lay.textFrames[i];
                if (tf.name === TP.Config.DATA_FRAME_PREFIX) {
                    var raw = tf.contents;
                    var prefix = TP.Config.DATA_FRAME_PREFIX;
                    if (raw.indexOf(prefix) === 0) {
                        return JSON.parse(raw.substring(prefix.length));
                    }
                }
            }
        } catch (e) {
            TP.Utils.log("readStoredParams failed: " + e.message);
        }
        return null;
    },

    // -------------------------------------------------------------------------
    // Phase 2: Read split positions
    // -------------------------------------------------------------------------

    /**
     * Reads current positions of split line pathItems from the preview layer.
     * Filters by name prefix, sorts, deduplicates.
     *
     * @returns {Object} { splitsV: number[], splitsH: number[] } in document points.
     */
    readSplitPositions: function () {
        var splitsV = [];
        var splitsH = [];

        try {
            var lay = app.activeDocument.layers.getByName(TP.Config.LAYER_PREVIEW);
            var items = lay.pathItems;

            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var name = item.name;

                // Only match pure split lines (SplitV_1, SplitH_2, etc.)
                // Skip overlap preview lines (_overlap, _ovL, _ovR, _ovT, _ovB)
                if (name.indexOf(TP.Config.SPLIT_V_PREFIX) === 0) {
                    var suffix = name.substring(TP.Config.SPLIT_V_PREFIX.length);
                    if (suffix.indexOf("_") !== -1) continue; // skip _overlap, _ovL, _ovR
                    var gb = item.geometricBounds;
                    var xPos = (gb[0] + gb[2]) / 2;
                    splitsV.push(xPos);
                } else if (name.indexOf(TP.Config.SPLIT_H_PREFIX) === 0) {
                    var suffix = name.substring(TP.Config.SPLIT_H_PREFIX.length);
                    if (suffix.indexOf("_") !== -1) continue; // skip _overlap, _ovT, _ovB
                    var gb = item.geometricBounds;
                    var yPos = (gb[1] + gb[3]) / 2;
                    splitsH.push(yPos);
                }
            }
        } catch (e) {
            TP.Utils.log("readSplitPositions failed: " + e.message);
        }

        // Sort: V splits ascending (left to right), H splits descending (top to bottom)
        splitsV.sort(function (a, b) { return a - b; });
        splitsH.sort(function (a, b) { return b - a; });

        // Deduplicate: remove positions closer than 1pt
        splitsV = this._deduplicate(splitsV);
        splitsH = this._deduplicate(splitsH);

        return { splitsV: splitsV, splitsH: splitsH };
    },

    /**
     * Removes duplicate positions that are within 1pt of each other.
     * @param {number[]} arr - Sorted array of positions.
     * @returns {number[]} Deduplicated array.
     */
    _deduplicate: function (arr) {
        if (arr.length < 2) return arr;
        var result = [arr[0]];
        for (var i = 1; i < arr.length; i++) {
            if (Math.abs(arr[i] - result[result.length - 1]) > 1) {
                result.push(arr[i]);
            }
        }
        return result;
    },

    // -------------------------------------------------------------------------
    // Phase 2: Create artboards
    // -------------------------------------------------------------------------

    /**
     * Creates artboards for all panels. Optionally removes the original artboard.
     *
     * @param {Object[]} panels - Panel array from TP.Core.calculateArtboardRects.
     * @param {boolean} keepOriginal - If true, keep the original artboard.
     */
    createArtboards: function (panels, keepOriginal) {
        var doc = app.activeDocument;

        // Suppress alerts during batch creation
        var prevLevel = app.userInteractionLevel;
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

        try {
            // Store original artboard index
            var origIdx = doc.artboards.getActiveArtboardIndex();

            // Create new artboards
            for (var i = 0; i < panels.length; i++) {
                var p = panels[i];
                var ab = doc.artboards.add(p.rect);
                ab.name = p.label;
            }

            // Remove original artboard if requested
            if (!keepOriginal) {
                doc.artboards.remove(origIdx);
            }
        } finally {
            app.userInteractionLevel = prevLevel;
        }
    },

    // -------------------------------------------------------------------------
    // Phase 2: Assembly marks
    // -------------------------------------------------------------------------

    /**
     * Draws all assembly marks for the given panels.
     *
     * @param {Object[]} panels - Panel array from TP.Core.calculateArtboardRects.
     * @param {Object} options - Mark options from Apply dialog (includes .scale).
     * @param {number} overlapPt - Overlap in document points.
     * @param {string} filename - Document filename for job info label.
     */
    drawAllMarks: function (panels, options, overlapPt, filename) {
        var lay = this.getOrCreateLayer(TP.Config.LAYER_MARKS);
        lay.locked = false;
        lay.printable = true;
        lay.visible = true;

        var cfg = TP.Config;
        var u = TP.Utils;
        // Effective scale: user scale × Illustrator Large Canvas factor
        var scale = (options.scale || 1) * u.getSF();
        var lengthPt = u.mm2pt(cfg.CROP_MARK_LENGTH / scale);
        var offsetPt = u.mm2pt(cfg.CROP_MARK_OFFSET / scale);
        var armPt = u.mm2pt(cfg.CROSSHAIR_ARM / scale);
        var labelOffPt = u.mm2pt(cfg.LABEL_OFFSET / scale);

        var numCols = 0;
        var numRows = 0;
        for (var i = 0; i < panels.length; i++) {
            if (panels[i].col + 1 > numCols) numCols = panels[i].col + 1;
            if (panels[i].row + 1 > numRows) numRows = panels[i].row + 1;
        }

        for (var i = 0; i < panels.length; i++) {
            var p = panels[i];

            if (options.markCropMarks) {
                this._drawCropMarks(lay, p, lengthPt, offsetPt);
            }

            if (options.markLabels) {
                this._drawPanelLabel(lay, p, numCols, numRows, panels.length, filename, labelOffPt, scale);
            }

            if (options.markOverlapIndicators) {
                var indicators = TP.Core.calculateOverlapIndicators(p, overlapPt, scale, options.overlapBothSides);
                this._drawOverlapIndicators(lay, indicators);
            }

            if (options.markCrosshairs) {
                var crosshairs = TP.Core.calculateCrosshairPositions(p, overlapPt, armPt, options.overlapBothSides);
                this._drawCrosshairs(lay, crosshairs);
            }
        }

        // Job info on first panel
        if (options.markLabels && panels.length > 0) {
            this._drawJobInfo(lay, panels[0], numCols, numRows, panels.length,
                              overlapPt, filename, labelOffPt, scale, options.scale || 1);
        }

        lay.locked = true;
    },

    /**
     * Draws L-shaped crop marks for one panel.
     * @private
     */
    _drawCropMarks: function (layer, panel, lengthPt, offsetPt) {
        var marks = TP.Core.calculateCropMarks(panel, lengthPt, offsetPt);
        var regColor = this.makeRegistration();

        for (var i = 0; i < marks.length; i++) {
            var m = marks[i];
            var line = layer.pathItems.add();
            line.setEntirePath([m.p1, m.p2]);
            line.stroked = true;
            line.strokeColor = regColor;
            line.strokeWidth = TP.Config.CROP_MARK_WEIGHT;
            line.filled = false;
        }
    },

    /**
     * Draws panel identification label in slug area.
     * Dimensions shown in real mm (document pt × scale).
     * @private
     */
    _drawPanelLabel: function (layer, panel, numCols, numRows, total, filename, labelOffPt, scale) {
        var r = panel.rect;
        var u = TP.Utils;
        // Convert document points to real mm: pt → doc mm → × scale = real mm
        var wMM = u.roundMM(u.pt2mm(r[2] - r[0]) * scale, 1);
        var hMM = u.roundMM(u.pt2mm(r[1] - r[3]) * scale, 1);
        var colNum = panel.col + 1;
        var rowNum = panel.row + 1;
        var totalCols = numCols;

        var text = TP.L.format(TP.L.MARK_PANEL_LABEL,
            rowNum, colNum, wMM, hMM, colNum, totalCols);

        var tf = layer.textFrames.add();
        tf.contents = text;
        tf.textRange.characterAttributes.size = TP.Config.LABEL_FONT_SIZE;
        try {
            tf.textRange.characterAttributes.textFont =
                app.textFonts.getByName(TP.Config.LABEL_FONT_NAME);
        } catch (e) {}
        tf.textRange.characterAttributes.fillColor = this.makeCMYK(0, 0, 0, 100);
        tf.position = [r[0] + labelOffPt, r[1] + labelOffPt];
    },

    /**
     * Draws job info label on the first panel.
     * @private
     */
    _drawJobInfo: function (layer, panel, numCols, numRows, total, overlapPt, filename, labelOffPt, scale, userScale) {
        var u = TP.Utils;
        var overlapMM = u.roundMM(u.pt2mm(overlapPt) * scale, 1);
        var text = TP.L.format(TP.L.MARK_JOB_INFO,
            filename, numCols, numRows, total, overlapMM, userScale);

        var r = panel.rect;
        var tf = layer.textFrames.add();
        tf.contents = text;
        tf.textRange.characterAttributes.size = TP.Config.LABEL_FONT_SIZE;
        try {
            tf.textRange.characterAttributes.textFont =
                app.textFonts.getByName(TP.Config.LABEL_FONT_NAME);
        } catch (e) {}
        tf.textRange.characterAttributes.fillColor = this.makeCMYK(0, 0, 0, 100);
        // Place below the panel label (toward artboard = subtract Y in Y-up)
        tf.position = [r[0] + labelOffPt, r[1] + labelOffPt - u.mm2pt(5 / scale)];
    },

    /**
     * Draws overlap indicator lines and labels.
     * @private
     */
    _drawOverlapIndicators: function (layer, indicators) {
        var cyanColor = this.makeCyan();
        var cfg = TP.Config;

        for (var i = 0; i < indicators.length; i++) {
            var ind = indicators[i];

            // Dashed line at split boundary
            var line = layer.pathItems.add();
            line.setEntirePath([ind.p1, ind.p2]);
            line.stroked = true;
            line.strokeColor = cyanColor;
            line.strokeWidth = cfg.OVERLAP_IND_WEIGHT;
            line.strokeDashes = [cfg.OVERLAP_IND_DASH, cfg.OVERLAP_IND_GAP];
            line.filled = false;

            // Label
            var tf = layer.textFrames.add();
            tf.contents = ind.labelText;
            tf.textRange.characterAttributes.size = cfg.OVERLAP_LABEL_SIZE;
            try {
                tf.textRange.characterAttributes.textFont =
                    app.textFonts.getByName(TP.Config.LABEL_FONT_NAME);
            } catch (e) {}
            tf.textRange.characterAttributes.fillColor = cyanColor;
            tf.position = ind.labelPos;
        }
    },

    /**
     * Draws registration crosshairs in the overlap zone.
     * @private
     */
    _drawCrosshairs: function (layer, positions) {
        var regColor = this.makeRegistration();

        for (var i = 0; i < positions.length; i++) {
            var ch = positions[i];
            var cx = ch.center[0];
            var cy = ch.center[1];
            var arm = ch.armPt;

            // Horizontal arm
            var hLine = layer.pathItems.add();
            hLine.setEntirePath([[cx - arm, cy], [cx + arm, cy]]);
            hLine.stroked = true;
            hLine.strokeColor = regColor;
            hLine.strokeWidth = TP.Config.CROSSHAIR_WEIGHT;
            hLine.filled = false;

            // Vertical arm
            var vLine = layer.pathItems.add();
            vLine.setEntirePath([[cx, cy + arm], [cx, cy - arm]]);
            vLine.stroked = true;
            vLine.strokeColor = regColor;
            vLine.strokeWidth = TP.Config.CROSSHAIR_WEIGHT;
            vLine.filled = false;
        }
    },

    // -------------------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------------------

    /**
     * Removes the preview layer and all its contents.
     */
    removePreviewLayer: function () {
        this.removeLayer(TP.Config.LAYER_PREVIEW);
    }
};
