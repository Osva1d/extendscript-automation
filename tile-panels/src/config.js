var TP = TP || {};

TP.Config = {
    // --- Script metadata ---
    SCRIPT_NAME: "Tile Panels",
    VERSION: "1.0.0",
    AUTHOR: "Osva1d",
    COPYRIGHT_YEAR: "2026",
    debug: false,

    // --- Layer names ---
    LAYER_PREVIEW: "_TileSplitPreview",
    LAYER_MARKS:   "_TileMarks",

    // --- Name prefixes for split line pathItems ---
    SPLIT_V_PREFIX: "SplitV_",
    SPLIT_H_PREFIX: "SplitH_",

    // --- Hidden data textFrame prefix ---
    DATA_FRAME_PREFIX: "__TP_DATA__",

    // --- Split line appearance (Phase 1) ---
    SPLIT_LINE_WEIGHT:  0.5,   // pt
    SPLIT_LINE_DASH:    12,    // pt
    SPLIT_LINE_GAP:     4,     // pt
    SPLIT_LINE_EXTEND:  20,    // mm — extension beyond artwork bounds
    SPLIT_LABEL_SIZE:   7,     // pt — font size for position labels

    // --- Crop mark dimensions ---
    CROP_MARK_LENGTH:   5,     // mm
    CROP_MARK_OFFSET:   3,     // mm — gap between artboard edge and mark start
    CROP_MARK_WEIGHT:   0.25,  // pt

    // --- Panel label dimensions ---
    LABEL_OFFSET:       8,     // mm — offset from artboard corner
    LABEL_FONT_SIZE:    8,     // pt
    LABEL_FONT_NAME:    "Helvetica",

    // --- Overlap indicator ---
    OVERLAP_IND_WEIGHT: 0.25,  // pt
    OVERLAP_IND_DASH:   6,     // pt
    OVERLAP_IND_GAP:    3,     // pt
    OVERLAP_LABEL_SIZE: 6,     // pt

    // --- Registration crosshairs ---
    CROSSHAIR_ARM:      5,     // mm
    CROSSHAIR_WEIGHT:   0.25,  // pt

    // --- Illustrator limits ---
    MAX_ARTBOARDS:      1000,
    MAX_ARTBOARD_PT:    16344, // pt — max artboard dimension (~5765 mm)

    /**
     * Returns default settings for the setup dialog.
     * @returns {Object} Default settings object.
     */
    /**
     * Returns default settings for the setup dialog.
     * All dimensional values (overlap, bleed, panel width) are in REAL mm.
     * The scale factor converts them to document space internally.
     * @returns {Object} Default settings object.
     */
    getDefaults: function () {
        return {
            scale:          1,          // document scale (1 = full size, 10 = 1:10)
            mode:           "maxWidth", // "maxWidth" or "panelCount"
            // Mode: maxWidth
            maxPanelWidth:  1500,       // real mm
            maxPanelHeight: 0,          // real mm (0 = no horizontal splits)
            redistribute:   true,       // redistribute evenly if remainder too narrow
            redistributePct: 30,        // min remainder as % of max width before redistribution
            // Mode: panelCount
            columns:        4,
            rows:           1,          // 1 = no horizontal splits
            // Common
            overlap:        20,         // real mm
            overlapBothSides: false,    // false = right+down only, true = split overlap both sides

            bleedUniform:   true,
            bleed:          3,          // real mm (uniform value)
            bleedTop:       3,          // real mm
            bleedRight:     3,          // real mm
            bleedBottom:    3,          // real mm
            bleedLeft:      3,          // real mm
            keepOriginalArtboard: false,
            markCropMarks:      true,
            markLabels:         true,
            markOverlapIndicators: true,
            markCrosshairs:     false
        };
    },

    // --- Persistent storage ---
    Storage: {
        _folder: "TilePanels",
        _file:   "settings.json",

        /**
         * Returns the settings file handle.
         * @returns {File}
         */
        getFile: function () {
            var folder = new Folder(Folder.userData + "/" + TP.Config.Storage._folder);
            if (!folder.exists) folder.create();
            return new File(folder.fsName + "/" + TP.Config.Storage._file);
        },

        /**
         * Saves settings to disk.
         * @param {Object} data - Settings object.
         * @returns {boolean} True on success.
         */
        save: function (data) {
            try {
                var f = this.getFile();
                f.encoding = "UTF-8";
                f.open("w");
                f.write(JSON.stringify(data, null, 2));
                f.close();
                return true;
            } catch (e) {
                TP.Utils.log("Storage.save failed: " + e.message);
                return false;
            }
        },

        /**
         * Loads settings from disk.
         * @returns {Object|null} Parsed settings or null.
         */
        load: function () {
            try {
                var f = this.getFile();
                if (!f.exists) return null;
                f.encoding = "UTF-8";
                f.open("r");
                var content = f.read();
                f.close();
                if (!content) return null;
                return JSON.parse(content);
            } catch (e) {
                TP.Utils.log("Storage.load failed: " + e.message);
                return null;
            }
        }
    }
};
