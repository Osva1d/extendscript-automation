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
            var pathInfo = GM.Illustrator.getSelectedPathInfo();

            var ui = GM.UI.buildDialog(pData, layerInfo, swatchInfo, pathInfo);

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
            var unitFactor = GM.CONSTANTS.UNIT_FACTORS[cfg.units];

            var warnings = [];
            function addWarning(msg) {
                for (var w = 0; w < warnings.length; w++) {
                    if (warnings[w] === msg) return;
                }
                warnings.push(msg);
            }

            // Fixed target layer "Grommet Marks" (created if missing, silently).
            var targetLayer = GM.Illustrator.getOrCreateLayer(GM.CONSTANTS.SENTINEL_CREATE);

            var markSizePoints = cfg.markSize * unitFactor;
            var markOpts = {
                circle: !!cfg.markCircle,
                cross: !!cfg.markCross,
                regWeight: cfg.regWeight,
                haloWeight: cfg.haloWeight
            };

            var prevLocked = false, prevVisible = true, sessionOpen = false;
            try { prevLocked = targetLayer.locked; prevVisible = targetLayer.visible; } catch (eLk) {}
            try { targetLayer.locked = false; targetLayer.visible = true; sessionOpen = true; } catch (eLk2) {}

            var placed = {};
            var failedMarks = 0;
            function place(x, y) {
                var key = Math.round(x * 10) / 10 + "|" + Math.round(y * 10) / 10;
                if (placed[key]) return;
                placed[key] = true;
                var ok = GM.Illustrator.placeMarkGroup(targetLayer, x, y, markSizePoints, markOpts);
                if (!ok) failedMarks++;
            }

            // Zone config (pitch unit-converted once; shared by both modes).
            var cz = cfg.cornerZone || {};
            var zoneCfg = {
                enabled: !!(cz.enabled),
                count:   Math.max(cz.count  || 1, 1),
                pitch:   (cz.pitch  || 0) * unitFactor
            };

            var doArtboard = true;

            if (cfg.placementMode === GM.CONSTANTS.MODE_PATH) {
                // Re-fetch selection: the user may have deselected between
                // dialog OK and process() — treat as a non-fatal fallback.
                var pathInfo = GM.Illustrator.getSelectedPathInfo();
                if (!pathInfo.ok) {
                    addWarning(GM.L.WARN_MODE_FALLBACK);
                } else {
                    doArtboard = false;
                    var pd = cfg.pathDist || {};
                    var distCfg = {
                        useNumber: !!(pd.useNumber),
                        number:    Math.max(pd.number  || 1, 1),
                        spacing:   (pd.spacing || 0) * unitFactor
                    };
                    var pathMarks = GM.Core.distributeOnCircuit(
                        pathInfo.circuit, pathInfo.corners, zoneCfg, distCfg
                    );
                    for (var pi = 0; pi < pathMarks.length; pi++) {
                        place(pathMarks[pi][0], pathMarks[pi][1]);
                    }
                }
            }

            if (doArtboard) {
                var topCfg    = cfg.top;
                var leftCfg   = cfg.left;
                var bottomCfg = cfg.bottomMirror ? topCfg    : cfg.bottom;
                var rightCfg  = cfg.rightMirror  ? leftCfg   : cfg.right;

                var topOn    = topCfg.enabled;
                var leftOn   = leftCfg.enabled;
                var bottomOn = cfg.bottomMirror ? topOn  : bottomCfg.enabled;
                var rightOn  = cfg.rightMirror  ? leftOn : rightCfg.enabled;

                // Offsets pre-converted to points so artboard math is uniform.
                var offX = cfg.offsetX * unitFactor;
                var offY = cfg.offsetY * unitFactor;

                function edgeMid(edgeCfg) {
                    return {
                        useNumber: !!(edgeCfg.useNumber),
                        number:    Math.max(edgeCfg.number  || 1, 1),
                        spacing:   (edgeCfg.spacing || 0) * unitFactor
                    };
                }

                for (var i = 0; i < doc.artboards.length; i++) {
                    var ab = doc.artboards[i];
                    var r = ab.artboardRect;
                    var abLeft = r[0], abTop = r[1], abRight = r[2], abBottom = r[3];
                    var abWidth  = abRight  - abLeft;
                    var abHeight = abTop    - abBottom;

                    if (topOn) {
                        var tL   = Math.max(abWidth  - 2 * offX, 0);
                        var tPos = GM.Core.distributeOnSpan(tL, zoneCfg, edgeMid(topCfg));
                        var tY   = abTop - offY;
                        for (var ti = 0; ti < tPos.length; ti++) place(abLeft + offX + tPos[ti], tY);
                    }

                    if (bottomOn) {
                        var bL   = Math.max(abWidth  - 2 * offX, 0);
                        var bPos = GM.Core.distributeOnSpan(bL, zoneCfg, edgeMid(bottomCfg));
                        var bY   = abBottom + offY;
                        for (var bi = 0; bi < bPos.length; bi++) place(abLeft + offX + bPos[bi], bY);
                    }

                    if (leftOn) {
                        var lL   = Math.max(abHeight - 2 * offY, 0);
                        var lPos = GM.Core.distributeOnSpan(lL, zoneCfg, edgeMid(leftCfg));
                        var lX   = abLeft + offX;
                        for (var li = 0; li < lPos.length; li++) place(lX, abTop - offY - lPos[li]);
                    }

                    if (rightOn) {
                        var rL   = Math.max(abHeight - 2 * offY, 0);
                        var rPos = GM.Core.distributeOnSpan(rL, zoneCfg, edgeMid(rightCfg));
                        var rX   = abRight - offX;
                        for (var ri = 0; ri < rPos.length; ri++) place(rX, abTop - offY - rPos[ri]);
                    }
                }
            }

            if (sessionOpen) {
                try { targetLayer.locked = prevLocked; targetLayer.visible = prevVisible; } catch (eRst) {}
            }

            if (failedMarks > 0) {
                addWarning(GM.L.format(GM.L.WARN_MARKS_FAILED, failedMarks));
            }

            if (warnings.length > 0) alert(GM.L.WARN_PREFIX + warnings.join("\n"));
        } catch (e) {
            if (sessionOpen) {
                try { targetLayer.locked = prevLocked; targetLayer.visible = prevVisible; } catch (eRst2) {}
            }
            alert(GM.CONSTANTS.SCRIPT_NAME + ": " + GM.L.ERR_UNEXPECTED + " — " + e.message);
        }
    }
};

// Run
GM.Main.run();
