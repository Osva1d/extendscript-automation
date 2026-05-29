// ------------------------------------------------------------------------
// Module: GM.Main — entry point and artboard processing loop
// Part of: Illustrator Grommet Marks
// Depends on: GM.Illustrator, GM.Storage, GM.Validation, GM.Core, GM.UI, GM.Config
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Main = {
    run: function () {
        // Global error boundary — any uncaught failure (load, dialog, save)
        // surfaces one localized alert instead of a raw ExtendScript crash.
        try {
            if (!GM.Illustrator.init()) {
                alert(GM.L.ERR_NO_DOC);
                return;
            }

            // Pin Y-up document coordinate system. A per-document
            // "Y origin from artboard top-left" preference can flip the axis
            // and mis-place marks; placeMark() and the artboard math assume
            // Y-up. CS6 lacks the enum, so the swallow is safe (CS6 is Y-up).
            try {
                app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
            } catch (csErr) {
                GM.Utils.log("coordinateSystem pin skipped: " + csErr.message);
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
        } catch (e) {
            alert(GM.CONSTANTS.SCRIPT_NAME + ": " + GM.L.ERR_UNEXPECTED + " — " +
                  e.message + (e.line ? " (line " + e.line + ")" : ""));
        }
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

            // Layer session — unlock/show the target layer so placeMark can
            // write to it (a locked layer would silently swallow every mark).
            // The user's lock/visibility state is restored afterwards.
            var prevLocked = false, prevVisible = true, sessionOpen = false;
            try { prevLocked = targetLayer.locked; prevVisible = targetLayer.visible; } catch (eLk) {}
            try { targetLayer.locked = false; targetLayer.visible = true; sessionOpen = true; } catch (eLk2) {}

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

            // Restore layer lock/visibility (normal path).
            if (sessionOpen) {
                try { targetLayer.locked = prevLocked; targetLayer.visible = prevVisible; } catch (eRst) {}
            }
        } catch (e) {
            // Restore on error too — never leave the layer unlocked.
            if (sessionOpen) {
                try { targetLayer.locked = prevLocked; targetLayer.visible = prevVisible; } catch (eRst2) {}
            }
            alert(GM.CONSTANTS.SCRIPT_NAME + ": " + GM.L.ERR_UNEXPECTED + " — " + e.message);
        }
    }
};

// Run
GM.Main.run();
