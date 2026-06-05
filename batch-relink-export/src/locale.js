// ------------------------------------------------------------------------
// Module: BRE.L — Localization
// Part of: Illustrator Batch Relink Export v3.0.0
// ------------------------------------------------------------------------

var BRE = BRE || {};

BRE.L = (function () {
    var lang = "en";
    try {
        if (app.locale) lang = app.locale.substring(0, 2).toLowerCase();
    } catch (e) {}

    var strings = {
        en: {
            // --- Errors ---
            ERR_CRITICAL:       "CRITICAL ERROR: ",
            ERR_TEMPLATE:       "Invalid AI template.",
            ERR_SOURCE:         "Source folder does not exist.",
            ERR_OUTPUT_ASK:     "Output folder does not exist. Create it?",
            ERR_OUTPUT_FAIL:    "Failed to create output folder.",
            ERR_PRESET:         "You must select a PDF Preset.",
            ERR_NO_PDF:         "No PDF files found in the selected folder.",
            ERR_NO_LINKS:       "No linked objects found in the template.",
            ERR_NO_RELINK:      "No linked PDF objects found for relinking.",
            ERR_PROCESS:        "Error processing",
            ERR_RELINK_VERIFY:  "Relink verification failed for item %s: expected '%s', got '%s'.",
            ERR_HIDDEN_LAYER:   "PlacedItem on hidden layer skipped: %s",
            ERR_RELINK_ITEM:    "Failed to relink item %s: %s",
            ERR_NAMING_PATTERN: "Naming pattern must contain {n} placeholder.",
            ERR_RELINK_FAILED:  "Export skipped: %s position(s) could not be relinked.",
            ERR_REMOVE_FAIL:    "Excess position (page %s) could not be removed.",
            ERR_UNCERTAIN:      "Skipped: ambiguous page count — please check this file manually.",
            WARN_TEMPLATE_OPEN: "The template is already open with unsaved changes. Processing closes it without saving and discards those changes. Continue?",

            // --- UI: Title & Panels ---
            TITLE:              "Batch Relink Export",
            PANEL_INPUT:        "Input Files",
            PANEL_CONFIG:       "Export Configuration",

            // --- UI: Labels ---
            LBL_TEMPLATE:       "Template (.ai)",
            LBL_SOURCE:         "Source folder (PDF)",
            LBL_OUTPUT:         "Output folder",
            LBL_NAMING:         "Naming pattern",
            LBL_PRESET:         "PDF Preset",

            // --- UI: Buttons ---
            BTN_BROWSE:         "Browse…",
            BTN_RUN:            "Run",
            BTN_CANCEL:         "Cancel",
            BTN_CLOSE:          "Close",
            BTN_STOP:           "Stop",
            BTN_STOPPING:       "Stopping…",
            BTN_CONTINUE:       "Continue",

            // --- UI: Checkboxes ---
            CB_SKIP:            "Skip existing files",
            CB_OPEN_FOLDER:     "Open output folder when done",

            // --- UI: Help Tips ---
            TIP_TEMPLATE:       "Illustrator template file (.ai) with linked PDF",
            TIP_TEMPLATE_BTN:   "Select template file",
            TIP_SOURCE:         "Folder containing source PDF files",
            TIP_SOURCE_BTN:     "Select source folder",
            TIP_OUTPUT:         "Destination folder for exported PDF files",
            TIP_OUTPUT_BTN:     "Select output folder",
            TIP_NAMING:         "Output filename pattern. {n} = number, {template} = template name, {source} = source PDF name",
            TIP_PRESET:         "PDF quality profile for export",
            TIP_SKIP:           "Skip processing if output file already exists",
            TIP_OPEN:           "Open output folder in system file manager after completion",

            // --- UI: File Dialogs ---
            BROWSE_FOLDER:      "Select folder:",
            BROWSE_FILE:        "Select file:",

            // --- Preview ---
            PREVIEW_TITLE:      "Processing Preview",
            PREVIEW_TEMPLATE:   "Template: %s (%s positions)",
            PREVIEW_SOURCE:     "Source PDFs: %s files",
            PREVIEW_SAMPLE:     "Sample output: %s",

            // --- Pre-flight scan ---
            SCAN_HEADER:        "Source file check (pages vs. %s positions):",
            SCAN_OK:            "OK (full sheet): %s",
            SCAN_PARTIAL:       "Partial last sheet: %s",
            SCAN_UNDER:         "Fewer pages mid-batch: %s",
            SCAN_UNREADABLE:    "Page count unreadable: %s",
            SCAN_OVER:          "Blocked (more pages than positions): %s",
            SCAN_UNCERTAIN:     "Uncertain page count (blocked): %s",
            SCAN_FILE_OVER:     "%s: %s pages > %s positions — WILL BE SKIPPED (risk of dropped pages)",
            SCAN_FILE_UNDER:    "%s: %s pages < %s positions (excess positions will be removed)",
            SCAN_FILE_PARTIAL:  "%s: %s pages — %s extra position(s) will remain (remove manually).",
            SCAN_FILE_UNREAD:   "%s: page count could not be detected — all positions relinked, none removed.",
            SCAN_FILE_UNCERTAIN: "%s: ambiguous page count — WILL BE SKIPPED, check manually",
            SCAN_NONE:          "No file can be processed safely.",
            ERR_OVER_PAGES:     "Skipped: %s pages exceeds %s positions — risk of silently dropping pages.",

            // --- Progress ---
            PROGRESS_TITLE:     "Processing files…",
            PROGRESS_INIT:      "Preparing…",
            PROGRESS_FILE:      "Processing: %s (%s of %s)",

            // --- Log ---
            LOG_TITLE:          "Processing Result",
            LOG_SUCCESS:        "Successful",
            LOG_ERRORS:         "Errors",
            LOG_SKIPPED:        "Skipped",
            LOG_BLOCKED:        "Blocked",
            LOG_REMOVED:        "Removed positions",
            LOG_MANUAL_LABEL:   "Needs manual cleanup",
            LOG_MANUAL:         "%s extra position(s) on this sheet — remove manually",
            LOG_ALL_OK:         "All completed without errors.",
            LOG_DETAILS:        "Error and warning details",
            LOG_CANCELLED:      "Cancelled by user after processing %s of %s files.",
            SKIP_MSG:           "Skipped (file exists)"
        },

        cs: {
            // --- Chyby ---
            ERR_CRITICAL:       "KRITICKÁ CHYBA: ",
            ERR_TEMPLATE:       "Neplatná šablona AI.",
            ERR_SOURCE:         "Zdrojová složka neexistuje.",
            ERR_OUTPUT_ASK:     "Výstupní složka neexistuje. Vytvořit?",
            ERR_OUTPUT_FAIL:    "Nepodařilo se vytvořit výstupní složku.",
            ERR_PRESET:         "Musíte vybrat PDF Preset.",
            ERR_NO_PDF:         "Ve vybrané složce nebyly nalezeny žádné PDF soubory.",
            ERR_NO_LINKS:       "V šabloně nebyly nalezeny žádné propojené objekty.",
            ERR_NO_RELINK:      "Žádný propojený PDF objekt nebyl nalezen k relinkování.",
            ERR_PROCESS:        "Chyba při zpracování",
            ERR_RELINK_VERIFY:  "Ověření relinku selhalo pro položku %s: očekáváno '%s', nalezeno '%s'.",
            ERR_HIDDEN_LAYER:   "PlacedItem na skryté vrstvě přeskočen: %s",
            ERR_RELINK_ITEM:    "Nepodařilo se relinkovat položku %s: %s",
            ERR_NAMING_PATTERN: "Vzor pojmenování musí obsahovat placeholder {n}.",
            ERR_RELINK_FAILED:  "Export přeskočen: %s pozic se nepodařilo relinkovat.",
            ERR_REMOVE_FAIL:    "Přebytečnou pozici (strana %s) se nepodařilo odebrat.",
            ERR_UNCERTAIN:      "Přeskočeno: nejednoznačný počet stran — zkontrolujte tento soubor ručně.",
            WARN_TEMPLATE_OPEN: "Šablona je již otevřená s neuloženými změnami. Zpracování ji zavře bez uložení a změny zahodí. Pokračovat?",

            // --- UI: Nadpis a panely ---
            TITLE:              "Dávkové zpracování PDF",
            PANEL_INPUT:        "Vstupní soubory",
            PANEL_CONFIG:       "Konfigurace exportu",

            // --- UI: Popisky ---
            LBL_TEMPLATE:       "Šablona (.ai)",
            LBL_SOURCE:         "Zdrojová složka (PDF)",
            LBL_OUTPUT:         "Výstupní složka",
            LBL_NAMING:         "Vzor pojmenování",
            LBL_PRESET:         "PDF Preset",

            // --- UI: Tlačítka ---
            BTN_BROWSE:         "Vybrat…",
            BTN_RUN:            "Spustit",
            BTN_CANCEL:         "Zrušit",
            BTN_CLOSE:          "Zavřít",
            BTN_STOP:           "Storno",
            BTN_STOPPING:       "Zastavuji…",
            BTN_CONTINUE:       "Pokračovat",

            // --- UI: Checkboxy ---
            CB_SKIP:            "Přeskočit existující soubory",
            CB_OPEN_FOLDER:     "Po dokončení otevřít výstupní složku",

            // --- UI: Nápovědy ---
            TIP_TEMPLATE:       "Soubor šablony Illustrator (.ai) s propojeným PDF",
            TIP_TEMPLATE_BTN:   "Vybrat soubor šablony",
            TIP_SOURCE:         "Složka obsahující zdrojové PDF soubory",
            TIP_SOURCE_BTN:     "Vybrat zdrojovou složku",
            TIP_OUTPUT:         "Cílová složka pro exportované PDF",
            TIP_OUTPUT_BTN:     "Vybrat výstupní složku",
            TIP_NAMING:         "Vzor názvu výstupu. {n} = číslo, {template} = název šablony, {source} = název zdrojového PDF",
            TIP_PRESET:         "Profil kvality PDF pro export",
            TIP_SKIP:           "Pokud výstupní soubor již existuje, přeskočí se",
            TIP_OPEN:           "Po dokončení otevře výstupní složku v systému",

            // --- UI: Dialogy souborů ---
            BROWSE_FOLDER:      "Vyberte složku:",
            BROWSE_FILE:        "Vyberte soubor:",

            // --- Náhled ---
            PREVIEW_TITLE:      "Náhled zpracování",
            PREVIEW_TEMPLATE:   "Šablona: %s (%s pozic)",
            PREVIEW_SOURCE:     "Zdrojové PDF: %s souborů",
            PREVIEW_SAMPLE:     "Vzor výstupu: %s",

            // --- Pre-flight sken ---
            SCAN_HEADER:        "Kontrola zdrojových souborů (počet stran vs. %s pozic):",
            SCAN_OK:            "V pořádku (plný arch): %s",
            SCAN_PARTIAL:       "Neúplný poslední arch: %s",
            SCAN_UNDER:         "Méně stran uprostřed dávky: %s",
            SCAN_UNREADABLE:    "Nečitelný počet stran: %s",
            SCAN_OVER:          "Blokováno (více stran než pozic): %s",
            SCAN_UNCERTAIN:     "Nejistý počet stran (blokováno): %s",
            SCAN_FILE_OVER:     "%s: %s stran > %s pozic — BUDE PŘESKOČENO (hrozí ztráta stran)",
            SCAN_FILE_UNDER:    "%s: %s stran < %s pozic (přebytečné pozice budou odebrány)",
            SCAN_FILE_PARTIAL:  "%s: %s stran — zůstane %s pozic navíc (odeber ručně).",
            SCAN_FILE_UNREAD:   "%s: počet stran nelze zjistit — relinkne se vše bez odebrání.",
            SCAN_FILE_UNCERTAIN: "%s: nejednoznačný počet stran — BUDE PŘESKOČENO, zkontrolujte ručně",
            SCAN_NONE:          "Žádný soubor nelze bezpečně zpracovat.",
            ERR_OVER_PAGES:     "Přeskočeno: %s stran je více než %s pozic — hrozí tichá ztráta stran.",

            // --- Průběh ---
            PROGRESS_TITLE:     "Zpracování souborů…",
            PROGRESS_INIT:      "Připravuji…",
            PROGRESS_FILE:      "Zpracovávám: %s (%s z %s)",

            // --- Log ---
            LOG_TITLE:          "Výsledek zpracování",
            LOG_SUCCESS:        "Úspěšně",
            LOG_ERRORS:         "Chyby",
            LOG_SKIPPED:        "Přeskočeno",
            LOG_BLOCKED:        "Blokováno",
            LOG_REMOVED:        "Odebrané pozice",
            LOG_MANUAL_LABEL:   "Vyžaduje ruční úpravu",
            LOG_MANUAL:         "%s pozic navíc na tomto archu — odeber ručně",
            LOG_ALL_OK:         "Vše proběhlo bez chyb.",
            LOG_DETAILS:        "Detaily chyb a varování",
            LOG_CANCELLED:      "Zrušeno uživatelem po zpracování %s z %s souborů.",
            SKIP_MSG:           "Přeskočeno (soubor existuje)"
        }
    };

    var active = strings[lang] || strings["en"];

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
