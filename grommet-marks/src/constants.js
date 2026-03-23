// ------------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------------
GM.CONSTANTS = {
    SCRIPT_NAME: "Illustrator Grommet Marks",
    VERSION: "3.1.0",
    SETTINGS_FILE_NAME: "GrommetMarksSettings.json",

    // Functional identifiers (not displayed in UI)
    LAYER_NAME: "Grommet Marks",
    SWATCH_NAME: "Grommet Marks",

    // Internal sentinel values — never displayed, used in logic only
    SENTINEL_CREATE: "__create__",
    SENTINEL_DEFAULT: "__default__",

    // Unit system — internal keys, display names live in locale
    UNIT: { MM: "mm", CM: "cm", IN: "in" },
    UNIT_KEYS: ["mm", "cm", "in"],
    UNIT_FACTORS: {
        "mm": 2.834645669291339,
        "cm": 28.34645669291339,
        "in": 72
    }
};
