(function (TP) {
    var draw = TP.Draw;
    var u = TP.Utils;
    var cfg = TP.Config;
    var l = TP.L;

    try {
        if (app.documents.length === 0) {
            alert(l.ERR_NO_DOC);
            return;
        }

        var doc = app.activeDocument;
        var phase = draw.detectPhase();

        // =================================================================
        // PHASE 1: SETUP — calculate grid, place interactive split lines
        // =================================================================
        if (phase === "SETUP") {

            // Read artwork bounds from active artboard (document points)
            var artworkBounds = draw.getArtworkBounds();
            // Document mm (without any scale)
            var artworkInfo = {
                widthMM:  u.pt2mm(artworkBounds[2] - artworkBounds[0]),
                heightMM: u.pt2mm(artworkBounds[1] - artworkBounds[3])
            };

            // Load saved settings or defaults
            var saved = cfg.Storage.load();
            var defaults = saved || cfg.getDefaults();

            // Show setup dialog — artworkInfo is in document mm,
            // dialog shows real size = document mm × scale
            var params = TP.UI.showSetup(defaults, artworkInfo);
            if (!params) return;

            // Persist settings
            cfg.Storage.save(params);

            // Calculate grid — all dimensions in REAL mm
            var scale = params.scale || 1;
            var realW = artworkInfo.widthMM * scale;
            var realH = artworkInfo.heightMM * scale;

            var gridParams = {
                artworkWidthMM:  realW,
                artworkHeightMM: realH,
                mode:            params.mode,
                maxPanelWidth:   params.maxPanelWidth,
                maxPanelHeight:  params.maxPanelHeight,
                redistribute:    params.redistribute,
                redistributePct: params.redistributePct,
                columns:         params.columns,
                rows:            params.rows
            };

            var grid = TP.Core.calculateGrid(gridParams);

            // Check if tiling is needed
            if (grid.totalPanels <= 1) {
                alert(l.ERR_ARTWORK_TOO_SMALL);
                return;
            }

            // Draw split lines (positions in real mm, converted to doc pts inside)
            draw.beginSession();
            draw.removePreviewLayer();
            draw.drawSplitLines(grid, artworkBounds, params);
            draw.endSession();

            app.redraw();
            alert(l.ALERT_SETUP_DONE);

        // =================================================================
        // PHASE 2: APPLY — read adjusted splits, create artboards, add marks
        // =================================================================
        } else {

            draw.beginSession();

            // Read stored params and split positions
            var storedParams = draw.readStoredParams();
            var splitInfo = draw.readSplitPositions();
            var artworkBounds = draw.getArtworkBounds();

            if (!storedParams) {
                alert(l.ERR_NO_STORED_PARAMS);
                return;
            }

            if (splitInfo.splitsV.length === 0 && splitInfo.splitsH.length === 0) {
                alert(l.ERR_NO_SPLIT_LINES);
                return;
            }

            // Show apply dialog
            var options = TP.UI.showApply(storedParams, splitInfo);
            if (!options) return;

            // Effective scale: user scale × Illustrator Large Canvas factor
            var scale = (options.scale || 1) * u.getSF();

            // Convert real mm values to document points
            // realMM / scale = documentMM, then mm2pt
            var overlapPt     = u.mm2pt(options.overlap / scale);
            var bleedTopPt    = u.mm2pt(options.bleedTop / scale);
            var bleedBottomPt = u.mm2pt(options.bleedBottom / scale);
            var bleedLeftPt   = u.mm2pt(options.bleedLeft / scale);
            var bleedRightPt  = u.mm2pt(options.bleedRight / scale);

            // Calculate artboard rects from split positions
            var panels = TP.Core.calculateArtboardRects({
                splitsV:       splitInfo.splitsV,
                splitsH:       splitInfo.splitsH,
                artworkBounds: artworkBounds,
                overlapPt:     overlapPt,
                overlapBothSides: options.overlapBothSides || false,
                bleedTopPt:    bleedTopPt,
                bleedBottomPt: bleedBottomPt,
                bleedLeftPt:   bleedLeftPt,
                bleedRightPt:  bleedRightPt
            });

            // Validate artboard count
            var totalNew = panels.length + (options.keepOriginalArtboard ? 1 : 0);
            if (doc.artboards.length - 1 + totalNew > cfg.MAX_ARTBOARDS) {
                alert(l.format(l.ERR_TOO_MANY_ARTBOARDS, totalNew));
                return;
            }

            // Validate artboard dimensions
            for (var i = 0; i < panels.length; i++) {
                var r = panels[i].rect;
                var pw = r[2] - r[0];
                var ph = r[1] - r[3];
                if (pw <= 0 || ph <= 0) {
                    alert("Panel " + panels[i].label + " has invalid dimensions: pw=" + pw + " ph=" + ph);
                    return;
                }
                if (pw > cfg.MAX_ARTBOARD_PT || ph > cfg.MAX_ARTBOARD_PT) {
                    alert(l.format(l.ERR_ARTBOARD_TOO_LARGE, panels[i].label) +
                        "\npw=" + u.roundMM(u.pt2mm(pw), 1) + "mm ph=" + u.roundMM(u.pt2mm(ph), 1) + "mm");
                    return;
                }
            }

            // Remove preview layer first (before artboard manipulation)
            draw.removePreviewLayer();

            // Create artboards
            draw.createArtboards(panels, options.keepOriginalArtboard);

            // Draw assembly marks (options.scale is passed through for label display)
            var filename = doc.name || "Untitled";
            draw.drawAllMarks(panels, options, overlapPt, filename);

            draw.endSession();
            app.redraw();
            alert(l.format(l.ALERT_APPLY_DONE, panels.length));
        }

    } catch (e) {
        alert(l.ERR_CRITICAL + e.message + " (line " + e.line + ")");
    } finally {
        // Safety net: restore layer locks even if an error occurred mid-session
        if (app.documents.length > 0) {
            try { draw.endSession(); } catch (e) {}
        }
    }
})(TP);
