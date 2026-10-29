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
            ERR_FIND_EMPTY:      "Enter what to look for.",
            ERR_BAD_REGEX:       "The regular expression is not valid. Check the brackets and special characters.",
            ERR_LOOKBEHIND:      "A pattern with \"(?<\" (lookbehind, named group) is not supported by Illustrator and would find nothing. Rewrite the pattern without it.",
            WARN_NOTHING_FOUND:  "Found nothing, changes nothing.",
            // Number step: field labels (named by the messages below), checks
            FIELD_FROM:          "From",
            FIELD_TO:            "To",
            FIELD_STEP:          "Step",
            FIELD_DIGITS:        "Digits",
            FIELD_REPEATS:       "Repeat",
            FIELD_RESET:         "Restart after",
            ERR_NOT_INTEGER:     "The field \"%s\" must be a whole number.",
            ERR_MIN_ONE:         "The field \"%s\" must be at least 1.",
            ERR_DIGITS_RANGE:    "Digits must be between %s and %s.",
            ERR_LETTER_BELOW_ONE: "Letters start at A = 1. Change From or Step so that no value falls below 1.",
            WARN_TO_MISMATCH:    "The last number comes out as %s, the To field says %s.",
            WARN_MISSING:        "%s elements missing.",
            WARN_EXTRA:          "%s elements too many.",
            ERR_CRITICAL:        "The script stopped on an unexpected error: %s (line %s).\n\nThe document may be partly changed — check it, or undo the changes (Cmd+Z). Send this message to the script's maintainer."
        },
        cs: {
            DEC_SEP:             ",",
            ERR_NO_DOC:          "Před spuštěním skriptu otevřete dokument.",
            ERR_FIND_EMPTY:      "Zadejte, co hledat.",
            ERR_BAD_REGEX:       "Regulární výraz není platný. Zkontrolujte závorky a speciální znaky.",
            ERR_LOOKBEHIND:      "Výraz s „(?<“ (lookbehind, pojmenovaná skupina) Illustrator nepodporuje a nic by nenašel. Přepište výraz jinak.",
            WARN_NOTHING_FOUND:  "Nic nenašel, nic nezmění.",
            // Číslovat: popisky polí (hlášky je jmenují) a kontroly
            FIELD_FROM:          "Od",
            FIELD_TO:            "Do",
            FIELD_STEP:          "Krok",
            FIELD_DIGITS:        "Číslic",
            FIELD_REPEATS:       "Opakovat",
            FIELD_RESET:         "Znovu po",
            ERR_NOT_INTEGER:     "Pole „%s“ musí být celé číslo.",
            ERR_MIN_ONE:         "Pole „%s“ musí být alespoň 1.",
            ERR_DIGITS_RANGE:    "Číslic musí být od %s do %s.",
            ERR_LETTER_BELOW_ONE: "Písmena začínají od A = 1. Upravte Od nebo Krok, aby žádná hodnota nebyla pod 1.",
            WARN_TO_MISMATCH:    "Poslední číslo vyjde %s, v poli Do je %s.",
            WARN_MISSING:        "Chybí %s prvků.",
            WARN_EXTRA:          "Prvků je o %s víc.",
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
