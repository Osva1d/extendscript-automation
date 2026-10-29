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
            // A value that is an array is the forms of a counted noun, picked by
            // L.plural from the first argument (UIModel.text): [one, other].
            WARN_MISSING:        ["%s element missing.", "%s elements missing."],
            WARN_EXTRA:          ["%s element too many.", "%s elements too many."],
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
            // Picked by the total: "3 of 1 element" never happens, "1 of 5 elements" does.
            STATUS_CHANGED:      ["%s of %s element will change.", "%s of %s elements will change."],
            STATUS_STEP:         "Step %s: %s",
            ERR_NO_TEXT:         "There is no text in the range.",
            // Picked by the number of matches (the second slot).
            MSG_MULTI:           ["Element %s has %s match of %s, they get the same number.", "Element %s has %s matches of %s, they get the same number."],
            MSG_MULTI_MORE:      ["And %s more element has several matches.", "And %s more elements have several matches."],
            SKIP_LOCKED:         ["Skipped %s locked or hidden text.", "Skipped %s locked or hidden texts."],
            SKIP_OVERFLOW:       ["Skipped %s overflowing text.", "Skipped %s overflowing texts."],
            SKIP_LINKED:         ["Skipped %s threaded frame.", "Skipped %s threaded frames."],
            // Presets that needed repair when they were loaded
            NOTE_PRESET:         "Preset \"%s\": %s",
            NOTE_STEP_DROPPED:   "Step %s has the unknown type \"%s\" and was left out.",
            NOTE_ORDER_RESET:    "The order is missing or unknown; the order by rows is used.",
            NOTE_WHERE_RESET:    "Step %s: the Where field was not valid and the default choice replaced it.",
            NOTE_NO_STEPS:       "No step was left; a Number step was added.",
            NOTE_UNREADABLE:     "The presets file could not be read; the saved presets were not loaded.",
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
            // Hodnota, která je pole, jsou tvary počítaného podstatného jména;
            // L.plural z nich vybere podle prvního argumentu (UIModel.text):
            // [1, 2–4, 0 a 5+].
            WARN_MISSING:        ["Chybí %s prvek.", "Chybí %s prvky.", "Chybí %s prvků."],
            WARN_EXTRA:          "Prvků je o %s víc.",
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
            // Podle celku: „1 z 1 prvku“, „3 z 5 prvků“ (po „z“ je druhý pád).
            STATUS_CHANGED:      ["Změní se %s z %s prvku.", "Změní se %s z %s prvků.", "Změní se %s z %s prvků."],
            STATUS_STEP:         "Krok %s: %s",
            ERR_NO_TEXT:         "V rozsahu není žádný text.",
            // Podle počtu shod (druhé %s).
            MSG_MULTI:           ["Prvek %s má %s shodu %s, dostanou stejné číslo.", "Prvek %s má %s shody %s, dostanou stejné číslo.", "Prvek %s má %s shod %s, dostanou stejné číslo."],
            MSG_MULTI_MORE:      ["A %s další prvek má víc shod.", "A %s další prvky mají víc shod.", "A %s dalších prvků má víc shod."],
            SKIP_LOCKED:         ["Přeskočen %s zamčený nebo skrytý text.", "Přeskočeny %s zamčené nebo skryté texty.", "Přeskočeno %s zamčených nebo skrytých textů."],
            SKIP_OVERFLOW:       ["Přeskočen %s přetečený text.", "Přeskočeny %s přetečené texty.", "Přeskočeno %s přetečených textů."],
            SKIP_LINKED:         ["Přeskočen %s navázaný rámeček.", "Přeskočeny %s navázané rámečky.", "Přeskočeno %s navázaných rámečků."],
            // Předvolby, které bylo při načtení nutné opravit
            NOTE_PRESET:         "Předvolba „%s“: %s",
            NOTE_STEP_DROPPED:   "Krok %s má neznámý typ „%s“ a byl vynechán.",
            NOTE_ORDER_RESET:    "Pořadí chybí nebo je neznámé, použito pořadí po řádcích.",
            NOTE_WHERE_RESET:    "Krok %s: pole Kde bylo neplatné a nahradila ho výchozí volba.",
            NOTE_NO_STEPS:       "Žádný krok nezbyl, přidán krok Číslovat.",
            NOTE_UNREADABLE:     "Soubor s předvolbami nešel přečíst, uložené předvolby se nenačetly.",
            ERR_CRITICAL:        "Skript se zastavil kvůli neočekávané chybě: %s (řádek %s).\n\nDokument může být částečně změněný — zkontrolujte ho, případně změny vraťte (Cmd+Z). Pošlete tuto hlášku správci skriptu."
        }
    };

    var t = strings[lang] || strings.en;
    var czech = !!strings[lang] && lang === "cs";

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
     * Picks the form of a counted noun. Czech has three: 1, 2-4 and the rest
     * (0, 5 and more, 21, 22, negatives, fractions); English two: 1 and the
     * rest. A count that is not a whole number takes the last form. Forms
     * the table does not have fall back to the last one it has.
     * @param {number|string} n - The count.
     * @param {Array.<string>} forms - Czech [one, few, many], English
     *     [one, other].
     * @returns {string} The form, still carrying its %s placeholders.
     */
    t.plural = function (n, forms) {
        var count = Number(n);
        var at;
        if (count === 1) {
            at = 0;
        } else if (czech && count >= 2 && count <= 4 && Math.floor(count) === count) {
            at = 1;
        } else {
            at = czech ? 2 : 1;
        }
        return at < forms.length ? forms[at] : forms[forms.length - 1];
    };
    return t;
})();
