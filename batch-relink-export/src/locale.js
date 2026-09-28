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
            ERR_CRITICAL:       "The script stopped on an unexpected error: %s\n\nSend this message to whoever maintains the script (line %s).",
            ERR_TEMPLATE:       "The template was not found or is not an .ai file. Choose it with Browse…",
            ERR_TEMPLATE_OPEN:  "The template could not be opened — try opening it in Illustrator by hand.\n\nIllustrator says: %s",
            ERR_SOURCE:         "Source folder does not exist.",
            ERR_OUTPUT_ASK:     "Output folder does not exist. Create it?",
            ERR_OUTPUT_FAIL:    "Failed to create output folder.",
            ERR_OUTPUT_IS_SOURCE: "The output folder is the source folder. The next run would read the outputs as source PDFs — choose another output folder.",
            ERR_PRESET:         "You must select a PDF Preset.",
            ERR_NO_PDF:         "No PDF files found in the selected folder.",
            ERR_NO_LINKS:       "No linked objects found in the template.",
            ERR_NO_RELINK:      "No template position could be relinked — the sheet was not exported.",
            ERR_PROCESS:        "The sheet was not exported because of an error: %s",
            ERR_RELINK_VERIFY:  "Relink verification failed for item %s: expected '%s', got '%s'.",
            ERR_PAGE_SIZE:      "Position %s: the source page is %s × %s mm, the template expects %s × %s mm. The source PDF has another page size (or no TrimBox) — check the template and the source.",
            DEC_SEP:            ".",
            ERR_HIDDEN_LAYER:   "Hidden position not relinked (it does not print) — layer \"%s\".",
            ERR_RELINK_ITEM:    "Failed to relink item %s: %s",
            ERR_NAMING_PATTERN: "The pattern must contain {n} (sheet number), otherwise the outputs would overwrite each other.",
            ERR_RELINK_FAILED:  "Export skipped: %s position(s) could not be relinked.",
            ERR_REMOVE_FAIL:    "Excess position (page %s) could not be removed.",
            WARN_PAGE_MAP:      "Extra positions were not removed automatically: the template does not show pages 1–%s exactly once each.",
            WARN_TEMPLATE_OPEN: "The template is already open with unsaved changes. Processing closes it without saving and discards those changes. Continue?",

            // --- UI: Title & Panels ---
            TITLE:              "Batch Relink Export",
            PANEL_INPUT:        "1 · Input files",
            PANEL_CONFIG:       "2 · Naming & format",
            PANEL_OPTIONS:      "Options",

            // --- UI: Labels (short — narrow label column, full text in helpTip) ---
            LBL_TEMPLATE:       "Template (.ai)",
            LBL_SOURCE:         "Source (PDF)",
            LBL_OUTPUT:         "Output",
            LBL_NAMING:         "Pattern",
            LBL_PRESET:         "PDF Preset",
            LBL_PREVIEW:        "Name preview:",
            NAMING_LEGEND:      "{n} index · {template} template · {source} source",
            SAMPLE_TEMPLATE:    "template",
            SAMPLE_SOURCE:      "source",
            PREVIEW_VERDICT:    "%s of %s sheets can be processed (%s with a warning) · %s blocked",

            // --- UI: Buttons ---
            BTN_BROWSE:         "Browse…",
            BTN_RUN:            "Run",
            BTN_CANCEL:         "Cancel",
            BTN_CLOSE:          "Close",
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
            TIP_SKIP:           "Skip a sheet whose output already exists and is newer than both its source and the template",
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
            SCAN_FILE_OVER:     "%s: %s pages > %s positions — WILL BE SKIPPED (risk of dropped pages)",
            SCAN_FILE_UNDER:    "%s: %s pages < %s positions (excess positions will be removed)",
            SCAN_FILE_PARTIAL:  "%s: %s pages — %s extra position(s) will be removed from the sheet.",
            SCAN_FILE_UNREAD:   "%s: the page count cannot be read (damaged or encrypted PDF?). Check that it has no more pages than positions — the excess would be lost.",
            SCAN_NONE:          "No file can be processed safely.",
            ERR_OVER_PAGES:     "Skipped: %s pages exceeds %s positions — risk of silently dropping pages.",

            // --- Progress ---
            PROGRESS_TITLE:     "Processing files…",
            PROGRESS_INIT:      "Preparing…",
            PROGRESS_FILE:      "Processing: %s (%s of %s)",
            PROGRESS_STOP_HINT: "To stop the batch, hold down Esc.",
            PROGRESS_STOPPING:  "Stopping — the file in progress will be finished…",

            // --- Log ---
            LOG_TITLE:          "Processing Result",
            LOG_SUCCESS:        "Successful",
            LOG_ERRORS:         "Errors",
            LOG_SKIPPED:        "Skipped",
            LOG_BLOCKED:        "Blocked",
            LOG_REMOVED:        "Removed positions",
            LOG_MANUAL_LABEL:   "Needs manual cleanup",
            LOG_MANUAL:         "%s extra position(s) could not be removed and show page 1 again — remove them by hand before printing",
            LOG_ALL_OK:         "All completed without errors.",
            LOG_DETAILS:        "Error and warning details",
            LOG_CANCELLED:      "Cancelled by user after processing %s of %s files.",
            SKIP_MSG:           "Skipped (file exists)",
            LOG_REDONE:         "The output existed but is older than its source or the template — created again."
        },

        cs: {
            // --- Chyby ---
            ERR_CRITICAL:       "Skript se zastavil kvůli neočekávané chybě: %s\n\nPošlete tuto hlášku správci skriptu (řádek %s).",
            ERR_TEMPLATE:       "Šablona se nenašla nebo nemá příponu .ai. Vyberte ji tlačítkem Vybrat…",
            ERR_TEMPLATE_OPEN:  "Šablonu se nepodařilo otevřít — zkuste ji otevřít v Illustratoru ručně.\n\nHláška Illustratoru: %s",
            ERR_SOURCE:         "Zdrojová složka neexistuje.",
            ERR_OUTPUT_ASK:     "Výstupní složka neexistuje. Vytvořit?",
            ERR_OUTPUT_FAIL:    "Nepodařilo se vytvořit výstupní složku.",
            ERR_OUTPUT_IS_SOURCE: "Výstupní složka je stejná jako zdrojová. Další běh by výstupy načetl jako zdrojová PDF — zvolte jinou výstupní složku.",
            ERR_PRESET:         "Musíte vybrat PDF Preset.",
            ERR_NO_PDF:         "Ve vybrané složce nebyly nalezeny žádné PDF soubory.",
            ERR_NO_LINKS:       "V šabloně nebyly nalezeny žádné propojené objekty.",
            ERR_NO_RELINK:      "Žádnou pozici šablony se nepodařilo přelinkovat — arch se nevyexportoval.",
            ERR_PROCESS:        "Arch se nevyexportoval kvůli chybě: %s",
            ERR_RELINK_VERIFY:  "Ověření relinku selhalo pro položku %s: očekáváno '%s', nalezeno '%s'.",
            ERR_PAGE_SIZE:      "Pozice %s: strana zdroje má %s × %s mm, šablona počítá s %s × %s mm. Zdrojové PDF má jiný formát stránky (nebo nemá TrimBox) — zkontrolujte šablonu a zdroj.",
            DEC_SEP:            ",",
            ERR_HIDDEN_LAYER:   "Skrytá pozice se nepřelinkovala (netiskne se) — vrstva „%s“.",
            ERR_RELINK_ITEM:    "Nepodařilo se relinkovat položku %s: %s",
            ERR_NAMING_PATTERN: "Vzor musí obsahovat {n} (pořadí archu), jinak by se výstupy přepisovaly.",
            ERR_RELINK_FAILED:  "Export přeskočen — pozic, které se nepodařilo relinkovat: %s.",
            ERR_REMOVE_FAIL:    "Přebytečnou pozici (strana %s) se nepodařilo odebrat.",
            WARN_PAGE_MAP:      "Pozice navíc se neodebraly automaticky: šablona neukazuje strany 1–%s každou právě jednou.",
            WARN_TEMPLATE_OPEN: "Šablona je již otevřená s neuloženými změnami. Zpracování ji zavře bez uložení a změny zahodí. Pokračovat?",

            // --- UI: Nadpis a panely ---
            TITLE:              "Dávkové zpracování PDF",
            PANEL_INPUT:        "1 · Vstupní soubory",
            PANEL_CONFIG:       "2 · Pojmenování a formát",
            PANEL_OPTIONS:      "Možnosti",

            // --- UI: Popisky (krátké — úzký sloupec, plný text v helpTipu) ---
            LBL_TEMPLATE:       "Šablona (.ai)",
            LBL_SOURCE:         "Zdroj (PDF)",
            LBL_OUTPUT:         "Výstup",
            LBL_NAMING:         "Vzor",
            LBL_PRESET:         "PDF Preset",
            LBL_PREVIEW:        "Náhled názvu:",
            NAMING_LEGEND:      "{n} pořadí · {template} šablona · {source} zdroj",
            SAMPLE_TEMPLATE:    "sablona",
            SAMPLE_SOURCE:      "zdroj",
            PREVIEW_VERDICT:    "%s z %s archů lze zpracovat (%s s upozorněním) · %s blokováno",

            // --- UI: Tlačítka ---
            BTN_BROWSE:         "Vybrat…",
            BTN_RUN:            "Spustit",
            BTN_CANCEL:         "Storno",
            BTN_CLOSE:          "Zavřít",
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
            TIP_SKIP:           "Přeskočí arch, jehož výstup už existuje a je novější než zdroj i šablona",
            TIP_OPEN:           "Po dokončení otevře výstupní složku v systému",

            // --- UI: Dialogy souborů ---
            BROWSE_FOLDER:      "Vyberte složku:",
            BROWSE_FILE:        "Vyberte soubor:",

            // --- Náhled ---
            PREVIEW_TITLE:      "Náhled zpracování",
            PREVIEW_TEMPLATE:   "Šablona: %s · pozic: %s",
            PREVIEW_SOURCE:     "Zdrojových PDF: %s",
            PREVIEW_SAMPLE:     "Vzor výstupu: %s",

            // --- Pre-flight sken ---
            SCAN_HEADER:        "Kontrola zdrojových souborů — počet stran proti počtu pozic (%s):",
            SCAN_OK:            "V pořádku (plný arch): %s",
            SCAN_PARTIAL:       "Neúplný poslední arch: %s",
            SCAN_UNDER:         "Méně stran uprostřed dávky: %s",
            SCAN_UNREADABLE:    "Nečitelný počet stran: %s",
            SCAN_OVER:          "Blokováno (více stran než pozic): %s",
            SCAN_FILE_OVER:     "%s: stran %s > pozic %s — BUDE PŘESKOČENO (hrozí ztráta stran)",
            SCAN_FILE_UNDER:    "%s: stran %s < pozic %s (přebytečné pozice budou odebrány)",
            SCAN_FILE_PARTIAL:  "%s: stran %s, pozic navíc %s — odeberou se z archu.",
            SCAN_FILE_UNREAD:   "%s: počet stran nejde zjistit (poškozené nebo šifrované PDF?). Ověřte, že nemá víc stran než pozic — přebytek by se ztratil.",
            SCAN_NONE:          "Žádný soubor nelze bezpečně zpracovat.",
            ERR_OVER_PAGES:     "Přeskočeno: stran je více než pozic (%s > %s) — hrozí tichá ztráta stran.",

            // --- Průběh ---
            PROGRESS_TITLE:     "Zpracování souborů…",
            PROGRESS_INIT:      "Připravuji…",
            PROGRESS_FILE:      "Zpracovávám: %s (%s z %s)",
            PROGRESS_STOP_HINT: "Dávku zastavíte podržením klávesy Esc.",
            PROGRESS_STOPPING:  "Zastavuji — rozpracovaný soubor se dokončí…",

            // --- Log ---
            LOG_TITLE:          "Výsledek zpracování",
            LOG_SUCCESS:        "Úspěšně",
            LOG_ERRORS:         "Chyby",
            LOG_SKIPPED:        "Přeskočeno",
            LOG_BLOCKED:        "Blokováno",
            LOG_REMOVED:        "Odebrané pozice",
            LOG_MANUAL_LABEL:   "Vyžaduje ruční úpravu",
            LOG_MANUAL:         "Pozic navíc, které se nepodařilo odebrat: %s. Ukazují znovu stranu 1 — před tiskem je odstraňte ručně.",
            LOG_ALL_OK:         "Vše proběhlo bez chyb.",
            LOG_DETAILS:        "Detaily chyb a varování",
            LOG_CANCELLED:      "Zrušeno uživatelem po zpracování %s z %s souborů.",
            SKIP_MSG:           "Přeskočeno (soubor existuje)",
            LOG_REDONE:         "Výstup už existoval, ale je starší než zdroj nebo šablona — vytvořen znovu."
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
