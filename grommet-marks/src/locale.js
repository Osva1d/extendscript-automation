// ------------------------------------------------------------------------
// Module: GM.L — localization (EN/CS string tables)
// Part of: Illustrator Grommet Marks
// Depends on: (none — self-contained IIFE)
// ------------------------------------------------------------------------
var GM = GM || {};

GM.L = (function () {
    // Detect Illustrator UI language
    var lang = "en";
    try {
        if (app.locale) lang = app.locale.substring(0, 2).toLowerCase();
    } catch (e) {}

    var strings = {
        en: {
            // Sentinel display strings
            CREATE_LABEL: "[Create 'Grommet Marks']",
            DEFAULT_PRESET: "[Default]",

            // Units
            UNIT_MM: "Millimeters",
            UNIT_CM: "Centimeters",
            UNIT_IN: "Inches",

            // Position panel
            POSITION_PANEL: "Mark position",
            EDGES_PANEL: "Edges",
            PREVIEW_PANEL: "Preview",
            PREVIEW_ACTIVE_EDGES: "Active edges: %s",
            PREVIEW_NONE: "No active edges",
            EDGE_TOP: "Top",
            EDGE_LEFT: "Left",
            EDGE_BOTTOM: "Bottom",
            EDGE_RIGHT: "Right",
            OFFSET_X: "Offset X:",
            OFFSET_Y: "Offset Y:",

            // Edge labels
            TOP: "Top",
            LEFT: "Left",
            BOTTOM_MIRROR: "Mirror top",
            BOTTOM_CUSTOM: "Bottom — custom",
            RIGHT_MIRROR: "Mirror left",
            RIGHT_CUSTOM: "Right — custom",

            // Edge fields
            COUNT: "Count:",
            SPACING: "Spacing:",

            // Mark panel
            MARK_PANEL: "Mark",
            UNIT_LABEL: "Units:",
            SIZE_LABEL: "Size:",
            SHAPE_LABEL: "Shape:",
            ROUND: "Round",
            SQUARE: "Square",

            // Appearance panel
            APPEARANCE_PANEL: "Appearance",
            LAYER: "Layer:",
            FILL: "Fill:",
            STROKE: "Stroke:",
            OVERPRINT: "Overprint",
            WEIGHT: "Weight:",
            POINTS: "pt",

            // Settings panel
            SETTINGS_PANEL: "Presets",
            LOAD: "Load:",
            DELETE: "Delete",
            SAVE: "Save",
            BTN_SAVE_AS: "Save As…",
            TIP_SAVE_AS: "Save current settings as a new preset.",
            BTN_RESET: "Reset",
            TIP_RESET: "Reset all settings to factory defaults.",
            PROMPT_SAVE_AS: "Save current settings as new preset:",

            // Buttons
            OK: "Generate",
            CANCEL: "Cancel",

            // Tooltips
            TIP_OFFSET_X: "Distance of mark centers from left and right artboard edges",
            TIP_OFFSET_Y: "Distance of mark centers from top and bottom artboard edges",
            TIP_COUNT: "Fixed number of marks per edge (spacing is calculated)",
            TIP_SPACING: "Preferred distance between mark centers (count is calculated)",
            TIP_MIRROR_BOTTOM: "Use same settings as top edge",
            TIP_MIRROR_RIGHT: "Use same settings as left edge",
            TIP_OVERPRINT: "Mark will print over other colors (overprint)",
            TIP_SIZE: "Circle diameter or square side length in selected units",
            TIP_FILL: "Mark fill color",
            TIP_STROKE: "Mark stroke color",
            TIP_LAYER: "Target layer for mark placement",
            TIP_WEIGHT: "Stroke weight in points",
            TIP_EDGE_ENABLE: "Enable/disable mark placement on this edge",
            TIP_SHAPE_ROUND: "Marks will be circular",
            TIP_SHAPE_SQUARE: "Marks will be square",
            TIP_PRESET_LOAD: "Select saved preset",
            TIP_SAVE: "Save settings to the active preset.",

            // Errors
            ERR_NO_DOC: "Open a document before running the script.",
            ERR_NO_EDGE: "At least one edge must be enabled.",
            ERR_NO_APPEARANCE: "Marks must have fill and/or stroke.",
            ERR_MARK_SIZE: "Mark size must be a positive number.",
            ERR_NEGATIVE_OFFSET: "Offset X and Y must not be negative.",
            ERR_INVALID_OFFSET: "Offset X and Y must be valid non-negative numbers.",
            ERR_INVALID_WEIGHT: "Stroke weight must be a positive number.",
            ERR_EDGE_COUNT: "Mark count must be a whole number ≥ 1.",
            ERR_EDGE_SPACING: "Mark spacing must be a positive number.",
            ERR_UNEXPECTED: "Unexpected error",
            ERR_WRITE_SETTINGS: "Cannot write settings file.",
            ERR_LAYER_NOT_FOUND: "Layer \"%s\" not found.",
            ERR_SWATCH_NOT_FOUND: "Swatch \"%s\" not found.",
            ERR_CANNOT_DELETE_DEFAULT: "Default preset cannot be deleted.",
            ERR_ENTER_NAME: "Enter a name.",
            ERR_RESERVED_NAME: "This name is reserved. Choose a different name.",
            ERR_PRESET_EXISTS: "Preset already exists. Overwrite?",
            ERR_MUST_BE_NUMBER: "%s must be a number!",
            ERR_MUST_BE_INTEGER: "%s must be a whole number!",
            ERR_OUT_OF_RANGE: "%s must be between %s and %s!",
            PRESET_PLACEHOLDER: "My Preset",

            // Confirmations
            CONFIRM_DELETE_PRESET: "Permanently delete preset \"%s\"?",
            CONFIRM_OVERWRITE_PRESET: "Preset \"%s\" already exists. Replace?"
        },

        cs: {
            // Sentinel display strings
            CREATE_LABEL: "[Vytvořit 'Grommet Marks']",
            DEFAULT_PRESET: "[Výchozí]",

            // Units
            UNIT_MM: "Milimetry",
            UNIT_CM: "Centimetry",
            UNIT_IN: "Palce",

            // Position panel
            POSITION_PANEL: "Pozice značek",
            EDGES_PANEL: "Hrany",
            PREVIEW_PANEL: "Náhled",
            PREVIEW_ACTIVE_EDGES: "Aktivní hrany: %s",
            PREVIEW_NONE: "Žádné aktivní hrany",
            EDGE_TOP: "Horní",
            EDGE_LEFT: "Levá",
            EDGE_BOTTOM: "Dolní",
            EDGE_RIGHT: "Pravá",
            OFFSET_X: "Odsazení X:",
            OFFSET_Y: "Odsazení Y:",

            // Edge labels
            TOP: "Horní",
            LEFT: "Levá",
            BOTTOM_MIRROR: "Zrcadlit horní",
            BOTTOM_CUSTOM: "Dolní — vlastní",
            RIGHT_MIRROR: "Zrcadlit levou",
            RIGHT_CUSTOM: "Pravá — vlastní",

            // Edge fields
            COUNT: "Počet ok:",
            SPACING: "Rozestup:",

            // Mark panel
            MARK_PANEL: "Značka",
            UNIT_LABEL: "Měrné jednotky:",
            SIZE_LABEL: "Velikost:",
            SHAPE_LABEL: "Tvar:",
            ROUND: "Kruh",
            SQUARE: "Čtverec",

            // Appearance panel
            APPEARANCE_PANEL: "Vzhled",
            LAYER: "Vrstva:",
            FILL: "Výplň:",
            STROKE: "Obrys:",
            OVERPRINT: "Přetisk",
            WEIGHT: "Tloušťka:",
            POINTS: "pt",

            // Settings panel
            SETTINGS_PANEL: "Předvolby",
            LOAD: "Načíst:",
            DELETE: "Smazat",
            SAVE: "Uložit",
            BTN_SAVE_AS: "Uložit jako…",
            TIP_SAVE_AS: "Uložit aktuální nastavení jako novou předvolbu.",
            BTN_RESET: "Reset",
            TIP_RESET: "Obnovit všechna nastavení na výchozí hodnoty.",
            PROMPT_SAVE_AS: "Uložit aktuální nastavení jako novou předvolbu:",

            // Buttons
            OK: "Generovat",
            CANCEL: "Storno",

            // Tooltips
            TIP_OFFSET_X: "Vzdálenost středu značek od levého a pravého okraje artboardu",
            TIP_OFFSET_Y: "Vzdálenost středu značek od horního a dolního okraje artboardu",
            TIP_COUNT: "Pevný počet značek na hraně (rozestup se dopočítá)",
            TIP_SPACING: "Preferovaná vzdálenost mezi středy značek (počet se dopočítá)",
            TIP_MIRROR_BOTTOM: "Použije stejné nastavení jako horní strana",
            TIP_MIRROR_RIGHT: "Použije stejné nastavení jako levá strana",
            TIP_OVERPRINT: "Značka bude tištěna přes ostatní barvy (overprint)",
            TIP_SIZE: "Průměr kruhu nebo délka strany čtverce v měrných jednotkách",
            TIP_FILL: "Barevná výplň značky",
            TIP_STROKE: "Obrysová linka značky",
            TIP_LAYER: "Cílová vrstva pro umístění značek",
            TIP_WEIGHT: "Tloušťka obrysové linky v bodech (points)",
            TIP_EDGE_ENABLE: "Zapne/vypne umístění značek na tuto hranu",
            TIP_SHAPE_ROUND: "Značka bude kruhová",
            TIP_SHAPE_SQUARE: "Značka bude čtvercová",
            TIP_PRESET_LOAD: "Vyberte uložené nastavení",
            TIP_SAVE: "Uložit nastavení do aktivní předvolby.",

            // Errors
            ERR_NO_DOC: "Před spuštěním skriptu otevřete dokument.",
            ERR_NO_EDGE: "Musí být zapnutá alespoň jedna hrana.",
            ERR_NO_APPEARANCE: "Značky musí mít výplň a/nebo obrys.",
            ERR_MARK_SIZE: "Velikost značky musí být kladné číslo.",
            ERR_NEGATIVE_OFFSET: "Odsazení X a Y nesmí být záporné.",
            ERR_INVALID_OFFSET: "Odsazení X a Y: zadejte platné nezáporné číslo.",
            ERR_INVALID_WEIGHT: "Tloušťka obrysu musí být kladné číslo.",
            ERR_EDGE_COUNT: "Počet značek musí být celé číslo ≥ 1.",
            ERR_EDGE_SPACING: "Rozestup značek musí být kladné číslo.",
            ERR_UNEXPECTED: "Neočekávaná chyba",
            ERR_WRITE_SETTINGS: "Nelze zapsat soubor s nastavením.",
            ERR_LAYER_NOT_FOUND: "Vrstva \"%s\" nenalezena.",
            ERR_SWATCH_NOT_FOUND: "Vzorník \"%s\" nenalezen.",
            ERR_CANNOT_DELETE_DEFAULT: "Výchozí nastavení nelze smazat.",
            ERR_ENTER_NAME: "Zadejte název.",
            ERR_RESERVED_NAME: "Tento název je rezervovaný. Vyberte jiný.",
            ERR_PRESET_EXISTS: "Předvolba již existuje. Přepsat?",
            ERR_MUST_BE_NUMBER: "%s musí být číslo!",
            ERR_MUST_BE_INTEGER: "%s musí být celé číslo!",
            ERR_OUT_OF_RANGE: "%s musí být mezi %s a %s!",
            PRESET_PLACEHOLDER: "Moje předvolba",

            // Confirmations
            CONFIRM_DELETE_PRESET: "Trvale smazat nastavení \"%s\"?",
            CONFIRM_OVERWRITE_PRESET: "Nastavení \"%s\" již existuje. Nahradit?"
        }
    };

    var active = strings[lang] || strings["en"];

    // Simple string formatter: GM.L.format(GM.L.ERR_LAYER_NOT_FOUND, layerName)
    active.format = function (template) {
        var args = [];
        for (var i = 1; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        var idx = 0;
        return template.replace(/%s/g, function () {
            return idx < args.length ? args[idx++] : "%s";
        });
    };

    return active;
})();
