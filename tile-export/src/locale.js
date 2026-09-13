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
