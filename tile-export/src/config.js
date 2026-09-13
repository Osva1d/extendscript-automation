// ------------------------------------------------------------------------
// Module: TE.Config — constants, getDefaults()
// Part of: Illustrator Tile Export
// Depends on: —
// ------------------------------------------------------------------------
var TE = TE || {};

TE.Config = {
    scriptName: "Tile Export",
    // KEEP IN SYNC with package.json "version" — build.sh enforces this.
    version: "1.0.0",

    // Artboard name prefix. Marks generated panels so a second run can tell
    // them from the user's own clean-format artboard.
    tilePrefix: "TE_",
    // Layer that holds the red trim lines. Cleared on every start, so a crash
    // mid-run leaves nothing behind.
    layerLines: "TE_lines",

    // Preset keys. "[Last Settings]" always mirrors what the user last
    // submitted; named presets stay immutable until explicitly saved.
    PRESET_KEY_DEFAULT: "[Default]",
    PRESET_KEY_LAST: "[Last Settings]",

    // Read by shared/lib/cut_marks.js. The Summa values are unused here, but
    // the shared module is a straight move from zund-summa-marks and reads
    // them unconditionally — splitting it would be a refactor of production
    // code nobody asked for.
    summaXCenter: 10,
    summaYVisual: 10,

    debug: false,

    /**
     * Returns a fresh default settings object.
     * @returns {Object} Default settings.
     */
    getDefaults: function () {
        return {
            direction:   "horizontal",  // "horizontal" | "vertical"
            divideMode:  "count",       // "count" | "width" | "guides"
            tileCount:   3,
            tileWidth:   1000,          // mm, used when divideMode === "width"
            guideRound:  0,             // mm step for rounding guide positions; 0 = as-is

            overlap:     20,            // mm, "přelep"; 0 for rigid boards
            overlapMode: "symmetric",   // "symmetric" | "onesided"

            addTop:      0,             // mm, "přídavek"; 0 means "načisto"
            addBottom:   0,
            addLeft:     0,
            addRight:    0,

            drawLine:    true,
            lineSpot:    "CutContour",
            // pt of PRINTED output. 0.3 pt (0.11 mm) sits safely above the
            // 0.25 pt hairline threshold where a line can vanish into a single
            // pixel at 300 dpi, and stays thin enough not to widen the cut.
            lineWidth:   0.3,

            scaleN:      1,             // manual 1:N document scale
            exportMode:  "vector",      // "vector" | "raster"
            exportScale: "source",      // "source" | "actual"
            rasterDPI:   150,
            pdfPreset:   "",
            outputDir:   "",
            namePattern: "{doc}_{n}",

            // --- Zünd mode ---
            zundMode:    false,         // master switch
            cutSpot:     "cut",         // spot colour identifying the contour
            markSizeZ:   5,             // mm, Zünd mark diameter
            gapInner:    10,            // mm, gap from panel edge to mark
            gapOuter:    0,             // mm, extra artboard margin
            maxDist:     500,           // mm, maximum spacing between marks
            orientDist:  100,           // mm, orientation dot from the corner
            mode:        "ZUND",        // the shared geometry module branches on this
            // Unused here; the shared module reads them and would break on undefined.
            markSizeS:   3,
            feedTop:     70,
            feedBottom:  50,
            // Crash recovery: a run that died on panel 9 of 12 should not
            // re-export the eight that are already on disk.
            skipExisting: true
        };
    }
};
