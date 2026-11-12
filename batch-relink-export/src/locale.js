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
            // --- 1.3.0 ---
            PANEL_FILES: "Files",
            BTN_ACTIVE_DOC: "Use Active Document",
            TIP_ACTIVE_DOC: "Fills in the path of the document open in Illustrator. It must be saved as .ai.",
            WARN_TEMPLATE_UNSAVED: "The template is open with unsaved changes. The run closes it and uses the version on disk.",
            WARN_OUTPUT_NEW: "The output folder does not exist; the run creates it.",
            ERR_ACTIVE_NEVER_SAVED: "The active document has never been saved. Save it as .ai and try again.",
            ERR_ACTIVE_NOT_AI: "The active document is not an .ai template.",
            STATUS_MORE_ERRORS: "More errors: %s.",
            PDF_READY_1: "The source folder holds %s PDF.",
            PDF_READY_2: "The source folder holds %s PDFs.",
            PDF_READY_5: "The source folder holds %s PDFs.",
            CONFIRM_OVERWRITE_FILES: "The output folder already holds %s. Overwrite?",
            FILES_1: "%s file",
            FILES_2: "%s files",
            FILES_5: "%s files",
            ERROR_PREFIX: "ERROR: ",
            RUN_CONTINUES: "The run continues.",
            CHECK_TITLE: "File Check",
            CHECK_VERDICT: "%s %s can be processed, %s with a warning. Blocked: %s.",
            CHECK_SOURCES: "Source PDFs: %s · Example name: %s",
            SCAN_HEADER_1: "Pages against %s position:",
            SCAN_HEADER_2: "Pages against %s positions:",
            SCAN_HEADER_5: "Pages against %s positions:",
            CHECK_MAP_MANUAL: "Short sheet: the extra positions will not be removed automatically; the sheet will need manual cleanup.",
            TEMPLATE_LINE: "Template: %s · %s · %s",
            POSITIONS_1: "%s position",
            POSITIONS_2: "%s positions",
            POSITIONS_5: "%s positions",
            ON_ARTBOARDS_1: "on %s artboard",
            ON_ARTBOARDS_2: "on %s artboards",
            ON_ARTBOARDS_5: "on %s artboards",
            OUTSIDE_ARTBOARDS: "outside artboards: %s",
            SIZE_MM: "%s × %s mm",
            PAGE_SIZE: "page %s",
            PAGE_SIZES: "page sizes: %s",
            MAP_OK: "The positions show pages 1–%s, each once.",
            MAP_BAD: "The positions do not show pages 1–%s each once: %s.",
            MAP_DUP: "page %s is on %s positions",
            MAP_MISSING: "missing %s",
            MAP_BEYOND: "pages above %s: %s",
            MAP_UNKNOWN: "The positions' pages could not be read.",

            // --- Errors ---
            ERR_CRITICAL:       "The script stopped on an unexpected error: %s (line %s).\n\nSend this message to the script's maintainer.",
            ERR_TEMPLATE:       "The template was not found or is not an .ai file.",
            ERR_TEMPLATE_OPEN:  "The template could not be opened. Try opening it in Illustrator by hand.\n\nIllustrator says: %s",
            ERR_TEMPLATE_EMPTY: "Choose the template.",
            ERR_SOURCE_EMPTY:   "Choose the source folder.",
            ERR_OUTPUT_EMPTY:   "Choose the output folder.",
            ERR_SOURCE:         "The source folder does not exist.",
            ERR_OUTPUT_FAIL:    "The output folder could not be created. Check the path and your permission to write there.",
            ERR_OUTPUT_IS_SOURCE: "The output folder is the source folder. The next run would read the outputs as sources — choose another.",
            ERR_PRESET:         "Choose a PDF preset.",
            ERR_PDF_PRESET_MISSING: "PDF preset \"%s\" is not in this Illustrator. Choose another.",
            DDL_MISSING_SUFFIX: "(missing)",
            ERR_NO_PDF:         "The source folder holds no PDF.",
            ERR_NO_LINKS:       "The template has no linked positions. Place a multi-page PDF in it.",
            ERR_NO_RELINK:      "No template position could be relinked — the sheet was not exported.",
            ERR_PROCESS:        "The sheet was not exported because of an error: %s",
            ERR_RELINK_VERIFY:  "Relink verification failed for item %s: expected \"%s\", got \"%s\".",
            ERR_PAGE_SIZE:      "Position %s: the source page is %s × %s mm, the template expects %s × %s mm. The source PDF has another page size (or no TrimBox) — check the template and the source.",
            DEC_SEP:            ".",
            ERR_HIDDEN_LAYER:   "Hidden position not relinked (it does not print) — layer \"%s\".",
            ERR_RELINK_ITEM:    "Failed to relink item %s: %s",
            ERR_NAMING_PATTERN: "The naming pattern must contain {n}, otherwise the outputs would overwrite each other.",
            ERR_RELINK_FAILED:  "Export skipped: %s position(s) could not be relinked.",
            ERR_REMOVE_FAIL:    "Excess position (page %s) could not be removed.",
            WARN_PAGE_MAP:      "Extra positions were not removed automatically: the template does not show pages 1–%s exactly once each.",
            ERR_WRITE_SETTINGS: "The settings could not be saved — next time the dialog opens without them.",
            WARN_TEMPLATE_OPEN: "The template is already open with unsaved changes. Processing closes it without saving and discards those changes. Continue?",

            // --- UI: Panels ---
            PANEL_CONFIG:       "Naming and format",

            // --- UI: Labels (short — narrow label column, full text in helpTip) ---
            LBL_TEMPLATE:       "Template (.ai):",
            LBL_SOURCE:         "Source folder:",
            LBL_OUTPUT:         "Output folder:",
            LBL_NAMING:         "Naming pattern:",
            LBL_PRESET:         "PDF preset:",
            LBL_PREVIEW:        "Example name:",
            NAMING_LEGEND:      "{n} index · {template} template · {source} source",
            SAMPLE_TEMPLATE:    "template",
            SAMPLE_SOURCE:      "source",
            VERDICT_OF_1:       "of %s sheet",
            VERDICT_OF_2:       "of %s sheets",
            VERDICT_OF_5:       "of %s sheets",

            // --- UI: Buttons ---
            BTN_BROWSE:         "Browse…",
            BTN_RUN:            "Run",
            BTN_CANCEL:         "Cancel",
            BTN_CLOSE:          "Close",
            BTN_CONTINUE:       "Continue",

            // --- UI: Checkboxes ---
            CB_SKIP:            "Skip finished outputs",
            CB_OPEN_FOLDER:     "Open the output folder when done",

            // --- UI: Help Tips ---
            TIP_TEMPLATE:       "The .ai file whose positions are placed from a multi-page PDF.",
            TIP_TEMPLATE_BTN:   "Opens a file picker for the template.",
            TIP_SOURCE:         "The folder with the source PDFs. Each PDF makes one sheet.",
            TIP_SOURCE_BTN:     "Opens a folder picker for the sources.",
            TIP_OUTPUT:         "The folder the exported sheets are saved to.",
            TIP_OUTPUT_BTN:     "Opens a folder picker for the output.",
            TIP_NAMING:         "The outputs' name pattern: {n} number, {template} template name, {source} source PDF name.",
            TIP_PRESET:         "The PDF preset the sheets are exported with.",
            TIP_SKIP:           "Skips a sheet whose output exists and is newer than both its source and the template.",
            TIP_OPEN:           "Opens the output folder in Finder when the run ends.",

            // --- UI: File Dialogs ---
            BROWSE_TEMPLATE:    "Choose the template (.ai):",
            BROWSE_SOURCE:      "Choose the source folder with the PDFs:",
            BROWSE_OUTPUT:      "Choose the output folder:",

            // --- Preview ---

            // --- Pre-flight scan ---
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
            LOG_SUCCESS:        "Successful:",
            LOG_ERRORS:         "Errors:",
            LOG_SKIPPED:        "Skipped (finished):",
            LOG_BLOCKED:        "Blocked:",
            LOG_REMOVED:        "Removed positions:",
            LOG_MANUAL_LABEL:   "Needs manual cleanup:",
            LOG_MANUAL:         "%s extra position(s) could not be removed and show page 1 again — remove them by hand before printing",
            LOG_ALL_OK:         "All completed without errors.",
            LOG_DETAILS:        "Error and warning details",
            LOG_CANCELLED:      "Cancelled by user after processing %s of %s files.",
            SKIP_MSG:           "Skipped (finished output)",
            LOG_REDONE:         "The output existed but is older than its source or the template — created again."
        },

        cs: {
            // --- 1.3.0 ---
            PANEL_FILES: "Soubory",
            BTN_ACTIVE_DOC: "Použít aktivní dokument",
            TIP_ACTIVE_DOC: "Vyplní cestu dokumentu otevřeného v Illustratoru. Musí být uložený jako .ai.",
            WARN_TEMPLATE_UNSAVED: "Šablona je otevřená s neuloženými změnami. Běh ji zavře a použije verzi na disku.",
            WARN_OUTPUT_NEW: "Cílová složka neexistuje, běh ji vytvoří.",
            ERR_ACTIVE_NEVER_SAVED: "Aktivní dokument ještě není uložený. Uložte ho jako .ai a zkuste to znovu.",
            ERR_ACTIVE_NOT_AI: "Aktivní dokument není šablona .ai.",
            STATUS_MORE_ERRORS: "Další chyby: %s.",
            PDF_READY_1: "Ve zdrojové složce je %s PDF.",
            PDF_READY_2: "Ve zdrojové složce jsou %s PDF.",
            PDF_READY_5: "Ve zdrojové složce je %s PDF.",
            CONFIRM_OVERWRITE_FILES: "V cílové složce už je: %s. Přepsat?",
            FILES_1: "%s soubor",
            FILES_2: "%s soubory",
            FILES_5: "%s souborů",
            ERROR_PREFIX: "CHYBA: ",
            RUN_CONTINUES: "Běh pokračuje.",
            CHECK_TITLE: "Kontrola souborů",
            CHECK_VERDICT: "Zpracovat jde %s %s, %s s upozorněním. Blokováno: %s.",
            CHECK_SOURCES: "Zdrojových PDF: %s · Příklad názvu: %s",
            SCAN_HEADER_1: "Počet stran proti %s pozici:",
            SCAN_HEADER_2: "Počet stran proti %s pozicím:",
            SCAN_HEADER_5: "Počet stran proti %s pozicím:",
            CHECK_MAP_MANUAL: "Neúplný arch: pozice navíc se neodeberou automaticky, arch bude potřebovat ruční úpravu.",
            TEMPLATE_LINE: "Šablona: %s · %s · %s",
            POSITIONS_1: "%s pozice",
            POSITIONS_2: "%s pozice",
            POSITIONS_5: "%s pozic",
            ON_ARTBOARDS_1: "na %s kreslicím plátně",
            ON_ARTBOARDS_2: "na %s kreslicích plátnech",
            ON_ARTBOARDS_5: "na %s kreslicích plátnech",
            OUTSIDE_ARTBOARDS: "mimo kreslicí plátna: %s",
            SIZE_MM: "%s × %s mm",
            PAGE_SIZE: "strana %s",
            PAGE_SIZES: "formáty stran: %s",
            MAP_OK: "Pozice ukazují strany 1–%s, každou jednou.",
            MAP_BAD: "Pozice neukazují strany 1–%s každou jednou: %s.",
            MAP_DUP: "strana %s je na %s pozicích",
            MAP_MISSING: "chybí %s",
            MAP_BEYOND: "strany nad %s: %s",
            MAP_UNKNOWN: "Strany pozic se nepodařilo zjistit.",

            // --- Chyby ---
            ERR_CRITICAL:       "Skript se zastavil kvůli neočekávané chybě: %s (řádek %s).\n\nPošlete tuto hlášku správci skriptu.",
            ERR_TEMPLATE:       "Šablona se nenašla nebo nemá příponu .ai.",
            ERR_TEMPLATE_OPEN:  "Šablonu se nepodařilo otevřít. Zkuste ji otevřít v Illustratoru ručně.\n\nHláška Illustratoru: %s",
            ERR_TEMPLATE_EMPTY: "Vyberte šablonu.",
            ERR_SOURCE_EMPTY:   "Vyberte zdrojovou složku.",
            ERR_OUTPUT_EMPTY:   "Vyberte cílovou složku.",
            ERR_SOURCE:         "Zdrojová složka neexistuje.",
            ERR_OUTPUT_FAIL:    "Cílovou složku se nepodařilo vytvořit. Zkontrolujte cestu a právo do ní zapisovat.",
            ERR_OUTPUT_IS_SOURCE: "Cílová složka je stejná jako zdrojová. Další běh by výstupy načetl jako zdroje — vyberte jinou.",
            ERR_PRESET:         "Vyberte PDF preset.",
            ERR_PDF_PRESET_MISSING: "PDF preset „%s“ v tomto Illustratoru není. Vyberte jiný.",
            DDL_MISSING_SUFFIX: "(chybí)",
            ERR_NO_PDF:         "Ve zdrojové složce nejsou žádné PDF.",
            ERR_NO_LINKS:       "V šabloně nejsou propojené pozice. Umístěte do ní vícestránkové PDF.",
            ERR_NO_RELINK:      "Žádnou pozici šablony se nepodařilo přelinkovat — arch se nevyexportoval.",
            ERR_PROCESS:        "Arch se nevyexportoval kvůli chybě: %s",
            ERR_RELINK_VERIFY:  "Ověření relinku selhalo pro položku %s: očekáváno „%s“, nalezeno „%s“.",
            ERR_PAGE_SIZE:      "Pozice %s: strana zdroje má %s × %s mm, šablona počítá s %s × %s mm. Zdrojové PDF má jiný formát stránky (nebo nemá TrimBox) — zkontrolujte šablonu a zdroj.",
            DEC_SEP:            ",",
            ERR_HIDDEN_LAYER:   "Skrytá pozice se nepřelinkovala (netiskne se) — vrstva „%s“.",
            ERR_RELINK_ITEM:    "Nepodařilo se relinkovat položku %s: %s",
            ERR_NAMING_PATTERN: "Vzor pojmenování musí obsahovat {n}, jinak by se výstupy přepisovaly.",
            ERR_RELINK_FAILED:  "Export přeskočen — pozic, které se nepodařilo relinkovat: %s.",
            ERR_REMOVE_FAIL:    "Přebytečnou pozici (strana %s) se nepodařilo odebrat.",
            WARN_PAGE_MAP:      "Pozice navíc se neodebraly automaticky: šablona neukazuje strany 1–%s každou právě jednou.",
            ERR_WRITE_SETTINGS: "Nastavení se nepodařilo uložit — příště se dialog otevře bez něj.",
            WARN_TEMPLATE_OPEN: "Šablona je již otevřená s neuloženými změnami. Zpracování ji zavře bez uložení a změny zahodí. Pokračovat?",

            // --- UI: Panely ---
            PANEL_CONFIG:       "Pojmenování a formát",

            // --- UI: Popisky (krátké — úzký sloupec, plný text v helpTipu) ---
            LBL_TEMPLATE:       "Šablona (.ai):",
            LBL_SOURCE:         "Zdrojová složka:",
            LBL_OUTPUT:         "Cílová složka:",
            LBL_NAMING:         "Vzor pojmenování:",
            LBL_PRESET:         "PDF preset:",
            LBL_PREVIEW:        "Příklad názvu:",
            NAMING_LEGEND:      "{n} pořadí · {template} šablona · {source} zdroj",
            SAMPLE_TEMPLATE:    "sablona",
            SAMPLE_SOURCE:      "zdroj",
            VERDICT_OF_1:       "z %s archu",
            VERDICT_OF_2:       "z %s archů",
            VERDICT_OF_5:       "z %s archů",

            // --- UI: Tlačítka ---
            BTN_BROWSE:         "Vybrat…",
            BTN_RUN:            "Spustit",
            BTN_CANCEL:         "Storno",
            BTN_CLOSE:          "Zavřít",
            BTN_CONTINUE:       "Pokračovat",

            // --- UI: Checkboxy ---
            CB_SKIP:            "Přeskočit hotové výstupy",
            CB_OPEN_FOLDER:     "Po dokončení otevřít cílovou složku",

            // --- UI: Nápovědy ---
            TIP_TEMPLATE:       "Soubor .ai, jehož pozice jsou umístěné z vícestránkového PDF.",
            TIP_TEMPLATE_BTN:   "Otevře výběr souboru šablony.",
            TIP_SOURCE:         "Složka se zdrojovými PDF. Z každého PDF vznikne jeden arch.",
            TIP_SOURCE_BTN:     "Otevře výběr zdrojové složky.",
            TIP_OUTPUT:         "Složka, kam se uloží vyexportované archy.",
            TIP_OUTPUT_BTN:     "Otevře výběr cílové složky.",
            TIP_NAMING:         "Vzor názvu výstupů: {n} pořadí, {template} název šablony, {source} název zdrojového PDF.",
            TIP_PRESET:         "PDF preset, se kterým se archy exportují.",
            TIP_SKIP:           "Přeskočí arch, jehož výstup už existuje a je novější než zdroj i šablona.",
            TIP_OPEN:           "Po dokončení otevře cílovou složku ve Finderu.",

            // --- UI: Dialogy souborů ---
            BROWSE_TEMPLATE:    "Vyberte šablonu (.ai):",
            BROWSE_SOURCE:      "Vyberte zdrojovou složku s PDF:",
            BROWSE_OUTPUT:      "Vyberte cílovou složku:",

            // --- Náhled ---

            // --- Pre-flight sken ---
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
            LOG_SUCCESS:        "Úspěšně:",
            LOG_ERRORS:         "Chyby:",
            LOG_SKIPPED:        "Přeskočeno (hotové):",
            LOG_BLOCKED:        "Blokováno:",
            LOG_REMOVED:        "Odebrané pozice:",
            LOG_MANUAL_LABEL:   "Vyžaduje ruční úpravu:",
            LOG_MANUAL:         "Pozic navíc, které se nepodařilo odebrat: %s. Ukazují znovu stranu 1 — před tiskem je odstraňte ručně.",
            LOG_ALL_OK:         "Vše proběhlo bez chyb.",
            LOG_DETAILS:        "Detaily chyb a varování",
            LOG_CANCELLED:      "Zrušeno uživatelem po zpracování %s z %s souborů.",
            SKIP_MSG:           "Přeskočeno (hotový výstup)",
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

    // Czech plural: BRE.L.count("VERDICT_OF", n) -> "z 1 archu" / "z 3 archů".
    // Every counted key exists in both tables with _1, _2 and _5 forms
    // (extendscript-ui-standards §5, §12.1).
    active.count = function (base, n) {
        var suffix = "_5";
        if (n === 1) suffix = "_1";
        else if (n >= 2 && n <= 4) suffix = "_2";
        return active.format(active[base + suffix], n);
    };

    return active;
})();
