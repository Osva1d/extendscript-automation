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
            DEFAULT_PRESET: "[Default]",

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
            EDGE_COUNT_HDR: "Count",
            EDGE_SPACING_HDR: "Spacing",
            OFFSET_LABEL: "Edge offset:",
            MIRROR_TOP: "= Top",
            MIRROR_LEFT: "= Left",
            MIRROR_TOP_ACTIVE: "mirrors top",
            MIRROR_LEFT_ACTIVE: "mirrors left",

            // Mark panel
            MARK_PANEL: "Mark",
            UNIT_LABEL: "Units:",
            TIP_UNITS: "Measurement units for all dimensions.",
            SIZE_LABEL: "Size:",
            MARK_SHAPE_LABEL: "Shape:",
            MARK_CIRCLE: "Circle",
            MARK_CROSS: "Cross",
            REG_WEIGHT: "Reg. stroke:",
            HALO_WEIGHT: "White halo:",
            TIP_MARK_SHAPE: "Mark shape — circle, cross, or both (registration over a white halo).",
            TIP_REG_WEIGHT: "Registration stroke weight in points (overprints).",
            TIP_HALO_WEIGHT: "White halo (knockout) stroke weight in points — keeps the mark legible on artwork.",

            // Placement panel
            PLACEMENT_PANEL: "Placement",
            MODE_ARTBOARD: "Artboard edges",
            MODE_PATH: "Selected path",
            TIP_MODE_PATH_DISABLED: "Select a path in the document first, then run the script again.",

            // Path panel
            PATH_PANEL: "Path",
            PATH_INFO_CLOSED: "Closed path",
            PATH_INFO_OPEN: "Open path",
            PATH_INFO_CORNERS: "%s corners",
            PATH_INFO_NO_CORNERS: "no corners",
            PATH_INFO_LENGTH: "perimeter ≈ %s %s",
            PATH_OFFSET_NOTE: "Marks sit centred on the path. For an inset from the material edge, offset the path first (Object ▸ Path ▸ Offset Path…).",
            TIP_PATH_COUNT_DISABLED: "A path with corners follows the spacing — the mark count emerges from the span lengths.",

            // Corner zones panel
            ZONES_PANEL: "Corner zones",
            ZONES_ENABLE: "Densify at corners",
            ZONES_COUNT: "Count:",
            ZONES_PITCH: "Pitch:",
            ZONES_FIRST: "— first",
            ZONES_MARKS_PITCH: "marks, pitch",
            TIP_ZONES: "First N marks from every corner use this pitch; the rest uses the edge/path spacing.",
            TIP_ZONES_NO_CORNERS: "The selected path has no corners — marks are distributed evenly along the whole perimeter.",

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
            TIP_SIZE: "Circle diameter or square side length in selected units",
            TIP_EDGE_ENABLE: "Enable/disable mark placement on this edge",
            TIP_PRESET_LOAD: "Select saved preset",
            TIP_SAVE: "Save settings to the active preset.",

            // Errors
            ERR_NO_DOC: "Open a document before running the script.",
            ERR_NO_EDGE: "At least one edge must be enabled.",
            ERR_NO_APPEARANCE: "Marks must have at least one shape — circle and/or cross.",
            ERR_UNEXPECTED: "Unexpected error",
            ERR_WRITE_SETTINGS: "Cannot write settings file.",
            WARN_MARKS_FAILED: "%s mark(s) could not be placed — check the target layer.",
            WARN_PREFIX: "WARNING: ",
            ERR_CANNOT_DELETE_DEFAULT: "Default preset cannot be deleted.",
            ERR_ENTER_NAME: "Enter a name.",
            ERR_RESERVED_NAME: "This name is reserved. Choose a different name.",
            ERR_MUST_BE_NUMBER: "%s must be a number!",
            ERR_MUST_BE_INTEGER: "%s must be a whole number!",
            ERR_OUT_OF_RANGE: "%s must be between %s and %s!",
            ERR_PATH_NO_SELECTION: "Nothing is selected. Select one path and run the script again.",
            ERR_PATH_NOT_A_PATH: "The selection is not a simple path. Release compound paths first: Object ▸ Compound Path ▸ Release.",
            ERR_PATH_TOO_SHORT: "The selected path has fewer than 2 points.",
            ERR_PATH_GONE: "The selected path is no longer available — select it again and rerun.",
            WARN_MODE_FALLBACK: "The preset uses Selected path mode, but no path is selected — switched to Artboard edges.",

            // Confirmations
            CONFIRM_DELETE_PRESET: "Permanently delete preset \"%s\"?",
            CONFIRM_OVERWRITE_PRESET: "Preset \"%s\" already exists. Replace?"
        },

        cs: {
            // Sentinel display strings
            DEFAULT_PRESET: "[Výchozí]",

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
            EDGE_COUNT_HDR: "Počet ok",
            EDGE_SPACING_HDR: "Rozestup",
            OFFSET_LABEL: "Odsazení od kraje:",
            MIRROR_TOP: "= Horní",
            MIRROR_LEFT: "= Levá",
            MIRROR_TOP_ACTIVE: "zrcadlí horní",
            MIRROR_LEFT_ACTIVE: "zrcadlí levou",

            // Mark panel
            MARK_PANEL: "Značka",
            UNIT_LABEL: "Jednotky:",
            TIP_UNITS: "Měrné jednotky pro všechny rozměry.",
            SIZE_LABEL: "Velikost:",
            MARK_SHAPE_LABEL: "Tvar:",
            MARK_CIRCLE: "Kruh",
            MARK_CROSS: "Kříž",
            REG_WEIGHT: "Reg. tah:",
            HALO_WEIGHT: "Bílé halo:",
            TIP_MARK_SHAPE: "Tvar značky — kruh, kříž, nebo oba (registrace přes bílé halo).",
            TIP_REG_WEIGHT: "Tloušťka registračního tahu v bodech (přetiskuje).",
            TIP_HALO_WEIGHT: "Tloušťka bílého podkladu (knockout) v bodech — udrží značku čitelnou na motivu.",

            // Placement panel
            PLACEMENT_PANEL: "Umístění",
            MODE_ARTBOARD: "Hrany artboardu",
            MODE_PATH: "Vybraná cesta",
            TIP_MODE_PATH_DISABLED: "Nejdřív vyberte cestu v dokumentu a spusťte skript znovu.",

            // Path panel
            PATH_PANEL: "Cesta",
            PATH_INFO_CLOSED: "Uzavřená cesta",
            PATH_INFO_OPEN: "Otevřená cesta",
            PATH_INFO_CORNERS: "%s rohů",
            PATH_INFO_NO_CORNERS: "bez rohů",
            PATH_INFO_LENGTH: "obvod ≈ %s %s",
            PATH_OFFSET_NOTE: "Značky leží středem na cestě. Potřebujete-li odsazení od kraje, posuňte si cestu předem (Objekt ▸ Cesta ▸ Posunout cestu…).",
            TIP_PATH_COUNT_DISABLED: "Cesta s rohy se řídí roztečí — počet značek vyplyne z délek úseků.",

            // Corner zones panel
            ZONES_PANEL: "Rohové zóny",
            ZONES_ENABLE: "Zhustit u rohů",
            ZONES_COUNT: "Počet:",
            ZONES_PITCH: "Rozteč:",
            ZONES_FIRST: "— prvních",
            ZONES_MARKS_PITCH: "značek, rozteč",
            TIP_ZONES: "Prvních N značek od každého rohu použije tuto rozteč; zbytek jede podle rozteče hrany/cesty.",
            TIP_ZONES_NO_CORNERS: "Vybraná cesta nemá rohy — značky se rozmístí rovnoměrně po obvodu.",

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
            TIP_SIZE: "Průměr kruhu nebo délka strany čtverce v měrných jednotkách",
            TIP_EDGE_ENABLE: "Zapne/vypne umístění značek na tuto hranu",
            TIP_PRESET_LOAD: "Vyberte uložené nastavení",
            TIP_SAVE: "Uložit nastavení do aktivní předvolby.",

            // Errors
            ERR_NO_DOC: "Před spuštěním skriptu otevřete dokument.",
            ERR_NO_EDGE: "Musí být zapnutá alespoň jedna hrana.",
            ERR_NO_APPEARANCE: "Značka musí mít aspoň jeden tvar — kruh a/nebo kříž.",
            ERR_UNEXPECTED: "Neočekávaná chyba",
            ERR_WRITE_SETTINGS: "Nelze zapsat soubor s nastavením.",
            WARN_MARKS_FAILED: "%s značek se nepodařilo umístit — zkontrolujte cílovou vrstvu.",
            WARN_PREFIX: "UPOZORNĚNÍ: ",
            ERR_CANNOT_DELETE_DEFAULT: "Výchozí nastavení nelze smazat.",
            ERR_ENTER_NAME: "Zadejte název.",
            ERR_RESERVED_NAME: "Tento název je rezervovaný. Vyberte jiný.",
            ERR_MUST_BE_NUMBER: "%s musí být číslo!",
            ERR_MUST_BE_INTEGER: "%s musí být celé číslo!",
            ERR_OUT_OF_RANGE: "%s musí být mezi %s a %s!",
            ERR_PATH_NO_SELECTION: "Nic není vybráno. Vyberte jednu cestu a spusťte skript znovu.",
            ERR_PATH_NOT_A_PATH: "Výběr není jednoduchá cesta. Složenou cestu nejdřív rozdělte: Objekt ▸ Složená cesta ▸ Uvolnit.",
            ERR_PATH_TOO_SHORT: "Vybraná cesta má méně než 2 body.",
            ERR_PATH_GONE: "Vybraná cesta už není dostupná — vyberte ji znovu a spusťte skript.",
            WARN_MODE_FALLBACK: "Předvolba používá režim Vybraná cesta, ale žádná cesta není vybraná — přepnuto na Hrany artboardu.",

            // Confirmations
            CONFIRM_DELETE_PRESET: "Trvale smazat nastavení \"%s\"?",
            CONFIRM_OVERWRITE_PRESET: "Nastavení \"%s\" již existuje. Nahradit?"
        }
    };

    var active = strings[lang] || strings["en"];

    // Simple string formatter: GM.L.format(GM.L.WARN_MARKS_FAILED, count)
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
