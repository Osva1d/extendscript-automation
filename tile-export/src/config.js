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

    // Zünd mode is in the dialog again since the print mask (2026-09-25,
    // docs/reports/2026-09-25-maskovani-platu.md): the artwork now ends a
    // bleed past the cut, which frees the space the marks need on a split
    // panel. The mask is the panel rectangle; a shaped mask follows the
    // contour in a later stage. False hides the panel and the mode with it.
    ZUND_ENABLED: true,

    // The spot colour the shop's Zünd setup reads as a cut path (user,
    // 2026-09-26: "Cut" is enough). Offered in the cut colour list even when
    // the document lacks it: the export creates it in the output.
    CUT_SPOTS: ["Cut"],

    // Layer names of a Zünd panel file, the same as zund-summa-marks uses
    // (its src/config.js), so a file from either tool looks the same when
    // opened. The cut layer is named after the cut colour. Not localized.
    layerGraphics: "Graphics",
    layerRegmarks: "Regmarks",

    // The dialog checks Zünd marks for collisions on every keystroke, and the
    // shared findMarkConflict compares every pair: the cost grows with the
    // square of the count. A panel with more marks than this — a spacing of
    // a few centimetres — is left to the check main.js runs once before the
    // export, without a limit (N26).
    MARK_CHECK_LIVE_MAX: 200,

    // Illustrator rasterises from 72 DPI up: 71 fails with "Specified value
    // less than minimum allowed value", 72 passes (measured, N23). The dialog
    // stops the export below it instead of every panel failing on its own.
    RASTER_DPI_MIN: 72,

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
            // Off: tileWidth is the exact CLEAN width and the last panel takes
            // whatever is left over. On: it is a ceiling on the PRINTED width
            // — the roll — and the graphic splits into the fewest equal panels
            // that fit under it.
            equalPanels: false,
            guideRound:  0,             // mm step for rounding guide positions; 0 = as-is

            overlap:     20,            // mm, "přelep"; 0 for rigid boards
            overlapMode: "symmetric",   // "symmetric" | "onesided"
            // Which panel of a seam carries a one-sided overlap: "first" is the
            // left or upper one, "second" the right or lower. There is no single
            // trade convention — it follows the installation order, which in
            // turn follows the viewing direction outdoors and water shedding on
            // exteriors. Default "first" matches the tiled-PSV guidance (install
            // right to left, left tile laps onto the right); wallpaper is
            // commonly hung the other way. Irrelevant when the overlap is
            // double-cut away. Absent from older presets, which merge onto these
            // defaults and so keep the behaviour they had.
            overlapCarrier: "first",    // "first" | "second"

            addTop:      0,             // mm, "přídavek"; 0 means "načisto"
            addBottom:   0,
            addLeft:     0,
            addRight:    0,

            drawLine:    true,
            lineSpot:    "CutContour",
            // pt VISIBLE in print. Drawn centred on the panel edge at twice
            // this width, so the page edge crops the outer half (N13). 1 pt
            // (0.35 mm) is the user's call from the 2026-09-18 retest: the
            // earlier 0.3 pt — chosen from print-provider specs to sit above
            // the 0.25 pt hairline limit — proved too faint, and a viewer lost
            // it on two edges.
            lineWidth:   1,

            scaleN:      1,             // manual 1:N document scale
            exportMode:  "vector",      // "vector" | "raster"
            exportScale: "source",      // "source" | "actual"
            rasterDPI:   150,
            pdfPreset:   "",
            outputDir:   "",
            namePattern: "{doc}_{n}",

            // --- Zünd mode ---
            zundMode:    false,         // master switch
            // Spot colour of the cut path in the _cut PDF, and of a shaped
            // contour in the source when there is one. Names are case-
            // sensitive to the machine; the old default "cut" matched none.
            cutSpot:     "Cut",
            // mm of print past the cut: the mask. 3 or 5 mm usually, up to
            // 10 on large panels with room on the material (user, 2026-09-25).
            cutBleed:    5,
            markSizeZ:   5,             // mm, Zünd mark diameter
            // Marks get their OWN colour, never the contour's — otherwise the
            // machine cannot tell a mark from a cut. Registration is the
            // standard; white Spot 1 is used on black and clear material with
            // a clear liner.
            markColor:   "[Registration]",
            // mm clear between the END OF THE ARTWORK (the mask) and a mark,
            // as the shop does it by hand: 5 mm gap plus a 5 mm mark. It was
            // 10 mm from the panel edge before the mask existed.
            gapInner:    5,
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
