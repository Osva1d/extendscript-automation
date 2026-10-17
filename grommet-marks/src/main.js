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
            // and mis-place marks; placeMarkGroup() and the artboard math assume
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

            var pathInfo = GM.Illustrator.getSelectedPathInfo();
            var docInfo = GM.Illustrator.getDocInfo();

            var ui = GM.UI.buildDialog(pData, pathInfo, docInfo);

            if (ui.window.show() !== 1) return;

            var cfg = ui.gatherAll();

            var result = GM.Validation.validate(cfg, GM.L);
            if (!result.valid) return;

            // Auto-save [Last Settings]
            pData.presets[GM.Storage.PRESET_KEY_LAST] = result.settings;
            GM.Storage.save(pData);

            GM.Main.process(result.settings, ui.getRunOptions());

            app.redraw();
        } catch (e) {
            alert(GM.CONSTANTS.SCRIPT_NAME + ": " + GM.L.ERR_UNEXPECTED + " — " +
                  e.message + (e.line ? " (line " + e.line + ")" : ""));
        }
    },

    /**
     * Places the marks for validated settings: artboard edges, or the
     * selected path (offset, corners, part of the outline) in path mode.
     * @param {Object} cfg - Validated settings.
     * @param {Object} [opts] - Per-run choices that are not stored in
     *     presets: {pathPartial} — restrict the marks to the selected part
     *     of the outline. Missing means no choices.
     */
    process: function (cfg, opts) {
        try {
            var doc = GM.Illustrator.doc;
            // Large Canvas documents (scaleFactor 10) keep geometry at
            // 1/scaleFactor: every point value written into the document comes
            // out scaleFactor times larger. Convert physical sizes to document
            // units once, here — everything below works in document units.
            var scale = doc.scaleFactor || 1;
            var unitFactor = GM.CONSTANTS.UNIT_FACTORS[cfg.units] / scale;

            var warnings = [];
            function addWarning(msg) {
                for (var w = 0; w < warnings.length; w++) {
                    if (warnings[w] === msg) return;
                }
                warnings.push(msg);
            }

            // Zone config (pitch unit-converted once; shared by both modes).
            var cz = cfg.cornerZone || {};
            var zoneCfg = {
                enabled: !!(cz.enabled),
                count:   Math.max(cz.count  || 1, 1),
                pitch:   (cz.pitch  || 0) * unitFactor
            };

            // Path mode: every mark is worked out before the document is
            // touched, so a shape the offset cannot handle leaves nothing
            // behind — no mark layer, no lock change (spec §9).
            var pathPlan = null;
            if (cfg.placementMode === GM.CONSTANTS.MODE_PATH) {
                // Re-fetch selection: the user may have deselected between
                // dialog OK and process() — treat as a non-fatal fallback.
                var pathInfo = GM.Illustrator.getSelectedPathInfo();
                if (!pathInfo.ok) {
                    addWarning(GM.L.WARN_MODE_FALLBACK);
                } else {
                    pathPlan = GM.Main.pathMarks(cfg, opts || {}, pathInfo, unitFactor, scale, zoneCfg);
                    if (!pathPlan.ok) {
                        alert(pathPlan.message);
                        return;
                    }
                }
            }

            // Fixed target layer "Grommet Marks" (created if missing, silently).
            var targetLayer = GM.Illustrator.getOrCreateLayer();

            var markSizePoints = cfg.markSize * unitFactor;
            var markOpts = {
                circle: !!cfg.markCircle,
                cross: !!cfg.markCross,
                regWeight: cfg.regWeight / scale,
                haloWeight: cfg.haloWeight / scale
            };

            var prevLocked = false, prevVisible = true, sessionOpen = false;
            try { prevLocked = targetLayer.locked; prevVisible = targetLayer.visible; } catch (eLk) {}
            try { targetLayer.locked = false; targetLayer.visible = true; sessionOpen = true; } catch (eLk2) {}

            // Marks already on the layer, typically from a previous run. The run
            // only adds, so a new mark landing on an old one (centres closer
            // than one mark diameter) is counted and reported at the end.
            var existing = GM.Illustrator.itemCentres(targetLayer);
            var overlapTol2 = markSizePoints * markSizePoints;
            var overlaps = 0;

            var placed = {};
            var failedMarks = 0;
            function place(x, y) {
                var key = Math.round(x * 10) / 10 + "|" + Math.round(y * 10) / 10;
                if (placed[key]) return;
                placed[key] = true;
                for (var e = 0; e < existing.length; e++) {
                    var dx = existing[e][0] - x, dy = existing[e][1] - y;
                    if (dx * dx + dy * dy < overlapTol2) { overlaps++; break; }
                }
                var ok = GM.Illustrator.placeMarkGroup(targetLayer, x, y, markSizePoints, markOpts);
                if (!ok) failedMarks++;
            }

            var doArtboard = !pathPlan;
            if (pathPlan) {
                for (var pm = 0; pm < pathPlan.marks.length; pm++) {
                    place(pathPlan.marks[pm][0], pathPlan.marks[pm][1]);
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

                // Every artboard gets marks. Say so when there is more than one:
                // an artboard outside the view (a label, a proof) is easy to miss.
                if (doc.artboards.length > 1) {
                    addWarning(GM.L.format(GM.L.WARN_ALL_ARTBOARDS, doc.artboards.length));
                }
            }

            // Restore the lock only. A layer that was hidden stays visible —
            // hidden again, the new marks would neither show nor print.
            if (sessionOpen) {
                try { targetLayer.locked = prevLocked; } catch (eRst) {}
                if (!prevVisible) {
                    addWarning(GM.L.format(GM.L.WARN_LAYER_UNHIDDEN, GM.CONSTANTS.LAYER_NAME));
                }
            }

            if (overlaps > 0) {
                addWarning(GM.L.format(GM.L.WARN_DUPLICATE_MARKS, overlaps));
            }

            if (failedMarks > 0) {
                addWarning(GM.L.format(GM.L.WARN_MARKS_FAILED, failedMarks));
            }

            if (warnings.length > 0) alert(GM.L.WARN_PREFIX + warnings.join("\n"));
        } catch (e) {
            if (sessionOpen) {
                try { targetLayer.locked = prevLocked; } catch (eRst2) {}
            }
            alert(GM.CONSTANTS.SCRIPT_NAME + ": " + GM.L.ERR_UNEXPECTED + " — " + e.message);
        }
    },

    /**
     * Marks of a path run (spec §5, §9): eyelet line (Illustrator's offset
     * for a closed path with D > 0), corners on it, part of the outline,
     * distribution, and the check against the cut line. Touches the document
     * only through offsetPath, which leaves nothing behind.
     * @param {Object} cfg - Validated settings.
     * @param {Object} opts - {pathPartial} — per run, not stored.
     * @param {Object} pathInfo - getSelectedPathInfo() result (ok).
     * @param {number} unitFactor - Dialog units -> document units.
     * @param {number} scale - Document scaleFactor.
     * @param {Object} zoneCfg - Corner zones, document units.
     * @returns {Object} {ok:true, marks} or {ok:false, message}
     */
    pathMarks: function (cfg, opts, pathInfo, unitFactor, scale, zoneCfg) {
        var pd = cfg.pathDist || {};
        var distCfg = {
            useNumber: !!(pd.useNumber),
            number:    Math.max(pd.number  || 1, 1),
            spacing:   (pd.spacing || 0) * unitFactor
        };
        var D = pathInfo.closed ? (cfg.pathOffset || 0) * unitFactor : 0;
        var line = { circuit: pathInfo.circuit, segments: pathInfo.segments, closed: pathInfo.closed };
        if (D > 0) {
            var off = GM.Illustrator.offsetPath(pathInfo, D);
            if (!off.ok) return { ok: false, message: GM.L.format(GM.L.ERR_OFFSET_FAILED, off.message) };
            if (off.loops !== 1) return { ok: false, message: GM.L.format(GM.L.ERR_OFFSET_SPLIT, off.loops) };
            var segs = GM.Core.dropDegenerateSegments(off.segments, GM.CONSTANTS.SEGMENT_EPS);
            line = { circuit: GM.Core.buildCircuit(segs, true), segments: segs, closed: true };
        }
        var feat = GM.Core.findCorners(line.segments, line.closed, GM.CONSTANTS.CORNER_ANGLE_MIN, line.circuit);
        // Count on a cut line WITHOUT corners is N marks in an even ring (the
        // dialog says so). An eyelet line that gained cusps from the offset
        // (an ellipse offset by more than its smallest curvature radius) must
        // not turn them into the marks.
        var eyeCorners = (distCfg.useNumber && !(pathInfo.cornerCount > 0)) ? [] : feat.dists;
        var part = pathInfo.partial || { state: "none", runs: [] };
        var marks = [];
        if (opts.pathPartial && part.state === "runs") {
            for (var r = 0; r < part.runs.length; r++) {
                var run = D > 0 ? GM.Core.mapRun(pathInfo.circuit, part.runs[r], line.circuit) : part.runs[r];
                var cd = GM.Core.runCorners(eyeCorners, run, line.circuit.totalLen);
                var rm = GM.Core.placeAlong(line.circuit, cd, false, zoneCfg, distCfg, 0);
                for (var q = 0; q < rm.length; q++) marks.push(rm[q]);
            }
        } else {
            marks = GM.Core.placeAlong(line.circuit, eyeCorners, line.closed, zoneCfg, distCfg,
                GM.Core.topmostDist(line.circuit));
        }
        // Nothing to draw (an empty or degenerate eyelet line) is a failure,
        // never a silent success.
        var shown = String(cfg.pathOffset).replace(".", GM.L.DECIMAL_SEP) + " " + cfg.units;
        if (marks.length === 0) {
            return { ok: false, message: GM.L.format(GM.L.ERR_OFFSET_COLLAPSE, shown) };
        }
        // D = 0: marks sit on the cut line by construction — nothing to check.
        if (D > 0) {
            // The cut line's corner points, for marks in its inner corners
            // (checkMarks). A bend under OFFSET_CORNER_MIN moves a mitred corner
            // by under 4e-5 D, well inside the tolerance.
            var breaks = GM.Core.detectCorners(pathInfo.segments, true, GM.CONSTANTS.OFFSET_CORNER_MIN);
            var anchors = [];
            for (var ai = 0; ai < breaks.length; ai++) anchors.push(pathInfo.segments[breaks[ai]].p0);
            var chk = GM.Core.checkMarks(marks, pathInfo.circuit, D, GM.CONSTANTS.OFFSET_TOL / scale, anchors);
            if (!chk.ok) {
                return { ok: false, message: GM.L.format(GM.L.ERR_OFFSET_COLLAPSE, shown) };
            }
        }
        return { ok: true, marks: marks };
    }
};

// Run
GM.Main.run();
