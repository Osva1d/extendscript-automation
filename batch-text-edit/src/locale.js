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
            ERR_VALUE_RANGE:     "A number exceeds the allowed range.",
            ERR_LETTER_BELOW_ONE: "Letters start at A = 1. Change From or Step so that no value falls below 1.",
            WARN_TO_MISMATCH:    "The last number comes out as %s, the To field says %s.",
            // Counted messages: _1 / _2 / _5 are the forms for 1, 2-4 and the
            // rest (L.count). English has two forms; _2 and _5 are alike.
            WARN_MISSING_1:      "%s element missing.",
            WARN_MISSING_2:      "%s elements missing.",
            WARN_MISSING_5:      "%s elements missing.",
            WARN_EXTRA_1:        "%s element too many.",
            WARN_EXTRA_2:        "%s elements too many.",
            WARN_EXTRA_5:        "%s elements too many.",
            // Dialog model: Kde list, step list, status line
            NOT_FOUND:           "(not found)",
            WHERE_ALL:           "Whole text",
            WHERE_FIRST:         "First number in the element",
            WHERE_TEXT:          "Other text…",
            WHERE_REGEX:         "Regular expression…",
            STEP_REPLACE:        "Replace",
            STEP_NUMBER:         "Number",
            STEP_CASE:           "Change case",
            STEP_FROM:           "from",
            STEP_EMPTY:          "(empty)",
            MODE_UPPER:          "UPPERCASE",
            MODE_LOWER:          "lowercase",
            MODE_TITLE:          "Title Case",
            MODE_SENTENCE:       "Sentence case",
            STATUS_ERR:          "Cannot apply, nothing will be written.",
            STATUS_NOTHING:      "Nothing will change.",
            // Form picked by the total (the second %s).
            STATUS_CHANGED_1:    "%s of %s element will change.",
            STATUS_CHANGED_2:    "%s of %s elements will change.",
            STATUS_CHANGED_5:    "%s of %s elements will change.",
            STATUS_STEP:         "Step %s: %s",
            ERR_NO_TEXT:         "There is no text in the range.",
            // Form picked by the number of matches (the second %s).
            MSG_MULTI_1:         "Element %s has %s match of %s, they get the same number.",
            MSG_MULTI_2:         "Element %s has %s matches of %s, they get the same number.",
            MSG_MULTI_5:         "Element %s has %s matches of %s, they get the same number.",
            MSG_MULTI_MORE_1:    "And %s more element has several matches.",
            MSG_MULTI_MORE_2:    "And %s more elements have several matches.",
            MSG_MULTI_MORE_5:    "And %s more elements have several matches.",
            SKIP_LOCKED_1:       "Skipped %s locked or hidden text.",
            SKIP_LOCKED_2:       "Skipped %s locked or hidden texts.",
            SKIP_LOCKED_5:       "Skipped %s locked or hidden texts.",
            SKIP_OVERFLOW_1:     "Skipped %s overflowing text.",
            SKIP_OVERFLOW_2:     "Skipped %s overflowing texts.",
            SKIP_OVERFLOW_5:     "Skipped %s overflowing texts.",
            SKIP_LINKED_1:       "Skipped %s threaded frame.",
            SKIP_LINKED_2:       "Skipped %s threaded frames.",
            SKIP_LINKED_5:       "Skipped %s threaded frames.",
            // Presets that needed repair when they were loaded
            NOTE_PRESET:         "Preset \"%s\": %s",
            NOTE_STEP_DROPPED:   "Step %s has the unknown type \"%s\" and was left out.",
            NOTE_ORDER_RESET:    "The order is missing or unknown; the order by rows is used.",
            NOTE_WHERE_RESET:    "Step %s: the Where field was not valid and the default choice replaced it.",
            NOTE_NO_STEPS:       "No step was left; a Number step was added.",
            NOTE_UNREADABLE:     "The presets file could not be read; the saved presets were not loaded.",
            // Write stopped by a DOM error: element (first %s), texts written so
            // far (second %s, picks the form).
            ERR_WRITE_AT_1:      "Writing stopped at element %s; %s text was written. Undo (Cmd+Z) reverts the whole run.",
            ERR_WRITE_AT_2:      "Writing stopped at element %s; %s texts were written. Undo (Cmd+Z) reverts the whole run.",
            ERR_WRITE_AT_5:      "Writing stopped at element %s; %s texts were written. Undo (Cmd+Z) reverts the whole run.",
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
            ERR_VALUE_RANGE:     "Číslo přesahuje povolený rozsah.",
            ERR_LETTER_BELOW_ONE: "Písmena začínají od A = 1. Upravte Od nebo Krok, aby žádná hodnota nebyla pod 1.",
            WARN_TO_MISMATCH:    "Poslední číslo vyjde %s, v poli Do je %s.",
            // Počítané hlášky: _1 / _2 / _5 jsou tvary pro 1, 2–4 a ostatní
            // (L.count). „Prvků je o %s víc.“ čte správně při každém počtu.
            WARN_MISSING_1:      "Chybí %s prvek.",
            WARN_MISSING_2:      "Chybí %s prvky.",
            WARN_MISSING_5:      "Chybí %s prvků.",
            WARN_EXTRA_1:        "Prvků je o %s víc.",
            WARN_EXTRA_2:        "Prvků je o %s víc.",
            WARN_EXTRA_5:        "Prvků je o %s víc.",
            // Model dialogu: nabídka Kde, seznam kroků, stavová řádka
            NOT_FOUND:           "(nenalezeno)",
            WHERE_ALL:           "Celý text",
            WHERE_FIRST:         "První číslo v prvku",
            WHERE_TEXT:          "Jiný text…",
            WHERE_REGEX:         "Regulární výraz…",
            STEP_REPLACE:        "Nahradit",
            STEP_NUMBER:         "Číslovat",
            STEP_CASE:           "Velikost písmen",
            STEP_FROM:           "od",
            STEP_EMPTY:          "(prázdné)",
            MODE_UPPER:          "VELKÁ",
            MODE_LOWER:          "malá",
            MODE_TITLE:          "Každé Slovo",
            MODE_SENTENCE:       "První písmeno věty",
            STATUS_ERR:          "Nelze použít, nic se nezapíše.",
            STATUS_NOTHING:      "Nic se nezmění.",
            // Tvar podle celku (druhé %s): „1 z 1 prvku“, „3 z 5 prvků“ (po „z“ je druhý pád).
            STATUS_CHANGED_1:    "Změní se %s z %s prvku.",
            STATUS_CHANGED_2:    "Změní se %s z %s prvků.",
            STATUS_CHANGED_5:    "Změní se %s z %s prvků.",
            STATUS_STEP:         "Krok %s: %s",
            ERR_NO_TEXT:         "V rozsahu není žádný text.",
            // Tvar podle počtu shod (druhé %s).
            MSG_MULTI_1:         "Prvek %s má %s shodu %s, dostanou stejné číslo.",
            MSG_MULTI_2:         "Prvek %s má %s shody %s, dostanou stejné číslo.",
            MSG_MULTI_5:         "Prvek %s má %s shod %s, dostanou stejné číslo.",
            MSG_MULTI_MORE_1:    "A %s další prvek má víc shod.",
            MSG_MULTI_MORE_2:    "A %s další prvky mají víc shod.",
            MSG_MULTI_MORE_5:    "A %s dalších prvků má víc shod.",
            SKIP_LOCKED_1:       "Přeskočen %s zamčený nebo skrytý text.",
            SKIP_LOCKED_2:       "Přeskočeny %s zamčené nebo skryté texty.",
            SKIP_LOCKED_5:       "Přeskočeno %s zamčených nebo skrytých textů.",
            SKIP_OVERFLOW_1:     "Přeskočen %s přetečený text.",
            SKIP_OVERFLOW_2:     "Přeskočeny %s přetečené texty.",
            SKIP_OVERFLOW_5:     "Přeskočeno %s přetečených textů.",
            SKIP_LINKED_1:       "Přeskočen %s navázaný rámeček.",
            SKIP_LINKED_2:       "Přeskočeny %s navázané rámečky.",
            SKIP_LINKED_5:       "Přeskočeno %s navázaných rámečků.",
            // Předvolby, které bylo při načtení nutné opravit
            NOTE_PRESET:         "Předvolba „%s“: %s",
            NOTE_STEP_DROPPED:   "Krok %s má neznámý typ „%s“ a byl vynechán.",
            NOTE_ORDER_RESET:    "Pořadí chybí nebo je neznámé, použito pořadí po řádcích.",
            NOTE_WHERE_RESET:    "Krok %s: pole Kde bylo neplatné a nahradila ho výchozí volba.",
            NOTE_NO_STEPS:       "Žádný krok nezbyl, přidán krok Číslovat.",
            NOTE_UNREADABLE:     "Soubor s předvolbami nešel přečíst, uložené předvolby se nenačetly.",
            // Zápis zastavený chybou DOM: prvek (první %s), dosud zapsané texty
            // (druhé %s, podle něj tvar).
            ERR_WRITE_AT_1:      "Zápis se zastavil u prvku %s, zapsán %s text. Zpět (Cmd+Z) vrátí celý běh.",
            ERR_WRITE_AT_2:      "Zápis se zastavil u prvku %s, zapsány %s texty. Zpět (Cmd+Z) vrátí celý běh.",
            ERR_WRITE_AT_5:      "Zápis se zastavil u prvku %s, zapsáno %s textů. Zpět (Cmd+Z) vrátí celý běh.",
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

    /**
     * The template of a counted message for a count: base + "_1" for 1,
     * "_2" for 2-4, "_5" for everything else (0, negatives, NaN included).
     * The family's count() (extendscript-ui-standards 5) for a message with
     * more than the count in it; every counted key has all three forms in
     * both tables.
     * @param {string} base - Key without the suffix, e.g. "SKIP_LOCKED".
     * @param {number} n - The count.
     * @returns {string} The template, still carrying its %s placeholders.
     */
    t.countForm = function (base, n) {
        var suffix = "_5";
        if (n === 1) {
            suffix = "_1";
        } else if (n >= 2 && n <= 4) {
            suffix = "_2";
        }
        return t[base + suffix];
    };

    /**
     * A number before its noun in the right form: count("SKIP_LOCKED", 3) ->
     * "Přeskočeny 3 zamčené nebo skryté texty." (the canon's count(); the
     * count fills the one %s of the template).
     * @param {string} base - Key without the suffix.
     * @param {number} n - The count.
     * @returns {string} The filled string.
     */
    t.count = function (base, n) {
        return t.format(t.countForm(base, n), n);
    };
    return t;
})();
