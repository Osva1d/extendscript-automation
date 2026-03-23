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
