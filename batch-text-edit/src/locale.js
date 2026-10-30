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
            WARN_PREFIX:         "WARNING: ",
            // Dialog: presets (texts of extendscript-ui-standards 12.4)
            PANEL_PRESET:        "Presets",
            PRESET_LABEL:        "Preset:",
            PRESET_DEFAULT:      "[Default]",
            BTN_REVERT:          "↺",
            BTN_SAVE:            "Save",
            BTN_SAVE_AS:         "Save As…",
            BTN_DEL:             "Delete",
            TIP_PRESET:          "Saved step chains with their order. An asterisk means the values in the dialog differ from the saved preset: ↺ brings the saved ones back, Save writes the new ones. The dialog opens with the values of the last confirmed run.",
            TIP_REVERT:          "Discards unsaved changes and reloads the preset as saved.",
            TIP_SAVE:            "Overwrites the active preset with the values in the dialog. On [Default] it opens Save As… — the defaults stay as they are.",
            TIP_SAVE_AS:         "Saves the values in the dialog as a new preset.",
            TIP_DEL:             "Deletes the selected preset. [Default] cannot be deleted.",
            PROMPT_SAVE_AS:      "Name of the new preset:",
            CONFIRM_OVERWRITE_PRESET: "Preset \"%s\" already exists. Replace it?",
            CONFIRM_DELETE_PRESET: "Delete preset \"%s\"? This cannot be undone.",
            ERR_ENTER_NAME:      "Enter a preset name.",
            ERR_RESERVED_NAME:   "Names in square brackets are reserved. Choose another name.",
            ERR_WRITE_SETTINGS:  "The settings could not be saved — next time the dialog opens without them.",
            ERR_WRITE_SETTINGS_RUN: "The settings could not be saved — next time the dialog opens without them. The run continues.",
            // Dialog: range and order
            PANEL_SCOPE:         "Range",
            SCOPE_SELECTION:     "Selection",
            SCOPE_ARTBOARD:      "Active artboard",
            SCOPE_DOCUMENT:      "Whole document",
            TIP_SCOPE:           "Which texts the run edits: the texts in the selected objects, groups included; the texts of the elements whose centre lies on the active artboard; or every text of the document. The range is not saved in a preset.",
            LBL_ORDER:           "Order:",
            ORDER_ROWS:          "By rows",
            ORDER_COLS:          "By columns",
            TIP_ORDER:           "The order in which the elements get their numbers: by rows top to bottom and left to right, or by columns left to right and top to bottom. The position of the element decides, not the groups above it.",
            COUNT_ELEMENTS_1:    "%s element",
            COUNT_ELEMENTS_2:    "%s elements",
            COUNT_ELEMENTS_5:    "%s elements",
            COUNT_TEXTS_1:       "%s text",
            COUNT_TEXTS_2:       "%s texts",
            COUNT_TEXTS_5:       "%s texts",
            SCOPE_COUNTS:        "%s, %s",
            SCOPE_SKIPPED:       "%s · skipped texts: %s",
            SCOPE_CURSOR:        "The cursor is in a text; no objects are read from the selection.",
            ERR_CURSOR_IN_TEXT:  "The cursor is in a text. Leave text editing with Esc and select objects, or choose another range.",
            ERR_SCOPE_READ:      "The texts of the range could not be read (%s). The document was not changed.",
            // Dialog: steps and the step editor
            PANEL_STEPS:         "Steps",
            TIP_STEP_LIST:       "The steps run top to bottom, each on the result of the one before. The check mark turns a step on or off; a step that is off is skipped and stays in the chain. A ✗ or ⚠ at the end of a line marks an error or a warning of the step.",
            TIP_ADD_TYPE:        "The type of the step the + button adds.",
            BTN_ADD:             "+",
            BTN_REMOVE:          "−",
            BTN_UP:              "↑",
            BTN_DOWN:            "↓",
            TIP_ADD:             "Adds a step of the chosen type below the selected step.",
            TIP_REMOVE:          "Removes the selected step. The last step cannot be removed.",
            TIP_UP:              "Moves the selected step one place up.",
            TIP_DOWN:            "Moves the selected step one place down.",
            LBL_TYPE:            "Type:",
            TIP_TYPE:            "The type of the selected step. A step whose type changes gets the default values of the new type.",
            CB_ACTIVE:           "Active",
            TIP_ACTIVE:          "A step that is off is skipped and stays in the chain.",
            LBL_WHERE:           "Where:",
            LBL_FIND:            "Find:",
            TIP_WHERE_NUMBER:    "What the step numbers: a variable in braces (the count is the number of elements that hold it), the first number in the element, other text or a regular expression. All matches in one element get the same number.",
            TIP_FIND:            "What the step looks for: a variable in braces (the count is the number of elements that hold it), other text or a regular expression.",
            TIP_WHERE_CASE:      "Where the step changes the case: the whole text, a variable in braces (braces included), other text or a regular expression.",
            TIP_WHERE_TEXT:      "The text or regular expression the step looks for. In a regular expression \".\" also matches a paragraph break and \"^\" and \"$\" mean the start and end of the whole text; Illustrator does not support \"(?<\".",
            LBL_REPLACE:         "Replace with:",
            TIP_REPLACE:         "What replaces the found text; an empty field deletes it. In a regular expression $1, $& and the like work.",
            CB_MATCH_CASE:       "Match case",
            TIP_MATCH_CASE:      "Only text with the same upper and lower case letters is found. Grey for a variable, which is always matched exactly.",
            CB_FIRST_ONLY:       "First match per text only",
            TIP_FIRST_ONLY:      "Only the first match in each text is replaced.",
            LBL_FROM:            "From:",
            LBL_STEP:            "Step:",
            LBL_TO:              "To:",
            LBL_DIGITS:          "Digits:",
            LBL_FORMAT:          "Format:",
            LBL_REPEATS:         "Repeat:",
            LBL_RESET:           "Restart after:",
            TIP_FROM:            "The first value of the series, a whole number, negative too.",
            TIP_STEP:            "How much the value grows from one element to the next. A negative step counts down, 0 gives the same number everywhere.",
            TIP_TO:              "Optional: the last value you expect. When the last number comes out differently, the preview warns.",
            TIP_DIGITS:          "The smallest number of digits; zeros fill in from the left (3 gives 007). Only for the format 1, 2, 3.",
            TIP_FORMAT:          "Numbers, or letters: A to Z, then AA follows Z (like spreadsheet columns).",
            TIP_REPEATS:         "How many times in a row each value is used. An empty field means 1.",
            TIP_RESET:           "After how many elements the series returns to From. An empty field means never.",
            FORMAT_NUM:          "1, 2, 3",
            FORMAT_UPPER:        "A, B, C",
            FORMAT_LOWER:        "a, b, c",
            LBL_MODE:            "Mode:",
            TIP_MODE:            "The case the step turns the text into. The formatting of the text stays.",
            // Dialog: preview and buttons
            PANEL_PREVIEW:       "Preview",
            TIP_MESSAGES:        "Errors (✗) block Apply, warnings (⚠) do not.",
            TIP_PREVIEW:         "One row per element, in numbering order; the texts of an element are separated by \" | \", a paragraph break shows as \"¶\". The preview follows when you press Enter or leave a field, and it does not change the document.",
            COL_NO:              "#",
            COL_BEFORE:          "Original",
            COL_AFTER:           "After the selected step",
            COL_FINAL:           "New",
            ERR_PREVIEW:         "The preview could not be computed (%s). Send this message to the script's maintainer.",
            BTN_CANCEL:          "Cancel",
            BTN_APPLY:           "Apply",
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
            WARN_PREFIX:         "UPOZORNĚNÍ: ",
            // Dialog: předvolby (texty podle extendscript-ui-standards 12.4)
            PANEL_PRESET:        "Předvolby",
            PRESET_LABEL:        "Předvolba:",
            PRESET_DEFAULT:      "[Výchozí]",
            BTN_REVERT:          "↺",
            BTN_SAVE:            "Uložit",
            BTN_SAVE_AS:         "Uložit jako…",
            BTN_DEL:             "Smazat",
            TIP_PRESET:          "Uložené řetězy kroků s pořadím. Hvězdička znamená, že se hodnoty v dialogu od uložené předvolby liší: ↺ vrátí uložené, Uložit zapíše nové. Dialog se otevře s hodnotami posledního potvrzeného běhu.",
            TIP_REVERT:          "Zahodí neuložené změny a načte předvolbu tak, jak je uložená.",
            TIP_SAVE:            "Přepíše aktivní předvolbu hodnotami z dialogu. U [Výchozí] otevře Uložit jako… — výchozí hodnoty zůstanou.",
            TIP_SAVE_AS:         "Uloží hodnoty z dialogu jako novou předvolbu.",
            TIP_DEL:             "Smaže vybranou předvolbu. [Výchozí] smazat nejde.",
            PROMPT_SAVE_AS:      "Název nové předvolby:",
            CONFIRM_OVERWRITE_PRESET: "Předvolba „%s“ už existuje. Přepsat?",
            CONFIRM_DELETE_PRESET: "Smazat předvolbu „%s“? Smazání nejde vrátit.",
            ERR_ENTER_NAME:      "Zadejte název předvolby.",
            ERR_RESERVED_NAME:   "Názvy v hranatých závorkách jsou vyhrazené. Zvolte jiný název.",
            ERR_WRITE_SETTINGS:  "Nastavení se nepodařilo uložit — příště se dialog otevře bez něj.",
            ERR_WRITE_SETTINGS_RUN: "Nastavení se nepodařilo uložit — příště se dialog otevře bez něj. Běh pokračuje.",
            // Dialog: rozsah a pořadí
            PANEL_SCOPE:         "Rozsah",
            SCOPE_SELECTION:     "Výběr",
            SCOPE_ARTBOARD:      "Aktivní artboard",
            SCOPE_DOCUMENT:      "Celý dokument",
            TIP_SCOPE:           "Které texty běh upraví: texty ve vybraných objektech i ve skupinách, texty prvků se středem na aktivním artboardu, nebo všechny texty dokumentu. Rozsah se do předvolby neukládá.",
            LBL_ORDER:           "Pořadí:",
            ORDER_ROWS:          "Po řádcích",
            ORDER_COLS:          "Po sloupcích",
            TIP_ORDER:           "V jakém pořadí prvky dostanou čísla: po řádcích shora dolů a zleva doprava, nebo po sloupcích zleva doprava a shora dolů. Rozhoduje poloha prvku, ne skupiny nad ním.",
            COUNT_ELEMENTS_1:    "%s prvek",
            COUNT_ELEMENTS_2:    "%s prvky",
            COUNT_ELEMENTS_5:    "%s prvků",
            COUNT_TEXTS_1:       "%s text",
            COUNT_TEXTS_2:       "%s texty",
            COUNT_TEXTS_5:       "%s textů",
            SCOPE_COUNTS:        "%s, %s",
            SCOPE_SKIPPED:       "%s · přeskočené texty: %s",
            SCOPE_CURSOR:        "Kurzor je v textu, prvky se z výběru nečtou.",
            ERR_CURSOR_IN_TEXT:  "Kurzor je v textu. Ukončete úpravu textu klávesou Esc a vyberte prvky, nebo zvolte jiný rozsah.",
            ERR_SCOPE_READ:      "Texty rozsahu se nepodařilo přečíst (%s). Dokument nebyl změněn.",
            // Dialog: kroky a editor kroku
            PANEL_STEPS:         "Kroky",
            TIP_STEP_LIST:       "Kroky běží shora dolů, každý s výsledkem předchozího. Zaškrtnutím krok zapnete nebo vypnete; vypnutý se přeskočí a zůstane v řetězu. ✗ a ⚠ na konci řádku značí chybu a upozornění kroku.",
            TIP_ADD_TYPE:        "Typ kroku, který přidá tlačítko +.",
            BTN_ADD:             "+",
            BTN_REMOVE:          "−",
            BTN_UP:              "↑",
            BTN_DOWN:            "↓",
            TIP_ADD:             "Přidá krok zvoleného typu pod vybraný krok.",
            TIP_REMOVE:          "Odebere vybraný krok. Poslední krok odebrat nejde.",
            TIP_UP:              "Posune vybraný krok o jedno místo nahoru.",
            TIP_DOWN:            "Posune vybraný krok o jedno místo dolů.",
            LBL_TYPE:            "Typ:",
            TIP_TYPE:            "Typ vybraného kroku. Krok, kterému změníte typ, dostane výchozí hodnoty nového typu.",
            CB_ACTIVE:           "Aktivní",
            TIP_ACTIVE:          "Vypnutý krok se přeskočí a zůstane v řetězu.",
            LBL_WHERE:           "Kde:",
            LBL_FIND:            "Najít:",
            TIP_WHERE_NUMBER:    "Co krok čísluje: proměnná ve složených závorkách (počet v závorce je počet prvků, které ji obsahují), první číslo v prvku, jiný text nebo regulární výraz. Všechny shody v jednom prvku dostanou stejné číslo.",
            TIP_FIND:            "Co krok hledá: proměnná ve složených závorkách (počet v závorce je počet prvků, které ji obsahují), jiný text nebo regulární výraz.",
            TIP_WHERE_CASE:      "Kde krok mění velikost písmen: celý text, proměnná ve složených závorkách i se závorkami, jiný text nebo regulární výraz.",
            TIP_WHERE_TEXT:      "Text nebo regulární výraz, který krok hledá. V regulárním výrazu „.“ najde i konec odstavce, „^“ a „$“ znamenají začátek a konec celého textu a „(?<“ Illustrator nepodporuje.",
            LBL_REPLACE:         "Nahradit:",
            TIP_REPLACE:         "Čím se nalezený text nahradí; prázdné pole nalezený text smaže. V regulárním výrazu fungují $1, $& a další.",
            CB_MATCH_CASE:       "Rozlišovat velká a malá",
            TIP_MATCH_CASE:      "Najde se jen text se stejnými velkými a malými písmeny. U proměnné je volba šedá, proměnná se hledá vždy doslovně.",
            CB_FIRST_ONLY:       "Jen první shoda v textu",
            TIP_FIRST_ONLY:      "V každém textu se nahradí jen první shoda.",
            LBL_FROM:            "Od:",
            LBL_STEP:            "Krok:",
            LBL_TO:              "Do:",
            LBL_DIGITS:          "Číslic:",
            LBL_FORMAT:          "Formát:",
            LBL_REPEATS:         "Opakovat:",
            LBL_RESET:           "Znovu po:",
            TIP_FROM:            "První hodnota řady, celé číslo, i záporné.",
            TIP_STEP:            "O kolik se hodnota zvětší u dalšího prvku. Záporný krok čísluje sestupně, 0 dá všude stejné číslo.",
            TIP_TO:              "Nepovinné: poslední hodnota, kterou čekáte. Když poslední číslo vyjde jinak, náhled upozorní.",
            TIP_DIGITS:          "Nejmenší počet číslic, chybějící doplní nuly zleva (3 dá 007). Jen pro formát 1, 2, 3.",
            TIP_FORMAT:          "Čísla, nebo písmena: A až Z, po Z následuje AA (jako sloupce v tabulce).",
            TIP_REPEATS:         "Kolikrát po sobě se každá hodnota použije. Prázdné pole znamená 1.",
            TIP_RESET:           "Po kolika prvcích se řada vrátí na Od. Prázdné pole znamená nikdy.",
            FORMAT_NUM:          "1, 2, 3",
            FORMAT_UPPER:        "A, B, C",
            FORMAT_LOWER:        "a, b, c",
            LBL_MODE:            "Režim:",
            TIP_MODE:            "Na jakou velikost písmen krok text převede. Formát textu zůstane.",
            // Dialog: náhled a tlačítka
            PANEL_PREVIEW:       "Náhled",
            TIP_MESSAGES:        "Chyby (✗) zablokují Použít, upozornění (⚠) ne.",
            TIP_PREVIEW:         "Jeden řádek na prvek v pořadí číslování; texty prvku odděluje „ | “, konec odstavce je „¶“. Náhled se přepočítá po stisku Enter nebo po opuštění pole a dokument nemění.",
            COL_NO:              "#",
            COL_BEFORE:          "Původní",
            COL_AFTER:           "Po vybraném kroku",
            COL_FINAL:           "Nový",
            ERR_PREVIEW:         "Náhled se nepodařilo spočítat (%s). Pošlete tuto hlášku správci skriptu.",
            BTN_CANCEL:          "Storno",
            BTN_APPLY:           "Použít",
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
