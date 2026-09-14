// ------------------------------------------------------------------------
// Module: TE.L — EN/CS stringtable, app.locale detection, format()
// Part of: Illustrator Tile Export
// Depends on: —
// ------------------------------------------------------------------------
var TE = TE || {};

// TE.L — Localization module (IIFE, loaded before all other modules)
// Detects Illustrator locale and returns the active string table.
// Supports: en (default), cs
TE.L = (function () {
    var lang = "en";
    try {
        if (app.locale) { lang = app.locale.substring(0, 2).toLowerCase(); }
    } catch (e) {}

    var strings = {
        en: {
            ERR_NO_DOC:          "No document open.",
            ERR_NO_GRAPHIC:      "No placed graphic found in the document.",
            ERR_MANY_GRAPHICS:   "The document must contain exactly one placed graphic (found %s).",
            ERR_NO_CLEAN_AB:     "No clean-format artboard found. Artboards starting with %s are generated panels.",
            ERR_MIN_TILES:       "At least 2 panels are needed.",
            ERR_CUTS_ORDER:      "Cut positions must be increasing and inside the graphic.",
            ERR_OVERLAP_BIG:     "Overlap (%s mm) must be smaller than the shortest panel (%s mm).",
            ERR_NO_GUIDES:       "No usable guides found perpendicular to the split direction.",
            ERR_ADD_OVERHANG:    "Add on %s (%s mm) exceeds the graphic overhang there (%s mm).",
            ERR_AB_TOO_BIG:      "Panel does not fit an Illustrator artboard at this output scale.",
            ERR_LARGE_CANVAS:    "Large Canvas document cannot export at source scale — a temporary document is never Large Canvas. Use 1:1 output.",
            ERR_SPOT_FAILED:     "Cannot create spot colour %s.",
            ERR_OUT_DIR:         "Output folder is not writable: %s",
            ERR_CRITICAL:        "CRITICAL ERROR: ",
            WARN_MEDIA:          "Panel %s mm is wider than the media (%s mm).",
            WARN_GUIDE_HIDDEN:   "%s guide(s) on hidden layers were ignored.",
            SUMMARY_DONE:        "%s panels exported to %s",
            SUMMARY_SKIPPED:     "%s panels skipped, output already existed.",
            SUMMARY_TILES:       "%s panels created.",
            ERR_WRITE_SETTINGS:  "Cannot write the settings file.",

            // --- panels ---
            PANEL_PRESET:        "Presets",
            PANEL_DOC:           "Document",
            PANEL_SPLIT:         "Split",
            PANEL_EDGES:         "Overlap and adds",
            PANEL_EXPORT:        "Export",
            PANEL_CALC:          "Result",

            // --- document ---
            LBL_SCALE:           "Manual scale 1:N",
            TIP_SCALE:           "Tick when the document is drawn to scale, for example a 1:10 canvas of a large graphic. Values below are always entered in real-world millimetres.",
            LBL_CLEAN:           "Clean format",
            TIP_CLEAN:           "Width and height of the graphic without adds. Taken from the artboard; overwrite only when the artboard does not match.",
            LBL_LARGE_CANVAS:    "Large Canvas factor: %s",

            // --- split ---
            LBL_DIRECTION:       "Direction",
            DIR_HORIZONTAL:      "Horizontal",
            DIR_VERTICAL:        "Vertical",
            TIP_DIRECTION:       "Horizontal splits into panels side by side, vertical into panels above each other.",
            LBL_MODE:            "Split by",
            MODE_COUNT:          "Panel count",
            MODE_WIDTH:          "Panel width",
            MODE_GUIDES:         "Guides",
            TIP_MODE:            "Panel count and width divide evenly. Guides put the seams exactly where you dragged them, so a seam can avoid text.",
            LBL_COUNT:           "Panels",
            TIP_COUNT:           "How many panels to split into. At least 2.",
            LBL_WIDTH:           "Panel width",
            TIP_WIDTH:           "Maximum panel width. The last panel comes out shorter when the graphic does not divide evenly.",
            LBL_ROUND:           "Round guides to",
            TIP_ROUND:           "Hand-dragged guides are never round numbers. Zero takes them as they are.",

            // --- edges ---
            LBL_OVERLAP:         "Overlap",
            TIP_OVERLAP:         "Material shared by neighbouring panels. Zero for rigid boards, which butt together.",
            LBL_OVERLAP_MODE:    "Overlap placement",
            OVERLAP_SYMMETRIC:   "Half on each side",
            OVERLAP_ONESIDED:    "All on one panel",
            TIP_OVERLAP_MODE:    "Symmetric puts the seam in the middle of the overlap. One-sided gives the whole overlap to the left or upper panel, so the neighbour starts exactly on the seam.",
            LBL_ADD_TOP:         "Add top",
            LBL_ADD_BOTTOM:      "Add bottom",
            LBL_ADD_LEFT:        "Add left",
            LBL_ADD_RIGHT:       "Add right",
            TIP_ADD:             "Mounting bleed on the outer edge of the whole graphic. Zero means flush. It cannot exceed the bleed the placed PDF actually carries.",

            // --- export ---
            LBL_EXPORT_MODE:     "Content",
            EXPORT_VECTOR:       "Vector",
            EXPORT_RASTER:       "Raster",
            TIP_EXPORT_MODE:     "Vector keeps text sharp but every panel carries the whole graphic, because Illustrator never crops content. Raster makes each panel only as big as its own area, and rasterises text and the trim line with it.",
            LBL_EXPORT_SCALE:    "Output scale",
            SCALE_SOURCE:        "Same as document",
            SCALE_ACTUAL:        "1:1 actual size",
            TIP_EXPORT_SCALE:    "Same as document keeps a 1:10 canvas at 1:10 and the RIP scales up. 1:1 writes real size, which a large panel may exceed.",
            LBL_DPI:             "Resolution",
            TIP_DPI:             "Raster resolution in DPI. Only used in raster mode.",
            LBL_PDF_PRESET:      "PDF preset",
            TIP_PDF_PRESET:      "Name of the Illustrator PDF preset. Leave empty for the built-in default.",
            LBL_OUTPUT:          "Output folder",
            TIP_OUTPUT:          "Where the panel PDFs are written.",
            BTN_BROWSE:          "Browse\u2026",
            LBL_PATTERN:         "Name pattern",
            TIP_PATTERN:         "Placeholders: {doc} document name, {n} panel number, {total} panel count.",
            LBL_SKIP:            "Skip finished outputs",
            TIP_SKIP:            "A run that died halfway resumes without redoing the panels already on disk.",
            LBL_LINE:            "Draw trim line",
            TIP_LINE:            "Red line around each panel's clean format, for the finisher to cut along.",
            LBL_LINE_SPOT:       "Spot colour",
            TIP_LINE_SPOT:       "Name of the spot colour for the line. Created when the document does not have it.",
            LBL_LINE_WIDTH:      "Line width",
            TIP_LINE_WIDTH:      "Stroke width of the trim line, in points.",

            // --- calc ---
            INFO_CLEAN:          "Clean format: %s \u00d7 %s mm",
            INFO_COUNT:          "Panels: %s",
            INFO_TILE:           "  %s: clean %s \u00d7 %s mm, with adds %s \u00d7 %s mm",
            INFO_OVERHANG:       "Available bleed: left %s, right %s, top %s, bottom %s mm",

            // --- presets ---
            PANEL_ZUND:      "Z\u00fcnd",
            LBL_ZUND_MODE:   "Z\u00fcnd mode",
            TIP_ZUND_MODE:   "Adds registration marks and per-panel cut data. Both are drawn into the exported panels, never into your document.",
            LBL_CUT_SPOT:    "Contour colour",
            TIP_CUT_SPOT:    "Spot colour identifying the cut contour. The layer it sits on does not matter.",
            LBL_MARK_COLOR:  "Mark colour",
            TIP_MARK_COLOR:   "Colour of the registration marks, separate from the cut contour. Registration is the standard; a white spot colour is used on black and clear material with a clear liner.",
            LBL_MARK_SIZE:   "Mark diameter",
            TIP_MARK_SIZE:   "Diameter of the round Z\u00fcnd registration mark.",
            LBL_GAP_INNER:   "Gap from edge",
            TIP_GAP_INNER:   "Distance between the panel edge and the mark. Marks sit outside the panel, so this enlarges the exported page.",
            LBL_MAX_DIST:    "Max spacing",
            TIP_MAX_DIST:    "Marks are interpolated along long edges so their spacing never exceeds this.",
            LBL_ORIENT:      "Orientation dot",
            TIP_ORIENT:      "Distance of the orientation dot from the corner. It tells the machine which way the panel is turned.",
            ERR_NO_CUT_SPOT: "Spot colour %s is not in the document.",
            WARN_NO_CONTOUR: "Panels without cut data: %s. The contour does not reach them.",
            PRESET_LABEL:        "Preset",
            BTN_SAVE:            "Save",
            BTN_SAVE_AS:         "Save As\u2026",
            BTN_DEL:             "Delete",
            BTN_DEFAULTS:        "Defaults",
            TIP_PRESET:          "Saved configurations. The last used one is recalled on the next run.",
            ASK_PRESET_NAME:     "Preset name:",
            ASK_PRESET_DELETE:   "Delete preset %s?",
            BTN_TILES_ONLY:      "Panels only",
            BTN_TILES_EXPORT:    "Create and export",
            BTN_CANCEL:          "Cancel"
        },
        cs: {
            ERR_NO_DOC:          "Není otevřený žádný dokument.",
            ERR_NO_GRAPHIC:      "V dokumentu není umístěná grafika.",
            ERR_MANY_GRAPHICS:   "Dokument musí obsahovat právě jednu umístěnou grafiku (nalezeno %s).",
            ERR_NO_CLEAN_AB:     "Nenalezen artboard čistého formátu. Artboardy začínající %s jsou vygenerované pláty.",
            ERR_MIN_TILES:       "Jsou potřeba aspoň 2 pláty.",
            ERR_CUTS_ORDER:      "Pozice švů musí růst a ležet uvnitř grafiky.",
            ERR_OVERLAP_BIG:     "Přelep (%s mm) musí být menší než nejkratší plát (%s mm).",
            ERR_NO_GUIDES:       "Nenalezena použitelná vodítka kolmá na směr dělení.",
            ERR_ADD_OVERHANG:    "Přídavek %s (%s mm) překračuje přesah grafiky na té hraně (%s mm).",
            ERR_AB_TOO_BIG:      "Plát se při tomto měřítku výstupu nevejde do artboardu Illustratoru.",
            ERR_LARGE_CANVAS:    "Large Canvas dokument nelze exportovat v měřítku zdroje — dočasný dokument nikdy není Large Canvas. Použij výstup 1:1.",
            ERR_SPOT_FAILED:     "Nelze vytvořit přímou barvu %s.",
            ERR_OUT_DIR:         "Do cílové složky nelze zapisovat: %s",
            ERR_CRITICAL:        "KRITICKÁ CHYBA: ",
            WARN_MEDIA:          "Plát %s mm je širší než médium (%s mm).",
            WARN_GUIDE_HIDDEN:   "%s vodítek na skrytých vrstvách bylo ignorováno.",
            SUMMARY_DONE:        "Exportováno %s plátů do %s",
            SUMMARY_SKIPPED:     "%s plátů přeskočeno, výstup už existoval.",
            SUMMARY_TILES:       "Vytvořeno %s plátů.",
            ERR_WRITE_SETTINGS:  "Nelze zapsat soubor s nastavením.",

            // --- panels ---
            PANEL_PRESET:        "Předvolby",
            PANEL_DOC:           "Dokument",
            PANEL_SPLIT:         "Dělení",
            PANEL_EDGES:         "Přelep a přídavky",
            PANEL_EXPORT:        "Export",
            PANEL_CALC:          "Výsledek",

            // --- document ---
            LBL_SCALE:           "Ruční měřítko 1:N",
            TIP_SCALE:           "Zaškrtni, když je dokument ve zmenšeném měřítku, třeba plátno 1:10 velké grafiky. Hodnoty níž se vždy zadávají ve skutečných milimetrech.",
            LBL_CLEAN:           "Čistý formát",
            TIP_CLEAN:           "Šířka a výška grafiky bez přídavků. Bere se z artboardu; přepiš jen tehdy, když artboard nesedí.",
            LBL_LARGE_CANVAS:    "Faktor Large Canvas: %s",

            // --- split ---
            LBL_DIRECTION:       "Směr",
            DIR_HORIZONTAL:      "Horizontálně",
            DIR_VERTICAL:        "Vertikálně",
            TIP_DIRECTION:       "Horizontálně dělí na pláty vedle sebe, vertikálně na pláty nad sebou.",
            LBL_MODE:            "Dělit podle",
            MODE_COUNT:          "Počtu plátů",
            MODE_WIDTH:          "Šířky plátu",
            MODE_GUIDES:         "Vodítek",
            TIP_MODE:            "Počet i šířka dělí rovnoměrně. Vodítka položí švy přesně tam, kam jsi je vytáhl, takže se šev může vyhnout textu.",
            LBL_COUNT:           "Počet plátů",
            TIP_COUNT:           "Na kolik plátů rozdělit. Nejméně 2.",
            LBL_WIDTH:           "Šířka plátu",
            TIP_WIDTH:           "Největší šířka plátu. Poslední plát vyjde kratší, když grafika nevyjde beze zbytku.",
            LBL_ROUND:           "Zaokrouhlit vodítka na",
            TIP_ROUND:           "Ručně tažená vodítka nikdy nesedí na kulaté číslo. Nula je vezme tak, jak jsou.",

            // --- edges ---
            LBL_OVERLAP:         "Přelep",
            TIP_OVERLAP:         "Materiál společný sousedním plátům. Nula u desek, které jdou na tupo.",
            LBL_OVERLAP_MODE:    "Umístění přelepu",
            OVERLAP_SYMMETRIC:   "Půl na každou stranu",
            OVERLAP_ONESIDED:    "Celý na jeden plát",
            TIP_OVERLAP_MODE:    "Symetricky dá šev doprostřed přelepu. Jednostranně dá celý přelep levému nebo hornímu plátu, takže soused začíná přesně na švu.",
            LBL_ADD_TOP:         "Přídavek nahoře",
            LBL_ADD_BOTTOM:      "Přídavek dole",
            LBL_ADD_LEFT:        "Přídavek vlevo",
            LBL_ADD_RIGHT:       "Přídavek vpravo",
            TIP_ADD:             "Montážní spad na vnějším okraji celé grafiky. Nula znamená načisto. Nesmí překročit spad, který nalinkované PDF skutečně nese.",

            // --- export ---
            LBL_EXPORT_MODE:     "Obsah",
            EXPORT_VECTOR:       "Vektor",
            EXPORT_RASTER:       "Rastr",
            TIP_EXPORT_MODE:     "Vektor drží text ostrý, ale každý plát nese celou grafiku, protože Illustrator obsah neořezává. Rastr udělá plát velký jen podle jeho plochy a rasterizuje s ním i text a ořezovou linku.",
            LBL_EXPORT_SCALE:    "Měřítko výstupu",
            SCALE_SOURCE:        "Stejné jako dokument",
            SCALE_ACTUAL:        "1:1 skutečná velikost",
            TIP_EXPORT_SCALE:    "Stejné jako dokument nechá plátno 1:10 v 1:10 a zvětšuje až RIP. 1:1 zapíše skutečnou velikost, kterou velký plát může přerůst.",
            LBL_DPI:             "Rozlišení",
            TIP_DPI:             "Rozlišení rastru v DPI. Používá se jen v rastrovém režimu.",
            LBL_PDF_PRESET:      "PDF preset",
            TIP_PDF_PRESET:      "Název PDF presetu Illustratoru. Prázdné použije vestavěný výchozí.",
            LBL_OUTPUT:          "Cílová složka",
            TIP_OUTPUT:          "Kam se zapíšou PDF jednotlivých plátů.",
            BTN_BROWSE:          "Vybrat\u2026",
            LBL_PATTERN:         "Vzor pojmenování",
            TIP_PATTERN:         "Placeholdery: {doc} název dokumentu, {n} číslo plátu, {total} počet plátů.",
            LBL_SKIP:            "Přeskočit hotové výstupy",
            TIP_SKIP:            "Běh, který spadl v půlce, naváže bez opakování plátů, které už jsou na disku.",
            LBL_LINE:            "Kreslit ořezovou linku",
            TIP_LINE:            "Červená linka po obvodu čistého formátu plátu, podle které finišer ořezává.",
            LBL_LINE_SPOT:       "Přímá barva",
            TIP_LINE_SPOT:       "Název přímé barvy pro linku. Vytvoří se, když ji dokument nemá.",
            LBL_LINE_WIDTH:      "Tloušťka linky",
            TIP_LINE_WIDTH:      "Tloušťka tahu ořezové linky v bodech.",

            // --- calc ---
            INFO_CLEAN:          "Čistý formát: %s \u00d7 %s mm",
            INFO_COUNT:          "Počet plátů: %s",
            INFO_TILE:           "  %s: načisto %s \u00d7 %s mm, s přídavky %s \u00d7 %s mm",
            INFO_OVERHANG:       "Dostupný spad: vlevo %s, vpravo %s, nahoře %s, dole %s mm",

            // --- presets ---
            PANEL_ZUND:      "Z\u00fcnd",
            LBL_ZUND_MODE:   "Z\u00fcnd re\u017eim",
            TIP_ZUND_MODE:   "P\u0159id\u00e1 registra\u010dn\u00ed zna\u010dky a o\u0159ezov\u00e1 data pro ka\u017ed\u00fd pl\u00e1t. Oboj\u00ed se kresl\u00ed do exportovan\u00fdch pl\u00e1t\u016f, nikdy do tv\u00e9ho dokumentu.",
            LBL_CUT_SPOT:    "Barva kontury",
            TIP_CUT_SPOT:    "P\u0159\u00edm\u00e1 barva, kter\u00e1 ozna\u010duje o\u0159ezovou konturu. Na vrstv\u011b, kde le\u017e\u00ed, nez\u00e1le\u017e\u00ed.",
            LBL_MARK_COLOR:  "Barva zna\u010dek",
            TIP_MARK_COLOR:   "Barva registra\u010dn\u00edch zna\u010dek, odd\u011blen\u011b od o\u0159ezov\u00e9 kontury. Standard je registra\u010dn\u00ed; na \u010dern\u00e9 a \u010dir\u00e9 materi\u00e1ly s \u010dir\u00fdm linerem se pou\u017e\u00edv\u00e1 b\u00edl\u00e1 p\u0159\u00edm\u00e1 barva.",
            LBL_MARK_SIZE:   "Pr\u016fm\u011br zna\u010dky",
            TIP_MARK_SIZE:   "Pr\u016fm\u011br kulat\u00e9 registra\u010dn\u00ed zna\u010dky pro Z\u00fcnd.",
            LBL_GAP_INNER:   "Odstup od okraje",
            TIP_GAP_INNER:   "Vzd\u00e1lenost mezi okrajem pl\u00e1tu a zna\u010dkou. Zna\u010dky le\u017e\u00ed vn\u011b pl\u00e1tu, tak\u017ee tahle hodnota zv\u011bt\u0161uje exportovanou str\u00e1nku.",
            LBL_MAX_DIST:    "Max. rozte\u010d",
            TIP_MAX_DIST:    "Na dlouh\u00fdch hran\u00e1ch se zna\u010dky interpoluj\u00ed, aby jejich rozte\u010d nep\u0159es\u00e1hla tuhle hodnotu.",
            LBL_ORIENT:      "Orienta\u010dn\u00ed bod",
            TIP_ORIENT:      "Vzd\u00e1lenost orienta\u010dn\u00edho bodu od rohu. Stroji \u0159\u00edk\u00e1, jak je pl\u00e1t oto\u010den\u00fd.",
            ERR_NO_CUT_SPOT: "P\u0159\u00edm\u00e1 barva %s v dokumentu nen\u00ed.",
            WARN_NO_CONTOUR: "Pl\u00e1ty bez o\u0159ezov\u00fdch dat: %s. Kontura do nich nezasahuje.",
            PRESET_LABEL:        "Předvolba",
            BTN_SAVE:            "Uložit",
            BTN_SAVE_AS:         "Uložit jako\u2026",
            BTN_DEL:             "Smazat",
            BTN_DEFAULTS:        "Výchozí",
            TIP_PRESET:          "Uložené konfigurace. Poslední použitá se vybaví při dalším spuštění.",
            ASK_PRESET_NAME:     "Název předvolby:",
            ASK_PRESET_DELETE:   "Smazat předvolbu %s?",
            BTN_TILES_ONLY:      "Jen pláty",
            BTN_TILES_EXPORT:    "Vytvořit a exportovat",
            BTN_CANCEL:          "Zrušit"
        }
    };

    var t = strings[lang] || strings.en;

    /**
     * Substitutes %s placeholders in order.
     * @param {string} tpl - Template carrying %s placeholders.
     * @returns {string} Filled string.
     */
    t.format = function (tpl) {
        var args = arguments, i = 1;
        return String(tpl).replace(/%s/g, function () {
            return i < args.length ? String(args[i++]) : "%s";
        });
    };
    return t;
})();
