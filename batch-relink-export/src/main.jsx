(function (BRE) {
    try {
        var config = BRE.UI.show();
        if (!config) return;

        // Open template once to count PlacedItems for preview
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
        var slotCount = 0;
        try {
            var tplDoc = app.open(config.templateFile);
            slotCount = tplDoc.placedItems.length;
            tplDoc.close(SaveOptions.DONOTSAVECHANGES);
        } catch (e) {
            app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
            alert(BRE.L.ERR_TEMPLATE + "\n" + e.message);
            return;
        }
        app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;

        if (slotCount === 0) {
            alert(BRE.L.ERR_NO_LINKS);
            return;
        }

        // Pre-flight scan — count pages of every source PDF and classify
        // against the template position count. Surfaces every anomaly before
        // any destructive work; over-page files are hard-blocked in the loop.
        var scan = BRE.Core.scanSources(config.pdfFiles, slotCount);

        if (!BRE.UI.showPreview(config, slotCount, scan)) return;

        // Processing loop
        var results = {
            success: 0, errors: 0, skipped: 0, blocked: 0, removed: 0,
            cancelled: false, total: config.pdfFiles.length, log: []
        };

        var progress = BRE.UI.createProgress(config.pdfFiles.length);
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
        var doc = null;

        try {
            for (var i = 0; i < config.pdfFiles.length; i++) {
                if (progress.isCancelled()) {
                    results.cancelled = true;
                    break;
                }

                var currentFile = config.pdfFiles[i];
                var sourceFileName = currentFile.displayName || decodeURI(currentFile.name);
                var sourceName = BRE.Core.stripExtension(sourceFileName);

                var outputName = BRE.Core.buildOutputName(
                    config.namingPattern, i, config.pdfFiles.length,
                    config.templateName, sourceName
                );
                var outputFile = new File(config.outputFolder.fsName + "/" + outputName);

                progress.update(i, outputName);

                // Hard block: a file with more pages than positions would
                // silently drop pages. Refuse to process — never emit a lossy
                // sheet (the user cannot manually verify a large batch).
                var fileInfo = scan.items[i];
                if (fileInfo.status === "over") {
                    results.blocked++;
                    results.log.push(outputName + ": " + BRE.L.format(
                        BRE.L.ERR_OVER_PAGES, String(fileInfo.pages), String(slotCount)));
                    continue;
                }

                // Skip existing
                if (config.skipExisting && outputFile.exists) {
                    results.skipped++;
                    results.log.push(sourceFileName + ": " + BRE.L.SKIP_MSG);
                    continue;
                }

                try {
                    doc = app.open(config.templateFile);
                    BRE.Core.beginSession(doc);

                    try {
                        // Reuse the page count from the pre-flight scan
                        // (already counted once — no need to re-read the PDF).
                        var relinkResult = BRE.Core.relinkDocument(doc, currentFile, fileInfo.pages);

                        // Accumulate warnings and errors
                        var wi;
                        for (wi = 0; wi < relinkResult.warnings.length; wi++) {
                            results.log.push(outputName + ": " + relinkResult.warnings[wi]);
                        }
                        for (wi = 0; wi < relinkResult.errors.length; wi++) {
                            results.log.push(outputName + ": " + relinkResult.errors[wi]);
                        }
                        results.removed += relinkResult.removed;

                        if (relinkResult.relinked === 0) {
                            results.errors++;
                            results.log.push(outputName + ": " + BRE.L.ERR_NO_RELINK);
                            continue;
                        }

                        // Verify relink
                        var verification = BRE.Core.verifyRelink(doc, currentFile);
                        if (!verification.ok) {
                            results.errors++;
                            for (wi = 0; wi < verification.errors.length; wi++) {
                                results.log.push(outputName + ": " + verification.errors[wi]);
                            }
                            continue;
                        }

                        // Export PDF
                        var pdfOpts = new PDFSaveOptions();
                        try {
                            pdfOpts.pDFPreset = config.preset;
                        } catch (pe) {
                            pdfOpts.compatibility = PDFCompatibility.ACROBAT7;
                            pdfOpts.preserveEditability = false;
                        }
                        pdfOpts.saveMultipleArtboards = true;
                        pdfOpts.artboardRange = BRE.Config.artboardRange;

                        doc.saveAs(outputFile, pdfOpts);
                        results.success++;

                    } finally {
                        BRE.Core.endSession(doc);
                        try {
                            doc.close(SaveOptions.DONOTSAVECHANGES);
                        } catch (ce) {}
                        doc = null;
                    }

                } catch (e) {
                    results.errors++;
                    results.log.push(outputName + ": " + BRE.L.ERR_PROCESS + " (" + e.message + ")");
                    try {
                        if (doc) {
                            doc.close(SaveOptions.DONOTSAVECHANGES);
                            doc = null;
                        }
                    } catch (ce) {}
                }
            }

            progress.finish();

        } finally {
            app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
            progress.close();
        }

        // Summary
        BRE.UI.showSummary(results);

        if (config.openAfter && results.success > 0) {
            try { config.outputFolder.execute(); } catch (oe) {}
        }

    } catch (e) {
        try { app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS; } catch (x) {}
        alert(BRE.L.ERR_CRITICAL + e.message + " (line " + e.line + ")");
    }
})(BRE);
