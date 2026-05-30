var ZSM = ZSM || {};

ZSM.Config = {
    scriptName: "Zund & Summa Marks",
    // KEEP IN SYNC with package.json "version" — build.sh reads package.json
    // for the dist header; this constant is the runtime source of truth
    // for the dialog title, footer copyright, and any in-script "About" UI.
    version:    "26.4.0",
    zundSize:    5,   // mm, default Zünd mark diameter
    summaSize:   3,   // mm, default Summa mark side

    summaXCenter: 10,  // mm: distance from graphic edge to Summa mark center (X)
    summaYVisual: 10,  // mm: gap from graphic edge to Summa mark outer edge (Y)
    redLineWidth: 1,   // pt: stroke width for trim lines
    rulerBuffer:  0.1,
    debug: false,

    // System layer names — not localized (must match document layer names exactly)
    layerRegmarks: "Regmarks",
    layerGraphics: "Graphics",
    PRESET_KEY_DEFAULT: "[Default]",

    ui: {
        // Title is composed at runtime so version bump only touches `version` above.
        // Czech-friendly Zünd umlaut is intentional (matches user's print-shop branding).
        title: null   // set below to "Zünd & Summa Marks v" + version
    },

    /**
     * Returns a fresh default settings object.
     * Used when no saved settings exist or as preset baseline.
     * layers[] uses {name, color} format — row existence implies active.
     * @returns {Object} Default settings.
     */
    getDefaults: function () {
        return {
            mode:             "ZUND",
            gapInner:         5,
            gapOuter:         0,
            maxDist:          500,
            feedTop:          70,
            feedBottom:       50,
            drawRed:          true,
            useArtboardBounds: false,
            markSizeZ:        5,
            markSizeS:        3,
            orientDist:       100,
            markColor:        "[Registration]",
            // Phase 2 (v26.4.0): manual scale support for shrunken docs.
            // scaleN = 1  → no scaling (user input == real mm == doc mm)
            // scaleN > 1  → doc is 1:N (user input in real mm; math divides by N
            //               on top of AI's scaleFactor). UI enabled via checkbox.
            scaleN:           1,
            layers: [
                { name: "Cut", color: "[Registration]" }
            ]
        };
    }
};

// Compose the runtime title (must run AFTER ZSM.Config object literal closes
// so `version` is already on the object).
ZSM.Config.ui.title = "Zünd & Summa Marks v" + ZSM.Config.version;

// Persistence (load/save + migrations) lives in src/lib/storage.js as
// ZSM.Storage. Use ZSM.Storage.{load,save} directly — there is no
// ZSM.Config.Storage anymore.
