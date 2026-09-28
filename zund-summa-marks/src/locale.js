// ------------------------------------------------------------------------
// Module: ZSM.L — EN/CS stringtable, app.locale detection, format()
// Part of: Illustrator Zund & Summa Marks
// Depends on: —
// ------------------------------------------------------------------------
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
            WARN_PREFIX:         "WARNING: ",
            ERR_MUST_BE_NUMBER:  "%s must be a number!",
            ERR_MUST_BE_INTEGER: "%s must be a whole number!",
            ERR_OUT_OF_RANGE:    "%s must be between %s and %s!",
            ERR_NO_DOC:          "No document open.",
            ERR_NO_SEL:          "There is no artwork in the document to place marks around. Add artwork, or choose Fixed to Artboard.",
            ERR_CRITICAL:        "CRITICAL ERROR: ",
            ERR_RENDER_CRITICAL: "Critical error during rendering: %s\nThe document may be partly changed — check the layers and the artboard, or revert it with File › Revert.",
            ERR_WRITE_SETTINGS:  "Cannot write settings file.",
            ERR_COLOR_MISSING:   "Layer '%s': no path in the document uses the colour '%s', so nothing was moved. Check the colour of the cut paths.",
            WARN_COLOR_FALLBACK: "Mark colour '%s' is not in the document — marks drawn in [Registration].",
            WARN_SUMMA_REMOVED:  "Summa output was removed (marks, OPOS bar and the Trim layer): the Zünd artboard recompute would have invalidated it — OPOS marks must always be outermost. Artwork and cutting layers were not touched. When done, re-run SUMMA as the last step.",
            WARN_LAYERS_UNHIDDEN: "Hidden layers were made visible so the script could write into them: %s",
            ERR_MARKS_FAILED:    "Part of the output could not be drawn (marks, OPOS bar or trim lines; objects: %s) — the output is incomplete. Make sure the Regmarks and Trim layers are neither locked nor hidden, then run the script again.",
            WARN_MIXED_PAINT:    "Objects in the cut colour '%s' that also carry printable paint (a fill or stroke in another colour): %s. They were NOT moved to the cut layer — split each into a cut path and the printable shape.",
            WARN_PATHS_SKIPPED:  "Layer '%s': some paths in '%s' were left in place — inside a clipping mask: %s, on a locked or hidden layer: %s. The cutter will not cut them until they are moved by hand.",
            WARN_REG_ROUTING:    "Layer '%s': the registration colour cannot identify cut paths (it prints on every separation), so the row was skipped. Pick the cut spot colour in the layer table.",
            WARN_TRIM_FOREIGN:   "The 'Trim' layer also holds objects the script did not create — they were kept. The script only refreshes its own trim lines there; use a differently named layer for your own content.",
            ERR_RESERVED_LAYER:  "The layer '%s' cannot be used in the mapping — it belongs to the script (marks and trim lines), which rewrites its content. Pick another name in the layer table. The document was not changed.",
            ERR_ARTBOARD_TOO_LARGE: "The artboard would be %s × %s mm, which Illustrator does not allow. Reduce the artwork or the gaps, or prepare the document at a scale. Layers and marks were not changed.",
            ERR_GEOMETRY_INVALID: "The mark calculation produced invalid numbers — check the values in the settings (the preset may have been edited by hand). The document was not changed.",
            ERR_MARKS_ORIENT:    "The orientation mark would touch or overlap another mark (centres %s mm apart, mark size %s mm) — they would print as one shape. Change the orientation mark offset (or the mark spacing). The document was not changed.",
            ERR_MARKS_OVERLAP:   "Marks would touch or overlap (centres %s mm apart, mark size %s mm) — they would print as one shape. Increase the mark spacing or reduce the mark size. The document was not changed.",
            ERR_MARKS_OUTSIDE:   "A mark would stick out of the artboard by %s mm and be cropped in print. Reduce the orientation mark offset or use a larger artboard. The document was not changed.",
            ERR_LAY_COLOR:       "No color selected for layer '%s'.",
            ERR_LAY_NAME:        "A layer row has a color ('%s') but no name. Enter a layer name or remove the row.",
            ERR_SWATCH:          "Swatch '%s' not found.",
            ERR_GENERIC:         "ERROR: %s",

            // --- UI: Panels ---
            PANEL_PRESET: "Presets",
            PANEL_GEO:    "Mark Geometry & Gaps",
            PANEL_FEED:   "Feed Settings",
            PANEL_LAYERS: "Layer to Color Mapping",

            // --- UI: Technology ---
            LBL_MODE:      "Mode:",
            MODE_ZUND:     "ZUND",
            MODE_SUMMA:    "SUMMA",
            TIP_MODE:      "Select cutting technology (Zünd / Summa).",
            LBL_SOURCE:    "Source:",
            SRC_AUTO:      "Auto-fit to artwork",
            SRC_FIXED:     "Fixed to Artboard",
            TIP_SRC_AUTO:  "Marks are placed around all artwork in the document, including hidden layers and anything outside the artboard, and the artboard is resized to fit. The selection is ignored.",
            TIP_SRC_FIXED: "Marks placed relative to current Artboard; size unchanged.",
            SCALE_CHECKBOX:     "Work at scale",
            TIP_SCALE_CHECKBOX: "Enable when your document is a scaled-down representation (e.g. a 5 m banner prepared at 1:10 in a 500 mm artboard). Then enter all dimensions in real-world mm.",
            SCALE_FIELD_LABEL:  "1:",
            TIP_SCALE_FIELD:    "Document scale ratio. Enter N where 1 unit in your document equals N units in reality. Range 1–10.",

            // --- UI: Presets ---
            PRESET_LABEL:       "Preset:",
            TIP_PRESET:         "Select a saved preset to load its settings, or pick [Last Settings] to restore the values from your last Generate run.",
            TIP_REVERT:         "Discard unsaved changes and reload the selected preset as saved (enabled only when the preset has unsaved edits).",
            BTN_SAVE:           "Save",
            TIP_SAVE:           "Save changes to the current preset (disabled when no changes).",
            BTN_DEL:            "Delete",
            TIP_DEL:            "Delete currently selected preset.",
            PROMPT_SAVE_AS:     "Save current settings as new preset:",
            PRESET_DEFAULT:     "[Default]",
            ERR_PRESET_DEL_DEF: "You cannot delete the default preset.",
            CONFIRM_DEL_PRESET: "Delete preset '%s'? This cannot be undone.",
            ERR_PRESET_EXISTS:  "Preset already exists. Overwrite?",
            ERR_RESERVED_NAME:  "This name is reserved. Choose a different name.",
            BTN_SAVE_AS:        "Save As…",
            TIP_SAVE_AS:        "Save current settings as a new preset.",

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
            ORIENT_DIST:    "Orientation mark offset:",
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
            DDL_MISSING_SUFFIX: "(missing)",
            TIP_LAY_COLOR:  "Spot color used to match paths to this layer.",
            TIP_LAY_NAME:   "Layer name. Select from list or type custom.",
            TIP_BTN_REMOVE: "Remove this mapping row.",
            TIP_BTN_ADD:    "Add another layer mapping row.",
            BTN_ADD_LAYER:  "+ Add",
            MARKS_ONLY:     "Marks only (don't modify layers)",
            TIP_MARKS_ONLY: "Draw only the registration marks and leave all layers untouched — no path routing, no renaming. Use when your cut layers are already separated and only the marks are missing.",
            ERR_MIN_ROW:    "At least one mapping row is required.",
            DEF_CUT:        "Cut",
            DEF_KISS:       "Kiss-cut",

            // --- UI: Footer ---
            BTN_CANCEL: "Cancel",
            TIP_CANCEL: "Close without changes.",
            BTN_OK:     "Generate",
            TIP_OK:     "Calculate and generate marks.",
            PRESET_PLACEHOLDER: "My Preset",
            BTN_REVERT:        "Revert",
            STATUS_INVALID:    "Fix the highlighted fields.",
            STATUS_RANGE:      "%s — allowed range %s–%s.",
            STATUS_LAYER_NAME: "Enter a name for every layer row.",
            STATUS_DUP_COLOR:  "Colour %s is mapped to more than one layer — remove the duplicate.",
            STATUS_RANGE_MULTI: "%s issues — see the highlighted fields.",
            STATUS_OK:         "%s · layers: %s",
            STATUS_OK_MARKS:   "%s · marks only",
            PANEL_OUTPUT:      "Output Settings",
            BTN_RESET:         "Defaults",
            TIP_RESET:         "Load factory default settings into the dialog (does not overwrite any saved preset).",
            DEC_SEP:           "."
        },

        cs: {
            // --- Errors ---
            ERROR_PREFIX:        "CHYBA: ",
            WARN_PREFIX:         "UPOZORNĚNÍ: ",
            ERR_MUST_BE_NUMBER:  "%s musí být číslo!",
            ERR_MUST_BE_INTEGER: "%s musí být celé číslo!",
            ERR_OUT_OF_RANGE:    "%s musí být mezi %s a %s!",
            ERR_NO_DOC:          "Není otevřený dokument.",
            ERR_NO_SEL:          "V dokumentu není žádná grafika, kolem které by šly značky umístit. Přidejte grafiku, nebo zvolte Dle Artboardu (Fixed).",
            ERR_CRITICAL:        "KRITICKÁ CHYBA: ",
            ERR_RENDER_CRITICAL: "Kritická chyba při vykreslování: %s\nDokument může být částečně změněný — zkontrolujte vrstvy a artboard, případně ho vraťte přes Soubor › Vrátit.",
            ERR_WRITE_SETTINGS:  "Nelze zapsat soubor s nastavením.",
            ERR_COLOR_MISSING:   "Vrstva ‘%s’: v barvě ‘%s’ není v dokumentu žádná cesta, nic se nepřesunulo. Zkontrolujte barvu řezových cest.",
            WARN_COLOR_FALLBACK: "Barva značek ‘%s’ není v dokumentu — značky vykresleny v [Registration].",
            WARN_SUMMA_REMOVED:  "Výstup Summa byl odstraněn (značky, OPOS pruh a vrstva Trim): přepočet artboardu pro Zünd by jej zneplatnil — OPOS značky musí být vždy vnější. Grafika ani řezací vrstvy nebyly dotčeny. Po dokončení spusťte SUMMA znovu jako poslední krok.",
            WARN_LAYERS_UNHIDDEN: "Skryté vrstvy byly zviditelněny, aby do nich skript mohl zapsat: %s",
            ERR_MARKS_FAILED:    "Část výstupu se nepodařilo vykreslit (značky, OPOS pruh nebo ořezové linky; počet objektů: %s) — výstup není úplný. Zkontrolujte, že vrstvy Regmarks a Trim nejsou zamčené ani skryté, a spusťte skript znovu.",
            WARN_MIXED_PAINT:    "Objekty v řezové barvě ‘%s’, které mají i tiskovou výplň nebo tah v jiné barvě: %s. Do řezové vrstvy NEBYLY přesunuty — rozdělte každý na řezovou cestu a tiskový tvar.",
            WARN_PATHS_SKIPPED:  "Vrstva ‘%s’: některé cesty v barvě ‘%s’ zůstaly na místě — v ořezové masce: %s, v zamčené nebo skryté vrstvě: %s. Stroj je nevyřízne, dokud je ručně nepřesunete.",
            WARN_REG_ROUTING:    "Vrstva ‘%s’: registrační barvou nejde rozpoznat řezové cesty (tiskne se na všech separacích), řádek byl přeskočen. V tabulce vrstev vyberte přímou barvu řezu.",
            WARN_TRIM_FOREIGN:   "Vrstva ‘Trim’ obsahuje i objekty, které nevytvořil skript — zůstaly zachované. Skript v ní obnovuje jen své ořezové linky; pro vlastní obsah použijte vrstvu s jiným názvem.",
            ERR_RESERVED_LAYER:  "Vrstvu ‘%s’ nejde použít v mapování — patří skriptu (značky a ořezové linky) a skript její obsah přepisuje. V tabulce vrstev zvolte jiný název. Dokument nebyl změněn.",
            ERR_ARTBOARD_TOO_LARGE: "Artboard by měl %s × %s mm, a to Illustrator nedovolí. Zmenšete grafiku nebo mezery, případně dokument připravte v měřítku. Vrstvy ani značky se nezměnily.",
            ERR_GEOMETRY_INVALID: "Výpočet značek dal neplatná čísla — zkontrolujte hodnoty v nastavení (předvolba mohla být ručně upravená). Dokument nebyl změněn.",
            ERR_MARKS_ORIENT:    "Orientační značka by se dotýkala jiné značky nebo ji překrývala (středy %s mm od sebe, velikost značky %s mm) — na tisku by splynuly. Změňte odsazení orientační značky (případně rozteč značek). Dokument nebyl změněn.",
            ERR_MARKS_OVERLAP:   "Značky by se dotýkaly nebo překrývaly (středy %s mm od sebe, velikost značky %s mm) — na tisku by splynuly. Zvětšete rozteč značek nebo zmenšete značky. Dokument nebyl změněn.",
            ERR_MARKS_OUTSIDE:   "Značka by přesahovala artboard o %s mm a na tisku by byla oříznutá. Zmenšete odsazení orientační značky nebo zvětšete artboard. Dokument nebyl změněn.",
            ERR_LAY_COLOR:       "Chybí barva pro vrstvu ‘%s’. Vyberte barvu z nabídky.",
            ERR_LAY_NAME:        "Řádek vrstvy má barvu (‘%s’), ale nemá název. Zadejte název vrstvy nebo řádek odeberte.",
            ERR_SWATCH:          "Barva ‘%s’ nebyla v dokumentu nalezena.",
            ERR_GENERIC:         "CHYBA: %s",

            // --- UI: Panels ---
            PANEL_PRESET: "Předvolby",
            PANEL_GEO:    "Značky a mezery",
            PANEL_FEED:   "Nastavení role (Feed)",
            PANEL_LAYERS: "Přiřazení vrstev k barvám",

            // --- UI: Technology ---
            LBL_MODE:      "Režim:",
            MODE_ZUND:     "ZUND",
            MODE_SUMMA:    "SUMMA",
            TIP_MODE:      "Výběr cílové technologie řezu (Zünd / Summa).",
            LBL_SOURCE:    "Zdroj:",
            SRC_AUTO:      "Dle grafiky (Auto-fit)",
            SRC_FIXED:     "Dle Artboardu (Fixed)",
            TIP_SRC_AUTO:  "Značky se umístí kolem veškeré grafiky v dokumentu, i ve skrytých vrstvách a mimo artboard, a artboard se přizpůsobí. Výběr se nebere v úvahu.",
            TIP_SRC_FIXED: "Pozice značek se určí podle stávajícího Artboardu; jeho velikost se nemění.",
            SCALE_CHECKBOX:     "Pracovat v měřítku",
            TIP_SCALE_CHECKBOX: "Zapněte, pokud je dokument zmenšenou předlohou (např. 5m banner připravený v měřítku 1:10 na 500 mm artboardu). Pak zadávejte všechny rozměry v reálných mm.",
            SCALE_FIELD_LABEL:  "1:",
            TIP_SCALE_FIELD:    "Měřítko dokumentu. Zadejte N, kde 1 jednotka v dokumentu = N jednotek v realitě. Rozsah 1–10.",

            // --- UI: Presets ---
            PRESET_LABEL:       "Předvolba:",
            TIP_PRESET:         "Vyberte uloženou předvolbu pro načtení jejích nastavení, nebo zvolte [Last Settings] pro obnovení hodnot z posledního spuštění.",
            TIP_REVERT:         "Zahodit neuložené změny a načíst vybranou předvolbu znovu (aktivní jen když má předvolba neuložené úpravy).",
            BTN_SAVE:           "Uložit",
            TIP_SAVE:           "Uloží změny do aktuální předvolby (neaktivní, pokud nejsou žádné změny).",
            BTN_DEL:            "Smazat",
            TIP_DEL:            "Smazat aktuálně vybranou předvolbu.",
            PROMPT_SAVE_AS:     "Uložit aktuální nastavení jako novou předvolbu:",
            PRESET_DEFAULT:     "[Výchozí]",
            ERR_PRESET_DEL_DEF: "Výchozí předvolbu nelze smazat.",
            CONFIRM_DEL_PRESET: "Smazat předvolbu ‘%s’? Tuto akci nelze vrátit zpět.",
            ERR_PRESET_EXISTS:  "Předvolba již existuje. Přepsat?",
            ERR_RESERVED_NAME:  "Tento název je rezervovaný. Vyberte jiný.",
            BTN_SAVE_AS:        "Uložit jako…",
            TIP_SAVE_AS:        "Uložit aktuální nastavení jako novou předvolbu.",

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
            ORIENT_DIST:    "Odsazení orientační značky:",
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
            DDL_MISSING_SUFFIX: "(chybí)",
            TIP_LAY_COLOR:  "Přímá barva pro rozpoznání cest na této vrstvě.",
            TIP_LAY_NAME:   "Název vrstvy. Vyberte ze seznamu nebo napište vlastní.",
            TIP_BTN_REMOVE: "Odebrat toto mapování.",
            TIP_BTN_ADD:    "Přidat další mapování vrstvy.",
            BTN_ADD_LAYER:  "+ Přidat",
            MARKS_ONLY:     "Pouze značky (neměnit vrstvy)",
            TIP_MARKS_ONLY: "Vykreslí pouze registrační značky a nesáhne na žádné vrstvy — žádné přesouvání cest ani přejmenování. Použijte, když máte řezací vrstvy už separované a schází jen značky.",
            ERR_MIN_ROW:    "Musí existovat alespoň jedno mapování.",
            DEF_CUT:        "Cut",
            DEF_KISS:       "Kiss-cut",

            // --- UI: Footer ---
            BTN_CANCEL: "Storno",
            TIP_CANCEL: "Zavřít bez změn.",
            BTN_OK:     "Generovat",
            TIP_OK:     "Spustit výpočet a vygenerovat značky.",
            PRESET_PLACEHOLDER: "Moje předvolba",
            BTN_REVERT:        "Vrátit",
            STATUS_INVALID:    "Opravte zvýrazněná pole.",
            STATUS_RANGE:      "%s — povolený rozsah %s–%s.",
            STATUS_LAYER_NAME: "Zadejte název u každého řádku vrstvy.",
            STATUS_DUP_COLOR:  "Barva %s je přiřazena více vrstvám — odeberte duplicitu.",
            STATUS_RANGE_MULTI: "Chyb ve formuláři: %s — viz zvýrazněná pole.",
            STATUS_OK:         "%s · vrstvy: %s",
            STATUS_OK_MARKS:   "%s · pouze značky",
            PANEL_OUTPUT:      "Nastavení výstupu",
            BTN_RESET:         "Výchozí",
            TIP_RESET:         "Načte tovární výchozí nastavení do dialogu (uloženou předvolbu nepřepíše).",
            DEC_SEP:           ","
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
