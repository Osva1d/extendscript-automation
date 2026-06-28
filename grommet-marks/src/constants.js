// ------------------------------------------------------------------------
// Module: GM.CONSTANTS — script-wide constants
// Part of: Illustrator Grommet Marks
// Depends on: (none)
// ------------------------------------------------------------------------
var GM = GM || {};

GM.CONSTANTS = {
    SCRIPT_NAME: "Illustrator Grommet Marks",
    VERSION: "1.0.0",
    SETTINGS_FILE_NAME: "GrommetMarksSettings.json",

    LAYER_NAME: "Grommet Marks",

    // Layer auto-creation sentinel — never displayed, used in storage migration only
    SENTINEL_CREATE: "__create__",

    // Placement modes
    MODE_ARTBOARD: "artboard",
    MODE_PATH: "path",

    // Path geometry
    CORNER_ANGLE_MIN: 15,      // deg — tangent deviation above this = corner
    SAMPLES_PER_SEGMENT: 64,   // arc-length table resolution per Bézier
    MAX_MARKS: 9999,           // freeze guard per circuit (matches calcPositions cap)

    // Unit system — internal keys, display names live in locale
    UNIT: { MM: "mm", CM: "cm", IN: "in" },
    UNIT_KEYS: ["mm", "cm", "in"],
    UNIT_FACTORS: {
        "mm": 2.834645669291339,
        "cm": 28.34645669291339,
        "in": 72
    },

    // Layout rhythm — the ONLY source of spacing. Scale in steps of 4 px.
    // Never write a spacing/margin literal in the UI; always reference this.
    LAYOUT: {
        TIGHT:   4,    // elements that belong together: icon ↔ field, radio ↔ field
        GROUP:   8,    // items in a row, rows within a panel, label → content
        SECTION: 16,   // independent choices; gap between panels
        MARGIN:  16,   // panel inner padding (panel.margins)
        DIALOG:  20    // window outer margin (dlg.margins)
    }
};
