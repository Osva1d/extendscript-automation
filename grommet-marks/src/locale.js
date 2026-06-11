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
            DDL_MISSING_SUFFIX: "(missing)",

            // Units
            UNIT_MM: "Millimeters",
            UNIT_CM: "Centimeters",
            UNIT_IN: "Inches",

            // Edges panel
            EDGES_PANEL: "Edges",
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
            RIGHT_MIRROR: "Mirror left",

            // Edge fields
            COUNT: "Count:",
            SPACING: "Spacing:",

            // Mark panel
            MARK_PANEL: "Mark",
            UNIT_LABEL: "Units:",
            TIP_UNITS: "Measurement units for all dimensions.",
            SIZE_LABEL: "Size:",

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
            TIP_DELETE: "Delete the selected preset.",
            TIP_REVERT: "Discard unsaved changes and reload the selected preset.",
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
            TIP_PRESET_LOAD: "Select saved preset",
            TIP_SAVE: "Save settings to the active preset.",

            // Errors
            ERR_NO_DOC: "Open a document before running the script.",
            ERR_NO_EDGE: "At least one edge must be enabled.",
            ERR_NO_APPEARANCE: "Marks must have fill and/or stroke.",
            ERR_UNEXPECTED: "Unexpected error",
            ERR_WRITE_SETTINGS: "Cannot write settings file.",
            WARN_SWATCH_FALLBACK: "Swatch '%s' is not in the document — marks drawn in [Registration].",
            WARN_LAYER_CREATED: "Layer '%s' was not in the document — it has been created.",
            WARN_MARKS_FAILED: "%s mark(s) could not be placed — check the target layer.",
            WARN_PREFIX: "WARNING: ",
            ERR_CANNOT_DELETE_DEFAULT: "Default preset cannot be deleted.",
            ERR_ENTER_NAME: "Enter a name.",
            ERR_RESERVED_NAME: "This name is reserved. Choose a different name.",
            ERR_MUST_BE_NUMBER: "%s must be a number!",
            ERR_MUST_BE_INTEGER: "%s must be a whole number!",
            ERR_OUT_OF_RANGE: "%s must be between %s and %s!",

            // Confirmations
            CONFIRM_DELETE_PRESET: "Permanently delete preset \"%s\"?",
            CONFIRM_OVERWRITE_PRESET: "Preset \"%s\" already exists. Replace?"
        },

        cs: {
            // Sentinel display strings
            CREATE_LABEL: "[Vytvořit 'Grommet Marks']",
            DEFAULT_PRESET: "[Výchozí]",
            DDL_MISSING_SUFFIX: "(chybí)",

            // Units
            UNIT_MM: "Milimetry",
            UNIT_CM: "Centimetry",
            UNIT_IN: "Palce",

            // Edges panel
            EDGES_PANEL: "Hrany",
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
            RIGHT_MIRROR: "Zrcadlit levou",

            // Edge fields
            COUNT: "Počet ok:",
            SPACING: "Rozestup:",

            // Mark panel
            MARK_PANEL: "Značka",
            UNIT_LABEL: "Měrné jednotky:",
            TIP_UNITS: "Měrné jednotky pro všechny rozměry.",
            SIZE_LABEL: "Velikost:",

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
            TIP_DELETE: "Smazat vybranou předvolbu.",
            TIP_REVERT: "Zahodit neuložené změny a znovu načíst předvolbu.",
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
            TIP_PRESET_LOAD: "Vyberte uložené nastavení",
            TIP_SAVE: "Uložit nastavení do aktivní předvolby.",

            // Errors
            ERR_NO_DOC: "Před spuštěním skriptu otevřete dokument.",
            ERR_NO_EDGE: "Musí být zapnutá alespoň jedna hrana.",
            ERR_NO_APPEARANCE: "Značky musí mít výplň a/nebo obrys.",
            ERR_UNEXPECTED: "Neočekávaná chyba",
            ERR_WRITE_SETTINGS: "Nelze zapsat soubor s nastavením.",
            WARN_SWATCH_FALLBACK: "Vzorník ‘%s’ není v dokumentu — značky vykresleny v [Registration].",
            WARN_LAYER_CREATED: "Vrstva ‘%s’ nebyla v dokumentu — byla vytvořena.",
            WARN_MARKS_FAILED: "%s značek se nepodařilo umístit — zkontrolujte cílovou vrstvu.",
            WARN_PREFIX: "UPOZORNĚNÍ: ",
            ERR_CANNOT_DELETE_DEFAULT: "Výchozí nastavení nelze smazat.",
            ERR_ENTER_NAME: "Zadejte název.",
            ERR_RESERVED_NAME: "Tento název je rezervovaný. Vyberte jiný.",
            ERR_MUST_BE_NUMBER: "%s musí být číslo!",
            ERR_MUST_BE_INTEGER: "%s musí být celé číslo!",
            ERR_OUT_OF_RANGE: "%s musí být mezi %s a %s!",

            // Confirmations
            CONFIRM_DELETE_PRESET: "Trvale smazat nastavení \"%s\"?",
            CONFIRM_OVERWRITE_PRESET: "Nastavení \"%s\" již existuje. Nahradit?"
        }
    };

    var active = strings[lang] || strings["en"];

    // Simple string formatter: GM.L.format(GM.L.WARN_SWATCH_FALLBACK, swatchName)
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
