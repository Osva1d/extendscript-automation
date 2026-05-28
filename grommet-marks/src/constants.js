// ------------------------------------------------------------------------
// Module: GM.CONSTANTS — script-wide constants
// Part of: Illustrator Grommet Marks
// Depends on: (none)
// ------------------------------------------------------------------------
var GM = GM || {};

GM.CONSTANTS = {
    SCRIPT_NAME: "Illustrator Grommet Marks",
    VERSION: "4.1.0",
    SETTINGS_FILE_NAME: "GrommetMarksSettings.json",

    LAYER_NAME: "Grommet Marks",
    SWATCH_NAME: "Grommet Marks",

    // Layer/swatch auto-creation sentinel — never displayed, used in logic only
    SENTINEL_CREATE: "__create__",

    // Unit system — internal keys, display names live in locale
    UNIT: { MM: "mm", CM: "cm", IN: "in" },
    UNIT_KEYS: ["mm", "cm", "in"],
    UNIT_FACTORS: {
        "mm": 2.834645669291339,
        "cm": 28.34645669291339,
        "in": 72
    }
};
