var ZSM = ZSM || {};

// ZSM.L — Localization module (IIFE, loaded before all other modules)
// Detects Illustrator locale and returns the active string table.
// Supports: en (default), cs
ZSM.L = (function () {
    var lang = "en";
    try {
        if (app.locale) lang = app.locale.substring(0, 2).toLowerCase();
    } catch (e) {}

    var strings = {
        en: {
            // --- Errors ---
            ERROR_PREFIX:        "ERROR: ",
            ERR_MUST_BE_NUMBER:  "%s must be a number!",
            ERR_OUT_OF_RANGE:    "%s must be between %s and %s!",
            ERR_NO_DOC:          "No document open.",
            ERR_NO_SEL:          "Nothing is selected.",
            ERR_CRITICAL:        "CRITICAL ERROR: ",
            ERR_RENDER_CRITICAL: "Critical error during rendering: ",
            ERR_WRITE_SETTINGS:  "Cannot write settings file.",
            ERR_COLOR_MISSING:   "Assigned color not found in document: %s",
            ERR_LAY_COLOR:       "No color selected for layer '%s'.",
            ERR_SWATCH:          "Swatch '%s' not found.",
            ERR_GENERIC:         "ERROR: %s",

            // --- UI: Panels ---
            PANEL_PRESET: "Presets",
            PANEL_TECH:   "Technology Selection",
            PANEL_GEO:    "Gap Settings",
            PANEL_FEED:   "Feed Settings",
            PANEL_LAYERS: "Layer to Color Mapping",

            // --- UI: Technology ---
            MODE_ZUND:     "ZUND",
            MODE_SUMMA:    "SUMMA",
            TIP_MODE:      "Select cutting technology (Zünd / Summa).",
            SRC_AUTO:      "Auto-fit to selection",
            SRC_FIXED:     "Fixed to Artboard",
            TIP_SRC_AUTO:  "Marks adapt to selected graphics; Artboard resized automatically.",
            TIP_SRC_FIXED: "Marks placed relative to current Artboard; size unchanged.",

            // --- UI: Presets ---
            PRESET_LABEL:       "Preset:",
            BTN_SAVE:           "Save",
            TIP_SAVE:           "Save current settings as new preset.",
            BTN_DEL:            "Delete",
            TIP_DEL:            "Delete currently selected preset.",
            PROMPT_NEW_PRESET:  "Enter name for new preset:",
            PRESET_DEFAULT:     "[Default]",
            ERR_PRESET_DEL_DEF: "You cannot delete the default preset.",
            ERR_PRESET_EXISTS:  "Preset already exists. Overwrite?",

            // --- UI: Gap Settings ---
            GAP_GZ:    "Gap from graphics:",
            TIP_GAP_GZ: "Distance from graphics edge to mark center.",
            GAP_ZO:    "Gap from edge:",
            TIP_GAP_ZO: "Distance from mark outer edge to Artboard edge.",
            MAX_DIST:  "Mark spacing:",
            TIP_MAX_DIST: "Maximum spacing between marks; intermediate marks inserted if exceeded.",
            MARK_SIZE_Z:  "Zünd size:",
            TIP_SIZE_Z:   "Zünd mark diameter.",
            MARK_SIZE_S:  "Summa size:",
            TIP_SIZE_S:   "Summa mark side length.",
            ORIENT_DIST:    "Orient mark offset:",
            TIP_ORIENT_DIST: "Distance from corner mark to orientation mark.",
            MARK_COLOR:   "Mark color (Spot):",
            TIP_MARK_COLOR: "Spot color for marks. '[Registration]' = all separations.",

            // --- UI: Feed ---
            FEED_TOP:  "Top feed:",
            TIP_FEED_TOP: "Top material overhang for feeder grip.",
            FEED_BOT:  "Bottom feed:",
            TIP_FEED_BOT: "Bottom material overhang for initial feed.",
            DRAW_RED:  "Add trim lines",
            TIP_DRAW_RED: "Red trim lines at sheet boundaries including feed overhang.",

            // --- UI: Layer mapping ---
            COL_COLOR:      "Color",
            COL_LAYER:      "Layer",
            TIP_LAY_COLOR:  "Spot color used to match paths to this layer.",
            TIP_LAY_NAME:   "Layer name. Select from list or type custom.",
            TIP_BTN_REMOVE: "Remove this mapping row.",
            TIP_BTN_ADD:    "Add another layer mapping row.",
            BTN_ADD_LAYER:  "+ Add",
            ERR_MIN_ROW:    "At least one mapping row is required.",
            DEF_CUT:        "Cut",
            DEF_KISS:       "Kiss-cut",

            // --- UI: Footer ---
            BTN_CANCEL: "Cancel",
            TIP_CANCEL: "Close without changes.",
            BTN_OK:     "Generate",
            TIP_OK:     "Calculate and generate marks.",
            PRESET_PLACEHOLDER: "My Preset"
        },

        cs: {
            // --- Errors ---
            ERROR_PREFIX:        "CHYBA: ",
            ERR_MUST_BE_NUMBER:  "%s musí být číslo!",
            ERR_OUT_OF_RANGE:    "%s musí být mezi %s a %s!",
            ERR_NO_DOC:          "Není otevřený dokument.",
            ERR_NO_SEL:          "Nic není vybráno.",
            ERR_CRITICAL:        "KRITICKÁ CHYBA: ",
            ERR_RENDER_CRITICAL: "Kritická chyba při vykreslování: ",
            ERR_WRITE_SETTINGS:  "Nelze zapsat soubor s nastavením.",
            ERR_COLOR_MISSING:   "Přiřazená barva nebyla v dokumentu nalezena: %s",
            ERR_LAY_COLOR:       "Chybí barva pro vrstvu ‘%s’. Vyberte barvu z nabídky.",
            ERR_SWATCH:          "Barva ‘%s’ nebyla v dokumentu nalezena.",
            ERR_GENERIC:         "CHYBA: %s",

            // --- UI: Panels ---
            PANEL_PRESET: "Předvolby",
            PANEL_TECH:   "Výběr technologie",
            PANEL_GEO:    "Nastavení mezer",
            PANEL_FEED:   "Nastavení role (Feed)",
            PANEL_LAYERS: "Přiřazení vrstev k barvám",

            // --- UI: Technology ---
            MODE_ZUND:     "ZUND",
            MODE_SUMMA:    "SUMMA",
            TIP_MODE:      "Výběr cílové technologie řezu (Zünd / Summa).",
            SRC_AUTO:      "Dle výběru (Auto-fit)",
            SRC_FIXED:     "Dle Artboardu (Fixed)",
            TIP_SRC_AUTO:  "Pozice značek se určí podle vybrané grafiky a Artboard se automaticky přizpůsobí.",
            TIP_SRC_FIXED: "Pozice značek se určí podle stávajícího Artboardu; jeho velikost se nemění.",

            // --- UI: Presets ---
            PRESET_LABEL:       "Předvolba:",
            BTN_SAVE:           "Uložit",
            TIP_SAVE:           "Uložit aktuální nastavení jako novou předvolbu.",
            BTN_DEL:            "Smazat",
            TIP_DEL:            "Smazat aktuálně vybranou předvolbu.",
            PROMPT_NEW_PRESET:  "Zadejte název nové předvolby:",
            PRESET_DEFAULT:     "[Výchozí]",
            ERR_PRESET_DEL_DEF: "Výchozí předvolbu nelze smazat.",
            ERR_PRESET_EXISTS:  "Předvolba již existuje. Přepsat?",

            // --- UI: Gap Settings ---
            GAP_GZ:    "Mezera od grafiky:",
            TIP_GAP_GZ: "Vzdálenost středu značky od okraje grafiky.",
            GAP_ZO:    "Mezera od okraje:",
            TIP_GAP_ZO: "Vzdálenost vnějšího okraje značky od hrany artboardu.",
            MAX_DIST:  "Rozteč značek:",
            TIP_MAX_DIST: "Maximální rozteč mezi značkami; při překročení se vloží mezilehlé.",
            MARK_SIZE_Z:  "Velikost Zünd:",
            TIP_SIZE_Z:   "Průměr značky Zünd.",
            MARK_SIZE_S:  "Velikost Summa:",
            TIP_SIZE_S:   "Délka strany značky Summa.",
            ORIENT_DIST:    "Vzdálenost orient. značky:",
            TIP_ORIENT_DIST: "Vzdálenost od rohové značky k orientační značce.",
            MARK_COLOR:   "Barva značek (Spot):",
            TIP_MARK_COLOR: "Přímá barva značek. ‘[Registration]’ = výchozí pro všechny separace.",

            // --- UI: Feed ---
            FEED_TOP:  "Horní výjezd (Top):",
            TIP_FEED_TOP: "Horní přesah materiálu pro uchycení v podavači.",
            FEED_BOT:  "Spodní nájezd (Bottom):",
            TIP_FEED_BOT: "Spodní přesah materiálu pro počáteční najetí stroje.",
            DRAW_RED:  "Přidat ořezové linky",
            TIP_DRAW_RED: "Vykreslí červené ořezové linky na hranicích archu včetně přesahů.",

            // --- UI: Layer mapping ---
            COL_COLOR:      "Barva",
            COL_LAYER:      "Vrstva",
            TIP_LAY_COLOR:  "Přímá barva pro rozpoznání cest na této vrstvě.",
            TIP_LAY_NAME:   "Název vrstvy. Vyberte ze seznamu nebo napište vlastní.",
            TIP_BTN_REMOVE: "Odebrat toto mapování.",
            TIP_BTN_ADD:    "Přidat další mapování vrstvy.",
            BTN_ADD_LAYER:  "+ Přidat",
            ERR_MIN_ROW:    "Musí existovat alespoň jedno mapování.",
            DEF_CUT:        "Cut",
            DEF_KISS:       "Kiss-cut",

            // --- UI: Footer ---
            BTN_CANCEL: "Zrušit",
            TIP_CANCEL: "Zavřít bez změn.",
            BTN_OK:     "Generovat",
            TIP_OK:     "Spustit výpočet a vygenerovat značky.",
            PRESET_PLACEHOLDER: "Moje předvolba"
        }
    };

    var active = strings[lang] || strings["en"];

    // String formatter: ZSM.L.format(ZSM.L.ERR_OUT_OF_RANGE, "Gap", 0, 100)
    active.format = function (template) {
        var args = [];
        for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
        var idx = 0;
        return template.replace(/%s/g, function () {
            return idx < args.length ? String(args[idx++]) : "%s";
        });
    };

    return active;
})();
