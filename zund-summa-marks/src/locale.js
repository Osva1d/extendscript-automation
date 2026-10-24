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
            // Validation, one sentence for both cases: field, min, max. The
            // unit rides on the max (ZSM.Utils.validateNumber), so the scale has none.
            ERR_MUST_BE_NUMBER:  "%s: enter a number from %s to %s.",
            ERR_OUT_OF_RANGE:    "%s: enter a number from %s to %s.",
            // The canon's templates (extendscript-ui-standards 12.2).
            ERR_NO_DOC:          "Open a document before running the script.",
            ERR_NO_SEL:          "There is no artwork in the document to place marks around. Add artwork, or choose Fixed to Artboard. The document was not changed.",
            ERR_CRITICAL:        "The script stopped on an unexpected error: %s (line %s).\n\nThe document may be partly changed — check it, or undo the changes (Cmd+Z). Send this message to the script's maintainer.",
            ERR_RENDER_CRITICAL: "The script stopped on an unexpected error while drawing: %s (line %s).\n\nThe document may be partly changed — check the artboard and the layers, or undo the changes with several Cmd+Z steps; the artboard change is a step of its own. Send this message to the script's maintainer.",
            ERR_WRITE_SETTINGS:  "The presets could not be saved — next time the dialog opens without this change.",
            ERR_WRITE_SETTINGS_RUN: "The settings could not be saved — next time the dialog opens with the previous values. The marks will be drawn.",
            ERR_COLOR_MISSING:   "Layer '%s': no path in the document uses the colour '%s', so nothing was moved. Check the colour of the cut paths.",
            WARN_COLOR_FALLBACK: "Mark colour '%s' is not in the document — marks drawn in the registration colour.",
            WARN_SUMMA_REMOVED:  "Summa output was removed (marks, OPOS bar and the Trim layer): the Zünd artboard recompute would have invalidated it — OPOS marks must always be outermost. Artwork and cutting layers were not touched. When done, re-run SUMMA as the last step.",
            WARN_SUMMA_NOT_REMOVED: "The Summa output (marks, OPOS bar and the Trim layer) could not be removed: the Zünd artboard recompute has invalidated it — OPOS marks must always be outermost. Remove the 'Summa' sublayer of the 'Regmarks' layer and the 'Trim' layer by hand, then re-run SUMMA as the last step. Artwork and cutting layers were not touched.",
            WARN_LAYERS_UNHIDDEN: "Hidden layers were made visible so the script could write into them: %s",
            ERR_MARKS_FAILED:    "Part of the output could not be drawn (marks, OPOS bar or trim lines; objects: %s) — the output is incomplete. Make sure the Regmarks and Trim layers are neither locked nor hidden, then run the script again.",
            WARN_MIXED_PAINT:    "Objects in the cut colour '%s' that also carry printable paint (a fill or stroke in another colour): %s. They were NOT moved to the cut layer — split each into a cut path and the printable shape.",
            WARN_PATHS_SKIPPED:  "Layer '%s': some paths in '%s' were left in place — inside a clipping mask: %s, on a locked or hidden layer: %s. The cutter will not cut them until they are moved by hand.",
            WARN_REG_ROUTING:    "Layer '%s': the registration colour cannot identify cut paths (it prints on every separation), so the row was skipped. Pick the cut spot colour in the layer table.",
            WARN_TRIM_FOREIGN:   "The 'Trim' layer also holds objects the script did not create — they were kept. The script only refreshes its own trim lines there; use a differently named layer for your own content.",
            WARN_REGMARKS_FOREIGN: "The 'Regmarks' layer also holds objects the script did not create (objects: %s) — they were kept. The script only redraws its own sublayers 'Zünd' and 'Summa', so older marks or another tool's output stay beside the new marks; check them before cutting, and use a differently named layer for your own content.",
            ERR_RESERVED_LAYER:  "The layer '%s' cannot be used in the mapping — it belongs to the script (marks and trim lines), which rewrites its content. Pick another name in the layer table. The document was not changed.",
            ERR_ARTBOARD_TOO_LARGE: "The artboard would be %s × %s mm, which Illustrator does not allow. Reduce the artwork or the gaps, or prepare the document at a scale. The document was not changed.",
            ERR_GEOMETRY_INVALID: "The mark calculation produced invalid numbers — check the values in the settings (the preset may have been edited by hand). The document was not changed.",
            ERR_MARKS_ORIENT:    "The orientation mark would touch or overlap another mark (centres %s mm apart, mark size %s mm) — they would print as one shape. Change the orientation mark offset (or the max. mark spacing). The document was not changed.",
            ERR_MARKS_OVERLAP:   "Marks would touch or overlap (centres %s mm apart, mark size %s mm) — they would print as one shape. Increase the max. mark spacing or reduce the mark size. The document was not changed.",
            ERR_MARKS_OUTSIDE:   "A mark would stick out of the artboard by %s mm and be cropped in print. Reduce the orientation mark offset or use a larger artboard. The document was not changed.",
            ERR_LAY_NAME:        "A layer row has a color ('%s') but no name. Enter a layer name or remove the row.",

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
            // The drawing scale 1:N, as grommet-marks and tile-export word it; the
            // document remembers it (ZSM.DrawingScale).
            LBL_SCALE:     "Drawing scale 1:",
            TIP_SCALE:     "The scale the document is drawn at: 1:10 means the artwork is ten times smaller than the real thing. The document remembers it. Every value in the dialog is entered at real-world size, mark size included. Range 1–100.",

            // --- UI: Presets ---
            PRESET_LABEL:       "Preset:",
            TIP_PRESET:         "Select a saved preset to load its values and mode. The dialog always opens with the values of your last run.",
            TIP_REVERT:         "Discard unsaved changes and reload the selected preset as saved (enabled only when the preset has unsaved edits).",
            BTN_SAVE:           "Save",
            TIP_SAVE:           "Save changes to the current preset (disabled when no changes).",
            BTN_DEL:            "Delete",
            TIP_DEL:            "Delete currently selected preset.",
            PRESET_DEFAULT:     "[Default]",
            // The preset texts of the family canon (extendscript-ui-standards 12.4).
            PROMPT_SAVE_AS:     "Name of the new preset:",
            CONFIRM_OVERWRITE_PRESET: "Preset \"%s\" already exists. Replace it?",
            CONFIRM_DELETE_PRESET:    "Delete preset \"%s\"? This cannot be undone.",
            ERR_ENTER_NAME:     "Enter a preset name.",
            ERR_RESERVED_NAME:  "Names in square brackets are reserved. Choose another name.",
            ERR_CANNOT_DELETE_DEFAULT: "The default preset cannot be deleted.",
            BTN_SAVE_AS:        "Save As…",
            TIP_SAVE_AS:        "Save the current values as a new preset.",

            // --- UI: Gap Settings ---
            GAP_GZ:    "Gap from graphics:",
            TIP_GAP_GZ: "Gap between the edge of the artwork and the edge of the mark.",
            GAP_ZO:    "Gap from edge:",
            TIP_GAP_ZO: "Distance from mark outer edge to Artboard edge.",
            MAX_DIST:  "Max. mark spacing:",
            TIP_MAX_DIST: "Maximum spacing between marks; intermediate marks inserted if exceeded.",
            MARK_SIZE_Z:  "Mark diameter:",
            TIP_SIZE_Z:   "Zünd mark diameter.",
            MARK_SIZE_S:  "Summa size:",
            TIP_SIZE_S:   "Summa mark side length.",
            ORIENT_DIST:    "Orientation mark offset:",
            TIP_ORIENT_DIST: "Gap between the edges of the marks, from the corner mark to the orientation mark.",
            MARK_COLOR:   "Mark color:",
            TIP_MARK_COLOR: "Spot color for marks. The registration color prints on all separations.",

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
            TIP_MARKS_ONLY: "Draws only the registration marks (and, in SUMMA, the trim lines): no paths are moved and your layers are not renamed. The artboard is still resized unless Fixed to Artboard is selected. Use when your cut layers are already separated.",

            // --- UI: Footer ---
            BTN_CANCEL: "Cancel",
            TIP_CANCEL: "Close without changes.",
            BTN_OK:     "Generate",
            TIP_OK:     "Calculate and generate marks.",
            BTN_REVERT:        "↺",
            STATUS_INVALID:    "Fix the highlighted fields.",
            STATUS_RANGE:      "%s — allowed range %s–%s.",
            STATUS_LAYER_NAME: "Enter a name for every layer row.",
            STATUS_DUP_COLOR:  "Colour \"%s\" is mapped twice — remove the duplicate.",
            STATUS_RANGE_MULTI: "%s issues — see the highlighted fields.",
            // The status line at rest: what the script found in the document,
            // joined with " · " after the mode (spec 1.2.0 §7).
            STATUS_FOUND_ARTBOARD: "artboard %s × %s mm",
            STATUS_FOUND_ARTWORK:  "artwork %s × %s mm",
            STATUS_FOUND_CUT:  "cut \"%s\"",
            STATUS_NO_CUT:     "no cut colour",
            STATUS_MARKS_ONLY: "marks only",
            PANEL_OUTPUT:      "Output Settings",
            BTN_RESET:         "Defaults",
            TIP_RESET:         "Load the factory default values into the dialog (does not overwrite any saved preset).",
            DEC_SEP:           ".",
            // Thousands in the status line's sizes; never in a field.
            THOU_SEP:          ","
        },

        cs: {
            // --- Errors ---
            ERROR_PREFIX:        "CHYBA: ",
            WARN_PREFIX:         "UPOZORNĚNÍ: ",
            // Ověření: jedna věta pro oba případy — pole, min, max. Jednotka se
            // připojuje k maximu (ZSM.Utils.validateNumber), měřítko ji nemá.
            ERR_MUST_BE_NUMBER:  "%s: zadejte číslo od %s do %s.",
            ERR_OUT_OF_RANGE:    "%s: zadejte číslo od %s do %s.",
            // Šablony kánonu (extendscript-ui-standards 12.2).
            ERR_NO_DOC:          "Před spuštěním skriptu otevřete dokument.",
            ERR_NO_SEL:          "V dokumentu není žádná grafika, kolem které by šly značky umístit. Přidejte grafiku, nebo zvolte Dle artboardu (Fixed). Dokument nebyl změněn.",
            ERR_CRITICAL:        "Skript se zastavil kvůli neočekávané chybě: %s (řádek %s).\n\nDokument může být částečně změněný — zkontrolujte ho, případně změny vraťte (Cmd+Z). Pošlete tuto hlášku správci skriptu.",
            ERR_RENDER_CRITICAL: "Skript se zastavil při kreslení kvůli neočekávané chybě: %s (řádek %s).\n\nDokument může být částečně změněný — zkontrolujte artboard a vrstvy, případně změny vraťte několika kroky Zpět (Cmd+Z); změna artboardu je samostatný krok. Pošlete tuto hlášku správci skriptu.",
            ERR_WRITE_SETTINGS:  "Předvolby se nepodařilo uložit — příště se dialog otevře bez této změny.",
            ERR_WRITE_SETTINGS_RUN: "Nastavení se nepodařilo uložit — příště se dialog otevře s předchozími hodnotami. Značky se vykreslí.",
            ERR_COLOR_MISSING:   "Vrstva „%s“: v barvě „%s“ není v dokumentu žádná cesta, nic se nepřesunulo. Zkontrolujte barvu řezových cest.",
            WARN_COLOR_FALLBACK: "Barva značek „%s“ není v dokumentu — značky vykresleny v registrační barvě.",
            WARN_SUMMA_REMOVED:  "Výstup Summa byl odstraněn (značky, OPOS pruh a vrstva Trim): přepočet artboardu pro Zünd by jej zneplatnil — OPOS značky musí být vždy vnější. Grafika ani řezací vrstvy nebyly dotčeny. Po dokončení spusťte SUMMA znovu jako poslední krok.",
            WARN_SUMMA_NOT_REMOVED: "Výstup Summa (značky, OPOS pruh a vrstvu Trim) se nepodařilo odstranit: přepočet artboardu pro Zünd jej zneplatnil — OPOS značky musí být vždy vnější. Odstraňte ručně podvrstvu „Summa“ ve vrstvě „Regmarks“ a vrstvu „Trim“ a po dokončení spusťte SUMMA znovu jako poslední krok. Grafika ani řezací vrstvy nebyly dotčeny.",
            WARN_LAYERS_UNHIDDEN: "Skryté vrstvy byly zviditelněny, aby do nich skript mohl zapsat: %s",
            ERR_MARKS_FAILED:    "Část výstupu se nepodařilo vykreslit (značky, OPOS pruh nebo ořezové linky; počet objektů: %s) — výstup není úplný. Zkontrolujte, že vrstvy Regmarks a Trim nejsou zamčené ani skryté, a spusťte skript znovu.",
            WARN_MIXED_PAINT:    "Objekty v řezové barvě „%s“, které mají i tiskovou výplň nebo tah v jiné barvě: %s. Do řezové vrstvy NEBYLY přesunuty — rozdělte každý na řezovou cestu a tiskový tvar.",
            WARN_PATHS_SKIPPED:  "Vrstva „%s“: některé cesty v barvě „%s“ zůstaly na místě — v ořezové masce: %s, v zamčené nebo skryté vrstvě: %s. Stroj je nevyřízne, dokud je ručně nepřesunete.",
            WARN_REG_ROUTING:    "Vrstva „%s“: registrační barvou nejde rozpoznat řezové cesty (tiskne se na všech separacích), řádek byl přeskočen. V tabulce vrstev vyberte přímou barvu řezu.",
            WARN_TRIM_FOREIGN:   "Vrstva „Trim“ obsahuje i objekty, které nevytvořil skript — zůstaly zachované. Skript v ní obnovuje jen své ořezové linky; pro vlastní obsah použijte vrstvu s jiným názvem.",
            WARN_REGMARKS_FOREIGN: "Vrstva „Regmarks“ obsahuje i objekty, které nevytvořil skript (objektů: %s) — zůstaly zachované. Skript v ní obnovuje jen své podvrstvy „Zünd“ a „Summa“, takže starší značky nebo výstup jiného nástroje zůstávají vedle nových značek; před řezáním je zkontrolujte a pro vlastní obsah použijte vrstvu s jiným názvem.",
            ERR_RESERVED_LAYER:  "Vrstvu „%s“ nejde použít v mapování — patří skriptu (značky a ořezové linky) a skript její obsah přepisuje. V tabulce vrstev zvolte jiný název. Dokument nebyl změněn.",
            ERR_ARTBOARD_TOO_LARGE: "Artboard by měl %s × %s mm, a to Illustrator nedovolí. Zmenšete grafiku nebo mezery, případně dokument připravte v měřítku. Dokument nebyl změněn.",
            ERR_GEOMETRY_INVALID: "Výpočet značek dal neplatná čísla — zkontrolujte hodnoty v nastavení (předvolba mohla být ručně upravená). Dokument nebyl změněn.",
            ERR_MARKS_ORIENT:    "Orientační značka by se dotýkala jiné značky nebo ji překrývala (středy %s mm od sebe, velikost značky %s mm) — na tisku by splynuly. Změňte odsazení orientační značky (případně max. rozteč značek). Dokument nebyl změněn.",
            ERR_MARKS_OVERLAP:   "Značky by se dotýkaly nebo překrývaly (středy %s mm od sebe, velikost značky %s mm) — na tisku by splynuly. Zvětšete max. rozteč značek nebo zmenšete značky. Dokument nebyl změněn.",
            ERR_MARKS_OUTSIDE:   "Značka by přesahovala artboard o %s mm a na tisku by byla oříznutá. Zmenšete odsazení orientační značky nebo zvětšete artboard. Dokument nebyl změněn.",
            ERR_LAY_NAME:        "Řádek vrstvy má barvu („%s“), ale nemá název. Zadejte název vrstvy nebo řádek odeberte.",

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
            SRC_FIXED:     "Dle artboardu (Fixed)",
            TIP_SRC_AUTO:  "Značky se umístí kolem veškeré grafiky v dokumentu, i ve skrytých vrstvách a mimo artboard, a artboard se přizpůsobí. Výběr se nebere v úvahu.",
            TIP_SRC_FIXED: "Pozice značek se určí podle stávajícího artboardu; jeho velikost se nemění.",
            LBL_SCALE:     "Měřítko kresby 1:",
            TIP_SCALE:     "V jakém měřítku je dokument nakreslený: 1:10 znamená, že grafika je desetkrát menší než ve skutečnosti. Dokument si ho zapamatuje. Hodnoty v dialogu se zadávají ve skutečné velikosti, včetně velikosti značek. Rozsah 1–100.",

            // --- UI: Presets ---
            PRESET_LABEL:       "Předvolba:",
            TIP_PRESET:         "Vyberte uloženou předvolbu; načtou se její hodnoty i režim. Dialog se vždy otevírá s hodnotami posledního spuštění.",
            TIP_REVERT:         "Zahodit neuložené změny a načíst vybranou předvolbu znovu (aktivní jen když má předvolba neuložené úpravy).",
            BTN_SAVE:           "Uložit",
            TIP_SAVE:           "Uloží změny do aktuální předvolby (neaktivní, pokud nejsou žádné změny).",
            BTN_DEL:            "Smazat",
            TIP_DEL:            "Smazat aktuálně vybranou předvolbu.",
            PRESET_DEFAULT:     "[Výchozí]",
            // Věty předvoleb podle kánonu rodiny (extendscript-ui-standards 12.4).
            PROMPT_SAVE_AS:     "Název nové předvolby:",
            CONFIRM_OVERWRITE_PRESET: "Předvolba „%s“ už existuje. Přepsat?",
            CONFIRM_DELETE_PRESET:    "Smazat předvolbu „%s“? Smazání nejde vrátit.",
            ERR_ENTER_NAME:     "Zadejte název předvolby.",
            ERR_RESERVED_NAME:  "Názvy v hranatých závorkách jsou vyhrazené. Zvolte jiný název.",
            ERR_CANNOT_DELETE_DEFAULT: "Výchozí předvolbu nejde smazat.",
            BTN_SAVE_AS:        "Uložit jako…",
            TIP_SAVE_AS:        "Uložit aktuální hodnoty jako novou předvolbu.",

            // --- UI: Gap Settings ---
            GAP_GZ:    "Mezera od grafiky:",
            TIP_GAP_GZ: "Mezera mezi okrajem grafiky a okrajem značky.",
            GAP_ZO:    "Mezera od okraje:",
            TIP_GAP_ZO: "Vzdálenost vnějšího okraje značky od hrany artboardu.",
            MAX_DIST:  "Max. rozteč značek:",
            TIP_MAX_DIST: "Maximální rozteč mezi značkami; při překročení se vloží mezilehlé.",
            MARK_SIZE_Z:  "Průměr značky:",
            TIP_SIZE_Z:   "Průměr značky Zünd.",
            MARK_SIZE_S:  "Velikost Summa:",
            TIP_SIZE_S:   "Délka strany značky Summa.",
            ORIENT_DIST:    "Odsazení orientační značky:",
            TIP_ORIENT_DIST: "Mezera mezi okraji značek, od rohové značky k orientační značce.",
            MARK_COLOR:   "Barva značek:",
            TIP_MARK_COLOR: "Přímá barva značek. Registrační barva se tiskne na všech separacích.",

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
            TIP_MARKS_ONLY: "Vykreslí jen registrační značky (a u SUMMA ořezové linky): cesty nepřesouvá a vaše vrstvy nepřejmenovává. Artboard se přizpůsobí, pokud není zvoleno Dle artboardu. Použijte, když máte řezací vrstvy už separované.",

            // --- UI: Footer ---
            BTN_CANCEL: "Storno",
            TIP_CANCEL: "Zavřít bez změn.",
            BTN_OK:     "Generovat",
            TIP_OK:     "Spustit výpočet a vygenerovat značky.",
            BTN_REVERT:        "↺",
            STATUS_INVALID:    "Opravte zvýrazněná pole.",
            STATUS_RANGE:      "%s — povolený rozsah %s–%s.",
            STATUS_LAYER_NAME: "Zadejte název u každého řádku vrstvy.",
            STATUS_DUP_COLOR:  "Barva „%s“ je přiřazena více vrstvám — odeberte duplicitu.",
            STATUS_RANGE_MULTI: "Chyb ve formuláři: %s — viz zvýrazněná pole.",
            // Stavový řádek v klidu: co skript našel v dokumentu, za režimem
            // spojené „ · “ (spec 1.2.0 §7).
            STATUS_FOUND_ARTBOARD: "artboard %s × %s mm",
            STATUS_FOUND_ARTWORK:  "grafika %s × %s mm",
            STATUS_FOUND_CUT:  "řez „%s“",
            STATUS_NO_CUT:     "řez nenalezen",
            STATUS_MARKS_ONLY: "pouze značky",
            PANEL_OUTPUT:      "Nastavení výstupu",
            BTN_RESET:         "Výchozí",
            TIP_RESET:         "Načte do dialogu tovární výchozí hodnoty (uloženou předvolbu nepřepíše).",
            DEC_SEP:           ",",
            // Tisíce v rozměrech stavového řádku („1 560“); v poli nikdy.
            THOU_SEP:          " "
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
