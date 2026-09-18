// ------------------------------------------------------------------------
// Module: Entry point — IIFE, error boundary, two-phase run
// Part of: Illustrator Tile Export
// Depends on: TE.Config, TE.Doc, TE.Draw, TE.Export, TE.Grid, TE.L,
//             TE.Storage, TE.UI, TE.Utils, TE.Validate
// ------------------------------------------------------------------------
(function (TE) {
    try {
        if (app.documents.length === 0) { alert(TE.L.ERR_NO_DOC); return; }
        var doc = app.activeDocument;

        // Pin Y-up document coordinates. Every rect in this tool is
        // [left, top, right, bottom] with top > bottom, which only holds in
        // that system. A preference or an earlier script can flip it.
        // CS6 has no CoordinateSystem enum and is Y-up by definition, so the
        // swallow is safe there.
        try {
            app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
        } catch (csErr) {
            TE.Utils.log("coordinateSystem pin skipped: " + csErr.message);
        }

        var clean = TE.Doc.findCleanArtboard(doc);
        if (!clean) {
            alert(TE.L.format(TE.L.ERR_NO_CLEAN_AB, TE.Config.tilePrefix));
            return;
        }

        var graphics = TE.Doc.readGraphics(doc);
        if (graphics.length === 0) { alert(TE.L.ERR_NO_GRAPHIC); return; }
        var gBounds = graphics[0].geometricBounds;

        // Spot names feed the dialog's contour dropdown and its validation.
        var spotNames = [], si;
        try {
            for (si = 0; si < doc.spots.length; si++) { spotNames.push(doc.spots[si].name); }
        } catch (spotErr) { TE.Utils.log("spots unreadable: " + spotErr.message); }

        var pData = TE.Storage.load();
        if (!pData) {
            pData = { activePreset: TE.Config.PRESET_KEY_DEFAULT, presets: {} };
            pData.presets[TE.Config.PRESET_KEY_DEFAULT] = TE.Config.getDefaults();
        }

        // Guides are read for both directions up front: the dialog lets the
        // user switch direction, and re-reading the document on every keystroke
        // would make the live preview crawl.
        var guidesH = TE.Doc.readGuides(doc, "horizontal");
        var guidesV = TE.Doc.readGuides(doc, "vertical");

        var ctx = {
            cleanRect: clean.rect,
            spotNames: spotNames,
            markColors: TE.Draw.listMarkColors(doc),
            guides: guidesH.positions,
            guidesByDirection: { horizontal: guidesH, vertical: guidesV },
            validation: {
                overhang: TE.Doc.computeOverhang(gBounds, clean.rect),
                graphicCount: graphics.length,
                scaleFactor: TE.Utils.getSF(),
                mediaWidth: null,
                // Measured ceiling; the try/catch around artboards.add is the
                // real guard, because this number ages with the application.
                maxArtboard: 16200,
                // TE.UI.refresh() rewrites this on every keystroke from the
                // spot the user currently has selected.
                hasCutSpot: true
            }
        };

        var res = TE.UI.show(pData, ctx);
        if (!res || !res.action) { return; }

        if (!TE.Storage.save(res.wrapper)) { alert(TE.L.ERR_WRITE_SETTINGS); }
        var s = res.wrapper.presets[TE.Config.PRESET_KEY_LAST]
             || res.wrapper.presets[res.wrapper.activePreset];

        // --- phase 1: rebuild the panels from the clean artboard -------------
        // Contour is read once and handed to every panel's export.
        var contour = s.zundMode ? TE.Cut.findContour(doc, s.cutSpot) : [];
        // Mark colour definition, read once from the source document so each
        // temporary document can recreate it.
        var markDef = s.zundMode ? TE.Draw.readSpotDef(doc, s.markColor) : null;

        var guides = ctx.guidesByDirection[s.direction];
        var ext = (s.direction === "horizontal")
            ? { start: clean.rect[0], end: clean.rect[2] }
            : { start: clean.rect[3], end: clean.rect[1] };
        var cuts = TE.Grid.computeCuts(s, ext, guides.positions);
        var tiles = TE.Grid.computeTiles(cuts, clean.rect, s);

        var replaced = TE.Draw.removeTileArtboards(doc);
        // The lines layer exists exactly when lines are drawn: a run without
        // them clears last run's lines and takes the empty layer with it.
        var lay = s.drawLine ? TE.Draw.clearLinesLayer(doc) : null;
        if (!s.drawLine) { TE.Draw.removeLinesLayer(doc); }
        TE.Draw.createTileArtboards(doc, tiles);

        var i, item;
        if (s.drawLine) {
            for (i = 0; i < tiles.length; i++) {
                item = TE.Draw.drawTileLine(doc, tiles[i].expanded, s,
                    1 / TE.Utils.getEffectiveSF(s));
                item.move(lay, ElementPlacement.PLACEATEND);
            }
        }

        var msg = [];
        if (guides.hiddenCount > 0) {
            msg.push(TE.L.format(TE.L.WARN_GUIDE_HIDDEN, guides.hiddenCount));
        }

        if (res.action === "tiles") {
            // A repeat run rebuilds rather than adds; without saying so,
            // "3 created" reads as three more (N4).
            msg.push(TE.L.format(replaced > 0 ? TE.L.SUMMARY_TILES_REPLACED
                                              : TE.L.SUMMARY_TILES, tiles.length));
            alert(msg.join("\n"));
            return;
        }

        // --- phase 2: export -------------------------------------------------
        // The preview lines stay in the source document; every temporary
        // document draws its own, so a neighbour's line can never reach this
        // panel even though the panels overlap.
        var outFolder = new Folder(s.outputDir);
        if (!s.outputDir || !outFolder.exists) {
            alert(TE.L.format(TE.L.ERR_OUT_DIR, s.outputDir));
            return;
        }

        var pdfOpts = new PDFSaveOptions();
        pdfOpts.preserveEditability = false;
        if (s.pdfPreset) {
            try { pdfOpts.pDFPreset = s.pdfPreset; }
            catch (presetErr) { TE.Utils.log("PDF preset rejected: " + presetErr.message); }
        }

        var eCtx = {
            graphicFile: graphics[0].file,
            graphicBounds: gBounds,
            // The SOURCE's Large Canvas factor, read while the source is still
            // the active document. exportTile must not read it itself.
            scaleFactor: ctx.validation.scaleFactor,
            docName: String(doc.name).replace(/\.[^.]+$/, ""),
            outFolder: outFolder,
            total: tiles.length,
            pdfOptions: pdfOpts,
            contour: contour,
            markDef: markDef
        };

        var done = 0, skipped = 0, failed = [], noContour = [], res;
        for (i = 0; i < tiles.length; i++) {
            try {
                if (s.skipExisting && TE.Export.outputExists(tiles[i], eCtx, s)) {
                    skipped++;
                    continue;
                }
                res = TE.Export.exportTile(tiles[i], eCtx, s);
                // Zero cut paths means the contour does not reach this panel.
                // Legitimate for a middle panel of a rectangular cut-out, but
                // a panel that quietly arrives at the machine without cut data
                // is an unpleasant surprise there.
                if (s.zundMode && res.contourPaths === 0) { noContour.push(tiles[i].index); }
                done++;
            } catch (expErr) {
                failed.push(tiles[i].index + ": " + expErr.message);
            }
        }

        msg.push(TE.L.format(TE.L.SUMMARY_DONE, done, outFolder.fsName));
        if (skipped > 0) { msg.push(TE.L.format(TE.L.SUMMARY_SKIPPED, skipped)); }
        if (s.zundMode && noContour.length > 0) {
            msg.push(TE.L.format(TE.L.WARN_NO_CONTOUR, noContour.join(", ")));
        }
        if (failed.length > 0) { msg.push(failed.join("\n")); }
        alert(msg.join("\n"));

    } catch (e) {
        alert(TE.L.ERR_CRITICAL + e.message + (e.line ? ("\nLine: " + e.line) : ""));
    }
})(TE);
