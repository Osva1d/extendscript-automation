// ------------------------------------------------------------------------
// Module: BTE.L — EN/CS stringtable, app.locale detection, format()
// Part of: Illustrator Batch Text Edit
// Depends on: —
// ------------------------------------------------------------------------
var BTE = BTE || {};

// BTE.L — Localization module (IIFE, loaded before all other modules)
// Detects Illustrator locale and returns the active string table.
// Supports: en (default), cs
BTE.L = (function () {
    var lang = "en";
    try {
        if (app.locale) { lang = app.locale.substring(0, 2).toLowerCase(); }
    } catch (e) {}

    var strings = {
        en: {
            DEC_SEP:             ".",
            ERR_NO_DOC:          "Open a document before running the script.",
            ERR_CRITICAL:        "The script stopped on an unexpected error: %s (line %s).\n\nThe document may be partly changed — check it, or undo the changes (Cmd+Z). Send this message to the script's maintainer."
        },
        cs: {
            DEC_SEP:             ",",
            ERR_NO_DOC:          "Před spuštěním skriptu otevřete dokument.",
            ERR_CRITICAL:        "Skript se zastavil kvůli neočekávané chybě: %s (řádek %s).\n\nDokument může být částečně změněný — zkontrolujte ho, případně změny vraťte (Cmd+Z). Pošlete tuto hlášku správci skriptu."
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
